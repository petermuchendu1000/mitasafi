/**
 * Listings Search Service
 * 
 * Server-side functions for searching and filtering listings.
 * Supports pagination, area filtering, price range, and property types.
 */

import { createClient } from "@/lib/supabase/server";
import type { ListingCard, ListingRow } from "./types";
import { generateListingSlug, parseListingPhotos } from "./types";

// Search parameters interface
export interface SearchParams {
  // Location
  area?: string;
  city?: string;
  
  // Property
  propertyType?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  
  // Price
  minPrice?: number;
  maxPrice?: number;
  
  // Features
  verified?: boolean;
  availableNow?: boolean;
  
  // Pagination
  page?: number;
  limit?: number;
  
  // Sorting
  sortBy?: "newest" | "price_low" | "price_high" | "popular";
  
  // Search query
  query?: string;
}

export interface SearchResult {
  listings: ListingCard[];
  total: number;
  page: number;
  totalPages: number;
  error: string | null;
}

// Raw listing type from database query (includes commercial fields)
interface RawSearchListing {
  id: string;
  title: string;
  property_type: string;
  area: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  currency: string | null;
  cover_photo: string | null;
  photos: unknown;
  is_verified: boolean;
  available_now: boolean;
  published_at: string | null;
  views_count: number;
  size_sqft: number | null;
  furnishing: string | null;
  floor_level: string | null;
  parking: string | null;
  parking_spaces: number | null;
  // Commercial fields
  listing_category: "residential" | "commercial" | null;
  commercial_type: string | null;
  size_sqm: number | null;
  workstation_capacity: number | null;
  building_grade: string | null;
  seating_capacity: number | null;
  frontage_width_m: number | null;
  clear_height_m: number | null;
  loading_docks: number | null;
  parking_spaces_count: number | null;
  room_count: number | null;
  plot_size_acres: number | null;
}

/**
 * Search listings with filters and pagination
 */
