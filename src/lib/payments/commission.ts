// =============================================================================
// MITASAFI: COMMISSION CALCULATION (M6)
// =============================================================================
// Calculates platform commission for a given transaction amount.
//
// Commission model:
//   - Flat rate, expressed in INTEGER BASIS POINTS (1000 bps = 10.00%)
//   - Subject to a minimum fee, an optional maximum fee (null = no cap), and an
//     optional minimum job amount below which no commission is charged
//   - Effective-dated and versioned in the `commission_config` table; the values
//     below are a compiled-in FALLBACK that mirrors the seeded row exactly
//
// ---------------------------------------------------------------------------
// ARITHMETIC CONTRACT (this is live money — read before changing anything)
// ---------------------------------------------------------------------------
//  1. Every calculation happens in INTEGER CENTS. Floats are never multiplied
//     to produce money. The previous implementation did
//     `Math.round(totalAmount * rate * 100) / 100`, which evaluated
//     640.55 * 0.10 * 100 as 6405.499999999999 and therefore charged ONE CENT
//     LESS than exact half-up rounding for 13,005 amounts between KES 640.55
//     and KES 49,151.45 (verified by sweeping 15,000,000 inputs). Every
//     divergence was in the platform's disfavour and occurred only at exact
//     decimal ties (amounts whose 10% lands on a half cent).
//  2. Rounding is explicit HALF-UP on integer cents (see divRoundHalfUp).
//  3. platformFeeCents + providerAmountCents === totalCents, always, by
//     construction (the provider amount is a subtraction, never a second
//     rounding).
//  4. The .platformFee / .providerAmount fields are cents/100 for display and
//     for the DECIMAL(12,2) columns. NEVER compare those with === against a
//     float sum: a float equality check on fee + provider === total fails for
//     1,405,926 of 15,000,000 inputs even though the cents always agree.
//     Assert on the *Cents fields instead.
//
// Example (1000 bps, KES 50 min, KES 5,000 max):
//   KES 300    -> fee = KES 50 (hits minimum)
//   KES 1,000  -> fee = KES 100
//   KES 640.55 -> fee = KES 64.06 (exact half-up; the old code said 64.05)
//   KES 80,000 -> fee = KES 5,000 (hits maximum)
// =============================================================================

import type { CommissionConfig, CommissionConfigRow } from "@/types/payments";

// =============================================================================
// FALLBACK COMMISSION CONFIG
// =============================================================================
// The authoritative config lives in `commission_config` (see
// supabase/migrations/20260321000000_commission_config.sql). This object is the
// fallback used when a caller has no DB handle (e.g. a pure display path) and
// MUST stay byte-for-byte equivalent to the seeded version-1 row:
//   rate_bps 1000, min_fee_cents 5000, max_fee_cents 500000,
//   min_job_amount_cents 0, currency KES.
// Changing pricing is a one-row INSERT into commission_config, NOT a code edit.

export const FALLBACK_COMMISSION_CONFIG: CommissionConfig = {
  /** No DB row backs the fallback. */
  id: null,
  /** Config version of the seeded row this fallback mirrors. */
  version: 1,
  /** Scope key this config applies to. */
  scope: "global",
  /** 1000 bps = 10.00% platform commission. */
  rateBps: 1000,
  /** Minimum fee of KES 50.00 per transaction, in cents. */
  minimumFeeCents: 5000,
  /** Maximum fee of KES 5,000.00 per transaction, in cents. null = no cap. */
  maximumFeeCents: 500000,
  /** Jobs below this amount are not commissioned. 0 = no threshold (current behaviour). */
  minJobAmountCents: 0,
  /** Currency. */
  currency: "KES",
};

/** Name of the SQL function that returns the active config row. */
export const COMMISSION_CONFIG_RPC = "commission_config_active";

// =============================================================================
// INTEGER-CENT PRIMITIVES
// =============================================================================

