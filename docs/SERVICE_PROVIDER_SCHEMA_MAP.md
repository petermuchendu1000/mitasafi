# SERVICE PROVIDER SCHEMA MAP
**Date:** January 9, 2026  
**Purpose:** Complete relationship map of service provider and booking tables

---

## HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                      DISCOVERY LAYER                            │
│  (What customers search for)                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     TRUST/PROVIDER LAYER                        │
│  (Who can deliver the service)                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       BOOKING LAYER                             │
│  (Transaction between customer and provider)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    COMMITMENT LAYER (V1)                        │
│  (Canonical capacity reservation - DESIGN APPROVED)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## DETAILED RELATIONSHIP MAP

### LAYER 1: DISCOVERY LAYER
**Purpose:** Customer search and service definition

```
service_categories
├── id (PK)
├── slug
├── name
├── is_primary (Main 12 vs More Services)
└── display_order

    ↓ (1:many)

service_subcategories (optional)
├── id (PK)
├── category_id (FK → service_categories.id)
└── name

    ↓ (1:many)

service_types
├── id (PK)
├── code (UNIQUE: 'emergency_repair', 'standard_repair')
├── booking_flow (emergency|standard|delivery|project|personal)
├── requires_quote
└── risk_level

    ↓ (1:many)

services
├── id (PK)
├── category_id (FK → service_categories.id)
├── subcategory_id (FK → service_subcategories.id, nullable)
├── service_type_id (FK → service_types.id)
├── name
└── is_active

    ↓ (1:1)

service_capabilities
├── service_id (PK, FK → services.id)
├── supports_emergency
├── is_recurring_capable
├── min_booking_notice_hours
└── emergency_response_sla_minutes
```

**Key relationships:**
- `service_categories` → `services` (1:many)
- `service_subcategories` → `services` (1:many, optional)
- `service_types` → `services` (1:many) **[IMMUTABLE AFTER FIRST BOOKING]**
- `services` → `service_capabilities` (1:1)

---

### LAYER 2: TRUST/PROVIDER LAYER
**Purpose:** Provider profiles and service capabilities

```
service_providers
├── id (PK)
├── user_id (FK → auth.users, UNIQUE)
├── business_name
├── business_type ('individual'|'company'|'cooperative')
├── phone
├── primary_location
├── total_jobs_completed
├── average_rating
├── is_active
└── is_verified (denormalized: true if ANY service verified)

    ↓ (1:many)

provider_services [JUNCTION TABLE]
├── id (PK)
├── provider_id (FK → service_providers.id)
├── service_id (FK → services.id)
├── experience_years
├── has_certification
├── verification_status ('not_started'|'pending'|'verified'|'rejected')
├── verified_at
├── custom_pricing (JSONB)
├── concurrent_units (INTEGER) - Max capacity for this service (NEW)
├── capacity_scope ('per_service'|'provider_wide') - Capacity scoping (NEW, CRITICAL)
├── is_active
└── UNIQUE(provider_id, service_id)

    ↓ (1:many from provider_services)
    
provider_availability [TIME-BASED MODEL]
├── id (PK)
├── provider_id (FK → service_providers.id)
├── service_id (FK → services.id, nullable = all services)
├── day_of_week (0=Sunday, 6=Saturday)
├── start_time (TIME)
├── end_time (TIME)
└── is_active

    ↓ (ALTERNATIVE: 1:many from provider_services)

provider_availability_intervals [INTERVAL-BASED MODEL - NEW]
├── id (PK)
├── provider_id (FK → service_providers.id)
├── service_id (FK → services.id, nullable)
├── available_from (TIMESTAMPTZ)
├── available_to (TIMESTAMPTZ)
├── is_emergency_only
└── EXCLUDE USING GIST (provider_id, service_id, tstzrange)

    ↓ (1:many from service_providers)

provider_service_areas
├── id (PK)
├── provider_id (FK → service_providers.id)
├── service_id (FK → services.id, nullable = all services)
├── area_name
├── is_primary_area
└── travel_fee

    ↓ (1:many from service_providers)

provider_verification_documents
├── id (PK)
├── provider_id (FK → service_providers.id)
├── service_id (FK → services.id, nullable = general docs)
├── document_type ('id_card'|'business_license'|'certification')
├── document_url
├── status ('pending'|'verified'|'rejected')
└── expires_at
```

