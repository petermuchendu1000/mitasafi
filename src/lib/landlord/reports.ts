/**
 * The reports a landlord actually asks for, computed from what the database
 * really holds.
 *
 * WHAT THIS DELIBERATELY DOES NOT INCLUDE
 *   A profit and loss statement. There is no expenses table on this project;
 *   the only landlord outgoing recorded anywhere is maintenance cost. A "P&L"
 *   built from rent minus maintenance would carry a bottom line that looks
 *   like profit and is not one, and a landlord would take it to a bank. The
 *   Income and Expenses pages each say what they cover; a combined statement
 *   that implies completeness would be the one report here capable of real
 *   harm. See the note at the top of finance.ts.
 *
 * THE ARREARS RULE IS THE SAME ONE RECONCILIATION USES
 *   Both walk back only as far as the first month rent was recorded against
 *   the lease — `earliestRecordedPeriod`. If they disagreed, a reconciled
 *   payment would settle a month the arrears report does not believe is
 *   owed, and the arrears total would not move when money arrived. They
 *   share the helper for that reason, not for tidiness.
 */

import {
  rentStatusForPeriod,
  leaseCoversPeriod,
  recentPeriods,
  earliestRecordedPeriod,
  beforePeriod,
  periodKey,
  civilFromISO,
  type CivilDate,
} from "./rent-status";

/** Leases that are a live obligation. Same list the portfolio rollup uses. */
export const LIVE_LEASE_STATUSES = ["active", "pending_signature"];

export interface ReportLease {
  id: string;
  unit_id: string;
  tenant_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: number;
  grace_period_days: number;
  deposit_amount: number;
  deposit_status: string | null;
}

export interface ReportUnit {
  id: string;
  building_id: string | null;
  unit_number: string;
  status: string;
}

export interface ReportBuilding {
  id: string;
  name: string;
}

