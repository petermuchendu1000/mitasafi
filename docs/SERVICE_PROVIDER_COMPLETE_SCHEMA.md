# Service Provider Complete Schema Documentation
**Generated:** January 10, 2026  
**Purpose:** Comprehensive, authoritative reference for all service provider data structures

---

## Table of Contents
1. [Core Provider Table](#core-provider-table)
2. [Provider Services Junction](#provider-services-junction)
3. [Related Tables](#related-tables)
4. [Enums & Types](#enums--types)
5. [Business Rules & Constraints](#business-rules--constraints)
6. [Capacity Management](#capacity-management)
7. [Verification System](#verification-system)
8. [Performance Indexes](#performance-indexes)

---

## Core Provider Table: `service_providers`

### Complete Column List (64 fields)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | gen_random_uuid() | Primary key |
| **user_id** | uuid | NOT NULL | - | Links to auth.users + profiles (UNIQUE) |
| **business_name** | text | NOT NULL | - | Display name for provider business |
| **business_type** | provider_type enum | NOT NULL | 'individual' | 'individual' or 'company' |
| **phone** | text | NOT NULL | - | Primary contact number |
| **email** | text | NULL | - | Business email (optional) |
| **whatsapp** | text | NULL | - | WhatsApp number for quick contact |

#### Business Registration
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **registration_number** | text | NULL | Business registration number |
| **business_registration_number** | text | NULL | Official business cert number |
| **business_permit_number** | text | NULL | Operating permit number |
| **kra_pin** | text | NULL | Kenya Revenue Authority PIN (tax ID) |

#### Identity Verification
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **national_id_number** | text | NULL | National ID number |
| **national_id_url** | text | NULL | Scanned ID document URL |
| **selfie_url** | text | NULL | Selfie for identity verification |
| **identity_verified_at** | timestamptz | NULL | When identity was verified |
| **identity_verified_by** | uuid | NULL | Admin who verified |

#### Professional Credentials
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **professional_license_number** | text | NULL | License number (plumber, electrician, etc.) |
| **professional_license_type** | text | NULL | Type of professional license |
| **professional_license_url** | text | NULL | Scanned license document URL |
| **business_cert_url** | text | NULL | Business certificate document URL |
| **kra_cert_url** | text | NULL | KRA certificate document URL |

#### Location & Service Area
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **base_location** | json | NULL | Primary operating location (structured) |
| **base_latitude** | numeric | NULL | Base location latitude |
| **base_longitude** | numeric | NULL | Base location longitude |
| **base_neighborhood_id** | uuid | NULL | FK to neighborhoods table |
| **service_areas** | text[] | NOT NULL | Array of area names provider serves |
| **service_radius_km** | numeric | NULL | Max distance willing to travel |
| **max_travel_distance_km** | numeric | NULL | Absolute maximum travel distance |

#### Profile & Marketing
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **bio** | text | NULL | Provider biography/about section |
| **description** | text | NULL | Detailed description of services |
| **headline** | text | NULL | Short tagline (e.g., "Expert Plumber - 10 Years Experience") |
| **tagline** | text | NULL | Marketing tagline |
| **years_experience** | text | NULL | Years in business (text for flexibility) |
| **languages** | text[] | NULL | Languages spoken |
| **website** | text | NULL | Provider website URL |

#### Media Assets
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **profile_photo_url** | text | NULL | Main profile photo |
| **logo_url** | text | NULL | Business logo |
| **cover_photo_url** | text | NULL | Cover/banner photo |
| **intro_video_url** | text | NULL | Introduction/promotional video |
| **portfolio_images** | text[] | NULL | Array of portfolio image URLs |

#### Capacity Management
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **max_concurrent_bookings** | integer | NOT NULL | 30 | **CRITICAL**: Global max active bookings across all services |
| **capacity_mode** | text | NOT NULL | 'per_service' | How capacity is calculated (see details below) |
| **emergency_capacity_reserved** | integer | NOT NULL | 2 | Slots reserved ONLY for emergency bookings |
| **emergency_hard_ceiling** | integer | NULL | - | Absolute maximum including emergencies (safety valve) |
| **max_simultaneous_emergencies** | integer | NOT NULL | 1 | Max emergency bookings in progress simultaneously |

#### Availability & Booking Settings
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **availability_schedule** | json | NULL | Weekly availability schedule |
| **instant_booking** | boolean | NULL | Allow instant booking without provider confirmation |
| **emergency_available** | boolean | NULL | Provider accepts emergency bookings |
| **emergency_surcharge_type** | text | NULL | 'percentage' or 'fixed' |
| **emergency_surcharge_amount** | numeric | NULL | Emergency surcharge amount |
| **accepts_escrow** | boolean | NULL | Accepts escrow payment protection |
| **min_job_value** | numeric | NULL | Minimum job value accepted (KES) |

#### Business Contact
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **business_phone** | text | NULL | Alternative business phone |
| **business_email** | text | NULL | Official business email |

#### Ratings & Statistics (Denormalized)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **rating_average** | numeric | NULL | - | Average rating (0.00 to 5.00) |
| **rating_count** | integer | NULL | - | Total number of ratings |
| **total_jobs_completed** | integer | NULL | 0 | Completed bookings count |
| **total_jobs_cancelled** | integer | NULL | 0 | Cancelled bookings count |
| **completion_rate** | numeric | NULL | - | Percentage of completed vs total bookings |
| **response_time** | text | NULL | - | Human-readable response time (e.g., "Within 1 hour") |
| **response_time_minutes** | integer | NULL | - | Average response time in minutes |

#### Status & Verification
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **is_active** | boolean | NULL | true | Provider account is active |
| **is_available** | boolean | NULL | - | Currently accepting bookings |
| **is_verified** | boolean | NULL | false | ANY service verified (denormalized flag) |
| **verified_at** | timestamptz | NULL | - | When first service was verified |
| **status** | provider_status enum | NULL | - | 'pending', 'active', 'suspended', 'inactive' |
| **tier** | provider_tier enum | NULL | - | 'free', 'premium', 'enterprise' |
| **verification_badge** | text | NULL | - | Trust tier display badge |
| **profile_completion_percent** | numeric | NULL | - | Profile completeness (0-100) |

#### Timestamps
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **created_at** | timestamptz | NULL | now() | Account creation timestamp |
| **updated_at** | timestamptz | NULL | now() | Last update timestamp |
| **last_active_at** | timestamptz | NULL | - | Last activity timestamp |

#### Legacy/Deprecated
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **provider_type** | text | NULL | Old field - use business_type instead |

---

## Provider Services Junction: `provider_services`

Links providers to specific services they offer, with per-service settings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | gen_random_uuid() | Primary key |
| **provider_id** | uuid | NOT NULL | - | FK to service_providers |
| **service_id** | uuid | NOT NULL | - | FK to services |
| **experience_years** | integer | NULL | 0 | Years of experience with THIS service |
| **custom_pricing** | jsonb | NULL | - | Provider-specific pricing for this service |
| **has_certification** | boolean | NOT NULL | false | Has certification for this service |
| **certification_type** | text | NULL | - | Type of certification |
| **certification_ref** | text | NULL | - | License/cert number |
| **certification_expiry_date** | date | NULL | - | When certification expires |
| **certification_document_url** | text | NULL | - | Scanned cert document URL |
| **verification_status** | verification_status enum | NOT NULL | 'not_started' | Verification status for THIS service |
| **verified_at** | timestamptz | NULL | - | When service was verified |
| **verified_by** | uuid | NULL | - | Admin who verified |
| **verification_notes** | text | NULL | - | Internal verification notes |
| **verification_expires_at** | timestamptz | NULL | - | When verification expires (for licensed services) |
| **is_active** | boolean | NOT NULL | true | Provider actively offering this service |
| **created_at** | timestamptz | NULL | now() | When service was added |
| **updated_at** | timestamptz | NULL | now() | Last update |
| **max_concurrent_bookings** | integer | NULL | - | **Per-service capacity override** (NULL = use provider global) |
| **max_daily_bookings** | integer | NULL | - | Max bookings per calendar day for this service |
| **max_weekly_bookings** | integer | NULL | - | Max bookings per week for this service |
| **capacity_time_window** | text | NOT NULL | 'concurrent' | 'concurrent', 'daily', 'weekly', or 'hourly' |
| **overlapping_bookings_allowed** | boolean | NOT NULL | false | Can multiple bookings overlap in time for this service? |

### Unique Constraint
- `(provider_id, service_id)` - One provider can only offer each service once

---

## Related Tables

### `provider_service_areas`
Geographic areas where provider offers services.

| Column | Type | Description |
|--------|------|-------------|
| **id** | uuid | Primary key |
| **provider_id** | uuid | FK to service_providers |
| **service_id** | uuid | FK to services (NULL = all services) |
| **area_name** | text | Area name (e.g., 'Westlands', 'Kilimani') |
| **area_type** | text | 'neighborhood', 'constituency', 'county' |
| **is_primary_area** | boolean | Main operating area (no travel fee) |
| **travel_fee** | decimal | Extra charge for this area |
| **currency** | text | Currency code (default: 'KES') |
| **created_at** | timestamptz | Timestamp |

### `provider_availability`
Provider working hours.

| Column | Type | Description |
|--------|------|-------------|
| **id** | uuid | Primary key |
| **provider_id** | uuid | FK to service_providers |
| **service_id** | uuid | FK to services (NULL = all services) |
| **day_of_week** | integer | 0=Sunday, 1=Monday, ..., 6=Saturday |
| **start_time** | time | Start time |
| **end_time** | time | End time |
| **is_active** | boolean | Schedule entry active |
| **created_at** | timestamptz | Timestamp |
| **updated_at** | timestamptz | Last update |

### `provider_verification_documents`
All verification documents uploaded.

| Column | Type | Description |
|--------|------|-------------|
| **id** | uuid | Primary key |
| **provider_id** | uuid | FK to service_providers |
| **service_id** | uuid | FK to services (NULL = general docs) |
| **document_type** | text | 'id_card', 'business_license', 'certification', 'insurance' |
| **document_name** | text | Display name |
| **document_url** | text | Document storage URL |
| **status** | verification_status | Verification status |
| **reviewed_at** | timestamptz | When reviewed |
| **reviewed_by** | uuid | Admin who reviewed |
| **review_notes** | text | Review notes |
| **expires_at** | date | Document expiry date |
| **created_at** | timestamptz | Upload timestamp |
| **updated_at** | timestamptz | Last update |

### `provider_vehicles`
For transport/taxi providers.

| Column | Type | Description |
|--------|------|-------------|
| **id** | uuid | Primary key |
| **provider_id** | uuid | FK to service_providers |
| **registration_number** | text | Vehicle registration (UNIQUE) |
| **make** | text | Vehicle make |
| **model** | text | Vehicle model |
| **year** | integer | Year manufactured |
| **color** | text | Vehicle color |
| **vehicle_type** | text | 'sedan', 'suv', 'van', 'pickup', 'motorcycle' |
| **insurance_policy_number** | text | Insurance policy number |
| **insurance_provider** | text | Insurance company |
| **insurance_expiry** | date | Insurance expiry date |
| **inspection_certificate_url** | text | Vehicle inspection document |
| **inspection_expiry** | date | Inspection expiry |
| **vehicle_photos** | jsonb | Array of photo URLs |
| **is_active** | boolean | Vehicle active |
| **verified** | boolean | Vehicle verified |
| **created_at** | timestamptz | Timestamp |
| **updated_at** | timestamptz | Last update |

### `provider_driver_licenses`
Driver license verification for transport providers.

| Column | Type | Description |
|--------|------|-------------|
| **id** | uuid | Primary key |
| **provider_id** | uuid | FK to service_providers |
| **license_number** | text | Driver license number (UNIQUE) |
| **license_type** | text | 'private', 'commercial', 'psv' |
| **issue_date** | date | License issue date |
| **expiry_date** | date | License expiry (NOT NULL, must be future) |
| **license_photo_url** | text | Scanned license |
| **background_check_status** | verification_status | Background check status |
| **background_check_date** | date | When background check performed |
| **background_check_provider** | text | Company that did check |
| **police_clearance_certificate_url** | text | Police clearance doc |
| **is_active** | boolean | License active |
| **created_at** | timestamptz | Timestamp |
| **updated_at** | timestamptz | Last update |

---

## Enums & Types

### `provider_type`
```sql
'individual' | 'company'
```
- **individual**: Sole proprietor, freelancer
- **company**: Registered business entity

### `provider_status`
```sql
'pending' | 'active' | 'suspended' | 'inactive'
```
- **pending**: Registration submitted, awaiting verification
- **active**: Verified and accepting bookings
- **suspended**: Temporarily disabled (violation, payment issues)
- **inactive**: Provider deactivated account

### `provider_tier`
```sql
'free' | 'premium' | 'enterprise'
```
Subscription/feature tier.

### `verification_status`
```sql
'not_started' | 'pending' | 'verified' | 'rejected' | 'expired'
```
Used for documents and service verification.

---

## Business Rules & Constraints

### Phone Format Validation
```sql
CONSTRAINT phone_format CHECK (phone ~ '^\+?[0-9]{10,15}$')
```

### Certification Logic
```sql
CONSTRAINT certification_logic CHECK (
  (has_certification = false) OR
  (has_certification = true AND certification_type IS NOT NULL)
)
```

### Verification Timestamp
```sql
CONSTRAINT verification_verified_at CHECK (
  (verification_status != 'verified') OR
  (verification_status = 'verified' AND verified_at IS NOT NULL)
)
```

### Emergency Reserve Limit
```sql
CONSTRAINT emergency_reserve_limit CHECK (
  emergency_capacity_reserved IS NULL OR 
  max_concurrent_bookings IS NULL OR 
  emergency_capacity_reserved <= max_concurrent_bookings
)
```

### Emergency Ceiling Above Max
```sql
CONSTRAINT emergency_ceiling_above_max CHECK (
  emergency_hard_ceiling IS NULL OR 
  emergency_hard_ceiling >= max_concurrent_bookings
)
```

---

## Capacity Management

### Capacity Mode Options

| Mode | Description | Use Case |
|------|-------------|----------|
| **global_provider** | Total bookings across all services | Simple businesses, single-person operators |
| **per_service** | Separate capacity per service (RECOMMENDED) | Most providers - accurate tracking |
| **per_time_window** | Capacity per day/week | Batch work, recurring services |
| **hybrid** | Per-service with global fallback | Balanced approach for mixed services |

### Capacity Hierarchy

1. **Service-specific limit** (`provider_services.max_concurrent_bookings`)
   - If NOT NULL, this is the hard limit for THIS service
   - Example: Provider has global 30, but Emergency Plumbing limited to 10

2. **Provider global limit** (`service_providers.max_concurrent_bookings`)
   - Always set (NOT NULL, default 30)
   - Applies when service-specific is NULL

### Emergency Booking Capacity

```
Regular booking limit = max_concurrent_bookings - emergency_capacity_reserved
Emergency booking limit = max_concurrent_bookings (or emergency_hard_ceiling if set)
```

**Example:**
- `max_concurrent_bookings = 30`
- `emergency_capacity_reserved = 2`
- `emergency_hard_ceiling = 35`

Result:
- Regular bookings stop at 28
- Emergency bookings can go up to 35
- Soft override at 110% (33 bookings)
- Hard stop at 35 bookings

### Overlapping Bookings

Set per service via `provider_services.overlapping_bookings_allowed`:

- **FALSE** (default): Provider can only be at one location at a time
  - Example: Plumber, Taxi driver
  - Capacity checks for time overlap using `busy_from` and `busy_to`

- **TRUE**: Multiple simultaneous bookings allowed
  - Example: Laundry service (multiple clients' laundry processing)
  - Capacity counts ANY active booking regardless of time

---

## Verification System

### Verification Levels

1. **Provider-level**: `service_providers.is_verified`
   - TRUE if ANY service is verified (denormalized)
   - Updated automatically via triggers

2. **Service-level**: `provider_services.verification_status`
   - Each service verified independently
   - States: not_started → pending → verified/rejected
   - Can expire (for licensed services)

3. **Document-level**: `provider_verification_documents.status`
   - Individual documents reviewed
   - Links to specific services or general provider docs

### Verification Flow

```
1. Provider uploads documents → verification_documents (status: pending)
2. Admin reviews → updates status to verified/rejected
3. If service-specific doc approved → provider_services.verification_status = verified
4. When ANY service verified → service_providers.is_verified = true
```

---

## Performance Indexes

### Core Indexes
```sql
idx_providers_user_id - ON service_providers(user_id)
idx_providers_is_active - ON service_providers(is_active) WHERE is_active = true
idx_providers_is_verified - ON service_providers(is_verified) WHERE is_verified = true
idx_providers_average_rating - ON service_providers(average_rating) WHERE is_active = true
idx_providers_verification_badge - ON service_providers(verification_badge) WHERE is_active = true
```

### Capacity Indexes
```sql
idx_bookings_capacity_check - ON bookings(provider_id, service_id, status, scheduled_start)
  WHERE status IN ('submitted', 'provider_viewed', 'confirmed', 'scheduled', 'in_progress')

idx_bookings_emergency - ON bookings(provider_id, booking_flow_type, status)
  WHERE booking_flow_type = 'emergency'
```

### Provider Services Indexes
```sql
idx_provider_services_provider_id - ON provider_services(provider_id)
idx_provider_services_service_id - ON provider_services(service_id)
idx_provider_services_verification_status - ON provider_services(verification_status)
idx_provider_services_active - ON provider_services(provider_id, service_id) WHERE is_active = true
```

### Covering Index
```sql
idx_service_providers_user_id_lookup - ON service_providers(user_id) 
  INCLUDE (id, business_type, is_active)
```
Optimized for `user_id` lookups, includes commonly-accessed fields.

---

## Materialized Views

### `provider_capacity_status`
Real-time capacity utilization per provider per service.

Returns:
- Current bookings count
- Available slots
- Utilization percentage
- Capacity status: 'FULL', 'HIGH' (80%+), 'MEDIUM' (50-79%), 'LOW' (<50%)

Used for:
- Provider dashboard
- Admin monitoring
- Matching algorithm optimization

---

## Key Functions

### `check_provider_capacity_locked()`
Thread-safe capacity check with advisory locking.

**Parameters:**
- `p_provider_id` - Provider UUID
- `p_service_id` - Service UUID
- `p_busy_from` - Booking start time
- `p_busy_to` - Booking end time
- `p_is_emergency` - Emergency booking flag

**Returns:**
- `capacity_available` - Boolean
- `current_bookings` - Current active count
- `max_bookings` - Effective maximum
- `available_slots` - Remaining slots
- `reason` - Human-readable explanation

**Locking:** Uses `pg_advisory_xact_lock` to prevent race conditions.

### `check_provider_can_accept()`
Combined availability + capacity check.

Verifies:
1. Provider has availability in schedule (unless emergency)
2. Capacity is available

---

## Migration Files

Core provider schema defined in:
1. `20260108120002_trust_provider_layer.sql` - Base tables
2. `20260109120030_provider_capacity_enforcement.sql` - Capacity system
3. `20260109120031_critical_gaps_complete_fix.sql` - Capacity refinements
4. `20260109150000_performance_indexes.sql` - Performance optimization

---

## Summary Statistics

- **Total Columns**: 64 in service_providers table
- **Related Tables**: 6 (services junction, areas, availability, documents, vehicles, licenses)
- **Enums**: 4 (provider_type, provider_status, provider_tier, verification_status)
- **Indexes**: 15+ optimized indexes
- **Constraints**: 8 CHECK constraints
- **Foreign Keys**: 2 (user_id → profiles, base_neighborhood_id → neighborhoods)

---

*End of Service Provider Schema Documentation*
