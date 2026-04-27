"use server";

// =============================================================================
// MITASAFI: PROVIDER JOB ACTIONS
// =============================================================================
// Server actions for provider booking management:
// - acceptBooking: Direct accept (for fixed-price services)
// - rejectBooking: Decline with reason
// - confirmBookingAfterQuote: Confirm booking after quote is accepted
//
// Uses createAdminClient for writes and session variables for audit trail.
// The DB triggers enforce valid transitions and auto-log history.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import {
  notifyCustomerBookingConfirmed,
  notifyCustomerBookingCancelled,
} from "@/lib/notifications/triggers";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================

interface ActionResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Set session variables for the auto-log trigger.
 * The trigger reads these to record who made the status change.
 */
async function setAuditContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  role: "provider" | "customer" | "admin"
): Promise<void> {
  await admin.rpc("set_config", {
    setting: "app.current_user_id",
    value: userId,
  }).catch(() => {
    // Fallback: try raw SQL if rpc doesn't exist
    // The trigger will use defaults if this fails
  });
  await admin.rpc("set_config", {
    setting: "app.current_user_role",
    value: role,
  }).catch(() => {
    // Same fallback
  });
}

/**
 * Verify the caller is the provider assigned to this booking.
 * Returns provider user_id, business_name, and the booking data.
 */
async function verifyProviderOwnership(
  bookingId: string
): Promise<{
  valid: true;
  userId: string;
  providerId: string;
  booking: {
    id: string;
    customer_id: string;
    provider_id: string | null;
    status: string | null;
    quoted_price: number | null;
    agreed_price: number | null;
    service_id: string;
  };
  providerName: string;
} | {
  valid: false;
  error: string;
}> {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    return { valid: false, error: "Please sign in." };
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    return { valid: false, error: "Provider profile not found." };
  }

  const admin = createAdminClient();

  // Fetch booking
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, customer_id, provider_id, status, quoted_price, agreed_price, service_id")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return { valid: false, error: "Booking not found." };
  }

  if (booking.provider_id !== providerId) {
    return { valid: false, error: "This booking is not assigned to you." };
  }

  // Get provider name for notifications
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

/**
 * Get service name for notifications.
 */
async function getServiceName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  serviceId: string
): Promise<string> {
  const { data } = await admin
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .single();

  return data?.name ?? "your service";
}

// =============================================================================
// ACCEPT BOOKING (direct accept for fixed-price services)
// =============================================================================

/**
 * Provider directly accepts a booking without quoting.
 * Valid from: submitted, provider_viewed → confirmed
 */
