# Mitasafi Landing Page Content

**Version:** 1.0  
**Date:** December 30, 2025  
**Status:** Approved  
**Lead User:** Tenant-First Approach

---

## 1. SEO Foundation

### Primary Keywords

| Priority | Keyword | Search Intent | Monthly Volume (Est.) |
|----------|---------|---------------|----------------------|
| P1 | houses for rent in Nairobi | Transactional | High |
| P1 | apartments for rent Nairobi | Transactional | High |
| P1 | rental houses in Nairobi | Transactional | High |
| P2 | bedsitter for rent Nairobi | Transactional | Medium |
| P2 | 1 bedroom apartment Nairobi | Transactional | Medium |
| P2 | houses for rent Kilimani | Transactional | Medium |
| P2 | rental apartments Westlands | Transactional | Medium |
| P3 | how to find a house in Nairobi | Informational | Medium |
| P3 | tenant rights Kenya | Informational | Low |
| P3 | landlord tenant agreement Kenya | Informational | Low |

### Secondary Keywords (Long-tail)

- verified rental listings Nairobi
- trusted landlords Kenya
- rental payment tracking app
- house hunting Nairobi
- apartments near me Nairobi
- cheap houses for rent in [sub-county]
- property management Nairobi

### Meta Tags

```html
<!-- Primary Meta Tags -->
<title>Mitasafi — Find Verified Rental Homes in Nairobi | Houses & Apartments for Rent</title>
<meta name="title" content="Mitasafi — Find Verified Rental Homes in Nairobi | Houses & Apartments for Rent">
<meta name="description" content="Discover verified rental homes in Nairobi. Browse apartments, bedsitters, and houses with real photos, honest prices, and direct landlord contact. No brokers. No hidden fees. Find your home today.">
<meta name="keywords" content="houses for rent Nairobi, apartments for rent Nairobi, rental homes Kenya, verified rentals, Nairobi apartments, bedsitter Nairobi, 1 bedroom Nairobi">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://mitasafi.co.ke/">
<meta property="og:title" content="Mitasafi — Find Verified Rental Homes in Nairobi">
<meta property="og:description" content="Renting shouldn't feel like gambling. Find verified homes with honest prices and direct landlord contact.">
<meta property="og:image" content="https://mitasafi.co.ke/og-image.jpg">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://mitasafi.co.ke/">
<meta property="twitter:title" content="Mitasafi — Find Verified Rental Homes in Nairobi">
<meta property="twitter:description" content="Renting shouldn't feel like gambling. Find verified homes with honest prices and direct landlord contact.">
<meta property="twitter:image" content="https://mitasafi.co.ke/twitter-image.jpg">

<!-- Canonical -->
<link rel="canonical" href="https://mitasafi.co.ke/">
```

### Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Mitasafi",
  "description": "Kenya's trusted rental platform connecting tenants with verified homes and honest landlords",
  "url": "https://mitasafi.co.ke",
  "applicationCategory": "Real Estate",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "KES",
    "description": "Free for tenants"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "2847"
  },
  "areaServed": {
    "@type": "City",
    "name": "Nairobi",
    "containedInPlace": {
      "@type": "Country",
      "name": "Kenya"
    }
  }
}
```

---

## 2. Page Structure Overview

```
┌─────────────────────────────────────────────────────────────┐
│  NAVIGATION BAR                                              │
├─────────────────────────────────────────────────────────────┤
│  HERO SECTION                                                │
├─────────────────────────────────────────────────────────────┤
│  TRUST BAR (Social Proof Numbers)                           │
├─────────────────────────────────────────────────────────────┤
│  PROBLEM STATEMENT                                           │
├─────────────────────────────────────────────────────────────┤
│  USER TYPE SELECTOR                                          │
├─────────────────────────────────────────────────────────────┤
│  FOR TENANTS (Default/Expanded)                             │
├─────────────────────────────────────────────────────────────┤
│  FOR LANDLORDS (Collapsed/Tab)                              │
├─────────────────────────────────────────────────────────────┤
│  FOR SERVICE PROVIDERS (Collapsed/Tab)                      │
├─────────────────────────────────────────────────────────────┤
│  HOW IT WORKS                                                │
├─────────────────────────────────────────────────────────────┤
│  FEATURE SHOWCASE                                            │
├─────────────────────────────────────────────────────────────┤
│  NAIROBI COVERAGE MAP                                        │
├─────────────────────────────────────────────────────────────┤
│  TESTIMONIALS                                                │
├─────────────────────────────────────────────────────────────┤
│  FAQ SECTION                                                 │
├─────────────────────────────────────────────────────────────┤
│  FINAL CTA                                                   │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Navigation Bar

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo: Mitasafi]     Browse Homes   For Landlords   For Service Providers   │
│                       How It Works   About                              │
│                                                    [Log In]  [Get Started]   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: Mitasafi]                              [☰ Menu]     │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Copy

