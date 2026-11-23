/**
 * Add a tenant to a unit.
 *
 * WHAT THIS REPLACES
 *   A 790-line `"use client"` page whose unit header came from
 *   `mockUnit = { unit_number: "A101", rent_amount: 35000, ... }` — so every
 *   unit said A101 and pre-filled 35,000 — and whose submit ran a 1500ms
 *   setTimeout, logged the form and redirected back to a unit that still had
 *   no tenant.
 *
 *   Its ID types offered `military_id`, which tenants_id_type_check does not
 *   permit, and omitted `alien_id`, which is the one Kenyan landlords need for
 *   foreign tenants. Its phone check refused every number in +254 form.
 *
 * The unit is read here so the rent and deposit pre-fill from the unit the
 * landlord is actually standing on, and so a unit that already has a live
 * lease can say so before three steps are filled in.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddTenantForm } from "./AddTenantForm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIVE_LEASE_STATUSES = ["active", "pending_signature"];

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function AddTenantPage({
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

  const [{ data: unit }, { data: building }] = await Promise.all([
    supabase
      .from("units")
      .select("id, unit_number, monthly_rent, deposit_amount, deposit_months")
      .eq("id", unitId)
      .eq("building_id", id)
      .eq("landlord_id", landlordId)
      .maybeSingle(),
    supabase
      .from("buildings")
      .select("id, name")
      .eq("id", id)
      .eq("landlord_id", landlordId)
      .maybeSingle(),
  ]);

  if (!unit || !building) notFound();

  const { data: liveLeases } = await supabase
    .from("leases")
    .select("id")
    .eq("unit_id", unitId)
    .eq("landlord_id", landlordId)
    .in("status", LIVE_LEASE_STATUSES)
    .limit(1);

  const rent = num(unit.monthly_rent);
  // Where no deposit is recorded on the unit, the usual Kenyan default is one
  // month, and deposit_months carries what the landlord set.
  const deposit =
    unit.deposit_amount !== null
      ? num(unit.deposit_amount)
      : rent * Math.max(1, unit.deposit_months ?? 1);

  return (
    <AddTenantForm
      buildingId={building.id}
      buildingName={building.name}
      unitId={unit.id}
      unitNumber={unit.unit_number}
      defaultRent={rent}
      defaultDeposit={deposit}
      alreadyLet={Boolean(liveLeases && liveLeases.length > 0)}
    />
  );
}
