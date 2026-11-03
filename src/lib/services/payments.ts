"use server";

// =============================================================================
// MITASAFI: PAYMENT SERVER ACTIONS (M6)
// =============================================================================
// Server-side payment operations for the booking payment flow.
//
// Flow:
//   1. Customer calls initiatePayment → creates `payments` row + STK Push
//   2. M-Pesa callback confirms → processPaymentCallback updates payment row
//   3. On success → booking status → resolved, provider wallet credited
//   4. On failure → booking status → payment_failed, customer can retry
//
// All operations use createAdminClient() since:
//   - Payments must be written across multiple users' data
//   - Wallet credits require elevated access
//   - Booking status updates need audit context
//
// Each action follows the same pattern as booking-lifecycle.ts:
//   authenticate → verify ownership → validate state → execute → notify → revalidate
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import {
  TERMINAL_STK_FAILURE_CODES,
  parseStkResultCode,
} from "@/lib/payments/result-codes";
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
import { initiateStkPush, queryStkPushStatus } from "@/lib/payments/mpesa";
import { calculateCommission, loadCommissionConfig } from "@/lib/payments/commission";
import {
  notifyProviderPaymentReceived,
  notifyCustomerPaymentConfirmed,
  notifyCustomerPaymentFailed,
  notifyProviderPayoutCompleted,
} from "@/lib/notifications/triggers";
import { revalidatePath } from "next/cache";
import type {
  InitiatePaymentResult,
  PaymentStatusResult,
  PayoutRequestResult,
  PaymentMethodType,
  EarningsSummary,
  EarningsTransaction,
  Payment,
} from "@/types/payments";
import type { BookingStatus } from "@/types/bookings";

// =============================================================================
// AUDIT CONTEXT
// =============================================================================



async function setAuditContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  role: "provider" | "customer" | "admin"
): Promise<void> {
  await Promise.all([
    admin
      .rpc("set_config", { setting: "app.current_user_id", value: userId })
      .catch(() => undefined),
    admin
      .rpc("set_config", { setting: "app.current_user_role", value: role })
      .catch(() => undefined),
  ]);
}

// =============================================================================
// 1. INITIATE PAYMENT
// =============================================================================

/**
 * Initiate an M-Pesa STK Push payment for a booking.
 *
 * Prerequisites:
 *   - Booking must be in `customer_confirmed` or `payment_failed` status
 *   - Caller must be the booking customer
 *   - Booking must have an agreed_price > 0
 *
 * Flow:
 *   1. Verify customer ownership + booking state
 *   2. Calculate commission split
 *   3. Create idempotency key and check for existing pending payment
 *   4. Insert `payments` row with status = pending
 *   5. Transition booking to `payment_pending`
 *   6. Initiate STK Push via Daraja
 *   7. Store CheckoutRequestID on payment row
 */
