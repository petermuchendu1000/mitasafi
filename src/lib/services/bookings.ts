// =============================================================================
// MITASAFI: BOOKING QUERIES
// =============================================================================
// Server-side data-access functions for the bookings table.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  Booking,
  BookingMedia,
  BookingQuote,
  BookingStatus,
  BookingWithDetails,
  BookingStatusHistory,
} from "@/types/bookings";

// =============================================================================
// GET CUSTOMER BOOKINGS (paginated)
// =============================================================================

export interface GetCustomerBookingsParams {
  customerId: string;
  /** Single status string, array of statuses, or undefined for all. */
  status?: string | string[];
  page?: number;
  pageSize?: number;
}

export interface GetCustomerBookingsResult {
  bookings: BookingWithDetails[];
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
 * Fetch all bookings for a customer with optional status filter.
 * Joins service name and provider details for display.
 */
export async function getCustomerBookings(
  params: GetCustomerBookingsParams
): Promise<GetCustomerBookingsResult> {
  const { customerId, status, page = 1, pageSize = 10 } = params;
  const offset = (page - 1) * pageSize;

  const emptyResult: GetCustomerBookingsResult = {
    bookings: [],
    pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
    error: null,
  };

  try {
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        service:services!service_id (
          id,
          name,
          description
        ),
        provider:service_providers!provider_id (
          id,
          business_name,
          profile_photo_url,
          phone,
          average_rating
        )
        `,
        { count: "exact" }
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Optional status filter
    if (status) {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          query = query.in("status", status as BookingStatus[]);
        }
      } else if (status !== "all") {
        query = query.eq("status", status as BookingStatus);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Bookings] getCustomerBookings error:", error);
      return { ...emptyResult, error: error.message };
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      bookings: (data ?? []) as BookingWithDetails[],
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
    console.error("[Bookings] getCustomerBookings unexpected error:", err);
    return {
      ...emptyResult,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET SINGLE BOOKING BY ID
// =============================================================================

export interface GetBookingByIdResult {
  booking: BookingWithDetails | null;
  error: string | null;
}

/**
 * Fetch a single booking with service + provider + status history.
 * Only returns if the caller is the customer or the assigned provider.
 */
export async function getBookingById(
  bookingId: string,
  userId: string
): Promise<GetBookingByIdResult> {
  try {
    const supabase = await createClient();

    // Fetch booking with joins
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        service:services!service_id (
          id,
          name,
          description
        ),
        provider:service_providers!provider_id (
          id,
          business_name,
          profile_photo_url,
          phone,
          average_rating
        )
        `
      )
      .eq("id", bookingId)
      .single();

    if (error) {
      console.error("[Bookings] getBookingById error:", error);
      return { booking: null, error: error.message };
    }

    if (!booking) {
      return { booking: null, error: "Booking not found" };
    }

    // Authorization: caller must be the customer or the assigned provider's user
    const isCustomer = booking.customer_id === userId;

    // Check provider access: look up provider record for this user
    let isProvider = false;
    if (!isCustomer && booking.provider_id) {
      const { data: providerRecord } = await supabase
        .from("service_providers")
        .select("user_id")
        .eq("id", booking.provider_id)
        .single();

      isProvider = providerRecord?.user_id === userId;
    }

    if (!isCustomer && !isProvider) {
      return { booking: null, error: "Unauthorized" };
    }

    // Fetch status history + media in parallel
    const [{ data: history }, { data: media }] = await Promise.all([
      supabase
        .from("booking_status_history")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("booking_media")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true }),
    ]);

    const result = {
      ...booking,
      status_history: (history ?? []) as BookingStatusHistory[],
      media: (media ?? []) as BookingMedia[],
    } as BookingWithDetails;

    return { booking: result, error: null };
  } catch (err) {
    console.error("[Bookings] getBookingById unexpected error:", err);
    return {
      booking: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// GET CUSTOMER BOOKING COUNTS (for dashboard badges)
// =============================================================================

export interface BookingCounts {
  total: number;
  active: number;
  completed: number;
}

export async function getCustomerBookingCounts(
  customerId: string
): Promise<BookingCounts> {
  try {
    const supabase = await createClient();

    const [totalResult, activeResult, completedResult] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .in("status", [
          "submitted",
          "provider_viewed",
          "quote_pending",
          "quote_sent",
          "quote_accepted",
          "confirmed",
          "scheduled",
          "in_progress",
          "partially_completed",
          "requires_followup",
          "rework_required",
        ]),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .in("status", ["completed", "customer_confirmed"]),
    ]);

    return {
      total: totalResult.count ?? 0,
      active: activeResult.count ?? 0,
      completed: completedResult.count ?? 0,
    };
  } catch {
    return { total: 0, active: 0, completed: 0 };
  }
}

// =============================================================================
// PROVIDER BOOKING QUERIES (M2/M3)
// =============================================================================

export interface GetProviderBookingsParams {
  providerId: string;
  /** Single status string, array of statuses, or undefined for all. */
  status?: string | string[];
  page?: number;
  pageSize?: number;
}