| Item | Label | URL |
|------|-------|-----|
| Logo | Mitasafi | / |
| Nav 1 | Browse Homes | /properties |
| Nav 2 | For Landlords | /landlords |
| Nav 3 | For Service Providers | /service-providers |
| Nav 4 | How It Works | /#how-it-works |
| Nav 5 | About | /about |
| CTA Secondary | Log In | /login |
| CTA Primary | Get Started | /signup |

---

## 4. Hero Section

### Content

```
SECTION: Hero
BACKGROUND: Real Nairobi skyline photo (Kilimani/Westlands area) with gradient overlay
```

**Pre-headline (Badge):**
```
🏠 Trusted by 5,000+ renters in Nairobi
```

**Headline (H1):**
```
Renting Shouldn't Feel Like Gambling
```

**Subheadline:**
```
Verified homes. Honest landlords. Payments with proof.
Welcome to renting that finally makes sense.
```

**Primary CTA Button:**
```
Find Your Home
[Icon: Search]
```

**Secondary CTA Button:**
```
List Your Property
[Icon: Building]
```

**Supporting Text (Below CTAs):**
```
✓ Free for tenants  •  ✓ No broker fees  •  ✓ Verified listings only
```

**Hero Image/Visual:**
```
Option A: Split image showing:
- Left: Happy tenant receiving keys at a modern Nairobi apartment
- Right: Mobile phone showing Mitasafi app with property listing

Option B: Single image:
- Young professional couple viewing apartment with natural light
- Nairobi cityscape visible through window
- Phone in hand showing Mitasafi confirmation
```

**Image Alt Text:**
```
"Happy tenant receiving apartment keys in Nairobi through Mitasafi rental platform"
```

### Mobile Hero

**Headline (Shorter):**
```
Renting Shouldn't Feel Like Gambling
```

**Subheadline (Condensed):**
```
Verified homes. Honest prices. Direct landlord contact.
```

**Single CTA:**
```
Find Your Home →
```

---

## 5. Trust Bar (Social Proof)

### Pre-Launch Numbers (Dummy Data)

```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│    5,000+      │   KES 25M+     │     4.8★       │     98%        │
│ Verified Homes │ Rent Processed │ Average Rating │ Listing Accuracy│
└────────────────┴────────────────┴────────────────┴────────────────┘
```

### Desktop Layout

```
──────────────────────────────────────────────────────────────────────
   🏠 5,000+          💰 KES 25M+         ⭐ 4.8/5.0         ✓ 98%
   Verified           Rent Processed      Average           Listing
   Homes              Securely            Rating            Accuracy
──────────────────────────────────────────────────────────────────────
```

### Mobile Layout (2x2 Grid)

```
┌─────────────────┬─────────────────┐
│    5,000+       │   KES 25M+      │
│ Verified Homes  │ Rent Processed  │
├─────────────────┼─────────────────┤
│    4.8★         │     98%         │
│ Average Rating  │ Listing Accuracy│
└─────────────────┴─────────────────┘
```

### Security Badges Row

```
[SSL Secured] [M-Pesa Partner] [Data Protected] [Verified Platform]
```

---

## 6. Problem Statement Section

### Content

**Section ID:** `#the-problem`

**Eyebrow:**
```
THE RENTAL REALITY IN NAIROBI
```

**Headline (H2):**
```
Sound Familiar?
```

**Problem Cards (Grid of 4):**

**Card 1:**
```
Icon: [Camera with X]
Title: "Photos That Lie"
Body: "You show up excited. The '3-bedroom apartment' is actually a cramped bedsitter. The 'modern kitchen' hasn't been updated since 1995. Time wasted. Hope crushed."
```

**Card 2:**
```
Icon: [Hand with coins]
Title: "The Bribe Game"
Body: "KES 500 just to view. Another KES 1,000 to 'secure' it. The caretaker's cut. The agent's cut. Everyone takes a slice before you even move in."
```

**Card 3:**
```
Icon: [Receipt with question mark]
Title: "Payment Without Proof"
Body: "You send rent to the caretaker's personal M-Pesa. No receipt. Next month: 'We didn't receive your payment.' Your word against theirs."
```

**Card 4:**
```
Icon: [Wrench with X]
Title: "Repairs That Never Happen"
Body: "The leak started three months ago. You've reported it four times. Nothing. You fix it yourself. The landlord says 'What leak?' at move-out."
```

**Transition Statement:**
```
This isn't bad luck. It's a broken system.
And we built Mitasafi to fix it.
```

**CTA:**
```
See How We're Different →
```

---

## 7. User Type Selector

### Content

**Headline (H2):**
```
Built for Everyone in the Rental Ecosystem
```

**Subheadline:**
```
Whether you're searching for a home, managing properties, or offering services — Mitasafi works for you.
```

**Selector Tabs:**
```
┌─────────────────────────────────────────────────────────────┐
│  [🔑 I'm a Tenant]  [🏢 I'm a Landlord]  [🔧 I'm a Service Provider]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. For Tenants Section

### Content

**Section ID:** `#for-tenants`

