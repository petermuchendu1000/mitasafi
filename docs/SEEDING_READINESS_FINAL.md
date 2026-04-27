# SEEDING READINESS - FINAL STATUS
**Date:** January 9, 2026  
**Status:** ✅ SEED-SAFE (with documented constraints)

---

## ✅ ALL BLOCKERS RESOLVED

| Blocker | Issue | Fix Applied | Status |
|---------|-------|-------------|--------|
| A | capacity_scope inconsistent seeding | Removed DEFAULT - must specify explicitly | ✅ Fixed |
| B | Availability pattern conflicts | Documented restriction: global XOR per-service | ✅ Documented |
| C | booking_commitments ordering | Already guarded with to_regclass() | ✅ Safe |
| D | Booking deletion without release | Added prevent_booking_deletion trigger | ✅ Fixed |

---

## SEEDING ORDER (MANDATORY)

```
Phase 1: Discovery Layer (no dependencies)
├── service_categories
├── service_subcategories
├── service_types
├── services
├── service_capabilities
└── booking_state_transitions

Phase 2: Provider Identity (no capacity)
├── service_providers (profile only)
├── provider_verification_documents
└── provider_service_areas

Phase 3: Provider Capacity (REQUIRES capacity_scope explicit)
└── provider_services
    ⚠️ EVERY ROW MUST SPECIFY capacity_scope
    ⚠️ If capacity_scope='provider_wide', ALL services need IDENTICAL concurrent_units

Phase 4: Provider Availability (REQUIRES pattern choice)
└── provider_availability_intervals
    ⚠️ Choose ONE per provider:
       - Global: ALL rows have service_id=NULL
       - Per-service: ALL rows have service_id specified
    ⚠️ DO NOT MIX NULL and specific service_id (constraint will reject)

Phase 5: booking_commitments TABLE CREATION
└── (Not yet implemented - migration pending)

Phase 6: Bookings (AFTER commitments table exists)
└── bookings
    ⚠️ ONLY seed status IN ('draft', 'submitted')
    ⚠️ Cannot seed status='confirmed' without commitment
    ⚠️ Cannot delete bookings with commitments
```

---

## SEEDING CONSTRAINTS (CRITICAL)

### 1. provider_services Seeding Rules

**✅ ALLOWED:**
```sql
-- Per-service capacity (different units OK)
INSERT INTO provider_services (provider_id, service_id, concurrent_units, capacity_scope) VALUES
  ('cleaning-co', 'cleaning', 3, 'per_service'),
  ('cleaning-co', 'laundry', 5, 'per_service');

-- Provider-wide capacity (uniform units REQUIRED)
INSERT INTO provider_services (provider_id, service_id, concurrent_units, capacity_scope) VALUES
  ('handyman', 'plumbing', 1, 'provider_wide'),
  ('handyman', 'electrical', 1, 'provider_wide');
```

**❌ BLOCKED:**
```sql
-- Missing capacity_scope (no default)
INSERT INTO provider_services (provider_id, service_id, concurrent_units) VALUES
  ('provider', 'service', 3);  -- ERROR: capacity_scope required

-- Provider-wide with mismatched units
INSERT INTO provider_services (provider_id, service_id, concurrent_units, capacity_scope) VALUES
  ('handyman', 'plumbing', 1, 'provider_wide'),
  ('handyman', 'electrical', 2, 'provider_wide');  -- ERROR: units must match
```

---

### 2. provider_availability_intervals Seeding Rules

**✅ ALLOWED:**
```sql
-- Pattern 1: Global availability (all NULL service_id)
INSERT INTO provider_availability_intervals (provider_id, service_id, available_from, available_to) VALUES
  ('provider-1', NULL, '2026-01-13 08:00+03', '2026-01-13 18:00+03'),
  ('provider-1', NULL, '2026-01-14 08:00+03', '2026-01-14 18:00+03');

-- Pattern 2: Per-service availability (all specified)
INSERT INTO provider_availability_intervals (provider_id, service_id, available_from, available_to) VALUES
  ('provider-2', 'plumbing-uuid', '2026-01-13 08:00+03', '2026-01-13 18:00+03'),
  ('provider-2', 'electrical-uuid', '2026-01-13 08:00+03', '2026-01-13 18:00+03');
```

