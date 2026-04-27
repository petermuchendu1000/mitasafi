/**
 * Provider Calendar Page (Server Component)
 *
 * Shows scheduled jobs for the current week/month.
 * Accepts ?week=YYYY-MM-DD to navigate between weeks.
 *
 * URL: /dashboard/provider/calendar
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import { getProviderScheduledBookings } from "@/lib/services/bookings";
import { CalendarView } from "./CalendarView";

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: "Calendar | Provider Dashboard | MitaSafi",
  description: "View your scheduled jobs on a calendar.",
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get the Monday of the week containing `date`.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// =============================================================================
// PAGE
// =============================================================================

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const { week } = await searchParams;

  // Auth
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/provider/calendar");
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    redirect("/dashboard");
  }

  // Determine the week to display
  const baseDate = week ? new Date(week) : new Date();
  const weekStart = getWeekStart(baseDate);
  const weekEnd = addDays(weekStart, 6);

  // Fetch bookings in the week range (extend a day on each side for safety)
  const rangeStart = toISODate(weekStart) + "T00:00:00";
  const rangeEnd = toISODate(weekEnd) + "T23:59:59";

  const { bookings } = await getProviderScheduledBookings(
    providerId,
    rangeStart,
    rangeEnd
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your scheduled jobs for the week
        </p>
      </div>

      <CalendarView
        bookings={bookings}
        weekStartISO={toISODate(weekStart)}
      />
    </div>
  );
}
