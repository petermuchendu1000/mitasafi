-- create_tenancy must not SELECT columns it does not need.
--
-- THE DEFECT, AND HOW IT WAS NEARLY SHIPPED
--   20260364000000 (Part B) revokes table-level SELECT on public.tenants from
--   `authenticated` and grants back 20 columns by name, leaving notes,
--   blacklist_reason and metadata unreadable by any client.
--
--   create_tenancy is INVOKER rights, deliberately: identity_role_authority I7
--   forbids client-executable SECURITY DEFINER functions in public, and
--   tenancy_integrity T9 pins that choice. So its body runs with the caller's
--   privileges. Its tenant insert ended with
--       ... RETURNING *
--   and RETURNING * requires SELECT on EVERY column returned. With Part B
--   applied the caller holds 20 of 23, so the statement raises
--       ERROR: permission denied for table tenants
--   and a landlord can no longer add a tenant.
--
--   Measured, not reasoned about:
--       Part B applied     -> permission denied for table tenants
--       Part B reverted    -> returns {tenant_id, lease_id}
--   Identical fixture and identical call, as `SET ROLE authenticated`.
--
--   WHY THE EXISTING SUITE MISSED IT. tenancy_integrity_test.sql sets
--   request.jwt.claim.sub so auth.uid() resolves, but it never does
--   `SET ROLE authenticated`, so every assertion runs with postgres privileges.
--   auth.uid() and the current role are two different things, and a suite that
--   sets only the first cannot see a privilege failure at all. T10 and T11,
--   added alongside this migration, run as the real role.
--
-- THE FIX
--   The returned row was only ever read for its id: v_tenant.id twice, nothing
--   else. So return the id and nothing else. This is strictly less privilege
--   required, and it is the smallest change that closes the defect.
--
--   The LEASES insert below is deliberately left as RETURNING *. public.leases
--   has no column-level grants, so it is not affected, and widening this change
--   to a table that is not broken would be change without evidence. If leases
--   ever gets a column allowlist, this same edit is required there and T11 will
--   fail first.

CREATE OR REPLACE FUNCTION public.create_tenancy(p_unit_id uuid, p_tenant jsonb, p_lease jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid        uuid := auth.uid();
  v_unit       public.units%ROWTYPE;
  v_tenant_id  uuid;
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

  -- RETURNING id, not RETURNING *. See the header: under Part B's column
  -- allowlist, RETURNING * is a permission error for every client caller.
  EXECUTE format(
    'INSERT INTO public.tenants (%s) SELECT %s FROM jsonb_populate_record(NULL::public.tenants, $1) RETURNING id',
    v_cols, v_cols)
  USING v_payload INTO v_tenant_id;

  v_payload := (p_lease - 'id' - 'landlord_id' - 'unit_id' - 'tenant_id'
                        - 'created_at' - 'updated_at')
               || jsonb_build_object(
                    'landlord_id', v_uid,
                    'unit_id',     p_unit_id,
                    'tenant_id',   v_tenant_id
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
  RETURN jsonb_build_object('tenant_id', v_tenant_id, 'lease_id', v_lease.id);
END $function$;
