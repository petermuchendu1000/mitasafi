/**
 * Auth Callback Route
 *
 * Handles OAuth redirects from providers (Google) and email confirmations.
 *
 * Multi-Role Flow:
 * - From Signup (new user): Creates profile + role, goes to dashboard
 * - From Signup (existing user, new role): Checks roles, shows warning or adds role
 * - From Login (existing with roles): Goes to dashboard
 * - From Login (existing without roles): Goes to signup to select role
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { UserRole, UserRoleInsert } from "@/types/db-helpers";
import {
  needsRoleUpgradeWarning,
  getPrimaryRoleByHierarchy,
} from "@/types/db-helpers";
import { sanitizeRedirectUrl } from "@/lib/security/url-sanitizer";

// Helper function to get redirect URL based on role and intent
function getIntentBasedRedirect(
  role: UserRole,
  intent: string | null,
  defaultRedirect: string,
  isNewProvider: boolean = false,
): string {
  // If there's a specific redirect (like a listing page), use that
  if (defaultRedirect !== "/dashboard") {
    return defaultRedirect;
  }
  // Otherwise, use intent-based routing
  if (role === "landlord") {
    if (intent === "list") return "/dashboard/landlord/listings/new";
    if (intent === "manage") return "/dashboard/landlord";
    return "/dashboard/landlord";
  }
  if (role === "service_provider") {
    // NEW providers must choose their type (individual/business) first
    if (isNewProvider) {
      return "/onboarding/provider-type?redirectTo=/dashboard/provider";
    }
    // Existing providers go to dashboard
    return "/dashboard/provider";
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // SECURITY: Sanitize all redirect URLs to prevent open redirect attacks
  const redirectTo = sanitizeRedirectUrl(
    requestUrl.searchParams.get("redirectTo"),
    "/dashboard",
  );
  const roleParam = requestUrl.searchParams.get("role"); // Fallback role from URL param
  const intentParam = requestUrl.searchParams.get("intent"); // 'list' | 'manage' | null
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (user) {
      // Check if user has a profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, primary_role, full_name")
        .eq("id", user.id)
        .single();

      const profile = profileData as {
        id: string;
        primary_role: string | null;
        full_name: string | null;
      } | null;

      // Check existing roles from user_roles table
      const { data: existingRolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true);

      const currentRoles: UserRole[] =
        existingRolesData?.map((r: { role: string }) => r.role as UserRole) ||
        [];

      // Check for pending role from signup flow (cookie takes priority, URL param as fallback)
      const cookieStore = await cookies();
      const pendingRoleCookie = cookieStore.get("pendingRole");
      const pendingRole = pendingRoleCookie?.value || roleParam; // 'tenant' | 'landlord' | 'provider'

      // Check for pending redirect URL from signup flow
      // SECURITY: Sanitize cookie-based redirects too - users can modify cookies
      const pendingRedirectCookie = cookieStore.get("pendingRedirect");
      const pendingRedirectRaw = pendingRedirectCookie?.value
        ? decodeURIComponent(pendingRedirectCookie.value)
        : null;
      const pendingRedirect = sanitizeRedirectUrl(
        pendingRedirectRaw,
        "/dashboard",
      );

      // Final redirect destination - prioritize pendingRedirect cookie, then URL param, then dashboard
      const finalRedirect = pendingRedirectRaw ? pendingRedirect : redirectTo;

      // Map 'provider' to 'service_provider' for database
      const userRole: UserRole | undefined = pendingRole
        ? pendingRole === "provider"
          ? "service_provider"
          : (pendingRole as UserRole)
        : undefined;

      if (!profile) {
        // New user: the profile and the role in ONE transactional, idempotent
        // call.
        //
        // These used to be two sequential writes, each logged-and-continued. A
        // failure on the first made the second fail by foreign key, and the
        // user was then redirected into a dashboard with no profile at all --
        // which 39 foreign keys now reference. provision_identity does both or
        // neither.
        //
        // It is also why the error below REDIRECTS instead of carrying on.
        // Continuing was the actual defect: a signed-in user with no profile
        // cannot be booked, cannot be paid, cannot hold a role and cannot
        // appear in profiles_public, and nothing told them or us.
        //
        // Because this callback runs on EVERY OAuth login and the function is
        // idempotent, a signup that fails here self-heals on the next login
        // rather than leaving the account permanently broken.
        const { error: provisionError } = await supabase.rpc(
          "provision_identity",
          {
            // undefined, not null: the generated Args type marks the defaulted
            // parameters optional, and omitting a key from the PostgREST body
            // is what makes Postgres apply the SQL default.
            p_email: user.email || "",
            p_phone: user.phone || undefined,
            p_full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              undefined,
            p_avatar_url:
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              undefined,
            p_role: userRole ?? undefined,
          },
        );

        if (provisionError) {
          console.error("Error provisioning identity:", provisionError);
          const response = NextResponse.redirect(
            `${origin}/login?error=provisioning_failed`,
          );
          response.cookies.delete("pendingRole");
          response.cookies.delete("pendingRedirect");
          return response;
        }

        // NOTE: the service_providers row is deliberately NOT created here, and
        // provision_identity does not create it either. isNewProvider below
        // redirects every new provider to /onboarding/provider-type, and
        // setProviderType() creates the row there -- with the service-role
        // client, 23505 race handling, a real business_type and a real phone.
        // Creating it here was premature, and it fabricated a phone number: an
        // OAuth user has no user.phone, so the fallback wrote the company's own
        // support line into a published marketplace contact field. See
        // src/lib/identity/provider-profile.ts.

        // Clear cookies and redirect based on intent
        // If no role was set, this is a basic user - redirect to properties or their original page
        // NEW: Service providers go to type selection first
        const isNewProvider = userRole === "service_provider";
        const targetRedirect = userRole
          ? getIntentBasedRedirect(
              userRole,
              intentParam,
              finalRedirect,
              isNewProvider,
            )
          : finalRedirect !== "/dashboard"
            ? finalRedirect
            : "/properties";
        const response = NextResponse.redirect(`${origin}${targetRedirect}`);
        response.cookies.delete("pendingRole");
        response.cookies.delete("pendingRedirect");
        return response;
      }

      // Existing user with pending role from signup
      if (pendingRole && userRole) {
        // Check if user already has this role
        if (currentRoles.includes(userRole)) {
          // Already has this role - go to original page
          const response = NextResponse.redirect(`${origin}${finalRedirect}`);
          response.cookies.delete("pendingRole");
          response.cookies.delete("pendingRedirect");
          return response;
        }

        // Check if role upgrade needs friction warning
        const warning = needsRoleUpgradeWarning(currentRoles, userRole);
        if (warning) {
          // Store role in cookie for the warning modal on signup page
          // Keep pendingRole and pendingRedirect cookies for the signup page to use
          const redirectParam =
            finalRedirect !== "/dashboard"
              ? `&redirectTo=${encodeURIComponent(finalRedirect)}`
              : "";
          const intentParamStr = intentParam ? `&intent=${intentParam}` : "";
          const response = NextResponse.redirect(
            `${origin}/signup?role=${pendingRole}&showWarning=true${redirectParam}${intentParamStr}`,
          );
          return response;
        }

        // No friction needed - add role directly
        const roleInsert: UserRoleInsert = {
          user_id: user.id,
          role: userRole,
          is_active: true,
          is_verified: false,
        };

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert(roleInsert as never);

        if (roleError) {
          console.error("Error adding user role:", roleError);
        }

        // Update primary_role based on hierarchy: Landlord >= Service Provider > Tenant
        const allRoles = [...currentRoles, userRole];
        const newPrimaryRole = getPrimaryRoleByHierarchy(allRoles);

        const { error: primaryRoleError } = await supabase
          .from("profiles")
          .update({ primary_role: newPrimaryRole } as never)
          .eq("id", user.id);

        if (primaryRoleError) {
          console.error("Error updating primary_role:", primaryRoleError);
        }

        // NOTE: as above, the service_providers row is created by
        // setProviderType() at /onboarding/provider-type, which isNewProvider
        // redirects to. The block that used to be here could never succeed:
        // it omitted `phone` (NOT NULL, no default, no BEFORE INSERT trigger)
        // and set `status`, which is not a column of service_providers at all
        // -- the column is `account_status`. Two independent failures, both
        // only logged, so this path silently never created a provider profile.

        // Redirect based on intent or to dashboard with newRole param
        // NEW: Service providers go to type selection first
        const isNewProvider = userRole === "service_provider";
        const targetUrl = getIntentBasedRedirect(
          userRole,
          intentParam,
          finalRedirect,
          isNewProvider,
        );
        const finalUrl =
          targetUrl.startsWith("/dashboard") && !targetUrl.includes("?")
            ? `${targetUrl}?newRole=${userRole}`
            : targetUrl;
        const response = NextResponse.redirect(`${origin}${finalUrl}`);
        response.cookies.delete("pendingRole");
        response.cookies.delete("pendingRedirect");
        return response;
      }

      // No pending role - this is a login flow or basic user signup
      // Users without roles are valid - they're just browsing/saving listings
      // They can still log in and access their saved listings, inquiry history, etc.
      const response = NextResponse.redirect(
        currentRoles.length > 0
          ? // User has roles - go to dashboard or original destination
            `${origin}${finalRedirect}`
          : // User without roles - go to their original destination (e.g., /properties) or default to /properties
            `${origin}${finalRedirect !== "/dashboard" ? finalRedirect : "/properties"}`,
      );
      response.cookies.delete("pendingRole");
      response.cookies.delete("pendingRedirect");
      return response;
    }
  }

  // No code present - redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
