"use server";

// =============================================================================
// MITASAFI: SUBMIT / REVISE QUOTE — SERVER ACTION
// =============================================================================
// Core M3 action: provider sends a new quote or revises a rejected one.
//
// Flow (new quote):
//   submitted/provider_viewed → quote_pending → quote_sent
//   + INSERT into booking_quotes
//
// Flow (revision):
//   quote_rejected → quote_pending → quote_sent
//   + UPDATE existing booking_quotes row (revision_count++)
//
// DB constraints respected:
//   - validate_booking_status_transition: enforces legal transitions
//   - validate_booking_state_fields: quote_sent requires pricing_snapshot
//   - pricing_snapshot_required_after_confirmation: CHECK constraint
//   - enforce_pricing_snapshot_immutability: once set, cannot change
//   - auto_log_booking_status_change: reads session variables for audit
//   - UNIQUE(booking_id, provider_id) on booking_quotes
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import { notifyCustomerQuoteSent } from "@/lib/notifications/triggers";
import { revalidatePath } from "next/cache";
import type { QuoteFormData, QuoteActionResult } from "@/types/bookings";
import type { Json } from "@/types/database";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Set session variables for the auto-log trigger.
 */
async function setAuditContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  role: "provider" | "customer" | "admin"
): Promise<void> {
  await admin
    .rpc("set_config", { setting: "app.current_user_id", value: userId })
    .catch(() => {});
  await admin
    .rpc("set_config", { setting: "app.current_user_role", value: role })
    .catch(() => {});
}

/**
 * Build the pricing_snapshot JSONB for the bookings table.
 * This is the immutable legal evidence of what was quoted.
 */
function buildPricingSnapshot(formData: QuoteFormData): Record<string, unknown> {
  return {
    quoted_price: formData.quotedPrice,
    currency: "KES",
    breakdown: formData.breakdown,
    description: formData.description || null,
    validity_days: formData.validityDays,
    captured_at: new Date().toISOString(),
  };
}

// =============================================================================
// STATUSES THAT ALLOW QUOTING
// =============================================================================

const QUOTABLE_STATUSES = [
  "submitted",
  "provider_viewed",
  "quote_pending",
  "quote_rejected",
] as const;

// =============================================================================
// SUBMIT QUOTE
// =============================================================================

/**
 * Provider submits a new quote or revises a rejected one.
 *
 * Two-step transition for DB trigger compliance:
 *   1. current → quote_pending (set quoted_price, pricing_snapshot)
 *   2. quote_pending → quote_sent
 *
 * For revisions from quote_rejected:
 *   pricing_snapshot is already set from the first quote (immutable),
 *   so we only update quoted_price on the bookings row and
 *   UPDATE the existing booking_quotes row.
 */
