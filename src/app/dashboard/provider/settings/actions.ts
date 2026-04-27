/**
 * Provider Settings Server Actions
 *
 * Manages notification preferences and account deactivation/reactivation.
 *
 * Security model:
 * - Auth validated via getCachedUser() on every call
 * - User-scoped client enforces RLS (user_preferences + service_providers have policies)
 * - Provider ownership double-checked on deactivation (user_id match + RLS)
 *
 * DB tables: user_preferences (upsert), service_providers (update)
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
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

// Allowed preference keys — used to validate input
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
 * Returns server-defined defaults if no row exists yet (lazy initialization).
 */
export async function getNotificationPreferences(): Promise<
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
      console.error("[Settings] Failed to fetch preferences:", error);
      return { ...defaults, error: error.message };
    }

    // No row yet — return defaults (row created on first update via upsert)
    if (!data) {
      return defaults;
    }

    return {
      email_notifications: data.email_notifications ?? true,
      sms_notifications: data.sms_notifications ?? true,
      push_notifications: data.push_notifications ?? true,
    };
  } catch (err) {
    console.error("[Settings] Unexpected error in getNotificationPreferences:", err);
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
 *
 * Input is validated: only known boolean keys are persisted.
 */
export async function updateNotificationPreferences(
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
      console.error("[Settings] Failed to update preferences:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/provider/settings");
    return { success: true };
  } catch (err) {
    console.error("[Settings] Unexpected error in updateNotificationPreferences:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// DEACTIVATE PROVIDER ACCOUNT
// =============================================================================

/**
 * Deactivate the authenticated provider's account.
 *
 * Effects:
 * - service_providers.is_active → false
 * - service_providers.account_status → 'deactivated'
 * - Provider profile hidden from marketplace (queries filter on is_active)
 * - All provider_services hidden (queries join on provider.is_active)
 * - No new booking requests can be submitted
 *
 * Reversible via reactivateProviderAccount().
 * Data (earnings, reviews, messages) is preserved.
 */
export async function deactivateProviderAccount(): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { providerId, error: providerError } = await getCachedProviderId();
    if (providerError || !providerId) {
      return { success: false, error: providerError || "Provider not found" };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("service_providers")
      .update({
        is_active: false,
        account_status: "deactivated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", providerId)
      .eq("user_id", user.id); // Ownership guard (also enforced by RLS)

    if (error) {
      console.error("[Settings] Failed to deactivate account:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/provider", "layout");
    return { success: true };
  } catch (err) {
    console.error("[Settings] Unexpected error in deactivateProviderAccount:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// REACTIVATE PROVIDER ACCOUNT
// =============================================================================

/**
 * Reactivate a previously deactivated provider account.
 *
 * Effects:
 * - service_providers.is_active → true
 * - service_providers.account_status → 'active'
 * - Provider profile visible in marketplace again
 * - Services visible again
 * - Can receive new booking requests
 */
export async function reactivateProviderAccount(): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { providerId, error: providerError } = await getCachedProviderId();
    if (providerError || !providerId) {
      return { success: false, error: providerError || "Provider not found" };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("service_providers")
      .update({
        is_active: true,
        account_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", providerId)
      .eq("user_id", user.id); // Ownership guard (also enforced by RLS)

    if (error) {
      console.error("[Settings] Failed to reactivate account:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/provider", "layout");
    return { success: true };
  } catch (err) {
    console.error("[Settings] Unexpected error in reactivateProviderAccount:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
