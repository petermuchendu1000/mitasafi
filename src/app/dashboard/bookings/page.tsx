/**
 * Customer Bookings List Page
 *
 * Shows all bookings for the authenticated customer with status tabs,
 * status badges, and links to booking detail pages.
 *
 * URL: /dashboard/bookings
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCustomerBookings, getCustomerBookingCounts } from "@/lib/services/bookings";
import { getUnreadCountsForBookings } from "@/lib/services/messages";
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
  title: "My Bookings | MitaSafi",
  description: "View and manage your service bookings.",
};

// =============================================================================
// PAGE
// =============================================================================

export default async function CustomerBookingsPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "active";
  const pageNum = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;

  // Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/bookings");
  }

  // Resolve tab name to actual booking_status enum values
  const tabToStatuses: Record<string, string[] | undefined> = {
    all: undefined,
    active: [...BOOKING_STATUS_TABS.active],
    completed: [...BOOKING_STATUS_TABS.completed],
    cancelled: [...BOOKING_STATUS_TABS.cancelled],
    disputed: [...BOOKING_STATUS_TABS.disputed],
  };
  const statusFilter = tabToStatuses[tab] ?? undefined;

  // Fetch bookings + counts in parallel
  const [bookingsResult, counts] = await Promise.all([
    getCustomerBookings({
      customerId: user.id,
      status: statusFilter,
      page: pageNum,
      pageSize: 10,
    }),
    getCustomerBookingCounts(user.id),
  ]);

  const { bookings, pagination } = bookingsResult;

  // Fetch per-booking unread message counts (sequential — needs booking IDs)
  const bookingIds = bookings.map((b) => b.id);
  const unreadCounts = await getUnreadCountsForBookings(bookingIds, user.id);

  // Tab config
  const tabs = [
    { key: "active", label: "Active", count: counts.active },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "all", label: "All", count: counts.total },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="text-gray-200">|</span>
            <h1 className="text-base font-semibold text-gray-900">
              My Bookings
            </h1>
            <div className="flex-1" />
            <Link
              href="/dashboard/bookings/messages"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              title="Messages"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 -mb-px">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/dashboard/bookings?tab=${t.key}`}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      tab === t.key
                        ? "bg-teal-100 text-teal-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-4">
              {tab === "active"
                ? "No active bookings"
                : tab === "completed"
                  ? "No completed bookings yet"
                  : "No bookings yet"}
            </p>
            <Link
              href="/services/browse"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              Browse services
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const status = getBookingStatusConfig(
                booking.status as BookingStatus
              );
              const meta = booking.metadata as Record<string, unknown> | null;
              const locationSummary = (meta?.location_summary as string) || null;

              return (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${booking.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: service + provider */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {booking.service?.name ?? "Service"}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
                        >
                          {status.label}
                        </span>
                        {(unreadCounts.get(booking.id) ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 bg-brand-50 rounded-full">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {unreadCounts.get(booking.id)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {booking.provider?.business_name ?? "Provider pending"}
                      </p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                        {locationSummary && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {locationSummary}
                          </span>
                        )}
                        {booking.scheduled_start && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(booking.scheduled_start).toLocaleDateString(
                              "en-KE",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: chevron */}
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {pageNum > 1 && (
              <Link
                href={`/dashboard/bookings?tab=${tab}&page=${pageNum - 1}`}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-gray-500">
              Page {pageNum} of {pagination.totalPages}
            </span>
            {pagination.hasMore && (
              <Link
                href={`/dashboard/bookings?tab=${tab}&page=${pageNum + 1}`}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
