# Supabase Migration Audit — RLS, Policies, Schema, Functions

**Generated:** 2026-03-05  
**Scope:** All files in `supabase/migrations/` (76 migration files audited)

---

## Section 1: Tables WITH RLS Enabled — Policies

> **Key:** `→ authenticated` = role grant; no role shown = default (all roles).

---

### `profiles`
**RLS Enabled:** `20251231000002_create_schema.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can view own profile | SELECT | — | `auth.uid() = id` | — |
| Users can update own profile | UPDATE | — | `auth.uid() = id` | — |
| Users can insert own profile | INSERT | — | — | `auth.uid() = id` |

---

### `user_roles`
**RLS Enabled:** `20251231000002_create_schema.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can view own roles | SELECT | — | `auth.uid() = user_id` | — |
| Users can insert own roles | INSERT | — | — | `auth.uid() = user_id` |
| Users can update own roles | UPDATE | — | `auth.uid() = user_id` | — |

---

### `service_providers`
**RLS Enabled:** `20260116000000_seed_neighborhoods.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| providers_own_read | SELECT | authenticated | `user_id = auth.uid()` | — |
| providers_own_update | UPDATE | authenticated | `user_id = auth.uid()` | `user_id = auth.uid()` |
| providers_own_insert | INSERT | authenticated | — | `user_id = auth.uid()` |
| providers_public_read_active | SELECT | anon | `is_active = true` | — |

---

### `provider_services`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| provider_services_select_own | SELECT | authenticated | `provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())` | — |
| provider_services_select_public | SELECT | anon, authenticated | `is_active = true` | — |
| provider_services_insert_own | INSERT | authenticated | — | `provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())` |
| provider_services_update_own | UPDATE | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |
| provider_services_delete_own | DELETE | authenticated | `provider_id IN (…auth.uid()…)` | — |

---

### `provider_service_areas`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| provider_service_areas_select_public | SELECT | anon, authenticated | `true` | — |
| provider_service_areas_insert_own | INSERT | authenticated | — | `provider_id IN (…auth.uid()…)` |
| provider_service_areas_update_own | UPDATE | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |
| provider_service_areas_delete_own | DELETE | authenticated | `provider_id IN (…auth.uid()…)` | — |

---

### `provider_availability_intervals`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| provider_availability_intervals_select_public | SELECT | anon, authenticated | `is_active = true` | — |
| provider_availability_intervals_insert_own | INSERT | authenticated | — | `provider_id IN (…auth.uid()…)` |
| provider_availability_intervals_update_own | UPDATE | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |
| provider_availability_intervals_delete_own | DELETE | authenticated | `provider_id IN (…auth.uid()…)` | — |

---

### `provider_availability` *(legacy — deprecated)*
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| provider_availability_select_public | SELECT | anon, authenticated | `is_active = true` | — |
| provider_availability_manage_own | ALL | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |

---

### `provider_verification_documents`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| provider_verification_documents_select_own | SELECT | authenticated | `provider_id IN (…auth.uid()…)` | — |

> ⚠️ **No INSERT/UPDATE/DELETE policies** — only SELECT. Writes presumably done via service_role.

---

### `provider_documents`
**RLS Enabled:** `20260227000000_create_provider_documents.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Providers can view own documents | SELECT | — | `provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())` | — |
| Service role can manage documents | ALL | — | `true` | `true` |

> ⚠️ "Service role can manage documents" is `FOR ALL USING(true) WITH CHECK(true)` — **wide open** to any role that can read this policy. Intended to be used only by service_role key, but the policy applies to all roles.

---

### `bookings`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| bookings_select_customer | SELECT | authenticated | `customer_id = auth.uid()` | — |
| bookings_select_provider | SELECT | authenticated | `provider_id IN (…auth.uid()…)` | — |
| bookings_insert_customer | INSERT | authenticated | — | `customer_id = auth.uid()` |
| bookings_update_customer | UPDATE | authenticated | `customer_id = auth.uid()` | `customer_id = auth.uid()` |
| bookings_update_provider | UPDATE | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |

> ⚠️ **No DELETE policy** — bookings cannot be deleted by users (correct design).

---

### `booking_quotes`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| booking_quotes_select_provider | SELECT | authenticated | `provider_id IN (…auth.uid()…)` | — |
| booking_quotes_select_customer | SELECT | authenticated | `booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid())` | — |
| booking_quotes_insert_provider | INSERT | authenticated | — | `provider_id IN (…auth.uid()…)` |
| booking_quotes_update_provider | UPDATE | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |

---

### `booking_messages`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| booking_messages_select_participant | SELECT | authenticated | `booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid() OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()))` | — |
| booking_messages_insert_participant | INSERT | authenticated | — | `sender_id = auth.uid() AND booking_id IN (…participant check…)` |
| booking_messages_update_read | UPDATE | authenticated | `booking_id IN (…participant check…)` | `booking_id IN (…participant check…)` |

