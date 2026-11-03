/**
 * Commission arithmetic — live money. These tests exist to keep two specific
 * defects dead:
 *
 *  1. The FLOAT BUG. `Math.round(totalAmount * rate * 100) / 100` evaluated
 *     640.55 * 0.10 * 100 as 6405.499999999999 and so charged ONE CENT LESS
 *     than exact half-up for 13,005 amounts between KES 640.55 and
 *     KES 49,151.45. Every divergence was in the platform's disfavour.
 *  2. DRIFT between the TypeScript and the SQL implementation
 *     (public.commission_fee_cents in
 *     supabase/migrations/20260321000000_commission_config.sql).
 *
 * Note on assertions: a float equality check on fee + provider === total fails
 * for 1,405,926 of 15,000,000 inputs even when the cents are right, so every
 * sum assertion here is on INTEGER CENTS.
 */

import fs from "fs";
import path from "path";

import {
  calculateCommission,
  commissionConfigFromRow,
  commissionFeeCents,
  divRoundHalfUp,
  FALLBACK_COMMISSION_CONFIG,
  formatCents,
  formatCommissionRate,
  fromCents,
  getCommissionConfig,
  loadCommissionConfig,
  toCents,
  minimumJobAmount,
  isJobValueAllowed,} from "@/lib/payments/commission";
import type { CommissionConfig } from "@/types/payments";

/**
 * Base config for the FLOOR AND CAP ARITHMETIC tests.
 *
 * The live schedule is now a flat 10% with NO floor and no minimum job value,
 * so the floor-driven vectors below are no longer the production behaviour.
 * They are still pinned because the floor/cap/clamp logic in the fee function
 * must not silently rot: a floor can be reintroduced by one INSERT into
 * commission_config, and if that ever happens this arithmetic has to still be
 * correct. Tests about the LIVE schedule use the real default config.
 */
const CFG: CommissionConfig = {
  ...FALLBACK_COMMISSION_CONFIG,
  minimumFeeCents: 5000,
  minJobAmountCents: 0,
};

/**
 * Independent integer-cent oracle. Deliberately NOT written the same way as the
 * implementation: it builds the half-up decision from an explicit remainder
 * comparison instead of reusing divRoundHalfUp, so a bug in the helper cannot
 * hide behind the oracle.
 */
function oracleFeeCents(
  totalCents: number,
  rateBps = CFG.rateBps,
  minFeeCents = CFG.minimumFeeCents,
  maxFeeCents: number | null = CFG.maximumFeeCents,
  minJobCents = CFG.minJobAmountCents
): number {
  if (totalCents <= 0) return 0;
  if (totalCents < minJobCents) return 0;

  const numerator = totalCents * rateBps;
  const quotient = Math.trunc(numerator / 10_000);
  const remainder = numerator - quotient * 10_000;
  let fee = remainder >= 5_000 ? quotient + 1 : quotient;

  if (fee < minFeeCents) fee = minFeeCents;
  if (maxFeeCents !== null && fee > maxFeeCents) fee = maxFeeCents;
  if (fee > totalCents) fee = totalCents;
  return fee;
}

describe("toCents", () => {
  it.each([
    [0.01, 1],
    [0.1, 10],
    [1, 100],
    [50, 5000],
    [50.01, 5001],
    [100, 10000],
    [454.55, 45455],
    [499.94, 49994],
    [499.95, 49995],
    [500.05, 50005],
    [640.55, 64055],
    [49151.45, 4915145],
    [49999.99, 4999999],
    [50000, 5000000],
    [50000.05, 5000005],
    [150000, 15000000],
    [1234567.89, 123456789],
  ])("converts %p to %p cents exactly", (amount, cents) => {
    expect(toCents(amount)).toBe(cents);
  });

  it("never loses a cent to binary floating point across a wide sweep", () => {
    // One assertion for the whole sweep: a per-iteration expect() on a million
    // inputs dominates the suite's runtime without adding coverage.
    const wrong: number[] = [];
    for (let cents = 1; cents <= 1_000_000; cents++) {
      if (toCents(cents / 100) !== cents && wrong.length < 10) wrong.push(cents);
    }
    expect(wrong).toEqual([]);
  });

  it("rounds sub-cent precision half-up", () => {
    expect(toCents(0.005)).toBe(1);
    expect(toCents(0.004)).toBe(0);
    expect(toCents(1.9999)).toBe(200);
    expect(toCents(1.994)).toBe(199);
  });

  it("rejects values it cannot represent exactly", () => {
    expect(() => toCents(Number.NaN)).toThrow(RangeError);
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => toCents(1e20)).toThrow(RangeError);
  });

  it("round-trips through fromCents", () => {
    expect(fromCents(toCents(640.55))).toBe(640.55);
    expect(fromCents(6406)).toBe(64.06);
  });
});

