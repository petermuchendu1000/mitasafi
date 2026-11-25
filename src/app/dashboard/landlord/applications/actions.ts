"use server";

/**
 * Recording a decision on an application.
 *
 * A "use server" directive publishes EVERY export of this module as a callable
 * HTTP endpoint. This module therefore has exactly one export, and it
 * authenticates before it touches anything.
 *
 * WHAT THIS DOES NOT NEED TO ENFORCE, AND WHY IT STILL CHECKS
 *   The database already refuses everything that matters: the landlord holds
 *   column privileges on `status` and `landlord_notes` and nothing else, RLS
 *   limits the rows to their own, and a BEFORE UPDATE trigger restores every
 *   applicant-stated column from OLD. So a forged call cannot rewrite someone's
 *   income even if it reaches here. The checks below exist to return a decent
 *   error instead of a raw Postgres code, not as the security boundary —
 *   putting the boundary in the database is the point.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LANDLORD_DECISIONS } from "@/lib/landlord/applications";

export interface DecisionResult {
  success: boolean;
  error?: string;
}

export async function recordApplicationDecision(
  applicationId: string,
  status: string,
  landlordNotes: string | null,
): Promise<DecisionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You need to be signed in." };
  }

  // 'withdrawn' is deliberately absent from LANDLORD_DECISIONS: only the
  // applicant may withdraw, and the database enforces that independently.
  if (!(LANDLORD_DECISIONS as readonly string[]).includes(status)) {
    return { success: false, error: "That is not a decision you can record." };
  }

  const { error } = await supabase
    .from("rental_applications")
    .update({
      status,
      landlord_notes: landlordNotes === "" ? null : landlordNotes,
    })
    .eq("id", applicationId)
    // Redundant with RLS, and kept so a mistake here cannot widen the scope.
    .eq("landlord_id", user.id);

  if (error) {
    console.error("[Applications] decision failed:", error.message);
    if (error.code === "42501") {
      return { success: false, error: "You cannot change that." };
    }
    return { success: false, error: "Could not save that decision." };
  }

  revalidatePath("/dashboard/landlord/applications");
  return { success: true };
}
