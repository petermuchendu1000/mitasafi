/**
 * URL Sanitization Utilities
 * 
 * Prevents open redirect vulnerabilities by validating redirect URLs.
 * All redirectTo parameters should be sanitized before use.
 */

// Allowed paths that can be redirected to
const ALLOWED_REDIRECT_PREFIXES = [
  '/dashboard',
  '/properties',
  '/listings',
  '/services',
  '/service-providers',
  '/saved',
  '/onboarding',
];

// Paths that should never be redirected to from untrusted input
const BLOCKED_PATHS = [
  '/api/',
  '/auth/callback',
  '/auth/signout',
];

/**
 * Sanitize a redirect URL to prevent open redirect attacks.
 * 
 * Rules:
 * 1. Must be a relative path (starts with /)
 * 2. Cannot contain protocol (http://, https://, //)
 * 3. Must start with an allowed prefix
 * 4. Cannot contain blocked paths
 * 5. Cannot contain encoded characters that could bypass checks
 * 
 * @param url - The URL to sanitize
 * @param fallback - Fallback URL if sanitization fails (default: /dashboard)
 * @returns Sanitized URL or fallback
 */
export function sanitizeRedirectUrl(url: string | null | undefined, fallback: string = '/dashboard'): string {
  // No URL provided
  if (!url) {
    return fallback;
  }

  try {
    // Decode URL to catch encoded bypass attempts
    const decoded = decodeURIComponent(url);
    
    // Must start with single /
    if (!decoded.startsWith('/') || decoded.startsWith('//')) {
      console.warn(`[Security] Blocked redirect - invalid path start: ${url}`);
      return fallback;
    }

    // Block protocol handlers (javascript:, data:, etc.)
    if (decoded.includes(':')) {
      console.warn(`[Security] Blocked redirect - contains protocol: ${url}`);
      return fallback;
    }

    // Block double-encoded paths
    if (decoded.includes('%')) {
      console.warn(`[Security] Blocked redirect - double encoded: ${url}`);
      return fallback;
    }

    // Block path traversal
    if (decoded.includes('..')) {
      console.warn(`[Security] Blocked redirect - path traversal: ${url}`);
      return fallback;
    }

    // Check against blocked paths
    for (const blocked of BLOCKED_PATHS) {
      if (decoded.toLowerCase().includes(blocked.toLowerCase())) {
        console.warn(`[Security] Blocked redirect - blocked path: ${url}`);
        return fallback;
      }
    }

    // Check against allowed prefixes
    const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(prefix => 
      decoded.toLowerCase().startsWith(prefix.toLowerCase())
    );

    if (!isAllowed) {
      console.warn(`[Security] Blocked redirect - not in allowed list: ${url}`);
      return fallback;
    }

    // Sanitize: remove any query params that look suspicious
    const urlObj = new URL(decoded, 'http://localhost');
    const cleanPath = urlObj.pathname;
    
    // Rebuild with only safe query params
    const safeParams = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      // Only allow alphanumeric param names and simple values
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) && !value.includes('<') && !value.includes('>')) {
        safeParams.set(key, value);
      }
    });

    const queryString = safeParams.toString();
    return queryString ? `${cleanPath}?${queryString}` : cleanPath;

  } catch (error) {
    console.warn(`[Security] Blocked redirect - parse error: ${url}`, error);
    return fallback;
  }
}

/**
 * Validate that a URL is safe for internal redirect.
 * Does not sanitize - just returns true/false.
 */
export function isValidRedirectUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const sanitized = sanitizeRedirectUrl(url, '__INVALID__');
    return sanitized !== '__INVALID__';
  } catch {
    return false;
  }
}

/**
 * Build a safe redirect URL with parameters.
 * Ensures the base path is allowed and params are sanitized.
 */
export function buildSafeRedirectUrl(
  basePath: string,
  params?: Record<string, string | undefined>
): string {
  // Validate base path
  const safePath = sanitizeRedirectUrl(basePath, '/dashboard');
  
  if (!params) return safePath;

  // Build query string with safe params only
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      // Sanitize value - no HTML, no protocols
      const safeValue = value
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '');
      searchParams.set(key, safeValue);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${safePath}?${queryString}` : safePath;
}
