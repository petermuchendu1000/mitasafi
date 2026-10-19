# The Contrarian Case Against Mitasafi

*Agent 05 — the adversary. My job is to argue the plan is a well-reasoned answer to the wrong question.*

Date: 2026-10-19

---

## The one paragraph

The plan's central claim — "nobody has built an honest, free list of vacant houses for the mass
market" — is false, and that is the whole problem. At least eight Kenyan products are live right
now selling exactly this promise. StayNai advertises "1,200+ Verified Listings," "direct caretaker
phone numbers," "no middlemen," a bedsitter in Juja at KSh 8,500, and charges tenants KSh 299 a
month. Renters Hub calls itself "Kenya's National Rentals Platform — The Place Where Kenyans Come
To Find Verified Vacant Houses." Kejanova holds viewing fees in M-Pesa escrow. 254rent, CribSeek,
CribsKenya, KenyaHomesHub and RentHub are all shipping. None of them has become the answer, and
they all had more resources than Mitasafi will have. So the scarce thing was never the idea, the
trust levels, the 7-day decay rule or the four-tier reputation model. The scarce thing is a
standing relationship with the person who holds the data — the caretaker — in thousands of separate
estates, which is physical, expensive, repetitive field work. The founder has looked at that work
and said, correctly for his own life, "I don't want to do it myself." That is not a constraint to
design around. It is a disqualification from this particular business. Build the thing his one real
asset — the ability to reach large audiences in Facebook and WhatsApp groups — actually buys, and
the thing nobody in Kenya owns: **the price truth at the bottom of the market.**

---

## The case against

### 1. The idea is crowded, not empty (strongest)

**Evidence.** A single search for free Kenyan vacancy platforms returns, all live:

