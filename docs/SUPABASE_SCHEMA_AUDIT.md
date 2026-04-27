# SUPABASE SCHEMA AUDIT — Service Provider Module

**Date:** 2026-03-01  
**Scope:** All tables, enums, indexes, RLS policies, FKs, triggers, and views related to the provider module  
**Method:** Full review of all 60+ migration files + generated `database.ts` + application code references

---

## CRITICAL FINDING: DUAL SCHEMA DIVERGENCE

There are **two divergent schema realities**:

| Source | Reality |
|--------|---------|
| `src/types/database.ts` (Supabase-generated) | **What's actually deployed** — an older, simpler schema |
| `supabase/migrations/` directory | **What's designed** — a sophisticated, production-grade schema |

The generated types include tables like `service_jobs`, `provider_reviews`, `provider_working_hours`, and `provider_verifications` that **do not exist in the migration files**. Meanwhile, the migrations define `bookings`, `booking_commitments`, `booking_quotes`, `reviews`, and `provider_availability_intervals` that **are not reflected in the generated types**.

**The app code queries BOTH schemas**, creating a fragile situation.

---

## TABLE-BY-TABLE SCHEMA MAP

### SECTION 1: CORE IDENTITY (Base Schema)

---

#### 1. `profiles`
**Migration:** `20251231000002_create_schema.sql`  
**Status:** ✅ ACTIVE — Used on every page  

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid PK | NO | `auth.users(id)` FK |
| email | text | NO | — |
| phone | text | YES | — |
| full_name | text | YES | — |
| avatar_url | text | YES | — |
| primary_role | text | YES | CHECK: tenant/landlord/service_provider |
| is_verified | boolean | YES | false |
| verification_level | text | YES | 'none' CHECK: none/phone/id/full |
| metadata | jsonb | YES | '{}' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

**Indexes:** `idx_profiles_email`, `idx_profiles_phone`, `idx_profiles_primary_role`  
**RLS:** ✅ Enabled — Users can view/update/insert own profile  
**Foreign Keys:** `id → auth.users(id) ON DELETE CASCADE`  
**App Usage:** Every layout query, verify-provider, dashboard

---

#### 2. `user_roles`
**Migration:** `20251231000002_create_schema.sql`  
**Status:** ✅ ACTIVE — Used on every authenticated page  

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| user_id | uuid | NO | FK → profiles(id) |
| role | text | NO | CHECK: tenant/landlord/service_provider |
| is_active | boolean | YES | true |
| is_verified | boolean | YES | false |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

**Indexes:** `idx_user_roles_user_id`, `idx_user_roles_role`, `idx_user_roles_active`, `idx_user_roles_active_lookup` (covered)  
**RLS:** ✅ Enabled — Users can view/insert/update own roles  
**Unique:** (user_id, role)

---

### SECTION 2: DISCOVERY LAYER (Service Catalog)

---

#### 3. `service_categories`
**Migration:** `20260108120001_discovery_layer.sql`  
**Status:** ✅ ACTIVE — Homepage + service wizard  

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| slug | text UNIQUE | NO | — |
| name | text | NO | — |
| description | text | YES | — |
| icon | text | YES | — |
| is_primary | boolean | YES | true |
| display_order | int | NO | — |
| is_active | boolean | YES | true |
| meta_title | text | YES | — |
| meta_description | text | YES | — |
| created_at/updated_at | timestamptz | YES | now() |

**Indexes:** `idx_categories_is_primary`, `idx_categories_display_order`, `idx_categories_slug`  
**RLS:** ❌ Not explicitly enabled in migrations  
**Unique:** slug, `service_categories_slug_unique` (added later)

---

#### 4. `service_subcategories`
**Migration:** `20260108120001_discovery_layer.sql`  
**Status:** ✅ ACTIVE — Service wizard grouping  

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| category_id | uuid | YES | FK → service_categories(id) CASCADE |
| slug | text UNIQUE | NO | — |
| name | text | NO | — |
| description | text | YES | — |
| is_active | boolean | YES | true |
| created_at/updated_at | timestamptz | YES | now() |

