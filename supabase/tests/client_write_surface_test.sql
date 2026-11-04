-- =============================================================================
-- Client write surface — behavioural verification
-- =============================================================================
-- Verifies 20260329000000_lock_client_write_surface.sql by attempting the
-- actual writes as the actual client roles, rather than trusting the grant
-- catalog. Every statement carries WHERE false, so privileges are checked by
-- the planner while no row can be touched. Safe to run against any environment.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/client_write_surface_test.sql
--
-- A healthy run prints PASS on every line and ends with
--   RESULT pass=20 fail=0
--
-- NOTE on one assertion: create_booking_with_capacity_check takes EIGHT
-- arguments, so calling it with a single uuid is refused for a signature
-- mismatch rather than for a privilege failure. That would be a check passing
-- for the wrong reason, so it is asserted against the privilege catalog
-- instead. Any assertion here that cannot distinguish "denied because
-- unprivileged" from "denied because malformed" is worthless.
-- =============================================================================

DO $T$
DECLARE
  rep  text := E'\n';
  pass int := 0;
  fail int := 0;

BEGIN
  -- ---- helper semantics -----------------------------------------------------
  -- Each block below runs one statement as one role and records whether it was
  -- refused. SQLSTATE 42501 is the privilege refusal we are asserting on.

  -- ===== THE LIVE DEFECT: a customer rewriting their own price ==============
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE bookings SET agreed_price = 1 WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  a customer can still set agreed_price' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  agreed_price write refused (42501)' || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE bookings SET pricing_snapshot = '{}'::jsonb WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  pricing_snapshot still writable (defeats the sync guard)' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  pricing_snapshot write refused' || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE bookings SET status = 'resolved' WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  booking status still client-writable' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  booking status write refused' || E'\n';
  END;

  -- The account-deletion request writes metadata + updated_at together
  -- (src/app/dashboard/settings/actions.ts:209). Asserted separately because it
  -- is a different column pair and was equally dead.
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE profiles SET metadata = '{}'::jsonb, updated_at = now() WHERE false;
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  the deletion-request payload is writable' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  deletion requests are silently discarded (42501)' || E'\n';
  END;

  -- ...and the trust columns must STILL be refused. Restoring updated_at must
  -- not have widened the grant.
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE profiles SET verification_level = 'full' WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  a user can set their own verification_level' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  verification_level still refused' || E'\n';
  END;

  -- ===== money tables ========================================================
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE booking_payments SET status = 'completed' WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  booking_payments still client-writable' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  booking_payments write refused' || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE provider_payouts SET status = 'completed' WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  provider_payouts still client-writable' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  provider_payouts write refused' || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE reviews SET rating = '5' WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  a provider can still rewrite reviews about them' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  review rewrite refused' || E'\n';
  END;

  -- ===== self-verification escalation =======================================
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE profiles SET is_verified = true WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  a user can still verify themselves' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  self-verification refused' || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE profiles SET verification_level = 'full' WHERE false;
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  verification_level still self-settable' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  verification_level refused' || E'\n';
  END;

  -- ===== anonymous PII harvesting ===========================================
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM * FROM match_listing_to_alerts(gen_random_uuid());
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  anon can still harvest lead email/phone' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  match_listing_to_alerts refused to anon' || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM get_landlord_portfolio_stats(gen_random_uuid());
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  anon can still read landlord finances' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  landlord finances refused to anon' || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM get_user_roles(gen_random_uuid());
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  anon can still enumerate roles' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  role enumeration refused to anon' || E'\n';
  END;

  -- Asserted on the catalog, NOT by calling: this function takes 8 arguments,
  -- so a malformed call is refused for the wrong reason.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname = 'create_booking_with_capacity_check'
                AND (has_function_privilege('anon', p.oid, 'EXECUTE')
                     OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))) THEN
    fail := fail + 1; rep := rep || 'FAIL  create_booking_with_capacity_check still client-executable' || E'\n';
  ELSE
    pass := pass + 1; rep := rep || 'PASS  create_booking_with_capacity_check revoked (catalog)' || E'\n';
  END IF;

  -- No SECURITY DEFINER function may be callable by a client role, except the
  -- deliberately-kept view counter and trigger functions (which PostgreSQL
  -- refuses to call directly anyway).
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND pg_get_function_result(p.oid) <> 'trigger'
       AND p.proname <> 'increment_listing_views'
       AND (has_function_privilege('anon', p.oid, 'EXECUTE')
            OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ) THEN
    fail := fail + 1; rep := rep || 'FAIL  a callable definer function is still client-executable' || E'\n';
  ELSE
    pass := pass + 1; rep := rep || 'PASS  no callable definer function is client-executable' || E'\n';
  END IF;

  -- ===== OVERREACH: these must STILL work ===================================
  BEGIN
    SET LOCAL ROLE anon;
    INSERT INTO profiles (id, email, phone, primary_role)
      SELECT gen_random_uuid(), 'a@b.c', '+254700000000', 'customer' WHERE false;
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  signup can still insert a profile' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  SIGNUP IS BROKEN: ' || SQLERRM || E'\n';
  END;

  -- The payload the APPLICATION sends, not the columns the migration granted.
  --
  -- This assertion used to be `SET full_name, phone, avatar_url` -- exactly the
  -- three columns 20260329000000 granted. It was derived from the migration
  -- instead of from the caller, so it passed while
  -- src/app/dashboard/profile/actions.ts:137 was failing on every single call:
  -- that code sets `updates.updated_at` unconditionally, and updated_at had
  -- been left out of the grant list. A check shaped to the fix cannot detect
  -- the fix being wrong. Restored by 20260337000000.
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE profiles SET full_name = 'x', phone = 'y', avatar_url = 'z',
                        updated_at = now() WHERE false;
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  a user can still edit their own profile (incl. updated_at)' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  SELF-SERVICE IS BROKEN: ' || SQLERRM || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM count(*) FROM bookings;
    PERFORM count(*) FROM booking_payments;
    PERFORM count(*) FROM reviews;
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  reads are untouched' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  READS BROKEN: ' || SQLERRM || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM increment_listing_views(gen_random_uuid());
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  anonymous listing-view counting still works' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  VIEW COUNTING BROKEN: ' || SQLERRM || E'\n';
  END;

  BEGIN
    SET LOCAL ROLE service_role;
    UPDATE bookings SET status = 'resolved' WHERE false;
    UPDATE booking_payments SET status = 'completed' WHERE false;
    RESET ROLE;
    pass := pass + 1; rep := rep || 'PASS  service_role still writes (the app still functions)' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail := fail + 1; rep := rep || 'FAIL  CATASTROPHE, service_role lost write access: ' || SQLERRM || E'\n';
  END;

  -- ===== earlier revokes must still hold ====================================
  IF has_column_privilege('authenticated', 'public.service_providers', 'wallet_balance', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.service_providers', 'is_verified', 'UPDATE') THEN
    fail := fail + 1; rep := rep || 'FAIL  REGRESSION: 20260318/19 revokes were undone' || E'\n';
  ELSE
    pass := pass + 1; rep := rep || 'PASS  the service_providers revokes still hold' || E'\n';
  END IF;

  RAISE EXCEPTION E'RESULT pass=% fail=%\n%', pass, fail, rep;
END
$T$;
