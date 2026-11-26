-- =============================================================================
-- Per-module access levels for staff, replacing three booleans
-- =============================================================================
-- WHAT WAS WRONG WITH 20260356000000
--   It gave staff three switches: maintenance, tenants, payments. Two of the
--   three were recorded and not granted, and the shape could not express what
--   a property manager actually is — someone who may edit leases but only
--   read invoices, say. A boolean cannot say "view but do not touch".
--
--   property_staff holds 0 rows in production, so the columns are replaced
--   outright rather than migrated around.
--
-- THE MODEL
--   One access level per module: 'all' (read and write), 'view' (read only),
--   'none'. Scope is still per-building, now with an explicit all_properties
--   flag so "every block, including ones added later" is a thing you can say.
--
-- WHAT IS ENFORCED, AND WHAT IS ONLY RECORDED
--   Enforced by the policies below: property, tenant, lease, invoice,
--   application, maintenance, listing.
--   Recorded only: reports, messaging, bank, settings, expense — because
--   MitaSafi has no reporting module, no messaging, no landlord bank
--   handling, no staff settings surface, and expenses ARE maintenance costs
--   (the same rows, governed by access_maintenance). The UI marks each of
--   those so nobody believes a stored level is doing work.
--
-- A COUPLING THAT IS REAL AND IS NOT HIDDEN
--   `tenants` has no building reference, and reaching one through `leases`
--   creates a policy cycle (see the tenants policy below). Tenant access is
--   therefore portfolio-wide: it requires all_properties and covers every
--   tenant of that landlord.
--
--   `payments` reaches a building only through its lease, so invoice
--   visibility does inherit lease visibility. That dependency is real, is
--   asserted in the suite, and is stated on the users page beside the control.
-- =============================================================================

-- The policies from 20260356000000 reference can_manage_maintenance, so they
-- must go before the column does — Postgres refuses the DROP otherwise, which
-- is how this was found.
DROP POLICY IF EXISTS buildings_staff_read   ON public.buildings;
DROP POLICY IF EXISTS units_staff_read       ON public.units;
DROP POLICY IF EXISTS maintenance_staff_read ON public.maintenance_requests;
DROP POLICY IF EXISTS maintenance_staff_update ON public.maintenance_requests;

-- THE THREE BOOLEANS ARE LEFT IN PLACE, DEAD, ON PURPOSE
--   Dropping them is the obvious move and it breaks replay. 20260356000000
--   is already applied to production and its policies reference
--   can_manage_maintenance; the idempotency checker re-applies every
--   migration in order, so 356 would run again against a schema where the
--   column had gone and fail with "column s.can_manage_maintenance does not
--   exist". Rewriting an applied migration to dodge that is worse than three
--   unused columns.
--
--   Nothing reads them: the policies below are built fresh and the assertion
--   at the foot of this file fails if any policy ever mentions one again.
COMMENT ON COLUMN public.property_staff.can_manage_maintenance IS
  'DEPRECATED by 20260357000000 — superseded by access_maintenance. Unused.';
COMMENT ON COLUMN public.property_staff.can_view_tenants IS
  'DEPRECATED by 20260357000000 — superseded by access_tenant. Unused.';
COMMENT ON COLUMN public.property_staff.can_record_payments IS
  'DEPRECATED by 20260357000000 — superseded by access_invoice. Unused.';

ALTER TABLE public.property_staff
  ADD COLUMN IF NOT EXISTS all_properties boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_property    text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_tenant      text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_lease       text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_invoice     text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_application text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_maintenance text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_listing     text NOT NULL DEFAULT 'none',
  -- Stored, not enforced. Named here so the UI has somewhere to put them and
  -- so turning them on later is a policy change, not a schema change.
  ADD COLUMN IF NOT EXISTS access_expense     text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_report      text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_messaging   text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_bank        text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS access_settings    text NOT NULL DEFAULT 'none',
  -- Empty array means every category.
  ADD COLUMN IF NOT EXISTS maintenance_categories text[] NOT NULL DEFAULT '{}';

