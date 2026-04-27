-- Migration: Fix phone column to be nullable
-- The search_alerts table should allow email OR phone, not require both
-- This fixes the NOT NULL constraint on phone column

-- Make phone column nullable (email OR phone required, not both)
ALTER TABLE public.search_alerts 
  ALTER COLUMN phone DROP NOT NULL;

-- Add a check constraint to ensure at least email OR phone is provided
ALTER TABLE public.search_alerts
  DROP CONSTRAINT IF EXISTS search_alerts_contact_required;

ALTER TABLE public.search_alerts
  ADD CONSTRAINT search_alerts_contact_required 
  CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHONE NULLABLE FIX APPLIED!';
  RAISE NOTICE '- phone column is now nullable';
  RAISE NOTICE '- constraint ensures email OR phone required';
  RAISE NOTICE '========================================';
END $$;
