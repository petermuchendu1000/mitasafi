/**
 * Customer Dispute Page (SC-5)
 *
 * Displays either:
 *   - The dispute filing form (if no active dispute exists)
 *   - The dispute status view (if a dispute is already filed)
 *
 * URL: /dashboard/bookings/[id]/dispute
 *
 * Auth gating: Redirects to login if not authenticated.
 * Status check: Only bookings in disputable statuses can have new disputes filed.
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookingById } from "@/lib/services/bookings";
import { getDisputeForBooking } from "./actions";
import { DisputeForm } from "@/components/booking/DisputeForm";
import { DisputeStatusView } from "@/components/booking/DisputeStatus";
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
  const { id } = await params;
  return {
    title: `Dispute — Booking ${id.slice(0, 8)} | MitaSafi`,
    description: "File or view a dispute for your booking.",
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Booking statuses from which a customer can file a NEW dispute. */
const DISPUTABLE_STATUSES: ReadonlySet<BookingStatus> = new Set([
  "completed",
  "customer_confirmed",
  "payment_pending",
  "payment_failed",
]);

// =============================================================================
// PAGE
// =============================================================================

export default async function DisputePage({ params }: PageProps) {
  const { id: bookingId } = await params;

  // ── Authenticate ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(`/dashboard/bookings/${bookingId}/dispute`)}`
    );
  }

  // ── Fetch booking ──
  const { booking, error: bookingError } = await getBookingById(
    bookingId,
    user.id
  );

  if (bookingError || !booking) {
    notFound();
  }

  // ── Fetch existing dispute ──
  const { dispute } = await getDisputeForBooking(bookingId);

  const provider = booking.provider;
  const service = booking.service;
  const providerName = provider?.business_name ?? "Provider";
  const serviceName = service?.name ?? "Service";

  // Determine mode: show form or show status
  const hasActiveDispute = dispute !== null;
  const canFileNewDispute =
    !hasActiveDispute &&
    DISPUTABLE_STATUSES.has(booking.status as BookingStatus);

  // If booking is already "disputed" and there's a dispute row, show status
  const showStatus =
    hasActiveDispute &&
    (booking.status === "disputed" || booking.status === "resolved");

  // If not disputable and no active dispute, redirect back
  if (!canFileNewDispute && !showStatus) {
    redirect(`/dashboard/bookings/${bookingId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
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
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Link
              href="/dashboard/bookings"
              className="hover:text-gray-600 transition-colors"
            >
              Bookings
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/dashboard/bookings/${bookingId}`}
              className="hover:text-gray-600 transition-colors"
            >
              {serviceName}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-600">Dispute</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Title ── */}
        <div className="text-center">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">
            {showStatus ? "Dispute Status" : "File a Dispute"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {showStatus
              ? `Regarding your booking with ${providerName}`
              : `Something went wrong with your ${serviceName} booking?`}
          </p>
        </div>

        {/* ── Content ── */}
        {showStatus && dispute ? (
          <DisputeStatusView dispute={dispute} />
        ) : canFileNewDispute ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <DisputeForm
              bookingId={bookingId}
              providerName={providerName}
              serviceName={serviceName}
              agreedPrice={booking.agreed_price}
            />
          </div>
        ) : null}

        {/* ── Booking reference ── */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Booking ID: {bookingId.slice(0, 8)}…
          </p>
        </div>
      </main>
    </div>
  );
}
