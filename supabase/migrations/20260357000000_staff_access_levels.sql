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

-- =============================================================================
-- Folded in: the detail the users/settings screens actually need
-- =============================================================================
-- These belong in this file rather than a new one because 20260357000000 has
-- not been applied anywhere yet. Adding a 358 to patch an unapplied 357 would
-- be history theatre.
-- -----------------------------------------------------------------------------

-- ---- a staff member has a first and a last name -----------------------------
-- full_name is KEPT and maintained by the trigger rather than dropped: it is
-- what 20260356000000 created, several policies and the app read it, and a
-- generated-column rebuild would make 356 unreplayable for a second time.
ALTER TABLE public.property_staff
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text;

UPDATE public.property_staff
   SET first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
       last_name  = COALESCE(last_name,
                      NULLIF(substr(full_name, strpos(full_name, ' ') + 1), full_name))
 WHERE first_name IS NULL OR last_name IS NULL;

-- ---- the maintenance scope is a MODE, not an inference ----------------------
-- An empty category array meant "all", which is the same value as "specific,
-- none chosen yet" — two different intentions with one representation. The
-- mode says which is meant.
ALTER TABLE public.property_staff
  ADD COLUMN IF NOT EXISTS maintenance_category_mode text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS allow_custom_category boolean NOT NULL DEFAULT false;

ALTER TABLE public.property_staff DROP CONSTRAINT IF EXISTS ps_cat_mode_check;
ALTER TABLE public.property_staff
  ADD CONSTRAINT ps_cat_mode_check
  CHECK (maintenance_category_mode IN ('all','specific'));

-- ---- email is required of staff ---------------------------------------------
-- Innago requires it, and it is the only channel that reaches someone who has
-- not yet created an account. Enforced by CHECK rather than NOT NULL so the
-- column can stay nullable for rows that predate it (there are none, but the
-- constraint is the honest statement of the rule).
ALTER TABLE public.property_staff DROP CONSTRAINT IF EXISTS ps_email_required;
ALTER TABLE public.property_staff
  ADD CONSTRAINT ps_email_required
  CHECK (email IS NOT NULL AND length(btrim(email)) > 2);

-- The category policies must read the MODE now, or "specific with none ticked"
-- silently means "everything" — the exact ambiguity the mode was added to end.
DROP POLICY IF EXISTS maintenance_staff_read ON public.maintenance_requests;
CREATE POLICY maintenance_staff_read ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.units u ON u.id = maintenance_requests.unit_id
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_maintenance IN ('all','view')
       AND maintenance_requests.landlord_id = s.landlord_id
       AND (s.all_properties OR u.building_id = ANY (s.building_ids))
       AND (s.maintenance_category_mode = 'all'
            OR maintenance_requests.category = ANY (s.maintenance_categories))));

DROP POLICY IF EXISTS maintenance_staff_update ON public.maintenance_requests;
CREATE POLICY maintenance_staff_update ON public.maintenance_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.units u ON u.id = maintenance_requests.unit_id
     WHERE s.user_id = auth.uid() AND s.status = 'active'
       AND s.access_maintenance = 'all'
       AND maintenance_requests.landlord_id = s.landlord_id
       AND (s.all_properties OR u.building_id = ANY (s.building_ids))
       AND (s.maintenance_category_mode = 'all'
            OR maintenance_requests.category = ANY (s.maintenance_categories))));

