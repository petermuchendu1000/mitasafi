/**
 * Search Alerts API Route
 * 
 * POST /api/search-alerts
 * 
 * Creates a search alert - works for BOTH public and authenticated users.
 * No login required to get notified about new listings.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SearchAlertRequestBody {
  // Contact info
  email?: string | null;
  phone?: string | null;
  // Alert config
  name?: string;
  frequency?: "instant" | "daily" | "weekly";
  notify_email?: boolean;
  notify_sms?: boolean;
  // Search criteria
  areas?: string[];
  property_types?: string[];
  bedrooms_min?: number;
  bedrooms_max?: number;
  price_min?: number;
  price_max?: number;
  verified_only?: boolean;
  available_now?: boolean;
  // User ID if logged in
  user_id?: string | null;
  // Source tracking (for analytics)
  source?: "manual" | "no_results" | "unavailable_listing" | "similar_search";
  source_listing_id?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: SearchAlertRequestBody = await request.json();

    // Either phone OR email is required
    if (!body.phone?.trim() && !body.email?.trim()) {
      return NextResponse.json(
        { error: "Phone number or email is required" },
        { status: 400 }
      );
    }

    // Email must be valid if provided
    if (body.email && !body.email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check for duplicate alert with same contact
    const contactField = body.phone?.trim() ? "phone" : "email";
    const contactValue = body.phone?.trim() || body.email?.trim();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("search_alerts")
      .select("id")
      .eq(contactField, contactValue)
      .eq("is_active", true)
      .limit(5);

    if (existing && existing.length >= 5) {
      return NextResponse.json(
        { error: "You've reached the maximum number of alerts (5). Please delete some first." },
        { status: 400 }
      );
    }

    // Create search alert
    const hasEmail = body.email?.trim();
    const hasPhone = body.phone?.trim();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: alert, error: insertError } = await (supabase as any)
      .from("search_alerts")
      .insert({
        user_id: body.user_id || null,
        email: hasEmail ? body.email!.trim() : null,
        phone: hasPhone ? body.phone!.trim() : null,
        name: body.name || null,
        property_types: body.property_types || null,
        bedrooms_min: body.bedrooms_min || null,
        bedrooms_max: body.bedrooms_max || null,
        price_min: body.price_min || null,
        price_max: body.price_max || null,
        areas: body.areas || null,
        verified_only: body.verified_only || false,
        available_now: body.available_now || false,
        notify_email: body.notify_email !== false && !!hasEmail,
        notify_sms: body.notify_sms !== false && !!hasPhone,
        frequency: body.frequency || "instant",
        is_active: true,
        // Source tracking for analytics
        source: body.source || "manual",
        source_listing_id: body.source_listing_id || null,
        // Auto-verify if user is logged in, otherwise needs phone verification
        verified_at: body.user_id ? new Date().toISOString() : null,
      })
      .select("id, verification_token")
      .single();

    if (insertError) {
      console.error("Error creating search alert:", insertError);
      return NextResponse.json(
        { error: "Failed to create alert. Please try again." },
        { status: 500 }
      );
    }

    // TODO: If not logged in and email provided, send verification email
    // For now, we'll auto-verify to reduce friction

    // Auto-verify for now (reduce friction)
    if (!body.user_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("search_alerts")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", alert.id);
    }

    return NextResponse.json({
      success: true,
      alert_id: alert.id,
      message: "Search alert created successfully",
      verified: !!body.user_id,
    });
  } catch (error) {
    console.error("Search alert API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// GET - List user's alerts (authenticated only)
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
    const { data: alerts, error } = await (supabase as any)
      .from("search_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching alerts:", error);
      return NextResponse.json(
        { error: "Failed to fetch alerts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      alerts: alerts || [],
    });
  } catch (error) {
    console.error("Search alert GET error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