**Indexes:** `idx_subcategories_category_id`, `idx_subcategories_slug`, `idx_subcategories_category_lookup` (covered)

---

#### 5. `service_types`
**Migration:** `20260108120001_discovery_layer.sql`  
**Status:** ⚠️ DESIGNED — Defines booking flow mapping  

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| code | text UNIQUE | NO | — |
| name | text | NO | — |
| booking_flow | booking_flow_type | NO | — |
| description | text | YES | — |
| risk_level | int | YES | CHECK: 1-5 |
| trust_level | int | YES | CHECK: 1-5 |
| requires_quote | boolean | YES | false |
| created_at/updated_at | timestamptz | YES | now() |

**Indexes:** `idx_service_types_code`, `idx_service_types_booking_flow`  
**RLS:** ❌ Not enabled

---

#### 6. `services`
**Migration:** `20260108120001_discovery_layer.sql`  
**Status:** ✅ ACTIVE — Service wizard, provider enrollment  

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid PK | NO | gen_random_uuid() |
| category_id | uuid | NO | FK → service_categories(id) RESTRICT |
| subcategory_id | uuid | YES | FK → service_subcategories(id) SET NULL |
| service_type_id | uuid | NO | FK → service_types(id) RESTRICT |
| slug | text UNIQUE | NO | — |
| name | text | NO | — |
| description | text | YES | — |
| short_description | text | YES | — |
| is_active | boolean | YES | true |
| requires_site_visit | boolean | YES | false |
| meta_title/meta_description | text | YES | — |
| created_at/updated_at | timestamptz | YES | now() |

**Indexes:** Multiple covering and partial indexes  
**Unique:** slug, (category_id, name)  
**Trigger:** `prevent_service_type_change_trigger` — prevents changing service_type_id after bookings exist

---

#### 7. `service_capabilities`
**Migration:** `20260108120001_discovery_layer.sql`  
**Status:** ⚠️ DESIGNED — Feature flags per service  

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| service_id | uuid PK | NO | FK → services(id) CASCADE |
| supports_emergency | boolean | YES | false |
| emergency_response_sla_minutes | int | YES | — |
| is_recurring_capable | boolean | YES | false |
| min_booking_notice_hours | int | YES | 24 |
| supports_multi_location | boolean | YES | false |
| travel_fee_applies | boolean | YES | false |
| materials_provided_by_provider/customer | boolean | YES | false |
| requires_site_visit_default | boolean | YES | false |
| allows_remote_service | boolean | YES | false |
| created_at/updated_at | timestamptz | YES | now() |

**Constraints:** Emergency SLA required check, multi-location logic check

---

#### 8. `service_pricing`
**Migration:** `20260108120001_discovery_layer.sql`  
**Status:** ⚠️ DESIGNED — Not actively queried in dashboard code  

| Column | Type |
|--------|------|
| id | uuid PK |
| service_id | uuid FK |
| pricing_display_type | pricing_type |
| base_amount | decimal(10,2) |
| currency | text DEFAULT 'KES' |
| unit | text |
| description | text |
| is_active | boolean |
| created_at/updated_at | timestamptz |

---

