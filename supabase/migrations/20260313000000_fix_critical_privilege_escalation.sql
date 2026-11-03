-- =============================================================================
-- Migration: 20260313000000_fix_critical_privilege_escalation.sql
-- Purpose:   Close three verified privilege-escalation / data-exposure defects
-- =============================================================================
--
-- Each fix below was dependency-checked against the application before being
-- written, so none of them breaks a working code path.
--
-- ---------------------------------------------------------------------------
-- FIX 1 (CRITICAL): anonymous money minting via the wallet RPCs
-- ---------------------------------------------------------------------------
-- credit_provider_wallet / debit_provider_wallet are SECURITY DEFINER with no
-- authorization check and no p_amount > 0 check, and EXECUTE was granted to
-- PUBLIC, anon and authenticated. Since the publishable key ships in the
-- browser bundle, anyone could POST /rest/v1/rpc/credit_provider_wallet and
-- write wallet_balance / total_earnings directly, bypassing bookings,
-- payments and commission entirely. A negative amount inverts either function.
--
-- Safe to revoke: the only call sites are src/lib/services/payments.ts:391,
-- :943 and :975, all of which use admin.rpc() (service_role). service_role
-- keeps its grant, and rolbypassrls = true, so server-side flows are
-- unaffected. src/types/database.ts is type output, not a call site.
--
-- search_path is pinned as hardening. NOTE: this was NOT an exploitable
-- escalation here -- has_schema_privilege('anon','public','CREATE') is false,
-- so neither anon nor authenticated can plant a shadowing object.

REVOKE EXECUTE ON FUNCTION public.credit_provider_wallet(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.debit_provider_wallet(uuid, numeric)  FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.credit_provider_wallet(uuid, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.debit_provider_wallet(uuid, numeric)  SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- FIX 2 (CRITICAL): any signed-in user could grant themselves 'admin'
-- ---------------------------------------------------------------------------
-- The INSERT policy bound row ownership (auth.uid() = user_id) but never
-- constrained the `role` column, and user_roles_role_check explicitly permits
-- 'admin'. One request -- POST /rest/v1/user_roles with
-- {"user_id":"<self>","role":"admin"} -- yielded real admin, because
-- requireAdmin() (admin-verification.ts:88, review-moderation.ts:72) and
-- app/admin/layout.tsx read that same table.
--
-- The UPDATE policy had no WITH CHECK, and Postgres reuses USING for the
-- check on UPDATE, so an existing row could simply be flipped to 'admin'.
--
-- The table is NOT locked to service_role, because signup legitimately writes
-- it through the authenticated client (auth/callback/route.ts:79,:136,:207;
-- signup/page.tsx:214,:360,:509,:529; login/page.tsx:230). Instead the role
-- column is constrained. service_role bypasses RLS, so genuine admin grants
-- via admin tooling still work.

DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert own roles" ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role <> 'admin');

DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
CREATE POLICY "Users can update own roles" ON public.user_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role <> 'admin');

COMMENT ON TABLE public.user_roles IS
  'Self-service role rows. RLS forbids self-assigning admin; admin is granted only via service_role.';

-- ---------------------------------------------------------------------------
-- FIX 3 (CRITICAL): views bypassed RLS entirely
-- ---------------------------------------------------------------------------
-- booking_full_details, verification_queue and provider_capacity_status are
-- owned by postgres (BYPASSRLS) and were not security_invoker, so querying
-- them ran with the owner's rights and ignored the caller's RLS. That exposed
-- booking rows, notes and contact details through the view even though the
-- base tables are protected.
--
-- security_invoker = on makes each view evaluate RLS as the querying role,
-- which is the correct posture regardless of who reads it: a legitimate caller
-- still sees exactly the rows their policies permit.

ALTER VIEW public.booking_full_details      SET (security_invoker = on);
ALTER VIEW public.verification_queue        SET (security_invoker = on);
ALTER VIEW public.provider_capacity_status  SET (security_invoker = on);
-- Not currently granted to anon/authenticated, but same postgres-owned shape
-- and zero consumers, so hardened too rather than left as a latent hole.
ALTER VIEW public.bookings_with_legacy_busy SET (security_invoker = on);

-- ---------------------------------------------------------------------------
-- SELF-CHECK: fail the migration if any fix did not take effect.
-- Each assertion can genuinely fail -- remove a statement above and it does.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n int;
BEGIN
  -- 1. no anon/authenticated/PUBLIC EXECUTE left on the wallet RPCs
  SELECT count(*) INTO n
  FROM information_schema.routine_privileges p
  JOIN information_schema.routines r ON r.specific_name = p.specific_name
  WHERE r.routine_schema = 'public'
    AND r.routine_name IN ('credit_provider_wallet', 'debit_provider_wallet')
    AND p.grantee IN ('anon', 'authenticated', 'PUBLIC');
  IF n > 0 THEN
    RAISE EXCEPTION 'wallet RPCs still executable by anon/authenticated/PUBLIC (% grant(s))', n;
  END IF;

  -- 2. both user_roles write policies must mention the role guard
  SELECT count(*) INTO n
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_roles'
    AND cmd IN ('INSERT', 'UPDATE')
    AND coalesce(with_check, '') LIKE '%admin%';
  IF n <> 2 THEN
    RAISE EXCEPTION 'expected 2 user_roles write policies guarding the admin role, found %', n;
  END IF;

  -- 3. all three views must be security_invoker
  SELECT count(*) INTO n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND c.relkind = 'v'
    AND c.relname IN ('booking_full_details', 'verification_queue', 'provider_capacity_status', 'bookings_with_legacy_busy')
    AND coalesce(array_to_string(c.reloptions, ','), '') LIKE '%security_invoker=on%';
  IF n <> 4 THEN
    RAISE EXCEPTION 'expected 4 security_invoker views, found %', n;
  END IF;

  RAISE NOTICE 'All three critical fixes verified in-migration.';
END $$;

-- =============================================================================
-- ROLLBACK (manual; restores the vulnerable state, so only for emergencies)
-- =============================================================================
-- GRANT EXECUTE ON FUNCTION public.credit_provider_wallet(uuid, numeric) TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.debit_provider_wallet(uuid, numeric)  TO anon, authenticated;
-- DROP POLICY "Users can insert own roles" ON public.user_roles;
-- CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
-- DROP POLICY "Users can update own roles" ON public.user_roles;
-- CREATE POLICY "Users can update own roles" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id);
-- ALTER VIEW public.booking_full_details     SET (security_invoker = off);
-- ALTER VIEW public.verification_queue       SET (security_invoker = off);
-- ALTER VIEW public.provider_capacity_status SET (security_invoker = off);
