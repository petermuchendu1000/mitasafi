-- =============================================================================
-- Admin has no grant path. Give it one, auditable, or it stays unreachable.
-- =============================================================================
-- Measured state before this migration:
--
--   * user_roles_role_check PERMITS the value 'admin'
--   * the INSERT policy forbids a client writing it
--     (WITH CHECK ... AND role <> 'admin')
--   * fn_user_roles_block_client_escalation refuses a client raising an
--     existing row to it on UPDATE
--   * and NOTHING -- no function, no migration, no seed -- ever grants it
--
-- So the admin surface was not protected. It was UNREACHABLE. requireAdmin()
-- in src/lib/identity/require-admin.ts denied every caller, and src/app/admin
-- could not be entered by anyone, ever. A door that cannot be opened is not a
-- locked door; it is a wall with a handle painted on it, and the difference
-- matters because the code around it reads as though an admin exists.
--
-- WHAT THIS DOES NOT SOLVE, AND CANNOT
--
-- The first admin cannot be granted by an admin. Any design that requires one
-- is unimplementable from this state, so the authority here is POSSESSION OF
-- THE SERVICE-ROLE KEY: EXECUTE is granted to service_role and to nothing else,
-- and a caller holding that key could already write user_roles directly.
--
-- This migration therefore does not add a capability. It replaces ad-hoc SQL
-- with a named operation that is idempotent, refuses to run unexplained, and
-- leaves an audit row. That is the whole of its value, and it is worth stating
-- plainly rather than overclaiming: anyone who can call this could already have
-- done it by hand.
--
-- WHY SECURITY DEFINER IS CORRECT HERE, UNLIKE EVERYWHERE ELSE IN THIS WORK
--
-- current_user_has_role and provision_identity are both SECURITY INVOKER,
-- because neither needs privilege the caller lacks and because
-- 20260336000000_relock_definer_surface.sql revokes client EXECUTE from every
-- client-callable definer function. These two are different: they must write a
-- row that RLS and a trigger exist to forbid, so they need the owner's rights,
-- and they are granted to service_role ONLY -- which the relock sweep does not
-- touch, since it revokes from anon and authenticated.
--
-- Verified rather than assumed: inside a DEFINER function owned by postgres,
-- current_user is `postgres`, so fn_user_roles_block_client_escalation -- which
-- tests current_user IN ('anon','authenticated') -- does not fire. Probed
-- against the live database inside a rolled-back transaction: the admin row was
-- created and nothing survived.
--
-- REVOKE DEACTIVATES, IT DOES NOT DELETE
--
-- revoke_admin_role sets is_active = false. get_user_roles, user_has_role and
-- current_user_has_role all filter on is_active, so a deactivated row denies
-- access exactly as an absent one would, and the history of who held admin and
-- when survives. Deleting the row would erase that.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- grant_admin_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_admin_role(
  p_user_id uuid,
  p_reason  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role_id  uuid;
  v_existing boolean;
  v_email    text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'grant_admin_role: p_user_id is required'
      USING ERRCODE = 'null_value_not_allowed';
  END IF;

  -- An unexplained admin grant should not be possible. The reason lands in the
  -- audit row, which is the only record of why anyone holds this.
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'grant_admin_role: p_reason is required and must not be blank'
      USING ERRCODE = 'null_value_not_allowed';
  END IF;

  -- user_roles.user_id references profiles(id), so this would fail anyway --
  -- but as 23503 naming a constraint, which is a worse message than saying the
  -- user has not signed up.
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'grant_admin_role: no profile for %. The user must have signed '
      'up before they can be made an admin.', p_user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT true INTO v_existing
    FROM public.user_roles
   WHERE user_id = p_user_id AND role = 'admin' AND is_active;

  -- is_verified = true: on user_roles this column means the role is APPROVED,
  -- and a deliberate grant through this function IS the approval. It is not
  -- identity verification -- that is profiles.verification_level, which this
  -- does not touch.
  INSERT INTO public.user_roles (user_id, role, is_active, is_verified)
  VALUES (p_user_id, 'admin', true, true)
  ON CONFLICT (user_id, role)
    DO UPDATE SET is_active = true, is_verified = true, updated_at = now()
  RETURNING id INTO v_role_id;

  -- user_id is NULL deliberately: the actor is whoever holds the service-role
  -- key, which is not a user and has no profiles row to reference. Recording a
  -- guess there would be worse than recording nothing, so the actor is captured
  -- as current_user in details and the TARGET is the entity.
  INSERT INTO public.audit_log
    (user_id, user_role, action, entity_type, entity_id, details)
  VALUES
    (NULL, 'system', 'admin_role_granted', 'user_roles', v_role_id,
     jsonb_build_object(
       'target_user_id', p_user_id,
       'target_email',   v_email,
       'reason',         btrim(p_reason),
       'db_role',        current_user,
       'already_held',   coalesce(v_existing, false)
     ));

  RETURN jsonb_build_object(
    'user_id',      p_user_id,
    'role_id',      v_role_id,
    'already_held', coalesce(v_existing, false)
  );
END
$function$;

-- -----------------------------------------------------------------------------
-- revoke_admin_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_admin_role(
  p_user_id uuid,
  p_reason  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'revoke_admin_role: p_user_id is required'
      USING ERRCODE = 'null_value_not_allowed';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'revoke_admin_role: p_reason is required and must not be blank'
      USING ERRCODE = 'null_value_not_allowed';
  END IF;

  -- Deactivate, do not delete. Every role predicate filters on is_active, so
  -- this denies access exactly as removal would while keeping the record that
  -- the grant happened.
  --
  -- `AND is_active` is load-bearing. Without it this UPDATE matches an already
  -- deactivated row, returns its id, and writes an audit row asserting a
  -- revocation that did not occur -- so calling revoke twice would leave two
  -- admin_role_revoked entries for one actual revocation, and the audit trail
  -- would overstate what happened. Caught by the dry-run probe, not by reading.
  UPDATE public.user_roles
     SET is_active = false, updated_at = now()
   WHERE user_id = p_user_id AND role = 'admin' AND is_active
  RETURNING id INTO v_role_id;

  IF v_role_id IS NULL THEN
    -- Not an error: revoking from someone who never held it is a no-op, and a
    -- caller cleaning up should not have to check first.
    RETURN jsonb_build_object('user_id', p_user_id, 'revoked', false);
  END IF;

  INSERT INTO public.audit_log
    (user_id, user_role, action, entity_type, entity_id, details)
  VALUES
    (NULL, 'system', 'admin_role_revoked', 'user_roles', v_role_id,
     jsonb_build_object(
       'target_user_id', p_user_id,
       'reason',         btrim(p_reason),
       'db_role',        current_user
     ));

  RETURN jsonb_build_object('user_id', p_user_id, 'revoked', true, 'role_id', v_role_id);
END
$function$;

COMMENT ON FUNCTION public.grant_admin_role(uuid, text) IS
  'The only sanctioned way to grant admin. service_role EXECUTE only. '
  'Idempotent, requires a reason, writes an audit_log row. Does not add a '
  'capability -- a caller holding the service-role key could already write '
  'user_roles directly -- it makes the operation named, explained and recorded.';

COMMENT ON FUNCTION public.revoke_admin_role(uuid, text) IS
  'Deactivates an admin role (is_active = false) rather than deleting it, so '
  'the history survives. Every role predicate filters on is_active.';

-- REVOKE FROM PUBLIC IS NOT ENOUGH. This project carries ALTER DEFAULT
-- PRIVILEGES on schema public granting EXECUTE to anon, authenticated AND
-- service_role on every newly created function, as DIRECT grants rather than
-- grants via PUBLIC. anon and authenticated must be named, or a brand-new
-- function that grants the admin role is callable by any signed-in user and by
-- anyone at all. 20260346000000's guard caught exactly this on a dry run.
REVOKE ALL ON FUNCTION public.grant_admin_role(uuid, text)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_admin_role(uuid, text) FROM PUBLIC, anon, authenticated;

-- These two GRANTs are redundant TODAY and kept deliberately. The same default
-- privileges that force the REVOKEs above also grant service_role EXECUTE, so
-- removing these lines changes nothing right now -- verified: a dry run with
-- them deleted still passed every guard. They are here so the grant does not
-- depend on a default privilege that is not part of this migration's contract
-- and could be tightened later, and so the intended audience of the function is
-- stated in the file rather than inferred from a cluster-wide setting.
GRANT EXECUTE ON FUNCTION public.grant_admin_role(uuid, text)  TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_admin_role(uuid, text) TO service_role;


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  fn   text;
  bad  text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['grant_admin_role', 'revoke_admin_role'] LOOP
    -- ---- exists, and is DEFINER (it must write past RLS and a trigger) ----
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = fn AND p.prosecdef
    ) THEN
      RAISE EXCEPTION '% is missing or is not SECURITY DEFINER', fn;
    END IF;

    -- ---- search_path pinned, because it IS definer -----------------------
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace,
        unnest(coalesce(p.proconfig, ARRAY[]::text[])) c
       WHERE n.nspname = 'public' AND p.proname = fn AND c LIKE 'search_path=%'
    ) THEN
      RAISE EXCEPTION '% is SECURITY DEFINER without a pinned search_path', fn;
    END IF;

    -- ---- THE ONE THAT MATTERS: no client may execute it -------------------
    IF EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = fn
         AND (has_function_privilege('anon', p.oid, 'EXECUTE')
              OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    ) THEN
      RAISE EXCEPTION '% is executable by a client role -- any signed-in user could '
        'grant themselves admin', fn;
    END IF;

    -- ---- and service_role can, or the mechanism does not exist -----------
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = fn
         AND has_function_privilege('service_role', p.oid, 'EXECUTE')
    ) THEN
      RAISE EXCEPTION '% is not executable by service_role', fn;
    END IF;
  END LOOP;

  -- ---- the client-side defences these bypass must still be in place -----
  -- If RLS stopped forbidding role='admin', these functions would stop being
  -- the only path and this migration's premise would be false.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'user_roles' AND cmd = 'INSERT'
       AND with_check ILIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'the user_roles INSERT policy no longer excludes admin; these '
      'functions are no longer the only grant path';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.user_roles'::regclass
       AND tgname = 'trg_user_roles_block_client_escalation'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'the client escalation trigger is gone; a client could raise its '
      'own role to admin on UPDATE';
  END IF;

  -- ---- the relock invariant, restated ----------------------------------
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

  RAISE NOTICE 'admin_grant_path: grant and revoke installed, service_role only';
END
$$;


-- =============================================================================
-- HOW TO GRANT THE FIRST ADMIN
-- =============================================================================
-- From a context holding the service-role key -- the Supabase SQL editor, or a
-- server script using createAdminClient():
--
--   SELECT public.grant_admin_role(
--     '<the user's auth.users id>',
--     'initial platform administrator, approved by <name> on <date>');
--
-- The user must have signed up first: the role row references profiles(id).
-- Check afterwards with
--
--   SELECT u.email, r.is_active, r.created_at
--     FROM user_roles r JOIN profiles u ON u.id = r.user_id
--    WHERE r.role = 'admin';
--
-- and read the audit trail with
--
--   SELECT created_at, action, details FROM audit_log
--    WHERE action IN ('admin_role_granted','admin_role_revoked')
--    ORDER BY created_at DESC;
--
-- =============================================================================
-- DOWN
-- =============================================================================
-- DROP FUNCTION IF EXISTS public.grant_admin_role(uuid, text);
-- DROP FUNCTION IF EXISTS public.revoke_admin_role(uuid, text);
--
-- Dropping these does not revoke anyone's admin role -- the rows in user_roles
-- remain. Revoke first, or the roles outlive the only sanctioned way to remove
-- them.
-- =============================================================================
