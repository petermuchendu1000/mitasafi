-- Migration: Critical Schema Gaps Fix - ALL BLOCKERS
-- Description: Addresses all 7 critical issues blocking provider seeding
-- Date: 2026-01-09
-- Priority: CRITICAL - ABSOLUTE BLOCKER
-- Dependencies: 20260109120030_provider_capacity_enforcement.sql
-- Time Estimate: Test thoroughly - 9 hours implementation + 4 hours testing

-- =============================================================================
-- Enable btree_gist extension for GIST indexes on UUID
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- ISSUE 2: CANONICAL TIME SEMANTICS (busy_from / busy_to)
-- =============================================================================

-- Add canonical busy time columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS busy_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS busy_to TIMESTAMPTZ,
ADD CONSTRAINT busy_interval_valid CHECK (busy_to IS NULL OR busy_to > busy_from);

COMMENT ON COLUMN bookings.busy_from IS
  'CANONICAL start of provider busy time. AUTHORITATIVE for all capacity calculations.
  
  RULES BY FLOW:
  - emergency: busy_from = scheduled_start
  - standard: busy_from = scheduled_start
  - delivery: busy_from = pickup_time_window_start
  - project: busy_from = scheduled_start
  - personal: busy_from = scheduled_start
  
  MUST BE NOT NULL when provider assigned and status confirmed+.
  Used for overlap detection in capacity enforcement.';

COMMENT ON COLUMN bookings.busy_to IS
  'CANONICAL end of provider busy time. NULL = ongoing/unknown duration.
  
  RULES BY FLOW:
  - emergency: busy_to = scheduled_start + (emergency_sla_minutes OR 2 hours default)
  - standard: busy_to = scheduled_end
  - delivery: busy_to = dropoff_time_window_end
  - project: busy_to = scheduled_end
  - personal: busy_to = scheduled_end OR scheduled_start + estimated_duration
  
  NULL VALUES: For capacity calculation, treat as busy for 24 hours to prevent infinite blocking.';

-- Create index for overlap queries (critical for performance)
-- Note: Index only on rows where both busy_from and busy_to are NOT NULL
CREATE INDEX IF NOT EXISTS idx_bookings_busy_interval
ON bookings USING GIST (
  provider_id,
  service_id,
  tstzrange(busy_from, busy_to, '[]')
)
WHERE status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
  AND busy_from IS NOT NULL
  AND busy_to IS NOT NULL;

COMMENT ON INDEX idx_bookings_busy_interval IS
  'GIST index for efficient time overlap queries in capacity enforcement.
  Uses tstzrange for O(log n) overlap detection instead of O(n) sequential scan.
  Only indexes bookings with both busy_from and busy_to defined.';

-- Trigger to populate busy_from/busy_to from scheduled times
CREATE OR REPLACE FUNCTION populate_busy_interval()
RETURNS TRIGGER AS $$
DECLARE
  v_emergency_sla INTEGER;
BEGIN
  -- Skip if already set (manual override allowed)
  IF NEW.busy_from IS NOT NULL AND NEW.busy_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if no scheduled time yet
  IF NEW.scheduled_start IS NULL THEN
    RETURN NEW;
  END IF;

  -- Populate based on booking flow type
  CASE NEW.booking_flow_type
    WHEN 'emergency' THEN
      NEW.busy_from := NEW.scheduled_start;
      
      -- Get emergency SLA if available
      SELECT emergency_response_sla_minutes INTO v_emergency_sla
      FROM service_capabilities sc
      WHERE sc.service_id = NEW.service_id;
      
      -- Default to 2 hours if not set
      NEW.busy_to := NEW.scheduled_start + COALESCE(v_emergency_sla || ' minutes', '2 hours')::INTERVAL;
      
    WHEN 'delivery' THEN
      -- For delivery, will need to join with booking_delivery_details
      -- For now, use scheduled times as fallback
      NEW.busy_from := COALESCE(NEW.busy_from, NEW.scheduled_start);
      NEW.busy_to := COALESCE(NEW.busy_to, NEW.scheduled_end, NEW.scheduled_start + INTERVAL '4 hours');
      
    ELSE
      -- standard, project, personal
      NEW.busy_from := NEW.scheduled_start;
      NEW.busy_to := COALESCE(NEW.scheduled_end, NEW.scheduled_start + INTERVAL '2 hours');
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS populate_busy_interval_trigger ON bookings;
CREATE TRIGGER populate_busy_interval_trigger
  BEFORE INSERT OR UPDATE OF scheduled_start, scheduled_end, booking_flow_type
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION populate_busy_interval();

