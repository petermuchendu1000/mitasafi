-- Migration: Emergency Booking Validation Trigger
-- Purpose: Enforce emergency bookings only for services that support emergency
-- Replaces CHECK constraint that failed (subqueries not allowed in CHECK)
-- Created: 2026-01-09
-- Status: Post-deployment schema hardening

-- ============================================================================
-- TRIGGER: Validate Emergency Service Capability
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_emergency_service_capability()
RETURNS TRIGGER AS $$
DECLARE
  v_supports_emergency boolean;
BEGIN
  -- Get service capability
  SELECT sc.supports_emergency INTO v_supports_emergency
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN service_capabilities sc ON sc.service_id = s.id
  WHERE b.id = NEW.booking_id;
  
  -- Raise error if service does not support emergency
  IF v_supports_emergency IS NULL OR v_supports_emergency = false THEN
    RAISE EXCEPTION 'Cannot create emergency booking: Service does not support emergency capability. Check service_capabilities.supports_emergency for service_id in booking.'
      USING ERRCODE = '23514',  -- check_violation
            HINT = 'Only services with supports_emergency=true can have emergency bookings.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to booking_emergency_details
DROP TRIGGER IF EXISTS validate_emergency_capability_trigger ON booking_emergency_details;

CREATE TRIGGER validate_emergency_capability_trigger
  BEFORE INSERT ON booking_emergency_details
  FOR EACH ROW
  EXECUTE FUNCTION validate_emergency_service_capability();

COMMENT ON FUNCTION validate_emergency_service_capability() IS 
'Validates that emergency bookings are only created for services with supports_emergency=true. Replaces CHECK constraint that cannot use subqueries.';

-- ============================================================================
-- VALIDATION TEST (Commented out - for reference)
-- ============================================================================

-- To test after seeding data:
-- 
-- 1. Try to create emergency booking for non-emergency service (should fail):
--    INSERT INTO booking_emergency_details (booking_id, problem_description, damage_risk_level)
--    VALUES ('<booking_for_non_emergency_service>', 'Test', 'high');
--    Expected: ERROR: Cannot create emergency booking: Service does not support emergency capability
--
-- 2. Create emergency booking for emergency service (should succeed):
--    INSERT INTO booking_emergency_details (booking_id, problem_description, damage_risk_level)
--    VALUES ('<booking_for_emergency_service>', 'Test', 'high');
--    Expected: Success

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