DO $ck$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['access_property','access_tenant','access_lease',
      'access_invoice','access_application','access_maintenance',
      'access_listing','access_expense','access_report','access_messaging',
      'access_bank'] LOOP
    EXECUTE format(
      'ALTER TABLE public.property_staff DROP CONSTRAINT IF EXISTS ps_%s_check', c);
    EXECUTE format(
      'ALTER TABLE public.property_staff ADD CONSTRAINT ps_%s_check CHECK (%I IN (''all'',''view'',''none''))', c, c);
  END LOOP;
END
$ck$;

-- The role list grew with the presets: a lease manager and a view-only
-- co-owner are real jobs on a Kenyan portfolio, and 20260356000000 only
-- allowed caretaker/manager/accountant. 'custom' is stored when the landlord
-- sets the levels by hand rather than taking a preset.
ALTER TABLE public.property_staff DROP CONSTRAINT IF EXISTS property_staff_role_check;
ALTER TABLE public.property_staff
  ADD CONSTRAINT property_staff_role_check
  CHECK (staff_role IN ('caretaker','manager','accountant','lease_manager','owner','custom'));

ALTER TABLE public.property_staff DROP CONSTRAINT IF EXISTS ps_access_settings_check;
ALTER TABLE public.property_staff
  ADD CONSTRAINT ps_access_settings_check
  CHECK (access_settings IN ('all','limited','none'));

-- -----------------------------------------------------------------------------
-- Close a hole inherited from 20260356000000
-- -----------------------------------------------------------------------------
-- That migration granted INSERT and UPDATE at TABLE level on property_staff,
-- which includes user_id. RLS pins landlord_id to the caller, but nothing
-- stopped a landlord writing an arbitrary user_id — attaching a staff record,
-- and therefore access to their blocks, to an account that never gave a phone
-- number and never agreed to anything. The link is supposed to be made by the
-- trigger, from a number the landlord actually holds.
--
-- A column-level GRANT is inert while the table-level grant is held, so the
-- table grants are dropped first and the permitted columns granted back by
-- name (the same shape as 20260329000000 on profiles). The assertion at the
-- foot of this file failed on the first run because of exactly this.
REVOKE INSERT, UPDATE ON public.property_staff FROM anon, authenticated;

DO $grant$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='property_staff'
     AND column_name NOT IN ('id','landlord_id','user_id','created_at','updated_at','invited_at','accepted_at');
  EXECUTE format('GRANT UPDATE (%s) ON public.property_staff TO authenticated', cols);
  -- INSERT too: landlord_id is filled by the trigger from auth.uid(), and
  -- user_id only ever by the trigger's phone match.
  EXECUTE format('GRANT INSERT (%s) ON public.property_staff TO authenticated', cols);
END
$grant$;

-- =============================================================================
-- Policies. One scope rule, applied per module at the declared level.
-- =============================================================================
-- (the stale policies were dropped at the top of this file, before the
--  columns they referenced were removed)

-- EVERY POLICY BELOW CARRIES AN EXPLICIT LANDLORD MATCH, AND HERE IS WHY
--   The first draft scoped with `(s.all_properties OR id = ANY(building_ids))`
--   and nothing else. With all_properties set that predicate has no landlord
--   term at all, so it matched EVERY ROW IN THE TABLE — the suite caught a
--   caretaker reading another landlord's block. "All properties" means all of
--   THIS landlord's properties; the join to s.landlord_id is what says so.
-- ---- property ---------------------------------------------------------------
-- READ IS A PRECONDITION, NOT A MODULE
--   Every other module's rows hang off a unit: a maintenance job, a lease, a
--   listing. A policy on those tables that joins `units` is itself subject to
--   the units policy, so if unit visibility required access_property, then
--   Innago's own "Maintenance Staff — Property: None" preset would see
--   nothing at all. The first draft of this migration had exactly that bug.
--
--   So the building and unit ROWS are readable when ANY enforced module is
--   granted, because you cannot show a job without the unit it is in.
--   access_property is what governs the Properties module itself: whether
--   they may EDIT a building or unit, which is the next policy down.
CREATE POLICY buildings_staff_read ON public.buildings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND (s.access_property IN ('all','view')
            OR s.access_maintenance <> 'none'
            OR s.access_lease <> 'none'
            OR s.access_invoice <> 'none'
            OR s.access_tenant <> 'none'
            OR s.access_listing <> 'none'
            OR s.access_application <> 'none')
       AND buildings.landlord_id = s.landlord_id
       AND (s.all_properties OR buildings.id = ANY (s.building_ids))));