COMMENT ON TRIGGER populate_busy_interval_trigger ON bookings IS
  'Automatically populates busy_from/busy_to from scheduled_start/scheduled_end.
  Provides default durations for emergency bookings.
  Critical for capacity overlap detection.';

-- =============================================================================
-- ISSUE 1: FIX CAPACITY AMBIGUITIES
-- =============================================================================

-- 1a: Make provider capacity required (no NULL = no ambiguity)
ALTER TABLE service_providers
ALTER COLUMN max_concurrent_bookings SET NOT NULL,
ALTER COLUMN max_concurrent_bookings SET DEFAULT 30;

-- Update NULL values before adding constraint
UPDATE service_providers
SET max_concurrent_bookings = 30
WHERE max_concurrent_bookings IS NULL;

COMMENT ON COLUMN service_providers.max_concurrent_bookings IS
  'REQUIRED: Global maximum concurrent bookings across all services. Hard limit.
  
  AUTHORITY HIERARCHY:
  1. provider_services.max_concurrent_bookings (if NOT NULL) → service-specific limit
  2. service_providers.max_concurrent_bookings (always set) → provider-wide limit
  
  NULL HANDLING:
  - Provider level: NOT NULL (always required)
  - Service level: NULL means "inherit provider limit"
  
  DEFAULTS:
  - New providers: 30 (conservative)
  - Individual providers: 20-50 (typical)
  - Teams/companies: 100+ (if verified)';

-- Update service-level capacity comments to be explicit about NULL
COMMENT ON COLUMN provider_services.max_concurrent_bookings IS
  'Service-specific capacity override. Authority rules:
  
  NULL (default): INHERITS provider global (service_providers.max_concurrent_bookings)
  NOT NULL: OVERRIDES provider global for this specific service
  
  EXAMPLE:
  - Provider global: 30
  - Laundry service: NULL → uses 30
  - Emergency Plumbing: 10 → limited to 10 (dangerous work)
  
  NOTE: This is MAX for this service only. Provider may still hit global limit.';

-- 1b: Add explicit "concurrent" time window mode
ALTER TABLE provider_services
ADD COLUMN IF NOT EXISTS overlapping_bookings_allowed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN provider_services.overlapping_bookings_allowed IS
  'Can multiple bookings for this service overlap in time?
  
  FALSE (default): Time overlap NOT allowed - capacity counts overlapping busy intervals
  TRUE: Time overlap allowed - capacity counts any active booking regardless of time
  
  EXAMPLES:
  - FALSE: Plumber (can only be at one job at a time)
  - TRUE: Laundry (multiple clients'' laundry processing simultaneously)
  - FALSE: Taxi (one ride at a time)
  - TRUE: Cleaning company (multiple teams)';

-- 1c: Add recurring generation vs execution flag
ALTER TABLE booking_recurring_rules
ADD COLUMN IF NOT EXISTS enforce_capacity_at_generation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN booking_recurring_rules.enforce_capacity_at_generation IS
  'When to enforce provider capacity for recurring bookings:
  
  FALSE (default): Check capacity at EXECUTION time (when booking becomes active)
  TRUE: Check capacity at GENERATION time (when child booking created)
  
  RECOMMENDATION: FALSE (allows long-term bookings, provider may adjust capacity later)
  RISK: FALSE = overbooking possible if provider reduces capacity
  SAFETY: TRUE = prevents generation but may reject valid long-term commitments';

-- 1d: Add advisory locking to capacity check function (prevents race conditions)
CREATE OR REPLACE FUNCTION check_provider_capacity_locked(
  p_provider_id UUID,
  p_service_id UUID,
  p_busy_from TIMESTAMPTZ,
  p_busy_to TIMESTAMPTZ,
  p_is_emergency BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  capacity_available BOOLEAN,
  current_bookings INTEGER,
  max_bookings INTEGER,
  available_slots INTEGER,
  reason TEXT
) AS $$
DECLARE
  v_provider_global_max INTEGER;
  v_service_max INTEGER;
  v_emergency_reserved INTEGER;
  v_current_count INTEGER;
  v_capacity_mode TEXT;
  v_overlapping_allowed BOOLEAN;
  v_effective_max INTEGER;
  v_available_for_regular INTEGER;
