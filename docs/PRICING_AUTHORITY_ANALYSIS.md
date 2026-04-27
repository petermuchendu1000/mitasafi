# PRICING AUTHORITY ANALYSIS - SINGLE SOURCE OF TRUTH
**Date:** January 9, 2026  
**Purpose:** Pre-seeding validation of pricing architecture  
**Critical:** Identify and enforce single source of monetary truth

---

## 1. CURRENT STATE: PRICE STORAGE LOCATIONS

### Found Locations Where Money Values Exist:

**1. `service_pricing` table (MUTABLE DESCRIPTIVE)**
```sql
pricing_display_type pricing_type NOT NULL
base_amount decimal(10,2)
currency text DEFAULT 'KES'
unit text  -- 'per kg', 'per hour', etc.
description text
```
- **Purpose:** Display to customers BEFORE booking
- **Mutability:** ✅ CAN BE UPDATED (provider changes prices)
- **Authority:** ❌ NOT authoritative for actual charges

**2. `bookings.quoted_price` (MUTABLE NEGOTIATION)**
```sql
quoted_price decimal(10,2)  -- Provider's quote (for project/quote_only services)
```
- **Purpose:** Provider's initial quote (for quote_only services)
- **Mutability:** ⚠️ CAN BE UPDATED (before customer accepts)
- **Authority:** ❌ NOT authoritative (quote can be rejected)

**3. `bookings.agreed_price` (CLAIMED AUTHORITY)**
```sql
agreed_price decimal(10,2)  -- Final agreed price
```
- **Purpose:** Price both parties agreed to
- **Mutability:** ⚠️ CAN BE UPDATED (no trigger protection found)
- **Authority:** ⚠️ CLAIMED as "final" but NOT enforced

**4. `bookings.pricing_snapshot` (DOCUMENTED IMMUTABLE)**
```sql
pricing_snapshot jsonb  -- CRITICAL: Immutable record
```
- **Purpose:** Legal record of pricing calculation at booking time
- **Mutability:** 📝 COMMENT says "immutable" but NO TRIGGER enforcement
- **Authority:** ⚠️ INTENDED as authoritative, NOT ENFORCED

**5. `booking_disputes.refund_amount` (DERIVED)**
```sql
refund_amount decimal(10,2)
```
- **Purpose:** Partial/full refund amount
- **Mutability:** ✅ CAN BE UPDATED (dispute resolution)
- **Authority:** ❌ NOT authoritative (derived from agreed_price)

**6. `bookings.payment_status` (EXECUTION STATUS)**
```sql
payment_status text DEFAULT 'pending'  -- 'pending', 'paid', 'refunded', 'disputed'
payment_method text  -- 'mpesa', 'card', 'cash'
payment_ref text  -- Transaction ID
```
- **Purpose:** Payment execution tracking
- **Mutability:** ✅ CAN BE UPDATED (payment lifecycle)
- **Authority:** ❌ NOT authoritative for amount

---

## 2. DOUBLE-AUTHORITY TRAP IDENTIFIED

### 🔴 CRITICAL PROBLEM: Two Fields Claim Authority

**Field 1: `bookings.agreed_price`**
- Name implies finality: "agreed"
- Used in state-dependent validation (customer_confirmed requires agreed_price)
- Mentioned in journeys as "final agreed price"

**Field 2: `bookings.pricing_snapshot`**
- Comment says "CRITICAL: Immutable record"
- Comment says "for dispute resolution"
- Journeys show this being set with full pricing breakdown

**The Trap:**
```sql
-- Scenario 1: What if they diverge?
agreed_price = 1000.00
pricing_snapshot = '{"total": 1200.00}'  -- Different!

-- Scenario 2: What if agreed_price changes post-confirmation?
UPDATE bookings SET agreed_price = 1500.00 
WHERE id = 'booking-uuid' AND status = 'customer_confirmed';
-- No trigger blocks this!

-- Scenario 3: What if pricing_snapshot changes after snapshot?
UPDATE bookings SET pricing_snapshot = '{"total": 900.00}'
WHERE id = 'booking-uuid';
-- No trigger blocks this!
```

---

## 3. JOURNEY DOCUMENT ANALYSIS

### Journey 1 (Emergency Plumbing) - Lines 790-800:

```sql
UPDATE bookings
SET 
  agreed_price = 8500.00,
  status = 'customer_confirmed',
  pricing_snapshot = '{
    "service_id": "...",
    "service_type": "emergency_repair",
    "pricing_type": "quote_only",
    "quoted_price": 8500.00,
    ...
  }'
```

