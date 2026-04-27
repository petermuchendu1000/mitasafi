/**
 * Inquiries API Route
 * 
 * POST /api/inquiries
 * 
 * Creates an inquiry (lead) - works for BOTH public and authenticated users.
 * No login required to contact a landlord.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInquiryNotification } from "@/lib/email";

interface InquiryRequestBody {
  listing_id: string;
  landlord_id: string;
  property_id?: string;
  // Contact info
  name: string;
  email?: string | null;
  phone?: string | null;
  // Inquiry details
  message?: string;
  request_viewing?: boolean;
  preferred_viewing_time?: string | null;
  preferred_viewing_day?: string | null;
  // User ID if logged in
  user_id?: string | null;
  // Source tracking
  source?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InquiryRequestBody = await request.json();

    console.log("[Inquiries API] Received request:", {
      listing_id: body.listing_id,
      landlord_id: body.landlord_id,
      phone: body.phone,
    });

    // Validate required fields
    if (!body.listing_id) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    if (!body.landlord_id) {
      return NextResponse.json(
        { error: "Landlord ID is required" },
        { status: 400 }
      );
    }

    // Phone is REQUIRED (email is optional)
    if (!body.phone?.trim()) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (body.email?.trim() && !body.email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Use admin client to verify listing (bypasses RLS for reliable check)
    console.log("[Inquiries API] Creating admin client...");
    const adminSupabase = createAdminClient();
    console.log("[Inquiries API] Admin client created, querying listing:", body.listing_id);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listingData, error: listingError } = await (adminSupabase as any)
      .from("listings")
      .select("id, landlord_id, title, area, status, inquiries_count")
      .eq("id", body.listing_id)
      .single();

    console.log("[Inquiries API] Query result:", { listingData, listingError });

    interface ListingResult {
      id: string;
      landlord_id: string;
      title: string;
      area: string;
      status: string;
      inquiries_count: number;
    }

    const listing = listingData as ListingResult | null;

    if (listingError || !listing) {
      console.error("Listing query failed:", { 
        listing_id: body.listing_id, 
        error: listingError?.message || "No listing found",
        code: listingError?.code 
      });
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

    // Optional: Check if logged-in user is the landlord (can't inquire on own listing)
    if (body.user_id && body.user_id === listing.landlord_id) {
      return NextResponse.json(
        { error: "You cannot inquire on your own listing" },
        { status: 400 }
      );
    }

    // Rate limiting check for the same contact on same listing (1 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Check by email if provided
    if (body.email) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingByEmail } = await (adminSupabase as any)
        .from("inquiries")
        .select("id")
        .eq("listing_id", body.listing_id)
        .eq("email", body.email)
        .gte("created_at", oneHourAgo)
        .limit(1);

      if (existingByEmail && existingByEmail.length > 0) {
        return NextResponse.json(
          { error: "You've already sent an inquiry recently. Please wait before sending another." },
          { status: 429 }
        );
      }
    }

    // Check by phone if provided
    if (body.phone) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingByPhone } = await (adminSupabase as any)
        .from("inquiries")
        .select("id")
        .eq("listing_id", body.listing_id)
        .eq("phone", body.phone)
        .gte("created_at", oneHourAgo)
        .limit(1);

      if (existingByPhone && existingByPhone.length > 0) {
        return NextResponse.json(
          { error: "You've already sent an inquiry recently. Please wait before sending another." },
          { status: 429 }
        );
      }
    }

    // Derive name from email or phone if not provided
    const derivedName = body.name?.trim() 
      || (body.email ? body.email.split("@")[0] : null)
      || (body.phone ? `User ${body.phone.slice(-4)}` : "Anonymous");

    // Create inquiry record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inquiry, error: insertError } = await (adminSupabase as any)
      .from("inquiries")
      .insert({
        listing_id: body.listing_id,
        landlord_id: listing.landlord_id,
        user_id: body.user_id || null,
        name: derivedName,
        email: body.email?.trim() || null,
        phone: body.phone || null,
        message: body.message?.trim() || null,
        request_viewing: body.request_viewing || false,
        preferred_viewing_time: body.preferred_viewing_time || null,
        preferred_viewing_day: body.preferred_viewing_day || null,
        source: body.source || "listing_page",
        status: "new",
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
    (adminSupabase as any)
      .from("listings")
      .update({ inquiries_count: (listing.inquiries_count || 0) + 1 })
      .eq("id", body.listing_id)
      .then(() => {});

    // Send notification email to landlord (fire and forget)
    // Fetch landlord details for email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: landlordData } = await (adminSupabase as any)
      .from("profiles")
      .select("email, full_name")
      .eq("id", listing.landlord_id)
      .single();

    if (landlordData?.email) {
      sendInquiryNotification({
        landlordName: landlordData.full_name || "Landlord",
        landlordEmail: landlordData.email,
        inquirerName: derivedName,
        inquirerEmail: body.email?.trim() || null,
        inquirerPhone: body.phone || null,
        listingTitle: listing.title,
        listingArea: listing.area || "Nairobi",
        listingId: body.listing_id,
        message: body.message?.trim() || null,
        requestViewing: body.request_viewing || false,
        preferredTime: body.preferred_viewing_time || null,
        preferredDay: body.preferred_viewing_day || null,
      }).catch(err => {
        console.error("[Inquiry] Failed to send email notification:", err);
      });
    }

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
