/**
 * Add a unit to a building.
 *
 * WHAT THIS REPLACES
 *   A 563-line `"use client"` page that collected a unit and then ran a
 *   1000ms setTimeout, logged the form to the console and redirected back to
 *   the building. Nothing was written.
 *
 *   Its type list also offered `single_room` and `shop`, neither of which
 *   units_unit_type_check permits — had it ever submitted, those two options
 *   would have failed for every landlord who picked them. And it collected
 *   size_sqft, rent_amount, floor and a `features` array against columns named
 *   size_sqm, monthly_rent, floor_level (TEXT) and five typed JSONB groups.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewUnitClient } from "./NewUnitClient";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AddUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("id", id)
    .eq("landlord_id", user?.id ?? "")
    .maybeSingle();

  if (!building) notFound();

  return (
    <NewUnitClient buildingId={building.id} buildingName={building.name} />
  );
}