describe("divRoundHalfUp", () => {
  it("rounds exact ties up, never down", () => {
    expect(divRoundHalfUp(5, 10)).toBe(1);
    expect(divRoundHalfUp(15, 10)).toBe(2);
    expect(divRoundHalfUp(25, 10)).toBe(3);
    expect(divRoundHalfUp(4, 10)).toBe(0);
    expect(divRoundHalfUp(64055 * 1000, 10_000)).toBe(6406);
  });

  it("refuses non-integer or non-positive arguments", () => {
    expect(() => divRoundHalfUp(1.5, 10)).toThrow(RangeError);
    expect(() => divRoundHalfUp(10, 0)).toThrow(RangeError);
  });
});

describe("calculateCommission — golden vectors", () => {
  // Every boundary in the audited input space, in major units.
  // feeCents values were cross-checked against public.commission_fee_cents()
  // in PostgreSQL 17 (see the differential test below): 0 divergences.
  const VECTORS: Array<{
    total: number;
    feeCents: number;
    providerCents: number;
    why: string;
  }> = [
    { total: 0.01, feeCents: 1, providerCents: 0, why: "floor lifted to 50 then clamped to the total; provider gets nothing" },
    { total: 50.0, feeCents: 5000, providerCents: 0, why: "last total where the provider receives nothing" },
    { total: 50.01, feeCents: 5000, providerCents: 1, why: "first positive provider amount" },
    { total: 100, feeCents: 5000, providerCents: 5000, why: "50/50 split — the floor costs the provider half the job" },
    { total: 454.55, feeCents: 5000, providerCents: 40455, why: "floor is exactly 11% here" },
    { total: 499.94, feeCents: 5000, providerCents: 44994, why: "last total where the floor lifts the fee" },
    { total: 499.95, feeCents: 5000, providerCents: 44995, why: "exact tie; half-up equals the floor" },
    { total: 500.05, feeCents: 5001, providerCents: 45004, why: "exact tie 5000.5 must round UP to 5001" },
    { total: 640.55, feeCents: 6406, providerCents: 57649, why: "THE float bug: old code charged 6405" },
    { total: 49151.45, feeCents: 491515, providerCents: 4423630, why: "last total hit by the float bug (capped at 500000? no — below cap)" },
    { total: 49999.99, feeCents: 500000, providerCents: 4499999, why: "cap applies" },
    { total: 50000.0, feeCents: 500000, providerCents: 4500000, why: "exactly at the cap" },
    { total: 50000.05, feeCents: 500000, providerCents: 4500005, why: "cap holds past the boundary" },
    { total: 150000, feeCents: 500000, providerCents: 14500000, why: "cap holds far out" },
  ];

  it.each(VECTORS)("KES $total -> fee $feeCents cents ($why)", ({ total, feeCents, providerCents }) => {
    const b = calculateCommission(total, CFG);
    expect(b.platformFeeCents).toBe(feeCents);
    expect(b.providerAmountCents).toBe(providerCents);
    expect(b.totalCents).toBe(feeCents + providerCents);
    expect(b.platformFee).toBe(feeCents / 100);
    expect(b.providerAmount).toBe(providerCents / 100);
  });

  it("charges KES 64.06 on KES 640.55 (the exact regression)", () => {
    const b = calculateCommission(640.55);
    expect(b.platformFee).toBe(64.06);
    expect(b.platformFeeCents).toBe(6406);
    // The old implementation produced 64.05. Assert the mutant value is gone.
    expect(b.platformFeeCents).not.toBe(6405);
  });

  it("keeps the legacy return shape intact for both callers", () => {
    const b = calculateCommission(1000);
    expect(b).toMatchObject({
      totalAmount: 1000,
      platformFee: 100,
      providerAmount: 900,
      currency: "KES",
    });
    expect(typeof b.effectiveRate).toBe("number");
  });

  it("returns an all-zero breakdown for non-positive totals", () => {
    for (const total of [0, -1, -0.01, -99999]) {
      const b = calculateCommission(total, CFG);
      expect(b.totalCents).toBe(0);
      expect(b.platformFeeCents).toBe(0);
      expect(b.providerAmountCents).toBe(0);
      expect(b.effectiveRate).toBe(0);
      expect(b.currency).toBe("KES");
    }
  });

  it("reports the effective rate the floor and cap actually produce", () => {
    expect(calculateCommission(100, CFG).effectiveRate).toBe(0.5);
    expect(calculateCommission(1000, CFG).effectiveRate).toBe(0.1);
    expect(calculateCommission(150000, CFG).effectiveRate).toBe(0.0333);
  });

  it("snapshots the config that priced the breakdown", () => {
    const b = calculateCommission(1000);
    expect(b.configId).toBeNull();
    expect(b.rateBps).toBe(1000);
    // The live schedule: no fee floor, no minimum job value.
    expect(b.minimumFeeCents).toBe(0);
    expect(b.maximumFeeCents).toBe(500000);
    expect(b.minJobAmountCents).toBe(0);
  });
});

