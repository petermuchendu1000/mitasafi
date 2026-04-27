# Service Category Ordering Specification
**Date:** January 10, 2026  
**Purpose:** Define which service categories appear on homepage vs "More Services" and their exact ordering  
**Status:** LOCKED - Do not modify without product review

---

## Executive Summary

This document defines the **canonical ordering** of service categories in the MitaSafi platform, determining:
- Which 12 categories appear on the homepage
- Which 8 categories appear under "+ More Services"
- The exact display order and reasoning
- Rules to prevent category creep

**Ordering Principle:** **Urgency → Frequency → Cost → Planning**

Users open the app because something is **broken, empty, or urgent** — not because they're browsing.

---

## Main Categories (Homepage - Always Visible)

### Total: 12 Categories Maximum

#### TIER 1: URGENT & ESSENTIAL (Positions 1-4)
**Must appear first, visible without scrolling**

| # | Category | Why This Position | Urgency | Frequency | Kenya Reality |
|---|----------|-------------------|---------|-----------|---------------|
| 1 | **Plumbing** | Pipes burst, toilets block, water heaters break | EMERGENCY | Constant | "Maji imejaa" is a NOW problem |
| 2 | **Electrical** | Power trips, sockets fail, meter issues | EMERGENCY | Constant | "Umeme imeenda" = immediate need |
| 3 | **Water & Gas Delivery** | Water runs out, gas cylinders finish | ESSENTIAL | Weekly/Bi-weekly | "Maji imeisha" is same-day urgent |
| 4 | **Cleaning** | Move-in/out, weekly cleaning, deep clean | MODERATE | Top 3 demand | Most repeat usage after utilities |

**Critical Rule:** If these 4 aren't visible first, the app feels out of touch. These solve "nimepata shida" (I have a problem) scenarios.

---

#### TIER 2: FREQUENT HOME NEEDS (Positions 5-8)
**Regular services that keep users coming back**

| # | Category | Why This Position | Frequency | Pattern | Trust Factor |
|---|----------|-------------------|-----------|---------|--------------|
| 5 | **Laundry** | Weekly necessity for busy professionals | Very high repeat | Per-kg pricing | Established trust |
| 6 | **Pest Control** | Cockroaches, bedbugs, termites | Quarterly/urgent | Seasonal spikes | Strong B2B overlap |
| 7 | **Carpentry** | Furniture repair, wardrobe assembly, doors | Common in rentals | Move-in heavy | Recognized trade |
| 8 | **Painting** | Interior/exterior painting, touch-ups | Seasonal | Dec + move-ins | Medium-high ticket |

**Reasoning:** These maintain platform stickiness. Not always emergencies, but strong repeat usage patterns.

---

#### TIER 3: HIGH-INTENT, PLANNED SERVICES (Positions 9-10)
**Lower frequency but very high intent when needed**

| # | Category | Why This Position | Frequency | Intent | Ticket Size |
|---|----------|-------------------|-----------|--------|-------------|
| 9 | **Moving & Relocation** | House moving, office moving, packing | Low | Very high | High |
| 10 | **Internet & Networking** | WiFi setup, router install, fiber | New tenants | High | Medium |

**Reasoning:** Fewer users, but they search specifically. Big-ticket, less frequent. Belong on homepage but not at top.

---

#### TIER 4: CONVENIENCE & ON-DEMAND (Positions 11-12) [OPTIONAL]
**Useful but not core identity**

| # | Category | Status | Why Optional | Competition | Positioning |
|---|----------|--------|--------------|-------------|-------------|
| 11 | **Taxi & Rides** | Optional v1 | Uber/Bolt exist | High | Convenience layer |
| 12 | **Shopping Assistance** | Optional v1 | Human service distinction | Medium | Not core identity |

**Reasoning:** Discovery-based. Often used after trust is built. Should not overshadow home services.

---

## + More Services (Secondary Page)

### Total: 8 Categories

These are **real and in-demand**, but:
- More situational
- More trust-sensitive
- Less frequent
- More complex to deliver

### Ordering Within "More Services"

| Priority | Category | Why Under "More" | Demand Pattern | Trust Level |
|----------|----------|------------------|----------------|-------------|
| 1 | **Garbage & Junk Removal** | Spiky demand (moving, renovations) | Extremely valuable when needed | Medium |
| 2 | **Gardening & Landscaping** | Niche audience (compounds, offices) | Repeat but situational | Medium |
| 3 | **IT & Tech Support** | Natural upsell from Internet category | Post-COVID increase | Medium |
| 4 | **Welding & Metal Works** | Hard to find reliably | Common but specialized | Medium |
| 5 | **Glass & Aluminium Works** | Breakage-driven demand | Searched, not browsed | Medium |
| 6 | **Beauty (Home Services)** | Different audience from utilities | Requires verification | HIGH |
| 7 | **Events & Planning** | Project-based, quote-heavy | Not everyday | Medium |
| 8 | **Childcare & Home Care** | Extremely trust-sensitive | Better discovered intentionally | VERY HIGH |

