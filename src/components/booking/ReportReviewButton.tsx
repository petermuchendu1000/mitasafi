/**
 * ReportReviewButton Component (M7)
 *
 * Flag/report a review for moderation. Shows a small "Report" button
 * that expands into a reason input form.
 */

"use client";

import { useState, useTransition } from "react";
import { Flag, Loader2, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { flagReview } from "@/lib/services/reviews";

// =============================================================================
// TYPES
// =============================================================================

interface ReportReviewButtonProps {
  reviewId: string;
  isAuthenticated: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReportReviewButton({
  reviewId,
  isAuthenticated,
}: ReportReviewButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (status === "success") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-teal-600">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Reported
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => {
          if (!isAuthenticated) return;
          setShowForm(true);
        }}
        title={isAuthenticated ? "Report this review" : "Sign in to report"}
        className={cn(
          "flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors",
          !isAuthenticated && "cursor-default opacity-60"
        )}
      >
        <Flag className="w-3 h-3" />
        Report
      </button>
    );
  }

  const handleSubmit = () => {
    if (!reason.trim()) {
      setErrorMsg("Please provide a reason.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const result = await flagReview(reviewId, reason.trim());
      if (result.success) {
        setStatus("success");
      } else {
        setErrorMsg(result.error || "Failed to report. Please try again.");
        setStatus("error");
      }
    });
  };

  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-700">
          Why are you reporting this review?
        </p>
        <button
          onClick={() => {
            setShowForm(false);
            setReason("");
            setErrorMsg(null);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {errorMsg && (
        <p className="text-xs text-red-600 mb-2">{errorMsg}</p>
      )}

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g., Fake review, offensive language, etc."
        rows={2}
        maxLength={500}
        className="w-full px-2.5 py-2 border border-gray-300 rounded-md text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-400">{reason.length}/500</p>
        <button
          onClick={handleSubmit}
          disabled={isPending || !reason.trim()}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Flag className="w-3 h-3" />
          )}
          Submit report
        </button>
      </div>
    </div>
  );
}
