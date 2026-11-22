/**
 * Verify Page Layout
 *
 * Minimal layout for verification pages.
 * Does NOT use the dashboard shell - provides a clean verification experience.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/db-helpers";
import { getCachedRoles } from "@/lib/cache/queries";
import { hasRole } from "@/lib/identity/roles";

interface VerifyLayoutProps {
  children: React.ReactNode;
}

export default async function VerifyLayout({ children }: VerifyLayoutProps) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/verify-provider");
  }

  // Check the caller holds the provider role. hasRole() asks the question
  // directly instead of building an array and calling .includes() on it.
  const { roles } = await getCachedRoles();
  if (!hasRole(roles, "service_provider")) {
    redirect("/dashboard");
  }

  // This layout bypasses the main dashboard shell
  // to provide a clean verification experience
  return <>{children}</>;
}
