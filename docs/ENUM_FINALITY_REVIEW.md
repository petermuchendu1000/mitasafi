# ENUM FINALITY REVIEW - PRODUCTION FREEZE CHECKLIST
**Date:** 2026-01-09  
**Status:** PRE-SEEDING AUDIT  
**Critical:** All enums must be finalized BEFORE reference data seeding

---

## ⚠️ ENUMS DEPLOYED IN PRODUCTION SCHEMA

### 1. `booking_flow_type` ✅ FROZEN
```sql
'emergency'    -- Immediate response, damage risk, unknown pricing
'standard'     -- Scheduled work with known scope (includes recurring)
'delivery'     -- Pickup/dropoff with quantity tracking
'project'      -- Large scope, quote-based, site visit likely
'personal'     -- Human-to-human, trust-critical, preference-sensitive
```
**Irreversible Commitment:** ✅ YES  
**Completeness:** ✅ COMPLETE  
**Fuzzy Values:** ❌ NONE  
**Locked In:** 5 flows validated through Journey 1 & 2  
**Can Add Later:** NO - These are architectural  
**Production Risk:** LOW

---

### 2. `verification_level` ⚠️ NEEDS REVIEW
```sql
'basic'              -- ID verification only
'standard'           -- ID + experience verification
'certified'          -- Professional certification required
'background_checked' -- Criminal background check required
```
**Irreversible Commitment:** ⚠️ PARTIAL  
**Completeness:** ⚠️ QUESTIONABLE  
**Fuzzy Values:**
- ❓ **Missing: `police_clearance`** - Is this same as background_checked or separate?
- ❓ **Missing: `trade_license`** - Business verification level?
- ❓ **Ambiguity:** Does `certified` mean:
  - Professional body membership (e.g., plumbing association)?
  - Or government trade license?
  - Or both?

**Questions to Answer:**
1. Is `background_checked` sufficient for childcare/security services or do they need separate criminal record level?
2. Should `certified` be split into `professional_certified` (trade body) vs `licensed` (government)?
3. What about business registration verification?

**Production Risk:** MEDIUM - Ambiguity in trust requirements  
**Action Required:** ⚠️ CLARIFY BEFORE SEEDING

---

### 3. `verification_status` ⚠️ LIFECYCLE GAP
```sql
'draft'        -- Provider added service but hasn't submitted docs (ADDED POST-DEPLOYMENT)
'not_started'  -- Provider has not submitted documents
'pending'      -- Documents submitted, awaiting review
'verified'     -- Approved and active
'rejected'     -- Failed verification
'expired'      -- Was verified but certification/license expired
```
**Irreversible Commitment:** ⚠️ INCOMPLETE  
**Completeness:** ⚠️ MISSING STATES  
**Fuzzy Values:**
- ❌ **Missing: `resubmitted`** - After rejection, provider uploads new docs
- ❌ **Missing: `under_review`** - Admin opened documents, actively reviewing (vs sitting in queue)
- ❓ **Ambiguity:** What if provider is `verified` but then admin finds issue later? Is that `rejected` or new state like `revoked`?
- ❓ **Ambiguity:** Can provider go from `expired` → `pending` (renewal) or must be `not_started` again?

**Lifecycle Holes:**
```
draft → not_started → pending → verified ✅
                         ↓
                      rejected → ??? (can resubmit or permanently blocked?)
verified → expired → ??? (can renew or must re-verify from scratch?)
```

**Production Risk:** MEDIUM - Operational confusion in provider dashboard  
**Action Required:** ⚠️ ADD MISSING LIFECYCLE STATES

---

### 4. `pricing_type` ⚠️ SEMANTIC OVERLAP
```sql
'fixed'          -- Set price per service
'starting_from'  -- Base price, varies by scope
'per_unit'       -- Price per kg/sqm/hour/item
'quote_only'     -- Must inspect before pricing
'hourly'         -- Time-based pricing
'daily'          -- Day-rate pricing
```
**Irreversible Commitment:** ⚠️ OVERLAPPING  
**Completeness:** ⚠️ REDUNDANT  
**Fuzzy Values:**
- ❌ **Redundancy:** `hourly` and `daily` are just special cases of `per_unit` (unit = "hour" or "day")
- ❓ **Ambiguity:** What's difference between `fixed` and `starting_from` in practice?
  - Fixed = "KES 5,000 flat"
  - Starting from = "From KES 5,000" (but how much exactly?)
  - If final price can vary, why isn't it `quote_only`?

**Semantic Confusion:**
```
Example: House painting
- Is it 'starting_from' (KES 15,000 base, varies by size)?
- Or 'per_unit' (KES 450 per sqm)?
- Or 'quote_only' (must see house first)?

All three could apply! Which wins?
```

