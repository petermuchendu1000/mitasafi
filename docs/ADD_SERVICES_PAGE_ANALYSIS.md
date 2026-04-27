# Add Services Page - Complete Analysis
**Date:** January 10, 2026  
**Page:** `/dashboard/provider/services/new`  
**Purpose:** Provider onboarding - Adding services to their profile

---

## Executive Summary

This is a **6-step wizard** that guides service providers through adding services to their profile. Based on the complete service provider schema analysis, this document outlines what SHOULD be on each step with pinpoint accuracy.

---

## Architecture Overview

### Component Structure
```
page.tsx (Server Component)
  └─ ServiceWizardContent.tsx (Client Component)
      ├─ Step1Category.tsx
      ├─ Step2Services.tsx
      ├─ Step3Pricing.tsx
      ├─ Step4ServiceAreas.tsx
      ├─ Step5DescriptionImages.tsx
      └─ Step6Review.tsx
```

### Data Flow
1. User makes selections → Updates WizardContext state
2. Final step → Calls `addProviderServices()` server action
3. Server action → Inserts into `provider_services` table
4. Revalidates path → Redirects to services dashboard

---

## Step-by-Step Analysis

## STEP 1: Category Selection ✅

### Current Implementation
- **UI**: Grid of category cards with checkboxes
- **Interaction**: Multi-select (user can select multiple categories)
- **Search**: Real-time filtering of categories
- **Data Source**: `service_categories` table via `getAllCategories()`

### What SHOULD Be Here (Based on Schema)

#### Database Query
```sql
SELECT id, name, slug, description, icon, is_active, display_order
FROM service_categories
WHERE is_active = true
ORDER BY display_order ASC, name ASC
```

#### Data Collected
```typescript
{
  categoryIds: string[] // Array of selected category IDs
}
```

#### UX Enhancements Needed
1. **Category Icons**: Display `category_icon` from database
2. **Popular Categories First**: Use `display_order` field
3. **Kenyan Labels**: Apply Kenyan-friendly translations
4. **Service Count**: Show number of services in each category

#### Schema Alignment
- ✅ Uses correct table: `service_categories`
- ✅ Filters by `is_active = true`
- ⚠️ Missing: `display_order` sorting
- ⚠️ Missing: Category icons display

---

## STEP 2: Services Selection

### Current Implementation
- **UI**: Service cards shown per selected category
- **Interaction**: Multi-select services within each category
- **Data Source**: `services_with_categories` materialized view
- **Performance**: Uses pre-joined view (15x faster than nested queries)

### What SHOULD Be Here (Based on Schema)

#### Database Query (Optimized)
```sql
SELECT 
  s.id,
  s.name,
  s.slug,
  s.description,
  s.base_price,
  s.price_unit,
  s.estimated_duration,
  s.is_popular,
  s.subcategory_id,
  sc.name as category_name,
  sc.slug as category_slug,
  ss.name as subcategory_name
FROM services s
JOIN service_subcategories ss ON s.subcategory_id = ss.id
JOIN service_categories sc ON ss.category_id = sc.id
WHERE ss.category_id IN (?, ?, ...)  -- Selected category IDs
  AND s.is_active = true
ORDER BY s.is_popular DESC, s.name ASC
```

**OR** use materialized view:
```sql
SELECT * FROM services_with_categories
WHERE category_id IN (?, ?, ...)
ORDER BY is_popular DESC, name ASC
```

#### Data Collected
```typescript
{
  selectedServices: Array<{
    serviceId: string
    serviceName: string
    subcategoryId: string
    subcategoryName: string
    categoryId: string
    categoryName: string
    customPrice: number | null        // Set in Step 3
    priceType: PriceType              // Set in Step 3
    description: string               // Set in Step 5
    experienceYears: number | null    // Could add here or Step 5
  }>
}
```

#### UX Features Needed
1. **Popular Services Badge**: Show services where `is_popular = true`
2. **Base Price Display**: Show `base_price` as reference (if set)
3. **Estimated Duration**: Display `estimated_duration` 
4. **Service Description**: Show service description on hover/expand
5. **Category Grouping**: Show services grouped by category
6. **Bulk Actions**: "Select all in this category" button