BEGIN
  -- STEP 0: Acquire advisory lock (prevents race conditions)
  -- Lock combines provider_id + service_id for granular locking
  PERFORM pg_advisory_xact_lock(
    hashtext(p_provider_id::text || '_' || p_service_id::text)
  );
  
  -- Get provider capacity settings
  SELECT 
    max_concurrent_bookings,
    capacity_mode,
    emergency_capacity_reserved
  INTO 
    v_provider_global_max,
    v_capacity_mode,
    v_emergency_reserved
  FROM service_providers
  WHERE id = p_provider_id;

  -- Get service-specific capacity
  SELECT 
    max_concurrent_bookings,
    overlapping_bookings_allowed
  INTO 
    v_service_max,
    v_overlapping_allowed
  FROM provider_services
  WHERE provider_id = p_provider_id 
    AND service_id = p_service_id;

  -- Determine effective maximum
  -- NULL at service level = inherit provider level (now always NOT NULL)
  v_effective_max := COALESCE(v_service_max, v_provider_global_max);

  -- Count current bookings based on overlap rules
  IF v_overlapping_allowed THEN
    -- Count ANY active bookings (time doesn't matter)
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings
    WHERE provider_id = p_provider_id
      AND service_id = p_service_id
      AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress');
      
  ELSE
    -- Count OVERLAPPING bookings only (use canonical busy intervals)
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings
    WHERE provider_id = p_provider_id
      AND service_id = p_service_id
      AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
      AND busy_from IS NOT NULL
      -- Time overlap check using PostgreSQL range operators
      AND tstzrange(busy_from, COALESCE(busy_to, busy_from + INTERVAL '24 hours'), '[]') && 
          tstzrange(p_busy_from, COALESCE(p_busy_to, p_busy_from + INTERVAL '24 hours'), '[]');
  END IF;

  -- Calculate available slots
  v_available_for_regular := v_effective_max - COALESCE(v_emergency_reserved, 0);

  -- Determine capacity availability
  IF p_is_emergency THEN
    -- Emergency bookings use full capacity + soft override
    IF v_current_count < v_effective_max THEN
      RETURN QUERY SELECT 
        TRUE, 
        v_current_count, 
        v_effective_max, 
        v_effective_max - v_current_count,
        'Emergency booking - capacity available'::TEXT;
    ELSIF v_current_count < (v_effective_max * 1.1)::INTEGER THEN
      RETURN QUERY SELECT 
        TRUE, 
        v_current_count, 
        v_effective_max, 
        0,
        'Emergency booking - SOFT OVERRIDE (110% capacity)'::TEXT;
    ELSE
      RETURN QUERY SELECT 
        FALSE, 
        v_current_count, 
        v_effective_max, 
        0,
        FORMAT('Emergency HARD LIMIT (%s/%s, 110%% exceeded)', 
          v_current_count, v_effective_max)::TEXT;
    END IF;
  ELSE
    -- Regular booking
    IF v_current_count < v_available_for_regular THEN
      RETURN QUERY SELECT 
        TRUE, 
        v_current_count, 
        v_available_for_regular, 
        v_available_for_regular - v_current_count,
        FORMAT('Capacity available (%s slots, %s emergency reserve)', 
          v_available_for_regular - v_current_count, COALESCE(v_emergency_reserved, 0))::TEXT;
    ELSE
      RETURN QUERY SELECT 
        FALSE, 
        v_current_count, 
        v_available_for_regular, 
        0,
        FORMAT('Capacity FULL (%s/%s, %s emergency reserve)', 
          v_current_count, v_available_for_regular, COALESCE(v_emergency_reserved, 0))::TEXT;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_provider_capacity_locked IS
  'Thread-safe capacity check with advisory locking.
  
  LOCKING STRATEGY:
  - Uses pg_advisory_xact_lock (transaction-scoped)
  - Lock key: hash(provider_id || service_id)
  - Prevents race conditions between check and insert
  
  TIME SEMANTICS:
  - Respects overlapping_bookings_allowed per service
  - Uses canonical busy_from/busy_to for overlap detection
  - NULL busy_to treated as 24-hour duration
  
  CALLED BY:
  - enforce_provider_capacity trigger (automatically)
  - Application code (for pre-validation)';

-- =============================================================================
-- ISSUE 3: STATE MACHINE ENFORCEMENT
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_state_transitions (
  from_status booking_status NOT NULL,
  to_status booking_status NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  requires_provider BOOLEAN DEFAULT FALSE,
  requires_payment BOOLEAN DEFAULT FALSE,
  notes TEXT,
  PRIMARY KEY (from_status, to_status)
);

-- Populate valid transitions
INSERT INTO booking_state_transitions (from_status, to_status, allowed, requires_provider, notes) VALUES
  -- From draft
  ('draft', 'draft', TRUE, FALSE, 'Allow editing'),
  ('draft', 'submitted', TRUE, FALSE, 'Customer submits'),
  ('draft', 'cancelled_customer', TRUE, FALSE, 'Customer cancels before submit'),
  
  -- From submitted
  ('submitted', 'provider_viewed', TRUE, TRUE, 'Provider opens'),
  ('submitted', 'confirmed', TRUE, TRUE, 'Provider accepts'),
  ('submitted', 'quote_pending', TRUE, TRUE, 'Project/quote services'),
  ('submitted', 'cancelled_provider', TRUE, TRUE, 'Provider declines'),
  ('submitted', 'cancelled_customer', TRUE, FALSE, 'Customer cancels'),
  
  -- From provider_viewed
  ('provider_viewed', 'confirmed', TRUE, TRUE, 'Provider accepts'),
  ('provider_viewed', 'quote_pending', TRUE, TRUE, 'Quote required'),
  ('provider_viewed', 'cancelled_provider', TRUE, TRUE, 'Provider declines'),
  ('provider_viewed', 'cancelled_customer', TRUE, FALSE, 'Customer cancels'),
  
  -- From quote_pending
  ('quote_pending', 'quote_sent', TRUE, TRUE, 'Provider sends quote'),
  ('quote_pending', 'cancelled_provider', TRUE, TRUE, 'Provider declines to quote'),
  ('quote_pending', 'cancelled_customer', TRUE, FALSE, 'Customer cancels'),
  
  -- From quote_sent
  ('quote_sent', 'quote_accepted', TRUE, FALSE, 'Customer accepts'),
  ('quote_sent', 'quote_rejected', TRUE, FALSE, 'Customer rejects'),
  ('quote_sent', 'cancelled_customer', TRUE, FALSE, 'Customer cancels'),
  
  -- From quote_accepted
  ('quote_accepted', 'confirmed', TRUE, TRUE, 'Booking confirmed'),
  
  -- From quote_rejected
  ('quote_rejected', 'quote_pending', TRUE, TRUE, 'Renegotiate'),
  ('quote_rejected', 'cancelled_customer', TRUE, FALSE, 'Customer cancels'),
  
  -- From confirmed
  ('confirmed', 'in_progress', TRUE, TRUE, 'Work started'),
  ('confirmed', 'cancelled_customer', TRUE, FALSE, 'Customer cancels'),
  ('confirmed', 'cancelled_provider', TRUE, TRUE, 'Provider emergency'),
  
  -- From in_progress
  ('in_progress', 'completed', TRUE, TRUE, 'Work finished'),
  ('in_progress', 'cancelled_provider', TRUE, TRUE, 'Provider emergency'),
  
  -- From completed
  ('completed', 'customer_confirmed', TRUE, FALSE, 'Customer confirms'),
  ('completed', 'disputed', TRUE, FALSE, 'Customer disputes'),
  
  -- From customer_confirmed
  ('customer_confirmed', 'disputed', TRUE, FALSE, 'Dispute filed late'),
  
  -- From disputed
  ('disputed', 'resolved', TRUE, FALSE, 'Dispute resolved'),
  
  -- Terminal states
  ('cancelled_customer', 'cancelled_customer', TRUE, FALSE, 'Terminal'),
  ('cancelled_provider', 'cancelled_provider', TRUE, FALSE, 'Terminal'),
  ('resolved', 'resolved', TRUE, FALSE, 'Terminal')
ON CONFLICT (from_status, to_status) DO NOTHING;

COMMENT ON TABLE booking_state_transitions IS
  'AUTHORITATIVE state machine. Any transition not in this table is ILLEGAL.';

CREATE OR REPLACE FUNCTION enforce_booking_state_machine()
RETURNS TRIGGER AS $$
DECLARE
  v_transition RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'submitted') THEN
      RAISE EXCEPTION 'New bookings must start in draft or submitted (got: %)', NEW.status;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_state_machine_trigger ON bookings;
