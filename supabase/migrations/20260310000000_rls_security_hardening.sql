-- =============================================================================
-- Migration: 20260310000000_rls_security_hardening.sql
-- Purpose:   Complete RLS coverage for all provider-module tables
-- Date:      March 10, 2026
-- =============================================================================
--
-- PROBLEM STATEMENT
-- -----------------
-- 7 tables lack RLS entirely (booking_status_history, booking_disputes,
-- booking_media, user_preferences, provider_vehicles, provider_driver_licenses,
-- review_helpful_votes). Several existing policies have gaps: service_providers
-- blocks authenticated customer reads, provider_verification_documents lacks
-- write policies, provider_documents has a dangerously permissive "manage"
-- policy, and booking_payments/provider_payouts have open INSERT/UPDATE policies
-- that should be restricted to service_role only.
--
-- APPROACH
-- --------
-- 1. Enable RLS on all 7 unprotected tables.
-- 2. Create granular per-operation policies for each.
-- 3. Fix existing policy gaps (add missing policies, replace overly permissive ones).
-- 4. All policies use IF NOT EXISTS guards for idempotency.
-- 5. Subqueries that resolve provider_id → user_id are cached by PostgreSQL's
--    plan cache within a single statement, so the repeated pattern
--      `provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())`
--    is optimized internally and is the canonical Supabase RLS pattern.
--
-- SECURITY MODEL
-- --------------
-- Service-role (admin) client always bypasses RLS.
-- Authenticated users are constrained by ownership checks.
-- Anonymous users get read-only access to public data only.
-- Triggers running as the table owner bypass RLS unless FORCE ROW LEVEL
-- SECURITY is enabled — we intentionally do NOT force RLS on tables with
-- triggers (booking_status_history, notifications) since the triggers are
-- SECURITY DEFINER functions that need to insert audit rows.
--
-- =============================================================================

BEGIN;

-- #############################################################################
-- SECTION 1: ENABLE RLS ON UNPROTECTED TABLES
-- #############################################################################

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_disputes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_media           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_vehicles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_driver_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes    ENABLE ROW LEVEL SECURITY;


