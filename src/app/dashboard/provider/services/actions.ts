/**
 * Service Provider Services - Server Actions
 * 
 * CRUD operations for provider_services table.
 * Pattern: Auth check → Ownership verify → Operation → Revalidate
 */

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedProviderId } from "@/lib/cache/queries";
import type { AddServicesInput, PriceType } from "./new/types";

// Local ActionResult with optional generic
interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

// =============================================================================
// HELPER TYPES (to handle Supabase inference)
// =============================================================================

interface ProviderIdRow {
  id: string;
}

interface NeighborhoodRow {
  id: string;
  name: string;
  cluster: string | null;
}

export interface NeighborhoodClusterResult {
  cluster: string;
  neighborhoods: NeighborhoodRow[];
}

// =============================================================================
// PUBLIC ACTION: Get Neighborhoods (for service wizard Step 4)
// =============================================================================
// Uses admin client to bypass RLS — neighborhoods is public reference data.

export async function getNeighborhoodsGrouped(): Promise<{
  clusters: NeighborhoodClusterResult[];
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("neighborhoods")
      .select("id, name, cluster")
      .eq("is_active", true)
      .order("display_order");

    if (error) {
      console.error("getNeighborhoodsGrouped: query error", error);
      return { clusters: [], error: error.message };
    }

    if (!data || data.length === 0) {
      return { clusters: [], error: null };
    }

    // Group by cluster
    const clusterMap = new Map<string, NeighborhoodRow[]>();
    for (const n of data) {
      const key = (n as NeighborhoodRow).cluster || "Other";
      if (!clusterMap.has(key)) clusterMap.set(key, []);
      clusterMap.get(key)!.push(n as NeighborhoodRow);
    }

    const clusters: NeighborhoodClusterResult[] = Array.from(
      clusterMap.entries()
    ).map(([cluster, neighborhoods]) => ({ cluster, neighborhoods }));

    return { clusters, error: null };
  } catch (err) {
    console.error("getNeighborhoodsGrouped: unexpected error", err);
    return {
      clusters: [],
      error: err instanceof Error ? err.message : "Failed to load neighborhoods",
    };
  }
}

interface ProviderServiceRow {
  id: string;
  provider_id: string;
  is_active: boolean;
}

// =============================================================================
// GET PROVIDER ID
// =============================================================================

/**
 * Get provider ID from currently authenticated user
 * OPTIMIZED: Uses React cache() for request-level deduplication
 */
async function getProviderId(): Promise<{ providerId: string | null; error: string | null }> {
  // Use cached query (eliminates duplicate DB calls within same request)
  const result = await getCachedProviderId();
  
  return {
    providerId: result.providerId || null,
    error: result.error || null
  };
}

// =============================================================================
// ADD SERVICES
// =============================================================================

/**
 * Upload a service image to Supabase Storage.
 * Uses admin client to bypass storage RLS.
 * Returns the public URL on success.
 */
