/**
 * Property Card Component
 * 
 * Card for displaying a listing in grid/list view.
 * Used in browse page and similar listings.
 * Supports both residential and commercial property types.
 * 
 * Design: 70% teal, 30% orange accents
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Bed, 
  Bath, 
  MapPin, 
  Heart, 
  CheckCircle,
  Clock,
  Share2,
  Link as LinkIcon,
  Mail,
  Car,
  Maximize,
  Sofa,
  // Commercial icons
  Users,
  Building2,
  UtensilsCrossed,
  Ruler,
  Truck,
  Hotel,
  LandPlot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListingCard } from "@/lib/listings/types";

// Local storage key for saved listings
const STORAGE_KEY = "mitasafi_saved_listings";

interface SavedListing {
  listingId: string;
  savedAt: string;
}

interface PropertyCardProps {
  listing: ListingCard;
  className?: string;
  priority?: boolean;
}

// Format price
function formatPrice(amount: number, currency: string = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Property type labels
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  // Residential
  apartment: "Apartment",
  bedsitter: "Bedsitter",
  studio: "Studio",
  house: "House",
  townhouse: "Townhouse",
  villa: "Villa",
  maisonette: "Maisonette",
  // Commercial
  office: "Office",
  retail: "Retail",
  food_beverage: "Restaurant/Café",
  warehouse: "Warehouse",
  automotive: "Parking/Auto",
  commercial_land: "Land",
  hospitality: "Hotel/Event",
  healthcare: "Clinic",
  educational: "School",
  specialized: "Specialized",
};

// =============================================================================
// METRIC COMPONENT
// =============================================================================

interface MetricItemProps {
  icon: React.ReactNode;
  value: string | number | null | undefined;
  unit?: string;
  title?: string;
  inactive?: boolean;
}

function MetricItem({ icon, value, unit, title, inactive }: MetricItemProps) {
  const hasValue = value !== null && value !== undefined && value !== 0;
  return (
    <span 
      className={cn("flex items-center gap-1", !hasValue && "text-gray-300")}
      title={title}
    >
      <span className={hasValue ? "text-brand-500" : ""}>{icon}</span>
      {hasValue ? (
        <>
          {typeof value === "number" ? value.toLocaleString() : value}
          {unit && <span className="text-xs">{unit}</span>}
        </>
      ) : "-"}
    </span>
  );
}

// =============================================================================
// LISTING METRICS COMPONENT
// =============================================================================

function ListingMetrics({ listing }: { listing: ListingCard }) {
  const isCommercial = listing.listing_category === "commercial";
  
  // Residential metrics: beds, baths, parking, size, furnishing
  if (!isCommercial) {
    return (
      <div className="flex items-center justify-between text-sm text-gray-600">
        <MetricItem icon={<Bed className="w-4 h-4" />} value={listing.bedrooms} title="Bedrooms" />
        <MetricItem icon={<Bath className="w-4 h-4" />} value={listing.bathrooms} title="Bathrooms" />
        <MetricItem 
          icon={<Car className="w-4 h-4" />} 
          value={listing.parking && listing.parking !== "none" ? listing.parking_spaces : null} 
          title="Parking spaces" 
        />
        <MetricItem 
          icon={<Maximize className="w-4 h-4" />} 
          value={listing.size_sqft} 
          unit="m²" 
          title="Size" 
        />
        <span 
          className={cn(
            "flex items-center gap-1",
            listing.furnishing && listing.furnishing !== "unfurnished" ? "" : "text-gray-300"
          )}
          title={listing.furnishing === "fully_furnished" ? "Fully Furnished" : 
                 listing.furnishing === "semi_furnished" ? "Semi-Furnished" : "Unfurnished"}
        >
          <Sofa className={cn(
            "w-4 h-4",
            listing.furnishing && listing.furnishing !== "unfurnished" ? "text-brand-500" : ""
          )} />
        </span>
      </div>
    );
  }
  
  // Commercial metrics - vary by type
  const commercialType = listing.commercial_type;
  
  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      {/* Size in sqm for all commercial */}
      <MetricItem icon={<Maximize className="w-4 h-4" />} value={listing.size_sqm} unit="sqm" title="Size" />
      
      {/* Office metrics */}
      {commercialType === "office" && (
        <>
          <MetricItem icon={<Users className="w-4 h-4" />} value={listing.workstation_capacity} title="Workstations" />
          <MetricItem icon={<Building2 className="w-4 h-4" />} value={listing.building_grade ? `${listing.building_grade}` : null} title="Building Grade" />
        </>
      )}
      
      {/* Retail/F&B metrics */}
      {(commercialType === "retail" || commercialType === "food_beverage") && (
        <>
          <MetricItem icon={<UtensilsCrossed className="w-4 h-4" />} value={listing.seating_capacity} title="Seating Capacity" />
          <MetricItem icon={<Ruler className="w-4 h-4" />} value={listing.frontage_width_m} unit="m" title="Frontage" />
        </>
      )}
      
      {/* Warehouse metrics */}
      {commercialType === "warehouse" && (
        <>
          <MetricItem icon={<Ruler className="w-4 h-4" />} value={listing.clear_height_m} unit="m" title="Clear Height" />
          <MetricItem icon={<Truck className="w-4 h-4" />} value={listing.loading_docks} title="Loading Docks" />
        </>
      )}
      
      {/* Automotive metrics */}
      {commercialType === "automotive" && (
        <MetricItem icon={<Car className="w-4 h-4" />} value={listing.parking_spaces_count} title="Parking Spaces" />
      )}
      
      {/* Hospitality metrics */}
      {commercialType === "hospitality" && (
        <MetricItem icon={<Hotel className="w-4 h-4" />} value={listing.room_count} title="Rooms" />
      )}
      
      {/* Land metrics */}
      {commercialType === "commercial_land" && (
        <MetricItem icon={<LandPlot className="w-4 h-4" />} value={listing.plot_size_acres} unit="ac" title="Plot Size" />
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PropertyCard({ listing, className, priority = false }: PropertyCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Initialize saved state from local storage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as SavedListing[];
      setIsSaved(saved.some(s => s.listingId === listing.id));
    } catch {
      // Ignore parse errors
    }
  }, [listing.id]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showShareMenu]);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as (SavedListing & { lastKnownStatus?: string })[];
      if (isSaved) {
        // Remove
        const updated = saved.filter(s => s.listingId !== listing.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setIsSaved(false);
      } else {
        // Add with current status for change tracking
        saved.push({ 
          listingId: listing.id, 
          savedAt: new Date().toISOString(),
          lastKnownStatus: listing.status || "active"
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        setIsSaved(true);
      }
      // Dispatch event for other components to sync
      window.dispatchEvent(new CustomEvent("savedListingsChanged"));
    } catch (err) {
      console.error("Failed to save listing:", err);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listings/${listing.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowShareMenu(false);
    }, 1500);
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listings/${listing.slug}`;
    const text = `Check out this ${listing.bedrooms} bed ${listing.property_type} in ${listing.area}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setShowShareMenu(false);
  };

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className={cn(
        "group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100",
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {listing.cover_photo && !imageError ? (
          <Image
            src={listing.cover_photo}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200">
            <MapPin className="w-12 h-12 text-brand-400" />
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <div className="flex flex-wrap gap-2">
            {listing.is_verified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-600 text-white text-xs font-medium rounded-full shadow-sm">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            )}
            {listing.available_now && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-success-500 text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-md">
                AVAILABLE NOW
              </span>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Share button */}
            <div className="relative" ref={shareMenuRef}>
              <button
                onClick={handleShareClick}
                className="p-2 rounded-full bg-white/90 text-gray-600 hover:bg-white hover:text-brand-600 transition-all shadow-sm"
                aria-label="Share property"
              >
                <Share2 className="w-4 h-4" />
              </button>
              
              {/* Share dropdown */}
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[140px] z-10">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                  <button
                    onClick={handleWhatsAppShare}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                </div>
              )}
            </div>
            
            {/* Save button */}
            <button
              onClick={handleSave}
              className={cn(
                "p-2 rounded-full transition-all shadow-sm",
                isSaved
                  ? "bg-cta-500 text-white"
                  : "bg-white/90 text-gray-600 hover:bg-white hover:text-cta-500"
              )}
              aria-label={isSaved ? "Remove from saved" : "Save property"}
            >
              <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
            </button>
          </div>
        </div>

        {/* Property type badge */}
        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full">
            {PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(listing.rent_amount, listing.currency)}
            <span className="text-sm font-normal text-gray-500">/mo</span>
          </p>
          {listing.published_at && (
            <span className="text-xs text-gray-400">
              {formatRelativeTime(listing.published_at)}
            </span>
          )}
        </div>

        {/* Title - allow 2 lines */}
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors">
          {listing.title}
        </h3>

        {/* Location */}
        <p className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{listing.area}, {listing.city}</span>
        </p>

        {/* Specs - Category-aware metrics */}
        <ListingMetrics listing={listing} />
      </div>
    </Link>
  );
}

// Skeleton loading state
export function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4">
        <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-full mb-1" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}
