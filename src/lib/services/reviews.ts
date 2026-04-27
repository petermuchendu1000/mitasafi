"use server";

// =============================================================================
// MITASAFI: REVIEW SERVICE ACTIONS (M7)
// =============================================================================
// Server actions for the review & rating system:
//   - submitReview: Customer submits a review after job completion
//   - submitProviderResponse: Provider responds to a review
//   - voteReviewHelpful: Any user votes a review helpful/unhelpful
//   - flagReview: Any user reports a review for moderation
//   - getReviewForBooking: Check if a review exists for a given booking
//   - getProviderReviewsWithVotes: Paginated reviews with vote counts
//   - getProviderReviewSummary: Rating distribution and averages
//
// Every action follows the pattern:
//   1. Authenticate the caller
//   2. Validate ownership / authorization
//   3. Validate business rules
//   4. Perform the operation
//   5. Update aggregates (where applicable)
//   6. Fire notifications
//   7. Revalidate caches
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
import { revalidatePath } from "next/cache";
import {
  notifyProviderNewReview,
  notifyCustomerReviewResponse,
} from "@/lib/notifications/triggers";
import { checkMultipleContent } from "@/lib/moderation/content-filter";
import type {
  ReviewActionResult,
  ReviewWithReviewer,
  ReviewSummary,
  ReviewQueryParams,
  ReviewRatingEnum,
  VoteActionResult,
  FlagActionResult,
  Review,
} from "@/types/reviews";
import type { PaginatedResponse } from "@/types/service-providers";
import type { Database } from "@/types/database";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Statuses that allow a customer to leave a review. */
const REVIEWABLE_STATUSES = new Set([
  "customer_confirmed",
  "payment_pending",
  "resolved",
]);

/** Maximum number of photos per review. */
const MAX_REVIEW_PHOTOS = 5;

/** Maximum review text length (characters). */
const MAX_REVIEW_TEXT_LENGTH = 2000;

/** Maximum provider response length (characters). */
const MAX_RESPONSE_LENGTH = 1000;

/** Maximum title length (characters). */
const MAX_TITLE_LENGTH = 100;

// =============================================================================
// SUBMIT REVIEW
// =============================================================================

/**
 * Submit a review for a completed booking.
 *
 * Authorization: Only the customer who made the booking can review.
 * Business rules:
 *   - Booking must be in a reviewable status (customer_confirmed+)
 *   - One review per booking (enforced by DB unique constraint)
 *   - Rating is required (1-5)
 *   - Automatically recalculates provider average rating
 */
