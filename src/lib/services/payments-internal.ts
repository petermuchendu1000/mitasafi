// =============================================================================
// MITASAFI: INTERNAL PAYMENT OPERATIONS — NOT SERVER ACTIONS
// =============================================================================
// SECURITY: this module deliberately has NO "use server" directive, and must
// never acquire one.
//
// WHAT WAS WRONG: these two functions lived in src/lib/services/payments.ts,
// whose first line is "use server". A single client component
// (earnings/payout/PayoutForm.tsx) imports requestPayout from that module, and
// that one import registers EVERY export of the module as a publicly callable
// Server Action endpoint. So:
//
//   - processPayoutCompletion, which has no authentication and no ownership
//     check at all, became an internet-reachable endpoint that marks a payout
//     'completed' with an attacker-chosen receipt number. The wallet is already
//     debited when a payout is requested, so closing one ERASES the obligation:
//     the balance is gone and the record says it was paid.
//   - processPaymentCallback became reachable without passing the M-Pesa
//     callback route, bypassing the IP whitelist, the fail-closed config gate
//     and the body-size guard that were added to protect it.
//
// A comment in the old location asserted processPayoutCompletion was
// "deliberately NOT wired up" because it disburses real money. The "use server"
// directive had already wired it up. That comment was mine and it was wrong.
//
// These are internal operations invoked by trusted server-side callers only:
// processPaymentCallback by the M-Pesa callback route handler, and
// processPayoutCompletion by a future operator approval surface which does not
// exist yet and which must authenticate and authorise before calling it.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { queryStkPushStatus } from "@/lib/payments/mpesa";
import {
  notifyProviderPaymentReceived,
  notifyCustomerPaymentConfirmed,
  notifyCustomerPaymentFailed,
  notifyProviderPayoutCompleted,
} from "@/lib/notifications/triggers";
import { revalidatePath } from "next/cache";
import { parseStkResultCode } from "@/lib/payments/result-codes";

export interface ProcessCallbackResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

/**
 * Process an M-Pesa STK Push callback.
 *
 * Called from POST /api/payments/mpesa/callback when Safaricom confirms
 * or rejects a payment.
 *
 * Flow (on success):
 *   1. Find payment by CheckoutRequestID
 *   2. Update payment row with receipt + status=completed
 *   3. Update booking payment_status=paid, status=resolved
 *   4. Credit provider wallet via DB function
 *   5. Notify both parties
 *
 * Flow (on failure):
 *   1. Find payment by CheckoutRequestID
 *   2. Update payment status=failed
 *   3. Update booking status=payment_failed
 *   4. Notify customer
 */