**Eyebrow:**
```
FOR TENANTS
```

**Headline (H2):**
```
Find Home, Not Headaches
```

**Subheadline:**
```
Search with confidence. Move in with clarity. Live without the drama.
```

### Feature Cards (6 Cards)

**Card 1: Verified Listings**
```
Icon: [Shield with checkmark]
Title: "What You See Is What You Get"
Body: "Every listing is verified. Photos are timestamped. Prices include all costs — rent, water, garbage, parking. No surprises after you commit."
Stat: "98% of tenants say listings matched reality"
```

**Card 2: Direct Landlord Contact**
```
Icon: [Chat bubbles]
Title: "Talk to Decision Makers"
Body: "Message landlords directly through the app. Schedule viewings on your terms. No gatekeepers taking cuts or playing favorites."
Stat: "Average response time: 2 hours"
```

**Card 3: Virtual Tours**
```
Icon: [360° camera]
Title: "Tour From Your Couch"
Body: "See every room before you visit. 360° walkthroughs. Video tours. Detailed photo galleries. Save your weekends for the finalists only."
Stat: "Save 5+ hours per house hunt"
```

**Card 4: Secure Payments**
```
Icon: [Lock with M-Pesa logo]
Title: "Every Shilling Tracked"
Body: "Pay rent through the app via M-Pesa. Get instant digital receipts. Build your payment history. Never argue about whether you paid again."
Stat: "100% payment dispute resolution"
```

**Card 5: Maintenance Tracking**
```
Icon: [Clipboard with checkmark]
Title: "Issues Actually Get Fixed"
Body: "Report problems with photos and descriptions. Track status in real-time. Escalate if needed. Your home should work — and now there's accountability."
Stat: "72% of issues resolved within 48 hours"
```

**Card 6: Deposit Protection**
```
Icon: [Piggy bank with shield]
Title: "Your Deposit, Protected"
Body: "Full record of what you paid. Itemized deductions at move-out with photo evidence. Dispute unfair charges with documentation. Your money, your rights."
Stat: "KES 2.5M+ in deposits protected"
```

### CTA Block

**Headline:**
```
Ready to Find Your Next Home?
```

**Body:**
```
Join thousands of Nairobi renters who've stopped gambling and started living.
```

**Primary CTA:**
```
Browse Verified Homes
[Free to search. Free forever.]
```

**Secondary CTA:**
```
Create Free Account →
```

---

## 9. For Landlords Section

### Content

**Section ID:** `#for-landlords`

**Eyebrow:**
```
FOR LANDLORDS
```

**Headline (H2):**
```
Better Tenants, Less Stress
```

**Subheadline:**
```
Fill vacancies faster. Get paid on time. Know what's happening at your property.
```

### Feature Cards (5 Cards)

**Card 1: Tenant Verification**
```
Icon: [ID card with checkmark]
Title: "Know Who's Moving In"
Body: "Verified IDs. Employment confirmation. Rental history from previous landlords. Payment track record. Make informed decisions, not hopeful guesses."
Stat: "89% reduction in problematic tenancies"
```

**Card 2: Automated Rent Collection**
```
Icon: [Calendar with money]
Title: "Rent Comes to You"
Body: "Automated reminders go out before due date. Tenants pay through the app. Money hits your M-Pesa or bank account directly. No awkward conversations."
Stat: "95% on-time payment rate"
```

**Card 3: Zero Vacancy Marketing**
```
Icon: [Megaphone]
Title: "Fill Units Faster"
Body: "Your listing reaches thousands of verified, serious tenants. Professional presentation. No agents. No commission. Average vacancy: 12 days."
Stat: "3x faster than traditional listings"
```

**Card 4: Property Dashboard**
```
Icon: [Dashboard/graphs]
Title: "See Everything, From Anywhere"
Body: "Direct tenant communication. Maintenance requests with photos. Payment status at a glance. Financial reports. Finally know what's happening at your property."
Stat: "Real-time updates on every property"
```

**Card 5: Digital Lease Management**
```
Icon: [Document with signature]
Title: "Agreements That Protect You"
Body: "Generate professional lease agreements. Digital signatures. Automatic storage. Clear terms that hold up. Documented violations if things go wrong."
Stat: "Legally compliant templates included"
```

### Pricing Teaser

```
┌─────────────────────────────────────────────────────────────┐
│  FREE FOREVER                    │  PREMIUM                 │
│  For landlords with              │  For landlords with      │
│  1-3 units                       │  4+ units                │
│                                  │                          │
│  ✓ List properties               │  Everything in Free, plus:│
│  ✓ Receive applications          │  ✓ Priority placement    │
│  ✓ Message tenants               │  ✓ Tenant screening      │
│  ✓ Basic payment tracking        │  ✓ Advanced analytics    │
│  ✓ Maintenance requests          │  ✓ Bulk unit management  │
│                                  │  ✓ Dedicated support     │
│  [Get Started Free]              │  [See Premium Plans]     │
└─────────────────────────────────────────────────────────────┘
```

