/**
 * ProviderReviewsClient Component (M7)
 *
 * Client component for the provider reviews dashboard.
 * Handles rating filter, sort, pagination, and response forms.
 */

"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ChevronDown,
  Loader2,
  Send,
  Flag,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";
import { submitProviderResponse } from "./actions";
import { getProviderReviewsWithVotes } from "@/lib/services/reviews";
import { fromRatingEnum, getRatingLabel } from "@/types/reviews";
import type { ReviewWithReviewer, ReviewSummary } from "@/types/reviews";
import type { PaginatedResponse } from "@/types/service-providers";

// =============================================================================
// TYPES
// =============================================================================

interface ProviderReviewsClientProps {
  providerId: string;
  initialReviews: PaginatedResponse<ReviewWithReviewer>;
  summary: ReviewSummary;
}

type SortOption = "newest" | "oldest" | "highest" | "lowest";

// =============================================================================
// COMPONENT
// =============================================================================

export function ProviderReviewsClient({
  providerId,
  initialReviews,
  summary,
}: ProviderReviewsClientProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [isPending, startTransition] = useTransition();

  // State
  const [reviews, setReviews] = useState(initialReviews);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // ── Fetch reviews with filters ──

  const fetchReviews = useCallback(
    (newPage: number, newRatingFilter: number | null, newSortBy: SortOption) => {
      startTransition(async () => {
        const result = await getProviderReviewsWithVotes({
          providerId,
          page: newPage,
          pageSize: 10,
          ratingFilter: newRatingFilter,
          sortBy: newSortBy,
        });
        setReviews(result);
        setPage(newPage);
        setRatingFilter(newRatingFilter);
        setSortBy(newSortBy);
      });
    },
    [providerId, startTransition]
  );

  const handleRatingFilter = (rating: number | null) => {
    fetchReviews(1, rating, sortBy);
  };

  const handleSortChange = (newSort: SortOption) => {
    fetchReviews(1, ratingFilter, newSort);
  };

  const handlePageChange = (newPage: number) => {
    fetchReviews(newPage, ratingFilter, sortBy);
  };

  // ── Provider response ──

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;

    setIsSubmittingResponse(true);
    const result = await submitProviderResponse(reviewId, responseText.trim());
    setIsSubmittingResponse(false);

    if (result.success) {
      showSuccess("Response posted", "Your response is now visible to customers.");
      setRespondingTo(null);
      setResponseText("");
      router.refresh();
      // Refresh the review list
      fetchReviews(page, ratingFilter, sortBy);
    } else {
      showError("Failed", result.error || "Could not save response.");
    }
  };

  // ── Derived values ──
  const { data: reviewList, pagination } = reviews;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          {summary.totalReviews === 0
            ? "No reviews yet — they'll appear here after customers rate your work."
            : `${summary.totalReviews} review${summary.totalReviews !== 1 ? "s" : ""} from your customers`}
        </p>
      </div>

      {/* Rating Summary Card */}
      {summary.totalReviews > 0 && (
        <RatingSummaryCard summary={summary} />
      )}

      {/* Filters bar */}
      {summary.totalReviews > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Rating filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Filter:</span>
            <FilterPill
              active={ratingFilter === null}
              onClick={() => handleRatingFilter(null)}
              disabled={isPending}
            >
              All
            </FilterPill>
            {[5, 4, 3, 2, 1].map((r) => (
              <FilterPill
                key={r}
                active={ratingFilter === r}
                onClick={() => handleRatingFilter(ratingFilter === r ? null : r)}
                disabled={isPending}
              >
                {r} <Star className="w-3 h-3 fill-current" />
              </FilterPill>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="sm:ml-auto relative">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              disabled={isPending}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Reviews list */}
      {isPending && reviewList.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : reviewList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          {ratingFilter ? (
            <>
              <Star className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                No {ratingFilter}-star reviews yet.
              </p>
            </>
          ) : (
            <>
              <Star className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                No reviews yet
              </p>
              <p className="text-sm text-gray-500">
                Reviews will appear here after customers rate your services.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className={cn("space-y-4", isPending && "opacity-60")}>
          {reviewList.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isRespondingTo={respondingTo === review.id}
              responseText={respondingTo === review.id ? responseText : ""}
              isSubmittingResponse={isSubmittingResponse}
              onStartResponse={() => {
                setRespondingTo(review.id);
                setResponseText("");
              }}
              onCancelResponse={() => {
                setRespondingTo(null);
                setResponseText("");
              }}
              onResponseTextChange={setResponseText}
              onSubmitResponse={() => handleSubmitResponse(review.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={!pagination.hasMore || isPending}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RATING SUMMARY CARD
// =============================================================================

function RatingSummaryCard({ summary }: { summary: ReviewSummary }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Overall rating */}
        <div className="flex flex-col items-center justify-center sm:min-w-[140px]">
          <span className="text-4xl font-bold text-gray-900">
            {summary.averageRating.toFixed(1)}
          </span>
          <div className="flex items-center gap-0.5 my-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-4 h-4",
                  i < Math.round(summary.averageRating)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-200"
                )}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500">
            {summary.totalReviews} review{summary.totalReviews !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Rating distribution */}
        <div className="flex-1 space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((rating) => {
            const count = summary.ratingDistribution[rating];
            const percentage =
              summary.totalReviews > 0
                ? (count / summary.totalReviews) * 100
                : 0;

            return (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-3 text-right">
                  {rating}
                </span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Dimension averages */}
        <div className="sm:min-w-[180px] space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Breakdown
          </p>
          {[
            { label: "Quality", value: summary.averageDimensions.quality },
            { label: "Communication", value: summary.averageDimensions.communication },
            { label: "Timeliness", value: summary.averageDimensions.timeliness },
            { label: "Professionalism", value: summary.averageDimensions.professionalism },
            { label: "Value", value: summary.averageDimensions.value },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{label}</span>
              <span className="text-xs font-medium text-gray-900">
                {value != null ? value.toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FILTER PILL
// =============================================================================

function FilterPill({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

// =============================================================================
// REVIEW CARD
// =============================================================================

function ReviewCard({
  review,
  isRespondingTo,
  responseText,
  isSubmittingResponse,
  onStartResponse,
  onCancelResponse,
  onResponseTextChange,
  onSubmitResponse,
}: {
  review: ReviewWithReviewer;
  isRespondingTo: boolean;
  responseText: string;
  isSubmittingResponse: boolean;
  onStartResponse: () => void;
  onCancelResponse: () => void;
  onResponseTextChange: (text: string) => void;
  onSubmitResponse: () => void;
}) {
  const ratingNum = fromRatingEnum(review.rating) ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Header: reviewer info + rating */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-medium text-sm flex-shrink-0 overflow-hidden">
            {review.reviewer?.avatar_url ? (
              <Image
                src={review.reviewer.avatar_url}
                alt=""
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              review.reviewer?.full_name?.charAt(0)?.toUpperCase() || "?"
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {review.reviewer?.full_name || "Anonymous"}
            </p>
            <p className="text-xs text-gray-400">
              {review.created_at
                ? new Date(review.created_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
              {review.is_verified_booking && (
                <span className="ml-1.5 text-teal-600">• Verified booking</span>
              )}
            </p>
          </div>
        </div>

        {/* Star rating */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "w-4 h-4",
                i < ratingNum
                  ? "text-amber-400 fill-amber-400"
                  : "text-gray-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* Review title */}
      {review.title && (
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          {review.title}
        </h3>
      )}

      {/* Review text */}
      {review.review_text && (
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          {review.review_text}
        </p>
      )}

      {/* Dimension ratings (compact) */}
      <DimensionRatings review={review} />

      {/* Review photos */}
      {review.review_photos && review.review_photos.length > 0 && (
        <div className="flex gap-2 mb-3 mt-3">
          {review.review_photos.map((url, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Review photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Helpfulness */}
      {(review.helpful_count > 0 || review.unhelpful_count > 0) && (
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            {review.helpful_count} found this helpful
          </span>
        </div>
      )}

      {/* Provider response (existing) */}
      {review.provider_response && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 mt-3 border-l-2 border-teal-500">
          <p className="text-xs font-semibold text-teal-700 mb-1">
            Your response
          </p>
          <p className="text-sm text-gray-600">{review.provider_response}</p>
          {review.provider_responded_at && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(review.provider_responded_at).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      )}

      {/* Response form (if responding) */}
      {isRespondingTo && !review.provider_response && (
        <div className="mt-3 space-y-3">
          <textarea
            value={responseText}
            onChange={(e) => onResponseTextChange(e.target.value)}
            placeholder="Write a professional response to this review..."
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {responseText.length}/1,000
            </p>
            <div className="flex gap-2">
              <button
                onClick={onCancelResponse}
                disabled={isSubmittingResponse}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmitResponse}
                disabled={isSubmittingResponse || !responseText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingResponse ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Post response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Respond button (if no response yet and not currently responding) */}
      {!review.provider_response && !isRespondingTo && (
        <button
          onClick={onStartResponse}
          className="flex items-center gap-1.5 mt-3 text-sm text-teal-700 hover:text-teal-800 font-medium transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Respond
        </button>
      )}
    </div>
  );
}

// =============================================================================
// DIMENSION RATINGS (compact row)
// =============================================================================

function DimensionRatings({ review }: { review: ReviewWithReviewer }) {
  const dims = [
    { label: "Quality", value: fromRatingEnum(review.quality_rating) },
    { label: "Communication", value: fromRatingEnum(review.communication_rating) },
    { label: "Timeliness", value: fromRatingEnum(review.timeliness_rating) },
    { label: "Professionalism", value: fromRatingEnum(review.professionalism_rating) },
    { label: "Value", value: fromRatingEnum(review.value_rating) },
  ].filter((d) => d.value != null);

  if (dims.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
      {dims.map(({ label, value }) => (
        <span key={label} className="text-xs text-gray-500">
          {label}: <span className="font-medium text-gray-700">{value}/5</span>
        </span>
      ))}
    </div>
  );
}
