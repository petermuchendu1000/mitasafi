/**
 * Reports.
 *
 * AUTHORIZATION
 *   `payments` has no landlord_id; it hangs off a lease. So the leases are
 *   read for this landlord first and everything else is fetched by those ids.
 *   A payment, tenant or unit belonging to someone else cannot be reached,
 *   because its id is never in the list.
 *
 * EVERYTHING IS COMPUTED IN ONE PLACE
 *   lib/landlord/reports.ts, which is pure and tested. The page's only job is
 *   to fetch rows and hand them over. Arrears in particular MUST agree with
 *   what reconciliation believes is owed — they share the ledger rule.
 */

import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/landlord/rent-status";
import {
  buildRentRoll,
  buildArrears,
  buildDepositRegister,
  buildExpiries,
  buildOccupancy,
  buildCollections,
  type ReportData,
} from "@/lib/landlord/reports";
import { ReportsClient } from "./ReportsClient";

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const [{ data: buildingRows }, { data: unitRows }, { data: leaseRows }] =
    await Promise.all([
      supabase
        .from("buildings")
        .select("id, name")
        .eq("landlord_id", landlordId),
      supabase
        .from("units")
        .select("id, building_id, unit_number, status")
        .eq("landlord_id", landlordId)
        .limit(5000),
      supabase
        .from("leases")
        // prettier-ignore
        .select(
          "id, unit_id, tenant_id, status, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, deposit_amount, deposit_status",
        )
        .eq("landlord_id", landlordId)
        .limit(3000),
    ]);

  const leases = leaseRows ?? [];
  const leaseIds = leases.map((l) => l.id);
  const tenantIds = [
    ...new Set(leases.map((l) => l.tenant_id).filter(Boolean)),
  ];

  const [{ data: tenantRows }, { data: paymentRows }] = await Promise.all([
    tenantIds.length
      ? supabase
          .from("tenants")
          .select("id, full_name, phone, email")
          .in("id", tenantIds)
      : Promise.resolve({ data: [] as never[] }),
    leaseIds.length
      ? supabase
          .from("payments")
          // prettier-ignore
          .select(
            "lease_id, amount, payment_type, status, period_year, period_month, payment_date",
          )
          .in("lease_id", leaseIds)
          .limit(10000)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const data: ReportData = {
    buildings: buildingRows ?? [],
    // units.status is nullable in the schema. A unit with no status is not
    // occupied and not vacant; it falls into "other", which is the honest
    // bucket for "we do not know".
    units: (unitRows ?? []).map((u) => ({
      id: u.id,
      building_id: u.building_id,
      unit_number: u.unit_number,
      status: u.status ?? "unknown",
    })),
    tenants: (tenantRows ?? []).map((t) => ({
      id: t.id,
      full_name: t.full_name,
      phone: t.phone,
      email: t.email,
    })),
    leases: leases.map((l) => ({
      id: l.id,
      unit_id: l.unit_id,
      tenant_id: l.tenant_id,
      status: l.status ?? "draft",
      start_date: l.start_date,
      end_date: l.end_date,
      monthly_rent: num(l.monthly_rent),
      rent_due_day: num(l.rent_due_day) || 5,
      grace_period_days: num(l.grace_period_days),
      deposit_amount: num(l.deposit_amount),
      deposit_status: l.deposit_status,
    })),
    payments: (paymentRows ?? []).map((p) => ({
      lease_id: p.lease_id,
      amount: num(p.amount),
      payment_type: p.payment_type,
      status: p.status,
      period_year: p.period_year,
      period_month: p.period_month,
      payment_date: p.payment_date,
    })),
  };

  const today = nairobiToday();

  return (
    <ReportsClient
      generatedOn={`${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`}
      rentRoll={buildRentRoll(data, today)}
      arrears={buildArrears(data, today, 12)}
      deposits={buildDepositRegister(data)}
      expiries={buildExpiries(data, today, 90)}
      occupancy={buildOccupancy(data)}
      collections={buildCollections(data, today, 12)}
    />
  );
}
