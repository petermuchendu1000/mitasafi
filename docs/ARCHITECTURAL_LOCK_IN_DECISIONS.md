# ARCHITECTURAL LOCK-IN DECISIONS
**Version:** 1.0 - Production Freeze  
**Date:** January 9, 2026  
**Status:** BINDING - Reversals require major version bump

---

## PURPOSE OF THIS DOCUMENT

This document explicitly acknowledges **irreversible architectural choices** made in the Mitasafi service marketplace platform. These decisions define what the system IS and IS NOT, creating constraints that protect the platform's integrity.

**Changing these decisions later requires:**
- Major schema migrations
- Customer expectation resets
- Provider re-training
- Potential legal implications

---

## DECISION 1: NO REAL-TIME SYSTEMS (TAXI/TRANSPORT)

### What We Explicitly Are NOT Building

❌ **Real-time GPS tracking** of driver location  
❌ **Live ETA updates** during ride  
❌ **Dynamic surge pricing** based on demand  
❌ **Instant driver matching** ("nearest available")  
❌ **In-app navigation** for drivers  
❌ **Route optimization** algorithms  
❌ **Live traffic integration**  
❌ **Split fare / group bookings**

### What We ARE Building

✅ **Pre-scheduled ride booking** (book for tomorrow, next week)  
✅ **Driver verification & rating system**  
✅ **Fixed pricing** (no surprises)  
✅ **Basic route description** (A → B)  
✅ **Emergency contact collection** (safety)  
✅ **Post-ride confirmation & review**  
✅ **Driver hire** (hourly/daily rates)

### System Classification

We are a **scheduled transport marketplace**, not ride-hailing.

**Analogy:**
- Uber = instant ride hailing with real-time tracking
- Mitasafi Taxi = car rental / driver hire platform

### Customer Expectation Management

**Marketing must communicate:**
- "Book your ride in advance"
- "Hire a driver for the day"
- "Pre-arranged airport transfers"

**NOT:**
- "Get a ride now"
- "Track your driver live"
- "Fastest pickup time"

### Consequences Accepted

✅ **Slower growth** than instant ride-hailing  
✅ **Different customer segment** (planners, not urgent travelers)  
✅ **Lower operational complexity** (no dispatch algorithms)  
✅ **Lower liability** (no promise of immediate pickup)

### Reversal Cost

If we ever decide to add real-time features:
- New backend infrastructure (WebSockets, live location)
- New driver app with GPS
- Real-time matching engine
- ~6-12 month rebuild
- Estimated cost: $200K-500K

**Decision Status:** 🔒 **LOCKED**

---

## DECISION 2: DATABASE ENFORCES BUSINESS RULES

### What This Means

We use PostgreSQL **constraints, triggers, and enums** to enforce business logic, not just application code.

**Examples:**
```sql
-- Constraint: Emergency bookings only for services that support it
CONSTRAINT emergency_service_supports_it CHECK (
  EXISTS (SELECT 1 FROM service_capabilities WHERE supports_emergency = true)
)

-- Constraint: Cannot change service_type_id after bookings exist
CREATE TRIGGER prevent_service_type_change_trigger...

-- Enum: Only 5 valid booking flows
CREATE TYPE booking_flow_type AS ENUM ('emergency', 'standard', 'delivery', 'project', 'personal');
```

### Why This Matters

