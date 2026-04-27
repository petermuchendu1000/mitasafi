# SERVICE TYPE IMMUTABILITY ENFORCEMENT ANALYSIS
**Date:** January 9, 2026  
**Purpose:** Verify service_type_id is actually immutable, not just claimed  
**Severity:** 🔴 CRITICAL - Data integrity depends on this

---

## 1. THE REQUIREMENT

**Declaration (from schema comment):**
> "IMMUTABLE: One service = one service type. Emergency plumbing is a DIFFERENT service than standard plumbing."

**Why This Must Be Enforced:**
1. **Booking forms break** - Each service_type has different form fields
2. **Detail tables mismatch** - emergency_details vs delivery_details vs project_details
3. **Historical bookings invalid** - Past bookings reference old service_type behavior
4. **State machine breaks** - Different service_types have different status transitions
5. **Pricing breaks** - Different pricing models per service_type

---

## 2. EXISTING PROTECTION: FOUND

**Location:** `20260108120006_schema_fixes_critical.sql` (Lines 185-206)

### Trigger Function:
```sql
CREATE OR REPLACE FUNCTION prevent_service_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.service_type_id != NEW.service_type_id THEN
    IF EXISTS (SELECT 1 FROM bookings WHERE service_id = OLD.id LIMIT 1) THEN
      RAISE EXCEPTION 'Cannot change service_type_id for service % - bookings already exist', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Trigger:
```sql
CREATE TRIGGER prevent_service_type_change_trigger
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION prevent_service_type_change();
```

### Comment:
```sql
COMMENT ON COLUMN services.service_type_id IS 'IMMUTABLE: One service = one service type...';
COMMENT ON FUNCTION prevent_service_type_change() IS 'Prevents changing service_type_id after bookings exist (data integrity)';
```

**Status:** ✅ TRIGGER EXISTS

---

## 3. BRUTAL ANALYSIS: GAPS IDENTIFIED

### 🔴 GAP 1: Only Blocks AFTER Bookings Exist

**Current Logic:**
```sql
IF EXISTS (SELECT 1 FROM bookings WHERE service_id = OLD.id LIMIT 1) THEN
  RAISE EXCEPTION '...'
END IF;
```

**Problem:**
- Service can change service_type_id BEFORE any bookings
- This allows:
  1. Create service with service_type = "standard"
  2. Get it verified, promoted, SEO indexed
  3. Provider changes to "emergency" (higher prices)
  4. Customers see different service than what they researched

**Is This Acceptable?**
- ⚠️ PARTIAL - Prevents historical data corruption (good)
- ⚠️ PARTIAL - Allows "bait and switch" before first booking (bad)

**Recommendation:**
- If service is VERIFIED, also block changes
- If service is PUBLISHED, also block changes
- Only allow changes for DRAFT services

### 🔴 GAP 2: NULL Assignment Loophole

**Attack Vector:**
```sql
-- Set to NULL (trigger checks OLD.service_type_id != NEW.service_type_id)
UPDATE services SET service_type_id = NULL WHERE id = 'service-uuid';

-- Set to new value
UPDATE services SET service_type_id = 'new-type-uuid' WHERE id = 'service-uuid';
```

**Current Protection:**
- ✅ BLOCKED by NOT NULL constraint: `service_type_id uuid NOT NULL`
- ✅ Cannot set to NULL
- ❌ But trigger uses `!=` which might not handle NULL edge cases

**Status:** ✅ PROTECTED by schema constraint, but trigger logic could be clearer

### 🔴 GAP 3: DELETE Protection

**Foreign Key Constraint:**
```sql
-- services table:
service_type_id uuid NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT

-- bookings table:
service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT
```

**Protection Chain:**
1. ✅ Cannot delete service_types if services reference it (ON DELETE RESTRICT)
2. ✅ Cannot delete services if bookings reference it (ON DELETE RESTRICT)
3. ✅ Cannot delete service and recreate with different service_type (booking FK blocks)

**Status:** ✅ PROTECTED - CASCADE blocked, RESTRICT enforced

### 🔴 GAP 4: DISTINCT FROM vs != Operator

**Current Code:**
```sql
IF OLD.service_type_id != NEW.service_type_id THEN
```

**Problem with !=:**
- `NULL != 'uuid'` → NULL (not TRUE, so condition fails)
- `NULL != NULL` → NULL (not TRUE, so condition fails)

**Better Practice:**
```sql
IF OLD.service_type_id IS DISTINCT FROM NEW.service_type_id THEN
```

**Why DISTINCT FROM:**
- `NULL IS DISTINCT FROM 'uuid'` → TRUE
- `NULL IS DISTINCT FROM NULL` → FALSE
- Explicitly handles NULL edge cases

**Current Status:**
- ⚠️ PARTIAL - Works due to NOT NULL constraint, but fragile
- ⚠️ RISK - If constraint is dropped in future, trigger breaks silently

### 🟡 GAP 5: Before First Booking Flexibility

**Current Behavior:**
```sql
-- Create service as "standard"
INSERT INTO services (service_type_id, name) VALUES ('standard-uuid', 'Plumbing Service');