export async function acceptBooking(bookingId: string): Promise<ActionResult> {
  try {
    const verification = await verifyProviderOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, providerId, booking, providerName } = verification;
    const admin = createAdminClient();

    // Validate current status allows direct acceptance
    const allowedStatuses = ["submitted", "provider_viewed"];
    if (!booking.status || !allowedStatuses.includes(booking.status)) {
      return {
        success: false,
        error: `Cannot accept a booking in "${booking.status}" status.`,
      };
    }

    // Set audit context for auto-log trigger
    await setAuditContext(admin, userId, "provider");

    // Resolve agreed_price from provider_services custom_pricing
    // For fixed-price services, the price is set at acceptance time
    let agreedPrice: number | null = null;
    const { data: providerService } = await admin
      .from("provider_services")
      .select("custom_pricing")
      .eq("provider_id", providerId)
      .eq("service_id", booking.service_id)
      .eq("is_active", true)
      .maybeSingle();

    if (providerService?.custom_pricing) {
      const pricing = providerService.custom_pricing as Record<string, unknown>;
      const amount = pricing?.amount as number | undefined;
      if (typeof amount === "number" && amount > 0) {
        agreedPrice = amount;
      }
    }

    // Update booking status to confirmed (with agreed_price if available)
    const updatePayload: Record<string, unknown> = {
      status: "confirmed",
      provider_responded_at: new Date().toISOString(),
    };
    if (agreedPrice !== null) {
      updatePayload.agreed_price = agreedPrice;
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Jobs] acceptBooking update error:", updateError);
      return {
        success: false,
        error: updateError.message.includes("Invalid transition")
          ? "This booking cannot be accepted in its current state."
          : "Failed to accept booking. Please try again.",
      };
    }

    // Notify customer
    const serviceName = await getServiceName(admin, booking.service_id);
    notifyCustomerBookingConfirmed({
      customerUserId: booking.customer_id,
      bookingId,
      providerName,
      serviceName,
    }).catch((err) => {
      console.error("[Jobs] Notification failed:", err);
    });

    // Revalidate caches
    revalidatePath(`/dashboard/provider/jobs`);
    revalidatePath(`/dashboard/provider/jobs/${bookingId}`);
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    revalidatePath(`/dashboard/bookings`);

    return { success: true };
  } catch (err) {
    console.error("[Jobs] acceptBooking unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// =============================================================================
// REJECT BOOKING
// =============================================================================

/**
 * Provider declines a booking with a reason.
 * Valid from: submitted, provider_viewed, quote_pending, quote_rejected → cancelled_provider
 */
export async function rejectBooking(
  bookingId: string,
  reason: string
): Promise<ActionResult> {
  try {
    if (!reason?.trim()) {
      return { success: false, error: "A reason is required to decline." };
    }

    const verification = await verifyProviderOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking, providerName } = verification;
    const admin = createAdminClient();

    // Validate current status allows rejection
    const allowedStatuses = [
      "submitted",
      "provider_viewed",
      "quote_pending",
      "quote_rejected",
    ];
    if (!booking.status || !allowedStatuses.includes(booking.status)) {
      return {
        success: false,
        error: `Cannot decline a booking in "${booking.status}" status.`,
      };
    }

    // Set audit context
    await setAuditContext(admin, userId, "provider");

    // Update booking
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "cancelled_provider",
        cancellation_reason: reason.trim(),
        provider_responded_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Jobs] rejectBooking update error:", updateError);
      return {
        success: false,
        error: updateError.message.includes("Invalid transition")
          ? "This booking cannot be declined in its current state."
          : "Failed to decline booking. Please try again.",
      };
    }

    // Notify customer
    notifyCustomerBookingCancelled({
      customerUserId: booking.customer_id,
      bookingId,
      providerName,
      reason: reason.trim(),
    }).catch((err) => {
      console.error("[Jobs] Notification failed:", err);
    });

    // Revalidate caches
    revalidatePath(`/dashboard/provider/jobs`);
    revalidatePath(`/dashboard/provider/jobs/${bookingId}`);
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    revalidatePath(`/dashboard/bookings`);

    return { success: true };
  } catch (err) {
    console.error("[Jobs] rejectBooking unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// =============================================================================
// CONFIRM BOOKING AFTER QUOTE ACCEPTANCE
// =============================================================================

/**
 * Provider confirms the booking after the customer accepted the quote.
 * Transitions: quote_accepted → confirmed
 * Sets agreed_price from the accepted quote.
 */
export async function confirmBookingAfterQuote(
  bookingId: string
): Promise<ActionResult> {
  try {
    const verification = await verifyProviderOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking, providerName } = verification;
    const admin = createAdminClient();

    if (booking.status !== "quote_accepted") {
      return {
        success: false,
        error: "Booking must have an accepted quote to confirm.",
      };
    }

    if (!booking.quoted_price) {
      return {
        success: false,
        error: "No quoted price found. Cannot confirm without a price.",
      };
    }

    // Set audit context
    await setAuditContext(admin, userId, "provider");

    // Confirm the booking with the quoted price as agreed price
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "confirmed",
        agreed_price: booking.quoted_price,
        provider_responded_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Jobs] confirmBookingAfterQuote error:", updateError);
      return {
        success: false,
        error: "Failed to confirm booking. Please try again.",
      };
    }

    // Notify customer
    const serviceName = await getServiceName(admin, booking.service_id);
    notifyCustomerBookingConfirmed({
      customerUserId: booking.customer_id,
      bookingId,
      providerName,
      serviceName,
    }).catch((err) => {
      console.error("[Jobs] Notification failed:", err);
    });

    // Revalidate caches
    revalidatePath(`/dashboard/provider/jobs`);
    revalidatePath(`/dashboard/provider/jobs/${bookingId}`);
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    revalidatePath(`/dashboard/bookings`);

    return { success: true };
  } catch (err) {
    console.error("[Jobs] confirmBookingAfterQuote unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
