"use server";

// =============================================================================
// MITASAFI: DISPUTE SERVER ACTIONS (SC-5)
// =============================================================================
// Server actions for the dispute and refund flow:
//   - fileDispute: Customer files a dispute → booking transitions to "disputed"
//   - getDisputeForBooking: Fetch existing dispute for a booking
//   - uploadDisputeEvidence: Upload evidence photos to storage
//
// Follows the established booking-lifecycle pattern:
//   1. Authenticate caller
//   2. Verify customer ownership
//   3. Validate current booking status allows dispute filing
//   4. Set audit context for the auto-log trigger
//   5. Insert dispute row + update booking status
//   6. Fire notifications
//   7. Revalidate caches
// =============================================================================

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUser } from "@/lib/cache/queries";
import {
  notifyProviderDisputeFiled,
} from "@/lib/notifications/triggers";
import type {
  DisputeType,
  DesiredResolution,
  BookingStatus,
  BookingDispute,
  DisputeActionResult,
} from "@/types/bookings";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Booking statuses from which a customer can file a dispute. */
const DISPUTABLE_STATUSES: ReadonlySet<BookingStatus> = new Set([
  "completed",
  "customer_confirmed",
  "payment_pending",
  "payment_failed",
]);

/** All valid dispute type values. */
const VALID_DISPUTE_TYPES: ReadonlySet<DisputeType> = new Set([
  "quality",
  "pricing",
  "cancellation",
  "safety",
  "damage",
  "no_show",
]);

/** All valid desired resolution values. */
const VALID_RESOLUTIONS: ReadonlySet<DesiredResolution> = new Set([
  "full_refund",
  "partial_refund",
  "redo_service",
  "provider_apology",
  "other",
]);

/** Max evidence files allowed per dispute. */
const MAX_EVIDENCE_FILES = 10;

/** Max file size per evidence image (5 MB). */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed MIME types for evidence uploads. */
const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Description length limits. */
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 2000;

// =============================================================================
// AUDIT CONTEXT HELPER
// =============================================================================

async function setAuditContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  role: "customer" | "provider" | "admin"
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
// CACHE REVALIDATION
// =============================================================================

function revalidateDisputeCaches(bookingId: string): void {
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath(`/dashboard/bookings/${bookingId}/dispute`);
  revalidatePath("/dashboard/provider/jobs");
  revalidatePath("/dashboard/provider");
}

// =============================================================================
// FILE DISPUTE
// =============================================================================

/**
 * Customer files a dispute against a booking.
 *
 * Flow:
 *   1. Authenticate + verify customer ownership
 *   2. Validate booking is in a disputable status
 *   3. Check no existing open dispute for this booking
 *   4. Upload evidence files to storage (if provided)
 *   5. Insert booking_disputes row
 *   6. Transition booking status to "disputed"
 *   7. Notify provider
 *   8. Revalidate caches
 *
 * @param formData - FormData with fields: bookingId, disputeType, description,
 *                   desiredResolution, and optional evidence_* file entries.
 */
