/**
 * Listing Inquiry API Route
 * 
 * POST /api/listings/inquire
 * 
 * Handles tenant inquiries about listings.
 * Stores inquiry in database and notifies landlord.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface InquiryRequestBody {
  listing_id: string;
  message: string;
  share_phone: boolean;
  request_viewing: boolean;
  preferred_time: string | null;
  preferred_day: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to send an inquiry" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: InquiryRequestBody = await request.json();
    
    // Validate required fields
    if (!body.listing_id) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    if (!body.message || body.message.trim().length < 10) {
      return NextResponse.json(
        { error: "Please enter a message (at least 10 characters)" },
        { status: 400 }
      );
    }

    // Fetch listing to get landlord_id and verify it exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listingData, error: listingError } = await (supabase as any)
      .from("listings")
      .select("id, landlord_id, title, status, inquiries_count")
      .eq("id", body.listing_id)
      .single();

    interface ListingQueryResult {
      id: string;
      landlord_id: string;
      title: string;
      status: string;
      inquiries_count: number;
    }

    const listing = listingData as ListingQueryResult | null;

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "This listing is no longer accepting inquiries" },
        { status: 400 }
      );
    }

    // Prevent landlord from inquiring on their own listing
    if (listing.landlord_id === user.id) {
      return NextResponse.json(
        { error: "You cannot inquire on your own listing" },
        { status: 400 }
      );
    }

    // Get tenant's phone if sharing
    let tenantPhone: string | null = null;
    if (body.share_phone) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileData } = await (supabase as any)
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .single();
      
      tenantPhone = (profileData as { phone: string | null } | null)?.phone || null;
    }

    // Check for existing recent inquiry (prevent spam)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingInquiry } = await (supabase as any)
      .from("listing_inquiries")
      .select("id")
      .eq("listing_id", body.listing_id)
      .eq("tenant_id", user.id)
      .gte("created_at", oneHourAgo)
      .limit(1);

    if (existingInquiry && existingInquiry.length > 0) {
      return NextResponse.json(
        { error: "You've already sent an inquiry recently. Please wait before sending another." },
        { status: 429 }
      );
    }

    // Create inquiry record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inquiry, error: insertError } = await (supabase as any)
      .from("listing_inquiries")
      .insert({
        listing_id: body.listing_id,
        tenant_id: user.id,
        landlord_id: listing.landlord_id,
        message: body.message.trim(),
        tenant_phone: tenantPhone,
        request_viewing: body.request_viewing,
        preferred_viewing_time: body.request_viewing ? body.preferred_time : null,
        preferred_viewing_day: body.request_viewing ? body.preferred_day : null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating inquiry:", insertError);
      return NextResponse.json(
        { error: "Failed to send inquiry. Please try again." },
        { status: 500 }
      );
    }

    // Increment inquiries count on listing (fire and forget)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("listings")
      .update({ inquiries_count: listing.inquiries_count + 1 })
      .eq("id", body.listing_id)
      .then(() => {});

    // TODO: Send notification to landlord (email, push, SMS)
    // This would be handled by a separate notification service

    return NextResponse.json({
      success: true,
      inquiry_id: inquiry.id,
      message: "Inquiry sent successfully",
    });

  } catch (error) {
    console.error("Inquiry API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// GET - Fetch user's inquiries (for tenant dashboard)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's inquiries with listing details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inquiries, error } = await (supabase as any)
      .from("listing_inquiries")
      .select(`
        id,
        message,
        status,
        created_at,
        request_viewing,
        preferred_viewing_time,
        preferred_viewing_day,
        listings:listing_id (
          id,
          title,
          area,
          city,
          cover_photo,
          rent_amount,
          currency
        )
      `)
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching inquiries:", error);
      return NextResponse.json(
        { error: "Failed to fetch inquiries" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inquiries: inquiries || [],
    });

  } catch (error) {
    console.error("Get inquiries error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
