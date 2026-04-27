# 🔴 CRITICAL SCHEMA GAPS — BLOCKING SEEDING
**Date:** January 9, 2026  
**Status:** ❌ **NOT PRODUCTION-READY**  
**Blocker Level:** ABSOLUTE — Do not seed until ALL 7 issues resolved

---

## EXECUTIVE SUMMARY

**FINDING: 7 CRITICAL GAPS PREVENT PRODUCTION SEEDING**

Previous capacity audit was correct but **incomplete**. Deeper analysis reveals:

- ❌ **Time semantics undefined** (when is a provider "busy"?)
- ❌ **State machine unenforced** (illegal transitions possible)
- ❌ **Availability vs capacity unreconciled** (contradictory rules)
- ❌ **Emergency overrides half-baked** (policy incomplete)
- ❌ **Reassignment semantics ambiguous** (blocking vs advisory unclear)
- ❌ **Pricing immutability unenforced** (snapshot can be modified)
- ⚠️ **Capacity model incomplete** (authority unclear, race conditions)

**These are not "nice-to-haves". These are marketplace integrity failures.**

---

## ISSUE 1: PROVIDER CAPACITY ENFORCEMENT (PARTIALLY FIXED)

### Current State After Migration

✅ Added columns: `max_concurrent_bookings`, `capacity_mode`, `emergency_capacity_reserved`  
✅ Added function: `check_provider_capacity()`  
✅ Added trigger: `enforce_provider_capacity()`  

### ❌ REMAINING AMBIGUITIES

#### 1.1: Authority Hierarchy Undefined

**Question:** What is the authoritative capacity source?

```sql
-- provider_services.max_concurrent_bookings = 25
-- service_providers.max_concurrent_bookings = 30
-- Which wins?
```

**Current code:**
```sql
v_effective_max := COALESCE(v_service_max, v_provider_global_max);
```

**Problem:** `COALESCE` means "first non-NULL", but:
- What if service has `NULL`? (Inherit provider limit? Or unlimited?)
- What if provider has `NULL`? (Unlimited? Error?)
- What if BOTH are `NULL`? (Function returns 999999 with warning)

**Required Fix:**
```sql
-- EXPLICIT AUTHORITY RULE (must be in schema comments)
COMMENT ON COLUMN provider_services.max_concurrent_bookings IS
  'SERVICE-SPECIFIC capacity limit. Authority rules:
  1. If NOT NULL → OVERRIDES provider global (this service limited separately)
  2. If NULL → INHERITS provider global (service_providers.max_concurrent_bookings)
  3. If provider global ALSO NULL → ERROR (capacity must be set at provider level minimum)
  
  NULL = "use provider global", NOT "unlimited"
  To disable capacity limits, set to 999999 explicitly';

-- Add NOT NULL constraint to provider level (require baseline)
ALTER TABLE service_providers
ADD CONSTRAINT capacity_required CHECK (max_concurrent_bookings IS NOT NULL);
```

#### 1.2: "Concurrent" Definition Is Vague

**Question:** What does "concurrent" mean mathematically?

Current counting logic:
```sql
WHERE status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
```

**Problems:**
1. **Time overlap undefined** - Does "concurrent" mean:
   - "Same calendar day"?
   - "Overlapping time windows"?
   - "Any active booking regardless of time"?

2. **Emergency bookings with no end time** - How long are they "busy"?

3. **Multi-day projects** - Count as 1 booking or N days of capacity?

**Current behavior:** Counts ALL active bookings regardless of time  
**Is this correct?** Maybe for some services, wrong for others

**Example failure case:**
```
Provider: Laundry service
Capacity: 10 concurrent
Bookings:
- Mon 9am: 5 bookings
- Tue 9am: 5 bookings
- Wed 9am: 5 bookings
Total active bookings: 15
Capacity check: FAILS (15 > 10)

But provider CAN handle this (different days).
```

**Required Fix:** See Issue 2 (canonical time semantics)

#### 1.3: Recurring Bookings - Generation vs Execution

**Question:** When is capacity enforced for recurring bookings?

**Scenario:**
```sql
-- January 1: Generate 12 weekly bookings
-- Provider capacity: 20
-- Current bookings: 15
-- Generation succeeds (15 < 20)

-- February 1: Bookings execute
-- Current bookings: 25 (other customers added bookings)
-- Capacity exceeded, but bookings already generated
```

