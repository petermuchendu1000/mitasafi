# MITASAFI SERVICE CONSTITUTION

**Version:** 1.0.0  
**Effective Date:** January 11, 2026  
**Status:** LOCKED — Changes require governance review

---

## PREAMBLE

This document defines the canonical service architecture for Mitasafi. It is not a feature specification — it is **governance law**. Every service, category, cluster, and rule herein is final and enforceable at the schema level.

**Pillars:** Quality · Trust · Transparency

**Principle:** Growth never overrides trust.

---

## PART I: FIRST PRINCIPLES

### 1.1 This Is a Trust System

Mitasafi is not a listing platform. It is a **trust institution**.

- Growth is optional
- Trust is irreversible
- Ambiguity is fatal

Any design choice that creates identity confusion, allows role inflation, or permits reputation leakage **must be rejected**, even if it costs supply.

### 1.2 One Provider = One Professional Identity

A provider profile represents:

> "Who the customer believes they are letting into their space."

If that identity cannot be explained in one sentence, it does not belong.

**The "Niliita ___" Test:** If a Kenyan customer cannot naturally say "Niliita [identity]" without confusion, the identity is invalid.

### 1.3 Clusters vs Categories

| Concept | Definition |
|---------|------------|
| **Cluster** | A professional identity that customers trust as one thing |
| **Category** | A service domain within a cluster |
| **Service** | A specific task a provider can perform |

Clusters are trust boundaries. Categories are administrative groupings. Services are deliverables.

### 1.4 Provider Types

| Type | Definition | Rules |
|------|------------|-------|
| **Individual** | One person with skills | Max 2 categories, same cluster only |
| **Company** | Registered business with staff | May span clusters with verification |

No switching between types without complete re-onboarding.

---

## PART II: CLUSTER TAXONOMY

### Overview

| Code | Cluster Name | Identity (SW/EN) | Categories | Adjacency |
|------|--------------|------------------|------------|-----------|
| A | Plumbing & Fluid Systems | Fundi wa maji/gas | 2 | Within cluster |
| B | Electrical & Low-Voltage | Fundi wa stima | 2 | Within cluster |
| C | Cleaning & Hygiene | Cleaner | 3 | Hub-spoke |
| D | Interior Finishing | Carpenter/Painter | 2 | Within cluster |
| E | Fabrication | Welder/Fabricator | 2 | Within cluster |
| F | Moving & Clearance | Mover | 2 | Within cluster |
| G | Gardening & Outdoor | Gardener | 2 | Within cluster |
| H | IT & Device Support | Computer fundi | 1 | None |
| I | Personal Care | Beautician | 1 | None (single-identity) |
| J | Care & Dependent | Caregiver | 1 | None (single-identity) |
| K | Transport | Driver | 1 | None (single-identity) |
| L | Events | Event professional | 2 | Special rules |
| M | Errands | Delivery assistant | 1 | None (single-identity) |

---

### CLUSTER A — PLUMBING & FLUID SYSTEMS

**Identity:** Fundi wa maji / gas  
**Trust Context:** Home infrastructure, leak/pressure/explosion risk  
**Adjacency:** Allowed within cluster (max 2 categories for individuals)

#### Category: Plumbing (plumbing)

| # | Service | Scope | Excludes |
|---|---------|-------|----------|
| 1 | Emergency Burst Pipe Repair | Immediate isolation and repair of burst/ruptured water pipes | Structural rebuilding |
| 2 | Emergency Drain Unblocking | Clearing blocked sinks, toilets, drains via manual/mechanical methods | Excavation |
| 3 | Emergency Water Leak Repair | Identification and repair of active leaks in joints, fittings, exposed pipes | Hidden leaks requiring wall opening |
| 4 | Tap Installation | Installation of new taps or mixers including basic fittings | Cabinetry work |
| 5 | Tap Repair | Fixing leaks, loose handles, worn cartridges | Full replacement |
| 6 | Toilet Repair | Repair of flushing mechanisms, leaks, seals | Bowl replacement |
| 7 | Toilet Installation | Installation of new toilet units | Flooring/tiling |
| 8 | Sink Installation | Mounting and plumbing connection of sinks | Countertop work |
| 9 | Pipe Repair | Repair or replacement of damaged pipes | Full system redesign |
| 10 | Drain Cleaning | Preventive or non-emergency drain clearing | Emergency response |
| 11 | Water Heater Installation | Installation of electric/gas water heaters, plumbing connections | Electrical wiring |
| 12 | Water Heater Repair | Repair of leaks, valves, heating components | Electrical components |
| 13 | Bathroom Plumbing Installation | Complete bathroom plumbing setup: pipes, fixtures, drainage | Tiling, electrical |
| 14 | Kitchen Plumbing Installation | Plumbing for sinks, dishwashers, water points | Cabinetry, electrical |
| 15 | Water Tank Installation | Installation and connection of water storage tanks | Structural work |
| 16 | Water Pump Installation | Installation of pumps for water supply (plumbing-side) | Electrical wiring |
| 17 | Sewer Line Repair | Repair of damaged sewer lines including localized excavation | Major excavation |

#### Category: Water & Gas Delivery (water-gas-delivery)

| # | Service | Scope |
|---|---------|-------|
| 1 | Water Bowser Delivery | Bulk water delivery via truck |
| 2 | Drinking Water Delivery | Potable water delivery in containers |
| 3 | Gas Cylinder Delivery | Delivery of filled gas cylinders |
| 4 | Gas Cylinder Refill | Exchange or refill of cylinders |
| 5 | Gas Cooker Installation | Installation of gas cookers including hose and regulator setup |
| 6 | Gas Pipe Installation | Installation of fixed gas piping |
| 7 | Gas Leak Check | Inspection and testing for gas leaks |

**Cluster A Totals:** 2 categories, 24 services

---

### CLUSTER B — ELECTRICAL & LOW-VOLTAGE SYSTEMS

**Identity:** Fundi wa stima  
**Trust Context:** Power safety, wiring expertise  
**Adjacency:** Allowed within cluster (max 2 categories for individuals)  
**Boundary Rule:** Wiring/cabling → B; Software/devices only → H

#### Category: Electrical (electrical)

| # | Service | Scope |
|---|---------|-------|
| 1 | Emergency Power Restoration | Restoring power after outages or faults |
| 2 | Emergency Short Circuit Repair | Identifying and fixing short circuits |
| 3 | Emergency Electrical Safety Check | Immediate safety inspection after incidents |
| 4 | Socket Installation | Installing new power outlets |
| 5 | Socket Repair | Repair or replacement of faulty sockets |
| 6 | Light Fixture Installation | Installation of lighting fixtures |
| 7 | Light Switch Installation | Installation of switches |
| 8 | Ceiling Fan Installation | Mounting and wiring ceiling fans |
| 9 | Circuit Breaker Replacement | Replacement of faulty breakers |
| 10 | Electrical Troubleshooting | Diagnosis of electrical faults |
| 11 | House Rewiring | Complete or partial rewiring of buildings |
| 12 | Distribution Board Installation | Installation of breaker panels |
| 13 | Electrical Inspection | Safety and compliance inspection |

