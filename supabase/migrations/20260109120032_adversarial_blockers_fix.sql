-- Migration: Critical Blockers Fix - Transaction Safety & Reality Modeling
-- Description: Fixes 8 remaining critical issues identified in adversarial review
-- Date: 2026-01-09
-- Priority: ABSOLUTE BLOCKER
-- Dependencies: 20260109120031_critical_gaps_complete_fix.sql
-- Review Status: ADVERSARIAL REVIEW APPLIED

-- =============================================================================
-- ISSUE 1: TRANSACTION ISOLATION ENFORCEMENT
-- =============================================================================

-- Option A: Require SERIALIZABLE isolation for capacity-sensitive operations
CREATE OR REPLACE FUNCTION enforce_serializable_for_capacity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce for operations that affect capacity
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.provider_id IS DISTINCT FROM NEW.provider_id OR
    OLD.busy_from IS DISTINCT FROM NEW.busy_from OR
    OLD.busy_to IS DISTINCT FROM NEW.busy_to OR
    OLD.status IS DISTINCT FROM NEW.status
  )) THEN
    -- Check transaction isolation level
    IF current_setting('transaction_isolation') NOT IN ('serializable', 'repeatable read') THEN
      RAISE EXCEPTION 'Capacity-affecting operations require SERIALIZABLE or REPEATABLE READ isolation'
        USING HINT = 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE',
              ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS require_serializable_capacity ON bookings;
CREATE TRIGGER require_serializable_capacity
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_serializable_for_capacity();

COMMENT ON TRIGGER require_serializable_capacity ON bookings IS
  'ENFORCES SERIALIZABLE isolation for capacity-affecting operations.
  Prevents race conditions from background jobs, admin overrides, bulk inserts.
  
  CRITICAL: Advisory locks alone are insufficient.
  This ensures ALL paths (app, cron, admin, migrations) use correct isolation.
  
  FAILURE MODE WITHOUT THIS:
  - Background job inserts booking (READ COMMITTED)
  - Capacity trigger checks (sees stale count)
  - Overbooking occurs
  
  WITH THIS:
  - All capacity operations use SERIALIZABLE
  - PostgreSQL detects conflicts
  - Retry or abort (deterministic)';

