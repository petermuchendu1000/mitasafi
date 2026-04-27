# Arun Bru — Provider Card Deep Analysis

> **Scope**: End-to-end audit of how a real provider's data flows from capture → storage → query → rendering, using "Arun Bru" as the case study.  
> **Date**: 2026-03-05  
> **Verdict**: Critical pipeline breakage. The browse card is functionally blind to what real providers write.

---

## 1. WHO IS ARUN BRU?

"Arun Bru" is **not a seeded demo provider**. They do not appear in:

- `supabase/seed_demo_providers.sql` (25 deterministic-UUID providers)
- `scripts/seed-providers-full.mjs` (20 JS-seeded providers)

This means Arun Bru is a **real user who registered through the app**, went through the onboarding flow, and added services via the dashboard wizard. This distinction is critically important because:

> The entire browse card pipeline was designed and tested against **seeded demo data** that follows a different write path than the live application.

---

## 2. THE TWO WRITE PATHS — AND WHY THEY DIVERGE

### Path A: Seed Data (Demo Providers)

```sql
-- seed_demo_providers.sql, line 27
INSERT INTO service_providers (
  ..., tagline, headline, ...
) VALUES (
  ..., 'Spotless cleaning, every time', 'Professional Cleaning Services', ...
);
```

**Both `tagline` AND `headline` columns are populated.** The seed also inserts `provider_services` with `custom_pricing` containing `image_urls` (hardcoded S3/Supabase URLs).

### Path B: Live App (Real Providers like Arun Bru)

**Step 1 — Registration**: Phone/social auth → `service_providers` row created with minimal fields (`user_id`, `business_type`). `tagline` = NULL. `headline` = NULL.

**Step 2 — Profile Wizard** (`/dashboard/provider/profile`):

| Step | What's collected | DB column written |
|------|-----------------|-------------------|
| Photo | Profile photo upload | `profile_photo_url` |
| Basics | **"Headline"** (10-80 chars), bio, experience, languages | **`headline`** ← written, **`tagline`** ← NOT written |
| Areas | Neighborhoods | `provider_service_areas` |
| Hours | Working hours | `provider_availability_intervals` |
| Socials | Social links | `social_links` |

**The form field is labeled "Headline" but the helper text says "A short tagline that appears in search results".**

