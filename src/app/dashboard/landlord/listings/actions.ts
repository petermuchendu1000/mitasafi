/**
 * Listing Server Actions
 * 
 * Server-side actions for managing listings:
 * - Pause/Resume listings
 * - Delete listings
 * - Update listing status
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================

export type ListingStatus = "draft" | "active" | "paused" | "rented" | "expired" | "archived";

interface ActionResult {
  success: boolean;
  error?: string;
}

// Helper type for listing query results
interface ListingBasic {
  id: string;
  landlord_id: string;
  status: string;
}

interface ListingWithPhotos extends ListingBasic {
  title: string;
  photos: Array<{ url?: string }> | null;
}

// =============================================================================
// PAUSE LISTING
// =============================================================================

export async function pauseListing(listingId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in to pause a listing" };
    }

    // Verify ownership and get current status
    const { data, error: fetchError } = await supabase
      .from("listings")
      .select("id, landlord_id, status")
      .eq("id", listingId)
      .single();

    const listing = data as ListingBasic | null;

    if (fetchError || !listing) {
      return { success: false, error: "Listing not found" };
    }

    if (listing.landlord_id !== user.id) {
      return { success: false, error: "You don't have permission to pause this listing" };
    }

    if (listing.status !== "active") {
      return { success: false, error: "Only active listings can be paused" };
    }

    // Update status to paused
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("listings")
      .update({ 
        status: "paused",
        updated_at: new Date().toISOString()
      })
      .eq("id", listingId);

    if (updateError) {
      console.error("Error pausing listing:", updateError);
      return { success: false, error: "Failed to pause listing" };
    }

    // Revalidate the listings page
    revalidatePath("/dashboard/landlord/listings");

    return { success: true };
  } catch (error) {
    console.error("Error in pauseListing:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// RESUME LISTING
// =============================================================================

export async function resumeListing(listingId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in to resume a listing" };
    }

    // Verify ownership and get current status
    const { data, error: fetchError } = await supabase
      .from("listings")
      .select("id, landlord_id, status")
      .eq("id", listingId)
      .single();

    const listing = data as ListingBasic | null;

    if (fetchError || !listing) {
      return { success: false, error: "Listing not found" };
    }

    if (listing.landlord_id !== user.id) {
      return { success: false, error: "You don't have permission to resume this listing" };
    }

    if (listing.status !== "paused") {
      return { success: false, error: "Only paused listings can be resumed" };
    }

    // Update status to active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("listings")
      .update({ 
        status: "active",
        updated_at: new Date().toISOString()
      })
      .eq("id", listingId);

    if (updateError) {
      console.error("Error resuming listing:", updateError);
      return { success: false, error: "Failed to resume listing" };
    }

    // Revalidate the listings page
    revalidatePath("/dashboard/landlord/listings");

    return { success: true };
  } catch (error) {
    console.error("Error in resumeListing:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// DELETE LISTING
// =============================================================================

export async function deleteListing(listingId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in to delete a listing" };
    }

    // Verify ownership
    const { data, error: fetchError } = await supabase
      .from("listings")
      .select("id, landlord_id, title, photos")
      .eq("id", listingId)
      .single();

    const listing = data as ListingWithPhotos | null;

    if (fetchError || !listing) {
      return { success: false, error: "Listing not found" };
    }

    if (listing.landlord_id !== user.id) {
      return { success: false, error: "You don't have permission to delete this listing" };
    }

    // Delete associated photos from storage
    if (listing.photos && Array.isArray(listing.photos) && listing.photos.length > 0) {
      const photoPaths = listing.photos
        .map((photo) => {
          if (!photo.url) return null;
          // Extract path from URL: https://.../storage/v1/object/public/listings/[path]
          const match = photo.url.match(/\/listings\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      if (photoPaths.length > 0) {
        const { error: storageError } = await supabase
          .storage
          .from("listings")
          .remove(photoPaths);

        if (storageError) {
          console.error("Error deleting photos:", storageError);
          // Continue with deletion even if photo cleanup fails
        }
      }
    }

    // Delete the listing
    const { error: deleteError } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (deleteError) {
      console.error("Error deleting listing:", deleteError);
      return { success: false, error: "Failed to delete listing" };
    }

    // Revalidate the listings page
    revalidatePath("/dashboard/landlord/listings");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteListing:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// MARK AS RENTED
// =============================================================================

export async function markAsRented(listingId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in" };
    }

    // Verify ownership
    const { data, error: fetchError } = await supabase
      .from("listings")
      .select("id, landlord_id, status")
      .eq("id", listingId)
      .single();

    const listing = data as ListingBasic | null;

    if (fetchError || !listing) {
      return { success: false, error: "Listing not found" };
    }

    if (listing.landlord_id !== user.id) {
      return { success: false, error: "You don't have permission to update this listing" };
    }

    // Update status to rented
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("listings")
      .update({ 
        status: "rented",
        updated_at: new Date().toISOString()
      })
      .eq("id", listingId);

    if (updateError) {
      console.error("Error marking as rented:", updateError);
      return { success: false, error: "Failed to update listing" };
    }

    revalidatePath("/dashboard/landlord/listings");

    return { success: true };
  } catch (error) {
    console.error("Error in markAsRented:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// DUPLICATE LISTING
// =============================================================================

export async function duplicateListing(listingId: string): Promise<ActionResult & { newListingId?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in" };
    }

    // Fetch the original listing
    const { data: original, error: fetchError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (fetchError || !original) {
      return { success: false, error: "Listing not found" };
    }

    // Type assertion for the listing
    const listing = original as Record<string, unknown>;

    if (listing.landlord_id !== user.id) {
      return { success: false, error: "You don't have permission to duplicate this listing" };
    }

    // Create a copy with modified fields - exclude auto-generated fields
    const { 
      id, 
      created_at, 
      updated_at, 
      published_at, 
      views_count, 
      inquiries_count,
      applications_count,
      ...listingData 
    } = listing;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newListing, error: insertError } = await (supabase as any)
      .from("listings")
      .insert({
        ...listingData,
        title: `${listing.title} (Copy)`,
        status: "draft",
        views_count: 0,
        inquiries_count: 0,
        applications_count: 0,
      })
      .select("id")
      .single();

    if (insertError || !newListing) {
      console.error("Error duplicating listing:", insertError);
      return { success: false, error: "Failed to duplicate listing" };
    }

    revalidatePath("/dashboard/landlord/listings");

    const result = newListing as { id: string };
    return { success: true, newListingId: result.id };
  } catch (error) {
    console.error("Error in duplicateListing:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
