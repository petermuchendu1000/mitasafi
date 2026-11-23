/**
 * Building detail — the management hub for one building.
 *
 * WHAT THIS REPLACES
 *   A 743-line `"use client"` page whose every figure came from two hardcoded
 *   objects: `mockBuilding` ("Sunset Apartments", 24 units, Kilimani) and
 *   `mockUnits` (eight invented units with invented tenants, lease end dates and
 *   rent statuses). The page took an `id` from the URL and then ignored it, so
 *   EVERY building opened as Sunset Apartments — the real one's name, address,
 *   occupancy and rent roll were nowhere on the screen. Two of its four tabs said
 *   "coming soon".
 *
 *   The mock also disagreed with the schema in ways that would have broken on
 *   contact with a real row: `building_type: "apartment_block"` is not a value
 *   buildings_building_type_check permits; `address` was a nested object where the
 *   column is TEXT; units carried `floor`, `size_sqft` and `rent_amount` where the
 *   columns are `floor_level`, `size_sqm` and `monthly_rent`; and the unit status
 *   map had three entries for a column with four, so a 'reserved' unit would have
 *   thrown on `statusConfig[unit.status].bgColor`.
 *
 * WHY A SERVER COMPONENT
 *   Everything on first paint is data this landlord owns, and five queries resolved
 *   on the server beat five round trips from the browser after hydration. The
 *   interactive parts — tab, filter, search, view mode — stay in BuildingDetail.
 *
 * AUTHORIZATION IS IN THE QUERY, NOT AFTER IT
 *   The building is fetched with `.eq("landlord_id", user.id)`, so another
 *   landlord's id in the URL returns no row and the page 404s. RLS enforces the
 *   same thing server-side; the explicit filter means the page does not depend on
 *   the policy being right to avoid leaking a name.
 *
 * WHERE THE NUMBERS COME FROM
 *   Occupancy and the rent roll are derived from the `units` rows, not from
 *   `buildings.total_units` — that is a stored counter with no trigger keeping it
 *   true. Rent status per unit comes from src/lib/landlord/rent-status.ts, which
 *   reads the lease's due day and grace period against confirmed rent payments for
 *   the period. Expected rent is summed over LEASES in force that month, not over
 *   occupied units, because the lease is what is owed.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  nairobiToday,
  rentStatusForPeriod,
  leaseCoversPeriod,
  recentPeriods,
  civilFromISO,
  compareCivil,
  type RentStatus,
} from "@/lib/landlord/rent-status";
import { BuildingDetail } from "./BuildingDetail";
import type {
  BuildingDetailData,
  UnitCard,
  MaintenanceItem,
  PaymentItem,
  MonthCollection,
} from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fixed so the server and the browser never disagree on a month name. */
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

function monthLabel(period: { year: number; month: number }): string {
  return `${MONTH_SHORT[period.month - 1]} ${period.year}`;
}

/** PostgREST returns numeric as a string; null must not become 0 silently. */
function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

interface UnitRow {
  id: string;
  unit_number: string;
  unit_type: string;
  floor_level: string | null;
  wing_block: string | null;
  bedrooms: number | null;
  bathrooms: number | string | null;
  size_sqm: number | string | null;
  monthly_rent: number | string | null;
  status: string;
  listing_status: string | null;
  furnishing: string | null;
  available_from: string | null;
}

interface LeaseRow {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number | string | null;
  rent_due_day: number | null;
  grace_period_days: number | null;
  deposit_amount: number | string | null;
  deposit_status: string | null;
  deposit_refunded: number | string | null;
  status: string;
  tenants: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    verification_level: string | null;
  } | null;
}

interface PaymentRow {
  id: string;
  lease_id: string;
  amount: number | string | null;
  payment_type: string;
  period_month: number | null;
  period_year: number | null;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  status: string;
}

interface MaintenanceRow {
  id: string;
  unit_id: string;
  tenant_id: string | null;
  category: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  assigned_to: string | null;
  assigned_phone: string | null;
  estimated_cost: number | string | null;
  actual_cost: number | string | null;
  cost_paid_by: string | null;
  reported_at: string;
  due_date: string | null;
  completed_at: string | null;
}

/** Statuses that mean the lease is a live obligation this month. */
const LIVE_LEASE_STATUSES = ["active", "pending_signature"];

