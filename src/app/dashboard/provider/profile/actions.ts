/**
 * Provider Profile Server Actions
 * 
 * Server actions for managing provider profiles, service areas,
 * working hours, and profile photos.
 * 
 * PERFORMANCE OPTIMIZED:
 * - Uses getCachedUser() for auth deduplication
 * - Uses getCachedProviderId() for lightweight provider lookups
 * - Parallel queries where possible (Promise.all)
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
import { revalidatePath } from "next/cache";
import type {
  Neighborhood,
  NeighborhoodCluster,
  ProviderProfileWithRelations,
  ProviderServiceArea,
  ProviderWorkingHours,
  ProfileBasicsFormData,
  WorkingHoursFormData,
  DayOfWeek,
} from "@/types/provider-profile";

// ============================================================================
// TYPES
// ============================================================================

interface ServiceAreasFormData {
  base_neighborhood_id: string;
  service_area_ids: string[];
  service_radius_km: number;
}

// ============================================================================
// NEIGHBORHOODS
// ============================================================================

/**
 * Get all active neighborhoods grouped by cluster
 */
export async function getNeighborhoodsByCluster(): Promise<{
  clusters: NeighborhoodCluster[];
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();

    const { data: neighborhoods, error } = await supabase
      .from("neighborhoods")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (error) throw error;

    // Group by cluster
    const clusterMap = new Map<string, Neighborhood[]>();
    
    for (const n of neighborhoods || []) {
      const neighborhood = n as Neighborhood;
      const cluster = neighborhood.cluster || "Other";
      if (!clusterMap.has(cluster)) {
        clusterMap.set(cluster, []);
      }
      clusterMap.get(cluster)!.push(neighborhood);
    }

    const clusters: NeighborhoodCluster[] = Array.from(clusterMap.entries()).map(
      ([cluster, neighborhoods]) => ({ cluster, neighborhoods })
    );

    return { clusters, error: null };
  } catch (error) {
    console.error("Error fetching neighborhoods:", error);
    return { clusters: [], error: "Failed to load neighborhoods" };
  }
}

/**
 * Get all neighborhoods as flat list
 */
export async function getAllNeighborhoods(): Promise<{
  neighborhoods: Neighborhood[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("neighborhoods")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    return { neighborhoods: (data || []) as Neighborhood[], error: null };
  } catch (error) {
    console.error("Error fetching neighborhoods:", error);
    return { neighborhoods: [], error: "Failed to load neighborhoods" };
  }
}

// ============================================================================
// PROVIDER PROFILE
// ============================================================================

/**
 * Get current provider's full profile with relations
 */
