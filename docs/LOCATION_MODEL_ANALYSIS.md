# LOCATION MODEL ANALYSIS - BRUTAL AUDIT
**Date:** 2026-01-09  
**Status:** 🔴 CRITICAL RISKS IDENTIFIED  
**Analyst:** System Architecture Review

---

## EXECUTIVE SUMMARY

**VERDICT: LOCATION MODEL IS AT EXTREME RISK**

The location model has **MULTIPLE CRITICAL VULNERABILITIES** that will break historical bookings:

1. ❌ **Locations are fully mutable** - no immutability enforcement
2. ❌ **Hard deletes are allowed** - historical bookings will break
3. ❌ **No soft delete support** - no `archived_at` or `is_deleted` column
4. ❌ **Inconsistent DELETE behavior** - some RESTRICT, some SET NULL
5. ❌ **No location snapshot mechanism** - address changes destroy history

---

## 1. LOCATION TABLE STRUCTURE

### Current Schema (20260108120003_booking_core.sql)

```sql
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid,  -- Owner of this location (if saved)
  
  -- Address
  address_line1 text NOT NULL,
  address_line2 text,
  area text,  -- 'Westlands', 'Kilimani'
  city text DEFAULT 'Nairobi',
  county text,
  country text DEFAULT 'Kenya',
  postal_code text,
  
  -- Coordinates
  latitude decimal(10,8),
  longitude decimal(11,8),
  
  -- Access
  access_notes text,  -- Gate code, landmarks, instructions
  
  -- Type
  location_type location_type,
  
  -- Saved location
  is_saved boolean DEFAULT false,
  label text,  -- 'Home', 'Office', etc.
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### ❌ MISSING CRITICAL COLUMNS:
- `archived_at` - soft delete timestamp
- `is_deleted` / `is_archived` - soft delete flag
- `snapshot_of` - lineage tracking for address changes

### ⚠️ MUTABLE FIELDS (CAN CHANGE AFTER BOOKING):
- `address_line1`, `address_line2` - **PRIMARY ADDRESS**
- `area`, `city`, `county`, `country` - **LOCATION CONTEXT**
- `latitude`, `longitude` - **COORDINATES**
- `access_notes` - Service instructions
- `location_type` - Safety context
- `label` - User reference

---

## 2. LOCATION REFERENCES IN BOOKINGS

### A. Primary Service Location (20260108120007_add_service_location.sql)

```sql
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS service_location_id uuid
REFERENCES locations(id) ON DELETE SET NULL;
```

**Analysis:**
- ✅ Column added
- ❌ `ON DELETE SET NULL` - Allows location deletion, sets booking location to NULL
- ❌ Historical bookings lose location data on delete
- ❌ No trigger preventing deletion when bookings exist

**Comment Claims:**
> "Primary service location for this booking. Emergency/standard/personal use this as the only location."

**Reality:**
- Location can be deleted → `service_location_id` becomes NULL
- Location can be updated → booking now references wrong address
- No protection, no enforcement, no snapshot

### B. Delivery Flow Locations (_skip_20260108120004_booking_flow_details.sql)

```sql
CREATE TABLE IF NOT EXISTS booking_delivery_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Locations (using locations table)
  pickup_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  dropoff_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  ...
);
```

**Analysis:**
- ✅ `ON DELETE RESTRICT` - Prevents deletion if delivery bookings exist
- ❌ But this table is SKIPPED (not deployed)
- ❌ When deployed, will conflict with `service_location_id ON DELETE SET NULL`
- ❌ Still allows updates to address (mutability)

### C. Personal Service Locations (_skip_20260108120004_booking_flow_details.sql)

```sql
CREATE TABLE IF NOT EXISTS booking_personal_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  
  service_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  ...
);
```

**Analysis:**
- ✅ `ON DELETE RESTRICT` - Prevents deletion
- ❌ Table not deployed
- ❌ Duplicate `service_location_id` (also in bookings table)
- ❌ Still allows updates to address

---

## 3. DELETE BEHAVIOR MATRIX

| Reference | Table | Column | ON DELETE | Status | Risk |
|-----------|-------|--------|-----------|--------|------|
| **DEPLOYED** | bookings | service_location_id | **SET NULL** | ✅ Deployed | 🔴 **CRITICAL** - Historical data loss |
| Not Deployed | booking_delivery_details | pickup_location_id | RESTRICT | ❌ Skipped | 🟠 Will conflict with bookings.service_location_id |
| Not Deployed | booking_delivery_details | dropoff_location_id | RESTRICT | ❌ Skipped | 🟠 Will conflict |
| Not Deployed | booking_personal_details | service_location_id | RESTRICT | ❌ Skipped | 🟠 Duplicate column name |

### ❌ INCONSISTENCY ANALYSIS:

**Deployed Behavior:**
- `bookings.service_location_id ON DELETE SET NULL`
- **Anyone can delete any location**
- **Historical bookings lose location data**

**Planned Behavior (not deployed):**
- `booking_delivery_details.pickup_location_id ON DELETE RESTRICT`
- `booking_delivery_details.dropoff_location_id ON DELETE RESTRICT`
- **Prevents deletion if delivery bookings exist**

**Conflict:**
- Same location used by:
  - `bookings.service_location_id` (SET NULL)
  - `booking_delivery_details.pickup_location_id` (RESTRICT)
- **Which behavior wins?** RESTRICT (more restrictive)
- **But bookings.service_location_id still becomes NULL on delete attempt**
- **This is a logic bomb**

---

## 4. MUTABILITY ANALYSIS

### ❌ No Triggers Preventing Updates

**Current State:**
```sql
-- ONLY TRIGGER ON LOCATIONS:
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**What This Means:**
- ✅ `updated_at` gets set
- ❌ **No validation of changes**
- ❌ **No immutability enforcement**
- ❌ **No snapshot creation**

