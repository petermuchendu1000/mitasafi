-- =============================================================================
-- grant_admin_role / revoke_admin_role -- behavioural verification
-- =============================================================================
-- Covers 20260350000000_admin_grant_path.sql.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/admin_grant_path_test.sql
-- A healthy run prints PASS on every line and ends with
--   ADMIN_GRANT_RESULT pass=16 fail=0
--
-- WHAT THIS SUITE IS FOR
--
-- These two functions are the only way the admin role can be granted, and they
-- are SECURITY DEFINER -- they write a row that RLS and a trigger exist to
-- forbid. So the suite has to establish two opposite things at once: that the
-- function CAN do what no client may do (A1-A8), and that no client can reach
-- it (A13-A15). A test proving only the first would describe a privilege
-- escalation vector rather than a grant path.
--
-- A5/A6 are the pair that caught a real defect during the dry run. The first
-- version of revoke_admin_role did not filter its UPDATE on is_active, so a
-- second revoke matched the already-deactivated row, returned revoked=true and
-- wrote a second admin_role_revoked audit entry for one actual revocation. The
-- catalog guards were all green; only calling the function twice found it.
--
-- A9-A11 check the read path the application really uses. The role row existing
-- is not the same claim as current_user_has_role('admin') returning true: the
-- row is filtered on is_active by get_user_roles, user_has_role and
-- current_user_has_role, and src/lib/identity/require-admin.ts goes through
-- that read. Asserting the row alone would leave the actual admin gate
-- untested.
--
-- Fixtures roll back via the terminal RAISE, like every suite here.
-- =============================================================================

