-- =============================================================================
-- One provisioning path: provision_identity()
-- =============================================================================
-- Nothing in the database created a profile. No trigger on auth.users, and no
-- function anywhere that inserted into profiles -- verified by sweeping
-- pg_trigger (including internal triggers: all 36 on auth.users are RI
-- constraint triggers) and pg_get_functiondef across public and auth.
--
-- So provisioning was application-only and non-atomic. src/app/auth/callback/
-- route.ts ran three sequential writes, each logged-and-continued:
--
--     profiles insert        (line 118)
--     user_roles insert      (line 135)
--     service_providers      (line 153)
--
-- A failure at the first made the second fail by foreign key, while the third
-- SUCCEEDED anyway because service_providers.user_id had no FK at all. A
-- half-failed signup therefore produced: no profile, no role, and a live
-- provider row with a dangling user_id. 20260345 closed that third hole, so
-- what remains is the first two, and the deeper problem: there was no single
-- place that said what it means to provision an identity.
--
-- Thirty-two foreign keys now point at profiles.id. A signed-in user with no
-- profile row cannot be booked, cannot be paid, cannot hold a role, and cannot
-- appear in profiles_public. That is the failure this function exists to make
-- impossible.
--
-- WHY THIS IS *NOT* SECURITY DEFINER
--
-- The instinctive shape for a provisioning function is SECURITY DEFINER, so it
-- can write past RLS. That is wrong here and would have broken the build.
-- 20260336000000_relock_definer_surface.sql is a SWEEP: it revokes client
-- EXECUTE from every SECURITY DEFINER function in public that does not return
-- trigger, with one named exception, and carries a guard that fails the
-- migration if any such function is still client-executable.
-- client_write_surface_test.sql:188 asserts the same invariant.
--
-- And it is not needed. Every policy this function writes under is already
-- keyed to the caller:
--
--     profiles          INSERT  WITH CHECK (auth.uid() = id)
--     user_roles        INSERT  WITH CHECK (auth.uid() = user_id
--                                            AND role <> 'admin'
--                                            AND is_verified IS NOT TRUE)
--
-- A caller provisioning THEMSELVES is already permitted. What was missing was
-- never privilege -- it was atomicity. A function body is a single statement
-- from the caller's point of view, so the two inserts either both happen or
-- neither does, with no elevation anywhere. Being SECURITY INVOKER also makes
-- it permanently immune to the relock sweep.
--
-- IDEMPOTENT, BECAUSE THE CALLER RETRIES BY DESIGN
--
-- Both ON CONFLICT clauses are DO NOTHING. The auth callback runs on every
-- OAuth login, not only the first, so a signup that half-failed self-heals on
-- the user's next login: the second call creates whatever the first did not and
-- reports `false` for the parts that already existed. That is a better
-- guarantee than a trigger on auth.users would give -- and a trigger there is a
-- liability, because an error inside it fails the INSERT into auth.users and so
-- blocks signup entirely, for every user, including signups that have nothing
-- to do with profiles.
--
-- The return value reports what actually happened rather than succeeding
-- silently, so a caller can distinguish "created" from "already existed" and
-- neither is an error.
--
-- NOT IN SCOPE: the service_providers row. It needs a business name and a real
-- phone, it is created at /onboarding/provider-type by setProviderType(), and
-- src/lib/identity/provider-profile.ts is the single place that builds its
-- payload. primary_role maintenance for a user GAINING a role also stays in the
-- application, which computes it by hierarchy; this function only sets it at
-- creation.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.provision_identity(
  p_email      text,
  p_phone      text DEFAULT NULL,
  p_full_name  text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_role       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
-- SECURITY INVOKER by omission, deliberately. See the header: this must not be
-- DEFINER, or relock_definer_surface will revoke it on its next apply and every
-- caller breaks.
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid             uuid := auth.uid();
  v_profile_created boolean := false;
  v_role_created    boolean := false;
  v_n               int;
BEGIN
  -- The function provisions THE CALLER and nobody else. There is no user_id
  -- parameter on purpose: one would be a lie, because RLS would reject any
  -- value other than auth.uid() anyway, and offering it invites a caller to
  -- believe they can provision someone else.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'provision_identity requires an authenticated caller'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'provision_identity: email is required'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Rejected here rather than left to RLS, so the caller gets a message that
  -- says what is wrong instead of a bare row-level-security violation.
  IF p_role IS NOT NULL AND p_role NOT IN ('tenant', 'landlord', 'service_provider') THEN
    RAISE EXCEPTION 'provision_identity: % is not a self-assignable role', p_role
      USING ERRCODE = 'check_violation';
  END IF;

  -- ---- the profile -------------------------------------------------------
  -- is_verified is NOT written: it is a generated column derived from
  -- verification_level. verification_level is not written either -- a new
  -- identity starts at its default 'none', and only admin approval moves it.
  INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, primary_role)
  VALUES (v_uid, btrim(p_email), p_phone, p_full_name, p_avatar_url, p_role)
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_profile_created := (v_n = 1);

  -- ---- the role ----------------------------------------------------------
  IF p_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, is_active, is_verified)
    VALUES (v_uid, p_role, true, false)
    ON CONFLICT (user_id, role) DO NOTHING;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_role_created := (v_n = 1);
  END IF;

  RETURN jsonb_build_object(
    'user_id',          v_uid,
    'profile_created',  v_profile_created,
    'role_created',     v_role_created,
    'role',             p_role
  );
END
$function$;

COMMENT ON FUNCTION public.provision_identity(text, text, text, text, text) IS
  'Creates the CALLER''s profile and, optionally, one self-assignable role, '
  'atomically and idempotently. SECURITY INVOKER on purpose: it needs no '
  'privilege beyond what the caller already holds (both policies are keyed to '
  'auth.uid()), and a DEFINER function here would be revoked by '
  'relock_definer_surface. Returns what was created; already-existing is not '
  'an error. Does NOT create the service_providers row -- that needs a business '
  'name and a real phone and belongs to setProviderType().';

