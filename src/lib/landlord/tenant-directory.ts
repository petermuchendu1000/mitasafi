/**
 * The landlord's tenants, rolled up for the directory and the detail page.
 *
 * WHAT THIS REPLACES
 *   /dashboard/landlord/tenants was 466 lines of `"use client"` built entirely
 *   from `mockTenants` — six invented people in two invented buildings, each
 *   with a hardcoded `rent_status` literal. Its rows linked to
 *   /dashboard/landlord/buildings/1/units/u1 (a non-UUID id, so a 404) and to
 *   /dashboard/landlord/tenants/<id>, a route that does not exist.
 *
 * THE CROSS-SCREEN INVARIANT THIS MODULE EXISTS TO HOLD
 *   The overview tile says "N active tenants", defined in portfolio.ts as the
 *   count of DISTINCT tenant_id over leases whose status is active or
 *   pending_signature. If this page counted `tenants` rows instead, the two
 *   screens would disagree about how many tenants a landlord has — a landlord
 *   with a moved-out tenant would see 4 here and 3 there and have no way to
 *   tell which is wrong. `housed` below is deliberately the SAME computation,
 *   and a test asserts the two agree.
 *
 *   The three states partition the directory exactly:
 *     housed + former + prospective === onRecord
 *   That is asserted too, because a tenant falling through the gaps would
 *   silently vanish from a list whose whole job is to be complete.
 *
 * WHY A TENANT CAN HAVE MORE THAN ONE LIVE LEASE
 *   Nothing in the schema stops one person renting two units, and a directory
 *   that showed only the first would under-report what they owe. The rent
 *   position is therefore aggregated across every live lease that covers the
 *   period: amounts sum, the status is the worst of the per-lease statuses,
 *   and daysLate is the largest. "Worst" is ordered overdue > partial >
 *   pending > paid, which is the order a landlord would chase in.
 */

import {
  rentStatusForPeriod,
  leaseCoversPeriod,
  civilFromISO,
  compareCivil,
  type CivilDate,
  type RentStatus,
} from "./rent-status";
import { LIVE_LEASE_STATUSES } from "./portfolio";

/** tenants_status_check */
export const TENANT_STATUS_VALUES = [
  "active",
  "inactive",
  "blacklisted",
] as const;

export const TENANT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  blacklisted: "Blacklisted",
};

/**
 * Where this person stands with the landlord right now.
 *
 *   housed       at least one live lease
 *   former       leases on record, none of them live
 *   prospective  on record, never had a lease
 */
export type TenancyState = "housed" | "former" | "prospective";

export interface DirectoryTenantInput {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  id_type: string | null;
  id_number: string | null;
  occupation: string | null;
  employer: string | null;
  verification_level: string | null;
  status: string | null;
  created_at: string | null;
}

export interface DirectoryLeaseInput {
  id: string;
  tenant_id: string;
  unit_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: number;
  grace_period_days: number;
  deposit_amount: number | null;
  deposit_status: string | null;
}

export interface DirectoryPaymentInput {
  lease_id: string;
  amount: number;
  payment_type: string;
  status: string;
  period_year: number | null;
  period_month: number | null;
}

export interface DirectoryUnitInput {
  id: string;
  unit_number: string;
  building_id: string | null;
}

export interface DirectoryPlace {
  unitId: string;
  unitNumber: string;
  buildingId: string | null;
  buildingName: string | null;
}

export interface DirectoryRent {
  status: RentStatus;
  due: number;
  paid: number;
  balance: number;
  daysLate: number;
}

export interface DirectoryTenant {
  id: string;
  name: string;
  /** First letter of the name, or "?" — never an index into an empty string. */
  initial: string;
  phone: string;
  email: string | null;
  idType: string | null;
  idNumber: string | null;
  occupation: string | null;
  employer: string | null;
  verificationLevel: string | null;
  /** tenants.status — 'blacklisted' is a real value and is shown as one. */
  status: string;
  state: TenancyState;
  /** Every unit they currently occupy. Empty unless state is 'housed'. */
  places: DirectoryPlace[];
  /** Total leases on record, live or not. */
  leaseCount: number;
  /** Earliest lease start, or null when they have never had one. */
  since: string | null;
  /** Soonest end date among live leases, or null. */
  leaseEnds: string | null;
  /** Null when no live lease covers the period: nothing is due. */
  rent: DirectoryRent | null;
  /** Sum of deposits held on live leases. */
  depositsHeld: number;
}

