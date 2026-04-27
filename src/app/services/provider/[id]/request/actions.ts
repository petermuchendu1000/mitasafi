"use server";

// =============================================================================
// MITASAFI: BOOKING REQUEST SERVER ACTION
// =============================================================================
// Creates a new booking when a customer submits a service request.
//
// Data flow:
// 1. Authenticate caller → customer_id
// 2. Resolve provider_services → services.id + services.service_type_id
// 3. Look up service_types.default_booking_flow → booking_flow_type
// 4. Optionally create a new location row
// 5. INSERT into bookings (status = submitted)
// 6. INSERT into booking_status_history (null → submitted)
// 7. Notify the provider via notifications table
//
// Uses createAdminClient for the INSERT operations because:
// - The customer's RLS policy may not cover all joined lookups.
// - We need to write to notifications on behalf of the provider.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyProviderNewBooking } from "@/lib/notifications/triggers";
import { revalidatePath } from "next/cache";
import type { Database, Json } from "@/types/database";
import type {
  BookingFlowType,
  BookingMetadata,
  CreateBookingResult,
  LocationType,
} from "@/types/bookings";

// =============================================================================
// INPUT VALIDATION
// =============================================================================

interface CreateBookingInput {
  providerServiceId: string;
  providerId: string;
  // Location — either saved or new
  locationId?: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  city?: string;
  accessNotes?: string;
  locationType?: LocationType;
  saveLocation?: boolean;
  locationLabel?: string;
  // Scheduling
  scheduledStart?: string;
  scheduledEnd?: string;
  isFlexible?: boolean;
  // Details
  customerNotes?: string;
  // Emergency override
  isEmergency?: boolean;
}

function validateInput(
  input: CreateBookingInput
): { valid: true } | { valid: false; error: string } {
  if (!input.providerServiceId?.trim()) {
    return { valid: false, error: "Service selection is required." };
  }
  if (!input.providerId?.trim()) {
    return { valid: false, error: "Provider is required." };
  }

  // Must have either a saved locationId or a new address
  const hasLocation = !!input.locationId?.trim();
  const hasNewAddress = !!input.addressLine1?.trim();
  if (!hasLocation && !hasNewAddress) {
    return { valid: false, error: "Please provide a service location." };
  }

  // If scheduling is provided, validate
  if (input.scheduledStart) {
    const start = new Date(input.scheduledStart);
    if (isNaN(start.getTime())) {
      return { valid: false, error: "Invalid scheduled start date." };
    }
    // Must be in the future (allow 15 min buffer for clock skew)
    if (!input.isEmergency && start.getTime() < Date.now() - 15 * 60 * 1000) {
      return { valid: false, error: "Scheduled time must be in the future." };
    }
  }

  return { valid: true };
}

// =============================================================================
// MAIN ACTION
// =============================================================================

