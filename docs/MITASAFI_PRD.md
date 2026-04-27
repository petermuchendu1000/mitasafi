# Mitasafi - Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** December 30, 2024  
**Status:** Draft  

---

## 1. Executive Summary

### 1.1 Product Vision
Mitasafi ("Efficient and happily integrated community") is a tenant-centric living ecosystem platform that connects property owners, tenants, and service providers in Nairobi, Kenya. The tenant is the central user, with access to their entire living ecosystem through one unified platform.

### 1.2 Problem Statement
Current rental solutions in Kenya are fragmented:
- Finding properties requires multiple platforms
- No continuity after lease signing
- Services (cleaning, moving, repairs) require separate searches
- No unified payment or communication system
- Trust issues between landlords and tenants

### 1.3 Solution
A unified platform where tenants can:
- Discover and compare properties
- Communicate with landlords via chat/video
- Pay deposits securely via escrow
- Book move-in services
- Pay rent and utilities
- Access ongoing services throughout tenancy
- Build rental history and "Tenant Score"

---

## 2. Target Market

### 2.1 Geographic Scope
**Nairobi County, Kenya** - All 17 Sub-Counties:

| Sub-County | Key Areas |
|------------|-----------|
| Westlands | Parklands, Highridge, Kitisuru, Mountain View |
| Langata | Karen, Hardy, South C |
| Kibra | Kibera, Lindi, Makina |
| Dagoretti North | Kilimani, Kawangware, Gatina |
| Dagoretti South | Mutuini, Ngando, Waithaka |
| Roysambu | Kahawa, Githurai, Zimmerman |
| Kasarani | Clay City, Mwiki, Ruai |
| Ruaraka | Utalii, Mathare North, Babadogo |
| Embakasi South | Imara Daima, Pipeline, Kwa Njenga |
| Embakasi North | Dandora, Kariobangi North |
| Embakasi Central | Kayole, Komarock |
| Embakasi East | Utawala, Mihang'o, Upper Savanna |
| Embakasi West | Umoja, Mowlem, Kariobangi South |
| Makadara | Maringo, Hamza, Viwandani |
| Kamukunji | Eastleigh, California, Airbase |
| Starehe | Nairobi Central, Ngara, Landimawe |
| Mathare | Mabatini, Huruma, Mlango Kubwa |

### 2.2 User Segments

**Primary: Tenants**
- Young professionals (25-40)
- Students (18-25)
- Families
- Expats and relocating individuals

**Secondary: Property Owners**
- Individual landlords
- Property management companies
- Real estate agencies

**Tertiary: Service Providers**
- Moving companies
- Cleaning services
- Repair technicians
- Internet/utility providers
- Food delivery services

---

## 3. User Types & Roles

### 3.1 Tenant (Central User)
**Access Level:** Full platform access (FREE)

**Capabilities:**
- Search, filter, save, compare properties
- View virtual tours (360°, video)
- Chat and video call with landlords
- Pay deposits to escrow
- Sign digital leases
- Book all service providers
- Pay rent and utilities
- Submit maintenance requests
- Rate landlords and service providers
- Build Tenant Score
- Access loyalty rewards

### 3.2 Landlord / Property Owner
**Access Level:** Freemium

| Feature | Free | Premium |
|---------|------|---------|
| Property listings | 3 units | Unlimited |
| Basic dashboard | ✅ | ✅ |
| Tenant applications | ✅ | ✅ |
| Chat with tenants | ✅ | ✅ |
| Rent collection | ✅ | ✅ |
| Tenant screening reports | ❌ | ✅ |
| Analytics & insights | ❌ | ✅ |
| Featured listings | ❌ | ✅ |
| Verified badge | ❌ | ✅ |
| Priority support | ❌ | ✅ |
| Bulk operations | ❌ | ✅ |

### 3.3 Service Provider
**Access Level:** Freemium