export async function getProviderProfile(): Promise<{
  profile: ProviderProfileWithRelations | null;
  error: string | null;
}> {
  try {
    // Use cached auth - deduped across layout + page (0ms if already called)
    const { user, error: authError } = await getCachedUser();

    if (authError || !user) {
      return { profile: null, error: authError || "Not authenticated" };
    }

    const supabase = await createClient();

    // Step 1: Get provider profile first (need provider.id for subsequent queries)
    const { data: provider, error: providerError } = await supabase
      .from("service_providers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (providerError) {
      if (providerError.code === "PGRST116") {
        return { profile: null, error: "Provider profile not found" };
      }
      throw providerError;
    }

    // Step 2: PARALLEL - Run all remaining queries simultaneously
    // These queries are independent (only depend on provider.id)
    const [serviceAreasResult, workingHoursResult, neighborhoodResult] = await Promise.all([
      // Service areas with nested neighborhood data
      supabase
        .from("provider_service_areas")
        .select(`*, neighborhood:neighborhoods(*)`)
        .eq("provider_id", provider.id),
      
      // Working hours - check both tables (legacy and new)
      supabase
        .from("provider_availability_intervals")
        .select("*")
        .eq("provider_id", provider.id)
        .eq("is_exception", false)
        .eq("is_active", true),
      
      // Base neighborhood — look up from provider_service_areas (primary area)
      // since base_neighborhood_id was removed from service_providers
      (async () => {
        const { data: primaryArea } = await supabase
          .from("provider_service_areas")
          .select("neighborhood:neighborhoods(*)")
          .eq("provider_id", provider.id)
          .eq("is_primary", true)
          .limit(1)
          .maybeSingle();
        const neighborhood = primaryArea
          ? (primaryArea as Record<string, unknown>).neighborhood
          : null;
        return { data: neighborhood };
      })(),
    ]);

    // Convert availability intervals to working hours format
    const dayRuleMap: Record<string, number> = {
      "SU": 0, "MO": 1, "TU": 2, "WE": 3, "TH": 4, "FR": 5, "SA": 6
    };
    
    const workingHours = (workingHoursResult.data || []).map((interval: {
      id: string;
      provider_id: string;
      available_from: string;
      available_to: string;
      recurrence_rule: string | null;
    }) => {
      let dayOfWeek = 0;
      if (interval.recurrence_rule) {
        const match = interval.recurrence_rule.match(/BYDAY=(\w{2})/);
        if (match) dayOfWeek = dayRuleMap[match[1]] ?? 0;
      }
      const fromDate = new Date(interval.available_from);
      const toDate = new Date(interval.available_to);
      return {
        id: interval.id,
        provider_id: interval.provider_id,
        day_of_week: dayOfWeek,
        is_available: true,
        start_time: fromDate.toTimeString().slice(0, 5),
        end_time: toDate.toTimeString().slice(0, 5),
        break_start: null,
        break_end: null,
      };
    });

    const profile = {
      ...provider,
      base_neighborhood: neighborhoodResult.data as Neighborhood | null,
      service_areas: (serviceAreasResult.data || []) as unknown as ProviderServiceArea[],
      working_hours: workingHours,
    } as unknown as ProviderProfileWithRelations;

    return { profile, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching provider profile:", errorMessage, error);
    return { profile: null, error: errorMessage || "Failed to load profile" };
  }
}

/**
 * Update profile basics (headline, bio, experience, languages)
 * PERFORMANCE: Uses cached auth
 */
export async function updateProfileBasics(data: ProfileBasicsFormData): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    // Use cached auth - deduped with layout
    const { user, error: authError } = await getCachedUser();

    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    // Validate
    if (!data.headline || data.headline.length < 10) {
      return { success: false, error: "Headline must be at least 10 characters" };
    }
    if (!data.bio || data.bio.length < 100) {
      return { success: false, error: "Bio must be at least 100 characters" };
    }
    if (data.headline.length > 80) {
      return { success: false, error: "Headline must be 80 characters or less" };
    }
    if (data.bio.length > 500) {
      return { success: false, error: "Bio must be 500 characters or less" };
    }

    // First verify provider exists for this user
    const supabase = await createClient();
    const { data: provider, error: fetchError } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !provider) {
      console.error("Provider not found for user:", user.id, fetchError);
      return { success: false, error: "Provider profile not found. Please complete signup first." };
    }

    // Update using user-scoped client — RLS ensures only own row is writable
    const { error } = await supabase
      .from("service_providers")
      .update({
        headline: data.headline.trim(),
        tagline: data.headline.trim(),   // Sync: tagline mirrors headline for backward-compat (search, cards, FeaturedByPrice)
        bio: data.bio.trim(),
        years_experience: data.years_experience || null,
        languages: data.languages || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider.id);

    if (error) {
      console.error("Profile basics update error:", JSON.stringify(error));
      return { success: false, error: error.message || error.code || "Database update failed" };
    }

    revalidatePath("/dashboard/provider");
    return { success: true, error: null };
  } catch (error) {
    // Handle different error types properly
    console.error("Error updating profile basics:", JSON.stringify(error), error);
    
    let errorMessage = "Failed to update profile";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      } else {
        errorMessage = JSON.stringify(error);
      }
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Update provider social media links
 */
export async function updateSocialLinks(data: Record<string, string>): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    // Validate URLs — each value should be a valid URL
    for (const [, value] of Object.entries(data)) {
      if (value) {
        try {
          new URL(value);
        } catch {
          return { success: false, error: `Invalid URL: ${value}` };
        }
      }
    }

    const supabase = await createClient();
    const { data: provider, error: fetchError } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !provider) {
      return { success: false, error: "Provider profile not found." };
    }

    // Update using user-scoped client — RLS ensures only own row is writable
    const { error } = await supabase
      .from("service_providers")
      .update({
        social_links: data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider.id);

    if (error) {
      return { success: false, error: error.message || "Database update failed" };
    }

    revalidatePath("/dashboard/provider");
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update social links";
    return { success: false, error: errorMessage };
  }
}

