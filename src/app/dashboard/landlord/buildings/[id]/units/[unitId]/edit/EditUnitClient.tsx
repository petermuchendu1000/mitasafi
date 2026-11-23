"use client";

import { UnitForm } from "../../UnitForm";
import { updateUnit } from "../../actions";
import type { UnitFormValues } from "@/lib/landlord/unit-form";

export function EditUnitClient({
  buildingId,
  buildingName,
  unitId,
  initial,
}: {
  buildingId: string;
  buildingName: string;
  unitId: string;
  initial: UnitFormValues;
}) {
  return (
    <UnitForm
      mode="edit"
      buildingId={buildingId}
      buildingName={buildingName}
      initial={initial}
      cancelHref={`/dashboard/landlord/buildings/${buildingId}/units/${unitId}`}
      onSubmit={(values: UnitFormValues) => updateUnit(unitId, values)}
    />
  );
}
