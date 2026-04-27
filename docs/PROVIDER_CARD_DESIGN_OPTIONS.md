# Provider Card Design Options

**Date:** March 4, 2026  
**Purpose:** Explore and compare card design directions before implementation  
**Context:** Kenyan tenant-centric platform, Nairobi market, home service providers  

---

## Current Data Available

Fields we **already have** in `ServiceProviderCardData`:

| Field | Example Value | Currently Shown? |
|-------|---------------|-----------------|
| `business_name` | "CleanPro Nairobi" | ✅ Yes |
| `tagline` | "Professional deep cleaning for homes & offices" | ❌ No |
| `logo_url` | URL | Only as fallback |
| `cover_photo_url` | URL | ✅ Yes (hero image) |
| `service_areas[]` | ["Westlands", "Kilimani", "Lavington"] | ✅ Yes (truncated) |
| `is_available` | true | ✅ Yes (badge) |
| `instant_booking` | true | ✅ Yes (badge) |
| `is_verified` | true | ✅ Yes ("Verified" text) |
| `rating_average` | 4.7 | ✅ Yes |
| `rating_count` | 64 | ✅ Yes |
| `total_jobs_completed` | 238 | ❌ No |
| `response_time_minutes` | 15 | ❌ No |
| `tier` | "premium" | ✅ Yes (badge) |
| `min_price` | 5000 | ✅ Yes |
| `price_type` | "fixed" | ✅ Yes |
| `categories[]` | ["cleaning"] | ❌ No (only for placeholder) |
| `subcategories[]` | ["deep-cleaning", "move-out"] | ❌ No |

Fields **in DB but not yet in CardData** (can be added):

| Field | Example Value | Source Table |
|-------|---------------|-------------|
| `years_in_business` | 5 | service_providers |
| `last_active_at` | "2026-03-04T..." | service_providers |
| `acceptance_rate` | 0.94 | service_providers |
| `verification_badge` | "gold" | service_providers |
| `has_insurance` | true | derived from insurance fields |
| `team_size` | 8 | service_providers |

---

## Design A: Current Card (3-Row Minimal)

**Philosophy:** Airbnb-influenced minimalism. Let the image sell, show only deal-breakers.

```
┌──────────────────────────────┐
│                              │
│  ┌─────────┐                 │
│  │ ⭐ Top  │          [♡]   │
│  │  Pro    │                 │
│  └─────────┘                 │
│         [COVER IMAGE]        │
│          4:3 ratio           │
│                              │
│  ┌─────────┐                 │
│  │ Instant │                 │
│  └─────────┘                 │
├──────────────────────────────┤
│  CleanPro Nairobi    Verified│  ← Row 1: Name + verified
│                              │
│  4.7 ★ (64)                  │  ← Row 2: Rating
│                              │
│  KES 5,000    Westlands +2   │  ← Row 3: Price + Location
└──────────────────────────────┘
```

### ✅ Pros
- **Clean and fast-scanning** — 3 data rows = low cognitive load
- **Image-dominant** — 4:3 ratio makes it visually appealing in grid
- **Already built** — no implementation cost
- **Mobile-friendly** — minimal text = nothing truncates

### ❌ Cons
- **Missing critical differentiators** — no response time, no jobs completed
- **"New" label for unrated providers** — stigmatizing, not helpful
- **"Verified" is vague** — what is verified? ID? License? Insurance?
- **No tagline** — can't differentiate providers in the same category ("cleaning" vs "I'll make your home sparkle in 2 hours")
- **Heart button invisible on mobile** — `opacity-0` with no touch fallback
- **No social proof beyond rating** — 238 completed jobs is a powerful signal, but hidden
- **No response time** — "Responds in 15 min" is a top-3 decision factor (JustDial, Thumbtack)
- Can't tell WHAT they do without clicking — if browsing "all services", two cleaning providers look identical

### Verdict
Too minimal. The image earns attention but the content area doesn't help users **decide** without clicking. This forces pogo-sticking (click → back → click → back), which Baymard Institute identifies as the #1 product listing UX failure.

---

