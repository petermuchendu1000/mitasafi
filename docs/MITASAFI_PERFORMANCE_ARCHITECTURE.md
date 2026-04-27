# Mitasafi Performance & Architecture Guide

**Version:** 1.0  
**Date:** December 30, 2025  
**Status:** Approved

---

## 1. Performance Goals

### Target Metrics (Kenya Market)

| Metric | Target | Reason |
|--------|--------|--------|
| First Contentful Paint (FCP) | < 1.5s | Quick feedback for 3G/4G users |
| Largest Contentful Paint (LCP) | < 2.5s | Property images must load fast |
| Time to Interactive (TTI) | < 3.5s | Users can interact quickly |
| Cumulative Layout Shift (CLS) | < 0.1 | No jumping content |
| API Response Time | < 200ms | Snappy interactions |
| Initial Bundle Size | < 100KB | Low data usage (data costs money) |

### Kenya Context

- Many users on 3G or spotty 4G networks
- Data costs matter (bundle size = user money)
- Mobile-first (70%+ traffic expected)
- Varying device capabilities (low to high-end)

---

## 2. Architecture Decision

### Approach: Modular Monolith → Gradual Extraction

**Decision:** Start with a Modular Monolith, extract services only when needed.

```
EVOLUTION PATH
═══════════════════════════════════════════════════════════════

PHASE 1: MODULAR MONOLITH (Now → 50K users)
─────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Auth    │ │Property │ │ Payment │ │ Chat    │  Modules  │
│  │ Module  │ │ Module  │ │ Module  │ │ Module  │  (Clean   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘  boundaries)
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │ SUPABASE  │                            │
│                    └───────────┘                            │
└─────────────────────────────────────────────────────────────┘

PHASE 2: EXTRACT CRITICAL SERVICES (50K → 200K users)
─────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                      │
│  ┌─────────┐ ┌─────────┐           ┌─────────┐             │
│  │ Auth    │ │Property │           │ Chat    │             │
│  │ Module  │ │ Module  │           │ Module  │             │
│  └─────────┘ └─────────┘           └─────────┘             │
└──────────────────────┬──────────────────┬───────────────────┘
                       │                  │
        ┌──────────────▼──┐    ┌──────────▼──────────┐
        │ PAYMENT SERVICE │    │ NOTIFICATION SERVICE │
        │ (Edge Function) │    │   (Edge Function)    │
        └─────────────────┘    └─────────────────────┘

PHASE 3: FULL MICROSERVICES (200K+ users, if needed)
─────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                             │
└──────┬────────┬────────┬────────┬────────┬────────┬────────┘
       │        │        │        │        │        │
   ┌───▼───┐┌───▼───┐┌───▼───┐┌───▼───┐┌───▼───┐┌───▼───┐
   │ Auth  ││Property││Payment││ Chat  ││Search ││Notif. │
   │Service││Service ││Service││Service││Service││Service│
   └───────┘└───────┘└───────┘└───────┘└───────┘└───────┘
```

### Why Modular Monolith (Not Microservices)

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Development Speed | ✅ Fast | ❌ Slow (infra overhead) |
| Team Size Needed | ✅ 1-3 devs | ❌ 5+ devs minimum |
| Operational Complexity | ✅ Simple | ❌ Complex (K8s, service mesh) |
| Cost | ✅ Low (Vercel + Supabase) | ❌ High (multiple services) |
| Debugging | ✅ Easy | ❌ Distributed tracing needed |
| Consistency | ✅ Easy transactions | ❌ Eventual consistency |
| Performance | ✅ No network hops | ❌ Inter-service latency |

**Rule:** Don't add complexity until you have the problems that require it.

---

## 3. Frontend Performance

### 3.1 Code Splitting & Lazy Loading

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic'

const PropertyMap = dynamic(() => import('@/components/property-map'), {
  loading: () => <MapSkeleton />,
  ssr: false  // Maps don't need SSR
})

const ImageGallery = dynamic(() => import('@/components/image-gallery'), {
  loading: () => <GallerySkeleton />
})