#### Schema Fields Available (Not Currently Used)
- `base_price`: Reference pricing from platform
- `price_unit`: 'per_hour', 'per_item', 'per_sqm', 'fixed'
- `estimated_duration`: Average time for service
- `keywords`: For search optimization
- `is_popular`: Highlight popular services

---

## STEP 3: Pricing

### Current Implementation
- **UI**: Price input per selected service
- **Price Types**: 
  - Fixed price
  - Starting from
  - Request a quote
- **Bulk Pricing**: Option to apply same pricing to all services

### What SHOULD Be Here (Based on Schema)

#### Data Structure for `provider_services.custom_pricing`
```typescript
interface CustomPricing {
  amount: number | null
  type: 'fixed' | 'starting_from' | 'quote'
  currency: 'KES'
  unit?: string  // 'per_hour', 'per_item', 'per_sqm', etc.
  notes?: string // Additional pricing notes
}
```

Stored as JSONB in `provider_services.custom_pricing` column.

#### Smart Defaults by Category
Current implementation has good defaults:
- Plumbing, Electrical, HVAC → "quote" (complex work)
- Cleaning, Laundry → "fixed" (standard work)
- Carpentry, Painting → "starting_from" (variable scope)

#### Additional Fields That COULD Be Added
1. **Experience Years**: Input for `provider_services.experience_years`
   - "How many years have you done [service]?"
   - Default: 0

2. **Price Unit**: If not "quote", select unit
   - Per hour
   - Per item
   - Per square meter
   - Fixed price

3. **Reference Pricing**: Show platform's `services.base_price` as guideline

#### Schema Alignment
- ✅ Stores in `custom_pricing` JSONB field
- ✅ Supports all pricing types
- ⚠️ Missing: Experience years input
- ⚠️ Missing: Price unit selection
- ⚠️ Missing: Reference to platform base_price

---

## STEP 4: Service Areas

### Current Implementation
- **UI**: Grid of area checkboxes
- **Areas**: Sub-counties and neighborhoods in Nairobi
- **Bulk Apply**: Same areas for all services OR per-service customization
- **Travel Option**: "Can travel outside selected areas" checkbox

### What SHOULD Be Here (Based on Schema)

#### Database Query
```sql
-- Get Nairobi areas
SELECT id, name, type, parent_id
FROM areas
WHERE city = 'Nairobi'
  AND is_active = true
ORDER BY type DESC, name ASC  -- sub_county first, then area
```

#### Data to Store in `provider_service_areas` Table
```sql
INSERT INTO provider_service_areas (
  provider_id,
  service_id,      -- NULL if bulk apply
  area_name,
  area_type,       -- 'sub_county' or 'area'
  is_primary_area,
  travel_fee,
  currency
) VALUES (?, ?, ?, ?, ?, ?, ?);
```

#### What's Currently Missing
1. **Travel Fees**: Allow provider to set travel fee per area
   - "Add KES 500 for this area"
   - Stored in `provider_service_areas.travel_fee`

2. **Primary Area**: Mark main operating area
   - "Which is your main location?" (no travel fee)
   - Stored in `provider_service_areas.is_primary_area`

3. **Per-Service Areas**: UI for different areas per service
   - Example: Do plumbing in CBD, but cleaning only in Westlands

4. **Service Radius**: Input for `service_providers.service_radius_km`
   - "How far are you willing to travel?"
   - Stored in provider profile

#### Complete Service Area Flow
```typescript
// Step 4 should collect:
{
  serviceAreas: {
    mode: 'bulk' | 'per_service',
    bulk?: {
      areaIds: string[],
      primaryAreaId: string,      // NEW
      travelFees: Record<string, number>, // NEW
      serviceRadiusKm: number,    // NEW
    },
    perService?: Record<string, {
      areaIds: string[],
      primaryAreaId: string,
      travelFees: Record<string, number>,
    }>
  }
}
```

#### Schema Alignment
- ✅ Uses `areas` table correctly
- ⚠️ Missing: Travel fee input
- ⚠️ Missing: Primary area selection
- ⚠️ Missing: Service radius input
- ⚠️ Missing: Per-service area differentiation

---

## STEP 5: Description & Images

### Current Implementation
- **Description**: Text area per service (200 char limit)
- **Images**: File upload for portfolio photos (max 3 per service)
- **Navigation**: Next/Previous buttons to cycle through services

### What SHOULD Be Here (Based on Schema)

