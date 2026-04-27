// =============================================================================
// API: GET /api/services/providers/[id]/reviews
// =============================================================================
// Fetch paginated reviews for a service provider.
// Returns enriched reviews with reviewer profiles and helpful-vote counts,
// matching the same shape used by the server-rendered provider page.
//
// Query params:
//   page      – 1-based page number (default 1)
//   pageSize  – items per page, clamped to [1, 50] (default 10)
//   sortBy    – newest | oldest | highest | lowest (default newest)
//   rating    – filter to a single star rating 1-5 (optional)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getProviderReviewsWithVotes } from "@/lib/services/reviews";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

const VALID_SORTS = new Set(["newest", "oldest", "highest", "lowest", "most_helpful"]);

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    if (!id) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

    // Sort — validate against allowed values, default to "newest"
    const rawSort = searchParams.get("sortBy") ?? "newest";
    const sortBy = VALID_SORTS.has(rawSort)
      ? (rawSort as "newest" | "oldest" | "highest" | "lowest" | "most_helpful")
      : "newest";

    // Rating filter — optional, 1-5
    const rawRating = searchParams.get("rating");
    const ratingFilter =
      rawRating != null ? Math.min(5, Math.max(1, Number(rawRating))) : null;

    const result = await getProviderReviewsWithVotes({
      providerId: id,
      page,
      pageSize,
      sortBy,
      ratingFilter: Number.isFinite(ratingFilter) ? ratingFilter : null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/services/providers/[id]/reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