**Benefits:**
- ✅ Data integrity guaranteed (can't have invalid state)
- ✅ Multi-language safety (Python, TypeScript, etc. all follow same rules)
- ✅ Audit-friendly (database enforces compliance)
- ✅ Prevents "works on my machine" bugs

**Costs:**
- ⚠️ Migrations require SQL expertise
- ⚠️ Hotfixes slower (must migrate database, not just deploy code)
- ⚠️ Schema changes require careful rollout
- ⚠️ Cannot "override" rules easily (intentional safety)

### Operational Implications

**Deployment process:**
1. Test migration in staging
2. Run migration on production database
3. Deploy code that uses new schema
4. Monitor for constraint violations

**NOT:**
1. Deploy code with new logic
2. Hope database adapts

### What We CANNOT Do

❌ **Temporarily disable validation** for a "special case"  
❌ **Quick hack around a constraint**  
❌ **"We'll fix the data later"**

Database integrity is **non-negotiable**.

### Consequences Accepted

✅ **Slower feature velocity** (by design)  
✅ **Higher migration discipline** required  
✅ **Cannot rush deployments**  
✅ **Data quality guaranteed**

This is the **correct trade-off for marketplaces** where trust and safety are critical.

**Decision Status:** 🔒 **LOCKED**

---

## DECISION 3: NO "QUICK ADD SERVICE" SHORTCUTS

### What This Means

Adding a new service to the platform requires:

1. **Service definition** (`services` table)
2. **Service capabilities** (`service_capabilities` table)
3. **Verification requirements** (`service_verification_requirements` table)
4. **Pricing description** (`service_pricing` table)
5. **Service type mapping** (links to booking flow)

### Why This Matters

**Old MVP approach:**
```sql
-- Just add a service
INSERT INTO services (name) VALUES ('Dog Walking');
-- Done! Ship it!
```

**Our approach:**
```sql
-- 1. Define service
INSERT INTO services (name, category_id, service_type_id, ...) VALUES (...);

-- 2. Define capabilities
INSERT INTO service_capabilities (service_id, supports_emergency, is_recurring_capable, ...) VALUES (...);

-- 3. Define verification requirements
INSERT INTO service_verification_requirements (service_id, min_verification_level, background_check_required, ...) VALUES (...);

-- 4. Define pricing model
INSERT INTO service_pricing (service_id, pricing_display_type, base_amount, ...) VALUES (...);

-- Must be complete before service is live
```

### What This Prevents

❌ **Services with undefined verification** → safety risk  
❌ **Services with no pricing model** → customer confusion  
❌ **Services with missing capabilities** → broken UI  
❌ **"Launch fast, fix later"** → technical debt

### Consequences Accepted

✅ **Slower service expansion** (intentional)  
✅ **No "growth hacks"** (quality over quantity)  
✅ **Higher barrier to service additions** (protects brand)  
✅ **Supply grows slower but higher quality**

### Operational Reality

**Before launching a new service, team must:**
1. Define verification requirements with legal/compliance
2. Define pricing model with finance
3. Define UI behavior with product
4. Write migration with engineering
5. Test provider onboarding flow
6. Document provider requirements

**This takes days, not minutes.**

That's intentional.

### Reversal Cost

To add "quick service creation":
- Remove verification requirements (unsafe)
- Remove pricing validation (confusing)
- Remove capability checks (broken UI)
- Accept lower quality supply

**Cost:** Brand reputation, customer trust, safety incidents.

**Decision Status:** 🔒 **LOCKED**

---

## DECISION 4: PRICING IS DESCRIPTIVE, NOT COMPUTATIONAL

### What This Means

The database **describes** pricing, it does NOT calculate final prices.

**Database stores:**
```sql
service_pricing (
  pricing_display_type,  -- "fixed", "per_unit", "quote_only"
  base_amount,
  unit,
  description  -- "KES 300 base + KES 150/kg"
)
```

**Backend code calculates:**
```typescript
function calculateBookingPrice(booking) {
  // Read pricing model from database
  // Apply quantity, time, distance, etc.
  // Store result in booking.agreed_price
  // Store calculation in booking.pricing_snapshot (JSON)
  return { price, snapshot };
}
```

### Why This Matters

**Pricing is ALWAYS context-dependent:**
- Laundry = base + (quantity × unit_price)
- Moving = quote + (distance × travel_fee)
- Cleaning = base × (property_size_sqm / 100)
- Emergency = standard_price × 1.5

**If database computes price:**
- ❌ Cannot handle complex rules
- ❌ Cannot negotiate
- ❌ Cannot adjust for edge cases
- ❌ Cannot audit calculations

**If code computes price:**
- ✅ Flexible logic
- ✅ Can test calculations
- ✅ Can version pricing logic
- ✅ pricing_snapshot provides legal record

### What Is Sacred

**The pricing_snapshot field is IMMUTABLE after booking confirmation.**

```sql
bookings.pricing_snapshot jsonb NOT NULL
```

This is your **legal defense** in disputes.

**Example snapshot:**
```json
{
  "service_pricing": {
    "base_amount": 300,
    "unit_amount": 150,
    "unit": "kg",
    "quantity": 5
  },
  "components": [
    {"type": "base", "amount": 300, "description": "Base delivery fee"},
    {"type": "unit", "amount": 750, "description": "5 kg @ 150 KES/kg"}
  ],
  "subtotal": 1050,
  "service_fee": 105,
  "total": 1155,
  "currency": "KES",
  "calculated_at": "2026-01-09T10:30:00Z",
  "pricing_version": "v1.2.3"  // Version of pricing logic used
}
```

### Consequences Accepted

✅ **Pricing logic lives in code** (must be version controlled)  
✅ **Pricing changes require code deploy** (not just database update)  
✅ **Must maintain pricing_snapshot forever** (legal requirement)  
✅ **Cannot "fix" historical prices** (snapshot is immutable)

### Operational Rules

1. **Never delete pricing_snapshot** (even after refunds)
2. **Never modify pricing_snapshot** (append to booking_status_history instead)
3. **Always version pricing logic** (for auditing)
4. **Store pricing_version in snapshot** (know which code calculated it)

**Decision Status:** 🔒 **LOCKED**

---

## DECISION 5: ONE SERVICE = ONE SERVICE TYPE (IMMUTABLE)

### What This Means

A service can have **only one service_type_id**, which determines its **booking flow**.

This mapping **cannot change** after bookings exist.

### The Hard Rule

```sql
-- WRONG: One service, multiple flows
services:
  - id: 'plumbing-service'
    name: 'Plumbing'
    service_type_id: varies  ❌

-- CORRECT: Separate services per flow
services:
  - id: 'emergency-plumbing'
    name: 'Emergency Plumbing'
    service_type_id: 'emergency_repair'  ✅
  
  - id: 'standard-plumbing'
    name: 'Plumbing Repair'
    service_type_id: 'standard_repair'  ✅
  
  - id: 'plumbing-installation'
    name: 'Plumbing Installation (Quote Required)'
    service_type_id: 'project_work'  ✅
```

### Why This Is Critical

**If service_type_id could change or be polymorphic:**

❌ **Booking forms would break** (standard form for emergency booking)  
❌ **Validation would fail** (emergency rules applied to standard booking)  
❌ **Detail tables would be wrong** (emergency_details for non-emergency)  
❌ **Provider expectations unclear** (what are they signing up for?)  
❌ **Pricing models conflicting** (fixed price vs quote required)

### Enforcement

**Database trigger prevents changes:**
```sql
CREATE TRIGGER prevent_service_type_change_trigger
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION prevent_service_type_change();
```

**Error message:**
```
Cannot change service_type_id for service 'plumbing-service' - bookings already exist
```

### Consequences Accepted

✅ **More services in database** (emergency vs standard vs project)  
✅ **Clearer provider onboarding** (exact service defined)  
✅ **Simpler booking logic** (no conditionals per service)  
✅ **Better customer understanding** (knows what they're booking)

### Operational Reality

**When expanding a service category:**

Don't add flows to existing services.
Add NEW services for NEW flows.

**Example:**
- Already have "Standard Cleaning"?
- Want to add emergency cleaning?
- Create "Emergency Cleaning" (new service)

**Decision Status:** 🔒 **LOCKED**

---

## DECISION 6: 5 BOOKING FLOWS, NO MORE

### What This Means

The platform supports **exactly 5 booking flow types:**

1. **Emergency** - Immediate response, damage risk
2. **Standard** - Scheduled work with known scope
3. **Delivery** - Pickup/dropoff with quantity tracking
4. **Project** - Large scope, quote-based
5. **Personal** - Human-to-human, trust-critical

### Why 5, Not 6 or 10

Each flow requires:
- Detail table
- UI form
- Validation logic
- Provider training
- Customer education

**Flow inflation kills maintainability.**

### Recurring Services = Standard + Metadata

We explicitly **collapsed** `scheduled_service` into `standard` flow.

Recurring bookings use:
- `booking_standard_details` (same as one-time)
- `booking_recurring_rules` (metadata for generation)
- `bookings.parent_booking_id` (links recurring instances)

This keeps flows at 5 while supporting complexity.

### What We Will NOT Add

❌ **"Subscription" flow** (use standard + recurring)  
❌ **"Consultation" flow** (use personal flow)  
❌ **"Rental" flow** (use standard flow with duration)  
❌ **"Event" flow** (use project flow)

### Adding a 6th Flow Requires

1. **New detail table** (e.g., booking_subscription_details)
2. **New UI form** (completely different from 5 existing)
3. **New validation logic** (in backend)
4. **New provider onboarding** (explain 6th model)
5. **Executive approval** (architectural change)

**Estimated cost:** 3-4 weeks engineering + product redesign

### Consequences Accepted

✅ **Limited flow types** (forces consistency)  
✅ **Services must map to one of 5** (cannot be unique snowflake)  
✅ **Simpler system** (fewer conditionals)  
✅ **Faster onboarding** (providers learn 5 models, not 20)

**Decision Status:** 🔒 **LOCKED**

---

## DECISION 7: SERVICE-SCOPED TRUST (NON-NEGOTIABLE)

### What This Means

Provider verification is **per-service**, not global.

```sql
provider_services (
  provider_id,
  service_id,
  verification_status,  -- Specific to THIS service
  verified_at,
  verification_expires_at
)
```

### The Trust Rule

**A provider verified for plumbing is NOT verified for electrical.**

Even if both are in "Repairs" category.

### Why This Is Non-Negotiable

**Safety scenario:**
- Provider is excellent plumber (verified)
- Provider adds "Electrical Services"
- NOT automatically verified for electrical
- Must submit electrician license
- Must pass certification check

**Without service-scoped trust:**
- ❌ Provider does electrical work without certification
- ❌ Customer gets shocked
- ❌ Platform liable
- ❌ Brand destroyed

### Operational Implications

**Provider onboarding flow:**
1. Provider adds Service A → verification required
2. Provider passes verification → can work on Service A
3. Provider adds Service B → NEW verification required
4. Cannot work on Service B until verified

**This creates friction.**
**This friction is intentional.**
**This friction protects customers.**

### Consequences Accepted

✅ **Slower provider expansion** (must verify each service)  
✅ **Higher operational cost** (more verification reviews)  
✅ **Provider frustration** ("I'm already verified!")  
✅ **Customer safety** (only qualified providers work)

### The Alternative (Rejected)

**Global verification:**
- Provider verified once
- Can add any service
- No additional checks

**Result:**
- Unqualified providers doing dangerous work
- Safety incidents
- Legal liability
- Platform shutdown

**We reject this.**

**Decision Status:** 🔒 **LOCKED** and **NON-NEGOTIABLE**

---

## SUMMARY: WHAT IS FROZEN

| Decision | Reversal Cost | Consequence |
|----------|---------------|-------------|
| No real-time taxi tracking | $200K-500K rebuild | Slower growth, different market segment |
| Database enforces business rules | Migration complexity | Slower deployments, higher data quality |
| No quick-add services | Process overhead | Slower expansion, higher quality supply |
| Pricing descriptive not computational | Pricing logic redesign | Flexibility in pricing, legal safety |
| One service = one service type | Many duplicate services | Clearer definitions, simpler logic |
| 5 booking flows only | 3-4 week engineering | Maintainability, consistency |
| Service-scoped trust | Higher verification cost | Customer safety, legal protection |

---

## ACCEPTANCE SIGNATURES

**Engineering Lead:** __________________ Date: __________

**Product Lead:** __________________ Date: __________

**CEO/Founder:** __________________ Date: __________

---

## CHANGE PROTOCOL

To reverse any of these decisions:

1. **Document business justification** (why reversal needed)
2. **Estimate engineering cost** (time, money, risk)
3. **Assess customer impact** (broken expectations, confusion)
4. **Get executive approval** (CEO + leads)
5. **Communicate to stakeholders** (team, investors, users)
6. **Increment major version** (v2.0.0 → v3.0.0)

**These are not suggestions.**
**These are architectural constraints.**
**They define what Mitasafi IS.**

---

**Document Status:** 🔒 **FROZEN**  
**Last Updated:** January 9, 2026  
**Next Review:** Q3 2026 or upon Series A funding