**Key relationships:**
- `service_providers` → `provider_services` (1:many)
- `services` → `provider_services` (1:many)
- `provider_services` = **junction table linking providers to services they offer**
- `provider_availability` = **which days/times provider works**
- `provider_availability_intervals` = **interval-based availability (handles overnight/multi-day)**
- `provider_service_areas` = **where provider offers services**
- `provider_verification_documents` = **verification evidence**

**Critical capacity columns (added in recent migrations):**
- `provider_services.concurrent_units` (INTEGER) - How many bookings can overlap (1=solo, 3=team, 10=machines)
- `provider_services.max_concurrent_bookings` (INTEGER) - DEPRECATED, use concurrent_units instead
- `provider_services.max_daily_bookings` (INTEGER) - Daily limit

---

### LAYER 3: BOOKING LAYER
**Purpose:** Transaction between customer and provider

```
bookings
├── id (PK)
├── customer_id (FK → users)
├── provider_id (FK → service_providers.id, nullable until accepted)
├── service_id (FK → services.id)
├── service_type_id (FK → service_types.id)
├── booking_flow_type (emergency|standard|delivery|project|personal)
├── status (draft|submitted|provider_viewed|confirmed|scheduled|in_progress|completed|cancelled_*)
├── quoted_price
├── agreed_price
├── currency (default: KES)
├── requested_at
├── provider_viewed_at
├── scheduled_start (TIMESTAMPTZ - customer-facing)
├── scheduled_end (TIMESTAMPTZ - customer-facing)
├── actual_start
├── actual_end
├── completed_at
├── payment_status
├── customer_notes
├── provider_notes
└── cancellation_reason

    ↓ (1:many)

booking_status_history
├── id (PK)
├── booking_id (FK → bookings.id)
├── from_status
├── to_status
├── changed_by (user_id)
├── changed_by_role ('customer'|'provider'|'admin')
├── reason
└── created_at

    ↓ (NEW: State machine enforcement)

booking_state_transitions
├── from_status (booking_status)
├── to_status (booking_status)
├── allowed_roles (text[])
├── requires_provider
├── requires_payment
└── notes
└── PRIMARY KEY (from_status, to_status)

    ↓ (booking detail tables - one per booking_flow_type)

emergency_service_bookings
├── booking_id (PK, FK → bookings.id)
├── urgency_level
├── issue_description
├── safety_concern
└── response_deadline

standard_service_bookings
├── booking_id (PK, FK → bookings.id)
├── preferred_date
├── flexible_timing
└── service_details

recurring_service_bookings
├── booking_id (PK, FK → bookings.id)
├── recurrence_pattern
├── start_date
├── end_date
└── parent_booking_id (FK → bookings.id, nullable)

delivery_service_bookings
├── booking_id (PK, FK → bookings.id)
├── pickup_location
├── dropoff_location
├── package_details
└── special_instructions

project_service_bookings
├── booking_id (PK, FK → bookings.id)
├── project_scope
├── estimated_duration_days
└── requires_site_visit
```

**Key relationships:**
- `bookings` references: `service_providers`, `services`, `service_types`
- `booking_status_history` → `bookings` (1:many) - audit trail
- `booking_state_transitions` = state machine rules (NEW)
- **Detail tables** (emergency_service_bookings, etc.) → `bookings` (1:1) based on booking_flow_type

