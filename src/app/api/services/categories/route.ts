// =============================================================================
// API: GET /api/services/categories
// =============================================================================
// Fetch all service categories with optional subcategories.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getCategories, getCategoriesWithSubs } from "@/lib/services/categories";

// Force dynamic rendering since we use request.url for query params
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeSubcategories = searchParams.get("include") === "subcategories";
    
    const categories = includeSubcategories 
      ? await getCategoriesWithSubs()
      : await getCategories();
    
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error in GET /api/services/categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
