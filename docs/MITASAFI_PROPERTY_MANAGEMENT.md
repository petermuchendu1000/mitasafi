# MitaSafi Property & Unit Management System

> **Document Version:** 1.0  
> **Last Updated:** January 1, 2026  
> **Status:** Planning & Design

---

## Executive Summary

MitaSafi is a **Rental Management System** - not just a listing platform. The core value proposition is helping landlords manage their entire rental business: properties, units, tenants, rent collection, maintenance, and finances.

**Key Insight:** "Listing a vacant unit" is approximately 5% of landlord work. The other 95% is managing occupied units.

---

## Table of Contents

1. [Property Classification System](#1-property-classification-system)
2. [Building Entity](#2-building-entity)
3. [Unit Entity](#3-unit-entity)
4. [Tenant Entity](#4-tenant-entity)
5. [Lease Entity](#5-lease-entity)
6. [Payment Entity](#6-payment-entity)
7. [Maintenance Entity](#7-maintenance-entity)
8. [Add Property Journey](#8-add-property-journey)
9. [Data Model](#9-data-model)
10. [Implementation Decisions](#10-implementation-decisions)

---

## 1. Property Classification System

### 1.1 Property Type Hierarchy

```
PROPERTY TYPES
│
├── SINGLE-UNIT PROPERTIES (1 property = 1 rentable unit)
│   ├── Standalone House
│   ├── Bungalow
│   ├── Maisonette
│   ├── Townhouse (single-family)
│   └── Villa
│
├── MULTI-UNIT PROPERTIES (1 property = multiple rentable units)
│   ├── Apartment Building
│   ├── Flat Block
│   ├── Townhouse Complex (multiple townhouses)
│   ├── Gated Community
│   ├── Student Hostel
│   └── Mixed-Use Building (residential + commercial)
│
└── COMMERCIAL PROPERTIES (future consideration)
    ├── Office Space
    ├── Retail Shop
    └── Warehouse
```

### 1.2 Single-Unit Property Types

| Type | Definition | Typical Features | Target Market | Rent Range (Nairobi) |
|------|------------|------------------|---------------|---------------------|
| **Standalone House** | Independent house on own plot | Own compound, garden, parking, no shared walls | Families, expats | KSh 50,000 - 500,000+ |
| **Bungalow** | Single-story house | All rooms on one level, typically 2-4 BR | Families, elderly | KSh 40,000 - 200,000 |
| **Maisonette** | 2-3 story house, often in a compound | Multiple floors, sometimes shared compound | Families | KSh 60,000 - 250,000 |
| **Townhouse** | Row house sharing walls with neighbors | Own entrance, small garden, parking | Young families, professionals | KSh 50,000 - 180,000 |
| **Villa** | Luxury standalone house | Large compound, premium finishes, staff quarters | High-income, diplomats | KSh 200,000 - 1,000,000+ |

### 1.3 Multi-Unit Property Types

| Type | Definition | Unit Count | Management Complexity | Target Landlords |
|------|------------|------------|----------------------|------------------|
| **Apartment Building** | Multi-story building with individual units | 4 - 200+ units | High | Individual investors, developers |
| **Flat Block** | Smaller apartment building (Kenya term) | 4 - 20 units | Medium | Individual landlords |
| **Townhouse Complex** | Multiple townhouses in gated compound | 4 - 50 units | Medium-High | Developers, investment groups |
| **Gated Community** | Large development with multiple buildings | 50 - 500+ units | Very High | Property management companies |
| **Student Hostel** | Dormitory-style accommodation | 20 - 200+ beds | High (unique needs) | Investors near universities |
| **Mixed-Use Building** | Ground floor commercial, upper floors residential | Varies | High (different tenant types) | Commercial investors |

---

## 2. Building Entity

### 2.1 Building Identification

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Building Name** | Yes | "GG Heights", "Pearl Apartments" | Primary identifier, used in listings |
| **Building Type** | Yes | Apartment, Flat Block, Townhouse Complex, etc. | Determines UI/features shown |
| **Year Built** | No | Construction year | Affects tenant expectations, pricing |
| **Total Floors** | Yes (if applicable) | Number of stories | For navigation, unit numbering |
| **Total Units** | Yes | Count of rentable units | For occupancy tracking |
| **Plot Number** | No | LR Number / Plot reference | Legal identification |
| **Management Type** | Yes | Self, Caretaker, Property Manager | Determines workflow needs |

### 2.2 Building Location

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Street Address** | Yes | Physical location | Essential for tenant/visitor finding |
| **Area/Neighborhood** | Yes | Kilimani, Westlands, etc. | Primary search filter for tenants |
| **City** | Yes | Nairobi, Mombasa, etc. | Multi-city support |
| **GPS Coordinates** | Recommended | Lat/Long | Map display, directions |
| **Landmarks** | No | "Near Yaya Centre" | Helps with directions |
| **Access Instructions** | No | "Use back gate after 10pm" | For tenants, visitors |

### 2.3 Building Amenities (Shared Facilities)

#### 2.3.1 Security Features

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Perimeter Wall** | Yes / No | Basic security indicator |
| **Electric Fence** | Yes / No | Enhanced security |
| **Security Guards** | None / Daytime / 24-hour | Critical tenant concern |
| **CCTV Coverage** | None / Entry only / Full | Increasingly expected |
| **Access Control** | None / Key / Card / Biometric | Modern building indicator |
| **Intercom System** | Yes / No | Communication convenience |
| **Boom Barrier** | Yes / No | Vehicle access control |

#### 2.3.2 Water & Power Infrastructure

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Water Source** | County only / Borehole / Both | #1 tenant concern in Kenya |
| **Water Storage** | None / Tank / Multiple tanks / Capacity in liters | Backup availability |
| **Water Supply Reliability** | Rationed / 24-7 | Critical daily living factor |
| **Backup Generator** | None / Common areas only / Full backup | Power reliability |
| **Generator Fuel** | Shared cost / Included in rent | Cost transparency |
| **Solar Power** | None / Lighting / Water heating / Partial | Growing feature |

#### 2.3.3 Parking

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Parking Type** | None / Open / Covered / Basement | Affects rent value |
| **Parking Allocation** | Per unit / Shared / First-come | Clear expectations |
| **Parking Spaces** | Number available | Capacity planning |
| **Visitor Parking** | Yes / No / Number of spots | Guest accommodation |
| **Motorcycle Parking** | Yes / No | Common in Kenya |
| **EV Charging** | Yes / No | Future-proofing |

#### 2.3.4 Common Facilities

| Amenity | Description | Justification |
|---------|-------------|---------------|
| **Lift/Elevator** | Yes / No | Essential for 4+ floors |
| **Swimming Pool** | Yes / No | Premium amenity |
| **Gym/Fitness Center** | Yes / No | Increasingly expected in mid-high end |
| **Children's Playground** | Yes / No | Family-oriented buildings |
| **Garden/Lawn Area** | Yes / No | Green space |
| **Rooftop Terrace** | Yes / No | Social/event space |
| **BBQ Area** | Yes / No | Social amenity |
| **Laundry Room** | Yes / No | Shared facility |
| **Clubhouse/Hall** | Yes / No | Events, meetings |
| **Staff Quarters** | Yes / No | For building staff |

#### 2.3.5 Services & Connectivity

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Garbage Collection** | County / Private / Building | Essential service |
| **Internet Infrastructure** | None / Fiber-ready / Provider pre-installed | Work-from-home era |
| **Available ISPs** | Safaricom, Zuku, JTL, etc. | Tenant decision factor |
| **Gas Infrastructure** | None / Cylinder points / Piped gas | Cooking preference |
| **Caretaker On-site** | Yes / No | First point of contact |

### 2.4 Building Policies

| Policy | Options | Justification |
|--------|---------|---------------|
| **Pets Allowed** | No / Small only / All / Case-by-case | Common restriction |
| **Smoking Policy** | Allowed / Balcony only / Not allowed | Health & cleanliness |
| **Noise Hours** | Quiet hours specification | Community living |
| **Business Use** | Allowed / Not allowed / Approval needed | Home-based work |
| **Airbnb/Short-term** | Allowed / Not allowed | Building policy |
| **Alterations** | None / With approval / Minor allowed | Unit modification |
| **Move-in/out Times** | Restricted hours | Building coordination |

### 2.5 Building Financial Setup

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Service Charge** | If applicable | Monthly building maintenance fee | Often separate from rent |
| **Service Charge Includes** | List | Security, cleaning, water, etc. | Transparency |
| **Payment Collection** | Via MitaSafi / Separate | Determines if we track this |
| **Landlord Bank Details** | Yes | For rent deposits | M-Pesa, bank transfer |

### 2.6 Building Media

| Media Type | Purpose | Recommendation |
|------------|---------|----------------|
| **Exterior Photos** | First impression, building identity | 2-5 photos |
| **Entrance/Lobby** | Common area quality | 1-3 photos |
| **Amenity Photos** | Pool, gym, garden, etc. | 1 per amenity |
| **Parking Area** | Show parking setup | 1-2 photos |
| **Floor Plan** | Overall building layout | Optional but helpful |
| **Aerial/Drone View** | Compound overview | Premium feature |

---

## 3. Unit Entity

### 3.1 Unit Identification

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Unit Number/Name** | Yes | "A1", "101", "Ground Floor Left" | Primary identifier |
| **Floor Level** | Yes | Ground, 1st, 2nd... Penthouse | Navigation, pricing factor |
| **Wing/Block** | If applicable | "Block A", "Tower 1" | Large complex navigation |
| **Unit Type** | Yes | Bedsitter, Studio, 1BR, 2BR, etc. | Classification |
| **Position** | Optional | Corner, Middle, End | Light/ventilation indicator |
| **Facing/View** | Optional | Road, Garden, Pool, City | Affects desirability |

### 3.2 Unit Types (Kenya Market)

#### 3.2.1 Bedsitter

| Attribute | Specification |
|-----------|---------------|
| **Definition** | Single room combining bedroom, living, kitchenette |
| **Bathroom** | Own or shared (specify) |
| **Typical Size** | 12-25 sqm |
| **Target** | Students, low-income singles |
| **Rent Range** | KSh 5,000 - 20,000 |
| **Common In** | Eastlands, student areas |

#### 3.2.2 Studio

| Attribute | Specification |
|-----------|---------------|
| **Definition** | Open-plan living with separate bathroom |
| **Kitchen** | Kitchenette or open kitchen |
| **Typical Size** | 25-45 sqm |
| **Target** | Young professionals, singles |
| **Rent Range** | KSh 15,000 - 45,000 |
| **Common In** | Kilimani, Westlands, Upper Hill |

#### 3.2.3 1 Bedroom

| Attribute | Specification |
|-----------|---------------|
| **Definition** | Separate bedroom, living room, kitchen, bathroom |
| **Bathroom** | 1 (may be ensuite or separate) |
| **Typical Size** | 35-60 sqm |
| **Target** | Professionals, couples |
| **Rent Range** | KSh 20,000 - 60,000 |
| **DSQ** | Rarely |

#### 3.2.4 2 Bedroom

| Attribute | Specification |
|-----------|---------------|
| **Definition** | 2 bedrooms, living, dining, kitchen |
| **Bathrooms** | 1-2 (master ensuite common) |
| **Typical Size** | 55-90 sqm |
| **Target** | Small families, sharers |
| **Rent Range** | KSh 35,000 - 100,000 |
| **DSQ** | Sometimes |

#### 3.2.5 3 Bedroom

| Attribute | Specification |
|-----------|---------------|
| **Definition** | 3 bedrooms, living, dining, kitchen |
| **Bathrooms** | 2-3 (master ensuite expected) |
| **Typical Size** | 85-140 sqm |
| **Target** | Families |
| **Rent Range** | KSh 50,000 - 180,000 |
| **DSQ** | Often |

#### 3.2.6 4+ Bedroom

| Attribute | Specification |
|-----------|---------------|
| **Definition** | Large family apartments |
| **Bathrooms** | 3+ |
| **Typical Size** | 130-250+ sqm |
| **Target** | Large families, expats |
| **Rent Range** | KSh 100,000 - 400,000+ |
| **DSQ** | Expected |

#### 3.2.7 Special Types

| Type | Definition | Notes |
|------|------------|-------|
| **Penthouse** | Top floor premium unit | Usually largest, best views, premium price |
| **Duplex** | Two-level apartment | Staircase within unit |
| **Loft** | High ceiling with mezzanine | Modern design feature |
| **Garden Unit** | Ground floor with private garden | Family appeal |

### 3.3 Unit Physical Details

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Size (sqm/sqft)** | Recommended | Floor area | Primary sizing metric |
| **Bedrooms** | Yes | Count | Main classification |
| **Bathrooms** | Yes | Count (can be 0.5 for half bath) | Basic requirement |
| **Living Rooms** | Optional | Count (some have family room + lounge) | Space detail |
| **Dining** | Optional | Separate / Open / None | Layout detail |
| **Kitchen Type** | Yes | Open / Separate / Kitchenette | Cooking setup |
| **Balcony Count** | Optional | Number and sizes | Outdoor space |
| **DSQ** | Yes | Yes / No | Kenya-specific, affects price |
| **Store Room** | Optional | Yes / No | Storage space |

### 3.4 Unit Condition & Finish

| Field | Options | Justification |
|-------|---------|---------------|
| **Overall Condition** | Excellent / Good / Fair / Needs Work | Tenant expectation |
| **Last Renovated** | Year | Recency matters |
| **Flooring** | Tiles / Wooden / Laminate / Terrazzo / Carpet | Preference factor |
| **Ceiling** | Standard / High / Gypsum | Aesthetic factor |
| **Wall Finish** | Painted / Wallpaper | Condition indicator |
| **Windows** | Aluminum / Wooden / UPVC | Quality indicator |
| **Natural Light** | Poor / Average / Good / Excellent | Living comfort |
| **Ventilation** | Poor / Average / Good / Excellent | Comfort factor |

### 3.5 Unit-Specific Amenities

#### 3.5.1 Kitchen Features

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Kitchen Cabinets** | None / Basic / Full | Storage capacity |
| **Countertop** | Tiles / Granite / Marble | Quality indicator |
| **Sink** | Single / Double / Type | Functionality |
| **Gas Point** | Yes / No | Cooking method |
| **Exhaust Fan/Hood** | Yes / No | Ventilation |

#### 3.5.2 Bathroom Features

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Hot Water** | None / Electric / Solar / Gas | Daily comfort |
| **Water Heater Type** | Instant / Storage tank | Capacity |
| **Bathtub** | Yes / No | Preference factor |
| **Shower** | Basic / Rain shower | Quality indicator |
| **Toilet Type** | Standard / WC / Bidet | Modern standards |

#### 3.5.3 Climate Control

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Air Conditioning** | None / Split units / Central / Pre-wired | Climate comfort |
| **AC Units Count** | Number installed | Capacity |
| **Ceiling Fans** | Yes / No / Count | Alternative cooling |

#### 3.5.4 Storage & Built-ins

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Built-in Wardrobes** | Yes / No / Count | Storage convenience |
| **Walk-in Closet** | Yes / No | Premium feature |
| **Shoe Rack** | Built-in / None | Entryway feature |
| **Linen Closet** | Yes / No | Storage |

#### 3.5.5 Security Features (Unit-level)

| Amenity | Options | Justification |
|---------|---------|---------------|
| **Door Type** | Wooden / Steel / Security door | Entry security |
| **Window Grills** | Yes / No | Security vs aesthetics |
| **Unit Alarm** | Yes / No | Individual security |
| **Video Intercom** | Yes / No | Visitor screening |
| **Safe Room** | Yes / No | High-end feature |

#### 3.5.6 Furnishing Status

| Status | Definition | Rent Impact |
|--------|------------|-------------|
| **Unfurnished** | Empty, no furniture | Baseline |
| **Partially Furnished** | Basic items (curtains, some appliances) | +10-20% |
| **Fully Furnished** | Move-in ready with all furniture | +30-50% |

**If furnished, specify:**
- Living room furniture
- Bedroom furniture
- Dining set
- Kitchen appliances (fridge, cooker, microwave)
- Electronics (TV, washer)
- Linens provided

### 3.6 Unit Financial Details

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Monthly Rent** | Yes | Base rent amount | Primary listing info |
| **Currency** | Yes | KES / USD | Multi-currency support |
| **Rent Negotiable** | Yes | Yes / No / Slightly | Flexibility indicator |
| **Security Deposit** | Yes | Amount or months | Move-in cost |
| **Service Charge** | If applicable | Monthly fee | Additional cost |
| **Water Charge** | If separate | Metered / Flat rate / Included | Utility clarity |
| **Electricity** | Info | Prepaid / Postpaid / Account transfer | Utility setup |
| **Parking Fee** | If separate | Monthly parking cost | If not included |
| **Pet Deposit** | If applicable | One-time or monthly | If pets allowed |

### 3.7 Unit Status

| Field | Required | Options | Justification |
|-------|----------|---------|---------------|
| **Current Status** | Yes | Vacant / Occupied / Under Renovation / Reserved | Core tracking |
| **Available From** | If vacant | Date | Listing info |
| **Minimum Lease** | Yes | 6 months / 12 months / Flexible | Term clarity |
| **Maximum Lease** | Optional | If limited | Rare but exists |
| **Notice Period** | Yes | 1 month / 2 months / 3 months | Exit terms |

### 3.8 Unit Media Requirements

| Media Type | Required | Count | Purpose |
|------------|----------|-------|---------|
| **Living Room** | Yes | 2-4 | Main space showcase |
| **Master Bedroom** | Yes | 1-3 | Primary bedroom |
| **Other Bedrooms** | Yes | 1-2 each | Room showcase |
| **Kitchen** | Yes | 2-3 | Cooking space |
| **Bathrooms** | Yes | 1-2 each | Facilities |
| **Balcony/View** | If applicable | 1-3 | Outdoor space |
| **DSQ** | If applicable | 1-2 | Staff quarter |
| **Floor Plan** | Recommended | 1 | Layout visualization |
| **Video Tour** | Optional | 1 | Premium feature |

---

## 4. Tenant Entity

### 4.1 Tenant Profile Information

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Full Name** | Yes | Legal name | Lease agreement |
| **ID Type** | Yes | National ID / Passport / Alien ID | Verification |
| **ID Number** | Yes | Document number | Verification |
| **Phone (Primary)** | Yes | Main contact | Communication |
| **Phone (Secondary)** | Optional | Backup contact | Emergency |
| **Email** | Recommended | Email address | Digital communication |
| **Occupation** | Recommended | Job/business | Income indicator |
| **Employer** | Optional | Company name | Verification |

### 4.2 Tenant Verification Levels

| Level | Verification Done | Badge |
|-------|-------------------|-------|
| **Basic** | Phone verified | ✓ Phone |
| **ID Verified** | National ID uploaded & checked | ✓ ID |
| **Employment Verified** | Employer confirmation | ✓ Employed |
| **Reference Checked** | Previous landlord contacted | ✓ Referenced |
| **Credit Checked** | CRB report obtained | ✓ Credit |

### 4.3 Tenant Emergency Contact

| Field | Required | Description |
|-------|----------|-------------|
| **Name** | Yes | Emergency contact person |
| **Relationship** | Yes | Spouse, Parent, Sibling, Friend |
| **Phone** | Yes | Contact number |
| **Alternative Phone** | Optional | Backup |

### 4.4 Tenant Occupancy Details

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Adults** | Yes | Number of adults | Occupancy tracking |
| **Children** | Yes | Number of children | Family size |
| **Pets** | Yes | Type and count | Policy compliance |
| **Vehicles** | Optional | Cars, motorcycles | Parking allocation |

---

## 5. Lease Entity

### 5.1 Lease Core Details

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Lease ID** | Auto | Unique identifier | System reference |
| **Unit** | Yes | Link to unit | Core relationship |
| **Tenant(s)** | Yes | Link to tenant(s) | Can be multiple |
| **Start Date** | Yes | Lease commencement | Term tracking |
| **End Date** | Yes | Lease expiration | Renewal alerts |
| **Lease Type** | Yes | Fixed / Month-to-month / Renewable | Term structure |
| **Status** | Yes | Draft / Active / Expired / Terminated | State tracking |

### 5.2 Lease Financial Terms

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Monthly Rent** | Yes | Agreed rent amount | May differ from listed |
| **Rent Due Day** | Yes | Day of month (1-28) | Payment schedule |
| **Payment Method** | Yes | M-Pesa / Bank / Cash | Collection setup |
| **Security Deposit** | Yes | Amount held | Refund tracking |
| **Deposit Held By** | Yes | Landlord / Escrow | Transparency |
| **Late Fee** | Optional | Penalty structure | Enforcement |
| **Grace Period** | Optional | Days before late fee | Flexibility |

### 5.3 Lease Inclusions

| Item | Status Options | Notes |
|------|----------------|-------|
| **Water** | Included / Metered / Capped | Specify arrangement |
| **Electricity** | Tenant account / Shared / Included | Utility setup |
| **Service Charge** | Included / Separate | Clarity |
| **Parking** | Included / Extra / Not available | Allocation |
| **Internet** | Included / Tenant arranges | Connectivity |
| **Generator** | Included / Metered / Contribution | Backup power |

### 5.4 Lease Documents

| Document | Required | Description |
|----------|----------|-------------|
| **Lease Agreement** | Yes | Signed contract PDF |
| **Tenant ID Copy** | Yes | Identification |
| **Deposit Receipt** | Yes | Payment proof |
| **Move-in Checklist** | Recommended | Unit condition record |
| **Inventory List** | If furnished | Items in unit |
| **Guarantor Form** | If applicable | Third-party guarantee |

### 5.5 Lease History Tracking

| Event | Tracked |
|-------|---------|
| **Lease Created** | Date, by whom |
| **Lease Signed** | Date |
| **Rent Changes** | Old amount → New amount, effective date |
| **Lease Renewed** | Renewal dates, new terms |
| **Notice Given** | By whom, date, reason |
| **Lease Terminated** | Date, reason, settlement |
| **Deposit Refund** | Amount refunded, deductions |

---

## 6. Payment Entity

### 6.1 Payment Record

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Payment ID** | Auto | Unique reference | Tracking |
| **Lease** | Yes | Link to lease | Association |
| **Amount** | Yes | Payment amount | Core data |
| **Payment Date** | Yes | When paid | Timing |
| **Payment For** | Yes | Month/period covered | Allocation |
| **Payment Method** | Yes | M-Pesa / Bank / Cash / Cheque | Tracking |
| **Reference** | Yes | Transaction ID | Verification |
| **Status** | Yes | Pending / Confirmed / Failed / Reversed | State |
| **Received By** | If cash | Who received | Accountability |
| **Notes** | Optional | Any remarks | Context |

### 6.2 Payment Types

| Type | Description |
|------|-------------|
| **Rent** | Monthly rent payment |
| **Deposit** | Security deposit |
| **Service Charge** | Monthly maintenance fee |
| **Water Bill** | Metered water |
| **Electricity** | If collected by landlord |
| **Late Fee** | Penalty payment |
| **Deposit Refund** | Return to tenant (negative) |
| **Repair Deduction** | From deposit (at move-out) |
| **Other** | Miscellaneous |

### 6.3 M-Pesa Integration Fields

| Field | Description |
|-------|-------------|
| **Paybill/Till Number** | Landlord's collection number |
| **Account Number** | Unit identifier for matching |
| **Transaction ID** | M-Pesa confirmation code |
| **Phone Number** | Sender's number |
| **Auto-matched** | System matched to lease Y/N |

---

## 7. Maintenance Entity

### 7.1 Maintenance Request

| Field | Required | Description | Justification |
|-------|----------|-------------|---------------|
| **Request ID** | Auto | Unique reference | Tracking |
| **Unit** | Yes | Which unit | Location |
| **Reported By** | Yes | Tenant / Landlord / Caretaker | Source |
| **Category** | Yes | Plumbing / Electrical / etc. | Classification |
| **Description** | Yes | Issue details | Understanding |
| **Urgency** | Yes | Emergency / High / Normal / Low | Prioritization |
| **Photos** | Recommended | Issue images | Documentation |
| **Status** | Yes | Open / Assigned / In Progress / Completed / Closed | Tracking |
| **Reported Date** | Auto | When reported | Timeline |
| **Due Date** | Optional | Expected resolution | SLA |

### 7.2 Maintenance Categories

| Category | Examples | Typical Urgency |
|----------|----------|-----------------|
| **Plumbing** | Leaks, blocked drains, water heater | High |
| **Electrical** | Power issues, faulty outlets, lighting | High |
| **HVAC** | AC not working, ventilation | Normal |
| **Appliances** | Fridge, cooker, washing machine | Normal |
| **Structural** | Cracks, doors, windows | Normal |
| **Locks/Security** | Door locks, grills | High |
| **Painting** | Touch-ups, repainting | Low |
| **Pest Control** | Insects, rodents | Normal |
| **General** | Other issues | Varies |

### 7.3 Maintenance Resolution

| Field | Description |
|-------|-------------|
| **Assigned To** | Service provider / Caretaker / External |
| **Assigned Date** | When assigned |
| **Diagnosis** | What was found |
| **Work Done** | Resolution description |
| **Parts Used** | Items/materials |
| **Cost** | Repair expense |
| **Paid By** | Landlord / Tenant / Building |
| **Completion Date** | When resolved |
| **Tenant Rating** | Satisfaction score |

---

## 8. Add Property Journey

### 8.1 Decision Tree at Start

```
"What type of property do you want to add?"

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🏠 Single Property              🏢 Building with Units   │
│   House, Townhouse, Villa         Apartment, Flat Block    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                     │                        │
                     ▼                        ▼
              Single Unit Flow          Multi-Unit Flow
```

### 8.2 Single Property Flow

**Existing wizard with enhancements:**

1. Property Type → Location → Details → Amenities → Photos → Pricing → Review

**Additions needed:**
- Current tenant? → Add tenant details, lease info
- Or mark as vacant → Enable listing

### 8.3 Multi-Unit Property Flow

#### Phase 1: Building Setup

```
Step 1: Building Basics
├── Building name
├── Building type (Apartment/Flat Block/Complex)
├── Address & Location (Google Places)
├── Total floors
├── Total units (approximate)
└── Year built

Step 2: Building Amenities
├── Security features
├── Water & power setup
├── Parking configuration
├── Common facilities
└── Services (caretaker, etc.)

Step 3: Building Policies
├── Pet policy
├── Smoking policy
├── Business use
└── Other rules

Step 4: Building Photos
├── Exterior shots
├── Entrance/lobby
├── Amenity photos
└── Parking area

Step 5: Building Financials
├── Service charge structure
├── Collection preferences
└── Bank/M-Pesa details
```

#### Phase 2: Unit Setup

**Option A: Add Units One by One**
```
For each unit:
├── Unit number & floor
├── Unit type (1BR, 2BR, etc.)
├── Size & layout
├── Unit-specific amenities
├── Condition & furnishing
├── Photos
├── Pricing
└── Current status (Vacant/Occupied)

If Occupied:
├── Add tenant details
├── Add lease details
└── Add payment history (optional)
```

**Option B: Bulk Add from Template**
```
"How many unit types do you have?"

Type A: 1 Bedroom
├── Define features (template)
├── How many of this type? → 10
└── System creates 10 units, landlord edits numbers/floors

Type B: 2 Bedroom
├── Define features (template)
├── How many of this type? → 8
└── System creates 8 units

[Review & Edit Individual Units]
```

**Option C: Import from Spreadsheet**
```
Download template CSV:
Unit Number, Floor, Type, Bedrooms, Bathrooms, Size, Rent, Status

Upload filled spreadsheet → System creates all units
Landlord reviews and adds photos
```

### 8.4 Post-Setup: Adding Existing Tenants

```
"Do you have existing tenants?"

[Yes] → Tenant Onboarding Wizard
        ├── Which units are occupied?
        ├── For each: Add tenant name, phone, rent amount
        ├── When did they move in?
        ├── Any arrears? How much?
        └── Upload existing lease (optional)

[No]  → All units marked vacant
        → Prompt to create listings
```

### 8.5 Post-Setup Dashboard

```
🏢 GG Heights Dashboard
├── Overview
│   ├── Total Units: 24
│   ├── Occupied: 20 (83%)
│   ├── Vacant: 4 (17%)
│   └── This month's expected rent: KSh 1,200,000
│
├── Quick Actions
│   ├── [+ Add Unit]
│   ├── [+ Add Tenant]
│   ├── [Send Rent Reminders]
│   ├── [View Arrears]
│   └── [List Vacant Units]
│
├── Units Tab
│   ├── All Units (24)
│   ├── Occupied (20)
│   ├── Vacant (4)
│   └── [Filter by type, floor, status]
│
├── Tenants Tab
│   ├── All Tenants (20)
│   ├── Lease Expiring Soon (3)
│   └── In Arrears (2)
│
├── Payments Tab
│   ├── This Month: KSh 1,050,000 / 1,200,000
│   ├── Pending: 5 tenants
│   └── Overdue: 2 tenants (KSh 70,000)
│
├── Maintenance Tab
│   ├── Open Requests (3)
│   ├── In Progress (1)
│   └── Completed This Month (5)
│
└── Reports Tab
    ├── Monthly Income Report
    ├── Occupancy Report
    ├── Arrears Report
    └── Maintenance Report
```

---

## 9. Data Model

### 9.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  PROFILES   │       │  BUILDINGS  │       │    UNITS    │
│  (Landlord) │──1:N──│             │──1:N──│             │
└─────────────┘       └─────────────┘       └──────┬──────┘
                                                   │
                            ┌──────────────────────┼──────────────────────┐
                            │                      │                      │
                      ┌─────┴─────┐          ┌─────┴─────┐          ┌─────┴─────┐
                      │  LEASES   │          │MAINTENANCE│          │ LISTINGS  │
                      │           │          │ REQUESTS  │          │           │
                      └─────┬─────┘          └───────────┘          └───────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
        │  TENANTS  │ │ PAYMENTS  │ │ DOCUMENTS │
        │           │ │           │ │           │
        └───────────┘ └───────────┘ └───────────┘
```

### 9.2 Table Definitions

```sql
-- BUILDINGS (for multi-unit properties)
BUILDINGS
├── id (UUID, PK)
├── landlord_id (UUID, FK → PROFILES)
├── name (TEXT, NOT NULL)
├── building_type (TEXT) -- apartment, flat_block, complex, etc.
├── address (TEXT)
├── area (TEXT)
├── city (TEXT, DEFAULT 'Nairobi')
├── latitude (DECIMAL)
├── longitude (DECIMAL)
├── total_floors (INTEGER)
├── total_units (INTEGER)
├── year_built (INTEGER)
├── amenities (JSONB) -- security, water, parking, facilities
├── policies (JSONB) -- pets, smoking, etc.
├── photos (TEXT[])
├── financial_setup (JSONB) -- service charge, collection prefs
├── management_type (TEXT) -- self, caretaker, property_manager
├── status (TEXT) -- active, inactive
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── metadata (JSONB)

-- UNITS (individual rentable spaces)
UNITS
├── id (UUID, PK)
├── building_id (UUID, FK → BUILDINGS, NULLABLE)
├── landlord_id (UUID, FK → PROFILES)
├── unit_number (TEXT)
├── floor_level (TEXT)
├── wing_block (TEXT)
├── unit_type (TEXT) -- bedsitter, studio, 1br, 2br, etc.
├── bedrooms (INTEGER)
├── bathrooms (DECIMAL) -- allows 0.5 for half bath
├── size_sqm (DECIMAL)
├── has_dsq (BOOLEAN)
├── amenities (JSONB) -- unit-specific
├── condition (TEXT)
├── furnishing (TEXT) -- unfurnished, partial, full
├── photos (TEXT[])
├── monthly_rent (DECIMAL)
├── currency (TEXT, DEFAULT 'KES')
├── deposit_months (INTEGER)
├── deposit_amount (DECIMAL)
├── service_charge (DECIMAL)
├── status (TEXT) -- vacant, occupied, maintenance, reserved
├── listing_status (TEXT) -- unlisted, listed, reserved
├── available_from (DATE)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── metadata (JSONB)

-- TENANTS
TENANTS
├── id (UUID, PK)
├── user_id (UUID, FK → PROFILES, NULLABLE)
├── full_name (TEXT, NOT NULL)
├── phone (TEXT, NOT NULL)
├── email (TEXT)
├── id_type (TEXT) -- national_id, passport, alien_id
├── id_number (TEXT)
├── occupation (TEXT)
├── employer (TEXT)
├── verification_level (TEXT)
├── emergency_contact (JSONB)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── metadata (JSONB)

-- LEASES
LEASES
├── id (UUID, PK)
├── unit_id (UUID, FK → UNITS)
├── tenant_id (UUID, FK → TENANTS)
├── start_date (DATE, NOT NULL)
├── end_date (DATE)
├── lease_type (TEXT) -- fixed, month_to_month, renewable
├── monthly_rent (DECIMAL, NOT NULL)
├── rent_due_day (INTEGER) -- 1-28
├── deposit_amount (DECIMAL)
├── deposit_status (TEXT) -- held, partially_refunded, refunded
├── payment_method (TEXT)
├── inclusions (JSONB) -- water, parking, etc.
├── terms (JSONB) -- late fees, notice period, etc.
├── status (TEXT) -- draft, active, expired, terminated
├── documents (TEXT[])
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── metadata (JSONB)

-- PAYMENTS
PAYMENTS
├── id (UUID, PK)
├── lease_id (UUID, FK → LEASES)
├── amount (DECIMAL, NOT NULL)
├── payment_type (TEXT) -- rent, deposit, service_charge, etc.
├── payment_date (DATE)
├── period_start (DATE) -- for rent: which month
├── period_end (DATE)
├── payment_method (TEXT) -- mpesa, bank, cash, cheque
├── reference (TEXT) -- transaction ID
├── status (TEXT) -- pending, confirmed, failed, reversed
├── received_by (TEXT)
├── notes (TEXT)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── metadata (JSONB)

-- MAINTENANCE_REQUESTS
MAINTENANCE_REQUESTS
├── id (UUID, PK)
├── unit_id (UUID, FK → UNITS)
├── tenant_id (UUID, FK → TENANTS, NULLABLE)
├── category (TEXT) -- plumbing, electrical, etc.
├── description (TEXT, NOT NULL)
├── urgency (TEXT) -- emergency, high, normal, low
├── photos (TEXT[])
├── status (TEXT) -- open, assigned, in_progress, completed, closed
├── assigned_to (TEXT)
├── resolution (JSONB) -- work done, cost, etc.
├── reported_at (TIMESTAMPTZ)
├── resolved_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── metadata (JSONB)
```

---

## 10. Implementation Decisions

### 10.1 Key Architectural Decisions

| Decision | Options | Recommendation | Rationale |
|----------|---------|----------------|-----------|
| **Separate buildings table?** | Yes / No | **Yes** | Clean separation, building-level management |
| **Standalone house handling** | Separate flow / Unit without building | **Unit with building_id = null** | Single code path, simpler |
| **Tenant accounts** | Must register / Can be added by landlord | **Landlord can add, tenant optionally registers** | Reduces friction |
| **Payment tracking** | Manual only / Auto M-Pesa | **Both, with M-Pesa integration** | Core value proposition |

### 10.2 MVP Scope (Phase 1)

| Feature | Included | Notes |
|---------|----------|-------|
| Buildings | ✅ | Full CRUD |
| Units | ✅ | Full CRUD |
| Tenants | ✅ | Add/edit by landlord |
| Leases | ✅ | Basic tracking |
| Payments | ✅ | Manual entry |
| M-Pesa Auto-match | ❌ | Phase 2 |
| Maintenance | ❌ | Phase 2 |
| Listings (Public) | ❌ | Phase 2 |
| Tenant Portal | ❌ | Phase 2 |

### 10.3 Implementation Order

1. **Database Schema** - Create migrations for all tables
2. **Building Wizard** - New multi-step flow for apartments
3. **Unit Management** - CRUD for units within buildings
4. **Tenant Management** - Add/edit tenants
5. **Lease Management** - Create and track leases
6. **Payment Tracking** - Manual payment entry
7. **Dashboard** - Building overview with stats
8. **Single Property Flow** - Adapt existing wizard

---

## Appendix A: Kenya-Specific Terms

| Term | Meaning |
|------|---------|
| **DSQ** | Domestic Staff Quarter - small room for house help |
| **Caretaker** | On-site building manager |
| **Bedsitter** | Single room with kitchenette |
| **Own Compound** | Building with its own perimeter |
| **Flat** | Same as apartment |
| **Plot** | The land parcel |
| **Service Charge** | Monthly maintenance fee |
| **Paybill** | M-Pesa business payment number |
| **KPLC** | Kenya Power (electricity) |
| **CRB** | Credit Reference Bureau |

---

## Appendix B: Common Tenant Questions

1. **Water supply** - "Is there 24/7 water?" "Is there a borehole?"
2. **Security** - "Is there a watchman?" "Is there CCTV?"
3. **Parking** - "Is parking included?" "How many cars?"
4. **Electricity** - "Is it prepaid or postpaid?" "Is there backup generator?"
5. **Internet** - "Is fiber available?" "Which providers?"
6. **Pets** - "Are pets allowed?"
7. **Families** - "Are there other families?" "Is it quiet?"
8. **Commute** - "How far to CBD/Westlands?"

---

## Appendix C: Landlord Pain Points

1. **Multiple units, different statuses** - Hard to track which are vacant
2. **Varying tenant quality** - Some pay, some don't
3. **Common area disputes** - Who pays for what
4. **Caretaker management** - Supervision needed
5. **Maintenance coordination** - Building-wide issues
6. **Rent collection** - Multiple payments to track
7. **Tenant turnover** - Marketing vacancies repeatedly

---

*End of Document*