**Current trigger:**
```sql
WHEN (NEW.provider_id IS NOT NULL AND NEW.scheduled_start IS NOT NULL)
```

This checks at INSERT time, but:
- Recurring child bookings inserted weeks ahead
- Capacity may change before execution
- No re-validation before execution

**Required Fix:**
```sql
-- Option A: Check at generation AND execution
-- Option B: Reserve capacity slots for recurring bookings
-- Option C: Allow overbooking with priority queue

-- Must pick one and document
```

#### 1.4: Race Conditions Possible

**Problem:** Classic TOCTOU (Time-Of-Check-Time-Of-Use)

```sql
-- Transaction 1:
SELECT COUNT(*) FROM bookings WHERE provider_id = X;  -- Returns 29
-- (30 is limit)

-- Transaction 2 (simultaneous):
SELECT COUNT(*) FROM bookings WHERE provider_id = X;  -- Returns 29

-- Both transactions:
INSERT INTO bookings (...);  -- BOTH succeed

-- Result: 31 bookings (capacity violated)
```

**Current mitigation:** None  

**Required Fix:**
```sql
-- Add advisory lock in check_provider_capacity
SELECT pg_advisory_xact_lock(hashtext(p_provider_id::text || p_service_id::text));

-- Or use serializable isolation
```

---

## ISSUE 2: TIME SEMANTICS ARE NOT CANONICAL (CRITICAL)

### The Fundamental Problem

**There is no single source of truth for "when is a provider busy?"**

Current fields:
- `bookings.scheduled_start` (timestamp)
- `bookings.scheduled_end` (timestamp, often NULL)
- `booking_delivery_details.pickup_time_window_start` (time)
- `booking_delivery_details.dropoff_time_window_start` (time)
- `booking_emergency_details.is_immediate` (boolean)

**None of these define a canonical busy interval.**

### Example Failures

#### Case 1: Emergency Booking
```sql
booking_flow_type = 'emergency'
scheduled_start = '2026-01-09 02:30:00'
scheduled_end = NULL  -- How long is provider busy?
```

**Question:** Does this block capacity for:
- 1 hour? (SLA duration)
- 4 hours? (average emergency duration)
- Until marked completed? (could be days)
- Forever? (if forgotten)

**Current capacity check:** Counts this as 1 concurrent booking forever

#### Case 2: Delivery Service
```sql
pickup_time_window = '08:00 - 10:00'
dropoff_time_window = '18:00 - 20:00'
scheduled_start = '2026-01-15 08:00:00'
scheduled_end = NULL  -- Is this 2 hours or 12 hours?
```

**Question:** Provider is busy:
- 08:00-10:00 only? (pickup window)
- 08:00-20:00 continuously? (full duration)
- 08:00-10:00 + 18:00-20:00? (two windows)

**Current capacity check:** Treats as single concurrent booking (time ignored)

#### Case 3: Multi-Day Project
```sql
booking_flow_type = 'project'
scheduled_start = '2026-01-15 09:00:00'
scheduled_end = '2026-01-20 17:00:00'  -- 5 days
```

**Question:** Does this consume:
- 1 concurrent slot? (counts as 1 booking)
- 5 daily slots? (5 days of capacity)

**Current capacity check:** Counts as 1 concurrent booking (incorrect for multi-day)

### Required Fix: Canonical Busy Time Model

**OPTION A: Explicit Busy Interval (RECOMMENDED)**

