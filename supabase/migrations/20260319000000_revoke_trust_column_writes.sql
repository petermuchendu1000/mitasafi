-- =============================================================================
-- C-0 follow-up: remove client write access to platform-controlled trust columns
-- =============================================================================
-- Same bug class as 20260318000000: RLS cannot restrict columns, so the
-- providers_own_update policy (user_id = auth.uid()) let a provider write ANY
-- column of their own row. 20260318000000 closed the two money columns. These
-- six are the remaining escalation vectors on the same table:
--
--   is_verified           -- a provider could mark themselves verified
--   verification_badge    -- ditto, the badge shown to customers
--   account_status        -- A SUSPENDED PROVIDER COULD UN-SUSPEND THEMSELVES
--   average_rating        -- a provider could award themselves 5.0
--   total_reviews         -- ditto, fabricate review volume
--   total_jobs_completed  -- ditto, fabricate experience
--
-- Verified safe to revoke: no client code writes any of these. The only writer
-- is recalculateProviderRating (src/lib/services/reviews.ts:287) which uses
-- createAdminClient() -- the service role, which bypasses these grants entirely.
--   grep for update/upsert on each column: is_verified 0, verification_badge 0,
--   account_status 0, total_jobs_completed 0, average_rating 1 (the admin path),
--   total_reviews 1 (same admin path).
--
-- is_active is deliberately NOT revoked: a provider hiding their own listing
-- harms only themselves and is plausible self-service. It is not a trust signal
-- a provider can gain anything by forging.
--
-- As in 20260318000000, a column-level REVOKE is inert while the table-level
-- privilege is held, so table UPDATE is dropped and the 42 legitimate columns
-- are granted back by name.
-- =============================================================================

REVOKE UPDATE ON public.service_providers FROM authenticated;

GRANT UPDATE (id, user_id, business_name, business_type, registration_number, tax_id, phone, email, whatsapp, primary_location, service_radius_km, bio, years_in_business, team_size, profile_photo_url, cover_photo_url, business_photos, response_time_minutes, acceptance_rate, is_active, created_at, updated_at, last_active_at, max_concurrent_bookings, capacity_mode, emergency_capacity_reserved, emergency_hard_ceiling, max_simultaneous_emergencies, provider_type, headline, years_experience, languages, tagline, emergency_available, emergency_surcharge_type, emergency_surcharge_amount, response_time, social_links, instant_booking, portfolio_images, min_price, search_vector)
  ON public.service_providers TO authenticated;

-- =============================================================================
-- Assertions
-- =============================================================================
DO $$
DECLARE
  blocked text[] := ARRAY['wallet_balance','total_earnings','is_verified',
                          'verification_badge','account_status','average_rating',
                          'total_reviews','total_jobs_completed'];
  allowed text[] := ARRAY['business_name','bio','phone','is_active'];
  c text;
BEGIN
  FOREACH c IN ARRAY blocked LOOP
    IF has_column_privilege('authenticated', 'public.service_providers', c, 'UPDATE') THEN
      RAISE EXCEPTION 'FAILED: authenticated can still UPDATE %', c;
    END IF;
    IF has_column_privilege('anon', 'public.service_providers', c, 'UPDATE') THEN
      RAISE EXCEPTION 'FAILED: anon can still UPDATE %', c;
    END IF;
  END LOOP;

  FOREACH c IN ARRAY allowed LOOP
    IF NOT has_column_privilege('authenticated', 'public.service_providers', c, 'UPDATE') THEN
      RAISE EXCEPTION 'OVERREACH: authenticated lost UPDATE on %', c;
    END IF;
  END LOOP;

  -- Self-service signup must keep working.
  --
  -- Asserted per COLUMN, not with has_table_privilege, since
  -- 20260343000000_service_providers_insert_allowlist.sql. That migration
  -- dropped table-level INSERT and re-granted 42 of the 50 columns by name --
  -- the mirror of the UPDATE allowlist this file established -- because
  -- table-level INSERT made the eight withheld trust and money columns
  -- insertable at creation time, including wallet_balance. A table-level test
  -- is therefore no longer a test of whether signup works: it reads false
  -- while signup works fine.
  --
  -- These four columns are what buildProviderProfile() actually emits
  -- (src/lib/identity/provider-profile.ts), so this assertion is derived from
  -- the payload rather than from the grant -- the distinction
  -- 20260337000000_grant_profiles_updated_at.sql exists to record.
  IF NOT (has_column_privilege('authenticated', 'public.service_providers', 'user_id', 'INSERT')
      AND has_column_privilege('authenticated', 'public.service_providers', 'business_name', 'INSERT')
      AND has_column_privilege('authenticated', 'public.service_providers', 'phone', 'INSERT')
      AND has_column_privilege('authenticated', 'public.service_providers', 'business_type', 'INSERT')) THEN
    RAISE EXCEPTION 'OVERREACH: authenticated lost a column needed for provider signup';
  END IF;

  RAISE NOTICE 'Trust columns are no longer client-writable; self-service writes intact.';
END
$$;

-- =============================================================================
-- ROLLBACK:
--   REVOKE UPDATE ON public.service_providers FROM authenticated;
--   GRANT UPDATE ON public.service_providers TO authenticated;   -- restores all columns
-- =============================================================================
