/**
 * Listing Waitlist API
 * 
 * Allows users to join a waitlist for a specific listing.
 * Used when a listing is paused/temporarily unavailable.
 * 
 * POST /api/listing-waitlist - Join waitlist
 * GET /api/listing-waitlist?listing_id=xxx - Check if on waitlist
 * DELETE /api/listing-waitlist?listing_id=xxx - Leave waitlist
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate Kenyan phone
function isValidKenyanPhone(phone: string): boolean {
  if (!phone) return true;
  const cleaned = phone.replace(/\D/g, "");
  // +254 followed by 9 digits starting with 7 or 1
  return /^254[71]\d{8}$/.test(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listing_id, email, phone, user_id, name } = body;

    // Validation
    if (!listing_id) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (phone && !isValidKenyanPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated (to link the entry)
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = user?.id || user_id || null;

    // Verify the listing exists and is actually paused/rented
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: listingError } = await (supabase as any)
      .from("listings")
      .select("id, title, status")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.status === "active") {
      return NextResponse.json(
        { error: "This listing is already available" },
        { status: 400 }
      );
    }

    // Insert into waitlist (upsert to handle duplicates gracefully)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: waitlistEntry, error: insertError } = await (supabase as any)
      .from("listing_waitlist")
      .upsert(
        {
          listing_id,
          email: email.toLowerCase().trim(),
          phone: phone || null,
          user_id: effectiveUserId,
          name: name || null,
          is_active: true,
          notified_at: null, // Reset if rejoining
        },
        {
          onConflict: "listing_id,email",
          ignoreDuplicates: false, // Update existing entry
        }
      )
      .select()
      .single();

    if (insertError) {
      console.error("Waitlist insert error:", insertError);
      
      // Handle unique constraint violation gracefully
      if (insertError.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "You're already on the waitlist for this property",
          already_exists: true,
        });
      }
      
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You'll be notified when this property becomes available",
      waitlist_id: waitlistEntry.id,
    });

  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listing_id = searchParams.get("listing_id");

    if (!listing_id) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is on waitlist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entry, error } = await (supabase as any)
      .from("listing_waitlist")
      .select("id, is_active, created_at")
      .eq("listing_id", listing_id)
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Waitlist check error:", error);
      return NextResponse.json(
        { error: "Failed to check waitlist status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      on_waitlist: !!entry && entry.is_active,
      waitlist_entry: entry || null,
    });

  } catch (error) {
    console.error("Waitlist GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listing_id = searchParams.get("listing_id");

    if (!listing_id) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Remove from waitlist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("listing_waitlist")
      .delete()
      .eq("listing_id", listing_id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Waitlist delete error:", error);
      return NextResponse.json(
        { error: "Failed to leave waitlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Removed from waitlist",
    });

  } catch (error) {
    console.error("Waitlist DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
