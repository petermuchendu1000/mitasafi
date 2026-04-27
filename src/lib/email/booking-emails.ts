// =============================================================================
// BOOKING EMAIL TEMPLATES
// =============================================================================
// Transactional email templates for every booking-related notification type.
// Sent via Resend when a notification has `email: true`.
//
// Called by the notification channel dispatcher (channels.ts).
// Each notification type maps to a branded HTML email + plain-text fallback.
//
// To add a new template: add an entry to the TEMPLATES map.
// =============================================================================

import { Resend } from "resend";
import type { ChannelContext } from "@/lib/notifications/channels";

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const FROM_ADDRESS = "MitaSafi <notifications@mitasafi.co.ke>";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://mitasafi.co.ke";
}

function kes(amount: number | undefined): string {
  return `KES ${(amount ?? 0).toLocaleString()}`;
}

function stars(rating: number): string {
  const clamped = Math.min(Math.max(Math.round(rating), 0), 5);
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

function refId(bookingId: string | undefined): string {
  return bookingId ? `#${bookingId.slice(0, 8).toUpperCase()}` : "";
}

// ── HTML micro-helpers ──────────────────────────────────────────────────────

function infoRow(label: string, value: string | undefined | null): string {
  if (!value) return "";
  return (
    `<tr>` +
    `<td style="padding:4px 0;color:#6b7280;font-size:14px;vertical-align:top;">${label}</td>` +
    `<td style="padding:4px 0 4px 12px;color:#1f2937;font-size:14px;font-weight:500;">${value}</td>` +
    `</tr>`
  );
}

function infoBox(rows: string): string {
  if (!rows) return "";
  return (
    `<div style="background:#f0fdfa;border-radius:8px;padding:16px;margin-bottom:20px;">` +
    `<table style="width:100%;border-collapse:collapse;">${rows}</table>` +
    `</div>`
  );
}

function p(text: string): string {
  return `<p style="margin:0 0 16px 0;color:#4b5563;font-size:15px;line-height:1.6;">${text}</p>`;
}

function warningBox(text: string): string {
  return (
    `<div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px;border-radius:0 4px 4px 0;margin-bottom:20px;">` +
    `<p style="margin:0;color:#9a3412;font-size:14px;line-height:1.5;">${text}</p>` +
    `</div>`
  );
}

function successBox(text: string): string {
  return (
    `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;border-radius:0 4px 4px 0;margin-bottom:20px;">` +
    `<p style="margin:0;color:#166534;font-size:14px;line-height:1.5;">${text}</p>` +
    `</div>`
  );
}

// =============================================================================
// TEMPLATE CONTENT TYPE
// =============================================================================

interface TemplateContent {
  subject: string;
  preheader: string;
  heading: string;
  subtitle?: string;
  bodyHtml: string;
  ctaUrl: string;
  ctaText: string;
  secondaryCtaUrl?: string;
  secondaryCtaText?: string;
}

type TemplateGenerator = (ctx: ChannelContext) => TemplateContent;

// =============================================================================
// DISPUTE LABELS (kept independent of triggers.ts)
// =============================================================================

const DISPUTE_LABELS: Record<string, string> = {
  quality: "Quality Issue",
  pricing: "Pricing Dispute",
  cancellation: "Cancellation Dispute",
  safety: "Safety Concern",
  damage: "Property Damage",
  no_show: "No-Show",
};

// =============================================================================
// TEMPLATE DEFINITIONS (one per notification type)
// =============================================================================

const TEMPLATES: Record<string, TemplateGenerator> = {
  // ─── Booking lifecycle ────────────────────────────────────────────────

  booking_new: (ctx) => ({
    subject: `New booking request: ${ctx.serviceName ?? "a service"}`,
    preheader: `${ctx.customerName ?? "A customer"} wants to book ${ctx.serviceName ?? "your service"}`,
    heading: "New Booking Request",
    subtitle: "A customer wants to book your service",
    bodyHtml:
      infoBox(
        infoRow("Service", ctx.serviceName) +
        infoRow("Customer", ctx.customerName) +
        infoRow("Reference", refId(ctx.bookingId)),
      ) +
      p(
        "A new booking request has been submitted. Please review the details " +
        "and respond promptly — customers expect a response within a few hours.",
      ),
    ctaUrl: `${appUrl()}/dashboard/provider/jobs/${ctx.bookingId}`,
    ctaText: "View & Respond",
  }),

  booking_accepted: (ctx) => ({
    subject: `Your booking is confirmed!`,
    preheader: `${ctx.providerName ?? "Your provider"} confirmed your ${ctx.serviceName ?? "service"} booking`,
    heading: "Booking Confirmed!",
    subtitle: `${ctx.providerName ?? "Your provider"} accepted your request`,
    bodyHtml:
      successBox(
        `Great news! <strong>${ctx.providerName ?? "Your provider"}</strong> ` +
        `has confirmed your booking for <strong>${ctx.serviceName ?? "your service"}</strong>.`,
      ) +
      infoBox(
        infoRow("Provider", ctx.providerName) +
        infoRow("Service", ctx.serviceName) +
        infoRow("Reference", refId(ctx.bookingId)),
      ) +
      p("You can now message your provider to discuss details or wait for them to send a quote."),
    ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}`,
    ctaText: "View Booking",
  }),

  booking_cancelled: (ctx) => ({
    subject: `Booking update: ${ctx.serviceName ?? "your service"}`,
    preheader: `${ctx.providerName ?? "The provider"} was unable to accept your booking`,
    heading: "Booking Update",
    bodyHtml:
      warningBox(
        ctx.reason
          ? `<strong>${ctx.providerName ?? "The provider"}</strong> declined your booking: "${ctx.reason}"`
          : `<strong>${ctx.providerName ?? "The provider"}</strong> was unable to accept your booking at this time.`,
      ) +
      infoBox(
        infoRow("Service", ctx.serviceName) +
        infoRow("Reference", refId(ctx.bookingId)),
      ) +
      p("Don't worry — there are plenty of other qualified providers on MitaSafi. Browse our marketplace to find another match."),
    ctaUrl: `${appUrl()}/services/browse`,
    ctaText: "Browse Other Providers",
    secondaryCtaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}`,
    secondaryCtaText: "View booking details",
  }),

  booking_cancelled_by_customer: (ctx) => ({
    subject: `Booking cancelled: ${ctx.serviceName ?? "a service"}`,
    preheader: `${ctx.customerName ?? "A customer"} cancelled their booking`,
    heading: "Booking Cancelled",
    bodyHtml:
      warningBox(
        `<strong>${ctx.customerName ?? "The customer"}</strong> cancelled their booking` +
        (ctx.reason ? `: "${ctx.reason}"` : "."),
      ) +
      infoBox(
        infoRow("Customer", ctx.customerName) +
        infoRow("Service", ctx.serviceName) +
        infoRow("Reference", refId(ctx.bookingId)),
      ) +
      p("This time slot is now free for other bookings."),
    ctaUrl: `${appUrl()}/dashboard/provider/jobs/${ctx.bookingId}`,
    ctaText: "View Details",
  }),

  // ─── Quote lifecycle ──────────────────────────────────────────────────

  quote_sent: (ctx) => {
    const revised = ctx.isRevision === true;
    return {
      subject: `${revised ? "Revised quote" : "New quote"}: ${kes(ctx.quotedPrice)} for ${ctx.serviceName ?? "your service"}`,
      preheader: `${ctx.providerName ?? "A provider"} sent ${revised ? "a revised" : "a"} quote`,
      heading: revised ? "Revised Quote Received" : "New Quote Received",
      subtitle: `From ${ctx.providerName ?? "your provider"}`,
      bodyHtml:
        infoBox(
          infoRow("Amount", kes(ctx.quotedPrice)) +
          infoRow("Provider", ctx.providerName) +
          infoRow("Service", ctx.serviceName) +
          infoRow("Reference", refId(ctx.bookingId)),
        ) +
        p(
          revised
            ? "The provider has sent a revised quote based on your feedback. Review the updated breakdown and respond."
            : "Review the quote breakdown, and accept or request changes if needed.",
        ),
      ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}/quote`,
      ctaText: "Review Quote",
    };
  },

  quote_accepted: (ctx) => ({
    subject: `Quote accepted: ${ctx.serviceName ?? "a service"}`,
    preheader: `${ctx.customerName ?? "The customer"} accepted your quote`,
    heading: "Quote Accepted!",
    bodyHtml:
      successBox(
        `<strong>${ctx.customerName ?? "The customer"}</strong> accepted your ` +
        `quote of <strong>${kes(ctx.amount)}</strong> for ` +
        `<strong>${ctx.serviceName ?? "the service"}</strong>.`,
      ) +
      infoBox(
        infoRow("Customer", ctx.customerName) +
        infoRow("Agreed Price", kes(ctx.amount)) +
        infoRow("Reference", refId(ctx.bookingId)),
      ) +
      p("You can now schedule the job and start working. The customer is expecting you to proceed promptly."),
    ctaUrl: `${appUrl()}/dashboard/provider/jobs/${ctx.bookingId}`,
    ctaText: "View Job",
  }),

  quote_rejected: (ctx) => ({
    subject: `Quote declined: ${ctx.serviceName ?? "a service"}`,
    preheader: `${ctx.customerName ?? "The customer"} declined your quote`,
    heading: "Quote Declined",
    bodyHtml:
      warningBox(
        ctx.reason
          ? `<strong>${ctx.customerName ?? "The customer"}</strong> declined your quote: "${ctx.reason}"`
          : `<strong>${ctx.customerName ?? "The customer"}</strong> declined your quote for ${ctx.serviceName ?? "the service"}.`,
      ) +
      infoBox(
        infoRow("Customer", ctx.customerName) +
        infoRow("Service", ctx.serviceName) +
        infoRow("Reference", refId(ctx.bookingId)),
      ) +
      p("You can send a revised quote with updated pricing or scope to try to win this job."),
    ctaUrl: `${appUrl()}/dashboard/provider/jobs/${ctx.bookingId}/quote`,
    ctaText: "Send Revised Quote",
  }),

  // ─── Job lifecycle ────────────────────────────────────────────────────

  job_scheduled: (ctx) => {
    let dateDisplay = ctx.scheduledDate ?? "TBD";
    if (ctx.scheduledDate) {
      try {
        dateDisplay = new Date(ctx.scheduledDate).toLocaleDateString("en-KE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        // keep raw value
      }
    }
    return {
      subject: `Job scheduled: ${ctx.serviceName ?? "your service"}`,
      preheader: `${ctx.providerName ?? "Your provider"} scheduled your ${ctx.serviceName ?? "service"}`,
      heading: "Job Scheduled",
      bodyHtml:
        infoBox(
          infoRow("Provider", ctx.providerName) +
          infoRow("Service", ctx.serviceName) +
          infoRow("Date & Time", dateDisplay) +
          infoRow("Reference", refId(ctx.bookingId)),
        ) +
        p("Make sure the location is accessible at the scheduled time. You can message the provider if you need to discuss anything."),
      ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}`,
      ctaText: "View Booking",
    };
  },

  job_completed: (ctx) => ({
    subject: `${ctx.serviceName ?? "Your service"} completed — please confirm`,
    preheader: `${ctx.providerName ?? "Your provider"} marked the job as complete`,
    heading: "Job Completed!",
    subtitle: "Please confirm the work was done satisfactorily",
    bodyHtml:
      successBox(
        `<strong>${ctx.providerName ?? "Your provider"}</strong> has marked your ` +
        `<strong>${ctx.serviceName ?? "service"}</strong> as complete.`,
      ) +
      infoBox(
        infoRow("Provider", ctx.providerName) +
        infoRow("Service", ctx.serviceName) +
        infoRow("Reference", refId(ctx.bookingId)),
      ) +
      p(
        "Please review the work and confirm that everything was done to your satisfaction. " +
        "If there are any issues, you can raise a dispute from the booking page.",
      ),
    ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}`,
    ctaText: "Confirm Completion",
  }),

  completion_confirmed: (ctx) => ({
    subject: `Completion confirmed: ${ctx.serviceName ?? "a service"}`,
    preheader: `${ctx.customerName ?? "The customer"} is satisfied with your work`,
    heading: "Completion Confirmed!",
    bodyHtml:
      successBox(
        `<strong>${ctx.customerName ?? "The customer"}</strong> confirmed that your ` +
        `<strong>${ctx.serviceName ?? "service"}</strong> was completed satisfactorily. Great job!`,
      ) +
      infoBox(
        infoRow("Customer", ctx.customerName) +
        infoRow("Service", ctx.serviceName) +
        infoRow("Reference", refId(ctx.bookingId)),
      ) +
      p("Your earnings from this job are now available in your wallet. Keep up the excellent work!"),
    ctaUrl: `${appUrl()}/dashboard/provider/jobs/${ctx.bookingId}`,
    ctaText: "View Job",
    secondaryCtaUrl: `${appUrl()}/dashboard/provider/earnings`,
    secondaryCtaText: "View earnings",
  }),

  // ─── Payment lifecycle ────────────────────────────────────────────────

  payment_received: (ctx) => ({
    subject: `Payment received: ${kes(ctx.amount)}`,
    preheader: `${kes(ctx.amount)} received from ${ctx.customerName ?? "a customer"}`,
    heading: "Payment Received!",
    bodyHtml:
      successBox(`You received a payment of <strong>${kes(ctx.amount)}</strong>.`) +
      infoBox(
        infoRow("Amount", kes(ctx.amount)) +
        infoRow("From", ctx.customerName) +
        infoRow("Service", ctx.serviceName) +
        infoRow("M-Pesa Ref", ctx.mpesaReceipt) +
        infoRow("Booking", refId(ctx.bookingId)),
      ) +
      p("The payment has been credited to your MitaSafi wallet. You can request a payout to your M-Pesa at any time."),
    ctaUrl: `${appUrl()}/dashboard/provider/earnings`,
    ctaText: "View Earnings",
  }),

  payment_confirmed: (ctx) => ({
    subject: `Payment confirmed: ${kes(ctx.amount)}`,
    preheader: `Your payment of ${kes(ctx.amount)} was successful`,
    heading: "Payment Successful!",
    bodyHtml:
      successBox(`Your payment of <strong>${kes(ctx.amount)}</strong> has been confirmed.`) +
      infoBox(
        infoRow("Amount", kes(ctx.amount)) +
        infoRow("Service", ctx.serviceName) +
        infoRow("Provider", ctx.providerName) +
        infoRow("M-Pesa Ref", ctx.mpesaReceipt) +
        infoRow("Booking", refId(ctx.bookingId)),
      ) +
      p("Keep this email as your payment receipt. You can also find the full payment history on your booking page."),
    ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}`,
    ctaText: "View Booking",
  }),

  payment_failed: (ctx) => ({
    subject: "Payment not completed",
    preheader: "Your M-Pesa payment was not completed",
    heading: "Payment Not Completed",
    bodyHtml:
      warningBox(
        ctx.reason
          ? `Your payment could not be processed: ${ctx.reason}`
          : "Your M-Pesa payment was not completed. This can happen if the request timed out or was cancelled on your phone.",
      ) +
      infoBox(infoRow("Booking", refId(ctx.bookingId))) +
      p("You can retry the payment from your booking page. Make sure your M-Pesa PIN is entered promptly when the STK push arrives."),
    ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}/payment`,
    ctaText: "Try Again",
  }),

  payout_completed: (ctx) => ({
    subject: `Payout sent: ${kes(ctx.amount)}`,
    preheader: `${kes(ctx.amount)} has been sent to your M-Pesa`,
    heading: "Payout Sent!",
    bodyHtml:
      successBox(`<strong>${kes(ctx.amount)}</strong> has been sent to your M-Pesa.`) +
      infoBox(
        infoRow("Amount", kes(ctx.amount)) +
        infoRow("Reference", ctx.paymentRef),
      ) +
      p("The funds should reflect in your M-Pesa balance shortly. If you don't receive them within 24 hours, please contact our support team."),
    ctaUrl: `${appUrl()}/dashboard/provider/earnings`,
    ctaText: "View Earnings",
  }),

  // ─── Reviews ──────────────────────────────────────────────────────────

  review_new: (ctx) => ({
    subject: `New ${ctx.rating ?? 5}★ review: ${ctx.serviceName ?? "a service"}`,
    preheader: `${ctx.customerName ?? "A customer"} left a review on your ${ctx.serviceName ?? "service"}`,
    heading: "New Review Received",
    bodyHtml:
      infoBox(
        infoRow("Rating", ctx.rating != null ? `${stars(ctx.rating)} (${ctx.rating}/5)` : undefined) +
        infoRow("Customer", ctx.customerName) +
        infoRow("Service", ctx.serviceName) +
        infoRow("Booking", refId(ctx.bookingId)),
      ) +
      p("Read the full review and consider leaving a response. Reviews with provider responses tend to build more trust with future customers."),
    ctaUrl: `${appUrl()}/dashboard/provider/reviews`,
    ctaText: "View Review",
  }),

  review_prompt: (ctx) => ({
    subject: `How was your ${ctx.serviceName ?? "service"} experience?`,
    preheader: `Share your experience with ${ctx.providerName ?? "your provider"}`,
    heading: "How Was Your Experience?",
    subtitle: `Your ${ctx.serviceName ?? "service"} was completed recently`,
    bodyHtml:
      infoBox(
        infoRow("Provider", ctx.providerName) +
        infoRow("Service", ctx.serviceName) +
        infoRow("Booking", refId(ctx.bookingId)),
      ) +
      p(
        "Your feedback helps other customers make informed decisions and " +
        "helps providers improve their service. It only takes a minute!",
      ),
    ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}/review`,
    ctaText: "Leave a Review",
  }),

  // ─── Disputes & Refunds ───────────────────────────────────────────────

  dispute_filed: (ctx) => {
    const typeLabel = ctx.disputeType
      ? DISPUTE_LABELS[ctx.disputeType] ?? ctx.disputeType
      : "a dispute";
    return {
      subject: `Dispute filed: ${ctx.serviceName ?? "a booking"}`,
      preheader: `${ctx.customerName ?? "A customer"} filed ${typeLabel.toLowerCase()} on a booking`,
      heading: "Dispute Filed",
      bodyHtml:
        warningBox(
          `<strong>${ctx.customerName ?? "A customer"}</strong> has filed a ` +
          `<strong>${typeLabel}</strong> on your booking for ` +
          `<strong>${ctx.serviceName ?? "a service"}</strong>.`,
        ) +
        infoBox(
          infoRow("Customer", ctx.customerName) +
          infoRow("Service", ctx.serviceName) +
          infoRow("Dispute Type", typeLabel) +
          infoRow("Reference", refId(ctx.bookingId)),
        ) +
        p(
          "Our team will review the dispute and may reach out for additional information. " +
          "In the meantime you can view the full details on your dashboard.",
        ),
      ctaUrl: `${appUrl()}/dashboard/provider/jobs/${ctx.bookingId}`,
      ctaText: "View Details",
    };
  },

  dispute_updated: (ctx) => ({
    subject: "Dispute status update",
    preheader: "There's an update on your dispute",
    heading: "Dispute Update",
    bodyHtml:
      infoBox(infoRow("Reference", refId(ctx.bookingId))) +
      p(ctx.statusMessage ?? "Your dispute status has been updated. Check your booking page for the latest information."),
    ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}`,
    ctaText: "View Booking",
  }),

  refund_processed: (ctx) => ({
    subject: `Refund processed: ${kes(ctx.amount)}`,
    preheader: `Your refund of ${kes(ctx.amount)} has been processed`,
    heading: "Refund Processed",
    bodyHtml:
      successBox(`Your refund of <strong>${kes(ctx.amount)}</strong> has been processed.`) +
      infoBox(
        infoRow("Refund Amount", kes(ctx.amount)) +
        infoRow("Booking", refId(ctx.bookingId)),
      ) +
      p("The refund will reflect in your M-Pesa account shortly. If you don't see it within 48 hours, please contact our support team."),
    ctaUrl: `${appUrl()}/dashboard/bookings/${ctx.bookingId}`,
    ctaText: "View Booking",
  }),
};

// =============================================================================
// SHARED HTML LAYOUT
// =============================================================================

function renderLayout(content: TemplateContent): { html: string; text: string } {
  const url = appUrl();

  const subtitleBlock = content.subtitle
    ? `<p style="margin:8px 0 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${content.subtitle}</p>`
    : "";

  const secondaryBlock =
    content.secondaryCtaUrl && content.secondaryCtaText
      ? (
        `<div style="margin:12px 0 0 0;text-align:center;">` +
        `<a href="${content.secondaryCtaUrl}" style="color:#0d9488;text-decoration:none;font-size:14px;">${content.secondaryCtaText} &rarr;</a>` +
        `</div>`
      )
      : "";

  const html = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1.0">`,
    `<meta name="color-scheme" content="light">`,
    `<!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->`,
    `<title>${content.subject}</title>`,
    `</head>`,
    `<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#1f2937;margin:0;padding:0;background:#f3f4f6;">`,
    // Hidden preheader text
    `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f3f4f6;">${content.preheader}</div>`,
    `<div style="max-width:600px;margin:0 auto;padding:20px;">`,
    `<div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">`,
    // Header
    `<div style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px 24px;text-align:center;">`,
    `<h1 style="margin:0;color:white;font-size:22px;font-weight:600;">${content.heading}</h1>`,
    subtitleBlock,
    `</div>`,
    // Body
    `<div style="padding:28px 24px;">`,
    content.bodyHtml,
    // Primary CTA
    `<div style="margin:28px 0 0 0;text-align:center;">`,
    `<a href="${content.ctaUrl}" style="display:inline-block;background:#0d9488;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">`,
    content.ctaText,
    `</a>`,
    `</div>`,
    secondaryBlock,
    `</div>`,
    // Footer
    `<div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">`,
    `<p style="margin:0 0 8px 0;color:#9ca3af;font-size:12px;">This is a transactional email related to your activity on MitaSafi.</p>`,
    `<p style="margin:0;color:#9ca3af;font-size:12px;"><a href="${url}" style="color:#0d9488;text-decoration:none;">MitaSafi</a> &middot; Nairobi, Kenya</p>`,
    `</div>`,
    `</div>`,
    `</div>`,
    `</body>`,
    `</html>`,
  ].join("\n");

  // Plain-text fallback by stripping HTML tags
  const text = [
    content.heading,
    content.subtitle ?? "",
    "",
    content.bodyHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|h[1-6]|tr|td|li|ul|ol|table)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&middot;/g, "·")
      .replace(/&rarr;/g, "→")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    "",
    `${content.ctaText}: ${content.ctaUrl}`,
    "",
    "---",
    `MitaSafi · ${url}`,
  ].join("\n");

  return { html, text };
}