**Observations:**
- ✅ Both fields set simultaneously
- ✅ Values match (8500 in both)
- ⚠️ No guarantee they stay synchronized
- ⚠️ No indication which is "source of truth"

### Journey 2 (Recurring Laundry) - Lines 352-371:

```sql
UPDATE bookings
SET 
  quoted_price = 1225.00,
  pricing_snapshot = '{
    "service_id": "laundry-service-uuid",
    "pricing_type": "per_unit",
    "estimated_quantity": 15.0,
    "actual_quantity": 17.5,
    "unit_rate": 70.00,
    ...
    "base_amount": 1225.00,
    ...
  }'
```

**Observations:**
- ⚠️ Sets `quoted_price` but NOT `agreed_price`
- ✅ pricing_snapshot contains full breakdown
- 🔴 **PROBLEM:** No explicit `agreed_price` setting
- 🔴 **PROBLEM:** Customer confirmation later - when does agreed_price get set?

**Journey 2 Comment (Line 371):**
> "pricing_snapshot per occurrence: ✅ (Week 1 price frozen)"

**This implies pricing_snapshot IS the authority, but schema doesn't enforce it.**

---

## 4. IMMUTABILITY ENFORCEMENT AUDIT

### 🔴 CRITICAL GAP: NO TRIGGER PROTECTION

**Searched for:**
```
immutable|read.*only|prevent.*update.*pricing|protect.*pricing|trigger.*pricing_snapshot
```

**Found:**
1. ❌ NO trigger preventing `agreed_price` updates
2. ❌ NO trigger preventing `pricing_snapshot` updates
3. ❌ NO trigger enforcing `agreed_price` = `pricing_snapshot.total`
4. ✅ ONLY comment saying "immutable" (not enforced)

**Existing State-Dependent Validation (20260109120004):**
```sql
-- Requires agreed_price for customer_confirmed+
IF NEW.status IN ('customer_confirmed', 'payment_pending', 'payment_failed', 'resolved') THEN
  IF NEW.agreed_price IS NULL THEN
    RAISE EXCEPTION 'Status "%" requires agreed_price to be set.';
  END IF;
END IF;
```

**What This Does NOT Do:**
- ❌ Does NOT prevent agreed_price updates after customer_confirmed
- ❌ Does NOT verify agreed_price matches pricing_snapshot
- ❌ Does NOT prevent pricing_snapshot modifications

---

## 5. QUOTE SNAPSHOTTING ANALYSIS

### Question: Are quotes also snapshotted?

**Current Flow:**
1. Provider sets `quoted_price` (mutable scalar)
2. Customer accepts quote
3. ???
4. **GAP:** No explicit "quote acceptance snapshot" creation

**Journey 1 Evidence (Line 748):**
```sql
SET quoted_price = 8500.00
```
- Sets scalar value
- No jsonb snapshot at quote stage
- Snapshot created only at customer acceptance (line 792)

**Problem:**
- Provider could theoretically change `quoted_price` AFTER customer sees it but BEFORE acceptance
- No immutable record of "what was shown to customer"

**Current Protection:** ❌ NONE (application must prevent this)

---

## 6. RECURRING BOOKING PRICE INDEPENDENCE

### Question: Is each child booking's price fully independent?

**Schema Evidence:**
- Each child booking is a separate row in `bookings` table
- Each has its own `agreed_price`, `quoted_price`, `pricing_snapshot`

**Journey 2 Evidence (Lines 350-371):**
```sql
-- Week 1 booking
UPDATE bookings
SET quoted_price = 1225.00, pricing_snapshot = '{...}'
WHERE id = 'child-booking-week1-uuid';
```

**Answer:** ✅ YES, each child is independent

**But:**
- ⚠️ No enforcement preventing parent booking price edits from affecting children
- ⚠️ No validation that recurring bookings maintain consistent pricing_snapshot structure
- ⚠️ No trigger preventing Week 1 agreed_price from being changed after Week 2 starts

---

## 7. PROVIDER PRICE EDITING AFTER ACCEPTANCE

### Question: Can provider edit price after acceptance?

**Current Status Transitions:**
```
submitted → confirmed (provider accepts)
confirmed → in_progress (work starts)
in_progress → completed (work done)
completed → customer_confirmed (customer verifies)
```

**Enforcement Check:**
```sql
-- Can provider do this?
UPDATE bookings SET agreed_price = 2000.00
WHERE id = 'booking-uuid' AND status = 'in_progress';
```

**Answer:** ✅ YES - Nothing prevents this!

