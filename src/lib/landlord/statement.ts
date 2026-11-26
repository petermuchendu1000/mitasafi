/**
 * A tenant's rent statement: what was charged, what was paid, what is left.
 *
 * THE RULE THAT MATTERS MOST HERE
 *   A statement is handed to the person being asked to pay. So it must
 *   ACCOUNT FOR EVERY PAYMENT. The arrears report and the collections report
 *   both skip a confirmed rent payment whose period is null, because they
 *   are answering "what is owed this month" and a payment with no month
 *   cannot answer it. Doing the same here would show a tenant a statement
 *   missing money they actually sent — the one error they are certain to
 *   notice, and the one that destroys trust in every other figure on the
 *   page. Those payments get their own section instead, with their total,
 *   and they are named as unallocated rather than quietly dropped.
 *
 * AND THE RULE FROM EVERYWHERE ELSE, WHICH BITES HARDEST HERE
 *   Charges begin at the first month rent was recorded against the lease,
 *   never at the lease start. A tenancy running since February whose
 *   landlord began recording in August owes nothing for February to July on
 *   this statement; it has no records for those months, which is not the
 *   same thing as six months of arrears. Getting this wrong elsewhere
 *   produces a wrong number on a screen. Getting it wrong here produces a
 *   demand for 180,000 shillings, in writing, to a tenant who may well have
 *   paid it in cash.
 *
 * WHAT IS NOT CHARGED
 *   Water, service charge, electricity and late fees are recorded as
 *   PAYMENTS in this system and never as charges — there is no invoice
 *   table. Applying them against rent would make the rent balance wrong in
 *   the tenant's favour and the statement wrong in both directions, so they
 *   are listed as received and kept out of the rent arithmetic entirely.
 *
 *   A deposit is money held and owed back. It is reported, never netted off.
 */

import {
  rentStatusForPeriod,
  leaseCoversPeriod,
  earliestRecordedPeriod,
  beforePeriod,
  periodKey,
  civilFromISO,
  recentPeriods,
  type CivilDate,
} from "./rent-status";

export interface StatementLease {
  id: string;
  unit_label: string;
  building_label: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: number;
  grace_period_days: number;
  deposit_amount: number;
}

export interface StatementPayment {
  id: string;
  amount: number;
  payment_type: string;
  status: string | null;
  period_year: number | null;
  period_month: number | null;
  payment_date: string | null;
  payment_method: string | null;
  reference_number: string | null;
  mpesa_receipt?: string | null;
}

export interface StatementLine {
  /** "Nov 2026" */
  period: string;
  /** "2026-11" */
  key: string;
  charged: number;
  paid: number;
  /** Cumulative, after this month. Negative means the tenant is in credit. */
  balance: number;
}

export interface OtherPayment {
  id: string;
  date: string;
  type: string;
  label: string;
  amount: number;
  reference: string | null;
}

export interface Statement {
  lines: StatementLine[];
  totalCharged: number;
  totalPaid: number;
  /** Positive = owed by the tenant. Negative = in credit. */
  closingBalance: number;
  /**
   * Confirmed RENT with no period recorded. Real money that cannot be
   * placed in a month; shown so the statement adds up for its reader.
   */
  unallocated: OtherPayment[];
  unallocatedTotal: number;
  /** Confirmed non-rent, non-deposit payments. Never applied to rent. */
  other: OtherPayment[];
  otherTotal: number;
  /**
   * What the LEASE says is held. Kept apart from the payments below: a
   * statement that lists "Deposit held 140,000" and then a deposit payment
   * of 140,000 reads as 280,000 to the person being handed it.
   */
  depositHeld: number;
  /** The deposit payments actually recorded — the evidence for the figure. */
  depositPayments: OtherPayment[];
  depositPaid: number;
  /** null when no rent has ever been recorded against this lease. */
  from: string | null;
  to: string;
  /** Payments that are not confirmed, counted but never added anywhere. */
  unconfirmedCount: number;
}

