# Provider Dashboard Performance Audit - Jan 9, 2026

## Executive Summary

**Current State:** Provider dashboard pages taking 2-5s to load with significant bottlenecks in sequential database queries and unnecessary data fetching.

**Target:** Sub-500ms page loads with parallel queries and minimal data fetching.

---

## Page-by-Page Analysis

### 1. `/dashboard/provider` (Main Dashboard)

**Current Performance:**
- Total: 5.0s
- Compile: 2.7s (Turbopack)
- Render: 2.4s (SERVER)
- Proxy: 18ms

**Server Operations Breakdown:**

```tsx
// File: src/app/dashboard/provider/page.tsx

// Operation 1: Auth check (via layout)
await supabase.auth.getUser();  // ~50ms

// Operation 2: Get profile (via layout)
await supabase.from("profiles").select("...").single();  // ~80ms

// Operation 3: Get user roles (via layout)
await supabase.from("user_roles").select("...").eq(...);  // ~80ms

// Operation 4: Check provider type (via layout)
await supabase.from("service_providers").select("business_type").single();  // ~80ms

// Operation 5: Get provider details (page level)
await supabase.from("service_providers").select("business_type, is_active").single();  // ~80ms DUPLICATE!

// Total Layout Overhead: ~290ms
// Total Page Queries: ~80ms
```

**❌ CRITICAL ISSUES:**

1. **Layout waterfall**: 4 sequential queries in layout (290ms wasted)
2. **Duplicate queries**: Provider details fetched TWICE (layout + page)
3. **No parallelization**: All queries run sequentially
4. **Unnecessary re-queries**: Layout queries on every navigation

**✅ OPTIMIZATIONS:**

```tsx
// Consolidate into ONE query with join
const { data } = await supabase
  .from("service_providers")
  .select(`
    id,
    business_type,
    is_active,
    user:profiles!user_id (
      verification_level,
      full_name,
      phone
    )
  `)
  .eq("user_id", user.id)
  .single();

// Target: 290ms → 80ms (3.6x faster)
```

---

### 2. `/dashboard/provider/services` (My Services)

**Current Performance:**
- Total: ~1.5s (after optimization)
- Was: 3.9s before removing unnecessary queries

**Server Operations:**

```tsx
// BEFORE (3 queries):
await supabase.auth.getUser();  // 50ms
await supabase.from("profiles").select("verification_level").single();  // 80ms
await getProviderServices();  // 150ms (includes auth + provider lookup internally)

// AFTER (1 query):
await getProviderServices();  // 150ms only
```

**getProviderServices() internals:**

```tsx
// Operation 1: Get user
await supabase.auth.getUser();  // 50ms

// Operation 2: Get provider ID
await supabase.from("service_providers").select("id").single();  // 80ms

// Operation 3: Get services with joins
await supabase.from("provider_services")
  .select(`
    *,
    service:services(*,
      subcategory:service_subcategories(*,
        category:service_categories(*)
      )
    )
  `)
  .eq("provider_id", providerId);  // 100ms (nested joins)

// Total: ~230ms
```

**❌ ISSUES:**

1. **Nested joins**: 3 levels deep (service → subcategory → category)
2. **Over-fetching**: Getting all fields with `*` when only need ~5
3. **Auth duplication**: getProviderServices does own auth (redundant with layout)

**✅ OPTIMIZATIONS:**

```tsx
// Cache provider_id in layout context (eliminate query 2)
// Flatten joins or use view with materialized path
// Select only needed fields

// Target: 230ms → 80ms (2.9x faster)
```

---

### 3. `/dashboard/provider/services/new` (Add Service)

**Current Performance:**
- Compile: 902ms
- Render: 3.1s
- Total: 4.0s

**Server Operations:**

```tsx
// From layout (inherited):
// - Auth check (50ms)
// - Profile query (80ms)
// - Roles query (80ms)
// - Provider type check (80ms)

// Page-specific:
// Operation 1: Get available services
await supabase
  .from("services")
  .select(`
    *,
    subcategory:service_subcategories(*,
      category:service_categories(*)
    )
  `);  // 150ms (getting ALL services with joins)

// Operation 2: Get provider's existing services
await supabase
  .from("provider_services")
  .select("service_id")
  .eq("provider_id", providerId);  // 80ms

// Total: ~520ms (290ms layout + 230ms page)
```

