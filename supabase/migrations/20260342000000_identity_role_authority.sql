-- =============================================================================
-- Identity: make the database the role authority, and retire the superseded
-- client write model
-- =============================================================================
-- Four defects, one migration, because they are one defect seen from four
-- sides: the identity subsystem declares an authorization model it does not
-- enforce, and a second, contradictory model was layered on top of it without
-- the first being withdrawn.
--
-- MEASURED STARTING STATE (live project, read-only catalog queries):
--
--   1. ZERO of 182 RLS policies consult user_roles or primary_role, and ZERO of
--      277 functions reference primary_role. The role model makes no
--      authorization decision inside the database. This contradicts
--      system_authority_model, which declares the database authoritative.
--
--   2. get_user_roles and user_has_role are the only two functions that read
--      user_roles, and EXECUTE on both is held by `postgres` and `service_role`
--      only. The sanctioned role API is closed to the clients meant to call it,
--      so 14 files in src/ read the table directly instead and NEITHER function
--      is called anywhere in the application.
--
--   3. A client can set user_roles.is_verified on its own row. The INSERT and
--      UPDATE policies constrain user_id and role but not the two flags, and
--      is_active is the only flag either role function reads.
--
--   4. 20260329000000_lock_client_write_surface.sql revoked the client write
--      grants but left the RLS policies that described the old model in place.
--      Eight policies now govern commands their role cannot execute. The policy
--      layer therefore advertises a write model the grant layer denies -- and
--      the policy layer is what a reader sees first.
--
-- WHY current_user_has_role IS *NOT* SECURITY DEFINER
--
-- The obvious implementation of defect 2 is `GRANT EXECUTE ON FUNCTION
-- user_has_role TO authenticated`. That is wrong here, and would have broken
-- the build. 20260336000000_relock_definer_surface.sql is a SWEEP: it revokes
-- client EXECUTE from EVERY SECURITY DEFINER function in `public` that does not
-- return trigger, with one named exception, and it carries a guard that fails
-- the migration if any such function is still client-executable.
-- client_write_surface_test.sql:188 asserts the same invariant. Granting
-- EXECUTE on a definer function would fail both, and would reopen a surface
-- that was deliberately closed after an incident.
--
-- So the client-callable predicate is SECURITY INVOKER. It does not need
-- definer rights: `user_roles` already grants SELECT to the client roles and
-- its SELECT policy is `auth.uid() = user_id`, so a caller reading its OWN
-- roles is already permitted. The function adds no privilege whatsoever -- it
-- only gives RLS policies and application code ONE expression to share instead
-- of 14 hand-rolled queries. Being non-definer also makes it permanently immune
-- to the relock sweep, so this cannot silently break the next time that
-- migration is re-applied.
--
-- WHY defect 3 NEEDS A TRIGGER AND NOT A POLICY
--
-- RLS cannot express "this column may not change". USING sees the old row and
-- WITH CHECK sees the new row; no policy expression can see both, so no policy
-- can compare them. The column-grant route (REVOKE UPDATE, re-GRANT a column
-- allowlist, as 20260329 did for profiles) would work but breaks a live caller:
-- src/app/(auth)/onboarding/provider-type/actions.ts:136 UPSERTS user_roles
-- with is_verified in the payload, so its ON CONFLICT DO UPDATE path needs
-- UPDATE on that column. Revoking it would reproduce exactly the regression
-- recorded in 20260337000000_grant_profiles_updated_at.sql, where an assertion
-- derived from the grant instead of from the payload the application sends
-- could not fail for the defect it was meant to cover.
--
-- A BEFORE UPDATE trigger is the only mechanism that closes the hole without
-- breaking that caller. It discriminates on `current_user`, not on auth.uid():
-- the admin path (src/lib/services/admin-verification.ts) uses
-- createAdminClient() and so arrives as `service_role`, which the trigger must
-- not block. `current_user` states that unambiguously; auth.uid() would not,
-- because a server action holding a user JWT is also `authenticated`.
--
-- SCOPE / BLAST RADIUS
--
-- Every table touched holds ZERO rows (profiles, user_roles, user_preferences,
-- service_providers, auth.users are all empty), so no data is read, written,
-- migrated or validated by this migration. It adds 3 functions and 1 trigger,
-- rewrites 2 policies, drops 8, and narrows 4 privileges. It changes no
-- application code; src/ keeps working exactly as it does today, and the guards
-- at the foot of this file fail the deploy if that stops being true.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--
--   - does not drop get_user_roles / user_has_role, although nothing calls
--     them. They keep their service_role-only grants and merely gain a pinned
--     search_path. Removing dead functions is not this migration's job.
--   - does not touch profiles' INSERT/UPDATE policies. "Users can update own
--     profile" is dead for `anon` but LIVE for `authenticated` via the column
--     grants, so dropping it would break profile editing for every signed-in
--     user. Narrowing its role list from {public} to {authenticated} is the
--     accurate fix and is left for a separate, reviewed change.
--   - does not drop user_roles.is_verified. Four files read it
--     (dashboard/landlord/layout.tsx:53, dashboard/page.tsx:60,
--     dashboard/searches/page.tsx:75, lib/cache/queries.ts:115).
--   - adds no RLS policy that CONSULTS the new predicate. This migration makes
--     the predicate available and correct; adopting it table by table is a
--     reviewed change per table, not a sweep.
-- =============================================================================


