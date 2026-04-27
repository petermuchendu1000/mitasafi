/**
 * Verification Actions — Client component
 *
 * Renders approve/reject buttons with a rejection reason form.
 * Calls server actions from admin-verification.ts.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import {
  approveVerification,
  rejectVerification,
} from "@/lib/services/admin-verification";

interface VerificationActionsProps {
  providerId: string;
  documents: Array<{
    id: string;
    documentType: string;
  }>;
}

type Mode = "idle" | "confirming-approve" | "rejecting";

export function VerificationActions({
  providerId,
  documents,
}: VerificationActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Per-document rejection reasons
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [generalReason, setGeneralReason] = useState("");

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveVerification(providerId);
      if (result.success) {
        setSuccess("Provider approved successfully.");
        setMode("idle");
        router.refresh();
      } else {
        setError(result.error || "Approval failed.");
      }
    });
  };

  const handleReject = () => {
    setError(null);

    // Build reasons map
    const reasonsPayload: Record<string, string> = {};

    // Per-document reasons
    for (const [docId, reason] of Object.entries(reasons)) {
      if (reason.trim()) {
        reasonsPayload[docId] = reason.trim();
      }
    }

    // General reason
    if (generalReason.trim()) {
      reasonsPayload["general"] = generalReason.trim();
    }

    if (Object.keys(reasonsPayload).length === 0) {
      setError("Please provide at least one rejection reason.");
      return;
    }

    startTransition(async () => {
      const result = await rejectVerification(providerId, reasonsPayload);
      if (result.success) {
        setSuccess("Verification rejected. Provider has been notified.");
        setMode("idle");
        router.refresh();
      } else {
        setError(result.error || "Rejection failed.");
      }
    });
  };

  // Success state
  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <p className="text-green-800 font-medium">{success}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Review Decision
      </h3>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Idle — show action buttons */}
      {mode === "idle" && (
        <div className="flex gap-3">
          <button
            onClick={() => setMode("confirming-approve")}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            Approve
          </button>
          <button
            onClick={() => setMode("rejecting")}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
        </div>
      )}

      {/* Approve confirmation */}
      {mode === "confirming-approve" && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            This will approve all {documents.length} pending document(s),
            verify the provider, and make their profile visible to customers.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              {isPending ? "Approving..." : "Confirm Approval"}
            </button>
            <button
              onClick={() => setMode("idle")}
              disabled={isPending}
              className="px-4 py-3 text-gray-600 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reject form */}
      {mode === "rejecting" && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Provide a reason for each document, or a general reason.
            The provider will see these reasons and can re-submit.
          </p>

          {/* Per-document reasons */}
          <div className="space-y-3 mb-4">
            {documents.map((doc) => (
              <div key={doc.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {doc.documentType.replace(/_/g, " ")}
                </label>
                <input
                  type="text"
                  placeholder={`Reason for rejecting ${doc.documentType.replace(/_/g, " ")}...`}
                  value={reasons[doc.id] || ""}
                  onChange={(e) =>
                    setReasons((prev) => ({
                      ...prev,
                      [doc.id]: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                />
              </div>
            ))}
          </div>

          {/* General reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              General reason (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Overall feedback for the provider..."
              value={generalReason}
              onChange={(e) => setGeneralReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              {isPending ? "Rejecting..." : "Confirm Rejection"}
            </button>
            <button
              onClick={() => {
                setMode("idle");
                setReasons({});
                setGeneralReason("");
              }}
              disabled={isPending}
              className="px-4 py-3 text-gray-600 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
