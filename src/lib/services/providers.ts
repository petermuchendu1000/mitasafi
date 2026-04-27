// =============================================================================
// MITASAFI: SERVICE PROVIDERS LIB
// =============================================================================
// Server-side functions for fetching and managing service providers.
// Used by API routes and server components.
// 
// Performance optimizations:
// - Indexed queries where possible
// - Parallel data fetching
// - Computed fields cached
// - Pagination with exact counts
// =============================================================================

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ServiceProviderCardData,
  ServiceProviderWithDetails,
  ServiceFiltersState,
  PaginatedResponse,
  ProviderReviewWithReviewer,
} from "@/types/service-providers";
import { PROVIDERS_PER_PAGE, FEATURED_PROVIDERS_LIMIT, SERVICE_CATEGORIES } from "@/lib/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface GetProvidersOptions {
  filters?: Partial<ServiceFiltersState>;
  page?: number;
  pageSize?: number;
}

export interface GetProvidersResult {
  providers: ServiceProviderCardData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  error?: string;
}

// =============================================================================
// SHARED: Column mapping helpers
// =============================================================================
// The DB schema uses different column names than the app TypeScript interfaces.
// These helpers centralise the mapping so every query is consistent.

/** Base columns to SELECT from service_providers (actual DB names) */
const SP_BASE_COLUMNS = `
  id,
  business_name,
  headline,
  tagline,
  bio,
  profile_photo_url,
  cover_photo_url,
  is_active,
  instant_booking,
  is_verified,
  average_rating,
  total_reviews,
  total_jobs_completed,
  response_time_minutes,
  verification_badge,
  min_price`;

/** provider_services sub-select with service → category + subcategory joins */
const PS_JOIN = `
  provider_services (
    custom_pricing,
    service:services (
      name,
      slug,
      category:service_categories (
        id,
        slug,
        name
      ),
      subcategory:service_subcategories (
        id,
        slug,
        name,
        category_id
      )
    )
  )`;

/**
 * Same but with !inner joins for category/subcategory filtering.
 * The category join uses !inner so PostgREST can filter at the DB level.
 * Subcategory remains a left join (nullable FK on services).
 */
const PS_JOIN_INNER_CATEGORY = `
  provider_services!inner (
    custom_pricing,
    service:services!inner (
      name,
      slug,
      category:service_categories!inner (
        id,
        slug,
        name
      ),
      subcategory:service_subcategories (
        id,
        slug,
        name,
        category_id
      )
    )
  )`;

/** Inner join variant for subcategory filtering (requires subcategory) */
const PS_JOIN_INNER_SUBCATEGORY = `
  provider_services!inner (
    custom_pricing,
    service:services!inner (
      name,
      slug,
      category:service_categories (
        id,
        slug,
        name
      ),
      subcategory:service_subcategories!inner (
        id,
        slug,
        name,
        category_id
      )
    )
  )`;

/** provider_service_areas sub-select for populating service_areas */
const AREA_JOIN = `provider_service_areas (area_name)`;

/** Same with !inner join for server-side area filtering */
const AREA_JOIN_INNER = `provider_service_areas!inner (area_name)`;