/** Largest amount (in major units) we accept; keeps cents inside 2^53. */
const MAX_MAJOR_UNITS = 9e13;

/**
 * Convert a major-unit money amount (KES) to integer cents, exactly.
 *
 * Works off the shortest round-trip decimal string rather than multiplying by
 * 100, so no float multiplication is involved. Exact for every value with two
 * decimal places (which is what DECIMAL(12,2) columns produce); inputs with
 * more precision are rounded HALF-UP to the cent.
 */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`commission: amount is not a finite number: ${amount}`);
  }
  const negative = amount < 0;
  const abs = Math.abs(amount);
  if (abs > MAX_MAJOR_UNITS) {
    throw new RangeError(`commission: amount out of safe range: ${amount}`);
  }

  let text = String(abs);
  if (text.includes("e") || text.includes("E")) {
    // Exponential notation only appears below 1e-6 here (the upper end is
    // rejected above), i.e. sub-cent dust. Expand it to plain decimal.
    text = abs.toFixed(4);
  }

  const dot = text.indexOf(".");
  const whole = dot === -1 ? text : text.slice(0, dot);
  const frac = dot === -1 ? "" : text.slice(dot + 1);
  const fracPadded = `${frac}000`;

  let cents = Number(`${whole}${fracPadded.slice(0, 2)}`);
  // Half-up on the first discarded digit. (A digit >= 5 there means the
  // remainder is >= half a cent, whatever follows it.)
  if (fracPadded.charCodeAt(2) >= 53 /* '5' */) cents += 1;

  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`commission: amount not representable in cents: ${amount}`);
  }
  return negative ? -cents : cents;
}

/** Convert integer cents back to major units for display / DECIMAL(12,2) columns. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Integer division with explicit HALF-UP rounding. Both arguments must be
 * non-negative safe integers and `denominator` must be > 0.
 *
 * The floor is computed and then corrected, so a float division that rounds to
 * an integer boundary cannot shift the result.
 */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new RangeError(`commission: non-integer division (${numerator}/${denominator})`);
  }
  if (denominator <= 0) {
    throw new RangeError(`commission: non-positive denominator (${denominator})`);
  }
  let q = Math.floor(numerator / denominator);
  let r = numerator - q * denominator;
  while (r < 0) {
    q -= 1;
    r += denominator;
  }
  while (r >= denominator) {
    q += 1;
    r -= denominator;
  }
  return r * 2 >= denominator ? q + 1 : q;
}

// =============================================================================
// CALCULATION
// =============================================================================

export interface CommissionBreakdown {
  /** Total amount the customer pays. */
  totalAmount: number;
  /** Platform's commission fee. */
  platformFee: number;
  /** Net amount the provider receives. */
  providerAmount: number;
  /** Commission rate applied (as decimal, 4dp — display only). */
  effectiveRate: number;
  /** Currency code. */
  currency: string;

  // --- exact integer-cent values; use these for any assertion or comparison ---
  /** Total in integer cents. */
  totalCents: number;
  /** Platform fee in integer cents. */
  platformFeeCents: number;
  /** Provider net in integer cents. Always totalCents - platformFeeCents. */
  providerAmountCents: number;

  // --- forensic snapshot of the config that produced this breakdown ---
  /** commission_config.id, or null when the compiled-in fallback was used. */
  configId: string | null;
  /** Rate actually applied, in basis points. */
  rateBps: number;
  /** Minimum fee actually applied, in cents. */
  minimumFeeCents: number;
  /** Maximum fee actually applied, in cents; null = no cap. */
  maximumFeeCents: number | null;
  /** Minimum job amount actually applied, in cents. */
  minJobAmountCents: number;
}

/**
 * Commission fee for a total, entirely in integer cents.
 *
 * Mirrors public.commission_fee_cents() in SQL exactly — the order of the
 * clamps is part of the contract and the two implementations are checked
 * against each other by a differential test. Keep them in lockstep.
 */
