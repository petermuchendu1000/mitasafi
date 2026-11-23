/**
 * Recording a payment against a lease.
 *
 * WHAT THIS REPLACES
 *   The unit detail page had a "Record Payment" button that opened a modal
 *   reading "Payment recording form coming soon..." with a Save button that
 *   closed it and did nothing. Every rent figure on every landlord screen —
 *   the overview tile, the building Finances tab, the arrears table — is
 *   computed from confirmed rent payments, and until now there was no way to
 *   create one through the product at all.
 *
 * THE PERIOD IS NOT THE PAYMENT DATE
 *   payments carries both `payment_date` (when the money arrived) and
 *   (period_year, period_month) (which month's rent it settles). They are
 *   routinely different: November's rent paid on 2 December is a December
 *   payment of November's rent. Every rent-status calculation keys on the
 *   PERIOD, so conflating the two would credit the wrong month and show a
 *   tenant as both overdue and paid up.
 *
 *   A deposit has no period at all, which is why those columns are nullable
 *   and why this sets them only for the types that have one.
 */

/** payments_payment_type_check */
export const PAYMENT_TYPE_VALUES = [
  "rent",
  "deposit",
  "service_charge",
  "water",
  "electricity",
  "late_fee",
  "deposit_refund",
  "repair_deduction",
  "other",
] as const;

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  rent: "Rent",
  deposit: "Deposit",
  service_charge: "Service charge",
  water: "Water",
  electricity: "Electricity",
  late_fee: "Late fee",
  deposit_refund: "Deposit refund",
  repair_deduction: "Repair deduction",
  other: "Other",
};

/** payments_payment_method_check */
export const PAYMENT_METHOD_VALUES = [
  "mpesa",
  "bank",
  "cash",
  "cheque",
  "other",
] as const;

/** Types that settle a particular month and therefore carry a period. */
export const PERIODIC_PAYMENT_TYPES = [
  "rent",
  "service_charge",
  "water",
  "electricity",
  "late_fee",
];

export interface PaymentFormValues {
  amount: string;
  payment_type: string;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  /** "2026-11" from a month input; ignored for types with no period. */
  period: string;
  notes: string;
}

export interface PaymentInsert {
  amount: number;
  payment_type: string;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  period_year: number | null;
  period_month: number | null;
  status: string;
  confirmed_at: string;
  receipt_issued: boolean;
  notes: string | null;
}

export type PaymentErrors = Partial<Record<keyof PaymentFormValues, string>>;

export interface PaymentResult {
  errors: PaymentErrors;
  /** Present only when errors is empty. */
  payment: PaymentInsert | null;
}

function text(v: string | undefined | null): string {
  return (v ?? "").trim();
}

/** Build the row, or say what is wrong with the form. */
export function buildPayment(
  form: PaymentFormValues,
  today: { year: number; month: number; day: number },
): PaymentResult {
  const errors: PaymentErrors = {};

  const amountText = text(form.amount).replace(/,/g, "");
  let amount = 0;
  if (amountText === "") {
    errors.amount = "How much was paid?";
  } else {
    const n = Number(amountText);
    if (!Number.isFinite(n)) errors.amount = "The amount must be a number.";
    else if (n <= 0) errors.amount = "The amount must be more than zero.";
    else if (n > 10_000_000)
      errors.amount = "That amount looks wrong — check it.";
    else amount = Math.round(n * 100) / 100;
  }

  const type = text(form.payment_type) || "rent";
  if (!(PAYMENT_TYPE_VALUES as readonly string[]).includes(type)) {
    errors.payment_type = "Choose what the payment was for.";
  }

  const method = text(form.payment_method) || "mpesa";
  if (!(PAYMENT_METHOD_VALUES as readonly string[]).includes(method)) {
    errors.payment_method = "Choose how it was paid.";
  }

  const dateText = text(form.payment_date);
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  if (!dateMatch) {
    errors.payment_date = "Give the date the money arrived.";
  } else {
    const y = Number(dateMatch[1]);
    const m = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      errors.payment_date = "That is not a real date.";
    } else {
      // A payment dated in the future is almost always a mistyped year, and it
      // would sit in the ledger as money that has not arrived.
      const future =
        y > today.year ||
        (y === today.year && m > today.month) ||
        (y === today.year && m === today.month && d > today.day);
      if (future) errors.payment_date = "That date is in the future.";
      else if (y < today.year - 20)
        errors.payment_date = "That date looks wrong — check the year.";
    }
  }

  let periodYear: number | null = null;
  let periodMonth: number | null = null;
  const needsPeriod = PERIODIC_PAYMENT_TYPES.includes(type);
  if (needsPeriod) {
    const periodMatch = /^(\d{4})-(\d{2})$/.exec(text(form.period));
    if (!periodMatch) {
      errors.period = "Which month does this payment cover?";
    } else {
      periodYear = Number(periodMatch[1]);
      periodMonth = Number(periodMatch[2]);
      if (periodMonth < 1 || periodMonth > 12) {
        errors.period = "That is not a real month.";
        periodYear = null;
        periodMonth = null;
      } else if (periodYear < today.year - 20 || periodYear > today.year + 2) {
        errors.period = "That month looks wrong — check the year.";
        periodYear = null;
        periodMonth = null;
      }
    }
  }

  const reference = text(form.reference_number);
  if (reference.length > 60) {
    errors.reference_number = "That reference is too long.";
  }

  if (Object.keys(errors).length > 0) return { errors, payment: null };

  return {
    errors: {},
    payment: {
      amount,
      payment_type: type,
      payment_date: dateText,
      payment_method: method,
      reference_number: reference === "" ? null : reference,
      period_year: periodYear,
      period_month: periodMonth,
      // A landlord recording a payment they have received is confirming it;
      // 'pending' is for payments the system is told about by someone else.
      status: "confirmed",
      confirmed_at: `${dateText}T00:00:00Z`,
      receipt_issued: false,
      notes: text(form.notes) === "" ? null : text(form.notes),
    },
  };
}
