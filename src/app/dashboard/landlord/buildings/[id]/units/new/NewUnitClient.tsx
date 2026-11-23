"use client";

import { UnitForm } from "../UnitForm";
import { createUnit } from "../actions";
import { EMPTY_UNIT_FORM, type UnitFormValues } from "@/lib/landlord/unit-form";

export function NewUnitClient({
  buildingId,
  buildingName,
}: {
  buildingId: string;
  buildingName: string;
}) {
  return (
    <UnitForm
      mode="create"
      buildingId={buildingId}
      buildingName={buildingName}
      initial={EMPTY_UNIT_FORM}
      cancelHref={`/dashboard/landlord/buildings/${buildingId}`}
      onSubmit={(values: UnitFormValues) => createUnit(buildingId, values)}
    />
  );
}
