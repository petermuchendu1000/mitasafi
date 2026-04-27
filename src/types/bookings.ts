// =============================================================================
// MITASAFI: BOOKING TYPES
// =============================================================================
// Type definitions for the booking system.
// Manually defined because the generated database.ts uses legacy table names
// (service_jobs) that don't match the canonical migration tables (bookings).
// When database types are regenerated, these can be replaced with DB-derived types.
// =============================================================================

// =============================================================================
// DATABASE ENUMS
// =============================================================================

/**
 * Canonical booking_status enum — 25 states.
 * Maps to the `booking_status` PostgreSQL enum defined in
 * 20260108120003_booking_core.sql + 20260109120002_add_missing_booking_states.sql.
 */
export type BookingStatus =
  // Pre-confirmation flow
  | "draft"
  | "submitted"
  | "provider_viewed"
  | "quote_pending"
  | "quote_sent"
  | "quote_accepted"
  | "quote_rejected"
  // Job lifecycle (M5)
  | "confirmed"
  | "scheduled"
  | "in_progress"
  | "partially_completed"
  | "completed"
  | "customer_confirmed"
  | "requires_followup"
  | "rework_required"
  // Cancellation / no-show
  | "cancelled_customer"
  | "cancelled_provider"
  | "provider_no_show"
  | "customer_no_show"
  | "needs_reassignment"
  | "abandoned"
  // Payment (M6)
  | "payment_pending"
  | "payment_failed"
  // Dispute & resolution
  | "disputed"
  | "resolved";

/**
 * Canonical booking_flow_type enum — 5 values.
 * Maps to the `booking_flow_type` PostgreSQL enum.
 */
export type BookingFlowType =
  | "emergency"
  | "standard"
  | "delivery"
  | "project"
  | "personal";

/**
 * Location type enum from the DB.
 * Must match: Database["public"]["Enums"]["location_type"]
 */
export type LocationType =
  | "home"
  | "office"
  | "public_place"
  | "in_vehicle"
  | "other";

// =============================================================================
// ROW TYPES (matching canonical migration columns)
// =============================================================================

/** Row shape for the `bookings` table. */
export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string | null;
  service_id: string;
  service_type_id: string;
  booking_flow_type: BookingFlowType;
  status: BookingStatus;
  quoted_price: number | null;
  agreed_price: number | null;
  currency: string;
  requested_at: string | null;
  provider_viewed_at: string | null;
  provider_responded_at: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  completed_at: string | null;
  payment_status: string;
  payment_method: string | null;
  payment_ref: string | null;
  customer_notes: string | null;
  provider_notes: string | null;
  cancellation_reason: string | null;
  metadata: BookingMetadata | null;
  created_at: string;
  updated_at: string;
  // M5 columns (from 20260109120002_add_missing_booking_states)
  reschedule_count: number;
  completion_percentage: number | null;
  followup_scheduled_at: string | null;
  abandoned_at: string | null;
  abandonment_reason: string | null;
}

/** Shape of the `bookings.metadata` JSONB column. */
export interface BookingMetadata {
  /** FK to the locations table — location used for this booking. */
  location_id?: string;
  /** Denormalized address string for quick display. */
  location_summary?: string;
  /** The provider_services.id that initiated this booking. */
  provider_service_id?: string;
  /** Any customer-uploaded media IDs (booking_media). */
  media_ids?: string[];
  /** Whether the customer is flexible on scheduling. */
  is_flexible?: boolean;
}

/** Insert shape for the `bookings` table. */
export interface BookingInsert {
  customer_id: string;
  provider_id?: string | null;
  service_id: string;
  service_type_id: string;
  booking_flow_type: BookingFlowType;
  status?: BookingStatus;
  quoted_price?: number | null;
  agreed_price?: number | null;
  currency?: string;
  requested_at?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  customer_notes?: string | null;
  metadata?: BookingMetadata | null;
}

/** Row shape for the `booking_status_history` table. */
export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_by: string;
  changed_by_role: "customer" | "provider" | "admin";
  reason: string | null;
  notes: string | null;
  created_at: string;
}

