# Provider Profile Page — Expert Redesign Documentation

## Scope
- Route: `/services/provider/[id]`
- Objective: Deliver a cleaner, professional marketplace profile UX that can compete with high-trust service marketplaces.
- Constraints respected:
  - Existing data model retained (no schema changes required).
  - Existing route contracts and key interactions preserved.
  - Existing service detail and request flows preserved.

## Live Ecosystem Data Validation (Target Provider)
Provider tested: `98f949aa-02d9-4824-a1a9-9509afbe61c5`

### Query Summary
- `service_providers`: found
  - business_name: Arun Bru
  - verified: true
  - rating: null (0 reviews)
  - total_jobs_completed: 0
  - response_time_minutes: null
  - cover_photo_url: null
  - profile_photo_url: present
  - headline/tagline: present
  - bio: present
  - phone: present
  - whatsapp: null
  - years_experience: `10_plus`
  - languages: English, Swahili
- `provider_services`: 3 active services
- `provider_service_areas`: 7 areas
- `reviews`: 0

### Design Implication
This provider represents a **common early-lifecycle profile state**:
- strong service inventory + location coverage,
- sparse social proof (no reviews yet),
- incomplete SLA trust metric (missing response time),
- verified identity signal present.

The redesign explicitly handles this state so the page still feels premium and trustworthy.

## Design System Strategy
The redesign is based on five professional marketplace principles:

1. **Trust-First Above the Fold**
   - Hero now surfaces verification, rating context, jobs, experience, and coverage immediately.
   - Uses layered visual hierarchy: cover backdrop, profile identity card, and trust chips.

2. **Conversion-Focused Right Rail**
   - Sticky interaction card with primary and secondary actions.
   - Fast decision path: Request → WhatsApp → Call.
   - CTA placement follows high-intent behavior patterns from mature marketplaces.

3. **Data-Dense, Scan-Friendly Core**
   - “At a glance” tiles summarize key decision metrics.
   - Service cards remain central content block.
   - Supporting facts are separated from narrative content for faster scanning.

4. **Professional Empty-State Design**
   - Explicit review empty state for new providers.
   - Placeholder trust labels when response-time isn’t published.
   - This avoids blank sections and preserves visual quality.

5. **Progressive Disclosure**
   - Hero: identity and confidence signals.
   - Main column: service evaluation.
   - Sidebar: operational detail and communication channels.

## Information Architecture (New)

### 1) Sticky Top Nav
- Clear back-navigation context for both shopper and owner states.
- Share/edit actions preserved.

### 2) Premium Hero Band
- Cover image fallback strategy:
  - provider cover photo,
  - else first service image,
  - else gradient.
- Profile avatar with online indicator.
- Verification/member chips.
- Trust chips for rating, jobs, experience, response-time state, and service area summary.

### 3) Main Column
- **At a glance** metric grid.
- **About this provider** narrative block.
- **Services by this provider** (existing card system retained).
- **Coverage and communication** (areas + languages).
- **Trust and verification** badges.
- **Reviews** with robust no-review presentation.
- **Similar providers** retained for marketplace discovery.

### 4) Sticky Sidebar
- **Start a conversation** conversion card.
- **Business facts** compact metadata module.
- **Availability** schedule matrix.
- **Social links** retained.

### 5) Mobile Bottom Bar
- Persistent, compact CTA cluster:
  - Request,
  - WhatsApp icon,
  - Call icon.

## Why This Competes Better
- Better top-level **visual confidence** (premium hero + disciplined spacing + chip system).
- Better **decision speed** via grouped metrics and reduced cognitive scatter.
- Better **new-provider resilience** (no-review/no-response-time does not degrade UI quality).
- Better **conversion architecture** with sticky, hierarchical CTAs and mobile persistence.

## Data Model Coverage Mapping
- `service_providers`
  - Identity/hero/trust: `business_name`, `profile_photo_url`, `cover_photo_url`, `is_verified`, `created_at`, `last_active_at`
  - proof metrics: `average_rating`, `total_reviews`, `total_jobs_completed`, `response_time_minutes`, `years_experience`, `years_in_business`
  - contact: `phone`, `whatsapp`
  - communication: `languages`
- `provider_services` + `services`
  - service cards and pricing content (`custom_pricing`, service metadata)
- `provider_service_areas`
  - coverage chips and locality summary
- `reviews`
  - social proof and review feed/empty state

## Accessibility + UX Quality
- Preserved semantic headings and readable hierarchy.
- Interactive controls kept with strong contrast and consistent hit areas.
- Mobile action bar ensures high-intent actions remain reachable.
- Visual rhythm improved with card containers, spacing scale consistency, and stronger section separation.

## Notes for Further Competitive Upgrades (Optional Next Wave)
- Add provider-level response SLA confidence indicator (derived percentile vs category median).
- Add per-service trust badges (e.g., "Most booked", "Fast response").
- Add review sentiment distribution module once enough review volume exists.
- Add service-coverage map preview for providers with many areas.

## Files Updated
- `src/app/services/provider/[id]/page.tsx`
- `PROVIDER_PROFILE_PAGE_REDESIGN_EXPERT_NOTES.md`
