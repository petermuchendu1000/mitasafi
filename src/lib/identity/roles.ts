/**
 * The one place that knows what a role is and how to read one.
 *
 * WHAT WAS WRONG
 *
 * FOUR vocabularies described the same thing, and none of them agreed with the
 * database:
 *
 *   UserRole          'tenant' | 'landlord' | 'service_provider'   (db-helpers)
 *   UserType          UserRole | 'admin'                           (db-helpers)
 *   SignupUserRole    'landlord' | 'service_provider'              (db-helpers)
 *   the URL aliases   adds 'provider' as a synonym for service_provider
 *   profiles_primary_role_check   tenant | landlord | service_provider
 *   user_roles_role_check         those three, plus admin
 *
 * The URL alias in particular was written out three times — src/proxy.ts had
 * the map, and signup/page.tsx and auth/callback/route.ts each re-derived it
 * inline as `x === 'provider' ? 'service_provider' : x`. Three copies of one
 * mapping is three chances for them to drift.
 *
 * And FOURTEEN files hand-rolled the same read:
 *
 *   .from('user_roles').select('role').eq('user_id', id).eq('is_active', true)
 *
 * with four different column lists, so what counted as "a role the user holds"
 * depended on which file you happened to be in. None of them called
 * get_user_roles() or user_has_role(), the two functions the database provides
 * for exactly this — because EXECUTE on both is granted to service_role only,
 * so no client can call them.
 *
 * WHAT THIS DOES NOT DO
 *
 * It does not define a fifth vocabulary. UserRole is re-exported from
 * src/types/db-helpers.ts, which is where it already lived, and the hierarchy
 * helper is re-exported rather than reimplemented. Adding a new source of
 * truth to fix having several would be the same mistake again.
 *
 * ON 'tenant', WHICH IS DEAD BUT STILL PERMITTED
 *
 * src/types/db-helpers.ts states it plainly: "'tenant' is deprecated — tenancy
 * is now a relationship, not a role. Users become tenants when a landlord adds
 * them to a unit via the leases table." Measured: NOTHING in src/ ever inserts
 * `role: 'tenant'`. It survives only as a URL alias and as a display fallback
 * in dashboard/searches/page.tsx.
 *
 * Both database CHECK constraints still permit it, so it is kept in the
 * vocabulary — a type that forbids a value the database accepts would make
 * reads of existing rows unsound. ASSIGNABLE_ROLES is the list that matters for
 * writes, and it does not contain it.
 */

import type { UserRole, UserType } from "@/types/db-helpers";
import { getPrimaryRoleByHierarchy } from "@/types/db-helpers";

export type { UserRole };
export { getPrimaryRoleByHierarchy };

/**
 * Every value user_roles.role may actually hold, 'admin' included.
 *
 * This distinction is load-bearing and the first version of this module got it
 * wrong. `UserRole` is the narrower vocabulary of profiles.primary_role, whose
 * CHECK constraint does NOT permit 'admin'; user_roles' CHECK does. Typing a
 * row read from user_roles as UserRole therefore required casting away a value
 * the database can genuinely return -- the same unchecked claim this module
 * exists to remove from the auth callback.
 *
 * Aliased from UserType rather than redefined, so there is still one source.
 */
export type RoleName = UserType;

/**
 * Every value `user_roles.role` may hold, per user_roles_role_check on the live
 * database. 'admin' is included because the constraint permits it.
 *
 * It cannot currently be reached: the RLS policy forbids a client writing
 * `role = 'admin'`, a trigger blocks raising it on UPDATE, and no function or
 * migration grants it. Admin provisioning is undefined and would need a direct
 * service_role write. That gap is recorded, not solved here.
 */
export const ALL_ROLE_VALUES = [
  "tenant",
  "landlord",
  "service_provider",
  "admin",
] as const;

/**
 * What `profiles.primary_role` may hold, per profiles_primary_role_check. Note
 * that it does NOT include 'admin' while user_roles does — the two constraints
 * genuinely disagree on the live database, and this records the difference
 * rather than papering over it.
 */
export const PRIMARY_ROLE_VALUES = [
  "tenant",
  "landlord",
  "service_provider",
] as const;

/**
 * The roles a user may give THEMSELVES. 'tenant' is excluded because it is
 * deprecated (see the header) and 'admin' because RLS forbids it.
 *
 * provision_identity() enforces the same list server-side, so a client that
 * bypasses this module is still refused.
 */
