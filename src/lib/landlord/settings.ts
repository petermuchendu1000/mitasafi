/**
 * What a landlord may change about themselves, and what they may not.
 *
 * THE THREE THINGS THIS PAGE REFUSES TO OFFER, AND WHY
 *
 *   EMAIL. It is the sign-in identity. Across every account on this project
 *   `profiles.email` equals `auth.users.email`, and nothing in this codebase
 *   calls `auth.updateUser`. So a form that wrote `profiles.email` would change
 *   the address shown on screen and leave the address you log in with
 *   untouched — a control that appears to work, reports success, and quietly
 *   splits your identity in two. It is shown, and it is read-only.
 *
 *   ROLE. `primary_role` is derived. `authenticated` does hold UPDATE on the
 *   column, which looks like a hole until you try it: a trigger overwrites the
 *   value from user_roles before the row lands. A control for it would be a lie
 *   about what the click does.
 *
 *   VERIFICATION. `is_verified` and `verification_level` are platform-owned and
 *   the client has no write privilege on either. Shown as status, never as a
 *   control.
 *
 * WHAT IS LEFT IS GENUINELY EDITABLE: the display name, a contact phone, and
 * notification channels. Phone is contact information here, NOT the sign-in
 * method — no account on this project has an auth phone at all — and the page
 * says so rather than letting someone believe they changed their login.
 */

import { normaliseKenyanPhone } from "./tenancy-form";

export interface ProfileDraft {
  fullName: string;
  phone: string;
}

export interface ProfileFieldErrors {
  fullName?: string;
  phone?: string;
}

/** Normalised values ready to write, or the errors that stopped them. */
export interface ValidatedProfile {
  ok: boolean;
  errors: ProfileFieldErrors;
  values: { full_name: string; phone: string | null };
}

export const MAX_NAME_LENGTH = 80;

export function validateProfileDraft(draft: ProfileDraft): ValidatedProfile {
  const errors: ProfileFieldErrors = {};

  const fullName = draft.fullName.trim().replace(/\s+/g, " ");
  if (fullName === "") {
    errors.fullName = "Your name cannot be empty.";
  } else if (fullName.length > MAX_NAME_LENGTH) {
    errors.fullName = `Keep your name under ${MAX_NAME_LENGTH} characters.`;
  }

  // Empty clears the contact number; that is a legitimate choice, not an error.
  const rawPhone = draft.phone.trim();
  let phone: string | null = null;
  if (rawPhone !== "") {
    phone = normaliseKenyanPhone(rawPhone);
    if (phone === null) {
      errors.phone = "Enter a Kenyan mobile number, like 0712345678.";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values: { full_name: fullName, phone },
  };
}

/**
 * Notification channels. These are the columns on user_preferences that this
 * page writes; anything not listed here is not touched, so a key arriving from
 * a forged request cannot reach the database.
 */
export const NOTIFICATION_KEYS = [
  "email_notifications",
  "sms_notifications",
  "push_notifications",
] as const;

export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export type NotificationPreferences = Record<NotificationKey, boolean>;

export const NOTIFICATION_LABELS: Record<
  NotificationKey,
  { label: string; description: string }
> = {
  email_notifications: {
    label: "Email",
    description: "Applications, inquiries and payment confirmations by email.",
  },
  sms_notifications: {
    label: "SMS",
    description: "Text messages for things that need you the same day.",
  },
  push_notifications: {
    label: "Push",
    description: "Alerts in your browser while you are signed in.",
  },
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_notifications: true,
  sms_notifications: true,
  push_notifications: true,
};

/** Keep only known boolean keys. Returns null when nothing survives. */
export function sanitisePreferences(
  input: Record<string, unknown>,
): Partial<NotificationPreferences> | null {
  const out: Partial<NotificationPreferences> = {};
  for (const key of NOTIFICATION_KEYS) {
    const v = input[key];
    if (typeof v === "boolean") out[key] = v;
  }
  return Object.keys(out).length === 0 ? null : out;
}

// ---------------------------------------------------------------------------
// landlord_settings: what a patch from the browser may contain
// ---------------------------------------------------------------------------

type FieldSpec =
  | { kind: "boolean" }
  | { kind: "number"; min: number; max: number }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "money" };

/**
 * The whitelist. A key absent from here cannot reach the database however the
 * request is shaped — which matters because this table sits next to `profiles`
 * in the same session and a patch is a bag of keys from a browser.
 */