DO $P$
DECLARE
  rep text := E'\n'; pass int := 0; fail int := 0;
  u   uuid := gen_random_uuid();
  r   jsonb;
  n   int;
  v   boolean;
  det jsonb;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u,'admingrant@test.invalid');
  INSERT INTO public.profiles (id, email) VALUES (u,'admingrant@test.invalid');

  -- =========================================================================
  -- THE GRANT WORKS, AS service_role
  -- =========================================================================
  SET LOCAL ROLE service_role;

  r := public.grant_admin_role(u,'suite: first grant');
  IF (r->>'role_id') IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS A1 grant returned a role id'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A1 grant returned no role id'||E'\n'; END IF;

  IF (r->>'already_held')::boolean IS FALSE THEN
    pass:=pass+1; rep:=rep||'PASS A2 first grant reports already_held=false'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A2 first grant claimed the role was already held'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.user_roles
   WHERE user_id=u AND role='admin' AND is_active AND is_verified;
  IF n = 1 THEN pass:=pass+1; rep:=rep||'PASS A3 an active, approved admin row exists'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A3 expected 1 active approved admin row, found '||n||E'\n'; END IF;

  -- ---- idempotent: the operator may re-run it ----------------------------
  r := public.grant_admin_role(u,'suite: second grant');
  SELECT count(*) INTO n FROM public.user_roles WHERE user_id=u AND role='admin';
  IF n = 1 AND (r->>'already_held')::boolean IS TRUE THEN
    pass:=pass+1; rep:=rep||'PASS A4 re-granting is idempotent and reports already_held'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A4 re-grant left '||n||' rows / already_held='||coalesce(r->>'already_held','null')||E'\n'; END IF;

  -- =========================================================================
  -- REVOKE DEACTIVATES, AND ONLY ONCE
  -- =========================================================================
  r := public.revoke_admin_role(u,'suite: revoke');
  SELECT count(*) INTO n FROM public.user_roles WHERE user_id=u AND role='admin' AND is_active;
  IF (r->>'revoked')::boolean IS TRUE AND n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS A5 revoke deactivates the role'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A5 revoke returned '||coalesce(r->>'revoked','null')||' with '||n||' still active'||E'\n'; END IF;

  r := public.revoke_admin_role(u,'suite: revoke again');
  IF (r->>'revoked')::boolean IS FALSE THEN
    pass:=pass+1; rep:=rep||'PASS A6 a second revoke is a no-op, not a second revocation'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A6 a second revoke reported revoked=true -- the audit trail now '
    ||'claims two revocations for one'||E'\n'; END IF;

  SELECT count(*) INTO n FROM public.user_roles WHERE user_id=u AND role='admin';
  IF n = 1 THEN pass:=pass+1; rep:=rep||'PASS A7 revoke kept the row (history survives)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A7 revoke deleted the row instead of deactivating it'||E'\n'; END IF;

  -- =========================================================================
  -- THE AUDIT TRAIL
  -- =========================================================================
  -- 2 grants + 1 real revocation = 3. A6's no-op must not have added a fourth.
  SELECT count(*) INTO n FROM public.audit_log
   WHERE action IN ('admin_role_granted','admin_role_revoked')
     AND details->>'target_user_id' = u::text;
  IF n = 3 THEN pass:=pass+1; rep:=rep||'PASS A8 exactly 3 audit rows for 2 grants and 1 revocation'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A8 expected 3 audit rows, found '||n||E'\n'; END IF;

  SELECT details INTO det FROM public.audit_log
   WHERE action='admin_role_granted' AND details->>'target_user_id' = u::text
   ORDER BY created_at LIMIT 1;
  IF det->>'reason' = 'suite: first grant' AND det->>'target_email' = 'admingrant@test.invalid' THEN
    pass:=pass+1; rep:=rep||'PASS A9 the audit row records the reason and the target'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A9 audit details lost the reason or the target: '||coalesce(det::text,'null')||E'\n'; END IF;

  RESET ROLE;

  -- =========================================================================
  -- THE READ PATH THE APPLICATION USES
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', u::text, true);
  SET LOCAL ROLE authenticated;
  v := public.current_user_has_role('admin');
  IF v IS NOT TRUE THEN pass:=pass+1; rep:=rep||'PASS A10 a revoked admin does not read as admin'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A10 current_user_has_role still sees a revoked admin'||E'\n'; END IF;
  RESET ROLE;

  SET LOCAL ROLE service_role;
  PERFORM public.grant_admin_role(u,'suite: regrant for the read path');
  RESET ROLE;

  PERFORM set_config('request.jwt.claim.sub', u::text, true);
  SET LOCAL ROLE authenticated;
  v := public.current_user_has_role('admin');
  IF v IS TRUE THEN pass:=pass+1; rep:=rep||'PASS A11 a granted admin reads as admin'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A11 current_user_has_role does not see a granted admin -- '
    ||'requireAdmin() would still deny everyone'||E'\n'; END IF;

  RESET ROLE;

  -- get_user_roles is SECURITY DEFINER and 20260336000000_relock_definer_surface
  -- revoked client EXECUTE on it, so this is deliberately checked as
  -- service_role: it is the SERVER-side read (src/lib/cache/queries.ts), while
  -- current_user_has_role above is the client-side one. Both must agree, and
  -- they are reached by different roles.
  -- get_user_roles returns text[], not a row set.
  SET LOCAL ROLE service_role;
  IF 'admin' = ANY (public.get_user_roles(u)) THEN
    pass:=pass+1; rep:=rep||'PASS A12 get_user_roles reports the admin role'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL A12 get_user_roles does not report the admin role'||E'\n'; END IF;
  RESET ROLE;

  -- =========================================================================
  -- NO CLIENT MAY REACH EITHER FUNCTION
  -- =========================================================================
  -- Without these, everything above describes an escalation vector.
  PERFORM set_config('request.jwt.claim.sub', u::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.grant_admin_role(u,'suite: client self-escalation');
    RESET ROLE; fail:=fail+1; rep:=rep||'FAIL A13 authenticated executed grant_admin_role'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS A13 authenticated cannot execute grant_admin_role'||E'\n'; END;

  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.revoke_admin_role(u,'suite: client revoke');
    RESET ROLE; fail:=fail+1; rep:=rep||'FAIL A14 authenticated executed revoke_admin_role'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS A14 authenticated cannot execute revoke_admin_role'||E'\n'; END;

  PERFORM set_config('request.jwt.claim.sub','',true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.grant_admin_role(u,'suite: anon escalation');
    RESET ROLE; fail:=fail+1; rep:=rep||'FAIL A15 anon executed grant_admin_role'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS A15 anon cannot execute grant_admin_role'||E'\n'; END;

  -- =========================================================================
  -- THE FUNCTION REFUSES NONSENSE
  -- =========================================================================
  SET LOCAL ROLE service_role;
  BEGIN
    PERFORM public.grant_admin_role(u,'   ');
    RESET ROLE; fail:=fail+1; rep:=rep||'FAIL A16 a blank reason was accepted'||E'\n';
  EXCEPTION WHEN null_value_not_allowed THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS A16 a blank reason is refused'||E'\n'; END;

  PERFORM set_config('request.jwt.claim.sub','',true);

  RAISE EXCEPTION E'ADMIN_GRANT_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$P$;
