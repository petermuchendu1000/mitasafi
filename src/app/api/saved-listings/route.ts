/**
 * Saved Listings API Route
 * 
 * GET/POST/DELETE /api/saved-listings
 * 
 * Manages saved listings for authenticated users.
 * Syncs with local storage on the client side.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch user's saved listings
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedListings, error } = await (supabase as any)
      .from("saved_listings")
      .select(`
        id,
        listing_id,
        notes,
        created_at,
        listings (
          id,
          title,
          area,
          city,
          rent_amount,
          currency,
          bedrooms,
          bathrooms,
          property_type,
          cover_photo,
          status
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching saved listings:", error);
      return NextResponse.json(
        { error: "Failed to fetch saved listings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      saved_listings: savedListings || [],
    });
  } catch (error) {
    console.error("Saved listings GET error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST - Save a listing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { listing_id, notes } = body;

    if (!listing_id) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    // Verify listing exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: listingError } = await (supabase as any)
      .from("listings")
      .select("id")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Save listing (upsert to handle duplicates)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error: saveError } = await (supabase as any)
      .from("saved_listings")
      .upsert({
        user_id: user.id,
        listing_id,
        notes: notes || null,
      }, {
        onConflict: "user_id,listing_id",
      })
      .select("id, listing_id, created_at")
      .single();

    if (saveError) {
      console.error("Error saving listing:", saveError);
      return NextResponse.json(
        { error: "Failed to save listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      saved_listing: saved,
    });
  } catch (error) {
    console.error("Save listing error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Unsave a listing
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listing_id");

    if (!listingId) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (deleteError) {
      console.error("Error deleting saved listing:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove saved listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Listing removed from saves",
    });
  } catch (error) {
    console.error("Delete saved listing error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
