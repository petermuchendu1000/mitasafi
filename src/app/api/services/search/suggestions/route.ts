// =============================================================================
// API: GET /api/services/search/suggestions
// =============================================================================
// Fast autocomplete suggestions for the service search.
// Returns matching services, subcategories, and categories.
// 
// Performance optimizations:
// - Limited result set (max 10 total)
// - Indexed text search
// - Cached category data
// - Fast response times (<100ms target)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { sanitizeSearchQuery } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Maximum suggestions per type
const MAX_SERVICES = 5;
const MAX_SUBCATEGORIES = 3;
const MAX_PROVIDERS = 3;
const MAX_TOTAL = 10;

interface Suggestion {
  id: string;
  type: "service" | "subcategory" | "category" | "provider";
  name: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting (120 req / min per IP)
    const ip = getClientIp(request.headers);
    const rl = searchLimiter.check(ip);
    if (!rl.allowed) {
      return rateLimitResponse(rl);
    }

    const { searchParams } = new URL(request.url);
    const query = sanitizeSearchQuery(searchParams.get("q"), 200);
    const limit = Math.min(
      Math.max(1, Number(searchParams.get("limit")) || MAX_TOTAL),
      MAX_TOTAL
    );

    // Return empty for very short queries
    if (query.length < 2) {
      return NextResponse.json({ suggestions: [], query });
    }

    const supabase = await createClient();
    const suggestions: Suggestion[] = [];

    // Search pattern for ILIKE
    const searchPattern = `%${query}%`;

    // 1. Search services (highest priority)
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select(`
        id,
        name,
        subcategory:service_subcategories (
          id,
          name,
          category:service_categories (
            id,
            name
          )
        )
      `)
      .eq("is_active", true)
      .or(`name.ilike.${searchPattern},keywords.cs.{${query}}`)
      .limit(MAX_SERVICES);

    if (servicesError) {
      console.error("Error searching services:", servicesError);
    } else if (services) {
      // Cast for Supabase type inference
      (services as any[]).forEach((service) => {
        // Type assertion for nested data
        const subcategory = service.subcategory as {
          id: string;
          name: string;
          category: { id: string; name: string } | null;
        } | null;

        suggestions.push({
          id: service.id,
          type: "service",
          name: service.name,
          categoryId: subcategory?.category?.id,
          categoryName: subcategory?.category?.name,
          subcategoryId: subcategory?.id,
          subcategoryName: subcategory?.name,
        });
      });
    }

    // 2. Search subcategories
    if (suggestions.length < limit) {
      const { data: subcategories, error: subcategoriesError } = await supabase
        .from("service_subcategories")
        .select(`
          id,
          name,
          category:service_categories (
            id,
            name
          )
        `)
        .eq("is_active", true)
        .ilike("name", searchPattern)
        .limit(MAX_SUBCATEGORIES);

      if (subcategoriesError) {
        console.error("Error searching subcategories:", subcategoriesError);
      } else if (subcategories) {
        // Cast for Supabase type inference
        (subcategories as any[]).forEach((sub) => {
          // Avoid duplicates
          if (!suggestions.find((s) => s.type === "subcategory" && s.id === sub.id)) {
            const category = sub.category as { id: string; name: string } | null;
            suggestions.push({
              id: sub.id,
              type: "subcategory",
              name: sub.name,
              categoryId: category?.id,
              categoryName: category?.name,
            });
          }
        });
      }
    }

    // 3. Search providers by business_name (via FTS when possible)
    if (suggestions.length < limit) {
      // Build FTS query for providers with search_vector GIN index
      const words = query
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .split(/\s+/)
        .filter((w) => w.length >= 2);

      let providerQuery = supabase
        .from("service_providers")
        .select("id, business_name, tagline, is_verified, average_rating")
        .eq("account_status", "active");

      if (words.length > 0) {
        const tsQuery = words.map((w) => `'${w}':*`).join(" & ");
        providerQuery = providerQuery.textSearch("search_vector", tsQuery, { config: "english" });
      } else {
        providerQuery = providerQuery.ilike("business_name", searchPattern);
      }

      const { data: providers, error: providersError } = await providerQuery
        .order("average_rating", { ascending: false, nullsFirst: false })
        .limit(MAX_PROVIDERS);

      if (providersError) {
        console.error("Error searching providers:", providersError);
      } else if (providers) {
        (providers as any[]).forEach((p) => {
          suggestions.push({
            id: p.id,
            type: "provider",
            name: p.business_name,
            categoryName: p.is_verified
              ? `★ ${p.average_rating?.toFixed(1) ?? "New"} · Verified`
              : p.average_rating
                ? `★ ${p.average_rating.toFixed(1)}`
                : undefined,
          });
        });
      }
    }

    // Sort by relevance (exact match first, then starts with, then contains)
    suggestions.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const qLower = query.toLowerCase();

      // Exact match
      if (aLower === qLower && bLower !== qLower) return -1;
      if (bLower === qLower && aLower !== qLower) return 1;

      // Starts with
      if (aLower.startsWith(qLower) && !bLower.startsWith(qLower)) return -1;
      if (bLower.startsWith(qLower) && !aLower.startsWith(qLower)) return 1;

      // Alphabetical
      return aLower.localeCompare(bLower);
    });

    return NextResponse.json({
      suggestions: suggestions.slice(0, limit),
      query,
    });
  } catch (error) {
    console.error("Error in GET /api/services/search/suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions", suggestions: [] },
      { status: 500 }
    );
  }
}