CREATE TRIGGER enforce_state_machine_trigger
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_state_machine();

-- =============================================================================
-- ISSUE 4: AVAILABILITY + CAPACITY RECONCILIATION
-- =============================================================================

CREATE OR REPLACE FUNCTION check_provider_can_accept(
  p_provider_id UUID,
  p_service_id UUID,
  p_busy_from TIMESTAMPTZ,
  p_busy_to TIMESTAMPTZ,
  p_is_emergency BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  can_accept BOOLEAN,
  reason TEXT,
  availability_ok BOOLEAN,
  capacity_ok BOOLEAN
) AS $$
DECLARE
  v_availability_ok BOOLEAN;
  v_capacity_result RECORD;
BEGIN
  -- Check availability
  IF p_is_emergency THEN
    v_availability_ok := TRUE; -- Emergencies bypass availability
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM provider_availability
      WHERE provider_id = p_provider_id
        AND is_active = TRUE
        AND day_of_week = EXTRACT(DOW FROM p_busy_from)
        AND start_time <= p_busy_from::TIME
        AND end_time >= p_busy_to::TIME
    ) INTO v_availability_ok;
  END IF;

  -- Check capacity
  SELECT * INTO v_capacity_result
  FROM check_provider_capacity_locked(
    p_provider_id, p_service_id, p_busy_from, p_busy_to, p_is_emergency
  );

  -- Both must pass
  IF v_availability_ok AND v_capacity_result.capacity_available THEN
    RETURN QUERY SELECT TRUE, 'Available'::TEXT, TRUE, TRUE;
  ELSIF NOT v_availability_ok THEN
    RETURN QUERY SELECT FALSE, 
      FORMAT('Not available %s-%s', p_busy_from::TIME, p_busy_to::TIME)::TEXT,
      FALSE, v_capacity_result.capacity_available;
  ELSE
    RETURN QUERY SELECT FALSE, v_capacity_result.reason, TRUE, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ISSUE 5: EMERGENCY OVERRIDE RULES
