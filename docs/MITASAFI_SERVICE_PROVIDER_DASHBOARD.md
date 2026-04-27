# MitaSafi Service Provider Dashboard

## Overview

The MitaSafi Service Provider Dashboard is designed for **fundis** (skilled tradespeople), cleaners, movers, and other service professionals in Kenya's rental ecosystem. This document provides comprehensive documentation of all features, their architecture, and implementation status.

**Target Users**: Plumbers, electricians, cleaners, movers, painters, carpenters, HVAC technicians, security installers, pet care providers, and other skilled service professionals.

---

## Table of Contents

1. [Dashboard Architecture](#1-dashboard-architecture)
2. [Dashboard Home](#2-dashboard-home-overview)
3. [Jobs Management](#3-jobs-management)
4. [My Services Management](#4-my-services-management)
5. [Earnings Dashboard](#5-earnings-dashboard)
6. [Reviews & Reputation](#6-reviews--reputation)
7. [Availability Management](#7-availability-management)
8. [Quotes Management](#8-quotes-management)
9. [Provider Profile](#9-provider-profile)
10. [Verification System](#10-verification-system)
11. [Tier System](#11-tier-system)
12. [Messaging System](#12-messaging-system)
13. [Saved Providers](#13-saved-providers-client-feature)
14. [Database Schema](#14-database-schema)
15. [API Reference](#15-api-reference)
16. [Implementation Status](#16-implementation-status)

---

## 1. Dashboard Architecture

### File Structure

```
src/
├── app/
│   └── dashboard/
│       └── provider/
│           ├── layout.tsx              # Server component - auth & role check
│           ├── page.tsx                # Main dashboard page
│           ├── ProviderDashboardShell.tsx  # Client component - UI shell
│           ├── jobs/                   # 🚧 Stub
│           ├── services/               # 🚧 Stub
│           ├── earnings/               # 🚧 Stub
│           ├── reviews/                # 🚧 Stub
│           ├── availability/           # 🚧 Stub
│           ├── quotes/                 # 🚧 Stub
│           ├── profile/                # 🚧 Stub
│           └── settings/               # 🚧 Stub
├── components/
│   └── services/
│       ├── ProviderCard.tsx
│       ├── ProvidersGrid.tsx
│       ├── FeaturedProviders.tsx
│       └── ...
├── lib/
│   └── services/
│       ├── providers.ts    # Server-side provider functions
│       ├── categories.ts   # Category fetching
│       ├── jobs.ts         # 🚧 Empty
│       └── reviews.ts      # 🚧 Empty
├── hooks/
│   ├── useServiceProviders.ts  # TanStack Query hooks
│   └── useServicesSearch.ts    # URL-synced filters
└── types/
    └── service-providers.ts    # TypeScript definitions
```

### Component Hierarchy

```
ProviderDashboardLayout (Server)
    ├── Auth check → redirect if not logged in
    ├── Role check → redirect if not service_provider
    └── ProviderDashboardShell (Client)
        ├── Sidebar Navigation
        │   ├── Logo
        │   ├── Main Nav Items
        │   ├── Bottom Nav Items
        │   └── User Section
        ├── Header
        │   ├── Mobile Menu Toggle
        │   ├── Messages Button
        │   └── Notifications Button
        └── Main Content Area
            └── {children} - Page content
```

### Navigation Items

| Route | Label | Icon | Status |
|-------|-------|------|--------|
| `/dashboard/provider` | Dashboard | LayoutDashboard | ✅ |
| `/dashboard/provider/jobs` | Jobs | Briefcase | 🚧 |
| `/dashboard/provider/services` | My Services | Wrench | 🚧 |
| `/dashboard/provider/earnings` | Earnings | DollarSign | 🚧 |
| `/dashboard/provider/reviews` | Reviews | Star | 🚧 |
| `/dashboard/provider/availability` | Availability | Calendar | 🚧 |
| `/dashboard/provider/quotes` | Quotes | FileText | 🚧 |
| `/dashboard/provider/profile` | Profile | User | 🚧 |
| `/dashboard/provider/settings` | Settings | Settings | 🚧 |

---

## 2. Dashboard Home (Overview)

### What
The main landing page for service providers showing a real-time snapshot of their business performance.

### Features

#### Stats Grid (4 KPI Cards)
| Metric | Description | Visual |
|--------|-------------|--------|
| Jobs Completed | Total jobs finished | Growth indicator (+8) |
| Monthly Earnings | This month's income | Percentage change (+12%) |
| Average Rating | Star rating out of 5 | Review count |
| Response Rate | Reply percentage | Verified badge |

#### Recent Job Requests
- Job title with urgency badge (if applicable)
- Location display
- Budget range
- Time since posted
- Color-coded status icons

#### Quick Actions
- Complete Profile (with progress indicator)
- Pending Quotes (count badge)
- View Earnings (total display)

#### Active Jobs Summary
- Large count display
- Link to filtered jobs view

#### Earnings Overview
- Time period selector (This Month / Last Month / This Year)
- Total earned
- Jobs completed in period
- Average per job

### Who
- **Primary Users**: Registered service providers with `service_provider` role
- **Access Control**: Layout enforces authentication and role verification

```typescript
// Role verification in layout.tsx
if (!userRoles.includes("service_provider")) {
  redirect("/dashboard");
}
```

### When
- Displayed after login for users with `service_provider` as primary role
- Role hierarchy: `landlord > service_provider > tenant`
- Data refreshes on page load

### Where
- **Route**: `/dashboard/provider`
- **Layout**: `src/app/dashboard/provider/layout.tsx`
- **Page**: `src/app/dashboard/provider/page.tsx`
- **Shell**: `src/app/dashboard/provider/ProviderDashboardShell.tsx`

### Why
- **Business Need**: Instant visibility into performance metrics
- **Psychology**: Gamification elements encourage engagement
- **Conversion**: Quick actions guide profile completion

---

## 3. Jobs Management

### What
Complete job lifecycle management system tracking requests from inquiry to completion.

### Job Status Flow

```
pending → quoted → accepted → scheduled → in_progress → completed
                                      ↘           ↘
                                    cancelled    disputed
```

| Status | Description |
|--------|-------------|
| `pending` | New request awaiting provider response |
| `quoted` | Provider submitted a quote |
| `accepted` | Client accepted the quote |
| `scheduled` | Job date/time confirmed |
| `in_progress` | Provider actively working |
| `completed` | Work finished successfully |
| `cancelled` | Either party cancelled |
| `disputed` | Issue raised for resolution |

### Job Priority Levels

| Priority | Use Case | Visual Treatment |
|----------|----------|------------------|
| `low` | Non-urgent, flexible timing | Gray badge |
| `normal` | Standard request | No badge |
| `urgent` | Needs attention within 24-48hrs | Orange badge |
| `emergency` | Immediate (burst pipe, power out) | Red badge |

### Database Fields

```sql
-- service_jobs table
id UUID PRIMARY KEY,
job_number TEXT NOT NULL,           -- 'JOB-20260106-a1b2'
client_id UUID NOT NULL,
provider_id UUID,                   -- Assigned after quote accepted

-- Service classification
category_id TEXT NOT NULL,
subcategory_id TEXT,
service_id UUID,

-- Job details
title TEXT NOT NULL,
description TEXT NOT NULL,

-- Location
address TEXT NOT NULL,
area TEXT NOT NULL,                 -- 'Westlands', 'Kilimani'
latitude DECIMAL(10, 8),
longitude DECIMAL(11, 8),
access_instructions TEXT,

-- Optional property linkage
listing_id UUID,
building_id UUID,
unit_id UUID,

-- Scheduling
preferred_date DATE,
preferred_time_start TIME,
preferred_time_end TIME,
is_flexible BOOLEAN DEFAULT false,
scheduled_at TIMESTAMPTZ,

-- Priority & Status
priority job_priority DEFAULT 'normal',
status job_status DEFAULT 'pending',

-- Pricing
quoted_amount INTEGER,
final_amount INTEGER,
platform_fee INTEGER,

-- Payment
payment_status service_payment_status,
payment_method TEXT,
payment_reference TEXT,

-- Documentation
photos_before TEXT[],
photos_after TEXT[],
client_notes TEXT,
provider_notes TEXT,

-- Timestamps
started_at TIMESTAMPTZ,
completed_at TIMESTAMPTZ,
cancelled_at TIMESTAMPTZ,
```

### Who
- **Providers**: View jobs in service areas, submit quotes, update status
- **Clients**: Create requests, accept quotes, approve completion

### RLS Policies

```sql
-- Providers see their assigned jobs
CREATE POLICY "Providers can view their assigned jobs" ON public.service_jobs
  FOR SELECT USING (
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  );

-- Providers see open jobs in their areas
CREATE POLICY "Providers can view open jobs in their areas" ON public.service_jobs
  FOR SELECT USING (
    status = 'pending' AND
    area IN (
      SELECT unnest(service_areas) FROM public.service_providers WHERE user_id = auth.uid()
    )
  );
```

### When
- Jobs appear when client creates request in provider's service area
- Provider must be `is_available = true`
- Emergency jobs surface first

### Where
- **Route**: `/dashboard/provider/jobs`
- **Table**: `service_jobs`
- **Index**: `idx_service_jobs_provider_status` for fast dashboard queries

### Why
- **Core Value**: Job discovery mechanism for providers
- **Trust**: Before/after photos protect both parties
- **Efficiency**: Area-based matching reduces irrelevant requests
- **Prioritization**: Emergency jobs need immediate attention

---

## 4. My Services Management

### What
Allows providers to define which services they offer with custom pricing.

### Service Hierarchy

```
Category (8 total)
    └── Subcategory (42 total)
            └── Service (many)

Example:
cleaning (category)
    └── home-cleaning (subcategory)
            ├── Standard 2BR Cleaning (service)
            ├── Deep Kitchen Clean (service)
            └── Move-out Cleaning (service)
```

### Categories (Seeded Data)

| ID | Name | Icon | Emergency |
|----|------|------|-----------|
| `moving` | Moving & Packing | Truck | No |
| `cleaning` | Cleaning | Sparkles | No |
| `repairs` | Repairs & Maintenance | Wrench | Yes |
| `interior` | Interior Works | PaintBucket | No |
| `utilities` | Utilities & Tech | Wifi | No |
| `lifestyle` | Lifestyle Services | Heart | No |
| `security` | Security | Shield | Yes |
| `pets` | Pet Care | PawPrint | No |

### Provider Services Junction

```sql
-- provider_services table
id UUID PRIMARY KEY,
provider_id UUID NOT NULL,
service_id UUID NOT NULL,

-- Pricing
custom_price INTEGER,
price_type TEXT DEFAULT 'fixed',    -- 'fixed', 'hourly', 'per_sqm', 'quote_only'

-- Details
description TEXT,                    -- Custom description
experience_years INTEGER,

-- Visibility
is_active BOOLEAN DEFAULT true,
is_featured BOOLEAN DEFAULT false,   -- Highlighted on profile

UNIQUE(provider_id, service_id)
```

### Price Types

| Type | Description | Example |
|------|-------------|---------|
| `fixed` | Set price per job | "KES 3,500 for 2BR cleaning" |
| `hourly` | Charged by hour | "KES 500/hr for handyman" |
| `per_sqm` | Charged by area | "KES 150/sqm for painting" |
| `quote_only` | Case-by-case quote | "Full renovation - get quote" |

### Who
- **Providers**: Select services, set pricing
- **Platform**: Maintains service catalog with suggested prices
- **Clients**: Filter/search by service type

### When
- Set up during onboarding
- Updated when expanding offerings
- `is_featured` services highlighted on profile

### Where
- **Route**: `/dashboard/provider/services`
- **Tables**: `services`, `service_subcategories`, `service_categories`, `provider_services`

### Why
- **Discovery**: Clients search by service type
- **Pricing Transparency**: Market differentiation
- **Flexibility**: Quote-only for complex jobs
- **SEO**: Keywords enable full-text search

---

## 5. Earnings Dashboard

### What
Financial tracking and reporting for providers.

### Payment Flow

```
Job Completed → Client Pays → Escrow Hold → Work Verified → Payout Released
                                               ↓
                                        Platform Fee Deducted
```

### Payment Status

| Status | Description |
|--------|-------------|
| `pending` | Awaiting payment |
| `escrow` | Funds held by platform |
| `released` | Paid to provider |
| `refunded` | Returned to client |
| `disputed` | Under review |

### Database Fields

```sql
-- In service_jobs table
quoted_amount INTEGER,
final_amount INTEGER,
platform_fee INTEGER,
payment_status service_payment_status,
payment_method TEXT,            -- 'mpesa', 'card', 'bank'
payment_reference TEXT,
```

### Dashboard Metrics

| Metric | Description |
|--------|-------------|
| Total Earnings (All-time) | Sum of all `final_amount` where `status = 'completed'` |
| This Month | Current month earnings |
| Pending Payments | `payment_status = 'escrow'` |
| Platform Fees | Sum of `platform_fee` |
| Average per Job | Total / Job count |

### Who
- **Providers**: Track income, plan finances
- **Platform**: Manage escrow and fees
- **Payment Processors**: M-Pesa, card, bank integrations

### When
- Updated after job completion
- Payouts on schedule (based on tier)
- Escrow released on client approval

### Where
- **Route**: `/dashboard/provider/earnings`
- **Data**: Aggregations from `service_jobs`

### Why
- **Trust**: Transparent fee structure
- **Security**: Escrow protects against non-payment
- **Planning**: Income forecasting
- **Compliance**: Payment records for tax

---

## 6. Reviews & Reputation

### What
Multi-dimensional rating system for quality assurance.

### Rating Dimensions

| Dimension | Description |
|-----------|-------------|
| `overall_rating` | Primary 1-5 star rating (required) |
| `quality_rating` | Work quality |
| `punctuality_rating` | Timeliness |
| `communication_rating` | Responsiveness |
| `value_rating` | Price fairness |

### Database Schema

```sql
-- provider_reviews table
id UUID PRIMARY KEY,
provider_id UUID NOT NULL,
reviewer_id UUID NOT NULL,
job_id UUID,                         -- Links to specific job

-- Ratings (1-5)
overall_rating INTEGER NOT NULL,
quality_rating INTEGER,
punctuality_rating INTEGER,
communication_rating INTEGER,
value_rating INTEGER,

-- Content
title TEXT,
review TEXT,
photos TEXT[],

-- Provider response
provider_response TEXT,
responded_at TIMESTAMPTZ,

-- Moderation
is_verified BOOLEAN DEFAULT false,   -- From completed job
is_visible BOOLEAN DEFAULT true,
flagged BOOLEAN DEFAULT false,
flagged_reason TEXT,

UNIQUE(job_id)                       -- One review per job
```

### Aggregated Stats (Denormalized)

```sql
-- In service_providers table
rating_average DECIMAL(2, 1),        -- e.g., 4.7
rating_count INTEGER,
```

### Auto-Update Trigger

```sql
CREATE TRIGGER update_provider_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating_stats();
```

### Who
- **Clients**: Leave reviews after completion
- **Providers**: Respond to reviews
- **Platform**: Moderate flagged content

### When
- Reviews allowed after `job_status = 'completed'`
- Provider can respond anytime
- Ratings update automatically via trigger

### Where
- **Route**: `/dashboard/provider/reviews`
- **Public**: Provider profile pages
- **API**: `getProviderReviews()` in `providers.ts`

### Why
- **Trust Signals**: High ratings reduce hesitation
- **Quality Control**: Low ratings surface problems
- **Differentiation**: Multi-dimension shows nuance
- **Professionalism**: Response opportunity

---

## 7. Availability Management

### What
Two-part scheduling system for providers.

### Weekly Recurring Schedule

```sql
-- provider_availability table
id UUID PRIMARY KEY,
provider_id UUID NOT NULL,
day_of_week INTEGER NOT NULL,        -- 0=Sunday to 6=Saturday
start_time TIME NOT NULL,
end_time TIME NOT NULL,
is_active BOOLEAN DEFAULT true,

UNIQUE(provider_id, day_of_week, start_time)
```

### Blocked Dates

```sql
-- provider_blocked_dates table
id UUID PRIMARY KEY,
provider_id UUID NOT NULL,
blocked_date DATE NOT NULL,
reason TEXT,

UNIQUE(provider_id, blocked_date)
```

### Global Availability Flags

```sql
-- In service_providers table
is_available BOOLEAN DEFAULT true,      -- Global toggle
instant_booking BOOLEAN DEFAULT false,  -- Skip quote step
```

### Weekly Schedule Example

| Day | Start | End | Active |
|-----|-------|-----|--------|
| Monday | 08:00 | 17:00 | ✅ |
| Tuesday | 08:00 | 17:00 | ✅ |
| Wednesday | 08:00 | 17:00 | ✅ |
| Thursday | 08:00 | 17:00 | ✅ |
| Friday | 08:00 | 15:00 | ✅ |
| Saturday | 09:00 | 13:00 | ✅ |
| Sunday | - | - | ❌ |

### Who
- **Providers**: Set hours, block dates
- **Clients**: See availability before booking
- **System**: Filter by `is_available`

### When
- Set during onboarding
- `is_available = false` hides from marketplace
- Blocked dates for planned absences

### Where
- **Route**: `/dashboard/provider/availability`
- **Tables**: `provider_availability`, `provider_blocked_dates`

### Why
- **Expectations**: Clients know response times
- **Work-Life Balance**: Provider schedule control
- **Premium Feature**: Instant booking for committed providers
- **Efficiency**: Prevents overbooking

---

## 8. Quotes Management

### What
Quote submission and tracking system.

### Database Schema

```sql
-- service_job_quotes table
id UUID PRIMARY KEY,
job_id UUID NOT NULL,
provider_id UUID NOT NULL,

-- Quote details
amount INTEGER NOT NULL,
description TEXT,
estimated_duration TEXT,             -- '2-3 hours', 'Half day'

-- Materials
includes_materials BOOLEAN DEFAULT false,
materials_cost INTEGER,
materials_description TEXT,

-- Validity
valid_until TIMESTAMPTZ,

-- Status
status TEXT DEFAULT 'pending',       -- pending, accepted, rejected, expired, withdrawn

-- Client response
client_response TEXT,
responded_at TIMESTAMPTZ,

UNIQUE(job_id, provider_id)          -- One quote per provider per job
```

### Quote Status Flow

```
pending → accepted → job proceeds
       → rejected → provider notified
       → expired  → past valid_until
       → withdrawn → provider cancelled
```

### Who
- **Providers**: Create quotes for open jobs
- **Clients**: Compare quotes, accept best
- **System**: Expire past `valid_until`

### When
- Provider submits after viewing job
- Client compares multiple quotes
- Accepted quote triggers `job_status = 'accepted'`

### Where
- **Route**: `/dashboard/provider/quotes`
- **Table**: `service_job_quotes`

### Why
- **Competition**: Multiple quotes give choice
- **Transparency**: Itemized materials vs labor
- **Commitment**: Expiration prevents stale offers
- **Flexibility**: Withdraw if circumstances change

---

## 9. Provider Profile

### What
Public-facing business profile for discovery.

### Profile Fields

```sql
-- service_providers table

-- Identity
business_name TEXT NOT NULL,
business_type provider_type,         -- 'individual' or 'company'
tagline TEXT,
description TEXT,

-- Contact
business_email TEXT,
business_phone TEXT,
whatsapp TEXT,
website TEXT,

-- Media
logo_url TEXT,
cover_photo_url TEXT,
portfolio_images TEXT[],

-- Location
base_location JSONB,                 -- {address, lat, lng}
service_areas TEXT[],                -- ['Westlands', 'Kilimani', ...]
service_radius_km INTEGER,
max_travel_distance_km INTEGER,

-- Business credentials
registration_number TEXT,
kra_pin TEXT,
business_permit_number TEXT,

-- Availability
is_available BOOLEAN DEFAULT true,
instant_booking BOOLEAN DEFAULT false,
availability_schedule JSONB,

-- Pricing
min_job_value INTEGER,
accepts_escrow BOOLEAN DEFAULT true,

-- Stats (denormalized)
rating_average DECIMAL(2, 1),
rating_count INTEGER,
total_jobs_completed INTEGER,
total_jobs_cancelled INTEGER,
completion_rate DECIMAL(5, 2),
response_time_minutes INTEGER,

-- Status
status provider_status,              -- pending, active, suspended, inactive
tier provider_tier,                  -- free, premium, enterprise
```

### Who
- **Provider**: Creates and maintains
- **Clients**: View before hiring
- **Platform**: Verify credentials

### When
- Created during onboarding
- Completeness affects visibility
- Verification status updates after review

### Where
- **Route**: `/dashboard/provider/profile`
- **Public**: `/services/providers/[id]`
- **API**: `getProviderById()`

### Why
- **Trust**: Business registration reduces scam risk
- **Credibility**: Portfolio showcases work
- **Local Relevance**: Service areas ensure fit
- **Conversion**: Complete profiles get 3x more requests

---

## 10. Verification System

### What
Document-based trust verification.

### Document Types

| Type | Description |
|------|-------------|
| `id_card` | National ID or passport |
| `business_permit` | County business license |
| `kra_pin` | Tax registration |
| `certificate` | Professional certification |

### Database Schema

```sql
-- provider_verifications table
id UUID PRIMARY KEY,
provider_id UUID NOT NULL,

-- Document info
document_type TEXT NOT NULL,
document_name TEXT,
document_number TEXT,
document_url TEXT,
expiry_date DATE,

-- Status
status verification_status,          -- pending, submitted, verified, rejected, expired
verified_at TIMESTAMPTZ,
verified_by UUID,                    -- Admin who verified
rejection_reason TEXT,

metadata JSONB DEFAULT '{}',
```

### Verification Badges

```sql
-- In service_providers table
verification_badge TEXT,             -- 'basic', 'standard', 'premium'
is_verified BOOLEAN DEFAULT false,
verified_at TIMESTAMPTZ,
```

| Badge | Requirements |
|-------|--------------|
| Basic | ID verified |
| Standard | ID + Business permit |
| Premium | ID + Permit + KRA + Certificates |

### Who
- **Providers**: Upload documents
- **Admins**: Review and approve/reject
- **Clients**: See verified badge

### When
- Required for premium features
- Documents expire and need renewal
- Re-verification if rejected

### Where
- **Submission**: Profile management
- **Display**: Badge on cards and profile

### Why
- **Trust**: Verified = legitimate business
- **Safety**: ID verification protects clients
- **Quality**: Certificates prove competency
- **Differentiation**: Competitive advantage

---

## 11. Tier System

### What
Three-tier provider classification.

### Tier Comparison

| Feature | Free | Premium | Enterprise |
|---------|------|---------|------------|
| Listing | ✅ | ✅ | ✅ |
| Search Placement | Normal | Boosted | Top |
| Featured Sections | ❌ | ✅ | ✅ |
| Support | Standard | Priority | Dedicated |
| Analytics | Basic | Advanced | Full |

### Database Field

```sql
tier provider_tier DEFAULT 'free',   -- 'free', 'premium', 'enterprise'
```

### Sorting Impact

```typescript
// Default "recommended" sort
query = query
  .order("tier", { ascending: false })      // Enterprise first
  .order("rating_average", { ascending: false })
  .order("rating_count", { ascending: false });
```

### Featured Section Query

```typescript
// Only premium and enterprise
.in("tier", ["enterprise", "premium"])
```

### Who
- **Free**: New providers, low-volume
- **Premium**: Established, want visibility
- **Enterprise**: Companies with high volume

### When
- Starts at `free` on registration
- Upgrade for more exposure
- May require minimum rating/jobs

### Where
- Affects search ranking
- Featured sections filter by tier

### Why
- **Monetization**: Revenue from upgrades
- **Quality Signal**: Higher tiers = commitment
- **Fair Competition**: Free still visible
- **Incentive**: Growth path for providers

---

## 12. Messaging System

### What
In-job communication channel.

### Database Schema

```sql
-- service_job_messages table
id UUID PRIMARY KEY,
job_id UUID NOT NULL,
sender_id UUID NOT NULL,

message TEXT NOT NULL,
attachments TEXT[],

is_system BOOLEAN DEFAULT false,     -- Auto status updates
is_read BOOLEAN DEFAULT false,
read_at TIMESTAMPTZ,
```

### RLS Policies

```sql
-- Only job participants can view
CREATE POLICY "Job participants can view messages" ON public.service_job_messages
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM public.service_jobs 
      WHERE client_id = auth.uid() 
      OR provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
    )
  );
```

### Who
- **Clients & Providers**: Direct communication
- **System**: Automated status messages

### When
- Available once job created
- Used for clarifications, scheduling
- Read receipts tracked

### Where
- Job detail view
- Notifications in header

### Why
- **Context**: Communication tied to job
- **Record**: Dispute resolution history
- **Stickiness**: Keeps communication in-app
- **Professionalism**: Formal audit trail

---

## 13. Saved Providers (Client Feature)

### What
Bookmark system for clients.

### Database Schema

```sql
-- saved_providers table
id UUID PRIMARY KEY,
user_id UUID NOT NULL,
provider_id UUID NOT NULL,
notes TEXT,

UNIQUE(user_id, provider_id)
```

### API Functions

```typescript
// Toggle save/unsave
toggleSaveProvider(providerId: string): Promise<{ saved: boolean }>

// Get all saved
getSavedProviders(): Promise<ServiceProviderCardData[]>

// Check if saved
isProviderSaved(providerId: string): Promise<boolean>
```

### Who
- **Clients**: Save favorite providers
- **Providers**: See saved count (social proof)

### When
- Heart icon toggle on cards
- Before or after job
- Persists across sessions

### Where
- Provider cards
- Client dashboard saved list
- API in `providers.ts`

### Why
- **Convenience**: Quick re-hire
- **Loyalty**: Build relationships
- **Notes**: Remember context

---

## 14. Database Schema

### Tables Overview

| Table | Purpose | Row Count |
|-------|---------|-----------|
| `service_categories` | Top-level categories | 8 (seeded) |
| `service_subcategories` | Sub-categories | 42 (seeded) |
| `services` | Individual services | Many |
| `service_providers` | Provider profiles | Many |
| `provider_services` | Provider ↔ Service junction | Many |
| `provider_availability` | Weekly schedule | Many |
| `provider_blocked_dates` | Blocked dates | Many |
| `provider_reviews` | Customer reviews | Many |
| `provider_verifications` | Document verification | Many |
| `saved_providers` | User favorites | Many |
| `service_jobs` | Job requests | Many |
| `service_job_quotes` | Provider quotes | Many |
| `service_job_messages` | Job communication | Many |

### Enums

```sql
-- Provider type
CREATE TYPE provider_type AS ENUM ('individual', 'company');

-- Provider status
CREATE TYPE provider_status AS ENUM ('pending', 'active', 'suspended', 'inactive');

-- Provider tier
CREATE TYPE provider_tier AS ENUM ('free', 'premium', 'enterprise');

-- Job status
CREATE TYPE job_status AS ENUM (
  'pending', 'quoted', 'accepted', 'scheduled', 
  'in_progress', 'completed', 'cancelled', 'disputed'
);

-- Job priority
CREATE TYPE job_priority AS ENUM ('low', 'normal', 'urgent', 'emergency');

-- Payment status
CREATE TYPE service_payment_status AS ENUM (
  'pending', 'escrow', 'released', 'refunded', 'disputed'
);

-- Verification status
CREATE TYPE verification_status AS ENUM (
  'pending', 'submitted', 'verified', 'rejected', 'expired'
);
```

### Key Indexes

```sql
-- Provider marketplace queries
CREATE INDEX idx_service_providers_marketplace 
  ON public.service_providers(status, is_available, tier DESC, rating_average DESC)
  WHERE status = 'active';

-- Provider job dashboard
CREATE INDEX idx_service_jobs_provider_status 
  ON public.service_jobs(provider_id, status, scheduled_at)
  WHERE provider_id IS NOT NULL;

-- Full-text search
CREATE INDEX idx_service_providers_search ON public.service_providers 
  USING gin(to_tsvector('english', 
    coalesce(business_name, '') || ' ' || 
    coalesce(description, '') || ' ' || 
    coalesce(tagline, '')
  ));
```

---

## 15. API Reference

### Provider Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services/providers` | GET | List providers with filters |
| `/api/services/providers/[id]` | GET | Single provider details |
| `/api/services/providers/[id]/reviews` | GET | Provider reviews |
| `/api/services/providers/me` | GET | Current user's provider profile |
| `/api/services/categories` | GET | Service categories |
| `/api/services/saved` | GET/POST | Saved providers |
| `/api/services/jobs` | - | Job management |

### Query Parameters (Providers List)

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category ID |
| `subcategory` | string | Filter by subcategory ID |
| `area` | string | Filter by service area |
| `priceMin` | number | Minimum price filter |
| `priceMax` | number | Maximum price filter |
| `ratingMin` | number | Minimum rating (1-5) |
| `verified` | boolean | Verified providers only |
| `available` | boolean | Currently available |
| `instant` | boolean | Instant booking enabled |
| `sort` | string | Sort order |
| `page` | number | Page number |
| `pageSize` | number | Results per page |

### Sort Options

| Value | Description |
|-------|-------------|
| `recommended` | Tier → Rating → Count (default) |
| `rating-high` | Highest rated first |
| `reviews-most` | Most reviewed first |
| `jobs-most` | Most jobs completed |
| `price-low` | Lowest price first |
| `price-high` | Highest price first |

---

## 16. Implementation Status

### Completed ✅

| Feature | Location |
|---------|----------|
| Dashboard Layout | `src/app/dashboard/provider/layout.tsx` |
| Dashboard Home | `src/app/dashboard/provider/page.tsx` |
| Shell UI | `src/app/dashboard/provider/ProviderDashboardShell.tsx` |
| Provider Types | `src/types/service-providers.ts` |
| Provider API | `src/lib/services/providers.ts` |
| Category API | `src/lib/services/categories.ts` |
| Provider Hooks | `src/hooks/useServiceProviders.ts` |
| Search Hooks | `src/hooks/useServicesSearch.ts` |
| Database Schema | `supabase/migrations/20260105000005_service_providers.sql` |
| Provider Cards | `src/components/services/ProviderCard.tsx` |
| Saved Providers | API + UI complete |

### Stub/Placeholder 🚧

| Feature | Route | Status |
|---------|-------|--------|
| Jobs Page | `/dashboard/provider/jobs` | Navigation only |
| Services Page | `/dashboard/provider/services` | Navigation only |
| Earnings Page | `/dashboard/provider/earnings` | Navigation only |
| Reviews Page | `/dashboard/provider/reviews` | Navigation only |
| Availability Page | `/dashboard/provider/availability` | Navigation only |
| Quotes Page | `/dashboard/provider/quotes` | Navigation only |
| Profile Page | `/dashboard/provider/profile` | Navigation only |
| Settings Page | `/dashboard/provider/settings` | Navigation only |

### Empty Files 📄

| File | Purpose |
|------|---------|
| `src/app/api/services/providers/me/route.ts` | Current user's provider |
| `src/app/api/services/jobs/route.ts` | Job management |
| `src/lib/services/jobs.ts` | Job functions |
| `src/lib/services/reviews.ts` | Review functions |

---

## Next Steps (Recommended Implementation Order)

1. **Profile Page** - Providers need to set up before receiving jobs
2. **Services Page** - Define what services they offer
3. **Availability Page** - Set working hours
4. **Jobs Page** - View and respond to job requests
5. **Quotes Page** - Manage quote submissions
6. **Reviews Page** - View and respond to reviews
7. **Earnings Page** - Track payments
8. **Settings Page** - Account preferences

---

## Related Documentation

- [MITASAFI_PRD.md](MITASAFI_PRD.md) - Product Requirements
- [MITASAFI_TECHNICAL_ARCHITECTURE.md](MITASAFI_TECHNICAL_ARCHITECTURE.md) - Technical Overview
- [MITASAFI_DESIGN_SYSTEM.md](MITASAFI_DESIGN_SYSTEM.md) - UI/UX Guidelines

---

*Last Updated: January 6, 2026*
