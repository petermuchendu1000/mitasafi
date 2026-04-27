/**
 * UpcomingSchedule
 *
 * Displays the next 3 scheduled/confirmed bookings with date, time,
 * provider, and service name. Helps customers see what's coming up.
 */

import Link from "next/link";
import { Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import type { UpcomingBooking } from "@/lib/services/dashboard";

interface UpcomingScheduleProps {
  bookings: UpcomingBooking[];
}

/** Format date for display */
function formatDate(isoDate: string): { day: string; month: string; time: string } {
  const date = new Date(isoDate);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString("en-KE", { month: "short" }),
    time: date.toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/** Get relative day label */
function getRelativeDay(isoDate: string): string | null {
  const date = new Date(isoDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return null;
}

export function UpcomingSchedule({ bookings }: UpcomingScheduleProps) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-4">Upcoming Schedule</h2>
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No upcoming bookings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-medium text-gray-900">Upcoming Schedule</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {bookings.map((booking) => {
          const hasSchedule = !!booking.scheduled_start;
          const dateInfo = hasSchedule
            ? formatDate(booking.scheduled_start!)
            : null;
          const relativeDay = hasSchedule
            ? getRelativeDay(booking.scheduled_start!)
            : null;

          return (
            <Link
              key={booking.id}
              href={`/dashboard/bookings/${booking.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              {/* Date badge */}
              {dateInfo ? (
                <div className="flex-shrink-0 w-12 h-12 bg-brand-50 rounded-lg flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-brand-700 leading-none">
                    {dateInfo.day}
                  </span>
                  <span className="text-[10px] font-medium text-brand-500 uppercase">
                    {dateInfo.month}
                  </span>
                </div>
              ) : (
                <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
              )}

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {booking.service_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {booking.provider_name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {dateInfo && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {relativeDay ? `${relativeDay}, ${dateInfo.time}` : dateInfo.time}
                    </span>
                  )}
                  {booking.location_summary && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      {booking.location_summary}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-gray-500 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
