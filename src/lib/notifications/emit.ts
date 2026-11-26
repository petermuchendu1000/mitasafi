/**
 * Notifications that fire from the action that caused them.
 *
 * WHY THERE IS ONLY ONE OF THESE
 *   landlord_settings offers fourteen event switches. Thirteen have no event
 *   to fire from, and that is a fact about the product, not an omission here:
 *
 *     - the five maintenance switches: NOTHING in the application creates a
 *       maintenance request. `maintenance_requests` is read in six places and
 *       written in none; the rows on the live project are seed data.
 *     - the three payment switches: `payments` has exactly one INSERT policy,
 *       "Landlords can insert payments for own leases", and recordPayment
 *       additionally filters the lease on landlord_id = auth.uid(). So the
 *       only person who can create a payment is the landlord themselves, and
 *       emailing somebody about the button they just pressed is noise, not a
 *       notification.
 *     - the two signing switches: there is no signing flow.
 *     - funds disbursed, refunds, insurance: no such features exist.
 *
 *   A rental application is the one thing a person other than the landlord
 *   can cause, and it is the one worth catching: a landlord who misses it
 *   loses the tenant to whoever replied first.
 *
 * THESE RUN INSIDE SOMEBODY'S ACTION, SO THEY NEVER THROW
 *   The application has already been saved by the time this is called. An
 *   email failure must not turn a successful submission into an error on the
 *   applicant's screen, so everything here is wrapped and the worst outcome
 *   is a log line.
 *
 * WHY THE ADMIN CLIENT
 *   The caller is the APPLICANT. They cannot read the landlord's email
 *   address or settings, and nobody may write notification_log from a
 *   browser — that is asserted in notification_log_test.sql. Nothing here
 *   takes content from the caller: the recipient and every fact in the
 *   message are re-read from the listing, so a forged argument can at worst
 *   name a listing that is not theirs, which the lookup then resolves to
 *   that listing's real owner.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email";
import { dedupeKey, preferencesFrom, type PlannedNotice } from "./plan";
import { renderNotice } from "./render";

/**
 * Tell a landlord that somebody has applied for one of their listings.
 *
 * Takes the listing and the applicant, never the landlord: the owner is
 * resolved from the listing so that the caller cannot choose who gets mail.
 */
export async function notifyApplicationSubmitted(input: {
  listingId: string;
  applicantUserId: string;
  applicantName: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: listing } = await admin
      .from("listings")
      .select("id, landlord_id, title, area")
      .eq("id", input.listingId)
      .maybeSingle();
    if (!listing?.landlord_id) return;

    const landlordId = listing.landlord_id as string;

    const [{ data: profile }, { data: settings }] = await Promise.all([
      admin.from("profiles").select("email").eq("id", landlordId).maybeSingle(),
      admin
        .from("landlord_settings")
        .select("*")
        .eq("landlord_id", landlordId)
        .maybeSingle(),
    ]);

    const to = profile?.email;
    if (!to) return;

    const prefs = preferencesFrom(
      landlordId,
      settings as Record<string, unknown> | null,
    );
    // Off means off. No row is written for a suppressed notice: the unique
    // index covers 'sent' only, so suppressed rows would accumulate without
    // ever preventing anything.
    if (!prefs.notify_application_submitted) return;

    // One notice per applicant per listing. That matches the partial unique
    // index on (listing_id, applicant_id) for open applications, so a tenant
    // cannot generate mail by re-submitting.
    const key = dedupeKey({
      kind: "application_submitted",
      recipient: landlordId,
      subjectId: input.listingId,
      period: input.applicantUserId,
    });

    const { data: already } = await admin
      .from("notification_log")
      .select("id")
      .eq("landlord_id", landlordId)
      .eq("dedupe_key", key)
      .eq("status", "sent")
      .maybeSingle();
    if (already) return;

    const notice: PlannedNotice = {
      kind: "application_submitted",
      landlordId,
      recipientKind: "landlord",
      tenantId: null,
      toEmail: to,
      subjectType: "lease",
      subjectId: input.listingId,
      period: null,
      dedupeKey: key,
      data: {
        applicant: input.applicantName,
        listing: String(listing.title ?? "your listing"),
        area: String(listing.area ?? ""),
      },
    };

    const rendered = renderNotice(notice);
    const result = await sendNotificationEmail({
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });

    // Written after the send, and a failure is recorded as a failure so the
    // row does not block a later retry.
    const { error } = await admin.from("notification_log").insert({
      landlord_id: landlordId,
      recipient_kind: "landlord",
      tenant_id: null,
      channel: "email",
      kind: "application_submitted",
      dedupe_key: key,
      subject_type: "listing",
      subject_id: input.listingId,
      period: null,
      status: result.success ? "sent" : "failed",
      error: result.success ? null : (result.error ?? "unknown").slice(0, 500),
    });
    if (error && error.code !== "23505") {
      console.error("[Notify] application log write failed:", error.message);
    }
    if (!result.success) {
      console.error("[Notify] application email failed:", result.error);
    }
  } catch (e) {
    // The application is already saved. Nothing here may surface to the
    // applicant as a failure.
    console.error("[Notify] application notification threw:", e);
  }
}
