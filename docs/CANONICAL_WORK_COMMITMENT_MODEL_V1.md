# CANONICAL WORK COMMITMENT MODEL (v1)
**Date:** January 9, 2026  
**Status:** DESIGN REVIEW (NOT IMPLEMENTED)  
**Purpose:** Single source of truth for capacity, time, and commitment

---

## CORE PRINCIPLE

**A commitment is the immutable record that the system has promised a specific provider will allocate specific capacity during a specific time for a specific booking.**

Everything else orbits this.

---

## AUTHORITY BOUNDARY (CRITICAL)

**Commitments may ONLY be created via a single authoritative database function.**

```
✅ ALLOWED: EXECUTE create_commitment_and_confirm_booking(...)
❌ FORBIDDEN: INSERT INTO booking_commitments (...)
```

**This applies to:**
- Application code
- Admin panels
- Background jobs
- One-off scripts
- Database migrations (for data repair)
- Future developers

**Why this is non-negotiable:**

1. **Invariant enforcement** - All capacity checks, validation, and atomic status updates happen in ONE place
2. **Permission boundary** - Direct INSERT revoked from all roles (including admins)
3. **Auditability** - All commitments provably went through validation
4. **Future-proofing** - New team members cannot accidentally bypass checks

**The function is the contract.**

If you feel tempted to INSERT directly "just this once" → you are about to break production.

---

## FUNCTION CONTRACT (CRITICAL REQUIREMENTS)

### Idempotency Requirement

**create_commitment_and_confirm_booking MUST be idempotent by booking_id.**

**Behavior on retry:**
```
If commitment already exists for booking_id:
  - Return success (not error)
  - No side effects (no duplicate inserts)
  - Return existing commitment details
```

**Why this matters:**
- Network drops between function success and app receiving response
- App retries the function call
- Without idempotency: Primary key violation, false failure
- With idempotency: Clean success, no duplicate attempts

**Implementation note:**
- Check for existing commitment FIRST
- Use `ON CONFLICT DO NOTHING` or explicit SELECT before INSERT
- Return consistent response structure regardless of create vs already-exists

---

## THE 6 QUESTIONS

### 1. WHEN IS A COMMITMENT CREATED?

A commitment is created **if and only if**:

1. Booking has passed all validation (service exists, customer valid, etc.)
2. Provider has been selected/assigned
3. Time window has been determined (active_from, active_to)
4. Pricing has been calculated and agreed
5. **Capacity check passes** (critical gate)
6. **Availability check passes** (if not emergency)

**Critical invariant:**
```
booking.status = 'confirmed' ↔ booking_commitments row EXISTS
```

This is **bidirectional and enforced**:
- Booking CANNOT enter 'confirmed' without commitment row
- Commitment row CANNOT exist without booking being 'confirmed'

**Transaction boundary:**
Both must happen atomically in the same transaction:
```
BEGIN;
  INSERT INTO booking_commitments (...);  -- If this fails, next line doesn't execute
  UPDATE bookings SET status = 'confirmed' WHERE id = ...;
COMMIT;
```

If commitment insert fails (capacity full, constraint violation) → booking stays in previous state (e.g., 'submitted', 'provider_viewed').

---

### 2. WHAT INPUTS ARE REQUIRED?

To create a commitment, the following MUST be known and validated:

**From booking context:**
- `booking_id` (UUID, unique, references bookings.id)
- `provider_id` (UUID, must exist in service_providers)
- `service_id` (UUID, must exist in services)

**Capacity:**
- `capacity_units` (INTEGER > 0)
  - Solo provider (plumber, taxi): 1
  - Team provider (2 of 3 cleaners): 2
  - Machine-based (5 of 10 washing machines): 5
  - **Must satisfy: capacity_units ≤ provider_services.concurrent_units**
  - Capacity check sums capacity_units (NOT booking count)
  
  **CRITICAL CONSTRAINT:**
  > **capacity_units MUST be a positive integer representing discrete units.**
  > **Fractions are FORBIDDEN.**
  > Duration belongs to time (active_from/active_to), not capacity units.
  
  **Rationale:**
  - Prevents "half-day job" = 0.5 units (capacity math breaks under overlap)
  - Ensures countable, discrete allocation
  - Keeps capacity arithmetic simple and deterministic
  
  **Examples:**
  - Cleaning company has 3 teams (concurrent_units=3)
  - Booking A needs 2 teams → capacity_units=2 ✓
  - Booking B needs 1 team → capacity_units=1 ✓
  - Both active simultaneously → 3/3 capacity used ✓

