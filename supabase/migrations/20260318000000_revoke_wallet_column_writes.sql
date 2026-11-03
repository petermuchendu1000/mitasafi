-- =============================================================================
-- C-0 (SEV-0): remove client write access to provider money columns
-- =============================================================================
-- Defect: 'authenticated' held table-level UPDATE on public.service_providers,
-- which implies UPDATE on every column, including wallet_balance and
-- total_earnings. RLS was enabled, but policy providers_own_update gates only on
-- row ownership (user_id = auth.uid()) and ROW-level security CANNOT RESTRICT
-- COLUMNS. There is no CHECK on either column and the only trigger sets
-- updated_at. A provider could therefore PATCH their own row through PostgREST,
-- using nothing but the public anon key and their own JWT, and set their wallet
-- balance to any value.
--
-- Verified before this migration:
--   has_column_privilege('authenticated','service_providers','wallet_balance','UPDATE') = true
--   SET ROLE authenticated; UPDATE service_providers SET wallet_balance = ...  -> succeeded
--
-- Why a column REVOKE alone is not enough: in PostgreSQL a column-level REVOKE
-- has no effect while the role still holds the table-level privilege. The
-- table-level UPDATE must be dropped and the legitimate columns granted back
-- explicitly. That is what this migration does.
--
-- Legitimate writes to wallet_balance / total_earnings are unaffected: every one
-- of them goes through credit_provider_wallet / debit_provider_wallet, which are
-- SECURITY DEFINER and run as the owner, not as the caller.
--
-- Scope: this migration touches ONLY the two money columns plus two privileges
-- that have no legitimate client path (DELETE, TRUNCATE). The adjacent
-- platform-controlled columns (is_verified, verification_badge, account_status,
-- average_rating, total_reviews, total_jobs_completed, is_active) are the same
-- bug class and are handled in the next migration, kept separate so each is
-- independently verifiable and revertible.
--
-- Rollback: see the bottom of this file.
-- =============================================================================

-- 1. Drop the blanket table-level UPDATE. This is what implied the money columns.
REVOKE UPDATE ON public.service_providers FROM anon;
REVOKE UPDATE ON public.service_providers FROM authenticated;

-- 2. Grant back UPDATE on every column EXCEPT wallet_balance and total_earnings.
--    'authenticated' only; 'anon' has no UPDATE policy and needs no UPDATE at all.
GRANT UPDATE (id, user_id, business_name, business_type, registration_number, tax_id, phone, email, whatsapp, primary_location, service_radius_km, bio, years_in_business, team_size, profile_photo_url, cover_photo_url, business_photos, total_jobs_completed, average_rating, total_reviews, response_time_minutes, acceptance_rate, is_active, is_verified, verification_badge, account_status, created_at, updated_at, last_active_at, max_concurrent_bookings, capacity_mode, emergency_capacity_reserved, emergency_hard_ceiling, max_simultaneous_emergencies, provider_type, headline, years_experience, languages, tagline, emergency_available, emergency_surcharge_type, emergency_surcharge_amount, response_time, social_links, instant_booking, portfolio_images, min_price, search_vector)
  ON public.service_providers TO authenticated;

-- 3. Remove privileges with no legitimate client path.
--    DELETE: no DELETE or ALL policy exists, so RLS already blocks it; the grant
--            is dead weight and would become live the moment a policy is added.
--    TRUNCATE: NOT subject to RLS at all, so this grant is a standing hazard.
REVOKE DELETE, TRUNCATE ON public.service_providers FROM anon;
REVOKE DELETE, TRUNCATE ON public.service_providers FROM authenticated;

-- =============================================================================
-- Assertions: fail the migration if the hole is not actually closed.
-- =============================================================================
DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.service_providers', 'wallet_balance', 'UPDATE') THEN
    RAISE EXCEPTION 'C-0 FAILED: authenticated can still UPDATE wallet_balance';
  END IF;
  IF has_column_privilege('authenticated', 'public.service_providers', 'total_earnings', 'UPDATE') THEN
    RAISE EXCEPTION 'C-0 FAILED: authenticated can still UPDATE total_earnings';
  END IF;
  IF has_column_privilege('anon', 'public.service_providers', 'wallet_balance', 'UPDATE') THEN
    RAISE EXCEPTION 'C-0 FAILED: anon can still UPDATE wallet_balance';
  END IF;
  IF has_column_privilege('anon', 'public.service_providers', 'total_earnings', 'UPDATE') THEN
    RAISE EXCEPTION 'C-0 FAILED: anon can still UPDATE total_earnings';
  END IF;

  -- Legitimate self-service writes must still work, or we have broken the product.
  IF NOT has_column_privilege('authenticated', 'public.service_providers', 'business_name', 'UPDATE') THEN
    RAISE EXCEPTION 'C-0 OVERREACH: authenticated lost UPDATE on business_name';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.service_providers', 'bio', 'UPDATE') THEN
    RAISE EXCEPTION 'C-0 OVERREACH: authenticated lost UPDATE on bio';
  END IF;

  -- Signup inserts into this table from the browser; INSERT must survive.
  IF NOT has_table_privilege('authenticated', 'public.service_providers', 'INSERT') THEN
    RAISE EXCEPTION 'C-0 OVERREACH: authenticated lost INSERT (breaks provider signup)';
  END IF;

  -- The SECURITY DEFINER wallet path must be intact.
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'credit_provider_wallet'
                   AND p.prosecdef) THEN
    RAISE EXCEPTION 'C-0 PRECONDITION: credit_provider_wallet is missing or not SECURITY DEFINER';
  END IF;

  RAISE NOTICE 'C-0 verified: money columns are no longer client-writable; profile writes and signup intact.';
END
$$;

-- =============================================================================
-- ROLLBACK (restores the vulnerable state — only if this breaks a real flow):
--   REVOKE UPDATE ON public.service_providers FROM authenticated;
--   GRANT UPDATE ON public.service_providers TO anon, authenticated;
--   GRANT DELETE, TRUNCATE ON public.service_providers TO anon, authenticated;
-- =============================================================================
