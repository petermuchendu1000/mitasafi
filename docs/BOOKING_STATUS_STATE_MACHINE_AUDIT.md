# BOOKING STATUS STATE MACHINE - RIGOROUS AUDIT
**Date:** January 9, 2026  
**Purpose:** Pre-seeding validation of booking_status lifecycle  
**Critical:** Database enforcement vs application logic analysis

---

## 1. CURRENT STATE: ENUM VALUES

**Total:** 21 values (15 original + 6 added in migration 20260109120001)

```sql
booking_status ENUM (
  -- Creation phase
  'draft',              -- Customer creating booking (no submission yet)
  'submitted',          -- Sent to provider(s)
  'provider_viewed',    -- Provider opened notification/listing
  
  -- Quote flow (for project/quote_only services)
  'quote_pending',      -- Provider needs to provide quote
  'quote_sent',         -- Provider submitted quote, awaiting customer
  'quote_accepted',     -- Customer accepted quoted price
  'quote_rejected',     -- Customer rejected quote (terminal for this provider)
  
  -- Confirmed phase
  'confirmed',          -- Both parties agreed (provider accepted or quote accepted)
  'scheduled',          -- Future booking assigned and scheduled
  
  -- Execution phase
  'in_progress',        -- Provider on-site, work started
  'completed',          -- Provider marked work as finished
  
  -- Post-completion
  'provider_no_show',   -- Provider did not arrive
  'customer_no_show',   -- Customer unavailable (delivery/personal services)
  'customer_confirmed', -- Customer verified completion
  'payment_pending',    -- Awaiting payment processing
  'payment_failed',     -- Payment attempt failed
  
  -- Terminal states
  'cancelled_customer', -- Customer cancelled
  'cancelled_provider', -- Provider cancelled
  'disputed',           -- Dispute raised
  'resolved',           -- Dispute resolved or booking finalized
  'needs_reassignment'  -- Provider capacity reached, need new provider
);
```

---

## 2. DATABASE CONSTRAINTS ANALYSIS

### 2.1 Schema Examination Results

**Tables Searched:**
- ✅ `bookings` table (20260108120003_booking_core.sql)
- ✅ `booking_status_history` table
- ✅ All migration files

**Findings:**

#### ❌ NO DATABASE-LEVEL TRANSITION VALIDATION
```sql
-- bookings.status field:
status booking_status DEFAULT 'draft'

-- NO CHECK constraints
-- NO triggers on status updates
-- NO foreign key constraints
-- NO transition validation functions
```

**Critical Gap:** The database allows ANY transition between ANY two states with no validation.

**Example Invalid Transitions (Currently Allowed):**
```sql
-- ❌ Jump from draft to completed (no work done)
UPDATE bookings SET status = 'completed' WHERE status = 'draft';

-- ❌ Move from resolved back to submitted (backward time travel)
UPDATE bookings SET status = 'submitted' WHERE status = 'resolved';

-- ❌ Skip from submitted to customer_confirmed (no execution)
UPDATE bookings SET status = 'customer_confirmed' WHERE status = 'submitted';

-- ❌ Move from cancelled to in_progress (resurrection)
UPDATE bookings SET status = 'in_progress' WHERE status = 'cancelled_customer';
```

**All of these will succeed** because there are no DB constraints.

---

## 3. APPLICATION-ENFORCED TRANSITIONS

### 3.1 Journey 1: Emergency Plumbing (Validated)

**Observed Transitions:**
```
draft → submitted
submitted → confirmed
confirmed → in_progress
in_progress → completed
completed → customer_confirmed
customer_confirmed → (payment) → resolved
```

**Special Cases:**
- Quote flow NOT used (emergency fixed-price or quote_only after arrival)
- No rescheduling (emergency = immediate)
- No cancellation shown in journey

### 3.2 Journey 2: Recurring Laundry (Validated)

**Observed Transitions:**
```
draft → submitted
submitted → confirmed
confirmed → scheduled (for future weeks)
scheduled → in_progress
in_progress → completed
completed → customer_confirmed
customer_confirmed → resolved
```

