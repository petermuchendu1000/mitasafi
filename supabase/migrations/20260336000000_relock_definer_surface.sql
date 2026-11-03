-- =============================================================================
-- Re-lock the SECURITY DEFINER surface after the capacity work reopened it
-- =============================================================================
-- 20260329000000_lock_client_write_surface.sql revoked client EXECUTE on the
-- definer functions by NAME, one list, once. Two later migrations of mine then
-- put two of them back:
--
--   20260332000000_fix_availability_source.sql   check_provider_can_accept
--   20260333000000_capacity_exclude_self.sql     check_provider_capacity_locked
--                                                check_provider_can_accept
--
-- Both were written as CREATE OR REPLACE, but both ADDED a defaulted parameter
-- (p_exclude_booking_id). A different argument list is a different function:
-- Postgres created a NEW function with a NEW oid, which picked up the default
-- privileges -- EXECUTE to PUBLIC -- instead of inheriting the revoke that was
-- attached to the old oid. Same trap as the dispatch overload that migration
-- fixed, one level down, on the ACL rather than on resolution.
--
-- Measured: client_write_surface_test.sql fails its definer-surface assertion
-- on the live project AND on a from-scratch apply, naming exactly those two.
-- They are reachable by `anon` -- no login at all.
--
-- Neither is called from the application: they are invoked from inside the
-- capacity trigger, and src/ references them only in the generated types. So
-- nothing loses a call path here.
--
-- This is written as a SWEEP rather than another hand-kept list, because a
-- hand-kept list is what failed. Any SECURITY DEFINER function in `public`
-- that returns something other than a trigger is revoked from the client
-- roles, so re-running this migration after someone adds one re-closes it
-- instead of silently going stale. The single deliberate exception stays
-- explicit.
-- =============================================================================

DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.prosecdef
      AND pg_get_function_result(p.oid) <> 'trigger'
      -- the one deliberate keep: a fire-and-forget view counter that has to be
      -- callable from an unauthenticated listing page
      AND p.proname <> 'increment_listing_views'
      AND (has_function_privilege('anon', p.oid, 'EXECUTE')
           OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'relocked % client-executable definer function(s)', n;
END
$$;

-- Guard: fail the migration if the sweep did not actually close the surface.
-- A revoke loop that matched nothing and reported success is how this reopened
-- in the first place.
DO $$
DECLARE
  leftovers text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ')
    INTO leftovers
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public'
     AND p.prosecdef
     AND pg_get_function_result(p.oid) <> 'trigger'
     AND p.proname <> 'increment_listing_views'
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
          OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));

  IF leftovers IS NOT NULL THEN
    RAISE EXCEPTION 'definer surface still client-executable: %', leftovers;
  END IF;
END
$$;