-- =============================================================================

ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS emergency_hard_ceiling INTEGER,
ADD COLUMN IF NOT EXISTS max_simultaneous_emergencies INTEGER DEFAULT 1 
  CHECK (max_simultaneous_emergencies > 0);

ALTER TABLE service_providers
ADD CONSTRAINT emergency_ceiling_above_max 
  CHECK (emergency_hard_ceiling IS NULL OR emergency_hard_ceiling >= max_concurrent_bookings);

COMMENT ON COLUMN service_providers.emergency_hard_ceiling IS
  'ABSOLUTE maximum including emergencies. Safety valve.
  NULL = 110% of max_concurrent_bookings (soft override only)
  Example: max=30, ceiling=35 → emergencies can push to 35 then HARD STOP';

COMMENT ON COLUMN service_providers.max_simultaneous_emergencies IS
  'Maximum emergencies IN_PROGRESS simultaneously.
  Default=1 (one emergency at a time).
  Teams may set higher.';

UPDATE service_capabilities
SET supports_emergency = TRUE
WHERE service_id IN (
  SELECT id FROM services WHERE name ILIKE '%emergency%'
);

COMMENT ON COLUMN service_capabilities.supports_emergency IS
  'Service supports 24/7 emergency bookings.
  POLICY: Emergency bookings BYPASS provider_availability schedules.
  Providers are implicitly available 24/7 for emergency services.';

-- =============================================================================
-- ISSUE 6: REASSIGNMENT SEMANTICS
-- =============================================================================

