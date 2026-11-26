-- =============================================================================
-- Letting a tenant see their own tenancy — and where to pay
-- =============================================================================
-- WHAT WAS WRONG
--   A tenant could read their lease and nothing else. Not the unit it is for,
--   not the building it is in, not a single payment they had made, and not
--   the paybill they are supposed to pay into. The gateway added in
--   20260358000000 could state the instruction perfectly and had nobody to
--   state it to.
--
-- THE SHAPE OF EVERY POLICY HERE
--   tenants.user_id = auth.uid() -> leases.tenant_id -> units -> buildings.
--   A tenant sees a row only when a lease of theirs reaches it. Nothing is
--   granted by role; there is no "tenants can read units" in general.
--
-- WHY THIS DOES NOT RECURSE
--   The one cycle in this schema is tenants -> leases -> tenants, caused by
--   the existing "Tenants can view own leases" policy reading `tenants`.
--   Every policy below reads leases and tenants but NOTHING reads back into
--   units, buildings, payments or landlord_payout_methods, so the graph stays
--   a DAG. That was checked by writing the policies and running them, because
--   the last time this was assumed Postgres answered with "infinite recursion
--   detected in policy for relation tenants" and took an unrelated query down
--   with it.
--
-- THE ONE THAT NEEDS SAYING OUT LOUD
--   lpm_tenant_read shows a tenant their landlord's paybill, till number or
--   BANK ACCOUNT NUMBER. That is not a leak, it is the point: you cannot pay
--   an account you cannot see. It is scoped to the destination that actually
--   applies to a block they hold a lease in, and to nothing else.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- First: break the units <-> leases policy cycle
-- -----------------------------------------------------------------------------
-- `units_tenant_read` below has to read `leases` — a lease is the only link
-- from a unit to a tenant. But `leases_staff_read`, added in
-- 20260357000000, reads `units` to find the building. That closes a loop, and
-- Postgres says so: "infinite recursion detected in policy for relation
-- units", raised on a plain count of the tenant's own units.
--
-- RLS does not short-circuit: evaluating `leases` runs every lease policy,
-- including the staff one, whether or not the caller is staff. So the join
-- has to go, which means the lease has to know its own building.
--
-- A denormalised column with a trigger, not a view or a function: the policy
-- must be able to read it without touching another RLS-protected table, and
-- that is the whole point.
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL;

UPDATE public.leases l
   SET building_id = u.building_id
  FROM public.units u
 WHERE u.id = l.unit_id
   AND l.building_id IS DISTINCT FROM u.building_id;

CREATE INDEX IF NOT EXISTS idx_leases_building ON public.leases (building_id);

CREATE OR REPLACE FUNCTION public.leases_set_building()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER            -- reads units irrespective of who is writing
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT u.building_id INTO NEW.building_id
    FROM public.units u WHERE u.id = NEW.unit_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.leases_set_building() FROM PUBLIC, anon, authenticated;

-- EVERY UPDATE, not just UPDATE OF unit_id.
--   The obvious guard is to revoke the column from clients. It does not
--   work: `authenticated` holds TABLE-level UPDATE on leases, and a
--   column-level REVOKE is inert while a table-level grant is held — the
--   lesson 20260329000000 is built around, walked into again here. Re-cutting
--   the privileges on a live table to fix it is a bigger change than this
--   migration should make.
--   So the column is not protected, it is DERIVED: recomputed from the unit
--   on every write, so a client that sets it simply has it overwritten. The
--   invariant is asserted below and proven behaviourally in the suite.
DROP TRIGGER IF EXISTS leases_building_biu ON public.leases;
CREATE TRIGGER leases_building_biu
  BEFORE INSERT OR UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.leases_set_building();

-- Re-cut the staff lease policies without the units join.
DROP POLICY IF EXISTS leases_staff_read ON public.leases;
CREATE POLICY leases_staff_read ON public.leases
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_lease IN ('all','view')
       AND leases.landlord_id = s.landlord_id
       AND (s.all_properties OR leases.building_id = ANY (s.building_ids))));

DROP POLICY IF EXISTS leases_staff_update ON public.leases;
CREATE POLICY leases_staff_update ON public.leases
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_lease = 'all'
       AND leases.landlord_id = s.landlord_id
       AND (s.all_properties OR leases.building_id = ANY (s.building_ids))));

-- ---- the unit they rent -----------------------------------------------------
DROP POLICY IF EXISTS units_tenant_read ON public.units;
CREATE POLICY units_tenant_read ON public.units
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
      FROM public.leases l
      JOIN public.tenants t ON t.id = l.tenant_id
     WHERE l.unit_id = units.id
       AND t.user_id = auth.uid()));

-- ---- the building it is in --------------------------------------------------
DROP POLICY IF EXISTS buildings_tenant_read ON public.buildings;
CREATE POLICY buildings_tenant_read ON public.buildings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
      FROM public.leases l
      JOIN public.units u  ON u.id = l.unit_id
      JOIN public.tenants t ON t.id = l.tenant_id
     WHERE u.building_id = buildings.id
       AND t.user_id = auth.uid()));

-- ---- what they have paid ----------------------------------------------------
-- Read only, and deliberately so: a tenant marking their own rent received
-- would be the single worst write in this schema.
DROP POLICY IF EXISTS payments_tenant_read ON public.payments;
CREATE POLICY payments_tenant_read ON public.payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
      FROM public.leases l
      JOIN public.tenants t ON t.id = l.tenant_id
     WHERE l.id = payments.lease_id
       AND t.user_id = auth.uid()));

