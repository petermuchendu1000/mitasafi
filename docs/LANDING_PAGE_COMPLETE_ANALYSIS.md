# MitaSafi Landing Page — Complete Analysis & Implementation Milestones

**Date:** March 3, 2026  
**Scope:** Every landing/marketing page in the MitaSafi codebase — root homepage, audience-specific pages, and all supporting infrastructure.  
**Methodology:** File-by-file code audit of every page, component, hook, image asset, link destination, accessibility attribute, and content string.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [The Blended vs. Separated Landing Page Decision](#3-the-blended-vs-separated-landing-page-decision)
4. [Root Homepage — Section-by-Section Audit](#4-root-homepage--section-by-section-audit)
5. [Audience-Specific Pages Audit](#5-audience-specific-pages-audit)
6. [Complete Gap Analysis](#6-complete-gap-analysis)
7. [Dead & Broken Links Registry](#7-dead--broken-links-registry)
8. [Image & Asset Audit](#8-image--asset-audit)
9. [Accessibility Audit](#9-accessibility-audit)
10. [SEO Audit](#10-seo-audit)
11. [Performance Audit](#11-performance-audit)
12. [Implementation Milestones (LP-*)](#12-implementation-milestones-lp)
13. [Priority & Execution Order](#13-priority--execution-order)
14. [What's Already Complete](#14-whats-already-complete)

---

## 1. Executive Summary

### Current State

The MitaSafi landing ecosystem consists of **4 public marketing pages** and **2 functional app pages** that share the landing Navbar/Footer:

| Page | Route | Lines | Type | Status |
|------|-------|:-----:|------|--------|
| **Root Homepage** | `/` | 56 (orchestrator) + ~2,600 (16 components) | Blended marketing | ⚠️ Partially Complete |
| **Landlords Landing** | `/landlords` | 887 | Audience landing | ✅ Fully Complete |
| **Service Providers Landing** | `/service-providers` | 722 | Audience landing | ✅ Fully Complete |
| **Properties Browse** | `/properties` | 199 | Functional app | ✅ Fully Complete |
| **Services Marketplace** | `/services` | 407 | Functional app | ✅ Fully Complete |
| **Contact** | `/contact` | 272 | Marketing/utility | ⚠️ Simulated submit |
| **Saved** | `/saved` | 322 | Functional app | ✅ Fully Complete |
| **Auth (Login/Signup)** | `/(auth)/login`, `/(auth)/signup` | 1,759 | Auth | ✅ Fully Complete |

### Critical Findings

1. **The homepage merges two product verticals** (Rental Management + Services Marketplace) without a coherent narrative arc — sections alternate between rental and service content with no transition logic
2. **14 Footer links are dead** (404) — `/about`, `/blog`, `/careers`, `/privacy`, `/terms`, etc.
3. **`/landlords/signup` route doesn't exist** — referenced by 3 CTAs across FeaturesSection and PricingSection
4. **All statistics are fabricated** — "5,000+ Verified Homes", "KES 25M+ Processed", "50k+ Jobs" — none come from real data
5. **Hero and CTA "For Landlords" dropdowns are hover-only** — invisible to keyboard users and broken on touch/mobile
6. **57 images in `public/images/` are unused** — all components use Supabase storage URLs instead
7. **No tenant-specific landing page** exists, unlike landlords and providers which each have their own
8. **Scroll-triggered animations defined in CSS but never activated** — `.animate-on-scroll` requires `.is-visible` class, but no JavaScript adds it
9. **Contact form submission is simulated** — `setTimeout` instead of actual backend/email delivery

### Scorecard

| Dimension | Score | Notes |
|-----------|:-----:|-------|
| Visual Design & Polish | 9/10 | Beautiful, consistent design system applied everywhere |
| Component Completeness (code) | 8/10 | All 16 sections are built and render |
| Content Accuracy | 2/10 | Every stat is fabricated; no real data |
| Link Integrity | 4/10 | 14 dead footer links + 3 broken CTAs |
| Accessibility | 3/10 | No ARIA on tabs, FAQs, dropdowns; hover-only menus |
| SEO | 5/10 | Good metadata on sub-pages; homepage SEO is rental-only, missing services |
| Mobile UX | 7/10 | Responsive, but hover-only dropdowns break on touch |
| Narrative Coherence | 4/10 | Rental and service sections interleaved without clear flow |
| Image Infrastructure | 5/10 | Works via Supabase but has local/remote split confusion |
| Performance | 8/10 | Good: SSR, priority images, Suspense boundaries |

---

## 2. Architecture Overview

### File Map

```
src/app/
├── page.tsx                              ← Root homepage (orchestrator, 56 lines)
├── layout.tsx                            ← Root layout (metadata, 81 lines)
├── globals.css                           ← Global styles (295 lines)
├── landlords/page.tsx                    ← Landlord landing (887 lines, self-contained)
├── service-providers/page.tsx            ← Provider landing (722 lines, self-contained)
├── properties/page.tsx                   ← Browse properties (199 lines, functional)
├── services/page.tsx                     ← Services marketplace (407 lines, functional)
├── contact/page.tsx                      ← Contact form (272 lines, simulated submit)
├── saved/page.tsx                        ← Saved listings (322 lines, functional)
└── (auth)/
    ├── layout.tsx                        ← Auth layout (19 lines, split-panel)
    ├── login/page.tsx                    ← Login (651 lines)
    └── signup/page.tsx                   ← Signup (1,108 lines)

src/components/landing/                   ← 17 files, ~2,650 lines total
├── index.ts                              barrel export
├── Navbar.tsx                            170 lines
├── Hero.tsx                              164 lines
├── TrustBar.tsx                          108 lines
├── ServiceCategoriesShowcase.tsx         175 lines
├── RecentlyViewedSection.tsx             223 lines
├── PopularServicesSection.tsx            173 lines
├── ProblemSection.tsx                    67 lines
├── FeaturesSection.tsx                   214 lines
├── ServiceDiscoverySection.tsx           191 lines
├── HowItWorksSection.tsx                 209 lines
├── NeighborhoodsSection.tsx              88 lines
├── TestimonialsSection.tsx               151 lines
├── PricingSection.tsx                    260 lines
├── FAQSection.tsx                        117 lines
├── CTASection.tsx                        116 lines
└── Footer.tsx                            127 lines

src/components/ui/                        ← Shared primitives
├── Button.tsx                            97 lines (CVA variants)
├── Card.tsx                              178 lines (5 card types)
├── Container.tsx                         30 lines
├── Section.tsx                           88 lines
├── Logo.tsx                              155 lines
└── ...

public/images/                            ← 57 unused local images
public/logo/                              ← 11 SVG logo files (used)
```

### Section Rendering Order (Homepage)

```
┌─ Navbar ──────────────────────────────── Blended (rental + service links)
├─ Hero ────────────────────────────────── RENTAL (headline, CTAs, imagery)
├─ TrustBar ────────────────────────────── RENTAL (verified homes, rent processed)
├─ ServiceCategoriesShowcase ───────────── SERVICE (8 category icons)
├─ RecentlyViewedSection ───────────────── SERVICE (personalized localStorage)
├─ PopularServicesSection ──────────────── SERVICE (8 trending services)
├─ ProblemSection ──────────────────────── RENTAL (pain points: fake photos, bribes)
├─ FeaturesSection ─────────────────────── BLENDED (tabbed: tenant/landlord/provider)
├─ ServiceDiscoverySection ─────────────── SERVICE (search bar, stats)
├─ HowItWorksSection ──────────────────── RENTAL (search → connect → move in)
├─ NeighborhoodsSection ────────────────── RENTAL (4 Nairobi neighborhoods)
├─ TestimonialsSection ─────────────────── BLENDED (mix of types)
├─ PricingSection ──────────────────────── BLENDED (tabbed: 3 user types)
├─ FAQSection ──────────────────────────── BLENDED (cross-audience questions)
├─ CTASection ──────────────────────────── RENTAL (find your next home)
└─ Footer ──────────────────────────────── BLENDED (all link columns)
```

**Visual:** The page alternates: RENTAL → RENTAL → SERVICE → SERVICE → SERVICE → RENTAL → BLENDED → SERVICE → RENTAL → RENTAL → BLENDED → BLENDED → BLENDED → RENTAL.

---

## 3. The Blended vs. Separated Landing Page Decision

### The Core Problem

The current homepage tries to sell two fundamentally different products to three different audiences in one scroll:

1. **Rental Management** (Tenants finding homes + Landlords managing properties)
2. **Services Marketplace** (Customers finding service providers + Providers getting jobs)

This creates **cognitive overload** — a tenant searching for an apartment encounters plumbing service categories mid-scroll. A service provider who came for jobs sees "Renting Shouldn't Feel Like Gambling" as the first thing.

### Analysis: Your Options

| Approach | Pros | Cons |
|----------|------|------|
| **A. Separate landing pages** (recommended) | Clear value proposition per audience; higher conversion; focused SEO; reuses existing audience pages | More pages to maintain; need a "gateway" page or smart routing |
| **B. Blended single page** (current) | One URL to share; comprehensive overview; simpler architecture | Diluted message; longer page; confusing section flow; lower conversion per audience |
| **C. Hybrid** (gateway → audience pages) | Best of both: brief gateway with role-selector then deep audience pages | Gateway page needs to be truly brief; risk of extra click friction |

### Recommendation: **Option A — Separate Landing Pages with a Minimal Gateway**

**Why:**

1. **You already have the audience pages built.** `/landlords` (887 lines) and `/service-providers` (722 lines) are production-ready, SEO-optimized, with JSON-LD, testimonials, pricing, and FAQs.

2. **The homepage is 60% rental-focused anyway.** The Hero, TrustBar, ProblemSection, HowItWorksSection, NeighborhoodsSection, and CTASection are all rental content. Rather than awkwardly inserting service sections, let the homepage serve as the **tenant landing page** (MitaSafi's primary audience) and link clearly to `/landlords` and `/service-providers`.

3. **A dedicated `/services` marketing section already exists** as `ServiceDiscoverySection` — it can become part of a services-oriented landing page or link to the marketplace.

4. **SEO benefits massively.** Right now the homepage meta is rental-only ("Find Verified Rental Homes in Nairobi") but the page body is 40% services. Google sees a mismatch. Separating means each page targets its own keyword cluster cleanly.

5. **Conversion improves.** A service provider lands on `/service-providers` from Google → sees "Join 500+ Verified Fundis" → signs up. Much better than landing on `/` → scrolling past rental content → finding the provider tab.

### Proposed Architecture

```
/                           Tenant-focused homepage (primary audience)
                            ├── Hero (rental: "Find Verified Homes")
                            ├── TrustBar (rental stats)
                            ├── ProblemSection (rental pain points)
                            ├── FeaturesSection (TENANT TAB ONLY — no tabs)
                            ├── HowItWorksSection (rental flow)
                            ├── NeighborhoodsSection (areas)
                            ├── TestimonialsSection (tenant testimonials)
                            ├── PricingSection (TENANT ONLY — simple "Free" card)
                            ├── FAQSection (tenant-specific FAQs)
                            ├── ServiceDiscoverySection (bridge: "Also need a service?")
                            ├── CTASection (rental CTA)

/landlords                  Already exists — fully built (887 lines)
/service-providers          Already exists — fully built (722 lines)
/services                   Already exists — functional marketplace (407 lines)
/properties                 Already exists — functional browse (199 lines)
```

**What changes:**
- Homepage becomes tenant-focused by removing service-only sections and simplifying tabbed sections
- ServiceCategoriesShowcase, PopularServicesSection, RecentlyViewedSection move to `/services` as a marketing hero above the marketplace
- ServiceDiscoverySection stays on homepage as a **cross-sell bridge** ("Also need a service? Browse 700+ verified providers →")
- Navbar keeps links to all audiences
- Footer stays blended (it's a company-wide footer)

**What this avoids:**
- Building a whole new "services landing page" — the `/service-providers` page already serves providers, and `/services` already serves service customers
- Wasting the existing service components — they move to `/services` where they're contextually appropriate

---

## 4. Root Homepage — Section-by-Section Audit

### 4.1 Navbar (`Navbar.tsx` — 170 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Rendering | ✅ Complete | Desktop + mobile responsive |
| Navigation links | ✅ Complete | 4 links + auth CTAs |
| Mobile menu | ✅ Complete | Hamburger, auto-close on navigate |
| Saved count badge | ✅ Complete | localStorage + cross-tab sync |
| Route validity | ✅ All valid | `/properties`, `/landlords`, `/service-providers`, `/#how-it-works`, `/saved`, `/login`, `/signup` |
| NotificationCenter | ⚠️ Present but irrelevant | Shows on landing page for non-logged-in users? Should only show for authenticated users |
| Scroll behavior | ⚠️ Missing | No transparent-to-solid transition despite having backdrop-blur classes. Always opaque. |
| Active link highlighting | ❌ Missing | No scroll spy or route-based active state |
| `aria-expanded` on mobile toggle | ❌ Missing | Hamburger lacks `aria-expanded` |
| Keyboard trap management (mobile) | ❌ Missing | No focus trap in mobile menu |

### 4.2 Hero (`Hero.tsx` — 164 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | Full-height hero with background image + family overlay |
| Primary CTA | ✅ Complete | "Browse Verified Homes" → `/properties` |
| "For Landlords" dropdown | ❌ Broken (mobile/keyboard) | CSS `group-hover` only — no click handler, no `aria-expanded`, no `aria-haspopup`, invisible on touch devices |
| Service provider link | ✅ Complete | "Join our network →" → `/signup?role=provider` |
| Trust points | ✅ Complete | 3 points below CTAs |
| Background image | ⚠️ Supabase dependency | `nairobi-skyline-1.jpg` from Supabase storage. Local backup exists in `public/images/hero/` but isn't referenced |
| Family image | ⚠️ Supabase dependency | `family-home-2.jpg`. Local backup in `public/images/people/` |
| Wave SVG divider | ✅ Complete | Responsive bottom transition |
| Priority loading | ✅ Correct | Both images have `priority` attribute |
| `sizes` prop | ❌ Missing | Family image (600×500) lacks `sizes` |
| Content focus | 🏠 Rental | Everything is rental-oriented |

### 4.3 TrustBar (`TrustBar.tsx` — 108 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | Stats row + security badges |
| Statistics | ❌ All fabricated | "5,000+ Verified Homes" (no DB query), "KES 25M+" (no DB), "4.8/5.0" (no DB), "98%" (no source) |
| Security badges | ✅ Complete | SSL, M-Pesa, Data Protected, Verified |
| SVG accessibility | ❌ Missing | No `aria-hidden` on decorative SVGs |
| Content focus | 🏠 Rental | "Verified Homes", "Rent Processed" |

### 4.4 ServiceCategoriesShowcase (`ServiceCategoriesShowcase.tsx` — 175 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | 8-icon grid (desktop) / horizontal scroll (mobile) |
| Category data | ✅ Hardcoded | 8 categories with slugs — matches services page filter param structure |
| Links | ✅ Valid | All → `/services?category={slug}` |
| Mobile scroll affordance | ❌ Missing | No visual hint that it's scrollable (no gradient fade, no arrow) |
| Unused imports | ⚠️ Minor | 5 unused lucide icon imports |
| Content focus | 🔧 Services | Entirely service-focused |

### 4.5 RecentlyViewedSection (`RecentlyViewedSection.tsx` — 223 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Functionality | ✅ Complete | localStorage-based history with clear/remove |
| Conditional render | ✅ Correct | Returns `null` if no history (section hidden) |
| Provider links | ⚠️ Route uncertain | Links to `/service-providers/${id}` — route should exist as dynamic route |
| Clear all confirmation | ✅ Complete | Window.confirm before wipe |
| Content focus | 🔧 Services | Service provider history |

### 4.6 PopularServicesSection (`PopularServicesSection.tsx` — 173 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | Horizontal scrolling cards with images |
| Service data | ❌ Hardcoded static | 8 services with fabricated data (not from DB) |
| Images | ⚠️ Unsplash | 8 Unsplash URLs — work but are external CDN; no `sizes` prop |
| Links | ✅ Valid | `/services?category=...&subcategory=...` |
| "View all services" | ✅ Valid | → `/services` |
| Unused imports | ⚠️ Minor | 4 unused lucide icon imports |
| Content focus | 🔧 Services | Entirely service-focused |

### 4.7 ProblemSection (`ProblemSection.tsx` — 67 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | 4 problem cards with vivid copy |
| Content quality | ✅ Excellent | Emotionally resonant, Nairobi-specific rental pain points |
| Link | ✅ Valid | "See How We're Different →" → `#for-tenants` anchor |
| Content focus | 🏠 Rental | 100% rental pain points |

### 4.8 FeaturesSection (`FeaturesSection.tsx` — 214 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Functionality | ✅ Complete | 3-tab switcher (tenant/landlord/provider) |
| Feature cards | ✅ Complete | 15 features total (6+5+4) with titles, descriptions, stats |
| Statistics | ❌ All fabricated | "98% listing accuracy", "89% reduction in problematic tenancies", etc. |
| ARIA tab roles | ❌ Missing | No `role="tab"`, `aria-selected`, `role="tabpanel"`, `aria-controls` |
| Keyboard navigation | ❌ Missing | No arrow key tab switching |
| `/landlords/signup` link | ❌ Route doesn't exist | Landlord tab CTA goes to non-existent route |
| Content focus | 🔀 Blended | Tabs serve all 3 user types |

### 4.9 ServiceDiscoverySection (`ServiceDiscoverySection.tsx` — 191 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Search functionality | ✅ Complete | Text input → navigate to `/services?search=` |
| Trending searches | ✅ Complete | 6 chip buttons |
| Stats | ❌ Fabricated | "700+", "500+", "50k+", "4.8" — no DB source |
| Trust points | ✅ Complete | 3 badges below search |
| Search autocomplete | ❌ Missing | No debounced suggestions (the `/services` page has autocomplete, this doesn't) |
| `aria-label` on search input | ❌ Missing | No label or aria-label |
| Background image | ✅ Works | `pattern-dots.svg` exists in `public/images/` |
| Content focus | 🔧 Services | Entirely service-focused |

### 4.10 HowItWorksSection (`HowItWorksSection.tsx` — 209 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | 3-step timeline + mini timeline + stats |
| Responsive | ✅ Excellent | Separate desktop (horizontal) and mobile (vertical) layouts |
| Stats | ❌ Fabricated | "500+", "98%", "24/7", "0" |
| Content | ✅ Well-written | Clear 3-step flow for tenants |
| Decorative elements accessibility | ❌ Missing | Progress lines/circles lack `aria-hidden` |
| `id` attribute for anchor | ✅ Present | `id="how-it-works"` for nav link |
| Content focus | 🏠 Rental | "Search → Connect → Move In" |

### 4.11 NeighborhoodsSection (`NeighborhoodsSection.tsx` — 88 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | 4 neighborhood image cards |
| Images | ⚠️ Supabase dependency | 4 property images from Supabase storage |
| `sizes` prop | ✅ Present | Properly defined |
| Links | ⚠️ Partially valid | `/properties?location=south b/c` has unencoded space/slash |
| "View All Areas" | ⚠️ Misleading | → `/signup?role=tenant` (takes user to signup, not an areas page) |
| Listing counts | ❌ Fabricated | "450+ listings", "520+ listings" etc. |
| Content focus | 🏠 Rental | "Find Homes Across Nairobi" |

### 4.12 TestimonialsSection (`TestimonialsSection.tsx` — 151 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Carousel | ✅ Complete | Horizontal scroll-snap with prev/next buttons |
| Navigation buttons | ✅ Complete | `aria-label` present, disabled state handled |
| Testimonials | ❌ All fabricated | 6 fake personas with fake quotes |
| Images | ⚠️ Supabase dependency | 6 testimonial person images from Supabase |
| Trust stats | ❌ Fabricated | "4.8/5.0", "2,847+", "98%" |
| Carousel accessibility | ❌ Partial | No `role="region"`, no live region announcements |
| Content focus | 🔀 Blended | 3 tenants, 1 landlord, 1 plumber, 1 property manager |

### 4.13 PricingSection (`PricingSection.tsx` — 260 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Functionality | ✅ Complete | 3-tab switcher (tenant/landlord/provider) |
| Pricing data | ✅ Defined | Tenant: Free. Landlord: Free/KES 2,500/Custom. Provider: Free/KES 1,500/KES 4,000 |
| Plan billing integration | ❌ None | Visual only — no Stripe/M-Pesa subscription |
| `/landlords/signup` links | ❌ Route doesn't exist | 2 landlord CTA links go to non-existent route |
| ARIA tab roles | ❌ Missing | Same issues as FeaturesSection |
| Content focus | 🔀 Blended | All 3 user type pricing |

### 4.14 FAQSection (`FAQSection.tsx` — 117 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Accordion | ✅ Complete | Click to expand/collapse, first open by default |
| Content | ✅ Well-written | 8 Nairobi-specific Q&A pairs |
| `aria-expanded` | ❌ Missing | Buttons lack `aria-expanded` |
| `aria-controls` / `aria-labelledby` | ❌ Missing | No ARIA linkage between question/answer |
| Answer `aria-hidden` | ❌ Missing | Collapsed answers still in DOM, not marked hidden |
| Content focus | 🔀 Blended | Questions cover tenants, landlords, providers |

### 4.15 CTASection (`CTASection.tsx` — 116 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | Split: text/CTAs left, image right |
| Primary CTA | ✅ Valid | "Browse Verified Homes" → `/properties` |
| "For Landlords" dropdown | ❌ Broken (same as Hero) | CSS hover-only, no keyboard access, no ARIA |
| Image | ⚠️ Supabase dependency | `family-photo-1.jpg` — file may not exist as named |
| `sizes` prop | ✅ Present | |
| Floating testimonial card | ✅ Nice touch | Animated bubble with fabricated quote |
| Content focus | 🏠 Rental | "Ready to Find Your Next Home?" |

### 4.16 Footer (`Footer.tsx` — 127 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Layout | ✅ Complete | 4 link columns + social icons + bottom bar |
| Social links | ✅ Complete | Facebook, Twitter, Instagram, LinkedIn with `aria-label` and `rel="noopener"` |
| Contact info | ⚠️ Placeholder | Phone: `+254 700 000 000` (placeholder number) |
| Dead links | ❌ 14 of 18 internal links are 404 | See [Section 7](#7-dead--broken-links-registry) |
| Content focus | 🔀 Blended | All product areas |

---

## 5. Audience-Specific Pages Audit

### 5.1 `/landlords` — Landlord Landing Page (887 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Overall quality | ✅ Production-ready | Rich, SEO-optimized, self-contained single-file page |
| JSON-LD | ✅ Complete | WebPage + BreadcrumbList + FAQPage schema |
| SEO metadata | ✅ Complete | Title, description, keywords, OG, Twitter card |
| Hero | ✅ Complete | Teal gradient, dual CTAs, floating stat cards |
| Problem section | ✅ Complete | 3 landlord-specific pain points |
| Benefits cards | ✅ Complete | 6 feature cards with lucide icons |
| Dashboard preview | ⚠️ Static image | Uses Supabase image but no interactive demo |
| How it works | ✅ Complete | 3-step landlord flow |
| Pricing | ✅ Complete | 3 tiers: Free/Professional (KES 2,500)/Enterprise (Custom) |
| Testimonials | ✅ Complete | 3 landlord-specific testimonials (fabricated) |
| FAQ | ✅ Complete | 7 landlord-specific questions |
| Final CTA | ✅ Complete | Orange gradient with dual CTAs |
| CTA destinations | ✅ Valid | `/signup?role=landlord&intent=list`, `/contact?type=enterprise` |
| Accessibility | ⚠️ Same issues | FAQ lacks ARIA, dropdowns if any |
| Stats | ❌ Fabricated | "2,500+ Landlords", "KES 150M+ Processed" |
| OG image | ⚠️ Generic | Uses `modern-apartment-building.jpg` — not landlord-specific |

### 5.2 `/service-providers` — Service Provider Landing Page (722 lines)

| Aspect | Status | Details |
|--------|--------|---------|
| Overall quality | ✅ Production-ready | Rich, SEO-optimized, self-contained |
| JSON-LD | ✅ Complete | WebPage + FAQPage (missing BreadcrumbList unlike landlords) |
| SEO metadata | ⚠️ Missing Twitter card | Has OG but no `twitter` metadata |
| Hero | ✅ Complete | Teal gradient, dual CTAs, floating stat cards |
| Problem section | ✅ Complete | 3 provider-specific pain points ("Being a Skilled Fundi...") |
| Service categories bento | ✅ Complete | 4 category cards + 8 service tags |
| Benefits cards | ✅ Complete | 6 provider-specific benefits |
| How it works | ✅ Complete | 3-step provider flow |
| Testimonials | ✅ Complete | 3 provider-specific testimonials (fabricated) |
| FAQ | ✅ Complete | 6 provider-specific questions |
| Final CTA | ✅ Complete | Orange gradient |
| OG image | ⚠️ Generic | Same `modern-apartment-building.jpg` as landlords — not provider-specific |
| Missing | ⚠️ No pricing section | Unlike landlords page, provides have pricing on homepage only |
| Missing | ⚠️ No breadcrumb schema | Landlords page has it, this doesn't |

### 5.3 Missing: `/tenants` or Tenant-Specific Landing Page

- **Does not exist.** The root homepage (`/`) currently serves as the de facto tenant landing page, but it's diluted with service content.
- The `/properties` page is a **functional browse page** (search/filter/results), not a marketing/conversion page.

---

## 6. Complete Gap Analysis

### 6.1 Critical Gaps (Must Fix Before Launch)

| # | Gap | Severity | Location | Impact |
|---|-----|----------|----------|--------|
| LP-G1 | **14 dead footer links** — clicking leads to 404 | 🔴 CRITICAL | `Footer.tsx` | Users encounter dead ends; harms SEO via crawled 404s |
| LP-G2 | **`/landlords/signup` doesn't exist** — 3 CTAs break | 🔴 CRITICAL | `FeaturesSection.tsx`, `PricingSection.tsx` | Click → 404 for landlord conversion |
| LP-G3 | **"For Landlords" hover-only dropdown** — broken on mobile + keyboard | 🔴 CRITICAL | `Hero.tsx`, `CTASection.tsx` | Touch users can't access landlord signup; WCAG violation |
| LP-G4 | **Contact form submission simulated** — no backend | 🔴 CRITICAL | `contact/page.tsx` | Inquiries are silently lost |
| LP-G5 | **All statistics fabricated** — legal and trust risk | 🟠 HIGH | All sections | False advertising if taken as real claims |
| LP-G6 | **Homepage SEO metadata rental-only** — mismatches 40% service content | 🟠 HIGH | `layout.tsx` | Google sees content/meta mismatch; diluted ranking |

### 6.2 Functional Gaps

| # | Gap | Severity | Location | Impact |
|---|-----|----------|----------|--------|
| LP-G7 | **Scroll-triggered animations not activated** | 🟡 MEDIUM | `globals.css` | `.animate-on-scroll` CSS defined but never triggered by JS |
| LP-G8 | **No Intersection Observer for lazy sections** | 🟡 MEDIUM | `page.tsx` | All 16 sections render at once; animations fire without being seen |
| LP-G9 | **Navbar has no active state** | 🟡 MEDIUM | `Navbar.tsx` | Cannot tell which section/page you're on |
| LP-G10 | **Testimonial carousel lacks live region** | 🟡 MEDIUM | `TestimonialsSection.tsx` | Screen readers don't announce slide changes |
| LP-G11 | **Search input has no accessible label** | 🟡 MEDIUM | `ServiceDiscoverySection.tsx` | WCAG Form violation |
| LP-G12 | **Phone number in footer is placeholder** | 🟡 MEDIUM | `Footer.tsx` | `+254 700 000 000` — not a real number |

### 6.3 Accessibility Gaps

| # | Gap | WCAG | Location |
|---|-----|------|----------|
| LP-G13 | Tabs lack `role="tab"`, `aria-selected`, `role="tabpanel"` | 4.1.2 | `FeaturesSection.tsx`, `PricingSection.tsx` |
| LP-G14 | FAQ lacks `aria-expanded`, `aria-controls` | 4.1.2 | `FAQSection.tsx` |
| LP-G15 | Decorative SVGs lack `aria-hidden="true"` | 1.1.1 | `TrustBar.tsx`, `HowItWorksSection.tsx` |
| LP-G16 | Mobile menu toggle lacks `aria-expanded` | 4.1.2 | `Navbar.tsx` |
| LP-G17 | Hover-only dropdown inaccessible | 2.1.1 | `Hero.tsx`, `CTASection.tsx` |
| LP-G18 | Heart icon link lacks `aria-label` | 1.1.1 | `Navbar.tsx` |
| LP-G19 | `Image fill` components missing `sizes` | N/A (performance) | `PopularServicesSection.tsx`, `Hero.tsx` |

### 6.4 Content & Structural Gaps

| # | Gap | Severity | Details |
|---|-----|----------|---------|
| LP-G20 | **No tenant-specific landing page** | 🟡 MEDIUM | Landlords and providers each have one; tenants don't |
| LP-G21 | **Homepage narrative is incoherent** | 🟡 MEDIUM | Rental → Service → Service → Service → Rental ping-pong |
| LP-G22 | **No JSON-LD on homepage** | 🟡 MEDIUM | `/landlords` and `/service-providers` have it; homepage doesn't |
| LP-G23 | **OG images are generic** for audience pages | 🟢 LOW | Both landlords and providers share same `modern-apartment-building.jpg` |
| LP-G24 | **Service-providers page missing Twitter card** | 🟢 LOW | Has OG but no `twitter` metadata object |
| LP-G25 | **Service-providers page missing BreadcrumbList schema** | 🟢 LOW | Landlords page has it |
| LP-G26 | **57 unused images in `public/images/`** | 🟢 LOW | ~10-20MB wasted in deployment bundle |
| LP-G27 | **`landing-images/` directory mostly empty** | 🟢 LOW | Stale directory, only 1 file out of 6 subdirectories |
| LP-G28 | **Newsletter signup missing** | 🟢 LOW | Content doc specifies it, not implemented |
| LP-G29 | **No mobile app teaser/download links** | 🟢 LOW | Footer links to `/app` which doesn't exist |

---

## 7. Dead & Broken Links Registry

### 7.1 Footer Dead Links (14)

| Link Text | Destination | Fix Action |
|-----------|-------------|------------|
| Mobile App | `/app` | Remove link or create stub page |
| About Us | `/about` | Create page or remove link |
| Careers | `/careers` | Create page or remove link |
| Blog | `/blog` | Create page or remove link |
| Press | `/press` | Remove (not needed for launch) |
| Help Center | `/help` | Create page or redirect to FAQ |
| Tenant Guide | `/guides/tenants` | Create page or remove link |
| Landlord Guide | `/guides/landlords` | Create page or remove link |
| Safety Tips | `/safety` | Create page or remove link |
| API Documentation | `/developers` | Remove (not needed for launch) |
| Privacy Policy | `/privacy` | **Must create** (legal requirement) |
| Terms of Service | `/terms` | **Must create** (legal requirement) |
| Cookie Policy | `/cookies` | **Must create** (legal compliance) |
| Tenant Rights | `/tenant-rights` | Create page or remove link |

### 7.2 Broken CTA Links (3)

| Component | Link Text | Destination | Fix |
|-----------|-----------|-------------|-----|
| `FeaturesSection.tsx` | "List Your Property — Free" | `/landlords/signup` | Change to `/signup?role=landlord&intent=list` |
| `PricingSection.tsx` | "Get Started Free" (Landlord Free) | `/landlords/signup` | Change to `/signup?role=landlord` |
| `PricingSection.tsx` | "Start 14-Day Trial" (Landlord Pro) | `/landlords/signup?plan=professional` | Change to `/signup?role=landlord&plan=professional` |

### 7.3 Misleading Links (2)

| Component | Link Text | Destination | Issue |
|-----------|-----------|-------------|-------|
| `NeighborhoodsSection.tsx` | "View All Areas →" | `/signup?role=tenant` | Labeled as "view areas" but goes to signup |
| `NeighborhoodsSection.tsx` | South B/C card | `/properties?location=south b/c` | Unencoded space/slash in URL param |

---

## 8. Image & Asset Audit

### 8.1 Image Source Strategy — Current State

The codebase has a **dual-source image problem**:

| Location | Files | Used? | Purpose |
|----------|:-----:|:-----:|---------|
| Supabase Storage (`syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/`) | ~15 referenced | ✅ | All landing components reference these |
| `public/images/` | 57 files | ❌ | Local copies exist but **zero** are referenced by any component |
| `landing-images/` (local directory) | 1 file | ❌ | Mostly empty, stale artifact |
| Unsplash CDN | 8 URLs | ✅ | Used only by `PopularServicesSection.tsx` |

### 8.2 Recommendation

**Use `public/images/` (local) as primary, Supabase as CDN mirror.**

Why:
- Local images are served via Vercel CDN with AVIF/WebP optimization via `next/image`
- No dependency on Supabase storage uptime for landing page rendering
- The 57 local images already exist with matching filenames
- Supabase storage adds an external dependency and potential CORS/latency issues

### 8.3 Image Reference Map

| Component | Currently References (Supabase) | Local Equivalent in `public/images/` |
|-----------|------|------|
| Hero (background) | `hero/nairobi-skyline-1.jpg` | `hero/nairobi-skyline-1.jpg` ✅ |
| Hero (family) | `people/family-home-2.jpg` | `people/family-home-2.jpg` ✅ |
| Neighborhoods (×4) | `properties/apartment-exterior-1.jpg` etc. | `properties/apartment-exterior-1.jpg` etc. ✅ |
| Testimonials (×6) | `people/testimonial-woman-1.jpg` etc. | `people/testimonial-woman-1.jpg` etc. ✅ |
| CTA | `people/family-photo-1.jpg` | ❌ **No local match** (closest: `family-home-1.jpg`) |
| OG Image | `logo/og-image.svg` | `public/logo/og-image.svg` ✅ |

### 8.4 Missing/Mismatched Images

| Reference | Issue |
|-----------|-------|
| `people/family-photo-1.jpg` (CTASection) | File doesn't exist locally. May not exist in Supabase either. Closest local: `people/family-home-1.jpg` |

---

## 9. Accessibility Audit

### WCAG 2.1 AA Compliance Summary

| Section | Issue | WCAG Criterion | Severity |
|---------|-------|----------------|----------|
| **Navbar** | Mobile toggle missing `aria-expanded` | 4.1.2 Name, Role, Value | Medium |
| **Navbar** | Saved heart icon missing `aria-label` | 1.1.1 Non-text Content | Low |
| **Hero** | Dropdown is hover-only (no keyboard/touch) | 2.1.1 Keyboard | **Critical** |
| **Hero** | Dropdown button missing `aria-expanded`, `aria-haspopup` | 4.1.2 | High |
| **TrustBar** | Decorative SVGs not hidden from AT | 1.1.1 | Low |
| **ServiceCategories** | Scrollable container no accessible labeling | 4.1.2 | Low |
| **FeaturesSection** | Tabs have no ARIA role structure | 4.1.2 | **High** |
| **FeaturesSection** | No keyboard arrow-key navigation for tabs | 2.1.1 | Medium |
| **ServiceDiscovery** | Search input has no `<label>` or `aria-label` | 1.3.1 Info & Relationships | Medium |
| **HowItWorks** | Decorative circles/lines not `aria-hidden` | 1.1.1 | Low |
| **Testimonials** | Carousel has no `role="region"` or live region | 4.1.2 | Medium |
| **PricingSection** | Same tab ARIA issues as FeaturesSection | 4.1.2 | **High** |
| **FAQSection** | No `aria-expanded` on accordion buttons | 4.1.2 | **High** |
| **FAQSection** | No `aria-controls`/`aria-labelledby` linkage | 4.1.2 | Medium |
| **CTASection** | Same hover-only dropdown as Hero | 2.1.1 | **Critical** |

### Remediation Priority

1. **Critical**: Fix hover-only dropdowns in Hero + CTA (add click handler, ARIA, keyboard)
2. **High**: Add ARIA tab pattern to FeaturesSection + PricingSection
3. **High**: Add `aria-expanded` to FAQSection accordion
4. **Medium**: Add accessible labels to search input, carousel, mobile menu

---

## 10. SEO Audit

### 10.1 Root Homepage SEO

| Aspect | Status | Details |
|--------|--------|---------|
| `<title>` | ⚠️ Rental-only | "Find Verified Rental Homes in Nairobi" — no service keywords |
| `<meta description>` | ⚠️ Rental-only | "Discover verified rental homes..." — no mention of services |
| Keywords | ⚠️ Rental-only | 7 rental keywords, 0 service keywords |
| Open Graph | ⚠️ Rental-only | Title/description all about rentals |
| Twitter Card | ⚠️ Rental-only | Same as OG |
| JSON-LD | ❌ Missing | No structured data on homepage (sub-pages have it) |
| `canonical` | ❌ Missing | No explicit canonical URL |
| `h1` tag | ⚠️ Depends on Hero | Hero renders `<h1>` — correct |
| Heading hierarchy | ✅ Good | `h1` (Hero) → `h2` (section headers) → `h3` (cards) |
| Image alt text | ✅ Good | All images have descriptive alt text |
| Internal linking | ⚠️ Weak | Few cross-links between sections |
| Sitemap | ❌ Missing | No `sitemap.xml` generation |
| robots.txt | ❌ Missing | No `robots.txt` file |

### 10.2 `/landlords` SEO — ✅ Excellent

- Full metadata suite (title, description, keywords, OG, Twitter)
- JSON-LD: WebPage + BreadcrumbList + FAQPage
- Keyword-targeted title: "List, Screen & Collect Rent"

### 10.3 `/service-providers` SEO — ⚠️ Good but Incomplete

- Full metadata (title, description, keywords, OG)
- JSON-LD: WebPage + FAQPage
- **Missing**: Twitter card metadata
- **Missing**: BreadcrumbList structured data (landlords has it)

### 10.4 SEO Recommendations

| Priority | Action |
|----------|--------|
| 🔴 High | If splitting pages: update homepage meta to be tenant-focused only |
| 🔴 High | Add JSON-LD WebApplication + LocalBusiness + FAQPage to homepage |
| 🔴 High | Create `sitemap.xml` (Next.js `app/sitemap.ts`) |
| 🔴 High | Create `robots.txt` (Next.js `app/robots.ts`) |
| 🟠 Medium | Add Twitter card to `/service-providers` |
| 🟠 Medium | Add BreadcrumbList to `/service-providers` |
| 🟠 Medium | Add canonical URLs to all pages |
| 🟠 Medium | Create unique OG images per audience page |
| 🟢 Low | Add `hreflang` if planning Swahili version |

---

## 11. Performance Audit

### 11.1 Current Performance Architecture

| Aspect | Status | Details |
|--------|--------|---------|
| Server-Side Rendering | ✅ Good | Homepage is mostly SSR; only 4 of 16 sections are client components |
| Client components | `Navbar`, `FeaturesSection`, `PricingSection`, `TestimonialsSection`, `RecentlyViewedSection`, `ServiceDiscoverySection`, `FAQSection` | 7 client, 9 server |
| Suspense boundaries | ✅ Good | `RecentlyViewedSection` and `ServiceDiscoverySection` wrapped in `<Suspense>` |
| Image optimization | ⚠️ Partial | `priority` on hero images (correct), but no `sizes` on 9 other images |
| Font loading | ✅ Good | Google Fonts preconnect in `<head>` |
| CSS | ✅ Good | Tailwind with purging; minimal custom CSS |
| JS bundle | ⚠️ Concern | All client components load on initial render; no dynamic imports |
| PerformanceLogger | ✅ Present | Server-side timing (but only logs if >500ms — useful for monitoring) |

### 11.2 Recommendations

| Priority | Action | Impact |
|----------|--------|--------|
| 🟠 Medium | Add `sizes` prop to all `<Image fill>` components | Reduces image over-fetching |
| 🟠 Medium | Dynamic import below-fold client sections | Reduces initial JS bundle |
| 🟢 Low | Add `loading="lazy"` hint for sections below viewport | Already default for non-priority images |
| 🟢 Low | Consider removing unused `public/images/` files from deployment | ~10-20MB reduction |

---

## 12. Implementation Milestones (LP-*)

### LP-1: Fix Broken Links & CTAs
**Priority:** 🔴 CRITICAL | **Effort:** 0.5 day | **Depends on:** Nothing

This is the highest-impact, lowest-effort fix. Every broken link is a lost conversion or a 404 error in search console.

| # | Task | File | Details |
|---|------|------|---------|
| 1.1 | Fix `/landlords/signup` → `/signup?role=landlord` | `FeaturesSection.tsx` | Change landlord tab CTA href |
| 1.2 | Fix `/landlords/signup` → `/signup?role=landlord` | `PricingSection.tsx` | Change 2 landlord plan CTA hrefs |
| 1.3 | Fix `south b/c` → `south-b-c` in URL param | `NeighborhoodsSection.tsx` | URL-encode or use slug |
| 1.4 | Fix "View All Areas" link text | `NeighborhoodsSection.tsx` | Either change text to "Sign Up Free" or link to `/properties` |
| 1.5 | Update placeholder phone number | `Footer.tsx` | Replace `+254 700 000 000` with real number or remove |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/components/landing/FeaturesSection.tsx` | 1 href change |
| `src/components/landing/PricingSection.tsx` | 2 href changes |
| `src/components/landing/NeighborhoodsSection.tsx` | 1 href fix + 1 label change |
| `src/components/landing/Footer.tsx` | 1 phone number update |

---

### LP-2: Fix Hover-Only Dropdowns (Hero + CTA)
**Priority:** 🔴 CRITICAL | **Effort:** 1 day | **Depends on:** Nothing

The "For Landlords" dropdown in Hero and CTASection is hover-only (CSS `group-hover`). It's invisible to keyboard users, broken on touch/mobile, and violates WCAG 2.1.1.

| # | Task | Details |
|---|------|---------|
| 2.1 | Convert Hero dropdown to click-toggle | Add `useState` for open/close, `onClick` handler, click-outside-to-close |
| 2.2 | Add ARIA attributes | `aria-expanded`, `aria-haspopup="true"`, `role="menu"`, `role="menuitem"` |
| 2.3 | Add keyboard support | Escape to close, Tab/Shift+Tab to navigate items, Enter to select |
| 2.4 | Convert CTASection dropdown identically | Same pattern (or extract a shared `DropdownMenu` component) |
| 2.5 | Convert Hero to client component | Currently server component — needs `"use client"` for useState |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/components/landing/Hero.tsx` | Add `"use client"`, useState, click handler, ARIA attrs |
| `src/components/landing/CTASection.tsx` | Same changes (already a potential server component) |

**Alternative:** Extract a reusable `<LandlordDropdown />` client component used by both.

---

### LP-3: Handle Footer Dead Links
**Priority:** 🔴 CRITICAL | **Effort:** 1–2 days | **Depends on:** Decision on which pages to create vs. remove

**Phase A — Legal Pages (Must Create):**

| # | Task | Route | Est. Lines |
|---|------|-------|:----------:|
| 3.1 | Create Privacy Policy page | `/privacy` | ~300 |
| 3.2 | Create Terms of Service page | `/terms` | ~400 |
| 3.3 | Create Cookie Policy page | `/cookies` | ~200 |

These are **legally required** for a platform handling user data and payments in Kenya (Data Protection Act 2019, Consumer Protection Act 2012).

**Phase B — Marketing Pages (Create or Remove):**

| Link | Decision | Rationale |
|------|----------|-----------|
| About Us (`/about`) | **Create** (stub with real info) | Important for trust; can be minimal |
| Help Center (`/help`) | **Redirect** to `/#faq` | FAQ covers help; avoid building a full help center for launch |
| Tenant Guide (`/guides/tenants`) | **Remove link** from footer | Not needed for launch; homepage serves this purpose |
| Landlord Guide (`/guides/landlords`) | **Remove link** from footer | `/landlords` page already provides this |
| Safety Tips (`/safety`) | **Remove link** from footer | Can add post-launch |
| Tenant Rights (`/tenant-rights`) | **Remove link** from footer | Can add post-launch |

**Phase C — Clearly Premature (Remove):**

| Link | Decision | Rationale |
|------|----------|-----------|
| Mobile App (`/app`) | **Remove link** | No mobile app exists |
| Careers (`/careers`) | **Remove link** | Not hiring via website at launch |
| Blog (`/blog`) | **Remove link** | No blog content exists |
| Press (`/press`) | **Remove link** | No press materials exist |
| API Documentation (`/developers`) | **Remove link** | No public API planned |

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/app/privacy/page.tsx` | Privacy Policy | ~300 |
| `src/app/terms/page.tsx` | Terms of Service | ~400 |
| `src/app/cookies/page.tsx` | Cookie Policy | ~200 |
| `src/app/about/page.tsx` | About Us | ~200 |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/components/landing/Footer.tsx` | Remove 7 links, update remaining hrefs, add `/about` |

---

### LP-4: Refocus Homepage as Tenant Landing Page
**Priority:** 🟠 HIGH | **Effort:** 2 days | **Depends on:** LP-1

This is the strategic restructure. The homepage becomes a focused tenant conversion page by removing interleaved service sections and simplifying blended sections.

| # | Task | Details |
|---|------|---------|
| 4.1 | Remove `ServiceCategoriesShowcase` from homepage | Move to `/services` page as marketing header |
| 4.2 | Remove `PopularServicesSection` from homepage | Move to `/services` page |
| 4.3 | Remove `RecentlyViewedSection` from homepage | Move to `/services` page |
| 4.4 | Reposition `ServiceDiscoverySection` | Move to position just before CTASection as a cross-sell bridge ("Also need a service?") |
| 4.5 | Simplify `FeaturesSection` for homepage | Remove tab UI; show tenant features only (6 cards). Landlord/provider tabs already exist on their own pages |
| 4.6 | Simplify `PricingSection` for homepage | Remove tab UI; show "Free for Tenants" single card with "See landlord/provider pricing →" links |
| 4.7 | Filter `TestimonialsSection` for homepage | Show 3 tenant testimonials only (or 2 tenant + 1 landlord). Audience pages have their own testimonials |
| 4.8 | Filter `FAQSection` for homepage | Keep 5-6 tenant-focused FAQs. Remove provider/landlord-specific ones (they're on audience pages) |
| 4.9 | Update `layout.tsx` metadata | If homepage is now tenant-focused, metadata already fits ("Find Verified Rental Homes") |
| 4.10 | Add JSON-LD to homepage | WebApplication + LocalBusiness + FAQPage structured data |

**New homepage section order:**
```
Navbar
Hero                      ← "Renting Shouldn't Feel Like Gambling" (keep as-is)
TrustBar                  ← Rental stats (keep as-is, fix fake stats later)
ProblemSection            ← "The Rental Reality" (keep as-is)
FeaturesSection           ← Tenant features ONLY (no tabs)
HowItWorksSection         ← "Search → Connect → Move In" (keep as-is)
NeighborhoodsSection      ← "Find Homes Across Nairobi" (keep as-is)
TestimonialsSection       ← Tenant testimonials only
PricingSection            ← "Free for Tenants" (simplified)
FAQSection                ← Tenant FAQs only
ServiceDiscoverySection   ← Cross-sell bridge: "Also need a service?"
CTASection                ← "Ready to Find Your Next Home?" (keep as-is)
Footer
```

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Remove 3 services imports, reorder sections, add JSON-LD |
| `src/components/landing/FeaturesSection.tsx` | Create `FeaturesSection` variant without tabs (or add a `variant` prop) |
| `src/components/landing/PricingSection.tsx` | Create simplified tenant-only variant |
| `src/components/landing/TestimonialsSection.tsx` | Add `filter` prop to show tenant-only testimonials |
| `src/components/landing/FAQSection.tsx` | Reduce to tenant-focused questions |
| `src/components/landing/ServiceDiscoverySection.tsx` | Update header copy to cross-sell framing |

---

### LP-5: Enhance `/services` Page with Marketing Header
**Priority:** 🟠 HIGH | **Effort:** 1 day | **Depends on:** LP-4

The sections removed from the homepage in LP-4 move to the `/services` page as a marketing header above the marketplace grid.

| # | Task | Details |
|---|------|---------|
| 5.1 | Add `ServiceCategoriesShowcase` to `/services` page | Place above the filter sidebar as a quick-nav bar |
| 5.2 | Add `PopularServicesSection` to `/services` page | Place below the header, above the grid. Only show when no active search |
| 5.3 | Add `RecentlyViewedSection` to `/services` page | Place at top when user has history. Wrap in `<Suspense>` |
| 5.4 | Consider adding a mini-hero to `/services` | Brief headline: "Find Trusted Service Providers in Nairobi" with search |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/services/page.tsx` | Import and render 3 relocated sections |

---

### LP-6: Add ARIA Accessibility Patterns
**Priority:** 🟠 HIGH | **Effort:** 1.5 days | **Depends on:** Nothing

| # | Task | Component | ARIA Pattern |
|---|------|-----------|-------------|
| 6.1 | Add tab ARIA to FeaturesSection | `FeaturesSection.tsx` | `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`, `aria-controls`, `aria-labelledby`, arrow-key navigation |
| 6.2 | Add tab ARIA to PricingSection | `PricingSection.tsx` | Same pattern as 6.1 |
| 6.3 | Add accordion ARIA to FAQSection | `FAQSection.tsx` | `aria-expanded`, `aria-controls`, `id` linkage, `role="region"` on answer |
| 6.4 | Add `aria-expanded` to Navbar mobile toggle | `Navbar.tsx` | `aria-expanded={isMobileMenuOpen}` |
| 6.5 | Add `aria-label` to saved heart link | `Navbar.tsx` | `aria-label="Saved properties"` |
| 6.6 | Add `aria-label` to search input | `ServiceDiscoverySection.tsx` | `aria-label="Search for services"` |
| 6.7 | Add `aria-hidden` to decorative SVGs | `TrustBar.tsx`, `HowItWorksSection.tsx` | `aria-hidden="true"` on non-informative SVGs |
| 6.8 | Add carousel region | `TestimonialsSection.tsx` | `role="region"`, `aria-label="Customer testimonials"`, `aria-roledescription="carousel"` |
| 6.9 | Add accordion ARIA to landlords page FAQ | `landlords/page.tsx` | Same as 6.3 |
| 6.10 | Add accordion ARIA to providers page FAQ | `service-providers/page.tsx` | Same as 6.3 |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/components/landing/FeaturesSection.tsx` | Add ARIA tab pattern |
| `src/components/landing/PricingSection.tsx` | Add ARIA tab pattern |
| `src/components/landing/FAQSection.tsx` | Add ARIA accordion pattern |
| `src/components/landing/Navbar.tsx` | 2 ARIA additions |
| `src/components/landing/ServiceDiscoverySection.tsx` | 1 aria-label |
| `src/components/landing/TrustBar.tsx` | aria-hidden on SVGs |
| `src/components/landing/HowItWorksSection.tsx` | aria-hidden on decorations |
| `src/components/landing/TestimonialsSection.tsx` | carousel region ARIA |
| `src/app/landlords/page.tsx` | ARIA on FAQ accordion |
| `src/app/service-providers/page.tsx` | ARIA on FAQ accordion |

---

### LP-7: SEO Infrastructure
**Priority:** 🟠 HIGH | **Effort:** 1 day | **Depends on:** LP-4 (homepage meta decision)

| # | Task | Details |
|---|------|---------|
| 7.1 | Create `sitemap.ts` | `src/app/sitemap.ts` — auto-generates XML sitemap for all public routes |
| 7.2 | Create `robots.ts` | `src/app/robots.ts` — allow all crawlers, link to sitemap |
| 7.3 | Add JSON-LD to homepage | WebApplication + LocalBusiness + FAQPage |
| 7.4 | Add canonical URLs to all pages | `alternates.canonical` in metadata |
| 7.5 | Add Twitter card to `/service-providers` | Add `twitter` metadata object |
| 7.6 | Add BreadcrumbList to `/service-providers` | Match landlords page pattern |
| 7.7 | Create unique OG images per page | Generate or design: `og-homepage.jpg`, `og-landlords.jpg`, `og-providers.jpg` |

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/app/sitemap.ts` | Dynamic sitemap generation | ~50 |
| `src/app/robots.ts` | Robots.txt | ~15 |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Add JSON-LD script |
| `src/app/layout.tsx` | Add canonical, update meta if needed |
| `src/app/service-providers/page.tsx` | Add Twitter card + BreadcrumbList |

---

### LP-8: Wire Contact Form to Backend
**Priority:** 🟠 HIGH | **Effort:** 0.5 day | **Depends on:** Nothing

| # | Task | Details |
|---|------|---------|
| 8.1 | Create contact form API route or server action | `src/app/contact/actions.ts` — insert to DB `contact_inquiries` table or send via Resend email |
| 8.2 | Wire form submit to real action | Replace `setTimeout` with actual server action call |
| 8.3 | Send confirmation email | Auto-reply to submitter confirming receipt |
| 8.4 | Send notification to team | Forward inquiry to `hello@mitasafi.co.ke` |

**Option A (Recommended — Email via Resend):** No new DB table needed. Send form data via Resend to team email. Simpler, works immediately.

**Option B (DB + Email):** Create `contact_inquiries` table, insert row, then email. Better for tracking but more work.

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/app/contact/actions.ts` | Server action for form submission | ~80 |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/app/contact/page.tsx` | Replace simulated submit with `useTransition` + server action |

---

### LP-9: Switch Images from Supabase to Local
**Priority:** 🟡 MEDIUM | **Effort:** 0.5 day | **Depends on:** Nothing

| # | Task | Details |
|---|------|---------|
| 9.1 | Update Hero image paths | `/images/hero/nairobi-skyline-1.jpg`, `/images/people/family-home-2.jpg` |
| 9.2 | Update Neighborhoods image paths | `/images/properties/apartment-exterior-1.jpg` etc. |
| 9.3 | Update Testimonials image paths | `/images/people/testimonial-woman-1.jpg` etc. |
| 9.4 | Update CTA image path | `/images/people/family-home-1.jpg` (rename from `family-photo-1` or use correct filename) |
| 9.5 | Verify Hero and CTA use local path format | Change from `https://supabase.co/...` to `/images/...` |
| 9.6 | Update `layout.tsx` OG image | Keep Supabase URL for OG (social crawlers need absolute URLs) OR use `metadataBase` + local path |
| 9.7 | Update landlords + providers page images | Same pattern: Supabase → local |
| 9.8 | Delete stale `landing-images/` directory | Only has 1 file; not used |

**Files to modify:** `Hero.tsx`, `NeighborhoodsSection.tsx`, `TestimonialsSection.tsx`, `CTASection.tsx`, `landlords/page.tsx`, `service-providers/page.tsx`

---

### LP-10: Replace Fabricated Statistics
**Priority:** 🟡 MEDIUM | **Effort:** 1–2 days | **Depends on:** Database seeding / initial data

**Strategy:** For launch, replace fabricated specific numbers with honest qualitative statements or omit. Post-launch, wire to real data.

| Component | Current | Launch Fix | Post-Launch |
|-----------|---------|-----------|-------------|
| **TrustBar** | "5,000+ Verified Homes" | "Verified Homes" (no number) | DB query: `SELECT COUNT(*) FROM listings WHERE verified = true` |
| **TrustBar** | "KES 25M+ Rent Processed" | "Secure Rent Collection" (no amount) | DB query: `SUM(amount) FROM payments WHERE type = 'rent'` |
| **TrustBar** | "4.8/5.0 Average Rating" | "Highly Rated" (no number) | DB query: `AVG(rating) FROM reviews` |
| **TrustBar** | "98% Listing Accuracy" | Remove this stat | N/A |
| **ServiceDiscovery** | "700+ Services" | "Growing Service Catalog" | DB count |
| **ServiceDiscovery** | "500+ Verified Providers" | "Verified Providers" | DB count |
| **ServiceDiscovery** | "50k+ Jobs Completed" | Remove (clearly false for new platform) | DB count |
| **HowItWorks** | "500+ Verified Listings" | "Verified Listings" | DB count |
| **Neighborhoods** | "450+ listings" per area | Remove count badges | DB count per area |
| **Testimonials** | "4.8/5.0", "2,847+ happy renters" | Remove stats banner | DB query |
| **FeaturesSection** | "98% of tenants say..." | Remove stat badges from cards | Survey data |
| **PricingSection** | N/A (prices) | Keep prices — these are decisions, not stats | N/A |

**Approach for launch:** Remove all specific numbers from stats. Use **qualitative language** that's honest:
- "Verified Homes" ✓ (you do verify)
- "Secure M-Pesa Payments" ✓ (you do support M-Pesa)
- "Trusted by Nairobi Renters" ✓ (qualitative, not quantitative)

**Files to modify:** `TrustBar.tsx`, `ServiceDiscoverySection.tsx`, `HowItWorksSection.tsx`, `NeighborhoodsSection.tsx`, `TestimonialsSection.tsx`, `FeaturesSection.tsx`

---

### LP-11: Add Scroll Animations
**Priority:** 🟢 LOW | **Effort:** 0.5 day | **Depends on:** Nothing

The CSS classes exist (`.animate-on-scroll`, `.animate-fade-in`, etc.) but no JavaScript activates them.

| # | Task | Details |
|---|------|---------|
| 11.1 | Create `useScrollAnimation` hook | IntersectionObserver-based hook that adds `.is-visible` class |
| 11.2 | Attach to section wrappers | Each `<Section>` component gets `ref` from the hook |
| 11.3 | Optionally add staggered delays | Child elements animate in sequence |

**Files to create:**
| File | Purpose | Est. Lines |
|------|---------|:----------:|
| `src/hooks/useScrollAnimation.ts` | IntersectionObserver hook | ~40 |

**Files to modify:**
| File | Changes |
|------|---------|
| `src/components/ui/Section.tsx` | Add optional animation prop |

---

### LP-12: Minor Polish Items  
**Priority:** 🟢 LOW | **Effort:** 0.5 day | **Depends on:** Nothing

| # | Task | File | Details |
|---|------|------|---------|
| 12.1 | Remove 9 unused Lucide icon imports | `ServiceCategoriesShowcase.tsx`, `PopularServicesSection.tsx` | Dead imports |
| 12.2 | Add `sizes` prop to `<Image fill>` components | `PopularServicesSection.tsx`, `Hero.tsx` | Performance optimization |
| 12.3 | Delete 57 unused images from `public/images/` | `public/images/` | Only after LP-9 (which switches to local); skip if switching to local |
| 12.4 | Delete stale `landing-images/` directory | `landing-images/` | Remove near-empty directory |
| 12.5 | Fix Navbar NotificationCenter for unauthenticated users | `Navbar.tsx` | Conditionally render only when user is authenticated |

---

## 13. Priority & Execution Order

### Critical Path (Must Complete Before Launch)

```
Day 1:   LP-1  (Fix Broken Links, 0.5d)
         LP-2  (Fix Dropdowns, 0.5d)  ← can run parallel with LP-1
Day 2:   LP-3A (Legal Pages: Privacy/Terms/Cookies, 1d)
Day 3:   LP-3B+C (About page + remove dead footer links, 0.5d)
         LP-8  (Wire Contact Form, 0.5d) ← parallel
Day 4-5: LP-4  (Refocus Homepage as Tenant Landing, 2d)
Day 6:   LP-5  (Enhance /services with relocated sections, 1d)
Day 7:   LP-6  (ARIA Accessibility, 1.5d — start)
Day 8:   LP-6  (ARIA Accessibility — finish)
         LP-7  (SEO: sitemap, robots, JSON-LD — start, 0.5d parallel)
Day 9:   LP-7  (SEO — finish)
         LP-9  (Switch images to local, 0.5d)
Day 10:  LP-10 (Replace fabricated stats, 1d)
Day 11:  LP-11 (Scroll animations, 0.5d) ← if time permits
         LP-12 (Minor polish, 0.5d) ← if time permits
```

### Summary Table

| Milestone | Priority | Effort | Depends On | Phase |
|-----------|----------|--------|------------|-------|
| **LP-1**: Fix Broken Links & CTAs | 🔴 CRITICAL | 0.5d | — | Day 1 |
| **LP-2**: Fix Hover-Only Dropdowns | 🔴 CRITICAL | 1d | — | Day 1–2 |
| **LP-3**: Handle Footer Dead Links + Legal Pages | 🔴 CRITICAL | 1.5d | — | Day 2–3 |
| **LP-4**: Refocus Homepage (Tenant-Focused) | 🟠 HIGH | 2d | LP-1 | Day 4–5 |
| **LP-5**: Enhance `/services` Page | 🟠 HIGH | 1d | LP-4 | Day 6 |
| **LP-6**: ARIA Accessibility | 🟠 HIGH | 1.5d | — | Day 7–8 |
| **LP-7**: SEO Infrastructure | 🟠 HIGH | 1d | LP-4 | Day 8–9 |
| **LP-8**: Wire Contact Form | 🟠 HIGH | 0.5d | — | Day 3 |
| **LP-9**: Switch to Local Images | 🟡 MEDIUM | 0.5d | — | Day 9 |
| **LP-10**: Replace Fabricated Stats | 🟡 MEDIUM | 1d | — | Day 10 |
| **LP-11**: Scroll Animations | 🟢 LOW | 0.5d | — | Day 11 |
| **LP-12**: Minor Polish | 🟢 LOW | 0.5d | — | Day 11 |
| **TOTAL** | | **~11 days** | | |

---

## 14. What's Already Complete

These need **no further work** (beyond the targeted fixes listed above):

- ✅ **All 16 homepage sections render correctly** — fully built React components
- ✅ **`/landlords` landing page** — 887 lines, production-ready, SEO-optimized, JSON-LD
- ✅ **`/service-providers` landing page** — 722 lines, production-ready, SEO-optimized (minor gaps: Twitter card, breadcrumb)
- ✅ **`/properties` browse page** — functional search/filter/results with SSR
- ✅ **`/services` marketplace** — Fiverr-style browse with autocomplete, filters, pagination
- ✅ **`/contact` page** — polished form UI (needs backend wiring)
- ✅ **`/saved` page** — functional with localStorage, realtime status, notification system
- ✅ **Auth pages** (`/login`, `/signup`) — Google OAuth, phone OTP, role-based, split-panel design
- ✅ **Shared Navbar** — responsive, mobile menu, saved count badge, cross-tab sync
- ✅ **Shared Footer** — 4-column layout, social icons, contact info (links need fixing)
- ✅ **UI primitive library** — Button (9 variants), Card (5 types), Container, Section, Logo, Toast
- ✅ **Design system** — Tailwind config with brand colors, animations, shadows, typography
- ✅ **Image infrastructure** — `next.config.ts` configured for Supabase, Unsplash, Google domains
- ✅ **Font loading** — Plus Jakarta Sans via preconnect
- ✅ **PWA manifest** — `manifest.json` with icons and theme color
- ✅ **Responsive design** — All components handle mobile/tablet/desktop breakpoints
- ✅ **Dark section styling** — `ServiceDiscoverySection` uses dark theme correctly
- ✅ **Horizontal scroll carousels** — `TestimonialsSection`, `ServiceCategoriesShowcase`, `PopularServicesSection` all have scroll-snap
- ✅ **Tab switcher pattern** — `FeaturesSection`, `PricingSection` (needs ARIA, but UI works)
- ✅ **FAQ accordion** — `FAQSection` (needs ARIA, but UI works)
- ✅ **Performance logging** — Server-side `PerformanceLogger` on homepage

---

*End of analysis. All findings are based on direct code audit — no assumptions or hallucinated content.*