**Time (canonical):**
- `active_from` (TIMESTAMPTZ, when provider becomes busy)
- `active_to` (TIMESTAMPTZ, when provider becomes free)
- Constraint: `active_to > active_from`
- This is THE authoritative time range (not bookings.scheduled_start/end)

**Pricing (immutable evidence):**
- `pricing_snapshot` (JSONB, complete pricing calculation)
- Must include: base_amount, unit_rate, quantity, fees, total
- Frozen at commitment time (legal evidence)

**Metadata:**
- `committed_at` (TIMESTAMPTZ, defaults to NOW())

**Validation rules:**
1. Provider must have capacity available:
   ```
   SUM(capacity_units) 
   FROM booking_commitments 
   WHERE provider_id = X 
     AND (CASE 
       WHEN provider_services.capacity_scope = 'per_service' 
         THEN service_id = Y
       WHEN provider_services.capacity_scope = 'provider_wide' 
         THEN TRUE  -- Check across ALL services
     END)
     AND released_at IS NULL
     AND tstzrange(active_from, active_to) && requested_range
   
   + requested_capacity_units ≤ provider_services.concurrent_units
   ```
   
   **Capacity Scoping (Explicit and Enforceable):**
   
   **NEW COLUMN REQUIRED:**
   ```sql
   provider_services.capacity_scope ENUM('per_service', 'provider_wide') 
     NOT NULL DEFAULT 'per_service'
   ```
   
   **Rules:**
   - `per_service` = Capacity is scoped to this specific service only
     - Example: Cleaning company with 3 teams can do 3 cleaning jobs simultaneously
   - `provider_wide` = Capacity is shared across ALL provider's services
     - Example: Solo handyman can do plumbing OR electrical, but only 1 job total
   
   **Critical:** This eliminates ambiguity and prevents catastrophic overbooking.
   
   **ENFORCEMENT RULE:**
   > **If capacity_scope = 'provider_wide', concurrent_units MUST be equal across ALL provider services.**
   > Enforced by validation at service configuration time (NOT runtime).
   
   **Rationale:**
   - Prevents ambiguity about which concurrent_units limit is authoritative
   - Example failure without this: Plumbing (concurrent_units=1), Electrical (concurrent_units=2)
     - Which limit applies when checking provider-wide capacity?
     - Inconsistent limits → silent capacity violations
   - Solution: Force uniform limits when provider shares capacity pool
   
   **Example of failure mode without this flag:**
   - Solo handyman: plumbing (concurrent_units=1), electrical (concurrent_units=1)
   - Without flag: System allows plumbing 10:00-11:00 AND electrical 10:30-11:30 (overbooking!)
   - With flag set to 'provider_wide': Second commitment correctly rejected

2. Provider must be available (unless emergency):
   ```
   check_provider_availability_interval(
     provider_id, 
     service_id, 
     active_from, 
     active_to, 
     is_emergency
   ) = TRUE
   ```

3. Pricing snapshot must be non-null and valid JSON

---

### 3. WHAT CAN CHANGE BEFORE COMMITMENT?

**Before commitment exists, everything is negotiable:**

- Provider assignment (can be reassigned)
- Time window (can be rescheduled)
- Pricing (can be recalculated)
- Service selection (can be modified)
- Booking status (draft → submitted → provider_viewed)

**Capacity is NOT consumed during this phase.**

**This is the "soft" phase** where:
- Customer and provider are negotiating
- System is validating
- Nothing is promised
- No capacity is locked

---

### 4. WHAT IS FORBIDDEN AFTER COMMITMENT?

**Once a commitment row exists, the following are IMMUTABLE:**

1. **Provider (`provider_id`)**
   - Cannot be changed
   - To reassign: must release old commitment, create new one

2. **Time window (`active_from`, `active_to`)**
   - Cannot be changed
   - To reschedule: must release old commitment, create new one

3. **Pricing (`pricing_snapshot`)**
   - Cannot be changed
   - This is legal evidence

4. **Capacity allocation (`capacity_units`)**
   - Cannot be changed
   - Was validated at creation, now locked

5. **Service (`service_id`)**
   - Cannot be changed
   - Service capabilities frozen at commitment time