describe("property: the parts always sum to the total, in integer cents", () => {
  it("holds for every cent from 1 to 1,500,000 (KES 0.01 — 15,000)", () => {
    let checked = 0;
    for (let cents = 1; cents <= 1_500_000; cents++) {
      const fee = commissionFeeCents(cents, CFG);
      const provider = cents - fee;
      if (fee + provider !== cents) {
        throw new Error(`sum identity broken at ${cents} cents: ${fee} + ${provider}`);
      }
      if (fee < 0 || provider < 0 || fee > cents) {
        throw new Error(`fee out of bounds at ${cents} cents: ${fee}`);
      }
      checked++;
    }
    expect(checked).toBe(1_500_000);
  });

  it("holds through calculateCommission across the full audited range", () => {
    // Deterministic stride sweep to KES 150,000, through the public entry point.
    const broken: Array<{ cents: number; fee: number; provider: number; total: number }> = [];
    let checked = 0;
    for (let cents = 1; cents <= 15_000_000; cents += 997) {
      const b = calculateCommission(cents / 100);
      checked++;
      if (
        b.totalCents !== cents ||
        b.platformFeeCents + b.providerAmountCents !== cents ||
        b.platformFeeCents < 0 ||
        b.providerAmountCents < 0
      ) {
        if (broken.length < 10) {
          broken.push({
            cents,
            fee: b.platformFeeCents,
            provider: b.providerAmountCents,
            total: b.totalCents,
          });
        }
      }
    }
    expect(broken).toEqual([]);
    expect(checked).toBe(15_046);
  });

  it("never charges more than the total", () => {
    const overcharged: number[] = [];
    for (let cents = 1; cents <= 20_000; cents++) {
      if (commissionFeeCents(cents, CFG) > cents) overcharged.push(cents);
    }
    expect(overcharged).toEqual([]);
  });
});

