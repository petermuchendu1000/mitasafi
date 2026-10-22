# Kenya House-Hunting Pain — Social & Market Research
**Date:** October 22, 2026
**Research type:** Social listening + market/competitive scan + regulatory review
**Method:** 6 parallel research agents across Reddit/forums, X, Facebook/WhatsApp, TikTok/IG/YouTube, proptech landscape, post-search rental process
**Status:** Findings consolidated. Evidence gaps explicitly flagged — see §10.

---

## Executive Summary

Kenya does not have a house-finding problem. It has an **information problem**.

The houses exist. Someone is leaving one next month. The problem is that **the moment a
house becomes vacant is worth money to roughly five different people** — so that
information travels slowly, quietly, and only to whoever can charge for it.

Stated bluntly: **the product being sold in Kenyan house-hunting today is not the house.
It is the address.**

This is not a metaphor. A documented tariff from a Nairobi renter:

- **KSh 2,000 "appearance fee"** — paid merely to be *told* where the house is
- **KSh 1,500 "inconvenience fee"** — paid to actually be walked there

The information itself is the inventory. Every finding below follows from that.

### The three numbers that justify building this

| Metric | Value | Source |
|---|---|---|
| Urban Kenyan households that **rent** | **78.7%** | 2019 Census |
| Nairobi households that rent | **88.8%** of 1.66m | KNBS Housing Survey 2023/24 |
| Urban rentals from **individual landlords** | **89.3%** (vs 5.6% companies) | 2019 Census |

**89.3% individual landlords / 5.6% companies is the thesis.** There is no boardroom to
walk into and no deal to sign that unlocks supply. The supply side is hundreds of
thousands of ordinary Kenyans with one or two plots each — who are themselves in WhatsApp
groups, who also distrust agents, who also get scammed. Community ownership is not an
ideology here; it is the only mechanism that physically reaches an atomised supply side.

---

## 1. Methodology & Access Limitations

**READ THIS BEFORE CITING ANYTHING BELOW.**

Six agents ran in parallel against public sources. What succeeded and what did not:

### Succeeded
- Kenyan press that quotes named tenants directly (Business Daily, Nation, The Standard,
  Citizen Digital, Kenyans.co.ke, Bizna Kenya, Abacus)
- Court and tribunal rulings via Kenya Law (BPRT, High Court)
- KNBS Census 2019 + Kenya Housing Survey 2023/24
- Communications Authority sector statistics (Oct–Dec 2025)
- EARB / Estate Agents Act / Data Protection Act position

### Failed — these are real gaps, not findings
- **Reddit: completely inaccessible.** HTTP 403 on reddit.com, old.reddit.com,
  api.reddit.com and .json endpoints, via both fetch tooling and raw curl (datacentre IP
  block). Search index returned zero r/Kenya results across four attempts. **We have no
  r/Kenya, r/Nairobi or r/kenyarealestate quotes at all.**
- **TikTok / YouTube comment threads: not readable.** Tag, discover and search pages
  returned empty shells. We have captions and account names, **not a single comment
  thread was read.** Comment themes in §4 are inference, marked as such.
- **Facebook groups: login-walled.** Group search returns 404 unauthenticated. **No
  verified member count exists for any Kenyan Facebook housing group in this report.**
  Any group name or size must be re-checked while logged in.
- **X / Twitter: unscrapeable.** x.com/search returns HTTP 402; nitter.net is dead
  (shut down Oct 2026). Tweets were reached only via domain-restricted web search, which
  returns snippets without threads or metrics. **No engagement numbers are reported
  because none could be verified.**

### Citation discipline used throughout
No quote in this document is invented. Anything unconfirmed is marked `[UNVERIFIED]`.
Vendor and marketing copy is labelled as such and is **not** presented as user sentiment.
Figures carry source and year wherever available.

---

## 2. Tenant Complaints

### 2.1 Pay-to-view — the loudest complaint in the corpus

The dominant grievance across every accessible source.

- **Kisumu:** non-refundable **KSh 1,000–2,000 per house**. One newcomer **paid
  KSh 4,000 to view five houses and got nothing.** (Nation)
- **The Standard** reports viewing fees rising from KSh 1,500 to **KSh 3,000** per house.
- **Nairobi:** ~KSh 2,000 to view; a holding fee of ~KSh 10,000 is also reported
  `[UNVERIFIED — low-quality blog source]`.
- An X agent account states it openly in its bio: *"Househunting services in Nairobi.
  Dm/WhatsApp us via [number] (NB:Viewing fees : 2k)"* — with a reply underneath
  complaining about exactly that charge.

