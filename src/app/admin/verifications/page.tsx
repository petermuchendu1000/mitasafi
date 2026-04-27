/**
 * Admin Verification Queue Page
 *
 * Server component: fetches the queue, renders a table of pending verifications.
 * Each row links to the detail/review page for that provider.
 */

import Link from "next/link";
import { getVerificationQueue } from "@/lib/services/admin-verification";
import { VerificationQueueFilters } from "./VerificationQueueFilters";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    filter?: string;
  }>;
}

export default async function VerificationQueuePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const filter = (params.filter || "pending") as "pending" | "rejected" | "all";

  const { data: queue, pagination } = await getVerificationQueue(page, 20, filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Verification Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve provider identity documents
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {pagination.total} submission{pagination.total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Filters */}
      <VerificationQueueFilters current={filter} />

      {/* Queue table */}
      {queue.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No pending verifications</p>
          <p className="text-gray-400 text-sm mt-1">
            All submissions have been reviewed
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Provider
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Type
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Documents
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Submitted
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queue.map((item) => (
                <tr
                  key={item.providerId}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {/* Provider name + email */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {item.profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.profilePhotoUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                          {item.providerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.providerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.providerEmail}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Business type */}
                  <td className="py-3 px-4">
                    <span className="capitalize text-gray-700">
                      {item.businessType || "—"}
                    </span>
                  </td>

                  {/* Document counts */}
                  <td className="py-3 px-4">
                    <span className="text-gray-700">
                      {item.pendingCount} pending / {item.documentCount} total
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="py-3 px-4">
                    <StatusBadge status={item.accountStatus} />
                  </td>

                  {/* Submitted date */}
                  <td className="py-3 px-4 text-gray-500">
                    {formatRelativeDate(item.submittedAt)}
                  </td>

                  {/* Review link */}
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/verifications/${item.providerId}`}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/admin/verifications?page=${pagination.page - 1}&filter=${filter}`}
                className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {pagination.hasMore && (
              <Link
                href={`/admin/verifications?page=${pagination.page + 1}&filter=${filter}`}
                className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    pending_verification: {
      label: "Pending",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    active: {
      label: "Active",
      className: "bg-green-50 text-green-700 border-green-200",
    },
  };

  const cfg = config[status ?? ""] ?? {
    label: status ?? "Unknown",
    className: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}
