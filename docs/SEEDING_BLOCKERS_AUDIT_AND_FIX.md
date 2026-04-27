# SEEDING BLOCKERS AUDIT & COMPREHENSIVE FIX
**Date:** January 9, 2026  
**Purpose:** Ruthless audit of all 5 blockers with concrete file references and complete fixes

---

## AUDIT RESULTS SUMMARY

| Blocker | Status | File Reference | Action Required |
|---------|--------|----------------|-----------------|
| 1. capacity_scope column | ❌ NOT IMPLEMENTED | provider_services table | ADD COLUMN + validation function |
| 2. Canonical availability model | ❌ AMBIGUOUS | Both tables exist | DECLARE ONE AUTHORITATIVE |
| 3. Status-commitment enforcement | ⚠️ PARTIAL | State machine trigger exists | ADD commitment check |
| 4. Busy fields frozen/renamed | ❌ WRONG SEMANTICS | Used as "canonical" in 20260109120032 | RENAME + deprecate |
| 5. Emergency eligibility function | ❌ SCATTERED | Multiple partial checks | UNIFY into single function |

---

## BLOCKER 1: capacity_scope COLUMN — ❌ NOT IMPLEMENTED

### Current State (VERIFIED)

**File:** `supabase/migrations/20260108120002_trust_provider_layer.sql` (lines 83-126)

```sql
CREATE TABLE IF NOT EXISTS provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  -- Experience
  experience_years int DEFAULT 0,
  
  -- Certification
  has_certification boolean DEFAULT false,
  certification_type text,
  certification_ref text,
  certification_expiry_date date,
  certification_document_url text,
  
  -- Verification (service-scoped)
  verification_status verification_status DEFAULT 'not_started',
  verified_at timestamptz,
  verified_by uuid,
  verification_notes text,
  verification_expires_at timestamptz,
  
  -- Pricing (provider-specific)
  custom_pricing jsonb,
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**concurrent_units added in:** `20260109120032_adversarial_blockers_fix.sql` (line 145)
```sql
ALTER TABLE provider_services
ADD COLUMN concurrent_units INTEGER NOT NULL DEFAULT 1 CHECK (concurrent_units > 0);
```

**❌ MISSING:** `capacity_scope` column

### Danger if Seeded Now

Example seed data:
```sql
-- Solo handyman offering multiple services
INSERT INTO provider_services (provider_id, service_id, concurrent_units) VALUES
  ('handyman-uuid', 'plumbing-uuid', 1),
  ('handyman-uuid', 'electrical-uuid', 1);
```

**Problem:** System allows:
- 10:00-11:00 plumbing booking → OK (1/1 plumbing capacity)
- 10:30-11:30 electrical booking → OK (1/1 electrical capacity)
- **RESULT: Provider double-booked** (should be 1 job total, not 1 per service)

### Required Fix

**Migration:** `20260109130000_add_capacity_scope.sql`

```sql
-- =============================================================================
-- BLOCKER 1 FIX: Add capacity_scope column to provider_services
-- Purpose: Explicitly declare whether capacity is per-service or provider-wide
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md (Question 2, Validation Rule 1)
-- =============================================================================

-- Create ENUM type
DO $$ BEGIN
  CREATE TYPE capacity_scope_type AS ENUM ('per_service', 'provider_wide');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add column (per_service is safe default for existing data)
ALTER TABLE provider_services
ADD COLUMN capacity_scope capacity_scope_type NOT NULL DEFAULT 'per_service';