-- =============================================================================
-- 1a. Pin search_path on the two existing definer role functions
-- =============================================================================
-- Both are SECURITY DEFINER with proconfig NULL. Neither is exploitable today
-- (both schema-qualify public.user_roles, and clients hold no EXECUTE), so this
-- is conformance, not a fix. CREATE OR REPLACE keeps the same oid and therefore
-- the same ACL: the service_role-only grant is preserved, and the relock sweep's
-- invariant is untouched. Bodies are reproduced verbatim from
-- pg_get_functiondef on the live project.

CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(ARRAY_AGG(role), ARRAY[]::TEXT[])
  FROM public.user_roles
  WHERE user_id = p_user_id AND is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role = p_role
    AND is_active = true
  );
$function$;


-- =============================================================================
-- 1b. The shared, client-callable role predicate
-- =============================================================================
-- SECURITY INVOKER by omission -- see the header. STABLE so the planner may
-- evaluate it once per statement rather than once per row; idx_user_roles_
-- active_lookup (user_id, is_active) INCLUDE (role, is_verified) WHERE is_active
-- covers the lookup.
--
-- Two functions, not one with a boolean argument, because the distinction is a
-- product decision that callers must make explicitly:
--   current_user_has_role           -- the role is CLAIMED and active
--   current_user_has_verified_role  -- the role is also APPROVED
-- The existing get_user_roles/user_has_role read is_active ONLY and ignore
-- is_verified, so any caller that needs approval has, until now, had no way to
-- ask for it.

CREATE OR REPLACE FUNCTION public.current_user_has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = p_role
      AND is_active = true
  );
$function$;

COMMENT ON FUNCTION public.current_user_has_role(text) IS
  'Does the CALLER hold this role, active? SECURITY INVOKER on purpose: reads '
  'only the caller''s own rows under the existing user_roles SELECT policy, so '
  'it grants no privilege and is immune to the relock_definer_surface sweep. '
  'The single expression RLS policies and application code should share.';

CREATE OR REPLACE FUNCTION public.current_user_has_verified_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = p_role
      AND is_active = true
      AND is_verified = true
  );
$function$;

COMMENT ON FUNCTION public.current_user_has_verified_role(text) IS
  'Does the CALLER hold this role, active AND approved? user_roles.is_verified '
  'is role approval, distinct from profiles.verification_level, which is '
  'identity proof of the human.';

