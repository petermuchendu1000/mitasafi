-- =============================================================================
-- Migration: M0 Critical Fixes & Cleanup
-- Description: Formalizes columns added out-of-band, fixes saved_providers
--              schema drift, and enables RLS on all service-provider tables.
-- Date: 2026-03-03
-- Priority: CRITICAL (M0 — foundational correctness)
-- Dependencies: 20260302000002_social_link_clicks.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- M0.2: FORMALIZE instant_booking COLUMN ON service_providers
-- =============================================================================
-- This column was added directly via Supabase Studio. The generated types
-- already include it. This migration formalizes it in version control.
-- Using DO block with IF NOT EXISTS to be idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_providers'
      AND column_name = 'instant_booking'
  ) THEN
    ALTER TABLE public.service_providers
      ADD COLUMN instant_booking BOOLEAN DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN public.service_providers.instant_booking IS
  'Whether the provider accepts instant bookings without a quote step.
   Default false. When true, customers see "Book Now" instead of "Get Quote".';


-- =============================================================================
-- M0.7: FORMALIZE portfolio_images COLUMN ON service_providers
-- =============================================================================
-- Same situation: column exists in deployed DB (per generated types) but
-- was never captured in a migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_providers'
      AND column_name = 'portfolio_images'
  ) THEN
    ALTER TABLE public.service_providers
      ADD COLUMN portfolio_images TEXT[] DEFAULT '{}';
  END IF;
END $$;

COMMENT ON COLUMN public.service_providers.portfolio_images IS
  'Array of image URLs for the provider portfolio gallery.
   Stored as TEXT[] on the provider row for fast reads (no join needed).
   The separate provider_portfolio table exists for richer per-project metadata.';


-- =============================================================================
-- M0.10: FIX saved_providers COLUMN NAME (customer_id → user_id)
-- =============================================================================
-- Migration 20260108120005 defines the column as customer_id, but the live
-- database (per generated types) uses user_id with FK to profiles.
-- This migration reconciles the drift by renaming if the old name still exists
-- and adding the FK constraint.

DO $$
BEGIN
  -- Only rename if customer_id still exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'saved_providers'
      AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.saved_providers
      RENAME COLUMN customer_id TO user_id;
  END IF;

  -- Ensure FK to profiles exists (idempotent via constraint name check)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'saved_providers'
      AND constraint_name = 'saved_providers_user_id_fkey'
  ) THEN
    ALTER TABLE public.saved_providers
      ADD CONSTRAINT saved_providers_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- Update unique constraint to reference user_id instead of customer_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'saved_providers'
      AND constraint_name = 'saved_provider_unique'
  ) THEN
    ALTER TABLE public.saved_providers
      DROP CONSTRAINT saved_provider_unique;
    ALTER TABLE public.saved_providers
      ADD CONSTRAINT saved_provider_unique UNIQUE(user_id, provider_id);
  END IF;
END $$;


-- =============================================================================
-- M0.9: ENABLE RLS ON ALL SERVICE-PROVIDER TABLES
-- =============================================================================
-- Currently only service_providers itself has RLS. All related tables are
-- wide open. This section enables RLS and adds least-privilege policies.
--
-- Policy naming convention: {table}_{operation}_{who}
-- All policies use IF NOT EXISTS via DO blocks for idempotency.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. provider_services
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;

-- Providers can read their own services
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_services' AND policyname = 'provider_services_select_own'
  ) THEN
    CREATE POLICY provider_services_select_own ON public.provider_services
      FOR SELECT TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Public (anon) can read active provider services for discovery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_services' AND policyname = 'provider_services_select_public'
  ) THEN
    CREATE POLICY provider_services_select_public ON public.provider_services
      FOR SELECT TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Providers can insert/update/delete their own services
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_services' AND policyname = 'provider_services_insert_own'
  ) THEN
    CREATE POLICY provider_services_insert_own ON public.provider_services
      FOR INSERT TO authenticated
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_services' AND policyname = 'provider_services_update_own'
  ) THEN
    CREATE POLICY provider_services_update_own ON public.provider_services
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_services' AND policyname = 'provider_services_delete_own'
  ) THEN
    CREATE POLICY provider_services_delete_own ON public.provider_services
      FOR DELETE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 2. bookings
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Customers can read their own bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings' AND policyname = 'bookings_select_customer'
  ) THEN
    CREATE POLICY bookings_select_customer ON public.bookings
      FOR SELECT TO authenticated
      USING (customer_id = auth.uid());
  END IF;
END $$;