```sql
ALTER TABLE bookings
ADD COLUMN busy_from TIMESTAMPTZ,
ADD COLUMN busy_to TIMESTAMPTZ,
ADD CONSTRAINT busy_interval_valid CHECK (busy_to IS NULL OR busy_to > busy_from);

COMMENT ON COLUMN bookings.busy_from IS
  'CANONICAL start of provider busy time. AUTHORITATIVE for capacity calculations.
  All booking flows MUST populate this field.
  
  Rules by flow:
  - emergency: busy_from = scheduled_start, busy_to = scheduled_start + emergency_sla_minutes
  - standard: busy_from = scheduled_start, busy_to = scheduled_end
  - delivery: busy_from = pickup_window_start, busy_to = dropoff_window_end
  - project: busy_from = scheduled_start, busy_to = scheduled_end
  - personal: busy_from = scheduled_start, busy_to = scheduled_start + estimated_duration';

COMMENT ON COLUMN bookings.busy_to IS
  'CANONICAL end of provider busy time. NULL = ongoing (emergency/incomplete).
  For NULL values, capacity system assumes busy for (now() + 24 hours) to prevent infinite blocking.';

-- Trigger to populate busy_from/busy_to from flow-specific fields
CREATE OR REPLACE FUNCTION populate_busy_interval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_flow_type = 'emergency' THEN
    NEW.busy_from := NEW.scheduled_start;
    NEW.busy_to := NEW.scheduled_start + INTERVAL '2 hours';  -- Default emergency duration
    
  ELSIF NEW.booking_flow_type = 'delivery' THEN
    -- Get time windows from delivery details (requires join or denormalization)
    -- For now, use scheduled times as fallback
    NEW.busy_from := NEW.scheduled_start;
    NEW.busy_to := NEW.scheduled_end;
    
  ELSIF NEW.booking_flow_type IN ('standard', 'project', 'personal') THEN
    NEW.busy_from := NEW.scheduled_start;
    NEW.busy_to := NEW.scheduled_end;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**OPTION B: Computed Busy Interval (HARDER)**

```sql
CREATE FUNCTION get_booking_busy_interval(p_booking_id UUID)
RETURNS TABLE (busy_from TIMESTAMPTZ, busy_to TIMESTAMPTZ);

-- Then use this in capacity calculations
```

**Decision Required:** Pick Option A or B and implement completely.

### Updated Capacity Check with Time Semantics

```sql
-- Count overlapping bookings (not just "active" bookings)
SELECT COUNT(*)
INTO v_current_count
FROM bookings
WHERE provider_id = p_provider_id
  AND service_id = p_service_id
  AND status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')
  AND busy_from IS NOT NULL
  AND busy_to IS NOT NULL
  -- Time overlap condition
  AND (
    (busy_from, busy_to) OVERLAPS (p_booking_busy_from, p_booking_busy_to)
  );
```

---

## ISSUE 3: BOOKING STATE MACHINE UNENFORCED (CRITICAL)

### Current Problem

**Status changes are unconstrained.** Nothing prevents:

```sql
-- Illegal transitions (currently possible)
UPDATE bookings SET status = 'in_progress' WHERE status = 'completed';  -- ✅ SUCCEEDS (wrong)
UPDATE bookings SET status = 'confirmed' WHERE status = 'cancelled';    -- ✅ SUCCEEDS (wrong)
UPDATE bookings SET status = 'confirmed' WHERE provider_id IS NULL;     -- ✅ SUCCEEDS (wrong)
```

### Consequences

1. **Capacity counts drift** - Completed bookings counted as active
2. **Double acceptance** - Provider can accept twice
3. **Revenue leaks** - Status changes after payment
4. **Dispute chaos** - Status history inconsistent

### Required Fix: State Transition Table + Trigger

```sql
-- =============================================================================
-- TABLE: booking_state_transitions (authoritative state machine)
-- =============================================================================

CREATE TABLE booking_state_transitions (
  from_status booking_status NOT NULL,
  to_status booking_status NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  requires_provider BOOLEAN DEFAULT FALSE,
  requires_payment BOOLEAN DEFAULT FALSE,
  notes TEXT,
  PRIMARY KEY (from_status, to_status)
);