export async function submitReview(
  bookingId: string,
  data: {
    rating: number;
    title?: string;
    reviewText?: string;
    qualityRating?: number | null;
    communicationRating?: number | null;
    timelinessRating?: number | null;
    professionalismRating?: number | null;
    valueRating?: number | null;
    photoUrls?: string[];
  }
): Promise<ReviewActionResult> {
  try {
    // 1. Authenticate
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to leave a review." };
    }

    // 2. Validate rating range
    if (!data.rating || data.rating < 1 || data.rating > 5 || !Number.isInteger(data.rating)) {
      return { success: false, error: "Rating must be a whole number between 1 and 5." };
    }

    // 3. Validate text lengths
    if (data.title && data.title.length > MAX_TITLE_LENGTH) {
      return { success: false, error: `Title must be under ${MAX_TITLE_LENGTH} characters.` };
    }
    if (data.reviewText && data.reviewText.length > MAX_REVIEW_TEXT_LENGTH) {
      return { success: false, error: `Review must be under ${MAX_REVIEW_TEXT_LENGTH} characters.` };
    }

    // 4. Validate photos count
    if (data.photoUrls && data.photoUrls.length > MAX_REVIEW_PHOTOS) {
      return { success: false, error: `Maximum ${MAX_REVIEW_PHOTOS} photos allowed.` };
    }

    // 5. Profanity / abuse filter
    const contentCheck = checkMultipleContent([data.title, data.reviewText]);
    if (contentCheck.flagged) {
      return {
        success: false,
        error: "Your review contains inappropriate language. Please revise and resubmit.",
      };
    }

    // 6. Validate dimension ratings
    const dimensionRatings = [
      data.qualityRating,
      data.communicationRating,
      data.timelinessRating,
      data.professionalismRating,
      data.valueRating,
    ];
    for (const dr of dimensionRatings) {
      if (dr != null && (dr < 1 || dr > 5 || !Number.isInteger(dr))) {
        return { success: false, error: "Dimension ratings must be whole numbers between 1 and 5." };
      }
    }

    const admin = createAdminClient();

    // 7. Fetch the booking and verify ownership + status
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, customer_id, provider_id, service_id, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: "Booking not found." };
    }

    if (booking.customer_id !== user.id) {
      return { success: false, error: "You can only review your own bookings." };
    }

    if (!booking.status || !REVIEWABLE_STATUSES.has(booking.status)) {
      return {
        success: false,
        error: "You can only review a booking after confirming completion.",
      };
    }

    if (!booking.provider_id) {
      return { success: false, error: "This booking has no assigned provider." };
    }

    // 8. Check for existing review (defense-in-depth; DB constraint also enforces)
    const { data: existingReview } = await admin
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingReview) {
      return { success: false, error: "You have already reviewed this booking." };
    }

    // 9. Convert numeric ratings to DB enum strings
    type ReviewRating = Database["public"]["Enums"]["review_rating"];
    const toEnum = (n: number | null | undefined): ReviewRating | null => {
      if (n == null) return null;
      return String(Math.min(5, Math.max(1, Math.round(n)))) as ReviewRating;
    };

    // 10. Insert the review
    const { data: newReview, error: insertError } = await admin
      .from("reviews")
      .insert({
        booking_id: bookingId,
        reviewer_id: user.id,
        provider_id: booking.provider_id,
        service_id: booking.service_id,
        rating: toEnum(data.rating)!,
        title: data.title?.trim() || null,
        review_text: data.reviewText?.trim() || null,
        quality_rating: toEnum(data.qualityRating),
        communication_rating: toEnum(data.communicationRating),
        timeliness_rating: toEnum(data.timelinessRating),
        professionalism_rating: toEnum(data.professionalismRating),
        value_rating: toEnum(data.valueRating),
        review_photos: data.photoUrls?.length ? data.photoUrls : null,
        is_verified_booking: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Reviews] Insert error:", insertError);
      // Handle specific constraint violations
      if (insertError.code === "23505") {
        return { success: false, error: "You have already reviewed this booking." };
      }
      return { success: false, error: "Failed to submit review. Please try again." };
    }

    // 11. Recalculate provider average rating and total reviews
    await recalculateProviderRating(booking.provider_id);

    // 12. Notify the provider
    try {
      // Fetch provider user_id for notification
      const { data: provider } = await admin
        .from("service_providers")
        .select("user_id, business_name")
        .eq("id", booking.provider_id)
        .single();

      // Fetch reviewer name
      const { data: reviewerProfile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Fetch service name
      const { data: service } = await admin
        .from("services")
        .select("name")
        .eq("id", booking.service_id)
        .single();

      if (provider?.user_id) {
        await notifyProviderNewReview({
          providerUserId: provider.user_id,
          providerId: booking.provider_id,
          bookingId,
          reviewId: newReview.id,
          customerName: reviewerProfile?.full_name || "A customer",
          serviceName: service?.name || "a service",
          rating: data.rating,
        });
      }
    } catch (notifErr) {
      // Non-blocking: notification failure shouldn't fail the review
      console.error("[Reviews] Notification error:", notifErr);
    }

    // 13. Revalidate caches
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    revalidatePath(`/dashboard/provider/reviews`);
    revalidatePath(`/services/provider/${booking.provider_id}`);

    return { success: true, reviewId: newReview.id };
  } catch (err) {
    console.error("[Reviews] submitReview unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// =============================================================================
// RECALCULATE PROVIDER RATING
// =============================================================================

/**
 * Recalculate and update provider's average_rating and total_reviews.
 * Uses an aggregate query over all non-hidden reviews.
 */
async function recalculateProviderRating(providerId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    // Aggregate all visible reviews for this provider
    const { data: reviews, error } = await admin
      .from("reviews")
      .select("rating")
      .eq("provider_id", providerId)
      .eq("is_hidden", false);

    if (error) {
      console.error("[Reviews] Rating recalculation query error:", error);
      return;
    }

    const total = reviews?.length ?? 0;
    let average: number | null = null;

    if (total > 0) {
      const sum = reviews.reduce(
        (acc: number, r: { rating: string }) => acc + parseInt(r.rating, 10),
        0
      );
      average = parseFloat((sum / total).toFixed(2));
    }

    const { error: updateError } = await admin
      .from("service_providers")
      .update({
        average_rating: average,
        total_reviews: total,
      })
      .eq("id", providerId);

    if (updateError) {
      console.error("[Reviews] Provider rating update error:", updateError);
    }
  } catch (err) {
    console.error("[Reviews] recalculateProviderRating error:", err);
  }
}

// =============================================================================
// SUBMIT PROVIDER RESPONSE
// =============================================================================

/**
 * Provider writes a single response to a customer review.
 *
 * Authorization: Only the provider referenced in the review can respond.
 * Business rules:
 *   - One response per review (overwrites if already exists)
 *   - Cannot respond to hidden/flagged reviews
 */
export async function submitProviderResponse(
  reviewId: string,
  response: string
): Promise<ReviewActionResult> {
  try {
    // 1. Authenticate as provider
    const { providerId, error: providerError } = await getCachedProviderId();
    if (providerError || !providerId) {
      return { success: false, error: "You must be a registered provider." };
    }

    // 2. Validate response text
    const trimmed = response.trim();
    if (!trimmed) {
      return { success: false, error: "Response cannot be empty." };
    }
    if (trimmed.length > MAX_RESPONSE_LENGTH) {
      return { success: false, error: `Response must be under ${MAX_RESPONSE_LENGTH} characters.` };
    }

    // 2b. Profanity / abuse filter
    const contentCheck = checkMultipleContent([trimmed]);
    if (contentCheck.flagged) {
      return {
        success: false,
        error: "Your response contains inappropriate language. Please revise.",
      };
    }

    const admin = createAdminClient();

    // 3. Fetch the review and verify ownership
    const { data: review, error: fetchError } = await admin
      .from("reviews")
      .select("id, provider_id, reviewer_id, booking_id, is_hidden, is_flagged")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return { success: false, error: "Review not found." };
    }

    if (review.provider_id !== providerId) {
      return { success: false, error: "You can only respond to reviews left for you." };
    }

    if (review.is_hidden) {
      return { success: false, error: "Cannot respond to a hidden review." };
    }

    // 4. Update the review with provider response
    const { error: updateError } = await admin
      .from("reviews")
      .update({
        provider_response: trimmed,
        provider_responded_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (updateError) {
      console.error("[Reviews] Provider response update error:", updateError);
      return { success: false, error: "Failed to save response. Please try again." };
    }

    // 5. Notify the customer
    try {
      const { data: provider } = await admin
        .from("service_providers")
        .select("business_name")
        .eq("id", providerId)
        .single();

      await notifyCustomerReviewResponse({
        customerUserId: review.reviewer_id,
        bookingId: review.booking_id,
        reviewId,
        providerName: provider?.business_name || "Your provider",
      });
    } catch (notifErr) {
      console.error("[Reviews] Response notification error:", notifErr);
    }

    // 6. Revalidate caches
    revalidatePath(`/dashboard/provider/reviews`);
    revalidatePath(`/dashboard/bookings/${review.booking_id}`);

    return { success: true, reviewId };
  } catch (err) {
    console.error("[Reviews] submitProviderResponse error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// =============================================================================
// VOTE REVIEW HELPFUL
// =============================================================================

/**
 * Any authenticated user can vote a review as helpful or unhelpful.
 * Each user can vote once per review (upsert pattern).
 */
export async function voteReviewHelpful(
  reviewId: string,
  isHelpful: boolean
): Promise<VoteActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to vote." };
    }

    const admin = createAdminClient();

    // Verify the review exists and is visible
    const { data: review, error: fetchError } = await admin
      .from("reviews")
      .select("id, is_hidden")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return { success: false, error: "Review not found." };
    }

    if (review.is_hidden) {
      return { success: false, error: "Cannot vote on a hidden review." };
    }

    // Upsert the vote (one_vote_per_user_per_review constraint)
    const { error: upsertError } = await admin
      .from("review_helpful_votes")
      .upsert(
        {
          review_id: reviewId,
          user_id: user.id,
          is_helpful: isHelpful,
        },
        { onConflict: "review_id,user_id" }
      );

    if (upsertError) {
      console.error("[Reviews] Vote upsert error:", upsertError);
      return { success: false, error: "Failed to record vote." };
    }

    return { success: true };
  } catch (err) {
    console.error("[Reviews] voteReviewHelpful error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// =============================================================================
// REMOVE VOTE
// =============================================================================

/**
 * Remove a user's vote on a review (toggle off).
 */
export async function removeReviewVote(reviewId: string): Promise<VoteActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in." };
    }

    const admin = createAdminClient();

    const { error: deleteError } = await admin
      .from("review_helpful_votes")
      .delete()
      .eq("review_id", reviewId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[Reviews] Vote delete error:", deleteError);
      return { success: false, error: "Failed to remove vote." };
    }

    return { success: true };
  } catch (err) {
    console.error("[Reviews] removeReviewVote error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// =============================================================================
// FLAG REVIEW
// =============================================================================

/**
 * Any authenticated user can flag/report a review for moderation.
 */
export async function flagReview(
  reviewId: string,
  reason: string
): Promise<FlagActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "You must be signed in to report a review." };
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return { success: false, error: "Please provide a reason for reporting." };
    }
    if (trimmedReason.length > 500) {
      return { success: false, error: "Reason must be under 500 characters." };
    }

    const admin = createAdminClient();

    // Verify the review exists
    const { data: review, error: fetchError } = await admin
      .from("reviews")
      .select("id, is_flagged")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return { success: false, error: "Review not found." };
    }

    if (review.is_flagged) {
      return { success: false, error: "This review has already been reported." };
    }

    // Flag the review
    const { error: updateError } = await admin
      .from("reviews")
      .update({
        is_flagged: true,
        flag_reason: trimmedReason,
      })
      .eq("id", reviewId);

    if (updateError) {
      console.error("[Reviews] Flag update error:", updateError);
      return { success: false, error: "Failed to report review." };
    }

    return { success: true };
  } catch (err) {
    console.error("[Reviews] flagReview error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// =============================================================================
// GET REVIEW FOR BOOKING
// =============================================================================

/**
 * Check if a review already exists for a booking.
 * Used by the review form page to prevent duplicate submissions.
 */
export async function getReviewForBooking(
  bookingId: string
): Promise<{ review: Review | null; error: string | null }> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { review: null, error: "Not authenticated." };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (error) {
      console.error("[Reviews] getReviewForBooking error:", error);
      return { review: null, error: error.message };
    }

    return { review: data as Review | null, error: null };
  } catch (err) {
    console.error("[Reviews] getReviewForBooking unexpected:", err);
    return {
      review: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET CUSTOMER REVIEWS (MY REVIEWS)
// =============================================================================

/**
 * Paginated reviews submitted by a specific customer, enriched with
 * provider name, service name, and booking reference.
 *
 * Used by the customer "My Reviews" dashboard page.
 */
export async function getCustomerReviews(
  userId: string,
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<CustomerReviewItem>> {
  const emptyResult: PaginatedResponse<CustomerReviewItem> = {
    data: [],
    pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
  };

  try {
    const supabase = await createClient();
    const offset = (page - 1) * pageSize;

    // Fetch reviews authored by this customer, ordered newest first
    const { data: reviews, error, count } = await supabase
      .from("reviews")
      .select("*", { count: "exact" })
      .eq("reviewer_id", userId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("[Reviews] getCustomerReviews error:", error);
      return emptyResult;
    }

    if (!reviews || reviews.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / pageSize),
          hasMore: false,
        },
      };
    }

    // Collect IDs for batch joining
    const providerIds = [...new Set(reviews.map((r: { provider_id: string }) => r.provider_id))];
    const serviceIds = [...new Set(reviews.map((r: { service_id: string }) => r.service_id).filter(Boolean))];

    // Parallel fetch: provider names, service names
    const [providersResult, servicesResult] = await Promise.all([
      supabase
        .from("service_providers")
        .select("id, business_name, profile_photo_url")
        .in("id", providerIds),
      serviceIds.length > 0
        ? supabase
            .from("services")
            .select("id, name")
            .in("id", serviceIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Build lookup maps
    const providerMap = new Map<string, { business_name: string; profile_photo_url: string | null }>();
    for (const p of providersResult.data ?? []) {
      providerMap.set(p.id, { business_name: p.business_name, profile_photo_url: p.profile_photo_url });
    }

    const serviceMap = new Map<string, string>();
    for (const s of (servicesResult as { data: Array<{ id: string; name: string }> | null }).data ?? []) {
      serviceMap.set(s.id, s.name);
    }

    // Assemble enriched items
    const enriched: CustomerReviewItem[] = reviews.map((r: Record<string, unknown>) => {
      const provider = providerMap.get(r.provider_id as string);
      return {
        id: r.id as string,
        booking_id: r.booking_id as string,
        provider_id: r.provider_id as string,
        service_id: r.service_id as string,
        rating: r.rating as ReviewRatingEnum,
        title: (r.title as string | null) ?? null,
        review_text: (r.review_text as string | null) ?? null,
        review_photos: (r.review_photos as string[] | null) ?? null,
        provider_response: (r.provider_response as string | null) ?? null,
        provider_responded_at: (r.provider_responded_at as string | null) ?? null,
        created_at: r.created_at as string,
        provider_name: provider?.business_name ?? "Unknown Provider",
        provider_photo_url: provider?.profile_photo_url ?? null,
        service_name: serviceMap.get(r.service_id as string) ?? null,
      };
    });

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: enriched,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (err) {
    console.error("[Reviews] getCustomerReviews unexpected:", err);
    return emptyResult;
  }
}

/** Shape for a customer's own review with provider/service context. */
export interface CustomerReviewItem {
  id: string;
  booking_id: string;
  provider_id: string;
  service_id: string;
  rating: ReviewRatingEnum;
  title: string | null;
  review_text: string | null;
  review_photos: string[] | null;
  provider_response: string | null;
  provider_responded_at: string | null;
  created_at: string;
  provider_name: string;
  provider_photo_url: string | null;
  service_name: string | null;
}

// =============================================================================
// GET PROVIDER REVIEWS (ENRICHED WITH VOTES)
// =============================================================================

/**
 * Paginated provider reviews with vote counts and current user's vote.
 * Used by the provider reviews dashboard and public provider page.
 */
export async function getProviderReviewsWithVotes(
  params: ReviewQueryParams
): Promise<PaginatedResponse<ReviewWithReviewer>> {
  const {
    providerId,
    page = 1,
    pageSize = 10,
    ratingFilter = null,
    sortBy = "newest",
  } = params;

  const emptyResult: PaginatedResponse<ReviewWithReviewer> = {
    data: [],
    pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
  };

  try {
    const supabase = await createClient();
    const offset = (page - 1) * pageSize;

    // Get current user for vote lookup (nullable — public page)
    let currentUserId: string | null = null;
    try {
      const { user } = await getCachedUser();
      currentUserId = user?.id ?? null;
    } catch {
      // Not authenticated — ok for public page
    }

    // Build the query
    let query = supabase
      .from("reviews")
      .select("*", { count: "exact" })
      .eq("provider_id", providerId)
      .eq("is_hidden", false);

    // Apply rating filter
    if (ratingFilter != null && ratingFilter >= 1 && ratingFilter <= 5) {
      query = query.eq("rating", String(ratingFilter) as Database["public"]["Enums"]["review_rating"]);
    }

    // Apply sort
    switch (sortBy) {
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "highest":
        query = query.order("rating", { ascending: false }).order("created_at", { ascending: false });
        break;
      case "lowest":
        query = query.order("rating", { ascending: true }).order("created_at", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data: reviews, error, count } = await query;

    if (error) {
      console.error("[Reviews] getProviderReviewsWithVotes error:", error);
      return emptyResult;
    }

    if (!reviews || reviews.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / pageSize),
          hasMore: false,
        },
      };
    }

    // Batch-fetch reviewer profiles + vote counts
    const reviewIds = reviews.map((r: { id: string }) => r.id);
    const reviewerIds = [...new Set(reviews.map((r: { reviewer_id: string }) => r.reviewer_id))];

    const [profilesResult, votesResult, userVotesResult] = await Promise.all([
      // Reviewer profiles
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", reviewerIds),

      // Aggregate vote counts per review
      supabase
        .from("review_helpful_votes")
        .select("review_id, is_helpful")
        .in("review_id", reviewIds),

      // Current user's votes (if authenticated)
      currentUserId
        ? supabase
            .from("review_helpful_votes")
            .select("review_id, is_helpful")
            .eq("user_id", currentUserId)
            .in("review_id", reviewIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Build lookup maps
    const profileMap = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }>();
    for (const p of profilesResult.data ?? []) {
      profileMap.set(p.id, p);
    }

    const voteCountMap = new Map<string, { helpful: number; unhelpful: number }>();
    for (const v of votesResult.data ?? []) {
      const existing = voteCountMap.get(v.review_id) ?? { helpful: 0, unhelpful: 0 };
      if (v.is_helpful) {
        existing.helpful++;
      } else {
        existing.unhelpful++;
      }
      voteCountMap.set(v.review_id, existing);
    }

    const userVoteMap = new Map<string, boolean>();
    for (const v of (userVotesResult as { data: Array<{ review_id: string; is_helpful: boolean }> | null }).data ?? []) {
      userVoteMap.set(v.review_id, v.is_helpful);
    }

    // Assemble enriched reviews
    const enrichedReviews: ReviewWithReviewer[] = reviews.map(
      (review: Record<string, unknown>) => {
        const votes = voteCountMap.get(review.id as string) ?? { helpful: 0, unhelpful: 0 };
        return {
          ...review,
          reviewer: profileMap.get(review.reviewer_id as string) ?? null,
          helpful_count: votes.helpful,
          unhelpful_count: votes.unhelpful,
          current_user_vote: userVoteMap.has(review.id as string)
            ? userVoteMap.get(review.id as string)
            : null,
        } as ReviewWithReviewer;
      }
    );

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: enrichedReviews,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (err) {
    console.error("[Reviews] getProviderReviewsWithVotes unexpected:", err);
    return emptyResult;
  }
}

// =============================================================================
// GET PROVIDER REVIEW SUMMARY
// =============================================================================

/**
 * Rating distribution and aggregate stats for a provider.
 * Used by the provider reviews dashboard header.
 */
export async function getProviderReviewSummary(
  providerId: string
): Promise<ReviewSummary> {
  const defaultSummary: ReviewSummary = {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    averageDimensions: {
      quality: null,
      communication: null,
      timeliness: null,
      professionalism: null,
      value: null,
    },
  };

  try {
    const supabase = await createClient();

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(
        "rating, quality_rating, communication_rating, timeliness_rating, professionalism_rating, value_rating"
      )
      .eq("provider_id", providerId)
      .eq("is_hidden", false);

    if (error || !reviews || reviews.length === 0) {
      return defaultSummary;
    }

    const total = reviews.length;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
    let ratingSum = 0;

    // Dimension accumulators
    const dims = {
      quality: { sum: 0, count: 0 },
      communication: { sum: 0, count: 0 },
      timeliness: { sum: 0, count: 0 },
      professionalism: { sum: 0, count: 0 },
      value: { sum: 0, count: 0 },
    };

    for (const r of reviews) {
      const ratingNum = parseInt(r.rating, 10);
      ratingSum += ratingNum;
      distribution[ratingNum] = (distribution[ratingNum] || 0) + 1;

      // Accumulate dimensions
      const dimPairs: [keyof typeof dims, string | null][] = [
        ["quality", r.quality_rating],
        ["communication", r.communication_rating],
        ["timeliness", r.timeliness_rating],
        ["professionalism", r.professionalism_rating],
        ["value", r.value_rating],
      ];

      for (const [key, val] of dimPairs) {
        if (val != null) {
          dims[key].sum += parseInt(val, 10);
          dims[key].count++;
        }
      }
    }

    const avgDim = (d: { sum: number; count: number }): number | null =>
      d.count > 0 ? parseFloat((d.sum / d.count).toFixed(2)) : null;

    return {
      averageRating: parseFloat((ratingSum / total).toFixed(2)),
      totalReviews: total,
      ratingDistribution: distribution as ReviewSummary["ratingDistribution"],
      averageDimensions: {
        quality: avgDim(dims.quality),
        communication: avgDim(dims.communication),
        timeliness: avgDim(dims.timeliness),
        professionalism: avgDim(dims.professionalism),
        value: avgDim(dims.value),
      },
    };
  } catch (err) {
    console.error("[Reviews] getProviderReviewSummary error:", err);
    return defaultSummary;
  }
}

// =============================================================================
// UPLOAD REVIEW PHOTO
// =============================================================================

/**
 * Upload a review photo to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export async function uploadReviewPhoto(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated." };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided." };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Only JPEG, PNG, and WebP images are allowed." };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image must be under 5MB." };
    }

    const admin = createAdminClient();
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `review-photos/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { data, error: uploadError } = await admin.storage
      .from("provider-documents")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Reviews] Photo upload error:", uploadError);
      return { success: false, error: "Failed to upload photo." };
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("provider-documents").getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (err) {
    console.error("[Reviews] uploadReviewPhoto error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}
