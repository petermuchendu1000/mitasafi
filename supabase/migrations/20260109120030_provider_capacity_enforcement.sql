-- Migration: Provider Capacity Enforcement
-- Description: Add capacity tracking columns, validation functions, and enforcement triggers
-- Date: 2026-01-09
-- Priority: CRITICAL — Required before provider seeding
-- Dependencies: 20260108120002_trust_provider_layer.sql, 20260108120003_booking_core.sql

-- =============================================================================
-- STEP 1: Add capacity columns to service_providers
-- =============================================================================

ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS max_concurrent_bookings INTEGER CHECK (max_concurrent_bookings > 0),
ADD COLUMN IF NOT EXISTS capacity_mode TEXT DEFAULT 'per_service' 
  CHECK (capacity_mode IN ('global_provider', 'per_service', 'per_time_window', 'hybrid')),
ADD COLUMN IF NOT EXISTS emergency_capacity_reserved INTEGER DEFAULT 2 
  CHECK (emergency_capacity_reserved >= 0);

-- Add constraint ensuring emergency reserve doesn't exceed max capacity
ALTER TABLE service_providers
ADD CONSTRAINT emergency_reserve_limit 
  CHECK (emergency_capacity_reserved IS NULL OR max_concurrent_bookings IS NULL OR emergency_capacity_reserved <= max_concurrent_bookings);

COMMENT ON COLUMN service_providers.max_concurrent_bookings IS 
  'Global maximum concurrent active bookings across all services. Hard limit. NULL = no limit (not recommended for production).';

COMMENT ON COLUMN service_providers.capacity_mode IS 
  'How capacity is calculated:
  - global_provider: Total bookings across all services (simple but inflexible)
  - per_service: Separate capacity per service (RECOMMENDED - most accurate)
  - per_time_window: Capacity per day/week (for batch work)
  - hybrid: Per service with global limit fallback (balanced approach)';

COMMENT ON COLUMN service_providers.emergency_capacity_reserved IS 
  'Number of slots reserved ONLY for emergency bookings. Regular bookings stop at (max_concurrent - emergency_reserved). Example: max=30, reserved=2 → regular bookings limited to 28, emergencies can use all 30.';

-- Set default values for existing providers (safe defaults)
UPDATE service_providers
SET 
  max_concurrent_bookings = COALESCE(max_concurrent_bookings, 30),
  capacity_mode = COALESCE(capacity_mode, 'per_service'),
  emergency_capacity_reserved = COALESCE(emergency_capacity_reserved, 2)
WHERE max_concurrent_bookings IS NULL OR capacity_mode IS NULL OR emergency_capacity_reserved IS NULL;

-- =============================================================================
-- STEP 2: Add capacity columns to provider_services
-- =============================================================================

ALTER TABLE provider_services
ADD COLUMN IF NOT EXISTS max_concurrent_bookings INTEGER CHECK (max_concurrent_bookings > 0),
ADD COLUMN IF NOT EXISTS max_daily_bookings INTEGER CHECK (max_daily_bookings > 0),
ADD COLUMN IF NOT EXISTS max_weekly_bookings INTEGER CHECK (max_weekly_bookings > 0),
ADD COLUMN IF NOT EXISTS capacity_time_window TEXT DEFAULT 'concurrent' 
  CHECK (capacity_time_window IN ('concurrent', 'daily', 'weekly', 'hourly'));

COMMENT ON COLUMN provider_services.max_concurrent_bookings IS 
  'Maximum concurrent active bookings for THIS specific service. Overrides provider global if set. NULL = use provider global. Example: Provider max=30 global, but this service limited to 15.';

COMMENT ON COLUMN provider_services.max_daily_bookings IS 
  'Maximum bookings per calendar day for THIS service. NULL = no daily limit. Useful for services requiring full-day commitment.';

COMMENT ON COLUMN provider_services.max_weekly_bookings IS 
  'Maximum bookings per week for THIS service. NULL = no weekly limit. Useful for subscription/recurring services.';

COMMENT ON COLUMN provider_services.capacity_time_window IS 
  'Primary time window for capacity calculation:
  - concurrent: Count all active bookings (submitted → in_progress) [RECOMMENDED]
  - daily: Count bookings per calendar day (for full-day services)
  - weekly: Count bookings per week (for recurring services)
  - hourly: Count bookings per hour (for high-frequency services like taxi)';

-- Set default values for existing provider services (conservative defaults)
UPDATE provider_services
SET 
  max_concurrent_bookings = COALESCE(max_concurrent_bookings, 25),
  capacity_time_window = COALESCE(capacity_time_window, 'concurrent')
