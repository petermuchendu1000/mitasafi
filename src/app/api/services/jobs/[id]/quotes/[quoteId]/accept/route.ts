// =============================================================================
// MITASAFI: QUOTE ACCEPT API ROUTE
// =============================================================================
// POST /api/services/jobs/[id]/quotes/[quoteId]/accept
// Customer accepts a provider's quote via API (alternative to server action).
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const { id: bookingId, quoteId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch booking and verify customer ownership
    const { data: booking } = await admin
      .from("bookings")
      .select("id, customer_id, provider_id, status, quoted_price")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.status !== "quote_sent") {
      return NextResponse.json(
        { error: `Cannot accept quote when booking status is "${booking.status}"` },
        { status: 409 }
      );
    }

    // Fetch and verify the quote
    const { data: quote } = await admin
      .from("booking_quotes")
      .select("id, booking_id, quoted_price, status")
      .eq("id", quoteId)
      .single();

    if (!quote || quote.booking_id !== bookingId) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Update quote status
    const { error: quoteError } = await admin
      .from("booking_quotes")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (quoteError) {
      console.error("[API] Accept quote error:", quoteError);
      return NextResponse.json({ error: quoteError.message }, { status: 500 });
    }

    // Update booking status
    const { error: bookingError } = await admin
      .from("bookings")
      .update({
        status: "quote_accepted",
        agreed_price: quote.quoted_price,
      })
      .eq("id", bookingId);

    if (bookingError) {
      console.error("[API] Accept booking error:", bookingError);
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] POST /accept error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
