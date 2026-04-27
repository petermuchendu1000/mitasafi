// =============================================================================
// MITASAFI: NOTIFICATION TRIGGERS
// =============================================================================
// Server-side helper for inserting notification rows.
// Covers all booking-related notification types for M1+.
//
// Uses createAdminClient() because:
// 1. Notifications are written on behalf of recipients (not the acting user).
// 2. The acting user's RLS policy wouldn't allow inserting into another
//    user's notifications.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import {
  dispatchNotificationChannels,
  type ChannelContext,
} from "./channels";

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationPayload {
  userId: string;
  userRole: "customer" | "provider" | "admin";
  type: string;
  title: string;
  message: string;
  bookingId?: string;
  providerId?: string;
  reviewId?: string;
  actionUrl?: string;
  inApp?: boolean;
  email?: boolean;
  sms?: boolean;
  /** Structured data for email / SMS template rendering (channels.ts). */
  channelContext?: ChannelContext;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

// =============================================================================
// CORE INSERT
// =============================================================================

/**
 * Insert a single notification row.
 * Intended for server-side use only (actions, API routes, webhooks).
 *
 * Channel flags (email, sms) are intersected with the user's notification
 * preferences from the `user_preferences` table. A trigger may request
 * email + sms, but if the user has disabled `email_notifications`, the
 * email flag will be cleared before dispatch.
 */
export async function createNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    const admin = createAdminClient();

    // Respect user preferences for channel dispatch
    let effectiveEmail = payload.email ?? false;
    let effectiveSms = payload.sms ?? false;

    if (effectiveEmail || effectiveSms) {
      try {
        const { data: prefs } = await admin
          .from("user_preferences")
          .select("email_notifications, sms_notifications")
          .eq("user_id", payload.userId)
          .maybeSingle();

        if (prefs) {
          if (prefs.email_notifications === false) effectiveEmail = false;
          if (prefs.sms_notifications === false) effectiveSms = false;
        }
        // If no prefs row exists, honour the trigger's defaults (opt-in)
      } catch {
        // Preference lookup failure must never block notification creation
        console.warn("[Notifications] Preference lookup failed, using defaults");
      }
    }

    const { data, error } = await admin
      .from("notifications")
      .insert({
        user_id: payload.userId,
        user_role: payload.userRole,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        booking_id: payload.bookingId ?? null,
        provider_id: payload.providerId ?? null,
        review_id: payload.reviewId ?? null,
        action_url: payload.actionUrl ?? null,
        in_app: payload.inApp ?? true,
        email: effectiveEmail,
        sms: effectiveSms,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Notifications] Insert failed:", error);
      return { success: false, error: error.message };
    }

    // Dispatch email / SMS channels when structured context is provided
    if (data?.id && payload.channelContext && (effectiveEmail || effectiveSms)) {
      try {
        await dispatchNotificationChannels(
          data.id,
          {
            userId: payload.userId,
            userRole: payload.userRole,
            type: payload.type,
            email: effectiveEmail,
            sms: effectiveSms,
          },
          payload.channelContext,
        );
      } catch (channelErr) {
        // Channel failures must never block the notification itself
        console.error("[Notifications] Channel dispatch failed:", channelErr);
      }
    }

    return { success: true, notificationId: data?.id };
  } catch (err) {
    console.error("[Notifications] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// BOOKING-SPECIFIC TRIGGERS
// =============================================================================

/**
 * Notify a provider that a new booking request has been submitted.
 *
 * Called from: createBookingRequest server action.
 * Recipient: the provider who was selected by the customer.
 */
export async function notifyProviderNewBooking(params: {
  providerUserId: string;
  providerId: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "booking_new",
    title: "New booking request",
    message: `${params.customerName} requested ${params.serviceName}. Review and respond.`,
    bookingId: params.bookingId,
    providerId: params.providerId,
    actionUrl: `/dashboard/provider/jobs/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      customerName: params.customerName,
      serviceName: params.serviceName,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a customer that their booking has been confirmed by the provider.
 *
 * Called from: M2 — provider accept action.
 */
export async function notifyCustomerBookingConfirmed(params: {
  customerUserId: string;
  bookingId: string;
  providerName: string;
  serviceName: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "booking_accepted",
    title: "Booking confirmed!",
    message: `${params.providerName} confirmed your ${params.serviceName} booking.`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      providerName: params.providerName,
      serviceName: params.serviceName,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a customer that the provider cancelled their booking.
 *
 * Called from: M2 — provider reject action.
 */
export async function notifyCustomerBookingCancelled(params: {
  customerUserId: string;
  bookingId: string;
  providerName: string;
  reason?: string;
}): Promise<NotificationResult> {
  const msg = params.reason
    ? `${params.providerName} declined your booking: "${params.reason}"`
    : `${params.providerName} was unable to accept your booking.`;

  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "booking_cancelled",
    title: "Booking update",
    message: msg,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      providerName: params.providerName,
      reason: params.reason,
      bookingId: params.bookingId,
    },
  });
}

// =============================================================================
// QUOTE-SPECIFIC TRIGGERS (M3)
// =============================================================================

/**
 * Notify a customer that the provider sent a quote.
 *
 * Called from: M3 — submitQuote server action.
 * Recipient: the customer who created the booking.
 */
export async function notifyCustomerQuoteSent(params: {
  customerUserId: string;
  bookingId: string;
  providerName: string;
  serviceName: string;
  quotedPrice: number;
  isRevision: boolean;
}): Promise<NotificationResult> {
  const action = params.isRevision ? "sent a revised quote" : "sent a quote";

  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "quote_sent",
    title: params.isRevision ? "Revised quote received" : "New quote received",
    message: `${params.providerName} ${action} of KES ${params.quotedPrice.toLocaleString()} for ${params.serviceName}. Review and respond.`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}/quote`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      providerName: params.providerName,
      serviceName: params.serviceName,
      quotedPrice: params.quotedPrice,
      isRevision: params.isRevision,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a provider that their quote was accepted.
 *
 * Called from: M3 — acceptQuote server action.
 * Recipient: the provider who sent the quote.
 */
export async function notifyProviderQuoteAccepted(params: {
  providerUserId: string;
  providerId: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  agreedPrice: number;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "quote_accepted",
    title: "Quote accepted!",
    message: `${params.customerName} accepted your quote of KES ${params.agreedPrice.toLocaleString()} for ${params.serviceName}.`,
    bookingId: params.bookingId,
    providerId: params.providerId,
    actionUrl: `/dashboard/provider/jobs/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      customerName: params.customerName,
      serviceName: params.serviceName,
      amount: params.agreedPrice,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a provider that their quote was rejected.
 *
 * Called from: M3 — rejectQuote server action.
 * Recipient: the provider who sent the quote.
 */
export async function notifyProviderQuoteRejected(params: {
  providerUserId: string;
  providerId: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  reason?: string;
}): Promise<NotificationResult> {
  const msg = params.reason
    ? `${params.customerName} declined your quote for ${params.serviceName}: "${params.reason}". You can send a revised quote.`
    : `${params.customerName} declined your quote for ${params.serviceName}. You can send a revised quote.`;

  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "quote_rejected",
    title: "Quote declined",
    message: msg,
    bookingId: params.bookingId,
    providerId: params.providerId,
    actionUrl: `/dashboard/provider/jobs/${params.bookingId}/quote`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      customerName: params.customerName,
      serviceName: params.serviceName,
      reason: params.reason,
      bookingId: params.bookingId,
    },
  });
}

// =============================================================================
// MESSAGE-SPECIFIC TRIGGERS (M4)
// =============================================================================

/**
 * Notify the other party that a new message was sent in a booking.
 *
 * Called from: M4 — sendMessage server action.
 * Recipient: the OTHER participant (not the sender).
 */
export async function notifyNewMessage(params: {
  recipientUserId: string;
  recipientRole: "customer" | "provider";
  bookingId: string;
  senderName: string;
  messagePreview: string;
}): Promise<NotificationResult> {
  // Truncate preview to a reasonable length
  const preview =
    params.messagePreview.length > 80
      ? params.messagePreview.slice(0, 77) + "…"
      : params.messagePreview;

  // Action URL routes to the correct dashboard based on recipient role
  const actionUrl =
    params.recipientRole === "provider"
      ? `/dashboard/provider/jobs/${params.bookingId}`
      : `/dashboard/bookings/${params.bookingId}`;

  return createNotification({
    userId: params.recipientUserId,
    userRole: params.recipientRole,
    type: "new_message",
    title: "New message",
    message: `${params.senderName}: ${preview}`,
    bookingId: params.bookingId,
    actionUrl,
    inApp: true,
    email: false,
    sms: false,
  });
}

// =============================================================================
// JOB LIFECYCLE TRIGGERS (M5)
// =============================================================================

/**
 * Notify customer that their job has been scheduled.
 * Called from: M5 — scheduleJob server action.
 */
export async function notifyCustomerJobScheduled(params: {
  customerUserId: string;
  bookingId: string;
  providerName: string;
  serviceName: string;
  scheduledStart: string;
}): Promise<NotificationResult> {
  const date = new Date(params.scheduledStart).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "job_scheduled",
    title: "Job scheduled",
    message: `${params.providerName} scheduled your ${params.serviceName} for ${date}.`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      providerName: params.providerName,
      serviceName: params.serviceName,
      scheduledDate: params.scheduledStart,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify customer that work on their job has started.
 * Called from: M5 — startJob server action.
 */
export async function notifyCustomerJobStarted(params: {
  customerUserId: string;
  bookingId: string;
  providerName: string;
  serviceName: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "job_started",
    title: "Job in progress",
    message: `${params.providerName} has started working on your ${params.serviceName}.`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}`,
    inApp: true,
    email: false,
    sms: false,
  });
}

/**
 * Notify customer that the job has been marked as completed.
 * Called from: M5 — completeJob server action.
 */
export async function notifyCustomerJobCompleted(params: {
  customerUserId: string;
  bookingId: string;
  providerName: string;
  serviceName: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "job_completed",
    title: "Job completed!",
    message: `${params.providerName} marked your ${params.serviceName} as complete. Please confirm the work was done satisfactorily.`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}/confirm`,
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      providerName: params.providerName,
      serviceName: params.serviceName,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify provider that the customer confirmed the job completion.
 * Called from: M5 — customerConfirmCompletion server action.
 */
export async function notifyProviderCompletionConfirmed(params: {
  providerUserId: string;
  providerId: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "completion_confirmed",
    title: "Completion confirmed!",
    message: `${params.customerName} confirmed your ${params.serviceName} was completed satisfactorily.`,
    bookingId: params.bookingId,
    providerId: params.providerId,
    actionUrl: `/dashboard/provider/jobs/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      customerName: params.customerName,
      serviceName: params.serviceName,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify provider that a customer cancelled a booking.
 * Called from: M5 — cancelBookingAsCustomer server action.
 */
export async function notifyProviderBookingCancelled(params: {
  providerUserId: string;
  providerId: string;
  bookingId: string;
  customerName: string;
  reason: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "booking_cancelled_by_customer",
    title: "Booking cancelled",
    message: `${params.customerName} cancelled their booking: "${params.reason}"`,
    bookingId: params.bookingId,
    providerId: params.providerId,
    actionUrl: `/dashboard/provider/jobs/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      customerName: params.customerName,
      reason: params.reason,
      bookingId: params.bookingId,
    },
  });
}

// =============================================================================
// PAYMENT TRIGGERS (M6)
// =============================================================================

/**
 * Notify a provider that a payment has been received for a job.
 *
 * Called from: processPaymentCallback (on M-Pesa success).
 * Recipient: the provider who completed the job.
 */
export async function notifyProviderPaymentReceived(params: {
  providerUserId: string;
  providerId: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  amount: number;
  mpesaReceipt: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "payment_received",
    title: "Payment received!",
    message: `KES ${params.amount.toLocaleString()} received from ${params.customerName} for ${params.serviceName}. Ref: ${params.mpesaReceipt}`,
    bookingId: params.bookingId,
    providerId: params.providerId,
    actionUrl: `/dashboard/provider/earnings`,
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      customerName: params.customerName,
      serviceName: params.serviceName,
      amount: params.amount,
      mpesaReceipt: params.mpesaReceipt,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a customer that their payment was confirmed.
 *
 * Called from: processPaymentCallback (on M-Pesa success).
 * Recipient: the customer who made the payment.
 */
export async function notifyCustomerPaymentConfirmed(params: {
  customerUserId: string;
  bookingId: string;
  providerName: string;
  serviceName: string;
  amount: number;
  mpesaReceipt: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "payment_confirmed",
    title: "Payment successful!",
    message: `KES ${params.amount.toLocaleString()} paid for ${params.serviceName} by ${params.providerName}. M-Pesa ref: ${params.mpesaReceipt}`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      providerName: params.providerName,
      serviceName: params.serviceName,
      amount: params.amount,
      mpesaReceipt: params.mpesaReceipt,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a customer that their payment failed.
 *
 * Called from: processPaymentCallback (on M-Pesa failure).
 * Recipient: the customer who attempted payment.
 */
export async function notifyCustomerPaymentFailed(params: {
  customerUserId: string;
  bookingId: string;
  reason: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "payment_failed",
    title: "Payment failed",
    message: `Your payment was not completed: ${params.reason}. You can retry from the booking page.`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}/payment`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      reason: params.reason,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a provider that their payout has been processed.
 *
 * Called from: admin payout processing (future).
 * Recipient: the provider who requested the payout.
 */
export async function notifyProviderPayoutCompleted(params: {
  providerUserId: string;
  providerId: string;
  amount: number;
  reference: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "payout_completed",
    title: "Payout sent!",
    message: `KES ${params.amount.toLocaleString()} has been sent to your M-Pesa. Ref: ${params.reference}`,
    providerId: params.providerId,
    actionUrl: `/dashboard/provider/earnings`,
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      amount: params.amount,
      paymentRef: params.reference,
    },
  });
}

// =============================================================================
// REVIEW TRIGGERS (M7)
// =============================================================================

/**
 * Notify a provider that a customer left a new review.
 *
 * Called from: submitReview server action.
 * Recipient: the provider who was reviewed.
 */
export async function notifyProviderNewReview(params: {
  providerUserId: string;
  providerId: string;
  bookingId: string;
  reviewId: string;
  customerName: string;
  serviceName: string;
  rating: number;
}): Promise<NotificationResult> {
  const stars = "★".repeat(params.rating) + "☆".repeat(5 - params.rating);
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "review_new",
    title: "New review received!",
    message: `${params.customerName} rated your ${params.serviceName} ${stars} (${params.rating}/5).`,
    bookingId: params.bookingId,
    providerId: params.providerId,
    reviewId: params.reviewId,
    actionUrl: `/dashboard/provider/reviews`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      customerName: params.customerName,
      serviceName: params.serviceName,
      rating: params.rating,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a customer that a provider responded to their review.
 *
 * Called from: submitProviderResponse server action.
 * Recipient: the customer who wrote the review.
 */
export async function notifyCustomerReviewResponse(params: {
  customerUserId: string;
  bookingId: string;
  reviewId: string;
  providerName: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "review_response",
    title: "Provider responded to your review",
    message: `${params.providerName} responded to your review.`,
    bookingId: params.bookingId,
    reviewId: params.reviewId,
    actionUrl: `/dashboard/bookings/${params.bookingId}`,
    inApp: true,
    email: false,
    sms: false,
  });
}

/**
 * Prompt a customer to leave a review after job completion.
 *
 * Called from: a scheduled job or hook after a booking reaches
 * `customer_confirmed` status (e.g. 24 hours after completion).
 * Recipient: the customer who received the service.
 *
 * Only email delivery — the email template guides the customer to the
 * review page. In-app notification provides the action_url fallback.
 */
export async function notifyCustomerReviewPrompt(params: {
  customerUserId: string;
  bookingId: string;
  providerName: string;
  serviceName: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "review_prompt",
    title: "How was your experience?",
    message: `Share your experience with ${params.providerName} for ${params.serviceName}. Your feedback helps others!`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}/review`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      providerName: params.providerName,
      serviceName: params.serviceName,
      bookingId: params.bookingId,
    },
  });
}

// =============================================================================
// DISPUTE TRIGGERS (SC-5)
// =============================================================================

/** Human-readable labels for dispute types. */
const DISPUTE_TYPE_LABELS: Record<string, string> = {
  quality: "quality issue",
  pricing: "pricing dispute",
  cancellation: "cancellation dispute",
  safety: "safety concern",
  damage: "property damage",
  no_show: "no-show",
};

/**
 * Notify a provider that a customer filed a dispute.
 *
 * Called from: fileDispute server action.
 * Recipient: the provider assigned to the disputed booking.
 */
export async function notifyProviderDisputeFiled(params: {
  providerUserId: string;
  providerId: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  disputeType: string;
}): Promise<NotificationResult> {
  const typeLabel = DISPUTE_TYPE_LABELS[params.disputeType] ?? params.disputeType;
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "dispute_filed",
    title: "Dispute filed on a booking",
    message: `${params.customerName} raised a ${typeLabel} for "${params.serviceName}". Our team will review and get in touch.`,
    bookingId: params.bookingId,
    providerId: params.providerId,
    actionUrl: `/dashboard/provider/jobs/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      customerName: params.customerName,
      serviceName: params.serviceName,
      disputeType: params.disputeType,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a customer that their dispute status was updated.
 *
 * Called from: dispute resolution admin flow (future).
 * Recipient: the customer who filed the dispute.
 */
export async function notifyCustomerDisputeUpdated(params: {
  customerUserId: string;
  bookingId: string;
  newStatus: string;
  message?: string;
}): Promise<NotificationResult> {
  const statusMessages: Record<string, string> = {
    investigating: "Your dispute is now being investigated by our team.",
    resolved: "Your dispute has been resolved.",
    closed: "Your dispute has been closed.",
  };
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "dispute_updated",
    title: "Dispute status updated",
    message: params.message ?? statusMessages[params.newStatus] ?? "Your dispute status has changed.",
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: false,
    channelContext: {
      statusMessage: params.message,
      bookingId: params.bookingId,
    },
  });
}

/**
 * Notify a customer that their dispute was resolved with a refund.
 *
 * Called from: dispute resolution + refund processing (future).
 * Recipient: the customer who filed the dispute.
 */
export async function notifyCustomerRefundProcessed(params: {
  customerUserId: string;
  bookingId: string;
  refundAmount: number;
  currency?: string;
}): Promise<NotificationResult> {
  const currency = params.currency ?? "KES";
  return createNotification({
    userId: params.customerUserId,
    userRole: "customer",
    type: "refund_processed",
    title: "Refund processed",
    message: `Your refund of ${currency} ${params.refundAmount.toLocaleString()} has been processed and will reflect in your account shortly.`,
    bookingId: params.bookingId,
    actionUrl: `/dashboard/bookings/${params.bookingId}`,
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      amount: params.refundAmount,
      bookingId: params.bookingId,
    },
  });
}


// =============================================================================
// VERIFICATION TRIGGERS (M-D)
// =============================================================================

/**
 * Notify a provider that their verification has been approved by admin.
 *
 * Called from: admin approveVerification server action.
 * Recipient: the provider whose documents were approved.
 */
export async function notifyProviderVerificationApproved(params: {
  providerUserId: string;
  providerId: string;
  providerName: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "verification_approved",
    title: "Verification approved!",
    message: `Congratulations ${params.providerName}! Your identity has been verified. Your profile is now visible to customers.`,
    providerId: params.providerId,
    actionUrl: "/dashboard/provider",
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      providerName: params.providerName,
    },
  });
}

