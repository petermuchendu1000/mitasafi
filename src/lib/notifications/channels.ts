// =============================================================================
// NOTIFICATION CHANNEL DISPATCHER
// =============================================================================
// After an in-app notification row is created, this module dispatches the
// corresponding email and/or SMS when the notification's channel flags
// indicate delivery is requested.
//
// Architecture:
//   triggers.ts
//     → createNotification()       — inserts DB row (always)
//     → dispatchNotificationChannels() — sends email / SMS (conditional)
//         → email/booking-emails.ts  (Resend)
//         → sms/templates.ts + sms/  (Africa's Talking)
//
// Delivery failures are caught, logged, and NEVER block the main
// notification flow. The notification row's email_sent / sms_sent columns
// are updated to track delivery status.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingEmail } from "@/lib/email/booking-emails";
import { getBookingSMSBody } from "@/lib/sms/templates";
import { sendSMS } from "@/lib/sms";

// =============================================================================
// SHARED CONTEXT TYPE
// =============================================================================

/**
 * Structured data passed from notification triggers to email / SMS templates.
 *
 * Each trigger function populates only the fields relevant to its event.
 * Email and SMS template renderers read from this bag to build their content.
 */
export interface ChannelContext {
  // ── Parties ────────────────────────────────────────────────────────────
  customerName?: string;
  providerName?: string;

  // ── Booking ────────────────────────────────────────────────────────────
  bookingId?: string;
  serviceName?: string;
  scheduledDate?: string;

  // ── Payment ────────────────────────────────────────────────────────────
  amount?: number;
  mpesaReceipt?: string;
  paymentRef?: string;

  // ── Quote ──────────────────────────────────────────────────────────────
  quotedPrice?: number;
  isRevision?: boolean;

  // ── Cancellation / Dispute ─────────────────────────────────────────────
  reason?: string;
  disputeType?: string;

  // ── Review ─────────────────────────────────────────────────────────────
  rating?: number;

  // ── Dispute update (free-form status message) ──────────────────────────
  statusMessage?: string;
}

// =============================================================================
// INTERNAL: RESOLVE RECIPIENT CONTACT INFO
// =============================================================================

interface RecipientContact {
  email: string | null;
  phone: string | null;
  name: string | null;
}

/**
 * Look up a user's email, phone, and display name.
 *
 * For providers whose `profiles.phone` is null we fall back to the required
 * `service_providers.phone` column so SMS delivery is still possible.
 */
async function resolveRecipientContact(
  userId: string,
  userRole: string,
): Promise<RecipientContact> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("email, phone, full_name")
    .eq("id", userId)
    .single();

  let phone = profile?.phone ?? null;

  // Provider fallback: service_providers.phone is NOT NULL
  if (userRole === "provider" && !phone) {
    const { data: sp } = await admin
      .from("service_providers")
      .select("phone")
      .eq("user_id", userId)
      .single();
    phone = sp?.phone ?? null;
  }

  return {
    email: profile?.email ?? null,
    phone,
    name: profile?.full_name ?? null,
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Dispatch email and/or SMS for a notification that was just created.
 *
 * • Errors are caught and logged — they never propagate.
 * • Call this **after** the notification row has been successfully inserted.
 * • The notification's `email_sent` / `sms_sent` columns are updated on
 *   successful delivery so we have an audit trail.
 */
export async function dispatchNotificationChannels(
  notificationId: string,
  payload: {
    userId: string;
    userRole: string;
    type: string;
    email?: boolean;
    sms?: boolean;
  },
  context: ChannelContext,
): Promise<void> {
  const shouldEmail = payload.email === true;
  const shouldSMS = payload.sms === true;

  if (!shouldEmail && !shouldSMS) return;

  // ── Resolve recipient contact info ────────────────────────────────────
  let contact: RecipientContact;
  try {
    contact = await resolveRecipientContact(payload.userId, payload.userRole);
  } catch (err) {
    console.error(
      `[Channels] Failed to resolve contact for user ${payload.userId}:`,
      err,
    );
    return;
  }

  let emailSent = false;
  let smsSent = false;
  let emailFailed = false;
  let smsFailed = false;

  // ── Email dispatch ────────────────────────────────────────────────────
  if (shouldEmail && contact.email) {
    try {
      const result = await sendBookingEmail(
        payload.type,
        contact.email,
        contact.name ?? undefined,
        context,
      );
      emailSent = result.success;
      if (!result.success) {
        emailFailed = true;
        if (result.error) {
          console.error(
            `[Channels] Email failed (${payload.type}):`,
            result.error,
          );
        }
      }
    } catch (err) {
      emailFailed = true;
      console.error(`[Channels] Email error (${payload.type}):`, err);
    }
  } else if (shouldEmail && !contact.email) {
    console.warn(
      `[Channels] No email address for user ${payload.userId}, skipping email`,
    );
  }

  // ── SMS dispatch ──────────────────────────────────────────────────────
  if (shouldSMS && contact.phone) {
    const body = getBookingSMSBody(payload.type, context);
    if (body) {
      try {
        const result = await sendSMS(contact.phone, body);
        smsSent = result.success;
        if (!result.success) {
          smsFailed = true;
          console.error(
            `[Channels] SMS failed (${payload.type}):`,
            result.message,
          );
        }
      } catch (err) {
        smsFailed = true;
        console.error(`[Channels] SMS error (${payload.type}):`, err);
      }
    }
  } else if (shouldSMS && !contact.phone) {
    console.warn(
      `[Channels] No phone number for user ${payload.userId}, skipping SMS`,
    );
  }

  // ── Update delivery status on the notification row ────────────────────
  // Track both successes AND failures so operational dashboards can
  // distinguish "never attempted" from "attempted and failed".
  const statusUpdate: Record<string, unknown> = {};

  if (emailSent) {
    statusUpdate.email_sent = true;
    statusUpdate.email_sent_at = new Date().toISOString();
  } else if (emailFailed) {
    statusUpdate.email_failed_at = new Date().toISOString();
  }

  if (smsSent) {
    statusUpdate.sms_sent = true;
    statusUpdate.sms_sent_at = new Date().toISOString();
  } else if (smsFailed) {
    statusUpdate.sms_failed_at = new Date().toISOString();
  }

  if (Object.keys(statusUpdate).length > 0) {
    try {
      const admin = createAdminClient();
      await admin
        .from("notifications")
        .update(statusUpdate)
        .eq("id", notificationId);
    } catch (err) {
      console.error("[Channels] Failed to update delivery status:", err);
    }
  }
}
