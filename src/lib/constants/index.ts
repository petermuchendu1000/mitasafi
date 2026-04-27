// =============================================================================
// MITASAFI: SHARED CONSTANTS
// =============================================================================
// Centralized constants for areas, service categories, and other shared data.
// Used across the application for consistency.
// =============================================================================

import {
  Truck,
  Sparkles,
  Wrench,
  PaintBucket,
  Wifi,
  Heart,
  Shield,
  PawPrint,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// NAIROBI AREAS
// =============================================================================
// Used for both property listings and service providers

export const NAIROBI_AREAS = [
  "Westlands",
  "Kilimani",
  "Lavington",
  "Kileleshwa",
  "South B",
  "South C",
  "Langata",
  "Karen",
  "Ruaka",
  "Ruiru",
  "Parklands",
  "Upper Hill",
] as const;

export type NairobiArea = (typeof NAIROBI_AREAS)[number];

// Area groups for filtering
export const AREA_GROUPS = {
  "Central & West": ["Westlands", "Parklands", "Kilimani", "Lavington", "Kileleshwa"],
  "South": ["South B", "South C", "Langata", "Karen"],
  "North & East": ["Ruaka", "Ruiru", "Upper Hill"],
} as const;

// =============================================================================
// SERVICE CATEGORIES
// =============================================================================
// Based on PRD - 8 Major Categories that group related services
// Each major category maps to multiple database subcategories

export interface ServiceCategory {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  isEmergencyAvailable: boolean;
  // Database category IDs that map to this major category
  dbCategoryIds: string[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "moving",
    name: "Moving & Packing",
    shortName: "Moving",
    description: "Movers, truck rental, packing services",
    icon: Truck,
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-600",
    isEmergencyAvailable: false,
    dbCategoryIds: ["moving"],
  },
  {
    id: "cleaning",
    name: "Cleaning",
    shortName: "Cleaning",
    description: "Deep clean, regular cleaning, fumigation",
    icon: Sparkles,
    color: "cyan",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-600",
    isEmergencyAvailable: false,
    dbCategoryIds: ["cleaning", "pest-control", "laundry"],
  },
  {
    id: "repairs",
    name: "Repairs & Maintenance",
    shortName: "Repairs",
    description: "Plumber, electrician, HVAC, locksmith",
    icon: Wrench,
    color: "orange",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-600",
    isEmergencyAvailable: true,
    dbCategoryIds: ["plumbing", "electrical", "hvac", "locksmith", "appliance-repair", "roofing", "glass"],
  },
  {
    id: "interior",
    name: "Interior & Design",
    shortName: "Interior",
    description: "Painters, designers, carpentry, flooring",
    icon: PaintBucket,
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-600",
    isEmergencyAvailable: false,
    dbCategoryIds: ["interior-design", "painting", "flooring", "carpentry", "renovation"],
  },
  {
    id: "utilities",
    name: "Utilities & Tech",
    shortName: "Utilities",
    description: "Internet, water, electricity, smart home",
    icon: Wifi,
    color: "green",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-600",
    isEmergencyAvailable: false,
    dbCategoryIds: ["tech-support", "water-services", "waste-management"],
  },
  {
    id: "lifestyle",
    name: "Lifestyle Services",
    shortName: "Lifestyle",
    description: "Food delivery, laundry, groceries",
    icon: Heart,
    color: "pink",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-600",
    isEmergencyAvailable: false,
    dbCategoryIds: ["catering", "events", "childcare", "landscaping"],
  },
  {
    id: "security",
    name: "Security",
    shortName: "Security",
    description: "Guards, CCTV, alarms, access control",
    icon: Shield,
    color: "slate",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-slate-600",
    isEmergencyAvailable: true,
    dbCategoryIds: ["security"],
  },
  {
    id: "pets",
    name: "Pet Care",
    shortName: "Pets",
    description: "Grooming, veterinary, pet sitting",
    icon: PawPrint,
    color: "amber",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    isEmergencyAvailable: false,
    dbCategoryIds: ["pet-care"],
  },
] as const;

// Helper to get category by ID (either major category ID or db category ID)
export function getCategoryById(id: string): ServiceCategory | undefined {
  // First check if it's a major category ID
  const majorCategory = SERVICE_CATEGORIES.find((cat) => cat.id === id);
  if (majorCategory) return majorCategory;
  
  // Otherwise, find which major category contains this db category
  return SERVICE_CATEGORIES.find((cat) => cat.dbCategoryIds.includes(id));
}

// Helper to get category icon component
export function getCategoryIcon(id: string): LucideIcon | undefined {
  return getCategoryById(id)?.icon;
}

// =============================================================================
// PRICE DISPLAY HELPERS
// =============================================================================

export type PriceType = "fixed" | "hourly" | "per_sqm" | "quote_only";

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: "",
  hourly: "/hr",
  per_sqm: "/sqm",
  quote_only: "",
};