export async function processPaymentCallback(params: {
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: number;
  resultDesc: string;
  metadata: {
    amount: number;
    mpesaReceiptNumber: string;
    transactionDate: string;
    phoneNumber: string;
  } | null;
}): Promise<ProcessCallbackResult> {
  try {
    const admin = createAdminClient();

    // 1. Find the payment by CheckoutRequestID
    const { data: payment, error: findError } = await admin
      .from("booking_payments")
      // mpesa_checkout_request_id is needed to verify this callback against
      // Safaricom's own status endpoint before anything is settled.
      .select(
        "id, booking_id, payer_id, provider_id, amount, provider_amount, status, mpesa_checkout_request_id"
      )
      .eq("mpesa_checkout_request_id", params.checkoutRequestId)
      .single();

    if (findError || !payment) {
      console.error(
        "[Payments] Callback: payment not found for CheckoutRequestID:",
        params.checkoutRequestId
      );
      return {
        success: false,
        error: "Payment record not found for this transaction.",
      };
    }

    // Idempotency.
    //
    // WHAT WAS WRONG: this tested only 'completed' and 'refunded' — 2 of the 6
    // payment_transaction_status values. A payment sitting at 'failed' or
    // 'cancelled' fell straight through to the success path below and was
    // credited, so an attacker could forge a failure and then a success and
    // mint wallet balance on repeat. Reproduced: wallet 900 -> 1350.
    //
    // The authoritative guard is now a compare-and-set inside
    // settle_booking_payment, held under a row lock, which only settles a
    // payment in 'pending' or 'processing'. This early return is purely to
    // avoid a pointless outbound provider call for an already-closed payment.
    if (payment.status !== "pending" && payment.status !== "processing") {
      console.log("[Payments] Callback: payment not open, ignoring:", {
        paymentId: payment.id,
        status: payment.status,
      });
      return { success: true, paymentId: payment.id };
    }

    const isSuccess = params.resultCode === 0;

    if (isSuccess && params.metadata) {
      // ── SUCCESS PATH ──
      //
      // A CALLBACK BODY IS A CLAIM, NOT EVIDENCE. This endpoint is reachable
      // from the internet and its only authenticator is the source IP, so we
      // do not settle on the strength of what the request says. We ask
      // Safaricom directly and settle only if Safaricom agrees.
      //
      // Note what we deliberately do NOT do: compare the amount. Neither
      // Safaricom's stkpushquery nor PayHero's transaction-status returns an
      // amount (both verified), so there is nothing authoritative to compare
      // against. The amount the callback claims is therefore passed to
      // settle_booking_payment as a TRIPWIRE: it is recorded in claimed_amount
      // and flagged when it disagrees with our stored amount, but the figure
      // that gets booked is always our own. Previously the claimed amount was
      // written to metadata and logged and compared to nothing at all, so
      // "Amount": 1 would settle a KES 150,000 booking.
      if (!payment.mpesa_checkout_request_id) {
        console.error("[Payments] Callback: no checkout id to verify against:", payment.id);
        return { success: false, error: "Payment cannot be verified." };
      }

      const verification = await queryStkPushStatus(payment.mpesa_checkout_request_id);

      if (!verification.success) {
        // We could not reach the authority. Leave the payment open: the client
        // poller and the reaper will resolve it. Settling here on the
        // callback's word alone is exactly the hole being closed.
        console.error("[Payments] Callback: authoritative verification unavailable:", {
          paymentId: payment.id,
          error: verification.error,
        });
        return { success: false, error: "Could not verify payment with M-Pesa." };
      }

      const authoritativeCode = parseStkResultCode(verification.resultCode);

      if (authoritativeCode !== 0) {
        // The callback claimed success and the authority disagrees. This is
        // either a forged callback or a genuine race; either way it does not
        // settle. Record the claim and leave the payment open.
        console.error("[Payments] Callback claimed success but M-Pesa disagrees:", {
          paymentId: payment.id,
          claimedResultCode: params.resultCode,
          authoritativeResultCode: verification.resultCode,
          parsed: authoritativeCode,
        });
        return { success: false, error: "Payment not confirmed by M-Pesa." };
      }

      // Safaricom confirms it. Settle atomically: compare-and-set the payment,
      // credit the wallet through the append-only ledger, move the booking —
      // one transaction, exactly once, and every error surfaced.
      const { data: settleResult, error: settleError } = await admin.rpc(
        "settle_booking_payment",
        {
          p_payment_id: payment.id,
          p_receipt_number: params.metadata.mpesaReceiptNumber,
          p_result_code: params.resultCode,
          p_result_desc: params.resultDesc,
          p_claimed_amount: params.metadata.amount ?? null,
          p_verified_by: "authoritative_query",
        }
      );

      if (settleError) {
        console.error("[Payments] Settlement failed:", settleError);
        return { success: false, error: "Failed to record payment." };
      }

      const outcome = (settleResult as { outcome?: string } | null)?.outcome;

      if (outcome !== "settled") {
        // 'not_settleable' means a concurrent caller already settled it. That
        // is success from the caller's point of view, and crucially it means we
        // must NOT send a second "payment received" notification.
        console.log("[Payments] Settlement skipped:", { paymentId: payment.id, outcome });
        return { success: true, paymentId: payment.id };
      }

      const settled = settleResult as {
        amount_mismatch?: boolean;
        booking_moved?: boolean;
        booking_error?: string | null;
      };

      if (settled.amount_mismatch) {
        console.error("[Payments] AMOUNT MISMATCH — callback amount differs from charged amount:", {
          paymentId: payment.id,
          claimed: params.metadata.amount,
          flaggedForReconciliation: true,
        });
      }

      if (settled.booking_moved === false) {
        // The money is correct and recorded; only the booking status lagged.
        // The payment row carries needs_reconciliation for an operator.
        console.error("[Payments] Payment settled but booking did not transition:", {
          paymentId: payment.id,
          bookingId: payment.booking_id,
          bookingError: settled.booking_error,
        });
      }

      // 2d. Get details for notifications
      const [bookingInfo, providerInfo, customerInfo] = await Promise.all([
        admin
          .from("bookings")
          .select("service_id")
          .eq("id", payment.booking_id)
          .single(),
        admin
          .from("service_providers")
          .select("user_id, business_name")
          .eq("id", payment.provider_id)
          .single(),
        admin
          .from("profiles")
          .select("full_name")
          .eq("id", payment.payer_id)
          .single(),
      ]);

      let serviceName = "Service";
      if (bookingInfo.data?.service_id) {
        const { data: svc } = await admin
          .from("services")
          .select("name")
          .eq("id", bookingInfo.data.service_id)
          .single();
        if (svc) serviceName = svc.name;
      }

      // 2e. Notify both parties
      if (providerInfo.data?.user_id) {
        await notifyProviderPaymentReceived({
          providerUserId: providerInfo.data.user_id,
          providerId: payment.provider_id,
          bookingId: payment.booking_id,
          customerName: customerInfo.data?.full_name ?? "Customer",
          serviceName,
          amount: payment.provider_amount,
          mpesaReceipt: params.metadata.mpesaReceiptNumber,
        });
      }

      await notifyCustomerPaymentConfirmed({
        customerUserId: payment.payer_id,
        bookingId: payment.booking_id,
        providerName: providerInfo.data?.business_name ?? "Provider",
        serviceName,
        amount: payment.amount,
        mpesaReceipt: params.metadata.mpesaReceiptNumber,
      });

      console.log("[Payments] Payment confirmed:", {
        paymentId: payment.id,
        receipt: params.metadata.mpesaReceiptNumber,
        amount: params.metadata.amount,
      });

      return { success: true, paymentId: payment.id };
    } else {
      // ── FAILURE PATH ──
      //
      // Recorded through fail_booking_payment, which compare-and-sets under a
      // row lock so a late or forged failure can never downgrade a payment
      // that has already settled.
      //
      // WHAT WAS WRONG: two fire-and-forget updates whose errors were both
      // discarded. A failure callback arriving after a successful settlement
      // would overwrite 'completed' with 'failed' while the wallet stayed
      // credited, leaving the books contradicting the payment row.
      const { error: failError } = await admin.rpc("fail_booking_payment", {
        p_payment_id: payment.id,
        p_result_code: params.resultCode,
        p_result_desc: params.resultDesc,
      });

      if (failError) {
        console.error("[Payments] Failed to record payment failure:", failError);
        return { success: false, error: "Failed to record payment failure." };
      }

      // 3c. Notify customer
      await notifyCustomerPaymentFailed({
        customerUserId: payment.payer_id,
        bookingId: payment.booking_id,
        reason: params.resultDesc,
      });

      console.log("[Payments] Payment failed:", {
        paymentId: payment.id,
        resultCode: params.resultCode,
        resultDesc: params.resultDesc,
      });

      return { success: true, paymentId: payment.id };
    }
  } catch (err) {
    console.error("[Payments] processPaymentCallback error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Callback processing failed.",
    };
  }
}

