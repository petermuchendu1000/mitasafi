-- =============================================================================
-- provider_portfolio / provider_service_areas visibility -- behavioural
-- =============================================================================
-- Covers 20260349000000_provider_child_visibility.sql.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/provider_child_visibility_test.sql
-- A healthy run prints PASS on every line and ends with
--   CHILD_VIS_RESULT pass=14 fail=0
--
-- WHY THIS IS BEHAVIOURAL AND NOT A CATALOG CHECK
--
-- The migration's own guards read pg_policies: they prove the predicate is not
-- the literal `true` and that it mentions the right columns. That is a check on
-- the TEXT of a policy, and text can be right while the effect is wrong --
-- policies are OR'd, so one unnoticed permissive policy on the same table and
-- command re-opens everything the narrowed one closed, with every guard still
-- green. The only way to establish what a reader can actually see is to be that
-- reader: SET LOCAL ROLE and count rows.
--
-- The matrix is three provider states times three readers:
--
--              anon    owner   other signed-in user
--   active       Y       Y       Y
--   inactive     N       Y       N
--   suspended    N       Y       N
--
-- The owner column is the one that makes this more than a tightening. A
-- provider who has been suspended still has to be able to open
-- src/app/dashboard/provider/profile/ServiceAreasForm.tsx and see their own
-- coverage -- that is exactly when they need to correct it. Before the
-- migration provider_service_areas had no own-SELECT policy at all, so
-- narrowing the public one alone would have made that form render empty with
-- nothing logged. P7-P9 are that column; they would fail against a one-line
-- version of this fix.
--
-- Fixtures roll back via the terminal RAISE, like every suite here.
-- =============================================================================

DO $P$
DECLARE
  rep text := E'\n'; pass int := 0; fail int := 0;

  -- three providers, one per visibility state
  u_act uuid := gen_random_uuid();   p_act uuid;
  u_ina uuid := gen_random_uuid();   p_ina uuid;
  u_sus uuid := gen_random_uuid();   p_sus uuid;
  -- an unrelated signed-in user, to separate "signed in" from "owner"
  u_oth uuid := gen_random_uuid();

  n int;