### Mutability Risk Scenarios:

**Scenario 1: User Updates Saved Location**
```sql
-- User saves "Home" location
INSERT INTO locations (id, user_id, address_line1, area, is_saved, label)
VALUES ('loc-1', 'user-1', '123 Old Address', 'Westlands', true, 'Home');

-- Booking references it
INSERT INTO bookings (service_location_id) VALUES ('loc-1');

-- User moves house, updates saved location
UPDATE locations SET address_line1 = '456 New Address', area = 'Kilimani'
WHERE id = 'loc-1';

-- PROBLEM: Historical booking now shows wrong address!
```

**Scenario 2: Admin Corrects Typo**
```sql
-- Location created with typo
INSERT INTO locations (address_line1) VALUES ('123 Westalnd Rd');  -- Typo

-- Booking references it
INSERT INTO bookings (service_location_id) VALUES ('loc-2');

-- Admin fixes typo
UPDATE locations SET address_line1 = '123 Westlands Rd'
WHERE id = 'loc-2';

-- PROBLEM: Audit trail lost, can't prove original address
```

**Scenario 3: Coordinates Updated**
```sql
-- Location has wrong coordinates
UPDATE locations SET latitude = -1.2921, longitude = 36.8219
WHERE id = 'loc-3';

-- PROBLEM: Provider navigated to old coordinates, now records show "correct" ones
```

---

## 5. CANONICAL "WHERE SERVICE HAPPENS"

### Current State: **AMBIGUOUS**

**Three Competing Sources:**

1. **bookings.service_location_id** (DEPLOYED)
   - Comment: "Primary service location for this booking"
   - `ON DELETE SET NULL` - Can be orphaned
   - Mutable - Can change address

2. **booking_delivery_details.pickup_location_id** (NOT DEPLOYED)
   - For delivery services only
   - `ON DELETE RESTRICT` - Protected
   - Still mutable

3. **booking_delivery_details.dropoff_location_id** (NOT DEPLOYED)
   - For delivery services only
   - `ON DELETE RESTRICT` - Protected
   - Still mutable

### ❌ No Clear Answer:

**Question:** "What address did the plumber visit on 2025-12-01?"

**Current Answer:** 
- Query: `SELECT l.address_line1 FROM bookings b JOIN locations l ON b.service_location_id = l.id WHERE b.id = 'booking-x'`
- **PROBLEM:** 
  - If location was deleted → `service_location_id = NULL` → No answer
  - If address was updated → Shows current address, not historical
  - If coordinates changed → Can't prove where provider actually went

---

## 6. REQUIRED ENFORCEMENT (IMMEDIATE)

### A. Prevent Hard Deletes

**Goal:** Locations used by bookings cannot be deleted