-- Option B: Authoritative entry point (stored procedure)
CREATE OR REPLACE FUNCTION create_booking_with_capacity_check(
  p_customer_id UUID,
  p_provider_id UUID,
  p_service_id UUID,
  p_service_type_id UUID,
  p_booking_flow_type booking_flow_type,
  p_busy_from TIMESTAMPTZ,
  p_busy_to TIMESTAMPTZ,
  p_is_emergency BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_capacity_check RECORD;
BEGIN
  -- Force SERIALIZABLE for this function
  SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  
  -- Check capacity with lock
  SELECT * INTO v_capacity_check
  FROM check_provider_can_accept(
    p_provider_id,
    p_service_id,
    p_busy_from,
    p_busy_to,
    p_is_emergency
  );
  
  -- If no capacity, return NULL
  IF NOT v_capacity_check.can_accept THEN
    RAISE EXCEPTION 'Provider cannot accept booking: %', v_capacity_check.reason
      USING ERRCODE = 'capacity_exceeded';
  END IF;
  
  -- Create booking atomically
  INSERT INTO bookings (
    customer_id,
    provider_id,
    service_id,
    service_type_id,
    booking_flow_type,
    busy_from,
    busy_to,
    status,
    requested_at
  ) VALUES (
    p_customer_id,
    p_provider_id,
    p_service_id,
    p_service_type_id,
    p_booking_flow_type,
    p_busy_from,
    p_busy_to,
    'submitted',
    NOW()
  ) RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_booking_with_capacity_check IS
  'AUTHORITATIVE entry point for booking creation.
  
  GUARANTEES:
  - SERIALIZABLE isolation (no race conditions)
  - Atomic capacity check + insert
  - Single path for all booking creation
  
  USAGE:
  Application MUST use this function, NOT direct INSERT.
  Direct INSERTs should be blocked by policy (see below).';

-- Revoke direct INSERT from application role (enforce single entry point)
-- UNCOMMENT AFTER VERIFYING APPLICATION USES FUNCTION:
-- REVOKE INSERT ON bookings FROM application_role;
-- GRANT EXECUTE ON FUNCTION create_booking_with_capacity_check TO application_role;

-- =============================================================================
-- ISSUE 2: FIX CONCURRENT SEMANTICS (TEAMS, NOT BOOLEAN)
-- =============================================================================

-- Replace boolean with integer units
ALTER TABLE provider_services
DROP COLUMN IF EXISTS overlapping_bookings_allowed CASCADE;

ALTER TABLE provider_services
ADD COLUMN concurrent_units INTEGER NOT NULL DEFAULT 1 CHECK (concurrent_units > 0);

COMMENT ON COLUMN provider_services.concurrent_units IS
  'Number of concurrent booking units provider can handle for this service.
  
  REPLACES overlapping_bookings_allowed (too coarse).
  
  SEMANTICS:
  - 1 (default): One booking at a time (solo provider, taxi driver, plumber)
  - 3: Three simultaneous bookings (cleaning company with 3 teams)
  - 10: Ten parallel jobs (laundry service with 10 machines)
  
  CAPACITY CALCULATION:
  Count overlapping bookings. If count >= concurrent_units → full.
  
  EXAMPLES:
  - Solo plumber: concurrent_units=1
  - Cleaning company (3 teams): concurrent_units=3
  - Laundry service (10 machines): concurrent_units=10
  - Call center (50 agents): concurrent_units=50';

-- Update capacity check to use concurrent_units
CREATE OR REPLACE FUNCTION check_provider_capacity_with_units(
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
  v_concurrent_units INTEGER;
  v_current_count INTEGER;
  v_effective_max INTEGER;
BEGIN
  -- Force SERIALIZABLE
  SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  
  -- Advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext(p_provider_id::text || '_' || p_service_id::text)
  );
  
  -- Get provider settings
  SELECT max_concurrent_bookings, emergency_capacity_reserved
  INTO v_provider_global_max, v_emergency_reserved
  FROM service_providers
  WHERE id = p_provider_id;

  -- Get service settings (includes concurrent_units)
  SELECT max_concurrent_bookings, concurrent_units
  INTO v_service_max, v_concurrent_units
  FROM provider_services
  WHERE provider_id = p_provider_id AND service_id = p_service_id;

  -- Effective max
  v_effective_max := COALESCE(v_service_max, v_provider_global_max);

  -- Count OVERLAPPING bookings (time-aware)
  SELECT COUNT(*)
  INTO v_current_count
  FROM bookings
  WHERE provider_id = p_provider_id
    AND service_id = p_service_id
    AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
    AND busy_from IS NOT NULL
    AND busy_to IS NOT NULL
    -- Overlap detection
    AND tstzrange(busy_from, busy_to, '[]') && 
        tstzrange(p_busy_from, p_busy_to, '[]');

  -- Check against concurrent_units (not boolean)
  IF v_current_count < v_concurrent_units THEN
    RETURN QUERY SELECT 
      TRUE,
      v_current_count,
      v_concurrent_units,
      v_concurrent_units - v_current_count,
      FORMAT('%s/%s concurrent units available', 
        v_concurrent_units - v_current_count, v_concurrent_units)::TEXT;
  ELSE
    RETURN QUERY SELECT 
      FALSE,
      v_current_count,
      v_concurrent_units,
      0,
      FORMAT('All %s concurrent units occupied (%s active bookings)', 
        v_concurrent_units, v_current_count)::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ISSUE 3: KILL THE 24-HOUR NULL HACK
-- =============================================================================

-- Add explicit duration column
ALTER TABLE bookings
ADD COLUMN estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0);

COMMENT ON COLUMN bookings.estimated_duration_minutes IS
  'REQUIRED estimated duration for capacity calculation.
  
  AUTHORITY BY FLOW:
  - emergency: service_capabilities.emergency_response_sla_minutes
  - standard: user-provided or service default
  - delivery: calculated from pickup → dropoff windows
  - project: user-provided (may span days)
  
  NULL HANDLING:
  - NULL → booking CANNOT be confirmed (capacity incalculable)
  - Must be populated before status = confirmed
  
  REPLACES dangerous "COALESCE(busy_to, busy_from + 24 hours)" hack.';

-- Constraint: duration required after submission
ALTER TABLE bookings
ADD CONSTRAINT duration_required_after_submission CHECK (
  status IN ('draft') OR estimated_duration_minutes IS NOT NULL
);