---

### `reviews`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| reviews_select_public | SELECT | anon, authenticated | `is_hidden = false` | — |
| reviews_select_own | SELECT | authenticated | `reviewer_id = auth.uid()` | — |
| reviews_insert_reviewer | INSERT | authenticated | — | `reviewer_id = auth.uid() AND booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid())` |
| reviews_update_provider_response | UPDATE | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |

> ⚠️ **No DELETE policy** — reviews cannot be deleted by users (correct design).

---

### `saved_providers`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| saved_providers_select_own | SELECT | authenticated | `user_id = auth.uid()` | — |
| saved_providers_insert_own | INSERT | authenticated | — | `user_id = auth.uid()` |
| saved_providers_delete_own | DELETE | authenticated | `user_id = auth.uid()` | — |

> Note: Column was renamed `customer_id → user_id` in m0_critical_fixes. No UPDATE policy.

---

### `notifications`
**RLS Enabled:** `20260105000002_notifications_system.sql` (first version — dropped by `20260108120005`)  
**RLS Re-enabled:** `20260116000000_seed_neighborhoods.sql` (on the recreated table from `20260108120005`)  
**FORCE RLS:** No

**Effective policies (on the final table schema from `20260108120005`):**

From `20260105000002` (on original table, **lost** when table was dropped):
| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| ~~Users can view own notifications~~ | ~~SELECT~~ | — | ~~`auth.uid() = user_id`~~ | — |
| ~~Users can update own notifications~~ | ~~UPDATE~~ | — | ~~`auth.uid() = user_id`~~ | — |
| ~~Users can delete own notifications~~ | ~~DELETE~~ | — | ~~`auth.uid() = user_id`~~ | — |
| ~~System can insert notifications~~ | ~~INSERT~~ | — | — | ~~`true`~~ |

From `20260116000000` (on the **current** recreated table):
| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| notifications_own_read | SELECT | authenticated | `user_id = auth.uid()` | — |
| notifications_own_update | UPDATE | authenticated | `user_id = auth.uid()` | `user_id = auth.uid()` |

> ⚠️ **No INSERT policy on the current table!** The original `"System can insert notifications"` was lost when the table was dropped and recreated. Server-side trigger inserts (via `notify_landlord_on_inquiry`, `auto_confirm_completed_bookings`) use `SECURITY DEFINER` and bypass RLS, so they still work.  
> ⚠️ **No DELETE policy on the current table.**

---

### `social_link_clicks`
**RLS Enabled:** `20260302000002_social_link_clicks.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Providers can view own clicks | SELECT | — | `provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())` | — |

> No INSERT policy for users — inserts done via service_role API route.

---

### `provider_portfolio`
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| provider_portfolio_select_public | SELECT | anon, authenticated | `true` | — |
| provider_portfolio_manage_own | ALL | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |

---

### `booking_payments`
**RLS Enabled:** `20260305000000_m6_payment_tables.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| booking_payments_payer_select | SELECT | — | `auth.uid() = payer_id` | — |
| booking_payments_provider_select | SELECT | — | `provider_id IN (…auth.uid()…)` | — |
| booking_payments_service_insert | INSERT | — | — | `true` |
| booking_payments_service_update | UPDATE | — | `true` | — |

> ⚠️ INSERT/UPDATE policies are `true` — intended for service_role only but **policy applies to ALL roles**.

---

### `provider_payouts`
**RLS Enabled:** `20260305000000_m6_payment_tables.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| payouts_provider_select | SELECT | — | `provider_id IN (…auth.uid()…)` | — |
| payouts_service_insert | INSERT | — | — | `true` |
| payouts_service_update | UPDATE | — | `true` | — |

---

### `provider_blocked_dates` *(conditional — only if table exists)*
**RLS Enabled:** `20260303000000_m0_critical_fixes.sql` (inside DO block with existence check)  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| provider_blocked_dates_select_public | SELECT | anon, authenticated | `true` | — |
| provider_blocked_dates_manage_own | ALL | authenticated | `provider_id IN (…auth.uid()…)` | `provider_id IN (…auth.uid()…)` |

---

### `neighborhoods`
**RLS Enabled:** `20260116000000_seed_neighborhoods.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| neighborhoods_public_read | SELECT | authenticated | `true` | — |
| neighborhoods_anon_read | SELECT | anon | `true` | — |

---

