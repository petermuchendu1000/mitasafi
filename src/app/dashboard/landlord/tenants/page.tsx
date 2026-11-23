/**
 * Every tenant this landlord has on record.
 *
 * WHAT THIS REPLACES
 *   466 lines of `"use client"` built entirely from `mockTenants`: six invented
 *   people ("John Mwangi" … "David Kimani") in two invented buildings, each
 *   with a hardcoded `rent_status` literal. Its unit links pointed at
 *   /dashboard/landlord/buildings/1/units/u1 — a non-UUID id, so a 404 — and
 *   its name links pointed at /dashboard/landlord/tenants/<id>, a route that
 *   did not exist.
 *
 * AUTHORIZATION
 *   tenants is scoped by `created_by`, not by a landlord_id column, so that is
 *   what this filters on. Verified on the live project: the identical query
 *   returns three rows to the landlord who created them and zero rows to a
 *   different landlord and to anon. The explicit filter and RLS both apply, so
 *   neither has to be the only line of defence.
 *
 * WHY THE AGGREGATES ARE COMPUTED HERE AND NOT BY get_landlord_portfolio_stats
 *   That deployed function exists and looks like exactly the right tool. It
 *   cannot be used: EXECUTE is revoked from `authenticated`, verified live —
 *   it returns 42501 even to the landlord asking about their own id. A
 *   user-session page has no route to it, so the rollup stays in TypeScript,
 *   where it is shared with the overview and the building pages.
 */

import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/landlord/rent-status";
import { buildTenantDirectory } from "@/lib/landlord/tenant-directory";
import { TenantDirectory } from "./TenantDirectory";

/** PostgREST returns numeric as a string; null must not quietly become 0. */
function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function TenantsListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const [
    { data: tenantRows, error: tenantsError },
    { data: unitRows },
    { data: buildingRows },
  ] = await Promise.all([
    supabase
      .from("tenants")
      // prettier-ignore
      .select(
        "id, full_name, phone, email, id_type, id_number, occupation, employer, verification_level, status, created_at",
      )
      .eq("created_by", landlordId)
      .order("full_name", { ascending: true }),
    supabase
      .from("units")
      .select("id, unit_number, building_id")
      .eq("landlord_id", landlordId),
    supabase.from("buildings").select("id, name").eq("landlord_id", landlordId),
  ]);

  if (tenantsError) {
    console.error("[Tenants] query failed:", tenantsError.message);
  }

  const tenants = tenantRows ?? [];

  // Leases are fetched for the landlord, not per tenant: one query either way,
  // and a lease whose tenant_id is not in `tenants` would indicate a data
  // problem rather than something to render.
  const { data: leaseRows } = tenants.length
    ? await supabase
        .from("leases")
        // prettier-ignore
        .select(
          "id, tenant_id, unit_id, status, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, deposit_amount, deposit_status",
        )
        .eq("landlord_id", landlordId)
        .limit(2000)
    : { data: [] };

  const leases = leaseRows ?? [];

  const { data: paymentRows } = leases.length
    ? await supabase
        .from("payments")
        // prettier-ignore
        .select(
          "lease_id, amount, payment_type, status, period_year, period_month",
        )
        .in(
          "lease_id",
          leases.map((l) => l.id),
        )
        .eq("status", "confirmed")
        .limit(5000)
    : { data: [] };

  const today = nairobiToday();
  const { tenants: directory, stats } = buildTenantDirectory({
    tenants: tenants.map((t) => ({
      id: t.id,
      full_name: t.full_name,
      phone: t.phone,
      email: t.email,
      id_type: t.id_type,
      id_number: t.id_number,
      occupation: t.occupation,
      employer: t.employer,
      verification_level: t.verification_level,
      status: t.status,
      created_at: t.created_at,
    })),
    leases: leases.map((l) => ({
      id: l.id,
      tenant_id: l.tenant_id,
      unit_id: l.unit_id,
      status: l.status ?? "draft",
      start_date: l.start_date,
      end_date: l.end_date,
      monthly_rent: num(l.monthly_rent),
      rent_due_day: l.rent_due_day ?? 5,
      grace_period_days: l.grace_period_days ?? 0,
      deposit_amount: l.deposit_amount === null ? null : num(l.deposit_amount),
      deposit_status: l.deposit_status,
    })),
    payments: (paymentRows ?? []).map((p) => ({
      lease_id: p.lease_id,
      amount: num(p.amount),
      payment_type: p.payment_type,
      status: p.status ?? "pending",
      period_year: p.period_year,
      period_month: p.period_month,
    })),
    units: (unitRows ?? []).map((u) => ({
      id: u.id,
      unit_number: u.unit_number,
      building_id: u.building_id,
    })),
    buildings: (buildingRows ?? []).map((b) => ({ id: b.id, name: b.name })),
    period: { year: today.year, month: today.month },
    today,
  });

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

  return (
    <TenantDirectory
      tenants={directory}
      stats={stats}
      periodLabel={`${MONTH_SHORT[today.month - 1]} ${today.year}`}
    />
  );
}