export function commissionFeeCents(
  totalCents: number,
  config: CommissionConfig = FALLBACK_COMMISSION_CONFIG
): number {
  if (!Number.isSafeInteger(totalCents)) {
    throw new RangeError(`commission: totalCents must be an integer (${totalCents})`);
  }
  if (totalCents <= 0) return 0;

  // Configurable minimum job amount. 0 (the seeded value) is a no-op, so
  // current behaviour is preserved exactly. Raising it is an owner decision.
  if (totalCents < config.minJobAmountCents) return 0;

  // Explicit overflow guard. totalCents * rateBps must stay inside 2^53 for the
  // integer arithmetic below to be exact. At 1000 bps that is ~KES 90 billion,
  // far beyond the DECIMAL(12,2) column domain (max KES 9,999,999,999.99), so
  // this cannot fire for a real booking. If it ever does, refusing loudly is
  // the only safe answer: a silently wrong fee is worse than a failed payment.
  const feeNumerator = totalCents * config.rateBps;
  if (!Number.isSafeInteger(feeNumerator)) {
    throw new RangeError(
      `commission: ${totalCents} cents at ${config.rateBps} bps exceeds exact integer arithmetic`
    );
  }

  let fee = divRoundHalfUp(feeNumerator, 10_000);

  // Minimum fee.
  if (fee < config.minimumFeeCents) fee = config.minimumFeeCents;

  // Maximum fee. null = no cap (never a 0 sentinel: 0 means "cap at zero").
  if (config.maximumFeeCents !== null && fee > config.maximumFeeCents) {
    fee = config.maximumFeeCents;
  }

  // The fee can never exceed what the customer paid.
  if (fee > totalCents) fee = totalCents;

  return fee;
}

/**
 * Calculate commission breakdown for a given total amount.
 *
 * @param totalAmount - The agreed price for the booking (what customer pays).
 * @param config - Optional commission config. Uses the fallback if omitted;
 *                 pass the active DB config (see loadCommissionConfig) on any
 *                 path that writes money.
 * @returns Breakdown with fee splitting.
 *
 * @example
 * calculateCommission(1000);
 * // -> { totalAmount: 1000, platformFee: 100, providerAmount: 900, ... }
 */
export function calculateCommission(
  totalAmount: number,
  config: CommissionConfig = FALLBACK_COMMISSION_CONFIG
): CommissionBreakdown {
  const snapshot = {
    configId: config.id,
    rateBps: config.rateBps,
    minimumFeeCents: config.minimumFeeCents,
    maximumFeeCents: config.maximumFeeCents,
    minJobAmountCents: config.minJobAmountCents,
  };

  const totalCents = totalAmount > 0 ? toCents(totalAmount) : 0;

  if (totalCents <= 0) {
    return {
      totalAmount: 0,
      platformFee: 0,
      providerAmount: 0,
      effectiveRate: 0,
      currency: config.currency,
      totalCents: 0,
      platformFeeCents: 0,
      providerAmountCents: 0,
      ...snapshot,
    };
  }

  const platformFeeCents = commissionFeeCents(totalCents, config);
  // Subtraction, not a second rounding: the parts cannot drift from the total.
  const providerAmountCents = totalCents - platformFeeCents;

  return {
    totalAmount: fromCents(totalCents),
    platformFee: fromCents(platformFeeCents),
    providerAmount: fromCents(providerAmountCents),
    effectiveRate: divRoundHalfUp(platformFeeCents * 10_000, totalCents) / 10_000,
    currency: config.currency,
    totalCents,
    platformFeeCents,
    providerAmountCents,
    ...snapshot,
  };
}

// =============================================================================
// CONFIG LOADING
// =============================================================================

/**
 * Get a commission configuration synchronously.
 *
 * Returns the compiled-in fallback, which mirrors the seeded `commission_config`
 * row. Use this only on display paths that have no DB handle; money-writing
 * paths must use loadCommissionConfig() so the row id can be snapshotted onto
 * the payment.
 */