### `analytics_events`
**RLS Enabled:** `20260305090000_analytics_tables.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| analytics_events_insert | INSERT | authenticated, anon | — | `true` |
| analytics_events_select | SELECT | service_role | `true` | — |

---

### `search_queries` *(analytics)*
**RLS Enabled:** `20260305090000_analytics_tables.sql`  
**FORCE RLS:** No

| Policy Name | Operation | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| search_queries_insert | INSERT | authenticated, anon | — | `true` |
| search_queries_select | SELECT | service_role | `true` | — |

---

### Other tables with RLS (not in target list)
- **`listings`** — RLS enabled in `20260101000005`
- **`listing_inquiries`** — RLS enabled in `20260101000005`
- **`buildings`** — RLS enabled in `20260101000003`
- **`units`** — RLS enabled in `20260101000003`
- **`tenants`** — RLS enabled in `20260101000003`
- **`leases`** — RLS enabled in `20260101000003`
- **`payments`** — RLS enabled in `20260101000003`
- **`maintenance_requests`** — RLS enabled in `20260101000003`
- **`inquiries`** — RLS enabled in `20260102000001`
- **`saved_listings`** — RLS enabled in `20260102000001`
- **`search_alerts`** — RLS enabled in `20260102000001`
- **`listing_waitlist`** — RLS enabled in `20260105000003`
- **`storage.objects`** — Policies for buckets: property-photos, avatars, documents, booking-media

---

## Section 2: Target Tables WITHOUT RLS

These tables from the requested list have **NO `ENABLE ROW LEVEL SECURITY`** and **NO policies**:

| Table | Migration | Risk |
|---|---|---|
| **`booking_status_history`** | `20260108120003_booking_core.sql` | 🔴 HIGH — Contains full audit trail. Any authenticated user can read/write all rows. |
| **`review_helpful_votes`** (aka `review_votes`) | `20260108120005_support_tables.sql` | 🟡 MEDIUM — Users could manipulate vote counts. |
| **`user_preferences`** | `20260108120005_support_tables.sql` | 🔴 HIGH — Any user can read/modify other users' preferences. |
| **`booking_disputes`** | `20260108120003_booking_core.sql` | 🔴 HIGH — Contains dispute details, evidence, refund info. Fully exposed. |
| **`provider_vehicles`** | `20260108120002_trust_provider_layer.sql` | 🟡 MEDIUM — Vehicle registration data exposed. |
| **`provider_driver_licenses`** | `20260108120002_trust_provider_layer.sql` | 🔴 HIGH — License numbers, police clearance URLs. PII exposed. |
| **`provider_service_photos`** | ❌ **TABLE DOES NOT EXIST** in any migration | — |

### Also notable — no RLS on these system tables:
- `blocked_users` — No RLS
- `system_announcements` — No RLS
- `feature_flags` — No RLS
- `audit_log` — No RLS
- `api_keys` — No RLS (contains hashed API keys)
- `system_metrics` — No RLS
- `booking_media` — No RLS
- `booking_commitments` — No RLS
- `booking_state_transitions` — No RLS
- `booking_recurring_rules` — No RLS
- `locations` — No RLS

---

### FORCE ROW LEVEL SECURITY

**No migration uses `FORCE ROW LEVEL SECURITY` on any table.** This means table owners (including `postgres` role) bypass RLS entirely.

---

## Section 3: Full Schema Definitions

### `profiles`
**Created:** `20251231000002_create_schema.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | — | PK, FK → auth.users(id) ON DELETE CASCADE |
| email | text | — | NOT NULL |
| phone | text | — | — |
| full_name | text | — | — |
| avatar_url | text | — | — |
| primary_role | text | — | CHECK IN ('tenant', 'landlord', 'service_provider') |
| is_verified | boolean | false | — |
| verification_level | text | 'none' | CHECK IN ('none', 'phone', 'id', 'full') |
| metadata | jsonb | '{}' | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

---

### `service_providers`
**Created:** `20260108120002_trust_provider_layer.sql`  
**Columns added in later migrations:**

| Column | Type | Default | Constraints / Notes |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | — | NOT NULL, UNIQUE (FK → auth.users) |
| business_name | text | — | NOT NULL |
| business_type | text | — | 'individual', 'company', 'cooperative' |
| registration_number | text | — | — |
| tax_id | text | — | KRA PIN |
| phone | text | — | NOT NULL, CHECK `^\+?[0-9]{10,15}$` |
| email | text | — | — |
| whatsapp | text | — | — |
| primary_location | text | — | — |
| service_radius_km | int | — | — |
| bio | text | — | — |
| years_in_business | int | — | — |
| team_size | int | — | — |
| profile_photo_url | text | — | — |
| cover_photo_url | text | — | — |
| business_photos | jsonb | — | — |
| total_jobs_completed | int | 0 | — |
| average_rating | decimal(3,2) | — | — |
| total_reviews | int | 0 | — |
| response_time_minutes | int | — | — |
| acceptance_rate | decimal(5,2) | — | — |
| is_active | boolean | true | — |
| is_verified | boolean | false | — |
| verification_badge | text | — | 'bronze', 'silver', 'gold', 'premium' |
| account_status | text | 'active' | 'active', 'suspended', 'deactivated' |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |
| last_active_at | timestamptz | — | — |
| **instant_booking** | boolean | false | Added: `m0_critical_fixes` |
| **portfolio_images** | text[] | '{}' | Added: `m0_critical_fixes` |
| **headline** | text | — | Added: `20260301000000` |
| **years_experience** | text | — | Added: `20260301000000` |
| **languages** | text[] | — | Added: `20260301000000` |
| **tagline** | text | — | Added: `20260301000000` |
| **emergency_available** | boolean | false | Added: `20260301000001` |
| **emergency_surcharge_type** | text | — | CHECK IN ('fixed', 'percent') or NULL |
| **emergency_surcharge_amount** | decimal(10,2) | — | CHECK >= 0 or NULL |
| **response_time** | text | — | CHECK IN ('within_1_hour', 'within_few_hours', 'within_24_hours') or NULL (constraint fixed in `20260301000002`) |
| **social_links** | jsonb | '{}' | Added: `20260302000001` |
| **wallet_balance** | decimal(12,2) | 0 | NOT NULL. Added: `m6_payment_tables` |
| **total_earnings** | decimal(12,2) | 0 | NOT NULL. Added: `m6_payment_tables` |
| **search_vector** | tsvector | — | GENERATED ALWAYS AS (…business_name, headline, tagline, bio…) STORED. Added: `sc7_search_quality`, updated: `20260309000000` |
| **min_price** | numeric | — | Added: `sc7_search_quality`. Trigger-maintained. |

