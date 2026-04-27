-- =============================================================================
-- BLOCKER 4 FIX: Rename busy_from/busy_to to clarify they are ESTIMATES
-- Date: 2026-01-09
-- Purpose: Prevent confusion with canonical commitment time
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md (Invariant 5, Known Limitation #1)
-- =============================================================================

-- Safety check: Detect functions/views that still reference old column names
DO $$
DECLARE
  v_dependent_objects TEXT;
BEGIN
  -- Check for dependencies on busy_from/busy_to columns
  SELECT string_agg(DISTINCT depobj.objid::regclass::text, ', ')
  INTO v_dependent_objects
  FROM pg_depend d
  JOIN pg_attribute a ON (a.attrelid = d.refobjid AND a.attnum = d.refobjsubid)
  JOIN LATERAL (
    SELECT d.objid
  ) depobj ON true
  WHERE d.refobjid = 'bookings'::regclass
    AND a.attname IN ('busy_from', 'busy_to')
    AND d.deptype = 'n'  -- normal dependency
    AND d.objid != 'bookings'::regclass;  -- exclude self
  
  IF v_dependent_objects IS NOT NULL THEN
    RAISE WARNING 'Objects still reference busy_from/busy_to: %', v_dependent_objects
      USING HINT = 'Update these objects to use estimated_busy_from/estimated_busy_to first';
    -- Note: Using WARNING not EXCEPTION to allow migration if user confirms
  END IF;
END $$;

-- Rename columns to indicate pre-commitment estimates
ALTER TABLE bookings RENAME COLUMN busy_from TO estimated_busy_from;
ALTER TABLE bookings RENAME COLUMN busy_to TO estimated_busy_to;

-- Update column comments
COMMENT ON COLUMN bookings.estimated_busy_from IS
  'ESTIMATED start of provider busy time (PRE-COMMITMENT ONLY).
  
  STATUS: Pre-commitment estimate, NOT authoritative for capacity
  
  CANONICAL TIME SOURCE: booking_commitments.active_from
  
  SEMANTICS:
    - BEFORE confirmation: Estimated busy period for capacity preview
    - AFTER confirmation: booking_commitments.active_from is THE truth
  
  DO NOT USE FOR:
    - Capacity calculation (use booking_commitments.active_from)
    - Time overlap detection (use booking_commitments.active_from)
    - Provider utilization queries (use booking_commitments.active_from)
  
  CAN USE FOR:
    - UI preview before confirmation
    - Tentative scheduling
    - Quote estimation';

COMMENT ON COLUMN bookings.estimated_busy_to IS
  'ESTIMATED end of provider busy time (PRE-COMMITMENT ONLY).
  
  STATUS: Pre-commitment estimate, NOT authoritative for capacity
  
  CANONICAL TIME SOURCE: booking_commitments.active_to
  
  See estimated_busy_from comment for full semantics.';

-- Drop old capacity index (was using wrong fields)
DROP INDEX IF EXISTS idx_bookings_busy_time_overlap;

-- Update estimated_duration_minutes trigger to use new names
CREATE OR REPLACE FUNCTION calculate_busy_to_from_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate estimated_busy_to from estimated_busy_from + duration
  IF NEW.estimated_busy_from IS NOT NULL AND NEW.estimated_duration_minutes IS NOT NULL THEN
    NEW.estimated_busy_to := NEW.estimated_busy_from + 
      (NEW.estimated_duration_minutes || ' minutes')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_busy_to ON bookings;
CREATE TRIGGER calculate_busy_to
  BEFORE INSERT OR UPDATE OF estimated_busy_from, estimated_duration_minutes
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_busy_to_from_duration();

COMMENT ON FUNCTION calculate_busy_to_from_duration IS
  'Calculates estimated_busy_to from estimated_busy_from + estimated_duration_minutes.
  
  SCOPE: Pre-commitment estimates only
  NOT USED FOR: Capacity calculation (use booking_commitments)';

-- Update capacity check functions to explicitly ignore these fields
COMMENT ON FUNCTION check_provider_capacity_with_units IS
  'Capacity check using concurrent_units (v1 approved).
  
  IGNORES:
    - bookings.estimated_busy_from/estimated_busy_to (pre-commitment estimates)
    - bookings.scheduled_start/scheduled_end (customer-facing times)
    - bookings.status (inferred commitment)
  
  USES:
    - booking_commitments.active_from/active_to (canonical time)
    - booking_commitments.released_at IS NULL (active commitments)
    - booking_commitments.capacity_units (discrete units)
  
  FUTURE: This function will be replaced by commitment-based capacity check.';

-- Add backward compatibility view for renamed columns (TEMPORARY)
CREATE OR REPLACE VIEW bookings_with_legacy_busy AS
SELECT
  *,
  estimated_busy_from AS busy_from,
  estimated_busy_to AS busy_to
FROM bookings;

COMMENT ON VIEW bookings_with_legacy_busy IS
  '⛔ DO NOT USE IN APPLICATION CODE ⛔
  
  TEMPORARY backward compatibility ONLY for migration window.
  
  ⚠️ WARNING:
    - This view re-introduces busy_from/busy_to semantics
    - These fields are PRE-COMMITMENT ESTIMATES, not canonical time
    - Using this in capacity logic will violate commitment model
  
  AUTHORIZED USE:
    - Migration scripts converting old queries
    - Admin/support tools (read-only)
  
  FORBIDDEN:
    - Capacity calculations
    - Booking conflict detection
    - Provider utilization queries
  
  DEPRECATION:
    - Remove after all code updated to estimated_busy_*
    - Target: Next major version';

-- Lock down access (allow only admin role)
REVOKE ALL ON bookings_with_legacy_busy FROM PUBLIC;
REVOKE ALL ON bookings_with_legacy_busy FROM anon;
REVOKE ALL ON bookings_with_legacy_busy FROM authenticated;
-- Grant to admin role only (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON bookings_with_legacy_busy TO service_role;
  END IF;
END $$;

-- Add INSTEAD OF trigger to block ALL writes (hard enforcement)
CREATE OR REPLACE FUNCTION reject_legacy_busy_view_writes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '⛔ bookings_with_legacy_busy is READ-ONLY'
    USING HINT = 'Use bookings table directly with estimated_busy_from/estimated_busy_to',
          DETAIL = 'This view exists only for backward compatibility during migration';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reject_legacy_busy_view_writes ON bookings_with_legacy_busy;
CREATE TRIGGER reject_legacy_busy_view_writes
  INSTEAD OF INSERT OR UPDATE OR DELETE
  ON bookings_with_legacy_busy
  FOR EACH ROW
  EXECUTE FUNCTION reject_legacy_busy_view_writes();

COMMENT ON TRIGGER reject_legacy_busy_view_writes ON bookings_with_legacy_busy IS
  'Hard block on writes to legacy compatibility view.
  Prevents accidental use in seeding scripts or admin tools.';
