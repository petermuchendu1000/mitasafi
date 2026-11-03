// =============================================================================
// MITASAFI: M-PESA CONFIGURATION MODULE (SI-4)
// =============================================================================
// Centralized, validated configuration for the Safaricom Daraja API.
//
// Responsibilities:
//   1. Zod-validated env var loading (fail fast on misconfiguration)
//   2. Environment switching (sandbox vs production)
//   3. Safaricom IP whitelist for callback security
//   4. Health check / diagnostics for deployment verification
//
// Usage:
//   import { getMpesaConfig, isSafaricomIp, checkMpesaHealth } from "@/lib/payments/mpesa-config";
//
// Environment variables:
//   MPESA_CONSUMER_KEY      — Daraja app consumer key
//   MPESA_CONSUMER_SECRET   — Daraja app consumer secret
//   MPESA_PASSKEY           — Lipa Na M-Pesa Online passkey
//   MPESA_SHORTCODE         — Business shortcode (paybill or till number)
//   MPESA_CALLBACK_URL      — Public URL for Safaricom to call back
//   MPESA_ENVIRONMENT       — "sandbox" | "production" (defaults to "sandbox")
//
// Callback-security environment variables (see section 3):
//   MPESA_TRUSTED_PROXY_HOPS        — proxy hops at the END of x-forwarded-for
//                                     that our own edge appended. Default 1,
//                                     which matches Fly.io (fly-proxy) and
//                                     Vercel. Raise it only when you add more
//                                     trusted appending proxies in front.
//   MPESA_TRUSTED_CLIENT_IP_HEADER  — platform-written single-value client-IP
//                                     header. Default "fly-client-ip"; set to
//                                     "x-real-ip" on a platform that
//                                     guarantees that header.
//   MPESA_ALLOW_INSECURE_CALLBACKS  — "true" opts in to accepting
//                                     loopback/private-range callbacks for
//                                     LOCAL testing. Requires an explicit
//                                     MPESA_ENVIRONMENT=sandbox and a
//                                     non-production app env. NEVER set this
//                                     in a deployed environment.
// =============================================================================

import { z } from "zod";

// =============================================================================
// 1. CONFIGURATION SCHEMA
// =============================================================================

const MpesaEnvironmentSchema = z.enum(["sandbox", "production"]);

export type MpesaEnvironment = z.infer<typeof MpesaEnvironmentSchema>;

const MpesaConfigSchema = z.object({
  consumerKey: z
    .string()
    .min(1, "MPESA_CONSUMER_KEY is required"),
  consumerSecret: z
    .string()
    .min(1, "MPESA_CONSUMER_SECRET is required"),
  passkey: z
    .string()
    .min(1, "MPESA_PASSKEY is required"),
  shortcode: z
    .string()
    .min(1, "MPESA_SHORTCODE is required")
    .regex(/^\d{5,7}$/, "MPESA_SHORTCODE must be 5-7 digits"),
  callbackUrl: z
    .string()
    .url("MPESA_CALLBACK_URL must be a valid URL")
    .refine(
      (url) => url.startsWith("https://"),
      "MPESA_CALLBACK_URL must use HTTPS (required by Safaricom)"
    ),
  environment: MpesaEnvironmentSchema,
});

export type MpesaConfig = z.infer<typeof MpesaConfigSchema> & {
  /** Daraja API base URL, derived from environment. */
  baseUrl: string;
};

// =============================================================================
// 2. DARAJA API URLS
// =============================================================================

const DARAJA_URLS: Record<MpesaEnvironment, string> = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

