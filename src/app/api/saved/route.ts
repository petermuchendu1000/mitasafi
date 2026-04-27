/**
 * Saved Listings API (Server Sync)
 * 
 * POST /api/saved - Sync local saves to server
 * GET /api/saved - Get user's saved listings
 * DELETE /api/saved - Remove a saved listing
 * 
 * This enables cross-device syncing for logged-in users.
 * Guest users use localStorage only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch user's saved listing IDs
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
    const { data: saved, error } = await (supabase as any)
      .from("saved_listings")
      .select("listing_id, created_at")
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
      saved: saved || [],
      listing_ids: (saved || []).map((s: { listing_id: string }) => s.listing_id),
    });
  } catch (error) {
    console.error("Saved listings GET error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST - Sync saves (add or bulk sync)
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
    const { listing_id, listing_ids } = body;

    // Single save
    if (listing_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from("saved_listings")
        .upsert({
          user_id: user.id,
          listing_id: listing_id,
        }, {
          onConflict: "user_id,listing_id",
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error("Error saving listing:", insertError);
        return NextResponse.json(
          { error: "Failed to save listing" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Listing saved",
      });
    }

    // Bulk sync (from localStorage)
    if (listing_ids && Array.isArray(listing_ids)) {
      // Get existing saved listings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user.id);

      const existingIds = new Set((existing || []).map((e: { listing_id: string }) => e.listing_id));
      
      // Filter to only new saves
      const newSaves = listing_ids.filter((id: string) => !existingIds.has(id));

      if (newSaves.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: bulkError } = await (supabase as any)
          .from("saved_listings")
          .insert(
            newSaves.map((id: string) => ({
              user_id: user.id,
              listing_id: id,
            }))
          );

        if (bulkError) {
          console.error("Error bulk saving listings:", bulkError);
          // Don't fail completely, some might have saved
        }
      }

      // Get updated list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated } = await (supabase as any)
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user.id);

      return NextResponse.json({
        success: true,
        synced: newSaves.length,
        total: (updated || []).length,
        listing_ids: (updated || []).map((s: { listing_id: string }) => s.listing_id),
      });
    }

    return NextResponse.json(
      { error: "listing_id or listing_ids required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Saved listings POST error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a saved listing
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
        { error: "listing_id required" },
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
      console.error("Error removing saved listing:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove saved listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Listing unsaved",
    });
  } catch (error) {
    console.error("Saved listings DELETE error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