-- #############################################################################
-- SECTION 2: booking_status_history — READ-ONLY FOR BOOKING PARTICIPANTS
-- #############################################################################
-- Rationale: This is an audit log. Written exclusively by the
-- auto_log_booking_status_change() trigger (runs as table owner, bypasses RLS).
-- No direct user writes should ever happen.
-- Reads: Customer or provider of the related booking.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_status_history'
      AND policyname = 'bsh_select_customer'
  ) THEN
    CREATE POLICY bsh_select_customer ON public.booking_status_history
      FOR SELECT TO authenticated
      USING (
        booking_id IN (
          SELECT id FROM public.bookings WHERE customer_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_status_history'
      AND policyname = 'bsh_select_provider'
  ) THEN
    CREATE POLICY bsh_select_provider ON public.booking_status_history
      FOR SELECT TO authenticated
      USING (
        booking_id IN (
          SELECT id FROM public.bookings
          WHERE provider_id IN (
            SELECT id FROM public.service_providers WHERE user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- No INSERT/UPDATE/DELETE policies — writes happen via trigger only.


-- #############################################################################
-- SECTION 3: booking_disputes — PARTICIPANTS CAN READ/CREATE, ADMIN RESOLVES
-- #############################################################################
-- Rationale:
--   SELECT: Both customer and provider of the booking can read disputes.
--   INSERT: Only the reporting party (customer or provider) can create.
--   UPDATE: Only service_role (admin) resolves disputes. No user-level UPDATE.
--   DELETE: Never — disputes are permanent records.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_disputes'
      AND policyname = 'disputes_select_customer'
  ) THEN
    CREATE POLICY disputes_select_customer ON public.booking_disputes
      FOR SELECT TO authenticated
      USING (
        booking_id IN (
          SELECT id FROM public.bookings WHERE customer_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_disputes'
      AND policyname = 'disputes_select_provider'
  ) THEN
    CREATE POLICY disputes_select_provider ON public.booking_disputes
      FOR SELECT TO authenticated
      USING (
        booking_id IN (
          SELECT id FROM public.bookings
          WHERE provider_id IN (
            SELECT id FROM public.service_providers WHERE user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_disputes'
      AND policyname = 'disputes_insert_reporter'
  ) THEN
    CREATE POLICY disputes_insert_reporter ON public.booking_disputes
      FOR INSERT TO authenticated
      WITH CHECK (
        -- The reporter must be the authenticated user
        reported_by = auth.uid()
        -- AND the reporter must be a participant of the booking
        AND booking_id IN (
          SELECT id FROM public.bookings
          WHERE customer_id = auth.uid()
             OR provider_id IN (
               SELECT id FROM public.service_providers WHERE user_id = auth.uid()
             )
        )
      );
  END IF;
END $$;

-- No UPDATE/DELETE for authenticated users. Admin resolves via service_role.


-- #############################################################################
-- SECTION 4: booking_media — PARTICIPANTS CAN READ, UPLOADER CAN INSERT
-- #############################################################################
-- Rationale:
--   SELECT: Both customer and provider of the booking can view all media.
--   INSERT: Only participants who identify themselves correctly (uploaded_by = auth.uid()).
--   UPDATE: Not needed — media records are immutable once uploaded.
--   DELETE: Only the uploader can delete their own media.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_media'
      AND policyname = 'media_select_participant'
  ) THEN
    CREATE POLICY media_select_participant ON public.booking_media
      FOR SELECT TO authenticated
      USING (
        booking_id IN (
          SELECT id FROM public.bookings
          WHERE customer_id = auth.uid()
             OR provider_id IN (
               SELECT id FROM public.service_providers WHERE user_id = auth.uid()
             )
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_media'
      AND policyname = 'media_insert_participant'
  ) THEN
    CREATE POLICY media_insert_participant ON public.booking_media
      FOR INSERT TO authenticated
      WITH CHECK (
        uploaded_by = auth.uid()
        AND booking_id IN (
          SELECT id FROM public.bookings
          WHERE customer_id = auth.uid()
             OR provider_id IN (
               SELECT id FROM public.service_providers WHERE user_id = auth.uid()
             )
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_media'
      AND policyname = 'media_delete_own'
  ) THEN
    CREATE POLICY media_delete_own ON public.booking_media
      FOR DELETE TO authenticated
      USING (uploaded_by = auth.uid());
  END IF;
END $$;


-- #############################################################################
-- SECTION 5: user_preferences — STRICT SELF-ONLY ACCESS
-- #############################################################################
-- Rationale: Notification preferences are personal. User can only read/write
-- their own row. The primary key IS user_id, so the ownership check is direct.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_preferences'
      AND policyname = 'prefs_select_own'
  ) THEN
    CREATE POLICY prefs_select_own ON public.user_preferences
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_preferences'
      AND policyname = 'prefs_insert_own'
  ) THEN
    CREATE POLICY prefs_insert_own ON public.user_preferences
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_preferences'
      AND policyname = 'prefs_update_own'
  ) THEN
    CREATE POLICY prefs_update_own ON public.user_preferences
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- No DELETE — preferences row should persist. If needed, UPDATE values to defaults.


-- #############################################################################
-- SECTION 6: provider_vehicles — PROVIDER OWNS THEIR VEHICLES
-- #############################################################################
-- Rationale: Vehicle data (registration #, insurance) is PII/sensitive.
-- Only the owning provider can read or manage. No public visibility.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_vehicles'
      AND policyname = 'vehicles_select_own'
  ) THEN
    CREATE POLICY vehicles_select_own ON public.provider_vehicles
      FOR SELECT TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_vehicles'
      AND policyname = 'vehicles_insert_own'
  ) THEN
    CREATE POLICY vehicles_insert_own ON public.provider_vehicles
      FOR INSERT TO authenticated
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_vehicles'
      AND policyname = 'vehicles_update_own'
  ) THEN
    CREATE POLICY vehicles_update_own ON public.provider_vehicles
      FOR UPDATE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_vehicles'
      AND policyname = 'vehicles_delete_own'
  ) THEN
    CREATE POLICY vehicles_delete_own ON public.provider_vehicles
      FOR DELETE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- #############################################################################
-- SECTION 7: provider_driver_licenses — PROVIDER OWNS THEIR LICENSES (PII)
-- #############################################################################
-- Rationale: License numbers and police clearance are highly sensitive PII.
-- Same ownership pattern as vehicles.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_driver_licenses'
      AND policyname = 'licenses_select_own'
  ) THEN
    CREATE POLICY licenses_select_own ON public.provider_driver_licenses
      FOR SELECT TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_driver_licenses'
      AND policyname = 'licenses_insert_own'
  ) THEN
    CREATE POLICY licenses_insert_own ON public.provider_driver_licenses
      FOR INSERT TO authenticated
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_driver_licenses'
      AND policyname = 'licenses_update_own'
  ) THEN
    CREATE POLICY licenses_update_own ON public.provider_driver_licenses
      FOR UPDATE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_driver_licenses'
      AND policyname = 'licenses_delete_own'
  ) THEN
    CREATE POLICY licenses_delete_own ON public.provider_driver_licenses
      FOR DELETE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- #############################################################################