**The ONLY field that can be modified:**
- `released_at` (NULL → TIMESTAMPTZ, one-way only)

**Enforcement:**
- Triggers REJECT any UPDATE except released_at
- Triggers REJECT any DELETE
- Application code MUST NOT attempt these operations

**Booking status can still change AFTER commitment:**
- confirmed → scheduled (metadata change, not commitment change)
- scheduled → in_progress (execution started)
- in_progress → completed (execution finished)

But the commitment itself (capacity, time, provider) is frozen.

---

### 5. HOW IS COMMITMENT DESTROYED?

**Commitments are NEVER deleted. They are released.**

**Release mechanism:**
```sql
UPDATE booking_commitments
SET released_at = NOW()
WHERE booking_id = X
  AND released_at IS NULL;
```

**When is commitment released?**

1. **Customer cancellation**
   - Booking status → 'cancelled_customer'
   - Commitment released immediately
   - Capacity available for other bookings

2. **Provider cancellation**
   - Booking status → 'cancelled_provider'
   - Commitment released immediately
   - Capacity available for other bookings

3. **Completion** ⚠️ CRITICAL TIMING RULE
   - Booking status → 'completed'
   - **Commitment released at 'completed' (when provider finishes work)**
   - **NOT at 'customer_confirmed' (which may be hours/days later)**
   - Reason: Customer confirmation is about billing/trust, not capacity
   - **Actual completion overrides planned time for capacity release**
   
   **Examples:**
   - Commitment active: 10:00–12:00 (planned)
   - Provider finishes at 11:15 (actual)
   - Marks booking 'completed' at 11:15
   - **Capacity released at 11:15** (not 12:00)
   - Provider available for new bookings immediately
   
   - Cleaning job finishes at 12:00, customer confirms at 18:00
     - Capacity freed at 12:00 (provider available for new bookings)
     - Holding capacity until 18:00 creates artificial scarcity
   
   **Business implication:** Capacity math is optimistic (early completion benefits provider utilization)

4. **Abandonment**
   - Booking status → 'abandoned' (system timeout)
   - Commitment released automatically
   - Capacity available for other bookings

**Critical rule:**
```
Capacity counting ONLY includes commitments WHERE released_at IS NULL
```

**Why not DELETE?**

1. **Auditability** - Must prove capacity was reserved
2. **Temporal correctness** - Must answer "why was provider full at 10:15am yesterday?"
3. **Idempotency** - Retry-safe, no race conditions
4. **Dispute resolution** - Evidence for SLA claims, billing disputes

**Result:**
- Capacity released immediately (released_at = NOW())
- History preserved forever
- Queries remain simple: `WHERE released_at IS NULL`

---

### 6. HOW DOES EMERGENCY DIFFER (IF AT ALL)?

**Emergency bookings follow the EXACT SAME commitment model.**

**The ONLY difference is eligibility rules before commitment creation:**

**Regular booking:**
- Capacity check uses standard limit: `concurrent_units`
- Availability check required (must be in working hours)

**Emergency booking:**
- Capacity check uses extended limit: `concurrent_units + emergency_capacity_reserved`
- Availability check BYPASSED (24/7 assumed for emergency services)
- **Hard ceiling** (no percentage math, no soft overrides)
  - If emergency_capacity_reserved = 1 and concurrent_units = 3 → emergency max is 4
  - No 110% calculations (avoids fractional units and race conditions)
  - Emergency either succeeds or fails deterministically

**BUT:**
- Same table (`booking_commitments`)
- Same fields
- Same immutability rules
- Same release mechanism
- Same capacity counting logic

**Emergency changes eligibility, not mechanics.**

Once commitment is created, there is NO difference between emergency and regular:
- Both consume capacity_units
- Both have active_from/active_to
- Both are immutable
- Both are released the same way

**No special cases. No shadow paths.**

---

## TABLE DEFINITION

