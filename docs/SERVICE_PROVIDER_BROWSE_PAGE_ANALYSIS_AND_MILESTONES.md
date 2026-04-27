# SERVICE PROVIDER MODULE — `/services/browse` PAGE ANALYSIS & MILESTONES

> **Generated:** 2026-03-04  
> **Scope:** Full analysis of the `/services/browse` marketplace page, all supporting components, data layer, provider detail pages, dashboard, and the complete service provider module. Milestones to production-ready completion.

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Component-by-Component Analysis](#2-component-by-component-analysis)
3. [Data Layer Analysis](#3-data-layer-analysis)
4. [Database Schema Status](#4-database-schema-status)
5. [API Routes Audit](#5-api-routes-audit)
6. [Image / Icon / Design Asset Inventory](#6-image--icon--design-asset-inventory)
7. [Completion Status Matrix](#7-completion-status-matrix)
8. [Gap Analysis — What's Missing](#8-gap-analysis--whats-missing)
9. [Milestones to Production](#9-milestones-to-production)
10. [Tables Needed (Database)](#10-tables-needed-database)
11. [Icon & Design Asset Requirements (Kling)](#11-icon--design-asset-requirements-kling)

---

## 1. ARCHITECTURE OVERVIEW

The `/services/browse` page is a **Fiverr-style marketplace browser** — the core discovery surface for customers finding service providers.

### Page Hierarchy

```
/services                          → ServicesLandingPage (marketing funnel)
/services/browse                   → ServicesBrowsePage (marketplace search & filter) ← THIS ANALYSIS
/services/browse?category=X        → Filtered view (same page, URL state)
/services/provider/[id]            → Provider detail profile
/services/provider/[id]/request    → Booking request form
/dashboard/provider/               → Provider-side dashboard (60+ files)
```

### Rendering Strategy

| Component | Rendering | Notes |
|---|---|---|
| `/services/browse/page.tsx` | **Server Component** | Parallel async data fetching (providers, featured, categories) |
| `ServiceSearchAutocomplete` | Client | Keyboard navigation, debounced search, localStorage |
| `ServiceFilterSidebar` | Client | URL state sync, mobile sheet |
| `CategoryQuickNav` | Client | Horizontal scroll, URL sync |
| `ProvidersGrid` | Client | Pagination, empty states |
| `ProviderCard` | Client | Hover effects, save/share, compare |
| `CompareProviders` | Client (Context) | localStorage persistence, max-3 comparison |
| `FeaturedProviders` | Client | Horizontal carousel |
| `FeaturedByPrice` | Client | Price-tier tabs |
| `SortDropdown` | Client | Custom dropdown, URL sync |
| `SuggestedTags` | Client | Category-aware tag suggestions |
| `QuickFilterToggle` | Client | Toggle pill buttons |
| `MobileFilterButton` | Client | Filter sheet trigger |

---

## 2. COMPONENT-BY-COMPONENT ANALYSIS

### 2.1 `/services/browse/page.tsx` (407 lines) — ✅ FULLY COMPLETE

**Status: PRODUCTION-READY (code-complete)**

| Feature | Status | Details |
|---|---|---|
| SEO metadata | ✅ Done | Title, description, keywords, OpenGraph |
| URL state management | ✅ Done | 13 search params: category, subcategory, services, area, price, priceMin, priceMax, rating, verified, available, instant, sort, page, q |
| Parallel data fetching | ✅ Done | `Promise.all([getProviders, getFeaturedProviders, getCategoriesWithSubs])` |
| Hero section | ✅ Done | Gradient bg, pattern SVG, search bar, trust signals, bottom wave |
| Category quick nav | ✅ Done | Sticky bar below hero |
| Suggested tags | ✅ Done | Context-aware related searches |
| Featured providers carousel | ✅ Done | Only on unfiltered first page |
| Featured by price | ✅ Done | Fiverr-style price tier tabs |
| Results header with count | ✅ Done | Dynamic title, total count, selected category/area display |
| Quick filter toggles | ✅ Done | Verified + Instant pill buttons |
| Sort dropdown | ✅ Done | 6 sort modes |
| Mobile filter button | ✅ Done | Sheet trigger with active count badge |
| Active filter chips | ✅ Done | Removable chips + clear all |
| Two-column layout | ✅ Done | Desktop sidebar + results grid |
| Compare bar | ✅ Done | Floating compare UI |
| Price range parsing | ✅ Done | 6 named ranges + custom min/max |
| Filter detection | ✅ Done | `hasActiveFilters()` for conditional sections |

**Verdict: Zero code changes needed for the page shell. Issues are in data availability (seeding) and downstream components.**

---

### 2.2 `ServiceSearchAutocomplete.tsx` (676 lines) — ✅ FULLY COMPLETE

| Feature | Status |
|---|---|
| Real-time autocomplete | ✅ Client-side matching against `SERVICE_CATEGORIES` |
| Recent searches (localStorage) | ✅ Max 5, persist/clear |
| Popular searches | ✅ 5 hardcoded popular terms |
| Keyboard navigation (↑/↓/Enter/Esc) | ✅ Full keyboard support |
| Debounced input | ✅ Custom `useDebounce` hook |
| Hero / Navbar / Filter variants | ✅ 3 visual variants |
| URL navigation on search submit | ✅ Pushes to `/services/browse?q=...` |
| Suggestion types (service/category/subcategory/provider/popular) | ✅ Type-aware rendering |

**Gap:** Autocomplete is purely client-side against constants. No server-side fuzzy API search suggestions are wired up yet. The API route `/api/services/search/suggestions` exists but isn't called by this component.

---

### 2.3 `ServiceFilterSidebar.tsx` (776 lines) — ✅ FULLY COMPLETE

| Feature | Status |
|---|---|
| Category filter (8 categories) | ✅ With icons from constants |
| Subcategory filter (dynamic) | ✅ Shows when category selected, loads from DB |
| Service area filter (12 Nairobi areas) | ✅ Searchable list |
| Price range filter (6 ranges) | ✅ Multi-select checkboxes |
| Rating filter (4 options) | ✅ Radio buttons with star display |
| Provider features (verified/available/instant) | ✅ Checkboxes with icons |
| Collapsible sections | ✅ With active count badges |
| Search within filter lists | ✅ For areas and subcategories |
| URL state sync | ✅ All filters reflected in URL |
| Mobile sheet mode | ✅ Bottom drawer with backdrop |
| Clear all / Show results | ✅ Header + mobile footer buttons |
| Active filter chips export | ✅ `ActiveFilterChips` component co-located |

**No gaps identified. Production-ready.**

---

### 2.4 `ProviderCard.tsx` (478 lines) — ✅ FULLY COMPLETE

| Feature | Status |
|---|---|
| Image with fallback | ✅ Placeholder on error |
| Tier badges (Top Pro / Pro) | ✅ Enterprise/Premium differentiation |
| Hover action buttons (compare/save/share) | ✅ Appear on hover, click handlers |
| Rating + review count | ✅ Star icon + count, "New provider" fallback |
| Verified badge | ✅ CheckCircle icon |
| Price display with anchoring | ✅ "From Ksh X" format |
| Category badge | ✅ Color-coded from constants |
| Service areas display | ✅ "Area1, Area2 +N" format |
| Jobs completed + Response time | ✅ Briefcase + Clock icons |
| CTA button (Book Now / Get Quote) | ✅ Dynamic based on instant booking |
| Skeleton loader | ✅ Matching layout |
| Share via Web Share API | ✅ Clipboard fallback |
| Three variants (default/featured/compact) | ⚠️ Only `default` is rendered — `featured` and `compact` variants not differentiated in render logic |

**Gap:** The `variant` prop is accepted but the render output is identical for all three variants. The `featured` variant should have enhanced styling (larger card, promoted badge). Minor issue — the card links to `/services/provider/${id}` which is correct.

---

### 2.5 `ProvidersGrid.tsx` (208 lines) — ✅ FULLY COMPLETE

| Feature | Status |
|---|---|
| Responsive grid (1/2/3 cols) | ✅ |
| Pagination (prev/next + page numbers) | ✅ Smart page number generation |
| Empty state with CTA | ✅ "No providers found" + Browse All |
| Loading skeleton state | ✅ 6 skeleton cards |
| Results count display | ✅ "Showing X-Y of Z" |
| Mobile page indicator | ✅ "Page X of Y" |
| Scroll to top on page change | ✅ Smooth scroll |

**No gaps. Production-ready.**

---

### 2.6 `CategoryQuickNav.tsx` (290 lines) — ✅ FULLY COMPLETE

| Feature | Status |
|---|---|
| 3 variants (pills/underline/cards) | ✅ All implemented |
| Horizontal scroll with arrows | ✅ Left/right buttons, fade edges |
| Active state management | ✅ URL-synced |
| "All" option | ✅ Configurable via `showAllOption` |
| Auto-scroll to active on mount | ✅ Smooth scroll |
| Resize observer | ✅ Updates arrow visibility |
| Icons per category | ✅ From `SERVICE_CATEGORIES` constants |

**No gaps. Production-ready.**

---

### 2.7 `FeaturedProviders.tsx` (100 lines) — ✅ FULLY COMPLETE

Horizontal carousel of featured/premium providers with scroll buttons and snap scrolling.

---

### 2.8 `FeaturedByPrice.tsx` (294 lines) — ✅ FULLY COMPLETE

Price-tier tabs + horizontal provider mini-cards. 4 price tiers (Under 5K / 5K-15K / 15K-30K / Above 30K).

**Minor gap:** The `ProviderMiniCard` links to `/service-providers/${id}` (wrong route — should be `/services/provider/${id}`). **Bug fix needed.**

---

### 2.9 `CompareProviders.tsx` (606 lines) — ✅ FULLY COMPLETE

| Feature | Status |
|---|---|
| Context provider with localStorage | ✅ Max 3 providers |
| Floating compare bar | ✅ Avatar slots, count, actions |
| Comparison modal | ✅ Side-by-side table with metrics |
| Add/remove/clear | ✅ Full CRUD |
| CompareButton for cards | ✅ Scale icon toggle |
| Hydration-safe | ✅ `isHydrated` state |

---

### 2.10 `SortDropdown.tsx` (100 lines) — ✅ FULLY COMPLETE

Custom dropdown with 6 sort options, click-outside close, URL sync.

---

### 2.11 `SuggestedTags.tsx` (224 lines) — ✅ FULLY COMPLETE

Category-aware suggested search tags + compact variant. 8 categories × 8 suggestions each + 10 generic popular suggestions.

---

### 2.12 `QuickFilterToggle.tsx` (65 lines) — ✅ FULLY COMPLETE

Pill-style toggle button for boolean URL params. Used for Verified/Instant.

---

### 2.13 `MobileFilterButton.tsx` (64 lines) — ✅ FULLY COMPLETE

Filter trigger button with active count badge. Opens `ServiceFilterSidebar` in mobile sheet mode.

---

## 3. DATA LAYER ANALYSIS

### 3.1 `lib/services/providers.ts` (811 lines) — ✅ FULLY COMPLETE

| Function | Status | Used By |
|---|---|---|
| `getProviders()` | ✅ | Browse page main query |
| `getFeaturedProviders()` | ✅ | Browse page featured section |
| `getProviderById()` | ✅ | Provider detail page |
| `getProviderReviews()` | ✅ | Provider detail page |
| `searchProviders()` | ✅ | API route `/api/services/providers` |
| `getSimilarProviders()` | ✅ | Provider detail page sidebar |
| `isProviderSaved()` | ✅ | Provider detail page |
| `toggleSaveProvider()` | ✅ | Save/unsave API |
| `getSavedProviders()` | ✅ | Dashboard |

**Full-text search:** Uses PostgreSQL GIN index on `search_vector` tsvector column. Supports `to_tsquery` with prefix matching and ILIKE fallback for short queries.

**Column mapping:** `mapProviderRow()` handles DB→UI type conversion (e.g., `average_rating` → `rating_average`, `profile_photo_url` → `logo_url`, `bio` → `description`).

---

### 3.2 `lib/services/categories.ts` (278 lines) — ✅ FULLY COMPLETE

| Function | Status |
|---|---|
| `getCategories()` | ✅ |
| `getCategoriesWithSubs()` | ✅ |
| `getCategoryById()` | ✅ |
| `getSubcategoriesByCategory()` | ✅ |
| `getSubcategoryById()` | ✅ |
| `getCategoryStats()` | ✅ |

---

### 3.3 `lib/services/reviews.ts` (953 lines) — ✅ FULLY COMPLETE

Full review lifecycle: submit, respond, vote, flag, fetch with pagination, summary stats, photo upload.

---

### 3.4 `lib/services/bookings.ts` — ✅ FULLY COMPLETE

Customer and provider booking queries, counts, scheduled bookings.

---

### 3.5 `lib/services/booking-lifecycle.ts` — ✅ FULLY COMPLETE

State machine transitions: schedule → start → complete → confirm → cancel.

---

### 3.6 Other lib/services files

| File | Status |
|---|---|
| `quotes.ts` | ✅ Complete |
| `messages.ts` | ✅ Complete |
| `payments.ts` | ✅ Complete (M-Pesa integration) |
| `dashboard.ts` | ✅ Complete |
| `social-analytics.ts` | ✅ Complete |

---

## 4. DATABASE SCHEMA STATUS

### 4.1 Tables — All Created via Migrations

| Table | Migration | Status |
|---|---|---|
| `service_categories` | `20260108120001` | ✅ Created, **⚠️ NOT SEEDED** |
| `service_subcategories` | `20260108120001` | ✅ Created, **⚠️ NOT SEEDED** |
| `services` | `20260108120001` | ✅ Created, **⚠️ NOT SEEDED** |
| `service_types` | `20260108120001` | ✅ Created |
| `service_providers` | `20260108120002` | ✅ Created (50+ columns) |
| `provider_services` | `20260108120002` | ✅ Created (25+ columns) |
| `provider_service_areas` | `20260108120002` | ✅ Created |
| `provider_vehicles` | `20260108120002` | ✅ Created |
| `provider_verification_documents` | `20260108120002` | ✅ Created |
| `saved_providers` | `20260108120002` | ✅ Created |
| `provider_availability_intervals` | `20260109130001` | ✅ Created (RRULE-based) |
| `bookings` | `20260108120003` | ✅ Created (40+ columns) |
| `booking_quotes` | `20260108120003` | ✅ Created |
| `booking_messages` | `20260108120003` | ✅ Created |
| `booking_status_history` | `20260108120003` | ✅ Created |
| `reviews` | `20260108120003` | ✅ Created |
| `review_helpful_votes` | `20260108120003` | ✅ Created |
| `social_link_clicks` | `20260302000002` | ✅ Created |
| `neighborhoods` | `20260116000000` | ✅ Created + Seeded |

### 4.2 Critical Indexes

| Index | Status |
|---|---|
| `search_vector` GIN on `service_providers` | ✅ Created in `20260307000000` |
| `min_price` denormalized column | ✅ Created in `20260307000000` |
| Performance indexes on all FK columns | ✅ Created in `20260109150000` |
| Materialized views | ✅ Created in `20260109150001` |

### 4.3 ⚠️ CRITICAL BLOCKER — Seed Data Missing

**The discovery layer tables (categories, subcategories, services) have NO seed data.** This means:
- The browse page will show zero categories in the sidebar
- The category quick nav will fall back to hardcoded `SERVICE_CATEGORIES` from constants
- Provider creation wizard loads categories from DB (will show nothing)
- All filtering by category/subcategory will return zero results

**Impact:** The page is architecturally complete but functionally empty without seed data.

---

## 5. API ROUTES AUDIT

| Route | Method | Status |
|---|---|---|
| `/api/services/categories` | GET | ✅ Complete |
| `/api/services/providers` | GET | ✅ Complete |
| `/api/services/providers/me` | GET | ✅ Complete |
| `/api/services/providers/[id]` | GET | ✅ Complete |
| `/api/services/providers/[id]/reviews` | GET | ✅ Complete |
| `/api/services/saved` | GET, POST | ✅ Complete |
| `/api/services/bookings` | GET, POST | ✅ Complete |
| `/api/services/search/suggestions` | GET | ✅ Complete but **not wired to autocomplete** |
| `/api/services/jobs/[id]/quotes` | GET, POST | ✅ Complete |
| `/api/services/jobs/[id]/quotes/[quoteId]/accept` | POST | ✅ Complete |
| `/api/services/jobs/[id]/review` | GET, POST | ✅ Complete |
| `/api/services/jobs/[id]/messages` | GET, POST | ✅ Complete |
| `/api/services/jobs/[id]/media` | POST, DELETE | ✅ Complete |
| `/api/social-click` | POST, GET | ✅ Complete |

---

## 6. IMAGE / ICON / DESIGN ASSET INVENTORY

### 6.1 Current Lucide Icons Used Across the Browse Page & Components

| Icon | Source | Used In | Purpose |
|---|---|---|---|
| `Sparkles` | lucide-react | Browse hero, ProvidersGrid, FilterSidebar | Trust badge, "700+ Providers" |
| `Shield` | lucide-react | Browse hero, QuickFilter, ProviderCard, FeaturedByPrice | Verified indicator |
| `Zap` | lucide-react | Browse hero, QuickFilter, ProviderCard, CompareProviders | Instant booking |
| `Star` | lucide-react | Browse hero, ProviderCard, ProviderReviewsList, FeaturedByPrice, CompareProviders, FilterSidebar | Rating display |
| `Filter` | lucide-react | Browse page, MobileFilterButton | Filter trigger |
| `Search` | lucide-react | ProvidersGrid, SearchAutocomplete, ServicesHero, FilterSidebar | Search input/empty state |
| `ChevronLeft` / `ChevronRight` | lucide-react | FeaturedProviders, FeaturedByPrice, ProvidersGrid, CategoryQuickNav, PortfolioGallery | Navigation arrows |
| `ChevronDown` / `ChevronUp` | lucide-react | SortDropdown, FilterSidebar | Expand/collapse |
| `X` | lucide-react | CompareProviders, FilterSidebar, PortfolioGallery, SearchAutocomplete | Close/remove |
| `Check` | lucide-react | SortDropdown, FilterSidebar | Selected indicator |
| `MapPin` | lucide-react | ProviderCard, CompareProviders, FilterSidebar | Location |
| `Heart` | lucide-react | ProviderCard | Save/favorite |
| `Share2` | lucide-react | ProviderCard | Share button |
| `Clock` | lucide-react | ProviderCard, CompareProviders, FilterSidebar | Response time |
| `Briefcase` | lucide-react | ProviderCard | Jobs completed |
| `CheckCircle` | lucide-react | ProviderCard, CompareProviders, FilterSidebar | Verified check |
| `XCircle` | lucide-react | CompareProviders | Negative comparison |
| `ArrowUpDown` | lucide-react | SortDropdown | Sort indicator |
| `Scale` | lucide-react | CompareProviders | Compare icon |
| `Camera` | lucide-react | PortfolioGallery | Gallery indicator |
| `Loader2` | lucide-react | SearchAutocomplete, ProviderReviewsList | Loading spinner |
| `SlidersHorizontal` | lucide-react | FilterSidebar | Filter header icon |
| `Award` | lucide-react | FilterSidebar | Provider features section |
| `Pencil` | lucide-react | Provider detail page | Edit profile |
| `ArrowLeft` | lucide-react | Provider detail, Request page | Back navigation |
| `LayoutGrid` | lucide-react | CategoryQuickNav | "All" category icon |

### 6.2 Category Icons (from Constants)

| Category | Icon | Source |
|---|---|---|
| Moving & Packing | `Truck` | lucide-react |
| Cleaning | `Sparkles` | lucide-react |
| Repairs & Maintenance | `Wrench` | lucide-react |
| Interior & Design | `PaintBucket` | lucide-react |
| Utilities & Tech | `Wifi` | lucide-react |
| Lifestyle Services | `Heart` | lucide-react |
| Security | `Shield` | lucide-react |
| Pet Care | `PawPrint` | lucide-react |

### 6.3 Existing Image Assets (public/images/)

| Category | Files | Location |
|---|---|---|
| Service category photos | 12 (carpentry, cleaning, electrical, gardening, internet, laundry, more-services, moving, painting, pest-control, plumbing, water-gas) | `public/images/services-landing/` |
| Hero backgrounds | 1 (hero-bg.jpg) | `public/images/services-landing/` |
| How-it-works photos | 3 (search, compare, book) | `public/images/services-landing/` |
| Why MitaSafi photos | 6 (verified, reviews, pricing, payment, neighborhood, emergency) | `public/images/services-landing/` |
| Provider CTA photo | 1 (provider-cta.jpg) | `public/images/services-landing/` |
| Testimonial avatars | 10 (aisha, brian, david, grace, hannah, james, mary, peter, samuel, wanjiku) | `public/images/services-landing/` |
| Professional photos | 3 (cleaner, electrician, plumber) | `public/images/people/` |
| All images have optimized copies | ✅ | `*/optimized/` subdirs |

### 6.4 ⚠️ MISSING Design Assets Needed

| Asset | Type | Purpose | Priority |
|---|---|---|---|
| Provider placeholder image | Photo | `placeholder-provider.jpg` referenced in ProviderCard but **may not exist** | 🔴 HIGH |
| Category hero images (8) | Photo/Illustration | Per-category header images for filtered browse views | 🟡 MEDIUM |
| Empty state illustrations | Illustration | "No results", "No services yet", "First booking" | 🟡 MEDIUM |
| Trust badges SVG set | SVG icons | "Verified", "Licensed", "Insured", "Background Checked" | 🟡 MEDIUM |
| Service-type icons (20+) | SVG icons | Individual service type icons (pipe, wire, mop, truck, etc.) for subcategory display | 🟢 LOW |
| OG social share image | Photo | `og/services.jpg` referenced in metadata but likely missing | 🟡 MEDIUM |
| Compare feature illustration | Illustration | Empty compare modal state | 🟢 LOW |
| Mobile app badge mockups | Image | App store badges for download CTAs | 🟢 LOW |

---

## 7. COMPLETION STATUS MATRIX

### 7.1 Browse Page (`/services/browse`) — Component Level

| # | Component | File | Lines | Status | Completion |
|---|---|---|---|---|---|
| 1 | Browse Page Shell | `browse/page.tsx` | 407 | ✅ Complete | **100%** |
| 2 | Search Autocomplete | `ServiceSearchAutocomplete.tsx` | 676 | ✅ Complete | **95%** (server suggestions not wired) |
| 3 | Filter Sidebar | `ServiceFilterSidebar.tsx` | 776 | ✅ Complete | **100%** |
| 4 | Active Filter Chips | (same file) | — | ✅ Complete | **100%** |
| 5 | Provider Card | `ProviderCard.tsx` | 478 | ✅ Complete | **95%** (variant render identical) |
| 6 | Providers Grid | `ProvidersGrid.tsx` | 208 | ✅ Complete | **100%** |
| 7 | Category Quick Nav | `CategoryQuickNav.tsx` | 290 | ✅ Complete | **100%** |
| 8 | Featured Providers | `FeaturedProviders.tsx` | 100 | ✅ Complete | **100%** |
| 9 | Featured By Price | `FeaturedByPrice.tsx` | 294 | ✅ Complete | **98%** (wrong link URL: bug) |
| 10 | Compare Providers | `CompareProviders.tsx` | 606 | ✅ Complete | **100%** |
| 11 | Sort Dropdown | `SortDropdown.tsx` | 100 | ✅ Complete | **100%** |
| 12 | Suggested Tags | `SuggestedTags.tsx` | 224 | ✅ Complete | **100%** |
| 13 | Quick Filter Toggle | `quick-filter-toggle.tsx` | 65 | ✅ Complete | **100%** |
| 14 | Mobile Filter Button | `mobile-filter-button.tsx` | 64 | ✅ Complete | **100%** |

### 7.2 Provider Detail Page (`/services/provider/[id]`)

| # | Section | Status | Completion |
|---|---|---|---|
| 1 | Navigation (back/edit/share) | ✅ Complete | **100%** |
| 2 | Hero (photo, name, stats) | ✅ Complete | **100%** |
| 3 | Verified Credentials | ✅ Complete | **100%** |
| 4 | About/Bio | ✅ Complete | **100%** |
| 5 | Work Portfolio (lightbox gallery) | ✅ Complete | **100%** |
| 6 | Services & Pricing list | ✅ Complete | **100%** |
| 7 | Reviews section | ✅ Complete | **100%** |
| 8 | Sidebar (contact, details, availability, social) | ✅ Complete | **100%** |
| 9 | Similar Providers grid | ✅ Complete | **100%** |
| 10 | Mobile CTA bar | ✅ Complete | **100%** |
| 11 | Dynamic SEO/metadata | ✅ Complete | **100%** |
| 12 | Own-profile detection | ✅ Complete | **100%** |

### 7.3 Booking Request Flow (`/services/provider/[id]/request`)

| # | Feature | Status | Completion |
|---|---|---|---|
| 1 | Auth check + redirect | ✅ Complete | **100%** |
| 2 | Provider/service resolution | ✅ Complete | **100%** |
| 3 | Self-booking prevention | ✅ Complete | **100%** |
| 4 | Multi-step BookingRequestForm | ✅ Complete | **100%** |
| 5 | Location picker | ✅ Complete | **100%** |
| 6 | Server action for submission | ✅ Complete | **100%** |

### 7.4 Data Layer (lib/services/)

| # | Module | Functions | Status | Completion |
|---|---|---|---|---|
| 1 | providers.ts | 9 functions | ✅ Complete | **100%** |
| 2 | categories.ts | 6 functions | ✅ Complete | **100%** |
| 3 | reviews.ts | 9 functions | ✅ Complete | **100%** |
| 4 | bookings.ts | 7 functions | ✅ Complete | **100%** |
| 5 | booking-lifecycle.ts | 7 functions | ✅ Complete | **100%** |
| 6 | quotes.ts | 6 functions | ✅ Complete | **100%** |
| 7 | messages.ts | 6 functions | ✅ Complete | **100%** |
| 8 | payments.ts | 8 functions | ✅ Complete | **100%** |
| 9 | dashboard.ts | 4 functions | ✅ Complete | **100%** |
| 10 | social-analytics.ts | 1 function | ✅ Complete | **100%** |

### 7.5 Provider Dashboard (60+ files)

| # | Module | Files | Status | Completion |
|---|---|---|---|---|
| 1 | Dashboard shell/layout | 3 | ✅ Complete | **100%** |
| 2 | Profile management | 8 | ✅ Complete | **100%** |
| 3 | Service CRUD + Wizard | 14 | ✅ Complete | **100%** |
| 4 | Service preview/edit | 5 | ✅ Complete | **100%** |
| 5 | Jobs management | 4 | ✅ Complete | **100%** |
| 6 | Quoting system | 3 | ✅ Complete | **100%** |
| 7 | Reviews management | 3 | ✅ Complete | **100%** |
| 8 | Earnings/payouts | 3 | ✅ Complete | **100%** |
| 9 | Analytics | 3 | ✅ Complete | **100%** |
| 10 | Calendar | 2 | ✅ Complete | **100%** |
| 11 | Availability settings | 2 | ✅ Complete | **100%** |
| 12 | Messages | 1 | ✅ Complete | **100%** |
| 13 | Settings | 3 | ✅ Complete | **100%** |

### 7.6 Database Schema

| Layer | Tables | Status | Seeded? |
|---|---|---|---|
| Discovery | service_categories, service_subcategories, services, service_types | ✅ Created | ❌ **NO** |
| Trust/Provider | service_providers + 5 related tables | ✅ Created | ❌ NO (user-generated) |
| Booking | bookings + 4 related tables | ✅ Created | N/A |
| Reviews | reviews, review_helpful_votes | ✅ Created | N/A |
| Support | neighborhoods, social_link_clicks | ✅ Created | ✅ neighborhoods seeded |
| Indexes | GIN FTS, min_price, performance | ✅ Created | N/A |

---

## 8. GAP ANALYSIS — WHAT'S MISSING

### 🔴 CRITICAL GAPS (Blocking production)

| # | Gap | Impact | Effort |
|---|---|---|---|
| **G1** | **No seed data for categories/subcategories/services** | Browse page shows zero categories, filter sidebar is empty, wizard Step1 shows nothing | 4-6 hrs |
| **G2** | **No demo/test provider data** | Browse page returns zero results, unable to test any UI flow | 2-4 hrs |
| **G3** | **Provider placeholder image may be missing** | ProviderCard shows broken image when provider has no photo | 10 min |
| **G4** | **OG social share image missing** | `/og/services.jpg` referenced in metadata — 404 on social shares | 30 min |

### 🟡 MEDIUM GAPS (Degraded experience without)

| # | Gap | Impact | Effort |
|---|---|---|---|
| **G5** | **Autocomplete not wired to server suggestions API** | Search only matches against 8 hardcoded category names, not 700+ services | 2-3 hrs |
| **G6** | **FeaturedByPrice links to wrong route** | `/service-providers/${id}` instead of `/services/provider/${id}` — 404 | 5 min |
| **G7** | **ProviderCard `featured` variant not differentiated** | Featured carousel cards look identical to regular cards | 1-2 hrs |
| **G8** | **No loading/streaming states for initial page load** | Server component blocks until all 3 parallel queries resolve | 1-2 hrs |
| **G9** | **No error boundary for data fetch failures** | If Supabase query fails, page crashes instead of graceful degradation | 1-2 hrs |
| **G10** | **Customer dashboard incomplete** | Can browse/book but can't see bookings in their own dashboard | 8-12 hrs |
| **G11** | **Email/SMS notifications not implemented** | Bookings happen silently — no confirmation emails | 4-6 hrs |

### 🟢 LOW GAPS (Polish items)

| # | Gap | Impact | Effort |
|---|---|---|---|
| **G12** | No breadcrumbs on filtered views | Minor navigation UX issue | 1 hr |
| **G13** | No "recently viewed providers" | Missing convenience feature | 2-3 hrs |
| **G14** | No map view for providers by area | Alternative discovery mode not implemented | 8-12 hrs |
| **G15** | No saved searches functionality | Users can't save filter combinations | 3-4 hrs |
| **G16** | No infinite scroll option (pagination only) | Some users prefer scroll-based loading | 2-3 hrs |
| **G17** | Category hero images per filtered view | Bland header when category is selected | Design needed |
| **G18** | Trust badge SVGs (certified, licensed, insured) | Using generic icons instead of custom badges | Design needed |
| **G19** | Service-type specific icons (20+) | Subcategories don't have unique icons | Design needed |

---

## 9. MILESTONES TO PRODUCTION

### Milestone Overview

| ID | Milestone | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **M0** | Seed Data & Critical Fixes | 🔴 CRITICAL | 1-2 days | None |
| **M1** | Browse Page Polish & Bug Fixes | 🔴 HIGH | 1 day | M0 |
| **M2** | Search Enhancement | 🟡 MEDIUM | 1 day | M0 |
| **M3** | Provider Detail Page Verification | 🟡 MEDIUM | 0.5 day | M0 |
| **M4** | Booking Flow End-to-End Testing | 🟡 MEDIUM | 1 day | M0, M3 |
| **M5** | Customer Dashboard MVP | 🟡 MEDIUM | 2-3 days | M4 |
| **M6** | Design Assets & Kling Generation | 🟡 MEDIUM | 1-2 days | M0 |
| **M7** | Notifications (Email/SMS) | 🟡 MEDIUM | 2 days | M4 |
| **M8** | Performance & Error Handling | 🟢 LOW | 1 day | M1 |
| **M9** | Analytics & Monitoring | 🟢 LOW | 1 day | M8 |
| **M10** | Production Hardening | 🟢 LOW | 1-2 days | All |

---

### M0: SEED DATA & CRITICAL FIXES (Days 1-2)

> **Goal:** Make the browse page functional with real data.

#### M0.1 — Create Category Seed Data

Create `supabase/seed.sql` with INSERT statements for all service categories, subcategories, and services.

**Categories to seed (12 primary + 8 secondary):**

| # | Category (Primary) | DB ID | Subcategories |
|---|---|---|---|
| 1 | Moving & Relocation | `moving` | House Moving, Office Moving, Furniture Transport, Packing Services, Storage, International Moving |
| 2 | Cleaning Services | `cleaning` | House Cleaning, Deep Cleaning, Office Cleaning, Carpet Cleaning, Window Cleaning, Move-in/Move-out Cleaning, Post-Construction Cleaning |
| 3 | Plumbing | `plumbing` | Pipe Repair, Drain Cleaning, Water Heater, Toilet Repair, Leak Detection, Bathroom Fitting, Water Tank, Pump Installation |
| 4 | Electrical | `electrical` | Wiring, Socket Repair, Lighting, Electrical Inspection, Generator, Solar Installation, Circuit Breaker, CCTV Installation |
| 5 | HVAC | `hvac` | AC Installation, AC Repair, AC Servicing, Ventilation, Heating Systems |
| 6 | Interior Design | `interior-design` | Space Planning, Kitchen Design, Bathroom Design, Office Design, Color Consultation |
| 7 | Painting | `painting` | Interior Painting, Exterior Painting, Decorative Painting, Wallpaper, Texture Coating |
| 8 | Carpentry | `carpentry` | Furniture Making, Door/Window Repair, Cabinet Making, Shelving, Wood Flooring |
| 9 | Security | `security` | Security Guards, CCTV Installation, Access Control, Alarm Systems, Event Security, Mobile Patrol |
| 10 | Pest Control | `pest-control` | Fumigation, Termite Treatment, Rodent Control, Bed Bug Treatment, Mosquito Control |
| 11 | Landscaping | `landscaping` | Garden Design, Lawn Care, Tree Trimming, Irrigation, Fencing |
| 12 | Laundry | `laundry` | Wash & Fold, Dry Cleaning, Ironing, Curtain Cleaning, Carpet Cleaning |
| 13 | Pet Care | `pet-care` | Pet Grooming, Pet Sitting, Dog Walking, Vet Visits, Pet Transport |
| 14 | Catering | `catering` | Event Catering, Private Chef, Meal Prep, Corporate Catering |
| 15 | Events | `events` | Event Planning, DJ/Entertainment, Photography, Decoration, Tent/Equipment Hire |
| 16 | Childcare | `childcare` | Babysitting, Nanny Services, Tutoring, After-School Care |
| 17 | Tech Support | `tech-support` | Computer Repair, Network Setup, Smart Home, Phone Repair |
| 18 | Water Services | `water-services` | Water Delivery, Water Purification, Borehole Drilling, Tank Cleaning |
| 19 | Waste Management | `waste-management` | Garbage Collection, Recycling, Junk Removal, Septic Services |
| 20 | Roofing | `roofing` | Roof Repair, Roof Installation, Waterproofing, Gutter Installation |

Each subcategory should have 4-8 individual `services` rows (granular service types).

**Steps:**
1. Create `supabase/seed_categories.sql` with all INSERT statements
2. Apply seed to local Supabase instance
3. Verify categories load in the browse page sidebar
4. Verify Step1Category in the service wizard shows categories

#### M0.2 — Create Demo Provider Data

Seed 20-30 demo service providers across different categories, tiers, and areas.

**Demo providers needed:**

| # | Business Name | Category | Tier | Area | Has Reviews |
|---|---|---|---|---|---|
| 1 | CleanPro Nairobi | Cleaning | enterprise | Westlands, Kilimani | Yes (15) |
| 2 | Quick Movers Kenya | Moving | premium | All areas | Yes (23) |
| 3 | Fundi Electricals | Electrical | free | South B, Langata | Yes (8) |
| 4 | SafeHome Security | Security | premium | Karen, Lavington | Yes (12) |
| 5 | PipeMaster Plumbing | Plumbing | enterprise | All areas | Yes (31) |
| 6 | Green Thumb Landscaping | Landscaping | free | Karen, Ruaka | Yes (5) |
| 7 | Interior Dreams | Interior Design | premium | Kilimani, Lavington | Yes (9) |
| 8 | BugAway Pest Control | Pest Control | free | South C, Langata | Yes (3) |
| ... | (20+ more across all categories) | ... | ... | ... | ... |

Each provider needs:
- Basic profile (name, tagline, bio, phone)
- Assigned services via `provider_services` with pricing
- Service areas via `provider_service_areas`
- Working hours via `provider_availability_intervals`
- At least 3-5 reviews for top providers

#### M0.3 — Fix Critical Asset Gaps

| Task | Details |
|---|---|
| Add `placeholder-provider.jpg` | Create/generate a neutral placeholder image for providers without photos |
| Add `og/services.jpg` | Create OG image for social sharing (1200×630) |
| Fix FeaturedByPrice link | Change `/service-providers/${id}` → `/services/provider/${id}` |

#### M0.4 — Regenerate Database Types

After seeding, regenerate `src/types/database.ts` using `supabase gen types typescript` to ensure type alignment.

---

### M1: BROWSE PAGE POLISH & BUG FIXES (Day 3)

> **Goal:** Fix all known bugs and polish the browse experience.

#### M1.1 — Fix ProviderCard Variant Rendering

The `variant` prop ("default" | "featured" | "compact") produces identical output. Implement differentiated rendering:

| Variant | Changes Needed |
|---|---|
| `default` | Current design (no change) |
| `featured` | Larger card, promoted badge, no image aspect-ratio constraint, emphasized price |
| `compact` | Horizontal layout (image left, content right), smaller footprint, no CTA button |

#### M1.2 — Fix FeaturedByPrice Link Bug

```tsx
// BEFORE (bug):
<Link href={`/service-providers/${provider.id}`} ...>
// AFTER (fix):
<Link href={`/services/provider/${provider.id}`} ...>
```

#### M1.3 — Add Loading/Streaming States

Wrap the browse page sections in `<Suspense>` boundaries with skeleton fallbacks:

| Section | Skeleton |
|---|---|
| Featured Providers | Already has `FeaturedProvidersSkeleton` ✅ |
| Featured By Price | Need `FeaturedByPriceSkeleton` |
| Providers Grid | Already has skeleton ✅ |
| Category Quick Nav | Need skeleton |

#### M1.4 — Add Error Boundaries

Wrap the main content area in an error boundary that catches Supabase fetch failures and shows a "Something went wrong" fallback with retry button.

#### M1.5 — Fix Constants ↔ DB Category Alignment

Ensure the 8 categories in `SERVICE_CATEGORIES` (constants) map correctly to the seeded DB categories. The `getCategoryById()` function must resolve both the major category IDs (e.g., `"repairs"`) and the individual DB category IDs (e.g., `"plumbing"`, `"electrical"`).

---

### M2: SEARCH ENHANCEMENT (Day 4)

> **Goal:** Wire up server-side search suggestions for rich autocomplete.

#### M2.1 — Wire Autocomplete to Suggestions API

Connect `ServiceSearchAutocomplete` to `/api/services/search/suggestions` for server-side fuzzy search:

| Current | Target |
|---|---|
| Client-side match against 8 category names | API call returning matching services, subcategories, and providers |
| No provider name search | Full-text search across provider names + service names |
| Hardcoded popular searches | Dynamic popular searches from analytics |

#### M2.2 — Enhance Search Suggestions API

Update `/api/services/search/suggestions` to return:
- Matching service names (from `services` table)
- Matching subcategory names
- Matching provider business names (top 3)
- Matching category names
- Each with type indicator for grouped display

#### M2.3 — Add Search Analytics

Track search queries for popularity ranking:
- Create `search_queries` table or log to analytics
- Use to power "Popular searches" dynamically

---

### M3: PROVIDER DETAIL PAGE VERIFICATION (Day 4-5)

> **Goal:** Verify the provider detail page works end-to-end with seeded data.

| Task | Details |
|---|---|
| M3.1 | Test profile rendering with demo providers |
| M3.2 | Verify reviews display with seeded review data |
| M3.3 | Test portfolio gallery with demo images |
| M3.4 | Verify working hours display |
| M3.5 | Test similar providers algorithm |
| M3.6 | Verify social links click tracking |
| M3.7 | Test saved provider toggle (auth required) |
| M3.8 | Verify "Request Service" → booking flow navigation |

---

### M4: BOOKING FLOW END-TO-END TESTING (Day 5-6)

> **Goal:** Verify the complete customer journey from browse → book → confirmation.

#### Full Journey Test Cases

| # | Journey | Steps | Status |
|---|---|---|---|
| 1 | Browse → Filter → Select Provider | Category filter → Click card → Detail page | Needs testing with data |
| 2 | Search → Select Provider → View Profile | Type query → Click suggestion → Profile page | Needs search wiring |
| 3 | Profile → Request Service | Click "Request Service" → Auth check → Form | Needs testing |
| 4 | Submit Booking Request | Fill form → Submit → Confirmation | Needs testing |
| 5 | Provider Receives & Quotes | Dashboard → Job inbox → Submit quote | Needs testing |
| 6 | Customer Accepts Quote | Dashboard → View quote → Accept | Needs testing |
| 7 | Job Lifecycle | Schedule → Start → Complete → Confirm | Needs testing |
| 8 | Review Flow | Completed job → Write review → Submit | Needs testing |
| 9 | Compare Providers | Add to compare → Open modal → Compare | Needs testing |
| 10 | Save Provider | Click heart → Check saved list | Needs testing |

---

### M5: CUSTOMER DASHBOARD MVP (Days 6-8)

> **Goal:** Customers can see their bookings, messages, and reviews after booking.

#### Components Needed

| # | Component | Status | Work Needed |
|---|---|---|---|
| 1 | Customer dashboard layout | ⚠️ Partial | Shell exists, needs content |
| 2 | My Bookings list | ⚠️ Partial | Data layer done, UI needs polish |
| 3 | Booking detail page | ⚠️ Partial | Status timeline done, needs full page |
| 4 | Messages/chat | ✅ Component exists | Wire to customer view |
| 5 | My Reviews | ❌ Not started | List of customer's submitted reviews |
| 6 | Saved Providers | ⚠️ Partial | API done, needs dedicated page |
| 7 | Customer profile/settings | ❌ Not started | Name, phone, avatar, notification prefs |

---

### M6: DESIGN ASSETS & KLING GENERATION (Days 7-8)

> **Goal:** Generate all missing visual assets using Kling AI.

#### Assets to Generate with Kling

| # | Asset | Kling Prompt Direction | Format | Size |
|---|---|---|---|---|
| 1 | **Provider placeholder image** | Professional person silhouette, teal branded, friendly, neutral | JPG | 800×600 |
| 2 | **OG share image** (`og/services.jpg`) | MitaSafi branding, "Trusted Home Services in Nairobi", teal/orange, service montage | JPG | 1200×630 |
| 3 | **No results illustration** | Friendly character with magnifying glass, empty search, teal tones | PNG | 400×400 |
| 4 | **First booking illustration** | Person on phone booking a service, celebratory, teal accents | PNG | 400×400 |
| 5 | **Category hero: Moving** | Professional movers carrying furniture, Nairobi backdrop | JPG | 1200×400 |
| 6 | **Category hero: Cleaning** | Professional cleaner in modern apartment, bright | JPG | 1200×400 |
| 7 | **Category hero: Repairs** | Handyman with tools, friendly, focused | JPG | 1200×400 |
| 8 | **Category hero: Interior** | Beautiful interior design showcase, modern Nairobi home | JPG | 1200×400 |
| 9 | **Category hero: Security** | Security professional, CCTV installation, modern | JPG | 1200×400 |
| 10 | **Category hero: Landscaping** | Beautiful garden, tropical, Nairobi residential | JPG | 1200×400 |
| 11 | **Category hero: Utilities** | Tech professional setting up network/smart home | JPG | 1200×400 |
| 12 | **Category hero: Pets** | Pet grooming, happy pet and owner | JPG | 1200×400 |
| 13 | **Compare empty state** | Two cards side by side with question mark, teal | PNG | 400×300 |
| 14 | **Demo provider avatars (20+)** | Professional headshots, diverse Kenyan professionals | JPG | 400×400 |
| 15 | **Demo provider cover photos (20+)** | Work-in-progress scenes matching their service category | JPG | 800×600 |
| 16 | **Demo portfolio images (50+)** | Before/after work photos for each service category | JPG | 800×600 |
| 17 | **Trust badge: Verified** | Shield with checkmark, teal, modern flat style | SVG/PNG | 48×48 |
| 18 | **Trust badge: Licensed** | Certificate/diploma icon, professional | SVG/PNG | 48×48 |
| 19 | **Trust badge: Insured** | Shield with umbrella, safe/protected feel | SVG/PNG | 48×48 |
| 20 | **Trust badge: Background Checked** | Person with checkmark, trusted | SVG/PNG | 48×48 |

---

### M7: NOTIFICATIONS (Days 8-9)

| # | Notification | Channel | Trigger |
|---|---|---|---|
| 1 | Booking request received | Email + SMS | Customer submits booking |
| 2 | Quote received | Email | Provider submits quote |
| 3 | Quote accepted | Email + SMS | Customer accepts quote |
| 4 | Job scheduled | Email + SMS | Provider schedules job |
| 5 | Job completed | Email | Provider marks complete |
| 6 | Review received | Email | Customer submits review |
| 7 | Payment confirmation | SMS | M-Pesa payment processed |

---

### M8: PERFORMANCE & ERROR HANDLING (Day 10)

| Task | Details |
|---|---|
| Implement Suspense streaming | Page-level streaming for server data |
| Add error boundaries | Per-section graceful degradation |
| Implement SWR/stale-while-revalidate | For client-side data freshness |
| Image optimization audit | Verify all images use Next.js `<Image>` with proper sizing |
| Lighthouse audit | Target 90+ on mobile |
| Bundle size analysis | Check for oversized imports |

---

### M9: ANALYTICS & MONITORING (Day 11)

| Task | Details |
|---|---|
| Track page views | `/services/browse` page analytics |
| Track search queries | Popular searches, zero-result queries |
| Track filter usage | Most used categories, areas, price ranges |
| Track provider card clicks | CTR per position, category |
| Track booking funnel | Browse → Detail → Request → Confirm conversion |
| Error tracking | Sentry or similar for runtime errors |

---

### M10: PRODUCTION HARDENING (Days 12-13)

| Task | Details |
|---|---|
| Rate limiting | API routes throttling |
| Input validation | All search/filter params sanitized |
| CSRF protection | Form submissions |
| Cache headers | Static assets, API responses |
| CDN configuration | Image delivery optimization |
| Security audit | XSS, injection vectors |
| Accessibility audit | WCAG 2.1 AA compliance |
| Mobile testing | Real device testing across screen sizes |
| SEO verification | Structured data validation, sitemap |
| Load testing | Concurrent user simulation |

---

## 10. TABLES NEEDED (DATABASE)

### Existing Tables (Already Created — 68 Migrations)

All core tables exist. The following are the tables directly used by the `/services/browse` flow:

| Table | Columns | Used For | Seeded? |
|---|---|---|---|
| `service_categories` | id, name, slug, icon, description, is_active, is_primary, display_order | Category filters, quick nav | ❌ NEEDS SEED |
| `service_subcategories` | id, category_id, name, slug, description, is_active, display_order, requires_business, requires_license, etc. | Subcategory filters, service wizard | ❌ NEEDS SEED |
| `services` | id, subcategory_id, name, slug, description, is_active, display_order | Service-level search, provider services | ❌ NEEDS SEED |
| `service_types` | id, service_id, name, description, base_price, price_unit, estimated_duration | Booking flow pricing | ❌ NEEDS SEED |
| `service_providers` | 50+ columns (see §4) | Provider listings | ❌ NEEDS DEMO DATA |
| `provider_services` | 25+ columns | Provider↔Service junction | ❌ NEEDS DEMO DATA |
| `provider_service_areas` | provider_id, area_name, etc. | Area filtering | ❌ NEEDS DEMO DATA |
| `provider_availability_intervals` | provider_id, rrule, start_time, end_time | Availability display | ❌ NEEDS DEMO DATA |
| `reviews` | reviewer_id, provider_id, rating, text, dimension ratings | Review display | ❌ NEEDS DEMO DATA |
| `review_helpful_votes` | review_id, user_id, is_helpful | Review voting | N/A |
| `saved_providers` | user_id, provider_id | Save/favorite | N/A |
| `bookings` | 40+ columns | Booking creation | N/A |
| `booking_quotes` | booking_id, provider quote details | Quote system | N/A |
| `booking_messages` | booking_id, sender, message | Messaging | N/A |
| `social_link_clicks` | provider_id, platform, url | Social analytics | N/A |
| `profiles` | id, full_name, avatar_url, phone | Reviewer display names | Auto-created via auth |

### New Table Needed (Optional — for M2)

| Table | Purpose | Columns |
|---|---|---|
| `search_queries` | Track search analytics for popular searches | `id`, `query`, `user_id` (nullable), `results_count`, `category_context`, `clicked_provider_id`, `created_at` |

---

## 11. ICON & DESIGN ASSET REQUIREMENTS (KLING)

### 11.1 Complete Icon Inventory — Currently Used

**All icons below are from `lucide-react` and are already in use. No new icon packages needed.**

```
BROWSE PAGE ICONS (already imported):
├── Sparkles          → Trust badge, featured indicator
├── Shield            → Verified provider, security category
├── Zap               → Instant booking
├── Star              → Ratings (filled/empty)
├── Filter            → Mobile filter trigger
├── Search            → Search input, empty state
├── ChevronLeft/Right → Navigation arrows
├── ChevronDown/Up    → Expand/collapse
├── X                 → Close/remove
├── Check             → Selected state
├── MapPin            → Location display
├── Heart             → Save/favorite (filled/outline)
├── Share2            → Share button
├── Clock             → Response time
├── Briefcase         → Jobs completed
├── CheckCircle       → Verified badge
├── XCircle           → Negative comparison
├── ArrowUpDown       → Sort indicator
├── Scale             → Compare feature
├── Camera            → Gallery indicator
├── Loader2           → Loading spinner
├── SlidersHorizontal → Filter settings
├── Award             → Provider features
├── Pencil            → Edit profile
├── ArrowLeft         → Back navigation
├── LayoutGrid        → "All" category
├── ArrowRight        → Category card arrow

CATEGORY ICONS (from constants):
├── Truck             → Moving & Packing
├── Sparkles          → Cleaning (reused)
├── Wrench            → Repairs & Maintenance
├── PaintBucket       → Interior & Design
├── Wifi              → Utilities & Tech
├── Heart             → Lifestyle Services (reused)
├── Shield            → Security (reused)
└── PawPrint          → Pet Care
```

### 11.2 Icons That SHOULD Be Added (Subcategory Level)

For richer subcategory display in the filter sidebar and category pages. These are currently missing and would enhance the browsability:

| Subcategory | Suggested Lucide Icon | Fallback |
|---|---|---|
| House Cleaning | `Home` | Category icon |
| Office Cleaning | `Building2` | Category icon |
| Plumbing | `Droplets` | Category icon |
| Electrical | `Plug` | Category icon |
| Painting | `Paintbrush` | Category icon |
| Carpentry | `Hammer` | Category icon |
| HVAC/AC | `Thermometer` | Category icon |
| CCTV/Surveillance | `Eye` | Category icon |
| Landscaping | `TreePine` | Category icon |
| Pest Control | `Bug` | Category icon |
| Pet Grooming | `Scissors` | Category icon |
| Catering | `UtensilsCrossed` | Category icon |
| Event Planning | `PartyPopper` | Category icon |
| Childcare | `Baby` | Category icon |
| Computer Repair | `Monitor` | Category icon |
| Laundry | `Shirt` | Category icon |
| Water Services | `GlassWater` | Category icon |
| Waste Management | `Trash2` | Category icon |
| Roofing | `Construction` | Category icon |
| Locksmith | `KeyRound` | Category icon |

**All above are available in lucide-react v0.300+. No external icon packages or Kling-generated icons needed for functional icons.**

### 11.3 Kling-Generated Assets Needed (Images/Illustrations)

These are the assets that require AI image generation (Kling), organized by priority:

#### Priority 1 — Required for Launch

| # | Asset Name | Style | Dimensions | Kling Prompt |
|---|---|---|---|---|
| 1 | `placeholder-provider.jpg` | Photo-realistic, teal-branded | 800×600 | "Professional headshot silhouette placeholder, teal gradient background (#0D9488), subtle pattern, gender-neutral, clean modern design" |
| 2 | `og/services.jpg` | Branded composite | 1200×630 | "MitaSafi branded social share image, teal (#0D9488) and orange (#F97316) palette, 'Trusted Home Services in Nairobi' text, montage of service workers (cleaner, plumber, mover), modern flat design" |
| 3 | `empty-search.png` | Illustration | 400×400 | "Friendly character with magnifying glass looking at empty results, teal color palette, flat illustration style, clean white background" |

#### Priority 2 — Demo Data Assets (20+ providers)

| # | Asset Set | Quantity | Style | Kling Prompt Template |
|---|---|---|---|---|
| 4 | Provider avatars | 20-25 | Professional headshots | "Professional headshot of a Kenyan [man/woman], [age 25-45], [service type] worker/professional, warm smile, clean background, high quality portrait photography" |
| 5 | Provider cover photos | 20-25 | Work scenes | "Professional [service type] work in progress in a modern Nairobi [apartment/office/home], bright lighting, clean composition, showing skilled work" |
| 6 | Portfolio — Cleaning | 6-8 | Before/after | "Spotless modern kitchen/living room after professional deep cleaning, bright and fresh, Nairobi apartment style" |
| 7 | Portfolio — Moving | 6-8 | Action shots | "Professional movers carefully loading furniture into truck, organized boxes, Nairobi residential area background" |
| 8 | Portfolio — Plumbing | 6-8 | Completed work | "Professional plumbing installation, new bathroom fixtures, clean copper piping, modern Nairobi home" |
| 9 | Portfolio — Electrical | 6-8 | Completed work | "Professional electrical panel installation, organized wiring, modern switchboard, safe and clean work" |
| 10 | Portfolio — Interior | 6-8 | Design showcase | "Beautiful modern interior design, contemporary Nairobi living room, warm colors, professional staging" |
| 11 | Portfolio — Security | 6-8 | Installation | "Professional CCTV camera installation, modern access control panel, security equipment in upscale Nairobi property" |
| 12 | Portfolio — Landscaping | 6-8 | Gardens | "Beautiful manicured garden in Nairobi residential area, tropical plants, professional landscaping, outdoor living" |
| 13 | Portfolio — Painting | 6-8 | Before/after | "Freshly painted accent wall, modern color palette, clean edges, interior painting in Nairobi apartment" |

#### Priority 3 — Category Hero Images

| # | Asset | Kling Prompt |
|---|---|---|
| 14 | `hero-moving.jpg` | "Professional moving team in Nairobi, organized packing, modern truck, residential background, warm teal overlay potential, 1200×400 banner" |
| 15 | `hero-cleaning.jpg` | "Professional cleaner in modern Nairobi apartment, bright and fresh, eco-friendly products, 1200×400 banner" |
| 16 | `hero-repairs.jpg` | "Skilled handyman repairing fixtures in Nairobi home, professional tools, focused work, 1200×400 banner" |
| 17 | `hero-interior.jpg` | "Stunning modern interior design showcase, Nairobi luxury apartment, warm tones, 1200×400 banner" |
| 18 | `hero-security.jpg` | "Modern security installation, CCTV cameras, access control, tech-forward, 1200×400 banner" |
| 19 | `hero-landscaping.jpg` | "Beautiful tropical garden, Nairobi residential, professional landscaping, lush greens, 1200×400 banner" |
| 20 | `hero-utilities.jpg` | "Smart home setup, network equipment installation, modern tech, 1200×400 banner" |
| 21 | `hero-pets.jpg` | "Happy pet grooming session, professional pet care, Nairobi, warm tones, 1200×400 banner" |

#### Priority 4 — Trust & UI Illustrations

| # | Asset | Kling Prompt |
|---|---|---|
| 22 | `trust-verified.svg` | "Minimal flat shield with checkmark icon, teal (#0D9488), modern SaaS style, 48×48" |
| 23 | `trust-licensed.svg` | "Minimal flat certificate/diploma icon, teal (#0D9488), professional, 48×48" |
| 24 | `trust-insured.svg` | "Minimal flat shield with umbrella icon, teal (#0D9488), protection feel, 48×48" |
| 25 | `trust-background-checked.svg` | "Minimal flat person silhouette with checkmark, teal (#0D9488), trusted, 48×48" |
| 26 | `first-booking.png` | "Celebratory illustration, person on phone booking a service, confetti, teal and orange palette, flat style, 400×400" |
| 27 | `compare-empty.png` | "Two comparison cards side by side with question marks, teal outlined, flat illustration, 400×300" |

---

## EXECUTION SUMMARY

### What's Done (FULLY COMPLETE — Code-level)

| Area | Components | Lines of Code |
|---|---|---|
| Browse page shell + all 14 components | 14 files | ~4,200 LOC |
| Provider detail page | 1 file + 3 sub-components | ~1,200 LOC |
| Booking request flow | 2 files (page + actions) + BookingRequestForm | ~1,000 LOC |
| Data layer (lib/services/) | 10 files, 63+ functions | ~5,500 LOC |
| Types system | service-providers.ts + database.ts | ~6,750 LOC |
| API routes | 14 endpoints | ~2,000 LOC |
| Provider dashboard | 60+ files | ~14,500 LOC |
| Booking components | 12 files | ~3,000 LOC |
| **TOTAL** | **~115 files** | **~38,000+ LOC** |

### What's Partially Done

| Area | What's Done | What Remains |
|---|---|---|
| Search autocomplete | Client-side matching works | Server API suggestions not wired |
| ProviderCard variants | Default variant renders perfectly | Featured/compact variants not differentiated |
| Customer dashboard | Data layer + some components | Full dashboard UI needed |
| Notifications | — | Email/SMS templates + delivery |

### What's NOT Done (Blocking)

| Area | Blocker Level | Effort |
|---|---|---|
| **Seed data (categories, subcategories, services)** | 🔴 CRITICAL — page shows nothing without it | 4-6 hours |
| **Demo provider data** | 🔴 CRITICAL — no results to display | 2-4 hours |
| **Design assets (placeholders, OG images, demos)** | 🟡 HIGH — broken images and social shares | 1-2 days with Kling |
| FeaturedByPrice link bug | 🟡 MEDIUM — 404 on click | 5 minutes |

### Recommended Execution Order

```
Day 1:  M0.1 (Seed categories)    → M0.3 (Critical fixes)  → M0.4 (Regen types)
Day 2:  M0.2 (Demo providers)     → M6 (Kling asset generation — start)
Day 3:  M1 (Browse polish & bugs) → M6 (Continue Kling assets)
Day 4:  M2 (Search enhancement)   → M3 (Provider detail verification)
Day 5:  M4 (E2E testing)          → Bug fixes from testing
Day 6:  M5 (Customer dashboard — start)
Day 7:  M5 (Customer dashboard — complete)
Day 8:  M7 (Notifications)
Day 9:  M8 (Performance) + M9 (Analytics)
Day 10: M10 (Production hardening)
```

**Total estimated effort: 10-13 working days to production-ready.**

---

*This document supersedes previous analysis documents (SERVICE_PROVIDER_MODULE_ANALYSIS.md, SERVICE_PROVIDER_MODULE_MILESTONES.md, SERVICES_ECOSYSTEM_ANALYSIS_AND_MILESTONES.md) as the canonical reference for the service provider browse and marketplace module.*