/**
 * Notify a provider that their verification has been rejected.
 *
 * Called from: admin rejectVerification server action.
 * Recipient: the provider whose documents were rejected.
 */
export async function notifyProviderVerificationRejected(params: {
  providerUserId: string;
  providerId: string;
  providerName: string;
  reason: string;
}): Promise<NotificationResult> {
  return createNotification({
    userId: params.providerUserId,
    userRole: "provider",
    type: "verification_rejected",
    title: "Verification update required",
    message: `Hi ${params.providerName}, your verification documents need attention: ${params.reason}. Please re-upload corrected documents.`,
    providerId: params.providerId,
    actionUrl: "/dashboard/verify-provider",
    inApp: true,
    email: true,
    sms: true,
    channelContext: {
      providerName: params.providerName,
      reason: params.reason,
    },
  });
}

/**
 * Notify admins that a new provider has submitted documents for verification.
 *
 * Called from: completeIdentityVerification server action.
 * Recipient: all users with admin role.
 */
export async function notifyAdminNewVerificationSubmission(params: {
  providerName: string;
  providerId: string;
  providerType: "individual" | "company";
}): Promise<{ success: boolean; notified: number }> {
  try {
    const admin = createAdminClient();

    // Fetch all admin user IDs
    const { data: adminRoles, error } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .eq("is_active", true);

    if (error || !adminRoles?.length) {
      console.warn("[Notifications] No admins found for verification alert:", error?.message);
      return { success: false, notified: 0 };
    }

    let notified = 0;
    for (const { user_id } of adminRoles) {
      const result = await createNotification({
        userId: user_id,
        userRole: "admin",
        type: "verification_submitted",
        title: "New verification submission",
        message: `${params.providerName} (${params.providerType}) submitted documents for review.`,
        providerId: params.providerId,
        actionUrl: `/admin/verifications/${params.providerId}`,
        inApp: true,
        email: true,
        sms: false,
      });
      if (result.success) notified++;
    }

    return { success: true, notified };
  } catch (err) {
    console.error("[Notifications] Admin verification alert failed:", err);
    return { success: false, notified: 0 };
  }
}