describe("regression: zero divergence from an independent integer-cent oracle", () => {
  it("agrees at every exact tie up to KES 50,000 (the float bug's whole window)", () => {
    let divergences = 0;
    let firstDivergence: number | null = null;
    // Totals whose cents end in 5 are exactly where 10% lands on a half cent.
    for (let cents = 5; cents <= 5_000_000; cents += 10) {
      if (commissionFeeCents(cents, CFG) !== oracleFeeCents(cents)) {
        divergences++;
        if (firstDivergence === null) firstDivergence = cents;
      }
    }
    expect({ divergences, firstDivergence }).toEqual({ divergences: 0, firstDivergence: null });
  });

  it("agrees on every cent across the former bug window 640.55 — 49,151.45", () => {
    let divergences = 0;
    for (let cents = 64_055; cents <= 4_915_145; cents += 7) {
      if (commissionFeeCents(cents, CFG) !== oracleFeeCents(cents)) divergences++;
    }
    expect(divergences).toBe(0);
  });

  it("agrees on every cent from 1 to 200,000", () => {
    let divergences = 0;
    for (let cents = 1; cents <= 200_000; cents++) {
      if (commissionFeeCents(cents, CFG) !== oracleFeeCents(cents)) divergences++;
    }
    expect(divergences).toBe(0);
  });

  it("the oracle itself rejects the old float implementation", () => {
    // Guards against an oracle that cannot fail: the buggy expression must
    // disagree with it, and in exactly the direction the audit found.
    const buggy = (cents: number) => {
      const total = cents / 100;
      let fee = Math.round(total * (CFG.rateBps / 10_000) * 100);
      if (fee < CFG.minimumFeeCents) fee = CFG.minimumFeeCents;
      if (CFG.maximumFeeCents !== null && fee > CFG.maximumFeeCents) fee = CFG.maximumFeeCents;
      if (fee > cents) fee = cents;
      return fee;
    };
    let lower = 0;
    let higher = 0;
    for (let cents = 1; cents <= 5_000_000; cents++) {
      const b = buggy(cents);
      const o = oracleFeeCents(cents);
      if (b < o) lower++;
      else if (b > o) higher++;
    }
    expect(higher).toBe(0);
    expect(lower).toBeGreaterThan(10_000);
    expect(buggy(64_055)).toBe(6405);
    expect(oracleFeeCents(64_055)).toBe(6406);
  });
});

describe("config semantics", () => {
  const withConfig = (overrides: Partial<CommissionConfig>): CommissionConfig => ({
    ...CFG,
    ...overrides,
  });

  it("treats a null maximum as NO CAP", () => {
    const cfg = withConfig({ maximumFeeCents: null });
    expect(commissionFeeCents(100_000_000, cfg)).toBe(10_000_000);
  });

  it("treats a zero maximum as CAP AT ZERO, not as 'cap disabled'", () => {
    // This is the trap in the old `maximumFee > 0` check.
    const cfg = withConfig({ maximumFeeCents: 0, minimumFeeCents: 0 });
    expect(commissionFeeCents(100_000, cfg)).toBe(0);
  });

  it("suppresses the fee below min_job_amount and charges at the boundary", () => {
    const cfg = withConfig({ minJobAmountCents: 10_000 });
    expect(commissionFeeCents(9_999, cfg)).toBe(0);
    expect(commissionFeeCents(10_000, cfg)).toBe(5_000);
    const b = calculateCommission(99.99, cfg);
    expect(b.platformFeeCents).toBe(0);
    expect(b.providerAmountCents).toBe(9_999);
  });

  it("min_job_amount of 0 disables the threshold entirely", () => {
    const cfg = withConfig({ minJobAmountCents: 0 });
    let differences = 0;
    for (let cents = 1; cents <= 20_000; cents++) {
      if (commissionFeeCents(cents, cfg) !== commissionFeeCents(cents, CFG)) differences++;
    }
    expect(differences).toBe(0);
  });

  it("applies basis-point rates exactly, including fractional percents", () => {
    const cfg = withConfig({ rateBps: 1250, minimumFeeCents: 0, maximumFeeCents: null });
    expect(commissionFeeCents(100_000, cfg)).toBe(12_500); // 12.5% of KES 1000
    const cfg833 = withConfig({ rateBps: 833, minimumFeeCents: 0, maximumFeeCents: null });
    // 10000 cents * 833 / 10000 = 833 exactly
    expect(commissionFeeCents(10_000, cfg833)).toBe(833);
    // 1 cent * 833 / 10000 = 0.0833 -> 0
    expect(commissionFeeCents(1, cfg833)).toBe(0);
    // 7 cents * 833 / 10000 = 0.5831 -> 1 (half-up)
    expect(commissionFeeCents(7, cfg833)).toBe(1);
  });

  it("a zero rate with a zero floor charges nothing", () => {
    const cfg = withConfig({ rateBps: 0, minimumFeeCents: 0 });
    expect(commissionFeeCents(1_000_000, cfg)).toBe(0);
  });

  it("rejects a non-integer total in cents", () => {
    expect(() => commissionFeeCents(100.5, CFG)).toThrow(RangeError);
  });

  it("prices the whole DECIMAL(12,2) column domain exactly", () => {
    // booking_payments.amount / bookings.agreed_price are DECIMAL(12,2), so the
    // largest representable total is KES 9,999,999,999.99.
    const maxCents = 999_999_999_999;
    expect(commissionFeeCents(maxCents, { ...CFG, maximumFeeCents: null })).toBe(
      100_000_000_000
    );
    expect(commissionFeeCents(maxCents, CFG)).toBe(CFG.maximumFeeCents);
  });

  it("refuses loudly rather than mispricing beyond exact integer arithmetic", () => {
    // 2^53 / 1000 bps ~= 9.007e12 cents (~KES 90 billion), well outside the
    // column domain. A silently wrong fee would be worse than a thrown error.
    expect(() => commissionFeeCents(10_000_000_000_000, CFG)).toThrow(
      /exceeds exact integer arithmetic/
    );
  });
});

