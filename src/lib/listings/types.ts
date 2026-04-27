/**
 * Listing Types
 * 
 * Type definitions for listing data used in the public-facing pages.
 */

import type { Json } from "@/types/database";

// Property type options
export type PropertyType = "apartment" | "bedsitter" | "studio" | "house" | "townhouse" | "villa" | "maisonette";

// Photo structure stored in JSONB
export interface ListingPhoto {
  id: string;
  url: string;
  path: string;
  category: "cover" | "living" | "bedroom" | "kitchen" | "bathroom" | "exterior" | "amenity" | "extra";
  sort_order: number;
}

// Security features structure
export interface SecurityFeatures {
  guard?: "none" | "daytime" | "24_hour";
  cctv?: "none" | "entry_only" | "full";
  access_control?: "none" | "key_only" | "card" | "biometric";
}

// Utilities structure
export interface Utilities {
  water?: "24_7" | "rationed" | "tank_backup";
  has_storage?: boolean;
  backup_power?: "none" | "common_areas" | "full";
  internet_ready?: boolean;
  isps?: string[];
}

// Landlord info (from profiles join)
export interface LandlordInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

// Full listing with parsed JSON fields
export interface Listing {
  id: string;
  landlord_id: string;
  building_id: string | null;
  unit_id: string | null;
  
  // Basic Info
  title: string;
  description: string;
  property_type: PropertyType;
  
  // Location
  building_name: string | null;
  address: string | null;
  area: string;
  city: string;
  landmarks: string | null;
  latitude: number | null;
  longitude: number | null;
  hide_exact_address: boolean;
  
  // Property Details
  bedrooms: number;
  bathrooms: number;
  size_sqft: number | null;
  size_unit: "sqft" | "sqm" | null;
  floor_level: string | null;
  total_floors: number | null;
  year_built: number | null;
  condition: "excellent" | "good" | "fair" | "needs_work" | null;
  furnishing: "unfurnished" | "semi_furnished" | "fully_furnished";
  
  // Amenities
  amenities: string[] | null;
  
  // Parking
  parking: "none" | "covered" | "open" | "garage";
  parking_spaces: number;
  
  // Policies
  pet_policy: "not_allowed" | "small_only" | "all_allowed" | "case_by_case";
  smoking_policy: "not_allowed" | "balcony_only" | "allowed";
  pets_allowed: boolean;
  smoking_allowed: boolean;
  children_allowed: boolean;
  
  // Security & Utilities
  security_features: SecurityFeatures;
  utilities: Utilities;
  
  // Photos
  photos: ListingPhoto[];
  cover_photo: string | null;
  video_url: string | null;
  
  // Pricing
  rent_amount: number;
  currency: string;
  rent_negotiable: boolean;
  deposit_months: number | null;
  deposit_amount: number | null;
  service_charge: number | null;
  
  // Lease Terms
  lease_term: "monthly" | "fixed" | "flexible";
  min_lease_months: number;
  
  // Availability
  available_from: string | null;
  available_now: boolean;
  
  // Payment
  payment_methods: string[];
  rent_includes: string[] | null;
  
  // Status
  status: string;
  
  // Analytics
  views_count: number;
  inquiries_count: number;
  
  // Verification
  is_verified: boolean;
  
  // Timestamps
  published_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Landlord info (from join)
  landlord?: LandlordInfo;
}

// Base listing row type (simplified)
export interface ListingRow {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  currency: string | null;
  deposit_amount: number | null;
  deposit_months: number | null;
  service_charge: number | null;
  rent_includes: string[] | null;
  rent_negotiable: boolean;
  area: string;
  city: string;
  photos: unknown;
  cover_photo: string | null;
  security_features: unknown;
  utilities: unknown;
  available_now: boolean;
  is_verified: boolean;
  published_at: string | null;
}

