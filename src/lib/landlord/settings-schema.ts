/**
 * Every control on the settings page, declared once.
 *
 * THE FIELD THAT MAKES THIS HONEST: `inForce`.
 *
 *   A stored toggle that nothing reads is a control that does nothing — the
 *   landlord clicks it, it saves, and the behaviour never changes. That is the
 *   same defect as `listings.applications_count`, a counter no code could ever
 *   increment, which sat in the schema while the marketing site sold the
 *   feature it was supposed to count.
 *
 *   So each toggle declares whether MitaSafi acts on it TODAY, and when it
 *   does not, why. The page renders that reason next to the switch. The
 *   setting is still stored, because recording the landlord's intent is
 *   useful and because the feature that reads it will be built — but nobody
 *   is told it is working when it is not.
 *
 *   Two are in force: application screening (rental_applications exists and
 *   the submit action checks it) and staff access (property_staff exists and
 *   the caretakers tab is gated on it). The rest gate features that do not
 *   exist yet, and say so.
 */

export type ToggleKey =
  | "tenant_maintenance_access"
  | "application_screening"
  | "accept_partial_payment"
  | "accept_future_payments"
  | "enable_chat"
  | "require_renters_insurance"
  | "enable_staff_access";

export interface ToggleSpec {
  key: ToggleKey;
  label: string;
  description: string;
  /** True when something in MitaSafi actually reads this today. */
  inForce: boolean;
  /** Why it is not in force. Rendered to the landlord verbatim. */
  notYet?: string;
}

export const GENERAL_TOGGLES: ToggleSpec[] = [
  {
    key: "application_screening",
    label: "Applications and screening",
    description:
      "Prospective tenants can apply to your active listings and you review them under Applications.",
    inForce: true,
  },
  {
    key: "enable_staff_access",
    label: "Caretakers and staff",
    description:
      "Give a caretaker, manager or bookkeeper their own sign-in, scoped to the blocks you choose.",
    inForce: true,
  },
  {
    key: "tenant_maintenance_access",
    label: "Tenant maintenance requests",
    description:
      "Tenants raise maintenance requests themselves instead of calling you.",
    inForce: false,
    notYet:
      "Saved, but not in effect: tenants have no way to submit a request yet. Maintenance is landlord-entered today.",
  },
  {
    key: "accept_partial_payment",
    label: "Accept partial payments",
    description: "A tenant may pay part of an invoice rather than all of it.",
    inForce: false,
    notYet:
      "Saved, but not in effect: invoices do not yet check this before accepting an amount.",
  },
  {
    key: "accept_future_payments",
    label: "Accept payments in advance",
    description:
      "A tenant with nothing outstanding may pay future invoices early.",
    inForce: false,
    notYet:
      "Saved, but not in effect: there is no advance-payment path in MitaSafi yet.",
  },
  {
    key: "enable_chat",
    label: "Chat with tenants",
    description: "Message tenants directly inside MitaSafi.",
    inForce: false,
    notYet:
      "Saved, but not in effect: landlord-to-tenant messaging has not been built.",
  },
  {
    key: "require_renters_insurance",
    label: "Require renter's insurance",
    description: "Ask tenants to provide proof of a policy when you add them.",
    inForce: false,
    notYet:
      "Saved, but not in effect: there is nowhere to record a policy yet.",
  },
];

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface NotifySpec {
  key: string;
  label: string;
  /** A numeric companion field, e.g. "within N days". */
  numberKey?: string;
  numberSuffix?: string;
  min?: number;
  max?: number;
}

export interface NotifyGroup {
  title: string;
  items: NotifySpec[];
}