DROP POLICY IF EXISTS buildings_staff_update ON public.buildings;
CREATE POLICY buildings_staff_update ON public.buildings
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_property = 'all'
       AND buildings.landlord_id = s.landlord_id
       AND (s.all_properties OR buildings.id = ANY (s.building_ids))));

-- Same precondition rule as buildings, for the same reason.
CREATE POLICY units_staff_read ON public.units
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND (s.access_property IN ('all','view')
            OR s.access_maintenance <> 'none'
            OR s.access_lease <> 'none'
            OR s.access_invoice <> 'none'
            OR s.access_tenant <> 'none'
            OR s.access_listing <> 'none'
            OR s.access_application <> 'none')
       AND units.landlord_id = s.landlord_id
       AND (s.all_properties OR units.building_id = ANY (s.building_ids))));

DROP POLICY IF EXISTS units_staff_update ON public.units;
CREATE POLICY units_staff_update ON public.units
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_property = 'all'
       AND units.landlord_id = s.landlord_id
       AND (s.all_properties OR units.building_id = ANY (s.building_ids))));

-- ---- maintenance ------------------------------------------------------------
-- An empty maintenance_categories array means every category; a non-empty one
-- restricts to those, which is how "Specific Categories" is expressed.
CREATE POLICY maintenance_staff_read ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.units u ON u.id = maintenance_requests.unit_id
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_maintenance IN ('all','view')
       AND maintenance_requests.landlord_id = s.landlord_id
       AND (s.all_properties OR u.building_id = ANY (s.building_ids))
       AND (cardinality(s.maintenance_categories) = 0
            OR maintenance_requests.category = ANY (s.maintenance_categories))));

CREATE POLICY maintenance_staff_update ON public.maintenance_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.units u ON u.id = maintenance_requests.unit_id
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_maintenance = 'all'
       AND maintenance_requests.landlord_id = s.landlord_id
       AND (s.all_properties OR u.building_id = ANY (s.building_ids))
       AND (cardinality(s.maintenance_categories) = 0
            OR maintenance_requests.category = ANY (s.maintenance_categories))));

-- ---- leases -----------------------------------------------------------------
DROP POLICY IF EXISTS leases_staff_read ON public.leases;
CREATE POLICY leases_staff_read ON public.leases
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.units u ON u.id = leases.unit_id
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_lease IN ('all','view')
       AND leases.landlord_id = s.landlord_id
       AND (s.all_properties OR u.building_id = ANY (s.building_ids))));

DROP POLICY IF EXISTS leases_staff_update ON public.leases;
CREATE POLICY leases_staff_update ON public.leases
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.units u ON u.id = leases.unit_id
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_lease = 'all'
       AND leases.landlord_id = s.landlord_id
       AND (s.all_properties OR u.building_id = ANY (s.building_ids))));

-- ---- tenants ----------------------------------------------------------------
-- TENANT ACCESS IS PORTFOLIO-WIDE OR NOTHING, AND HERE IS WHY
--   A tenant has no building. The only route from a tenant to a block runs
--   through their lease — and `leases` already carries "Tenants can view own
--   leases", whose predicate reads `tenants`. A tenants policy that reads
--   leases therefore closes a loop: tenants -> leases -> tenants. Postgres
--   says so plainly: "infinite recursion detected in policy for relation
--   tenants", and it brought down an unrelated SELECT on maintenance_requests
--   as collateral.
--
--   So this policy touches no other table. Without the lease it cannot narrow
--   a tenant to a block, which leaves one honest rule: tenant access requires
--   all_properties. Granting someone sight of your tenants covers every
--   tenant you have, and the users page says exactly that beside the control.
--   The alternative — pretending a per-block tenant scope exists — would be a
--   boundary that silently is not one.
DROP POLICY IF EXISTS tenants_staff_read ON public.tenants;
CREATE POLICY tenants_staff_read ON public.tenants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_tenant IN ('all','view')
       AND s.all_properties
       AND tenants.created_by = s.landlord_id));

