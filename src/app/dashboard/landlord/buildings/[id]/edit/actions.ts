"use server";

/**
 * Save an edit to a building.
 *
 * WHY THIS EXISTS AT ALL
 *   The building detail page has always rendered an "Edit" button pointing at
 *   /dashboard/landlord/buildings/<id>/edit. That route did not exist, so the
 *   button was a 404 for every building and every landlord.
 *
 * AUTHORIZATION
 *   The UPDATE is filtered by `landlord_id = auth.uid()` as well as by id, and
 *   uses the request-scoped client, so RLS applies too. Both are deliberate: the
 *   filter means a mistake in the policy cannot let one landlord rename another's
 *   building, and the policy means a mistake in this file cannot either. The
 *   admin client is NOT used here — nothing about editing your own building needs
 *   to escape your own row-level permissions.
 *
 *   `.select("id")` on the update makes the difference between "saved" and
 *   "matched no row" visible: PostgREST reports success for an UPDATE that
 *   touched nothing, and silently discarding someone's edit is worse than an
 *   error.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  validateBuildingForm,
  type BuildingFormValues,
  type BuildingFormErrors,
} from "@/lib/landlord/building-form";

export interface UpdateBuildingResult {
  ok: boolean;
  /** Per-field messages, when the form itself is the problem. */
  errors?: BuildingFormErrors;
  /** One message for everything else: not signed in, no such building, refused. */
  message?: string;
}

export async function updateBuilding(
  buildingId: string,
  values: BuildingFormValues,
): Promise<UpdateBuildingResult> {
  const { errors, update } = validateBuildingForm(values);
  if (!update) return { ok: false, errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Your session has expired. Sign in again." };
  }

  const { data, error } = await supabase
    .from("buildings")
    .update(update)
    .eq("id", buildingId)
    .eq("landlord_id", user.id)
    .select("id");

  if (error) {
    console.error("[updateBuilding] failed:", error.code, error.message);
    // 23514 is a CHECK violation: a value the form should have caught. Saying
    // "something went wrong" for that hides a bug, so it gets named.
    if (error.code === "23514") {
      return {
        ok: false,
        message:
          "One of those values is not allowed for this field. Nothing was saved.",
      };
    }
    return {
      ok: false,
      message: "Could not save the changes. Nothing was changed.",
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      message: "That building could not be found on your account.",
    };
  }

  revalidatePath(`/dashboard/landlord/buildings/${buildingId}`);
  revalidatePath("/dashboard/landlord/buildings");
  return { ok: true };
}
