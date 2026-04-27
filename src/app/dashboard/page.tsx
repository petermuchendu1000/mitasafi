/**
 * Customer Dashboard Home
 *
 * Server component that serves as the main entry point for authenticated users:
 *   1. Redirects providers → /dashboard/provider
 *   2. Redirects landlords → /dashboard/landlord
 *   3. Renders the full customer dashboard for tenants
 *
 * Customer dashboard includes:
 *   - Active bookings widget (top 3 with status + next action)
 *   - Quick actions (browse, bookings, messages, saved)
 *   - Upcoming schedule (next 3 confirmed/scheduled)
 *   - Spend summary (this month + all-time)
 *   - Activity feed (last 10 notifications)
 *
 * Data fetching: All queries run in parallel via getCustomerDashboardData()
 * for minimum latency. Shell profile data fetched in parallel.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/db-helpers";
import { getPrimaryRoleByHierarchy } from "@/types/db-helpers";
import { getCustomerDashboardData } from "@/lib/services/dashboard";
import {
  CustomerDashboardShell,
  ActiveBookingsWidget,
  QuickActions,
  UpcomingSchedule,
  SpendSummary,
  ActivityFeed,
  type CustomerShellProfile,
} from "@/components/dashboard/services";

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const activeRoleParam = typeof params.activeRole === "string" ? params.activeRole : undefined;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── Profile & Roles ───────────────────────────────────────────────────

  const [{ data: profileData }, { data: rolesData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, primary_role")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_roles")
      .select("role, is_verified")
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);

  const profile = profileData as {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    primary_role: string | null;
  } | null;

  const userRoles: { role: UserRole; is_verified: boolean }[] =
    rolesData?.map((r: { role: string; is_verified: boolean | null }) => ({
      role: r.role as UserRole,
      is_verified: r.is_verified ?? false,
    })) || [];

  // No roles → send to signup
  if (userRoles.length === 0) {
    redirect("/signup");
  }

  // ── Role Routing ──────────────────────────────────────────────────────

  const allRoles = userRoles.map((r) => r.role);

  let primaryRole: UserRole;
  if (activeRoleParam && allRoles.includes(activeRoleParam as UserRole)) {
    primaryRole = activeRoleParam as UserRole;
  } else {
    primaryRole = getPrimaryRoleByHierarchy(allRoles);
  }

  if (primaryRole === "landlord") {
    redirect("/dashboard/landlord");
  }
  if (primaryRole === "service_provider") {
    redirect("/dashboard/provider");
  }

  // ── Customer Dashboard Data ───────────────────────────────────────────

  const dashboardData = await getCustomerDashboardData(user.id);
  const userName = profile?.full_name || user.email?.split("@")[0] || "User";

  // Shell profile for sidebar
  const shellProfile: CustomerShellProfile = {
    userId: user.id,
    name: userName,
    email: profile?.email || user.email || "",
    avatarUrl: profile?.avatar_url ?? null,
    unreadMessageCount: dashboardData.unreadMessageCount,
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <CustomerDashboardShell profile={shellProfile}>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {userName.split(" ")[0]}!
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with your services
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <QuickActions
          unreadMessageCount={dashboardData.unreadMessageCount}
          savedProvidersCount={dashboardData.savedProvidersCount}
          activeBookingsCount={dashboardData.activeBookingsCount}
        />
      </div>

      {/* Main Grid: Active Bookings + Upcoming Schedule */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ActiveBookingsWidget
            bookings={dashboardData.activeBookings}
            totalCount={dashboardData.activeBookingsCount}
          />
        </div>
        <div>
          <UpcomingSchedule bookings={dashboardData.upcomingBookings} />
        </div>
      </div>

      {/* Spend Summary + Activity Feed */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div>
          <SpendSummary data={dashboardData.spendSummary} />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed events={dashboardData.recentActivity} />
        </div>
      </div>
    </CustomerDashboardShell>
  );
}
