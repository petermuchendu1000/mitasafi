-- =============================================================================
-- MITASAFI: ADD MISSING FK FROM bookings.customer_id → profiles.id
-- =============================================================================
-- The bookings table was created with `customer_id uuid NOT NULL` but no
-- REFERENCES constraint.  PostgREST (used by the Supabase JS client) relies
-- on FK relationships to resolve embedded joins such as:
--
--   .select("*, customer:profiles!customer_id ( full_name )")
--
-- Without the FK, this join returns an error ("Could not find a relationship…").
-- This migration adds the missing constraint idempotently.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_customer_id_fkey'
      AND table_name = 'bookings'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK bookings.customer_id → profiles.id';
  ELSE
    RAISE NOTICE 'FK bookings_customer_id_fkey already exists — skipping';
  END IF;
END $$;
