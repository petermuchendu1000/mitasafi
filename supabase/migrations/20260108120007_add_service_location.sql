-- Migration: Add service_location_id to bookings
-- Purpose: Primary location anchor for all bookings (refinement from Journey 1 validation)
-- Created: 2026-01-09
-- Status: Post-validation fix

-- ============================================================================
-- FIX: Add Primary Service Location Reference
-- ============================================================================

-- Add service_location_id as primary location anchor
-- Rationale:
-- - Every booking happens at a primary location
-- - Emergency/standard/personal = single location
-- - Delivery can override with pickup/dropoff but still has "primary"
-- - Enables area matching, history, analytics, repeat jobs

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS service_location_id uuid
REFERENCES locations(id) ON DELETE SET NULL;

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_service_location 
ON bookings(service_location_id) 
WHERE service_location_id IS NOT NULL;

-- Index for customer + location (repeat jobs)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_location 
ON bookings(customer_id, service_location_id) 
WHERE service_location_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN bookings.service_location_id IS 
'Primary service location for this booking. Emergency/standard/personal use this as the only location. Delivery uses this as the primary location even if pickup/dropoff differ.';

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'service_location_id'
  ) THEN
    RAISE EXCEPTION 'service_location_id column was not created';
  END IF;
END $$;
