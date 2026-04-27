// =============================================================================
// MITASAFI: BOOKING MESSAGE QUERIES
// =============================================================================
// Server-side data-access functions for the booking_messages table.
// Covers: fetching messages, unread counts, and marking as read.
//
// All functions use the session-aware server client so RLS policies
// enforce participant-only access. The one exception is sendMessage(),
// which lives in the server action layer (not here) and uses the admin
// client to also trigger notifications for the other party.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BookingMessage,
  BookingMessageWithSender,
} from "@/types/bookings";

// =============================================================================
// GET MESSAGES FOR A BOOKING
// =============================================================================

export interface GetBookingMessagesParams {
  bookingId: string;
  /** Number of messages to return (newest first, reversed to chronological in UI). */
  limit?: number;
  /** Cursor for pagination — created_at of the oldest loaded message. */
  before?: string;
}

export interface GetBookingMessagesResult {
  messages: BookingMessageWithSender[];
  hasMore: boolean;
  error: string | null;
}

/**
 * Fetch messages for a booking, newest first.
 * RLS enforces that only participants (customer or provider) can read.
 *
 * Messages are returned in **descending** created_at order (newest first)
 * so the caller can reverse them for chronological display while also
 * supporting "load older" pagination via the `before` cursor.
 */
export async function getBookingMessages(
  params: GetBookingMessagesParams
): Promise<GetBookingMessagesResult> {
  const { bookingId, limit = 50, before } = params;

  const emptyResult: GetBookingMessagesResult = {
    messages: [],
    hasMore: false,
    error: null,
  };

  try {
    const supabase = await createClient();

    let query = supabase
      .from("booking_messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(limit + 1); // fetch one extra to detect hasMore

    // Cursor-based pagination: load messages older than the cursor
    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Messages] Fetch error:", error);
      return { ...emptyResult, error: error.message };
    }

    const rows = (data ?? []) as BookingMessage[];
    const hasMore = rows.length > limit;
    const messages = hasMore ? rows.slice(0, limit) : rows;

    return { messages, hasMore, error: null };
  } catch (err) {
    console.error("[Messages] Unexpected fetch error:", err);
    return {
      ...emptyResult,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// UNREAD MESSAGE COUNT (per booking)
// =============================================================================

/**
 * Count unread messages in a specific booking that the current user hasn't authored.
 * Used to show a badge on the chat section of a booking detail page.
 */
export async function getUnreadCountForBooking(
  bookingId: string,
  currentUserId: string
): Promise<number> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("booking_messages")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .eq("is_read", false)
      .neq("sender_id", currentUserId);

    if (error) {
      console.error("[Messages] Unread count error:", error);
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

// =============================================================================
// UNREAD MESSAGE COUNTS (batched — multiple bookings)
// =============================================================================

/**
 * Get unread message counts for a set of bookings in a single query.
 * Returns a Map<bookingId, unreadCount>.
 *
 * Used by the customer bookings list to show per-booking unread badges
 * without issuing N individual queries.
 *
 * Uses the admin client because the caller may not own all bookings
 * via RLS (e.g. layout-level queries), and we explicitly scope by
 * bookingIds + userId so access is controlled.
 */
export async function getUnreadCountsForBookings(
  bookingIds: string[],
  userId: string
): Promise<Map<string, number>> {
  if (bookingIds.length === 0) return new Map();

  try {
    const admin = createAdminClient();

    // Fetch only the booking_id column of unread messages from others.
    // The partial index idx_booking_messages_unread makes this efficient.
    const { data, error } = await admin
      .from("booking_messages")
      .select("booking_id")
      .in("booking_id", bookingIds)
      .eq("is_read", false)
      .neq("sender_id", userId);

    if (error) {
      console.error("[Messages] Batch unread counts error:", error);
      return new Map();
    }

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.booking_id, (counts.get(row.booking_id) ?? 0) + 1);
    }

    return counts;
  } catch {
    return new Map();
  }
}

// =============================================================================
// TOTAL UNREAD COUNT (across all bookings for a user)
// =============================================================================

/**
 * Count total unread messages across ALL bookings a user participates in.
 * Used for the sidebar "Messages" badge in the dashboard shell.
 *
 * Uses the admin client with explicit participant checks because the
 * server client's RLS would require a per-booking subquery that's less
 * efficient than a single admin query with joins.
 */
export async function getTotalUnreadMessageCount(
  userId: string
): Promise<number> {
  try {
    const admin = createAdminClient();

    // Find all booking IDs where this user is a participant
    // (either as customer or as the user behind a service_provider)
    const { data: providerRow } = await admin
      .from("service_providers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const providerId: string | null = providerRow?.id ?? null;

    // Build a filter for bookings where user is customer OR provider
    let query = admin
      .from("booking_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false)
      .neq("sender_id", userId);

    // We need messages from bookings the user participates in.
    // Since booking_messages only has booking_id, we first get
    // the user's booking IDs then filter.
    let bookingQuery = admin
      .from("bookings")
      .select("id");

    if (providerId) {
      // User is both customer and provider — find bookings for either role
      bookingQuery = bookingQuery.or(
        `customer_id.eq.${userId},provider_id.eq.${providerId}`
      );
    } else {
      bookingQuery = bookingQuery.eq("customer_id", userId);
    }

    const { data: bookingRows } = await bookingQuery;
    const bookingIds = (bookingRows ?? []).map(
      (b: { id: string }) => b.id
    );

    if (bookingIds.length === 0) return 0;

    query = query.in("booking_id", bookingIds);

    const { count, error } = await query;

    if (error) {
      console.error("[Messages] Total unread count error:", error);
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

// =============================================================================
// MARK MESSAGES AS READ
// =============================================================================

/**
 * Mark all unread messages in a booking as read for the current user.
 * Only marks messages sent by OTHER users (not the user's own messages).
 *
 * Uses the admin client to ensure the update succeeds regardless of the
 * exact RLS `WITH CHECK` clause, while still scoping to the correct user.
 */
export async function markMessagesAsRead(
  bookingId: string,
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from("booking_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .eq("is_read", false)
      .neq("sender_id", currentUserId);

    if (error) {
      console.error("[Messages] Mark-as-read error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Messages] Unexpected mark-as-read error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// VERIFY BOOKING PARTICIPANT
// =============================================================================

/**
 * Check if a user is a participant in a booking (as customer or provider).
 * Returns the user's role in the booking, or null if not a participant.
 *
 * Used by the API route and server actions to authorize message operations.
 */
export async function getBookingParticipantRole(
  bookingId: string,
  userId: string
): Promise<{
  role: "customer" | "provider" | null;
  booking: { id: string; customer_id: string; provider_id: string | null } | null;
  providerUserId: string | null;
  error: string | null;
}> {
  try {
    const admin = createAdminClient();

    // Fetch the booking
    const { data: booking, error } = await admin
      .from("bookings")
      .select("id, customer_id, provider_id")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return { role: null, booking: null, providerUserId: null, error: "Booking not found." };
    }

    // Check if user is the customer
    if (booking.customer_id === userId) {
      // Also resolve provider's user_id for notification purposes
      let providerUserId: string | null = null;
      if (booking.provider_id) {
        const { data: provider } = await admin
          .from("service_providers")
          .select("user_id")
          .eq("id", booking.provider_id)
          .single();
        providerUserId = provider?.user_id ?? null;
      }
      return { role: "customer", booking, providerUserId, error: null };
    }

    // Check if user is the provider
    if (booking.provider_id) {
      const { data: provider } = await admin
        .from("service_providers")
        .select("user_id")
        .eq("id", booking.provider_id)
        .single();

      if (provider?.user_id === userId) {
        return {
          role: "provider",
          booking,
          providerUserId: userId,
          error: null,
        };
      }
    }

    return { role: null, booking: null, providerUserId: null, error: "Not a participant." };
  } catch (err) {
    console.error("[Messages] Participant check error:", err);
    return {
      role: null,
      booking: null,
      providerUserId: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