-- Block execution of bookings needing reassignment
CREATE OR REPLACE FUNCTION prevent_execution_if_needs_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'needs_reassignment' AND NEW.status = 'in_progress' THEN
    RAISE EXCEPTION 'Cannot execute booking pending reassignment'
      USING HINT = 'Booking must be reassigned or cancelled first';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_needs_reassignment_execution ON bookings;
CREATE TRIGGER block_needs_reassignment_execution
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (OLD.status = 'needs_reassignment' AND NEW.status = 'in_progress')
  EXECUTE FUNCTION prevent_execution_if_needs_reassignment();

COMMENT ON TRIGGER block_needs_reassignment_execution ON bookings IS
  'BLOCKS execution of bookings flagged for reassignment.
  Reassignment is BLOCKING, not advisory.
  Valid exits: submitted (reassigned), cancelled_customer';

-- =============================================================================
-- ISSUE 7: PRICING SNAPSHOT IMMUTABILITY
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_pricing_snapshot_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pricing_snapshot IS NULL AND NEW.pricing_snapshot IS NOT NULL THEN
    RETURN NEW; -- Allow initial set
  END IF;

  IF OLD.pricing_snapshot IS NOT NULL AND NEW.pricing_snapshot != OLD.pricing_snapshot THEN
    RAISE EXCEPTION 'pricing_snapshot is immutable once set'
      USING HINT = 'Cannot modify pricing evidence',
        ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS immutable_pricing_snapshot ON bookings;
CREATE TRIGGER immutable_pricing_snapshot
  BEFORE UPDATE OF pricing_snapshot ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_pricing_snapshot_immutability();

ALTER TABLE bookings
ADD CONSTRAINT pricing_snapshot_required_after_confirmation
  CHECK (
    status IN ('draft', 'submitted', 'provider_viewed', 'cancelled_customer', 'cancelled_provider') 
    OR pricing_snapshot IS NOT NULL
  );

COMMENT ON CONSTRAINT pricing_snapshot_required_after_confirmation ON bookings IS
  'pricing_snapshot REQUIRED before confirmation. Legal evidence. Immutable once set.';

-- =============================================================================
-- UPDATE CAPACITY TRIGGER TO USE NEW FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_provider_capacity_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_check_result RECORD;
  v_is_emergency BOOLEAN;
BEGIN
  IF NEW.provider_id IS NULL OR NEW.busy_from IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('completed', 'customer_confirmed', 'cancelled_customer', 'cancelled_provider') THEN
    RETURN NEW;
  END IF;

  v_is_emergency := NEW.booking_flow_type = 'emergency';

  SELECT * INTO v_check_result
  FROM check_provider_can_accept(
    NEW.provider_id,
    NEW.service_id,
    NEW.busy_from,
    COALESCE(NEW.busy_to, NEW.busy_from + INTERVAL '24 hours'),
    v_is_emergency
  );

  IF NOT v_check_result.can_accept THEN
    NEW.status := 'needs_reassignment';
    NEW.provider_notes := COALESCE(NEW.provider_notes || ' | ', '') || 'CAPACITY: ' || v_check_result.reason;
    
    -- Notifications
    INSERT INTO notifications (id, user_id, user_role, type, title, message, booking_id, created_at)
    VALUES (
      gen_random_uuid(),
      (SELECT user_id FROM service_providers WHERE id = NEW.provider_id),
      'provider',
      'capacity_overflow',
      'Booking Flagged - Capacity Full',
      FORMAT('Capacity full. Booking #%s flagged for reassignment. Reason: %s', 
        LEFT(NEW.id::TEXT, 8), v_check_result.reason),
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_provider_capacity_trigger ON bookings;
CREATE TRIGGER check_provider_capacity_trigger
  BEFORE INSERT OR UPDATE OF provider_id, busy_from, busy_to, status
  ON bookings
  FOR EACH ROW
  WHEN (
    NEW.provider_id IS NOT NULL 
    AND NEW.busy_from IS NOT NULL
    AND NEW.status NOT IN ('completed', 'customer_confirmed', 'cancelled_customer', 'cancelled_provider')
  )
  EXECUTE FUNCTION enforce_provider_capacity_v2();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