### CTA Block

**Headline:**
```
List Your First Property in 5 Minutes
```

**Body:**
```
No credit card required. No contracts. Start free, upgrade when you're ready.
```

**Primary CTA:**
```
List Your Property — Free
```

**Secondary CTA:**
```
See How It Works →
```

---

## 10. For Service Providers Section

### Content

**Section ID:** `#for-service-providers`

**Eyebrow:**
```
FOR SERVICE PROVIDERS
```

**Headline (H2):**
```
Grow Your Business, Not Your Stress
```

**Subheadline:**
```
Steady work. Trusted reputation. Guaranteed payment. Join Nairobi's rental service network.
```

### Feature Cards (4 Cards)

**Card 1: Steady Job Flow**
```
Icon: [Calendar with checkmarks]
Title: "Work That Comes to You"
Body: "Get notified when landlords and tenants need your skills. Plumbing, electrical, moving, cleaning — whatever you do, there's demand."
Stat: "Average 15+ job requests per month"
```

**Card 2: Verified Profile**
```
Icon: [Badge with star]
Title: "Build a Reputation That Travels"
Body: "Verified ID and business registration. Customer reviews visible to all. Portfolio of past work. Your reputation opens doors before you arrive."
Stat: "Verified providers earn 40% more"
```

**Card 3: Protected Payments**
```
Icon: [Shield with money]
Title: "Get Paid, Every Time"
Body: "Clear job scope and pricing upfront. Payment released on completion. No more chasing clients. No more broken promises."
Stat: "99.2% payment success rate"
```

**Card 4: Business Tools**
```
Icon: [Toolbox]
Title: "Run Your Business Smarter"
Body: "Track all jobs in one place. Send quotes quickly. Manage your schedule. Get insights on your busiest times and top services."
Stat: "Free business management tools"
```

### Service Categories

```
We're looking for verified providers in:

🔧 Plumbing        ⚡ Electrical       🎨 Painting
🚚 Moving          🧹 Cleaning         🔒 Security
🪚 Carpentry       🏗️ Masonry         📦 Fumigation
🌿 Landscaping     ❄️ HVAC            🔍 Inspection
```

### CTA Block

**Headline:**
```
Ready to Grow Your Client Base?
```

**Body:**
```
Join 500+ verified service providers serving Nairobi's rental community.
```

**Primary CTA:**
```
Apply as Service Provider
```

**Secondary CTA:**
```
See Requirements →
```

---

## 11. How It Works Section

### Content

**Section ID:** `#how-it-works`

**Eyebrow:**
```
HOW IT WORKS
```

**Headline (H2):**
```
Simple by Design
```

**Subheadline:**
```
We eliminated the complexity so you can focus on what matters.
```

### For Tenants (Default View)

**Tab Label:** `Finding a Home`

```
STEP 1                          STEP 2                          STEP 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Icon: Search/Filter]           [Icon: Chat/Calendar]           [Icon: Key]

Search & Filter                 Connect & Visit                 Move In

Browse verified listings        Message landlords directly.     Sign your lease digitally.
by location, price, size,       Schedule viewings that fit      Pay deposit securely.
and amenities. Take virtual     your schedule. Ask questions.   Get your keys.
tours. Save favorites.          Apply with one tap.             Start living.

"I found 12 options in          "Scheduled 3 viewings for       "Signed, paid, and moved
Kilimani under KES 35K          Saturday afternoon. No          in within a week. No
in 10 minutes."                 phone tag. No bribes."          broker involved."
```

### For Landlords

**Tab Label:** `Listing a Property`

```
STEP 1                          STEP 2                          STEP 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Icon: Upload/Camera]           [Icon: Users/Filter]            [Icon: Dashboard]

List Your Property              Select Your Tenant              Manage with Ease

Add photos, details, and        Review applications with        Collect rent automatically.
pricing in under 5 minutes.     verified backgrounds.           Track maintenance.
Set your requirements.          Message candidates.             See everything in
Go live instantly.              Choose with confidence.         one dashboard.

"Listed my 8 units in           "I can see payment history      "First month I didn't
one afternoon. Each got         from previous landlords.        have to chase rent.
inquiries within hours."        Game changer."                  Ever."
```

### For Service Providers

**Tab Label:** `Getting Jobs`

```
STEP 1                          STEP 2                          STEP 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Icon: Profile/Badge]           [Icon: Bell/Accept]             [Icon: Money/Star]

Create Your Profile             Accept Jobs                     Get Paid & Rated

Add your services, photos       Receive notifications for       Complete the job.
of past work, and pricing.      matching jobs. Review           Get paid through the app.
Get verified. Build your        details. Accept what fits       Earn reviews that bring
portfolio.                      your schedule.                  more work.

"My profile shows 47            "I pick jobs that match         "Clients pay on time now.
five-star reviews. Clients      my skills and location.         And every good review
trust me before we meet."       No more dead-end calls."        brings more business."
```

