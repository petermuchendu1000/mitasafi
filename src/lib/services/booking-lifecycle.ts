"use server";

// =============================================================================
// MITASAFI: BOOKING LIFECYCLE ACTIONS (M5)
// =============================================================================
// Server actions for the full booking lifecycle:
//   confirmed → scheduled → in_progress → completed → customer_confirmed
//
// Every action:
//   1. Authenticates the caller
//   2. Verifies ownership (provider or customer)
//   3. Validates current status allows the transition
//   4. Sets audit context for the auto-log trigger
//   5. Updates the booking
//   6. Fires relevant notifications
//   7. Revalidates affected caches
//
// The DB trigger `validate_booking_status_transition` independently enforces
// the transition map — these TS-side checks are a guard rail, not the source
// of truth.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import {
  notifyCustomerJobScheduled,
  notifyCustomerJobStarted,
  notifyCustomerJobCompleted,
  notifyProviderCompletionConfirmed,
  notifyCustomerBookingCancelled,
  notifyProviderBookingCancelled,
  notifyCustomerReviewPrompt,
} from "@/lib/notifications/triggers";
import { revalidatePath } from "next/cache";
import type { BookingStatus } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

export interface LifecycleActionResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// AUDIT CONTEXT HELPER
// =============================================================================

/**
 * Set session variables for the auto-log trigger.
 * The trigger reads `app.current_user_id` and `app.current_user_role`
 * to record who made the status change in `booking_status_history`.
 */
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
// OWNERSHIP VERIFICATION
// =============================================================================

interface ProviderVerification {
  valid: true;
  userId: string;
  providerId: string;
  booking: {
    id: string;
    customer_id: string;
    provider_id: string | null;
    status: BookingStatus | null;
    service_id: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    agreed_price: number | null;
    quoted_price: number | null;
  };
  providerName: string;
}

interface VerificationError {
  valid: false;
  error: string;
}

async function verifyProviderOwnership(
  bookingId: string
): Promise<ProviderVerification | VerificationError> {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    return { valid: false, error: "Please sign in." };
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    return { valid: false, error: "Provider profile not found." };
  }

  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select(
      "id, customer_id, provider_id, status, service_id, scheduled_start, scheduled_end, agreed_price, quoted_price"
    )
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return { valid: false, error: "Booking not found." };
  }

  if (booking.provider_id !== providerId) {
    return { valid: false, error: "This booking is not assigned to you." };
  }

  const { data: providerData } = await admin
    .from("service_providers")
    .select("business_name")
    .eq("id", providerId)
    .single();

  return {
    valid: true,
    userId: user.id,
    providerId,
    booking,
    providerName: providerData?.business_name ?? "Your provider",
  };
}

interface CustomerVerification {
  valid: true;
  userId: string;
  booking: {
    id: string;
    customer_id: string;
    provider_id: string | null;
    status: BookingStatus | null;
    service_id: string;
    agreed_price: number | null;
  };
  customerName: string;
}

