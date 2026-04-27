/**
 * Customer Quote View Page
 *
 * The customer sees the provider's quote with full breakdown, can accept or reject.
 * Marks the quote as "viewed" on render (fires markQuoteAsViewed).
 *
 * URL: /dashboard/bookings/[id]/quote
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  FileText,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookingById } from "@/lib/services/bookings";
import { getActiveQuoteForBooking, markQuoteAsViewed } from "@/lib/services/quotes";
import type {
  BookingQuote,
  BookingStatus,
  QuoteBreakdownItem,
} from "@/types/bookings";
import { getBookingStatusConfig } from "@/lib/constants/booking";
import { QuoteActions } from "./QuoteActions";

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
    title: `Quote · Booking ${id.slice(0, 8)} | MitaSafi`,
    description: "Review and respond to the provider's quote.",
  };
}

// =============================================================================
// STATUSES WHERE THE CUSTOMER CAN VIEW A QUOTE
// =============================================================================

const QUOTE_VIEWABLE_STATUSES: BookingStatus[] = [
  "quote_sent",
  "quote_accepted",
  "quote_rejected",
  "confirmed",
];

// =============================================================================
// PAGE
// =============================================================================

export default async function CustomerQuotePage({ params }: PageProps) {
  const { id: bookingId } = await params;

  // ── Auth ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(
        `/dashboard/bookings/${bookingId}/quote`
      )}`
    );
  }

  // ── Fetch booking ──
  const { booking, error } = await getBookingById(bookingId, user.id);

  if (error || !booking) {
    notFound();
  }

  // Must have a quote-visible status
  if (!QUOTE_VIEWABLE_STATUSES.includes(booking.status as BookingStatus)) {
    redirect(`/dashboard/bookings/${bookingId}`);
  }

  // ── Fetch active quote ──
  const { quote, error: quoteError } = await getActiveQuoteForBooking(bookingId);

  if (quoteError || !quote) {
    // No quote found — redirect to booking detail
    redirect(`/dashboard/bookings/${bookingId}`);
  }

  // ── Mark as viewed (fire-and-forget) ──
  if (quote.status === "sent") {
    markQuoteAsViewed(quote.id).catch((err) => {
      console.error("[CustomerQuote] markQuoteAsViewed failed:", err);
    });
  }

  const statusConfig = getBookingStatusConfig(booking.status as BookingStatus);
  const provider = booking.provider;
  const service = booking.service;
  const breakdown = (quote.breakdown ?? []) as QuoteBreakdownItem[];
  const isRevision = quote.revision_count > 0;
  const canRespond = ["quote_sent", "quote_rejected"].includes(booking.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href={`/dashboard/bookings/${bookingId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Booking</span>
          </Link>
          <span className="text-gray-200">|</span>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Link
              href="/dashboard/bookings"
              className="hover:text-gray-600 transition-colors"
            >
              My Bookings
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/dashboard/bookings/${bookingId}`}
              className="hover:text-gray-600 transition-colors"
            >
              {service?.name ?? "Booking"}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-600">Quote</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Status context ── */}
        <div className={`rounded-xl px-5 py-4 ${statusConfig.bgColor}`}>
          <p className={`text-sm font-semibold ${statusConfig.color}`}>
            {booking.status === "quote_sent"
              ? "You received a quote — review and respond"
              : booking.status === "quote_accepted"
                ? "You accepted this quote"
                : booking.status === "quote_rejected"
                  ? "You declined this quote — the provider may revise"
                  : statusConfig.label}
          </p>
        </div>

        {/* ── Provider info ── */}
        {provider && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {provider.business_name}
                </p>
                <p className="text-xs text-gray-500">
                  {isRevision
                    ? `Revised quote (v${quote.revision_count + 1})`
                    : "Quote from provider"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Quote card ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-900">
              {isRevision ? `Revised Quote (v${quote.revision_count + 1})` : "Quote"}
            </h2>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Total price */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total quoted</span>
              <span className="text-2xl font-bold text-gray-900">
                KES {quote.quoted_price.toLocaleString()}
              </span>
            </div>

            {/* Breakdown */}
            {breakdown.length > 0 && (
              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Breakdown
                </p>
                {breakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between text-sm"
                  >
                    <div className="min-w-0">
                      <span className="text-gray-700">{item.label}</span>
                      {item.quantity && item.quantity > 1 && (
                        <span className="text-gray-400 ml-1">
                          ×{item.quantity}
                        </span>
                      )}
                      {item.note && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-900 font-medium ml-3 flex-shrink-0">
                      KES {(item.amount * (item.quantity ?? 1)).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {quote.description && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                  What&rsquo;s included
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {quote.description}
                </p>
              </div>
            )}

            {/* Validity */}
            {quote.valid_until && (
              <div className="border-t border-gray-100 pt-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-500">
                  Valid until{" "}
                  <span className="font-medium text-gray-700">
                    {new Date(quote.valid_until).toLocaleDateString("en-KE", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Action buttons (accept / reject) ── */}
        {canRespond && (
          <QuoteActions
            bookingId={bookingId}
            quoteId={quote.id}
            quotedPrice={quote.quoted_price}
          />
        )}

        {/* ── Already responded message ── */}
        {booking.status === "quote_accepted" && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 text-center">
            <p className="text-sm font-medium text-green-700">
              You accepted this quote — the provider will confirm your booking.
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="text-center">
          <Link
            href={`/dashboard/bookings/${bookingId}`}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to booking
          </Link>
        </div>
      </main>
    </div>
  );
}
