/**
 * Deciding who should be told what, today.
 *
 * THIS FILE SENDS NOTHING. That is the point.
 *
 * The dangerous part of a notifier is not the SMTP call, it is the decision:
 * telling a tenant who paid that they are late, telling the same person the
 * same thing every morning, or telling somebody about a month nobody has any
 * records for. All three are decisions, all three are pure arithmetic over
 * leases and payments, and all three are testable without a mail server.
 * Delivery is a thin layer on top of this and has no judgement in it.
 *
 * THE LEDGER RULE APPLIES HERE TOO, AND IT MATTERS MOST HERE
 *   `earliestRecordedPeriod` keeps the arrears report from inventing debt
 *   out of months with no records. The same floor is applied below, because
 *   the consequence here is worse than a wrong number on a screen: it is an
 *   email to a real tenant accusing them of not paying rent they may well
 *   have paid in cash before the landlord started recording anything.
 *
 * WHAT IS SCHEDULED AND WHAT IS NOT
 *   Only state-based notices belong here: rent is due soon, rent is late, a
 *   lease is ending, here is your monthly arrears summary. Event-based ones
 *   — a payment arrived, a maintenance request was opened — fire from the
 *   action that caused them and need no planner.
 */

import {
  rentStatusForPeriod,
  leaseCoversPeriod,
  earliestRecordedPeriod,
  beforePeriod,
  periodKey,
  civilFromISO,
  compareCivil,
  addDays,
  type CivilDate,
} from "@/lib/landlord/rent-status";

export const LIVE_LEASE_STATUSES = ["active", "pending_signature"];

/**
 * Every notice the product can send.
 *
 * The first five are SCHEDULED — state-based, re-derived from the data by
 * the planner each run. The last is EVENT-DRIVEN: it fires from the action
 * that caused it and the planner never produces one. They share this union,
 * and therefore the renderer and the log, because the parts that must not
 * diverge are the idempotency key and the words that reach a person.
 */
export type NoticeKind =
  | "invoice_due_soon"
  | "invoice_due_day"
  | "invoice_late"
  | "overdue_summary"
  | "lease_expiring"
  | "application_submitted"
  | "maintenance_submitted";

export interface NotifyLease {
  id: string;
  landlord_id: string;
  tenant_id: string;
  unit_label: string;
  building_label: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: number;
  grace_period_days: number;
}

export interface NotifyTenant {
  id: string;
  full_name: string;
  email: string | null;
}

export interface NotifyPayment {
  lease_id: string;
  amount: number;
  payment_type: string;
  status: string | null;
  period_year: number | null;
  period_month: number | null;
}

/** The subset of landlord_settings this needs. Defaults match the schema. */
export interface NotifyPreferences {
  landlord_id: string;
  notify_overdue_summary: boolean;
  overdue_summary_day_1: number;
  overdue_summary_day_2: number;
  notify_lease_expiring: boolean;
  lease_expiry_notice_days: number;
  notify_application_submitted: boolean;
  notify_maintenance_submitted: boolean;
  tenant_notify_invoice_due_soon: boolean;
  tenant_notify_invoice_due_day: boolean;
  tenant_notify_invoice_late: boolean;
  tenant_notify_lease_expiring: boolean;
  tenant_invoice_due_notice_days: number;
  tenant_lease_expiry_notice_days: number;
}

/**
 * Preferences for a landlord, falling back to the SCHEMA DEFAULTS when they
 * have no settings row.
 *
 * WHY THE FALLBACK EXISTS
 *   landlord_settings holds a row only once a landlord has saved something.
 *   On this project that is nobody: the table is empty, while the Settings
 *   page shows every notification switch already on, because it renders the
 *   column defaults. Driving the notifier off the existence of a row would
 *   therefore promise notifications in the UI and send none, for ever, to
 *   everybody — and it would look exactly like a notifier with nothing to do.
 *
 *   The values below are the column defaults from migration 20260356000000.
 *   They have to stay in step with it; `landlord_settings_staff_test.sql`
 *   covers the column side.
 */
