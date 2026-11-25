/**
 * Landlord account settings.
 *
 * WHAT THIS REPLACES
 *   Nothing. "Settings" was in the sidebar footer and the route did not exist,
 *   so the link 404'd. Customers and providers each already have their own
 *   settings page; landlords were the gap, so this follows that pattern rather
 *   than pointing the nav at the customer page.
 *
 * The shell (layout.tsx) supplies the <main> landmark and the page padding.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PREFERENCES } from "@/lib/landlord/settings";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | MitaSafi",
};

export default async function LandlordSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, email, phone, primary_role, is_verified, verification_level, created_at, metadata",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("email_notifications, sms_notifications, push_notifications")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const metadata = (profile?.metadata as Record<string, unknown>) ?? {};

  return (
    <SettingsClient
      profile={{
        fullName: profile?.full_name ?? "",
        // The sign-in address. Read-only on the client, and the server actions
        // never write it either.
        email: profile?.email ?? user?.email ?? "",
        phone: profile?.phone ?? "",
        role: profile?.primary_role ?? "landlord",
        isVerified: profile?.is_verified ?? false,
        verificationLevel: profile?.verification_level ?? null,
        memberSince: profile?.created_at ?? null,
        deletionRequestedAt:
          typeof metadata.deletion_requested_at === "string"
            ? metadata.deletion_requested_at
            : null,
      }}
      preferences={{
        email_notifications:
          prefs?.email_notifications ?? DEFAULT_PREFERENCES.email_notifications,
        sms_notifications:
          prefs?.sms_notifications ?? DEFAULT_PREFERENCES.sms_notifications,
        push_notifications:
          prefs?.push_notifications ?? DEFAULT_PREFERENCES.push_notifications,
      }}
    />
  );
}