-- ---- invoices / payments ----------------------------------------------------
DROP POLICY IF EXISTS payments_staff_read ON public.payments;
CREATE POLICY payments_staff_read ON public.payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_invoice IN ('all','view')
       AND EXISTS (SELECT 1 FROM public.leases l
                    WHERE l.id = payments.lease_id
                      AND l.landlord_id = s.landlord_id)));

-- ---- listings ---------------------------------------------------------------
DROP POLICY IF EXISTS listings_staff_read ON public.listings;
CREATE POLICY listings_staff_read ON public.listings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_listing IN ('all','view')
       AND listings.landlord_id = s.landlord_id
       AND (s.all_properties
            OR listings.building_id = ANY (s.building_ids)
            OR EXISTS (SELECT 1 FROM public.units u
                        WHERE u.id = listings.unit_id
                          AND u.building_id = ANY (s.building_ids)))));

-- ---- applications -----------------------------------------------------------
DROP POLICY IF EXISTS applications_staff_read ON public.rental_applications;
CREATE POLICY applications_staff_read ON public.rental_applications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.listings l ON l.id = rental_applications.listing_id
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_application IN ('all','view')
       AND rental_applications.landlord_id = s.landlord_id
       AND (s.all_properties
            OR l.building_id = ANY (s.building_ids)
            OR EXISTS (SELECT 1 FROM public.units u
                        WHERE u.id = l.unit_id
                          AND u.building_id = ANY (s.building_ids)))));

-- =============================================================================
-- Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
DECLARE n int; c text;
BEGIN
  -- The booleans may still exist (see the note above) but NOTHING may read
  -- them. This is the assertion that keeps them dead rather than merely old.
  IF EXISTS (
    SELECT 1 FROM pg_policy p
     WHERE coalesce(pg_get_expr(p.polqual, p.polrelid),'')
           ~ '(can_manage_maintenance|can_view_tenants|can_record_payments)') THEN
    RAISE EXCEPTION 'FAILED: a policy still reads a deprecated permission boolean';
  END IF;

  FOREACH c IN ARRAY ARRAY['access_property','access_tenant','access_lease',
      'access_invoice','access_application','access_maintenance','access_listing'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='property_staff'
                      AND column_name=c) THEN
      RAISE EXCEPTION 'FAILED: % is missing', c;
    END IF;
  END LOOP;

  -- Every enforced module has at least a read policy naming property_staff.
  SELECT count(DISTINCT c2.relname) INTO n
    FROM pg_policy p JOIN pg_class c2 ON c2.oid = p.polrelid
   WHERE coalesce(pg_get_expr(p.polqual, p.polrelid),'') ILIKE '%property_staff%'
     AND c2.relname IN ('buildings','units','maintenance_requests','leases',
                        'tenants','payments','listings','rental_applications');
  IF n <> 8 THEN
    RAISE EXCEPTION 'FAILED: expected staff policies on 8 tables, found %', n;
  END IF;

  -- Nothing may be written by a client on this table except via the landlord's
  -- own policy; the identity columns stay out of reach.
  IF has_column_privilege('authenticated','public.property_staff','landlord_id','UPDATE')
     OR has_column_privilege('authenticated','public.property_staff','user_id','UPDATE') THEN
    RAISE EXCEPTION 'FAILED: a client can reassign staff identity';
  END IF;
  IF NOT has_column_privilege('authenticated','public.property_staff','access_lease','UPDATE') THEN
    RAISE EXCEPTION 'OVERREACH: the landlord cannot set an access level';
  END IF;

  -- anon still reaches nothing.
  IF has_table_privilege('anon','public.property_staff','SELECT') THEN
    RAISE EXCEPTION 'FAILED: anon can read staff';
  END IF;

  RAISE NOTICE 'staff access levels installed across 8 tables.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DROP POLICY buildings_staff_update ON public.buildings;
--   DROP POLICY units_staff_update ON public.units;
--   DROP POLICY leases_staff_read, leases_staff_update ON public.leases;
--   DROP POLICY tenants_staff_read ON public.tenants;
--   DROP POLICY payments_staff_read ON public.payments;
--   DROP POLICY listings_staff_read ON public.listings;
--   DROP POLICY applications_staff_read ON public.rental_applications;
--   ALTER TABLE public.property_staff DROP COLUMN access_property, ... ;
--   (and restore the three booleans from 20260356000000)
-- =============================================================================
