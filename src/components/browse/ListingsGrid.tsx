"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { ListingCard, type ListingCardData } from "@/components/shared";
import { canonicalSearchHash } from "@/lib/search/criteria-hash";
import type { SearchParams } from "@/lib/listings/search";
import type { ListingCard as SearchListing } from "@/lib/listings/types";
import styles from "@/app/properties/rentals.module.css";
import { SaveSearchButton } from "./SaveSearchButton";

const REFRESH_INTERVAL = 30_000;
const formatCount = new Intl.NumberFormat("en-KE");

interface ListingsGridProps {
  listings: SearchListing[];
  total: number;
  page: number;
  totalPages: number;
  error: string | null;
  criteria: SearchParams;
  userAuth: {
    isAuthenticated: boolean;
    userId?: string;
    userEmail?: string;
    userPhone?: string;
  };
}

function toCardData(listing: SearchListing): ListingCardData {
  return {
    ...listing,
    currency: listing.currency || "KES",
    created_at: listing.published_at ?? "",
    status: "active",
    views_count: 0,
    inquiries_count: 0,
    size_sqft: listing.size_sqft ?? null,
    listing_category: listing.listing_category ?? "residential",
    commercial_type: listing.commercial_type ?? null,
    size_sqm: listing.size_sqm ?? null,
    workstation_capacity: listing.workstation_capacity ?? null,
    building_grade: listing.building_grade ?? null,
    seating_capacity: listing.seating_capacity ?? null,
    frontage_width_m: listing.frontage_width_m ?? null,
    clear_height_m: listing.clear_height_m ?? null,
    loading_docks: listing.loading_docks ?? null,
    parking_spaces_count: listing.parking_spaces_count ?? null,
    room_count: listing.room_count ?? null,
    plot_size_acres: listing.plot_size_acres ?? null,
  };
}

function resultsHref(search: string, page: number) {
  const params = new URLSearchParams(search);
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  return `/properties${params.size ? `?${params}` : ""}#rental-results`;
}

export function ListingsGrid({ listings, total, page, totalPages, error, criteria, userAuth }: ListingsGridProps) {
  const router = useRouter();
  const search = useSearchParams().toString();
  const alertCriteria = {
    areas: criteria.area ? [criteria.area] : criteria.locationAreas?.slice(),
    propertyTypes: criteria.propertyType ? [criteria.propertyType] : undefined,
    bedroomsMin: criteria.minBedrooms,
    bedroomsMax: criteria.maxBedrooms,
    priceMin: criteria.minPrice,
    priceMax: criteria.maxPrice,
    verifiedOnly: criteria.verified || undefined,
    availableNow: criteria.availableNow || undefined,
    query: criteria.query,
  };
  const searchKey = canonicalSearchHash(alertCriteria);
  const hasFilters = Object.values(alertCriteria).some((value) => value !== undefined);
  const allRentalsHref = resultsHref(criteria.residentialOnly ? "residential=1" : "", 1);

  useEffect(() => {
    let lastRefresh = Date.now();

    function refresh(minimumAge: number) {
      const now = Date.now();
      if (document.hidden || now - lastRefresh < minimumAge) return;
      lastRefresh = now;
      router.refresh();
    }

    const timer = window.setInterval(() => refresh(10_000), REFRESH_INTERVAL);
    const onFocus = () => refresh(10_000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return (
    <section id="rental-results" className={styles.results} aria-labelledby="rental-results-title" tabIndex={-1}>
      <div className={styles.resultsHeader}>
        <div>
          <h2 id="rental-results-title">Rental results</h2>
          <p role="status">{error ? "Results unavailable" : `${formatCount.format(total)} ${total === 1 ? "listing" : "listings"}`}</p>
        </div>
        {!error && (
          <SaveSearchButton key={searchKey} {...userAuth} searchCriteria={alertCriteria}
            variant="compact" className={styles.alert} buttonText="Get alerts" />
        )}
      </div>

      {error ? (
        <div className={styles.empty}>
          <HomeIcon name="home" size={29} />
          <h3>We couldn’t load the listings</h3>
          <p>Try again to see the latest rentals.</p>
          <button type="button" className={styles.outlineButton} onClick={() => router.refresh()}>Try again</button>
        </div>
      ) : listings.length === 0 ? (
        <div className={styles.empty}>
          <HomeIcon name="search" size={30} />
          <h3>{total > 0 ? "No rentals on this page" : "No matching rentals"}</h3>
          <p>{total > 0 ? "Go back to the first page to see your results." : hasFilters
            ? "Try a different location, a wider budget or fewer filters."
            : "Browse another place or get alerts when new homes are listed."}</p>
          {total > 0 ? <Link className={styles.outlineButton} href={resultsHref(search, 1)}>Back to page 1</Link>
            : hasFilters ? <Link className={styles.outlineButton} href={allRentalsHref}>Clear filters</Link>
              : <Link className={styles.outlineButton} href="/find">Explore places</Link>}
        </div>
      ) : (
        <>
          <ul key={search} className={styles.cards} aria-label="Rental listings" role="list">
            {listings.map((listing, index) => (
              <li key={listing.id}>
                <ListingCard listing={toCardData(listing)} variant="public" priority={index === 0}
                  className={styles.rentalCard} href={`/listings/${listing.slug}`} />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Rental results pages">
              {page > 1
                ? <Link rel="prev" href={resultsHref(search, page - 1)} aria-label="Previous page"><ChevronLeft size={19} aria-hidden="true" /><span>Previous</span></Link>
                : <span className={styles.inactive}><ChevronLeft size={19} aria-hidden="true" /><span>Previous</span></span>}
              <span aria-current="page">Page {page} of {totalPages}</span>
              {page < totalPages
                ? <Link rel="next" href={resultsHref(search, page + 1)} aria-label="Next page"><span>Next</span><ChevronRight size={19} aria-hidden="true" /></Link>
                : <span className={styles.inactive}><span>Next</span><ChevronRight size={19} aria-hidden="true" /></span>}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
