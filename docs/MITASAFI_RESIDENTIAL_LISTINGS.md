# MitaSafi Residential Listings - Complete Design Document

**Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Implemented ✅

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Residential Property Taxonomy](#2-residential-property-taxonomy)
3. [7-Step Wizard Flow](#3-7-step-wizard-flow)
4. [Step-by-Step Specifications](#4-step-by-step-specifications)
5. [Database Schema](#5-database-schema)
6. [Form Data Structure](#6-form-data-structure)
7. [Validation Rules](#7-validation-rules)
8. [Kenya Market Context](#8-kenya-market-context)
9. [UI/UX Design Patterns](#9-uiux-design-patterns)
10. [Appendices](#appendices)

---

## 1. Executive Summary

### 1.1 Overview

MitaSafi's residential listing wizard enables landlords to create comprehensive property listings through a streamlined 7-step process. The wizard is optimized for the Kenyan rental market with specific features for:

- **Local property types** (bedsitters, maisonettes, DSQ)
- **Kenya-specific utilities** (water reliability, KPLC, backup generators)
- **Mobile-first payment methods** (M-Pesa, Airtel Money)
- **Security features** prevalent in Kenyan properties
- **Neighborhood organization** by market segment

### 1.2 Property Categories Supported

| Category | Types | Target Market |
|----------|-------|---------------|
| Budget | Bedsitter, Studio | Students, young professionals |
| Standard | 1-3 BR Apartment | Families, professionals |
| Premium | Townhouse, Maisonette | Upper-middle families |
| Luxury | Villa | High-net-worth individuals |

### 1.3 Key Features

- ✅ 7-step progressive wizard
- ✅ Auto-save draft functionality
- ✅ Photo upload with drag-and-drop
- ✅ Map-based location selection
- ✅ Kenya ISP availability selection
- ✅ Custom fee management
- ✅ M-Pesa integration ready

---

## 2. Residential Property Taxonomy

### 2.1 Property Types (7 Types)

| Type | ID | Description | Typical Bedrooms | Target Rent Range (KSh) |
|------|----|-------------|------------------|------------------------|
| **Bedsitter** | `bedsitter` | Single room + kitchenette, shared bathroom | 0 (Studio) | 5,000 - 15,000 |
| **Studio** | `studio` | Open-plan unit with private bathroom | 0 (Studio) | 15,000 - 40,000 |
| **Apartment** | `apartment` | Standard 1+ bedroom unit in building | 1-4 | 25,000 - 150,000 |
| **House** | `house` | Standalone home with compound | 2-5 | 50,000 - 300,000 |
| **Townhouse** | `townhouse` | Multi-story, shared walls | 3-5 | 80,000 - 250,000 |
| **Maisonette** | `maisonette` | 2-story unit within apartment building | 3-4 | 100,000 - 200,000 |
| **Villa** | `villa` | Premium standalone with gardens/pool | 4-6 | 200,000 - 1,000,000+ |

### 2.2 Property Type Characteristics

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     RESIDENTIAL PROPERTY HIERARCHY                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BUDGET TIER                    STANDARD TIER                           │
│  ┌──────────────┐               ┌──────────────┐                        │
│  │  BEDSITTER   │               │  APARTMENT   │                        │
│  │  • 1 room    │               │  • 1-4 BR    │                        │
│  │  • Shared WC │               │  • Building  │                        │
│  │  • No kitchen│               │  • Elevator? │                        │
│  └──────────────┘               └──────────────┘                        │
│         │                              │                                 │
│         ▼                              ▼                                 │
│  ┌──────────────┐               ┌──────────────┐                        │
│  │   STUDIO     │               │   HOUSE      │                        │
│  │  • Open plan │               │  • Standalone│                        │
│  │  • Own bath  │               │  • Compound  │                        │
│  │  • Kitchen   │               │  • Parking   │                        │
│  └──────────────┘               └──────────────┘                        │
│                                                                          │
│  PREMIUM TIER                   LUXURY TIER                             │
│  ┌──────────────┐               ┌──────────────┐                        │
│  │  TOWNHOUSE   │               │    VILLA     │                        │
│  │  • 2-3 floors│               │  • Standalone│                        │
│  │  • Shared    │               │  • Gardens   │                        │
│  │    walls     │               │  • Pool      │                        │
│  └──────────────┘               │  • Staff Qtrs│                        │
│         │                       └──────────────┘                        │
│         ▼                                                                │
│  ┌──────────────┐                                                       │
│  │  MAISONETTE  │                                                       │
│  │  • Duplex    │                                                       │
│  │  • In bldg   │                                                       │
│  │  • Own entry │                                                       │
│  └──────────────┘                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Bedroom Configurations

| Property Type | Min BR | Max BR | Default BR | Notes |
|---------------|--------|--------|------------|-------|
| Bedsitter | 0 | 0 | 0 | Fixed - no separate bedroom |
| Studio | 0 | 0 | 0 | Fixed - open plan |
| Apartment | 1 | 6 | 2 | Most common: 1-3 BR |
| House | 1 | 8 | 3 | Most common: 3-4 BR |
| Townhouse | 2 | 6 | 3 | Typically 3-4 BR |
| Maisonette | 2 | 5 | 3 | Upper/lower split |
| Villa | 3 | 10 | 4 | Often 4-6 BR |

---

## 3. 7-Step Wizard Flow

### 3.1 Step Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RESIDENTIAL LISTING WIZARD                        │
│                              (7 Steps)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │ STEP 1  │───▶│ STEP 2  │───▶│ STEP 3  │───▶│ STEP 4  │              │
│  │  Type   │    │Location │    │ Details │    │Amenities│              │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘              │
│       │                                             │                    │
│       │                                             ▼                    │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │PUBLISH! │◀───│ STEP 7  │◀───│ STEP 6  │◀───│ STEP 5  │              │
│  │         │    │ Review  │    │ Pricing │    │ Photos  │              │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘              │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════    │
│  Progress: ████████████████████████████████████████░░░░░░░░  75%        │
│  Draft auto-saved • Last saved: 2 minutes ago                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Step Configuration

| Step | ID | Title | Short Title | Required Fields | Validation |
|------|-----|-------|-------------|-----------------|------------|
| 1 | Type | "What are you listing?" | Type | Property type | Must select one |
| 2 | Location | "Where is it located?" | Location | Area, address | Area required |
| 3 | Details | "Tell us about the unit" | Details | Condition | Condition required |
| 4 | Amenities | "What's included?" | Amenities | None | Optional |
| 5 | Photos | "Add photos" | Photos | At least 1 photo | Min 1 photo |
| 6 | Pricing | "Set your price" | Pricing | Rent, availability, payment | All required |
| 7 | Review | "Review & publish" | Review | Terms accepted | Must accept |

### 3.3 Navigation Rules

- **Back**: Always enabled (except Step 1)
- **Next**: Enabled when current step is valid
- **Skip**: Not allowed (all steps required)
- **Save Draft**: Always available
- **Exit**: Prompts if unsaved changes

---

## 4. Step-by-Step Specifications

### 4.1 Step 1: Property Type Selection

#### Purpose
Select the type of residential property being listed.

#### UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              What are you listing?                          │
│         Select the type that best describes                 │
│               your rental unit                              │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │    🛏️     │  │    ⬜     │  │    🏢     │  │    🏠    │ │
│  │ Bedsitter │  │  Studio   │  │ Apartment │  │  House   │ │
│  │ Room +    │  │ Open-plan │  │ 1+ BR     │  │Standalone│ │
│  │kitchenette│  │   unit    │  │   unit    │  │   home   │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │    🏘️     │  │    🏰     │  │    👑     │               │
│  │ Townhouse │  │Maisonette │  │   Villa   │               │
│  │Multi-story│  │ 2-story   │  │  Premium  │               │
│  │shared wall│  │ in bldg   │  │standalone │               │
│  └───────────┘  └───────────┘  └───────────┘               │
│                                                             │
│                              [Continue →]                   │
└─────────────────────────────────────────────────────────────┘
```

#### Behavior
- Grid layout: 4 columns on desktop, 2 on mobile
- Selected state: Teal border + checkmark
- Auto-sets default bedroom count based on type

---

### 4.2 Step 2: Location

#### Purpose
Capture the property's location with Nairobi-optimized area selection.

#### UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Where is it located?                           │
│           Help tenants find your property                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LOCATION                                             │   │
│  │                                                       │   │
│  │ Area/Neighborhood *                                  │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Kilimani                                      ▼ │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Building/Estate Name                                 │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Emerald Gardens                                  │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Unit Number (optional)                               │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ A-12                                             │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ ☐ Hide exact address from public listing             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ADDRESS                                              │   │
│  │                                                       │   │
│  │ Street Address                                       │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Ring Road, Kilimani                              │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Landmarks (helps with directions)                    │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Near Yaya Centre, opposite Shell petrol         │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   📍 MAP                             │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │                                             │   │   │
│  │   │       [Interactive Map - Pin Location]      │   │   │
│  │   │                                             │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │   Click to pin or drag marker to exact location     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Nairobi Area Categories

| Tier | Areas | Typical Rent Range |
|------|-------|-------------------|
| **High-End** | Karen, Runda, Muthaiga, Kitisuru, Nyari, Rosslyn, Gigiri | 150K - 1M+ |
| **Upper-Middle** | Kilimani, Kileleshwa, Lavington, Westlands, Parklands, Riverside, Loresho | 80K - 200K |
| **Middle** | South B, South C, Langata, Ngumo, Hurlingham, Nairobi West, Madaraka | 40K - 100K |
| **Affordable** | Eastleigh, Roysambu, Kasarani, Kahawa, Zimmerman, Ruaka, Ruiru | 15K - 50K |
| **Budget** | Pipeline, Umoja, Donholm, Buruburu, Kayole, Embakasi, Utawala | 8K - 30K |

---

### 4.3 Step 3: Property Details

#### Purpose
Capture physical specifications: bedrooms, bathrooms, size, condition, furnishing.

#### UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Tell us about the unit                         │
│            Size, condition, and what's included             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ BASICS                                               │   │
│  │                                                       │   │
│  │ Bedrooms *             Bathrooms *                   │   │
│  │ ┌───┐ ┌───┐ ┌───┐     ┌───┐ ┌───┐ ┌───┐            │   │
│  │ │ - │ │ 3 │ │ + │     │ - │ │ 2 │ │ + │            │   │
│  │ └───┘ └───┘ └───┘     └───┘ └───┘ └───┘            │   │
│  │                                                       │   │
│  │ Size                   Unit                          │   │
│  │ ┌─────────────────┐   ○ sqft  ● sqm                 │   │
│  │ │ 1,200           │                                  │   │
│  │ └─────────────────┘                                  │   │
│  │                                                       │   │
│  │ Floor Level            Total Floors in Building      │   │
│  │ ┌─────────────────▼┐   ┌─────────────────┐          │   │
│  │ │ 5th Floor        │   │ 8               │          │   │
│  │ └──────────────────┘   └─────────────────┘          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CONDITION *                                          │   │
│  │                                                       │   │
│  │ ┌─────────────┐  ┌─────────────┐                    │   │
│  │ │ ● Excellent │  │ ○ Good      │                    │   │
│  │ │ Like new    │  │ Well kept   │                    │   │
│  │ └─────────────┘  └─────────────┘                    │   │
│  │ ┌─────────────┐  ┌─────────────┐                    │   │
│  │ │ ○ Fair      │  │ ○ Needs Work│                    │   │
│  │ │ Some wear   │  │ Repairs     │                    │   │
│  │ └─────────────┘  └─────────────┘                    │   │
│  │                                                       │   │
│  │ Year Built           Last Renovated                  │   │
│  │ ┌───────────────┐    ┌───────────────┐              │   │
│  │ │ 2018          │    │ 2024          │              │   │
│  │ └───────────────┘    └───────────────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ FURNISHING                                           │   │
│  │                                                       │   │
│  │ ○ Unfurnished - Empty, no furniture                  │   │
│  │ ○ Semi-Furnished - Basic furniture included          │   │
│  │ ● Fully Furnished - Move-in ready                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Field Specifications

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Bedrooms | Number (increment) | Yes | 0-20 |
| Bathrooms | Number (increment) | Yes | 1-10 |
| Size | Number | No | 50-50,000 |
| Size Unit | Radio | No | sqft/sqm |
| Floor Level | Dropdown | No | List of floors |
| Total Floors | Number | No | 1-50 |
| Year Built | Number | No | 1900-current |
| Last Renovated | Number | No | >= year built |
| Condition | Radio cards | Yes | 4 options |
| Furnishing | Radio | Yes | 3 options |

---

### 4.4 Step 4: Amenities & Features

#### Purpose
Select amenities organized by category, with Kenya-specific features.

#### Amenity Categories

| Category | Icon | Amenities |
|----------|------|-----------|
| **Water & Utilities** | 💧 | 24/7 Water, Water Tank, Borehole, Water Included, KPLC, Prepaid Meter, Generator, Solar |
| **Security** | 🛡️ | Perimeter Wall, 24hr Guard, CCTV, Electric Fence, Controlled Gate, Intercom, Caretaker |
| **Indoor Features** | 🛋️ | Hot Water, Bathtub, Built-in Wardrobes, Walk-in Closet, AC, Ceiling Fans, Fireplace, Balcony, Tiled Floors, Wooden Floors, En-suite, Guest Toilet, DSQ |
| **Kitchen** | 🍳 | Gas Allowed, Piped Gas, Kitchen Cabinets, Granite Counters |
| **Building/Compound** | 🏢 | Pool, Gym, Garden, Playground, Rooftop, Elevator, Laundry Room, Storage, BBQ Area, Clubhouse |

#### Enhanced Features

**Parking Options:**
- None
- Covered
- Open
- Garage

**Pet Policy:**
- Not Allowed
- Small Pets Only (cats, dogs <10kg)
- All Pets Allowed
- Case by Case

**Smoking Policy:**
- Not Allowed
- Balcony/Outdoor Only
- Allowed

**Security Features:**
- Security Guard: None / Daytime / 24-Hour
- CCTV: None / Entry Points / Full Coverage
- Access Control: None / Key / Card / Biometric

**Water & Power:**
- Water Reliability: 24/7 / Rationed / Tank Backup
- Backup Power: None / Common Areas / Full

**Internet:**
- Available ISPs: Safaricom, Zuku, JTL, Faiba, Airtel, Liquid, Starlink

---

### 4.5 Step 5: Photos

#### Purpose
Upload property photos with drag-and-drop, organized by category.

#### UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    Add photos                               │
│        Photos are the #1 factor in getting inquiries        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │    ┌─────────────────────────────────────────────┐   │   │
│  │    │                                             │   │   │
│  │    │           📷 Drag photos here               │   │   │
│  │    │              or click to browse             │   │   │
│  │    │                                             │   │   │
│  │    │        JPG, PNG up to 10MB each            │   │   │
│  │    │                                             │   │   │
│  │    └─────────────────────────────────────────────┘   │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  UPLOADED PHOTOS (5/20)                                     │
│                                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────┐ │
│  │ ⭐     │  │        │  │        │  │        │  │      │ │
│  │ COVER  │  │ Living │  │ Bedroom│  │ Kitchen│  │ Bath │ │
│  │ Room   │  │  Room  │  │        │  │        │  │      │ │
│  │ [✕]    │  │ [✕]    │  │ [✕]    │  │ [✕]    │  │ [✕]  │ │
│  └────────┘  └────────┘  └────────┘  └────────┘  └──────┘ │
│                                                             │
│  ℹ️ First photo will be the cover image                     │
│  ℹ️ Drag to reorder photos                                  │
│                                                             │
│  VIDEO (optional)                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ YouTube or Vimeo URL                                 │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ https://youtube.com/watch?v=...                 │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Photo Categories (Residential)

| Category | Priority | Description |
|----------|----------|-------------|
| Living Room | Required | Main living space |
| Bedroom | Required | Master/bedrooms |
| Kitchen | Required | Kitchen area |
| Bathroom | Required | Bathroom/toilet |
| Exterior | Recommended | Building/house exterior |
| Balcony | Optional | If available |
| View | Optional | Window view |
| Parking | Optional | Parking space |
| Compound | Optional | Garden, pool, etc. |

---

### 4.6 Step 6: Pricing & Availability

#### Purpose
Set rent, deposit, fees, lease terms, and payment methods.

#### UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    Set your price                           │
│            Competitive pricing gets more inquiries          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ RENT                                                 │   │
│  │                                                       │   │
│  │ Monthly Rent *                                       │   │
│  │ ┌──────┐ ┌────────────────────────────────────────┐ │   │
│  │ │ KES ▼│ │ 85,000                                 │ │   │
│  │ └──────┘ └────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ ☐ Rent is negotiable                                 │   │
│  │                                                       │   │
│  │ Similar properties in Kilimani: KSh 70K - 100K       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DEPOSIT                                              │   │
│  │                                                       │   │
│  │ Deposit Amount                                       │   │
│  │ ○ 1 month (KSh 85,000)                              │   │
│  │ ● 2 months (KSh 170,000)                            │   │
│  │ ○ 3 months (KSh 255,000)                            │   │
│  │ ○ Custom amount                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ADDITIONAL FEES                                      │   │
│  │                                                       │   │
│  │ Service Charge (monthly)     Agent/Commission Fee    │   │
│  │ ┌────────────────────┐       ┌────────────────────┐ │   │
│  │ │ KSh 5,000          │       │ 1 month rent       │ │   │
│  │ └────────────────────┘       └────────────────────┘ │   │
│  │                                                       │   │
│  │ Custom Fees:                                         │   │
│  │ ┌─────────────────────────────────────┐ ┌─────────┐ │   │
│  │ │ Legal fee - KSh 10,000 (one-time)   │ │  [✕]    │ │   │
│  │ └─────────────────────────────────────┘ └─────────┘ │   │
│  │ [+ Add another fee]                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LEASE TERMS                                          │   │
│  │                                                       │   │
│  │ Lease Type *           Minimum Duration              │   │
│  │ ○ Monthly              ┌────────────────────┐       │   │
│  │ ● Fixed Term           │ 12 months       ▼ │       │   │
│  │ ○ Flexible             └────────────────────┘       │   │
│  │                                                       │   │
│  │ Available From *                                     │   │
│  │ ┌────────────────────────────────────────────────┐  │   │
│  │ │ 📅 February 1, 2026                            │  │   │
│  │ └────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PAYMENT METHODS *                                    │   │
│  │                                                       │   │
│  │ ☑ M-Pesa       ☑ Bank Transfer      ☐ Cheque        │   │
│  │ ☐ Airtel Money  ☐ Cash                               │   │
│  │                                                       │   │
│  │ Rent includes:                                       │   │
│  │ ☑ Water  ☑ Garbage  ☐ Electricity  ☐ Internet       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Pricing Fields

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Rent Amount | Currency input | Yes | — |
| Currency | Dropdown | Yes | KES |
| Rent Negotiable | Checkbox | No | false |
| Deposit Months | Radio (1/2/3/Custom) | Yes | 2 |
| Service Charge | Currency input | No | — |
| Agent Fee | Currency/% | No | — |
| Lease Type | Radio | Yes | Fixed |
| Min Duration | Dropdown (months) | Yes | 12 |
| Available From | Date picker | Yes | — |
| Payment Methods | Checkboxes | Yes | M-Pesa |
| Rent Includes | Checkboxes | No | — |

---

### 4.7 Step 7: Review & Publish

#### Purpose
Final review of all information before publishing.

#### Sections Displayed

1. **Property Summary Card** - Type, location, rent
2. **Details Summary** - Bedrooms, bathrooms, size, condition
3. **Amenities List** - Selected amenities grouped
4. **Photo Gallery** - All uploaded photos
5. **Pricing Breakdown** - Rent, deposit, fees
6. **Terms & Conditions** - Checkbox to accept

#### Actions

- **Edit Any Section** - Click to jump to that step
- **Save as Draft** - Save without publishing
- **Publish Listing** - Submit for review/publish

---

## 5. Database Schema

### 5.1 Listings Table (Residential Fields)

```sql
-- Core Identification
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
landlord_id UUID REFERENCES profiles(id),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
status TEXT DEFAULT 'draft', -- draft, pending, active, rented, inactive

-- Step 1: Property Type
property_type TEXT NOT NULL, -- bedsitter, studio, apartment, house, townhouse, maisonette, villa
listing_category TEXT DEFAULT 'residential',

-- Step 2: Location
building_name TEXT,
address TEXT,
street_address TEXT,
latitude DECIMAL(10,8),
longitude DECIMAL(11,8),
area TEXT NOT NULL, -- kilimani, westlands, etc.
city TEXT DEFAULT 'Nairobi',
unit_number TEXT,
hide_exact_address BOOLEAN DEFAULT false,
landmarks TEXT,
plot_number TEXT,

-- Step 3: Details
bedrooms INTEGER DEFAULT 1,
bathrooms INTEGER DEFAULT 1,
size_sqft INTEGER,
size_unit TEXT DEFAULT 'sqft',
floor_level TEXT,
total_floors INTEGER,
year_built INTEGER,
condition TEXT, -- excellent, good, fair, needs_work
last_renovated INTEGER,
furnishing TEXT DEFAULT 'unfurnished', -- unfurnished, semi_furnished, fully_furnished

-- Step 4: Amenities
amenities JSONB DEFAULT '[]', -- Array of amenity IDs
parking TEXT DEFAULT 'none', -- none, covered, open, garage
parking_spaces INTEGER DEFAULT 1,
pet_policy TEXT DEFAULT 'not_allowed',
smoking_policy TEXT DEFAULT 'not_allowed',
airbnb_allowed BOOLEAN DEFAULT false,
party_friendly BOOLEAN DEFAULT false,
security_guard TEXT DEFAULT 'none',
cctv TEXT DEFAULT 'none',
access_control TEXT DEFAULT 'none',
water_reliability TEXT DEFAULT '24_7',
has_water_storage BOOLEAN DEFAULT false,
backup_power TEXT DEFAULT 'none',
internet_ready BOOLEAN DEFAULT false,
available_isps JSONB DEFAULT '[]',
kitchen_type TEXT DEFAULT 'full',

-- Step 5: Photos
photos JSONB DEFAULT '[]', -- Array of photo objects
video_url TEXT,

-- Step 6: Pricing
rent_amount DECIMAL(10,2) NOT NULL,
currency TEXT DEFAULT 'KES',
rent_negotiable BOOLEAN DEFAULT false,
deposit_months INTEGER DEFAULT 2,
deposit_amount DECIMAL(10,2),
agent_fee DECIMAL(10,2),
agent_fee_type TEXT DEFAULT 'fixed',
service_charge DECIMAL(10,2),
custom_fees JSONB DEFAULT '[]',
lease_term TEXT DEFAULT 'fixed',
min_lease_months INTEGER DEFAULT 12,
payment_frequency TEXT DEFAULT 'monthly',
payment_methods JSONB DEFAULT '["mpesa"]',
rent_due_day INTEGER DEFAULT 5,
available_from DATE,
available_now BOOLEAN DEFAULT true,
current_status TEXT DEFAULT 'vacant',
rent_includes JSONB DEFAULT '[]',

-- Step 7: Meta
title TEXT,
description TEXT,
views_count INTEGER DEFAULT 0,
inquiries_count INTEGER DEFAULT 0,
published_at TIMESTAMPTZ,

-- Indexes
CREATE INDEX idx_listings_landlord ON listings(landlord_id);
CREATE INDEX idx_listings_area ON listings(area);
CREATE INDEX idx_listings_type ON listings(property_type);
CREATE INDEX idx_listings_rent ON listings(rent_amount);
CREATE INDEX idx_listings_bedrooms ON listings(bedrooms);
CREATE INDEX idx_listings_status ON listings(status);
```

---

## 6. Form Data Structure

### 6.1 TypeScript Interface

```typescript
export interface PropertyFormData {
  // Step 1: Property Type
  propertyType: PropertyType | null;
  
  // Step 2: Location
  buildingName: string;
  address: string;
  streetAddress: string;
  latitude: number | null;
  longitude: number | null;
  area: string;
  city: string;
  unitNumber: string;
  hideExactAddress: boolean;
  landmarks: string;
  plotNumber: string;
  
  // Step 3: Details
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number | null;
  sizeUnit: "sqft" | "sqm";
  floorLevel: string;
  totalFloors: number | null;
  yearBuilt: number | null;
  condition: PropertyCondition | null;
  lastRenovated: number | null;
  furnishing: FurnishingType;
  
  // Step 4: Amenities
  amenities: string[];
  parking: ParkingType;
  parkingSpaces: number;
  petPolicy: PetPolicyType;
  smokingPolicy: SmokingPolicyType;
  airbnbAllowed: boolean;
  partyFriendly: boolean;
  securityGuard: SecurityGuardType;
  cctv: CCTVType;
  accessControl: AccessControlType;
  waterReliability: WaterReliabilityType;
  hasWaterStorage: boolean;
  backupPower: BackupPowerType;
  internetReady: boolean;
  availableIsps: string[];
  kitchenType: KitchenType;
  
  // Step 5: Photos
  photos: PropertyPhoto[];
  videoUrl: string;
  
  // Step 6: Pricing
  rentAmount: number | null;
  currency: string;
  rentNegotiable: boolean;
  depositMonths: number;
  depositAmount: number | null;
  agentFee: number | null;
  agentFeeType: "fixed" | "percentage";
  serviceCharge: number | null;
  customFees: CustomFee[];
  leaseTerm: LeaseTermType;
  minLeaseMonths: number;
  paymentFrequency: PaymentFrequency;
  paymentMethods: string[];
  rentDueDay: number;
  availableFrom: string | null;
  availableNow: boolean;
  currentStatus: "vacant" | "occupied";
  rentIncludes: string[];
  
  // Step 7: Description
  title: string;
  description: string;
  termsAccepted: boolean;
}
```

### 6.2 Default Values

```typescript
export const DEFAULT_FORM_DATA: PropertyFormData = {
  propertyType: null,
  buildingName: "",
  address: "",
  streetAddress: "",
  latitude: null,
  longitude: null,
  area: "",
  city: "Nairobi",
  unitNumber: "",
  hideExactAddress: false,
  landmarks: "",
  plotNumber: "",
  bedrooms: 3,
  bathrooms: 2,
  sizeSqft: null,
  sizeUnit: "sqft",
  floorLevel: "",
  totalFloors: null,
  yearBuilt: null,
  condition: null,
  lastRenovated: null,
  furnishing: "unfurnished",
  amenities: [],
  parking: "none",
  parkingSpaces: 1,
  petPolicy: "not_allowed",
  smokingPolicy: "not_allowed",
  airbnbAllowed: false,
  partyFriendly: false,
  securityGuard: "none",
  cctv: "none",
  accessControl: "none",
  waterReliability: "24_7",
  hasWaterStorage: false,
  backupPower: "none",
  internetReady: false,
  availableIsps: [],
  kitchenType: "full",
  photos: [],
  videoUrl: "",
  rentAmount: null,
  currency: "KES",
  rentNegotiable: false,
  depositMonths: 2,
  depositAmount: null,
  agentFee: null,
  agentFeeType: "fixed",
  serviceCharge: null,
  customFees: [],
  leaseTerm: "fixed",
  minLeaseMonths: 12,
  paymentFrequency: "monthly",
  paymentMethods: ["mpesa"],
  rentDueDay: 5,
  availableFrom: null,
  availableNow: true,
  currentStatus: "vacant",
  rentIncludes: [],
  title: "",
  description: "",
  termsAccepted: false,
};
```

---

## 7. Validation Rules

### 7.1 Per-Step Validation

| Step | Field | Rule | Error Message |
|------|-------|------|---------------|
| 1 | Property Type | Required | "Please select a property type" |
| 2 | Area | Required | "Please select an area" |
| 3 | Condition | Required | "Please select property condition" |
| 3 | Year Built | 1900-current | "Please enter a valid year" |
| 3 | Last Renovated | >= Year Built | "Renovation year cannot be before build year" |
| 4 | — | None required | — |
| 5 | Photos | Min 1 | "Please upload at least one photo" |
| 6 | Rent Amount | > 0 | "Please enter a valid rent amount" |
| 6 | Available From | Required | "Please select when property is available" |
| 6 | Payment Methods | Min 1 | "Select at least one payment method" |
| 7 | Terms Accepted | Required | "Please accept terms and conditions" |

### 7.2 Field Ranges

| Field | Min | Max |
|-------|-----|-----|
| Bedrooms | 0 | 20 |
| Bathrooms | 1 | 10 |
| Size (sqft) | 50 | 50,000 |
| Total Floors | 1 | 50 |
| Year Built | 1900 | Current Year |
| Rent Amount | 1,000 | 10,000,000 |
| Deposit Months | 1 | 12 |
| Min Lease Months | 1 | 60 |
| Rent Due Day | 1 | 28 |
| Photos | 1 | 20 |

---

## 8. Kenya Market Context

### 8.1 Rent Benchmarks by Area (2025-2026)

| Area Tier | Bedsitter | Studio | 1 BR | 2 BR | 3 BR | 4+ BR |
|-----------|-----------|--------|------|------|------|-------|
| **High-End** (Karen, Runda) | N/A | 40-60K | 80-120K | 120-180K | 180-300K | 300K+ |
| **Upper-Middle** (Kilimani) | 12-18K | 25-40K | 45-70K | 70-120K | 100-180K | 150K+ |
| **Middle** (South B/C) | 8-12K | 15-25K | 25-40K | 40-60K | 55-90K | 80K+ |
| **Affordable** (Roysambu) | 5-8K | 10-18K | 18-30K | 28-45K | 40-60K | 55K+ |
| **Budget** (Umoja) | 4-6K | 8-15K | 12-22K | 18-35K | 30-50K | 45K+ |

### 8.2 Typical Lease Terms

| Property Type | Typical Deposit | Min Lease | Common Duration |
|---------------|-----------------|-----------|-----------------|
| Bedsitter | 1 month | Monthly | 6-12 months |
| Studio | 1-2 months | Monthly | 6-12 months |
| Apartment | 2 months | 6 months | 12 months |
| House | 2-3 months | 12 months | 12-24 months |
| Townhouse | 2-3 months | 12 months | 12-24 months |
| Villa | 3-6 months | 12-24 months | 24-36 months |

### 8.3 Payment Method Preferences

| Method | Usage | Notes |
|--------|-------|-------|
| **M-Pesa** | 70%+ | Most common, instant |
| **Bank Transfer** | 25% | Corporate tenants |
| **Cheque** | 5% | Declining, some landlords |
| **Cash** | <5% | Discouraged, no trail |

### 8.4 Service Charge Components (Typical)

| Item | Typical Range | Notes |
|------|---------------|-------|
| Security | 1,000 - 5,000 | Guards, CCTV |
| Cleaning | 500 - 2,000 | Common areas |
| Garbage | 200 - 500 | County collection |
| Water (shared) | 500 - 2,000 | Building tanks |
| Generator | 500 - 2,000 | Fuel contribution |
| Maintenance | 500 - 2,000 | Repairs fund |

---

## 9. UI/UX Design Patterns

### 9.1 Design System

| Element | Style |
|---------|-------|
| Primary Color | Teal (#0D9488) |
| Selection State | Teal border + light teal background |
| Error State | Orange/Red (#F97316) |
| Cards | White bg, gray-200 border, rounded-xl |
| Buttons | Teal bg, white text, rounded-lg |
| Inputs | Gray-300 border, rounded-lg, focus:teal |

### 9.2 Mobile Responsiveness

| Breakpoint | Grid Columns | Behavior |
|------------|--------------|----------|
| Mobile (<640px) | 1-2 | Stack vertically |
| Tablet (640-1024px) | 2-3 | Side by side |
| Desktop (>1024px) | 3-4 | Full grid |

### 9.3 Accessibility

- All interactive elements have focus states
- Form labels properly associated
- Error messages linked to fields
- Keyboard navigation supported
- Color contrast meets WCAG AA

---

## Appendix A: File Structure

```
src/app/dashboard/landlord/listings/new/
├── page.tsx                 # Main wizard page
├── context.tsx              # Wizard state management
├── types.ts                 # All TypeScript types & constants
├── WizardProgress.tsx       # Progress bar component
├── WizardNavigation.tsx     # Back/Next buttons
├── usePhotoUpload.ts        # Photo upload hook
├── listing-service.ts       # API/database operations
└── steps/
    ├── index.ts             # Export all steps
    ├── Step1PropertyType.tsx
    ├── Step2Location.tsx
    ├── Step3Details.tsx
    ├── Step4Amenities.tsx
    ├── Step5Photos.tsx
    ├── Step6Pricing.tsx
    └── Step7Review.tsx
```

---

## Appendix B: Kenya-Specific Terms

| Term | Definition |
|------|------------|
| **Bedsitter** | Single room with kitchenette, shared bathroom |
| **DSQ** | Domestic Staff Quarter - servant's quarters |
| **Maisonette** | Duplex apartment (2 floors) within a building |
| **Caretaker** | On-site property manager |
| **Service Charge** | Monthly fee for shared amenities |
| **KPLC** | Kenya Power and Lighting Company |
| **Prepaid Meter** | Pay-as-you-go electricity |
| **M-Pesa** | Mobile money transfer service |
| **Paybill** | M-Pesa business payment number |

---

## Appendix C: Amenity IDs Reference

```typescript
// Water & Utilities
"water_24_7", "water_tank", "borehole", "water_included",
"electricity_kplc", "prepaid_meter", "generator", "solar"

// Security
"perimeter_wall", "security_guard", "cctv", "electric_fence",
"controlled_gate", "intercom", "caretaker"

// Indoor Features
"hot_water", "bathtub", "built_in_wardrobes", "walk_in_closet",
"air_conditioning", "ceiling_fans", "fireplace", "balcony",
"tiled_floors", "wooden_floors", "ensuite", "guest_toilet", "dsq"

// Kitchen
"gas_allowed", "gas_piped", "kitchen_cabinets", "granite_counters"

// Building/Compound
"swimming_pool", "gym", "garden", "playground", "rooftop",
"elevator", "laundry_room", "storage", "bbq_area", "clubhouse"
```

---

*Document End*
*Version 1.0 - Residential Listings (Implemented)*
*Last Updated: January 2026*
