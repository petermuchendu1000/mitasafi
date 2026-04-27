/**
 * Listing Service
 * 
 * Functions for creating, updating, and managing vacancy listings.
 * Uses Supabase client for database operations.
 */

import { createClient } from "@/lib/supabase/client";
import type { PropertyFormData, PropertyPhoto } from "./types";

// Note: We use explicit types here instead of Database["public"]["Tables"]["listings"]
// because the TypeScript server sometimes has issues recognizing dynamically added tables.
// This is a common pattern when working with Supabase schemas that evolve.

// =============================================================================
// TYPES
// =============================================================================

export interface ListingInsertData {
  landlord_id: string;
  title: string;
  description: string;
  property_type: string;
  building_name: string;
  address: string;
  area: string;
  city: string;
  landmarks: string | null;
  latitude: number | null;
  longitude: number | null;
  hide_exact_address: boolean;
  bedrooms: number;
  bathrooms: number;
  size_sqft: number | null;
  size_unit: string;
  floor_level: string | null;
  total_floors: number | null;
  year_built: number | null;
  condition: string | null;
  furnishing: string;
  amenities: string[];
  parking: string;
  parking_spaces: number;
  pet_policy: string;
  smoking_policy: string;
  security_features: Record<string, unknown>;
  utilities: Record<string, unknown>;
  photos: Array<{
    id: string;
    url: string;
    path: string;
    category: string;
    sort_order: number;
  }>;
  cover_photo: string | null;
  video_url: string | null;
  rent_amount: number;
  currency: string;
  rent_negotiable: boolean;
  deposit_months: number;
  deposit_amount: number | null;
  service_charge: number | null;
  lease_term: string;
  min_lease_months: number;
  available_from: string | null;
  available_now: boolean;
  payment_methods: string[];
  rent_includes: string[];
  status: "draft" | "active";
  published_at?: string;
}

export interface PublishResult {
  success: boolean;
  listingId?: string;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Transform form data into database insert format
 */
function transformFormDataToInsert(
  formData: PropertyFormData,
  userId: string,
  status: "draft" | "active"
): ListingInsertData {
  const photos = (formData.photos || [])
    .filter((p): p is PropertyPhoto & { url: string; path: string } => 
      !!p.url && !!p.path && !p.isUploading
    )
    .map((photo, index) => ({
      id: photo.id,
      url: photo.url,
      path: photo.path,
      category: photo.category || "extra",
      sort_order: index,
    }));

  // Find cover photo
  const coverPhoto = photos.find(p => p.category === "cover")?.url 
    || photos[0]?.url 
    || null;

  return {
    landlord_id: userId,
    title: formData.title,
    description: formData.description,
    property_type: formData.propertyType || "apartment",
    building_name: formData.buildingName,
    address: formData.address || formData.streetAddress,
    area: formData.area,
    city: formData.city || "Nairobi",
    landmarks: formData.landmarks || null,
    latitude: formData.latitude,
    longitude: formData.longitude,
    hide_exact_address: formData.hideExactAddress,
    bedrooms: formData.bedrooms,
    bathrooms: formData.bathrooms,
    size_sqft: formData.sizeSqft,
    size_unit: formData.sizeUnit,
    floor_level: formData.floorLevel || null,
    total_floors: formData.totalFloors,
    year_built: formData.yearBuilt,
    condition: formData.condition,
    furnishing: formData.furnishing,
    amenities: formData.amenities,
    parking: formData.parking,
    parking_spaces: formData.parkingSpaces,
    pet_policy: formData.petPolicy,
    smoking_policy: formData.smokingPolicy,
    security_features: {
      guard: formData.securityGuard,
      cctv: formData.cctv,
      access_control: formData.accessControl,
    },
    utilities: {
      water: formData.waterReliability,
      has_storage: formData.hasWaterStorage,
      backup_power: formData.backupPower,
      internet_ready: formData.internetReady,
      isps: formData.availableIsps,
    },
    photos,
    cover_photo: coverPhoto,
    video_url: formData.videoUrl || null,
    rent_amount: formData.rentAmount || 0,
    currency: formData.currency,
    rent_negotiable: formData.rentNegotiable,
    deposit_months: formData.depositMonths,
    deposit_amount: formData.depositAmount,
    service_charge: formData.serviceCharge,
    lease_term: formData.leaseTerm,
    min_lease_months: formData.minLeaseMonths,
    available_from: formData.availableFrom,
    available_now: formData.availableNow,
    payment_methods: formData.paymentMethods,
    rent_includes: formData.rentIncludes,
    status,
    ...(status === "active" && { published_at: new Date().toISOString() }),
  };
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Save listing as draft
 */
export async function saveDraft(
  formData: PropertyFormData,
  existingDraftId?: string | null
): Promise<PublishResult> {
  const supabase = createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in to save a draft" };
    }

    const insertData = transformFormDataToInsert(formData, user.id, "draft");

    if (existingDraftId) {
      // Update existing draft
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("listings")
        .update(insertData)
        .eq("id", existingDraftId)
        .eq("landlord_id", user.id) // Security: ensure user owns the draft
        .select("id")
        .single();

      if (error) throw error;
      return { success: true, listingId: data?.id };
    } else {
      // Create new draft
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("listings")
        .insert(insertData)
        .select("id")
        .single();

      if (error) throw error;
      return { success: true, listingId: data?.id };
    }
  } catch (error) {
    console.error("Error saving draft:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save draft" 
    };
  }
}

