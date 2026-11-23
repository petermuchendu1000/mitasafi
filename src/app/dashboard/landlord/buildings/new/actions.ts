"use server";

/**
 * Create a building from the wizard.
 *
 * WHAT THIS REPLACES
 *   `handleSave` in page.tsx: a 1500ms setTimeout, a console.log, an alert
 *   reading "Building saved successfully! 🎉", and a redirect to the buildings
 *   list — which would not contain it, because nothing had been written.
 *
 * AUTHORIZATION
 *   The insert runs on the request-scoped client, so RLS applies, AND
 *   landlord_id is set from `auth.getUser()` rather than from anything the
 *   caller sent. A client cannot create a building owned by someone else even
 *   if it posts their id, because the id in the payload is overwritten here.
 *
 * VALIDATION RUNS TWICE ON PURPOSE
 *   The same buildBuildingInsert the wizard calls before submitting runs again
 *   here, because a server action is a public endpoint and the columns it
 *   writes are CHECK-constrained. One function, so the two cannot disagree.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildBuildingInsert,
  type SubmissionErrors,
} from "@/lib/landlord/building-submission";
import type { BuildingFormData } from "./types";

export interface CreateBuildingResult {
  ok: boolean;
  /** The new building, so the caller can go straight to it. */
  buildingId?: string;
  /** Per-field messages, when the form itself is the problem. */
  errors?: SubmissionErrors;
  /** One message for everything else. */
  message?: string;
}

export async function createBuilding(
  form: BuildingFormData,
): Promise<CreateBuildingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Your session has expired. Sign in again — nothing was lost.",
    };
  }

  const { errors, insert } = buildBuildingInsert(form, user.id);
  if (!insert) return { ok: false, errors };

  const { data, error } = await supabase
    .from("buildings")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    console.error("[createBuilding] failed:", error.code, error.message);

    // 23514 is a CHECK violation: a value buildBuildingInsert should have
    // caught. Reporting it as "something went wrong" would hide a bug in the
    // mapping, so it gets named.
    if (error.code === "23514") {
      return {
        ok: false,
        message:
          "One of those values is not allowed for its field. Nothing was saved.",
      };
    }
    // 42501 is RLS: the row would not belong to the caller.
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You are not allowed to create a building on that account.",
      };
    }
    return {
      ok: false,
      message: "Could not save the building. Nothing was created.",
    };
  }

  revalidatePath("/dashboard/landlord/buildings");
  revalidatePath("/dashboard/landlord");
  return { ok: true, buildingId: data.id };
}
