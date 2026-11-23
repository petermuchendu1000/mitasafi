/**
 * Rent collection across the whole portfolio.
 *
 * WHY THIS EXISTS
 *   The sidebar, the overview's rent tile, its "Rent collection" quick action
 *   and its arrears alert all linked to /dashboard/landlord/rent, and the route
 *   did not exist. The alert in particular said "View details →" and led to a
 *   404.
 *
 * WHAT IT SHOWS
 *   One row per lease in force this month, with what is due, what has been
 *   confirmed against it and how late it is — the same rule the building detail
 *   page uses, from src/lib/landlord/rent-status.ts, applied across every
 *   building instead of one.
 *
 *   Deposits are excluded from collection. They are refundable money held on
 *   the landlord's behalf, not rent earned, and counting them would show a new
 *   tenancy as over-collected in its first month.
 */

import { createClient } from "@/lib/supabase/server";
import {
  nairobiToday,
  rentStatusForPeriod,
  civilFromISO,
  leaseCoversPeriod,
  recentPeriods,
} from "@/lib/landlord/rent-status";
import { LIVE_LEASE_STATUSES } from "@/lib/landlord/portfolio";
import { RentCollection, type RentRow, type MonthRow } from "./RentCollection";

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
const monthLabel = (p: { year: number; month: number }) =>
  `${MONTH_SHORT[p.month - 1]} ${p.year}`;

interface LeaseRow {
  id: string;
  unit_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number | string | null;
  rent_due_day: number | null;
  grace_period_days: number | null;
  deposit_amount: number | string | null;
  deposit_status: string | null;
  deposit_refunded: number | string | null;
  tenants: { id: string; full_name: string; phone: string } | null;
}

export default async function LandlordRentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const [{ data: unitRows }, { data: buildingRows }] = await Promise.all([
    supabase
      .from("units")
      .select("id, unit_number, building_id")
      .eq("landlord_id", landlordId),
    supabase.from("buildings").select("id, name").eq("landlord_id", landlordId),
  ]);

  const units = unitRows ?? [];
  const unitById = new Map(units.map((u) => [u.id, u]));
  const buildingName = new Map((buildingRows ?? []).map((b) => [b.id, b.name]));

  const { data: leaseData, error: leaseError } = units.length
    ? await supabase
        .from("leases")
        // prettier-ignore
        .select(
          "id, unit_id, status, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, deposit_amount, deposit_status, deposit_refunded, tenants ( id, full_name, phone )",
        )
        .eq("landlord_id", landlordId)
        .in(
          "unit_id",
          units.map((u) => u.id),
        )
    : { data: [], error: null };

  if (leaseError) {
    console.error("[Rent] lease query failed:", leaseError.message);
  }

  const leases = (leaseData ?? []) as unknown as LeaseRow[];
  const leaseIds = leases.map((l) => l.id);

  const { data: paymentData } = leaseIds.length
    ? await supabase
        .from("payments")
        // prettier-ignore
        .select("id, lease_id, amount, payment_type, period_year, period_month")
        .in("lease_id", leaseIds)
        .eq("status", "confirmed")
        .limit(3000)
    : { data: [] };

  const payments = paymentData ?? [];

  const today = nairobiToday();
  const period = { year: today.year, month: today.month };
  const periods = recentPeriods(period, 6);

  /** Confirmed RENT, per lease per period. Deposits never enter this map. */
  const rentByLeasePeriod = new Map<string, number>();
  for (const p of payments) {
    if (p.payment_type !== "rent") continue;
    if (p.period_year === null || p.period_month === null) continue;
    const key = `${p.lease_id}:${p.period_year}-${p.period_month}`;
    rentByLeasePeriod.set(
      key,
      (rentByLeasePeriod.get(key) ?? 0) + num(p.amount),
    );
  }

  const liveLeases = leases.filter((l) =>
    LIVE_LEASE_STATUSES.includes(l.status),
  );

  const rows: RentRow[] = liveLeases
    .filter((l) => leaseCoversPeriod(l, period))
    .map((l) => {
      const unit = unitById.get(l.unit_id);
      const buildingId = unit?.building_id ?? null;
      const paid =
        rentByLeasePeriod.get(`${l.id}:${period.year}-${period.month}`) ?? 0;
      const r = rentStatusForPeriod({
        monthlyRent: num(l.monthly_rent),
        rentDueDay: l.rent_due_day ?? 5,
        gracePeriodDays: l.grace_period_days ?? 0,
        amountPaid: paid,
        period,
        today,
        leaseStart: civilFromISO(l.start_date),
      });
      return {
        leaseId: l.id,
        unitId: l.unit_id,
        unitNumber: unit?.unit_number ?? "—",
        buildingId,
        buildingName: buildingId
          ? (buildingName.get(buildingId) ?? null)
          : null,
        tenantName: l.tenants?.full_name ?? "—",
        tenantPhone: l.tenants?.phone ?? null,
        due: r.due,
        paid: r.paid,
        balance: r.balance,
        status: r.status,
        daysLate: r.daysLate,
        dueDay: r.dueDate.day,
      };
    });

  // Overdue first, then the largest balance: the order a landlord would chase in.
  const severity: Record<RentRow["status"], number> = {
    overdue: 0,
    partial: 1,
    pending: 2,
    paid: 3,
  };
  rows.sort(
    (a, b) => severity[a.status] - severity[b.status] || b.balance - a.balance,
  );

  const months: MonthRow[] = periods.map((p) => {
    let expected = 0;
    let collected = 0;
    for (const l of leases) {
      if (!LIVE_LEASE_STATUSES.includes(l.status) && l.status !== "expired")
        continue;
      if (!leaseCoversPeriod(l, p)) continue;
      expected += num(l.monthly_rent);
      collected += rentByLeasePeriod.get(`${l.id}:${p.year}-${p.month}`) ?? 0;
    }
    return { label: monthLabel(p), expected, collected };
  });

  const depositsHeld = liveLeases
    .filter(
      (l) =>
        l.deposit_status === "held" ||
        l.deposit_status === "partially_refunded",
    )
    .reduce(
      (s, l) =>
        s + Math.max(0, num(l.deposit_amount) - num(l.deposit_refunded)),
      0,
    );

  const expected = rows.reduce((s, r) => s + r.due, 0);
  const collected = rows.reduce((s, r) => s + r.paid, 0);

  return (
    <RentCollection
      periodLabel={monthLabel(period)}
      expected={expected}
      collected={collected}
      outstanding={Math.max(0, expected - collected)}
      collectionRate={
        expected === 0 ? null : Math.round((collected / expected) * 100)
      }
      depositsHeld={depositsHeld}
      rows={rows}
      months={months}
      buildings={(buildingRows ?? []).map((b) => ({ id: b.id, name: b.name }))}
    />
  );
}
