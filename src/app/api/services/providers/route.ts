// =============================================================================
// API: GET /api/services/providers
// =============================================================================
// Fetch service providers with filters, sorting, and pagination.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getProviders, getFeaturedProviders } from "@/lib/services/providers";
import { getCategories } from "@/lib/services/categories";
import type { ServiceFiltersState } from "@/types/service-providers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const areaParam = searchParams.get("area");
    const filters: Partial<ServiceFiltersState> = {
      category: searchParams.get("category") || undefined,
      subcategory: searchParams.get("subcategory") || undefined,
      area: areaParam ? areaParam.split(",").filter(Boolean) : undefined,
      priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : undefined,
      priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : undefined,
      ratingMin: searchParams.get("ratingMin") ? Number(searchParams.get("ratingMin")) : undefined,
      verifiedOnly: searchParams.get("verified") === "true",
      availableNow: searchParams.get("available") === "true",
      instantBooking: searchParams.get("instant") === "true",
      sort: searchParams.get("sort") || "recommended",
    };
    
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 12));
    const includeFeatured = searchParams.get("featured") !== "false";
    
    // Fetch data in parallel
    const [providersResult, featuredProviders, categories] = await Promise.all([
      getProviders({ filters, page, pageSize }),
      includeFeatured && page === 1 ? getFeaturedProviders(6, filters.category ?? undefined) : Promise.resolve([]),
      page === 1 ? getCategories() : Promise.resolve([]),
    ]);
    
    if (providersResult.error) {
      return NextResponse.json(
        { error: providersResult.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      providers: providersResult.providers,
      featured: featuredProviders,
      categories,
      pagination: providersResult.pagination,
      filters,
    });
  } catch (error) {
    console.error("Error in GET /api/services/providers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
