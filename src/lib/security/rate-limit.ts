// =============================================================================
// MITASAFI: API RATE LIMITING
// =============================================================================
// In-memory sliding-window rate limiter for API routes.
//
// Limitations of in-memory approach:
// - Resets on server restart / cold start
// - Not shared across serverless instances
// - For production at scale, migrate to Redis (Upstash) or similar
//
// This is sufficient for initial production hardening and protects against:
// - Booking spam (max 5 bookings per 15 min)
// - Search abuse (max 60 requests per min)
// - General API abuse (max 30 requests per min per IP)
//
// Usage:
//   const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });
//   const result = limiter.check(identifier);
//   if (!result.allowed) return new Response("Too many requests", { status: 429 });
// =============================================================================

interface RateLimitEntry {
  /** Timestamps of requests within the current window */
  timestamps: number[];
}

interface RateLimiterConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  max: number;
  /** Optional name for logging */
  name?: string;
}

interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Milliseconds until the window resets */
  resetMs: number;
  /** Total limit */
  limit: number;
}

/**
 * Create a rate limiter instance with specified window and max requests.
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const store = new Map<string, RateLimitEntry>();
  const { windowMs, max, name = "default" } = config;

  // Periodic cleanup to prevent memory leaks (every 5 minutes)
  let lastCleanup = Date.now();
  const CLEANUP_INTERVAL = 5 * 60 * 1000;

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    const cutoff = now - windowMs;
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }

  function check(identifier: string): RateLimitResult {
    cleanup();

    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = store.get(identifier);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(identifier, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    const remaining = Math.max(0, max - entry.timestamps.length);
    const resetMs =
      entry.timestamps.length > 0
        ? Math.max(0, entry.timestamps[0] + windowMs - now)
        : windowMs;

    if (entry.timestamps.length >= max) {
      return { allowed: false, remaining: 0, resetMs, limit: max };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: remaining - 1, resetMs, limit: max };
  }

  function reset(identifier: string) {
    store.delete(identifier);
  }

  return { check, reset, name };
}

// =============================================================================
// PRE-CONFIGURED LIMITERS
// =============================================================================

/** General API rate limit: 60 req / min per IP */
export const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  name: "api-general",
});

/** Booking creation: 5 req / 15 min per user */
export const bookingLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 5,
  name: "booking-create",
});

/** Search / suggestions: 120 req / min per IP */
export const searchLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  name: "search",
});

/** Auth attempts: 10 req / 15 min per IP */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  name: "auth",
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract client IP from NextRequest (works behind proxies).
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Build a 429 Response with standard rate-limit headers.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retryAfter: Math.ceil(result.resetMs / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(result.resetMs / 1000)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
      },
    }
  );
}