#### Category: Internet & Networking (internet-networking)

| # | Service | Scope | Why Cluster B |
|---|---------|-------|---------------|
| 1 | Router Setup | Installation and configuration of routers | Cabling involved |
| 2 | WiFi Troubleshooting | Resolving connectivity issues | May involve cabling |
| 3 | Network Cable Installation | Running and terminating data cables | Cabling primary |
| 4 | WiFi Range Extension | Installation of extenders or mesh systems | Cabling possible |
| 5 | Smart TV Setup | Network connection and configuration | Cabling likely |
| 6 | Printer Network Setup | Connecting printers to networks | Cabling possible |
| 7 | Home Network Installation | Full home networking setup | Cabling primary |
| 8 | Office Network Setup | Business networking installation | Cabling primary |
| 9 | CCTV Installation | Camera installation and cabling | Cabling primary |

**Cluster B Totals:** 2 categories, 22 services

---

### CLUSTER C — CLEANING & HYGIENE

**Identity:** Cleaner  
**Trust Context:** Household hygiene, regular access  
**Adjacency:** Hub-and-spoke model

```
    Laundry ←── CLEANING ──→ Pest Control
                 (hub)
```

**Valid combinations:**
- Cleaning + Laundry ✅
- Cleaning + Pest Control ✅
- Laundry + Pest Control ❌
- All three ❌

**Rule:** Cleaning must be primary for any secondary.

#### Category: Cleaning (cleaning)

| # | Service | Scope |
|---|---------|-------|
| 1 | House Cleaning | General cleaning of houses |
| 2 | Apartment Cleaning | Cleaning of apartment units |
| 3 | Office Cleaning | Commercial office cleaning |
| 4 | Deep Cleaning | Intensive cleaning of all areas |
| 5 | Move-In Cleaning | Pre-occupancy cleaning |
| 6 | Move-Out Cleaning | Post-occupancy cleaning |
| 7 | Post-Construction Cleaning | Removal of dust and debris after construction |
| 8 | Kitchen Deep Cleaning | Intensive kitchen cleaning |
| 9 | Bathroom Deep Cleaning | Intensive bathroom cleaning |
| 10 | Window Cleaning | Interior and exterior windows |
| 11 | Carpet Cleaning | Deep carpet washing |
| 12 | Sofa Cleaning | Upholstery cleaning |
| 13 | Mattress Cleaning | Deep mattress sanitation |
| 14 | Curtain Cleaning | On-site or off-site curtain cleaning |

#### Category: Laundry (laundry)

| # | Service |
|---|---------|
| 1 | Wash & Fold |
| 2 | Wash & Iron |
| 3 | Dry Cleaning |
| 4 | Shoe Cleaning |
| 5 | Bag Cleaning |
| 6 | Curtain Laundry |
| 7 | Duvet & Blanket Cleaning |

#### Category: Pest Control (pest-control)

| # | Service |
|---|---------|
| 1 | General Fumigation |
| 2 | Cockroach Control |
| 3 | Bedbug Treatment |
| 4 | Ant Control |
| 5 | Rodent Control |
| 6 | Termite Treatment |
| 7 | Mosquito Control |
| 8 | Flea Treatment |
| 9 | Pre-Construction Termite Treatment |

**Cluster C Totals:** 3 categories, 30 services

---

### CLUSTER D — INTERIOR FINISHING & WOODWORK

**Identity:** Carpenter / Finishing fundi  
**Trust Context:** Aesthetics, finish-phase construction  
**Adjacency:** Allowed within cluster (max 2 categories for individuals)

#### Category: Carpentry (carpentry)

| # | Service |
|---|---------|
| 1 | Door Repair |
| 2 | Door Installation |
| 3 | Lock Installation |
| 4 | Lock Repair |
| 5 | Shelf Installation |
| 6 | Furniture Repair |
| 7 | Furniture Assembly |
| 8 | Window Frame Repair |
| 9 | Custom Wardrobe |
| 10 | Kitchen Cabinet Making |
| 11 | Built-in Furniture |
| 12 | Wooden Deck Construction |
| 13 | Pergola Construction |

#### Category: Painting (painting)

| # | Service |
|---|---------|
| 1 | Wall Touch-Up |
| 2 | Door Painting |
| 3 | Window Frame Painting |
| 4 | Fence Painting |
| 5 | Ceiling Painting |
| 6 | Interior House Painting |
| 7 | Exterior House Painting |
| 8 | Room Painting |
| 9 | Office Painting |
| 10 | Apartment Painting |

**Cluster D Totals:** 2 categories, 23 services

---

### CLUSTER E — FABRICATION (METAL, GLASS, ALUMINIUM)

**Identity:** Welder / Fabricator  
**Trust Context:** Workshop-based, precision, measurement  
**Adjacency:** Allowed within cluster (max 2 categories for individuals)

#### Category: Welding & Metal Works (welding-metal-works)

| # | Service |
|---|---------|
| 1 | Welding Repair |
| 2 | Gate Repair |
| 3 | Burglar Proofing Repair |
| 4 | Gate Fabrication |
| 5 | Burglar Proofing Installation |
| 6 | Balcony Railing |
| 7 | Staircase Railing |
| 8 | Metal Roofing |

#### Category: Glass & Aluminium Works (glass-aluminium-works)

| # | Service |
|---|---------|
| 1 | Window Glass Replacement |
| 2 | Mirror Installation |
| 3 | Glass Door Repair |
| 4 | Aluminium Window Installation |
| 5 | Aluminium Door Installation |
| 6 | Glass Partition |
| 7 | Shower Enclosure |
| 8 | Shop Front Glass |

**Cluster E Totals:** 2 categories, 16 services

---

### CLUSTER F — MOVING & HOUSEHOLD CLEARANCE

**Identity:** Mover  
**Trust Context:** Logistics, lifting, transport  
**Adjacency:** Allowed within cluster (max 2 categories for individuals)

#### Category: Moving & Relocation (moving-relocation)

| # | Service |
|---|---------|
| 1 | House Moving (Local) |
| 2 | House Moving (Long Distance) |
| 3 | Office Moving |
| 4 | Single Item Moving |
| 5 | Packing Services |
| 6 | Unpacking Services |
| 7 | Furniture Disassembly |
| 8 | Furniture Reassembly |

#### Category: Garbage & Junk Removal (garbage-junk-removal)

