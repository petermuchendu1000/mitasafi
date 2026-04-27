-- Migration: Add emergency availability and response time fields
-- Description: Adds fields for provider emergency work preferences and expected response time
-- Idempotent: Yes
-- Date: 2026-03-01

-- Add emergency_available column
-- Indicates whether provider accepts emergency/urgent work requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'emergency_available'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN emergency_available boolean DEFAULT false;
    COMMENT ON COLUMN service_providers.emergency_available IS 
      'Whether provider accepts emergency/urgent job requests. If true, they can receive emergency bookings outside normal hours.';
  END IF;
END $$;

-- Add emergency_surcharge_type column
-- How the provider charges for emergency work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'emergency_surcharge_type'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN emergency_surcharge_type text;
    ALTER TABLE service_providers ADD CONSTRAINT emergency_surcharge_type_check 
      CHECK (emergency_surcharge_type IS NULL OR emergency_surcharge_type IN ('fixed', 'percent'));
    COMMENT ON COLUMN service_providers.emergency_surcharge_type IS 
      'How emergency surcharge is calculated: fixed (flat fee) or percent (percentage of service price). NULL if no surcharge.';
  END IF;
END $$;

-- Add emergency_surcharge_amount column  
-- The surcharge value (amount in KES if fixed, percentage if percent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'emergency_surcharge_amount'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN emergency_surcharge_amount decimal(10,2);
    ALTER TABLE service_providers ADD CONSTRAINT emergency_surcharge_amount_check 
      CHECK (emergency_surcharge_amount IS NULL OR emergency_surcharge_amount >= 0);
    COMMENT ON COLUMN service_providers.emergency_surcharge_amount IS 
      'Emergency surcharge value. If type=fixed: amount in KES. If type=percent: percentage (e.g., 25 for 25%). NULL if no surcharge.';
  END IF;
END $$;

-- Add response_time column
-- Expected response time to booking requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'response_time'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN response_time text;
    ALTER TABLE service_providers ADD CONSTRAINT response_time_check 
      CHECK (response_time IS NULL OR response_time IN ('immediate', '1_hour', '2_hours', '4_hours', 'same_day', 'next_day'));
    COMMENT ON COLUMN service_providers.response_time IS 
      'Expected time to respond to new booking requests. Used for customer expectations and search ranking.';
  END IF;
END $$;

-- Create index for filtering emergency-available providers
CREATE INDEX IF NOT EXISTS idx_providers_emergency_available 
  ON service_providers(emergency_available) 
  WHERE emergency_available = true AND is_active = true;

COMMENT ON INDEX idx_providers_emergency_available IS 
  'Fast lookup of providers accepting emergency work - used in emergency booking flow';