// =============================================================================
// 3. CALLBACK SOURCE AUTHORIZATION (TRUSTED IP EXTRACTION + WHITELIST)
// =============================================================================
// SECURITY FIX — SEV-0 fail-open authentication on the Daraja callback.
//
// WHAT WAS WRONG (all three defects were live simultaneously):
//   1. FAIL-OPEN AUTH. isSafaricomIp() returned TRUE UNCONDITIONALLY whenever
//      environment === "sandbox". "sandbox" was also the *silent default*: it
//      is what getMpesaConfig() resolves to when MPESA_ENVIRONMENT is unset,
//      and what the callback route fell back to when getMpesaConfig() THREW
//      ("default to sandbox (permissive)"). Net effect: any misconfigured or
//      non-production deploy accepted a forged settlement callback from ANY IP
//      on the internet — the gateway to an unbounded provider-wallet mint.
//   2. SPOOFABLE WHITELIST. The "production" list contained 127.0.0.,
//      192.168., ::1, ::ffff:127.0.0. and 104.248. (a DigitalOcean range, not
//      Safaricom). Combined with a caller that read x-forwarded-for[0] — a
//      client-supplied position — a plain `x-forwarded-for: 127.0.0.1` passed
//      the PRODUCTION whitelist.
//   3. SLOPPY MATCHING. startsWith("196.201.214.") has no octet boundary and
//      cannot express a real CIDR.
//
// WHY THE NEW CODE IS SAFE:
//   - DENY IS THE DEFAULT, EVERYWHERE. A missing env var, an unparseable IP, a
//     short/absent proxy chain or a config load failure can only make the check
//     STRICTER. There is exactly one bypass (insecure local mode) and it cannot
//     be reached by accident: it needs MPESA_ALLOW_INSECURE_CALLBACKS=true AND
//     an explicitly-set MPESA_ENVIRONMENT=sandbox AND a non-production app env,
//     and it screams into the log every time it is used.
//   - The production whitelist holds Safaricom ranges ONLY. Loopback, RFC1918
//     and the DigitalOcean range now live in DEV_ONLY_IP_RANGES, which is read
//     only inside that explicit insecure mode.
//   - Matching is real CIDR containment over a strictly-parsed IPv4 address, so
//     octet boundaries are exact and "196.201.2140" can never match a /24.
//   - The client IP is taken from a position the EDGE wrote, never one the
//     client can prepend (see extractTrustedClientIp below).
//
// Safaricom publishes the ranges Daraja callbacks originate from; re-verify at
// https://developer.safaricom.co.ke/Documentation
// Last verified: 2026-03-03
// =============================================================================

/** Production whitelist: Safaricom Daraja callback ranges ONLY. */
const SAFARICOM_IP_RANGES: readonly string[] = [
  "196.201.214.0/24",
  "196.201.213.0/24",
  "196.201.212.0/24",
] as const;

/**
 * Ranges that are NEVER valid in production. Reachable only via the explicit
 * insecure local mode (see isInsecureCallbackModeEnabled). These are exactly
 * the entries that used to sit, dangerously, in the production whitelist.
 */
const DEV_ONLY_IP_RANGES: readonly string[] = [
  "127.0.0.0/8",     // loopback
  "10.0.0.0/8",      // RFC1918
  "172.16.0.0/12",   // RFC1918
  "192.168.0.0/16",  // RFC1918
  "104.248.0.0/16",  // DigitalOcean (was mislabelled as Safaricom sandbox)
] as const;

/** Non-IPv4 literals accepted only in insecure local mode. */
const DEV_ONLY_IP_LITERALS: readonly string[] = ["::1"] as const;

/**
 * Hard cap on x-forwarded-for entries. A legitimate chain is 1-3 hops; a
 * 200-entry header is an attempt to confuse hop counting, so we deny outright
 * instead of indexing into it.
 */
const MAX_XFF_ENTRIES = 64;

/** Default number of proxy hops we trust to have appended to x-forwarded-for. */
const DEFAULT_TRUSTED_PROXY_HOPS = 1;

// ─── IPv4 / CIDR primitives (dependency-free) ────────────────────────────────

/** Strict dotted-quad parse. Rejects leading zeros (octal ambiguity) and >255. */
function parseIpv4(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;

  let acc = 0;
  for (const part of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    acc = (acc << 8) | octet;
  }
  return acc >>> 0;
}

