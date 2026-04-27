/**
 * Provider Quote Creation / Revision Page
 *
 * Form page where a provider composes and submits (or revises) a quote
 * for a customer's booking request.
 *
 * URL: /dashboard/provider/jobs/[id]/quote
 *
 * Pre-populates with existing quote data when revising.
 * Validates the booking status allows quoting before rendering.
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import { getBookingWithQuotes } from "@/lib/services/bookings";
import type { BookingQuote, BookingStatus, QuoteBreakdownItem } from "@/types/bookings";
import { QuoteForm } from "./QuoteForm";

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
    title: `Send Quote · Job ${id.slice(0, 8)} | MitaSafi`,
    description: "Create or revise a quote for a booking.",
  };
}

// =============================================================================
// STATUS GUARD — only these statuses allow quote creation/revision
// =============================================================================

const QUOTABLE_STATUSES: BookingStatus[] = [
  "submitted",
  "provider_viewed",
  "quote_pending",
  "quote_rejected",
];

// =============================================================================
// PAGE
// =============================================================================

export default async function ProviderQuotePage({ params }: PageProps) {
  const { id: bookingId } = await params;

  // ── Auth ──
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(
        `/dashboard/provider/jobs/${bookingId}/quote`
      )}`
    );
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    redirect("/dashboard");
  }

  // ── Fetch booking + quotes ──
  const { booking, error } = await getBookingWithQuotes(bookingId, user.id);

  if (error || !booking) {
    notFound();
  }

  // Verify ownership
  if (booking.provider_id !== providerId) {
    notFound();
  }

  // Verify quotable status
  if (!QUOTABLE_STATUSES.includes(booking.status as BookingStatus)) {
    // Booking is not in a quotable state — redirect to job detail
    redirect(`/dashboard/provider/jobs/${bookingId}`);
  }

  // ── Detect existing quote (for revision) ──
  const activeQuote: BookingQuote | null =
    booking.quotes?.find((q) => !q.superseded_at) ?? null;

  const isRevision = activeQuote !== null;
  const serviceName = booking.service?.name ?? "Service";

  // Pre-populate form data from existing quote (revision case)
  const initialBreakdown: QuoteBreakdownItem[] = isRevision
    ? (activeQuote.breakdown as QuoteBreakdownItem[]) ?? []
    : [];

  const initialData = isRevision
    ? {
        quotedPrice: activeQuote.quoted_price,
        breakdown: initialBreakdown,
        description: activeQuote.description ?? "",
        validityDays: activeQuote.validity_days,
      }
    : undefined;

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
            <span className="hidden sm:inline">Job</span>
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
            <Link
              href={`/dashboard/provider/jobs/${bookingId}`}
              className="hover:text-gray-600 transition-colors"
            >
              {serviceName}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-600">
              {isRevision ? "Revise Quote" : "Send Quote"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Context banner */}
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-5 py-4">
          <p className="text-sm font-medium text-indigo-700">
            {isRevision
              ? `Revise your quote for ${serviceName}`
              : `Send a quote for ${serviceName}`}
          </p>
          {booking.customer_notes && (
            <p className="text-sm text-indigo-600 mt-1">
              Customer notes: &ldquo;{booking.customer_notes}&rdquo;
            </p>
          )}
          {isRevision && activeQuote.customer_response && (
            <p className="text-sm text-orange-600 mt-2">
              Customer feedback on previous quote: &ldquo;
              {activeQuote.customer_response}&rdquo;
            </p>
          )}
        </div>

        {/* Quote form */}
        <QuoteForm
          bookingId={bookingId}
          isRevision={isRevision}
          initialData={initialData}
        />
      </main>
    </div>
  );
}