export async function uploadServiceImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const { providerId, error: authError } = await getProviderId();
    if (authError || !providerId) {
      return { success: false, error: authError || "Authentication failed" };
    }

    const file = formData.get("file") as File | null;
    const serviceId = formData.get("serviceId") as string | null;

    if (!file || !serviceId) {
      return { success: false, error: "Missing file or serviceId" };
    }

    // Validate file type & size (max 5MB)
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Only image files are allowed" };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image must be under 5MB" };
    }

    const admin = createAdminClient();
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `service-images/${providerId}/${serviceId}_${Date.now()}.${fileExt}`;

    const { data, error: uploadError } = await admin.storage
      .from("provider-documents")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Service image upload error:", uploadError);
      return { success: false, error: "Failed to upload image" };
    }

    const { data: { publicUrl } } = admin.storage
      .from("provider-documents")
      .getPublicUrl(data.path);

    return { success: true, data: { url: publicUrl } };
  } catch (error) {
    console.error("Error in uploadServiceImage:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a service image from Supabase Storage.
 * Extracts the storage path from the public URL.
 */
export async function deleteServiceImage(publicUrl: string): Promise<ActionResult> {
  try {
    const { providerId, error: authError } = await getProviderId();
    if (authError || !providerId) {
      return { success: false, error: authError || "Authentication failed" };
    }

    // Extract storage path from public URL
    // URL format: https://<ref>.supabase.co/storage/v1/object/public/provider-documents/<path>
    const marker = "/provider-documents/";
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return { success: false, error: "Invalid image URL" };

    const storagePath = publicUrl.slice(idx + marker.length);

    // Verify the path belongs to this provider
    if (!storagePath.startsWith(`service-images/${providerId}/`)) {
      return { success: false, error: "Not authorized to delete this image" };
    }

    const admin = createAdminClient();
    const { error: deleteError } = await admin.storage
      .from("provider-documents")
      .remove([storagePath]);

    if (deleteError) {
      console.error("Error deleting service image:", deleteError);
      return { success: false, error: "Failed to delete image" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteServiceImage:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function addProviderServices(input: AddServicesInput): Promise<ActionResult> {
  try {
    const { providerId, error: authError } = await getProviderId();
    if (authError || !providerId) {
      return { success: false, error: authError || "Authentication failed" };
    }

    const supabase = await createClient();

    // Prepare the records to insert
    const records = input.services.map(service => ({
      provider_id: providerId,
      service_id: service.serviceId,
      custom_pricing: {
        amount: service.customPrice,
        type: service.priceType || 'fixed',
        description: service.description || null,
        image_urls: service.imageUrls?.length ? service.imageUrls : null,
      },
      experience_years: service.experienceYears,
      is_active: true,
      capacity_scope: 'per_service',
    }));

    // Insert all services (upsert to handle duplicates)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("provider_services")
      .upsert(records, {
        onConflict: "provider_id,service_id",
        ignoreDuplicates: false,
      });

    if (insertError) {
      console.error("Error adding services:", insertError);
      return { 
        success: false, 
        error: `Failed to add services: ${insertError.message || insertError.code || 'Unknown error'}` 
      };
    }

    // -----------------------------------------------------------------------
    // Persist service areas (Step 4) to provider_service_areas
    // Uses admin client — table has RLS. Merges with existing areas
    // (does NOT delete areas added via profile wizard).
    // -----------------------------------------------------------------------
    if (input.serviceAreas?.bulk?.length) {
      try {
        const adminClient = createAdminClient();

        // Look up neighborhood names by UUID
        const { data: neighborhoods, error: nError } = await adminClient
          .from("neighborhoods")
          .select("id, name")
          .in("id", input.serviceAreas.bulk);

        if (nError || !neighborhoods?.length) {
          console.error("[addProviderServices] Neighborhood lookup failed:", nError);
          // Services saved — area persistence is best-effort, don't roll back
        } else {
          // Fetch existing global areas (service_id IS NULL) to avoid duplicates.
          // PostgreSQL UNIQUE constraints treat NULLs as distinct, so we
          // de-duplicate in application code.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existingAreas } = await (adminClient as any)
            .from("provider_service_areas")
            .select("area_name")
            .eq("provider_id", providerId)
            .is("service_id", null);

          const existingNames = new Set(
            (existingAreas || []).map((a: { area_name: string }) => a.area_name)
          );

          const newAreas = (neighborhoods as { id: string; name: string }[])
            .filter((n) => !existingNames.has(n.name))
            .map((n) => ({
              provider_id: providerId,
              area_name: n.name,
              area_type: "neighborhood",
              is_primary_area: false,
            }));

          if (newAreas.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: areaError } = await (adminClient as any)
              .from("provider_service_areas")
              .insert(newAreas);

            if (areaError) {
              console.error("[addProviderServices] Area insert failed:", areaError);
            }
          }
        }
      } catch (areaErr) {
        console.error("[addProviderServices] Area persistence error:", areaErr);
      }
    }

    revalidatePath("/dashboard/provider/services");
    return { success: true };
  } catch (error) {
    console.error("Error in addProviderServices:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `An unexpected error occurred: ${errorMessage}` };
  }
}

// =============================================================================
// TOGGLE SERVICE ACTIVE STATUS
// =============================================================================

export async function toggleServiceActive(providerServiceId: string): Promise<ActionResult> {
  try {
    const { providerId, error: authError } = await getProviderId();
    if (authError || !providerId) {
      return { success: false, error: authError || "Authentication failed" };
    }

    const supabase = await createClient();

    // Get current status and verify ownership
    const { data, error: fetchError } = await supabase
      .from("provider_services")
      .select("id, provider_id, is_active")
      .eq("id", providerServiceId)
      .single();

    const service = data as ProviderServiceRow | null;

    if (fetchError || !service) {
      return { success: false, error: "Service not found" };
    }

    if (service.provider_id !== providerId) {
      return { success: false, error: "You don't have permission to modify this service" };
    }

    // Toggle the status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("provider_services")
      .update({ 
        is_active: !service.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", providerServiceId);

    if (updateError) {
      console.error("Error toggling service:", updateError);
      return { success: false, error: "Failed to update service" };
    }

    revalidatePath("/dashboard/provider/services");
    return { success: true, data: { isActive: !service.is_active } };
  } catch (error) {
    console.error("Error in toggleServiceActive:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// UPDATE PROVIDER SERVICE (Edit page — price + description + images)
// =============================================================================

export async function updateProviderService(
  providerServiceId: string,
  data: {
    priceType: string;
    price: number | null;
    description: string | null;
    imageUrls: string[];
  }
): Promise<ActionResult> {
  try {
    const { providerId, error: authError } = await getProviderId();
    if (authError || !providerId) {
      return { success: false, error: authError || "Authentication failed" };
    }

    const supabase = await createClient();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("provider_services")
      .select("id, provider_id")
      .eq("id", providerServiceId)
      .single();

    const service = existing as { id: string; provider_id: string } | null;
    if (fetchError || !service) {
      return { success: false, error: "Service not found" };
    }
    if (service.provider_id !== providerId) {
      return { success: false, error: "Not authorized" };
    }

    // Build custom_pricing JSON — single source of truth
    const customPricing: Record<string, unknown> = {
      amount: data.price,
      type: data.priceType || "fixed",
      description: data.description || null,
      image_urls: data.imageUrls.length > 0 ? data.imageUrls : null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("provider_services")
      .update({
        custom_pricing: customPricing,
        updated_at: new Date().toISOString(),
      })
      .eq("id", providerServiceId);

    if (updateError) {
      console.error("Error updating service:", updateError);
      return { success: false, error: "Failed to update service" };
    }

    revalidatePath("/dashboard/provider/services");
    revalidatePath(`/dashboard/provider/services/${providerServiceId}/edit`);
    return { success: true };
  } catch (error) {
    console.error("Error in updateProviderService:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// DELETE SERVICE
// =============================================================================

export async function deleteProviderService(providerServiceId: string): Promise<ActionResult> {
  try {
    const { providerId, error: authError } = await getProviderId();
    if (authError || !providerId) {
      return { success: false, error: authError || "Authentication failed" };
    }

    const supabase = await createClient();

    // Fetch service with custom_pricing (need image_urls for cleanup)
    const { data, error: fetchError } = await supabase
      .from("provider_services")
      .select("id, provider_id, custom_pricing")
      .eq("id", providerServiceId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = data as any;

    if (fetchError || !service) {
      return { success: false, error: "Service not found" };
    }

    if (service.provider_id !== providerId) {
      return { success: false, error: "You don't have permission to delete this service" };
    }

    // Clean up storage images before deleting DB record
    const imageUrls = (service.custom_pricing?.image_urls as string[]) || [];
    if (imageUrls.length > 0) {
      const admin = createAdminClient();
      const marker = "/provider-documents/";
      const paths = imageUrls
        .map((url: string) => {
          const idx = url.indexOf(marker);
          return idx !== -1 ? url.slice(idx + marker.length) : null;
        })
        .filter((p): p is string => p !== null);

      if (paths.length > 0) {
        await admin.storage.from("provider-documents").remove(paths);
      }
    }

    // Delete the service
    const { error: deleteError } = await supabase
      .from("provider_services")
      .delete()
      .eq("id", providerServiceId);

    if (deleteError) {
      console.error("Error deleting service:", deleteError);
      return { success: false, error: "Failed to delete service" };
    }

    revalidatePath("/dashboard/provider/services");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteProviderService:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// GET PROVIDER SERVICES (for listing)
// =============================================================================

export interface ProviderServiceWithDetails {
  id: string;
  service_id: string;
  custom_pricing: Record<string, unknown> | null;
  experience_years: number | null;
  is_active: boolean;
  created_at: string;
  image_urls: string[];
  service: {
    id: string;
    name: string;
    description: string | null;
    subcategory: {
      id: string;
      name: string;
      category: {
        id: string;
        name: string;
      };
    };
  };
}

/** Provider-level meta for card display */
export interface ProviderCardMeta {
  primary_location: string | null;
  rating_average: number | null;
  rating_count: number | null;
  member_since: string | null;
}

/**
 * Get all services for a provider
 * OPTIMIZED: Uses React cache() + materialized view for 15x faster queries
 */
export async function getProviderServices(): Promise<{
  services: ProviderServiceWithDetails[];
  providerMeta: ProviderCardMeta | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Get current user's provider ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { services: [], providerMeta: null, error: authError?.message || 'Not authenticated' };
    }

    const { data: providerData, error: pidError } = await supabase
      .from('service_providers')
      .select('id, primary_location, average_rating, total_reviews, created_at')
      .eq('user_id', user.id)
      .single();

    if (pidError || !providerData) {
      return { services: [], providerMeta: null, error: pidError?.message || 'Provider profile not found' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prov = providerData as any;
    const pid = prov.id;

    const providerMeta: ProviderCardMeta = {
      primary_location: prov.primary_location ?? null,
      rating_average: prov.average_rating ?? null,
      rating_count: prov.total_reviews ?? null,
      member_since: prov.created_at ?? null,
    };

    // Query ALL services (active + paused) — dashboard needs full list
    const { data, error } = await supabase
      .from('provider_services')
      .select(`
        id,
        service_id,
        custom_pricing,
        experience_years,
        is_active,
        created_at,
        service:services_with_categories!service_id (
          id,
          name,
          description,
          category_name,
          category_slug,
          subcategory_name
        )
      `)
      .eq('provider_id', pid)
      .order('created_at', { ascending: false });

    if (error) {
      return { services: [], providerMeta, error: error.message };
    }

    // Transform materialized view flat structure → nested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const services = (data || []).map((item: any) => {
      const svc = Array.isArray(item.service) ? item.service[0] : item.service;
      const pricing = item.custom_pricing as Record<string, unknown> | null;
      const imageUrls = (pricing?.image_urls as string[] | null) || [];

      return {
        id: item.id,
        service_id: item.service_id,
        custom_pricing: pricing,
        experience_years: item.experience_years,
        is_active: item.is_active,
        created_at: item.created_at,
        image_urls: imageUrls,
        service: {
          id: svc.id,
          name: svc.name,
          description: svc.description,
          subcategory: {
            id: svc.subcategory_id || '',
            name: svc.subcategory_name || '',
            category: {
              id: svc.category_id || '',
              name: svc.category_name || 'Other',
            },
          },
        },
      };
    });

    return { services, providerMeta, error: null };
  } catch (error) {
    console.error("Error in getProviderServices:", error);
    return { services: [], providerMeta: null, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// GET SERVICE PREVIEW DATA (for client-view preview)
// =============================================================================

export interface ServicePreviewData {
  id: string;
  service_id: string;
  custom_pricing: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  experience_years: number | null;
  has_certification: boolean;
  certification_type: string | null;
  service: {
    id: string;
    name: string;
    description: string | null;
    subcategory_name: string;
    category_name: string;
  };
  provider: {
    id: string;
    business_name: string | null;
    bio: string | null;
    profile_photo_url: string | null;
    is_verified: boolean;
    verification_badge: string | null;
    tier: string | null;
    primary_location: string | null;
    service_radius_km: number | null;
    years_in_business: number | null;
    years_experience: string | null;
    rating_average: number | null;
    rating_count: number | null;
    total_jobs_completed: number | null;
    response_time_minutes: number | null;
    response_time: string | null;
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
    member_since: string | null;
    last_active_at: string | null;
    emergency_available: boolean;
    service_areas: string[];
  };
}

export async function getServicePreview(
  providerServiceId: string
): Promise<{ data: ServicePreviewData | null; error: string | null }> {
  try {
    const { providerId, error: authError } = await getProviderId();
    if (authError || !providerId) {
      return { data: null, error: authError || "Authentication failed" };
    }

    const supabase = await createClient();

    // Parallel: fetch service details + provider profile + areas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await Promise.all([
      supabase
        .from("provider_services")
        .select(`
          id,
          service_id,
          custom_pricing,
          is_active,
          created_at,
          provider_id,
          experience_years,
          has_certification,
          certification_type,
          service:services_with_categories!service_id (
            id,
            name,
            description,
            category_name,
            subcategory_name
          )
        `)
        .eq("id", providerServiceId)
        .eq("provider_id", providerId)
        .single(),
      supabase
        .from("service_providers")
        .select("id, business_name, bio, profile_photo_url, is_verified, verification_badge, primary_location, service_radius_km, years_in_business, years_experience, average_rating, total_reviews, total_jobs_completed, response_time_minutes, response_time, phone, email, whatsapp, created_at, last_active_at, emergency_capacity_reserved")
        .eq("id", providerId)
        .single(),
      supabase
        .from("provider_service_areas")
        .select("area_name")
        .eq("provider_id", providerId),
    ]);

    const serviceResult = results[0];
    const providerResult = results[1];
    const areasResult = results[2];

    if (serviceResult.error || !serviceResult.data) {
      console.error("[getServicePreview] serviceResult error:", serviceResult.error);
      return { data: null, error: serviceResult.error?.message || "Service not found" };
    }
    if (providerResult.error || !providerResult.data) {
      console.error("[getServicePreview] providerResult error:", providerResult.error);
      return { data: null, error: providerResult.error?.message || "Provider not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = serviceResult.data as any;
    const svc = Array.isArray(raw.service) ? raw.service[0] : raw.service;

    if (!svc) {
      return { data: null, error: "Service details not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prov = providerResult.data as any;

    // Extract area names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const areaNames = (areasResult.data || []).map((a: any) => a.area_name).filter(Boolean) as string[];

    return {
      data: {
        id: raw.id,
        service_id: raw.service_id,
        custom_pricing: raw.custom_pricing,
        is_active: raw.is_active,
        created_at: raw.created_at,
        experience_years: raw.experience_years,
        has_certification: raw.has_certification ?? false,
        certification_type: raw.certification_type,
        service: {
          id: svc.id,
          name: svc.name,
          description: svc.description || null,
          subcategory_name: svc.subcategory_name || '',
          category_name: svc.category_name || 'Other',
        },
        provider: {
          id: prov.id,
          business_name: prov.business_name,
          bio: prov.bio,
          profile_photo_url: prov.profile_photo_url,
          is_verified: prov.is_verified ?? false,
          verification_badge: prov.verification_badge,
          tier: null, // column doesn't exist in live DB yet
          primary_location: prov.primary_location ?? null,
          service_radius_km: prov.service_radius_km ?? null,
          years_in_business: prov.years_in_business ?? null,
          years_experience: prov.years_experience ?? null,
          rating_average: prov.average_rating,
          rating_count: prov.total_reviews,
          total_jobs_completed: prov.total_jobs_completed,
          response_time_minutes: prov.response_time_minutes,
          response_time: prov.response_time ?? null,
          phone: prov.phone,
          email: prov.email,
          whatsapp: prov.whatsapp,
          member_since: prov.created_at,
          last_active_at: prov.last_active_at,
          emergency_available: (prov.emergency_capacity_reserved ?? 0) > 0,
          service_areas: areaNames,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error("Error in getServicePreview:", error);
    return { data: null, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// GET SERVICE WITH DETAILS (for edit page)
// =============================================================================

export interface ServiceEditData {
  id: string;
  service_id: string;
  custom_pricing: Record<string, unknown> | null;
  service: {
    id: string;
    name: string;
    subcategory_name: string;
    category_name: string;
  };
}

export async function getServiceForEdit(
  providerServiceId: string
): Promise<{ service: ServiceEditData | null; error: string | null }> {
  try {
    const { providerId, error: authError } = await getProviderId();
    if (authError || !providerId) {
      return { service: null, error: authError || "Authentication failed" };
    }

    const supabase = await createClient();

    // Use materialized view — same proven pattern as getProviderServices
    const { data, error } = await supabase
      .from("provider_services")
      .select(`
        id,
        service_id,
        custom_pricing,
        provider_id,
        service:services_with_categories!service_id (
          id,
          name,
          category_name,
          subcategory_name
        )
      `)
      .eq("id", providerServiceId)
      .eq("provider_id", providerId)
      .single();

    if (error || !data) {
      return { service: null, error: "Service not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data as any;
    const svc = Array.isArray(raw.service) ? raw.service[0] : raw.service;

    if (!svc) {
      return { service: null, error: "Service details not found" };
    }

    return {
      service: {
        id: raw.id,
        service_id: raw.service_id,
        custom_pricing: raw.custom_pricing,
        service: {
          id: svc.id,
          name: svc.name,
          subcategory_name: svc.subcategory_name || '',
          category_name: svc.category_name || 'Other',
        },
      },
      error: null,
    };
  } catch (error) {
    console.error("Error in getServiceForEdit:", error);
    return { service: null, error: "An unexpected error occurred" };
  }
}
