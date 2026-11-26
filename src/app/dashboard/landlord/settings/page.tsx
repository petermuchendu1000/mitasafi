/**
 * Landlord settings.
 *
 * SEVEN TABS, AND WHY EACH ONE IS HERE
 *   General      the feature switches, each marked with whether it is in force
 *   Caretakers   the people who look after the blocks, and what they may see
 *   Late fee     the default policy applied to new leases
 *   Notifications what MitaSafi would tell you, and tell your tenants
 *   Billing      who carries the transaction fee
 *   Bank         what MitaSafi does and does not do with your money
 *   Integrations what is connected
 *
 * IF THE MIGRATION IS NOT APPLIED YET
 *   landlord_settings and property_staff ship in 20260356000000, applied to
 *   production separately. Missing them is handled rather than thrown: the
 *   profile section still works and the rest says plainly it is not switched
 *   on, instead of a 500.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | MitaSafi",
};

const MISSING_TABLE = new Set(["42P01", "PGRST205", "PGRST106"]);

export default async function LandlordSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [
    { data: profile },
    { data: prefs },
    { data: settings, error: settingsError },
  ] = await Promise.all([
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
    supabase
      .from("landlord_settings")
      .select("*")
      .eq("landlord_id", userId)
      .maybeSingle(),
  ]);

  const settingsMissing = MISSING_TABLE.has(settingsError?.code ?? "");

  const metadata = (profile?.metadata as Record<string, unknown>) ?? {};

  return (
    <SettingsClient
      settingsMissing={settingsMissing}
      profile={{
        fullName: profile?.full_name ?? "",
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
      channels={{
        email_notifications: prefs?.email_notifications ?? true,
        sms_notifications: prefs?.sms_notifications ?? true,
        push_notifications: prefs?.push_notifications ?? true,
      }}
      settings={(settings as Record<string, unknown> | null) ?? null}
    />
  );
}
