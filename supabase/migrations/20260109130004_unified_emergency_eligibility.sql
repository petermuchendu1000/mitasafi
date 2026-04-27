-- =============================================================================
-- BLOCKER 5 FIX: Unified emergency eligibility function
-- Date: 2026-01-09
-- Purpose: Single source of truth for emergency booking eligibility
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md (Question 6, Decision #4)
-- =============================================================================

-- Add emergency_capacity_reserved to provider_services (if not exists)
ALTER TABLE provider_services
ADD COLUMN IF NOT EXISTS emergency_capacity_reserved INTEGER DEFAULT 0 CHECK (emergency_capacity_reserved >= 0);

COMMENT ON COLUMN provider_services.emergency_capacity_reserved IS
  'Additional capacity units available for emergency bookings.
  
  CALCULATION:
    - Regular max capacity: concurrent_units
    - Emergency max capacity: concurrent_units + emergency_capacity_reserved
  
  EXAMPLES:
    - Solo plumber: concurrent_units=1, emergency_capacity_reserved=1 → emergency max=2
    - Cleaning company: concurrent_units=3, emergency_capacity_reserved=1 → emergency max=4
  
  NOTE: Hard ceiling (no percentage math, no soft overrides)';

-- Unified emergency eligibility check
CREATE OR REPLACE FUNCTION check_emergency_eligibility(
  p_service_id UUID,
  p_provider_id UUID
) RETURNS TABLE (
  eligible BOOLEAN,
  reason TEXT,
  regular_max INTEGER,
  emergency_max INTEGER,
  current_usage INTEGER
) AS $$
DECLARE
  v_service_supports BOOLEAN;
  v_provider_concurrent INTEGER;
  v_provider_emergency INTEGER;
BEGIN
  -- Check 1: Service must support emergency
  SELECT sc.supports_emergency INTO v_service_supports
  FROM service_capabilities sc
  WHERE sc.service_id = p_service_id;
  
  IF NOT FOUND OR NOT v_service_supports THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      'Service does not support emergency bookings'::TEXT,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;

  -- Check 2: Provider must offer this service
  SELECT ps.concurrent_units, ps.emergency_capacity_reserved
  INTO v_provider_concurrent, v_provider_emergency
  FROM provider_services ps
  WHERE ps.provider_id = p_provider_id
    AND ps.service_id = p_service_id
    AND ps.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      'Provider does not offer this service'::TEXT,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;

  -- Check 3: Pure eligibility (capacity checked at commitment creation)
  -- We do NOT count bookings here (violates commitment doctrine)
  -- Capacity accounting MUST happen inside create_commitment_and_confirm_booking()
  
  RETURN QUERY SELECT 
    true::BOOLEAN,
    'Emergency eligible (capacity checked at commitment)'::TEXT,
    v_provider_concurrent,
    v_provider_concurrent + v_provider_emergency,
    NULL::INTEGER;  -- current_usage removed (non-authoritative)
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_emergency_eligibility IS
  'Unified emergency eligibility check (PURE ELIGIBILITY ONLY).
  
  CHECKS:
    1. Service supports_emergency = true
    2. Provider offers this service (provider_services row exists)
    3. Emergency capacity limits configured (emergency_capacity_reserved)
  
  DOES NOT CHECK:
    - Current capacity usage (done at commitment creation)
    - Time availability (separate check)
    - Booking conflicts (commitment layer responsibility)
  
  RETURNS:
    - eligible: true if provider CAN accept emergency bookings
    - reason: explanation text
    - regular_max: concurrent_units
    - emergency_max: concurrent_units + emergency_capacity_reserved
    - current_usage: NULL (removed - use booking_commitments for truth)
  
  USAGE:
    SELECT * FROM check_emergency_eligibility(service_uuid, provider_uuid);
  
  CAPACITY ACCOUNTING:
    Happens ONLY in create_commitment_and_confirm_booking().
    This function answers "is provider emergency-capable?" not "is slot available?"';
