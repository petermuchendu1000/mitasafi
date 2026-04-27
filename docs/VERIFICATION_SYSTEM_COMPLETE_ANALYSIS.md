# MITASAFI VERIFICATION SYSTEM — COMPLETE ANALYSIS

> **Date:** 2026-03-05  
> **Scope:** Every verification type, table, flow, display point, gap, and recommendation  
> **Method:** Full database schema + migration audit, every TypeScript file touching verification, every UI surface

---

## TABLE OF CONTENTS

1. [Verification Types Inventory](#1-verification-types-inventory)
2. [Database Architecture Map](#2-database-architecture-map)
3. [Verification Flow: When, Where, How](#3-verification-flow-when-where-how)
4. [Display Surface Audit: What Customers See](#4-display-surface-audit-what-customers-see)
5. [State Machine Analysis](#5-state-machine-analysis)
6. [Critical Gaps & Inconsistencies](#6-critical-gaps--inconsistencies)
7. [Structural Verdict: Is the Process Right?](#7-structural-verdict-is-the-process-right)
8. [Recommendations](#8-recommendations)

---

## 1. VERIFICATION TYPES INVENTORY

There are **7 distinct verification domains** in the system:

### 1.1 PHONE VERIFICATION (OTP-based)

| Attribute | Value |
|-----------|-------|
| **What** | Provider's phone number is real and reachable |
| **How** | 6-digit OTP via SMS (Africa's Talking in prod, console in dev) |
| **When** | Step 1 of `/dashboard/verify-provider` wizard |
| **Storage** | `phone_verifications` table (code, expires_at, attempts, status, verified_at) |
| **Result** | `profiles.verification_level` → `'phone'`, phone saved to `profiles.phone` + `service_providers.phone` |
| **Rate Limit** | Max 3 sends per 15 minutes, max 3 incorrect attempts per OTP, 5-minute expiry |
| **Bypass** | If user signed up with phone OTP (Supabase `phone_confirmed_at` exists), auto-promoted to `phone` level without re-verification |

**Key detail:** The `phone_verifications` table has **NO migration file** — it exists in the live DB but was likely created via Supabase dashboard. This is a deployment risk.

### 1.2 PROVIDER TYPE DECLARATION (Not verification — classification)

| Attribute | Value |
|-----------|-------|
| **What** | Provider self-declares as Individual or Company |
| **How** | UI card selection |
| **When** | Step 2 of verify-provider wizard (also available at onboarding `/onboarding/provider-type`) |
| **Storage** | `service_providers.business_type` = `'individual'` \| `'company'` |
| **Result** | Determines which documents are required in Step 3 |
| **Truthful?** | **NO.** Unvalidated self-declaration. A sole proprietor can claim "company" and vice versa. No enforcement. |

### 1.3 IDENTITY DOCUMENT VERIFICATION (Admin-reviewed)

| Attribute | Value |
|-----------|-------|
| **What** | Government-issued ID + selfie match (individual) OR business registration + KRA cert (company) |
| **How** | File upload to Supabase Storage `provider-documents` bucket → inserted into `provider_documents` table → admin reviews in queue |
| **When** | Step 3 of verify-provider wizard |
| **Document Types** | |

| Provider Type | Required Documents |
|---|---|
| **Individual** | `national_id` + `selfie_with_id` |
| **Company** | `business_registration` + `kra_certificate` |
| **Either (optional)** | `professional_license` |

| Attribute | Value |
|-----------|-------|
| **Storage** | `provider_documents` table: `document_type`, `document_url`, `status` ('pending'/'approved'/'rejected'), `rejection_reason`, `reviewed_at`, `reviewed_by` |
| **Result on submit** | `profiles.verification_level` → `'id'`, `service_providers.account_status` → `'pending_verification'`, `is_active` → `false` |
| **Result on admin approve** | `profiles.verification_level` → `'full'`, `profiles.is_verified` → `true`, `service_providers.is_verified` → `true`, `is_active` → `true`, `account_status` → `'active'` |
| **Result on admin reject** | `service_providers.account_status` → `'rejected'`, `profiles.verification_level` → `'id'`, `is_verified` → `false` |
| **Re-submission** | Provider sees `RejectedVerificationView`, can re-upload → rejected docs reset to `'pending'` |

### 1.4 SERVICE-SCOPED VERIFICATION (Per-service credentials)

| Attribute | Value |
|-----------|-------|
| **What** | Individual service-level verification — e.g., electrician license for electrical work |
| **Schema** | `provider_services` table: `verification_status` (enum), `verified_at`, `verified_by`, `verification_notes`, `verification_expires_at` |
| **Enum values** | `not_started` → `pending` → `verified` \| `rejected` \| `expired` (also: `draft`, `under_review`, `revoked`, `resubmitted`) |
| **Requirements defined by** | `service_verification_requirements` table: `min_verification_level`, `background_check_required`, `certification_required`, `certification_description`, `min_experience_years`, `reference_count_required`, `insurance_required` |
| **Certification tracking** | `provider_services.has_certification`, `.certification_type`, `.certification_ref`, `.certification_expiry_date`, `.certification_document_url` |
| **Status** | **DESIGNED BUT NOT IMPLEMENTED.** No UI flow exists to submit per-service verification. No admin flow to review per-service docs. The `provider_services.verification_status` starts at `not_started` and there is no code path to change it. |

### 1.5 DOCUMENT VERIFICATION (Legacy table)

| Attribute | Value |
|-----------|-------|
| **Table** | `provider_verification_documents` (from trust_provider_layer migration) |
| **Status** | **SUPERSEDED** by `provider_documents` table (created in 20260227 migration) |
| **Fields** | `document_type` (free text: 'id_card', 'business_license', 'certification', 'insurance'), `document_url`, `document_name`, `status` (verification_status enum), `reviewed_at`, `reviewed_by`, `review_notes`, `expires_at` |
| **Used by** | Legacy `ProviderVerification` type in `service-providers.ts` (marked `@deprecated`) |
| **Active code paths** | **NONE directly.** All live verification uses `provider_documents`. But the table still exists and has RLS policies applied (M0 and RLS hardening migrations). |

### 1.6 VEHICLE & DRIVER VERIFICATION (Transport-specific)

| Attribute | Value |
|-----------|-------|
| **Tables** | `provider_vehicles` + `provider_driver_licenses` |
| **Vehicle fields** | `registration_number`, `insurance_policy_number`, `insurance_provider`, `insurance_expiry`, `inspection_certificate_url`, `inspection_expiry`, `verified` (boolean) |
| **Driver fields** | `license_number`, `license_type` ('private'/'commercial'/'psv'), `issue_date`, `expiry_date`, `license_photo_url`, `background_check_status` (verification_status enum), `background_check_date`, `background_check_provider`, `police_clearance_certificate_url` |
| **Constraint** | `license_not_expired CHECK (expiry_date > CURRENT_DATE)` — **WARNING:** This is a row-level constraint that will BLOCK reads/inserts if a license expires. Needs a cron job or the constraint will cause production failures. |
| **Status** | **SCHEMA ONLY.** No UI, no API, no upload flow. Tables exist but are ghost schema. |

### 1.7 VERIFICATION BADGE / TRUST TIER (Computed reputation)

| Attribute | Value |
|-----------|-------|
| **Field** | `service_providers.verification_badge` |
| **Values documented** | `'bronze'`, `'silver'`, `'gold'`, `'premium'`, `'enterprise'` |
| **Comment says** | "Trust tier based on completed jobs and ratings" |
| **How computed** | **NOT COMPUTED ANYWHERE.** No trigger, no cron job, no function. This is a manual/seeded field with no automated promotion logic. |
| **UI display** | ProviderCard shows "⭐ Top Pro" (enterprise), "✦ Pro" (premium). ServicePreviewClient shows "{tier} seller". |
| **Featured providers** | Query filters: `.in("verification_badge", ["enterprise", "premium"])` — so only manually badged providers appear in "featured" sections. |
| **Sort ranking** | Verified badge holders sort before non-badged providers. |

### 1.8 EMAIL VERIFICATION

| Attribute | Value |
|-----------|-------|
| **What** | Email confirmation for search alerts, NOT for provider identity |
| **How** | `sendVerificationEmail()` sends link with token: `/api/verify?token={token}&type={type}` |
| **Storage** | `saved_searches.verification_token`, `saved_searches.verified_at` |
| **Scope** | Customer search alerts only. Email is **never required** for provider onboarding. |
| **Provider email** | Stored in `profiles.email` and `service_providers.email` but **never verified** as part of provider verification. |

### 1.9 LISTING VERIFICATION (Property context)

| Attribute | Value |
|-----------|-------|
| **What** | Property listings verified by admin |
| **Fields** | `listings.is_verified`, `listings.verified_at`, `listings.verified_by` |
| **Scope** | Property management module, NOT service provider verification |

### 1.10 BOOKING/REVIEW VERIFICATION

| Attribute | Value |
|-----------|-------|
| **What** | Whether a review came from a real completed booking |
| **Field** | `reviews.is_verified_booking` (boolean) |
| **Scope** | Trust signal for review authenticity |

### 1.11 SHOPPING RECEIPT/ITEM VERIFICATION

| Attribute | Value |
|-----------|-------|
| **Fields** | `shopping_receipts.verified`, `shopping_receipts.verification_notes`, `shopping_list_items.verified_by_customer` |
| **Scope** | Materials pass-through verification in delivery/shopping flows |

---

## 2. DATABASE ARCHITECTURE MAP

### Tables with active verification role:

```
┌─────────────────────────┐     ┌──────────────────────────┐
│      profiles            │     │  phone_verifications     │
│ ─────────────────────── │     │ ────────────────────────  │
│ is_verified (bool)       │◄────│ code, expires_at         │
│ verification_level       │     │ attempts, status          │
│ (none/phone/id/full)     │     │ verified_at, user_id     │
└───────────┬─────────────┘     └──────────────────────────┘
            │ 1:1 (via user_id)
            ▼
┌─────────────────────────┐     ┌──────────────────────────┐
│  service_providers       │     │  provider_documents      │
│ ─────────────────────── │◄────│ ────────────────────────  │
│ is_verified (bool)       │ 1:N │ document_type             │
│ verification_badge       │     │ document_url, status      │
│ account_status           │     │ rejection_reason          │
│ (active/pending_verif/   │     │ reviewed_at, reviewed_by  │
│  rejected/suspended)     │     └──────────────────────────┘
└───────────┬─────────────┘
            │ 1:N
            ▼
┌─────────────────────────┐     ┌──────────────────────────────┐
│  provider_services       │     │service_verification_requirements│
│ ─────────────────────── │     │ ──────────────────────────── │
│ verification_status      │     │ min_verification_level        │
│ verified_at, verified_by │     │ background_check_required     │
│ verification_notes       │     │ certification_required        │
│ verification_expires_at  │     │ certification_description     │
│ has_certification*       │     │ min_experience_years          │
│ certification_type*      │     │ insurance_required            │
│ certification_ref*       │     └──────────────────────────────┘
│ certification_expiry*    │
│ certification_doc_url*   │
└─────────────────────────┘

* = Fields that exist but have no write path in the application

GHOST TABLES (schema exists, no application code):
┌──────────────────────────────────────┐
│ provider_verification_documents       │ ← Superseded by provider_documents
│ provider_vehicles                     │ ← No UI/API 
│ provider_driver_licenses              │ ← No UI/API
└──────────────────────────────────────┘
```

### Enum Map:

| Enum | Values | Used By |
|------|--------|---------|
| `verification_level` | basic, standard, certified, background_checked | `service_verification_requirements.min_verification_level` |
| `verification_status` | not_started, pending, verified, rejected, expired (DB enum) / also draft, under_review, revoked, resubmitted (in generated types) | `provider_services.verification_status`, `provider_verification_documents.status`, `provider_driver_licenses.background_check_status` |

**CRITICAL MISMATCH:** The `verification_level` enum (`basic`/`standard`/`certified`/`background_checked`) is a **different concept** from `profiles.verification_level` (`none`/`phone`/`id`/`full`). Same word, different domains, different meanings. The DB enum is about service trust requirements. The profile field is about onboarding progress.

---

## 3. VERIFICATION FLOW: WHEN, WHERE, HOW

### 3.1 Provider Onboarding Journey (Current Implementation)

```
USER SIGNS UP
    │
    ├── Phone OTP signup → auth.users.phone_confirmed_at set ─┐
    │                                                          │
    └── Google OAuth signup → no phone verified ───────────────┤
                                                               │
                                                               ▼
                                              ONBOARDING: /onboarding/provider-type
                                                    │
                                                    ├── Choose "Individual" or "Company"
                                                    │   → service_providers.business_type set
                                                    │
                                                    ▼
                                              REDIRECT TO: /dashboard/provider
                                                    │
                                                    ├── Dashboard shows VERIFICATION BANNER
                                                    │   ☐ Phone verified
                                                    │   ☐ Profile complete
                                                    │   ☐ Identity verified  
                                                    │   → "Complete verification" CTA
                                                    │
                                                    ▼
                                              /dashboard/verify-provider (3-step wizard)
                                                    │
                                    ┌───────────────┼───────────────┐
                                    │               │               │
                                    ▼               ▼               ▼
                               STEP 1:         STEP 2:         STEP 3:
                               Phone OTP       Type Select     ID Upload
                                    │               │               │
                                    │  [auto-skip   │               │
                                    │  if phone     │               │
                                    │  already      │               │
                                    │  confirmed]   │               │
                                    │               │               │
                                    ▼               ▼               ▼
                          profiles.verif_     sp.business_   Upload docs →
                          level='phone'      type set        provider_documents
                                                             │
                                                             ▼
                                                    sp.account_status =
                                                    'pending_verification'
                                                    sp.is_active = false
                                                    profiles.verif_level = 'id'
                                                             │
                                                             ▼
                                                    ADMIN QUEUE (/admin/verifications)
                                                             │
                                                    ┌────────┼────────┐
                                                    ▼                 ▼
                                              APPROVE            REJECT
                                                    │                 │
                                              sp.is_verified=true     sp.account_status=
                                              sp.is_active=true       'rejected'
                                              sp.account_status=      profiles.verif_level=
                                              'active'                'id'
                                              profiles.verif_level=   is_verified=false
                                              'full'                  │
                                              profiles.is_verified=   ▼
                                              true                RejectedVerificationView
                                                    │             (can re-upload)
                                                    ▼
                                              PROVIDER IS LIVE
                                              Services visible
                                              Can go live
                                              Badge icon shown
```

### 3.2 Service-Scoped Verification (DESIGNED BUT NOT BUILT)

The schema supports per-service verification with requirements defined per service:

```
services ─── service_verification_requirements
                    │
                    ├── min_verification_level: basic/standard/certified/background_checked
                    ├── background_check_required: boolean
                    ├── certification_required: boolean  
                    ├── certification_description: "Electrician License"
                    ├── min_experience_years: integer
                    ├── reference_count_required: integer
                    └── insurance_required: boolean

provider_services (junction)
    │
    ├── verification_status: not_started → pending → verified/rejected/expired
    ├── verified_at, verified_by
    ├── has_certification, certification_type, certification_ref
    ├── certification_expiry_date
    └── certification_document_url
```

**NO CODE PATH EXISTS** to:
- Submit per-service certification documents
- Review per-service verification in admin queue
- Enforce `service_verification_requirements` when a provider adds a service
- Expire a `provider_services.verification_status` when `certification_expiry_date` passes

### 3.3 Vehicle/Driver Verification (SCHEMA ONLY)

Tables exist for taxi/transport providers but zero application code touches them.

---

## 4. DISPLAY SURFACE AUDIT: What Customers See

### 4.1 Provider Card (`ProviderCard.tsx`)

| Signal | Condition | Display |
|--------|-----------|---------|
| Verified badge | `is_verified === true` | "ID verified" text + check icon |
| Tier: Top Pro | `verification_badge === 'enterprise'` | "⭐ Top Pro" badge |
| Tier: Pro | `verification_badge === 'premium'` | "✦ Pro" badge |

### 4.2 Provider Profile Page (`/services/provider/[id]/page.tsx`)

| Signal | Condition | Display |
|--------|-----------|---------|
| Verified checkmark | `is_verified === true` | `BadgeCheck` icon next to name |
| "Identity verified" | `isIdentityVerified` — derived from `provider_services.verification_status === 'verified'` AND service has `min_verification_level` set | Green shield + text |
| "Background checked" | `isBackgroundChecked` — `verifiedServiceLevels.has('background_checked')` | Green shield + text |
| "Registered business" | `!!registration_number` | Green shield + text |
| "KRA registered" | `!!tax_id` | Green shield + text |

**CRITICAL PROBLEM:** `isIdentityVerified` on the provider profile page derives from **per-service verification data** (`provider_services.verification_status === 'verified'`), but NO CODE EVER SETS `provider_services.verification_status` to `'verified'`. The admin approval flow only sets `service_providers.is_verified = true`. This means the **"Identity verified" trust badge is NEVER displayed on the provider profile page** even after full admin approval.

### 4.3 Compare Providers Drawer (`CompareProviders.tsx`)

| Signal | Condition | Display |
|--------|-----------|---------|
| "Verified" / "Not Verified" | `is_verified` field | Row in comparison table with checkmark/X |

### 4.4 Search Suggestions (`/api/services/search/suggestions`)

| Signal | Condition | Display |
|--------|-----------|---------|
| "Verified" label | `is_verified === true` | "★ {rating} · Verified" in autocomplete |

### 4.5 Provider Dashboard

| Signal | Condition | Display |
|--------|-----------|---------|
| Verified badge in sidebar | `is_verified === true` | `BadgeCheck` icon + "Verified Provider" text |
| Verification banner | `verificationLevel !== 'full'` | Checklist with Phone/Profile/Identity checkboxes |
| Services "draft mode" banner | `!isFullyVerified` | "Complete verification to make services visible" |
| "Go Live" toggle blocked | `!isFullyVerified` | Toggle disabled until verification complete |

### 4.6 Featured Providers

| Signal | Condition | Display |
|--------|-----------|---------|
| Featured section inclusion | `verification_badge IN ('enterprise', 'premium')` | Provider appears in featured carousel |
| Sort priority | `verification_badge DESC` ordering | Badged providers rank higher universally |

### 4.7 Browse Page Filters

| Signal | Condition | Display |
|--------|-----------|---------|
| "Verified only" filter | `useServicesSearch.verified` toggle → URL `?verified=true` | Filters to `is_verified === true` |

---

## 5. STATE MACHINE ANALYSIS

### 5.1 `profiles.verification_level` State Transitions

```
'none' ──[phone OTP verified]──► 'phone' ──[docs submitted]──► 'id' ──[admin approves]──► 'full'
                                                                  │
                                                                  ◄──[admin rejects]──── 'full'→'id'
```

**Problems:**
1. **No backward path from 'phone' to 'none'** — if phone number changes, level stays at 'phone'
2. **'id' is set BEFORE admin reviews** — so the system says "identity level" before identity is actually verified
3. **There is no 'pending' state** — `'id'` conflates "documents submitted" with "awaiting review"

### 5.2 `service_providers.account_status` State Transitions

```
DEFAULT('active') ──[phone verified]──► 'pending' ──[docs submitted]──► 'pending_verification'
                                                                              │
                                                              ┌───────────────┼───────────────┐
                                                              ▼                               ▼
                                                         'active'                        'rejected'
                                                    [admin approves]                  [admin rejects]
                                                                                          │
                                                                                          ▼
                                                                                  [re-submit docs]
                                                                                          │
                                                                                          ▼
                                                                               'pending_verification'
```

**Problems:**
1. **Default is 'active'** — a brand-new provider who has never verified anything starts as "active". This means brand-new unverified providers are technically "active" in the database.
2. **'pending' after phone verification** — ambiguous. Is this the same as 'pending_verification'? No. Different states for different meanings, easily confused.
3. **No 'suspended'/'deactivated' transitions documented** — account_status supports these (per column comment) but no code paths exist.

### 5.3 `profiles.is_verified` vs `service_providers.is_verified`

| Field | Set to TRUE when | Set to FALSE when | Meaning |
|-------|-----------------|-------------------|---------|
| `profiles.is_verified` | Admin approves verification | Admin rejects | User-level: "this person is who they say" |
| `service_providers.is_verified` | Admin approves verification | Admin rejects, or on doc submission | Provider-level: "this provider profile is verified" |

**REDUNDANCY:** These two fields always move in lockstep. There is no scenario where one is true and the other false. Yet both exist, must be kept in sync manually, and can drift.

### 5.4 `user_roles.is_verified`

- Exists in schema
- **Never written to** by any verification flow
- Always stays at default `false`
- Dead field

---

## 6. CRITICAL GAPS & INCONSISTENCIES

### GAP 1: `phone_verifications` TABLE HAS NO MIGRATION ⛔

The table exists in the live DB but no migration creates it. `SUPABASE_SCHEMA_AUDIT.md` flagged this. The verify-provider flow makes 6+ queries against it. Any fresh deployment will break.

**Severity:** BLOCKER for dev/staging environments  
**Fix:** Create migration `20260312000000_phone_verifications_table.sql`

### GAP 2: Provider Profile Page Trust Badges Are Dead ⛔

The provider profile page (`/services/provider/[id]/page.tsx`) derives `isIdentityVerified` from `provider_services.verification_status === 'verified'`. But the admin approval flow (`approveVerification()`) only sets `service_providers.is_verified = true` — it never touches `provider_services.verification_status`. So the "Identity verified" badge is **never shown** on the public profile.

**Severity:** CRITICAL — trust signals broken for all verified providers  
**Fix:** Either (a) derive `isIdentityVerified` from `service_providers.is_verified` instead of per-service data, or (b) have admin approval cascade to `provider_services.verification_status`

### GAP 3: Two Document Tables, Confusion ⚠️

| Table | Created | Used by live code | Status |
|-------|---------|-------------------|--------|
| `provider_verification_documents` | 20260108 (trust_provider_layer) | Type alias only (`ProviderVerification` deprecated) | DEAD but has RLS policies applied |
| `provider_documents` | 20260227 | All live flows (upload, admin review) | ACTIVE |

Two tables for the same purpose. The live app uses `provider_documents`. The OG trust layer created `provider_verification_documents`. Both have RLS policies maintained. Only one is real.

**Severity:** MEDIUM — confusion risk, wasted RLS maintenance  
**Fix:** Drop `provider_verification_documents` or redirect all references to `provider_documents`

### GAP 4: `verification_badge` Never Computed ⚠️

The column exists, UI reads it, featured sections filter by it, sort ordering uses it. But no trigger, function, or cron job computes it. It is entirely manual or seed-data only.

**Severity:** HIGH — trust tier system exists in display but has no automated backend  
**Fix:** Create trigger or scheduled function: badge = f(total_jobs_completed, average_rating, years_active, is_verified)

### GAP 5: Per-Service Verification Is Ghost Infrastructure ⚠️

`provider_services.verification_status`, `service_verification_requirements`, certification fields — all exist in schema. **Zero application code** writes to them. No UI to submit service-specific credentials. No admin flow for per-service review.

**Severity:** HIGH — entire trust differentiation layer is non-functional  
**Impact:** All services are treated equally regardless of whether they're "basic" or "background_checked"

### GAP 6: `user_roles.is_verified` Is Dead ℹ️

Never written to. Always `false`. Exists in base schema.

**Severity:** LOW  
**Fix:** Remove or connect to verification flow on approval

### GAP 7: `profiles.verification_level` Semantic Mismatch ⚠️

The `verification_level` enum in the DB (`basic`/`standard`/`certified`/`background_checked`) is for service trust requirements. The `profiles.verification_level` field uses a completely different scale (`none`/`phone`/`id`/`full`). Same column name, different type definitions, different meanings.

In TypeScript, there are **THREE different `VerificationLevel` types**:
1. `src/types/service-providers.ts`: `'none' | 'phone' | 'identity' | 'full'` (note: 'identity' not 'id')
2. `src/types/db-helpers.ts`: `'none' | 'phone' | 'id' | 'full'`  
3. `src/types/property-management.ts`: `'basic' | 'phone_verified' | 'id_verified' | 'employment_verified' | 'reference_checked' | 'credit_checked'`

**Severity:** HIGH — three incompatible types with the same name across the codebase  
**Fix:** Rename profile field to `onboarding_level` or use a unified enum

### GAP 8: Email Is Never Verified for Providers ℹ️

`service_providers.email` is stored but never verified. `profiles.email` comes from auth but verification flow is only for search alerts. A provider could have a fake email.

**Severity:** LOW (phone is the primary channel in Kenya)  
**Fix:** Consider email OTP if email-based notifications expand

### GAP 9: No Expiry Handling for Documents/Certifications ⚠️

- `provider_documents` has no `expires_at` field in the migration (though the TS interface declares one)
- `provider_services.certification_expiry_date` exists but no cron checks it
- `provider_services.verification_expires_at` exists but nothing expirs it
- `provider_driver_licenses` has `CHECK (expiry_date > CURRENT_DATE)` which is a **time bomb** — it will block operations on expired rows

**Severity:** HIGH — no expiry management means "verified" stays forever  
**Fix:** Create cron job to expire certifications, remove CHECK constraint on driver_licenses, add `expires_at` to `provider_documents` migration

### GAP 10: Onboarding "Skip" Escape Hatch ⚠️

The verify-provider page shows "I'll do this later" link that goes to `/dashboard/provider`. This allows providers to use the dashboard without ANY verification.

**Impact on services:** `ServicesGrid.tsx` blocks "Go Live" toggle if not verified. So services stay in draft. But the provider CAN add services, configure them, just not publish.

**Assessment:** This is intentional and acceptable — it's a soft gate, not a hard block.

### GAP 11: What About Customers? ℹ️

There is **NO customer verification flow**. Customers can:
- Sign up with phone OTP (their phone is verified via Supabase auth)
- Book services without any identity verification
- Leave reviews without verification (though `is_verified_booking` tracks if they had a real booking)

The system trusts customers implicitly and verifies providers. This is correct for a marketplace model.

---

## 7. STRUCTURAL VERDICT: Is the Process Right?

### WHAT THE SYSTEM GETS RIGHT ✅

1. **Phone-first verification** — correct for Kenya where phone is the primary identity channel
2. **Step-by-step wizard** — progressive disclosure, not overwhelming
3. **Auto-skip for phone signup** — if Supabase already confirmed the phone, no redundant OTP
4. **Admin queue** — human review for identity docs is correct; automated ID verification can come later
5. **Rejection with re-upload** — providers aren't permanently blocked
6. **Soft gate** — "I'll do this later" allows exploration without blocking the entire experience
7. **Verified filter for customers** — search/browse can filter to verified-only
8. **is_active gating** — unverified providers are `is_active = false`, so they don't appear in search

### WHAT THE SYSTEM GETS WRONG ❌

1. **Trust badges on profile page reference non-functional per-service data** — the most important trust display is broken
2. **No automated badge computation** — trust tiers are manual, which means zero providers earn badges organically
3. **Verification level naming is a semantic disaster** — three different type definitions, two different domain meanings
4. **Two document tables** — confusion and maintenance overhead
5. **Per-service verification is fully designed but zero-implemented** — entire schema layer is dead weight
6. **No document expiry** — once verified, always verified (dangerous for licensed trades)
7. **Provider type is unvalidated** — claiming "company" without actual business registration proof at signup

### WHAT MATTERS MOST (Priority Stack)

| Priority | Issue | Why It Matters |
|----------|-------|----------------|
| **P0** | Profile page trust badges broken | Verified providers get NO visual credit on their public page |
| **P0** | `phone_verifications` no migration | Fresh deploys break |
| **P1** | Badge computation missing | Featured providers, sort ranking, trust tiers — all inert |
| **P1** | Per-service verification gap | Electricians, plumbers, drivers all treated the same — no trust differentiation |
| **P2** | Document expiry not handled | Legal/safety risk for licensed services |
| **P2** | Three `VerificationLevel` types | Developer confusion, potential runtime bugs |
| **P3** | Legacy document table cleanup | Technical debt |
| **P3** | `user_roles.is_verified` dead | Minor debt |

---

## 8. RECOMMENDATIONS

### IMMEDIATE FIXES (Do Now)

#### Fix 1: Profile Page Trust Badge Derivation
```typescript
// CURRENT (BROKEN):
const isIdentityVerified = verifiedServiceLevels.has("basic") || ...;

// FIXED:
const isIdentityVerified = provider.is_verified === true;
```
This one-line change makes the "Identity verified" badge appear for all admin-approved providers.

#### Fix 2: Create `phone_verifications` Migration
Create `supabase/migrations/20260312000000_create_phone_verifications.sql`:
```sql
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'blocked')),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON phone_verifications(user_id, status);
CREATE INDEX ON phone_verifications(expires_at);
```

#### Fix 3: Unify VerificationLevel Types
One type, one file, one import:
```typescript
// src/types/verification.ts
export type ProfileVerificationLevel = 'none' | 'phone' | 'id' | 'full';
export type ServiceVerificationLevel = 'basic' | 'standard' | 'certified' | 'background_checked';
```
Remove all three existing definitions. Import from here.

### SHORT-TERM (Next Sprint)

#### Fix 4: Automated Badge Computation
Create a Supabase cron function or trigger that recalculates `verification_badge` based on:
```
bronze  = is_verified + 0-9 completed jobs
silver  = is_verified + 10-49 completed jobs + avg_rating >= 3.5
gold    = is_verified + 50-199 completed jobs + avg_rating >= 4.0
premium = is_verified + 200+ completed jobs + avg_rating >= 4.5
enterprise = manual promotion (partnership)
```

#### Fix 5: Drop Legacy Document Table
After confirming no data in `provider_verification_documents`:
```sql
DROP TABLE IF EXISTS provider_verification_documents;
```
Remove type aliases and RLS policies.

### MEDIUM-TERM (Next Milestone)

#### Fix 6: Per-Service Verification MVP
1. Add "Upload certification" UI in provider service settings
2. Update `provider_services.verification_status` on upload → `pending`
3. Add per-service review in admin queue
4. On approval → `verified`, cascade to `service_providers.is_verified` if any service passes

#### Fix 7: Document/Certification Expiry System
1. Add `expires_at` column to `provider_documents` migration
2. Create cron: check daily, set `provider_services.verification_status = 'expired'` where `certification_expiry_date < now()`
3. Notify provider 30 days before expiry
4. Remove `CHECK (expiry_date > CURRENT_DATE)` from `provider_driver_licenses` (replace with warning)

#### Fix 8: Connect `user_roles.is_verified`
On admin approval, also set:
```sql
UPDATE user_roles SET is_verified = true WHERE user_id = ? AND role = 'service_provider';
```

---

## APPENDIX: COMPLETE FILE REFERENCE

### Verification Flow
| File | Role |
|------|------|
| `src/app/dashboard/verify-provider/actions.ts` | All server actions (sendPhoneOTP, verifyPhoneOTP, setProviderType, uploadVerificationDocument, completeIdentityVerification) |
| `src/app/dashboard/verify-provider/page.tsx` | Multi-step wizard orchestration |
| `src/app/dashboard/verify-provider/PhoneVerificationForm.tsx` | Phone OTP UI |
| `src/app/dashboard/verify-provider/ProviderTypeForm.tsx` | Individual/Business selection UI |
| `src/app/dashboard/verify-provider/IdentityVerificationForm.tsx` | Document upload UI |
| `src/app/dashboard/verify-provider/RejectedVerificationView.tsx` | Re-upload after rejection |

### Admin Queue
| File | Role |
|------|------|
| `src/lib/services/admin-verification.ts` | All admin actions (getVerificationQueue, getVerificationDetail, approveVerification, rejectVerification) |
| `src/app/admin/verifications/page.tsx` | Queue list page |
| `src/app/admin/verifications/VerificationQueueFilters.tsx` | Filter controls |
| `src/app/admin/verifications/[id]/page.tsx` | Individual review page |
| `src/app/admin/verifications/[id]/VerificationActions.tsx` | Approve/reject buttons |
| `src/app/admin/verifications/[id]/DocumentViewer.tsx` | Document preview |

### Notifications
| File | Role |
|------|------|
| `src/lib/notifications/triggers.ts` | notifyProviderVerificationApproved, notifyProviderVerificationRejected, notifyAdminNewVerificationSubmission |
| `src/lib/sms/index.ts` | sendOTP() for phone verification |
| `src/lib/email/index.ts` | sendVerificationEmail() (search alerts only) |

### Type Definitions
| File | What |
|------|------|
| `src/types/service-providers.ts` | VerificationLevel, VerificationStatus, ProviderDocument, ProviderVerification |
| `src/types/db-helpers.ts` | VerificationLevel (different values!) |
| `src/types/property-management.ts` | VerificationLevel (yet another set of values!) |
| `src/types/database.ts` | Generated DB types for all tables |
| `src/types/provider-profile.ts` | verification_status field |

### Public Display
| File | What |
|------|------|
| `src/components/services/ProviderCard.tsx` | Verified badge + tier badges on browse cards |
| `src/components/services/CompareProviders.tsx` | Verified/Not verified comparison row |
| `src/app/services/provider/[id]/page.tsx` | Trust signals section (BROKEN — see Gap 2) |
| `src/app/services/provider/[id]/service/[serviceId]/page.tsx` | BadgeCheck next to name |
| `src/components/services-landing/ServicesFeaturedProviders.tsx` | Green dot on verified avatars |
| `src/components/services-landing/ServicesFAQ.tsx` | FAQ answer about verification process |

### Dashboard Display
| File | What |
|------|------|
| `src/app/dashboard/provider/page.tsx` | Verification progress banner |
| `src/app/dashboard/provider/layout.tsx` | Computes isVerified, verificationLevel |
| `src/app/dashboard/provider/ProviderDashboardShell.tsx` | Sidebar verified badge |
| `src/app/dashboard/provider/services/ServicesGrid.tsx` | "Draft mode" banner + Go Live gate |

### Data Query Layer
| File | What |
|------|------|
| `src/lib/services/providers.ts` | Verified filter, badge sort, featured filter |
| `src/lib/cache/queries.ts` | Cached verification state |
| `src/hooks/useServicesSearch.ts` | `verified` toggle filter state |

### Database Migrations
| Migration | What |
|-----------|------|
| `20251231000002_create_schema.sql` | profiles (is_verified, verification_level), user_roles (is_verified) |
| `20260108120000_core_enums_and_types.sql` | verification_level enum, verification_status enum |
| `20260108120001_discovery_layer.sql` | service_verification_requirements table |
| `20260108120002_trust_provider_layer.sql` | service_providers, provider_services, provider_verification_documents, provider_vehicles, provider_driver_licenses |
| `20260227000000_create_provider_documents.sql` | provider_documents table (replaced provider_verification_documents) |
| `20260311000000_admin_verification_queue.sql` | Admin role, reviewed_at/reviewed_by columns, pending_verification status |
| ⚠️ **MISSING** | phone_verifications table — NO migration exists |