export function getCommissionConfig(): CommissionConfig {
  return { ...FALLBACK_COMMISSION_CONFIG };
}

/** Map a `commission_config` row (snake_case, from PostgREST/RPC) to the app type. */
export function commissionConfigFromRow(row: CommissionConfigRow): CommissionConfig {
  const requireInt = (value: unknown, field: string): number => {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isInteger(n)) {
      throw new TypeError(`commission_config.${field} is not an integer: ${String(value)}`);
    }
    return n;
  };

  const maxFee =
    row.max_fee_cents === null || row.max_fee_cents === undefined
      ? null
      : requireInt(row.max_fee_cents, "max_fee_cents");

  return {
    id: row.id,
    version: requireInt(row.version, "version"),
    scope: row.scope,
    rateBps: requireInt(row.rate_bps, "rate_bps"),
    minimumFeeCents: requireInt(row.min_fee_cents, "min_fee_cents"),
    maximumFeeCents: maxFee,
    minJobAmountCents: requireInt(row.min_job_amount_cents, "min_job_amount_cents"),
    currency: row.currency,
  };
}

/** Minimal structural shape of a Supabase client; avoids importing server-only code here. */
export interface CommissionConfigSource {
  rpc(
    fn: string,
    args?: Record<string, unknown>
  ): PromiseLike<{ data: unknown; error: unknown }>;
}

export interface LoadedCommissionConfig {
  config: CommissionConfig;
  /** true when the DB lookup failed or returned nothing and the fallback was used. */
  usedFallback: boolean;
  /** Why the fallback was used, when it was. */
  reason?: string;
}

/**
 * Load the active commission config from the database.
 *
 * Never throws and never blocks a payment: on any failure it returns the
 * compiled-in fallback (identical to the seeded row) with usedFallback = true,
 * so callers can log and carry on with unchanged pricing. Callers that write
 * money should record `config.id` on the payment row — a null id means the
 * fallback priced the booking and should be alerted on.
 */
export async function loadCommissionConfig(
  source: CommissionConfigSource,
  options: { scope?: string; currency?: string; at?: Date } = {}
): Promise<LoadedCommissionConfig> {
  const fallback = getCommissionConfig();
  try {
    const { data, error } = await source.rpc(COMMISSION_CONFIG_RPC, {
      p_scope: options.scope ?? fallback.scope,
      p_currency: options.currency ?? fallback.currency,
      p_at: (options.at ?? new Date()).toISOString(),
    });

    if (error) {
      return { config: fallback, usedFallback: true, reason: String(error) };
    }

    const row = (Array.isArray(data) ? data[0] : data) as CommissionConfigRow | null | undefined;
    if (!row || typeof row !== "object" || row.id === undefined) {
      return { config: fallback, usedFallback: true, reason: "no active commission_config row" };
    }

    return { config: commissionConfigFromRow(row), usedFallback: false };
  } catch (err) {
    return {
      config: fallback,
      usedFallback: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Format a config's rate for UI, e.g. 1000 -> "10%", 1250 -> "12.5%".
 *
 * Exists so that no component has to hardcode the rate. Trailing zeros are
 * trimmed so the common whole-percent case renders exactly as before.
 */
export function formatCommissionRate(
  config: CommissionConfig = FALLBACK_COMMISSION_CONFIG
): string {
  const whole = Math.trunc(config.rateBps / 100);
  const hundredths = config.rateBps % 100;
  if (hundredths === 0) return `${whole}%`;
  const decimals = hundredths % 10 === 0 ? String(hundredths / 10) : String(hundredths).padStart(2, "0");
  return `${whole}.${decimals}%`;
}

/** Format a cent amount as major units with two decimals, e.g. 6406 -> "64.06". */
export function formatCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const major = Math.trunc(abs / 100);
  const minor = abs - major * 100;
  return `${negative ? "-" : ""}${major}.${String(minor).padStart(2, "0")}`;
}
