/**
 * The tenant's position, in the few numbers they look for first.
 *
 * Everything here is derived from the same functions the landlord's screens
 * use — rentStatusForPeriod for the month, buildStatement for the ledger —
 * so a tenant and their landlord cannot be shown different answers to the
 * same question. That is the only thing this module is really for.
 */

import {
  rentStatusForPeriod,
  civilFromISO,
  compareCivil,
  type CivilDate,
} from "@/lib/landlord/rent-status";
import type {
  StatementLease,
  StatementPayment,
} from "@/lib/landlord/statement";

export interface TenancySummary {
  /** This month's rent position. */
  due: number;
  paid: number;
  balance: number;
  status: "paid" | "partial" | "pending" | "overdue";
  daysLate: number;
  dueDate: CivilDate;
  /** Last day a payment counts as on time. */
  graceEndsOn: CivilDate;
  /** Whole days until rent is next due. Negative once it has passed. */
  daysUntilDue: number;
  /** Days until the lease ends; null when open-ended. Negative if passed. */
  daysUntilEnd: number | null;
  depositHeld: number;
  /** Every confirmed rent payment ever, summed. */
  lifetimeRentPaid: number;
}

function daysBetween(from: CivilDate, to: CivilDate): number {
  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
      86_400_000,
  );
}

export function tenancySummary(
  lease: StatementLease,
  payments: StatementPayment[],
  today: CivilDate,
): TenancySummary {
  const period = { year: today.year, month: today.month };

  let paidThisMonth = 0;
  let lifetime = 0;
  for (const p of payments) {
    if (p.payment_type !== "rent") continue;
    if (p.status !== "confirmed") continue;
    lifetime += Math.max(0, p.amount);
    if (p.period_year === period.year && p.period_month === period.month) {
      paidThisMonth += Math.max(0, p.amount);
    }
  }

  const s = rentStatusForPeriod({
    monthlyRent: lease.monthly_rent,
    rentDueDay: lease.rent_due_day,
    gracePeriodDays: lease.grace_period_days,
    amountPaid: paidThisMonth,
    period,
    today,
    leaseStart: civilFromISO(lease.start_date),
  });

  const end = lease.end_date ? civilFromISO(lease.end_date) : null;

  return {
    due: s.due,
    paid: s.paid,
    balance: s.balance,
    status: s.status,
    daysLate: s.daysLate,
    dueDate: s.dueDate,
    graceEndsOn: s.graceEndsOn,
    daysUntilDue: daysBetween(today, s.dueDate),
    daysUntilEnd: end ? daysBetween(today, end) : null,
    depositHeld: Math.max(0, lease.deposit_amount),
    // Lifetime includes rent with no period recorded: the tenant paid it,
    // so it counts toward what they have paid even though no month can
    // claim it. The statement shows those separately.
    lifetimeRentPaid: lifetime,
  };
}

/** "Due in 3 days", "Due today", "9 days late". Terse on purpose. */
export function duePhrase(s: TenancySummary): string {
  if (s.status === "paid") return "Paid";
  if (s.daysLate > 0)
    return `${s.daysLate} ${s.daysLate === 1 ? "day" : "days"} late`;
  if (s.daysUntilDue > 0)
    return `Due in ${s.daysUntilDue} ${s.daysUntilDue === 1 ? "day" : "days"}`;
  if (s.daysUntilDue === 0) return "Due today";
  // Past the due date but inside the grace period.
  return "Due";
}

export { compareCivil };
