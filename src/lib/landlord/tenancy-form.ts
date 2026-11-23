/**
 * Validation and mapping for Add Tenant — which writes a tenant AND a lease.
 *
 * WHAT THIS REPLACES
 *   add-tenant/page.tsx collected three steps and then did:
 *     await new Promise((resolve) => setTimeout(resolve, 1500));
 *     console.log("Saving tenant:", formData);
 *     router.push(.../units/${unitId});
 *   — sending the landlord back to a unit that still had no tenant.
 *
 * ANOTHER ENUM THE DATABASE WOULD HAVE REJECTED
 *   Its ID_TYPES offered `military_id`. tenants_id_type_check permits
 *   national_id | passport | alien_id. Alien ID is the one Kenyan landlords
 *   actually need for foreign tenants and the form did not offer it.
 *
 * ONE SCREEN, TWO TABLES, THREE WRITES
 *   A tenancy is a `tenants` row, a `leases` row pointing at it and the unit,
 *   and `units.status = 'occupied'`. This module produces the first two and
 *   says nothing about ordering; the action owns that, and owns undoing a
 *   partial write.
 *
 * NAMES
 *   The form had first_name and last_name; tenants has a single `full_name`.
 *   Joining them here rather than storing two columns that do not exist is the
 *   whole of the mapping, but it has to not produce "Brian  " when one half is
 *   blank — hence the filter.
 */

import type { Json } from "@/types/database";
import { civilFromISO, compareCivil } from "./rent-status";

/** tenants_id_type_check */
export const ID_TYPE_VALUES = ["national_id", "passport", "alien_id"] as const;

export const ID_TYPE_LABELS: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  alien_id: "Alien ID",
};

/** leases_payment_method_check */
export const LEASE_PAYMENT_METHODS = [
  "mpesa",
  "bank",
  "cash",
  "cheque",
  "mixed",
] as const;

export const RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Sibling",
  "Child",
  "Friend",
  "Colleague",
  "Other",
] as const;

export interface TenancyFormValues {
  // Who
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  id_type: string;
  id_number: string;
  occupation: string;
  employer: string;
  // Emergency contact
  emergency_name: string;
  emergency_phone: string;
  emergency_relationship: string;
  // Lease
  start_date: string;
  end_date: string;
  monthly_rent: string;
  deposit_amount: string;
  deposit_paid: boolean;
  rent_due_day: string;
  payment_method: string;
  notes: string;
}

export interface TenantInsert {
  full_name: string;
  phone: string;
  email: string | null;
  id_type: string | null;
  id_number: string | null;
  occupation: string | null;
  employer: string | null;
  emergency_contact: Json;
  status: string;
  notes: string | null;
}

export interface LeaseInsert {
  start_date: string;
  end_date: string | null;
  lease_type: string;
  monthly_rent: number;
  rent_due_day: number;
  deposit_amount: number | null;
  deposit_status: string;
  payment_method: string;
  status: string;
}

export type TenancyErrors = Partial<Record<keyof TenancyFormValues, string>>;

export interface TenancyResult {
  errors: TenancyErrors;
  /** Both present, or both null. */
  tenant: TenantInsert | null;
  lease: LeaseInsert | null;
}

function text(v: string | undefined | null): string {
  return (v ?? "").trim();
}

function optionalText(v: string | undefined | null): string | null {
  const t = text(v);
  return t === "" ? null : t;
}

/**
 * Normalise a Kenyan mobile number to +254 form.
 *
 * The form's old check was `/^0[17]\d{8}$/`, which refused every number
 * already stored in +254 form — including the ones the rest of this codebase
 * writes. Landlords type both, and a tenant's number reaching the database in
 * two shapes makes it un-searchable, so they are normalised to one.
 *
 * Returns null for anything that is not a Kenyan mobile number.
 */
export function normaliseKenyanPhone(raw: string): string | null {
  const digits = text(raw).replace(/[\s()-]/g, "");
  if (digits === "") return null;

  let local: string | null = null;
  if (/^0[17]\d{8}$/.test(digits)) {
    local = digits.slice(1);
  } else if (/^\+254[17]\d{8}$/.test(digits)) {
    local = digits.slice(4);
  } else if (/^254[17]\d{8}$/.test(digits)) {
    local = digits.slice(3);
  } else if (/^[17]\d{8}$/.test(digits)) {
    local = digits;
  }
  return local === null ? null : `+254${local}`;
}

