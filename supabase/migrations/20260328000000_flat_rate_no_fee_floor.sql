-- =============================================================================
-- Owner decision: flat 10%, no fee floor, no minimum job value
-- =============================================================================
-- The platform must serve micro-providers -- boda boda riders, mama mboga
-- vendors -- whose jobs are routinely KES 20 to KES 300. The KES 50 fee floor
-- made exactly those jobs unviable, and a minimum job value would have excluded
-- them outright. Measured against the previous schedule:
--
--   job      floor schedule (old)            flat 10% (this migration)
--   KES  20  platform 20.00  provider 0.00   platform 2.00  provider 18.00
--   KES  50  platform 50.00  provider 0.00   platform 5.00  provider 45.00
--   KES 100  platform 50.00  provider 50.00  platform 10.00 provider 90.00
--   KES 300  platform 50.00  provider 250.00 platform 30.00 provider 270.00
--
-- Under the old schedule a KES 50 job paid the provider NOTHING and a KES 100
-- job cost them half. No rider or vendor would accept that, so the floor was
-- not merely a pricing choice -- it was an exclusion.
--
-- Two further consequences, both improvements:
--
--   1. The advertised "10%" becomes literally true at EVERY price, not just
--      above some threshold. The effective rate is now exactly 10% up to the
--      KES 5,000 cap and below 10% above it, so the public claim on the
--      earnings page and in the provider FAQ stops being a misrepresentation.
--   2. The provider can never receive zero. With no floor the fee is at most
--      10% of the job, so 90% always reaches the provider.
--
-- BUSINESS FACT THE OWNER SHOULD WEIGH (not a blocker, not changed here):
-- PayHero charges the MERCHANT per transaction -- KES 6 for totals of 50-499,
-- KES 10 for 500-999. At a flat 10% the platform's revenue on a KES 50 job is
-- KES 5 against a KES 6 processing cost, so micro-jobs are NET NEGATIVE below
-- roughly KES 60 per transaction. Three ways to handle it, all config or
-- product changes rather than code: absorb it as acquisition cost, pass the
-- processing fee to the customer (common practice in Kenya), or set a small
-- floor that covers it -- a KES 6 floor would be 12% on a KES 50 job, which is
-- far from the 100% it was, but would make the flat "10%" claim untrue again.
-- commission.ts has no term for the processing cost either way.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. New config version, effective-dated. v1 is NOT edited in place.
-- -----------------------------------------------------------------------------
-- Closing v1's range and opening v2 is what keeps a fee reproducible: anything
-- priced before this instant resolves to v1, anything after to v2. Mutating v1
-- would silently rewrite the pricing history of every past booking.
DO $cfg$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF EXISTS (SELECT 1 FROM public.commission_config
              WHERE scope = 'global' AND currency = 'KES' AND version = 2) THEN
    RAISE NOTICE 'commission_config v2 already present; leaving it untouched.';
    RETURN;
  END IF;

  UPDATE public.commission_config
     SET effective = tstzrange(lower(effective), v_now, '[)')
   WHERE scope = 'global' AND currency = 'KES'
     AND upper(effective) IS NULL;

  INSERT INTO public.commission_config
    (scope, currency, version, rate_bps, min_fee_cents, max_fee_cents,
     min_job_amount_cents, effective, notes)
  VALUES
    ('global', 'KES', 2,
     1000,     -- 10.00%, unchanged
     0,        -- NO fee floor: the KES 50 floor excluded micro-providers
     500000,   -- KES 5,000 cap, unchanged
     0,        -- NO minimum job value: a KES 20 job is welcome
     tstzrange(v_now, NULL, '[)'),
     'Owner decision: serve micro-providers (boda boda, mama mboga). Fee floor '
     'removed so a KES 50 job pays the provider 45 instead of 0, and no minimum '
     'job value. Rate and cap unchanged from v1. The advertised 10% is now '
     'accurate at every price.');
END
$cfg$;

-- -----------------------------------------------------------------------------
-- 2. Minimum job value: the mechanism stays, set to zero
-- -----------------------------------------------------------------------------
-- There is no minimum today. The lookup and the enforcement trigger are kept
-- deliberately: they read the threshold from the config and short-circuit when
-- it is zero, so introducing a minimum later is one INSERT rather than a code
-- change, and no future minimum can be set without being enforced.
--
-- NOTE on commission_config.min_job_amount_cents semantics: it means "charge NO
-- commission below this total", which is NOT the same as "disallow jobs below
-- this total". Setting it alone would make small jobs commission-free rather
-- than disallowed. The enforcement below is what makes it a real minimum, and
-- the two are intentionally separate.
CREATE OR REPLACE FUNCTION public.active_min_job_amount(
  p_scope    text DEFAULT 'global',
  p_currency text DEFAULT 'KES',
  p_at       timestamptz DEFAULT now()
)
RETURNS numeric(12,2)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT min_job_amount_cents::numeric / 100
       FROM public.commission_config
      WHERE scope = p_scope AND currency = p_currency
        AND effective @> COALESCE(p_at, now())
      LIMIT 1),
    0::numeric
  )::numeric(12,2);
$$;

