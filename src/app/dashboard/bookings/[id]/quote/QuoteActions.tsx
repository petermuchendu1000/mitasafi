/**
 * Quote Actions (Client Component)
 *
 * Accept / Reject buttons for the customer's quote view page.
 * Reject includes a reason textarea.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { acceptQuote, rejectQuote } from "./actions";

// =============================================================================
// TYPES
// =============================================================================

interface QuoteActionsProps {
  bookingId: string;
  quoteId: string;
  quotedPrice: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function QuoteActions({
  bookingId,
  quoteId,
  quotedPrice,
}: QuoteActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptQuote(bookingId, quoteId);
      if (!result.success) {
        setError(result.error ?? "Failed to accept quote.");
      } else {
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectQuote(bookingId, quoteId, rejectReason.trim());
      if (!result.success) {
        setError(result.error ?? "Failed to decline quote.");
      } else {
        setShowRejectDialog(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      {!showRejectDialog && (
        <div className="flex gap-3">
          {/* Accept */}
          <button
            onClick={handleAccept}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Accept Quote
            <span className="text-teal-200 ml-1">
              · KES {quotedPrice.toLocaleString()}
            </span>
          </button>

          {/* Decline */}
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Decline</span>
          </button>
        </div>
      )}

      {/* Reject dialog */}
      {showRejectDialog && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Decline this quote?
          </h3>
          <p className="text-sm text-gray-500">
            Let the provider know why so they can send a revised quote if
            possible.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Price is too high, I need fewer services, timing doesn't work…"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm Decline"
              )}
            </button>
            <button
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason("");
                setError(null);
              }}
              disabled={isPending}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
