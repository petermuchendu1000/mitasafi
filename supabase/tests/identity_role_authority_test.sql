-- =============================================================================
-- Identity role authority — behavioural + catalog verification
-- =============================================================================
-- Covers 20260342000000_identity_role_authority.sql.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/identity_role_authority_test.sql
-- A healthy run prints PASS on every line and ends with
--   IDENTITY_RESULT pass=21 fail=0
--
-- WHY A NEW SUITE RATHER THAN ADDITIONS TO THE EXISTING THREE
--
-- The privilege assertions would sit naturally in client_write_surface_test.sql
-- and the visibility one in public_visibility_test.sql. They are here instead
-- because adding to a suite means changing the expected pass count in its
-- header, and the author of this suite had read only part of those files.
-- Editing a suite you have not read in full is how an assertion gets weakened
-- by accident. Folding these in is a reasonable follow-up for someone who has.
--
-- WHAT DISCRIMINATES AND WHAT DOES NOT
--
-- I12 is the only assertion that isolates the BEFORE UPDATE trigger. Raising
-- is_verified on your own row satisfies every RLS predicate on user_roles
-- (USING and WITH CHECK both only test user_id and role), so the trigger is the
-- sole thing that can refuse it. If the trigger is dropped, I12 is the
-- assertion that goes red.
--
-- I13 does NOT discriminate: changing role to 'admin' is refused by the RLS
-- WITH CHECK *and* by the trigger, and both surface as SQLSTATE 42501. It is
-- kept because the behaviour matters, but it must not be read as evidence that
-- the trigger works -- I12 is that evidence.
--
-- I15 and I16 are the regression assertions that matter most in practice. They
-- are derived from the payloads the application actually sends
-- (onboarding/provider-type/actions.ts:136 upserts user_id, role, is_active,
-- is_verified; dashboard/settings/actions.ts:141 upserts user_id plus the three
-- notification booleans), NOT from what the migration granted. An assertion
-- derived from the grant cannot fail for an over-broad revoke -- which is
-- exactly the defect 20260337000000_grant_profiles_updated_at.sql exists to
-- record.
-- =============================================================================

DO $I$
DECLARE
  rep  text := E'\n';
  pass int := 0;
  fail int := 0;
  v_u    uuid := gen_random_uuid();
  v_u2   uuid := gen_random_uuid();
  bad    text;
  n      int;