/** Everything MitaSafi could email the landlord about. */
export const LANDLORD_NOTIFICATIONS: NotifyGroup[] = [
  {
    title: "Leases",
    items: [
      {
        key: "notify_all_tenants_signed",
        label: "All tenants have signed a document",
      },
      { key: "notify_any_tenant_signs", label: "Any tenant signs a document" },
      {
        key: "notify_lease_expiring",
        label: "A lease is expiring soon",
        numberKey: "lease_expiry_notice_days",
        numberSuffix: "days ahead",
        min: 1,
        max: 365,
      },
    ],
  },
  {
    title: "Rent and invoices",
    items: [
      { key: "notify_payment_made", label: "A tenant makes a payment" },
      { key: "notify_payment_failed", label: "A payment fails or is rejected" },
      {
        key: "notify_payment_resubmitted",
        label: "A tenant retries a failed payment",
      },
      {
        key: "notify_overdue_summary",
        label: "Monthly summary of overdue invoices",
        numberKey: "overdue_summary_day_1",
        numberSuffix: "and mid-month",
        min: 1,
        max: 28,
      },
      {
        key: "notify_refund_debited",
        label: "Your account is debited for a refund",
      },
      {
        key: "notify_refund_received",
        label: "A tenant receives their refund",
      },
      { key: "notify_funds_disbursed", label: "Funds are disbursed to you" },
    ],
  },
  {
    title: "Maintenance",
    items: [
      {
        key: "notify_maintenance_submitted",
        label: "A maintenance request is raised",
      },
      {
        key: "notify_maintenance_resolved",
        label: "A request is marked resolved",
      },
      { key: "notify_maintenance_reopened", label: "A request is re-opened" },
      { key: "notify_maintenance_updated", label: "Someone updates a request" },
      {
        key: "notify_maintenance_comment",
        label: "Someone comments on a request",
      },
    ],
  },
  {
    title: "Applications",
    items: [
      {
        key: "notify_application_submitted",
        label: "An application is submitted",
      },
    ],
  },
  {
    title: "Renter's insurance",
    items: [
      {
        key: "notify_insurance_provided_requested",
        label: "A tenant provides a policy you asked for",
      },
      {
        key: "notify_insurance_provided_unrequested",
        label: "A tenant provides a policy you did not ask for",
      },
    ],
  },
];

/** What MitaSafi sends the tenants, on the landlord's behalf. */
export const TENANT_NOTIFICATIONS: NotifyGroup[] = [
  {
    title: "Notifications sent to your tenants",
    items: [
      {
        key: "tenant_notify_invoice_due_day",
        label: "The day an invoice is due",
      },
      { key: "tenant_notify_invoice_late", label: "An invoice is late" },
      {
        key: "tenant_notify_invoice_due_soon",
        label: "An unpaid invoice is due soon",
        numberKey: "tenant_invoice_due_notice_days",
        numberSuffix: "days ahead",
        min: 1,
        max: 30,
      },
      {
        key: "tenant_notify_lease_expiring",
        label: "Their lease is expiring soon",
        numberKey: "tenant_lease_expiry_notice_days",
        numberSuffix: "days ahead",
        min: 1,
        max: 365,
      },
    ],
  },
];

/**
 * Notifications are stored but not yet sent by anything. Said once, at the top
 * of the tab, rather than repeated against twenty switches.
 */
export const NOTIFICATIONS_NOT_YET_SENT =
  "These preferences are saved against your account. MitaSafi does not send scheduled email or SMS yet, so nothing is dispatched from them today — they decide what you will receive once it does.";

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export const STAFF_ROLES = [
  {
    value: "caretaker",
    label: "Caretaker",
    blurb: "Day-to-day care of specific blocks. Sees maintenance, not money.",
  },
  {
    value: "manager",
    label: "Manager",
    blurb: "Runs blocks on your behalf. Can be given tenant visibility.",
  },
  {
    value: "accountant",
    label: "Bookkeeper",
    blurb: "Keeps the books. Can be given payment recording.",
  },
] as const;

export const STAFF_PERMISSIONS = [
  {
    key: "can_manage_maintenance",
    label: "Handle maintenance",
    blurb: "See and update maintenance for their blocks.",
    inForce: true,
  },
  {
    key: "can_view_tenants",
    label: "See tenants",
    blurb: "Names and contact details of tenants in their blocks.",
    inForce: false,
    notYet:
      "Recorded, but not yet granted: tenant records stay landlord-only until this is wired deliberately.",
  },
  {
    key: "can_record_payments",
    label: "Record payments",
    blurb: "Enter rent received on your behalf.",
    inForce: false,
    notYet:
      "Recorded, but not yet granted: nobody but you can write to payments today.",
  },
] as const;

export const LATE_FEE_TYPES = [
  { value: "percentage", label: "Percentage of the amount owed" },
  { value: "fixed", label: "A fixed amount" },
  { value: "daily", label: "A fixed amount per day late" },
] as const;

export const FEE_PAYERS = [
  { value: "tenant", label: "Tenant pays" },
  { value: "landlord", label: "I pay" },
] as const;