/**
 * Upload profile photo to Supabase Storage
 * Uses admin client to bypass storage RLS
 */
export async function uploadProfilePhoto(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error: string | null;
}> {
  try {
    const { user, error: authError } = await getCachedUser();

    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }
    const supabase = await createClient();

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { success: false, error: "Please upload a JPG, PNG, or WebP image" };
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image must be less than 5MB" };
    }

    // Get provider ID
    const { data: provider } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!provider) {
      return { success: false, error: "Provider profile not found" };
    }

    const admin = createAdminClient();
    const fileExt = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const fileName = `profile-photos/${provider.id}/${Date.now()}.${fileExt}`;

    const { data, error: uploadError } = await admin.storage
      .from("provider-documents")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Profile photo upload error:", uploadError);
      return { success: false, error: "Failed to upload image" };
    }

    const { data: { publicUrl } } = admin.storage
      .from("provider-documents")
      .getPublicUrl(data.path);

    // Update the profile_photo_url in the database
    const { error: updateError } = await supabase
      .from("service_providers")
      .update({
        profile_photo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider.id);

    if (updateError) {
      console.error("Error updating profile photo URL:", updateError);
      return { success: false, error: "Failed to save photo URL" };
    }

    revalidatePath("/dashboard/provider");
    return { success: true, url: publicUrl, error: null };
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    return { success: false, error: "Failed to upload photo" };
  }
}

/**
 * Update profile photo URL
 */
export async function updateProfilePhoto(photoUrl: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { user, error: authError } = await getCachedUser();

    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }
    const supabase = await createClient();

    const { error } = await supabase
      .from("service_providers")
      .update({
        profile_photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/dashboard/provider");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating profile photo:", error);
    return { success: false, error: "Failed to update photo" };
  }
}

// ============================================================================
// SERVICE AREAS
// ============================================================================

/**
 * Update provider's service areas
 */
