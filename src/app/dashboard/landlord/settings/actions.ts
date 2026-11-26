"use server";

/**
 * Landlord settings writes.
 *
 * A "use server" directive publishes EVERY export of this module as a callable
 * HTTP endpoint, so each one authenticates before touching anything, and the
 * set of exports is kept to the three things this page can actually change.
 *
 * WHAT NO EXPORT HERE CAN DO, BY CONSTRUCTION
 *   Change `primary_role`, `is_verified` or `verification_level`. None of them
 *   appears in any update below, and the database refuses the last two to
 *   client roles outright. `primary_role` is derived by trigger, so even a
 *   forged write is overwritten from user_roles before the row lands.
 *   Change the sign-in email. Nothing here touches `profiles.email`, because
 *   writing it would split the address shown from the address you log in with.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  validateProfileDraft,
  sanitisePreferences,
  sanitiseSettingsPatch,
  lateFeeProblem,
  type ProfileFieldErrors,
  type NotificationPreferences,
} from "@/lib/landlord/settings";
import { normaliseKenyanPhone } from "@/lib/landlord/tenancy-form";

export interface SaveResult {
  success: boolean;
  error?: string;
  fieldErrors?: ProfileFieldErrors & { phone?: string };
}

export async function updateLandlordProfile(
  fullName: string,
  phone: string,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const checked = validateProfileDraft({ fullName, phone });
  if (!checked.ok) {
    return { success: false, fieldErrors: checked.errors };
  }

  // Exactly two columns. Named explicitly so nothing can be widened by
  // spreading a client-supplied object into the update.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: checked.values.full_name,
      phone: checked.values.phone,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[LandlordSettings] profile update failed:", error.message);
    return { success: false, error: "Could not save your details." };
  }

  revalidatePath("/dashboard/landlord/settings");
  return { success: true };
}

export async function updateLandlordNotifications(
  preferences: Partial<NotificationPreferences>,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const clean = sanitisePreferences(
    preferences as unknown as Record<string, unknown>,
  );
  if (!clean) {
    return { success: false, error: "Nothing to change." };
  }

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, ...clean }, { onConflict: "user_id" });

  if (error) {
    console.error("[LandlordSettings] preferences failed:", error.message);
    return { success: false, error: "Could not save that preference." };
  }

  revalidatePath("/dashboard/landlord/settings");
  return { success: true };
}

/**
 * Flags the account for deletion. It does NOT delete anything.
 *
 * A landlord's account is attached to buildings, leases, tenants and payment
 * history that other people depend on, so erasure runs through
 * `erase_account`, which is service_role only. This records the request and
 * says plainly that a person handles it.
 */
export async function requestLandlordAccountDeletion(): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .single();

  if (readError) {
    console.error("[LandlordSettings] read metadata:", readError.message);
    return { success: false, error: "Could not submit that request." };
  }

  const existing = (profile?.metadata as Record<string, unknown>) ?? {};
  if (existing.deletion_requested_at) {
    return { success: false, error: "You have already asked for this." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      // Merged, not replaced: metadata holds other things.
      metadata: {
        ...existing,
        deletion_requested_at: new Date().toISOString(),
      },
    })
    .eq("id", user.id);

  if (error) {
    console.error("[LandlordSettings] deletion request:", error.message);
    return { success: false, error: "Could not submit that request." };
  }

  revalidatePath("/dashboard/landlord/settings");
  return { success: true };
}

// ===========================================================================
// landlord_settings
// ===========================================================================

/**
 * Upsert the landlord's settings row.
 *
 * The patch is whitelisted by SETTING_FIELDS before it goes near the database.
 * The column grants would stop the worst of it anyway — landlord_id is not
 * client-writable and RLS pins the row to auth.uid() — but a key that never
 * reaches the query cannot be the thing that gets a grant wrong later.
 */
