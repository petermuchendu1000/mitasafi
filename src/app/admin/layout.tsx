/**
 * Admin Layout
 *
 * Auth gate: only users with an active "admin" role in user_roles can access.
 * Uses createAdminClient() for the role check (bypasses RLS on user_roles).
 *
 * Renders a minimal admin shell with a sidebar navigation.
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCachedUser } from "@/lib/cache/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = {
  title: "Admin | MitaSafi",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Check authentication
  const { user, error: authError } = await getCachedUser();

  if (authError || !user) {
    redirect("/login?redirectTo=/admin");
  }

  // 2. Verify admin role
  const admin = createAdminClient();
  const { data: roles, error: rolesError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (rolesError) {
    console.error("[Admin Layout] Role check failed:", rolesError);
    redirect("/dashboard");
  }

  const hasAdminRole = roles?.some(
    (r: { role: string }) => r.role === "admin"
  );

  if (!hasAdminRole) {
    redirect("/dashboard");
  }

  return (
    <AdminShell
      adminName={user.email?.split("@")[0] || "Admin"}
      adminEmail={user.email || ""}
    >
      {children}
    </AdminShell>
  );
}
