// =============================================================================
// API: GET /api/services/providers/[id]
// =============================================================================
// Fetch a single service provider by ID with full details.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getProviderById, getSimilarProviders, isProviderSaved } from "@/lib/services/providers";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }
    
    // Fetch provider and related data in parallel
    const [providerResult, similarProviders, isSaved] = await Promise.all([
      getProviderById(id),
      getSimilarProviders(id, 4),
      isProviderSaved(id),
    ]);
    
    if (providerResult.error) {
      if (providerResult.error === "Provider not found") {
        return NextResponse.json(
          { error: "Provider not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: providerResult.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      provider: providerResult.provider,
      similarProviders,
      isSaved,
    });
  } catch (error) {
    console.error("Error in GET /api/services/providers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