export async function initiatePayment(
  bookingId: string,
  phoneNumber: string,
  paymentMethod: PaymentMethodType = "mpesa"
): Promise<InitiatePaymentResult> {
  try {
    // 1. Authenticate
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Please sign in to make a payment." };
    }

    const admin = createAdminClient();

    // 2. Fetch booking and verify ownership
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select(
        "id, customer_id, provider_id, status, agreed_price, currency, service_id"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: "Booking not found." };
    }

    if (booking.customer_id !== user.id) {
      return { success: false, error: "This booking does not belong to you." };
    }

    // 3. Validate booking state
    const allowedStatuses: BookingStatus[] = [
      "customer_confirmed",
      "payment_failed",
    ];
    if (!allowedStatuses.includes(booking.status as BookingStatus)) {
      return {
        success: false,
        error: `Payment cannot be initiated from status "${booking.status}". The job must be confirmed first.`,
      };
    }

    if (!booking.agreed_price || booking.agreed_price <= 0) {
      return {
        success: false,
        error: "No agreed price set for this booking.",
      };
    }

    if (!booking.provider_id) {
      return {
        success: false,
        error: "No provider assigned to this booking.",
      };
    }

    // 4. Calculate commission
    // Price from the database-backed, effective-dated commission config rather
    // than a constant compiled into the deploy. Previously rate/floor/cap lived
    // in commission.ts, so changing a fee meant a redeploy, and a redeploy
    // mid-flight silently repriced bookings already agreed with the customer.
    //
    // loadCommissionConfig never throws: if the config table is unreachable it
    // falls back to the compiled-in values, which are identical to the seeded
    // row, so pricing cannot change and payments cannot be taken down by a
    // lookup failure. A fallback is logged loudly because the resulting payment
    // cannot be attributed to a config row.
    const {
      config: commissionConfig,
      usedFallback: commissionUsedFallback,
      reason: commissionFallbackReason,
    } = await loadCommissionConfig(admin);

    if (commissionUsedFallback) {
      console.error(
        "[Payments] commission_config unavailable; priced with the compiled-in fallback:",
        commissionFallbackReason
      );
    }

    const commission = calculateCommission(booking.agreed_price, commissionConfig);

    // 5. Duplicate prevention.
    //
    // WHAT WAS WRONG: the key was `pay_${bookingId}_${Date.now()}`, which is
    // unique by construction, so the UNIQUE index on idempotency_key could
    // never fire and the migration's claim that it "prevents duplicate
    // payments" was false. The real guard was the read-then-insert below it:
    // it discarded its own error, looked only for status='pending' (ignoring
    // 'processing'), and took no lock, so two concurrent attempts could both
    // see "nothing pending" and both create a chargeable row.
    //
    // NOW: a partial unique index on (booking_id) WHERE status IN
    // ('pending','processing') makes a second open payment impossible at the
    // storage layer, and we insert first and interpret 23505 rather than
    // asking a question whose answer can change before we act on it.
    //
    // First, retire anything abandoned. STK prompts expire in about a minute,
    // so a row still open well past that is dead — and because of the unique
    // index, leaving it would make this booking unpayable forever.
    const { error: expireError } = await admin.rpc("expire_stale_booking_payments", {
      p_older_than: "15 minutes",
      p_booking_id: bookingId,
    });
    if (expireError) {
      // Not fatal: the insert below will simply report an open payment if one
      // genuinely remains. But it must be visible, not swallowed.
      console.error("[Payments] Stale payment expiry failed:", expireError);
    }

    const idempotencyKey = crypto.randomUUID();

    // 6. Insert payment row
    const { data: payment, error: insertError } = await admin
      .from("booking_payments")
      .insert({
        booking_id: bookingId,
        payer_id: user.id,
        provider_id: booking.provider_id,
        amount: commission.totalAmount,
        currency: booking.currency || "KES",
        platform_fee: commission.platformFee,
        provider_amount: commission.providerAmount,
        payment_method: paymentMethod,
        mpesa_phone: phoneNumber,
        status: "pending",
        idempotency_key: idempotencyKey,
        metadata: {
          commission_rate: commission.effectiveRate,
          booking_agreed_price: booking.agreed_price,
        },
        // Record WHICH config priced this booking, so the fee is reproducible
        // forensically instead of being recomputed against whatever config
        // happens to be current. All five fields or none: the
        // booking_payments_commission_snapshot_complete CHECK rejects a partial
        // snapshot, so when the fallback priced it (configId null) they are all
        // omitted and the commission_payment_audit view reports the row as
        // snapshot_missing rather than silently appearing attributable.
        ...(commission.configId
          ? {
              commission_config_id: commission.configId,
              commission_rate_bps: commission.rateBps,
              commission_min_fee_cents: commission.minimumFeeCents,
              commission_max_fee_cents: commission.maximumFeeCents,
              commission_min_job_amount_cents: commission.minJobAmountCents,
            }
          : {}),
      })
      .select("id")
      .single();

    if (insertError || !payment) {
      // 23505 on booking_payments_one_open_per_booking means a payment for this
      // booking is already open — either a concurrent attempt won the race, or
      // the customer still has an unanswered STK prompt. Both cases should hand
      // back the existing attempt rather than create a second chargeable row.
      if (insertError?.code === "23505") {
        const { data: open } = await admin
          .from("booking_payments")
          .select("id, mpesa_checkout_request_id")
          .eq("booking_id", bookingId)
          .in("status", ["pending", "processing"])
          .maybeSingle();

        if (open) {
          return {
            success: true,
            paymentId: open.id,
            checkoutRequestId: open.mpesa_checkout_request_id ?? undefined,
            customerMessage:
              "A payment is already pending. Please check your phone for the M-Pesa prompt.",
          };
        }
        // The conflicting row was settled between the insert and this read, so
        // the booking is already paid.
        return {
          success: false,
          error: "This booking has already been paid.",
        };
      }

      console.error("[Payments] Insert error:", insertError);
      return { success: false, error: "Failed to create payment record." };
    }

    // 7. Transition booking to payment_pending
    await setAuditContext(admin, user.id, "customer");
    const { error: statusError } = await admin
      .from("bookings")
      .update({
        status: "payment_pending",
        payment_status: "processing",
        payment_method: paymentMethod,
      })
      .eq("id", bookingId);

    if (statusError) {
      console.error("[Payments] Booking status update error:", statusError);
      // Rollback payment row
      await admin.from("booking_payments").delete().eq("id", payment.id);
      return {
        success: false,
        error: "Failed to update booking status. Payment not initiated.",
      };
    }

    // 8. Initiate STK Push (M-Pesa only)
    if (paymentMethod === "mpesa") {
      const stkResult = await initiateStkPush({
        amount: commission.totalAmount,
        phoneNumber,
        accountReference: `MS-${bookingId.slice(0, 8).toUpperCase()}`,
        transactionDesc: "MitaSafi Pay",
      });

      if (!stkResult.success) {
        // STK Push failed. Record it through the same guarded path the callback
        // uses, so the payment row and the booking move together in one
        // transaction and a late success callback cannot be overwritten by this.
        //
        // WHAT WAS WRONG: this was two fire-and-forget updates whose errors
        // were both discarded, and it reverted the booking unconditionally.
        // Combined with the lock-free duplicate check, a second attempt whose
        // push was rejected would revert the booking out from under the first
        // attempt's in-flight payment.
        const { error: failError } = await admin.rpc("fail_booking_payment", {
          p_payment_id: payment.id,
          p_result_code: -1,
          p_result_desc: stkResult.error ?? "STK push rejected",
        });

        if (failError) {
          // The row is left open deliberately: expire_stale_booking_payments
          // will retire it, and inventing a status here could contradict a
          // settlement that is already in flight.
          console.error("[Payments] Failed to record STK failure:", failError);
        }

        return {
          success: false,
          paymentId: payment.id,
          error: stkResult.error,
        };
      }

      // Store M-Pesa references on payment row
      await admin
        .from("booking_payments")
        .update({
          mpesa_checkout_request_id: stkResult.checkoutRequestId,
          mpesa_merchant_request_id: stkResult.merchantRequestId,
        })
        .eq("id", payment.id);

      revalidatePath("/dashboard/bookings");
      revalidatePath("/dashboard/provider/jobs");
      revalidatePath("/dashboard/provider/earnings");

      return {
        success: true,
        paymentId: payment.id,
        checkoutRequestId: stkResult.checkoutRequestId,
        customerMessage: stkResult.customerMessage,
      };
    }

    // Non-M-Pesa methods (cash / future card)
    revalidatePath("/dashboard/bookings");
    return {
      success: true,
      paymentId: payment.id,
      customerMessage: "Payment record created. Awaiting confirmation.",
    };
  } catch (err) {
    console.error("[Payments] initiatePayment error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Payment initiation failed.",
    };
  }
}

