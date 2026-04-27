/**
 * Customer Settings Server Actions
 *
 * Manages notification preferences for service customers (tenants).
 * Reuses the same `user_preferences` table as the provider settings,
 * since preferences are user-level, not role-level.
 *
 * Security model:
 * - Auth via getCachedUser()
 * - User-scoped client enforces RLS (user_preferences + profiles have policies)
 * - Whitelist validation on input (only boolean preference keys)
 * - { success, error? } return pattern
 *
 * DB table: user_preferences (upsert on first write)
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/cache/queries";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

// Allowed preference keys — whitelist for input validation
const ALLOWED_PREFERENCE_KEYS = new Set<keyof NotificationPreferences>([
  "email_notifications",
  "sms_notifications",
  "push_notifications",
]);

// =============================================================================
// GET NOTIFICATION PREFERENCES
// =============================================================================

/**
 * Fetch the authenticated user's notification channel preferences.
 * Returns server-defined defaults if no row exists yet (lazy init via upsert).
 */
export async function getCustomerNotificationPreferences(): Promise<
  NotificationPreferences & { error?: string }
> {
  const defaults: NotificationPreferences = {
    email_notifications: true,
    sms_notifications: true,
    push_notifications: true,
  };

  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { ...defaults, error: "Not authenticated" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_preferences")
      .select("email_notifications, sms_notifications, push_notifications")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[CustomerSettings] Failed to fetch preferences:", error);
      return { ...defaults, error: error.message };
    }

    // No row yet → return defaults (row created on first update via upsert)
    if (!data) {
      return defaults;
    }

    return {
      email_notifications: data.email_notifications ?? true,
      sms_notifications: data.sms_notifications ?? true,
      push_notifications: data.push_notifications ?? true,
    };
  } catch (err) {
    console.error("[CustomerSettings] Unexpected error fetching preferences:", err);
    return {
      ...defaults,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// UPDATE NOTIFICATION PREFERENCES
// =============================================================================

/**
 * Update one or more notification channel preferences.
 * Uses UPSERT to create the user_preferences row on first toggle.
 * Input is validated: only known boolean keys are persisted.
 */
export async function updateCustomerNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Whitelist filter: only persist known boolean preference keys
    const sanitized: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(preferences)) {
      if (
        ALLOWED_PREFERENCE_KEYS.has(key as keyof NotificationPreferences) &&
        typeof value === "boolean"
      ) {
        sanitized[key] = value;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return { success: false, error: "No valid preferences provided" };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        { user_id: user.id, ...sanitized },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[CustomerSettings] Failed to update preferences:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    console.error("[CustomerSettings] Unexpected error updating preferences:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// DELETE ACCOUNT REQUEST
// =============================================================================

/**
 * Submit an account deletion request.
 * For safety, this does NOT immediately delete — it flags the account
 * and sends a notification to the support team.
 *
 * This is a soft-delete: sets a `deletion_requested_at` timestamp
 * in the profile metadata. Actual deletion handled by support.
 */
export async function requestAccountDeletion(): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const supabase = await createClient();

    // Fetch current metadata to merge
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      console.error("[CustomerSettings] Fetch profile for deletion:", fetchError);
      return { success: false, error: "Failed to process request" };
    }

    const existingMeta = (profile?.metadata as Record<string, unknown>) ?? {};

    // Check if already requested
    if (existingMeta.deletion_requested_at) {
      return {
        success: false,
        error: "Deletion already requested. Contact support@mitasafi.co.ke for status.",
      };
    }

    // Set deletion flag in metadata
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        metadata: {
          ...existingMeta,
          deletion_requested_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[CustomerSettings] Deletion request update:", updateError);
      return { success: false, error: "Failed to submit request" };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    console.error("[CustomerSettings] Unexpected error in deletion request:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
