"use server";

// =============================================================================
// MITASAFI: CUSTOMER QUOTE ACTIONS — ACCEPT / REJECT
// =============================================================================
// Server actions for the customer to respond to a provider's quote.
//
// acceptQuote:
//   booking_quotes.status → accepted, booking.status → quote_accepted
//   Sets agreed_price = quoted_price
//
// rejectQuote:
//   booking_quotes.status → rejected, booking.status → quote_rejected
//   Stores customer_response (reason) on the quote for provider feedback
//
// DB triggers (auto_log) read session variables for audit trail.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notifyProviderQuoteAccepted,
  notifyProviderQuoteRejected,
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
 * Authenticate the current user and verify they own this booking as a customer.
 */
async function verifyCustomerOwnership(bookingId: string): Promise<
  | {
      valid: true;
      userId: string;
      booking: {
        id: string;
        customer_id: string;
        provider_id: string | null;
        status: string | null;
        service_id: string;
        quoted_price: number | null;
      };
    }
  | { valid: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { valid: false, error: "Please sign in." };
  }

  const admin = createAdminClient();

  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, customer_id, provider_id, status, service_id, quoted_price")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return { valid: false, error: "Booking not found." };
  }

  if (booking.customer_id !== user.id) {
    return { valid: false, error: "This booking does not belong to you." };
  }

  return { valid: true, userId: user.id, booking };
}

/**
 * Get customer name for notifications.
 */
async function getCustomerName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string
): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  return data?.full_name ?? "Customer";
}

/**
 * Get provider user_id (for notifications) and service name.
 */
async function getProviderAndServiceInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  providerId: string | null,
  serviceId: string
): Promise<{ providerUserId: string | null; serviceName: string }> {
  if (!providerId) {
    const serviceResult = await admin.from("services").select("name").eq("id", serviceId).single();
    return { providerUserId: null, serviceName: serviceResult.data?.name ?? "your service" };
  }

  const [providerResult, serviceResult] = await Promise.all([
    admin.from("service_providers").select("user_id").eq("id", providerId).single(),
    admin.from("services").select("name").eq("id", serviceId).single(),
  ]);

  return {
    providerUserId: providerResult.data?.user_id ?? null,
    serviceName: serviceResult.data?.name ?? "your service",
  };
}

// =============================================================================
// ACCEPT QUOTE
// =============================================================================

/**
 * Customer accepts a provider's quote.
 *
 * Transitions:
 *   booking_quotes.status → accepted, set responded_at
 *   bookings.status: quote_sent → quote_accepted
 *   bookings.agreed_price = quoted_price
 *
 * Note: The booking transition to `confirmed` happens separately
 * when the provider calls confirmBookingAfterQuote.
 */