// =============================================================================
// 2. PROCESS PAYMENT CALLBACK (called from API route)
// =============================================================================


// processPaymentCallback moved to ./payments-internal.ts so it is reachable
// only through the M-Pesa callback route, which performs the IP and config
// checks, rather than directly as a Server Action.


// =============================================================================
// 3. CHECK PAYMENT STATUS
// =============================================================================

/**
 * Get the current status of a payment.
 *
 * Optionally queries Daraja for the latest status if the payment
 * is still pending and has a CheckoutRequestID.
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<PaymentStatusResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Please sign in." };
    }

    const admin = createAdminClient();

    const { data: payment, error } = await admin
      .from("booking_payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error || !payment) {
      return { success: false, error: "Payment not found." };
    }

    // Verify the caller is either the payer or the provider
    if (payment.payer_id !== user.id) {
      const { data: provider } = await admin
        .from("service_providers")
        .select("user_id")
        .eq("id", payment.provider_id)
        .single();

      if (!provider || provider.user_id !== user.id) {
        return { success: false, error: "Access denied." };
      }
    }

    return { success: true, payment: payment as unknown as Payment };
  } catch (err) {
    console.error("[Payments] getPaymentStatus error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to get payment status.",
    };
  }
}

/**
 * Poll M-Pesa for the latest status of a pending payment.
 * Used when the callback hasn't arrived yet.
 */
