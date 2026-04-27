// =============================================================================
// MITASAFI: STATUS TIMELINE COMPONENT
// =============================================================================
// Reusable visual timeline showing all status transitions for a booking.
// Renders a vertical timeline with colored status dots, labels, timestamps,
// and the actor who made each change.
//
// Used by: Provider job detail page, Customer booking detail page.
// =============================================================================

import {
  CheckCircle,
  Clock,
  Calendar,
  Play,
  Flag,
  XCircle,
  AlertTriangle,
  Shield,
} from "lucide-react";
import {
  getBookingStatusConfig,
  getBookingStatusLabel,
} from "@/lib/constants/booking";
import type { BookingStatus, BookingStatusHistory } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface StatusTimelineProps {
  history: BookingStatusHistory[];
  /** Current status to highlight the latest step. */
  currentStatus?: BookingStatus;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Map booking status to a semantic icon for the timeline dot. */
function getStatusIcon(status: BookingStatus) {
  switch (status) {
    case "submitted":
    case "provider_viewed":
      return Clock;
    case "confirmed":
    case "quote_accepted":
    case "customer_confirmed":
      return CheckCircle;
    case "scheduled":
      return Calendar;
    case "in_progress":
    case "rework_required":
    case "requires_followup":
      return Play;
    case "completed":
    case "partially_completed":
      return Flag;
    case "cancelled_customer":
    case "cancelled_provider":
    case "abandoned":
      return XCircle;
    case "provider_no_show":
    case "customer_no_show":
    case "needs_reassignment":
      return AlertTriangle;
    case "disputed":
    case "resolved":
      return Shield;
    default:
      return CheckCircle;
  }
}

function getRoleLabel(role: string | null): string {
  switch (role) {
    case "customer":
      return "Customer";
    case "provider":
      return "Provider";
    case "admin":
      return "Admin";
    case "system":
      return "System";
    default:
      return "";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function StatusTimeline({ history, currentStatus }: StatusTimelineProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Status history
      </h3>
      <ol className="relative border-l-2 border-gray-200 ml-3 space-y-5">
        {history.map((entry, index) => {
          const toStatus = entry.to_status as BookingStatus;
          const toConfig = getBookingStatusConfig(toStatus);
          const Icon = getStatusIcon(toStatus);
          const isLatest = index === history.length - 1;

          return (
            <li key={entry.id} className="ml-6">
              {/* Timeline dot */}
              <span
                className={`absolute -left-[11px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white ${
                  isLatest && currentStatus === toStatus
                    ? toConfig.bgColor
                    : "bg-gray-100"
                }`}
              >
                <Icon
                  className={`w-3 h-3 ${
                    isLatest && currentStatus === toStatus
                      ? toConfig.color
                      : "text-gray-500"
                  }`}
                />
              </span>

              {/* Content */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm font-medium ${
                      isLatest ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {getBookingStatusLabel(toStatus)}
                  </span>
                  {isLatest && currentStatus === toStatus && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${toConfig.bgColor} ${toConfig.color}`}
                    >
                      Current
                    </span>
                  )}
                </div>

                {/* Transition info */}
                {entry.from_status && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    from {getBookingStatusLabel(entry.from_status as BookingStatus)}
                  </p>
                )}

                {/* Reason */}
                {entry.reason && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    &ldquo;{entry.reason}&rdquo;
                  </p>
                )}

                {/* Notes */}
                {entry.notes && (
                  <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>
                )}

                {/* Timestamp & actor */}
                <p className="text-xs text-gray-400 mt-1">
                  {formatDateTime(entry.created_at)}
                  {entry.changed_by_role && (
                    <span className="ml-1">
                      · {getRoleLabel(entry.changed_by_role)}
                    </span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
