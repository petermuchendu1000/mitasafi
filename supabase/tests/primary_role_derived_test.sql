-- =============================================================================
-- profiles.primary_role is derived, not asserted -- behavioural
-- =============================================================================
-- Covers 20260352000000_primary_role_derived.sql.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/primary_role_derived_test.sql
-- A healthy run prints PASS on every line and ends with
--   PRIMARY_ROLE_RESULT pass=13 fail=0
--
-- WHY THIS IS BEHAVIOURAL
--
-- The migration's guards check that two triggers are attached and that no
-- stored row disagrees with the derivation. Neither establishes that the value
-- is RIGHT: a trigger that set primary_role to a constant would satisfy both.
-- These assertions change roles and read the column back.
--
-- R8-R10 are the ones that matter most for the defect this closes. The old code
-- maintained primary_role from the browser in three places, each
-- logged-and-continued, so the column could disagree with user_roles silently.
-- R8 writes it as a client would and requires the write to be discarded; R9 and
-- R10 require role changes to move it without anyone asking.
--
-- R11 encodes a deliberate divergence from src/types/db-helpers.ts.
-- getPrimaryRoleByHierarchy() falls back to `roles[0] || 'landlord'` for an
-- empty set. primaryRoleOf() in src/lib/identity/roles.ts returns null instead,
-- because inventing a role for someone who holds none is how the old UI came to
-- show a role to users who had none. The database mirrors primaryRoleOf.
--
-- Fixtures roll back via the terminal RAISE, like every suite here.
-- =============================================================================

DO $P$
DECLARE
  rep text := E'\n'; pass int := 0; fail int := 0;
  u   uuid := gen_random_uuid();
  u2  uuid := gen_random_uuid();
  got text;
  n   int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u,'pr@test.invalid'), (u2,'pr2@test.invalid');

  -- =========================================================================
  -- THE PURE FUNCTION
  -- =========================================================================
  -- Asserted directly so a failure downstream can be attributed to the trigger
  -- rather than to the hierarchy.
  INSERT INTO public.profiles (id, email) VALUES (u,'pr@test.invalid');

  IF public.derive_primary_role(u) IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS R1 no roles -> NULL'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R1 no roles gave '||coalesce(public.derive_primary_role(u),'NULL')||E'\n'; END IF;

  INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'tenant',true);
  IF public.derive_primary_role(u) = 'tenant' THEN
    pass:=pass+1; rep:=rep||'PASS R2 tenant alone -> tenant'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R2 tenant alone gave '||coalesce(public.derive_primary_role(u),'NULL')||E'\n'; END IF;

  INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'service_provider',true);
  IF public.derive_primary_role(u) = 'service_provider' THEN
    pass:=pass+1; rep:=rep||'PASS R3 service_provider outranks tenant'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R3 got '||coalesce(public.derive_primary_role(u),'NULL')||E'\n'; END IF;

  INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'landlord',true);
  IF public.derive_primary_role(u) = 'landlord' THEN
    pass:=pass+1; rep:=rep||'PASS R4 landlord outranks everything'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R4 got '||coalesce(public.derive_primary_role(u),'NULL')||E'\n'; END IF;

  -- is_active is the filter every role predicate uses; the derivation must use
  -- it too or a revoked role would keep deciding the summary.
  UPDATE public.user_roles SET is_active = false WHERE user_id = u AND role = 'landlord';
  IF public.derive_primary_role(u) = 'service_provider' THEN
    pass:=pass+1; rep:=rep||'PASS R5 an inactive role does not count'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R5 got '||coalesce(public.derive_primary_role(u),'NULL')||E'\n'; END IF;

  -- admin is not a product role and profiles_primary_role_check forbids it, so
  -- deriving it would make the column unwritable.
  DELETE FROM public.user_roles WHERE user_id = u;
  INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'admin',true);
  IF public.derive_primary_role(u) IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS R6 admin is excluded from the derivation'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R6 admin gave '||coalesce(public.derive_primary_role(u),'NULL')||E'\n'; END IF;

  -- one user's roles must not move another's summary
  DELETE FROM public.user_roles WHERE user_id = u;
  INSERT INTO public.profiles (id, email) VALUES (u2,'pr2@test.invalid');
  INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u2,'landlord',true);
  SELECT primary_role INTO got FROM public.profiles WHERE id = u;
  IF got IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS R7 another user''s role does not leak across'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R7 u picked up '||got||' from u2'||E'\n'; END IF;

  -- =========================================================================
  -- THE COLUMN IS NOT THE WRITER'S TO CHOOSE
  -- =========================================================================
  UPDATE public.profiles SET primary_role = 'landlord' WHERE id = u;
  SELECT primary_role INTO got FROM public.profiles WHERE id = u;
  IF got IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS R8 a direct write to primary_role is discarded'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R8 a direct write stuck: '||got||E'\n'; END IF;

  -- and the same from a real client session, through RLS and the column grant,
  -- which is the path the three deleted app writes used
  PERFORM set_config('request.jwt.claim.sub', u::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.profiles SET primary_role = 'landlord' WHERE id = u;
  RESET ROLE;
  SELECT primary_role INTO got FROM public.profiles WHERE id = u;
  IF got IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS R9 an authenticated client cannot set primary_role'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R9 a client set primary_role to '||got||E'\n'; END IF;

  -- =========================================================================
  -- GAINING AND LOSING A ROLE MOVES IT, WITH NOBODY ASKING
  -- =========================================================================
  INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'service_provider',true);
  SELECT primary_role INTO got FROM public.profiles WHERE id = u;
  IF got = 'service_provider' THEN
    pass:=pass+1; rep:=rep||'PASS R10 gaining a role updates the summary'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R10 after gaining service_provider, got '||coalesce(got,'NULL')||E'\n'; END IF;

  INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'landlord',true);
  SELECT primary_role INTO got FROM public.profiles WHERE id = u;
  IF got = 'landlord' THEN
    pass:=pass+1; rep:=rep||'PASS R11 a higher role takes over'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R11 after gaining landlord, got '||coalesce(got,'NULL')||E'\n'; END IF;

  DELETE FROM public.user_roles WHERE user_id = u;
  SELECT primary_role INTO got FROM public.profiles WHERE id = u;
  IF got IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS R12 losing every role returns it to NULL, not a default'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R12 with no roles the column holds '||got||
    ' -- the db-helpers landlord fallback has leaked into the database'||E'\n'; END IF;

  -- =========================================================================
  -- THE SIGNUP PATH STILL PRODUCES THE RIGHT VALUE
  -- =========================================================================
  -- provision_identity inserts the profile BEFORE the role, so at insert time
  -- the derivation is NULL and only the user_roles trigger can set it. If the
  -- two triggers did not compose, this is where it would show.
  DELETE FROM public.user_roles WHERE user_id = u2;
  DELETE FROM public.profiles  WHERE id = u2;
  PERFORM set_config('request.jwt.claim.sub', u2::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.provision_identity('pr2@test.invalid',NULL,'PR Two',NULL,'landlord');
  RESET ROLE;
  SELECT primary_role INTO got FROM public.profiles WHERE id = u2;
  IF got = 'landlord' THEN
    pass:=pass+1; rep:=rep||'PASS R13 provision_identity still yields primary_role=landlord'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R13 after provisioning as landlord, primary_role='||
    coalesce(got,'NULL')||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub','',true);

  RAISE EXCEPTION E'PRIMARY_ROLE_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$P$;