## Design B: Trust-Forward (4-Row with Social Proof)

**Philosophy:** Keep the clean image-top layout but add ONE row of trust signals. Still card-first, not list-first.

```
┌──────────────────────────────┐
│                              │
│  ┌─────────┐                 │
│  │ ✦ Pro   │          [♡]   │
│  └─────────┘                 │
│         [COVER IMAGE]        │
│          4:3 ratio           │
│                              │
│  ┌─────────┐                 │
│  │ Instant │                 │
│  └─────────┘                 │
├──────────────────────────────┤
│  CleanPro Nairobi    Verified│  ← Row 1: Name + verified
│                              │
│  4.7 ★ (64)  · 238 jobs     │  ← Row 2: Rating + jobs completed
│                              │
│  ⚡ Replies in 15 min        │  ← Row 3: Response time (conditional)
│                              │
│  KES 5,000    Westlands +2   │  ← Row 4: Price + Location
└──────────────────────────────┘
```

### Content Rules
- **Row 3 is conditional**: Only shows if `response_time_minutes` ≤ 120. If null or >120, row collapses and card has 3 rows (same as Design A). This means fast responders are rewarded with extra visibility.
- **Jobs completed**: Only shows if `total_jobs_completed` ≥ 10. Below 10, just show the rating. "238 jobs" → "1.2K jobs" when >999.
- **New providers** (no rating): Show nothing instead of "New" label. The absence speaks for itself.

### ✅ Pros
- **Response time is a killer differentiator** — in Kenya, "will they actually reply?" is the #1 anxiety. Showing "Replies in 15 min" directly addresses this.
- **Jobs completed = social proof** — "238 jobs" is more meaningful than a rating number alone. It says "this person is actively working, trusted by hundreds."
- **Conditional rows = no wasted space** — new providers get a clean 3-row card, experienced ones get the extra trust row. Natural visual hierarchy where earned trust = more card real estate.
- **Still clean** — maximum 4 rows, no clutter
- **Familiar layout** — same image-top pattern as Design A

### ❌ Cons
- **Variable card heights** — 3-row cards sit next to 4-row cards in the grid. Requires `h-full` flex layout or fixed content height (already handled, but worth noting).
- **No tagline** — still can't tell WHAT specifically they offer
- **Response time gaming** — providers might accept requests and then ghost. Needs backend enforcement (already tracked via `acceptance_rate`).
- **"Verified" still vague**

### Verdict
Strong improvement over A. The conditional trust row is elegant — it rewards good providers without cluttering new ones. But still missing the tagline, which is the biggest differentiator when browsing a single category.

---

## Design C: Fiverr-Style with Tagline

**Philosophy:** "I will [tagline]" is the hero element. The card sells a *promise*, not just a provider.

```
┌──────────────────────────────┐
│                              │
│  ┌─────────┐                 │
│  │ ✦ Pro   │          [♡]   │
│  └─────────┘                 │
│         [COVER IMAGE]        │
│          4:3 ratio           │
│                              │
│  ┌─────────┐                 │
│  │ Instant │                 │
│  └─────────┘                 │
├──────────────────────────────┤
│  ┌────┐                      │
│  │ AV │ CleanPro Nairobi     │  ← Row 1: Avatar + Name + Verified
│  │    │ Verified · 5 yrs     │
│  └────┘                      │
│                              │
│  Professional deep cleaning  │  ← Row 2: Tagline (2 lines max)
│  for homes & offices         │
│                              │
│  4.7 ★ (64)  · 238 jobs     │  ← Row 3: Rating + jobs
│                              │
│  From KES 5,000  Westlands   │  ← Row 4: Price + Location
└──────────────────────────────┘
```

### Content Rules
- **Avatar**: 36×36px circle, overlaps slightly into image area (Fiverr-style). Uses `logo_url`. Falls back to initial letter if no logo.
- **Tagline**: `line-clamp-2`. If null, skip the row entirely (card shrinks to match Design B height).
- **"5 yrs"**: Shows `years_in_business` only if ≥ 2. Displayed as subtle secondary text next to "Verified".
- **Name row becomes 2 lines**: Name on top, meta (verified + years) on bottom. This is denser but scannable.