-- Providers can read bookings assigned to them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings' AND policyname = 'bookings_select_provider'
  ) THEN
    CREATE POLICY bookings_select_provider ON public.bookings
      FOR SELECT TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Customers can create bookings (their own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings' AND policyname = 'bookings_insert_customer'
  ) THEN
    CREATE POLICY bookings_insert_customer ON public.bookings
      FOR INSERT TO authenticated
      WITH CHECK (customer_id = auth.uid());
  END IF;
END $$;

-- Customers can update their own bookings (e.g. cancel)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings' AND policyname = 'bookings_update_customer'
  ) THEN
    CREATE POLICY bookings_update_customer ON public.bookings
      FOR UPDATE TO authenticated
      USING (customer_id = auth.uid())
      WITH CHECK (customer_id = auth.uid());
  END IF;
END $$;

-- Providers can update bookings assigned to them (e.g. accept/decline)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings' AND policyname = 'bookings_update_provider'
  ) THEN
    CREATE POLICY bookings_update_provider ON public.bookings
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


-- ---------------------------------------------------------------------------
-- 3. booking_quotes
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_quotes ENABLE ROW LEVEL SECURITY;

-- Providers can read/create their own quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_quotes' AND policyname = 'booking_quotes_select_provider'
  ) THEN
    CREATE POLICY booking_quotes_select_provider ON public.booking_quotes
      FOR SELECT TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Customers can read quotes for their bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_quotes' AND policyname = 'booking_quotes_select_customer'
  ) THEN
    CREATE POLICY booking_quotes_select_customer ON public.booking_quotes
      FOR SELECT TO authenticated
      USING (
        booking_id IN (
          SELECT id FROM public.bookings WHERE customer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Providers can insert quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_quotes' AND policyname = 'booking_quotes_insert_provider'
  ) THEN
    CREATE POLICY booking_quotes_insert_provider ON public.booking_quotes
      FOR INSERT TO authenticated
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Providers can update their own quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_quotes' AND policyname = 'booking_quotes_update_provider'
  ) THEN
    CREATE POLICY booking_quotes_update_provider ON public.booking_quotes
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


-- ---------------------------------------------------------------------------
-- 4. booking_messages
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages for bookings they participate in (customer or provider)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_messages' AND policyname = 'booking_messages_select_participant'
  ) THEN
    CREATE POLICY booking_messages_select_participant ON public.booking_messages
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

-- Users can send messages to bookings they participate in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_messages' AND policyname = 'booking_messages_insert_participant'
  ) THEN
    CREATE POLICY booking_messages_insert_participant ON public.booking_messages
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
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

-- Users can mark their received messages as read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_messages' AND policyname = 'booking_messages_update_read'
  ) THEN
    CREATE POLICY booking_messages_update_read ON public.booking_messages
      FOR UPDATE TO authenticated
      USING (
        -- Can only update messages in bookings you participate in
        booking_id IN (
          SELECT id FROM public.bookings
          WHERE customer_id = auth.uid()
             OR provider_id IN (
               SELECT id FROM public.service_providers WHERE user_id = auth.uid()
             )
        )
      )
      WITH CHECK (
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


-- ---------------------------------------------------------------------------
-- 5. reviews
-- ---------------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read non-hidden reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reviews' AND policyname = 'reviews_select_public'
  ) THEN
    CREATE POLICY reviews_select_public ON public.reviews
      FOR SELECT TO anon, authenticated
      USING (is_hidden = false);
  END IF;
END $$;

-- Reviewers can also see their own hidden reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reviews' AND policyname = 'reviews_select_own'
  ) THEN
    CREATE POLICY reviews_select_own ON public.reviews
      FOR SELECT TO authenticated
      USING (reviewer_id = auth.uid());
  END IF;
END $$;

-- Authenticated users can create reviews (for bookings they participated in)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reviews' AND policyname = 'reviews_insert_reviewer'
  ) THEN
    CREATE POLICY reviews_insert_reviewer ON public.reviews
      FOR INSERT TO authenticated
      WITH CHECK (
        reviewer_id = auth.uid()
        AND booking_id IN (
          SELECT id FROM public.bookings WHERE customer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Providers can update reviews to add their response
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reviews' AND policyname = 'reviews_update_provider_response'
  ) THEN
    CREATE POLICY reviews_update_provider_response ON public.reviews
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


-- ---------------------------------------------------------------------------
-- 6. saved_providers
-- ---------------------------------------------------------------------------
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;

-- Users can CRUD only their own saved providers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_providers' AND policyname = 'saved_providers_select_own'
  ) THEN
    CREATE POLICY saved_providers_select_own ON public.saved_providers
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_providers' AND policyname = 'saved_providers_insert_own'
  ) THEN
    CREATE POLICY saved_providers_insert_own ON public.saved_providers
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_providers' AND policyname = 'saved_providers_delete_own'
  ) THEN
    CREATE POLICY saved_providers_delete_own ON public.saved_providers
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 7. provider_service_areas
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_service_areas ENABLE ROW LEVEL SECURITY;