export async function updateServiceAreas(data: ServiceAreasFormData): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    // Use cached auth for performance
    const { user, error: authError } = await getCachedUser();

    if (authError) {
      console.error("[updateServiceAreas] Auth error:", authError);
      return { success: false, error: `Authentication error: ${authError}` };
    }

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    console.log("[updateServiceAreas] User:", user.id);
    console.log("[updateServiceAreas] Input data:", JSON.stringify(data, null, 2));

    // Use admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient();

    // Get provider
    const { data: provider, error: providerError } = await adminClient
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (providerError) {
      console.error("[updateServiceAreas] Provider lookup error:", providerError);
      return { success: false, error: `Provider lookup failed: ${providerError.message}` };
    }

    if (!provider) {
      return { success: false, error: "Provider not found for this user" };
    }

    console.log("[updateServiceAreas] Provider ID:", provider.id);

    // Validate
    if (!data.base_neighborhood_id) {
      return { success: false, error: "Please select your base location" };
    }
    if (data.service_area_ids.length === 0) {
      return { success: false, error: "Please select at least one service area" };
    }
    if (data.service_area_ids.length > 10) {
      return { success: false, error: "Maximum 10 service areas allowed" };
    }

    // Get base neighborhood name
    const { data: baseNeighborhood, error: baseNeighborhoodError } = await adminClient
      .from("neighborhoods")
      .select("id, name")
      .eq("id", data.base_neighborhood_id)
      .single();

    if (baseNeighborhoodError) {
      console.error("[updateServiceAreas] Base neighborhood error:", baseNeighborhoodError);
      return { success: false, error: `Base neighborhood lookup failed: ${baseNeighborhoodError.message}` };
    }

    console.log("[updateServiceAreas] Base neighborhood:", baseNeighborhood);

    // Update provider with base location (using existing schema columns)
    const { error: updateError } = await adminClient
      .from("service_providers")
      .update({
        primary_location: baseNeighborhood?.name,
        service_radius_km: data.service_radius_km,
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider.id);

    if (updateError) {
      console.error("[updateServiceAreas] Provider update error:", updateError);
      return { success: false, error: `Provider update failed: ${updateError.message}` };
    }

    console.log("[updateServiceAreas] Provider location updated");

    // Delete existing service areas
    const { error: deleteError } = await adminClient
      .from("provider_service_areas")
      .delete()
      .eq("provider_id", provider.id);

    if (deleteError) {
      console.error("[updateServiceAreas] Delete service areas error:", deleteError);
      return { success: false, error: `Delete service areas failed: ${deleteError.message}` };
    }

    console.log("[updateServiceAreas] Existing service areas deleted");

    // Fetch neighborhood names for selected IDs
    const { data: neighborhoods, error: neighborhoodsError } = await adminClient
      .from("neighborhoods")
      .select("id, name")
      .in("id", data.service_area_ids);

    if (neighborhoodsError) {
      console.error("[updateServiceAreas] Neighborhoods lookup error:", neighborhoodsError);
      return { success: false, error: `Neighborhoods lookup failed: ${neighborhoodsError.message}` };
    }

    if (!neighborhoods || neighborhoods.length === 0) {
      console.error("[updateServiceAreas] No neighborhoods found for IDs:", data.service_area_ids);
      return { success: false, error: "Could not find selected neighborhoods" };
    }

    console.log("[updateServiceAreas] Found neighborhoods:", neighborhoods.length);

    // Insert new service areas with correct schema columns
    const serviceAreas = neighborhoods.map((neighborhood: { id: string; name: string }) => ({
      provider_id: provider.id,
      area_name: neighborhood.name,
      area_type: "neighborhood",
      is_primary_area: neighborhood.id === data.base_neighborhood_id,
    }));

    console.log("[updateServiceAreas] Inserting service areas:", JSON.stringify(serviceAreas, null, 2));

    const { error: insertError } = await adminClient
      .from("provider_service_areas")
      .insert(serviceAreas);

    if (insertError) {
      console.error("[updateServiceAreas] Insert service areas error:", insertError);
      return { success: false, error: `Insert service areas failed: ${insertError.message}` };
    }

    console.log("[updateServiceAreas] Service areas inserted successfully");

    revalidatePath("/dashboard/provider");
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[updateServiceAreas] Unexpected error:", error);
    return { success: false, error: `Unexpected error: ${errorMessage}` };
  }
}

/**
 * Get provider's current service areas
 * PERFORMANCE: Uses cached auth
 */