/**
 * Normalize a raw IP token into a canonical comparable form.
 *
 * Handles: surrounding whitespace, "[::1]:443" bracket+port, "1.2.3.4:5678"
 * port suffixes and "::ffff:1.2.3.4" IPv4-mapped IPv6.
 *
 * @returns dotted-quad IPv4, a lowercased IPv6 literal, or null if unparseable.
 *          null always means DENY at the call sites below.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;

  let value = raw.trim();
  if (!value) return null;

  // "[2001:db8::1]:443" / "[::1]" → inner literal
  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    if (close < 0) return null;
    value = value.slice(1, close);
  } else if (value.split(":").length === 2 && value.includes(".")) {
    // "1.2.3.4:5678" → strip the port
    value = value.slice(0, value.indexOf(":"));
  }

  value = value.trim();
  if (!value) return null;

  // IPv4-mapped IPv6 ("::ffff:127.0.0.1") collapses to its IPv4 form so that a
  // mapped loopback can never slip past an IPv4 range check.
  const mapped = /^::ffff:(.+)$/i.exec(value);
  if (mapped && parseIpv4(mapped[1]) !== null) {
    return mapped[1];
  }

  if (parseIpv4(value) !== null) {
    return value;
  }

  // Remaining IPv6 literals are returned for exact-literal comparison only;
  // they match no production range, so they are denied in production.
  if (/^[0-9a-f:]+$/i.test(value) && value.includes(":")) {
    return value.toLowerCase();
  }

  return null; // e.g. "not-an-ip"
}

/**
 * Exact CIDR containment. Accepts "a.b.c.d/len" or a bare "a.b.c.d" (= /32).
 * Replaces the old startsWith() prefix matching, which had no octet boundary.
 */
export function ipInCidr(ip: string, cidr: string): boolean {
  const addr = parseIpv4(ip);
  if (addr === null) return false;

  const [network, lenRaw] = cidr.split("/");
  const base = parseIpv4(network);
  if (base === null) return false;

  const len = lenRaw === undefined ? 32 : Number(lenRaw);
  if (!Number.isInteger(len) || len < 0 || len > 32) return false;
  if (len === 0) return true;

  const mask = (0xffffffff << (32 - len)) >>> 0;
  return (addr & mask) >>> 0 === (base & mask) >>> 0;
}

function ipInAnyCidr(ip: string, cidrs: readonly string[]): boolean {
  return cidrs.some((cidr) => ipInCidr(ip, cidr));
}

// ─── Insecure local mode (the ONLY bypass, and it must be deliberate) ────────

/**
 * True only when an operator has explicitly opted into accepting callbacks
 * from any source for local testing.
 *
 * ALL of the following must hold — no single missing/typo'd var can enable it:
 *   MPESA_ALLOW_INSECURE_CALLBACKS === "true"   (explicit opt-in)
 *   MPESA_ENVIRONMENT === "sandbox"             (explicit, not defaulted)
 *   NODE_ENV !== "production"
 *   NEXT_PUBLIC_APP_ENV !== "production"
 */
export function isInsecureCallbackModeEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return (
    env.MPESA_ALLOW_INSECURE_CALLBACKS === "true" &&
    env.MPESA_ENVIRONMENT === "sandbox" &&
    env.NODE_ENV !== "production" &&
    env.NEXT_PUBLIC_APP_ENV !== "production"
  );
}

// ─── Trusted client IP extraction ────────────────────────────────────────────

/** Minimal shape of a Headers object, so this stays unit-testable. */
export interface HeaderReader {
  get(name: string): string | null;
}

export interface ClientIpResult {
  /** Normalized client IP, or null when no trustworthy value exists (= deny). */
  ip: string | null;
  /** Which header the value came from, for logging. */
  source: string;
  /** Machine-readable explanation, for logging. */
  reason: string;
}

/**
 * How many hops at the END of x-forwarded-for were appended by infrastructure
 * we control. Configurable via MPESA_TRUSTED_PROXY_HOPS.
 *
 * DEFAULT = 1, which matches BOTH deployments this app has used:
 *   - Fly.io: fly-proxy appends the peer address it saw as the LAST entry.
 *   - Vercel: the edge appends the peer address it saw as the LAST entry.
 * Add hops only if you put additional trusted proxies (e.g. Cloudflare in
 * front of Fly) between the internet and the app, one per appending proxy.
 */
export function getTrustedProxyHops(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = env.MPESA_TRUSTED_PROXY_HOPS;
  if (raw === undefined || raw.trim() === "") return DEFAULT_TRUSTED_PROXY_HOPS;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_XFF_ENTRIES) {
    // Fail CLOSED on nonsense: fall back to the strictest sane value.
    return DEFAULT_TRUSTED_PROXY_HOPS;
  }
  return parsed;
}