export async function createBookingRequest(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  try {
    // ── 1. Authenticate ──
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Please sign in to request a service." };
    }

    // ── 2. Validate input ──
    const validation = validateInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const admin = createAdminClient();

    // ── 3. Resolve provider_service → service + service_type ──
    const { data: providerService, error: psError } = await admin
      .from("provider_services")
      .select(
        `
        id,
        service_id,
        provider_id,
        is_active,
        service:services!service_id (
          id,
          name,
          service_type_id,
          service_type:service_types!service_type_id (
            id,
            default_booking_flow
          )
        )
      `
      )
      .eq("id", input.providerServiceId)
      .single();

    if (psError || !providerService) {
      return {
        success: false,
        error: "Service not found. It may have been removed.",
      };
    }

    if (!providerService.is_active) {
      return {
        success: false,
        error: "This service is currently unavailable.",
      };
    }

    // Verify the provider_service belongs to the specified provider
    if (providerService.provider_id !== input.providerId) {
      return { success: false, error: "Service and provider mismatch." };
    }

    // Prevent self-booking
    const { data: providerRecord } = await admin
      .from("service_providers")
      .select("user_id, business_name")
      .eq("id", input.providerId)
      .single();

    if (!providerRecord) {
      return { success: false, error: "Provider not found." };
    }

    if (providerRecord.user_id === user.id) {
      return { success: false, error: "You cannot book your own service." };
    }

    // Extract resolved foreign keys
    const serviceData = Array.isArray(providerService.service)
      ? providerService.service[0]
      : providerService.service;

    if (!serviceData) {
      return { success: false, error: "Service details could not be loaded." };
    }

    const serviceId: string = serviceData.id;
    const serviceTypeId: string = serviceData.service_type_id;
    const serviceName: string = serviceData.name;

    const serviceTypeData = Array.isArray(serviceData.service_type)
      ? serviceData.service_type[0]
      : serviceData.service_type;

    // Determine booking flow type
    let bookingFlowType: BookingFlowType = "standard";
    if (input.isEmergency) {
      bookingFlowType = "emergency";
    } else if (serviceTypeData?.default_booking_flow) {
      bookingFlowType = serviceTypeData.default_booking_flow as BookingFlowType;
    }

    // ── 4. Handle location ──
    let locationId = input.locationId ?? null;
    let locationSummary = "";

    if (!locationId && input.addressLine1) {
      // Create new location
      const { data: newLocation, error: locError } = await admin
        .from("locations")
        .insert({
          user_id: user.id,
          address_line1: input.addressLine1.trim(),
          address_line2: input.addressLine2?.trim() || null,
          area: input.area?.trim() || null,
          city: input.city?.trim() || "Nairobi",
          country: "Kenya",
          access_notes: input.accessNotes?.trim() || null,
          location_type: (input.locationType || null) as Database["public"]["Enums"]["location_type"] | null,
          is_saved: input.saveLocation ?? false,
          label: input.locationLabel?.trim() || null,
        })
        .select("id, address_line1, area, city")
        .single();

      if (locError || !newLocation) {
        console.error("[Booking] Location insert failed:", locError);
        return {
          success: false,
          error: "Failed to save location. Please try again.",
        };
      }

      locationId = newLocation.id;
      locationSummary = [newLocation.address_line1, newLocation.area, newLocation.city]
        .filter(Boolean)
        .join(", ");
    } else if (locationId) {
      // Fetch summary for saved location
      const { data: savedLoc } = await admin
        .from("locations")
        .select("address_line1, area, city")
        .eq("id", locationId)
        .single();

      if (savedLoc) {
        locationSummary = [savedLoc.address_line1, savedLoc.area, savedLoc.city]
          .filter(Boolean)
          .join(", ");
      }
    }

    // ── 5. Create booking ──
    const metadata: BookingMetadata = {
      location_id: locationId ?? undefined,
      location_summary: locationSummary || undefined,
      provider_service_id: input.providerServiceId,
      is_flexible: input.isFlexible ?? false,
    };

    // Server-side notes length enforcement
    const customerNotes = input.customerNotes?.trim().slice(0, 500) || null;

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        customer_id: user.id,
        provider_id: input.providerId,
        service_id: serviceId,
        service_type_id: serviceTypeId,
        booking_flow_type: bookingFlowType,
        status: "submitted",
        requested_at: new Date().toISOString(),
        scheduled_start: input.scheduledStart || null,
        scheduled_end: input.scheduledEnd || null,
        customer_notes: customerNotes,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("[Booking] Insert failed:", bookingError);
      return {
        success: false,
        error: "Failed to create booking. Please try again.",
      };
    }

    const bookingId: string = booking.id;

    // ── 6. Create status history entry ──
    const { error: historyError } = await admin
      .from("booking_status_history")
      .insert({
        booking_id: bookingId,
        from_status: null,
        to_status: "submitted",
        changed_by: user.id,
        changed_by_role: "customer",
        notes: input.isEmergency ? "Emergency booking request" : null,
      });

    if (historyError) {
      // Non-blocking — booking was created successfully
      console.error("[Booking] Status history insert failed:", historyError);
    }

    // ── 7. Notify provider ──
    // Get customer name for the notification
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const customerName = profile?.full_name || "A customer";

    // Fire-and-forget — don't block the response
    notifyProviderNewBooking({
      providerUserId: providerRecord.user_id,
      providerId: input.providerId,
      bookingId,
      customerName,
      serviceName,
    }).catch((err) => {
      console.error("[Booking] Notification failed:", err);
    });

    // ── 8. Revalidate caches ──
    revalidatePath("/dashboard/bookings");
    revalidatePath(`/dashboard/provider/jobs`);

    return { success: true, bookingId };
  } catch (err) {
    console.error("[Booking] createBookingRequest unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
