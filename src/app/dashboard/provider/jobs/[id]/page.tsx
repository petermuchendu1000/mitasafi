/**
 * Provider Job Detail Page
 *
 * Full detail view for a single booking from the provider's perspective.
 * Shows: customer info, service details, location, schedule, status timeline,
 * current quote state, and contextual action buttons.
 *
 * URL: /dashboard/provider/jobs/[id]
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  User,
} from "lucide-react";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import { getBookingWithQuotes } from "@/lib/services/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBookingStatusConfig,
  getBookingStatusLabel,
} from "@/lib/constants/booking";
import type {
  BookingQuote,
  BookingStatus,
  BookingStatusHistory,
  QuoteBreakdownItem,
} from "@/types/bookings";
import { JobActionButtons } from "./JobActionButtons";
import { BookingChat } from "@/components/booking/BookingChat";
import { StatusTimeline } from "@/components/booking/StatusTimeline";
import { JobPhotos } from "@/components/booking/JobPhotos";

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
    title: `Job ${id.slice(0, 8)} | Provider Dashboard | MitaSafi`,
    description: "View job details and take action.",
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

function formatPrice(price: number | null | undefined): string {
  if (price == null) return "—";
  return `KES ${price.toLocaleString()}`;
}

// =============================================================================
// PAGE
// =============================================================================

export default async function ProviderJobDetailPage({ params }: PageProps) {
  const { id: bookingId } = await params;

  // Authenticate
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(`/dashboard/provider/jobs/${bookingId}`)}`
    );
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    redirect("/dashboard");
  }

  // Fetch booking with quotes
  const { booking, error } = await getBookingWithQuotes(bookingId, user.id);

  if (error || !booking) {
    notFound();
  }

  // Verify this booking belongs to this provider
  if (booking.provider_id !== providerId) {
    notFound();
  }

  // ── Auto-track provider_viewed ──
  // When provider first opens a submitted booking, silently transition to provider_viewed.
  // Fire-and-forget: non-blocking, won't delay page render.
  if (booking.status === "submitted") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin: any = createAdminClient();
    // Set audit context for auto-log trigger
    Promise.all([
      admin.rpc("set_config", { setting: "app.current_user_id", value: user.id }),
      admin.rpc("set_config", { setting: "app.current_user_role", value: "provider" }),
    ])
      .then(() =>
        admin
          .from("bookings")
          .update({
            status: "provider_viewed",
            provider_viewed_at: new Date().toISOString(),
          })
          .eq("id", bookingId)
      )
      .then(({ error }: { error: unknown }) => {
        if (error) {
          console.error("[ProviderJobDetail] provider_viewed tracking failed:", error);
        }
      })
      .catch((err: unknown) => {
        console.error("[ProviderJobDetail] provider_viewed tracking error:", err);
      });
  }

  const statusConfig = getBookingStatusConfig(booking.status as BookingStatus);
  const meta = booking.metadata as Record<string, unknown> | null;
  const locationSummary = (meta?.location_summary as string) || null;
  const service = booking.service;
  const customer = booking.customer;
  const history = booking.status_history ?? [];
  const media = booking.media ?? [];
  const activeQuote = booking.quotes?.find((q) => !q.superseded_at) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/dashboard/provider/jobs"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Jobs</span>
          </Link>
          <span className="text-gray-200">|</span>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Link
              href="/dashboard/provider/jobs"
              className="hover:text-gray-600 transition-colors"
            >
              Jobs
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-600">
              {service?.name ?? "Job Detail"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Status Banner ── */}
        <div className={`rounded-xl px-5 py-4 ${statusConfig.bgColor}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className={`text-sm mt-0.5 ${statusConfig.color} opacity-80`}>
            {statusConfig.description}
          </p>
        </div>

        {/* ── Action Buttons ── */}
        <JobActionButtons
          bookingId={booking.id}
          bookingStatus={booking.status}
          hasActiveQuote={!!activeQuote}
          quotedPrice={activeQuote?.quoted_price ?? null}
        />

        {/* ── Service & Customer Card ── */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Service */}
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Service requested
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

          {/* Customer */}
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
              Customer
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {customer?.full_name ?? "Customer"}
                </p>
                <p className="text-xs text-gray-500">
                  Requested {formatDateTime(booking.requested_at ?? booking.created_at)}
                </p>
              </div>
            </div>
          </div>
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
                  Customer notes
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
                  <p className="text-sm font-semibold text-green-700">
                    Agreed: {formatPrice(booking.agreed_price)}
                  </p>
                ) : booking.quoted_price ? (
                  <p className="text-sm text-gray-900">
                    Quoted: {formatPrice(booking.quoted_price)}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* ── Current Quote ── */}
        {activeQuote && (
          <QuoteCard quote={activeQuote} />
        )}

        {/* ── Messages ── */}
        <BookingChat
          bookingId={booking.id}
          currentUserId={user.id}
          bookingStatus={booking.status as BookingStatus}
        />

        {/* ── Job Photos (M5) ── */}
        <JobPhotos
          bookingId={booking.id}
          media={media}
          canUpload={true}
          bookingStatus={booking.status}
        />

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

// =============================================================================
// QUOTE CARD (displays active quote on the job detail page)
// =============================================================================

function QuoteCard({ quote }: { quote: BookingQuote }) {
  const breakdown = (quote.breakdown ?? []) as QuoteBreakdownItem[];
  const isRevision = quote.revision_count > 0;

  const statusBadge: Record<string, { label: string; className: string }> = {
    sent: {
      label: "Sent",
      className: "bg-purple-100 text-purple-700",
    },
    viewed: {
      label: "Viewed by customer",
      className: "bg-blue-100 text-blue-700",
    },
    accepted: {
      label: "Accepted",
      className: "bg-green-100 text-green-700",
    },
    rejected: {
      label: "Rejected",
      className: "bg-orange-100 text-orange-700",
    },
    expired: {
      label: "Expired",
      className: "bg-gray-100 text-gray-600",
    },
    superseded: {
      label: "Superseded",
      className: "bg-gray-100 text-gray-500",
    },
  };

  const badge = statusBadge[quote.status] ?? statusBadge.sent;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {isRevision ? `Revised Quote (v${quote.revision_count + 1})` : "Your Quote"}
          </h3>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Total</span>
          <span className="text-lg font-bold text-gray-900">
            KES {quote.quoted_price.toLocaleString()}
          </span>
        </div>

        {/* Breakdown */}
        {breakdown.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              Breakdown
            </p>
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between text-sm"
              >
                <div className="min-w-0">
                  <span className="text-gray-700">{item.label}</span>
                  {item.quantity && item.quantity > 1 && (
                    <span className="text-gray-400 ml-1">×{item.quantity}</span>
                  )}
                  {item.note && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                  )}
                </div>
                <span className="text-gray-900 font-medium ml-3 flex-shrink-0">
                  KES {item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {quote.description && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Description
            </p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {quote.description}
            </p>
          </div>
        )}

        {/* Validity */}
        {quote.valid_until && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">
              Valid until{" "}
              <span className="font-medium text-gray-700">
                {new Date(quote.valid_until).toLocaleDateString("en-KE", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </p>
          </div>
        )}

        {/* Customer response (if rejected) */}
        {quote.customer_response && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Customer feedback
            </p>
            <p className="text-sm text-gray-600 italic">
              &ldquo;{quote.customer_response}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