**Production Risk:** HIGH - Legal ambiguity, pricing disputes  
**Action Required:** ⚠️ COLLAPSE TO 4 TYPES:
1. `fixed` - Exact price
2. `per_unit` - Rate × quantity (covers hourly/daily)
3. `quote_only` - Unknown until inspection
4. `negotiable` - Customer and provider discuss (optional)

---

### 5. `pricing_component_type` ✅ ACCEPTABLE
```sql
'base'          -- Base/minimum fee
'unit'          -- Per unit (kg, sqm, etc)
'time'          -- Per hour/day
'distance'      -- Per km
'pass_through'  -- Materials/items customer pays for
```
**Irreversible Commitment:** ✅ YES  
**Completeness:** ✅ SUFFICIENT  
**Fuzzy Values:** ❌ NONE  
**Production Risk:** LOW  
**Note:** Only used in `pricing_snapshot` JSON, not user-facing decisions

---

### 6. `booking_status` ⚠️ MISSING CRITICAL STATES
```sql
'draft'              -- Customer creating booking
'submitted'          -- Sent to provider
'provider_viewed'    -- Provider opened it
'quote_pending'      -- Provider needs to quote
'quote_sent'         -- Provider sent quote
'quote_accepted'     -- Customer accepted quote
'quote_rejected'     -- Customer rejected quote
'confirmed'          -- Both parties agreed
'in_progress'        -- Work started
'completed'          -- Work finished
'customer_confirmed' -- Customer confirmed completion
'cancelled_customer' -- Customer cancelled
'cancelled_provider' -- Provider cancelled
'disputed'           -- Issue raised
'resolved'           -- Dispute resolved
```
**Irreversible Commitment:** ❌ INCOMPLETE  
**Completeness:** ❌ MISSING OPERATIONAL STATES  
**Fuzzy Values:**
- ❌ **Missing: `provider_no_show`** - Provider didn't arrive at scheduled time
- ❌ **Missing: `customer_no_show`** - Customer not available (delivery, personal services)
- ❌ **Missing: `payment_pending`** - Work done, waiting for payment
- ❌ **Missing: `payment_failed`** - Payment attempt failed
- ❌ **Missing: `refunded`** - Dispute resolved with refund
- ❌ **Missing: `needs_reassignment`** - Provider can't do it, need new provider
- ❓ **Ambiguity:** What if booking is `completed` but payment fails? Is it `disputed`?
- ❓ **Ambiguity:** Can booking go from `disputed` → `in_progress` (provider fixes issue) or must go `disputed` → `resolved` only?

**Critical Gap:**
```
Emergency plumbing at 2 AM:
1. Provider confirms
2. Drives to location
3. Customer doesn't answer door/phone
   
What status? Currently no way to mark 'customer_no_show'.
Provider loses time + fuel. How to document this for payment?
```

**Production Risk:** HIGH - Operational blind spots, payment disputes  
**Action Required:** ⚠️ ADD NO-SHOW AND PAYMENT STATES

---

### 7. `damage_risk_level` ✅ FROZEN
```sql
'low'     -- Minor inconvenience
'medium'  -- Could cause damage soon
'high'    -- Active damage occurring
'critical'-- Severe damage, safety risk
```
**Irreversible Commitment:** ✅ YES  
**Completeness:** ✅ COMPLETE  
**Fuzzy Values:** ❌ NONE  
**Production Risk:** LOW  
**Note:** Only used for emergency flow prioritization

---

### 8. `property_type` ⚠️ INCOMPLETE
```sql
'apartment'
'house'
'townhouse'
'villa'
'office'
'commercial'
'warehouse'
'land'
'other'
```
**Irreversible Commitment:** ⚠️ PARTIAL  
**Completeness:** ⚠️ MISSING COMMON TYPES  
**Fuzzy Values:**
- ❓ **Missing: `condo`** - Is this `apartment` or separate?
- ❓ **Missing: `retail`** - Is this `commercial` or separate?
- ❓ **Missing: `restaurant`** - Is this `commercial` or separate?
- ❓ **Ambiguity:** What's difference between `commercial` and `office`?

**Production Risk:** LOW - Only affects service context, not payments  
**Action Required:** ⚠️ CLARIFY COMMERCIAL SUBTYPES

---

### 9. `dispute_severity` ⚠️ TOO SIMPLE
```sql
'low'     -- Quality complaint without evidence
'medium'  -- Quality complaint with evidence or minor refund
'high'    -- Safety concern or major refund request
```
**Irreversible Commitment:** ⚠️ INSUFFICIENT  
**Completeness:** ❌ MISSING SEVERITY LEVELS  
**Fuzzy Values:**
- ❌ **Missing: `urgent`** - Active safety risk (e.g., gas leak left unfixed)
- ❓ **Ambiguity:** How does ops prioritize queue if 100 disputes are all `high`?
- ❓ **Ambiguity:** Does `low` mean "ignore for 7 days" or "review but low priority"?