export async function fileDispute(
  formData: FormData
): Promise<DisputeActionResult> {
  try {
    // ── 1. Authenticate ──
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Please sign in to file a dispute." };
    }

    // ── 2. Extract & validate form fields ──
    const bookingId = formData.get("bookingId") as string;
    const disputeType = formData.get("disputeType") as string;
    const description = (formData.get("description") as string)?.trim();
    const desiredResolution = formData.get("desiredResolution") as string;

    if (!bookingId) {
      return { success: false, error: "Booking ID is required." };
    }

    if (!disputeType || !VALID_DISPUTE_TYPES.has(disputeType as DisputeType)) {
      return { success: false, error: "Please select a valid dispute reason." };
    }

    if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
      return {
        success: false,
        error: `Please provide a detailed description (at least ${MIN_DESCRIPTION_LENGTH} characters).`,
      };
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return {
        success: false,
        error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
      };
    }

    if (
      !desiredResolution ||
      !VALID_RESOLUTIONS.has(desiredResolution as DesiredResolution)
    ) {
      return {
        success: false,
        error: "Please select your desired resolution.",
      };
    }

    // ── 3. Verify customer ownership ──
    const admin = createAdminClient();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select(
        "id, customer_id, provider_id, status, service_id, agreed_price, quoted_price"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: "Booking not found." };
    }

    if (booking.customer_id !== user.id) {
      return { success: false, error: "This booking does not belong to you." };
    }

    // ── 4. Validate booking status ──
    if (!DISPUTABLE_STATUSES.has(booking.status as BookingStatus)) {
      return {
        success: false,
        error: `Cannot file a dispute for a booking in "${booking.status}" status.`,
      };
    }

    // ── 5. Check for existing open dispute ──
    const { data: existingDispute } = await admin
      .from("booking_disputes")
      .select("id, status")
      .eq("booking_id", bookingId)
      .in("status", ["open", "investigating"])
      .maybeSingle();

    if (existingDispute) {
      return {
        success: false,
        error: "There is already an active dispute for this booking.",
      };
    }

    // ── 6. Upload evidence files ──
    const evidenceUrls: string[] = [];
    const evidenceFiles: File[] = [];

    // FormData may contain files keyed as "evidence_0", "evidence_1", etc.
    for (let i = 0; i < MAX_EVIDENCE_FILES; i++) {
      const file = formData.get(`evidence_${i}`) as File | null;
      if (!file || !(file instanceof File) || file.size === 0) continue;
      evidenceFiles.push(file);
    }

    if (evidenceFiles.length > MAX_EVIDENCE_FILES) {
      return {
        success: false,
        error: `You can upload a maximum of ${MAX_EVIDENCE_FILES} evidence photos.`,
      };
    }

    for (const file of evidenceFiles) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return {
          success: false,
          error: `File "${file.name}" has an unsupported format. Only JPEG, PNG, and WebP are allowed.`,
        };
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          success: false,
          error: `File "${file.name}" exceeds the 5 MB size limit.`,
        };
      }
    }

    // Upload each file to Supabase storage
    for (const file of evidenceFiles) {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `dispute-evidence/${user.id}/${bookingId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await admin.storage
        .from("provider-documents")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[Dispute] Evidence upload failed:", uploadError);
        return {
          success: false,
          error: `Failed to upload evidence file "${file.name}". Please try again.`,
        };
      }

      const {
        data: { publicUrl },
      } = admin.storage
        .from("provider-documents")
        .getPublicUrl(uploadData.path);

      evidenceUrls.push(publicUrl);
    }

    // ── 7. Set audit context ──
    await setAuditContext(admin, user.id, "customer");

    // ── 8. Insert dispute row ──
    const { data: dispute, error: disputeError } = await admin
      .from("booking_disputes")
      .insert({
        booking_id: bookingId,
        reported_by: user.id,
        reported_by_role: "customer",
        dispute_type: disputeType,
        description,
        desired_resolution: desiredResolution,
        evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : null,
        // severity is auto-assigned by the DB trigger
      })
      .select("id")
      .single();

    if (disputeError) {
      console.error("[Dispute] Insert failed:", disputeError);
      return {
        success: false,
        error: "Failed to file dispute. Please try again.",
      };
    }

    // ── 9. Transition booking to "disputed" ──
    const { error: statusError } = await admin
      .from("bookings")
      .update({ status: "disputed" })
      .eq("id", bookingId);

    if (statusError) {
      console.error("[Dispute] Booking status update failed:", statusError);
      // Dispute row was created — still return success but log the issue.
      // The booking status can be reconciled by admin.
    }

    // ── 10. Notify provider ──
    if (booking.provider_id) {
      const { data: provider } = await admin
        .from("service_providers")
        .select("user_id, business_name")
        .eq("id", booking.provider_id)
        .single();

      const { data: service } = await admin
        .from("services")
        .select("name")
        .eq("id", booking.service_id)
        .single();

      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (provider?.user_id) {
        notifyProviderDisputeFiled({
          providerUserId: provider.user_id,
          providerId: booking.provider_id,
          bookingId,
          customerName: profile?.full_name ?? "A customer",
          serviceName: service?.name ?? "your service",
          disputeType: disputeType as DisputeType,
        }).catch((err) =>
          console.error("[Dispute] Provider notification failed:", err)
        );
      }
    }

    // ── 11. Revalidate caches ──
    revalidateDisputeCaches(bookingId);

    return { success: true, disputeId: dispute.id };
  } catch (err) {
    console.error("[Dispute] fileDispute unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// GET DISPUTE FOR BOOKING
// =============================================================================

/**
 * Fetch the most recent dispute for a given booking.
 * Returns null if no dispute exists.
 * Only the booking's customer or provider can view it.
 */
export async function getDisputeForBooking(
  bookingId: string
): Promise<{ dispute: BookingDispute | null; error?: string }> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { dispute: null, error: "Please sign in." };
    }

    const admin = createAdminClient();

    // Verify caller is the customer or provider for this booking
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, customer_id, provider_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { dispute: null, error: "Booking not found." };
    }

    // Check if the provider_id resolves to this user
    let isProvider = false;
    if (booking.provider_id) {
      const { data: provider } = await admin
        .from("service_providers")
        .select("user_id")
        .eq("id", booking.provider_id)
        .single();
      isProvider = provider?.user_id === user.id;
    }

    const isCustomer = booking.customer_id === user.id;

    if (!isCustomer && !isProvider) {
      return { dispute: null, error: "You do not have access to this booking." };
    }

    // Fetch the latest dispute
    const { data: dispute, error: disputeError } = await admin
      .from("booking_disputes")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (disputeError) {
      console.error("[Dispute] getDisputeForBooking error:", disputeError);
      return { dispute: null, error: "Failed to load dispute." };
    }

    return { dispute: dispute as BookingDispute | null };
  } catch (err) {
    console.error("[Dispute] getDisputeForBooking unexpected error:", err);
    return { dispute: null, error: "An unexpected error occurred." };
  }
}