export async function acceptQuote(
  bookingId: string,
  quoteId: string
): Promise<ActionResult> {
  try {
    const verification = await verifyCustomerOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking } = verification;

    // Only allow from quote_sent status
    if (booking.status !== "quote_sent") {
      return {
        success: false,
        error: `Cannot accept a quote when booking is "${booking.status}".`,
      };
    }

    if (!booking.quoted_price) {
      return { success: false, error: "No quoted price found on this booking." };
    }

    const admin = createAdminClient();

    // Verify the quote belongs to this booking
    const { data: quote, error: quoteError } = await admin
      .from("booking_quotes")
      .select("id, booking_id, provider_id, quoted_price, status")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: "Quote not found." };
    }

    if (quote.booking_id !== bookingId) {
      return { success: false, error: "Quote does not belong to this booking." };
    }

    // Set audit context
    await setAuditContext(admin, userId, "customer");

    // ── Update quote status ──
    const { error: quoteUpdateError } = await admin
      .from("booking_quotes")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (quoteUpdateError) {
      console.error("[CustomerQuote] Accept quote update error:", quoteUpdateError);
      return { success: false, error: "Failed to accept quote. Please try again." };
    }

    // ── Update booking status ──
    const { error: bookingUpdateError } = await admin
      .from("bookings")
      .update({
        status: "quote_accepted",
        agreed_price: quote.quoted_price,
      })
      .eq("id", bookingId);

    if (bookingUpdateError) {
      console.error("[CustomerQuote] Accept booking update error:", bookingUpdateError);
      return {
        success: false,
        error: bookingUpdateError.message.includes("Invalid transition")
          ? "This booking cannot accept a quote in its current state."
          : "Failed to update booking. Please try again.",
      };
    }

    // ── Notify provider ──
    const customerName = await getCustomerName(admin, userId);
    const { providerUserId, serviceName } = await getProviderAndServiceInfo(
      admin,
      booking.provider_id,
      booking.service_id
    );

    if (providerUserId) {
      notifyProviderQuoteAccepted({
        providerUserId,
        providerId: booking.provider_id ?? "",
        bookingId,
        customerName,
        serviceName,
        agreedPrice: quote.quoted_price,
      }).catch((err) => {
        console.error("[CustomerQuote] Notification failed:", err);
      });
    }

    // ── Revalidate ──
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    revalidatePath(`/dashboard/bookings/${bookingId}/quote`);
    revalidatePath(`/dashboard/bookings`);
    revalidatePath(`/dashboard/provider/jobs/${bookingId}`);
    revalidatePath(`/dashboard/provider/jobs`);

    return { success: true };
  } catch (err) {
    console.error("[CustomerQuote] acceptQuote unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// =============================================================================
// REJECT QUOTE
// =============================================================================

/**
 * Customer declines a provider's quote.
 *
 * Transitions:
 *   booking_quotes.status → rejected, customer_response = reason
 *   bookings.status: quote_sent → quote_rejected
 *
 * The provider can then revise and resubmit.
 */
export async function rejectQuote(
  bookingId: string,
  quoteId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    const verification = await verifyCustomerOwnership(bookingId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const { userId, booking } = verification;

    // Only allow from quote_sent status
    if (booking.status !== "quote_sent") {
      return {
        success: false,
        error: `Cannot decline a quote when booking is "${booking.status}".`,
      };
    }

    const admin = createAdminClient();

    // Verify the quote belongs to this booking
    const { data: quote, error: quoteError } = await admin
      .from("booking_quotes")
      .select("id, booking_id, provider_id, status")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: "Quote not found." };
    }

    if (quote.booking_id !== bookingId) {
      return { success: false, error: "Quote does not belong to this booking." };
    }

    // Set audit context
    await setAuditContext(admin, userId, "customer");

    // ── Update quote status ──
    const { error: quoteUpdateError } = await admin
      .from("booking_quotes")
      .update({
        status: "rejected",
        customer_response: reason?.trim() || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (quoteUpdateError) {
      console.error("[CustomerQuote] Reject quote update error:", quoteUpdateError);
      return { success: false, error: "Failed to decline quote. Please try again." };
    }

    // ── Update booking status ──
    const { error: bookingUpdateError } = await admin
      .from("bookings")
      .update({
        status: "quote_rejected",
      })
      .eq("id", bookingId);

    if (bookingUpdateError) {
      console.error("[CustomerQuote] Reject booking update error:", bookingUpdateError);
      return {
        success: false,
        error: bookingUpdateError.message.includes("Invalid transition")
          ? "This booking cannot decline a quote in its current state."
          : "Failed to update booking. Please try again.",
      };
    }

    // ── Notify provider ──
    const customerName = await getCustomerName(admin, userId);
    const { providerUserId, serviceName } = await getProviderAndServiceInfo(
      admin,
      booking.provider_id,
      booking.service_id
    );

    if (providerUserId) {
      notifyProviderQuoteRejected({
        providerUserId,
        providerId: booking.provider_id ?? "",
        bookingId,
        customerName,
        serviceName,
        reason: reason?.trim(),
      }).catch((err) => {
        console.error("[CustomerQuote] Notification failed:", err);
      });
    }

    // ── Revalidate ──
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    revalidatePath(`/dashboard/bookings/${bookingId}/quote`);
    revalidatePath(`/dashboard/bookings`);
    revalidatePath(`/dashboard/provider/jobs/${bookingId}`);
    revalidatePath(`/dashboard/provider/jobs`);

    return { success: true };
  } catch (err) {
    console.error("[CustomerQuote] rejectQuote unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