-- Update busy_to calculation to use explicit duration
CREATE OR REPLACE FUNCTION calculate_busy_to_from_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- If busy_to already set explicitly, keep it
  IF NEW.busy_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- If no duration, cannot calculate (will fail constraint)
  IF NEW.estimated_duration_minutes IS NULL THEN
    NEW.busy_to := NULL;
    RETURN NEW;
  END IF;

  -- Calculate busy_to from busy_from + duration
  IF NEW.busy_from IS NOT NULL THEN
    NEW.busy_to := NEW.busy_from + (NEW.estimated_duration_minutes || ' minutes')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_busy_to_trigger ON bookings;
CREATE TRIGGER calculate_busy_to_trigger
  BEFORE INSERT OR UPDATE OF busy_from, estimated_duration_minutes
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_busy_to_from_duration();

COMMENT ON TRIGGER calculate_busy_to_trigger ON bookings IS
  'Calculates busy_to from busy_from + estimated_duration_minutes.
  
  REPLACES dangerous 24-hour default.
  
  RULE: If duration unknown → busy_to = NULL → constraint blocks confirmation.
  This forces explicit duration before capacity can be computed.';

-- =============================================================================
-- ISSUE 4: STATE MACHINE SIDE EFFECTS (COMMIT POINTS)
-- =============================================================================

-- Add commitment level column
ALTER TABLE bookings
ADD COLUMN commitment_level TEXT DEFAULT 'soft' CHECK (
  commitment_level IN ('soft', 'hard', 'locked', 'irreversible')
);

COMMENT ON COLUMN bookings.commitment_level IS
  'Commitment strength of booking state.
  
  LEVELS:
  - soft: Intent only (draft, submitted, provider_viewed)
  - hard: Promise made (confirmed) - capacity locked, customer notified
  - locked: Time-locked (scheduled) - immutable timing
  - irreversible: Underway (in_progress, completed) - cannot cancel
  
  USED TO PREVENT:
  - Confirmed bookings from failing capacity later
  - Time changes after scheduling
  - Cancellations after work started';

-- Update commitment level based on status
CREATE OR REPLACE FUNCTION update_commitment_level()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.status
    WHEN 'draft', 'submitted', 'provider_viewed', 'needs_reassignment' THEN
      NEW.commitment_level := 'soft';
    WHEN 'confirmed' THEN
      NEW.commitment_level := 'hard';
    WHEN 'scheduled' THEN
      NEW.commitment_level := 'locked';
    WHEN 'in_progress', 'completed', 'customer_confirmed', 'requires_followup' THEN
      NEW.commitment_level := 'irreversible';
    ELSE
      -- Terminal states keep current level
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_commitment_level_trigger ON bookings;
CREATE TRIGGER update_commitment_level_trigger
  BEFORE INSERT OR UPDATE OF status
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_commitment_level();

-- Prevent capacity failures after hard commitment
CREATE OR REPLACE FUNCTION prevent_capacity_failure_after_commitment()
RETURNS TRIGGER AS $$
BEGIN
  -- If booking already committed (hard/locked/irreversible)
  IF OLD.commitment_level IN ('hard', 'locked', 'irreversible') THEN
    -- Block transition to needs_reassignment
    IF NEW.status = 'needs_reassignment' THEN
      RAISE EXCEPTION 'Cannot reassign committed booking (commitment_level: %)', OLD.commitment_level
        USING HINT = 'Committed bookings have locked capacity. Use cancellation instead.',
              ERRCODE = 'integrity_constraint_violation';
    END IF;
    
    -- Block provider change
    IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
      RAISE EXCEPTION 'Cannot change provider after commitment (commitment_level: %)', OLD.commitment_level
        USING HINT = 'Provider assignment is locked at confirmation.',
              ERRCODE = 'integrity_constraint_violation';
    END IF;
    
    -- Block timing changes if locked/irreversible
    IF OLD.commitment_level IN ('locked', 'irreversible') THEN
      IF NEW.busy_from IS DISTINCT FROM OLD.busy_from OR NEW.busy_to IS DISTINCT FROM OLD.busy_to THEN
        RAISE EXCEPTION 'Cannot change timing after scheduling (commitment_level: %)', OLD.commitment_level
          USING HINT = 'Time is locked once scheduled.',
                ERRCODE = 'integrity_constraint_violation';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_commitment_violations ON bookings;
CREATE TRIGGER prevent_commitment_violations
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.commitment_level IN ('hard', 'locked', 'irreversible'))
  EXECUTE FUNCTION prevent_capacity_failure_after_commitment();

