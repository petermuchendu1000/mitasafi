/**
 * Customer Profile Server Actions
 *
 * Handles profile CRUD operations for service customers (tenants).
 * Follows the same patterns as provider/settings/actions.ts:
 *   - getCachedUser() for auth
 *   - createClient() with RLS enforcement (profiles has SELECT/UPDATE policies for own rows)
 *   - createAdminClient() only for Storage uploads (requires service_role)
 *   - Whitelist validation on input
 *   - { success, error? } return pattern
 *   - revalidatePath() after mutations
 *
 * DB table: profiles (id, full_name, email, phone, avatar_url, metadata, ...)
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUser } from "@/lib/cache/queries";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================

interface ActionResult {
  success: boolean;
  error?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  phone?: string;
}

// Phone validation for Kenyan numbers (+254...)
const KENYAN_PHONE_REGEX = /^\+254[17]\d{8}$/;

// =============================================================================
// GET CUSTOMER PROFILE
// =============================================================================

/**
 * Fetch the current customer's profile from the profiles table.
 * Returns structured profile data for the edit form.
 */
export async function getCustomerProfile(): Promise<{
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    primary_role: string | null;
    created_at: string | null;
  } | null;
  error?: string;
}> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { profile: null, error: "Not authenticated" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, primary_role, created_at")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("[Profile] getCustomerProfile error:", error);
      return { profile: null, error: error.message };
    }

    return { profile: data };
  } catch (err) {
    console.error("[Profile] getCustomerProfile unexpected:", err);
    return {
      profile: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// UPDATE PROFILE BASICS (name, phone)
// =============================================================================

/**
 * Update the customer's basic profile fields.
 * Only `full_name` and `phone` are editable by the user.
 * Email changes require re-authentication (not supported yet).
 */
export async function updateCustomerProfile(
  data: UpdateProfileData
): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Build sanitized update payload — only allow known fields
    const updates: Record<string, unknown> = {};

    if (data.full_name !== undefined) {
      const name = data.full_name.trim();
      if (name.length < 2 || name.length > 100) {
        return { success: false, error: "Name must be 2–100 characters" };
      }
      updates.full_name = name;
    }

    if (data.phone !== undefined) {
      const phone = data.phone.trim();
      if (phone === "") {
        // Allow clearing phone
        updates.phone = null;
      } else if (!KENYAN_PHONE_REGEX.test(phone)) {
        return {
          success: false,
          error: "Phone must be a valid Kenyan number (+254...)",
        };
      } else {
        updates.phone = phone;
      }
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: "No changes provided" };
    }

    updates.updated_at = new Date().toISOString();

    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("[Profile] updateCustomerProfile error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[Profile] updateCustomerProfile unexpected:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =============================================================================
// UPLOAD AVATAR
// =============================================================================

/**
 * Upload a new avatar image for the customer.
 * Accepts FormData with a single "file" field.
 * Uploads to Supabase Storage `avatars` bucket, updates profile.avatar_url.
 */
export async function uploadCustomerAvatar(
  formData: FormData
): Promise<ActionResult & { avatarUrl?: string }> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Only JPG, PNG, or WebP images allowed" };
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "Image must be under 2MB" };
    }

    const admin = createAdminClient();
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `avatars/${user.id}/avatar.${ext}`;

    // Upload to storage (upsert to overwrite existing)
    const { error: uploadError } = await admin.storage
      .from("provider-documents")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("[Profile] Avatar upload error:", uploadError);
      return { success: false, error: "Failed to upload image" };
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = admin.storage.from("provider-documents").getPublicUrl(filePath);

    // Update profile
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[Profile] Avatar URL update error:", updateError);
      return { success: false, error: "Image uploaded but profile update failed" };
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");
    return { success: true, avatarUrl: publicUrl };
  } catch (err) {
    console.error("[Profile] uploadCustomerAvatar unexpected:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
