// =============================================================================
// MITASAFI: QUOTE API ROUTES — GET / POST
// =============================================================================
// GET  /api/services/jobs/[id]/quotes — List quotes for a booking
// POST /api/services/jobs/[id]/quotes — Create a new quote (provider)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotesByBookingId } from "@/lib/services/quotes";
import type { BookingQuote } from "@/types/bookings";

// =============================================================================
// GET — List quotes for a booking
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user has access to this booking (customer or provider)
    const admin = createAdminClient();
    const { data: booking } = await admin
      .from("bookings")
      .select("id, customer_id, provider_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check access: must be customer or the provider's user
    let hasAccess = booking.customer_id === user.id;

    if (!hasAccess && booking.provider_id) {
      const { data: provider } = await admin
        .from("service_providers")
        .select("user_id")
        .eq("id", booking.provider_id)
        .single();

      hasAccess = provider?.user_id === user.id;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch quotes
    const { quotes, error } = await getQuotesByBookingId(bookingId);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("[API] GET /quotes error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST — Create a new quote (provider only)
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { quotedPrice, breakdown, description, validityDays } = body;

    if (!quotedPrice || quotedPrice <= 0) {
      return NextResponse.json(
        { error: "quotedPrice is required and must be positive" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify booking exists and user is the assigned provider
    const { data: booking } = await admin
      .from("bookings")
      .select("id, provider_id, status")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check that user is the provider
    if (!booking.provider_id) {
      return NextResponse.json(
        { error: "No provider assigned to this booking" },
        { status: 400 }
      );
    }

    const { data: provider } = await admin
      .from("service_providers")
      .select("id, user_id")
      .eq("id", booking.provider_id)
      .single();

    if (!provider || provider.user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the assigned provider can create a quote" },
        { status: 403 }
      );
    }

    // Compute valid_until
    const validDays = validityDays ?? 7;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    // Insert quote
    const { data: newQuote, error: insertError } = await admin
      .from("booking_quotes")
      .insert({
        booking_id: bookingId,
        provider_id: provider.id,
        quoted_price: quotedPrice,
        currency: "KES",
        breakdown: breakdown ?? null,
        description: description ?? null,
        validity_days: validDays,
        valid_until: validUntil.toISOString(),
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[API] POST /quotes insert error:", insertError);

      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "A quote already exists for this booking. Use the revision flow instead." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { quote: newQuote as BookingQuote },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /quotes error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