**Critical time columns (recent migrations):**
- `bookings.busy_from` (TIMESTAMPTZ) - When provider becomes busy (canonical)
- `bookings.busy_to` (TIMESTAMPTZ) - When provider becomes free (canonical)
- `bookings.estimated_duration_minutes` (INTEGER) - Required for capacity planning
- `bookings.commitment_level` (soft|hard|locked|irreversible) - Enforcement level

**Current capacity logic (FLAWED - to be replaced):**
- Capacity currently INFERRED from bookings table (status + scheduled_start/end)
- **Problem:** bookings conflates intent + commitment + execution + accounting
- **Fix:** Add booking_commitments layer (see below)

---

### LAYER 4: COMMITMENT LAYER (V1 - DESIGN APPROVED)
**Purpose:** Canonical capacity reservation

```
booking_commitments [NEW TABLE - DESIGN APPROVED]
├── booking_id (PK, FK → bookings.id)
├── provider_id (FK → service_providers.id)
├── service_id (FK → services.id)
├── capacity_units (INTEGER > 0) - Units consumed (1=solo, 2=2 teams, etc.)
├── active_from (TIMESTAMPTZ) - CANONICAL busy time start
├── active_to (TIMESTAMPTZ) - CANONICAL busy time end
├── pricing_snapshot (JSONB) - Immutable pricing evidence (must have 'total', 'currency')
├── committed_at (TIMESTAMPTZ, default NOW())
└── released_at (TIMESTAMPTZ, nullable) - When capacity freed

CONSTRAINTS:
- CHECK: active_to > active_from
- CHECK: capacity_units > 0
- CHECK: pricing_snapshot ? 'total' AND pricing_snapshot ? 'currency'
- CHECK: released_at IS NULL OR released_at >= committed_at
- FOREIGN KEY: booking_id → bookings.id ON DELETE RESTRICT
- FOREIGN KEY: provider_id → service_providers.id ON DELETE RESTRICT
- FOREIGN KEY: service_id → services.id ON DELETE RESTRICT

INDEXES:
- GIST index on (provider_id, service_id, tstzrange(active_from, active_to))
  WHERE released_at IS NULL (critical for capacity queries)
- Index on (provider_id, active_from, active_to) WHERE released_at IS NULL
```

**Key invariant:**
```
booking.status = 'confirmed' ↔ booking_commitments row EXISTS
```

**Capacity counting (NEW RULE):**
```sql
-- Capacity check with advisory locking (v1 approved)
BEGIN;
  -- Lock provider capacity (deterministic ordering)
  SELECT pg_advisory_xact_lock(hashtext(provider_id::text));  -- or with service_id if per_service
  
  -- Check capacity
  SELECT SUM(capacity_units)
  FROM booking_commitments
  WHERE provider_id = X
    AND (capacity_scope logic...)
    AND released_at IS NULL
    AND tstzrange(active_from, active_to) && requested_range
  
  -- If available, insert commitment
  INSERT INTO booking_commitments (...);
  UPDATE bookings SET status = 'confirmed';
COMMIT;
```

**Locking strategy:**
- Advisory locks keyed by provider (NOT SERIALIZABLE isolation)
- Deterministic ordering (first caller gets lock, others queue)
- Zero serialization failures
- Lock granularity:
  - capacity_scope = 'per_service': Lock on (provider_id, service_id)
  - capacity_scope = 'provider_wide': Lock on (provider_id) only

**Lifecycle:**
1. Booking reaches validation gate
2. Capacity check (count commitments, not bookings)
3. Create commitment row (atomic with status → confirmed)
4. Work proceeds (commitment stays active)
5. Cancellation/completion → UPDATE released_at = NOW()
6. Capacity freed (WHERE released_at IS NULL excludes it)

**Relationships:**
- `booking_commitments` → `bookings` (1:1, bidirectional invariant)
- `booking_commitments` → `service_providers` (many:1)
- `booking_commitments` → `services` (many:1)

