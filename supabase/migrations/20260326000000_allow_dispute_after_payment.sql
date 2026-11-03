-- =============================================================================
-- C-3d: a paid customer must still be able to raise a dispute
-- =============================================================================
-- A successful payment sets the booking to 'resolved'. The only transition out
-- of 'resolved' in booking_state_transitions was resolved -> resolved, and
-- 'resolved' was also absent from the application's DISPUTABLE_STATUSES. So
-- the act of paying moved the booking into a state where the customer could
-- not raise a dispute at all -- and since no refund path exists either
-- (calculateRefund has no callers, refund_amount is never written), a paying
-- customer had no recourse of any kind.
--
-- This adds the one missing transition. Filing a dispute sets the booking to
-- 'disputed' (dispute/actions.ts:317), and disputed -> resolved already exists,
-- so the cycle closes correctly: a resolved booking can be disputed, and the
-- dispute can be resolved again.
--
-- The refund cap trigger from 20260320000000 bounds any refund recorded on that
-- dispute to the amount actually collected for the booking, so opening this
-- transition cannot be used to manufacture a refund larger than the payment.
-- =============================================================================

INSERT INTO public.booking_state_transitions
  (from_status, to_status, allowed, requires_provider, requires_payment, notes)
VALUES
  ('resolved', 'disputed', true, false, false,
   'C-3d: a paid customer may dispute after settlement; refund bounded by booking_disputes_refund_within_paid')
ON CONFLICT (from_status, to_status) DO UPDATE
  SET allowed = true,
      notes = excluded.notes;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.booking_state_transitions
     WHERE from_status = 'resolved' AND to_status = 'disputed' AND allowed
  ) THEN
    RAISE EXCEPTION 'FAILED: resolved -> disputed is still not allowed';
  END IF;

  -- The return path must already exist, or a dispute would be a dead end.
  IF NOT EXISTS (
    SELECT 1 FROM public.booking_state_transitions
     WHERE from_status = 'disputed' AND to_status = 'resolved' AND allowed
  ) THEN
    RAISE EXCEPTION 'FAILED: disputed -> resolved is missing, so a dispute could never be closed';
  END IF;

  -- The refund cap must be in place before we let paid bookings be disputed.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.booking_disputes'::regclass
       AND tgname = 'booking_disputes_refund_within_paid'
  ) THEN
    RAISE EXCEPTION 'FAILED: the dispute refund cap trigger is missing; do not open this transition without it';
  END IF;

  RAISE NOTICE 'C-3d: paid bookings are disputable, refunds bounded by the collected amount.';
END
$$;


-- -----------------------------------------------------------------------------
-- The transitions table alone was NOT sufficient
-- -----------------------------------------------------------------------------
-- booking_state_transitions is consulted by enforce_booking_state_machine, but
-- a SECOND trigger, validate_booking_status_transition, carries its own
-- hardcoded terminal-state list that includes 'resolved' and rejects any change
-- out of it before the table is ever consulted. Adding the table row above was
-- therefore necessary but not enough: verified behaviourally, a paid booking
-- still failed with "Cannot modify booking in terminal state: resolved".
--
-- Below is that function, replaced with ONE carve-out and nothing else changed.
-- Diffed against the live definition: exactly three lines differ, and they are
-- the RAISE being re-indented inside the new guard.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
    -- C-3d CARVE-OUT: a settled booking may still be DISPUTED.
    --
    -- A successful payment sets status='resolved', and 'resolved' was terminal
    -- here, so paying removed the customer's ability to raise a dispute at the
    -- exact moment they had most reason to. With no refund path implemented,
    -- that left a paying customer with no recourse of any kind.
    --
    -- Only this one edge is opened. Every other transition out of every
    -- terminal state stays blocked, and the return edge disputed -> resolved
    -- already exists. Any refund recorded on the resulting dispute is capped at
    -- the amount actually collected for the booking by the
    -- booking_disputes_refund_within_paid trigger (20260320000000), so this
    -- cannot be used to manufacture a refund larger than the payment.
    IF NOT (OLD.status = 'resolved' AND NEW.status = 'disputed') THEN
      RAISE EXCEPTION 'Cannot modify booking in terminal state: %. Booking ID: %, Old Status: %, New Status: %',
        OLD.status, OLD.id, OLD.status, NEW.status
        USING HINT = 'Terminal states cannot be changed. Contact admin if this is an error.';
    END IF;
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
$function$;

-- -----------------------------------------------------------------------------
-- Assertions for the carve-out
-- -----------------------------------------------------------------------------
DO $carve$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_booking_status_transition') THEN
    RAISE EXCEPTION 'FAILED: validate_booking_status_transition is missing';
  END IF;
  -- The carve-out must be present...
  IF position('OLD.status = ''resolved'' AND NEW.status = ''disputed'''
              in (SELECT prosrc FROM pg_proc WHERE proname = 'validate_booking_status_transition')) = 0 THEN
    RAISE EXCEPTION 'FAILED: the resolved -> disputed carve-out is not in the function body';
  END IF;
  -- ...and the terminal protection must still be there for everything else.
  IF position('Cannot modify booking in terminal state'
              in (SELECT prosrc FROM pg_proc WHERE proname = 'validate_booking_status_transition')) = 0 THEN
    RAISE EXCEPTION 'FAILED: terminal state protection was removed entirely';
  END IF;
  RAISE NOTICE 'C-3d carve-out applied; terminal protection intact for all other states.';
END
$carve$;

-- ROLLBACK:
--   DELETE FROM public.booking_state_transitions
--    WHERE from_status = 'resolved' AND to_status = 'disputed';
--   and restore validate_booking_status_transition without the carve-out
--   (its prior definition is reproducible from this file by deleting the
--   `IF NOT (OLD.status = 'resolved' AND NEW.status = 'disputed') THEN` guard
--   and un-indenting the RAISE it wraps).
