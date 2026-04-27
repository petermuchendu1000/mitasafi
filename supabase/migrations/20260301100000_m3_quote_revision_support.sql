-- Migration: M3 — Quote Revision Support
-- Purpose: Enable quote revision flow (quote_rejected → quote_pending → quote_sent)
-- Dependencies: 20260109120003_booking_status_transition_enforcement.sql
--
-- Changes:
-- 1. Remove quote_rejected from terminal states (allow revisions)
-- 2. Add quote_rejected transition rules
-- 3. Add revision_count to booking_quotes
-- 4. Add superseded_at to booking_quotes (for history tracking)

-- ============================================================================
-- 1. ADD REVISION TRACKING COLUMNS TO booking_quotes
-- ============================================================================

ALTER TABLE booking_quotes
  ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

COMMENT ON COLUMN booking_quotes.revision_count IS
  'How many times this quote has been revised. 0 = original.';
COMMENT ON COLUMN booking_quotes.superseded_at IS
  'Set when a revised quote replaces this one. NULL = current active quote.';

-- ============================================================================
-- 2. UPDATE STATUS TRANSITION ENFORCEMENT
--    Remove quote_rejected from terminal states.
--    Add outbound transitions: quote_rejected → quote_pending, cancelled_customer,
--    cancelled_provider, abandoned.
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same-state updates (updating other fields)
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- ========================================================================
  -- TERMINAL STATE PROTECTION
  -- quote_rejected is NO LONGER terminal (supports revision flow)
  -- ========================================================================
  IF OLD.status IN (
    'resolved',
    'cancelled_customer',
    'cancelled_provider',
    'needs_reassignment',
    'abandoned'
  ) THEN
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

  -- FROM: quote_rejected (REVISED — no longer terminal)
  -- Provider can revise (→ quote_pending), or either party can cancel
  IF OLD.status = 'quote_rejected' THEN
    IF NEW.status NOT IN ('quote_pending', 'cancelled_customer', 'cancelled_provider', 'abandoned') THEN
      RAISE EXCEPTION 'Invalid transition from quote_rejected to %. Allowed: quote_pending (revision), cancelled_customer, cancelled_provider, abandoned', NEW.status;
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

-- ============================================================================
-- 3. UPDATE AUTO-LOG FUNCTION (add quote revision note)
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
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
      COALESCE(
        NULLIF(current_setting('app.current_user_id', true), '')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
      ),
      COALESCE(
        NULLIF(current_setting('app.current_user_role', true), ''),
        'system'
      ),
      CASE
        WHEN NEW.status = 'abandoned' THEN NEW.abandonment_reason
        WHEN NEW.status IN ('cancelled_customer', 'cancelled_provider') THEN NEW.cancellation_reason
        WHEN NEW.status = 'quote_pending' AND OLD.status = 'quote_rejected' THEN 'Provider revising quote'
        ELSE NULL
      END,
      CASE
        WHEN NEW.status = 'rework_required' THEN 'Quality issue requires rework'
        WHEN NEW.status = 'partially_completed' THEN format('Work %s%% complete', NEW.completion_percentage)
        WHEN NEW.status = 'requires_followup' THEN format('Followup scheduled for %s', NEW.followup_scheduled_at)
        WHEN NEW.status = 'quote_sent' AND OLD.status = 'quote_pending' THEN 'Quote sent to customer'
        WHEN NEW.status = 'quote_accepted' THEN format('Quote accepted — KES %s', NEW.quoted_price)
        WHEN NEW.status = 'quote_rejected' THEN 'Customer rejected the quote'
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. INDEXES FOR QUOTE QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_booking_quotes_booking_active
  ON booking_quotes (booking_id)
  WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_provider_quote_status
  ON bookings (provider_id, status)
  WHERE status IN ('quote_pending', 'quote_sent', 'quote_accepted', 'quote_rejected');

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  -- Verify columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_quotes' AND column_name = 'revision_count'
  ) THEN
    RAISE NOTICE '✅ booking_quotes.revision_count column exists';
  ELSE
    RAISE WARNING '❌ booking_quotes.revision_count column NOT found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_quotes' AND column_name = 'superseded_at'
  ) THEN
    RAISE NOTICE '✅ booking_quotes.superseded_at column exists';
  ELSE
    RAISE WARNING '❌ booking_quotes.superseded_at column NOT found';
  END IF;

  RAISE NOTICE '✅ M3 quote revision migration complete';
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