-- Populate valid transitions (exhaustive)
INSERT INTO booking_state_transitions (from_status, to_status, allowed, requires_provider, notes) VALUES
  -- From draft
  ('draft', 'draft', TRUE, FALSE, 'Self-loop allowed for editing'),
  ('draft', 'submitted', TRUE, FALSE, 'Customer submits booking'),
  ('draft', 'cancelled_customer', TRUE, FALSE, 'Customer cancels before submit'),
  
  -- From submitted
  ('submitted', 'provider_viewed', TRUE, TRUE, 'Provider opens booking'),
  ('submitted', 'confirmed', TRUE, TRUE, 'Provider accepts immediately'),
  ('submitted', 'provider_declined', TRUE, TRUE, 'Provider declines'),
  ('submitted', 'cancelled_customer', TRUE, FALSE, 'Customer cancels before acceptance'),
  ('submitted', 'abandoned', FALSE, FALSE, 'System timeout only'),
  ('submitted', 'needs_reassignment', TRUE, FALSE, 'Capacity overflow or provider unavailable'),
  
  -- From provider_viewed
  ('provider_viewed', 'confirmed', TRUE, TRUE, 'Provider accepts after viewing'),
  ('provider_viewed', 'provider_declined', TRUE, TRUE, 'Provider declines after viewing'),
  ('provider_viewed', 'cancelled_customer', TRUE, FALSE, 'Customer cancels after provider views'),
  
  -- From confirmed
  ('confirmed', 'scheduled', TRUE, TRUE, 'Booking scheduled (specific time set)'),
  ('confirmed', 'in_progress', TRUE, TRUE, 'Work started'),
  ('confirmed', 'cancelled_customer', TRUE, FALSE, 'Customer cancels after confirmation'),
  ('confirmed', 'cancelled_provider', TRUE, TRUE, 'Provider cancels (emergency, sick, etc)'),
  
  -- From scheduled
  ('scheduled', 'in_progress', TRUE, TRUE, 'Work started on schedule'),
  ('scheduled', 'cancelled_customer', TRUE, FALSE, 'Customer cancels scheduled booking'),
  ('scheduled', 'cancelled_provider', TRUE, TRUE, 'Provider cancels scheduled booking'),
  ('scheduled', 'needs_reassignment', TRUE, FALSE, 'Provider capacity issue before execution'),
  
  -- From in_progress
  ('in_progress', 'completed', TRUE, TRUE, 'Work finished'),
  ('in_progress', 'requires_followup', TRUE, TRUE, 'Issue found, needs follow-up'),
  ('in_progress', 'cancelled_provider', TRUE, TRUE, 'Provider emergency mid-job'),
  
  -- From completed
  ('completed', 'customer_confirmed', TRUE, FALSE, 'Customer confirms satisfaction'),
  ('completed', 'disputed', TRUE, FALSE, 'Customer disputes completion'),
  ('completed', 'requires_followup', TRUE, TRUE, 'Provider identifies follow-up needed'),
  
  -- From customer_confirmed
  ('customer_confirmed', 'disputed', TRUE, FALSE, 'Customer changes mind, files dispute'),
  
  -- From requires_followup
  ('requires_followup', 'scheduled', TRUE, TRUE, 'Follow-up scheduled'),
  ('requires_followup', 'completed', TRUE, TRUE, 'Follow-up resolved immediately'),
  
  -- From disputed
  ('disputed', 'completed', TRUE, FALSE, 'Dispute resolved in provider favor'),
  ('disputed', 'refunded', TRUE, FALSE, 'Dispute resolved in customer favor'),
  
  -- From needs_reassignment
  ('needs_reassignment', 'submitted', TRUE, TRUE, 'Reassigned to new provider'),
  ('needs_reassignment', 'cancelled_customer', TRUE, FALSE, 'Customer cancels during reassignment'),
  
  -- Terminal states (no exits except self-loop for updates)
  ('cancelled_customer', 'cancelled_customer', TRUE, FALSE, 'Terminal'),
  ('cancelled_provider', 'cancelled_provider', TRUE, FALSE, 'Terminal'),
  ('provider_declined', 'provider_declined', TRUE, FALSE, 'Terminal'),
  ('abandoned', 'abandoned', TRUE, FALSE, 'Terminal'),
  ('refunded', 'refunded', TRUE, FALSE, 'Terminal');

COMMENT ON TABLE booking_state_transitions IS
  'AUTHORITATIVE state machine for booking status transitions.
  Any transition NOT in this table is ILLEGAL.
  Trigger enforces this on bookings table updates.';

-- =============================================================================
-- TRIGGER: Enforce state machine
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_booking_state_machine()
RETURNS TRIGGER AS $$
DECLARE
  v_transition RECORD;
