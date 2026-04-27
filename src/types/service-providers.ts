// =============================================================================
// MITASAFI: SERVICE PROVIDER TYPES
// =============================================================================
// Type definitions for service providers, derived from database schema.
// Includes helper types for API responses and UI components.
// =============================================================================

import type { Database } from "./database";

// =============================================================================
// BASE TYPES (from Database)
// =============================================================================
// IMPORTANT: The generated types in database.ts reflect legacy table names from
// the live DB (e.g. provider_reviews, service_jobs). The canonical migration-
// defined tables use different names (reviews, bookings, etc.). When the DB
// types are regenerated after running all migrations, these aliases should be
// updated to reference the canonical table names. See M0.4 in milestones.
// =============================================================================

export type ServiceCategory = Database["public"]["Tables"]["service_categories"]["Row"];
export type ServiceCategoryInsert = Database["public"]["Tables"]["service_categories"]["Insert"];

export type ServiceSubcategory = Database["public"]["Tables"]["service_subcategories"]["Row"];
export type ServiceSubcategoryInsert = Database["public"]["Tables"]["service_subcategories"]["Insert"];

export type Service = Database["public"]["Tables"]["services"]["Row"];
export type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];

export type ServiceProvider = Database["public"]["Tables"]["service_providers"]["Row"];
export type ServiceProviderInsert = Database["public"]["Tables"]["service_providers"]["Insert"];
export type ServiceProviderUpdate = Database["public"]["Tables"]["service_providers"]["Update"];

export type ProviderService = Database["public"]["Tables"]["provider_services"]["Row"];
export type ProviderServiceInsert = Database["public"]["Tables"]["provider_services"]["Insert"];

/**
 * @deprecated Use `provider_availability_intervals` table and WorkingHoursEntry
 * interface instead. The `provider_availability` table uses a simple
 * day_of_week/start_time/end_time model that breaks on midnight crossings.
 * Profile actions already read/write from `provider_availability_intervals`.
 * This alias remains for backward compatibility until getProviderById is
 * migrated (see M0.6).
 */
export type ProviderAvailability = Database["public"]["Tables"]["provider_availability"]["Row"];
/** @deprecated See ProviderAvailability deprecation note */
export type ProviderAvailabilityInsert = Database["public"]["Tables"]["provider_availability"]["Insert"];

/**
 * @deprecated The `provider_blocked_dates` table no longer exists in the DB.
 * Use booking-level scheduling constraints instead.
 * Kept as an empty placeholder for backward compat; no code references it.
 */
export interface ProviderBlockedDate {
  id: string;
  provider_id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}
/** @deprecated See ProviderBlockedDate */
export type ProviderBlockedDateInsert = Omit<ProviderBlockedDate, "id" | "created_at">;

/**
 * Canonical table: `reviews`.
 * Previously mapped to the legacy `provider_reviews` table.
 */
export type ProviderReview = Database["public"]["Tables"]["reviews"]["Row"];
export type ProviderReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];

/**
 * @deprecated The app uses `provider_documents` / `provider_verification_documents`
 * for document verification. This type alias now points to the canonical
 * `provider_verification_documents` table.
 */
export type ProviderVerification = Database["public"]["Tables"]["provider_verification_documents"]["Row"];
/** @deprecated See ProviderVerification deprecation note */
export type ProviderVerificationInsert = Database["public"]["Tables"]["provider_verification_documents"]["Insert"];

export type SavedProvider = Database["public"]["Tables"]["saved_providers"]["Row"];
export type SavedProviderInsert = Database["public"]["Tables"]["saved_providers"]["Insert"];

/**
 * Canonical table: `bookings`.
 * Previously mapped to the legacy `service_jobs` table.
 * @deprecated Prefer using Database["public"]["Tables"]["bookings"]["Row"] directly or the Booking type from @/types/bookings.
 */
export type ServiceJob = Database["public"]["Tables"]["bookings"]["Row"];
/** @deprecated See ServiceJob note */
export type ServiceJobInsert = Database["public"]["Tables"]["bookings"]["Insert"];
/** @deprecated See ServiceJob note */
export type ServiceJobUpdate = Database["public"]["Tables"]["bookings"]["Update"];

/**
 * Canonical table: `booking_quotes`.
 * Previously mapped to the legacy `service_job_quotes` table.
 * @deprecated Prefer using Database["public"]["Tables"]["booking_quotes"]["Row"] directly.
 */
export type ServiceJobQuote = Database["public"]["Tables"]["booking_quotes"]["Row"];
/** @deprecated See ServiceJobQuote note */
export type ServiceJobQuoteInsert = Database["public"]["Tables"]["booking_quotes"]["Insert"];

/**
 * Canonical table: `booking_messages`.
 * Previously mapped to the legacy `service_job_messages` table.
 * @deprecated Prefer using Database["public"]["Tables"]["booking_messages"]["Row"] directly.
 */
