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
  /** Omitted entirely when an edit must not change the listing's status. */
  status?: "draft" | "active";
  published_at?: string;
}

/**
 * What a save should do to `status`.
 *
 *   "draft"     set it to draft  — a new draft, or a draft staying a draft
 *   "active"    set it to active — publishing
 *   "preserve"  leave it alone   — an edit of a listing that is already live,
 *                                  paused or rented
 *
 * "preserve" exists because this service was written for the CREATE wizard,
 * where every save is either a draft or a publish. The EDIT page reuses it with
 * the listing's own id as `existingDraftId`, so "draft" there meant UPDATE ...
 * SET status='draft' on a live listing — silently unpublishing it while the
 * toast said "Your listing has been updated".
 */
export type StatusIntent = "draft" | "active" | "preserve";

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
  intent: StatusIntent,
): ListingInsertData {
  const photos = (formData.photos || [])
    .filter(
      (p): p is PropertyPhoto & { url: string; path: string } =>
        !!p.url && !!p.path && !p.isUploading,
    )
    .map((photo, index) => ({
      id: photo.id,
      url: photo.url,
      path: photo.path,
      category: photo.category || "extra",
      sort_order: index,
    }));

  // Find cover photo
  const coverPhoto =
    photos.find((p) => p.category === "cover")?.url || photos[0]?.url || null;

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
    // Omitted when preserving, so the UPDATE does not mention the column at all.
    ...(intent === "preserve" ? {} : { status: intent }),
    // Stamped only when actually publishing. The defect this fixes was an edit
    // of a LIVE listing resetting the date, and that is handled by the intent
    // being "preserve" — which omits this key with status. A separate
    // "don't overwrite an existing date" guard was tried here and a mutation
    // run proved it dead: no case reaches this line with intent "active" AND a
    // prior date except re-publishing a draft, where stamping now is right.
    ...(intent === "active" ? { published_at: new Date().toISOString() } : {}),
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
  existingDraftId?: string | null,
  /**
   * Set by the EDIT page. Without it this writes status='draft', which on an
   * existing live listing unpublishes it. The CREATE wizard passes nothing and
   * keeps its original behaviour.
   */
  options?: { preserveStatus?: boolean },
): Promise<PublishResult> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in to save a draft" };
    }

    const insertData = transformFormDataToInsert(
      formData,
      user.id,
      options?.preserveStatus ? "preserve" : "draft",
    );

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
      error: error instanceof Error ? error.message : "Failed to save draft",
    };
  }
}

/**
 * Publish listing (create as active or update draft to active)
 */
export async function publishListing(
  formData: PropertyFormData,
  existingDraftId?: string | null,
  /**
   * Set by the EDIT page, which knows the row it loaded.
   *
   * `currentStatus` is what the button means: on the edit page it reads
   * "Update Listing", and updating a PAUSED listing must not quietly resume
   * it. Only a draft is actually being published. The CREATE wizard passes
   * nothing, so a new listing still goes active.
   *
   */
  options?: { currentStatus?: string | null },
): Promise<PublishResult> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in to publish" };
    }

    // Validate required fields
    if (!formData.title || formData.title.trim().length < 10) {
      return { success: false, error: "Title must be at least 10 characters" };
    }
    if (!formData.description || formData.description.trim().length < 50) {
      return {
        success: false,
        error: "Description must be at least 50 characters",
      };
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
        if (
          !commercial?.revenueSharePercent ||
          commercial.revenueSharePercent <= 0
        ) {
          return {
            success: false,
            error: "Please enter a valid revenue share percentage",
          };
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

    // A listing that is already live, paused or rented keeps its status; only a
    // draft (or a brand-new listing) is being published by this button.
    const intent: StatusIntent =
      options?.currentStatus && options.currentStatus !== "draft"
        ? "preserve"
        : "active";

    const insertData = transformFormDataToInsert(formData, user.id, intent);

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
      error:
        error instanceof Error ? error.message : "Failed to publish listing",
    };
  }
}

/**
 * Get listing by ID
 */
/**
 * Load a listing for its OWNER to edit.
 *
 * The landlord filter is the point of this function. Without it, the view
 * returns any row the underlying public read policy admits — and the public
 * detail page at src/lib/listings/get-listing.ts reads this same view with no
 * owner filter precisely because it must see other people's listings. So an
 * unfiltered read here meant /dashboard/landlord/listings/<any id>/edit would
 * load a stranger's listing into the edit form. The sibling detail page
 * ([id]/page.tsx, a different function of the same name) has always carried
 * this filter; this one did not.
 *
 * The write paths were never exposed — saveDraft and publishListing both carry
 * .eq("landlord_id", user.id) — so this closes a read, not a write.
 */
export async function getListing(listingId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to open a listing.");

  // listings_public: see 20260340000000. The owner branch returns the real
  // address and coordinates, which the edit form needs.
  const { data, error } = await supabase
    .from("listings_public")
    .select("*")
    .eq("id", listingId)
    .eq("landlord_id", user.id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all listings for current user
 */
export async function getMyListings() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // listings_public: see 20260340000000. Scoped to the caller, so every row
  // comes back through the owner branch, unmasked.
  const { data, error } = await supabase
    .from("listings_public")
    .select("*")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
