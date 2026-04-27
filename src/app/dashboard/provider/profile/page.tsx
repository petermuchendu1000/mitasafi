/**
 * Provider Profile Setup Page
 * 
 * Multi-step wizard for completing provider profile.
 * Steps: Basics → Service Areas → Working Hours → Done
 * 
 * PERFORMANCE: Uses getCachedUser() which is deduplicated with layout.tsx
 * Layout already calls this, so React cache() ensures 0ms overhead here.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/cache/queries";
import { ProfileSetupWizard } from "./ProfileSetupWizard";
import { getProviderProfile, getNeighborhoodsByCluster } from "./actions";

export const metadata: Metadata = {
  title: "Complete Your Profile | MitaSafi Provider",
};

export default async function ProfileSetupPage() {
  // Use cached auth - layout already called this, so it's deduplicated (0ms)
  const { user, error: authError } = await getCachedUser();

  if (authError || !user) {
    redirect("/auth/signin");
  }

  // Parallel fetch: profile data + neighborhoods (independent queries)
  const [{ profile, error: profileError }, { clusters }] = await Promise.all([
    getProviderProfile(),
    getNeighborhoodsByCluster(),
  ]);

  // If no provider profile exists, they need to be redirected to create one
  if (profileError === "Provider profile not found") {
    redirect("/dashboard/provider");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <ProfileSetupWizard 
          initialProfile={profile}
          neighborhoodClusters={clusters}
        />
      </div>
    </div>
  );
}
