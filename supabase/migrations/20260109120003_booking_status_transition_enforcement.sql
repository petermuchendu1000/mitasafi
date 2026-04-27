-- Migration: Booking Status Transition Enforcement
-- Purpose: Database-level validation of state transitions
-- Dependencies: 20260109120002_add_missing_booking_states.sql
-- Critical: Prevents invalid state transitions and protects terminal states

-- ============================================================================
-- FUNCTION: Validate Booking Status Transitions
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same-state updates (updating other fields)
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  
  -- ========================================================================
  -- TERMINAL STATE PROTECTION (Cannot transition OUT of these states)
  -- ========================================================================
  IF OLD.status IN ('resolved', 'cancelled_customer', 'cancelled_provider', 'needs_reassignment', 'abandoned', 'quote_rejected') THEN
    RAISE EXCEPTION 'Cannot modify booking in terminal state: %. Booking ID: %, Old Status: %, New Status: %',
      OLD.status, OLD.id, OLD.status, NEW.status
      USING HINT = 'Terminal states cannot be changed. Contact admin if this is an error.';
  END IF;
  
  -- ========================================================================
  -- STATE-SPECIFIC TRANSITION RULES
  -- ========================================================================
  
  -- FROM: draft
  IF OLD.status = 'draft' THEN
    IF NEW.status NOT IN ('submitted', 'cancelled_customer', 'abandoned') THEN
      RAISE EXCEPTION 'Invalid transition from draft to %. Allowed: submitted, cancelled_customer, abandoned', NEW.status;
    END IF;
  END IF;
  
  -- FROM: submitted
  IF OLD.status = 'submitted' THEN
    IF NEW.status NOT IN ('provider_viewed', 'quote_pending', 'confirmed', 'cancelled_customer', 'cancelled_provider', 'needs_reassignment', 'abandoned') THEN
      RAISE EXCEPTION 'Invalid transition from submitted to %. Allowed: provider_viewed, quote_pending, confirmed, cancelled_*, needs_reassignment, abandoned', NEW.status;
    END IF;
  END IF;
  
  -- FROM: provider_viewed
  IF OLD.status = 'provider_viewed' THEN
    IF NEW.status NOT IN ('quote_pending', 'confirmed', 'cancelled_provider', 'abandoned') THEN
      RAISE EXCEPTION 'Invalid transition from provider_viewed to %. Allowed: quote_pending, confirmed, cancelled_provider, abandoned', NEW.status;
    END IF;
  END IF;
  
  -- FROM: quote_pending
  IF OLD.status = 'quote_pending' THEN
    IF NEW.status NOT IN ('quote_sent', 'cancelled_provider', 'abandoned') THEN
      RAISE EXCEPTION 'Invalid transition from quote_pending to %. Allowed: quote_sent, cancelled_provider, abandoned', NEW.status;
    END IF;
  END IF;
  
  -- FROM: quote_sent
  IF OLD.status = 'quote_sent' THEN
    IF NEW.status NOT IN ('quote_accepted', 'quote_rejected', 'cancelled_customer', 'abandoned') THEN
      RAISE EXCEPTION 'Invalid transition from quote_sent to %. Allowed: quote_accepted, quote_rejected, cancelled_customer, abandoned', NEW.status;
    END IF;
  END IF;
  
  -- FROM: quote_accepted
  IF OLD.status = 'quote_accepted' THEN
    IF NEW.status NOT IN ('confirmed') THEN
      RAISE EXCEPTION 'Invalid transition from quote_accepted to %. Allowed: confirmed', NEW.status;
    END IF;
  END IF;
  
  -- FROM: confirmed
  IF OLD.status = 'confirmed' THEN
    IF NEW.status NOT IN ('scheduled', 'in_progress', 'cancelled_customer', 'cancelled_provider', 'provider_no_show', 'needs_reassignment') THEN
      RAISE EXCEPTION 'Invalid transition from confirmed to %. Allowed: scheduled, in_progress, cancelled_*, provider_no_show, needs_reassignment', NEW.status;
    END IF;
  END IF;
  
  -- FROM: scheduled
  IF OLD.status = 'scheduled' THEN
    IF NEW.status NOT IN ('in_progress', 'cancelled_customer', 'cancelled_provider', 'provider_no_show', 'needs_reassignment') THEN
      RAISE EXCEPTION 'Invalid transition from scheduled to %. Allowed: in_progress, cancelled_*, provider_no_show, needs_reassignment', NEW.status;
    END IF;
  END IF;
  
  -- FROM: in_progress
  IF OLD.status = 'in_progress' THEN
    IF NEW.status NOT IN ('completed', 'partially_completed', 'customer_no_show', 'cancelled_customer', 'cancelled_provider', 'disputed') THEN
      RAISE EXCEPTION 'Invalid transition from in_progress to %. Allowed: completed, partially_completed, customer_no_show, cancelled_*, disputed', NEW.status;
    END IF;
  END IF;
  
  -- FROM: completed
  IF OLD.status = 'completed' THEN
    IF NEW.status NOT IN ('customer_confirmed', 'disputed', 'payment_pending') THEN
      RAISE EXCEPTION 'Invalid transition from completed to %. Allowed: customer_confirmed, disputed, payment_pending', NEW.status;
    END IF;
  END IF;
  
  -- FROM: partially_completed
  IF OLD.status = 'partially_completed' THEN
    IF NEW.status NOT IN ('requires_followup', 'completed', 'disputed', 'cancelled_customer', 'cancelled_provider') THEN
      RAISE EXCEPTION 'Invalid transition from partially_completed to %. Allowed: requires_followup, completed, disputed, cancelled_*', NEW.status;
    END IF;
  END IF;
  
  -- FROM: requires_followup
  IF OLD.status = 'requires_followup' THEN
    IF NEW.status NOT IN ('scheduled', 'in_progress', 'cancelled_customer', 'cancelled_provider', 'abandoned') THEN
      RAISE EXCEPTION 'Invalid transition from requires_followup to %. Allowed: scheduled, in_progress, cancelled_*, abandoned', NEW.status;
    END IF;
  END IF;
  
  -- FROM: provider_no_show
  IF OLD.status = 'provider_no_show' THEN
    IF NEW.status NOT IN ('needs_reassignment', 'cancelled_customer', 'resolved') THEN
      RAISE EXCEPTION 'Invalid transition from provider_no_show to %. Allowed: needs_reassignment, cancelled_customer, resolved', NEW.status;
    END IF;
  END IF;
  
  -- FROM: customer_no_show
  IF OLD.status = 'customer_no_show' THEN
    IF NEW.status NOT IN ('cancelled_customer', 'resolved', 'scheduled') THEN
      RAISE EXCEPTION 'Invalid transition from customer_no_show to %. Allowed: cancelled_customer, resolved, scheduled (reschedule)', NEW.status;
    END IF;
  END IF;
  
  -- FROM: customer_confirmed
  IF OLD.status = 'customer_confirmed' THEN
    IF NEW.status NOT IN ('payment_pending', 'disputed', 'resolved') THEN
      RAISE EXCEPTION 'Invalid transition from customer_confirmed to %. Allowed: payment_pending, disputed, resolved', NEW.status;
    END IF;
  END IF;
  
  -- FROM: payment_pending
  IF OLD.status = 'payment_pending' THEN
    IF NEW.status NOT IN ('resolved', 'payment_failed', 'disputed') THEN
      RAISE EXCEPTION 'Invalid transition from payment_pending to %. Allowed: resolved, payment_failed, disputed', NEW.status;
    END IF;
  END IF;
  
  -- FROM: payment_failed
  IF OLD.status = 'payment_failed' THEN
    IF NEW.status NOT IN ('payment_pending', 'disputed', 'cancelled_customer') THEN
      RAISE EXCEPTION 'Invalid transition from payment_failed to %. Allowed: payment_pending (retry), disputed, cancelled_customer', NEW.status;
    END IF;
  END IF;
  
  -- FROM: disputed
  IF OLD.status = 'disputed' THEN
    IF NEW.status NOT IN ('resolved', 'rework_required', 'cancelled_customer', 'cancelled_provider', 'payment_pending') THEN
      RAISE EXCEPTION 'Invalid transition from disputed to %. Allowed: resolved, rework_required, cancelled_*, payment_pending', NEW.status;
    END IF;
  END IF;
  
  -- FROM: rework_required
  IF OLD.status = 'rework_required' THEN
    IF NEW.status NOT IN ('scheduled', 'in_progress', 'completed', 'cancelled_provider') THEN
      RAISE EXCEPTION 'Invalid transition from rework_required to %. Allowed: scheduled, in_progress, completed, cancelled_provider', NEW.status;
    END IF;
  END IF;
  
  -- If we got here, transition is valid
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_booking_status_transition() IS 
'Enforces valid booking status transitions. Terminal states cannot be modified. 
Prevents backward time travel, skip-ahead, and invalid state combinations.';

