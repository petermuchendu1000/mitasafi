/**
 * Provider Settings Page
 *
 * Server component that fetches notification preferences and account status,
 * then renders the interactive SettingsClient component.
 *
 * Auth is handled by the parent layout (provider/layout.tsx) — if we reach
 * this page, the user is already authenticated and has the service_provider role.
 * We still validate auth in server actions for defense-in-depth.
 */

import type { Metadata } from "next";
import { getCachedUser, getProviderWithProfile } from "@/lib/cache/queries";
import { redirect } from "next/navigation";
import { getNotificationPreferences } from "./actions";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | MitaSafi Provider",
};

export default async function SettingsPage() {
  // Auth check (cached — shared with layout, zero extra DB cost)
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/provider/settings");
  }

  // Provider data (cached — shared with layout)
  const { data: providerData } = await getProviderWithProfile(user.id);
  const isAccountActive = providerData?.provider.is_active ?? true;

  // Fetch notification preferences (separate query — not cached)
  const preferences = await getNotificationPreferences();

  return (
    <SettingsClient
      initialPreferences={{
        email_notifications: preferences.email_notifications,
        sms_notifications: preferences.sms_notifications,
        push_notifications: preferences.push_notifications,
      }}
      isAccountActive={isAccountActive}
    />
  );
}