-- REVOKE FROM PUBLIC IS NOT ENOUGH, and the first version of this migration got
-- it wrong -- the guard below caught it on a dry run before it was applied.
--
-- This project carries ALTER DEFAULT PRIVILEGES on schema public, from both
-- supabase_admin and postgres, granting EXECUTE to anon, authenticated AND
-- service_role on every newly created function:
--
--   {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
-- Those are DIRECT grants, not grants via PUBLIC, so revoking PUBLIC leaves
-- them in place. anon must be named explicitly. This is the same trap
-- 20260336000000_relock_definer_surface.sql was written to sweep up, and the
-- reason it is a sweep rather than a list: in this database a new function is
-- client-executable the moment it is created.
--
-- anon would always fail the auth.uid() check anyway, so this is about not
-- offering an entry point rather than about a reachable hole.
REVOKE ALL ON FUNCTION public.provision_identity(text, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_identity(text, text, text, text, text) TO authenticated;


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  v_oid oid;
BEGIN
  SELECT p.oid INTO v_oid
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'provision_identity';

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'provision_identity was not created';
  END IF;

  -- ---- NOT definer. This is the load-bearing one -------------------------
  IF (SELECT prosecdef FROM pg_proc WHERE oid = v_oid) THEN
    RAISE EXCEPTION 'provision_identity is SECURITY DEFINER; relock_definer_surface '
      'will revoke client EXECUTE on its next apply and every caller will break';
  END IF;

  -- ---- search_path pinned ------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p, unnest(coalesce(p.proconfig, ARRAY[]::text[])) c
     WHERE p.oid = v_oid AND c LIKE 'search_path=%'
  ) THEN
    RAISE EXCEPTION 'provision_identity does not pin search_path';
  END IF;

  -- ---- callable by the role that needs it, and not by anon --------------
  IF NOT has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute provision_identity';
  END IF;
  IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute provision_identity; it was not revoked from PUBLIC';
  END IF;

  -- ---- the relock invariant still holds across the whole schema ---------
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prosecdef
       AND pg_get_function_result(p.oid) <> 'trigger'
       AND p.proname <> 'increment_listing_views'
       AND (has_function_privilege('anon', p.oid, 'EXECUTE')
            OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'definer surface became client-executable';
  END IF;

  -- ---- the columns it writes must be writable by a client ---------------
  -- Derived from the INSERT statements above, not from the grant. If a future
  -- lockdown revokes one of these, provisioning breaks and this says so at
  -- deploy time rather than at a user's first signup.
  IF NOT (has_column_privilege('authenticated','public.profiles','id','INSERT')
      AND has_column_privilege('authenticated','public.profiles','email','INSERT')
      AND has_column_privilege('authenticated','public.profiles','phone','INSERT')
      AND has_column_privilege('authenticated','public.profiles','full_name','INSERT')
      AND has_column_privilege('authenticated','public.profiles','avatar_url','INSERT')
      AND has_column_privilege('authenticated','public.profiles','primary_role','INSERT'))
  THEN
    RAISE EXCEPTION 'provision_identity cannot insert a profile: a column grant is missing';
  END IF;

  IF NOT (has_column_privilege('authenticated','public.user_roles','user_id','INSERT')
      AND has_column_privilege('authenticated','public.user_roles','role','INSERT')
      AND has_column_privilege('authenticated','public.user_roles','is_active','INSERT')
      AND has_column_privilege('authenticated','public.user_roles','is_verified','INSERT'))
  THEN
    RAISE EXCEPTION 'provision_identity cannot insert a role: a column grant is missing';
  END IF;

  -- ---- it must NOT write the generated or trust columns -----------------
  -- COMMENTS ARE STRIPPED FIRST. pg_get_functiondef returns the body including
  -- its SQL comments, and the first version of this guard fired on this
  -- function's OWN comment explaining that it does not write
  -- verification_level. src/__tests__/profile-read-scope.test.ts records the
  -- same mistake in TypeScript: "a comment EXPLAINING the defect reads as the
  -- defect -- which is how the first version of this file failed". A check that
  -- fires on documentation is worse than no check, because the fix is to delete
  -- the explanation.
  --
  -- These two are defence in depth, not the real enforcement. The database
  -- already refuses both: profiles.is_verified is GENERATED, so any write to it
  -- errors 428C9, and `authenticated` holds neither INSERT nor UPDATE on
  -- verification_level, so a write errors 42501. These guards exist to fail at
  -- deploy time rather than at a user's first signup.
  DECLARE
    body text := regexp_replace(pg_get_functiondef(v_oid), '--[^\n]*', '', 'g');
  BEGIN
    -- Scoped to the profiles INSERT column list on purpose:
    -- user_roles.is_verified IS written here, as false, and must keep being
    -- written -- it is role approval, a different concept. Only the profiles
    -- column is forbidden.
    IF substring(body from 'INSERT INTO public\.profiles[^)]*\)') ILIKE '%is_verified%' THEN
      RAISE EXCEPTION 'provision_identity inserts is_verified into profiles; it is generated';
    END IF;

    IF body ILIKE '%verification_level%' THEN
      RAISE EXCEPTION 'provision_identity touches verification_level; only admin approval may';
    END IF;
  END;

  RAISE NOTICE 'provision_identity: all guards passed';
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
-- DROP FUNCTION IF EXISTS public.provision_identity(text, text, text, text, text);
--
-- Clean: the function holds no state. Callers must be restored to their own
-- sequential inserts first, or signup stops creating profiles.
-- =============================================================================
