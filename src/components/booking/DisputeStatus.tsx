/**
 * DisputeStatus Component (SC-5)
 *
 * Displays the current dispute status when a booking is in "disputed" state.
 * Shows:
 *   - Dispute type and severity badge
 *   - Description summary
 *   - Evidence thumbnails
 *   - Timeline with status progression
 *   - Resolution details (when resolved)
 *   - Refund status (when applicable)
 *
 * This is a server-data-driven component — receives dispute data as props.
 */

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BookingDispute,
  DisputeType,
  DisputeSeverity,
  DisputeStatus as DisputeStatusType,
} from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface DisputeStatusProps {
  dispute: BookingDispute;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  quality: "Quality Issue",
  pricing: "Pricing Dispute",
  cancellation: "Unfair Cancellation",
  safety: "Safety Concern",
  damage: "Property Damage",
  no_show: "Provider No-Show",
};

const SEVERITY_CONFIG: Record<
  DisputeSeverity,
  { label: string; color: string; bgColor: string }
> = {
  low: { label: "Low", color: "text-blue-700", bgColor: "bg-blue-100" },
  medium: {
    label: "Medium",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  high: { label: "High", color: "text-red-700", bgColor: "bg-red-100" },
};

const STATUS_CONFIG: Record<
  DisputeStatusType,
  { label: string; color: string; bgColor: string; icon: typeof Clock }
> = {
  open: {
    label: "Open",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: AlertTriangle,
  },
  investigating: {
    label: "Under Investigation",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: Eye,
  },
  resolved: {
    label: "Resolved",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: XCircle,
  },
};

const RESOLUTION_LABELS: Record<string, string> = {
  full_refund: "Full refund",
  partial_refund: "Partial refund",
  redo_service: "Redo service",
  provider_apology: "Acknowledgment & apology",
  other: "Other",
};

const REFUND_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: "Pending", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  approved: { label: "Approved", color: "text-blue-700", bgColor: "bg-blue-100" },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100" },
  processed: { label: "Processed", color: "text-green-700", bgColor: "bg-green-100" },
};

// =============================================================================
// TIMELINE STEPS
// =============================================================================

interface TimelineStep {
  status: DisputeStatusType;
  label: string;
  timestamp: string | null;
  isActive: boolean;
  isComplete: boolean;
}

function getTimelineSteps(dispute: BookingDispute): TimelineStep[] {
  const statusOrder: DisputeStatusType[] = [
    "open",
    "investigating",
    "resolved",
  ];

  const currentIndex = statusOrder.indexOf(dispute.status);
  // If status is "closed", treat it as resolved for timeline purposes
  const effectiveIndex =
    dispute.status === "closed" ? statusOrder.length - 1 : currentIndex;

  return statusOrder.map((status, index) => ({
    status,
    label: STATUS_CONFIG[status].label,
    timestamp:
      status === "open"
        ? dispute.created_at
        : status === "resolved" && dispute.resolved_at
          ? dispute.resolved_at
          : null,
    isActive: index === effectiveIndex,
    isComplete: index < effectiveIndex,
  }));
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DisputeStatusView({ dispute }: DisputeStatusProps) {
  const statusCfg = STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.open;
  const severityCfg = SEVERITY_CONFIG[dispute.severity] ?? SEVERITY_CONFIG.medium;
  const StatusIcon = statusCfg.icon;
  const timeline = getTimelineSteps(dispute);
  const evidenceUrls = (dispute.evidence_urls ?? []) as string[];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ── Header ── */}
      <div className={cn("px-5 py-4", statusCfg.bgColor)}>
        <div className="flex items-center gap-3">
          <StatusIcon className={cn("w-5 h-5 shrink-0", statusCfg.color)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn("text-sm font-semibold", statusCfg.color)}>
                Dispute — {statusCfg.label}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide",
                  severityCfg.bgColor,
                  severityCfg.color
                )}
              >
                {severityCfg.label} severity
              </span>
            </div>
            <p className={cn("text-xs mt-0.5 opacity-80", statusCfg.color)}>
              Filed {formatDate(dispute.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {/* ── Dispute Type ── */}
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Reason
          </p>
          <p className="text-sm font-medium text-gray-900">
            {DISPUTE_TYPE_LABELS[dispute.dispute_type] ?? dispute.dispute_type}
          </p>
        </div>

        {/* ── Description ── */}
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Description
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {dispute.description}
          </p>
        </div>

        {/* ── Evidence ── */}
        {evidenceUrls.length > 0 && (
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              <Camera className="w-3 h-3 inline mr-1" />
              Evidence ({evidenceUrls.length} photo
              {evidenceUrls.length !== 1 ? "s" : ""})
            </p>
            <div className="flex gap-2 flex-wrap">
              {evidenceUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 hover:border-teal-400 transition-colors"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Desired Resolution ── */}
        {dispute.desired_resolution && (
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Desired Resolution
            </p>
            <p className="text-sm text-gray-900">
              {RESOLUTION_LABELS[dispute.desired_resolution] ??
                dispute.desired_resolution}
            </p>
          </div>
        )}

        {/* ── Timeline ── */}
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
            Progress
          </p>
          <div className="space-y-0">
            {timeline.map((step, index) => (
              <div key={step.status} className="flex gap-3">
                {/* Connector line + dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full border-2 shrink-0",
                      step.isComplete
                        ? "bg-teal-600 border-teal-600"
                        : step.isActive
                          ? "bg-red-500 border-red-500"
                          : "bg-white border-gray-300"
                    )}
                  />
                  {index < timeline.length - 1 && (
                    <div
                      className={cn(
                        "w-0.5 flex-1 min-h-[24px]",
                        step.isComplete ? "bg-teal-600" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
                {/* Label */}
                <div className="pb-4">
                  <p
                    className={cn(
                      "text-sm font-medium -mt-0.5",
                      step.isComplete
                        ? "text-teal-700"
                        : step.isActive
                          ? "text-gray-900"
                          : "text-gray-400"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(step.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Resolution (when resolved/closed) ── */}
        {dispute.resolution &&
          (dispute.status === "resolved" || dispute.status === "closed") && (
            <div className="px-5 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Resolution
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {dispute.resolution}
              </p>
            </div>
          )}

        {/* ── Refund Status (when applicable) ── */}
        {dispute.refund_status && (
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Refund
            </p>
            <div className="flex items-center gap-3">
              {dispute.refund_amount != null && (
                <span className="text-sm font-semibold text-gray-900">
                  KES {dispute.refund_amount.toLocaleString()}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full",
                  REFUND_STATUS_CONFIG[dispute.refund_status]?.bgColor ??
                    "bg-gray-100",
                  REFUND_STATUS_CONFIG[dispute.refund_status]?.color ??
                    "text-gray-700"
                )}
              >
                {REFUND_STATUS_CONFIG[dispute.refund_status]?.label ??
                  dispute.refund_status}
              </span>
            </div>
          </div>
        )}

        {/* ── Pending notice ── */}
        {(dispute.status === "open" || dispute.status === "investigating") && (
          <div className="px-5 py-4 bg-gray-50">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {dispute.status === "open"
                    ? "Your dispute is being reviewed"
                    : "Investigation in progress"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Our team will review your case and contact you with next steps.
                  Most disputes are resolved within 2-3 business days.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
