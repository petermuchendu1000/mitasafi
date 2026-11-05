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

import type {
  CommissionBand,
  CommissionBandRow,
  CommissionConfig,
  CommissionConfigRow,
} from "@/types/payments";

// =============================================================================
// FALLBACK COMMISSION CONFIG
// =============================================================================
// The authoritative config lives in `commission_config`. This object is the
// fallback used when a caller has no DB handle (e.g. a pure display path) and
// MUST mirror the CURRENTLY ACTIVE seeded row, which is version 2 from
// supabase/migrations/20260328000000_flat_rate_no_fee_floor.sql:
//   rate_bps 1000, min_fee_cents 0, max_fee_cents 500000,
//   min_job_amount_cents 0, currency KES.
// A test parses that migration and fails if the two ever drift.
// Changing pricing is a one-row INSERT into commission_config, NOT a code edit.

export const FALLBACK_COMMISSION_CONFIG: CommissionConfig = {
  /** No DB row backs the fallback. */
  id: null,
  /** Config version of the seeded row this fallback mirrors. */
  version: 3,
  /** Scope key this config applies to. */
  scope: "global",
  /** 1000 bps = 10.00% platform commission. */
  rateBps: 1000,
  /**
   * NO fee floor.
   *
   * This was KES 50, which made the platform's share 100% of a KES 50 job and
   * half of a KES 100 job. That excluded the micro-providers the platform
   * exists to serve -- boda boda riders and mama mboga vendors, whose jobs are
   * routinely KES 20 to KES 300 -- because no one accepts a job that pays them
   * nothing. With no floor the fee is at most 10% of the job, so 90% always
   * reaches the provider, and the advertised "10%" is true at every price.
   */
  minimumFeeCents: 0,
  /**
   * NO CAP.
   *
   * This was KES 5,000. With declining bands the cap is not merely redundant
   * but harmful: it begins biting inside the 7% band at KES 71,429 and makes
   * the 5% band unreachable, so a KES 1,000,000 job would pay 0.5%. The 5%
   * band is the large-job protection now. Owner decision, 2026-11-05.
   */
  maximumFeeCents: null,
  /**
   * NO minimum job value: a KES 20 job is welcome.
   *
   * The mechanism is retained rather than removed. commissionFeeCents() charges
   * no commission below this threshold, and the database trigger
   * 00_enforce_minimum_job_value refuses to quote or agree a price below it --
   * both inert at 0. Introducing a minimum later is one INSERT into
   * commission_config, and no minimum can be configured without being enforced.
   *
   * Note the two meanings are NOT the same: the config value means "charge no
   * commission below this", while the trigger is what makes it "disallow jobs
   * below this". Setting the value alone would make small jobs commission-free
   * rather than disallowed.
   */
  minJobAmountCents: 0,
  /** Currency. */
  currency: "KES",
  /**
   * Owner-approved declining schedule, flat-by-band. Mirrors the five rows
   * seeded against v3 in
   * supabase/migrations/20260341000000_commission_bands.sql; a test parses
   * that migration and fails if the two drift.
   *
   * Bounds are in CENTS and contiguous, so KES 999.99 is still 15% and
   * KES 1,000.00 is the first value at 12%.
   */
  bands: [
    { minJobCents: 0, maxJobCents: 99_999, rateBps: 1500 },
    { minJobCents: 100_000, maxJobCents: 499_999, rateBps: 1200 },
    { minJobCents: 500_000, maxJobCents: 1_999_999, rateBps: 1000 },
    { minJobCents: 2_000_000, maxJobCents: 9_999_999, rateBps: 700 },
    { minJobCents: 10_000_000, maxJobCents: null, rateBps: 500 },
  ],
};

/**
 * The rate that applies to a job, in basis points.
 *
 * Mirrors the band lookup in public.commission_breakdown() exactly, including
 * its COALESCE: a config with no bands, or a value that falls in no band,
 * uses the config's own flat rate rather than returning nothing. A gap can
 * therefore never price a job at zero. The seeded schedule is asserted
 * contiguous by the migration and by a test, so the fallback is unreachable
 * in practice.
 */
export function resolveBandRateBps(
  totalCents: number,
  config: CommissionConfig,
): number {
  for (const b of config.bands ?? []) {
    if (
      totalCents >= b.minJobCents &&
      (b.maxJobCents === null || totalCents <= b.maxJobCents)
    ) {
      return b.rateBps;
    }
  }
  return config.rateBps;
}

/** The minimum job value in major units (KES), for validation and display. */
export function minimumJobAmount(
  config: CommissionConfig = FALLBACK_COMMISSION_CONFIG,
): number {
  return config.minJobAmountCents / 100;
}

/**
 * Whether a proposed job total is allowed.
 *
 * A total exactly equal to the minimum is allowed: at KES 500 the fee is
 * exactly 10%, which is why 500 was chosen.
 */