**Implementation:**
```sql
-- Option 1: Add soft delete
ALTER TABLE locations ADD COLUMN archived_at timestamptz;
CREATE INDEX idx_locations_active ON locations(id) WHERE archived_at IS NULL;

-- Option 2: Add DELETE trigger
CREATE FUNCTION prevent_location_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if location used by any booking
  IF EXISTS (
    SELECT 1 FROM bookings WHERE service_location_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete location % - referenced by booking(s)', OLD.id
      USING ERRCODE = '23503';  -- foreign_key_violation
  END IF;
  
  -- When booking_delivery_details deployed, also check:
  -- IF EXISTS (SELECT 1 FROM booking_delivery_details 
  --   WHERE pickup_location_id = OLD.id OR dropoff_location_id = OLD.id)
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_location_delete_trigger
  BEFORE DELETE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_location_delete();
```

### B. Prevent Address Mutation After Booking

**Goal:** Once location is used by booking, core address fields freeze

**Implementation:**
```sql
CREATE FUNCTION prevent_location_address_mutation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if location used by any booking
  IF EXISTS (
    SELECT 1 FROM bookings WHERE service_location_id = OLD.id
  ) THEN
    -- Freeze core address fields
    IF NEW.address_line1 IS DISTINCT FROM OLD.address_line1 OR
       NEW.address_line2 IS DISTINCT FROM OLD.address_line2 OR
       NEW.area IS DISTINCT FROM OLD.area OR
       NEW.city IS DISTINCT FROM OLD.city OR
       NEW.county IS DISTINCT FROM OLD.county OR
       NEW.latitude IS DISTINCT FROM OLD.latitude OR
       NEW.longitude IS DISTINCT FROM OLD.longitude THEN
      
      RAISE EXCEPTION 'Cannot change address for location % - referenced by booking(s). Create new location instead.', OLD.id
        USING ERRCODE = '23514';  -- check_violation
    END IF;
    
    -- Allow non-critical fields to change
    -- access_notes - OK (gate codes change)
    -- label - OK (user preference)
    -- location_type - Should also freeze? TBD
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_location_address_mutation_trigger
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_location_address_mutation();
```

### C. Add Soft Delete Support

**Goal:** Support "archiving" locations without breaking FKs

**Implementation:**
```sql
-- Add soft delete column
ALTER TABLE locations ADD COLUMN archived_at timestamptz;

-- Add soft delete function
CREATE FUNCTION archive_location(location_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE locations 
  SET archived_at = CURRENT_TIMESTAMP
  WHERE id = location_id AND archived_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Location % not found or already archived', location_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update indexes to exclude archived
CREATE INDEX idx_locations_active ON locations(id) WHERE archived_at IS NULL;

-- Update queries to filter archived (application level)
```

### D. Fix DELETE Behavior Inconsistency

**Current (DEPLOYED):**
```sql
service_location_id uuid REFERENCES locations(id) ON DELETE SET NULL
```

**Required:**
```sql
service_location_id uuid REFERENCES locations(id) ON DELETE RESTRICT
```

**Migration:**
```sql
-- Drop and recreate constraint
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_service_location_id_fkey;

ALTER TABLE bookings
ADD CONSTRAINT bookings_service_location_id_fkey
FOREIGN KEY (service_location_id) 
REFERENCES locations(id) 
ON DELETE RESTRICT;  -- Changed from SET NULL
```

---

## 7. LOCATION SNAPSHOT ARCHITECTURE (OPTIONAL BUT RECOMMENDED)

### Problem:
- Immutability prevents typo fixes
- Soft delete prevents cleanup
- Users need to update saved locations when they move

### Solution: Copy-on-Write

**Implementation:**
```sql
-- Add lineage tracking
ALTER TABLE locations ADD COLUMN snapshot_of uuid REFERENCES locations(id);
ALTER TABLE locations ADD COLUMN snapshot_reason text;

-- Function to create snapshot
CREATE FUNCTION create_location_snapshot(
  original_location_id uuid,
  reason text
)
RETURNS uuid AS $$
DECLARE
  new_location_id uuid;
BEGIN
  -- Create copy of location
  INSERT INTO locations (
    user_id, address_line1, address_line2, area, city, county, country,
    postal_code, latitude, longitude, access_notes, location_type,
    is_saved, label, snapshot_of, snapshot_reason
  )
  SELECT 
    user_id, address_line1, address_line2, area, city, county, country,
    postal_code, latitude, longitude, access_notes, location_type,
    is_saved, label, original_location_id, reason
  FROM locations
  WHERE id = original_location_id
  RETURNING id INTO new_location_id;
  
  RETURN new_location_id;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- 1. User wants to update saved "Home" location
-- 2. System creates snapshot (preserves historical bookings)
-- 3. System creates NEW location with updated address
-- 4. Future bookings use new location
-- 5. Historical bookings still reference old location (immutable)
```

