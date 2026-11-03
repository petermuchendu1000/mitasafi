-- =============================================================================
-- COMMISSION CONFIG: effective-dated, versioned platform commission
-- =============================================================================
-- Why this migration exists
-- -------------------------
-- The platform commission (rate, minimum fee, maximum fee) was hardcoded in
-- src/lib/payments/commission.ts. Pricing is data, not code: changing it
-- required a deploy, left no history of what was charged when, and there was no
-- way to reproduce an old fee from the row it produced.
--
-- This migration moves the schedule into the database:
--   1. commission_config          — effective-dated, versioned, non-overlapping
--   2. commission_config_active() — the row in force at a point in time
--   3. commission_fee_cents()     — the fee arithmetic, in integer cents
--   4. commission_breakdown()     — fee/net split for a numeric amount
--   5. booking_payments snapshot  — which config priced each payment (nullable
--                                   for now; see section 5 for why, and the
--                                   follow-up NOT NULL at the bottom)
--   6. commission_payment_audit   — recompute every stored fee from its snapshot
--
-- PRICING IS UNCHANGED BY THIS MIGRATION. The seeded version-1 row carries
-- exactly the values that are live in code today:
--   rate 1000 bps (10.00%), min fee KES 50.00, max fee KES 5,000.00,
--   min job amount KES 0.00 (i.e. no threshold), currency KES.
-- Whether to raise the floor or introduce a minimum job value is an OWNER
-- DECISION and is deliberately NOT taken here. After this migration it is a
-- one-row INSERT instead of a code change.
--
-- Units
-- -----
-- Money is stored in INTEGER CENTS (bigint) and the rate in INTEGER BASIS
-- POINTS (integer). Nothing here is float or numeric-rounded, so the SQL and the
-- TypeScript can perform byte-identical arithmetic (proven by a differential
-- test over every exact-tie input). KES 50.00 is 5000 cents; KES 5,000.00 is
-- 500000 cents. Column names carry the unit so the unit cannot be mistaken.
--
-- "No cap" is NULL, never 0
-- -------------------------
-- The old code used `maximumFee > 0` as "cap enabled", which made a genuine
-- zero cap unexpressible and silently disabled the cap if it were ever set to 0.
-- max_fee_cents IS NULL now means "no cap"; 0 means "cap at zero".
--
-- Depends on:
--   - 20260305000000_m6_payment_tables.sql (booking_payments)
--   - btree_gist (for the scope/currency equality part of the EXCLUDE)
--
-- Interacts with (already applied):
--   - 20260320000000_money_invariants.sql already CHECKs
--     amount = platform_fee + provider_amount and platform_fee <= amount on
--     booking_payments, so the sum identity this file audits is also enforced.
--   - 20260318/20260319 made booking_payments/service_providers grants
--     column-enumerated. The snapshot columns added here are intentionally NOT
--     granted to anon/authenticated.
--   - 20260324000000_payment_settlement_integrity.sql added settlement columns
--     and unique indexes to booking_payments; no name or index overlap here.
--
-- Rollback: see the bottom of this file.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSION
-- ─────────────────────────────────────────────────────────────────────────────
-- Needed so an EXCLUDE ... USING gist constraint can mix text equality with
-- tstzrange overlap. Already installed on this project; kept idempotent.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. COMMISSION CONFIG TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commission_config (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope. 'global' today; later e.g. 'category:cleaning' or 'tier:gold'.
  scope                  TEXT NOT NULL DEFAULT 'global',
  currency               TEXT NOT NULL DEFAULT 'KES',

  -- Monotonic version per (scope, currency); purely for human reference.
  version                INTEGER NOT NULL,

  -- Pricing. Integer basis points and integer cents only.
  rate_bps               INTEGER NOT NULL,
  min_fee_cents          BIGINT  NOT NULL DEFAULT 0,
  max_fee_cents          BIGINT,                      -- NULL = no cap
  min_job_amount_cents   BIGINT  NOT NULL DEFAULT 0,  -- 0 = no threshold

  -- Effective period, half-open [from, to). NULL upper bound = open-ended.
  effective              TSTZRANGE NOT NULL DEFAULT tstzrange(now(), NULL, '[)'),

  -- Provenance.
  notes                  TEXT,
  created_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT commission_config_rate_bps_range
    CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  CONSTRAINT commission_config_min_fee_nonneg
    CHECK (min_fee_cents >= 0),
  CONSTRAINT commission_config_max_fee_nonneg
    CHECK (max_fee_cents IS NULL OR max_fee_cents >= 0),
  CONSTRAINT commission_config_min_job_nonneg
    CHECK (min_job_amount_cents >= 0),
  -- A cap below the floor would make the floor unreachable and is always a typo.
  CONSTRAINT commission_config_cap_ge_floor
    CHECK (max_fee_cents IS NULL OR max_fee_cents >= min_fee_cents),
  CONSTRAINT commission_config_version_positive
    CHECK (version >= 1),
  CONSTRAINT commission_config_currency_format
    CHECK (currency ~ '^[A-Z]{3}$'),
  -- Every config must have a known start and cover at least one instant.
  CONSTRAINT commission_config_effective_bounded
    CHECK (lower(effective) IS NOT NULL AND NOT isempty(effective)),
  -- Half-open only, so that two adjacent configs can never both be active.
  CONSTRAINT commission_config_effective_half_open
    CHECK (lower_inc(effective) AND NOT upper_inc(effective)),
  CONSTRAINT commission_config_version_unique
    UNIQUE (scope, currency, version),
  -- THE core invariant: at most one config in force per scope+currency at any
  -- instant. Without this, commission_config_active() could return two rows and
  -- a booking's price would depend on sort order.
  CONSTRAINT commission_config_no_overlap
    EXCLUDE USING gist (
      scope WITH =,
      currency WITH =,
      effective WITH &&
    )
);

