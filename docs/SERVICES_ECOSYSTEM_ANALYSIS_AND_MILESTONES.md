# Mitasafi Services Ecosystem — Complete Analysis & Implementation Milestones

**Date:** March 2, 2026  
**Scope:** Purely the Services marketplace system — Service Providers (sellers) and Service Customers (buyers). Zero rental/property content.  
**Methodology:** Exhaustive file-by-file code audit of every page, component, hook, lib function, API route, DB table, and migration related to services.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Service Provider Module (Seller Side)](#2-service-provider-module-seller-side)
3. [Service Customer Module (Buyer Side)](#3-service-customer-module-buyer-side)
4. [Shared Infrastructure](#4-shared-infrastructure)
5. [Database Tables — Services Only](#5-database-tables--services-only)
6. [API Routes — Services Only](#6-api-routes--services-only)
7. [Complete Gap Analysis](#7-complete-gap-analysis)
8. [Provider Module Milestones (SP-*)](#8-provider-module-milestones-sp)
9. [Customer Module Milestones (SC-*)](#9-customer-module-milestones-sc)
10. [Shared Infrastructure Milestones (SI-*)](#10-shared-infrastructure-milestones-si)
11. [Priority & Execution Order](#11-priority--execution-order)

---

## 1. System Overview

Mitasafi's services ecosystem is a **two-sided marketplace** (like Fiverr/Thumbtack) connecting:

- **Service Providers (Sellers)** — Plumbers, electricians, cleaners, movers, etc. in Nairobi
- **Service Customers (Buyers)** — Anyone who needs a service done

### User Journeys

```
SERVICE PROVIDER JOURNEY:
Sign up → Choose type (Individual/Business) → Verify phone → Verify identity
→ Set up profile (photo, bio, areas, hours, socials)  
→ Add services (categories, pricing, descriptions, images)
→ Receive booking requests → Send quotes → Get jobs confirmed
→ Schedule & execute jobs → Upload proof photos
→ Get paid via M-Pesa → Receive reviews → View earnings & analytics

SERVICE CUSTOMER JOURNEY:
Visit /services → Browse/search marketplace → View provider profiles
→ Compare providers → Choose provider → Request booking
→ Receive & accept/reject quote → Chat with provider → Pay via M-Pesa
→ Track job progress → Confirm completion → Leave review → Rebook
```

### Code Statistics

| Area | Files | Lines of Code |
|------|:-----:|:------------:|
| Provider Dashboard (seller) | ~55 | ~14,500 |
| Customer-facing (buyer) | ~50 | ~15,800 |
| Shared (types, lib, hooks) | ~20 | ~6,500 |
| **Total services ecosystem** | **~125** | **~36,800** |

---

## 2. Service Provider Module (Seller Side)

### 2.1 Feature Inventory

#### A. Onboarding & Verification

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| A1 | Provider type selection (Individual/Business) | ✅ Complete | `(auth)/onboarding/provider-type/page.tsx` (323 lines), `actions.ts` (145 lines) | Race-condition safe upsert |
| A2 | Phone verification via OTP | ✅ Complete | `verify-provider/PhoneVerificationForm.tsx` (394 lines), `actions.ts` (610 lines) | Rate limiting (3/15min), auto-advance, countdown |
| A3 | Identity document upload | ✅ Complete | `verify-provider/IdentityVerificationForm.tsx` (279 lines) | Individual: National ID + Selfie; Business: CR12 + KRA |
| A4 | Verification orchestrator | ✅ Complete | `verify-provider/page.tsx` (251 lines) | 3-step flow, auto-syncs auth phone |
| A5 | SMS delivery for OTP | ⚠️ Stub | `verify-provider/actions.ts` line 107 | **OTP logged to console, not sent.** Africa's Talking code commented out. `SMS_ENABLED` env var required |
| A6 | Manual identity review queue | ⚠️ Auto-approves | `verify-provider/actions.ts` | MVP auto-approves. Comment says "in production, set to pending for manual review" |

#### B. Dashboard Shell & Navigation

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| B1 | Sidebar with 9 nav items | ✅ Complete | `ProviderDashboardShell.tsx` (263 lines) | Dashboard, Jobs, Quotes, Messages, Services, Calendar, Availability, Earnings, Reviews |
| B2 | Profile dropdown (view/edit/settings/signout) | ✅ Complete | `ProviderDashboardShell.tsx` | All links wired to real routes |
| B3 | Dashboard layout + auth guard | ✅ Complete | `provider/layout.tsx` (96 lines) | Role check + business_type check |
| B4 | Dashboard home (stats + recent jobs) | ✅ Complete | `provider/page.tsx` (287 lines) | 4 stat cards, recent jobs list, social traffic card |
| B5 | Social traffic analytics card | ✅ Complete | `SocialTrafficCard.tsx` (117 lines) | Per-platform click stats from DB |
| B6 | Notification bell in header | ⚠️ Partial | `ProviderDashboardShell.tsx` | **Shows unread dot but clicking does nothing** — no handler |

#### C. Profile Management

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| C1 | Profile setup wizard (5-step) | ✅ Complete | `ProfileSetupWizard.tsx` (230 lines) | Photo → Basics → Areas → Hours → Socials |
| C2 | Profile photo upload + compression | ✅ Complete | `ProfilePhotoUpload.tsx` (230 lines) | Client-side resize to 800×800, JPG/PNG/WebP |
| C3 | Basics form (headline, bio, experience) | ✅ Complete | `ProfileBasicsForm.tsx` (216 lines) | |
| C4 | Service areas (neighborhoods by cluster) | ✅ Complete | `ServiceAreasForm.tsx` (298 lines) | Multi-select, base location, radius slider |
| C5 | Working hours + emergency availability | ✅ Complete | `WorkingHoursForm.tsx` (413 lines) | Weekly schedule, templates, surcharge config |
| C6 | Social links (6 platforms) | ✅ Complete | `SocialLinksForm.tsx` (186 lines) | WhatsApp, Instagram, Facebook, X, TikTok, YouTube |
| C7 | Server actions (12+ actions) | ✅ Complete | `profile/actions.ts` (990 lines) | All wired to Supabase |

#### D. Service Management

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| D1 | Service listing grid with cards | ✅ Complete | `ServicesGrid.tsx` (434 lines) | Toggle active, delete with confirm, optimistic |
| D2 | Add service wizard (6-step) | ✅ Complete | 10 files (~1,700 lines total) | Category → Services → Pricing → Areas → Description/Images → Review |
| D3 | Service preview (marketplace-style) | ✅ Complete | `ServicePreviewClient.tsx` (778 lines) | Fiverr/Thumbtack style, lightbox, stats |
| D4 | Service edit form | ✅ Complete | `ServiceEditForm.tsx` (287 lines) | Price, description, images. Change detection |
| D5 | Service image upload/delete | ✅ Complete | `services/actions.ts` (840 lines) | Supabase Storage, max 3 images |
| D6 | Empty state | ✅ Complete | `ServicesEmptyState.tsx` (49 lines) | CTA to add services |
| D7 | Service areas from wizard not persisted | ⚠️ Gap | Wizard step 4 | Areas selected in wizard may not save to `provider_service_areas` correctly |

#### E. Jobs / Booking Management

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| E1 | Jobs list (tabbed: Pending/Quoting/Active/Completed/All) | ✅ Complete | `jobs/page.tsx` (340 lines) | Per-tab counts |
| E2 | Job detail page | ✅ Complete | `jobs/[id]/page.tsx` (500 lines) | Full view: status, actions, customer card, chat, photos, timeline |
| E3 | Accept/Reject booking | ✅ Complete | `jobs/[id]/actions.ts` (394 lines) | Status transitions + notifications |
| E4 | Context-sensitive action buttons | ✅ Complete | `JobActionButtons.tsx` (558 lines) | Accept, Quote, Decline, Schedule, Start, Complete, Cancel |
| E5 | Schedule job form | ✅ Complete | `schedule/ScheduleJobForm.tsx` (222 lines) | Date + time selectors (30-min slots 06:00–22:00) |
| E6 | Start/Complete/Cancel lifecycle | ✅ Complete | via `booking-lifecycle.ts` | All transitions wired |

#### F. Quote Management

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| F1 | Quote creation form | ✅ Complete | `QuoteForm.tsx` (444 lines) | Multi-row breakdown, auto-total, validity period |
| F2 | Quote submission server action | ✅ Complete | `quote/actions.ts` (354 lines) | Two-step transition, revision support, DB constraints |
| F3 | Quotes list page | ✅ Complete | `quotes/page.tsx` (155 lines) | Stats row + status badges + revision indicators |
| F4 | Quote page (create/revise) | ✅ Complete | `quote/page.tsx` (177 lines) | Pre-populates for revisions |

#### G. Messages

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| G1 | Conversations list | ✅ Complete | `messages/page.tsx` (268 lines) | Unread counts, last message, customer avatars |
| G2 | Chat in job detail | ✅ Complete | via `BookingChat` component | Realtime, read receipts |

#### H. Calendar

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| H1 | Week view calendar | ✅ Complete | `CalendarView.tsx` (200 lines) | 7-day grid, status-colored cards, prev/next nav |
| H2 | Calendar page | ✅ Complete | `calendar/page.tsx` (97 lines) | Accepts `?week=` param |

#### I. Availability

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| I1 | Standalone availability editor | ✅ Complete | `AvailabilityClient.tsx` (305 lines) | Weekly schedule + templates + emergency toggle |
| I2 | Availability page | ✅ Complete | `availability/page.tsx` (47 lines) | Fetches working hours |

#### J. Earnings

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| J1 | Earnings overview (wallet, monthly, total, pending) | ✅ Complete | `earnings/page.tsx` (325 lines) | Transaction history with status badges |
| J2 | Payout request (M-Pesa withdrawal) | ✅ Complete | `PayoutForm.tsx` (257 lines) | Phone validation, min KES 100 |
| J3 | Payout page | ✅ Complete | `earnings/payout/page.tsx` (80 lines) | Balance check, redirect if < KES 100 |

#### K. Reviews

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| K1 | Reviews page with summary | ✅ Complete | `ProviderReviewsClient.tsx` (601 lines) | Rating distribution, dimension averages, filter/sort |
| K2 | Provider response to reviews | ✅ Complete | `ProviderReviewsClient.tsx` | Textarea + submit, wired to server action |
| K3 | Reviews actions | ✅ Complete | `reviews/actions.ts` (17 lines) | Re-exports from lib |

#### L. Settings

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| L1 | Settings page | ❌ Stub | `settings/page.tsx` (178 lines) | **Comment says "Stub page with basic settings"** |
| L2 | Notification preferences toggles | ❌ Visual-only | `settings/page.tsx` | Checkboxes with **no onChange handlers** |
| L3 | Deactivate account button | ❌ Visual-only | `settings/page.tsx` | **No onClick handler** |
| L4 | Change password link | ✅ Complete | `settings/page.tsx` | Links to `/auth/reset-password` |

---

## 3. Service Customer Module (Buyer Side)

### 3.1 Feature Inventory

#### A. Service Discovery & Browsing

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| A1 | Service marketplace page (SSR) | ✅ Complete | `app/services/page.tsx` (408 lines) | Parallel fetch, 12+ URL filter params |
| A2 | Category quick nav (Fiverr-style sticky) | ✅ Complete | `CategoryQuickNav.tsx` (290 lines) | 3 variants, auto-scroll to active |
| A3 | Search autocomplete (3 variants) | ✅ Complete | `ServiceSearchAutocomplete.tsx` (732 lines) | API suggestions + local recent + category matching |
| A4 | Search suggestions API | ✅ Complete | `api/services/search/suggestions/route.ts` (164 lines) | ILIKE + keywords, relevance-sorted |
| A5 | Filter sidebar (6 filter types) | ✅ Complete | `ServiceFilterSidebar.tsx` (776 lines) | Category, subcategory, area, price, rating, features + mobile drawer |
| A6 | Provider results grid | ✅ Complete | `ProvidersGrid.tsx` (208 lines) | 3-column responsive, pagination, empty state |
| A7 | Provider card (psychology-optimized) | ✅ Complete | `ProviderCard.tsx` (471 lines) | Tier badges, save/share, price anchoring, trust stats |
| A8 | Featured providers carousel | ✅ Complete | `FeaturedProviders.tsx` (100 lines) | Enterprise/premium tier only |
| A9 | Featured by price tiers | ✅ Complete | `FeaturedByPrice.tsx` (294 lines) | 4 price tabs (Under 5k through Above 30k) |
| A10 | Suggested tags (category-aware) | ✅ Complete | `SuggestedTags.tsx` (224 lines) | 8 category suggestion sets (**hardcoded**) |
| A11 | Sort dropdown (6 options) | ✅ Complete | `SortDropdown.tsx` (~100 lines) | URL-synced |
| A12 | URL-synced filter state management | ✅ Complete | `useServicesSearch.ts` (309 lines) | 12 setters, clear, active count |
| A13 | Provider comparison (up to 3) | ⚠️ Partial | `CompareProviders.tsx` (623 lines) | Full context + modal + localStorage. **But CompareButton is NOT rendered in ProviderCard** |
| A14 | Area filtering (server-side) | ⚠️ Broken | `providers.ts` | Sidebar renders area checkboxes, but `service_areas` always `[]` — no join to `provider_service_areas` |
| A15 | Full-text search | ⚠️ Basic | `providers.ts` | ILIKE on business_name/tagline/bio — no `tsvector`/`tsquery` index |
| A16 | Price filtering | ⚠️ In-memory | `providers.ts` | Applied after DB pagination — count mismatch |
| A17 | Recently viewed tracking | ✅ Complete | `useRecentlyViewed.ts` (229 lines) | localStorage, 30-day expiry, max 12 |
| A18 | Save provider (heart icon) | ✅ Complete | `ProviderCard.tsx` + `providers.ts` | `saved_providers` table + localStorage |
| A19 | Category grid component | ✅ Complete | `CategoryGrid.tsx` (327 lines) | 3 variants — available but not used on main page |
| A20 | Portfolio gallery + lightbox | ✅ Complete | `PortfolioGallery.tsx` (200 lines) | Keyboard nav, thumbnails |
| A21 | Social links with click tracking | ✅ Complete | `SocialLinksSection.tsx` (~140 lines) | `navigator.sendBeacon` |

#### B. Provider Profile (Customer View)

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| B1 | Provider detail page (SSR) | ✅ Complete | `provider/[id]/page.tsx` (724 lines) | 3 parallel fetches, dynamic metadata |
| B2 | Hero (photo, rating, stats, location) | ✅ Complete | Inline in page | Tier-aware styling |
| B3 | Credentials & verification badges | ✅ Complete | Inline | |
| B4 | About/Bio section | ✅ Complete | Inline | |
| B5 | Portfolio gallery + lightbox | ✅ Complete | `PortfolioGallery.tsx` | |
| B6 | Services & pricing table | ✅ Complete | Inline | Per-service "Request" CTA links |
| B7 | Reviews with helpful votes + report | ✅ Complete | Inline | |
| B8 | Availability schedule | ✅ Complete | Inline | RRULE parsing |
| B9 | Social links | ✅ Complete | `SocialLinksSection.tsx` | |
| B10 | Similar providers | ✅ Complete | Inline | Category-based matching |
| B11 | Contact sidebar (WhatsApp/phone) | ✅ Complete | Inline | Sticky desktop sidebar |
| B12 | Mobile sticky CTA bar | ✅ Complete | Inline | |
| B13 | "Show all reviews" pagination | ⚠️ Stub | Inline | **Button exists, no onClick handler** |
| B14 | Own-profile detection ("Edit Profile") | ✅ Complete | Inline | |

#### C. Booking Request Flow

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| C1 | Booking request page (auth-gated) | ✅ Complete | `provider/[id]/request/page.tsx` (~150 lines) | Self-booking prevention |
| C2 | 5-step booking form | ✅ Complete | `BookingRequestForm.tsx` (680 lines) | Service → Location → Schedule → Details → Review |
| C3 | Location picker (saved + new) | ✅ Complete | `LocationPicker.tsx` (322 lines) | Nairobi area dropdown, access instructions, save-for-later |
| C4 | Booking creation server action | ✅ Complete | `request/actions.ts` (340 lines) | Full chain: validate → location → INSERT booking → status_history → notify |
| C5 | Booking confirmation page | ✅ Complete | `bookings/[id]/confirmation/page.tsx` (140 lines) | "What happens next" steps |
| C6 | Emergency booking flag | ✅ Complete | BookingRequestForm | Toggle → sets `booking_flow_type` |

#### D. Customer Dashboard (Service Bookings)

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| D1 | Bookings list (tabs + counts) | ✅ Complete | `dashboard/bookings/page.tsx` (~250 lines) | Active/Completed/All, unread message badges |
| D2 | Booking detail page | ✅ Complete | `dashboard/bookings/[id]/page.tsx` (375 lines) | Status banner, actions, provider card, chat, photos, timeline |
| D3 | Customer lifecycle actions | ✅ Complete | `CustomerBookingActions.tsx` (335 lines) | Confirm completion, cancel with reason, review CTA |
| D4 | Conversations list | ✅ Complete | `dashboard/bookings/messages/page.tsx` (326 lines) | All chats, unread counts, last message |
| D5 | Dashboard home (service-specific) | ❌ Missing | `dashboard/page.tsx` | **Tenant view is a placeholder.** No service booking shortcuts, no active bookings widget, no quick actions |
| D6 | Saved providers page | ❌ Missing | — | API exists (`/api/services/saved`), **no UI page** to view saved providers |
| D7 | Dispute filing | ❌ Missing | `CustomerBookingActions.tsx` line 235 | TODO comment: "M6+ dispute flow" |

#### E. Quote Flow (Customer Side)

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| E1 | View quote page | ✅ Complete | `bookings/[id]/quote/page.tsx` (~200 lines) | Breakdown, description, validity |
| E2 | Accept quote (server action) | ✅ Complete | `quote/actions.ts` (397 lines) | Status transition + notification |
| E3 | Reject quote with reason | ✅ Complete | `QuoteActions.tsx` (~120 lines) + `actions.ts` | |
| E4 | Auto-mark quote as viewed | ✅ Complete | Quote page | On render |

#### F. Payment (M-Pesa)

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| F1 | Payment page (order summary) | ✅ Complete | `bookings/[id]/payment/page.tsx` (306 lines) | Commission breakdown, history |
| F2 | STK Push form + polling UI | ✅ Complete | `PaymentForm.tsx` (330 lines) | Phone input → Poll 3s×60 |
| F3 | Initiate API route | ✅ Complete | `api/payments/mpesa/initiate/route.ts` (65 lines) | Zod validation |
| F4 | Callback webhook | ✅ Complete | `api/payments/mpesa/callback/route.ts` (73 lines) | Idempotent, always 200 |
| F5 | Query API route | ✅ Complete | `api/payments/mpesa/query/route.ts` (55 lines) | Polling support |
| F6 | Payment server actions | ✅ Complete | `lib/services/payments.ts` (1,065 lines) | Full lifecycle: initiate → callback → wallet credit |
| F7 | M-Pesa Daraja client | ✅ Complete | `lib/payments/mpesa.ts` (424 lines) | OAuth2, STK Push, sandbox/production |
| F8 | Commission calculation | ✅ Complete | `lib/payments/commission.ts` (~50 lines) | 10%, KES 50 min, KES 5,000 max |
| F9 | M-Pesa env vars configured | ❌ Needs Config | — | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_CALLBACK_URL` |
| F10 | Refund processing | ❌ Missing | — | `refunded_at` field exists, no logic |

#### G. Chat / Messaging

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| G1 | Realtime chat (Supabase Realtime) | ✅ Complete | `useBookingMessages.ts` (~250 lines) | Subscription, optimistic sends, cursor pagination |
| G2 | Chat thread UI | ✅ Complete | `ChatThread.tsx` (314 lines) | Bubbles, date separators, read receipts |
| G3 | Message input | ✅ Complete | `MessageInput.tsx` (~120 lines) | Auto-resize, Enter-to-send |
| G4 | Chat container | ✅ Complete | `BookingChat.tsx` (~120 lines) | Connection indicator, status-based disable |
| G5 | Messages API route | ✅ Complete | `api/services/jobs/[id]/messages/route.ts` (207 lines) | GET/POST, mark-read, notifications |

#### H. Reviews (Customer Side)

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| H1 | Review form (multi-step) | ✅ Complete | `ReviewForm.tsx` (493 lines) | Stars + 5 dimensions + title + text + photos |
| H2 | Review page (auth-gated) | ✅ Complete | `bookings/[id]/review/page.tsx` (~100 lines) | Status check, duplicate prevention |
| H3 | Helpful vote | ✅ Complete | `ReviewHelpfulVote.tsx` (~100 lines) | Optimistic toggle |
| H4 | Report review | ✅ Complete | `ReportReviewButton.tsx` (~80 lines) | Reason textarea |
| H5 | Review API route | ✅ Complete | `api/services/jobs/[id]/review/route.ts` (107 lines) | GET/POST |
| H6 | Review server actions | ✅ Complete | `lib/services/reviews.ts` (954 lines) | Full CRUD, rating recalc, moderation flags |

#### I. Status Tracking & Media

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| I1 | Status timeline | ✅ Complete | `StatusTimeline.tsx` (~180 lines) | Icons, timestamps, actor roles |
| I2 | Job photos (stage-based) | ✅ Complete | `JobPhotos.tsx` (351 lines) | Before/during/after/proof/issue |
| I3 | Media upload API | ✅ Complete | `api/services/jobs/[id]/media/route.ts` (264 lines) | Storage + DB row |

---

## 4. Shared Infrastructure

### 4.1 Booking Lifecycle Engine

| File | Lines | Status |
|------|------:|--------|
| `lib/services/booking-lifecycle.ts` | 678 | ✅ Complete |
| `lib/services/bookings.ts` | 511 | ✅ Complete |

**25-state booking state machine** with DB trigger enforcement (`validate_booking_status_transition`). Provider actions: schedule, start, complete, partial-complete, cancel. Customer actions: confirm completion, cancel with reason.

### 4.2 Quote Engine

| File | Lines | Status |
|------|------:|--------|
| `lib/services/quotes.ts` | 278 | ✅ Complete |

Full quote lifecycle: create → view → accept/reject → revise → supersede.

### 4.3 Notification Engine

| File | Lines | Status |
|------|------:|--------|
| `lib/notifications/triggers.ts` | 629 | ✅ Complete (in-app only) |

**18 notification triggers** covering every booking milestone (M1–M7). Each specifies `inApp`/`email`/`sms` channel flags, but **only `inApp` actually delivers** — email and SMS sending is not implemented for booking events.

### 4.4 Type System

| File | Lines | Status |
|------|------:|--------|
| `types/bookings.ts` | 423 | ✅ Complete |
| `types/payments.ts` | 320 | ✅ Complete |
| `types/reviews.ts` | 222 | ✅ Complete |
| `types/service-providers.ts` | 492 | ✅ Complete |

### 4.5 Type Safety Issue

5 lib files and 4 API routes use the `asDb()` type-erasure workaround (`const asDb = (client: any) => client`) because the auto-generated `database.ts` doesn't include booking/payment/review tables. Every Supabase query to these tables loses TypeScript type safety.

---

## 5. Database Tables — Services Only

### Active Tables (in use by code)

| Table | Used By | Purpose |
|-------|---------|---------|
| `service_providers` | Provider profile, marketplace | Business info, wallet, rating, verification |
| `provider_services` | Service CRUD, marketplace | Provider ↔ service mapping with pricing |
| `services` | Service catalog | Service definitions |
| `service_types` | Booking flow routing | Flow type per service |
| `service_categories` | Browsing, filtering | Category hierarchy (level 1) |
| `service_subcategories` | Browsing, filtering | Subcategory hierarchy (level 2) |
| `provider_availability_intervals` | Working hours | RRULE-based availability |
| `provider_service_areas` | Profile setup | Neighborhoods served |
| `neighborhoods` | Area selection | Nairobi neighborhood data |
| `bookings` | All booking flows | Universal booking record |
| `booking_status_history` | Timeline | Audit trail of status transitions |
| `booking_quotes` | Quote flow | Provider quotes with breakdowns |
| `booking_messages` | Chat | In-app messaging (Realtime) |
| `booking_media` | Job photos | Before/during/after photos |
| `booking_payments` | M-Pesa | Payment transactions |
| `provider_payouts` | Earnings | Withdrawal records |
| `locations` | Booking addresses | Reusable saved locations |
| `reviews` | Review flow | Ratings + dimensions + text + photos |
| `review_helpful_votes` | Vote widget | Unique vote per user per review |
| `saved_providers` | Save/favorite | Customer ↔ provider favorites |
| `notifications` | Event triggers | In-app notifications |
| `profiles` | Auth, display | User profile data |
| `user_roles` | Auth, routing | Multi-role assignments |
| `social_link_clicks` | Analytics | Social link click tracking |
| `phone_verifications` | OTP flow | OTP codes + attempts |
| `provider_documents` | Verification | Uploaded identity documents |

### Tables That Exist But Have No UI

| Table | Status | Needed For |
|-------|--------|------------|
| `booking_disputes` | Schema only | Dispute filing (planned) |
| `user_preferences` | Schema only | Notification preferences |
| `blocked_users` | Schema only | User blocking |

### Materialized Views

| View | Purpose |
|------|---------|
| `services_with_categories` | Pre-joined services + subcategories + categories for fast reads |

### Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `provider-documents` | Profile photos, service images, identity docs, review photos |
| `booking-media` | Job phase photos (before/during/after) |

---

## 6. API Routes — Services Only

### Fully Implemented

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/services/search/suggestions` | GET | No | Autocomplete |
| `/api/services/providers` | GET | No | List providers |
| `/api/services/providers/[id]` | GET | No | Provider detail |
| `/api/services/providers/[id]/reviews` | GET | No | Provider reviews |
| `/api/services/providers/me` | GET | Yes | Current provider profile |
| `/api/services/bookings` | GET/POST | Yes | Customer bookings CRUD |
| `/api/services/saved` | GET/POST | Yes | Saved providers toggle |
| `/api/services/categories` | GET | No | Service categories |
| `/api/services/jobs/[id]/messages` | GET/POST | Yes | Chat messages |
| `/api/services/jobs/[id]/quotes` | GET/POST | Yes | Quotes |
| `/api/services/jobs/[id]/quotes/[quoteId]/accept` | POST | Yes | Accept quote |
| `/api/services/jobs/[id]/review` | GET/POST | Yes | Reviews |
| `/api/services/jobs/[id]/media` | POST/DELETE | Yes | Photo upload/delete |
| `/api/payments/mpesa/initiate` | POST | Yes | STK Push |
| `/api/payments/mpesa/callback` | POST | No | Safaricom webhook |
| `/api/payments/mpesa/query` | GET | Yes | Payment status |
| `/api/social-click` | POST | No | Social link tracking |

### 501 Stubs (Not Implemented)

| Route | Purpose | Why Needed |
|-------|---------|------------|
| `/api/services/jobs` | GET/POST | Jobs list — currently pages use server actions directly |
| `/api/services/jobs/[id]` | GET/PATCH | Job detail/update — same, server actions bypass this |

### Missing Routes

| Route | Purpose | Milestone |
|-------|---------|-----------|
| `POST /api/services/bookings/[id]/dispute` | File dispute | SP-5 |
| `POST /api/payments/refund` | Process refund | SP-5 |
| `PATCH /api/services/providers/me/settings` | Update notification preferences | SP-3 |
| `DELETE /api/services/providers/me` | Deactivate account | SP-3 |

---

## 7. Complete Gap Analysis

### Provider Module Gaps

| # | Gap | Severity | Current State |
|---|-----|----------|---------------|
| SP-G1 | **Settings page is a visual stub** — notification toggles have no handlers, deactivate button does nothing | HIGH | 178 lines of non-functional UI |
| SP-G2 | **Notification bell has no click handler** | MEDIUM | Shows dot indicator, click does nothing |
| SP-G3 | **SMS OTP not sent** — logged to console only | HIGH (production) | Africa's Talking code commented out |
| SP-G4 | **Identity verification auto-approves** — no review queue | MEDIUM (MVP) | Comment says "pending for production" |
| SP-G5 | **Service wizard areas may not persist** | LOW | Step 4 areas may not save to `provider_service_areas` |
| SP-G6 | **Orphaned images on service delete** | LOW | Storage images not cleaned up when service deleted |
| SP-G7 | **No per-service review viewing** | LOW | Reviews page shows all reviews, can't filter by specific service |
| SP-G8 | **`featured_providers` filtering empty** | LOW | In-memory post-fetch instead of SQL filter |
| SP-G9 | **Provider analytics page missing** | MEDIUM | Dashboard has basic stats, no detailed analytics/trends |
| SP-G10 | **`jobs.ts` lib file is empty** | LOW | 0 lines, placeholder |

### Customer Module Gaps

| # | Gap | Severity | Current State |
|---|-----|----------|---------------|
| SC-G1 | **No customer dashboard home for services** | HIGH | `/dashboard` shows property-focused placeholder. No active bookings widget, spend summary, or quick actions for services |
| SC-G2 | **No saved providers page** | MEDIUM | Heart icon saves to DB, but no `/dashboard/saved-providers` page to view them |
| SC-G3 | **Area filtering broken** | MEDIUM | Sidebar shows area checkboxes; `service_areas` always `[]` in card data; no server-side join |
| SC-G4 | **Compare button not wired** | LOW | Full CompareProviders context/modal built (623 lines), but CompareButton not rendered in ProviderCard |
| SC-G5 | **"Show all reviews" button is a dead button** | LOW | On provider profile, button exists with no handler |
| SC-G6 | **Price filter pagination mismatch** | LOW | Applied in-memory after DB pagination — page may show fewer items than expected |
| SC-G7 | **No dispute filing flow** | MEDIUM | `booking_disputes` table exists, TODO in CustomerBookingActions |
| SC-G8 | **No refund processing** | MEDIUM | `refunded_at` field exists, no logic or UI |
| SC-G9 | **Suggested tags hardcoded** | LOW | No DB-driven suggestions |
| SC-G10 | **Full-text search uses ILIKE** | MEDIUM | No GIN index on `service_providers`, won't scale |

### Shared Infrastructure Gaps

| # | Gap | Severity | Current State |
|---|-----|----------|---------------|
| SI-G1 | **Booking emails not implemented** | HIGH | 18 notification triggers mark `email: true`, but no booking email templates exist. Only listing-related emails work (via Resend) |
| SI-G2 | **SMS notifications not implemented** | HIGH | Flags exist (`sms: true`), no gateway integration |
| SI-G3 | **Database types stale** | MEDIUM | `database.ts` missing booking/payment/review tables. 5 lib files + 4 API routes use `asDb()` workaround |
| SI-G4 | **No admin moderation for flagged reviews** | LOW | Customers can flag, admin can't see or act on flags |
| SI-G5 | **No admin moderation for disputes** | LOW | Table exists, no admin UI |
| SI-G6 | **M-Pesa env vars not configured** | HIGH (production) | Code complete, needs sandbox/live credentials |

---

## 8. Provider Module Milestones (SP-*)

### SP-1: Provider Settings — Wire the Stub
**Priority:** HIGH | **Effort:** 2 days | **Depends on:** Nothing

The settings page (178 lines) exists as pure visual HTML with no interactivity. This milestone wires it to real functionality.

| # | Task | Details |
|---|------|---------|
| 1.1 | Create settings server actions | New file `src/app/dashboard/provider/settings/actions.ts`: `getNotificationPreferences()`, `updateNotificationPreferences()`, `deactivateAccount()` |
| 1.2 | Wire notification toggles | Add `onChange` handlers to email/SMS/push checkboxes → call `updateNotificationPreferences` |
| 1.3 | Wire deactivate account button | Add confirmation modal + `onClick` → call `deactivateAccount` (sets `is_active=false`, `account_status='deactivated'`) |
| 1.4 | Add notification preferences API | `PATCH /api/services/providers/me/settings` (or server action) |
| 1.5 | Create re-activation flow | If deactivated provider logs in, show re-activation prompt |

**Files to create:**
| File | Purpose |
|------|---------|
| `src/app/dashboard/provider/settings/actions.ts` | Server actions (~200 lines) |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/dashboard/provider/settings/page.tsx` | Add onChange handlers, useTransition, server action calls |

**DB query:**
```sql
-- Read/write user_preferences table
SELECT * FROM user_preferences WHERE user_id = $1;
INSERT INTO user_preferences (user_id, notification_email, notification_sms, notification_push)
VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET ...;
```

---

### SP-2: Notification Bell + Notification Center
**Priority:** MEDIUM | **Effort:** 1 day | **Depends on:** Nothing

| # | Task | Details |
|---|------|---------|
| 2.1 | Wire bell click to open dropdown | Import existing `NotificationCenter` component into `ProviderDashboardShell.tsx` |
| 2.2 | OR create provider-specific notification dropdown | If existing component doesn't fit, build a lightweight version using `useNotifications` hook |

**Note:** `NotificationCenter.tsx` already exists in `components/shared/` and is used in the customer Navbar. The provider dashboard shell just needs to use it instead of the bare bell icon.

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/dashboard/provider/ProviderDashboardShell.tsx` | Replace bare bell button with `NotificationCenter` component |

---

### SP-3: SMS OTP Delivery
**Priority:** HIGH (production) | **Effort:** 1 day | **Depends on:** Africa's Talking account setup

| # | Task | Details |
|---|------|---------|
| 3.1 | Create SMS service module | `src/lib/sms/index.ts` — Africa's Talking client with sandbox/production switching |
| 3.2 | Uncomment + wire SMS sending | In `verify-provider/actions.ts`, replace console.log with actual SMS send |
| 3.3 | Add env vars | `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`, `SMS_ENABLED=true` |
| 3.4 | Rate limiting for SMS costs | Already exists (3/15min), verify it works |

**Files to create:**
| File | Purpose |
|------|---------|
| `src/lib/sms/index.ts` | Africa's Talking SMS client (~100 lines) |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/dashboard/verify-provider/actions.ts` | Replace console.log with SMS send call |

---

### SP-4: Provider Analytics Page
**Priority:** LOW | **Effort:** 2-3 days | **Depends on:** None

| # | Task | Details |
|---|------|---------|
| 4.1 | Create analytics page | `src/app/dashboard/provider/analytics/page.tsx` |
| 4.2 | Jobs trend chart | Monthly completed jobs (last 6 months) |
| 4.3 | Revenue trend chart | Monthly earnings (last 6 months) |
| 4.4 | Rating trend | Rating changes over time |
| 4.5 | Top services by revenue | Which services earn most |
| 4.6 | Conversion funnel | Requests → Quoted → Accepted → Completed |
| 4.7 | Response time tracking | Average time to first response |

**Files to create:**
| File | Purpose |
|------|---------|
| `src/app/dashboard/provider/analytics/page.tsx` | Analytics page (~150 lines) |
| `src/app/dashboard/provider/analytics/AnalyticsDashboard.tsx` | Charts client component (~500 lines) |
| `src/app/dashboard/provider/analytics/actions.ts` | Data queries (~300 lines) |

**DB queries:**
```sql
-- Monthly completed jobs
SELECT date_trunc('month', completed_at) as month, COUNT(*) 
FROM bookings WHERE provider_id = $1 AND status IN ('completed','customer_confirmed')
GROUP BY month ORDER BY month DESC LIMIT 6;

-- Conversion funnel
SELECT 
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status NOT IN ('submitted','cancelled_customer')) as viewed,
  COUNT(*) FILTER (WHERE status IN ('quote_sent','quote_accepted','confirmed','scheduled','in_progress','completed','customer_confirmed')) as quoted,
  COUNT(*) FILTER (WHERE status IN ('completed','customer_confirmed')) as completed
FROM bookings WHERE provider_id = $1;
```

---

### SP-5: Minor Fixes (Bundle)
**Priority:** LOW | **Effort:** 1 day | **Depends on:** None

| # | Task | File | Details |
|---|------|------|---------|
| 5.1 | Clean up orphaned images on service delete | `services/actions.ts` | Before deleting `provider_services` row, delete images from Storage |
| 5.2 | Verify service wizard area persistence | `services/new/` | Ensure Step4 areas save to `provider_service_areas` on submit |
| 5.3 | Delete empty `lib/services/jobs.ts` | `lib/services/jobs.ts` | Remove 0-line file |
| 5.4 | Implement or remove 501 stub API routes | `api/services/jobs/route.ts`, `api/services/jobs/[id]/route.ts` | Either implement GET (backed by `bookings.ts`) or remove if server actions suffice |

---

## 9. Customer Module Milestones (SC-*)

### SC-1: Customer Services Dashboard Home
**Priority:** CRITICAL | **Effort:** 3 days | **Depends on:** Nothing

The current `/dashboard` page shows a property-tenant placeholder. Customers who use services need a dedicated home with service-specific content.

| # | Task | Details |
|---|------|---------|
| 1.1 | Build service customer dashboard layout | New page content in `dashboard/page.tsx` for users with active bookings |
| 1.2 | Active bookings widget | Top 3 active service bookings with status, provider name, next action CTA |
| 1.3 | Quick actions bar | "Browse Services", "My Bookings", "Messages" (with unread count), "Saved Providers" |
| 1.4 | Recent activity feed | Last 10 events from `booking_status_history` + `notifications` |
| 1.5 | Upcoming schedule widget | Next 3 scheduled bookings with date/time/provider |
| 1.6 | Spend summary card | This month total, payment count, pending |
| 1.7 | Dashboard data fetch function | New `getServiceCustomerDashboard()` in `lib/services/dashboard.ts` |

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/lib/services/dashboard.ts` | Dashboard data queries | ~250 |
| `src/components/dashboard/services/ActiveBookingsWidget.tsx` | Active bookings card | ~200 |
| `src/components/dashboard/services/QuickActions.tsx` | Action buttons | ~80 |
| `src/components/dashboard/services/ActivityFeed.tsx` | Activity timeline | ~250 |
| `src/components/dashboard/services/UpcomingSchedule.tsx` | Upcoming bookings | ~150 |
| `src/components/dashboard/services/SpendSummary.tsx` | Spend stats | ~150 |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/dashboard/page.tsx` | Replace placeholder with service dashboard widgets for users with booking history |

**DB queries needed:**
```sql
-- Active service bookings
SELECT b.*, sp.business_name, sp.logo_url, sp.average_rating,
       s.name as service_name
FROM bookings b
JOIN service_providers sp ON b.provider_id = sp.id
JOIN provider_services ps ON b.provider_service_id = ps.id
JOIN services s ON ps.service_id = s.id
WHERE b.customer_id = $1
  AND b.status NOT IN ('completed','customer_confirmed','cancelled_customer',
                        'cancelled_provider','abandoned','resolved')
ORDER BY b.created_at DESC LIMIT 3;

-- Spend summary (this month)
SELECT 
  COUNT(*) FILTER (WHERE bp.created_at >= date_trunc('month', now())) as payments_this_month,
  COALESCE(SUM(bp.amount) FILTER (WHERE bp.created_at >= date_trunc('month', now()) 
    AND bp.status = 'completed'), 0) as spent_this_month,
  COUNT(*) FILTER (WHERE bp.status = 'pending') as pending_payments
FROM booking_payments bp
JOIN bookings b ON bp.booking_id = b.id
WHERE b.customer_id = $1;

-- Upcoming scheduled bookings
SELECT b.*, sp.business_name, sp.logo_url, s.name as service_name
FROM bookings b
JOIN service_providers sp ON b.provider_id = sp.id
JOIN provider_services ps ON b.provider_service_id = ps.id
JOIN services s ON ps.service_id = s.id
WHERE b.customer_id = $1
  AND b.status IN ('confirmed','scheduled')
  AND b.scheduled_date >= now()
ORDER BY b.scheduled_date ASC LIMIT 3;
```

---

### SC-2: Saved Providers Page
**Priority:** MEDIUM | **Effort:** 1 day | **Depends on:** Nothing

The API exists (`/api/services/saved`), the `saved_providers` table is active, the ProviderCard save button works. But there's no page to view saved providers.

| # | Task | Details |
|---|------|---------|
| 2.1 | Create saved providers page | `src/app/dashboard/saved-providers/page.tsx` — fetch saved providers, display grid |
| 2.2 | "Remove" button per card | Call `toggleSaveProvider` to un-save |
| 2.3 | "Book Again" CTA | Link to provider request page |
| 2.4 | Empty state | "No saved providers yet" with CTA to browse services |
| 2.5 | Add nav link | Add "Saved Providers" to dashboard sidebar/navigation |

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/app/dashboard/saved-providers/page.tsx` | Saved providers list | ~200 |

---

### SC-3: Fix Area Filtering
**Priority:** MEDIUM | **Effort:** 1-2 days | **Depends on:** Nothing

Area filter UI exists but is non-functional because `service_areas` in provider card data is always `[]`.

| # | Task | Details |
|---|------|---------|
| 3.1 | Join `provider_service_areas` in `getProviders()` | Add join to `provider_service_areas` → `neighborhoods` in the main providers query |
| 3.2 | Populate `service_areas` in card data | Instead of hardcoded `[]`, map from joined data |
| 3.3 | Apply server-side area filter | When `area` params exist, filter by `neighborhoods.name` IN (selected_areas) |
| 3.4 | Test with seeded data | Verify area tags appear on ProviderCard and filter works |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/lib/services/providers.ts` | Add join, populate `service_areas`, apply filter |

---

### SC-4: Wire Compare Button
**Priority:** LOW | **Effort:** 0.5 day | **Depends on:** Nothing

623 lines of CompareProviders code (context, bar, modal) already built. Just needs to be rendered.

| # | Task | Details |
|---|------|---------|
| 4.1 | Import `CompareButton` into `ProviderCard.tsx` | Render when `showCompare` prop is true |
| 4.2 | Pass `useCompare` context to ProviderCard | Wire `onCompareToggle` and `isCompared` from `CompareContext` |
| 4.3 | Test comparison flow | Select 2-3 providers, open modal, verify data |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/components/services/ProviderCard.tsx` | Import and render `CompareButton` |

---

### SC-5: Dispute & Refund Flow
**Priority:** MEDIUM | **Effort:** 3-4 days | **Depends on:** SC-1 (for dashboard navigation)

| # | Task | Details |
|---|------|---------|
| 5.1 | Create dispute filing form | Multi-step: reason selection → description → photo evidence (max 10) → desired resolution |
| 5.2 | Create dispute page | `dashboard/bookings/[id]/dispute/page.tsx` — auth gate, status check |
| 5.3 | Create dispute server actions | INSERT `booking_disputes`, UPDATE booking status to `disputed`, notify provider + admin |
| 5.4 | Wire "Raise Dispute" button | Replace TODO in `CustomerBookingActions.tsx` with link to dispute page |
| 5.5 | Create dispute status view | Show dispute timeline when booking is `disputed` |
| 5.6 | Create refund logic | Calculate refund amount based on completion percentage + dispute resolution |
| 5.7 | Dispute notification emails | Filed, updated, resolved — to both parties |

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/app/dashboard/bookings/[id]/dispute/page.tsx` | Dispute page | ~150 |
| `src/app/dashboard/bookings/[id]/dispute/actions.ts` | Server actions | ~250 |
| `src/components/booking/DisputeForm.tsx` | Multi-step form | ~400 |
| `src/components/booking/DisputeStatus.tsx` | Dispute timeline | ~150 |
| `src/lib/payments/refunds.ts` | Refund calculation | ~200 |

**DB changes:**
```sql
-- No new tables needed — booking_disputes already exists
-- Add if missing:
ALTER TABLE booking_disputes ADD COLUMN IF NOT EXISTS desired_resolution TEXT;
ALTER TABLE booking_disputes ADD COLUMN IF NOT EXISTS evidence_urls TEXT[];
```

---

### SC-6: Fix "Show All Reviews" Button
**Priority:** LOW | **Effort:** 0.5 day | **Depends on:** Nothing

| # | Task | Details |
|---|------|---------|
| 6.1 | Add onClick handler to "Show all N reviews" | Either: (a) expand reviews section with pagination, or (b) open a modal with full review list |
| 6.2 | Implement pagination or load-more | Use existing `getProviderReviews()` which already supports pagination |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/services/provider/[id]/page.tsx` | Add state + handler for reviews expansion |

---

### SC-7: Improve Search Quality
**Priority:** MEDIUM | **Effort:** 1-2 days | **Depends on:** Nothing

| # | Task | Details |
|---|------|---------|
| 7.1 | Add PostgreSQL full-text search index | GIN index on `service_providers` |
| 7.2 | Replace ILIKE with `to_tsvector`/`to_tsquery` | In `getProviders()` search |
| 7.3 | Fix price filter pagination | Either move price filter to SQL (extract min from JSONB) or deduct from count |
| 7.4 | Fix `getFeaturedProviders` empty category filter | Add SQL WHERE clause instead of in-memory filter |

**DB migration:**
```sql
-- Full-text search index
ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(business_name, '') || ' ' || 
    coalesce(tagline, '') || ' ' || coalesce(bio, ''))
  ) STORED;

CREATE INDEX idx_sp_fts ON service_providers USING GIN (search_vector);
```

**Files to modify:**
| File | Changes |
|------|---------|
| `src/lib/services/providers.ts` | Replace ILIKE with `search_vector @@ to_tsquery()` |

---

## 10. Shared Infrastructure Milestones (SI-*)

### SI-1: Regenerate Database Types
**Priority:** HIGH | **Effort:** 0.5 day | **Depends on:** Nothing

| # | Task | Details |
|---|------|---------|
| 1.1 | Run type generation | `npx supabase gen types typescript --project-id <id> > src/types/database.ts` |
| 1.2 | Remove all `asDb()` usage | Find and remove from 5 lib files + 4 API routes |
| 1.3 | Remove `as any`/`as never` casts | Replace with proper typed queries |
| 1.4 | Verify manual types align | Cross-reference `bookings.ts`, `payments.ts`, `reviews.ts` with generated types |

---

### SI-2: Booking Email Templates
**Priority:** HIGH | **Effort:** 2-3 days | **Depends on:** Nothing

The notification engine already marks 18 events with `email: true`, but no email templates exist for booking events. Listing emails already work via Resend — extend the same pattern.

| # | Task | Details |
|---|------|---------|
| 2.1 | Create booking email template module | `src/lib/email/booking-emails.ts` |
| 2.2 | Build 8 email templates | See table below |
| 2.3 | Wire into notification triggers | After `createNotification()`, call email function when `channel.email: true` |
| 2.4 | Test with Resend sandbox | Verify all 8 templates render correctly |

**Email templates:**
| Template | Trigger | Recipient | Content |
|----------|---------|-----------|---------|
| `booking-submitted` | Customer submits | Provider | Service, location, date, accept/view CTA |
| `booking-confirmed` | Provider accepts | Customer | Provider name, service, date, chat CTA |
| `booking-cancelled` | Either party cancels | Other party | Reason, next steps |
| `quote-received` | Provider sends quote | Customer | Amount, breakdown, accept/reject CTA |
| `payment-confirmed` | M-Pesa success | Customer | Amount, M-Pesa receipt #, booking ref |
| `payment-failed` | M-Pesa failure | Customer | Retry CTA |
| `job-completed` | Provider marks complete | Customer | Confirm/dispute CTA |
| `review-prompt` | 72h after completion | Customer | Provider name, leave review CTA |

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/lib/email/booking-emails.ts` | 8 booking email templates | ~600 |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/lib/notifications/triggers.ts` | Add email dispatch after notification insert |

---

### SI-3: SMS Notification Delivery
**Priority:** HIGH (production) | **Effort:** 1-2 days | **Depends on:** SP-3 (SMS service module)

| # | Task | Details |
|---|------|---------|
| 3.1 | Create SMS templates | Short-form messages for critical events (payment, job completion, scheduled) |
| 3.2 | Wire into notification triggers | After email, call SMS function when `channel.sms: true` |
| 3.3 | Handle delivery failures gracefully | Log failures, don't block notification flow |

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/lib/sms/templates.ts` | SMS message templates | ~100 |

---

### SI-4: M-Pesa Configuration
**Priority:** CRITICAL (production) | **Effort:** 0.5 day | **Depends on:** M-Pesa sandbox access from Safaricom

| # | Task | Details |
|---|------|---------|
| 4.1 | Register on Safaricom Developer Portal | Get sandbox credentials |
| 4.2 | Configure env vars | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_CALLBACK_URL` |
| 4.3 | Test STK Push in sandbox | Verify end-to-end: initiate → phone prompt → callback → payment recorded |
| 4.4 | Set up callback URL | Must be publicly accessible (use Vercel deployment URL) |
| 4.5 | Go-live credentials | Apply for production M-Pesa credentials (takes 1-2 weeks) |

---

## 11. Priority & Execution Order

### Critical Path (Must complete before launch)

```
Week 1:  SI-1 (DB Types, 0.5d) → SP-1 (Settings, 2d) → SP-2 (Bell, 0.5d) → SC-4 (Compare, 0.5d)
Week 2:  SC-1 (Customer Dashboard, 3d) → SC-2 (Saved Providers, 1d)
Week 3:  SI-2 (Booking Emails, 3d) — can run parallel with Week 2
Week 4:  SP-3 + SI-3 (SMS, 2d) → SI-4 (M-Pesa Config, 0.5d) → SC-3 (Area Filter, 1.5d)
Week 5:  SC-5 (Disputes, 4d)
Week 6:  SC-7 (Search, 2d) → SC-6 (Reviews button, 0.5d) → SP-5 (Minor fixes, 1d)
         SP-4 (Analytics, 3d) — parallel if time permits
```

### Summary Table

| Milestone | Priority | Effort | Depends On |
|-----------|----------|--------|------------|
| **SI-1**: Regenerate DB Types | HIGH | 0.5d | — |
| **SP-1**: Wire Provider Settings | HIGH | 2d | — |
| **SP-2**: Notification Bell | MEDIUM | 0.5d | — |
| **SP-3**: SMS OTP Delivery | HIGH | 1d | AT setup |
| **SP-4**: Provider Analytics | LOW | 2-3d | — |
| **SP-5**: Minor Fixes Bundle | LOW | 1d | — |
| **SC-1**: Customer Services Dashboard | CRITICAL | 3d | — |
| **SC-2**: Saved Providers Page | MEDIUM | 1d | — |
| **SC-3**: Fix Area Filtering | MEDIUM | 1-2d | — |
| **SC-4**: Wire Compare Button | LOW | 0.5d | — |
| **SC-5**: Dispute & Refund Flow | MEDIUM | 3-4d | SC-1 |
| **SC-6**: Fix "Show All Reviews" | LOW | 0.5d | — |
| **SC-7**: Improve Search Quality | MEDIUM | 1-2d | — |
| **SI-2**: Booking Email Templates | HIGH | 2-3d | — |
| **SI-3**: SMS Notifications | HIGH | 1-2d | SP-3 |
| **SI-4**: M-Pesa Configuration | CRITICAL | 0.5d | Safaricom |
| **TOTAL** | | **~22-29 days** | |

### What's Already Done (for reference)

To be clear about what does NOT need work — these are **complete and fully wired**:

- ✅ Provider onboarding (type selection, phone verify UI, identity upload)
- ✅ Provider dashboard shell + navigation (9 sections)
- ✅ Provider dashboard home (stats, recent jobs, social analytics)
- ✅ Profile management (5-step wizard, photo, basics, areas, hours, socials)
- ✅ Service CRUD (add wizard, edit, preview, grid, images, toggle active)
- ✅ Jobs management (list, detail, accept/reject, schedule, start/complete/cancel)
- ✅ Quote system (create, revise, submit — provider side; view, accept, reject — customer side)
- ✅ Messaging (realtime chat, read receipts, conversations list — both sides)
- ✅ Calendar (week view, navigation)
- ✅ Availability editor (weekly schedule, templates, emergency toggle)
- ✅ Earnings (overview, transaction history, payout request)
- ✅ Reviews (multi-step form, dimensions, photos, helpful votes, report, provider responses)
- ✅ M-Pesa payment (STK Push, polling, callback, commission — all code)
- ✅ Service marketplace (browsing, search, filters, sort, pagination)
- ✅ Provider profiles (trust layout, portfolio, services/pricing, reviews, availability)
- ✅ Booking request (5-step form, location picker, emergency flag)
- ✅ Customer bookings (list, detail, lifecycle actions, status timeline, job photos)
- ✅ In-app notifications (22 triggers covering full lifecycle)
- ✅ Auth (Google OAuth, Phone OTP, multi-role, redirect sanitization)
- ✅ Booking lifecycle engine (25-state machine with DB trigger enforcement)
