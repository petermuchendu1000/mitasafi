/**
 * Shared Listing Card Component
 * 
 * Compact, Fiverr-style card for displaying listings.
 * Used across public browse pages and landlord dashboard.
 * Supports both residential and commercial property types.
 * 
 * Design: Compact 16:10 aspect ratio, minimal padding
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { 
  Bed, 
  Bath, 
  Maximize2, 
  MapPin, 
  Eye, 
  MessageSquare,
  CheckCircle,
  Heart,
  // Commercial icons
  Users,
  Building2,
  UtensilsCrossed,
  Ruler,
  Truck,
  Car,
  Hotel,
  LandPlot,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  type ListingCardData,
  PROPERTY_TYPE_LABELS,
  STATUS_BADGE_CONFIG,
  formatCurrency,
  getRelativeTime,
  generateListingSlug,
} from "./listing-types";

// =============================================================================
// TYPES
// =============================================================================

type CardVariant = "public" | "landlord";

interface ListingCardProps {
  listing: ListingCardData;
  variant?: CardVariant;
  priority?: boolean;
  className?: string;
  // Landlord-specific actions (optional)
  actions?: React.ReactNode;
  isUpdating?: boolean;
  // Link configuration
  href?: string;
  linkTarget?: "_self" | "_blank";
}

// Local storage key for saved listings (public variant)
const STORAGE_KEY = "mitasafi_saved_listings";

// Cache for database saved listings (shared across all cards)
let savedListingsCache: { listingIds: Set<string>; fetchedAt: number } | null = null;
let fetchPromise: Promise<void> | null = null;

// Fetch saved listings from database once (shared)
async function fetchSavedListingsOnce(): Promise<Set<string>> {
  const now = Date.now();
  
  // Return cached if fresh (less than 30 seconds old)
  if (savedListingsCache && now - savedListingsCache.fetchedAt < 30000) {
    return savedListingsCache.listingIds;
  }
  
  // If already fetching, wait for it
  if (fetchPromise) {
    await fetchPromise;
    return savedListingsCache?.listingIds || new Set();
  }
  
  // Fetch from API
  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/saved-listings");
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>(
          (data.saved_listings || []).map((s: { listing_id: string }) => s.listing_id)
        );
        savedListingsCache = { listingIds: ids, fetchedAt: Date.now() };
        
        // Sync localStorage
        const localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as { listingId: string; savedAt: string }[];
        data.saved_listings?.forEach((s: { listing_id: string; created_at: string }) => {
          if (!localSaved.some(ls => ls.listingId === s.listing_id)) {
            localSaved.push({ listingId: s.listing_id, savedAt: s.created_at });
          }
        });
        const synced = localSaved.filter(ls => ids.has(ls.listingId));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
      }
    } catch {
      // Network error - use localStorage only
    } finally {
      fetchPromise = null;
    }
  })();
  
  await fetchPromise;
  return savedListingsCache?.listingIds || new Set();
}

// Invalidate cache when saving/unsaving
function invalidateSavedListingsCache() {
  savedListingsCache = null;
}

// =============================================================================
// METRIC COMPONENTS
// =============================================================================

interface MetricProps {
  icon: React.ReactNode;
  value: string | number | null | undefined;
  unit?: string;
}

function Metric({ icon, value, unit }: MetricProps) {
  if (value === null || value === undefined) return null;
  return (
    <span className="flex items-center gap-0.5">
      {icon}
      {typeof value === "number" ? value.toLocaleString() : value}
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </span>
  );
}

function ResidentialMetrics({ listing }: { listing: ListingCardData }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
      <Metric icon={<Bed className="w-3 h-3" />} value={listing.bedrooms} />
      <Metric icon={<Bath className="w-3 h-3" />} value={listing.bathrooms} />
      {listing.size_sqft && (
        <Metric icon={<Maximize2 className="w-3 h-3" />} value={listing.size_sqft} unit="sqft" />
      )}
    </div>
  );
}

function CommercialMetrics({ listing }: { listing: ListingCardData }) {
  const commercialType = listing.commercial_type;
  
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
      {/* Size in sqm for all commercial */}
      {listing.size_sqm && (
        <Metric icon={<Maximize2 className="w-3 h-3" />} value={listing.size_sqm} unit="sqm" />
      )}
      
      {/* Type-specific metrics */}
      {commercialType === "office" && (
        <>
          <Metric icon={<Users className="w-3 h-3" />} value={listing.workstation_capacity} />
          {listing.building_grade && (
            <Metric icon={<Building2 className="w-3 h-3" />} value={`${listing.building_grade}`} />
          )}
        </>
      )}
      
      {(commercialType === "retail" || commercialType === "food_beverage") && (
        <>
          {listing.seating_capacity && (
            <Metric icon={<UtensilsCrossed className="w-3 h-3" />} value={listing.seating_capacity} />
          )}
          {listing.frontage_width_m && (
            <Metric icon={<Ruler className="w-3 h-3" />} value={listing.frontage_width_m} unit="m" />
          )}
        </>
      )}
      
      {commercialType === "warehouse" && (
        <>
          {listing.clear_height_m && (
            <Metric icon={<Ruler className="w-3 h-3" />} value={listing.clear_height_m} unit="m" />
          )}
          {listing.loading_docks !== null && listing.loading_docks !== undefined && listing.loading_docks > 0 && (
            <Metric icon={<Truck className="w-3 h-3" />} value={listing.loading_docks} />
          )}
        </>
      )}
      
      {commercialType === "automotive" && (
        <Metric icon={<Car className="w-3 h-3" />} value={listing.parking_spaces_count} />
      )}
      
      {commercialType === "hospitality" && (
        <Metric icon={<Hotel className="w-3 h-3" />} value={listing.room_count} />
      )}
      
      {commercialType === "commercial_land" && (
        <Metric icon={<LandPlot className="w-3 h-3" />} value={listing.plot_size_acres} unit="ac" />
      )}
    </div>
  );
}