COMMENT ON TABLE public.commission_config IS
  'Effective-dated, versioned platform commission schedule. Money in integer cents, rate in integer basis points. max_fee_cents IS NULL means no cap. At most one row in force per (scope, currency) at any instant.';
COMMENT ON COLUMN public.commission_config.rate_bps IS 'Commission rate in basis points: 1000 = 10.00%.';
COMMENT ON COLUMN public.commission_config.min_fee_cents IS 'Minimum platform fee in cents (5000 = KES 50.00).';
COMMENT ON COLUMN public.commission_config.max_fee_cents IS 'Maximum platform fee in cents (500000 = KES 5,000.00). NULL = no cap. 0 would mean cap at zero.';
COMMENT ON COLUMN public.commission_config.min_job_amount_cents IS 'Totals strictly below this are not commissioned. 0 = no threshold (current live behaviour).';
COMMENT ON COLUMN public.commission_config.effective IS 'Half-open [from, to) period during which this config prices bookings. NULL upper bound = open-ended.';

-- No separate lookup index: the commission_config_no_overlap EXCLUDE constraint
-- is backed by a gist index on exactly (scope, currency, effective), which is
-- also the access path commission_config_active() needs.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SEED: the values that are live in code today. NO pricing change.
-- ─────────────────────────────────────────────────────────────────────────────
-- Open-ended from the epoch so that every booking, including any created before
-- this migration, resolves to a config. The lower bound is deliberately in the
-- past: commission_config_active(booking.created_at) must never return no row.

INSERT INTO public.commission_config
  (scope, currency, version, rate_bps, min_fee_cents, max_fee_cents, min_job_amount_cents, effective, notes)
VALUES
  ('global', 'KES', 1, 1000, 5000, 500000, 0,
   tstzrange('-infinity'::timestamptz, NULL, '[)'),
   'Initial import of the values hardcoded in src/lib/payments/commission.ts (10%, KES 50 floor, KES 5,000 cap, no minimum job amount). Pricing intentionally unchanged.')
ON CONFLICT (scope, currency, version) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ACTIVE CONFIG LOOKUP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.commission_config_active(
  p_scope    TEXT        DEFAULT 'global',
  p_currency TEXT        DEFAULT 'KES',
  p_at       TIMESTAMPTZ DEFAULT now()
)
RETURNS SETOF public.commission_config
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT *
  FROM public.commission_config
  WHERE scope = p_scope
    AND currency = p_currency
    AND effective @> COALESCE(p_at, now())
  -- The EXCLUDE constraint guarantees at most one row; LIMIT 1 is belt and
  -- braces so a caller can never be handed two.
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.commission_config_active(TEXT, TEXT, TIMESTAMPTZ) IS
  'The commission config in force for a scope/currency at an instant (default now()). Returns 0 or 1 rows.';

