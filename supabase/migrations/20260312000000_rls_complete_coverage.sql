-- =============================================================================
-- Migration: 20260312000000_rls_complete_coverage.sql
-- Purpose:   Enable RLS on the 33 public tables that no prior migration covered
-- =============================================================================
--
-- PROBLEM
-- -------
-- 33 of 74 public tables had RLS disabled while the `anon` role held
-- SELECT/INSERT/UPDATE/DELETE on every one of them (confirmed via
-- has_table_privilege, which resolves grants to PUBLIC and role inheritance,
-- and by a live PostgREST GET returning 200 with the publishable key).
-- Because the publishable key ships in the browser bundle, those tables were
-- world-readable AND world-writable -- including api_keys, audit_log,
-- service_pricing, service_pricing_components, shopping_receipts,
-- system_authority_model, feature_flags and blocked_users.
--
-- 20260310000000_rls_security_hardening.sql was scoped to 7 named
-- provider-module tables and contains no blanket loop, so these 33 were never
-- covered by any migration.
--
-- APPROACH
-- --------
-- `service_role` has rolbypassrls = true (verified), so RLS never blocks
-- server-side code using lib/supabase/admin.ts. Policies are therefore granted
-- only where the app demonstrably reads with the anon/authenticated key:
--
--   Group A  public catalog, read-only for anon+authenticated, writes via
--            service_role only:  services, service_categories,
--            service_subcategories
--            (12/2/3 app files respectively read these with the anon key)
--
--   Group B  owner-scoped:  locations
--            One anon path exists (src/app/services/provider/[id]/request/
--            page.tsx:82). It is authenticated-only and already filters
--            .eq("user_id", user.id); RLS now enforces that in the database.
--            locations holds address_line1/2, latitude, longitude and
--            access_notes, so it must never be publicly readable.
--
--   Group C  service_role only (29 tables). No app file reads these with the
--            anon key, so an explicit service_role policy plus RLS denies
--            anon/authenticated entirely.
--
-- Reads are NOT scoped to is_active = true: src/lib/data/services.ts:315 reads
-- service_subcategories filtered only by category_id, so such a predicate
-- would break working queries. Narrowing it is follow-up work requiring a
-- query audit.
--
-- Verified there are exactly 2 Supabase embedded selects in the codebase and
-- both target `neighborhoods` (not in this set), so no nested-resource read is
-- affected by these policies.
--
-- Idempotent: yes (ENABLE RLS is idempotent; policies are dropped first).
-- Rollback:   see the commented block at the foot of this file.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- GROUP C: service_role only (29 tables)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  service_only text[] := ARRAY[
    'api_keys',
    'audit_log',
    'blocked_users',
    'booking_commitments',
    'booking_delivery_details',
    'booking_emergency_details',
    'booking_followups',
    'booking_personal_details',
    'booking_pest_control_details',
    'booking_project_details',
    'booking_recurring_rules',
    'booking_standard_details',
    'booking_state_transitions',
    'cluster_adjacency',
    'cluster_categories',
    'clusters',
    'feature_flags',
    'provider_category_attempts',
    'provider_clusters',
    'service_capabilities',
    'service_pricing',
    'service_pricing_components',
    'service_types',
    'service_verification_requirements',
    'shopping_list_items',
    'shopping_receipts',
    'system_announcements',
    'system_authority_model',
    'system_metrics'
  ];
BEGIN
  FOREACH t IN ARRAY service_only LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role_all', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- GROUP A: public catalog — anon/authenticated may READ, only service_role writes
-- ---------------------------------------------------------------------------
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read ON public.services
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS services_service_role_all ON public.services;
CREATE POLICY services_service_role_all ON public.services
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_categories_public_read ON public.service_categories;
CREATE POLICY service_categories_public_read ON public.service_categories
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS service_categories_service_role_all ON public.service_categories;
CREATE POLICY service_categories_service_role_all ON public.service_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_subcategories_public_read ON public.service_subcategories;
CREATE POLICY service_subcategories_public_read ON public.service_subcategories
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS service_subcategories_service_role_all ON public.service_subcategories;
CREATE POLICY service_subcategories_service_role_all ON public.service_subcategories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- GROUP B: locations — a user may read only their own rows
-- ---------------------------------------------------------------------------
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS locations_select_own ON public.locations;
CREATE POLICY locations_select_own ON public.locations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS locations_service_role_all ON public.locations;
CREATE POLICY locations_service_role_all ON public.locations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.locations IS
  'Holds street addresses and coordinates. RLS: owner-read only; writes go through service_role.';

-- ---------------------------------------------------------------------------
-- SELF-CHECK: fail the migration if coverage is incomplete.
-- This can genuinely fail -- drop any table from the arrays above and it does.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing text;
  n_anon_write int;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO missing
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS still disabled on: %', missing;
  END IF;

  -- No anon/authenticated policy anywhere may permit INSERT/UPDATE/DELETE on
  -- the money and system tables this migration locked down.
  SELECT count(*) INTO n_anon_write
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename IN ('api_keys','audit_log','service_pricing',
                        'service_pricing_components','shopping_receipts',
                        'system_authority_model','feature_flags','blocked_users')
    AND p.cmd <> 'SELECT'
    AND (p.roles::text LIKE '%anon%' OR p.roles::text LIKE '%authenticated%'
         OR p.roles::text = '{public}');

  IF n_anon_write > 0 THEN
    RAISE EXCEPTION 'anon/authenticated retain write policies on % protected table(s)', n_anon_write;
  END IF;

  RAISE NOTICE 'RLS coverage complete: every public table has RLS enabled.';
END $$;

-- =============================================================================
-- ROLLBACK (run manually if these policies break a legitimate read path)
-- =============================================================================
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY[
--     'api_keys','audit_log','blocked_users','booking_commitments',
--     'booking_delivery_details','booking_emergency_details','booking_followups',
--     'booking_personal_details','booking_pest_control_details',
--     'booking_project_details','booking_recurring_rules','booking_standard_details',
--     'booking_state_transitions','cluster_adjacency','cluster_categories','clusters',
--     'feature_flags','provider_category_attempts','provider_clusters',
--     'service_capabilities','service_pricing','service_pricing_components',
--     'service_types','service_verification_requirements','shopping_list_items',
--     'shopping_receipts','system_announcements','system_authority_model',
--     'system_metrics','services','service_categories','service_subcategories',
--     'locations'
--   ] LOOP
--     EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
--   END LOOP;
-- END $$;
