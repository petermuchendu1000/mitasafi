/**
 * ActiveBookingsWidget
 *
 * Displays up to 3 active service bookings with status, provider name,
 * and a contextual next-action CTA. Renders as a clean card list.
 */

"use client";

import Link from "next/link";
import { ChevronRight, Clock, MapPin, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveBooking } from "@/lib/services/dashboard";
import { getBookingStatusConfig } from "@/lib/constants/booking";
import type { BookingStatus } from "@/types/bookings";

interface ActiveBookingsWidgetProps {
  bookings: ActiveBooking[];
  totalCount: number;
}

/** Get the recommended next action for a booking based on its status */
function getNextAction(status: string): { label: string; emphasis: boolean } {
  switch (status) {
    case "submitted":
    case "provider_viewed":
      return { label: "Awaiting provider response", emphasis: false };
    case "quote_pending":
      return { label: "Quote being prepared", emphasis: false };
    case "quote_sent":
      return { label: "Review quote", emphasis: true };
    case "quote_accepted":
    case "confirmed":
      return { label: "Confirmed — awaiting schedule", emphasis: false };
    case "scheduled":
      return { label: "Scheduled", emphasis: false };
    case "in_progress":
      return { label: "In progress", emphasis: true };
    case "partially_completed":
    case "requires_followup":
      return { label: "Needs attention", emphasis: true };
    case "rework_required":
      return { label: "Rework requested", emphasis: true };
    case "payment_pending":
      return { label: "Payment required", emphasis: true };
    case "payment_failed":
      return { label: "Payment failed — retry", emphasis: true };
    default:
      return { label: "View details", emphasis: false };
  }
}

/** Format scheduled time relative to now */
function formatScheduledTime(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) {
    return date.toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-KE", { weekday: "short" });
  }
  return date.toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}

export function ActiveBookingsWidget({
  bookings,
  totalCount,
}: ActiveBookingsWidgetProps) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-4">Active Bookings</h2>
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">No active bookings</p>
          <Link
            href="/services/browse"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Browse services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-medium text-gray-900">Active Bookings</h2>
        {totalCount > 3 && (
          <Link
            href="/dashboard/bookings?tab=active"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            View all ({totalCount})
          </Link>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {bookings.map((booking) => {
          const statusConfig = getBookingStatusConfig(
            booking.status as BookingStatus
          );
          const nextAction = getNextAction(booking.status);
          const scheduledTime = formatScheduledTime(booking.scheduled_start);

          return (
            <Link
              key={booking.id}
              href={`/dashboard/bookings/${booking.id}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              {/* Provider avatar */}
              <div className="relative w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                {booking.provider_photo_url ? (
                  <img
                    src={booking.provider_photo_url}
                    alt={booking.provider_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 font-semibold text-sm">
                    {booking.provider_name.charAt(0).toUpperCase()}
                  </span>
                )}
                {booking.booking_flow_type === "emergency" && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {booking.service_name}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                      statusConfig.bgColor,
                      statusConfig.color
                    )}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {booking.provider_name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  {booking.location_summary && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      {booking.location_summary}
                    </span>
                  )}
                  {scheduledTime && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {scheduledTime}
                    </span>
                  )}
                </div>
                {/* Next action */}
                <p
                  className={cn(
                    "text-xs mt-1.5",
                    nextAction.emphasis
                      ? "text-brand-600 font-medium"
                      : "text-gray-400"
                  )}
                >
                  {nextAction.label}
                </p>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1 group-hover:text-gray-500 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
