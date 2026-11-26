/**
 * Is this month's rent paid, and if not, how late is it?
 *
 * WHY THIS IS A MODULE AND NOT A TERNARY IN A COMPONENT
 *   The building detail page previously carried a hardcoded `rent_status` on each of
 *   eight invented units — "paid", "overdue", "pending" written by hand. Nothing
 *   computed it, so there was no rule to be right or wrong about. A real answer has
 *   to come from three things the database actually holds: what the lease says is
 *   due, which confirmed rent payments cover the period, and what day it is in
 *   Nairobi. That is a rule worth stating once and testing, not inlining four times.
 *
 * THE RULE
 *   paid     the confirmed rent for the period covers the month's rent
 *   partial  some confirmed rent arrived, but not all of it
 *   pending  nothing has arrived and the grace period has not run out
 *   overdue  nothing has arrived and the grace period has run out
 *
 *   `partial` takes precedence over the calendar on purpose. A tenant who paid
 *   70,000 of 140,000 has not "not paid" — calling that `overdue` loses the fact
 *   that money arrived, and calling it `paid` loses the balance. The balance is
 *   returned alongside the status so the caller never has to guess.
 *
 * DATES ARE CIVIL DATES, IN NAIROBI
 *   Rent is due on a day of the month, which is a calendar fact, not an instant.
 *   Comparing `new Date()` against a date-only column is how off-by-one-day bugs
 *   get shipped: at 01:00 in Nairobi it is still the previous day in UTC, so a
 *   server rendering a Kenyan landlord's page would mark rent overdue a day early
 *   (or late, in the other direction). Everything here works on {year, month, day}
 *   triples, and the only place a real clock is read is `nairobiToday`.
 */

/** A calendar date with no time and no zone. month is 1-12. */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

/** Today, as the calendar reads in Nairobi, whatever zone the server is in. */
export function nairobiToday(now: Date = new Date()): CivilDate {
  // en-CA gives YYYY-MM-DD, which is the one format that needs no parsing by position.
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const parsed = civilFromISO(iso);
  // en-CA is YYYY-MM-DD in every ICU build, so this cannot be reached; falling
  // back to the UTC date is still better than throwing on a page render.
  return (
    parsed ?? {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
    }
  );
}

/**
 * The civil date at the front of an ISO string.
 *
 * Accepts "2026-11-23" and "2026-11-23T09:00:00Z" alike, and reads only the date
 * part of either — a timestamptz from the database is NOT shifted into a zone here,
 * because the values this is used on (period starts, lease dates) are stored as the
 * calendar dates they mean.
 */
