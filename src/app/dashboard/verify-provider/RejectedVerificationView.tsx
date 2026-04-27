/**
 * Rejected Verification View
 *
 * Shown when an admin has rejected a provider's verification documents.
 * Displays rejection reasons fetched from provider_documents and provides
 * a re-upload form so the provider can resubmit corrected documents.
 *
 * Server component that wraps the client-side IdentityVerificationForm.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { IdentityVerificationForm } from "./IdentityVerificationForm";

interface RejectedVerificationViewProps {
  userId: string;
  providerId: string;
  providerType: "individual" | "company";
}

export async function RejectedVerificationView({
  userId,
  providerId,
  providerType,
}: RejectedVerificationViewProps) {
  // Fetch rejected documents to show reasons
  const admin = createAdminClient();
  const { data: rejectedDocs } = await admin
    .from("provider_documents")
    .select("document_type, rejection_reason, updated_at")
    .eq("provider_id", providerId)
    .eq("status", "rejected")
    .order("updated_at", { ascending: false });

  const reasons = (rejectedDocs || []).filter(
    (d) => d.rejection_reason
  );

  return (
    <div>
      {/* Rejection notice */}
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
          Verification not approved
        </h1>
        <p className="text-gray-500 text-center mb-4">
          Please review the feedback below and re-upload your documents.
        </p>

        {/* Rejection reasons */}
        {reasons.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
            <p className="font-medium text-red-800 mb-2">Reason(s) for rejection:</p>
            <ul className="space-y-2">
              {reasons.map((doc, i) => (
                <li key={i} className="flex gap-2 text-red-700">
                  <span className="font-medium capitalize">
                    {doc.document_type.replace(/_/g, " ")}:
                  </span>
                  <span>{doc.rejection_reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Re-upload form — same component, fresh state */}
      <IdentityVerificationForm
        userId={userId}
        providerId={providerId}
        providerType={providerType}
      />
    </div>
  );
}