| # | Service | Scope |
|---|---------|-------|
| 1 | Garbage Collection | Regular household waste |
| 2 | Junk Removal | Bulky household items |
| 3 | Construction Debris Removal | Post-construction waste |
| 4 | Old Furniture Disposal | Furniture clearance |
| 5 | E-Waste Disposal | Electronic waste |

**Note:** Garden waste is NOT in this cluster — see Cluster G.

**Cluster F Totals:** 2 categories, 13 services

---

### CLUSTER G — GARDENING & OUTDOOR MAINTENANCE

**Identity:** Gardener  
**Trust Context:** Outdoor work, seasonal maintenance  
**Adjacency:** Allowed within cluster (max 2 categories for individuals)

#### Category: Gardening & Landscaping (gardening-landscaping)

| # | Service |
|---|---------|
| 1 | Lawn Mowing |
| 2 | Garden Maintenance |
| 3 | Hedge Trimming |
| 4 | Tree Trimming |
| 5 | Weed Control |
| 6 | Flower Planting |
| 7 | Landscape Design |
| 8 | Garden Installation |
| 9 | Irrigation System Installation |
| 10 | Paving & Pathways |

#### Category: Garden Waste Removal (garden-waste-removal) — NEW

| # | Service |
|---|---------|
| 1 | Garden Waste Removal |

**Cluster G Totals:** 2 categories, 11 services

---

### CLUSTER H — IT & DEVICE SUPPORT

**Identity:** Computer fundi  
**Trust Context:** Desk-based problem solving, device expertise  
**Adjacency:** None (single-category cluster)  
**Boundary:** No structural wiring, no electrical risk

#### Category: IT & Tech Support (it-tech-support)

| # | Service |
|---|---------|
| 1 | Computer Repair |
| 2 | Laptop Repair |
| 3 | Virus Removal |
| 4 | Data Recovery |
| 5 | Software Installation |
| 6 | Computer Setup |
| 7 | Phone Screen Repair |
| 8 | Printer Repair |

**Cluster H Totals:** 1 category, 8 services

---

### CLUSTER I — PERSONAL CARE (SINGLE-IDENTITY)

**Identity:** Beautician / Therapist  
**Trust Context:** Intimate service, personal trust, hygiene-critical  
**Adjacency:** None — single-identity only  
**Rule:** Cannot combine with any other cluster or category

#### Category: Beauty & Home Services (beauty-home-services)

| # | Service |
|---|---------|
| 1 | Home Haircut (Men) |
| 2 | Home Haircut (Kids) |
| 3 | Home Hair Styling (Women) |
| 4 | Makeup Artist |
| 5 | Bridal Makeup |
| 6 | Manicure & Pedicure |
| 7 | Massage Therapy |
| 8 | Henna / Mehndi |

**Cluster I Totals:** 1 category, 8 services

---

### CLUSTER J — CARE & DEPENDENT SERVICES (SINGLE-IDENTITY)

**Identity:** Caregiver  
**Trust Context:** Highest liability, background-check tier  
**Adjacency:** None — single-identity only  
**Rule:** Cannot combine with any other cluster or category

#### Category: Childcare & Home Care (childcare-home-care)

| # | Service |
|---|---------|
| 1 | Babysitting |
| 2 | Nanny Services |
| 3 | Elderly Care |
| 4 | Home Nursing |
| 5 | Homework Help |
| 6 | Special Needs Care |

**Cluster J Totals:** 1 category, 6 services

---

### CLUSTER K — TRANSPORT (SINGLE-IDENTITY)

**Identity:** Driver  
**Trust Context:** Binary trust, licensing, insurance  
**Adjacency:** None — single-identity only  
**Rule:** Cannot combine with any other cluster or category

#### Category: Taxi & Rides (taxi-rides)

| # | Service |
|---|---------|
| 1 | Airport Transfer |
| 2 | School Run |
| 3 | Corporate Shuttle |
| 4 | Private Driver (Hourly) |
| 5 | Private Driver (Daily) |
| 6 | Wedding Car Hire |
| 7 | Event Transportation |

**Cluster K Totals:** 1 category, 7 services

---

### CLUSTER L — EVENTS (SPECIAL HANDLING)

**Identity:** Event professional  
**Trust Context:** Performance or coordination  
**Adjacency:** Special rules — see below

#### SPLIT STRUCTURE

Events is split into two categories with different provider rules:

##### Category: Event Performers (event-performers) — INDIVIDUALS ALLOWED

| # | Service | Provider Type |
|---|---------|---------------|
| 1 | DJ Services | Individual ✅ |
| 2 | Event Photography | Individual ✅ |
| 3 | Event Videography | Individual ✅ |
| 4 | MC Services | Individual ✅ |

##### Category: Event Coordination (event-coordination) — COMPANY ONLY

| # | Service | Provider Type |
|---|---------|---------------|
| 1 | Event Planning | Company only |
| 2 | Event Decoration | Company only |
| 3 | Tent & Chair Hire | Company only |
| 4 | Catering Services | Company only |

**Rules:**
- Individuals may only select from Event Performers
- Companies may select from either/both categories
- No bundling of performer + coordination for individuals
- Reviews are service-specific

**Cluster L Totals:** 2 categories, 8 services

---

### CLUSTER M — ERRANDS (SINGLE-IDENTITY, CONSTRAINED)

**Identity:** Pickup & Delivery Assistant  
**Trust Context:** Logistics only — NO home presence  
**Adjacency:** None — single-identity only

#### Category: Shopping & Assistance (shopping-assistance)

| # | Service | Scope | Constraint |
|---|---------|-------|------------|
| 1 | Grocery Shopping | Purchase and delivery | No home access |
| 2 | Errand Running | Specific defined tasks | No open-ended |
| 3 | Bill Payment | Payment at service points | Receipt required |
| 4 | Document Pickup | Collect documents | No handling content |
| 5 | Parcel Delivery | Transport items | Tracked delivery |
| 6 | Medicine Pickup | Pharmacy runs | Prescription handling |

**Special Constraints:**
- No home presence required
- No personal care overlap
- Delivery confirmation mandatory
- GPS tracking recommended
- No free-text "other tasks"

**Cluster M Totals:** 1 category, 6 services

---

## PART III: ENFORCEMENT RULES

### 3.1 Universal Adjacency Law

**For Individuals:**

> No cross-cluster adjacency. Ever.

Adjacency exists **only within clusters**, and only where explicitly allowed.

| Cluster | Adjacency Rule |
|---------|----------------|
| A | Any 2 within cluster |
| B | Any 2 within cluster |
| C | Hub-spoke (Cleaning + 1) |
| D | Any 2 within cluster |
| E | Any 2 within cluster |
| F | Any 2 within cluster |
| G | Any 2 within cluster |
| H | None (single category) |
| I | None (single-identity) |
| J | None (single-identity) |
| K | None (single-identity) |
| L | Performers only for individuals |
| M | None (single-identity) |