#### 9. `service_pricing_components`
**Migration:** `20260108120001_discovery_layer.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 10. `service_verification_requirements`
**Migration:** `20260108120001_discovery_layer.sql`  
**Status:** ⚠️ DESIGNED — Used in `verification_queue` view  

---

### SECTION 3: TRUST & PROVIDER LAYER

---

#### 11. `service_providers` ⭐ CORE TABLE
**Migration:** `20260108120002_trust_provider_layer.sql` + many ALTER TABLE additions  
**Status:** ✅ HEAVILY ACTIVE — Every provider page  

| Column | Type | Default | Source Migration |
|--------|------|---------|-----------------|
| id | uuid PK | gen_random_uuid() | Original |
| user_id | uuid UNIQUE NOT NULL | — | Original |
| business_name | text NOT NULL | — | Original |
| business_type | text | — | Original |
| registration_number | text | — | Original |
| tax_id | text | — | Original |
| phone | text NOT NULL | — | Original |
| email | text | — | Original |
| whatsapp | text | — | Original |
| primary_location | text | — | Original |
| service_radius_km | int | — | Original |
| bio | text | — | Original |
| years_in_business | int | — | Original |
| team_size | int | — | Original |
| profile_photo_url | text | — | Original |
| cover_photo_url | text | — | Original |
| business_photos | jsonb | — | Original |
| total_jobs_completed | int | 0 | Original |
| average_rating | decimal(3,2) | — | Original |
| total_reviews | int | 0 | Original |
| response_time_minutes | int | — | Original |
| acceptance_rate | decimal(5,2) | — | Original |
| is_active | boolean | true | Original |
| is_verified | boolean | false | Original |
| verification_badge | text | — | Original |
| account_status | text | 'active' | Original |
| created_at/updated_at | timestamptz | now() | Original |
| last_active_at | timestamptz | — | Original |
| max_concurrent_bookings | int NOT NULL | 30 | `20260109120030` |
| capacity_mode | text | 'per_service' | `20260109120030` |
| emergency_capacity_reserved | int | 2 | `20260109120030` |
| emergency_hard_ceiling | int | — | `20260109120031` |
| max_simultaneous_emergencies | int | 1 | `20260109120031` |
| headline | text | — | `20260301000000` |
| years_experience | text | — | `20260301000000` |
| languages | text[] | — | `20260301000000` |
| tagline | text | — | `20260301000000` |
| emergency_available | boolean | false | `20260301000001` |
| emergency_surcharge_type | text | — | `20260301000001` |
| emergency_surcharge_amount | decimal(10,2) | — | `20260301000001` |
| response_time | text | — | `20260301000001` |
| social_links | jsonb | '{}' | `20260302000001` |

**Indexes:** `idx_providers_user_id`, `idx_providers_is_active`, `idx_providers_is_verified`, `idx_providers_average_rating`, `idx_providers_verification_badge`, `idx_service_providers_user_id_lookup` (covered), `idx_providers_emergency_available`  
**RLS:** ✅ Enabled — Own read/update/insert + public read for active  
**Constraint:** `phone_format`, `response_time_check`, `emergency_surcharge_type_check`, `emergency_surcharge_amount_check`, `emergency_reserve_limit`, `emergency_ceiling_above_max`

---

#### 12. `provider_services`
**Migration:** `20260108120002_trust_provider_layer.sql` + multiple ALTER TABLEs  
**Status:** ✅ ACTIVE — Services page, enrollment  

| Column | Type | Default | Source |
|--------|------|---------|--------|
| id | uuid PK | gen_random_uuid() | Original |
| provider_id | uuid NOT NULL | FK → service_providers(id) CASCADE | Original |
| service_id | uuid NOT NULL | FK → services(id) CASCADE | Original |
| experience_years | int | 0 | Original |
| has_certification | boolean | false | Original |
| certification_type | text | — | Original |
| certification_ref | text | — | Original |
| certification_expiry_date | date | — | Original |
| certification_document_url | text | — | Original |
| verification_status | verification_status | 'not_started' | Original |
| verified_at | timestamptz | — | Original |
| verified_by | uuid | — | Original |
| verification_notes | text | — | Original |
| verification_expires_at | timestamptz | — | Original |
| custom_pricing | jsonb | — | Original |
| is_active | boolean | true | Original |
| created_at/updated_at | timestamptz | now() | Original |
| max_concurrent_bookings | int | — | `20260109120030` |
| max_daily_bookings | int | — | `20260109120030` |
| max_weekly_bookings | int | — | `20260109120030` |
| capacity_time_window | text | 'concurrent' | `20260109120030` |
| concurrent_units | int NOT NULL | 1 | `20260109120032` |
| capacity_scope | capacity_scope_type NOT NULL | 'per_service' | `20260109130000` |
| emergency_capacity_reserved | int | 0 | `20260109130004` |

**Indexes:** Many — provider lookup, service lookup, verification status, active, covered, created desc  
**Unique:** (provider_id, service_id)  
**Triggers:** `validate_capacity_scope`, `prevent_service_deletion`

---

#### 13. `provider_service_areas`
**Migration:** `20260108120002_trust_provider_layer.sql`  
**Status:** ✅ ACTIVE — Profile/service area management  

| Column | Type |
|--------|------|
| id | uuid PK |
| provider_id | uuid FK → service_providers(id) CASCADE |
| service_id | uuid FK → services(id) CASCADE (nullable) |
| area_name | text NOT NULL |
| area_type | text |
| is_primary_area | boolean DEFAULT false |
| travel_fee | decimal(10,2) |
| currency | text DEFAULT 'KES' |
| created_at | timestamptz |

**Unique:** (provider_id, service_id, area_name)  
**Indexes:** provider, service, area_name, primary

---

#### 14. `provider_availability` ⛔ DEPRECATED
**Migration:** `20260108120002_trust_provider_layer.sql`  
**Status:** ⛔ DEPRECATED — Read-only. Replaced by `provider_availability_intervals`  

Writes blocked by trigger `block_deprecated_availability_writes`.  
REVOKE INSERT/UPDATE/DELETE from public/anon/authenticated.

---

#### 15. `provider_availability_intervals` 🆕 CANONICAL
**Migration:** `20260109120032_adversarial_blockers_fix.sql`  
**Status:** ✅ ACTIVE — Availability management in profile  

| Column | Type |
|--------|------|
| id | uuid PK |
| provider_id | uuid FK → service_providers(id) CASCADE |
| service_id | uuid FK → services(id) CASCADE (nullable) |
| available_from | timestamptz NOT NULL |
| available_to | timestamptz NOT NULL |
| recurrence_rule | text |
| is_exception | boolean DEFAULT false |
| is_active | boolean DEFAULT true |
| created_at | timestamptz |

**Indexes:** Provider + GIST for range queries  
**Constraint:** `no_overlapping_availability` (GIST exclusion)

---

#### 16. `provider_verification_documents`
**Migration:** `20260108120002_trust_provider_layer.sql`  
**Status:** ⚠️ DESIGNED — Migration exists, but app uses `provider_documents` instead  

---

#### 17. `provider_documents`
**Migration:** `20260227000000_create_provider_documents.sql`  
**Status:** ✅ ACTIVE — Verify-provider flow  

| Column | Type |
|--------|------|
| id | uuid PK |
| provider_id | uuid FK → service_providers(id) CASCADE |
| document_type | text CHECK(national_id/selfie_with_id/business_registration/kra_certificate/professional_license) |
| document_url | text NOT NULL |
| status | text CHECK(pending/approved/rejected) DEFAULT 'pending' |
| rejection_reason | text |
| created_at/updated_at | timestamptz |

**RLS:** ✅ Enabled — Providers can view own + service role full access

---

#### 18. `provider_vehicles`
**Migration:** `20260108120002_trust_provider_layer.sql`  
**Status:** ⚠️ DESIGNED — No UI references found  

---

#### 19. `provider_driver_licenses`
**Migration:** `20260108120002_trust_provider_layer.sql`  
**Status:** ⚠️ DESIGNED — No UI references found  

---

#### 20. `provider_portfolio`
**Migration:** `20260108120005_support_tables.sql`  
**Status:** ⚠️ DESIGNED — No active UI references found  

---

#### 21. `social_link_clicks`
**Migration:** `20260302000002_social_link_clicks.sql`  
**Status:** ✅ ACTIVE — Social traffic analytics  

| Column | Type |
|--------|------|
| id | uuid PK |
| provider_id | uuid FK → service_providers(id) CASCADE |
| platform | text NOT NULL |
| destination_url | text NOT NULL |
| referrer | text |
| user_agent | text |
| country | text |
| session_id | text |
| clicked_at | timestamptz DEFAULT now() |

**Indexes:** Provider+date, provider+platform, session dedup  
**RLS:** ✅ Enabled — Providers can read own clicks

---

### SECTION 4: BOOKING SYSTEM

---

#### 22. `bookings` ⭐ CORE TABLE
**Migration:** `20260108120003_booking_core.sql` + many additions  
**Status:** ⚠️ DESIGNED BUT NOT DEPLOYED — Migration schema is comprehensive but `database.ts` has `service_jobs` instead  

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | — |
| customer_id | uuid NOT NULL | — |
| provider_id | uuid FK → service_providers(id) RESTRICT | NULL until accepted |
| service_id | uuid FK → services(id) RESTRICT | — |
| service_type_id | uuid FK → service_types(id) RESTRICT | — |
| booking_flow_type | booking_flow_type | — |
| status | booking_status DEFAULT 'draft' | 15-state enum |
| quoted_price | decimal(10,2) | — |
| agreed_price | decimal(10,2) | — |
| currency | text DEFAULT 'KES' | — |
| requested_at thru completed_at | timestamptz | 8 timestamp columns |
| payment_status | text DEFAULT 'pending' | — |
| payment_method | text | mpesa/card/cash |
| payment_ref | text | — |
| customer_notes | text | — |
| provider_notes | text | — |
| cancellation_reason | text | — |
| metadata | jsonb | — |
| pricing_snapshot | jsonb | IMMUTABLE once set |
| parent_booking_id | uuid FK self | Recurring support |
| is_recurring_instance | boolean | — |
| recurrence_sequence | int | — |
| service_location_id | uuid FK → locations(id) | — |
| estimated_busy_from | timestamptz | Renamed from busy_from |
| estimated_busy_to | timestamptz | Renamed from busy_to |
| created_at/updated_at | timestamptz | — |

**Indexes:** 15+ indexes including customer, provider, status, flow type, schedule  
**Triggers:** State machine enforcement, capacity check, busy interval population, pricing snapshot immutability, serializable isolation enforcement  
**Constraints:** Pricing snapshot required after confirmation, recurring instance has parent

---

#### 23. `booking_status_history`
**Migration:** `20260108120003_booking_core.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 24. `booking_state_transitions`
**Migration:** `20260109120031_critical_gaps_complete_fix.sql`  
**Status:** ⚠️ DESIGNED — Authoritative state machine definition  