-- ============================================================================
-- TRIGGER: Enforce Status Transitions
-- ============================================================================

DROP TRIGGER IF EXISTS enforce_booking_status_transitions ON bookings;

CREATE TRIGGER enforce_booking_status_transitions
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION validate_booking_status_transition();

COMMENT ON TRIGGER enforce_booking_status_transitions ON bookings IS
'Validates status transitions before updates. Rejects invalid transitions with detailed error messages.';

-- ============================================================================
-- FUNCTION: Auto-track Status Changes in History
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO booking_status_history (
      booking_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role,
      reason,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(current_setting('app.current_user_role', true), 'system'),
      CASE
        WHEN NEW.status = 'abandoned' THEN NEW.abandonment_reason
        WHEN NEW.status = 'cancelled_customer' THEN NEW.cancellation_reason
        WHEN NEW.status = 'cancelled_provider' THEN NEW.cancellation_reason
        ELSE NULL
      END,
      CASE
        WHEN NEW.status = 'rework_required' THEN 'Quality issue requires rework'
        WHEN NEW.status = 'partially_completed' THEN format('Work %s%% complete', NEW.completion_percentage)
        WHEN NEW.status = 'requires_followup' THEN format('Followup scheduled for %s', NEW.followup_scheduled_at)
        ELSE NULL
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_log_booking_status_change() IS
'Automatically logs status changes to booking_status_history table. 
Uses app.current_user_id and app.current_user_role from session if available.';

-- ============================================================================
-- TRIGGER: Auto-log Status Changes
-- ============================================================================

DROP TRIGGER IF EXISTS auto_log_booking_status_change_trigger ON bookings;

CREATE TRIGGER auto_log_booking_status_change_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION auto_log_booking_status_change();

COMMENT ON TRIGGER auto_log_booking_status_change_trigger ON bookings IS
'Automatically creates audit trail entries in booking_status_history when status changes.';

-- ============================================================================
-- VALIDATION: Test Trigger Installation
-- ============================================================================

DO $$
BEGIN
  -- Verify trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'enforce_booking_status_transitions'
    AND tgrelid = 'bookings'::regclass
  ) THEN
    RAISE NOTICE '✅ State transition enforcement trigger installed successfully';
  ELSE
    RAISE WARNING '❌ State transition enforcement trigger NOT found';
  END IF;
  
  -- Verify auto-log trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'auto_log_booking_status_change_trigger'
    AND tgrelid = 'bookings'::regclass
  ) THEN
    RAISE NOTICE '✅ Auto-log status change trigger installed successfully';
  ELSE
    RAISE WARNING '❌ Auto-log status change trigger NOT found';
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