export function preferencesFrom(
  landlordId: string,
  row: Record<string, unknown> | null | undefined,
): NotifyPreferences {
  const r = row ?? {};
  const bool = (k: string, dflt: boolean): boolean =>
    typeof r[k] === "boolean" ? (r[k] as boolean) : dflt;
  const int = (k: string, dflt: number): number => {
    const n = Number(r[k]);
    return Number.isFinite(n) ? n : dflt;
  };
  return {
    landlord_id: landlordId,
    notify_overdue_summary: bool("notify_overdue_summary", true),
    overdue_summary_day_1: int("overdue_summary_day_1", 5),
    overdue_summary_day_2: int("overdue_summary_day_2", 10),
    notify_lease_expiring: bool("notify_lease_expiring", true),
    lease_expiry_notice_days: int("lease_expiry_notice_days", 90),
    notify_application_submitted: bool("notify_application_submitted", true),
    notify_maintenance_submitted: bool("notify_maintenance_submitted", true),
    tenant_notify_invoice_due_soon: bool(
      "tenant_notify_invoice_due_soon",
      true,
    ),
    tenant_notify_invoice_due_day: bool("tenant_notify_invoice_due_day", true),
    tenant_notify_invoice_late: bool("tenant_notify_invoice_late", true),
    tenant_notify_lease_expiring: bool("tenant_notify_lease_expiring", true),
    tenant_invoice_due_notice_days: int("tenant_invoice_due_notice_days", 5),
    tenant_lease_expiry_notice_days: int("tenant_lease_expiry_notice_days", 90),
  };
}

export interface PlannedNotice {
  kind: NoticeKind;
  landlordId: string;
  recipientKind: "landlord" | "tenant";
  /** tenants.id when recipientKind is 'tenant'. */
  tenantId: string | null;
  /** Where it is actually going. The planner refuses to plan without one. */
  toEmail: string;
  subjectType: "lease" | "portfolio";
  subjectId: string | null;
  /** 'YYYY-MM' for rent periods, 'YYYY-MM-DD' for a dated summary. */
  period: string | null;
  dedupeKey: string;
  /** Everything the renderer needs. No rendering happens here. */
  data: Record<string, string | number>;
}

export interface PlanInput {
  leases: NotifyLease[];
  tenants: NotifyTenant[];
  payments: NotifyPayment[];
  prefs: NotifyPreferences;
  landlordEmail: string | null;
  today: CivilDate;
}

/**
 * The idempotency key. Built here so it is covered by the planner's tests
 * rather than invented at the call site, and so that two notices that must
 * not both go out can never disagree about what makes them the same.
 */
export function dedupeKey(parts: {
  kind: NoticeKind;
  recipient: string;
  subjectId: string | null;
  period: string | null;
}): string {
  return [
    parts.kind,
    parts.recipient,
    parts.subjectId ?? "-",
    parts.period ?? "-",
  ].join(":");
}

function ym(p: { year: number; month: number }): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

function ymd(d: CivilDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function daysBetween(from: CivilDate, to: CivilDate): number {
  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
      86_400_000,
  );
}

/** Confirmed rent, per lease, per period. Deposits never enter this. */
function rentIndex(
  payments: NotifyPayment[],
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const p of payments) {
    if (p.payment_type !== "rent") continue;
    if (p.status !== "confirmed") continue;
    if (p.period_year === null || p.period_month === null) continue;
    const inner = out.get(p.lease_id) ?? new Map<string, number>();
    const k = periodKey({ year: p.period_year, month: p.period_month });
    inner.set(k, (inner.get(k) ?? 0) + Math.max(0, p.amount));
    out.set(p.lease_id, inner);
  }
  return out;
}