```sql
CREATE TABLE booking_commitments (
  -- Identity
  booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE RESTRICT,
  
  -- Who and what
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  
  -- Capacity
  capacity_units INTEGER NOT NULL CHECK (capacity_units > 0),
  
  -- Time (canonical, immutable)
  active_from TIMESTAMPTZ NOT NULL,
  active_to TIMESTAMPTZ NOT NULL,
  CONSTRAINT valid_time_range CHECK (active_to > active_from),
  
  -- Pricing (legal evidence, immutable)
  pricing_snapshot JSONB NOT NULL,
  CONSTRAINT pricing_snapshot_minimum_fields CHECK (
    pricing_snapshot ? 'total' AND
    pricing_snapshot ? 'currency'
  ),
  -- ⚠️ DO NOT EXPAND THIS CONSTRAINT
  -- Pricing is legal evidence, not executable logic
  -- Validation belongs at calculation time, not storage time
  -- v2 temptations to avoid: tax validation, schema versioning, field enforcement
  
  -- Lifecycle
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ NULL,
  CONSTRAINT release_after_commit CHECK (released_at IS NULL OR released_at >= committed_at)
);

-- Index for capacity queries (critical performance)
CREATE INDEX idx_commitments_capacity_check ON booking_commitments
  USING GIST (
    provider_id,
    service_id,
    tstzrange(active_from, active_to, '[]')
  )
  WHERE released_at IS NULL;

-- Index for provider utilization queries
CREATE INDEX idx_commitments_provider_time ON booking_commitments (provider_id, active_from, active_to)
  WHERE released_at IS NULL;
```

**Comments:**
```sql
COMMENT ON TABLE booking_commitments IS
  'CANONICAL source of truth for work commitments.
  
  INVARIANTS:
  - booking.status = confirmed ↔ commitment row exists
  - Once created, provider/time/pricing IMMUTABLE
  - Never deleted, only released (released_at)
  - Capacity counts ONLY WHERE released_at IS NULL
  
  This is the ONLY table capacity queries touch.';

COMMENT ON COLUMN booking_commitments.capacity_units IS
  'Number of concurrent units consumed. Must be ≤ provider_services.concurrent_units.
  Examples: 1 (solo), 3 (team of 3), 2 (2 of 3 teams), 10 (10 machines)';

COMMENT ON COLUMN booking_commitments.active_from IS
  'CANONICAL start of provider busy time. NOT bookings.scheduled_start.';

COMMENT ON COLUMN booking_commitments.active_to IS
  'CANONICAL end of provider busy time. NOT bookings.scheduled_end.';

COMMENT ON COLUMN booking_commitments.released_at IS
  'When commitment was released (capacity freed). NULL = active.
  Capacity queries: WHERE released_at IS NULL';
```

---

## LIFECYCLE (PLAIN ENGLISH)

### Phase 1: Pre-Commitment (Negotiation)
```
Booking created (draft)
  ↓
Customer fills details
  ↓
Booking submitted
  ↓
Provider views booking
  ↓
Provider may respond with quote
  ↓
Customer/provider negotiate

CAPACITY: Not consumed
COMMITMENT: Does not exist
STATUS: draft → submitted → provider_viewed
```

### Phase 2: Commitment Creation (The Gate)
```
System validates:
  1. Provider selected
  2. Time determined
  3. Pricing calculated
  4. Capacity available ← CRITICAL CHECK
  5. Availability confirmed (unless emergency)

IF ALL PASS:
  BEGIN TRANSACTION;
    INSERT INTO booking_commitments (...);
    UPDATE bookings SET status = 'confirmed';
  COMMIT;

IF ANY FAIL:
  Booking stays in previous status
  Customer notified (capacity full, reschedule, etc.)

CAPACITY: NOW CONSUMED (commitment exists)
COMMITMENT: Row created, immutable
STATUS: confirmed
```

### Phase 3: Post-Commitment (Execution)
```
Booking scheduled (time locked)
  ↓
Provider arrives (in_progress)
  ↓
Work performed
  ↓
Work completed
  ↓
Customer confirms

CAPACITY: Still consumed (commitment exists, released_at = NULL)
COMMITMENT: Unchanged (immutable)
STATUS: confirmed → scheduled → in_progress → completed
```

### Phase 4: Release (Capacity Freed)
```
TRIGGER EVENTS:
- Cancellation (customer or provider)
- Completion (work finished)
- Abandonment (timeout)

ACTION:
  UPDATE booking_commitments
  SET released_at = NOW()
  WHERE booking_id = X;

CAPACITY: Freed (released_at IS NOT NULL)
COMMITMENT: Preserved (for audit)
STATUS: cancelled_* OR completed OR abandoned
```

---

## INVARIANTS (ENFORCED)

### Invariant 1: Bidirectional Confirmation
```
booking.status = 'confirmed' ↔ ∃ booking_commitments row
```

