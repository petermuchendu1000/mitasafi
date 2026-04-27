/**
 * Booking Request Page
 *
 * Server component that resolves the provider service → service → service_type
 * chain, fetches the customer's saved locations, and renders the multi-step
 * BookingRequestForm client component.
 *
 * URL: /services/provider/[id]/request?service=[providerServiceId]
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProviderByIdCached } from "@/lib/services/providers";
import { getCategoryById } from "@/lib/constants";
import {
  BookingRequestForm,
  type ServiceInfo,
  type ProviderInfo,
} from "@/components/booking/BookingRequestForm";
import type { SavedLocation } from "@/components/booking/LocationPicker";
import type { BookingFlowType } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { provider } = await getProviderByIdCached(id);

  return {
    title: provider
      ? `Request Service — ${provider.business_name} | MitaSafi`
      : "Request Service | MitaSafi",
    description: "Submit a service request to your chosen provider on MitaSafi.",
  };
}

// =============================================================================
// PAGE
// =============================================================================

export default async function BookingRequestPage({
  params,
  searchParams,
}: PageProps) {
  const { id: providerId } = await params;
  const sp = await searchParams;
  const providerServiceId = typeof sp.service === "string" ? sp.service : null;

  // ── 1. Authenticate ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(
        `/services/provider/${providerId}/request${providerServiceId ? `?service=${providerServiceId}` : ""}`
      )}`
    );
  }

  // ── 2. Parallel fetch: provider + saved locations ──
  // Both only depend on auth being complete, not on each other.
  const [providerResult, savedLocationsRaw] = await Promise.all([
    getProviderByIdCached(providerId),
    supabase
      .from("locations")
      .select("id, label, address_line1, area, city")
      .eq("user_id", user.id)
      .eq("is_saved", true)
      .order("created_at", { ascending: false })
      .limit(10)
      .then((r) => r.data),
  ]);

  const { provider, error: providerError } = providerResult;

  if (providerError || !provider) {
    notFound();
  }

  // Prevent self-booking
  const providerAny = provider as unknown as Record<string, unknown>;
  if (providerAny.user_id === user.id) {
    redirect(`/services/provider/${providerId}`);
  }

  // ── 3. Resolve the selected service ──
  // If no service param, use the first active provider_service
  const activeServices = (provider.services || []).filter((ps) => ps.is_active);

  if (activeServices.length === 0) {
    notFound();
  }

  const selectedPs = providerServiceId
    ? activeServices.find((ps) => ps.id === providerServiceId)
    : activeServices[0];

  if (!selectedPs) {
    notFound();
  }

  // Need service_type_id and default_booking_flow from the DB
  const { data: serviceRow } = await supabase
    .from("services")
    .select(
      `
      id,
      name,
      service_type_id,
      service_type:service_types!service_type_id (
        id,
        default_booking_flow
      )
    `
    )
    .eq("id", selectedPs.service_id)
    .single();

  if (!serviceRow) {
    notFound();
  }

  const serviceTypeData = Array.isArray(serviceRow.service_type)
    ? serviceRow.service_type[0]
    : serviceRow.service_type;

  // Build custom pricing info
  const cpAny = selectedPs as unknown as Record<string, unknown>;
  const cp = cpAny.custom_pricing as Record<string, unknown> | null;

  // Determine if provider's category supports emergency
  const firstCategoryId = provider.categories?.[0];
  const categoryConfig = firstCategoryId ? getCategoryById(firstCategoryId) : null;

  const serviceInfo: ServiceInfo = {
    providerServiceId: selectedPs.id,
    serviceId: serviceRow.id,
    serviceTypeId: serviceRow.service_type_id,
    defaultBookingFlow: (serviceTypeData?.default_booking_flow ?? "standard") as BookingFlowType,
    name: selectedPs.service?.name || serviceRow.name || "Service",
    category: selectedPs.service?.subcategory?.category?.name || "",
    subcategory: selectedPs.service?.subcategory?.name || "",
    priceType: (cp?.type as string) || "fixed",
    price: (cp?.amount as number) || null,
  };

  const providerInfo: ProviderInfo = {
    id: provider.id,
    businessName: provider.business_name,
    profilePhotoUrl: provider.profile_photo_url,
    ratingAverage: provider.average_rating,
    ratingCount: provider.total_reviews,
    isEmergencyAvailable: categoryConfig?.isEmergencyAvailable ?? false,
  };

  // ── 4. Map saved locations ──
  const savedLocations: SavedLocation[] = (savedLocationsRaw ?? []).map(
    (loc: Record<string, unknown>) => ({
      id: loc.id as string,
      label: (loc.label as string) || null,
      address_line1: loc.address_line1 as string,
      area: (loc.area as string) || null,
      city: (loc.city as string) || "Nairobi",
    })
  );

  // ── 5. Render ──
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <div className="flex items-center gap-3">
            <Link
              href={`/services/provider/${providerId}`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to profile</span>
            </Link>
            <span className="text-gray-200 hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400">
              <Link
                href={`/services/provider/${providerId}`}
                className="hover:text-gray-600 transition-colors"
              >
                {provider.business_name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-600">Request service</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <BookingRequestForm
          service={serviceInfo}
          provider={providerInfo}
          savedLocations={savedLocations}
        />
      </main>
    </div>
  );
}