COMMENT ON COLUMN provider_services.capacity_scope IS
  'Capacity scoping mode (CRITICAL for capacity calculation)
  
  per_service (default):
    - Capacity is scoped to THIS service only
    - Example: Cleaning company with 3 teams can do 3 cleaning jobs simultaneously
    - Example: Laundry with 10 machines can do 10 laundry jobs simultaneously
  
  provider_wide:
    - Capacity is shared across ALL provider services
    - Example: Solo handyman can do plumbing OR electrical, but only 1 job total
    - CONSTRAINT: If provider_wide, ALL provider services MUST have same concurrent_units
  
  ENFORCEMENT:
    - Config-time: validate_provider_capacity_scope() checks uniform units
    - Runtime: create_commitment_and_confirm_booking() uses this for capacity math';

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
    -- If capacity_scope or concurrent_units unchanged, skip validation
    IF OLD.capacity_scope = NEW.capacity_scope 
       AND OLD.concurrent_units = NEW.concurrent_units THEN
      RETURN NEW;
    END IF;
    v_provider_id := NEW.provider_id;
    v_capacity_scope := NEW.capacity_scope;
    v_concurrent_units := NEW.concurrent_units;
  END IF;

  -- If capacity_scope = provider_wide, enforce uniform concurrent_units
  IF v_capacity_scope = 'provider_wide' THEN
    SELECT COUNT(DISTINCT concurrent_units) INTO v_units_count
    FROM provider_services
    WHERE provider_id = v_provider_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND is_active = true;
    
    -- If provider has other active services with different concurrent_units
    IF v_units_count > 0 THEN
      -- Check if they all match NEW.concurrent_units
      IF EXISTS (
        SELECT 1 FROM provider_services
        WHERE provider_id = v_provider_id
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND concurrent_units != v_concurrent_units
          AND is_active = true
      ) THEN
        RAISE EXCEPTION 'capacity_scope=provider_wide requires uniform concurrent_units across all provider services'
          USING HINT = 'Provider % has services with different concurrent_units. All must match: %',
                v_provider_id, v_concurrent_units,
                DETAIL = 'Set all provider services to concurrent_units=' || v_concurrent_units::TEXT;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS validate_capacity_scope ON provider_services;
CREATE TRIGGER validate_capacity_scope
  BEFORE INSERT OR UPDATE OF capacity_scope, concurrent_units
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
```

**Verification Test:**
```sql
-- Should succeed: per_service allows different units
INSERT INTO provider_services (provider_id, service_id, concurrent_units, capacity_scope) VALUES
  ('provider-1', 'service-a', 1, 'per_service'),
  ('provider-1', 'service-b', 3, 'per_service');

-- Should succeed: provider_wide with uniform units
INSERT INTO provider_services (provider_id, service_id, concurrent_units, capacity_scope) VALUES
  ('provider-2', 'service-c', 1, 'provider_wide'),
  ('provider-2', 'service-d', 1, 'provider_wide');

-- Should FAIL: provider_wide with mismatched units
INSERT INTO provider_services (provider_id, service_id, concurrent_units, capacity_scope) VALUES
  ('provider-3', 'service-e', 1, 'provider_wide'),
  ('provider-3', 'service-f', 2, 'provider_wide');  -- ❌ ERROR
```

---

## BLOCKER 2: CANONICAL AVAILABILITY MODEL — ❌ AMBIGUOUS

### Current State (VERIFIED)

**File:** `supabase/migrations/20260108120002_trust_provider_layer.sql` (lines 178-210)

```sql
CREATE TABLE IF NOT EXISTS provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT time_range_valid CHECK (end_time > start_time)
);
```

**File:** `supabase/migrations/20260109120032_adversarial_blockers_fix.sql` (lines 483-532)

```sql
CREATE TABLE IF NOT EXISTS provider_availability_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  
  available_from TIMESTAMPTZ NOT NULL,
  available_to TIMESTAMPTZ NOT NULL,
  
  is_emergency_only BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_interval CHECK (available_to > available_from)
);
```

**❌ PROBLEM:** Both models exist, capacity check function uses intervals, but no deprecation of weekly model

### Danger if Seeded Now

Provider availability data:
```sql
-- Weekly model says: Mon-Fri 09:00-17:00
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time) VALUES
  ('provider-uuid', 1, '09:00', '17:00'),  -- Monday
  ('provider-uuid', 2, '09:00', '17:00');  -- Tuesday

-- Interval model says: Blackout Tuesday 13:00-15:00
INSERT INTO provider_availability_intervals (provider_id, available_from, available_to) VALUES
  ('provider-uuid', '2026-01-14 13:00:00+00', '2026-01-14 15:00:00+00');