| Product | Claim | Monetisation |
|---|---|---|
| [StayNai](https://staynai.com/) | 1,200+ verified listings, 12 Nairobi suburbs, caretaker numbers direct, "no middlemen" | KSh 299/mo from tenants |
| [Renters Hub](https://www.rentershub.co.ke/) | "Kenya's National Rentals Platform", "Verified By Renters Hub" badge | undisclosed |
| [Kejanova](https://kejanova.com/) | Verified vacant houses, Nairobi/Mombasa/Kisumu/Nakuru | viewing fees held in M-Pesa escrow, "Hunt Bundles" |
| [254rent](https://www.254rent.co.ke/), [CribSeek](https://www.cribseek.app/), [CribsKenya](https://www.cribskenya.com/), [KenyaHomesHub](https://play.google.com/store/apps/details?id=com.mindhunter.flicker), [RentHub](https://renthub-gold.vercel.app/) | variations on the same promise | mixed |

**Argument.** Part 2 of `00-first-principles.md` lists seven reasons nobody has fixed this. It is
missing the eighth: lots of people have tried, are trying now, and the attempts are invisible
because they stall at a few hundred listings concentrated in Kilimani, Westlands and Roysambu — the
same places the portals already cover. StayNai is the clearest case. It independently arrived at
Mitasafi's exact insight (the caretaker's number is the product) and even reaches down to a KSh
8,500 Juja bedsitter. It did not break out. Mitasafi's differentiation over StayNai is that it is
free and run by volunteers. Being free is not a moat against a product that already struggles at
KSh 299; it removes the only revenue that could have paid for the field work that fixes the real
bottleneck.

The plan's own diagnosis contains the refutation. If "the missing information is what the agent is
selling," then the agent will not surrender it, and only a party who compensates the caretaker for
switching sides gets the data. A free platform paying contributors in "earlier access to listings"
is offering the data holder nothing. The caretaker earns KSh 15,000–30,000 a month
([Glassdoor Nairobi caretaker average ≈ KSh 28K](https://www.glassdoor.com/Salaries/nairobi-kenya-caretaker-salary-SRCH_IL.0,13_IM1085_KO14,23.htm))
plus informal tenant-finding commissions. Early access to a list does not compete with that.

### 2. The founder posture and the product shape are incompatible

**Evidence.** The plan requires coverage in each estate separately — the documents say so
explicitly ("Having many houses in Kilimani helps a person in Githurai 45 exactly zero"). Kenya has
hundreds of such micro-markets. The stated resources: one founder, near-zero budget, no field work,
distribution by posting in Facebook and WhatsApp groups. The largest named Kenyan rental Facebook
group found was ~23,943 members ([listing, ~587 days old](https://thebestinkenya.co.ke/facebook-groups-to-join-in-kenya/)) —
that is one city-wide group, not a per-estate channel.

**Argument.** The community model in `01-community-model.md` is an attempt to convert a field-ops
problem into a software problem by having residents do the walking. It is elegant and it will not
cold-start, for one reason the document itself concedes and then moves past: the community cannot
own "the first two weeks of someone being present." Multiply that honest admission by the number of
estates. Two weeks of presence × 200 estates is 400 person-weeks of exactly the work the founder
has ruled out. Resident reporting is a good *retention* mechanic for a building that is already on
the platform. It is not an *acquisition* mechanic. The first resident of GG House has no reason to
claim a building on an empty site, and the loop in Part 2 only turns after that first person acts.

A Facebook post reaches people spread thinly across fifty estates. It will not produce the three
residents in one building you need for the first useful vacancy record. The distribution channel
available is city-shaped; the product is estate-shaped. They do not fit.

### 3. The unit of value decays, and the durable asset is being left on the table

**Evidence.** Published rent figures for the same estate and unit type disagree wildly. For a
Kasarani bedsitter: [KES 9,000](https://mglshub.com/rent/nairobi/kasarani);
[KES 10,000–18,000](https://www.afriqahome.com/guides/studio-vs-bedsitter-one-bedroom-kenya);
[KSh 15,000–40,000](https://buenoproperty.com/2026/07/20/houses-apartments-for-rent-in-kasarani-nairobi-2026-guide/).
That is a 4.4x spread between sources, none with a stated method.

Meanwhile the one respected Kenyan index measures only the top. HassConsult's Q2 2026 release
covers suburbs where [average rent crossed KES 201,832/month](https://www.businessquest.co.ke/hassconsult-publishes-property-price-indices-q2-2026/)
and satellite towns at KES 64,765. There is no index for the KSh 4,000–30,000 band at all.

**Argument.** A vacancy list is the most perishable asset in this problem — the plan assigns it a
7-day half-life by design. You cannot own it, cannot defend it, and must re-manufacture it every
week forever. A verified all-in price series for the mass market is the opposite: it accumulates,
each wave makes the next more valuable, and it has no incumbent. Of the four durable candidates in
the brief I would pick the **rent price index**, not the address registry and not the agent
reputation system. The address registry is already a tested loser —
[OkHi](https://techcabal.com/2021/10/08/ex-google-emea-lead-expands-address-verification-service-to-nigeria/),
founded by an ex-Google EMEA lead, verified 300,000 Kenyan addresses with 20 paying customers, then
concluded Kenya "wasn't the best place to basically build and go to market with address
verification" and moved the business to Nigerian financial services. The agent reputation system
requires identity resolution for 40,000+ unregistered agents
([EARB survey, via Business Daily](https://www.businessdailyafrica.com/economy/3946234-4968500-n3dh1s/index.html))
and invites defamation claims. The price index requires only a survey form and an audience.

### 4. The binding constraint is cash, and that business is not available to this founder

**Evidence.** The plan's own Problem 6 — about three months' rent in cash to move at all. Against
a typical mass-market income: ILO put average informal-enterprise wages at roughly
[KSh 2,000–5,000 per worker per month](https://www.ilo.org/sites/default/files/wcmsp5/groups/public/@ed_emp/@emp_ent/documents/publication/wcms_820312.pdf),
with informal work at 83% of total employment; the 2025 gazetted minimum for general labourers was
[KSh 16,113.75](https://thekenyatimes.com/national/average-basic-minimum-salary-kenyans-earn-in-nairobi-and-other-cities/).

The product exists. [RentU](https://www.rentunow.com/) pays the landlord rent and deposit upfront
and splits repayment over 3–6 months, claims 24-hour approval, "Licensed in Kenya," **1,282+
tenants and 26+ landlords.** Its own worked example is Kilimani at KSh 45,000/month — KSh 135,000
upfront becoming KSh 22,500/month. Comparables: Nigeria's
[SmallSmall raised $3M](https://www.techbooky.com/small-small-seed-funding/) ($2M equity, $1M debt)
for the same model at a stated 10–15% markup;
[Kwaba](https://disruptafrica.com/2021/02/19/how-this-nigerian-startup-is-helping-people-split-their-annual-rent-into-monthly-installments/)
does rent savings plus rent financing; Brazil's
[QuintoAndar reached a $4B valuation](https://techcrunch.com/2021/05/27/quintoandar-raises-300m-at-a-4b-valuation-as-ribbit-capital-makes-a-big-bet-on-the-brazilian-proptech/)
by replacing the deposit and guarantor with its own credit guarantee.

**Argument, and a concession the brief did not expect.** I agree with the brief that Problem 6 is
the binding constraint and search is a symptom. A household that cannot assemble KSh 36,000 does
not have a search problem; it has a liquidity problem, and it stays in a bad house regardless of
how good your list is. But the brief's implied conclusion — therefore build deposit financing —
does not follow for *this* founder, and the evidence says why.

Unsecured lending to informal-income tenants fails on the repossession asymmetry.
[M-KOPA has disbursed over $2 billion to 7 million customers](https://www.semafor.com/article/09/22/2025/africa-focused-asset-financing-firm-m-kopa-reaches-7m-customers)
and KSh 207 billion of credit to [4.8 million Kenyans](https://www.m-kopa.com/newsroom/m-kopa-kenya-unlocks-kes-207-billion-in-credit-as-4-8-million-customers-report-rising-digital-and-financial-inclusion),
and the reason it works is that it holds the asset hostage: it locks the borrower out of the
financed phone. A rent lender holds nothing. Eviction runs through the Rent Restriction Tribunal
and takes months. There is no collateral, no repo, and no recourse beyond CRB listing. That is why
RentU's example customer is a KSh 45,000 Kilimani tenant with an employer, not a KSh 12,000
Pipeline tenant — and why, after what looks like a couple of years, it reports 1,282 tenants. The
unit economics only close where there is a verifiable payslip. Deposit financing is the right
diagnosis and the wrong prescription for a one-person, zero-capital team: it needs a CBK Digital
Credit Provider licence (the register has grown past
[195 providers](https://pesamarket.com/en/blog/cbk-licensed-digital-lenders-kenya-2026)), debt
capital, and an underwriting signal nobody currently has.

Note what the missing signal is. You cannot underwrite a KSh 12,000 tenant without knowing what
KSh 12,000 units actually cost all-in and what they actually turn over. Nobody has that. Which
points at the thing to build first.

### 5. Steelman: the incumbents are not failing

**Evidence.** [BuyRentKenya](https://www.similarweb.com/website/buyrentkenya.com/) draws roughly
187,500 visits per quarter; revenue estimates sit around
[$5–10M](https://www.salary.com/research/company/buyrentkenya-overview). Agent subscription tiers
run roughly KSh 5,000–110,000. In December 2025, Ringier One Africa Media
[sold BuyRentKenya to Rushbox](https://tracxn.com/d/companies/buyrentkenya/__gxiwGQcr8shtbF5TEPq_nCONtYMwIlo0mkZsQiq2WRw).

**Argument.** The incumbents are rational, not lazy. Their customer is the agent with a marketing
budget, and that agent only exists above roughly KSh 40,000/month. Below that, the landlord has
three units, fills them by a sign on the gate, pays nothing for marketing, and has no void-cost
large enough to justify a subscription. The "unserved mass market" is unserved because at KSh 8,000
rent there is no marketing budget to capture at either end — not because 326,000 listings were
pointed in the wrong direction. And the mild version of the bad news: a twelve-year-old portal that
*does* own the paying segment got divested by its parent. The listings-portal business in Kenya is
not a rich prize even when you have the payers. A free version aimed at the non-payers is a worse
version of a business someone just sold.

### 6. Not-a-platform options, ranked

(a) **Tenants' union.** Weak. The organisations exist and are inert — the
[Urban Tenants Association of Kenya](https://www.business-humanrights.org/en/latest-news/kenya-tenants-association-says-landlords-discriminate-against-potential-tenants-based-on-ethnicity-race-marital-status/)
mostly issues statements and refers people to tribunals; I found no evidence of any Kenyan renter
body with collective bargaining power. Renters are a high-churn constituency, the hardest kind to
organise.

(b) **Honest licensed agency.** Viable as a business, fatal for this founder — it *is* the field
work, plus registration, plus a scale cap of about 20 placements a month per person.

(c) **Advocacy.** Weak as a primary play. The state already tried: a 2024 crackdown threatened
arrest for unregistered agents, with a proposed penalty of up to
[KSh 1 million](https://www.businessdailyafrica.com/economy/3946234-4968500-n3dh1s/index.html)
against 40,000+ unregistered operators, and it changed nothing on the ground. Useful as a content
theme, not as the product.

(d) **Make the Facebook groups better.** Underrated, and it is the honest kernel of my
recommendation below — but "better groups" is not a business, it is a side effect of being the
trusted voice in them.

### 7. Segment

[Mamikos](https://www.crunchbase.com/organization/mamikos) is the brief's best evidence and it cuts
against the plan: it reached millions of users and 140,000+ kost properties by picking one sharp
customer — Indonesian students — not by serving everyone cheap. Kenya's equivalent of the Acorn
thesis is already proven at the top: Acorn's Qwetu/Qejani REITs run
[~21,000 beds and 91–95% occupancy on mature assets](https://kenyanwallstreet.com/qwetu-qejani-operator-2025).
"KSh 4,000–30,000, nationwide, everyone" is not a segment. It is the absence of one.

---

## What I would build instead

**The Kenyan Rent Report: own the price truth at the bottom of the market.**

A free, recurring, methodologically honest publication of what mass-market Kenyan housing *actually
costs all-in* — rent plus water plus garbage plus service charge plus deposit plus goodwill — by
estate and unit type, built entirely from reader surveys, plus a reader-submitted scam-number
registry. No field work. No listings as the product. Listings fall out as a by-product, because
every survey respondent who is moving tells you about a vacancy without being asked.

Why this one and not the other six:

- **It matches the founder's single real asset.** The stated competence is "I can post in big
  Facebook and WhatsApp groups." That is a media distribution competence. A city-wide channel is
  useless for estate-level vacancy and perfect for a survey and a publication.
- **The hole is verified.** Published Kasarani bedsitter rents range 9,000 to 40,000 with no
  method. HassConsult's index starts at KSh 201,832 suburban average. Nobody measures the band
  Mitasafi cares about.
- **The asset accumulates instead of decaying.** Wave 12 is worth more than wave 1. A vacancy list
  is worth zero on day 8.
- **It has paying customers from day one** — and they are not the broke tenant. They are the people
  who need the number: property managers, small landlords with no benchmark, the rent-financing
  players who cannot underwrite without it, and the dozen listing platforms that need credible
  price data they do not have.
- **It is the on-ramp to the business that actually matters.** If the index is real, you are the
  only party in Kenya who can price mass-market tenancy risk. That is the input to deposit
  financing — the right diagnosis in section 4 — reached without needing a licence or capital on
  day one.
- **Nobody owns this voice.** Kenyan rent-scam and rent-price content is scattered across
  [Kenyans.co.ke](https://www.kenyans.co.ke/news/57809-most-popular-house-hunting-scams-avoid-nairobi),
  agency SEO blogs and valuer marketing pages. No single trusted person or publication owns it.

### The first three steps

1. **This Monday: the Rent Truth Survey.** One form, twelve questions, no login. What estate, what
   building type, what unit, what you pay in rent, what you pay for water, garbage, service charge,
   security; what deposit you paid; whether you paid goodwill or a viewing fee and how much; which
   month you moved in. Post it as a native image + comment (not a link — groups throttle links) in
   the ten largest Kenyan rental and estate groups. Target: 500 responses in 14 days. Cost: zero.
   Field work: zero.

2. **Day 15–21: publish Issue 1.** "What a bedsitter really costs in 20 Nairobi estates — the
   advertised price versus the all-in price." Lead with the gap, because the gap is the story and
   it is Problem 5 from the original analysis, unaddressed by anyone. Publish method and sample
   size per estate openly, and say where n is too small. Post it as an image carousel in the same
   groups. One call to action: join the WhatsApp broadcast for next month's issue and submit a scam
   number. Measure the broadcast list, not pageviews.

3. **Day 22–60: monetise the attention and the data.** Two parallel asks. (i) One sponsor per
   issue, sold to someone who already pays to reach movers — a property manager, a rent-financing
   player like RentU, a moving or water-delivery company. (ii) The estate-level dataset, sold as a
   quarterly PDF plus CSV to landlords and property managers who currently have no benchmark; price
   it at KSh 15,000–40,000 a quarter and go to the property-management vendors
   ([Nyumba Zetu](https://www.nyumbazetu.com/property-management-software-kenya),
   [Nyumbani](https://nyumbani.ke/), [PropTraka](https://proptraka.ke/)) as resellers rather than
   competitors — they have the landlord relationships and no data product. Ship the scam-number
   registry as a simple searchable page in the same window; it is the retention hook that brings
   readers back between issues.

**How it makes money.** Sponsorship of a trusted monthly publication; data licensing of the index
to landlords, managers and lenders; later, lead referral to the listing platforms that need
qualified movers. All three are B2B revenue from people with budgets, earned by giving tenants
something genuinely free. Crucially: no commission, no money held, no licence, no field team — which
preserves everything the original plan got right about trust, while removing the dependency on work
the founder has said he will not do.

---

## Where the original plan is right and I am wrong

Several parts survive, and some of them survive my attack intact.

**The six-problem diagnosis is excellent and I used it against itself.** Naming water, garbage,
service charge and goodwill as the hidden price (Problem 5) is the sharpest observation in either
document, and my entire recommendation is built on it. The plan found the right insight and then
assigned it to the wrong product.

**"The missing information is what the agent is selling" is correct and is the best sentence in the
strategy.** I think it is fatal to the plan rather than a foundation for it, but it is true, and
most people building in this space have never articulated it.

**The building, not the listing, is the right unit of analysis.** This is right and I have no
counter. A building persists for thirty years, has a named identity residents already use, and
usually has a WhatsApp group. My index should be keyed to buildings and estates for exactly the
reasons Part 1 of `01-community-model.md` gives.

**Residents genuinely are the best data source, and their incentives are real.** The reasoning
about why a neighbour will help — security, service-charge splits, being asked *"unajua nyumba?"* —
is sound. My criticism is narrow: it works for retention, not for cold-start. And the Rent Truth
Survey is a resident-reporting mechanism; I am keeping the insight and changing what it reports,
from the perishable fact (is unit 4B empty today) to the durable one (what does 4B cost all-in).

**Honesty about freshness is a real differentiator.** The 7-day decay rule and the refusal to show
stale listings are the right instincts, and the observation that you get roughly one wasted matatu
trip of credit per user is exactly right. If I am wrong about the crowded market, it will be
because none of StayNai, Renters Hub or Kejanova has the discipline to delete their own inventory,
and discipline turns out to be the moat after all.

**And the one place I may simply be wrong:** if the resident loop *does* ignite in even twenty
buildings from a single Facebook post, my entire argument collapses, because then acquisition is
free and the cold-start objection was imaginary. That is cheap to test — far cheaper than my
recommendation. Test it in the same week as the survey, in one estate, and let the result decide.
If three residents of one building both claim it and confirm each other inside fourteen days with
no prompting from the founder, ignore most of what I have written.

---

### Sources

- [StayNai](https://staynai.com/) · [Renters Hub](https://www.rentershub.co.ke/) · [Kejanova](https://kejanova.com/) · [254rent](https://www.254rent.co.ke/) · [CribSeek](https://www.cribseek.app/) · [CribsKenya](https://www.cribskenya.com/) · [KenyaHomesHub](https://play.google.com/store/apps/details?id=com.mindhunter.flicker) · [RentHub](https://renthub-gold.vercel.app/)
- [RentU](https://www.rentunow.com/) — Kenyan rent/deposit splitting
- [SmallSmall $3M seed (Nigeria)](https://www.techbooky.com/small-small-seed-funding/) · [Kwaba (Nigeria)](https://disruptafrica.com/2021/02/19/how-this-nigerian-startup-is-helping-people-split-their-annual-rent-into-monthly-installments/) · [QuintoAndar $4B (Brazil)](https://techcrunch.com/2021/05/27/quintoandar-raises-300m-at-a-4b-valuation-as-ribbit-capital-makes-a-big-bet-on-the-brazilian-proptech/)
- [M-KOPA 7M customers / $2B disbursed](https://www.semafor.com/article/09/22/2025/africa-focused-asset-financing-firm-m-kopa-reaches-7m-customers) · [M-KOPA Kenya KES 207B](https://www.m-kopa.com/newsroom/m-kopa-kenya-unlocks-kes-207-billion-in-credit-as-4-8-million-customers-report-rising-digital-and-financial-inclusion)
- [CBK licensed digital credit providers](https://www.centralbank.go.ke/wp-content/uploads/2025/12/Directory-of-Licenced-Digital-Credit-Providers-24-December-2025.pdf) · [count ~195 (2026)](https://pesamarket.com/en/blog/cbk-licensed-digital-lenders-kenya-2026)
- [HassConsult Q2 2026 indices](https://www.businessquest.co.ke/hassconsult-publishes-property-price-indices-q2-2026/) · [Hass rental index page](https://hassconsult.co.ke/real-estate/hass-index/15-the-hass-rental-index)
- Conflicting mass-market rents: [mglshub Kasarani](https://mglshub.com/rent/nairobi/kasarani) · [Bueno Property Kasarani](https://buenoproperty.com/2026/07/20/houses-apartments-for-rent-in-kasarani-nairobi-2026-guide/) · [Afriqahome](https://www.afriqahome.com/guides/studio-vs-bedsitter-one-bedroom-kenya) · [Githurai 44](https://www.houseforrentkenya.com/locations/githurai-44.html)
- [BuyRentKenya traffic](https://www.similarweb.com/website/buyrentkenya.com/) · [revenue estimate](https://www.salary.com/research/company/buyrentkenya-overview) · [Ringier sale to Rushbox, Dec 2025](https://tracxn.com/d/companies/buyrentkenya/__gxiwGQcr8shtbF5TEPq_nCONtYMwIlo0mkZsQiq2WRw) · [early model](https://techmoran.com/2014/10/25/buyrentkenya-com-wants-make-property-agents-rich-quickly/)
- [OkHi pivot to Nigeria](https://techcabal.com/2021/10/08/ex-google-emea-lead-expands-address-verification-service-to-nigeria/) · [OkHi $1.5M / 300k addresses](https://techpoint.africa/2022/03/09/okhi-raises-1-5million/)
- [EARB crackdown / Sh1m fine proposal](https://www.businessdailyafrica.com/economy/3946234-4968500-n3dh1s/index.html) · [unlicensed agents risk arrest](https://nation.africa/kenya/business/unlisted-real-estate-agents-face-arrest-over-property-owners-dodging-tax-4559002)
- [Urban Tenants Association of Kenya](https://www.business-humanrights.org/en/latest-news/kenya-tenants-association-says-landlords-discriminate-against-potential-tenants-based-on-ethnicity-race-marital-status/) · [LATAK](https://www.facebook.com/latak.or.ke/)
- [Mamikos (Crunchbase)](https://www.crunchbase.com/organization/mamikos) · [Mamikos (Dealroom)](https://app.dealroom.co/companies/mamikos)
- [Acorn Qwetu/Qejani 2025 results](https://kenyanwallstreet.com/qwetu-qejani-operator-2025) · [Acorn D-REIT semi-annual 2025](https://acornholdingsafrica.com/wp-content/uploads/2025/08/ASA-D-REIT-2025-Semi-Annual-Report.pdf)
- [ILO Informal Economy in Kenya](https://www.ilo.org/sites/default/files/wcmsp5/groups/public/@ed_emp/@emp_ent/documents/publication/wcms_820312.pdf) · [KNBS minimum wage coverage](https://thekenyatimes.com/national/average-basic-minimum-salary-kenyans-earn-in-nairobi-and-other-cities/) · [74% earn under Sh50,000](https://www.businessdailyafrica.com/bd/news/74pc-of-salaried-kenyans-earn-less-than-sh50-000-2228858)
- [Caretaker pay, Nairobi](https://www.glassdoor.com/Salaries/nairobi-kenya-caretaker-salary-SRCH_IL.0,13_IM1085_KO14,23.htm)
- Kenyan PM software: [Nyumba Zetu](https://www.nyumbazetu.com/property-management-software-kenya) · [Nyumbani](https://nyumbani.ke/) · [PropTraka](https://proptraka.ke/) · [KodiiPay](https://www.kodiipay.com/) · [buyer's guide](https://pangoni.io/blog/guides/property-management-software-kenya)
- [Largest Kenyan rental Facebook group member count](https://thebestinkenya.co.ke/facebook-groups-to-join-in-kenya/) · [common house-hunting scams](https://www.kenyans.co.ke/news/57809-most-popular-house-hunting-scams-avoid-nairobi)