/**
 * Determine the client IP from request headers WITHOUT trusting any position a
 * client can control.
 *
 * DEFECT THIS REPLACES: the route read `x-forwarded-for.split(",")[0]` — the
 * FIRST element. In a proxy chain the untrusted client value is PREPENDED and
 * each proxy APPENDS what it actually saw, so element [0] is pure attacker
 * input: `x-forwarded-for: 127.0.0.1` was enough to impersonate Safaricom.
 *
 * Resolution order:
 *   1. A platform-set single-value header, ONLY when the operator has named it
 *      in MPESA_TRUSTED_CLIENT_IP_HEADER. There is deliberately NO default:
 *      a header is trustworthy only if the serving platform overwrites it on
 *      every request, which is a fact about the deployment, not about this
 *      code. Defaulting it to fly-client-ip on a Vercel deploy made it
 *      attacker-controlled and bypassed the whitelist entirely. Only accepted
 *      when it carries ONE value — a comma means it was not platform-written,
 *      so we ignore it and fall through.
 *   2. x-forwarded-for, indexed from the RIGHT by getTrustedProxyHops(): entry
 *      [len - hops] is the oldest entry our own edge vouched for.
 * Anything else — absent header, empty value, chain shorter than the trusted
 * hop count, absurdly long chain, unparseable address — yields null = DENY.
 * We deliberately do NOT fall back to a client-settable x-real-ip.
 */
export function extractTrustedClientIp(
  headers: HeaderReader,
  env: Record<string, string | undefined> = process.env
): ClientIpResult {
  // 1. Platform-set single-value header — OPT-IN ONLY, never defaulted.
  //
  // SECURITY FIX: this previously defaulted to "fly-client-ip". A header is
  // only trustworthy if the serving platform actually writes it AND strips any
  // client-supplied copy. This repository deploys to Vercel (vercel.json is
  // present; there is no fly.toml), where nothing writes or strips
  // fly-client-ip — so the default made the header attacker-controlled, and
  // because it is preferred over x-forwarded-for a request carrying
  //     fly-client-ip: 196.201.214.206
  // passed the production whitelist outright. Verified exploitable before this
  // change: authorizeCallbackIp returned { allowed: true, reason:
  // "safaricom-range" } for exactly that forged header.
  //
  // There is no safe default, because the right header is a property of the
  // deployment and not of this code. So: unset means "do not trust any
  // platform header", and the rightmost-x-forwarded-for path below is used
  // instead — that path is correct on both Vercel and Fly.io, since each
  // appends exactly one entry. Set MPESA_TRUSTED_CLIENT_IP_HEADER only to a
  // header you have confirmed your own platform overwrites on every request.
  const platformHeader = (env.MPESA_TRUSTED_CLIENT_IP_HEADER || "")
    .trim()
    .toLowerCase();

  if (platformHeader) {
    const platformValue = headers.get(platformHeader);
    if (platformValue && !platformValue.includes(",")) {
      const ip = normalizeIp(platformValue);
      if (ip) return { ip, source: platformHeader, reason: "platform-header" };
      return { ip: null, source: platformHeader, reason: "platform-header-unparseable" };
    }
  }

  // 2. x-forwarded-for, counted from the right.
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded || !forwarded.trim()) {
    return { ip: null, source: "x-forwarded-for", reason: "no-trusted-source" };
  }

  const entries = forwarded.split(",").map((e) => e.trim());
  if (entries.length > MAX_XFF_ENTRIES) {
    return { ip: null, source: "x-forwarded-for", reason: "xff-too-many-entries" };
  }

  const hops = getTrustedProxyHops(env);
  const index = entries.length - hops;
  if (index < 0) {
    // Fewer entries than trusted hops: our edge did not write this chain.
    return { ip: null, source: "x-forwarded-for", reason: "xff-shorter-than-trusted-hops" };
  }

  const ip = normalizeIp(entries[index]);
  if (!ip) {
    return { ip: null, source: "x-forwarded-for", reason: "xff-entry-unparseable" };
  }
  return { ip, source: "x-forwarded-for", reason: "xff-trusted-hop" };
}

// ─── Authorization decision ──────────────────────────────────────────────────

