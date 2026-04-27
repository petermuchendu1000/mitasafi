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
// 3. SAFARICOM IP WHITELIST
// =============================================================================
// Safaricom publishes the IP ranges from which Daraja callbacks originate.
// This list should be periodically verified against:
//   https://developer.safaricom.co.ke/Documentation
//
// Last verified: 2026-03-03
//
// Note: In sandbox mode, we allow all IPs for local testing convenience.
// In production, requests are validated against this whitelist.
// =============================================================================

const SAFARICOM_IP_RANGES: readonly string[] = [
  // Safaricom Daraja production callback IPs
  "196.201.214.",    // 196.201.214.0/24
  "196.201.213.",    // 196.201.213.0/24
  "196.201.212.",    // 196.201.212.0/24
  "104.248.",        // DigitalOcean — Safaricom sandbox may route through these
  "192.168.",        // Local/test only
  "127.0.0.",        // Localhost
  "::1",             // IPv6 localhost
  "::ffff:127.0.0.", // IPv6-mapped localhost
] as const;

/**
 * Check if an IP address is in the Safaricom callback whitelist.
 *
 * Behavior by environment:
 *   - sandbox:    Always returns true (allows any IP for testing)
 *   - production: Validates against known Safaricom IP ranges
 *
 * @param ip - The request IP address (from x-forwarded-for or socket)
 * @param environment - Current M-Pesa environment
 * @returns true if the IP is allowed to send callbacks
 */
export function isSafaricomIp(ip: string | null, environment: MpesaEnvironment): boolean {
  // Sandbox: allow all IPs for testing
  if (environment === "sandbox") {
    return true;
  }

  // Production: enforce whitelist
  if (!ip) {
    return false;
  }

  // Normalize: strip IPv6-mapped prefix
  const normalizedIp = ip.replace(/^::ffff:/, "");

  return SAFARICOM_IP_RANGES.some((range) => normalizedIp.startsWith(range));
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
