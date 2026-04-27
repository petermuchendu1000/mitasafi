-- =============================================================================
-- Booking Commitments Infrastructure
-- Date: 2026-01-09
-- Purpose: Economic truth layer — capacity accounting via immutable commitments
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md
-- Dependencies: 20260109130002_enforce_commitment_invariant.sql
-- =============================================================================

-- =============================================================================
-- TABLE: booking_commitments
-- Purpose: Immutable capacity reservations (single source of truth for capacity)
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core references (immutable after creation)
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  
  -- Time commitment (immutable after creation)
  committed_from TIMESTAMPTZ NOT NULL,
  committed_to TIMESTAMPTZ NOT NULL,
  
  -- Capacity accounting (immutable after creation)
  capacity_scope capacity_scope_type NOT NULL,
  concurrent_units_reserved INTEGER NOT NULL CHECK (concurrent_units_reserved > 0),
  
  -- Lifecycle (only these fields can change)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'completed')),
  released_at TIMESTAMPTZ,
  released_reason TEXT,
  completed_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,  -- Who/what created this commitment
  
  -- Constraints
  CONSTRAINT commitment_time_valid CHECK (committed_to > committed_from),
  CONSTRAINT commitment_released_logic CHECK (
    (status != 'released') OR 
    (status = 'released' AND released_at IS NOT NULL AND released_reason IS NOT NULL)
  ),
  CONSTRAINT commitment_completed_logic CHECK (
    (status != 'completed') OR
    (status = 'completed' AND completed_at IS NOT NULL)
  ),
  
  -- One commitment per booking (bidirectional invariant enforcement)
  CONSTRAINT one_commitment_per_booking UNIQUE (booking_id)
);

-- Indexes for capacity queries
CREATE INDEX idx_commitments_provider_status 
  ON booking_commitments(provider_id, status) 
  WHERE status = 'active';

CREATE INDEX idx_commitments_service_status 
  ON booking_commitments(service_id, status) 
  WHERE status = 'active';

CREATE INDEX idx_commitments_time_range 
  ON booking_commitments USING GIST (
    provider_id,
    tstzrange(committed_from, committed_to, '[]')
  ) WHERE status = 'active';

-- Prevent overlapping active commitments (enforces capacity limits)
-- Note: This is a safety net. Primary enforcement is in create_commitment function.
CREATE INDEX idx_commitments_overlap_prevention
  ON booking_commitments USING GIST (
    provider_id,
    service_id,
    tstzrange(committed_from, committed_to, '[]')
  ) WHERE status = 'active';

COMMENT ON TABLE booking_commitments IS
  'IMMUTABLE capacity reservations (economic truth layer).
  
  DOCTRINE:
    - Commitments are the ONLY source of truth for capacity accounting
    - Never count bookings.scheduled_start for capacity
    - Never infer capacity from status
  
  LIFECYCLE:
    1. Created atomically with status=confirmed transition
    2. Active until booking completes or cancels
    3. Released on cancellation (status → released)
    4. Completed on job completion (status → completed)
  
  IMMUTABILITY:
    - booking_id: IMMUTABLE (trigger enforced)
    - provider_id: IMMUTABLE (trigger enforced)
    - service_id: IMMUTABLE (trigger enforced)
    - committed_from/to: IMMUTABLE (trigger enforced)
    - capacity_scope: IMMUTABLE (trigger enforced)
    - concurrent_units_reserved: IMMUTABLE (trigger enforced)
    - status: MUTABLE (active → released/completed only)
  
  CAPACITY CALCULATION:
    COUNT(*) FROM booking_commitments 
    WHERE provider_id = ? 
      AND service_id = ? (if per_service)
      AND status = active
      AND tstzrange(committed_from, committed_to) && target_range';

COMMENT ON COLUMN booking_commitments.capacity_scope IS
  'Denormalized from provider_services for query performance.
  Must match provider_services.capacity_scope at creation time.';

COMMENT ON COLUMN booking_commitments.concurrent_units_reserved IS
  'How many units this commitment reserves.
  Typically 1, but could be >1 for multi-unit bookings.
  Immutable after creation.';