export async function saveLandlordSettings(
  patch: Record<string, unknown>,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const clean = sanitiseSettingsPatch(patch);
  if (!clean) return { success: false, error: "Nothing to change." };

  const problem = lateFeeProblem(clean);
  if (problem) return { success: false, error: problem };

  const { error } = await supabase
    .from("landlord_settings")
    .upsert({ landlord_id: user.id, ...clean }, { onConflict: "landlord_id" });

  if (error) {
    console.error("[LandlordSettings] save failed:", error.code, error.message);
    if (error.code === "23514") {
      return { success: false, error: "Those values are not a usable policy." };
    }
    return { success: false, error: "Could not save that." };
  }

  revalidatePath("/dashboard/landlord/settings");
  return { success: true };
}

// ===========================================================================
// Caretakers and staff
// ===========================================================================

export interface StaffInput {
  fullName: string;
  phone: string;
  email: string | null;
  staffRole: string;
  buildingIds: string[];
  allProperties: boolean;
  /** One level per module, keyed by column name. Whitelisted below. */
  levels: Record<string, string>;
  maintenanceCategories: string[];
}

import { ACCESS_MODULES, ROLE_PRESETS } from "@/lib/landlord/settings-schema";

const STAFF_ROLE_VALUES = new Set(ROLE_PRESETS.map((r) => r.value));

export async function saveStaffMember(
  staffId: string | null,
  input: StaffInput,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (fullName === "") {
    return { success: false, fieldErrors: { fullName: "Give them a name." } };
  }
  const phone = normaliseKenyanPhone(input.phone.trim());
  if (phone === null) {
    return {
      success: false,
      fieldErrors: { phone: "Enter a Kenyan mobile number, like 0712345678." },
    };
  }
  if (!STAFF_ROLE_VALUES.has(input.staffRole)) {
    return { success: false, error: "Pick a role." };
  }

  // Only known module keys carrying a known level survive. The column grants
  // and RLS would stop the rest, but a key that never reaches the query
  // cannot be the thing a future grant gets wrong.
  const levels: Record<string, string> = {};
  for (const m of ACCESS_MODULES) {
    const v = input.levels[m.key];
    if (v === "all" || v === "view" || v === "none") levels[m.key] = v;
  }

  const row = {
    full_name: fullName,
    phone,
    email: input.email?.trim() || null,
    staff_role: input.staffRole,
    // The trigger refuses any building this landlord does not own, so a
    // forged id fails at the database rather than being filtered here and
    // quietly dropped.
    building_ids: input.allProperties ? [] : input.buildingIds,
    all_properties: input.allProperties,
    maintenance_categories: input.maintenanceCategories,
    ...levels,
  };

  const { error } = staffId
    ? await supabase
        .from("property_staff")
        .update(row)
        .eq("id", staffId)
        .eq("landlord_id", user.id)
    : await supabase
        .from("property_staff")
        .insert({ ...row, landlord_id: user.id });

  if (error) {
    console.error("[LandlordStaff] save failed:", error.code, error.message);
    if (error.code === "28000") {
      return { success: false, error: "That building is not one of yours." };
    }
    if (error.code === "23505") {
      return {
        success: false,
        error: "You already have someone on that number.",
      };
    }
    return { success: false, error: "Could not save that person." };
  }

  revalidatePath("/dashboard/landlord/settings");
  return { success: true };
}

/** Suspend rather than delete: access stops at once, the record survives. */
export async function setStaffStatus(
  staffId: string,
  status: "active" | "suspended",
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const { error } = await supabase
    .from("property_staff")
    .update({ status })
    .eq("id", staffId)
    .eq("landlord_id", user.id);

  if (error) {
    console.error("[LandlordStaff] status failed:", error.message);
    return { success: false, error: "Could not change that." };
  }
  revalidatePath("/dashboard/landlord/settings");
  return { success: true };
}

export async function removeStaffMember(staffId: string): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const { error } = await supabase
    .from("property_staff")
    .delete()
    .eq("id", staffId)
    .eq("landlord_id", user.id);

  if (error) {
    console.error("[LandlordStaff] remove failed:", error.message);
    return { success: false, error: "Could not remove that person." };
  }
  revalidatePath("/dashboard/landlord/settings");
  return { success: true };
}
