/**
 * Landlord Inquiries API
 * 
 * GET /api/landlord/inquiries
 * 
 * Returns all inquiries for the authenticated landlord's listings.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    // Get all inquiries for landlord's listings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inquiries, error } = await (supabase as any)
      .from("inquiries")
      .select(`
        id,
        listing_id,
        name,
        email,
        phone,
        message,
        request_viewing,
        preferred_viewing_time,
        preferred_viewing_day,
        status,
        landlord_notes,
        source,
        created_at,
        listings!inner (
          title,
          area
        )
      `)
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching inquiries:", error);
      return NextResponse.json(
        { error: "Failed to fetch inquiries" },
        { status: 500 }
      );
    }

    // Transform the data to flatten listing info
    interface RawInquiry {
      id: string;
      listing_id: string;
      name: string;
      email: string | null;
      phone: string | null;
      message: string | null;
      request_viewing: boolean;
      preferred_viewing_time: string | null;
      preferred_viewing_day: string | null;
      status: string;
      landlord_notes: string | null;
      source: string;
      created_at: string;
      listings: {
        title: string;
        area: string;
      };
    }

    const formattedInquiries = (inquiries as RawInquiry[]).map((inq) => ({
      id: inq.id,
      listing_id: inq.listing_id,
      listing_title: inq.listings?.title || "Unknown Listing",
      listing_area: inq.listings?.area || "Unknown Area",
      name: inq.name,
      email: inq.email,
      phone: inq.phone,
      message: inq.message,
      request_viewing: inq.request_viewing,
      preferred_viewing_time: inq.preferred_viewing_time,
      preferred_viewing_day: inq.preferred_viewing_day,
      status: inq.status,
      landlord_notes: inq.landlord_notes,
      source: inq.source,
      created_at: inq.created_at,
    }));

    return NextResponse.json({
      inquiries: formattedInquiries,
    });
  } catch (error) {
    console.error("Landlord inquiries API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