// =============================================================================
// PUBLIC API
// =============================================================================

export interface BookingEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send a branded booking email for the given notification type.
 *
 * Returns `{ success: false }` (without throwing) when:
 *  - Resend is not configured (RESEND_API_KEY missing)
 *  - No template for the given notification type
 *  - Resend API returns an error
 */
export async function sendBookingEmail(
  type: string,
  recipientEmail: string,
  recipientName: string | undefined,
  ctx: ChannelContext,
): Promise<BookingEmailResult> {
  // ── Guard: email gateway ──────────────────────────────────────────────
  if (!process.env.RESEND_API_KEY) {
    console.log("[BookingEmail] RESEND_API_KEY not set, skipping email");
    return { success: false, error: "Email not configured" };
  }

  // ── Guard: template exists ────────────────────────────────────────────
  const generator = TEMPLATES[type];
  if (!generator) {
    console.warn(`[BookingEmail] No template for notification type: ${type}`);
    return { success: false, error: `No template for type: ${type}` };
  }

  // ── Build template ────────────────────────────────────────────────────
  const content = generator(ctx);
  const { html, text } = renderLayout(content);

  // ── Personalise "to" header ───────────────────────────────────────────
  const to = recipientName
    ? `${recipientName} <${recipientEmail}>`
    : recipientEmail;

  // ── Send via Resend ───────────────────────────────────────────────────
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: content.subject,
      html,
      text,
    });

    if (error) {
      console.error(`[BookingEmail] Resend error (${type}):`, error);
      return { success: false, error: error.message };
    }

    console.log(`[BookingEmail] Sent ${type} to ${recipientEmail}`);
    return { success: true };
  } catch (err) {
    console.error(`[BookingEmail] Unexpected error (${type}):`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}