-- Granted to anon as well as authenticated, deliberately. For anon, auth.uid()
-- is NULL so both functions can only ever return false -- no information is
-- exposed. Withholding it would make any future RLS policy that calls the
-- predicate raise "permission denied for function" on unauthenticated reads
-- instead of simply evaluating to false, which is a trap worth closing now.
GRANT EXECUTE ON FUNCTION public.current_user_has_role(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_verified_role(text) TO anon, authenticated;


-- =============================================================================
-- 2a. A client may not INSERT a pre-verified role
-- =============================================================================
-- WITH CHECK evaluates the NEW row, so the INSERT half of defect 3 closes
-- cleanly in the policy. `is_verified IS NOT TRUE` rather than `= false`
-- because the column is nullable and NULL must also be acceptable (it is the
-- absent-value case the default fills with false).
--
-- `TO public` and the user_id/role predicates are reproduced unchanged from the
-- live policy; the third conjunct is the only new text.

DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert own roles" ON public.user_roles
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    AND role <> 'admin'::text
    AND is_verified IS NOT TRUE
  );


-- =============================================================================
-- 2b. A client may not UPDATE its own role to verified, or to admin
-- =============================================================================
-- The UPDATE half cannot be expressed as a policy (header). The UPDATE policy
-- itself is left exactly as it is; this trigger adds the old-vs-new comparison
-- the policy cannot make.

CREATE OR REPLACE FUNCTION public.fn_user_roles_block_client_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- current_user, not auth.uid(): the admin path arrives as service_role via
  -- createAdminClient() and must not be blocked, while a server action holding
  -- a user JWT is still `authenticated` and must be.
  IF current_user IN ('anon', 'authenticated') THEN

    IF NEW.is_verified IS TRUE AND OLD.is_verified IS NOT TRUE THEN
      RAISE EXCEPTION
        'a client may not set user_roles.is_verified; role approval is an admin action'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.role = 'admin'::text AND OLD.role <> 'admin'::text THEN
      RAISE EXCEPTION
        'a client may not grant the admin role'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

  END IF;

  RETURN NEW;
END
$function$;

COMMENT ON FUNCTION public.fn_user_roles_block_client_escalation() IS
  'Closes the one gap RLS cannot: a policy sees either the old row (USING) or '
  'the new row (WITH CHECK), never both, so no policy can forbid a COLUMN from '
  'changing. Returns trigger, so relock_definer_surface skips it.';

DROP TRIGGER IF EXISTS trg_user_roles_block_client_escalation ON public.user_roles;
CREATE TRIGGER trg_user_roles_block_client_escalation
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_user_roles_block_client_escalation();


-- =============================================================================
-- 3. Retire the eight policies that govern commands their role cannot execute
-- =============================================================================
-- PRE-ASSERTION FIRST. The whole risk of this migration sits in these eight
-- drops: if the census that identified them missed a grant path, dropping one
-- removes a live guard. So each is re-tested here, at apply time, against the
-- live privilege catalog, and the migration ABORTS rather than dropping a
-- policy that turns out to be reachable. A drop list that was correct when it
-- was written and wrong when it was applied is exactly how this kind of change
-- causes an incident.