export interface DirectoryStats {
  onRecord: number;
  housed: number;
  former: number;
  prospective: number;
  /** Counts over tenants that have a rent position this period. */
  paid: number;
  partial: number;
  pending: number;
  overdue: number;
  rentDue: number;
  rentCollected: number;
  rentOutstanding: number;
  depositsHeld: number;
  blacklisted: number;
}

export interface DirectoryResult {
  tenants: DirectoryTenant[];
  stats: DirectoryStats;
}

export interface DirectoryInput {
  tenants: DirectoryTenantInput[];
  leases: DirectoryLeaseInput[];
  payments: DirectoryPaymentInput[];
  units: DirectoryUnitInput[];
  buildings: { id: string; name: string }[];
  period: { year: number; month: number };
  today: CivilDate;
}

/** overdue worst, paid best — the order a landlord chases in. */
const SEVERITY: Record<RentStatus, number> = {
  overdue: 0,
  partial: 1,
  pending: 2,
  paid: 3,
};

function worst(a: RentStatus, b: RentStatus): RentStatus {
  return SEVERITY[a] <= SEVERITY[b] ? a : b;
}

/** The first character of a name, safely. */
export function initialOf(name: string): string {
  const trimmed = (name ?? "").trim();
  // Array.from, not [0]: a name beginning with an emoji or an astral character
  // would otherwise yield half a surrogate pair.
  return trimmed === "" ? "?" : (Array.from(trimmed)[0] ?? "?").toUpperCase();
}