### 3.2 Single-Identity Clusters

These clusters prohibit ANY secondary category:

| Cluster | Reason |
|---------|--------|
| I (Beauty) | Intimate trust, contamination destroys credibility |
| J (Care) | Highest liability, child safety |
| K (Transport) | Binary trust, licensing |
| M (Errands) | Weak identity, abuse risk |

### 3.3 Cross-Cluster Prohibitions (Absolute)

These combinations are blocked at schema level:

| Combination | Reason |
|-------------|--------|
| Care ⟷ Anything | Highest trust tier |
| Beauty ⟷ Anything | Intimate service |
| Transport ⟷ Anything | Binary identity |
| Electrical ⟷ Plumbing | Different risk domains |
| Cleaning ⟷ Beauty | Different contexts |
| Any Maintenance ⟷ Care | Trust model incompatibility |

### 3.4 Company Rules

Companies do NOT bypass rules — they aggregate specialists.

**Requirements:**
- Legally registered (BN/CR number)
- Named technician per category claimed
- Each cluster verified independently
- Reviews scoped to cluster/category
- Coordination transparent

**Allowed:**
- May span clusters (with verification)
- Max 3 clusters total
- Each cluster requires dedicated staff

**Prohibited:**
- No claiming categories without technicians
- No review averaging across categories
- No hiding company nature

---

## PART IV: REVIEW & REPUTATION

### 4.1 Review Scoping

Reviews are tied to:
- `provider_id`
- `cluster_id`
- `category_id`
- `service_id` (optional granularity)

### 4.2 No Averaging

A provider with:
- 4.8 plumbing rating (30 reviews)
- 3.2 cleaning rating (10 reviews)

Shows:
- **4.8** when searched for plumbing
- **3.2** when searched for cleaning
- **Never** a blended average

### 4.3 No Reputation Transfer

- Career changes require new profiles
- Reviews do not transfer across identities
- Cluster changes reset reputation

### 4.4 Company Reviews

Companies have two review types:
- **Category-specific:** Quality of work in that category
- **Coordination:** Reliability, dispatch, communication

Both are visible. Neither inflates the other.

---

## PART V: PROVIDER STATES & FLOWS

### 5.1 Individual Provider States

```
draft → pending_verification → published → suspended → archived
```

| State | Meaning |
|-------|---------|
| draft | Profile incomplete |
| pending_verification | KYC in progress |
| published | Active and searchable |
| suspended | Temporarily blocked (strikes) |
| archived | Permanently inactive |

### 5.2 Company Provider States

```
draft → verification_pending → verified → published → suspended → archived
```

Additional gate: verification_pending requires:
- Business registration proof
- Technician mapping
- Disclosure completion

### 5.3 State Transitions

| Trigger | From | To |
|---------|------|-----|
| Submit profile | draft | pending_verification |
| Pass KYC | pending_verification | published |
| 3 strikes | published | suspended |
| Appeal approved | suspended | published |
| Fraud confirmed | any | archived |
| Inactivity 12mo | published | archived |

---

## PART VI: QUALITY GATES

### 6.1 Verification Requirements

| Provider Type | Required |
|---------------|----------|
| Individual | National ID, verified phone, operating area |
| Company | Business registration, director ID, technicians |

### 6.2 Strike System

| Event | Strike Weight |
|-------|---------------|
| Cancellation < 2 hours | 0.5 |
| No-show | 1.0 |
| Verified dispute | 1.0 |
| Safety incident | Immediate suspension |

**Threshold:** 3.0 strikes = suspension pending review

### 6.3 Progressive Trust

| Level | Requirements | Benefits |
|-------|--------------|----------|
| New | KYC passed | Can publish |
| Probation | < 5 jobs | Limited visibility |
| Trusted | 5+ jobs, ≥4.0 rating | Full visibility |
| Premium | 20+ jobs, ≥4.5 rating, 0 disputes | Priority ranking |

---

## PART VII: ATTACK SURFACE & MITIGATIONS

### 7.1 Known Attack Vectors

| Attack | Description | Mitigation |
|--------|-------------|------------|
| Category inflation | Adding extra categories | Schema cap at 2 |
| Identity masquerade | Individual claims company | Verification gate |
| Fake technicians | Company lists non-existent staff | Phone verification |
| Review import | Using old reviews for new identity | Reviews tied to provider_id |
| Broker disguise | Accept jobs, forward to randoms | Technician assignment tracking |
| Role bundling | Combining incompatible services | Cluster enforcement |
| Category hopping | Frequent switches | Change triggers review |

### 7.2 Enforcement Layers

| Layer | Function | Bypass Resistance |
|-------|----------|-------------------|
| UI | Prevent invalid selections | Low (can use API) |
| API | Validate before persistence | Medium (can use SQL) |
| DB | Schema constraints | High (irrefutable) |

**Principle:** All three layers must enforce the same rules.

### 7.3 Audit Requirements

Every rejected attempt logs:
- Provider ID
- Attempted combination
- Reason code
- Timestamp
- IP/device fingerprint

Pattern detection on:
- Repeated invalid attempts
- Unusual category switches
- Multi-account signals

---

## PART VIII: IMPLEMENTATION DECISIONS (LOCKED)

These decisions are final. Do not revisit without governance review.

### 8.0 Finalized Decision Points

#### D1. Provider Type Default

**Decision:** Default to `individual`, upgrade to `company`

**Rationale:**
- 80-90% of providers are individuals
- "Company" is an earned state, not a starting choice
- Prevents individuals selecting company to bypass limits
- Keeps signup low-friction while preserving trust

**Hard Rules:**
- `provider_type` defaults to `individual`
- Company upgrade is a separate flow requiring re-verification
- Cannot reuse individual reviews across clusters
- Provider type switching requires complete re-onboarding

#### D2. Cluster Code Format

**Decision:** Human-readable slugs

**Examples:**
- `plumbing-fluid`
- `electrical-lowvoltage`
- `cleaning-hygiene`
- `interior-finishing`
- `fabrication`
- `moving-clearance`
- `gardening-outdoor`
- `it-device`
- `personal-care`
- `care-dependent`
- `transport`
- `events`
- `errands`

**Rationale:**
- Self-documenting in DB, logs, analytics, errors
- Stable across time (letter codes are brittle)
- Easier for support, analytics, and debugging
- Negligible storage cost

#### D3. Adjacency Storage Model

**Decision:** Unidirectional adjacency + application symmetry

**Storage:** `(primary_category_id, secondary_category_id)`