---

## 12. Feature Showcase Section

### Content

**Section ID:** `#features`

**Eyebrow:**
```
FEATURES
```

**Headline (H2):**
```
Everything You Need, Nothing You Don't
```

**Subheadline:**
```
Built for how Nairobi actually rents. Every feature solves a real problem.
```

### Feature Grid (8 Features)

**Feature 1:**
```
Icon: [Shield with checkmark]
Title: Verified Listings
Body: Every property checked. Every photo authenticated. Every price confirmed. See exactly what you're getting.
```

**Feature 2:**
```
Icon: [Chat bubbles]
Title: Direct Messaging
Body: Talk to landlords, tenants, and service providers without sharing your phone number. All conversations saved.
```

**Feature 3:**
```
Icon: [M-Pesa logo + lock]
Title: Secure Payments
Body: Pay and receive rent via M-Pesa. Instant receipts. Complete history. Bank-level security.
```

**Feature 4:**
```
Icon: [Star]
Title: Trust Ratings
Body: Tenants rate landlords. Landlords rate tenants. Service providers earn reviews. Reputation matters.
```

**Feature 5:**
```
Icon: [Wrench + checkmark]
Title: Maintenance Tracking
Body: Report issues with photos. Track repair status. Get notifications on progress. Accountability built in.
```

**Feature 6:**
```
Icon: [Map pin]
Title: Smart Search
Body: Filter by sub-county, budget, bedrooms, amenities. Calculate commute times. Find your perfect neighborhood.
```

**Feature 7:**
```
Icon: [Document + pen]
Title: Digital Leases
Body: Generate, sign, and store lease agreements digitally. Clear terms. Legal protection. No paper chase.
```

**Feature 8:**
```
Icon: [Piggy bank]
Title: Deposit Tracking
Body: Record deposits paid. Document property condition at move-in. Fair, transparent move-out process.
```

### Mobile App Teaser

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Phone mockup showing Mitasafi app]                      │
│                                                             │
│   COMING SOON                                               │
│   Take Mitasafi Everywhere                                  │
│                                                             │
│   Get notified of new listings instantly.                   │
│   Message on the go. Pay from anywhere.                     │
│   Your rental life in your pocket.                          │
│                                                             │
│   [Notify Me When App Launches]                            │
│                                                             │
│   [App Store badge]  [Play Store badge]                    │
│   Coming Q2 2026                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Nairobi Coverage Section

### Content

**Section ID:** `#coverage`

**Eyebrow:**
```
COVERAGE
```

**Headline (H2):**
```
All of Nairobi, One Platform
```

**Subheadline:**
```
From Eastlands to Westlands, Karen to Kasarani — we've got you covered.
```

### Interactive Map

```
[Interactive map of Nairobi County showing all 17 sub-counties]

Highlighted areas with listing counts:

WESTLANDS ━━━━━━━━━━ 850+ listings
├── Parklands
├── Highridge  
├── Kangemi
└── Mountain View

LANGATA ━━━━━━━━━━━━ 620+ listings
├── Karen
├── Nairobi West
├── South C
└── Nyayo Highrise

DAGORETTI ━━━━━━━━━━ 540+ listings
├── Kilimani
├── Kawangware
├── Lavington
└── Riruta

EMBAKASI ━━━━━━━━━━━ 780+ listings
├── Pipeline
├── Utawala
├── Embakasi
└── Donholm

... [All 17 sub-counties listed]
```

### Popular Neighborhoods Quick Links

```
Popular Searches:

🔥 Kilimani apartments     🔥 Westlands rentals      🔥 South B houses
🔥 Ruaka bedsitters        🔥 Kasarani singles       🔥 Rongai budget
🔥 Ngong Road studios      🔥 Umoja 2-bedrooms       🔥 Kileleshwa flats
```

### CTA

```
[Search Your Neighborhood →]
```

---

## 14. Testimonials Section

### Content

**Section ID:** `#testimonials`

**Eyebrow:**
```
TESTIMONIALS
```

**Headline (H2):**
```
Real Stories from Real People
```

**Subheadline:**
```
Don't take our word for it. Here's what our community has to say.
```

### Testimonial Cards

**Testimonial 1 (Tenant - Featured):**
```
Rating: ⭐⭐⭐⭐⭐

"I'd visited 12 apartments. Half didn't look like the photos. Two wanted 
bribes just to view. I was exhausted and ready to give up.

Then I found my current place on Mitasafi — the photos matched exactly, 
the price included everything, and I talked directly to the landlord. 
Three weeks later, I moved in. No drama. No hidden costs. No regrets.

This is how renting should work."

— Grace M.
   Marketing Professional
   Tenant in Kilimani
   [Photo: Professional headshot]

Verified Mitasafi User Since 2025
```

