# MitaSafi Commercial Unit Listings - Design Document

> **Document Version:** 2.0  
> **Last Updated:** January 3, 2026  
> **Status:** Planning & Design  
> **Related:** MITASAFI_PROPERTY_MANAGEMENT.md, MITASAFI_PRD.md

---

## Executive Summary

This document outlines the comprehensive design for adding **commercial property listings** to the MitaSafi platform. The implementation extends the existing residential listing wizard with commercial-specific flows covering **10 major categories and 70+ property sub-types**.

### Key Principles
- **Simplicity**: Progressive disclosure, smart defaults
- **Accuracy**: Realistic validation, auto-calculations
- **Clean UI**: Consistent design system (teal selections, orange CTA)
- **Minimal Cognitive Load**: One decision at a time, helpful context

---

## Table of Contents

1. [Commercial Property Taxonomy](#1-commercial-property-taxonomy)
2. [Residential vs Commercial Comparison](#2-residential-vs-commercial-comparison)
3. [Category Deep Dives](#3-category-deep-dives)
4. [Wizard Flow Design](#4-wizard-flow-design)
5. [Step-by-Step Specifications](#5-step-by-step-specifications)
6. [Database Schema](#6-database-schema)
7. [Code Reuse Strategy](#7-code-reuse-strategy)
8. [Implementation Phases](#8-implementation-phases)
9. [Kenya Market Context](#9-kenya-market-context)
10. [Appendices](#10-appendices)

---

## 1. Commercial Property Taxonomy

### Complete Classification (70+ Sub-types)

```
COMMERCIAL PROPERTIES
│
├── 1. OFFICE SPACES
│   ├── Executive Suite (10-50 sqm)
│   ├── Small Office (50-200 sqm)
│   ├── Medium Office (200-500 sqm)
│   ├── Large Office (500-2000 sqm)
│   ├── Full Floor (2000+ sqm)
│   ├── Co-working Space
│   ├── Virtual Office
│   └── Business Center
│
├── 2. RETAIL SPACES
│   ├── Street-Front Shop
│   ├── Mall Unit / Shopping Center
│   ├── Kiosk / Stall
│   ├── Showroom
│   ├── Supermarket Space
│   ├── Pharmacy Space
│   └── Anchor Store
│
├── 3. FOOD & BEVERAGE (F&B)
│   ├── Restaurant Space
│   ├── Café / Coffee Shop
│   ├── Fast Food Outlet
│   ├── Bar / Pub / Club
│   ├── Butchery Space
│   ├── Bakery Space
│   └── Food Court Unit
│
├── 4. WAREHOUSE & INDUSTRIAL
│   ├── Distribution Center
│   ├── Storage Warehouse
│   ├── Light Industrial / Workshop
│   ├── Cold Storage / Cold Room
│   ├── Godown (Basic Warehouse)
│   ├── Container Yard
│   ├── Flex Space (Office + Warehouse)
│   └── Manufacturing Facility
│
├── 5. AUTOMOTIVE & TRANSPORT
│   ├── Car Wash Bay
│   ├── Parking Space (Single/Multiple)
│   ├── Parking Lot (Open)
│   ├── Parking Building / Silo
│   ├── Petrol / Service Station
│   ├── Garage / Auto Repair
│   ├── Car Showroom
│   ├── Matatu / Bus Terminus
│   └── Boda Boda Stage
│
├── 6. COMMERCIAL LAND
│   ├── Commercial Plot (Undeveloped)
│   ├── Industrial Plot
│   ├── Mixed-Use Plot
│   ├── Roadside Plot (High Visibility)
│   ├── Corner Plot
│   └── Leasehold Land
│
├── 7. HOSPITALITY & EVENTS
│   ├── Hotel / Guest House
│   ├── Serviced Apartments (Commercial)
│   ├── Airbnb-Ready Unit
│   ├── Event Hall / Function Space
│   ├── Conference Center
│   ├── Outdoor Event Venue
│   └── Wedding Garden / Grounds
│
├── 8. HEALTHCARE & WELLNESS
│   ├── Clinic Space
│   ├── Dental Office
│   ├── Pharmacy / Chemist
│   ├── Laboratory Space
│   ├── Gym / Fitness Center
│   ├── Spa / Salon Space
│   └── Veterinary Clinic
│
├── 9. EDUCATIONAL & INSTITUTIONAL
│   ├── School Building
│   ├── Training Center
│   ├── Daycare / Kindergarten
│   ├── Tuition Center
│   └── Religious Building
│
└── 10. SPECIALIZED / OTHER
    ├── Bank Branch Space
    ├── ATM Location
    ├── Billboard / Advertising Space
    ├── Storage Unit (Self-Storage)
    ├── Data Center Space
    └── Telecom Tower Site
```

### Category Summary

| Category | Sub-Types | Primary Users |
|----------|-----------|---------------|
| Office | 8 | Businesses, professionals |
| Retail | 7 | Shops, brands |
| F&B | 7 | Restaurants, bars |
| Warehouse | 8 | Logistics, storage |
| Automotive | 9 | Car wash, parking, petrol |
| Commercial Land | 6 | Developers, investors |
| Hospitality | 7 | Hotels, event venues |
| Healthcare | 7 | Clinics, gyms |
| Educational | 5 | Schools, training |
| Specialized | 6 | Billboards, storage |
| **Total** | **70+** | — |

---

## 2. Residential vs Commercial Comparison

### 2.1 Fundamental Differences

| Aspect | Residential | Commercial |
|--------|-------------|------------|
| **Unit Measurement** | Bedrooms/Bathrooms | Square footage/meters only |
| **Tenant Type** | Individuals/Families | Businesses/Companies |
| **Lease Terms** | 6-24 months typical | 1-10+ years typical |
| **Rent Calculation** | Fixed monthly | Per sqft/sqm OR fixed OR revenue share |
| **Fit-out** | Furnished/Unfurnished | Shell, Semi-fitted, Fully-fitted |
| **Utilities Focus** | Water, power backup | Power load (kVA), internet, loading |
| **Key Amenities** | Kitchen, parking, security | Parking ratio, loading bay, signage |
| **Deposits** | 1-3 months | 3-12 months common |
| **Rent Escalation** | Rare/annual | Built into lease (5-10% annually) |
| **Goodwill/Key Money** | Never | Common for prime locations |

### 2.2 Field Reusability Analysis

#### ✅ Reusable Fields (No Changes)
- Location (address, area, coordinates, landmarks)
- Photos & video upload
- Building name
- Currency & payment methods
- Basic security features
- Title & description generation
- Publish/draft workflow

#### 🔄 Modified Fields
- Size → Primary field (not secondary)
- Parking → More detailed (ratio, types)
- Condition → Fit-out Level
- Deposit → 3-12 months options
- Lease terms → Years, not months

#### 🆕 New Fields by Category
See Section 3 for category-specific fields.

---

## 3. Category Deep Dives

### 3.1 Office Spaces

**Sub-types:** Executive Suite | Small Office | Medium Office | Large Office | Full Floor | Co-working | Virtual Office | Business Center

#### Key Attributes
| Attribute | Input Type | Required |
|-----------|------------|----------|
| Total Size (sqm) | Number | Yes |
| Floor Level | Dropdown | Yes |
| Ceiling Height (m) | Number | No |
| Fit-out Level | Radio (Shell/Semi/Fitted/Furnished) | Yes |
| Layout Type | Radio (Open/Partitioned/Mixed) | No |
| Workstation Capacity | Number | No |
| Private Offices | Number | No |
| Meeting Rooms | Number | No |
| Power Load (kVA) | Number | Yes |
| 3-Phase Power | Checkbox | No |
| HVAC Type | Dropdown (None/Central/Split) | No |
| Fiber Internet | Checkbox | No |
| Server Room | Checkbox | No |
| Reception | Radio (None/Shared/Private) | No |
| Pantry/Kitchen | Radio (None/Shared/Private) | No |

#### Office Amenities
- [ ] 24/7 Access
- [ ] Backup generator
- [ ] Conference rooms (bookable)
- [ ] Reception services
- [ ] Mail handling
- [ ] Printing facilities
- [ ] Cafeteria
- [ ] Gym access
- [ ] Rooftop terrace
- [ ] Shower facilities
- [ ] Bike storage

---

### 3.2 Retail Spaces

**Sub-types:** Street-Front | Mall Unit | Kiosk | Showroom | Supermarket | Pharmacy | Anchor Store

#### Key Attributes
| Attribute | Input Type | Required |
|-----------|------------|----------|
| Total Size (sqm) | Number | Yes |
| Frontage Width (m) | Number | Yes |
| Ceiling Height (m) | Number | No |
| Fit-out Level | Radio | Yes |
| Storage Room (sqm) | Number | No |
| Foot Traffic | Rating (Low/Med/High/Very High) | Yes |
| Visibility Rating | 1-5 stars | No |
| Display Windows | Checkbox + dimensions | No |
| Signage Rights | Radio (None/Fascia/Projecting/Building) | No |
| Loading Access | Dropdown (None/Shared/Dedicated) | No |

#### Retail Amenities
- [ ] Air conditioning
- [ ] Display lighting
- [ ] Security shutters
- [ ] Back office
- [ ] Staff toilet
- [ ] Customer toilet
- [ ] Wheelchair access
- [ ] Customer parking
- [ ] Directory listing

---

### 3.3 Food & Beverage (F&B)

**Sub-types:** Restaurant | Café | Fast Food | Bar/Pub/Club | Butchery | Bakery | Food Court Unit

#### Key Attributes
| Attribute | Input Type | Required |
|-----------|------------|----------|
| Total Size (sqm) | Number | Yes |
| Kitchen Size (sqm) | Number | Yes |
| Seating Capacity | Number | Yes |
| Outdoor Seating (sqm) | Number | No |
| Ceiling Height (m) | Number | No |
| Exhaust System | Radio (Existing/Provision/None) | Yes |
| Grease Trap | Radio (Existing/Provision/None) | Yes |
| Gas Connection | Radio (Piped/Cylinder/None) | No |
| Water Points | Number | No |
| Cold Room | Checkbox + size | No |
| Fire Suppression | Radio (Hood/Sprinkler/None) | No |
| Liquor License Eligible | Checkbox | No |
| Late Night Permitted | Checkbox | No |
| Delivery Access | Radio (Rear/Shared/None) | No |

#### F&B Amenities
- [ ] Commercial kitchen hood
- [ ] Walk-in cold room
- [ ] Dry storage room
- [ ] Staff changing room
- [ ] Staff toilets
- [ ] Customer toilets
- [ ] Wheelchair access
- [ ] Outdoor seating area
- [ ] Live music permitted
- [ ] Shisha permitted
- [ ] Delivery pickup area

---

### 3.4 Warehouse & Industrial

**Sub-types:** Distribution | Storage | Light Industrial | Cold Storage | Godown | Container Yard | Flex Space | Manufacturing

#### Key Attributes
| Attribute | Input Type | Required |
|-----------|------------|----------|
| Total Size (sqm) | Number | Yes |
| Warehouse Area (sqm) | Number | Yes |
| Office Area (sqm) | Number | No |
| Yard Area (sqm) | Number | No |
| Clear Height (m) | Number | Yes |
| Floor Load (kg/sqm) | Number | No |
| Loading Docks | Number | No |
| Drive-In Doors | Number + size | No |
| Power Load (kVA) | Number | Yes |
| 3-Phase Power | Checkbox | Yes |
| Sprinkler System | Checkbox | No |
| Cold Storage | Checkbox + temp range | No |
| Crane/Hoist | Checkbox + capacity | No |
| Operating Hours | Radio (Business/24-7) | No |
| Hazmat Approved | Checkbox | No |

#### Warehouse Amenities
- [ ] Truck parking
- [ ] Container handling
- [ ] Weighbridge
- [ ] Forklift included
- [ ] Pallet racking
- [ ] Fire suppression
- [ ] Guard house
- [ ] Driver rest area

---

### 3.5 Automotive & Transport

#### 3.5.1 Car Wash Bay

**Sub-types:** Manual | Automatic/Tunnel | Self-Service | Detailing Bay | Truck Wash

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Number of Bays | Number | Yes |
| Bay Dimensions (m) | Text | Yes |
| Water Source | Dropdown (Borehole/County/Tank) | Yes |
| Water Recycling | Checkbox | No |
| Drainage System | Dropdown (Oil trap/Soak pit/Sewer) | Yes |
| Power Supply (kVA) | Number | Yes |
| Covered/Open | Radio | No |
| Vacuum Points | Number | No |
| Waiting Area | Checkbox + capacity | No |
| Detailing Room | Checkbox + sqm | No |

**Car Wash Amenities:** Pressure washer | Water recycling | Covered waiting | Customer WiFi | Interior detailing | Engine wash | Waxing station | M-Pesa payment

---

#### 3.5.2 Parking Space

**Sub-types:** Single Space | Multiple Bays | Open Lot | Multi-Story | Basement

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Number of Spaces | Number | Yes |
| Space Type | Dropdown (Compact/Standard/Large/Truck) | No |
| Covered/Open | Radio | Yes |
| Surface Type | Dropdown (Tarmac/Cabro/Gravel/Concrete) | No |
| Access Control | Dropdown (Boom/Card/Manual/Open) | No |
| Operating Hours | Radio (24-7/Business/Custom) | No |
| Height Clearance (m) | Number | No |
| EV Charging Points | Number | No |
| Security | Checkboxes (Guards/CCTV) | No |

**Pricing Models:** Hourly | Daily | Monthly | Annual | Event-based

---

#### 3.5.3 Petrol / Service Station

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Number of Pumps | Number | Yes |
| Fuel Types | Multi-select | Yes |
| Underground Tank Capacity (L) | Number | Yes |
| Canopy Size (sqm) | Number | No |
| Convenience Store (sqm) | Number | No |
| Car Wash Bays | Number | No |
| Service Bays | Number | No |
| 24-Hour Operation | Checkbox | No |
| Brand Affiliation | Text | No |

---

#### 3.5.4 Garage / Auto Repair

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Workshop Size (sqm) | Number | Yes |
| Number of Bays | Number | Yes |
| Lift/Hoist | Number + type | No |
| Ceiling Height (m) | Number | No |
| Inspection Pit | Checkbox | No |
| Compressed Air | Checkbox | No |
| Parts Storage (sqm) | Number | No |
| Customer Waiting (sqm) | Number | No |

---

### 3.6 Commercial Land

**Sub-types:** Commercial Plot | Industrial Plot | Mixed-Use | Roadside | Corner Plot | Leasehold

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Plot Size (acres/sqm) | Number + unit | Yes |
| Dimensions (L x W) | Text | No |
| Road Frontage (m) | Number | Yes |
| Corner Plot | Checkbox | No |
| Zoning Type | Dropdown (Commercial/Industrial/Mixed) | Yes |
| Plot Ratio | Number (%) | No |
| Ground Coverage | Number (%) | No |
| Max Floors Allowed | Number | No |
| Title Type | Radio (Freehold/Leasehold) | Yes |
| Lease Years Remaining | Number | If leasehold |
| Approved Plans | Checkbox | No |
| Terrain | Dropdown (Flat/Sloped/Hilly) | No |
| Utilities Available | Checkboxes (Water/Power/Sewer) | No |

**Land Features:** Perimeter fenced | Gate | Security | Water connection | Electricity | Sewer | Borehole | Existing structures | Level terrain

---

### 3.7 Hospitality & Events

#### 3.7.1 Hotel / Guest House

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Number of Rooms | Number | Yes |
| Room Breakdown | JSON (standard/deluxe/suite) | No |
| Total Beds | Number | No |
| Star Rating | 1-5 | No |
| Restaurant Seats | Number | No |
| Conference Capacity | Number | No |
| Swimming Pool | Checkbox + size | No |
| Parking Spaces | Number | No |
| Current Occupancy Rate | Percentage | No |

---

#### 3.7.2 Event Hall / Function Space

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Indoor Capacity (seated) | Number | Yes |
| Indoor Capacity (standing) | Number | No |
| Outdoor Capacity | Number | No |
| Hall Dimensions (L x W x H) | Text | No |
| Stage Area (sqm) | Number | No |
| Breakout Rooms | Number + capacity | No |
| Catering Kitchen | Checkbox | No |
| Sound System | Checkbox | No |
| Projector/Screen | Checkbox | No |
| A/C | Radio (Central/Split/None) | No |
| Noise Curfew | Time | No |
| Parking Spaces | Number | No |

**Event Amenities:** Tables/chairs | Stage | Sound system | Projector | Lighting | Dance floor | Bridal suite | Bar setup | Garden | Valet service

---

### 3.8 Healthcare & Wellness

#### 3.8.1 Clinic / Medical Space

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Total Size (sqm) | Number | Yes |
| Consultation Rooms | Number | Yes |
| Treatment Rooms | Number | No |
| Waiting Area (sqm + capacity) | Text | No |
| Laboratory Space | Checkbox + sqm | No |
| Pharmacy Space | Checkbox + sqm | No |
| X-Ray Room | Checkbox | No |
| Minor Theatre | Checkbox | No |
| Medical Gas | Radio (Plumbed/Portable/None) | No |
| Backup Power | Radio (Generator/UPS/Both) | Yes |

---

#### 3.8.2 Gym / Fitness Center

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Total Size (sqm) | Number | Yes |
| Main Gym Floor (sqm) | Number | Yes |
| Studio Rooms | Number + sqm | No |
| Locker Rooms (sqm) | Number | No |
| Showers | Number (M/F) | No |
| Ceiling Height (m) | Number | No |
| Floor Type | Dropdown (Rubber/Wood/Concrete) | No |
| Pool | Checkbox + size | No |
| Sauna/Steam | Checkbox | No |
| Parking Spaces | Number | No |

---

### 3.9 Educational & Institutional

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Total Land (acres/sqm) | Number | Yes |
| Building Size (sqm) | Number | Yes |
| Number of Classrooms | Number | Yes |
| Classroom Capacity | Number | No |
| Computer Lab | Checkbox + capacity | No |
| Science Lab | Checkbox | No |
| Library (sqm) | Number | No |
| Assembly Hall Capacity | Number | No |
| Playground (sqm) | Number | No |
| Sports Field (sqm) | Number | No |
| Dormitory Beds | Number | No |
| Parking Spaces | Number | No |

---

### 3.10 Specialized / Other

#### Billboard / Advertising Space

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Dimensions (W x H) | Text | Yes |
| Type | Dropdown (Static/Digital/Wrap/Rooftop) | Yes |
| Daily Traffic Count | Number | No |
| Visibility Distance (m) | Number | No |
| Facing Direction | Dropdown | No |
| Illuminated | Checkbox | No |
| Permit Valid Until | Date | No |

#### Storage Unit (Self-Storage)

| Attribute | Input Type | Required |
|-----------|------------|----------|
| Unit Size (sqm) | Number | Yes |
| Unit Height (m) | Number | No |
| Climate Controlled | Checkbox | No |
| Ground Floor | Checkbox | No |
| Access Hours | Radio (24-7/Business) | No |
| Security | Checkboxes | No |

---

## 4. Wizard Flow Design

### 4.1 Primary Category Selection (Step 1 - Level 1)

```
What type of commercial space?

┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  🏢     │ │  🏪     │ │  🍽️     │ │  🏭     │ │  🚗     │
│ Office  │ │ Retail  │ │  F&B    │ │Warehouse│ │Automotive│
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘

┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  🏞️     │ │  🏨     │ │  🏥     │ │  🎓     │ │  📋     │
│  Land   │ │Hospital-│ │Health & ││Education│ │ Other   │
│         │ │  ity    │ │Wellness │ │         │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 4.2 Step Structure by Flow

| Step | Residential | Commercial |
|------|-------------|------------|
| 1 | Property Type | Category → Sub-type |
| 2 | Location | Location (+ floor/wing) |
| 3 | Details (beds/baths) | Space Details (by category) |
| 4 | Amenities | Commercial Amenities (by category) |
| 5 | Photos | Photos (category-specific labels) |
| 6 | Pricing | Commercial Pricing |
| 7 | Review | Review (category-adjusted) |

### 4.3 Pricing Models by Category

| Category | Common Pricing | Typical Terms |
|----------|---------------|---------------|
| Office | Per sqm/month | 1-5 years |
| Retail | Per sqm OR revenue share | 1-10 years |
| F&B | Per sqm + revenue share | 2-5 years |
| Warehouse | Per sqm/month | 1-5 years |
| Car Wash | Fixed + revenue share | 1-3 years |
| Parking | Per space/month | Monthly-Annual |
| Petrol Station | Revenue share | 5-15 years |
| Land | Per acre/sqm (sale/lease) | Lease term |
| Hotel | Fixed OR revenue share | 5-20 years |
| Event Space | Per event OR monthly | Event/Monthly |
| Healthcare | Per sqm/month | 2-5 years |
| Educational | Fixed monthly | 1-10 years |
| Billboard | Monthly/Annual | 1-5 years |

---

## 5. Step-by-Step Specifications

### 5.1 Step 1: Category Selection UI

```
┌─────────────────────────────────────────────────────────────┐
│            What type of space are you listing?              │
│                                                             │
│  [Residential]              [Commercial] ← selected         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Select commercial category:                                │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 🏢      │ │ 🏪      │ │ 🍽️      │ │ 🏭      │ ...       │
│  │ Office  │ │ Retail  │ │  F&B    │ │Warehouse│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  Sub-type (after category selection):                       │
│  ○ Executive Suite  ○ Small Office  ● Medium Office        │
│  ○ Large Office     ○ Full Floor    ○ Co-working           │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Step 3: Space Details (Example - Office)

```
┌─────────────────────────────────────────────────────────────┐
│              Tell us about the office space                 │
│                                                             │
│  SPACE METRICS                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Total Size *         Fit-out Level *                 │   │
│  │ [    150    ] sqm    ○ Shell  ● Fitted  ○ Furnished │   │
│  │                                                       │   │
│  │ Floor Level          Ceiling Height                   │   │
│  │ [ 5th Floor ▼]       [   3.0   ] m                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  CONFIGURATION                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Layout: ○ Open Plan  ● Partitioned  ○ Mixed         │   │
│  │ Workstation Capacity: [  25  ] people               │   │
│  │ Private Offices: [-] 3 [+]   Meeting Rooms: [-] 2 [+]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  INFRASTRUCTURE                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Power Capacity *: [  50  ] kVA                       │   │
│  │ ☑ 3-Phase Power   ☑ Fiber Ready   ☐ Server Room    │   │
│  │ HVAC: ○ None  ○ Central  ● Split Units             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Step 6: Commercial Pricing

```
┌─────────────────────────────────────────────────────────────┐
│                    Set your pricing                         │
│                                                             │
│  RENT                                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Pricing Model: ● Per sqm/month  ○ Fixed monthly     │   │
│  │                ○ Revenue share  ○ Fixed + revenue    │   │
│  │                                                       │   │
│  │ Rate: KSh [ 800 ]/sqm    Total: KSh 120,000/month   │   │
│  │ ☑ Rent negotiable                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ADDITIONAL COSTS                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Service Charge (CAM): KSh [ 15,000 ]/month          │   │
│  │ Includes: ☑ Security ☑ Cleaning ☑ Garbage ☐ Parking│   │
│  │                                                       │   │
│  │ Deposit: [  6  ] months = KSh 720,000               │   │
│  │ Goodwill/Key Money: ☐ Required  Amount: [       ]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  LEASE TERMS                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Minimum Lease: [  2  ] years                        │   │
│  │ Rent Escalation: [ 7.5 ]%/year                      │   │
│  │ Available From: [ 📅 Feb 1, 2026 ]                   │   │
│  │ TI Allowance: ☑ Offered  Up to KSh [ 500,000 ]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PAYMENT                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Methods: ☑ Bank ☑ Cheque ☐ M-Pesa ☐ Cash           │   │
│  │ Frequency: ○ Monthly  ● Quarterly  ○ Annual        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Database Schema

### 6.0 TypeScript Types

```typescript
// In types.ts - Full Commercial Type Definitions
export type ListingCategory = "residential" | "commercial";

export type CommercialType = 
  | "office" 
  | "retail" 
  | "food_beverage" 
  | "warehouse" 
  | "automotive" 
  | "commercial_land" 
  | "hospitality" 
  | "healthcare" 
  | "educational" 
  | "specialized";

// Sub-types for each category
export type OfficeSubtype = 
  | "executive_suite" | "small_office" | "medium_office" | "large_office" 
  | "full_floor" | "entire_building" | "coworking_desk" | "coworking_private" 
  | "virtual_office" | "serviced_office";

export type RetailSubtype = 
  | "street_front" | "mall_unit" | "anchor_store" | "kiosk" | "cart" 
  | "showroom" | "pop_up" | "market_stall";

export type FoodBeverageSubtype = 
  | "restaurant_space" | "cafe_space" | "fast_food" | "bar_lounge" 
  | "club_space" | "cloud_kitchen" | "food_court" | "bakery_space";

export type WarehouseSubtype = 
  | "distribution" | "storage" | "cold_storage" | "godown" 
  | "fulfillment_center" | "light_manufacturing" | "heavy_industrial" | "flex_space";

export type AutomotiveSubtype = 
  | "parking_lot" | "parking_building" | "garage_workshop" | "car_wash" 
  | "petrol_station" | "car_showroom" | "auto_yard";

export type CommercialLandSubtype = 
  | "development_plot" | "industrial_plot" | "commercial_plot" 
  | "mixed_use_plot" | "billboard_site" | "storage_yard" | "container_yard";

export type HospitalitySubtype = 
  | "hotel_building" | "guest_house" | "serviced_apartment" | "hostel" 
  | "event_venue" | "conference_center" | "wedding_venue";

export type HealthcareSubtype = 
  | "clinic_space" | "dental_clinic" | "pharmacy_space" | "lab_space" 
  | "hospital_building" | "rehab_facility" | "medical_office";

export type EducationalSubtype = 
  | "school_building" | "training_center" | "classroom_rental" 
  | "daycare_space" | "tutoring_center" | "driving_school";

export type SpecializedSubtype = 
  | "data_center" | "recording_studio" | "photo_studio" | "gym_fitness" 
  | "salon_spa" | "religious_facility" | "funeral_home" | "bank_branch" | "atm_site";

export type CommercialSubtype = 
  | OfficeSubtype | RetailSubtype | FoodBeverageSubtype | WarehouseSubtype 
  | AutomotiveSubtype | CommercialLandSubtype | HospitalitySubtype 
  | HealthcareSubtype | EducationalSubtype | SpecializedSubtype;
```

---

### 5.2 Step 2: Location (Reusable)

The existing `Step2Location.tsx` can be reused with minor additions:

#### Additional Fields for Commercial
- **Floor Number** (important for offices in multi-story buildings)
- **Wing/Tower** (for large complexes like "Tower A, Wing B")
- **Building Grade** (A, B, C for offices)

#### Validation Changes
- Same validation rules apply
- Add floor number validation for offices

---

### 5.3 Step 3: Space Details (Type-Specific)

#### 3A: Office Details

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Tell us about the office space                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SPACE METRICS                                        │   │
│  │                                                       │   │
│  │ Total Size *                    Fit-out Level *      │   │
│  │ ┌─────────────────┐            ○ Shell (bare)        │   │
│  │ │ 150             │ sqm        ○ Semi-fitted         │   │
│  │ └─────────────────┘            ○ Fully-fitted        │   │
│  │                                ● Furnished           │   │
│  │ Floor Level        Ceiling Height                    │   │
│  │ ┌─────────────┐    ┌─────────────┐                   │   │
│  │ │ 5th Floor ▼ │    │ 3.0   │ m                       │   │
│  │ └─────────────┘    └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CONFIGURATION                                        │   │
│  │                                                       │   │
│  │ Layout                         Workstation Capacity  │   │
│  │ ○ Open Plan                    ┌─────────────┐       │   │
│  │ ● Partitioned/Rooms            │ 25          │ ppl   │   │
│  │ ○ Mixed                        └─────────────┘       │   │
│  │                                                       │   │
│  │ Private Offices    Meeting Rooms    Pantry/Kitchen   │   │
│  │   [-] 3 [+]          [-] 2 [+]      ○ None           │   │
│  │                                     ○ Shared          │   │
│  │                                     ● Private         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ INFRASTRUCTURE                                       │   │
│  │                                                       │   │
│  │ Power Capacity *              HVAC/Air Conditioning  │   │
│  │ ┌─────────────┐               ○ None                 │   │
│  │ │ 50          │ kVA           ○ Central (building)   │   │
│  │ └─────────────┘               ● Split Units          │   │
│  │                                                       │   │
│  │ ☑ 3-Phase Power Available     Server Room            │   │
│  │ ☑ Dedicated Meter             ☐ Available            │   │
│  │ ☑ Fiber Internet Ready                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3B: Retail Details

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Tell us about the retail space                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SPACE METRICS                                        │   │
│  │                                                       │   │
│  │ Total Size *        Frontage Width    Ceiling Height │   │
│  │ ┌──────────┐        ┌──────────┐      ┌──────────┐   │   │
│  │ │ 80       │ sqm    │ 6        │ m    │ 4.5      │ m │   │
│  │ └──────────┘        └──────────┘      └──────────┘   │   │
│  │                                                       │   │
│  │ Fit-out Level *                                      │   │
│  │ ○ Shell (bare walls)                                 │   │
│  │ ● Semi-fitted (basic utilities)                      │   │
│  │ ○ Fitted (ready for business)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ VISIBILITY & ACCESS                                  │   │
│  │                                                       │   │
│  │ Foot Traffic *                 Visibility Rating     │   │
│  │ ○ Low    ● Medium   ○ High    ★ ★ ★ ★ ☆  (4/5)      │   │
│  │                                                       │   │
│  │ Display Windows               Signage Rights         │   │
│  │ ☑ Street-facing windows       ○ None allowed         │   │
│  │   Approx size: [3] x [2.5] m  ● Fascia only          │   │
│  │                               ○ Fascia + Projecting  │   │
│  │                               ○ Building signage     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ FACILITIES (Show if Restaurant/Café type)            │   │
│  │                                                       │   │
│  │ ☑ Grease trap installed       ☑ Exhaust ducting     │   │
│  │ ☑ Water points (qty: 3)       ☑ Gas connection      │   │
│  │ ☐ Outdoor seating permitted                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3C: Warehouse Details

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Tell us about the warehouse                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SPACE BREAKDOWN                                      │   │
│  │                                                       │   │
│  │ Total Size *      Warehouse Area    Office Area      │   │
│  │ ┌──────────┐      ┌──────────┐      ┌──────────┐     │   │
│  │ │ 2,500    │ sqm  │ 2,200    │ sqm  │ 300      │ sqm │   │
│  │ └──────────┘      └──────────┘      └──────────┘     │   │
│  │                                                       │   │
│  │ Yard/Outdoor      Clear Height      Floor Capacity   │   │
│  │ ┌──────────┐      ┌──────────┐      ┌──────────┐     │   │
│  │ │ 500      │ sqm  │ 8        │ m    │ 5,000    │kg/m²│   │
│  │ └──────────┘      └──────────┘      └──────────┘     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LOADING & ACCESS                                     │   │
│  │                                                       │   │
│  │ Loading Docks              Drive-In Doors            │   │
│  │   [-] 2 [+] docks           [-] 1 [+] doors          │   │
│  │   Dock levelers: ☑           Size: [4] x [4.5] m     │   │
│  │                                                       │   │
│  │ Vehicle Access                                       │   │
│  │ ☑ Trailer access  ☑ Container trucks  ☑ 40ft trucks │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ INFRASTRUCTURE                                       │   │
│  │                                                       │   │
│  │ Power Capacity *              Special Features       │   │
│  │ ┌──────────┐                 ☑ 3-Phase Power         │   │
│  │ │ 200      │ kVA             ☑ Sprinkler System      │   │
│  │ └──────────┘                 ☐ Crane/Hoist           │   │
│  │                              ☐ Cold Storage          │   │
│  │ Operating Hours              ☐ Hazmat Approved       │   │
│  │ ○ Business hours only                                │   │
│  │ ● 24/7 access allowed                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.4 Step 4: Commercial Amenities

#### Shared Amenities (All Commercial Types)
- [ ] 24/7 Access
- [ ] Security guards (24hr)
- [ ] CCTV surveillance
- [ ] Access control (card/biometric)
- [ ] Visitor management system
- [ ] Dedicated parking
- [ ] Backup generator
- [ ] Fiber internet available

#### Office-Specific Amenities
- [ ] Reception/lobby
- [ ] Conference rooms (bookable)
- [ ] Cafeteria
- [ ] Gym/fitness
- [ ] Rooftop access
- [ ] Shower facilities
- [ ] Mail handling
- [ ] Printing services

#### Retail-Specific Amenities
- [ ] Customer parking
- [ ] Shopping cart storage
- [ ] Delivery bay
- [ ] Security shutters
- [ ] Customer toilets
- [ ] Wheelchair access

#### Warehouse-Specific Amenities
- [ ] Truck parking
- [ ] Forklift available
- [ ] Pallet racking
- [ ] Weighbridge
- [ ] Guard house
- [ ] Driver amenities

---

### 5.5 Step 5: Photos (Reusable)

Same component with adjusted category labels:

| Residential Categories | Commercial Categories |
|------------------------|----------------------|
| Living Room | Reception / Main Area |
| Kitchen | Pantry / Kitchen |
| Bedroom | Private Office / Work Area |
| Bathroom | Restroom |
| Exterior | Building Exterior |
| — | Loading Area (warehouse) |
| — | Display Window (retail) |
| — | Meeting Room (office) |

---

### 5.6 Step 6: Commercial Pricing

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    Set your pricing                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ RENT                                                 │   │
│  │                                                       │   │
│  │ Pricing Model *                                      │   │
│  │ ● Per square meter/month      ○ Fixed monthly        │   │
│  │                                                       │   │
│  │ Rate per sqm/month *          Total Monthly Rent     │   │
│  │ ┌──────────────────┐          ┌──────────────────┐   │   │
│  │ │ KSh   800        │          │ KSh  120,000     │   │   │
│  │ └──────────────────┘          └──────────────────┘   │   │
│  │                               (150 sqm × 800/sqm)    │   │
│  │                                                       │   │
│  │ ☑ Rent negotiable                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ADDITIONAL COSTS                                     │   │
│  │                                                       │   │
│  │ Service Charge (CAM)          Deposit               │   │
│  │ ┌──────────────────┐          ┌──────────────────┐   │   │
│  │ │ KSh   15,000     │/month    │   6   │ months   │   │   │
│  │ └──────────────────┘          └──────────────────┘   │   │
│  │                               = KSh 720,000          │   │
│  │                                                       │   │
│  │ Service charge includes:                             │   │
│  │ ☑ Security  ☑ Cleaning  ☑ Garbage  ☐ Parking        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LEASE TERMS                                          │   │
│  │                                                       │   │
│  │ Minimum Lease *               Rent Escalation        │   │
│  │ ┌──────────────────┐          ┌──────────────────┐   │   │
│  │ │   2   │ years    │          │   7.5   │ %/year │   │   │
│  │ └──────────────────┘          └──────────────────┘   │   │
│  │                                                       │   │
│  │ Available From *              Tenant Improvement     │   │
│  │ ┌──────────────────┐          ☑ TI allowance offered │   │
│  │ │ 📅 Feb 1, 2026   │          Up to KSh 500,000     │   │
│  │ └──────────────────┘                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PAYMENT                                              │   │
│  │                                                       │   │
│  │ Accepted Methods *                                   │   │
│  │ ☑ Bank Transfer  ☑ Cheque  ☐ M-Pesa  ☐ Cash         │   │
│  │                                                       │   │
│  │ Payment Frequency: ○ Monthly  ● Quarterly  ○ Annual │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Pricing Differences from Residential

| Aspect | Residential | Commercial |
|--------|-------------|------------|
| Pricing model | Fixed monthly only | Per sqm OR fixed |
| Deposit | 1-3 months | 3-12 months |
| Lease minimum | 6-24 months | 1-10 years |
| Escalation | Not common | 5-10% annually |
| TI Allowance | N/A | Common for fitted spaces |
| Payment frequency | Monthly | Monthly/Quarterly/Annual |

---

### 5.7 Step 7: Review (Conditional Display)

Same structure as residential, but display:

| Residential Display | Commercial Display |
|--------------------|-------------------|
| 3 Bedrooms, 2 Bathrooms | 150 sqm Office Space |
| Furnished | Fully-fitted |
| KSh 85,000/month | KSh 800/sqm (KSh 120,000/month) |
| 12 months minimum | 2 years minimum |
| — | 7.5% annual escalation |

---

## 6. Database Schema

### 6.1 Extend Listings Table - Core Fields

```sql
-- ===========================================
-- COMMERCIAL LISTING FIELDS MIGRATION
-- ===========================================

-- Category and Type (10 Categories)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_category TEXT DEFAULT 'residential' 
  CHECK (listing_category IN ('residential', 'commercial'));

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS commercial_type TEXT
  CHECK (commercial_type IN (
    'office', 'retail', 'food_beverage', 'warehouse', 'automotive', 
    'commercial_land', 'hospitality', 'healthcare', 'educational', 'specialized'
  ));

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS commercial_subtype TEXT;

-- Common Space Details (All Commercial Types)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fitout_level TEXT
  CHECK (fitout_level IN ('shell', 'semi_fitted', 'fitted', 'furnished'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ceiling_height_m DECIMAL(4,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS clear_height_m DECIMAL(4,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS floor_load_capacity INTEGER; -- kg/sqm
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS power_kva INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_3phase_power BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS floor_level TEXT; -- "Ground", "5th Floor", etc.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS building_grade TEXT CHECK (building_grade IN ('A', 'B', 'C'));
```

### 6.2 Office-Specific Fields

```sql
-- Office Space Fields
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS workstation_capacity INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS private_offices INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS meeting_rooms INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS layout_type TEXT
  CHECK (layout_type IN ('open_plan', 'partitioned', 'mixed'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS hvac_type TEXT
  CHECK (hvac_type IN ('none', 'central', 'split'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_server_room BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_fiber_ready BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_reception BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_pantry TEXT CHECK (has_pantry IN ('none', 'shared', 'private'));
```

### 6.3 Retail-Specific Fields

```sql
-- Retail Space Fields
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS frontage_width_m DECIMAL(4,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS foot_traffic TEXT
  CHECK (foot_traffic IN ('low', 'medium', 'high', 'very_high'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS visibility_rating INTEGER CHECK (visibility_rating BETWEEN 1 AND 5);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS signage_rights TEXT
  CHECK (signage_rights IN ('none', 'fascia', 'fascia_projecting', 'building'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_display_windows BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS display_window_size TEXT; -- e.g., "3x2.5m"
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS mall_name TEXT; -- If in a mall
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS anchor_tenant_nearby TEXT; -- e.g., "Next to Carrefour"
```

### 6.4 Food & Beverage-Specific Fields

```sql
-- F&B Space Fields
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS grease_trap BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS exhaust_system BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS exhaust_ducting_to_roof BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS gas_connection BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS water_points INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS outdoor_seating BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS outdoor_seating_capacity INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS liquor_license_eligible BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS kitchen_area_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS seating_capacity INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS bar_counter BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS walk_in_cooler BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS delivery_ready BOOLEAN DEFAULT false; -- For cloud kitchens
```

### 6.5 Warehouse-Specific Fields

```sql
-- Warehouse Space Fields
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS warehouse_area_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS office_area_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS yard_area_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS loading_docks INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS drive_in_doors INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS drive_in_door_size TEXT; -- e.g., "4x4.5m"
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_dock_levelers BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_sprinklers BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS cold_storage BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS cold_storage_temp_range TEXT; -- e.g., "-18 to 4°C"
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_crane BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS crane_capacity TEXT; -- e.g., "5 ton"
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS hazmat_approved BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS operating_hours TEXT DEFAULT 'business'
  CHECK (operating_hours IN ('business', '24_7'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vehicle_access JSONB DEFAULT '[]';
  -- e.g., ["trailer", "container", "40ft_truck"]
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_weighbridge BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS eacc_bonded BOOLEAN DEFAULT false; -- For customs bonding
```

### 6.6 Automotive-Specific Fields

```sql
-- Automotive Space Fields (Parking, Car Wash, Garage, Petrol Station)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS parking_spaces INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS parking_type TEXT
  CHECK (parking_type IN ('open', 'covered', 'basement', 'multi_story'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ev_charging_stations INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vehicle_lift_count INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS work_bays INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS inspection_pit BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS car_wash_type TEXT
  CHECK (car_wash_type IN ('manual', 'automatic', 'self_service', 'tunnel'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS water_recycling_system BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fuel_tanks JSONB DEFAULT '[]'; -- [{type: "petrol", capacity: 20000}]
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS pump_islands INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS convenience_store_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS canopy_covered BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS daily_traffic_count INTEGER; -- For petrol stations
```

### 6.7 Commercial Land Fields

```sql
-- Commercial Land Fields
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS plot_size_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS plot_size_acres DECIMAL(10,4);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS zoning_type TEXT
  CHECK (zoning_type IN ('commercial', 'industrial', 'mixed_use', 'special'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS permitted_uses JSONB DEFAULT '[]'; -- e.g., ["retail", "office", "warehouse"]
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS max_coverage_ratio DECIMAL(3,2); -- e.g., 0.60 = 60%
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS max_plot_ratio DECIMAL(4,2); -- e.g., 2.5
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS road_frontage_m DECIMAL(6,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_fenced BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_utilities BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS utilities_available JSONB DEFAULT '[]'; -- ["water", "power", "sewer"]
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_titled BOOLEAN DEFAULT true;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS title_type TEXT CHECK (title_type IN ('freehold', 'leasehold'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS lease_remaining_years INTEGER; -- For leasehold
-- Billboard specific
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS billboard_facing TEXT; -- "North", "Both directions"
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS billboard_size TEXT; -- "40x20 ft"
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS billboard_illuminated BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS billboard_digital BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS daily_impressions INTEGER; -- Estimated viewers
```

### 6.8 Hospitality-Specific Fields

```sql
-- Hospitality Space Fields (Hotels, Event Venues, Guest Houses)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS room_count INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS bed_count INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_restaurant BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_conference_rooms BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS conference_capacity INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_swimming_pool BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS event_capacity_seated INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS event_capacity_standing INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_catering_kitchen BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_stage BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_av_equipment BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS outdoor_space_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS tented_allowed BOOLEAN DEFAULT false;
```

### 6.9 Healthcare-Specific Fields

```sql
-- Healthcare Space Fields
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS consultation_rooms INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS treatment_rooms INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS waiting_area_capacity INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_pharmacy_license BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_lab_license BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS medical_waste_disposal BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS dental_chair_plumbing BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS xray_shielding BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS wheelchair_accessible BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS backup_power_medical BOOLEAN DEFAULT false; -- UPS for medical equipment
```

### 6.10 Educational-Specific Fields

```sql
-- Educational Space Fields
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS classroom_count INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS classroom_capacity INTEGER; -- Per classroom
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS total_student_capacity INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_playground BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS playground_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_computer_lab BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_science_lab BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_library BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_cafeteria BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_sick_bay BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS approved_curriculum JSONB DEFAULT '[]'; -- ["8-4-4", "CBC", "British", "IB"]
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ministry_approved BOOLEAN DEFAULT false;
```

### 6.11 Specialized Facility Fields

```sql
-- Specialized Facility Fields
-- Data Center
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rack_capacity INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS power_redundancy TEXT; -- "N+1", "2N"
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS cooling_type TEXT; -- "precision", "aisle_containment"
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS uptime_tier TEXT CHECK (uptime_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fire_suppression TEXT; -- "FM200", "water_mist"

-- Studio Space
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS soundproofing BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS acoustic_treatment BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS cyclorama_wall BOOLEAN DEFAULT false; -- For photo studios
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS control_room BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS blackout_capability BOOLEAN DEFAULT false;

-- Gym/Fitness
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS gym_floor_sqm INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS high_ceiling_for_gym BOOLEAN DEFAULT false; -- 4m+ for CrossFit etc
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shower_count INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS locker_rooms BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS mirrored_walls BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rubber_flooring BOOLEAN DEFAULT false;

-- Salon/Spa
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS styling_stations INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS wash_basins INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS treatment_beds INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ventilation_for_chemicals BOOLEAN DEFAULT false;

-- ATM Site
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS atm_booth_secure BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS power_backup_24h BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS cctv_coverage BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS direct_street_access BOOLEAN DEFAULT false;
```

### 6.12 Commercial Pricing Fields

```sql
-- Commercial Pricing Fields
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rent_per_sqm DECIMAL(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'fixed'
  CHECK (pricing_model IN ('per_sqm', 'fixed', 'per_space', 'revenue_share', 'daily', 'hourly'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS service_charge_monthly DECIMAL(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS service_charge_per_sqm DECIMAL(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS service_charge_includes JSONB DEFAULT '[]';
  -- e.g., ["security", "cleaning", "garbage", "water", "parking"]
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rent_escalation_percent DECIMAL(4,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS min_lease_months INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS max_lease_years INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ti_allowance DECIMAL(10,2); -- Tenant Improvement
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ti_allowance_per_sqm DECIMAL(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS payment_frequency_commercial TEXT DEFAULT 'monthly'
  CHECK (payment_frequency_commercial IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS revenue_share_percent DECIMAL(5,2); -- For retail/hospitality
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS base_rent_plus_share BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS deposit_months INTEGER DEFAULT 3;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rent_free_period_months INTEGER; -- Common for new spaces
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS goodwill_amount DECIMAL(12,2); -- Key money

-- Commercial Amenities (JSONB for flexibility)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS commercial_amenities JSONB DEFAULT '[]';
  -- Stores array of amenity keys specific to commercial type
```

### 6.13 Indexes for Commercial Queries

```sql
-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(listing_category);
CREATE INDEX IF NOT EXISTS idx_listings_commercial_type ON public.listings(commercial_type) 
  WHERE listing_category = 'commercial';
CREATE INDEX IF NOT EXISTS idx_listings_commercial_subtype ON public.listings(commercial_subtype) 
  WHERE listing_category = 'commercial';
CREATE INDEX IF NOT EXISTS idx_listings_fitout ON public.listings(fitout_level) 
  WHERE listing_category = 'commercial';
CREATE INDEX IF NOT EXISTS idx_listings_size_sqm ON public.listings(size_sqm) 
  WHERE listing_category = 'commercial';
CREATE INDEX IF NOT EXISTS idx_listings_rent_per_sqm ON public.listings(rent_per_sqm) 
  WHERE rent_per_sqm IS NOT NULL;

-- Update property_type constraint to include all types
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_property_type_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_property_type_check 
  CHECK (property_type IN (
    -- Residential
    'bedsitter', 'studio', 'apartment', 'house', 'townhouse', 'maisonette', 'villa', 'room',
    -- Commercial (maps to commercial_type)
    'office', 'retail', 'food_beverage', 'warehouse', 'automotive', 
    'commercial_land', 'hospitality', 'healthcare', 'educational', 'specialized'
  ));
```

---

## 7. Code Reuse Strategy

### 7.1 Components to Reuse Directly (No Changes)

| Component | Path | Reusability |
|-----------|------|-------------|
| WizardProgress | `WizardProgress.tsx` | 100% |
| WizardNavigation | `WizardNavigation.tsx` | 100% |
| Step2Location | `steps/Step2Location.tsx` | 90% (add floor/wing/building grade) |
| Step5Photos | `steps/Step5Photos.tsx` | 85% (different categories per type) |
| usePhotoUpload | `usePhotoUpload.ts` | 100% |
| listing-service | `listing-service.ts` | 70% (significant commercial field additions) |

### 7.2 Components to Extend

| Component | Changes Needed |
|-----------|---------------|
| `context.tsx` | Add commercial form data for all 10 categories, branching logic |
| `types.ts` | Add 70+ commercial types, enums, defaults, validation schemas |
| `Step1PropertyType.tsx` | Add residential/commercial toggle, 10 category selection, sub-types |
| `Step6Pricing.tsx` | Add 6 pricing models, escalation, revenue share, goodwill |
| `Step7Review.tsx` | Conditional display for all commercial field types |

### 7.3 New Components to Create

```
Step3Commercial/
├── index.tsx                   # Router based on commercial type (10 branches)
├── OfficeDetails.tsx           # Office space form
├── RetailDetails.tsx           # Retail space form
├── FoodBeverageDetails.tsx     # Restaurant/café/bar form
├── WarehouseDetails.tsx        # Warehouse/godown form
├── AutomotiveDetails.tsx       # Parking/car wash/garage form
├── CommercialLandDetails.tsx   # Land plots/billboard form
├── HospitalityDetails.tsx      # Hotel/venue form
├── HealthcareDetails.tsx       # Clinic/pharmacy form
├── EducationalDetails.tsx      # School/training center form
└── SpecializedDetails.tsx      # Data center/studio/gym/salon form
```

### 7.4 Recommended File Structure

```
src/app/dashboard/landlord/listings/new/
├── context.tsx                  # Extended with all commercial state
├── types.ts                     # Extended with 10 categories + 70 subtypes
├── page.tsx                     # Main wizard with category branching
├── WizardProgress.tsx           # No change
├── WizardNavigation.tsx         # No change
├── usePhotoUpload.ts            # No change
├── listing-service.ts           # Extended for commercial fields
├── constants/
│   ├── index.ts                 # Export all constants
│   ├── office.ts                # Office subtypes, amenities, defaults
│   ├── retail.ts                # Retail subtypes, amenities
│   ├── food-beverage.ts         # F&B subtypes, kitchen requirements
│   ├── warehouse.ts             # Warehouse subtypes, logistics
│   ├── automotive.ts            # Parking, car wash, garage options
│   ├── commercial-land.ts       # Land types, zoning, billboard
│   ├── hospitality.ts           # Hotel, venue options
│   ├── healthcare.ts            # Medical space requirements
│   ├── educational.ts           # School/training requirements
│   └── specialized.ts           # Data center, studio, gym, salon
└── steps/
    ├── index.ts                 # Export all steps
    ├── Step1PropertyType.tsx    # Extended with commercial (10 categories)
    ├── Step2Location.tsx        # Minor additions (floor, building grade)
    ├── Step3Details.tsx         # Residential only
    ├── Step3Commercial/         # NEW folder with 11 components
    │   ├── index.tsx            # Smart router component
    │   ├── OfficeDetails.tsx
    │   ├── RetailDetails.tsx
    │   ├── FoodBeverageDetails.tsx
    │   ├── WarehouseDetails.tsx
    │   ├── AutomotiveDetails.tsx
    │   ├── CommercialLandDetails.tsx
    │   ├── HospitalityDetails.tsx
    │   ├── HealthcareDetails.tsx
    │   ├── EducationalDetails.tsx
    │   └── SpecializedDetails.tsx
    ├── Step4Amenities.tsx       # Extended with commercial categories
    ├── Step5Photos.tsx          # Photo categories per commercial type
    ├── Step6Pricing.tsx         # 6 pricing models, escalation, etc.
    └── Step7Review.tsx          # Smart conditional rendering
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Database + Types)
**Estimated effort: 2-3 days**

1. Create comprehensive database migration for all 10 categories
2. Define TypeScript types for 10 categories + 70 subtypes
3. Create constants files for each category (subtypes, amenities, defaults)
4. Update `context.tsx` with commercial form data structure
5. Add form validation schemas using Zod

### Phase 2: Step 1 (Category Selection)
**Estimated effort: 2 days**

1. Add Residential/Commercial toggle with smooth transition
2. Create visual category selector (10 commercial categories)
3. Implement dynamic sub-type selection based on category
4. Add smart defaults per category
5. Add category-specific helper text and icons

### Phase 3: Core Categories - Office, Retail, Warehouse
**Estimated effort: 3-4 days**

1. Implement `Step3Commercial/OfficeDetails.tsx`
2. Implement `Step3Commercial/RetailDetails.tsx`
3. Implement `Step3Commercial/WarehouseDetails.tsx`
4. Add validation for each type
5. Test complete flows

### Phase 4: F&B, Automotive, Commercial Land
**Estimated effort: 3-4 days**

1. Implement `Step3Commercial/FoodBeverageDetails.tsx`
2. Implement `Step3Commercial/AutomotiveDetails.tsx`
3. Implement `Step3Commercial/CommercialLandDetails.tsx`
4. Handle specialized fields (grease traps, fuel tanks, zoning)

### Phase 5: Hospitality, Healthcare, Educational
**Estimated effort: 3-4 days**

1. Implement `Step3Commercial/HospitalityDetails.tsx`
2. Implement `Step3Commercial/HealthcareDetails.tsx`
3. Implement `Step3Commercial/EducationalDetails.tsx`
4. Handle licensing requirements and compliance fields

### Phase 6: Specialized Facilities
**Estimated effort: 2-3 days**

1. Implement `Step3Commercial/SpecializedDetails.tsx`
2. Handle data center, studio, gym, salon, ATM specifics
3. Create conditional field groups

### Phase 7: Amenities, Photos, Pricing
**Estimated effort: 3-4 days**

1. Extend Step4 with 10 commercial amenity categories
2. Create dynamic photo categories per commercial type
3. Implement 6 pricing models (per sqm, fixed, per space, revenue share, daily, hourly)
4. Add escalation, TI allowance, rent-free period, goodwill
5. Handle varied deposit and lease terms

### Phase 8: Review & Service Layer
**Estimated effort: 2-3 days**

1. Update Step7 for smart conditional commercial display
2. Extend `listing-service.ts` for all commercial fields
3. Update database operations
4. Create summary generation logic per category

### Phase 9: Testing & Polish
**Estimated effort: 3-4 days**

1. End-to-end testing all 10 commercial flows
2. Mobile responsiveness testing
3. Validation edge cases and error handling
4. UX refinements and micro-interactions
5. Accessibility audit
6. Performance optimization

**Total Estimated Effort: 23-31 days (4-6 weeks)**

### Implementation Priority Matrix

| Priority | Category | Rationale |
|----------|----------|-----------|
| P1 (Week 1-2) | Office, Retail, Warehouse | Highest demand, most requests |
| P2 (Week 2-3) | F&B, Automotive | Strong market need in Kenya |
| P3 (Week 3-4) | Commercial Land, Hospitality | Growing segments |
| P4 (Week 4-5) | Healthcare, Educational | Specialized but important |
| P5 (Week 5-6) | Specialized | Niche but differentiating |

---

## 9. Kenya Market Context

### 9.1 Market Demand Analysis

| Category | Demand Level | Key Drivers |
|----------|--------------|-------------|
| Office | High | Tech startups, NGOs, regional HQs |
| Retail | Very High | Growing middle class, mall culture |
| F&B | High | Youth demographics, dining culture |
| Warehouse | Very High | E-commerce boom, logistics growth |
| Automotive | High | Growing vehicle ownership, urbanization |
| Commercial Land | Medium-High | Development activity, investment |
| Hospitality | Medium | Tourism recovery, MICE tourism |
| Healthcare | High | Private healthcare growth |
| Educational | High | Education demand, private schools |
| Specialized | Medium | Niche but growing |

### 9.2 Typical Lease Terms by Category

| Category | Min Lease | Typical Lease | Deposit | Escalation |
|----------|-----------|---------------|---------|------------|
| Office | 1 year | 3-5 years | 3-6 months | 7-10%/year |
| Retail (Mall) | 2 years | 3-5 years | 6-12 months | 7-10%/year |
| Retail (Street) | 1 year | 2-3 years | 3-6 months | 5-10%/year |
| Restaurant | 2 years | 5-7 years | 6-12 months | 7-10%/year |
| Warehouse | 1 year | 3-5 years | 3-6 months | 5-8%/year |
| Parking | Monthly | 1-2 years | 1-3 months | 5-7%/year |
| Commercial Land | 1 year | 3-10 years | 6-12 months | 5-7%/year |
| Hotel | 5 years | 10-20 years | 12+ months | 5-8%/year |
| Clinic | 2 years | 3-5 years | 3-6 months | 7-10%/year |
| School | 3 years | 5-10 years | 6-12 months | 5-8%/year |

### 9.3 Payment Preferences

| Category | Common Payment Frequency |
|----------|--------------------------|
| Office (Large) | Quarterly/Annually |
| Office (Small) | Monthly |
| Retail (Mall) | Monthly |
| Retail (Street) | Monthly |
| Parking | Monthly/Daily |
| Warehouse | Monthly/Quarterly |
| Event Venue | Per event/Hourly |
| Co-working | Daily/Weekly/Monthly |

---

## Appendix A: Kenya Commercial Real Estate Terms

| Term | Definition |
|------|------------|
| **Godown** | Kenyan term for warehouse/storage facility |
| **Banda** | Outdoor covered structure, often used for events |
| **Duka** | Small shop/retail space (Swahili) |
| **Stall** | Market booth or small kiosk |
| **Service Charge (SC)** | Monthly fee for shared amenities (security, cleaning, maintenance) |
| **CAM** | Common Area Maintenance (same as service charge) |
| **Fit-out** | Interior finish level of commercial space |
| **Shell** | Bare space with no finishes, just concrete/walls |
| **Warm Shell** | Shell with basic mechanical/electrical roughed in |
| **TI Allowance** | Tenant Improvement - landlord contribution to fitting out space |
| **Rent Free** | Grace period (1-6 months) for tenant to fit out space |
| **Escalation** | Annual rent increase clause (typically 5-10% in Kenya) |
| **Goodwill / Key Money** | One-time payment for established business location |
| **GLA** | Gross Leasable Area - total rentable space |
| **NLA** | Net Leasable Area - usable space excluding common areas |
| **kVA** | Kilovolt-ampere - measure of power capacity |
| **Clear Height** | Usable height from floor to lowest obstruction |
| **Eave Height** | Height at wall edge (vs peak in pitched roofs) |
| **Plot Ratio** | Max building floor area as ratio of plot size |
| **Ground Coverage** | Max building footprint as % of plot size |
| **Title Deed** | Ownership document (freehold or leasehold) |
| **NEMA** | National Environment Management Authority (for approvals) |
| **County Approvals** | Required licenses from Nairobi/County government |

---

## Appendix B: Commercial Rent Benchmarks (Kenya, 2025-2026)

### Office Space (per sqm/month)

| Area | Grade A | Grade B | Grade C |
|------|---------|---------|---------|
| Westlands/Parklands | 900-1,500 | 600-900 | 400-600 |
| Upper Hill | 800-1,300 | 500-800 | 350-500 |
| CBD | 600-1,000 | 400-600 | 250-400 |
| Karen/Lavington | 500-900 | 400-600 | 300-450 |
| Gigiri | 1,000-1,800 | 700-1,000 | — |
| Mombasa Road | 400-700 | 300-500 | 200-350 |
| Thika Road | 350-600 | 250-400 | 150-300 |

### Retail Space (per sqm/month)

| Location Type | Prime | Secondary | Tertiary |
|---------------|-------|-----------|----------|
| Premium Mall | 1,500-3,500 | 1,000-1,500 | 600-1,000 |
| Standard Mall | 800-1,500 | 500-800 | 350-500 |
| High Street | 1,000-2,500 | 600-1,000 | 400-600 |
| Neighborhood | 400-800 | 250-400 | 150-250 |
| Market Area | 500-1,200 | 300-500 | 200-300 |

### Warehouse Space (per sqm/month)

| Area | Modern/Grade A | Standard | Basic Godown |
|------|----------------|----------|--------------|
| Industrial Area | 250-400 | 150-250 | 80-150 |
| Mombasa Road | 200-350 | 120-200 | 70-120 |
| Ruiru/Juja | 150-280 | 100-150 | 60-100 |
| Athi River | 120-250 | 80-120 | 50-80 |
| Naivasha | 100-200 | 70-100 | 40-70 |

### Parking Spaces (per space/month)

| Location | Covered | Open |
|----------|---------|------|
| CBD | 8,000-15,000 | 5,000-8,000 |
| Westlands | 5,000-10,000 | 3,000-5,000 |
| Upper Hill | 4,000-8,000 | 2,500-4,000 |
| Suburbs | 2,000-4,000 | 1,000-2,000 |

### Land (per acre/year for lease)

| Location | Commercial | Industrial | Mixed-Use |
|----------|------------|------------|-----------|
| Nairobi Metro | 2M-10M | 1M-4M | 1.5M-6M |
| Satellite Towns | 500K-2M | 300K-1M | 400K-1.5M |
| Mombasa | 1M-5M | 500K-2M | 800K-3M |

*All figures in KSh. Rates vary based on specific location, building quality, and market conditions.*

---

## Appendix C: Validation Rules by Category

### Office Space
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Size | 10 sqm | 10,000 sqm | Yes |
| Ceiling height | 2.4 m | 5.0 m | No |
| Power | 10 kVA | 500 kVA | No |
| Workstations | 1 | 500 | No |
| Private offices | 0 | 50 | No |
| Meeting rooms | 0 | 20 | No |

### Retail Shop
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Size | 5 sqm | 10,000 sqm | Yes |
| Frontage | 1 m | 100 m | No |
| Ceiling height | 2.5 m | 15.0 m | No |
| Foot traffic | — | — | Yes |

### Restaurant/F&B
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Size | 20 sqm | 5,000 sqm | Yes |
| Seating capacity | 10 | 500 | No |
| Kitchen area | 5 sqm | 500 sqm | No |
| Water points | 1 | 20 | No |

### Warehouse
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Size | 50 sqm | 100,000 sqm | Yes |
| Clear height | 3 m | 25 m | No |
| Floor load | 500 kg/sqm | 50,000 kg/sqm | No |
| Loading docks | 0 | 50 | No |
| Yard area | 0 sqm | 50,000 sqm | No |

### Automotive (Parking)
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Parking spaces | 1 | 5,000 | Yes |
| Plot size | 100 sqm | 50,000 sqm | No |

### Commercial Land
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Plot size | 0.01 acres | 1,000 acres | Yes |
| Road frontage | 5 m | 1,000 m | No |
| Max coverage | 10% | 80% | No |
| Plot ratio | 0.5 | 8.0 | No |

### Hospitality (Event Venue)
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Seated capacity | 20 | 10,000 | No |
| Standing capacity | 30 | 15,000 | No |
| Room count | 1 | 500 | For hotels |

### Healthcare
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Consultation rooms | 1 | 100 | No |
| Waiting capacity | 5 | 500 | No |

### Educational
| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Classrooms | 1 | 100 | No |
| Classroom capacity | 10 | 50 | No |
| Total capacity | 10 | 5,000 | No |

---

## Appendix D: Photo Requirements by Category

| Category | Required Photos | Optional Photos |
|----------|----------------|-----------------|
| **Office** | Main workspace, Reception | Meeting room, Pantry, View, Parking |
| **Retail** | Storefront, Interior | Display window, Storage, Signage area |
| **F&B** | Dining area, Kitchen | Bar, Outdoor seating, Equipment |
| **Warehouse** | Main floor, Loading area | Office, Yard, Equipment |
| **Automotive** | Main area, Entry/Exit | Equipment, Canopy, Office |
| **Land** | Street view, Plot view | Aerial, Neighboring properties |
| **Hospitality** | Main hall/Lobby, Room | Pool, Restaurant, Garden |
| **Healthcare** | Reception, Consultation room | Treatment area, Equipment |
| **Educational** | Classroom, Reception | Playground, Lab, Library |
| **Specialized** | Main facility area | Equipment, Special features |

---

*Document End*
*Version 2.0 - Updated with 10 categories, 70+ sub-types*
*Last Updated: January 2025*
