/**
 * Admin Layout
 *
 * Auth gate: only users with an active "admin" role in user_roles can access.
 * The gate is requireAdmin() in src/lib/identity/require-admin.ts, which uses
 * the service-role client so an RLS change cannot silently lock out operators.
 *
 * Renders a minimal admin shell with a sidebar navigation.
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCachedUser } from "@/lib/cache/queries";
import { requireAdmin } from "@/lib/identity/require-admin";
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

  // 2. Verify admin role — one shared gate, src/lib/identity/require-admin.ts.
  //
  // This was a third inline copy of a check that also existed privately in
  // admin-verification.ts and review-moderation.ts. The shared version keeps
  // the service-role client and the distinction this one made between a failed
  // read and a denial: the first is an outage, the second is routine, and
  // collapsing them would hide a broken database behind a permissions message.
  const { error: adminError } = await requireAdmin();
  if (adminError) {
    console.error("[Admin Layout] Denied:", adminError);
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