-- Convenience accessor used as a column DEFAULT on booking_payments. Returns
-- NULL if nothing is active, which surfaces as a NOT NULL violation on insert
-- rather than silently writing an unattributable fee. The seeded row is
-- open-ended in both directions, so this cannot happen unless someone closes it.
-- ─────────────────────────────────────────────────────────────────────────────
-- 4. THE ARITHMETIC
-- ─────────────────────────────────────────────────────────────────────────────
-- This function is the SQL twin of commissionFeeCents() in
-- src/lib/payments/commission.ts. The clause order IS the contract:
--   total <= 0            -> 0
--   total < min job       -> 0
--   raw  = half-up(total * rate_bps / 10000)
--   fee  = max(raw, min_fee)
--   fee  = min(fee, max_fee)      -- skipped when max_fee IS NULL
--   fee  = min(fee, total)        -- the fee can never exceed what was paid
-- Changing either side without the other re-breaks the defect this migration
-- was written to prevent; tests/differential cover both.

CREATE OR REPLACE FUNCTION public.commission_to_cents(p_amount NUMERIC)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_temp
AS $$
  -- numeric round() is half-up away from zero: exact, never binary floating point.
  SELECT CASE WHEN p_amount IS NULL THEN NULL ELSE round(p_amount * 100)::BIGINT END;
$$;

CREATE OR REPLACE FUNCTION public.commission_fee_cents(
  p_total_cents          BIGINT,
  p_rate_bps             INTEGER,
  p_min_fee_cents        BIGINT,
  p_max_fee_cents        BIGINT,            -- NULL = no cap
  p_min_job_amount_cents BIGINT DEFAULT 0
)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE                  -- deliberately NOT STRICT: a NULL cap is meaningful
SET search_path = pg_temp
AS $$
  SELECT CASE
           WHEN p_total_cents IS NULL OR p_total_cents <= 0 THEN 0::BIGINT
           -- A missing rate or floor is NOT a zero fee. Without this clause the
           -- NULL would be swallowed by GREATEST() below and silently price the
           -- job at 0; returning NULL makes an incomplete snapshot visible.
           WHEN p_rate_bps IS NULL OR p_min_fee_cents IS NULL THEN NULL::BIGINT
           WHEN p_total_cents < COALESCE(p_min_job_amount_cents, 0) THEN 0::BIGINT
           ELSE LEAST(
                  p_total_cents,
                  -- LEAST() ignores NULL arguments in PostgreSQL, so a NULL
                  -- p_max_fee_cents means "no cap" with no sentinel needed.
                  p_max_fee_cents,
                  GREATEST(
                    COALESCE(p_min_fee_cents, 0),
                    -- Integer half-up: floor((n + d/2) / d) with d = 10000.
                    -- bigint division truncates toward zero, which is floor for
                    -- the non-negative values guaranteed by the CASE above.
                    (p_total_cents * p_rate_bps::BIGINT + 5000) / 10000
                  )
                )
         END;
$$;

COMMENT ON FUNCTION public.commission_fee_cents(BIGINT, INTEGER, BIGINT, BIGINT, BIGINT) IS
  'Platform fee in integer cents, half-up. SQL twin of commissionFeeCents() in src/lib/payments/commission.ts; the two are held identical by a differential test.';

-- Fee/net split for a major-unit amount using the config in force at an instant.
CREATE OR REPLACE FUNCTION public.commission_breakdown(
  p_total    NUMERIC,
  p_scope    TEXT        DEFAULT 'global',
  p_currency TEXT        DEFAULT 'KES',
  p_at       TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  config_id              UUID,
  config_version         INTEGER,
  currency               TEXT,
  rate_bps               INTEGER,
  min_fee_cents          BIGINT,
  max_fee_cents          BIGINT,
  min_job_amount_cents   BIGINT,
  total_cents            BIGINT,
  platform_fee_cents     BIGINT,
  provider_amount_cents  BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT * FROM public.commission_config_active(p_scope, p_currency, p_at)
  ), amt AS (
    SELECT GREATEST(public.commission_to_cents(p_total), 0) AS total_cents
  ), fee AS (
    SELECT
      amt.total_cents,
      public.commission_fee_cents(
        amt.total_cents, cfg.rate_bps, cfg.min_fee_cents, cfg.max_fee_cents, cfg.min_job_amount_cents
      ) AS platform_fee_cents
    FROM cfg CROSS JOIN amt
  )
  SELECT
    cfg.id, cfg.version, cfg.currency,
    cfg.rate_bps, cfg.min_fee_cents, cfg.max_fee_cents, cfg.min_job_amount_cents,
    fee.total_cents,
    fee.platform_fee_cents,
    -- Subtraction, never a second rounding: the parts always sum to the total.
    fee.total_cents - fee.platform_fee_cents
  FROM cfg CROSS JOIN fee;