The server action `updateProfileBasics()` at [`actions.ts:280`](src/app/dashboard/provider/profile/actions.ts#L280):
```typescript
.update({
  headline: data.headline.trim(),    // ← writes ONLY headline
  bio: data.bio.trim(),
  years_experience: data.years_experience || null,
  languages: data.languages || [],
})
```

**`tagline` is NEVER written by any form in the entire application.**

**Step 3 — Service Wizard** (`/dashboard/provider/services/new`):

| Step | What's collected |
|------|-----------------|
| 1. Categories | Category IDs (multiple) |
| 2. Services | Selected services from those categories |
| 3. Pricing | Per-service: price amount, price type (fixed/starting_from/quote) |
| 4. Areas | Neighborhood IDs for coverage |
| 5. Descriptions & Photos | Per-service: description (optional, 200 chars), images (1-3, **required**) |
| 6. Review | Read-only confirmation |

On submit, each service becomes a `provider_services` row:
```typescript
custom_pricing: {
  amount: service.customPrice,
  type: service.priceType || 'fixed',
  description: service.description || null,    // per-service description
  image_urls: service.imageUrls?.length ? service.imageUrls : null,  // 1-3 images
}
```

---

## 3. WHAT ARUN BRU LIKELY HAS IN THE DATABASE

Based on the write paths above, a provider who completed the full onboarding flow has:

| Column | Value | Write Source |
|--------|-------|-------------|
| `headline` | `"Professional Painting & Fumigation Services"` (example) | Profile form |
| `tagline` | **`NULL`** | Nothing writes to it |
| `bio` | `"I specialize in..."` (100-500 chars) | Profile form |
| `profile_photo_url` | Uploaded photo URL | Profile form |
| `cover_photo_url` | **`NULL`** | Nothing writes to it |
| `portfolio_images` | **`NULL`** | Only seed data has this |

For each of Arun Bru's services (e.g., 3 services):

| `provider_services` row | Value |
|------------------------|-------|
| `service_id` | FK to `services` table |
| `custom_pricing.amount` | e.g., 2500 |
| `custom_pricing.type` | e.g., "starting_from" |
| `custom_pricing.description` | e.g., "Interior and exterior painting..." |
| `custom_pricing.image_urls` | `["https://...supabase.co/.../img1.jpg", "https://...img2.jpg"]` |

---

## 4. HOW MANY SERVICES DOES ARUN BRU OFFER?

**Answer: Unknown from frontend code alone** — we'd need a DB query. But the system supports **unlimited services per provider**. The service wizard allows selecting multiple services across multiple categories in a single session. A provider can also run the wizard multiple times to add more.

However, the critical question is: **How many of those services are visible to buyers on the browse card?**

---

## 5. HOW MANY SERVICES ARE DISPLAYED ON THE BROWSE CARD?

### What the card currently shows:

| Card Element | Source | Real Provider Value |
|-------------|--------|-------------------|
| **Business Name** | `service_providers.business_name` | ✅ "Arun Bru" |
| **Tagline** | `service_providers.tagline` | ❌ **EMPTY** — `tagline` is NULL, card shows nothing |
| **Category Label** | `getCategoryById(categories[0])?.shortName` | ✅ e.g., "Repairs" — derived from first `provider_services.service.category.slug` |
| **Images** | `provider_services.custom_pricing.image_urls` (flattened, max 3) | ✅ Shows first 3 images across ALL services |
| **Price** | `min_price` (denormalized) or computed from `custom_pricing.amount` | ✅ e.g., "From KES 2,500" |
| **Rating** | `service_providers.average_rating` | Blank if no reviews yet |
| **Location** | `provider_service_areas.area_name` | ✅ e.g., "Westlands, Kilimani +3" |
| **Verified Badge** | `service_providers.is_verified` | Blank unless admin-verified |

### What's MISSING from the card:

| Missing Element | Why | Impact |
|----------------|-----|--------|
| **Headline** (the provider's self-written "tagline") | `SP_BASE_COLUMNS` selects `tagline` not `headline`. `mapProviderRow` maps `provider.tagline` to card data. For real providers, this is NULL. | **The most important piece of marketing copy the provider wrote is invisible to buyers.** |
| **Per-service descriptions** | Not extracted in `mapProviderRow`. Descriptions live inside `custom_pricing.description` and are extracted per-service in the detail page, but the card data layer ignores them entirely. | Provider wrote descriptions. Buyers can't see them until they click through. |
| **Service count** | `service_names: string[]` is populated but not displayed on the card (removed per earlier decision). | Buyers don't know how many services this provider offers. |

---

## 6. THE HEADLINE / TAGLINE CRISIS — ROOT CAUSE

This is the **single most critical bug** in the entire browse experience.

### The Bug

```
Provider writes "headline" → DB column `headline` → ✅ Saved
Browse card reads "tagline" → DB column `tagline` → ❌ NULL for all real providers
```

### Why It Happened

1. **Two columns were created for the same concept.** Migration [`20260301000000`](supabase/migrations/20260301000000_add_profile_fields.sql) added both:
   - `headline` — comment: *"Short tagline for provider profile"*
   - `tagline` — comment: *"Marketing tagline for provider"*

2. **The profile form writes to `headline`.** The ProfileBasicsForm field is labeled "Headline" with helper text "A short tagline that appears in search results".

3. **The browse query reads `tagline`.** `SP_BASE_COLUMNS` (line 57 of providers.ts):
   ```
   tagline,
   ```
   It does NOT include `headline`.

4. **`mapProviderRow` maps `tagline` to the card data:**
   ```typescript
   tagline: provider.tagline ?? null,
   ```

5. **The seed data populated BOTH columns.** So during testing with demo data, the card always showed a tagline. The disconnect was invisible.

### The Result for Arun Bru

Arun Bru carefully wrote a headline like *"Professional Painting & Fumigation • 5 Years Experience"*.  
On the browse card, buyers see: **absolutely nothing**. An empty 20px div.

### Impact Assessment

- **Every real provider** (non-seeded) has a blank tagline on their browse card
- **Every search result** for real providers is missing their primary marketing copy
- The headline IS visible on the detail page (line 380: `providerAny.headline || providerAny.tagline`)
- But the browse card — the first thing buyers see — is broken

---

## 7. THE SERVICE IMAGE / CAROUSEL DISCREPANCY

### Browse Card

`mapProviderRow` extracts ALL `custom_pricing.image_urls` from ALL `provider_services` and flattens them into one array, capped at 3:

```typescript
// providers.ts, L169-176
imageUrls.forEach((url) => {
  if (typeof url === "string" && url.trim()) {
    serviceImageUrls.add(url);
  }
});
```

**Problem**: Images from different services are mixed. If Arun Bru has 3 services with 3 images each (9 total), the card shows **any 3** — potentially one from painting, one from fumigation, one from cleaning. There's no guarantee the images are coherent.

**On Fiverr**: Each gig (service) is a separate card with its own images. On MitaSafi, one card aggregates all services' images — creating a visual identity crisis.

### Detail Page  

The public detail page (`/services/provider/[id]/page.tsx`) uses `portfolio_images` from the provider row for the portfolio gallery. **But real providers don't have `portfolio_images`** — that column is only populated by seed data. The detail page's "Work portfolio" section is empty for real providers.

Per-service images ARE extracted in the dashboard's `ServicePreviewClient.tsx` (provider sees their own images), but the public detail page **does not render per-service images in the services list** (lines 475-530). Each service only shows name, category, price, and a "Request" button.

---

## 8. PER-SERVICE DESCRIPTION — THE INVISIBLE FIELD

### What the provider wrote:

In Step 5 of the service wizard, the provider writes a description per service (optional, 200 chars). This is stored in `custom_pricing.description`.

### Where it's visible:

| Surface | Shown? | Code |
|---------|--------|------|
| Dashboard service preview | ✅ Yes | `ServicePreviewClient.tsx:331-339` |
| Dashboard service edit | ✅ Yes | `ServiceEditForm.tsx:201-214` |
| Browse card | ❌ No | Not in `ServiceProviderCardData` |
| Public detail page service list | ❌ No | Extracted at `page.tsx:173` but NOT rendered in JSX (only used in JSON-LD SEO) |
| Search | ❌ No | Not included in `search_vector` |

**The provider writes service descriptions. Buyers never see them.**

---

## 9. COMPLETE BUG & GAP INVENTORY

### 🔴 Critical (Blocking Buyer Value)

| # | Bug | Impact | Root Cause |
|---|-----|--------|-----------|
| **C1** | Browse card shows empty tagline for ALL real providers | Primary marketing copy invisible to buyers | `SP_BASE_COLUMNS` reads `tagline` but app writes to `headline`. Two columns doing one job. |
| **C2** | `headline` column not in card data query | Even if we fixed C1, headline is not selected by `getProviders()` | `SP_BASE_COLUMNS` missing `headline` |
| **C3** | `mapProviderRow` doesn't resolve `headline → tagline` fallback | No fallback chain: `headline || tagline` in the card data layer | `mapProviderRow` only maps `provider.tagline` |

### 🟠 High (Feature Gap)

| # | Gap | Impact | Root Cause |
|---|-----|--------|-----------|
| **H1** | Per-service descriptions never shown to buyers | Providers write descriptions; buyers only see them via SEO JSON-LD (invisible in UI) | Detail page `servicesWithPricing` extracts description but doesn't render it |
| **H2** | Per-service images not shown on public detail page | Service images are provider-facing only (dashboard preview). Buyers see `portfolio_images` which real providers don't have. | Detail page uses `portfolio_images` (seed-only) instead of `custom_pricing.image_urls` |
| **H3** | Image carousel mixes services | 3 images from 3 different services creates visual incoherence | `mapProviderRow` flattens all service image URLs into one set |
| **H4** | `portfolio_images` has no write path for real providers | The "Work portfolio" section on the detail page is always empty for non-seeded providers | No upload UI exists for `portfolio_images` |

### 🟡 Medium (Design Debt)

| # | Issue | Impact | Root Cause |
|---|-------|--------|-----------|
| **M1** | `headline` and `tagline` are duplicate columns | Confusion, bugs, tech debt | Migration added both; no one deprecated the duplicate |
| **M2** | `cover_photo_url` has no write path | Card/detail page fallback to profile photo or placeholder | No upload UI in profile form |
| **M3** | `has_insurance`, `has_business_license`, `has_id_verified` always `false` | Trust signals never populated for card data | Aspirational fields — no verification workflow writes them |
| **M4** | ResponseTime on card can be misleading | Shows raw `response_time_minutes` (e.g., "45 min") which is seed data; real providers don't set this via any form | `response_time_minutes` has no write path in the profile wizard |
| **M5** | FeaturedByPrice uses `"I will " + tagline` | For real providers, displays "I will provide professional services" (fallback) | Null tagline → hardcoded fallback |

### 🔵 Low (Polish)

| # | Issue | Impact |
|---|-------|--------|
| **L1** | Service wizard allows 0 experience years (no validation) | Experience shows as "0 years" |
| **L2** | Category label on card shows first category only — no indication of multi-category providers | Buyer doesn't know provider does both painting AND cleaning |
| **L3** | `providerAny` type casts in detail page | Fragile `as any` → `as string` pattern to access `headline`, `tagline`, etc. |

---

## 10. THE ONE-CARD-PER-PROVIDER PROBLEM

MitaSafi displays **one card per provider** on the browse page, regardless of how many services they offer. This creates a fundamental tension:

| What Fiverr does | What MitaSafi does |
|-----------------|-------------------|
| 1 gig (service) = 1 card | 1 provider = 1 card (aggregating N services) |
| Image shows that specific gig's output | Images from all services are mixed into one carousel |
| Price is for that specific gig | `min_price` is the cheapest service (may mislead) |
| Gig title IS the card headline | Card headline is provider-level headline (if it worked) |
| Click → gig detail page | Click → provider profile + all services |

This is a **design decision**, not a bug. But it means:
- The card image must represent the **provider**, not a specific service
- The price represents the **cheapest available service**
- The "what this person does" question must be answered by `headline` + `categoryLabel`

Given this model, the `headline` column becomes even MORE critical — it's the provider's one chance to tell buyers what they specialize in, on the card.

---

## 11. SOLUTIONS — PRIORITIZED ACTION PLAN

### Phase 1: Critical Fix — Headline Visibility (IMMEDIATE)

**Goal**: Make the provider's self-written headline visible on browse cards.

#### Fix 1A: Add `headline` to `SP_BASE_COLUMNS` and `mapProviderRow`

```typescript
// providers.ts — SP_BASE_COLUMNS
const SP_BASE_COLUMNS = `
  id,
  business_name,
  tagline,
  headline,              // ← ADD
  bio,
  profile_photo_url,
  ...`;

// providers.ts — mapProviderRow
return {
  ...
  tagline: provider.headline || provider.tagline || null,  // ← headline takes priority
  ...
};
```

This is the **minimum viable fix**. It uses the existing `tagline` field in `ServiceProviderCardData` to carry the resolved value, maintaining backward compatibility.

#### Fix 1B: Also write headline → tagline in `updateProfileBasics`

```typescript
// actions.ts — updateProfileBasics
.update({
  headline: data.headline.trim(),
  tagline: data.headline.trim(),    // ← SYNC to tagline for backward compat
  bio: data.bio.trim(),
  ...
})
```

This ensures both columns are populated so that older code paths (search ILIKE fallback on `tagline`, FeaturedByPrice, saved providers list) also work.

---

### Phase 2: Service Display Integrity (HIGH)

#### Fix 2A: Show per-service descriptions on the public detail page

In `src/app/services/provider/[id]/page.tsx`, the `servicesWithPricing` array already has `description`. Render it:

```tsx
<p className="text-sm font-medium text-gray-900">{service.name}</p>
{service.description && (
  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>
)}
```

#### Fix 2B: Replace `portfolio_images` with per-service images on the detail page

Extract `custom_pricing.image_urls` from each `provider_service` and aggregate them into the portfolio gallery (or better: show them per-service). This eliminates the dependency on the seed-only `portfolio_images` column.

#### Fix 2C: Order carousel images by primary service

In `mapProviderRow`, instead of using a `Set` (which loses insertion order), prioritize images from the provider's first/primary service:

```typescript
// First service's images come first in the carousel
const orderedImageUrls: string[] = [];
(provider.provider_services || []).forEach((ps) => {
  const urls = ps.custom_pricing?.image_urls || [];
  urls.forEach((url) => {
    if (!orderedImageUrls.includes(url)) orderedImageUrls.push(url);
  });
});
```

---

### Phase 3: Column Consolidation (MEDIUM)

#### Fix 3A: Deprecate `tagline` column

1. Create migration: `ALTER TABLE service_providers ADD CONSTRAINT tagline_deprecated CHECK (true);` (comment-only marker)
2. Run one-time sync: `UPDATE service_providers SET tagline = headline WHERE headline IS NOT NULL AND (tagline IS NULL OR tagline != headline);`
3. Update all read paths to prefer `headline`
4. Update all write paths to write both (already done in 1B)
5. Eventually drop `tagline` column

#### Fix 3B: Add `headline` to `ServiceProviderCardData` type

If we want the type to be honest:
```typescript
export interface ServiceProviderCardData {
  ...
  headline: string | null;    // Provider's self-written title (primary)
  tagline: string | null;     // Deprecated: seed/legacy fallback
  ...
}
```

Or if consolidating: replace `tagline` with `headline` everywhere.

---

### Phase 4: Missing Write Paths (MEDIUM)

| Missing Form | Column | Suggested Location |
|-------------|--------|-------------------|
| `cover_photo_url` upload | `service_providers.cover_photo_url` | Profile photo step (dual upload) |
| `portfolio_images` upload | `service_providers.portfolio_images` | New profile step OR derive from service images |
| `response_time` selector | `service_providers.response_time`, `response_time_minutes` | Profile form or settings |
| `tagline` direct edit | `service_providers.tagline` | Merge into headline field (write both) |

---

## 12. MILESTONES

> **Implementation Status**: M0–M3 completed on 2026-03-09. All migrations pushed to live DB.

### M0: Critical Path Fix — COMPLETED ✅

- [x] Add `headline` to `SP_BASE_COLUMNS`
- [x] Update `mapProviderRow` to use `headline || tagline || null`
- [x] Update `updateProfileBasics` to write both `headline` and `tagline`
- [x] Run type-check — PASSED clean
- [x] Verify browse cards: `tagline` field now resolves from `headline` for real providers

### M1: Detail Page Service Data — COMPLETED ✅

- [x] Render per-service descriptions in service list (line-clamp-2)
- [x] Aggregate per-service `image_urls` for portfolio gallery (replacing `portfolio_images` dependency)
- [x] Per-service `imageUrls` extracted and available in `servicesWithPricing`

### M2: Image Coherence — COMPLETED ✅

- [x] Order carousel images by primary service (changed from Set to ordered array)
- [x] Images from earlier services appear first in carousel
- [x] Detail page portfolio gallery aggregated from per-service images with attribution

### M3: Column Consolidation — COMPLETED ✅

- [x] Migration `20260309000000`: `UPDATE` syncs existing `headline` → `tagline` for all live providers
- [x] Migration `20260309000000`: `search_vector` GENERATED column rebuilt to include `headline` (weight B)
- [x] GIN index recreated on new `search_vector` column

### M3.1: Seed Data Purge — COMPLETED ✅

- [x] Migration `20260309000001`: All 25 demo providers deleted (UUIDs `10000000-...001` through `...025`)
- [x] Corresponding `auth.users` and `profiles` rows also deleted
- [x] DB verified: **8 real providers remain**, zero demo data

### M4: Missing Write Paths (DEFERRED)

- [ ] Cover photo upload in profile wizard
- [ ] Response time selector in profile settings
- [ ] Portfolio images: derive from service images or add dedicated upload

---

## 13. VERIFICATION RESULTS (Post-Implementation)

### Database Verification (2026-03-09)

| Metric | Value |
|--------|-------|
| Total providers in DB | **8** (all real, zero seeded) |
| Arun Bru headline | "Expert Plumber with 10 years in the construction industry." |
| Arun Bru tagline | "Expert Plumber with 10 years in the construction industry." (synced) |
| Arun Bru services | **4** (all active) |
| Arun Bru total service images | **8** (3 + 1 + 1 + 3) |
| Arun Bru service areas | **7** (Parklands [PRIMARY], Karen, Langata, Hardy, Bomas, Rongai, Ngong) |

### Per-Service Data (Arun Bru)

| Service | Category | Price (KES) | Type | Images | Has Description |
|---------|----------|-------------|------|--------|----------------|
| Drinking Water Delivery | Water & Gas Delivery | 100 | fixed | 3 | ✅ |
| Bathroom Plumbing Installation | Plumbing | 3,000 | fixed | 1 | ✅ |
| Tap Installation | Plumbing | 2,000 | starting_from | 1 | ✅ |
| Kitchen Plumbing Installation | Plumbing | 1,500 | starting_from | 3 | ✅ |

### Pipeline Verification

| Test | Result |
|------|--------|
| Browse card tagline for real provider | ✅ Shows `headline` via `headline \|\| tagline` resolution |
| FeaturedByPrice | ✅ Will show headline (field mapped correctly) |
| search_vector includes headline | ✅ Migration rebuilt GENERATED column with headline weight B |
| Detail page per-service descriptions | ✅ Rendered with line-clamp-2 |
| Detail page portfolio images | ✅ Aggregated from per-service `image_urls` (not empty `portfolio_images`) |
| Carousel image ordering | ✅ Ordered array, not Set (services ordered by listing) |
| TypeScript type-check | ✅ Clean pass, zero errors |
| Demo data deleted | ✅ All 25 seeded providers removed from DB |

---

## 14. ARCHITECTURAL OBSERVATION

The fundamental mismatch is this:

**The codebase was built top-down** (UI → query → type → DB columns) but **tested bottom-up** (SQL seeds → verify cards render). The seeds populated BOTH `tagline` AND `headline`, which masked the broken write-path. When a real human used the app's actual forms to create a provider profile, the pipe from "what they typed" to "what the buyer sees" was broken at the first joint: the profile form writes `headline` but the card reads `tagline`.

This is not a typo. It's a systemic failure of integration testing. The fix is simple. The lesson is: **always test with data created through the actual application flow, not just seeded data.**