/**
 * Transform a raw DB row into ServiceProviderCardData.
 * Handles column name mapping (DB → app interface).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProviderRow(provider: any): ServiceProviderCardData {
  const categories = new Set<string>();
  const subcategories = new Set<string>();
  const serviceNames = new Set<string>();
  // Use ordered array (not Set) so images from earlier services come first,
  // creating visual coherence on the browse card carousel.
  const orderedImageUrls: string[] = [];
  let computedMinPrice: number | null = null;
  let priceType: string | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (provider.provider_services || []).forEach((ps: any) => {
    // Human-readable service name (e.g. "Pipe Repair", "Deep Cleaning")
    if (ps.service?.name) {
      serviceNames.add(ps.service.name as string);
    }
    // Category slug from the direct services → service_categories join
    if (ps.service?.category?.slug) {
      categories.add(ps.service.category.slug);
    }
    // Subcategory ID (for subcategory filtering / display)
    if (ps.service?.subcategory?.id) {
      subcategories.add(ps.service.subcategory.id);
    }
    // custom_pricing is jsonb: { type, amount, ... }
    const pricing = ps.custom_pricing as Record<string, unknown> | null;
    const amount = (pricing?.amount as number) ?? null;
    const imageUrls = Array.isArray(pricing?.image_urls)
      ? (pricing.image_urls as string[])
      : [];

    imageUrls.forEach((url) => {
      if (typeof url === "string" && url.trim() && !orderedImageUrls.includes(url)) {
        orderedImageUrls.push(url);
      }
    });

    if (amount && (!computedMinPrice || amount < computedMinPrice)) {
      computedMinPrice = amount;
      priceType = (pricing?.type as string) || "fixed";
    }
  });

  // Prefer the denormalized DB min_price (SC-7) — trigger-maintained and used
  // for SQL-level filtering / sorting. Fall back to the computed value for
  // backward-compatibility when the column hasn't been populated yet.
  const dbMinPrice = typeof provider.min_price === "number" ? provider.min_price : null;
  const finalMinPrice = dbMinPrice ?? computedMinPrice;

  // Extract unique area names from joined provider_service_areas
  const areaNames = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (provider.provider_service_areas || []).forEach((psa: any) => {
    if (psa.area_name) areaNames.add(psa.area_name);
  });

  // Resolve headline → tagline fallback chain.
  // Real providers write to `headline` via the profile form.
  // Seeded data may only have `tagline`. Prefer headline (the live write path).
  const resolvedTagline: string | null = provider.headline || provider.tagline || null;

  return {
    id: provider.id,
    business_name: provider.business_name,
    tagline: resolvedTagline,
    description: provider.bio ?? null,
    logo_url: provider.profile_photo_url ?? null,
    cover_photo_url: provider.cover_photo_url ?? null,
    service_image_urls: orderedImageUrls,
    service_names: Array.from(serviceNames),
    service_areas: Array.from(areaNames),
    is_available: provider.is_active ?? false,
    instant_booking: provider.instant_booking ?? false,
    is_verified: provider.is_verified ?? null,
    rating_average: provider.average_rating ?? null,
    rating_count: provider.total_reviews ?? null,
    total_jobs_completed: provider.total_jobs_completed ?? null,
    response_time_minutes: provider.response_time_minutes ?? null,
    tier: provider.verification_badge ?? null,
    min_price: finalMinPrice,
    price_type: priceType,
    categories: Array.from(categories),
    subcategories: Array.from(subcategories),
    years_in_business: provider.years_in_business ?? null,
    last_active_at: provider.last_active_at ?? null,
    has_insurance: provider.has_insurance ?? false,
    has_business_license: provider.has_business_license ?? false,
    has_id_verified: provider.has_id_verified ?? false,
  };
}

// =============================================================================
// GET PROVIDERS LIST (with full-text search support)
// =============================================================================

export async function getProviders(options: GetProvidersOptions = {}): Promise<GetProvidersResult> {
  const supabase = await createClient();
  
  const {
    filters = {},
    page = 1,
    pageSize = PROVIDERS_PER_PAGE,
  } = options;
  
  const offset = (page - 1) * pageSize;
  
  try {
    // Build the select statement based on filters.
    // Category filter → !inner join on service_categories (slug-based).
    // Subcategory filter → !inner join on service_subcategories.
    // No filter → left joins (all providers, even those without services).
    const needsCategoryFilter = !!filters.category;
    const needsSubcategoryFilter = !!filters.subcategory;
    const needsAreaFilter = Array.isArray(filters.area) && filters.area.length > 0;
    
    let psJoin: string;
    if (needsSubcategoryFilter) {
      psJoin = PS_JOIN_INNER_SUBCATEGORY;
    } else if (needsCategoryFilter) {
      psJoin = PS_JOIN_INNER_CATEGORY;
    } else {
      psJoin = PS_JOIN;
    }
    const areaJoin = needsAreaFilter ? AREA_JOIN_INNER : AREA_JOIN;

    const selectParts = `${SP_BASE_COLUMNS}, ${psJoin}, ${areaJoin}`;
    
    // Build the query
    let query = supabase
      .from("service_providers")
      .select(selectParts, { count: "exact" })
      .eq("account_status", "active");
    
    // Full-text search via GIN-indexed search_vector column (SC-7)
    // Each word gets :* for prefix matching, joined with & (AND).
    // Falls back to ILIKE for single-character queries where FTS is useless.
    if (filters.search) {
      const raw = filters.search.trim();
      const words = raw
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .split(/\s+/)
        .filter((w) => w.length >= 2);

      if (words.length > 0) {
        const tsQuery = words.map((w) => `'${w}':*`).join(" & ");
        query = query.textSearch("search_vector", tsQuery, { config: "english" });
      } else if (raw.length > 0) {
        // Fallback for very short terms (< 2 chars per word)
        query = query.or(
          `business_name.ilike.%${raw}%,tagline.ilike.%${raw}%,bio.ilike.%${raw}%`
        );
      }
    }
    
    // Apply category filter via service_categories.slug (matches dbCategoryIds)
    if (filters.category) {
      const majorCategory = SERVICE_CATEGORIES.find((cat) => cat.id === filters.category);
      if (majorCategory && majorCategory.dbCategoryIds.length > 0) {
        // Major UI category → resolve to its constituent DB category slugs
        query = query.in("provider_services.service.category.slug", majorCategory.dbCategoryIds);
      } else {
        // Direct DB category slug (e.g., "plumbing")
        query = query.eq("provider_services.service.category.slug", filters.category);
      }
    }
    
    // Apply subcategory filter via service_subcategories.slug
    if (filters.subcategory) {
      query = query.eq("provider_services.service.subcategory.slug", filters.subcategory);
    }
    
    // Area filter — applied via !inner join on provider_service_areas
    if (needsAreaFilter && filters.area) {
      query = query.in("provider_service_areas.area_name", filters.area);
    }
    
    if (filters.verifiedOnly) {
      query = query.eq("is_verified", true);
    }
    
    if (filters.availableNow) {
      query = query.eq("is_active", true);
    }
    
    if (filters.instantBooking) {
      query = query.eq("instant_booking", true);
    }
    
    if (filters.ratingMin) {
      query = query.gte("average_rating", filters.ratingMin);
    }
    
    // Price filters — now SQL-level using the denormalized min_price column
    // (SC-7). Providers with no price are preserved (same semantics as before).
    if (filters.priceMin != null) {
      query = query.or(`min_price.is.null,min_price.gte.${filters.priceMin}`);
    }
    if (filters.priceMax != null) {
      query = query.or(`min_price.is.null,min_price.lte.${filters.priceMax}`);
    }

    // Sorting — price sort now uses the denormalized min_price column (SC-7)
    switch (filters.sort) {
      case "rating-high":
        query = query.order("average_rating", { ascending: false, nullsFirst: false });
        break;
      case "reviews-most":
        query = query.order("total_reviews", { ascending: false, nullsFirst: false });
        break;
      case "jobs-most":
        query = query.order("total_jobs_completed", { ascending: false, nullsFirst: false });
        break;
      case "price-low":
        query = query.order("min_price", { ascending: true, nullsFirst: false });
        break;
      case "price-high":
        query = query.order("min_price", { ascending: false, nullsFirst: false });
        break;
      case "recommended":
      default:
        query = query
          .order("verification_badge", { ascending: false, nullsFirst: false })
          .order("average_rating", { ascending: false, nullsFirst: false })
          .order("total_reviews", { ascending: false, nullsFirst: false });
        break;
    }
    
    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error("Error fetching providers:", JSON.stringify(error, null, 2));
      return {
        providers: [],
        pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
        error: error.message || "Database query failed",
      };
    }
    
    // Transform using shared helper
    const providers: ServiceProviderCardData[] = ((data as any[]) || []).map(mapProviderRow);
    
    // Price filtering and sorting are now handled at the SQL level (SC-7)
    // via the denormalized min_price column, so pagination counts are accurate.
    
    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      providers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (error) {
    console.error("Error in getProviders:", error);
    return {
      providers: [],
      pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET FEATURED PROVIDERS
// =============================================================================

export async function getFeaturedProviders(
  limit: number = FEATURED_PROVIDERS_LIMIT,
  category?: string
): Promise<ServiceProviderCardData[]> {
  const supabase = await createClient();
  
  try {
    // When a category filter is provided, use !inner join on categories
    // so PostgREST can filter at the DB level by slug.
    const psJoin = category ? PS_JOIN_INNER_CATEGORY : PS_JOIN;
    const selectParts = `${SP_BASE_COLUMNS}, ${psJoin}, ${AREA_JOIN}`;

    let query = supabase
      .from("service_providers")
      .select(selectParts)
      .eq("account_status", "active")
      .in("verification_badge", ["enterprise", "premium"])
      .order("verification_badge", { ascending: false })
      .order("average_rating", { ascending: false, nullsFirst: false })
      .limit(limit);
    
    if (category) {
      const majorCategory = SERVICE_CATEGORIES.find((cat) => cat.id === category);
      if (majorCategory && majorCategory.dbCategoryIds.length > 0) {
        query = query.in(
          "provider_services.service.category.slug",
          majorCategory.dbCategoryIds
        );
      } else {
        query = query.eq(
          "provider_services.service.category.slug",
          category
        );
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching featured providers:", JSON.stringify(error, null, 2));
      return [];
    }
    
    return ((data as any[]) || []).map(mapProviderRow);
  } catch (error) {
    console.error("Error in getFeaturedProviders:", error);
    return [];
  }
}

// =============================================================================
// GET SINGLE PROVIDER
// =============================================================================

export async function getProviderById(
  providerId: string
): Promise<{ provider: ServiceProviderWithDetails | null; error?: string }> {
  const supabase = await createClient();
  
  try {
    // Fetch provider with services (sub-joined to subcategory → category)
    // and service areas so the profile page can display coverage.
    // Only active providers are publicly accessible.
    const { data, error } = await supabase
      .from("service_providers")
      .select(`
        *,
        provider_services (
          *,
          service:services (
            *,
            subcategory:service_subcategories (
              *,
              category:service_categories (*)
            )
          )
        ),
        provider_service_areas (area_name)
      `)
      .eq("id", providerId)
      .eq("account_status", "active")
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        return { provider: null, error: "Provider not found" };
      }
      console.error("Error fetching provider:", JSON.stringify(error, null, 2));
      return { provider: null, error: error.message || "Database query failed" };
    }
    
    // Fetch availability intervals separately (canonical source of truth)
    const { data: intervals } = await supabase
      .from("provider_availability_intervals")
      .select("*")
      .eq("provider_id", providerId)
      .eq("is_exception", false)
      .eq("is_active", true);
    
    // Convert RRULE-based intervals → WorkingHoursEntry for the UI
    const DAY_RULE_MAP: Record<string, number> = {
      SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
    };
    
    const workingHours = (intervals || []).map((interval: Record<string, unknown>) => {
      let dayOfWeek = 0;
      const rule = interval.recurrence_rule as string | null;
      if (rule) {
        const match = rule.match(/BYDAY=(\w{2})/);
        if (match) dayOfWeek = DAY_RULE_MAP[match[1]] ?? 0;
      }
      const fromDate = new Date(interval.available_from as string);
      const toDate = new Date(interval.available_to as string);
      return {
        day_of_week: dayOfWeek,
        is_available: true,
        start_time: fromDate.toTimeString().slice(0, 5),
        end_time: toDate.toTimeString().slice(0, 5),
      };
    });
    
    // Cast to any for Supabase complex join type inference
    const providerData = data as any;
    
    // Extract categories and subcategories
    const categoriesSet = new Set<string>();
    const subcategoriesSet = new Set<string>();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (providerData.provider_services || []).forEach((ps: any) => {
      if (ps.service?.subcategory?.category?.id) {
        categoriesSet.add(ps.service.subcategory.category.id);
      }
      if (ps.service?.subcategory?.id) {
        subcategoriesSet.add(ps.service.subcategory.id);
      }
    });

    // Extract unique area names from joined provider_service_areas
    const areaNames = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (providerData.provider_service_areas || []).forEach((psa: any) => {
      if (psa.area_name) areaNames.add(psa.area_name);
    });
    
    const provider: ServiceProviderWithDetails = {
      ...providerData,
      services: providerData.provider_services || [],
      categories: Array.from(categoriesSet),
      subcategories: Array.from(subcategoriesSet),
      service_areas: Array.from(areaNames),
      recent_reviews: [],
      availability: [],
      working_hours: workingHours,
    };
    
    return { provider };
  } catch (error) {
    console.error("Error in getProviderById:", error);
    return {
      provider: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Request-scoped cached version of getProviderById.
 *
 * React `cache()` deduplicates calls within a single server render so
 * `generateMetadata()` and the page component share one DB round-trip.
 */