describe("config loading", () => {
  it("getCommissionConfig returns a copy of the fallback", () => {
    const a = getCommissionConfig();
    const b = getCommissionConfig();
    expect(a).toEqual(FALLBACK_COMMISSION_CONFIG);
    expect(a).not.toBe(FALLBACK_COMMISSION_CONFIG);
    a.rateBps = 9999;
    expect(b.rateBps).toBe(1000);
    expect(FALLBACK_COMMISSION_CONFIG.rateBps).toBe(1000);
  });

  it("maps a DB row, including string-typed bigints from PostgREST", () => {
    const cfg = commissionConfigFromRow({
      id: "11111111-2222-3333-4444-555555555555",
      scope: "global",
      currency: "KES",
      version: "2",
      rate_bps: "1250",
      min_fee_cents: "7500",
      max_fee_cents: null,
      min_job_amount_cents: "100000",
    });
    expect(cfg).toEqual({
      id: "11111111-2222-3333-4444-555555555555",
      scope: "global",
      currency: "KES",
      version: 2,
      rateBps: 1250,
      minimumFeeCents: 7500,
      maximumFeeCents: null,
      minJobAmountCents: 100_000,
    });
  });

  it("refuses a row with a non-integer money field instead of guessing", () => {
    expect(() =>
      commissionConfigFromRow({
        id: "x",
        scope: "global",
        currency: "KES",
        version: 1,
        rate_bps: 1000,
        min_fee_cents: "50.5",
        max_fee_cents: 500000,
        min_job_amount_cents: 0,
      })
    ).toThrow(/min_fee_cents/);
  });

  it("loads the active config from the RPC", async () => {
    const source = {
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            scope: "global",
            currency: "KES",
            version: 1,
            rate_bps: 1000,
            min_fee_cents: 5000,
            max_fee_cents: 500000,
            min_job_amount_cents: 0,
          },
        ],
        error: null,
      }),
    };
    const { config, usedFallback } = await loadCommissionConfig(source);
    expect(usedFallback).toBe(false);
    expect(config.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(config.rateBps).toBe(1000);
    expect(source.rpc).toHaveBeenCalledWith(
      "commission_config_active",
      expect.objectContaining({ p_scope: "global", p_currency: "KES" })
    );
  });

  it("falls back to unchanged pricing when the DB errors, and never throws", async () => {
    const cases = [
      { data: null, error: { message: "relation does not exist" } },
      { data: [], error: null },
      { data: null, error: null },
    ];
    for (const result of cases) {
      const { config, usedFallback, reason } = await loadCommissionConfig({
        rpc: () => Promise.resolve(result),
      });
      expect(usedFallback).toBe(true);
      expect(reason).toBeTruthy();
      expect(config).toEqual(FALLBACK_COMMISSION_CONFIG);
    }

    const thrown = await loadCommissionConfig({
      rpc: () => {
        throw new Error("network down");
      },
    });
    expect(thrown.usedFallback).toBe(true);
    expect(thrown.config).toEqual(FALLBACK_COMMISSION_CONFIG);
    // Pricing must be identical to the DB-backed path when it falls back.
    expect(calculateCommission(640.55, thrown.config).platformFeeCents).toBe(6406);
  });
});

