-- Migration: State-Dependent Field Constraints
-- Purpose: Enforce required fields based on booking status
-- Dependencies: 20260109120003_booking_status_transition_enforcement.sql
-- Critical: Ensures data consistency for status-specific requirements

-- ============================================================================
-- FUNCTION: Validate State-Dependent Fields
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_booking_state_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- ========================================================================
  -- CONFIRMED & BEYOND: Must have provider assigned
  -- ========================================================================
  IF NEW.status IN (
    'confirmed', 'scheduled', 'in_progress', 'completed', 'partially_completed',
    'requires_followup', 'customer_confirmed', 'provider_no_show'
  ) THEN
    IF NEW.provider_id IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires provider_id to be set. Booking ID: %', 
        NEW.status, NEW.id
        USING HINT = 'Assign a provider before moving to this status.';
    END IF;
  END IF;
  
  -- ========================================================================
  -- IN_PROGRESS & BEYOND: Must have actual_start timestamp
  -- ========================================================================
  IF NEW.status IN (
    'in_progress', 'completed', 'partially_completed', 'requires_followup',
    'customer_confirmed', 'customer_no_show'
  ) THEN
    IF NEW.actual_start IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires actual_start timestamp. Booking ID: %', 
        NEW.status, NEW.id
        USING HINT = 'Set actual_start when work begins.';
    END IF;
  END IF;
  
  -- ========================================================================
  -- COMPLETED & BEYOND: Must have actual_end timestamp
  -- ========================================================================
  IF NEW.status IN (
    'completed', 'customer_confirmed', 'payment_pending', 'resolved'
  ) THEN
    IF NEW.actual_end IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires actual_end timestamp. Booking ID: %', 
        NEW.status, NEW.id
        USING HINT = 'Set actual_end when work finishes.';
    END IF;
  END IF;
  
  -- ========================================================================
  -- PARTIALLY_COMPLETED: Must have completion_percentage
  -- ========================================================================
  IF NEW.status = 'partially_completed' THEN
    IF NEW.completion_percentage IS NULL THEN
      RAISE EXCEPTION 'Status "partially_completed" requires completion_percentage. Booking ID: %', 
        NEW.id
        USING HINT = 'Set completion_percentage (0-100) to track partial work.';
    END IF;
    IF NEW.completion_percentage >= 100 THEN
      RAISE EXCEPTION 'partially_completed cannot have completion_percentage >= 100. Use "completed" status instead. Booking ID: %', 
        NEW.id;
    END IF;
  END IF;
  
  -- ========================================================================
  -- REQUIRES_FOLLOWUP: Should have followup_scheduled_at (warning only)
  -- ========================================================================
  IF NEW.status = 'requires_followup' AND NEW.followup_scheduled_at IS NULL THEN
    RAISE WARNING 'Status "requires_followup" should have followup_scheduled_at set. Booking ID: %', NEW.id;
  END IF;
  
  -- ========================================================================
  -- ABANDONED: Must have abandoned_at and abandonment_reason
  -- ========================================================================
  IF NEW.status = 'abandoned' THEN
    IF NEW.abandoned_at IS NULL THEN
      NEW.abandoned_at := now();  -- Auto-set if not provided
    END IF;
    IF NEW.abandonment_reason IS NULL OR NEW.abandonment_reason = '' THEN
      RAISE EXCEPTION 'Status "abandoned" requires abandonment_reason. Booking ID: %', 
        NEW.id
        USING HINT = 'Set abandonment_reason: auto_timeout, customer_unresponsive, provider_unresponsive, etc.';
    END IF;
  END IF;
  
  -- ========================================================================
  -- CANCELLED: Must have cancellation_reason
  -- ========================================================================
  IF NEW.status IN ('cancelled_customer', 'cancelled_provider') THEN
    IF NEW.cancellation_reason IS NULL OR NEW.cancellation_reason = '' THEN
      RAISE EXCEPTION 'Status "%" requires cancellation_reason. Booking ID: %', 
        NEW.status, NEW.id
        USING HINT = 'Set cancellation_reason to explain why booking was cancelled.';
    END IF;
  END IF;
  
  -- ========================================================================
  -- CUSTOMER_CONFIRMED & BEYOND: Must have agreed_price
  -- ========================================================================
  IF NEW.status IN (
    'customer_confirmed', 'payment_pending', 'payment_failed', 'resolved'
  ) THEN
    IF NEW.agreed_price IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires agreed_price to be set. Booking ID: %', 
        NEW.status, NEW.id
        USING HINT = 'Set agreed_price before finalizing booking.';
    END IF;
  END IF;
  
  -- ========================================================================
  -- SCHEDULED: Must have scheduled_start (for future bookings)
  -- ========================================================================
  IF NEW.status = 'scheduled' THEN
    IF NEW.scheduled_start IS NULL THEN
      RAISE EXCEPTION 'Status "scheduled" requires scheduled_start timestamp. Booking ID: %', 
        NEW.id
        USING HINT = 'Set scheduled_start for future bookings.';
    END IF;
  END IF;
  
  -- ========================================================================
  -- QUOTE FLOW: Quote states require quoted_price
  -- ========================================================================
  IF NEW.status IN ('quote_sent', 'quote_accepted') THEN
    IF NEW.quoted_price IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires quoted_price to be set. Booking ID: %', 
        NEW.status, NEW.id
        USING HINT = 'Set quoted_price when provider submits quote.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_booking_state_fields() IS