---

### `provider_services`
**Created:** `20260108120002_trust_provider_layer.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| service_id | uuid | — | NOT NULL, FK → services(id) ON DELETE CASCADE |
| experience_years | int | 0 | — |
| has_certification | boolean | false | — |
| certification_type | text | — | — |
| certification_ref | text | — | — |
| certification_expiry_date | date | — | — |
| certification_document_url | text | — | — |
| verification_status | verification_status | 'not_started' | — |
| verified_at | timestamptz | — | — |
| verified_by | uuid | — | — |
| verification_notes | text | — | — |
| verification_expires_at | timestamptz | — | — |
| custom_pricing | jsonb | — | — |
| is_active | boolean | true | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

**Constraints:**
- UNIQUE(provider_id, service_id)
- CHECK: `certification_logic` — if `has_certification = true` then `certification_type IS NOT NULL`
- CHECK: `verification_verified_at` — if `verification_status = 'verified'` then `verified_at IS NOT NULL`

---

### `provider_service_areas`
**Created:** `20260108120002_trust_provider_layer.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| service_id | uuid | — | FK → services(id) ON DELETE CASCADE (nullable = all services) |
| area_name | text | — | NOT NULL |
| area_type | text | — | 'neighborhood', 'constituency', 'county' |
| is_primary_area | boolean | false | — |
| travel_fee | decimal(10,2) | — | — |
| currency | text | 'KES' | — |
| created_at | timestamptz | now() | — |

**Constraints:**
- UNIQUE(provider_id, service_id, area_name)

---

### `provider_availability_intervals`
**Created:** `20260109120032_adversarial_blockers_fix.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| service_id | uuid | — | FK → services(id) ON DELETE CASCADE |
| available_from | timestamptz | — | NOT NULL |
| available_to | timestamptz | — | NOT NULL |
| recurrence_rule | text | — | iCalendar RRULE format |
| is_exception | boolean | false | TRUE = blocked time |
| is_active | boolean | true | — |
| created_at | timestamptz | now() | — |

**Constraints:**
- CHECK: `interval_valid` — `available_to > available_from`

---

### `provider_availability` *(legacy — deprecated)*
**Created:** `20260108120002_trust_provider_layer.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| service_id | uuid | — | FK → services(id) ON DELETE CASCADE (nullable) |
| day_of_week | int | — | NOT NULL, CHECK 0–6 |
| start_time | time | — | NOT NULL |
| end_time | time | — | NOT NULL |
| is_active | boolean | true | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

**Constraints:**
- CHECK: `time_range_valid` — `end_time > start_time`

---

### `provider_verification_documents`
**Created:** `20260108120002_trust_provider_layer.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| service_id | uuid | — | FK → services(id) ON DELETE CASCADE (nullable) |
| document_type | text | — | NOT NULL ('id_card', 'business_license', 'certification', 'insurance') |
| document_name | text | — | — |
| document_url | text | — | NOT NULL |
| status | verification_status | 'pending' | — |
| reviewed_at | timestamptz | — | — |
| reviewed_by | uuid | — | — |
| review_notes | text | — | — |
| expires_at | date | — | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

---

### `provider_documents`
**Created:** `20260227000000_create_provider_documents.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| document_type | text | — | NOT NULL, CHECK IN ('national_id', 'selfie_with_id', 'business_registration', 'kra_certificate', 'professional_license') |
| document_url | text | — | NOT NULL |
| status | text | 'pending' | NOT NULL, CHECK IN ('pending', 'approved', 'rejected') |
| rejection_reason | text | — | — |
| created_at | timestamptz | now() | NOT NULL |
| updated_at | timestamptz | now() | NOT NULL |

---

