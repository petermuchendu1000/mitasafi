-- =============================================================================
-- Tenancy integrity: one unit number per building, and one atomic tenancy write
-- =============================================================================
-- MEASURED STATE BEFORE THIS MIGRATION
--
-- Both gaps were found by driving the product, not by reading it.
--
-- GAP 1 -- NOTHING STOPS TWO UNITS SHARING A NUMBER
--
--   units has exactly one unique index: units_pkey on (id). There is no
--   constraint on (building_id, unit_number). Verified against a schema built
--   from scratch by scripts/ci/local-pg.sh, which applies all 117 migrations:
--
--     units_pkey | t | CREATE UNIQUE INDEX units_pkey ON public.units (id)
--     ...every other index on units is non-unique...
--
--   This was not theoretical. Driving the add-unit form created a second
--   "C301-TEST" in the same building with a different type and rent. The
--   building grid, the rent table and the arrears list each then show two rows
--   a landlord cannot tell apart, and a payment can be recorded against the
--   wrong one.
--
--   src/app/dashboard/landlord/buildings/[id]/units/actions.ts already refuses
--   this in the one-landlord-one-form case, and says plainly that it is not a
--   substitute for the constraint because two submits racing each other both
--   pass it. Its 23505 branches were left in place so that adding the
--   constraint would need no code change. This adds it.
--
-- GAP 2 -- CREATING A TENANCY IS THREE WRITES WITH COMPENSATION
--
--   createTenancy() in units/[unitId]/actions.ts does:
--
--     1. INSERT tenants                 (on failure: stop)
--     2. INSERT leases                  (on failure: DELETE the tenant)
--     3. UPDATE units SET occupied      (on failure: DELETE lease, DELETE tenant)
--
--   Compensation is not a transaction. It cannot cover:
--     - the process dying between 1 and 2, leaving a tenant attached to nothing
--     - a compensating DELETE itself failing, leaving exactly the orphan it
--       was meant to remove
--     - two requests racing: both read "no live lease", both insert one, and
--       the unit ends with two live leases, which double-counts rent on every
--       page that sums them
--
--   The live-lease check sits outside any lock, so the third case is a real
--   race and not a hypothetical one.
--
-- WHY THE INDEX IS ON AN EXPRESSION AND NOT ON THE RAW COLUMN
--
--   The application treats unit numbers as case- and space-insensitive:
--
--     const normalise = (s) => s.replace(/\s+/g, "").toLowerCase();
--
--   so "a 101", "A101" and "a101" are one unit to it. A plain
--   UNIQUE (building_id, unit_number) would be WEAKER than the code it is
--   meant to back: it would happily store "A101" and "a101" side by side,
--   which is the exact pair the form already refuses. The index therefore
--   normalises the same way.
--
--   Postgres \s and JavaScript \s are not byte-identical in their Unicode
--   edges. For the ASCII space, tab and newline a landlord can actually type,
--   they agree.
--
-- WHY THE INDEX IS PARTIAL
--
--   units.building_id is NULLABLE. In a UNIQUE index NULLs are distinct, so
--   rows with no building never conflict with each other anyway; WHERE
--   building_id IS NOT NULL says that out loud rather than leaving a reader to
--   work it out. A unit belonging to no building is in no building's
--   numbering, which is also how the application's own check behaves -- it
--   filters on building_id before comparing.
--
-- APPLICABILITY, CHECKED BEFORE WRITING THIS
--
--   Production holds 6 units: A101, A102, A201, A202, W1, W2. Zero duplicates
--   under the raw comparison AND zero under the normalised one. The index can
--   be created today without cleaning anything up.
--
--   It will not always be so. If duplicates exist the CREATE INDEX fails with
--   a bare 23505 naming neither row, so the guard below looks first and raises
--   a message that names the building and the number.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- GAP 1: one unit number per building
-- -----------------------------------------------------------------------------

-- Look before leaping, so a failure names the offender instead of saying 23505.
DO $$
DECLARE
  v_offenders text;
