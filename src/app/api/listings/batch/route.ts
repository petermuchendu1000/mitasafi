/**
 * Batch Listings API
 * 
 * GET /api/listings/batch?ids=id1,id2,id3
 * 
 * Fetches multiple listings by ID in a single request.
 * Used by the saved listings page.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateListingSlug, parseListingPhotos } from "@/lib/listings/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { error: "Missing ids parameter" },
      { status: 400 }
    );
  }

  const ids = idsParam.split(",").filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ listings: [] });
  }

  if (ids.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 listings per request" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Fetch listings - photos is a JSON column on the listings table
    // Include all statuses for saved listings (not just active)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listings, error } = await (supabase as any)
      .from("listings")
      .select(`
        id,
        title,
        property_type,
        area,
        city,
        rent_amount,
        currency,
        bedrooms,
        bathrooms,
        is_verified,
        available_from,
        published_at,
        photos,
        size_sqft,
        furnishing,
        floor_level,
        parking,
        parking_spaces,
        status,
        listing_category,
        commercial_type,
        size_sqm
      `)
      .in("id", ids)
      .in("status", ["active", "paused", "rented"]); // Exclude only deleted

    if (error) {
      console.error("Failed to fetch listings:", error);
      return NextResponse.json(
        { error: "Failed to fetch listings" },
        { status: 500 }
      );
    }

    // Transform to ListingCard format
    interface ListingRow {
      id: string;
      title: string;
      property_type: string;
      area: string;
      city: string;
      rent_amount: number;
      currency: string;
      bedrooms: number;
      bathrooms: number;
      is_verified: boolean;
      available_from: string | null;
      published_at: string | null;
      photos: unknown;
      size_sqft: number | null;
      furnishing: string | null;
      floor_level: string | null;
      parking: string | null;
      parking_spaces: number | null;
      status: string;
      listing_category: string | null;
      commercial_type: string | null;
      size_sqm: number | null;
    }

    const listingCards = (listings as ListingRow[]).map((listing) => {
      // Parse photos JSON and get cover photo
      const photos = parseListingPhotos(listing.photos);
      const coverPhoto = photos[0]?.url || null;

      // Generate slug
      const slug = generateListingSlug({
        id: listing.id,
        bedrooms: listing.bedrooms,
        property_type: listing.property_type,
        area: listing.area,
      });

      // Check if available now
      const availableNow = !listing.available_from || 
        new Date(listing.available_from) <= new Date();

      return {
        id: listing.id,
        slug,
        title: listing.title,
        property_type: listing.property_type,
        area: listing.area,
        city: listing.city,
        rent_amount: listing.rent_amount,
        currency: listing.currency,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        cover_photo: coverPhoto,
        is_verified: listing.is_verified,
        available_now: availableNow,
        published_at: listing.published_at,
        size_sqft: listing.size_sqft,
        furnishing: listing.furnishing,
        floor_level: listing.floor_level,
        parking: listing.parking,
        parking_spaces: listing.parking_spaces,
        status: listing.status,
        listing_category: listing.listing_category || "residential",
        commercial_type: listing.commercial_type,
        size_sqm: listing.size_sqm,
      };
    });

    // Maintain order based on input IDs
    const orderedListings = ids
      .map(id => listingCards.find(l => l.id === id))
      .filter(Boolean);

    return NextResponse.json({ listings: orderedListings });
  } catch (error) {
    console.error("Batch listings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