**Testimonial 2 (Landlord):**
```
Rating: ⭐⭐⭐⭐⭐

"I used to dread the 5th of every month. Chasing rent, awkward 
conversations, endless excuses. It was exhausting.

Now? Payment reminders go out automatically. Rent hits my account on 
time. I can see maintenance requests and respond before they become 
disasters. I finally feel like a property owner, not a debt collector.

My only regret is not finding Mitasafi sooner."

— James O.
   Civil Servant & Property Owner
   8 Units in Umoja
   [Photo: Professional headshot]

Verified Mitasafi Landlord Since 2025
```

**Testimonial 3 (Tenant):**
```
Rating: ⭐⭐⭐⭐⭐

"Moving from Mombasa to Nairobi for work was terrifying. I didn't know 
anyone. I didn't know the neighborhoods. I had two weeks to find a place.

Mitasafi let me take virtual tours of 20+ apartments from my phone. I 
narrowed it down to 4, flew up for a weekend, and signed a lease by 
Sunday. The whole process was transparent and stress-free.

I tell everyone relocating to use Mitasafi. It's not even close."

— Daniel K.
   Software Engineer
   Tenant in Westlands
   [Photo: Professional headshot]

Verified Mitasafi User Since 2025
```

**Testimonial 4 (Service Provider):**
```
Rating: ⭐⭐⭐⭐⭐

"Before Mitasafi, I'd go weeks without work, then get overwhelmed with 
calls I couldn't handle. Income was unpredictable. Clients were skeptical 
because they didn't know me.

Now I have steady jobs coming in. Clients see my reviews and trust me 
before we meet. Best of all — I actually get paid on time, every time.

My business has grown 60% since joining. I'm even hiring now."

— Peter K.
   Licensed Plumber
   Serving Eastlands
   [Photo: Professional headshot]

Verified Service Provider Since 2025
```

### Trust Signals Below Testimonials

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📊 2,847 Reviews    |    ⭐ 4.8 Average Rating    |    💬 94% Recommend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 15. FAQ Section

### Content

**Section ID:** `#faq`

**Eyebrow:**
```
FAQ
```

**Headline (H2):**
```
Questions? We've Got Answers.
```

### FAQ Items (Accordion Style)

**For Everyone:**

```
Q: Is Mitasafi free to use?
A: Mitasafi is completely free for tenants — searching, messaging, and even 
   paying rent through the platform costs nothing. Landlords with 1-3 units 
   also use Mitasafi free. Premium features are available for landlords with 
   larger portfolios who want advanced tools.
```

```
Q: How do you verify listings?
A: Every listing goes through our verification process. We confirm property 
   ownership, validate photos with timestamps, and ensure pricing includes all 
   costs. Properties can also earn a "Mitasafi Verified" badge through our 
   enhanced verification program.
```

```
Q: Is my personal information safe?
A: Absolutely. We use bank-level encryption for all data. Your phone number 
   is never shared — all communication happens through our secure in-app 
   messaging. We're fully compliant with Kenya's Data Protection Act.
```

**For Tenants:**

```
Q: How is Mitasafi different from Facebook groups or agents?
A: Unlike Facebook groups, every listing on Mitasafi is verified — no scams, 
   no fake photos, no bait-and-switch. Unlike agents, we don't charge 
   commission. You connect directly with landlords, see transparent pricing, 
   and have a complete record of all communications and payments.
```

```
Q: What if the property doesn't match the listing?
A: Report it immediately through the app. Misrepresented listings violate our 
   terms and are removed. Landlords who consistently misrepresent properties 
   lose their verification status. Our 98% listing accuracy rate means this 
   is rare — but we take it seriously when it happens.
```

```
Q: Can I pay rent through Mitasafi?
A: Yes! Pay via M-Pesa directly through the app. You'll get an instant digital 
   receipt, and your payment history is always available. No more disputes 
   about whether you paid or when.
```

**For Landlords:**

```
Q: How do I list my property?
A: Create a free account, click "Add Property," and follow the guided process. 
   Upload photos, add details, set your price, and publish. Most landlords 
   complete their first listing in under 10 minutes.
```

```
Q: How does tenant verification work?
A: Tenants on Mitasafi verify their ID and phone number. Premium landlords can 
   also see employment verification, bank statement summaries, and rental 
   history from previous Mitasafi landlords. You'll know more about applicants 
   than ever before.
```

```
Q: What does Mitasafi cost for landlords?
A: Landlords with 1-3 units use Mitasafi completely free. Landlords with 4+ 
   units can choose our Premium plan starting at KES 1,500/month, which 
   includes advanced tenant screening, priority listing placement, and 
   detailed analytics.
```

**For Service Providers:**

```
Q: How do I join as a service provider?
A: Apply through our Service Provider portal. You'll need to verify your ID, 
   provide proof of skills or business registration, and complete a brief 
   background check. Approved providers get a verified badge and access to 
   job requests.
```