### `bookings`
**Created:** `20260108120003_booking_core.sql`  
**Columns added:** `20260109120002_add_missing_booking_states.sql`  
**FK added:** `20260303100001_m4_bookings_customer_fk.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| customer_id | uuid | — | NOT NULL, FK → profiles(id) ON DELETE CASCADE (added in m4) |
| provider_id | uuid | — | FK → service_providers(id) ON DELETE RESTRICT (nullable until accepted) |
| service_id | uuid | — | NOT NULL, FK → services(id) ON DELETE RESTRICT |
| service_type_id | uuid | — | NOT NULL, FK → service_types(id) ON DELETE RESTRICT |
| booking_flow_type | booking_flow_type | — | NOT NULL |
| status | booking_status | 'draft' | — |
| quoted_price | decimal(10,2) | — | CHECK > 0 or NULL |
| agreed_price | decimal(10,2) | — | CHECK > 0 or NULL |
| currency | text | 'KES' | — |
| requested_at | timestamptz | — | — |
| provider_viewed_at | timestamptz | — | — |
| provider_responded_at | timestamptz | — | — |
| scheduled_start | timestamptz | — | — |
| scheduled_end | timestamptz | — | CHECK > scheduled_start |
| actual_start | timestamptz | — | — |
| actual_end | timestamptz | — | CHECK > actual_start |
| completed_at | timestamptz | — | — |
| payment_status | text | 'pending' | — |
| payment_method | text | — | — |
| payment_ref | text | — | — |
| customer_notes | text | — | — |
| provider_notes | text | — | — |
| cancellation_reason | text | — | — |
| metadata | jsonb | — | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |
| **reschedule_count** | integer | 0 | Added: `20260109120002` |
| **completion_percentage** | integer | — | CHECK 0–100 or NULL. Added: `20260109120002` |
| **followup_scheduled_at** | timestamptz | — | Added: `20260109120002` |
| **abandoned_at** | timestamptz | — | Added: `20260109120002` |
| **abandonment_reason** | text | — | Added: `20260109120002` |

---

### `booking_quotes`
**Created:** `20260108120003_booking_core.sql`  
**Columns added:** `20260301100000_m3_quote_revision_support.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| booking_id | uuid | — | NOT NULL, FK → bookings(id) ON DELETE CASCADE |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| quoted_price | decimal(10,2) | — | NOT NULL, CHECK > 0 |
| currency | text | 'KES' | — |
| breakdown | jsonb | — | — |
| description | text | — | — |
| validity_days | int | 7 | — |
| valid_until | timestamptz | — | — |
| status | text | 'sent' | 'sent', 'viewed', 'accepted', 'rejected', 'expired' |
| customer_response | text | — | — |
| sent_at | timestamptz | now() | — |
| viewed_at | timestamptz | — | — |
| responded_at | timestamptz | — | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |
| **revision_count** | integer | 0 | NOT NULL. Added: m3 |
| **superseded_at** | timestamptz | — | Added: m3 |

**Constraints:**
- UNIQUE(booking_id, provider_id)

---

### `booking_messages`
**Created:** `20260108120003_booking_core.sql`  
**Realtime:** Added in `20260303100000_m4_enable_messages_realtime.sql` (REPLICA IDENTITY FULL)

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| booking_id | uuid | — | NOT NULL, FK → bookings(id) ON DELETE CASCADE |
| sender_id | uuid | — | NOT NULL |
| sender_role | text | — | NOT NULL ('customer', 'provider', 'admin') |
| message | text | — | NOT NULL |
| is_read | boolean | false | — |
| read_at | timestamptz | — | — |
| created_at | timestamptz | now() | — |

---

### `booking_status_history`
**Created:** `20260108120003_booking_core.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| booking_id | uuid | — | NOT NULL, FK → bookings(id) ON DELETE CASCADE |
| from_status | booking_status | — | — |
| to_status | booking_status | — | NOT NULL |
| changed_by | uuid | — | NOT NULL |
| changed_by_role | text | — | NOT NULL ('customer', 'provider', 'admin') |
| reason | text | — | — |
| notes | text | — | — |
| created_at | timestamptz | now() | — |

---

### `reviews`
**Created:** `20260108120005_support_tables.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| booking_id | uuid | — | NOT NULL, UNIQUE, FK → bookings(id) ON DELETE CASCADE |
| reviewer_id | uuid | — | NOT NULL |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| service_id | uuid | — | NOT NULL, FK → services(id) ON DELETE RESTRICT |
| rating | review_rating | — | NOT NULL |
| title | text | — | — |
| review_text | text | — | — |
| quality_rating | review_rating | — | — |
| communication_rating | review_rating | — | — |
| timeliness_rating | review_rating | — | — |
| professionalism_rating | review_rating | — | — |
| value_rating | review_rating | — | — |
| review_photos | jsonb | — | — |
| provider_response | text | — | — |
| provider_responded_at | timestamptz | — | — |
| is_verified_booking | boolean | true | — |
| is_flagged | boolean | false | — |
| flag_reason | text | — | — |
| is_hidden | boolean | false | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