export const ASSIGNABLE_ROLES = ["landlord", "service_provider"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * The ONE place the URL/cookie spelling of a role maps to the database
 * spelling. 'provider' is the public-facing word; 'service_provider' is the
 * column value.
 */
const ROLE_URL_ALIASES: Readonly<Record<string, UserRole>> = {
  tenant: "tenant",
  landlord: "landlord",
  provider: "service_provider",
  service_provider: "service_provider",
};

/**
 * Turn a role from a URL parameter or cookie into a database value, or null.
 *
 * Returns null rather than throwing, and null rather than guessing: these
 * values arrive from a query string and from a cookie the user can edit, so an
 * unrecognised one is untrusted input, not an error condition. The previous
 * code cast such values straight to UserRole with `as UserRole`, which is a
 * claim TypeScript cannot check and the user can falsify.
 */
export function normalizeRoleParam(
  param: string | null | undefined,
): UserRole | null {
  if (!param) return null;
  return ROLE_URL_ALIASES[param.trim().toLowerCase()] ?? null;
}

/** Is this a role a user may assign to themselves? */
export function isAssignableRole(value: unknown): value is AssignableRole {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

/** One active role row, named the way the application thinks about it. */
export interface ActiveRole {
  role: RoleName;
  /** user_roles.is_verified — role APPROVAL, not identity verification. */
  isVerified: boolean;
}

/**
 * The slice of a Supabase client this module needs.
 *
 * Structural on purpose: the browser client, the cookie-scoped server client
 * and the service-role admin client are three different types, and all three
 * call this. Typing it as any one of them would force a cast at every call
 * site, which is how the hand-rolled reads multiplied in the first place.
 */
export interface RoleQueryClient {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        eq(
          column: string,
          value: boolean,
        ): PromiseLike<{
          data: { role: string; is_verified: boolean | null }[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

export interface ReadRolesResult {
  roles: ActiveRole[];
  error: string | null;
}

/**
 * Read the ACTIVE roles of one user.
 *
 * `is_active = true` is the filter, matching get_user_roles() and
 * user_has_role() in the database, which both key on is_active and ignore
 * is_verified. Approval is returned alongside so callers can require it
 * explicitly rather than conflating the two — several call sites previously
 * selected is_verified and then never looked at it.
 *
 * Works with any of the three clients. Under the browser or server client, RLS
 * restricts this to the caller's own rows, which is why reading someone ELSE's
 * roles needs the admin client and is a deliberate decision at the call site.
 *
 * Returns an empty list on error, with the error alongside. A user with no
 * roles is normal — they are browsing and saving listings — so an empty list is
 * not a failure and callers should not treat it as one.
 */
export async function readActiveRoles(
  client: RoleQueryClient,
  userId: string,
): Promise<ReadRolesResult> {
  const { data, error } = await client
    .from("user_roles")
    .select("role, is_verified")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    return { roles: [], error: error.message };
  }

  return {
    roles: (data ?? []).map((row) => ({
      // RoleName, not UserRole: 'admin' is a value this column can hold.
      role: row.role as RoleName,
      isVerified: row.is_verified ?? false,
    })),
    error: null,
  };
}

/** Does this set of roles include `role`, active? */
export function hasRole(roles: readonly ActiveRole[], role: RoleName): boolean {
  return roles.some((r) => r.role === role);
}

/** Does it include `role`, active AND approved? */
export function hasVerifiedRole(
  roles: readonly ActiveRole[],
  role: RoleName,
): boolean {
  return roles.some((r) => r.role === role && r.isVerified);
}

/** Every role name the user holds, 'admin' included. */
export function roleNames(roles: readonly ActiveRole[]): RoleName[] {
  return roles.map((r) => r.role);
}

/**
 * Only the product roles, excluding 'admin'.
 *
 * The hierarchy helper and most UI deal in UserRole, and 'admin' is not a
 * position in that hierarchy -- it is an orthogonal capability. Narrowing here
 * rather than casting keeps that distinction visible.
 */
export function productRoleNames(roles: readonly ActiveRole[]): UserRole[] {
  return roles.map((r) => r.role).filter((r): r is UserRole => r !== "admin");
}

/**
 * The product roles the user holds, with their approval flag, excluding
 * 'admin'.
 *
 * What the role-switcher UI wants: 'admin' is not a position a user switches
 * into, and typing it as one forced two dashboards to either widen their
 * component contracts or cast the value away.
 */
export function productRoles(
  roles: readonly ActiveRole[],
): { role: UserRole; isVerified: boolean }[] {
  return roles
    .filter((r): r is ActiveRole & { role: UserRole } => r.role !== "admin")
    .map((r) => ({ role: r.role, isVerified: r.isVerified }));
}

/**
 * The role to treat as primary: Landlord >= Service Provider > Tenant.
 *
 * Delegates to db-helpers so there is one hierarchy, not two. Returns null for
 * an empty set instead of inventing a default — the old code defaulted to
 * "tenant" in places, which displayed a deprecated role to users who hold none.
 */
export function primaryRoleOf(roles: readonly ActiveRole[]): UserRole | null {
  const names = productRoleNames(roles);
  if (names.length === 0) return null;
  return getPrimaryRoleByHierarchy(names);
}