export interface CallbackIpDecision {
  allowed: boolean;
  /** Machine-readable reason, safe to log (contains no secrets). */
  reason: string;
  /** The normalized IP the decision was made on, or null. */
  ip: string | null;
}

/**
 * Decide whether a callback from `ip` may be processed. DENY BY DEFAULT.
 *
 * - Unparseable/absent IP → deny, in every environment.
 * - IP inside a Safaricom production range → allow, in every environment.
 * - Anything else → deny, UNLESS insecure local mode is explicitly enabled, in
 *   which case loopback/RFC1918/DigitalOcean/::1 are allowed with a loud warn.
 *
 * Note `environment` no longer grants permissiveness on its own: an
 * accidentally-defaulted "sandbox" cannot weaken this check.
 */
export function authorizeCallbackIp(
  ip: string | null,
  environment: MpesaEnvironment,
  env: Record<string, string | undefined> = process.env
): CallbackIpDecision {
  const normalized = normalizeIp(ip);
  const insecure = environment === "sandbox" && isInsecureCallbackModeEnabled(env);

  if (!normalized) {
    return { allowed: false, reason: "no-usable-client-ip", ip: null };
  }

  if (ipInAnyCidr(normalized, SAFARICOM_IP_RANGES)) {
    return { allowed: true, reason: "safaricom-range", ip: normalized };
  }

  if (insecure) {
    const devAllowed =
      ipInAnyCidr(normalized, DEV_ONLY_IP_RANGES) ||
      DEV_ONLY_IP_LITERALS.includes(normalized);

    if (devAllowed) {
      console.warn(
        "[M-Pesa] INSECURE CALLBACK MODE: accepting non-Safaricom callback from " +
          `${normalized} because MPESA_ALLOW_INSECURE_CALLBACKS=true and ` +
          "MPESA_ENVIRONMENT=sandbox. NEVER set these in production."
      );
      return { allowed: true, reason: "insecure-local-mode", ip: normalized };
    }
    // Even in insecure mode an arbitrary public IP is refused.
    return { allowed: false, reason: "not-whitelisted-insecure-mode", ip: normalized };
  }

  return { allowed: false, reason: "not-whitelisted", ip: normalized };
}

/**
 * Check if an IP address is allowed to send M-Pesa callbacks.
 *
 * Signature preserved for existing importers (see @/lib/payments barrel); this
 * is now a thin wrapper over authorizeCallbackIp, which fails CLOSED. Callers
 * that want a loggable reason should use authorizeCallbackIp directly.
 *
 * @param ip - The client IP, as resolved by extractTrustedClientIp
 * @param environment - Current M-Pesa environment
 * @returns true only if the IP is positively whitelisted
 */
export function isSafaricomIp(ip: string | null, environment: MpesaEnvironment): boolean {
  return authorizeCallbackIp(ip, environment).allowed;
}

// =============================================================================
// 4. CONFIG LOADER
// =============================================================================
// Cached config: loaded once per process lifecycle.
// In serverless (Vercel), this means once per cold start.
// =============================================================================

let _cachedConfig: MpesaConfig | null = null;
let _configError: string | null = null;

/**
 * Load and validate M-Pesa configuration from environment variables.
 *
 * Throws a descriptive error if any required variable is missing or invalid.
 * Config is cached after first successful load.
 *
 * @returns Validated MpesaConfig object
 * @throws Error with specific validation message
 */
export function getMpesaConfig(): MpesaConfig {
  if (_cachedConfig) {
    return _cachedConfig;
  }

  if (_configError) {
    throw new Error(_configError);
  }

  // Determine environment: explicit MPESA_ENVIRONMENT > NEXT_PUBLIC_APP_ENV > default "sandbox"
  //
  // SECURITY NOTE (part of the SEV-0 fail-open fix): this default used to be
  // load-bearing for authentication, because isSafaricomIp() allowed ANY IP
  // when environment === "sandbox". It no longer is. authorizeCallbackIp()
  // grants nothing on the strength of this value: the only permissive path
  // additionally requires MPESA_ALLOW_INSECURE_CALLBACKS=true and an
  // explicitly-set MPESA_ENVIRONMENT=sandbox read straight from process.env,
  // so a value that merely *defaulted* to "sandbox" cannot weaken the IP
  // check. The default is kept only so local dev can derive a baseUrl.
  const rawEnv =
    process.env.MPESA_ENVIRONMENT ||
    (process.env.NEXT_PUBLIC_APP_ENV === "production" ? "production" : "sandbox");

  const rawConfig = {
    consumerKey: process.env.MPESA_CONSUMER_KEY ?? "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? "",
    passkey: process.env.MPESA_PASSKEY ?? "",
    shortcode: process.env.MPESA_SHORTCODE ?? "",
    callbackUrl: process.env.MPESA_CALLBACK_URL ?? "",
    environment: rawEnv,
  };

  const result = MpesaConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const message =
      `[M-Pesa] Configuration validation failed:\n${issues}\n\n` +
      "See docs/MPESA_SETUP.md for setup instructions.";
    _configError = message;
    throw new Error(message);
  }

  const environment = result.data.environment;

  _cachedConfig = {
    ...result.data,
    baseUrl: DARAJA_URLS[environment],
  };

  return _cachedConfig;
}