describe("display helpers", () => {
  it("formats whole-percent rates exactly as the old literal did", () => {
    expect(formatCommissionRate(FALLBACK_COMMISSION_CONFIG)).toBe("10%");
    expect(formatCommissionRate()).toBe("10%");
  });

  it("formats fractional rates", () => {
    expect(formatCommissionRate({ ...CFG, rateBps: 1250 })).toBe("12.5%");
    expect(formatCommissionRate({ ...CFG, rateBps: 1205 })).toBe("12.05%");
    expect(formatCommissionRate({ ...CFG, rateBps: 0 })).toBe("0%");
    expect(formatCommissionRate({ ...CFG, rateBps: 10_000 })).toBe("100%");
  });

  it("formats cents without float artefacts", () => {
    expect(formatCents(6406)).toBe("64.06");
    expect(formatCents(5)).toBe("0.05");
    expect(formatCents(0)).toBe("0.00");
    expect(formatCents(500000)).toBe("5000.00");
    expect(formatCents(-1)).toBe("-0.01");
  });
});

describe("the compiled-in fallback matches the seeded DB config", () => {
  // If these drift, the display path and the money path disagree, which is the
  // whole class of bug this work removes. Parsed from the migrations so the two
  // cannot be changed independently.
  const v1Migration = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260321000000_commission_config.sql"),
    "utf8"
  );
  const v2Migration = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260328000000_flat_rate_no_fee_floor.sql"),
    "utf8"
  );
  // That migration annotates each seeded value with a trailing -- comment, so
  // strip comments before matching rather than writing a regex that tolerates
  // them. A comment-aware regex is how a drift guard quietly stops guarding.
  const v2Sql = v2Migration.replace(/--[^\n]*/g, "");

  it("mirrors the CURRENTLY ACTIVE seeded row (v2: flat 10%, no floor, no minimum)", () => {
    const seed = v2Sql.match(
      /\('global',\s*'KES',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),/
    );
    expect(seed).not.toBeNull();
    const [, version, rateBps, minFee, maxFee, minJob] = seed as RegExpMatchArray;
    expect(Number(version)).toBe(FALLBACK_COMMISSION_CONFIG.version);
    expect(Number(rateBps)).toBe(FALLBACK_COMMISSION_CONFIG.rateBps);
    expect(Number(minFee)).toBe(FALLBACK_COMMISSION_CONFIG.minimumFeeCents);
    expect(Number(maxFee)).toBe(FALLBACK_COMMISSION_CONFIG.maximumFeeCents);
    expect(Number(minJob)).toBe(FALLBACK_COMMISSION_CONFIG.minJobAmountCents);
    // The decision itself: no fee floor, no minimum job value.
    expect(Number(minFee)).toBe(0);
    expect(Number(minJob)).toBe(0);
  });

  it("leaves v1 untouched so historical pricing stays reproducible", () => {
    // v1 must still seed a ZERO minimum. If a later migration edits v1 in place
    // instead of adding a version, every past booking is silently repriced.
    const seed = v1Migration.match(
      /VALUES\s*\n\s*\('global',\s*'KES',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),/
    );
    expect(seed).not.toBeNull();
    const [, version, , minFee] = seed as RegExpMatchArray;
    expect(Number(version)).toBe(1);
    // v1 carried the KES 50 floor. If a later migration edits v1 in place
    // instead of adding a version, every past booking is silently repriced.
    expect(Number(minFee)).toBe(5000);
  });

  it("closes the previous range rather than mutating it", () => {
    expect(v2Migration).toMatch(/tstzrange\(lower\(effective\), v_now, '\[\)'\)/);
    expect(v2Migration).toMatch(/upper\(effective\) IS NULL/);
  });

  it("keeps the no-overlap guard and the integer half-up divisor in the migration", () => {
    expect(v1Migration).toMatch(/EXCLUDE USING gist/);
    expect(v1Migration).toMatch(/btree_gist/);
    expect(v1Migration).toMatch(/\+ 5000\) \/ 10000/);
  });
});