---

## 8. VERIFICATION REQUIREMENTS

### Functional Tests Needed:

1. **Test Location Delete Protection**
   ```sql
   -- Should FAIL: Delete location used by booking
   -- Should PASS: Delete location not used
   ```

2. **Test Address Immutability**
   ```sql
   -- Should FAIL: Update address when booking exists
   -- Should PASS: Update address when no booking exists
   ```

3. **Test Soft Delete**
   ```sql
   -- Should PASS: Archive location
   -- Should FAIL: Archive same location twice
   -- Should PASS: Query excludes archived locations
   ```

4. **Test Snapshot Creation**
   ```sql
   -- Should PASS: Create snapshot of location
   -- Should VERIFY: Original location unchanged
   -- Should VERIFY: New location has snapshot_of reference
   ```

---

## 9. DECISION MATRIX

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Immutable Locations** | ✅ Perfect audit trail<br>✅ Historical accuracy<br>✅ Simple | ❌ Can't fix typos<br>❌ Users create duplicates | 🟢 **REQUIRED** (Core addresses) |
| **Soft Delete** | ✅ Preserves FKs<br>✅ Allows "deletion" | ❌ Clutters database<br>❌ Complex queries | 🟡 **OPTIONAL** (If cleanup needed) |
| **Copy-on-Write** | ✅ Allows updates<br>✅ Preserves history<br>✅ User-friendly | ❌ Complex to implement<br>❌ Creates many rows | 🟡 **OPTIONAL** (Future enhancement) |
| **Hard Delete** | ✅ Simple | ❌ Destroys history<br>❌ Breaks bookings | 🔴 **PROHIBITED** |

---

## 10. IMPLEMENTATION PRIORITY

### 🔴 CRITICAL (DO NOW):

1. **Change `ON DELETE SET NULL` to `ON DELETE RESTRICT`**
   - Migration: 20260109120022_fix_location_delete_behavior.sql
   - Impact: Prevents location deletion if bookings exist

2. **Add Address Immutability Trigger**
   - Migration: 20260109120023_enforce_location_immutability.sql
   - Prevents changes to core address fields after booking

3. **Functional Tests**
   - Migration: 20260109120024_test_location_protection.sql
   - Verify both delete and mutability protection

### 🟠 HIGH (BEFORE SEEDING):

4. **Add Soft Delete Support**
   - Migration: 20260109120025_add_location_soft_delete.sql
   - Adds `archived_at` column and archive function

5. **Update Queries to Exclude Archived**
   - Application code changes
   - Add `WHERE archived_at IS NULL` to all location queries

### 🟡 MEDIUM (FUTURE):

6. **Implement Copy-on-Write Snapshots**
   - Adds `snapshot_of` and `snapshot_reason` columns
   - Creates `create_location_snapshot()` function
   - UI for "Update saved location" flow

---

## 11. RISKS IF NOT FIXED

### Before Seeding:
- ❌ Test data can be deleted → Tests become flaky
- ❌ Seed locations can be mutated → Tests show wrong addresses
- ❌ No confidence in location model stability

### After Production Launch:
- ❌ Historical bookings lose location data
- ❌ "Where did service happen?" → No answer
- ❌ Disputes cannot be resolved (no proof of address)
- ❌ Provider navigation history destroyed
- ❌ Customer "I never lived there!" → No evidence
- ❌ Audit trail broken
- ❌ Legal liability

---

## 12. FINAL VERDICT

**STATUS: 🔴 LOCATION MODEL NOT PRODUCTION-READY**

### Required Actions:
1. ✅ Fix DELETE behavior (RESTRICT not SET NULL)
2. ✅ Enforce address immutability (trigger)
3. ✅ Functional tests (prove protection)
4. 🟡 Soft delete support (recommended)
5. 🟡 Copy-on-write (future enhancement)

### Timeline:
- Critical fixes: **30 minutes**
- Tests: **15 minutes**
- Soft delete: **20 minutes**
- **Total: ~1 hour before seeding**

### Sign-off Required Before:
- ❌ Seeding reference data
- ❌ Running Journey tests
- ❌ Production deployment

---

**Analysis Complete. Awaiting implementation decision.**