#### Data for `provider_services` Table
```typescript
{
  description: string,        // Currently collected ✅
  experienceYears: number,    // MISSING - should add here
}
```

#### Image Storage Strategy

**Current Schema**: Images stored in `service_providers.portfolio_images` (text[])
- This is GLOBAL portfolio images, not per-service

**Better Approach**: 
1. Upload images to Supabase Storage
2. Store URLs in appropriate field:
   - **General portfolio**: `service_providers.portfolio_images[]`
   - **Service-specific**: Store in new field or reference via separate table

**Recommendation**: 
- Add `portfolio_images` JSONB field to `provider_services` table
- Structure: `{ serviceId: string, images: string[], captions?: string[] }`

#### Additional Fields to Add
1. **Experience Years** (Critical - in schema but not collected)
   ```tsx
   <label>How many years have you done {service.name}?</label>
   <input type="number" min="0" max="50" />
   ```

2. **Certification Status** (if service requires it)
   ```typescript
   // Check subcategory requirements:
   SELECT requires_certification, license_type
   FROM service_subcategories
   WHERE id = ?
   
   // If true, show:
   "Do you have certification for this service?"
   - [ ] Yes, I'm certified (will upload documents later)
   - [ ] No, not yet
   ```

3. **Service-Specific Details**
   - Tools/Equipment owned
   - Team size (if company)
   - Special qualifications

#### Schema Alignment
- ✅ Description collection works
- ❌ Experience years NOT collected (critical gap)
- ⚠️ Image storage strategy unclear
- ⚠️ No certification check
- ⚠️ Missing team/equipment info

---

## STEP 6: Review & Publish

### Current Implementation
- **Summary**: Shows all selected services with pricing
- **Areas**: Displays count of selected areas
- **Submit**: Calls `addProviderServices()` server action

### What SHOULD Be Here

#### Complete Data Validation
Before submission, validate:
```typescript
interface ValidationChecks {
  // Required fields
  hasServices: boolean           // ✅ Currently checked
  hasPricing: boolean            // ✅ Currently checked
  hasAreas: boolean              // ✅ Currently checked
  
  // Missing validations:
  hasExperienceYears: boolean    // ❌ Not collected
  pricingComplete: boolean       // ❌ Not validated (null prices allowed?)
  areasMatchCapacity: boolean    // ❌ Not checked
}
```

#### Capacity Warning
**CRITICAL MISSING FEATURE**: Check provider capacity

```typescript
// Before publishing services, check:
const providerCapacity = await getProviderCapacity(providerId);

if (!providerCapacity.max_concurrent_bookings) {
  // WARN: "You haven't set your capacity limit"
  // Show default: 30 concurrent bookings
  // Allow edit before publishing
}

// Calculate expected load:
const serviceCount = selectedServices.length;
const areaCount = selectedAreas.length;
const estimatedLoad = serviceCount * areaCount * averageBookingsPerService;

if (estimatedLoad > providerCapacity.max_concurrent_bookings) {
  // WARN: "Your capacity may be insufficient"
  // Suggest increasing capacity or reducing services/areas
}
```

#### Schema Fields to Set on Publish

**In `provider_services` table:**
```sql
INSERT INTO provider_services (
  provider_id,
  service_id,
  custom_pricing,     -- ✅ Currently set
  experience_years,   -- ❌ NOT SET - Critical gap!
  is_active,          -- ✅ Set to true
  verification_status, -- Set to 'not_started'
  
  -- Capacity fields (NEW):
  max_concurrent_bookings,  -- NULL = inherit from provider
  overlapping_bookings_allowed, -- Default: false
  capacity_time_window, -- Default: 'concurrent'
  
  created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
```

**In `provider_service_areas` table:**
```sql
-- For each selected area:
INSERT INTO provider_service_areas (
  provider_id,
  service_id,      -- NULL if bulk, specific ID if per-service
  area_name,
  area_type,
  is_primary_area,
  travel_fee,
  currency
) VALUES (?, ?, ?, ?, ?, ?, 'KES');
```

#### Post-Publish Actions
1. **Update Provider Stats**
   ```sql
   UPDATE service_providers
   SET 
     profile_completion_percent = calculate_completion(provider_id),
     updated_at = NOW()
   WHERE id = ?;
   ```