| Feature | Free | Premium |
|---------|------|---------|
| Business profile | ✅ | ✅ |
| Receive bookings | ✅ | ✅ |
| Accept payments | ✅ | ✅ |
| Appear in search | ✅ | ✅ |
| Ad ranking boost | ❌ | ✅ |
| Featured placement | ❌ | ✅ |
| Business insights | ❌ | ✅ |
| Priority in recommendations | ❌ | ✅ |
| Verified badge | ❌ | ✅ |

**Commission:** X% per completed job (to be determined)

### 3.4 Admin
**Access Level:** Internal only

**Capabilities:**
- User management
- Content moderation
- Verification approvals
- Dispute resolution
- Platform analytics
- System configuration

---

## 4. Core Features

### 4.1 Property Discovery

#### Search & Filters
- Location (sub-county, ward, area, proximity)
- Property type (residential, commercial, land)
- Price range
- Bedrooms/bathrooms
- Amenities
- Availability date
- Pet-friendly
- Verified listings only

#### Property Listing Page
- High-quality image gallery
- Video tour (uploaded)
- 360° virtual tour
- Google Maps location
- Amenities list
- Nearby facilities (schools, hospitals, malls)
- Landlord profile (verified badge)
- Reviews from previous tenants
- Similar properties

#### Save & Compare
- Wishlist functionality
- Side-by-side comparison (up to 3)
- Price history
- Share with roommates

### 4.2 Communication

#### In-App Chat
- Text messaging
- Image sharing
- Document sharing (lease, receipts)
- Read receipts
- Message history

#### Video Calls
- Live property viewing
- Scheduled calls
- Screen sharing (for documents)

#### Notifications
- Push notifications
- Email notifications
- SMS for critical (payment reminders)
- In-app notification center

### 4.3 Booking & Payments

#### Property Booking Flow
1. Express interest
2. Schedule viewing (in-person or video)
3. Submit application
4. Landlord approval
5. Pay deposit (escrow)
6. Sign digital lease
7. Move-in confirmation
8. Deposit released to landlord

#### Escrow System
- Secure deposit holding
- Conditions for release
- Dispute handling
- Refund processing

#### Payment Methods
- M-Pesa (Daraja API)
- Card payments
- Bank transfer
- Wallet balance

#### Recurring Payments
- Rent auto-pay
- Payment reminders
- Payment history
- Receipts and statements

### 4.4 Service Marketplace

#### Categories
| Category | Services |
|----------|----------|
| Moving | Movers, truck rental, packing |
| Cleaning | Deep clean, regular, fumigation |
| Repairs | Plumber, electrician, HVAC, locksmith |
| Interior | Painters, designers, furniture |
| Utilities | Internet, water, electricity |
| Lifestyle | Food delivery, laundry, groceries |
| Security | Guards, CCTV, alarms |
| Pets | Grooming, veterinary, pet sitting |

#### Service Booking Flow
1. Browse/search services
2. View provider profiles
3. Check availability
4. Request quote / book
5. Confirm booking
6. Service delivered
7. Payment processed
8. Rate and review

### 4.5 Tenant Dashboard

#### Overview
- Current tenancy details
- Upcoming payments
- Active service requests
- Recent notifications

#### Documents
- Lease agreement
- Payment receipts
- Move-in checklist
- Maintenance history
- Personal documents (ID, payslips)

#### Tenant Score
- On-time payment history
- Lease compliance
- Property care
- Landlord feedback
- Verification level

### 4.6 Landlord Dashboard

#### Property Management
- All properties overview
- Unit availability status
- Tenant information
- Rent collection status

#### Applications
- Pending applications
- Tenant screening (premium)
- Approval workflow

#### Financials
- Income overview
- Payment history
- Expense tracking
- Reports (premium)

### 4.7 Service Provider Dashboard

#### Profile Management
- Business information
- Service catalog
- Pricing
- Availability calendar
- Portfolio/gallery

#### Jobs
- Incoming requests
- Active jobs
- Completed jobs
- Earnings

---

## 5. Verification System

### 5.1 Tenant Verification