export function civilFromISO(iso: string): CivilDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Negative if a is earlier, 0 if the same day, positive if a is later. */
export function compareCivil(a: CivilDate, b: CivilDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** Days in a month, so a due day can never land outside it. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** n days after a civil date, rolling over months and years. */
export function addDays(date: CivilDate, n: number): CivilDate {
  const t = Date.UTC(date.year, date.month - 1, date.day) + n * 86_400_000;
  const d = new Date(t);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/** "2026-11-23" */
export function formatCivil(date: CivilDate): string {
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  return `${date.year}-${mm}-${dd}`;
}

export type RentStatus = "paid" | "partial" | "pending" | "overdue";

export interface RentStatusInput {
  /** leases.monthly_rent for the period being judged. */
  monthlyRent: number;
  /** leases.rent_due_day — the column is CHECK (1..28), but clamped here anyway. */
  rentDueDay: number;
  /** leases.grace_period_days. */
  gracePeriodDays: number;
  /** Sum of CONFIRMED rent payments whose period is the one being judged. */
  amountPaid: number;
  /** The period: which month's rent this is about. */
  period: { year: number; month: number };
  /** The day to judge it on, in Nairobi. */
  today: CivilDate;
  /**
   * When the tenancy began, if it began during this period.
   *
   * A tenant who moved in on the 23rd does not owe rent that was "due on the
   * 5th" of that same month — there was no tenancy on the 5th. Without this,
   * every mid-month move-in is marked overdue on day one and the landlord's
   * brand-new tenant appears in arrears. Measured: a lease starting 23 Nov
   * with rent due on the 5th rendered "Paid · 13d late" on the day it was
   * created.
   */
  leaseStart?: CivilDate | null;
}

export interface RentStatusResult {
  status: RentStatus;
  /** What the lease says is owed for the month. */
  due: number;
  /** What has actually been confirmed against it. */
  paid: number;
  /** Never negative: an overpayment is a credit, not a negative balance. */
  balance: number;
  dueDate: CivilDate;
  /** The last day a payment counts as on time. */
  graceEndsOn: CivilDate;
  /** Whole days past graceEndsOn, 0 while still within it. */
  daysLate: number;
}

/** The whole rule, in one place. */
export function rentStatusForPeriod(input: RentStatusInput): RentStatusResult {
  const due = Math.max(0, input.monthlyRent);
  // A reversed or disputed payment must not count; the caller filters on
  // status='confirmed'. Clamping here means a bad sum cannot invent a credit.
  const paid = Math.max(0, input.amountPaid);
  const balance = Math.max(0, due - paid);

  const lastDay = daysInMonth(input.period.year, input.period.month);
  let dueDate: CivilDate = {
    year: input.period.year,
    month: input.period.month,
    day: Math.min(Math.max(1, Math.trunc(input.rentDueDay)), lastDay),
  };

  // A tenancy that began part-way through this month cannot have owed rent
  // before it began. See the note on `leaseStart`.
  const start = input.leaseStart;
  if (
    start &&
    start.year === input.period.year &&
    start.month === input.period.month &&
    compareCivil(start, dueDate) > 0
  ) {
    dueDate = start;
  }

  const graceEndsOn = addDays(dueDate, Math.max(0, input.gracePeriodDays));

  // Calendar only: this decides overdue vs pending below, where it must not
  // depend on how much has been paid (that branch is only reached when
  // nothing has).
  const pastGrace = compareCivil(input.today, graceEndsOn) > 0;

  // Lateness, by contrast, is a property of money STILL OWED.
  //
  // This was calendar-only, so a month paid in full still reported "13 days
  // late" once the grace period had passed. I patched the symptom at one call
  // site (the unit detail badge read "Paid · 13d late") and left the field
  // itself wrong; the tenant directory then asked the same question and got
  // the same wrong answer, which is how it was caught.
  //
  // Keeping the two conditions separate rather than overloading pastGrace
  // avoids a hidden coupling: a later edit to the status branches cannot
  // silently change what daysLate means, and vice versa. A balance still owed
  // keeps its full lateness, so nothing that IS late can be made to look
  // current by this.
  const daysLate =
    pastGrace && balance > 0
      ? Math.round(
          (Date.UTC(input.today.year, input.today.month - 1, input.today.day) -
            Date.UTC(
              graceEndsOn.year,
              graceEndsOn.month - 1,
              graceEndsOn.day,
            )) /
            86_400_000,
        )
      : 0;

  let status: RentStatus;
  if (due === 0 || paid >= due) {
    status = "paid";
  } else if (paid > 0) {
    status = "partial";
  } else {
    status = pastGrace ? "overdue" : "pending";
  }

  return { status, due, paid, balance, dueDate, graceEndsOn, daysLate };
}

/**
 * Was this lease in force during the given month?
 *
 * A lease that ended in September owes nothing in November, and one starting next
 * month owes nothing yet. Without this, expected-rent totals count months nobody
 * was living there.
 */
export function leaseCoversPeriod(
  lease: { start_date: string; end_date: string | null },
  period: { year: number; month: number },
): boolean {
  const start = civilFromISO(lease.start_date);
  if (!start) return false;
  const monthEnd: CivilDate = {
    year: period.year,
    month: period.month,
    day: daysInMonth(period.year, period.month),
  };
  if (compareCivil(start, monthEnd) > 0) return false;

  if (!lease.end_date) return true;
  const end = civilFromISO(lease.end_date);
  if (!end) return true;
  const monthStart: CivilDate = {
    year: period.year,
    month: period.month,
    day: 1,
  };
  return compareCivil(end, monthStart) >= 0;
}

/** "YYYY-M". The key shape used everywhere rent is bucketed by period. */
export function periodKey(p: { year: number; month: number }): string {
  return `${p.year}-${p.month}`;
}

/** True if `a` falls in an earlier month than `b`. */
export function beforePeriod(
  a: { year: number; month: number },
  b: { year: number; month: number },
): boolean {
  return a.year * 12 + a.month < b.year * 12 + b.month;
}

/**
 * The earliest month any rent has been recorded against, or null.
 *
 * WHY THIS IS SHARED AND NOT A LOCAL HELPER
 *   It is the floor under every "what is owed" walk in the product, and the
 *   answer has to be the same one in all of them. A real lease here starts in
 *   February with its first recorded rent in August: the landlord was
 *   collecting all along and only began recording in August. Anything that
 *   walks back past this point reports February to July as arrears — debt
 *   conjured from an absence of records.
 *
 *   Reconciliation uses it to choose which month a payment settles; the
 *   arrears report uses it to decide which months to count. If the two
 *   disagree, a payment lands on a month the report does not think is owed
 *   and the arrears total does not move.
 */
export function earliestRecordedPeriod(
  paidByPeriod: Map<string, number>,
): { year: number; month: number } | null {
  let best: { year: number; month: number } | null = null;
  for (const key of paidByPeriod.keys()) {
    const m = /^(\d{4})-(\d{1,2})$/.exec(key);
    if (!m) continue;
    const p = { year: Number(m[1]), month: Number(m[2]) };
    if (p.month < 1 || p.month > 12) continue;
    if (best === null || beforePeriod(p, best)) best = p;
  }
  return best;
}

/** The N months ending with `period`, oldest first. */
export function recentPeriods(
  period: { year: number; month: number },
  count: number,
): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const zeroBased = period.month - 1 - i;
    const year = period.year + Math.floor(zeroBased / 12);
    const month = (((zeroBased % 12) + 12) % 12) + 1;
    out.push({ year, month });
  }
  return out;
}
