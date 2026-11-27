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
import { resolveListingRef } from "@/lib/listings/id-prefix";
import { getListingById } from "@/lib/listings/get-listing";
import { getSimilarListings } from "@/lib/listings/get-similar";
import {
  calculatePriceBreakdown,
  generateListingSlug,
} from "@/lib/listings/types";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site/urls";
import { homeFont } from "@/components/landing/home-font";
import { ListingDetailClient } from "./ListingDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

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

  // One index range scan on the primary key. This used to call an RPC and
  // then fall back to fetching 100 active listings and filtering them in
  // JavaScript; see lib/listings/id-prefix.ts for why that was unsound.
  const ref = resolveListingRef(slug);
  let listing: MetadataListing | null = null;

  if (ref) {
    const supabase = await createClient();
    const base = supabase
      .from("listings")
      .select(
        "id, title, description, area, city, bedrooms, property_type, rent_amount, currency, cover_photo",
      )
      .eq("status", "active");
    const query =
      ref.kind === "id"
        ? base.eq("id", ref.id)
        : base.gte("id", ref.lo).lte("id", ref.hi).order("id");
    const { data } = await query.limit(1).maybeSingle();
    listing = (data as MetadataListing | null) ?? null;
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
  const description = [`${listing.property_type} for rent in ${listing.area}, ${listing.city}.`, listing.description?.trim().slice(0, 150)].filter(Boolean).join(" ");
  const canonical = siteUrl(`/listings/${generateListingSlug(listing)}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
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

  // THE SAME RANGE LOOKUP, across every status this page resolves.
  //
  // The RPC `find_listing_by_id_prefix` does this arithmetic too, but it
  // filters status = 'active' and this page deliberately resolves paused,
  // rented and archived listings as well, so the range is built here.
  const ref = resolveListingRef(slug);
  if (!ref) {
    notFound();
  }

  const supabase = await createClient();
  const base = supabase
    .from("listings")
    .select("id, status")
    .in("status", ["active", "rented", "paused", "archived"]);
  const lookup =
    ref.kind === "id"
      ? base.eq("id", ref.id)
      : base.gte("id", ref.lo).lte("id", ref.hi).order("id");

  const { data: matchedListing } = await lookup.limit(1).maybeSingle();

  if (!matchedListing) {
    notFound();
  }

  const listingId = matchedListing.id;
  const listingStatus = matchedListing.status;

  // Fetch full listing data (including unavailable)
  const { listing, error } = await getListingById(listingId, {
    includeUnavailable: true,
    incrementViews: listingStatus === "active", // Only count views for active listings
  });

  if (error || !listing) {
    notFound();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    const profileData = profile as {
      phone: string | null;
      full_name: string | null;
      email: string | null;
    } | null;
    userPhone = profileData?.phone || undefined;
    userName =
      profileData?.full_name || user.user_metadata?.full_name || undefined;
    userEmail = profileData?.email || user.email || undefined;
  }

  return (
    <div className={homeFont.variable}>
      <ListingDetailClient
        key={listing.id}
        listing={listing}
        priceBreakdown={priceBreakdown}
        similarListings={similarListings}
        isAuthenticated={isAuthenticated}
        userId={user?.id}
        userName={userName}
        userEmail={userEmail}
        userPhone={userPhone}
      />
    </div>
  );
}