| Level | Requirements | Benefits |
|-------|--------------|----------|
| Basic | Phone + Email | Access to listings |
| Verified | + National ID | Can apply for properties |
| Premium | + Payslips + Bank statements | Priority applications |

### 5.2 Landlord Verification

| Document | Purpose | Required |
|----------|---------|----------|
| National ID | Identity | ✅ |
| KRA PIN Certificate | Tax compliance | ✅ |
| Title Deed / Lease | Property ownership | ✅ |
| Utility Bill | Property confirmation | ✅ |
| CR12 (companies) | Company ownership | If applicable |

### 5.3 Service Provider Verification

**Individuals:**
- National ID
- Professional certificates
- Portfolio evidence

**Companies:**
- Certificate of Incorporation
- KRA PIN
- Business permits
- Insurance certificates

---

## 6. Trust & Safety

### 6.1 Deposit Protection
- All deposits held in escrow
- Clear release conditions
- Documented with timestamps

### 6.2 Ratings & Reviews
- Verified reviews only (completed transactions)
- Response from reviewed party
- Aggregate ratings displayed
- Flag suspicious reviews

### 6.3 Dispute Resolution

**Process:**
1. In-app dispute filing
2. Evidence submission (both parties)
3. Mitasafi arbitration (7 days)
4. Resolution or escalation
5. Legal action support (if needed)

### 6.4 Fraud Prevention
- Listing verification
- User verification
- Payment monitoring
- Report abuse system

---

## 7. Wow Features

### 7.1 Tenant Score
Credit-like score for renting based on:
- Payment history (40%)
- Lease compliance (25%)
- Property care (20%)
- Verification level (15%)

### 7.2 Virtual Tours
- 360° property tours
- Video walkthroughs
- Live video viewings

### 7.3 Rent-to-Own
Partnership with landlords for ownership paths:
- Portion of rent contributes to purchase
- Transparency on progress
- Legal framework integration

### 7.4 Bundle Deals
Discounts when booking multiple services:
- Moving + Cleaning
- Internet + Security
- Loyalty discounts

### 7.5 Neighbor Connect
Community features within buildings:
- Building announcements
- Shared services
- Community events
- Issue reporting

### 7.6 AI Assistant
Natural language search:
- "Find me a 2BR near Westlands under 50k with parking"
- Personalized recommendations
- Chatbot for common queries

### 7.7 Split Payments
Roommate support:
- Split rent automatically
- Individual payment tracking
- Shared expenses

### 7.8 Rental Insurance
Tenant protection:
- Deposit insurance
- Personal belongings
- Liability coverage

### 7.9 Loyalty Program
Points system:
- Earn points for on-time payments
- Redeem for services
- Tier benefits (Bronze, Silver, Gold)

---

## 8. Technical Architecture

### 8.1 Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 (App Router) + React 18 + TypeScript               │
│  Tailwind CSS + Shadcn/ui                                       │
│  PWA (Progressive Web App)                                      │
│  Zustand (State) + TanStack Query (Server State)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Authentication (+ Google OAuth)                                │
│  PostgreSQL Database                                            │
│  Row Level Security (RLS)                                       │
│  Realtime Subscriptions                                         │
│  Storage (Images, Videos, Documents)                            │
│  Edge Functions (Deno)                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│  Google Maps API (Location, Directions)                         │
│  Google OAuth (Authentication)                                  │
│  M-Pesa Daraja API (Payments)                                  │
│  Agora/Daily.co (Video Calls)                                  │
│  Firebase Cloud Messaging (Push Notifications)                  │
│  Cloudinary (Image Optimization) - Optional                    │
│  SendGrid/Resend (Emails)                                      │
│  Africa's Talking (SMS)                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Frontend Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 14 | SSR, App Router, API routes |
| UI Library | React 18 | Components |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| Components | Shadcn/ui | Accessible components |
| Forms | React Hook Form + Zod | Validation |
| State | Zustand | Global state |
| Server State | TanStack Query | Data fetching/caching |
| Maps | @react-google-maps/api | Property locations |
| Icons | Lucide React | Icon library |
| Date | date-fns | Date manipulation |
| Charts | Recharts | Dashboard analytics |