**Production Risk:** MEDIUM - Ops team can't triage effectively  
**Action Required:** ⚠️ ADD SLA-BASED LEVELS

---

### 10. `review_rating` ✅ FROZEN
```sql
'1', '2', '3', '4', '5'
```
**Irreversible Commitment:** ✅ YES  
**Completeness:** ✅ COMPLETE  
**Fuzzy Values:** ❌ NONE  
**Production Risk:** NONE  
**Note:** Standard 5-star rating, cannot change

---

### 11. `location_type` ⚠️ SAFETY GAP
```sql
'home'
'office'
'public_place'
'in_vehicle'
'other'
```
**Irreversible Commitment:** ⚠️ INCOMPLETE  
**Completeness:** ⚠️ MISSING SAFETY CONTEXTS  
**Fuzzy Values:**
- ❓ **Missing: `hotel`** - Personal services in hotel rooms (different safety profile than home)
- ❓ **Missing: `construction_site`** - Different safety requirements
- ❓ **Ambiguity:** Is Uber ride `in_vehicle` or separate category?

**Production Risk:** MEDIUM - Safety policy gaps for personal services  
**Action Required:** ⚠️ ADD HIGH-RISK LOCATION TYPES

---

## 📊 SUMMARY SCORECARD

| Enum | Status | Risk | Action Required |
|------|--------|------|----------------|
| `booking_flow_type` | ✅ FROZEN | LOW | None |
| `verification_level` | ⚠️ FUZZY | MEDIUM | Clarify certified vs licensed |
| `verification_status` | ⚠️ INCOMPLETE | MEDIUM | Add resubmitted, under_review, revoked |
| `pricing_type` | ⚠️ OVERLAP | HIGH | Collapse hourly/daily into per_unit |
| `pricing_component_type` | ✅ OK | LOW | None |
| `booking_status` | ⚠️ INCOMPLETE | HIGH | Add no_show, payment states |
| `damage_risk_level` | ✅ FROZEN | LOW | None |
| `property_type` | ⚠️ INCOMPLETE | LOW | Optional refinement |
| `dispute_severity` | ⚠️ SIMPLE | MEDIUM | Add urgent, define SLAs |
| `review_rating` | ✅ FROZEN | NONE | None |
| `location_type` | ⚠️ INCOMPLETE | MEDIUM | Add hotel, construction_site |

---

## 🚨 CRITICAL BLOCKERS (MUST FIX BEFORE SEEDING)

### **1. pricing_type semantic collapse** 🔴 BLOCKER
**Problem:** `hourly` and `daily` are redundant with `per_unit`  
**Fix Required:** Remove `hourly` and `daily`, use `per_unit` with `unit_label='hour'` or `unit_label='day'`  
**Impact:** Services seeded with `hourly` will need data migration later

### **2. booking_status no-show states** 🔴 BLOCKER
**Problem:** No way to mark provider or customer no-show  
**Fix Required:** Add `provider_no_show`, `customer_no_show`, `payment_pending`, `payment_failed`  
**Impact:** Operations cannot handle real-world failure modes

### **3. verification_status lifecycle gaps** 🟡 HIGH PRIORITY
**Problem:** Cannot handle rejection → resubmission flow  
**Fix Required:** Add `resubmitted`, `under_review`, `revoked`  
**Impact:** Provider onboarding UX will break on rejection

---

## ✅ RECOMMENDATION

**DO NOT SEED UNTIL:**
1. ✅ pricing_type collapsed to 4 values
2. ✅ booking_status extended with operational states
3. ✅ verification_status lifecycle completed

**CAN SEED WITH:**
- verification_level as-is (document ambiguity, fix in v2)
- property_type as-is (low impact)
- dispute_severity as-is (ops can triage manually for now)
- location_type as-is (safety policy can evolve)

---

## 📝 NEXT ACTIONS

**Immediate (before seeding):**
1. Create migration to fix `pricing_type` enum
2. Create migration to extend `booking_status` enum
3. Create migration to extend `verification_status` enum
4. Re-validate seed data against new enums

**Can Defer:**
- verification_level refinement (document for v2)
- property_type expansion (nice to have)
- dispute_severity SLA mapping (ops process)
- location_type safety contexts (policy work)

---

## 🔒 IRREVERSIBILITY STATEMENT

Once reference data is seeded:
- ✅ **Can add** new enum values (append-only safe)
- ❌ **Cannot remove** enum values (breaks existing data)
- ❌ **Cannot rename** enum values (data migration + app logic)
- ❌ **Cannot change meaning** (legal ambiguity)

**This review MUST be complete before first service is created.**
