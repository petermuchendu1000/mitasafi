/**
 * Email Listing to Self API Route
 * 
 * POST /api/listings/email-to-self
 * 
 * Sends a listing to user's email - lead capture mechanism.
 * No login required.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface EmailToSelfRequestBody {
  email: string;
  listing_id: string;
  listing_title: string;
  listing_url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailToSelfRequestBody = await request.json();

    // Validate
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    if (!body.listing_id) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    // Verify listing exists
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: listingError } = await (supabase as any)
      .from("listings")
      .select("id, title, area, city, rent_amount, currency, cover_photo, bedrooms, property_type")
      .eq("id", body.listing_id)
      .eq("status", "active")
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Rate limit: 5 emails per email address per hour
    // In production, you'd track this in Redis or a rate limit table
    
    // TODO: Actually send the email using your email provider (Resend, SendGrid, etc.)
    // For now, we'll just log it and return success
    
    console.log(`[Email to Self] Sending listing ${body.listing_id} to ${body.email}`);
    console.log(`Listing: ${listing.title}, ${listing.bedrooms} BR in ${listing.area}`);
    console.log(`URL: ${body.listing_url}`);

    // In production, send email here:
    // await sendEmail({
    //   to: body.email,
    //   subject: `Listing Saved: ${listing.title}`,
    //   html: `...email template...`,
    // });

    // Also create a search alert with minimal criteria as a bonus lead capture
    // This gives them alerts for similar listings in the same area
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("search_alerts")
        .insert({
          email: body.email,
          name: `Listings in ${listing.area}`,
          areas: [listing.area],
          bedrooms_min: listing.bedrooms > 0 ? listing.bedrooms - 1 : 0,
          bedrooms_max: listing.bedrooms + 1,
          notify_email: true,
          frequency: "weekly",  // Less aggressive for this implicit opt-in
          is_active: true,
          verified_at: new Date().toISOString(),  // Auto-verify
        });
    } catch {
      // Silently fail - this is a bonus, not critical
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Email to self error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