WHERE max_concurrent_bookings IS NULL OR capacity_time_window IS NULL;

-- =============================================================================
-- STEP 3: Add capacity checking function
-- =============================================================================

CREATE OR REPLACE FUNCTION check_provider_capacity(
  p_provider_id UUID,
  p_service_id UUID,
  p_scheduled_start TIMESTAMPTZ,
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
  v_capacity_time_window TEXT;
  v_effective_max INTEGER;
  v_available_for_regular INTEGER;
BEGIN
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

  -- Get service-specific capacity (if set)
  SELECT 
    max_concurrent_bookings,
    capacity_time_window
  INTO 
    v_service_max,
    v_capacity_time_window
  FROM provider_services
  WHERE provider_id = p_provider_id 
    AND service_id = p_service_id;

  -- Determine effective maximum
  v_effective_max := COALESCE(v_service_max, v_provider_global_max);

  -- If no capacity set, allow unlimited (but log warning)
  IF v_effective_max IS NULL THEN
    RETURN QUERY SELECT 
      TRUE, 
      0, 
      999999, 
      999999,
      'WARNING: No capacity limit set for provider. Unlimited bookings allowed.'::TEXT;
    RETURN;
  END IF;

  -- Count current bookings based on capacity mode and time window
  IF v_capacity_time_window = 'daily' THEN
    -- Count bookings on the same day
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings
    WHERE provider_id = p_provider_id
      AND service_id = p_service_id
      AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
      AND scheduled_start::DATE = p_scheduled_start::DATE;
      
  ELSIF v_capacity_time_window = 'weekly' THEN
    -- Count bookings in the same week
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings
    WHERE provider_id = p_provider_id
      AND service_id = p_service_id
      AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
      AND DATE_TRUNC('week', scheduled_start) = DATE_TRUNC('week', p_scheduled_start);
      
  ELSIF v_capacity_mode = 'global_provider' THEN
    -- Count ALL bookings across all services
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings
    WHERE provider_id = p_provider_id
      AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress');
      
  ELSE
    -- Default: per_service concurrent
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings
    WHERE provider_id = p_provider_id
      AND service_id = p_service_id
      AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress');
  END IF;

  -- Calculate available slots for regular bookings (excluding emergency reserve)
  v_available_for_regular := v_effective_max - COALESCE(v_emergency_reserved, 0);

  -- Determine capacity availability
  IF p_is_emergency THEN
    -- Emergency bookings can use reserved slots
    IF v_current_count < v_effective_max THEN
      RETURN QUERY SELECT 
        TRUE, 
        v_current_count, 
        v_effective_max, 
        v_effective_max - v_current_count,
        'Emergency booking - capacity available (including reserved slots)'::TEXT;
    ELSIF v_current_count < (v_effective_max * 1.1)::INTEGER THEN
      -- Soft override: allow 10% overrun for critical emergencies
      RETURN QUERY SELECT 
        TRUE, 
        v_current_count, 
        v_effective_max, 
        0,
        'Emergency booking - SOFT OVERRIDE (110% capacity exceeded for critical emergency)'::TEXT;
    ELSE
      RETURN QUERY SELECT 
        FALSE, 
        v_current_count, 
        v_effective_max, 
        0,
        FORMAT('Emergency booking - HARD LIMIT REACHED (%s/%s bookings, 110%% capacity exceeded)', 
          v_current_count, v_effective_max)::TEXT;
    END IF;
  ELSE
    -- Regular booking - must stay below emergency reserve threshold
    IF v_current_count < v_available_for_regular THEN
      RETURN QUERY SELECT 
        TRUE, 
        v_current_count, 
        v_available_for_regular, 
        v_available_for_regular - v_current_count,
        FORMAT('Capacity available (%s slots remaining, %s reserved for emergencies)', 
          v_available_for_regular - v_current_count, COALESCE(v_emergency_reserved, 0))::TEXT;
    ELSE
      RETURN QUERY SELECT 
        FALSE, 
        v_current_count, 
        v_available_for_regular, 
        0,
        FORMAT('Capacity FULL (%s/%s regular slots filled, %s reserved for emergencies)', 
          v_current_count, v_available_for_regular, COALESCE(v_emergency_reserved, 0))::TEXT;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_provider_capacity IS 
  'Validates if provider has capacity for new booking. Returns capacity_available (boolean), current count, max allowed, and reason.
  
  LOGIC:
  - Respects per_service vs global_provider capacity mode
  - Respects daily/weekly/concurrent time windows
  - Emergency bookings can use reserved slots + 10% soft override
  - Regular bookings limited to (max - emergency_reserved)
  
  USAGE:
  SELECT * FROM check_provider_capacity(
    ''provider-uuid'',
    ''service-uuid'',
    ''2026-01-15 10:00:00''::timestamptz,
    FALSE -- is_emergency
  );';

-- =============================================================================
-- STEP 4: Add capacity enforcement trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_provider_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity_check RECORD;
  v_is_emergency BOOLEAN;
BEGIN
  -- Skip if no provider assigned yet (assignment happens later)
  IF NEW.provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if no scheduled start time yet
  IF NEW.scheduled_start IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip capacity check for completed/cancelled bookings
  IF NEW.status IN ('completed', 'customer_confirmed', 'cancelled_customer', 'cancelled_provider') THEN
    RETURN NEW;
  END IF;

  -- Determine if emergency booking (from booking_flow_type)
  v_is_emergency := NEW.booking_flow_type = 'emergency';

  -- Check capacity
  SELECT * INTO v_capacity_check
  FROM check_provider_capacity(
    NEW.provider_id,
    NEW.service_id,
    NEW.scheduled_start,
    v_is_emergency
  );

  -- If no capacity available, flag for reassignment
  IF NOT v_capacity_check.capacity_available THEN
    -- Set status to needs_reassignment
    NEW.status := 'needs_reassignment';
    
    -- Add note to provider_notes (preserve existing notes if any)
    IF NEW.provider_notes IS NULL OR NEW.provider_notes = '' THEN
      NEW.provider_notes := v_capacity_check.reason;
    ELSE
      NEW.provider_notes := NEW.provider_notes || ' | CAPACITY: ' || v_capacity_check.reason;
    END IF;
    
    -- Create notification for provider
    INSERT INTO notifications (
      id,
      user_id, 
      user_role, 
      type, 
      title, 
      message, 
      booking_id, 
      created_at
    ) VALUES (
      gen_random_uuid(),
      (SELECT user_id FROM service_providers WHERE id = NEW.provider_id),
      'provider',
      'capacity_overflow',
      'Booking Flagged for Reassignment - Capacity Full',
      FORMAT('Your capacity is full: %s/%s bookings. This booking (#%s) has been flagged for reassignment to another provider. Reason: %s', 
        v_capacity_check.current_bookings, 
        v_capacity_check.max_bookings,
        LEFT(NEW.id::TEXT, 8),
        v_capacity_check.reason),
      NEW.id,
      NOW()
    );

    -- Create notification for customer
    INSERT INTO notifications (
      id,
      user_id, 
      user_role, 
      type, 
      title, 
      message, 
      booking_id, 
      created_at
    ) VALUES (
      gen_random_uuid(),
      NEW.customer_id,
      'customer',
      'booking_reassignment_pending',
      'Finding Alternate Provider',
      'The originally selected provider is at capacity. We are finding an alternate verified provider in your area. You will be notified shortly.',
      NEW.id,
      NOW()
    );

    -- Log to status history
    INSERT INTO booking_status_history (
      booking_id,
      from_status,
      to_status,
      changed_by,
      changed_by_role,
      reason,
      notes,
      created_at
    ) VALUES (
      NEW.id,
      OLD.status,
      'needs_reassignment',
      NEW.provider_id,
      'system',
      'Provider capacity exceeded',
      v_capacity_check.reason,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_provider_capacity_trigger ON bookings;
CREATE TRIGGER check_provider_capacity_trigger
  BEFORE INSERT OR UPDATE OF provider_id, scheduled_start, status
  ON bookings
  FOR EACH ROW
  WHEN (
    NEW.provider_id IS NOT NULL
    AND NEW.scheduled_start IS NOT NULL
    AND NEW.status NOT IN ('completed', 'customer_confirmed', 'cancelled_customer', 'cancelled_provider')
  )
  EXECUTE FUNCTION enforce_provider_capacity();

COMMENT ON TRIGGER check_provider_capacity_trigger ON bookings IS
  'Automatically checks provider capacity when booking assigned or scheduled time changes.
  If capacity exceeded, sets status to needs_reassignment and notifies customer + provider.
  Emergency bookings get priority access to reserved slots.
  
  TRIGGERS ON:
  - INSERT (new booking assigned to provider)
  - UPDATE of provider_id (reassignment)
  - UPDATE of scheduled_start (reschedule)
  - UPDATE of status (status change)
  
  SKIPS:
  - Bookings without provider assigned (provider_id IS NULL)
  - Bookings without schedule (scheduled_start IS NULL)
  - Completed/cancelled bookings';

-- =============================================================================
-- STEP 5: Add capacity monitoring view
-- =============================================================================

CREATE OR REPLACE VIEW provider_capacity_status AS
SELECT 
  sp.id AS provider_id,
  sp.business_name,
  ps.service_id,
  s.name AS service_name,
  s.slug AS service_slug,
  COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) AS max_capacity,
  sp.emergency_capacity_reserved,
  COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) - 
    COALESCE(sp.emergency_capacity_reserved, 0) AS available_for_regular,
  COUNT(b.id) FILTER (
    WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
  ) AS current_bookings,
  COUNT(b.id) FILTER (
    WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
      AND b.booking_flow_type = 'emergency'
  ) AS current_emergency_bookings,
  COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) - 
    COALESCE(sp.emergency_capacity_reserved, 0) - 
    COUNT(b.id) FILTER (
      WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
    ) AS slots_available,
  ROUND(
    (COUNT(b.id) FILTER (
      WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
    )::NUMERIC / 
    NULLIF(
      COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) - 
      COALESCE(sp.emergency_capacity_reserved, 0), 
      0
    )) * 100, 
    1
  ) AS utilization_percent,
  CASE 
    WHEN COUNT(b.id) FILTER (
      WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
    ) >= COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) - COALESCE(sp.emergency_capacity_reserved, 0)
    THEN 'FULL'
    WHEN COUNT(b.id) FILTER (
      WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
    ) >= (COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) - COALESCE(sp.emergency_capacity_reserved, 0)) * 0.8
    THEN 'HIGH'
    WHEN COUNT(b.id) FILTER (
      WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
    ) >= (COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) - COALESCE(sp.emergency_capacity_reserved, 0)) * 0.5
    THEN 'MEDIUM'
    ELSE 'LOW'
  END AS capacity_status,
  ps.capacity_time_window,
  sp.capacity_mode,
  sp.is_active AS provider_active,
  ps.is_active AS service_active