**Rationale:**
- Adjacency is a rule, not a relationship
- Keeps data minimal and intentional
- Prevents accidental bidirectional logic where it shouldn't exist
- Critical for hub-spoke (Cluster C) where direction matters

**Example (Cluster C):**
- cleaning → laundry ✅
- cleaning → pest-control ✅
- laundry → cleaning ❌ (not added)
- laundry → pest-control ❌ (not added)

Bidirectional storage would actively work against hub-spoke enforcement.

#### D4. Hub-Spoke Enforcement Location

**Decision:** Application logic, not schema

**Rationale:**
- Hub-spoke is business logic, not relational truth
- Easier to evolve for future clusters
- Keeps schema clean and generic
- Enforcement already happens at API boundary

**Requirements:**
- `is_hub` column lives in `cluster_categories`
- Application logic enforces: if secondary exists and cluster.adjacency_model = hub_spoke → primary_category.is_hub must be true
- Never rely on UI alone

#### D5. Personal vs Business Choice

**Decision:** Keep the choice, redefine its meaning

**The choice declares identity, not capability:**

| Choice | Meaning |
|--------|---------|
| Personal | "I offer my own labor under one professional identity." |
| Business | "I represent an organisation that coordinates other people." |

**NOT:**
- "I'm more professional"
- "I want more categories"
- "I'm bigger"

**Critical Rule: Both start restricted**

| Provider Type | Initial Capability |
|---------------|-------------------|
| Personal | 1 cluster, up to 2 categories |
| Business | 1 cluster, up to 2 categories |

No difference at signup. This eliminates abuse and simplifies early logic.

**Difference manifests later:**
- Personal providers: Always bound to one cluster, no upgrade path
- Business providers: May request additional clusters (each requires verification, named technician, separate review surface)

"Business" is not "more power" — it is "more responsibility".

---

### 8.1 Schema Tables

```sql
-- Cluster definitions
clusters (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,  -- Human-readable slug: 'plumbing-fluid'
  name VARCHAR(100) NOT NULL,
  identity_label_en VARCHAR(100),
  identity_label_sw VARCHAR(100),
  max_categories_individual INTEGER DEFAULT 2,
  is_single_identity BOOLEAN DEFAULT FALSE,
  adjacency_model VARCHAR(20) DEFAULT 'within_cluster'  -- 'within_cluster', 'hub_spoke', 'none', 'special'
)

-- Category to cluster mapping
cluster_categories (
  cluster_id UUID REFERENCES clusters(id),
  category_id UUID REFERENCES service_categories(id),
  is_hub BOOLEAN DEFAULT FALSE,  -- Only true for 'cleaning' in hub-spoke cluster
  allows_individual BOOLEAN DEFAULT TRUE,  -- False for 'event-coordination'
  requires_company_verification BOOLEAN DEFAULT FALSE,  -- True for 'event-coordination'
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (cluster_id, category_id)
)

-- Allowed adjacency pairs (UNIDIRECTIONAL - direction matters)
cluster_adjacency (
  id UUID PRIMARY KEY,
  cluster_id UUID REFERENCES clusters(id),
  primary_category_id UUID REFERENCES service_categories(id),
  secondary_category_id UUID REFERENCES service_categories(id),
  UNIQUE (cluster_id, primary_category_id, secondary_category_id)
)
-- NOTE: For hub-spoke clusters, only hub→spoke pairs are stored
-- Application enforces: if adjacency_model='hub_spoke', primary must have is_hub=true

-- Provider cluster assignment (SINGLE ROW PER PROVIDER - enforces max-2 at schema level)
provider_clusters (
  provider_id UUID REFERENCES providers(id),
  cluster_id UUID REFERENCES clusters(id),
  primary_category_id UUID REFERENCES service_categories(id),
  secondary_category_id UUID REFERENCES service_categories(id),  -- Nullable
  policy_version VARCHAR(20) DEFAULT '1.0.0',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider_id)
)
-- NOTE: Single-row design is intentional. Makes identity explicit, simplifies queries,
-- prevents "creative" partial states. Do not normalize to per-category rows.

-- Rejection audit log (CRITICAL - do not clean aggressively)
provider_category_attempts (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES providers(id),
  attempted_primary UUID,
  attempted_secondary UUID,
  reason_code VARCHAR(50),
  metadata JSONB,  -- IP, device fingerprint, session info
  created_at TIMESTAMPTZ DEFAULT NOW()
)
-- Enables: abuse detection, UX improvements, policy pressure analysis, evidence for disputes
```

### 8.2 Validation Function

```
FUNCTION validate_provider_categories(
  provider_id UUID,
  primary_category_id UUID,
  secondary_category_id UUID
) RETURNS validation_result

1. Resolve cluster from primary_category_id
2. Get provider type (individual/company)

3. IF individual:
   a. Check cluster.is_company_only = false
   b. Check cluster.is_single_identity = false OR secondary IS NULL
   c. IF secondary IS NOT NULL:
      - Verify secondary is in same cluster
      - Verify (primary, secondary) exists in cluster_adjacency
      - For Cluster C: verify primary is the hub (cleaning)
   d. Verify category.allows_individual = true

4. IF company:
   a. For each category, verify has_verified_technician(provider, category)
   b. Verify total clusters ≤ 3

5. Check global prohibitions

6. RETURN OK or ERROR with reason_code
```

### 8.3 Reason Codes

| Code | Message (EN) | Message (SW) |
|------|--------------|--------------|
| SINGLE_IDENTITY | This service is offered as standalone only | Huduma hii hufanywa pekee |
| CROSS_CLUSTER | These services cannot be combined | Huduma hizi hazichanganyiki |
| HUB_REQUIRED | Cleaning must be primary for this combination | Usafi lazima iwe ya kwanza |
| CAP_EXCEEDED | Maximum categories reached | Umefika kikomo |
| COMPANY_ONLY | This service requires company registration | Huduma hii inahitaji kampuni |
| TECHNICIAN_REQUIRED | Add a technician for this category | Ongeza fundi kwa huduma hii |
| VERIFICATION_REQUIRED | Complete verification first | Kamilisha uthibitisho kwanza |

### 8.4 UI Requirements

**Step 1: Primary Category Selection**
- Show all categories
- After selection, resolve cluster
- Store cluster assignment

**Step 2: Secondary Category Selection (if allowed)**
- Show only categories in same cluster
- Apply hub-spoke rule for Cluster C
- If single-identity cluster, skip step

**Step 3: Service Selection**
- Show services from selected categories only
- Services ordered by canonical sequence

**Disabled State:**
- Unselectable categories shown grayed
- Tooltip explains why not allowed

### 8.5 Hardening & Simplifications

These safeguards prevent future complexity leakage.

#### H1. `provider_clusters` Single-Row Design — LOCKED

One row per provider is correct and intentional.