export async function pollPaymentStatus(
  paymentId: string
): Promise<PaymentStatusResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Please sign in." };
    }

    const admin = createAdminClient();

    const { data: payment, error } = await admin
      .from("booking_payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error || !payment) {
      return { success: false, error: "Payment not found." };
    }

    if (payment.payer_id !== user.id) {
      return { success: false, error: "Access denied." };
    }

    // Only poll an open payment that has something to poll with.
    if (
      (payment.status !== "pending" && payment.status !== "processing") ||
      !payment.mpesa_checkout_request_id
    ) {
      return { success: true, payment: payment as unknown as Payment };
    }

    // Query Daraja. This is the SAME authoritative source the callback path
    // now requires, so settling here is not a second mechanism — it is the
    // same one, reached without waiting for an inbound request. That matters
    // because the callback is forgeable and may also simply never arrive:
    // previously this function deliberately wrote nothing ("let the callback
    // handle it"), which left genuinely-paid bookings stuck at 'pending' with
    // no path to resolution, since no cron or admin surface could settle them.
    const queryResult = await queryStkPushStatus(
      payment.mpesa_checkout_request_id
    );

    // NOTE: the old condition here was `queryResult.success &&
    // queryResult.resultCode`, and ResultCode 0 means SUCCESS — which is
    // falsy. So the branch was skipped in exactly the case that mattered.
    const polledCode = parseStkResultCode(queryResult.resultCode);

    if (queryResult.success && polledCode !== null) {
      if (polledCode === 0) {
        // Confirmed paid. Settle through the same atomic, exactly-once path as
        // the callback; if the callback already settled it, the compare-and-set
        // inside returns 'not_settleable' and nothing is credited twice.
        const { data: settleResult, error: settleError } = await admin.rpc(
          "settle_booking_payment",
          {
            p_payment_id: payment.id,
            // Omitted, not nulled: stkpushquery returns neither a receipt nor
            // an amount, and settle_booking_payment coalesces so an absent
            // receipt cannot erase one a callback already recorded.
            p_result_code: polledCode,
            p_result_desc: queryResult.resultDesc ?? "Confirmed by status query",
            p_verified_by: "authoritative_query",
          }
        );

        if (settleError) {
          console.error("[Payments] Poll settlement failed:", settleError);
        } else {
          console.log("[Payments] Poll settled payment:", {
            paymentId,
            outcome: (settleResult as { outcome?: string } | null)?.outcome,
          });
        }
      } else if (TERMINAL_STK_FAILURE_CODES.has(polledCode)) {
        // A definite, terminal failure (cancelled, timed out, wrong PIN...).
        // Anything else — e.g. 1037 "request in progress" — is left open.
        const { error: failError } = await admin.rpc("fail_booking_payment", {
          p_payment_id: payment.id,
          p_result_code: polledCode,
          p_result_desc: queryResult.resultDesc ?? "Payment failed",
        });
        if (failError) {
          console.error("[Payments] Poll failure recording failed:", failError);
        }
      } else {
        console.log("[Payments] Poll: payment still in progress:", {
          paymentId,
          resultCode: polledCode,
          desc: queryResult.resultDesc,
        });
      }
    }

    // Return current DB state (callback may have arrived between poll and response)
    const { data: freshPayment } = await admin
      .from("booking_payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    return { success: true, payment: (freshPayment || payment) as unknown as Payment };
  } catch (err) {
    console.error("[Payments] pollPaymentStatus error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to poll payment.",
    };
  }
}