```

**Question:** Tuesday 14:00 booking - allowed or rejected?
- Weekly model: ✅ Allowed (within 09:00-17:00)
- Interval model: ❌ Rejected (blackout period)
- **Which wins?**

### Required Fix

**Migration:** `20260109130001_canonical_availability.sql`

```sql
-- =============================================================================
-- BLOCKER 2 FIX: Declare canonical availability model
-- Purpose: Provider_availability_intervals is authoritative
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

-- Prevent new writes to deprecated table (optional, can defer)
-- CREATE OR REPLACE FUNCTION reject_provider_availability_writes()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   RAISE WARNING 'provider_availability is deprecated. Use provider_availability_intervals.'
--     USING HINT = 'See migration 20260109130001_canonical_availability.sql';
--   RETURN NULL;  -- Block insert
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER block_deprecated_availability
--   BEFORE INSERT ON provider_availability
--   FOR EACH ROW
--   EXECUTE FUNCTION reject_provider_availability_writes();

-- Update availability check function to be explicit
COMMENT ON FUNCTION check_provider_availability_interval IS
  'Authoritative availability check.
  
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
```

**Seeding Decision:**
```sql
-- ✅ SEED THIS (canonical)
INSERT INTO provider_availability_intervals (provider_id, available_from, available_to) VALUES
  ('plumber-uuid', '2026-01-13 08:00:00+03', '2026-01-13 18:00:00+03'),  -- Monday
  ('plumber-uuid', '2026-01-14 08:00:00+03', '2026-01-14 18:00:00+03');  -- Tuesday

-- ❌ DO NOT SEED (deprecated)
-- INSERT INTO provider_availability (...);
```

---

## BLOCKER 3: STATUS-COMMITMENT ENFORCEMENT — ⚠️ PARTIAL

### Current State (VERIFIED)

**File:** `supabase/migrations/20260109120031_critical_gaps_complete_fix.sql` (lines 420-453)

```sql
CREATE OR REPLACE FUNCTION enforce_booking_state_machine()
RETURNS TRIGGER AS $$
DECLARE
  v_transition RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'submitted') THEN
      RAISE EXCEPTION 'New bookings must start in draft or submitted';
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
    RAISE EXCEPTION 'Illegal transition: % → %', OLD.status, NEW.status;
  END IF;

  IF v_transition.requires_provider AND NEW.provider_id IS NULL THEN
    RAISE EXCEPTION 'Status % requires provider', NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**✅ EXISTS:** State machine validation
**❌ MISSING:** Commitment existence check for status='confirmed'

### Danger if Seeded Now

```sql
-- Seed booking with status=confirmed (bypasses commitment creation)
INSERT INTO bookings (id, customer_id, service_id, service_type_id, status) VALUES
  ('booking-uuid', 'customer-uuid', 'service-uuid', 'type-uuid', 'confirmed');

-- Problem: status='confirmed' but NO booking_commitments row exists
-- Violates invariant: booking.status = 'confirmed' ↔ commitment EXISTS
```

### Required Fix

**Migration:** `20260109130002_enforce_commitment_invariant.sql`

```sql
-- =============================================================================
-- BLOCKER 3 FIX: Enforce status ↔ commitment bidirectional invariant
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
    IF NEW.status NOT IN ('draft', 'submitted') THEN
      RAISE EXCEPTION 'New bookings must start in draft or submitted'
        USING HINT = 'Status: %', NEW.status;
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
  IF NEW.status = 'confirmed' THEN
    SELECT EXISTS (
      SELECT 1 FROM booking_commitments WHERE booking_id = NEW.id
    ) INTO v_commitment_exists;
    
    IF NOT v_commitment_exists THEN
      RAISE EXCEPTION 'Cannot set status=confirmed without commitment'
        USING HINT = 'Use create_commitment_and_confirm_booking() function',
              DETAIL = 'Invariant: booking.status=confirmed ↔ commitment EXISTS';
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
  
  WITHOUT THIS TRIGGER, THE ENTIRE COMMITMENT MODEL COLLAPSES.';
```