-- SECTION 8: review_helpful_votes — PUBLIC READ, AUTHENTICATED WRITE OWN
-- #############################################################################
-- Rationale:
--   SELECT: Vote counts are visible alongside public reviews.
--   INSERT: Any authenticated user can vote on any non-hidden review.
--   UPDATE: A user can change their own vote (helpful ↔ not helpful).
--   DELETE: A user can remove their own vote.
--   Unique constraint (review_id, user_id) prevents duplicate votes at DB level.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'review_helpful_votes'
      AND policyname = 'votes_select_public'
  ) THEN
    CREATE POLICY votes_select_public ON public.review_helpful_votes
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'review_helpful_votes'
      AND policyname = 'votes_insert_own'
  ) THEN
    CREATE POLICY votes_insert_own ON public.review_helpful_votes
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'review_helpful_votes'
      AND policyname = 'votes_update_own'
  ) THEN
    CREATE POLICY votes_update_own ON public.review_helpful_votes
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'review_helpful_votes'
      AND policyname = 'votes_delete_own'
  ) THEN
    CREATE POLICY votes_delete_own ON public.review_helpful_votes
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;


-- #############################################################################
-- SECTION 9: FIX — service_providers — ADD AUTHENTICATED PUBLIC READ
-- #############################################################################
-- Problem: The existing providers_public_read_active policy only grants
-- SELECT to 'anon'. Authenticated users (customers browsing providers via
-- createClient()) are blocked because the providers_own_read policy requires
-- user_id = auth.uid(), which fails for customers viewing other providers.
--
-- Fix: Add a SELECT policy for authenticated users to read active providers.
-- This mirrors the anon policy but for logged-in users.
-- The providers_own_read policy lets providers see their own row regardless of
-- account_status (e.g., deactivated). This new policy lets all authenticated
-- users see any active provider's public data.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_providers'
      AND policyname = 'providers_public_read_authenticated'
  ) THEN
    CREATE POLICY providers_public_read_authenticated ON public.service_providers
      FOR SELECT TO authenticated
      USING (is_active = true AND account_status = 'active');
  END IF;
END $$;