---

## Display Rules by Device

### Mobile (80% of Users - Priority)

**First View (No Scroll):**
- Show **8 categories** (Tier 1 + Tier 2)
- Categories 1-8 only

**After Scroll:**
- Show remaining categories (9-12)
- **"+ More Services"** button visible immediately

**Rationale:** Mobile users need immediate problem-solving. Urgency trumps completeness.

---

### Desktop

**First View:**
- Show all **12 categories** (3 rows of 4)
- Maintain left-to-right, top-to-bottom priority

**Below Main Grid:**
- **"+ More Services"** section clearly separated

---

## Hard Rules (Non-Negotiable)

### Rule 1: Main Categories Never Exceed 12
**Enforcement:** If pressure to add more → goes under "+ More Services"

**Reasoning:** 
- Cognitive load management
- Mobile screen constraints
- Focus on core identity

---

### Rule 2: Ordering Follows Urgency → Frequency
**Never:**
- ❌ Alphabetical ordering
- ❌ Random/rotating categories
- ❌ Personalization in v1
- ❌ Mixing main + more together

**Why:** Alphabetical looks "neutral" but kills intent matching.

---

### Rule 3: "+ More Services" Is NOT a Dumping Ground
**Requirements for inclusion:**
- ✅ Solves a real problem
- ✅ Providers already doing it informally
- ✅ Fits request → quote → fulfill flow
- ✅ Has measurable demand data

---

### Rule 4: Categories Can Be Promoted, Not Duplicated
**Process:**
- If "+ More" category proves demand → Promote to MAIN
- Do NOT create new category
- Must retire/demote another MAIN category

**Metrics for Promotion:**
- Search volume > 500/month
- Booking request rate > 100/month
- Provider supply > 50 verified

---

### Rule 5: No Abstract Names
**Test:** If category cannot complete this sentence naturally:

> "Nahitaji mtu wa ____" (I need someone for ____)

**Examples:**
- ✅ "Nahitaji mtu wa plumbing" (I need a plumber)
- ✅ "Nahitaji mtu wa cleaning" (I need a cleaner)
- ❌ "Nahitaji mtu wa lifestyle services" (makes no sense)

---

## The Kenyan Mental Model (Why This Works)

### User Journey Stages

**Stage 1: First Visit (Problem-Solving)**
- **Thought:** "Nimepata shida" (I have a problem)
- **Expectation:** See urgent categories first (Tier 1)
- **Action:** Quick category selection → service request

**Stage 2: Return Visits (Habit Formation)**
- **Thought:** "Nahitaji mtu wa..." (I need someone for...)
- **Expectation:** Familiar, frequent services (Tier 2)
- **Action:** Repeat bookings, build provider relationships