// =============================================================================
// 4. PROVIDER EARNINGS QUERIES
// =============================================================================

/**
 * Get the earnings summary for the authenticated provider.
 */
export async function getProviderEarnings(): Promise<{
  summary: EarningsSummary;
  error: string | null;
}> {
  const emptySummary: EarningsSummary = {
    totalEarnings: 0,
    walletBalance: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    totalTransactions: 0,
    platformFeesTotal: 0,
  };

  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { summary: emptySummary, error: "Please sign in." };
    }

    const { providerId, error: providerError } = await getCachedProviderId();
    if (providerError || !providerId) {
      return { summary: emptySummary, error: "Provider profile not found." };
    }

    const admin = createAdminClient();
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const [
      walletResult,
      totalPaymentsResult,
      thisMonthResult,
      lastMonthResult,
      pendingPayoutsResult,
      completedPayoutsResult,
      feesResult,
    ] = await Promise.all([
      // 1. Wallet balance + total_earnings from service_providers
      admin
        .from("service_providers")
        .select("wallet_balance, total_earnings")
        .eq("id", providerId)
        .single(),

      // 2. Count of completed payments
      admin
        .from("booking_payments")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", providerId)
        .eq("status", "completed"),

      // 3. This month's earnings
      admin
        .from("booking_payments")
        .select("provider_amount")
        .eq("provider_id", providerId)
        .eq("status", "completed")
        .gte("confirmed_at", thisMonthStart),

      // 4. Last month's earnings
      admin
        .from("booking_payments")
        .select("provider_amount")
        .eq("provider_id", providerId)
        .eq("status", "completed")
        .gte("confirmed_at", lastMonthStart)
        .lt("confirmed_at", thisMonthStart),

      // 5. Pending payouts total
      admin
        .from("provider_payouts")
        .select("amount")
        .eq("provider_id", providerId)
        .in("status", ["pending", "processing"]),

      // 6. Completed payouts total
      admin
        .from("provider_payouts")
        .select("amount")
        .eq("provider_id", providerId)
        .eq("status", "completed"),

      // 7. Total platform fees
      admin
        .from("booking_payments")
        .select("platform_fee")
        .eq("provider_id", providerId)
        .eq("status", "completed"),
    ]);

    const sumField = (rows: Array<Record<string, number>> | null, field: string): number =>
      (rows || []).reduce((sum: number, r) => sum + (r[field] || 0), 0);

    return {
      summary: {
        totalEarnings: walletResult.data?.total_earnings || 0,
        walletBalance: walletResult.data?.wallet_balance || 0,
        pendingPayouts: sumField(pendingPayoutsResult.data, "amount"),
        completedPayouts: sumField(completedPayoutsResult.data, "amount"),
        thisMonthEarnings: sumField(thisMonthResult.data, "provider_amount"),
        lastMonthEarnings: sumField(lastMonthResult.data, "provider_amount"),
        totalTransactions: totalPaymentsResult.count || 0,
        platformFeesTotal: sumField(feesResult.data, "platform_fee"),
      },
      error: null,
    };
  } catch (err) {
    console.error("[Payments] getProviderEarnings error:", err);
    return {
      summary: emptySummary,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get paginated transaction history for the authenticated provider.
 */
export async function getProviderTransactions(params?: {
  page?: number;
  pageSize?: number;
  type?: "payment" | "payout" | "all";
}): Promise<{
  transactions: EarningsTransaction[];
  total: number;
  error: string | null;
}> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { transactions: [], total: 0, error: "Please sign in." };
    }

    const { providerId, error: providerError } = await getCachedProviderId();
    if (providerError || !providerId) {
      return { transactions: [], total: 0, error: "Provider profile not found." };
    }

    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const type = params?.type ?? "all";
    const offset = (page - 1) * pageSize;

    const admin = createAdminClient();
    const transactions: EarningsTransaction[] = [];
    let total = 0;

    if (type === "all" || type === "payment") {
      const { data: payments, count } = await admin
        .from("booking_payments")
        .select(
          "id, provider_amount, status, mpesa_receipt_number, booking_id, created_at, payment_method",
          { count: "exact" }
        )
        .eq("provider_id", providerId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (payments) {
        for (const p of payments) {
          transactions.push({
            id: p.id,
            type: "payment",
            amount: p.provider_amount,
            status: p.status,
            description: `Payment via ${p.payment_method}`,
            mpesaReceipt: p.mpesa_receipt_number,
            bookingId: p.booking_id,
            createdAt: p.created_at,
          });
        }
      }
      total += count || 0;
    }

    if (type === "all" || type === "payout") {
      const { data: payouts, count } = await admin
        .from("provider_payouts")
        .select(
          "id, amount, status, mpesa_receipt_number, reference, created_at, payout_method",
          { count: "exact" }
        )
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (payouts) {
        for (const p of payouts) {
          transactions.push({
            id: p.id,
            type: "payout",
            amount: -p.amount, // Negative for withdrawals
            status: p.status,
            description: `Payout via ${p.payout_method}`,
            mpesaReceipt: p.mpesa_receipt_number,
            bookingId: null,
            createdAt: p.created_at,
          });
        }
      }
      total += count || 0;
    }

    // Sort merged transactions by date
    transactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { transactions: transactions.slice(0, pageSize), total, error: null };
  } catch (err) {
    console.error("[Payments] getProviderTransactions error:", err);
    return {
      transactions: [],
      total: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// 5. PAYOUT REQUEST
// =============================================================================

/**
 * Request a payout from the provider's wallet balance.
 *
 * Prerequisites:
 *   - Provider must have sufficient wallet_balance
 *   - Amount must be at least KES 100 (M-Pesa minimum)
 *   - No existing pending payout
 */
export async function requestPayout(
  amount: number,
  payoutMethod: PaymentMethodType = "mpesa",
  mpesaPhone?: string
): Promise<PayoutRequestResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Please sign in." };
    }

    const { providerId, error: providerError } = await getCachedProviderId();
    if (providerError || !providerId) {
      return { success: false, error: "Provider profile not found." };
    }

    // Validate amount
    if (amount < 100) {
      return { success: false, error: "Minimum payout amount is KES 100." };
    }
    if (amount > 150000) {
      return {
        success: false,
        error: "Maximum payout amount is KES 150,000 per transaction.",
      };
    }

    const admin = createAdminClient();

    // Check wallet balance
    const { data: provider, error: providerFetchError } = await admin
      .from("service_providers")
      .select("wallet_balance, phone")
      .eq("id", providerId)
      .single();

    if (providerFetchError || !provider) {
      return { success: false, error: "Provider data not found." };
    }

    if (provider.wallet_balance < amount) {
      return {
        success: false,
        error: `Insufficient balance. Available: KES ${provider.wallet_balance.toLocaleString()}`,
      };
    }

    // Check for existing pending payout
    const { data: existingPayout } = await admin
      .from("provider_payouts")
      .select("id")
      .eq("provider_id", providerId)
      .in("status", ["pending", "processing"])
      .maybeSingle();

    if (existingPayout) {
      return {
        success: false,
        error:
          "You already have a pending payout. Please wait for it to be processed.",
      };
    }

    // Determine phone for M-Pesa payout
    const payoutPhone = mpesaPhone || provider.phone;
    if (payoutMethod === "mpesa" && !payoutPhone) {
      return {
        success: false,
        error: "Please provide an M-Pesa phone number for the payout.",
      };
    }

    // Generate reference
    const reference = `PO-${Date.now().toString(36).toUpperCase()}`;

    // One transaction: balance check under a row lock, payout row, wallet
    // debit, and the ledger entry. All of it, or none of it.
    //
    // WHAT WAS WRONG: the debit and the payout insert were two separate
    // transactions. If the process died between them — a serverless timeout is
    // enough — the provider's wallet was debited with no payout record
    // anywhere, and the compensating re-credit could not run because the code
    // that would have run it was already gone. That was the only genuinely
    // unrecoverable money-loss path in the system.
    //
    // The old compensating path was also wrong in its own right: it re-credited
    // via credit_provider_wallet, which increments total_earnings as well, so
    // every failed payout request permanently inflated the provider's lifetime
    // earnings figure. A payout moves money out of the wallet; it does not
    // un-earn it. request_provider_payout touches wallet_balance only.
    const { data: payoutResult, error: payoutError } = await admin.rpc(
      "request_provider_payout",
      {
        p_provider_id: providerId,
        p_amount: amount,
        p_payout_method: payoutMethod,
        p_mpesa_phone: payoutPhone,
        p_reference: reference,
      }
    );

    if (payoutError) {
      console.error("[Payments] Payout request error:", payoutError);
      return {
        success: false,
        error: "Failed to process payout. Please try again.",
      };
    }

    const result = payoutResult as { outcome?: string; payout_id?: string; available?: number } | null;

    if (result?.outcome === "insufficient_balance") {
      return {
        success: false,
        error: `Insufficient balance. Available: KES ${Number(result.available ?? 0).toLocaleString()}`,
      };
    }

    if (result?.outcome === "payout_already_open") {
      return {
        success: false,
        error:
          "You already have a pending payout. Please wait for it to be processed.",
      };
    }

    if (result?.outcome !== "requested" || !result.payout_id) {
      console.error("[Payments] Unexpected payout outcome:", result);
      return { success: false, error: "Failed to create payout request." };
    }

    revalidatePath("/dashboard/provider/earnings");

    return { success: true, payoutId: result.payout_id };
  } catch (err) {
    console.error("[Payments] requestPayout error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Payout request failed.",
    };
  }
}