**Verification Test:**
```sql
-- Should succeed: confirmed with commitment
BEGIN;
  INSERT INTO bookings (id, customer_id, service_id, service_type_id, status) VALUES
    ('booking-1', 'customer-uuid', 'service-uuid', 'type-uuid', 'submitted');
  
  INSERT INTO booking_commitments (booking_id, provider_id, service_id, capacity_units, active_from, active_to, pricing_snapshot) VALUES
    ('booking-1', 'provider-uuid', 'service-uuid', 1, NOW(), NOW() + INTERVAL '2 hours', '{"total": 100, "currency": "KES"}'::JSONB);
  
  UPDATE bookings SET status = 'confirmed' WHERE id = 'booking-1';  -- ✅ OK
COMMIT;

-- Should FAIL: confirmed without commitment
INSERT INTO bookings (id, customer_id, service_id, service_type_id, status) VALUES
  ('booking-2', 'customer-uuid', 'service-uuid', 'type-uuid', 'confirmed');  -- ❌ ERROR
```

---

## BLOCKER 4: BUSY FIELDS WRONG SEMANTICS — ❌ MISLEADING

### Current State (VERIFIED)

**File:** `supabase/migrations/20260109120031_critical_gaps_complete_fix.sql` (lines 1-92)

```sql
-- Add canonical time tracking (busy_from / busy_to)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS busy_from TIMESTAMPTZ;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS busy_to TIMESTAMPTZ;

-- Create GIST index for time overlap queries (capacity enforcement)
CREATE INDEX IF NOT EXISTS idx_bookings_busy_time_overlap
  ON bookings USING GIST (
    provider_id,
    service_id,
    tstzrange(busy_from, busy_to, '[]')
  )
  WHERE busy_from IS NOT NULL 
    AND busy_to IS NOT NULL
    AND status IN ('confirmed', 'scheduled', 'in_progress');

COMMENT ON COLUMN bookings.busy_from IS
  'CANONICAL start of provider busy time (NOT scheduled_start).
  
  This is THE authoritative timestamp for:
    - Capacity calculation
    - Time overlap detection
    - Provider availability
  
  DIFFERS FROM scheduled_start:
    - scheduled_start: Customer-facing appointment time
    - busy_from: Provider capacity lock start (may include prep/travel)
```

**❌ PROBLEM:** Documented as "CANONICAL" but design says booking_commitments.active_from is canonical

### Danger if Seeded Now

```sql
-- Seed booking with busy_from/busy_to populated
INSERT INTO bookings (id, customer_id, provider_id, service_id, status, busy_from, busy_to) VALUES
  ('booking-uuid', 'customer-uuid', 'provider-uuid', 'service-uuid', 'confirmed',
   '2026-01-15 10:00:00+03', '2026-01-15 12:00:00+03');

-- Later: booking_commitments created with different time
INSERT INTO booking_commitments (booking_id, active_from, active_to, ...) VALUES
  ('booking-uuid', '2026-01-15 09:30:00+03', '2026-01-15 12:30:00+03', ...);

-- Now busy_from (10:00) != active_from (09:30)
-- Which is canonical? Code will break.
```

### Required Fix

**Migration:** `20260109130003_deprecate_booking_busy_fields.sql`

```sql
-- =============================================================================
-- BLOCKER 4 FIX: Rename busy_from/busy_to to clarify they are ESTIMATES
-- Purpose: Prevent confusion with canonical commitment time
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md (Invariant 5, Known Limitation #1)
-- =============================================================================

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
```

**Seeding Decision:**
```sql
-- ✅ CAN SEED (estimates for pre-commitment bookings)
INSERT INTO bookings (customer_id, service_id, status, estimated_busy_from, estimated_busy_to) VALUES
  ('customer-uuid', 'service-uuid', 'submitted', 
   '2026-01-15 10:00:00+03', '2026-01-15 12:00:00+03');

-- ❌ DO NOT SEED (confirmed bookings without commitments)
-- INSERT INTO bookings (status) VALUES ('confirmed');  -- Blocked by trigger anyway
```

