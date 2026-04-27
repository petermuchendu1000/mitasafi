"use server";

// =============================================================================
// MITASAFI: ADMIN REVIEW MODERATION ACTIONS (M-G.6)
// =============================================================================
// Server actions for admin moderation of reviews:
//   - getFlaggedReviews: Paginated list of flagged/reported reviews
//   - hideReview: Admin hides an inappropriate review
//   - unhideReview: Admin reverses a hide decision
//   - dismissFlag: Admin clears a flag (review is OK)
//
// Authorization pattern:
//   Every action verifies the caller has an 'admin' role in user_roles.
//   Uses createAdminClient() for mutations (bypasses RLS).
//
// These actions support a future Admin Panel (M-L) but are fully functional
// and can be invoked from any admin-gated UI or API route.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUser } from "@/lib/cache/queries";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================

export interface AdminModerationResult {
  success: boolean;
  error?: string;
}

export interface FlaggedReview {
  id: string;
  booking_id: string;
  reviewer_id: string;
  provider_id: string;
  service_id: string;
  rating: string;
  title: string | null;
  review_text: string | null;
  review_photos: string[] | null;
  provider_response: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  reviewer_name: string | null;
  reviewer_email: string | null;
  provider_name: string | null;
  service_name: string | null;
}

export interface FlaggedReviewsResult {
  data: FlaggedReview[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/** Verify the current user has admin role. Returns user ID or error. */
async function requireAdmin(): Promise<
  { userId: string; error: null } | { userId: null; error: string }
> {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    return { userId: null, error: "Authentication required." };
  }

  const admin = createAdminClient();
  const { data: roles, error: rolesError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (rolesError) {
    console.error("[Admin] Role check error:", rolesError);
    return { userId: null, error: "Failed to verify permissions." };
  }

  const hasAdminRole = roles?.some(
    (r: { role: string }) => r.role === "admin"
  );

  if (!hasAdminRole) {
    return { userId: null, error: "Admin access required." };
  }

  return { userId: user.id, error: null };
}

// =============================================================================
// GET FLAGGED REVIEWS
// =============================================================================

/**
 * Fetch flagged reviews for admin moderation queue.
 * Returns reviews that are flagged but not yet hidden, plus hidden ones.
 * Sorted by flag date (newest first) so admins see fresh reports first.
 */
export async function getFlaggedReviews(
  page = 1,
  pageSize = 20,
  filter: "flagged" | "hidden" | "all" = "all"
): Promise<FlaggedReviewsResult> {
  const emptyResult: FlaggedReviewsResult = {
    data: [],
    pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
  };

  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      console.error("[Admin] getFlaggedReviews auth:", authError);
      return emptyResult;
    }

    const admin = createAdminClient();
    const offset = (page - 1) * pageSize;

    // Build query based on filter
    let query = admin
      .from("reviews")
      .select("*", { count: "exact" });

    switch (filter) {
      case "flagged":
        query = query.eq("is_flagged", true).eq("is_hidden", false);
        break;
      case "hidden":
        query = query.eq("is_hidden", true);
        break;
      case "all":
      default:
        // Show flagged OR hidden
        query = query.or("is_flagged.eq.true,is_hidden.eq.true");
        break;
    }

    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: reviews, error, count } = await query;

    if (error || !reviews) {
      console.error("[Admin] getFlaggedReviews query error:", error);
      return emptyResult;
    }

    if (reviews.length === 0) {
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

    // Batch-fetch reviewer profiles, provider names, service names
    const reviewerIds = [
      ...new Set(reviews.map((r: { reviewer_id: string }) => r.reviewer_id)),
    ];
    const providerIds = [
      ...new Set(reviews.map((r: { provider_id: string }) => r.provider_id)),
    ];
    const serviceIds = [
      ...new Set(
        reviews
          .map((r: { service_id: string }) => r.service_id)
          .filter(Boolean)
      ),
    ];

    const [profilesResult, providersResult, servicesResult] = await Promise.all(
      [
        admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", reviewerIds),
        admin
          .from("service_providers")
          .select("id, business_name")
          .in("id", providerIds),
        serviceIds.length > 0
          ? admin.from("services").select("id, name").in("id", serviceIds)
          : Promise.resolve({ data: [] }),
      ]
    );

    // Build lookup maps
    const profileMap = new Map<
      string,
      { full_name: string | null; email: string | null }
    >();
    for (const p of profilesResult.data ?? []) {
      profileMap.set(p.id, {
        full_name: p.full_name,
        email: p.email,
      });
    }

    const providerMap = new Map<string, string>();
    for (const p of providersResult.data ?? []) {
      providerMap.set(p.id, p.business_name);
    }

    const serviceMap = new Map<string, string>();
    for (const s of (
      servicesResult as {
        data: Array<{ id: string; name: string }> | null;
      }
    ).data ?? []) {
      serviceMap.set(s.id, s.name);
    }

    // Assemble enriched reviews
    const enriched: FlaggedReview[] = reviews.map(
      (r: Record<string, unknown>) => {
        const profile = profileMap.get(r.reviewer_id as string);
        return {
          id: r.id as string,
          booking_id: r.booking_id as string,
          reviewer_id: r.reviewer_id as string,
          provider_id: r.provider_id as string,
          service_id: r.service_id as string,
          rating: r.rating as string,
          title: (r.title as string | null) ?? null,
          review_text: (r.review_text as string | null) ?? null,
          review_photos: (r.review_photos as string[] | null) ?? null,
          provider_response:
            (r.provider_response as string | null) ?? null,
          is_flagged: r.is_flagged as boolean,
          flag_reason: (r.flag_reason as string | null) ?? null,
          is_hidden: r.is_hidden as boolean,
          created_at: r.created_at as string,
          updated_at: r.updated_at as string,
          reviewer_name: profile?.full_name ?? null,
          reviewer_email: profile?.email ?? null,
          provider_name: providerMap.get(r.provider_id as string) ?? null,
          service_name: serviceMap.get(r.service_id as string) ?? null,
        };
      }
    );

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
    console.error("[Admin] getFlaggedReviews unexpected:", err);
    return emptyResult;
  }
}