**Stage 3: Planning Phase (High Intent)**
- **Thought:** "Ninaplani..." (I'm planning...)
- **Expectation:** Find planned services (Tier 3)
- **Action:** Research, compare, book in advance

**Stage 4: Trust Established (Convenience)**
- **Thought:** "Ningependa..." (I would like...)
- **Expectation:** Explore convenience/lifestyle (Tier 4 + More)
- **Action:** Try new categories, refer friends

---

## Database Schema Alignment

### `service_categories` Table Fields

```sql
service_categories
├── id (PK)
├── name
├── slug (UNIQUE)
├── display_order (INTEGER) -- Maps to position 1-12
├── is_primary (BOOLEAN) -- true for MAIN, false for MORE
├── tier (ENUM) -- 'urgent', 'frequent', 'planned', 'convenience', 'more'
└── is_active
```

### Display Order Values

```sql
-- MAIN CATEGORIES (is_primary = true)
display_order = 1  → Plumbing
display_order = 2  → Electrical
display_order = 3  → Water & Gas Delivery
display_order = 4  → Cleaning
display_order = 5  → Laundry
display_order = 6  → Pest Control
display_order = 7  → Carpentry
display_order = 8  → Painting
display_order = 9  → Moving & Relocation
display_order = 10 → Internet & Networking
display_order = 11 → Taxi & Rides (optional)
display_order = 12 → Shopping Assistance (optional)

-- MORE SERVICES (is_primary = false)
display_order = 101 → Garbage & Junk Removal
display_order = 102 → Gardening & Landscaping
display_order = 103 → IT & Tech Support
display_order = 104 → Welding & Metal Works
display_order = 105 → Glass & Aluminium Works
display_order = 106 → Beauty (Home Services)
display_order = 107 → Events & Planning
display_order = 108 → Childcare & Home Care
```

**Query Pattern:**
```sql
-- Homepage categories
SELECT * FROM service_categories 
WHERE is_primary = true AND is_active = true
ORDER BY display_order ASC;

-- More Services categories
SELECT * FROM service_categories 
WHERE is_primary = false AND is_active = true
ORDER BY display_order ASC;
```

---

## Category Exclusions (What We DON'T Include)

### Explicitly Rejected Categories

| Category | Why NOT Included | Alternative |
|----------|------------------|-------------|
| **Medical Services** | Regulatory nightmare, liability | Refer to licensed providers |
| **Legal Services** | Complex trust, licensing | Partner with law firms |
| **Beauty Salons** | Fixed-location problem | Only home-service beauty |
| **Product Sales** | Inventory & returns | Services only |
| **Restaurant Food Delivery** | Compete with Uber Eats/Glovo | Only home food/catering |
| **Tutoring/Education** | Different trust model | Future consideration |

---

## Category Promotion/Demotion Process

### Promotion Criteria (More → Main)

**Required Metrics (All Must Pass):**
1. **Demand:** 
   - Search volume ≥ 500/month
   - Booking requests ≥ 100/month
   
2. **Supply:**
   - Active verified providers ≥ 50
   - Provider response rate ≥ 60%
   
3. **Economics:**
   - GMV ≥ KES 500,000/month
   - Take rate ≥ 10%
   
4. **Quality:**
   - Average rating ≥ 4.2/5
   - Dispute rate ≤ 5%

**Decision Process:**
1. Category manager proposes with data
2. Product review (weekly)
3. Retire/demote one MAIN category (mandatory swap)
4. A/B test for 2 weeks
5. Full rollout or rollback

---

### Demotion Criteria (Main → More)

**Triggers (Any One):**
- Demand drop ≥ 50% over 3 months
- Supply drop ≥ 40% (providers inactive)
- Quality issues (rating < 3.8 sustained)
- Strategic refocus

---

## UI Component Specifications

### Homepage Category Grid

```typescript
interface CategoryDisplay {
  id: string;
  name: string;
  slug: string;
  icon: string; // React Icon name
  tier: 'urgent' | 'frequent' | 'planned' | 'convenience';
  displayOrder: number;
  isPrimary: boolean;
}

// Mobile: Show 8 first
const mobileFirstView = categories
  .filter(c => c.isPrimary && c.displayOrder <= 8)
  .sort((a, b) => a.displayOrder - b.displayOrder);

// Desktop: Show all 12
const desktopView = categories
  .filter(c => c.isPrimary)
  .sort((a, b) => a.displayOrder - b.displayOrder);
```

### "+ More Services" Button Placement

**Mobile:**
```
[Category 1] [Category 2]
[Category 3] [Category 4]
[Category 5] [Category 6]
[Category 7] [Category 8]
--- scroll ---
[Category 9] [Category 10]
[+ More Services]
```

**Desktop:**
```
[Category 1] [Category 2] [Category 3] [Category 4]
[Category 5] [Category 6] [Category 7] [Category 8]
[Category 9] [Category 10] [Category 11] [Category 12]

[+ More Services]
```

---

## Testing & Validation

### A/B Test Framework

**Hypothesis:** "Urgency-first ordering increases booking conversion by 15%"

**Variants:**
- **Control:** Alphabetical ordering
- **Treatment:** Urgency → Frequency ordering (this spec)

**Metrics:**
- Time to first category click
- Time to first booking request
- Booking completion rate
- Repeat usage (7-day, 30-day)

**Decision Criteria:**
- Statistical significance (p < 0.05)
- Minimum sample: 10,000 users per variant
- Test duration: 14 days

---

### User Feedback Checkpoints

**Question:** "Did you find the service you needed?"
- ✅ Yes, immediately (Tier 1 success)
- ✅ Yes, after scrolling (Tier 2-3 success)
- ⚠️ Yes, under More Services (consider promotion)
- ❌ No, it's missing (add to roadmap)

---

## Analytics & Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Category click-through rate (Tier 1) | ≥ 60% | < 50% |
| Category click-through rate (Tier 2) | ≥ 40% | < 30% |
| "+ More Services" engagement | 10-20% | > 30% (too much hidden) |
| Avg. time to category selection | < 10 sec | > 20 sec |
| Bounce rate from homepage | < 40% | > 50% |

### Dashboard Queries

```sql
-- Category engagement by tier
SELECT 
  tier,
  COUNT(*) as views,
  COUNT(CASE WHEN clicked = true THEN 1 END) as clicks,
  ROUND(COUNT(CASE WHEN clicked = true THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as ctr
FROM category_impressions
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY tier
ORDER BY tier;
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-10 | Initial specification locked | Product Team |

---

## References

- **Source Analysis:** `chat.md` (Lines 6050-6900)
- **Schema Reference:** `SERVICE_PROVIDER_COMPLETE_SCHEMA.md`
- **User Research:** `MITASAFI_USER_ANALYSIS.md`
- **Product Requirements:** `MITASAFI_PRD.md`

---

**Status:** LOCKED ✅  
**Next Review:** Q2 2026 (after 3 months of data)
