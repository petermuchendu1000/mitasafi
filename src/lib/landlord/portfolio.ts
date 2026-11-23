/**
 * The landlord's whole portfolio, rolled up.
 *
 * WHAT THIS REPLACES
 *   The overview page opened with a comment reading "In production, these would
 *   be real database queries / For now, we'll use placeholder data to demonstrate
 *   the UI", followed by ten invented numbers: 3 properties, 12 units, 83%
 *   occupancy, KES 285,000 collected of KES 350,000, 81% collection. Those
 *   rendered against an empty database for every landlord who ever signed in. It
 *   is the first screen after login and it was the least true one.
 *
 * WHY A MODULE
 *   The same question — what is due this month, what came in — is answered on the
 *   building detail page too, and the two must not drift. The period rules live in
 *   rent-status.ts and are shared; what is here is the aggregation over many
 *   buildings.
 *
 * THE ONE JUDGEMENT CALL WORTH NAMING
 *   collectionRate is `null`, not 0, when nothing is due. A landlord who has
 *   recorded buildings but no leases yet is not collecting 0% of their rent —
 *   there is no rent to collect, and a "collection below target" alert fired at
 *   them on their first login would be a lie dressed as a warning. `null` means
 *   "no answer", the tile shows a dash, and the alert does not fire.
 */

import { leaseCoversPeriod, type CivilDate } from "./rent-status";

/** The subset of a lease this rollup needs. */
export interface PortfolioLease {
  id: string;
  tenant_id: string;
  unit_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
}

export interface PortfolioUnit {
  id: string;
  building_id: string | null;
  status: string;
}

/** A confirmed payment, already filtered to this landlord's leases. */
export interface PortfolioPayment {
  lease_id: string;
  amount: number;
  payment_type: string;
  period_year: number | null;
  period_month: number | null;
}

export interface PortfolioMaintenance {
  status: string;
  urgency: string;
}

/** Leases that are a live obligation. Shared with the building detail page. */
export const LIVE_LEASE_STATUSES = ["active", "pending_signature"];

/** Maintenance that is still someone's problem. */
export const OPEN_MAINTENANCE_STATUSES = [
  "open",
  "acknowledged",
  "assigned",
  "in_progress",
];

/** Inquiries the landlord has not acted on yet. */
export const UNANSWERED_INQUIRY_STATUSES = ["new", "viewed"];

export interface PortfolioStats {
  buildings: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  /** Maintenance + reserved: units that exist but cannot be let today. */
  unavailableUnits: number;
  /** 0 when there are no units, rather than NaN. */
  occupancyRate: number;
  /** Distinct tenants on a live lease — a tenant renting two units counts once. */
  activeTenants: number;
  /** Sum of monthly_rent over leases in force during the period. */
  rentExpected: number;
  /** Confirmed RENT payments for the period. Deposits are not rent. */
  rentCollected: number;
  /** Null when nothing is due; see the note at the top of this file. */
  collectionRate: number | null;
  rentOutstanding: number;
  openMaintenance: number;
  urgentMaintenance: number;
  unansweredInquiries: number;
}

export interface RollupInput {
  buildingCount: number;
  units: PortfolioUnit[];
  leases: PortfolioLease[];
  payments: PortfolioPayment[];
  maintenance: PortfolioMaintenance[];
  inquiryStatuses: string[];
  period: { year: number; month: number };
}

export function rollUpPortfolio(input: RollupInput): PortfolioStats {
  const totalUnits = input.units.length;
  const occupiedUnits = input.units.filter(
    (u) => u.status === "occupied",
  ).length;
  const vacantUnits = input.units.filter((u) => u.status === "vacant").length;
  const unavailableUnits = input.units.filter(
    (u) => u.status === "maintenance" || u.status === "reserved",
  ).length;

  const liveLeases = input.leases.filter((l) =>
    LIVE_LEASE_STATUSES.includes(l.status),
  );
  const activeTenants = new Set(liveLeases.map((l) => l.tenant_id)).size;

  const dueLeases = liveLeases.filter((l) =>
    leaseCoversPeriod(l, input.period),
  );
  const rentExpected = dueLeases.reduce(
    (sum, l) => sum + Math.max(0, l.monthly_rent),
    0,
  );

  // Only payments against a lease that is actually due this month count toward
  // this month's collection. Without that, rent paid on a lease that ended in
  // September would inflate November's collection rate above what is owed.
  const dueLeaseIds = new Set(dueLeases.map((l) => l.id));
  const rentCollected = input.payments.reduce((sum, p) => {
    if (p.payment_type !== "rent") return sum;
    if (p.period_year !== input.period.year) return sum;
    if (p.period_month !== input.period.month) return sum;
    if (!dueLeaseIds.has(p.lease_id)) return sum;
    return sum + Math.max(0, p.amount);
  }, 0);

  const openMaintenance = input.maintenance.filter((m) =>
    OPEN_MAINTENANCE_STATUSES.includes(m.status),
  );

  return {
    buildings: input.buildingCount,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    unavailableUnits,
    occupancyRate:
      totalUnits === 0 ? 0 : Math.round((occupiedUnits / totalUnits) * 100),
    activeTenants,
    rentExpected,
    rentCollected,
    collectionRate:
      rentExpected === 0
        ? null
        : Math.round((rentCollected / rentExpected) * 100),
    rentOutstanding: Math.max(0, rentExpected - rentCollected),
    openMaintenance: openMaintenance.length,
    urgentMaintenance: openMaintenance.filter(
      (m) => m.urgency === "emergency" || m.urgency === "high",
    ).length,
    unansweredInquiries: input.inquiryStatuses.filter((s) =>
      UNANSWERED_INQUIRY_STATUSES.includes(s),
    ).length,
  };
}

// ---------------------------------------------------------------- activity

export type ActivityKind = "payment" | "maintenance" | "lease" | "inquiry";

export interface ActivityItem {
  /** Unique across sources: a payment and a lease can share a UUID prefix. */
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  /** ISO timestamp. Rows with no usable timestamp are dropped, not dated now. */
  at: string;
  href: string | null;
}

/**
 * Merge the activity sources into one feed, newest first.
 *
 * Ties are broken by id so the order is stable between two renders of the same
 * data — several rows written in the same transaction share a timestamp, and a
 * feed that reshuffles on refresh looks like something changed when nothing did.
 */
export function mergeActivity(
  sources: ActivityItem[][],
  limit: number,
): ActivityItem[] {
  const all = sources
    .flat()
    .filter((item) => !Number.isNaN(Date.parse(item.at)));
  all.sort((a, b) => {
    const diff = Date.parse(b.at) - Date.parse(a.at);
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return limit >= 0 ? all.slice(0, limit) : all;
}

/**
 * "2 hours ago", from a fixed `now` rather than the clock.
 *
 * Taking `now` as a parameter is what makes this testable at all, and on a server
 * component it also means every row in one render is measured against the same
 * instant instead of drifting across the loop.
 */
export function relativeTime(iso: string, now: Date): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((now.getTime() - then) / 1000);

  // A timestamp in the future is a clock difference, not a prediction; saying
  // "in 3 minutes" about a payment that was just recorded is worse than "just now".
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Is a lease ending within `days` of today, and not already ended? */
export function endsWithin(
  endDate: string | null,
  today: CivilDate,
  days: number,
): boolean {
  if (!endDate) return false;
  const end = Date.parse(endDate);
  if (Number.isNaN(end)) return false;
  const todayMs = Date.UTC(today.year, today.month - 1, today.day);
  return end >= todayMs && end <= todayMs + days * 86_400_000;
}