export async function getProviderServiceAreas(): Promise<{
  areas: ProviderServiceArea[];
  baseNeighborhoodId: string | null;
  serviceRadiusKm: number;
  error: string | null;
}> {
  try {
    // Use cached auth - deduped with layout
    const { user, error: authError } = await getCachedUser();

    if (authError || !user) {
      return { areas: [], baseNeighborhoodId: null, serviceRadiusKm: 10, error: authError || "Not authenticated" };
    }

    const supabase = await createClient();

    const { data: provider } = await supabase
      .from("service_providers")
      .select("id, service_radius_km")
      .eq("user_id", user.id)
      .single();

    if (!provider) {
      return { areas: [], baseNeighborhoodId: null, serviceRadiusKm: 10, error: null };
    }

    const { data: areas } = await supabase
      .from("provider_service_areas")
      .select(`
        *,
        neighborhood:neighborhoods(*)
      `)
      .eq("provider_id", provider.id);

    // Derive base neighborhood from primary service area
    const primaryArea = (areas || []).find(
      (a: Record<string, unknown>) => a.is_primary === true
    ) as Record<string, unknown> | undefined;
    const baseNeighborhoodId = primaryArea
      ? (primaryArea.neighborhood_id as string | null)
      : null;

    return {
      areas: (areas || []) as unknown as ProviderServiceArea[],
      baseNeighborhoodId,
      serviceRadiusKm: provider.service_radius_km || 10,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching service areas:", error);
    return { areas: [], baseNeighborhoodId: null, serviceRadiusKm: 10, error: "Failed to load areas" };
  }
}

// ============================================================================
// WORKING HOURS
// ============================================================================

/**
 * Update provider's working hours
 * 
 * PERFORMANCE: Uses cached auth
 * Uses provider_availability_intervals table (canonical) with recurrence rules.
 * Day-of-week schedules are converted to weekly recurring intervals.
 */
export async function updateWorkingHours(data: WorkingHoursFormData): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    // Use cached auth - deduped with layout
    const { user, error: authError } = await getCachedUser();

    if (authError) {
      console.error("[updateWorkingHours] Auth error:", authError);
      return { success: false, error: `Authentication error: ${authError}` };
    }

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    console.log("[updateWorkingHours] User:", user.id);

    // Use admin client for database operations
    const adminClient = createAdminClient();

    const { data: provider, error: providerError } = await adminClient
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (providerError) {
      console.error("[updateWorkingHours] Provider lookup error:", providerError);
      return { success: false, error: `Provider lookup failed: ${providerError.message}` };
    }

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    console.log("[updateWorkingHours] Provider ID:", provider.id);

    // Validate at least one available day
    const hasAvailableDay = data.schedule.some((s) => s.is_available);
    if (!hasAvailableDay) {
      return { success: false, error: "Please set at least one available day" };
    }

    // Update provider emergency/response settings
    const { error: updateProviderError } = await adminClient
      .from("service_providers")
      .update({
        emergency_available: data.emergency_available,
        emergency_surcharge_type: data.emergency_available ? (data.emergency_surcharge_type || null) : null,
        emergency_surcharge_amount: data.emergency_available ? (data.emergency_surcharge_amount || null) : null,
        response_time: data.response_time || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider.id);

    if (updateProviderError) {
      console.error("[updateWorkingHours] Provider update error:", updateProviderError);
      return { success: false, error: `Provider settings update failed: ${updateProviderError.message}` };
    }

    console.log("[updateWorkingHours] Updated provider emergency/response settings");

    // Delete existing availability intervals for this provider
    const { error: deleteError } = await adminClient
      .from("provider_availability_intervals")
      .delete()
      .eq("provider_id", provider.id)
      .is("is_exception", false);

    if (deleteError) {
      console.error("[updateWorkingHours] Delete error:", deleteError);
      return { success: false, error: `Delete existing hours failed: ${deleteError.message}` };
    }

    console.log("[updateWorkingHours] Deleted existing intervals");

    // Convert day-of-week schedule to intervals with recurrence rules
    // Day mapping: 0=SU, 1=MO, 2=TU, 3=WE, 4=TH, 5=FR, 6=SA
    const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

    // Get a reference date (today) for creating intervals
    const today = new Date();
    const availabilityIntervals = data.schedule
      .filter((s) => s.is_available && s.start_time && s.end_time)
      .map((s) => {
        // day_of_week is already 0-6 (DayOfWeek type)
        const dayIndex = s.day_of_week;
        const daysUntilTarget = (dayIndex - today.getDay() + 7) % 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntilTarget);

        // Parse start and end times
        const [startHour, startMin] = s.start_time.split(":").map(Number);
        const [endHour, endMin] = s.end_time.split(":").map(Number);

        const availableFrom = new Date(targetDate);
        availableFrom.setHours(startHour, startMin, 0, 0);

        const availableTo = new Date(targetDate);
        availableTo.setHours(endHour, endMin, 0, 0);

        return {
          provider_id: provider.id,
          service_id: null,
          available_from: availableFrom.toISOString(),
          available_to: availableTo.toISOString(),
          recurrence_rule: `FREQ=WEEKLY;BYDAY=${dayMap[dayIndex]}`,
          is_exception: false,
          is_active: true,
        };
      });

    console.log("[updateWorkingHours] Inserting intervals:", availabilityIntervals.length);

    if (availabilityIntervals.length > 0) {
      const { error: insertError } = await adminClient
        .from("provider_availability_intervals")
        .insert(availabilityIntervals);

      if (insertError) {
        console.error("[updateWorkingHours] Insert error:", insertError);
        return { success: false, error: `Insert working hours failed: ${insertError.message}` };
      }
    }

    console.log("[updateWorkingHours] Successfully updated working hours");

    revalidatePath("/dashboard/provider");
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[updateWorkingHours] Unexpected error:", error);
    return { success: false, error: `Unexpected error: ${errorMessage}` };
  }
}