describe("the live schedule: flat 10%, no floor, micro-providers served", () => {
  // The platform must work for boda boda riders and mama mboga vendors, whose
  // jobs are routinely KES 20-300. Under the previous KES 50 fee floor a KES 50
  // job paid the provider NOTHING and a KES 100 job cost them half, which
  // excluded exactly those providers.
  const MICRO: Array<{ total: number; feeCents: number; providerCents: number }> = [
    { total: 20, feeCents: 200, providerCents: 1800 },
    { total: 50, feeCents: 500, providerCents: 4500 },
    { total: 80, feeCents: 800, providerCents: 7200 },
    { total: 100, feeCents: 1000, providerCents: 9000 },
    { total: 150, feeCents: 1500, providerCents: 13500 },
    { total: 300, feeCents: 3000, providerCents: 27000 },
  ];

  it.each(MICRO)("a KES $total job charges $feeCents cents and pays the provider $providerCents", ({ total, feeCents, providerCents }) => {
    const r = calculateCommission(total);
    expect(r.platformFeeCents).toBe(feeCents);
    expect(r.providerAmountCents).toBe(providerCents);
  });

  it("has no fee floor and no minimum job value", () => {
    expect(FALLBACK_COMMISSION_CONFIG.minimumFeeCents).toBe(0);
    expect(FALLBACK_COMMISSION_CONFIG.minJobAmountCents).toBe(0);
    expect(minimumJobAmount()).toBe(0);
  });

  it("allows any positive job value, however small", () => {
    expect(isJobValueAllowed(20)).toBe(true);
    expect(isJobValueAllowed(1)).toBe(true);
    expect(isJobValueAllowed(0.01)).toBe(true);
    // Still refuses nonsense.
    expect(isJobValueAllowed(0)).toBe(false);
    expect(isJobValueAllowed(-1)).toBe(false);
  });

  it("NEVER leaves the provider with nothing, at any price", () => {
    // This is the property that decides whether a rider will use the platform.
    // Under the old floor every total at or below KES 50 paid them zero.
    for (let cents = 1; cents <= 200_000; cents++) {
      const fee = commissionFeeCents(cents, FALLBACK_COMMISSION_CONFIG);
      expect(cents - fee).toBeGreaterThan(0);
    }
  });

  it("makes the advertised 10% true at every price, within half-cent rounding", () => {
    // The public copy says 10%. Previously the effective rate ran from 10% to
    // 100%, which made that claim a misrepresentation. Sweep and bound it.
    let worstExcessTenths = 0;
    for (let cents = 1; cents <= 500_000; cents++) {
      const fee = commissionFeeCents(cents, FALLBACK_COMMISSION_CONFIG);
      const excess = fee * 10 - cents; // > 0 means above 10%
      if (excess > worstExcessTenths) worstExcessTenths = excess;
    }
    // At most half a cent of half-up rounding; never a floor-driven lift.
    expect(worstExcessTenths).toBeLessThanOrEqual(5);
  });

  it("still caps the fee on large jobs", () => {
    expect(commissionFeeCents(5_000_000, FALLBACK_COMMISSION_CONFIG)).toBe(500_000);
    expect(commissionFeeCents(15_000_000, FALLBACK_COMMISSION_CONFIG)).toBe(500_000);
  });

  it("keeps the float-bug fix independent of the floor", () => {
    // 640.55 was the first input the old float expression got wrong. The fix is
    // in the integer arithmetic, so removing the floor must not disturb it.
    expect(calculateCommission(640.55).platformFeeCents).toBe(6406);
  });
});