BEGIN
  -- ---- fixtures ------------------------------------------------------------
  INSERT INTO auth.users (id, email) VALUES
    (u_act,'cv-active@test.invalid'),
    (u_ina,'cv-inactive@test.invalid'),
    (u_sus,'cv-suspended@test.invalid'),
    (u_oth,'cv-other@test.invalid');
  INSERT INTO public.profiles (id, email) VALUES
    (u_act,'cv-active@test.invalid'),
    (u_ina,'cv-inactive@test.invalid'),
    (u_sus,'cv-suspended@test.invalid'),
    (u_oth,'cv-other@test.invalid');

  INSERT INTO public.service_providers (user_id, business_name, phone, is_active, account_status)
  VALUES (u_act,'CV Active','+254712000001', true,  'active')   RETURNING id INTO p_act;
  INSERT INTO public.service_providers (user_id, business_name, phone, is_active, account_status)
  VALUES (u_ina,'CV Inactive','+254712000002', false, 'active')  RETURNING id INTO p_ina;
  INSERT INTO public.service_providers (user_id, business_name, phone, is_active, account_status)
  VALUES (u_sus,'CV Suspended','+254712000003', true, 'suspended') RETURNING id INTO p_sus;

  -- photos is jsonb NOT NULL with no default, so it must be supplied.
  INSERT INTO public.provider_portfolio (provider_id, title, photos)
  VALUES (p_act,'active work','[]'::jsonb),
         (p_ina,'inactive work','[]'::jsonb),
         (p_sus,'suspended work','[]'::jsonb);
  INSERT INTO public.provider_service_areas (provider_id, area_name)
  VALUES (p_act,'Kilimani'), (p_ina,'Kileleshwa'), (p_sus,'Lavington');

  -- =========================================================================
  -- ANONYMOUS READER: only the active provider's children may be visible
  -- =========================================================================
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub','',true);
  SET LOCAL ROLE anon;

  SELECT count(*) INTO n FROM public.provider_portfolio WHERE provider_id = p_act;
  IF n = 1 THEN pass:=pass+1; rep:=rep||'PASS V1 anon sees active provider portfolio'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V1 anon cannot see an ACTIVE portfolio ('||n||' rows) -- the fix over-tightened'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.provider_portfolio WHERE provider_id = p_ina;
  IF n = 0 THEN pass:=pass+1; rep:=rep||'PASS V2 anon cannot see deactivated portfolio'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V2 anon sees a DEACTIVATED provider portfolio'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.provider_portfolio WHERE provider_id = p_sus;
  IF n = 0 THEN pass:=pass+1; rep:=rep||'PASS V3 anon cannot see suspended portfolio'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V3 anon sees a SUSPENDED provider portfolio'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.provider_service_areas WHERE provider_id = p_act;
  IF n = 1 THEN pass:=pass+1; rep:=rep||'PASS V4 anon sees active provider service areas'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V4 anon cannot see ACTIVE service areas ('||n||' rows)'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.provider_service_areas WHERE provider_id = p_ina;
  IF n = 0 THEN pass:=pass+1; rep:=rep||'PASS V5 anon cannot see deactivated service areas'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V5 anon sees DEACTIVATED service areas'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.provider_service_areas WHERE provider_id = p_sus;
  IF n = 0 THEN pass:=pass+1; rep:=rep||'PASS V6 anon cannot see suspended service areas'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V6 anon sees SUSPENDED service areas -- the coverage of a '
    ||'suspended provider is still public'||E'\n'; END IF;

  RESET ROLE;

  -- =========================================================================
  -- THE OWNER: must see their own children in EVERY state
  -- =========================================================================
  -- This is the column the migration exists to protect, and the reason it
  -- added provider_service_areas_select_own.
  PERFORM set_config('request.jwt.claim.sub', u_sus::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM public.provider_service_areas WHERE provider_id = p_sus;
  IF n = 1 THEN pass:=pass+1; rep:=rep||'PASS V7 a SUSPENDED provider still reads their own service areas'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V7 a suspended provider cannot read their own service areas -- '
    ||'ServiceAreasForm would render empty'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.provider_portfolio WHERE provider_id = p_sus;
  IF n = 1 THEN pass:=pass+1; rep:=rep||'PASS V8 a SUSPENDED provider still reads their own portfolio'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V8 a suspended provider cannot read their own portfolio'||E'\n'; END IF;

  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', u_ina::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM public.provider_service_areas WHERE provider_id = p_ina;
  IF n = 1 THEN pass:=pass+1; rep:=rep||'PASS V9 a DEACTIVATED provider still reads their own service areas'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V9 a deactivated provider cannot read their own service areas'||E'\n'; END IF;

  RESET ROLE;

  -- =========================================================================
  -- ANOTHER SIGNED-IN USER: being signed in is not being the owner
  -- =========================================================================
  -- Without this, V7-V9 could be satisfied by a policy that lets ANY
  -- authenticated user read everything -- which is what the own-SELECT policy
  -- would do if its predicate were dropped.
  PERFORM set_config('request.jwt.claim.sub', u_oth::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM public.provider_service_areas WHERE provider_id = p_sus;
  IF n = 0 THEN pass:=pass+1; rep:=rep||'PASS V10 an unrelated signed-in user cannot see suspended service areas'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V10 any signed-in user can read a suspended provider''s service areas '
    ||'-- the own-SELECT policy is too wide'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.provider_portfolio WHERE provider_id = p_sus;
  IF n = 0 THEN pass:=pass+1; rep:=rep||'PASS V11 an unrelated signed-in user cannot see suspended portfolio'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V11 any signed-in user can read a suspended provider''s portfolio'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.provider_service_areas WHERE provider_id = p_act;
  IF n = 1 THEN pass:=pass+1; rep:=rep||'PASS V12 an unrelated signed-in user still sees ACTIVE service areas'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL V12 a signed-in user cannot see an active provider''s service areas'||E'\n'; END IF;

  RESET ROLE;

  -- =========================================================================
  -- THE OWNER CAN STILL WRITE
  -- =========================================================================
  -- The migration DROPped and re-CREATEd policies on both tables. A drop that
  -- took the wrong policy with it would show up here and nowhere else.
  PERFORM set_config('request.jwt.claim.sub', u_act::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.provider_service_areas (provider_id, area_name) VALUES (p_act,'Westlands');
    pass:=pass+1; rep:=rep||'PASS V13 the owner can still insert a service area'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    fail:=fail+1; rep:=rep||'FAIL V13 the owner can no longer insert a service area: '||SQLERRM||E'\n'; END;

  BEGIN
    INSERT INTO public.provider_portfolio (provider_id, title, photos)
    VALUES (p_act,'more work','[]'::jsonb);
    pass:=pass+1; rep:=rep||'PASS V14 the owner can still insert a portfolio item'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    fail:=fail+1; rep:=rep||'FAIL V14 the owner can no longer insert a portfolio item: '||SQLERRM||E'\n'; END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub','',true);

  RAISE EXCEPTION E'CHILD_VIS_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$P$;