export const SETTING_FIELDS: Record<string, FieldSpec> = {
  tenant_maintenance_access: { kind: "boolean" },
  application_screening: { kind: "boolean" },
  accept_partial_payment: { kind: "boolean" },
  accept_future_payments: { kind: "boolean" },
  enable_chat: { kind: "boolean" },
  require_renters_insurance: { kind: "boolean" },
  enable_staff_access: { kind: "boolean" },

  late_fee_enabled: { kind: "boolean" },
  late_fee_type: {
    kind: "enum",
    values: ["none", "fixed", "percentage", "daily"],
  },
  late_fee_amount: { kind: "money" },
  late_fee_percentage: { kind: "number", min: 0, max: 100 },
  grace_period_days: { kind: "number", min: 0, max: 60 },
  late_fee_applies_to: {
    kind: "enum",
    values: ["all_line_items", "rent_only"],
  },

  mpesa_fee_payer: { kind: "enum", values: ["landlord", "tenant"] },
  card_fee_payer: { kind: "enum", values: ["landlord", "tenant"] },

  notify_all_tenants_signed: { kind: "boolean" },
  notify_any_tenant_signs: { kind: "boolean" },
  notify_lease_expiring: { kind: "boolean" },
  lease_expiry_notice_days: { kind: "number", min: 1, max: 365 },

  notify_payment_made: { kind: "boolean" },
  notify_payment_failed: { kind: "boolean" },
  notify_payment_resubmitted: { kind: "boolean" },
  notify_overdue_summary: { kind: "boolean" },
  overdue_summary_day_1: { kind: "number", min: 1, max: 28 },
  overdue_summary_day_2: { kind: "number", min: 1, max: 28 },
  notify_refund_debited: { kind: "boolean" },
  notify_refund_received: { kind: "boolean" },
  notify_funds_disbursed: { kind: "boolean" },

  notify_maintenance_submitted: { kind: "boolean" },
  notify_maintenance_resolved: { kind: "boolean" },
  notify_maintenance_reopened: { kind: "boolean" },
  notify_maintenance_updated: { kind: "boolean" },
  notify_maintenance_comment: { kind: "boolean" },

  notify_application_submitted: { kind: "boolean" },
  notify_insurance_provided_requested: { kind: "boolean" },
  notify_insurance_provided_unrequested: { kind: "boolean" },

  marketing_sms_opt_in: { kind: "boolean" },

  tenant_notify_invoice_due_day: { kind: "boolean" },
  tenant_notify_invoice_late: { kind: "boolean" },
  tenant_notify_invoice_due_soon: { kind: "boolean" },
  tenant_invoice_due_notice_days: { kind: "number", min: 1, max: 30 },
  tenant_notify_lease_expiring: { kind: "boolean" },
  tenant_lease_expiry_notice_days: { kind: "number", min: 1, max: 365 },
};

export type SettingsPatch = Record<string, boolean | number | string | null>;

/**
 * Keep only known keys carrying a value of the right shape and inside the
 * declared range. Returns null when nothing survives, so a caller never issues
 * an empty UPDATE.
 */
export function sanitiseSettingsPatch(
  input: Record<string, unknown>,
): SettingsPatch | null {
  const out: SettingsPatch = {};

  for (const [key, spec] of Object.entries(SETTING_FIELDS)) {
    if (!(key in input)) continue;
    const v = input[key];

    if (spec.kind === "boolean") {
      if (typeof v === "boolean") out[key] = v;
    } else if (spec.kind === "enum") {
      if (typeof v === "string" && spec.values.includes(v)) out[key] = v;
    } else if (spec.kind === "number") {
      // Number("") is 0 and finite, so the empty string is excluded first.
      if (
        typeof v === "number" &&
        Number.isInteger(v) &&
        v >= spec.min &&
        v <= spec.max
      ) {
        out[key] = v;
      }
    } else {
      // money: null clears it, otherwise a non-negative finite number
      if (v === null) out[key] = null;
      else if (typeof v === "number" && Number.isFinite(v) && v >= 0)
        out[key] = v;
    }
  }

  return Object.keys(out).length === 0 ? null : out;
}

/**
 * A late-fee policy that cannot be applied is refused by a CHECK constraint,
 * which would surface as an opaque 23514. Catching it here gives the landlord
 * a sentence instead of a code.
 */
export function lateFeeProblem(patch: SettingsPatch): string | null {
  if (patch.late_fee_enabled !== true) return null;
  const type = patch.late_fee_type;
  if (type === "percentage" && patch.late_fee_percentage == null) {
    return "Set the percentage to charge.";
  }
  if ((type === "fixed" || type === "daily") && patch.late_fee_amount == null) {
    return "Set the amount to charge.";
  }
  return null;
}

export const VERIFICATION_LABELS: Record<string, string> = {
  none: "Not verified",
  phone: "Phone verified",
  id: "ID verified",
  full: "Fully verified",
};

export function verificationLabel(level: string | null): string {
  return VERIFICATION_LABELS[level ?? "none"] ?? "Not verified";
}