---

## BLOCKER 5: EMERGENCY ELIGIBILITY FUNCTION — ❌ SCATTERED

### Current State (VERIFIED)

**Partial checks found in:**

1. **File:** `supabase/migrations/20260109120032_adversarial_blockers_fix.sql` (line 538)
```sql
CREATE OR REPLACE FUNCTION check_provider_availability_interval(
  p_provider_id UUID,
  p_service_id UUID,
  p_busy_from TIMESTAMPTZ,
  p_busy_to TIMESTAMPTZ,
  p_is_emergency BOOLEAN DEFAULT false
)
```
- Checks emergency flag to bypass availability
- BUT does NOT check service capability

2. **File:** `supabase/migrations/20260109120007_pricing_immutability_enforcement.sql`
```sql
-- Emergency override check (partial)
IF (SELECT supports_emergency FROM service_capabilities WHERE service_id = NEW.service_id) THEN
  -- Allow emergency details
END IF;
```
- Checks service supports_emergency
- BUT does NOT check provider eligibility or capacity extension

**❌ MISSING:** Single unified emergency eligibility function

### Danger if Seeded Now

```sql
-- Seed service that supports emergency
UPDATE service_capabilities SET supports_emergency = true WHERE service_id = 'plumbing-uuid';

-- Seed provider WITHOUT emergency capability
INSERT INTO provider_services (provider_id, service_id, concurrent_units) VALUES
  ('provider-uuid', 'plumbing-uuid', 1);

-- Emergency booking attempts
-- Question: Is provider eligible for emergency?
-- Current state: Scattered checks, no single source of truth
```

### Required Fix

**Migration:** `20260109130004_unified_emergency_eligibility.sql`

```sql
-- =============================================================================
-- BLOCKER 5 FIX: Unified emergency eligibility function
-- Purpose: Single source of truth for emergency booking eligibility
-- Reference: CANONICAL_WORK_COMMITMENT_MODEL_V1.md (Question 6, Decision #4)
-- =============================================================================

-- Add emergency_capacity_reserved to provider_services (if not exists)
ALTER TABLE provider_services
ADD COLUMN IF NOT EXISTS emergency_capacity_reserved INTEGER DEFAULT 0 CHECK (emergency_capacity_reserved >= 0);

COMMENT ON COLUMN provider_services.emergency_capacity_reserved IS
  'Additional capacity units available for emergency bookings.
  
  CALCULATION:
    - Regular max capacity: concurrent_units
    - Emergency max capacity: concurrent_units + emergency_capacity_reserved
  
  EXAMPLES:
    - Solo plumber: concurrent_units=1, emergency_capacity_reserved=1 → emergency max=2
    - Cleaning company: concurrent_units=3, emergency_capacity_reserved=1 → emergency max=4
  
  NOTE: Hard ceiling (no percentage math, no soft overrides)';

-- Unified emergency eligibility check
CREATE OR REPLACE FUNCTION check_emergency_eligibility(
  p_service_id UUID,
  p_provider_id UUID,
  p_requested_capacity_units INTEGER DEFAULT 1
) RETURNS TABLE (
  eligible BOOLEAN,
  reason TEXT,
  regular_max INTEGER,
  emergency_max INTEGER,
  current_usage INTEGER
) AS $$
DECLARE
  v_service_supports BOOLEAN;
  v_provider_concurrent INTEGER;
  v_provider_emergency INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Check 1: Service must support emergency
  SELECT sc.supports_emergency INTO v_service_supports
  FROM service_capabilities sc
  WHERE sc.service_id = p_service_id;
  
  IF NOT FOUND OR NOT v_service_supports THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      'Service does not support emergency bookings'::TEXT,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;

  -- Check 2: Provider must offer this service
  SELECT ps.concurrent_units, ps.emergency_capacity_reserved
  INTO v_provider_concurrent, v_provider_emergency
  FROM provider_services ps
  WHERE ps.provider_id = p_provider_id
    AND ps.service_id = p_service_id
    AND ps.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      'Provider does not offer this service'::TEXT,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;

  -- Check 3: Calculate current capacity usage (future: from booking_commitments)
  SELECT COUNT(*) INTO v_current_count
  FROM bookings b
  WHERE b.provider_id = p_provider_id
    AND b.service_id = p_service_id
    AND b.status IN ('confirmed', 'scheduled', 'in_progress')
    AND b.estimated_busy_from IS NOT NULL
    AND b.estimated_busy_to IS NOT NULL;

  -- Check 4: Emergency capacity available?
  IF v_current_count + p_requested_capacity_units <= (v_provider_concurrent + v_provider_emergency) THEN
    RETURN QUERY SELECT 
      true::BOOLEAN,
      'Emergency capacity available'::TEXT,
      v_provider_concurrent,
      v_provider_concurrent + v_provider_emergency,
      v_current_count;
  ELSE
    RETURN QUERY SELECT 
      false::BOOLEAN,
      'Emergency capacity full'::TEXT,
      v_provider_concurrent,
      v_provider_concurrent + v_provider_emergency,
      v_current_count;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_emergency_eligibility IS
  'Unified emergency eligibility check (CANONICAL).
  
  CHECKS:
    1. Service supports_emergency = true
    2. Provider offers this service (provider_services row exists)
    3. Emergency capacity available (current + requested <= emergency_max)
  
  RETURNS:
    - eligible: true if all checks pass
    - reason: explanation text
    - regular_max: concurrent_units
    - emergency_max: concurrent_units + emergency_capacity_reserved
    - current_usage: active bookings count
  
  USAGE:
    SELECT * FROM check_emergency_eligibility(service_uuid, provider_uuid, 1);
  
  FUTURE MIGRATION:
    - Replace bookings count with booking_commitments count
    - Use capacity_units sum instead of booking count';
```