const VideoPlayer = dynamic(() => import('@/components/video-player'), {
  loading: () => <VideoSkeleton />,
  ssr: false
})

const ChatWidget = dynamic(() => import('@/components/chat-widget'), {
  ssr: false  // Only loads when needed
})
```

### 3.2 Bundle Optimization

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  
  // Analyze bundle in development
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer 
            ? '../analyze/server.html' 
            : './analyze/client.html',
        })
      )
    }
    return config
  },
}
```

### 3.3 Route Prefetching

```typescript
// Smart prefetching based on user behavior
import { useRouter } from 'next/navigation'

export function PropertyCard({ property }) {
  const router = useRouter()
  
  // Prefetch on hover (desktop) or viewport entry (mobile)
  const handlePrefetch = () => {
    router.prefetch(`/properties/${property.id}`)
  }
  
  return (
    <div 
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
    >
      {/* Card content */}
    </div>
  )
}
```

---

## 4. Image Optimization

### 4.1 Optimized Image Component

```typescript
// components/optimized-image.tsx
import Image from 'next/image'

export function PropertyImage({ src, alt, priority = false }) {
  const optimizedSrc = getOptimizedUrl(src, {
    width: 800,
    quality: 75,
    format: 'webp'
  })
  
  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={800}
      height={450}
      priority={priority}  // Only for above-fold images
      placeholder="blur"
      blurDataURL={generateBlurPlaceholder(src)}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      loading={priority ? 'eager' : 'lazy'}
    />
  )
}
```

### 4.2 Image Delivery Pipeline

```
IMAGE DELIVERY PIPELINE
═══════════════════════════════════════════════════════════════

Upload Flow:
User Uploads → Edge Function (resize, validate) → Supabase Storage
                                                        │
                                                        ▼
                                              Image Transform Service
                                              (on-demand variants)

Delivery Flow:
User Request → Cloudflare CDN Cache → Transformed Image

Image Variants:
├── thumbnail: 200x150, quality 60, webp
├── card: 400x300, quality 70, webp
├── detail: 800x600, quality 80, webp
├── full: 1200x900, quality 85, webp
└── original: stored for backup
```

---

## 5. API & Data Layer Performance

### 5.1 Efficient Data Fetching

```typescript
// Single query with all needed relations (no N+1)
export async function getPropertyWithRelations(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('properties')
    .select(`
      id, name, description, location, amenities, created_at,
      units (
        id, unit_number, bedrooms, bathrooms, rent_amount, status, images
      ),
      landlord:profiles!landlord_id (
        id, full_name, avatar_url, verified, phone
      ),
      reviews (
        id, rating, comment, created_at,
        reviewer:profiles!reviewer_id (full_name, avatar_url)
      )
    `)
    .eq('id', id)
    .single()
  
  return { data, error }
}

// For lists, select only needed fields (minimal payload)
export async function getPropertiesForList(filters: PropertyFilters) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('properties')
    .select(`
      id, name, sub_county, location,
      units (id, rent_amount, bedrooms, status, images)
    `)
    .eq('status', 'active')
    .limit(20)
  
  return { data, error }
}
```

### 5.2 Database Indexes

```sql
-- Essential indexes for performance

-- Properties by status and location
CREATE INDEX idx_properties_status_subcounty 
  ON properties(status, sub_county) 
  WHERE status = 'active';

-- Units by property
CREATE INDEX idx_units_property_status 
  ON units(property_id, status);

-- Units by rent for price filtering
CREATE INDEX idx_units_rent_amount 
  ON units(rent_amount) 
  WHERE status = 'available';

-- Geographic queries
CREATE INDEX idx_properties_location 
  ON properties USING GIST(location);

-- Full-text search
CREATE INDEX idx_properties_search 
  ON properties USING GIN(
    to_tsvector('english', name || ' ' || description || ' ' || address)
  );

-- Composite index for common filters
CREATE INDEX idx_properties_filter 
  ON properties(status, sub_county, ward, verified)
  WHERE status = 'active';
```

### 5.3 Connection Pooling

