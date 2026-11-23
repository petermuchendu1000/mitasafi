"use client";

/**
 * Records that this provider was viewed.
 *
 * THE WRITER THAT WAS MISSING
 *   useRecentlyViewed exposed addProvider and trackProviderView, RecentlyViewedSection
 *   renders the result on the home page, and nothing anywhere called either one. A
 *   repo-wide grep for the storage key found only the hook's own file. The section was
 *   therefore unreachable by construction: it returns null on an empty list, and the
 *   list could never be anything else.
 *
 *   This is the missing half. It is a client component because the provider page is a
 *   server component and the record lives in the viewer's own browser.
 *
 * WHY AN EFFECT IS RIGHT HERE
 *   Writing to storage is a side effect on an external system, which is what effects
 *   are for; it is not a render-time derivation. No setState, so nothing cascades and
 *   react-hooks/set-state-in-effect has nothing to say about it.
 *
 * WHY THE PROPS ARE FLAT
 *   Every value is a primitive, and the categories arrive as one comma-joined string,
 *   so the dependency array is made of things that compare by value. Taking the
 *   provider object or a categories array instead would give the effect a new
 *   dependency identity on every render of the page and re-record the view each time.
 */

import { useEffect } from "react";
import { trackProviderView } from "@/hooks/useRecentlyViewed";

interface TrackProviderViewProps {
  id: string;
  businessName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  minPrice?: number | null;
  /** Category ids, comma-joined. */
  categoryIds?: string;
}

export function TrackProviderView({
  id,
  businessName,
  tagline = null,
  logoUrl = null,
  ratingAverage = null,
  ratingCount = null,
  minPrice = null,
  categoryIds = "",
}: TrackProviderViewProps) {
  useEffect(() => {
    trackProviderView({
      id,
      business_name: businessName,
      tagline,
      logo_url: logoUrl,
      rating_average: ratingAverage,
      rating_count: ratingCount,
      min_price: minPrice,
      categories: categoryIds ? categoryIds.split(",") : [],
    });
  }, [
    id,
    businessName,
    tagline,
    logoUrl,
    ratingAverage,
    ratingCount,
    minPrice,
    categoryIds,
  ]);

  return null;
}
