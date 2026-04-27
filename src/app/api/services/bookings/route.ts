/**
 * Booking API Routes
 *
 * POST /api/services/bookings — Create a booking (same logic as server action)
 * GET  /api/services/bookings — Get authenticated customer's bookings
 *
 * These routes exist for programmatic / mobile clients. The web app prefers
 * the server action (createBookingRequest) for form submissions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerBookings } from "@/lib/services/bookings";
import { notifyProviderNewBooking } from "@/lib/notifications/triggers";
import { bookingLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import type { BookingFlowType, BookingMetadata } from "@/types/bookings";
import type { Database, Json } from "@/types/database";

// =============================================================================
// GET /api/services/bookings — Customer's bookings list
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "10", 10),
      50
    );

    const result = await getCustomerBookings({
      customerId: user.id,
      status,
      page,
      pageSize,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookings: result.bookings,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("[API] GET /api/services/bookings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/services/bookings — Create a booking
// =============================================================================

interface CreateBookingBody {
  providerServiceId: string;
  providerId: string;
  locationId?: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  city?: string;
  accessNotes?: string;
  locationType?: "home" | "office" | "public_place" | "in_vehicle" | "other";
  saveLocation?: boolean;
  locationLabel?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  isFlexible?: boolean;
  customerNotes?: string;
  isEmergency?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting (5 bookings per 15 min per IP) ──
    const ip = getClientIp(request.headers);
    const rl = bookingLimiter.check(ip);
    if (!rl.allowed) {
      return rateLimitResponse(rl);
    }

    // ── Auth ──
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ── Parse body ──
    let body: CreateBookingBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body.providerServiceId || !body.providerId) {
      return NextResponse.json(
        { error: "providerServiceId and providerId are required" },
        { status: 400 }
      );
    }

    const hasLocation = !!body.locationId || !!body.addressLine1;
    if (!hasLocation) {
      return NextResponse.json(
        { error: "A location is required (locationId or addressLine1)" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ── Resolve provider_service ──
    const { data: ps, error: psError } = await admin
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
      .eq("id", body.providerServiceId)
      .single();

    if (psError || !ps) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    if (!ps.is_active) {
      return NextResponse.json(
        { error: "Service is currently unavailable" },
        { status: 422 }
      );
    }

    if (ps.provider_id !== body.providerId) {
      return NextResponse.json(
        { error: "Service and provider mismatch" },
        { status: 400 }
      );
    }

    // Self-booking check
    const { data: providerRecord } = await admin
      .from("service_providers")
      .select("user_id, business_name")
      .eq("id", body.providerId)
      .single();

    if (!providerRecord) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    if (providerRecord.user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot book your own service" },
        { status: 422 }
      );
    }

    // Resolve service data
    const serviceData = Array.isArray(ps.service)
      ? ps.service[0]
      : ps.service;

    if (!serviceData) {
      return NextResponse.json(
        { error: "Service details unavailable" },
        { status: 500 }
      );
    }

    const serviceTypeData = Array.isArray(serviceData.service_type)
      ? serviceData.service_type[0]
      : serviceData.service_type;

    let bookingFlowType: BookingFlowType = "standard";
    if (body.isEmergency) {
      bookingFlowType = "emergency";
    } else if (serviceTypeData?.default_booking_flow) {
      bookingFlowType = serviceTypeData.default_booking_flow as BookingFlowType;
    }

    // ── Handle location ──
    let locationId = body.locationId ?? null;
    let locationSummary = "";

    if (!locationId && body.addressLine1) {
      const { data: newLoc, error: locErr } = await admin
        .from("locations")
        .insert({
          user_id: user.id,
          address_line1: body.addressLine1.trim(),
          address_line2: body.addressLine2?.trim() || null,
          area: body.area?.trim() || null,
          city: body.city?.trim() || "Nairobi",
          country: "Kenya",
          access_notes: body.accessNotes?.trim() || null,
          location_type: (body.locationType || null) as Database["public"]["Enums"]["location_type"] | null,
          is_saved: body.saveLocation ?? false,
          label: body.locationLabel?.trim() || null,
        })
        .select("id, address_line1, area, city")
        .single();

      if (locErr || !newLoc) {
        return NextResponse.json(
          { error: "Failed to save location" },
          { status: 500 }
        );
      }

      locationId = newLoc.id;
      locationSummary = [newLoc.address_line1, newLoc.area, newLoc.city]
        .filter(Boolean)
        .join(", ");
    } else if (locationId) {
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

    // ── Create booking ──
    const metadata: BookingMetadata = {
      location_id: locationId ?? undefined,
      location_summary: locationSummary || undefined,
      provider_service_id: body.providerServiceId,
    };

    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .insert({
        customer_id: user.id,
        provider_id: body.providerId,
        service_id: serviceData.id,
        service_type_id: serviceData.service_type_id,
        booking_flow_type: bookingFlowType,
        status: "submitted",
        requested_at: new Date().toISOString(),
        scheduled_start: body.scheduledStart || null,
        scheduled_end: body.scheduledEnd || null,
        customer_notes: body.customerNotes?.trim() || null,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      console.error("[API] Booking insert failed:", bookingErr);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Status history
    await admin.from("booking_status_history").insert({
      booking_id: booking.id,
      from_status: null,
      to_status: "submitted",
      changed_by: user.id,
      changed_by_role: "customer",
    });

    // Notification (fire and forget)
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    notifyProviderNewBooking({
      providerUserId: providerRecord.user_id,
      providerId: body.providerId,
      bookingId: booking.id,
      customerName: profile?.full_name || "A customer",
      serviceName: serviceData.name,
    }).catch((err) => {
      console.error("[API] Notification failed:", err);
    });

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/services/bookings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
