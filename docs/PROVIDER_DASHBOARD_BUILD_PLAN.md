# Provider Dashboard Build Plan — Phased Approach

## Current State Summary

The dashboard has a working shell (layout, sidebar, navigation) with authentication and role-based routing. Beyond that, almost everything is either hardcoded placeholders, partially implemented, or has structural bugs. There are 35+ files and ~6,500 lines already written, so this is about **finishing and fixing**, not starting from scratch.

---

## Guiding Principles

1. **Fix the foundation before adding floors.** Data model inconsistencies and broken types will compound into bugs across every feature. Fix them once, early.

2. **One dataflow at a time.** Each phase should complete a full vertical slice: schema → server action → UI → validation. Half-implemented features cause more confusion than no feature at all.

3. **Defer what providers can't see yet.** Features like Earnings, Reviews, and Jobs depend on a booking system that doesn't exist. Building UI for them now creates dead weight. The sidebar should reflect reality.

4. **The wizard is the critical path.** A provider who can't add services can't do anything. The "Add Services" wizard must work end-to-end before any other feature matters.

5. **Don't duplicate what the layout already fetched.** The cache layer exists and works. Every page should use it instead of making independent Supabase calls.

---

## Phase 0: Foundation Fixes (Prerequisite) ✅ COMPLETE

### What
Fix data model inconsistencies, type mismatches, dead code, and redundant queries that affect every subsequent phase.

### Why First
Every other phase builds on these types, queries, and patterns. Fixing them later means re-touching every file that was built on the broken foundation. The cost of fixing grows linearly with each phase completed on top of bad foundations.

### Specific Tasks

| #   | Task | Why | Effort | Status |
|-----|------|-----|--------|--------|
| 0.1 | Resolve `business` vs `company` type mismatch — `ProviderProfile.provider_type` uses `'individual' \| 'business'` while the cache layer uses `'individual' \| 'company'`. Pick one, update everywhere. | Silent comparison bugs. `provider.business_type === 'business'` would never match if DB stores `'company'`. | S | ✅ |
| 0.2 | Resolve `neighborhoods` vs `areas` table conflict — `Step4ServiceAreas` queries `areas` table while profile's `ServiceAreasForm` queries `neighborhoods`. Determine which is canonical and eliminate the other. | Two competing data models for the same concept. Providers would set "service areas" in the wizard and get different results than their profile. | M | ✅ |
| 0.3 | Unify `ProviderServiceWithDetails` type — defined differently in `queries.ts` (flat) and `actions.ts` (nested). Create one canonical type in `provider-profile.ts` and import everywhere. | The `ServicesGrid` reads `service.custom_price` but the actual data has `custom_pricing` (JSON). Prices show "Not set" for all services currently. | S | ✅ |
| 0.4 | Fix `isVerified` hardcoded to `false` — In `layout.tsx` line 108 and `page.tsx` line 29. Wire it to the actual `effectiveVerificationLevel`. | All services show as "Draft" and the verification banner appears even for verified providers. | S | ✅ |
| 0.5 | Eliminate redundant queries in `page.tsx` — Dashboard home makes 3 new DB calls (`auth.getUser`, `profiles.select`, `service_providers.select`) when the layout already fetched all this data. Refactor to pass data from layout via props or use the cache layer. | ~200ms wasted per page load. The data is already in memory. | M | ✅ |
| 0.6 | Remove production perf logging — Wrap all `console.log('[Perf]...')` in `process.env.NODE_ENV === 'development'` checks, or remove entirely. | Server log pollution in production. Every request generates 15+ log lines. | S | ✅ |
| 0.7 | Clean dead code — Remove unused subcategory imports/state from `Step1Category`, empty loop in `Step2Services`, incomplete `index.ts` barrel. | Misleading code. New developers would waste time trying to understand why subcategory selection exists but doesn't work. | S | ✅ |

### Definition of Done ✅
- [x] All TypeScript compiles with no type errors related to provider types
- [x] `npm run type-check` passes
- [x] `ServicesGrid` correctly displays price from `custom_pricing` JSON
- [x] Dashboard home page makes 0 additional Supabase calls (uses cache)
- [x] Verified test provider sees correct verification status

---

## Phase 1: Profile Wizard (Polish & Complete) ✅ COMPLETE

### What
Make the profile setup wizard (Photo → Basics → Areas → Hours) fully functional and robust.

### Why Second
The profile wizard is the first thing a new provider does after signing up. It's also largely built already — this phase is about fixing edge cases and ensuring data actually persists correctly. It's the highest-value, lowest-effort phase.

### Why Before Services Wizard
A provider needs a profile before services make sense. The profile establishes: who they are, where they work, when they're available. Services are layered on top of that foundation.

### Specific Tasks

