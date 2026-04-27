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

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { UserRole } from '@/types/db-helpers'
import { PerformanceLogger } from '@/lib/performance/logger'

// =============================================================================
// SECURITY HEADERS
// =============================================================================
// Applied to every response for defense-in-depth.
// CSP is intentionally permissive for development; tighten in production.
// =============================================================================

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
    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Permissions Policy — disable unused browser features
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(self)"
  );

  return response;
}

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/settings']

// Routes only for unauthenticated users
const authRoutes = ['/login', '/signup']

// Routes that NEVER need role checks (skip DB calls entirely)
const publicRoutes = [
  '/',
  '/properties',
  '/listings',
  '/services',
  '/service-providers',
  '/landlords',
  '/contact',
  '/api/',
  '/onboarding',
]

// Map URL role param to database role
function mapRoleParam(roleParam: string): UserRole | null {
  const roleMap: Record<string, UserRole> = {
    'tenant': 'tenant',
    'landlord': 'landlord',
    'provider': 'service_provider',
    'service_provider': 'service_provider',
  }
  return roleMap[roleParam] || null
}

// Get redirect URL based on role and intent
function getRoleBasedRedirect(role: UserRole, intent: string | null): string {
  if (role === 'landlord') {
    if (intent === 'list') return '/dashboard/landlord/listings/new'
    if (intent === 'manage') return '/dashboard/landlord'
    return '/dashboard/landlord'
  }
  if (role === 'service_provider') {
    return '/dashboard/provider'
  }
  return '/dashboard'
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // =========================================================================
  // ROUTE MIGRATION: /services → /services/browse (SLP-1)
  // Redirect old marketplace URLs with query params to the new /services/browse route.
  // Bare /services without query params now serves the landing page — no redirect.
  // =========================================================================
  if (pathname === '/services' && request.nextUrl.search) {
    const browseUrl = new URL(`/services/browse${request.nextUrl.search}`, request.url)
    return NextResponse.redirect(browseUrl, 308)
  }

  // 🔍 PERFORMANCE TRACKING: Start monitoring
  const perf = new PerformanceLogger('Proxy Middleware', { 
    pathname,
    method: request.method,
  })
  
  perf.start('route-check')
  // PERFORMANCE: Skip expensive operations for truly public routes
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  perf.end('route-check')
  
  // STRATEGY 3: For public routes, skip auth check entirely (no network calls!)
  if (isPublicRoute) {
    perf.start('public-route-bypass')
    const { supabaseResponse } = await updateSession(request, true) // skipAuthCheck = true
    perf.end('public-route-bypass')
    
    // Log only slow requests (>100ms)
    perf.logSummary(100)
    return applySecurityHeaders(supabaseResponse)
  }
  
  perf.start('session-refresh-protected')
  const { supabaseResponse, user, supabase } = await updateSession(request, false) // full auth check
  perf.end('session-refresh-protected')

  // Check if route is protected
  perf.start('route-classification')
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  perf.end('route-classification')

  // Unauthenticated user trying to access protected route
  if (isProtectedRoute && !user) {
    perf.start('redirect-to-login')
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    perf.end('redirect-to-login')
    perf.logSummary(100)
    return NextResponse.redirect(redirectUrl)
  }

  // PERFORMANCE: Only fetch roles ONCE if needed for auth routes OR protected routes
  let userRoles: UserRole[] = []
  let rolesFetched = false
  
  async function getUserRoles(): Promise<UserRole[]> {
    if (rolesFetched) return userRoles
    if (!user) return []
    
    perf.start('db-fetch-user-roles')
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
    perf.end('db-fetch-user-roles', { 
      rolesCount: rolesData?.length || 0,
      userId: user.id 
    })
    
    userRoles = rolesData?.map((r: { role: UserRole }) => r.role) || []
    rolesFetched = true
    return userRoles
  }

  // Authenticated user trying to access auth routes (login/signup)
  if (isAuthRoute && user) {
    perf.start('auth-route-logic')
    // Check if user has any active roles
    const roles = await getUserRoles()
    const hasRoles = roles.length > 0

    // Get URL params
    const showWarning = request.nextUrl.searchParams.get('showWarning') === 'true'
    const roleParam = request.nextUrl.searchParams.get('role')
    const intentParam = request.nextUrl.searchParams.get('intent')
    const redirectToParam = request.nextUrl.searchParams.get('redirectTo')
    
    // Allow access to signup if showWarning=true (role upgrade flow)
    if (pathname.startsWith('/signup') && showWarning) {
      perf.end('auth-route-logic', { action: 'allow-signup-warning' })
      perf.logSummary(100)
      // Let them through to see the role upgrade warning
      return supabaseResponse
    }

    // Handle signup with role param - user wants to add/switch role
    if (pathname.startsWith('/signup') && roleParam && hasRoles) {
      const targetRole = mapRoleParam(roleParam)
      
      if (targetRole) {
        // Check if user already has this role
        const alreadyHasRole = roles.includes(targetRole)
        
        if (alreadyHasRole) {
          perf.end('auth-route-logic', { action: 'redirect-has-role' })
          // User already has this role - redirect to role-specific dashboard
          const redirectUrl = new URL(getRoleBasedRedirect(targetRole, intentParam), request.url)
          perf.logSummary(100)
          return NextResponse.redirect(redirectUrl)
        } else {
          perf.end('auth-route-logic', { action: 'redirect-upgrade-warning' })
          // User doesn't have this role - redirect to signup with showWarning=true
          // This will trigger the role upgrade warning UI
          const upgradeUrl = new URL('/signup', request.url)
          upgradeUrl.searchParams.set('role', roleParam)
          upgradeUrl.searchParams.set('showWarning', 'true')
          if (intentParam) {
            upgradeUrl.searchParams.set('intent', intentParam)
          }
          if (redirectToParam) {
            upgradeUrl.searchParams.set('redirectTo', redirectToParam)
          }
          perf.logSummary(100)
          return NextResponse.redirect(upgradeUrl)
        }
      }
    }

    perf.end('auth-route-logic', { action: 'default-redirect' })
    // Default: If user has roles, go to dashboard; if no roles, let them access signup
    if (hasRoles) {
      perf.logSummary(100)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // User without roles can access signup to select one, but not login
    if (pathname.startsWith('/login')) {
      perf.logSummary(100)
      return NextResponse.redirect(new URL('/signup', request.url))
    }
  }

  // Check role status for authenticated users on protected routes
  if (isProtectedRoute && user) {
    perf.start('protected-route-role-check')
    // PERFORMANCE: Reuse cached roles if already fetched, otherwise fetch
    const roles = await getUserRoles()

    // If no roles, redirect to signup to select role
    if (roles.length === 0) {
      perf.end('protected-route-role-check', { action: 'no-roles-redirect' })
      perf.logSummary(100)
      return NextResponse.redirect(new URL('/signup', request.url))
    }
    perf.end('protected-route-role-check', { rolesCount: roles.length })
  }

  // Log performance for all requests that take >100ms
  perf.logSummary(100)
  return applySecurityHeaders(supabaseResponse)
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
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