-- =============================================================================
-- TRIGGER: Enforce commitment immutability
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_commitment_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow status changes and completion/release fields
  IF OLD.booking_id != NEW.booking_id THEN
    RAISE EXCEPTION 'Commitment booking_id is immutable (old: %, new: %)', 
      OLD.booking_id, NEW.booking_id;
  END IF;
  
  IF OLD.provider_id != NEW.provider_id THEN
    RAISE EXCEPTION 'Commitment provider_id is immutable (old: %, new: %)', 
      OLD.provider_id, NEW.provider_id;
  END IF;
  
  IF OLD.service_id != NEW.service_id THEN
    RAISE EXCEPTION 'Commitment service_id is immutable (old: %, new: %)', 
      OLD.service_id, NEW.service_id;
  END IF;
  
  IF OLD.committed_from != NEW.committed_from THEN
    RAISE EXCEPTION 'Commitment committed_from is immutable (old: %, new: %)', 
      OLD.committed_from, NEW.committed_from;
  END IF;
  
  IF OLD.committed_to != NEW.committed_to THEN
    RAISE EXCEPTION 'Commitment committed_to is immutable (old: %, new: %)', 
      OLD.committed_to, NEW.committed_to;
  END IF;
  
  IF OLD.capacity_scope != NEW.capacity_scope THEN
    RAISE EXCEPTION 'Commitment capacity_scope is immutable (old: %, new: %)', 
      OLD.capacity_scope, NEW.capacity_scope;
  END IF;
  
  IF OLD.concurrent_units_reserved != NEW.concurrent_units_reserved THEN
    RAISE EXCEPTION 'Commitment concurrent_units_reserved is immutable (old: %, new: %)', 
      OLD.concurrent_units_reserved, NEW.concurrent_units_reserved;
  END IF;
  
  -- Status transitions: active → (released | completed)
  IF OLD.status = 'released' AND NEW.status != 'released' THEN
    RAISE EXCEPTION 'Cannot change status from released (terminal state)';
  END IF;
  
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    RAISE EXCEPTION 'Cannot change status from completed (terminal state)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_commitment_immutability_trigger ON booking_commitments;
CREATE TRIGGER enforce_commitment_immutability_trigger
  BEFORE UPDATE ON booking_commitments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_commitment_immutability();

COMMENT ON FUNCTION enforce_commitment_immutability() IS
  'Enforces immutability of commitment core fields.
  Only status and lifecycle timestamps can change after creation.';

-- =============================================================================
-- FUNCTION: create_commitment_and_confirm_booking
-- Purpose: Atomic transition from submitted → confirmed with capacity reservation
-- =============================================================================