export interface GetProviderBookingsResult {
  bookings: BookingWithDetails[];
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
 * Fetch all bookings assigned to a provider with optional status filter.
 * Joins service name and customer details for display.
 */
export async function getProviderBookings(
  params: GetProviderBookingsParams
): Promise<GetProviderBookingsResult> {
  const { providerId, status, page = 1, pageSize = 10 } = params;
  const offset = (page - 1) * pageSize;

  const emptyResult: GetProviderBookingsResult = {
    bookings: [],
    pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false },
    error: null,
  };

  try {
    const supabase = await createClient();

    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        service:services!service_id (
          id,
          name,
          description
        ),
        customer:profiles!customer_id (
          full_name
        )
        `,
        { count: "exact" }
      )
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Optional status filter
    if (status) {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          query = query.in("status", status as BookingStatus[]);
        }
      } else if (status !== "all") {
        query = query.eq("status", status as BookingStatus);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Bookings] getProviderBookings error:", error);
      return { ...emptyResult, error: error.message };
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      bookings: (data ?? []) as BookingWithDetails[],
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
    console.error("[Bookings] getProviderBookings unexpected error:", err);
    return {
      ...emptyResult,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// PROVIDER BOOKING COUNTS
// =============================================================================

export interface ProviderBookingCounts {
  total: number;
  pending: number;
  active: number;
  quoting: number;
  completed: number;
}

/**
 * Get count of bookings in each lifecycle stage for a provider.
 * Used for dashboard badges and tab counts.
 */
export async function getProviderBookingCounts(
  providerId: string
): Promise<ProviderBookingCounts> {
  try {
    const supabase = await createClient();

    const [totalResult, pendingResult, activeResult, quotingResult, completedResult] =
      await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .in("status", ["submitted", "provider_viewed"]),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .in("status", [
            "confirmed",
            "scheduled",
            "in_progress",
            "partially_completed",
            "requires_followup",
            "rework_required",
          ]),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .in("status", [
            "quote_pending",
            "quote_sent",
            "quote_accepted",
            "quote_rejected",
          ]),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", providerId)
          .in("status", ["completed", "customer_confirmed"]),
      ]);

    return {
      total: totalResult.count ?? 0,
      pending: pendingResult.count ?? 0,
      active: activeResult.count ?? 0,
      quoting: quotingResult.count ?? 0,
      completed: completedResult.count ?? 0,
    };
  } catch {
    return { total: 0, pending: 0, active: 0, quoting: 0, completed: 0 };
  }
}

// =============================================================================
// GET BOOKING WITH QUOTES (for detail pages)
// =============================================================================

/**
 * Fetch a single booking with its active quote(s) included.
 * Used by both customer and provider detail pages to show quote state.
 */
export async function getBookingWithQuotes(
  bookingId: string,
  userId: string
): Promise<GetBookingByIdResult> {
  // First get the booking (which now supports both customer and provider access)
  const result = await getBookingById(bookingId, userId);

  if (!result.booking || result.error) {
    return result;
  }

  // Fetch active quotes for this booking
  try {
    const supabase = await createClient();

    const { data: quotes } = await supabase
      .from("booking_quotes")
      .select("*")
      .eq("booking_id", bookingId)
      .is("superseded_at", null)
      .order("created_at", { ascending: false });

    result.booking.quotes = (quotes ?? []) as BookingQuote[];
  } catch (err) {
    console.error("[Bookings] getBookingWithQuotes quote fetch error:", err);
    // Non-blocking — return booking even if quote fetch fails
    result.booking.quotes = [];
  }

  return result;
}

// =============================================================================
// GET PROVIDER SCHEDULED BOOKINGS (for calendar view)
// =============================================================================

export interface CalendarBooking {
  id: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: string;
  customer_notes: string | null;
  service: {
    id: string;
    name: string;
  } | null;
  customer_name: string | null;
}

/**
 * Fetch bookings for a provider within a date range that have a scheduled_start.
 * Used by the calendar view.
 */
export async function getProviderScheduledBookings(
  providerId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<{ bookings: CalendarBooking[]; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        scheduled_start,
        scheduled_end,
        status,
        customer_notes,
        service:services!service_id ( id, name )
        `
      )
      .eq("provider_id", providerId)
      .not("scheduled_start", "is", null)
      .gte("scheduled_start", rangeStart)
      .lte("scheduled_start", rangeEnd)
      .in("status", [
        "confirmed",
        "scheduled",
        "in_progress",
        "partially_completed",
        "requires_followup",
        "rework_required",
        "completed",
        "customer_confirmed",
      ])
      .order("scheduled_start", { ascending: true });

    if (error) {
      console.error("[Bookings] getProviderScheduledBookings error:", error);
      return { bookings: [], error: error.message };
    }

    return { bookings: (data ?? []) as CalendarBooking[], error: null };
  } catch (err) {
    console.error("[Bookings] getProviderScheduledBookings unexpected:", err);
    return {
      bookings: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
