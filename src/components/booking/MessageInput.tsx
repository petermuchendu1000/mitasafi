// =============================================================================
// MITASAFI: MESSAGE INPUT COMPONENT
// =============================================================================
// Text input with send button for the booking chat.
// Handles Enter key, character count, disabled state, and focus management.
// =============================================================================

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, Loader2 } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface MessageInputProps {
  /** Called when the user submits a message. */
  onSend: (text: string) => Promise<void>;
  /** Whether a send operation is in progress. */
  isSending: boolean;
  /** Whether the input should be disabled (e.g. for cancelled bookings). */
  disabled?: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** Maximum characters allowed. */
  maxLength?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MessageInput({
  onSend,
  isSending,
  disabled = false,
  placeholder = "Type a message…",
  maxLength = 5000,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = text.trim();
  const isEmpty = trimmed.length === 0;
  const isOverLimit = trimmed.length > maxLength;
  const canSend = !isEmpty && !isOverLimit && !isSending && !disabled;

  // Auto-resize textarea based on content
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // Cap at ~6 lines (approx 144px)
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const messageText = trimmed;
    setText("");
    await onSend(messageText);
    // Re-focus the input after sending
    textareaRef.current?.focus();
  }, [canSend, trimmed, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends (without Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="flex items-end gap-2 p-3 sm:p-4">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Messaging is not available" : placeholder}
            disabled={disabled || isSending}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border px-4 py-2.5 text-sm",
              "placeholder:text-gray-400 focus:outline-none focus:ring-2",
              "transition-colors",
              disabled
                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-50 border-gray-200 text-gray-900 focus:ring-brand-500 focus:border-brand-500",
              isOverLimit && "border-red-300 focus:ring-red-500"
            )}
            aria-label="Message input"
          />
          {/* Character count (shown near limit) */}
          {trimmed.length > maxLength * 0.9 && (
            <span
              className={cn(
                "absolute bottom-1 right-3 text-[10px]",
                isOverLimit ? "text-red-500" : "text-gray-400"
              )}
            >
              {trimmed.length}/{maxLength}
            </span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
            "transition-all duration-150",
            canSend
              ? "bg-brand-600 text-white hover:bg-brand-700 active:scale-95 shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