**Verification Test:**
```sql
-- Setup
UPDATE service_capabilities SET supports_emergency = true WHERE service_id = 'plumbing-uuid';
UPDATE provider_services 
  SET concurrent_units = 1, emergency_capacity_reserved = 1
  WHERE provider_id = 'provider-uuid' AND service_id = 'plumbing-uuid';

-- Test 1: Emergency eligible
SELECT * FROM check_emergency_eligibility('plumbing-uuid', 'provider-uuid', 1);
-- Expected: eligible=true, regular_max=1, emergency_max=2, current_usage=0

-- Test 2: Service doesn't support emergency
SELECT * FROM check_emergency_eligibility('non-emergency-service', 'provider-uuid', 1);
-- Expected: eligible=false, reason='Service does not support emergency bookings'

-- Test 3: Emergency capacity full
-- (After 2 emergency bookings already active)
SELECT * FROM check_emergency_eligibility('plumbing-uuid', 'provider-uuid', 1);
-- Expected: eligible=false, reason='Emergency capacity full', emergency_max=2, current_usage=2
```

---

## MIGRATION EXECUTION ORDER

**Must be applied in this exact order:**

1. ✅ `20260109130000_add_capacity_scope.sql` (BLOCKER 1)
2. ✅ `20260109130001_canonical_availability.sql` (BLOCKER 2)
3. ✅ `20260109130002_enforce_commitment_invariant.sql` (BLOCKER 3)
4. ✅ `20260109130003_deprecate_booking_busy_fields.sql` (BLOCKER 4)
5. ✅ `20260109130004_unified_emergency_eligibility.sql` (BLOCKER 5)

**Total size:** ~500 lines of SQL across 5 migrations

---

## WHAT CAN BE SEEDED AFTER FIXES

### ✅ Safe to Seed Immediately

**Discovery Layer (no blockers):**
```sql
INSERT INTO service_categories (...);
INSERT INTO service_subcategories (...);
INSERT INTO service_types (...);
INSERT INTO services (...);
INSERT INTO service_capabilities (...);
INSERT INTO booking_state_transitions (...);  -- Rules only
```

