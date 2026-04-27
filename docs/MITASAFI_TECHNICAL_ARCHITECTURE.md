# Mitasafi Technical Architecture

**Version:** 1.0  
**Date:** December 30, 2025  
**Status:** Approved

---

## 1. Architecture Overview

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           MITASAFI SYSTEM ARCHITECTURE                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 1: PRESENTATION                                                  │  ║
║  │  Next.js 14 (App Router) + React 18 + TypeScript + Tailwind            │  ║
║  │  PWA • Responsive • Plus Jakarta Sans                                   │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                        ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 2: APPLICATION                                                   │  ║
║  │  Next.js API Routes + Server Actions + React Server Components         │  ║
║  │  Business Logic • Validation • Auth Middleware                         │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                        ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 3: DATA ACCESS                                                   │  ║
║  │  Supabase Client • TanStack Query • Real-time Subscriptions            │  ║
║  │  Type-safe Queries • Caching • Optimistic Updates                      │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                        ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 4: BACKEND SERVICES (Supabase)                                   │  ║
║  │  Auth • PostgreSQL • Storage • Realtime • Edge Functions               │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                        ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 5: EXTERNAL INTEGRATIONS                                         │  ║
║  │  Google (Maps, OAuth) • M-Pesa • Agora • Africa's Talking • SendGrid   │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                        ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 6: INFRASTRUCTURE                                                │  ║
║  │  Vercel • Supabase Cloud • Cloudflare • Sentry • PostHog               │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Layer 1: Presentation Layer

### 2.1 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 14 (App Router) | SSR, routing, optimization |
| UI Library | React 18 | Component architecture |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| Components | Shadcn/ui | Accessible base components |
| Forms | React Hook Form + Zod | Form handling & validation |
| State | Zustand | Global client state |
| Server State | TanStack Query | Caching, synchronization |
| Maps | @react-google-maps/api | Property locations |
| Icons | Lucide React | Consistent iconography |
| Font | Plus Jakarta Sans | Typography |

### 2.2 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (login, register)
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (main)/                   # Main app group
│   │   ├── properties/
│   │   ├── services/
│   │   ├── dashboard/
│   │   └── layout.tsx
│   ├── api/                      # API routes
│   └── layout.tsx                # Root layout
│
├── components/
│   ├── ui/                       # Base UI (shadcn)
│   ├── forms/                    # Form components
│   ├── layouts/                  # Layout components
│   ├── features/                 # Feature components
│   └── shared/                   # Shared components
│
├── hooks/                        # Custom React hooks
├── lib/                          # Utilities & configurations
├── stores/                       # Zustand stores
├── types/                        # TypeScript types
└── styles/                       # Global styles
```

### 2.3 Rendering Strategy

| Page Type | Rendering | Caching | Example |
|-----------|-----------|---------|---------|
| Homepage | SSG + ISR | 1 hour | / |
| Property Listing | SSR | 5 min | /properties |
| Property Detail | SSR + ISR | 10 min | /properties/[id] |
| Search Results | SSR | No cache | /search?q=... |
| Dashboard | CSR | User-specific | /dashboard |
| Auth Pages | SSR | No cache | /login |

### 2.4 PWA Configuration

**Features:**
- Installable on mobile home screen
- Offline property browsing (cached listings)
- Push notifications
- Background sync for messages

---

## 3. Layer 2: Application Layer

### 3.1 Server Actions

```typescript
// Server actions for mutations
'use server'

// Property actions
export async function createProperty(data: PropertyFormData) { }
export async function updateProperty(id: string, data: Partial<Property>) { }
export async function deleteProperty(id: string) { }

// Booking actions
export async function createBooking(data: BookingData) { }
export async function cancelBooking(id: string) { }

