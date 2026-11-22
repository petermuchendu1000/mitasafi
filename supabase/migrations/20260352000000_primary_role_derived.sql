-- =============================================================================
-- C-2: profiles.primary_role stops being something the application asserts
-- =============================================================================
-- MEASURED STATE BEFORE THIS MIGRATION
--
-- profiles.primary_role is written by the browser at three places:
--   src/app/(auth)/signup/page.tsx:550   .update({ primary_role: userRole })
--   src/app/(auth)/signup/page.tsx:736   .update({ primary_role: newPrimaryRole })
--   src/app/auth/callback/route.ts:260   .update({ primary_role: newPrimaryRole })
-- plus once by provision_identity, which inserts it with the signup role.
--
-- It is READ at five places (the dashboard, the dashboard profile action, the
-- dashboard service, the saved-searches page, and the auth callback), and it
-- carries an index (idx_profiles_primary_role) and a CHECK constraint
-- (tenant | landlord | service_provider).
--
-- And ZERO of the RLS policies and ZERO of the functions make any authorization
-- decision from it. user_roles is the authority -- that is what
-- 20260342000000_identity_role_authority.sql established.
--
-- So primary_role is a DENORMALIZATION of user_roles that the client maintains
-- by hand. Every one of those three writes is a separate chance to disagree
-- with the table it summarises, and each one is logged-and-continued, so a
-- failure leaves the two permanently inconsistent with nothing raised. The
-- signup write at :550 does not even consult the user's existing roles -- it
-- assigns the role just chosen, so a landlord who later signs up as a provider
-- could have had their primary_role lowered, depending on path.
--
-- WHAT THIS MIGRATION DOES
--
-- Makes the column DERIVED. It cannot be a GENERATED column: generation
-- expressions may only reference the same row, and this value comes from
-- another table. So two triggers:
--
--   1. BEFORE INSERT OR UPDATE OF primary_role ON profiles
--      overwrites whatever was supplied with the derived value. Any client
--      write becomes a no-op rather than an error, which is why no grant has
--      to change and why none of the already-applied migrations that GRANT or
--      INSERT this column (20260329, 20260337, 20260346) need touching.
--
--   2. AFTER INSERT OR UPDATE OR DELETE ON user_roles
--      refreshes the summary for the affected user, so the two can no longer
--      drift in the other direction either.
--
-- WHY NOT DROP THE COLUMN
--
-- It was the first thing considered. Dropping it would force every reader onto
-- primaryRoleOf(), which is the cleaner shape. It was rejected on measured
-- grounds: three ALREADY-APPLIED migrations name the column in GRANT and
-- INSERT statements, and check-migration-idempotency.mjs re-applies every
-- migration against the final schema -- so dropping it makes
-- `GRANT INSERT (... primary_role ...)` in 20260329 fail on replay, taking the
-- idempotency baseline with it. The column also backs an index and is selected
-- by five call sites. Deriving it costs one trigger pair and changes no
-- reader; dropping it costs a schema-replay break and five edits for the same
-- invariant.
--
-- THE HIERARCHY, AND A DELIBERATE DIVERGENCE
--
-- The derivation mirrors primaryRoleOf() in src/lib/identity/roles.ts:
--   landlord > service_provider > tenant, and NULL for a user who holds none.
--
-- getPrimaryRoleByHierarchy() in src/types/db-helpers.ts instead falls back to
-- `roles[0] || 'landlord'` for an empty set. That fallback is NOT reproduced
-- here, on purpose: inventing 'landlord' for someone who holds no role is how
-- the old code came to display a role to users who had none, and primaryRoleOf
-- was written to stop doing it. NULL is the honest answer and the column is
-- nullable.
--
-- 'admin' is excluded from the derivation -- profiles_primary_role_check does
-- not permit it, and an admin is not a product role.
--
-- ROWS AFFECTED: 0. profiles is empty.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The derivation, in one place
-- -----------------------------------------------------------------------------
-- Both triggers call this, so the hierarchy exists once in SQL rather than
-- twice. STABLE, not IMMUTABLE: it reads a table.
CREATE OR REPLACE FUNCTION public.derive_primary_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT CASE
           WHEN bool_or(role = 'landlord')         THEN 'landlord'
           WHEN bool_or(role = 'service_provider') THEN 'service_provider'
           WHEN bool_or(role = 'tenant')           THEN 'tenant'
           ELSE NULL
         END
    FROM public.user_roles
   WHERE user_id = p_user_id
     AND is_active
     AND role <> 'admin';
$function$;

COMMENT ON FUNCTION public.derive_primary_role(uuid) IS
  'The one hierarchy in SQL: landlord > service_provider > tenant, NULL for a '
  'user holding no product role. Mirrors primaryRoleOf() in '
  'src/lib/identity/roles.ts, deliberately NOT the roles[0] || landlord '
  'fallback in getPrimaryRoleByHierarchy(). service_role EXECUTE only -- it is '
  'called by triggers, never by a client.';