export function isJobValueAllowed(
  totalAmount: number,
  config: CommissionConfig = FALLBACK_COMMISSION_CONFIG,
): boolean {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return false;
  return toCents(totalAmount) >= config.minJobAmountCents;
}

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
    throw new RangeError(
      `commission: amount is not a finite number: ${amount}`,
    );
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
    throw new RangeError(
      `commission: amount not representable in cents: ${amount}`,
    );
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
    throw new RangeError(
      `commission: non-integer division (${numerator}/${denominator})`,
    );
  }
  if (denominator <= 0) {
    throw new RangeError(
      `commission: non-positive denominator (${denominator})`,
    );
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
  config: CommissionConfig = FALLBACK_COMMISSION_CONFIG,
): number {
  if (!Number.isSafeInteger(totalCents)) {
    throw new RangeError(
      `commission: totalCents must be an integer (${totalCents})`,
    );
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
      `commission: ${totalCents} cents at ${config.rateBps} bps exceeds exact integer arithmetic`,
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
  config: CommissionConfig = FALLBACK_COMMISSION_CONFIG,
): CommissionBreakdown {
  const totalCents = totalAmount > 0 ? toCents(totalAmount) : 0;

  // The band is resolved BEFORE the snapshot, because
  // src/lib/services/payments.ts:241 writes snapshot.rateBps into
  // booking_payments.commission_rate_bps as the forensic record of what was
  // actually charged. Recording the config's fallback rate there instead of
  // the band that priced the job would make every historical fee
  // irreproducible.
  const effectiveRateBps = resolveBandRateBps(totalCents, config);

  const snapshot = {
    configId: config.id,
    rateBps: effectiveRateBps,
    minimumFeeCents: config.minimumFeeCents,
    maximumFeeCents: config.maximumFeeCents,
    minJobAmountCents: config.minJobAmountCents,
  };

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

  // The arithmetic is untouched; only the rate handed to it changes.
  const platformFeeCents = commissionFeeCents(totalCents, {
    ...config,
    rateBps: effectiveRateBps,
  });
  // Subtraction, not a second rounding: the parts cannot drift from the total.
  const providerAmountCents = totalCents - platformFeeCents;

  return {
    totalAmount: fromCents(totalCents),
    platformFee: fromCents(platformFeeCents),
    providerAmount: fromCents(providerAmountCents),
    effectiveRate:
      divRoundHalfUp(platformFeeCents * 10_000, totalCents) / 10_000,
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
export function commissionConfigFromRow(
  row: CommissionConfigRow,
  bandRows: CommissionBandRow[] = [],
): CommissionConfig {
  const requireInt = (value: unknown, field: string): number => {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isInteger(n)) {
      throw new TypeError(
        `commission_config.${field} is not an integer: ${String(value)}`,
      );
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
    minJobAmountCents: requireInt(
      row.min_job_amount_cents,
      "min_job_amount_cents",
    ),
    currency: row.currency,
    bands: bandRows
      .map(
        (b): CommissionBand => ({
          minJobCents: requireInt(b.min_job_cents, "min_job_cents"),
          maxJobCents:
            b.max_job_cents === null || b.max_job_cents === undefined
              ? null
              : requireInt(b.max_job_cents, "max_job_cents"),
          rateBps: requireInt(b.rate_bps, "rate_bps"),
        }),
      )
      .sort((x, y) => x.minJobCents - y.minJobCents),
  };
}

/** RPC that returns the bands of the active config. */
export const COMMISSION_BANDS_RPC = "commission_bands_active";

/** Minimal structural shape of a Supabase client; avoids importing server-only code here. */
export interface CommissionConfigSource {
  rpc(
    fn: string,
    args?: Record<string, unknown>,
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
  options: { scope?: string; currency?: string; at?: Date } = {},
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

    const row = (Array.isArray(data) ? data[0] : data) as
      | CommissionConfigRow
      | null
      | undefined;
    if (!row || typeof row !== "object" || row.id === undefined) {
      return {
        config: fallback,
        usedFallback: true,
        reason: "no active commission_config row",
      };
    }

    // The bands are not optional decoration: without them every job prices at
    // the config's flat rate, which for a KES 300 job is 10% instead of 15%.
    // So a bands failure is treated exactly like a config failure -- fall back
    // WHOLE, rather than combining a real config id with the wrong schedule
    // and recording that pairing on a payment row.
    const bandsResult = await source.rpc(COMMISSION_BANDS_RPC, {
      p_scope: options.scope ?? fallback.scope,
      p_currency: options.currency ?? fallback.currency,
      p_at: (options.at ?? new Date()).toISOString(),
    });

    if (bandsResult.error) {
      return {
        config: fallback,
        usedFallback: true,
        reason: `commission_bands_active failed: ${String(bandsResult.error)}`,
      };
    }

    const bandRows = (bandsResult.data ?? []) as CommissionBandRow[];
    if (!Array.isArray(bandRows) || bandRows.length === 0) {
      return {
        config: fallback,
        usedFallback: true,
        reason: "active commission_config has no bands",
      };
    }

    return {
      config: commissionConfigFromRow(row, bandRows),
      usedFallback: false,
    };
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
  config: CommissionConfig = FALLBACK_COMMISSION_CONFIG,
): string {
  // With a banded schedule a single number is a misrepresentation: the
  // earnings page renders this as "Platform commission: X on each completed
  // job", and config.rateBps is only the fallback, not what anyone is
  // charged. Show the range the bands actually span.
  const bands = config.bands ?? [];
  if (bands.length > 0) {
    const rates = bands.map((b) => b.rateBps);
    const lo = Math.min(...rates);
    const hi = Math.max(...rates);
    return lo === hi
      ? formatBps(lo)
      : `${formatBps(lo).replace("%", "")}–${formatBps(hi)}`;
  }
  return formatBps(config.rateBps);
}

/** One rate in basis points as a percentage string, trailing zeros trimmed. */
function formatBps(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const hundredths = bps % 100;
  if (hundredths === 0) return `${whole}%`;
  const decimals =
    hundredths % 10 === 0
      ? String(hundredths / 10)
      : String(hundredths).padStart(2, "0");
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