### ✅ Pros
- **Tagline differentiates within a category** — browsing "Cleaning", you see "Professional deep cleaning for homes & offices" vs "Eco-friendly carpet & upholstery specialist" vs "Move-out cleaning guaranteed to pass inspection". Now users can choose without clicking.
- **Avatar humanizes** — Fiverr proved that showing a face/logo next to a name builds connection
- **Years in business = trust shortcut** — "5 yrs" is a powerful signal in Nairobi where fly-by-night operators are a real concern
- **Most information-dense** while still looking clean
- **Fiverr-proven pattern** — millions of users are familiar with this layout

### ❌ Cons
- **Taller cards** — 4 content rows + avatar section = ~15-20% more height than Design A. In a 3-column grid, you see fewer cards above the fold.
- **Tagline quality varies** — if providers write bad taglines ("We do cleaning"), it adds noise not value. Needs curation or AI assistance at onboarding.
- **Two images per card** (cover + avatar) = more data transfer, more loading states
- **Avatar collision with cover image** — overlapping avatar requires careful z-index and spacing management
- **More complex mobile layout** — avatar + name + meta line needs to not break on small screens
- **Fiverr's model is freelancer-centric** — their "I will..." works because it's one person offering one gig. Mitasafi has businesses offering multiple services.

### Verdict
The tagline is genuinely valuable, but the avatar overlap adds complexity without proportional benefit in a *business* marketplace (vs Fiverr's freelancer-personal-brand model). Worth considering a simplified version.

---

## Design D: Information-Rich (JustDial/Treatwell Hybrid)

**Philosophy:** Maximum useful information without clicking. Optimized for high-intent comparison shopping.

```
┌──────────────────────────────┐
│                              │
│  ┌─────────┐                 │
│  │ ✦ Pro   │          [♡]   │
│  └─────────┘                 │
│         [COVER IMAGE]        │
│       (shorter: 16:9)        │
│                              │
│  ┌─────────┐                 │
│  │ Instant │                 │
│  └─────────┘                 │
├──────────────────────────────┤
│  CleanPro Nairobi    Verified│  ← Row 1: Name + Verified
│                              │
│  Professional deep cleaning  │  ← Row 2: Tagline (1 line)
│                              │
│  4.7 ★ (64) · 238 jobs      │  ← Row 3: Rating + jobs
│                              │
│  ⚡ Replies ~15 min · 5 yrs  │  ← Row 4: Response time + years
│                              │
│  🛡 Licensed · Insured       │  ← Row 5: Trust badges
│                              │
│  From KES 5,000  Westlands   │  ← Row 6: Price + Location
└──────────────────────────────┘
```

### Content Rules
- **Image ratio**: 16:9 instead of 4:3 — shorter image to make room for more text rows
- **Tagline**: `line-clamp-1` (single line, truncated)
- **Row 4**: Response time + years. Both conditional — row hides if neither exists.
- **Row 5**: Trust badges. Shows applicable ones: "Licensed" (has business_license verification), "Insured" (has insurance), "ID Verified" (has id_card verification). Row hides if none apply.
- **All rows except 1, 3, 6 are conditional** — new providers naturally get a shorter card

### ✅ Pros
- **Eliminates pogo-sticking** — user can compare 6 providers on one screen without clicking any
- **Insurance and license = killer Nairobi differentiator** — many Kenyans have been burned by uninsured providers who damage property. Showing "Insured" on the card is a massive trust signal.
- **JustDial proved this works in emerging markets** — high information density is expected by users who don't trust easily
- **Conditional rendering means variable density** — providers with more credentials get more visibility. This is a natural incentive for providers to complete their profiles.

### ❌ Cons
- **6 rows = tall cards** — significantly less above-the-fold density. On mobile, might only see 1.5 cards.
- **Visual fatigue with many icons/badges** — ⚡🛡 symbols fight for attention, nothing stands out
- **16:9 image ratio is less impactful** — the image becomes a strip rather than a showcase. For visual services (cleaning results, landscaping), the image IS the selling point.
- **Text wall risk on mobile** — 6 rows of small text on a 375px screen becomes unreadable
- **Information overload** — contradicts design system commandment #6 "Hide Complexity"
- **Line-clamp-1 taglines are often useless** — "Professional deep cle..." tells you nothing

### Verdict
Too dense for a card grid. This information density works in a **list view** (like JustDial) where each item gets the full viewport width, but NOT in a 2-3 column card grid. The image sacrifice (16:9) is also wrong for a visual marketplace. Good ideas in here, but needs to be pared back.

---

## Design E: Airbnb-Elegant with Smart Secondary Line

**Philosophy:** One line of "smart text" that adapts to what's most impressive about this specific provider.

```
┌──────────────────────────────┐
│                              │
│  ┌─────────┐                 │
│  │ ✦ Pro   │          [♡]   │
│  └─────────┘                 │
│         [COVER IMAGE]        │
│          4:3 ratio           │
│                              │
│  ┌─────────┐                 │
│  │ Instant │                 │
│  └─────────┘                 │
├──────────────────────────────┤
│  CleanPro Nairobi    Verified│  ← Row 1: Name + Verified
│                              │
│  4.7 ★ (64) · 238 jobs      │  ← Row 2: Rating + jobs
│                              │
│  Replies in ~15 min · Insured│  ← Row 3: Smart secondary line
│                              │
│  From KES 5,000  Westlands   │  ← Row 4: Price + Location
└──────────────────────────────┘
```

### The "Smart Secondary Line" (Row 3)

This is the key innovation. Row 3 shows the **most compelling combination** of secondary signals, assembled dynamically from available data, up to ~35 characters:

**Priority waterfall (pick up to 2, left to right, separated by " · "):**

| Priority | Condition | Display | Why |
|----------|-----------|---------|-----|
| 1 | `response_time_minutes` ≤ 60 | "Replies in ~15 min" | #1 anxiety in Kenya |
| 2 | `response_time_minutes` 61-120 | "Replies in ~1 hr" | Still good |
| 3 | Has insurance | "Insured" | Top trust signal |
| 4 | Has business license | "Licensed" | Trust signal |
| 5 | `years_in_business` ≥ 3 | "Est. 5 yrs" | Longevity signal |
| 6 | `years_in_business` ≥ 2 | "Est. 2 yrs" | Still decent |

**Examples of assembled lines:**
- ⚡ Replies in ~15 min · Insured  *(fast responder with insurance)*
- ⚡ Replies in ~1 hr · Licensed  *(decent speed, has license)*
- 🛡 Insured · Est. 5 yrs  *(no fast response, but trusted)*
- Est. 3 yrs  *(only one signal — still shows)*
- *(empty — row hidden)*  *(new provider, no data yet → card becomes 3-row)*

### ✅ Pros
- **Maximum relevance per pixel** — every provider shows their BEST attributes. A fast-responding insured provider shows different info than a veteran licensed one.
- **Only 4 rows max, 3 rows min** — stays compact, grid-friendly
- **4:3 image preserved** — visual impact maintained
- **No wasted space** — new providers collapse to 3 rows. Veterans expand to 4. Natural earned real estate.
- **"Insured" is shown where it matters** — on Nairobi home services, this is a bigger differentiator than a 0.1 rating difference
- **Tagline-free** — avoids the tagline quality problem. The smart line does the differentiator job with verified data, not user-written text.
- **Familiar to users** — looks like an Airbnb card with one extra info line

### ❌ Cons
- **No tagline** — can't tell WHAT specifically they offer within a category
- **"Smart" logic adds complexity** — conditional assembly means more code, more edge cases, harder to test
- **Users can't predict what they'll see** — different cards show different attributes, which slightly hurts scannability (Baymard recommends consistent card structure)
- **Priority waterfall is opinionated** — we're deciding for the user what matters most. Some users care more about years than response time.

### Verdict
Elegant and efficient. The smart secondary line is innovative and solves the "what to show" problem without bloating the card. The inconsistency concern is real but minor — users won't notice it consciously; they'll just feel that each card tells them something useful.

---

## Design F: Balanced Hybrid (Recommended)

**Philosophy:** Take the best of each design. Image-dominant, tagline when available, smart trust line, always 4 rows maximum.

```
┌──────────────────────────────┐
│                              │
│  ┌─────────┐                 │
│  │ ✦ Pro   │          [♡]   │
│  └─────────┘                 │
│         [COVER IMAGE]        │
│          4:3 ratio           │
│                              │
│  ┌─────────┐                 │
│  │ Instant │                 │
│  └─────────┘                 │
├──────────────────────────────┤
│                              │
│  CleanPro Nairobi    Verified│  ← Row 1: Name + Verified badge
│                              │
│  Professional deep cleaning  │  ← Row 2: Tagline (or skip if null)
│  for homes & offices         │          line-clamp-2
│                              │
│  4.7 ★ (64) · 238 jobs      │  ← Row 3: Rating + social proof
│  ⚡ ~15 min · Insured        │     + smart trust sub-line
│                              │
│  From KES 5,000  Westlands   │  ← Row 4: Price + Location
│                              │
└──────────────────────────────┘
```

### Structural Breakdown

**IMAGE AREA (same as current)**
- 4:3 ratio cover image
- Top-left: Tier badge (conditional — "⭐ Top Pro" / "✦ Pro")
- Top-right: Save heart (always visible on mobile, hover-reveal on desktop)
- Bottom-left: "Instant" badge (conditional — only when `instant_booking && is_available`)
- Bottom-left: "Currently Unavailable" (overrides Instant when `!is_available`)

**CONTENT ROW 1: Identity**
- Left: Business name — `font-semibold text-gray-900`, `line-clamp-1`
- Right: "Verified" — `text-xs font-medium text-brand-600`. Only when `is_verified`.
- Spacing: `mb-1` below

**CONTENT ROW 2: Tagline (CONDITIONAL)**
- Text: `tagline` field, `line-clamp-2`
- Style: `text-sm text-gray-500 leading-snug`
- **If `tagline` is null/empty: Skip this row entirely.** Card naturally compresses.
- Spacing: `mb-2` below

**CONTENT ROW 3: Social Proof + Trust (COMPOSITE)**
This is ONE visual row but has two sub-lines:

- **Line 3a: Rating + Jobs**
  - `"4.7 ★ (64)"` — always present if `rating_average` exists
  - `" · 238 jobs"` — appended if `total_jobs_completed` ≥ 10. Uses "1.2K jobs" above 999.
  - If no rating: show nothing (no "New" label)
  - Style: `text-sm text-gray-600`

- **Line 3b: Smart Trust Line (CONDITIONAL)**
  - Assembled from priority waterfall (same as Design E)
  - Max 2 elements separated by " · "
  - Style: `text-xs text-gray-400`
  - If no trust signals: skip this sub-line
  - Has a leading icon: ⚡ for response time, 🛡 for insurance/license

**CONTENT ROW 4: Price + Location (ANCHORED TO BOTTOM)**
- Left: Price — `text-lg font-bold text-gray-900`
  - Shows "From KES 5,000" for fixed
  - Shows "KES 800/hr" for hourly
  - Shows "Get Quote" for quote_only
- Right: Location — `text-sm text-gray-400 truncate`
  - Shows first 2 areas: "Westlands, Kilimani +3"
- Always visible. `mt-auto` pushes to bottom.

### Card Height Variations

Cards naturally adapt to the provider's profile completeness:

```
VETERAN PROVIDER                    NEW PROVIDER
(all data)                          (minimal data)

┌────────────────────┐              ┌────────────────────┐
│   [COVER IMAGE]    │              │   [COVER IMAGE]    │
│    ✦ Pro    [♡]    │              │             [♡]    │
│    Instant         │              │                    │
├────────────────────┤              ├────────────────────┤
│ CleanPro    Verified│             │ John's Cleaning    │
│                    │              │                    │
│ Professional deep  │              │ 
│ cleaning for homes │              │ 
│                    │              │                    │
│ 4.7 ★ (64) · 238  │              │ 
│ ⚡ ~15 min · Insured│             │                    │
│                    │              │                    │
│ KES 5,000 Westlands│              │ KES 3,000  Langata │
└────────────────────┘              └────────────────────┘
 Height: ~380px                      Height: ~310px
```

The **veteran's card is taller** — this is a feature, not a bug. Earned trust = earned real estate. The grid stays aligned via `h-full flex flex-col` with `mt-auto` on Row 4.

### ✅ Pros
- **Tagline solves the differentiation problem** — users browsing "Cleaning" can see what makes each provider unique
- **Conditional rendering = earned real estate** — more profile completeness = more card space = more visibility. This incentivizes providers to fill out their profiles, add insurance, respond quickly.
- **Response time addresses #1 Kenya anxiety** — "Will they reply?" is answered on the card
- **"Insured" is a real differentiator** — relevant to the Nairobi market where property damage risk is a genuine concern
- **Social proof (jobs count) compounds rating** — 4.7 ★ with 238 jobs is infinitely more convincing than 4.7 ★ with 3 reviews
- **Still image-dominant** — 4:3 cover image preserved
- **Grid-compatible** — variable height handled by flex layout
- **Progressive disclosure respected** — full description, all service areas, portfolio, etc. reserved for detail page
- **Mobile-friendly** — widest card still only has 4 rows
- **Consistent structure** — Rows 1, 3a, 4 always present. Rows 2, 3b are conditional but in fixed positions.

### ❌ Cons
- **Tagline dependency** — card looks notably different with vs. without tagline. Need to ensure most providers have one (or generate via AI at onboarding).
- **More complex than current** — going from 3 rows to up to 4 rows + sub-lines means more conditional rendering logic
- **Two sub-lines in Row 3** — rating line + trust line might feel cramped on mobile. Needs careful spacing.
- **Variable card heights are slightly less scannable** — Baymard recommends uniform card heights for easy horizontal scanning

---

## Design Comparison Matrix

| Criteria | A (Current) | B (Trust-Fwd) | C (Fiverr) | D (Info-Rich) | E (Smart Line) | **F (Hybrid)** |
|----------|:-----------:|:-----------:|:-----------:|:-----------:|:-----------:|:-----------:|
| **Image impact** | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★★★ |
| **Differentiation** | ★☆☆☆☆ | ★★☆☆☆ | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| **Trust signals** | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★★☆ |
| **Scannability** | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★★☆ |
| **Mobile-friendliness** | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★★☆ |
| **Pogo-stick prevention** | ★☆☆☆☆ | ★★★☆☆ | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★★☆ |
| **Provider incentive** | ★☆☆☆☆ | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| **Implementation ease** | ★★★★★ | ★★★★☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ |
| **Grid consistency** | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ |
| **Kenya market fit** | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | ★★★★★ |
| **TOTAL** | **28** | **33** | **30** | **33** | **37** | **39** |

---

## Key Design Decisions to Make

### Decision 1: Tagline — Yes or No?

**Option A: Include tagline (Designs C, F)**
- (+) Differentiates providers within a category
- (+) Providers can express their value proposition
- (-) Quality varies — bad taglines add noise
- (-) Variable card heights
- Mitigation: AI-assisted tagline generation at onboarding, character limit (80 chars)

**Option B: No tagline (Designs A, B, E)**
- (+) Uniform card heights
- (+) No dependency on provider-written content
- (-) Providers within the same category look identical
- (-) Forces clicking to understand what they offer

**Recommendation:** Include it. The differentiation value outweighs the quality risk, and we can mitigate with AI-assisted generation and character limits.

---

### Decision 2: Response Time Display

**Option A: Always show when available**
- "⚡ Replies in ~15 min" for ≤60 min
- "Replies in ~1 hr" for 61-120 min
- Hidden when >120 min or null

**Option B: Only show when impressive (≤ 30 min)**
- Makes the badge more exclusive and meaningful
- Fewer cards show it = higher signal value

**Option C: Don't show on card (detail page only)**
- Keeps card simpler
- Loses a key comparison factor

**Recommendation:** Option A. "Replies in ~1 hr" is still useful info in Kenya. The threshold at 120 min already filters out unimpressive values.

---

### Decision 3: Jobs Completed — How to Display

**Option A: Number inline with rating → `4.7 ★ (64) · 238 jobs`**
- Compact, scanning-friendly
- Clear relationship between rating and volume

**Option B: Separate element → rating on one line, jobs on another**
- More prominent but takes more space
- Might elevate a less important metric

**Option C: Don't show jobs count**
- Simpler, cleaner
- Loses powerful social proof

**Recommendation:** Option A. Inline with rating, separated by middot. It's compact and the combination (quality × quantity) is the most persuasive social proof format.

---

### Decision 4: Verified Badge Specificity

**Option A: Generic "Verified" (current)**
- Simple, clean
- But vague — verified how?

**Option B: Specific badge → "ID ✓" / "Licensed" / "Insured"**
- More meaningful
- But complex on card — which one to show?

**Option C: Tiered verification → "Verified ✓" / "Verified ✓✓" / "Verified ✓✓✓"**
- Progressive trust levels
- But users won't know what ✓ vs ✓✓ means without a legend

**Option D: "Verified" on Row 1 + specific badges in trust line (Row 3b)**
- "Verified" stays simple next to name
- "Licensed · Insured" appears in the trust sub-line for those who have it
- Separation of concerns: identity verification vs. professional credentials

**Recommendation:** Option D. "Verified" confirms identity, the trust line shows professional credentials. Users get both general trust (Row 1) and specific qualifications (Row 3b) without either being cluttered.

---

### Decision 5: Save Button Mobile Behavior

**Option A: Always visible on mobile, hover-reveal on desktop (current bug fix)**
```css
opacity-100 md:opacity-0 md:group-hover:opacity-100
```

**Option B: Always visible everywhere**
- Simplest
- But adds permanent visual noise

**Option C: Visible on mobile, hover on desktop, also visible when saved**
```css
opacity-100 md:opacity-0 md:group-hover:opacity-100
/* overridden when isSaved: */ 
isSaved && "opacity-100"
```

**Recommendation:** Option C. Always visible on mobile (no hover on touch), hover-reveal on desktop, but always visible when actively saved (so users can see/undo their saves).

---

### Decision 6: Image Aspect Ratio

**Option A: 4:3 (current) — taller image, more visual impact**
- Great for visual services (cleaning results, landscaping)
- Fewer cards above the fold

**Option B: 16:9 — shorter image, more content visible**
- More cards above the fold
- Less visual impact

**Option C: 3:2 — compromise**
- Balanced
- Uncommon ratio, might look unusual

**Recommendation:** Stay with 4:3. Mitasafi is a marketplace where visual quality matters. The image is the #1 attention-grabber and squishing it to fit more text defeats the purpose. If we need more info, put it in the content area, don't shrink the image.

---

### Decision 7: "Currently Unavailable" Treatment

**Option A: Gray overlay badge (current)**
- Shows on image bottom-left
- Card otherwise unchanged

**Option B: Full card dim + overlay**
- Entire card at 60% opacity with "Currently Unavailable" overlay
- Clear but aggressive

**Option C: Move to end of results + subtle indicator**
- Unavailable providers sort last
- Small indicator ("Unavailable" in gray text) in content area
- Not on image at all

**Recommendation:** Option A for the card treatment, combined with Option C's sorting behavior. Unavailable providers should sort last in results but still be discoverable. On the card, the bottom-left badge is sufficient.

---

## Summary: Recommended Design (F) — Final Specification

> **STATUS: IMPLEMENTED** — March 5, 2026

### Decisions Made

| # | Decision | Choice |
|---|----------|--------|
| 1 | Tagline | **Mandatory**, 80 chars max, AI-assisted at onboarding |
| 2 | Card height | **Uniform** — fixed content height via `min-h` and `line-clamp` |
| 3 | Response time | **Always shown** — transparency is non-negotiable (`"Not yet available"` fallback) |
| 4 | Jobs completed | **Inline with rating** → `4.7 ★ (64) · 238 jobs` |
| 5 | Verified badges | **All specific** — `[ID]` `[Lic]` `[Ins]` color-coded pills |
| 6 | Save button | Mobile: always visible · Desktop: hover-reveal · Saved: always visible |
| 7 | Image ratio | **4:3** — visual quality matters |
| 8 | "Currently Unavailable" | Deferred — to be discussed separately |
| 9 | Activity indicator | **Green dot** near name — active (≤2hr, pulsing) / recent (≤24hr, solid) |
| 10 | Price accuracy | Exactly as provider set: `"From KES 5,000"`, `"KES 800/hr"`, `"Custom Quote"` |
| 11 | Subcategory | **Not on card** — shown after clicking |

### Implemented Card Layout

```
┌──────────────────────────────────────┐
│  [✦ Pro]                      [♡]   │  ← IMAGE: 4:3 cover photo
│           COVER IMAGE               │     Tier badge top-left
│  [⚡ Instant Book]                   │     Save button top-right (D#6)
├──────────────────────────────────────┤     Instant badge bottom-left
│                                      │
│  CleanPro Nairobi  🟢  [ID][Lic][Ins]│  ← ROW 1: Name + dot + badges
│                                      │
│  Professional deep cleaning for      │  ← ROW 2: Tagline (mandatory, 80ch)
│  homes & offices                     │     line-clamp-2, min-h for uniformity
│                                      │
│  4.7 ★ (64) · 238 jobs              │  ← ROW 3a: Rating · jobs
│  ⚡ Responds in ~30 min              │  ← ROW 3b: Response time (always)
│                                      │
│  ──────────────────────────────────  │  ← subtle border-t separator
│  From KES 5,000        📍 Westlands  │  ← ROW 4: Price ←→ Location
└──────────────────────────────────────┘
```

### New Data Fields Added

| Field | Type | Source |
|-------|------|--------|
| `years_in_business` | `number \| null` | `service_providers.years_in_business` |
| `last_active_at` | `string \| null` | `service_providers.last_active_at` (ISO timestamp) |
| `has_insurance` | `boolean` | Derived from `provider_verification_documents` |
| `has_business_license` | `boolean` | Derived from `provider_verification_documents` |
| `has_id_verified` | `boolean` | Derived from `provider_verification_documents` |

### Response Time Formatting

| Minutes | Display |
|---------|---------|
| null | "Not yet available" |
| 5 | "~30 min" |
| 30 | "~30 min" |
| 45 | "~1 hr" |
| 90 | "~1.5 hrs" |
| 120 | "~2 hrs" |
| 1440 | "~24 hrs" |
| 4320 | "~3 days" |

### Verification Badge System

| Badge | Abbreviation | Color | Meaning |
|-------|-------------|-------|---------|
| ID Verified | `[ID]` | Blue ring/text | Government ID on file |
| Licensed | `[Lic]` | Emerald ring/text | Business license verified |
| Insured | `[Ins]` | Violet ring/text | Insurance coverage verified |

### Files Modified

- `src/types/service-providers.ts` — Added 5 new fields to `ServiceProviderCardData`
- `src/lib/services/providers.ts` — Extended `SP_BASE_COLUMNS`, added `VERIFICATION_DOCS_JOIN`, added `deriveVerificationFlags()`, updated all 4 queries
- `src/components/services/ProviderCard.tsx` — Complete rewrite: Hybrid v2 design
- `src/components/services/FeaturedByPrice.tsx` — Updated for non-null tagline

---

## Open Questions (Resolved)

| # | Question | Resolution |
|---|----------|-----------|
| 1 | Category chip? | Not needed — tagline differentiates sufficiently |
| 2 | Mandatory tagline? | ✅ Yes — 80 char cap, AI-assist at onboarding |
| 3 | Active indicator? | ✅ Green dot — active (pulse) / recent (solid) |
| 4 | "From" prefix? | ✅ Yes for fixed prices, exact format for hourly/sqm/quote |
| 5 | Subcategory on card? | ❌ No — detail page only |