**❌ ISSUES:**

1. **Loading all services**: Getting every service in DB when only need ~20 common ones
2. **Heavy joins**: Nested subcategory → category joins
3. **No pagination**: Loading 100+ services at once
4. **Layout overhead**: 290ms wasted on layout queries

**✅ OPTIMIZATIONS:**

```tsx
// Use lightweight view or materialized path
CREATE VIEW services_with_categories AS
SELECT 
  s.id,
  s.name,
  s.slug,
  sc.name as subcategory_name,
  cat.name as category_name,
  cat.slug as category_slug
FROM services s
LEFT JOIN service_subcategories sc ON s.subcategory_id = sc.id
LEFT JOIN service_categories cat ON sc.category_id = cat.id;

// Select only active/popular services
// Add search/filter instead of loading all

// Target: 230ms → 60ms (3.8x faster)
```

---

## Layout Performance Analysis

**File:** `src/app/dashboard/provider/layout.tsx`

**Current Waterfall:**

```
Auth (50ms)
  ↓
Profile (80ms)
  ↓
Roles (80ms)
  ↓
Provider Type (80ms)
---
Total: 290ms (runs on EVERY navigation)
```

**❌ CRITICAL ISSUES:**

1. **No caching**: Layout re-runs on every navigation
2. **Sequential queries**: Each waits for previous
3. **Redundant data**: Provider type fetched separately from provider profile

**✅ SOLUTION: Parallel + Cached Layout Data**

```tsx
// Option 1: Parallel Queries
const [profileData, rolesData, providerData] = await Promise.all([
  supabase.from("profiles").select("...").single(),
  supabase.from("user_roles").select("..."),
  supabase.from("service_providers").select("...").single(),
]);
// Target: 290ms → 80ms (3.6x faster)

// Option 2: Single Join Query (BEST)
const { data } = await supabase
  .from("service_providers")
  .select(`
    id,
    business_type,
    is_active,
    user:profiles!user_id (
      id,
      email,
      full_name,
      avatar_url,
      verification_level,
      roles:user_roles(role, is_verified)
    )
  `)
  .eq("user_id", user.id)
  .single();
// Target: 290ms → 60ms (4.8x faster)

// Option 3: React Cache (IDEAL for Next.js 15+)
import { cache } from 'react';

const getProviderData = cache(async (userId: string) => {
  // Single query with joins
  return supabase.from("service_providers").select(...).single();
});

// This runs ONCE per request, shared across layout + pages
// Target: 290ms → 60ms first load, 0ms subsequent
```

---

## Database Query Patterns Analysis

### Current Anti-Patterns

**1. Sequential Waterfalls**
```tsx
// ❌ BAD: 290ms total
const user = await getUser();           // 50ms
const profile = await getProfile(user); // 80ms
const roles = await getRoles(user);     // 80ms
const provider = await getProvider(user); // 80ms

// ✅ GOOD: 80ms total
const [user, profile, roles, provider] = await Promise.all([
  getUser(),
  getProfile(userId),
  getRoles(userId),
  getProvider(userId),
]);
```

**2. Over-Fetching with Joins**
```tsx
// ❌ BAD: Nested joins with SELECT *
.select(`
  *,
  service:services(*,
    subcategory:service_subcategories(*,
      category:service_categories(*)
    )
  )
`)
// Returns 50+ fields when only need 5

// ✅ GOOD: Explicit fields
.select(`
  id,
  service_id,
  custom_pricing,
  service:services(id, name, slug),
  category_name:services(subcategory(category(name)))
`)
```

**3. Duplicate Queries**
```tsx
// ❌ BAD: Layout fetches provider, page fetches again
// Layout:
await supabase.from("service_providers").select("business_type");
// Page:
await supabase.from("service_providers").select("business_type, is_active");

// ✅ GOOD: Pass from layout via context
<ProviderContext.Provider value={providerData}>
  {children}
</ProviderContext.Provider>
```