BEGIN
  -- Allow INSERT (no old state to check)
  IF TG_OP = 'INSERT' THEN
    -- Validate initial state is valid
    IF NEW.status NOT IN ('draft', 'submitted') THEN
      RAISE EXCEPTION 'New bookings must start in draft or submitted status'
        USING HINT = 'Initial status was: %', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Skip if status unchanged
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Check if transition is allowed
  SELECT * INTO v_transition
  FROM booking_state_transitions
  WHERE from_status = OLD.status
    AND to_status = NEW.status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Illegal booking status transition: % → %',
      OLD.status, NEW.status
      USING HINT = 'Check booking_state_transitions table for valid transitions';
  END IF;

  IF NOT v_transition.allowed THEN
    RAISE EXCEPTION 'Booking status transition not allowed: % → %',
      OLD.status, NEW.status
      USING HINT = v_transition.notes;
  END IF;

  -- Check provider requirement
  IF v_transition.requires_provider AND NEW.provider_id IS NULL THEN
    RAISE EXCEPTION 'Status % requires provider assignment',
      NEW.status
      USING HINT = 'Assign provider_id before changing to this status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_state_machine_trigger ON bookings;
CREATE TRIGGER enforce_state_machine_trigger
  BEFORE UPDATE OF status
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_state_machine();

COMMENT ON TRIGGER enforce_state_machine_trigger ON bookings IS
  'Enforces booking_state_transitions table rules.
  Prevents illegal status changes, ensures provider requirements met.';
```

---

## ISSUE 4: AVAILABILITY vs CAPACITY NOT RECONCILED (CRITICAL)

### The Problem

**Two independent systems that must agree:**

1. **`provider_availability`** - Time-based (when provider works)
2. **Capacity system** - Count-based (how many bookings)

**They don't talk to each other.**

### Failure Scenario

```sql
-- Provider availability
Monday 8am-12pm: Available
Monday 1pm-5pm: NOT available

-- Provider capacity
max_concurrent_bookings: 10

-- Current bookings
Monday 9am-11am: 10 bookings (at capacity)

-- New booking request
Monday 2pm-4pm (in unavailable window)

WHAT HAPPENS?
- Availability check: FAIL (not available 1-5pm)
- Capacity check: PASS (only counts concurrent, different time)

CURRENT SYSTEM: Could accept booking (capacity trigger only)
CORRECT BEHAVIOR: Should reject (availability violated)
```

### Required Fix: Unified Availability + Capacity Check

```sql
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
  -- STEP 1: Check availability (time-based)
  IF p_is_emergency THEN
    -- Emergencies MAY override availability (policy decision needed)
    v_availability_ok := TRUE;
  ELSE
    -- Check if provider available during requested time
    SELECT EXISTS (
      SELECT 1
      FROM provider_availability pa
      WHERE pa.provider_id = p_provider_id
        AND pa.is_active = TRUE
        AND EXTRACT(DOW FROM p_busy_from) = pa.day_of_week
        AND p_busy_from::TIME >= pa.start_time
        AND p_busy_to::TIME <= pa.end_time
    ) INTO v_availability_ok;
  END IF;

  -- STEP 2: Check capacity (count-based with time overlap)
  SELECT * INTO v_capacity_result
  FROM check_provider_capacity(
    p_provider_id,
    p_service_id,
    p_busy_from,
    p_is_emergency
  );

  -- STEP 3: Both must pass
  IF v_availability_ok AND v_capacity_result.capacity_available THEN
    RETURN QUERY SELECT 
      TRUE,
      'Provider available and has capacity'::TEXT,
      TRUE,
      TRUE;
  ELSIF NOT v_availability_ok THEN
    RETURN QUERY SELECT 
      FALSE,
      FORMAT('Provider not available during requested time (%s - %s)', 
        p_busy_from::TIME, p_busy_to::TIME)::TEXT,
      FALSE,
      v_capacity_result.capacity_available;
  ELSE
    RETURN QUERY SELECT 
      FALSE,
      v_capacity_result.reason,
      TRUE,
      FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update capacity trigger to use unified check
-- (Replace enforce_provider_capacity function to call check_provider_can_accept)
```

---

## ISSUE 5: EMERGENCY OVERRIDE RULES INCOMPLETE (HIGH)

### Current Implementation

✅ `supports_emergency` checked via trigger  
✅ `emergency_capacity_reserved` slots defined  
⚠️ Override logic partial  

### ❌ UNANSWERED QUESTIONS

#### 5.1: Do Emergencies Ignore Availability?

**Scenario:** Emergency plumber needed at 2am. Provider schedule shows availability 8am-6pm only.

**Current system:** Availability not checked for emergencies (undefined)

**Required decision:**
```sql
-- OPTION A: Emergencies bypass availability
WHERE p_is_emergency OR (availability conditions)