**Special Cases:**
- `scheduled` state used for pre-assigned future bookings
- `needs_reassignment` used when provider capacity reached
- Recurring parent stays in 'active' (NOT a booking_status value - this is an error in journey doc)

---

## 4. COMPLETE STATE MACHINE MAPPING

### 4.1 Valid Forward Transitions (Application Logic)

#### From: `draft`
- ✅ → `submitted` (customer submits booking)
- ✅ → `cancelled_customer` (customer abandons draft)

#### From: `submitted`
- ✅ → `provider_viewed` (provider opens notification)
- ✅ → `quote_pending` (for services requiring quotes)
- ✅ → `confirmed` (provider accepts directly - standard/emergency/delivery)
- ✅ → `cancelled_customer` (customer cancels before provider responds)
- ✅ → `cancelled_provider` (provider declines)
- ✅ → `needs_reassignment` (auto-assign failed, need new provider)

#### From: `provider_viewed`
- ✅ → `quote_pending` (provider requests time to quote)
- ✅ → `confirmed` (provider accepts immediately)
- ✅ → `cancelled_provider` (provider declines after viewing)

#### From: `quote_pending`
- ✅ → `quote_sent` (provider submits quote)
- ✅ → `cancelled_provider` (provider withdraws)

#### From: `quote_sent`
- ✅ → `quote_accepted` (customer accepts quote)
- ✅ → `quote_rejected` (customer rejects quote)
- ✅ → `cancelled_customer` (customer withdraws booking)

#### From: `quote_accepted`
- ✅ → `confirmed` (quote acceptance = confirmation)

#### From: `quote_rejected`
- ⚠️ **TERMINAL** (for this provider)
- ⚠️ Application may re-submit to different provider (new booking record)