### 8.3 Supabase Configuration

#### Authentication
- Email/Password
- Phone (OTP via SMS)
- Google OAuth
- Session management
- Role-based access

#### Database (PostgreSQL)
- Relational data model
- Row Level Security (RLS)
- Database functions
- Triggers for automation
- Full-text search

#### Realtime
- Chat messages
- Notifications
- Status updates
- Presence (online/offline)

#### Storage Buckets
| Bucket | Purpose | Access |
|--------|---------|--------|
| avatars | User profile photos | Public |
| properties | Property images | Public |
| videos | Property videos | Public |
| documents | ID, leases, receipts | Private (RLS) |
| chat-attachments | Chat images/files | Private (RLS) |

#### Edge Functions
- Payment webhooks
- Email sending
- SMS sending
- Complex business logic
- Third-party integrations

### 8.4 Google Services Integration

#### Google OAuth
```typescript
// Supabase Auth with Google
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

#### Google Maps
- Maps JavaScript API (display maps)
- Places API (search locations)
- Geocoding API (address to coordinates)
- Directions API (distance/travel time)

### 8.5 Payment Integration

#### M-Pesa (Daraja API)
- STK Push (customer initiated)
- C2B (customer to business)
- B2C (refunds)
- Transaction status

#### Payment Flow
```
Tenant → STK Push → M-Pesa → Callback → Supabase → Update Status
```

---

## 9. Database Schema

### 9.1 Core Tables

```sql
-- Users (extends Supabase auth.users)
profiles
├── id (uuid, FK to auth.users)
├── type (enum: tenant, landlord, service_provider, admin)
├── full_name
├── phone
├── avatar_url
├── verified (boolean)
├── verification_level (enum: basic, verified, premium)
├── tenant_score (integer, 0-100)
├── created_at
└── updated_at

-- Properties
properties
├── id (uuid)
├── landlord_id (FK to profiles)
├── name
├── type (enum: residential, commercial, land)
├── sub_county
├── ward
├── area
├── address
├── location (geography point)
├── description
├── amenities (jsonb)
├── verified (boolean)
├── status (enum: active, inactive, pending)
├── created_at
└── updated_at

-- Units
units
├── id (uuid)
├── property_id (FK to properties)
├── unit_number
├── type (enum: bedsitter, 1br, 2br, etc.)
├── bedrooms
├── bathrooms
├── floor_area
├── rent_amount
├── deposit_amount
├── status (enum: available, occupied, reserved)
├── available_from
├── images (text[])
├── video_url
├── tour_360_url
├── created_at
└── updated_at

-- Tenancies
tenancies
├── id (uuid)
├── tenant_id (FK to profiles)
├── unit_id (FK to units)
├── start_date
├── end_date
├── rent_amount
├── deposit_amount
├── lease_url
├── status (enum: active, ended, terminated)
├── created_at
└── updated_at

-- Service Providers
service_providers
├── id (uuid)
├── user_id (FK to profiles)
├── business_name
├── type (enum: individual, company)
├── categories (text[])
├── description
├── portfolio (jsonb)
├── rating (decimal)
├── review_count (integer)
├── verified (boolean)
├── subscription_tier (enum: free, premium)
├── created_at
└── updated_at

-- Service Jobs
service_jobs
├── id (uuid)
├── tenant_id (FK to profiles)
├── provider_id (FK to service_providers)
├── category
├── description
├── scheduled_date
├── amount
├── status (enum: pending, confirmed, in_progress, completed, cancelled)
├── rating (integer)
├── review
├── created_at
└── updated_at

-- Payments
payments
├── id (uuid)
├── user_id (FK to profiles)
├── type (enum: rent, deposit, service, subscription)
├── reference_id (uuid, polymorphic)
├── amount
├── method (enum: mpesa, card, bank)
├── transaction_id
├── status (enum: pending, completed, failed, refunded)
├── escrow (boolean)
├── escrow_released (boolean)
├── created_at
└── updated_at