-- OPTION B: Emergencies respect availability
WHERE (availability conditions)

-- OPTION C: Emergency-specific availability
emergency_availability table (separate 24/7 schedule)
```

**Must document in schema:**
```sql
COMMENT ON COLUMN service_capabilities.supports_emergency IS
  'Service supports 24/7 emergency bookings.
  POLICY: Emergency bookings BYPASS provider_availability schedules.
  Providers with supports_emergency=true implicitly available 24/7 for emergencies.';
```

#### 5.2: Hard Ceiling for Emergencies

**Current:** Soft override at 110%

**Question:** What is the ABSOLUTE maximum?

```sql
-- Current code allows 10% overrun
ELSIF v_current_count < (v_effective_max * 1.1)::INTEGER THEN
  -- Soft override
```

**But nothing prevents:**
- 50 emergencies when max=30
- Infinite emergency accumulation
- Provider burnout

**Required fix:**
```sql
-- Add hard ceiling
ALTER TABLE service_providers
ADD COLUMN emergency_hard_ceiling INTEGER CHECK (emergency_hard_ceiling >= max_concurrent_bookings);

COMMENT ON COLUMN service_providers.emergency_hard_ceiling IS
  'ABSOLUTE maximum bookings including emergencies. Safety valve.
  Example: max_concurrent=30, emergency_hard_ceiling=35
  Regular bookings stop at 30, emergencies can push to 35, then HARD STOP.
  NULL = no hard ceiling (not recommended)';
```

#### 5.3: Emergency Overlap Policy

**Question:** Can emergency bookings overlap each other infinitely?

**Current:** Yes (no limit on emergency count)

**Example:**
```
3 emergency plumbing jobs at same time
All at same location
Provider can only be at one location

Current system: Accepts all 3
Reality: Impossible to fulfill
```

**Required fix:**
```sql
-- Add emergency-specific capacity
ALTER TABLE service_providers
ADD COLUMN max_simultaneous_emergencies INTEGER DEFAULT 1 
  CHECK (max_simultaneous_emergencies > 0);

COMMENT ON COLUMN service_providers.max_simultaneous_emergencies IS
  'Maximum emergency bookings that can be IN_PROGRESS simultaneously.
  Default=1 (provider can only handle one emergency at a time).
  Some providers (teams) may set higher.';
```

---

## ISSUE 6: REASSIGNMENT SEMANTICS AMBIGUOUS (HIGH)

### Current State

✅ `needs_reassignment` status exists  
✅ Trigger sets status when capacity exceeded  
❌ **What happens next is undefined**

### Critical Questions

#### 6.1: Blocking vs Advisory

**Question:** Does `needs_reassignment` block booking execution?

```sql
-- Booking reaches needs_reassignment
-- Provider still assigned
-- scheduled_start arrives

DOES THE BOOKING EXECUTE?
- If yes: reassignment is advisory only (provider gets booking anyway)
- If no: reassignment is blocking (booking waits)
```

**Current system:** Ambiguous (no trigger prevents execution)

**Required decision:**
```sql
-- OPTION A: Blocking (recommended)
CREATE TRIGGER prevent_execution_if_needs_reassignment
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (OLD.status = 'needs_reassignment' AND NEW.status = 'in_progress')
  EXECUTE FUNCTION raise_exception('Cannot start booking pending reassignment');

-- OPTION B: Advisory (log warning but allow)
-- No trigger, reassignment is "best effort"
```

#### 6.2: Who Clears Status?

**Question:** How does booking exit `needs_reassignment`?

**Current:** Undefined

**Required rules:**
```sql
-- Valid exits from needs_reassignment:
1. submitted (reassigned to new provider)
2. cancelled_customer (customer cancels)
3. abandoned (system timeout)

-- WHO can trigger these?
- System (auto-reassignment)
- Admin (manual reassignment)
- Customer (cancel)

-- Document in state transitions table
```

#### 6.3: Provider Notification

**Current:** Notification sent to provider when flagged

**Question:** What should provider do?

**Options:**
1. **Nothing** - System handles reassignment
2. **Unassign** - Provider must click "release booking"
3. **Wait** - Booking auto-removed after timeout

**Required:** Pick one and enforce

---

## ISSUE 7: PRICING SNAPSHOT IMMUTABILITY UNENFORCED (HIGH)

### Current State

✅ `pricing_snapshot` column exists (JSONB)  
✅ Journey 2 documents usage  
❌ **No immutability enforcement**

### The Problem

```sql
-- Booking confirmed at 1,225 KES
UPDATE bookings SET pricing_snapshot = '{"base_amount": 1225.00}' WHERE id = X;