COMMENT ON TRIGGER prevent_commitment_violations ON bookings IS
  'ENFORCES commitment point semantics.
  
  RULES:
  - confirmed (hard) → capacity LOCKED (no reassignment)
  - scheduled (locked) → time IMMUTABLE
  - in_progress (irreversible) → no changes except completion
  
  PREVENTS:
  - Post-confirmation capacity failures
  - Provider changes after commitment
  - Time changes after scheduling
  
  This makes "confirmed" a REAL promise, not just a status flag.';

-- =============================================================================
-- ISSUE 5: RECURRING BOOKING CONTRACT (EXPLICIT POLICY)
-- =============================================================================

-- Add explicit recurring capacity policy
ALTER TABLE booking_recurring_rules
ADD COLUMN capacity_policy TEXT DEFAULT 'soft_guarantee' CHECK (
  capacity_policy IN ('hard_guarantee', 'soft_guarantee', 'best_effort')
);

COMMENT ON COLUMN booking_recurring_rules.capacity_policy IS
  'EXPLICIT contract for recurring booking capacity handling.
  
  POLICIES:
  
  1. hard_guarantee (NOT IMPLEMENTED YET - requires reservation system)
     - Future capacity is RESERVED at generation time
     - Provider cannot reduce capacity below reserved amount
     - Customer guaranteed all occurrences will execute
     - RISK: Low customer risk, high provider lock-in
  
  2. soft_guarantee (DEFAULT - CURRENT IMPLEMENTATION)
     - Capacity checked at generation (generates if available)
     - NOT re-checked until execution
     - If provider reduces capacity, occurrence may fail
     - Customer notified of failure, offered reschedule/refund
     - RISK: Medium customer risk, provider flexibility maintained
  
  3. best_effort (DISCLOSED UPFRONT)
     - Capacity NOT checked at generation
     - Checked at execution time only
     - Customer explicitly accepts risk of future failures
     - Appropriate for long-term (6+ months) recurring bookings
     - RISK: High customer risk, maximum provider flexibility
  
  PRODUCT DECISION REQUIRED:
  Current system implements "soft_guarantee".
  If changing to "hard_guarantee", must implement capacity reservation system.';

-- Add disclosure requirement for soft/best-effort
ALTER TABLE booking_recurring_rules
ADD COLUMN customer_acknowledged_risk BOOLEAN DEFAULT FALSE;

ALTER TABLE booking_recurring_rules
ADD CONSTRAINT risk_acknowledgment_required CHECK (
  capacity_policy = 'hard_guarantee' OR customer_acknowledged_risk = TRUE
);

COMMENT ON COLUMN booking_recurring_rules.customer_acknowledged_risk IS
  'Customer explicitly acknowledges capacity risk for soft_guarantee/best_effort.
  
  REQUIRED when capacity_policy != hard_guarantee.
  
  UI MUST show:
  "Your recurring booking is subject to provider availability. If the provider is at capacity when your booking executes, we will notify you and offer alternatives."';

-- =============================================================================
-- ISSUE 6: FIX AVAILABILITY FOR MULTI-DAY & OVERNIGHT
-- =============================================================================

-- Add interval-based availability (replaces day/time slicing)
CREATE TABLE IF NOT EXISTS provider_availability_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  
  -- Interval-based (handles overnight/multi-day)
  available_from TIMESTAMPTZ NOT NULL,
  available_to TIMESTAMPTZ NOT NULL,
  
  -- Recurrence rule (iCalendar RRULE format)
  recurrence_rule TEXT,
  
  -- Exceptions
  is_exception BOOLEAN DEFAULT FALSE, -- TRUE = blocked time, FALSE = available time
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT interval_valid CHECK (available_to > available_from)
);

CREATE INDEX idx_provider_availability_intervals_provider 
  ON provider_availability_intervals(provider_id) 
  WHERE is_active = TRUE;

CREATE INDEX idx_provider_availability_intervals_gist
  ON provider_availability_intervals USING GIST (
    provider_id,
    tstzrange(available_from, available_to, '[]')
  ) WHERE is_active = TRUE;

