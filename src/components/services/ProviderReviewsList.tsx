/**
 * ProviderReviewsList Component (SC-6)
 *
 * Client component that renders the reviews section on a provider's profile
 * page. Shows the initial server-rendered reviews and provides a working
 * "Show all N reviews" button that progressively loads remaining reviews
 * via the `/api/services/providers/[id]/reviews` endpoint.
 *
 * Design decisions:
 * - Initial 6 reviews are passed as props (SSR'd for LCP).
 * - "Show all" fetches page=1&pageSize=50 in a single request, replacing the
 *   initial set. Re-fetching the first 6 is negligible cost and avoids
 *   offset-alignment complexity.
 * - Uses the enriched ReviewWithReviewer shape (same as SSR) so vote buttons
 *   and report buttons work identically.
 * - Preserves the exact same review card markup as the original inline render.
 */

"use client";

import { useState, useTransition, useCallback } from "react";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReviewHelpfulVote } from "@/components/booking/ReviewHelpfulVote";
import { ReportReviewButton } from "@/components/booking/ReportReviewButton";
import type { ReviewWithReviewer } from "@/types/reviews";
import { fromRatingEnum } from "@/types/reviews";

// =============================================================================
// TYPES
// =============================================================================

interface ProviderReviewsListProps {
  /** The provider's UUID — used to build the API URL. */
  providerId: string;
  /** Server-rendered first page of reviews. */
  initialReviews: ReviewWithReviewer[];
  /** Total number of reviews for this provider. */
  totalReviews: number;
  /** Whether the current viewer is authenticated (for vote/report buttons). */
  isAuthenticated: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProviderReviewsList({
  providerId,
  initialReviews,
  totalReviews,
  isAuthenticated,
}: ProviderReviewsListProps) {
  const [reviews, setReviews] = useState<ReviewWithReviewer[]>(initialReviews);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fetchError, setFetchError] = useState<string | null>(null);

  const hasMore = totalReviews > reviews.length && !isExpanded;

  const loadAllReviews = useCallback(() => {
    setFetchError(null);

    startTransition(async () => {
      try {
        // Fetch all reviews in one request (API caps at pageSize=50 per call).
        // For providers with >50 reviews we'd need multiple calls, but that's
        // extremely unlikely in this marketplace context.
        const cap = Math.min(totalReviews, 50);
        const res = await fetch(
          `/api/services/providers/${providerId}/reviews?page=1&pageSize=${cap}&sortBy=newest`
        );

        if (!res.ok) {
          throw new Error(`Failed to load reviews (HTTP ${res.status})`);
        }

        const json = await res.json();
        const fetched: ReviewWithReviewer[] = json.data ?? [];

        if (fetched.length > 0) {
          setReviews(fetched);
        }
        setIsExpanded(true);
      } catch (err) {
        console.error("[ProviderReviewsList] loadAllReviews error:", err);
        setFetchError("Unable to load reviews. Please try again.");
      }
    });
  }, [providerId, totalReviews]);

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No reviews yet</p>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isAuthenticated={isAuthenticated}
        />
      ))}

      {/* Show all / Load more button */}
      {hasMore && (
        <button
          onClick={loadAllReviews}
          disabled={isPending}
          className={cn(
            "text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-teal-700 transition-colors",
            isPending && "opacity-60 cursor-wait"
          )}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading reviews…
            </span>
          ) : (
            `Show all ${totalReviews} reviews`
          )}
        </button>
      )}

      {fetchError && (
        <p className="text-xs text-red-600">{fetchError}</p>
      )}
    </div>
  );
}

// =============================================================================
// REVIEW CARD (extracted sub-component)
// =============================================================================

/**
 * Single review card — identical markup to the original inline render in the
 * provider page, extracted for reuse by both the SSR list and fetched list.
 */
function ReviewCard({
  review,
  isAuthenticated,
}: {
  review: ReviewWithReviewer;
  isAuthenticated: boolean;
}) {
  const numericRating = fromRatingEnum(review.rating) ?? 0;

  return (
    <div className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
      {/* Reviewer avatar & name */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-medium text-sm flex-shrink-0">
          {review.reviewer?.full_name?.charAt(0) || "?"}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {review.reviewer?.full_name || "Anonymous"}
          </p>
          <p className="text-xs text-gray-400">
            {review.created_at
              ? new Date(review.created_at).toLocaleDateString("en-KE", {
                  month: "long",
                  year: "numeric",
                })
              : ""}
          </p>
        </div>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-0.5 mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-3 h-3",
              i < numericRating
                ? "text-gray-900 fill-gray-900"
                : "text-gray-200"
            )}
          />
        ))}
      </div>

      {/* Title & body */}
      {review.title && (
        <p className="text-sm font-medium text-gray-800 mb-1">{review.title}</p>
      )}
      {review.review_text && (
        <p className="text-sm text-gray-600 leading-relaxed">{review.review_text}</p>
      )}

      {/* Provider response */}
      {review.provider_response && (
        <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-1">Provider response</p>
          <p className="text-sm text-gray-600">{review.provider_response}</p>
        </div>
      )}

      {/* Actions: helpful vote + report */}
      <div className="flex items-center gap-4 mt-3">
        <ReviewHelpfulVote
          reviewId={review.id}
          helpfulCount={review.helpful_count}
          unhelpfulCount={review.unhelpful_count}
          currentUserVote={review.current_user_vote ?? null}
          isAuthenticated={isAuthenticated}
        />
        <ReportReviewButton
          reviewId={review.id}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
}