BEGIN

  -- ===== fixtures, as the migration owner ==================================
  INSERT INTO auth.users (id, email) VALUES (v_u, 'ira@test.invalid'), (v_u2, 'irb@test.invalid');
  INSERT INTO profiles   (id, email) VALUES (v_u, 'ira@test.invalid'), (v_u2, 'irb@test.invalid');
  INSERT INTO user_roles (user_id, role, is_active, is_verified)
    VALUES (v_u, 'service_provider', true, false);

  -- ===== I1: the shared predicate exists and is NOT definer ================
  -- Non-definer is load-bearing: relock_definer_surface sweeps every
  -- client-executable definer function in public, so a definer predicate would
  -- be silently revoked on its next apply and every policy using it would fail.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public' AND p.proname='current_user_has_role'
                AND NOT p.prosecdef) THEN
    pass:=pass+1; rep:=rep||'PASS I1  current_user_has_role exists and is SECURITY INVOKER'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I1  current_user_has_role is missing or is SECURITY DEFINER'||E'\n';
  END IF;

  -- ===== I2: STABLE, so policies do not re-evaluate it per row =============
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public' AND p.proname='current_user_has_role'
                AND p.provolatile IN ('s','i')) THEN
    pass:=pass+1; rep:=rep||'PASS I2  current_user_has_role is STABLE'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I2  current_user_has_role is VOLATILE; it will run per row'||E'\n';
  END IF;

  -- ===== I3: callable by BOTH client roles =================================
  -- anon too: for anon auth.uid() is NULL so it can only return false, and
  -- withholding EXECUTE would make any policy that calls it raise
  -- "permission denied for function" on unauthenticated reads instead of
  -- evaluating to false.
  IF has_function_privilege('authenticated','public.current_user_has_role(text)','EXECUTE')
     AND has_function_privilege('anon','public.current_user_has_role(text)','EXECUTE') THEN
    pass:=pass+1; rep:=rep||'PASS I3  current_user_has_role is executable by anon and authenticated'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I3  current_user_has_role is not executable by a client role'||E'\n';
  END IF;

  -- ===== I4: the verified-role variant, same contract ======================
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public' AND p.proname='current_user_has_verified_role'
                AND NOT p.prosecdef)
     AND has_function_privilege('authenticated','public.current_user_has_verified_role(text)','EXECUTE') THEN
    pass:=pass+1; rep:=rep||'PASS I4  current_user_has_verified_role exists, invoker, callable'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I4  current_user_has_verified_role is missing, definer, or uncallable'||E'\n';
  END IF;

  -- ===== I5: search_path pinned on the definer role functions ==============
  SELECT string_agg(p.proname, ', ') INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('get_user_roles','user_has_role')
     AND (p.proconfig IS NULL
          OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'));
  IF bad IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS I5  both definer role functions pin search_path'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I5  no search_path on: '||bad||E'\n';
  END IF;

  -- ===== I6: and they stayed closed to clients =============================
  IF NOT has_function_privilege('anon','public.user_has_role(uuid,text)','EXECUTE')
     AND NOT has_function_privilege('authenticated','public.user_has_role(uuid,text)','EXECUTE')
     AND NOT has_function_privilege('anon','public.get_user_roles(uuid)','EXECUTE')
     AND NOT has_function_privilege('authenticated','public.get_user_roles(uuid)','EXECUTE') THEN
    pass:=pass+1; rep:=rep||'PASS I6  the definer role functions are not client-executable'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I6  a definer role function became client-executable'||E'\n';
  END IF;

  -- ===== I7: the relock invariant still holds system-wide ==================
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
   WHERE ns.nspname='public' AND p.prosecdef
     AND pg_get_function_result(p.oid) <> 'trigger'
     AND p.proname <> 'increment_listing_views'
     AND (has_function_privilege('anon', p.oid,'EXECUTE')
          OR has_function_privilege('authenticated', p.oid,'EXECUTE'));
  IF bad IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS I7  no definer function is client-executable'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I7  definer surface reopened: '||bad||E'\n';
  END IF;

  -- ===== I8: the INSERT policy constrains is_verified ======================
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname='public' AND tablename='user_roles'
                AND policyname='Users can insert own roles'
                AND with_check LIKE '%is_verified%') THEN
    pass:=pass+1; rep:=rep||'PASS I8  user_roles INSERT policy constrains is_verified'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I8  user_roles INSERT policy does not mention is_verified'||E'\n';
  END IF;

  -- ===== I9: the escalation trigger is installed ===========================
  IF EXISTS (SELECT 1 FROM pg_trigger
              WHERE tgrelid='public.user_roles'::regclass
                AND tgname='trg_user_roles_block_client_escalation'
                AND NOT tgisinternal) THEN
    pass:=pass+1; rep:=rep||'PASS I9  the user_roles escalation trigger is installed'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I9  the user_roles escalation trigger is missing'||E'\n';
  END IF;

  -- ===== I10: it fires BEFORE the updated_at trigger =======================
  -- Postgres fires BEFORE-row triggers in name order, and 'trg_' sorts before
  -- 'update_'. Asserted rather than assumed, because a rename would reorder it
  -- and the refusal should happen before any bookkeeping column is touched.
  IF (SELECT pos FROM (SELECT tgname, row_number() OVER (ORDER BY tgname) pos
                         FROM pg_trigger
                        WHERE tgrelid='public.user_roles'::regclass
                          AND NOT tgisinternal AND (tgtype&2)=2) t
       WHERE tgname='trg_user_roles_block_client_escalation')
     < (SELECT pos FROM (SELECT tgname, row_number() OVER (ORDER BY tgname) pos
                         FROM pg_trigger
                        WHERE tgrelid='public.user_roles'::regclass
                          AND NOT tgisinternal AND (tgtype&2)=2) t
       WHERE tgname='update_user_roles_updated_at') THEN
    pass:=pass+1; rep:=rep||'PASS I10 the escalation trigger fires before updated_at'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I10 trigger ordering regressed on user_roles'||E'\n';
  END IF;

  -- ===== I11: the eight superseded policies stay gone ======================
  -- These governed commands their role cannot execute; the grant layer denies
  -- them. Re-adding one restores a policy that describes a write model that
  -- does not exist, which is what misled the last reader.
  SELECT string_agg(tablename||'.'||policyname, ', ') INTO bad
    FROM pg_policies
   WHERE schemaname='public'
     AND policyname IN ('disputes_insert_reporter','booking_quotes_insert_provider',
         'booking_quotes_update_provider','bookings_insert_customer',
         'bookings_update_customer','bookings_update_provider',
         'reviews_insert_reviewer','reviews_update_provider_response');
  IF bad IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS I11 the eight superseded write policies are absent'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I11 a superseded write policy is back: '||bad||E'\n';
  END IF;

  -- ===== I12: THE TRIGGER TEST — a client cannot self-verify ===============
  -- The only assertion here that isolates the trigger. Every RLS predicate on
  -- user_roles is satisfied by this statement.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE user_roles SET is_verified = true WHERE user_id = v_u;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I12 a client set is_verified on its own role'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS I12 client self-verification refused (42501)'||E'\n';
  END;

  -- ===== I13: a client cannot raise its role to admin ======================
  -- Does NOT discriminate: RLS WITH CHECK and the trigger both refuse this and
  -- both report 42501. Kept for the behaviour, not as trigger evidence.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE user_roles SET role = 'admin' WHERE user_id = v_u;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I13 a client promoted itself to admin'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS I13 client self-promotion to admin refused (42501)'||E'\n';
  END;

  -- ===== I14: a client cannot INSERT an already-verified role ==============
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO user_roles (user_id, role, is_active, is_verified)
      VALUES (v_u2, 'landlord', true, true);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I14 a client inserted a pre-verified role'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS I14 inserting a pre-verified role refused (42501)'||E'\n';
  END;

  -- ===== I15: THE POSITIVE CONTROL — onboarding still works ================
  -- Without this, every assertion above could be satisfied by revoking
  -- everything, and the suite would be green while signup was broken. This is
  -- the payload src/app/(auth)/onboarding/provider-type/actions.ts:136 sends.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO user_roles (user_id, role, is_active, is_verified)
      VALUES (v_u2, 'landlord', true, false);
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS I15 a client can still claim an unverified role (onboarding intact)'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I15 onboarding is broken: a client cannot claim a role ('||SQLSTATE||')'||E'\n';
  END;

  -- ===== I16: the upsert payload columns remain writable ===================
  -- Derived from what the application SENDS, not from what the migration
  -- granted. An assertion derived from the grant cannot fail for an over-broad
  -- revoke.
  SELECT string_agg(x.lbl, ', ') INTO bad
    FROM (VALUES
      ('user_roles.user_id INSERT',     has_column_privilege('authenticated','public.user_roles','user_id','INSERT')),
      ('user_roles.role INSERT',        has_column_privilege('authenticated','public.user_roles','role','INSERT')),
      ('user_roles.is_active INSERT',   has_column_privilege('authenticated','public.user_roles','is_active','INSERT')),
      ('user_roles.is_verified INSERT', has_column_privilege('authenticated','public.user_roles','is_verified','INSERT')),
      ('user_roles.is_active UPDATE',   has_column_privilege('authenticated','public.user_roles','is_active','UPDATE')),
      ('user_roles.is_verified UPDATE', has_column_privilege('authenticated','public.user_roles','is_verified','UPDATE')),
      ('prefs.user_id INSERT',          has_column_privilege('authenticated','public.user_preferences','user_id','INSERT')),
      ('prefs.email_notifications UPDATE',
                                        has_column_privilege('authenticated','public.user_preferences','email_notifications','UPDATE')),
      ('prefs.sms_notifications UPDATE',
                                        has_column_privilege('authenticated','public.user_preferences','sms_notifications','UPDATE')),
      ('prefs.push_notifications UPDATE',
                                        has_column_privilege('authenticated','public.user_preferences','push_notifications','UPDATE'))
    ) AS x(lbl, held)
   WHERE NOT x.held;
  IF bad IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS I16 every live upsert payload column is still writable'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I16 an upsert payload column lost its grant: '||bad||E'\n';
  END IF;

  -- ===== I17: anon holds no write privilege on the identity tables =========
  -- TRUNCATE matters most: it is NOT subject to row-level security, so RLS
  -- cannot restrain it at all. DELETE matters because neither table has a
  -- DELETE policy, so the grant is inert today and would become live the
  -- moment anyone added one.
  SELECT string_agg(x.lbl, ', ') INTO bad
    FROM (VALUES
      ('roles/anon/INSERT',          has_table_privilege('anon','public.user_roles','INSERT')),
      ('roles/anon/UPDATE',          has_table_privilege('anon','public.user_roles','UPDATE')),
      ('roles/anon/DELETE',          has_table_privilege('anon','public.user_roles','DELETE')),
      ('roles/anon/TRUNCATE',        has_table_privilege('anon','public.user_roles','TRUNCATE')),
      ('roles/auth/DELETE',          has_table_privilege('authenticated','public.user_roles','DELETE')),
      ('roles/auth/TRUNCATE',        has_table_privilege('authenticated','public.user_roles','TRUNCATE')),
      ('prefs/anon/INSERT',          has_table_privilege('anon','public.user_preferences','INSERT')),
      ('prefs/anon/UPDATE',          has_table_privilege('anon','public.user_preferences','UPDATE')),
      ('prefs/anon/DELETE',          has_table_privilege('anon','public.user_preferences','DELETE')),
      ('prefs/anon/TRUNCATE',        has_table_privilege('anon','public.user_preferences','TRUNCATE')),
      ('prefs/auth/DELETE',          has_table_privilege('authenticated','public.user_preferences','DELETE')),
      ('prefs/auth/TRUNCATE',        has_table_privilege('authenticated','public.user_preferences','TRUNCATE'))
    ) AS x(lbl, still_held)
   WHERE x.still_held;
  IF bad IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS I17 no unreachable write privilege remains on the identity tables'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I17 privilege that should be revoked is held: '||bad||E'\n';
  END IF;

  -- ===== I18: anon must not see more providers than authenticated =========
  -- The two SELECT predicates on service_providers diverged: anon required
  -- is_active alone while authenticated required is_active AND
  -- account_status='active', so a suspended provider stayed visible to
  -- anonymous visitors and vanished only for signed-in ones.
  SELECT count(*) INTO n
    FROM pg_policies
   WHERE schemaname='public' AND tablename='service_providers' AND cmd='SELECT'
     AND policyname IN ('providers_public_read_active','providers_public_read_authenticated')
     AND qual LIKE '%account_status%';
  IF n = 2 THEN
    pass:=pass+1; rep:=rep||'PASS I18 both provider read predicates require account_status'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I18 only '||n||' of 2 provider read predicates check account_status'||E'\n';
  END IF;

  -- ===== I19: the service_providers INSERT and UPDATE allowlists agree ======
  -- 20260329 dropped table-level UPDATE and re-granted 42 of 50 columns by
  -- name, withholding the trust/money/derived-stat columns. It never did the
  -- same for INSERT, and a column REVOKE is inert while the table privilege is
  -- held, so all 50 were insertable: the eight columns a provider must never
  -- write were writable exactly once, at creation. 20260343 derives the INSERT
  -- allowlist FROM the UPDATE allowlist so the two cannot drift again. This
  -- asserts they have not.
  SELECT string_agg(attname, ', ' ORDER BY attname) INTO bad
    FROM pg_attribute
   WHERE attrelid = 'public.service_providers'::regclass
     AND attnum > 0 AND NOT attisdropped
     AND has_column_privilege('authenticated','public.service_providers',attname,'INSERT')
      <> has_column_privilege('authenticated','public.service_providers',attname,'UPDATE');
  IF bad IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS I19 service_providers INSERT and UPDATE allowlists agree'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I19 allowlists disagree on: '||bad||E'\n';
  END IF;

  -- ===== I20: the money and trust columns are not client-insertable =========
  -- wallet_balance is the one that mattered: request_provider_payout validates
  -- a payout amount against it and cannot validate how it arose, so a
  -- self-inserted balance was payable. is_verified and verification_badge
  -- would have published a fake verified provider.
  SELECT string_agg(c, ', ' ORDER BY c) INTO bad
    FROM unnest(ARRAY['account_status','average_rating','is_verified',
                      'total_earnings','total_jobs_completed','total_reviews',
                      'verification_badge','wallet_balance']) AS c
   WHERE has_column_privilege('authenticated','public.service_providers',c,'INSERT')
      OR has_column_privilege('anon','public.service_providers',c,'INSERT');
  IF bad IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS I20 no client can insert a trust or money column'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I20 client-insertable trust/money columns: '||bad||E'\n';
  END IF;

  -- ===== I21: table-level INSERT stays dropped, and creation still works ====
  -- Two halves of one property. Without the first, I19 and I20 are decorative;
  -- without the second, this suite would be green while provider signup was
  -- dead. The second is derived from the payload buildProviderProfile() emits.
  SELECT string_agg(x.lbl, ', ') INTO bad
    FROM (VALUES
      ('tbl INSERT held by authenticated',
        has_table_privilege('authenticated','public.service_providers','INSERT')),
      ('tbl INSERT held by anon',
        has_table_privilege('anon','public.service_providers','INSERT')),
      ('user_id NOT insertable',
        NOT has_column_privilege('authenticated','public.service_providers','user_id','INSERT')),
      ('business_name NOT insertable',
        NOT has_column_privilege('authenticated','public.service_providers','business_name','INSERT')),
      ('phone NOT insertable',
        NOT has_column_privilege('authenticated','public.service_providers','phone','INSERT')),
      ('business_type NOT insertable',
        NOT has_column_privilege('authenticated','public.service_providers','business_type','INSERT'))
    ) AS x(lbl, wrong)
   WHERE x.wrong;
  IF bad IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS I21 table INSERT dropped, provider creation intact'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I21 '||bad||E'\n';
  END IF;

  RAISE EXCEPTION E'IDENTITY_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$I$;
