/**
 * Review Creation Page (M7)
 *
 * URL: /dashboard/bookings/[id]/review
 *
 * Server component that:
 *   1. Authenticates the user
 *   2. Fetches the booking + verifies ownership
 *   3. Checks booking is in reviewable state
 *   4. Checks no existing review for this booking
 *   5. Renders the ReviewForm client component
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookingById } from "@/lib/services/bookings";
import { getReviewForBooking } from "@/lib/services/reviews";
import { ReviewForm } from "@/components/booking/ReviewForm";
import type { BookingStatus } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: "Leave a Review | MitaSafi",
    description: "Rate and review your service provider.",
  };
}

// =============================================================================
// REVIEWABLE STATUSES
// =============================================================================

const REVIEWABLE_STATUSES = new Set<BookingStatus>([
  "customer_confirmed",
  "payment_pending",
  "resolved",
]);

// =============================================================================
// PAGE
// =============================================================================

export default async function ReviewPage({ params }: PageProps) {
  const { id: bookingId } = await params;

  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(`/dashboard/bookings/${bookingId}/review`)}`
    );
  }

  // 2. Fetch booking
  const { booking, error } = await getBookingById(bookingId, user.id);

  if (error || !booking) {
    notFound();
  }

  // 3. Must be the customer (not the provider viewing)
  if (booking.customer_id !== user.id) {
    notFound();
  }

  // 4. Check status
  if (!REVIEWABLE_STATUSES.has(booking.status as BookingStatus)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header bookingId={bookingId} />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Star className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Not ready for review
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              You can leave a review after confirming the job is complete.
            </p>
            <Link
              href={`/dashboard/bookings/${bookingId}`}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
            >
              Back to booking
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 5. Check for existing review
  const { review: existingReview } = await getReviewForBooking(bookingId);

  if (existingReview) {
    const ratingNum = parseInt(existingReview.rating, 10);
    return (
      <div className="min-h-screen bg-gray-50">
        <Header bookingId={bookingId} />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Review already submitted
            </h2>
            <div className="flex items-center justify-center gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < ratingNum
                      ? "text-amber-400 fill-amber-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
            </div>
            {existingReview.review_text && (
              <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                &ldquo;{existingReview.review_text}&rdquo;
              </p>
            )}
            <p className="text-sm text-gray-500 mb-6">
              You&apos;ve already reviewed this booking. Each booking can only be
              reviewed once.
            </p>
            <Link
              href={`/dashboard/bookings/${bookingId}`}
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
            >
              Back to booking
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 6. Render review form
  const providerName = booking.provider?.business_name ?? "your provider";
  const serviceName = booking.service?.name ?? "this service";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header bookingId={bookingId} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <ReviewForm
          bookingId={bookingId}
          providerName={providerName}
          serviceName={serviceName}
        />
      </main>
    </div>
  );
}

// =============================================================================
// HEADER
// =============================================================================

function Header({ bookingId }: { bookingId: string }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link
          href={`/dashboard/bookings/${bookingId}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to booking</span>
        </Link>
        <span className="text-gray-200">|</span>
        <h1 className="text-sm font-semibold text-gray-900">Leave a review</h1>
      </div>
    </header>
  );
}
