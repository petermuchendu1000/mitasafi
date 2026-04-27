/**
 * Admin Verification Detail Page
 *
 * Server component: loads a single provider's verification submission.
 * Shows all uploaded documents (images/PDFs) + approve/reject actions.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getVerificationDetail } from "@/lib/services/admin-verification";
import { VerificationActions } from "./VerificationActions";
import { DocumentViewer } from "./DocumentViewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VerificationDetailPage({ params }: PageProps) {
  const { id: providerId } = await params;
  const { data: detail, error } = await getVerificationDetail(providerId);

  if (error || !detail) {
    notFound();
  }

  const pendingDocs = detail.documents.filter((d) => d.status === "pending");
  const rejectedDocs = detail.documents.filter((d) => d.status === "rejected");
  const approvedDocs = detail.documents.filter((d) => d.status === "approved");
  const isActionable = pendingDocs.length > 0;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/admin/verifications" className="hover:text-gray-700">
          Verifications
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{detail.providerName}</span>
      </nav>

      {/* Provider overview card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          {detail.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.profilePhotoUrl}
              alt=""
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-500">
              {detail.providerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">
              {detail.providerName}
            </h1>
            <div className="text-sm text-gray-500 mt-1 space-y-0.5">
              <p>{detail.providerEmail}</p>
              {detail.providerPhone && <p>{detail.providerPhone}</p>}
            </div>
          </div>
          <div className="text-right">
            <AccountStatusBadge status={detail.accountStatus} />
            <div className="text-xs text-gray-400 mt-1">
              {detail.businessType ? (
                <span className="capitalize">{detail.businessType}</span>
              ) : (
                "No type"
              )}
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
          <MetaItem label="Provider ID" value={detail.providerId.slice(0, 8) + "..."} />
          <MetaItem label="User ID" value={detail.userId.slice(0, 8) + "..."} />
          <MetaItem
            label="Verification Level"
            value={detail.verificationLevel || "none"}
          />
          <MetaItem
            label="Created"
            value={new Date(detail.createdAt).toLocaleDateString("en-KE", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
        </div>
      </div>

      {/* Documents */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Uploaded Documents ({detail.documents.length})
      </h2>

      {detail.documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {detail.documents.map((doc) => (
            <DocumentViewer key={doc.id} document={doc} />
          ))}
        </div>
      )}

      {/* Approve/Reject Actions */}
      {isActionable && (
        <VerificationActions
          providerId={detail.providerId}
          documents={pendingDocs}
        />
      )}

      {/* Already reviewed notice */}
      {!isActionable && detail.documents.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-600 font-medium">
            {approvedDocs.length > 0
              ? "All documents have been approved."
              : rejectedDocs.length > 0
                ? "Documents have been rejected. Awaiting provider re-submission."
                : "No pending documents to review."
            }
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SMALL COMPONENTS
// ---------------------------------------------------------------------------

function AccountStatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_verification: {
      label: "Pending Review",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
    rejected: {
      label: "Rejected",
      cls: "bg-red-50 text-red-700 border-red-200",
    },
    active: {
      label: "Verified",
      cls: "bg-green-50 text-green-700 border-green-200",
    },
  };
  const cfg = map[status ?? ""] ?? {
    label: status ?? "Unknown",
    cls: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 mt-0.5 font-mono">{value}</dd>
    </div>
  );
}
