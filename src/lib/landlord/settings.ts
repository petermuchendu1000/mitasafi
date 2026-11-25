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

export const VERIFICATION_LABELS: Record<string, string> = {
  none: "Not verified",
  phone: "Phone verified",
  id: "ID verified",
  full: "Fully verified",
};

export function verificationLabel(level: string | null): string {
  return VERIFICATION_LABELS[level ?? "none"] ?? "Not verified";
}
