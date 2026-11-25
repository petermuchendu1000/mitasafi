/**
 * What came in, and what went out.
 *
 * TWO THINGS THIS REFUSES TO DO, BOTH OF WHICH WOULD FLATTER THE NUMBERS
 *
 * A DEPOSIT IS NOT INCOME. It is money held against a tenancy and owed back
 * at the end of it. Counting the three deposits in this portfolio as earnings
 * would overstate income by their full value and would keep overstating it
 * every month they sit there. They are reported separately, as a balance held.
 *
 * AN ESTIMATE IS NOT SPEND. maintenance_requests carries estimated_cost and
 * actual_cost. A job quoted at 18,000 and not yet done has cost nothing. Only
 * actual_cost counts as money out; estimates are shown as what is committed,
 * under their own heading.
 *
 * AND ONE THING IT CANNOT DO
 *   There is no expenses table on this project. Across all 86 deployed tables
 *   the only landlord outgoing recorded anywhere is maintenance cost. So the
 *   expenses side is maintenance spend and says so — it is not a general
 *   ledger, and presenting it as one would be a lie told in a total.
 */

import { type CivilDate, civilFromISO } from "./rent-status";

/** payments.payment_type values that are earnings. */
export const INCOME_TYPES = [
  "rent",
  "service_charge",
  "water",
  "electricity",
  "late_fee",
  "other",
] as const;

/** Held against the tenancy and owed back; a balance, not earnings. */
export const DEPOSIT_TYPES = ["deposit"] as const;

/** Money going back out to a tenant, which reduces what was taken in. */
export const REFUND_TYPES = ["deposit_refund"] as const;

export const INCOME_TYPE_LABELS: Record<string, string> = {
  rent: "Rent",
  service_charge: "Service charge",
  water: "Water",
  electricity: "Electricity",
  late_fee: "Late fees",
  repair_deduction: "Repair deductions",
  other: "Other",
  deposit: "Deposits",
  deposit_refund: "Deposit refunds",
};

export interface PaymentInput {
  amount: number;
  payment_type: string | null;
  status: string | null;
  payment_date: string | null;
}

export interface MaintenanceCostInput {
  actual_cost: number | null;
  estimated_cost: number | null;
  cost_paid_by: string | null;
  status: string | null;
  category: string | null;
  completed_at: string | null;
  reported_at: string | null;
}

export interface MonthBucket {
  year: number;
  month: number;
  label: string;
  amount: number;
}

export interface IncomeSummary {
  /** Earnings only: deposits excluded, refunds subtracted. */
  received: number;
  /** A breakdown of `received`. Sums to it exactly; holds no deposit row. */
  byType: { type: string; label: string; amount: number }[];
  /** Held against tenancies. Reported, never added to `received`. */
  depositsHeld: number;
  refunded: number;
  months: MonthBucket[];
  countedPayments: number;
  /** Payments ignored because they are not confirmed money. */
  unconfirmed: number;
}

export interface ExpenseSummary {
  /** Money actually spent: actual_cost on jobs the landlord pays for. */
  spent: number;
  /** Quoted but not yet spent. Never added to `spent`. */
  committed: number;
  byCategory: { category: string; amount: number }[];
  months: MonthBucket[];
  jobsWithCost: number;
  /** Jobs with no cost recorded at all, which is a gap, not a zero. */
  jobsWithoutCost: number;
  /** Costs someone else bears, excluded from `spent`. */
  borneByOthers: number;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** The N months ending with `today`, oldest first, zero-filled. */
function emptyMonths(today: CivilDate, count: number): MonthBucket[] {
  const out: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const zero = today.month - 1 - i;
    const year = today.year + Math.floor(zero / 12);
    const month = (((zero % 12) + 12) % 12) + 1;
    out.push({
      year,
      month,
      label: `${MONTH_SHORT[month - 1]} ${year}`,
      amount: 0,
    });
  }
  return out;
}

function addToMonth(months: MonthBucket[], iso: string | null, amount: number) {
  if (!iso) return;
  const d = civilFromISO(iso);
  if (!d) return;
  const b = months.find((m) => m.year === d.year && m.month === d.month);
  // Older than the window is still counted in the totals, just not charted.
  if (b) b.amount += amount;
}

export function summariseIncome(
  payments: PaymentInput[],
  today: CivilDate,
  monthCount = 6,
): IncomeSummary {
  const months = emptyMonths(today, monthCount);
  const byType = new Map<string, number>();
  let received = 0;
  let depositsHeld = 0;
  let refunded = 0;
  let counted = 0;
  let unconfirmed = 0;

  for (const p of payments) {
    // Only money that actually arrived. A pending payment is a promise.
    if (p.status !== "confirmed") {
      unconfirmed += 1;
      continue;
    }
    const amount = Math.max(0, p.amount);
    const type = p.payment_type ?? "other";
    counted += 1;

    if ((DEPOSIT_TYPES as readonly string[]).includes(type)) {
      depositsHeld += amount;
      continue; // never earnings
    }
    if ((REFUND_TYPES as readonly string[]).includes(type)) {
      refunded += amount;
      depositsHeld -= amount;
      continue;
    }
    // Only now, below both continues: byType is a breakdown of `received` and
    // nothing else. A deposit row sitting in this table would make the column
    // add up to a number larger than the figure it appears beneath, which is
    // the same overstatement in a different shape.
    byType.set(type, (byType.get(type) ?? 0) + amount);
    received += amount;
    addToMonth(months, p.payment_date, amount);
  }

  return {
    received,
    byType: [...byType.entries()]
      .map(([type, amount]) => ({
        type,
        label: INCOME_TYPE_LABELS[type] ?? type.replace(/_/g, " "),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
    depositsHeld: Math.max(0, depositsHeld),
    refunded,
    months,
    countedPayments: counted,
    unconfirmed,
  };
}

export function summariseExpenses(
  jobs: MaintenanceCostInput[],
  today: CivilDate,
  monthCount = 6,
): ExpenseSummary {
  const months = emptyMonths(today, monthCount);
  const byCategory = new Map<string, number>();
  let spent = 0;
  let committed = 0;
  let withCost = 0;
  let withoutCost = 0;
  let borneByOthers = 0;

  for (const j of jobs) {
    const actual = j.actual_cost ?? null;
    const estimate = j.estimated_cost ?? null;

    if (actual === null && estimate === null) {
      withoutCost += 1;
      continue;
    }

    // A cost the tenant, a warranty or the building bears is not this
    // landlord's expense. Unknown is treated as theirs, because an unrecorded
    // payer on a landlord's own job is far more likely to be theirs than not,
    // and understating spend is the worse error here.
    const theirs = j.cost_paid_by === null || j.cost_paid_by === "landlord";
    if (!theirs) {
      borneByOthers += Math.max(0, actual ?? estimate ?? 0);
      continue;
    }

    if (actual !== null) {
      const amount = Math.max(0, actual);
      spent += amount;
      withCost += 1;
      byCategory.set(
        j.category ?? "other",
        (byCategory.get(j.category ?? "other") ?? 0) + amount,
      );
      addToMonth(months, j.completed_at ?? j.reported_at, amount);
    } else {
      // Quoted, not yet paid. Kept out of `spent` on purpose.
      committed += Math.max(0, estimate ?? 0);
    }
  }

  return {
    spent,
    committed,
    byCategory: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    months,
    jobsWithCost: withCost,
    jobsWithoutCost: withoutCost,
    borneByOthers,
  };
}
