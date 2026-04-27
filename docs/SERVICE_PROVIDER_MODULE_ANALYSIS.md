# Service Provider Module — Comprehensive File Inventory

> **Generated:** 2025-01-XX  
> **Scope:** All files under `src/app/dashboard/provider/`, `src/app/dashboard/verify-provider/`, and `src/app/(auth)/onboarding/provider-type/`  
> **Total Files:** 63

---

## Table of Contents

1. [Summary Statistics](#summary-statistics)
2. [Dashboard Shell](#1-dashboard-shell)
3. [Profile Management](#2-profile-management)
4. [Availability](#3-availability)
5. [Calendar](#4-calendar)
6. [Earnings & Payouts](#5-earnings--payouts)
7. [Jobs / Bookings](#6-jobs--bookings)
8. [Quotes](#7-quotes)
9. [Reviews](#8-reviews)
10. [Services CRUD](#9-services-crud)
11. [Service Wizard (Add New)](#10-service-wizard-add-new)
12. [Service Preview & Edit](#11-service-preview--edit)
13. [Messages](#12-messages)
14. [Settings](#13-settings)
15. [Verification Flow](#14-verification-flow)
16. [Onboarding](#15-onboarding)
17. [Cross-Cutting Concerns](#cross-cutting-concerns)
18. [Supabase Tables Referenced](#supabase-tables-referenced)
19. [What's Missing / Gap Analysis](#whats-missing--gap-analysis)

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total files** | 63 |
| **Fully implemented** | 58 |
| **Partial / Stub** | 1 (`settings/page.tsx`) |
| **Loading skeletons** | 2 |
| **Barrel exports** | 1 |
| **Type-only files** | 1 |
| **Server components** | ~18 |
| **Client components** | ~30 |
| **Server actions files** | 7 |
| **Total lines of code** | ~14,500+ |

---

## 1. Dashboard Shell

### `src/app/dashboard/provider/layout.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 98 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Auth gate → role check → `business_type` null guard (redirects to onboarding) → verification status check → badge counts → builds `ProviderSidebarProfile` → renders `ProviderDashboardShell` |
| **Supabase tables** | `profiles` (verification_level), `service_providers` (business_type, is_verified, profile_photo_url), `notifications` (count, is_read), `booking_messages` (count, is_read) |
| **Performance** | "Single database query (was 4 separate queries), 290ms → 60ms" (per comment) |
| **TODOs/FIXMEs** | None |
| **Missing** | Nothing |

### `src/app/dashboard/provider/ProviderDashboardShell.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 276 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component (`"use client"`) |
| **Functionality** | Sidebar + header shell. 9 nav items: Dashboard, Jobs, Messages, My Services, Earnings, Reviews, Availability, Quotes, Calendar. Mobile responsive hamburger menu, profile dropdown (View/Edit Profile, Settings, Sign out), unread badge counts for Jobs + Messages |
| **Supabase tables** | None (receives data via props from layout) |
| **TODOs/FIXMEs** | None |
| **Missing** | Nothing |

### `src/app/dashboard/provider/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 411 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Dashboard home page. Verification progress banner (3 steps with progress), 4 stat cards (Completed Jobs, Monthly Earnings KES, Rating, Response Rate), Recent Requests list with status badges + quick actions, `SocialTrafficCard` widget |
| **Supabase tables** | Via `getCachedDashboardStats`, `getCachedRecentJobs` (from `@/lib/cache/queries`) |
| **TODOs/FIXMEs** | None |
| **Missing** | Nothing |

### `src/app/dashboard/provider/SocialTrafficCard.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 120 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component (async) |
| **Functionality** | Social link click analytics widget. Total clicks, sparkline bar chart, per-platform breakdown (Instagram, Facebook, Twitter, WhatsApp, TikTok, LinkedIn, YouTube, Website) |
| **Supabase tables** | Via `getSocialClickStats` from `@/lib/services/social-analytics` |
| **TODOs/FIXMEs** | None |
| **Missing** | Nothing |

---

## 2. Profile Management

### `src/app/dashboard/provider/profile/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 52 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Fetches provider profile + neighborhoods in parallel via `Promise.all`, renders `ProfileSetupWizard` |
| **Supabase tables** | Via `getProviderProfile`, `getNeighborhoodsByCluster` (from local actions.ts) |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/profile/actions.ts`
| Field | Value |
|-------|-------|
| **Lines** | 990 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server actions (`"use server"`) |
| **Functionality** | Comprehensive CRUD: `getNeighborhoodsByCluster`, `getProviderProfile` (parallel queries), `updateProfileBasics` (headline, bio, years_experience, languages), `updateSocialLinks`, `uploadProfilePhoto` (admin storage), `updateProfilePhoto`, `updateServiceAreas` (delete+reinsert pattern), `updateWorkingHours` (converts day-of-week → RFC recurrence rules for `provider_availability_intervals`), `getProviderServiceAreas`, `getProviderWorkingHours` (converts recurrence rules → day-of-week), `recalculateProfileCompletion` (calls `calculate_provider_profile_completion` RPC) |
| **Supabase tables** | `neighborhoods`, `service_providers`, `profiles`, `provider_service_areas`, `provider_availability_intervals` |
| **Performance** | Uses `getCachedUser()` for auth deduplication across all actions |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/profile/ProfileSetupWizard.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 270 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | 6-step wizard: Photo → Basics → Areas → Hours → Socials → Complete. Tracks completion per step, allows revisiting. Complete state offers "Add Your Services" CTA |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/profile/ProfileBasicsForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 220 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Headline (10-80 chars with auto-suggestion), Bio (100-500 chars), Years Experience dropdown, Language multi-select with pill buttons |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/profile/ProfilePhotoUpload.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 240 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Photo upload with client-side compression (800×800, quality 0.85), preview, remove. Skip option. Validates JPG/PNG/WebP, 5MB max |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/profile/ServiceAreasForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 350 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Base neighborhood dropdown (grouped by cluster), service radius slider (5-50km), neighborhood multi-select (max 10) with cluster expand/collapse + "Select All" per cluster |
| **Supabase tables** | `neighborhoods` (via props from parent) |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/profile/SocialLinksForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 195 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Social media handles form with URL prefix display. Extracts handles from full URLs. Platforms from `SOCIAL_PLATFORMS` config. Optional step |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/profile/WorkingHoursForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 413 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Weekly schedule with day toggles + time selectors (30-min intervals, 06:00-22:00), quick templates (Mon-Fri / Mon-Sat / All Week), response time dropdown, emergency availability toggle with surcharge (percent or fixed KES) |
| **TODOs/FIXMEs** | None |

---

## 3. Availability

### `src/app/dashboard/provider/availability/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 41 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Fetches working hours via `getProviderWorkingHours()`, renders `AvailabilityClient` |

### `src/app/dashboard/provider/availability/AvailabilityClient.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 427 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Standalone version of `WorkingHoursForm` for the dedicated Availability page. Full weekly schedule editor with templates, response time, emergency config. Calls `updateWorkingHours` server action |
| **Supabase tables** | Via `updateWorkingHours` (provider_availability_intervals) |
| **TODOs/FIXMEs** | None |

---

## 4. Calendar

### `src/app/dashboard/provider/calendar/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 100 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Week navigation via URL search params, fetches scheduled bookings via `getProviderScheduledBookings`, renders `CalendarView` |
| **Supabase tables** | `bookings` (scheduled_start, scheduled_end, status, service, customer) |

### `src/app/dashboard/provider/calendar/CalendarView.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 230 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | 7-day week grid with prev/next/today navigation, bookings slotted by day with status colors (confirmed=teal, in_progress=blue, completed=emerald) and time display |
| **TODOs/FIXMEs** | None |

---

## 5. Earnings & Payouts

### `src/app/dashboard/provider/earnings/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 325 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Wallet balance card, 4 stat cards (Wallet Balance, This Month, Total Earnings, Pending Payouts), commission info (10% MitaSafi commission), transaction history table with status badges (completed/pending/failed), Request Payout CTA |
| **Supabase tables** | Via `getProviderEarnings`, `getProviderTransactions` |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/earnings/payout/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 76 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Redirects if wallet balance < KES 100. Shows balance card + `PayoutForm` |
| **Supabase tables** | Via `getProviderEarnings` |

### `src/app/dashboard/provider/earnings/payout/PayoutForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 235 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | M-Pesa payout request. Amount input (min KES 100, max balance), Kenyan phone validation (+254...), payout summary with MitaSafi commission, success animation. Integrates `requestPayout` server action |
| **TODOs/FIXMEs** | None |

---

## 6. Jobs / Bookings

### `src/app/dashboard/provider/jobs/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 310 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Tab-based job list (Pending / Quoting / Active / Completed / All) with counts per tab, pagination, status badges, quote action hints. Sort by date |
| **Supabase tables** | `bookings` via `getProviderBookings`, `getProviderBookingCounts` |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/jobs/[id]/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 449 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Full job detail page. Status banner, `JobActionButtons`, service card, customer card (name, phone, email, verified badge), location/schedule/notes/pricing sections, current quote card with breakdown (line items + total), `BookingChat` component, `JobPhotos` component, `StatusTimeline` component |
| **Supabase tables** | `bookings` (with joins: services, profiles, booking_quotes, booking_messages) |

### `src/app/dashboard/provider/jobs/[id]/actions.ts`
| Field | Value |
|-------|-------|
| **Lines** | 394 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server actions |
| **Functionality** | `acceptBooking` (submitted→confirmed), `rejectBooking` (→cancelled_provider), `confirmBookingAfterQuote` (quote_accepted→confirmed). All use audit context via `set_config` RPC for trigger compliance. Sends notifications via `createNotification` |
| **Supabase tables** | `bookings` (status transitions), `booking_quotes`, `notifications` |
| **Security** | Session-verified, provider ownership check, audit trail via `set_config('app.audit_user_id', ...)` |

### `src/app/dashboard/provider/jobs/[id]/JobActionButtons.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 558 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Two-phase action system: **Negotiation phase** (Accept Job / Send Quote / Decline with reason dialog) and **Lifecycle phase** (Schedule / Start / Complete / Cancel with reason dialog). Uses `PROVIDER_LIFECYCLE_TRANSITIONS` config for lifecycle buttons. Integrates `booking-lifecycle` service actions for lifecycle transitions. Confirm-after-quote flow for quote_accepted status |
| **Supabase tables** | Via imported server actions |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/jobs/[id]/quote/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 175 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Quote creation/revision page. Status guard (`QUOTABLE_STATUSES`), pre-populates from existing quote for revision, shows customer feedback if quote was rejected |
| **Supabase tables** | `bookings`, `booking_quotes` |

### `src/app/dashboard/provider/jobs/[id]/quote/QuoteForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 444 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Multi-field form: dynamic breakdown rows (add/remove line items), auto-computed total, manual total override toggle, description textarea, validity days (1-90). Clean validation with error messages |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/jobs/[id]/quote/actions.ts`
| Field | Value |
|-------|-------|
| **Lines** | 354 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server actions |
| **Functionality** | `submitQuote` — 3-step flow: (1) transition to `quote_pending` with `pricing_snapshot`, (2) upsert `booking_quotes` row (INSERT for new, UPDATE for revision with `revision_count` increment), (3) transition to `quote_sent`. Respects immutable `pricing_snapshot` constraint (only set once) |
| **Supabase tables** | `bookings` (status, pricing_snapshot), `booking_quotes` (total_amount, breakdown, description, validity_days, revision_count) |
| **Security** | Provider ownership verified, audit context set |

### `src/app/dashboard/provider/jobs/[id]/schedule/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 135 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Schedule page for confirmed bookings. Status guard (confirmed, requires_followup, rework_required, customer_no_show) |
| **Supabase tables** | `bookings` |

### `src/app/dashboard/provider/jobs/[id]/schedule/ScheduleJobForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 210 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Date picker + time slot selector (06:00-22:00 in 30-min intervals) + optional end time. Pre-fills from existing schedule. Validates future dates. Uses `scheduleJob` from `booking-lifecycle` service |
| **TODOs/FIXMEs** | None |

---

## 7. Quotes

### `src/app/dashboard/provider/quotes/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 186 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Lists all provider quotes with stat cards (Total Quotes / Awaiting Response / Accepted / Declined), status badges, links to job detail |
| **Supabase tables** | `booking_quotes` (with join to `bookings` → `services`) |
| **TODOs/FIXMEs** | None |

---

## 8. Reviews

### `src/app/dashboard/provider/reviews/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 60 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Fetches reviews + review summary in parallel via `Promise.all` |
| **Supabase tables** | `reviews` (with votes + reviewer profile) |

### `src/app/dashboard/provider/reviews/actions.ts`
| Field | Value |
|-------|-------|
| **Lines** | 17 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server actions (re-export wrapper) |
| **Functionality** | Re-exports `submitProviderResponse` from shared reviews service |

### `src/app/dashboard/provider/reviews/ProviderReviewsClient.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 601 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Full-featured reviews dashboard: `RatingSummaryCard` (average rating, distribution bar chart, dimension averages for quality/communication/timeliness/professionalism/value), rating filter pills, sort dropdown (newest/oldest/highest/lowest), paginated review list, provider response form per review (textarea + submit), verified booking badges, review photos, helpfulness counts |
| **TODOs/FIXMEs** | None |

---

## 9. Services CRUD

### `src/app/dashboard/provider/services/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 79 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Lists services via `getProviderServices()`. Renders `ServicesGrid` or `ServicesEmptyState`. No verification gate |

### `src/app/dashboard/provider/services/actions.ts`
| Field | Value |
|-------|-------|
| **Lines** | 840 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server actions |
| **Functionality** | `getNeighborhoodsGrouped`, `uploadServiceImage` (to `provider-documents` bucket, admin client), `deleteServiceImage` (storage cleanup), `addProviderServices` (upsert to `provider_services` with `custom_pricing` JSON including `image_urls`), `toggleServiceActive`, `updateProviderService` (price/type/description/images), `deleteProviderService` (with storage cleanup), `getProviderServices` (uses `services_with_categories` materialized view), `getServicePreview` (parallel: service + provider + areas), `getServiceForEdit` |
| **Supabase tables** | `provider_services`, `services_with_categories` (materialized view), `service_providers`, `provider_service_areas`, `neighborhoods` |
| **Storage bucket** | `provider-documents` (admin client for uploads, bypasses RLS) |

### `src/app/dashboard/provider/services/ServicesGrid.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 434 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Marketplace-style card grid. Image/status/price/rating/3-dot menu per card. Optimistic toggling (active/paused) and deletion with confirmation modal. Category grouping. Shows member-since date, location, verified status. Edit/Preview links per card |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/services/ServicesEmptyState.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 48 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Simple empty state with "Add Your First Service" CTA linking to `/services/new` |

---

## 10. Service Wizard (Add New)

### `src/app/dashboard/provider/services/new/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 24 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Wraps `ServiceWizardContent` in `WizardProvider` context |

### `src/app/dashboard/provider/services/new/context.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 242 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component (React Context + useReducer) |
| **Functionality** | Full wizard state management using `immer` for immutable updates. Actions: SET_STEP, NEXT_STEP, PREV_STEP, UPDATE_FORM_DATA, ADD_SERVICE, REMOVE_SERVICE, UPDATE_SERVICE, SET_ERRORS, CLEAR_ERRORS, SET_SUBMITTING, RESET. Exports `WizardProvider` and `useWizard` hook. Step validation on navigation |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/services/new/types.ts`
| Field | Value |
|-------|-------|
| **Lines** | 221 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Type definitions |
| **Functionality** | `TOTAL_STEPS=6`, `WIZARD_STEPS` config, `PRICE_TYPES` (fixed/starting_from/quote), `CATEGORY_PRICE_DEFAULTS` (25 categories mapped to default price types), `SelectedService` interface, `ServiceFormData` interface (categoryIds, selectedServices, serviceAreas, serviceImages), `WizardState`, `validateStep()` (validation for all 6 steps), `AddServicesInput` |

### `src/app/dashboard/provider/services/new/ServiceWizardContent.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 207 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Main wizard UI wrapper. Progress step indicators (numbered circles with connector lines), step rendering (switch on currentStep), navigation footer (Back/Continue/Add Services), submission handler via `addProviderServices` server action with service image URL mapping |
| **TODOs/FIXMEs** | `alert()` used for error display (comment: "in real app would use toast") |

### `src/app/dashboard/provider/services/new/steps/index.ts`
| Field | Value |
|-------|-------|
| **Lines** | 13 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Barrel export |
| **Functionality** | Re-exports Step1-Step6 components |

### `src/app/dashboard/provider/services/new/steps/Step1Category.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 352 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Multi-category selection (max 5). Loads categories from `getAllCategories()` on mount. Tiered display: Main (12 primary) always visible, More Services (8 non-primary) collapsed by default. Search filtering across all categories. Checkbox-style selection with counter and "maximum reached" warning |
| **Supabase tables** | `service_categories` (via `getAllCategories` from `@/lib/data/services`) |

### `src/app/dashboard/provider/services/new/steps/Step2Services.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 286 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Per-category service selection. Shows services for current category (paginated through categories with dots indicator). Uses `getServicesByCategoryIds()` (server-filtered). Search within current category. Checkbox-style multi-select. Default price type from `CATEGORY_PRICE_DEFAULTS`. "I don't offer X services" skip option |
| **Supabase tables** | `services` (via `getServicesByCategoryIds`) |

### `src/app/dashboard/provider/services/new/steps/Step3Pricing.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 259 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Per-service pricing editor. Price type radio selection (fixed/starting_from/quote), KES amount input (hidden for quote type). Bulk pricing option when >3 services selected (apply same price type/amount to all). Summary card |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/services/new/steps/Step4ServiceAreas.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 230 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Neighborhood selection grouped by cluster. Loads neighborhoods via `getNeighborhoodsGrouped()` server action (bypasses RLS). Search filtering. "Can travel outside" checkbox option. Selected count display. Syncs to formData via useEffect |
| **Supabase tables** | `neighborhoods` (via server action) |

### `src/app/dashboard/provider/services/new/steps/Step5DescriptionImages.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 340 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Per-service description (200 chars, optional) + photo upload (1-3 required per service, immediate upload to Supabase Storage via `uploadServiceImage`). Service navigator for multiple services. Syncs all data to formData on every change |
| **Supabase tables** | Storage: `provider-documents` bucket (via `uploadServiceImage`) |

### `src/app/dashboard/provider/services/new/steps/Step6Review.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 182 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Pure review screen. Per-service summary cards with image strip thumbnails, pricing display, description preview, photo count. Service areas summary. "Before you publish" info note. Submission handled by parent footer button |
| **TODOs/FIXMEs** | Area names display just shows count (comment: "in production would fetch from DB") |

---

## 11. Service Preview & Edit

### `src/app/dashboard/provider/services/[id]/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 27 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component (thin wrapper) |
| **Functionality** | Fetches service preview data, redirects on error, renders `ServicePreviewClient` |

### `src/app/dashboard/provider/services/[id]/ServicePreviewClient.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 778 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Rich Fiverr-style marketplace preview. Two-column layout: left = image gallery (3-image grid with lightbox + thumbnails), about section, service areas tags, reviews placeholder. Right = sticky `PriceCard` (provider avatar, rating stars, location, member since, jobs completed, price display, Request Service CTA, WhatsApp + Call buttons, trust indicators) + `StatsCard` (2x2 grid: rating, jobs done, response time, experience). Share button, Edit CTA, mobile bottom bar with price + WhatsApp + Request |
| **TODOs/FIXMEs** | Reviews section shows placeholder ("full reviews coming soon") — does not fetch actual reviews per-service |

### `src/app/dashboard/provider/services/[id]/loading.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 67 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Loading skeleton |
| **Functionality** | Shimmer skeleton matching the preview layout (banner, breadcrumb, title, provider bar, image gallery, sidebar) |

### `src/app/dashboard/provider/services/[id]/edit/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 49 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Fetches service for edit via `getServiceForEdit()`, extracts `custom_pricing` JSON, renders `ServiceEditForm` with initial values |

### `src/app/dashboard/provider/services/[id]/edit/ServiceEditForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 305 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Focused edit form. Price type selection (3 radio cards), KES amount input, description textarea (200 chars), photo management (upload/remove, max 3, required minimum 1). Change detection (`hasChanges`), "Saved" confirmation animation. Uses `updateProviderService`, `uploadServiceImage`, `deleteServiceImage` server actions |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/provider/services/[id]/edit/loading.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 45 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Loading skeleton |

---

## 12. Messages

### `src/app/dashboard/provider/messages/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 272 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Lists booking conversations. Queries bookings → booking_messages → profiles. Groups by booking, shows latest message, unread counts. Sorted by recency. Links to job detail |
| **Supabase tables** | `bookings`, `booking_messages`, `profiles` |
| **TODOs/FIXMEs** | None |

---

## 13. Settings

### `src/app/dashboard/provider/settings/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 176 |
| **Status** | ⚠️ PARTIAL / STUB |
| **Component type** | Client component |
| **Functionality** | Visual-only notification toggles (Email, SMS, Push — not connected to Supabase), push notifications marked "Coming soon", password change links to `/auth/reset-password`, deactivate account button (non-functional, no action handler) |
| **Supabase tables** | None (no queries or mutations) |
| **TODOs/FIXMEs** | Toggle state is local-only (resets on refresh), no server persistence. Deactivate button has no `onClick` handler |
| **Missing** | Server action for saving notification preferences. Server action for account deactivation. Push notification integration. Account deletion flow |

---

## 14. Verification Flow

### `src/app/dashboard/verify-provider/layout.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 43 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | Auth check, verifies `service_provider` role in `user_roles`, bypasses dashboard shell for clean verification UX |
| **Supabase tables** | `user_roles` |

### `src/app/dashboard/verify-provider/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 251 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server component |
| **Functionality** | 3-step verification orchestrator. Determines current step based on `verification_level` + `business_type` + `is_verified`. Auto-syncs Supabase phone-verified users to `verification_level: "phone"`. Auto-fixes stale `verification_level` when provider is already verified. Renders step-specific form component. Progress step indicators. Redirects to dashboard when complete |
| **Supabase tables** | `profiles` (verification_level), `service_providers` (business_type, is_verified, is_active) |

### `src/app/dashboard/verify-provider/actions.ts`
| Field | Value |
|-------|-------|
| **Lines** | 610 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server actions |
| **Functionality** | **Step 1 — Phone OTP**: `sendPhoneOTP` (rate limiting: 3 per 15min, OTP expiry: 5min, Kenyan phone validation +254), `verifyPhoneOTP` (max 3 attempts, expires, updates profile.verification_level to "phone"). SMS gateway configurable (dev mode: console log + return OTP; production: Africa's Talking stub). **Step 2 — Provider Type**: `setProviderType` (individual/company, admin client). **Step 3 — Identity**: `uploadVerificationDocument` (to `provider-documents` storage, records in `provider_documents` table), `completeIdentityVerification` (validates required docs by type — individual: national_id + selfie_with_id; business: business_registration + kra_certificate; auto-approves for MVP, updates is_verified + is_active + verification_level to "full") |
| **Supabase tables** | `phone_verifications`, `profiles`, `service_providers`, `provider_documents` |
| **Storage bucket** | `provider-documents` |
| **TODOs/FIXMEs** | `// TODO: Production SMS integration` (Africa's Talking code is commented out). OTP stored in plaintext (comment: "In production, hash this"). Auto-approve for MVP (comment: "in production, set to pending for manual review") |

### `src/app/dashboard/verify-provider/PhoneVerificationForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 394 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Two-phase form: (1) Phone input with Kenyan formatting (+254..., auto-converts 07... format), (2) 6-digit OTP input with individual boxes, auto-advance, paste support, auto-submit on completion. 60-second resend countdown. DEV MODE: displays OTP on screen when SMS disabled. Success animation → redirect |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/verify-provider/ProviderTypeForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 176 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Individual vs Business selection cards with icon, description, and feature list. Single selection + Continue button. Used within verify-provider flow (simpler version than onboarding) |
| **TODOs/FIXMEs** | None |

### `src/app/dashboard/verify-provider/IdentityVerificationForm.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 283 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component |
| **Functionality** | Document upload for identity verification. Individual: National ID + Selfie with ID. Business: Business Registration + KRA PIN Certificate. File validation (5MB max, JPG/PNG/WebP/PDF). Upload status per document. Remove uploaded file. "Complete Verification" submit. 24-hour review note |
| **TODOs/FIXMEs** | None |

---

## 15. Onboarding

### `src/app/(auth)/onboarding/provider-type/page.tsx`
| Field | Value |
|-------|-------|
| **Lines** | 323 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Client component (with `Suspense` boundary) |
| **Functionality** | Post-signup onboarding step. Individual vs Business selection with rich card UI ("Recommended" badge on Individual), business tooltip, FAQ accordion. Sanitized redirect URL (prevents open redirect attacks). Calls `setProviderType` server action → redirects to dashboard |
| **Supabase tables** | Via server action |
| **Security** | `sanitizeRedirectUrl()` — validates dashboard-only paths, blocks protocol injection and path traversal |

### `src/app/(auth)/onboarding/provider-type/actions.ts`
| Field | Value |
|-------|-------|
| **Lines** | 146 |
| **Status** | ✅ FULLY IMPLEMENTED |
| **Component type** | Server actions |
| **Functionality** | `setProviderType` — creates or updates provider record. Handles race condition (check → insert, with 23505 unique constraint retry). Builds provider record with `business_name` from profile/user_metadata/email. Upserts `user_roles` entry. Uses admin client (bypasses RLS) |
| **Supabase tables** | `service_providers`, `profiles`, `user_roles` |
| **Race condition handling** | Check for existing → INSERT → on 23505 → retry UPDATE |

---

## Cross-Cutting Concerns

### Authentication Pattern
All server components and actions use `getCachedUser()` from `@/lib/cache/queries` for request-level deduplication. Admin client (`createAdminClient()`) used for storage uploads and operations that bypass RLS.

### Performance Patterns
- `React.cache()` for auth deduplication (layout + page share same auth call)
- `Promise.all` for parallel data fetching (profile page, reviews page, service preview)
- `services_with_categories` materialized view for 15x faster service queries
- Single consolidated query in layout (was 4 separate queries, 290ms→60ms)

### Kenya-Specific Features
- KES currency throughout (earnings, pricing, payouts)
- M-Pesa payout integration
- Kenyan phone validation (+254 format, 12 digits)
- `en-KE` locale for date formatting
- Nairobi neighborhoods (clustered)
- Africa's Talking SMS gateway (stub)
- National ID + KRA PIN verification documents

### Design System
- Teal brand color (`bg-teal-600`, `text-teal-700`)
- Stripe/Linear-inspired stat cards
- Lucide React icons throughout
- Tailwind CSS utility classes
- Mobile-first responsive (sidebar collapses to hamburger)

---

## Supabase Tables Referenced

| Table | Used In |
|-------|---------|
| `profiles` | layout, verify-provider, profile/actions |
| `service_providers` | layout, verify-provider, profile/actions, services/actions |
| `user_roles` | verify-provider/layout, onboarding/actions |
| `notifications` | layout (badge count), jobs/actions (create) |
| `bookings` | jobs, calendar, messages, quotes |
| `booking_quotes` | jobs/quote/actions, quotes/page |
| `booking_messages` | layout (badge count), messages/page, jobs/[id] |
| `provider_services` | services/actions (CRUD) |
| `services` / `service_categories` | wizard steps (getAllCategories, getServicesByCategoryIds) |
| `services_with_categories` | services/actions (materialized view) |
| `provider_service_areas` | profile/actions, services/actions |
| `provider_availability_intervals` | profile/actions (working hours) |
| `neighborhoods` | profile/actions, services/new/Step4 |
| `phone_verifications` | verify-provider/actions (OTP) |
| `provider_documents` | verify-provider/actions (identity docs) |
| `reviews` | reviews/page (with votes + reviewer) |

### Storage Buckets
| Bucket | Used In |
|--------|---------|
| `provider-documents` | services/actions (service images), verify-provider/actions (ID docs), profile/actions (profile photo) |

---

## What's Missing / Gap Analysis

### 1. Settings Page (Critical Gap)
- **Notification preferences** are visual-only toggles — no server persistence
- **Account deactivation** button has no handler
- **Push notifications** marked "Coming soon"
- **Account deletion** flow missing entirely
- **Need:** Server action to save notification preferences to `service_providers` or new `notification_preferences` table

### 2. SMS Integration (Production Blocker)
- Africa's Talking integration is commented out stub code
- OTP stored in plaintext (should be hashed for production)
- **Need:** `SMS_ENABLED=true` + AT_API_KEY + AT_USERNAME env vars + uncomment AT code

### 3. Identity Verification (MVP Shortcut)
- Auto-approves documents immediately (no manual review queue)
- No admin panel for reviewing submitted documents
- **Need:** Admin review workflow, status transition from `pending` → `approved`/`rejected`

### 4. Service Preview — Reviews
- Per-service reviews section shows placeholder ("full reviews coming soon")
- Does not fetch or display actual reviews for the specific service
- **Need:** Query reviews filtered by `service_id` or `provider_service_id`

### 5. Error Handling in Wizard
- `ServiceWizardContent.tsx` uses `alert()` for submission errors
- **Need:** Toast notification system (e.g., `sonner` or custom)

### 6. Real-time Features
- Messages page is server-rendered (no real-time updates)
- Job status changes require page refresh
- **Need:** Supabase Realtime subscriptions for messages + booking status

### 7. Service Area Management in Wizard
- Step6 review shows area count but not area names (comment: "in production would fetch from DB")
- Areas selected in wizard are stored in `formData.serviceAreas` but not written to `provider_service_areas` on submission — the `addProviderServices` action only saves per-service data, not areas
- **Need:** Either save areas during wizard submission or confirm they're already set via Profile

### 8. Image Cleanup on Wizard Abandon
- Images uploaded during Step5 are immediately pushed to Supabase Storage
- If user abandons the wizard (Cancel/navigate away), orphaned images remain in storage
- **Need:** Cleanup job or deferred upload (only upload on final submit)

### 9. Provider Tier / Badge System
- `tier` field in `ServicePreviewData` is hardcoded to `null` (comment: "column doesn't exist in live DB yet")
- `verification_badge` is fetched but no UI for earning/displaying tier badges
- **Need:** Database column + tier calculation logic

### 10. Pagination in Reviews
- `ProviderReviewsClient` has pagination UI but depends on server returning paginated data
- No `page`/`offset` params visible in the reviews fetch
- **Need:** Verify server-side pagination support