// Listing card for grid display (lighter version)
// Supports both residential and commercial properties
export interface ListingCard {
  id: string;
  title: string;
  slug: string;
  property_type: string;
  area: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  currency: string;
  cover_photo: string | null;
  is_verified: boolean;
  available_now: boolean;
  published_at: string | null;
  // Status (active, paused, rented, deleted)
  status?: "active" | "paused" | "rented" | "deleted";
  // Residential details
  size_sqft?: number | null;
  furnishing?: "unfurnished" | "semi_furnished" | "fully_furnished" | null;
  floor_level?: string | null;
  parking?: "none" | "covered" | "open" | "garage" | null;
  parking_spaces?: number | null;
  // Commercial category & type
  listing_category?: "residential" | "commercial" | null;
  commercial_type?: CommercialType | null;
  // Commercial metrics
  size_sqm?: number | null;
  workstation_capacity?: number | null;
  building_grade?: string | null;
  seating_capacity?: number | null;
  frontage_width_m?: number | null;
  clear_height_m?: number | null;
  loading_docks?: number | null;
  parking_spaces_count?: number | null;
  room_count?: number | null;
  plot_size_acres?: number | null;
}

// Commercial property type
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

// Price breakdown for display
export interface PriceBreakdown {
  rent: number;
  serviceCharge: number | null;
  totalMonthly: number;
  depositMonths: number;
  depositAmount: number;
  moveInCost: number;
  currency: string;
  rentIncludes: string[];
  isNegotiable: boolean;
}

// Helper function to parse listing photos from JSON
export function parseListingPhotos(photos: unknown): ListingPhoto[] {
  if (!photos || !Array.isArray(photos)) return [];
  
  return (photos as unknown[]).map((p, index) => {
    const photo = p as Record<string, unknown>;
    return {
      id: String(photo.id || index),
      url: String(photo.url || ""),
      path: String(photo.path || ""),
      category: (photo.category as ListingPhoto["category"]) || "extra",
      sort_order: Number(photo.sort_order || index),
    };
  }).filter(p => p.url);
}

// Helper function to parse security features
export function parseSecurityFeatures(features: unknown): SecurityFeatures {
  if (!features || typeof features !== "object") return {};
  const f = features as Record<string, unknown>;
  return {
    guard: f.guard as SecurityFeatures["guard"],
    cctv: f.cctv as SecurityFeatures["cctv"],
    access_control: f.access_control as SecurityFeatures["access_control"],
  };
}

// Helper function to parse utilities
export function parseUtilities(utilities: unknown): Utilities {
  if (!utilities || typeof utilities !== "object") return {};
  const u = utilities as Record<string, unknown>;
  return {
    water: u.water as Utilities["water"],
    has_storage: Boolean(u.has_storage),
    backup_power: u.backup_power as Utilities["backup_power"],
    internet_ready: Boolean(u.internet_ready),
    isps: Array.isArray(u.isps) ? (u.isps as string[]) : [],
  };
}

// Calculate price breakdown
export function calculatePriceBreakdown(listing: {
  rent_amount: number;
  service_charge: number | null;
  deposit_months: number | null;
  deposit_amount: number | null;
  currency: string | null;
  rent_includes: string[] | null;
  rent_negotiable: boolean;
}): PriceBreakdown {
  const rent = listing.rent_amount;
  const serviceCharge = listing.service_charge;
  const totalMonthly = rent + (serviceCharge || 0);
  const depositMonths = listing.deposit_months || 1;
  const depositAmount = listing.deposit_amount || (rent * depositMonths);
  const moveInCost = totalMonthly + depositAmount;

  return {
    rent,
    serviceCharge,
    totalMonthly,
    depositMonths,
    depositAmount,
    moveInCost,
    currency: listing.currency || "KES",
    rentIncludes: listing.rent_includes || [],
    isNegotiable: listing.rent_negotiable,
  };
}

// Generate SEO-friendly slug from listing
export function generateListingSlug(listing: { id: string; bedrooms: number; property_type: string; area: string }): string {
  const beds = listing.bedrooms > 0 ? `${listing.bedrooms}br` : "";
  const type = listing.property_type.replace(/_/g, "-");
  const area = listing.area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const idShort = listing.id.slice(0, 8);
  
  return [beds, type, area, idShort].filter(Boolean).join("-");
}