2. **Trigger Verification Workflow** (if not already started)
   ```sql
   -- Create verification tasks for services that require it
   INSERT INTO provider_verification_documents (
     provider_id,
     service_id,
     document_type,
     status
   )
   SELECT provider_id, service_id, 'certification', 'not_started'
   FROM provider_services ps
   JOIN service_subcategories ss ON ...
   WHERE ps.provider_id = ? AND ss.requires_certification = true;
   ```

3. **Revalidate Caches**
   ```typescript
   revalidatePath('/dashboard/provider/services');
   revalidatePath('/dashboard/provider');
   revalidatePath('/providers/[id]'); // Public profile
   ```

#### Schema Alignment
- ✅ Inserts into `provider_services` correctly
- ❌ Missing: `experience_years` field
- ❌ Missing: `provider_service_areas` inserts
- ❌ Missing: Capacity validation
- ❌ Missing: Verification workflow trigger

---

## Critical Schema Gaps in Current Implementation

### 1. Experience Years NOT Collected ❌
**Schema Field**: `provider_services.experience_years`  
**Current**: Not collected anywhere in wizard  
**Fix**: Add to Step 5 (Description & Images)

### 2. Service Areas Not Persisted ❌
**Schema Table**: `provider_service_areas`  
**Current**: Collected in Step 4 but NOT inserted into database  
**Fix**: Modify `addProviderServices()` to insert areas

### 3. Capacity Not Considered ❌
**Schema Fields**: 
- `service_providers.max_concurrent_bookings`
- `provider_services.max_concurrent_bookings`

**Current**: No capacity check or warning  
**Fix**: Add capacity validation in Step 6

### 4. Certification Requirements Not Checked ❌
**Schema Fields**:
- `service_subcategories.requires_certification`
- `provider_services.has_certification`

**Current**: No check if service requires certification  
**Fix**: Query requirements in Step 2/5, show UI if needed

### 5. Portfolio Images Storage Unclear ⚠️
**Schema Field**: `service_providers.portfolio_images` (text[])  
**Current**: Collected but storage strategy not implemented  
**Fix**: Define clear upload → storage → URL persistence flow

---

## Complete Data Flow (What SHOULD Happen)

### Step 1: Category Selection
```typescript
// Collect:
categoryIds: ['uuid1', 'uuid2']

// Store in: Wizard state only (temporary)
```

### Step 2: Services Selection
```typescript
// Query:
SELECT * FROM services_with_categories
WHERE category_id IN categoryIds AND is_active = true
ORDER BY is_popular DESC

// Collect:
selectedServices: [{
  serviceId, serviceName, subcategoryId, 
  subcategoryName, categoryId, categoryName
}]

// Store in: Wizard state only
```

### Step 3: Pricing
```typescript
// Update selectedServices with:
customPrice: number | null
priceType: 'fixed' | 'starting_from' | 'quote'

// Store in: Wizard state only
```

### Step 4: Service Areas
```typescript
// Query:
SELECT id, name, type FROM areas WHERE city = 'Nairobi'

// Collect:
serviceAreas: {
  areaIds: string[],
  primaryAreaId: string,
  travelFees: Record<string, number>,
  canTravelOutside: boolean
}

// Store in: Wizard state only
```

### Step 5: Description & Images
```typescript
// Update selectedServices with:
description: string
experienceYears: number  // MISSING!

// Upload images to Supabase Storage
// Get URLs back

// Collect:
portfolioImages: Record<serviceId, string[]>

// Store in: Wizard state only
```

### Step 6: Review & Publish
```typescript
// Submit to server action:
addProviderServices({
  services: selectedServices.map(s => ({
    serviceId: s.serviceId,
    customPrice: s.customPrice,
    priceType: s.priceType,
    description: s.description,
    experienceYears: s.experienceYears,  // MISSING!
  })),
  serviceAreas: { ... },  // MISSING!
  portfolioImages: { ... }  // MISSING!
})

// Server action inserts:
// 1. provider_services records
// 2. provider_service_areas records
// 3. Upload portfolio images (if any)
// 4. Update provider profile stats
// 5. Trigger verification workflow (if needed)
```

---

## Database Insertion (What SHOULD Happen)

