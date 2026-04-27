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
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
import { initiateStkPush, queryStkPushStatus } from "@/lib/payments/mpesa";
import { calculateCommission } from "@/lib/payments/commission";
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
    const commission = calculateCommission(booking.agreed_price);

    // 5. Check for existing pending payment (prevent duplicates)
    const idempotencyKey = `pay_${bookingId}_${Date.now()}`;
    const { data: existingPending } = await admin
      .from("booking_payments")
      .select("id, status, mpesa_checkout_request_id")
      .eq("booking_id", bookingId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      // A pending payment already exists — return its info instead of creating another
      return {
        success: true,
        paymentId: existingPending.id,
        checkoutRequestId: existingPending.mpesa_checkout_request_id ?? undefined,
        customerMessage:
          "A payment is already pending. Please check your phone for the M-Pesa prompt.",
      };
    }

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
      })
      .select("id")
      .single();

    if (insertError || !payment) {
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
        // STK Push failed — update payment status
        await admin
          .from("booking_payments")
          .update({
            status: "failed",
            failure_reason: stkResult.error,
            failed_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        // Revert booking to payment_failed
        await admin
          .from("bookings")
          .update({
            status: "payment_failed",
            payment_status: "pending",
          })
          .eq("id", bookingId);

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
      .select("id, booking_id, payer_id, provider_id, amount, provider_amount, status")
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

    // Idempotency: if payment is already completed or refunded, skip
    if (payment.status === "completed" || payment.status === "refunded") {
      console.log("[Payments] Callback: payment already processed:", payment.id);
      return { success: true, paymentId: payment.id };
    }

    const isSuccess = params.resultCode === 0;

    if (isSuccess && params.metadata) {
      // ── SUCCESS PATH ──
      const now = new Date().toISOString();

      // 2a. Update payment row
      await admin
        .from("booking_payments")
        .update({
          status: "completed",
          mpesa_receipt_number: params.metadata.mpesaReceiptNumber,
          mpesa_result_code: params.resultCode,
          mpesa_result_desc: params.resultDesc,
          confirmed_at: now,
          metadata: {
            callback_amount: params.metadata.amount,
            callback_phone: params.metadata.phoneNumber,
            callback_date: params.metadata.transactionDate,
          },
        })
        .eq("id", payment.id);

      // 2b. Update booking to resolved + paid
      await setAuditContext(admin, payment.payer_id, "customer");
      await admin
        .from("bookings")
        .update({
          status: "resolved",
          payment_status: "paid",
          payment_ref: params.metadata.mpesaReceiptNumber,
        })
        .eq("id", payment.booking_id);

      // 2c. Credit provider wallet
      await admin.rpc("credit_provider_wallet", {
        p_provider_id: payment.provider_id,
        p_amount: payment.provider_amount,
      });

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
      const now = new Date().toISOString();

      // 3a. Update payment row
      await admin
        .from("booking_payments")
        .update({
          status: "failed",
          mpesa_result_code: params.resultCode,
          mpesa_result_desc: params.resultDesc,
          failure_reason: params.resultDesc,
          failed_at: now,
        })
        .eq("id", payment.id);

      // 3b. Update booking to payment_failed
      await setAuditContext(admin, payment.payer_id, "customer");
      await admin
        .from("bookings")
        .update({
          status: "payment_failed",
          payment_status: "pending",
        })
        .eq("id", payment.booking_id);

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

    // Only poll if payment is still pending and has a checkout ID
    if (payment.status !== "pending" || !payment.mpesa_checkout_request_id) {
      return { success: true, payment: payment as unknown as Payment };
    }

    // Query Daraja
    const queryResult = await queryStkPushStatus(
      payment.mpesa_checkout_request_id
    );

    if (queryResult.success && queryResult.resultCode) {
      // If Daraja says it's complete but we haven't processed the callback yet,
      // the callback should arrive shortly. Don't update here — let the callback
      // handle it to avoid race conditions.
      console.log("[Payments] Poll result:", {
        paymentId,
        resultCode: queryResult.resultCode,
        desc: queryResult.resultDesc,
      });
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

    // Debit wallet first (atomic — uses FOR UPDATE lock in DB function)
    const { error: debitError } = await admin.rpc("debit_provider_wallet", {
      p_provider_id: providerId,
      p_amount: amount,
    });

    if (debitError) {
      console.error("[Payments] Wallet debit error:", debitError);
      return {
        success: false,
        error: debitError.message.includes("Insufficient")
          ? "Insufficient wallet balance."
          : "Failed to process payout. Please try again.",
      };
    }

    // Create payout record
    const { data: payout, error: insertError } = await admin
      .from("provider_payouts")
      .insert({
        provider_id: providerId,
        amount,
        currency: "KES",
        payout_method: payoutMethod,
        mpesa_phone: payoutPhone,
        status: "pending",
        reference,
      })
      .select("id")
      .single();

    if (insertError || !payout) {
      // Rollback: re-credit the wallet
      await admin.rpc("credit_provider_wallet", {
        p_provider_id: providerId,
        p_amount: amount,
      });
      console.error("[Payments] Payout insert error:", insertError);
      return { success: false, error: "Failed to create payout request." };
    }

    revalidatePath("/dashboard/provider/earnings");

    return { success: true, payoutId: payout.id };
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

    // 2. Update payout status to completed
    const updatePayload: Record<string, unknown> = {
      status: "completed",
      completed_at: new Date().toISOString(),
    };
    if (mpesaReceipt) {
      updatePayload.mpesa_receipt_number = mpesaReceipt;
    }

    const { error: updateError } = await admin
      .from("provider_payouts")
      .update(updatePayload)
      .eq("id", payoutId);

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