| #   | Task | Why | Effort | Status |
|-----|------|-----|--------|--------|
| 1.1 | Add break time inputs to `WorkingHoursForm` — The data model supports `break_start`/`break_end` but the UI never renders them. Add optional break time selectors per day. | Data model has the fields, server action sends them, but providers can never set them. Incomplete feature. | S | ✅ |
| 1.2 | Test `ServiceAreasForm` with real data — After Phase 0.2 resolves which table is canonical, verify the form loads neighborhoods, saves correctly, and the profile page pre-fills on return visits. | The form exists but hasn't been validated against the resolved data model. | S | ✅ |
| 1.3 | Profile completion percentage — Wire `getProfileCompletionChecklist()` into the dashboard home page. Show actual completion % instead of nothing. The function exists in types but is never called from UI. | Providers need to know what's left to complete. The checklist already has 9 items with point values. | M | ✅ |
| 1.4 | Profile view/preview — Add a "Preview profile" button that shows what clients would see. Re-use the existing `ProviderDetailClient` component from the public pages. | Providers can't see how they appear to clients. Without this, profile editing is guesswork. | M | ✅ |

### Definition of Done ✅
- [x] New provider can complete all 4 wizard steps
- [x] Returning to the wizard shows previously saved data
- [x] Break times are configurable
- [x] Profile completion shows on dashboard home
- [x] Provider can preview their public profile

---

## Phase 2: Services Wizard (Fix & Complete) ✅ COMPLETE

### What
Fix the 6-step "Add Services" wizard so it works end-to-end: categories → services → pricing → areas → descriptions → review → saved to DB.

### Why Third
This is the core value proposition — a provider who can't list services can't receive any work. The wizard exists but has 5 critical bugs that prevent it from actually working.

### Why Not First
It depends on Phase 0 (type fixes, area model resolution) and benefits from Phase 1 (profile data available for defaults like service areas).

### Specific Tasks

| #   | Task | Why | Effort | Status |
|-----|------|-----|--------|--------|
| 2.1 | Fix Step4 navigation — `Step4ServiceAreas` has its own Continue button that stores data but doesn't call `nextStep()`. Additionally, use the resolved area model from Phase 0.2 instead of the `areas` table. | Clicking Continue inside Step4 does nothing visible. The footer button works but might skip Step4's data storage. | S | ✅ |
| 2.2 | Fix dual submit in Step6 + `ServiceWizardContent` — Remove the duplicate submit handler. Step6 should only render the review; submission should happen exclusively through `ServiceWizardContent`'s footer button. | Two submit functions calling `addProviderServices` could trigger double insertion. | S | ✅ |
| 2.3 | Fix image upload in Step5 — Currently stores `File` objects in React state that are lost on submission. Either: (a) upload images immediately on selection (like `ProfilePhotoUpload` does), or (b) upload during the final submit. Option (a) is recommended — matches existing pattern and gives instant feedback. | Images are selected but never persisted. Provider thinks they uploaded photos but nothing was saved. | L | ✅ |
| 2.4 | Remove `is_popular` and `base_price` dead code from Step2 — These are hardcoded to `false`/`null`. Either populate them from the DB (if the schema has them) or remove the UI separation between "popular" and "other" services. | "Most providers offer these" section is always empty. Confusing UX. | S | ✅ |
| 2.5 | Deduplicate `CATEGORY_DEFAULTS` — Extract the category→priceType mapping to a shared constant in `types.ts` and import in both Step2 and Step3. | Same 25-entry map copy-pasted in two files. | S | ✅ |
| 2.6 | Server-side category filtering — Step2 loads ALL 700+ services then filters client-side. Pass selected category IDs to the query and filter server-side. | Unnecessary data transfer. On slow networks, downloading 700+ service records is wasteful when the provider selected 1-2 categories. | M | ✅ |
| 2.7 | Step5 description validation alignment — Wizard allows 0-200 chars. `ServiceDetailForm` (edit) requires min 50 chars. Pick one rule and apply consistently. Either make wizard optional (0 or 50+) or make edit form match (0+ OK). | Provider adds a 30-char description in the wizard, then can't save it again in the edit form because it's "too short." | S | ✅ |

### Definition of Done
- [x] Provider can complete all 6 steps and services appear in `ServicesGrid`
- [x] Images uploaded in Step5 are persisted in Supabase Storage and linked to the service
- [x] No double-submission possible
- [x] Service areas in the wizard use the same data model as the profile
- [x] Category filtering happens server-side

---

## Phase 3: Services Management (CRUD) ✅ COMPLETE

### What
Complete the services listing page with full CRUD operations: view, edit, pause/resume, delete, and proper price display.

