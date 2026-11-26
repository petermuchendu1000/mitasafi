/**
 * My rent — the tenant's side of the gateway.
 *
 * WHY THIS PAGE EXISTS
 *   20260358000000 let a landlord say where rent should be sent. Until now
 *   there was nobody to say it to: a tenant could read their lease and
 *   nothing else — not their unit, not a payment they had made, and not the
 *   paybill they are expected to use. This is the other half.
 *
 * WHAT IT WILL NOT DO
 *   Invent a destination. If the landlord has not set one, it says so and
 *   tells the tenant to ask them, because a guessed paybill number sends
 *   somebody's rent to a stranger.
 *
 * AUTHORIZATION
 *   Everything here is reached through the tenant's own record:
 *   tenants.user_id = auth.uid() -> leases -> units -> buildings. Four RLS
 *   policies in 20260359000000 do the work; this page adds no filtering of
 *   its own that the database is not already enforcing.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  destinationFor,
  type PayoutDestination,
} from "@/lib/landlord/payment-instructions";
import { RentClient } from "./RentClient";

export const metadata: Metadata = { title: "My rent | MitaSafi" };

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

  // The tenant record is the anchor for everything below it.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tenant) {
    return <RentClient state="not-a-tenant" />;
  }

  const { data: leases } = await supabase
    .from("leases")
    .select(
      "id, unit_id, status, start_date, end_date, monthly_rent, rent_due_day",
    )
    .eq("tenant_id", tenant.id)
    .order("start_date", { ascending: false });

  const lease = (leases ?? []).find((l) => l.status !== "terminated") ?? null;
  if (!lease) {
    return <RentClient state="no-lease" />;
  }

  const [{ data: unit }, { data: payments }, { data: destinations }] =
    await Promise.all([
      supabase
        .from("units")
        .select("id, unit_number, building_id")
        .eq("id", lease.unit_id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("id, amount, payment_type, status, payment_date, mpesa_receipt")
        .eq("lease_id", lease.id)
        .order("payment_date", { ascending: false })
        .limit(12),
      supabase.from("landlord_payout_methods").select("*"),
    ]);

  const { data: building } = unit?.building_id
    ? await supabase
        .from("buildings")
        .select("name")
        .eq("id", unit.building_id)
        .maybeSingle()
    : { data: null };

  const destination = destinationFor(
    (destinations ?? []) as unknown as PayoutDestination[],
    unit?.building_id ?? null,
  );

  return (
    <RentClient
      state="ok"
      tenantName={tenant.full_name}
      tenantPhone={tenant.phone}
      unitNumber={unit?.unit_number ?? null}
      buildingName={building?.name ?? null}
      monthlyRent={num(lease.monthly_rent)}
      rentDueDay={lease.rent_due_day ?? null}
      destination={destination}
      payments={(payments ?? []).map((p) => ({
        id: p.id,
        amount: num(p.amount),
        type: p.payment_type ?? "rent",
        status: p.status ?? "pending",
        date: p.payment_date,
        receipt: p.mpesa_receipt,
      }))}
    />
  );
}
