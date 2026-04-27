/**
 * Saved Providers Page
 *
 * Server component that fetches the customer's saved (favorited) service providers
 * and renders them in a responsive grid with remove/view-profile CTAs.
 *
 * Data: getSavedProviders() from lib/services/dashboard.ts
 * Shell: CustomerDashboardShell
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/cache/queries";
import {
  getSavedProviders,
  getCustomerUnreadMessageCount,
  getCustomerProfile,
} from "@/lib/services/dashboard";
import {
  CustomerDashboardShell,
  type CustomerShellProfile,
} from "@/components/dashboard/services";
import { SavedProvidersList } from "./SavedProvidersList";

export const metadata: Metadata = {
  title: "Saved Providers | MitaSafi",
};

export default async function SavedProvidersPage() {
  // ── Auth ────────────────────────────────────────────────────────────────
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/saved-providers");
  }

  // ── Data (parallel fetch) ───────────────────────────────────────────────
  const [savedResult, unreadMessageCount, profileResult] = await Promise.all([
    getSavedProviders(user.id),
    getCustomerUnreadMessageCount(user.id),
    getCustomerProfile(user.id),
  ]);

  const profile = profileResult.profile;

  // Build shell profile
  const shellProfile: CustomerShellProfile = {
    userId: user.id,
    name: profile?.full_name || user.email?.split("@")[0] || "User",
    email: profile?.email || user.email || "",
    avatarUrl: profile?.avatar_url ?? null,
    unreadMessageCount,
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <CustomerDashboardShell profile={shellProfile}>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Saved Providers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {savedResult.providers.length > 0
              ? `${savedResult.providers.length} provider${savedResult.providers.length !== 1 ? "s" : ""} saved`
              : "Providers you save will appear here"}
          </p>
        </div>

        <SavedProvidersList providers={savedResult.providers} />
      </div>
    </CustomerDashboardShell>
  );
}
