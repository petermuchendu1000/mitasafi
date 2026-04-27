-- =============================================
-- FIX: Location Delete Behavior
-- Purpose: Change ON DELETE SET NULL to ON DELETE RESTRICT
-- Reason: Historical bookings must never lose location data
-- =============================================

-- Drop existing foreign key constraint
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_service_location_id_fkey;

-- Recreate with RESTRICT behavior
ALTER TABLE bookings
ADD CONSTRAINT bookings_service_location_id_fkey
FOREIGN KEY (service_location_id) 
REFERENCES locations(id) 
ON DELETE RESTRICT;  -- Changed from SET NULL

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LOCATION DELETE BEHAVIOR FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changed: bookings.service_location_id';
  RAISE NOTICE '  ❌ BEFORE: ON DELETE SET NULL (allowed deletion, orphaned bookings)';
  RAISE NOTICE '  ✅ AFTER:  ON DELETE RESTRICT (prevents deletion, protects history)';
  RAISE NOTICE '';
  RAISE NOTICE 'Impact:';
  RAISE NOTICE '  - Locations cannot be deleted if bookings reference them';
  RAISE NOTICE '  - Historical bookings never lose location data';
  RAISE NOTICE '  - Foreign key violation raised on delete attempt';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMENT ON CONSTRAINT bookings_service_location_id_fkey ON bookings IS
'Prevents location deletion when bookings exist. Changed from SET NULL to RESTRICT (2026-01-09) to protect historical booking location data.';