/** Maintenance that is still someone's problem. */
const OPEN_MAINTENANCE_STATUSES = [
  "open",
  "acknowledged",
  "assigned",
  "in_progress",
];

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // An id that is not a UUID would make PostgREST reject the query with 22P02
  // rather than return nothing, so it is turned away here. This is also the path
  // taken by the old mock links, which pointed at "1".
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    // Kept as ONE string literal on purpose: supabase-js reads the select as a
    // literal type to infer the row shape, and a concatenated expression is not one.
    // Split it over `+` and every field below becomes GenericStringError.
    // prettier-ignore
    .select(
      "id, name, building_type, address, area, city, status, photos, cover_photo, total_floors, total_units, year_built, plot_number, management_type, service_charge, created_at",
    )
    .eq("id", id)
    .eq("landlord_id", landlordId)
    .maybeSingle();

  if (buildingError) {
    console.error(
      "[BuildingDetail] building query failed:",
      buildingError.message,
    );
  }
  if (!building) notFound();

  const { data: unitRows, error: unitsError } = await supabase
    .from("units")
    // prettier-ignore
    .select(
      "id, unit_number, unit_type, floor_level, wing_block, bedrooms, bathrooms, size_sqm, monthly_rent, status, listing_status, furnishing, available_from",
    )
    .eq("building_id", id)
    .eq("landlord_id", landlordId)
    .order("unit_number", { ascending: true });

  if (unitsError) {
    console.error("[BuildingDetail] units query failed:", unitsError.message);
  }

  const units = (unitRows ?? []) as UnitRow[];
  const unitIds = units.map((u) => u.id);

  // Leases and maintenance both hang off the unit ids, so they go together. With no
  // units there is nothing to ask for, and `.in()` on an empty list is a query that
  // can only return nothing.
  const [leaseResult, maintenanceResult] = unitIds.length
    ? await Promise.all([
        supabase
          .from("leases")
          // prettier-ignore
          .select(
            "id, unit_id, tenant_id, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, deposit_amount, deposit_status, deposit_refunded, status, tenants ( id, full_name, phone, email, verification_level )",
          )
          .in("unit_id", unitIds)
          .eq("landlord_id", landlordId)
          .order("start_date", { ascending: false }),
        supabase
          .from("maintenance_requests")
          // prettier-ignore
          .select(
            "id, unit_id, tenant_id, category, title, description, urgency, status, assigned_to, assigned_phone, estimated_cost, actual_cost, cost_paid_by, reported_at, due_date, completed_at",
          )
          .in("unit_id", unitIds)
          .eq("landlord_id", landlordId)
          .order("reported_at", { ascending: false })
          .limit(200),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (leaseResult.error) {
    console.error(
      "[BuildingDetail] leases query failed:",
      leaseResult.error.message,
    );
  }
  if (maintenanceResult.error) {
    console.error(
      "[BuildingDetail] maintenance query failed:",
      maintenanceResult.error.message,
    );
  }

  const leases = (leaseResult.data ?? []) as unknown as LeaseRow[];
  const leaseIds = leases.map((l) => l.id);

  // One payments query feeds the per-unit rent status, the six-month collection
  // series and the recent-payments list. Capped so a long-running building cannot
  // pull an unbounded result; the cap is well above six months of a large block,
  // and the newest rows are the ones every figure here is about.
  const { data: paymentRows, error: paymentsError } = leaseIds.length
    ? await supabase
        .from("payments")
        // prettier-ignore
        .select(
          "id, lease_id, amount, payment_type, period_month, period_year, payment_date, payment_method, reference_number, status",
        )
        .in("lease_id", leaseIds)
        .eq("status", "confirmed")
        .order("payment_date", { ascending: false })
        .limit(2000)
    : { data: [], error: null };

  if (paymentsError) {
    console.error(
      "[BuildingDetail] payments query failed:",
      paymentsError.message,
    );
  }
  const payments = (paymentRows ?? []) as PaymentRow[];

  // ---------------------------------------------------------------- derivation

  const today = nairobiToday();
  const currentPeriod = { year: today.year, month: today.month };
  const periods = recentPeriods(currentPeriod, 6);

  /** The lease in force on a unit: the live one, else the most recent. */
  const leaseByUnit = new Map<string, LeaseRow>();
  for (const lease of leases) {
    const existing = leaseByUnit.get(lease.unit_id);
    const isLive = LIVE_LEASE_STATUSES.includes(lease.status);
    if (!existing) {
      leaseByUnit.set(lease.unit_id, lease);
      continue;
    }
    const existingIsLive = LIVE_LEASE_STATUSES.includes(existing.status);
    if (isLive && !existingIsLive) leaseByUnit.set(lease.unit_id, lease);
    // Otherwise keep the first, which is the latest by start_date.
  }

  /** Confirmed rent, summed per lease per period. */
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

  const openByUnit = new Map<string, number>();
  for (const m of (maintenanceResult.data ?? []) as MaintenanceRow[]) {
    if (!OPEN_MAINTENANCE_STATUSES.includes(m.status)) continue;
    openByUnit.set(m.unit_id, (openByUnit.get(m.unit_id) ?? 0) + 1);
  }

  const unitCards: UnitCard[] = units.map((u) => {
    const lease = leaseByUnit.get(u.id);
    const live =
      lease && LIVE_LEASE_STATUSES.includes(lease.status) ? lease : null;

    let rent: UnitCard["rent"] = null;
    if (live && leaseCoversPeriod(live, currentPeriod)) {
      const paid =
        rentByLeasePeriod.get(
          `${live.id}:${currentPeriod.year}-${currentPeriod.month}`,
        ) ?? 0;
      const r = rentStatusForPeriod({
        monthlyRent: num(live.monthly_rent),
        rentDueDay: live.rent_due_day ?? 5,
        gracePeriodDays: live.grace_period_days ?? 0,
        amountPaid: paid,
        period: currentPeriod,
        today,
      });
      rent = {
        status: r.status,
        due: r.due,
        paid: r.paid,
        balance: r.balance,
        daysLate: r.daysLate,
        dueDay: r.dueDate.day,
      };
    }

    return {
      id: u.id,
      unit_number: u.unit_number,
      unit_type: u.unit_type,
      floor_level: u.floor_level,
      wing_block: u.wing_block,
      bedrooms: u.bedrooms ?? 0,
      bathrooms: num(u.bathrooms),
      size_sqm: u.size_sqm === null ? null : num(u.size_sqm),
      monthly_rent: num(u.monthly_rent),
      status: u.status,
      listing_status: u.listing_status,
      furnishing: u.furnishing,
      available_from: u.available_from,
      openMaintenance: openByUnit.get(u.id) ?? 0,
      tenant: live?.tenants
        ? {
            id: live.tenants.id,
            name: live.tenants.full_name,
            phone: live.tenants.phone,
            email: live.tenants.email,
            verification_level: live.tenants.verification_level,
          }
        : null,
      lease: live
        ? {
            id: live.id,
            start_date: live.start_date,
            end_date: live.end_date,
            monthly_rent: num(live.monthly_rent),
            rent_due_day: live.rent_due_day ?? 5,
            status: live.status,
          }
        : null,
      rent,
    };
  });

  // Collection history. Expected is summed over leases in force that month, so a
  // unit that was empty in August is not counted as August arrears.
  const unitNumberById = new Map(units.map((u) => [u.id, u.unit_number]));
  const months: MonthCollection[] = periods.map((period) => {
    let expected = 0;
    let collected = 0;
    for (const lease of leases) {
      if (
        !LIVE_LEASE_STATUSES.includes(lease.status) &&
        lease.status !== "expired"
      )
        continue;
      if (!leaseCoversPeriod(lease, period)) continue;
      expected += num(lease.monthly_rent);
      collected +=
        rentByLeasePeriod.get(`${lease.id}:${period.year}-${period.month}`) ??
        0;
    }
    return {
      label: monthLabel(period),
      year: period.year,
      month: period.month,
      expected,
      collected,
    };
  });

  const thisMonth = months[months.length - 1] ?? {
    label: monthLabel(currentPeriod),
    year: currentPeriod.year,
    month: currentPeriod.month,
    expected: 0,
    collected: 0,
  };

  const depositsHeld = leases
    .filter(
      (l) =>
        LIVE_LEASE_STATUSES.includes(l.status) &&
        (l.deposit_status === "held" ||
          l.deposit_status === "partially_refunded"),
    )
    .reduce(
      (sum, l) =>
        sum + Math.max(0, num(l.deposit_amount) - num(l.deposit_refunded)),
      0,
    );

  const arrears = unitCards
    .filter((u) => u.rent && u.rent.balance > 0)
    .map((u) => ({
      unitId: u.id,
      unitNumber: u.unit_number,
      tenantName: u.tenant?.name ?? "—",
      balance: u.rent?.balance ?? 0,
      daysLate: u.rent?.daysLate ?? 0,
      status: (u.rent?.status ?? "pending") as RentStatus,
    }))
    .sort((a, b) => b.balance - a.balance);

  const leaseUnit = new Map(leases.map((l) => [l.id, l.unit_id]));
  const leaseTenant = new Map(
    leases.map((l) => [l.id, l.tenants?.full_name ?? "—"]),
  );
  const recentPayments: PaymentItem[] = payments.slice(0, 12).map((p) => ({
    id: p.id,
    date: p.payment_date,
    unitNumber: unitNumberById.get(leaseUnit.get(p.lease_id) ?? "") ?? "—",
    tenantName: leaseTenant.get(p.lease_id) ?? "—",
    amount: num(p.amount),
    method: p.payment_method,
    type: p.payment_type,
    reference: p.reference_number,
    periodLabel:
      p.period_year && p.period_month
        ? monthLabel({ year: p.period_year, month: p.period_month })
        : null,
  }));

  const maintenance: MaintenanceItem[] = (
    (maintenanceResult.data ?? []) as MaintenanceRow[]
  ).map((m) => ({
    id: m.id,
    unitId: m.unit_id,
    unitNumber: unitNumberById.get(m.unit_id) ?? "—",
    category: m.category,
    title: m.title,
    description: m.description,
    urgency: m.urgency,
    status: m.status,
    assignedTo: m.assigned_to,
    assignedPhone: m.assigned_phone,
    estimatedCost: m.estimated_cost === null ? null : num(m.estimated_cost),
    actualCost: m.actual_cost === null ? null : num(m.actual_cost),
    costPaidBy: m.cost_paid_by,
    reportedAt: m.reported_at,
    dueDate: m.due_date,
    completedAt: m.completed_at,
    isOpen: OPEN_MAINTENANCE_STATUSES.includes(m.status),
  }));

  // Leases ending within 60 days, which is the window a landlord has to act in.
  const renewalCutoff = (() => {
    const t =
      Date.UTC(today.year, today.month - 1, today.day) + 60 * 86_400_000;
    const d = new Date(t);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
    };
  })();

  const expiringLeases = unitCards
    .filter((u) => {
      if (!u.lease?.end_date) return false;
      const end = civilFromISO(u.lease.end_date);
      if (!end) return false;
      return (
        compareCivil(end, today) >= 0 && compareCivil(end, renewalCutoff) <= 0
      );
    })
    .map((u) => ({
      unitId: u.id,
      unitNumber: u.unit_number,
      tenantName: u.tenant?.name ?? "—",
      endDate: u.lease?.end_date ?? "",
    }));

  const occupied = unitCards.filter((u) => u.status === "occupied").length;
  const data: BuildingDetailData = {
    building: {
      id: building.id,
      name: building.name,
      building_type: building.building_type,
      address: building.address,
      area: building.area,
      city: building.city,
      status: building.status,
      photos: building.photos ?? [],
      cover_photo: building.cover_photo,
      total_floors: building.total_floors,
      recorded_total_units: building.total_units,
      year_built: building.year_built,
      plot_number: building.plot_number,
      management_type: building.management_type,
      service_charge:
        building.service_charge === null ? null : num(building.service_charge),
      created_at: building.created_at,
    },
    units: unitCards,
    stats: {
      total: unitCards.length,
      occupied,
      vacant: unitCards.filter((u) => u.status === "vacant").length,
      maintenance: unitCards.filter((u) => u.status === "maintenance").length,
      reserved: unitCards.filter((u) => u.status === "reserved").length,
      monthlyRevenue: unitCards
        .filter((u) => u.status === "occupied")
        .reduce((sum, u) => sum + u.monthly_rent, 0),
      occupancyRate:
        unitCards.length === 0
          ? 0
          : Math.round((occupied / unitCards.length) * 100),
    },
    finances: {
      currentLabel: thisMonth.label,
      expected: thisMonth.expected,
      collected: thisMonth.collected,
      outstanding: Math.max(0, thisMonth.expected - thisMonth.collected),
      collectionRate:
        thisMonth.expected === 0
          ? 0
          : Math.round((thisMonth.collected / thisMonth.expected) * 100),
      depositsHeld,
      months,
      arrears,
      recentPayments,
    },
    maintenance,
    expiringLeases,
    todayIso: `${today.year}-${String(today.month).padStart(2, "0")}-${String(
      today.day,
    ).padStart(2, "0")}`,
  };

  return <BuildingDetail data={data} />;
}
