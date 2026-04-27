/**
 * Verify Page Layout
 * 
 * Minimal layout for verification pages.
 * Does NOT use the dashboard shell - provides a clean verification experience.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/db-helpers";

interface VerifyLayoutProps {
  children: React.ReactNode;
}

export default async function VerifyLayout({ children }: VerifyLayoutProps) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?redirectTo=/dashboard/verify-provider");
  }

  // Get user roles
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const userRoles: UserRole[] = rolesData?.map((r: { role: string }) => r.role as UserRole) || [];

  // Check if user has service_provider role
  if (!userRoles.includes("service_provider")) {
    redirect("/dashboard");
  }

  // This layout bypasses the main dashboard shell
  // to provide a clean verification experience
  return <>{children}</>;
}
