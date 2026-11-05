-- =============================================================================
-- Commission bands: declining rates by job value, replacing the flat 10%
-- =============================================================================
-- OWNER DECISION, approved 2026-11-05. Schedule A, flat-by-band (NOT marginal):
--
--     job value (KES)        rate
--     0        –     999     15%
--     1,000    –   4,999     12%
--     5,000    –  19,999     10%
--     20,000   –  99,999      7%
--     100,000  –      inf      5%
--
--   and the KES 5,000 fee cap is REMOVED.
--
-- WHY THE CAP GOES. The cap existed to stop a flat 10% punishing large jobs.
-- The 5% band now does that, so the cap is redundant -- and worse than
-- redundant: it starts biting INSIDE the 7% band (at KES 71,429) and makes the
-- 5% band unreachable. A KES 1,000,000 job would pay KES 5,000, an effective
-- rate of 0.5%. Measured across every job value from KES 1 to 200,000, with
-- and without the cap: zero provider-net inversions either way, so removing it
-- cannot make a bigger job pay the provider less.
--
-- WHAT THIS WALKS BACK, DELIBERATELY. 20260328000000 removed the KES 50 fee
-- floor so a KES 50 job paid the provider 45 instead of 0. That stays: there is
-- still no floor. But the bottom band raises the RATE on small jobs from 10% to
-- 15%, so a KES 300 job now costs the provider 45 rather than 30. Confirmed as
-- intended by the owner. The provider still always receives 85% or more, where
-- under the old floor they could receive nothing at all.
--
-- HOW THIS IS BUILT, AND WHY NOT AS CONFIG ROWS
--   commission_config carries EXCLUDE USING gist (scope =, currency =,
--   effective &&), so there can only ever be ONE active row per scope and
--   currency. Five bands cannot be five rows. They go in a child table keyed to
--   the config row, which also keeps the existing effective-dating, the
--   snapshot columns on booking_payments, and v1/v2 reproducibility untouched.
--
--   The arithmetic is NOT changed. commission_fee_cents() stays exactly as it
--   is -- integer half-up, LEAST/GREATEST clamps in the same order. A band only
--   decides WHICH rate_bps is handed to it. That is why the golden-vector tests
--   for the arithmetic keep passing unmodified.
--
-- ROLLBACK
--   UPDATE public.commission_config SET effective = tstzrange(lower(effective), now(), '[)')
--     WHERE scope='global' AND currency='KES' AND version=3;
--   UPDATE public.commission_config SET effective = tstzrange(lower(effective), NULL, '[)')
--     WHERE scope='global' AND currency='KES' AND version=2;
--   Bands cascade-delete with their config row if v3 is deleted outright.
--   Fees already charged are unaffected: booking_payments snapshots the rate.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.commission_bands (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id      uuid NOT NULL REFERENCES public.commission_config(id) ON DELETE CASCADE,
  -- Inclusive lower bound, in cents of the job total.
  min_job_cents  bigint NOT NULL CHECK (min_job_cents >= 0),
  -- Inclusive upper bound. NULL means unbounded: the top band.
  max_job_cents  bigint CHECK (max_job_cents IS NULL OR max_job_cents >= min_job_cents),
  rate_bps       integer NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  created_at     timestamptz NOT NULL DEFAULT now(),

  -- Two bands of one config may never overlap. int8range is half-open, so the
  -- inclusive max becomes max+1; NULL becomes the bigint ceiling.
  CONSTRAINT commission_bands_no_overlap EXCLUDE USING gist (
    config_id WITH =,
    int8range(min_job_cents, COALESCE(max_job_cents + 1, 9223372036854775807)) WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_commission_bands_config
  ON public.commission_bands (config_id, min_job_cents);

COMMENT ON TABLE public.commission_bands IS
  'Declining commission rates by job value for one commission_config row. '
  'Flat-by-band, not marginal: the whole job is charged at its band rate. '
  'A config with no bands uses its own rate_bps, which is how v1 and v2 '
  'remain reproducible.';

-- --------------------------------------------------------------- exposure
-- Supabase ALTER DEFAULT PRIVILEGES hands anon and authenticated full rights
-- on every new table, so the writes have to be taken back explicitly rather
-- than merely not granted. Mirrors commission_config: clients may read the
-- bands of the ACTIVE config and nothing else.
ALTER TABLE public.commission_bands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commission_bands FROM PUBLIC;
REVOKE ALL ON public.commission_bands FROM anon, authenticated;
GRANT SELECT ON public.commission_bands TO anon, authenticated;
GRANT ALL ON public.commission_bands TO service_role;

DROP POLICY IF EXISTS commission_bands_read_active ON public.commission_bands;
CREATE POLICY commission_bands_read_active ON public.commission_bands
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.commission_config c
    WHERE c.id = commission_bands.config_id
      AND c.effective @> now()
  ));