### Invariant 2: Immutability Post-Commitment
```
Once booking_commitments row exists:
  provider_id = IMMUTABLE
  service_id = IMMUTABLE
  capacity_units = IMMUTABLE
  active_from = IMMUTABLE
  active_to = IMMUTABLE
  pricing_snapshot = IMMUTABLE
```

### Invariant 3: Append-Only Lifecycle
```
booking_commitments rows are:
  - Inserted once (commitment creation)
  - Updated once (released_at: NULL → NOW())
  - Never deleted
  - Never updated otherwise
```

### Invariant 4: Capacity Authority
```
ALL capacity queries MUST use:
  SELECT SUM(capacity_units)
  FROM booking_commitments
  WHERE released_at IS NULL
    AND tstzrange(active_from, active_to) && $range

NEVER:
  - Count bookings
  - Infer from status
  - Use scheduled_start/scheduled_end
```

### Invariant 5: Time Authority
```
active_from/active_to is THE authoritative time range FOR COMMITMENT DURATION.

bookings.scheduled_start/scheduled_end are:
  - Informational
  - May differ slightly (customer-facing vs provider-facing)
  - NOT used for capacity calculations

Commitment release (released_at) is THE authoritative moment for capacity availability.
  - Actual completion overrides planned end time
  - Cancellation releases capacity immediately
  - Schedule is plan, release is reality
```

### Invariant 6: Status Transitions Never Imply Capacity Changes
```
Booking status transitions (confirmed → scheduled → in_progress → completed)
NEVER create or release capacity.

ONLY:
  - Commitment row INSERT (creates capacity lock)
  - Commitment released_at UPDATE (releases capacity)

This is non-negotiable.
Future developers must not add capacity logic to status change triggers.
```

---

## WHAT COLLAPSES

With this model, the following problems **disappear**:

1. **Capacity race conditions** → Commitments created atomically in SERIALIZABLE transaction
2. **"Confirmed but overbooked"** → Impossible (commitment creation fails = status stays pre-confirmed)
3. **Recurring ambiguity** → Each child booking either gets commitment or doesn't
4. **Emergency override confusion** → Emergency just changes eligibility before commitment, same mechanics after
5. **Busy time hacks** → Gone (active_from/active_to is canonical)
6. **Trigger soup** → Gone (only reject invalid commitment attempts)
7. **Authority confusion** → Commitments table is DB-owned, bookings is workflow
8. **Pricing drift** → Impossible (pricing_snapshot frozen at commitment)
9. **Provider reassignment after confirmation** → Impossible (provider_id immutable post-commitment)

---

## WHAT THIS DOES NOT SOLVE (OUT OF SCOPE FOR V1)

1. **Hard-guarantee recurring reservations** - Would require capacity reservation system (v2)
2. **Auto-reassignment logic** - Application orchestration concern
3. **Service versioning** - Field freezing sufficient for v1
4. **Provider self-service capacity adjustment** - UI/UX concern
5. **Advanced emergency prioritization** - Business rules layer

---

## MIGRATION IMPACT

### Tables Added
- `booking_commitments` (new, authoritative)

### Tables Modified
- `bookings` - No longer authoritative for capacity/time/pricing

### Queries Changed
- ALL capacity checks → use `booking_commitments`
- ALL time overlap queries → use `active_from/active_to`
- ALL pricing evidence → use `pricing_snapshot` from commitments

### Triggers Removed
- Capacity enforcement triggers on bookings (logic moves to commitment creation)
- Notification triggers (move to app/stored procedures)
- Status mutation triggers (move to app/stored procedures)

### Triggers Kept (Rejectors Only)
- **State machine enforcement (CRITICAL - NON-OPTIONAL)**
  - BEFORE UPDATE ON bookings
  - Reject illegal status transitions
  - **ENFORCE: If NEW.status = 'confirmed', assert commitment EXISTS**
  - **Without this trigger, the entire model collapses**
- Immutability enforcement on commitments (reject UPDATE except released_at)