/** Build both rows, or say what is wrong with the form. */
export function buildTenancy(
  form: TenancyFormValues,
  today: { year: number; month: number; day: number },
): TenancyResult {
  const errors: TenancyErrors = {};

  const first = text(form.first_name);
  const last = text(form.last_name);
  if (first === "") errors.first_name = "First name is required.";
  if (last === "") errors.last_name = "Last name is required.";
  const fullName = [first, last].filter(Boolean).join(" ");
  if (fullName.length > 120) errors.last_name = "That name is too long.";

  const phone = normaliseKenyanPhone(form.phone);
  if (text(form.phone) === "") {
    errors.phone = "A phone number is required.";
  } else if (!phone) {
    errors.phone =
      "Enter a Kenyan mobile number, like 0712345678 or +254712345678.";
  }

  const email = optionalText(form.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "That email address does not look right.";
  }

  const idType = text(form.id_type);
  if (
    idType !== "" &&
    !(ID_TYPE_VALUES as readonly string[]).includes(idType)
  ) {
    errors.id_type = "Choose an ID type.";
  }
  const idNumber = optionalText(form.id_number);
  if (idNumber && idNumber.length > 40) {
    errors.id_number = "That ID number is too long.";
  }

  const emergencyPhoneRaw = text(form.emergency_phone);
  const emergencyPhone = emergencyPhoneRaw
    ? normaliseKenyanPhone(emergencyPhoneRaw)
    : null;
  if (emergencyPhoneRaw !== "" && !emergencyPhone) {
    errors.emergency_phone = "Enter a Kenyan mobile number.";
  }

  // ---- lease

  const start = civilFromISO(text(form.start_date));
  if (!start) errors.start_date = "Give the date the tenancy starts.";

  let end = null as ReturnType<typeof civilFromISO>;
  const endText = text(form.end_date);
  if (endText !== "") {
    end = civilFromISO(endText);
    if (!end) errors.end_date = "That end date is not a date.";
    else if (start && compareCivil(end, start) <= 0) {
      errors.end_date = "The lease must end after it starts.";
    }
  }

  // A start date far in the past is usually a typo for the current year, and
  // it silently backdates every month of rent owed.
  if (start && start.year < today.year - 20) {
    errors.start_date = "That start date looks wrong — check the year.";
  }

  const rentText = text(form.monthly_rent).replace(/,/g, "");
  let monthlyRent = 0;
  if (rentText === "") {
    errors.monthly_rent = "Monthly rent is required.";
  } else {
    const n = Number(rentText);
    if (!Number.isFinite(n)) errors.monthly_rent = "Rent must be a number.";
    else if (n <= 0) errors.monthly_rent = "Rent must be more than zero.";
    else if (n > 10_000_000)
      errors.monthly_rent = "That rent looks wrong — check it.";
    else monthlyRent = Math.round(n * 100) / 100;
  }

  let deposit: number | null = null;
  const depositText = text(form.deposit_amount).replace(/,/g, "");
  if (depositText !== "") {
    const n = Number(depositText);
    if (!Number.isFinite(n))
      errors.deposit_amount = "Deposit must be a number.";
    else if (n < 0) errors.deposit_amount = "Deposit cannot be negative.";
    else if (n > 10_000_000)
      errors.deposit_amount = "That deposit looks wrong — check it.";
    else deposit = Math.round(n * 100) / 100;
  }

  // leases_rent_due_day_check is (>= 1 AND <= 28). 29-31 is refused by the
  // database, and the reason is that not every month has those days.
  let rentDueDay = 5;
  const dueText = text(form.rent_due_day);
  if (dueText !== "") {
    if (!/^\d+$/.test(dueText)) {
      errors.rent_due_day = "The rent day must be a whole number.";
    } else {
      const n = Number(dueText);
      if (n < 1 || n > 28) {
        errors.rent_due_day =
          "Pick a day from 1 to 28 — later days do not exist in every month.";
      } else {
        rentDueDay = n;
      }
    }
  }

  const paymentMethod = text(form.payment_method) || "mpesa";
  if (!(LEASE_PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
    errors.payment_method = "Choose how rent will be paid.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, tenant: null, lease: null };
  }

  const emergency: Record<string, string> = {};
  if (text(form.emergency_name)) emergency.name = text(form.emergency_name);
  if (emergencyPhone) emergency.phone = emergencyPhone;
  if (text(form.emergency_relationship))
    emergency.relationship = text(form.emergency_relationship);

  return {
    errors: {},
    tenant: {
      full_name: fullName,
      // phone is NOT NULL and is validated above, so it cannot be null here.
      phone: phone as string,
      email,
      id_type: idNumber ? idType || "national_id" : optionalText(idType),
      id_number: idNumber,
      occupation: optionalText(form.occupation),
      employer: optionalText(form.employer),
      emergency_contact: emergency,
      status: "active",
      notes: optionalText(form.notes),
    },
    lease: {
      start_date: text(form.start_date),
      end_date: endText === "" ? null : endText,
      lease_type: endText === "" ? "month_to_month" : "fixed",
      monthly_rent: monthlyRent,
      rent_due_day: rentDueDay,
      deposit_amount: deposit,
      // 'held' means the landlord has the money. Saying so when they have not
      // collected it would show in the portfolio's "deposits held" total, so
      // an unpaid deposit is 'pending'.
      deposit_status: form.deposit_paid ? "held" : "pending",
      payment_method: paymentMethod,
      status: "active",
    },
  };
}
