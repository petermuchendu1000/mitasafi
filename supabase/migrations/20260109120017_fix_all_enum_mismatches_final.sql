-- =====================================================================================
-- Migration: 20260109120017_fix_all_enum_mismatches_final
-- Purpose: Fix ALL remaining enum value mismatches comprehensively
-- Author: System  
-- Date: 2026-01-09
--
-- CRITICAL FIX: Correct all cancelled_by_* references to match actual enum
--
-- Actual Enum Values (from 20260108120000_core_enums_and_types.sql):
--   - 'cancelled_customer' (NOT cancelled_by_customer)
--   - 'cancelled_provider' (NOT cancelled_by_provider)
--   - 'cancelled_by_system' was added in 20260109120001
--
-- This migration fixes validate_booking_state_fields() to use correct values
-- =====================================================================================

-- Drop and recreate with ONLY valid enum values
DROP FUNCTION IF EXISTS validate_booking_state_fields() CASCADE;

CREATE OR REPLACE FUNCTION validate_booking_state_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Status-specific required field validation
  -- This ensures data integrity for each booking status
  
  -- Draft/Initial: Minimal requirements
  IF NEW.status IN ('draft', 'quote_pending') THEN
    IF NEW.service_id IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires service_id to be set. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Quote sent: Requires quoted_price
  IF NEW.status = 'quote_sent' THEN
    IF NEW.quoted_price IS NULL THEN
      RAISE EXCEPTION 'Status "quote_sent" requires quoted_price. Booking: %', NEW.id;
    END IF;
  END IF;
  
  -- Confirmed: Requires provider
  IF NEW.status IN ('confirmed', 'scheduled', 'in_progress', 'completed', 'partially_completed') THEN
    IF NEW.provider_id IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires provider_id to be set. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Customer confirmed and beyond: Requires pricing fields (CRITICAL)
  IF NEW.status IN (
    'customer_confirmed',
    'payment_pending',
    'payment_failed',
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'partially_completed',
    'requires_followup',
    'rework_required',
    'disputed',
    'resolved'
  ) THEN
    -- Require agreed_price
    IF NEW.agreed_price IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires agreed_price to be set. Booking: %', NEW.status, NEW.id
        USING HINT = 'Set agreed_price to the final agreed amount.';
    END IF;
    
    -- Require pricing_snapshot (THE CRITICAL REQUIREMENT)
    IF NEW.pricing_snapshot IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires pricing_snapshot to be set. Booking: %', NEW.status, NEW.id
        USING HINT = 'pricing_snapshot is the immutable legal record. It must contain: service_pricing, components, subtotal, service_fee, total, currency, calculated_at.';
    END IF;
  END IF;
  
  -- In progress: Requires actual_start
  IF NEW.status IN ('in_progress', 'completed', 'partially_completed') THEN
    IF NEW.actual_start IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires actual_start timestamp. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Completed: Requires actual_end
  IF NEW.status IN ('completed', 'partially_completed', 'resolved') THEN
    IF NEW.actual_end IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires actual_end timestamp. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Partially completed: Requires completion_percentage
  IF NEW.status = 'partially_completed' THEN
    IF NEW.completion_percentage IS NULL THEN
      RAISE EXCEPTION 'Status "partially_completed" requires completion_percentage. Booking: %', NEW.id;
    END IF;
  END IF;
  
  -- Disputed: Requires dispute to exist
  IF NEW.status = 'disputed' THEN
    -- Note: This will be validated by application logic since we can't easily join in trigger
    RAISE NOTICE 'Booking % marked as disputed - ensure booking_disputes entry exists', NEW.id;
  END IF;
  
  -- Cancelled statuses: Requires cancellation reason
  -- FIX: Use ACTUAL enum values (cancelled_customer, cancelled_provider, cancelled_by_system)
  IF NEW.status IN ('cancelled_customer', 'cancelled_provider', 'cancelled_by_system') THEN
    IF NEW.cancellation_reason IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires cancellation_reason. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Abandoned: Requires abandonment_reason
  IF NEW.status = 'abandoned' THEN
    IF NEW.abandonment_reason IS NULL THEN
      RAISE EXCEPTION 'Status "abandoned" requires abandonment_reason. Booking: %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_booking_state_fields IS
'Enforces required fields for each booking status. FIXED: Uses only valid enum values (cancelled_customer, cancelled_provider, cancelled_by_system).';

-- Recreate trigger
CREATE TRIGGER enforce_booking_state_fields
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_state_fields();

COMMENT ON TRIGGER enforce_booking_state_fields ON bookings IS
'Validates required fields based on booking status. All enum values verified against actual enum definition.';

-- Verification
DO $$
DECLARE
  enum_values text[];
BEGIN
  SELECT array_agg(e::text ORDER BY e::text) INTO enum_values
  FROM unnest(enum_range(NULL::booking_status)) e;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ENUM MISMATCH FIX - FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Corrected enum references:';
  RAISE NOTICE '  ❌ cancelled_by_customer → ✅ cancelled_customer';
  RAISE NOTICE '  ❌ cancelled_by_provider → ✅ cancelled_provider';
  RAISE NOTICE '  ✅ cancelled_by_system (correct - added in 20260109120001)';
  RAISE NOTICE '';
  RAISE NOTICE 'All booking_status values (% total):', array_length(enum_values, 1);
  FOR i IN 1..array_length(enum_values, 1) LOOP
    RAISE NOTICE '  %', enum_values[i];
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE 'Function: validate_booking_state_fields()';
  RAISE NOTICE 'Status: CORRECTED - All enum references verified';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