Pre-populated with ~25 valid transitions.

---

#### 25. `booking_quotes`
**Migration:** `20260108120003_booking_core.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 26. `booking_messages`
**Migration:** `20260108120003_booking_core.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 27. `booking_media`
**Migration:** `20260108120003_booking_core.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 28. `booking_disputes`
**Migration:** `20260108120003_booking_core.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 29. `booking_recurring_rules`
**Migration:** `20260108120006_schema_fixes_critical.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 30. `booking_commitments`
**Migration:** `20260109140001_booking_commitments_infrastructure.sql`  
**Status:** ⚠️ DESIGNED — Immutable capacity reservations (economic truth layer)  

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | — |
| booking_id | uuid UNIQUE FK | IMMUTABLE |
| provider_id | uuid FK | IMMUTABLE |
| service_id | uuid FK | IMMUTABLE |
| committed_from | timestamptz | IMMUTABLE |
| committed_to | timestamptz | IMMUTABLE |
| capacity_scope | capacity_scope_type | IMMUTABLE |
| concurrent_units_reserved | int | IMMUTABLE |
| status | text CHECK(active/released/completed) | Only mutable field |
| released_at | timestamptz | — |
| released_reason | text | — |
| completed_at | timestamptz | — |
| created_at | timestamptz | — |
| created_by | uuid | — |

---

#### 31. `locations`
**Migration:** `20260108120003_booking_core.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 32. `booking_emergency_details` ⛔ SKIPPED
**Migration:** `_skip_20260108120004_booking_flow_details.sql`  
**Status:** ⛔ FILE SKIPPED — Not applied (underscore prefix)  

