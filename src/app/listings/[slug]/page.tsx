/**
 * Listing Detail Page
 * 
 * Public page displaying full listing details for tenants.
 * URL: /listings/[slug]
 * 
 * Features:
 * - SEO optimized with dynamic metadata
 * - Photo gallery with lightbox
 * - Price breakdown with move-in cost
 * - Location map (respects privacy settings)
 * - Amenities, utilities, policies
 * - Landlord info
 * - Inquiry modal
 * - Similar listings recommendations
 * 
 * Layout: Mobile-first cards, Desktop 2-column with sticky sidebar
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getListingById } from "@/lib/listings/get-listing";
import { getSimilarListings } from "@/lib/listings/get-similar";
import { calculatePriceBreakdown, generateListingSlug } from "@/lib/listings/types";
import { createClient } from "@/lib/supabase/server";
import { ListingDetailClient } from "./ListingDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Extract ID from slug (last segment)
  const idPart = slug.split("-").pop() || "";
  
  // Find listing by ID prefix - use LIKE on text-cast UUID
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listings } = await (supabase as any)
    .rpc("find_listing_by_id_prefix", { id_prefix: idPart });

  interface MetadataListing {
    id: string;
    title: string;
    description: string;
    area: string;
    city: string;
    bedrooms: number;
    property_type: string;
    rent_amount: number;
    currency: string | null;
    cover_photo: string | null;
  }

  // If RPC doesn't exist, fall back to direct query  
  let listing: MetadataListing | null = listings?.[0] as MetadataListing | null;
  
  if (!listing) {
    // Fallback: fetch all active and filter client-side
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allListings } = await (supabase as any)
      .from("listings")
      .select("id, title, description, area, city, bedrooms, property_type, rent_amount, currency, cover_photo")
      .eq("status", "active")
      .limit(100);
    
    listing = (allListings as MetadataListing[] | null)?.find(
      l => l.id.startsWith(idPart)
    ) || null;
  }

  if (!listing) {
    return {
      title: "Listing Not Found | MitaSafi",
      description: "This listing is no longer available.",
    };
  }

  const priceFormatted = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: listing.currency || "KES",
    minimumFractionDigits: 0,
  }).format(listing.rent_amount);

  const title = `${listing.title} | ${priceFormatted}/mo | MitaSafi`;
  const description = `${listing.bedrooms} bedroom ${listing.property_type} in ${listing.area}, ${listing.city}. ${listing.description.slice(0, 150)}...`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: listing.cover_photo ? [listing.cover_photo] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: listing.cover_photo ? [listing.cover_photo] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  
  // Extract ID from slug
  const idPart = slug.split("-").pop() || "";
  
  if (!idPart || idPart.length < 8) {
    notFound();
  }

  // Find full listing ID - check ALL statuses (not just active)
  const supabase = await createClient();
  
  // Fetch listings (including unavailable) and filter by ID prefix
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allListings } = await (supabase as any)
    .from("listings")
    .select("id, status")
    .in("status", ["active", "rented", "paused", "archived"])
    .limit(200);

  const matchedListing = (allListings as { id: string; status: string }[] | null)?.find(
    l => l.id.startsWith(idPart)
  );

  if (!matchedListing) {
    notFound();
  }

  const listingId = matchedListing.id;
  const listingStatus = matchedListing.status;

  // Fetch full listing data (including unavailable)
  const { listing, error } = await getListingById(listingId, { 
    includeUnavailable: true,
    incrementViews: listingStatus === "active" // Only count views for active listings
  });

  if (error || !listing) {
    notFound();
  }

  // Verify URL slug matches (redirect if wrong for SEO)
  const correctSlug = generateListingSlug(listing);
  if (slug !== correctSlug) {
    // In production, redirect to correct URL
    // For now, just continue
  }

  // Fetch similar listings
  const { listings: similarListings } = await getSimilarListings({
    id: listing.id,
    area: listing.area,
    rent_amount: listing.rent_amount,
    bedrooms: listing.bedrooms,
    property_type: listing.property_type,
  });

  // Calculate price breakdown
  const priceBreakdown = calculatePriceBreakdown(listing);

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Get user profile info if authenticated
  let userPhone: string | undefined;
  let userName: string | undefined;
  let userEmail: string | undefined;
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("phone, full_name, email")
      .eq("id", user.id)
      .single();
    const profileData = profile as { phone: string | null; full_name: string | null; email: string | null } | null;
    userPhone = profileData?.phone || undefined;
    userName = profileData?.full_name || user.user_metadata?.full_name || undefined;
    userEmail = profileData?.email || user.email || undefined;
  }

  return (
    <ListingDetailClient
      listing={listing}
      priceBreakdown={priceBreakdown}
      similarListings={similarListings}
      isAuthenticated={isAuthenticated}
      userId={user?.id}
      userName={userName}
      userEmail={userEmail}
      userPhone={userPhone}
    />
  );
}
