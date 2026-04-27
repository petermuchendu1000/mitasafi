/**
 * Customer Booking Detail Page
 *
 * Full detail view for a single booking: provider info, service, status timeline,
 * location, scheduled time, notes, and action links.
 *
 * URL: /dashboard/bookings/[id]
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookingById } from "@/lib/services/bookings";
import { getReviewForBooking } from "@/lib/services/reviews";
import {
  getBookingStatusConfig,
  getBookingStatusLabel,
} from "@/lib/constants/booking";
import type { BookingStatus, BookingStatusHistory } from "@/types/bookings";
import { BookingChat } from "@/components/booking/BookingChat";
import { StatusTimeline } from "@/components/booking/StatusTimeline";
import { JobPhotos } from "@/components/booking/JobPhotos";
import { DisputeStatusView } from "@/components/booking/DisputeStatus";
import { CustomerBookingActions } from "./CustomerBookingActions";
import { getDisputeForBooking } from "./dispute/actions";

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
  const { id } = await params;
  return {
    title: `Booking ${id.slice(0, 8)} | MitaSafi`,
    description: "View your booking details.",
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================================================
// PAGE
// =============================================================================

export default async function BookingDetailPage({ params }: PageProps) {
  const { id: bookingId } = await params;

  // Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(`/dashboard/bookings/${bookingId}`)}`
    );
  }

  // Fetch booking with details
  const { booking, error } = await getBookingById(bookingId, user.id);

  if (error || !booking) {
    notFound();
  }

  const statusConfig = getBookingStatusConfig(booking.status as BookingStatus);
  const meta = booking.metadata as Record<string, unknown> | null;
  const locationSummary = (meta?.location_summary as string) || null;
  const provider = booking.provider;
  const service = booking.service;
  const history = booking.status_history ?? [];
  const media = booking.media ?? [];

  // Check if customer has already reviewed (M7: for review prompt)
  let hasReview = false;
  if (booking.customer_id === user.id) {
    const { review } = await getReviewForBooking(bookingId);
    hasReview = review !== null;
  }

  // Fetch dispute if booking is disputed/resolved (SC-5)
  const dispute =
    booking.status === "disputed" || booking.status === "resolved"
      ? (await getDisputeForBooking(bookingId)).dispute
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/dashboard/bookings"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Bookings</span>
          </Link>
          <span className="text-gray-200">|</span>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Link
              href="/dashboard/bookings"
              className="hover:text-gray-600 transition-colors"
            >
              My Bookings
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-600">{service?.name ?? "Booking"}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Status Banner ── */}
        <div
          className={`rounded-xl px-5 py-4 ${statusConfig.bgColor}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <p className={`text-sm mt-0.5 ${statusConfig.color} opacity-80`}>
            {statusConfig.description}
          </p>
        </div>

        {/* ── Customer Lifecycle Actions (M5: confirm completion, cancel; M7: review) ── */}
        <CustomerBookingActions
          bookingId={booking.id}
          bookingStatus={booking.status}
          hasReview={hasReview}
        />

        {/* ── Dispute Status (SC-5: shown when booking is disputed/resolved) ── */}
        {dispute && (
          <DisputeStatusView dispute={dispute} />
        )}

        {/* ── Quote CTA (when a quote is available) ── */}
        {["quote_sent", "quote_accepted", "quote_rejected"].includes(
          booking.status
        ) && (
          <Link
            href={`/dashboard/bookings/${bookingId}/quote`}
            className="flex items-center gap-3 bg-white rounded-xl border border-indigo-200 px-5 py-4 hover:bg-indigo-50 transition-colors group"
          >
            <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {booking.status === "quote_sent"
                  ? "You received a quote — review and respond"
                  : booking.status === "quote_accepted"
                    ? "Quote accepted — awaiting provider confirmation"
                    : "Quote declined — provider may revise"}
              </p>
              {booking.quoted_price && (
                <p className="text-sm text-indigo-600 font-semibold mt-0.5">
                  KES {booking.quoted_price.toLocaleString()}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
          </Link>
        )}

        {/* ── Service & Provider Card ── */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Service */}
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Service
            </p>
            <p className="text-base font-semibold text-gray-900">
              {service?.name ?? "Service"}
            </p>
            {service?.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                {service.description}
              </p>
            )}
          </div>

          {/* Provider */}
          {provider && (
            <div className="px-5 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                Provider
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {provider.profile_photo_url ? (
                    <Image
                      src={provider.profile_photo_url}
                      alt={provider.business_name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/services/provider/${provider.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-teal-700 transition-colors"
                  >
                    {provider.business_name}
                  </Link>
                  {provider.average_rating != null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 text-gray-900 fill-gray-900" />
                      <span className="text-sm font-medium text-gray-900">
                        {provider.average_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                {provider.phone && (
                  <a
                    href={`tel:${provider.phone}`}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">Call</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Details Grid ── */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Location */}
          {locationSummary && (
            <div className="px-5 py-4 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Location
                </p>
                <p className="text-sm text-gray-900">{locationSummary}</p>
              </div>
            </div>
          )}

          {/* Schedule */}
          {booking.scheduled_start && (
            <div className="px-5 py-4 flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Scheduled
                </p>
                <p className="text-sm text-gray-900">
                  {formatDateTime(booking.scheduled_start)}
                  {booking.scheduled_end &&
                    ` — ${formatDateTime(booking.scheduled_end)}`}
                </p>
              </div>
            </div>
          )}

          {/* Customer notes */}
          {booking.customer_notes && (
            <div className="px-5 py-4 flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Your notes
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {booking.customer_notes}
                </p>
              </div>
            </div>
          )}

          {/* Pricing */}
          {(booking.quoted_price || booking.agreed_price) && (
            <div className="px-5 py-4 flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Price
                </p>
                {booking.agreed_price ? (
                  <p className="text-sm font-semibold text-gray-900">
                    KES {booking.agreed_price.toLocaleString()}
                  </p>
                ) : booking.quoted_price ? (
                  <p className="text-sm text-gray-900">
                    Quote: KES {booking.quoted_price.toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Submitted at */}
          <div className="px-5 py-4 flex items-start gap-3">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                Requested
              </p>
              <p className="text-sm text-gray-900">
                {formatDateTime(booking.requested_at ?? booking.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Messages ── */}
        <BookingChat
          bookingId={booking.id}
          currentUserId={user.id}
          bookingStatus={booking.status as BookingStatus}
        />

        {/* ── Job Photos (M5) — read-only for customer ── */}
        {media.length > 0 && (
          <JobPhotos
            bookingId={booking.id}
            media={media}
            canUpload={false}
            bookingStatus={booking.status}
          />
        )}

        {/* ── Status Timeline (replaces inline timeline) ── */}
        <StatusTimeline
          history={history}
          currentStatus={booking.status as BookingStatus}
        />

        {/* ── Booking reference ── */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Booking ID: {booking.id.slice(0, 8)}…
          </p>
        </div>
      </main>
    </div>
  );
}