```typescript
// For Edge Functions, use Supabase connection pooler
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    db: { schema: 'public' },
    auth: { persistSession: false },
    global: {
      headers: { 'x-connection-pool': 'transaction' }
    }
  }
)
```

---

## 6. Caching Strategy

### 6.1 Caching Layers

```
CACHING LAYERS
═══════════════════════════════════════════════════════════════

LAYER 1: BROWSER CACHE
├── Static assets (JS, CSS, fonts): 1 year (immutable)
├── Images: 1 week with revalidation
└── HTML: no-cache (always fresh)

LAYER 2: CDN CACHE (Cloudflare/Vercel)
├── Static pages: 1 hour, stale-while-revalidate
├── API responses: 1-5 min based on endpoint
├── Images: 1 week
└── User-specific: no CDN cache

LAYER 3: EDGE CACHE (Vercel Edge)
├── ISR pages: revalidate on demand
├── Edge config: 0 latency
└── Geolocation data: cached at edge

LAYER 4: APPLICATION CACHE (TanStack Query)
├── Query results: staleTime based on data type
├── Mutations: optimistic updates
└── Infinite queries: paginated cache

LAYER 5: DATABASE CACHE (Supabase/Postgres)
├── Query cache: automatic
├── Materialized views: for heavy aggregations
└── Connection pooling: PgBouncer
```

### 6.2 TanStack Query Configuration

```typescript
// lib/query-config.ts
export const queryConfig = {
  // Property listings - change often, short cache
  properties: {
    staleTime: 30 * 1000,      // 30 seconds
    gcTime: 5 * 60 * 1000,     // 5 minutes
    refetchOnMount: true,
  },
  
  // Property detail - moderate cache
  propertyDetail: {
    staleTime: 60 * 1000,      // 1 minute
    gcTime: 10 * 60 * 1000,    // 10 minutes
    refetchOnMount: false,
  },
  
  // User profile - longer cache
  userProfile: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
    refetchOnMount: false,
  },
  
  // Static data (locations, amenities) - long cache
  staticData: {
    staleTime: 24 * 60 * 60 * 1000,  // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnMount: false,
  },
  
  // Chat messages - real-time, no stale
  chatMessages: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
  },
}
```

### 6.3 ISR (Incremental Static Regeneration)

```typescript
// app/properties/[id]/page.tsx

// Pre-render popular properties
export async function generateStaticParams() {
  const supabase = createClient()
  
  // Top 100 most viewed properties
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('status', 'active')
    .order('view_count', { ascending: false })
    .limit(100)
  
  return data?.map((p) => ({ id: p.id })) || []
}

// Revalidate every 10 minutes
export const revalidate = 600

export default async function PropertyPage({ params }) {
  const property = await getProperty(params.id)
  if (!property) notFound()
  return <PropertyDetail property={property} />
}
```

---

## 7. Real-time Optimization

### 7.1 Efficient Subscriptions

