// =============================================================================
// MITASAFI: API RATE LIMITING
// =============================================================================
// In-memory sliding-window rate limiter for API routes.
//
// Limitations of the in-memory approach:
// - Resets on server restart, and on Fly on a cold start after a scale-to-zero
//   idle period (min_machines_running = 0)
// - The store is PER MACHINE, and production runs two machines, so the
//   effective ceiling is up to 2x the configured max depending on which
//   machine fly-proxy picks
// - For production at scale, migrate to Redis (Upstash) or similar
//
// This is sufficient for initial production hardening and protects against:
// - Booking spam (5 per 15 min, keyed by client IP — see getClientIp)
// - Search / suggestions abuse (120 per min)
// - General API abuse (60 per min)
// The figures above are the ones the limiters below actually declare; keep
// them in step if you change a limiter.
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

/**
 * Booking creation: 5 req / 15 min per client IP.
 *
 * NOT per user: bookings/route.ts runs this check BEFORE authenticating, so
 * that unauthenticated spam is rejected cheaply. The identifier is therefore
 * whatever getClientIp() resolves, which is why that function being correct
 * decides whether this limit is per-caller or one global bucket.
 */
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
 * Extract the client IP for rate-limiting purposes.
 *
 * SECURITY FIX: this read `x-forwarded-for.split(",")[0]` and then fell back to
 * `x-real-ip`. Both are positions an attacker controls. In a proxy chain the
 * untrusted client value is PREPENDED and each proxy APPENDS what it actually
 * saw, so element [0] is pure client input — which meant every rate limit in
 * the app could be evaded by sending a different `x-forwarded-for` on each
 * request, and `x-real-ip` could be set freely on any platform that does not
 * overwrite it. Rate limits that an attacker can reset at will are not limits.
 *
 * We take a position the client cannot prepend to: either a single-value
 * header the platform itself writes, or x-forwarded-for indexed from the RIGHT.
 * If we cannot identify a client we return "unknown", which buckets all
 * unidentifiable callers TOGETHER — deliberately the pessimistic choice for a
 * limiter, since the alternative hands each forged header its own fresh quota.
 *
 * SECOND DEFECT, and the reason this function is configurable: the hop count
 * was hard-coded to 1 and justified with "Vercel (this repo's platform) and
 * Fly.io each append exactly one entry". Production runs on Fly, and Fly
 * appends TWO. Measured against production on 2026-11-21 — probes carrying 0,
 * 1 and 2 forged x-forwarded-for entries all resolved the caller's real address
 * at hop 2, cross-region and same-region — so at hop 1 this function returned
 * 66.241.125.38, an address assigned to the APP, for every caller alive. Every
 * limiter was one GLOBAL bucket: bookingLimiter's "5 per 15 min" was five
 * bookings per 15 minutes for the whole platform, exhaustible by one actor.
 * That is an availability defect, not an evasion one — a caller could not
 * obtain a different bucket either.
 *
 * WHY HOPS DEFAULT TO 1 AND NOT TO THE MEASURED 2: the trusted index is
 * `len - hops`, and with a forged prefix of length f the chain is f + k long,
 * so the forged region is read exactly when hops > k. A default of 2 would
 * therefore be a silent fail-OPEN on any single-hop platform. 1 can never
 * exceed k, so it is safe everywhere and useless here — the correct shape for a
 * default. Correctness comes from TRUSTED_PROXY_HOPS, set per deployment
 * (fly.toml declares 2), exactly as the payment path does.
 *
 * TRUSTED_CLIENT_IP_HEADER names a platform-written header and has NO default,
 * for the same reason it has none in the payment path: a header is trustworthy
 * only if the serving platform overwrites a client-supplied copy, which is a
 * fact about the deployment and not about this code. Defaulting it to
 * fly-client-ip is what made the payment path bypassable on a non-Fly deploy.
 *
 * The payment callback path needs a stricter decision than a limiter does
 * (allow/deny against a provider whitelist rather than bucketing), and has its
 * own hardened implementation with CIDR matching in
 * `@/lib/payments/mpesa-config`, reading MPESA_-prefixed variables. The two
 * resolve the client the same way and must stay consistent; the names are kept
 * separate so a limiter change can never alter a payment authorization.
 */
const DEFAULT_TRUSTED_PROXY_HOPS = 1;
const MAX_XFF_ENTRIES = 64;

type EnvLike = Record<string, string | undefined>;

function resolveTrustedProxyHops(env: EnvLike): number {
  const raw = env.TRUSTED_PROXY_HOPS;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_TRUSTED_PROXY_HOPS;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_XFF_ENTRIES) {
    // Fail CLOSED on nonsense: never widen trust because a value was mistyped.
    return DEFAULT_TRUSTED_PROXY_HOPS;
  }
  return parsed;
}

/**
 * Strip an IPv6-mapped IPv4 prefix, brackets and any :port suffix so the same
 * caller always lands in the same bucket.
 */
function normalizeForBucket(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/^::ffff:/i, "")
    .replace(/^\[|\]$/g, "");
  if (!trimmed) return null;
  const withoutPort =
    trimmed.includes(".") && trimmed.includes(":")
      ? trimmed.split(":")[0]
      : trimmed;
  return withoutPort || null;
}

export function getClientIp(
  headers: Headers,
  env: EnvLike = process.env,
): string {
  // 1. A platform-written single-value header, OPT-IN ONLY — never defaulted.
  //    A comma means it was not platform-written, so we ignore it and fall
  //    through rather than trusting a list someone else may have built.
  const platformHeader = (env.TRUSTED_CLIENT_IP_HEADER || "")
    .trim()
    .toLowerCase();

  if (platformHeader) {
    const platformValue = headers.get(platformHeader);
    if (platformValue && !platformValue.includes(",")) {
      const ip = normalizeForBucket(platformValue);
      if (ip) return ip;
    }
  }

  // 2. x-forwarded-for, counted from the right.
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded || !forwarded.trim()) {
    return "unknown";
  }

  const entries = forwarded
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  // An absurdly long chain is an attempt to push the trusted position out of
  // range; refuse to guess.
  if (entries.length === 0 || entries.length > MAX_XFF_ENTRIES) {
    return "unknown";
  }

  const index = entries.length - resolveTrustedProxyHops(env);
  if (index < 0) {
    // Fewer entries than our edge should have written: not a chain we vouched
    // for, and reading position 0 here is precisely the fail-open case.
    return "unknown";
  }

  return normalizeForBucket(entries[index]) ?? "unknown";
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
    },
  );
}