### Why Fourth
Now that services can be created (Phase 2), providers need to manage them. This phase builds on the working wizard by enabling the management lifecycle.

### Specific Tasks

| #   | Task | Why | Effort | Status |
|-----|------|-----|--------|--------|
| 3.1 | Fix price display in `ServicesGrid` — Should already be fixed by Phase 0.3 type unification. Verify `custom_pricing` JSON is parsed into display-friendly values. | Currently shows "Not set" for all services. | S | ✅ |
| 3.2 | Add Edit link to service cards — Service cards currently only have pause/delete via the three-dot menu. Add a click handler or edit button that navigates to `/dashboard/provider/services/[id]/edit`. | Providers can't edit services they've already added. | S | ✅ |
| 3.3 | Wire edit page — The route `page.tsx` exists. Verify it uses `getServiceForEdit()` server action, populates `ServiceDetailForm`, and saves via `saveServiceDetails()`. | The edit flow needs to be tested end-to-end with the fixed types. | M | ✅ |
| 3.4 | Replace `alert()` with toasts — `ServicesGrid` uses `alert()` for errors. Use the `ToastProvider` already wrapped by `ProviderDashboardShell`. | Inconsistent error UX. The toast system exists and is initialized but never used in the services section. | S | ✅ |
| 3.5 | Service status badges — Currently shows "Draft" or "Paused". Add real status tracking: `draft → active → paused`. When provider completes verification, draft services should be promotable to active. | Currently all services are perpetually "Draft" because `isVerified` was always false (fixed in Phase 0.4). | M | ✅ |

### Definition of Done ✅
- [x] `ServicesGrid` shows correct prices
- [x] Each service card is clickable to edit
- [x] Edit form pre-fills with existing data
- [x] Save/toggle/delete use toasts for feedback
- [x] Status badges reflect actual service state

---

## Phase 4: Verification Flow (Polish) ✅ COMPLETE

### What
Polish the 3-step verification flow (Phone → Type → Identity) and connect it to service visibility.

### Why Fifth
Verification determines whether services are visible to clients. With services now creatable and manageable (Phases 2-3), verification is the gate between "draft" and "live." It's the next logical step in the provider journey.

### Specific Tasks

| #   | Task | Why | Effort | Status |
|-----|------|-----|--------|--------|
| 4.1 | Test phone OTP flow end-to-end — In dev mode (SMS disabled), verify the OTP is logged, can be entered, and verification level updates to `"phone"`. | The code exists but may not have been tested with the current schema. | S | ✅ |
| 4.2 | Test provider type selection — Verify selecting "Individual" or "Company" persists to `business_type` and affects the identity step correctly. | Route guard in layout checks `business_type` — if this doesn't save correctly, providers get stuck in a redirect loop. | S | ✅ |
| 4.3 | Identity verification placeholder — The `IdentityVerificationForm` handles document upload. Verify it uploads to Supabase Storage and updates the verification level. For MVP, auto-approve after upload (no manual review). | Full identity review requires admin tooling that doesn't exist yet. Auto-approve unblocks the provider journey. | M | ✅ |
| 4.4 | Connect verification to service visibility — When a provider completes verification, their "draft" services should become "active" (or display a "Go Live" button). | Currently there's no mechanism to transition services from draft to live. | M | ✅ |
| 4.5 | Banner state machine — The dashboard home shows a verification banner. Ensure it disappears completely when fully verified and shows the correct step for partial verification. | The banner currently relies on `isFullyVerified` which was buggy (fixed in Phase 0). Needs validation. | S | ✅ |

### Definition of Done ✅
- [x] New provider can complete all 3 verification steps
- [x] Services transition from "draft" to "active" after verification
- [x] Dashboard banner correctly reflects verification state
- [x] Phone OTP works in dev mode

---

## Phase 5: Dashboard Home (Real Data) ✅ COMPLETE

### What
Replace all hardcoded placeholder data on the dashboard home page with real queries.

### Why Sixth
This is intentionally late because real data depends on other systems: services (Phase 2-3), verification (Phase 4), and eventually bookings/reviews (future). Until those exist, there's nothing real to show. However, after Phases 0-4, we have enough data to show: service count, profile completion, verification status, and service area coverage.

### Specific Tasks