### Permissions
```sql
-- Revoke direct access to commitments (INCLUDING ADMINS)
REVOKE ALL ON booking_commitments FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON booking_commitments FROM app_role;
REVOKE INSERT, UPDATE, DELETE ON booking_commitments FROM admin_role;

-- Grant SELECT only for queries
GRANT SELECT ON booking_commitments TO app_role;

-- Grant function access only (the ONLY way to create/release)
GRANT EXECUTE ON FUNCTION create_commitment_and_confirm_booking TO app_role;
GRANT EXECUTE ON FUNCTION release_commitment TO app_role;

-- Even admins must use functions
GRANT EXECUTE ON FUNCTION create_commitment_and_confirm_booking TO admin_role;
GRANT EXECUTE ON FUNCTION release_commitment TO admin_role;
```

**Authority model:**
- `booking_commitments` table = DB-owned, immutable
- `create_commitment_and_confirm_booking()` function = single entry point
- `release_commitment()` function = single exit point
- Direct writes = impossible (permission denied)

---

## CONCRETE REAL-LIFE SCENARIOS (END-TO-END)

### Scenario 1: Solo Plumber (Standard Booking)

* Provider: John (solo plumber)
* concurrent_units = 1

**10:00–12:00**
Booking A attempts commitment → succeeds

**10:30–11:30**
Booking B attempts commitment → fails
(No commitment created, booking stays submitted)

✔ Correct
✔ No overbooking
✔ No rollback gymnastics

---

### Scenario 2: Cleaning Company (Teams)

* Provider: CleanCo
* concurrent_units = 3

Bookings:

* A needs 2 teams (capacity_units=2)
* B needs 1 team (capacity_units=1)
* C needs 1 team (capacity_units=1)

Commitment flow:

* A → OK (2/3 used) ✓
* B → OK (3/3 used) ✓
* C → FAIL (would be 4/3) ✓

Capacity check:
```
SUM(capacity_units) = 2 + 1 = 3
3 + 1 (requested) > 3 (concurrent_units) → REJECT
```

✔ Works correctly with capacity_units ≤ concurrent_units rule
✔ Sums units consumed, not booking count
✔ Accurately models team allocation

---

### Scenario 3: Emergency Plumbing at Night

* concurrent_units = 1
* emergency_capacity_reserved = 1

**02:00**

* Regular job already committed

Emergency booking:

* Eligibility allows extended capacity
* Commitment created
* capacity_units still counted
* released normally after completion

✔ No shadow logic
✔ No emergency-only tables
✔ No hidden overrides

---

### Scenario 4: Recurring Laundry (12 Weeks)

* Parent booking: no commitment
* Child booking Week 3:

  * Commitment succeeds → confirmed
* Child booking Week 7:

  * Commitment fails → booking remains submitted

✔ Honest behavior
✔ Customer notified
✔ No future promises violated

---

## DECISIONS LOCKED

### 1. Concurrent Recurring Generation

**Decision: SERIALIZED per provider (non-negotiable)**

If 12 child bookings generated simultaneously:
- They MUST NOT create commitments in parallel
- They MUST be serialized (sequential) per provider_id

Reason:
- Parallel generation races capacity checks
- Produces flaky overbooking (especially under load)

Enforcement:
- **Advisory locks keyed by provider** (required, not optional)
- Lock granularity:
  - If capacity_scope = 'per_service': `pg_advisory_xact_lock(hashtext(provider_id || service_id))`
  - If capacity_scope = 'provider_wide': `pg_advisory_xact_lock(hashtext(provider_id::text))`
- **NOT SERIALIZABLE isolation** (avoid retry storms under load)

**Why advisory locks, not SERIALIZABLE:**
- Deterministic ordering (first caller gets lock, others queue)
- Zero serialization failures
- Easier to debug (visible in pg_locks)
- Under high load: SERIALIZABLE + advisory = pathological contention

**Optimization (v1.1+):**
- If capacity_scope = 'per_service': Lock on (provider_id, service_id)
- If capacity_scope = 'provider_wide': Lock on (provider_id) only
- Reduces unnecessary serialization when services have independent capacity pools

Result:
- Child 1 → capacity check → commit (or fail)
- Child 2 → capacity check (sees Child 1) → commit (or fail)
- Deterministic, no races

### 2. Released Commitment Retention

**Decision: FOREVER (indefinite retention)**

Released commitments (released_at IS NOT NULL) are:
- Retained indefinitely for audit and analytics
- Never archived
- Never deleted

Reasons:
- Audit trail for disputes ("Why was provider unavailable on March 15?")
- Legal evidence for billing disputes
- Analytics (provider utilization over time)
- Compliance (financial record retention)

