-- =============================================================================
-- Close the client write surface across the money and trust tables
-- =============================================================================
-- Generalises 20260318000000/20260319000000, which closed this bug class on
-- service_providers ONLY. The same hole was open on the tables that matter most.
--
-- THE LIVE DEFECT THIS CLOSES:
--   has_column_privilege('authenticated','bookings','agreed_price','UPDATE') = true
--   policy bookings_update_customer: UPDATE TO authenticated USING (customer_id = auth.uid())
-- RLS restricts ROWS, never COLUMNS. So a customer could update their own
-- booking and set agreed_price = 1. The price-synchronisation guard added in
-- 20260327000000 does not stop it: they set pricing_snapshot.total = 1 in the
-- same statement and the two agree. Pay KES 1 for a KES 10,000 job.
--
-- Also closed: a provider rewriting, re-scoring or hiding any review about them
-- (policy reviews_update_provider_response restricts rows, not columns, and
-- authenticated held UPDATE on all 22 columns); and a user setting
-- profiles.is_verified = true on their own row at INSERT or UPDATE time.
--
-- PRECONDITION VERIFIED BEFORE WRITING: every application write to all eight
-- tables below runs through createAdminClient() (service_role). Checked file by
-- file across 58 booking references; the only two files touching `bookings`
-- without an admin import perform ZERO writes, and the one file flagged against
-- `reviews` only SELECTs (it contains .update( for a different table). So
-- removing client write privileges cannot break an application path.
--
-- Read access is deliberately untouched. This migration changes no SELECT
-- privilege and no policy, so nothing that currently renders can stop
-- rendering. (profiles_public_read USING (true) is a separate, genuine defect
-- that needs a read-impact analysis; it is NOT addressed here.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Money and booking tables: service_role writes only
-- -----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bookings               FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.booking_payments      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.provider_payouts      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.booking_quotes        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.booking_disputes      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.booking_status_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.booking_commitments   FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.reviews               FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. profiles: keep self-service, remove the verification escalation
-- -----------------------------------------------------------------------------
-- A column-level REVOKE is INERT while the table-level privilege is held, so the
-- table grant is dropped and the permitted columns are granted back by name.
-- Signup inserts (id, email, phone, primary_role) from the browser and must
-- keep working; is_verified and verification_level are platform-controlled.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon, authenticated;

GRANT INSERT (id, email, phone, full_name, avatar_url, primary_role, metadata)
  ON public.profiles TO anon, authenticated;
GRANT UPDATE (email, phone, full_name, avatar_url, primary_role, metadata)
  ON public.profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. SECURITY DEFINER functions reachable by client roles
-- -----------------------------------------------------------------------------
-- These are owned by postgres (rolbypassrls = true), so they IGNORE RLS. Fixing
-- the RLS policies does not close them; only revoking EXECUTE does.
--
-- match_listing_to_alerts returns TABLE(alert_id uuid, email text, phone text)
-- keyed by publicly-readable listing ids, with no caller predicate: anonymous
-- lead-PII harvesting with nothing but the public anon key.
--
-- Every function below was checked for an application caller by name across
-- src: all have ZERO callers, except calculate_provider_profile_completion,
-- which is invoked through createAdminClient() (service_role) and is therefore
-- unaffected by revoking the client roles.
--
-- DELIBERATELY NOT REVOKED: increment_listing_views. It is called at
-- get-listing.ts:166 on the user's own session (supabase/server), so client
-- EXECUTE is required. It takes a listing id and bumps a counter.
DO $revoke$
DECLARE
  v_fn  text;
  v_sig text;
  v_count int := 0;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'match_listing_to_alerts',
    'get_unit_payment_history',
    'get_landlord_portfolio_stats',
    'get_building_stats',
    'get_lease_landlord',
    'get_user_roles',
    'user_has_role',
    'create_booking_with_capacity_check',
    'auto_confirm_completed_bookings',
    'check_provider_can_accept',
    'check_provider_can_accept_v2',
    'check_provider_capacity',
    'check_provider_capacity_locked',
    'check_provider_capacity_with_units',
    'check_provider_availability_interval',
    'calculate_provider_profile_completion',
    'mark_notification_read',
    'mark_all_notifications_read'
  ] LOOP
    FOR v_sig IN
      SELECT p.oid::regprocedure::text
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = v_fn
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Revoked client EXECUTE on % function signature(s).', v_count;
END
$revoke$;

-- =============================================================================
-- 4. Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
DECLARE
  t text;
  v_fn text;
BEGIN
  -- No client role may write any money or booking table.
  FOREACH t IN ARRAY ARRAY['bookings','booking_payments','provider_payouts',
                           'booking_quotes','booking_disputes',
                           'booking_status_history','booking_commitments','reviews'] LOOP
    IF has_table_privilege('authenticated', 'public.'||t, 'UPDATE')
       OR has_table_privilege('authenticated', 'public.'||t, 'INSERT')
       OR has_table_privilege('authenticated', 'public.'||t, 'DELETE')
       OR has_table_privilege('anon', 'public.'||t, 'UPDATE')
       OR has_table_privilege('anon', 'public.'||t, 'INSERT') THEN
      RAISE EXCEPTION 'FAILED: a client role can still write %', t;
    END IF;
    -- ...but reading must be untouched, or the UI breaks.
    IF NOT has_table_privilege('authenticated', 'public.'||t, 'SELECT') THEN
      RAISE EXCEPTION 'OVERREACH: authenticated lost SELECT on %', t;
    END IF;
  END LOOP;

  -- The specific live defect.
  IF has_column_privilege('authenticated','public.bookings','agreed_price','UPDATE')
     OR has_column_privilege('authenticated','public.bookings','pricing_snapshot','UPDATE') THEN
    RAISE EXCEPTION 'FAILED: a customer can still rewrite the price of their booking';
  END IF;

  -- profiles: escalation closed, self-service intact.
  IF has_column_privilege('authenticated','public.profiles','is_verified','UPDATE')
     OR has_column_privilege('authenticated','public.profiles','is_verified','INSERT')
     OR has_column_privilege('authenticated','public.profiles','verification_level','UPDATE')
     OR has_column_privilege('authenticated','public.profiles','verification_level','INSERT') THEN
    RAISE EXCEPTION 'FAILED: a user can still set their own verification status';
  END IF;
  FOREACH t IN ARRAY ARRAY['id','email','phone','primary_role'] LOOP
    IF NOT has_column_privilege('anon','public.profiles',t,'INSERT') THEN
      RAISE EXCEPTION 'OVERREACH: signup can no longer insert profiles.%', t;
    END IF;
  END LOOP;
  IF NOT has_column_privilege('authenticated','public.profiles','full_name','UPDATE') THEN
    RAISE EXCEPTION 'OVERREACH: a user can no longer edit their own name';
  END IF;

  -- Definer functions: no client EXECUTE.
  FOREACH v_fn IN ARRAY ARRAY['match_listing_to_alerts','get_unit_payment_history',
      'get_landlord_portfolio_stats','get_building_stats','get_user_roles',
      'user_has_role','create_booking_with_capacity_check',
      'auto_confirm_completed_bookings','mark_notification_read'] LOOP
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname='public' AND p.proname = v_fn
                  AND (has_function_privilege('anon', p.oid, 'EXECUTE')
                       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))) THEN
      RAISE EXCEPTION 'FAILED: a client role can still execute %', v_fn;
    END IF;
  END LOOP;

  -- The one function that must KEEP client EXECUTE.
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname='public' AND p.proname='increment_listing_views'
                    AND has_function_privilege('anon', p.oid, 'EXECUTE')) THEN
    RAISE EXCEPTION 'OVERREACH: listing view counting is broken for anonymous visitors';
  END IF;

  -- service_role must retain everything, or the entire application dies.
  FOREACH t IN ARRAY ARRAY['bookings','booking_payments','provider_payouts','profiles','reviews'] LOOP
    IF NOT has_table_privilege('service_role', 'public.'||t, 'UPDATE') THEN
      RAISE EXCEPTION 'CATASTROPHE: service_role lost UPDATE on %', t;
    END IF;
  END LOOP;

  -- Earlier revokes must still hold.
  IF has_column_privilege('authenticated','public.service_providers','wallet_balance','UPDATE') THEN
    RAISE EXCEPTION 'REGRESSION: 20260318000000 was undone';
  END IF;

  RAISE NOTICE 'Client write surface locked; reads, signup, self-service and service_role intact.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   GRANT INSERT, UPDATE, DELETE ON public.bookings, public.booking_payments,
--     public.provider_payouts, public.booking_quotes, public.booking_disputes,
--     public.booking_status_history, public.booking_commitments, public.reviews
--     TO anon, authenticated;
--   GRANT INSERT, UPDATE ON public.profiles TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION <each listed above> TO anon, authenticated;
--   (Restoring any of this reopens the price-rewrite and lead-PII holes.)
-- =============================================================================