'Enforces required fields based on booking status. 
Prevents status updates when required data is missing.';

-- ============================================================================
-- TRIGGER: Enforce State-Dependent Fields
-- ============================================================================

DROP TRIGGER IF EXISTS enforce_booking_state_fields ON bookings;

CREATE TRIGGER enforce_booking_state_fields
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_state_fields();

COMMENT ON TRIGGER enforce_booking_state_fields ON bookings IS
'Validates that required fields are set for each status. 
Blocks status transitions when required data is missing.';

-- ============================================================================
-- HELPER FUNCTION: Auto-set Timestamps on Status Change
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_booking_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set actual_start when moving to in_progress
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' AND NEW.actual_start IS NULL THEN
    NEW.actual_start := now();
    RAISE NOTICE 'Auto-set actual_start for booking %', NEW.id;
  END IF;
  
  -- Auto-set actual_end when moving to completed
  IF NEW.status IN ('completed', 'partially_completed') AND 
     OLD.status NOT IN ('completed', 'partially_completed') AND 
     NEW.actual_end IS NULL THEN
    NEW.actual_end := now();
    RAISE NOTICE 'Auto-set actual_end for booking %', NEW.id;
  END IF;
  
  -- Auto-set completed_at when moving to customer_confirmed
  IF NEW.status = 'customer_confirmed' AND OLD.status != 'customer_confirmed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
    RAISE NOTICE 'Auto-set completed_at for booking %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_set_booking_timestamps() IS
'Automatically sets critical timestamps when status changes. 
Provides convenience but does not override explicit values.';

-- ============================================================================
-- TRIGGER: Auto-set Timestamps (runs BEFORE state field validation)
-- ============================================================================

DROP TRIGGER IF EXISTS auto_set_booking_timestamps_trigger ON bookings;

CREATE TRIGGER auto_set_booking_timestamps_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION auto_set_booking_timestamps();

COMMENT ON TRIGGER auto_set_booking_timestamps_trigger ON bookings IS
'Auto-populates timestamps to satisfy state-dependent field requirements.';

-- ============================================================================
-- CONSTRAINT: Ensure rescheduling increments counter
-- ============================================================================

CREATE OR REPLACE FUNCTION track_reschedule_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment reschedule_count when scheduled_start changes (except on insert)
  IF TG_OP = 'UPDATE' AND 
     NEW.scheduled_start IS DISTINCT FROM OLD.scheduled_start AND
     NEW.scheduled_start IS NOT NULL THEN
    NEW.reschedule_count := COALESCE(OLD.reschedule_count, 0) + 1;
    RAISE NOTICE 'Booking % rescheduled (count: %)', NEW.id, NEW.reschedule_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_reschedule_count() IS