// =============================================================================
// HIDE REVIEW
// =============================================================================

/**
 * Admin hides an inappropriate review.
 * - Sets `is_hidden = true` on the review.
 * - Recalculates the provider's average rating (hidden reviews excluded).
 * - Clears the flag (moderation resolved).
 */
export async function hideReview(
  reviewId: string,
  reason?: string
): Promise<AdminModerationResult> {
  try {
    const { userId, error: authError } = await requireAdmin();
    if (authError || !userId) {
      return { success: false, error: authError || "Unauthorized." };
    }

    const admin = createAdminClient();

    // Fetch the review to get provider_id for rating recalc
    const { data: review, error: fetchError } = await admin
      .from("reviews")
      .select("id, provider_id, is_hidden")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return { success: false, error: "Review not found." };
    }

    if (review.is_hidden) {
      return { success: false, error: "Review is already hidden." };
    }

    // Hide the review and clear flag
    const { error: updateError } = await admin
      .from("reviews")
      .update({
        is_hidden: true,
        is_flagged: false,
        flag_reason: reason
          ? `[Admin hidden] ${reason}`
          : review.is_hidden
            ? null
            : "[Admin hidden]",
      })
      .eq("id", reviewId);

    if (updateError) {
      console.error("[Admin] hideReview update error:", updateError);
      return { success: false, error: "Failed to hide review." };
    }

    // Recalculate provider rating (hidden reviews are excluded)
    await recalculateProviderRatingAdmin(review.provider_id);

    // Revalidate relevant pages
    revalidatePath("/dashboard/provider/reviews");
    revalidatePath(`/services/provider/${review.provider_id}`);

    return { success: true };
  } catch (err) {
    console.error("[Admin] hideReview error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error.",
    };
  }
}

// =============================================================================
// UNHIDE REVIEW
// =============================================================================

/**
 * Admin reverses a hide decision, making the review public again.
 * Recalculates provider rating to include this review.
 */
export async function unhideReview(
  reviewId: string
): Promise<AdminModerationResult> {
  try {
    const { userId, error: authError } = await requireAdmin();
    if (authError || !userId) {
      return { success: false, error: authError || "Unauthorized." };
    }

    const admin = createAdminClient();

    const { data: review, error: fetchError } = await admin
      .from("reviews")
      .select("id, provider_id, is_hidden")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return { success: false, error: "Review not found." };
    }

    if (!review.is_hidden) {
      return { success: false, error: "Review is not hidden." };
    }

    const { error: updateError } = await admin
      .from("reviews")
      .update({
        is_hidden: false,
        flag_reason: null,
      })
      .eq("id", reviewId);

    if (updateError) {
      console.error("[Admin] unhideReview update error:", updateError);
      return { success: false, error: "Failed to unhide review." };
    }

    // Recalculate provider rating (now includes this review again)
    await recalculateProviderRatingAdmin(review.provider_id);

    revalidatePath("/dashboard/provider/reviews");
    revalidatePath(`/services/provider/${review.provider_id}`);

    return { success: true };
  } catch (err) {
    console.error("[Admin] unhideReview error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error.",
    };
  }
}

// =============================================================================
// DISMISS FLAG
// =============================================================================

/**
 * Admin reviews a flagged review and determines it does NOT violate policy.
 * Clears the flag without hiding. The review remains public.
 */
export async function dismissFlag(
  reviewId: string
): Promise<AdminModerationResult> {
  try {
    const { userId, error: authError } = await requireAdmin();
    if (authError || !userId) {
      return { success: false, error: authError || "Unauthorized." };
    }

    const admin = createAdminClient();

    const { data: review, error: fetchError } = await admin
      .from("reviews")
      .select("id, is_flagged")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return { success: false, error: "Review not found." };
    }

    if (!review.is_flagged) {
      return { success: false, error: "Review is not flagged." };
    }

    const { error: updateError } = await admin
      .from("reviews")
      .update({
        is_flagged: false,
        flag_reason: null,
      })
      .eq("id", reviewId);

    if (updateError) {
      console.error("[Admin] dismissFlag update error:", updateError);
      return { success: false, error: "Failed to dismiss flag." };
    }

    return { success: true };
  } catch (err) {
    console.error("[Admin] dismissFlag error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error.",
    };
  }
}

// =============================================================================
// PRIVATE: RECALCULATE PROVIDER RATING (admin context)
// =============================================================================

/**
 * Recalculates provider average_rating and total_reviews.
 * Mirrors the logic in reviews.ts but runs with admin privileges.
 * Only counts non-hidden reviews.
 */
async function recalculateProviderRatingAdmin(
  providerId: string
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: reviews, error } = await admin
      .from("reviews")
      .select("rating")
      .eq("provider_id", providerId)
      .eq("is_hidden", false);

    if (error) {
      console.error(
        "[Admin] Rating recalculation query error:",
        error
      );
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
      console.error(
        "[Admin] Provider rating update error:",
        updateError
      );
    }
  } catch (err) {
    console.error("[Admin] recalculateProviderRatingAdmin error:", err);
  }
}