// Payment actions
export async function initiatePayment(data: PaymentData) { }
export async function verifyPayment(transactionId: string) { }
```

### 3.2 API Routes Structure

```
app/api/
├── auth/
│   ├── callback/route.ts        # OAuth callback
│   └── [...supabase]/route.ts   # Supabase auth helpers
├── webhooks/
│   ├── mpesa/route.ts           # M-Pesa callbacks
│   └── payments/route.ts        # Payment webhooks
├── properties/
│   ├── route.ts                 # GET (list), POST (create)
│   └── [id]/route.ts            # GET, PUT, DELETE
├── upload/
│   └── route.ts                 # File upload handling
└── cron/
    ├── tenant-score/route.ts    # Scheduled score updates
    └── notifications/route.ts   # Scheduled notifications
```

### 3.3 Middleware

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Refresh session
  const { data: { session } } = await supabase.auth.getSession()
  
  // Protected routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }
  
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}
```

### 3.4 Validation Schemas

```typescript
// lib/validations/property.ts
import { z } from 'zod'

export const propertySchema = z.object({
  name: z.string().min(5).max(100),
  type: z.enum(['residential', 'commercial', 'land']),
  subCounty: z.string(),
  ward: z.string(),
  address: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }),
  amenities: z.array(z.string()),
})

export const unitSchema = z.object({
  propertyId: z.string().uuid(),
  unitNumber: z.string(),
  type: z.enum(['bedsitter', 'studio', '1br', '2br', '3br', '4br', '5br_plus']),
  bedrooms: z.number().min(0).max(10),
  bathrooms: z.number().min(1).max(5),
  rentAmount: z.number().min(1000),
  depositAmount: z.number().min(0),
  images: z.array(z.string().url()).min(1).max(20),
})

export const paymentSchema = z.object({
  amount: z.number().positive(),
  phone: z.string().regex(/^254[0-9]{9}$/),
  reference: z.string(),
})
```

---

## 4. Layer 3: Data Access Layer

### 4.1 Supabase Client Setup

```typescript
// lib/supabase/client.ts (Browser)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (Server Components)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}
```

### 4.2 TanStack Query Configuration

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute
      gcTime: 5 * 60 * 1000,       // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

### 4.3 Data Hooks Pattern

```typescript
// hooks/use-properties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useProperties(filters?: PropertyFilters) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select(`*, units (*), landlord:profiles!landlord_id (*)`)
        .eq('status', 'active')
      
      if (filters?.subCounty) {
        query = query.eq('sub_county', filters.subCounty)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}
```

### 4.4 Real-time Subscriptions

```typescript
// hooks/use-chat.ts
export function useChatMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const supabase = createClient()
  
  useEffect(() => {
    // Initial fetch
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      setMessages(data || [])
    }
    fetchMessages()
    
    // Real-time subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])
  
  return messages
}
```

---

## 5. Layer 4: Backend Services (Supabase)

### 5.1 Authentication

