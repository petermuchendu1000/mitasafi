// =============================================================================
// MITASAFI: QUOTE QUERIES
// =============================================================================
// Server-side data-access functions for the booking_quotes table.
// Uses createClient() for RLS-respecting reads, createAdminClient() for writes.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingQuote, QuoteWithDetails } from "@/types/bookings";

// =============================================================================
// GET QUOTES FOR A BOOKING
// =============================================================================

/**
 * Fetch all quotes for a specific booking.
 * Returns quotes ordered by creation time (newest first).
 * Caller must be the booking's customer or the assigned provider.
 */
export async function getQuotesByBookingId(
  bookingId: string
): Promise<{ quotes: BookingQuote[]; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("booking_quotes")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Quotes] getQuotesByBookingId error:", error);
      return { quotes: [], error: error.message };
    }

    return { quotes: (data ?? []) as BookingQuote[], error: null };
  } catch (err) {
    console.error("[Quotes] getQuotesByBookingId unexpected error:", err);
    return {
      quotes: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET ACTIVE QUOTE FOR A BOOKING
// =============================================================================

/**
 * Fetch the current (non-superseded) quote for a booking.
 * Returns null if no active quote exists.
 */
export async function getActiveQuoteForBooking(
  bookingId: string
): Promise<{ quote: BookingQuote | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("booking_quotes")
      .select("*")
      .eq("booking_id", bookingId)
      .is("superseded_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Quotes] getActiveQuoteForBooking error:", error);
      return { quote: null, error: error.message };
    }

    return { quote: data as BookingQuote | null, error: null };
  } catch (err) {
    console.error("[Quotes] getActiveQuoteForBooking unexpected error:", err);
    return {
      quote: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET SINGLE QUOTE BY ID
// =============================================================================

export async function getQuoteById(
  quoteId: string
): Promise<{ quote: BookingQuote | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("booking_quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (error) {
      console.error("[Quotes] getQuoteById error:", error);
      return { quote: null, error: error.message };
    }

    return { quote: data as BookingQuote | null, error: null };
  } catch (err) {
    console.error("[Quotes] getQuoteById unexpected error:", err);
    return {
      quote: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET PROVIDER'S QUOTES (for /dashboard/provider/quotes list)
// =============================================================================

export interface GetProviderQuotesParams {
  providerId: string;
  status?: string | string[];
  page?: number;
  pageSize?: number;
}

export interface GetProviderQuotesResult {
  quotes: QuoteWithDetails[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  error: string | null;
}

/**
 * Fetch all quotes created by a provider, with booking + service + customer.
 * Used by the provider's quotes list dashboard page.
 */
export async function getProviderQuotes(
  params: GetProviderQuotesParams
): Promise<GetProviderQuotesResult> {
  const { providerId, status, page = 1, pageSize = 10 } = params;
  const offset = (page - 1) * pageSize;

  const emptyResult: GetProviderQuotesResult = {
    quotes: [],
    pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
    error: null,
  };

  try {
    const supabase = await createClient();

    let query = supabase
      .from("booking_quotes")
      .select(
        `
        *,
        booking:bookings!booking_id (
          id,
          customer_id,
          status,
          service_id,
          customer_notes,
          created_at
        )
        `,
        { count: "exact" }
      )
      .eq("provider_id", providerId)
      .is("superseded_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (status) {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          query = query.in("status", status);
        }
      } else {
        query = query.eq("status", status);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Quotes] getProviderQuotes error:", error);
      return { ...emptyResult, error: error.message };
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      quotes: (data ?? []) as QuoteWithDetails[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
      error: null,
    };
  } catch (err) {
    console.error("[Quotes] getProviderQuotes unexpected error:", err);
    return {
      ...emptyResult,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET PROVIDER QUOTE COUNTS (for dashboard badges)
// =============================================================================

export interface QuoteCounts {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

export async function getProviderQuoteCounts(
  providerId: string
): Promise<QuoteCounts> {
  try {
    const supabase = await createClient();

    const [totalResult, pendingResult, acceptedResult, rejectedResult] =
      await Promise.all([
        supabase
          .from("booking_quotes")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .is("superseded_at", null),
        supabase
          .from("booking_quotes")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .eq("status", "sent")
          .is("superseded_at", null),
        supabase
          .from("booking_quotes")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .eq("status", "accepted")
          .is("superseded_at", null),
        supabase
          .from("booking_quotes")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .eq("status", "rejected")
          .is("superseded_at", null),
      ]);

    return {
      total: totalResult.count ?? 0,
      pending: pendingResult.count ?? 0,
      accepted: acceptedResult.count ?? 0,
      rejected: rejectedResult.count ?? 0,
    };
  } catch {
    return { total: 0, pending: 0, accepted: 0, rejected: 0 };
  }
}

// =============================================================================
// MARK QUOTE AS VIEWED (customer opened the quote)
// =============================================================================

/**
 * Mark a quote as viewed (sets viewed_at timestamp and status to 'viewed').
 * Only updates if the quote hasn't been viewed yet.
 * Uses admin client because the customer viewing may not have write RLS.
 */
export async function markQuoteAsViewed(
  quoteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from("booking_quotes")
      .update({
        status: "viewed",
        viewed_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("status", "sent")       // Only update if still in 'sent' status
      .is("viewed_at", null);     // Only update if not already viewed

    if (error) {
      console.error("[Quotes] markQuoteAsViewed error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Quotes] markQuoteAsViewed unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
