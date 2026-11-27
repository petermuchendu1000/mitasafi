/**
 * One tenant.
 *
 * WHY THIS FILE DID NOT EXIST
 *   The tenants list has linked to /dashboard/landlord/tenants/<id> since it
 *   was written, and the unit detail page had a chevron to the same place.
 *   Neither resolved: there was no route directory at all — `find` over
 *   src/app/dashboard/landlord/tenants returned exactly one file, page.tsx.
 *   I removed the unit page's link last task rather than leave a 404; this is
 *   the page it should have gone to.
 *
 * AUTHORIZATION — the point of care on this route
 *   This is a PII surface: name, phone, email, ID number, employer, emergency
 *   contact. The row is fetched with `.eq("created_by", user.id)` and a
 *   missing row is notFound(), so a tenant id belonging to another landlord
 *   reads as absent rather than as forbidden — which also avoids confirming
 *   that the id exists. RLS enforces the same thing independently; verified on
 *   the live project that the identical query returns rows to the creating
 *   landlord and nothing to another.
 *
 *   Every dependent query is additionally scoped: leases by landlord_id AND
 *   tenant_id, payments by the lease ids that survived that filter, and
 *   maintenance by landlord_id AND tenant_id. No query trusts the URL alone.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  nairobiToday,
  rentStatusForPeriod,
  leaseCoversPeriod,
  civilFromISO,
  recentPeriods,
} from "@/lib/landlord/rent-status";
import { LIVE_LEASE_STATUSES } from "@/lib/landlord/portfolio";
import { initialOf } from "@/lib/landlord/tenant-directory";
import { TenantProfile } from "./TenantProfile";
import type { TenantProfileData } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // A non-UUID would make PostgREST reject the query with 22P02 rather than
  // return nothing. The old mock links used ids like "t1".
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  // notes and blacklist_reason are NOT selected here. After 20260363000000 no
  // client role holds SELECT on them, because the same policy that lets a
  // tenant read their own row would otherwise hand them their landlord's
  // private assessment: RLS restricts rows, never columns. They come from
  // tenant_private_notes, a view scoped to the landlord who wrote them.
  const [{ data: tenant, error }, { data: privateNotes }] = await Promise.all([
    supabase
      .from("tenants")
      // prettier-ignore
      .select(
        "id, full_name, phone, phone_secondary, email, id_type, id_number, occupation, employer, employer_phone, verification_level, verified_at, status, emergency_contact, default_occupants, created_at",
      )
      .eq("id", id)
      .eq("created_by", landlordId)
      .maybeSingle(),
    supabase
      .from("tenant_private_notes")
      .select("notes, blacklist_reason")
      .eq("tenant_id", id)
      .maybeSingle(),
  ]);

  if (error) {
    console.error("[TenantDetail] query failed:", error.message);
  }
  if (!tenant) notFound();

  const { data: leaseRows } = await supabase
    .from("leases")
    // prettier-ignore
    .select(
      "id, unit_id, status, lease_type, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, deposit_amount, deposit_status, deposit_refunded, payment_method, terminated_at, termination_reason, terminated_by",
    )
    .eq("tenant_id", id)
    .eq("landlord_id", landlordId)
    .order("start_date", { ascending: false });

  const leases = leaseRows ?? [];
  const leaseIds = leases.map((l) => l.id);
  const unitIds = [...new Set(leases.map((l) => l.unit_id))];

  const [{ data: paymentRows }, { data: unitRows }, { data: maintenanceRows }] =
    await Promise.all([
      leaseIds.length
        ? supabase
            .from("payments")
            // prettier-ignore
            .select(
              "id, lease_id, amount, payment_type, status, period_year, period_month, payment_date, payment_method, reference_number",
            )
            .in("lease_id", leaseIds)
            .order("payment_date", { ascending: false })
            .limit(500)
        : Promise.resolve({ data: [] }),
      unitIds.length
        ? supabase
            .from("units")
            .select("id, unit_number, building_id")
            .in("id", unitIds)
            .eq("landlord_id", landlordId)
        : Promise.resolve({ data: [] }),
      supabase
        .from("maintenance_requests")
        // prettier-ignore
        .select(
          "id, unit_id, category, title, description, urgency, status, assigned_to, assigned_phone, estimated_cost, actual_cost, cost_paid_by, reported_at, due_date, completed_at",
        )
        .eq("tenant_id", id)
        .eq("landlord_id", landlordId)
        .order("reported_at", { ascending: false })
        .limit(100),
    ]);

  const payments = paymentRows ?? [];
  const units = unitRows ?? [];
  const unitById = new Map(units.map((u) => [u.id, u]));

  const buildingIds = [
    ...new Set(units.map((u) => u.building_id).filter((b): b is string => !!b)),
  ];
  const { data: buildingRows } = buildingIds.length
    ? await supabase
        .from("buildings")
        .select("id, name, area")
        .in("id", buildingIds)
        .eq("landlord_id", landlordId)
    : { data: [] };
  const buildingById = new Map((buildingRows ?? []).map((b) => [b.id, b]));

  const today = nairobiToday();
  const period = { year: today.year, month: today.month };

  /** Confirmed rent per lease per period, for the rent position and history. */
  const rentPaid = new Map<string, number>();
  for (const p of payments) {
    if (p.payment_type !== "rent") continue;
    if (p.status !== "confirmed") continue;
    if (p.period_year === null || p.period_month === null) continue;
    const key = `${p.lease_id}:${p.period_year}-${p.period_month}`;
    rentPaid.set(key, (rentPaid.get(key) ?? 0) + num(p.amount));
  }

  const live = leases.filter((l) =>
    LIVE_LEASE_STATUSES.includes(l.status ?? "draft"),
  );

  // Rent position across every live lease covering this month, aggregated the
  // same way the directory does it so the row and this page cannot disagree.
  const SEVERITY = { overdue: 0, partial: 1, pending: 2, paid: 3 } as const;
  let rent: TenantProfileData["rent"] = null;
  for (const l of live) {
    if (
      !leaseCoversPeriod(
        { start_date: l.start_date, end_date: l.end_date },
        period,
      )
    )
      continue;
    const paid = rentPaid.get(`${l.id}:${period.year}-${period.month}`) ?? 0;
    const r = rentStatusForPeriod({
      monthlyRent: num(l.monthly_rent),
      rentDueDay: l.rent_due_day ?? 5,
      gracePeriodDays: l.grace_period_days ?? 0,
      amountPaid: paid,
      period,
      today,
      leaseStart: civilFromISO(l.start_date),
    });
    rent = rent
      ? {
          status:
            SEVERITY[rent.status] <= SEVERITY[r.status]
              ? rent.status
              : r.status,
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

  // Six months of this tenant's rent, across whichever leases covered them.
  const months = recentPeriods(period, 6).map((p) => {
    let expected = 0;
    let collected = 0;
    for (const l of leases) {
      const status = l.status ?? "draft";
      if (!LIVE_LEASE_STATUSES.includes(status) && status !== "expired")
        continue;
      if (
        !leaseCoversPeriod(
          { start_date: l.start_date, end_date: l.end_date },
          p,
        )
      )
        continue;
      expected += num(l.monthly_rent);
      collected += rentPaid.get(`${l.id}:${p.year}-${p.month}`) ?? 0;
    }
    return {
      label: `${MONTH_SHORT[p.month - 1]} ${p.year}`,
      expected,
      collected,
    };
  });

  const emergency = (tenant.emergency_contact ?? {}) as Record<string, string>;
  const occupants = (tenant.default_occupants ?? {}) as Record<string, unknown>;

  const data: TenantProfileData = {
    tenant: {
      id: tenant.id,
      name: tenant.full_name,
      initial: initialOf(tenant.full_name),
      phone: tenant.phone,
      phoneSecondary: tenant.phone_secondary,
      email: tenant.email,
      idType: tenant.id_type,
      idNumber: tenant.id_number,
      occupation: tenant.occupation,
      employer: tenant.employer,
      employerPhone: tenant.employer_phone,
      verificationLevel: tenant.verification_level,
      verifiedAt: tenant.verified_at,
      status: tenant.status ?? "active",
      blacklistReason: privateNotes?.blacklist_reason ?? null,
      emergency,
      occupants: {
        adults: typeof occupants.adults === "number" ? occupants.adults : null,
        children:
          typeof occupants.children === "number" ? occupants.children : null,
      },
      notes: privateNotes?.notes ?? null,
      createdAt: tenant.created_at,
    },
    leases: leases.map((l) => {
      const unit = unitById.get(l.unit_id);
      const building = unit?.building_id
        ? buildingById.get(unit.building_id)
        : undefined;
      return {
        id: l.id,
        unitId: l.unit_id,
        unitNumber: unit?.unit_number ?? "—",
        buildingId: unit?.building_id ?? null,
        buildingName: building?.name ?? null,
        buildingArea: building?.area ?? null,
        status: l.status ?? "draft",
        leaseType: l.lease_type,
        startDate: l.start_date,
        endDate: l.end_date,
        monthlyRent: num(l.monthly_rent),
        rentDueDay: l.rent_due_day ?? 5,
        depositAmount: l.deposit_amount === null ? null : num(l.deposit_amount),
        depositStatus: l.deposit_status,
        depositRefunded:
          l.deposit_refunded === null ? null : num(l.deposit_refunded),
        paymentMethod: l.payment_method,
        terminatedAt: l.terminated_at,
        terminationReason: l.termination_reason,
        terminatedBy: l.terminated_by,
        isLive: LIVE_LEASE_STATUSES.includes(l.status ?? "draft"),
      };
    }),
    payments: payments.map((p) => {
      const lease = leases.find((l) => l.id === p.lease_id);
      const unit = lease ? unitById.get(lease.unit_id) : undefined;
      return {
        id: p.id,
        amount: num(p.amount),
        type: p.payment_type,
        status: p.status ?? "pending",
        date: p.payment_date,
        method: p.payment_method,
        reference: p.reference_number,
        periodLabel:
          p.period_year && p.period_month
            ? `${MONTH_SHORT[p.period_month - 1]} ${p.period_year}`
            : null,
        unitNumber: unit?.unit_number ?? null,
      };
    }),
    maintenance: (maintenanceRows ?? []).map((m) => {
      const unit = unitById.get(m.unit_id);
      return {
        id: m.id,
        unitId: m.unit_id,
        unitNumber: unit?.unit_number ?? "—",
        buildingId: unit?.building_id ?? null,
        buildingName: unit?.building_id
          ? (buildingById.get(unit.building_id)?.name ?? null)
          : null,
        category: m.category,
        title: m.title,
        description: m.description,
        urgency: m.urgency ?? "normal",
        status: m.status ?? "open",
        assignedTo: m.assigned_to,
        assignedPhone: m.assigned_phone,
        estimatedCost: m.estimated_cost === null ? null : num(m.estimated_cost),
        actualCost: m.actual_cost === null ? null : num(m.actual_cost),
        costPaidBy: m.cost_paid_by,
        reportedAt: m.reported_at ?? "",
        dueDate: m.due_date,
        completedAt: m.completed_at,
        isOpen: !["completed", "closed", "cancelled"].includes(
          m.status ?? "open",
        ),
      };
    }),
    rent,
    months,
    depositsHeld: live.reduce(
      (s, l) =>
        s +
        (l.deposit_status === "held" ||
        l.deposit_status === "partially_refunded"
          ? Math.max(0, num(l.deposit_amount) - num(l.deposit_refunded))
          : 0),
      0,
    ),
    periodLabel: `${MONTH_SHORT[period.month - 1]} ${period.year}`,
  };

  return <TenantProfile data={data} />;
}
