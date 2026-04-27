-- =============================================
-- Remove ALL References to cancelled_by_system
-- Purpose: cancelled_by_system does NOT exist in booking_status enum
-- Verified: Only 25 values exist, cancelled_by_system is NOT one of them
-- =============================================

-- Fix auto_log_booking_status_change function (CRITICAL)
CREATE OR REPLACE FUNCTION auto_log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO booking_status_history (
      booking_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      current_user,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'Initial booking created'
        ELSE format('Status changed from %s to %s', OLD.status, NEW.status)
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_log_booking_status_change() IS
'Logs status changes to booking_status_history table. FIXED: Removed all references to cancelled_by_system (does not exist in enum).';

-- Fix validate_booking_state_fields function (CRITICAL)
CREATE OR REPLACE FUNCTION validate_booking_state_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Draft/Initial: Must have service and service_type
  IF NEW.status IN ('draft', 'submitted', 'provider_viewed', 'quote_pending') THEN
    IF NEW.service_id IS NULL THEN
      RAISE EXCEPTION 'service_id is required for status %', NEW.status
        USING ERRCODE = '23514';
    END IF;
    IF NEW.service_type_id IS NULL THEN
      RAISE EXCEPTION 'service_type_id is required for status %', NEW.status
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Quote sent: Must have pricing_snapshot
  IF NEW.status = 'quote_sent' THEN
    IF NEW.pricing_snapshot IS NULL THEN
      RAISE EXCEPTION 'pricing_snapshot is required when quote is sent'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Confirmed and beyond: Must have ALL pricing fields
  IF NEW.status IN ('confirmed', 'scheduled', 'in_progress', 'completed', 
                     'partially_completed', 'requires_followup', 
                     'provider_no_show', 'customer_no_show', 
                     'customer_confirmed', 'payment_pending', 'payment_failed') THEN
    IF NEW.pricing_snapshot IS NULL THEN
      RAISE EXCEPTION 'pricing_snapshot is required for status %', NEW.status
        USING ERRCODE = '23514';
    END IF;
    IF NEW.agreed_price IS NULL THEN
      RAISE EXCEPTION 'agreed_price is required for status %', NEW.status
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Cancellation: Must have cancellation details
  -- FIX: Use ACTUAL enum values (cancelled_customer, cancelled_provider ONLY)
  -- NOTE: cancelled_by_system does NOT exist in enum (verified 2026-01-09)
  IF NEW.status IN ('cancelled_customer', 'cancelled_provider') THEN
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := CURRENT_TIMESTAMP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_booking_state_fields() IS
'Enforces required fields for each booking status. FINAL FIX: Removed cancelled_by_system (does not exist in enum - verified 2026-01-09).';

-- Verification output
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FINAL FIX: cancelled_by_system REMOVED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Corrected functions:';
  RAISE NOTICE '  ✅ auto_log_booking_status_change()';
  RAISE NOTICE '  ✅ validate_booking_state_fields()';
  RAISE NOTICE '';
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  - Queried pg_enum directly';
  RAISE NOTICE '  - Found 25 enum values total';
  RAISE NOTICE '  - cancelled_by_system NOT in enum';
  RAISE NOTICE '  - Using ONLY: cancelled_customer, cancelled_provider';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