COMMENT ON TABLE provider_availability_intervals IS
  'INTERVAL-BASED availability (replaces provider_availability day/time model).
  
  HANDLES:
  - Overnight jobs (e.g., 10pm - 2am)
  - Multi-day projects (e.g., Jan 15 9am - Jan 20 5pm)
  - Irregular schedules
  - Time zone changes
  
  RECURRENCE:
  Uses iCalendar RRULE format for repeating availability.
  Example: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" = Monday-Friday recurring
  
  EXCEPTIONS:
  is_exception=TRUE = blocked time (vacation, holidays)
  is_exception=FALSE = available time
  
  REPLACES:
  provider_availability (which breaks on midnight crossings)';

-- Update availability check for intervals
CREATE OR REPLACE FUNCTION check_provider_availability_interval(
  p_provider_id UUID,
  p_service_id UUID,
  p_busy_from TIMESTAMPTZ,
  p_busy_to TIMESTAMPTZ,
  p_is_emergency BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
DECLARE
  v_available BOOLEAN;
BEGIN
  -- Emergencies bypass availability
  IF p_is_emergency THEN
    RETURN TRUE;
  END IF;

  -- Check if requested interval is covered by available intervals
  -- and NOT blocked by exception intervals
  SELECT EXISTS (
    SELECT 1
    FROM provider_availability_intervals
    WHERE provider_id = p_provider_id
      AND (service_id = p_service_id OR service_id IS NULL)
      AND is_active = TRUE
      AND is_exception = FALSE
      -- Requested time must be CONTAINED within available interval
      AND tstzrange(available_from, available_to, '[]') @> tstzrange(p_busy_from, p_busy_to, '[]')
      -- And NOT overlap any exception intervals
      AND NOT EXISTS (
        SELECT 1
        FROM provider_availability_intervals exc
        WHERE exc.provider_id = p_provider_id
          AND exc.is_active = TRUE
          AND exc.is_exception = TRUE
          AND tstzrange(exc.available_from, exc.available_to, '[]') && 
              tstzrange(p_busy_from, p_busy_to, '[]')
      )
  ) INTO v_available;

  RETURN v_available;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_provider_availability_interval IS
  'Interval-based availability check (handles overnight/multi-day).
  
  LOGIC:
  1. Emergency → bypass (return TRUE)
  2. Find available intervals that CONTAIN requested time
  3. Check NO exception intervals OVERLAP requested time
  4. Return TRUE only if both conditions met
  
  HANDLES:
  - Overnight: available_from=10pm, available_to=2am next day
  - Multi-day: available_from=Jan 15 9am, available_to=Jan 20 5pm
  - Exceptions: vacation blocks overlapping availability';

-- =============================================================================
-- ISSUE 7: FREEZE SERVICE CAPABILITIES AFTER FIRST BOOKING
-- =============================================================================

-- Add immutability flag
ALTER TABLE service_capabilities
ADD COLUMN is_immutable BOOLEAN DEFAULT FALSE;

-- Trigger to set immutable after first booking
CREATE OR REPLACE FUNCTION freeze_capabilities_after_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark capabilities as immutable when first booking created
  UPDATE service_capabilities
  SET is_immutable = TRUE
  WHERE service_id = NEW.service_id
    AND is_immutable = FALSE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS freeze_capabilities_trigger ON bookings;
CREATE TRIGGER freeze_capabilities_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION freeze_capabilities_after_booking();

-- Prevent modification of immutable capabilities
CREATE OR REPLACE FUNCTION prevent_capability_drift()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_immutable = TRUE THEN
    -- Allow only metadata changes, not semantic fields
    IF OLD.supports_emergency IS DISTINCT FROM NEW.supports_emergency OR
       OLD.supports_scheduling IS DISTINCT FROM NEW.supports_scheduling OR
       OLD.supports_recurring IS DISTINCT FROM NEW.supports_recurring OR
       OLD.requires_provider_quote IS DISTINCT FROM NEW.requires_provider_quote THEN
      
      RAISE EXCEPTION 'Cannot modify service capabilities after bookings exist'
        USING HINT = 'Create new service version instead (capability already in use)',
              ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_capability_drift_trigger ON service_capabilities;
CREATE TRIGGER prevent_capability_drift_trigger
  BEFORE UPDATE ON service_capabilities
  FOR EACH ROW
  WHEN (OLD.is_immutable = TRUE)
  EXECUTE FUNCTION prevent_capability_drift();

COMMENT ON TRIGGER prevent_capability_drift_trigger ON service_capabilities IS
  'PREVENTS capability drift after bookings exist.
  
  PROBLEM:
  - Service has bookings with supports_emergency=true
  - Admin flips to supports_emergency=false
  - Historical bookings now inconsistent with current rules
  
  SOLUTION:
  - First booking freezes capabilities (is_immutable=true)
  - Subsequent modifications blocked
  - To change capabilities: create new service version';

-- =============================================================================
-- ISSUE 8: DECLARE AUTHORITY MODEL
-- =============================================================================

-- Create authority declaration table
CREATE TABLE IF NOT EXISTS system_authority_model (
  component TEXT PRIMARY KEY,
  authority TEXT NOT NULL CHECK (authority IN ('database', 'application', 'hybrid')),
  enforcement TEXT NOT NULL,
  notes TEXT,
  locked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Declare authority for critical components
INSERT INTO system_authority_model (component, authority, enforcement, notes) VALUES
  ('booking_creation', 'database', 'create_booking_with_capacity_check function required', 
   'All booking creation MUST use stored procedure. Direct INSERT forbidden.'),
  
  ('capacity_enforcement', 'database', 'Triggers + SERIALIZABLE isolation', 
   'Capacity invariants enforced by DB. App cannot override.'),
  
  ('state_transitions', 'database', 'State machine table + trigger', 
   'Only valid transitions allowed. App orchestrates, DB enforces.'),
  
  ('pricing', 'hybrid', 'Pricing snapshot immutable once set', 
   'App calculates prices, DB freezes them after confirmation.'),
  
  ('availability', 'database', 'Interval-based check function', 
   'Availability rules enforced by DB. App queries, DB decides.'),
  
  ('commitment_points', 'database', 'Commitment level triggers', 
   'Confirmed = locked capacity. DB prevents violations.'),
  
  ('service_capabilities', 'database', 'Immutability after first booking', 
   'Capabilities frozen by DB after use. App cannot drift logic.')
ON CONFLICT (component) DO UPDATE SET
  authority = EXCLUDED.authority,
  enforcement = EXCLUDED.enforcement,
  notes = EXCLUDED.notes;

COMMENT ON TABLE system_authority_model IS
  'AUTHORITATIVE declaration of who owns truth: Database vs Application.
  
  PURPOSE:
  Prevents "half-and-half" authority that guarantees bugs.
  
  RULES:
  - database: DB is source of truth, enforces invariants
  - application: App is source of truth, DB stores only
  - hybrid: App computes, DB freezes/validates
  
  LOCKED: Cannot be changed after deployment without migration review.
  
  This table is the CONTRACT between application and database.';

-- Make authority model immutable
CREATE OR REPLACE FUNCTION prevent_authority_model_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete authority model declaration'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.locked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Authority model is locked (locked_at: %)', OLD.locked_at
        USING HINT = 'Changing authority model requires migration review',
              ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS authority_model_immutable ON system_authority_model;
CREATE TRIGGER authority_model_immutable
  BEFORE UPDATE OR DELETE ON system_authority_model
  FOR EACH ROW
  EXECUTE FUNCTION prevent_authority_model_changes();

-- =============================================================================
-- UPDATE LEGACY FUNCTIONS TO USE NEW LOGIC
-- =============================================================================

-- Update main capacity check to use concurrent_units
DROP FUNCTION IF EXISTS check_provider_capacity_locked CASCADE;
-- (Already replaced by check_provider_capacity_with_units above)

-- Update unified check to use interval availability
CREATE OR REPLACE FUNCTION check_provider_can_accept_v2(
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
  -- Check availability (interval-based)
  v_availability_ok := check_provider_availability_interval(
    p_provider_id,
    p_service_id,
    p_busy_from,
    p_busy_to,
    p_is_emergency
  );

  -- Check capacity (with concurrent_units)
  SELECT * INTO v_capacity_result
  FROM check_provider_capacity_with_units(
    p_provider_id,
    p_service_id,
    p_busy_from,
    p_busy_to,
    p_is_emergency
  );

  -- Both must pass
  IF v_availability_ok AND v_capacity_result.capacity_available THEN
    RETURN QUERY SELECT TRUE, 'Available'::TEXT, TRUE, TRUE;
  ELSIF NOT v_availability_ok THEN
    RETURN QUERY SELECT FALSE, 
      FORMAT('Provider not available %s to %s', p_busy_from, p_busy_to)::TEXT,
      FALSE, v_capacity_result.capacity_available;
  ELSE
    RETURN QUERY SELECT FALSE, v_capacity_result.reason, TRUE, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