// =============================================================================
// 5b. PROCESS PAYOUT COMPLETION
// =============================================================================

// processPayoutCompletion moved to ./payments-internal.ts — it had no
// authentication and this module's "use server" made it a public endpoint.


// =============================================================================
// 6. CUSTOMER PAYMENT HISTORY
// =============================================================================

/**
 * Get payment details for a specific booking (customer view).
 */
export async function getBookingPayments(
  bookingId: string
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payments: any[];
  error: string | null;
}> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { payments: [], error: "Please sign in." };
    }

    const admin = createAdminClient();

    // Verify the caller owns this booking
    const { data: booking } = await admin
      .from("bookings")
      .select("customer_id, provider_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return { payments: [], error: "Booking not found." };
    }

    // Allow both customer and provider to view payments
    const isCustomer = booking.customer_id === user.id;
    const isProvider = await (async () => {
      if (isCustomer || !booking.provider_id) return false;
      const { data: sp } = await admin
        .from("service_providers")
        .select("user_id")
        .eq("id", booking.provider_id)
        .single();
      return sp?.user_id === user.id;
    })();

    if (!isCustomer && !isProvider) {
      return { payments: [], error: "Access denied." };
    }

    const { data: payments, error } = await admin
      .from("booking_payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      return { payments: [], error: error.message };
    }

    return { payments: payments || [], error: null };
  } catch (err) {
    console.error("[Payments] getBookingPayments error:", err);
    return {
      payments: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