If storage becomes an issue (unlikely for years):
- Solution: PostgreSQL table partitioning by committed_at
- NOT: Deleting or archiving rows

### 3. Commitment Creation Failure Notification

**Decision: ASYNC (outside transaction)**

When commitment creation fails (capacity full):
- Transaction ROLLBACK immediately
- Notification sent AFTER transaction completes
- Never block transaction on notification delivery

### 4. Emergency Capacity Calculation

**Decision: Hard ceiling (no percentage overrides)**

Emergency capacity = `concurrent_units + emergency_capacity_reserved`
- No 110% calculations
- No soft overrides
- No fractional units
- Deterministic: either succeeds or fails

Example:
- concurrent_units = 3
- emergency_capacity_reserved = 1
- Regular max = 3
- Emergency max = 4 (hard ceiling)

### 5. Capacity Scope

**Decision: Explicit flag (provider_services.capacity_scope)**

- `per_service` = Capacity scoped to this service only
- `provider_wide` = Capacity shared across all provider's services
- Enforced via schema column (NOT a "data modeling rule")
- Prevents catastrophic overbooking for solo providers offering multiple services

---

## KNOWN LIMITATIONS (ACCEPTED V1 TRADE-OFFS)

These are **not bugs**. They are **conscious design choices** that prioritize:
- Simplicity over perfection
- Execution-driven behavior over pessimistic locking
- Centralized enforcement over distributed complexity

### 1. Execution Accuracy Depends on Provider Signals

**Limitation:**
Commitment accuracy relies on providers correctly signaling completion/cancellation.

**Failure scenarios:**
- Provider finishes at 13:30 but forgets to mark completed → capacity locked until manual intervention
- Provider marks completed early (at 11:45 for 12:00 end) → capacity freed while work ongoing (potential overbooking)

**Why this is acceptable:**
- System is **optimistic by design** and prioritizes utilization over pessimistic locking
- Risk is **operational** (training, UX, notifications), not structural
- Alternative (IoT-based completion detection, GPS verification) is v2 concern

**Mitigation:**
- App sends completion reminders
- Analytics flag "stale active commitments"
- Provider dashboard shows "current commitment" prominently
- **Operational guardrail: Track early completion abuse**
  - Record `actual_completed_at` vs `active_to` (bookings table)
  - Alert when completion happens "too early" relative to expected duration
  - Trust scoring: Providers who consistently finish 50%+ early → flag for review
  - This is analytics/trust, not capacity logic

**Explicit statement:**
> *"Commitment accuracy depends on provider execution signals. The system is optimistic by design and prioritizes utilization over pessimistic locking."*

---

### 2. Provider-Wide Capacity Requires Strict Configuration Enforcement

**Limitation:**
If `capacity_scope = 'provider_wide'`, all services MUST have identical `concurrent_units`.

This invariant is enforced **at configuration time**, not by database schema constraints.

**Failure scenario:**
- Plumbing: concurrent_units = 1
- Electrical: concurrent_units = 2  
- capacity_scope = 'provider_wide'
- **Which limit is authoritative? System behavior becomes ambiguous.**

**Why this is acceptable:**
- Configuration happens infrequently (provider onboarding/service addition)
- Enforcement point is clear (service configuration function)
- Runtime checks would add significant complexity

**Required implementation:**
> **There must be a single function that mutates provider_services.**
> That function must validate uniform concurrent_units when capacity_scope = 'provider_wide'.

**If that validation does not exist → this limitation becomes a bug.**

---

### 3. Idempotency Check Must Precede Capacity Check

**Limitation:**
Function must check for existing commitment **before** running capacity validation.

**Failure scenario (incorrect sequencing):**
- Two concurrent calls for same booking_id
- Both see "no commitment"
- Both run capacity check (expensive)
- First inserts commitment
- Second hits PK conflict but wasted capacity check resources
- Worse: Second might throw "capacity full" error (misleading)

**Why this is acceptable:**
- Correct sequencing is a **documentation requirement**, not a schema limitation
- Idempotency pattern is well-established

**Required constraint:**
> **Idempotency check (SELECT existing commitment) MUST precede capacity check inside create_commitment_and_confirm_booking().**

**Pseudo-code ordering:**
```sql
-- CORRECT ORDER
1. SELECT existing commitment by booking_id
2. IF EXISTS → return success
3. ELSE → run capacity check
4. ELSE → insert commitment

-- WRONG ORDER (will cause confusion)
1. Run capacity check  ← wasteful, can give misleading errors
2. SELECT existing commitment
3. IF EXISTS → return success
4. ELSE → insert commitment
```