-- Later (after dispute or provider mistake)
UPDATE bookings SET pricing_snapshot = '{"base_amount": 2000.00}' WHERE id = X;
-- ✅ SUCCEEDS (wrong - evidence tampering)
```

**Consequences:**
- Dispute evidence invalidated
- Revenue accounting corrupted
- Legal liability

### Required Fix: Immutability Trigger

```sql
CREATE OR REPLACE FUNCTION enforce_pricing_snapshot_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL → value (initial population)
  IF OLD.pricing_snapshot IS NULL AND NEW.pricing_snapshot IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent any modification once set
  IF OLD.pricing_snapshot IS NOT NULL AND NEW.pricing_snapshot != OLD.pricing_snapshot THEN
    RAISE EXCEPTION 'pricing_snapshot is immutable once set'
      USING HINT = 'pricing_snapshot was: %, attempted change to: %', 
        OLD.pricing_snapshot, NEW.pricing_snapshot,
        ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS immutable_pricing_snapshot ON bookings;
CREATE TRIGGER immutable_pricing_snapshot
  BEFORE UPDATE OF pricing_snapshot
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_pricing_snapshot_immutability();

-- Also enforce NOT NULL after confirmation
ALTER TABLE bookings
ADD CONSTRAINT pricing_snapshot_required_after_confirmation
  CHECK (
    (status IN ('draft', 'submitted', 'provider_viewed')) OR
    (pricing_snapshot IS NOT NULL)
  );

COMMENT ON CONSTRAINT pricing_snapshot_required_after_confirmation ON bookings IS
  'pricing_snapshot MUST be populated before status reaches confirmed.
  Acts as legal evidence of agreed pricing. Immutable once set.';
```

---

## CHECKLIST: ABSOLUTE MINIMUM FOR SEEDING

| # | Issue | Status | Blocker |
|---|-------|--------|---------|
| 1 | Capacity authority defined | ⚠️ Partial | YES |
| 1a | Capacity NULL handling explicit | ❌ Missing | YES |
| 1b | "Concurrent" time semantics defined | ❌ Missing | YES |
| 1c | Recurring capacity enforcement | ❌ Missing | YES |
| 1d | Race condition mitigation | ❌ Missing | YES |
| 2 | Canonical busy time model | ❌ Missing | YES |
| 3 | State machine enforcement | ❌ Missing | YES |
| 4 | Availability + capacity reconciliation | ❌ Missing | YES |
| 5a | Emergency availability override policy | ❌ Missing | YES |
| 5b | Emergency hard ceiling | ❌ Missing | YES |
| 5c | Emergency overlap limits | ❌ Missing | YES |
| 6a | Reassignment blocking semantics | ❌ Missing | YES |
| 6b | Reassignment exit rules | ❌ Missing | YES |
| 7 | Pricing snapshot immutability | ❌ Missing | YES |

**Current Score: 2/14 ✅ (14%)**  
**Required Score: 14/14 ✅ (100%)**

---

## MIGRATION PRIORITIES

### Phase 1 (IMMEDIATE - 4 hours)
1. **Issue 2**: Add `busy_from`/`busy_to` columns (canonical time)
2. **Issue 3**: Implement state machine table + trigger
3. **Issue 7**: Add pricing snapshot immutability trigger

### Phase 2 (IMMEDIATE - 3 hours)
4. **Issue 1a-d**: Fix capacity ambiguities (authority, NULL, race conditions)
5. **Issue 4**: Create unified availability+capacity check
6. **Issue 6**: Define reassignment semantics

### Phase 3 (IMMEDIATE - 2 hours)
7. **Issue 5**: Finalize emergency override policies
8. **Testing**: Validate all constraints work

**Total Time: ~9 hours**

---

## CONCLUSION

**The schema is 86% incomplete for production seeding.**

Previous capacity work was correct in direction but:
- Missed 6 other critical issues
- Left 4 ambiguities in capacity itself
- Created false confidence

**DO NOT SEED until all 14 items checked.**

Every gap is a potential marketplace failure at scale.