**Status-based validation only checks:**
- ✅ agreed_price IS NOT NULL for certain states
- ❌ Does NOT check if value CHANGED after confirmation
- ❌ Does NOT freeze price at any stage

---

## 8. SINGLE SOURCE OF TRUTH DECLARATION

### 🔴 CURRENT STATE: NO CLEAR AUTHORITY

**The schema has:**
- `service_pricing.base_amount` (display, mutable)
- `bookings.quoted_price` (negotiation, mutable)
- `bookings.agreed_price` (claimed final, mutable)
- `bookings.pricing_snapshot` (claimed immutable, mutable)
- `booking_disputes.refund_amount` (adjustment, mutable)

**None of these is:**
1. Declared as THE authoritative source
2. Protected from modification
3. Non-nullable when required
4. Validated against other fields

### ⚠️ CANNOT DECLARE SINGLE SOURCE YET

**Why:**
- `agreed_price` is scalar (no breakdown for disputes)
- `pricing_snapshot` is jsonb (no strong typing)
- Neither is immutable
- No synchronization enforcement

---

## 9. LEGAL PROBLEM SCENARIOS

### Scenario 1: Price Divergence
```sql
-- Booking confirmed at 1000 KES
agreed_price = 1000.00
pricing_snapshot = '{"total": 1000.00, "breakdown": [...]}'

-- Provider "accidentally" updates
UPDATE bookings SET agreed_price = 1500.00 WHERE id = 'x';

-- Customer disputes
-- Question: Is it 1000 or 1500?
-- pricing_snapshot says 1000
-- agreed_price says 1500
-- Which is legally binding?
```

### Scenario 2: Snapshot Manipulation
```sql
-- After customer confirms
UPDATE bookings 
SET pricing_snapshot = '{"total": 1200.00, ...}'  -- Changed!
WHERE id = 'booking-uuid';

-- Customer has screenshot showing 1000
-- Database shows 1200
-- No audit trail of change
```

### Scenario 3: Recurring Price Creep
```sql
-- Week 1: 1000 KES agreed
-- Week 2: Provider wants 1100 KES

UPDATE bookings 
SET agreed_price = 1100.00
WHERE parent_booking_id = 'parent-uuid' AND recurrence_sequence = 2;

-- Is this allowed? Should customer be notified? Approve?
-- No enforcement exists.
```

---

## 10. REQUIRED FIXES (CRITICAL)

### Fix 1: Declare Authoritative Source

**DECLARATION:**

> **The legally authoritative price for a booking is stored in `bookings.pricing_snapshot->>'total'` after the booking reaches status `customer_confirmed`.**
>
> **Before `customer_confirmed`:**
> - Prices are negotiable
> - `quoted_price` and `agreed_price` may change
> - Customer has not committed
>
> **At `customer_confirmed`:**
> - `pricing_snapshot` MUST be set
> - `agreed_price` MUST equal `pricing_snapshot->>'total'`
> - Both become IMMUTABLE
>
> **After `customer_confirmed`:**
> - No price changes allowed (only refunds via disputes)
> - `pricing_snapshot` is the source of truth for disputes
> - `agreed_price` exists for query performance only

### Fix 2: Create Immutability Trigger

```sql
CREATE OR REPLACE FUNCTION protect_pricing_after_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- If booking is customer_confirmed or beyond, price fields are immutable
  IF OLD.status IN ('customer_confirmed', 'payment_pending', 'payment_failed', 'resolved') THEN
    
    -- Prevent agreed_price changes
    IF NEW.agreed_price IS DISTINCT FROM OLD.agreed_price THEN
      RAISE EXCEPTION 'Cannot modify agreed_price after customer confirmation. Booking: %, Old: %, New: %',
        OLD.id, OLD.agreed_price, NEW.agreed_price
        USING HINT = 'Use booking_disputes.refund_amount for adjustments';
    END IF;
    
    -- Prevent pricing_snapshot changes
    IF NEW.pricing_snapshot IS DISTINCT FROM OLD.pricing_snapshot THEN
      RAISE EXCEPTION 'Cannot modify pricing_snapshot after customer confirmation. Booking: %',
        OLD.id
        USING HINT = 'pricing_snapshot is immutable legal record';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Fix 3: Enforce Synchronization

```sql
CREATE OR REPLACE FUNCTION enforce_price_synchronization()
RETURNS TRIGGER AS $$
DECLARE
  snapshot_total decimal(10,2);