**Constraints:**
- UNIQUE(booking_id) (declared twice — once as column-level `UNIQUE`, once as named constraint `review_one_per_booking`)

---

### `review_helpful_votes` (requested as "review_votes")
**Created:** `20260108120005_support_tables.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| review_id | uuid | — | NOT NULL, FK → reviews(id) ON DELETE CASCADE |
| user_id | uuid | — | NOT NULL |
| is_helpful | boolean | — | NOT NULL |
| created_at | timestamptz | now() | — |

**Constraints:**
- UNIQUE(review_id, user_id)

---

### `notifications`
**Created:** `20260108120005_support_tables.sql` (DROP + recreated; replaces `20260105000002` version)

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | — | NOT NULL |
| user_role | text | — | NOT NULL ('customer', 'provider', 'admin') |
| type | text | — | NOT NULL |
| title | text | — | NOT NULL |
| message | text | — | NOT NULL |
| booking_id | uuid | — | — |
| provider_id | uuid | — | — |
| review_id | uuid | — | — |
| action_url | text | — | — |
| in_app | boolean | true | — |
| email | boolean | false | — |
| sms | boolean | false | — |
| is_read | boolean | false | — |
| read_at | timestamptz | — | — |
| email_sent | boolean | false | — |
| email_sent_at | timestamptz | — | — |
| sms_sent | boolean | false | — |
| sms_sent_at | timestamptz | — | — |
| created_at | timestamptz | now() | — |

**Constraints:**
- CHECK `notification_has_entity` — `booking_id IS NOT NULL OR provider_id IS NOT NULL OR review_id IS NOT NULL OR type IN ('system_announcement', 'account_update')`

> Note: This table has NO FK on `user_id` (unlike the dropped first version which had FK → profiles).

---

### `saved_providers`
**Created:** `20260108120005_support_tables.sql`  
**Modified:** `20260303000000_m0_critical_fixes.sql` (renamed `customer_id → user_id`, added FK → profiles)

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | — | NOT NULL, FK → profiles(id) ON DELETE CASCADE (was `customer_id`) |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| notes | text | — | — |
| created_at | timestamptz | now() | — |

**Constraints:**
- UNIQUE(user_id, provider_id)

---

### `user_preferences`
**Created:** `20260108120005_support_tables.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| user_id | uuid | — | PK |
| notify_booking_updates | boolean | true | — |
| notify_messages | boolean | true | — |
| notify_reviews | boolean | true | — |
| notify_promotions | boolean | false | — |
| email_notifications | boolean | true | — |
| sms_notifications | boolean | true | — |
| push_notifications | boolean | true | — |
| preferred_language | text | 'en' | — |
| show_profile_publicly | boolean | true | — |
| allow_reviews_publicly | boolean | true | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

> ⚠️ No FK on `user_id`. No RLS.

---

### `social_link_clicks`
**Created:** `20260302000002_social_link_clicks.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| platform | text | — | NOT NULL |
| destination_url | text | — | NOT NULL |
| referrer | text | — | — |
| user_agent | text | — | — |
| country | text | — | — |
| session_id | text | — | — |
| clicked_at | timestamptz | now() | NOT NULL |

---

### `provider_vehicles`
**Created:** `20260108120002_trust_provider_layer.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| registration_number | text | — | NOT NULL, UNIQUE |
| make | text | — | — |
| model | text | — | — |
| year | int | — | — |
| color | text | — | — |
| vehicle_type | text | — | 'sedan', 'suv', 'van', 'pickup', 'motorcycle' |
| insurance_policy_number | text | — | — |
| insurance_provider | text | — | — |
| insurance_expiry | date | — | — |
| inspection_certificate_url | text | — | — |
| inspection_expiry | date | — | — |
| vehicle_photos | jsonb | — | — |
| is_active | boolean | true | — |
| verified | boolean | false | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

**Constraints:**
- CHECK `insurance_logic` — if policy_number is set, expiry must also be set

---

### `provider_driver_licenses`
**Created:** `20260108120002_trust_provider_layer.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| license_number | text | — | NOT NULL, UNIQUE |
| license_type | text | — | 'private', 'commercial', 'psv' |
| issue_date | date | — | — |
| expiry_date | date | — | NOT NULL |
| license_photo_url | text | — | — |
| background_check_status | verification_status | 'not_started' | — |
| background_check_date | date | — | — |
| background_check_provider | text | — | — |
| police_clearance_certificate_url | text | — | — |
| is_active | boolean | true | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

**Constraints:**
- CHECK `license_not_expired` — `expiry_date > CURRENT_DATE`

---

### `provider_portfolio`
**Created:** `20260108120005_support_tables.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| provider_id | uuid | — | NOT NULL, FK → service_providers(id) ON DELETE CASCADE |
| service_id | uuid | — | FK → services(id) ON DELETE SET NULL |
| title | text | — | NOT NULL |
| description | text | — | — |
| photos | jsonb | — | NOT NULL |
| project_date | date | — | — |
| location | text | — | — |
| is_featured | boolean | false | — |
| display_order | int | — | — |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