export interface ReportTenant {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

export interface ReportPayment {
  lease_id: string;
  amount: number;
  payment_type: string;
  status: string | null;
  period_year: number | null;
  period_month: number | null;
  payment_date: string | null;
}

export interface ReportData {
  buildings: ReportBuilding[];
  units: ReportUnit[];
  leases: ReportLease[];
  tenants: ReportTenant[];
  payments: ReportPayment[];
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

export function monthLabel(p: { year: number; month: number }): string {
  return `${MONTH_SHORT[p.month - 1] ?? "?"} ${p.year}`;
}

// ---------------------------------------------------------------------------
// Shared indexing
// ---------------------------------------------------------------------------

interface Lookups {
  unitById: Map<string, ReportUnit>;
  buildingById: Map<string, ReportBuilding>;
  tenantById: Map<string, ReportTenant>;
  /** Confirmed RENT per lease per period. Deposits never enter this. */
  rentByLeasePeriod: Map<string, Map<string, number>>;
}

function index(data: ReportData): Lookups {
  const rentByLeasePeriod = new Map<string, Map<string, number>>();
  for (const p of data.payments) {
    if (p.payment_type !== "rent") continue;
    if (p.status !== "confirmed") continue;
    if (p.period_year === null || p.period_month === null) continue;
    const inner =
      rentByLeasePeriod.get(p.lease_id) ?? new Map<string, number>();
    const k = periodKey({ year: p.period_year, month: p.period_month });
    inner.set(k, (inner.get(k) ?? 0) + Math.max(0, p.amount));
    rentByLeasePeriod.set(p.lease_id, inner);
  }
  return {
    unitById: new Map(data.units.map((u) => [u.id, u])),
    buildingById: new Map(data.buildings.map((b) => [b.id, b])),
    tenantById: new Map(data.tenants.map((t) => [t.id, t])),
    rentByLeasePeriod,
  };
}

function labelsFor(lease: ReportLease, look: Lookups) {
  const unit = look.unitById.get(lease.unit_id) ?? null;
  const building = unit?.building_id
    ? (look.buildingById.get(unit.building_id) ?? null)
    : null;
  const tenant = look.tenantById.get(lease.tenant_id) ?? null;
  return {
    unit: unit?.unit_number ?? "—",
    building: building?.name ?? "—",
    tenant: tenant?.full_name ?? "—",
    phone: tenant?.phone ?? "",
    email: tenant?.email ?? "",
  };
}

function liveLeases(data: ReportData): ReportLease[] {
  return data.leases.filter((l) => LIVE_LEASE_STATUSES.includes(l.status));
}

// ---------------------------------------------------------------------------
// Rent roll
// ---------------------------------------------------------------------------

export interface RentRollRow {
  unit: string;
  building: string;
  tenant: string;
  phone: string;
  monthlyRent: number;
  dueDay: number;
  start: string;
  end: string;
  deposit: number;
  /** Status for the current period, or "not in force" outside the term. */
  status: string;
  balance: number;
}

export interface RentRoll {
  rows: RentRollRow[];
  totalRent: number;
  totalDeposit: number;
  period: { year: number; month: number };
}

export function buildRentRoll(data: ReportData, today: CivilDate): RentRoll {
  const look = index(data);
  const period = { year: today.year, month: today.month };
  const rows: RentRollRow[] = [];

  for (const lease of liveLeases(data)) {
    const l = labelsFor(lease, look);
    const inForce = leaseCoversPeriod(lease, period);
    const paid =
      look.rentByLeasePeriod.get(lease.id)?.get(periodKey(period)) ?? 0;

    // A lease signed but not yet started owes nothing today. Running it
    // through the status rule would report it overdue before the tenant has
    // the keys.
    const s = inForce
      ? rentStatusForPeriod({
          monthlyRent: lease.monthly_rent,
          rentDueDay: lease.rent_due_day,
          gracePeriodDays: lease.grace_period_days,
          amountPaid: paid,
          period,
          today,
          leaseStart: civilFromISO(lease.start_date),
        })
      : null;

    rows.push({
      unit: l.unit,
      building: l.building,
      tenant: l.tenant,
      phone: l.phone,
      monthlyRent: Math.max(0, lease.monthly_rent),
      dueDay: lease.rent_due_day,
      start: lease.start_date,
      end: lease.end_date ?? "",
      deposit: Math.max(0, lease.deposit_amount),
      status: s ? s.status : "not in force",
      balance: s ? s.balance : 0,
    });
  }

  rows.sort(
    (a, b) =>
      a.building.localeCompare(b.building) || a.unit.localeCompare(b.unit),
  );

  return {
    rows,
    // Only leases actually in force this month contribute to the rent total.
    // Summing every live lease would include one starting next month and
    // overstate what the portfolio brings in.
    totalRent: rows
      .filter((r) => r.status !== "not in force")
      .reduce((s, r) => s + r.monthlyRent, 0),
    totalDeposit: rows.reduce((s, r) => s + r.deposit, 0),
    period,
  };
}

// ---------------------------------------------------------------------------
// Arrears
// ---------------------------------------------------------------------------

export interface ArrearsRow {
  unit: string;
  building: string;
  tenant: string;
  phone: string;
  period: string;
  due: number;
  paid: number;
  balance: number;
  daysLate: number;
}

export interface ArrearsReport {
  rows: ArrearsRow[];
  total: number;
  /** Leases with nothing recorded at all; excluded, and counted here. */
  leasesWithNoLedger: number;
  monthsConsidered: number;
}

export function buildArrears(
  data: ReportData,
  today: CivilDate,
  months = 12,
): ArrearsReport {
  const look = index(data);
  const current = { year: today.year, month: today.month };
  const window = recentPeriods(current, Math.max(1, months));
  const rows: ArrearsRow[] = [];
  let noLedger = 0;

  for (const lease of liveLeases(data)) {
    const paidMap = look.rentByLeasePeriod.get(lease.id) ?? new Map();
    const ledgerStart = earliestRecordedPeriod(paidMap);

    // No rent has ever been recorded against this lease. That is an absence
    // of records, not twelve months of debt, and reporting it as arrears
    // would put a number in front of a landlord that they might act on.
    if (ledgerStart === null) {
      noLedger += 1;
      continue;
    }

    const l = labelsFor(lease, look);
    for (const p of window) {
      if (beforePeriod(p, ledgerStart)) continue;
      if (!leaseCoversPeriod(lease, p)) continue;
      const paid = paidMap.get(periodKey(p)) ?? 0;
      const s = rentStatusForPeriod({
        monthlyRent: lease.monthly_rent,
        rentDueDay: lease.rent_due_day,
        gracePeriodDays: lease.grace_period_days,
        amountPaid: paid,
        period: p,
        today,
        leaseStart: civilFromISO(lease.start_date),
      });
      if (s.balance <= 0) continue;
      // Still inside the grace period: money is not late yet, and listing it
      // as arrears would have a landlord chasing a tenant who is on time.
      if (s.status === "pending") continue;
      rows.push({
        unit: l.unit,
        building: l.building,
        tenant: l.tenant,
        phone: l.phone,
        period: monthLabel(p),
        due: s.due,
        paid: s.paid,
        balance: s.balance,
        daysLate: s.daysLate,
      });
    }
  }

  rows.sort((a, b) => b.daysLate - a.daysLate || b.balance - a.balance);

  return {
    rows,
    total: rows.reduce((s, r) => s + r.balance, 0),
    leasesWithNoLedger: noLedger,
    monthsConsidered: Math.max(1, months),
  };
}

// ---------------------------------------------------------------------------
// Deposits held
// ---------------------------------------------------------------------------

export interface DepositRow {
  unit: string;
  building: string;
  tenant: string;
  amount: number;
  status: string;
}

export interface DepositRegister {
  rows: DepositRow[];
  total: number;
}

/**
 * Deposits are a LIABILITY, not earnings — money held against a tenancy and
 * owed back at the end of it. This lists what is owed and to whom.
 */
export function buildDepositRegister(data: ReportData): DepositRegister {
  const look = index(data);
  const rows = liveLeases(data)
    .filter((l) => Math.max(0, l.deposit_amount) > 0)
    .map((lease) => {
      const l = labelsFor(lease, look);
      return {
        unit: l.unit,
        building: l.building,
        tenant: l.tenant,
        amount: Math.max(0, lease.deposit_amount),
        status: lease.deposit_status ?? "held",
      };
    });

  rows.sort(
    (a, b) =>
      a.building.localeCompare(b.building) || a.unit.localeCompare(b.unit),
  );
  return { rows, total: rows.reduce((s, r) => s + r.amount, 0) };
}

// ---------------------------------------------------------------------------
// Lease expiries
// ---------------------------------------------------------------------------

export interface ExpiryRow {
  unit: string;
  building: string;
  tenant: string;
  phone: string;
  end: string;
  /** Negative when the end date has already passed. */
  daysLeft: number;
}

export interface ExpiryReport {
  rows: ExpiryRow[];
  /** Already past their end date and still marked live. */
  lapsed: number;
  withinDays: number;
}

export function buildExpiries(
  data: ReportData,
  today: CivilDate,
  withinDays = 90,
): ExpiryReport {
  const look = index(data);
  const rows: ExpiryRow[] = [];
  let lapsed = 0;

  for (const lease of liveLeases(data)) {
    if (!lease.end_date) continue; // open-ended; nothing to expire
    const end = civilFromISO(lease.end_date);
    if (!end) continue;
    const daysLeft = Math.round(
      (Date.UTC(end.year, end.month - 1, end.day) -
        Date.UTC(today.year, today.month - 1, today.day)) /
        86_400_000,
    );
    // A lease past its end date and still marked active is reported, not
    // filtered out: it is the one a landlord most needs to see.
    if (daysLeft > withinDays) continue;
    if (daysLeft < 0) lapsed += 1;
    const l = labelsFor(lease, look);
    rows.push({
      unit: l.unit,
      building: l.building,
      tenant: l.tenant,
      phone: l.phone,
      end: lease.end_date,
      daysLeft,
    });
  }

  rows.sort((a, b) => a.daysLeft - b.daysLeft);
  return { rows, lapsed, withinDays };
}

// ---------------------------------------------------------------------------
// Occupancy
// ---------------------------------------------------------------------------

export interface OccupancyRow {
  building: string;
  total: number;
  occupied: number;
  vacant: number;
  other: number;
  /** Null when a building has no units: 0% would be a false alarm. */
  rate: number | null;
}

export function buildOccupancy(data: ReportData): {
  rows: OccupancyRow[];
  total: number;
  occupied: number;
  rate: number | null;
} {
  const byBuilding = new Map<string, OccupancyRow>();
  for (const b of data.buildings) {
    byBuilding.set(b.id, {
      building: b.name,
      total: 0,
      occupied: 0,
      vacant: 0,
      other: 0,
      rate: null,
    });
  }
  // Units whose building was deleted or is not readable still exist and still
  // count; dropping them would quietly shrink the portfolio.
  const orphan: OccupancyRow = {
    building: "No building recorded",
    total: 0,
    occupied: 0,
    vacant: 0,
    other: 0,
    rate: null,
  };

  for (const u of data.units) {
    const row =
      (u.building_id ? byBuilding.get(u.building_id) : undefined) ?? orphan;
    row.total += 1;
    if (u.status === "occupied") row.occupied += 1;
    else if (u.status === "vacant") row.vacant += 1;
    else row.other += 1;
  }

  const rows = [...byBuilding.values()];
  if (orphan.total > 0) rows.push(orphan);
  for (const r of rows) {
    r.rate = r.total === 0 ? null : Math.round((r.occupied / r.total) * 100);
  }
  rows.sort((a, b) => a.building.localeCompare(b.building));

  const total = rows.reduce((s, r) => s + r.total, 0);
  const occupied = rows.reduce((s, r) => s + r.occupied, 0);
  return {
    rows,
    total,
    occupied,
    rate: total === 0 ? null : Math.round((occupied / total) * 100),
  };
}

// ---------------------------------------------------------------------------
// Collections by month
// ---------------------------------------------------------------------------

export interface CollectionRow {
  period: string;
  expected: number;
  collected: number;
  /** Null when nothing was due; 0% would read as a failure to collect. */
  rate: number | null;
  /**
   * Leases in force that month with no rent recorded by then, and so left
   * out of both figures. Not a silent exclusion: the page says so.
   */
  leasesNotYetRecorded: number;
}

export function buildCollections(
  data: ReportData,
  today: CivilDate,
  months = 12,
): CollectionRow[] {
  const look = index(data);
  const window = recentPeriods(
    { year: today.year, month: today.month },
    Math.max(1, months),
  );

  // The same ledger floor the arrears report uses, per lease.
  //
  // WITHOUT IT THIS REPORT CONTRADICTS THE ONE NEXT TO IT. A lease running
  // since February with its first recorded rent in August showed "0%
  // collected" for February through July — six months of apparent total
  // collection failure — while Arrears, correctly, said nothing was owed for
  // those months. Both cannot be true. A month before any record exists is
  // not a month the landlord collected nothing in; it is a month with no
  // records, and the only honest rate for it is none at all.
  const ledgerStartByLease = new Map<string, { year: number; month: number }>();
  for (const lease of data.leases) {
    const start = earliestRecordedPeriod(
      look.rentByLeasePeriod.get(lease.id) ?? new Map(),
    );
    if (start) ledgerStartByLease.set(lease.id, start);
  }

  // Terminated leases still owed rent for the months they were in force, so
  // every lease is considered here, not only the live ones.
  return window.map((p) => {
    let expected = 0;
    let collected = 0;
    let unrecorded = 0;
    for (const lease of data.leases) {
      if (!leaseCoversPeriod(lease, p)) continue;
      const ledgerStart = ledgerStartByLease.get(lease.id);
      if (!ledgerStart || beforePeriod(p, ledgerStart)) {
        unrecorded += 1;
        continue;
      }
      expected += Math.max(0, lease.monthly_rent);
      collected += look.rentByLeasePeriod.get(lease.id)?.get(periodKey(p)) ?? 0;
    }
    return {
      period: monthLabel(p),
      expected,
      collected,
      rate: expected === 0 ? null : Math.round((collected / expected) * 100),
      leasesNotYetRecorded: unrecorded,
    };
  });
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * One cell, escaped for CSV.
 *
 * THE APOSTROPHE IS NOT COSMETIC
 *   A cell beginning =, +, - or @ is treated as a FORMULA by Excel, Sheets
 *   and LibreOffice. These exports carry tenant names and notes — fields a
 *   tenant supplies — so `=HYPERLINK(...)` typed into a name field becomes a
 *   live formula in the landlord's spreadsheet. Prefixing with an apostrophe
 *   makes the cell text, which is what it always was.
 *
 *   A leading tab, carriage return or newline is stripped first, because
 *   those are skipped when a spreadsheet looks for the formula marker.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  const stripped = s.replace(/^[\s\t\r\n]+/, "");
  if (/^[=+\-@]/.test(stripped)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
