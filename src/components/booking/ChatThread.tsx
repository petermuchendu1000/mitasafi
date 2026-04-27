// =============================================================================
// MITASAFI: CHAT THREAD COMPONENT
// =============================================================================
// Pure display component for a chronological list of booking messages.
// Renders sender avatars, message bubbles, timestamps, and read receipts.
// The parent controls the message array and scroll behavior.
// =============================================================================

"use client";

import { useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import type { BookingMessage } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface ChatThreadProps {
  /** Messages in chronological order (oldest first). */
  messages: BookingMessage[];
  /** The current user's ID — determines left/right alignment. */
  currentUserId: string;
  /** Whether the initial message fetch is loading. */
  isLoading: boolean;
  /** Whether there are older messages available. */
  hasMore: boolean;
  /** Whether older messages are currently loading. */
  isLoadingMore: boolean;
  /** Called when the user scrolls to the top to load older messages. */
  onLoadMore?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format a message timestamp for display.
 * Shows time only for today, date + time otherwise.
 */
function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Determine if a date separator should be shown between two messages.
 */
function shouldShowDateSeparator(
  prevIso: string | null,
  currentIso: string
): boolean {
  if (!prevIso) return true;
  const prev = new Date(prevIso);
  const curr = new Date(currentIso);
  return (
    prev.getDate() !== curr.getDate() ||
    prev.getMonth() !== curr.getMonth() ||
    prev.getFullYear() !== curr.getFullYear()
  );
}

function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return "Today";
  }

  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// =============================================================================
// MESSAGE BUBBLE (memoized to avoid re-renders on scroll)
// =============================================================================

const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
}: {
  message: BookingMessage;
  isOwn: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm",
          isOwn
            ? "bg-brand-600 text-white rounded-br-md"
            : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
        )}
      >
        {/* Sender role badge (only for received messages) */}
        {!isOwn && (
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider mb-0.5",
              "text-gray-400"
            )}
          >
            {message.sender_role === "provider" ? "Provider" : "Customer"}
          </p>
        )}

        {/* Message text */}
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {message.message}
        </p>

        {/* Timestamp + read receipt */}
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span
            className={cn(
              "text-[10px]",
              isOwn ? "text-white/60" : "text-gray-400"
            )}
          >
            {formatMessageTime(message.created_at)}
          </span>
          {isOwn && (
            message.is_read ? (
              <CheckCheck
                className="w-3.5 h-3.5 text-white/70"
                aria-label="Read"
              />
            ) : (
              <Check
                className="w-3.5 h-3.5 text-white/50"
                aria-label="Sent"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ChatThread({
  messages,
  currentUserId,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect scroll to top for loading more
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasMore || !onLoadMore) return;

    const handleScroll = () => {
      if (container.scrollTop < 60 && !isLoadingMore) {
        onLoadMore();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoadingMore, onLoadMore]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <p className="text-xs text-gray-400">Loading messages…</p>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-sm text-gray-500">No messages yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Start the conversation below
          </p>
        </div>
      </div>
    );
  }

  // ── Message list ──
  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
    >
      {/* Load more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        </div>
      )}

      {hasMore && !isLoadingMore && (
        <button
          onClick={onLoadMore}
          className="w-full text-center py-2 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          Load older messages
        </button>
      )}

      {/* Messages */}
      {messages.map((msg, idx) => {
        const prevIso = idx > 0 ? messages[idx - 1].created_at : null;
        const showSeparator = shouldShowDateSeparator(
          prevIso,
          msg.created_at
        );
        const isOwn = msg.sender_id === currentUserId;

        return (
          <div key={msg.id}>
            {showSeparator && (
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  {formatDateSeparator(msg.created_at)}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}
            <MessageBubble message={msg} isOwn={isOwn} />
          </div>
        );
      })}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