FROM service_providers sp
JOIN provider_services ps ON ps.provider_id = sp.id
JOIN services s ON s.id = ps.service_id
LEFT JOIN bookings b ON b.provider_id = sp.id AND b.service_id = ps.service_id
WHERE sp.is_active = TRUE AND ps.is_active = TRUE
GROUP BY 
  sp.id, 
  sp.business_name, 
  ps.service_id, 
  s.name, 
  s.slug,
  ps.max_concurrent_bookings, 
  sp.max_concurrent_bookings, 
  sp.emergency_capacity_reserved,
  ps.capacity_time_window,
  sp.capacity_mode,
  sp.is_active,
  ps.is_active
ORDER BY utilization_percent DESC NULLS LAST;

COMMENT ON VIEW provider_capacity_status IS 
  'Real-time view of provider capacity utilization per service. 
  Shows current bookings, available slots, utilization percentage, and capacity status.
  
  CAPACITY_STATUS values:
  - FULL: At or above regular capacity (emergency slots may still be available)
  - HIGH: 80-99% utilization
  - MEDIUM: 50-79% utilization
  - LOW: < 50% utilization
  
  USE CASES:
  - Provider dashboard: Show providers their own capacity status
  - Admin dashboard: Monitor system-wide capacity
  - Matching algorithm: Prioritize providers with LOW/MEDIUM capacity
  - Analytics: Track capacity trends over time';

-- =============================================================================
-- STEP 6: Add index for capacity queries (performance optimization)
-- =============================================================================

-- Index for counting active bookings by provider + service
CREATE INDEX IF NOT EXISTS idx_bookings_capacity_check 
ON bookings(provider_id, service_id, status, scheduled_start)
WHERE status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress');

-- Index for emergency bookings
CREATE INDEX IF NOT EXISTS idx_bookings_emergency 
ON bookings(provider_id, booking_flow_type, status)
WHERE booking_flow_type = 'emergency' 
  AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress');

-- Index for needs_reassignment status
CREATE INDEX IF NOT EXISTS idx_bookings_needs_reassignment
ON bookings(status, service_id, created_at)
WHERE status = 'needs_reassignment';

COMMENT ON INDEX idx_bookings_capacity_check IS 'Optimizes capacity counting queries - used by check_provider_capacity function';
COMMENT ON INDEX idx_bookings_emergency IS 'Optimizes emergency booking capacity queries';
COMMENT ON INDEX idx_bookings_needs_reassignment IS 'Optimizes queries for bookings awaiting reassignment';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