export const getProviderByIdCached = cache(getProviderById);

// =============================================================================
// GET PROVIDER REVIEWS (DEPRECATED)
// =============================================================================
// This function has an N+1 query pattern (fetches profiles individually).
// Use getProviderReviewsWithVotes from '@/lib/services/reviews' instead,
// which batch-fetches profiles and aggregates votes.
// =============================================================================

/** @deprecated Use `getProviderReviewsWithVotes` from `@/lib/services/reviews`. */
export async function getProviderReviews(
  providerId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<ProviderReviewWithReviewer>> {
  const supabase = await createClient();
  const offset = (page - 1) * pageSize;
  
  try {
    const { data, error, count } = await supabase
      .from("reviews")
      .select(`*`, { count: "exact" })
      .eq("provider_id", providerId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error("Error fetching reviews:", error);
      return {
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
      };
    }

    // Fetch reviewer profiles separately since reviewer_id has no FK to profiles
    const reviewsWithReviewers = await Promise.all(
      (data || []).map(async (review: Record<string, unknown>) => {
        if (!review.reviewer_id) return { ...review, reviewer: null };
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", review.reviewer_id as string)
          .single();
        return { ...review, reviewer: profile };
      })
    );
    
    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      data: reviewsWithReviewers as any,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (error) {
    console.error("Error in getProviderReviews:", error);
    return {
      data: [],
      pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
    };
  }
}

// =============================================================================
// SEARCH PROVIDERS (DEPRECATED)
// =============================================================================
// This function is superseded by getProviders({ filters: { search } }).
// It duplicates the FTS logic and is not called by any API route.
// Kept for potential future use as a lightweight search without pagination.
// If you need provider search, prefer getProviders() instead.
// =============================================================================

/** @deprecated Use `getProviders({ filters: { search: query } })` instead. */
export async function searchProviders(
  query: string,
  limit: number = 10
): Promise<ServiceProviderCardData[]> {
  const supabase = await createClient();
  
  try {
    let dbQuery = supabase
      .from("service_providers")
      .select(`${SP_BASE_COLUMNS}, ${PS_JOIN}, ${AREA_JOIN}`)
      .eq("account_status", "active");

    // Full-text search with prefix matching (SC-7)
    const words = query
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    if (words.length > 0) {
      const tsQuery = words.map((w) => `'${w}':*`).join(" & ");
      dbQuery = dbQuery.textSearch("search_vector", tsQuery, { config: "english" });
    } else if (query.trim().length > 0) {
      // Fallback for very short terms
      const raw = query.trim();
      dbQuery = dbQuery.or(
        `business_name.ilike.%${raw}%,bio.ilike.%${raw}%,tagline.ilike.%${raw}%`
      );
    }

    dbQuery = dbQuery
      .order("verification_badge", { ascending: false })
      .order("average_rating", { ascending: false, nullsFirst: false })
      .limit(limit);

    const { data, error } = await dbQuery;
    
    if (error) {
      console.error("Error searching providers:", JSON.stringify(error, null, 2));
      return [];
    }
    
    return ((data as any[]) || []).map(mapProviderRow);
  } catch (error) {
    console.error("Error in searchProviders:", error);
    return [];
  }
}

// =============================================================================
// GET SIMILAR PROVIDERS
// =============================================================================

export async function getSimilarProviders(
  providerId: string,
  limit: number = 4
): Promise<ServiceProviderCardData[]> {
  const supabase = await createClient();
  
  try {
    // First get the current provider's categories
    const { data: currentProvider } = await supabase
      .from("service_providers")
      .select(`
        provider_services (
          service:services (
            subcategory:service_subcategories (
              category_id
            )
          )
        )
      `)
      .eq("id", providerId)
      .single();
    
    if (!currentProvider) return [];
    
    const currentProviderData = currentProvider as any;
    
    // Extract categories
    const categories = new Set<string>();
    (currentProviderData.provider_services || []).forEach((ps: any) => {
      if (ps.service?.subcategory?.category_id) {
        categories.add(ps.service.subcategory.category_id);
      }
    });
    
    // Fetch similar providers (active, excluding current)
    const { data, error } = await supabase
      .from("service_providers")
      .select(`${SP_BASE_COLUMNS}, ${PS_JOIN}, ${AREA_JOIN}`)
      .eq("account_status", "active")
      .neq("id", providerId)
      .order("average_rating", { ascending: false, nullsFirst: false })
      .limit(limit * 2);
    
    if (error) {
      console.error("Error fetching similar providers:", JSON.stringify(error, null, 2));
      return [];
    }
    
    const providers: ServiceProviderCardData[] = ((data as any[]) || []).map(mapProviderRow);
    
    // Prioritize providers in same categories
    const categoryArray = Array.from(categories);
    const withMatchingCategory = providers.filter((p) =>
      p.categories.some((c) => categoryArray.includes(c))
    );
    const others = providers.filter(
      (p) => !p.categories.some((c) => categoryArray.includes(c))
    );
    
    return [...withMatchingCategory, ...others].slice(0, limit);
  } catch (error) {
    console.error("Error in getSimilarProviders:", error);
    return [];
  }
}

// =============================================================================
// CHECK IF PROVIDER IS SAVED
// =============================================================================

export async function isProviderSaved(providerId: string): Promise<boolean> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data, error } = await supabase
      .from("saved_providers")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider_id", providerId)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking saved provider:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in isProviderSaved:", error);
    return false;
  }
}