/**
 * Get provider's current working hours
 * 
 * PERFORMANCE OPTIMIZED:
 * - Uses getCachedUser() for auth deduplication
 * - Parallel queries for provider + intervals
 * - Reads from provider_availability_intervals and converts to day-of-week format for UI.
 */
export async function getProviderWorkingHours(): Promise<{
  hours: ProviderWorkingHours[];
  emergencyAvailable: boolean;
  emergencySurchargeType: string | null;
  emergencySurchargeAmount: number | null;
  responseTime: string | null;
  error: string | null;
}> {
  const defaultResponse = {
    hours: [],
    emergencyAvailable: false,
    emergencySurchargeType: null,
    emergencySurchargeAmount: null,
    responseTime: null,
  };

  try {
    // Use cached auth - deduped with layout (0ms if already called)
    const { user, error: authError } = await getCachedUser();

    if (authError || !user) {
      return { ...defaultResponse, error: authError || "Not authenticated" };
    }

    // Use admin client for reads
    const adminClient = createAdminClient();

    // First get provider ID (need it for intervals query)
    const { data: provider } = await adminClient
      .from("service_providers")
      .select("id, emergency_available, emergency_surcharge_type, emergency_surcharge_amount, response_time")
      .eq("user_id", user.id)
      .single();

    if (!provider) {
      return { ...defaultResponse, error: null };
    }

    // Fetch availability intervals
    const { data: intervals } = await adminClient
      .from("provider_availability_intervals")
      .select("*")
      .eq("provider_id", provider.id)
      .eq("is_exception", false)
      .eq("is_active", true);

    // Convert intervals with recurrence rules to day-of-week format
    // BYDAY mapping: SU=0, MO=1, TU=2, WE=3, TH=4, FR=5, SA=6
    const dayRuleMap: Record<string, number> = {
      "SU": 0, "MO": 1, "TU": 2, "WE": 3, "TH": 4, "FR": 5, "SA": 6
    };

    const hours: ProviderWorkingHours[] = (intervals || []).map((interval: {
      id: string;
      provider_id: string;
      available_from: string;
      available_to: string;
      recurrence_rule: string | null;
    }) => {
      // Extract day from recurrence rule (FREQ=WEEKLY;BYDAY=MO)
      let dayOfWeek = 0;
      if (interval.recurrence_rule) {
        const match = interval.recurrence_rule.match(/BYDAY=(\w{2})/);
        if (match) {
          dayOfWeek = dayRuleMap[match[1]] ?? 0;
        }
      }

      // Extract times from timestamps
      const fromDate = new Date(interval.available_from);
      const toDate = new Date(interval.available_to);

      const startTime = fromDate.toTimeString().slice(0, 5);
      const endTime = toDate.toTimeString().slice(0, 5);

      return {
        id: interval.id,
        provider_id: interval.provider_id,
        day_of_week: dayOfWeek,
        is_available: true,
        start_time: startTime,
        end_time: endTime,
        break_start: null,
        break_end: null,
      };
    });

    return {
      hours,
      emergencyAvailable: provider.emergency_available || false,
      emergencySurchargeType: provider.emergency_surcharge_type || null,
      emergencySurchargeAmount: provider.emergency_surcharge_amount || null,
      responseTime: provider.response_time || null,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching working hours:", error);
    return { ...defaultResponse, error: "Failed to load hours" };
  }
}

// ============================================================================
// PROFILE COMPLETION
// ============================================================================

/**
 * Manually recalculate profile completion
 */
export async function recalculateProfileCompletion(): Promise<{
  percent: number;
  error: string | null;
}> {
  try {
    const { user, error: authError } = await getCachedUser();

    if (authError || !user) {
      return { percent: 0, error: authError || "Not authenticated" };
    }
    const supabase = await createClient();

    const { data: provider } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!provider) {
      return { percent: 0, error: "Provider not found" };
    }

    // Call the database function (not in generated types but exists in DB)
    const { data, error } = await supabase
      .rpc("calculate_provider_profile_completion" as never, {
        p_provider_id: provider.id,
      } as never);

    if (error) throw error;

    revalidatePath("/dashboard/provider");
    return { percent: (data as number) || 0, error: null };
  } catch (error) {
    console.error("Error calculating completion:", error);
    return { percent: 0, error: "Failed to calculate completion" };
  }
}
