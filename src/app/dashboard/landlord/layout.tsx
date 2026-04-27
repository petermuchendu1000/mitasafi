/**
 * Landlord Dashboard Layout
 * 
 * Server component that wraps all landlord dashboard pages.
 * Handles:
 * - Authentication check
 * - Role verification (must be landlord)
 * - Fetching user profile data
 * - Providing layout structure with sidebar
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/db-helpers";
import { LandlordDashboardShell } from "./LandlordDashboardShell";
import type { SidebarUserProfile } from "@/components/dashboard/landlord";

interface LandlordLayoutProps {
  children: React.ReactNode;
}

// Profile type from database query
interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export default async function LandlordDashboardLayout({ children }: LandlordLayoutProps) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?redirectTo=/dashboard/landlord");
  }

  // Get user profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, is_verified")
    .eq("id", user.id)
    .single();

  const typedProfileData = profileData as ProfileData | null;

  // Get user roles
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role, is_verified")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const userRoles: UserRole[] = rolesData?.map((r: { role: string }) => r.role as UserRole) || [];

  // Check if user has landlord role
  if (!userRoles.includes("landlord")) {
    // Redirect to main dashboard or role selection
    redirect("/dashboard");
  }

  // Build profile object for sidebar
  const profile: SidebarUserProfile = {
    name: typedProfileData?.full_name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    avatarUrl: typedProfileData?.avatar_url || null,
    isVerified: typedProfileData?.is_verified || false,
    role: "landlord",
  };

  // Build notification counts
  // Note: These tables may not exist yet, so we'll add counts when they do
  const notificationCounts: Record<string, number> = {};

  return (
    <LandlordDashboardShell 
      profile={profile}
      notificationCounts={notificationCounts}
    >
      {children}
    </LandlordDashboardShell>
  );
}
