/**
 * Calendar View (Client Component)
 *
 * Renders a 7-day week grid with scheduled bookings slotted into each day.
 * Navigation: prev/next week arrows update URL search params.
 */

"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { getBookingStatusConfig } from "@/lib/constants/booking";
import type { BookingStatus } from "@/types/bookings";
import type { CalendarBooking } from "@/lib/services/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface CalendarViewProps {
  bookings: CalendarBooking[];
  weekStartISO: string; // "YYYY-MM-DD"
}

// =============================================================================
// HELPERS
// =============================================================================

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDayHeader(isoDate: string): { dayName: string; dayNumber: string; monthShort: string } {
  const d = new Date(isoDate + "T12:00:00"); // noon to avoid timezone shifts
  return {
    dayName: DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1],
    dayNumber: d.getDate().toString(),
    monthShort: d.toLocaleDateString("en-KE", { month: "short" }),
  };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isToday(isoDate: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return isoDate === today;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CalendarView({ bookings, weekStartISO }: CalendarViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Build array of 7 day dates starting from weekStartISO
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStartISO, i));
  }, [weekStartISO]);

  // Group bookings by day
  const bookingsByDay = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {};
    for (const day of days) {
      map[day] = [];
    }
    for (const b of bookings) {
      if (!b.scheduled_start) continue;
      const dayKey = b.scheduled_start.split("T")[0];
      if (map[dayKey]) {
        map[dayKey].push(b);
      }
    }
    return map;
  }, [bookings, days]);

  // Navigation
  const prevWeek = addDays(weekStartISO, -7);
  const nextWeek = addDays(weekStartISO, 7);

  const goToWeek = (weekDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", weekDate);
    router.push(`/dashboard/provider/calendar?${params.toString()}`);
  };

  const goToToday = () => {
    router.push("/dashboard/provider/calendar");
  };

  // Week label
  const weekLabel = useMemo(() => {
    const start = new Date(weekStartISO + "T12:00:00");
    const end = new Date(addDays(weekStartISO, 6) + "T12:00:00");
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = start.toLocaleDateString("en-KE", opts);
    const endStr = end.toLocaleDateString("en-KE", {
      ...opts,
      year: "numeric",
    });
    return `${startStr} — ${endStr}`;
  }, [weekStartISO]);

  return (
    <div className="space-y-4">
      {/* Navigation header */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
        <button
          onClick={() => goToWeek(prevWeek)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">{weekLabel}</h2>
          <button
            onClick={goToToday}
            className="text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-1 rounded hover:bg-teal-50 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={() => goToWeek(nextWeek)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {days.map((day) => {
          const { dayName, dayNumber, monthShort } = formatDayHeader(day);
          const dayBookings = bookingsByDay[day] ?? [];
          const today = isToday(day);

          return (
            <div
              key={day}
              className={`bg-white rounded-xl border ${
                today ? "border-teal-300 ring-1 ring-teal-100" : "border-gray-200"
              } overflow-hidden`}
            >
              {/* Day header */}
              <div
                className={`px-3 py-2 border-b ${
                  today
                    ? "bg-teal-50 border-teal-200"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      today ? "text-teal-700" : "text-gray-500"
                    }`}
                  >
                    {dayName}
                  </span>
                  <span
                    className={`text-xs ${
                      today ? "text-teal-600 font-semibold" : "text-gray-400"
                    }`}
                  >
                    {monthShort} {dayNumber}
                  </span>
                </div>
              </div>

              {/* Bookings */}
              <div className="p-2 space-y-2 min-h-[80px]">
                {dayBookings.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-4">
                    <p className="text-xs text-gray-300">No jobs</p>
                  </div>
                ) : (
                  dayBookings.map((b) => {
                    const config = getBookingStatusConfig(
                      b.status as BookingStatus
                    );
                    return (
                      <Link
                        key={b.id}
                        href={`/dashboard/provider/jobs/${b.id}`}
                        className="block rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div
                          className={`rounded-lg px-2.5 py-2 border-l-3 ${config.bgColor}`}
                          style={{ borderLeftWidth: "3px", borderLeftColor: "currentColor" }}
                        >
                          <p
                            className={`text-xs font-medium truncate ${config.color}`}
                          >
                            {b.service?.name ?? "Job"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-[11px] text-gray-500">
                              {formatTime(b.scheduled_start)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {bookings.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No scheduled jobs this week</p>
          <p className="text-xs text-gray-400 mt-1">
            Schedule a job from the job detail page
          </p>
        </div>
      )}
    </div>
  );
}