**Why this is structurally rotten:** a legitimate estate agent is paid by the **landlord**
(5–10% of rent for residential letting/management; 10–15% commercial; tenant-placement
fee ~50–100% of one month's rent). The moment a tenant pays to view, the incentive
inverts. **The agent no longer needs you to find a house. He needs you to keep looking.**

> **Example — the wild goose chase is the business model.** Derrick Momanyi, 25, Nairobi
> developer: his agent *"deliberately take[s] you to a house pulled so far away from your
> outlined specifications"* so he can then offer "closer ones". Also quoted: *"Looking for
> a house is hectic"*; *"Some of the quoted amounts would convert me to a rent-paying
> slave"*; *"I believe most of these agents have gone rogue."*

### 2.2 "Suddenly occupied"

The sharpest quote in the entire research corpus — **Esther Njeri**:

> *"When I paid the viewing and inconvenience fees, all the houses the agent had shared on
> WhatsApp suddenly became occupied."*

She paid KSh 2,500. Same pattern from **Wanjiru Kariuki**, 31, who paid **KSh 3,650** to
an agency and was then asked for a monthly *"subscription fee"*:

> *"I feel like I got played because they kept taking me in circles until one month
> lapsed."*

**The double-charge is proven.** A landlord later told Kariuki *"they had already paid the
agent for directing potential clients to the property."* **One unit, paid for twice.**
This is the mechanism behind the agent → agent → agent chain: each link resells the same
lead, because **the lead, not the house, is the product.**

### 2.3 Outright fraud — one playbook, three beats

**Artificial urgency → M-Pesa → phone off.** Every documented case:

| Case | Loss | Mechanism |
|---|---|---|
| Fedha Estate (Abacus) | **KSh 18,000** | Pole poster read *"Owner – No Agent"*; "owner" claimed to be out of Nairobi and to be the mayor of Thika Municipality; handed off to an unreachable "manager"; then claimed a more serious tenant would pay within hours. M-Pesa sent, phone off. **Embakasi Police confirmed similar complaints**; referred to Safaricom. |
| Jamhuri teacher (Citizen Digital) | **KSh 30,000** | *"He showed me the house and even gave me a receipt."* Someone was already living there on move-in day. |
| Thika Superhighway (Kenyans.co.ke) | **KSh 12,000** | "Booking" fee on a KSh 15,000 one-bed. Agent vanished. |
| Kileleshwa (Citizen Digital) | 2-month deposit | Asked to M-Pesa deposit pre-lease. House did not exist. |
| John Mbati (Kenyans.co.ke) | KSh 15,000 + 2,000 | KSh 15,000 to "refund an earlier booker", then KSh 2,000 after a fake road accident, then a **fake police officer** called to extract more. *"I realised that they were scamming me the next day."* |

Additional documented techniques:
- **Master key entry** — scammers show a genuinely vacant unit, take cash, hand over
  **counterfeit keys**.
- **Replica listings** built from real on-market properties, with rushed payment.
- **Role relay** — victim passed owner → "property manager" → owner; one lost KSh 18,000.
- **Rent-day impersonation** — SMS claiming a *"new payment number"* in the first week of
  the month; one tenant paid **KSh 16,000** within minutes.
- **Prime-estate concentration:** Kilimani, Kileleshwa, Lavington, Jamhuri. **Foreigners
  specifically targeted** because they pay higher rent (Citizen Digital, 2025).

**The viewing fee doubles as reconnaissance.** Agents use the first paid interaction to
assess who is naive and solvent, then refer them to accomplices for larger scams
(Kenyans.co.ke). It is not merely a fee — it is a filtering mechanism for fraud.

**Root cause, stated by an agent:** *"there are no strict rules, anyone can call themselves
an agent."*

### 2.4 Listing integrity failure

- **Same house, different towns.** One post placed a unit in **Naka, Nakuru**; another
  placed the same unit in **Kitengela**.
- **Bait pricing.** A real poster: *"Bedsitter in Lavington at Ksh 5,000. No Agent."*
  The "No Agent" tag is itself now a scam lure.
- **Photos lifted** from the internet and from real listings.
- **Deliberate information withholding.** Price and exact location are omitted *on purpose*
  so the poster can charge for the information. A Ngara listing demanded **5% of the house
  cost** for the exact location and caretaker contact, stating *"no physical guided tours
  provided."*
- **Recycled and reposted** listings by different people in different areas
  (Kenyans.co.ke).

### 2.5 The cash wall and the fee surprises

Rent + deposit + agent fee, all due at once. **No Kenyan source quantifies this total**
— `[UNVERIFIED — worth a primary survey]`. Then the recurring surprises
(all Kenyans.co.ke, "5 Fees Landlords Use to Swindle Tenants", 13 Aug 2020):

- **Garbage KSh 200/month** in Ruaka with no collection occurring; nylon bags cost ~KSh 60.
  **New tenants charged more than sitting tenants for identical service.**
- **Water levy KSh 1,800** in Kabiria for under two weeks of occupancy, no leaks.
- **Security KSh 200/month** where the landlord pays the guard less than he collects.
- **Service charge** — unregulated since ~2022; up to **KSh 5,000/month** on a one-bed;
  one case KSh 12,000 rent → KSh 17,000 effective.
- **Token meters:** a caretaker in Uthiru **rewired a tenant's meter to a neighbour's**,
  draining her tokens. Tenant: *"We literally were sharing our units."* Landlords retain
  physical access to meter boxes.
- **Caretaker bribes:** widely referenced, **no sourced figure found** `[UNVERIFIED]`.
- **Goodwill / key money:** documented for **commercial** premises (a Nairobi CBD landlady
  took over **KSh 1,000,000** as goodwill). **No solid residential source found**
  `[UNVERIFIED for residential]` — notable, as this differs from Nigeria/India.

### 2.6 Deposits — withheld as default behaviour

- Tenants report being *"never refunded at all or given meagre amounts"* despite prior
  agreement; some are asked for **extra** money for repainting (Kenyans.co.ke, 2020).
- **Tenants' own improvements are used to cut the refund.** A tribunal case saw a landlord
  argue the tenant must **restore the premises to its initial state as a precondition** for
  refund ([2021] KEBPRT 312).
- **UN Nairobi staff** reported landlords retaining deposits **up to KSh 800,000** —
  serious enough that the UN Nairobi Staff Union formed a committee on it.
- **Most tenants do nothing formal.** They cannot reach the caretaker or landlord and give
  up. The common informal remedy: **withholding the final month's rent.**

#### The jurisdiction trap (critical, and widely unknown)

- The **Rent Restriction Act (Cap 296)** — and therefore the residential Rent Restriction
  Tribunal — applies only to dwellings with standard rent of **KSh 2,500/month or less.**
  The threshold is effectively obsolete. **In practice almost no Kenyan residential tenant
  has a tribunal.**
- The **Business Premises Rent Tribunal** covers controlled *commercial* tenancies, and has
  **dismissed deposit claims for want of jurisdiction** once a tenancy is terminated
  (*Grocery Cart Mini Mart v 4Way Village Mgmt*, [2024] KEBPRT, 28 Jun 2024). Ex-tenants
  routinely file in the wrong forum.
- **THE UNLOCK:** on **23 January 2025** the High Court (**Justice Helene Namisi**, *v LP
  Holdings Ltd*) held that the **Small Claims Court does have jurisdiction over deposit
  refunds** — as "money held and received" under s.12(1)(b) of the SCC Act — overturning an
  SCC dismissal. Cap **KSh 1,000,000**, **no advocate required**. Most tenants have no idea
  this door opened. *(Filing fees reported inconsistently — "from KSh 200" vs
  "KSh 10–1,000"; `[UNVERIFIED]`, check the Judiciary schedule. A "resolved within 60 days"
  claim appears in one outlet only, `[UNVERIFIED]`.)*
- **No statute sets a refund deadline.** A deposit agreement is enforceable as an ordinary
  contract — so it must be in writing with refund conditions stated.
- **Only ~20% of Nairobi tenants have a written lease at all.**

Advice consistently given and worth productising: photo/video the empty unit before handing
over keys, keep receipts, issue a demand letter, maintain a move-in inventory.

### 2.7 Affordability — rent is outrunning income

- Nairobi suburb rental yields reached **7.4% in Q4 2025 — highest since the Hass index
  began in 2007.** Satellite-town rents **+8.7% in 2025**, sharpest in **Ruaka, Thindigua,
  Syokimau, Ruiru, parts of Kasarani** (HassConsult).
- **Brian Mwangi**, Thindigua 1-bed: KSh 22,000 (2024) → **KSh 28,000**. *"Nearly half my
  income gone before mid-month."* Considering Ruiru. And: *"You look around and realize
  everyone is struggling quietly."*
- **Sharon Atieno:** *"Now most young people are sharing houses because survival comes
  first."* And: *"You stop thinking about buying a house after a while."*
- Analyst **John Odera**: rents rising faster than incomes; wage growth stagnant.
- Active downgrading documented: **Roysambu → Huruma** (The Star, 2024).
- **>1/3 of household spending goes to rent**; **41% of urban Kenyans favour rent
  controls** (Business Daily on KNBS survey).
- **638,761 households pay no rent with landlord consent** (KNBS 2023/24) — Nairobi 51,507,
  Kiambu 74,782. A real, large, informal-arrangement segment.
- Counter-signal: Nairobi rents **-0.2% in Q2 2025** after +0.3% in Q1, with softening in
  upper suburbs tied to USAID-related layoffs; **13 suburbs/satellite towns cut asking
  rents in Q1 2025** (HassConsult). **Vacancy risk is currently rising** — which strengthens
  the landlord-side pitch.

### 2.8 Moving

- Full-service Nairobi local move: **1-bed KSh 13,500–20,000; 2-bed KSh 20,000–25,000**;
  alternative source KSh 10,000–20,000 (1–2 bed), KSh 20,000–40,000 (3–4 bed).
  Nairobi–Mombasa KSh 30,000–70,000, up to 100,000. *(Mover marketing pages — indicative,
  likely the high end.)*
- Truck/day: **3-ton KSh 8,000–12,000; 7-ton KSh 12,000–18,000** *(vendor)*.
- Hidden extras: stair-carry **KSh 500–1,500 per flight**, long-carry when the truck cannot
  reach the door, packing materials KSh 1,000–3,000, waiting time, fuel surcharge.
- **The informal end is completely undocumented online.** No sourced *mtush*/pickup rate
  exists. `[GAP — field research needed]`
- **No recourse with informal movers:** *"They broke my wall unit and I couldn't charge
  them for it."* No inventory, unsuitable transport, valuables at risk.
- **Overlooked constraint:** people **lose the new house because they cannot get time off
  work to move** (Kenyans.co.ke, 6 Aug 2020).
- *"Kuhepa"* (night move to dodge arrears) is culturally well known; the landlord response
  is documented — owners in Nairobi, Nakuru, Mombasa and Kisumu rushing to sue and auction
  property after tenants vanish. The night move itself is undocumented `[UNVERIFIED]`.
- Losing a deposit by failing to give notice: standard practice, **no good Kenyan source
  found** `[UNVERIFIED]`.

---

## 3. Supply-Side Reality — Landlords, Caretakers, Agents

The half nobody builds for. Bringing "everyone" together requires taking this seriously.

### 3.1 Landlords keep no records — and are losing cases because of it

**The single most actionable finding in this report.** 2025 Rent Tribunal rulings:

- Eviction refused: the landlord *"has not demonstrated that she has complied with the
  provisions of Section 4 of Cap 301 regarding the statutory termination notice."*
- Another: the landlord *"has not annexed any rent statements of accounts in support of
  this claim."*

**Landlords are losing winnable cases for lack of paperwork.** That is a software problem,
and it is a reason for a landlord to join a platform that has nothing to do with marketing
a vacancy. Contrast with a 2025 win where records existed: tenant ordered to pay
**KSh 175,000** arrears, landlady permitted to levy distress, tenant bearing costs
([2025] KEBPRT 205, 21 Mar 2025).

**Recovery routes by rent level:** Rent Restriction Tribunal under KSh 2,500/month;
**Distress for Rent Act** above that; controlled business premises require **BPRT leave
before levying distress**.

### 3.2 There is no tenant screening infrastructure in Kenya — at all

- Three CBK-licensed credit bureaus: **Metropol, TransUnion, Creditinfo Kenya.**
  Tenant-supplied reports ~**KSh 650** (credit report) / ~**KSh 2,200** (clearance
  certificate) per The Standard; another 2025 guide says ~KSh 250 — pricing inconsistent,
  verify.
- **Rent is not in CRB data.** The Urban Landlords and Tenants Association *announced* it
  would list rent defaulters on CRB "once they receive clearance" — **no evidence this is
  live.**
- **Therefore: no rental payment history infrastructure exists in Kenya.** This is the
  largest white space identified.
- **What landlords actually do:** guidance centres on credit history and **how often the
  applicant has moved** ("a chequered past") (Capital FM). ID copy, payslip, employer
  letter and guarantor are widely practised asks but **no authoritative Kenyan source
  enumerates them** — `[UNVERIFIED, treat as hypothesis for interviews]`.

### 3.3 Vacancy is pure loss to the owner, and the agent is indifferent

Standard management agreements state that **no management fee is payable for a month a unit
is vacant.** The agent forgoes a small cut; **the landlord loses 100% of that month.** The
agent is therefore financially relaxed about voids in a way the owner cannot afford to be.

**Cost of advertising a vacancy, agent re-payment, and rent-chasing cost: no sourced
figures found.** `[GAP — core to the supply-side pitch]`

### 3.4 When formal recovery fails, it turns violent

From 2020 (dated but diagnostic): landlords in informal settlements hiring gangs — *"We
have had to beat up people to make them pay up or even destroy their items in the house
when evicting them."* That is what a broken formal process produces.

Public-sector scale: Nairobi County tenants in **Woodley, Kariokor, Uhuru, Ngara and
Harambee owe an estimated KSh 200 million**; the President asked the Governor to negotiate
rather than evict; **Buruburu residents said they were never served formal notices.**

### 3.5 Landlords distrust online listings too

Their photos are stolen and reused by fake agents; replica listings are built off their
genuine ones. Landlord resistance to platforms is **not technophobia — it is prior
injury.** The visible preference is a gate notice: **"Talk to the landlord, no agents
please"** (Umoja).

### 3.6 Agents are not a monolith

- **40,000+ unregistered agents** per an EARB survey (Business Daily; article date not
  shown — treat as dated). **Count of registered agents: not verified** — EARB publishes
  the register at estateagentsboard.or.ke, and it is **gazetted and therefore checkable.**
- EARB issued a **2025 public notice** that unregistered practice is unlawful.
- **Caretakers are the highest-value data source in the country**, and one source names
  why: *"the caretaker stays with the tenants, thus will know their problems."*

---

## 4. TikTok / Social Video Layer

**Caveat: no comment thread was read.** Captions and account names only.

### What works as a format (consistent across every account observed)
**Price first**, estate named, walkthrough video, then **"DM to book"**. Examples of real
caption patterns: *"Rent 9k"*, *"13K Gwakairu — New • Spacious • Ready to move in. DM to
book"*, *"newly built bedsitters for just 10k, booking ongoing"*, *"One Unit Left"*.
Estates named: Pipeline, Zimmerman, Mirema, Roysambu, Embakasi, Car Wash, Gwakairu,
Kikuyu. Price band **KSh 4,500–15,000** for bedsitters/1-beds; KSh 55,000–230,000 for
South C / Lavington.

### Account names seen (display names from search snippets — **handles unverified**)
The Hunt KE, PrimeNest Homes, Pata Makao 254, Hama na Sisi, PEDIWANYUMBA, Legit House
Hunters, Kennedy Ngira, GLO Realtors, Elite Home Consultant, Rent Hapo ("free listings,
no commission"). Only `@kikihomes1` had a confirmed URL.

### YouTube is a different market
**Mansa Plus** (Mark Muiruri Wangari, 112k+ subs) and **Fine Urban Real Estate** (153k
subs, largest Kenyan property channel) do **luxury mansions, not rentals** — monetised via
developer brand deals and a commission realtor arm, not ad revenue ("YouTube pay in Africa
isn't attractive"). **The bedsitter/rental tour economy is TikTok-native.**

### Funnel structure — important for product design
**TikTok is top-of-funnel discovery. Conversion happens in DMs, WhatsApp and Telegram.**
One documented journey: a 25-year-old Nairobi developer went TikTok + X → Telegram channel
→ a **700-member WhatsApp group**, where he actually found his flat. No survey or
market-share figure exists `[UNVERIFIED]`.

### Documented creator/agent complaints
Too-good-to-be-true pricing; **impersonation** (agents letting property they do not
control — one victim found the house occupied on move-in day); fake urgency; viewing fees
used to profile marks. A viral call-out video named an account as *"the biggest house
hunting scammers in Nairobi"*, alleging a rebrand; ~455 comments, contents not visible.
Creator-side warning: *"rogue house agents will charge you 2K per every house you view,
then take you to some unwanted houses."*

**"Rent went up after the video" and "show-house vs actual unit": not found**
`[UNVERIFIED]`.

### External risk signal (NOT Kenyan data — context only)
CNC Intelligence reviewed **3,141 TikTok rental listings across 16 US cities: 68% carried
medium-to-strong scam signals.** Dutch student-rental TikTok scams follow the identical
below-market-price + fee-before-viewing pattern. **Must not be presented as Kenyan data**,
but it indicates the format's structural fraud exposure.

---

## 5. Facebook / WhatsApp Layer — and the 21,000-Member Precedent

### The precedent that matters most

A free house-hunting **WhatsApp community reportedly reached ~21,000 members** (Business
Daily / Nation, 19 Mar 2025; figure not independently verified). It started as a single
group — one member reports joining when it had **~700 members** — and grew fast. It hit
**three walls**:

1. **It could not be searched.** It had to be **manually sharded by area and town** because
   the feed became unnavigable. *This is the clearest evidence that the chat-group format
   fails at scale.*
2. **Agents infiltrated it.** The founder **shut it down and restructured it.**
3. **She was threatened with a lawsuit** by someone she believes is a rogue agent.

**This is not a failure story. It is a product specification written by someone who went
first.** Demand: proven. Breaking points: three, all addressable in software — **search,
identity, and moderation that does not rest on one brave individual.**

Separately: **Wanjiru Kariuki is building a platform with verification for both landlords
and tenants** — i.e. an insider independently reached the same conclusion.

### Typical post format (photos-first prose, no schema)
Interior photos, rent, area name, amenities (water, security, parking), a phone number,
often *"inbox me"* / *"DM for location"*.

**Almost always missing:** exact plot/road, floor, deposit terms, availability date,
whether the poster is owner/caretaker/agent, and any stable unit ID.

### What is broken
Recycled and relocated listings; stale "already taken" units; bait-and-switch; deliberate
price/location withholding; agent infiltration of peer groups; **no search, no filter,
posts buried in feed**.

### What users praise — in their own words
This is the **only** section where genuine user praise was found (everything else was
vendor copy):

- **Free.** Founder: *"This is a free service. Our goal is to address a pain point that has
  existed in the market for a long time."*
- **Fast**, **direct landlord contact** (landlords join and post vacancies themselves),
  **real humans with local knowledge**.
- **Peer altruism — the model in miniature:** a member who views a house that does not suit
  them **posts its photos to the group** for whoever else needs it. Unpaid. Voluntary.
  This is the behaviour to build on.

### Moderation worth copying
Only one documented pattern: **keep it free, shard by area/town as it grows, eject agents
outright.** Expert recommendation worth encoding as a platform rule: require posters
claiming agency to be **EARB-registered** (register is gazetted and checkable), and never
pay before meeting the real landlord or signing with the managing agency.

**Content-risk note:** the online housing conversation carries ethnically-framed landlord
stereotyping (e.g. tribal landlord memes on X). A community platform must decide its
moderation line on this **before** it becomes a live problem.

---

## 6. Competitive Landscape

### Dead or exited
| Player | Status | Note |
|---|---|---|
| **Property24 Kenya** | **Exited** | Pulse Live Kenya, 2024 |
| **Jumia House** (ex-Lamudi) | **Dead** | Site removed, redirected to Jumia Deals (2024). One anonymous source ties it to pre-IPO pruning of loss-makers `[UNVERIFIED]` |
| **KejaHunt** | **Presumed dead** | 2014 Nailab/500 Startups alum, **targeted low/mid-income renters from KSh 5,000** — essentially this idea. ~6,000 users growing 1,000/month in 2015. **No activity found after 2015.** No closure announcement. |

### Alive
- **BuyRentKenya** — surviving incumbent portal; agent/developer-pays subscriptions;
  acquired by **Rushbox Ltd from Ringier**, which divested its African real-estate
  marketplaces. Acquisition date `[UNVERIFIED]`.
- **Jiji Kenya / PigiaMe** — general classifieds with rentals as a category. Jiji
  self-reports "10m+ visitors, 5m active ads" *(company claim, unaudited)*. PigiaMe status
  `[UNVERIFIED]`.
- **Hauzisha** — nationwide rent/sale marketplace. **Note: already runs a Teachable course
  that pays people to find vacant units.** A crowdsourced-scout model already exists in
  Kenya. Traction `[UNVERIFIED]`.
- **Reemio / Remio** — the one with current traction coverage (Jul 2026): **~28,000 Nairobi
  listings, 150+ placements in four months, 60%+ of users women, mostly under 35.** Demand
  concentrated in **1–2 beds under KSh 25,000** in **Ruiru, Juja, Kiambu Road**; renters
  prioritise mall/workplace access over CBD proximity. Positioned explicitly against
  viewing fees (cites market fees of KSh 1,000–3,000); offers virtual tours then a free
  physical viewing. **Crucially, it publicly states it is not an estate agent and takes no
  part in transactions** — the EARB workaround template.
- **PropertyDuka** — **NCBA bank-backed AI property platform, launched Aug 2026.** New,
  well-capitalised. Watch closely.
- **HassConsult / Knight Frank** — alive but high-end sales/lettings plus index publishing.
  The **Hass Property Index** is the usable public rent/yield data source.
- **RentScore** (founded 2022, Baobab Network investment, undisclosed, Sep 2024);
  **Move In** (Sally Musanga); **Ekodi**; **RentalKE**; **Kenya Homes Hub** (iOS app
  exists, traction `[UNVERIFIED]`).
- **The actual incumbent for mass-market: Facebook groups and WhatsApp communities.**

### Rent-payment / landlord tooling (the monetising adjacent layer)
**Rent Hero Kenya** (tenant records, billing, collection — **charges 5% of rent collected**,
reported low churn); **Rentpay / Proptech Kenya** (M-Pesa + bank real-time reconciliation);
**Nyumbani.ke** (management + M-Pesa reconciliation, diaspora angle, *vendor claims*);
**Ezen Financials** (M-Pesa + KCB/Equity/Co-op/I&M); **Manyatta Rent** (~$1 flat per
tenant, targets 100+ tenant agencies — 2013-era, **old**). Also: **Safaricom Lipa Kodi**,
**Family Bank M-Kodi**.

**Not verified / no evidence found:** Kejani, Rentoza, PataHao, Hao Finder, Mambo Property,
Ujenzi, Dwell, Rentdrop, Stakey, Mzizi, Kodi/Kodisha, Jaba, Tenant Pro.
**Zeraki is Kenyan edtech, not housing — exclude.**

### Why the portals died — two structural reasons

**1. The agent-pays model is a conflict of interest.** The portal's paying customer is the
agent. The agent's income comes from viewing fees. **Accurate vacancy data destroys that
income.** So the portal's customer actively benefits from stale, vague, bait listings. The
portal can never fix listing quality, because suppressing listing quality is what its
customers are paying for.

**2. Unit economics + foreign parent discipline.** Kenyan listing-fee levels could not
cover customer acquisition cost; Ringier, Property24 and Jumia all withdrew on
portfolio/profitability grounds rather than local product-market fit failure.

**Sector context:** ~12 Kenyan proptechs, **~$21.6M raised in total, and no rounds in the
last 12 months.** Also relevant: an older Ministry figure says **83% of existing housing
supply targets high- and upper-middle-income** — so premium portals address a thin slice.

---

## 7. Market Data

| Metric | Value | Source / Year |
|---|---|---|
| Urban households renting | **78.7%** (21.3% own); national 38.7%; rural 13.4% | 2019 Census *(secondary — verify KNBS Vol IV)* |
| Urban rentals from individual landlords | **89.3%** | 2019 Census |
| Urban rentals from private companies | **5.6%** | 2019 Census |
| Nairobi households | **1,661,533**; 7.7% own, **88.8% rent/lease** | KNBS Housing Survey 2023/24 |
| Cumulative housing deficit | **~2 million units** | Housing PS Charles Hinga, 2025 |
| Annual demand vs supply | **~250,000 vs ~50,000 = ~200,000/yr gap** | Housing PS, 2025 (parallel figure: 244,000 vs <50,000) |
| Supply aimed at high/upper-middle income | **83%** | Ministry figure via Nation (older) |
| Rent burden | **>1/3 of household spending** | Business Daily on KNBS survey |
| Favour rent controls | **41% of urban dwellers** | Business Daily |
| Households paying no rent w/ landlord consent | **638,761** (Nairobi 51,507; Kiambu 74,782) | KNBS 2023/24 |
| Nairobi suburb rental yield | **7.4% Q4 2025** — highest since index began 2007 | HassConsult |
| Satellite-town rent growth | **+8.7% in 2025** | HassConsult |
| Nairobi rents | **-0.2% Q2 2025** (after +0.3% Q1); 13 areas cut asking rents Q1 2025 | HassConsult |
| Unregistered agents | **40,000+** | EARB survey via Business Daily *(dated)* |
| Smartphone connections | **48.7m (+9.1%)** vs 29.6m feature phones | CA, Oct–Dec 2025 |
| Mobile broadband | **51.5m (+9.3%)**; 4G 44.2m; 5G 1.7m | CA, Oct–Dec 2025 |
| Mobile money | **51.4m subscriptions (~98% penetration)**; **M-Pesa = 89%** of them | CA, Oct–Dec 2025 |
| Sacco use to acquire property 2023–24 | **34.1% of Kenyans** | KNBS housing survey via People Daily |

**Typical monthly rents (KNBS 2023/24, via Kenya Times Jan 2025; rent figures not
year-labelled in the article):** bedsitter in flat **~KSh 7,500**; 1-bed **~KSh 8,500**;
2-bed **~KSh 15,000**; 1-bed bungalow ~KSh 13,000; 2-bed bungalow ~KSh 18,000; 3-bed
bungalow ~KSh 65,000; 3-bed townhouse ~KSh 70,000.

**Not verified:** rental market size in KSh; Nairobi **residential** vacancy rate (only
office found: 19.3% 2024 → 15.3% 2025, Cytonn); EARB registered-agent count.

---

## 8. The Core Design Problem

### Who presses the "TAKEN" button?

Every platform in this market dies at this exact point.

- The **landlord** fills the house and forgets the platform exists.
- The **agent** wants the dead listing to stay up — it is bait.
- **Nobody is paid to tell the truth about a unit that is gone.**

Listings rot, users get burned twice, and they return to walking estates asking caretakers.
That is the entire graveyard in §6, in one sentence. **No verified example of anyone
solving this was found in this scan.**

### The lever: the outgoing tenant

**The person holding the freshest, most valuable information in the Kenyan rental market is
the outgoing tenant** — not the landlord, not the agent. The person who gave notice this
morning and knows the unit is free on the 1st.

Today that person tells nobody, is paid nothing, and walks away — frequently cheated out of
their deposit on the way out. **Give them a reason to speak first and you hold inventory
nobody else can buy.**

### The second lever: re-employ the middlemen, do not fight them

40,000+ informal agents and countless caretakers are **not evil — they are monetising the
only scarce asset they hold, which is knowledge.** Remove the scarcity and you destroy
their income; they will fight (cf. the lawsuit threat in §5). Give the honest ones a
**public rating, a verified badge, and more volume at lower margin**, and the best become
the distribution network. **The on-site caretaker is the best verification sensor in
Kenya.** Pay him KSh 50 per status check, not KSh 2,000 per viewing.

*(Detailed caretaker/agent incentive design is a separate working document.)*

### Gamification as the data pipeline, not decoration
- **Reward the notice, not the listing.** Points for "vacating 1 Dec", scaled by how early.
- **Listings must decay.** A unit goes dark in ~7 days unless re-confirmed. "No stale
  listings" becomes a mechanic, not a policy.
- **One-tap verification.** "Is this still free?" Yes / No / Don't know. Two seconds,
  anyone nearby, paid in points.
- **Estate-level identity and leaderboards.** Local pride (mtaa competition) is free fuel.
- **Earn your access.** Full search, payment perks and moving discounts unlocked by
  contribution; freeloading gets the basic tier.
- **Rate the house, not just the landlord:** water reliability, token drain rate, real walk
  to the stage, road passability in rain — the facts no listing discloses.
- **Deposit-return receipts.** Logging move-out photos and deposit outcomes accidentally
  builds **the rental reputation record Kenya has never had, for both sides.**

### Monetisation
**Never charge the tenant to view.** It is the fraud pattern (§2.3), it is what press and
police flag, and it is legally dangerous (§9). Discovery is the acquisition funnel, not the
revenue line.

**Benchmark — NoBroker (India, $210m Series E):** landlord lists free, **no brokerage to
either side**, and **~90% of users stay free on purpose — the free pool is the moat.**
Monetisation is premium plans (verified leads, assisted visits, documentation) plus
adjacent services. FY24 revenue **₹803 Cr with ~90% from core rental/listings**; by **FY26
core is ~50%**, with financial + home services at ~45–50% *(Inc42; company gave no
breakdown and Inc42 could not verify independently; losses high as of 2024 filings,
FY25/FY26 not filed)*. **Lesson: monetise rent payment, moving, cleaning, deposits and
insurance — not discovery.**

**Benchmark — QuintoAndar (Brazil):** rent guarantee without a guarantor across ~300,000
contracts; takes first month's rent + a transaction %; >R$20bn TTV in the year to Jun 2025.
**Caution: it is broker-inclusive (5,000+ partner professionals), and it killed QuintoCred,
terminating ~45,000 guarantee contracts in Jun 2025.** The guarantee product is the hard
part — do not start there.

**Kenyan precedent already working informally:** free WhatsApp housing communities (§5) and
**Hauzisha paying scouts to report vacant units**. Crowdsourced verification works here
already. The unsolved gap is **a structured incentive to mark a unit TAKEN.**

---

## 9. Regulatory Constraints

### 9.1 Do not practise estate agency unregistered
**Estate Agents Act (Cap 533):** practising requires **EARB registration plus an annual
practising certificate.** Current penalty: fine up to **KSh 20,000 and/or 2 years'
imprisonment.** The **Estate Agents (Amendment) Bill** would raise the maximum to
**KSh 1,000,000** and bar unregistered agents from being paid at all — **status
unconfirmed, treat as proposal.** KRA/EARB have threatened **arrest** of unregistered
agents over landlord tax evasion.

**Implication:** position as a **listings / software / payments marketplace, not an agent.**
Do not negotiate lettings, do not introduce-for-commission, do not handle deposits. Charging
landlords or renters for **software, verification or data** is defensible; **a success fee
on a let looks like agency.** Reemio's public disclaimer is the template.

### 9.2 Do not hold client money
Holding rent or deposits in your own account pulls in estate-agency client-account rules
**plus** CBK/payments licensing. Use a licensed PSP/paybill settling **direct to the
landlord**, or a separately regulated escrow provider. *(Specific Kenyan client-money rule
text not retrieved — counsel must confirm.)*

### 9.3 Do not charge tenant-side viewing or holding fees
These are precisely the pattern that press, lawyers and police flag as fraud. Monetise
landlord-side (subscription, software, payments) — **never tenant pay-to-view.**

### 9.4 Data Protection Act 2019 / ODPC — actively enforced
- Register as **data controller/processor**. The burden to **prove** consent sits on the
  controller.
- Penalties up to **KSh 5,000,000** *(one source cites up to 1% of annual turnover plus
  daily fines to KSh 10,000, `[UNVERIFIED]`; another cites imprisonment up to 10 years)*.
- **Enforcement is real:** first penalty **KSh 5m on Oppo Kenya**; **KSh 5m each** on
  Whitepath (mobile lender accessing contacts without consent) and Regus Kenya (Apr 2023);
  Sept 2023 fines of **KSh 1,850,000–4,550,000** on three entities including a school; a
  restaurant fined for posting a customer's image without consent. By **Jan 2026 ODPC had
  issued 357 determinations, 134 enforcement notices, 20 penalty notices and 184
  compensation orders.**
- **Highest-risk areas for this platform:** ID/payslip uploads; publishing photos of
  occupied units or of people without consent; phone-contact harvesting; scraped-contact
  spam; DSAR handling.
- **THE DANGEROUS FEATURE IDEA — DO NOT BUILD A TENANT BLACKLIST.** A public "rent
  defaulters" register is **defamation plus a DPA violation**, and it is the single most
  likely thing landlords will request. Build **positive, tenant-owned, tenant-shared**
  history instead — a good record a tenant *chooses* to disclose, not a bad record the
  platform publishes about them.

### 9.5 Residential tenancy law is a vacuum — and may change
- **Rent Restriction Act (Cap 296):** applies only at **standard rent ≤ KSh 2,500/month** —
  effectively obsolete, so **most residential tenancies have no tribunal.**
- **Landlord and Tenant (Shops, Hotels and Catering Establishments) Act:** BPRT covers
  unwritten or ≤5-year **commercial** tenancies. Not residential.
- **Landlord and Tenant Bill (2021):** would let the Cabinet Secretary set the rent
  threshold (replacing KSh 2,500), repeal the KSh 2,500 tribunal bar, and establish
  tribunals via the Chief Justice. **It passed the National Assembly and was before the
  Senate; 2025/2026 enactment status was NOT found — `[UNVERIFIED]` and worth tracking,
  because enactment changes the platform's legal position.** MPs have also backed capping
  rent rises at inflation *(bill stage)*.
- A parliamentary committee recommended cutting the rent-default **eviction notice from
  three months to one**; **passage unconfirmed — do not state as law.**

### 9.6 The KRA adjacency problem
Treasury is funding agent registration **specifically so agents report landlords who do not
remit rental income tax to KRA** (Business Daily). **A platform holding verified rent data
becomes KRA-adjacent.** Landlords will sense this immediately. Design for it deliberately —
do not be ambushed by it.

---

## 10. Evidence Gaps — Prioritised

Answerable in roughly one week of primary work.

| # | Gap | How to close |
|---|---|---|
| 1 | **Caretaker economics** — what a caretaker earns, and what would make him loyal to the platform instead of to the KSh 2,000 viewing fee | **Most important unknown in this report.** The verification layer lives or dies on it. 10–15 caretaker interviews. |
| 2 | **Reddit, TikTok comments, real Facebook group names/sizes** | A human with a logged-in phone, one weekend |
| 3 | **Any praise-side data at all** — no tenant-satisfaction survey exists for Kenya | Run the first one; it is also a marketing asset |
| 4 | **The real cash wall** — total of rent + deposit + fees for a bedsitter in Pipeline | 10 tenant interviews |
| 5 | ***Mtush*/pickup rates** — the cheap end of moving is invisible online | Field pricing walk |
| 6 | **Landlord vacancy cost and advertising spend** | Core to the supply-side pitch; currently guesswork |
| 7 | **Landlord and Tenant Bill 2021 status** | Parliament/Senate order papers |
| 8 | BuyRentKenya acquisition date and current traffic; PigiaMe status; the ~12 unconfirmed app names | Desk research |
| 9 | Goodwill/key money in **residential** lettings — zero verified mentions | Interviews |
| 10 | What documents landlords actually demand | Interviews |

---

## 11. Conclusion

The strongest opportunity here is not the housing shortage. It is that **78.7% of urban
Kenyans rent from individuals, with no shared truth about what is vacant, no rental history
on either side, and a tribunal that legally stops mattering above KSh 2,500 a month.**

Four gaps. All made of information. All already being addressed, for free and at the limit
of what a chat app can do, by communities in WhatsApp groups.

**Someone reached ~21,000 members with no product. That is the signal.**

---

## Sources

**Tenant quotes & complaints**
- Business Daily (19 Mar 2025) — house hunters ditching agents for WhatsApp groups; Njeri,
  Momanyi, Kariuki quotes *(reached via mwanaspoti.co.tz mirror)*
- kenyans.co.ke/news/57809 — house-hunting scams, named victims
- kenyans.co.ke/news/56342 — 5 fees landlords use to swindle tenants
- kenyans.co.ke/news/56112, /55729, /40369, /87274, /90387, /63158 — moving, deposit law,
  UN staff deposits, arrears/auctions, paybill impersonation, evictions
- nation.africa — Kisumu agents fleecing newcomers; 2025 High Court deposit ruling
- citizen.digital/news/...n371915 — housing scams surge in prime estates (2025)
- abacus.co.ke — full M-Pesa scam playbook, Fedha Estate case
- allAfrica (202605220242) — Rent vs Income: Kenya's Housing Squeeze; Mwangi/Atieno quotes
- The Star (2024-08-20) — tenants downgrading
- The Star (2026-07-17) — women lead Kenya's online house-hunting boom; Remio data

**Social / platform layer**
- biznakenya.com/social-media-house-hunting-communities-in-kenya/
- businessdailyafrica.com — Mark Mansa / YouTube property channels
- tiktok.com/@kikihomes1 *(only verified handle)*
- cncintel.com/tiktok-rental-scam-warning-signs/ *(US data — context only)*
- dutchnews.nl (2026/08) — fake TikTok student rentals *(context only)*

**Law & tribunals**
- new.kenyalaw.org — [2021] KEBPRT 312, 437, 459; [2024] KEBPRT (Grocery Cart Mini Mart v
  4Way Village Mgmt, 28 Jun 2024); [2025] KEBPRT 205 (21 Mar 2025)
- nation.africa/kenya/news/judge-clears-way-for-suits-against-landlords-withholding-deposit-4902290
  — High Court, Justice Helene Namisi, 23 Jan 2025
- estateagentsboard.or.ke — EARB register and 2025 public notice
- businessdailyafrica.com — EARB penalties, KSh 1m fine proposal, 40,000 unregistered
  agents, inflation rent cap, KRA/agent registration
- roedl.com, kenyans.co.ke — Landlord and Tenant Bill 2021
- odpc.go.ke, iapp.org, clydeco.com, aln.africa, dataguidance.com — DPA enforcement
- standardmedia.co.ke — CRB fees; commercial goodwill case; landlords vs agents

**Market data**
- housingfinanceafrica.org — 2019 Census tenure data
- thekenyatimes.com, citizen.digital — KNBS Kenya Housing Survey 2023/24
- peopledaily.digital — Housing PS Hinga deficit figures; sacco property acquisition
- ca.go.ke — Communications Authority sector statistics, Oct–Dec 2025
- money254.co.ke / HassConsult Hass Property Index — yields, rent movements
- cytonn.com — office vacancy *(residential not available)*
- pulse.ug — Jumia House / Property24 Kenya exits (2024)
- hapakenya.com — KejaHunt (2014–15)
- wearetech.africa — Reemio; dawan.africa — PropertyDuka (Aug 2026)
- techpoint.africa — Rent Hero (5% of rent); vc4a.com — Rentpay
- inc42.com — NoBroker revenue mix; news.crunchbase.com + QuintoAndar newsroom +
  onlinemarketplaces.com — QuintoAndar
- capitalfm.co.ke — tenant vetting practice
- bestcareservices.co.ke, achisystems.co.ke — mover pricing *(vendor, indicative)*