export async function searchListings(params: SearchParams): Promise<SearchResult> {
  const supabase = await createClient();
  
  const {
    area,
    city,
    propertyType,
    minBedrooms,
    maxBedrooms,
    minPrice,
    maxPrice,
    verified,
    availableNow,
    page = 1,
    limit = 12,
    sortBy = "newest",
    query,
  } = params;

  try {
    // Build the query (includes commercial fields for both residential and commercial)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queryBuilder = (supabase as any)
      .from("listings")
      .select(`
        id,
        title,
        property_type,
        area,
        city,
        bedrooms,
        bathrooms,
        rent_amount,
        currency,
        cover_photo,
        photos,
        is_verified,
        available_now,
        published_at,
        views_count,
        size_sqft,
        furnishing,
        floor_level,
        parking,
        parking_spaces,
        listing_category,
        commercial_type,
        size_sqm,
        workstation_capacity,
        building_grade,
        seating_capacity,
        frontage_width_m,
        clear_height_m,
        loading_docks,
        parking_spaces_count,
        room_count,
        plot_size_acres
      `, { count: "exact" })
      .eq("status", "active");

    // Apply filters
    if (area) {
      queryBuilder = queryBuilder.ilike("area", `%${area}%`);
    }

    if (city) {
      queryBuilder = queryBuilder.eq("city", city);
    }

    if (propertyType) {
      queryBuilder = queryBuilder.eq("property_type", propertyType);
    }

    if (minBedrooms !== undefined) {
      queryBuilder = queryBuilder.gte("bedrooms", minBedrooms);
    }

    if (maxBedrooms !== undefined) {
      queryBuilder = queryBuilder.lte("bedrooms", maxBedrooms);
    }

    if (minPrice !== undefined) {
      queryBuilder = queryBuilder.gte("rent_amount", minPrice);
    }

    if (maxPrice !== undefined) {
      queryBuilder = queryBuilder.lte("rent_amount", maxPrice);
    }

    if (verified === true) {
      queryBuilder = queryBuilder.eq("is_verified", true);
    }

    if (availableNow === true) {
      queryBuilder = queryBuilder.eq("available_now", true);
    }

    // Text search in title and description
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,area.ilike.%${query}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case "price_low":
        queryBuilder = queryBuilder.order("rent_amount", { ascending: true });
        break;
      case "price_high":
        queryBuilder = queryBuilder.order("rent_amount", { ascending: false });
        break;
      case "popular":
        queryBuilder = queryBuilder.order("views_count", { ascending: false });
        break;
      case "newest":
      default:
        queryBuilder = queryBuilder.order("published_at", { ascending: false, nullsFirst: false });
        break;
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    // Execute query
    const { data, count, error } = await queryBuilder;

    if (error) {
      throw error;
    }

    const listings = (data as RawSearchListing[] | null) || [];
    const total = count || 0;

    // Transform to ListingCard format
    const cards: ListingCard[] = listings.map((listing) => {
      let coverPhoto = listing.cover_photo;
      if (!coverPhoto && listing.photos) {
        const photos = parseListingPhotos(listing.photos);
        coverPhoto = photos[0]?.url || null;
      }

      return {
        id: listing.id,
        title: listing.title,
        slug: generateListingSlug(listing as unknown as ListingRow),
        property_type: listing.property_type,
        area: listing.area,
        city: listing.city,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        rent_amount: listing.rent_amount,
        currency: listing.currency || "KES",
        cover_photo: coverPhoto,
        is_verified: listing.is_verified,
        available_now: listing.available_now,
        published_at: listing.published_at,
        // Residential details
        size_sqft: listing.size_sqft,
        furnishing: listing.furnishing as ListingCard["furnishing"],
        floor_level: listing.floor_level,
        parking: listing.parking as ListingCard["parking"],
        parking_spaces: listing.parking_spaces,
        // Commercial fields
        listing_category: listing.listing_category,
        commercial_type: listing.commercial_type as ListingCard["commercial_type"],
        size_sqm: listing.size_sqm,
        workstation_capacity: listing.workstation_capacity,
        building_grade: listing.building_grade,
        seating_capacity: listing.seating_capacity,
        frontage_width_m: listing.frontage_width_m,
        clear_height_m: listing.clear_height_m,
        loading_docks: listing.loading_docks,
        parking_spaces_count: listing.parking_spaces_count,
        room_count: listing.room_count,
        plot_size_acres: listing.plot_size_acres,
      };
    });

    return {
      listings: cards,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      error: null,
    };
  } catch (error) {
    console.error("Error searching listings:", error);
    return {
      listings: [],
      total: 0,
      page: 1,
      totalPages: 0,
      error: error instanceof Error ? error.message : "Failed to search listings",
    };
  }
}

/**
 * Get available filter options (areas, price ranges, etc.)
 */
export async function getFilterOptions(): Promise<{
  areas: string[];
  propertyTypes: string[];
  priceRanges: { min: number; max: number };
}> {
  const supabase = await createClient();

  try {
    // Get unique areas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: areaData } = await (supabase as any)
      .from("listings")
      .select("area")
      .eq("status", "active")
      .order("area");

    const areas = [...new Set((areaData as { area: string }[] | null)?.map(d => d.area) || [])];

    // Get unique property types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: typeData } = await (supabase as any)
      .from("listings")
      .select("property_type")
      .eq("status", "active");

    const propertyTypes = [...new Set((typeData as { property_type: string }[] | null)?.map(d => d.property_type) || [])];

    // Get price range
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: priceData } = await (supabase as any)
      .from("listings")
      .select("rent_amount")
      .eq("status", "active")
      .order("rent_amount");

    const prices = (priceData as { rent_amount: number }[] | null)?.map(d => d.rent_amount) || [];
    const priceRanges = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 200000,
    };

    return { areas, propertyTypes, priceRanges };
  } catch (error) {
    console.error("Error getting filter options:", error);
    return {
      areas: [],
      propertyTypes: [],
      priceRanges: { min: 0, max: 200000 },
    };
  }
}

/**
 * Get listing counts by area for homepage/browse
 */
export async function getListingCountsByArea(): Promise<{ area: string; count: number }[]> {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("listings")
      .select("area")
      .eq("status", "active");

    if (!data) return [];

    // Count by area
    const counts: Record<string, number> = {};
    (data as { area: string }[]).forEach(({ area }) => {
      counts[area] = (counts[area] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error getting listing counts:", error);
    return [];
  }
}