**Why:**
- Enforces max-2 at schema level
- Makes identity explicit
- Simplifies every downstream query
- Prevents "creative" partial states

The "normalized per-category" model only helps flexibility — which is explicitly unwanted.

**Do not change this design.**

#### H2. `provider_category_attempts` — CRITICAL, DO NOT CLEAN

This audit table is not optional. It enables:
- Abuse detection
- UX improvements ("most rejected combo")
- Policy pressure analysis
- Evidence when providers complain

**Retention:** Minimum 2 years. Do not clean aggressively.

#### H3. Service Types Remain Orthogonal

The 5 service types (emergency, standard, delivery, project, personal) are **orthogonal** to clusters.

Do NOT entangle them with identity logic.

They affect:
- Pricing
- SLA
- Booking UX

They do NOT affect:
- Trust boundaries
- Category rules
- Cluster membership

Good separation — preserve it.

#### H4. Event Coordination Extra Guardrail

For `event-coordination` category:

```sql
requires_company_verification = true
```

**Enforcement:**
- Category visible only to verified companies
- Not selectable by individuals (grayed in UI)
- API rejects even if UI bypassed

This prevents "I'll select it and see what happens".

#### H5. Errands External Naming

| Internal | External (UI) |
|----------|---------------|
| `shopping-assistance` | "Pickup & Delivery Assistance" |
| Cluster M | Errands cluster |

**Why rename in UI:**
- Reduces scope creep
- Prevents dangerous user requests ("run any errand")
- Minimizes support nightmares

This is a language enforcement tool. Internal slugs unchanged.

---

### 8.6 Execution Order (DO NOT REORDER)

This phased rollout is designed to prevent cascading failures. Each phase must complete before the next begins.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  WARNING: PHASE ORDER IS LOAD-BEARING                          │
│                                                                     │
│  Reordering phases will cause:                                      │
│  - Data integrity violations                                        │
│  - UI/API mismatches                                                │
│  - Provider confusion                                               │
│  - Audit gaps                                                       │
│                                                                     │
│  If you need to skip a phase, STOP and reassess.                   │
└─────────────────────────────────────────────────────────────────────┘
```

#### PHASE 1 — Schema Foundation (Silent, Safe)

**Goal:** Add new tables without behavior change

**Actions:**
1. Create `clusters` table (empty)
2. Create `cluster_categories` table (empty)
3. Create `cluster_adjacency` table (empty)
4. Create `provider_clusters` table (empty)
5. Create `provider_category_attempts` table (empty)
6. Add `provider_type` column to `providers` if missing (default: 'individual')

**Risk:** Zero — new tables, no data, no behavior change

**Verification:**
- [ ] All tables exist
- [ ] No foreign key violations
- [ ] Existing flows unaffected

**Gate:** Do not proceed to Phase 2 until verification passes.

---

#### PHASE 2 — Data Seeding & Category Restructure

**Goal:** Populate cluster structure, adjust categories/services

**Actions:**
1. Seed 13 clusters with all metadata
2. Create `garden-waste-removal` category
3. Move "Garden Waste Removal" service from `garbage-junk-removal` to new category
4. Create `event-performers` category
5. Create `event-coordination` category (with `requires_company_verification = true`)
6. Move performer services (DJ, Photo, Video, MC) to `event-performers`
7. Move coordination services (Planning, Decoration, Tent/Chair, Catering) to `event-coordination`
8. Delete original `events-planning` category (or rename to avoid orphans)
9. Seed `cluster_categories` mappings (22 categories → 13 clusters)
10. Seed `cluster_adjacency` pairs (all valid combinations)

**Risk:** Low — additive changes, existing provider selections still work

**Service Migration Impact:**
- Providers with Garden Waste Removal: `service_capabilities.service_id` unchanged, but service now points to different category
- Providers with Events services: same pattern

**Verification:**
- [ ] 13 clusters exist
- [ ] 22 categories mapped to clusters
- [ ] Adjacency pairs complete
- [ ] No orphaned services
- [ ] Existing providers can still view/edit profile

**Gate:** Do not proceed to Phase 3 until verification passes.

---

#### PHASE 3 — API Validation (LOG-ONLY MODE)

**Goal:** Validate all submissions against new rules without blocking

**Actions:**
1. Implement `validate_provider_categories()` function
2. Hook into category/service submission endpoint
3. Run validation on every submission
4. Log rejections to `provider_category_attempts` (but allow submission)
5. Monitor for 7 days minimum

**Risk:** Medium — must not break existing flows

**Metrics to Track:**
- Total submissions per day
- Rejection rate (should be informational only)
- Most common rejection codes
- Providers hitting rejections repeatedly

**What This Reveals:**
- Current invalid combinations in active use
- Edge cases not anticipated
- UI guidance gaps

**Verification:**
- [ ] Validation function works correctly (unit tests pass)
- [ ] Logging captures all fields
- [ ] No false positives (legitimate combinations passing)
- [ ] No false negatives (known invalid combinations detected)

**Gate:** Do not proceed to Phase 4 until log-only mode runs for 7+ days with stable metrics.

---

#### PHASE 4 — UI Update

**Goal:** Guide users to valid selections before API validates

**Actions:**
1. Update `Step1Category.tsx` with cluster awareness
2. Add conditional Step 2 (secondary category selection)
3. Update Step 3 to filter services by selected categories only
4. Add disabled states with clear tooltips
5. Add single-identity messaging
6. Add hub-spoke guidance for Cluster C
7. Hide company-only categories for individuals

**Risk:** Medium — user-facing changes, possible confusion

**UI Copy Requirements:**
- Disabled category tooltip: "Cannot combine with [selected]. Different expertise area."
- Single-identity message: "[Category] is offered as a standalone specialty. This helps customers trust your expertise."
- Company-only message: "This service requires company registration."
- Hub-spoke message: "Cleaning must be your primary service to add [Laundry/Pest Control]."

**Verification:**
- [ ] All 13 cluster paths tested
- [ ] Single-identity clusters skip secondary step
- [ ] Hub-spoke enforces correct order
- [ ] Company-only categories hidden for individuals
- [ ] Tooltips display correctly
- [ ] Mobile responsive

**Gate:** Do not proceed to Phase 5 until UI is deployed and stable for 3+ days.

---

#### PHASE 5 — Enforcement & DB Constraints (Final)

**Goal:** Turn on rejections and make rules irrefutable at database level

**Actions:**
1. Switch API validation from log-only to reject mode
2. Add database constraints:
   - `provider_clusters.secondary_category_id` must be in same cluster as primary (CHECK constraint via function)
   - `provider_clusters` must reference valid adjacency pair if secondary exists
3. Remove any legacy code paths that bypassed validation

**Risk:** Low — no existing providers to migrate (all data is seeded/test)

**Verification:**
- [ ] API rejections working
- [ ] Constraints active
- [ ] No legitimate operations blocked
- [ ] All test flows pass

**Final State:**
After Phase 5, the system is locked. The three enforcement layers (UI, API, DB) are aligned and irrefutable.

---

### 8.7 Rollback Procedures

Each phase has a rollback path. Do not proceed without knowing the escape route.

| Phase | Rollback Action | Data Loss |
|-------|-----------------|-----------|
| 1 | Drop new tables | None |
| 2 | Restore categories from backup, re-seed | Service moves reversed |
| 3 | Disable validation hook | Audit logs kept |
| 4 | Revert UI code | None |
| 5 | Disable rejections, drop constraints | None |

---

## PART IX: MIGRATION REQUIREMENTS

### 9.1 Database Changes (Detailed)

#### 9.1.1 New Tables

```sql
-- Execute in order (foreign key dependencies)