/** Insert shape for `booking_status_history`. */
export interface BookingStatusHistoryInsert {
  booking_id: string;
  from_status?: BookingStatus | null;
  to_status: BookingStatus;
  changed_by: string;
  changed_by_role: "customer" | "provider" | "admin";
  reason?: string | null;
  notes?: string | null;
}

/** Row shape for the `locations` table. */
export interface Location {
  id: string;
  user_id: string | null;
  address_line1: string;
  address_line2: string | null;
  area: string | null;
  city: string;
  county: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  location_type: LocationType | null;
  is_saved: boolean;
  label: string | null;
  created_at: string;
  updated_at: string;
}

/** Insert shape for the `locations` table. */
export interface LocationInsert {
  user_id?: string | null;
  address_line1: string;
  address_line2?: string | null;
  area?: string | null;
  city?: string;
  county?: string | null;
  country?: string;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  access_notes?: string | null;
  location_type?: LocationType | null;
  is_saved?: boolean;
  label?: string | null;
}

/** Row shape for the `booking_media` table. */
export interface BookingMedia {
  id: string;
  booking_id: string;
  uploaded_by: string;
  media_type: string;
  media_url: string;
  stage: "before" | "during" | "after" | "proof" | "issue";
  caption: string | null;
  created_at: string;
}

// =============================================================================
// QUOTE TYPES (matching canonical `booking_quotes` table)
// =============================================================================

/**
 * Status of a booking quote.
 * Maps to the `booking_quotes.status` text column.
 */
export type QuoteStatus =
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "superseded";

/** A single line item in a quote breakdown. */
export interface QuoteBreakdownItem {
  /** Human-readable label for this line item. */
  label: string;
  /** Amount in KES for this line item. */
  amount: number;
  /** Optional quantity (defaults to 1). */
  quantity?: number;
  /** Optional notes about this line item. */
  note?: string;
}

/** Row shape for the `booking_quotes` table. */
export interface BookingQuote {
  id: string;
  booking_id: string;
  provider_id: string;
  quoted_price: number;
  currency: string;
  breakdown: QuoteBreakdownItem[] | null;
  description: string | null;
  validity_days: number;
  valid_until: string | null;
  status: QuoteStatus;
  customer_response: string | null;
  sent_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  revision_count: number;
  superseded_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Insert shape for the `booking_quotes` table. */
export interface BookingQuoteInsert {
  booking_id: string;
  provider_id: string;
  quoted_price: number;
  currency?: string;
  breakdown?: QuoteBreakdownItem[] | null;
  description?: string | null;
  validity_days?: number;
  valid_until?: string | null;
  status?: QuoteStatus;
}

/** Quote with joined booking + customer info for display. */
export interface QuoteWithDetails extends BookingQuote {
  booking?: {
    id: string;
    customer_id: string;
    status: BookingStatus;
    service_id: string;
    customer_notes: string | null;
    created_at: string;
  };
  service?: {
    id: string;
    name: string;
  };
  customer?: {
    full_name: string | null;
  };
}

/** Data shape for the quote creation/revision form. */
export interface QuoteFormData {
  /** Total quoted price in KES. */
  quotedPrice: number;
  /** Itemized breakdown of the quote. */
  breakdown: QuoteBreakdownItem[];
  /** Free-text description of what's included. */
  description: string;
  /** Number of days the quote is valid. */
  validityDays: number;
}

/** Result shape returned by quote server actions. */
export interface QuoteActionResult {
  success: boolean;
  quoteId?: string;
  error?: string;
}

// =============================================================================
// EXTENDED / UI TYPES
// =============================================================================

/** Booking with joined service + provider info for list display. */
export interface BookingWithDetails extends Booking {
  service?: {
    id: string;
    name: string;
    description: string | null;
  };
  provider?: {
    id: string;
    business_name: string;
    profile_photo_url: string | null;
    phone: string | null;
    average_rating: number | null;
  };
  customer?: {
    full_name: string | null;
  };
  status_history?: BookingStatusHistory[];
  quotes?: BookingQuote[];
  media?: BookingMedia[];
}

/** Data shape for the booking request form. */
export interface BookingRequestFormData {
  providerServiceId: string;
  providerId: string;
  serviceId: string;
  serviceTypeId: string;
  bookingFlowType: BookingFlowType;