Same for: `booking_standard_details`, `booking_delivery_details`, `booking_project_details`, `booking_personal_details`

---

### SECTION 5: REVIEWS & SUPPORT

---

#### 33. `reviews`
**Migration:** `20260108120005_support_tables.sql`  
**Status:** ⚠️ DESIGNED — Not deployed; app uses `provider_reviews` from older schema  

---

#### 34. `review_helpful_votes`
**Migration:** `20260108120005_support_tables.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 35. `notifications`
**Migration:** `20260108120005_support_tables.sql`  
**Status:** ⚠️ PARTIAL — Table created in migrations, RLS added in seed_neighborhoods migration  

---

#### 36. `user_preferences`
**Migration:** `20260108120005_support_tables.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 37. `saved_providers`
**Migration:** `20260108120005_support_tables.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 38. `blocked_users`
**Migration:** `20260108120005_support_tables.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 39-44. System Tables
All ⚠️ DESIGNED: `system_announcements`, `feature_flags`, `audit_log`, `api_keys`, `system_metrics`

---

### SECTION 6: CLUSTER ARCHITECTURE

---

#### 45. `clusters`
**Migration:** `20260115041356_add_cluster_schema.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 46. `cluster_categories`
**Migration:** `20260115041356_add_cluster_schema.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 47. `cluster_adjacency`
**Migration:** `20260115041356_add_cluster_schema.sql`  
**Status:** ⚠️ DESIGNED  

