/**
 * Customer Profile Page
 *
 * Server component that:
 *   1. Validates auth (redirects to login if not authenticated)
 *   2. Fetches profile data
 *   3. Builds the shell profile for CustomerDashboardShell
 *   4. Renders the ProfileEditForm client component
 *
 * Follows the same pattern as provider/settings/page.tsx: server component
 * does the data fetching, client component handles all interactivity.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/cache/queries";
import { getCustomerProfile } from "./actions";
import { ProfileEditForm } from "./ProfileEditForm";
import {
  CustomerDashboardShell,
  type CustomerShellProfile,
} from "@/components/dashboard/services";
import { getCustomerUnreadMessageCount } from "@/lib/services/dashboard";

export const metadata: Metadata = {
  title: "My Profile | MitaSafi",
};

export default async function CustomerProfilePage() {
  // ── Auth ────────────────────────────────────────────────────────────────
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/profile");
  }

  // ── Data ────────────────────────────────────────────────────────────────
  const [profileResult, unreadMessageCount] = await Promise.all([
    getCustomerProfile(),
    getCustomerUnreadMessageCount(user.id),
  ]);

  if (!profileResult.profile) {
    redirect("/login?redirectTo=/dashboard/profile");
  }

  const profile = profileResult.profile;

  // Build shell profile for the sidebar
  const shellProfile: CustomerShellProfile = {
    userId: user.id,
    name: profile.full_name || user.email?.split("@")[0] || "User",
    email: profile.email || user.email || "",
    avatarUrl: profile.avatar_url,
    unreadMessageCount,
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <CustomerDashboardShell profile={shellProfile}>
      <ProfileEditForm
        profile={{
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email || user.email || "",
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
        }}
      />
    </CustomerDashboardShell>
  );
}