export function planNotices(input: PlanInput): PlannedNotice[] {
  const { prefs, today } = input;
  const paidIndex = rentIndex(input.payments);
  const tenantById = new Map(input.tenants.map((t) => [t.id, t]));
  const period = { year: today.year, month: today.month };
  const out: PlannedNotice[] = [];

  const live = input.leases.filter(
    (l) =>
      l.landlord_id === prefs.landlord_id &&
      LIVE_LEASE_STATUSES.includes(l.status),
  );

  // ---------------------------------------------------------------- tenants
  for (const lease of live) {
    const tenant = tenantById.get(lease.tenant_id);
    // No address, no notice. Planning one would produce a row in the log
    // claiming somebody was told something they were never told.
    if (!tenant?.email) continue;
    if (!leaseCoversPeriod(lease, period)) continue;

    const paidMap = paidIndex.get(lease.id) ?? new Map<string, number>();
    const status = rentStatusForPeriod({
      monthlyRent: lease.monthly_rent,
      rentDueDay: lease.rent_due_day,
      gracePeriodDays: lease.grace_period_days,
      amountPaid: paidMap.get(periodKey(period)) ?? 0,
      period,
      today,
      leaseStart: civilFromISO(lease.start_date),
    });

    const base = {
      landlordId: prefs.landlord_id,
      recipientKind: "tenant" as const,
      tenantId: tenant.id,
      toEmail: tenant.email,
      subjectType: "lease" as const,
      subjectId: lease.id,
      period: ym(period),
    };
    const common = {
      tenant: tenant.full_name,
      unit: lease.unit_label,
      building: lease.building_label,
      rent: lease.monthly_rent,
      balance: status.balance,
      dueDate: ymd(status.dueDate),
    };

    // Nothing owing: say nothing. A reminder to somebody who has paid is
    // worse than silence — it reads as the landlord not having noticed.
    if (status.balance > 0) {
      const toDue = daysBetween(today, status.dueDate);

      if (
        prefs.tenant_notify_invoice_due_soon &&
        toDue > 0 &&
        toDue <= Math.max(0, prefs.tenant_invoice_due_notice_days)
      ) {
        out.push({
          kind: "invoice_due_soon",
          ...base,
          dedupeKey: dedupeKey({
            kind: "invoice_due_soon",
            recipient: tenant.id,
            subjectId: lease.id,
            period: ym(period),
          }),
          data: { ...common, daysUntilDue: toDue },
        });
      }

      if (prefs.tenant_notify_invoice_due_day && toDue === 0) {
        out.push({
          kind: "invoice_due_day",
          ...base,
          dedupeKey: dedupeKey({
            kind: "invoice_due_day",
            recipient: tenant.id,
            subjectId: lease.id,
            period: ym(period),
          }),
          data: { ...common },
        });
      }

      // THE ONE THAT CAN DO HARM.
      //
      // Only when the grace period has actually run out — `overdue` and not
      // `pending` — and only when this lease has a ledger that reaches this
      // month. A tenancy whose landlord has recorded nothing is not a tenant
      // in arrears; sending them a late notice accuses somebody of not
      // paying rent they may have handed over in cash.
      const ledgerStart = earliestRecordedPeriod(paidMap);
      const insideLedger =
        ledgerStart !== null && !beforePeriod(period, ledgerStart);
      // `daysLate > 0` and NOT `status === "overdue"`.
      //
      // rentStatusForPeriod labels a tenant who paid SOMETHING as "partial",
      // never "overdue", however late they are — the label is about whether
      // money arrived, not about the calendar. Keying on it meant a tenant
      // 70,000 short and sixteen days past grace was never told anything,
      // which is the commonest real case there is. A live dry run found it.
      //
      // daysLate is non-zero only when the grace period has passed AND a
      // balance remains, which is exactly the predicate wanted here.
      if (
        prefs.tenant_notify_invoice_late &&
        status.daysLate > 0 &&
        insideLedger
      ) {
        out.push({
          kind: "invoice_late",
          ...base,
          dedupeKey: dedupeKey({
            kind: "invoice_late",
            recipient: tenant.id,
            subjectId: lease.id,
            period: ym(period),
          }),
          data: { ...common, daysLate: status.daysLate },
        });
      }
    }

    // Lease ending. Keyed on the end date, not the month, so renewing into a
    // new end date legitimately produces a new notice.
    if (prefs.tenant_notify_lease_expiring && lease.end_date) {
      const end = civilFromISO(lease.end_date);
      const within = Math.max(0, prefs.tenant_lease_expiry_notice_days);
      if (end) {
        const left = daysBetween(today, end);
        if (left >= 0 && left <= within) {
          out.push({
            kind: "lease_expiring",
            ...base,
            period: lease.end_date,
            dedupeKey: dedupeKey({
              kind: "lease_expiring",
              recipient: tenant.id,
              subjectId: lease.id,
              period: lease.end_date,
            }),
            data: { ...common, endDate: lease.end_date, daysLeft: left },
          });
        }
      }
    }
  }

  // --------------------------------------------------------------- landlord
  if (input.landlordEmail) {
    const to = input.landlordEmail;

    // Monthly arrears summary, on the two days the landlord chose.
    const summaryDays = [
      prefs.overdue_summary_day_1,
      prefs.overdue_summary_day_2,
    ].filter((d) => Number.isFinite(d) && d >= 1 && d <= 28);

    if (prefs.notify_overdue_summary && summaryDays.includes(today.day)) {
      let totalOwed = 0;
      let leasesBehind = 0;
      for (const lease of live) {
        if (!leaseCoversPeriod(lease, period)) continue;
        const paidMap = paidIndex.get(lease.id) ?? new Map<string, number>();
        const ledgerStart = earliestRecordedPeriod(paidMap);
        if (ledgerStart === null || beforePeriod(period, ledgerStart)) continue;
        const s = rentStatusForPeriod({
          monthlyRent: lease.monthly_rent,
          rentDueDay: lease.rent_due_day,
          gracePeriodDays: lease.grace_period_days,
          amountPaid: paidMap.get(periodKey(period)) ?? 0,
          period,
          today,
          leaseStart: civilFromISO(lease.start_date),
        });
        if (s.status === "overdue" || s.status === "partial") {
          if (s.balance > 0) {
            totalOwed += s.balance;
            leasesBehind += 1;
          }
        }
      }
      // An empty summary is spam. Nothing owed, nothing to say.
      if (leasesBehind > 0) {
        out.push({
          kind: "overdue_summary",
          landlordId: prefs.landlord_id,
          recipientKind: "landlord",
          tenantId: null,
          toEmail: to,
          subjectType: "portfolio",
          subjectId: null,
          period: ymd(today),
          dedupeKey: dedupeKey({
            kind: "overdue_summary",
            recipient: prefs.landlord_id,
            subjectId: null,
            period: ymd(today),
          }),
          data: { leasesBehind, totalOwed, month: ym(period) },
        });
      }
    }

    // Leases ending soon, one notice per lease.
    if (prefs.notify_lease_expiring) {
      const within = Math.max(0, prefs.lease_expiry_notice_days);
      for (const lease of live) {
        if (!lease.end_date) continue;
        const end = civilFromISO(lease.end_date);
        if (!end) continue;
        const left = daysBetween(today, end);
        if (left < 0 || left > within) continue;
        out.push({
          kind: "lease_expiring",
          landlordId: prefs.landlord_id,
          recipientKind: "landlord",
          tenantId: null,
          toEmail: to,
          subjectType: "lease",
          subjectId: lease.id,
          period: lease.end_date,
          dedupeKey: dedupeKey({
            kind: "lease_expiring",
            recipient: prefs.landlord_id,
            subjectId: lease.id,
            period: lease.end_date,
          }),
          data: {
            unit: lease.unit_label,
            building: lease.building_label,
            tenant: tenantById.get(lease.tenant_id)?.full_name ?? "—",
            endDate: lease.end_date,
            daysLeft: left,
          },
        });
      }
    }
  }

  return out;
}

/**
 * Guard used by the sender: a lease whose rent arrived between planning and
 * sending must not be chased.
 *
 * The window is small but it is not zero — a run over a large portfolio takes
 * time, and a tenant paying during it is exactly the person who would be most
 * annoyed to receive the notice.
 */
export function stillOwing(
  lease: NotifyLease,
  payments: NotifyPayment[],
  today: CivilDate,
): boolean {
  const period = { year: today.year, month: today.month };
  const paid = rentIndex(payments).get(lease.id)?.get(periodKey(period)) ?? 0;
  return (
    rentStatusForPeriod({
      monthlyRent: lease.monthly_rent,
      rentDueDay: lease.rent_due_day,
      gracePeriodDays: lease.grace_period_days,
      amountPaid: paid,
      period,
      today,
      leaseStart: civilFromISO(lease.start_date),
    }).balance > 0
  );
}

/** Exported for the tests that pin the date arithmetic. */
export const _internals = { daysBetween, ym, ymd, addDays, compareCivil };