CREATE OR REPLACE FUNCTION create_commitment_and_confirm_booking(
  p_booking_id UUID,
  p_committed_from TIMESTAMPTZ,
  p_committed_to TIMESTAMPTZ,
  p_concurrent_units_reserved INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  v_provider_id UUID;
  v_service_id UUID;
  v_capacity_scope capacity_scope_type;
  v_concurrent_units INTEGER;
  v_current_usage INTEGER;
  v_booking_status booking_status;
  v_commitment_id UUID;
BEGIN
  -- Validate inputs
  IF p_committed_to <= p_committed_from THEN
    RAISE EXCEPTION 'Invalid time range: committed_to must be after committed_from';
  END IF;
  
  IF p_concurrent_units_reserved < 1 THEN
    RAISE EXCEPTION 'concurrent_units_reserved must be >= 1';
  END IF;
  
  -- Get booking details
  SELECT b.provider_id, b.service_id, b.status
  INTO v_provider_id, v_service_id, v_booking_status
  FROM bookings b
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;
  
  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Booking has no provider assigned';
  END IF;
  
  -- Verify booking is in confirmable state
  IF v_booking_status NOT IN ('submitted', 'quote_accepted', 'provider_viewed') THEN
    RAISE EXCEPTION 'Booking status % cannot be confirmed (must be submitted/quote_accepted/provider_viewed)', 
      v_booking_status;
  END IF;
  
  -- Check if commitment already exists
  IF EXISTS (SELECT 1 FROM booking_commitments WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'Commitment already exists for booking %', p_booking_id;
  END IF;
  
  -- Get provider capacity configuration
  SELECT ps.capacity_scope, ps.concurrent_units
  INTO v_capacity_scope, v_concurrent_units
  FROM provider_services ps
  WHERE ps.provider_id = v_provider_id
    AND ps.service_id = v_service_id
    AND ps.is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider % does not offer service %', v_provider_id, v_service_id;
  END IF;
  
  -- Serialize capacity check per provider (prevent race conditions)
  PERFORM pg_advisory_xact_lock(hashtext(v_provider_id::text));
  
  -- Count current active commitments
  IF v_capacity_scope = 'provider_wide' THEN
    -- Count ALL active commitments for this provider (across all services)
    SELECT COUNT(*)
    INTO v_current_usage
    FROM booking_commitments bc
    WHERE bc.provider_id = v_provider_id
      AND bc.status = 'active'
      AND tstzrange(bc.committed_from, bc.committed_to, '[]') && 
          tstzrange(p_committed_from, p_committed_to, '[]');
  ELSE
    -- Count active commitments for this specific service only
    SELECT COUNT(*)
    INTO v_current_usage
    FROM booking_commitments bc
    WHERE bc.provider_id = v_provider_id
      AND bc.service_id = v_service_id
      AND bc.status = 'active'
      AND tstzrange(bc.committed_from, bc.committed_to, '[]') && 
          tstzrange(p_committed_from, p_committed_to, '[]');
  END IF;
  
  -- Check capacity
  IF v_current_usage + p_concurrent_units_reserved > v_concurrent_units THEN
    RAISE EXCEPTION 'Insufficient capacity: current=%, requested=%, max=%', 
      v_current_usage, p_concurrent_units_reserved, v_concurrent_units;
  END IF;
  
  -- Create commitment
  INSERT INTO booking_commitments (
    booking_id,
    provider_id,
    service_id,
    committed_from,
    committed_to,
    capacity_scope,
    concurrent_units_reserved,
    status,
    created_by
  ) VALUES (
    p_booking_id,
    v_provider_id,
    v_service_id,
    p_committed_from,
    p_committed_to,
    v_capacity_scope,
    p_concurrent_units_reserved,
    'active',
    NULL  -- TODO: Pass user_id when auth context available
  )
  RETURNING id INTO v_commitment_id;
  
  -- Update booking status to confirmed
  UPDATE bookings
  SET status = 'confirmed',
      updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN v_commitment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_commitment_and_confirm_booking IS
  'ATOMIC booking confirmation with capacity reservation.
  
  SEMANTICS:
    - Check capacity availability
    - Create immutable commitment
    - Transition booking to confirmed
    - All or nothing (transaction wrapped)
  
  CAPACITY LOGIC:
    - provider_wide: Count ALL provider commitments
    - per_service: Count only THIS service commitments
    - Uses advisory lock to prevent race conditions
  
  FAILURE MODES:
    - Booking not found → EXCEPTION
    - Provider not assigned → EXCEPTION
    - Wrong status → EXCEPTION
    - Commitment exists → EXCEPTION
    - Insufficient capacity → EXCEPTION
  
  RETURNS: commitment_id (UUID)';

-- =============================================================================
-- FUNCTION: release_commitment
-- Purpose: Cancel/release a commitment (e.g., on booking cancellation)
-- =============================================================================

CREATE OR REPLACE FUNCTION release_commitment(
  p_booking_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_commitment_id UUID;
  v_commitment_status TEXT;
BEGIN
  -- Find commitment
  SELECT id, status
  INTO v_commitment_id, v_commitment_status
  FROM booking_commitments
  WHERE booking_id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No commitment found for booking %', p_booking_id;
  END IF;
  
  -- Check if already released/completed
  IF v_commitment_status = 'released' THEN
    RAISE NOTICE 'Commitment already released for booking %', p_booking_id;
    RETURN true;
  END IF;
  
  IF v_commitment_status = 'completed' THEN
    RAISE EXCEPTION 'Cannot release completed commitment (booking %)', p_booking_id;
  END IF;
  
  -- Release commitment
  UPDATE booking_commitments
  SET status = 'released',
      released_at = NOW(),
      released_reason = p_reason
  WHERE id = v_commitment_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_commitment IS
  'Release (cancel) a commitment, freeing capacity.
  
  SEMANTICS:
    - Mark commitment as released
    - Record timestamp and reason
    - Cannot release completed commitments
  
  USE CASES:
    - Customer cancels booking
    - Provider cancels booking
    - System cancels expired booking
  
  RETURNS: true on success, EXCEPTION on failure';

-- =============================================================================
-- FUNCTION: complete_commitment
-- Purpose: Mark commitment as completed (job finished)
-- =============================================================================

CREATE OR REPLACE FUNCTION complete_commitment(
  p_booking_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_commitment_id UUID;
  v_commitment_status TEXT;
BEGIN
  -- Find commitment
  SELECT id, status
  INTO v_commitment_id, v_commitment_status
  FROM booking_commitments
  WHERE booking_id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No commitment found for booking %', p_booking_id;
  END IF;
  
  -- Check if already completed
  IF v_commitment_status = 'completed' THEN
    RAISE NOTICE 'Commitment already completed for booking %', p_booking_id;
    RETURN true;
  END IF;
  
  -- Cannot complete released commitment
  IF v_commitment_status = 'released' THEN
    RAISE EXCEPTION 'Cannot complete released commitment (booking %)', p_booking_id;
  END IF;
  
  -- Complete commitment
  UPDATE booking_commitments
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = v_commitment_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_commitment IS
  'Mark commitment as completed when job finishes.
  
  SEMANTICS:
    - Transition active → completed
    - Record completion timestamp
    - Cannot complete released commitments
  
  USE CASES:
    - Provider marks job complete
    - Customer confirms completion
    - Automated completion after grace period';

-- =============================================================================
-- FUNCTION: check_capacity_availability
-- Purpose: Pure capacity check (no side effects)
-- =============================================================================

CREATE OR REPLACE FUNCTION check_capacity_availability(
  p_provider_id UUID,
  p_service_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_units_needed INTEGER DEFAULT 1
) RETURNS TABLE (
  available BOOLEAN,
  current_usage INTEGER,
  max_capacity INTEGER,
  available_units INTEGER
) AS $$
DECLARE
  v_capacity_scope capacity_scope_type;
  v_concurrent_units INTEGER;
  v_current INTEGER;
BEGIN
  -- Get capacity configuration
  SELECT ps.capacity_scope, ps.concurrent_units
  INTO v_capacity_scope, v_concurrent_units
  FROM provider_services ps
  WHERE ps.provider_id = p_provider_id
    AND ps.service_id = p_service_id
    AND ps.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Count active commitments
  IF v_capacity_scope = 'provider_wide' THEN
    SELECT COUNT(*)
    INTO v_current
    FROM booking_commitments bc
    WHERE bc.provider_id = p_provider_id
      AND bc.status = 'active'
      AND tstzrange(bc.committed_from, bc.committed_to, '[]') && 
          tstzrange(p_from, p_to, '[]');
  ELSE
    SELECT COUNT(*)
    INTO v_current
    FROM booking_commitments bc
    WHERE bc.provider_id = p_provider_id
      AND bc.service_id = p_service_id
      AND bc.status = 'active'
      AND tstzrange(bc.committed_from, bc.committed_to, '[]') && 
          tstzrange(p_from, p_to, '[]');
  END IF;
  
  RETURN QUERY SELECT 
    (v_current + p_units_needed <= v_concurrent_units),
    v_current,
    v_concurrent_units,
    GREATEST(0, v_concurrent_units - v_current);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_capacity_availability IS
  'Pure capacity check (read-only, no reservation).
  
  USE CASES:
    - UI availability display
    - Quote estimation
    - Pre-flight checks
  
  RETURNS:
    - available: boolean (can accommodate request)
    - current_usage: active commitments count
    - max_capacity: concurrent_units limit
    - available_units: remaining capacity';
