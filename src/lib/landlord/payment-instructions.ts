/**
 * What a tenant is told, and where the rent actually goes.
 *
 * MITASAFI IS A GATEWAY, NOT A CUSTODIAN
 *   The money moves from the tenant to the landlord's own paybill, till,
 *   number or bank account. MitaSafi never receives it, holds no float and
 *   owes no payout. What it does is make the instruction unambiguous and the
 *   payment reconcilable afterwards.
 *
 * THE ACCOUNT REFERENCE IS THE WHOLE POINT
 *   A paybill where every tenant types their own name is a list nobody can
 *   match to a lease. Deriving the reference from the unit — "A1", "B12" —
 *   is what turns a payment into a reconciled one. That is why
 *   `account_reference_mode` exists and why `unit_number` is the default.
 *
 * WHAT THIS MODULE REFUSES TO DO
 *   Guess. If no destination is configured, it returns null and the caller
 *   says so plainly. An invented paybill number would send somebody's rent
 *   to a stranger, which is the worst thing this codebase could do.
 */

export type PayoutMethod =
  | "mpesa_paybill"
  | "mpesa_till"
  | "mpesa_send_money"
  | "bank";

export interface PayoutDestination {
  id: string;
  label: string;
  method: string;
  paybill_number: string | null;
  till_number: string | null;
  mpesa_phone: string | null;
  account_reference_mode: string;
  account_reference: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  instructions: string | null;
  is_default: boolean;
  all_properties: boolean;
  building_ids: string[];
}

export const PAYOUT_METHODS: {
  value: PayoutMethod;
  label: string;
  blurb: string;
}[] = [
  {
    value: "mpesa_paybill",
    label: "M-Pesa paybill",
    blurb: "A business number where each tenant types an account number.",
  },
  {
    value: "mpesa_till",
    label: "M-Pesa till (buy goods)",
    blurb: "A till number. No account field, so payments are harder to match.",
  },
  {
    value: "mpesa_send_money",
    label: "M-Pesa to my phone",
    blurb:
      "Send money to your own number. Simple, and the hardest to reconcile.",
  },
  {
    value: "bank",
    label: "Bank transfer",
    blurb: "Your bank account. Slower to clear, best for large amounts.",
  },
];

export const REFERENCE_MODES: {
  value: string;
  label: string;
  blurb: string;
}[] = [
  {
    value: "unit_number",
    label: "The unit number",
    blurb: "Recommended — this is what makes a payment reconcilable.",
  },
  {
    value: "tenant_phone",
    label: "The tenant's phone number",
    blurb: "Workable, but two tenants sharing a unit will collide.",
  },
  {
    value: "custom",
    label: "A fixed reference",
    blurb: "The same text for everyone. Hardest to match to a lease.",
  },
];

export interface TenantContext {
  unitNumber: string | null;
  tenantPhone: string | null;
}

/** What the tenant should type in the account field, or null if there is none. */
export function accountReferenceFor(
  d: PayoutDestination,
  ctx: TenantContext,
): string | null {
  switch (d.account_reference_mode) {
    case "unit_number":
      return ctx.unitNumber?.trim() || null;
    case "tenant_phone":
      return ctx.tenantPhone?.trim() || null;
    case "custom":
      return d.account_reference?.trim() || null;
    default:
      return null;
  }
}

export interface PaymentInstruction {
  /** "M-Pesa paybill 522533" — the destination, in one line. */
  headline: string;
  /** Ordered steps, already carrying the reference. */
  steps: string[];
  /** The reference, surfaced separately so the UI can emphasise it. */
  reference: string | null;
  /** True when the reference could not be resolved, so matching will be manual. */
  referenceMissing: boolean;
  /** Anything the landlord added by hand. */
  note: string | null;
}

/**
 * Pick the destination that applies to a building: the one assigned to it,
 * otherwise the default. Returns null when the landlord has configured none —
 * and the caller must say so rather than inventing anything.
 */
export function destinationFor(
  destinations: PayoutDestination[],
  buildingId: string | null,
): PayoutDestination | null {
  if (destinations.length === 0) return null;
  if (buildingId) {
    const specific = destinations.find(
      (d) => !d.all_properties && d.building_ids.includes(buildingId),
    );
    if (specific) return specific;
  }
  return (
    destinations.find((d) => d.is_default) ??
    destinations.find((d) => d.all_properties) ??
    null
  );
}

export function buildInstruction(
  d: PayoutDestination,
  ctx: TenantContext,
): PaymentInstruction {
  const reference = accountReferenceFor(d, ctx);
  const refText = reference ?? "your unit number";
  const note = d.instructions?.trim() || null;

  if (d.method === "mpesa_paybill") {
    return {
      headline: `M-Pesa paybill ${d.paybill_number}`,
      steps: [
        "Open M-Pesa and choose Lipa na M-Pesa, then Pay Bill.",
        `Business number: ${d.paybill_number}`,
        `Account number: ${refText}`,
        "Enter the amount and your M-Pesa PIN.",
        "Keep the confirmation SMS — the code on it is your receipt.",
      ],
      reference,
      referenceMissing: reference === null,
      note,
    };
  }

  if (d.method === "mpesa_till") {
    return {
      headline: `M-Pesa till ${d.till_number}`,
      steps: [
        "Open M-Pesa and choose Lipa na M-Pesa, then Buy Goods and Services.",
        `Till number: ${d.till_number}`,
        "Enter the amount and your M-Pesa PIN.",
        // Said out loud: a till carries no account field, so the landlord has
        // to match the payment by name and amount.
        "A till has no account field, so send your landlord the confirmation code.",
      ],
      reference: null,
      referenceMissing: true,
      note,
    };
  }

  if (d.method === "mpesa_send_money") {
    return {
      headline: `M-Pesa to ${d.mpesa_phone}`,
      steps: [
        "Open M-Pesa and choose Send Money.",
        `Phone number: ${d.mpesa_phone}`,
        "Enter the amount and your M-Pesa PIN.",
        "Send your landlord the confirmation code so the payment can be matched.",
      ],
      reference: null,
      referenceMissing: true,
      note,
    };
  }

  return {
    headline: `${d.bank_name} — ${d.bank_account_number}`,
    steps: [
      `Bank: ${d.bank_name}${d.bank_branch ? `, ${d.bank_branch} branch` : ""}`,
      `Account name: ${d.bank_account_name}`,
      `Account number: ${d.bank_account_number}`,
      `Reference: ${refText}`,
      "Bank transfers can take a day to clear.",
    ],
    reference,
    referenceMissing: reference === null,
    note,
  };
}

/** One line summarising a destination for a list. */
export function describeDestination(d: PayoutDestination): string {
  switch (d.method) {
    case "mpesa_paybill":
      return `Paybill ${d.paybill_number}`;
    case "mpesa_till":
      return `Till ${d.till_number}`;
    case "mpesa_send_money":
      return `M-Pesa ${d.mpesa_phone}`;
    case "bank":
      return `${d.bank_name} ${d.bank_account_number}`;
    default:
      return d.label;
  }
}