-- REQUIRED, not hygiene. This function is SECURITY DEFINER and does NOT return
-- trigger, so it falls inside the sweep that
-- 20260336000000_relock_definer_surface.sql performs and that
-- client_write_surface_test.sql re-asserts: no client role may hold EXECUTE on
-- any SECURITY DEFINER function in public except increment_listing_views.
--
-- Without these two lines the function is created client-executable -- ALTER
-- DEFAULT PRIVILEGES on schema public grants EXECUTE to anon and authenticated
-- DIRECTLY, so REVOKE ... FROM PUBLIC alone would not do it and both roles must
-- be named -- and this migration silently breaks an invariant established four
-- migrations earlier. Measured, not assumed: the first apply of this migration
-- left has_function_privilege('authenticated', ...) true.
--
-- The two trigger functions below need no such REVOKE: they return trigger, so
-- the sweep excludes them, and a trigger function is not callable directly.
REVOKE ALL ON FUNCTION public.derive_primary_role(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.derive_primary_role(uuid) TO service_role;

-- An empty set makes every bool_or NULL, so every WHEN is NULL and the CASE
-- falls to ELSE NULL. Spelled out because "no rows" and "no product role" reach
-- the same answer by different routes and both must give NULL.


-- -----------------------------------------------------------------------------
-- 1. profiles: the column is not the writer's to choose
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiles_derive_primary_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Whatever the caller supplied is discarded. This is why the client GRANT on
  -- the column can stay: the write still succeeds, it just no longer decides
  -- anything, so no existing migration guard or signup path breaks.
  NEW.primary_role := public.derive_primary_role(NEW.id);
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_profiles_derive_primary_role ON public.profiles;
CREATE TRIGGER trg_profiles_derive_primary_role
  BEFORE INSERT OR UPDATE OF primary_role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_derive_primary_role();

-- UPDATE OF primary_role, not UPDATE: an update that does not mention the
-- column cannot change it, so re-deriving on every profile update would add a
-- subquery per row change for no effect.


-- -----------------------------------------------------------------------------
-- 2. user_roles: a role change refreshes the summary
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_user_roles_sync_primary_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid uuid;
BEGIN
  -- On UPDATE the row could in principle move between users, so both are
  -- refreshed. OLD is absent on INSERT and NEW on DELETE.
  IF TG_OP <> 'INSERT' AND OLD.user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET primary_role = public.derive_primary_role(OLD.user_id)
     WHERE id = OLD.user_id
       AND primary_role IS DISTINCT FROM public.derive_primary_role(OLD.user_id);
  END IF;

  IF TG_OP <> 'DELETE' AND NEW.user_id IS NOT NULL THEN
    v_uid := NEW.user_id;
    UPDATE public.profiles
       SET primary_role = public.derive_primary_role(v_uid)
     WHERE id = v_uid
       AND primary_role IS DISTINCT FROM public.derive_primary_role(v_uid);
  END IF;

  RETURN NULL;   -- AFTER trigger: the return value is ignored
END
$function$;

-- IS DISTINCT FROM is deliberate. Without it every role write would touch the
-- profiles row, and update_profiles_updated_at would bump profiles.updated_at
-- on a change that did not alter the profile. It also keeps this a no-op in the
-- common case where the summary is already right.
--
-- The profiles UPDATE re-fires trigger 1, which recomputes the same value. That
-- terminates -- trigger 1 touches only NEW, never user_roles -- and costs one
-- extra evaluation of a STABLE function.

DROP TRIGGER IF EXISTS trg_user_roles_sync_primary_role ON public.user_roles;
CREATE TRIGGER trg_user_roles_sync_primary_role
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_user_roles_sync_primary_role();


-- -----------------------------------------------------------------------------
-- Reconcile whatever is already stored
-- -----------------------------------------------------------------------------
-- 0 rows today, but a migration that installs the invariant and leaves existing
-- rows disagreeing with it has not established the invariant.
UPDATE public.profiles p
   SET primary_role = public.derive_primary_role(p.id)
 WHERE p.primary_role IS DISTINCT FROM public.derive_primary_role(p.id);


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  n       int;
  v_ok    boolean := true;
  v_msg   text    := '';
  u       uuid    := '00000000-0000-4000-8000-0000000c2c2c';
  got     text;
BEGIN
  -- ---- the pieces exist, and are shaped as intended -----------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.proname = 'derive_primary_role'
  ) THEN RAISE EXCEPTION 'derive_primary_role is missing'; END IF;

  FOR n IN
    SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public'
       AND p.proname IN ('derive_primary_role','fn_profiles_derive_primary_role',
                         'fn_user_roles_sync_primary_role')
       AND NOT EXISTS (
         SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) c
          WHERE c LIKE 'search_path=%')
  LOOP
    RAISE EXCEPTION 'a primary_role function is SECURITY DEFINER without a pinned search_path';
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.profiles'::regclass
       AND tgname = 'trg_profiles_derive_primary_role' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'trg_profiles_derive_primary_role is not attached'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.user_roles'::regclass
       AND tgname = 'trg_user_roles_sync_primary_role' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'trg_user_roles_sync_primary_role is not attached'; END IF;

  -- ---- the relock invariant, restated -------------------------------------
  -- derive_primary_role is SECURITY DEFINER and does not return trigger, so it
  -- is inside the sweep's scope. The first apply of this migration left it
  -- client-executable and broke this; the guard is here so that cannot recur
  -- silently.
  DECLARE bad text;
  BEGIN
    SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prosecdef
       AND pg_get_function_result(p.oid) <> 'trigger'
       AND p.proname <> 'increment_listing_views'
       AND (has_function_privilege('anon', p.oid, 'EXECUTE')
            OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
    IF bad IS NOT NULL THEN
      RAISE EXCEPTION 'definer surface is client-executable: %', bad;
    END IF;
  END;

  -- ---- nothing stored disagrees with the derivation -----------------------
  SELECT count(*) INTO n FROM public.profiles p
   WHERE p.primary_role IS DISTINCT FROM public.derive_primary_role(p.id);
  IF n <> 0 THEN
    RAISE EXCEPTION '% profiles disagree with derive_primary_role', n;
  END IF;

  -- ---- AND IT ACTUALLY WORKS ----------------------------------------------
  -- A catalog check proves the triggers are attached, not that they derive the
  -- right value. 20260348 exists because a constraint I had "verified" by
  -- reading the catalog would have broken every system-initiated booking. So
  -- this exercises the real behaviour against real fixtures, inside a nested
  -- block whose sentinel exception rolls the fixtures back. PL/pgSQL variables
  -- are not transactional, so the verdict survives that rollback.
  BEGIN
    INSERT INTO auth.users (id, email) VALUES (u, 'c2guard@test.invalid');
    INSERT INTO public.profiles (id, email, primary_role)
    VALUES (u, 'c2guard@test.invalid', 'tenant');

    -- supplied 'tenant', holds no roles -> must be NULL, not 'tenant'
    SELECT primary_role INTO got FROM public.profiles WHERE id = u;
    IF got IS NOT NULL THEN
      v_ok := false;
      v_msg := v_msg || format('a client-supplied primary_role survived the insert (got %L); ', got);
    END IF;

    -- gaining service_provider must set it
    INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'service_provider',true);
    SELECT primary_role INTO got FROM public.profiles WHERE id = u;
    IF got IS DISTINCT FROM 'service_provider' THEN
      v_ok := false;
      v_msg := v_msg || format('gaining service_provider gave %L; ', got);
    END IF;

    -- landlord outranks it
    INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'landlord',true);
    SELECT primary_role INTO got FROM public.profiles WHERE id = u;
    IF got IS DISTINCT FROM 'landlord' THEN
      v_ok := false;
      v_msg := v_msg || format('holding landlord+service_provider gave %L; ', got);
    END IF;

    -- deactivating landlord falls back to service_provider
    UPDATE public.user_roles SET is_active = false WHERE user_id = u AND role = 'landlord';
    SELECT primary_role INTO got FROM public.profiles WHERE id = u;
    IF got IS DISTINCT FROM 'service_provider' THEN
      v_ok := false;
      v_msg := v_msg || format('after deactivating landlord, got %L; ', got);
    END IF;

    -- a direct client-style overwrite must not stick
    UPDATE public.profiles SET primary_role = 'landlord' WHERE id = u;
    SELECT primary_role INTO got FROM public.profiles WHERE id = u;
    IF got IS DISTINCT FROM 'service_provider' THEN
      v_ok := false;
      v_msg := v_msg || format('an overwrite to landlord stuck (got %L); ', got);
    END IF;

    -- removing the last product role returns it to NULL, not a default
    DELETE FROM public.user_roles WHERE user_id = u;
    SELECT primary_role INTO got FROM public.profiles WHERE id = u;
    IF got IS NOT NULL THEN
      v_ok := false;
      v_msg := v_msg || format('with no roles left, got %L instead of NULL; ', got);
    END IF;

    -- admin is not a product role
    INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'admin',true);
    SELECT primary_role INTO got FROM public.profiles WHERE id = u;
    IF got IS NOT NULL THEN
      v_ok := false;
      v_msg := v_msg || format('admin alone set primary_role to %L; ', got);
    END IF;

    RAISE EXCEPTION 'C2_GUARD_ROLLBACK';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'C2_GUARD_ROLLBACK' THEN RAISE; END IF;
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'primary_role derivation is wrong: %', v_msg;
  END IF;

  RAISE NOTICE 'primary_role_derived: triggers installed and behaviour verified';
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
-- DROP TRIGGER IF EXISTS trg_user_roles_sync_primary_role ON public.user_roles;
-- DROP TRIGGER IF EXISTS trg_profiles_derive_primary_role ON public.profiles;
-- DROP FUNCTION IF EXISTS public.fn_user_roles_sync_primary_role();
-- DROP FUNCTION IF EXISTS public.fn_profiles_derive_primary_role();
-- DROP FUNCTION IF EXISTS public.derive_primary_role(uuid);
--
-- That restores a column the browser maintains by hand, in three places, each
-- logged-and-continued. The stored values stay correct until the next role
-- change.
-- =============================================================================
