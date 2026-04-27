/**
 * Get Similar Listings
 * 
 * Fetches listings similar to a given listing for recommendations.
 * Algorithm: Same area, similar price range, same bedroom count.
 * Supports both residential and commercial properties.
 */

import { createClient } from "@/lib/supabase/server";
import type { ListingCard, ListingRow, CommercialType } from "./types";
import { generateListingSlug, parseListingPhotos } from "./types";

export interface GetSimilarResult {
  listings: ListingCard[];
  error: string | null;
}

// Type for raw listing card data from query (includes commercial fields)
interface RawListingCard {
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
  size_sqft: number | null;
  furnishing: string | null;
  floor_level: string | null;
  parking: string | null;
  parking_spaces: number | null;
  // Commercial fields
  listing_category: string | null;
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
 * Fetch similar listings for recommendations
 */
export async function getSimilarListings(
  currentListing: {
    id: string;
    area: string;
    rent_amount: number;
    bedrooms: number;
    property_type: string;
  },
  limit: number = 4
): Promise<GetSimilarResult> {
  const supabase = await createClient();

  try {
    // Price range: 70% to 130% of current listing
    const minPrice = Math.floor(currentListing.rent_amount * 0.7);
    const maxPrice = Math.ceil(currentListing.rent_amount * 1.3);

    // Query similar listings (includes commercial fields)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
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
      `)
      .eq("status", "active")
      .neq("id", currentListing.id)
      .eq("area", currentListing.area)
      .gte("rent_amount", minPrice)
      .lte("rent_amount", maxPrice)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // If not enough results in same area, expand search
    let results: RawListingCard[] = (data || []) as RawListingCard[];
    
    if (results.length < limit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: moreData } = await (supabase as any)
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
        `)
        .eq("status", "active")
        .neq("id", currentListing.id)
        .neq("area", currentListing.area) // Different area
        .eq("bedrooms", currentListing.bedrooms) // Same bedrooms
        .gte("rent_amount", minPrice)
        .lte("rent_amount", maxPrice)
        .order("published_at", { ascending: false })
        .limit(limit - results.length);

      if (moreData) {
        results = [...results, ...(moreData as RawListingCard[])];
      }
    }

    // Transform to ListingCard format
    const cards: ListingCard[] = results.map((listing: RawListingCard) => {
      // Get cover photo, fallback to first photo
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
        size_sqft: listing.size_sqft,
        furnishing: listing.furnishing as ListingCard["furnishing"],
        floor_level: listing.floor_level,
        parking: listing.parking as ListingCard["parking"],
        parking_spaces: listing.parking_spaces,
        // Commercial fields
        listing_category: listing.listing_category as ListingCard["listing_category"],
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

    return { listings: cards, error: null };
  } catch (error) {
    console.error("Error fetching similar listings:", error);
    return { 
      listings: [], 
      error: error instanceof Error ? error.message : "Failed to fetch similar listings" 
    };
  }
}

/**
 * Fetch featured/promoted listings
 * (for homepage or sidebar)
 */
export async function getFeaturedListings(limit: number = 6): Promise<GetSimilarResult> {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
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
      `)
      .eq("status", "active")
      .eq("is_verified", true)
      .order("views_count", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const listings = (data || []) as RawListingCard[];

    const cards: ListingCard[] = listings.map((listing: RawListingCard) => {
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
        size_sqft: listing.size_sqft,
        furnishing: listing.furnishing as ListingCard["furnishing"],
        floor_level: listing.floor_level,
        parking: listing.parking as ListingCard["parking"],
        parking_spaces: listing.parking_spaces,
        // Commercial fields
        listing_category: listing.listing_category as ListingCard["listing_category"],
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

    return { listings: cards, error: null };
  } catch (error) {
    console.error("Error fetching featured listings:", error);
    return { listings: [], error: "Failed to fetch featured listings" };
  }
}