export type ServiceJobMessage = Database["public"]["Tables"]["booking_messages"]["Row"];
/** @deprecated See ServiceJobMessage note */
export type ServiceJobMessageInsert = Database["public"]["Tables"]["booking_messages"]["Insert"];

// Provider documents (new table)
// Note: Will be available after migration is applied
export interface ProviderDocument {
  id: string;
  provider_id: string;
  document_type: 'national_id' | 'selfie_with_id' | 'business_registration' | 'kra_certificate' | 'professional_license' | 'other';
  document_url: string;
  document_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ENUM TYPES
// =============================================================================

// Provider type (individual or company) — canonical DB enum values
export type ServiceProviderType = 'individual' | 'company';

// Verification level for profiles
export type VerificationLevel = 'none' | 'phone' | 'identity' | 'full';

// These types were previously derived from Database["public"]["Enums"] but the
// legacy enums (job_status, job_priority, provider_type, etc.) were replaced by
// the canonical booking_status enum system. Kept as standalone types for
// backward compatibility with existing UI code that references them.
export type ProviderType = "individual" | "company";
export type ProviderStatus = "pending" | "active" | "suspended" | "inactive";
export type ProviderTier = "free" | "premium" | "enterprise";
export type JobStatus =
  | "pending"
  | "quoted"
  | "accepted"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";
export type JobPriority = "low" | "normal" | "urgent" | "emergency";
export type ServicePaymentStatus =
  | "pending"
  | "escrow"
  | "released"
  | "refunded"
  | "disputed";
export type VerificationStatus = Database["public"]["Enums"]["verification_status"];

// =============================================================================
// SERVICE ELIGIBILITY TYPES
// =============================================================================

// Result from can_provider_offer_service function
export interface ServiceEligibilityResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
  required_action?: 'upgrade_to_business' | 'upload_license' | 'upload_certification';
  recommended_action?: 'upload_certification';
  license_type?: string;
}

// Subcategory with restriction info (for UI)
export interface ServiceSubcategoryWithRestrictions extends ServiceSubcategory {
  requires_business: boolean;
  requires_license: boolean;
  license_type: string | null;
  individual_allowed: boolean;
  requires_certification: boolean;
}

// =============================================================================
// EXTENDED TYPES (with relations)
// =============================================================================

// Category with subcategories
export interface ServiceCategoryWithSubs extends ServiceCategory {
  subcategories: ServiceSubcategory[];
}

// Subcategory with services
export interface ServiceSubcategoryWithServices extends ServiceSubcategory {
  services: Service[];
  category?: ServiceCategory;
}

// Provider with services and reviews summary
export interface ServiceProviderWithDetails extends ServiceProvider {
  services: ProviderServiceWithDetails[];
  categories: string[];
  subcategories: string[];
  service_areas?: string[];
  recent_reviews?: ProviderReview[];
  availability?: ProviderAvailability[];
  working_hours?: WorkingHoursEntry[];
}

// Working hours entry for display
export interface WorkingHoursEntry {
  day_of_week: number;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
}

// Provider service with service details
export interface ProviderServiceWithDetails extends ProviderService {
  service: Service & {
    subcategory?: ServiceSubcategory & {
      category?: ServiceCategory;
    };
  };
}

// Review with reviewer info
export interface ProviderReviewWithReviewer extends ProviderReview {
  reviewer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Job with full details
export interface ServiceJobWithDetails extends ServiceJob {
  provider?: ServiceProvider;
  category?: ServiceCategory;
  subcategory?: ServiceSubcategory;
  service?: Service;
  quotes?: ServiceJobQuote[];
  messages?: ServiceJobMessage[];
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Provider list response
export interface ProvidersResponse {
  providers: ServiceProviderCardData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  categories: ServiceCategory[];
}

// Single provider response
export interface ProviderDetailResponse {
  provider: ServiceProviderWithDetails;
  reviews: PaginatedResponse<ProviderReviewWithReviewer>;
  similarProviders: ServiceProviderCardData[];
}

// Categories response
export interface CategoriesResponse {
  categories: ServiceCategoryWithSubs[];
}

// =============================================================================
// UI COMPONENT TYPES
// =============================================================================

// Simplified provider data for card display
export interface ServiceProviderCardData {
  id: string;
  business_name: string;
  tagline: string | null;                      // Required by product intent; nullable for legacy rows
  description: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  service_image_urls: string[];
  service_names: string[];                     // Human-readable names from provider_services → services.name
  service_areas: string[];
  is_available: boolean;
  instant_booking: boolean | null;
  is_verified: boolean | null;
  rating_average: number | null;
  rating_count: number | null;
  total_jobs_completed: number | null;
  response_time_minutes: number | null;        // Always shown — transparency is core to Mitasafi
  tier: ProviderTier | null;
  min_price: number | null;
  price_type: string | null;
  categories: string[];
  subcategories: string[];