BEGIN
  -- When moving to customer_confirmed, verify agreed_price matches snapshot
  IF NEW.status = 'customer_confirmed' AND OLD.status != 'customer_confirmed' THEN
    
    -- Extract total from pricing_snapshot
    IF NEW.pricing_snapshot IS NOT NULL THEN
      snapshot_total := (NEW.pricing_snapshot->>'total')::decimal(10,2);
      
      -- Verify agreed_price matches
      IF NEW.agreed_price IS DISTINCT FROM snapshot_total THEN
        RAISE EXCEPTION 'agreed_price (%) does not match pricing_snapshot total (%). Booking: %',
          NEW.agreed_price, snapshot_total, NEW.id
          USING HINT = 'These must be synchronized at customer_confirmed';
      END IF;
    ELSE
      RAISE EXCEPTION 'pricing_snapshot required when status = customer_confirmed. Booking: %',
        NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Fix 4: Enforce Non-Null After Confirmation

Already exists in `validate_booking_state_fields()` (20260109120004), but needs pricing_snapshot:

```sql
-- Add to existing function:
IF NEW.status IN ('customer_confirmed', 'payment_pending', 'payment_failed', 'resolved') THEN
  IF NEW.pricing_snapshot IS NULL THEN
    RAISE EXCEPTION 'Status "%" requires pricing_snapshot to be set. Booking: %',
      NEW.status, NEW.id
      USING HINT = 'pricing_snapshot is the immutable legal record';
  END IF;
END IF;
```

### Fix 5: Quote Snapshotting

```sql
-- When quote is sent, snapshot it
CREATE OR REPLACE FUNCTION snapshot_quote_on_send()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'quote_sent' AND OLD.status != 'quote_sent' THEN
    IF NEW.quoted_price IS NOT NULL AND NEW.pricing_snapshot IS NULL THEN
      -- Create initial snapshot from quote
      NEW.pricing_snapshot := jsonb_build_object(
        'quoted_price', NEW.quoted_price,
        'currency', NEW.currency,
        'quoted_at', now(),
        'status', 'quote_sent'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 11. SUMMARY: CURRENT STATE vs REQUIRED STATE

### Current State: ❌ NOT PRODUCTION-READY

| Requirement | Current | Status |
|-------------|---------|--------|
| **Single source declared** | No - 4 fields with overlapping authority | ❌ FAIL |
| **Immutability enforced** | No - comment only, no triggers | ❌ FAIL |
| **Non-null after confirmation** | Partial - agreed_price only, not pricing_snapshot | ⚠️ PARTIAL |
| **Synchronization enforced** | No - agreed_price and pricing_snapshot can diverge | ❌ FAIL |
| **Quote snapshotting** | No - only at customer acceptance | ❌ FAIL |
| **Recurring independence** | Yes - separate rows | ✅ PASS |
| **Post-acceptance editing blocked** | No - provider can change prices | ❌ FAIL |

### Required State: ✅ PRODUCTION-READY

| Requirement | Solution |
|-------------|----------|
| **Single source declared** | Documentation: `pricing_snapshot->>'total'` after `customer_confirmed` |
| **Immutability enforced** | Trigger: `protect_pricing_after_confirmation()` |
| **Non-null enforced** | Extend: `validate_booking_state_fields()` to require pricing_snapshot |
| **Synchronization enforced** | Trigger: `enforce_price_synchronization()` |
| **Quote snapshotting** | Trigger: `snapshot_quote_on_send()` |
| **Audit trail** | Already exists: `booking_status_history` captures transitions |

---

## 12. DECISION: ❌ DO NOT SEED YET

**Reason:** Pricing authority is NOT properly enforced.

**Risks if we seed without fixing:**
1. Test data created with prices that can be mutated
2. Cannot demonstrate immutability to stakeholders
3. Would need to re-seed after adding triggers
4. False sense of completion

**Required Actions BEFORE seeding:**
1. ✅ Create trigger: `protect_pricing_after_confirmation()`
2. ✅ Create trigger: `enforce_price_synchronization()`
3. ✅ Create trigger: `snapshot_quote_on_send()`
4. ✅ Extend trigger: `validate_booking_state_fields()` for pricing_snapshot
5. ✅ Deploy all pricing protection migrations
6. ✅ Test with actual booking creation attempts
7. ✅ Document pricing authority in schema comments
8. ✅ THEN proceed to seeding

---

**Status:** ⚠️ BLOCKED - Pricing authority enforcement required  
**Severity:** 🔴 CRITICAL - Legal/financial risk  
**Timeline:** 2-3 hours to implement all pricing protections