```
Q: How do I get paid for jobs?
A: When a client books you through Mitasafi, the job scope and price are 
   agreed upfront. Once you mark the job complete and the client confirms, 
   payment is released to your M-Pesa. For larger jobs, partial payments 
   can be arranged.
```

### CTA Below FAQ

```
Still have questions?
[Contact Support] or [Visit Help Center]
```

---

## 16. Final CTA Section

### Content

**Section ID:** `#get-started`

**Background:** Gradient with subtle Nairobi imagery

**Headline (H2):**
```
Ready to Rent Differently?
```

**Subheadline:**
```
Join thousands of Nairobi residents who've discovered a better way.
Tenants find homes. Landlords find peace. Everyone finds fairness.
```

**Primary CTA (Large):**
```
Get Started — It's Free
```

**Supporting Text:**
```
Create your account in 2 minutes. No credit card required.
```

**Secondary Options:**
```
[Browse Homes]     [List Property]     [Join as Provider]
```

**Final Trust Statement:**
```
🔒 Your data is protected  •  💬 24/7 Support  •  🇰🇪 Built for Nairobi
```

---

## 17. Footer

### Content

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [Mitasafi Logo]                                                        │
│                                                                         │
│  Renting, reimagined for Nairobi.                                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FOR TENANTS          FOR LANDLORDS       FOR PROVIDERS    COMPANY      │
│  ─────────────        ──────────────      ─────────────    ────────     │
│  Browse Homes         List Property       Join Network     About Us     │
│  How It Works         Pricing             Requirements     Careers      │
│  Tenant Rights        Landlord Guide      Provider FAQ     Press        │
│  Rental Calculator    Rent Collection     Service Areas    Contact      │
│  Moving Checklist     Lease Templates     Success Stories  Blog         │
│                                                                         │
│  LEGAL                SUPPORT                                           │
│  ─────                ───────                                           │
│  Terms of Service     Help Center                                       │
│  Privacy Policy       Contact Us                                        │
│  Cookie Policy        System Status                                     │
│  Data Protection      Report an Issue                                   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SUBSCRIBE TO OUR NEWSLETTER                                            │
│  Get rental tips, new features, and market insights.                    │
│                                                                         │
│  [Email Address                    ] [Subscribe]                        │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Facebook] [Twitter/X] [Instagram] [LinkedIn] [TikTok]                │
│                                                                         │
│  © 2025 Mitasafi. All rights reserved.                                 │
│  Made with ❤️ in Nairobi, Kenya                                        │
│                                                                         │
│  [SSL Badge] [Data Protection Badge] [M-Pesa Partner Badge]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 18. Microcopy & UI Text

### Form Labels & Placeholders

| Element | Label | Placeholder | Helper Text |
|---------|-------|-------------|-------------|
| Email Input | Email Address | you@example.com | We'll never share your email |
| Password | Create Password | At least 8 characters | Use letters, numbers & symbols |
| Phone | Phone Number | 07XX XXX XXX | For account verification |
| Search | — | Search by location, property type... | — |
| Budget Min | Minimum Rent | KES 10,000 | — |
| Budget Max | Maximum Rent | KES 100,000 | — |

### Button Text

| Context | Primary | Secondary |
|---------|---------|-----------|
| Hero | Find Your Home | List Your Property |
| Signup | Create Free Account | Log In Instead |
| Property Card | View Details | Save |
| Contact Landlord | Send Message | Schedule Viewing |
| Apply | Apply Now | Ask a Question |
| Payment | Pay KES XX,XXX | Set Reminder |

### Success Messages

| Action | Message |
|--------|---------|
| Account Created | Welcome to Mitasafi! Let's find your home. |
| Message Sent | Message delivered. Landlords typically respond within 2 hours. |
| Payment Complete | Payment confirmed. Receipt sent to your email and saved in-app. |
| Application Submitted | Application sent! The landlord will review and respond soon. |
| Listing Published | Your property is now live. We'll notify you when tenants inquire. |

### Error Messages

| Error | Message |
|-------|---------|
| Invalid Email | Please enter a valid email address |
| Password Too Weak | Password must be at least 8 characters with a mix of letters and numbers |
| Phone Invalid | Please enter a valid Kenyan phone number |
| Payment Failed | Payment could not be processed. Please try again or use a different method. |
| Network Error | Connection lost. We'll keep trying — your data is safe. |

### Empty States

| State | Headline | Body | CTA |
|-------|----------|------|-----|
| No Search Results | No homes match your search | Try adjusting your filters or expanding your area | Clear Filters |
| No Messages | No messages yet | When you contact landlords, conversations will appear here | Browse Homes |
| No Saved | No saved homes | Tap the heart on any listing to save it for later | Start Searching |
| No Applications | No applications yet | Ready to find your next home? | Browse Homes |

---

## 19. Image Guidelines

### Hero Images

| Image | Description | Requirements |
|-------|-------------|--------------|
| hero-main.jpg | Nairobi skyline or modern apartment interior | 1920x1080, warm lighting, aspirational |
| hero-mobile.jpg | Cropped for mobile, focus on key element | 750x1334, clear focal point |