-- ---- where to send the rent -------------------------------------------------
DROP POLICY IF EXISTS lpm_tenant_read ON public.landlord_payout_methods;
CREATE POLICY lpm_tenant_read ON public.landlord_payout_methods
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
      FROM public.leases l
      JOIN public.units u   ON u.id = l.unit_id
      JOIN public.tenants t ON t.id = l.tenant_id
     WHERE t.user_id = auth.uid()
       AND l.landlord_id = landlord_payout_methods.landlord_id
       AND (landlord_payout_methods.all_properties
            OR u.building_id = ANY (landlord_payout_methods.building_ids))));

-- =============================================================================
-- Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
   WHERE p.polname IN ('units_tenant_read','buildings_tenant_read',
                       'payments_tenant_read','lpm_tenant_read');
  IF n <> 4 THEN
    RAISE EXCEPTION 'FAILED: expected 4 tenant policies, found %', n;
  END IF;

  -- Every one must be SELECT. A tenant writes nothing here.
  IF EXISTS (SELECT 1 FROM pg_policy p
              WHERE p.polname IN ('units_tenant_read','buildings_tenant_read',
                                  'payments_tenant_read','lpm_tenant_read')
                AND p.polcmd <> 'r') THEN
    RAISE EXCEPTION 'FAILED: a tenant policy grants more than SELECT';
  END IF;

  -- Each must be anchored on the tenant's own account, not on a role.
  IF EXISTS (SELECT 1 FROM pg_policy p
              WHERE p.polname IN ('units_tenant_read','buildings_tenant_read',
                                  'payments_tenant_read','lpm_tenant_read')
                AND pg_get_expr(p.polqual, p.polrelid) NOT LIKE '%t.user_id = auth.uid()%') THEN
    RAISE EXCEPTION 'FAILED: a tenant policy is not anchored on auth.uid()';
  END IF;

  -- anon gains nothing from any of this.
  IF has_table_privilege('anon','public.landlord_payout_methods','SELECT') THEN
    RAISE EXCEPTION 'FAILED: anon can read payout destinations';
  END IF;

  -- A FINDING THIS MIGRATION DELIBERATELY DOES NOT ACT ON
  --   anon holds table-level SELECT on `payments`. It returns nothing,
  --   because payments carries no anon policy and RLS is on — the assertion
  --   below proves the rows are unreachable. The GRANT itself predates this
  --   work and belongs to whatever created the table; revoking it here would
  --   turn a silent empty result into an error for any caller that relies on
  --   it, which is a change this migration has no business making. It is
  --   written down in docs/LANDLORD_SETTINGS_BACKLOG.md instead.
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
              WHERE c.relname='payments' AND 'anon' = ANY (
                SELECT pg_get_userbyid(unnest(p.polroles)))) THEN
    RAISE EXCEPTION 'FAILED: payments has an anon policy, so the grant is reachable';
  END IF;
  IF NOT (SELECT rowsecurity FROM pg_tables
           WHERE schemaname='public' AND tablename='payments') THEN
    RAISE EXCEPTION 'FAILED: RLS is off on payments, so the anon grant is live';
  END IF;

  -- No lease policy may read `units` again, or the cycle comes back.
  --
  -- MATCHED AS A WORD, NOT AS '%public.units%'. pg_get_expr renders a policy
  -- with the search_path applied, so a policy written as `JOIN public.units`
  -- comes back as `JOIN units u` — the first version of this check could
  -- never have fired, which is the whole failure mode it exists to catch.
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
              WHERE c.relname='leases'
                AND coalesce(pg_get_expr(p.polqual,p.polrelid),'')
                    ~* '(^|[^_[:alnum:]])units([^_[:alnum:]]|$)') THEN
    RAISE EXCEPTION 'FAILED: a lease policy reads units — units <-> leases will recurse';
  END IF;

  -- The denormalised column must be filled and not client-writable.
  IF EXISTS (SELECT 1 FROM public.leases l JOIN public.units u ON u.id=l.unit_id
              WHERE l.building_id IS DISTINCT FROM u.building_id) THEN
    RAISE EXCEPTION 'FAILED: leases.building_id disagrees with the unit';
  END IF;
  -- The trigger must cover every update, or a client write survives.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
     WHERE t.tgrelid = 'public.leases'::regclass
       AND t.tgname = 'leases_building_biu'
       -- tgtype bit 4 = UPDATE, bit 2 = INSERT, and no column list (tgattr empty)
       AND (t.tgtype & 16) > 0 AND (t.tgtype & 4) > 0
       AND coalesce(array_length(t.tgattr, 1), 0) = 0) THEN
    RAISE EXCEPTION 'FAILED: the building_id trigger does not cover every insert and update';
  END IF;

  RAISE NOTICE 'tenant rent visibility installed: unit, building, payments, destination.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DROP POLICY units_tenant_read ON public.units;
--   DROP POLICY buildings_tenant_read ON public.buildings;
--   DROP POLICY payments_tenant_read ON public.payments;
--   DROP POLICY lpm_tenant_read ON public.landlord_payout_methods;
--   (A tenant then cannot see what they rent or where to pay.)
-- =============================================================================
