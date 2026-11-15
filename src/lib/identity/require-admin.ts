/**
 * The one admin gate.
 *
 * It existed three times: privately in src/lib/services/admin-verification.ts,
 * privately again in src/lib/services/review-moderation.ts (byte-identical
 * signature and semantics), and inline a third time in
 * src/app/admin/layout.tsx. Three copies of the only check standing between a
 * signed-in user and the admin surface.
 *
 * WHAT IT CHECKS, AND WHAT THAT IS WORTH
 *
 * That the caller holds an active `admin` row in user_roles. Nothing else: the
 * database has no admin boundary at all. Every admin-only table grants its
 * policies to `service_role` only, so no client can read them directly, and
 * admin work goes through server code holding the service-role key. This
 * function is therefore the whole of the authorization decision for the admin
 * surface, which is why it should exist once rather than three times.
 *
 * HOW THE ROLE IS GRANTED
 *
 * No client can write it, by three independent mechanisms:
 *
 *   - user_roles_role_check permits the value 'admin', but the INSERT policy
 *     forbids a client writing it (WITH CHECK ... AND role <> 'admin')
 *   - a BEFORE UPDATE trigger refuses a client raising an existing row to it
 *   - and client EXECUTE is revoked on the functions that could
 *
 * It is granted only by public.grant_admin_role(p_user_id, p_reason), added in
 * 20260350000000_admin_grant_path.sql: SECURITY DEFINER, EXECUTE granted to
 * service_role and to nothing else, idempotent, refusing a blank reason, and
 * writing an audit_log row on every call. public.revoke_admin_role takes it
 * away by setting is_active = false, which this function's read honours,
 * leaving the history intact.
 *
 * Until that migration there was NO grant path of any kind, so this function
 * denied every caller and src/app/admin could not be entered by anyone. Worth
 * recording, because an unreachable admin surface reads exactly like a
 * protected one from the code, and the code around it assumes an admin exists.
 *
 * There is still no admin who can grant admin, and there cannot be: the first
 * grant has to come from outside the role system, so the authority is
 * possession of the service-role key. See the migration's header for the
 * bootstrapping call and how to audit it.
 *
 * WHY THE SERVICE-ROLE CLIENT FOR A SELF-READ
 *
 * Reading your OWN roles does not need it — the user_roles SELECT policy is
 * `auth.uid() = user_id`, so the cookie-scoped client would do. The admin
 * client is kept because this is an authorization gate: if a future RLS change
 * made the self-read return nothing, the cookie-scoped version would silently
 * deny every admin, and a gate that fails by locking out its own operators is
 * harder to notice than one that keeps working. The cost is that this read
 * bypasses RLS, which is acceptable for a read of a single row the caller
 * already owns.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUser } from "@/lib/cache/queries";
import {
  readActiveRoles,
  hasRole,
  type RoleQueryClient,
} from "@/lib/identity/roles";

/**
 * Resolve the caller as an admin, or explain why not.
 *
 * The discriminated union is deliberate and is the signature both private
 * copies already had: on success `userId` is a string and `error` is null, so a
 * caller that checks `error` has a non-null userId without a second assertion.
 */
export async function requireAdmin(): Promise<
  { userId: string; error: null } | { userId: null; error: string }
> {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    return { userId: null, error: "Authentication required." };
  }

  const admin = createAdminClient();
  const { roles, error: rolesError } = await readActiveRoles(
    admin as unknown as RoleQueryClient,
    user.id,
  );

  // A failed read is NOT "not an admin". Distinguishing them matters: the first
  // is an outage and should say so, the second is a routine denial. Collapsing
  // both into a denial would hide a broken database behind a permissions
  // message.
  if (rolesError) {
    console.error("[Admin] Role check error:", rolesError);
    return { userId: null, error: "Failed to verify permissions." };
  }

  if (!hasRole(roles, "admin")) {
    return { userId: null, error: "Admin access required." };
  }

  return { userId: user.id, error: null };
}