-- ---- late fees are a LIST, each assigned to blocks --------------------------
-- landlord_settings carries one policy. Innago has many, each "Assigned to"
-- properties, which is how a landlord charges 10% in town and a flat 1,000 in
-- the suburbs. Those columns on landlord_settings are left in place and
-- deprecated rather than dropped, for the same replay reason as above.
CREATE TABLE IF NOT EXISTS public.late_fee_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled     boolean NOT NULL DEFAULT true,
  fee_type    text    NOT NULL DEFAULT 'percentage',
  amount      numeric(12,2),
  percentage  numeric(5,2),
  grace_period_days integer NOT NULL DEFAULT 5,
  applies_to  text    NOT NULL DEFAULT 'all_line_items',
  all_properties boolean NOT NULL DEFAULT true,
  building_ids uuid[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lfr_type_check CHECK (fee_type IN ('fixed','percentage','daily')),
  CONSTRAINT lfr_applies_check CHECK (applies_to IN ('all_line_items','rent_only')),
  CONSTRAINT lfr_grace_check CHECK (grace_period_days BETWEEN 0 AND 60),
  CONSTRAINT lfr_pct_check CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  CONSTRAINT lfr_amount_check CHECK (amount IS NULL OR amount >= 0),
  -- The same refusal landlord_settings makes: a policy that cannot be applied
  -- is not a policy.
  CONSTRAINT lfr_applicable CHECK (
    NOT enabled
    OR (fee_type = 'percentage' AND percentage IS NOT NULL)
    OR (fee_type IN ('fixed','daily') AND amount IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_late_fee_rules_landlord
  ON public.late_fee_rules (landlord_id);

CREATE OR REPLACE FUNCTION public.late_fee_rules_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE v_bad uuid;
BEGIN
  NEW.landlord_id := COALESCE(NEW.landlord_id, auth.uid());
  -- Same rule as staff: you may only name blocks you own.
  SELECT b INTO v_bad FROM unnest(NEW.building_ids) AS b
   WHERE NOT EXISTS (SELECT 1 FROM public.buildings bl
                      WHERE bl.id = b AND bl.landlord_id = NEW.landlord_id)
   LIMIT 1;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'building % is not yours to assign', v_bad USING ERRCODE = '28000';
  END IF;
  IF NEW.all_properties THEN NEW.building_ids := '{}'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.late_fee_rules_before_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS late_fee_rules_biu ON public.late_fee_rules;
CREATE TRIGGER late_fee_rules_biu
  BEFORE INSERT OR UPDATE ON public.late_fee_rules
  FOR EACH ROW EXECUTE FUNCTION public.late_fee_rules_before_write();

REVOKE ALL ON public.late_fee_rules FROM anon, authenticated;
GRANT SELECT, DELETE ON public.late_fee_rules TO authenticated;
DO $g$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='late_fee_rules'
     AND column_name NOT IN ('id','landlord_id','created_at','updated_at');
  EXECUTE format('GRANT INSERT (%s) ON public.late_fee_rules TO authenticated', cols);
  EXECUTE format('GRANT UPDATE (%s) ON public.late_fee_rules TO authenticated', cols);
END $g$;

ALTER TABLE public.late_fee_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS late_fee_rules_own ON public.late_fee_rules;
CREATE POLICY late_fee_rules_own ON public.late_fee_rules
  FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

COMMENT ON COLUMN public.landlord_settings.late_fee_enabled IS
  'DEPRECATED by 20260357000000 — superseded by public.late_fee_rules.';

-- ---- assertions for the folded-in work --------------------------------------
DO $assert2$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public'
                  AND tablename='late_fee_rules' AND rowsecurity) THEN
    RAISE EXCEPTION 'FAILED: RLS off on late_fee_rules';
  END IF;
  IF has_table_privilege('anon','public.late_fee_rules','SELECT') THEN
    RAISE EXCEPTION 'FAILED: anon can read late fee rules';
  END IF;
  IF has_column_privilege('authenticated','public.late_fee_rules','landlord_id','UPDATE') THEN
    RAISE EXCEPTION 'FAILED: a client can move a late fee rule to another landlord';
  END IF;
  -- The category mode must be read by BOTH maintenance policies, or "specific
  -- with nothing ticked" quietly means everything.
  IF (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
       WHERE c.relname='maintenance_requests'
         AND coalesce(pg_get_expr(p.polqual,p.polrelid),'') LIKE '%maintenance_category_mode%') <> 2 THEN
    RAISE EXCEPTION 'FAILED: a maintenance policy ignores the category mode';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='property_staff'
                    AND column_name IN ('first_name','last_name')) THEN
    RAISE EXCEPTION 'FAILED: staff names were not split';
  END IF;
  RAISE NOTICE 'folded-in work installed: names, category mode, email rule, late fee rules.';
END
$assert2$;

-- ---- the staff trigger now also derives full_name ---------------------------
-- Replaced wholesale rather than patched: full_name is still what the policies
-- and the app read, so it must follow first/last rather than drift from them.
CREATE OR REPLACE FUNCTION public.property_staff_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bad   uuid;
  v_match uuid;
BEGIN
  NEW.landlord_id := COALESCE(NEW.landlord_id, auth.uid());

  SELECT b INTO v_bad
    FROM unnest(NEW.building_ids) AS b
   WHERE NOT EXISTS (
     SELECT 1 FROM public.buildings bl
      WHERE bl.id = b AND bl.landlord_id = NEW.landlord_id)
   LIMIT 1;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'building % is not yours to assign', v_bad
      USING ERRCODE = '28000';
  END IF;

  -- One display string, always derived from the two parts.
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := btrim(coalesce(NEW.first_name,'') || ' ' || coalesce(NEW.last_name,''));
  END IF;

  -- "All properties" and a list of blocks are contradictory; the flag wins,
  -- and the list is emptied so a later toggle cannot resurrect a stale scope.
  IF NEW.all_properties THEN
    NEW.building_ids := '{}';
  END IF;

  IF NEW.user_id IS NULL AND NEW.phone IS NOT NULL THEN
    SELECT p.id INTO v_match
      FROM public.profiles p
     WHERE p.phone = NEW.phone AND p.id <> NEW.landlord_id
     LIMIT 1;
    IF v_match IS NOT NULL THEN
      NEW.user_id := v_match;
      IF NEW.status = 'invited' THEN
        NEW.status := 'active';
        NEW.accepted_at := COALESCE(NEW.accepted_at, now());
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.property_staff_before_write() FROM PUBLIC, anon, authenticated;

DO $assert3$
BEGIN
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='property_staff_before_write'
         AND pg_get_functiondef(p.oid) LIKE '%full_name :=%') <> 1 THEN
    RAISE EXCEPTION 'FAILED: the staff trigger does not derive full_name';
  END IF;
END
$assert3$;