**❌ BLOCKED:**
```sql
-- Mixed pattern (NULL + specific)
INSERT INTO provider_availability_intervals (provider_id, service_id, available_from, available_to) VALUES
  ('provider-3', NULL, '2026-01-13 08:00+03', '2026-01-13 18:00+03'),
  ('provider-3', 'plumbing-uuid', '2026-01-13 10:00+03', '2026-01-13 14:00+03');
  -- ERROR: GIST exclusion constraint violated (overlapping ranges)

-- Overlapping intervals (same provider+service)
INSERT INTO provider_availability_intervals (provider_id, service_id, available_from, available_to) VALUES
  ('provider-4', 'service-uuid', '2026-01-13 08:00+03', '2026-01-13 18:00+03'),
  ('provider-4', 'service-uuid', '2026-01-13 12:00+03', '2026-01-13 20:00+03');
  -- ERROR: GIST exclusion constraint violated
```

---

### 3. bookings Seeding Rules

**✅ ALLOWED (before commitments table):**
```sql
-- Pre-commitment bookings only
INSERT INTO bookings (customer_id, service_id, status, estimated_busy_from, estimated_busy_to) VALUES
  ('customer-uuid', 'service-uuid', 'draft', '2026-01-15 10:00+03', '2026-01-15 12:00+03'),
  ('customer-uuid', 'service-uuid', 'submitted', '2026-01-15 14:00+03', '2026-01-15 16:00+03');
```

**❌ BLOCKED:**
```sql
-- Cannot seed confirmed bookings (no commitments table yet)
INSERT INTO bookings (customer_id, service_id, status) VALUES
  ('customer-uuid', 'service-uuid', 'confirmed');
  -- ERROR: New bookings must start in draft or submitted

-- Cannot delete bookings with commitments
DELETE FROM bookings WHERE id = 'booking-with-commitment';
  -- ERROR: Cannot delete booking with commitment
```

---

## MIGRATION SAFETY CHECKS

All triggers include `to_regclass()` guards for safe ordering:

```sql
-- State machine doesn't fail if booking_commitments doesn't exist yet
IF NEW.status = 'confirmed' AND to_regclass('booking_commitments') IS NOT NULL THEN
  -- Check commitment existence
END IF;

-- Service deletion check doesn't fail before commitments table exists
IF to_regclass('booking_commitments') IS NULL THEN
  RETURN OLD;
END IF;

-- Booking deletion check doesn't fail before commitments table exists
IF to_regclass('booking_commitments') IS NULL THEN
  RETURN OLD;
END IF;
```

---

## FINAL CHECKLIST

Before seeding, verify:

- [x] ✅ capacity_scope ENUM exists
- [x] ✅ concurrent_units NOT NULL + > 0
- [x] ✅ capacity_scope has NO DEFAULT (explicit required)
- [x] ✅ capacity_scope validation trigger enforces uniformity
- [x] ✅ provider_services DELETE blocked with commitments
- [x] ✅ provider_availability locked read-only
- [x] ✅ provider_availability_intervals has GIST exclusion
- [x] ✅ booking status → confirmed requires commitment
- [x] ✅ booking INSERT status=confirmed blocked
- [x] ✅ booking DELETE blocked with commitments
- [x] ✅ estimated_busy_* renamed (not canonical)
- [x] ✅ legacy view locked read-only
- [x] ✅ emergency eligibility is pure capability check

---

## SEED-SAFE STATUS: ✅ READY

**What can be seeded NOW:**
- Discovery layer (services, categories, types, capabilities)
- Provider identity (profiles, documents, service areas)
- Provider capacity (with explicit capacity_scope)
- Provider availability (following pattern rules)
- Pre-commitment bookings (draft/submitted only)

**What CANNOT be seeded yet:**
- Confirmed bookings (requires booking_commitments table)
- Emergency bookings (requires commitment flow)
- Commitment data (table not yet created)

**Next step:**
Create `booking_commitments` table + functions before seeding confirmed bookings.