**4. No Query Result Caching**
```tsx
// ❌ BAD: Same query runs multiple times per request
function Page1() { await getServices(); }
function Page2() { await getServices(); }

// ✅ GOOD: React cache
const getServices = cache(async () => {
  return supabase.from("services").select(...);
});
```

---

## Recommended Optimizations (Priority Order)

### 🔴 P0: Critical (Implement Immediately)

#### 1. Consolidate Layout Queries
**File:** `src/app/dashboard/provider/layout.tsx`

**Impact:** 290ms → 60ms (4.8x faster)

```tsx
// Replace 4 queries with 1 join
const { data: providerData } = await supabase
  .from("service_providers")
  .select(`
    id,
    business_type,
    is_active,
    profile:profiles!user_id (
      id,
      email,
      full_name,
      avatar_url,
      verification_level,
      phone_confirmed:auth.users(phone_confirmed_at)
    )
  `)
  .eq("user_id", user.id)
  .single();

// Check roles separately (lightweight)
const hasProviderRole = providerData ? true : false;
```

#### 2. Remove Duplicate Provider Queries
**Files:** 
- `src/app/dashboard/provider/page.tsx`
- `src/app/dashboard/provider/services/actions.ts`

**Impact:** 80ms saved per page load

**Solution:** Pass provider data from layout via context or props.

#### 3. Parallelize getProviderServices
**File:** `src/app/dashboard/provider/services/actions.ts`

**Impact:** 230ms → 130ms

```tsx
// BEFORE:
const user = await getUser();
const provider = await getProvider(user.id);
const services = await getServices(provider.id);

// AFTER:
const user = await getUser();
const [provider, services] = await Promise.all([
  getProvider(user.id),
  getServicesWithJoins(user.id), // Single query with user_id join
]);
```

### 🟡 P1: High Impact (Implement This Week)

#### 4. Create Materialized View for Services
**Migration:** `20260109150000_services_flat_view.sql`

**Impact:** 150ms → 30ms for service listing

```sql
CREATE MATERIALIZED VIEW services_flat AS
SELECT 
  s.id,
  s.name,
  s.slug,
  s.description,
  sc.id as subcategory_id,
  sc.name as subcategory_name,
  cat.id as category_id,
  cat.name as category_name,
  cat.slug as category_slug
FROM services s
LEFT JOIN service_subcategories sc ON s.subcategory_id = sc.id
LEFT JOIN service_categories cat ON sc.category_id = cat.id;

CREATE INDEX ON services_flat(category_slug);
CREATE INDEX ON services_flat(subcategory_id);

-- Refresh trigger
CREATE OR REPLACE FUNCTION refresh_services_flat()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY services_flat;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_services_flat_trigger
AFTER INSERT OR UPDATE OR DELETE ON services
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_services_flat();
```

#### 5. Add React Cache to Server Actions
**Impact:** Eliminates duplicate queries within same request

```tsx
import { cache } from 'react';

export const getProviderData = cache(async (userId: string) => {
  return supabase
    .from("service_providers")
    .select("id, business_type, is_active")
    .eq("user_id", userId)
    .single();
});

export const getProviderServices = cache(async (providerId: string) => {
  return supabase
    .from("provider_services")
    .select("...");
});
```

#### 6. Lazy Load Heavy Queries
**File:** `src/app/dashboard/provider/page.tsx`

**Impact:** Initial render 2.4s → 800ms

```tsx
// Don't fetch stats on initial load
// Show skeleton, load via client component

// Server: Just layout + basic info
export default async function DashboardPage() {
  const provider = await getProviderBasicInfo();
  
  return (
    <div>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsAsync providerId={provider.id} />
      </Suspense>
    </div>
  );
}

// Client: Load stats after initial render
'use client';
function StatsAsync({ providerId }) {
  const { data } = useSWR(`/api/stats/${providerId}`);
  return <StatsDisplay data={data} />;
}
```

### 🟢 P2: Nice to Have (Implement Next Sprint)

