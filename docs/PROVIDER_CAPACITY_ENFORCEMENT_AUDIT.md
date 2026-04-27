# PROVIDER CAPACITY ENFORCEMENT — BRUTAL AUDIT
**Date:** January 9, 2026  
**Auditor:** System Architecture Review  
**Severity:** CRITICAL GAP IDENTIFIED  
**Status:** ⚠️ PARTIAL IMPLEMENTATION — MAJOR GAPS

---

## EXECUTIVE SUMMARY

**FINDING: CAPACITY ENFORCEMENT IS DANGEROUSLY INCOMPLETE**

Journey 2 mentions capacity validation, but the implementation is **cosmetic at best, non-existent at worst**. The system has:

- ❌ **NO `max_concurrent_bookings` column in ANY table**
- ❌ **NO capacity tracking mechanism**
- ❌ **NO capacity enforcement triggers**
- ❌ **NO capacity validation in schema**
- ⚠️ **Journey 2 references non-existent fields** (`max_concurrent_bookings` query shown but field doesn't exist)
- ⚠️ **Manual flag approach (`needs_reassignment`) exists but has no automatic enforcement**

**RISK LEVEL: HIGH**

Without capacity enforcement:
- Providers will be double/triple booked
- Service quality collapses
- Customer complaints surge
- Provider burnout increases
- System trust erodes

---

## DETAILED ANALYSIS

### 1. CURRENT STATE INVENTORY

#### Database Schema Search Results

**Tables Searched:**
- `service_providers` — NO capacity columns
- `provider_services` — NO capacity columns  
- `bookings` — NO capacity tracking
- `provider_availability` — Only tracks working hours, NOT booking limits

**Actual Columns Found:**
```sql
-- service_providers table
CREATE TABLE service_providers (
  -- ... business info, stats, ratings ...
  -- ❌ NO max_concurrent_bookings
  -- ❌ NO max_daily_bookings
  -- ❌ NO capacity_per_service
  -- ❌ NO capacity_mode ('per_provider' | 'per_service' | 'per_time_window')
);

-- provider_services table
CREATE TABLE provider_services (
  -- ... verification, certification ...
  -- ❌ NO max_concurrent_bookings
  -- ❌ NO service_capacity
  -- ❌ NO capacity_override
);

-- bookings table
CREATE TABLE bookings (
  -- ... booking details ...
  -- ✅ HAS 'needs_reassignment' status (manual flag)
  -- ❌ NO capacity validation trigger
  -- ❌ NO capacity checking function
);
```

**Capacity-Related Findings:**
1. **`provider_availability` table exists** — Tracks working hours (day_of_week, start_time, end_time)
   - **But:** Only TIME availability, not BOOKING COUNT capacity
2. **`needs_reassignment` booking status exists** — Manual flag for capacity overflow
   - **But:** No automatic enforcement, no trigger to set it
3. **Journey 2 mentions capacity** — Shows query checking `max_concurrent_bookings`
   - **But:** Field doesn't exist in schema (documentation fantasy)

---

### 2. CAPACITY LOGIC LEAK SCENARIOS

#### Scenario A: Provider Offers Multiple Services

**Example:** FreshFold Laundry offers:
- Laundry & Ironing
- Dry Cleaning
- Shoe Cleaning

**Question:** Is capacity:
- **Per provider** (30 total bookings across all services)?
- **Per service** (30 laundry + 30 dry cleaning + 30 shoe cleaning)?

**Current Answer:** ❌ **UNDEFINED** — System has no mechanism to enforce either

**Risk:**
- Provider accepts 90 bookings (30 per service)
- Actually can only handle 30 total
- Result: Catastrophic failure

---

#### Scenario B: Recurring + Ad-Hoc Bookings Overlap

**Example:** Provider has:
- 20 recurring weekly laundry bookings (every Wednesday)
- 10 ad-hoc emergency bookings requested same Wednesday

**Question:** Does the system:
- Count recurring bookings against capacity?
- Prevent ad-hoc bookings when recurring bookings fill capacity?
- Reserve capacity slots for emergencies?

**Current Answer:** ❌ **NO MECHANISM EXISTS**

**Risk:**
- Provider overwhelmed on Wednesday
- Emergency bookings can't be fulfilled
- Recurring customers get poor service

---

#### Scenario C: Emergency Overrides Capacity

**Example:** Provider at 30/30 capacity on Thursday. Emergency plumbing request arrives (burst pipe).

**Question:** Should emergency bookings:
- **Override capacity** (provider must accept)?
- **Respect capacity** (find another provider)?
- **Have reserved slots** (2 slots always held for emergencies)?

**Current Answer:** ❌ **UNDEFINED** — No emergency capacity rules

**Risk:**
- Emergencies ignored (safety issue)
- Provider forced beyond limits (burnout)
- No clear policy

---

#### Scenario D: Reassignment Determinism

**Example:** Provider hits capacity. System sets `needs_reassignment` status.

**Question:** What happens next?
- **Automatic reassignment** to next available provider?
- **Manual admin intervention**?
- **Customer notification** to choose alternate provider?
- **Priority queue** (first come, first served)?

**Current Answer:** ⚠️ **MANUAL ONLY** — Status flag exists but no automation

**Risk:**
- Bookings stuck in limbo
- No SLA for reassignment
- Customer frustration

---

### 3. IMMEDIATE QUESTIONS (ANSWERED)

#### Q1: Is capacity enforced per provider, per provider+service, or per time window?

**Answer:** ❌ **NONE OF THE ABOVE** — No capacity enforcement exists

**Required Decision:**
```
CAPACITY_MODE options:
├─ 'global_provider' — Total bookings across all services
├─ 'per_service' — Separate capacity per service offered
├─ 'per_time_window' — Capacity per day/week/hour
└─ 'hybrid' — Per service with global limit
```

**Recommendation:** `per_service` with `global_limit` fallback
- Provider sets capacity per service: "30 laundry, 15 dry cleaning"
- Global hard limit: "50 total bookings regardless of service"

---

#### Q2: Do emergency bookings override capacity?

**Answer:** ❌ **UNDEFINED** — No emergency capacity policy exists

**Required Decision:**
```
EMERGENCY_CAPACITY_POLICY options:
├─ 'strict_override' — Emergency ALWAYS bypasses capacity
├─ 'reserved_slots' — Hold N slots for emergencies only
├─ 'respect_capacity' — Emergency follows same rules
└─ 'soft_override' — Emergency can exceed by X%
```

**Recommendation:** `reserved_slots` with `soft_override`
- Reserve 2-3 slots for emergencies
- If no slots available, allow 110% capacity for true emergencies

---

#### Q3: Is reassignment deterministic or best-effort?

**Answer:** ⚠️ **BEST-EFFORT MANUAL** — `needs_reassignment` status exists but no automation

**Current State:**
1. Booking reaches capacity overflow
2. System sets `status = 'needs_reassignment'`
3. **Then what?** ❌ No defined process

**Required Decision:**
```
REASSIGNMENT_STRATEGY options:
├─ 'automatic' — System finds alternate provider immediately
├─ 'queue' — Booking waits in queue, provider notified when available
├─ 'customer_choice' — Customer picks from alternate providers
└─ 'admin_manual' — Admin reviews and reassigns
```

**Recommendation:** `automatic` with `customer_notification`
- System finds alternate verified provider in same area
- Notifies customer: "Original provider unavailable, we found [AlternateProvider]"
- Customer can accept or cancel

---

### 4. SCHEMA GAPS — WHAT'S MISSING

#### Gap 1: Capacity Configuration (Provider Level)

```sql
-- MISSING TABLE/COLUMNS
ALTER TABLE service_providers 
ADD COLUMN max_concurrent_bookings INTEGER CHECK (max_concurrent_bookings > 0),
ADD COLUMN capacity_mode TEXT DEFAULT 'per_service' 
  CHECK (capacity_mode IN ('global_provider', 'per_service', 'per_time_window', 'hybrid')),
ADD COLUMN emergency_capacity_reserved INTEGER DEFAULT 2 
  CHECK (emergency_capacity_reserved >= 0);

COMMENT ON COLUMN service_providers.max_concurrent_bookings IS 
  'Global maximum concurrent bookings across all services (hard limit)';
COMMENT ON COLUMN service_providers.capacity_mode IS 
  'How capacity is calculated: global_provider, per_service, per_time_window, hybrid';
COMMENT ON COLUMN service_providers.emergency_capacity_reserved IS 
  'Number of slots reserved for emergency bookings only';
```

---

#### Gap 2: Capacity Configuration (Service Level)

```sql
-- MISSING COLUMNS IN provider_services
ALTER TABLE provider_services
ADD COLUMN max_concurrent_bookings INTEGER CHECK (max_concurrent_bookings > 0),
ADD COLUMN max_daily_bookings INTEGER CHECK (max_daily_bookings > 0),
ADD COLUMN max_weekly_bookings INTEGER CHECK (max_weekly_bookings > 0),
ADD COLUMN capacity_time_window TEXT DEFAULT 'concurrent' 
  CHECK (capacity_time_window IN ('concurrent', 'daily', 'weekly', 'hourly'));

COMMENT ON COLUMN provider_services.max_concurrent_bookings IS 
  'Maximum concurrent active bookings for THIS service (overrides provider global if set)';
COMMENT ON COLUMN provider_services.max_daily_bookings IS 
  'Maximum bookings per day for THIS service';
COMMENT ON COLUMN provider_services.capacity_time_window IS 
  'Time window for capacity calculation: concurrent (any status), daily, weekly';
```

---

#### Gap 3: Capacity Validation Function

```sql
-- MISSING FUNCTION
CREATE OR REPLACE FUNCTION check_provider_capacity(
  p_provider_id UUID,
  p_service_id UUID,
  p_scheduled_start TIMESTAMPTZ,
  p_is_emergency BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  capacity_available BOOLEAN,
  current_bookings INTEGER,
  max_bookings INTEGER,
  reason TEXT
) AS $$
DECLARE
  v_provider_global_max INTEGER;
  v_service_max INTEGER;
  v_emergency_reserved INTEGER;
  v_current_count INTEGER;
  v_capacity_mode TEXT;
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
  SELECT max_concurrent_bookings
  INTO v_service_max
  FROM provider_services
  WHERE provider_id = p_provider_id 
    AND service_id = p_service_id;

  -- Count current active bookings
  IF v_capacity_mode = 'per_service' THEN
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings
    WHERE provider_id = p_provider_id
      AND service_id = p_service_id
      AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
      AND scheduled_start::DATE = p_scheduled_start::DATE;
  ELSIF v_capacity_mode = 'global_provider' THEN
    SELECT COUNT(*)
    INTO v_current_count
    FROM bookings
    WHERE provider_id = p_provider_id
      AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
      AND scheduled_start::DATE = p_scheduled_start::DATE;
  END IF;

  -- Determine available capacity
  -- Emergency bookings can use reserved slots or exceed by 10%
  IF p_is_emergency THEN
    IF v_current_count < COALESCE(v_service_max, v_provider_global_max) + v_emergency_reserved THEN
      RETURN QUERY SELECT TRUE, v_current_count, 
        COALESCE(v_service_max, v_provider_global_max), 
        'Emergency booking - capacity available'::TEXT;
    ELSIF v_current_count < (COALESCE(v_service_max, v_provider_global_max) * 1.1)::INTEGER THEN
      RETURN QUERY SELECT TRUE, v_current_count, 
        COALESCE(v_service_max, v_provider_global_max), 
        'Emergency booking - soft override allowed'::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, v_current_count, 
        COALESCE(v_service_max, v_provider_global_max), 
        'Emergency booking - hard capacity limit reached'::TEXT;
    END IF;
  ELSE
    -- Regular booking
    IF v_current_count < (COALESCE(v_service_max, v_provider_global_max) - v_emergency_reserved) THEN
      RETURN QUERY SELECT TRUE, v_current_count, 
        COALESCE(v_service_max, v_provider_global_max) - v_emergency_reserved, 
        'Capacity available'::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, v_current_count, 
        COALESCE(v_service_max, v_provider_global_max) - v_emergency_reserved, 
        'Capacity full - emergency slots reserved or limit reached'::TEXT;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_provider_capacity IS 
  'Validates if provider has capacity for new booking. Respects emergency overrides and reserved slots.';
```

---

#### Gap 4: Capacity Enforcement Trigger

```sql
-- MISSING TRIGGER
CREATE OR REPLACE FUNCTION enforce_provider_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity_check RECORD;
  v_is_emergency BOOLEAN;
BEGIN
  -- Skip if no provider assigned yet
  IF NEW.provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine if emergency booking
  v_is_emergency := NEW.booking_flow_type = 'emergency';

  -- Check capacity
  SELECT * INTO v_capacity_check
  FROM check_provider_capacity(
    NEW.provider_id,
    NEW.service_id,
    NEW.scheduled_start,
    v_is_emergency
  );

  -- If no capacity, set needs_reassignment status
  IF NOT v_capacity_check.capacity_available THEN
    NEW.status := 'needs_reassignment';
    NEW.provider_notes := v_capacity_check.reason;
    
    -- Log to notifications
    INSERT INTO notifications (
      user_id, user_role, type, title, message, booking_id, created_at
    ) VALUES (
      (SELECT user_id FROM service_providers WHERE id = NEW.provider_id),
      'provider',
      'capacity_overflow',
      'Booking Needs Reassignment',
      FORMAT('Capacity full: %s/%s bookings. This booking flagged for reassignment.', 
        v_capacity_check.current_bookings, v_capacity_check.max_bookings),
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_provider_capacity_trigger
  BEFORE INSERT OR UPDATE OF provider_id, scheduled_start
  ON bookings
  FOR EACH ROW
  WHEN (NEW.provider_id IS NOT NULL AND NEW.scheduled_start IS NOT NULL)
  EXECUTE FUNCTION enforce_provider_capacity();

COMMENT ON TRIGGER check_provider_capacity_trigger ON bookings IS
  'Automatically flags bookings as needs_reassignment when provider capacity exceeded';
```

---

### 5. BUSINESS LOGIC GAPS

#### Gap 5: Reassignment Automation

**Current:** Manual flag (`needs_reassignment` status)  
**Required:** Automatic reassignment workflow

```sql
-- MISSING FUNCTION
CREATE OR REPLACE FUNCTION auto_reassign_booking(p_booking_id UUID)
RETURNS TABLE (
  reassignment_success BOOLEAN,
  new_provider_id UUID,
  reason TEXT
) AS $$
DECLARE
  v_booking RECORD;
  v_alternate_provider UUID;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  -- Find alternate provider
  SELECT ps.provider_id INTO v_alternate_provider
  FROM provider_services ps
  JOIN service_providers sp ON sp.id = ps.provider_id
  JOIN provider_service_areas psa ON psa.provider_id = sp.id
  WHERE ps.service_id = v_booking.service_id
    AND ps.verification_status = 'verified'
    AND ps.is_active = TRUE
    AND sp.is_active = TRUE
    AND psa.area_name = (
      SELECT area FROM locations WHERE id = v_booking.service_location_id
    )
    AND ps.provider_id != v_booking.provider_id
  ORDER BY 
    sp.average_rating DESC,
    sp.response_time_minutes ASC
  LIMIT 1;

  IF v_alternate_provider IS NOT NULL THEN
    -- Check new provider capacity
    DECLARE
      v_capacity_check RECORD;
    BEGIN
      SELECT * INTO v_capacity_check
      FROM check_provider_capacity(
        v_alternate_provider,
        v_booking.service_id,
        v_booking.scheduled_start,
        v_booking.booking_flow_type = 'emergency'
      );

      IF v_capacity_check.capacity_available THEN
        -- Update booking
        UPDATE bookings
        SET provider_id = v_alternate_provider,
            status = 'submitted',
            provider_notes = 'Auto-reassigned due to capacity overflow'
        WHERE id = p_booking_id;

        RETURN QUERY SELECT TRUE, v_alternate_provider, 
          'Successfully reassigned to alternate provider'::TEXT;
      ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, 
          'No providers with available capacity found'::TEXT;
      END IF;
    END;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      'No alternate providers found in service area'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_reassign_booking IS 
  'Automatically finds and assigns alternate provider when capacity exceeded';
```

---

### 6. DOCUMENTATION GAPS

#### Gap 6: Capacity Rules Documentation

**Current:** Scattered comments, no authoritative source  
**Required:** Comprehensive capacity policy document

**Missing Documentation:**

1. **Capacity Calculation Rules**
   - How to count "concurrent" bookings (which statuses count?)
   - Time windows (daily, weekly, concurrent, hourly)
   - Overlap handling (recurring vs ad-hoc)

2. **Emergency Override Policy**
   - When can emergencies bypass capacity?
   - How many emergency slots to reserve?
   - Soft override threshold (110%? 120%?)

3. **Reassignment SLA**
   - Maximum time to find alternate provider
   - Customer notification requirements
   - Fallback if no alternates found

4. **Provider Capacity Management**
   - How providers set their own capacity
   - Default values for new providers
   - Dynamic capacity adjustment

---

## REQUIRED ACTIONS (IMMEDIATE)

### Phase 1: Schema Fixes (NOW) — 2 hours

1. **Add capacity columns to `service_providers`**
   - `max_concurrent_bookings`
   - `capacity_mode`
   - `emergency_capacity_reserved`

2. **Add capacity columns to `provider_services`**
   - `max_concurrent_bookings` (per service)
   - `max_daily_bookings`
   - `capacity_time_window`

3. **Add DB comments explaining capacity rules**
   - Document counting logic
   - Document emergency policy
   - Document reassignment flow

### Phase 2: Enforcement (NOW) — 4 hours

4. **Create `check_provider_capacity()` function**
   - Implement logic from Gap 3 above
   - Test with edge cases

5. **Create capacity enforcement trigger**
   - Implement trigger from Gap 4 above
   - Test on INSERT and UPDATE

6. **Create `auto_reassign_booking()` function**
   - Implement logic from Gap 5 above
   - Test reassignment flow

### Phase 3: Testing (NEXT) — 3 hours

7. **Test capacity overflow scenarios**
   - 30 bookings → 31st booking → needs_reassignment
   - Emergency booking → bypasses normal capacity
   - Recurring + ad-hoc overlap → correct counting

8. **Test reassignment automation**
   - Trigger reassignment
   - Verify alternate provider selected
   - Verify customer notification

### Phase 4: Seeding (NEXT) — 1 hour

9. **Seed providers with capacity values**
   - Set reasonable defaults (20-50 concurrent)
   - Set emergency reserves (2-5 slots)
   - Document capacity per provider type

10. **Update Journey 2 queries to match reality**
    - Fix non-existent field references
    - Document actual capacity logic
    - Validate walkthrough accuracy

---

## MIGRATION SCRIPT

```sql
-- Migration: Provider Capacity Enforcement
-- Description: Add capacity tracking and enforcement
-- Date: 2026-01-09
-- Priority: CRITICAL

-- =============================================================================
-- STEP 1: Add capacity columns to service_providers
-- =============================================================================

ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS max_concurrent_bookings INTEGER CHECK (max_concurrent_bookings > 0),
ADD COLUMN IF NOT EXISTS capacity_mode TEXT DEFAULT 'per_service' 
  CHECK (capacity_mode IN ('global_provider', 'per_service', 'per_time_window', 'hybrid')),
ADD COLUMN IF NOT EXISTS emergency_capacity_reserved INTEGER DEFAULT 2 
  CHECK (emergency_capacity_reserved >= 0 AND emergency_capacity_reserved <= max_concurrent_bookings);

COMMENT ON COLUMN service_providers.max_concurrent_bookings IS 
  'Global maximum concurrent active bookings across all services. Hard limit. NULL = no limit (not recommended).';
COMMENT ON COLUMN service_providers.capacity_mode IS 
  'How capacity is calculated:
  - global_provider: Total bookings across all services
  - per_service: Separate capacity per service (recommended)
  - per_time_window: Capacity per day/week
  - hybrid: Per service with global limit fallback';
COMMENT ON COLUMN service_providers.emergency_capacity_reserved IS 
  'Number of slots reserved ONLY for emergency bookings. Regular bookings stop at (max_concurrent - emergency_reserved).';

-- Set default values for existing providers
UPDATE service_providers
SET 
  max_concurrent_bookings = 30,
  capacity_mode = 'per_service',
  emergency_capacity_reserved = 2
WHERE max_concurrent_bookings IS NULL;

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
  'Maximum concurrent active bookings for THIS specific service. Overrides provider global if set. NULL = use provider global.';
COMMENT ON COLUMN provider_services.max_daily_bookings IS 
  'Maximum bookings per calendar day for THIS service. NULL = no daily limit.';
COMMENT ON COLUMN provider_services.max_weekly_bookings IS 
  'Maximum bookings per week for THIS service. NULL = no weekly limit.';
COMMENT ON COLUMN provider_services.capacity_time_window IS 
  'Primary time window for capacity calculation:
  - concurrent: Count all active bookings (submitted → in_progress)
  - daily: Count bookings per calendar day
  - weekly: Count bookings per week
  - hourly: Count bookings per hour (for high-frequency services)';

-- Set default values for existing provider services
UPDATE provider_services
SET 
  max_concurrent_bookings = 25,
  capacity_time_window = 'concurrent'
WHERE max_concurrent_bookings IS NULL;

-- =============================================================================
-- STEP 3: Add capacity checking function
-- =============================================================================

-- [Insert check_provider_capacity() function from Gap 3]

-- =============================================================================
-- STEP 4: Add capacity enforcement trigger
-- =============================================================================

-- [Insert enforce_provider_capacity() trigger from Gap 4]

-- =============================================================================
-- STEP 5: Add auto-reassignment function (optional - can be async job)
-- =============================================================================

-- [Insert auto_reassign_booking() function from Gap 5]

-- =============================================================================
-- STEP 6: Add capacity monitoring view
-- =============================================================================

CREATE OR REPLACE VIEW provider_capacity_status AS
SELECT 
  sp.id AS provider_id,
  sp.business_name,
  ps.service_id,
  s.name AS service_name,
  COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) AS max_capacity,
  sp.emergency_capacity_reserved,
  COUNT(b.id) FILTER (WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')) AS current_bookings,
  COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) - 
    sp.emergency_capacity_reserved - 
    COUNT(b.id) FILTER (WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')) 
    AS available_slots,
  ROUND(
    (COUNT(b.id) FILTER (WHERE b.status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress'))::NUMERIC / 
    NULLIF(COALESCE(ps.max_concurrent_bookings, sp.max_concurrent_bookings) - sp.emergency_capacity_reserved, 0)) * 100, 
    1
  ) AS utilization_percent
FROM service_providers sp
JOIN provider_services ps ON ps.provider_id = sp.id
JOIN services s ON s.id = ps.service_id
LEFT JOIN bookings b ON b.provider_id = sp.id AND b.service_id = ps.service_id
WHERE sp.is_active = TRUE AND ps.is_active = TRUE
GROUP BY sp.id, sp.business_name, ps.service_id, s.name, ps.max_concurrent_bookings, sp.max_concurrent_bookings, sp.emergency_capacity_reserved;

COMMENT ON VIEW provider_capacity_status IS 
  'Real-time view of provider capacity utilization per service. Use for dashboards and monitoring.';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
```

---

## PRIORITY JUSTIFICATION

**Why is this CRITICAL?**

1. **Marketplace Integrity**
   - Without capacity limits, providers accept more work than they can deliver
   - Quality collapses, customer trust destroyed

2. **Emergency Safety**
   - No emergency override = burst pipes ignored
   - Health/safety risk

3. **Provider Burnout**
   - No limits = providers overcommit
   - Leads to cancellations, poor reviews, churn

4. **Recurring Booking Chaos**
   - Recurring bookings generate 12+ child bookings
   - Without capacity check, provider drowns in work

5. **Competitive Disadvantage**
   - Every professional marketplace (Uber, Fiverr, Upwork) has capacity management
   - Mitasafi can't compete without it

---

## CONCLUSION

**Capacity enforcement is NOT optional. It is foundational.**

Current state: ❌ **FANTASY DOCUMENTATION** (Journey 2 references non-existent fields)  
Required state: ✅ **ROBUST ENFORCEMENT** (schema + triggers + functions)

**Recommended Action:** Implement Phase 1 & 2 immediately (before seeding providers).

**Estimated Time:** 6-8 hours total  
**Risk if skipped:** HIGH — System will fail at scale

---

**Next Steps:**
1. Approve migration script
2. Run migration on staging
3. Test all scenarios
4. Update Journey 2 documentation to match reality
5. Seed providers with capacity values
6. Monitor capacity utilization in production