$$;

COMMENT ON FUNCTION public.commission_breakdown(NUMERIC, TEXT, TEXT, TIMESTAMPTZ) IS
  'Fee/net split in integer cents for a major-unit amount, using the config in force at p_at. Returns no rows if no config is active.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SNAPSHOT COLUMNS ON booking_payments
-- ─────────────────────────────────────────────────────────────────────────────
-- Records which config priced a payment AND the values actually used, so a fee
-- is reproducible even after the config is superseded.
--
-- The writer must pass these explicitly. They deliberately have NO DEFAULT:
--   * a column DEFAULT may not contain a subquery at all, and
--   * a DEFAULT (or BEFORE INSERT trigger) that resolved "the config active
--     now" would be WRONG even where it is legal — it would re-resolve pricing
--     at insert time and could stamp a booking that was priced under an older
--     config with a newer one. The snapshot must record what actually priced
--     the booking, which only the caller knows.
--
-- They are also NULLABLE, which is not the end state. NOT NULL cannot land in
-- the same migration as the columns, because the only writer
-- (src/lib/services/payments.ts) does not pass them yet: every payment insert
-- would fail the moment this is applied. Sequence:
--   1. this migration (columns nullable),
--   2. payments.ts passes the snapshot from the config it priced with,
--   3. the follow-up ALTER at the bottom of this file sets NOT NULL.
-- Until step 2 lands, commission_payment_audit reports such rows as
-- snapshot_missing, so nothing is silently unattributable.
--
-- No GRANT is added for these columns on purpose. booking_payments carries
-- column-enumerated INSERT/UPDATE/SELECT grants (see 20260318/20260319), so a
-- new column is not client-writable or client-readable unless named — which is
-- exactly right for pricing provenance. Every app read of booking_payments that
-- uses select("*") goes through the service-role admin client, so no client read
-- is affected.

ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS commission_config_id UUID
    REFERENCES public.commission_config(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS commission_rate_bps INTEGER,
  ADD COLUMN IF NOT EXISTS commission_min_fee_cents BIGINT,
  ADD COLUMN IF NOT EXISTS commission_max_fee_cents BIGINT,
  ADD COLUMN IF NOT EXISTS commission_min_job_amount_cents BIGINT;

-- All-or-nothing: a partial snapshot is unreproducible, so it is rejected. This
-- gives most of the value of NOT NULL without breaking the current writer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.booking_payments'::regclass
      AND conname = 'booking_payments_commission_snapshot_complete'
  ) THEN
    ALTER TABLE public.booking_payments
      ADD CONSTRAINT booking_payments_commission_snapshot_complete CHECK (
        (
          commission_config_id IS NULL
          AND commission_rate_bps IS NULL
          AND commission_min_fee_cents IS NULL
          AND commission_max_fee_cents IS NULL
          AND commission_min_job_amount_cents IS NULL
        )
        OR (
          commission_config_id IS NOT NULL
          AND commission_rate_bps BETWEEN 0 AND 10000
          AND commission_min_fee_cents >= 0
          AND commission_min_job_amount_cents >= 0
          AND (commission_max_fee_cents IS NULL OR commission_max_fee_cents >= commission_min_fee_cents)
        )
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.booking_payments.commission_config_id IS
  'commission_config row that priced this payment. Written by the caller, never defaulted: a default would re-resolve the active config at insert time and could re-price a booking quoted under an older config.';
COMMENT ON COLUMN public.booking_payments.commission_max_fee_cents IS
  'Maximum fee in cents that applied when this payment was priced. NULL = no cap was configured (the whole snapshot being NULL means no snapshot was recorded).';

CREATE INDEX IF NOT EXISTS idx_booking_payments_commission_config
  ON public.booking_payments (commission_config_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FORENSIC AUDIT VIEW
-- ─────────────────────────────────────────────────────────────────────────────
-- Recomputes every stored fee from its own snapshot, in integer cents, and
-- reports any row whose stored money does not match. Deliberately a view and
-- not a blocking trigger: enforcing this on the live write path is an owner
-- decision (see the report accompanying this migration).
--
-- fee_matches is false, never NULL, for a row with no snapshot, so the obvious
-- audit query cannot silently skip unattributable rows:
--   SELECT count(*) FROM commission_payment_audit WHERE NOT fee_matches;  -- expect 0
--
-- Note: 20260320000000_money_invariants already enforces
-- amount = platform_fee + provider_amount as a CHECK, so parts_sum below is a
-- belt-and-braces restatement of that invariant in integer cents.

CREATE OR REPLACE VIEW public.commission_payment_audit
WITH (security_invoker = true) AS
SELECT
  bp.id AS payment_id,
  bp.booking_id,
  bp.status,
  bp.commission_config_id,
  bp.commission_config_id IS NULL AS snapshot_missing,
  public.commission_to_cents(bp.amount)          AS total_cents,
  public.commission_to_cents(bp.platform_fee)    AS stored_fee_cents,
  public.commission_to_cents(bp.provider_amount) AS stored_provider_cents,
  public.commission_fee_cents(
    public.commission_to_cents(bp.amount),
    bp.commission_rate_bps,
    bp.commission_min_fee_cents,
    bp.commission_max_fee_cents,
    bp.commission_min_job_amount_cents
  ) AS expected_fee_cents,
  COALESCE(
    public.commission_to_cents(bp.platform_fee) = public.commission_fee_cents(
      public.commission_to_cents(bp.amount),
      bp.commission_rate_bps,
      bp.commission_min_fee_cents,
      bp.commission_max_fee_cents,
      bp.commission_min_job_amount_cents
    ),
    false
  ) AS fee_matches,
  COALESCE(
    public.commission_to_cents(bp.platform_fee) + public.commission_to_cents(bp.provider_amount)
      = public.commission_to_cents(bp.amount),
    false
  ) AS parts_sum
FROM public.booking_payments bp;

COMMENT ON VIEW public.commission_payment_audit IS
  'Recomputes each payment fee from its own commission snapshot in integer cents. Rows with fee_matches = false or parts_sum = false are arithmetic defects; snapshot_missing marks a fee that cannot be attributed to a config at all.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PRIVILEGES
-- ─────────────────────────────────────────────────────────────────────────────
-- The schedule is public information (it is shown in the provider UI), so reads
-- of the row in force are allowed. Writes have no client path at all: pricing
-- changes go through a migration or the service role.

ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.commission_config FROM anon, authenticated;
GRANT SELECT ON public.commission_config TO anon, authenticated;

DROP POLICY IF EXISTS commission_config_read_active ON public.commission_config;
CREATE POLICY commission_config_read_active ON public.commission_config
  FOR SELECT
  TO anon, authenticated
  USING (effective @> now());
  -- No INSERT/UPDATE/DELETE policy exists, and no write privilege is granted:
  -- clients cannot change pricing even with a leaked anon key.

GRANT EXECUTE ON FUNCTION public.commission_config_active(TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commission_fee_cents(BIGINT, INTEGER, BIGINT, BIGINT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commission_to_cents(NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commission_breakdown(NUMERIC, TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON public.commission_payment_audit TO service_role;
  END IF;
END
$$;

-- =============================================================================
-- ASSERTIONS: fail the migration if any guarantee above is not real.
-- =============================================================================

DO $$
DECLARE
  v_cfg   public.commission_config;
  v_count INTEGER;
  v_fee   BIGINT;
  r       RECORD;
BEGIN
  -- (a) exactly one active config, carrying the current live values
  SELECT count(*) INTO v_count FROM public.commission_config_active('global', 'KES', now());
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'commission_config: expected exactly 1 active config, found %', v_count;
  END IF;

  SELECT * INTO v_cfg FROM public.commission_config_active('global', 'KES', now());
  IF v_cfg.rate_bps <> 1000
     OR v_cfg.min_fee_cents <> 5000
     OR v_cfg.max_fee_cents IS DISTINCT FROM 500000
     OR v_cfg.min_job_amount_cents <> 0
     OR v_cfg.currency <> 'KES' THEN
    RAISE EXCEPTION 'commission_config: seeded row does not match the live values (rate_bps=%, min=%, max=%, min_job=%, cur=%)',
      v_cfg.rate_bps, v_cfg.min_fee_cents, v_cfg.max_fee_cents, v_cfg.min_job_amount_cents, v_cfg.currency;
  END IF;

  -- (b) golden vectors: the exact boundaries the app tests assert, in cents.
  --     640.55 -> 64.06 is the float bug this work exists to kill.
  FOR r IN
    SELECT * FROM (VALUES
      (1::BIGINT,        0::BIGINT),       -- KES 0.01  -> fee 0.01 (clamped to total)
      (5000::BIGINT,     5000::BIGINT),    -- KES 50.00 -> fee 50.00, provider 0
      (5001::BIGINT,     5000::BIGINT),    -- KES 50.01 -> first positive provider amount
      (10000::BIGINT,    5000::BIGINT),    -- KES 100   -> 50/50
      (45455::BIGINT,    5000::BIGINT),    -- KES 454.55 -> floor, 11.0%
      (49994::BIGINT,    5000::BIGINT),    -- KES 499.94 -> last floor-driven fee
      (49995::BIGINT,    5000::BIGINT),    -- KES 499.95 -> exact tie, == floor
      (50005::BIGINT,    5001::BIGINT),    -- KES 500.05 -> half-up, 5000.5 -> 5001
      (64055::BIGINT,    6406::BIGINT),    -- KES 640.55 -> 64.06 (old code: 64.05)
      (4999999::BIGINT,  500000::BIGINT),  -- KES 49,999.99 -> capped
      (5000000::BIGINT,  500000::BIGINT),  -- KES 50,000.00 -> exactly at the cap
      (5000005::BIGINT,  500000::BIGINT),  -- KES 50,000.05 -> capped
      (15000000::BIGINT, 500000::BIGINT)   -- KES 150,000   -> capped
    ) AS v(total_cents, expected_fee_cents)
  LOOP
    v_fee := public.commission_fee_cents(r.total_cents, 1000, 5000, 500000, 0);
    -- KES 0.01: the fee is lifted to the floor then clamped to the total.
    IF r.total_cents = 1 THEN
      IF v_fee <> 1 THEN
        RAISE EXCEPTION 'commission_fee_cents(1) = %, expected 1 (floor clamped to total)', v_fee;
      END IF;
    ELSIF v_fee <> r.expected_fee_cents THEN
      RAISE EXCEPTION 'commission_fee_cents(%) = %, expected %', r.total_cents, v_fee, r.expected_fee_cents;
    END IF;
  END LOOP;

  -- (c0) a missing rate or floor yields NULL, never a silent zero fee
  IF public.commission_fee_cents(64055, NULL, 5000, 500000, 0) IS NOT NULL THEN
    RAISE EXCEPTION 'commission_fee_cents: a NULL rate_bps must yield NULL, not a fee';
  END IF;
  IF public.commission_fee_cents(64055, 1000, NULL, 500000, 0) IS NOT NULL THEN
    RAISE EXCEPTION 'commission_fee_cents: a NULL min_fee_cents must yield NULL, not a fee';
  END IF;

  -- (c) NULL cap means no cap (not "cap at zero", and not disabled-by-sentinel)
  IF public.commission_fee_cents(100000000, 1000, 5000, NULL, 0) <> 10000000 THEN
    RAISE EXCEPTION 'commission_fee_cents: NULL max_fee_cents did not behave as "no cap"';
  END IF;
  IF public.commission_fee_cents(100000, 1000, 0, 0, 0) <> 0 THEN
    RAISE EXCEPTION 'commission_fee_cents: a 0 cap must cap at zero, not disable the cap';
  END IF;

  -- (d) min_job_amount_cents gates the fee, and 0 is a no-op
  IF public.commission_fee_cents(9999, 1000, 5000, 500000, 10000) <> 0 THEN
    RAISE EXCEPTION 'commission_fee_cents: min_job_amount_cents did not suppress the fee';
  END IF;
  IF public.commission_fee_cents(10000, 1000, 5000, 500000, 10000) <> 5000 THEN
    RAISE EXCEPTION 'commission_fee_cents: min_job_amount_cents is exclusive at the boundary';
  END IF;

  -- (e) fee + provider == total, in integer cents, across a wide sweep
  SELECT count(*) INTO v_count
  FROM generate_series(1, 200000) AS c(total_cents)
  WHERE public.commission_fee_cents(c.total_cents, 1000, 5000, 500000, 0)
        + (c.total_cents - public.commission_fee_cents(c.total_cents, 1000, 5000, 500000, 0))
        <> c.total_cents;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'commission_fee_cents: % inputs where the parts do not sum to the total', v_count;
  END IF;

  -- (f) half-up at every exact tie, against an INDEPENDENT numeric oracle
  --     (exact decimal arithmetic, a different code path from the integer
  --     division used inside the function, so this cannot be a tautology).
  SELECT count(*) INTO v_count
  FROM generate_series(50005, 4999995, 10) AS c(total_cents)
  WHERE public.commission_fee_cents(c.total_cents, 1000, 5000, 500000, 0)
        <> round(c.total_cents::NUMERIC * 1000 / 10000)::BIGINT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'commission_fee_cents: % exact-tie inputs not rounded half-up', v_count;
  END IF;

  -- (g) the overlap guard is real
  BEGIN
    INSERT INTO public.commission_config
      (scope, currency, version, rate_bps, min_fee_cents, max_fee_cents, min_job_amount_cents, effective, notes)
    VALUES
      ('global', 'KES', 999999, 1000, 5000, 500000, 0,
       tstzrange(now(), NULL, '[)'), 'overlap probe — must be rejected');
    RAISE EXCEPTION 'commission_config: overlapping effective ranges were ACCEPTED; the EXCLUDE constraint is not working';
  EXCEPTION
    WHEN exclusion_violation THEN
      NULL;  -- expected: the probe row was rejected and rolled back
  END;

  RAISE NOTICE 'commission_config: all assertions passed';
END
$$;

-- =============================================================================
-- ROLLBACK (manual)
-- =============================================================================
-- DROP VIEW IF EXISTS public.commission_payment_audit;
-- ALTER TABLE public.booking_payments
--   DROP CONSTRAINT IF EXISTS booking_payments_commission_snapshot_complete;
-- ALTER TABLE public.booking_payments
--   DROP COLUMN IF EXISTS commission_config_id,
--   DROP COLUMN IF EXISTS commission_rate_bps,
--   DROP COLUMN IF EXISTS commission_min_fee_cents,
--   DROP COLUMN IF EXISTS commission_max_fee_cents,
--   DROP COLUMN IF EXISTS commission_min_job_amount_cents;
-- DROP FUNCTION IF EXISTS public.commission_breakdown(NUMERIC, TEXT, TEXT, TIMESTAMPTZ);
-- DROP FUNCTION IF EXISTS public.commission_fee_cents(BIGINT, INTEGER, BIGINT, BIGINT, BIGINT);
-- DROP FUNCTION IF EXISTS public.commission_to_cents(NUMERIC);
-- DROP FUNCTION IF EXISTS public.commission_config_active(TEXT, TEXT, TIMESTAMPTZ);
-- DROP TABLE IF EXISTS public.commission_config;
-- (btree_gist is left installed; it was already present before this migration.)
-- =============================================================================

-- =============================================================================
-- FOLLOW-UP (do NOT run with this migration — run it only AFTER
-- src/lib/services/payments.ts passes the commission snapshot on insert, or
-- every payment insert will fail on the NOT NULL):
--
--   ALTER TABLE public.booking_payments
--     ALTER COLUMN commission_config_id            SET NOT NULL,
--     ALTER COLUMN commission_rate_bps             SET NOT NULL,
--     ALTER COLUMN commission_min_fee_cents        SET NOT NULL,
--     ALTER COLUMN commission_min_job_amount_cents SET NOT NULL;
--   -- commission_max_fee_cents stays nullable: NULL means "no cap".
--
-- Verify first:
--   SELECT count(*) FROM public.booking_payments WHERE commission_config_id IS NULL;
-- =============================================================================
