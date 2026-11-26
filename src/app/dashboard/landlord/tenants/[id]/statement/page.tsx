/**
 * A tenant's rent statement, per lease.
 *
 * AUTHORIZATION
 *   Every query is anchored on landlord_id = the signed-in user. `payments`
 *   has no landlord_id, so it is fetched by the lease ids already proven to
 *   belong to this landlord; a payment on somebody else's lease cannot be
 *   reached because its id is never in the list.
 *
 * The arithmetic is in lib/landlord/statement.ts, which is pure and tested.
 * This page fetches rows and hands them over.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/landlord/rent-status";
import { buildStatement, type StatementLease } from "@/lib/landlord/statement";
import { StatementView } from "./StatementView";

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function TenantStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const landlordId = user.id;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name, phone, email")
    .eq("id", id)
    .maybeSingle();

  const { data: leaseRows } = await supabase
    .from("leases")
    // prettier-ignore
    .select(
      "id, unit_id, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, deposit_amount, status",
    )
    .eq("tenant_id", id)
    .eq("landlord_id", landlordId)
    .order("start_date", { ascending: false });

  const leases = leaseRows ?? [];
  // No lease on this landlord's account means the tenant is not theirs to
  // produce a statement for, whatever the id in the URL says.
  if (!tenant || leases.length === 0) notFound();

  const leaseIds = leases.map((l) => l.id);
  const unitIds = [...new Set(leases.map((l) => l.unit_id).filter(Boolean))];

  const [{ data: paymentRows }, { data: unitRows }] = await Promise.all([
    supabase
      .from("payments")
      // prettier-ignore
      .select(
        "id, lease_id, amount, payment_type, status, period_year, period_month, payment_date, payment_method, reference_number, mpesa_receipt",
      )
      .in("lease_id", leaseIds)
      .order("payment_date", { ascending: false })
      .limit(2000),
    unitIds.length
      ? supabase
          .from("units")
          .select("id, unit_number, building_id")
          .in("id", unitIds)
          .eq("landlord_id", landlordId)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const unitById = new Map((unitRows ?? []).map((u) => [u.id, u]));
  const buildingIds = [
    ...new Set((unitRows ?? []).map((u) => u.building_id).filter(Boolean)),
  ] as string[];
  const { data: buildingRows } = buildingIds.length
    ? await supabase
        .from("buildings")
        .select("id, name")
        .in("id", buildingIds)
        .eq("landlord_id", landlordId)
    : { data: [] as never[] };
  const buildingById = new Map((buildingRows ?? []).map((b) => [b.id, b]));

  const payments = paymentRows ?? [];
  const today = nairobiToday();

  const statements = leases.map((l) => {
    const unit = unitById.get(l.unit_id);
    const shaped: StatementLease = {
      id: l.id,
      unit_label: unit?.unit_number ?? "—",
      building_label: unit?.building_id
        ? (buildingById.get(unit.building_id)?.name ?? "")
        : "",
      start_date: l.start_date,
      end_date: l.end_date,
      monthly_rent: num(l.monthly_rent),
      rent_due_day: num(l.rent_due_day) || 5,
      grace_period_days: num(l.grace_period_days),
      deposit_amount: num(l.deposit_amount),
    };
    return {
      lease: shaped,
      status: l.status ?? "draft",
      statement: buildStatement(
        shaped,
        payments
          .filter((p) => p.lease_id === l.id)
          .map((p) => ({
            id: p.id,
            amount: num(p.amount),
            payment_type: p.payment_type,
            status: p.status,
            period_year: p.period_year,
            period_month: p.period_month,
            payment_date: p.payment_date,
            payment_method: p.payment_method,
            reference_number: p.reference_number,
            mpesa_receipt: p.mpesa_receipt,
          })),
        today,
      ),
    };
  });

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/landlord/tenants/${id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 print:hidden"
      >
        <ArrowLeft aria-hidden="true" className="w-4 h-4" />
        Back to {tenant.full_name}
      </Link>

      <StatementView
        tenantName={tenant.full_name}
        tenantPhone={tenant.phone}
        tenantEmail={tenant.email}
        generatedOn={`${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`}
        statements={statements}
      />
    </div>
  );
}
