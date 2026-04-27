// =============================================================================
// MITASAFI: REAL-TIME BOOKING MESSAGES HOOK
// =============================================================================
// Client-side hook that provides real-time messaging for a single booking.
//
// ARCHITECTURE (mirrors useNotifications.ts):
//   1. On mount: fetch existing messages via API route
//   2. Subscribe to Supabase Realtime for INSERT/UPDATE events
//   3. On new message from OTHER party → add to state, call onMessage()
//   4. On update (is_read change) → update in state
//   5. Provides sendMessage() that POSTs to the API route
//   6. Provides markAsRead() for marking received messages as read
//
// Supabase Realtime RLS: the subscription is filtered by booking_id.
// RLS on booking_messages ensures only participants receive events.
// =============================================================================

"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import type { BookingMessage } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface UseBookingMessagesOptions {
  /** The booking to subscribe to. */
  bookingId: string;
  /** The current user's ID (to distinguish own vs. received messages). */
  currentUserId: string;
  /** Callback when a new message arrives from the OTHER party. */
  onMessage?: (message: BookingMessage) => void;
  /** Whether to auto-mark received messages as read on arrival. */
  autoMarkRead?: boolean;
  /** Number of messages to fetch initially. */
  limit?: number;
}

interface UseBookingMessagesReturn {
  /** Messages in chronological order (oldest first). */
  messages: BookingMessage[];
  /** Whether the initial fetch is loading. */
  isLoading: boolean;
  /** Whether Supabase Realtime is connected. */
  isConnected: boolean;
  /** Connection status label. */
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  /** Error message if any. */
  error: string | null;
  /** Whether there are older messages to load. */
  hasMore: boolean;
  /** Send a new message. Returns the created message on success. */
  sendMessage: (text: string) => Promise<BookingMessage | null>;
  /** Whether a send operation is in progress. */
  isSending: boolean;
  /** Load older messages (cursor-based pagination). */
  loadMore: () => Promise<void>;
  /** Whether a loadMore operation is in progress. */
  isLoadingMore: boolean;
  /** Mark all received messages in this booking as read. */
  markAsRead: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBookingMessages(
  options: UseBookingMessagesOptions
): UseBookingMessagesReturn {
  const {
    bookingId,
    currentUserId,
    onMessage,
    autoMarkRead = true,
    limit = 50,
  } = options;

  // ── State ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<UseBookingMessagesReturn["connectionStatus"]>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ── Refs (stable across renders) ──────────────────────────────────
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onMessageRef = useRef(onMessage);
  const supabase = useMemo(() => createClient(), []);

  // Keep callback ref up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // ── Fetch messages from API ───────────────────────────────────────
  const fetchMessages = useCallback(
    async (before?: string) => {
      const params = new URLSearchParams({
        limit: String(limit),
        markRead: String(autoMarkRead),
      });
      if (before) params.set("before", before);

      const res = await fetch(
        `/api/services/jobs/${bookingId}/messages?${params.toString()}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      return (await res.json()) as {
        messages: BookingMessage[];
        hasMore: boolean;
      };
    },
    [bookingId, limit, autoMarkRead]
  );

  // ── Send a message ────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string): Promise<BookingMessage | null> => {
      const trimmed = text.trim();
      if (!trimmed) return null;

      setIsSending(true);
      try {
        const res = await fetch(
          `/api/services/jobs/${bookingId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: trimmed }),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const { message } = (await res.json()) as { message: BookingMessage };

        // Optimistically add the message if Realtime hasn't delivered it yet.
        // Uses a Set-like dedup based on ID to prevent duplicates.
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        return message;
      } catch (err) {
        console.error("[useBookingMessages] Send error:", err);
        setError(err instanceof Error ? err.message : "Failed to send");
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [bookingId]
  );

  // ── Load older messages ───────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      // Oldest loaded message is at index 0 (chronological order)
      const oldestTimestamp = messages[0].created_at;
      const result = await fetchMessages(oldestTimestamp);

      // Prepend older messages (they arrive newest-first from API, so reverse)
      const olderMessages = [...result.messages].reverse();
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const deduped = olderMessages.filter((m) => !existingIds.has(m.id));
        return [...deduped, ...prev];
      });
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("[useBookingMessages] Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, messages, fetchMessages]);

  // ── Mark as read ──────────────────────────────────────────────────
  const markAsRead = useCallback(async () => {
    try {
      await fetch(
        `/api/services/jobs/${bookingId}/messages?markRead=true&limit=0`
      );
      // Optimistically update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id !== currentUserId && !m.is_read
            ? { ...m, is_read: true, read_at: new Date().toISOString() }
            : m
        )
      );
    } catch (err) {
      console.error("[useBookingMessages] Mark-read error:", err);
    }
  }, [bookingId, currentUserId]);

  // ── Initialize: fetch + subscribe ─────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setConnectionStatus("connecting");
      setIsLoading(true);

      try {
        // Fetch existing messages
        const result = await fetchMessages();

        if (!mounted) return;

        // API returns newest-first; reverse for chronological display
        setMessages([...result.messages].reverse());
        setHasMore(result.hasMore);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error("[useBookingMessages] Init fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        if (mounted) setIsLoading(false);
      }

      // Subscribe to realtime changes
      const channel = supabase
        .channel(`booking-messages-${bookingId}`)
        .on<BookingMessage>(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "booking_messages",
            filter: `booking_id=eq.${bookingId}`,
          },
          (payload: RealtimePostgresInsertPayload<BookingMessage>) => {
            if (!mounted) return;

            const newMsg = payload.new;

            // Deduplicate (optimistic add from sendMessage may have already placed it)
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // If message is from the other party, fire callback
            if (newMsg.sender_id !== currentUserId) {
              onMessageRef.current?.(newMsg);
            }
          }
        )
        .on<BookingMessage>(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "booking_messages",
            filter: `booking_id=eq.${bookingId}`,
          },
          (payload: RealtimePostgresUpdatePayload<BookingMessage>) => {
            if (!mounted) return;

            const updated = payload.new;
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            );
          }
        )
        .subscribe((status) => {
          if (!mounted) return;

          if (status === "SUBSCRIBED") {
            setIsConnected(true);
            setConnectionStatus("connected");
            setError(null);
          } else if (status === "CHANNEL_ERROR") {
            setIsConnected(false);
            setConnectionStatus("error");
            setError("Realtime connection error");
          } else if (status === "TIMED_OUT") {
            setIsConnected(false);
            setConnectionStatus("error");
            setError("Realtime connection timed out");
          } else if (status === "CLOSED") {
            setIsConnected(false);
            setConnectionStatus("disconnected");
          }
        });

      channelRef.current = channel;
    };

    initialize();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
    // Re-subscribe if bookingId changes
  }, [bookingId, currentUserId, supabase, fetchMessages]);

  return {
    messages,
    isLoading,
    isConnected,
    connectionStatus,
    error,
    hasMore,
    sendMessage,
    isSending,
    loadMore,
    isLoadingMore,
    markAsRead,
  };
}
