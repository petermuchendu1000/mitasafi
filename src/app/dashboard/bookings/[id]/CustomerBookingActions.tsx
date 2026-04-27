/**
 * Customer Booking Actions (Client Component)
 *
 * Context-sensitive action buttons for the customer booking detail page.
 * M5 actions:
 * - completed → Confirm Completion, Raise Dispute
 * - confirmed/scheduled → Cancel Booking
 * M7 addition:
 * - customer_confirmed → Leave a Review (if not already reviewed)
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Star,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/ui";
import {
  customerConfirmCompletion,
  cancelBookingAsCustomer,
} from "@/lib/services/booking-lifecycle";
import { CUSTOMER_LIFECYCLE_TRANSITIONS } from "@/lib/constants/booking";
import type { BookingStatus } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface CustomerBookingActionsProps {
  bookingId: string;
  bookingStatus: string;
  /** Whether the customer has already reviewed this booking. */
  hasReview?: boolean;
}

// =============================================================================
// TERMINAL STATES — no customer actions
// =============================================================================

const TERMINAL_STATUSES = new Set([
  "cancelled_customer",
  "cancelled_provider",
  "resolved",
  "abandoned",
  "needs_reassignment",
]);

// Statuses that show the review prompt instead of lifecycle actions.
// Must match REVIEWABLE_STATUSES in lib/services/reviews.ts and
// the review page (dashboard/bookings/[id]/review/page.tsx).
const REVIEW_PROMPT_STATUSES = new Set([
  "customer_confirmed",
  "payment_pending",
  "resolved",
]);

// =============================================================================
// COMPONENT
// =============================================================================