-- #############################################################################
-- SECTION 10: FIX — profiles — ADD PUBLIC READ FOR BASIC INFO
-- #############################################################################
-- Problem: profiles table only has policies for own user (SELECT/UPDATE/INSERT
-- with auth.uid() = id). But providers.ts does N+1 reads on profiles to get
-- reviewer names. bookings.ts joins profiles for customer names. cache/queries
-- reads profiles for provider context.
--
-- All these queries currently work because:
-- (a) The query is for the authenticated user's own profile (passes own_read), OR
-- (b) The query uses createClient() but filters by another user's id (BLOCKED).
--
-- Case (b) is currently saved by the fact that some queries use admin client,
-- but any createClient() query joining profiles for another user will fail.
--
-- Fix: Add a public-read policy. All profile data (full_name, avatar_url,
-- phone, verification_level) is needed for the marketplace to function.
-- Privacy-sensitive fields should be protected at the application layer, not
-- via RLS policy on the entire row — the column set is already minimal.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'profiles_public_read'
  ) THEN
    CREATE POLICY profiles_public_read ON public.profiles
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;


-- #############################################################################
-- SECTION 11: FIX — provider_verification_documents — ADD WRITE POLICIES
-- #############################################################################
-- Problem: Only a SELECT policy exists. Providers uploading ID documents via
-- the verification flow use createAdminClient() to bypass RLS. Once we migrate
-- to user-scoped client, INSERT must be allowed.
--
-- INSERT: Provider can add their own verification docs.
-- UPDATE: Provider can update (e.g., re-upload rejected doc). Admin updates
--         status via service_role.
-- DELETE: Not allowed — verification docs are permanent records for audit.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_verification_documents'
      AND policyname = 'pvd_insert_own'
  ) THEN
    CREATE POLICY pvd_insert_own ON public.provider_verification_documents
      FOR INSERT TO authenticated
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_verification_documents'
      AND policyname = 'pvd_update_own'
  ) THEN
    CREATE POLICY pvd_update_own ON public.provider_verification_documents
      FOR UPDATE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- #############################################################################
-- SECTION 12: FIX — provider_documents — REPLACE OVERLY PERMISSIVE POLICY
-- #############################################################################
-- Problem: "Service role can manage documents" uses USING(true)/WITH CHECK(true)
-- which grants ALL operations to ANY role (anon, authenticated), not just
-- service_role. This is a security hole — any authenticated user could
-- insert/update/delete any provider's documents.
--
-- Fix: Drop the permissive policy and replace with ownership-based write
-- policies for authenticated users. Service_role always bypasses RLS anyway,
-- so it doesn't need an explicit policy.

DROP POLICY IF EXISTS "Service role can manage documents" ON public.provider_documents;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_documents'
      AND policyname = 'provider_docs_insert_own'
  ) THEN
    CREATE POLICY provider_docs_insert_own ON public.provider_documents
      FOR INSERT TO authenticated
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_documents'
      AND policyname = 'provider_docs_update_own'
  ) THEN
    CREATE POLICY provider_docs_update_own ON public.provider_documents
      FOR UPDATE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_documents'
      AND policyname = 'provider_docs_delete_own'
  ) THEN
    CREATE POLICY provider_docs_delete_own ON public.provider_documents
      FOR DELETE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- #############################################################################
-- SECTION 13: FIX — booking_payments — RESTRICT OPEN INSERT/UPDATE POLICIES
-- #############################################################################
-- Problem: booking_payments_service_insert and booking_payments_service_update
-- use WITH CHECK(true) / USING(true), which means ANY authenticated user can
-- insert/update payment records. The comment says "Enforced by service_role key
-- in server actions" but that's not how RLS works — the policy applies to ALL
-- roles.
--
-- Fix: Drop the permissive policies. Service_role bypasses RLS entirely, so
-- removing these policies does NOT break server-side payment operations.
-- Only SELECT policies (payer + provider) remain for reading.

DROP POLICY IF EXISTS booking_payments_service_insert ON public.booking_payments;
DROP POLICY IF EXISTS booking_payments_service_update ON public.booking_payments;


