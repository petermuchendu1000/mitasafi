/**
 * Get Listing
 * 
 * Fetches a single listing by ID with landlord info.
 * Used by the listing detail page.
 */

import { createClient } from "@/lib/supabase/server";
import type { Listing, LandlordInfo, PropertyType } from "./types";
import { 
  parseListingPhotos, 
  parseSecurityFeatures, 
  parseUtilities 
} from "./types";

export interface GetListingResult {
  listing: Listing | null;
  error: string | null;
}

// Type for the raw listing data from Supabase
interface RawListingData {
  id: string;
  landlord_id: string;
  building_id: string | null;
  unit_id: string | null;
  
  // Basic Info
  title: string;
  description: string;
  property_type: string;
  
  // Location
  building_name: string | null;
  address: string | null;
  area: string;
  city: string;
  landmarks: string | null;
  latitude: number | null;
  longitude: number | null;
  hide_exact_address: boolean;
  
  // Property Details
  bedrooms: number;
  bathrooms: number;
  size_sqft: number | null;
  size_unit: string | null;
  floor_level: string | null;
  total_floors: number | null;
  year_built: number | null;
  condition: string | null;
  furnishing: string;
  
  // Amenities
  amenities: string[] | null;
  
  // Parking
  parking: string;
  parking_spaces: number;
  
  // Policies
  pet_policy: string;
  smoking_policy: string;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  children_allowed: boolean;
  
  // Security & Utilities (JSON)
  security_features: unknown;
  utilities: unknown;
  
  // Photos
  photos: unknown;
  cover_photo: string | null;
  video_url: string | null;
  
  // Pricing
  rent_amount: number;
  currency: string;
  rent_negotiable: boolean;
  deposit_months: number | null;
  deposit_amount: number | null;
  service_charge: number | null;
  
  // Lease Terms
  lease_term: string;
  min_lease_months: number;
  
  // Availability
  available_from: string | null;
  available_now: boolean;
  
  // Payment
  payment_methods: string[];
  rent_includes: string[] | null;
  
  // Status
  status: string;
  
  // Analytics
  views_count: number;
  inquiries_count: number;
  
  // Verification
  is_verified: boolean;
  
  // Timestamps
  published_at: string | null;
  created_at: string;
  updated_at: string;
  
  // No landlord join: it is fetched separately from public_profiles.
  // See getListingById and migration 20261028000000_restrict_profiles_pii.
}

/**
 * Fetch a listing by ID (server-side)
 * Includes landlord profile info and increments view count
 */
export async function getListingById(
  listingId: string,
  options: { incrementViews?: boolean; includeUnavailable?: boolean } = {}
): Promise<GetListingResult> {
  const supabase = await createClient();
  const { incrementViews = true, includeUnavailable = false } = options;

  try {
    // Fetch listing with landlord profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("listings")
      .select("*")
      .eq("id", listingId);
    
    // If not including unavailable, only get active listings
    if (!includeUnavailable) {
      query = query.eq("status", "active");
    }
    
    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") {
        return { listing: null, error: "Listing not found" };
      }
      throw error;
    }

    if (!data) {
      return { listing: null, error: "Listing not found" };
    }

    const listing = data as RawListingData;

    // Increment view count only for active listings (fire and forget)
    if (incrementViews && listing.status === "active") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("increment_listing_views", { listing_id: listingId }).then(() => {});
    }

    // Landlord info comes from public_profiles, a view that excludes email and
    // phone. public.profiles itself is self-read only as of migration
    // 20261028000000_restrict_profiles_pii, so it cannot be embedded here.
    // A failure to resolve the landlord must not fail the listing: the page
    // renders without the landlord block, exactly as it already does when the
    // viewer is logged out.
    const { data: landlordRow, error: landlordError } = await (supabase as any)
      .from("public_profiles")
      .select("id, full_name, avatar_url, is_verified")
      .eq("id", listing.landlord_id)
      .maybeSingle();

    if (landlordError) {
      console.error("Error fetching landlord profile:", landlordError);
    }

    const profileData = (landlordRow as LandlordInfo | null) ?? null;
    
    // Cast to Listing type with proper field transformations
    const parsedListing: Listing = {
      ...listing,
      property_type: listing.property_type as PropertyType,
      size_unit: listing.size_unit as "sqft" | "sqm" | null,
      condition: listing.condition as Listing["condition"],
      furnishing: listing.furnishing as Listing["furnishing"],
      parking: listing.parking as Listing["parking"],
      pet_policy: listing.pet_policy as Listing["pet_policy"],
      smoking_policy: listing.smoking_policy as Listing["smoking_policy"],
      lease_term: listing.lease_term as Listing["lease_term"],
      photos: parseListingPhotos(listing.photos),
      security_features: parseSecurityFeatures(listing.security_features),
      utilities: parseUtilities(listing.utilities),
      landlord: profileData || undefined,
    };

    return { listing: parsedListing, error: null };
  } catch (error) {
    console.error("Error fetching listing:", error);
    return { 
      listing: null, 
      error: error instanceof Error ? error.message : "Failed to fetch listing" 
    };
  }
}

/**
 * Fetch a listing by slug (for SEO-friendly URLs)
 * Extracts ID from end of slug: "2br-apartment-kilimani-abc12345" -> "abc12345..."
 */
export async function getListingBySlug(slug: string): Promise<GetListingResult> {
  // Extract the ID portion (last segment after final hyphen, should be 8+ chars)
  const parts = slug.split("-");
  const potentialId = parts[parts.length - 1];
  
  if (!potentialId || potentialId.length < 8) {
    return { listing: null, error: "Invalid listing URL" };
  }

  // Try to find listing where ID starts with this prefix
  const supabase = await createClient();
  
  // Fetch active listings and filter by ID prefix
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allListings, error } = await (supabase as any)
    .from("listings")
    .select("id")
    .eq("status", "active")
    .limit(100);

  if (error) {
    return { listing: null, error: "Failed to search listings" };
  }

  const matchedListing = (allListings as { id: string }[] | null)?.find(
    l => l.id.startsWith(potentialId)
  );

  if (!matchedListing) {
    return { listing: null, error: "Listing not found" };
  }

  return getListingById(matchedListing.id);
}

/**
 * Check if user can view full listing details
 * (for future premium features)
 */
export async function canViewFullListing(listingId: string): Promise<boolean> {
  // For now, all active listings are fully viewable
  // Future: Check if user has premium, if listing is verified-only, etc.
  return true;
}