/**
 * Reset the config cache. Used only for testing.
 */
export function resetConfigCache(): void {
  _cachedConfig = null;
  _configError = null;
}

// =============================================================================
// 5. HEALTH CHECK
// =============================================================================

export interface MpesaHealthStatus {
  configured: boolean;
  environment: MpesaEnvironment | null;
  baseUrl: string | null;
  shortcode: string | null;
  callbackUrl: string | null;
  /** Whether OAuth token can be acquired (tests network + credentials). */
  tokenAcquirable: boolean;
  tokenError: string | null;
  /** Redacted credentials status (never expose actual values). */
  credentials: {
    consumerKey: "set" | "missing";
    consumerSecret: "set" | "missing";
    passkey: "set" | "missing";
    shortcode: "set" | "missing";
    callbackUrl: "set" | "missing";
    environment: string;
  };
  timestamp: string;
}

/**
 * Run a comprehensive health check on the M-Pesa configuration.
 *
 * This verifies:
 *   1. All env vars are present and valid
 *   2. OAuth token can be acquired from Daraja (tests credentials + network)
 *
 * Safe to call: never exposes actual credential values.
 */
export async function checkMpesaHealth(): Promise<MpesaHealthStatus> {
  const credentialStatus = {
    consumerKey: process.env.MPESA_CONSUMER_KEY ? "set" as const : "missing" as const,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET ? "set" as const : "missing" as const,
    passkey: process.env.MPESA_PASSKEY ? "set" as const : "missing" as const,
    shortcode: process.env.MPESA_SHORTCODE ? "set" as const : "missing" as const,
    callbackUrl: process.env.MPESA_CALLBACK_URL ? "set" as const : "missing" as const,
    environment: process.env.MPESA_ENVIRONMENT || process.env.NEXT_PUBLIC_APP_ENV || "sandbox",
  };

  let config: MpesaConfig | null = null;
  let configured = false;

  try {
    config = getMpesaConfig();
    configured = true;
  } catch {
    // Config validation failed — continue to report partial status
  }

  // Test OAuth token acquisition if configured
  let tokenAcquirable = false;
  let tokenError: string | null = null;

  if (configured && config) {
    try {
      const credentials = Buffer.from(
        `${config.consumerKey}:${config.consumerSecret}`
      ).toString("base64");

      const response = await fetch(
        `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          method: "GET",
          headers: { Authorization: `Basic ${credentials}` },
          cache: "no-store",
          signal: AbortSignal.timeout(10_000), // 10s timeout
        }
      );

      if (response.ok) {
        const data = await response.json();
        tokenAcquirable = !!data.access_token;
        if (!tokenAcquirable) {
          tokenError = "Response did not contain access_token";
        }
      } else {
        const text = await response.text();
        tokenError = `HTTP ${response.status}: ${text.slice(0, 200)}`;
      }
    } catch (err) {
      tokenError =
        err instanceof Error ? err.message : "Network error during OAuth";
    }
  }

  return {
    configured,
    environment: config?.environment ?? null,
    baseUrl: config?.baseUrl ?? null,
    shortcode: config?.shortcode ?? null,
    callbackUrl: config?.callbackUrl ?? null,
    tokenAcquirable,
    tokenError,
    credentials: credentialStatus,
    timestamp: new Date().toISOString(),
  };
}