---

#### 48-49. `provider_clusters`, `provider_category_attempts`
**Migration:** `20260115041356_add_cluster_schema.sql`  
**Status:** ⚠️ BROKEN — References `providers` table which doesn't exist (should be `service_providers`)  

---

#### 50. `neighborhoods`
**Migration:** `20260116000000_seed_neighborhoods.sql`  
**Status:** ✅ ACTIVE — Profile service area selection, seeded with Nairobi neighborhoods  

**RLS:** ✅ Enabled — Public read for authenticated and anon

---

### SECTION 7: TABLES IN GENERATED TYPES BUT NOT IN MIGRATIONS (Older Schema)

These exist in the DEPLOYED database (`database.ts`) but have NO corresponding migration file:

| Table | In Types? | In Migrations? | Used in App? | Notes |
|-------|-----------|----------------|-------------|-------|
| `service_jobs` | ✅ | ❌ | ✅ (via types) | **REPLACED by `bookings`** in new schema |
| `service_job_quotes` | ✅ | ❌ | ✅ (via types) | **REPLACED by `booking_quotes`** |
| `service_job_messages` | ✅ | ❌ | ✅ (via types) | **REPLACED by `booking_messages`** |
| `provider_reviews` | ✅ | ❌ | ✅ (via types) | **REPLACED by `reviews`** |
| `provider_verifications` | ✅ | ❌ | ✅ (via types) | **REPLACED by `provider_verification_documents`** |
| `provider_blocked_dates` | ✅ | ❌ | ✅ (via types) | No replacement designed |
| `provider_service_photos` | ✅ | ❌ | ✅ (via types) | No migration equivalent |
| `provider_working_hours` | ✅ | ❌ | ✅ (via types) | **REPLACED by `provider_availability_intervals`** |
| `phone_verifications` | ✅ | ❌ | ✅ (verify-provider) | Used in verification flow, no migration |
| `payments` | ✅ | ❌ | Unknown | Property management payments |
| `maintenance_requests` | ✅ | ❌ | Unknown | Property management |

---

## ENUM MAP

### Enums in Migrations:

| Enum | Values | Status |
|------|--------|--------|
| `booking_flow_type` | emergency, standard, delivery, project, personal | ⚠️ Designed |
| `verification_level` | basic, standard, certified, background_checked | ⚠️ Designed |
| `verification_status` | draft, not_started, pending, verified, rejected, expired | ⚠️ Designed |
| `pricing_type` | fixed, starting_from, per_unit, quote_only, hourly, daily | ⚠️ Designed |
| `pricing_component_type` | base, unit, time, distance, pass_through | ⚠️ Designed |
| `booking_status` | 15 states (draft → resolved) | ⚠️ Designed |
| `damage_risk_level` | low, medium, high, critical | ⚠️ Designed |
| `property_type` | apartment, house, townhouse, villa, office, commercial, warehouse, land, other | ⚠️ Designed |
| `dispute_severity` | low, medium, high | ⚠️ Designed |
| `review_rating` | 1, 2, 3, 4, 5 | ⚠️ Designed |
| `location_type` | home, office, public_place, in_vehicle, other | ⚠️ Designed |
| `capacity_scope_type` | per_service, provider_wide | ⚠️ Designed |

