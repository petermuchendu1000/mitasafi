/**
 * Job Action Buttons (Client Component)
 *
 * Context-sensitive action buttons for the provider job detail page.
 *
 * PRE-M5 (Quote Negotiation Phase):
 * - submitted/provider_viewed → Accept Job, Send Quote, Decline
 * - quote_pending/quote_rejected → Send Quote, Decline
 * - quote_sent → Awaiting response (no actions)
 * - quote_accepted → Confirm Booking
 *
 * M5 (Job Lifecycle Phase):
 * - confirmed → Schedule Job, Start Job, Cancel
 * - scheduled → Start Job, Cancel
 * - in_progress → Mark Complete
 * - partially_completed → Mark Complete, Needs Follow-up
 * - requires_followup → Schedule Follow-up, Start Work
 * - rework_required → Schedule Rework, Start Rework
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Play,
  X,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/ui";
import {
  acceptBooking,
  rejectBooking,
  confirmBookingAfterQuote,
} from "./actions";
import {
  startJob,
  completeJob,
  cancelBookingAsProvider,
} from "@/lib/services/booking-lifecycle";
import { PROVIDER_LIFECYCLE_TRANSITIONS } from "@/lib/constants/booking";
import type { BookingStatus } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface JobActionButtonsProps {
  bookingId: string;
  bookingStatus: string;
  hasActiveQuote: boolean;
  quotedPrice: number | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Statuses still in the quote-negotiation phase (pre-M5). */
const NEGOTIATION_STATUSES = new Set([
  "submitted",
  "provider_viewed",
  "quote_pending",
  "quote_rejected",
  "quote_sent",
  "quote_accepted",
]);

/** Terminal states — no actions possible. */
const TERMINAL_STATUSES = new Set([
  "customer_confirmed",
  "cancelled_customer",
  "cancelled_provider",
  "resolved",
  "abandoned",
  "needs_reassignment",
]);

// =============================================================================
// ICON MAP (for lifecycle buttons)
// =============================================================================

const LIFECYCLE_ICONS: Partial<Record<BookingStatus, React.ReactNode>> = {
  scheduled: <Calendar className="w-4 h-4" />,
  in_progress: <Play className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  cancelled_provider: <XCircle className="w-4 h-4" />,
  requires_followup: <Calendar className="w-4 h-4" />,
};

