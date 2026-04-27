/**
 * Customer Settings Page
 *
 * Server component that fetches notification preferences, then renders
 * the interactive CustomerSettingsClient component.
 *
 * Follows the same server→client handoff pattern as provider/settings/page.tsx.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/cache/queries";
import { getCustomerNotificationPreferences } from "./actions";
import { CustomerSettingsClient } from "./CustomerSettingsClient";
import {
  CustomerDashboardShell,
  type CustomerShellProfile,
} from "@/components/dashboard/services";
import {
  getCustomerUnreadMessageCount,
  getCustomerProfile,
} from "@/lib/services/dashboard";

export const metadata: Metadata = {
  title: "Settings | MitaSafi",
};

export default async function CustomerSettingsPage() {
  // ── Auth ────────────────────────────────────────────────────────────────
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/settings");
  }

  // ── Data (parallel fetch) ───────────────────────────────────────────────
  const [preferences, unreadMessageCount, profileResult] = await Promise.all([
    getCustomerNotificationPreferences(),
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
      <CustomerSettingsClient
        initialPreferences={{
          email_notifications: preferences.email_notifications,
          sms_notifications: preferences.sms_notifications,
          push_notifications: preferences.push_notifications,
        }}
      />
    </CustomerDashboardShell>
  );
}