  // ── Trust & Activity fields (Hybrid card v2) ────────────────────────
  years_in_business: number | null;
  last_active_at: string | null;               // ISO timestamp — drives green "active" dot
  has_insurance: boolean;                      // Aspirational — not yet populated from DB
  has_business_license: boolean;               // Aspirational — not yet populated from DB
  has_id_verified: boolean;                    // Aspirational — not yet populated from DB
}

// Provider card with comparison state
export interface ComparableProvider extends ServiceProviderCardData {
  isSelected: boolean;
}

// Filter state for services page
export interface ServiceFiltersState {
  category: string | null;
  subcategory: string | null;
  area: string[] | null;
  priceMin: number | null;
  priceMax: number | null;
  ratingMin: number | null;
  verifiedOnly: boolean;
  availableNow: boolean;
  instantBooking: boolean;
  sort: string;
  page: number;
  search: string | null; // Full-text search query
}

// Legacy alias for backwards compatibility
export interface ServiceProviderFilters {
  category?: string;
  subcategory?: string;
  area?: string[];
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  verifiedOnly?: boolean;
  availableNow?: boolean;
  instantBooking?: boolean;
  sort?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

// Search params for URL
export interface ServiceSearchParams {
  category?: string;
  subcategory?: string;
  area?: string;
  priceMin?: string;
  priceMax?: string;
  ratingMin?: string;
  verified?: string;
  available?: string;
  instant?: string;
  sort?: string;
  page?: string;
  q?: string;
}

// =============================================================================
// FORM TYPES
// =============================================================================

// Job request form data
export interface JobRequestFormData {
  categoryId: string;
  subcategoryId?: string;
  serviceId?: string;
  title: string;
  description: string;
  address: string;
  area: string;
  preferredDate?: string;
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  isFlexible: boolean;
  priority: JobPriority;
  photos?: File[];
}

// Quote response form
export interface QuoteFormData {
  amount: number;
  description?: string;
  estimatedDuration?: string;
  includesMaterials: boolean;
  materialsCost?: number;
  materialsDescription?: string;
  validUntil?: string;
}

// Review form data
export interface ReviewFormData {
  overallRating: number;
  qualityRating?: number;
  punctualityRating?: number;
  communicationRating?: number;
  valueRating?: number;
  title?: string;
  review?: string;
  photos?: File[];
}

// =============================================================================
// COMPARISON TYPES
// =============================================================================

export interface ComparisonMetric {
  key: string;
  label: string;
  type: "number" | "rating" | "boolean" | "text" | "list";
  higherIsBetter?: boolean;
}

export const COMPARISON_METRICS: ComparisonMetric[] = [
  { key: "rating_average", label: "Rating", type: "rating", higherIsBetter: true },
  { key: "rating_count", label: "Reviews", type: "number", higherIsBetter: true },
  { key: "total_jobs_completed", label: "Jobs Completed", type: "number", higherIsBetter: true },
  { key: "response_time_minutes", label: "Response Time", type: "number", higherIsBetter: false },
  { key: "min_price", label: "Starting Price", type: "number", higherIsBetter: false },
  { key: "is_verified", label: "Verified", type: "boolean" },
  { key: "instant_booking", label: "Instant Booking", type: "boolean" },
  { key: "service_areas", label: "Service Areas", type: "list" },
];

// =============================================================================
// AVAILABILITY TYPES
// =============================================================================

export interface TimeSlot {
  start: string;  // HH:mm format
  end: string;    // HH:mm format
}

export interface DayAvailability {
  dayOfWeek: number;
  dayName: string;
  isAvailable: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  days: DayAvailability[];
  blockedDates: string[];  // ISO date strings
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a provider serves a specific area
 */
export function providerServesArea(provider: ServiceProviderCardData, area: string): boolean {
  return provider.service_areas.includes(area);
}

/**
 * Get provider's display price
 */
export function getProviderDisplayPrice(provider: ServiceProviderCardData): string {
  if (!provider.min_price) return "Get Quote";
  
  const formatted = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(provider.min_price);
  
  return `From ${formatted}`;
}

/**
 * Get provider's response time label
 */
export function getResponseTimeLabel(minutes: number | null): string {
  if (!minutes) return "Response time varies";
  if (minutes < 60) return `Responds in ~${minutes} min`;
  if (minutes < 1440) return `Responds in ~${Math.round(minutes / 60)} hr`;
  return `Responds in ~${Math.round(minutes / 1440)} day`;
}

/**
 * Check if provider can be instantly booked
 */
export function canInstantBook(provider: ServiceProviderCardData): boolean {
  return provider.instant_booking === true && provider.is_available === true;
}

/**
 * Get tier sort weight (for sorting)
 */
export function getTierWeight(tier: ProviderTier | null): number {
  switch (tier) {
    case "enterprise": return 3;
    case "premium": return 2;
    case "free": return 1;
    default: return 0;
  }
}