  // Location (new or saved)
  locationId?: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  city?: string;
  accessNotes?: string;
  locationType?: LocationType;
  saveLocation?: boolean;
  locationLabel?: string;

  // Scheduling
  scheduledStart?: string;
  scheduledEnd?: string;
  isFlexible?: boolean;

  // Details
  customerNotes?: string;

  // Emergency flag
  isEmergency?: boolean;
}

/** Result shape returned by the createBookingRequest server action. */
export interface CreateBookingResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}

// =============================================================================
// MESSAGE TYPES (matching canonical `booking_messages` table)
// =============================================================================

/** Allowed sender roles for booking messages. */
export type MessageSenderRole = "customer" | "provider" | "admin";

/** Row shape for the `booking_messages` table. */
export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: MessageSenderRole;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/** Insert shape for the `booking_messages` table. */
export interface BookingMessageInsert {
  booking_id: string;
  sender_id: string;
  sender_role: MessageSenderRole;
  message: string;
}

/** Message with joined sender profile info for display. */
export interface BookingMessageWithSender extends BookingMessage {
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

/** Result shape returned by message server actions. */
export interface MessageActionResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// DISPUTE TYPES (matching canonical `booking_disputes` table)
// =============================================================================

/**
 * Dispute type enumeration.
 * Maps to `booking_disputes.dispute_type` text column values.
 */
export type DisputeType =
  | "quality"
  | "pricing"
  | "cancellation"
  | "safety"
  | "damage"
  | "no_show";

/**
 * Dispute severity enum.
 * Maps to the `dispute_severity` PostgreSQL enum.
 */
export type DisputeSeverity = "low" | "medium" | "high";

/**
 * Dispute status lifecycle.
 * Maps to `booking_disputes.status` text column values.
 */
export type DisputeStatus = "open" | "investigating" | "resolved" | "closed";

/**
 * Refund status lifecycle.
 * Maps to `booking_disputes.refund_status` text column values.
 */
export type RefundStatus = "pending" | "approved" | "rejected" | "processed";

/**
 * Customer-desired resolution options.
 * Maps to `booking_disputes.desired_resolution` text column.
 */
export type DesiredResolution =
  | "full_refund"
  | "partial_refund"
  | "redo_service"
  | "provider_apology"
  | "other";

/** Row shape for the `booking_disputes` table. */
export interface BookingDispute {
  id: string;
  booking_id: string;
  reported_by: string;
  reported_by_role: "customer" | "provider";
  dispute_type: DisputeType;
  severity: DisputeSeverity;
  description: string;
  evidence_urls: string[] | null;
  desired_resolution: DesiredResolution | null;
  status: DisputeStatus;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  refund_amount: number | null;
  refund_status: RefundStatus | null;
  created_at: string;
  updated_at: string;
}

/** Insert shape for the `booking_disputes` table. */
export interface BookingDisputeInsert {
  booking_id: string;
  reported_by: string;
  reported_by_role: "customer" | "provider";
  dispute_type: DisputeType;
  severity?: DisputeSeverity | null;
  description: string;
  evidence_urls?: string[] | null;
  desired_resolution?: DesiredResolution | null;
  refund_amount?: number | null;
}

/** Dispute with joined booking details for display. */
export interface DisputeWithDetails extends BookingDispute {
  booking?: {
    id: string;
    status: BookingStatus;
    agreed_price: number | null;
    service_id: string;
    provider_id: string | null;
    customer_id: string;
  };
  service?: {
    id: string;
    name: string;
  };
  provider?: {
    id: string;
    business_name: string;
  };
}

/** Result shape returned by dispute server actions. */
export interface DisputeActionResult {
  success: boolean;
  disputeId?: string;
  error?: string;
}

/** Data shape for the dispute filing form. */
export interface DisputeFormData {
  disputeType: DisputeType;
  description: string;
  desiredResolution: DesiredResolution;
  evidenceFiles: File[];
}