/** Map variant → Tailwind classes */
const VARIANT_CLASSES = {
  primary:
    "bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-white border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed",
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function JobActionButtons({
  bookingId,
  bookingStatus,
  hasActiveQuote,
  quotedPrice,
}: JobActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  // ── Pre-M5 Handlers ──────────────────────────────────────────────────────

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptBooking(bookingId);
      if (!result.success) {
        setError(result.error ?? "Failed to accept booking.");
      } else {
        showSuccess("Job Accepted");
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setError("Please provide a reason for declining.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectBooking(bookingId, rejectReason.trim());
      if (!result.success) {
        setError(result.error ?? "Failed to decline booking.");
      } else {
        setShowRejectDialog(false);
        router.refresh();
      }
    });
  };

  const handleConfirmAfterQuote = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmBookingAfterQuote(bookingId);
      if (!result.success) {
        setError(result.error ?? "Failed to confirm booking.");
      } else {
        showSuccess("Booking Confirmed");
        router.refresh();
      }
    });
  };

  // ── M5 Lifecycle Handlers ─────────────────────────────────────────────────

  const handleStartJob = () => {
    setError(null);
    startTransition(async () => {
      const result = await startJob(bookingId);
      if (result.success) {
        showSuccess("Job Started", "The customer has been notified.");
        router.refresh();
      } else {
        showError("Start Failed", result.error || "Something went wrong.");
        setError(result.error || "Failed to start job.");
      }
    });
  };

  const handleCompleteJob = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeJob(bookingId);
      if (result.success) {
        showSuccess("Job Completed", "Pending customer confirmation.");
        router.refresh();
      } else {
        showError("Complete Failed", result.error || "Something went wrong.");
        setError(result.error || "Failed to complete job.");
      }
    });
  };

  const handleCancelAsProvider = () => {
    if (!cancelReason.trim()) {
      setError("Please provide a reason for cancellation.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAsProvider(bookingId, cancelReason.trim());
      if (result.success) {
        showSuccess("Job Cancelled");
        setShowCancelDialog(false);
        router.refresh();
      } else {
        showError("Cancel Failed", result.error || "Something went wrong.");
        setError(result.error || "Failed to cancel job.");
      }
    });
  };

  // ── Lifecycle Action Dispatch ─────────────────────────────────────────────

  /** Dispatch a lifecycle button click to the right handler or navigation. */
  const dispatchLifecycleAction = (toStatus: BookingStatus) => {
    switch (toStatus) {
      case "scheduled":
        // Navigate to the schedule page
        router.push(`/dashboard/provider/jobs/${bookingId}/schedule`);
        break;
      case "in_progress":
        handleStartJob();
        break;
      case "completed":
        handleCompleteJob();
        break;
      case "cancelled_provider":
        setShowCancelDialog(true);
        break;
      case "requires_followup":
        // Needs followup = partially completed + needs re-schedule
        // For now, same as complete but the status is different
        // This is handled server-side — mark partially completed first
        router.push(`/dashboard/provider/jobs/${bookingId}/schedule`);
        break;
      default:
        break;
    }
  };

  // ── Render Logic ──────────────────────────────────────────────────────────

  // Terminal states → no actions
  if (TERMINAL_STATUSES.has(bookingStatus)) {
    return null;
  }

  const status = bookingStatus as BookingStatus;

  // Pre-M5 negotiation phase
  if (NEGOTIATION_STATUSES.has(bookingStatus)) {
    return (
      <NegotiationActions
        bookingId={bookingId}
        bookingStatus={bookingStatus}
        hasActiveQuote={hasActiveQuote}
        quotedPrice={quotedPrice}
        isPending={isPending}
        error={error}
        showRejectDialog={showRejectDialog}
        rejectReason={rejectReason}
        onAccept={handleAccept}
        onConfirmAfterQuote={handleConfirmAfterQuote}
        onReject={handleReject}
        setShowRejectDialog={setShowRejectDialog}
        setRejectReason={setRejectReason}
        setError={setError}
      />
    );
  }

  // M5 lifecycle phase
  const transitions = PROVIDER_LIFECYCLE_TRANSITIONS[status];
  if (!transitions || transitions.length === 0) {
    // Completed, waiting on customer — show info banner
    if (bookingStatus === "completed") {
      return (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-amber-700">
            Job completed — awaiting customer confirmation
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Lifecycle action buttons */}
      <div className="flex gap-3">
        {transitions.map((t) => (
          <button
            key={t.toStatus}
            onClick={() => dispatchLifecycleAction(t.toStatus)}
            disabled={isPending}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${VARIANT_CLASSES[t.variant]}`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              LIFECYCLE_ICONS[t.toStatus] ?? <Check className="w-4 h-4" />
            )}
            {t.label}
          </button>
        ))}
      </div>

      {/* Cancel dialog */}
      {showCancelDialog && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Cancel this job?
          </h3>
          <p className="text-sm text-gray-500">
            Please provide a reason for the customer.
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g., Equipment unavailable, scheduling conflict, etc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleCancelAsProvider}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm Cancel"
              )}
            </button>
            <button
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
                setError(null);
              }}
              disabled={isPending}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// NEGOTIATION ACTIONS (Pre-M5 — extracted for clarity)
// =============================================================================

interface NegotiationActionsProps {
  bookingId: string;
  bookingStatus: string;
  hasActiveQuote: boolean;
  quotedPrice: number | null;
  isPending: boolean;
  error: string | null;
  showRejectDialog: boolean;
  rejectReason: string;
  onAccept: () => void;
  onConfirmAfterQuote: () => void;
  onReject: () => void;
  setShowRejectDialog: (v: boolean) => void;
  setRejectReason: (v: string) => void;
  setError: (v: string | null) => void;
}

function NegotiationActions({
  bookingId,
  bookingStatus,
  hasActiveQuote,
  quotedPrice,
  isPending,
  error,
  showRejectDialog,
  rejectReason,
  onAccept,
  onConfirmAfterQuote,
  onReject,
  setShowRejectDialog,
  setRejectReason,
  setError,
}: NegotiationActionsProps) {
  const canAcceptDirectly = ["submitted", "provider_viewed"].includes(bookingStatus);
  const canSendQuote = [
    "submitted",
    "provider_viewed",
    "quote_pending",
    "quote_rejected",
  ].includes(bookingStatus);
  const canDecline = [
    "submitted",
    "provider_viewed",
    "quote_pending",
    "quote_rejected",
  ].includes(bookingStatus);
  const isAwaitingQuoteResponse = bookingStatus === "quote_sent";
  const canConfirmAfterQuote = bookingStatus === "quote_accepted";

  return (
    <div className="space-y-3">
      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Awaiting response message */}
      {isAwaitingQuoteResponse && (
        <div className="rounded-xl bg-purple-50 border border-purple-200 px-5 py-4 text-center">
          <FileText className="w-5 h-5 text-purple-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-purple-700">
            Quote sent — awaiting customer response
          </p>
          {quotedPrice && (
            <p className="text-xs text-purple-500 mt-1">
              KES {quotedPrice.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Confirm after quote accepted */}
      {canConfirmAfterQuote && (
        <button
          onClick={onConfirmAfterQuote}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Confirm Booking
          {quotedPrice && (
            <span className="text-teal-200 ml-1">
              · KES {quotedPrice.toLocaleString()}
            </span>
          )}
        </button>
      )}

      {/* Action buttons row */}
      {(canAcceptDirectly || canSendQuote || canDecline) && (
        <div className="flex gap-3">
          {/* Accept directly (for fixed-price services) */}
          {canAcceptDirectly && (
            <button
              onClick={onAccept}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Accept Job
            </button>
          )}

          {/* Send Quote */}
          {canSendQuote && (
            <Link
              href={`/dashboard/provider/jobs/${bookingId}/quote`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {hasActiveQuote ? "Revise Quote" : "Send Quote"}
            </Link>
          )}

          {/* Decline */}
          {canDecline && (
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Decline</span>
            </button>
          )}
        </div>
      )}

      {/* Reject dialog */}
      {showRejectDialog && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Decline this job?
          </h3>
          <p className="text-sm text-gray-500">
            Please provide a reason so the customer understands.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Fully booked this week, out of service area, etc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={onReject}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
