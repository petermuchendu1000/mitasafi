# Service Detail Page — Expert Redesign Documentation

## Scope
- Route redesigned: `/services/provider/[id]/service/[serviceId]`
- Target URL validated: `/services/provider/98f949aa-02d9-4824-a1a9-9509afbe61c5/service/c05defcf-2177-4a17-8e22-7bb313a2e95b`
- Goal: Build a clean, premium, conversion-centric service detail experience aligned with top marketplaces (Fiverr-class decision flow).

## Live Database Grounding (Query-Driven)
The redesign was not based on assumptions; it was anchored to live Supabase data for this specific provider and service.

### Provider Snapshot
- business_name: Arun Bru
- verified: true
- rating/reviews: null average, 0 reviews
- total_jobs_completed: 0
- response_time_minutes: null
- phone: available
- whatsapp: null (fallback to phone used)
- languages: English, Swahili
- service areas: 7

### Service Snapshot (provider_service)
- provider_service_id: `c05defcf-2177-4fc6-90dd-bb654f9bd1a7` (sample sibling)
- target provider_service_id: `c05defcf-2177-4a17-8e22-7bb313a2e95b`
- service_name: Bathroom Plumbing Installation
- category: Plumbing
- subcategory: null
- pricing: fixed, KES 3000
- image_urls: present
- custom description: present

### Ecosystem Snapshot
- other active services by same provider: 2
- active providers offering same service_id: 1
- service-specific review count for this provider/service: 0

## Redesign Objectives (Professional Marketplace Lens)
1. **Instant confidence in first 3 seconds**
   - Hero must communicate what the service is, who offers it, and what it costs.
2. **Decision architecture over decorative design**
   - Primary conversion path should be obvious and persistent (Request service).
3. **Trust under sparse data conditions**
   - New/sparse providers should still look premium and credible.
4. **High scanability, low cognitive load**
   - Use compact fact blocks and chips; avoid long, unstructured text walls.
5. **Cross-device consistency**
   - Sticky desktop right-rail + persistent mobile action bar.

## Information Architecture (New)

### 1) Sticky Navigation Layer
- Breadcrumb context with direct provider return.
- Desktop quick link to provider profile for cross-page trust continuity.

### 2) Premium Service Hero
- Background image strategy:
  - first service image,
  - else provider cover,
  - else provider profile fallback.
- Overlay gradient improves text readability across media quality variance.
- Includes:
  - category/subcategory context chip,
  - service title,
  - provider identity + verified badge,
  - rating summary,
  - price positioning,
  - market-supply chip (“X providers offer this”).

### 3) Main Content Stack (Left)
- **Service Content Card**
  - gallery,
  - pricing/service chips,
  - complete service description,
  - secondary canonical service description when custom copy differs.
- **Service Facts Card**
  - category, pricing model, displayed price, response profile, coverage summary.
- **Provider Snapshot Card**
  - quick provider profile + trust metrics.
- **More Services Card**
  - keeps browsing momentum inside same provider context.

### 4) Conversion/Trust Rail (Right)
- **Price + Action Card**
  - dominant CTA: Request service,
  - supporting channels: WhatsApp, Call,
  - trust microcopy.
- **Trust Card**
  - explicit statements for verification, response transparency, and service-area breadth.
  - designed to reduce buyer hesitation when review volume is low.

### 5) Mobile Conversion Layer
- Sticky bottom bar with:
  - price label,
  - optional WhatsApp/Call quick actions,
  - primary Request CTA.

## Why This Is More Competitive

### Professionalism Gains
- Stronger visual rhythm via cardized sections and consistent spacing scale.
- Cleaner hierarchy: primary intent (request) is not diluted by secondary content.
- Better “platform quality” perception from premium hero treatment and trust chip language.

### Conversion Gains
- CTA is visible in hero context, right rail, and mobile sticky bar.
- Contact alternatives (WhatsApp/Call) are preserved but subordinate to primary booking path.
- Reduced “decision friction” by exposing key facts without scrolling through long prose.

### Trust Gains
- Verifiable claims are surfaced in compact modules.
- Missing data states are handled explicitly (“not published yet”), avoiding visual ambiguity.
- Provider profile linkage remains persistent for deeper due diligence.

## Data Model to UI Mapping

### `service_providers`
- `business_name`, `is_verified`, `average_rating`, `total_reviews`, `total_jobs_completed`, `response_time_minutes`, `profile_photo_url`, `cover_photo_url`, `phone`, `whatsapp`, `languages`

### `provider_services`
- `id`, `service_id`, `custom_pricing` (`type`, `amount`, `description`, `image_urls`), `created_at`

### `services`
- `name`, `description`, category/subcategory relations

### `provider_service_areas`
- coverage labels and locality summary

### `reviews`
- service-specific review count and provider trust context

## Edge-Case Handling Built Into the Redesign
- No reviews -> still premium trust copy and structure.
- No response-time -> transparent “not published yet” state.
- Missing subcategory -> category-only display remains coherent.
- Missing media -> deterministic fallback image strategy.

## Accessibility and UX Quality
- Large, consistent touch targets for actions.
- Readable contrast over image backgrounds via overlay.
- Clear section labels and concise microcopy.
- Mobile-first CTA persistence to preserve intent after scroll.

## Files Updated
- `src/app/services/provider/[id]/service/[serviceId]/page.tsx`
- `SERVICE_DETAIL_PAGE_REDESIGN_EXPERT_NOTES.md`

## Recommended Next Step (Optional)
- Apply the same visual language tokens to loading skeletons for perceived-quality parity during async fetch states.
