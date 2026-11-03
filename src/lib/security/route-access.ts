/**
 * Route access classification.
 *
 * Extracted from src/proxy.ts so it is pure, independently testable, and has a
 * single definition. Previously the arrays and the matching logic lived inline
 * in the proxy, and a defect went unnoticed: '/' was in publicRoutes and was
 * matched with startsWith(), so every pathname matched, every route was
 * treated as public, and the proxy's protected-route branch was unreachable.
 *
 * '/' MUST be compared exactly. Every other entry is a path prefix.
 */

/** Routes requiring an authenticated session. */
export const protectedRoutes = ['/dashboard', '/settings', '/admin'] as const;

/** Routes only meaningful to unauthenticated users. */
export const authRoutes = ['/login', '/signup'] as const;

/**
 * Routes that never need a role lookup. '/' is exact-match only; the rest are
 * prefixes. Note the proxy's own matcher already excludes static assets and
 * `api/`, so `/api/` here is belt-and-braces.
 */
export const publicRoutes = [
  '/',
  '/properties',
  '/listings',
  '/services',
  '/service-providers',
  '/landlords',
  '/contact',
  '/api/',
  '/onboarding',
] as const;

/**
 * True when the path needs no role lookup.
 * '/' matches only itself; all other entries match as prefixes.
 */
export function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return publicRoutes.some((route) => route !== '/' && pathname.startsWith(route));
}

/** True when the path requires an authenticated session. */
export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

/** True when the path is a sign-in/sign-up route. */
export function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname.startsWith(route));
}
