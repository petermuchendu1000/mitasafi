/**
 * Saved Providers Server Actions
 *
 * Remove a saved provider from the customer's list.
 * Uses user-scoped client with RLS enforcement (saved_providers has DELETE policy for own rows).
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/cache/queries";
import { revalidatePath } from "next/cache";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Remove a provider from the user's saved list.
 * Deletes the saved_providers row matching user_id + provider_id.
 */
export async function removeSavedProvider(
  providerId: string
): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!providerId || typeof providerId !== "string") {
      return { success: false, error: "Invalid provider ID" };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("saved_providers")
      .delete()
      .eq("user_id", user.id)
      .eq("provider_id", providerId);

    if (error) {
      console.error("[SavedProviders] Remove error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/saved-providers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[SavedProviders] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