---

## CRITICAL CROSS-LAYER RELATIONSHIPS

### Provider Capacity Flow
```
provider_services.concurrent_units (MAX capacity)
         ↓
   [Capacity check counts booking_commitments]
         ↓
booking_commitments.capacity_units (CONSUMED capacity)
         ↓
   [released_at = NULL means active]
         ↓
SUM(capacity_units WHERE released_at IS NULL) <= concurrent_units
```

### Booking Status → Commitment Lifecycle
```
bookings.status = 'draft'
         ↓
bookings.status = 'submitted'
         ↓
bookings.status = 'provider_viewed'
         ↓
[COMMITMENT CREATION GATE]
         ↓
INSERT booking_commitments + UPDATE bookings.status = 'confirmed'
         ↓ (atomic transaction)
bookings.status = 'confirmed' ↔ commitment EXISTS
         ↓
bookings.status = 'scheduled'|'in_progress'|'completed'
         ↓ (commitment still active)
bookings.status = 'completed'|'cancelled_*'
         ↓
UPDATE booking_commitments SET released_at = NOW()
         ↓
Capacity freed (released_at IS NOT NULL)
```

### Time Authority Hierarchy
```
BEFORE COMMITMENT:
- bookings.scheduled_start/scheduled_end (customer-facing, negotiable)

AFTER COMMITMENT:
- booking_commitments.active_from/active_to (CANONICAL, immutable)
- Capacity checks use active_from/active_to ONLY
- scheduled_start/end may differ slightly (buffer time, travel time)
```

---

## CAPACITY ENFORCEMENT POINTS

### CURRENT STATE (FLAWED)
❌ **Capacity inferred from bookings table:**
```sql
-- WRONG (current broken approach)
SELECT COUNT(*)
FROM bookings
WHERE provider_id = X
  AND status IN ('confirmed', 'scheduled', 'in_progress')
  AND scheduled_start < $end
  AND scheduled_end > $start
```

**Problems:**
- Counts bookings, not capacity units
- Uses scheduled_start/end (not canonical)
- Infers commitment from status (ambiguous)
- Race conditions (status can change during check)

### V1 TARGET (CORRECT)
✅ **Capacity counted from commitments table:**
```sql
-- CORRECT (v1 approved design)
SELECT SUM(capacity_units)
FROM booking_commitments
WHERE provider_id = X
  AND (CASE 
    WHEN provider_services.capacity_scope = 'per_service' 
      THEN service_id = Y
    WHEN provider_services.capacity_scope = 'provider_wide' 
      THEN TRUE  -- Check across ALL services
  END)
  AND released_at IS NULL
  AND tstzrange(active_from, active_to) && tstzrange($start, $end)

-- Must satisfy: SUM + requested_capacity_units <= concurrent_units
```

**Benefits:**
- Sums capacity units (handles teams, machines)
- Uses active_from/active_to (canonical time)
- Explicit commitment (no inference)
- released_at = NULL (unambiguous active state)
- Transaction-safe (advisory locks per provider)
- Handles per-service vs provider-wide capacity via capacity_scope

---

## AUTHORITY MODEL

### Database-Owned (Immutable)
- `booking_commitments.*` (all fields except released_at)
- `services.service_type_id` (after first booking)
- `service_types.*` (operational definitions)

### Application-Owned (Mutable)
- `bookings.status` (before confirmed)
- `bookings.scheduled_start/scheduled_end` (customer-facing)
- `bookings.customer_notes`, `provider_notes`
- `service_providers.*` (profile data)

### Enforced via Permissions
```sql
-- V1 target
REVOKE INSERT, UPDATE, DELETE ON booking_commitments FROM app_role;
GRANT EXECUTE ON FUNCTION create_commitment_and_confirm_booking TO app_role;
GRANT EXECUTE ON FUNCTION release_commitment TO app_role;
```

---

