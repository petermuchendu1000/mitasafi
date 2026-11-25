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
  type ProfileFieldErrors,
  type NotificationPreferences,
} from "@/lib/landlord/settings";

export interface SaveResult {
  success: boolean;
  error?: string;
  fieldErrors?: ProfileFieldErrors;
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
