# MitaSafi Services Landing Page — Complete Specification

**Document Version:** 1.0  
**Date:** March 3, 2026  
**Status:** Pre-Implementation Blueprint  
**Route:** `/services` (replaces current marketplace page, which moves to `/services/browse`)  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Context & Goals](#2-strategic-context--goals)
3. [Page Architecture — Section-by-Section Blueprint](#3-page-architecture--section-by-section-blueprint)
4. [Complete Link Registry](#4-complete-link-registry)
5. [SEO Specification](#5-seo-specification)
6. [Image Specification](#6-image-specification)
7. [Design System Compliance](#7-design-system-compliance)
8. [Search & Filter Architecture](#8-search--filter-architecture)
9. [Service Categories — Canonical Reference](#9-service-categories--canonical-reference)
10. [Component Specification](#10-component-specification)
11. [Accessibility Requirements](#11-accessibility-requirements)
12. [Performance Requirements](#12-performance-requirements)
13. [Responsive Behavior](#13-responsive-behavior)
14. [Content Specification](#14-content-specification)
15. [Implementation Milestones](#15-implementation-milestones)
16. [File Structure](#16-file-structure)
17. [Competitor Analysis & Design Inspiration](#17-competitor-analysis--design-inspiration)
18. [Risk Registry](#18-risk-registry)

---

## 1. Executive Summary

### What We're Building

A world-class, SEO-optimized services landing page for MitaSafi — Kenya's home services marketplace. This page is the **primary entry point for customers** seeking home services (plumbing, cleaning, electrical, moving, etc.) and the **primary recruitment funnel for service providers** wanting to join the platform.

### Design Philosophy

| Principle | Implementation |
|-----------|---------------|
| **Clean, not clever** | No decorative icons in text. No emoji. No gradient-soup. Uber/Airbnb level restraint. |
| **Photography-first** | High-quality images of African professionals performing real services. No stock-photo "thumbs up" shots. |
| **Information density without clutter** | Every section earns its place. No filler. Clear visual hierarchy. |
| **Trust-first** | Verification badges, provider counts, review scores, and real data — front and center. |
| **Mobile-first** | Designed for the Nairobi commuter on a phone. Fast, touch-friendly, data-light. |

### What This Page Is NOT

- Not a marketplace browser (that's `/services/browse`)
- Not a provider recruitment page (that's `/service-providers`)
- Not a category listing page (those are `/services/browse?category=X`)
- **It IS** the hook — the first impression that converts a Google searcher into a user.

---

## 2. Strategic Context & Goals

### Business Context

MitaSafi operates two verticals:
1. **Rental Management** — Connecting tenants with verified homes and honest landlords
2. **Home Services** — Connecting homeowners/tenants with verified service providers

The homepage (`/`) currently serves as a blended landing. This specification creates a **dedicated services landing page** that can be optimized independently for service-related search queries.

### Conversion Goals

| Goal | Target User | Primary CTA | Destination |
|------|------------|-------------|-------------|
| **Customer acquisition** | Homeowner/tenant needing a service | "Find a Provider" | `/services/browse` or `/services/browse?category=X` |
| **Provider recruitment** | Fundi/professional wanting work | "Join as Provider" | `/signup?role=provider` |
| **Search engagement** | User with specific need | Search bar submission | `/services/browse?q=...` |
| **Category exploration** | Browsing user | Category card click | `/services/browse?category=X` |

### SEO Target Keywords

**Primary (high-intent):**
- "home services Nairobi"
- "plumber Nairobi"
- "electrician near me Kenya"
- "house cleaning services Nairobi"
- "moving company Kenya"
- "fundi services Nairobi"

**Secondary (informational):**
- "find reliable plumber Nairobi"
- "best cleaning service Kenya"
- "emergency plumber Nairobi"
- "verified contractors Kenya"
- "home maintenance Nairobi"

**Long-tail (specific):**
- "affordable plumbing services Kilimani"
- "same-day cleaning service Westlands"
- "emergency electrician South B Nairobi"

---

## 3. Page Architecture — Section-by-Section Blueprint

The page consists of **14 sections**, each with a clear purpose in the conversion funnel.

### Section Order (Top → Bottom)

| # | Section | Component Name | Purpose | Height Est. |
|---|---------|---------------|---------|-------------|
| 0 | Navigation | `ServicesNavbar` | Global nav + services-specific links | 64–80px |
| 1 | Hero + Search | `ServicesHero` | Hook + primary search entry | 600–700px |
| 2 | Trust Bar | `ServicesTrustBar` | Social proof strip (numbers) | 80–100px |
| 3 | Category Grid | `ServicesCategoryGrid` | 12 primary categories + "More" | 400–500px |
| 4 | How It Works | `ServicesHowItWorks` | 3-step process visualization | 400–450px |
| 5 | Featured Providers | `ServicesFeaturedProviders` | Top-rated provider cards | 500–550px |
| 6 | Why MitaSafi | `ServicesWhyMitaSafi` | Value proposition (6 pillars) | 450–500px |
| 7 | Service Areas | `ServicesAreaCoverage` | Nairobi neighborhood map/grid | 400–450px |
| 8 | Pricing Transparency | `ServicesPricingPreview` | Price range previews by category | 450–500px |
| 9 | Testimonials | `ServicesTestimonials` | Customer + provider stories | 500–550px |
| 10 | Provider CTA | `ServicesProviderCTA` | Recruitment banner for providers | 350–400px |
| 11 | FAQ | `ServicesFAQ` | Common questions, JSON-LD | 400–500px |
| 12 | Final CTA | `ServicesFinalCTA` | Bottom conversion section | 350–400px |
| 13 | Footer | `Footer` | Shared site footer (existing) | 300–350px |

---

### Section 0: Navigation — `ServicesNavbar`

**Purpose:** Global navigation with services-specific context.

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]    Browse Services | Emergency | For Providers | Pricing      [Login] [Get Started] │
└─────────────────────────────────────────────────────────────────┘
```

**Links:**
| Label | Href | Notes |
|-------|------|-------|
| Logo (MitaSafi) | `/` | Returns to main homepage |
| Browse Services | `/services/browse` | Main marketplace |
| Emergency | `/services/browse?available=true&sort=response_time` | Quick filter for urgent needs |
| For Providers | `/service-providers` | Provider recruitment page |
| Pricing | `#pricing` | Scrolls to pricing section |
| Log In | `/login` | Auth login page |
| Get Started | `/signup` | Generic signup |

**Behavior:**
- Sticky on scroll with `bg-white/95 backdrop-blur-md`
- Transparent on hero, transitions to solid white after 100px scroll
- Mobile: hamburger menu with full nav links
- No Lucide icons in nav text — text only

---

### Section 1: Hero + Search — `ServicesHero`

**Purpose:** First impression. Communicate value prop and get users searching immediately.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Background: Full-bleed photo of African professional at work        │
│  (plumber fixing pipes, half-body, professional attire)              │
│                                                                      │
│          Trusted Home Services                                       │
│          Across Nairobi                                              │
│                                                                      │
│          Verified professionals. Transparent pricing.                 │
│          Book in minutes, not days.                                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  🔍  What service do you need?        [Nairobi ▾]  [Search] │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Popular: Plumbing · Cleaning · Electrical · Moving · Painting       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Search Bar Spec:**
- Left: Text input with placeholder "What service do you need?" (e.g., "Fix a leaking tap", "Deep clean my apartment")
- Center: Area selector dropdown — defaults to "All Nairobi", lists NAIROBI_AREAS
- Right: CTA button "Search" (brand-600 teal)
- Autocomplete dropdown with category suggestions, recent searches (localStorage), and provider name matches
- On submit: navigates to `/services/browse?q={query}&area={area}`

**Popular Tags:** Horizontally scrollable chip row. Each chip links to `/services/browse?category={slug}`.

**Background Image:** AI-generated — African plumber in professional attire, kneeling and working on copper pipes under a modern kitchen sink. Warm natural lighting, shallow depth of field. Professional, competent, trustworthy.

**Typography:**
- H1: "Trusted Home Services Across Nairobi" — `text-4xl sm:text-5xl lg:text-6xl font-bold text-white`
- Subhead: `text-xl sm:text-2xl text-white/80`

**No icons in the hero headline.** Clean text only.

---

### Section 2: Trust Bar — `ServicesTrustBar`

**Purpose:** Instant credibility with real platform numbers.

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│   700+ Providers    │  12 Categories  │  4.8★ Avg   │  50K+ Jobs  │
└────────────────────────────────────────────────────────────────┘
```

**Design:**
- Horizontal strip, white background, subtle top/bottom border
- 4 stat blocks evenly spaced
- Number: `text-2xl font-bold text-gray-900`
- Label: `text-sm text-gray-500`
- No icons. Numbers speak for themselves.
- Mobile: 2×2 grid

**Stats (aspirational — will be API-driven eventually):**
| Stat | Display | Source |
|------|---------|--------|
| Provider count | "700+ Verified Providers" | `service_providers` table count (future) |
| Category count | "20+ Service Categories" | `service_categories` table count |
| Average rating | "4.8★ Average Rating" | `avg(average_rating)` from providers (future) |
| Completed jobs | "50,000+ Jobs Completed" | `bookings` table count where status=completed (future) |

---

### Section 3: Category Grid — `ServicesCategoryGrid`

**Purpose:** Primary navigation. Let users find their service category visually.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  What Do You Need Help With?                                         │
│                                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ [Photo] │  │ [Photo] │  │ [Photo] │  │ [Photo] │               │
│  │Plumbing │  │Electr.  │  │Cleaning │  │Moving   │               │
│  │12 provs │  │8 provs  │  │24 provs │  │15 provs │               │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
│                                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ [Photo] │  │ [Photo] │  │ [Photo] │  │ [Photo] │               │
│  │Laundry  │  │Painting │  │Carpentry│  │Pest Ctrl│               │
│  │6 provs  │  │10 provs │  │7 provs  │  │5 provs  │               │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
│                                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ [Photo] │  │ [Photo] │  │ [Photo] │  │ [Photo] │               │
│  │Water/Gas│  │Internet │  │Gardening│  │  More   │               │
│  │3 provs  │  │4 provs  │  │6 provs  │  │  +8     │               │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
│                                                                      │
│                    [Browse All Services →]                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Card Design:**
- Aspect ratio: 4:3
- Top: Photo of an African professional performing the specific service (AI-generated)
- Bottom overlay: Category name (bold, white) + provider count (white/80)
- Hover: slight scale(1.02) + shadow increase
- Click → `/services/browse?category={slug}`
- No Lucide icons on cards — photography only

**Grid:**
- Desktop: 4 columns × 3 rows (12 cards)
- Tablet: 3 columns × 4 rows
- Mobile: 2 columns (scrollable, show 8 initially + "Show more")

**"More" Card:** Shows "+8 more categories" with a mosaic/collage thumbnail of multiple service images. Click → dropdown or modal listing remaining categories.

**Bottom CTA:** "Browse All Services →" → `/services/browse`

---

### Section 4: How It Works — `ServicesHowItWorks`

**Purpose:** Reduce anxiety by showing the simple 3-step process.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│              How It Works                                            │
│              Get professional help in 3 simple steps                 │
│                                                                      │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│   │   [Photo]   │     │   [Photo]   │     │   [Photo]   │          │
│   │             │     │             │     │             │          │
│   │  1. Search  │ ──→ │ 2. Compare  │ ──→ │  3. Book    │          │
│   │  Find the   │     │  Read       │     │  Confirm &  │          │
│   │  right      │     │  reviews,   │     │  pay        │          │
│   │  service    │     │  compare    │     │  securely   │          │
│   │             │     │  quotes     │     │             │          │
│   └─────────────┘     └─────────────┘     └─────────────┘          │
│                                                                      │
│                    [Find a Provider →]                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Step Images:**
1. Search: Close-up of hands on a smartphone, searching on the MitaSafi interface. African hands, modern phone, clean UI visible on screen
2. Compare: Split view showing two provider profiles side by side. Professional headshots, star ratings, price ranges visible
3. Book: Customer greeting a provider at their door. African woman opening door to a professional with a branded toolbox/bag

**Design:**
- White background (`bg-white`)
- Step number: Large `text-5xl font-bold text-brand-100` (watermark-style behind the card)
- Step title: `text-xl font-semibold text-gray-900`
- Step description: `text-base text-gray-600`
- Connector: Subtle dashed line between steps (desktop), numbered circles (mobile)
- Mobile: Vertical stack with timeline-style connector

**CTA:** "Find a Provider →" → `/services/browse`

---

### Section 5: Featured Providers — `ServicesFeaturedProviders`

**Purpose:** Showcase real top-rated providers to build trust and demonstrate the marketplace quality.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Top-Rated Providers                                                 │
│  Trusted by thousands of Nairobi homeowners                          │
│                                                                      │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│   │ [Photo]       │  │ [Photo]       │  │ [Photo]       │          │
│   │ John M.       │  │ Mary W.       │  │ Peter K.      │          │
│   │ ★★★★★ (48)    │  │ ★★★★★ (92)    │  │ ★★★★☆ (31)    │          │
│   │ Plumber       │  │ Cleaner       │  │ Electrician   │          │
│   │ Kilimani area │  │ Westlands     │  │ South B/C     │          │
│   │ From KES 1,500│  │ From KES 2,000│  │ From KES 800  │          │
│   │               │  │               │  │               │          │
│   │ [View Profile]│  │ [View Profile]│  │ [View Profile]│          │
│   └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                      │
│                 [Browse All Providers →]                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Card Design:**
- Clean white card with subtle shadow
- Provider photo: Circular, 80×80px, with green "verified" dot overlay
- Name: `text-lg font-semibold text-gray-900`
- Rating: Star display + review count (real data, not icons — `4.9 ★ (48 reviews)`)
- Service category: `text-sm text-gray-500`
- Area: `text-sm text-gray-500` with subtle map-pin icon (this ONE case is allowed — functional indicator, not decoration)
- Starting price: `text-base font-semibold text-gray-900`
- CTA: "View Profile" → `/services/provider/{id}`
- Verified badge: Small teal checkmark next to name (if `is_verified`)

**Data Source:** Server-side fetch from `getFeaturedProviders()` — top 6 by rating × review count. Show 3 on desktop, horizontal scroll on mobile.

**When DB is empty:** Show placeholder cards with skeleton shimmer and "Coming Soon" overlay. Never fake data.

---

### Section 6: Why MitaSafi — `ServicesWhyMitaSafi`

**Purpose:** Communicate the 6 core value pillars that differentiate MitaSafi from finding a fundi on the street.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Why Nairobi Trusts MitaSafi                                         │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  [Image]        │  │  [Image]        │  │  [Image]        │     │
│  │  Verified       │  │  Transparent    │  │  Secure         │     │
│  │  Professionals  │  │  Pricing        │  │  Payments       │     │
│  │                 │  │                 │  │                 │     │
│  │  Every provider │  │  See prices     │  │  Pay through    │     │
│  │  is ID-verified │  │  before you     │  │  M-Pesa with    │     │
│  │  and background │  │  book. No       │  │  escrow         │     │
│  │  checked.       │  │  surprises.     │  │  protection.    │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  [Image]        │  │  [Image]        │  │  [Image]        │     │
│  │  Real           │  │  Emergency      │  │  Your           │     │
│  │  Reviews        │  │  Ready          │  │  Neighborhood   │     │
│  │                 │  │                 │  │                 │     │
│  │  Read honest    │  │  Urgent issue?  │  │  Find providers │     │
│  │  reviews from   │  │  Get a provider │  │  who serve your │     │
│  │  verified       │  │  within hours,  │  │  specific       │     │
│  │  customers.     │  │  not days.      │  │  area.          │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Pillar Spec:**

| # | Title | Description | Image Concept |
|---|-------|-------------|---------------|
| 1 | Verified Professionals | Every provider is ID-verified and background-checked before they can accept jobs. | Close-up of a provider's ID badge/verification screen on phone |
| 2 | Transparent Pricing | See price ranges before you book. Compare quotes from multiple providers. No surprises. | Screenshot/mockup of a price comparison interface |
| 3 | Secure Payments | Pay through M-Pesa with built-in escrow. Money is released only after you confirm completion. | Hands holding phone showing M-Pesa payment confirmation |
| 4 | Real Reviews | Read honest reviews from verified customers. Multi-dimensional ratings cover quality, timeliness, and value. | Screenshot of review interface showing star ratings and written reviews |
| 5 | Emergency Ready | Burst pipe at midnight? Get a provider within hours, not days. Emergency services available 24/7. | Provider arriving at a door at night, professional emergency response feel |
| 6 | Your Neighborhood | Find providers who already serve your area. Kilimani, Westlands, South B, Karen — all covered. | Aerial/map view of Nairobi neighborhoods with service pins |

**Design:**
- Light gray background (`bg-gray-50`)
- 3-column grid (desktop), 1-column stack (mobile)
- Each pillar: image top (16:9 aspect, rounded), title + description below
- Title: `text-lg font-semibold text-gray-900`
- Description: `text-base text-gray-600 leading-relaxed`
- **No Lucide icons.** Photography only. The images themselves communicate the concept.

---

### Section 7: Service Areas — `ServicesAreaCoverage`

**Purpose:** Show geographic coverage. Help users find providers in their specific Nairobi neighborhood.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  We Cover All of Nairobi                                             │
│                                                                      │
│  ┌────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌────────────┐ ┌─────────┐ │
│  │West│ │Kilimani│ │Lavingtn│ │Karen │ │Kileleshwa  │ │South B  │ │
│  │land│ │        │ │        │ │      │ │            │ │         │ │
│  └────┘ └────────┘ └────────┘ └──────┘ └────────────┘ └─────────┘ │
│  ┌─────┐ ┌──────┐ ┌──────┐ ┌─────────┐ ┌──────┐ ┌──────────────┐ │
│  │Ruaka│ │ Ruiru│ │South │ │Langata  │ │Upper │ │Parklands     │ │
│  │     │ │      │ │C     │ │         │ │Hill  │ │              │ │
│  └─────┘ └──────┘ └──────┘ └─────────┘ └──────┘ └──────────────┘ │
│                                                                      │
│  + 30 more neighborhoods across Greater Nairobi                      │
│                                                                      │
│                  [Search Your Area →]                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Design:**
- White background
- Area chips: Rounded-full pills with area name, subtle border, provider count on hover
- Click: → `/services/browse?area={area_name}`
- Grouped by region (Central & West, South, North & East) using `AREA_GROUPS` constant
- "Search Your Area" CTA → scrolls to hero search or opens area selector

---

### Section 8: Pricing Transparency — `ServicesPricingPreview`

**Purpose:** Set expectations. Show real price ranges by category so users know what to expect.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Transparent Pricing                                                 │
│  Know what to expect before you book                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Category          │ Starting From  │ Typical Range │ Action │    │
│  │───────────────────│───────────────│──────────────│────────│    │
│  │ Plumbing          │ KES 500       │ KES 500–5K   │ [View] │    │
│  │ Electrical        │ KES 800       │ KES 800–8K   │ [View] │    │
│  │ Cleaning          │ KES 1,500     │ KES 1.5K–6K  │ [View] │    │
│  │ Moving            │ KES 3,000     │ KES 3K–25K   │ [View] │    │
│  │ Painting          │ KES 2,000     │ KES 2K–15K   │ [View] │    │
│  │ Carpentry         │ KES 1,000     │ KES 1K–10K   │ [View] │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Prices vary by scope, location, and provider experience.            │
│  All quotes are free and non-binding.                                │
│                                                                      │
│              [Get a Free Quote →]                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Design:**
- Light gray background (`bg-gray-50`)
- Clean table/card layout
- Category name: left-aligned, medium weight
- Price: right-aligned, bold, `text-gray-900`
- "View" link → `/services/browse?category={slug}`
- Desktop: Table layout. Mobile: Stacked cards.
- Disclaimer at bottom: `text-sm text-gray-500`
- **No icons in the table.** Clean text + numbers.

**Data Source:** Initially hardcoded from Constitution pricing data. Eventually, live from `service_pricing` aggregate queries.

**Pricing Reference (from Constitution):**

| Category | Starting From (KES) | Typical Range (KES) |
|----------|-------------------|-------------------|
| Plumbing | 500 | 500–5,000 |
| Electrical | 800 | 800–8,000 |
| Cleaning | 1,500 | 1,500–6,000 |
| Moving & Relocation | 3,000 | 3,000–25,000 |
| Painting | 2,000 | 2,000–15,000 |
| Carpentry | 1,000 | 1,000–10,000 |
| Laundry | 300 | 300–2,000 |
| Pest Control | 2,500 | 2,500–8,000 |
| Water & Gas Delivery | 200 | 200–3,000 |
| Internet & Networking | 1,000 | 1,000–5,000 |
| Gardening | 1,500 | 1,500–8,000 |
| Welding & Metal | 2,000 | 2,000–20,000 |

---

### Section 9: Testimonials — `ServicesTestimonials`

**Purpose:** Social proof from both customers AND providers.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  What People Are Saying                                              │
│                                                                      │
│  [Customers]  [Service Providers]      ← Tab toggle                  │
│                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐                     │
│  │ "Found an amazing   │  │ "The plumber from   │                     │
│  │  plumber in 20 min. │  │  MitaSafi was       │                     │
│  │  Professional,      │  │  professional and   │                     │
│  │  on time, fair      │  │  fixed our issue    │                     │
│  │  price."            │  │  in one visit."     │                     │
│  │                     │  │                     │                     │
│  │  [Photo] Grace M.   │  │  [Photo] David O.   │                     │
│  │  Kilimani           │  │  Westlands          │                     │
│  │  ★★★★★             │  │  ★★★★★             │                     │
│  └────────────────────┘  └────────────────────┘                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Design:**
- White background
- Tab strip: "From Customers" / "From Providers" — allows toggling perspective
- Cards: Quote text in `text-lg italic text-gray-700`, avatar photo (circular, 48px), name, location, 5-star rating
- Mobile: Single card with swipe/carousel
- Desktop: 2-column grid showing 2–4 testimonials at once
- **Photos:** AI-generated African faces, professional/warm aesthetic. Not stock.

**Testimonial Content (6 customer-side):**

| Name | Area | Service | Quote |
|------|------|---------|-------|
| Grace M. | Kilimani | Plumbing | "Found an amazing plumber in 20 minutes. Professional, on time, and fair price. No more asking neighbors for recommendations." |
| David O. | Westlands | Cleaning | "We've been using the same cleaner we found on MitaSafi for 6 months now. The booking system makes scheduling a breeze." |
| Wanjiku K. | South B | Electrical | "Our fridge stopped working on a Saturday night. Had an electrician at our door by Sunday morning. Lifesaver." |
| James N. | Karen | Moving | "Moved our entire 3-bedroom house in one day. The movers were careful with our things and everything arrived intact." |
| Aisha M. | Langata | Painting | "Got three quotes within an hour. Compared reviews and picked the best one. The result was better than expected." |
| Brian W. | Parklands | Pest Control | "Cockroach problem gone in one treatment. The provider even gave us prevention tips for free." |

**Testimonial Content (4 provider-side):**

| Name | Service | Quote |
|------|---------|-------|
| Peter K. | Plumber | "MitaSafi gives me steady work every week. I used to spend half my time looking for jobs — now they come to me." |
| Mary W. | Cleaner | "The secure payment system means I always get paid. No more chasing clients for money." |
| Samuel O. | Electrician | "My reviews on MitaSafi helped me raise my rates by 40%. Clients trust me because they can see my track record." |
| Hannah N. | Interior Designer | "The platform handles scheduling and payments so I can focus on what I do best — making homes beautiful." |

---

### Section 10: Provider CTA — `ServicesProviderCTA`

**Purpose:** Recruit service providers. This is a mini-landing within the landing page.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  [Photo: Provider in branded attire]    Are You a Service Provider?  │
│                                                                      │
│                                         Join Kenya's fastest-growing │
│                                         home services marketplace.   │
│                                                                      │
│                                         ✓ Free to join              │
│                                         ✓ Set your own rates         │
│                                         ✓ Secure payments via M-Pesa │
│                                         ✓ Build your reputation      │
│                                                                      │
│                                         [Join as Provider →]         │
│                                         [Learn More]                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Design:**
- Brand teal background (`bg-brand-600`) with white text
- Left: Full-height photo of a confident African service provider (waist-up, eye contact)
- Right: Copy + benefits list + dual CTA
- Benefits: Use `✓` character — NOT Lucide CheckCircle icons. Keep it clean.
- "Join as Provider" → `/signup?role=provider` (primary, white button)
- "Learn More" → `/service-providers` (secondary, outline white button)
- Mobile: Stack — image on top, text below

---

### Section 11: FAQ — `ServicesFAQ`

**Purpose:** Answer common questions. Rich with JSON-LD for FAQ rich snippets in Google.

**Questions:**

| # | Question | Answer |
|---|----------|--------|
| 1 | How do I find a service provider? | Search by service type or browse categories. Filter by area, price, and rating. Read reviews from verified customers before booking. |
| 2 | How much do services cost? | Prices vary by service type, scope, and provider. You can see price ranges on each provider's profile and request free quotes before committing. |
| 3 | Are providers verified? | Yes. Every provider completes ID verification and phone verification. Certified providers undergo additional background checks. Look for the verified badge on profiles. |
| 4 | How do payments work? | Payments are processed securely through M-Pesa. For larger jobs, funds are held in escrow and released to the provider only after you confirm the work is complete. |
| 5 | What if I'm not satisfied? | You can raise a dispute through the platform within 48 hours of job completion. Our team reviews the case and mediates a fair resolution. |
| 6 | Can I book emergency services? | Yes. Filter by "Available Now" to find providers who can respond immediately. Emergency plumbing and electrical providers are typically available within 2–4 hours. |
| 7 | How do I become a service provider? | Sign up for free at mitasafi.co.ke/signup. Complete your profile, verify your identity, add your services, and start receiving job requests. |
| 8 | Is there a fee to join as a provider? | Joining is completely free. We charge a small service fee (10–15%) only when you successfully complete a job and receive payment. |

**Design:**
- White background
- Accordion-style (click to expand)
- Question: `text-lg font-medium text-gray-900`
- Answer: `text-base text-gray-600 leading-relaxed`
- Open/close indicator: subtle `+`/`−` text character (not Lucide icon)
- JSON-LD `FAQPage` structured data injected via `<script type="application/ld+json">`

---

### Section 12: Final CTA — `ServicesFinalCTA`

**Purpose:** Last chance conversion. Two clear paths — customer or provider.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Background: Subtle gradient (brand-700 → brand-600)                 │
│                                                                      │
│         Ready to Get Started?                                        │
│                                                                      │
│     [Find a Provider]        [Join as Provider]                      │
│      ↓ for customers          ↓ for providers                       │
│                                                                      │
│     Already have an account? Log in →                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Links:**
- "Find a Provider" → `/services/browse` (white button, primary)
- "Join as Provider" → `/signup?role=provider` (outline white button)
- "Log in" → `/login` (text link, white)

---

### Section 13: Footer

**Reuse** the existing `Footer` component from `@/components/landing/Footer`. No changes needed — it already covers product, company, resources, and legal links.

---

## 4. Complete Link Registry

Every link that appears on the services landing page, with destination, status, and notes.

### Navigation Links

| Label | Href | Link Type | Exists? |
|-------|------|-----------|---------|
| MitaSafi Logo | `/` | Internal | ✅ Yes |
| Browse Services | `/services/browse` | Internal | ❌ New route (relocated from `/services`) |
| Emergency | `/services/browse?available=true&sort=response_time` | Internal | ❌ Depends on browse route |
| For Providers | `/service-providers` | Internal | ✅ Yes |
| Pricing | `#pricing` | Anchor | ✅ Section anchor |
| Log In | `/login` | Internal | ✅ Yes |
| Get Started | `/signup` | Internal | ✅ Yes |

### Hero Section Links

| Label | Href | Type |
|-------|------|------|
| Search form submit | `/services/browse?q={query}&area={area}` | Dynamic |
| Popular tag: Plumbing | `/services/browse?category=plumbing` | Internal |
| Popular tag: Cleaning | `/services/browse?category=cleaning` | Internal |
| Popular tag: Electrical | `/services/browse?category=electrical` | Internal |
| Popular tag: Moving | `/services/browse?category=moving-relocation` | Internal |
| Popular tag: Painting | `/services/browse?category=painting` | Internal |
| Popular tag: Laundry | `/services/browse?category=laundry` | Internal |

### Category Grid Links

| Category | Href |
|----------|------|
| Plumbing | `/services/browse?category=plumbing` |
| Electrical | `/services/browse?category=electrical` |
| Water & Gas Delivery | `/services/browse?category=water-gas-delivery` |
| Cleaning | `/services/browse?category=cleaning` |
| Laundry | `/services/browse?category=laundry` |
| Pest Control | `/services/browse?category=pest-control` |
| Carpentry | `/services/browse?category=carpentry` |
| Painting | `/services/browse?category=painting` |
| Moving & Relocation | `/services/browse?category=moving-relocation` |
| Internet & Networking | `/services/browse?category=internet-networking` |
| Gardening & Landscaping | `/services/browse?category=gardening-landscaping` |
| More (+8 categories) | Modal/dropdown revealing remaining 8 |
| Browse All Services | `/services/browse` |

### "More" Categories Links (inside dropdown/modal)

| Category | Href |
|----------|------|
| Garbage & Junk Removal | `/services/browse?category=garbage-junk-removal` |
| IT & Tech Support | `/services/browse?category=it-tech-support` |
| Welding & Metal Works | `/services/browse?category=welding-metal-works` |
| Glass & Aluminium Works | `/services/browse?category=glass-aluminium-works` |
| Beauty (Home Services) | `/services/browse?category=beauty-home-services` |
| Events & Planning | `/services/browse?category=events-planning` |
| Childcare & Home Care | `/services/browse?category=childcare-home-care` |
| Taxi & Rides | `/services/browse?category=taxi-rides` |
| Shopping Assistance | `/services/browse?category=shopping-assistance` |

### Featured Provider Links

| Label | Href | Dynamic |
|-------|------|---------|
| Provider card | `/services/provider/{provider_id}` | Yes — from DB |
| "Browse All Providers" | `/services/browse` | Static |

### Area Links

| Area | Href |
|------|------|
| Westlands | `/services/browse?area=Westlands` |
| Kilimani | `/services/browse?area=Kilimani` |
| Lavington | `/services/browse?area=Lavington` |
| Karen | `/services/browse?area=Karen` |
| Kileleshwa | `/services/browse?area=Kileleshwa` |
| South B | `/services/browse?area=South%20B` |
| South C | `/services/browse?area=South%20C` |
| Langata | `/services/browse?area=Langata` |
| Ruaka | `/services/browse?area=Ruaka` |
| Ruiru | `/services/browse?area=Ruiru` |
| Parklands | `/services/browse?area=Parklands` |
| Upper Hill | `/services/browse?area=Upper%20Hill` |

### CTA Links (across all sections)

| Label | Href | Section |
|-------|------|---------|
| Find a Provider | `/services/browse` | How It Works, Final CTA |
| Get a Free Quote | `/services/browse` | Pricing Preview |
| Join as Provider | `/signup?role=provider` | Provider CTA, Final CTA |
| Learn More (providers) | `/service-providers` | Provider CTA |
| Already have an account? Log in | `/login` | Final CTA |

### Auth Links

| Label | Href | Notes |
|-------|------|-------|
| Log In | `/login` | Navbar + Final CTA |
| Sign Up (generic) | `/signup` | Navbar |
| Sign Up (customer) | `/signup` | Implied by "Get Started" |
| Sign Up (provider) | `/signup?role=provider` | Provider CTA sections |

---

## 5. SEO Specification

### Page Metadata

```typescript
export const metadata: Metadata = {
  title: "Home Services in Nairobi | Plumbers, Electricians & More | MitaSafi",
  description: "Find verified plumbers, electricians, cleaners, movers, and 700+ service providers in Nairobi. Compare quotes, read reviews, book instantly. Trusted by thousands.",
  keywords: [
    "home services Nairobi",
    "plumber Nairobi",
    "electrician Nairobi",
    "house cleaning Nairobi",
    "moving services Kenya",
    "fundi services",
    "verified contractors Kenya",
    "emergency plumber Nairobi",
    "home maintenance Nairobi",
    "service providers Kenya",
    "MitaSafi services",
    "affordable plumber Kenya",
    "cleaning service Westlands",
    "electrician Kilimani",
  ],
  openGraph: {
    title: "Home Services in Nairobi | MitaSafi",
    description: "Find verified plumbers, electricians, cleaners, and 700+ service providers in Nairobi. Compare quotes, read reviews, book instantly.",
    type: "website",
    locale: "en_KE",
    url: "https://mitasafi.co.ke/services",
    siteName: "MitaSafi",
    images: [{
      url: "https://mitasafi.co.ke/og/services.jpg",
      width: 1200,
      height: 630,
      alt: "MitaSafi — Trusted Home Services Across Nairobi",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Services in Nairobi | MitaSafi",
    description: "Verified plumbers, electricians, cleaners & more. Book instantly.",
  },
  alternates: {
    canonical: "https://mitasafi.co.ke/services",
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

### Structured Data (JSON-LD)

The page embeds three JSON-LD blocks:

**1. WebPage + SearchAction:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Home Services in Nairobi | MitaSafi",
  "url": "https://mitasafi.co.ke/services",
  "description": "...",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://mitasafi.co.ke/services/browse?q={search_term}",
    "query-input": "required name=search_term"
  }
}
```

**2. LocalBusiness (Organization):**
```json
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "MitaSafi",
  "url": "https://mitasafi.co.ke",
  "description": "Kenya's trusted marketplace for verified home service providers.",
  "areaServed": {
    "@type": "City",
    "name": "Nairobi",
    "containedInPlace": { "@type": "Country", "name": "Kenya" }
  },
  "serviceType": ["Plumbing", "Electrical", "Cleaning", "Moving", "Painting", "Carpentry", "Pest Control"]
}
```

**3. FAQPage (from FAQ section):**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." } }
  ]
}
```

### Heading Hierarchy

| Level | Text | Section |
|-------|------|---------|
| H1 | "Trusted Home Services Across Nairobi" | Hero |
| H2 | "What Do You Need Help With?" | Category Grid |
| H2 | "How It Works" | How It Works |
| H2 | "Top-Rated Providers" | Featured Providers |
| H2 | "Why Nairobi Trusts MitaSafi" | Why MitaSafi |
| H2 | "We Cover All of Nairobi" | Area Coverage |
| H2 | "Transparent Pricing" | Pricing Preview |
| H2 | "What People Are Saying" | Testimonials |
| H2 | "Are You a Service Provider?" | Provider CTA |
| H2 | "Frequently Asked Questions" | FAQ |
| H2 | "Ready to Get Started?" | Final CTA |
| H3 | Individual category names | Category Grid cards |
| H3 | Step titles ("Search", "Compare", "Book") | How It Works |
| H3 | FAQ questions | FAQ accordion |

---

## 6. Image Specification

### Image Strategy

All images must be **AI-generated** to ensure:
1. **African representation** — All people depicted are Black/African
2. **Professional quality** — Clean, well-lit, modern aesthetic
3. **Brand alignment** — Warm tones, teal accents where possible, clean backgrounds
4. **Consistency** — Same art style across all generated images
5. **No stock clichés** — No "thumbs up", no hard hats with clipboards, no staged group shots

### Required Images

#### Hero Background
| ID | Description | Size | Format |
|----|-------------|------|--------|
| `services-hero-bg` | African plumber kneeling under modern kitchen sink, working on copper pipes. Professional attire (branded polo shirt). Warm natural lighting from a window. Shallow depth of field. Modern Nairobi kitchen visible in background. | 1920×1080 | JPG |

#### Category Grid (12 images)
| ID | Category | Description | Size |
|----|----------|-------------|------|
| `cat-plumbing` | Plumbing | African plumber's hands tightening a pipe fitting under a sink. Close-up, sharp focus, professional tools visible. | 800×600 |
| `cat-electrical` | Electrical | African electrician working on a circuit breaker panel. Safety goggles on forehead, focused expression, well-lit interior. | 800×600 |
| `cat-water-gas` | Water & Gas | African delivery worker carrying a water jerrycan or gas cylinder to a door. Residential area, daytime. | 800×600 |
| `cat-cleaning` | Cleaning | African woman in professional cleaning attire, mopping a modern apartment floor. Bright, clean space. | 800×600 |
| `cat-laundry` | Laundry | African woman pressing/ironing clothes in a well-organized laundry space. Professional setup. | 800×600 |
| `cat-pest-control` | Pest Control | African pest control technician with sprayer, treating a home interior. Professional gear, modern home. | 800×600 |
| `cat-carpentry` | Carpentry | African carpenter measuring and cutting wood with precision tools. Workshop or on-site installation. | 800×600 |
| `cat-painting` | Painting | African painter applying a brush stroke to a wall. Fresh paint, clean lines, drop cloth visible. | 800×600 |
| `cat-moving` | Moving | Two African movers carefully carrying a couch out of a house. Professional attire, moving truck visible in background. | 800×600 |
| `cat-internet` | Internet & Networking | African technician setting up a WiFi router in a modern apartment. Cable management, clean setup. | 800×600 |
| `cat-gardening` | Gardening | African gardener tending to a landscaped garden. Green plants, well-maintained yard, residential setting. | 800×600 |
| `cat-more` | More Services | Collage/grid of multiple service thumbnails — welding, beauty, events, childcare. Clean 2×2 grid. | 800×600 |

#### How It Works (3 images)
| ID | Step | Description | Size |
|----|------|-------------|------|
| `howit-search` | Search | African woman's hands on a smartphone, screen showing a search interface with service results. Close-up, modern phone, clean UI. | 800×600 |
| `howit-compare` | Compare | Over-shoulder view of an African man looking at a laptop showing provider profiles side by side. Star ratings and prices visible on screen. | 800×600 |
| `howit-book` | Book | African woman opening her front door, greeting a professional provider who has arrived. Daytime, residential hallway, warm interaction. | 800×600 |

#### Why MitaSafi (6 images)
| ID | Pillar | Description | Size |
|----|--------|-------------|------|
| `why-verified` | Verified | Close-up of a provider's phone showing a green "Verified" badge on their MitaSafi profile. Hands visible, professional context. | 800×600 |
| `why-pricing` | Pricing | Mockup screenshot of MitaSafi's price comparison interface — 3 provider cards with prices and ratings. Clean, readable. | 800×600 |
| `why-payment` | Payments | Hands holding a phone showing M-Pesa payment confirmation screen. Green success checkmark, amount visible. Warm lighting. | 800×600 |
| `why-reviews` | Reviews | Screenshot of MitaSafi's review interface — star ratings, written review, reviewer photo. Clean, trustworthy. | 800×600 |
| `why-emergency` | Emergency | Provider arriving at a residential door at dusk/night. Porch light on, provider carrying a tool bag, professional appearance. | 800×600 |
| `why-neighborhood` | Neighborhood | Aerial-stylized view of Nairobi neighborhoods with service coverage pins. Modern map aesthetic with teal pins on key areas. | 800×600 |

#### Provider CTA (1 image)
| ID | Description | Size |
|----|-------------|------|
| `provider-cta` | Confident African service provider (male or female), standing, half-body, direct eye contact. Clean background (solid teal or blurred workshop). Professional attire, slight smile, trustworthy demeanor. | 800×1000 |

#### Testimonial Avatars (10 images)
| ID | Description | Size |
|----|-------------|------|
| `avatar-grace` | African woman, 30s, professional, warm smile. Headshot, neutral background. | 200×200 |
| `avatar-david` | African man, 30s, casual-professional, friendly. Headshot. | 200×200 |
| `avatar-wanjiku` | African woman, 40s, confident, natural. Headshot. | 200×200 |
| `avatar-james` | African man, 40s, business-casual, approachable. Headshot. | 200×200 |
| `avatar-aisha` | African woman, 20s, modern, energetic. Headshot. | 200×200 |
| `avatar-brian` | African man, 20s-30s, relaxed, pleasant. Headshot. | 200×200 |
| `avatar-peter` | African man, 30s, in work attire (polo), hardworking look. Headshot. | 200×200 |
| `avatar-mary` | African woman, 30s, in cleaning uniform, professional. Headshot. | 200×200 |
| `avatar-samuel` | African man, 30s, electrician attire, confident. Headshot. | 200×200 |
| `avatar-hannah` | African woman, 30s, stylish/creative look (designer). Headshot. | 200×200 |

### Image Delivery

| Environment | Strategy |
|-------------|----------|
| **Storage** | Upload all to Supabase Storage bucket `landing-images/services/` |
| **Format** | JPG for photos, WebP for screenshots/mockups |
| **Optimization** | Next.js `<Image>` with `sizes` prop, AVIF+WebP format chain |
| **Fallback** | `placeholder="blur"` with `blurDataURL` (tiny base64 thumbnails) |
| **CDN** | Supabase CDN (via public bucket URL) + Next.js image optimization |

### Image File Naming Convention

All files follow: `{section}-{descriptor}.jpg`

```
landing-images/services/
├── hero-bg.jpg
├── categories/
│   ├── plumbing.jpg
│   ├── electrical.jpg
│   ├── water-gas-delivery.jpg
│   ├── cleaning.jpg
│   ├── laundry.jpg
│   ├── pest-control.jpg
│   ├── carpentry.jpg
│   ├── painting.jpg
│   ├── moving-relocation.jpg
│   ├── internet-networking.jpg
│   ├── gardening-landscaping.jpg
│   └── more-services.jpg
├── how-it-works/
│   ├── search.jpg
│   ├── compare.jpg
│   └── book.jpg
├── why-mitasafi/
│   ├── verified.jpg
│   ├── pricing.jpg
│   ├── payment.jpg
│   ├── reviews.jpg
│   ├── emergency.jpg
│   └── neighborhood.jpg
├── provider-cta.jpg
└── avatars/
    ├── grace.jpg
    ├── david.jpg
    ├── wanjiku.jpg
    ├── james.jpg
    ├── aisha.jpg
    ├── brian.jpg
    ├── peter.jpg
    ├── mary.jpg
    ├── samuel.jpg
    └── hannah.jpg
```

**Total: 35 images** to generate and upload.

---

## 7. Design System Compliance

### Color Usage

| Context | Token | Hex | Usage |
|---------|-------|-----|-------|
| Primary brand | `brand-600` | #0D9488 | Buttons, links, accents |
| Primary hover | `brand-700` | #0F766E | Button hover, active states |
| CTA accent | `cta-600` | #EA580C | "Get Started" buttons, urgent CTAs |
| CTA hover | `cta-700` | #C2410C | CTA hover states |
| Success | `success-600` | #059669 | Verified badges, positive states |
| Text primary | `gray-900` | #111827 | Headlines, body text |
| Text secondary | `gray-600` | #4B5563 | Descriptions, secondary text |
| Text tertiary | `gray-500` | #6B7280 | Captions, metadata |
| Background white | `white` | #FFFFFF | Card backgrounds, alternating sections |
| Background gray | `gray-50` | #F9FAFB | Alternating section backgrounds |
| Border | `gray-100` | #F3F4F6 | Card borders, dividers |

### Section Background Pattern

Alternating white and gray-50 for visual rhythm:

| Section | Background |
|---------|-----------|
| Hero | Full-bleed image with overlay |
| Trust Bar | `white` + subtle top/bottom border |
| Category Grid | `gray-50` |
| How It Works | `white` |
| Featured Providers | `gray-50` |
| Why MitaSafi | `white` |
| Area Coverage | `gray-50` |
| Pricing Preview | `white` |
| Testimonials | `gray-50` |
| Provider CTA | `brand-600` gradient |
| FAQ | `white` |
| Final CTA | `brand-700` → `brand-600` gradient |

### Typography

| Element | Class |
|---------|-------|
| H1 (Hero) | `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight` |
| H2 (Section titles) | `text-3xl sm:text-4xl font-bold text-gray-900` |
| H3 (Card titles) | `text-xl font-semibold text-gray-900` |
| Body | `text-base text-gray-600 leading-relaxed` |
| Section description | `text-lg text-gray-600 max-w-2xl mx-auto text-center` |
| Caption/metadata | `text-sm text-gray-500` |
| Price | `text-lg font-semibold text-gray-900` |
| Small print | `text-xs text-gray-400` |

### Button Usage

| Context | Variant | Size |
|---------|---------|------|
| Hero search submit | `brand` | `lg` |
| Category "Browse All" | `secondary` | `md` |
| Provider "View Profile" | `brand` | `sm` |
| Provider CTA "Join" | `white` | `lg` |
| Final CTA "Find Provider" | `white` | `lg` |
| Final CTA "Join as Provider" | `outline` | `lg` |
| FAQ "Get Started" | `brand` | `md` |
| Inline text links | `link` | — |

### Spacing

| Between sections | `py-16 lg:py-24` |
|--|--|
| Section title → content | `mt-12 lg:mt-16` |
| Card internal padding | `p-6` |
| Button gap (horizontal) | `gap-4` |
| Grid gap | `gap-6 lg:gap-8` |

### Shadows

| Component | Shadow |
|-----------|--------|
| Cards (rest) | `shadow-soft` |
| Cards (hover) | `shadow-medium` |
| Navigation (scrolled) | `shadow-soft` |
| Modals/dropdowns | `shadow-xl` |

---

## 8. Search & Filter Architecture

### Search Bar Component

The hero search bar is a **simplified version** of `ServiceSearchAutocomplete` from `src/components/services/ServiceSearchAutocomplete.tsx`.

**Variant:** `hero` (already supported — the component has 3 variants: `hero`, `inline`, `minimal`)

**Behavior:**
1. User types → debounced API call (300ms) to `/api/services/search/suggestions`
2. Suggestions dropdown shows: category matches, service name matches, popular searches
3. User can select a suggestion or hit Enter/click Search
4. Submission navigates to `/services/browse?q={encodeURIComponent(query)}&area={area}`
5. Area selector is a simple `<select>` with NAIROBI_AREAS options + "All Nairobi" default

**Autocomplete Data:**
- Categories: from `service_categories` table (name + slug)
- Services: from `services` table (name + slug)
- Popular: hardcoded top 10 searches
- Recent: from `localStorage` (last 5 searches)

### Filter Architecture

The landing page itself does NOT have filters — that's the marketplace (`/services/browse`). The landing page has:

1. **Category quick-select** (Section 3) — click to navigate
2. **Area quick-select** (Section 7) — click to navigate
3. **Price range preview** (Section 8) — click to navigate
4. **Search bar** (Section 1) — text search + area selector

All clicks lead to `/services/browse` with appropriate URL parameters.

---

## 9. Service Categories — Canonical Reference

These are the **20 canonical categories** that match the database schema and Service Constitution. The landing page displays the first 12 prominently and the remaining 8 behind a "More" trigger.

### Primary (12 — Visible on grid)

| Order | Name | Slug | Tier | Emergency? |
|:-----:|------|------|------|:----------:|
| 1 | Plumbing | `plumbing` | Urgent | ✅ |
| 2 | Electrical | `electrical` | Urgent | ✅ |
| 3 | Water & Gas Delivery | `water-gas-delivery` | Essential | ❌ |
| 4 | Cleaning | `cleaning` | Moderate | ❌ |
| 5 | Laundry | `laundry` | Frequent | ❌ |
| 6 | Pest Control | `pest-control` | Frequent | ❌ |
| 7 | Carpentry | `carpentry` | Frequent | ❌ |
| 8 | Painting | `painting` | Frequent | ❌ |
| 9 | Moving & Relocation | `moving-relocation` | Planned | ❌ |
| 10 | Internet & Networking | `internet-networking` | Planned | ❌ |
| 11 | Gardening & Landscaping | `gardening-landscaping` | Planned | ❌ |
| 12 | More Services (+8) | — | — | — |

### Extended (8 — Behind "More" trigger)

| Order | Name | Slug |
|:-----:|------|------|
| 101 | Garbage & Junk Removal | `garbage-junk-removal` |
| 102 | IT & Tech Support | `it-tech-support` |
| 103 | Welding & Metal Works | `welding-metal-works` |
| 104 | Glass & Aluminium Works | `glass-aluminium-works` |
| 105 | Beauty (Home Services) | `beauty-home-services` |
| 106 | Events & Planning | `events-planning` |
| 107 | Childcare & Home Care | `childcare-home-care` |
| 108 | Taxi & Rides | `taxi-rides` |
| 109 | Shopping Assistance | `shopping-assistance` |

---

## 10. Component Specification

### New Components to Create

| Component | File | Type | Lines (Est.) |
|-----------|------|------|:--------:|
| `ServicesNavbar` | `src/components/services-landing/ServicesNavbar.tsx` | Client | ~180 |
| `ServicesHero` | `src/components/services-landing/ServicesHero.tsx` | Server + Client island | ~250 |
| `ServicesTrustBar` | `src/components/services-landing/ServicesTrustBar.tsx` | Server | ~80 |
| `ServicesCategoryGrid` | `src/components/services-landing/ServicesCategoryGrid.tsx` | Server | ~200 |
| `ServicesHowItWorks` | `src/components/services-landing/ServicesHowItWorks.tsx` | Server | ~150 |
| `ServicesFeaturedProviders` | `src/components/services-landing/ServicesFeaturedProviders.tsx` | Server | ~250 |
| `ServicesWhyMitaSafi` | `src/components/services-landing/ServicesWhyMitaSafi.tsx` | Server | ~180 |
| `ServicesAreaCoverage` | `src/components/services-landing/ServicesAreaCoverage.tsx` | Server | ~150 |
| `ServicesPricingPreview` | `src/components/services-landing/ServicesPricingPreview.tsx` | Server | ~200 |
| `ServicesTestimonials` | `src/components/services-landing/ServicesTestimonials.tsx` | Client | ~220 |
| `ServicesProviderCTA` | `src/components/services-landing/ServicesProviderCTA.tsx` | Server | ~120 |
| `ServicesFAQ` | `src/components/services-landing/ServicesFAQ.tsx` | Client | ~200 |
| `ServicesFinalCTA` | `src/components/services-landing/ServicesFinalCTA.tsx` | Server | ~100 |
| `index.ts` | `src/components/services-landing/index.ts` | Barrel | ~15 |

**Total: 13 new components + 1 barrel export ≈ ~2,295 lines**

### Existing Components to Reuse

| Component | From | Used In |
|-----------|------|---------|
| `Footer` | `@/components/landing/Footer` | Page footer |
| `Container` | `@/components/ui/Container` | All sections |
| `Section` + `SectionHeader` | `@/components/ui/Section` | Section wrappers |
| `Badge` | `@/components/ui/Badge` | Category badges |
| `buttonVariants` | `@/components/ui/Button` | All CTA buttons |
| `Logo` | `@/components/ui/Logo` | Navbar |
| `ServiceSearchAutocomplete` | `@/components/services/ServiceSearchAutocomplete` | Hero search (variant="hero") |

### Route Changes

| Current Route | New Route | Notes |
|---|---|---|
| `/services` (marketplace) | `/services/browse` | Relocate current marketplace page |
| — (new) | `/services` | New services landing page |

**Implementation:** 
1. Move `src/app/services/page.tsx` → `src/app/services/browse/page.tsx`
2. Move `src/app/services/mobile-filter-button.tsx` → `src/app/services/browse/mobile-filter-button.tsx`
3. Move `src/app/services/quick-filter-toggle.tsx` → `src/app/services/browse/quick-filter-toggle.tsx`
4. Create new `src/app/services/page.tsx` as the landing page
5. Update all internal links that point to `/services` with query params to point to `/services/browse`

---

## 11. Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| **Keyboard navigation** | All interactive elements focusable + activatable via keyboard |
| **Skip to content** | Hidden skip link at top of page → `<main>` element |
| **Heading hierarchy** | Single H1, sequential H2→H3, no skipped levels |
| **Image alt text** | Descriptive alt text on every `<Image>`, decorative images use `alt=""` |
| **Color contrast** | WCAG AA minimum (4.5:1 for text, 3:1 for large text) |
| **Focus indicators** | Visible focus ring on all interactive elements (existing Tailwind utilities) |
| **Reduced motion** | `prefers-reduced-motion` media query honored — disable animations |
| **Screen reader** | Descriptive `aria-label` on icon-only buttons, `aria-expanded` on accordions |
| **FAQ accordion** | `aria-expanded`, `aria-controls` on each question button |
| **Search form** | Proper `<label>` association, `role="search"`, `aria-autocomplete` |
| **Area chips** | `role="navigation"` with `aria-label="Service areas"` |
| **Testimonial tabs** | `role="tablist"`, `role="tab"`, `role="tabpanel"` |

---

## 12. Performance Requirements

| Metric | Target | Implementation |
|--------|--------|---------------|
| **LCP** | < 2.5s | Preload hero image, server-side rendering |
| **FID** | < 100ms | Minimal client JS, server components |
| **CLS** | < 0.1 | Fixed image dimensions, no layout shift |
| **Bundle size** | < 50KB first load JS | Server components, code splitting |
| **Images** | Lazy load below fold | `loading="lazy"` on all non-hero images |
| **Hero image** | Eager load | `priority` prop on Next.js `<Image>` |
| **Fonts** | Preconnect + display swap | Already configured in layout.tsx |

### Server vs Client Boundary

| Component | Rendering | Reason |
|-----------|-----------|--------|
| ServicesNavbar | Client | Scroll listener, mobile menu toggle |
| ServicesHero | Server + Client island | Search autocomplete needs client; rest is server |
| ServicesTrustBar | Server | Pure static content |
| ServicesCategoryGrid | Server | Pure static content |
| ServicesHowItWorks | Server | Pure static content |
| ServicesFeaturedProviders | Server | SSR data fetch |
| ServicesWhyMitaSafi | Server | Pure static content |
| ServicesAreaCoverage | Server | Pure static content |
| ServicesPricingPreview | Server | Pure static content (eventually SSR) |
| ServicesTestimonials | Client | Tab switching, carousel |
| ServicesProviderCTA | Server | Pure static content |
| ServicesFAQ | Client | Accordion toggle state |
| ServicesFinalCTA | Server | Pure static content |

---

## 13. Responsive Behavior

### Breakpoint Definitions (from Tailwind config)

| Breakpoint | Width | Layout Changes |
|------------|-------|---------------|
| Default (mobile) | < 640px | Single column, stacked, touch-optimized |
| `sm` | ≥ 640px | 2-column grids where appropriate |
| `md` | ≥ 768px | Side-by-side layouts begin |
| `lg` | ≥ 1024px | Full desktop layout, 3-4 column grids |
| `xl` | ≥ 1280px | Max-width container, comfortable spacing |

### Section-Specific Responsive Rules

| Section | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Hero | Full-bleed, stacked, search bar full-width | Full-bleed, search bar 80% width | Full-bleed, search bar 60% width |
| Trust Bar | 2×2 grid | 4-column row | 4-column row |
| Category Grid | 2-col, show 8 + "show more" | 3-col showing all 12 | 4-col × 3-row |
| How It Works | Vertical timeline | 3 cards in row | 3 cards in row with connectors |
| Featured Providers | Horizontal scroll, 1 visible | 2 visible | 3 visible |
| Why MitaSafi | Stacked cards | 2-col grid | 3-col grid |
| Areas | Wrapped chips, 2-3 per row | 4-5 per row | Full grid |
| Pricing | Stacked cards | 2-col | Table layout |
| Testimonials | Single card, swipe | 2 cards visible | 2-3 cards visible |
| Provider CTA | Stacked (image → text) | Side-by-side | Side-by-side |
| FAQ | Full-width accordion | 80% width centered | 60% width centered |
| Final CTA | Stacked buttons | Side-by-side buttons | Side-by-side buttons |

---

## 14. Content Specification

### Tone of Voice

| Attribute | Description | Example |
|-----------|-------------|---------|
| **Professional** | Business-grade, not casual. No slang. | "Verified professionals" not "Awesome fundis!" |
| **Confident** | Assertive, not desperate. | "Trusted by thousands" not "Please try us" |
| **Clear** | Short sentences. No jargon. | "Book in minutes" not "Leverage our platform" |
| **Kenyan** | Use local context naturally. | "Via M-Pesa" not "Via mobile payments" |
| **Respectful** | Dignify service work. | "Professional" not "handyman/fundi" in headlines |

### Key Terms

| Preferred | Avoid |
|-----------|-------|
| Service provider | Fundi, handyman (except in SEO keywords) |
| Professional | Worker, laborer |
| Book | Hire |
| Verified | Vetted, certified (unless referring to specific tier) |
| Customer | Client, user |
| M-Pesa | Mobile money (use M-Pesa by name for trust) |

### Word Counts per Section

| Section | Headline | Description | Body Content |
|---------|----------|-------------|-------------|
| Hero | 6 words | 12 words | — |
| Trust Bar | — | — | 4 × 3 words |
| Category Grid | 6 words | 15 words | 12 × 2 words per card |
| How It Works | 3 words | 10 words | 3 × 25 words |
| Featured Providers | 3 words | 8 words | Dynamic from DB |
| Why MitaSafi | 5 words | — | 6 × 25 words |
| Areas | 5 words | 12 words | 12 area names |
| Pricing | 2 words | 8 words | 12 × 4 cells |
| Testimonials | 4 words | — | 10 × 25 words |
| Provider CTA | 5 words | 15 words | 4 benefits × 5 words |
| FAQ | 3 words | — | 8 × 50 words |
| Final CTA | 5 words | — | 10 words |

---

## 15. Implementation Milestones — Detailed Breakdown

> Each milestone is atomic — it can be executed, tested, and committed independently.
> Steps within a milestone are sequential unless marked "(parallel)".
> Every step names the exact file(s) to create or modify and the acceptance criteria.

---

### SLP-1: Route Migration & Infrastructure Scaffold

**Goal:** Relocate the existing marketplace from `/services` to `/services/browse` so the `/services` route is free for the new landing page. Set up the component directory and barrel file. Update every internal link that currently points to `/services` (with query params) to point to `/services/browse`.

**Effort:** 1–2 hours  
**Dependencies:** None  
**Risk:** Breaking existing navigation. Mitigated by grep-and-replace audit + TypeScript compile check.

#### Step 1.1 — Create the `/services/browse` route directory

| Action | Detail |
|--------|--------|
| Create directory | `src/app/services/browse/` |
| Move file | `src/app/services/page.tsx` → `src/app/services/browse/page.tsx` |
| Move file | `src/app/services/mobile-filter-button.tsx` → `src/app/services/browse/mobile-filter-button.tsx` |
| Move file | `src/app/services/quick-filter-toggle.tsx` → `src/app/services/browse/quick-filter-toggle.tsx` |
| Keep in place | `src/app/services/page.old.tsx` — do NOT move (dead code, keep for reference) |
| Keep in place | `src/app/services/provider/` — do NOT move (dynamic routes stay) |
| Keep in place | `src/app/services/providers/` — do NOT move |

**Fix relative imports after move:**
- In `browse/page.tsx`: update `import` of `./mobile-filter-button` and `./quick-filter-toggle` (paths stay the same since they move together)
- In `browse/page.tsx`: verify all `@/` absolute imports still resolve (they will — no change needed)

**Acceptance:** `npx tsc --noEmit` passes. Navigating to `/services/browse` shows the current marketplace page with all filters, search, and provider cards working.

#### Step 1.2 — Update all internal links from `/services` → `/services/browse`

Exhaustive list of files to update (from codebase audit):

| File | Line(s) | Current href | New href |
|------|---------|-------------|----------|
| `src/app/bookings/[id]/confirmation/page.tsx` | ~136 | `/services` | `/services/browse` |
| `src/app/dashboard/bookings/page.tsx` | ~175 | `/services` | `/services/browse` |
| `src/app/dashboard/saved-providers/SavedProvidersList.tsx` | ~86 | `/services` | `/services/browse` |
| `src/app/services/provider/[id]/page.tsx` | ~243, ~251 | `/services` (breadcrumb) | `/services/browse` |
| `src/components/dashboard/services/ActiveBookingsWidget.tsx` | ~89 | `/services` | `/services/browse` |
| `src/components/landing/PopularServicesSection.tsx` | ~164, ~186 | `/services` | `/services/browse` |
| `src/components/landing/RecentlyViewedSection.tsx` | ~186, ~206 | `/services` | `/services/browse` |
| `src/components/landing/ServiceDiscoverySection.tsx` | ~199 | `/services` | `/services/browse` |

**Important:** Only update links that navigate to the marketplace (i.e., `/services`, `/services?category=...`, `/services?area=...`). Do NOT change links to `/services/provider/...` — those stay unchanged.

**Regex to validate completeness:** `grep -rn 'href="/services"' src/` and `grep -rn 'href={.*\/services[?"]' src/` — should return zero hits to `/services` without `/browse` or `/provider`.

**Acceptance:** All internal links that previously went to the marketplace now go to `/services/browse`. No link to bare `/services` exists except the new landing page itself.

#### Step 1.3 — Create the services-landing component directory

| Action | Detail |
|--------|--------|
| Create directory | `src/components/services-landing/` |
| Create barrel file | `src/components/services-landing/index.ts` (empty barrel — exports added per milestone) |

#### Step 1.4 — Create the new `/services` landing page shell

Create `src/app/services/page.tsx` with:
- Full `metadata` export per §5 SEO Specification (title, description, keywords, openGraph, twitter, alternates, robots)
- A `<main>` element with placeholder `{/* SLP-3 through SLP-5 sections go here */}`
- Import and render `<Footer />` from `@/components/landing/Footer`
- JSON-LD `<script>` block (WebPage with SearchAction) in a `<head>`-injected `<Script>` or inline `<script>`

**Acceptance:** Navigating to `/services` shows a blank page with the footer and correct `<title>` tag. `view-source` shows JSON-LD. `npx tsc --noEmit` passes.

#### Step 1.5 — TypeScript compile + manual smoke test

| Check | Command / Action |
|-------|-----------------|
| TypeScript | `npx tsc --noEmit` — zero errors |
| Landing shell | Navigate to `http://localhost:3000/services` — renders footer |
| Marketplace | Navigate to `http://localhost:3000/services/browse` — full marketplace works |
| Provider profile | Navigate to `http://localhost:3000/services/provider/{any-id}` — still works |
| Breadcrumbs | Provider profile breadcrumb links to `/services/browse` |
| Homepage | "Browse Services" style links on homepage land on `/services/browse` |
| Dashboard | "Find Services" links from dashboard land on `/services/browse` |

---

### SLP-2: Image Generation & Upload

**Goal:** Generate all branded 35 AI images specified in §6, optimize them, upload to Supabase Storage, and verify every URL is publicly accessible.

**Effort:** 2–3 hours  
**Dependencies:** None (can run in parallel with SLP-1)  
**Risk:** AI image quality inconsistency. Mitigated by batch generation with consistent style prompts and manual review before upload.

#### Step 2.1 — Generate hero background image (1 image)

| ID | Prompt Summary | Output Size | File |
|----|---------------|-------------|------|
| `services-hero-bg` | African plumber kneeling under modern kitchen sink, working on copper pipes. Professional attire (branded polo shirt). Warm natural lighting from window. Shallow DoF. Modern Nairobi kitchen visible in background. | 1920×1080 | `hero-bg.jpg` |

**Quality gate:** Image must feel like a premium stock photo. No AI artifacts in hands/fingers. Professional lighting. Subject is clearly African/Black.

#### Step 2.2 — Generate category grid images (12 images)

Generate all 12 category images per §6 "Category Grid" table. Each image 800×600, JPG.

| Batch | Images | Files |
|-------|--------|-------|
| Batch A | plumbing, electrical, water-gas-delivery, cleaning | `categories/plumbing.jpg`, `categories/electrical.jpg`, `categories/water-gas-delivery.jpg`, `categories/cleaning.jpg` |
| Batch B | laundry, pest-control, carpentry, painting | `categories/laundry.jpg`, `categories/pest-control.jpg`, `categories/carpentry.jpg`, `categories/painting.jpg` |
| Batch C | moving-relocation, internet-networking, gardening-landscaping, more-services | `categories/moving-relocation.jpg`, `categories/internet-networking.jpg`, `categories/gardening-landscaping.jpg`, `categories/more-services.jpg` |

**Quality gate:** All images share the same color temperature and art style. Subjects are African. Professional context (not staged/cheesy). Hands/faces are anatomically correct.

#### Step 2.3 — Generate how-it-works images (3 images)

| ID | File |
|----|------|
| `howit-search` | `how-it-works/search.jpg` |
| `howit-compare` | `how-it-works/compare.jpg` |
| `howit-book` | `how-it-works/book.jpg` |

Each 800×600, JPG. Prompts per §6 "How It Works" table.

#### Step 2.4 — Generate why-mitasafi images (6 images)

| ID | File |
|----|------|
| `why-verified` | `why-mitasafi/verified.jpg` |
| `why-pricing` | `why-mitasafi/pricing.jpg` |
| `why-payment` | `why-mitasafi/payment.jpg` |
| `why-reviews` | `why-mitasafi/reviews.jpg` |
| `why-emergency` | `why-mitasafi/emergency.jpg` |
| `why-neighborhood` | `why-mitasafi/neighborhood.jpg` |

Each 800×600, JPG. Prompts per §6 "Why MitaSafi" table.

#### Step 2.5 — Generate provider CTA image (1 image)

| ID | File |
|----|------|
| `provider-cta` | `provider-cta.jpg` |

800×1000 (portrait), JPG. Confident African service provider, standing, half-body, direct eye contact.

#### Step 2.6 — Generate testimonial avatars (10 images)

| File | Person |
|------|--------|
| `avatars/grace.jpg` | African woman, 30s |
| `avatars/david.jpg` | African man, 30s |
| `avatars/wanjiku.jpg` | African woman, 40s |
| `avatars/james.jpg` | African man, 40s |
| `avatars/aisha.jpg` | African woman, 20s |
| `avatars/brian.jpg` | African man, 20s-30s |
| `avatars/peter.jpg` | African man, 30s, work attire |
| `avatars/mary.jpg` | African woman, 30s, professional uniform |
| `avatars/samuel.jpg` | African man, 30s, electrician attire |
| `avatars/hannah.jpg` | African woman, 30s, stylish/creative |

Each 200×200 (square crop), JPG.

#### Step 2.7 — Optimize all images

| Action | Tool | Target |
|--------|------|--------|
| Compress JPGs to ≤80% quality | ImageMagick, Sharp, or Squoosh | All 35 images |
| Verify no image exceeds 200KB (categories) or 500KB (hero) | File size check | All |
| Generate blur placeholder data URLs for hero + first 4 categories | `plaiceholder` or manual base64 | 5 images |

#### Step 2.8 — Upload to Supabase Storage

Upload all images to the `landing-images` bucket under the `services/` prefix:

```
landing-images/services/
├── hero-bg.jpg
├── provider-cta.jpg
├── categories/
│   ├── plumbing.jpg
│   ├── electrical.jpg
│   ├── water-gas-delivery.jpg
│   ├── cleaning.jpg
│   ├── laundry.jpg
│   ├── pest-control.jpg
│   ├── carpentry.jpg
│   ├── painting.jpg
│   ├── moving-relocation.jpg
│   ├── internet-networking.jpg
│   ├── gardening-landscaping.jpg
│   └── more-services.jpg
├── how-it-works/
│   ├── search.jpg
│   ├── compare.jpg
│   └── book.jpg
├── why-mitasafi/
│   ├── verified.jpg
│   ├── pricing.jpg
│   ├── payment.jpg
│   ├── reviews.jpg
│   ├── emergency.jpg
│   └── neighborhood.jpg
└── avatars/
    ├── grace.jpg  ├── david.jpg  ├── wanjiku.jpg
    ├── james.jpg  ├── aisha.jpg  ├── brian.jpg
    ├── peter.jpg  ├── mary.jpg   ├── samuel.jpg
    └── hannah.jpg
```

**Acceptance:** Every URL `https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/services/{path}` returns HTTP 200 with correct content-type.

#### Step 2.9 — Create image constants file

Create `src/components/services-landing/images.ts`:
- Export `SERVICES_IMAGES` constant object mapping every image ID to its full Supabase URL
- Export `SERVICES_BLUR_DATA` constant with base64 blur placeholders for hero + first 4 categories
- This single file is the only place image URLs appear — all components import from here

**Acceptance:** `npx tsc --noEmit` passes. All URLs in the constants file are verified accessible.

---

### SLP-3: ServicesNavbar

**Goal:** Build the dedicated services landing page navigation bar that is sticky, starts transparent over the hero, and transitions to solid white on scroll.

**Effort:** 1–1.5 hours  
**Dependencies:** SLP-1 (route must exist)  
**Output:** `src/components/services-landing/ServicesNavbar.tsx` (~180 lines)

#### Step 3.1 — Build `ServicesNavbar.tsx`

**Type:** Client component (`"use client"` — needs scroll listener + mobile menu toggle)

**Structure per §3 Section 0:**
```
[Logo]  Browse Services | Emergency | For Providers | Pricing     [Login] [Get Started]
```

**Navigation links array:**

| Label | Href | Notes |
|-------|------|-------|
| Browse Services | `/services/browse` | Primary marketplace link |
| Emergency | `/services/browse?available=true&sort=response_time` | Quick filter for urgent needs |
| For Providers | `/service-providers` | Existing provider recruitment page |
| Pricing | `#pricing` | Smooth-scroll anchor to ServicesPricingPreview |
| Log In | `/login` | Auth page |
| Get Started | `/signup` | Generic signup — `buttonVariants({ variant: "brand", size: "sm" })` |

**Scroll behavior:**
- Default (top of page): `bg-transparent text-white` — blends with hero
- After 100px scroll: `bg-white/95 backdrop-blur-md shadow-soft text-gray-900` — solid
- Transition: `transition-all duration-300`
- Use `useEffect` + `addEventListener("scroll", ...)` with a `scrollY > 100` threshold

**Mobile behavior:**
- Hamburger button (three horizontal lines — CSS only, no Lucide icon)
- Opens full-screen overlay with all links stacked vertically
- Close button (× character, not Lucide icon)
- Overlay uses `bg-white` always (not transparent)

**Imports to use:**
- `Logo` from `@/components/ui/Logo`
- `buttonVariants` from `@/components/ui/Button`
- `cn` from `@/lib/utils`
- `Link` from `next/link`

**What NOT to use:**
- No Lucide icons in nav text or buttons
- No `Container` — navbar has its own `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` for edge-to-edge feel

#### Step 3.2 — Add to barrel export

Update `src/components/services-landing/index.ts`: add `export { ServicesNavbar } from "./ServicesNavbar";`

#### Step 3.3 — Wire into page shell

Update `src/app/services/page.tsx`: import `ServicesNavbar` and render it above `<main>`.

**Acceptance:** 
- Navbar renders transparent on page load
- Scrolling 100px+ triggers solid white transition with text color change
- All 6 links are clickable and navigate correctly
- Mobile hamburger toggles the overlay
- `npx tsc --noEmit` passes
- No Lucide icons visible anywhere in the navbar

---

### SLP-4: ServicesHero + ServicesTrustBar

**Goal:** Build the full-bleed hero section with background image, headline, subheadline, search bar, and popular tags. Immediately below, build the 4-stat trust bar.

**Effort:** 2–2.5 hours  
**Dependencies:** SLP-1 (route), SLP-2 (hero-bg image + image constants)  
**Output:** `ServicesHero.tsx` (~250 lines), `ServicesTrustBar.tsx` (~80 lines)

#### Step 4.1 — Build `ServicesHero.tsx`

**Type:** Server component with client island (`ServiceSearchAutocomplete`)

**Layout per §3 Section 1:**
- Full-bleed background: `hero-bg.jpg` via Next.js `<Image>` with `fill`, `priority`, `placeholder="blur"`, `blurDataURL` from image constants
- Gradient overlays: same pattern as rental Hero — `bg-gray-900/60` + directional gradients for text readability
- H1: "Trusted Home Services Across Nairobi" — `text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight`
- Subhead: "Verified professionals. Transparent pricing. Book in minutes, not days." — `text-xl sm:text-2xl text-white/80`
- Search bar: Reuse `<ServiceSearchAutocomplete variant="hero" />` from `@/components/services/ServiceSearchAutocomplete`
- Popular tags: horizontally scrollable chip row — each chip is a `<Link>` to `/services/browse?category={slug}`

**Popular tags list (6 tags):**

| Label | Href |
|-------|------|
| Plumbing | `/services/browse?category=plumbing` |
| Cleaning | `/services/browse?category=cleaning` |
| Electrical | `/services/browse?category=electrical` |
| Moving | `/services/browse?category=moving-relocation` |
| Painting | `/services/browse?category=painting` |
| Laundry | `/services/browse?category=laundry` |

**Tag chip styles:** `bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-full backdrop-blur-sm transition-colors`

**Section height:** `min-h-[600px] lg:min-h-[700px]` with `flex items-center`

**No icons in the headline or subheadline.** No decorative Lucide icons anywhere.

#### Step 4.2 — Build `ServicesTrustBar.tsx`

**Type:** Server component (pure static)

**Layout per §3 Section 2:**
- Horizontal strip: white background, subtle `border-y border-gray-100`
- 4 stats evenly spaced using `Container` + `grid grid-cols-2 lg:grid-cols-4 gap-6 py-8 lg:py-10`
- Each stat: number (`text-2xl sm:text-3xl font-bold text-gray-900`) + label (`text-sm text-gray-500 mt-1`)
- No icons, no decorations

**Stats data (hardcoded for now, will be API-driven):**

| Number | Label |
|--------|-------|
| 700+ | Verified Providers |
| 20+ | Service Categories |
| 4.8★ | Average Rating |
| 50,000+ | Jobs Completed |

#### Step 4.3 — Add both to barrel + wire into page

Update barrel and page shell.

**Acceptance:**
- Hero renders full-bleed with background image visible through overlays
- H1 and subhead are readable against the dark overlay
- Search bar is functional — typing shows autocomplete, submitting navigates to `/services/browse?q=...`
- Popular tags render as horizontally scrollable chips on mobile
- Trust bar shows 4 stats in a clean row (2×2 on mobile)
- `npx tsc --noEmit` passes

---

### SLP-5: ServicesCategoryGrid

**Goal:** Build the 12-card category grid with photography-based cards, a "+8 more" card, and a "Browse All Services" CTA.

**Effort:** 1.5–2 hours  
**Dependencies:** SLP-1, SLP-2 (category images)  
**Output:** `ServicesCategoryGrid.tsx` (~200 lines)

#### Step 5.1 — Define category data constant

Within the component file (or in a shared `data.ts` if preferred), define the 12 primary categories + 8 extended categories:

**Primary (visible on grid):**

| Order | Name | Slug | Image (from `SERVICES_IMAGES`) |
|:-----:|------|------|---------------------------------|
| 1 | Plumbing | `plumbing` | `categories.plumbing` |
| 2 | Electrical | `electrical` | `categories.electrical` |
| 3 | Water & Gas Delivery | `water-gas-delivery` | `categories.waterGasDelivery` |
| 4 | Cleaning | `cleaning` | `categories.cleaning` |
| 5 | Laundry | `laundry` | `categories.laundry` |
| 6 | Pest Control | `pest-control` | `categories.pestControl` |
| 7 | Carpentry | `carpentry` | `categories.carpentry` |
| 8 | Painting | `painting` | `categories.painting` |
| 9 | Moving & Relocation | `moving-relocation` | `categories.movingRelocation` |
| 10 | Internet & Networking | `internet-networking` | `categories.internetNetworking` |
| 11 | Gardening & Landscaping | `gardening-landscaping` | `categories.gardeningLandscaping` |
| 12 | More Services | — | `categories.moreServices` |

**Extended (behind the "More" card):** Garbage & Junk Removal, IT & Tech Support, Welding & Metal Works, Glass & Aluminium Works, Beauty (Home Services), Events & Planning, Childcare & Home Care, Taxi & Rides, Shopping Assistance — each with its slug from §9.

#### Step 5.2 — Build the component

**Type:** Client component (`"use client"` — needs state for "More" dropdown/modal toggle and mobile "show more")

**Design per §3 Section 3:**
- Section: `bg-gray-50` with `SectionHeader` — eyebrow: "Services", title: "What Do You Need Help With?", description: "Browse our most popular service categories or search for exactly what you need."
- Grid: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6`
- Card (first 11): `<Link href={/services/browse?category=${slug}}>` → aspect-ratio 4:3, photo fill + dark bottom gradient overlay + text overlay (name bold white, provider count white/80)
- Card hover: `scale-[1.02] shadow-medium` transition
- Card 12 ("More"): on click, opens a dropdown listing the 8 extended categories with links
- Mobile: Show 8 cards initially + "Show more" button that reveals remaining 4
- Bottom CTA: "Browse All Services →" → `/services/browse` — `buttonVariants({ variant: "secondary" })`

**No Lucide icons on any card.** Photography only.

#### Step 5.3 — Add to barrel + wire into page

**Acceptance:**
- 12 cards render in 4-col grid on desktop, 3-col on tablet, 2-col on mobile
- Clicking any category card navigates to correct `/services/browse?category=...` URL
- "More" card opens dropdown with 8 additional categories
- Mobile "show more" reveals hidden cards
- Provider count text visible on each card
- `npx tsc --noEmit` passes

---

### SLP-6: ServicesHowItWorks

**Goal:** Build the 3-step process visualization with images and step connectors.

**Effort:** 1–1.5 hours  
**Dependencies:** SLP-1, SLP-2 (how-it-works images)  
**Output:** `ServicesHowItWorks.tsx` (~150 lines)

#### Step 6.1 — Build the component

**Type:** Server component (pure static)

**Layout per §3 Section 4:**
- White background (`bg-white`)
- `SectionHeader` — title: "How It Works", description: "Get professional help in 3 simple steps"
- 3 cards in a row (`grid lg:grid-cols-3 gap-8 lg:gap-12`)
- Each card: image top (rounded, 4:3 aspect), step number watermark (`text-7xl font-bold text-brand-100 absolute -top-4 -left-2`), step title below (`text-xl font-semibold text-gray-900`), description (`text-base text-gray-600`)
- Desktop connectors: dashed SVG lines or CSS `border-dashed` between cards
- Mobile: vertical stack, step numbers as timeline circles connected by a vertical dashed line

**Steps data:**

| # | Title | Description | Image |
|---|-------|-------------|-------|
| 1 | Search & Discover | Find the right service provider by category, area, or keyword. Compare profiles, ratings, and prices. | `howItWorks.search` |
| 2 | Compare & Choose | Read verified reviews, compare quotes from multiple providers, and pick the best match for your needs and budget. | `howItWorks.compare` |
| 3 | Book & Pay Securely | Confirm your booking, pay via M-Pesa with escrow protection, and get the job done right. | `howItWorks.book` |

- Bottom CTA: "Find a Provider →" → `/services/browse` — `buttonVariants({ variant: "brand" })`

**Acceptance:**
- 3 cards render with images, step numbers, titles, descriptions
- Desktop shows horizontal layout with connectors
- Mobile shows vertical timeline layout
- CTA navigates to `/services/browse`
- `npx tsc --noEmit` passes

---

### SLP-7: ServicesFeaturedProviders

**Goal:** Build the featured providers section with server-side data fetching and graceful fallback when the database is empty.

**Effort:** 1.5–2 hours  
**Dependencies:** SLP-1  
**Output:** `ServicesFeaturedProviders.tsx` (~250 lines)

#### Step 7.1 — Create data fetching function

In the component file (or `src/lib/services/featured.ts`), create:

```typescript
async function getFeaturedProviders(limit = 6) {
  // Query service_providers table
  // JOIN with profiles for display_name and avatar
  // WHERE is_verified = true AND status = 'active'
  // ORDER BY (average_rating * LOG(total_reviews + 1)) DESC
  // LIMIT {limit}
  // Returns: { id, displayName, avatarUrl, averageRating, totalReviews, primaryCategory, area, startingPrice, isVerified }[]
}
```

**Fallback:** If the query returns empty or fails, the component renders a "Coming Soon" state — 3 skeleton cards with a branded overlay message: "We're onboarding top providers. Check back soon!"

#### Step 7.2 — Build the component

**Type:** Server component (async — does server-side fetch)

**Layout per §3 Section 5:**
- Background: `bg-gray-50`
- `SectionHeader` — title: "Top-Rated Providers", description: "Trusted by thousands of Nairobi homeowners"
- Card grid: `grid sm:grid-cols-2 lg:grid-cols-3 gap-6`
- Card design: white card, subtle shadow, provider circular photo (80×80, green verified dot), name + rating stars + review count, service category, area, starting price, "View Profile" button
- Mobile: horizontal scroll showing 1.5 cards visible
- "View Profile" → `/services/provider/{id}`
- Bottom CTA: "Browse All Providers →" → `/services/browse`

**Styling details:**
- Rating display: "4.9 ★ (48 reviews)" — text only, not Lucide Star icons
- Verified badge: a small `bg-success-500 w-4 h-4 rounded-full border-2 border-white` positioned absolute on the avatar
- Price format: "From KES 1,500" — `text-lg font-semibold`

#### Step 7.3 — Add to barrel + wire into page

**Acceptance:**
- When DB has providers: 3 cards shown (desktop), real data displayed
- When DB is empty: "Coming Soon" fallback renders cleanly
- Provider card links navigate to correct profiles
- No Lucide icons used (✓ characters, text-only stars)
- `npx tsc --noEmit` passes

---

### SLP-8: ServicesWhyMitaSafi + ServicesAreaCoverage

**Goal:** Build the 6-pillar value proposition grid and the Nairobi area coverage chip grid.

**Effort:** 1.5–2 hours  
**Dependencies:** SLP-1, SLP-2 (why-mitasafi images)  
**Output:** `ServicesWhyMitaSafi.tsx` (~180 lines), `ServicesAreaCoverage.tsx` (~150 lines)

#### Step 8.1 — Build `ServicesWhyMitaSafi.tsx`

**Type:** Server component (pure static)

**Layout per §3 Section 6:**
- White background
- `SectionHeader` — title: "Why Nairobi Trusts MitaSafi"
- 6-card grid: `grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8`
- Each card: image top (16:9, rounded-xl), title + description below
- No Lucide icons — photography only communicates concepts

**Pillar data (from §3):**

| # | Title | Description | Image Key |
|---|-------|-------------|-----------|
| 1 | Verified Professionals | Every provider is ID-verified and background-checked before they can accept jobs. | `whyMitaSafi.verified` |
| 2 | Transparent Pricing | See price ranges before you book. Compare quotes from multiple providers. No surprises. | `whyMitaSafi.pricing` |
| 3 | Secure Payments | Pay through M-Pesa with built-in escrow. Money is released only after you confirm completion. | `whyMitaSafi.payment` |
| 4 | Real Reviews | Read honest reviews from verified customers. Multi-dimensional ratings cover quality, timeliness, and value. | `whyMitaSafi.reviews` |
| 5 | Emergency Ready | Burst pipe at midnight? Get a provider within hours, not days. Emergency services available 24/7. | `whyMitaSafi.emergency` |
| 6 | Your Neighborhood | Find providers who already serve your area. Kilimani, Westlands, South B, Karen — all covered. | `whyMitaSafi.neighborhood` |

#### Step 8.2 — Build `ServicesAreaCoverage.tsx`

**Type:** Server component (pure static)

**Layout per §3 Section 7:**
- Background: `bg-gray-50`
- `SectionHeader` — title: "We Cover All of Nairobi", description: "Find service providers in your neighborhood"
- Area chips grouped by region using `AREA_GROUPS` from `@/lib/constants`:
  - Central & West: Westlands, Kilimani, Lavington, Kileleshwa, Parklands, Upper Hill
  - South: South B, South C, Langata, Karen
  - North & East: Ruaka, Ruiru
- Each chip: `<Link href={/services/browse?area=${encodeURIComponent(area)}}>` with styles `border border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50 text-gray-700 hover:text-brand-700 px-4 py-2 rounded-full text-sm font-medium transition-colors`
- Below chips: "+ 30 more neighborhoods across Greater Nairobi" — `text-sm text-gray-500`
- CTA: "Search Your Area →" — smooth-scrolls to hero search (uses `href="#hero"` or click handler)
- Region group headers: `text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3`

#### Step 8.3 — Add both to barrel + wire into page

**Acceptance:**
- WhyMitaSafi shows 6 pillars in 3-col (desktop), 2-col (tablet), 1-col (mobile)
- All 6 images load correctly from Supabase
- AreaCoverage shows area chips grouped by region
- Clicking any area chip navigates to `/services/browse?area=...`
- No Lucide icons anywhere
- `npx tsc --noEmit` passes

---

### SLP-9: ServicesPricingPreview

**Goal:** Build the transparent pricing section showing price ranges by service category.

**Effort:** 1–1.5 hours  
**Dependencies:** SLP-1  
**Output:** `ServicesPricingPreview.tsx` (~200 lines)

#### Step 9.1 — Build the component

**Type:** Server component (initially hardcoded data)

**Layout per §3 Section 8:**
- White background
- `SectionHeader` — title: "Transparent Pricing", description: "Know what to expect before you book"
- Desktop: clean `<table>` layout — Category | Starting From | Typical Range | Action
- Mobile: stacked cards — each showing category name, price range, "View" link
- Section `id="pricing"` — anchor target for navbar "Pricing" link

**Pricing data (from §3, hardcoded from Constitution):**

| Category | Starting From | Typical Range | Slug |
|----------|:------------:|:------------:|------|
| Plumbing | KES 500 | KES 500 – 5,000 | `plumbing` |
| Electrical | KES 800 | KES 800 – 8,000 | `electrical` |
| Cleaning | KES 1,500 | KES 1,500 – 6,000 | `cleaning` |
| Moving & Relocation | KES 3,000 | KES 3,000 – 25,000 | `moving-relocation` |
| Painting | KES 2,000 | KES 2,000 – 15,000 | `painting` |
| Carpentry | KES 1,000 | KES 1,000 – 10,000 | `carpentry` |
| Laundry | KES 300 | KES 300 – 2,000 | `laundry` |
| Pest Control | KES 2,500 | KES 2,500 – 8,000 | `pest-control` |
| Water & Gas Delivery | KES 200 | KES 200 – 3,000 | `water-gas-delivery` |
| Internet & Networking | KES 1,000 | KES 1,000 – 5,000 | `internet-networking` |
| Gardening & Landscaping | KES 1,500 | KES 1,500 – 8,000 | `gardening-landscaping` |
| Welding & Metal Works | KES 2,000 | KES 2,000 – 20,000 | `welding-metal-works` |

- "View" link on each row → `/services/browse?category={slug}`
- Disclaimer: "Prices vary by scope, location, and provider experience. All quotes are free and non-binding." — `text-sm text-gray-500`
- Bottom CTA: "Get a Free Quote →" → `/services/browse`

**Table styling:**
- Header: `text-xs font-semibold uppercase tracking-wider text-gray-400`
- Row: `hover:bg-gray-50 transition-colors`, `border-b border-gray-100`
- Price numbers: `font-semibold text-gray-900 tabular-nums`
- No icons anywhere

**Acceptance:**
- Desktop shows clean table, mobile shows stacked cards
- All "View" links navigate correctly
- `id="pricing"` works as anchor from navbar
- `npx tsc --noEmit` passes

---

### SLP-10: ServicesTestimonials

**Goal:** Build the tabbed testimonial section with customer and provider perspectives.

**Effort:** 1.5–2 hours  
**Dependencies:** SLP-1, SLP-2 (avatar images)  
**Output:** `ServicesTestimonials.tsx` (~220 lines)

#### Step 10.1 — Build the component

**Type:** Client component (`"use client"` — needs tab switching state + optional carousel)

**Layout per §3 Section 9:**
- Background: `bg-gray-50`
- `SectionHeader` — title: "What People Are Saying"
- Tab strip: "From Customers" (default) / "From Providers" — proper `role="tablist"`, `role="tab"`, `role="tabpanel"` ARIA
- Tab button styles: active = `border-b-2 border-brand-600 text-brand-700 font-semibold`, inactive = `text-gray-500 hover:text-gray-700`
- Card grid: `grid sm:grid-cols-2 gap-6` (shows 2 cards at a time)
- Card: quote text in `text-lg italic text-gray-700 leading-relaxed`, followed by avatar (48px circular) + name + area + rating
- Mobile: single card with horizontal swipe (optional — can start with stacked cards)

**Customer testimonials (6 — from §3):**
Grace M./Kilimani/Plumbing, David O./Westlands/Cleaning, Wanjiku K./South B/Electrical, James N./Karen/Moving, Aisha M./Langata/Painting, Brian W./Parklands/Pest Control

**Provider testimonials (4 — from §3):**
Peter K./Plumber, Mary W./Cleaner, Samuel O./Electrician, Hannah N./Interior Designer

**Avatar images:** from `SERVICES_IMAGES.avatars.{name}`

**Rating display:** "★★★★★" — text characters, not Lucide icons

**Accessibility:**
- `role="tablist"` on tab container
- `role="tab"` + `aria-selected` on each tab button
- `role="tabpanel"` + `aria-labelledby` on each panel
- Arrow key navigation between tabs

**Acceptance:**
- Default tab shows customer testimonials
- Clicking "From Providers" tab switches to provider testimonials
- Avatar images load correctly
- Tab switching is keyboard accessible (arrow keys, Enter/Space)
- ARIA roles correctly applied
- `npx tsc --noEmit` passes

---

### SLP-11: ServicesProviderCTA + ServicesFinalCTA

**Goal:** Build the provider recruitment banner and the final dual-path CTA section.

**Effort:** 1–1.5 hours  
**Dependencies:** SLP-1, SLP-2 (provider-cta image)  
**Output:** `ServicesProviderCTA.tsx` (~120 lines), `ServicesFinalCTA.tsx` (~100 lines)

#### Step 11.1 — Build `ServicesProviderCTA.tsx`

**Type:** Server component (pure static)

**Layout per §3 Section 10:**
- Brand teal background (`bg-brand-600`) with subtle gradient: `bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500`
- Two-column layout: left = provider photo (portrait, rounded-2xl), right = text + benefits + CTAs
- Title: "Are You a Service Provider?" — `text-3xl sm:text-4xl font-bold text-white`
- Subtitle: "Join Kenya's fastest-growing home services marketplace." — `text-xl text-white/80`
- Benefits list (4 items, using `✓` character — NOT icons):
  - ✓ Free to join
  - ✓ Set your own rates
  - ✓ Secure payments via M-Pesa
  - ✓ Build your reputation with verified reviews
- Primary CTA: "Join as Provider →" → `/signup?role=provider` — `buttonVariants({ variant: "white", size: "lg" })`
- Secondary CTA: "Learn More" → `/service-providers` — `outline text-white border-white/30 hover:bg-white/10`
- Mobile: stack — image on top, text below

#### Step 11.2 — Build `ServicesFinalCTA.tsx`

**Type:** Server component (pure static)

**Layout per §3 Section 12:**
- Brand gradient background: `bg-gradient-to-br from-brand-700 to-brand-600`
- Centered text: "Ready to Get Started?" — `text-3xl sm:text-4xl lg:text-5xl font-bold text-white`
- Two buttons side by side:
  - "Find a Provider" → `/services/browse` — `buttonVariants({ variant: "white", size: "lg" })`
  - "Join as Provider" → `/signup?role=provider` — outline white button
- Below buttons: "Already have an account? [Log in →](/login)" — `text-sm text-white/70` with `text-white font-medium` on the link
- Mobile: buttons stack vertically

#### Step 11.3 — Add both to barrel + wire into page

**Acceptance:**
- Provider CTA: photo renders left-aligned, benefits use ✓ character (not icons), both CTAs navigate correctly
- Final CTA: centered, gradient background, both buttons work, login link works
- Mobile layouts stack correctly
- `npx tsc --noEmit` passes

---

### SLP-12: ServicesFAQ

**Goal:** Build the accordion FAQ section with JSON-LD structured data for Google rich snippets.

**Effort:** 1–1.5 hours  
**Dependencies:** SLP-1  
**Output:** `ServicesFAQ.tsx` (~200 lines)

#### Step 12.1 — Build the component

**Type:** Client component (`"use client"` — needs accordion open/close state)

**Layout per §3 Section 11:**
- White background
- `SectionHeader` — title: "Frequently Asked Questions"
- Accordion: 8 questions per §3 table, max-width centered (`max-w-3xl mx-auto`)
- Each question: `<button>` with `aria-expanded`, `aria-controls` linking to answer panel
- Open/close indicator: `+` / `−` text character (NOT Lucide icon) — right-aligned
- Question styling: `text-lg font-medium text-gray-900 text-left flex-1`
- Answer styling: `text-base text-gray-600 leading-relaxed pb-4`
- Divider: `border-b border-gray-100` between items
- Smooth expand/collapse animation: `max-height` transition or `grid-rows` animation

**FAQ data (8 questions from §3):**

| # | Question |
|---|----------|
| 1 | How do I find a service provider? |
| 2 | How much do services cost? |
| 3 | Are providers verified? |
| 4 | How do payments work? |
| 5 | What if I'm not satisfied? |
| 6 | Can I book emergency services? |
| 7 | How do I become a service provider? |
| 8 | Is there a fee to join as a provider? |

(Full answers per §3 Section 11 table)

#### Step 12.2 — Add FAQPage JSON-LD

Inject `<script type="application/ld+json">` with the FAQPage schema. Can be:
- Rendered inline in the component (simple)
- Or injected via Next.js `<Script>` in the page

**JSON-LD structure:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I find a service provider?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Search by service type or browse categories..."
      }
    }
    // ... 7 more
  ]
}
```

#### Step 12.3 — Add to barrel + wire into page

**Acceptance:**
- All 8 questions render collapsed
- Clicking a question expands its answer with smooth animation
- Clicking again collapses it
- Multiple questions can be open simultaneously (independent toggles)
- `+`/`−` indicators toggle correctly
- `aria-expanded` updates correctly
- JSON-LD is valid (test with Google Rich Results Test)
- `npx tsc --noEmit` passes

---

### SLP-13: Page Assembly & Section Ordering

**Goal:** Assemble all 13 sections in the correct order in the page file, with proper spacing, background alternation, and JSON-LD blocks.

**Effort:** 0.5–1 hour  
**Dependencies:** SLP-3 through SLP-12  
**Output:** Updated `src/app/services/page.tsx`

#### Step 13.1 — Assemble the page

Final section order in `src/app/services/page.tsx`:

```tsx
import { ServicesNavbar } from "@/components/services-landing/ServicesNavbar";
import { ServicesHero } from "@/components/services-landing/ServicesHero";
import { ServicesTrustBar } from "@/components/services-landing/ServicesTrustBar";
import { ServicesCategoryGrid } from "@/components/services-landing/ServicesCategoryGrid";
import { ServicesHowItWorks } from "@/components/services-landing/ServicesHowItWorks";
import { ServicesFeaturedProviders } from "@/components/services-landing/ServicesFeaturedProviders";
import { ServicesWhyMitaSafi } from "@/components/services-landing/ServicesWhyMitaSafi";
import { ServicesAreaCoverage } from "@/components/services-landing/ServicesAreaCoverage";
import { ServicesPricingPreview } from "@/components/services-landing/ServicesPricingPreview";
import { ServicesTestimonials } from "@/components/services-landing/ServicesTestimonials";
import { ServicesProviderCTA } from "@/components/services-landing/ServicesProviderCTA";
import { ServicesFAQ } from "@/components/services-landing/ServicesFAQ";
import { ServicesFinalCTA } from "@/components/services-landing/ServicesFinalCTA";
import { Footer } from "@/components/landing/Footer";

// Section 0:  ServicesNavbar (outside main, sticky)
// Section 1:  ServicesHero
// Section 2:  ServicesTrustBar
// Section 3:  ServicesCategoryGrid         bg-gray-50
// Section 4:  ServicesHowItWorks           bg-white
// Section 5:  ServicesFeaturedProviders    bg-gray-50
// Section 6:  ServicesWhyMitaSafi          bg-white
// Section 7:  ServicesAreaCoverage         bg-gray-50
// Section 8:  ServicesPricingPreview       bg-white      id="pricing"
// Section 9:  ServicesTestimonials         bg-gray-50
// Section 10: ServicesProviderCTA          bg-brand-600 gradient
// Section 11: ServicesFAQ                 bg-white
// Section 12: ServicesFinalCTA            bg-brand-700 gradient
// Section 13: Footer
```

#### Step 13.2 — Add all JSON-LD blocks

Ensure the page includes:
1. WebPage + SearchAction (from SLP-1)
2. ProfessionalService/LocalBusiness
3. FAQPage (from SLP-12 — may already be in the FAQ component)

#### Step 13.3 — Add skip-to-content link

At the very top of the page (before navbar): `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg">Skip to main content</a>`

And `<main id="main-content">` wrapping the content sections.

**Acceptance:**
- All 14 sections render in correct order
- Background colors alternate correctly per §7 table
- Scroll through the entire page — no visual gaps, no overlapping
- Skip-to-content link works (Tab key → Enter → focus jumps to main content)
- All 3 JSON-LD blocks present in page source
- `npx tsc --noEmit` passes

---

### SLP-14: SEO, Accessibility & Performance Audit

**Goal:** Run a comprehensive audit against every requirement in §5, §11, and §12. Fix any issues found.

**Effort:** 1–2 hours  
**Dependencies:** SLP-13 (full page assembled)

#### Step 14.1 — Heading hierarchy audit

| Check | Expected |
|-------|----------|
| Single H1 | "Trusted Home Services Across Nairobi" (Hero only) |
| H2s sequential | One per section, no skipped levels |
| No orphan H3s | Every H3 is under an H2 |
| No H4+ | Not used on this page |

**Action:** Render the page, inspect DOM, confirm heading tree.

#### Step 14.2 — ARIA audit

| Component | Check |
|-----------|-------|
| ServicesNavbar | `<nav aria-label="Services navigation">` |
| Hero search | `role="search"`, `aria-label`, `aria-autocomplete` on input |
| Popular tags | `<nav aria-label="Popular service categories">` wrapping the chips |
| Category grid | Cards are `<a>` with descriptive text |
| FAQ accordion | `aria-expanded`, `aria-controls`, unique IDs |
| Testimonial tabs | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-labelledby` |
| Area coverage | `<nav aria-label="Service areas">` wrapping chips |
| Skip link | Present and functional |

#### Step 14.3 — Performance audit

| Metric | Target | Check |
|--------|--------|-------|
| LCP | < 2.5s | Hero image has `priority`, preloaded |
| CLS | < 0.1 | All images have width/height or `fill` with sized container |
| JS bundle | < 50KB first load | Check with `next build` → `.next/analyze` or devtools |
| Lazy loading | All below-fold images | Confirm no `priority` on non-hero images |
| Server components | 10 of 13 sections | Verify only Navbar, Testimonials, FAQ, CategoryGrid are client |

#### Step 14.4 — SEO audit

| Check | Method |
|-------|--------|
| `<title>` correct | View source of `/services` |
| Meta description present | View source |
| Canonical URL set | View source for `<link rel="canonical">` |
| OG tags complete | View source for `og:title`, `og:description`, `og:image`, `og:url` |
| JSON-LD valid | Paste into Google Rich Results Test |
| Robots index/follow | View source for meta robots or `robots.txt` |

#### Step 14.5 — Fix all issues found

Document and fix every issue from steps 14.1–14.4.

**Acceptance:**
- Zero heading hierarchy violations
- All ARIA requirements satisfied
- LCP target met (or documented reason if not — e.g., image CDN latency)
- JSON-LD validates in Google Rich Results Test
- `npx tsc --noEmit` passes

---

### SLP-15: Cross-Site Link Integration & Final Wiring

**Goal:** Wire the services landing page into the rest of the site — navbar, footer, homepage cross-links, and update any remaining internal references.

**Effort:** 1–1.5 hours  
**Dependencies:** SLP-14 (page fully built and audited)

#### Step 15.1 — Add "Services" link to the main site Navbar

**File:** `src/components/landing/Navbar.tsx`

Current `navLinks` array (line ~14):
```typescript
const navLinks = [
  { label: "Browse Homes", href: "/properties" },
  { label: "For Landlords", href: "/landlords" },
  { label: "For Providers", href: "/service-providers" },
  { label: "How It Works", href: "/#how-it-works" },
];
```

Update to:
```typescript
const navLinks = [
  { label: "Browse Homes", href: "/properties" },
  { label: "Services", href: "/services" },
  { label: "For Landlords", href: "/landlords" },
  { label: "For Providers", href: "/service-providers" },
  { label: "How It Works", href: "/#how-it-works" },
];
```

#### Step 15.2 — Verify Footer has services links

**File:** `src/components/landing/Footer.tsx`

Check the "Product" section for a "Home Services" or "Services" link. If absent, add:
```typescript
{ label: "Home Services", href: "/services" }
```

#### Step 15.3 — Update homepage cross-links

Check these homepage landing components for links that should point to `/services` (the new landing) vs `/services/browse` (the marketplace):

| Component | Current Link | Should Link To |
|-----------|-------------|---------------|
| `PopularServicesSection.tsx` | "Explore All Services" → `/services` | `/services/browse` (already updated in SLP-1) or `/services` (landing) — **Decision: keep as `/services/browse`** since this section previews specific services |
| `ServiceDiscoverySection.tsx` | "Browse All Services" → `/services` | `/services/browse` (already updated in SLP-1) |
| `ServiceCategoriesShowcase.tsx` | Category links → `/services?category=...` | `/services/browse?category=...` (already updated in SLP-1) |

#### Step 15.4 — Final link registry verification

For every link in §4 "Complete Link Registry":
1. Navigate to the link destination
2. Verify it loads (HTTP 200, no 404)
3. Verify it shows the expected content

**Links that will 404 (known/expected):**
- `/services/browse?available=true&sort=response_time` — "Emergency" nav link — depends on marketplace supporting these params
- Footer placeholder links (`/about`, `/blog`, etc.) — known from LP analysis, separate milestone

#### Step 15.5 — Final TypeScript compilation + visual QA

| Check | Command / Action |
|-------|-----------------|
| TypeScript | `npx tsc --noEmit` — zero errors |
| Full page render | Navigate to `/services` — all 14 sections visible |
| Mobile QA | Chrome DevTools → iPhone 12 Pro viewport → scroll entire page |
| Tablet QA | Chrome DevTools → iPad viewport → scroll entire page |
| Desktop QA | Full-width browser → scroll entire page |
| Hero image | Loads quickly, no flash of unstyled content |
| Search bar | Type a query → autocomplete appears → submit → lands on `/services/browse?q=...` |
| Category click | Click any category card → lands on `/services/browse?category=...` |
| Provider click | Click "View Profile" → lands on `/services/provider/{id}` |
| Area chip click | Click any area → lands on `/services/browse?area=...` |
| FAQ expand | Click question → answer expands with animation |
| Tab switch | Click "From Providers" → testimonials switch |
| Navbar scroll | Scroll down → navbar transitions from transparent to solid |
| Mobile menu | Tap hamburger → menu opens → links work → close works |
| All CTAs | Every button/link navigates to its documented destination |

**Acceptance:** All checks pass. The services landing page is production-ready.

---

### Milestone Summary & Execution Order

```
                                    ┌──────────┐
                                    │  SLP-1   │ Route Migration
                                    │  (1-2h)  │ & Infrastructure
                                    └────┬─────┘
                                         │
                    ┌────────────────────┬┴──────────────────────┐
                    │                    │                       │
               ┌────▼─────┐       ┌─────▼─────┐         ┌──────▼──────┐
               │  SLP-2   │       │  SLP-3    │         │  SLP-5      │
               │  Images  │       │  Navbar   │         │  Category   │
               │  (2-3h)  │       │  (1-1.5h) │         │  Grid       │
               └────┬─────┘       └─────┬─────┘         │  (1.5-2h)  │
                    │                    │               └──────┬──────┘
                    │              ┌─────▼─────┐               │
                    └──────────────► SLP-4     │◄──────────────┘
                                   │  Hero +   │
                                   │  TrustBar │
                                   │  (2-2.5h) │
                                   └─────┬─────┘
                                         │
          ┌──────────────────── ─────────┬┴──────────────────────┐
          │                              │                       │
    ┌─────▼─────┐                 ┌──────▼──────┐        ┌──────▼──────┐
    │  SLP-6    │                 │  SLP-7      │        │  SLP-8      │
    │  HowIt   │                 │  Featured   │        │  Why + Area │
    │  Works   │                 │  Providers  │        │  (1.5-2h)   │
    │  (1-1.5h)│                 │  (1.5-2h)   │        └──────┬──────┘
    └─────┬─────┘                └──────┬──────┘               │
          │                             │                      │
          │     ┌───────────────────────┴──────────────────────┘
          │     │
    ┌─────▼─────▼──┐     ┌──────────┐     ┌──────────┐
    │   SLP-9      │     │ SLP-10   │     │ SLP-11   │
    │   Pricing    │     │ Testim.  │     │ Provider │
    │   (1-1.5h)   │     │ (1.5-2h) │     │ + Final  │
    └──────┬───────┘     └────┬─────┘     │ CTA      │
           │                  │           │ (1-1.5h) │
           │                  │           └────┬─────┘
           │                  │                │
     ┌─────▼──────────────────▼────────────────▼─────┐
     │              SLP-12: FAQ (1-1.5h)              │
     └─────────────────────┬─────────────────────────-┘
                           │
     ┌─────────────────────▼─────────────────────────┐
     │          SLP-13: Page Assembly (0.5-1h)        │
     └─────────────────────┬─────────────────────────-┘
                           │
     ┌─────────────────────▼─────────────────────────┐
     │     SLP-14: SEO, A11y & Performance (1-2h)    │
     └─────────────────────┬─────────────────────────-┘
                           │
     ┌─────────────────────▼─────────────────────────┐
     │      SLP-15: Link Integration & Final QA      │
     │                  (1-1.5h)                      │
     └───────────────────────────────────────────────-┘
```

### Summary Table

| # | Milestone | Components Built | Effort | Depends On |
|:-:|-----------|-----------------|:------:|:----------:|
| **SLP-1** | Route Migration & Infrastructure | Page shell, barrel file | 1–2h | — |
| **SLP-2** | Image Generation & Upload | `images.ts` constants file | 2–3h | — (parallel) |
| **SLP-3** | ServicesNavbar | `ServicesNavbar.tsx` | 1–1.5h | SLP-1 |
| **SLP-4** | Hero + Trust Bar | `ServicesHero.tsx`, `ServicesTrustBar.tsx` | 2–2.5h | SLP-1, SLP-2 |
| **SLP-5** | Category Grid | `ServicesCategoryGrid.tsx` | 1.5–2h | SLP-1, SLP-2 |
| **SLP-6** | How It Works | `ServicesHowItWorks.tsx` | 1–1.5h | SLP-2 |
| **SLP-7** | Featured Providers | `ServicesFeaturedProviders.tsx` | 1.5–2h | SLP-1 |
| **SLP-8** | Why MitaSafi + Area Coverage | `ServicesWhyMitaSafi.tsx`, `ServicesAreaCoverage.tsx` | 1.5–2h | SLP-1, SLP-2 |
| **SLP-9** | Pricing Preview | `ServicesPricingPreview.tsx` | 1–1.5h | SLP-1 |
| **SLP-10** | Testimonials | `ServicesTestimonials.tsx` | 1.5–2h | SLP-2 |
| **SLP-11** | Provider CTA + Final CTA | `ServicesProviderCTA.tsx`, `ServicesFinalCTA.tsx` | 1–1.5h | SLP-1, SLP-2 |
| **SLP-12** | FAQ | `ServicesFAQ.tsx` | 1–1.5h | SLP-1 |
| **SLP-13** | Page Assembly | Updated `page.tsx` | 0.5–1h | SLP-3 – SLP-12 |
| **SLP-14** | SEO, A11y & Performance Audit | — (fixes only) | 1–2h | SLP-13 |
| **SLP-15** | Link Integration & Final QA | `Navbar.tsx`, `Footer.tsx` updates | 1–1.5h | SLP-14 |
| | **TOTAL** | **14 components + 1 page** | **19–27h** | |

### Recommended Execution Sequence (Optimal Path)

For a single developer working sequentially:

```
Day 1:  SLP-1 (route)  →  SLP-2 (images)  →  SLP-3 (navbar)
Day 2:  SLP-4 (hero + trust)  →  SLP-5 (categories)  →  SLP-6 (how it works)
Day 3:  SLP-7 (providers)  →  SLP-8 (why + areas)  →  SLP-9 (pricing)
Day 4:  SLP-10 (testimonials)  →  SLP-11 (CTAs)  →  SLP-12 (FAQ)
Day 5:  SLP-13 (assembly)  →  SLP-14 (audit)  →  SLP-15 (integration + QA)
```

**For parallel work (two developers):**
- Dev A: SLP-1 → SLP-3 → SLP-4 → SLP-5 → SLP-6 → SLP-7 → SLP-13
- Dev B: SLP-2 → SLP-8 → SLP-9 → SLP-10 → SLP-11 → SLP-12 → SLP-14 → SLP-15

---

## 16. File Structure

### New Files

```
src/
├── app/
│   └── services/
│       ├── page.tsx                          ← NEW: Services landing page
│       ├── browse/                           ← MOVED: Current marketplace
│       │   ├── page.tsx                      ← Was: services/page.tsx
│       │   ├── mobile-filter-button.tsx      ← Was: services/mobile-filter-button.tsx
│       │   └── quick-filter-toggle.tsx       ← Was: services/quick-filter-toggle.tsx
│       ├── provider/                         ← UNCHANGED
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── request/page.tsx
│       └── providers/                        ← UNCHANGED
│           └── [id]/
└── components/
    └── services-landing/                     ← NEW: All landing components
        ├── index.ts
        ├── ServicesNavbar.tsx
        ├── ServicesHero.tsx
        ├── ServicesTrustBar.tsx
        ├── ServicesCategoryGrid.tsx
        ├── ServicesHowItWorks.tsx
        ├── ServicesFeaturedProviders.tsx
        ├── ServicesWhyMitaSafi.tsx
        ├── ServicesAreaCoverage.tsx
        ├── ServicesPricingPreview.tsx
        ├── ServicesTestimonials.tsx
        ├── ServicesProviderCTA.tsx
        ├── ServicesFAQ.tsx
        └── ServicesFinalCTA.tsx
```

### Modified Files

| File | Change |
|------|--------|
| `src/components/landing/Navbar.tsx` | Add "Services" nav link |
| `src/components/landing/Footer.tsx` | Ensure services links present |
| `src/components/landing/PopularServicesSection.tsx` | Update hrefs from `/services?` → `/services/browse?` |
| `src/components/landing/ServiceCategoriesShowcase.tsx` | Update hrefs from `/services?` → `/services/browse?` |
| `src/components/services/CategoryQuickNav.tsx` | Update hrefs if needed |
| `src/components/services/SuggestedTags.tsx` | Update hrefs if needed |
| `src/app/page.tsx` | No change (homepage stays as-is) |

---

## 17. Competitor Analysis & Design Inspiration

### Design References

| Company | What to Learn | Application |
|---------|--------------|-------------|
| **Uber** | Clean hero with single search input, minimal decoration, photography-focused | Hero search bar simplicity, full-bleed imagery |
| **Airbnb** | Category chips below hero, photography-driven cards, trust signals | Category grid design, provider card layout |
| **Amazon Home Services** | Service category grid, price transparency, review integration | Pricing table, review excerpt display |
| **TaskRabbit** | How-it-works 3-step, area coverage, provider profiles | Process steps, area chips, provider card structure |
| **Thumbtack** | Price ranges by category, instant booking, search-first UX | Pricing preview section, search bar behavior |
| **Fiverr** | Category showcase strip, popular services carousel, seller cards | Category navigation, horizontal scroll patterns |

### Anti-Patterns to Avoid

| What NOT to Do | Why | What to Do Instead |
|----------------|-----|-------------------|
| Icon-heavy sections | Looks amateur, breaks at scale | Photography-only for visual communication |
| Animated counters | Gimmicky, hurts performance | Static bold numbers |
| Gradient text | Hard to read, dated trend | Solid `text-gray-900` or `text-white` |
| Parallax scrolling | Performance hit, motion sickness | Clean scroll, subtle fade-in |
| Modal pop-ups on load | Hostile UX, blocks content | Inline CTAs within the flow |
| "How It Works" with 6+ steps | Too complex, users won't read | Exactly 3 steps |
| Fake reviews | Destroys trust when discovered | Real data or honest placeholders |
| Decorative Lucide icons next to text | Looks like a template, not a product | Only functional icons (search, chevron, arrow) |

---

## 18. Risk Registry

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|:----------:|:------:|------------|
| 1 | AI image generation produces inconsistent styles | Medium | High | Define strict prompt templates, batch-generate with same seed/style, review before upload |
| 2 | Route migration breaks existing marketplace links | Medium | High | Redirect `/services?...` → `/services/browse?...` via Next.js middleware or rewrites |
| 3 | Empty provider DB makes Featured Providers section useless | High | Medium | Implement graceful fallback: skeleton cards with "Coming Soon" + CTA to "Be the first provider" |
| 4 | ServiceSearchAutocomplete variant="hero" doesn't match new design | Medium | Medium | May need a custom hero-specific search bar vs. reusing existing component |
| 5 | Two competing category models cause confusion | High | High | Landing page must use canonical 20-category model exclusively. Ignore legacy 8-category constants. |
| 6 | Image loading slows LCP below target | Medium | High | Priority hero image, lazy load all below-fold, use blur placeholders, optimize sizes |
| 7 | Internal link rot after route move | Medium | Medium | Global grep for `/services?` and `/services"` patterns, update all matches |
| 8 | JSON-LD validation errors cause search console warnings | Low | Medium | Validate with Google Rich Results Test before deployment |

---

## Appendix A: Route Redirect Strategy

To ensure zero broken links during the `/services` → `/services/browse` migration:

### Option 1: Next.js Rewrites (Recommended)

In `next.config.ts`:
```typescript
async rewrites() {
  return [
    // Old marketplace URLs with query params still work
    // NOTE: Only needed if external links exist pointing to /services?category=...
  ];
}
```

### Option 2: Middleware Redirect

In `src/middleware.ts`:
```typescript
// If request is GET /services with search params, redirect to /services/browse
if (pathname === '/services' && url.search) {
  return NextResponse.redirect(new URL(`/services/browse${url.search}`, url));
}
```

**Recommended:** Option 2 (middleware redirect) — clean, explicit, preserves query params.

---

## Appendix B: OG Image Specification

Generate a dedicated Open Graph image for the services landing page:

| Property | Value |
|----------|-------|
| Size | 1200×630px |
| Background | Brand teal gradient (#0D9488 → #0F766E) |
| Left side | MitaSafi logo (white, large) |
| Right side | "Trusted Home Services Across Nairobi" (white, bold) |
| Bottom bar | "700+ Verified Providers • 20+ Categories • Nairobi, Kenya" |
| File | `landing-images/services/og-services.jpg` |

---

*End of specification. This document is the single source of truth for the services landing page implementation. All design decisions, content, links, and technical choices are documented here. Implementation begins with SLP-1.*
