# Mitasafi Customer Module — Complete Analysis & Implementation Milestones

**Date:** March 2, 2026  
**Scope:** Every customer-facing feature from first visit to post-service review  
**Methodology:** Exhaustive file-by-file code audit of pages, components, hooks, lib functions, API routes, DB schema, and migrations

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Complete Feature Inventory](#2-complete-feature-inventory)
3. [Detailed Status by Module](#3-detailed-status-by-module)
4. [Database Tables Audit](#4-database-tables-audit)
5. [API Routes Audit](#5-api-routes-audit)
6. [Implementation Milestones](#6-implementation-milestones)

---

## 1. Executive Summary

### Overall Status

| Category | Fully Complete | Partially Complete | Not Started |
|----------|:-:|:-:|:-:|
| Landing & Marketing | 17 sections | 1 (contact form) | 2 (dead links, dynamic stats) |
| Authentication | 4/4 flows | — | — |
| Service Discovery | 16 components | 2 (area filter, compare wiring) | — |
| Booking Lifecycle | 8/8 stages | — | — |
| Payments (M-Pesa) | Code complete | Needs env config | — |
| Reviews & Ratings | 3/3 components | — | — |
| Notifications (in-app) | 22 triggers | — | — |
| Customer Dashboard | 4 sub-pages | 1 (main hub is placeholder) | 3 (profile, settings, tenant home) |
| Property Browsing | 5 components | 1 (map placeholder) | — |
| Email Delivery | Listings only | — | Booking/payment emails |
| SMS Delivery | — | — | Not started |
| Dispute Resolution | Schema ready | — | UI not started |
| Customer Profile Mgmt | — | — | Not started |

**Bottom line:** The service booking pipeline (discover → book → chat → pay → review) is **code-complete**. The major gaps are in the **customer home experience** (dashboard, profile, settings) and **communication infrastructure** (email/SMS for bookings).

---

## 2. Complete Feature Inventory

### Customer Journey Map

```
VISIT → BROWSE SERVICES → VIEW PROVIDER → REGISTER/LOGIN → REQUEST BOOKING
  → RECEIVE QUOTE → ACCEPT QUOTE → PAY (M-Pesa) → TRACK JOB
  → CONFIRM COMPLETION → LEAVE REVIEW → REBOOK / BROWSE MORE
```

### Feature-by-Feature Status

#### A. Landing Page & First Impressions

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| A1 | Hero section with dual CTA | ✅ Complete | `components/landing/Hero.tsx` | Browse Homes + For Landlords |
| A2 | Navigation bar with auth CTAs | ✅ Complete | `components/landing/Navbar.tsx` | Mobile responsive, saved count badge |
| A3 | Trust bar (stats + security badges) | ✅ Complete | `components/landing/TrustBar.tsx` | **Hardcoded stats** — no real data |
| A4 | Problem section | ✅ Complete | `components/landing/ProblemSection.tsx` | Static |
| A5 | Features section (3 user types) | ✅ Complete | `components/landing/FeaturesSection.tsx` | Tabbed, 15 features shown |
| A6 | Service categories showcase | ✅ Complete | `components/landing/ServiceCategoriesShowcase.tsx` | 8 categories, links to /services |
| A7 | Service discovery section | ✅ Complete | `components/landing/ServiceDiscoverySection.tsx` | Search bar + stats (**hardcoded**) |
| A8 | Popular services carousel | ✅ Complete | `components/landing/PopularServicesSection.tsx` | 8 services, horizontal scroll |
| A9 | Neighborhoods section | ✅ Complete | `components/landing/NeighborhoodsSection.tsx` | 4 Nairobi neighborhoods |
| A10 | How It Works timeline | ✅ Complete | `components/landing/HowItWorksSection.tsx` | 3-step process |
| A11 | Recently viewed (personalized) | ✅ Complete | `components/landing/RecentlyViewedSection.tsx` | localStorage-based |
| A12 | Testimonials carousel | ✅ Complete | `components/landing/TestimonialsSection.tsx` | 6 testimonials (**hardcoded**) |
| A13 | Pricing section | ✅ Complete | `components/landing/PricingSection.tsx` | 3 tabs, display-only (**no payment**) |
| A14 | FAQ accordion | ✅ Complete | `components/landing/FAQSection.tsx` | 8 Q&As |
| A15 | CTA section | ✅ Complete | `components/landing/CTASection.tsx` | Mirrors hero |
| A16 | Footer with links | ⚠️ Partial | `components/landing/Footer.tsx` | **~20 dead links** (/about, /blog, /careers, /privacy, /terms, etc.) |
| A17 | Contact page | ⚠️ Partial | `app/contact/page.tsx` | Form **not connected** — `setTimeout` stub |
| A18 | Landlords marketing page | ✅ Complete | `app/landlords/page.tsx` | 887 lines, full marketing |
| A19 | Providers marketing page | ✅ Complete | `app/service-providers/page.tsx` | 722 lines, full marketing |

#### B. Authentication & Onboarding

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| B1 | Google OAuth sign-in | ✅ Complete | `app/(auth)/login/page.tsx` | With role detection post-login |
| B2 | Phone OTP sign-in (+254) | ✅ Complete | `app/(auth)/login/page.tsx` | Kenyan validation, 6-digit OTP |
| B3 | Google OAuth sign-up | ✅ Complete | `app/(auth)/signup/page.tsx` | Role selection, provider profile creation |
| B4 | Phone OTP sign-up | ✅ Complete | `app/(auth)/signup/page.tsx` | 1,108 lines, most complex page |
| B5 | OAuth callback handling | ✅ Complete | `app/auth/callback/route.ts` | Multi-role routing, cookie-based state |
| B6 | Sign out | ✅ Complete | `app/auth/signout/route.ts` | GET + POST |
| B7 | Role upgrade flow | ✅ Complete | Signup + callback | Detection, warning modal, silent add |
| B8 | Auth middleware | ✅ Complete | `src/proxy.ts` + `lib/supabase/middleware.ts` | 3-tier JWT optimization |
| B9 | Open redirect prevention | ✅ Complete | `lib/security/url-sanitizer.ts` | Whitelist + traversal blocking |
| B10 | Email/password auth | ❌ Missing | — | Only OAuth + OTP available |
| B11 | Password reset flow | ❌ Missing | — | Not applicable (no passwords) |
| B12 | Email verification flow | ❌ Missing | — | Google handles implicitly; phone users have no email verification |

#### C. Service Browsing & Discovery

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| C1 | Service marketplace page | ✅ Complete | `app/services/page.tsx` (408 lines) | SSR, 12+ URL filter params |
| C2 | Category quick nav (Fiverr-style) | ✅ Complete | `components/services/CategoryQuickNav.tsx` | Sticky, 3 variants |
| C3 | Search autocomplete | ✅ Complete | `components/services/ServiceSearchAutocomplete.tsx` | 3 variants, keyboard nav, API suggestions |
| C4 | Search suggestions API | ✅ Complete | `api/services/search/suggestions/route.ts` | ILIKE + keywords, relevance sort |
| C5 | Filter sidebar (category, subcategory, area, price, rating, features) | ✅ Complete | `components/services/ServiceFilterSidebar.tsx` (776 lines) | Desktop sidebar + mobile drawer |
| C6 | Provider results grid | ✅ Complete | `components/services/ProvidersGrid.tsx` | 3-column, pagination, empty state |
| C7 | Provider card (psychology-optimized) | ✅ Complete | `components/services/ProviderCard.tsx` (471 lines) | Tier badges, save/share, price anchoring |
| C8 | Featured providers carousel | ✅ Complete | `components/services/FeaturedProviders.tsx` | Enterprise/premium tier |
| C9 | Featured by price tiers | ✅ Complete | `components/services/FeaturedByPrice.tsx` | 4 price tier tabs |
| C10 | Suggested tags | ✅ Complete | `components/services/SuggestedTags.tsx` | Category-aware (**hardcoded**) |
| C11 | Sort dropdown (6 options) | ✅ Complete | `components/services/SortDropdown.tsx` | URL-synced |
| C12 | Quick filter toggles | ✅ Complete | `app/services/quick-filter-toggle.tsx` | Inline filter chips |
| C13 | Provider comparison (up to 3) | ⚠️ Partial | `components/services/CompareProviders.tsx` (623 lines) | Full compare modal + context, but **CompareButton not wired into ProviderCard** |
| C14 | Area filtering (server-side) | ⚠️ Broken | `lib/services/providers.ts` | UI exists; `service_areas` always returns `[]`; no backend effect |
| C15 | Full-text search | ⚠️ Basic | `lib/services/providers.ts` | ILIKE (not tsvector/tsquery) — won't scale |
| C16 | Recently viewed tracking | ✅ Complete | `hooks/useRecentlyViewed.ts` | localStorage, 30-day expiry |

#### D. Provider Profile Page

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| D1 | Provider detail page | ✅ Complete | `app/services/provider/[id]/page.tsx` (724 lines) | SSR, parallel data fetch |
| D2 | Hero (photo, rating, stats, location) | ✅ Complete | Inline in page | Tier-aware styling |
| D3 | Credentials & verification | ✅ Complete | Inline in page | Badges display |
| D4 | About/Bio section | ✅ Complete | Inline in page | — |
| D5 | Portfolio gallery + lightbox | ✅ Complete | `components/services/PortfolioGallery.tsx` | Keyboard nav, thumbnails |
| D6 | Services & pricing table | ✅ Complete | Inline in page | Per-service "Request" links |
| D7 | Reviews display | ✅ Complete | Inline in page | With helpful votes + report |
| D8 | Availability schedule | ✅ Complete | Inline in page | RRULE-based intervals |
| D9 | Social links | ✅ Complete | `components/services/SocialLinksSection.tsx` | Click-tracked |
| D10 | Similar providers | ✅ Complete | Inline in page | Category-based matching |
| D11 | Contact sidebar (WhatsApp/phone) | ✅ Complete | Inline in page | Sticky desktop sidebar |
| D12 | Mobile sticky CTA bar | ✅ Complete | Inline in page | "Request Service" |
| D13 | "Show all reviews" pagination | ⚠️ Stub | Inline in page | Button exists, **no handler** |
| D14 | Own-profile detection | ✅ Complete | Inline in page | Shows "Edit Profile" for owner |

#### E. Booking Flow

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| E1 | Booking request form (5-step wizard) | ✅ Complete | `components/booking/BookingRequestForm.tsx` (680 lines) | Service → Location → Schedule → Details → Review |
| E2 | Location picker (saved + new) | ✅ Complete | `components/booking/LocationPicker.tsx` (322 lines) | Nairobi area dropdown, access instructions |
| E3 | Booking creation server action | ✅ Complete | `app/services/provider/[id]/request/actions.ts` (340 lines) | Status machine, notifications |
| E4 | Booking creation API route | ✅ Complete | `api/services/bookings/route.ts` (351 lines) | Duplicate of server action (API for hooks) |
| E5 | Booking confirmation page | ✅ Complete | `app/bookings/[id]/confirmation/page.tsx` | "What happens next" steps |
| E6 | Auth gate on booking | ✅ Complete | `app/services/provider/[id]/request/page.tsx` | Redirects to login |
| E7 | Self-booking prevention | ✅ Complete | Request page + API | Provider can't book themselves |
| E8 | Emergency booking flag | ✅ Complete | BookingRequestForm | Emergency toggle → `booking_flow_type` |

#### F. Quote Management

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| F1 | Quote view page (customer) | ✅ Complete | `app/dashboard/bookings/[id]/quote/page.tsx` (299 lines) | Total, breakdown, validity |
| F2 | Accept quote (server action) | ✅ Complete | `app/dashboard/bookings/[id]/quote/actions.ts` | Status transition + notification |
| F3 | Reject quote with reason | ✅ Complete | `QuoteActions.tsx` + `actions.ts` | Textarea + server action |
| F4 | Quote revision support | ✅ Complete | Types + DB schema | `revision_count`, `superseded_at` |
| F5 | Quote viewed tracking | ✅ Complete | Quote page | Marks as viewed on load |

#### G. Messaging / Chat

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| G1 | Real-time chat (Supabase Realtime) | ✅ Complete | `hooks/useBookingMessages.ts` (341 lines) | Subscription, optimistic sends, cursor pagination |
| G2 | Chat thread UI | ✅ Complete | `components/booking/ChatThread.tsx` (314 lines) | Bubbles, date separators, read receipts |
| G3 | Message input | ✅ Complete | `components/booking/MessageInput.tsx` | Auto-resize, Enter-to-send, char limit |
| G4 | Chat wrapper | ✅ Complete | `components/booking/BookingChat.tsx` | Embeds thread + input |
| G5 | Messages list (all conversations) | ✅ Complete | `app/dashboard/bookings/messages/page.tsx` (326 lines) | Provider name, last message, unread count |
| G6 | Messages API route | ✅ Complete | `api/services/jobs/[id]/messages/route.ts` | GET/POST, participant verification |
| G7 | Status-aware chat (read-only for closed) | ✅ Complete | BookingChat | Disabled for cancelled/disputed |

#### H. Payment (M-Pesa)

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| H1 | M-Pesa STK Push client | ✅ Complete | `lib/payments/mpesa.ts` (424 lines) | OAuth2, sandbox/production |
| H2 | Payment initiation API | ✅ Complete | `api/payments/mpesa/initiate/route.ts` | Zod validation |
| H3 | Payment status query API | ✅ Complete | `api/payments/mpesa/query/route.ts` | Polling support |
| H4 | M-Pesa callback webhook | ✅ Complete | `api/payments/mpesa/callback/route.ts` | Always returns 200 |
| H5 | Commission calculation | ✅ Complete | `lib/payments/commission.ts` | 10%, KES 50 min, KES 5,000 max |
| H6 | Payment page (customer) | ✅ Complete | `app/dashboard/bookings/[id]/payment/page.tsx` (306 lines) | Order summary, history |
| H7 | Payment form (STK Push UI) | ✅ Complete | `PaymentForm.tsx` (330 lines) | Phone input → polling → terminal state |
| H8 | Env vars configured | ❌ Needs Config | — | `MPESA_CONSUMER_KEY`, etc. |
| H9 | Refund handling | ❌ Missing | — | `refunded_at` field exists, no logic |

#### I. Job Tracking & Completion

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| I1 | Status timeline visualization | ✅ Complete | `components/booking/StatusTimeline.tsx` | Icons, timestamps, actor labels |
| I2 | Job photos (before/during/after) | ✅ Complete | `components/booking/JobPhotos.tsx` (351 lines) | Grouped, provider uploads, customer views |
| I3 | Customer booking actions | ✅ Complete | `CustomerBookingActions.tsx` (335 lines) | Confirm/cancel/review per status |
| I4 | Auto-completion (72h pg_cron) | ✅ Complete | M5 migration | Needs `cron.schedule()` activation |
| I5 | Cancellation with reason | ✅ Complete | CustomerBookingActions | Textarea + server action |

#### J. Reviews & Ratings

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| J1 | Review form (multi-step) | ✅ Complete | `components/booking/ReviewForm.tsx` (493 lines) | Stars + dimensions + photos |
| J2 | Review page (auth gate) | ✅ Complete | `app/dashboard/bookings/[id]/review/page.tsx` | Prevents duplicates |
| J3 | Helpful vote (thumbs up/down) | ✅ Complete | `components/booking/ReviewHelpfulVote.tsx` | Optimistic UI, toggle |
| J4 | Report review | ✅ Complete | `components/booking/ReportReviewButton.tsx` | Reason + 500 char limit |
| J5 | Review API route | ✅ Complete | `api/services/jobs/[id]/review/route.ts` | GET/POST |
| J6 | Dimension ratings (5 axes) | ✅ Complete | ReviewForm | Quality, communication, timeliness, professionalism, value |

#### K. Customer Dashboard

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| K1 | Dashboard hub / routing | ⚠️ Partial | `app/dashboard/page.tsx` (296 lines) | **Tenant view is placeholder** — "being set up" |
| K2 | Bookings list (tabs + pagination) | ✅ Complete | `app/dashboard/bookings/page.tsx` | Active/Completed/All with counts |
| K3 | Booking detail page | ✅ Complete | `app/dashboard/bookings/[id]/page.tsx` | Full lifecycle view |
| K4 | Messages inbox | ✅ Complete | `app/dashboard/bookings/messages/page.tsx` | All conversations |
| K5 | Notifications page (realtime) | ✅ Complete | `app/dashboard/notifications/` | Filter tabs, live indicator |
| K6 | Notification center (header bell) | ✅ Complete | `components/shared/NotificationCenter.tsx` | Badge, dropdown, mark read |
| K7 | Inquiries management | ✅ Complete | `app/dashboard/inquiries/page.tsx` (707 lines) | **Landlord-facing** (not customer) |
| K8 | Saved searches list | ✅ Complete | `app/dashboard/searches/page.tsx` | **Pause/resume is a TODO stub** |
| K9 | Role switch banner | ✅ Complete | `components/dashboard/RoleSwitchBanner.tsx` | Animated, session-limited |
| K10 | User profile dropdown | ✅ Complete | `components/dashboard/UserProfileDropdown.tsx` | Role indicator, sign-out |
| K11 | Tenant home dashboard | ❌ Missing | — | No widgets: recent activity, upcoming bookings, saved providers, spend summary |
| K12 | Profile editing page | ❌ Missing | — | No /dashboard/profile or /dashboard/settings |
| K13 | Account settings page | ❌ Missing | — | Name, phone, avatar, preferences |
| K14 | Debug info removal | ❌ Needs Fix | `app/dashboard/page.tsx` | User ID/email visible in production |

#### L. Property Browsing (Listings)

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| L1 | Property browse page | ✅ Complete | `app/properties/page.tsx` | SSR, filters, pagination |
| L2 | Search filters (area, type, beds, price) | ✅ Complete | `components/browse/SearchFilters.tsx` (565 lines) | Desktop bar + mobile drawer |
| L3 | Listings grid | ✅ Complete | `components/browse/ListingsGrid.tsx` (470 lines) | Auto-refresh 30s, pagination |
| L4 | Listing card (save, status badges) | ✅ Complete | `components/shared/ListingCard.tsx` (516+ lines) | localStorage + DB sync |
| L5 | Listing detail (slug-based) | ✅ Complete | `app/listings/[slug]/page.tsx` + `ListingDetailClient.tsx` | Photo gallery, price card, inquiry modal |
| L6 | Similar listings | ✅ Complete | `lib/listings/get-similar.ts` | ±30% price range, same area |
| L7 | Saved listings page | ✅ Complete | `app/saved/page.tsx` (461 lines) | Realtime status monitoring |
| L8 | Realtime listing status updates | ✅ Complete | `hooks/useRealtimeListingStatus.ts` | Auto-notification on status change |
| L9 | Save search alert | ✅ Complete | `components/browse/SaveSearchButton.tsx` | Works for guests (email/phone) |
| L10 | Low inventory banner | ✅ Complete | `components/browse/LowInventoryBanner.tsx` | "Notify Me" CTA |
| L11 | Listing inquiry (to landlord) | ✅ Complete | `api/listings/inquire/route.ts` | Auth required, email notification |
| L12 | Map view | ❌ Missing | — | Placeholder div with icon, no actual map |
| L13 | Photo lightbox ("View all") | ⚠️ Stub | ListingDetailClient | Button exists, **no handler** |
| L14 | Legacy /properties/[id] redirect | ⚠️ Needs Fix | `app/properties/[id]/page.tsx` | Should redirect to /listings/[slug] |

#### M. Notifications & Communication

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| M1 | In-app notifications (22 triggers) | ✅ Complete | `lib/notifications/triggers.ts` (629 lines) | Full booking lifecycle coverage |
| M2 | Realtime notification delivery | ✅ Complete | `hooks/useNotifications.ts` (384 lines) | Supabase Realtime subscription |
| M3 | Email — listing inquiries | ✅ Complete | `lib/email/index.ts` | Via Resend |
| M4 | Email — search alerts | ✅ Complete | `lib/email/index.ts` | New listings match |
| M5 | Email — booking events | ❌ Missing | — | No booking confirmation, payment receipt, review prompt emails |
| M6 | SMS delivery | ❌ Missing | — | Flags exist (`sms: true`), no gateway integration |
| M7 | Push notifications (web/mobile) | ❌ Missing | — | No FCM/APNs/web push |
| M8 | Notification preferences UI | ❌ Missing | — | `user_preferences` table exists, no settings page |

#### N. Saved & Favorites

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| N1 | Save listings (localStorage + DB) | ✅ Complete | `hooks/useSavedListings.ts` | Hybrid approach, cross-tab sync |
| N2 | Saved listings page | ✅ Complete | `app/saved/page.tsx` | Realtime status monitoring |
| N3 | Save service providers | ⚠️ Partial | `lib/services/providers.ts` | Server functions exist, **no customer-facing "Saved Providers" page** |
| N4 | Save/share on provider card | ✅ Complete | ProviderCard | Web Share API + clipboard |

#### O. Missing Features (per PRD)

| # | Feature | PRD Section | Status | Notes |
|---|---------|-------------|--------|-------|
| O1 | Property comparison (up to 3) | §4.1 Save & Compare | ❌ Missing | Service comparison exists, no property comparison |
| O2 | Virtual tours (360°, video) | §4.1 Property Listing | ❌ Missing | No 360° viewer |
| O3 | Video calls (live property viewing) | §4.2 Video Calls | ❌ Missing | No WebRTC/video integration |
| O4 | Tenant Score / dashboard | §4.5 Tenant Score | ❌ Missing | No score calculation or display |
| O5 | Digital lease signing | §4.3 Property Booking | ❌ Missing | No e-signature integration |
| O6 | Escrow system | §4.3 Escrow | ❌ Missing | No escrow logic |
| O7 | Recurring payments (rent auto-pay) | §4.3 Recurring | ❌ Missing | No recurrence on bookings |
| O8 | Dispute resolution (customer UI) | §6.3 | ❌ Missing | Schema ready, planned M10 |
| O9 | Bundle deals / loyalty | §7.4 | ❌ Missing | No discount engine |
| O10 | Neighbor Connect | §7.5 | ❌ Missing | No social features |

---

## 3. Detailed Status by Module

### 3.1 Fully Complete (Production-Ready Code)

These features have complete UI, server logic, database queries, error handling, and edge cases:

1. **Landing page** — All 15 sections rendered, SEO metadata, performance logging
2. **Authentication** — Google OAuth + Phone OTP, multi-role system, redirect sanitization
3. **Service marketplace page** — Server-rendered, 12+ filters, parallel data fetching
4. **Provider profile page** — Trust-focused layout, portfolio, reviews, availability, similar providers
5. **Booking request wizard** — 5-step form, location picker, emergency toggle
6. **Quote accept/reject** — Server actions, notification triggers, revision support
7. **Real-time messaging** — Supabase Realtime, optimistic UI, read receipts, cursor pagination
8. **M-Pesa payment** — STK Push initiation, polling, callback processing, commission calculation
9. **Review system** — Multi-step form, dimension ratings, photo upload, helpful votes, report
10. **Customer booking list** — Tab-based, unread badges, pagination
11. **Customer booking detail** — Full lifecycle actions, status timeline, job photos
12. **Notifications (in-app)** — 22 event triggers, realtime delivery, mark-read
13. **Property browse** — Filters, grid, auto-refresh, save search, low inventory
14. **Listing detail** — Photo gallery, price breakdown, inquiry modal, similar listings
15. **Saved listings** — Hybrid localStorage/DB, realtime status monitoring

### 3.2 Partially Complete (Needs Work)

| Feature | What Works | What's Missing |
|---------|-----------|----------------|
| Area filtering (services) | UI sidebar renders area checkboxes | `service_areas` always `[]`; no server-side join to `provider_service_areas` table |
| Provider comparison | Full CompareBar + CompareModal + Context | CompareButton **not rendered** in ProviderCard despite having props |
| Contact form | Full UI with validation | Form submission is `setTimeout` stub — no backend |
| Full-text search | ILIKE on 3 fields | No PostgreSQL tsvector/tsquery index — won't scale |
| Saved searches | List + create + delete | Pause/resume toggle is a TODO |
| Photo lightbox (listings) | "View all photos" button | No click handler, no lightbox component |
| Listing detail map | Gray placeholder box | No Google Maps / Leaflet integration |
| Database types | Generated `database.ts` (3,357 lines) | **Booking tables missing** from generated types — using manual types with `as any` casts |
| Email notifications | Listing inquiries + search alerts | No booking emails (confirmation, payment receipt, review prompt) |
| Tenant dashboard | Routing hub + role detection | **Placeholder UI** — "being set up" text |

### 3.3 Not Started

1. **Customer profile editing** — No page, no form, no API
2. **Account settings / preferences** — `user_preferences` table exists, no UI
3. **Tenant home dashboard** — No widgets (recent bookings, spend, saved, activity)
4. **Dispute filing UI** — Table + enum ready, no form or page
5. **SMS delivery** — Notification flags exist, no Africa's Talking/Twilio integration
6. **Push notifications** — No FCM or web push
7. **Booking email templates** — No booking confirmation, payment receipt, review prompt emails
8. **Refund processing** — `refunded_at` field, no refund logic or UI
9. **Property comparison tool** — No compare feature for listings
10. **Map integration** — No actual map rendered anywhere
11. **Footer content pages** — /about, /blog, /careers, /privacy, /terms, /help, /guides, /safety (all dead links)

---

## 4. Database Tables Audit

### Customer-Facing Tables (Exist in Migrations)

| Table | Migration | Status | RLS |
|-------|-----------|--------|-----|
| `profiles` | Core | ✅ Active | ✅ |
| `user_roles` | Core | ✅ Active | ✅ |
| `bookings` | `20260108120003_booking_core.sql` | ✅ Active | ✅ |
| `booking_status_history` | `20260108120003` | ✅ Active | ✅ |
| `booking_quotes` | `20260108120003` | ✅ Active | ✅ |
| `booking_media` | `20260108120003` | ✅ Active | ✅ |
| `booking_messages` | `20260108120003` | ✅ Active | ✅ |
| `booking_disputes` | `20260108120003` | ✅ Schema only | ✅ |
| `booking_payments` | `20260305000000_m6_payment_tables.sql` | ✅ Active | ✅ |
| `provider_payouts` | `20260305000000` | ✅ Schema only | ✅ |
| `locations` | `20260108120003` | ✅ Active | ✅ |
| `reviews` | `20260108120005_support_tables.sql` | ✅ Active | ✅ |
| `review_helpful_votes` | `20260108120005` | ✅ Active | ✅ |
| `saved_providers` | `20260108120005` | ✅ Active | ✅ |
| `notifications` | `20260108120005` | ✅ Active | ✅ |
| `user_preferences` | `20260108120005` | ✅ Schema only | ✅ |
| `blocked_users` | `20260108120005` | ✅ Schema only | ✅ |
| `listings` | Earlier migration | ✅ Active | ✅ |
| `saved_listings` | Earlier migration | ✅ Active | ✅ |
| `search_alerts` | Earlier migration | ✅ Active | ✅ |
| `inquiries` | Earlier migration | ✅ Active | ✅ |

### Tables Needed But Missing

| Table | Purpose | Milestone |
|-------|---------|-----------|
| `contact_submissions` | Store contact form data | CM-1 |
| `refunds` | Track refund requests (or add columns to `booking_payments`) | CM-5 |
| `tenant_scores` | Tenant Score calculation/history | CM-8+ (future) |

### Critical Fix: Regenerate Database Types

The auto-generated `database.ts` is **stale** — it doesn't include any booking, payment, review, or notification tables. Every query to these tables uses `as any` casts, losing type safety. This must be fixed:

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

---

## 5. API Routes Audit

### Customer-Facing API Routes

| Route | Method | Status | Auth | Purpose |
|-------|--------|--------|------|---------|
| `/api/services/search/suggestions` | GET | ✅ | No | Autocomplete |
| `/api/services/providers` | GET | ✅ | No | List providers |
| `/api/services/providers/[id]` | GET | ✅ | No | Provider detail |
| `/api/services/providers/[id]/reviews` | GET | ✅ | No | Provider reviews |
| `/api/services/bookings` | GET/POST | ✅ | Yes | Bookings CRUD |
| `/api/services/jobs/[id]/messages` | GET/POST | ✅ | Yes | Chat messages |
| `/api/services/jobs/[id]/quotes` | GET/POST | ✅ | Yes | Quotes |
| `/api/services/jobs/[id]/quotes/[quoteId]/accept` | POST | ✅ | Yes | Accept quote |
| `/api/services/jobs/[id]/review` | GET/POST | ✅ | Yes | Reviews |
| `/api/services/saved` | GET/POST | ✅ | Yes | Saved providers |
| `/api/services/categories` | GET | ✅ | No | Categories |
| `/api/payments/mpesa/initiate` | POST | ✅ | Yes | M-Pesa STK Push |
| `/api/payments/mpesa/query` | GET | ✅ | Yes | Payment status |
| `/api/payments/mpesa/callback` | POST | ✅ | No | M-Pesa webhook |
| `/api/saved-listings` | GET/POST/DELETE | ✅ | Yes | Saved listings |
| `/api/search-alerts` | POST/DELETE | ✅ | Optional | Search alerts |
| `/api/listings/batch` | GET | ✅ | No | Batch fetch |
| `/api/listings/inquire` | POST | ✅ | Yes | Submit inquiry |
| `/api/notifications` | GET/PATCH/DELETE | ✅ | Yes | Notifications |
| `/api/services/jobs` | GET/POST | ❌ **Stub (501)** | — | Jobs list |
| `/api/services/jobs/[id]` | GET/PATCH | ❌ **Stub (501)** | — | Job detail |

### Missing API Routes

| Route | Purpose | Milestone |
|-------|---------|-----------|
| `POST /api/contact` | Contact form submission | CM-1 |
| `GET/PATCH /api/profile` | Customer profile CRUD | CM-2 |
| `GET/PATCH /api/preferences` | Notification preferences | CM-2 |
| `POST /api/bookings/[id]/dispute` | Submit dispute | CM-5 |
| `POST /api/payments/refund` | Request refund | CM-5 |

---

## 6. Implementation Milestones

### Milestone Dependency Graph

```
CM-1 (Quick Fixes) → CM-2 (Profile & Settings)
                    → CM-3 (Dashboard Home)
                    → CM-4 (Communication Infra)
                    → CM-5 (Dispute & Refund)
                    → CM-6 (Search & Discovery Polish)
                    → CM-7 (Property Experience)
                    → CM-8 (Content Pages)
```

CM-1 through CM-3 are **blockers** for launch. CM-4 through CM-8 can be parallelized.

---

### CM-1: Quick Fixes & Low-Hanging Fruit
**Priority:** CRITICAL | **Effort:** 1-2 days | **Dependencies:** None

These are bugs, stubs, and production-readiness fixes that should be done first.

#### Tasks

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1.1 | Remove debug info from dashboard | `src/app/dashboard/page.tsx` | Delete the block that renders user ID, email, phone, roles in production |
| 1.2 | Connect contact form to backend | `src/app/contact/page.tsx` | Create `POST /api/contact` route → insert into `contact_submissions` table (or send via Resend) |
| 1.3 | Wire CompareButton into ProviderCard | `src/components/services/ProviderCard.tsx` | Render `<CompareButton>` when `showCompare` prop is true |
| 1.4 | Fix "Show all reviews" button | `src/app/services/provider/[id]/page.tsx` | Add onClick handler → expand or paginate reviews |
| 1.5 | Add listing photo lightbox | `src/app/listings/[slug]/ListingDetailClient.tsx` | Wire "View all photos" button → lightbox (reuse `PortfolioGallery` pattern) |
| 1.6 | Redirect /properties/[id] to /listings/[slug] | `src/app/properties/[id]/page.tsx` | `redirect()` to canonical slug URL |
| 1.7 | Implement slug mismatch redirect | `src/app/listings/[slug]/page.tsx` | Uncomment/implement the redirect to correct slug |
| 1.8 | Fix saved search pause/resume | `src/components/dashboard/SavedSearchesList.tsx` | Implement `handleTogglePause` → `PATCH /api/search-alerts` with `is_active` toggle |

#### Database Changes

```sql
-- Contact submissions table
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  inquiry_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  replied_at TIMESTAMPTZ
);

-- RLS: Admin-only read, public insert
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON contact_submissions FOR INSERT WITH CHECK (true);
```

#### New Files

| File | Purpose |
|------|---------|
| `src/app/api/contact/route.ts` | POST handler: validate, insert `contact_submissions`, send notification email |

---

### CM-2: Customer Profile & Account Settings
**Priority:** CRITICAL | **Effort:** 3-4 days | **Dependencies:** CM-1

Customers currently cannot view or edit their profile.

#### Tasks

| # | Task | File(s) to Create/Edit | Details |
|---|------|------------------------|---------|
| 2.1 | Create profile page | `src/app/dashboard/profile/page.tsx` | Server component: fetch profile, render form |
| 2.2 | Create profile edit form | `src/components/dashboard/ProfileEditForm.tsx` | Client: name, email, phone, avatar upload, location |
| 2.3 | Create profile API route | `src/app/api/profile/route.ts` | GET (current profile), PATCH (update fields) |
| 2.4 | Avatar upload component | `src/components/dashboard/AvatarUpload.tsx` | Crop + upload to Supabase Storage `avatars` bucket |
| 2.5 | Create settings page | `src/app/dashboard/settings/page.tsx` | Notification preferences, privacy, account actions |
| 2.6 | Create preferences form | `src/components/dashboard/PreferencesForm.tsx` | Toggle email/SMS/push per notification type |
| 2.7 | Create preferences API | `src/app/api/preferences/route.ts` | GET/PATCH `user_preferences` table |
| 2.8 | Add sidebar navigation | `src/app/dashboard/layout.tsx` (create or edit) | Customer dashboard navigation: Home, Bookings, Messages, Saved, Profile, Settings |
| 2.9 | Add phone change flow | Profile form | Re-verify via OTP when changing phone |

#### Database Changes

```sql
-- Add avatar_url column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;

-- Ensure user_preferences has all needed columns
-- (Table should already exist from migration 20260108120005)
-- Verify columns: notification_email, notification_sms, notification_push, 
--                 marketing_opt_in, profile_visibility
```

#### New Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/profile/page.tsx` | Profile view/edit page |
| `src/components/dashboard/ProfileEditForm.tsx` | Profile form component (~300 lines) |
| `src/components/dashboard/AvatarUpload.tsx` | Avatar crop + upload (~150 lines) |
| `src/app/dashboard/settings/page.tsx` | Settings page |
| `src/components/dashboard/PreferencesForm.tsx` | Notification preferences form (~200 lines) |
| `src/app/api/profile/route.ts` | Profile CRUD API |
| `src/app/api/preferences/route.ts` | Preferences CRUD API |
| `src/app/dashboard/layout.tsx` | Dashboard layout with sidebar (customer) |

---

### CM-3: Customer Dashboard Home
**Priority:** CRITICAL | **Effort:** 2-3 days | **Dependencies:** CM-2 (for layout/navigation)

Replace the "being set up" placeholder with a real tenant dashboard.

#### Tasks

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 3.1 | Design dashboard home layout | `src/app/dashboard/page.tsx` | Replace placeholder with widget grid |
| 3.2 | Active bookings widget | `src/components/dashboard/ActiveBookingsWidget.tsx` | Up to 3 active bookings with status, provider, next action |
| 3.3 | Recent activity feed | `src/components/dashboard/ActivityFeed.tsx` | Last 10 events from `booking_status_history` + `notifications` |
| 3.4 | Quick actions bar | `src/components/dashboard/QuickActions.tsx` | Browse Services, Saved Providers, Messages (with unread count), New Booking |
| 3.5 | Spend summary widget | `src/components/dashboard/SpendSummary.tsx` | Total spent this month, payment count, pending payments from `booking_payments` |
| 3.6 | Saved providers widget | `src/components/dashboard/SavedProvidersWidget.tsx` | Top 4 saved providers, "View All" link |
| 3.7 | Upcoming schedule widget | `src/components/dashboard/UpcomingSchedule.tsx` | Next 3 scheduled bookings with date/time |
| 3.8 | Create saved providers page | `src/app/dashboard/saved-providers/page.tsx` | Full saved providers list with "Remove" and "Book Again" |

#### Database Queries Needed

```sql
-- Active bookings for dashboard widget
SELECT b.*, sp.business_name, sp.logo_url, sp.average_rating
FROM bookings b
JOIN service_providers sp ON b.provider_id = sp.id
WHERE b.customer_id = $1
  AND b.status NOT IN ('completed', 'customer_confirmed', 'cancelled_customer', 'cancelled_provider', 'abandoned')
ORDER BY b.created_at DESC
LIMIT 3;

-- Spend summary
SELECT 
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) as payments_this_month,
  COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', now()) AND status = 'completed'), 0) as spent_this_month,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_payments
FROM booking_payments
WHERE customer_id = $1;

-- Upcoming scheduled bookings
SELECT b.*, sp.business_name, sp.logo_url
FROM bookings b
JOIN service_providers sp ON b.provider_id = sp.id
WHERE b.customer_id = $1
  AND b.status IN ('confirmed', 'scheduled')
  AND b.scheduled_date >= now()
ORDER BY b.scheduled_date ASC
LIMIT 3;
```

#### New Files

| File | Purpose |
|------|---------|
| `src/components/dashboard/ActiveBookingsWidget.tsx` | Active bookings summary (~200 lines) |
| `src/components/dashboard/ActivityFeed.tsx` | Recent activity feed (~250 lines) |
| `src/components/dashboard/QuickActions.tsx` | Quick action buttons (~80 lines) |
| `src/components/dashboard/SpendSummary.tsx` | Monthly spend card (~150 lines) |
| `src/components/dashboard/SavedProvidersWidget.tsx` | Saved providers preview (~150 lines) |
| `src/components/dashboard/UpcomingSchedule.tsx` | Upcoming bookings card (~150 lines) |
| `src/app/dashboard/saved-providers/page.tsx` | Full saved providers list (~250 lines) |
| `src/lib/services/dashboard.ts` | Dashboard data fetching functions (~200 lines) |

---

### CM-4: Communication Infrastructure
**Priority:** HIGH | **Effort:** 3-4 days | **Dependencies:** None (parallel with CM-2/CM-3)

Build email and SMS delivery for booking lifecycle events.

#### Tasks

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 4.1 | Create booking email templates | `src/lib/email/booking-emails.ts` | Templates for: booking confirmation, booking accepted, booking cancelled, quote received, payment confirmation, payment receipt, review prompt |
| 4.2 | Create payment email templates | `src/lib/email/payment-emails.ts` | Payment received, payment failed, refund processed |
| 4.3 | Wire email sending into notification triggers | `src/lib/notifications/triggers.ts` | After inserting notification, call email function if `email: true` |
| 4.4 | SMS gateway integration | `src/lib/sms/index.ts` | Africa's Talking (or Twilio) integration for Kenya |
| 4.5 | Wire SMS sending into notification triggers | `src/lib/notifications/triggers.ts` | After email, call SMS function if `sms: true` |
| 4.6 | Email receipt for M-Pesa payments | `src/lib/email/payment-emails.ts` | M-Pesa receipt number, amount, date, booking reference |
| 4.7 | Review prompt email (72h after completion) | Cron or trigger | Send follow-up email if customer hasn't reviewed |

#### Email Templates Needed

| Template | Trigger | Recipient | Content |
|----------|---------|-----------|---------|
| `booking-confirmed` | Provider accepts | Customer | Provider name, service, date/time, chat link |
| `booking-cancelled` | Provider/customer cancels | Other party | Reason, next steps |
| `quote-received` | Provider sends quote | Customer | Amount, breakdown, accept/reject CTA |
| `payment-confirmed` | M-Pesa callback success | Customer | Amount, M-Pesa receipt #, booking ref |
| `payment-failed` | M-Pesa callback fail | Customer | Retry CTA |
| `job-completed` | Provider marks complete | Customer | Confirm/dispute CTA |
| `review-prompt` | 72h after completion | Customer | Stars CTA, provider name |
| `job-scheduled` | Provider schedules | Customer | Date/time, location, provider contact |

#### New Files

| File | Purpose |
|------|---------|
| `src/lib/email/booking-emails.ts` | 7 booking email templates (~500 lines) |
| `src/lib/email/payment-emails.ts` | 3 payment email templates (~200 lines) |
| `src/lib/sms/index.ts` | SMS gateway client (~150 lines) |
| `src/lib/sms/templates.ts` | SMS message templates (~100 lines) |

#### Environment Variables Needed

```env
# Resend (already should exist for listing emails)
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=bookings@mitasafi.co.ke

# Africa's Talking (SMS)
AT_API_KEY=atsk_xxxx
AT_USERNAME=sandbox  # or production username
AT_SENDER_ID=MITASAFI  # registered sender ID
```

---

### CM-5: Disputes & Refunds
**Priority:** HIGH | **Effort:** 3-4 days | **Dependencies:** CM-4 (for email notifications)

#### Tasks

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 5.1 | Create dispute filing form | `src/components/booking/DisputeForm.tsx` | Reason selection, description, photo evidence upload (max 10), desired resolution |
| 5.2 | Create dispute page | `src/app/dashboard/bookings/[id]/dispute/page.tsx` | Auth gate, status check (only for `completed`/`customer_confirmed`), render form |
| 5.3 | Create dispute server action | `src/app/dashboard/bookings/[id]/dispute/actions.ts` | Insert `booking_disputes`, update booking status to `disputed`, notify provider + admin |
| 5.4 | Create dispute API route | `src/app/api/bookings/[id]/dispute/route.ts` | POST: create dispute |
| 5.5 | Dispute status tracking UI | `src/components/booking/DisputeStatus.tsx` | Timeline of dispute resolution steps |
| 5.6 | Wire "Raise Dispute" button | `CustomerBookingActions.tsx` | Replace TODO comment with link to dispute page |
| 5.7 | Create refund request logic | `src/lib/payments/refunds.ts` | Calculate refund amount, create refund record |
| 5.8 | Add dispute view to booking detail | `src/app/dashboard/bookings/[id]/page.tsx` | Show dispute status when booking is `disputed` |
| 5.9 | Dispute notification emails | `src/lib/email/dispute-emails.ts` | Filed, updated, resolved notifications |

#### Database Changes

```sql
-- Dispute evidence table (if not in existing migration)
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES booking_disputes(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add refund columns to booking_payments if not present
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('requested', 'processing', 'completed', 'rejected'));
```

#### New Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/bookings/[id]/dispute/page.tsx` | Dispute filing page (~150 lines) |
| `src/app/dashboard/bookings/[id]/dispute/actions.ts` | Server actions (~200 lines) |
| `src/components/booking/DisputeForm.tsx` | Multi-step dispute form (~400 lines) |
| `src/components/booking/DisputeStatus.tsx` | Dispute timeline (~150 lines) |
| `src/lib/payments/refunds.ts` | Refund calculation/processing (~200 lines) |
| `src/lib/email/dispute-emails.ts` | Dispute email templates (~200 lines) |

---

### CM-6: Search & Discovery Polish
**Priority:** MEDIUM | **Effort:** 2-3 days | **Dependencies:** None

Fix the broken/incomplete search features.

#### Tasks

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 6.1 | Fix area filtering (service providers) | `src/lib/services/providers.ts` | Join `provider_service_areas` table, populate `service_areas` in card data, apply server-side area filter |
| 6.2 | Fix price filter pagination mismatch | `src/lib/services/providers.ts` | Move price filtering to SQL (extract min from JSONB) or adjust count |
| 6.3 | Add PostgreSQL full-text search | Migration + `src/lib/services/providers.ts` | Create GIN index on `business_name || tagline || bio`, use `to_tsvector`/`to_tsquery` |
| 6.4 | Analytics-driven suggested tags | `src/components/services/SuggestedTags.tsx` | Query popular search terms from `search_alerts` or new `search_logs` table |
| 6.5 | Dynamic landing page stats | `src/components/landing/TrustBar.tsx`, `ServiceDiscoverySection.tsx` | Query real counts from DB (provider count, booking count, average rating) |
| 6.6 | Clean up dead /services/providers/[id]/ route | Delete directory | Remove empty directory or add redirect to /services/provider/[id] |

#### Database Changes

```sql
-- Full-text search index on service_providers
CREATE INDEX IF NOT EXISTS idx_service_providers_fts 
ON service_providers USING GIN (
  to_tsvector('english', coalesce(business_name, '') || ' ' || coalesce(tagline, '') || ' ' || coalesce(bio, ''))
);

-- Search logs for analytics-driven suggestions
CREATE TABLE search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  category_slug TEXT,
  results_count INT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_search_logs_query ON search_logs (lower(query));

-- Platform stats materialized view (refresh daily via cron)
CREATE MATERIALIZED VIEW platform_stats AS
SELECT
  (SELECT COUNT(*) FROM service_providers WHERE is_active = true) as active_providers,
  (SELECT COUNT(*) FROM bookings WHERE status IN ('completed', 'customer_confirmed')) as completed_bookings,
  (SELECT ROUND(AVG(average_rating), 1) FROM service_providers WHERE average_rating > 0) as avg_rating,
  (SELECT COUNT(*) FROM listings WHERE status = 'active') as active_listings,
  now() as refreshed_at;
```

---

### CM-7: Property Experience Enhancement
**Priority:** MEDIUM | **Effort:** 3-4 days | **Dependencies:** None

#### Tasks

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 7.1 | Map integration (Google Maps or Leaflet) | `src/components/listings/MapView.tsx` | Property location map on listing detail page |
| 7.2 | Property comparison tool | `src/components/browse/CompareListings.tsx` | Side-by-side comparison (up to 3), reuse CompareProviders pattern |
| 7.3 | Listing photo lightbox | `src/components/listings/PhotoLightbox.tsx` | Full-screen gallery with keyboard nav (reuse PortfolioGallery) |
| 7.4 | Search results map view | `src/components/browse/MapListingsView.tsx` | Toggle between grid/map on /properties page |
| 7.5 | Recently viewed listings | `src/hooks/useRecentlyViewedListings.ts` | Track viewed listings (similar to providers) |
| 7.6 | Share listing (copy toast) | `ListingDetailClient.tsx` | Add toast confirmation when URL copied |

#### Environment Variables Needed

```env
# Google Maps (if using Google Maps)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy_xxxx
```

#### New Files

| File | Purpose |
|------|---------|
| `src/components/listings/MapView.tsx` | Single listing map (~200 lines) |
| `src/components/listings/PhotoLightbox.tsx` | Full-screen photo gallery (~250 lines) |
| `src/components/browse/CompareListings.tsx` | Property comparison (~500 lines) |
| `src/components/browse/MapListingsView.tsx` | Map-based results view (~400 lines) |

---

### CM-8: Content Pages & Footer Links
**Priority:** LOW | **Effort:** 2-3 days | **Dependencies:** None

Fix all dead footer links with proper content pages.

#### Tasks

| # | Task | Route | Details |
|---|------|-------|---------|
| 8.1 | About page | `/about` | Company mission, team, story |
| 8.2 | Privacy policy | `/privacy` | GDPR-compliant, Kenya Data Protection Act |
| 8.3 | Terms of service | `/terms` | User agreement |
| 8.4 | Cookie policy | `/cookies` | Cookie consent |
| 8.5 | Tenant rights | `/tenant-rights` | Kenya Rent Restriction Act info |
| 8.6 | Help center | `/help` | FAQ categories, contact info |
| 8.7 | Safety guide | `/safety` | Online safety tips |
| 8.8 | Blog (placeholder) | `/blog` | "Coming soon" or first 3 articles |
| 8.9 | Careers page | `/careers` | Open positions or "Coming soon" |

#### New Files

| File | Purpose |
|------|---------|
| `src/app/about/page.tsx` | About us (~200 lines) |
| `src/app/privacy/page.tsx` | Privacy policy (~300 lines) |
| `src/app/terms/page.tsx` | Terms of service (~400 lines) |
| `src/app/cookies/page.tsx` | Cookie policy (~150 lines) |
| `src/app/tenant-rights/page.tsx` | Tenant rights info (~200 lines) |
| `src/app/help/page.tsx` | Help center (~250 lines) |
| `src/app/safety/page.tsx` | Safety tips (~150 lines) |
| `src/app/blog/page.tsx` | Blog placeholder (~100 lines) |
| `src/app/careers/page.tsx` | Careers placeholder (~100 lines) |

---

### CM-9: Regenerate Database Types & Type Safety
**Priority:** HIGH | **Effort:** 0.5 day | **Dependencies:** None (do anytime)

#### Tasks

| # | Task | Details |
|---|------|---------|
| 9.1 | Run `supabase gen types` | Regenerate `src/types/database.ts` to include all booking, payment, review, notification tables |
| 9.2 | Remove all `as any` casts | Find and fix all Supabase query casts in booking/payment/review code |
| 9.3 | Remove all `as never` casts | Fix `saved_listings` and `notifications` queries |
| 9.4 | Update manual types | Ensure `bookings.ts`, `payments.ts`, `reviews.ts` align with generated types |
| 9.5 | Add strict TypeScript checks | Enable `noUncheckedIndexedAccess` if not already |

---

## Implementation Priority Order

```
Week 1:  CM-9 (Types, 0.5d) → CM-1 (Quick Fixes, 2d) → CM-2 starts (Profile, 2d)
Week 2:  CM-2 finishes (2d) → CM-3 (Dashboard Home, 3d)
Week 3:  CM-4 (Communication, 4d) ← can start in parallel with CM-3
Week 4:  CM-5 (Disputes, 4d) + CM-6 (Search Polish, 3d)
Week 5:  CM-7 (Property UX, 4d) + CM-8 (Content Pages, 3d)
```

### Estimated Total Effort

| Milestone | Effort | Priority |
|-----------|--------|----------|
| CM-9: Type Safety | 0.5 days | HIGH |
| CM-1: Quick Fixes | 1-2 days | CRITICAL |
| CM-2: Profile & Settings | 3-4 days | CRITICAL |
| CM-3: Dashboard Home | 2-3 days | CRITICAL |
| CM-4: Communication | 3-4 days | HIGH |
| CM-5: Disputes & Refunds | 3-4 days | HIGH |
| CM-6: Search Polish | 2-3 days | MEDIUM |
| CM-7: Property UX | 3-4 days | MEDIUM |
| CM-8: Content Pages | 2-3 days | LOW |
| **Total** | **~21-29 days** | — |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Customer-facing pages analyzed | 32 |
| Components analyzed | 58 |
| API routes analyzed | 28 |
| Hooks analyzed | 9 |
| Library modules analyzed | 12 |
| Database tables audited | 21 |
| Features fully complete | 68 |
| Features partially complete | 12 |
| Features not started | 16 |
| New files needed (all milestones) | ~35 |
| New DB tables/views needed | 3-4 |
| Estimated total effort | 21-29 days |