---

### `booking_disputes`
**Created:** `20260108120003_booking_core.sql`  
**Modified:** `20260306000000_sc5_dispute_enhancements.sql`

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| booking_id | uuid | — | NOT NULL, FK → bookings(id) ON DELETE CASCADE |
| reported_by | uuid | — | NOT NULL |
| reported_by_role | text | — | NOT NULL ('customer', 'provider') |
| dispute_type | text | — | NOT NULL ('quality', 'pricing', 'cancellation', 'safety', 'damage', 'no_show') |
| severity | dispute_severity | 'medium' | — |
| description | text | — | NOT NULL |
| evidence_urls | jsonb | — | — |
| status | text | 'open' | 'open', 'investigating', 'resolved', 'closed' |
| resolution | text | — | — |
| resolved_by | uuid | — | — |
| resolved_at | timestamptz | — | — |
| refund_amount | decimal(10,2) | — | — |
| refund_status | text | — | 'pending', 'approved', 'rejected', 'processed' |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |
| **desired_resolution** | text | — | Added: `sc5_dispute_enhancements` |

---

### `provider_service_photos`
**❌ TABLE DOES NOT EXIST** — Not defined in any migration file.

---

## Section 4: Relevant DB Functions & Triggers

### Functions using `auth.uid()` directly

| Function | File | Purpose |
|---|---|---|
| `mark_notification_read(uuid)` | `20260105000002` | `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = auth.uid()` |
| `mark_all_notifications_read()` | `20260105000002` | `UPDATE notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL` |

### Key functions operating on target tables

| Function | File | Tables Affected | Notes |
|---|---|---|---|
| `update_updated_at()` | `20260108120000` | All tables with `updated_at` | Generic trigger function |
| `update_updated_at_column()` | `20251231000002`, `20260305000000` | Same — duplicate definition | |
| `validate_booking_status_transition()` | `20260301100000` (latest) | `bookings` | BEFORE UPDATE trigger — enforces state machine transitions |
| `auto_log_booking_status_change()` | `20260301100000` (latest) | `bookings` → `booking_status_history` | AFTER UPDATE trigger — auto-inserts audit row. Uses `current_setting('app.current_user_id')` and `current_setting('app.current_user_role')` |
| `auto_confirm_completed_bookings()` | `20260304000000` | `bookings`, `notifications` | SECURITY DEFINER. Cron job: auto-confirms bookings after 72h. Sets `app.current_user_id = 'system'` |
| `validate_booking_state_fields()` | Multiple migrations (latest in `20260109120020`) | `bookings` | State-dependent field constraints |
| `auto_set_booking_timestamps()` | `20260109120004` | `bookings` | Auto-sets `requested_at`, `completed_at`, etc. based on status |
| `track_reschedule_count()` | `20260109120004` | `bookings` | Increments reschedule_count on schedule changes |
| `validate_emergency_service_capability()` | `20260109120000` | `provider_services`, `service_types` | Validates emergency booking eligibility |
| `check_provider_capacity_with_units()` | `20260109120032` | `bookings`, `service_providers` | Capacity enforcement |
| `create_booking_with_capacity_check()` | `20260109120032` | `bookings` | Serializable booking creation |
| `enforce_provider_capacity_v2()` | `20260109120031` | `bookings`, `service_providers` | Trigger: capacity enforcement on booking insert |
| `check_provider_availability_interval()` | `20260109120032` | `provider_availability_intervals` | Checks if time slot is covered by available intervals |
| `reject_provider_availability_writes()` | `20260109130001` | `provider_availability` | Blocks writes to deprecated table |
| `prevent_service_type_change()` | `20260109120010` | `bookings` | Immutability enforcement |
| `protect_pricing_after_confirmation()` | `20260109120007` | `bookings` | Price immutability after confirmation |
| `snapshot_quote_on_send()` | `20260109120007` | `booking_quotes`, `bookings` | Snapshots quote price |
| `auto_assign_dispute_severity()` | `20260108120006` | `booking_disputes` | Trigger: auto-assigns severity |
| `credit_provider_wallet(uuid, decimal)` | `20260305000000` | `service_providers` | SECURITY DEFINER. Adds to wallet_balance |
| `debit_provider_wallet(uuid, decimal)` | `20260305000000` | `service_providers` | SECURITY DEFINER. Row-locked debit |
| `fn_update_provider_min_price()` | `20260307000000` | `service_providers`, `provider_services` | Trigger on provider_services: recomputes min_price |
| `enforce_commitment_immutability()` | `20260109140001` | `booking_commitments` | Prevents changes to confirmed commitments |
| `create_commitment_and_confirm_booking()` | `20260109140001` | `booking_commitments`, `bookings` | Transactional booking confirmation |
| `release_commitment()` | `20260109140001` | `booking_commitments`, `bookings` | Releases capacity on cancellation |
| `complete_commitment()` | `20260109140001` | `booking_commitments`, `bookings` | Marks commitment fulfilled |
| `notify_landlord_on_inquiry()` | `20260105000002` | `notifications` (inserts) | SECURITY DEFINER — trigger on inquiries |
| `notify_saved_users_on_status_change()` | `20260105000002` | `notifications` (inserts) | SECURITY DEFINER — trigger on listings |
| `get_unread_notification_count(uuid)` | `20260105000002` | `notifications` | Helper function |
| `get_user_roles(uuid)` | `20251231000002` | `user_roles` | SECURITY DEFINER |
| `user_has_role(uuid, text)` | `20251231000002` | `user_roles` | SECURITY DEFINER |