export function CustomerBookingActions({
  bookingId,
  bookingStatus,
  hasReview = false,
}: CustomerBookingActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  // Terminal → nothing
  if (TERMINAL_STATUSES.has(bookingStatus)) return null;

  // Disputed → show link to dispute status page (SC-5)
  if (bookingStatus === "disputed") {
    return (
      <Link
        href={`/dashboard/bookings/${bookingId}/dispute`}
        className="block rounded-xl bg-red-50 border border-red-200 px-5 py-5 hover:bg-red-100 transition-colors group"
      >
        <div className="text-center">
          <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Dispute in progress
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Our team is reviewing your dispute. Tap to view status and details.
          </p>
          <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl group-hover:bg-red-700 transition-colors">
            <ShieldAlert className="w-4 h-4" />
            View Dispute
          </span>
        </div>
      </Link>
    );
  }

  // Review prompt for customer_confirmed (M7)
  if (REVIEW_PROMPT_STATUSES.has(bookingStatus)) {
    if (hasReview) {
      // Already reviewed — show a subtle confirmation
      return (
        <div className="rounded-xl bg-teal-50 border border-teal-200 px-5 py-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <p className="text-sm font-medium text-teal-700">
              You&apos;ve reviewed this service
            </p>
          </div>
          <p className="text-xs text-teal-500">
            Thank you for your feedback!
          </p>
        </div>
      );
    }

    // Not reviewed yet — show review CTA
    return (
      <Link
        href={`/dashboard/bookings/${bookingId}/review`}
        className="block rounded-xl bg-amber-50 border border-amber-200 px-5 py-5 hover:bg-amber-100 transition-colors group"
      >
        <div className="text-center">
          <Star className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            How was the service?
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Your review helps other customers and the provider improve.
          </p>
          <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl group-hover:bg-teal-700 transition-colors">
            <Star className="w-4 h-4" />
            Leave a review
          </span>
        </div>
      </Link>
    );
  }

  const status = bookingStatus as BookingStatus;
  const transitions = CUSTOMER_LIFECYCLE_TRANSITIONS[status];

  // No transitions for this status → nothing
  if (!transitions || transitions.length === 0) {
    // If the job is in_progress, show a passive banner
    if (bookingStatus === "in_progress") {
      return (
        <div className="rounded-xl bg-sky-50 border border-sky-200 px-5 py-4 text-center">
          <p className="text-sm font-medium text-sky-700">
            Your provider is working on this job
          </p>
          <p className="text-xs text-sky-500 mt-1">
            You&apos;ll be notified when it&apos;s completed.
          </p>
        </div>
      );
    }
    if (bookingStatus === "scheduled") {
      return (
        <div className="space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <CancelButton
            bookingStatus={bookingStatus}
            isPending={isPending}
            showCancelDialog={showCancelDialog}
            cancelReason={cancelReason}
            setShowCancelDialog={setShowCancelDialog}
            setCancelReason={setCancelReason}
            onCancel={() => handleCancel()}
            setError={setError}
          />
        </div>
      );
    }
    return null;
  }

  // ── Handlers ──

  const handleConfirmCompletion = () => {
    setError(null);
    startTransition(async () => {
      const result = await customerConfirmCompletion(bookingId);
      if (result.success) {
        showSuccess("Job Confirmed", "Thank you! The job is now complete.");
        router.refresh();
      } else {
        showError("Failed", result.error || "Something went wrong.");
        setError(result.error || "Failed to confirm completion.");
      }
    });
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      setError("Please provide a reason for cancellation.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAsCustomer(bookingId, cancelReason.trim());
      if (result.success) {
        showSuccess("Booking Cancelled");
        setShowCancelDialog(false);
        router.refresh();
      } else {
        showError("Cancel Failed", result.error || "Something went wrong.");
        setError(result.error || "Failed to cancel booking.");
      }
    });
  };

  // ── Render ──

  const showConfirm = transitions.some((t) => t.toStatus === "customer_confirmed");
  const showCancel = transitions.some((t) => t.toStatus === "cancelled_customer");

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Confirm completion CTA (when status = completed) */}
      {showConfirm && (
        <div className="bg-white rounded-xl border-2 border-teal-200 p-5 space-y-3">
          <div className="text-center">
            <CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-gray-900">
              Is the job complete?
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Your provider has marked this job as done. Please confirm or raise a
              concern.
            </p>
          </div>
          <button
            onClick={handleConfirmCompletion}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Yes, Job is Complete
          </button>
          {/* Dispute button — links to the filing form (SC-5) */}
          <Link
            href={`/dashboard/bookings/${bookingId}/dispute`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-700 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            Raise a Dispute
          </Link>
        </div>
      )}

      {/* Cancel option */}
      {showCancel && (
        <CancelButton
          bookingStatus={bookingStatus}
          isPending={isPending}
          showCancelDialog={showCancelDialog}
          cancelReason={cancelReason}
          setShowCancelDialog={setShowCancelDialog}
          setCancelReason={setCancelReason}
          onCancel={handleCancel}
          setError={setError}
        />
      )}
    </div>
  );
}

// =============================================================================
// CANCEL BUTTON (extracted sub-component)
// =============================================================================

interface CancelButtonProps {
  bookingStatus: string;
  isPending: boolean;
  showCancelDialog: boolean;
  cancelReason: string;
  setShowCancelDialog: (v: boolean) => void;
  setCancelReason: (v: string) => void;
  onCancel: () => void;
  setError: (v: string | null) => void;
}

function CancelButton({
  isPending,
  showCancelDialog,
  cancelReason,
  setShowCancelDialog,
  setCancelReason,
  onCancel,
  setError,
}: CancelButtonProps) {
  if (!showCancelDialog) {
    return (
      <button
        onClick={() => setShowCancelDialog(true)}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-700 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <XCircle className="w-4 h-4" />
        Cancel Booking
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">
        Cancel this booking?
      </h3>
      <p className="text-sm text-gray-500">
        Please tell us why you&apos;re cancelling.
      </p>
      <textarea
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
        placeholder="e.g., No longer needed, found another provider, etc."
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
      />
      <div className="flex gap-3">
        <button
          onClick={onCancel}
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
  );
}
