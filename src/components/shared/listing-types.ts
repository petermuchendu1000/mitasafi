/**
 * Shared Listing Types
 * 
 * Unified type definitions for listing cards used across
 * both public browse pages and landlord dashboard.
 * 
 * Supports both residential and commercial property types.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type ListingCategory = "residential" | "commercial";

export type CommercialType = 
  | "office" 
  | "retail" 
  | "food_beverage" 
  | "warehouse" 
  | "automotive" 
  | "commercial_land" 
  | "hospitality" 
  | "healthcare" 
  | "educational" 
  | "specialized";

export type ListingStatus = 
  | "draft" 
  | "active" 
  | "paused" 
  | "rented" 
  | "expired" 
  | "archived";

// =============================================================================
// LISTING CARD DATA
// =============================================================================

/**
 * Unified listing card data structure
 * Used by both public PropertyCard and landlord ListingCard
 */
export interface ListingCardData {
  id: string;
  title: string;
  slug?: string;
  property_type: string;
  area: string;
  city?: string;
  rent_amount: number;
  currency: string;
  
  // Status & verification
  status: ListingStatus;
  is_verified?: boolean;
  available_now?: boolean;
  
  // Residential fields
  bedrooms: number;
  bathrooms: number;
  size_sqft: number | null;
  furnishing?: "unfurnished" | "semi_furnished" | "fully_furnished" | null;
  parking?: "none" | "covered" | "open" | "garage" | null;
  parking_spaces?: number | null;
  floor_level?: string | null;
  
  // Commercial fields
  listing_category: ListingCategory | null;
  commercial_type: CommercialType | null;
  size_sqm: number | null;
  workstation_capacity: number | null;
  building_grade: string | null;
  seating_capacity: number | null;
  frontage_width_m: number | null;
  clear_height_m: number | null;
  loading_docks: number | null;
  parking_spaces_count: number | null;
  room_count: number | null;
  plot_size_acres: number | null;
  
  // Photos
  photos?: { id: string; url: string; category: string }[];
  cover_photo: string | null;
  
  // Analytics
  views_count: number;
  inquiries_count: number;
  
  // Timestamps
  created_at: string;
  published_at: string | null;
}

// =============================================================================
// PROPERTY TYPE LABELS
// =============================================================================

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  // Residential
  bedsitter: "Bedsitter",
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
  townhouse: "Townhouse",
  maisonette: "Maisonette",
  villa: "Villa",
  // Commercial
  office: "Office",
  retail: "Retail",
  restaurant: "Restaurant",
  parking: "Parking",
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
// STATUS BADGE CONFIG
// =============================================================================

export const STATUS_BADGE_CONFIG: Record<ListingStatus, { 
  dot: string; 
  label: string;
}> = {
  draft: { dot: "bg-gray-400", label: "Draft" },
  active: { dot: "bg-teal-500", label: "Active" },
  paused: { dot: "bg-amber-500", label: "Paused" },
  rented: { dot: "bg-blue-500", label: "Rented" },
  expired: { dot: "bg-red-500", label: "Expired" },
  archived: { dot: "bg-gray-400", label: "Archived" },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get relative time string
 */
export function getRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return then.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

/**
 * Generate SEO-friendly slug from listing data
 */
export function generateListingSlug(listing: { 
  id: string; 
  bedrooms: number; 
  property_type: string; 
  area: string;
}): string {
  const beds = listing.bedrooms > 0 ? `${listing.bedrooms}br` : "";
  const type = listing.property_type.replace(/_/g, "-");
  const area = listing.area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const idShort = listing.id.slice(0, 8);
  
  return [beds, type, area, idShort].filter(Boolean).join("-");
}