-- #############################################################################
-- SECTION 14: FIX — provider_payouts — RESTRICT OPEN INSERT/UPDATE POLICIES
-- #############################################################################
-- Same problem as booking_payments. Payout creation/updates must only happen
-- via service_role (admin client). The open INSERT/UPDATE policies are removed.

DROP POLICY IF EXISTS payouts_service_insert ON public.provider_payouts;
DROP POLICY IF EXISTS payouts_service_update ON public.provider_payouts;


-- #############################################################################
-- SECTION 15: FIX — social_link_clicks — ADD INSERT FOR CLICK TRACKING
-- #############################################################################
-- Problem: Only a SELECT policy exists for providers viewing their own clicks.
-- Click tracking happens via an API route using service_role, which bypasses
-- RLS, so inserts work. However, if we ever want client-side click tracking
-- (e.g., calling a Supabase edge function with the user's client), we need an
-- INSERT policy.
--
-- Decision: Keep INSERT via service_role only (no authenticated INSERT policy).
-- Click tracking should be server-side to prevent spoofing. The current setup
-- is correct — document the decision, no code change needed.
--
-- Add: Public SELECT for aggregate click counts (used by social traffic card
-- on the provider dashboard — only the provider sees their own clicks, which
-- is already covered by the existing policy).
-- No changes needed.


-- #############################################################################
-- SECTION 16: PERFORMANCE — INDEXES FOR RLS SUBQUERY PATTERNS
-- #############################################################################
-- The pattern `provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())`
-- requires an efficient lookup on service_providers(user_id). Verify the index exists.
-- Similarly, booking participant checks need booking(customer_id) and booking(provider_id).

CREATE INDEX IF NOT EXISTS idx_service_providers_user_id
  ON public.service_providers(user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON public.bookings(customer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_id
  ON public.bookings(provider_id);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id
  ON public.booking_status_history(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_disputes_booking_id
  ON public.booking_disputes(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_media_booking_id_v2
  ON public.booking_media(booking_id);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user_id
  ON public.review_helpful_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON public.user_preferences(user_id);


-- #############################################################################
-- SUMMARY OF CHANGES
-- #############################################################################
--
-- NEW RLS ENABLED (7 tables):
-- +---------------------------------+--------+--------+--------+--------+
-- | Table                           | SELECT | INSERT | UPDATE | DELETE |
-- +---------------------------------+--------+--------+--------+--------+
-- | booking_status_history          | 2 (C+P)|   —    |   —    |   —   |
-- | booking_disputes                | 2 (C+P)| 1 (rep)|   —    |   —   |
-- | booking_media                   | 1 (ptc)| 1 (ptc)|   —    | 1 (own)|
-- | user_preferences                | 1 (own)| 1 (own)| 1 (own)|   —   |
-- | provider_vehicles               | 1 (own)| 1 (own)| 1 (own)| 1 (own)|
-- | provider_driver_licenses        | 1 (own)| 1 (own)| 1 (own)| 1 (own)|
-- | review_helpful_votes            | 1 (pub)| 1 (own)| 1 (own)| 1 (own)|
-- +---------------------------------+--------+--------+--------+--------+
--
-- FIXED EXISTING POLICIES (5 tables):
-- +----------------------------------+----------------------------------------------+
-- | Table                            | Fix                                          |
-- +----------------------------------+----------------------------------------------+
-- | service_providers                | + authenticated public read (active)         |
-- | profiles                         | + authenticated read for marketplace lookups |
-- | provider_verification_documents  | + INSERT, UPDATE for own provider            |
-- | provider_documents               | - overly permissive "manage" policy          |
-- |                                  | + INSERT, UPDATE, DELETE for own provider     |
-- | booking_payments                 | - open INSERT/UPDATE policies                |
-- | provider_payouts                 | - open INSERT/UPDATE policies                |
-- +----------------------------------+----------------------------------------------+
--
-- INDEXES ADDED: 8 (all IF NOT EXISTS)
--
-- TOTAL POLICY COUNT: 30 new policies created, 5 dangerous policies removed
--

COMMIT;