/*
TRANSITION VALIDATION RULES:

1. Terminal States (NO outbound transitions):
   - resolved
   - cancelled_customer
   - cancelled_provider
   - needs_reassignment
   - abandoned
   - quote_rejected

2. Quasi-Terminal States (Limited outbound):
   - provider_no_show → needs_reassignment, cancelled_customer, resolved
   - customer_no_show → cancelled_customer, resolved, scheduled

3. Backward Prevention:
   - Cannot go from completed → in_progress
   - Cannot go from customer_confirmed → completed
   - Cannot go from resolved → ANY

4. Skip Prevention:
   - Cannot go from draft → completed (must go through execution)
   - Cannot go from submitted → payment_pending (must do work first)

5. Invalid Combinations:
   - quote_rejected cannot → confirmed
   - provider_no_show cannot → in_progress
   - customer_no_show cannot → customer_confirmed

ERROR MESSAGES:
All rejections include:
- Clear explanation of invalid transition
- List of allowed next states
- Booking ID for debugging

AUDIT TRAIL:
- All status changes automatically logged to booking_status_history
- Includes user_id and role if set via session variables
- Captures reason/notes for abandonment, cancellation, rework

SESSION VARIABLES (for application to set):
- app.current_user_id (uuid)
- app.current_user_role (text: customer, provider, admin, system)

Example application usage:
```sql
-- Set context before update
SET LOCAL app.current_user_id = 'user-uuid-here';
SET LOCAL app.current_user_role = 'customer';

-- Update will be logged with this context
UPDATE bookings SET status = 'cancelled_customer', cancellation_reason = 'No longer needed'
WHERE id = 'booking-id';
```
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
