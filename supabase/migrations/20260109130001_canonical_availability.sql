-- =============================================================================
-- BLOCKER 2 FIX: Declare canonical availability model
-- Date: 2026-01-09
-- Purpose: Provider_availability_intervals is authoritative (deprecate weekly model)
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md (Known Limitations #2)
-- =============================================================================

-- Mark old table as deprecated
COMMENT ON TABLE provider_availability IS
  'DEPRECATED: Use provider_availability_intervals instead.
  
  This table (weekly recurring schedule) cannot handle:
    - Overnight shifts (crosses midnight)
    - Multi-day availability
    - Specific date blackouts
    - Emergency-only windows
  
  STATUS: Read-only for backward compatibility
  MIGRATION PATH: Seed new providers using provider_availability_intervals only';

-- Lock down writes to deprecated table (prevent dual authority)
REVOKE INSERT, UPDATE, DELETE ON provider_availability FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON provider_availability FROM anon;
REVOKE INSERT, UPDATE, DELETE ON provider_availability FROM authenticated;

-- Add trigger to block writes with helpful error
CREATE OR REPLACE FUNCTION reject_provider_availability_writes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'provider_availability is deprecated and READ-ONLY'
    USING HINT = 'Use provider_availability_intervals instead',
          DETAIL = 'See migration 20260109130001_canonical_availability.sql';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_deprecated_availability_writes ON provider_availability;
CREATE TRIGGER block_deprecated_availability_writes
  BEFORE INSERT OR UPDATE OR DELETE
  ON provider_availability
  FOR EACH ROW
  EXECUTE FUNCTION reject_provider_availability_writes();

COMMENT ON TRIGGER block_deprecated_availability_writes ON provider_availability IS
  'Enforces read-only status of deprecated availability table.
  Prevents accidental writes that would create dual authority with provider_availability_intervals.';

-- Update availability check function comment to be explicit
COMMENT ON FUNCTION check_provider_availability_interval IS
  'Authoritative availability check (USES provider_availability_intervals ONLY).
  
  USES: provider_availability_intervals (absolute intervals)
  IGNORES: provider_availability (deprecated weekly model)
  
  LOGIC:
    1. Find any active intervals covering requested time
    2. If is_emergency and no emergency-only conflict → ALLOW
    3. If not emergency and interval exists → ALLOW
    4. Otherwise → REJECT (no availability configured)
  
  EMERGENCY BYPASS:
    - Emergency bookings skip availability check entirely (24/7 assumed)
    - Unless is_emergency_only=true interval blocks it';

-- Document seeding strategy
COMMENT ON TABLE provider_availability_intervals IS
  'CANONICAL availability model (replaces provider_availability).
  
  HANDLES:
    - Overnight shifts (available_from 22:00 → available_to 06:00 next day)
    - Multi-day availability (Monday 00:00 → Friday 23:59)
    - Specific date ranges (blackout Dec 24-26)
    - Emergency-only windows (available but only for emergencies)
  
  SEEDING STRATEGY:
    - New providers: Create intervals directly
    - Existing providers: Migrate weekly schedules via script
    - Emergency services: Set is_emergency_only=false (allows all) or true (emergency-only)
  
  INDEXES:
    - GIST index on (provider_id, service_id, tstzrange) for fast overlap queries
    - WHERE is_active for filtering';

-- Add GIST exclusion constraint to prevent overlapping intervals
ALTER TABLE provider_availability_intervals
ADD CONSTRAINT no_overlapping_availability
EXCLUDE USING GIST (
  provider_id WITH =,
  COALESCE(service_id, '00000000-0000-0000-0000-000000000000'::UUID) WITH =,
  tstzrange(available_from, available_to) WITH &&
);

COMMENT ON CONSTRAINT no_overlapping_availability ON provider_availability_intervals IS
  'Prevents overlapping availability intervals for same provider+service.
  
  ENFORCES:
    - No double-booking of availability windows
    - No conflicting emergency-only flags for same time
    - Deterministic availability resolution
  
  SEEDING RESTRICTION (CRITICAL):
    ⚠️ DO NOT MIX NULL service_id with service-specific intervals:
    
    ❌ BLOCKED BY CONSTRAINT:
      INSERT (provider_id=X, service_id=NULL, 9am-5pm);    -- Global
      INSERT (provider_id=X, service_id=plumbing, 10am-2pm); -- Specific (OVERLAPS)
    
    ✅ ALLOWED PATTERNS:
      Option 1: Global only (service_id=NULL for all intervals)
      Option 2: Per-service only (service_id specified for all intervals)
    
    Choose ONE pattern per provider during seeding.
  
  USES GIST:
    - Efficiently detects range overlaps
    - Handles NULL service_id via COALESCE (treats NULL as single value)';
