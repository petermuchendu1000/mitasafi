-- Migration: Fix response_time check constraint to match form values
-- Description: Updates the response_time constraint to use the actual form option values
-- Idempotent: Yes
-- Date: 2026-03-01

-- Drop the existing constraint and add a new one with correct values
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'response_time_check'
  ) THEN
    ALTER TABLE service_providers DROP CONSTRAINT response_time_check;
  END IF;
  
  -- Add new constraint with actual form values
  ALTER TABLE service_providers ADD CONSTRAINT response_time_check 
    CHECK (response_time IS NULL OR response_time IN (
      'within_1_hour',      -- Usually responds within 1 hour
      'within_few_hours',   -- Within a few hours
      'within_24_hours'     -- Within 24 hours
    ));
  
  COMMENT ON COLUMN service_providers.response_time IS 
    'Expected time to respond to new booking requests. Values: within_1_hour, within_few_hours, within_24_hours. NULL means not specified.';
END $$;