/**
 * Mark a pending payout as completed and notify the provider.
 *
 * Called when the actual M-Pesa B2C disbursement succeeds — either from:
 *   - A Daraja B2C callback webhook
 *   - An admin manual completion action
 *
 * This is intentionally NOT behind getCachedUser() auth because it is
 * invoked from webhook / admin contexts where the acting user is not the
 * provider. Callers must authenticate at their own layer.
 *
 * @param payoutId    The `provider_payouts.id` to complete
 * @param mpesaReceipt  Optional M-Pesa receipt number from B2C callback
 */
export async function processPayoutCompletion(
  payoutId: string,
  mpesaReceipt?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    // 1. Fetch the payout and verify it is still pending/processing
    const { data: payout, error: fetchError } = await admin
      .from("provider_payouts")
      .select("id, provider_id, amount, status, reference")
      .eq("id", payoutId)
      .single();

    if (fetchError || !payout) {
      return { success: false, error: "Payout not found." };
    }

    if (payout.status === "completed") {
      // Idempotent — already completed (e.g. duplicate callback)
      return { success: true };
    }

    if (payout.status !== "pending" && payout.status !== "processing") {
      return {
        success: false,
        error: `Cannot complete payout in "${payout.status}" status.`,
      };
    }

    // 2. Update payout status to completed.
    //
    // WHAT WAS WRONG: this wrote `completed_at`, which is not a column on
    // provider_payouts (the column is `processed_at`). PostgREST rejects the
    // whole write, so this function could never have completed a payout even
    // once it had a caller — and it has none: the only reference to
    // processPayoutCompletion in the repository is its own console.error.
    // Combined with the one-open-payout guard, a provider's first payout
    // request therefore blocked every later one, permanently.
    //
    // Fixing the column makes the function correct, but it is still unreachable
    // until an operator surface calls it. Wiring that surface is deliberately
    // NOT done here: it disburses real money and needs an approval flow and
    // explicit sign-off, not a quiet addition inside a bug fix.
    const updatePayload: Record<string, unknown> = {
      status: "completed",
      processed_at: new Date().toISOString(),
    };
    if (mpesaReceipt) {
      updatePayload.mpesa_receipt_number = mpesaReceipt;
    }

    const { error: updateError } = await admin
      .from("provider_payouts")
      .update(updatePayload)
      .eq("id", payoutId)
      // Compare-and-set: only a payout still open may complete, so a duplicate
      // or late callback cannot re-complete one that has already been closed.
      .in("status", ["pending", "processing"]);

    if (updateError) {
      console.error("[Payments] Payout completion update error:", updateError);
      return { success: false, error: "Failed to update payout status." };
    }

    // 3. Resolve provider's user_id for notification delivery
    const { data: provider } = await admin
      .from("service_providers")
      .select("user_id")
      .eq("id", payout.provider_id)
      .single();

    if (provider?.user_id) {
      // Fire-and-forget — notification failure must never block payout flow
      notifyProviderPayoutCompleted({
        providerUserId: provider.user_id,
        providerId: payout.provider_id,
        amount: payout.amount,
        reference: mpesaReceipt ?? payout.reference ?? payoutId.slice(0, 8),
      }).catch((err) =>
        console.error("[Payments] Payout notification failed:", err)
      );
    }

    revalidatePath("/dashboard/provider/earnings");

    return { success: true };
  } catch (err) {
    console.error("[Payments] processPayoutCompletion error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Payout completion failed.",
    };
  }
}
