-- =============================================================================
-- provision_identity -- behavioural verification
-- =============================================================================
-- Covers 20260346000000_provision_identity.sql.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/provision_identity_test.sql
-- A healthy run prints PASS on every line and ends with
--   PROVISION_RESULT pass=11 fail=0
--
-- These assertions call the function AS the authenticated role, under the real
-- RLS policies and the real column grants, which is the only way to establish
-- that it works: the function is SECURITY INVOKER precisely so that it carries
-- no privilege of its own, so a test that ran as the owner would prove nothing
-- about what a signing-up user can actually do.
--
-- P11 is the one that justifies the SECURITY INVOKER choice: with no
-- authenticated caller the function refuses, rather than provisioning a
-- profile for nobody.
--
-- P6 and P7 are the idempotency pair. The auth callback runs on every OAuth
-- login, not only the first, so a signup that half-failed must self-heal on the
-- next login and a fully-provisioned user must not error. Both are asserted
-- because "already exists" and "created" are different answers and neither is
-- a failure.
--
-- Fixtures roll back via the terminal RAISE, like every suite here.
-- =============================================================================

DO $P$
DECLARE
  rep text := E'\n'; pass int := 0; fail int := 0;
  v_u uuid := gen_random_uuid(); r jsonb; n int;
  lvl text; ver boolean; prole text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (v_u, 'provtest@test.invalid');
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;

  r := public.provision_identity('provtest@test.invalid','+254712345678','Prov Test',NULL,'landlord');
  IF (r->>'profile_created')::boolean AND (r->>'role_created')::boolean
  THEN pass:=pass+1; rep:=rep||'PASS P1 first call created profile and role'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P1 '||r::text||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.profiles WHERE id=v_u;
  IF n=1 THEN pass:=pass+1; rep:=rep||'PASS P2 profile visible to owner'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P2 n='||n||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.user_roles WHERE user_id=v_u AND role='landlord' AND is_active;
  IF n=1 THEN pass:=pass+1; rep:=rep||'PASS P3 active landlord role created'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P3 n='||n||E'\n'; END IF;

  SELECT verification_level, is_verified, primary_role INTO lvl, ver, prole
    FROM public.profiles WHERE id=v_u;
  IF lvl='none' AND ver IS FALSE AND prole='landlord'
  THEN pass:=pass+1; rep:=rep||'PASS P4 level=none, is_verified=false (generated), primary_role set'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P4 lvl='||coalesce(lvl,'~')||' ver='||coalesce(ver::text,'~')||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.user_roles WHERE user_id=v_u AND is_verified;
  IF n=0 THEN pass:=pass+1; rep:=rep||'PASS P5 role created unapproved'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P5 pre-approved role'||E'\n'; END IF;

  r := public.provision_identity('provtest@test.invalid','+254712345678','Prov Test',NULL,'landlord');
  IF NOT (r->>'profile_created')::boolean AND NOT (r->>'role_created')::boolean
  THEN pass:=pass+1; rep:=rep||'PASS P6 second call is a no-op, not an error'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P6 '||r::text||E'\n'; END IF;

  r := public.provision_identity('provtest@test.invalid',NULL,NULL,NULL,'service_provider');
  IF NOT (r->>'profile_created')::boolean AND (r->>'role_created')::boolean
  THEN pass:=pass+1; rep:=rep||'PASS P7 second role added, profile untouched'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P7 '||r::text||E'\n'; END IF;

  BEGIN
    r := public.provision_identity('provtest@test.invalid',NULL,NULL,NULL,'admin');
    fail:=fail+1; rep:=rep||'FAIL P8 admin accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS P8 admin refused (check_violation)'||E'\n'; END;

  BEGIN
    r := public.provision_identity('provtest@test.invalid',NULL,NULL,NULL,'superuser');
    fail:=fail+1; rep:=rep||'FAIL P9 bogus role accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS P9 bogus role refused'||E'\n'; END;

  BEGIN
    r := public.provision_identity('   ',NULL,NULL,NULL,NULL);
    fail:=fail+1; rep:=rep||'FAIL P10 empty email accepted'||E'\n';
  EXCEPTION WHEN not_null_violation THEN
    pass:=pass+1; rep:=rep||'PASS P10 empty email refused'||E'\n'; END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub','',true);
  SET LOCAL ROLE anon;
  BEGIN
    r := public.provision_identity('x@test.invalid',NULL,NULL,NULL,NULL);
    RESET ROLE; fail:=fail+1; rep:=rep||'FAIL P11 anon provisioned an identity'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS P11 anon refused'||E'\n'; END;

  RAISE EXCEPTION E'PROVISION_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$P$;