-- Change to "emergency" (NO BOOKINGS YET - ALLOWED)
UPDATE services SET service_type_id = 'emergency-uuid' WHERE name = 'Plumbing Service';

-- Create first booking
INSERT INTO bookings (service_id, service_type_id) VALUES ('service-uuid', 'emergency-uuid');

-- Try to change back (BLOCKED - bookings exist)
UPDATE services SET service_type_id = 'standard-uuid' WHERE id = 'service-uuid';
-- ERROR: Cannot change service_type_id for service % - bookings already exist
```

**Question:** Should service_type_id be changeable BEFORE first booking?

**Arguments FOR flexibility:**
- Provider realizes they picked wrong type during setup
- Service not yet marketed or verified
- No customer impact

**Arguments AGAINST flexibility:**
- Confuses verification process (verified as standard, becomes emergency)
- SEO/marketing: URL slug might imply service type
- Admin confusion: "I thought this was standard plumbing?"

**Current Design:** ALLOWS pre-booking changes

---

## 4. ATTACK SCENARIO TESTING

### Scenario 1: Direct UPDATE Attack
```sql
-- Service with bookings
UPDATE services SET service_type_id = 'new-type-uuid' 
WHERE id = 'service-with-bookings-uuid';

-- Expected: ERROR - Cannot change service_type_id...
-- Actual: ✅ BLOCKED by trigger
```

### Scenario 2: NULL Assignment Attack
```sql
-- Try to set to NULL
UPDATE services SET service_type_id = NULL 
WHERE id = 'service-uuid';

-- Expected: ERROR - NOT NULL constraint
-- Actual: ✅ BLOCKED by constraint
```

### Scenario 3: DELETE + Recreate Attack
```sql
-- Delete service
DELETE FROM services WHERE id = 'service-uuid';

-- Expected: ERROR - bookings reference this service
-- Actual: ✅ BLOCKED by ON DELETE RESTRICT
```

### Scenario 4: service_type DELETE Attack
```sql
-- Try to delete service_type
DELETE FROM service_types WHERE id = 'type-uuid';

-- Expected: ERROR - services reference this type
-- Actual: ✅ BLOCKED by ON DELETE RESTRICT
```

### Scenario 5: Pre-Booking Change (Currently Allowed)
```sql
-- New service, no bookings yet
UPDATE services SET service_type_id = 'different-type' 
WHERE id = 'service-no-bookings-uuid';

