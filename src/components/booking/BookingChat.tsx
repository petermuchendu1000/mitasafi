// =============================================================================
// MITASAFI: BOOKING CHAT COMPONENT
// =============================================================================
// Top-level client component that wires together:
//   - useBookingMessages (realtime hook)
//   - ChatThread (display)
//   - MessageInput (input)
//
// Intended to be embedded in both the provider job detail page and
// the customer booking detail page. The parent passes bookingId,
// currentUserId, and BookingStatus — this component handles everything else.
// =============================================================================

"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Wifi, WifiOff } from "lucide-react";
import { useBookingMessages } from "@/hooks/useBookingMessages";
import { ChatThread } from "./ChatThread";
import { MessageInput } from "./MessageInput";
import type { BookingStatus } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface BookingChatProps {
  /** The booking ID to load messages for. */
  bookingId: string;
  /** The current authenticated user's ID. */
  currentUserId: string;
  /** Current booking status — determines if messaging is allowed. */
  bookingStatus: BookingStatus;
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

/**
 * Booking statuses that allow sending new messages.
 * Cancelled / disputed / resolved bookings are read-only.
 */
const MESSAGING_ALLOWED_STATUSES: Set<BookingStatus> = new Set([
  "submitted",
  "provider_viewed",
  "quote_pending",
  "quote_sent",
  "quote_accepted",
  "quote_rejected",
  "confirmed",
  "in_progress",
  "completed",
  "customer_confirmed",
]);

function isMessagingAllowed(status: BookingStatus): boolean {
  return MESSAGING_ALLOWED_STATUSES.has(status);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BookingChat({
  bookingId,
  currentUserId,
  bookingStatus,
}: BookingChatProps) {
  const {
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
  } = useBookingMessages({
    bookingId,
    currentUserId,
    autoMarkRead: true,
  });

  const canSend = isMessagingAllowed(bookingStatus);

  const handleSend = useCallback(
    async (text: string) => {
      await sendMessage(text);
    },
    [sendMessage]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-gray-900">Messages</h3>
          {messages.length > 0 && (
            <span className="text-xs text-gray-400">
              ({messages.length})
            </span>
          )}
        </div>
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          {connectionStatus === "connected" ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] text-green-600 font-medium">
                Live
              </span>
            </>
          ) : connectionStatus === "connecting" ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
              <span className="text-[10px] text-yellow-600 font-medium">
                Connecting…
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] text-gray-400 font-medium">
                Offline
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && !isLoading && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Chat thread — fixed height with scroll */}
      <div
        className={cn(
          "flex flex-col",
          // Responsive height: compact on mobile, taller on desktop
          "h-[320px] sm:h-[400px]"
        )}
      >
        <ChatThread
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoading}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
        />
      </div>

      {/* Message input */}
      {canSend ? (
        <MessageInput onSend={handleSend} isSending={isSending} />
      ) : (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Messaging is closed for this booking.
          </p>
        </div>
      )}
    </div>
  );
}
