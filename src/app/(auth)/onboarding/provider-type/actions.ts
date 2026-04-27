/**
 * Provider Type Selection Actions
 * 
 * Server action to set the provider type (individual/company)
 * during onboarding after signup.
 * 
 * BEHAVIOR:
 * - Creates provider record if it doesn't exist (race condition fix)
 * - Sets or updates business_type during onboarding
 * - Uses admin client for reliable DB writes (bypasses RLS)
 * 
 * This prevents:
 * - RLS blocking inserts/updates during onboarding
 * - Race conditions from OAuth/phone signup flows
 * - Missing provider records
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type ProviderType = "individual" | "company";

interface SetProviderTypeResult {
  success: boolean;
  error?: string;
}

export async function setProviderType(
  providerType: ProviderType
): Promise<SetProviderTypeResult> {
  try {
    // 1. Verify the user is authenticated (via cookie session)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("setProviderType: Not authenticated", authError);
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    // 2. Use admin client for DB operations (bypasses RLS)
    const admin = createAdminClient();

    // 3. Check if provider record already exists
    const { data: existingProvider, error: queryError } = await admin
      .from("service_providers")
      .select("id, business_type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (queryError) {
      console.error("setProviderType: Query failed", queryError);
      return { success: false, error: "Failed to check provider status. Please try again." };
    }

    // 4a. If provider exists → update
    if (existingProvider) {
      const { error: updateError } = await admin
        .from("service_providers")
        .update({ 
          business_type: providerType,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingProvider.id);

      if (updateError) {
        console.error("setProviderType: Update failed", updateError);
        return { success: false, error: "Failed to update provider type. Please try again." };
      }

      revalidatePath("/dashboard/provider");
      return { success: true };
    }

    // 4b. Provider doesn't exist → create
    // Get user's full name from profile for business_name
    const { data: profileData } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const businessName = 
      profileData?.full_name || 
      user.user_metadata?.full_name || 
      user.user_metadata?.name || 
      user.email?.split('@')[0] || 
      'My Business';

    // Build provider record with required fields
    const providerRecord: {
      user_id: string;
      business_name: string;
      business_type: "individual" | "company";
      phone: string;
    } = {
      user_id: user.id,
      business_name: businessName,
      business_type: providerType,
      phone: user.phone || '+254700000000',
    };

    const { error: insertError } = await admin
      .from("service_providers")
      .insert(providerRecord);

    if (insertError) {
      console.error("setProviderType: Insert failed", insertError);
      // Check for unique constraint violation (already exists)
      if (insertError.code === '23505') {
        // Race condition: record was created between our check and insert
        // Try the update instead
        const { error: retryUpdate } = await admin
          .from("service_providers")
          .update({ 
            business_type: providerType,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (retryUpdate) {
          console.error("setProviderType: Retry update also failed", retryUpdate);
          return { success: false, error: "Failed to save provider type. Please try again." };
        }
      } else {
        return { success: false, error: `Failed to create provider profile: ${insertError.message}` };
      }
    }

    // 5. Also ensure user_roles has service_provider role
    const { error: roleError } = await admin
      .from("user_roles")
      .upsert({
        user_id: user.id,
        role: "service_provider",
        is_active: true,
        is_verified: false,
      }, { onConflict: "user_id,role" });

    if (roleError) {
      console.error("setProviderType: Role upsert failed (non-blocking)", roleError);
      // Non-blocking — the provider was created successfully
    }

    revalidatePath("/dashboard/provider");
    revalidatePath("/dashboard/verify-provider");

    return { success: true };
  } catch (error) {
    console.error("setProviderType: Unexpected error", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
