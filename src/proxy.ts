/**
 * Next.js Proxy (formerly Middleware)
 *
 * Next.js 16+ uses "proxy" instead of "middleware".
 *
 * Handles:
 * - Session refresh
 * - Protected route redirection
 * - Role-based access control (multi-role support)
 * - Smart role upgrade flow (redirects to warning when adding new role)
 *
 * PERFORMANCE: This runs on EVERY request - minimize database calls!
 */

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  normalizeRoleParam,
  readActiveRoles,
  productRoleNames,
} from "@/lib/identity/roles";
import type { RoleQueryClient } from "@/lib/identity/roles";
import type { UserRole } from "@/types/db-helpers";
import { PerformanceLogger } from "@/lib/performance/logger";
import {
  isPublicRoute,
  isProtectedRoute,
  isAuthRoute,
} from "@/lib/security/route-access";

// =============================================================================
// SECURITY HEADERS
// =============================================================================
// Applied to every response for defense-in-depth.
// CSP is intentionally permissive for development; tighten in production.
// =============================================================================

/**
 * Carry the session forward onto a response we are creating ourselves.
 *
 * WHY THIS EXISTS
 *   updateSession() refreshes the access token and writes the new cookies
 *   onto ITS response object. Every redirect below used to build a fresh
 *   NextResponse and return that instead, so on any request where a refresh
 *   happened, the new cookies were thrown away.
 *
 *   That signs people out. Supabase ROTATES refresh tokens: once a refresh
 *   succeeds the old token is spent. Dropping the new cookies leaves the
 *   browser holding the spent one, so the NEXT request cannot refresh,
 *   getUser() returns null, and the dashboard layout sends them to /login.
 *   It looks random from the outside, because it depends on whether that
 *   particular request happened to be the one that refreshed.
 *
 *   https://supabase.com/docs/guides/auth/server-side/nextjs says to copy
 *   the cookies whenever you return a different response object.
 */