### 1. Insert Provider Services
```sql
INSERT INTO provider_services (
  provider_id,
  service_id,
  custom_pricing,              -- JSONB
  experience_years,            -- INTEGER (MISSING!)
  is_active,                   -- BOOLEAN (default true)
  verification_status,         -- ENUM (default 'not_started')
  created_at,
  updated_at
) VALUES 
  -- One row per selected service
  (?, ?, ?::jsonb, ?, true, 'not_started', NOW(), NOW());
```

### 2. Insert Service Areas
```sql
INSERT INTO provider_service_areas (
  provider_id,
  service_id,        -- NULL for bulk, specific ID for per-service
  area_name,         -- Get from areas table
  area_type,         -- 'sub_county' or 'area'
  is_primary_area,   -- One area marked as primary
  travel_fee,        -- Decimal (if set)
  currency,          -- 'KES'
  created_at
) VALUES
  -- One row per (service x area) combination
  (?, ?, ?, ?, ?, ?, 'KES', NOW());
```

### 3. Update Provider Profile
```sql
UPDATE service_providers
SET 
  profile_completion_percent = (
    SELECT calculate_profile_completion(?)
  ),
  updated_at = NOW()
WHERE id = ?;
```

### 4. Create Verification Tasks (if needed)
```sql
-- For services requiring certification:
INSERT INTO provider_verification_documents (
  provider_id,
  service_id,
  document_type,
  status,
  created_at
)
SELECT 
  ? as provider_id,
  ps.service_id,
  'certification' as document_type,
  'not_started' as status,
  NOW() as created_at
FROM provider_services ps
JOIN services s ON ps.service_id = s.id
JOIN service_subcategories ss ON s.subcategory_id = ss.id
WHERE ps.provider_id = ?
  AND ss.requires_certification = true
  AND ps.verification_status = 'not_started';
```

---

## Missing Features Summary

### High Priority (Data Loss / Schema Mismatch)
1. ❌ **Experience Years** - Field exists in schema but never collected
2. ❌ **Service Areas Persistence** - Collected but not saved to database
3. ❌ **Capacity Validation** - No check against provider capacity limits

### Medium Priority (UX / Completeness)
4. ⚠️ **Travel Fees** - UI exists but not fully implemented
5. ⚠️ **Primary Area Selection** - Missing from UI
6. ⚠️ **Certification Check** - No validation for services requiring licenses
7. ⚠️ **Portfolio Image Upload** - Collection UI exists but storage unclear

### Low Priority (Nice to Have)
8. ⚠️ **Category Icons** - Not displayed
9. ⚠️ **Service Descriptions** - Platform descriptions not shown
10. ⚠️ **Base Price Reference** - Not shown as pricing guideline
11. ⚠️ **Per-Service Capacity** - No UI for service-specific limits

---

## Recommended Action Items

### Immediate Fixes (Critical)
1. **Add Experience Years Input** in Step 5
2. **Persist Service Areas** in server action
3. **Add Capacity Check** in Step 6

### Short Term (Next Sprint)
4. Implement travel fee input in Step 4
5. Add primary area selection in Step 4
6. Show certification requirements in Step 2/5
7. Complete image upload flow

### Long Term (Future Enhancement)
8. Add per-service capacity configuration
9. Show platform pricing as reference
10. Add bulk edit mode for existing services
11. Add service preview before publish

---

## Complete Schema Reference

### Tables Involved in Add Services Flow

1. **service_categories** - Step 1 source
2. **service_subcategories** - Referenced in Step 2
3. **services** - Step 2 source
4. **services_with_categories** (materialized view) - Performance optimization
5. **provider_services** - PRIMARY insertion target
6. **provider_service_areas** - Area persistence (MISSING)
7. **service_providers** - Profile updates
8. **areas** - Step 4 source
9. **provider_verification_documents** - Post-publish trigger

### Key Fields NOT Currently Used
- `provider_services.experience_years` ❌
- `provider_services.has_certification` ⚠️
- `provider_services.max_concurrent_bookings` ⚠️
- `provider_services.overlapping_bookings_allowed` ⚠️
- `provider_service_areas.*` (entire table) ❌
- `services.base_price` (reference pricing) ⚠️
- `services.estimated_duration` ⚠️
- `service_subcategories.requires_certification` ⚠️

---

*End of Analysis - All schema alignments verified against SERVICE_PROVIDER_COMPLETE_SCHEMA.md*