### Enums in Generated Types (Deployed):

| Enum | Values |
|------|--------|
| `provider_type` | individual, company |
| `provider_status` | pending, active, suspended, inactive |
| `provider_tier` | free, premium, enterprise |
| `job_status` | pending, quoted, accepted, scheduled, in_progress, completed, cancelled, disputed |
| `job_priority` | low, normal, urgent, emergency |
| `service_payment_status` | pending, escrow, released, refunded, disputed |
| `verification_status` | pending, submitted, verified, rejected, expired |

**MISMATCH:** The `verification_status` enum has different values between migrations (`draft, not_started, pending, verified, rejected, expired`) and deployed (`pending, submitted, verified, rejected, expired`).

---

## RLS POLICY SUMMARY

| Table | RLS Enabled? | Policies |
|-------|-------------|----------|
| `profiles` | ✅ | Own read/update/insert |
| `user_roles` | ✅ | Own read/insert/update |
| `service_providers` | ✅ | Own read/update/insert + public read active |
| `neighborhoods` | ✅ | Public read (auth + anon) |
| `notifications` | ✅ | Own read/update |
| `provider_documents` | ✅ | Own read + service role full |
| `social_link_clicks` | ✅ | Own read |
| All other tables | ❌ | **NO RLS** — Critical gap for production |

---

## MATERIALIZED VIEWS

| View | Status | Purpose |
|------|--------|---------|
| `services_with_categories` | ⚠️ Designed | Denormalized services + category hierarchy |
| `verification_queue` | ⚠️ Designed | Operations monitoring |
| `bookings_with_legacy_busy` | ⚠️ Designed | Backward compat (restricted) |

---

## FUNCTIONS & TRIGGERS (Key Ones)

| Function | Purpose | Status |
|----------|---------|--------|
| `update_updated_at()` | Auto-timestamp | ✅ Active |
| `enforce_booking_state_machine()` | State machine + commitment check | ⚠️ Designed |
| `check_provider_capacity_with_units()` | Capacity enforcement | ⚠️ Designed |
| `create_commitment_and_confirm_booking()` | Atomic booking confirmation | ⚠️ Designed |
| `enforce_commitment_immutability()` | Immutability guard | ⚠️ Designed |
| `validate_provider_capacity_scope()` | Capacity scope validation | ⚠️ Designed |
| `check_emergency_eligibility()` | Emergency eligibility | ⚠️ Designed |
| `enforce_pricing_snapshot_immutability()` | Pricing evidence | ⚠️ Designed |
| `prevent_service_type_change()` | Service type lock | ⚠️ Designed |
| `auto_assign_dispute_severity()` | Dispute triage | ⚠️ Designed |
| `calculate_provider_profile_completion()` | Profile completion % | ✅ Active (RPC) |

---

## CRITICAL ISSUES IDENTIFIED

### 🔴 BLOCKER: Schema Divergence
The `database.ts` generated types are **completely out of sync** with the migration files. The deployed DB has an older schema (`service_jobs`, `provider_reviews`, `provider_working_hours`) while migrations define a much richer schema (`bookings`, `reviews`, `booking_commitments`).

**Impact:** Type safety is broken. Application code references tables that may not exist in the migration schema, and migrations define tables that the generated types don't know about.

**Fix:** Run `npx supabase gen types typescript` to regenerate types, OR reconcile which schema is authoritative.

### 🔴 BLOCKER: Missing Migration for `phone_verifications`
The `verify-provider` flow queries `phone_verifications` table extensively (6+ queries) but **no migration creates this table**. It likely exists in the deployed DB but was created via dashboard or an earlier migration not present.

