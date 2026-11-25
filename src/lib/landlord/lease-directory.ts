/**
 * Every lease this landlord holds, and what state each one is in.
 *
 * WHY THIS IS A MODULE AND NOT LOGIC IN THE PAGE
 *   The same three questions get asked of a lease on four screens already --
 *   is it live, is it ending soon, is its deposit accounted for -- and each
 *   screen that answers them separately is a chance for two screens to
 *   disagree. The overview page used to show invented totals precisely
 *   because nothing computed them in one place.
 *
 * WHAT "EXPIRING" MEANS, AND WHAT IT DOES NOT
 *   A lease is expiring when it is live and its end_date falls inside the
 *   window. A month-to-month lease has no end_date and is therefore NEVER
 *   expiring -- it is open-ended, not overdue for renewal. Treating a null
 *   end_date as "ends today" is the obvious bug here and the reason this is
 *   stated rather than left implicit.
 *
 * DEPOSITS ARE COUNTED ONLY WHERE THE MONEY IS ACTUALLY HELD
 *   deposit_status distinguishes held from pending, partial and refunded.
 *   Summing deposit_amount regardless would tell a landlord they are holding
 *   money they have never collected, which is the kind of number that ends up
 *   in a dispute.
 */

import { leaseStatusLabels, labelFor } from "./labels";
import { type CivilDate, civilFromISO, compareCivil } from "./rent-status";
import { LIVE_LEASE_STATUSES, endsWithin } from "./portfolio";

/** Days ahead that counts as "ending soon" on this page. */
export const EXPIRING_WINDOW_DAYS = 60;

export interface LeaseRowInput {
  id: string;
  unit_id: string | null;
  tenant_id: string | null;
  status: string | null;
  lease_type: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number;
  deposit_amount: number | null;
  deposit_status: string | null;
  rent_due_day: number | null;
  lease_document_url: string | null;
  other_documents: string[] | null;
}

export interface LeaseTenantInput {
  id: string;
  full_name: string;
  phone: string | null;
}

export interface LeaseUnitInput {
  id: string;
  unit_number: string;
  building_id: string | null;
}

export interface LeaseBuildingInput {
  id: string;
  name: string;
}

export type LeaseState = "live" | "expiring" | "ended";

export interface DirectoryLease {
  id: string;
  tenantId: string | null;
  tenantName: string;
  tenantPhone: string | null;
  unitId: string | null;
  unitNumber: string;
  buildingId: string | null;
  buildingName: string;
  status: string;
  statusLabel: string;
  /** Open-ended leases say so rather than showing an empty end date. */
  term: string;
  startDate: string | null;
  endDate: string | null;
  monthlyRent: number;
  depositAmount: number;
  depositStatus: string | null;
  /** True only when the money is actually held. */
  depositHeld: boolean;
  documentCount: number;
  state: LeaseState;
  /** Days until it ends; null when open-ended or already ended. */
  daysToEnd: number | null;
}

export interface LeaseStats {
  total: number;
  live: number;
  expiring: number;
  ended: number;
  /** Rent per month across LIVE leases only. An ended lease bills nothing. */
  monthlyRentRoll: number;
  depositsHeld: number;
  withoutDocument: number;
}

export interface LeaseDirectoryResult {
  leases: DirectoryLease[];
  stats: LeaseStats;
}

export interface LeaseDirectoryInput {
  leases: LeaseRowInput[];
  tenants: LeaseTenantInput[];
  units: LeaseUnitInput[];
  buildings: LeaseBuildingInput[];
  today: CivilDate;
}

function daysBetween(from: CivilDate, isoTo: string): number | null {
  const to = civilFromISO(isoTo);
  if (!to) return null;
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((b - a) / 86_400_000);
}

