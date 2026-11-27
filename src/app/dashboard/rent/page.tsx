/**
 * The tenant's tenancy dashboard.
 *
 * WHY EVERYTHING IS HERE AND NOT ON /dashboard
 *   /dashboard is the services customer's home — bookings, providers, spend.
 *   A tenant's tenancy has nothing to do with it, and until now had no
 *   surface of its own beyond a payment instruction.
 *
 * AUTHORIZATION
 *   Everything hangs off tenants.user_id = auth.uid(): tenant -> leases ->
 *   units -> buildings -> payments, plus the landlord's payout method, all
 *   enforced by the RLS policies added in 20260359000000. This page adds no
 *   filtering the database is not already doing, and could not: the tenant's
 *   own key is the only thing it holds.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/landlord/rent-status";
import { buildStatement, type StatementLease } from "@/lib/landlord/statement";
import { tenancySummary } from "@/lib/tenant/summary";
import {
  destinationFor,
  type PayoutDestination,
} from "@/lib/landlord/payment-instructions";
import { getCustomerUnreadMessageCount } from "@/lib/services/dashboard";
import { CustomerDashboardShell } from "@/components/dashboard/services";
import { RentClient } from "./RentClient";

export const metadata: Metadata = { title: "My home | MitaSafi" };

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function RentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/rent");

  // The same sidebar as the rest of the tenant's dashboard. Without it this
  // page is a dead end: it was reachable only by typing the URL, and once
  // there was no way back to anything else.
  const [{ data: profile }, unreadMessageCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    getCustomerUnreadMessageCount(user.id),
  ]);
  const shell = {
    userId: user.id,
    name: profile?.full_name || user.email?.split("@")[0] || "You",
    email: profile?.email || user.email || "",
    avatarUrl: profile?.avatar_url ?? null,
    unreadMessageCount,
  };

  // tenant_self, not tenants. The view carries only the columns a tenant owns:
  // notes and blacklist_reason are not readable by any client role after
  // 20260363000000, and the view is the named contract that keeps a future
  // column grant from reaching a tenant screen by accident. It filters on
  // user_id itself, so there is no .eq() here to get wrong.
  const { data: tenant } = await supabase
    .from("tenant_self")
    .select("id, full_name, phone")
    .maybeSingle();

  // Narrowed once, here. Every column on a view is nullable in the generated
  // types, because Postgres cannot promise otherwise through a view, even for
  // a primary key. That is a fact about the type generator and not about the
  // data, so it is answered with a guard rather than a cast: a row without an
  // id is not a tenancy this page can show.
  if (!tenant?.id)
    return (
      <CustomerDashboardShell profile={shell}>
        <RentClient state="not-a-tenant" />
      </CustomerDashboardShell>
    );

  const { data: leases } = await supabase
    .from("leases")
    // prettier-ignore
    .select(
      "id, unit_id, status, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, deposit_amount, deposit_status, notice_period_months, lease_document_url, payment_method, inclusions, special_conditions",
    )
    .eq("tenant_id", tenant.id)
    .order("start_date", { ascending: false });

  const lease = (leases ?? []).find((l) => l.status !== "terminated") ?? null;
  if (!lease)
    return (
      <CustomerDashboardShell profile={shell}>
        <RentClient state="no-lease" />
      </CustomerDashboardShell>
    );

  const [
    { data: unit },
    { data: payments },
    { data: destinations },
    { data: maintenance },
  ] = await Promise.all([
    supabase
      .from("units")
      .select("id, unit_number, building_id, bedrooms, bathrooms, unit_type")
      .eq("id", lease.unit_id)
      .maybeSingle(),
    supabase
      .from("payments")
      // prettier-ignore
      .select(
        "id, amount, payment_type, status, payment_date, payment_method, reference_number, mpesa_receipt, period_year, period_month",
      )
      .eq("lease_id", lease.id)
      .order("payment_date", { ascending: false })
      .limit(500),
    supabase.from("landlord_payout_methods").select("*"),
    supabase
      .from("maintenance_requests")
      .select("id, title, category, status, urgency, reported_at, completed_at")
      .eq("tenant_id", tenant.id)
      .order("reported_at", { ascending: false })
      .limit(20),
  ]);

  const { data: building } = unit?.building_id
    ? await supabase
        .from("buildings")
        .select("name, area, access_instructions")
        .eq("id", unit.building_id)
        .maybeSingle()
    : { data: null };

  const destination = destinationFor(
    (destinations ?? []) as unknown as PayoutDestination[],
    unit?.building_id ?? null,
  );

  const shaped: StatementLease = {
    id: lease.id,
    unit_label: unit?.unit_number ?? "—",
    building_label: building?.name ?? "",
    start_date: lease.start_date,
    end_date: lease.end_date,
    monthly_rent: num(lease.monthly_rent),
    rent_due_day: num(lease.rent_due_day) || 5,
    grace_period_days: num(lease.grace_period_days),
    deposit_amount: num(lease.deposit_amount),
  };

  const shapedPayments = (payments ?? []).map((p) => ({
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
  }));

  const today = nairobiToday();

  return (
    <CustomerDashboardShell profile={shell}>
      <RentClient
        state="ok"
        tenantName={tenant.full_name ?? "You"}
        tenantPhone={tenant.phone}
        unitNumber={unit?.unit_number ?? null}
        buildingName={building?.name ?? null}
        area={building?.area ?? null}
        accessInstructions={building?.access_instructions ?? null}
        bedrooms={unit?.bedrooms ?? null}
        bathrooms={unit?.bathrooms ? Number(unit.bathrooms) : null}
        monthlyRent={num(lease.monthly_rent)}
        rentDueDay={lease.rent_due_day ?? null}
        gracePeriodDays={num(lease.grace_period_days)}
        leaseStart={lease.start_date}
        leaseEnd={lease.end_date}
        leaseStatus={lease.status ?? "active"}
        noticePeriodMonths={lease.notice_period_months ?? null}
        leaseDocumentUrl={lease.lease_document_url ?? null}
        depositStatus={lease.deposit_status ?? null}
        destination={destination}
        summary={tenancySummary(shaped, shapedPayments, today)}
        statement={buildStatement(shaped, shapedPayments, today)}
        payments={shapedPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          type: p.payment_type ?? "rent",
          status: p.status ?? "pending",
          date: p.payment_date,
          receipt: p.mpesa_receipt ?? p.reference_number,
          method: p.payment_method,
          period:
            p.period_year && p.period_month
              ? `${p.period_year}-${String(p.period_month).padStart(2, "0")}`
              : null,
        }))}
        maintenance={(maintenance ?? []).map((m) => ({
          id: m.id,
          title: m.title,
          category: m.category,
          status: m.status,
          urgency: m.urgency,
          reportedAt: m.reported_at,
          completedAt: m.completed_at,
        }))}
        today={`${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`}
      />
    </CustomerDashboardShell>
  );
}