### Triggers on target tables

| Table | Trigger Name | Function | Event |
|---|---|---|---|
| `service_providers` | `update_service_providers_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `provider_services` | `update_provider_services_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `provider_services` | `trg_update_provider_min_price` | `fn_update_provider_min_price()` | AFTER INSERT/UPDATE/DELETE |
| `provider_availability` | `update_provider_availability_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `provider_verification_documents` | `update_provider_verification_documents_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `provider_vehicles` | `update_provider_vehicles_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `provider_driver_licenses` | `update_provider_driver_licenses_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `bookings` | `update_bookings_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `bookings` | (status transition) | `validate_booking_status_transition()` | BEFORE UPDATE |
| `bookings` | (status audit log) | `auto_log_booking_status_change()` | AFTER UPDATE |
| `bookings` | (state field validation) | `validate_booking_state_fields()` | BEFORE INSERT/UPDATE |
| `bookings` | (timestamp auto-set) | `auto_set_booking_timestamps()` | BEFORE UPDATE |
| `bookings` | (reschedule tracking) | `track_reschedule_count()` | BEFORE UPDATE |
| `bookings` | (capacity enforcement) | `enforce_provider_capacity_v2()` | BEFORE INSERT |
| `bookings` | (service type immutability) | `prevent_service_type_change()` | BEFORE UPDATE |
| `bookings` | (pricing immutability) | `protect_pricing_after_confirmation()` | BEFORE UPDATE |
| `booking_quotes` | `update_booking_quotes_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `booking_disputes` | `update_booking_disputes_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `booking_disputes` | (auto severity) | `auto_assign_dispute_severity()` | BEFORE INSERT |
| `booking_payments` | `set_booking_payments_updated_at` | `update_updated_at_column()` | BEFORE UPDATE |
| `provider_payouts` | `set_provider_payouts_updated_at` | `update_updated_at_column()` | BEFORE UPDATE |
| `reviews` | `update_reviews_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `provider_portfolio` | `update_provider_portfolio_updated_at` | `update_updated_at()` | BEFORE UPDATE |
| `user_preferences` | `update_user_preferences_updated_at` | `update_updated_at()` | BEFORE UPDATE |

---

## Summary of Critical Findings

### 🔴 HIGH PRIORITY — Missing RLS

| Table | Risk | Recommended Fix |
|---|---|---|
| `booking_status_history` | Any user can read full audit trail of all bookings | ENABLE RLS + SELECT policies for booking participants |
| `booking_disputes` | Dispute details, evidence URLs, refund info exposed | ENABLE RLS + policies for reporter + provider + admin |
| `user_preferences` | Any user can read/write other users' preferences | ENABLE RLS + `user_id = auth.uid()` policies |
| `provider_driver_licenses` | License numbers, police clearance URLs — **PII** | ENABLE RLS + provider-own read + admin manage |
| `provider_vehicles` | Vehicle registrations exposed | ENABLE RLS + provider-own manage |
| `booking_media` | Photos from all bookings exposed | ENABLE RLS + participant-only read |
| `locations` | User saved locations / addresses exposed | ENABLE RLS + owner-only |

### 🟡 MEDIUM PRIORITY — Overly Permissive Policies

| Table | Policy | Issue |
|---|---|---|
| `provider_documents` | "Service role can manage documents" | `FOR ALL USING(true) WITH CHECK(true)` — applies to **all roles**, not just service_role |
| `booking_payments` | `booking_payments_service_insert/update` | Same issue — `WITH CHECK(true)` / `USING(true)` open to all roles |
| `provider_payouts` | `payouts_service_insert/update` | Same issue |
| `notifications` | Missing INSERT policy | After table was dropped/recreated, `"System can insert notifications"` was lost |

### 🟡 No `FORCE ROW LEVEL SECURITY`

No table uses `FORCE ROW LEVEL SECURITY`. The `postgres` super-user role and any table owner bypass RLS entirely. This is standard for development but should be reviewed for production.

### ❌ Missing Table

`provider_service_photos` — referenced in the audit request but does not exist in any migration.
