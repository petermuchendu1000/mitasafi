/**
 * Landlord Listings Page
 * 
 * Displays all vacancy listings created by the landlord.
 * Purpose: Advertise vacancies and attract quality tenants.
 * Supports both residential and commercial listings.
 * Features:
 * - Empty state for new landlords
 * - Listing cards with views/applications metrics
 * - Filtering and sorting
 * - Quick actions
 */

import { createClient } from "@/lib/supabase/server";
import { ListingsEmptyState } from "./ListingsEmptyState";
import { ListingsHeader } from "./ListingsHeader";
import { ListingsGrid } from "./ListingsGrid";
import type { ListingCardData } from "./ListingCard";

export default async function ListingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch listings from database (includes commercial fields)
  const { data: listings, error } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      property_type,
      area,
      rent_amount,
      currency,
      bedrooms,
      bathrooms,
      size_sqft,
      photos,
      cover_photo,
      status,
      views_count,
      inquiries_count,
      created_at,
      published_at,
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
    .eq("landlord_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching listings:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }

  const listingsData = (listings || []) as unknown as ListingCardData[];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <ListingsHeader listingCount={listingsData.length} />

      {/* Content */}
      {listingsData.length === 0 ? (
        <ListingsEmptyState />
      ) : (
        <ListingsGrid listings={listingsData} />
      )}
    </div>
  );
}