// =============================================================================
// TOGGLE SAVE PROVIDER
// =============================================================================

export async function toggleSaveProvider(
  providerId: string
): Promise<{ saved: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { saved: false, error: "Not authenticated" };
    }
    
    // Check if already saved
    const { data: existing } = await supabase
      .from("saved_providers")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider_id", providerId)
      .maybeSingle();
    
    // Cast for Supabase type inference
    const existingData = existing as { id: string } | null;
    
    if (existingData) {
      // Remove
      const { error } = await supabase
        .from("saved_providers")
        .delete()
        .eq("id", existingData.id);
      
      if (error) throw error;
      return { saved: false };
    } else {
      // Add - use type assertion for Supabase insert
      const { error } = await supabase
        .from("saved_providers")
        .insert({
          user_id: user.id,
          provider_id: providerId,
        } as any);
      
      if (error) throw error;
      return { saved: true };
    }
  } catch (error) {
    console.error("Error in toggleSaveProvider:", error);
    return {
      saved: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET USER'S SAVED PROVIDERS
// =============================================================================

export async function getSavedProviders(): Promise<ServiceProviderCardData[]> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from("saved_providers")
      .select(`
        provider:service_providers (
          ${SP_BASE_COLUMNS},
          ${PS_JOIN},
          ${AREA_JOIN}
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching saved providers:", JSON.stringify(error, null, 2));
      return [];
    }
    
    // Transform data
    return (data || [])
      .map((item: any) => {
        const provider = item.provider;
        if (!provider) return null;
        return mapProviderRow(provider);
      })
      .filter(Boolean) as ServiceProviderCardData[];
  } catch (error) {
    console.error("Error in getSavedProviders:", error);
    return [];
  }
}
