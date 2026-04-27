/**
 * Schedule Job Page (Provider)
 *
 * Provider selects a date and time window to schedule a confirmed booking.
 * Transitions: confirmed → scheduled
 *
 * URL: /dashboard/provider/jobs/[id]/schedule
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import { getBookingById } from "@/lib/services/bookings";
import { ScheduleJobForm } from "./ScheduleJobForm";

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
    title: `Schedule Job ${id.slice(0, 8)} | Provider Dashboard | MitaSafi`,
    description: "Schedule a date and time for this job.",
  };
}

// =============================================================================
// PAGE
// =============================================================================

export default async function ScheduleJobPage({ params }: PageProps) {
  const { id: bookingId } = await params;

  // Authenticate
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(`/dashboard/provider/jobs/${bookingId}/schedule`)}`
    );
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    redirect("/dashboard");
  }

  // Fetch booking
  const { booking, error } = await getBookingById(bookingId, user.id);
  if (error || !booking) {
    notFound();
  }

  // Must be assigned to this provider
  if (booking.provider_id !== providerId) {
    notFound();
  }

  // Must be in a schedulable state
  const schedulableStatuses = [
    "confirmed",
    "requires_followup",
    "rework_required",
    "customer_no_show",
  ];
  if (!schedulableStatuses.includes(booking.status)) {
    redirect(`/dashboard/provider/jobs/${bookingId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href={`/dashboard/provider/jobs/${bookingId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Job Detail</span>
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
            <span className="text-gray-600">Schedule</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Schedule Job</h1>
          <p className="text-sm text-gray-500 mt-1">
            {booking.service?.name
              ? `Set the date and time for "${booking.service.name}"`
              : "Set the date and time for this job"}
          </p>
        </div>

        {/* Existing schedule info */}
        {booking.scheduled_start && (
          <div className="mb-6 rounded-lg bg-sky-50 border border-sky-200 px-4 py-3">
            <p className="text-sm text-sky-700">
              <span className="font-medium">Currently scheduled:</span>{" "}
              {new Date(booking.scheduled_start).toLocaleDateString("en-KE", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}

        <ScheduleJobForm
          bookingId={bookingId}
          existingStart={booking.scheduled_start}
          existingEnd={booking.scheduled_end}
        />
      </main>
    </div>
  );
}
