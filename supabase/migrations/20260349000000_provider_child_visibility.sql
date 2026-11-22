-- =============================================================================
-- A suspended provider's portfolio and service areas must stop being public
-- =============================================================================
-- provider_portfolio and provider_service_areas both carried
--
--   FOR SELECT TO anon, authenticated USING (true)
--
-- with no filter and no join to the provider they belong to. Their siblings all
-- filter: provider_services, provider_availability and
-- provider_availability_intervals each require is_active = true on their own
-- row, and service_providers itself requires is_active AND
-- account_status = 'active' for both anon and authenticated.
--
-- These two tables have no is_active of their own -- only provider_id -- so
-- "unfiltered" meant genuinely unfiltered. Deactivate or suspend a provider and
-- their services, availability and provider row all correctly disappear from
-- the marketplace while their portfolio IMAGES and the AREAS THEY COVER remain
-- readable by anyone, signed in or not.
--
-- Same shape as the defect 20260342000000 fixed on service_providers itself,
-- where anon's read predicate had drifted from authenticated's.
--
-- THE PART THAT MAKES THIS MORE THAN A ONE-LINE CHANGE
--
-- provider_service_areas has insert_own, update_own and delete_own policies but
-- NO own-SELECT policy. Its only SELECT policy is the public one. Narrowing
-- that alone would stop a suspended -- or merely deactivated -- provider from
-- reading THEIR OWN service areas, which is what
-- src/app/dashboard/provider/profile/ServiceAreasForm.tsx does. A provider
-- would open that form and find it empty, with nothing logged.
--
-- So an own-SELECT policy is added. provider_portfolio does not need one: its
-- provider_portfolio_manage_own policy is FOR ALL, which already covers SELECT.
--
-- Policies are OR'd, so after this change an owner reads their own rows through
-- the ownership policy and the public reads only what the marketplace should
-- see. The two predicates are independent and neither weakens the other.
--
-- ROWS AFFECTED: 0. Both tables are empty.
-- =============================================================================

-- ---- provider_portfolio -----------------------------------------------------
-- The public predicate now matches service_providers' own: visible only while
-- the provider is active AND their account is in good standing.
DROP POLICY IF EXISTS provider_portfolio_select_public ON public.provider_portfolio;
CREATE POLICY provider_portfolio_select_public ON public.provider_portfolio
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
       WHERE sp.id = provider_portfolio.provider_id
         AND sp.is_active = true
         AND sp.account_status = 'active'
    )
  );

-- ---- provider_service_areas -------------------------------------------------
DROP POLICY IF EXISTS provider_service_areas_select_public ON public.provider_service_areas;
CREATE POLICY provider_service_areas_select_public ON public.provider_service_areas
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
       WHERE sp.id = provider_service_areas.provider_id
         AND sp.is_active = true
         AND sp.account_status = 'active'
    )
  );

-- The owner's own read, which did not exist. Mirrors the predicate already used
-- by this table's insert_own / update_own / delete_own policies, so a provider
-- can always see their own coverage whatever their account status -- which is
-- precisely when they need to see it.
DROP POLICY IF EXISTS provider_service_areas_select_own ON public.provider_service_areas;
CREATE POLICY provider_service_areas_select_own ON public.provider_service_areas
  FOR SELECT TO authenticated
  USING (
    provider_id IN (
      SELECT sp.id FROM public.service_providers sp WHERE sp.user_id = auth.uid()
    )
  );


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  bad text;
  n   int;
BEGIN
  -- ---- neither public read is unfiltered any more -------------------------
  SELECT string_agg(tablename || '.' || policyname, ', ') INTO bad
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('provider_portfolio', 'provider_service_areas')
     AND cmd = 'SELECT'
     AND roles::text LIKE '%anon%'
     AND btrim(coalesce(qual, '')) IN ('true', '(true)');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'an anonymous read is still unfiltered: %', bad;
  END IF;

  -- ---- and both now test the parent's visibility --------------------------
  -- Asserted on BOTH columns. Checking only is_active would let the same defect
  -- back in through account_status, which is how the service_providers
  -- predicates drifted apart in the first place.
  SELECT string_agg(x.tbl, ', ') INTO bad
    FROM (VALUES ('provider_portfolio'), ('provider_service_areas')) AS x(tbl)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = x.tbl
        AND p.policyname = x.tbl || '_select_public'
        AND p.qual ILIKE '%service_providers%'
        AND p.qual ILIKE '%is_active%'
        AND p.qual ILIKE '%account_status%'
   );
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'public read does not test the parent''s visibility: %', bad;
  END IF;

  -- ---- the owner can still read their own rows ---------------------------
  -- The reason this migration is not a one-liner. provider_service_areas needs
  -- an own-SELECT policy; provider_portfolio is covered by its FOR ALL policy.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'provider_service_areas'
       AND cmd = 'SELECT' AND policyname = 'provider_service_areas_select_own'
       AND qual ILIKE '%auth.uid()%'
  ) THEN
    RAISE EXCEPTION 'provider_service_areas has no own-SELECT policy; a suspended '
      'provider would see an empty ServiceAreasForm';
  END IF;

  SELECT count(*) INTO n
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'provider_portfolio'
     AND policyname = 'provider_portfolio_manage_own' AND cmd = 'ALL';
  IF n <> 1 THEN
    RAISE EXCEPTION 'provider_portfolio_manage_own (FOR ALL) is gone, so the owner has '
      'no SELECT path either';
  END IF;

  -- ---- the siblings still filter, so this stays consistent ---------------
  SELECT string_agg(p.tablename, ', ') INTO bad
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.cmd = 'SELECT'
     AND p.roles::text LIKE '%anon%'
     AND p.tablename IN ('provider_services', 'provider_availability',
                         'provider_availability_intervals')
     AND coalesce(p.qual, '') NOT ILIKE '%is_active%';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'a sibling provider table stopped filtering on visibility: %', bad;
  END IF;

  RAISE NOTICE 'provider_child_visibility: portfolio and service areas now follow the provider';
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
-- DROP POLICY IF EXISTS provider_service_areas_select_own ON public.provider_service_areas;
-- DROP POLICY IF EXISTS provider_portfolio_select_public ON public.provider_portfolio;
-- CREATE POLICY provider_portfolio_select_public ON public.provider_portfolio
--   FOR SELECT TO anon, authenticated USING (true);
-- DROP POLICY IF EXISTS provider_service_areas_select_public ON public.provider_service_areas;
-- CREATE POLICY provider_service_areas_select_public ON public.provider_service_areas
--   FOR SELECT TO anon, authenticated USING (true);
--
-- What that restores is anonymous read access to the portfolio and coverage of
-- every suspended and deactivated provider.
-- =============================================================================