## MIGRATION IMPACT (V1)

### Tables Added
- ✅ `booking_commitments` (new, canonical capacity)

### Tables Modified
- ❌ None (commitments is additive)

### Queries Changed
- **Capacity checks** → use booking_commitments (not bookings)
- **Time overlap** → use active_from/active_to (not scheduled_start/end)
- **Provider availability** → join commitments for utilization

### Triggers Changed
- **Remove:** Capacity enforcement triggers on bookings (logic moves to commitment creation function)
- **Remove:** Notification triggers (move to app/stored procedures)
- **Remove:** Status mutation triggers (move to app/stored procedures)
- **Keep (CRITICAL):** State machine enforcement trigger
  - BEFORE UPDATE ON bookings
  - Reject illegal status transitions
  - **ENFORCE: If status → 'confirmed', assert commitment EXISTS**
  - **WITHOUT THIS TRIGGER, THE MODEL COLLAPSES**
- **Add:** Commitment immutability trigger
  - BEFORE UPDATE/DELETE ON booking_commitments
  - Reject UPDATE except released_at
  - Reject all DELETE

### Functions Added
- `create_commitment_and_confirm_booking()` - Single entry point
- `release_commitment()` - Single exit point
- `check_provider_capacity_available()` - Capacity validation

---

## OPEN QUESTIONS RESOLVED

1. **When is capacity consumed?**
   - WHEN: Commitment row created (atomic with status → confirmed)
   - NOT: When booking submitted/viewed

2. **How is capacity released?**
   - METHOD: UPDATE released_at = NOW()
   - NOT: DELETE (breaks audit trail)

3. **What happens on cancellation?**
   - ACTION: Release commitment (released_at = NOW())
   - STATUS: Booking status → cancelled_*
   - RESULT: Capacity immediately available

4. **How are recurring bookings handled?**
   - PARENT: No commitment (intent container only)
   - CHILDREN: Each gets independent commitment (or fails individually)

5. **How do emergency bookings differ?**
   - ELIGIBILITY: Different capacity limit check (emergency_capacity_reserved)
   - MECHANICS: Same commitment creation flow
   - RESULT: Same table, same immutability

---

## SUMMARY

**Total Tables:**
- Discovery Layer: 5 (categories, subcategories, service_types, services, capabilities)
- Provider Layer: 7 (providers, provider_services, availability, intervals, areas, documents, vehicles)
- Booking Layer: 6 (bookings, history, state_transitions, + 5 detail tables)
- **Commitment Layer: 1 (booking_commitments - DESIGN APPROVED, READY FOR IMPLEMENTATION)**

**Critical Foreign Keys:**
- `provider_services.provider_id` → `service_providers.id`
- `provider_services.service_id` → `services.id`
- `bookings.provider_id` → `service_providers.id`
- `bookings.service_id` → `services.id`
- `booking_commitments.booking_id` → `bookings.id` **(NEW)**
- `booking_commitments.provider_id` → `service_providers.id` **(NEW)**
- `booking_commitments.service_id` → `services.id` **(NEW)**

**Capacity Authority:**
- BEFORE V1: bookings table (inferred from status)
- AFTER V1: **booking_commitments table (explicit, canonical)**

**Critical New Columns:**
- `provider_services.capacity_scope` ('per_service' | 'provider_wide') - Capacity scoping
- `provider_services.concurrent_units` (INTEGER) - Max capacity per service

**Critical Configuration Requirement:**
- If `capacity_scope = 'provider_wide'`, ALL provider's services MUST have identical `concurrent_units`
- Enforced at configuration time by service config function (NOT runtime)
- Without this validation: ambiguous capacity limits → silent overbooking

**Functions Required:**
- `create_commitment_and_confirm_booking()` - Single entry point (idempotent)
- `release_commitment()` - Single exit point
- State machine trigger - Enforce status ↔ commitment invariant (CRITICAL)