async function verifyCustomerOwnership(
  bookingId: string
): Promise<CustomerVerification | VerificationError> {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    return { valid: false, error: "Please sign in." };
  }

  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, customer_id, provider_id, status, service_id, agreed_price")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return { valid: false, error: "Booking not found." };
  }

  if (booking.customer_id !== user.id) {
    return { valid: false, error: "This booking does not belong to you." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return {
    valid: true,
    userId: user.id,
    booking,
    customerName: profile?.full_name ?? "Customer",
  };
}

// =============================================================================
// HELPER: Get service name for notifications
// =============================================================================

async function getServiceName(serviceId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .single();
  return data?.name ?? "your service";
}

// =============================================================================
// HELPER: Revalidate all booking-related caches
// =============================================================================

function revalidateBookingCaches(bookingId: string): void {
  revalidatePath("/dashboard/provider/jobs");
  revalidatePath(`/dashboard/provider/jobs/${bookingId}`);
  revalidatePath("/dashboard/provider/calendar");
  revalidatePath("/dashboard/provider");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
}

// =============================================================================
// SCHEDULE JOB
// Provider: confirmed → scheduled (or confirmed → in_progress for immediate)
// =============================================================================

/**
 * Provider schedules a confirmed booking for a specific date/time.
 * Updates scheduled_start and scheduled_end on the booking.
 */
export async function scheduleJob(
  bookingId: string,
  scheduledStart: string,
  scheduledEnd?: string
): Promise<LifecycleActionResult> {
  try {
    // Validate inputs
    const startDate = new Date(scheduledStart);
    if (isNaN(startDate.getTime())) {
      return { success: false, error: "Invalid start date." };
    }
    if (startDate <= new Date()) {
      return { success: false, error: "Scheduled time must be in the future." };
    }
    if (scheduledEnd) {
      const endDate = new Date(scheduledEnd);
      if (isNaN(endDate.getTime()) || endDate <= startDate) {
        return { success: false, error: "End time must be after start time." };
      }
    }

    const verification = await verifyProviderOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking, providerName } = verification;

    // Allowed from: confirmed, requires_followup, rework_required, customer_no_show
    const allowedStatuses: BookingStatus[] = [
      "confirmed",
      "requires_followup",
      "rework_required",
      "customer_no_show",
    ];
    if (!booking.status || !allowedStatuses.includes(booking.status as BookingStatus)) {
      return {
        success: false,
        error: `Cannot schedule a booking in "${booking.status}" status.`,
      };
    }

    const admin = createAdminClient();

    // ── Capacity enforcement via booking commitments ──
    // Commitment window: scheduled_start → scheduled_end (default +2h if no end)
    const commitFrom = scheduledStart;
    const commitTo =
      scheduledEnd ??
      new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();

    // For reschedules, release any existing active commitment first
    const { data: existingCommitment } = await admin
      .from("booking_commitments")
      .select("id, status")
      .eq("booking_id", bookingId)
      .eq("status", "active")
      .maybeSingle();

    if (existingCommitment) {
      const { error: releaseError } = await admin.rpc("release_commitment", {
        p_booking_id: bookingId,
        p_reason: "rescheduled",
      });
      if (releaseError) {
        console.error("[Lifecycle] Failed to release old commitment:", releaseError);
        // Non-fatal: proceed with scheduling even if release fails
      }
    }

    // Check provider capacity for the requested time window
    const { data: capacityRows, error: capacityError } = await admin.rpc(
      "check_capacity_availability",
      {
        p_provider_id: booking.provider_id!,
        p_service_id: booking.service_id,
        p_from: commitFrom,
        p_to: commitTo,
        p_units_needed: 1,
      }
    );

    if (capacityError) {
      console.error("[Lifecycle] Capacity check failed:", capacityError);
      // Non-fatal: allow scheduling if capacity check fails (soft enforcement)
    } else if (capacityRows?.[0] && !capacityRows[0].available) {
      return {
        success: false,
        error: `Provider is at capacity for this time slot (${capacityRows[0].current_usage}/${capacityRows[0].max_capacity} slots in use). Please choose a different time.`,
      };
    }

    // ── Update booking status to scheduled ──
    await setAuditContext(admin, userId, "provider");

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "scheduled",
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd ?? null,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Lifecycle] scheduleJob error:", updateError);
      return {
        success: false,
        error: updateError.message.includes("Invalid transition")
          ? "This booking cannot be scheduled in its current state."
          : "Failed to schedule job. Please try again.",
      };
    }

    // ── Create capacity commitment ──
    // Look up provider_services for capacity_scope
    const { data: providerService } = await admin
      .from("provider_services")
      .select("capacity_scope")
      .eq("provider_id", booking.provider_id!)
      .eq("service_id", booking.service_id)
      .eq("is_active", true)
      .maybeSingle();

    const { error: commitError } = await admin
      .from("booking_commitments")
      .insert({
        booking_id: bookingId,
        provider_id: booking.provider_id!,
        service_id: booking.service_id,
        committed_from: commitFrom,
        committed_to: commitTo,
        capacity_scope: providerService?.capacity_scope ?? "per_service",
        concurrent_units_reserved: 1,
        created_by: userId,
      });

    if (commitError) {
      // Non-fatal: scheduling succeeded, commitment is a soft enforcement layer.
      // The booking is scheduled even if commitment creation fails.
      console.error("[Lifecycle] Commitment creation failed:", commitError);
    }

    // Notify customer
    const serviceName = await getServiceName(booking.service_id);
    notifyCustomerJobScheduled({
      customerUserId: booking.customer_id,
      bookingId,
      providerName,
      serviceName,
      scheduledStart,
    }).catch((err) => console.error("[Lifecycle] Notification failed:", err));

    revalidateBookingCaches(bookingId);
    return { success: true };
  } catch (err) {
    console.error("[Lifecycle] scheduleJob unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// START JOB
// Provider: confirmed/scheduled → in_progress
// =============================================================================

/**
 * Provider marks that work on the job has begun.
 * Records actual_start timestamp.
 */
export async function startJob(
  bookingId: string
): Promise<LifecycleActionResult> {
  try {
    const verification = await verifyProviderOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking, providerName } = verification;

    const allowedStatuses: BookingStatus[] = [
      "confirmed",
      "scheduled",
      "requires_followup",
      "rework_required",
    ];
    if (!booking.status || !allowedStatuses.includes(booking.status as BookingStatus)) {
      return {
        success: false,
        error: `Cannot start a job in "${booking.status}" status.`,
      };
    }

    const admin = createAdminClient();
    await setAuditContext(admin, userId, "provider");

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "in_progress",
        actual_start: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Lifecycle] startJob error:", updateError);
      return {
        success: false,
        error: updateError.message.includes("Invalid transition")
          ? "This job cannot be started in its current state."
          : "Failed to start job. Please try again.",
      };
    }

    // Notify customer
    const serviceName = await getServiceName(booking.service_id);
    notifyCustomerJobStarted({
      customerUserId: booking.customer_id,
      bookingId,
      providerName,
      serviceName,
    }).catch((err) => console.error("[Lifecycle] Notification failed:", err));

    revalidateBookingCaches(bookingId);
    return { success: true };
  } catch (err) {
    console.error("[Lifecycle] startJob unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// COMPLETE JOB
// Provider: in_progress → completed
// =============================================================================

/**
 * Provider marks the job as completed.
 * Records completed_at and actual_end timestamps. Optionally adds provider notes.
 */
export async function completeJob(
  bookingId: string,
  providerNotes?: string
): Promise<LifecycleActionResult> {
  try {
    const verification = await verifyProviderOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking, providerName } = verification;

    const allowedStatuses: BookingStatus[] = [
      "in_progress",
      "partially_completed",
      "rework_required",
    ];
    if (!booking.status || !allowedStatuses.includes(booking.status as BookingStatus)) {
      return {
        success: false,
        error: `Cannot complete a job in "${booking.status}" status.`,
      };
    }

    const admin = createAdminClient();
    await setAuditContext(admin, userId, "provider");

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: "completed",
      completed_at: now,
      actual_end: now,
    };
    if (providerNotes?.trim()) {
      updates.provider_notes = providerNotes.trim();
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update(updates)
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Lifecycle] completeJob error:", updateError);
      return {
        success: false,
        error: updateError.message.includes("Invalid transition")
          ? "This job cannot be marked complete in its current state."
          : "Failed to complete job. Please try again.",
      };
    }

    // ── Complete the capacity commitment ──
    // Fire-and-forget: non-blocking, non-fatal if no commitment exists
    admin
      .rpc("complete_commitment", { p_booking_id: bookingId })
      .then(({ error: commitError }) => {
        if (commitError) {
          console.error("[Lifecycle] complete_commitment failed:", commitError);
        }
      });

    // Notify customer
    const serviceName = await getServiceName(booking.service_id);
    notifyCustomerJobCompleted({
      customerUserId: booking.customer_id,
      bookingId,
      providerName,
      serviceName,
    }).catch((err) => console.error("[Lifecycle] Notification failed:", err));

    revalidateBookingCaches(bookingId);
    return { success: true };
  } catch (err) {
    console.error("[Lifecycle] completeJob unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// CUSTOMER CONFIRM COMPLETION
// Customer: completed → customer_confirmed
// =============================================================================

/**
 * Customer confirms that the job was done satisfactorily.
 * This is the final happy-path state before payment processing (M6).
 */
export async function customerConfirmCompletion(
  bookingId: string
): Promise<LifecycleActionResult> {
  try {
    const verification = await verifyCustomerOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking, customerName } = verification;

    if (booking.status !== "completed") {
      return {
        success: false,
        error: "Only completed jobs can be confirmed.",
      };
    }

    const admin = createAdminClient();
    await setAuditContext(admin, userId, "customer");

    const { error: updateError } = await admin
      .from("bookings")
      .update({ status: "customer_confirmed" })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Lifecycle] customerConfirmCompletion error:", updateError);
      return {
        success: false,
        error: "Failed to confirm completion. Please try again.",
      };
    }

    // Notify provider + prompt customer to leave review
    if (booking.provider_id) {
      const { data: provider } = await admin
        .from("service_providers")
        .select("user_id, business_name")
        .eq("id", booking.provider_id)
        .single();

      if (provider?.user_id) {
        const serviceName = await getServiceName(booking.service_id);
        const providerName = provider.business_name ?? "Your provider";

        // 1. Tell provider: customer confirmed your work
        notifyProviderCompletionConfirmed({
          providerUserId: provider.user_id,
          providerId: booking.provider_id,
          bookingId,
          customerName,
          serviceName,
        }).catch((err) => console.error("[Lifecycle] Notification failed:", err));

        // 2. Prompt customer to leave a review (email + in-app)
        notifyCustomerReviewPrompt({
          customerUserId: userId,
          bookingId,
          providerName,
          serviceName,
        }).catch((err) => console.error("[Lifecycle] Review prompt failed:", err));
      }
    }

    revalidateBookingCaches(bookingId);
    return { success: true };
  } catch (err) {
    console.error("[Lifecycle] customerConfirmCompletion unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// CANCEL BOOKING — CUSTOMER
// Customer: (pre-in_progress states) → cancelled_customer
// =============================================================================

/**
 * Customer cancels a booking. Only allowed before in_progress.
 * Records the cancellation reason.
 */
export async function cancelBookingAsCustomer(
  bookingId: string,
  reason: string
): Promise<LifecycleActionResult> {
  try {
    if (!reason?.trim()) {
      return { success: false, error: "A cancellation reason is required." };
    }

    const verification = await verifyCustomerOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking } = verification;

    // Customer can cancel from these states (per DB transition map)
    const allowedStatuses: BookingStatus[] = [
      "draft",
      "submitted",
      "quote_sent",
      "quote_rejected",
      "confirmed",
      "scheduled",
      "in_progress",
      "partially_completed",
      "requires_followup",
      "customer_no_show",
      "payment_failed",
    ];
    if (!booking.status || !allowedStatuses.includes(booking.status as BookingStatus)) {
      return {
        success: false,
        error: `Cannot cancel a booking in "${booking.status}" status.`,
      };
    }

    const admin = createAdminClient();
    await setAuditContext(admin, userId, "customer");

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "cancelled_customer",
        cancellation_reason: reason.trim(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Lifecycle] cancelBookingAsCustomer error:", updateError);
      return {
        success: false,
        error: updateError.message.includes("Invalid transition")
          ? "This booking cannot be cancelled in its current state."
          : "Failed to cancel booking. Please try again.",
      };
    }

    // ── Release capacity commitment (if one exists) ──
    // Fire-and-forget: non-blocking, non-fatal
    admin
      .rpc("release_commitment", {
        p_booking_id: bookingId,
        p_reason: "cancelled_by_customer",
      })
      .then(({ error: commitError }) => {
        if (commitError && !commitError.message?.includes("No commitment found")) {
          console.error("[Lifecycle] release_commitment failed:", commitError);
        }
      });

    // Notify provider (if assigned)
    if (booking.provider_id) {
      const { data: provider } = await admin
        .from("service_providers")
        .select("user_id, business_name")
        .eq("id", booking.provider_id)
        .single();

      if (provider?.user_id) {
        notifyProviderBookingCancelled({
          providerUserId: provider.user_id,
          providerId: booking.provider_id,
          bookingId,
          customerName: verification.customerName,
          reason: reason.trim(),
        }).catch((err) => console.error("[Lifecycle] Notification failed:", err));
      }
    }

    revalidateBookingCaches(bookingId);
    return { success: true };
  } catch (err) {
    console.error("[Lifecycle] cancelBookingAsCustomer unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// CANCEL BOOKING — PROVIDER
// Provider: various states → cancelled_provider
// =============================================================================

/**
 * Provider cancels a booking with a reason.
 * Allowed from most pre-completion states (per DB transition map).
 */
export async function cancelBookingAsProvider(
  bookingId: string,
  reason: string
): Promise<LifecycleActionResult> {
  try {
    if (!reason?.trim()) {
      return { success: false, error: "A cancellation reason is required." };
    }

    const verification = await verifyProviderOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking, providerName } = verification;

    const allowedStatuses: BookingStatus[] = [
      "submitted",
      "provider_viewed",
      "quote_pending",
      "quote_rejected",
      "confirmed",
      "scheduled",
      "in_progress",
      "partially_completed",
      "requires_followup",
      "rework_required",
    ];
    if (!booking.status || !allowedStatuses.includes(booking.status as BookingStatus)) {
      return {
        success: false,
        error: `Cannot cancel a booking in "${booking.status}" status.`,
      };
    }

    const admin = createAdminClient();
    await setAuditContext(admin, userId, "provider");

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "cancelled_provider",
        cancellation_reason: reason.trim(),
        provider_responded_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Lifecycle] cancelBookingAsProvider error:", updateError);
      return {
        success: false,
        error: updateError.message.includes("Invalid transition")
          ? "This booking cannot be cancelled in its current state."
          : "Failed to cancel booking. Please try again.",
      };
    }

    // ── Release capacity commitment (if one exists) ──
    // Fire-and-forget: non-blocking, non-fatal
    admin
      .rpc("release_commitment", {
        p_booking_id: bookingId,
        p_reason: "cancelled_by_provider",
      })
      .then(({ error: commitError }) => {
        if (commitError && !commitError.message?.includes("No commitment found")) {
          console.error("[Lifecycle] release_commitment failed:", commitError);
        }
      });

    // Notify customer
    notifyCustomerBookingCancelled({
      customerUserId: booking.customer_id,
      bookingId,
      providerName,
      reason: reason.trim(),
    }).catch((err) => console.error("[Lifecycle] Notification failed:", err));

    revalidateBookingCaches(bookingId);
    return { success: true };
  } catch (err) {
    console.error("[Lifecycle] cancelBookingAsProvider unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// MARK PARTIALLY COMPLETED
// Provider: in_progress → partially_completed
// =============================================================================

/**
 * Provider marks a job as partially completed.
 * Used when only part of the work could be finished in this session.
 */
export async function markPartiallyCompleted(
  bookingId: string,
  completionPercentage: number,
  providerNotes?: string
): Promise<LifecycleActionResult> {
  try {
    if (completionPercentage < 1 || completionPercentage > 99) {
      return {
        success: false,
        error: "Completion percentage must be between 1 and 99.",
      };
    }

    const verification = await verifyProviderOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking } = verification;

    if (booking.status !== "in_progress") {
      return {
        success: false,
        error: "Only in-progress jobs can be marked as partially completed.",
      };
    }

    const admin = createAdminClient();
    await setAuditContext(admin, userId, "provider");

    const updates: Record<string, unknown> = {
      status: "partially_completed",
      completion_percentage: completionPercentage,
    };
    if (providerNotes?.trim()) {
      updates.provider_notes = providerNotes.trim();
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update(updates)
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Lifecycle] markPartiallyCompleted error:", updateError);
      return {
        success: false,
        error: "Failed to update job status. Please try again.",
      };
    }

    revalidateBookingCaches(bookingId);
    return { success: true };
  } catch (err) {
    console.error("[Lifecycle] markPartiallyCompleted unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}