**Providers:**
- Email + Password (with verification)
- Phone OTP (via Africa's Talking)
- Google OAuth
- Magic Link (optional)

**Configuration:**
```json
{
  "providers": {
    "email": true,
    "phone": true,
    "google": true
  },
  "sms_provider": "africas_talking",
  "site_url": "https://mitasafi.co.ke",
  "redirect_urls": ["https://mitasafi.co.ke/auth/callback"]
}
```

### 5.2 Database Tables

**Core Tables:**
- `profiles` - User profiles (extends auth.users)
- `properties` - Property listings
- `units` - Individual rental units
- `tenancies` - Active tenant-unit relationships
- `service_providers` - Service provider profiles
- `service_jobs` - Service bookings
- `payments` - All payment records
- `conversations` - Chat conversations
- `messages` - Chat messages
- `reviews` - Ratings and reviews
- `verifications` - Document verifications
- `notifications` - User notifications

### 5.3 Storage Buckets

| Bucket | Access | Max Size | Allowed Types |
|--------|--------|----------|---------------|
| `avatars` | Public | 2MB | jpg, png, webp |
| `properties` | Public | 10MB | jpg, png, webp |
| `videos` | Public | 100MB | mp4, webm |
| `documents` | Private | 5MB | pdf, jpg, png |
| `chat-attachments` | Private | 10MB | jpg, png, pdf |

### 5.4 Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `mpesa-stk-push` | Initiate M-Pesa payment | HTTP |
| `mpesa-callback` | Handle M-Pesa response | Webhook |
| `send-sms` | Send SMS via Africa's Talking | HTTP |
| `send-email` | Send email via SendGrid | HTTP |
| `calculate-tenant-score` | Update tenant scores | Scheduled |
| `release-escrow` | Release deposit funds | HTTP |
| `generate-lease-pdf` | Generate lease documents | HTTP |

---

## 6. Layer 5: External Integrations

### 6.1 Google Services

| Service | Use Case | API |
|---------|----------|-----|
| OAuth | User authentication | Google Identity |
| Maps | Property locations | Maps JavaScript API |
| Places | Location autocomplete | Places API |
| Geocoding | Address → coordinates | Geocoding API |

### 6.2 M-Pesa (Daraja API)

**Payment Flow:**
```
1. User clicks "Pay"
2. Frontend calls Edge Function (mpesa-stk-push)
3. Edge Function requests M-Pesa STK Push
4. User receives prompt on phone
5. User enters M-Pesa PIN
6. M-Pesa sends callback to (mpesa-callback)
7. Edge Function updates payment record
8. Real-time subscription notifies frontend
9. UI updates to "Payment Successful"
```

### 6.3 Video Calls (Agora)

Used for live property viewings between tenants and landlords.

### 6.4 SMS (Africa's Talking)

Used for:
- OTP verification
- Payment confirmations
- Rent reminders
- Critical notifications

### 6.5 Email (SendGrid/Resend)

**Email Templates:**
- Welcome email
- Email verification
- Password reset
- Payment confirmation
- Booking confirmation
- Lease signed notification
- Rent reminder
- New message notification

---

## 7. Layer 6: Infrastructure

### 7.1 Hosting Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE                                      │
│                    (CDN, DDoS Protection, SSL, Caching)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
        ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
        │    VERCEL     │  │   SUPABASE    │  │  CLOUDINARY   │
        │   (Frontend)  │  │   (Backend)   │  │   (Images)    │
        │  Next.js App  │  │  PostgreSQL   │  │   Optional    │
        │  Edge Runtime │  │  Auth/Storage │  │  Image CDN    │
        └───────────────┘  │  Realtime     │  └───────────────┘
                           └───────────────┘
```

### 7.2 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# M-Pesa
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=

# Agora
NEXT_PUBLIC_AGORA_APP_ID=
AGORA_APP_CERTIFICATE=

# Africa's Talking
AT_API_KEY=
AT_USERNAME=

# SendGrid
SENDGRID_API_KEY=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
```

### 7.3 Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local dev | localhost:3000 |
| Staging | Testing | staging.mitasafi.co.ke |
| Production | Live | app.mitasafi.co.ke |

---

## 8. Security Architecture

### 8.1 Security Layers

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         MITASAFI SECURITY LAYERS                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  LAYER 1: EDGE SECURITY (Cloudflare)                                         ║
║  DDoS Protection • WAF • Bot Detection • SSL/TLS • Rate Limiting             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  LAYER 2: APPLICATION SECURITY (Next.js)                                     ║
║  CSRF Protection • XSS Prevention • Input Validation • Secure Headers        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  LAYER 3: AUTHENTICATION (Supabase Auth)                                     ║
║  JWT Tokens • Session Management • MFA • OAuth • OTP                         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  LAYER 4: AUTHORIZATION (Row Level Security)                                 ║
║  RLS Policies • Role-based Access • Resource Ownership                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  LAYER 5: DATA SECURITY (PostgreSQL)                                         ║
║  Encryption at Rest • Encryption in Transit • Secure Backups                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 8.2 Authentication Security

**Password Policy:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Session Configuration:**
```typescript
const sessionConfig = {
  accessTokenLifetime: 3600,        // 1 hour
  refreshTokenLifetime: 604800,     // 7 days
  maxActiveSessions: 5,
  sessionIdleTimeout: 1800,         // 30 minutes
  rememberMeExtension: 2592000,     // 30 days
}
```

### 8.3 Rate Limiting

```typescript
const rateLimits = {
  auth: {
    login: { requests: 5, window: '15m' },
    register: { requests: 3, window: '1h' },
    passwordReset: { requests: 3, window: '1h' },
    otp: { requests: 3, window: '10m' },
  },
  api: {
    general: { requests: 100, window: '1m' },
    search: { requests: 30, window: '1m' },
    upload: { requests: 10, window: '1m' },
    payment: { requests: 5, window: '1m' },
  }
}
```

### 8.4 Row Level Security (RLS)

```sql
-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Anyone can view active properties
CREATE POLICY "View active properties" ON properties
  FOR SELECT USING (status = 'active' AND verified = true);

-- Landlords can only edit their own properties
CREATE POLICY "Landlords can edit own properties" ON properties
  FOR UPDATE USING (auth.uid() = landlord_id);

-- Users can view their own payments
CREATE POLICY "View own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view messages in their conversations
CREATE POLICY "View own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND auth.uid() = ANY(participants)
    )
  );
```

### 8.5 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Tenant** | properties:read, tenancies:view, payments:view, services:book |
| **Landlord** | properties:*, units:manage, tenancies:*, payments:view, reports:view |
| **Service Provider** | properties:read, services:provide, payments:view |
| **Admin** | All permissions |

### 8.6 Data Classification

| Classification | Examples | Storage | Access |
|---------------|----------|---------|--------|
| Critical | Passwords, payment tokens | Never stored | System only |
| Highly Sensitive | ID documents, KRA PIN | Encrypted, private | User + Admin |
| Sensitive | Phone, email, address | Database with RLS | User + relevant parties |
| Internal | Tenant scores, analytics | Database | System + Admin |
| Public | Property listings, reviews | Database | Everyone |

### 8.7 Security Headers

```javascript
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' }
]
```

---

## 9. Error Handling

### 9.1 Error Types Hierarchy

```typescript
// Base error class
class AppError extends Error {
  statusCode: number
  code: string
  isOperational: boolean
}

// Specific errors
class AuthenticationError extends AppError { }    // 401
class InvalidCredentialsError extends AppError { } // 401
class SessionExpiredError extends AppError { }     // 401
class ForbiddenError extends AppError { }          // 403
class NotFoundError extends AppError { }           // 404
class ValidationError extends AppError { }         // 400
class PaymentError extends AppError { }            // 402
class RateLimitError extends AppError { }          // 429
class ExternalServiceError extends AppError { }    // 503
```

### 9.2 Error Response Format

```typescript
// Success response
{
  success: true,
  data: { ... }
}

// Error response
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    errors: {
      'email': ['Invalid email format'],
      'phone': ['Phone number is required']
    }
  }
}
```

### 9.3 Client-Side Error Handling

| Error Code | User Action |
|------------|-------------|
| `VALIDATION_ERROR` | Show field-specific errors |
| `AUTHENTICATION_ERROR` | Redirect to login |
| `SESSION_EXPIRED` | Redirect to login |
| `FORBIDDEN` | Show permission denied message |
| `NOT_FOUND` | Show not found message |
| `RATE_LIMIT_EXCEEDED` | Show retry message with countdown |
| `PAYMENT_ERROR` | Show payment-specific message |
| `EXTERNAL_SERVICE_ERROR` | Show "try again" message |

### 9.4 Error Boundaries

React error boundaries catch component errors and display fallback UI instead of crashing the entire application.

---

## 10. Logging System

### 10.1 Log Levels

| Level | Use Case |
|-------|----------|
| DEBUG | Development debugging |
| INFO | Normal operations |
| WARN | Potential issues |
| ERROR | Errors that need attention |
| FATAL | Critical system failures |

### 10.2 Log Categories

| Category | Examples |
|----------|----------|
| AUTH | Login, logout, password reset |
| API | Request/response logging |
| DATABASE | Query performance, errors |
| PAYMENT | Transaction events |
| SECURITY | Security events, violations |
| PERFORMANCE | Slow queries, timeouts |
| BUSINESS | Property listed, booking created |
| SYSTEM | Startup, shutdown, health |

### 10.3 Log Entry Structure

```typescript
interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  userId?: string
  requestId?: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}
```

### 10.4 Security Event Logging

```typescript
// Events logged for security
logSecurityEvent.rateLimitHit(ip, endpoint)
logSecurityEvent.invalidToken(ip, endpoint)
logSecurityEvent.unauthorizedAccess(userId, resource)
logSecurityEvent.dataExport(userId, adminId)
logSecurityEvent.suspiciousActivity(userId, activity, ip)
```

### 10.5 Business Event Logging

```typescript
// Events logged for business analytics
logBusinessEvent.propertyListed(landlordId, propertyId)
logBusinessEvent.bookingCreated(tenantId, unitId)
logBusinessEvent.tenancyStarted(tenantId, unitId)
logBusinessEvent.serviceBooked(tenantId, providerId, service)
```

---

## 11. Audit Trail

### 11.1 Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id UUID REFERENCES profiles(id),
  user_role TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- What
  action TEXT NOT NULL,          -- CREATE, UPDATE, DELETE, VIEW, EXPORT
  resource_type TEXT NOT NULL,   -- property, payment, user, etc.
  resource_id UUID,
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  
  -- When
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.2 Audited Tables

Automatic audit triggers on:
- `payments`
- `tenancies`
- `verifications`
- `profiles` (sensitive fields)

---

## 12. Monitoring & Alerting

### 12.1 Monitoring Tools

| Service | Purpose |
|---------|---------|
| Sentry | Error tracking, performance monitoring |
| PostHog | Product analytics, user behavior |
| Vercel Analytics | Core Web Vitals |
| Supabase Dashboard | Database metrics |

### 12.2 Health Checks

```typescript
// GET /api/health
{
  status: 'healthy' | 'degraded',
  timestamp: '2025-12-30T10:00:00Z',
  checks: {
    database: { status: 'healthy', latency: 45 },
    cache: { status: 'healthy', latency: 5 }
  }
}
```

### 12.3 Alert Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| Error Rate High | error_rate > 5% over 5 min | Critical |
| Payment Failures | failures > 10 in 5 min | Critical |
| Login Failure Spike | failures > 50 in 5 min from same IP | High |
| Response Time High | p95 > 2000ms over 5 min | Medium |
| DB Connections High | connections > 80% of max | High |

---

## 13. Data Flow Diagrams

### 13.1 User Authentication Flow

```
User → Next.js → Supabase Auth → Google OAuth → Callback → Session Created
```

### 13.2 Payment Flow

```
Tenant → Frontend → Edge Function → M-Pesa STK Push → User Phone
                                                         ↓
Frontend ← Realtime ← Database ← Edge Function ← M-Pesa Callback
```

### 13.3 Property Listing Flow

```
Landlord → Form → Validation → Server Action → Database → Storage (images)
                                                   ↓
                              Search Index ← Real-time Update
```

---

## 14. Security Checklist

### Pre-Launch Security Review

**Authentication & Authorization:**
- [ ] Password policy enforced
- [ ] Rate limiting on auth endpoints
- [ ] Session timeout implemented
- [ ] OAuth configured correctly
- [ ] OTP expiry set (5 minutes)
- [ ] RLS policies on all tables
- [ ] Admin routes protected

**Data Security:**
- [ ] Sensitive data encrypted
- [ ] PII masked in logs
- [ ] File upload validation
- [ ] SQL injection prevented
- [ ] XSS prevention

**API Security:**
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] CSRF protection enabled
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all endpoints

**Infrastructure:**
- [ ] HTTPS enforced
- [ ] Environment variables secured
- [ ] Dependencies audited
- [ ] Cloudflare WAF configured
- [ ] Database backups enabled

**Monitoring:**
- [ ] Error tracking (Sentry)
- [ ] Audit logging enabled
- [ ] Security event logging
- [ ] Alerting configured
- [ ] Health checks implemented

---

**Document Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 30, 2025 | Team | Initial Architecture Document |

---

*This document defines the technical architecture for the Mitasafi platform.*