```typescript
// Single subscription per conversation
export function useChatSubscription(conversationId: string) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  
  useEffect(() => {
    if (channelRef.current) return  // Only subscribe once
    
    channelRef.current = supabase
      .channel(`chat:${conversationId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, handleNewMessage)
      .subscribe()
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId])
}
```

### 7.2 Batched User Notifications

```typescript
// Single channel for all user updates
export function useNotificationSubscription(userId: string) {
  const supabase = createClient()
  
  useEffect(() => {
    const channel = supabase
      .channel(`user:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, handleNotification)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tenancies',
        filter: `tenant_id=eq.${userId}`
      }, handleTenancyUpdate)
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [userId])
}
```

---

## 8. Edge Computing

### 8.1 Edge Middleware

```typescript
// middleware.ts - Runs at the edge (closest to user)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Add geolocation data (available at edge)
  const country = request.geo?.country || 'KE'
  const city = request.geo?.city || 'Nairobi'
  
  response.headers.set('x-user-country', country)
  response.headers.set('x-user-city', city)
  
  return response
}
```

### 8.2 Edge API Routes

```typescript
// app/api/search/route.ts
export const runtime = 'edge'  // Run at edge for lowest latency

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  const results = await searchProperties(query)
  
  return Response.json(results, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  })
}
```

---

## 9. Service Extraction Strategy

### When to Extract Services

| Service | Extract When | Reason |
|---------|--------------|--------|
| **Payments** | Volume > 1000/day | Security isolation, PCI compliance |
| **Notifications** | Volume > 10K/day | Independent scaling, rate limiting |
| **Search** | Listings > 50K | Specialized search engine needed |
| **Image Processing** | Uploads > 1K/day | CPU-intensive, separate scaling |
| **Analytics** | Events > 100K/day | Write-heavy, different storage |

### Keep Together

| Service | Reason |
|---------|--------|
| **Auth** | Supabase handles efficiently |
| **Core CRUD** | Tight coupling with database |
| **Chat** | Supabase Realtime is efficient |
| **User Profiles** | Core to everything |

---

## 10. Performance Monitoring

### 10.1 Web Vitals Tracking

```typescript
// lib/analytics/performance.ts
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals'

export function reportWebVitals() {
  getCLS(sendToAnalytics)   // Cumulative Layout Shift
  getFID(sendToAnalytics)   // First Input Delay
  getLCP(sendToAnalytics)   // Largest Contentful Paint
  getFCP(sendToAnalytics)   // First Contentful Paint
  getTTFB(sendToAnalytics)  // Time to First Byte
}

function sendToAnalytics(metric: Metric) {
  posthog.capture('web_vital', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,  // 'good', 'needs-improvement', 'poor'
    page: window.location.pathname,
  })
}
```

### 10.2 Performance Budget

```json
{
  "timings": [
    { "metric": "first-contentful-paint", "budget": 1500 },
    { "metric": "largest-contentful-paint", "budget": 2500 },
    { "metric": "interactive", "budget": 3500 },
    { "metric": "total-blocking-time", "budget": 200 }
  ],
  "resourceSizes": [
    { "resourceType": "script", "budget": 150000 },
    { "resourceType": "image", "budget": 300000 },
    { "resourceType": "stylesheet", "budget": 50000 },
    { "resourceType": "font", "budget": 100000 },
    { "resourceType": "total", "budget": 600000 }
  ]
}
```

---

## 11. Performance Checklist

### Frontend

- [ ] Code splitting implemented for heavy components
- [ ] Images optimized with Next.js Image component
- [ ] Fonts preloaded (Plus Jakarta Sans)
- [ ] Critical CSS inlined
- [ ] Bundle size < 100KB initial
- [ ] Service worker for offline support
- [ ] Route prefetching on hover/focus

### Backend

- [ ] Database indexes created for common queries
- [ ] Query optimization (no N+1 queries)
- [ ] Connection pooling enabled
- [ ] Caching strategy implemented per data type
- [ ] Rate limiting configured

### Infrastructure

- [ ] CDN configured (Cloudflare)
- [ ] Edge caching rules set
- [ ] Compression enabled (gzip/brotli)
- [ ] HTTP/2 or HTTP/3 enabled
- [ ] Web Vitals monitoring in place
- [ ] Performance budget alerts configured

---

## 12. Optimization Quick Reference

### Response Time Targets

| Endpoint Type | Target | Cache |
|---------------|--------|-------|
| Static pages | < 100ms | CDN (1hr) |
| Property list | < 200ms | CDN (5min) |
| Property detail | < 150ms | ISR (10min) |
| Search | < 300ms | Edge (1min) |
| User dashboard | < 200ms | None |
| Chat messages | < 100ms | Query cache |
| Payment init | < 500ms | None |

### Bundle Size Targets

| Asset Type | Max Size |
|------------|----------|
| Initial JS | 100KB |
| Per-route JS | 50KB |
| CSS | 50KB |
| Fonts | 100KB |
| Hero image | 100KB |
| Card image | 30KB |
| Total page weight | 500KB |

---

**Document Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 30, 2025 | Team | Initial Performance Architecture |

---

*This document guides performance optimization for the Mitasafi platform.*