### 🔴 BLOCKER: Missing Migrations for App-Used Tables
Tables actively used by application code but with no migration:
- `provider_service_photos` — Photo management in service wizard
- `provider_working_hours` — Working hours in profile  
- `provider_blocked_dates` — Date blocking
- `provider_reviews` — Review display
- `service_jobs` — Job/booking display

### 🟡 WARNING: Cluster Schema References Wrong Table
`20260115041356_add_cluster_schema.sql` references `providers` table:
```sql
CREATE TABLE provider_clusters (
  provider_id UUID PRIMARY KEY REFERENCES providers(id)  -- WRONG: should be service_providers
```
This migration will fail if applied.

### 🟡 WARNING: Booking Flow Detail Tables Skipped
The file `_skip_20260108120004_booking_flow_details.sql` is prefixed with `_skip_`, meaning 5 critical booking detail tables (`booking_emergency_details`, `booking_standard_details`, `booking_delivery_details`, `booking_project_details`, `booking_personal_details`) are never created.

### 🟡 WARNING: No RLS on Most Tables
Only 7 tables have RLS enabled. All booking, review, discovery, and system tables have **no RLS policies**. This is a security concern for production.

### 🟡 WARNING: Duplicate/Conflicting Tables
- `provider_verification_documents` (migration) vs `provider_documents` (newer migration + deployed) — Two competing document tables
- `reviews` (migration) vs `provider_reviews` (deployed) — Two review tables
- `provider_availability` (deprecated) vs `provider_availability_intervals` (canonical) — Deprecated table still in schema

### 🟡 WARNING: No Seed Files Found
The `supabase/` directory contains only `migrations/` and `.temp/`. No `seed.sql` or seed data files exist (except neighborhood seeding within a migration file).

---

## TABLES NEEDED BUT DON'T EXIST

Based on dashboard UI references and PRD analysis:

| Need | Status | Notes |
|------|--------|-------|
| **Payments/Earnings** | ❌ Missing | Dashboard references earnings — no `payments` or `earnings` table in migrations |
| **Provider Service Photos** | ❌ Missing in migrations | Exists in deployed DB types but no migration |
| **Provider Working Hours** | ⚠️ Replaced | Old table exists but `provider_availability_intervals` is canonical |
| **Phone Verifications** | ❌ Missing in migrations | Used heavily in verification flow |
| **Provider Blocked Dates** | ❌ Missing in migrations | Referenced in types |
| **Booking Flow Details** | ⛔ Skipped | 5 tables in `_skip_` file — must be activated |
| **Admin/Support Queue** | ❌ Missing | No admin review queue tables |
| **Customer Addresses** | ⚠️ Partial | `locations` table exists but not connected to UI |

---

## SUMMARY STATISTICS

| Metric | Count |
|--------|-------|
| Total tables in migrations | ~50 |
| Tables actively used by app | ~15 |
| Tables designed but not deployed | ~30 |
| Tables deployed but no migration | ~10 |
| Enums in migrations | 12 |
| Enums in deployed DB | 7 |
| RLS-enabled tables | 7 |
| Total migration files | 60 |
| Skipped/test migration files | 3 |
| Materialized views | 3 |
| Database functions | 20+ |
| Database triggers | 30+ |

---

## RECOMMENDED ACTION PLAN

1. **Regenerate `database.ts`** — Current types are stale and dangerous
2. **Create migration for `phone_verifications`** — App breaks without it
3. **Decide canonical schema** — Migration schema vs deployed schema
4. **Fix cluster migration** — `providers` → `service_providers` reference
5. **Activate booking flow details** — Remove `_skip_` prefix or integrate into `bookings.metadata`
6. **Add RLS to all public tables** — Critical for production security
7. **Create `provider_service_photos` migration** — Active in UI but no migration
8. **Reconcile review tables** — `reviews` vs `provider_reviews`
9. **Reconcile document tables** — `provider_verification_documents` vs `provider_documents`
10. **Add payments/earnings infrastructure** — Dashboard references it
