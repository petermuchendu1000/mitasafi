// =============================================================================
// API: /api/services/saved
// =============================================================================
// Manage saved/favorite service providers.
// GET: Fetch user's saved providers
// POST: Save a provider
// DELETE: Unsave a provider
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSavedProviders, toggleSaveProvider } from "@/lib/services/providers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// =============================================================================
// GET: Fetch saved providers
// =============================================================================

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const providers = await getSavedProviders();
    
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Error in GET /api/services/saved:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Toggle save provider
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { providerId } = body;
    
    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }
    
    const result = await toggleSaveProvider(providerId);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ saved: result.saved });
  } catch (error) {
    console.error("Error in POST /api/services/saved:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