-- 1. Clusters table
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  identity_label_en VARCHAR(100),
  identity_label_sw VARCHAR(100),
  max_categories_individual INTEGER DEFAULT 2,
  is_single_identity BOOLEAN DEFAULT FALSE,
  adjacency_model VARCHAR(20) DEFAULT 'within_cluster',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_adjacency_model CHECK (
    adjacency_model IN ('within_cluster', 'hub_spoke', 'none', 'special')
  )
);

-- 2. Cluster-category mapping
CREATE TABLE cluster_categories (
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  is_hub BOOLEAN DEFAULT FALSE,
  allows_individual BOOLEAN DEFAULT TRUE,
  requires_company_verification BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cluster_id, category_id)
);

-- 3. Adjacency rules (unidirectional)
CREATE TABLE cluster_adjacency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  primary_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  secondary_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cluster_id, primary_category_id, secondary_category_id)
);

-- 4. Provider cluster assignment
CREATE TABLE provider_clusters (
  provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES clusters(id),
  primary_category_id UUID NOT NULL REFERENCES service_categories(id),
  secondary_category_id UUID REFERENCES service_categories(id),
  policy_version VARCHAR(20) DEFAULT '1.0.0',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Rejection audit log
CREATE TABLE provider_category_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  attempted_primary UUID,
  attempted_secondary UUID,
  reason_code VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add provider_type to providers if missing
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20) DEFAULT 'individual'
CHECK (provider_type IN ('individual', 'company'));

-- 7. Indexes for performance
CREATE INDEX idx_cluster_categories_category ON cluster_categories(category_id);
CREATE INDEX idx_cluster_adjacency_primary ON cluster_adjacency(primary_category_id);
CREATE INDEX idx_provider_clusters_cluster ON provider_clusters(cluster_id);
CREATE INDEX idx_provider_category_attempts_provider ON provider_category_attempts(provider_id);
CREATE INDEX idx_provider_category_attempts_created ON provider_category_attempts(created_at);
```

#### 9.1.2 Cluster Seed Data

```sql
INSERT INTO clusters (code, name, identity_label_en, identity_label_sw, max_categories_individual, is_single_identity, adjacency_model) VALUES
('plumbing-fluid', 'Plumbing & Fluid Systems', 'Fundi wa maji/gas', 'Fundi wa maji/gas', 2, false, 'within_cluster'),
('electrical-lowvoltage', 'Electrical & Low-Voltage', 'Fundi wa stima', 'Fundi wa stima', 2, false, 'within_cluster'),
('cleaning-hygiene', 'Cleaning & Hygiene', 'Cleaner', 'Msafishaji', 2, false, 'hub_spoke'),
('interior-finishing', 'Interior Finishing & Woodwork', 'Carpenter/Painter', 'Seremala/Mpaka rangi', 2, false, 'within_cluster'),
('fabrication', 'Fabrication (Metal, Glass, Aluminium)', 'Welder/Fabricator', 'Fundi wa kulehemu', 2, false, 'within_cluster'),
('moving-clearance', 'Moving & Household Clearance', 'Mover', 'Mhamishaji', 2, false, 'within_cluster'),
('gardening-outdoor', 'Gardening & Outdoor Maintenance', 'Gardener', 'Mtunza bustani', 2, false, 'within_cluster'),
('it-device', 'IT & Device Support', 'Computer fundi', 'Fundi wa kompyuta', 1, false, 'none'),
('personal-care', 'Personal Care', 'Beautician/Therapist', 'Mtaalamu wa urembo', 1, true, 'none'),
('care-dependent', 'Care & Dependent Services', 'Caregiver', 'Mlezi', 1, true, 'none'),
('transport', 'Transport', 'Driver', 'Dereva', 1, true, 'none'),
('events', 'Events', 'Event professional', 'Mtaalamu wa matukio', 2, false, 'special'),
('errands', 'Errands', 'Pickup & Delivery Assistant', 'Msaidizi wa uchukuzi', 1, true, 'none');
```

#### 9.1.3 New Categories Required

```sql
-- Garden Waste Removal (new category in Cluster G)
INSERT INTO service_categories (id, name, slug, description, icon)
VALUES (
  gen_random_uuid(),
  'Garden Waste Removal',
  'garden-waste-removal',
  'Removal and disposal of garden waste including grass clippings, branches, and leaves',
  'leaf'
);

-- Event Performers (split from events-planning)
INSERT INTO service_categories (id, name, slug, description, icon)
VALUES (
  gen_random_uuid(),
  'Event Performers',
  'event-performers',
  'Individual performers for events including DJs, photographers, videographers, and MCs',
  'music'
);

-- Event Coordination (split from events-planning, company-only)
INSERT INTO service_categories (id, name, slug, description, icon)
VALUES (
  gen_random_uuid(),
  'Event Coordination',
  'event-coordination',
  'Event planning, decoration, equipment hire, and catering services',
  'calendar'
);
```

#### 9.1.4 Service Migrations

```sql
-- Move Garden Waste Removal service to new category
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE slug = 'garden-waste-removal')
WHERE name = 'Garden Waste Removal';

-- Move performer services to event-performers
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE slug = 'event-performers')
WHERE name IN ('DJ Services', 'Event Photography', 'Event Videography', 'MC Services');

-- Move coordination services to event-coordination
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE slug = 'event-coordination')
WHERE name IN ('Event Planning', 'Event Decoration', 'Tent & Chair Hire', 'Catering Services');

-- Delete or archive old events-planning category (only after verifying no orphans)
-- DELETE FROM service_categories WHERE slug = 'events-planning';
```

### 9.2 Seed Script Updates

Update `seed-services-complete.mjs` to include:

1. **Cluster seeding** before categories
2. **Category-cluster mapping** after categories created
3. **Adjacency pairs** for all valid combinations
4. **New categories**: garden-waste-removal, event-performers, event-coordination
5. **Service reassignments**: Garden Waste, Events split
6. **Tags**: event-coordination marked as `requires_company_verification`

### 9.3 UI Copy Templates

#### 9.3.1 Single-Identity Cluster Message

```
Beauty & Home Services is offered as a standalone specialty.

