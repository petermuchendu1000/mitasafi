-- =============================================================================
-- needs_reassignment was listed as a terminal state
-- =============================================================================
-- The SEVENTH defect in the capacity chain, and the one that made the fix for
-- the second defect useless.
--
-- 20260331000000 added outbound transitions so a capacity-flagged booking could
-- be returned to the pool, reassigned or cancelled. Those rows had NO effect:
-- validate_booking_status_transition carries its own hardcoded terminal-state
-- list, it runs before booking_state_transitions is consulted, and
-- needs_reassignment was in it. Verified behaviourally -- the escape attempt
-- failed with "Cannot modify booking in terminal state: needs_reassignment".
-- Exactly the shape of the 'resolved' problem fixed for disputes in 22ca47e:
-- a table-driven state machine shadowed by a hardcoded list elsewhere.
--
-- It was never terminal by design. prevent_execution_if_needs_reassignment
-- exists to block EXECUTION from this state and its hint reads "Booking must be
-- reassigned or cancelled first" -- a needs-action state. So this removes it
-- from the list rather than carving out an exception, and execution stays
-- blocked by that other trigger.
--
-- Diffed against the live definition: exactly one line removed.
-- Rollback: restore 'needs_reassignment' to the list (re-strands every flagged
-- booking).
-- =============================================================================

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
  -- needs_reassignment REMOVED from this list. It was never a terminal state:
  -- prevent_execution_if_needs_reassignment's own hint says the booking "must
  -- be reassigned or cancelled first", which is a needs-action state by
  -- definition. Listing it here made every capacity-flagged booking
  -- permanently stuck. Its outbound edges are governed by
  -- booking_state_transitions like any other non-terminal status.
  IF OLD.status IN (
    'resolved',
    'cancelled_customer',
    'cancelled_provider',
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
-- Make the two state machines agree
-- -----------------------------------------------------------------------------
-- validate_booking_status_transition ALREADY allows submitted, confirmed,
-- scheduled and provider_no_show -> needs_reassignment (see the branches
-- above). booking_state_transitions, which enforce_booking_state_machine
-- consults, has no such rows -- so a caller making one of those transitions is
-- permitted by one state machine and rejected by the other. Adding the rows
-- makes the table match the validator's stated intent.
--
-- This does not affect the capacity trigger, which fires after both and whose
-- system-assigned flag neither validates. It fixes the caller-facing
-- inconsistency only.
INSERT INTO public.booking_state_transitions
  (from_status, to_status, allowed, requires_provider, requires_payment, notes)
VALUES
  ('submitted',        'needs_reassignment', true, false, false, 'Matches validate_booking_status_transition'),
  ('confirmed',        'needs_reassignment', true, false, false, 'Matches validate_booking_status_transition'),
  ('scheduled',        'needs_reassignment', true, false, false, 'Matches validate_booking_status_transition'),
  ('provider_no_show', 'needs_reassignment', true, false, false, 'Matches validate_booking_status_transition')
ON CONFLICT (from_status, to_status) DO UPDATE
  SET allowed = true, notes = excluded.notes;

-- Assertions. The terminal list is extracted and checked SPECIFICALLY, because
-- needs_reassignment legitimately appears elsewhere in this function: the
-- validator lists it as an allowed TARGET from four statuses. An earlier
-- version of this assertion searched the whole body and failed on exactly
-- that -- correctly, since it was testing the wrong thing.
DO $assert$
DECLARE
  v_code     text;
  v_terminal text;
BEGIN
  SELECT regexp_replace(prosrc, '--[^' || chr(10) || ']*', '', 'g')
    INTO v_code FROM pg_proc WHERE proname = 'validate_booking_status_transition';

  v_terminal := substring(v_code from 'IF OLD\.status IN \(([^)]*)\)');
  IF v_terminal IS NULL THEN
    RAISE EXCEPTION 'FAILED: could not locate the terminal-state list to check it';
  END IF;

  IF position('needs_reassignment' in v_terminal) <> 0 THEN
    RAISE EXCEPTION 'FAILED: needs_reassignment is still in the terminal-state list';
  END IF;

  -- The genuinely terminal states must STILL be terminal.
  IF position('resolved' in v_terminal) = 0
     OR position('abandoned' in v_terminal) = 0
     OR position('cancelled_customer' in v_terminal) = 0 THEN
    RAISE EXCEPTION 'OVERREACH: terminal protection weakened beyond needs_reassignment (list is: %)', v_terminal;
  END IF;

  -- It must still be reachable as a target in the validator.
  IF position('needs_reassignment' in v_code) = 0 THEN
    RAISE EXCEPTION 'OVERREACH: needs_reassignment was removed from the validator entirely';
  END IF;

  -- Escapes must exist, or removing it from the list achieves nothing.
  IF (SELECT count(*) FROM booking_state_transitions
       WHERE from_status = 'needs_reassignment' AND allowed) < 4 THEN
    RAISE EXCEPTION 'FAILED: no outbound transitions';
  END IF;

  -- And the two state machines must now agree on the inbound edges.
  IF (SELECT count(*) FROM booking_state_transitions
       WHERE to_status = 'needs_reassignment' AND allowed) < 4 THEN
    RAISE EXCEPTION 'FAILED: the transition table still disagrees with the validator';
  END IF;

  RAISE NOTICE 'needs_reassignment is reachable, escapable, and no longer terminal.';
END
$assert$;