### Lifestyle Images

| Image | Description | Diversity |
|-------|-------------|-----------|
| tenant-keys.jpg | Happy tenant receiving keys | Young professional, any gender |
| family-home.jpg | Family in living room | Kenyan family, warm moment |
| landlord-dashboard.jpg | Landlord viewing app on phone | Middle-aged, professional attire |
| provider-work.jpg | Service provider at work | Skilled trade, professional equipment |

### Property Images

| Image | Description | Style |
|-------|-------------|-------|
| property-exterior.jpg | Modern Nairobi apartment building | Clean, well-maintained |
| property-interior.jpg | Bright, furnished living room | Natural light, aspirational |
| property-kitchen.jpg | Modern kitchen | Clean, functional |
| property-bedroom.jpg | Comfortable bedroom | Tidy, inviting |

### Icon Style

```
Style: Outlined, 2px stroke
Color: Teal (#0D9488) primary, Slate (#475569) secondary
Size: 24x24px standard, 48x48px feature cards
Consistency: Lucide or Heroicons library
```

### Photo Alt Text Examples

| Image | Alt Text |
|-------|----------|
| Hero | "Modern apartment building in Kilimani, Nairobi at sunset" |
| Tenant | "Young professional receiving apartment keys from landlord" |
| Interior | "Bright living room with natural light in Nairobi rental apartment" |
| Map | "Interactive map showing rental properties across Nairobi County" |

---

## 20. A/B Testing Recommendations

### Hero Headline Variants

| Variant | Headline | Hypothesis |
|---------|----------|------------|
| A (Control) | Renting Shouldn't Feel Like Gambling | Problem-aware, emotional |
| B | Find Your Home in Nairobi — Verified | Direct, SEO-focused |
| C | Finally, Rentals You Can Trust | Trust-focused |

### CTA Button Variants

| Variant | Text | Hypothesis |
|---------|------|------------|
| A (Control) | Find Your Home | Action-oriented |
| B | Browse Verified Homes | Trust + action |
| C | Start Searching — Free | Value + action |

### Social Proof Variants

| Variant | Format | Hypothesis |
|---------|--------|------------|
| A | Numbers only (5,000+ homes) | Simplicity |
| B | Numbers + badges | Trust signals |
| C | Mini testimonial | Social proof |

---

## 21. SEO Content Blocks

### Below-the-Fold SEO Content (For Search Engines)

**Section: About Renting in Nairobi**

```html
<section class="seo-content" aria-label="About renting in Nairobi">
  <h2>Find Houses and Apartments for Rent in Nairobi</h2>
  <p>
    Looking for houses for rent in Nairobi? Mitasafi connects tenants with 
    verified rental properties across all 17 sub-counties of Nairobi County. 
    Whether you're searching for affordable bedsitters in Eastlands, modern 
    apartments in Kilimani, or family homes in Karen, our platform makes 
    finding your next home simple, transparent, and stress-free.
  </p>
  
  <h3>Rental Properties in Popular Nairobi Neighborhoods</h3>
  <p>
    Browse rental listings in Nairobi's most sought-after neighborhoods:
  </p>
  <ul>
    <li><strong>Westlands & Parklands:</strong> Modern apartments near business districts</li>
    <li><strong>Kilimani & Lavington:</strong> Upscale rentals with great amenities</li>
    <li><strong>South B & South C:</strong> Family-friendly neighborhoods with good schools</li>
    <li><strong>Kasarani & Roysambu:</strong> Affordable options with easy CBD access</li>
    <li><strong>Embakasi & Pipeline:</strong> Budget-friendly housing for young professionals</li>
  </ul>
  
  <h3>Why Choose Mitasafi for Your Nairobi Rental Search?</h3>
  <p>
    Unlike traditional property listings, every home on Mitasafi is verified. 
    We confirm property ownership, validate photos, and ensure pricing is 
    transparent — including rent, water, garbage collection, and parking fees. 
    No hidden costs. No fake listings. Just honest rentals.
  </p>
</section>
```

---

## 22. Document References

- [MITASAFI_PRD.md](MITASAFI_PRD.md) - Product Requirements
- [MITASAFI_DESIGN_SYSTEM.md](MITASAFI_DESIGN_SYSTEM.md) - UI/UX Guidelines
- [MITASAFI_USER_ANALYSIS.md](MITASAFI_USER_ANALYSIS.md) - User Pain Points
- [MITASAFI_TECHNICAL_ARCHITECTURE.md](MITASAFI_TECHNICAL_ARCHITECTURE.md) - Technical Architecture
- [MITASAFI_PERFORMANCE_ARCHITECTURE.md](MITASAFI_PERFORMANCE_ARCHITECTURE.md) - Performance Guide

---

**Document Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 30, 2025 | Team | Initial Landing Page Content |

---

*This document provides complete copy for the Mitasafi landing page.*
