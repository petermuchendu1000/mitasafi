/**
 * My Services Page
 * 
 * Main page for service providers to manage their services.
 * No verification gate - users can add services freely.
 * Verification is required only when going live.
 */

import type { Metadata } from "next";
import { getCachedUser, getProviderWithProfile } from "@/lib/cache/queries";
import { getProviderServices } from "./actions";
import { ServicesEmptyState } from "./ServicesEmptyState";
import { ServicesGrid } from "./ServicesGrid";

export const metadata: Metadata = {
  title: "My Services | MitaSafi Provider",
};

export default async function MyServicesPage() {
  // Get provider's services (no verification gate - anyone can add)
  // This handles auth internally, so no need for separate auth check
  const { services, providerMeta, error } = await getProviderServices();
  
  // Only fetch verification status if we have services (for "Go Live" button)
  // Uses cache layer — layout already called these, free dedup
  let isFullyVerified = false;
  if (services.length > 0) {
    const { user } = await getCachedUser();
    if (user) {
      const { data: providerData } = await getProviderWithProfile(user.id);
      if (providerData) {
        const level = providerData.profile.verification_level || "none";
        const supabasePhoneVerified = user.phone && user.phone_confirmed_at;
        const effective = supabasePhoneVerified && level === "none" ? "phone" : level;
        isFullyVerified = effective === "full" || !!providerData.provider.is_verified;
      }
    }
  }

  if (error) {
    // If error is about provider not found, show setup message
    if (error.includes("Provider profile not found")) {
      return (
        <div className="p-6">
          <div className="text-center py-12 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Complete Your Profile
            </h2>
            <p className="text-gray-500 mb-6">
              You need to set up your service provider profile before you can add services.
            </p>
            <a
              href="/dashboard/provider/profile"
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700"
            >
              Set Up Profile
            </a>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {services.length === 0 ? (
        <ServicesEmptyState />
      ) : (
        <ServicesGrid 
          initialServices={services} 
          isVerified={isFullyVerified}
          providerMeta={providerMeta}
        />
      )}
    </div>
  );
}