BEGIN
  SELECT string_agg(
           format('building %s has %s units numbered like %L',
                  building_id, n, sample),
           E'\n')
    INTO v_offenders
  FROM (
    SELECT building_id,
           count(*) AS n,
           min(unit_number) AS sample
    FROM public.units
    WHERE building_id IS NOT NULL
    GROUP BY building_id, lower(regexp_replace(unit_number, '\s+', '', 'g'))
    HAVING count(*) > 1
  ) dupes;

  IF v_offenders IS NOT NULL THEN
    RAISE EXCEPTION
      'tenancy_integrity: cannot add the unit-number constraint, duplicates exist:%s%s',
      E'\n', v_offenders
      USING HINT = 'Renumber or remove the duplicate units, then re-run this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS units_building_unit_number_key
  ON public.units (
    building_id,
    lower(regexp_replace(unit_number, '\s+', '', 'g'))
  )
  WHERE building_id IS NOT NULL;

COMMENT ON INDEX public.units_building_unit_number_key IS
  'One unit number per building, compared the way the application compares '
  'them: whitespace removed, lower-cased. Partial because building_id is '
  'nullable and a unit with no building is in no building''s numbering.';

-- -----------------------------------------------------------------------------
-- GAP 2: one atomic tenancy write
-- -----------------------------------------------------------------------------
--
-- SECURITY INVOKER, deliberately.
--
-- The first version of this was SECURITY DEFINER with EXECUTE granted to
-- `authenticated`, on the reasoning that three existing definer RPCs
-- (get_landlord_portfolio_stats, get_building_stats, get_unit_payment_history)
-- are unreachable from a user session because EXECUTE is revoked from them.
-- Two repo guards rejected it: identity_role_authority_test I7 ("no definer
-- function is client-executable", one documented exception) and
-- client_write_surface_test. Those revocations are not an oversight; they are
-- an enforced policy, and my earlier reading of them as a defect was wrong.
--
-- Invoker is also simply better here. The three writes this replaces are
-- already performed from an ordinary landlord session, so RLS already permits
-- them: running as the caller gives exactly today's permissions, adds no
-- elevation, and still gets atomicity, because one function call is one
-- statement and therefore one transaction. search_path stays pinned as
-- hygiene.
--
-- The unit row is locked FOR UPDATE before the live-lease check. That is the
-- whole point: it serialises two concurrent tenancies on the same unit, so the
-- second one sees the first one's lease instead of racing past the check.

CREATE OR REPLACE FUNCTION public.create_tenancy(
  p_unit_id uuid,
  p_tenant  jsonb,
  p_lease   jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_unit       public.units%ROWTYPE;
  v_tenant     public.tenants%ROWTYPE;
  v_lease      public.leases%ROWTYPE;
  v_live_count integer;
  v_payload    jsonb;
  v_cols       text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'create_tenancy: not signed in'
      USING ERRCODE = '28000';
  END IF;

  -- Ownership and the lock in one statement. Under invoker rights RLS already
  -- hides other landlords' units, so this is belt and braces rather than the
  -- only check -- and a unit belonging to someone else stays indistinguishable
  -- from one that does not exist.
  SELECT * INTO v_unit
  FROM public.units
  WHERE id = p_unit_id AND landlord_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'create_tenancy: unit not found on this account'
      USING ERRCODE = 'P0002';
  END IF;

  -- Safe now: nobody else can be between their check and their insert on this
  -- unit, because they are waiting on the row above.
  SELECT count(*) INTO v_live_count
  FROM public.leases
  WHERE unit_id = p_unit_id
    AND status IN ('active', 'pending_signature');

  IF v_live_count > 0 THEN
    RAISE EXCEPTION 'create_tenancy: unit % already has a live lease', v_unit.unit_number
      USING ERRCODE = '23505';
  END IF;

  -- The caller supplies column values as jsonb. Two things matter here.
  --
  -- 1. Keys that decide WHO the row belongs to are stripped and set from the
  --    session, not taken on trust.
  -- 2. Only the columns actually supplied are written.
  --
  -- The second point is not pedantry. The obvious implementation --
  -- jsonb_populate_record into a %ROWTYPE and INSERT ... VALUES (rec.*) --
  -- writes an explicit NULL for every column the caller did not mention, so
  -- the column DEFAULTS never fire. The first version of this function did
  -- exactly that and failed on tenants.id, which has DEFAULT gen_random_uuid();
  -- it would equally have nulled status and every other defaulted column. The
  -- behavioural test caught it; the structural guards could not.
  --
  -- The column list is built from the catalogue, not from the payload, so a
  -- caller cannot inject through a key name. Unknown keys are simply dropped.
  v_payload := (p_tenant - 'id' - 'created_by' - 'created_at' - 'updated_at')
               || jsonb_build_object('created_by', v_uid);
  SELECT string_agg(quote_ident(c.column_name), ', ')
    INTO v_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'tenants'
    AND v_payload ? c.column_name;

  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'create_tenancy: no recognisable tenant columns supplied'
      USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'INSERT INTO public.tenants (%s) SELECT %s FROM jsonb_populate_record(NULL::public.tenants, $1) RETURNING *',
    v_cols, v_cols)
  USING v_payload INTO v_tenant;

  v_payload := (p_lease - 'id' - 'landlord_id' - 'unit_id' - 'tenant_id'
                        - 'created_at' - 'updated_at')
               || jsonb_build_object(
                    'landlord_id', v_uid,
                    'unit_id',     p_unit_id,
                    'tenant_id',   v_tenant.id
                  );
  SELECT string_agg(quote_ident(c.column_name), ', ')
    INTO v_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'leases'
    AND v_payload ? c.column_name;

  EXECUTE format(
    'INSERT INTO public.leases (%s) SELECT %s FROM jsonb_populate_record(NULL::public.leases, $1) RETURNING *',
    v_cols, v_cols)
  USING v_payload INTO v_lease;

  UPDATE public.units
     SET status = 'occupied'
   WHERE id = p_unit_id AND landlord_id = v_uid;

  -- One transaction: either all three rows exist or none do. No compensation
  -- to fail, and nothing for a crash to leave half-done.
  RETURN jsonb_build_object('tenant_id', v_tenant.id, 'lease_id', v_lease.id);
END $$;

COMMENT ON FUNCTION public.create_tenancy(uuid, jsonb, jsonb) IS
  'Create tenant + lease and mark the unit occupied, atomically. Replaces '
  'three separate writes with hand-rolled compensation that could not survive '
  'a crash between them, and whose live-lease check raced. SECURITY INVOKER: '
  'it adds no privilege, it only makes the existing writes one transaction.';

REVOKE ALL ON FUNCTION public.create_tenancy(uuid, jsonb, jsonb)
  FROM PUBLIC, anon;

-- A landlord's own session calls this, so `authenticated` holds EXECUTE. That
-- is safe precisely because the function is INVOKER: it can do nothing the
-- caller could not already do by hand, one statement at a time.
GRANT EXECUTE ON FUNCTION public.create_tenancy(uuid, jsonb, jsonb)
  TO authenticated;

-- -----------------------------------------------------------------------------
-- Guards
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_ok boolean;
BEGIN
  -- 1. the index exists, is unique, is partial, and normalises
  SELECT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname = 'units_building_unit_number_key'
      AND i.indisunique
      AND i.indpred IS NOT NULL
  ) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'tenancy_integrity: the unit-number index is missing, not unique, or not partial';
  END IF;

  IF pg_get_indexdef('public.units_building_unit_number_key'::regclass) NOT LIKE '%regexp_replace%' THEN
    RAISE EXCEPTION 'tenancy_integrity: the unit-number index does not normalise whitespace';
  END IF;

  -- 2. the function exists and is NOT SECURITY DEFINER. identity_role_authority
  --    I7 requires that no definer function be client-executable, and this one
  --    is client-executable by design, so it must not be a definer.
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_tenancy'
  ) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'create_tenancy is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_tenancy' AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'create_tenancy is SECURITY DEFINER and client-executable, which reopens the definer surface';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_tenancy'
      AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
  ) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'create_tenancy has no pinned search_path';
  END IF;

  -- 3. a signed-in landlord can actually call it. This is the guard that the
  --    three unreachable RPCs on this project would have failed.
  IF NOT has_function_privilege(
       'authenticated',
       'public.create_tenancy(uuid, jsonb, jsonb)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'create_tenancy: authenticated cannot EXECUTE it, so no landlord session can use it';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.create_tenancy(uuid, jsonb, jsonb)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'create_tenancy: anon can EXECUTE it';
  END IF;

  RAISE NOTICE 'tenancy_integrity: unit-number index and atomic create_tenancy installed, guards passed';
END $$;

COMMIT;
