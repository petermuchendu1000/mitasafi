/**
 * Unit detail.
 *
 * WHAT THIS REPLACES
 *   A 739-line `"use client"` page built from four mock objects — mockUnit
 *   ("A101"), mockTenant ("Sarah Wanjiku"), mockLease and three mockPayments.
 *   It read `unitId` from the URL and used it only in outbound hrefs, so EVERY
 *   unit in every building rendered as A101 occupied by Sarah Wanjiku, with
 *   the same three payments.
 *
 *   Its status map had three entries for a four-value column, so a 'reserved'
 *   unit threw on `statusConfig[unit.status].bgColor`. It showed `size_sqft`
 *   where the column is square metres, `floor` where the column is
 *   `floor_level`, and a `features` array for a column that does not exist.
 *
 *   The "Record Payment" button opened a modal reading "Payment recording form
 *   coming soon..." whose Save button closed it and did nothing. That mattered
 *   more than it looks: every rent figure across the landlord dashboard is
 *   computed from confirmed payments, and there was no way to create one.
 *
 * WHAT IS HERE NOW
 *   The unit, the tenant and lease in force, the full payment history for that
 *   lease, this month's rent position from the shared rule, and the unit's open
 *   maintenance. The payment modal writes.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  nairobiToday,
  rentStatusForPeriod,
  civilFromISO,
  leaseCoversPeriod,
} from "@/lib/landlord/rent-status";
import { OPEN_MAINTENANCE_STATUSES } from "@/lib/landlord/portfolio";
import { UnitDetail } from "./UnitDetail";
import type { UnitDetailData } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LIVE_LEASE_STATUSES = ["active", "pending_signature"];

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

interface LeaseRow {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number | string | null;
  rent_due_day: number | null;
  grace_period_days: number | null;
  deposit_amount: number | string | null;
  deposit_status: string | null;
  payment_method: string | null;
  lease_type: string | null;
  tenants: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    id_type: string | null;
    id_number: string | null;
    occupation: string | null;
    employer: string | null;
    verification_level: string | null;
    emergency_contact: Record<string, string> | null;
  } | null;
}

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = await params;
  if (!UUID.test(id) || !UUID.test(unitId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const [{ data: unit, error: unitError }, { data: building }] =
    await Promise.all([
      supabase
        .from("units")
        // prettier-ignore
        .select(
          "id, building_id, unit_number, unit_type, floor_level, wing_block, bedrooms, bathrooms, size_sqm, monthly_rent, deposit_amount, service_charge, status, listing_status, furnishing, available_from, balconies, kitchen_features, bathroom_features, climate_control, storage_features, security_features, metadata, created_at",
        )
        .eq("id", unitId)
        .eq("building_id", id)
        .eq("landlord_id", landlordId)
        .maybeSingle(),
      supabase
        .from("buildings")
        .select("id, name, area")
        .eq("id", id)
        .eq("landlord_id", landlordId)
        .maybeSingle(),
    ]);

  if (unitError) {
    console.error("[UnitDetail] unit query failed:", unitError.message);
  }
  if (!unit || !building) notFound();

  const [{ data: leaseRows }, { data: maintenanceRows }] = await Promise.all([
    supabase
      .from("leases")
      // prettier-ignore
      .select(
        "id, status, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, deposit_amount, deposit_status, payment_method, lease_type, tenants ( id, full_name, phone, email, id_type, id_number, occupation, employer, verification_level, emergency_contact )",
      )
      .eq("unit_id", unitId)
      .eq("landlord_id", landlordId)
      .order("start_date", { ascending: false }),
    supabase
      .from("maintenance_requests")
      // prettier-ignore
      .select(
        "id, category, title, description, urgency, status, assigned_to, assigned_phone, estimated_cost, actual_cost, cost_paid_by, reported_at, due_date, completed_at",
      )
      .eq("unit_id", unitId)
      .eq("landlord_id", landlordId)
      .order("reported_at", { ascending: false })
      .limit(50),
  ]);

  const leases = (leaseRows ?? []) as unknown as LeaseRow[];
  const live =
    leases.find((l) => LIVE_LEASE_STATUSES.includes(l.status)) ?? null;

  const { data: paymentRows } = live
    ? await supabase
        .from("payments")
        // prettier-ignore
        .select(
          "id, amount, payment_type, period_year, period_month, payment_date, payment_method, reference_number, status, notes",
        )
        .eq("lease_id", live.id)
        .order("payment_date", { ascending: false })
        .limit(200)
    : { data: [] };

  const payments = paymentRows ?? [];

  const today = nairobiToday();
  const period = { year: today.year, month: today.month };

  let rent: UnitDetailData["rent"] = null;
  if (live && leaseCoversPeriod(live, period)) {
    const paid = payments
      .filter(
        (p) =>
          p.payment_type === "rent" &&
          p.status === "confirmed" &&
          p.period_year === period.year &&
          p.period_month === period.month,
      )
      .reduce((s, p) => s + num(p.amount), 0);

    const r = rentStatusForPeriod({
      monthlyRent: num(live.monthly_rent),
      rentDueDay: live.rent_due_day ?? 5,
      gracePeriodDays: live.grace_period_days ?? 0,
      amountPaid: paid,
      period,
      today,
      leaseStart: civilFromISO(live.start_date),
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

  const meta = (unit.metadata ?? {}) as Record<string, unknown>;

  const data: UnitDetailData = {
    buildingId: building.id,
    buildingName: building.name,
    buildingArea: building.area,
    unit: {
      id: unit.id,
      unit_number: unit.unit_number,
      unit_type: unit.unit_type,
      floor_level: unit.floor_level,
      wing_block: unit.wing_block,
      bedrooms: unit.bedrooms ?? 0,
      bathrooms: unit.bathrooms === null ? null : num(unit.bathrooms),
      size_sqm: unit.size_sqm === null ? null : num(unit.size_sqm),
      monthly_rent: num(unit.monthly_rent),
      deposit_amount:
        unit.deposit_amount === null ? null : num(unit.deposit_amount),
      service_charge:
        unit.service_charge === null ? null : num(unit.service_charge),
      status: unit.status ?? "vacant",
      listing_status: unit.listing_status,
      furnishing: unit.furnishing,
      balconies: unit.balconies ?? 0,
      kitchen_features: (unit.kitchen_features ?? {}) as Record<
        string,
        boolean
      >,
      bathroom_features: (unit.bathroom_features ?? {}) as Record<
        string,
        boolean
      >,
      climate_control: (unit.climate_control ?? {}) as Record<string, boolean>,
      storage_features: (unit.storage_features ?? {}) as Record<
        string,
        boolean
      >,
      security_features: (unit.security_features ?? {}) as Record<
        string,
        boolean
      >,
      description:
        typeof meta.description === "string" ? meta.description : null,
    },
    tenant: live?.tenants
      ? {
          id: live.tenants.id,
          name: live.tenants.full_name,
          phone: live.tenants.phone,
          email: live.tenants.email,
          id_type: live.tenants.id_type,
          id_number: live.tenants.id_number,
          occupation: live.tenants.occupation,
          employer: live.tenants.employer,
          verification_level: live.tenants.verification_level,
          emergency: live.tenants.emergency_contact ?? {},
        }
      : null,
    lease: live
      ? {
          id: live.id,
          status: live.status,
          lease_type: live.lease_type,
          start_date: live.start_date,
          end_date: live.end_date,
          monthly_rent: num(live.monthly_rent),
          rent_due_day: live.rent_due_day ?? 5,
          deposit_amount:
            live.deposit_amount === null ? null : num(live.deposit_amount),
          deposit_status: live.deposit_status,
          payment_method: live.payment_method,
        }
      : null,
    pastLeaseCount: leases.length - (live ? 1 : 0),
    rent,
    payments: payments.map((p) => ({
      id: p.id,
      amount: num(p.amount),
      type: p.payment_type,
      date: p.payment_date,
      method: p.payment_method,
      reference: p.reference_number,
      status: p.status ?? "confirmed",
      periodYear: p.period_year,
      periodMonth: p.period_month,
      notes: p.notes,
    })),
    maintenance: (maintenanceRows ?? []).map((m) => ({
      id: m.id,
      unitId,
      unitNumber: unit.unit_number,
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
      isOpen: OPEN_MAINTENANCE_STATUSES.includes(m.status ?? "open"),
    })),
    todayIso: `${today.year}-${String(today.month).padStart(2, "0")}-${String(
      today.day,
    ).padStart(2, "0")}`,
    currentPeriod: `${period.year}-${String(period.month).padStart(2, "0")}`,
  };

  return <UnitDetail data={data} />;
}
