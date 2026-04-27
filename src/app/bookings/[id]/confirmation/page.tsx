/**
 * Booking Confirmation Page
 *
 * Shown immediately after a customer submits a booking request.
 * Displays booking ID, provider info, and next steps.
 *
 * URL: /bookings/[id]/confirmation
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Clock, Bell, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookingById } from "@/lib/services/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: "Booking Confirmed | MitaSafi",
  description: "Your service request has been submitted successfully.",
};

// =============================================================================
// PAGE
// =============================================================================

export default async function BookingConfirmationPage({ params }: PageProps) {
  const { id: bookingId } = await params;

  // Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/bookings/${bookingId}/confirmation`)}`);
  }

  // Fetch booking
  const { booking, error } = await getBookingById(bookingId, user.id);

  if (error || !booking) {
    notFound();
  }

  const providerName = booking.provider?.business_name ?? "the provider";
  const serviceName = booking.service?.name ?? "Service";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-teal-600" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Request submitted!
        </h1>
        <p className="text-gray-500 mb-8">
          Your request for <strong className="text-gray-900">{serviceName}</strong>{" "}
          has been sent to <strong className="text-gray-900">{providerName}</strong>.
        </p>

        {/* Booking reference */}
        <div className="rounded-xl border border-gray-200 p-5 mb-8 text-left">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
            What happens next
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Provider gets notified
                </p>
                <p className="text-xs text-gray-500">
                  {providerName} will review your request and respond.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Expect a response soon
                </p>
                <p className="text-xs text-gray-500">
                  Most providers respond within a few hours.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  You may receive a quote
                </p>
                <p className="text-xs text-gray-500">
                  The provider may send an itemized quote for your review.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href={`/dashboard/bookings/${bookingId}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 transition-colors"
          >
            View booking details
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/bookings"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-200 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            View all bookings
          </Link>
          <Link
            href="/services/browse"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Browse more services
          </Link>
        </div>
      </div>
    </div>
  );
}