/**
 * Publish listing (create as active or update draft to active)
 */
export async function publishListing(
  formData: PropertyFormData,
  existingDraftId?: string | null
): Promise<PublishResult> {
  const supabase = createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in to publish" };
    }

    // Validate required fields
    if (!formData.title || formData.title.trim().length < 10) {
      return { success: false, error: "Title must be at least 10 characters" };
    }
    if (!formData.description || formData.description.trim().length < 50) {
      return { success: false, error: "Description must be at least 50 characters" };
    }
    
    // Validate pricing based on listing category
    const isCommercial = formData.listingCategory === "commercial";
    if (isCommercial) {
      // Commercial pricing validation
      const commercial = formData.commercial;
      const pricingModel = commercial?.pricingModel || "fixed";
      
      if (pricingModel === "per_sqm") {
        if (!commercial?.rentPerSqm || commercial.rentPerSqm <= 0) {
          return { success: false, error: "Please enter a valid rent per sqm" };
        }
      } else if (pricingModel === "revenue_share") {
        if (!commercial?.revenueSharePercent || commercial.revenueSharePercent <= 0) {
          return { success: false, error: "Please enter a valid revenue share percentage" };
        }
      } else {
        // Fixed or per_unit pricing - check rentAmount
        if (!formData.rentAmount || formData.rentAmount <= 0) {
          return { success: false, error: "Please enter a valid rent amount" };
        }
      }
    } else {
      // Residential pricing validation
      if (!formData.rentAmount || formData.rentAmount <= 0) {
        return { success: false, error: "Please enter a valid rent amount" };
      }
    }
    
    if (!formData.area) {
      return { success: false, error: "Please select a location/area" };
    }

    const insertData = transformFormDataToInsert(formData, user.id, "active");

    if (existingDraftId) {
      // Publish existing draft
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("listings")
        .update(insertData)
        .eq("id", existingDraftId)
        .eq("landlord_id", user.id) // Security: ensure user owns the draft
        .select("id")
        .single();

      if (error) throw error;
      return { success: true, listingId: data?.id };
    } else {
      // Create and publish new listing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("listings")
        .insert(insertData)
        .select("id")
        .single();

      if (error) throw error;
      return { success: true, listingId: data?.id };
    }
  } catch (error) {
    console.error("Error publishing listing:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to publish listing" 
    };
  }
}

/**
 * Get listing by ID
 */
export async function getListing(listingId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all listings for current user
 */
export async function getMyListings() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
