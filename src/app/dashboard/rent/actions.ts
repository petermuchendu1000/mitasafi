"use server";

/**
 * A tenant reporting a repair.
 *
 * A "use server" directive publishes every export as an HTTP endpoint, so
 * this module has one export and it authenticates first.
 *
 * WHAT IS DELIBERATELY NOT SENT
 *   unit_id, landlord_id, tenant_id and status. The client holds no say in
 *   any of them: a BEFORE INSERT trigger derives the three ids from the
 *   tenant's own live lease and forces status to 'open'. That is what stops
 *   a repair being filed against a landlord who has never heard of the
 *   person filing it — the same shape as rental_applications.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyRepairReported } from "@/lib/notifications/emit";
import { REPAIR_CATEGORIES, REPAIR_URGENCIES } from "@/lib/tenant/repairs";

export interface RepairInput {
  category: string;
  title: string;
  description: string;
  urgency: string;
  preferredTime: string;
  accessInstructions: string;
}

export interface RepairResult {
  success: boolean;
  error?: string;
}

function clean(v: string): string {
  return (v ?? "").trim();
}

export async function submitRepairRequest(
  input: RepairInput,
): Promise<RepairResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Please sign in." };

  const title = clean(input.title);
  const description = clean(input.description);
  const category = clean(input.category);
  const urgency = clean(input.urgency) || "normal";

  if (title.length < 3)
    return { success: false, error: "Give it a short title." };
  if (description.length < 10) {
    return { success: false, error: "Say a little more about the problem." };
  }
  // Checked here as well as by the database: a constraint violation reaches
  // the tenant as "23514", which tells them nothing.
  if (!(REPAIR_CATEGORIES as readonly string[]).includes(category)) {
    return { success: false, error: "Choose a category." };
  }
  if (!(REPAIR_URGENCIES as readonly string[]).includes(urgency)) {
    return { success: false, error: "Choose how urgent it is." };
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert({
      category,
      title: title.slice(0, 200),
      description: description.slice(0, 4000),
      urgency,
      preferred_time: clean(input.preferredTime).slice(0, 200) || null,
      access_instructions:
        clean(input.accessInstructions).slice(0, 500) || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Repair] insert failed:", error.code, error.message);
    // 28000 is the trigger refusing somebody with no live lease.
    if (error.code === "28000") {
      return {
        success: false,
        error: "You have no current lease to report a repair against.",
      };
    }
    if (error.code === "42501") {
      return {
        success: false,
        error: "You cannot report a repair on this account.",
      };
    }
    return { success: false, error: "Could not send that. Try again." };
  }

  // The request is saved. Telling the landlord is best effort after that
  // fact and cannot turn a saved report into an error on the tenant's screen.
  await notifyRepairReported({ requestId: data.id });

  revalidatePath("/dashboard/rent");
  return { success: true };
}