function withSession(
  response: NextResponse,
  session: NextResponse,
): NextResponse {
  for (const cookie of session.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  const h = response.headers;

  // Prevent MIME-type sniffing
  h.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  h.set("X-Frame-Options", "DENY");

  // Enable browser XSS filter (legacy, but harmless)
  h.set("X-XSS-Protection", "1; mode=block");

  // Referrer — send origin only to third parties
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // HSTS — 1 year, include subdomains
  if (process.env.NODE_ENV === "production") {
    h.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  // Permissions Policy — disable unused browser features
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(self)",
  );

  return response;
}

// The URL-to-database role mapping lives in src/lib/identity/roles.ts. It used
// to be written out here AND re-derived inline in signup/page.tsx and
// auth/callback/route.ts as `x === 'provider' ? 'service_provider' : x` --
// three copies of one mapping, three chances to drift.

// Get redirect URL based on role and intent
function getRoleBasedRedirect(role: UserRole, intent: string | null): string {
  if (role === "landlord") {
    if (intent === "list") return "/dashboard/landlord/listings/new";
    if (intent === "manage") return "/dashboard/landlord";
    return "/dashboard/landlord";
  }
  if (role === "service_provider") {
    return "/dashboard/provider";
  }
  return "/dashboard";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // =========================================================================
  // ROUTE MIGRATION: /services → /services/browse (SLP-1)
  // Redirect old marketplace URLs with query params to the new /services/browse route.
  // Bare /services without query params now serves the landing page — no redirect.
  // =========================================================================
  if (pathname === "/services" && request.nextUrl.search) {
    const browseUrl = new URL(
      `/services/browse${request.nextUrl.search}`,
      request.url,
    );
    return NextResponse.redirect(browseUrl, 308);
  }

  // 🔍 PERFORMANCE TRACKING: Start monitoring
  const perf = new PerformanceLogger("Proxy Middleware", {
    pathname,
    method: request.method,
  });

  perf.start("route-check");
  // PERFORMANCE: Skip expensive operations for truly public routes
  const isPublic = isPublicRoute(pathname);
  perf.end("route-check");

  // STRATEGY 3: For public routes, skip auth check entirely (no network calls!)
  if (isPublic) {
    perf.start("public-route-bypass");
    const { supabaseResponse } = await updateSession(request, true); // skipAuthCheck = true
    perf.end("public-route-bypass");

    // Log only slow requests (>100ms)
    perf.logSummary(100);
    return applySecurityHeaders(supabaseResponse);
  }

  perf.start("session-refresh-protected");
  const { supabaseResponse, user, supabase } = await updateSession(
    request,
    false,
  ); // full auth check
  perf.end("session-refresh-protected");

  // Check if route is protected
  perf.start("route-classification");
  const isProtected = isProtectedRoute(pathname);
  const isAuth = isAuthRoute(pathname);
  perf.end("route-classification");

  // Unauthenticated user trying to access protected route
  if (isProtected && !user) {
    perf.start("redirect-to-login");
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    perf.end("redirect-to-login");
    perf.logSummary(100);
    return withSession(NextResponse.redirect(redirectUrl), supabaseResponse);
  }

  // PERFORMANCE: Only fetch roles ONCE if needed for auth routes OR protected routes
  let userRoles: UserRole[] = [];
  let rolesFetched = false;

  async function getUserRoles(): Promise<UserRole[]> {
    if (rolesFetched) return userRoles;
    if (!user) return [];

    perf.start("db-fetch-user-roles");
    // The shared read. This middleware keeps its OWN memoization (rolesFetched)
    // rather than using getCachedRoles: React cache() is per-request in the
    // server runtime and has no meaning here.
    const { roles } = await readActiveRoles(
      supabase as unknown as RoleQueryClient,
      user.id,
    );
    perf.end("db-fetch-user-roles", {
      rolesCount: roles.length,
      userId: user.id,
    });

    userRoles = productRoleNames(roles);
    rolesFetched = true;
    return userRoles;
  }

  // Authenticated user trying to access auth routes (login/signup)
  if (isAuth && user) {
    perf.start("auth-route-logic");
    // Check if user has any active roles
    const roles = await getUserRoles();
    const hasRoles = roles.length > 0;

    // Get URL params
    const showWarning =
      request.nextUrl.searchParams.get("showWarning") === "true";
    const roleParam = request.nextUrl.searchParams.get("role");
    const intentParam = request.nextUrl.searchParams.get("intent");
    const redirectToParam = request.nextUrl.searchParams.get("redirectTo");

    // Allow access to signup if showWarning=true (role upgrade flow)
    if (pathname.startsWith("/signup") && showWarning) {
      perf.end("auth-route-logic", { action: "allow-signup-warning" });
      perf.logSummary(100);
      // Let them through to see the role upgrade warning
      return supabaseResponse;
    }

    // Handle signup with role param - user wants to add/switch role
    if (pathname.startsWith("/signup") && roleParam && hasRoles) {
      const targetRole = normalizeRoleParam(roleParam);

      if (targetRole) {
        // Check if user already has this role
        const alreadyHasRole = roles.includes(targetRole);

        if (alreadyHasRole) {
          perf.end("auth-route-logic", { action: "redirect-has-role" });
          // User already has this role - redirect to role-specific dashboard
          const redirectUrl = new URL(
            getRoleBasedRedirect(targetRole, intentParam),
            request.url,
          );
          perf.logSummary(100);
          return withSession(
            NextResponse.redirect(redirectUrl),
            supabaseResponse,
          );
        } else {
          perf.end("auth-route-logic", { action: "redirect-upgrade-warning" });
          // User doesn't have this role - redirect to signup with showWarning=true
          // This will trigger the role upgrade warning UI
          const upgradeUrl = new URL("/signup", request.url);
          upgradeUrl.searchParams.set("role", roleParam);
          upgradeUrl.searchParams.set("showWarning", "true");
          if (intentParam) {
            upgradeUrl.searchParams.set("intent", intentParam);
          }
          if (redirectToParam) {
            upgradeUrl.searchParams.set("redirectTo", redirectToParam);
          }
          perf.logSummary(100);
          return withSession(
            NextResponse.redirect(upgradeUrl),
            supabaseResponse,
          );
        }
      }
    }

    perf.end("auth-route-logic", { action: "default-redirect" });
    // Default: If user has roles, go to dashboard; if no roles, let them access signup
    if (hasRoles) {
      perf.logSummary(100);
      return withSession(
        NextResponse.redirect(new URL("/dashboard", request.url)),
        supabaseResponse,
      );
    }

    // User without roles can access signup to select one, but not login
    if (pathname.startsWith("/login")) {
      perf.logSummary(100);
      return withSession(
        NextResponse.redirect(new URL("/signup", request.url)),
        supabaseResponse,
      );
    }
  }

  // Check role status for authenticated users on protected routes
  if (isProtected && user) {
    perf.start("protected-route-role-check");
    // PERFORMANCE: Reuse cached roles if already fetched, otherwise fetch
    const roles = await getUserRoles();

    // If no roles, redirect to signup to select role
    if (roles.length === 0) {
      perf.end("protected-route-role-check", { action: "no-roles-redirect" });
      perf.logSummary(100);
      return withSession(
        NextResponse.redirect(new URL("/signup", request.url)),
        supabaseResponse,
      );
    }
    perf.end("protected-route-role-check", { rolesCount: roles.length });
  }

  // Log performance for all requests that take >100ms
  perf.logSummary(100);
  return applySecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt$|sitemap\\.xml$|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