GRANT EXECUTE ON FUNCTION public.active_min_job_amount(text, text, timestamptz)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_minimum_job_value()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_min numeric(12,2);
BEGIN
  IF NEW.quoted_price IS NULL AND NEW.agreed_price IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only re-check when a price actually changes, so a booking priced under an
  -- older config is not retroactively invalidated by an edit to another column.
  IF TG_OP = 'UPDATE'
     AND NEW.quoted_price IS NOT DISTINCT FROM OLD.quoted_price
     AND NEW.agreed_price IS NOT DISTINCT FROM OLD.agreed_price THEN
    RETURN NEW;
  END IF;

  v_min := public.active_min_job_amount('global', COALESCE(NEW.currency, 'KES'));

  -- Zero means no minimum, which is the current configuration. Micro-jobs pass
  -- straight through.
  IF v_min <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.quoted_price IS NOT NULL AND NEW.quoted_price < v_min THEN
    RAISE EXCEPTION 'Quoted price % is below the minimum job value of %', NEW.quoted_price, v_min
      USING HINT = 'Quote at or above the minimum job value, or decline the job.',
            ERRCODE = 'check_violation';
  END IF;

  IF NEW.agreed_price IS NOT NULL AND NEW.agreed_price < v_min THEN
    RAISE EXCEPTION 'Agreed price % is below the minimum job value of %', NEW.agreed_price, v_min
      USING HINT = 'This job cannot be booked below the minimum job value.',
            ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "00_enforce_minimum_job_value" ON public.bookings;
CREATE TRIGGER "00_enforce_minimum_job_value"
  BEFORE INSERT OR UPDATE OF quoted_price, agreed_price ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_minimum_job_value();

-- =============================================================================
-- 3. Assertions
-- =============================================================================
DO $assert$
DECLARE v_active int; v_fee bigint;
BEGIN
  SELECT count(*) INTO v_active FROM public.commission_config WHERE effective @> now();
  IF v_active <> 1 THEN
    RAISE EXCEPTION 'FAILED: % configs active at this instant, expected exactly 1', v_active;
  END IF;

  -- Asserted on VERSION 2 -- the row this migration creates -- and not on
  -- whatever happens to be active now.
  --
  -- It used to read `WHERE effective @> now()`, which was true the day this
  -- ran and became false on 2026-11-05, when
  -- 20260341000000_commission_bands.sql superseded this schedule with
  -- declining bands and REMOVED the KES 5,000 cap. The active config is now
  -- v3, whose max_fee_cents is NULL, so `max_fee_cents = 500000` no longer
  -- holds. That single conjunct is the whole of the failure: v3 still has
  -- rate_bps 1000, min_fee_cents 0 and min_job_amount_cents 0.
  --
  -- A migration can only sensibly assert what IT established. Whether its
  -- schedule is still the live one is the business of whichever migration ran
  -- last, and asserting otherwise makes every past migration fail the moment a
  -- pricing decision changes -- which is exactly what happened: this file
  -- stopped being replayable into a fresh environment nine days after it was
  -- written, for no defect of its own.
  --
  -- The data change above is already guarded ("v2 already present; leaving it
  -- untouched"), so the replay was never corrupting anything -- verified by
  -- replaying it against a from-scratch database and confirming the active
  -- config was still v3 with its five bands afterwards. Only this assertion
  -- was stale.
  --
  -- What is NOT weakened: v1 reproducibility is asserted separately below, the
  -- single-active-config invariant is asserted above and still reads `now()`
  -- because it is a property of the table rather than of one schedule, and the
  -- fee-arithmetic assertions pass their parameters explicitly so they test
  -- the function rather than the config.
  IF NOT EXISTS (SELECT 1 FROM public.commission_config
                  WHERE scope = 'global' AND currency = 'KES' AND version = 2
                    AND rate_bps = 1000 AND min_fee_cents = 0
                    AND max_fee_cents = 500000 AND min_job_amount_cents = 0) THEN
    RAISE EXCEPTION 'FAILED: v2 is not flat 10%% with no floor, no minimum and the KES 5,000 cap';
  END IF;

  IF public.active_min_job_amount() <> 0 THEN
    RAISE EXCEPTION 'FAILED: a minimum job value is still in force';
  END IF;

  -- v1 must remain reproducible.
  IF NOT EXISTS (SELECT 1 FROM public.commission_config WHERE version = 1 AND min_fee_cents = 5000) THEN
    RAISE EXCEPTION 'FAILED: v1 was mutated; past bookings are no longer reproducible';
  END IF;

  -- The whole point: the provider must keep 90% at micro prices, where the old
  -- floor left them with nothing.
  v_fee := public.commission_fee_cents(5000, 1000, 0, 500000, 0);   -- KES 50
  IF v_fee <> 500 THEN
    RAISE EXCEPTION 'FAILED: fee on a KES 50 job is % cents, expected 500', v_fee;
  END IF;
  v_fee := public.commission_fee_cents(2000, 1000, 0, 500000, 0);   -- KES 20
  IF v_fee <> 200 THEN
    RAISE EXCEPTION 'FAILED: fee on a KES 20 job is % cents, expected 200', v_fee;
  END IF;

  -- No price may leave the provider with nothing.
  IF EXISTS (
    SELECT 1 FROM generate_series(1, 200000) c
     WHERE c - public.commission_fee_cents(c, 1000, 0, 500000, 0) <= 0
  ) THEN
    RAISE EXCEPTION 'FAILED: some price still leaves the provider with zero';
  END IF;

  -- And the advertised 10% must now hold everywhere, within half-cent rounding.
  IF EXISTS (
    SELECT 1 FROM generate_series(1, 200000) c
     WHERE public.commission_fee_cents(c, 1000, 0, 500000, 0) * 10 > c + 5
  ) THEN
    RAISE EXCEPTION 'FAILED: the effective rate still exceeds 10%% somewhere';
  END IF;

  RAISE NOTICE 'Flat 10%%, no floor, no minimum. Provider keeps 90%% at every price.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DELETE FROM public.commission_config WHERE version = 2 AND scope = 'global' AND currency = 'KES';
--   UPDATE public.commission_config SET effective = tstzrange(lower(effective), NULL, '[)')
--    WHERE version = 1 AND scope = 'global' AND currency = 'KES';
--   (Do NOT delete v2 if any booking_payments row references it.)
-- =============================================================================