export function buildTenantDirectory(input: DirectoryInput): DirectoryResult {
  const unitById = new Map(input.units.map((u) => [u.id, u]));
  const buildingName = new Map(input.buildings.map((b) => [b.id, b.name]));

  /** Confirmed RENT per lease per period. Deposits are not rent. */
  const rentPaid = new Map<string, number>();
  for (const p of input.payments) {
    if (p.payment_type !== "rent") continue;
    if (p.status !== "confirmed") continue;
    if (p.period_year === null || p.period_month === null) continue;
    const key = `${p.lease_id}:${p.period_year}-${p.period_month}`;
    rentPaid.set(key, (rentPaid.get(key) ?? 0) + Math.max(0, p.amount));
  }

  const leasesByTenant = new Map<string, DirectoryLeaseInput[]>();
  for (const l of input.leases) {
    const list = leasesByTenant.get(l.tenant_id);
    if (list) list.push(l);
    else leasesByTenant.set(l.tenant_id, [l]);
  }

  const tenants: DirectoryTenant[] = input.tenants.map((t) => {
    const all = leasesByTenant.get(t.id) ?? [];
    const live = all.filter((l) => LIVE_LEASE_STATUSES.includes(l.status));

    const state: TenancyState =
      live.length > 0 ? "housed" : all.length > 0 ? "former" : "prospective";

    const places: DirectoryPlace[] = live.map((l) => {
      const unit = unitById.get(l.unit_id);
      const buildingId = unit?.building_id ?? null;
      return {
        unitId: l.unit_id,
        unitNumber: unit?.unit_number ?? "—",
        buildingId,
        buildingName: buildingId
          ? (buildingName.get(buildingId) ?? null)
          : null,
      };
    });

    // Rent across every live lease that covers this month.
    let rent: DirectoryRent | null = null;
    for (const l of live) {
      if (!leaseCoversPeriod(l, input.period)) continue;
      const paid =
        rentPaid.get(`${l.id}:${input.period.year}-${input.period.month}`) ?? 0;
      const r = rentStatusForPeriod({
        monthlyRent: l.monthly_rent,
        rentDueDay: l.rent_due_day,
        gracePeriodDays: l.grace_period_days,
        amountPaid: paid,
        period: input.period,
        today: input.today,
        leaseStart: civilFromISO(l.start_date),
      });
      rent = rent
        ? {
            status: worst(rent.status, r.status),
            due: rent.due + r.due,
            paid: rent.paid + r.paid,
            balance: rent.balance + r.balance,
            daysLate: Math.max(rent.daysLate, r.daysLate),
          }
        : {
            status: r.status,
            due: r.due,
            paid: r.paid,
            balance: r.balance,
            daysLate: r.daysLate,
          };
    }

    const starts = all
      .map((l) => civilFromISO(l.start_date))
      .filter((d): d is CivilDate => d !== null)
      .sort(compareCivil);
    const ends = live
      .map((l) => (l.end_date ? civilFromISO(l.end_date) : null))
      .filter((d): d is CivilDate => d !== null)
      .sort(compareCivil);

    const depositsHeld = live.reduce(
      (sum, l) =>
        sum +
        (l.deposit_status === "held" ||
        l.deposit_status === "partially_refunded"
          ? Math.max(0, l.deposit_amount ?? 0)
          : 0),
      0,
    );

    return {
      id: t.id,
      name: t.full_name,
      initial: initialOf(t.full_name),
      phone: t.phone,
      email: t.email,
      idType: t.id_type,
      idNumber: t.id_number,
      occupation: t.occupation,
      employer: t.employer,
      verificationLevel: t.verification_level,
      status: t.status ?? "active",
      state,
      places,
      leaseCount: all.length,
      since: starts.length ? isoOf(starts[0]) : null,
      leaseEnds: ends.length ? isoOf(ends[0]) : null,
      rent,
      depositsHeld,
    };
  });

  const withRent = tenants.filter((t) => t.rent !== null);
  const count = (s: RentStatus) =>
    withRent.filter((t) => t.rent!.status === s).length;

  const stats: DirectoryStats = {
    onRecord: tenants.length,
    housed: tenants.filter((t) => t.state === "housed").length,
    former: tenants.filter((t) => t.state === "former").length,
    prospective: tenants.filter((t) => t.state === "prospective").length,
    paid: count("paid"),
    partial: count("partial"),
    pending: count("pending"),
    overdue: count("overdue"),
    rentDue: withRent.reduce((s, t) => s + t.rent!.due, 0),
    rentCollected: withRent.reduce((s, t) => s + t.rent!.paid, 0),
    rentOutstanding: withRent.reduce((s, t) => s + t.rent!.balance, 0),
    depositsHeld: tenants.reduce((s, t) => s + t.depositsHeld, 0),
    blacklisted: tenants.filter((t) => t.status === "blacklisted").length,
  };

  return { tenants, stats };
}

function isoOf(d: CivilDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

/**
 * Does this tenant match a search box?
 *
 * Phone matching strips punctuation from BOTH sides: a landlord typing
 * "0733111222" must find a tenant stored as "+254733111222", because the add
 * form normalises to +254 and nobody remembers which form they typed.
 */
export function tenantMatches(tenant: DirectoryTenant, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;

  if (tenant.name.toLowerCase().includes(q)) return true;
  if (tenant.email?.toLowerCase().includes(q)) return true;
  if (tenant.idNumber?.toLowerCase().includes(q)) return true;
  if (tenant.occupation?.toLowerCase().includes(q)) return true;
  if (tenant.employer?.toLowerCase().includes(q)) return true;
  for (const p of tenant.places) {
    if (p.unitNumber.toLowerCase().includes(q)) return true;
    if (p.buildingName?.toLowerCase().includes(q)) return true;
  }

  const digitsOf = (s: string) => s.replace(/\D/g, "");
  const qDigits = digitsOf(q);
  if (qDigits.length >= 3) {
    const phoneDigits = digitsOf(tenant.phone);
    // A local 07… number is the +2547… number without the leading 0.
    if (phoneDigits.includes(qDigits)) return true;
    if (qDigits.startsWith("0") && phoneDigits.includes(qDigits.slice(1)))
      return true;
  }
  return false;
}
