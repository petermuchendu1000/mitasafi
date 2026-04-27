/**
 * Listings Grid Component
 * 
 * Grid layout for displaying property listings with pagination.
 * Supports empty states, loading states, and view count.
 * Uses shared compact ListingCard component (Fiverr-style).
 * 
 * Features:
 * - Auto-refresh every 30 seconds for fresh listing data
 * - Refresh on window focus (when user returns to tab)
 * - Low inventory banner when few results in area
 * - Save search functionality for logged-in and guest users
 * 
 * Design: 70% teal, 30% orange accents
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ListingCard, ListingCardSkeleton, type ListingCardData } from "@/components/shared";
import { LowInventoryBanner } from "./LowInventoryBanner";
import { SaveSearchButton } from "./SaveSearchButton";
import { cn } from "@/lib/utils";
import type { ListingCard as LegacyListingCard } from "@/lib/listings/types";
import Link from "next/link";

// Auto-refresh interval (30 seconds)
const REFRESH_INTERVAL = 30 * 1000;

// Low inventory threshold
const LOW_INVENTORY_THRESHOLD = 5;

interface UserAuthInfo {
  isAuthenticated: boolean;
  userId?: string;
  userEmail?: string;
  userPhone?: string;
}

interface ListingsGridProps {
  listings: LegacyListingCard[];
  total: number;
  page: number;
  totalPages: number;
  isLoading?: boolean;
  className?: string;
  /** User authentication info for save search functionality */
  userAuth?: UserAuthInfo;
}

/**
 * Transform legacy ListingCard to shared ListingCardData format
 */