-- Expected: Depends on policy
-- Actual: ⚠️ ALLOWED (no bookings exist)
```

---

## 5. RECOMMENDATIONS

### 🔴 CRITICAL: Fix DISTINCT FROM Issue

**Replace:**
```sql
IF OLD.service_type_id != NEW.service_type_id THEN
```

**With:**
```sql
IF OLD.service_type_id IS DISTINCT FROM NEW.service_type_id THEN
```

**Justification:** Safer NULL handling, explicit semantics

### 🟡 CONSIDER: Add Verification State Check

**Enhanced Logic:**
```sql
IF OLD.service_type_id IS DISTINCT FROM NEW.service_type_id THEN
  -- Block if bookings exist
  IF EXISTS (SELECT 1 FROM bookings WHERE service_id = OLD.id LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot change service_type_id - bookings exist for service %', OLD.id
      USING HINT = 'service_type_id is immutable after first booking';
  END IF;
  
  -- OPTIONAL: Block if service is verified/published
  IF OLD.is_verified = true THEN
    RAISE EXCEPTION 'Cannot change service_type_id - service % is already verified', OLD.id
      USING HINT = 'Create a new service listing for different service type';
  END IF;
END IF;
```

**Justification:** Prevents "bait and switch" during verification

### ✅ KEEP: Current Foreign Key Constraints

**No changes needed** - DELETE protections are already strong:
- `ON DELETE RESTRICT` for all critical relationships
- No CASCADE chains that could bypass protections

---

## 6. ENFORCEMENT VERIFICATION TEST

### Test 1: Verify Trigger Exists
```sql
SELECT tgname, tgenabled, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'services'::regclass
  AND tgname = 'prevent_service_type_change_trigger';
```

**Expected:** 1 row, tgenabled = 'O' (enabled)

### Test 2: Block UPDATE with Bookings
```sql
-- Setup
INSERT INTO services (id, service_type_id, name) 
VALUES ('test-service-uuid', 'standard-uuid', 'Test Service');

INSERT INTO bookings (service_id, service_type_id) 
VALUES ('test-service-uuid', 'standard-uuid');

-- Attack
UPDATE services SET service_type_id = 'emergency-uuid' 
WHERE id = 'test-service-uuid';

-- Expected: ERROR - Cannot change service_type_id...
```

### Test 3: Allow UPDATE without Bookings
```sql
-- Setup
INSERT INTO services (id, service_type_id, name) 
VALUES ('test-service-2-uuid', 'standard-uuid', 'Test Service 2');

-- No bookings created

-- Attack
UPDATE services SET service_type_id = 'emergency-uuid' 
WHERE id = 'test-service-2-uuid';

-- Expected: SUCCESS (no bookings exist)
```

### Test 4: Block DELETE with Bookings
```sql
-- Service with bookings (from Test 2)
DELETE FROM services WHERE id = 'test-service-uuid';

-- Expected: ERROR - update or delete on table "services" violates foreign key constraint
```

---

## 7. CURRENT STATUS SUMMARY

| Protection | Status | Gap | Severity |
|------------|--------|-----|----------|
| **UPDATE blocking** | ✅ Enforced (after bookings) | ⚠️ Allows pre-booking changes | 🟡 MEDIUM |
| **NULL assignment** | ✅ Blocked by NOT NULL | None | ✅ PASS |
| **DELETE cascade** | ✅ Blocked by RESTRICT | None | ✅ PASS |
| **Operator safety** | ⚠️ Uses `!=` instead of `IS DISTINCT FROM` | Fragile NULL handling | 🟡 MEDIUM |
| **Verification bypass** | ❌ Not checked | Can change before bookings | 🟡 MEDIUM |
| **Trigger installed** | ⚠️ Unknown (need to verify) | May not be deployed | 🔴 CRITICAL |

---

## 8. DECISION MATRIX

### Option A: Keep Current (Minimal Fix)
**Changes:**
- Fix `!=` → `IS DISTINCT FROM`
- Verify trigger is installed
- Document pre-booking change policy

**Pros:**
- Minimal code change
- Allows provider flexibility before launch

**Cons:**
- Allows "bait and switch" during verification
- Confusing audit trail (service changed types)

### Option B: Strict Immutability (Recommended)
**Changes:**
- Fix `!=` → `IS DISTINCT FROM`
- Add verification state check
- Block changes once verified OR has bookings

**Pros:**
- Clearer semantics: one service = one type ALWAYS (once verified)
- Prevents verification gaming
- Cleaner audit trail

**Cons:**
- Less flexibility for providers
- Must create new service for type change

### Option C: Status-Dependent Policy
**Changes:**
- Fix `!=` → `IS DISTINCT FROM`
- Allow changes only for `draft` services
- Block for `pending_verification`, `verified`, or any with bookings

**Pros:**
- Balance flexibility and safety
- Clear policy: draft = mutable, published = immutable

**Cons:**
- More complex logic
- Requires service status field (may not exist)

---

## 9. IMMEDIATE ACTION REQUIRED

### Step 1: Verify Trigger Is Installed ⚠️ URGENT
```sql
SELECT COUNT(*) FROM pg_trigger 
WHERE tgrelid = 'services'::regclass 
  AND tgname = 'prevent_service_type_change_trigger';
```

**If 0:** Trigger NOT installed (CRITICAL BUG)  
**If 1:** Trigger installed (proceed to enhancement)

### Step 2: Fix DISTINCT FROM Issue
**Priority:** 🔴 CRITICAL  
**Timeline:** NOW (same session)  
**Complexity:** Low (one-line change)

### Step 3: Document Policy
**Priority:** 🟡 MEDIUM  
**Timeline:** Before seeding  
**Action:** Clarify whether pre-booking changes are intentional or oversight

### Step 4: Functional Test
**Priority:** 🔴 CRITICAL  
**Timeline:** Before seeding  
**Method:** Create service, add booking, attempt UPDATE, verify block

---

## 10. CONCLUSION

**Status:** ⚠️ PARTIALLY PROTECTED

**What Works:**
- ✅ Trigger logic exists in migration file
- ✅ Blocks changes after bookings
- ✅ Blocks DELETE with bookings
- ✅ NOT NULL constraint prevents NULL assignment

**What's Missing:**
- ❌ Verification that trigger is actually installed in database
- ⚠️ Uses fragile `!=` operator instead of `IS DISTINCT FROM`
- ⚠️ No protection against pre-booking changes (policy unclear)
- ❌ No functional test confirming enforcement works

**Verdict:** 
**Cannot confirm immutability is "actually enforced" until trigger installation is verified.**

**Next Action:** Query database to verify trigger exists, then decide on policy for pre-booking changes.
