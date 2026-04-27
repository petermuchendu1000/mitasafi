# M1 Customer Booking Request Flow — Comprehensive Research Report

> **Generated:** 2026-03-01  
> **Purpose:** Pre-implementation research for M1 milestone  
> **Status:** Research only — no code written

---

## Table of Contents

1. [Database Schemas (Exact SQL)](#1-database-schemas)
2. [Enum Values](#2-enum-values)
3. [Existing Booking Code](#3-existing-booking-code)
4. [Provider Detail Page Structure](#4-provider-detail-page-structure)
5. [Auth & Supabase Patterns](#5-auth--supabase-patterns)
6. [Dashboard Structure](#6-dashboard-structure)
7. [Notification Patterns](#7-notification-patterns)
8. [Storage Buckets](#8-storage-buckets)
9. [UI Patterns](#9-ui-patterns)
10. [Relevant Constants](#10-relevant-constants)
11. [Generated Type Definitions](#11-generated-type-definitions)
12. [Gotchas & Inconsistencies](#12-gotchas--inconsistencies)

---

## 1. Database Schemas

### 1a. `bookings` Table

**Source:** `supabase/migrations/20260108120003_booking_core.sql`

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  customer_id uuid NOT NULL,  -- Links to users
  provider_id uuid REFERENCES service_providers(id) ON DELETE RESTRICT,  -- NULL until accepted
  
  -- Service
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  service_type_id uuid NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
  booking_flow_type booking_flow_type NOT NULL,
  
  -- Status
  status booking_status DEFAULT 'draft',
  
  -- Pricing
  quoted_price decimal(10,2),
  agreed_price decimal(10,2),
  currency text DEFAULT 'KES',
  
  -- Timing
  requested_at timestamptz,
  provider_viewed_at timestamptz,
  provider_responded_at timestamptz,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  completed_at timestamptz,
  
  -- Payment
  payment_status text DEFAULT 'pending',  -- 'pending', 'paid', 'refunded', 'disputed'
  payment_method text,  -- 'mpesa', 'card', 'cash'
  payment_ref text,
  
  -- Notes
  customer_notes text,
  provider_notes text,
  cancellation_reason text,
  
  -- Metadata
  metadata jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- CHECK Constraints
  CONSTRAINT booking_price_logic CHECK (
    (quoted_price IS NULL) OR (quoted_price > 0)
  ),
  CONSTRAINT booking_agreed_price_positive CHECK (
    (agreed_price IS NULL) OR (agreed_price > 0)
  ),
  CONSTRAINT booking_time_logic CHECK (
    (scheduled_end IS NULL) OR (scheduled_start IS NULL) OR (scheduled_end > scheduled_start)
  ),
  CONSTRAINT booking_actual_time_logic CHECK (
    (actual_end IS NULL) OR (actual_start IS NULL) OR (actual_end > actual_start)
  )
);
```

**Foreign Keys:**
- `provider_id` → `service_providers(id)` ON DELETE RESTRICT (nullable — NULL until provider accepts)
- `service_id` → `services(id)` ON DELETE RESTRICT
- `service_type_id` → `service_types(id)` ON DELETE RESTRICT
- `customer_id` — NOT NULL but **NO FK constraint defined** (links to auth.users implicitly)

**Indexes:**
- `idx_bookings_customer_id` on `(customer_id)`
- `idx_bookings_provider_id` on `(provider_id)`
- `idx_bookings_service_id` on `(service_id)`
- `idx_bookings_service_type_id` on `(service_type_id)`
- `idx_bookings_booking_flow_type` on `(booking_flow_type)`
- `idx_bookings_status` on `(status)`
- `idx_bookings_payment_status` on `(payment_status)`
- `idx_bookings_created_at` on `(created_at DESC)`
- `idx_bookings_scheduled_start` on `(scheduled_start)` WHERE scheduled_start IS NOT NULL
- `idx_bookings_customer_status` on `(customer_id, status)` — compound
- `idx_bookings_provider_status` on `(provider_id, status)` WHERE provider_id IS NOT NULL — compound
- `idx_bookings_provider_pending` on `(provider_id, status)` WHERE provider_id IS NOT NULL AND status IN ('submitted', 'provider_viewed')

**Trigger:** `update_bookings_updated_at` → `update_updated_at()`

---

### 1b. `booking_status_history` Table

**Source:** `supabase/migrations/20260108120003_booking_core.sql`

```sql
CREATE TABLE IF NOT EXISTS booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  from_status booking_status,
  to_status booking_status NOT NULL,
  
  changed_by uuid NOT NULL,
  changed_by_role text NOT NULL,  -- 'customer', 'provider', 'admin'
  
  reason text,
  notes text,
  
  created_at timestamptz DEFAULT now()
);
```

**Foreign Keys:** `booking_id` → `bookings(id)` ON DELETE CASCADE  
**Indexes:** `(booking_id)`, `(created_at DESC)`

---

### 1c. `booking_media` Table

**Source:** `supabase/migrations/20260108120003_booking_core.sql`

```sql
CREATE TABLE IF NOT EXISTS booking_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  uploaded_by uuid NOT NULL,
  uploaded_by_role text NOT NULL,  -- 'customer', 'provider'
  
  media_type text NOT NULL,       -- 'photo', 'video', 'document'
  media_url text NOT NULL,
  
  caption text,
  
  stage text NOT NULL,             -- 'before', 'during', 'after', 'proof', 'issue'
  
  created_at timestamptz DEFAULT now()
);
```

**Foreign Keys:** `booking_id` → `bookings(id)` ON DELETE CASCADE  
**Indexes:** `(booking_id)`, `(stage)`, `(uploaded_by)`

---

### 1d. `locations` Table

**Source:** `supabase/migrations/20260108120003_booking_core.sql`

```sql
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid,
  
  -- Address
  address_line1 text NOT NULL,
  address_line2 text,
  area text,                     -- 'Westlands', 'Kilimani'
  city text DEFAULT 'Nairobi',
  county text,
  country text DEFAULT 'Kenya',
  postal_code text,
  
  -- Coordinates
  latitude decimal(10,8),
  longitude decimal(11,8),
  
  -- Access
  access_notes text,
  
  -- Type
  location_type location_type,   -- ENUM: 'home', 'office', 'public_place', 'in_vehicle', 'other'
  
  -- Saved location
  is_saved boolean DEFAULT false,
  label text,                    -- 'Home', 'Office', etc.
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Foreign Keys:** None explicitly (user_id has no FK constraint)  
**Indexes:** `(user_id)` WHERE is_saved = true, `(latitude, longitude)` WHERE latitude IS NOT NULL, `(area)`

**Note:** The `locations` table has NO FK linking it to `bookings`. The booking-location association must be handled via `bookings.metadata` jsonb or a join table. This is a gap.

---

### 1e. `notifications` Table

**Source:** `supabase/migrations/20260108120005_support_tables.sql` (canonical version)

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id uuid NOT NULL,
  user_role text NOT NULL,          -- 'customer', 'provider', 'admin'
  
  -- Content
  type text NOT NULL,                -- 'booking_new', 'booking_accepted', 'message_new', 'review_new', etc.
  title text NOT NULL,
  message text NOT NULL,
  
  -- Related entities
  booking_id uuid,
  provider_id uuid,
  review_id uuid,
  
  -- Deep link
  action_url text,
  
  -- Delivery channels
  in_app boolean DEFAULT true,
  email boolean DEFAULT false,
  sms boolean DEFAULT false,
  
  -- Status
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  -- Delivery status
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  sms_sent boolean DEFAULT false,
  sms_sent_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT notification_has_entity CHECK (
    booking_id IS NOT NULL OR 
    provider_id IS NOT NULL OR 
    review_id IS NOT NULL OR
    type IN ('system_announcement', 'account_update')
  )
);
```

**Indexes:** `(user_id)`, `(user_id, is_read)` WHERE is_read = false, `(booking_id)`, `(type)`, `(created_at DESC)`

---

### 1f. `services` Table

**Source:** `supabase/migrations/20260108120001_discovery_layer.sql`

```sql
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  subcategory_id uuid REFERENCES service_subcategories(id) ON DELETE SET NULL,
  service_type_id uuid NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
  
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  short_description text,
  
  is_active boolean DEFAULT true,
  requires_site_visit boolean DEFAULT false,
  
  meta_title text,
  meta_description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT services_name_unique_per_category UNIQUE(category_id, name)
);
```

**Foreign Keys:**
- `category_id` → `service_categories(id)` ON DELETE RESTRICT
- `subcategory_id` → `service_subcategories(id)` ON DELETE SET NULL
- `service_type_id` → `service_types(id)` ON DELETE RESTRICT

---

### 1g. `service_types` Table

**Source:** `supabase/migrations/20260108120001_discovery_layer.sql`

```sql
CREATE TABLE IF NOT EXISTS service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,        -- 'emergency_repair', 'standard_repair', etc.
  name text NOT NULL,
  booking_flow booking_flow_type NOT NULL,
  description text,
  risk_level int CHECK (risk_level BETWEEN 1 AND 5),
  trust_level int CHECK (trust_level BETWEEN 1 AND 5),
  requires_quote boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key:** `service_types.booking_flow` is the column that maps to `booking_flow_type` enum. The booking form must resolve `service_type_id` → `booking_flow` → set `bookings.booking_flow_type`.

---

### 1h. `booking_quotes` Table (supporting)

**Source:** `supabase/migrations/20260108120003_booking_core.sql`

```sql
CREATE TABLE IF NOT EXISTS booking_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  quoted_price decimal(10,2) NOT NULL CHECK (quoted_price > 0),
  currency text DEFAULT 'KES',
  
  breakdown jsonb,
  description text,
  
  validity_days int DEFAULT 7,
  valid_until timestamptz,
  
  status text DEFAULT 'sent',  -- 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  customer_response text,
  
  sent_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  responded_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT quote_one_per_provider UNIQUE(booking_id, provider_id)
);
```

---

### 1i. `booking_messages` Table (supporting)

```sql
CREATE TABLE IF NOT EXISTS booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  sender_id uuid NOT NULL,
  sender_role text NOT NULL,  -- 'customer', 'provider', 'admin'
  
  message text NOT NULL,
  
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);
```

---

### 1j. `booking_disputes` Table (supporting)

```sql
CREATE TABLE IF NOT EXISTS booking_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  reported_by uuid NOT NULL,
  reported_by_role text NOT NULL,
  
  dispute_type text NOT NULL,  -- 'quality', 'pricing', 'cancellation', 'safety', 'damage', 'no_show'
  severity dispute_severity DEFAULT 'medium',
  
  description text NOT NULL,
  evidence_urls jsonb,
  
  status text DEFAULT 'open',  -- 'open', 'investigating', 'resolved', 'closed'
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  
  refund_amount decimal(10,2),
  refund_status text,  -- 'pending', 'approved', 'rejected', 'processed'
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 2. Enum Values

### 2a. `booking_flow_type` (5 values)

**Source:** `20260108120000_core_enums_and_types.sql`

```
'emergency'    -- Immediate response, damage risk, unknown pricing
'standard'     -- Scheduled work with known scope (includes recurring)
'delivery'     -- Pickup/dropoff with quantity tracking
'project'      -- Large scope, quote-based, site visit likely
'personal'     -- Human-to-human, trust-critical, preference-sensitive
```

### 2b. `booking_status` (15 values)

```
'draft'              -- Customer creating booking
'submitted'          -- Sent to provider
'provider_viewed'    -- Provider opened it
'quote_pending'      -- Provider needs to quote (project/quote_only services)
'quote_sent'         -- Provider sent quote, awaiting customer
'quote_accepted'     -- Customer accepted quote
'quote_rejected'     -- Customer rejected quote
'confirmed'          -- Both parties agreed (or provider accepted non-quote)
'in_progress'        -- Work started
'completed'          -- Work finished
'customer_confirmed' -- Customer confirmed completion
'cancelled_customer' -- Customer cancelled
'cancelled_provider' -- Provider cancelled
'disputed'           -- Issue raised
'resolved'           -- Dispute resolved
```

### 2c. `location_type` (5 values)

```
'home', 'office', 'public_place', 'in_vehicle', 'other'
```

### 2d. `pricing_type` (6 values)

```
'fixed', 'starting_from', 'per_unit', 'quote_only', 'hourly', 'daily'
```

### 2e. `damage_risk_level` (4 values)

```
'low', 'medium', 'high', 'critical'
```

### 2f. `property_type` (9 values)

```
'apartment', 'house', 'townhouse', 'villa', 'office', 'commercial', 'warehouse', 'land', 'other'
```

### 2g. `dispute_severity` (3 values)

```
'low', 'medium', 'high'
```

### 2h. `verification_level` (4 values)

```
'basic', 'standard', 'certified', 'background_checked'
```

### 2i. `verification_status` (5 values)

```
'not_started', 'pending', 'verified', 'rejected', 'expired'
```

---

## 3. Existing Booking Code

### 3a. Types (`src/types/service-providers.ts`)

The existing type system maps to **legacy table names** from a pre-migration DB:

- `ServiceJob` → maps to `service_jobs` in generated types (legacy). Comment says: *"The canonical migration table is `bookings`. Queries should use `from("bookings")`. Currently unused in application code."*
- `ServiceJobQuote` → maps to `service_job_quotes` (legacy). Canonical = `booking_quotes`.
- `ServiceJobMessage` → maps to `service_job_messages` (legacy). Canonical = `booking_messages`.

**There are NO types defined for the canonical `bookings`, `booking_status_history`, `booking_media`, or `locations` tables.**

### 3b. Server Actions

**No booking-related server actions exist.** No files in `src/app/dashboard/` handle booking creation.

### 3c. API Routes

No booking API routes found. The API structure under `src/app/api/services/` contains:
- `categories/`
- `jobs/`
- `providers/`
- `saved/`
- `search/`

The `jobs/` folder likely maps to the legacy `service_jobs` table. Worth checking but it's not the canonical booking flow.

### 3d. Components

**No booking-specific components exist.** Under `src/components/services/`:
- `ProviderCard.tsx` — has "Book Now" button text and `instant_booking` logic
- `CompareProviders.tsx` — shows "Instant Booking" comparison row
- Various filter and display components

No booking form, booking wizard, or booking confirmation components.

### 3e. Cache Queries (Provider Dashboard)

`src/lib/cache/queries.ts` already queries the canonical `bookings` table:
- `getCachedDashboardStats()` — queries `from('bookings')` for active jobs, earnings, completed jobs counts
- `getCachedRecentJobs()` — queries `from('bookings')` with service join for provider dashboard feed
- These use `status`, `provider_id`, `agreed_price`, `completed_at`, `scheduled_start`, `customer_notes`

**This confirms the `bookings` table is already live and being queried.**

---

## 4. Provider Detail Page Structure

**File:** `src/app/services/provider/[id]/page.tsx` (669 lines)

### 4a. Component Structure

Server component that fetches provider data via:
```typescript
const [providerResult, reviewsResult, similarProviders, supabase] = await Promise.all([
  getProviderById(id),
  getProviderReviews(id, 1, 6),
  getSimilarProviders(id, 4),
  createClient(),
]);
```

### 4b. Services Rendering

Services are displayed in the **"Services & pricing"** section. The data flow:

```typescript
const servicesWithPricing = (provider.services || [])
  .filter((ps) => ps.is_active)
  .map((ps) => {
    const cp = psAny.custom_pricing as Record<string, unknown> | null;
    return {
      id: ps.id,                    // provider_services.id
      name: ps.service?.name,       // the service name from services table
      category: ps.service?.subcategory?.category?.name,
      subcategory: ps.service?.subcategory?.name,
      priceType: cp?.type || "fixed",
      price: cp?.amount || null,
      description: cp?.description || ps.service?.description,
    };
  });
```

Each service is rendered as a simple row:
```tsx
<div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
  <div className="min-w-0">
    <p className="text-sm font-medium text-gray-900">{service.name}</p>
    <p className="text-xs text-gray-400">{service.category} · {service.subcategory}</p>
  </div>
  <div className="text-right flex-shrink-0 ml-4">
    {/* price display */}
  </div>
</div>
```

### 4c. Available Data Per Service Card

- `service.id` — **This is `provider_services.id`**, NOT `services.id`. You'll need the `service_id` from `provider_services` for the booking.
- `service.name` — Service name
- `service.priceType` — From `custom_pricing.type`
- `service.price` — From `custom_pricing.amount`
- `service.category` / `service.subcategory`
- Provider ID available as `provider.id` at page level

### 4d. Where "Request Service" Button Should Go

Three locations:

1. **Per service row** — Add a button/link at the end of each service row in "Services & pricing" section
2. **Sidebar contact card** — Currently has "Message on WhatsApp" / "Call provider" / "Request a quote" buttons. Replace/augment with "Request Service"
3. **Mobile CTA bar** — Fixed bar at bottom currently shows "Contact" / "Call" / "Get quote"

### 4e. Current Contact Buttons (sidebar)

```tsx
{whatsappUrl && (
  <a href={whatsappUrl} className="...bg-teal-600 text-white...">Message on WhatsApp</a>
)}
{phoneUrl && (
  <a href={phoneUrl} className="...border border-gray-900...">Call provider</a>
)}
{!whatsappUrl && !phoneUrl && (
  <button className="...bg-teal-600 text-white...">Request a quote</button>
)}
```

### 4f. Current User Check

The page already checks if the current user is the provider:
```typescript
const { data: { user } } = await supabase.auth.getUser();
const isOwnProfile = !!(user && providerAny.user_id === user.id);
```

This is useful — don't show "Request Service" if `isOwnProfile`.

---

## 5. Auth & Supabase Patterns

### 5a. Server Client (`src/lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { ... }, setAll(cookiesToSet) { ... } } }
  )
}
```

### 5b. Admin Client (`src/lib/supabase/admin.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function getAdminClient() { /* singleton pattern */ }
```

### 5c. Server Action Pattern (from `src/app/dashboard/provider/profile/actions.ts`)

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
import { revalidatePath } from "next/cache";

// Helper for tables not in generated types:
const asDb = (client: any) => client;

// Auth pattern in actions:
export async function someAction() {
  const { user, error } = await getCachedUser();
  if (error || !user) return { error: "Not authenticated" };

  const supabase = await createClient();
  // ... supabase operations
  revalidatePath("/dashboard/provider");
}
```

### 5d. Cache Layer (`src/lib/cache/queries.ts`)

- `getCachedUser()` — React `cache()` wrapped auth call
- `getCachedProviderId()` — lightweight provider lookup
- `getProviderWithProfile()` — combined provider + profile + roles
- `getCachedDashboardStats()` — dashboard stats with booking queries
- `getCachedRecentJobs()` — recent jobs from bookings table
- `getCachedUnreadNotifications()` — unread notification count

All use `const supabase = await createClient()` inside cache functions.

---

## 6. Dashboard Structure

### 6a. Route Structure

```
src/app/dashboard/
├── page.tsx                    # Role router (redirects to landlord/provider/tenant)
├── inquiries/
├── landlord/
├── notifications/
│   ├── page.tsx
│   └── NotificationsPageClient.tsx
├── provider/
│   ├── layout.tsx              # Provider-specific layout with auth/role check
│   ├── page.tsx                # Provider dashboard home
│   ├── ProviderDashboardShell.tsx  # Client sidebar/header shell
│   ├── SocialTrafficCard.tsx
│   ├── availability/
│   ├── profile/
│   ├── services/
│   │   ├── page.tsx
│   │   ├── actions.ts
│   │   ├── new/               # Service wizard
│   │   │   ├── page.tsx
│   │   │   ├── context.tsx
│   │   │   ├── types.ts
│   │   │   ├── ServiceWizardContent.tsx
│   │   │   └── steps/
│   │   └── [id]/
│   └── settings/
├── searches/
└── verify-provider/
```

### 6b. No Customer Dashboard

**There is NO customer/tenant dashboard route group.** The main `dashboard/page.tsx` redirects:
- `landlord` → `/dashboard/landlord`
- `service_provider` → `/dashboard/provider`
- `tenant` → Shows a placeholder (commented out redirect: `// redirect("/dashboard/tenant")`)

**M1 will need to create the customer dashboard or at minimum a bookings page route.**

### 6c. Provider Dashboard Sidebar Nav

From `ProviderDashboardShell.tsx`:

```typescript
const navItems = [
  { label: "Dashboard",    href: "/dashboard/provider",              icon: LayoutDashboard },
  { label: "Jobs",         href: "/dashboard/provider/jobs",         icon: Briefcase, comingSoon: true },
  { label: "My Services",  href: "/dashboard/provider/services",     icon: Wrench },
  { label: "Earnings",     href: "/dashboard/provider/earnings",     icon: DollarSign, comingSoon: true },
  { label: "Reviews",      href: "/dashboard/provider/reviews",      icon: Star, comingSoon: true },
  { label: "Availability", href: "/dashboard/provider/availability", icon: Calendar },
  { label: "Quotes",       href: "/dashboard/provider/quotes",       icon: FileText, comingSoon: true },
];
```

Several items are `comingSoon: true` (Jobs, Earnings, Reviews, Quotes).

### 6d. Provider Layout Auth Pattern

`src/app/dashboard/provider/layout.tsx` checks:
1. Authentication via `getCachedUser()`
2. Provider profile exists via `getProviderWithProfile()`
3. Has `service_provider` role
4. Has `business_type` set (else redirect to onboarding)
5. Checks verification status
6. Checks unread notifications
7. Wraps children in `<ProviderDashboardShell profile={profile}>`

---

## 7. Notification Patterns

### 7a. Database Notifications (`notifications` table)

The migration defines a proper notifications table (see Section 1e). It supports:
- Multiple channels: `in_app`, `email`, `sms`
- Entity linking: `booking_id`, `provider_id`, `review_id`
- Deep links: `action_url`
- Read tracking: `is_read`, `read_at`
- Type-based routing: `type` field (e.g., `'booking_new'`, `'booking_accepted'`)

### 7b. Notification API Route (`src/app/api/notifications/route.ts`)

Full CRUD API:
- **GET** `/api/notifications` — fetch user notifications (supports `?unread=true&limit=50`)
- **PATCH** `/api/notifications` — mark as read (single or all)
- **DELETE** `/api/notifications` — delete read notifications or specific one

Uses `(supabase as any)` cast because the generated types don't match the canonical migration schema.

### 7c. Client-Side Notifications (`src/lib/notifications.ts`)

Currently localStorage-based for listing status changes only. Not suitable for booking notifications.

### 7d. How to INSERT notifications

**No existing code inserts into the `notifications` table.** The API route only reads/updates/deletes. Notification creation for bookings will need to be implemented — likely in the booking server action using `createAdminClient()` to bypass RLS.

### 7e. Unread Check

`getCachedUnreadNotifications(userId)` in `src/lib/cache/queries.ts` already queries the notifications table:
```typescript
const { count } = await (supabase as any)
  .from('notifications')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .is('read_at', null);
```

### 7f. Notification Dashboard Page

`src/app/dashboard/notifications/page.tsx` exists with a client component `NotificationsPageClient.tsx`.

---

## 8. Storage Buckets

**Source:** `supabase/migrations/20260101000004_storage_setup.sql`

### Existing Buckets:

| Bucket | Public | Size Limit | MIME Types |
|--------|--------|------------|------------|
| `property-photos` | Yes | 5MB | jpeg, png, webp |
| `avatars` | Yes | 2MB | jpeg, png, webp |
| `documents` | No (private) | 10MB | pdf, jpeg, png |

### Missing: Booking Media Bucket

**There is NO `booking-media` or `booking-photos` storage bucket.** The `booking_media` table stores `media_url`, but no bucket has been created for uploads. M1 will need a new migration to create this bucket with appropriate RLS.

**Suggested bucket config:**
- Name: `booking-media`
- Public: false (private — only participants can view)
- Size limit: 5MB
- MIME types: `image/jpeg`, `image/png`, `image/webp`, `video/mp4` (if video is needed)
- RLS: Customer can upload to `bookings/{booking_id}/{user_id}/`, both customer and provider can read

---

## 9. UI Patterns

### 9a. UI Library

From `package.json`:
- **Tailwind CSS** (`tailwindcss: ^3.4.17`) — primary styling
- **Radix UI** (`@radix-ui/react-slot`) — only Slot imported (used by CVA Button)
- **class-variance-authority** (`cva: ^0.7.1`) — for variant-based component styling
- **Lucide React** (`lucide-react: ^0.468.0`) — icons
- **Framer Motion** (`framer-motion: ^11.15.0`) — animations
- **Sonner** (`sonner: ^1.7.1`) — toast notifications
- **clsx** + **tailwind-merge** — class utilities

**NOT using shadcn/ui as a package** — but custom components may follow similar patterns.

### 9b. Custom UI Components (`src/components/ui/`)

```
Badge.tsx
Button.tsx
Card.tsx
Container.tsx
Logo.tsx
NotificationBell.tsx
Section.tsx
SocialIcons.tsx
SuccessModal.tsx
Toast.tsx
index.ts
```

### 9c. Form Library

- **React Hook Form** (`react-hook-form: ^7.54.2`) — installed but **not currently used anywhere in src/**
- **Zod** (`zod: ^3.24.1`) — installed but no `zodResolver` usage found

The service wizard uses a **custom Context + useReducer + Immer** pattern instead of React Hook Form:

```typescript
// src/app/dashboard/provider/services/new/context.tsx
import { produce } from "immer";

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  return produce(state, (draft) => {
    switch (action.type) { /* ... */ }
  });
}
```

### 9d. Step-by-Step Wizard Pattern

From the service wizard (`src/app/dashboard/provider/services/new/`):

1. **`types.ts`** — defines `WIZARD_STEPS`, `TOTAL_STEPS`, state types, validation
2. **`context.tsx`** — React Context + `useReducer` with Immer for immutable updates
3. **`ServiceWizardContent.tsx`** — client component that renders step navigation + content
4. **`steps/Step1Category.tsx` through `Step6Review.tsx`** — individual step components
5. **`../actions.ts`** — server action for form submission

Pattern:
- Steps rendered via switch statement in content component
- Forward/back navigation with `canProceed()` validation
- Final step calls server action via `startTransition()`
- `useRouter().push()` for redirect on success

### 9e. Button Styles

Provider page uses two button patterns:
- **Primary:** `bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700`
- **Secondary:** `border border-gray-900 text-gray-900 font-semibold text-sm rounded-lg hover:bg-gray-50`

---

## 10. Relevant Constants

### 10a. Job Status Config (`src/lib/constants/index.ts`)

```typescript
export const JOB_STATUS_CONFIG: Record<JobStatus, JobStatusConfig> = {
  pending:     { label: "Pending",     color: "text-yellow-700", bgColor: "bg-yellow-100", ... },
  quoted:      { label: "Quoted",      color: "text-blue-700",   bgColor: "bg-blue-100",   ... },
  accepted:    { label: "Accepted",    color: "text-indigo-700", bgColor: "bg-indigo-100",  ... },
  scheduled:   { label: "Scheduled",   color: "text-purple-700", bgColor: "bg-purple-100",  ... },
  in_progress: { label: "In Progress", color: "text-cyan-700",   bgColor: "bg-cyan-100",    ... },
  completed:   { label: "Completed",   color: "text-green-700",  bgColor: "bg-green-100",   ... },
  cancelled:   { label: "Cancelled",   color: "text-gray-700",   bgColor: "bg-gray-100",    ... },
  disputed:    { label: "Disputed",    color: "text-red-700",    bgColor: "bg-red-100",     ... },
};
```

**This is a LEGACY status set** (8 values) that doesn't match the canonical `booking_status` enum (15 values). M1 will need to create a new `BOOKING_STATUS_CONFIG` constant that covers all 15 values.

### 10b. Price Type Labels

```typescript
export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: "",
  hourly: "/hr",
  per_sqm: "/sqm",
  quote_only: "",
};
```

### 10c. Service Categories

8 major categories defined with icons, colors, and DB category ID mappings. Used for category display in the booking form.

### 10d. Missing Constants for M1

Need to create:
- `BOOKING_STATUS_CONFIG` — all 15 statuses with labels, colors, descriptions
- `BOOKING_FLOW_TYPE_CONFIG` — 5 flow types with labels and descriptions
- `BOOKING_FLOW_LABELS` — human-readable flow type names

---

## 11. Generated Type Definitions

### 11a. Generated Types vs Canonical Schema — MISMATCH

**Critical finding:** The `src/types/database.ts` generated types reflect the **legacy live database**, NOT the canonical migration schema. The generated types contain:

- `service_jobs` table (legacy) — NOT `bookings`
- `service_job_quotes` table (legacy) — NOT `booking_quotes`
- `service_job_messages` table (legacy) — NOT `booking_messages`
- Old `notifications` schema (entity_id/entity_type pattern) — NOT the canonical schema with booking_id/provider_id/review_id columns

### 11b. `notifications` in Generated Types (STALE)

```typescript
notifications: {
  Row: {
    created_at: string | null
    entity_id: string | null
    entity_type: string | null
    expires_at: string | null
    id: string
    message: string | null
    metadata: Json | null
    read_at: string | null
    title: string
    type: string
    user_id: string
  }
  // ...
}
```

This has `entity_id`/`entity_type` instead of `booking_id`/`provider_id`/`review_id`. It also lacks `user_role`, `action_url`, `in_app`, `email`, `sms`, `is_read`, delivery status columns.

### 11c. `service_jobs` in Generated Types (Legacy Booking)

```typescript
service_jobs: {
  Row: {
    id: string
    client_id: string
    provider_id: string | null
    category_id: string
    subcategory_id: string | null
    service_id: string | null
    title: string
    description: string
    address: string
    area: string
    status: Database["public"]["Enums"]["job_status"] | null
    priority: Database["public"]["Enums"]["job_priority"] | null
    // ... many more fields
  }
}
```

### 11d. Enums in Generated Types (LEGACY)

```typescript
Enums: {
  job_priority: "low" | "normal" | "urgent" | "emergency"
  job_status: "pending" | "quoted" | "accepted" | "scheduled" | "in_progress" | "completed" | "cancelled" | "disputed"
  provider_status: "pending" | "active" | "suspended" | "inactive"
  provider_tier: "free" | "premium" | "enterprise"
  provider_type: "individual" | "company"
  service_payment_status: "pending" | "escrow" | "released" | "refunded" | "disputed"
  verification_status: "pending" | "submitted" | "verified" | "rejected" | "expired"
}
```

**Missing from generated types:**
- `booking_flow_type` enum
- `booking_status` enum
- `pricing_type` enum
- `location_type` enum
- `damage_risk_level` enum
- `property_type` enum
- `dispute_severity` enum
- `review_rating` enum
- `pricing_component_type` enum
- `verification_level` enum (different from `verification_status`)

### 11e. Tables NOT in Generated Types

The following canonical tables exist in migrations but NOT in generated types:
- `bookings`
- `booking_status_history`
- `booking_media`
- `booking_messages`
- `booking_quotes`
- `booking_disputes`
- `locations`
- `service_types` (the canonical version)
- `service_capabilities`
- `service_pricing`
- `service_pricing_components`
- `service_verification_requirements`
- `reviews` (canonical — `provider_reviews` exists in generated types as legacy)

---

## 12. Gotchas & Inconsistencies

### 12a. **CRITICAL: Generated Types Don't Match Canonical Schema**

The `database.ts` types were generated against the legacy DB state. The canonical migration tables (`bookings`, `booking_status_history`, `locations`, etc.) are NOT represented. The app works around this with `(supabase as any)` casts and manual type definitions.

**Impact on M1:** You cannot use `supabase.from('bookings')` with type safety. You must either:
1. Regenerate types after running all migrations (`npm run db:gen-types`)
2. Define manual TypeScript interfaces and use `as any` casts
3. Use the `asDb()` helper pattern from profile actions

### 12b. **`customer_id` Has No FK Constraint**

The `bookings.customer_id` is `uuid NOT NULL` but has no `REFERENCES` constraint linking it to `auth.users` or `profiles`. This means:
- No cascade behavior on user deletion
- No DB-level referential integrity check
- RLS policies must enforce this manually

### 12c. **`locations` Table Not Linked to `bookings`**

There is no `location_id` column on `bookings` and no join table. The intended approach is likely to use `bookings.metadata` jsonb field to store location data, or to create a `booking_locations` join table. Alternatively, the location could be inlined into the booking.

### 12d. **Storage Bucket Missing for Booking Media**

No `booking-media` bucket exists. Must create before media uploads work.

### 12e. **Two Notification Systems**

1. **Client-side:** `src/lib/notifications.ts` — localStorage-based, for listing changes only
2. **Server-side:** `notifications` table + `/api/notifications` route — for in-app/email/SMS

Booking notifications should use the server-side system exclusively.

### 12f. **No Customer Dashboard Route**

The tenant/customer dashboard is a placeholder. Booking management requires at minimum:
- `/dashboard/bookings` route
- `/dashboard/bookings/[id]` booking detail route

### 12g. **Legacy `service_jobs` Table Still Active**

The `service_jobs` table exists in the live DB alongside the canonical `bookings` table. The cache queries already use `from('bookings')`, but the generated types only know about `service_jobs`. This duality will cause confusion.

### 12h. **Provider ID Resolution**

On the provider detail page, `provider_id` refers to `service_providers.id`. When creating a booking for a specific provider:
- `bookings.provider_id` = `service_providers.id` (set at booking creation since customer chose the provider)
- **However**, the schema comment says `provider_id` is *"NULL until provider accepts/responds"*

This creates a design question: Should M1 set `provider_id` immediately when the customer requests from a specific provider's page? The answer should be **yes** — set it at creation time since the customer explicitly chose this provider. The "NULL until accepted" pattern applies more to marketplace/broadcast bookings.

### 12i. **Service ID vs Provider Service ID**

The provider page exposes `provider_services.id` as `service.id`. But `bookings.service_id` references `services.id` (the canonical service). The booking form must resolve the correct `services.id` from the `provider_services` relationship, as well as `service_type_id` from the service definition.

### 12j. **Wizard Pattern Does Not Use React Hook Form**

Despite having `react-hook-form` and `zod` installed, the existing wizard uses Context + useReducer + Immer. M1 can go either way but should be consistent with codebase patterns.

### 12k. **`asDb` Helper Pattern**

For tables not in generated types:
```typescript
const asDb = (client: any) => client;
```
Used in profile actions to bypass TypeScript errors. All booking queries will need this until types are regenerated.

### 12l. **`booking_flow_type` on `service_types` Table Uses Column Name `booking_flow`**

The `service_types` table has a column called `booking_flow` (not `booking_flow_type`), but the enum type is `booking_flow_type`. The `bookings` table uses `booking_flow_type` as the column name. When inserting a booking, you'll need to look up `service_types.booking_flow` to set `bookings.booking_flow_type`.

---

## Summary: What M1 Implementation Needs

1. **New types:** Manual TS interfaces for `bookings`, `booking_status_history`, `booking_media`, `locations` (or regenerate DB types)
2. **New constants:** `BOOKING_STATUS_CONFIG` covering all 15 statuses
3. **New server action:** `createBookingRequest()` in a new file
4. **New migration:** Storage bucket for booking media
5. **New route:** Customer booking pages (at minimum a creation flow)
6. **Provider page modification:** Add "Request Service" button to service rows and contact card
7. **Notification insertion:** Server-side notification creation on booking submission
8. **Location handling:** Decide on inline metadata vs separate location record
9. **Customer dashboard:** At minimum a bookings list page

---

*End of research report.*