| #   | Task | Why | Effort | Status |
|-----|------|-----|--------|--------|
| 5.1 | Replace stats with real queries — Active services count, profile completion %, verification level, service areas count. These are all available from existing tables. | Stats currently show 47 jobs, KES 185,000, 4.8 rating — all fake. | M | ✅ |
| 5.2 | Remove hardcoded job data — Replace the 3 fake jobs with either: (a) real recent bookings (if booking system exists), or (b) a proper empty state explaining that jobs will appear when clients book. | Fake data misleads providers. An honest empty state is better than lies. | S | ✅ |
| 5.3 | Remove hardcoded earnings — Same as above. Show real earnings if available, or an informational card about how earnings work. | The "Earnings Overview" section shows KES 42,000 This Month — completely fabricated. | S | ✅ |
| 5.4 | Quick actions: dynamic state — "Complete Profile" should show completion %. "Pending Quotes" should show real count (or 0). Links should reflect what's actually actionable. | Actions currently show placeholder numbers that don't match reality. | S | ✅ |
| 5.5 | Welcome message context — Show relevant info based on provider state: new (complete profile), has services but unverified (verify to go live), fully active (real stats or encouragement). | One-size-fits-all welcome doesn't serve any segment well. | M | ✅ |

### Definition of Done ✅
- [x] Zero hardcoded numbers on the dashboard
- [x] Every number shown comes from a database query or derived calculation
- [x] Empty states are honest and actionable
- [x] Dashboard adapts messaging to provider's current lifecycle stage

---

## Phase 6: Sidebar Cleanup & Missing Pages ✅ COMPLETE

### What
Remove dead links from the sidebar and create stub pages for features that make sense in the near term.

### Why Seventh
After Phases 0-5, the core provider journey works: sign up → set up profile → add services → verify → go live. Now we clean up navigation to match reality and prepare for future features.

### Specific Tasks

| #   | Task | Why | Effort | Status |
|-----|------|-----|--------|--------|
| 6.1 | Remove or gray-out dead links — Jobs, Earnings, Reviews, Availability, Quotes, Settings all lead to 404s. Either remove them or mark as "Coming Soon" with a tooltip. | Clicking a sidebar link and getting a 404 destroys trust in the product. | S | ✅ |
| 6.2 | Settings page (stub) — Create a basic settings page with: notification preferences toggle, account deactivation link, password change link. These are simple forms. | Every dashboard needs a settings page. Even a minimal one reduces support requests. | M | ✅ |
| 6.3 | Availability page (connect to working hours) — This could simply re-use the `WorkingHoursForm` from the profile wizard, with a calendar view showing the weekly schedule. | Availability in the sidebar implies a dedicated page. Reusing the existing form component is minimal effort. | M | ✅ |

### Definition of Done ✅
- [x] No sidebar link leads to a 404
- [x] Dead features are either hidden or have a "Coming Soon" placeholder
- [x] Settings and Availability pages exist with basic functionality

---

## Phase Summary & Dependency Graph

- **Phase 0** has no dependencies — it touches types, queries, and cleanup only.
- **Phase 1 and 2** can technically run in parallel (different files), but Phase 2 benefits from Phase 0.2 (area model resolution) and Phase 1's working service areas form.
- **Phases 3-6** are strictly sequential — each builds on the previous.

```
Phase 0 ──┬── Phase 1 ──┐
           └── Phase 2 ──┤── Phase 3 ── Phase 4 ── Phase 5 ── Phase 6
```

---

## Effort Estimates

| Phase | S tasks | M tasks | L tasks | Estimated Total |
|-------|---------|---------|---------|-----------------|
| 0 - Foundation | 5 | 2 | 0 | ~2-3 hours ✅ |
| 1 - Profile | 2 | 2 | 0 | ~2-3 hours ✅ |
| 2 - Services Wizard | 4 | 1 | 1 | ~4-5 hours |
| 3 - Services CRUD | 3 | 2 | 0 | ~2-3 hours |
| 4 - Verification | 3 | 2 | 0 | ~2-3 hours ✅ |
| 5 - Dashboard Data | 3 | 2 | 0 | ~2-3 hours ✅ |
| 6 - Sidebar & Stubs | 1 | 2 | 0 | ~1-2 hours |
| **Total** | **21** | **13** | **1** | **~15-22 hours** |

S = small (<30 min), M = medium (30-90 min), L = large (2-4 hours)

---

## What's Explicitly NOT in This Plan

| Feature | Why Deferred |
|---------|-------------|
| Jobs/Bookings system | Requires client-side booking flow, status machine, notifications — a separate epic |
| Earnings/Payments | Requires M-Pesa integration, payment reconciliation — separate epic |
| Reviews system | Requires completed bookings to generate reviews — depends on Jobs |
| Real-time messaging | Requires WebSocket/Supabase Realtime setup — separate epic |
| Admin dashboard | Needed for manual verification review, provider moderation — separate project |
| Analytics/Insights | Requires weeks of booking data to be meaningful — premature now |
| Push notifications | Requires service worker, FCM setup — separate infrastructure |

These are all real features that will eventually exist, but building them now would be premature optimization. The sidebar can acknowledge them as "Coming Soon" (Phase 6) while the team focuses on getting the core provider journey working end-to-end.