function transformToCardData(listing: LegacyListingCard): ListingCardData {
  return {
    id: listing.id,
    title: listing.title,
    property_type: listing.property_type,
    area: listing.area,
    city: listing.city,
    rent_amount: listing.rent_amount,
    currency: listing.currency || "KES",
    cover_photo: listing.cover_photo,
    photos: undefined,
    is_verified: listing.is_verified,
    available_now: listing.available_now,
    published_at: listing.published_at,
    created_at: listing.published_at || new Date().toISOString(),
    status: "active",
    views_count: 0,
    inquiries_count: 0,
    // Residential
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    size_sqft: listing.size_sqft ?? null,
    // Commercial
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

export function ListingsGrid({
  listings,
  total,
  page,
  totalPages,
  isLoading = false,
  className,
  userAuth,
}: ListingsGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Build search criteria from current URL params
  const area = searchParams.get("area");
  const propertyType = searchParams.get("type");
  const searchQuery = searchParams.get("q");
  const beds = searchParams.get("beds");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  
  const searchCriteria = {
    areas: area ? [area] : undefined,
    propertyTypes: propertyType ? [propertyType] : undefined,
    bedroomsMin: beds ? parseInt(beds) : undefined,
    priceMin: minPrice ? parseInt(minPrice) : undefined,
    priceMax: maxPrice ? parseInt(maxPrice) : undefined,
    query: searchQuery || undefined,
  };

  // Check if there are active filters
  const hasActiveFilters = !!(area || propertyType || beds || minPrice || maxPrice || searchQuery);

  // Check for low inventory
  const isLowInventory = total > 0 && total < LOW_INVENTORY_THRESHOLD;

  // Auto-refresh function
  const refreshData = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    setLastRefresh(Date.now());
    // Reset refreshing state after a short delay
    setTimeout(() => setIsRefreshing(false), 500);
  }, [router]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Refresh on window focus (when user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if more than 10 seconds since last refresh
      if (Date.now() - lastRefresh > 10000) {
        refreshData();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [lastRefresh, refreshData]);

  // Handle pagination
  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete("page");
    } else {
      params.set("page", newPage.toString());
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("", className)}>
        {/* Results count skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
        </div>

        {/* Grid skeleton - 1 col mobile, 2 sm, 3 lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (listings.length === 0) {
    return (
      <div className={cn("", className)}>
        <EmptyState userAuth={userAuth} />
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      {/* Low Inventory Banner - shows when few results in area */}
      {isLowInventory && (
        <LowInventoryBanner
          areaName={area || undefined}
          resultCount={total}
          searchCriteria={searchCriteria}
          isAuthenticated={userAuth?.isAuthenticated}
          userId={userAuth?.userId}
          userEmail={userAuth?.userEmail}
          userPhone={userAuth?.userPhone}
          className="mb-6"
        />
      )}

      {/* Results Count & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-700">
          Showing <span className="font-bold text-gray-900">{listings.length}</span> of{" "}
          <span className="font-bold text-gray-900">{total}</span> properties
          {totalPages > 1 && (
            <span className="text-gray-500 hidden sm:inline ml-2">
              • Page {page} of {totalPages}
            </span>
          )}
        </p>
        
        {/* Save Search Button - shows when there are active filters */}
        {hasActiveFilters && (
          <SaveSearchButton
            searchCriteria={searchCriteria}
            isAuthenticated={userAuth?.isAuthenticated ?? false}
            userId={userAuth?.userId}
            userEmail={userAuth?.userEmail}
            userPhone={userAuth?.userPhone}
            variant="compact"
          />
        )}
      </div>

      {/* Grid - 1 col mobile, 2 sm, 3 lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {listings.map((listing, index) => (
          <ListingCard
            key={listing.id}
            listing={transformToCardData(listing)}
            variant="public"
            priority={index < 5}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ userAuth }: { userAuth?: UserAuthInfo }) {
  const searchParams = useSearchParams();
  
  // Build search criteria from URL params
  const area = searchParams.get("area");
  const propertyType = searchParams.get("type");
  const beds = searchParams.get("beds");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const searchQuery = searchParams.get("q");
  
  const searchCriteria = {
    areas: area ? [area] : undefined,
    propertyTypes: propertyType ? [propertyType] : undefined,
    bedroomsMin: beds ? parseInt(beds) : undefined,
    priceMin: minPrice ? parseInt(minPrice) : undefined,
    priceMax: maxPrice ? parseInt(maxPrice) : undefined,
    query: searchQuery || undefined,
  };

  // Check if any filters are applied
  const hasFilters = !!(area || propertyType || beds || minPrice || maxPrice || searchQuery);

  // Build a human-readable description of what they searched for
  const searchDescription = searchQuery || buildSearchDescription(searchCriteria);

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 bg-brand-100 rounded-full flex items-center justify-center">
        <Search className="w-10 h-10 text-brand-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No properties found
      </h3>
      <p className="text-gray-600 max-w-md mx-auto mb-2">
        {hasFilters 
          ? `We couldn't find any "${searchDescription}" right now.`
          : "We couldn't find any properties matching your criteria."
        }
      </p>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">
        {hasFilters 
          ? "New properties are listed daily. Get notified when one matches your search."
          : "Try different filters or get notified when new properties are listed."
        }
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {hasFilters && (
          <Link
            href="/properties"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors"
          >
            Clear Filters
          </Link>
        )}
        <SaveSearchButton
          searchCriteria={searchCriteria}
          isAuthenticated={userAuth?.isAuthenticated ?? false}
          userId={userAuth?.userId}
          userEmail={userAuth?.userEmail}
          userPhone={userAuth?.userPhone}
          variant="default"
          className="justify-center"
          buttonText="Notify Me"
        />
      </div>
    </div>
  );
}

// Build human-readable search description
function buildSearchDescription(criteria: {
  areas?: string[];
  propertyTypes?: string[];
  bedroomsMin?: number;
  priceMin?: number;
  priceMax?: number;
}): string {
  const parts: string[] = [];
  
  if (criteria.bedroomsMin) {
    parts.push(`${criteria.bedroomsMin}+ bedroom`);
  }
  
  if (criteria.propertyTypes && criteria.propertyTypes.length > 0) {
    // Format property type nicely (e.g., "bedsitter" -> "bedsitters")
    const types = criteria.propertyTypes.map(t => {
      const formatted = t.toLowerCase().replace(/_/g, " ");
      return formatted.endsWith("s") ? formatted : `${formatted}s`;
    });
    parts.push(types.join(" or "));
  } else {
    parts.push("properties");
  }
  
  if (criteria.areas && criteria.areas.length > 0) {
    parts.push(`in ${criteria.areas.join(" or ")}`);
  }
  
  if (criteria.priceMax) {
    parts.push(`under KES ${(criteria.priceMax / 1000).toFixed(0)}K`);
  }
  
  return parts.join(" ");
}

// Pagination Component
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    
    if (totalPages <= 7) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (page > 3) {
        pages.push("...");
      }
      
      // Show pages around current
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push("...");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-10">
      {/* Previous */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          page === 1
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((pageNum, index) => (
          pageNum === "..." ? (
            <span key={`dots-${index}`} className="px-3 py-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pageNum === page
                  ? "bg-brand-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {pageNum}
            </button>
          )
        ))}
      </div>

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          page === totalPages
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
