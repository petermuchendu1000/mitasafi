/**
 * Provider Jobs List Page
 *
 * Shows all bookings assigned to the authenticated provider.
 * Tab-based: Pending | Quoting | Active | Completed | All
 * Each card links to the job detail page.
 *
 * URL: /dashboard/provider/jobs
 * Prerequisite for: M3 (Quoting & Negotiation)
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  User,
} from "lucide-react";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import {
  getProviderBookings,
  getProviderBookingCounts,
} from "@/lib/services/bookings";
import {
  getBookingStatusConfig,
  BOOKING_STATUS_TABS,
} from "@/lib/constants/booking";
import type { BookingStatus } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: "Jobs | Provider Dashboard | MitaSafi",
  description: "Manage your service bookings and job requests.",
};

// =============================================================================
// TAB DEFINITIONS
// =============================================================================

const PROVIDER_JOB_TABS: Record<string, string[]> = {
  pending: ["submitted", "provider_viewed"],
  quoting: ["quote_pending", "quote_sent", "quote_accepted", "quote_rejected"],
  active: ["confirmed", "in_progress"],
  completed: ["completed", "customer_confirmed"],
  all: [],
};

// =============================================================================
// HELPERS
// =============================================================================

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `KES ${price.toLocaleString()}`;
}

// =============================================================================
// PAGE
// =============================================================================

export default async function ProviderJobsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "pending";
  const pageNum = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;

  // Authenticate
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/provider/jobs");
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    redirect("/dashboard");
  }

  // Resolve tab → status filter
  const statusFilter = PROVIDER_JOB_TABS[tab] ?? [];

  // Fetch bookings + counts in parallel
  const [bookingsResult, counts] = await Promise.all([
    getProviderBookings({
      providerId,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      page: pageNum,
      pageSize: 10,
    }),
    getProviderBookingCounts(providerId),
  ]);

  const { bookings, pagination } = bookingsResult;

  // Tab config with counts
  const tabs = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "quoting", label: "Quoting", count: counts.quoting },
    { key: "active", label: "Active", count: counts.active },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "all", label: "All", count: counts.total },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">
            <Link
              href="/dashboard/provider"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="text-gray-200">|</span>
            <h1 className="text-base font-semibold text-gray-900">Jobs</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/dashboard/provider/jobs?tab=${t.key}`}
                className={`
                  flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium
                  border-b-2 transition-colors whitespace-nowrap
                  ${
                    tab === t.key
                      ? "border-teal-600 text-teal-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className={`
                      text-xs rounded-full px-1.5 py-0.5 font-medium
                      ${
                        tab === t.key
                          ? "bg-teal-100 text-teal-700"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              No jobs found
            </h3>
            <p className="text-sm text-gray-500">
              {tab === "pending"
                ? "You have no pending job requests."
                : tab === "quoting"
                  ? "No jobs in the quoting stage."
                  : tab === "active"
                    ? "No active jobs right now."
                    : "No bookings to display."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const statusConfig = getBookingStatusConfig(
                booking.status as BookingStatus
              );
              const meta = booking.metadata as Record<string, unknown> | null;
              const locationSummary =
                (meta?.location_summary as string) || null;
              const isQuoteRelated = [
                "quote_pending",
                "quote_sent",
                "quote_accepted",
                "quote_rejected",
              ].includes(booking.status);

              return (
                <Link
                  key={booking.id}
                  href={`/dashboard/provider/jobs/${booking.id}`}
                  className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="px-5 py-4">
                    {/* Top row: service + status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {booking.service?.name ?? "Service request"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-500 truncate">
                            {booking.customer?.full_name ?? "Customer"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`
                          inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                          ${statusConfig.bgColor} ${statusConfig.color}
                          flex-shrink-0
                        `}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {locationSummary && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">
                            {locationSummary}
                          </span>
                        </span>
                      )}
                      {booking.scheduled_start && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(booking.scheduled_start).toLocaleDateString(
                            "en-KE",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      )}
                      {(booking.quoted_price || booking.agreed_price) && (
                        <span className="font-medium text-gray-700">
                          {formatPrice(
                            booking.agreed_price ?? booking.quoted_price
                          )}
                        </span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(booking.created_at)}
                      </span>
                    </div>

                    {/* Quote action hint */}
                    {isQuoteRelated && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-medium text-indigo-600">
                          {booking.status === "quote_pending"
                            ? "Send a quote →"
                            : booking.status === "quote_sent"
                              ? "Awaiting customer response"
                              : booking.status === "quote_accepted"
                                ? "Quote accepted — confirm booking"
                                : "Quote rejected — revise or cancel"}
                        </span>
                        <ChevronRight className="w-3 h-3 text-indigo-400 ml-auto" />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ·{" "}
              {pagination.total} total
            </p>
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <Link
                  href={`/dashboard/provider/jobs?tab=${tab}&page=${pagination.page - 1}`}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Previous
                </Link>
              )}
              {pagination.hasMore && (
                <Link
                  href={`/dashboard/provider/jobs?tab=${tab}&page=${pagination.page + 1}`}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