export async function submitQuote(
  bookingId: string,
  formData: QuoteFormData
): Promise<QuoteActionResult> {
  try {
    // ── Auth ──
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Please sign in." };
    }

    const { providerId, error: providerError } = await getCachedProviderId();
    if (providerError || !providerId) {
      return { success: false, error: "Provider profile not found." };
    }

    const admin = createAdminClient();

    // ── Fetch booking ──
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, customer_id, provider_id, status, service_id, pricing_snapshot, quoted_price")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: "Booking not found." };
    }

    if (booking.provider_id !== providerId) {
      return { success: false, error: "This booking is not assigned to you." };
    }

    if (!booking.status || !QUOTABLE_STATUSES.includes(booking.status as typeof QUOTABLE_STATUSES[number])) {
      return {
        success: false,
        error: `Cannot send a quote when booking is "${booking.status}".`,
      };
    }

    // ── Validate form data ──
    if (formData.quotedPrice <= 0) {
      return { success: false, error: "Quoted price must be greater than zero." };
    }
    if (formData.validityDays < 1 || formData.validityDays > 90) {
      return { success: false, error: "Validity must be between 1 and 90 days." };
    }

    // ── Determine if this is a revision ──
    const isRevision = booking.status === "quote_rejected";
    const pricingSnapshotAlreadySet = booking.pricing_snapshot !== null;

    // ── Set audit context ──
    await setAuditContext(admin, user.id, "provider");

    // ── Compute valid_until ──
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + formData.validityDays);
    const validUntilIso = validUntil.toISOString();

    // ════════════════════════════════════════════════════════════════════════
    // STEP 1: Transition to quote_pending
    //
    // For new quotes (from submitted/provider_viewed):
    //   - Set pricing_snapshot (first time) + quoted_price
    // For revisions (from quote_rejected):
    //   - pricing_snapshot is already set (immutable), only update quoted_price
    // For quote_pending (already there, e.g., retrying):
    //   - Just update quoted_price
    // ════════════════════════════════════════════════════════════════════════

    if (booking.status !== "quote_pending") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transitionUpdate: Record<string, any> = {
        status: "quote_pending",
        quoted_price: formData.quotedPrice,
      };

      // Only set pricing_snapshot if not already set (it's immutable)
      if (!pricingSnapshotAlreadySet) {
        transitionUpdate.pricing_snapshot = buildPricingSnapshot(formData);
      }

      const { error: step1Error } = await admin
        .from("bookings")
        .update(transitionUpdate)
        .eq("id", bookingId);

      if (step1Error) {
        console.error("[Quote] Step 1 (→ quote_pending) error:", step1Error);
        return {
          success: false,
          error: step1Error.message.includes("Invalid transition")
            ? "This booking cannot accept a quote in its current state."
            : "Failed to prepare quote. Please try again.",
        };
      }
    } else {
      // Already in quote_pending — just update the price
      const { error: priceError } = await admin
        .from("bookings")
        .update({ quoted_price: formData.quotedPrice })
        .eq("id", bookingId);

      if (priceError) {
        console.error("[Quote] Update price error:", priceError);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 2: Upsert the booking_quotes row
    //
    // UNIQUE(booking_id, provider_id) means we INSERT for new,
    // UPDATE for revisions.
    // ════════════════════════════════════════════════════════════════════════

    let quoteId: string | undefined;

    if (isRevision) {
      // ── Revision: UPDATE existing quote row ──
      const { data: existingQuote } = await admin
        .from("booking_quotes")
        .select("id, revision_count")
        .eq("booking_id", bookingId)
        .eq("provider_id", providerId)
        .is("superseded_at", null)
        .single();

      if (existingQuote) {
        const newRevisionCount = (existingQuote.revision_count ?? 0) + 1;

        const { error: updateError } = await admin
          .from("booking_quotes")
          .update({
            quoted_price: formData.quotedPrice,
            breakdown: (formData.breakdown.length > 0 ? formData.breakdown : null) as unknown as Json,
            description: formData.description || null,
            validity_days: formData.validityDays,
            valid_until: validUntilIso,
            status: "sent",
            customer_response: null, // Clear previous rejection feedback
            revision_count: newRevisionCount,
            sent_at: new Date().toISOString(),
            viewed_at: null,
            responded_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingQuote.id);

        if (updateError) {
          console.error("[Quote] Revision UPDATE error:", updateError);
          return { success: false, error: "Failed to update quote. Please try again." };
        }

        quoteId = existingQuote.id;
      } else {
        // Edge case: no existing quote found despite quote_rejected status
        // Fall through to INSERT below
      }
    }

    if (!quoteId) {
      // ── New quote: INSERT ──
      const { data: newQuote, error: insertError } = await admin
        .from("booking_quotes")
        .insert({
          booking_id: bookingId,
          provider_id: providerId,
          quoted_price: formData.quotedPrice,
          currency: "KES",
          breakdown: (formData.breakdown.length > 0 ? formData.breakdown : null) as unknown as Json,
          description: formData.description || null,
          validity_days: formData.validityDays,
          valid_until: validUntilIso,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[Quote] INSERT error:", insertError);

        // Handle duplicate key (UNIQUE constraint violation)
        if (insertError.message.includes("duplicate key") || insertError.code === "23505") {
          return {
            success: false,
            error: "A quote already exists for this booking. Try revising instead.",
          };
        }

        return { success: false, error: "Failed to create quote. Please try again." };
      }

      quoteId = newQuote?.id;
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 3: Transition to quote_sent
    // ════════════════════════════════════════════════════════════════════════

    const { error: step3Error } = await admin
      .from("bookings")
      .update({
        status: "quote_sent",
        provider_responded_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (step3Error) {
      console.error("[Quote] Step 3 (→ quote_sent) error:", step3Error);
      return {
        success: false,
        error: "Quote saved but failed to send. Please try again.",
      };
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 4: Notify customer + revalidate
    // ════════════════════════════════════════════════════════════════════════

    // Get service + provider name for notification
    const [serviceResult, providerResult] = await Promise.all([
      admin.from("services").select("name").eq("id", booking.service_id).single(),
      admin.from("service_providers").select("business_name").eq("id", providerId).single(),
    ]);

    const serviceName = serviceResult.data?.name ?? "your service";
    const providerName = providerResult.data?.business_name ?? "Your provider";

    notifyCustomerQuoteSent({
      customerUserId: booking.customer_id,
      bookingId,
      providerName,
      serviceName,
      quotedPrice: formData.quotedPrice,
      isRevision,
    }).catch((err) => {
      console.error("[Quote] Notification failed:", err);
    });

    // Revalidate affected pages
    revalidatePath(`/dashboard/provider/jobs`);
    revalidatePath(`/dashboard/provider/jobs/${bookingId}`);
    revalidatePath(`/dashboard/provider/jobs/${bookingId}/quote`);
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    revalidatePath(`/dashboard/bookings`);

    return { success: true, quoteId };
  } catch (err) {
    console.error("[Quote] submitQuote unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