#### 7. Add Database Indexes
```sql
-- Provider lookups by user_id (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS 
  idx_service_providers_user_id_active 
  ON service_providers(user_id) 
  WHERE is_active = true;

-- Service lookups with category
CREATE INDEX CONCURRENTLY IF NOT EXISTS 
  idx_services_category_subcategory 
  ON services(subcategory_id) 
  INCLUDE (name, slug);

-- Provider services with active filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS 
  idx_provider_services_provider_active 
  ON provider_services(provider_id) 
  WHERE is_active = true;
```

#### 8. Add Query Result Caching (Redis/Upstash)
```tsx
import { Redis } from '@upstash/redis';

const redis = new Redis({ url: process.env.UPSTASH_URL });

async function getProviderWithCache(userId: string) {
  const cached = await redis.get(`provider:${userId}`);
  if (cached) return cached;
  
  const data = await supabase.from("service_providers").select(...);
  await redis.set(`provider:${userId}`, data, { ex: 300 }); // 5min TTL
  
  return data;
}
```

#### 9. Preload Critical Data in Middleware
```tsx
// middleware.ts
export async function middleware(request: NextRequest) {
  const user = await getUser(request);
  
  if (request.nextUrl.pathname.startsWith('/dashboard/provider')) {
    // Preload provider data into cache
    await getProviderData(user.id);
  }
  
  return NextResponse.next();
}
```

---

## Performance Targets

| Page | Current | Target | Optimization |
|------|---------|--------|--------------|
| `/dashboard/provider` | 2.4s render | 500ms | Consolidate queries, parallelize |
| `/dashboard/provider/services` | 1.3s render | 200ms | Remove layout overhead, use cache |
| `/dashboard/provider/services/new` | 3.1s render | 600ms | Materialize view, lazy load |
| Layout overhead | 290ms | 60ms | Single join query |

---

## Immediate Action Plan (Today)

### Step 1: Consolidate Layout Queries (30 minutes)
```bash
# Edit: src/app/dashboard/provider/layout.tsx
# Replace 4 sequential queries with 1 join query
# Expected impact: 290ms → 60ms
```

### Step 2: Add React Cache to Actions (15 minutes)
```bash
# Edit: src/app/dashboard/provider/services/actions.ts
# Wrap getProviderId in cache()
# Wrap getProviderServices in cache()
# Expected impact: Eliminate duplicate queries
```

### Step 3: Parallelize Provider Dashboard Queries (20 minutes)
```bash
# Edit: src/app/dashboard/provider/page.tsx
# Use Promise.all for independent queries
# Expected impact: Additional 100ms savings
```

### Step 4: Test and Measure
```bash
# Run performance test
npm run dev
# Navigate through provider dashboard
# Check server logs for query timing
# Target: All pages under 500ms render
```

---

## Monitoring and Validation

### Add Query Timing Logs
```tsx
// lib/supabase/server.ts
export async function createClient() {
  const supabase = createSupabaseClient(...);
  
  // Wrap query methods with timing
  const originalFrom = supabase.from.bind(supabase);
  supabase.from = (table: string) => {
    const start = Date.now();
    const query = originalFrom(table);
    
    // Intercept .single(), .execute(), etc
    const originalSingle = query.single.bind(query);
    query.single = async () => {
      const result = await originalSingle();
      console.log(`[DB] ${table}.single() took ${Date.now() - start}ms`);
      return result;
    };
    
    return query;
  };
  
  return supabase;
}
```

### Performance Dashboard
Create a simple admin page to track:
- Average page render time
- Query counts per page
- Slowest queries
- Layout vs page overhead

---

## Expected Results

**Before Optimizations:**
- Layout: 290ms
- Dashboard page: 2.4s total (290ms layout + 2.1s render)
- Services page: 1.3s total (290ms layout + 1.0s render)
- Add service: 3.1s total (290ms layout + 2.8s render)

**After P0 Optimizations:**
- Layout: 60ms (-79%)
- Dashboard page: 700ms total (-71%)
- Services page: 250ms total (-81%)
- Add service: 800ms total (-74%)

**ROI:** 4 hours of work → 2-4x performance improvement across all provider pages.
