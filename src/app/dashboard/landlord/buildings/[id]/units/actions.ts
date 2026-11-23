"use server";

/**
 * Creating and editing a unit.
 *
 * WHAT THIS REPLACES
 *   units/new/page.tsx ended with a 1000ms setTimeout, a console.log and a
 *   redirect back to the building. Nothing was written, and the landlord was
 *   returned to a building that had not gained a unit.
 *
 * AUTHORIZATION
 *   Both the building (on create) and the unit (on edit) are re-read with
 *   `landlord_id = auth.uid()` before anything is written, so a building id in
 *   the URL that belongs to someone else cannot have a unit added to it. RLS
 *   says the same thing; the explicit filter means neither has to be the only
 *   line of defence.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildUnitUpsert,
  type UnitFormValues,
  type UnitFormErrors,
} from "@/lib/landlord/unit-form";

export interface UnitActionResult {
  ok: boolean;
  unitId?: string;
  errors?: UnitFormErrors;
  message?: string;
}

function duplicateMessage(unitNumber: string): string {
  return `This building already has a unit called "${unitNumber}".`;
}

/**
 * Is this unit number already used in this building?
 *
 * MEASURED: there is NO unique index on (building_id, unit_number). I assumed
 * one and wrote a 23505 handler; driving the form proved it dead by creating a
 * second "C301-TEST" in the same building, with a different type and rent.
 * Two units with one number is a real problem — the building grid, the rent
 * table and the arrears list would each show two rows a landlord cannot tell
 * apart, and a payment could be recorded against the wrong one.
 *
 * This check closes the case that actually happens (one landlord, one form).
 * It is NOT a substitute for the constraint: two submits racing each other
 * could still both pass it. The constraint is a migration, which is a schema
 * change and is deliberately not bundled into this one; the 23505 branches
 * below stay so that adding it later needs no code change.
 *
 * Comparison is case- and space-insensitive, because "a 101", "A101" and
 * "a101" are the same unit to everyone except a byte comparison.
 */
async function unitNumberTaken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buildingId: string,
  landlordId: string,
  unitNumber: string,
  exceptUnitId?: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("units")
    .select("id, unit_number")
    .eq("building_id", buildingId)
    .eq("landlord_id", landlordId);

  const normalise = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const target = normalise(unitNumber);
  return (data ?? []).some(
    (u) => u.id !== exceptUnitId && normalise(u.unit_number) === target,
  );
}

export async function createUnit(
  buildingId: string,
  form: UnitFormValues,
): Promise<UnitActionResult> {
  const { errors, values } = buildUnitUpsert(form);
  if (!values) return { ok: false, errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Your session has expired. Sign in again." };
  }

  // The building must be this landlord's before a unit can be hung off it.
  const { data: building } = await supabase
    .from("buildings")
    .select("id")
    .eq("id", buildingId)
    .eq("landlord_id", user.id)
    .maybeSingle();

  if (!building) {
    return {
      ok: false,
      message: "That building could not be found on your account.",
    };
  }

  if (
    await unitNumberTaken(supabase, buildingId, user.id, values.unit_number)
  ) {
    return {
      ok: false,
      errors: { unit_number: duplicateMessage(values.unit_number) },
    };
  }

  const { data, error } = await supabase
    .from("units")
    .insert({ ...values, building_id: buildingId, landlord_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("[createUnit] failed:", error.code, error.message);
    if (error.code === "23505") {
      return {
        ok: false,
        errors: { unit_number: duplicateMessage(values.unit_number) },
      };
    }
    if (error.code === "23514") {
      return {
        ok: false,
        message:
          "One of those values is not allowed for its field. Nothing was saved.",
      };
    }
    return {
      ok: false,
      message: "Could not save the unit. Nothing was created.",
    };
  }

  revalidatePath(`/dashboard/landlord/buildings/${buildingId}`);
  revalidatePath("/dashboard/landlord/buildings");
  revalidatePath("/dashboard/landlord");
  return { ok: true, unitId: data.id };
}

export async function updateUnit(
  unitId: string,
  form: UnitFormValues,
): Promise<UnitActionResult> {
  const { errors, values } = buildUnitUpsert(form);
  if (!values) return { ok: false, errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Your session has expired. Sign in again." };
  }

  // The unit being renamed must not collide with a sibling, but it is allowed
  // to keep its own number.
  const { data: current } = await supabase
    .from("units")
    .select("building_id")
    .eq("id", unitId)
    .eq("landlord_id", user.id)
    .maybeSingle();

  if (
    current?.building_id &&
    (await unitNumberTaken(
      supabase,
      current.building_id,
      user.id,
      values.unit_number,
      unitId,
    ))
  ) {
    return {
      ok: false,
      errors: { unit_number: duplicateMessage(values.unit_number) },
    };
  }

  const { data, error } = await supabase
    .from("units")
    .update(values)
    .eq("id", unitId)
    .eq("landlord_id", user.id)
    .select("id, building_id")
    .maybeSingle();

  if (error) {
    console.error("[updateUnit] failed:", error.code, error.message);
    if (error.code === "23505") {
      return {
        ok: false,
        errors: { unit_number: duplicateMessage(values.unit_number) },
      };
    }
    return {
      ok: false,
      message: "Could not save the changes. Nothing was changed.",
    };
  }

  // PostgREST reports success for an UPDATE that matched nothing, and silently
  // discarding an edit is worse than an error.
  if (!data) {
    return {
      ok: false,
      message: "That unit could not be found on your account.",
    };
  }

  if (data.building_id) {
    revalidatePath(`/dashboard/landlord/buildings/${data.building_id}`);
    revalidatePath(
      `/dashboard/landlord/buildings/${data.building_id}/units/${unitId}`,
    );
  }
  revalidatePath("/dashboard/landlord/buildings");
  return { ok: true, unitId };
}
