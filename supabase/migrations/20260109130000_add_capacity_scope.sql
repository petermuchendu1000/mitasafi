-- =============================================================================
-- BLOCKER 1 FIX: Add capacity_scope column to provider_services
-- Date: 2026-01-09
-- Purpose: Explicitly declare whether capacity is per-service or provider-wide
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md (Question 2, Validation Rule 1)
-- =============================================================================

-- Create ENUM type
DO $$ BEGIN
  CREATE TYPE capacity_scope_type AS ENUM ('per_service', 'provider_wide');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add column with temporary default for existing data
ALTER TABLE provider_services
ADD COLUMN capacity_scope capacity_scope_type NOT NULL DEFAULT 'per_service';

-- Drop default to force explicit specification during seeding
ALTER TABLE provider_services
ALTER COLUMN capacity_scope DROP DEFAULT;

COMMENT ON COLUMN provider_services.capacity_scope IS
  'Capacity scoping mode (MUST BE EXPLICITLY SET - NO DEFAULT).
  
  SEEDING REQUIREMENT:
    Every provider_services row MUST explicitly specify capacity_scope.
    No default prevents inconsistent assumptions during seeding.
  
  per_service:
    - Capacity is scoped to THIS service only
    - Example: Cleaning company with 3 teams can do 3 cleaning jobs simultaneously
    - Seed rule: Can have different concurrent_units per service
  
  provider_wide:
    - Capacity is shared across ALL provider services
    - Example: Solo handyman can do plumbing OR electrical, but only 1 job total
    - Seed rule: ALL provider services MUST have IDENTICAL concurrent_units
  
  VALIDATION:
    - Config-time: validate_provider_capacity_scope() enforces uniformity
    - Failure mode: If seeding provider_wide with mismatched units → EXCEPTION';

-- Ensure concurrent_units is NOT NULL and positive (critical for capacity math)
ALTER TABLE provider_services
ALTER COLUMN concurrent_units SET NOT NULL;

ALTER TABLE provider_services
DROP CONSTRAINT IF EXISTS concurrent_units_positive;

ALTER TABLE provider_services
ADD CONSTRAINT concurrent_units_positive CHECK (concurrent_units > 0);

COMMENT ON CONSTRAINT concurrent_units_positive ON provider_services IS
  'Ensures concurrent_units is always positive.
  Critical: NULL or zero would break capacity calculations.';

-- Note: Column comment already updated above after DROP DEFAULT

-- Create validation function
CREATE OR REPLACE FUNCTION validate_provider_capacity_scope()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id UUID;
  v_capacity_scope capacity_scope_type;
  v_concurrent_units INTEGER;
  v_units_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_provider_id := NEW.provider_id;
    v_capacity_scope := NEW.capacity_scope;
    v_concurrent_units := NEW.concurrent_units;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If capacity_scope, concurrent_units, AND provider_id unchanged, skip validation
    IF OLD.capacity_scope = NEW.capacity_scope 
       AND OLD.concurrent_units = NEW.concurrent_units
       AND OLD.provider_id = NEW.provider_id THEN
      RETURN NEW;
    END IF;
    v_provider_id := NEW.provider_id;
    v_capacity_scope := NEW.capacity_scope;
    v_concurrent_units := NEW.concurrent_units;
  END IF;

  -- Serialize validation per provider (prevent write-skew race condition)
  PERFORM pg_advisory_xact_lock(hashtext(v_provider_id::text));

  -- If capacity_scope = provider_wide, enforce uniform concurrent_units
  IF v_capacity_scope = 'provider_wide' THEN
    SELECT COUNT(DISTINCT concurrent_units) INTO v_units_count
    FROM provider_services
    WHERE provider_id = v_provider_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    -- If provider has other services with different concurrent_units (active OR inactive)
    IF v_units_count > 0 THEN
      -- Check if they all match NEW.concurrent_units
      IF EXISTS (
        SELECT 1 FROM provider_services
        WHERE provider_id = v_provider_id
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND concurrent_units != v_concurrent_units
      ) THEN
        RAISE EXCEPTION 'capacity_scope=provider_wide requires uniform concurrent_units across all provider services (provider: %, required units: %)', v_provider_id, v_concurrent_units;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS validate_capacity_scope ON provider_services;
CREATE TRIGGER validate_capacity_scope
  BEFORE INSERT OR UPDATE
  ON provider_services
  FOR EACH ROW
  EXECUTE FUNCTION validate_provider_capacity_scope();

COMMENT ON FUNCTION validate_provider_capacity_scope IS
  'Enforces capacity_scope invariant: provider_wide requires uniform concurrent_units.
  
  BLOCKS:
    - Setting provider_wide when services have mismatched concurrent_units
    - Changing concurrent_units to create mismatch when provider_wide
  
  ALLOWS:
    - per_service with any concurrent_units (no cross-service validation)
    - provider_wide when all services have matching concurrent_units';

-- Prevent deletion of services with active commitments
CREATE OR REPLACE FUNCTION prevent_service_deletion_with_commitments()
RETURNS TRIGGER AS $$
DECLARE
  v_commitment_count INTEGER;
BEGIN
  -- Only enforce if booking_commitments table exists
  IF to_regclass('booking_commitments') IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Check for active commitments
  EXECUTE format(
    'SELECT COUNT(*) FROM booking_commitments WHERE provider_id = $1 AND service_id = $2 AND released_at IS NULL'
  ) INTO v_commitment_count USING OLD.provider_id, OLD.service_id;
  
  IF v_commitment_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete provider_service with % active commitments (provider: %, service: %)', 
      v_commitment_count, OLD.provider_id, OLD.service_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_service_deletion ON provider_services;
CREATE TRIGGER prevent_service_deletion
  BEFORE DELETE
  ON provider_services
  FOR EACH ROW
  EXECUTE FUNCTION prevent_service_deletion_with_commitments();

COMMENT ON TRIGGER prevent_service_deletion ON provider_services IS
  'Prevents deletion of provider_services with active commitments.
  Enforces referential integrity for capacity semantics.';

COMMENT ON FUNCTION prevent_service_deletion_with_commitments IS
  'Blocks DELETE on provider_services if active commitments exist.
  
  SAFETY:
    - Guards against orphaning capacity reservations
    - Requires explicit commitment release before service removal
    - Safe to run before booking_commitments table exists (uses to_regclass guard)';