---

### 4. Booking Status Requires State Machine Enforcement

**Limitation:**
The invariant `booking.status = 'confirmed' ↔ commitment exists` is only true if:
- Status transitions are enforced by triggers
- Those triggers check commitment existence

**Failure scenario (without enforcement):**
```sql
-- Careless future developer bypasses function
UPDATE bookings SET status = 'confirmed' WHERE id = X;
-- Now status = 'confirmed' but NO commitment exists
-- Invariant violated, capacity not reserved
```

**Why this is acceptable:**
- Permissions already revoke direct writes to booking_commitments
- State machine trigger is a standard pattern
- The risk is **developer error**, not user behavior

**Required implementation:**
> **booking status transitions MUST be enforced by a state machine trigger that:**
> - Rejects illegal transitions
> - Validates commitment existence when status → 'confirmed'
> - Prevents status → 'confirmed' without commitment

**If state machine trigger does not exist → this limitation becomes a bug.**

---

### 5. Optimistic Scheduling (Execution Overrides Planning)

**Limitation:**
Capacity is released based on **actual completion**, not **planned duration**.

**Behavior:**
- Booking A: 09:00–17:00 (planned), 1 unit
- Provider finishes at 11:30 (actual)
- Marks booking completed at 11:30
- released_at = 11:30
- **Capacity immediately available at 11:30** (not 17:00)

- Booking B: 12:00–13:00 attempts commitment
- Succeeds (A already released)

**Is this wrong?**
No. This is **execution-driven capacity management**.

**Real-world analogs:**
- Uber: Driver becomes available when trip ends, not when trip was estimated to end
- DoorDash: Dasher available when delivery confirmed, not when ETA expires
- Upwork: Contractor available when job marked complete, not when hours budgeted

**Philosophy:**
> *"Capacity is enforced against commitments, not against intent or plans. The system is execution-driven and rewards early completion."*

**Business implication:**
- Early completion → provider can take more jobs (utilization benefit)
- Late completion → next booking may be delayed (operational issue, not capacity violation)

**Why this is acceptable:**
- Alternative (pessimistic hold until planned end) creates artificial scarcity
- Optimistic release aligns with marketplace economics
- Execution reality > planning predictions

---

### Summary of Trade-Offs

| Limitation                      | Risk Level | Mitigation                         | Acceptable? |
| ------------------------------- | ---------- | ---------------------------------- | ----------- |
| Provider signal accuracy        | Medium     | UX, reminders, analytics           | ✅ Yes       |
| Config-time capacity validation | Medium     | Single config function required    | ✅ Yes       |
| Idempotency sequencing          | Low        | Documentation + code review        | ✅ Yes       |
| State machine enforcement       | Medium     | Trigger required                   | ✅ Yes       |
| Optimistic capacity release     | Low        | Business philosophy, not a bug     | ✅ Yes       |

**All 5 limitations are acceptable for v1.**
They are **operational concerns** or **implementation requirements**, not **structural flaws**.

---

## REVIEW CHECKLIST

- [x] Answers all 6 questions clearly
- [x] Invariants are explicit and enforceable
- [x] Table definition is minimal and complete
- [x] Lifecycle is described in plain English
- [x] No SQL beyond single table definition
- [x] Emergency bookings follow same mechanics
- [x] Cancellation preserves audit trail (released_at, not DELETE)
- [x] Commitment is prerequisite for confirmation (not consequence)
- [x] No v2 concerns (service versioning, work_units table, etc.)
- [x] Known limitations explicitly documented as conscious trade-offs

---

**STATUS:** APPROVED FOR IMPLEMENTATION  
**Design Phase:** COMPLETE  
**Attacks:** ENDED

**Valid Next Steps (ONLY):**
1. Write `create_commitment_and_confirm_booking()` stored procedure
2. Write `release_commitment()` stored procedure  
3. Write booking state machine trigger (enforce status ↔ commitment invariant)
4. Add `provider_services.capacity_scope` column
5. Write migration with rollback safety
6. Write failure-mode tests (capacity races, overbooking attempts, retry scenarios)

**NOT valid next steps:**
- Adding new primitives
- Solving v2 problems
- Expanding validation scope
- Over-engineering locking strategies
