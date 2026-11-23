/**
 * Edit a building.
 *
 * The detail page has linked here since it was written; the route did not exist,
 * so "Edit" was a 404 on every building. This is that route.
 *
 * Scope is the building's own facts — what it is, where it is, who manages it,
 * whether it is active. Photos, amenities and policies are the Add Building
 * wizard's territory and are left alone rather than half-represented here.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditBuildingForm } from "./EditBuildingForm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditBuildingPage({
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
  const landlordId = user?.id ?? "";

  const { data: building, error } = await supabase
    .from("buildings")
    // prettier-ignore
    .select(
      "id, name, building_type, address, area, city, total_floors, year_built, plot_number, management_type, service_charge, status",
    )
    .eq("id", id)
    .eq("landlord_id", landlordId)
    .maybeSingle();

  if (error) {
    console.error("[EditBuilding] query failed:", error.message);
  }
  if (!building) notFound();

  return (
    <EditBuildingForm
      buildingId={building.id}
      buildingName={building.name}
      initial={{
        name: building.name ?? "",
        building_type: building.building_type ?? "",
        address: building.address ?? "",
        area: building.area ?? "",
        city: building.city ?? "",
        total_floors:
          building.total_floors === null ? "" : String(building.total_floors),
        year_built:
          building.year_built === null ? "" : String(building.year_built),
        plot_number: building.plot_number ?? "",
        management_type: building.management_type ?? "self",
        service_charge:
          building.service_charge === null
            ? ""
            : String(building.service_charge),
        status: building.status ?? "active",
      }}
    />
  );
}