#### From: `confirmed`
- ✅ → `scheduled` (future booking, time assigned)
- ✅ → `in_progress` (immediate booking, provider arrives)
- ✅ → `cancelled_customer` (customer cancels before work starts)
- ✅ → `cancelled_provider` (provider cancels before arriving)
- ✅ → `provider_no_show` (scheduled time passed, provider didn't arrive)
- ✅ → `needs_reassignment` (provider can't fulfill, need replacement)

#### From: `scheduled`
- ✅ → `in_progress` (scheduled time arrives, provider starts work)
- ✅ → `cancelled_customer` (customer cancels future booking)
- ✅ → `cancelled_provider` (provider cancels scheduled booking)
- ✅ → `provider_no_show` (scheduled time passed, no arrival)
- ✅ → `needs_reassignment` (provider capacity issue)

#### From: `in_progress`
- ✅ → `completed` (provider finishes work)
- ✅ → `customer_no_show` (customer unavailable - delivery/personal only)
- ✅ → `cancelled_customer` (customer cancels mid-work - rare, dispute territory)
- ✅ → `cancelled_provider` (provider abandons work - rare, dispute territory)

#### From: `completed`
- ✅ → `customer_confirmed` (customer verifies quality)
- ✅ → `disputed` (customer reports issue)
- ✅ → `payment_pending` (if customer confirmation not required)

#### From: `provider_no_show`
- ✅ → `needs_reassignment` (find new provider)
- ✅ → `cancelled_customer` (customer gives up)
- ✅ → `resolved` (refund issued, case closed)

#### From: `customer_no_show`
- ✅ → `cancelled_customer` (customer didn't receive service)
- ✅ → `resolved` (provider gets no-show fee)

#### From: `customer_confirmed`
- ✅ → `payment_pending` (initiate payment)
- ✅ → `disputed` (customer changes mind, reports issue)

#### From: `payment_pending`
- ✅ → `resolved` (payment successful)
- ✅ → `payment_failed` (payment declined)
- ✅ → `disputed` (payment issue)

#### From: `payment_failed`
- ✅ → `payment_pending` (retry payment)
- ✅ → `disputed` (payment cannot be resolved)

#### From: `cancelled_customer`
- ⚠️ **TERMINAL** (booking cancelled)
- ⚠️ Refund logic handled separately
- ❌ NO resurrection (cannot move to any other state)

#### From: `cancelled_provider`
- ⚠️ **TERMINAL** (booking cancelled)
- ⚠️ May trigger needs_reassignment in application (new booking)
- ❌ NO resurrection (cannot move to any other state)

#### From: `disputed`
- ✅ → `resolved` (dispute settled)
- ✅ → `cancelled_customer` (customer gets full refund)
- ✅ → `cancelled_provider` (provider fault, full refund)
- ✅ → `payment_pending` (partial refund, retry payment)

#### From: `resolved`
- ⚠️ **TERMINAL** (booking complete)
- ❌ NO further transitions allowed

#### From: `needs_reassignment`
- ⚠️ **QUASI-TERMINAL** (for this provider relationship)
- ⚠️ Application creates NEW booking with different provider
- ❌ NO resurrection of this booking record

---

## 5. FORBIDDEN TRANSITIONS (Must be blocked)

### 5.1 Backward Time Travel (CRITICAL)
```
❌ submitted → draft (cannot un-submit)
❌ in_progress → confirmed (cannot reverse work start)
❌ completed → in_progress (cannot un-finish)
❌ customer_confirmed → completed (cannot un-confirm)
❌ resolved → ANY (terminal state)
❌ cancelled_* → ANY (terminal states)
```

### 5.2 Skipping Critical Steps (CRITICAL)
```
❌ draft → completed (no work executed)
❌ submitted → completed (no provider acceptance)
❌ draft → in_progress (no submission or confirmation)
❌ confirmed → customer_confirmed (must go through execution)
❌ submitted → payment_pending (no work done)
```

### 5.3 Invalid State Combinations (CRITICAL)
```
❌ quote_rejected → confirmed (rejected quote cannot be confirmed)
❌ provider_no_show → in_progress (if they didn't show, can't start work)
❌ customer_no_show → customer_confirmed (customer wasn't there)
❌ cancelled_* → in_progress (cancelled bookings can't restart)
```

### 5.4 Resurrection (CRITICAL)
```
❌ resolved → ANY (final terminal state)
❌ cancelled_customer → ANY (except admin override for errors)
❌ cancelled_provider → ANY (except admin override for errors)
❌ needs_reassignment → ANY (this booking is dead, create new one)
```

---

## 6. RESCHEDULING ANALYSIS

### User's Critical Question: Can a booking be accepted → rescheduled → accepted again?

**Current Schema Answer:** ⚠️ NO EXPLICIT SUPPORT

**Problem Identified:**
```
confirmed → ??? → confirmed
```

**Missing States:**
- ❌ `rescheduling_requested` (customer/provider requests time change)
- ❌ `reschedule_pending` (awaiting other party's approval)

**Current Workaround (Application Logic):**
```sql
-- Option 1: Stay in 'confirmed', update scheduled_start
UPDATE bookings
SET scheduled_start = new_time, scheduled_end = new_end_time
WHERE id = 'booking-uuid'
AND status = 'confirmed';

-- Option 2: Use 'scheduled' state for future bookings
UPDATE bookings
SET status = 'scheduled', scheduled_start = new_time
WHERE id = 'booking-uuid'
AND status = 'confirmed';
```

**Gap Assessment:**
- ✅ Rescheduling is **supported** (update timestamp fields)
- ⚠️ Rescheduling **history** is NOT tracked in status
- ⚠️ No distinction between "original schedule" and "rescheduled N times"

**Recommendation:**
- Keep current approach (status unchanged during reschedule)
- Use `booking_status_history` to record reschedule events with reason
- Consider adding `reschedule_count` integer field to bookings table

---

## 7. CANCELLATION ANALYSIS

### User's Critical Questions

#### Q1: Can provider cancel after acceptance?
**Answer:** ✅ YES
```
confirmed → cancelled_provider (provider emergency, capacity, etc.)
scheduled → cancelled_provider (provider can't fulfill scheduled booking)
```

**Database Support:** ✅ Enum value exists  
**Validation:** ❌ NO constraints on timing  
**Gap:** No penalty/refund logic in schema (application layer)

#### Q2: Can customer cancel after provider en route?
**Answer:** ✅ YES (technically), but context matters

**State-specific:**
```
confirmed → cancelled_customer ✅ (before provider leaves)
in_progress → cancelled_customer ⚠️ (mid-work cancellation = dispute territory)
```

**Database Support:** ✅ Enum value exists  
**Validation:** ❌ NO constraints on timing  
**Gap:** No cancellation policy enforcement (e.g., "no cancellation within 30 min of start")

---

## 8. NO-SHOW ANALYSIS

### User's Critical Question: Is there a distinct state for provider_no_show and customer_no_show?

**Answer:** ✅ YES (as of migration 20260109120001)

**States:**
```
confirmed → provider_no_show (scheduled time passed, provider never arrived)
confirmed → customer_no_show (provider arrived, customer unavailable)
scheduled → provider_no_show (scheduled booking, provider didn't show)
in_progress → customer_no_show (delivery/personal: customer not at location)
```

**Database Support:** ✅ Both enum values exist  
**Validation:** ❌ NO automatic detection (requires manual status update)  
**Gap:** No time-based auto-transition (e.g., "if scheduled_start + 30min passed and status still 'confirmed' → provider_no_show")

---

## 9. DISPUTE ANALYSIS

### User's Critical Question: Can a booking move from completed → disputed?

**Answer:** ✅ YES

```
completed → disputed (customer reports quality issue)
customer_confirmed → disputed (customer changes mind after confirmation)
payment_pending → disputed (payment conflict)
```

**Database Support:** ✅ Enum value exists  
**Validation:** ❌ NO constraints  
**Gap:** No "dispute window" enforcement (e.g., "must dispute within 48 hours of completion")

### User's Critical Question: Can disputes reopen a booking financially without reopening it operationally?

**Answer:** ⚠️ MIXED (application logic required)

**Financial reopening (refund/partial credit):**
```
disputed → resolved (dispute settled, refund issued)
disputed → payment_pending (partial refund, retry payment for remaining)
```

**Operational reopening (redo work):**
```
disputed → ??? (NO STATE for "redo_work")
```

**Gap Identified:**
- ❌ No `rework_required` state
- ❌ No `partial_completion` state
- ⚠️ If work needs to be redone, must create NEW booking

**Recommendation:**
- Add `rework_required` state (disputed → rework_required → confirmed → in_progress → completed)
- OR use application logic to create child booking linked to original

---

## 10. PARTIAL COMPLETION ANALYSIS

### User's Critical Question: Implicit in "most systems fail at partial completion"

**Answer:** ❌ NO SUPPORT in current schema

**Problem Scenarios:**
```
Project: "I completed 60% of the work, need to return tomorrow"
Delivery: "I picked up laundry but couldn't deliver today"
Emergency: "I fixed the leak but need parts for full repair"
```

**Current Status Flow:**
```
in_progress → ??? (work paused but not complete)
```

**Missing States:**
- ❌ `partially_completed` (work done but incomplete)
- ❌ `paused` (work temporarily stopped, will resume)
- ❌ `requires_parts` (waiting for materials)

**Current Workaround:**
```
in_progress → completed + notes ("60% complete, returning tomorrow")
OR
in_progress → (stays in_progress) + provider notes
```

**Gap Severity:** 🔴 HIGH  
**Impact:** Project and multi-visit services cannot properly track partial work

**Recommendation:**
- Add `partially_completed` state
- Add `requires_followup` state
- Add `multipart_completion_index` integer to bookings (e.g., visit 1 of 3)

---

## 11. ABANDONED BOOKINGS ANALYSIS

### User's Critical Question: Is there a distinct state for "abandoned"?

**Answer:** ⚠️ PARTIAL

**Definition Clarification:**
- **Abandoned by customer:** draft → (never submitted) → ???
- **Abandoned by provider:** submitted → (never responded) → ???
- **Abandoned mutually:** confirmed → (neither party acts) → ???

**Current Handling:**
```
draft → cancelled_customer (explicit abandonment)
submitted → (no state change, sits forever)
confirmed → (no state change, sits forever)
```

**Database Support:**
- ✅ `cancelled_customer` can represent abandonment
- ❌ No automatic abandonment detection
- ❌ No `abandoned` state (distinct from `cancelled`)

**Gap:** No time-based auto-abandonment (e.g., "if draft older than 7 days → abandoned")

**Recommendation:**
- Add `abandoned` state (distinct from cancellation - no penalty/refund logic)
- Add DB trigger or cron job for auto-abandonment
- Define abandonment rules:
  - Draft not submitted within 24 hours
  - Submitted not responded within 48 hours (non-emergency)
  - Confirmed with no progress within 72 hours

---

## 12. DATABASE ENFORCEMENT AUDIT

### 12.1 What IS Enforced by Database

**Type Safety:**
- ✅ Only valid enum values can be stored (PostgreSQL enum constraint)
- ✅ Cannot insert arbitrary strings like 'in_progres' or 'confirmd'

**Data Integrity:**
- ✅ Foreign key constraints prevent orphaned bookings
- ✅ Timestamp logic constraints (scheduled_end > scheduled_start)
- ✅ Price validation (must be positive if set)

**Audit Trail:**
- ✅ `booking_status_history` table captures all status changes
- ✅ Timestamps (created_at, updated_at) are automatic

### 12.2 What IS NOT Enforced by Database (Application Logic Only)

**State Transition Validation:**
- ❌ NO validation that transitions are logically valid
- ❌ NO prevention of backward time travel (resolved → submitted)
- ❌ NO prevention of skipping steps (draft → completed)

**Business Rules:**
- ❌ NO cancellation policy enforcement (time-based restrictions)
- ❌ NO dispute window enforcement (must dispute within X hours)
- ❌ NO auto-abandonment (stale bookings)
- ❌ NO auto-no-show detection (scheduled_start + grace_period passed)

**State-Dependent Field Requirements:**
- ❌ NO enforcement that `provider_id` must be set when status = 'confirmed'
- ❌ NO enforcement that `actual_start` must be set when status = 'in_progress'
- ❌ NO enforcement that `agreed_price` must be set when status = 'customer_confirmed'

**Terminal State Protection:**
- ❌ NO prevention of updating `resolved` or `cancelled_*` bookings
- ❌ NO prevention of changing provider_id after confirmation

---

## 13. CRITICAL GAPS & RISKS

### 🔴 CRITICAL (Must fix before seeding)

1. **No State Transition Validation**
   - Risk: Application bugs can create invalid state sequences
   - Impact: Data corruption, payment issues, customer disputes
   - Solution: Add DB trigger function to validate transitions

2. **No Terminal State Protection**
   - Risk: Resolved/cancelled bookings can be mutated
   - Impact: Audit trail becomes unreliable, payment records corrupted
   - Solution: Add trigger to block updates to terminal states (except admin override)

3. **Missing Partial Completion States**
   - Risk: Project/multi-visit services cannot track progress
   - Impact: Provider payment disputes, customer confusion
   - Solution: Add `partially_completed`, `requires_followup` states

### 🟠 HIGH (Should fix before production)

4. **No Abandonment Handling**
   - Risk: Stale bookings accumulate, metrics polluted
   - Impact: Provider notifications for dead bookings, dashboard clutter
   - Solution: Add `abandoned` state + auto-abandonment logic

5. **No Rework Support**
   - Risk: Disputed bookings requiring rework have no state
   - Impact: Must create new bookings (duplicate records)
   - Solution: Add `rework_required` state

6. **No Rescheduling State**
   - Risk: Cannot track rescheduling history in status field
   - Impact: Customer support can't see "this was rescheduled 3 times"
   - Solution: Add `reschedule_count` field + status_history tracking

### 🟡 MEDIUM (Post-MVP)

7. **No Time-Based Validation**
   - Risk: Cancellations/no-shows not auto-detected
   - Impact: Manual intervention required
   - Solution: Add cron job + triggers for time-based state transitions

8. **No State-Dependent Field Validation**
   - Risk: Inconsistent data (status='completed' but actual_end=NULL)
   - Impact: Reports break, customer confusion
   - Solution: Add CHECK constraints or triggers for required fields per state

---

## 14. RECOMMENDED IMMEDIATE ACTIONS

### Action 1: Add State Transition Validation Trigger (CRITICAL)

```sql
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same-state updates (e.g., updating other fields)
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  
  -- Define valid transitions
  IF OLD.status = 'draft' AND NEW.status NOT IN ('submitted', 'cancelled_customer') THEN
    RAISE EXCEPTION 'Invalid transition from draft to %', NEW.status;
  END IF;
  
  IF OLD.status = 'submitted' AND NEW.status NOT IN (
    'provider_viewed', 'quote_pending', 'confirmed', 
    'cancelled_customer', 'cancelled_provider', 'needs_reassignment'
  ) THEN
    RAISE EXCEPTION 'Invalid transition from submitted to %', NEW.status;
  END IF;
  
  -- Terminal states: NO transitions allowed
  IF OLD.status IN ('resolved', 'cancelled_customer', 'cancelled_provider', 'needs_reassignment') THEN
    RAISE EXCEPTION 'Cannot modify booking in terminal state: %', OLD.status;
  END IF;
  
  -- Add more validations for each state...
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_booking_status_transitions
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION validate_booking_status_transition();
```

### Action 2: Add Missing States (HIGH PRIORITY)

```sql
ALTER TYPE booking_status ADD VALUE 'partially_completed' AFTER 'completed';
ALTER TYPE booking_status ADD VALUE 'requires_followup' AFTER 'partially_completed';
ALTER TYPE booking_status ADD VALUE 'rework_required' AFTER 'disputed';
ALTER TYPE booking_status ADD VALUE 'abandoned' AFTER 'cancelled_provider';
```

### Action 3: Add State-Dependent Field Validation (MEDIUM PRIORITY)

```sql
-- Ensure provider_id is set when status reaches 'confirmed'
ALTER TABLE bookings ADD CONSTRAINT booking_confirmed_has_provider
  CHECK (
    (status NOT IN ('confirmed', 'scheduled', 'in_progress', 'completed', 'customer_confirmed'))
    OR provider_id IS NOT NULL
  );

-- Ensure actual_start is set when status is 'in_progress' or beyond
ALTER TABLE bookings ADD CONSTRAINT booking_in_progress_has_start
  CHECK (
    (status NOT IN ('in_progress', 'completed', 'customer_confirmed'))
    OR actual_start IS NOT NULL
  );
```

---

## 15. STATE MACHINE DIAGRAM

```
                                    ┌─────────────────────────────────────────┐
                                    │                                         │
                                    │          BOOKING LIFECYCLE              │
                                    │                                         │
                                    └─────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  CREATION PHASE                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    draft ────────────────► submitted ────────────► provider_viewed
      │                         │                          │
      │                         │                          │
      └─────────────►[cancelled_customer]◄─────────────────┤
                              [TERMINAL]                   │
                                                           │
                                                           ▼
                                                   cancelled_provider
                                                      [TERMINAL]

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  QUOTE FLOW (project/quote_only services)                                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    provider_viewed ──► quote_pending ──► quote_sent ──┬──► quote_accepted ──► confirmed
                                                       │
                                                       └──► quote_rejected
                                                            [TERMINAL]

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  CONFIRMATION & SCHEDULING                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    confirmed ──────┬──► scheduled ─────┬──► in_progress
       │            │       │            │
       │            │       │            │
       │            │       └────────────┼──► provider_no_show ──► needs_reassignment
       │            │                    │         [QUASI-TERMINAL]       [TERMINAL]
       │            │                    │
       │            └────────────────────┴──► cancelled_customer
       │                                           [TERMINAL]
       │
       └────────────────────────────────────► cancelled_provider
                                                   [TERMINAL]

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  EXECUTION PHASE                                                                         │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    in_progress ──────┬──► completed ──────┬──► customer_confirmed
         │            │                    │           │
         │            │                    │           │
         │            └────────────────────┴───────────┼──► disputed
         │                                             │         │
         └───────────────────────────────────►[customer_no_show]│
                                              [QUASI-TERMINAL]  │
                                                                │
                                                                ▼
                                                            resolved
                                                           [TERMINAL]

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  PAYMENT PHASE                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    customer_confirmed ──► payment_pending ──┬──► resolved [TERMINAL]
            │                     │           │
            │                     │           └──► payment_failed ──► disputed
            │                     │                                      │
            └─────────────────────┴──────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  TERMINAL STATES (No further transitions)                                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    [resolved]              - Booking successfully completed, payment finalized
    [cancelled_customer]    - Customer cancelled (refund logic separate)
    [cancelled_provider]    - Provider cancelled (may trigger reassignment in app)
    [quote_rejected]        - Customer rejected provider's quote
    [needs_reassignment]    - System must create new booking with different provider

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  QUASI-TERMINAL STATES (No status updates, but may trigger new bookings)                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    [provider_no_show]      - Provider didn't arrive (may create new booking or refund)
    [customer_no_show]      - Customer unavailable (provider gets no-show fee)

```

---

## 16. ENFORCEMENT SUMMARY

| Aspect | Database Enforced | Application Logic | Gap Severity |
|--------|-------------------|-------------------|--------------|
| **Enum type safety** | ✅ YES | N/A | None |
| **Foreign key constraints** | ✅ YES | N/A | None |
| **Price validation** | ✅ YES | N/A | None |
| **Timestamp logic** | ✅ YES | N/A | None |
| **Status transition validity** | ❌ NO | ⚠️ Required | 🔴 CRITICAL |
| **Terminal state protection** | ❌ NO | ⚠️ Required | 🔴 CRITICAL |
| **State-dependent fields** | ❌ NO | ⚠️ Required | 🟠 HIGH |
| **Cancellation policies** | ❌ NO | ⚠️ Required | 🟡 MEDIUM |
| **Dispute windows** | ❌ NO | ⚠️ Required | 🟡 MEDIUM |
| **Auto-abandonment** | ❌ NO | ⚠️ Required | 🟠 HIGH |
| **Auto-no-show detection** | ❌ NO | ⚠️ Required | 🟡 MEDIUM |
| **Partial completion** | ❌ NO | ⚠️ Required | 🔴 CRITICAL |
| **Rescheduling tracking** | ❌ NO | ⚠️ Required | 🟡 MEDIUM |

---

## 17. PRE-SEEDING DECISION

### ❌ DO NOT PROCEED WITH SEEDING YET

**Blockers:**
1. **State transition validation** - Must add trigger to prevent invalid transitions
2. **Terminal state protection** - Must prevent mutation of resolved/cancelled bookings
3. **Missing states** - Must add: `partially_completed`, `requires_followup`, `rework_required`, `abandoned`

**Once these are addressed:**
- ✅ State machine will be production-ready
- ✅ Database will enforce business rules, not just application
- ✅ Audit trail will be reliable

---

## 18. NEXT STEPS

1. **Create migration 20260109120002_booking_status_enforcement.sql**
   - Add state transition validation trigger
   - Add terminal state protection
   - Add state-dependent field constraints

2. **Create migration 20260109120003_booking_status_additional_states.sql**
   - Add `partially_completed`, `requires_followup`, `rework_required`, `abandoned` states

3. **Re-validate Journey documents**
   - Update Journey 1 & 2 to use new states where applicable
   - Add reschedule example to journeys
   - Add dispute → rework example

4. **THEN proceed with seeding**

---

**Status:** ⚠️ BLOCKED - Critical gaps identified  
**Severity:** 🔴 Cannot seed without state transition enforcement  
**Timeline:** 2-4 hours to implement enforcement + 1 hour to validate
