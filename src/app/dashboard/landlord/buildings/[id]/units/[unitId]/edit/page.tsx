/**
 * Edit a unit.
 *
 * The unit detail page has linked here from two places since it was written —
 * the header pencil and the Quick Actions list — and the route did not exist.
 * Both were 404s. The form is the same component Add Unit uses.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { unitRowToForm } from "@/lib/landlord/unit-form";
import { EditUnitClient } from "./EditUnitClient";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditUnitPage({
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
      // prettier-ignore
      .select(
        "id, unit_number, unit_type, floor_level, wing_block, bedrooms, bathrooms, size_sqm, monthly_rent, deposit_amount, service_charge, status, furnishing, balconies, kitchen_features, bathroom_features, climate_control, storage_features, security_features, metadata",
      )
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

  return (
    <EditUnitClient
      buildingId={building.id}
      buildingName={`${building.name} · Unit ${unit.unit_number}`}
      unitId={unit.id}
      initial={unitRowToForm(unit)}
    />
  );
}