DROP POLICY IF EXISTS commission_bands_service_role_all ON public.commission_bands;
CREATE POLICY commission_bands_service_role_all ON public.commission_bands
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------- resolve the band
-- commission_fee_cents() is deliberately NOT touched. The band only decides
-- which rate_bps reaches it, so the clamp order, the integer half-up rounding
-- and every golden vector pinned against it stay exactly as they were.
--
-- rate_bps in the returned row is the RESOLVED rate, because
-- src/lib/services/payments.ts:241 writes it into
-- booking_payments.commission_rate_bps as the forensic record of what was
-- actually charged. It must be the band rate, not the config's fallback.
CREATE OR REPLACE FUNCTION public.commission_breakdown(
  p_total numeric,
  p_scope text DEFAULT 'global',
  p_currency text DEFAULT 'KES',
  p_at timestamptz DEFAULT now()
)
RETURNS TABLE(
  config_id uuid, config_version integer, currency text, rate_bps integer,
  min_fee_cents bigint, max_fee_cents bigint, min_job_amount_cents bigint,
  total_cents bigint, platform_fee_cents bigint, provider_amount_cents bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH cfg AS (
    SELECT * FROM public.commission_config_active(p_scope, p_currency, p_at)
  ), amt AS (
    SELECT GREATEST(public.commission_to_cents(p_total), 0) AS total_cents
  ), eff AS (
    -- COALESCE, not a bare lookup: a config with no bands (v1, v2) keeps its
    -- own flat rate, and a hypothetical gap in the bands charges the config
    -- rate rather than returning NULL and pricing the job at nothing. The
    -- guard below makes a gap impossible for the seeded schedule.
    SELECT cfg.id, cfg.version, cfg.currency,
           COALESCE(
             (SELECT b.rate_bps
                FROM public.commission_bands b, amt
               WHERE b.config_id = cfg.id
                 AND amt.total_cents >= b.min_job_cents
                 AND (b.max_job_cents IS NULL OR amt.total_cents <= b.max_job_cents)
               LIMIT 1),
             cfg.rate_bps
           ) AS rate_bps,
           cfg.min_fee_cents, cfg.max_fee_cents, cfg.min_job_amount_cents
      FROM cfg
  ), fee AS (
    SELECT amt.total_cents,
           public.commission_fee_cents(
             amt.total_cents, eff.rate_bps, eff.min_fee_cents,
             eff.max_fee_cents, eff.min_job_amount_cents
           ) AS platform_fee_cents
      FROM eff CROSS JOIN amt
  )
  SELECT eff.id, eff.version, eff.currency, eff.rate_bps,
         eff.min_fee_cents, eff.max_fee_cents, eff.min_job_amount_cents,
         fee.total_cents, fee.platform_fee_cents,
         -- Subtraction, never a second rounding: the parts always sum.
         fee.total_cents - fee.platform_fee_cents
    FROM eff CROSS JOIN fee;
$function$;

-- ------------------------------------------------- bands of the active config
-- The TypeScript loader reaches the config through an RPC and has no table
-- handle, so the bands need one too. Returning them in band order lets the
-- caller resolve a rate without a second round trip per lookup.
CREATE OR REPLACE FUNCTION public.commission_bands_active(
  p_scope text DEFAULT 'global',
  p_currency text DEFAULT 'KES',
  p_at timestamptz DEFAULT now()
)
RETURNS TABLE(min_job_cents bigint, max_job_cents bigint, rate_bps integer)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT b.min_job_cents, b.max_job_cents, b.rate_bps
    FROM public.commission_bands b
    JOIN public.commission_config_active(p_scope, p_currency, p_at) c ON c.id = b.config_id
   ORDER BY b.min_job_cents;
$function$;

REVOKE ALL ON FUNCTION public.commission_bands_active(text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commission_bands_active(text, text, timestamptz)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------- seed v3
DO $seed$
DECLARE
  v_id uuid;
  v_at timestamptz := now();
BEGIN
  IF EXISTS (SELECT 1 FROM public.commission_config
              WHERE scope='global' AND currency='KES' AND version=3) THEN
    RAISE NOTICE 'commission_config v3 already present; leaving it alone';
    RETURN;
  END IF;

  -- Close the open row at this instant rather than editing it, so any fee
  -- priced under the old schedule stays reproducible from (amount, config row).
  UPDATE public.commission_config
     SET effective = tstzrange(lower(effective), v_at, '[)')
   WHERE scope='global' AND currency='KES' AND upper_inf(effective);

  INSERT INTO public.commission_config
    (scope, currency, version, rate_bps, min_fee_cents, max_fee_cents,
     min_job_amount_cents, effective, notes)
  VALUES
    ('global','KES',3,
     1000,    -- fallback only; every job is priced by a band below
     0,       -- no fee floor, unchanged from v2
     NULL,    -- CAP REMOVED: the 5% band is the large-job protection now
     0,       -- no minimum job value, unchanged
     tstzrange(v_at, NULL, '[)'),
     'Owner-approved declining bands 15/12/10/7/5 by job value, flat-by-band. '
     'Cap removed: it bit inside the 7% band at KES 71,429 and made the 5% band '
     'unreachable. Floor stays at zero. Small jobs rise from 10% to 15%, '
     'confirmed intended.')
  RETURNING id INTO v_id;

  -- Boundaries in CENTS, contiguous with no gap. The owner-approved table is
  -- expressed in whole KES; in cents the first band must run to 99,999 so that
  -- KES 999.99 is still charged 15% and KES 1,000.00 is the first at 12%.
  INSERT INTO public.commission_bands (config_id, min_job_cents, max_job_cents, rate_bps) VALUES
    (v_id,         0,     99999, 1500),   -- KES       0.00 –     999.99  15%
    (v_id,    100000,    499999, 1200),   -- KES   1,000.00 –   4,999.99  12%
    (v_id,    500000,   1999999, 1000),   -- KES   5,000.00 –  19,999.99  10%
    (v_id,   2000000,   9999999,  700),   -- KES  20,000.00 –  99,999.99   7%
    (v_id,  10000000,      NULL,  500);   -- KES 100,000.00 and above      5%
END
$seed$;

-- ---------------------------------------------------------------- guards
DO $guard$
DECLARE
  v_id   uuid;
  n      integer;
  prev   bigint;
  r      record;
  fee    bigint;
  net    bigint;
  prevnet bigint := -1;
  bad    text;
BEGIN
  SELECT id INTO v_id FROM public.commission_config
   WHERE scope='global' AND currency='KES' AND version=3;
  IF v_id IS NULL THEN RAISE EXCEPTION 'commission_config v3 was not created'; END IF;

  -- (a) v3 must be the ACTIVE row, and must carry no cap.
  IF NOT EXISTS (SELECT 1 FROM public.commission_config_active('global','KES',now()) c
                  WHERE c.id = v_id) THEN
    RAISE EXCEPTION 'v3 exists but is not the active config';
  END IF;
  IF (SELECT max_fee_cents FROM public.commission_config WHERE id=v_id) IS NOT NULL THEN
    RAISE EXCEPTION 'v3 still carries a fee cap; the owner decision was to remove it';
  END IF;

  -- (b) Exactly the approved schedule, in order.
  SELECT count(*) INTO n FROM public.commission_bands WHERE config_id=v_id;
  IF n <> 5 THEN RAISE EXCEPTION 'expected 5 bands on v3, found %', n; END IF;

  SELECT string_agg(rate_bps::text, ',' ORDER BY min_job_cents) INTO bad
    FROM public.commission_bands WHERE config_id=v_id;
  IF bad <> '1500,1200,1000,700,500' THEN
    RAISE EXCEPTION 'band rates are % , expected 1500,1200,1000,700,500', bad;
  END IF;

  -- (c) Contiguous from zero, top unbounded. A gap would silently reprice a
  -- job at the config fallback instead of its band, and the EXCLUDE
  -- constraint only prevents OVERLAP, never a hole.
  prev := NULL;
  FOR r IN SELECT min_job_cents, max_job_cents FROM public.commission_bands
            WHERE config_id=v_id ORDER BY min_job_cents LOOP
    IF prev IS NULL THEN
      IF r.min_job_cents <> 0 THEN
        RAISE EXCEPTION 'bands start at % cents, not 0', r.min_job_cents;
      END IF;
    ELSIF r.min_job_cents <> prev + 1 THEN
      RAISE EXCEPTION 'gap or overlap: band starts at % but previous ended at %',
        r.min_job_cents, prev;
    END IF;
    prev := r.max_job_cents;
  END LOOP;
  IF prev IS NOT NULL THEN
    RAISE EXCEPTION 'the top band is bounded at %; it must be open-ended', prev;
  END IF;

  -- (d) History stays reproducible: the closed versions keep their own terms.
  IF (SELECT min_fee_cents FROM public.commission_config
       WHERE scope='global' AND currency='KES' AND version=1) <> 5000 THEN
    RAISE EXCEPTION 'v1 no longer carries its KES 50 floor; historical fees are unreproducible';
  END IF;
  IF (SELECT max_fee_cents FROM public.commission_config
       WHERE scope='global' AND currency='KES' AND version=2) <> 500000 THEN
    RAISE EXCEPTION 'v2 no longer carries its KES 5,000 cap; historical fees are unreproducible';
  END IF;

  -- (e) Behavioural, through the real function: each band and both sides of
  -- every boundary. Values are cents.
  FOR r IN
    SELECT * FROM (VALUES
      (    300.00::numeric,  4500::bigint, 'KES 300 at 15% -- p_total is MAJOR UNITS, not cents'),
      (    999.99::numeric, 15000::bigint, 'last cent of the 15% band'),
      (   1000.00::numeric, 12000::bigint, 'first cent of the 12% band'),
      (   4999.99::numeric, 60000::bigint, 'last cent of the 12% band'),
      (   5000.00::numeric, 50000::bigint, 'first cent of the 10% band'),
      (  19999.99::numeric, 200000::bigint,'last cent of the 10% band'),
      (  20000.00::numeric, 140000::bigint,'first cent of the 7% band'),
      (  99999.99::numeric, 700000::bigint,'last cent of the 7% band'),
      ( 100000.00::numeric, 500000::bigint,'first cent of the 5% band'),
      (1000000.00::numeric, 5000000::bigint,'no cap: 5% of a million, not KES 5,000')
    ) AS t(total, want, why)
  LOOP
    SELECT b.platform_fee_cents INTO fee
      FROM public.commission_breakdown(r.total,'global','KES',now()) b;
    IF fee IS DISTINCT FROM r.want THEN
      RAISE EXCEPTION 'commission_breakdown(%) = % cents, expected % -- %',
        r.total, fee, r.want, r.why;
    END IF;
  END LOOP;

  -- (f) The reason the cap had to go, asserted rather than asserted-in-prose.
  SELECT b.platform_fee_cents INTO fee
    FROM public.commission_breakdown(1000000.00,'global','KES',now()) b;
  IF fee <= 500000 THEN
    RAISE EXCEPTION 'a KES 1,000,000 job is still capped at or below KES 5,000 (% cents)', fee;
  END IF;

  -- (g) THE SILENT-FAILURE GUARD. commission_breakdown is SECURITY INVOKER, so
  -- it reads commission_bands as the CALLER. If anon cannot see the bands the
  -- function does not error -- it quietly COALESCEs to the config's 10% and
  -- every client is quoted the wrong fee. That is exactly the shape of defect
  -- this codebase has shipped before, so it is checked as anon, not as owner.
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;
  SELECT b.platform_fee_cents INTO fee
    FROM public.commission_breakdown(300.00,'global','KES',now()) b;
  -- ...and the loader's own RPC must return all five bands to a client, or
  -- TypeScript will price with the fallback while SQL prices with the bands.
  SELECT count(*) INTO n FROM public.commission_bands_active('global','KES',now());
  RESET ROLE;
  IF n <> 5 THEN
    RAISE EXCEPTION 'commission_bands_active returns % bands to anon, expected 5', n;
  END IF;
  IF fee IS DISTINCT FROM 4500 THEN
    RAISE EXCEPTION
      'as anon, a KES 300 job prices at % cents instead of 4500 -- the bands are not readable by clients', fee;
  END IF;
END
$guard$;