const MONTHS = [
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

export function monthLabel(p: { year: number; month: number }): string {
  return `${MONTHS[p.month - 1] ?? "?"} ${p.year}`;
}

const TYPE_LABELS: Record<string, string> = {
  rent: "Rent",
  deposit: "Deposit",
  service_charge: "Service charge",
  water: "Water",
  electricity: "Electricity",
  late_fee: "Late fee",
  deposit_refund: "Deposit refund",
  other: "Other",
};

function asOther(p: StatementPayment): OtherPayment {
  return {
    id: p.id,
    date: p.payment_date ?? "",
    type: p.payment_type,
    label: TYPE_LABELS[p.payment_type] ?? p.payment_type.replace(/_/g, " "),
    amount: Math.max(0, p.amount),
    reference: p.mpesa_receipt ?? p.reference_number ?? null,
  };
}

export function buildStatement(
  lease: StatementLease,
  payments: StatementPayment[],
  today: CivilDate,
  /** How far back to look for the ledger start. */
  maxMonths = 36,
): Statement {
  const confirmed = payments.filter((p) => p.status === "confirmed");
  const unconfirmedCount = payments.length - confirmed.length;

  // Confirmed rent, by period.
  const paidByPeriod = new Map<string, number>();
  const unallocated: OtherPayment[] = [];
  const other: OtherPayment[] = [];
  const depositPayments: OtherPayment[] = [];

  for (const p of confirmed) {
    // A deposit is neither rent nor a charge, and it must appear exactly
    // ONCE on the statement, beneath the figure it evidences.
    if (p.payment_type === "deposit") {
      depositPayments.push(asOther(p));
      continue;
    }
    if (p.payment_type !== "rent") {
      other.push(asOther(p));
      continue;
    }
    if (p.period_year === null || p.period_month === null) {
      // Real money, no month. Not dropped — see the note at the top.
      unallocated.push(asOther(p));
      continue;
    }
    const k = periodKey({ year: p.period_year, month: p.period_month });
    paidByPeriod.set(k, (paidByPeriod.get(k) ?? 0) + Math.max(0, p.amount));
  }

  const current = { year: today.year, month: today.month };
  const ledgerStart = earliestRecordedPeriod(paidByPeriod);

  const lines: StatementLine[] = [];
  let totalCharged = 0;
  let totalPaid = 0;
  let running = 0;

  if (ledgerStart) {
    for (const p of recentPeriods(current, Math.max(1, maxMonths))) {
      if (beforePeriod(p, ledgerStart)) continue;
      if (!leaseCoversPeriod(lease, p)) continue;

      const paid = paidByPeriod.get(periodKey(p)) ?? 0;
      // rentStatusForPeriod is what every other screen uses to decide what a
      // month costs, including the mid-month move-in rule. Recomputing it
      // here by hand is how a statement starts disagreeing with the arrears
      // report about the same lease.
      const s = rentStatusForPeriod({
        monthlyRent: lease.monthly_rent,
        rentDueDay: lease.rent_due_day,
        gracePeriodDays: lease.grace_period_days,
        amountPaid: paid,
        period: p,
        today,
        leaseStart: civilFromISO(lease.start_date),
      });

      totalCharged += s.due;
      totalPaid += paid;
      running += s.due - paid;
      lines.push({
        period: monthLabel(p),
        key: periodKey(p),
        charged: s.due,
        paid,
        balance: running,
      });
    }
  }

  return {
    lines,
    totalCharged,
    totalPaid,
    closingBalance: running,
    unallocated,
    unallocatedTotal: unallocated.reduce((n, p) => n + p.amount, 0),
    other,
    otherTotal: other.reduce((n, p) => n + p.amount, 0),
    depositHeld: Math.max(0, lease.deposit_amount),
    depositPayments,
    depositPaid: depositPayments.reduce((n, p) => n + p.amount, 0),
    from: lines.length > 0 ? lines[0].period : null,
    to: monthLabel(current),
    unconfirmedCount,
  };
}