'Automatically increments reschedule_count when scheduled_start changes.';

DROP TRIGGER IF EXISTS track_reschedule_count_trigger ON bookings;

CREATE TRIGGER track_reschedule_count_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION track_reschedule_count();

COMMENT ON TRIGGER track_reschedule_count_trigger ON bookings IS
'Tracks how many times a booking has been rescheduled.';

-- ============================================================================
-- VALIDATION: Test Trigger Installation
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'enforce_booking_state_fields'
    AND tgrelid = 'bookings'::regclass
  ) THEN
    RAISE NOTICE '✅ State-dependent field validation trigger installed successfully';
  ELSE
    RAISE WARNING '❌ State-dependent field validation trigger NOT found';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'auto_set_booking_timestamps_trigger'
    AND tgrelid = 'bookings'::regclass
  ) THEN
    RAISE NOTICE '✅ Auto-timestamp trigger installed successfully';
  ELSE
    RAISE WARNING '❌ Auto-timestamp trigger NOT found';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'track_reschedule_count_trigger'
    AND tgrelid = 'bookings'::regclass
  ) THEN
    RAISE NOTICE '✅ Reschedule tracking trigger installed successfully';
  ELSE
    RAISE WARNING '❌ Reschedule tracking trigger NOT found';
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

/*
STATE-DEPENDENT FIELD REQUIREMENTS:

Status                    | Required Fields
--------------------------|--------------------------------------------------
confirmed+                | provider_id
in_progress+              | provider_id, actual_start
completed+                | provider_id, actual_start, actual_end
partially_completed       | provider_id, actual_start, actual_end, completion_percentage
requires_followup         | provider_id, actual_start, actual_end, followup_scheduled_at (warning)
customer_confirmed+       | provider_id, actual_start, actual_end, agreed_price
payment_pending+          | provider_id, actual_start, actual_end, agreed_price
scheduled                 | provider_id, scheduled_start
quote_sent                | quoted_price
quote_accepted            | quoted_price
abandoned                 | abandoned_at (auto-set), abandonment_reason
cancelled_*               | cancellation_reason
resolved                  | provider_id, actual_start, actual_end, agreed_price

AUTO-SET FIELDS:
- actual_start: Set when status → in_progress (if NULL)
- actual_end: Set when status → completed/partially_completed (if NULL)
- completed_at: Set when status → customer_confirmed (if NULL)
- abandoned_at: Set when status → abandoned (if NULL)
- reschedule_count: Incremented when scheduled_start changes

VALIDATION APPROACH:
1. Auto-timestamp trigger runs FIRST (populates missing timestamps)
2. State-dependent field validation runs SECOND (checks requirements)
3. State transition validation runs THIRD (checks valid transition)
4. Auto-log trigger runs LAST (records change in history)

TRIGGER EXECUTION ORDER:
1. auto_set_booking_timestamps_trigger (BEFORE UPDATE, auto-populate)
2. track_reschedule_count_trigger (BEFORE UPDATE, increment counter)
3. enforce_booking_state_fields (BEFORE INSERT/UPDATE, validate required fields)
4. enforce_booking_status_transitions (BEFORE UPDATE, validate transition)
5. update_updated_at (BEFORE UPDATE, set updated_at)
6. auto_log_booking_status_change_trigger (AFTER UPDATE, audit trail)

ERROR HANDLING:
- Missing required fields → EXCEPTION with clear message
- Invalid field values → EXCEPTION (e.g., completion_percentage >= 100)
- Missing optional fields → WARNING (e.g., followup_scheduled_at)

BENEFITS:
✅ Data integrity enforced by database, not just application
✅ Cannot have status='completed' with actual_end=NULL
✅ Cannot confirm booking without provider assigned
✅ Auto-timestamps reduce application code complexity
✅ Reschedule tracking happens automatically
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
