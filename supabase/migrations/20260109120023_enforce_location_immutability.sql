-- =============================================
-- ENFORCE: Location Address Immutability
-- Purpose: Freeze core address fields after booking exists
-- Reason: Historical bookings must preserve accurate address data
-- =============================================

-- Function: Prevent address mutation after booking
CREATE OR REPLACE FUNCTION prevent_location_address_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  booking_count int;
BEGIN
  -- Check if location is referenced by any booking
  SELECT COUNT(*) INTO booking_count
  FROM bookings 
  WHERE service_location_id = OLD.id;
  
  -- If bookings exist, freeze core address fields
  IF booking_count > 0 THEN
    -- Core address fields (IMMUTABLE after booking)
    IF NEW.address_line1 IS DISTINCT FROM OLD.address_line1 THEN
      RAISE EXCEPTION 'Cannot change address_line1 for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';  -- check_violation
    END IF;
    
    IF NEW.address_line2 IS DISTINCT FROM OLD.address_line2 THEN
      RAISE EXCEPTION 'Cannot change address_line2 for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';
    END IF;
    
    IF NEW.area IS DISTINCT FROM OLD.area THEN
      RAISE EXCEPTION 'Cannot change area for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';
    END IF;
    
    IF NEW.city IS DISTINCT FROM OLD.city THEN
      RAISE EXCEPTION 'Cannot change city for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';
    END IF;
    
    IF NEW.county IS DISTINCT FROM OLD.county THEN
      RAISE EXCEPTION 'Cannot change county for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';
    END IF;
    
    IF NEW.country IS DISTINCT FROM OLD.country THEN
      RAISE EXCEPTION 'Cannot change country for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';
    END IF;
    
    IF NEW.latitude IS DISTINCT FROM OLD.latitude THEN
      RAISE EXCEPTION 'Cannot change latitude for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';
    END IF;
    
    IF NEW.longitude IS DISTINCT FROM OLD.longitude THEN
      RAISE EXCEPTION 'Cannot change longitude for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';
    END IF;
    
    IF NEW.location_type IS DISTINCT FROM OLD.location_type THEN
      RAISE EXCEPTION 'Cannot change location_type for location % - referenced by % booking(s). Create new location instead.', 
        OLD.id, booking_count
        USING ERRCODE = '23514';
    END IF;
    
    -- Mutable fields (allowed to change):
    -- - access_notes: Gate codes change, caretaker contact changes
    -- - label: User preference ('Home' → 'Old Home')
    -- - is_saved: User can un-save location
    -- - updated_at: Always updates (handled by trigger)
    
    RAISE NOTICE 'Location % update allowed - only mutable fields changed', OLD.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS prevent_location_address_mutation_trigger ON locations;
CREATE TRIGGER prevent_location_address_mutation_trigger
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_location_address_mutation();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LOCATION ADDRESS IMMUTABILITY ENFORCED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger: prevent_location_address_mutation_trigger';
  RAISE NOTICE 'Function: prevent_location_address_mutation()';
  RAISE NOTICE '';
  RAISE NOTICE 'IMMUTABLE Fields (after booking exists):';
  RAISE NOTICE '  ✅ address_line1 (primary address)';
  RAISE NOTICE '  ✅ address_line2 (secondary address)';
  RAISE NOTICE '  ✅ area (neighborhood)';
  RAISE NOTICE '  ✅ city';
  RAISE NOTICE '  ✅ county';
  RAISE NOTICE '  ✅ country';
  RAISE NOTICE '  ✅ latitude (coordinates)';
  RAISE NOTICE '  ✅ longitude (coordinates)';
  RAISE NOTICE '  ✅ location_type (safety context)';
  RAISE NOTICE '';
  RAISE NOTICE 'MUTABLE Fields (always):';
  RAISE NOTICE '  ✅ access_notes (gate codes change)';
  RAISE NOTICE '  ✅ label (user preference)';
  RAISE NOTICE '  ✅ is_saved (user can un-save)';
  RAISE NOTICE '';
  RAISE NOTICE 'Enforcement:';
  RAISE NOTICE '  - Check violation raised on address change attempt';
  RAISE NOTICE '  - Error message: "Create new location instead"';
  RAISE NOTICE '  - Booking count included in error for debugging';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMENT ON FUNCTION prevent_location_address_mutation() IS
'Enforces location address immutability after bookings exist. Core address fields (address, area, city, county, country, coordinates, location_type) are frozen once a booking references the location. Mutable fields (access_notes, label, is_saved) remain changeable. Created 2026-01-09.';

COMMENT ON TRIGGER prevent_location_address_mutation_trigger ON locations IS
'Prevents changes to core address fields when bookings reference the location. Ensures historical booking location data remains accurate. Created 2026-01-09.';
