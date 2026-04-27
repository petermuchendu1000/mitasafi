/**
 * Provider Quotes List Page
 *
 * Lists all quotes sent by the provider, showing status, booking info, 
 * and amounts. Links to the relevant job detail page.
 *
 * URL: /dashboard/provider/quotes
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
} from "lucide-react";
import { getCachedProviderId, getCachedUser } from "@/lib/cache/queries";
import { getProviderQuotes, getProviderQuoteCounts } from "@/lib/services/quotes";
import type { QuoteWithDetails } from "@/types/bookings";

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: "Quotes | Provider Dashboard | MitaSafi",
  description: "View and manage your quotes.",
};

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const quoteStatusStyles: Record<string, { label: string; className: string }> = {
  sent: { label: "Sent", className: "bg-purple-100 text-purple-700" },
  viewed: { label: "Viewed", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-700" },
  rejected: { label: "Declined", className: "bg-orange-100 text-orange-700" },
  expired: { label: "Expired", className: "bg-gray-100 text-gray-600" },
  superseded: { label: "Superseded", className: "bg-gray-100 text-gray-500" },
};

// =============================================================================
// PAGE
// =============================================================================

export default async function ProviderQuotesPage() {
  // ── Auth ──
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/provider/quotes");
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    redirect("/dashboard");
  }

  // ── Fetch data ──
  const [quotesResult, counts] = await Promise.all([
    getProviderQuotes({ providerId, pageSize: 50 }),
    getProviderQuoteCounts(providerId),
  ]);

  const quotes = quotesResult.quotes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Quotes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage quotes you&rsquo;ve sent to customers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.total },
          { label: "Awaiting response", value: counts.pending },
          { label: "Accepted", value: counts.accepted },
          { label: "Declined", value: counts.rejected },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 px-4 py-3"
          >
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quotes list */}
      {quotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No quotes yet</p>
          <p className="text-sm text-gray-500 mt-1">
            When you send quotes to customers, they&rsquo;ll appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {quotes.map((quote: QuoteWithDetails) => {
            const style = quoteStatusStyles[quote.status] ?? quoteStatusStyles.sent;
            const bookingId = quote.booking_id;

            return (
              <Link
                key={quote.id}
                href={`/dashboard/provider/jobs/${bookingId}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    KES {quote.quoted_price.toLocaleString()}
                    {quote.revision_count > 0 && (
                      <span className="text-gray-400 ml-1 text-xs">
                        v{quote.revision_count + 1}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    Sent {formatDate(quote.sent_at)}
                    {quote.booking?.customer_notes && (
                      <span>
                        {" "}· &ldquo;{quote.booking.customer_notes.slice(0, 40)}
                        {quote.booking.customer_notes.length > 40 ? "…" : ""}&rdquo;
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${style.className}`}
                >
                  {style.label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
