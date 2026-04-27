// =============================================================================
// MITASAFI: BOOKING STATUS CONFIGURATION
// =============================================================================
// Canonical status labels, colors, and descriptions for the 25-state
// booking_status enum. Covers the full job lifecycle (M5) and beyond.
// =============================================================================

import type { BookingStatus } from "@/types/bookings";

// =============================================================================
// STATUS CONFIG
// =============================================================================

export interface BookingStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
  /** True if the booking is in a terminal state (no further transitions). */
  isTerminal: boolean;
  /** True if the booking is in an active/in-flight state. */
  isActive: boolean;
}

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, BookingStatusConfig> = {
  // ── Pre-confirmation flow ──
  draft: {
    label: "Draft",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    description: "Booking started but not yet submitted",
    isTerminal: false,
    isActive: false,
  },
  submitted: {
    label: "Submitted",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    description: "Sent to provider, awaiting response",
    isTerminal: false,
    isActive: true,
  },
  provider_viewed: {
    label: "Viewed",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    description: "Provider has seen your request",
    isTerminal: false,
    isActive: true,
  },
  quote_pending: {
    label: "Quote Pending",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    description: "Waiting for provider to send a quote",
    isTerminal: false,
    isActive: true,
  },
  quote_sent: {
    label: "Quote Sent",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    description: "Provider sent a quote — review it",
    isTerminal: false,
    isActive: true,
  },
  quote_accepted: {
    label: "Quote Accepted",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
    description: "You accepted the quote, awaiting confirmation",
    isTerminal: false,
    isActive: true,
  },
  quote_rejected: {
    label: "Quote Rejected",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    description: "Quote was declined — provider may revise",
    isTerminal: false,
    isActive: true,
  },

  // ── Job lifecycle (M5) ──
  confirmed: {
    label: "Confirmed",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
    description: "Booking confirmed — awaiting scheduling",
    isTerminal: false,
    isActive: true,
  },
  scheduled: {
    label: "Scheduled",
    color: "text-sky-700",
    bgColor: "bg-sky-100",
    description: "Job is scheduled for the agreed date and time",
    isTerminal: false,
    isActive: true,
  },
  in_progress: {
    label: "In Progress",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    description: "Provider is currently working on the job",
    isTerminal: false,
    isActive: true,
  },
  partially_completed: {
    label: "Partially Completed",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    description: "Part of the job is done — follow-up may be needed",
    isTerminal: false,
    isActive: true,
  },
  completed: {
    label: "Completed",
    color: "text-green-700",
    bgColor: "bg-green-100",
    description: "Service completed by provider — awaiting your confirmation",
    isTerminal: false,
    isActive: false,
  },
  customer_confirmed: {
    label: "Confirmed Complete",
    color: "text-green-800",
    bgColor: "bg-green-200",
    description: "You confirmed the service was completed satisfactorily",
    isTerminal: false,
    isActive: false,
  },
  requires_followup: {
    label: "Requires Follow-up",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    description: "Additional work is needed — a follow-up visit will be scheduled",
    isTerminal: false,
    isActive: true,
  },
  rework_required: {
    label: "Rework Required",
    color: "text-red-600",
    bgColor: "bg-red-50",
    description: "Quality issue identified — provider will redo the work",
    isTerminal: false,
    isActive: true,
  },

  // ── Cancellation / No-show ──
  cancelled_customer: {
    label: "Cancelled",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    description: "You cancelled this booking",
    isTerminal: true,
    isActive: false,
  },
  cancelled_provider: {
    label: "Cancelled by Provider",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    description: "Provider cancelled this booking",
    isTerminal: true,
    isActive: false,
  },
  provider_no_show: {
    label: "Provider No-Show",
    color: "text-red-700",
    bgColor: "bg-red-100",
    description: "Provider did not arrive for the scheduled job",
    isTerminal: false,
    isActive: false,
  },
  customer_no_show: {
    label: "Customer No-Show",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    description: "Customer was not available at the scheduled time",
    isTerminal: false,
    isActive: false,
  },
  needs_reassignment: {
    label: "Needs Reassignment",
    color: "text-red-600",
    bgColor: "bg-red-50",
    description: "This booking needs to be assigned to a different provider",
    isTerminal: true,
    isActive: false,
  },
  abandoned: {
    label: "Abandoned",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    description: "This booking was abandoned and is no longer active",
    isTerminal: true,
    isActive: false,
  },

  // ── Payment (M6) ──
  payment_pending: {
    label: "Payment Pending",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    description: "Awaiting payment to be processed",
    isTerminal: false,
    isActive: false,
  },
  payment_failed: {
    label: "Payment Failed",
    color: "text-red-700",
    bgColor: "bg-red-100",
    description: "Payment failed — please retry",
    isTerminal: false,
    isActive: false,
  },

  // ── Dispute & resolution ──
  disputed: {
    label: "Disputed",
    color: "text-red-700",
    bgColor: "bg-red-100",
    description: "A dispute has been raised",
    isTerminal: false,
    isActive: false,
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    description: "Dispute resolved",
    isTerminal: true,
    isActive: false,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

/** Get human-readable label for a booking status. */
export function getBookingStatusLabel(status: BookingStatus): string {
  return BOOKING_STATUS_CONFIG[status]?.label ?? status;
}

/** Get config object for a booking status with safe fallback. */
export function getBookingStatusConfig(status: BookingStatus): BookingStatusConfig {
  return (
    BOOKING_STATUS_CONFIG[status] ?? {
      label: status,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      description: "",
      isTerminal: false,
      isActive: false,
    }
  );
}

/**
 * Filter statuses into display groups for tab-based views.
 * Returns the statuses that belong to each tab.
 */
export const BOOKING_STATUS_TABS = {
  active: [
    "submitted",
    "provider_viewed",
    "quote_pending",
    "quote_sent",
    "quote_accepted",
    "confirmed",
    "scheduled",
    "in_progress",
    "partially_completed",
    "requires_followup",
    "rework_required",
  ] as BookingStatus[],
  completed: [
    "completed",
    "customer_confirmed",
  ] as BookingStatus[],
  cancelled: [
    "cancelled_customer",
    "cancelled_provider",
    "quote_rejected",
    "abandoned",
    "needs_reassignment",
  ] as BookingStatus[],
  disputed: [
    "disputed",
    "resolved",
  ] as BookingStatus[],
  noshow: [
    "provider_no_show",
    "customer_no_show",
  ] as BookingStatus[],
  payment: [
    "payment_pending",
    "payment_failed",
  ] as BookingStatus[],
} as const;

/**
 * Valid transitions a PROVIDER can initiate from the M5 lifecycle states.
 * Used by JobActionButtons to show correct actions per status.
 */
export const PROVIDER_LIFECYCLE_TRANSITIONS: Partial<
  Record<BookingStatus, { label: string; toStatus: BookingStatus; variant: "primary" | "secondary" | "danger" }[]>
> = {
  confirmed: [
    { label: "Schedule Job", toStatus: "scheduled", variant: "primary" },
    { label: "Start Job", toStatus: "in_progress", variant: "primary" },
    { label: "Cancel", toStatus: "cancelled_provider", variant: "danger" },
  ],
  scheduled: [
    { label: "Start Job", toStatus: "in_progress", variant: "primary" },
    { label: "Cancel", toStatus: "cancelled_provider", variant: "danger" },
  ],
  in_progress: [
    { label: "Mark Complete", toStatus: "completed", variant: "primary" },
  ],
  partially_completed: [
    { label: "Mark Complete", toStatus: "completed", variant: "primary" },
    { label: "Needs Follow-up", toStatus: "requires_followup", variant: "secondary" },
  ],
  requires_followup: [
    { label: "Schedule Follow-up", toStatus: "scheduled", variant: "primary" },
    { label: "Start Work", toStatus: "in_progress", variant: "primary" },
  ],
  rework_required: [
    { label: "Schedule Rework", toStatus: "scheduled", variant: "primary" },
    { label: "Start Rework", toStatus: "in_progress", variant: "primary" },
  ],
};

/**
 * Valid transitions a CUSTOMER can initiate.
 */
export const CUSTOMER_LIFECYCLE_TRANSITIONS: Partial<
  Record<BookingStatus, { label: string; toStatus: BookingStatus; variant: "primary" | "secondary" | "danger" }[]>
> = {
  completed: [
    { label: "Confirm Completion", toStatus: "customer_confirmed", variant: "primary" },
    { label: "Raise Dispute", toStatus: "disputed", variant: "danger" },
  ],
  confirmed: [
    { label: "Cancel Booking", toStatus: "cancelled_customer", variant: "danger" },
  ],
  scheduled: [
    { label: "Cancel Booking", toStatus: "cancelled_customer", variant: "danger" },
  ],
};