export function formatServicePrice(
  price: number | null | undefined,
  priceType: PriceType = "fixed",
  currency: string = "KES"
): string {
  if (price === null || price === undefined) {
    return "Get Quote";
  }
  
  if (priceType === "quote_only") {
    return "Get Quote";
  }
  
  const formatted = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  
  // Safely get the price type label, defaulting to empty string
  const label = PRICE_TYPE_LABELS[priceType] ?? "";
  
  return `${formatted}${label}`;
}

export function formatPriceRange(min: number | null, max: number | null): string {
  if (!min && !max) return "Price on request";
  if (!min) return `Up to KES ${max?.toLocaleString()}`;
  if (!max) return `From KES ${min.toLocaleString()}`;
  return `KES ${min.toLocaleString()} - ${max.toLocaleString()}`;
}

// =============================================================================
// RATING HELPERS
// =============================================================================

export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return "New";
  return rating.toFixed(1);
}

export function getRatingLabel(rating: number): string {
  if (rating >= 4.8) return "Excellent";
  if (rating >= 4.5) return "Very Good";
  if (rating >= 4.0) return "Good";
  if (rating >= 3.5) return "Fair";
  return "Needs Improvement";
}

// =============================================================================
// PROVIDER TIER HELPERS
// =============================================================================

export type ProviderTier = "free" | "premium" | "enterprise";

export interface TierConfig {
  label: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  benefits: string[];
}

export const TIER_CONFIG: Record<ProviderTier, TierConfig> = {
  free: {
    label: "Standard",
    badge: "",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    benefits: ["Basic listing", "Customer inquiries"],
  },
  premium: {
    label: "Premium",
    badge: "Premium",
    color: "text-brand-600",
    bgColor: "bg-brand-50",
    borderColor: "border-brand-300",
    benefits: ["Priority listing", "Featured in search", "Analytics dashboard"],
  },
  enterprise: {
    label: "Enterprise",
    badge: "Featured",
    color: "text-warning-600",
    bgColor: "bg-warning-50",
    borderColor: "border-warning-400",
    benefits: ["Top placement", "Dedicated support", "Custom branding"],
  },
};

// =============================================================================
// JOB STATUS HELPERS
// =============================================================================

export type JobStatus =
  | "pending"
  | "quoted"
  | "accepted"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export interface JobStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const JOB_STATUS_CONFIG: Record<JobStatus, JobStatusConfig> = {
  pending: {
    label: "Pending",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    description: "Waiting for provider quotes",
  },
  quoted: {
    label: "Quoted",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    description: "Quotes received, awaiting your decision",
  },
  accepted: {
    label: "Accepted",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    description: "Quote accepted, scheduling in progress",
  },
  scheduled: {
    label: "Scheduled",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    description: "Job scheduled with provider",
  },
  in_progress: {
    label: "In Progress",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    description: "Provider is working on the job",
  },
  completed: {
    label: "Completed",
    color: "text-green-700",
    bgColor: "bg-green-100",
    description: "Job completed successfully",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    description: "Job was cancelled",
  },
  disputed: {
    label: "Disputed",
    color: "text-red-700",
    bgColor: "bg-red-100",
    description: "Issue raised, under review",
  },
};

// =============================================================================
// AVAILABILITY HELPERS
// =============================================================================

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAYS_OF_WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatDayOfWeek(dayIndex: number, short: boolean = false): string {
  return short ? DAYS_OF_WEEK_SHORT[dayIndex] : DAYS_OF_WEEK[dayIndex];
}

// =============================================================================
// SORT OPTIONS
// =============================================================================

export interface SortOption {
  value: string;
  label: string;
  field: string;
  direction: "asc" | "desc";
}

export const PROVIDER_SORT_OPTIONS: SortOption[] = [
  { value: "recommended", label: "Recommended", field: "tier", direction: "desc" },
  { value: "rating-high", label: "Highest Rated", field: "rating_average", direction: "desc" },
  { value: "reviews-most", label: "Most Reviews", field: "rating_count", direction: "desc" },
  { value: "price-low", label: "Price: Low to High", field: "min_price", direction: "asc" },
  { value: "price-high", label: "Price: High to Low", field: "min_price", direction: "desc" },
  { value: "jobs-most", label: "Most Jobs Completed", field: "total_jobs_completed", direction: "desc" },
];

// =============================================================================
// FILTER DEFAULTS
// =============================================================================

export interface ServiceFilters {
  category?: string;
  subcategory?: string;
  area?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  verifiedOnly?: boolean;
  availableNow?: boolean;
  instantBooking?: boolean;
  sort?: string;
  page?: number;
}

export const DEFAULT_SERVICE_FILTERS: ServiceFilters = {
  category: undefined,
  subcategory: undefined,
  area: undefined,
  priceMin: undefined,
  priceMax: undefined,
  ratingMin: undefined,
  verifiedOnly: false,
  availableNow: false,
  instantBooking: false,
  sort: "recommended",
  page: 1,
};

// =============================================================================
// PAGINATION
// =============================================================================

export const PROVIDERS_PER_PAGE = 12;
export const FEATURED_PROVIDERS_LIMIT = 6;