DO $$
DECLARE
  r        record;
  live     text := '';
  n_dead   int  := 0;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('booking_disputes', 'disputes_insert_reporter',          'INSERT'),
      ('booking_quotes',   'booking_quotes_insert_provider',    'INSERT'),
      ('booking_quotes',   'booking_quotes_update_provider',    'UPDATE'),
      ('bookings',         'bookings_insert_customer',          'INSERT'),
      ('bookings',         'bookings_update_customer',          'UPDATE'),
      ('bookings',         'bookings_update_provider',          'UPDATE'),
      ('reviews',          'reviews_insert_reviewer',           'INSERT'),
      ('reviews',          'reviews_update_provider_response',  'UPDATE')
    ) AS t(tbl, pol, cmd)
  LOOP
    -- Skip anything already gone, so the migration is re-appliable.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = r.tbl AND policyname = r.pol
    ) THEN
      CONTINUE;
    END IF;

    -- A policy is dead only if EVERY role it names lacks the privilege for the
    -- command it governs, at table level AND at every column.
    IF EXISTS (
      SELECT 1
      FROM pg_policies p
      CROSS JOIN LATERAL unnest(p.roles) AS rr(rolename)
      WHERE p.schemaname = 'public' AND p.tablename = r.tbl AND p.policyname = r.pol
        AND rr.rolename IN ('anon', 'authenticated', 'public')
        AND (
          has_table_privilege(
            CASE WHEN rr.rolename = 'public' THEN 'authenticated' ELSE rr.rolename END,
            ('public.' || r.tbl)::regclass, r.cmd)
          OR has_any_column_privilege(
            CASE WHEN rr.rolename = 'public' THEN 'authenticated' ELSE rr.rolename END,
            ('public.' || r.tbl)::regclass, r.cmd)
        )
    ) THEN
      live := live || format('%s.%s (%s) ', r.tbl, r.pol, r.cmd);
    ELSE
      n_dead := n_dead + 1;
    END IF;
  END LOOP;

  IF live <> '' THEN
    RAISE EXCEPTION
      'ABORT: these policies are NOT dead -- the role CAN execute the command they govern: %. '
      'Dropping them would remove a live authorization guard.', live;
  END IF;

  RAISE NOTICE 'pre-assertion passed: % policy(ies) confirmed unreachable', n_dead;
END
$$;

-- Verbatim originals, for the DOWN block at the foot of this file.
DROP POLICY IF EXISTS "disputes_insert_reporter"         ON public.booking_disputes;
DROP POLICY IF EXISTS "booking_quotes_insert_provider"   ON public.booking_quotes;
DROP POLICY IF EXISTS "booking_quotes_update_provider"   ON public.booking_quotes;
DROP POLICY IF EXISTS "bookings_insert_customer"         ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_customer"         ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_provider"         ON public.bookings;
DROP POLICY IF EXISTS "reviews_insert_reviewer"          ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_provider_response" ON public.reviews;


-- =============================================================================
-- 4. Narrow the identity-table privileges to what is actually reachable
-- =============================================================================
-- TRUNCATE is granted to `anon` on user_roles and user_preferences, and
-- TRUNCATE is NOT subject to row-level security -- RLS cannot restrain it at
-- all. DELETE is granted on both although neither table has a DELETE policy, so
-- it is inert today and would silently become live the moment anyone added one.
-- Nothing in src/ deletes from either table, and nothing in src/ truncates
-- anything.
--
-- anon additionally loses INSERT and UPDATE on both tables. It holds no
-- INSERT/UPDATE policy on either, so those grants are pure unreachable surface;
-- removing them cannot change behaviour.
--
-- `authenticated` KEEPS INSERT and UPDATE on both tables, deliberately. The
-- upserts at onboarding/provider-type/actions.ts:136,
-- dashboard/settings/actions.ts:141 and dashboard/provider/settings/actions.ts:143
-- need them, and the guards below fail the deploy if this migration takes them
-- away by accident.

REVOKE TRUNCATE, DELETE          ON public.user_roles       FROM anon, authenticated;
REVOKE TRUNCATE, DELETE          ON public.user_preferences FROM anon, authenticated;
REVOKE INSERT, UPDATE            ON public.user_roles       FROM anon;
REVOKE INSERT, UPDATE            ON public.user_preferences FROM anon;


-- =============================================================================
-- 5. Anonymous visitors must not see more than signed-in ones
-- =============================================================================
-- providers_public_read_active ({anon}) required is_active alone, while
-- providers_public_read_authenticated ({authenticated}) required is_active AND
-- account_status = 'active'. A provider whose account_status was moved away from
-- 'active' -- a suspension -- therefore remained visible to anonymous visitors
-- and disappeared only for signed-in ones. Confirmed a defect, not a deliberate
-- asymmetry. The two predicates are now identical.

DROP POLICY IF EXISTS providers_public_read_active ON public.service_providers;
CREATE POLICY providers_public_read_active ON public.service_providers
  FOR SELECT TO anon
  USING (is_active = true AND account_status = 'active'::text);


