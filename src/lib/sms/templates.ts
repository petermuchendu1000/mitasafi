// =============================================================================
// SMS TEMPLATES — BOOKING NOTIFICATIONS
// =============================================================================
// Short-form messages dispatched via Africa's Talking for critical booking
// events. Each template targets ≤ 160 characters where feasible (single SMS
// segment). Longer messages concatenate automatically on the carrier side.
//
// Called exclusively by the notification channel dispatcher
//   → src/lib/notifications/channels.ts
//
// To add a new template: add a case to getBookingSMSBody().
// =============================================================================

import type { ChannelContext } from "@/lib/notifications/channels";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://mitasafi.co.ke";
}

function kes(amount: number | undefined): string {
  return `KES ${(amount ?? 0).toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the SMS body for a given notification type.
 *
 * Returns `null` when the type has no SMS template — the channel dispatcher
 * will skip SMS delivery in that case.
 */
export function getBookingSMSBody(
  type: string,
  ctx: ChannelContext,
): string | null {
  const url = appUrl();

  switch (type) {
    // ── Provider: new booking request from customer ─────────────────────
    case "booking_new":
      return (
        `MitaSafi: New booking request from ` +
        `${ctx.customerName ?? "a customer"} for ` +
        `${ctx.serviceName ?? "a service"}. ` +
        `Review: ${url}/dashboard/provider/jobs/${ctx.bookingId}`
      );

    // ── Customer: booking confirmed by provider ─────────────────────────
    case "booking_accepted":
      return (
        `MitaSafi: ${ctx.providerName ?? "Your provider"} confirmed your ` +
        `${ctx.serviceName ?? "service"} booking. ` +
        `Details: ${url}/dashboard/bookings/${ctx.bookingId}`
      );

    // ── Customer: provider sent a quote ─────────────────────────────────
    case "quote_sent":
      return (
        `MitaSafi: ${ctx.providerName ?? "Your provider"} sent a quote` +
        `${ctx.amount ? ` of ${kes(ctx.amount)}` : ""} for ` +
        `${ctx.serviceName ?? "your service"}. ` +
        `Review: ${url}/dashboard/bookings/${ctx.bookingId}/quote`
      );

    // ── Customer: job scheduled ─────────────────────────────────────────
    case "job_scheduled":
      return (
        `MitaSafi: Your ${ctx.serviceName ?? "service"} with ` +
        `${ctx.providerName ?? "your provider"} has been scheduled. ` +
        `Details: ${url}/dashboard/bookings/${ctx.bookingId}`
      );

    // ── Customer: provider marked job complete ──────────────────────────
    case "job_completed":
      return (
        `MitaSafi: ${ctx.providerName ?? "Your provider"} completed your ` +
        `${ctx.serviceName ?? "service"}. ` +
        `Please confirm: ${url}/dashboard/bookings/${ctx.bookingId}`
      );

    // ── Customer: M-Pesa payment successful ─────────────────────────────
    case "payment_confirmed":
      return (
        `MitaSafi: ${kes(ctx.amount)} paid for ` +
        `${ctx.serviceName ?? "your service"}. ` +
        `Ref: ${ctx.mpesaReceipt ?? "N/A"}. ` +
        `${url}/dashboard/bookings/${ctx.bookingId}`
      );

    // ── Provider: payment received from customer ────────────────────────
    case "payment_received":
      return (
        `MitaSafi: ${kes(ctx.amount)} received from ` +
        `${ctx.customerName ?? "a customer"}. ` +
        `Ref: ${ctx.mpesaReceipt ?? "N/A"}. ` +
        `${url}/dashboard/provider/earnings`
      );

    // ── Provider: payout sent to M-Pesa ─────────────────────────────────
    case "payout_completed":
      return (
        `MitaSafi: ${kes(ctx.amount)} sent to your M-Pesa. ` +
        `Ref: ${ctx.paymentRef ?? "N/A"}.`
      );

    // ── Provider: customer filed a dispute ──────────────────────────────
    case "dispute_filed":
      return (
        `MitaSafi: A dispute was filed on your booking. ` +
        `Details: ${url}/dashboard/provider/jobs/${ctx.bookingId}`
      );

    // ── Customer: refund processed ──────────────────────────────────────
    case "refund_processed":
      return (
        `MitaSafi: Your refund of ${kes(ctx.amount)} has been processed ` +
        `and will reflect in your account shortly.`
      );

    default:
      return null;
  }
}