-- Chat Conversations
conversations
├── id (uuid)
├── type (enum: direct, property_inquiry, service_inquiry)
├── participants (uuid[])
├── property_id (nullable FK)
├── service_job_id (nullable FK)
├── created_at
└── updated_at

-- Chat Messages
messages
├── id (uuid)
├── conversation_id (FK)
├── sender_id (FK to profiles)
├── content
├── type (enum: text, image, document, video_call)
├── attachments (jsonb)
├── read_by (uuid[])
├── created_at
└── updated_at

-- Reviews
reviews
├── id (uuid)
├── reviewer_id (FK to profiles)
├── reviewee_type (enum: landlord, service_provider)
├── reviewee_id (uuid)
├── property_id (nullable FK)
├── service_job_id (nullable FK)
├── rating (integer, 1-5)
├── comment
├── response
├── created_at
└── updated_at

-- Verifications
verifications
├── id (uuid)
├── user_id (FK to profiles)
├── document_type
├── document_url
├── status (enum: pending, approved, rejected)
├── reviewed_by (FK to profiles, admin)
├── reviewed_at
├── rejection_reason
├── created_at
└── updated_at

-- Notifications
notifications
├── id (uuid)
├── user_id (FK to profiles)
├── type
├── title
├── message
├── data (jsonb)
├── read (boolean)
├── created_at
└── updated_at
```

### 9.2 Enums

```sql
CREATE TYPE user_type AS ENUM ('tenant', 'landlord', 'service_provider', 'admin');
CREATE TYPE property_type AS ENUM ('residential', 'commercial', 'land');
CREATE TYPE unit_type AS ENUM ('single_room', 'bedsitter', 'studio', '1br', '2br', '3br', '4br', '5br_plus', 'townhouse', 'maisonette', 'mansion', 'office', 'shop', 'warehouse', 'plot');
CREATE TYPE unit_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');
CREATE TYPE tenancy_status AS ENUM ('pending', 'active', 'ended', 'terminated');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('mpesa', 'card', 'bank', 'wallet');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE job_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed');
```

---

## 10. API Structure

### 10.1 Supabase Client Endpoints

```typescript
// Authentication
supabase.auth.signUp()
supabase.auth.signInWithPassword()
supabase.auth.signInWithOAuth({ provider: 'google' })
supabase.auth.signInWithOtp({ phone })
supabase.auth.signOut()

// Profiles
supabase.from('profiles').select()
supabase.from('profiles').update()

// Properties
supabase.from('properties').select('*, units(*)')
supabase.from('properties').insert()
supabase.from('properties').update()

// Units
supabase.from('units').select('*, property(*)')
supabase.from('units').insert()

// And so on for all tables...
```

### 10.2 Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| /mpesa-stk-push | Initiate M-Pesa payment | HTTP |
| /mpesa-callback | Handle M-Pesa response | Webhook |
| /send-sms | Send SMS via Africa's Talking | HTTP |
| /send-email | Send email via SendGrid | HTTP |
| /generate-lease | Generate PDF lease | HTTP |
| /calculate-tenant-score | Update tenant score | Scheduled |
| /process-escrow-release | Release escrow funds | HTTP |

### 10.3 Realtime Subscriptions

```typescript
// Chat messages
supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    handleNewMessage
  )
  .subscribe()

// Notifications
supabase
  .channel('notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    handleNotification
  )
  .subscribe()
```

---

## 11. Security

### 11.1 Row Level Security (RLS)

```sql
-- Example: Users can only read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Example: Landlords can only edit their own properties
CREATE POLICY "Landlords can update own properties" ON properties
  FOR UPDATE USING (auth.uid() = landlord_id);

-- Example: Only verified users can apply for properties
CREATE POLICY "Verified users can create applications" ON applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND verification_level IN ('verified', 'premium')
    )
  );