-- Public can read all service areas (needed for discovery/search)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_service_areas' AND policyname = 'provider_service_areas_select_public'
  ) THEN
    CREATE POLICY provider_service_areas_select_public ON public.provider_service_areas
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Providers can manage their own service areas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_service_areas' AND policyname = 'provider_service_areas_insert_own'
  ) THEN
    CREATE POLICY provider_service_areas_insert_own ON public.provider_service_areas
      FOR INSERT TO authenticated
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_service_areas' AND policyname = 'provider_service_areas_update_own'
  ) THEN
    CREATE POLICY provider_service_areas_update_own ON public.provider_service_areas
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_service_areas' AND policyname = 'provider_service_areas_delete_own'
  ) THEN
    CREATE POLICY provider_service_areas_delete_own ON public.provider_service_areas
      FOR DELETE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 8. provider_availability_intervals
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_availability_intervals ENABLE ROW LEVEL SECURITY;

-- Public can read active intervals (needed for booking availability checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_availability_intervals' AND policyname = 'provider_availability_intervals_select_public'
  ) THEN
    CREATE POLICY provider_availability_intervals_select_public ON public.provider_availability_intervals
      FOR SELECT TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Providers can manage their own intervals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_availability_intervals' AND policyname = 'provider_availability_intervals_insert_own'
  ) THEN
    CREATE POLICY provider_availability_intervals_insert_own ON public.provider_availability_intervals
      FOR INSERT TO authenticated
      WITH CHECK (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_availability_intervals' AND policyname = 'provider_availability_intervals_update_own'
  ) THEN
    CREATE POLICY provider_availability_intervals_update_own ON public.provider_availability_intervals
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_availability_intervals' AND policyname = 'provider_availability_intervals_delete_own'
  ) THEN
    CREATE POLICY provider_availability_intervals_delete_own ON public.provider_availability_intervals
      FOR DELETE TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 9. provider_verification_documents (M0.5: deprecated table, still secure it)
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_verification_documents ENABLE ROW LEVEL SECURITY;

-- Providers can read their own documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_verification_documents' AND policyname = 'provider_verification_documents_select_own'
  ) THEN
    CREATE POLICY provider_verification_documents_select_own ON public.provider_verification_documents
      FOR SELECT TO authenticated
      USING (
        provider_id IN (
          SELECT id FROM public.service_providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 10. provider_availability (deprecated but still in DB — lock it down)
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

-- Public read for backward compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_availability' AND policyname = 'provider_availability_select_public'
  ) THEN
    CREATE POLICY provider_availability_select_public ON public.provider_availability
      FOR SELECT TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Provider can manage own (in case any code still writes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_availability' AND policyname = 'provider_availability_manage_own'
  ) THEN
    CREATE POLICY provider_availability_manage_own ON public.provider_availability
      FOR ALL TO authenticated
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


-- ---------------------------------------------------------------------------
-- 11. provider_portfolio (M0.7: deprecated table — still secure it)
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_portfolio ENABLE ROW LEVEL SECURITY;

-- Public can read portfolio items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_portfolio' AND policyname = 'provider_portfolio_select_public'
  ) THEN
    CREATE POLICY provider_portfolio_select_public ON public.provider_portfolio
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Providers can manage their own portfolio entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_portfolio' AND policyname = 'provider_portfolio_manage_own'
  ) THEN
    CREATE POLICY provider_portfolio_manage_own ON public.provider_portfolio
      FOR ALL TO authenticated
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


-- ---------------------------------------------------------------------------
-- 12. provider_blocked_dates (also missing RLS)
-- ---------------------------------------------------------------------------
-- Only apply if the table exists (it may not have been created yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_blocked_dates'
  ) THEN
    ALTER TABLE public.provider_blocked_dates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Public can read blocked dates (needed for booking UI)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_blocked_dates'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_blocked_dates' AND policyname = 'provider_blocked_dates_select_public'
  ) THEN
    CREATE POLICY provider_blocked_dates_select_public ON public.provider_blocked_dates
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Providers can manage their own blocked dates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_blocked_dates'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_blocked_dates' AND policyname = 'provider_blocked_dates_manage_own'
  ) THEN
    CREATE POLICY provider_blocked_dates_manage_own ON public.provider_blocked_dates
      FOR ALL TO authenticated
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


COMMIT;
