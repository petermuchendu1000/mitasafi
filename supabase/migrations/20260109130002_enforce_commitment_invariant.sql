-- =============================================================================
-- BLOCKER 3 FIX: Enforce status ↔ commitment bidirectional invariant
-- Date: 2026-01-09
-- Purpose: Prevent status='confirmed' without commitment
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md (Invariant 1, Known Limitation #4)
-- =============================================================================

-- Update state machine function to check commitment existence
CREATE OR REPLACE FUNCTION enforce_booking_state_machine()
RETURNS TRIGGER AS $$
DECLARE
  v_transition RECORD;
  v_commitment_exists BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Block any non-draft/submitted initial status
    IF NEW.status NOT IN ('draft', 'submitted') THEN
      RAISE EXCEPTION 'New bookings must start in draft or submitted (got: %)', NEW.status;
    END IF;
    -- Extra guard: confirmed must NEVER be initial state (even if commitment exists)
    IF NEW.status = 'confirmed' THEN
      RAISE EXCEPTION 'Bookings cannot be inserted directly as confirmed';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_transition
  FROM booking_state_transitions
  WHERE from_status = OLD.status AND to_status = NEW.status;

  IF NOT FOUND OR NOT v_transition.allowed THEN
    RAISE EXCEPTION 'Illegal transition: % → %', OLD.status, NEW.status
      USING HINT = 'Check booking_state_transitions table';
  END IF;

  IF v_transition.requires_provider AND NEW.provider_id IS NULL THEN
    RAISE EXCEPTION 'Status % requires provider', NEW.status;
  END IF;

  -- ✅ NEW: Enforce commitment existence for confirmed status
  -- Guard: Only enforce if booking_commitments table exists (migration ordering safety)
  IF NEW.status = 'confirmed' AND to_regclass('booking_commitments') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM booking_commitments WHERE booking_id = NEW.id
    ) INTO v_commitment_exists;
    
    IF NOT v_commitment_exists THEN
      RAISE EXCEPTION 'Cannot set status=confirmed without commitment (booking: %)', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_booking_state_machine IS
  'Enforces booking status state machine + commitment invariant (CRITICAL).
  
  BLOCKS:
    - Illegal status transitions (not in booking_state_transitions)
    - Transitions requiring provider when provider_id NULL
    - status → confirmed without booking_commitments row
  
  ALLOWS:
    - Legal transitions from booking_state_transitions
    - status → confirmed only if commitment exists
  
  CROSS-TABLE INVARIANTS (NOT ENFORCED HERE):
    The following MUST be enforced in create_commitment_and_confirm_booking():
      - booking_commitments.provider_id = bookings.provider_id
      - booking_commitments.service_id = bookings.service_id
      - booking_commitments.booking_id = bookings.id
    Schema alone cannot prevent mismatched inserts.
  
  WITHOUT THIS TRIGGER, THE ENTIRE COMMITMENT MODEL COLLAPSES.';

-- Prevent deletion of bookings with active commitments
CREATE OR REPLACE FUNCTION prevent_booking_deletion_with_commitments()
RETURNS TRIGGER AS $$
DECLARE
  v_has_commitment BOOLEAN;
BEGIN
  -- Only enforce if booking_commitments table exists
  IF to_regclass('booking_commitments') IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Check for any commitment (active or released)
  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM booking_commitments WHERE booking_id = $1)'
  ) INTO v_has_commitment USING OLD.id;
  
  IF v_has_commitment THEN
    RAISE EXCEPTION 'Cannot delete booking with commitment (booking: %)', OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_booking_deletion ON bookings;
CREATE TRIGGER prevent_booking_deletion
  BEFORE DELETE
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_booking_deletion_with_commitments();

COMMENT ON TRIGGER prevent_booking_deletion ON bookings IS
  'Prevents deletion of bookings with commitments (active or released).
  Enforces referential integrity for canonical commitment model.';

COMMENT ON FUNCTION prevent_booking_deletion_with_commitments IS
  'Blocks DELETE on bookings if any commitment exists.
  
  SAFETY:
    - Prevents orphaned commitments
    - Requires explicit release_commitment() before deletion
    - Catches seed rollback scripts, admin cleanup, test resets
    - Safe to run before booking_commitments table exists (uses to_regclass guard)
  
  PHILOSOPHY:
    Commitments are canonical. Once created, they define the economic truth.
    Deleting the booking without releasing commitment would corrupt capacity accounting.';

-- Explicitly wire trigger (don't assume prior state)
DROP TRIGGER IF EXISTS enforce_booking_state_machine ON bookings;
CREATE TRIGGER enforce_booking_state_machine
  BEFORE INSERT OR UPDATE OF status, provider_id
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_state_machine();
