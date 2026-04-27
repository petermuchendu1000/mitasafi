# MitaSafi Service Provider Module — Complete Milestone Plan

> **Generated**: March 1, 2026  
> **Scope**: Full audit of the service provider module from DB schema to UI  
> **Goal**: Define every milestone needed to ship a production-ready provider experience

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Feature Completeness Matrix](#2-feature-completeness-matrix)
3. [Database Table Audit](#3-database-table-audit)
4. [Milestone Roadmap](#4-milestone-roadmap)
   - M0: Critical Fixes & Cleanup
   - M1: Customer Booking Request Flow
   - M2: Provider Job Inbox & Response
   - M3: Quoting & Negotiation
   - M4: In-App Messaging
   - M5: Job Lifecycle & Status Management
   - M6: Payment Integration (M-Pesa)
   - M7: Review & Rating System
   - M8: Provider Analytics Dashboard
   - M9: Notifications & Real-Time
   - M10: Dispute Resolution
   - M11: Transport/Delivery Provider Extensions
   - M12: Admin Panel
   - M13: Production Hardening
5. [DB Tables Needed Per Milestone](#5-db-tables-needed-per-milestone)
6. [API Routes Needed Per Milestone](#6-api-routes-needed-per-milestone)

---

## 1. Current State Summary

### What's FULLY Complete ✅

| Area | Details |
|------|---------|
| **Provider Onboarding** | 3-step verification: Phone OTP → Provider Type (individual/company) → ID Upload. Auto-approve in MVP. |
| **Profile Management** | Full wizard: Photo → Basics (headline, bio, years, languages) → Service Areas (neighborhood picker) → Working Hours (weekly schedule + emergency toggle + response time) → Social Links (7 platforms with prefix inputs + brand icons) |
| **Service CRUD** | 6-step wizard: Category → Services → Pricing → Service Areas → Description/Images → Review. Grid view with pause/delete/edit. Per-service preview. |
| **Availability** | Dedicated page with day-by-day schedule editor, quick templates (Weekdays 8-5, etc.), emergency availability toggle, surcharge config, response time dropdown. |
| **Public Provider Profile** | Full trust-focused page: Hero + verification badges, credentials, about section, portfolio gallery, services & pricing cards, reviews with pagination, working hours, social links (tracked clicks), similar providers sidebar. Context-aware nav (own vs. public). |
| **Provider Discovery** | Services listing page with category/subcategory filters, search, sorting. ProviderCard component with tier badges, rating, pricing, save/share. |
| **Social Links Tracking** | `social_link_clicks` table + `/api/social-click` endpoint (POST beacon + GET redirect) + `SocialTrafficCard` dashboard widget with sparkline. |
| **Dashboard Shell** | Sidebar navigation, profile dropdown (View Profile, Edit Profile, Account Settings, Sign out), notification badge, mobile responsive. |
| **Dashboard Home** | Stats grid (jobs completed, monthly earnings, rating, response rate), verification banner, recent requests feed, quick links sidebar, active jobs count, earnings summary, social traffic card. |
| **Settings Page** | Basic stub: notification toggle UI (email/SMS/push), change password link, deactivate account. |
| **Saved Providers** | Full API (GET/POST `/api/services/saved`) + heart icon on ProviderCard. |
| **Performance** | React cache() for request deduplication, materialized views for service queries, dashboard query indexes, parallel data fetching. |

### What's PARTIALLY Complete 🟡

| Area | What Exists | What's Missing |
|------|-------------|----------------|
| **Dashboard Stats** | `getCachedDashboardStats` queries `bookings` table for KPIs (completed jobs, earnings, rating, response rate, pending quotes) | Stats query returns real data but there's no booking creation flow yet — all stats will be 0. No trend charts or historical analytics. |
| **Recent Jobs Feed** | `getCachedRecentJobs` fetches from `bookings` with job status rendering | No bookings exist to display. Links to `/dashboard/provider/jobs` and `/dashboard/provider/jobs?status=active` which are "Coming Soon" pages. |
| **Provider API Routes** | `GET /api/services/providers` (list), `GET /api/services/providers/[id]` (detail) work. `GET /api/services/providers/me` returns 501. | Me endpoint, area-based filtering, price sorting all incomplete. |
| **Notification System** | `notifications` table + API CRUD + badge count in sidebar. Settings page has toggle UI. | Toggles are decorative (no persistence). No notification triggers (nobody writes notifications on booking events). No email/SMS delivery. Push notifications marked "Coming soon". |
| **Reviews Display** | Provider profile page renders reviews. `getProviderReviews()` server function works. | No review creation UI. API route is a stub. Reviews table is empty with no way to populate. |
| **Verification** | Phone OTP + ID upload flow complete. Auto-approve on upload. | No real verification backend. No manual admin review. SMS disabled (OTP printed to console). No document review queue. |
| **Portfolio** | `PortfolioGallery` component renders images from `portfolio_images` (provider field). `provider_portfolio` DB table exists with richer schema (title, description, service link). | No CRUD UI for portfolio items. Images come from jsonb array on provider, not the dedicated table. |
| **Area/Location Filtering** | Neighborhoods seeded. `provider_service_areas` table populated via profile wizard. `service_providers.primary_location` stores city/area. | `getProviders()` has comment "area filtering not supported". No geo-search. No radius-based matching. |
| **RLS Policies** | `provider_documents` has proper RLS. | Core tables (`service_providers`, `provider_services`, `bookings`, etc.) have **no RLS policies**. Server actions use `createAdminClient()` to bypass. Must add before production. |

### What's NOT Done At All ❌

| Area | Status |
|------|--------|
| **Customer Booking Creation** | No booking form, no service request page, no booking API |
| **Provider Job Inbox** | No incoming requests view (sidebar says "Jobs — Coming Soon") |
| **Job Accept/Reject/Counter** | No provider response actions |
| **Quoting Workflow** | DB schema complete (`booking_quotes`), all API routes return 501 |
| **In-App Messaging** | DB schema complete (`booking_messages`), API route returns 501, no chat UI |
| **Payment Integration** | Payment columns exist on `bookings` but no M-Pesa or payment gateway |
| **Review Creation** | `reviews` table exists but no review form for customers |
| **Dispute System** | `booking_disputes` table exists but no UI |
| **Transport/Delivery Features** | `provider_vehicles` + `provider_driver_licenses` tables exist but no UI |
| **Admin Panel** | No admin dashboard (verification queue, dispute management, moderation) |
| **Recurring Bookings** | `is_recurring_capable` in service_capabilities but no scheduling system |
| **Provider Search by Area** | No geo-based provider matching despite having service areas data |
| **Earnings/Payout Dashboard** | Sidebar has "Earnings" nav item but links to coming-soon page |
| **Calendar View** | Sidebar has "Calendar" nav item but links to coming-soon page |
| **Reports Page** | Sidebar has "Reports" nav item but links to coming-soon page |
| **Instant Booking** | Type exists, filter UI button exists, but no `instant_booking` column in DB |

---

## 2. Feature Completeness Matrix

| Feature | DB Schema | Types | Server Action | API Route | Dashboard UI | Public UI | Score |
|---------|:---------:|:-----:|:-------------:|:---------:|:------------:|:---------:|:-----:|
| Provider Registration | ✅ | ✅ | ✅ | — | ✅ | — | **100%** |
| Profile Management | ✅ | ✅ | ✅ | — | ✅ | ✅ | **100%** |
| Service CRUD | ✅ | ✅ | ✅ | — | ✅ | ✅ | **100%** |
| Availability/Hours | ✅ | ✅ | ✅ | — | ✅ | ✅ | **100%** |
| Social Links | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **100%** |
| Provider Discovery | ✅ | ✅ | ✅ | ✅ | — | ✅ | **95%** |
| Saved Providers | ✅ | ✅ | — | ✅ | — | ✅ | **90%** |
| Verification | ✅ | ✅ | ✅ | — | ✅ | ✅ | **80%** |
| Notifications | ✅ | ✅ | — | ✅ | 🟡 | — | **50%** |
| Reviews (Display) | ✅ | ✅ | ✅ | 🟡 | — | ✅ | **50%** |
| Dashboard Stats | ✅ | ✅ | ✅ | — | ✅ | — | **50%** |
| Portfolio | ✅ | 🟡 | ❌ | ❌ | ❌ | ✅ | **30%** |
| Area Filtering | ✅ | ✅ | ❌ | ❌ | — | ❌ | **25%** |
| Booking Creation | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **15%** |
| Quoting | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **15%** |
| Messaging | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **15%** |
| Job Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **15%** |
| Payments | ✅ | 🟡 | ❌ | ❌ | ❌ | ❌ | **10%** |
| Reviews (Creation) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **10%** |
| Disputes | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **10%** |
| Transport/Delivery | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **5%** |
| Admin Panel | ❌ | ❌ | ❌ | ❌ | ❌ | — | **0%** |
| Earnings Dashboard | ❌ | ❌ | ❌ | ❌ | ❌ | — | **0%** |
| Recurring Bookings | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | **5%** |

---

## 3. Database Table Audit

### 3.1 Tables In Active Use ✅

| Table | Used By | Migration |
|-------|---------|-----------|
| `service_providers` | Profile, dashboard, public page, discovery | `20260108120002` + later ALTERs |
| `provider_services` | Service wizard, services grid, provider page | `20260108120002` |
| `provider_service_areas` | Profile wizard, service wizard | `20260108120002` |
| `provider_availability_intervals` | Availability page, working hours form | `20260109130001` |
| `provider_documents` | Verification upload flow | `20260227000000` |
| `service_categories` | Service wizard step 1, discovery, constants | `20260108120001` |
| `service_subcategories` | Service wizard step 2, discovery | `20260108120001` |
| `services` | Service wizard step 2, provider_services FK | `20260108120001` |
| `service_types` | Service wizard (via services), booking flow | `20260108120001` |
| `services_with_categories` | Materialized view used by cached queries | `20260109150001` |
| `profiles` | User profile + verification level | `20260108120002` (or base schema) |
| `user_roles` | Role check in layout | `20260108120002` (or base schema) |
| `neighborhoods` | Area picker in profile + service wizard | `20260116000000` |
| `notifications` | Dashboard badge, API | `20260105000002` |
| `saved_providers` | Heart icon + API | `20260108120005` |
| `social_link_clicks` | Beacon tracking + analytics card | `20260302000002` |
| `phone_verifications` | OTP verification flow | (exists in base schema) |

### 3.2 Tables That Exist But Are NOT Used ❌

| Table | Columns | Why Unused | Needed For |
|-------|---------|------------|------------|
| `bookings` | id, customer_id, provider_id, service_id, status, quoted_price, agreed_price, timestamps, payment fields, notes, metadata | No booking creation flow exists | M1-M6 |
| `booking_status_history` | booking_id, from_status, to_status, changed_by, reason | No status transitions happening | M5 |
| `booking_quotes` | booking_id, provider_id, quoted_price, breakdown, validity, status | API routes return 501 | M3 |
| `booking_media` | booking_id, media_type, media_url, stage (before/during/after) | No upload UI | M5 |
| `booking_messages` | booking_id, sender_id, message, is_read | API route returns 501, no chat UI | M4 |
| `booking_disputes` | booking_id, dispute_type, severity, evidence_urls, resolution | No dispute UI | M10 |
| `reviews` | booking_id, rating, dimension_ratings, comment, provider_response | No review creation UI | M7 |
| `review_helpful_votes` | review_id, user_id, is_helpful | No voting UI | M7 |
| `provider_portfolio` | provider_id, title, description, photos, service linked | Portfolio reads from jsonb field instead | M0 |
| `provider_vehicles` | provider_id, registration, make/model, insurance, inspection | No transport provider UI | M11 |
| `provider_driver_licenses` | provider_id, license_number, type, expiry, background_check | No transport provider UI | M11 |
| `provider_verification_documents` | provider_id, document_type, status, reviewed_by | Overlaps with `provider_documents` table | Cleanup/M12 |
| `provider_availability` (original) | provider_id, day, start_time, end_time | Superseded by `provider_availability_intervals` | Cleanup |
| `locations` | user_id, address, area, city, lat/lng, type, label | No saved locations UI | M1 |
| `service_capabilities` | service_id, supports_emergency, is_recurring, min_notice, etc. | Reference data — no UI, no enforcement | M0/M12 |
| `service_pricing` / `service_pricing_components` | service_id, pricing_type, amount, components | Providers use `custom_pricing` jsonb instead | Possibly dead |
| `service_verification_requirements` | service_id, min_level, certification_required, etc. | No eligibility checks in code | M12 |
| `user_preferences` | user_id, notification prefs, privacy prefs | Settings page toggles are decorative | M9 |
| `blocked_users` | blocker_id, blocked_id | No blocking UI | M10 |
| `system_announcements` | title, body, target_audience, expires_at | No admin creation or display | M12 |
| `feature_flags` | key, is_enabled, rollout_percentage | No admin toggle UI | M12 |
| `audit_log` | action, table_name, record_id, changes, user_id | No viewer | M12 |
| `api_keys` | provider_id, key_hash, scopes | Future API access | Post-MVP |
| `system_metrics` | metric_name, value, timestamp | No recording or charts | Post-MVP |

### 3.3 Tables That DON'T Exist But Are Needed

| Table | Purpose | Milestone |
|-------|---------|-----------|
| `payments` / `transactions` | M-Pesa payment records, refunds, payout tracking | M6 |
| `provider_payouts` | Scheduled payouts to provider bank/M-Pesa | M6 |
| `provider_wallet` | Balance tracking for provider earnings | M6 |
| `conversation_threads` (optional) | Thread abstraction over booking_messages for multi-booking conversations | M4 |
| `booking_schedules` | Recurring booking definitions (frequency, next_date, etc.) | Post-MVP |

---

## 4. Milestone Roadmap

---

### M0: Critical Fixes & Cleanup (Priority: IMMEDIATE)

**Goal**: Fix bugs, clean dead code, and resolve schema mismatches before building new features.

#### Tasks

| # | Task | Files | Effort |
|---|------|-------|--------|
| 0.1 | **Fix `/onboarding/provider-type` missing route** — Layout redirects here but no page exists. Create page or update redirect target. | `src/app/onboarding/provider-type/page.tsx` OR `layout.tsx` | S |
| 0.2 | **Remove `instant_booking` references** — Filter UI and types reference column that doesn't exist. Either add the column or remove the dead references. | `types/service-providers.ts`, filter components | S |
| 0.3 | **Fix price sorting in `getProviders()`** — Currently sorts by `verification_badge` as workaround. Need computed price or index. | `src/lib/services/providers.ts` | M |
| 0.4 | **Fix table name mismatches in generated types** — TS types reference `service_jobs`, `service_job_quotes`, `service_job_messages` but actual tables are `bookings`, `booking_quotes`, `booking_messages`. Regenerate types or add aliases. | `src/types/database.ts`, `src/types/service-providers.ts` | M |
| 0.5 | **Consolidate `provider_verification_documents` vs `provider_documents`** — Two overlapping tables. Deprecate the unused one. | Migration + cleanup | S |
| 0.6 | **Consolidate `provider_availability` vs `provider_availability_intervals`** — Code uses intervals table. Mark original as deprecated or drop. | Migration + cleanup | S |
| 0.7 | **Portfolio table vs jsonb** — Either migrate portfolio to use `provider_portfolio` table (richer) or drop the table. Currently reads from provider jsonb. | Profile actions + migration | M |
| 0.8 | **Implement `/api/services/providers/me`** — Currently returns 501. Easy implementation using getCachedUser + getProviderWithProfile. | `src/app/api/services/providers/me/route.ts` | S |
| 0.9 | **Add RLS policies to core tables** — `service_providers`, `provider_services`, `bookings`, `reviews` all lack RLS. Critical for production. | New migration | L |
| 0.10 | **Fix `saved_providers` column name** — Verify `customer_id` vs `user_id` mismatch. | `src/lib/services/providers.ts` | S |

**Estimated Effort**: 3–5 days

---

### M1: Customer Booking Request Flow (Priority: HIGH)

**Goal**: Allow customers to request a service from a provider.

#### Prerequisites
- M0 (schema cleanup)

#### DB Tables Used
- `bookings` (existing — INSERT)
- `locations` (existing — INSERT/SELECT for saved addresses)
- `booking_status_history` (existing — INSERT initial state)

#### New DB Tables Needed
None — schema already supports this.

#### Steps

| # | Task | Details | Files to Create/Modify |
|---|------|---------|----------------------|
| 1.1 | **"Request Service" button on provider profile** | Button on each service card in the public provider page. Links to `/services/provider/[id]/request?service=[serviceId]`. | `src/app/services/provider/[id]/page.tsx` |
| 1.2 | **Create booking request page** | Multi-step form: (1) Confirm service + provider, (2) Location (use saved or enter new), (3) Date/time preference, (4) Description + photos, (5) Review & submit. | `src/app/services/provider/[id]/request/page.tsx`, `BookingRequestForm.tsx` |
| 1.3 | **Location picker component** | Reusable component: saved locations dropdown + "Add new" with area/address fields. Stores to `locations` table. | `src/components/booking/LocationPicker.tsx` |
| 1.4 | **Create booking server action** | `createBookingRequest(data)` — inserts into `bookings` (status: `submitted`), `booking_status_history`, uploads media to `booking_media`. | `src/app/services/provider/[id]/request/actions.ts` |
| 1.5 | **Booking confirmation page** | Success page after submission with booking ID, estimated response time, next steps. | `src/app/bookings/[id]/confirmation/page.tsx` |
| 1.6 | **Customer bookings list page** | Table/card view of customer's bookings with status badges. | `src/app/dashboard/bookings/page.tsx` |
| 1.7 | **Booking detail page (customer view)** | Full detail: provider info, service, status timeline, location, messages (read-only initially). | `src/app/dashboard/bookings/[id]/page.tsx` |
| 1.8 | **Trigger notification** | On booking creation, create `notifications` row for the provider (type: `new_booking_request`). | `src/lib/notifications/triggers.ts` |
| 1.9 | **API route: Create booking** | `POST /api/services/bookings` — validates auth, service, provider, creates booking. | `src/app/api/services/bookings/route.ts` |
| 1.10 | **API route: Get my bookings** | `GET /api/services/bookings` — returns customer's bookings with pagination. | Same file |

**Estimated Effort**: 7–10 days

---

### M2: Provider Job Inbox & Response (Priority: HIGH)

**Goal**: Provider can see incoming requests and accept/reject them.

#### Prerequisites
- M1 (bookings exist)

#### DB Tables Used
- `bookings` (UPDATE status)
- `booking_status_history` (INSERT)
- `notifications` (INSERT)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 2.1 | **Jobs list page** | Replace "Coming Soon" on `/dashboard/provider/jobs`. Tab-based: All / Pending / Active / Completed. Each card shows customer, service, area, budget, time. | `src/app/dashboard/provider/jobs/page.tsx`, `JobsListClient.tsx` |
| 2.2 | **Job detail page (provider view)** | Full detail: customer info (anonymized until accepted), service requested, location area, description, photos, status timeline, action buttons. | `src/app/dashboard/provider/jobs/[id]/page.tsx` |
| 2.3 | **Accept job action** | Server action: update booking status to `confirmed`, create status history, notify customer. | `src/app/dashboard/provider/jobs/actions.ts` |
| 2.4 | **Reject job action** | Server action: update to `cancelled_provider` with reason, notify customer. | Same file |
| 2.5 | **Request more info action** | Provider can ask customer for clarification before deciding. Creates a `booking_message`. | Same file |
| 2.6 | **Counter-offer (leads to M3)** | If provider wants different price, redirect to quoting flow. | Stub link → M3 |
| 2.7 | **Provider notification badge** | Update "Jobs" nav item in sidebar to show pending count. | `ProviderDashboardShell.tsx`, cached query |
| 2.8 | **Status-aware dashboard** | Dashboard home's "Recent Requests" feed now shows real data and links to job detail. | `src/app/dashboard/provider/page.tsx` |

**Estimated Effort**: 5–7 days

---

### M3: Quoting & Negotiation (Priority: HIGH)

**Goal**: Provider can send itemized quotes. Customer can accept, reject, or request revision.

#### Prerequisites
- M2 (job inbox exists)

#### DB Tables Used
- `booking_quotes` (existing — CRUD)
- `bookings` (UPDATE status: quote_pending → quote_sent → quote_accepted/rejected)
- `booking_status_history` (INSERT)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 3.1 | **Quote creation form** | Provider fills out: total price, line-item breakdown (jsonb), description, validity period. | `src/app/dashboard/provider/jobs/[id]/quote/page.tsx`, `QuoteForm.tsx` |
| 3.2 | **Send quote action** | Server action: insert `booking_quotes`, update booking status to `quote_sent`, notify customer. | `src/app/dashboard/provider/jobs/[id]/quote/actions.ts` |
| 3.3 | **Customer quote view** | Customer sees received quote with breakdown, can accept or reject with reason. | `src/app/dashboard/bookings/[id]/quote/page.tsx` |
| 3.4 | **Accept quote action** | Update booking `agreed_price`, status to `quote_accepted` → `confirmed`, notify provider. | `src/app/dashboard/bookings/[id]/actions.ts` |
| 3.5 | **Reject quote action** | Update quote status, booking to `quote_rejected`, customer can add reason. Provider can revise. | Same file |
| 3.6 | **Revise quote** | Provider creates a new quote entry (versioned). Previous marked as superseded. | `src/app/dashboard/provider/jobs/[id]/quote/actions.ts` |
| 3.7 | **Implement quote API routes** | `GET/POST /api/services/jobs/[id]/quotes` — replace 501 stubs. | `src/app/api/services/jobs/[id]/quotes/route.ts` |

**Estimated Effort**: 5–7 days

---

### M4: In-App Messaging (Priority: MEDIUM)

**Goal**: Provider and customer can chat within a booking context.

#### Prerequisites
- M2 (job detail page exists)

#### DB Tables Used
- `booking_messages` (existing — CRUD)
- `notifications` (INSERT on new message)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 4.1 | **Chat component** | Reusable message thread: chronological messages, sender avatars, timestamps, read receipts. | `src/components/booking/ChatThread.tsx` |
| 4.2 | **Message input** | Text input with send button. Optional image attachment (upload to storage). | `src/components/booking/MessageInput.tsx` |
| 4.3 | **Send message action** | Server action: insert `booking_messages`, mark previous unread as read, notify other party. | `src/lib/services/messages.ts` |
| 4.4 | **Embed chat in job detail** | Add chat tab/section to both provider and customer job detail pages. | Modify existing job detail pages |
| 4.5 | **Unread count** | Show unread message count on job cards and in sidebar. | Cached query + UI updates |
| 4.6 | **Real-time messages (Supabase Realtime)** | Subscribe to `booking_messages` inserts for the current booking. Update chat in real-time. | `ChatThread.tsx` + Supabase channel |
| 4.7 | **Implement messages API route** | `GET/POST /api/services/jobs/[id]/messages` — replace 501 stub. | `src/app/api/services/jobs/[id]/messages/route.ts` |

**Estimated Effort**: 5–7 days

---

### M5: Job Lifecycle & Status Management (Priority: HIGH)

**Goal**: Full booking lifecycle from confirmed → scheduled → in_progress → completed → customer_confirmed.

#### Prerequisites
- M2 + M3 (bookings can be confirmed)

#### DB Tables Used
- `bookings` (UPDATE status)
- `booking_status_history` (INSERT for every transition)
- `booking_media` (INSERT before/during/after photos)

#### DB Schema Already Has
The `booking_status` enum already defines: `draft, submitted, provider_viewed, quote_pending, quote_sent, quote_accepted, quote_rejected, confirmed, in_progress, completed, customer_confirmed, cancelled_customer, cancelled_provider, disputed, resolved`

Migration `20260109120003_booking_status_transition_enforcement.sql` already enforces valid transitions.

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 5.1 | **Status transition actions** | Server actions for each valid transition: `scheduleJob(bookingId, datetime)`, `startJob(bookingId)`, `completeJob(bookingId)`, `customerConfirmCompletion(bookingId)`. Each writes status history. | `src/lib/services/booking-lifecycle.ts` |
| 5.2 | **Schedule job UI** | Provider picks date/time on confirmed booking. Writes `scheduled_at`. | `src/app/dashboard/provider/jobs/[id]/schedule/page.tsx` |
| 5.3 | **Job status timeline** | Visual timeline component showing all status transitions with timestamps and actors. | `src/components/booking/StatusTimeline.tsx` |
| 5.4 | **Before/after photos** | Provider can upload photos at different stages. Stored in `booking_media` with `stage` field. | `src/components/booking/JobPhotos.tsx` |
| 5.5 | **Customer completion confirmation** | Customer confirms job was done. Status moves to `customer_confirmed`. | `src/app/dashboard/bookings/[id]/confirm/page.tsx` |
| 5.6 | **Cancellation flows** | Customer cancel (before in_progress), provider cancel (with reason). Refund triggers. | `src/lib/services/booking-lifecycle.ts` |
| 5.7 | **Auto-completion timer** | If customer doesn't confirm within X days after `completed`, auto-confirm via cron/edge function. | Supabase Edge Function or cron |
| 5.8 | **Calendar view for provider** | Replace "Coming Soon" on `/dashboard/provider/calendar`. Show scheduled jobs on a week/month grid. | `src/app/dashboard/provider/calendar/page.tsx` |

**Estimated Effort**: 7–10 days

---

### M6: Payment Integration — M-Pesa (Priority: HIGH)

**Goal**: Customers pay via M-Pesa STK Push. Providers receive payouts.

#### Prerequisites
- M5 (job completion flow)

#### New DB Tables Needed

```sql
-- Payment transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  payer_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_method TEXT NOT NULL DEFAULT 'mpesa', -- mpesa, card, cash
  mpesa_checkout_request_id TEXT,  -- STK push reference
  mpesa_receipt_number TEXT,       -- Confirmation code
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, refunded
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Provider earnings & payouts
CREATE TABLE provider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  payout_method TEXT NOT NULL DEFAULT 'mpesa', -- mpesa, bank_transfer
  mpesa_phone TEXT,
  bank_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  reference TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Running balance
ALTER TABLE service_providers 
  ADD COLUMN wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0;
```

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 6.1 | **M-Pesa STK Push integration** | Use Safaricom Daraja API. Initiate payment on quote acceptance or job completion. | `src/lib/payments/mpesa.ts` |
| 6.2 | **Payment callback handler** | `POST /api/payments/mpesa/callback` — receive payment confirmation, update `payments` table, update booking `payment_status`. | `src/app/api/payments/mpesa/callback/route.ts` |
| 6.3 | **Payment initiation action** | `initiatePayment(bookingId)` — call STK Push, create `payments` row. | `src/lib/services/payments.ts` |
| 6.4 | **Payment status page** | Customer sees payment status: pending → processing → completed/failed. Retry button on failure. | `src/app/dashboard/bookings/[id]/payment/page.tsx` |
| 6.5 | **Provider earnings dashboard** | Replace "Coming Soon" on `/dashboard/provider/earnings`. Show: total earned, pending payouts, completed payouts, transaction history. | `src/app/dashboard/provider/earnings/page.tsx` |
| 6.6 | **Payout request** | Provider requests payout. Platform processes (manual initially, then automated). | `src/app/dashboard/provider/earnings/payout/page.tsx` |
| 6.7 | **Commission calculation** | Platform takes X% commission. Net amount goes to provider wallet. Track in `payments` metadata. | `src/lib/payments/commission.ts` |
| 6.8 | **DB migration** | Create `payments` and `provider_payouts` tables with indexes, RLS. | `supabase/migrations/YYYYMMDD_payment_tables.sql` |

**Estimated Effort**: 10–14 days

---

### M7: Review & Rating System (Priority: MEDIUM)

**Goal**: Customers rate and review providers after job completion. Providers can respond.

#### Prerequisites
- M5 (job must reach `customer_confirmed` state)

#### DB Tables Used
- `reviews` (existing — INSERT)
- `review_helpful_votes` (existing — INSERT)
- `service_providers` (UPDATE `average_rating`, `total_reviews`)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 7.1 | **Review creation form** | Post-completion prompt: star rating (1-5), dimension ratings (quality, communication, punctuality, value), text review, photo upload. | `src/app/dashboard/bookings/[id]/review/page.tsx`, `ReviewForm.tsx` |
| 7.2 | **Submit review action** | Server action: insert `reviews`, recalculate provider `average_rating` and `total_reviews`, notify provider. | `src/lib/services/reviews.ts` |
| 7.3 | **Provider response** | Provider can write one response to each review. Updates `provider_response` + `provider_response_at`. | `src/app/dashboard/provider/reviews/actions.ts` |
| 7.4 | **Provider reviews page** | Replace "Coming Soon" on `/dashboard/provider/reviews`. List all reviews with rating filter, respond button. | `src/app/dashboard/provider/reviews/page.tsx` |
| 7.5 | **"Was this helpful?" voting** | On public provider page review cards, add thumbs up/down. Uses `review_helpful_votes`. | Modify provider page review section |
| 7.6 | **Review moderation flags** | Reviews table has `is_flagged`, `moderation_status`. Add report button. Queue for admin (M12). | `src/components/booking/ReportReviewButton.tsx` |
| 7.7 | **Implement review API route** | `GET/POST /api/services/jobs/[id]/review` — replace 501 stub. | `src/app/api/services/jobs/[id]/review/route.ts` |

**Estimated Effort**: 5–7 days

---

### M8: Provider Analytics Dashboard (Priority: MEDIUM)

**Goal**: Rich analytics beyond basic stats — revenue charts, booking trends, ratings over time.

#### Prerequisites
- M5 + M6 (need real booking and payment data)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 8.1 | **Revenue chart** | Line chart: daily/weekly/monthly revenue over time. Use `bookings` agreed_price + `payments` data. | `src/app/dashboard/provider/analytics/RevenueChart.tsx` |
| 8.2 | **Booking trends** | Bar chart: bookings per week/month by status. Conversion rate (submitted → completed). | `src/app/dashboard/provider/analytics/BookingTrends.tsx` |
| 8.3 | **Rating trend** | Line chart: average rating over time. Show rating distribution (5-star bars). | `src/app/dashboard/provider/analytics/RatingTrend.tsx` |
| 8.4 | **Service performance** | Per-service breakdown: most requested, highest rated, most profitable. | `src/app/dashboard/provider/analytics/ServicePerformance.tsx` |
| 8.5 | **Analytics page** | Replace "Coming Soon" on `/dashboard/provider/reports`. Combine all chart widgets. Date range selector. | `src/app/dashboard/provider/reports/page.tsx` |
| 8.6 | **Server queries** | Aggregation queries for all chart data with date range filters. | `src/lib/services/analytics.ts` |

**Estimated Effort**: 5–7 days

---

### M9: Notifications & Real-Time (Priority: MEDIUM)

**Goal**: Functional notification system — triggers, delivery, preferences, real-time.

#### Prerequisites
- M1 (booking events to notify about)

#### DB Tables Used
- `notifications` (existing — CRUD)
- `user_preferences` (existing — READ for delivery preferences)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 9.1 | **Notification trigger system** | Central `createNotification(userId, type, data)` function called by all booking/message/review actions. | `src/lib/notifications/triggers.ts` |
| 9.2 | **Notification types enum** | Define all types: `new_booking`, `booking_accepted`, `booking_rejected`, `new_quote`, `quote_accepted`, `new_message`, `new_review`, `payment_received`, `payout_completed`, etc. | `src/types/notifications.ts` |
| 9.3 | **Notifications page** | Full page: list all notifications, mark read, filter by type. Link from sidebar bell icon. | `src/app/dashboard/notifications/page.tsx` |
| 9.4 | **Real-time notification badge** | Supabase Realtime subscription on `notifications` table. Update badge count instantly. | `ProviderDashboardShell.tsx` + Realtime channel |
| 9.5 | **Notification preferences persistence** | Save settings page toggles to `user_preferences` table. Check preferences before sending. | `src/app/dashboard/provider/settings/actions.ts` |
| 9.6 | **Email notifications** | Send transactional emails for critical events (new booking, payment received). Use Resend/SendGrid. | `src/lib/notifications/email.ts` |
| 9.7 | **SMS notifications** | Enable Africa's Talking integration for urgent notifications (new booking from preferred area, etc.). | `src/lib/notifications/sms.ts` |
| 9.8 | **Push notifications** | Web Push API registration + Supabase Edge Function for sending. | `src/lib/notifications/push.ts` |

**Estimated Effort**: 7–10 days

---

### M10: Dispute Resolution (Priority: LOW)

**Goal**: Handle post-job disputes between customers and providers.

#### Prerequisites
- M5 + M7 (completed jobs with reviews)

#### DB Tables Used
- `booking_disputes` (existing — CRUD)
- `blocked_users` (existing — INSERT)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 10.1 | **Report issue button** | On customer job detail (completed status). Opens dispute form. | `src/app/dashboard/bookings/[id]/dispute/page.tsx` |
| 10.2 | **Dispute creation form** | Type selection (quality, no_show, overcharge, damage, other), severity, description, evidence upload. | `DisputeForm.tsx` |
| 10.3 | **Dispute creation action** | Insert `booking_disputes`, update booking status to `disputed`, notify provider + admin. | `src/lib/services/disputes.ts` |
| 10.4 | **Provider dispute view** | Provider sees dispute details and can respond with their side + evidence. | `src/app/dashboard/provider/jobs/[id]/dispute/page.tsx` |
| 10.5 | **Block user flow** | After negative experience, either party can block the other. Uses `blocked_users`. Filter blocked users from discovery. | `src/lib/services/blocking.ts` |

**Estimated Effort**: 4–5 days

---

### M11: Transport/Delivery Provider Extensions (Priority: LOW)

**Goal**: Support delivery and transport service providers with vehicle and license management.

#### Prerequisites
- M0 (schema cleanup)

#### DB Tables Used
- `provider_vehicles` (existing — CRUD)
- `provider_driver_licenses` (existing — CRUD)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 11.1 | **Vehicle management page** | Add/edit/delete vehicles. Registration, make/model, insurance, inspection cert upload. | `src/app/dashboard/provider/vehicles/page.tsx` |
| 11.2 | **License management page** | Upload driver license, background check docs, police clearance. | `src/app/dashboard/provider/licenses/page.tsx` |
| 11.3 | **Conditional profile wizard step** | If provider type has `booking_flow = 'delivery'`, add vehicle step to wizard. | Modify `ProfileSetupWizard.tsx` |
| 11.4 | **Delivery booking flow** | Extended booking form with pickup/dropoff locations, package details. | Modify booking request form |
| 11.5 | **Live tracking** (future) | Real-time location tracking during delivery. Requires mobile/GPS integration. | Post-MVP |

**Estimated Effort**: 5–7 days

---

### M12: Admin Panel (Priority: MEDIUM)

**Goal**: Platform administration for verification, disputes, moderation.

#### Prerequisites
- M7 + M10 (content to moderate)

#### Steps

| # | Task | Details | Files |
|---|------|---------|-------|
| 12.1 | **Admin layout + auth** | Admin role check, dedicated layout at `/admin`. | `src/app/admin/layout.tsx` |
| 12.2 | **Verification queue** | List pending `provider_documents`. Approve/reject with notes. Triggers verification level update. | `src/app/admin/verifications/page.tsx` |
| 12.3 | **Dispute resolution** | List open disputes. Review evidence. Assign resolution, process refunds. | `src/app/admin/disputes/page.tsx` |
| 12.4 | **Review moderation** | Flagged reviews queue. Approve, remove, or warn. | `src/app/admin/reviews/page.tsx` |
| 12.5 | **Provider management** | List all providers. Suspend/activate accounts. View stats. | `src/app/admin/providers/page.tsx` |
| 12.6 | **Service catalog management** | Add/edit categories, subcategories, services. Manage service_capabilities and verification requirements. | `src/app/admin/services/page.tsx` |
| 12.7 | **System announcements** | Create/edit announcements. Target audience selection. | `src/app/admin/announcements/page.tsx` |
| 12.8 | **Feature flags** | Toggle features, set rollout percentages. | `src/app/admin/features/page.tsx` |
| 12.9 | **Audit log viewer** | Search/filter audit trail. | `src/app/admin/audit/page.tsx` |
| 12.10 | **Platform analytics** | GMV, active providers, booking volume, category performance. | `src/app/admin/analytics/page.tsx` |

**Estimated Effort**: 14–21 days

---

### M13: Production Hardening (Priority: HIGH — before launch)

**Goal**: Security, performance, and reliability for production.

#### Steps

| # | Task | Details |
|---|------|---------|
| 13.1 | **RLS policies on ALL tables** | Write and test row-level security for every table. Providers see own data, customers see own bookings, etc. |
| 13.2 | **Rate limiting** | API route rate limiting (per user, per IP). Prevent abuse of booking creation, message sending. |
| 13.3 | **Input validation** | Zod schemas for all server actions and API routes. Sanitize user inputs. |
| 13.4 | **Error monitoring** | Sentry integration for server and client errors. |
| 13.5 | **Regenerate DB types** | Run `supabase gen types typescript` to get accurate generated types matching actual schema. |
| 13.6 | **Load testing** | Test concurrent bookings, message throughput, provider search. |
| 13.7 | **SMS integration** | Enable Africa's Talking for real OTP delivery. Test with Kenyan phone numbers. |
| 13.8 | **Image optimization** | Ensure all uploaded images go through optimization pipeline. Set storage limits. |
| 13.9 | **Backup & recovery** | Supabase point-in-time recovery. Document disaster recovery plan. |
| 13.10 | **GDPR/Data privacy** | Account deletion flow (cascade all data), data export, privacy policy. |

**Estimated Effort**: 7–10 days

---

## 5. DB Tables Needed Per Milestone

| Milestone | Existing Tables Used | New Tables | New Columns |
|-----------|---------------------|------------|-------------|
| **M0** | Cleanup only | — | Maybe `instant_booking` on `service_providers` |
| **M1** | `bookings`, `locations`, `booking_status_history`, `booking_media`, `notifications` | — | — |
| **M2** | `bookings`, `booking_status_history`, `notifications` | — | — |
| **M3** | `booking_quotes`, `bookings`, `booking_status_history` | — | — |
| **M4** | `booking_messages`, `notifications` | — | — |
| **M5** | `bookings`, `booking_status_history`, `booking_media` | — | — |
| **M6** | `bookings` | `payments`, `provider_payouts` | `wallet_balance` + `total_earnings` on `service_providers` |
| **M7** | `reviews`, `review_helpful_votes`, `service_providers` | — | — |
| **M8** | `bookings`, `payments`, `reviews` (read-only aggregation) | — | — |
| **M9** | `notifications`, `user_preferences` | — | — |
| **M10** | `booking_disputes`, `blocked_users` | — | — |
| **M11** | `provider_vehicles`, `provider_driver_licenses` | — | — |
| **M12** | `provider_documents`, `feature_flags`, `system_announcements`, `audit_log`, `service_capabilities`, `service_verification_requirements` | — | — |
| **M13** | All tables (RLS) | — | — |

---

## 6. API Routes Needed Per Milestone

### Current API Routes Status

| Route | Current Status | Needed In |
|-------|---------------|-----------|
| `GET /api/services/providers` | ✅ Working | — |
| `GET /api/services/providers/[id]` | ✅ Working | — |
| `GET /api/services/providers/me` | ❌ 501 Stub | M0 |
| `GET,POST /api/services/saved` | ✅ Working | — |
| `GET,POST /api/services/bookings` | ❌ Does not exist | M1 |
| `GET /api/services/bookings/[id]` | ❌ Does not exist | M1 |
| `GET /api/services/jobs` | ❌ 501 Stub | M2 |
| `GET /api/services/jobs/[id]` | ❌ 501 Stub | M2 |
| `GET,POST /api/services/jobs/[id]/quotes` | ❌ 501 Stub | M3 |
| `GET,POST /api/services/jobs/[id]/messages` | ❌ 501 Stub | M4 |
| `POST /api/services/jobs/[id]/status` | ❌ Does not exist | M5 |
| `POST /api/payments/mpesa/initiate` | ❌ Does not exist | M6 |
| `POST /api/payments/mpesa/callback` | ❌ Does not exist | M6 |
| `GET,POST /api/services/jobs/[id]/review` | ❌ 501 Stub | M7 |
| `GET,PATCH,DELETE /api/notifications` | ✅ Working | M9 (enhance) |
| `POST /api/social-click` | ✅ Working | — |

### New Routes Required

| Route | Method | Milestone | Purpose |
|-------|--------|-----------|---------|
| `/api/services/providers/me` | GET | M0 | Current user's provider profile |
| `/api/services/bookings` | GET, POST | M1 | List + create bookings |
| `/api/services/bookings/[id]` | GET, PATCH | M1 | Get + update booking |
| `/api/services/bookings/[id]/cancel` | POST | M5 | Cancel booking |
| `/api/services/jobs` | GET | M2 | Provider's job list (replace stub) |
| `/api/services/jobs/[id]` | GET | M2 | Job detail (replace stub) |
| `/api/services/jobs/[id]/accept` | POST | M2 | Accept job |
| `/api/services/jobs/[id]/reject` | POST | M2 | Reject job |
| `/api/services/jobs/[id]/quotes` | GET, POST | M3 | Quote CRUD (replace stub) |
| `/api/services/jobs/[id]/messages` | GET, POST | M4 | Messages (replace stub) |
| `/api/services/jobs/[id]/status` | POST | M5 | Status transitions |
| `/api/services/jobs/[id]/media` | POST | M5 | Upload job photos |
| `/api/payments/mpesa/initiate` | POST | M6 | STK Push |
| `/api/payments/mpesa/callback` | POST | M6 | Payment confirmation webhook |
| `/api/payments/mpesa/query` | GET | M6 | Check payment status |
| `/api/services/jobs/[id]/review` | GET, POST | M7 | Review CRUD (replace stub) |
| `/api/services/jobs/[id]/dispute` | POST | M10 | Create dispute |
| `/api/admin/verifications` | GET, PATCH | M12 | Verification queue |
| `/api/admin/disputes` | GET, PATCH | M12 | Dispute management |

---

## Recommended Execution Order

```
Phase 1 — Foundation (Weeks 1-2)
├── M0: Critical Fixes & Cleanup          [3-5 days]
├── M13.5: Regenerate DB types             [1 day]
└── M13.1: RLS policies (core tables)     [2-3 days]

Phase 2 — Core Transaction Loop (Weeks 3-6)
├── M1: Customer Booking Request           [7-10 days]
├── M2: Provider Job Inbox & Response      [5-7 days]
└── M3: Quoting & Negotiation              [5-7 days]

Phase 3 — Communication & Lifecycle (Weeks 7-9)
├── M4: In-App Messaging                   [5-7 days]
├── M5: Job Lifecycle & Status             [7-10 days]
└── M9: Notifications & Real-Time          [7-10 days]

Phase 4 — Monetization (Weeks 10-12)
├── M6: Payment Integration (M-Pesa)       [10-14 days]
└── M8: Provider Analytics Dashboard       [5-7 days]

Phase 5 — Trust & Safety (Weeks 13-14)
├── M7: Review & Rating System             [5-7 days]
└── M10: Dispute Resolution                [4-5 days]

Phase 6 — Scale & Operate (Weeks 15-18)
├── M12: Admin Panel                        [14-21 days]
├── M11: Transport/Delivery Extensions      [5-7 days]
└── M13: Production Hardening (remaining)   [5-7 days]
```

**Total Estimated Effort**: 12–18 weeks (1 developer)

---

## Quick Reference: What to Build Next

If you're starting right now, the critical path is:

1. **M0** — Fix schema mismatches, add RLS, clean dead code
2. **M1** — Customer booking form (this unlocks everything)
3. **M2** — Provider job inbox (the other side of the marketplace)
4. **M3** — Quoting (how providers set prices per-job)
5. **M6** — M-Pesa payments (monetization)

Everything else can be built incrementally after these 5 milestones are complete.