export function buildLeaseDirectory(
  input: LeaseDirectoryInput,
): LeaseDirectoryResult {
  const tenantById = new Map(input.tenants.map((t) => [t.id, t]));
  const unitById = new Map(input.units.map((u) => [u.id, u]));
  const buildingById = new Map(input.buildings.map((b) => [b.id, b.name]));

  const leases: DirectoryLease[] = input.leases.map((l) => {
    const status = l.status ?? "draft";
    const live = LIVE_LEASE_STATUSES.includes(status);
    const expiring =
      live && endsWithin(l.end_date, input.today, EXPIRING_WINDOW_DAYS);

    const tenant = l.tenant_id ? tenantById.get(l.tenant_id) : undefined;
    const unit = l.unit_id ? unitById.get(l.unit_id) : undefined;
    const buildingId = unit?.building_id ?? null;

    const depositAmount = Math.max(0, l.deposit_amount ?? 0);

    return {
      id: l.id,
      tenantId: l.tenant_id,
      // A lease whose tenant row is missing is a data problem, not a blank
      // cell: say so rather than rendering an empty name.
      tenantName: tenant?.full_name ?? "Tenant not on record",
      tenantPhone: tenant?.phone ?? null,
      unitId: l.unit_id,
      unitNumber: unit?.unit_number ?? "Unit not on record",
      buildingId,
      buildingName: buildingId
        ? (buildingById.get(buildingId) ?? "Building not on record")
        : "No building",
      status,
      statusLabel: labelFor(leaseStatusLabels, status),
      term: l.end_date ? "Fixed term" : "Month to month",
      startDate: l.start_date,
      endDate: l.end_date,
      monthlyRent: Math.max(0, l.monthly_rent),
      depositAmount,
      depositStatus: l.deposit_status,
      depositHeld: l.deposit_status === "held",
      documentCount:
        (l.lease_document_url ? 1 : 0) + (l.other_documents?.length ?? 0),
      state: expiring ? "expiring" : live ? "live" : "ended",
      daysToEnd:
        live && l.end_date ? daysBetween(input.today, l.end_date) : null,
    };
  });

  const liveLeases = leases.filter((l) => l.state !== "ended");

  const stats: LeaseStats = {
    total: leases.length,
    live: liveLeases.length,
    expiring: leases.filter((l) => l.state === "expiring").length,
    ended: leases.filter((l) => l.state === "ended").length,
    // Live only: billing an ended lease would overstate the rent roll.
    monthlyRentRoll: liveLeases.reduce((sum, l) => sum + l.monthlyRent, 0),
    depositsHeld: leases
      .filter((l) => l.depositHeld)
      .reduce((sum, l) => sum + l.depositAmount, 0),
    withoutDocument: liveLeases.filter((l) => l.documentCount === 0).length,
  };

  // Soonest-ending first, because that is the list a landlord acts on; then
  // the rest of the live ones, then everything finished.
  const rank = (l: DirectoryLease) =>
    l.state === "expiring" ? 0 : l.state === "live" ? 1 : 2;
  leases.sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.daysToEnd !== null && b.daysToEnd !== null)
      return a.daysToEnd - b.daysToEnd;
    if (a.daysToEnd !== null) return -1;
    if (b.daysToEnd !== null) return 1;
    return a.unitNumber.localeCompare(b.unitNumber);
  });

  return { leases, stats };
}

/** Free-text match over the things a landlord would actually type. */
export function leaseMatches(lease: DirectoryLease, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  if (
    lease.tenantName.toLowerCase().includes(q) ||
    lease.unitNumber.toLowerCase().includes(q) ||
    lease.buildingName.toLowerCase().includes(q) ||
    lease.statusLabel.toLowerCase().includes(q)
  ) {
    return true;
  }

  // A local 07… number is the stored +2547… number WITHOUT the leading zero,
  // so a plain substring test never matches. My first version did exactly
  // that and failed its own test; tenantMatches already had this right, so
  // this follows it rather than inventing a second answer.
  const digitsOf = (s: string) => s.replace(/\D/g, "");
  const qDigits = digitsOf(q);
  if (qDigits.length >= 3) {
    const phone = digitsOf(lease.tenantPhone ?? "");
    if (phone && phone.includes(qDigits)) return true;
    if (qDigits.startsWith("0") && phone && phone.includes(qDigits.slice(1)))
      return true;
  }
  return false;
}

/** Has this lease already finished, as of today? */
export function hasEnded(lease: DirectoryLease, today: CivilDate): boolean {
  if (!lease.endDate) return false;
  const end = civilFromISO(lease.endDate);
  return end ? compareCivil(end, today) < 0 : false;
}