function ListingMetrics({ listing }: { listing: ListingCardData }) {
  const isCommercial = listing.listing_category === "commercial";
  
  if (isCommercial) {
    return <CommercialMetrics listing={listing} />;
  }
  
  return <ResidentialMetrics listing={listing} />;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ListingCard({ 
  listing, 
  variant = "public",
  priority = false,
  className,
  actions,
  isUpdating = false,
  href,
  linkTarget = "_self",
}: ListingCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Get cover image
  const coverImage = listing.cover_photo || listing.photos?.[0]?.url;
  
  // Generate link href
  const linkHref = href || (variant === "landlord" 
    ? `/dashboard/landlord/listings/${listing.id}` 
    : `/properties/${listing.id}`);
    
  // Status badge
  const statusBadge = STATUS_BADGE_CONFIG[listing.status] || STATUS_BADGE_CONFIG.draft;
  
  // Property type label
  const propertyTypeLabel = PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type;

  // Initialize saved state from local storage (public variant only)
  // Also check database for logged-in users
  useEffect(() => {
    if (variant === "public") {
      // First check localStorage for immediate UI
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as { listingId: string }[];
        setIsSaved(saved.some(s => s.listingId === listing.id));
      } catch {
        // Ignore parse errors
      }
      
      // Then sync with database (uses shared cache)
      fetchSavedListingsOnce().then(ids => {
        setIsSaved(ids.has(listing.id));
      });
    }
  }, [listing.id, variant]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (variant !== "public") return;
    
    try {
      // Optimistic UI update
      const newSavedState = !isSaved;
      setIsSaved(newSavedState);
      
      // Update localStorage for quick access
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as { listingId: string; savedAt: string; lastKnownStatus?: string }[];
      if (!newSavedState) {
        const updated = saved.filter(s => s.listingId !== listing.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } else {
        saved.push({ 
          listingId: listing.id, 
          savedAt: new Date().toISOString(),
          lastKnownStatus: listing.status || "active"
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
      window.dispatchEvent(new CustomEvent("savedListingsChanged"));
      
      // Sync to database (for notifications to work)
      // This runs in background - doesn't block UI
      const url = newSavedState 
        ? "/api/saved-listings" 
        : `/api/saved-listings?listing_id=${listing.id}`;
      
      const response = await fetch(url, {
        method: newSavedState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        ...(newSavedState && { body: JSON.stringify({ listing_id: listing.id }) }),
      });
      
      if (!response.ok) {
        // If not authenticated, that's okay - localStorage still works
        // User just won't get notifications
        const data = await response.json();
        if (response.status !== 401) {
          console.error("Failed to sync saved listing:", data.error);
        }
      } else {
        // Invalidate cache so next card fetch gets fresh data
        invalidateSavedListingsCache();
      }
    } catch (err) {
      console.error("Failed to save listing:", err);
      // Revert optimistic update on error
      setIsSaved(!isSaved);
    }
  };

  const CardContent = (
    <>
      {/* Image - Clean, minimal overlays */}
      <div className="relative aspect-[16/10] bg-gray-100 rounded-t-lg overflow-hidden">
        {coverImage && !imageError ? (
          <Image
            src={coverImage}
            alt={listing.title}
            fill
            className={cn(
              "object-cover transition-transform duration-300",
              listing.status === "active" || variant === "landlord" 
                ? "group-hover:scale-105" 
                : "grayscale opacity-75"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            priority={priority}
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Maximize2 className="w-8 h-8" />
          </div>
        )}

        {/* Unavailable overlay for non-active public listings */}
        {variant === "public" && listing.status !== "active" && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="px-3 py-1.5 bg-white/95 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
              {listing.status === "rented" ? "Rented Out" : "Currently Unavailable"}
            </span>
          </div>
        )}

        {/* Save Button - Top Right (public only) */}
        {variant === "public" && (
          <button
            onClick={handleSave}
            className={cn(
              "absolute top-2 right-2 p-2 rounded-full transition-all z-10",
              isSaved
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white/90 text-gray-500 hover:bg-white hover:text-orange-500 shadow-sm"
            )}
            aria-label={isSaved ? "Remove from saved" : "Save property"}
          >
            <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
          </button>
        )}
      </div>

      {/* Content - Organized hierarchy */}
      <div className="p-4 overflow-hidden">
        {/* Row 1: Price + Status/Verified */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn(
            "text-lg font-bold",
            listing.status !== "active" && variant === "public" ? "text-gray-400" : "text-gray-900"
          )}>
            {formatCurrency(listing.rent_amount, listing.currency)}
            <span className="text-sm font-normal text-gray-500">/mo</span>
          </span>
          
          {variant === "landlord" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <span className={cn("w-1.5 h-1.5 rounded-full", statusBadge.dot)} />
              {statusBadge.label}
            </span>
          ) : listing.status === "rented" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Rented
            </span>
          ) : listing.status === "paused" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unavailable
            </span>
          ) : listing.is_verified ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600">
              <CheckCircle className="w-3.5 h-3.5" />
              Verified
            </span>
          ) : listing.available_now ? (
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
              Available
            </span>
          ) : null}
        </div>

        {/* Row 2: Title */}
        <h3 className={cn(
          "font-semibold text-sm leading-snug transition-colors line-clamp-2 mb-1.5",
          listing.status !== "active" && variant === "public" 
            ? "text-gray-400" 
            : "text-gray-900 group-hover:text-teal-600"
        )}>
          {listing.title}
        </h3>

        {/* Row 3: Location */}
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{listing.area}{listing.city ? `, ${listing.city}` : ""}</span>
        </p>

        {/* Row 4: Type + Metrics */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-2">
          <span className="font-medium flex-shrink-0">{propertyTypeLabel}</span>
          <span className="text-gray-300">•</span>
          <div className="flex-1 min-w-0">
            <ListingMetrics listing={listing} />
          </div>
        </div>

        {/* Row 5: Stats + Time */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {(variant === "landlord" || listing.views_count > 0) && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {listing.views_count}
              </span>
            )}
            {variant === "landlord" && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {listing.inquiries_count}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400" suppressHydrationWarning>
            {getRelativeTime(listing.published_at || listing.created_at)}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className={cn(
      "bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all group relative overflow-hidden",
      isUpdating && "opacity-70 pointer-events-none",
      className
    )}>
      {/* Actions slot (for landlord menu) */}
      {actions}
      
      {/* Card as link */}
      <Link 
        href={linkHref}
        target={linkTarget}
        className="block"
      >
        {CardContent}
      </Link>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-gray-200" />
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="flex gap-3 pt-3 border-t border-gray-100">
          <div className="h-3 bg-gray-200 rounded w-10" />
          <div className="h-3 bg-gray-200 rounded w-10" />
          <div className="flex-1" />
          <div className="h-3 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  );
}