This helps customers trust your expertise. Specialists in personal care 
build stronger reputations than providers who offer unrelated services.

Your reviews and ratings are specific to this service area.
```

#### 9.3.2 Hub-Spoke Message (Cluster C)

```
Cleaning is your primary service.

You can add Laundry OR Pest Control as a secondary service, but not both.
This ensures customers know exactly what to expect from you.
```

#### 9.3.3 Company-Only Message

```
This service requires company registration.

Event coordination services (planning, decoration, equipment hire, catering) 
require business registration because they involve staff coordination.

[Register as Company] or [Choose Different Services]
```

---

## PART X: GOVERNANCE

### 10.1 Policy Versioning

- Constitution version stored with provider selections
- Changes require version increment
- Migration path for affected providers

### 10.2 Change Process

1. **Research:** Data shows change is needed
2. **Proposal:** Document rationale, impact
3. **Review:** Product + Ops + Legal approve
4. **Implementation:** Update schema, migrate
5. **Communication:** Announce to providers

### 10.3 Exception Policy

**There are no exceptions.**

If a provider needs something outside this constitution:
- Either the constitution is wrong (update it globally)
- Or the provider doesn't belong on the platform

---

## APPENDIX A: COMPLETE SERVICE LIST

**Total:** 13 clusters, 22 categories, 183 services

| Cluster | Category | Service Count |
|---------|----------|---------------|
| A | plumbing | 17 |
| A | water-gas-delivery | 7 |
| B | electrical | 13 |
| B | internet-networking | 9 |
| C | cleaning | 14 |
| C | laundry | 7 |
| C | pest-control | 9 |
| D | carpentry | 13 |
| D | painting | 10 |
| E | welding-metal-works | 8 |
| E | glass-aluminium-works | 8 |
| F | moving-relocation | 8 |
| F | garbage-junk-removal | 5 |
| G | gardening-landscaping | 10 |
| G | garden-waste-removal | 1 |
| H | it-tech-support | 8 |
| I | beauty-home-services | 8 |
| J | childcare-home-care | 6 |
| K | taxi-rides | 7 |
| L | event-performers | 4 |
| L | event-coordination | 4 |
| M | shopping-assistance | 6 |

---

## APPENDIX B: CLUSTER QUICK REFERENCE

```
CLUSTER A: Plumbing & Fluid
├── plumbing (17 services)
└── water-gas-delivery (7 services)
    Adjacency: Within cluster, max 2

CLUSTER B: Electrical & Low-Voltage
├── electrical (13 services)
└── internet-networking (9 services)
    Adjacency: Within cluster, max 2

CLUSTER C: Cleaning & Hygiene
├── cleaning (14 services) [HUB]
├── laundry (7 services)
└── pest-control (9 services)
    Adjacency: Hub + 1 spoke only

CLUSTER D: Interior Finishing
├── carpentry (13 services)
└── painting (10 services)
    Adjacency: Within cluster, max 2

CLUSTER E: Fabrication
├── welding-metal-works (8 services)
└── glass-aluminium-works (8 services)
    Adjacency: Within cluster, max 2

CLUSTER F: Moving & Clearance
├── moving-relocation (8 services)
└── garbage-junk-removal (5 services)
    Adjacency: Within cluster, max 2

CLUSTER G: Gardening & Outdoor
├── gardening-landscaping (10 services)
└── garden-waste-removal (1 service)
    Adjacency: Within cluster, max 2

CLUSTER H: IT & Device
└── it-tech-support (8 services)
    Adjacency: None (single category)

CLUSTER I: Personal Care [SINGLE-IDENTITY]
└── beauty-home-services (8 services)
    Adjacency: None

CLUSTER J: Care & Dependent [SINGLE-IDENTITY]
└── childcare-home-care (6 services)
    Adjacency: None

CLUSTER K: Transport [SINGLE-IDENTITY]
└── taxi-rides (7 services)
    Adjacency: None

CLUSTER L: Events [SPECIAL]
├── event-performers (4 services) [Individual OK]
└── event-coordination (4 services) [Company Only]
    Adjacency: Performers only for individuals

CLUSTER M: Errands [SINGLE-IDENTITY]
└── shopping-assistance (6 services)
    Adjacency: None
```

---

## APPENDIX C: PROHIBITED COMBINATIONS MATRIX

X = Prohibited for individuals

|   | A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | - | X | X | X | X | X | X | X | X | X | X | X | X |
| B | X | - | X | X | X | X | X | X | X | X | X | X | X |
| C | X | X | - | X | X | X | X | X | X | X | X | X | X |
| D | X | X | X | - | X | X | X | X | X | X | X | X | X |
| E | X | X | X | X | - | X | X | X | X | X | X | X | X |
| F | X | X | X | X | X | - | X | X | X | X | X | X | X |
| G | X | X | X | X | X | X | - | X | X | X | X | X | X |
| H | X | X | X | X | X | X | X | - | X | X | X | X | X |
| I | X | X | X | X | X | X | X | X | - | X | X | X | X |
| J | X | X | X | X | X | X | X | X | X | - | X | X | X |
| K | X | X | X | X | X | X | X | X | X | X | - | X | X |
| L | X | X | X | X | X | X | X | X | X | X | X | - | X |
| M | X | X | X | X | X | X | X | X | X | X | X | X | - |

**Reading:** Every off-diagonal cell is X (prohibited). No cross-cluster pairing for individuals.

---

## DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-11 | System | Initial constitution |
| 1.1.0 | 2026-01-11 | System | Added implementation decisions (D1-D5), execution phases (5 phases), hardening rules, seed scripts |

**Approval:** This document is LOCKED. Changes require governance review.

**Decision Point Status:**
- D1 (Provider Type Default): ✅ LOCKED — Default individual, upgrade to company
- D2 (Cluster Code Format): ✅ LOCKED — Human-readable slugs
- D3 (Adjacency Storage): ✅ LOCKED — Unidirectional
- D4 (Hub-Spoke Enforcement): ✅ LOCKED — Application logic
- D5 (Personal vs Business): ✅ LOCKED — Keep choice, redefine meaning

**Phase Status:**
- Phase 1 (Schema): ⬜ Not started
- Phase 2 (Data): ⬜ Not started
- Phase 3 (API Log-Only): ⬜ Not started
- Phase 4 (UI): ⬜ Not started
- Phase 5 (Enforcement + Constraints): ⬜ Not started

---

*End of Constitution*
