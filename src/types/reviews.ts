// =============================================================================
// MITASAFI: REVIEW & RATING TYPES (M7)
// =============================================================================
// Type definitions for the review system.
// Manually defined to match the canonical `reviews` and `review_helpful_votes`
// migration tables (20260108120005_support_tables.sql).
//
// The `review_rating` PostgreSQL enum stores values as '1'..'5'.
// We map these to numbers in application code for arithmetic/comparison.
// =============================================================================

// =============================================================================
// DATABASE ENUMS
// =============================================================================

/**
 * Maps to the PostgreSQL `review_rating` enum: '1','2','3','4','5'.
 * String union used for DB ↔ TS mapping; convert to number for UI.
 */
export type ReviewRatingEnum = "1" | "2" | "3" | "4" | "5";

// =============================================================================
// ROW TYPES (matching canonical migration columns)
// =============================================================================

/** Row shape for the `reviews` table. */
export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  provider_id: string;
  service_id: string;
  rating: ReviewRatingEnum;
  title: string | null;
  review_text: string | null;
  quality_rating: ReviewRatingEnum | null;
  communication_rating: ReviewRatingEnum | null;
  timeliness_rating: ReviewRatingEnum | null;
  professionalism_rating: ReviewRatingEnum | null;
  value_rating: ReviewRatingEnum | null;
  review_photos: string[] | null;
  provider_response: string | null;
  provider_responded_at: string | null;
  is_verified_booking: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

/** Insert shape for the `reviews` table. */
export interface ReviewInsert {
  booking_id: string;
  reviewer_id: string;
  provider_id: string;
  service_id: string;
  rating: ReviewRatingEnum;
  title?: string | null;
  review_text?: string | null;
  quality_rating?: ReviewRatingEnum | null;
  communication_rating?: ReviewRatingEnum | null;
  timeliness_rating?: ReviewRatingEnum | null;
  professionalism_rating?: ReviewRatingEnum | null;
  value_rating?: ReviewRatingEnum | null;
  review_photos?: string[] | null;
  is_verified_booking?: boolean;
}

/** Row shape for the `review_helpful_votes` table. */
export interface ReviewHelpfulVote {
  id: string;
  review_id: string;
  user_id: string;
  is_helpful: boolean;
  created_at: string;
}

/** Insert shape for the `review_helpful_votes` table. */
export interface ReviewHelpfulVoteInsert {
  review_id: string;
  user_id: string;
  is_helpful: boolean;
}

// =============================================================================
// EXTENDED TYPES (with relations)
// =============================================================================

/** Review with joined reviewer profile and helpful vote counts. */
export interface ReviewWithReviewer extends Review {
  reviewer: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  helpful_count: number;
  unhelpful_count: number;
  /** The current user's vote on this review, if any. */
  current_user_vote?: boolean | null;
}

// =============================================================================
// FORM TYPES
// =============================================================================

/**
 * Data shape for the review creation form.
 * Ratings are 1-5 numbers in the form; converted to ReviewRatingEnum on submit.
 */
export interface ReviewFormData {
  rating: number;
  title: string;
  reviewText: string;
  qualityRating: number | null;
  communicationRating: number | null;
  timelinessRating: number | null;
  professionalismRating: number | null;
  valueRating: number | null;
  photos: File[];
}

/** Data shape for the provider response form. */
export interface ProviderResponseFormData {
  response: string;
}

// =============================================================================
// ACTION RESULT TYPES
// =============================================================================

/** Result shape returned by review server actions. */
export interface ReviewActionResult {
  success: boolean;
  reviewId?: string;
  error?: string;
}

/** Result shape returned by vote server actions. */
export interface VoteActionResult {
  success: boolean;
  error?: string;
}

/** Result shape returned by flag/report actions. */
export interface FlagActionResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

/** Parameters for fetching paginated reviews. */
export interface ReviewQueryParams {
  providerId: string;
  page?: number;
  pageSize?: number;
  ratingFilter?: number | null;
  sortBy?: "newest" | "oldest" | "highest" | "lowest" | "most_helpful";
}

/** Summary statistics for a provider's reviews. */
export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    /** Count of 5-star reviews */
    5: number;
    /** Count of 4-star reviews */
    4: number;
    /** Count of 3-star reviews */
    3: number;
    /** Count of 2-star reviews */
    2: number;
    /** Count of 1-star reviews */
    1: number;
  };
  averageDimensions: {
    quality: number | null;
    communication: number | null;
    timeliness: number | null;
    professionalism: number | null;
    value: number | null;
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Convert a numeric rating (1-5) to the DB enum string. */
export function toRatingEnum(n: number): ReviewRatingEnum {
  const clamped = Math.min(5, Math.max(1, Math.round(n)));
  return String(clamped) as ReviewRatingEnum;
}

/** Convert a DB enum string ('1'-'5') to a number. */
export function fromRatingEnum(r: ReviewRatingEnum | null | undefined): number | null {
  if (r == null) return null;
  return parseInt(r, 10);
}

/** Format a rating number for display (e.g., 4.5 → "4.5"). */
export function formatRatingDisplay(rating: number | null): string {
  if (rating == null) return "—";
  return rating.toFixed(1);
}

/** Get a human-readable label for a star rating. */
export function getRatingLabel(rating: number): string {
  switch (rating) {
    case 5: return "Excellent";
    case 4: return "Very Good";
    case 3: return "Good";
    case 2: return "Fair";
    case 1: return "Poor";
    default: return "";
  }
}