-- =============================================================================
-- GUARDS -- this migration fails the deploy rather than half-applying
-- =============================================================================

DO $$
DECLARE
  bad text;
BEGIN
  -- ---- 1b: the new predicates must exist, be NON-definer, and be callable ---
  -- Non-definer is load-bearing: a definer function here would be revoked by
  -- the next apply of relock_definer_surface, silently breaking every policy
  -- that had come to depend on it.
  SELECT string_agg(p.proname, ', ')
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('current_user_has_role', 'current_user_has_verified_role')
     AND p.prosecdef;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'the shared role predicate(s) are SECURITY DEFINER: %. '
      'relock_definer_surface will revoke them on its next apply.', bad;
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.current_user_has_role(text)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.current_user_has_role(text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'current_user_has_role is not executable by the client roles';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.current_user_has_verified_role(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'current_user_has_verified_role is not executable by authenticated';
  END IF;

  -- The predicates must be STABLE or better; a VOLATILE predicate would be
  -- re-evaluated per row inside every policy that uses it.
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('current_user_has_role', 'current_user_has_verified_role')
       AND p.provolatile = 'v'
  ) THEN
    RAISE EXCEPTION 'the shared role predicate is VOLATILE; it must be STABLE';
  END IF;

  -- ---- 1a: search_path pinned on every role-reading definer function --------
  SELECT string_agg(p.proname, ', ')
    INTO bad
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('get_user_roles', 'user_has_role')
     AND (p.proconfig IS NULL
          OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'definer role function(s) still have no search_path: %', bad;
  END IF;

  -- ---- 1a: and they must NOT have become client-executable -----------------
  -- CREATE OR REPLACE preserves the ACL, so this should be impossible. It is
  -- asserted because "should be impossible" is what reopened this surface the
  -- first time (see relock_definer_surface's own header).
  IF has_function_privilege('anon', 'public.user_has_role(uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.user_has_role(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_user_roles(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.get_user_roles(uuid)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'a definer role function became client-executable; the relock invariant is broken';
  END IF;

  -- ---- the relock invariant itself, restated ------------------------------
  SELECT string_agg(p.oid::regprocedure::text, ', ')
    INTO bad
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public'
     AND p.prosecdef
     AND pg_get_function_result(p.oid) <> 'trigger'
     AND p.proname <> 'increment_listing_views'
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
          OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'definer surface is client-executable after this migration: %', bad;
  END IF;

  -- ---- 2a/2b: the escalation gap is closed --------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'user_roles'
       AND policyname = 'Users can insert own roles'
       AND with_check LIKE '%is_verified%'
  ) THEN
    RAISE EXCEPTION 'the user_roles INSERT policy does not constrain is_verified';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
     WHERE t.tgrelid = 'public.user_roles'::regclass
       AND t.tgname = 'trg_user_roles_block_client_escalation'
       AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'the user_roles escalation trigger is not installed';
  END IF;

  -- ---- 3: the eight policies are gone -------------------------------------
  SELECT string_agg(tablename || '.' || policyname, ', ')
    INTO bad
    FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname IN (
       'disputes_insert_reporter', 'booking_quotes_insert_provider',
       'booking_quotes_update_provider', 'bookings_insert_customer',
       'bookings_update_customer', 'bookings_update_provider',
       'reviews_insert_reviewer', 'reviews_update_provider_response');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'superseded policies survived the drop: %', bad;
  END IF;

  -- ---- 3: and the one that must SURVIVE, survived -------------------------
  -- "Users can update own profile" is dead for anon but live for authenticated
  -- via the profiles column grants. If a future edit folds it into the drop
  -- list, every signed-in user loses profile editing.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles'
       AND policyname = 'Users can update own profile'
  ) THEN
    RAISE EXCEPTION 'the live profiles UPDATE policy was dropped; signed-in users cannot edit their profile';
  END IF;

  -- ---- 4: privileges narrowed, and NOT over-narrowed ----------------------
  SELECT string_agg(x.lbl, ', ')
    INTO bad
    FROM (VALUES
      ('user_roles/anon/TRUNCATE',             has_table_privilege('anon','public.user_roles','TRUNCATE')),
      ('user_roles/authenticated/TRUNCATE',    has_table_privilege('authenticated','public.user_roles','TRUNCATE')),
      ('user_roles/anon/DELETE',               has_table_privilege('anon','public.user_roles','DELETE')),
      ('user_roles/authenticated/DELETE',      has_table_privilege('authenticated','public.user_roles','DELETE')),
      ('user_prefs/anon/TRUNCATE',             has_table_privilege('anon','public.user_preferences','TRUNCATE')),
      ('user_prefs/authenticated/TRUNCATE',    has_table_privilege('authenticated','public.user_preferences','TRUNCATE')),
      ('user_prefs/anon/DELETE',               has_table_privilege('anon','public.user_preferences','DELETE')),
      ('user_prefs/authenticated/DELETE',      has_table_privilege('authenticated','public.user_preferences','DELETE')),
      ('user_roles/anon/INSERT',               has_table_privilege('anon','public.user_roles','INSERT')),
      ('user_prefs/anon/INSERT',               has_table_privilege('anon','public.user_preferences','INSERT'))
    ) AS x(lbl, still_held)
   WHERE x.still_held;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'privileges that should have been revoked are still held: %', bad;
  END IF;

  -- The live upsert payloads must still be writable. These assertions are
  -- derived from what the application SENDS, not from what the migration
  -- grants -- the distinction 20260337000000 was written to record.
  -- onboarding/provider-type/actions.ts:136 upserts user_id, role, is_active,
  -- is_verified, so DO UPDATE needs INSERT and UPDATE on all four.
  SELECT string_agg(x.lbl, ', ')
    INTO bad
    FROM (VALUES
      ('user_roles.user_id INSERT',     has_column_privilege('authenticated','public.user_roles','user_id','INSERT')),
      ('user_roles.role INSERT',        has_column_privilege('authenticated','public.user_roles','role','INSERT')),
      ('user_roles.is_active INSERT',   has_column_privilege('authenticated','public.user_roles','is_active','INSERT')),
      ('user_roles.is_verified INSERT', has_column_privilege('authenticated','public.user_roles','is_verified','INSERT')),
      ('user_roles.is_active UPDATE',   has_column_privilege('authenticated','public.user_roles','is_active','UPDATE')),
      ('user_roles.is_verified UPDATE', has_column_privilege('authenticated','public.user_roles','is_verified','UPDATE')),
      ('user_prefs.user_id INSERT',     has_column_privilege('authenticated','public.user_preferences','user_id','INSERT')),
      ('user_prefs.email_notifications UPDATE',
                                        has_column_privilege('authenticated','public.user_preferences','email_notifications','UPDATE')),
      ('user_prefs.sms_notifications UPDATE',
                                        has_column_privilege('authenticated','public.user_preferences','sms_notifications','UPDATE')),
      ('user_prefs.push_notifications UPDATE',
                                        has_column_privilege('authenticated','public.user_preferences','push_notifications','UPDATE'))
    ) AS x(lbl, held)
   WHERE NOT x.held;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'this migration broke a live upsert payload -- missing: %', bad;
  END IF;

  -- ---- 5: the two provider read predicates now agree ----------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'service_providers'
       AND policyname = 'providers_public_read_active'
       AND qual LIKE '%account_status%'
  ) THEN
    RAISE EXCEPTION 'the anon provider read policy still ignores account_status';
  END IF;

  RAISE NOTICE 'identity_role_authority: all guards passed';
END
$$;


-- =============================================================================
-- DOWN -- exact inverse, for reference. Reversible because every table involved
-- holds zero rows and no external financial effect is in play; that will NOT be
-- true of the structural migrations that follow this one.
-- =============================================================================
--
-- DROP TRIGGER IF EXISTS trg_user_roles_block_client_escalation ON public.user_roles;
-- DROP FUNCTION IF EXISTS public.fn_user_roles_block_client_escalation();
-- DROP FUNCTION IF EXISTS public.current_user_has_role(text);
-- DROP FUNCTION IF EXISTS public.current_user_has_verified_role(text);
--
-- DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
-- CREATE POLICY "Users can insert own roles" ON public.user_roles
--   FOR INSERT TO public
--   WITH CHECK ((auth.uid() = user_id) AND (role <> 'admin'::text));
--
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.user_roles       TO anon, authenticated;
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.user_preferences TO anon, authenticated;
--
-- DROP POLICY IF EXISTS providers_public_read_active ON public.service_providers;
-- CREATE POLICY providers_public_read_active ON public.service_providers
--   FOR SELECT TO anon USING (is_active = true);
--
-- CREATE POLICY disputes_insert_reporter ON public.booking_disputes
--   FOR INSERT TO authenticated
--   WITH CHECK (((reported_by = auth.uid()) AND (booking_id IN ( SELECT bookings.id
--      FROM bookings
--     WHERE ((bookings.customer_id = auth.uid()) OR (bookings.provider_id IN ( SELECT service_providers.id
--             FROM service_providers
--            WHERE (service_providers.user_id = auth.uid()))))))));
--
-- CREATE POLICY booking_quotes_insert_provider ON public.booking_quotes
--   FOR INSERT TO authenticated
--   WITH CHECK ((provider_id IN ( SELECT service_providers.id
--      FROM service_providers
--     WHERE (service_providers.user_id = auth.uid()))));
--
-- CREATE POLICY booking_quotes_update_provider ON public.booking_quotes
--   FOR UPDATE TO authenticated
--   USING ((provider_id IN ( SELECT service_providers.id
--      FROM service_providers
--     WHERE (service_providers.user_id = auth.uid()))))
--   WITH CHECK ((provider_id IN ( SELECT service_providers.id
--      FROM service_providers
--     WHERE (service_providers.user_id = auth.uid()))));
--
-- CREATE POLICY bookings_insert_customer ON public.bookings
--   FOR INSERT TO authenticated WITH CHECK ((customer_id = auth.uid()));
--
-- CREATE POLICY bookings_update_customer ON public.bookings
--   FOR UPDATE TO authenticated
--   USING ((customer_id = auth.uid())) WITH CHECK ((customer_id = auth.uid()));
--
-- CREATE POLICY bookings_update_provider ON public.bookings
--   FOR UPDATE TO authenticated
--   USING ((provider_id IN ( SELECT service_providers.id
--      FROM service_providers
--     WHERE (service_providers.user_id = auth.uid()))))
--   WITH CHECK ((provider_id IN ( SELECT service_providers.id
--      FROM service_providers
--     WHERE (service_providers.user_id = auth.uid()))));
--
-- CREATE POLICY reviews_insert_reviewer ON public.reviews
--   FOR INSERT TO authenticated
--   WITH CHECK (((reviewer_id = auth.uid()) AND (booking_id IN ( SELECT bookings.id
--      FROM bookings
--     WHERE (bookings.customer_id = auth.uid())))));
--
-- CREATE POLICY reviews_update_provider_response ON public.reviews
--   FOR UPDATE TO authenticated
--   USING ((provider_id IN ( SELECT service_providers.id
--      FROM service_providers
--     WHERE (service_providers.user_id = auth.uid()))))
--   WITH CHECK ((provider_id IN ( SELECT service_providers.id
--      FROM service_providers
--     WHERE (service_providers.user_id = auth.uid()))));
--
-- CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id uuid)
-- RETURNS text[] LANGUAGE sql SECURITY DEFINER AS $f$
--   SELECT COALESCE(ARRAY_AGG(role), ARRAY[]::TEXT[])
--   FROM public.user_roles WHERE user_id = p_user_id AND is_active = true;
-- $f$;
-- CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id uuid, p_role text)
-- RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $f$
--   SELECT EXISTS (SELECT 1 FROM public.user_roles
--     WHERE user_id = p_user_id AND role = p_role AND is_active = true);
-- $f$;
-- =============================================================================
