/**
 * CustomerReviewsList Component
 *
 * Client component displaying the customer's submitted reviews with
 * provider context, star ratings, response status, and navigation.
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import type { CustomerReviewItem } from "@/lib/services/reviews";

// =============================================================================
// TYPES
// =============================================================================

interface CustomerReviewsListProps {
  reviews: CustomerReviewItem[];
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

function renderStars(rating: string) {
  const numRating = parseInt(rating, 10);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < numRating
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-200 fill-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CustomerReviewsList({
  reviews,
  pagination,
}: CustomerReviewsListProps) {
  // ── Empty State ───────────────────────────────────────────────────────
  if (reviews.length === 0 && pagination.page === 1) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Star className="h-8 w-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No reviews yet
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          After completing a booking, you can leave a review to help others find great service providers.
        </p>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          View My Bookings
        </Link>
      </div>
    );
  }

  // ── Reviews List ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} review{pagination.total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/dashboard/reviews?page=${pagination.page - 1}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            )}
            {pagination.hasMore && (
              <Link
                href={`/dashboard/reviews?page=${pagination.page + 1}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// REVIEW CARD
// =============================================================================

function ReviewCard({ review }: { review: CustomerReviewItem }) {
  const [showFullText, setShowFullText] = useState(false);
  const textTruncated =
    review.review_text && review.review_text.length > 200 && !showFullText;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      {/* Header: Provider + Date */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Provider avatar */}
          <div className="h-10 w-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
            {review.provider_photo_url ? (
              <Image
                src={review.provider_photo_url}
                alt={review.provider_name}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-gray-400">
                {review.provider_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <Link
              href={`/services/provider/${review.provider_id}`}
              className="text-sm font-semibold text-gray-900 hover:text-teal-600 transition-colors truncate block"
            >
              {review.provider_name}
            </Link>
            {review.service_name && (
              <p className="text-xs text-gray-500 truncate">
                {review.service_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
          <Link
            href={`/dashboard/bookings/${review.booking_id}`}
            className="text-xs text-teal-600 hover:underline"
          >
            View booking
          </Link>
        </div>
      </div>

      {/* Rating + Title */}
      <div className="flex items-center gap-2 mb-2">
        {renderStars(review.rating)}
        {review.title && (
          <span className="text-sm font-medium text-gray-800 truncate">
            {review.title}
          </span>
        )}
      </div>

      {/* Review text */}
      {review.review_text && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            {textTruncated
              ? `${review.review_text.slice(0, 200)}...`
              : review.review_text}
          </p>
          {review.review_text.length > 200 && (
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="text-xs text-teal-600 hover:underline mt-1"
            >
              {showFullText ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Photos */}
      {review.review_photos && review.review_photos.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3">
          <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">
            {review.review_photos.length} photo{review.review_photos.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Provider response */}
      {review.provider_response && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle className="h-3.5 w-3.5 text-teal-600" />
            <span className="text-xs font-medium text-teal-700">
              Provider Response
            </span>
            {review.provider_responded_at && (
              <span className="text-xs text-gray-400 ml-auto">
                {formatDate(review.provider_responded_at)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {review.provider_response}
          </p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
        <Link
          href={`/dashboard/bookings/${review.booking_id}`}
          className="text-xs text-gray-500 hover:text-teal-600 transition-colors inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          View Booking
        </Link>
        <Link
          href={`/services/provider/${review.provider_id}`}
          className="text-xs text-gray-500 hover:text-teal-600 transition-colors inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          View Provider
        </Link>
      </div>
    </div>
  );
}