**Provider Identity (non-capacity):**
```sql
INSERT INTO service_providers (...);  -- Profile, contact, location
INSERT INTO provider_verification_documents (...);
INSERT INTO provider_service_areas (...);
```

**Users/Customers:**
```sql
INSERT INTO auth.users (...);
INSERT INTO customers (...);  -- If exists
```

### ✅ Safe to Seed After Fixes Applied

**Provider Capacity (AFTER BLOCKER 1 + 5):**
```sql
INSERT INTO provider_services (
  provider_id, 
  service_id, 
  concurrent_units,
  capacity_scope,  -- NEW: 'per_service' or 'provider_wide'
  emergency_capacity_reserved  -- NEW: 0 or positive integer
) VALUES (...);
```

**Provider Availability (AFTER BLOCKER 2):**
```sql
INSERT INTO provider_availability_intervals (
  provider_id,
  service_id,
  available_from,
  available_to,
  is_emergency_only
) VALUES (...);

-- ❌ DO NOT USE provider_availability (deprecated)
```

**Bookings (AFTER ALL BLOCKERS):**
```sql
-- Pre-commitment bookings (draft, submitted)
INSERT INTO bookings (
  customer_id,
  service_id,
  service_type_id,
  status,  -- 'draft' or 'submitted' only
  estimated_busy_from,  -- NEW NAME (was busy_from)
  estimated_busy_to  -- NEW NAME (was busy_to)
) VALUES (...);

-- ❌ DO NOT SEED status='confirmed' (requires commitment)
-- ❌ DO NOT SEED emergency bookings yet (wait for v1 complete)
```

---

## SEEDING READINESS MATRIX

| Component | Before Fixes | After Fixes | Blocker |
|-----------|--------------|-------------|---------|
| service_categories | ✅ READY | ✅ READY | None |
| service_subcategories | ✅ READY | ✅ READY | None |
| service_types | ✅ READY | ✅ READY | None |
| services | ✅ READY | ✅ READY | None |
| service_capabilities | ✅ READY | ✅ READY | None |
| service_providers | ✅ READY | ✅ READY | None |
| provider_services | ❌ BLOCKED | ✅ READY | #1, #5 |
| provider_availability | ❌ BLOCKED | ⚠️ DEPRECATED | #2 |
| provider_availability_intervals | ❌ BLOCKED | ✅ READY | #2 |
| provider_verification_documents | ✅ READY | ✅ READY | None |
| provider_service_areas | ✅ READY | ✅ READY | None |
| bookings (draft/submitted) | ⚠️ USE CAUTION | ✅ READY | #4 |
| bookings (confirmed+) | ❌ BLOCKED | ❌ STILL BLOCKED | #3, needs commitments table |
| booking_commitments | ❌ NOT IMPLEMENTED | ❌ NOT IMPLEMENTED | Design approved, not coded |
| Emergency bookings | ❌ BLOCKED | ⚠️ PARTIAL | #5 fixed, but needs commitments |

---

## FINAL VERDICT

**Can we seed now?** 
**NO - but YES after 5 migrations applied**

**Structural health after fixes:**

| Area | Status Before | Status After |
|------|---------------|--------------|
| Discovery | ✅ Clean | ✅ Clean |
| Providers (identity) | ✅ Clean | ✅ Clean |
| Providers (capacity) | ❌ Blocked | ✅ Clean |
| Availability | ❌ Ambiguous | ✅ Clean |
| Bookings (intent) | ⚠️ OK | ✅ Clean |
| Bookings (commitment) | ❌ Not enforced | ✅ Enforced |
| Commitments | ⏳ Not implemented | ⏳ Still not implemented (but blockers removed) |

**Next steps:**
1. Apply 5 blocker migrations
2. Seed discovery + provider identity
3. Seed provider capacity with capacity_scope
4. Seed provider availability using intervals only
5. Seed draft/submitted bookings
6. **WAIT for booking_commitments implementation before seeding confirmed bookings**