```

### 11.2 Data Protection
- All sensitive documents stored in private buckets
- RLS on all tables
- Encrypted connections (HTTPS)
- Input validation (Zod schemas)
- Rate limiting on auth endpoints

### 11.3 Payment Security
- No card data stored locally
- M-Pesa handles sensitive data
- Transaction logging
- Webhook signature verification

---

## 12. Deployment

### 12.1 Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend | Vercel | Next.js hosting |
| Backend | Supabase | Database, Auth, Storage, Functions |
| CDN | Cloudflare | Caching, DDoS protection |
| Monitoring | Sentry | Error tracking |
| Analytics | PostHog | Product analytics |

### 12.2 Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local dev | localhost:3000 |
| Staging | Testing | staging.mitasafi.co.ke |
| Production | Live | app.mitasafi.co.ke |

---

## 13. MVP Scope

### Phase 1: Core Platform (MVP)
**Duration:** 8-10 weeks

**Features:**
- [ ] User authentication (Email, Phone, Google)
- [ ] User profiles with basic verification
- [ ] Property listing (create, edit, view)
- [ ] Property search with filters
- [ ] Google Maps integration
- [ ] Property detail pages with images
- [ ] Save/compare properties
- [ ] In-app chat (text only)
- [ ] Basic tenant application flow
- [ ] M-Pesa payment integration
- [ ] Basic landlord dashboard
- [ ] Basic tenant dashboard
- [ ] Responsive design (mobile-first)

### Phase 2: Enhanced Features
**Duration:** 6-8 weeks

**Features:**
- [ ] Video tours (uploaded)
- [ ] Live video calls
- [ ] Escrow for deposits
- [ ] Digital lease signing
- [ ] Service provider listings
- [ ] Service booking flow
- [ ] Reviews and ratings
- [ ] Push notifications
- [ ] Tenant Score (basic)

### Phase 3: Advanced Features
**Duration:** 6-8 weeks

**Features:**
- [ ] Full verification system
- [ ] Premium subscriptions
- [ ] Advanced analytics
- [ ] AI-powered search
- [ ] Loyalty program
- [ ] Split payments
- [ ] Neighbor Connect
- [ ] Bundle deals
- [ ] Rental insurance integration

---

## 14. Success Metrics

### 14.1 Key Performance Indicators (KPIs)

| Metric | Target (6 months) |
|--------|-------------------|
| Registered tenants | 10,000 |
| Active landlords | 500 |
| Listed properties | 2,000 |
| Listed units | 5,000 |
| Successful tenancies | 500 |
| Service providers | 200 |
| Monthly active users | 5,000 |
| Rent collected (KES) | 50M |

### 14.2 Business Metrics

| Metric | Target |
|--------|--------|
| Landlord conversion (free to paid) | 15% |
| Service provider commission revenue | 5M KES/month |
| Customer acquisition cost | < 500 KES |
| Customer lifetime value | > 5,000 KES |
| NPS Score | > 50 |

---

## 15. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low landlord adoption | High | Free listings, value proposition |
| Payment failures | High | Multiple payment options, retries |
| Fraud/scams | High | Verification, escrow, reporting |
| Competition | Medium | Feature differentiation, UX |
| Regulatory issues | Medium | Legal compliance, licenses |
| Technical scalability | Medium | Supabase scales, optimize queries |

---

## 16. Appendix

### 16.1 Nairobi Area Codes

Reference data for property locations will include comprehensive sub-county, ward, and area mapping.

### 16.2 Service Provider Categories

Detailed categorization for marketplace organization.

### 16.3 Amenities List

Standardized amenities for filtering:
- Parking, Swimming Pool, Gym, Security, CCTV
- Generator, Borehole, Lift, Balcony, Garden
- Pet Friendly, Furnished, WiFi Ready, etc.

---

**Document Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 30, 2024 | Team | Initial PRD |

---

*This document serves as the foundation for the Mitasafi platform development. It will be updated as requirements evolve.*
