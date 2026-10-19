# The Economics of a Free Vacancy Directory — Where the Design's Equilibrium Differs From Its Intention

**Date: 2026-10-19**
**Agent 03 — market design / incentives review**

Tags used throughout: **[E]** = I found published evidence for this. **[R]** = I reasoned it from
stated assumptions. Treat **[R]** as a claim to test, not a fact.

---

## The finding to argue with first

**Everything this directory can give a tenant is worth about 3–5% of their monthly rent. A rent
rise of 4% cancels all of it. And the same list that tells a tenant what a house costs tells a
landlord what the building next door is charging — so the project's own success is the most likely
source of that 4%.**

The agent's fee looks like the prize. It isn't. It is roughly the market price of a service the
landlord genuinely values (not leaving a unit empty), it mostly relocates rather than disappears,
and once you amortise it over a tenancy it is small. The real asset you are building is not a
cheaper search. It is the only honest record in Kenya of **what rent people actually pay, and that
a given unit and landlord are real** — which is the missing input for the thing that actually binds
this household: the KSh 36,000 it cannot raise to move.

Design rule that follows: **the seeker should see many prices; the landlord should see one.**

---

## 1. Where does the rent go?

### Assumptions (change these and the answer changes)

| Label | Assumption | Value |
|---|---|---|
| A1 | Target rent | KSh 10,000/month |
| A2 | Fares + wasted time per search | KSh 1,500 |
| A3 | Viewing fees paid across 3–6 viewings | KSh 2,250 |
| A4 | Agent commission when paid | 1 month = KSh 10,000 |
| A5 | Probability a tenant in this band pays full commission | 50% → expected KSh 5,000 |
| A6 | Average tenancy length | 30 months **[R]** — a 2025 Kenyan report says many renters now stay 3–8 years, so 30 months is conservative for a higher-churn band ([african-realestate.com](https://www.african-realestate.com/press/high-deposits-are-pushing-middleincome-kenyans-towards-longterm-renting)) |

**Total cost of finding and entering a house: KSh 1,500 + 2,250 + 5,000 = KSh 8,750 per move.**
Amortised: 8,750 / 30 = **KSh 292/month = 2.9% of rent.** At full commission it is KSh 13,750, or
**4.6% of rent.** That band — 3% to 5% — is the entire prize. Say it out loud before designing
anything.

### The three shillings are not the same shilling

- **Fares and time (KSh 1,500): burned.** Nobody receives this. Matatu fare for a wasted trip is
  destroyed value. Remove the friction and this money is *created*, not transferred. **This is the
  only part of the saving that cannot relocate, because there is no incumbent recipient to fight
  for it.**
- **Viewing fees (KSh 2,250): a transfer** to agents and caretakers.
- **Commission (KSh 5,000 expected): a transfer** to agents.

### Does the transfer reach the tenant? Model the division

Transparency creates surplus (the burned fares, plus filled void weeks — see Q6). Who gets it is set
by **bargaining power**, and bargaining power is set by the ratio of seekers to vacancies. The
directory does not change that ratio by one unit. **[R]** With several seekers per vacancy, the short
side (landlord/caretaker) captures most of any new surplus, because the long side competes it away.

The five relocation routes, ranked by how easily they absorb KSh 5,000–8,000:

1. **Caretaker charges directly (easiest).** The caretaker already holds the keys, the gate and the
   water. Removing the agent removes the caretaker's *supplier*, not the caretaker. Kenyan research
   finds 28% of Kibera landlords already use intermediaries to collect rent ([Gulyani &
   Talukdar via Springer](https://link.springer.com/chapter/10.1007/978-1-4020-8862-9_8)) **[E]** —
   the collection layer is already there and already monetised.
2. **Inflated or extra deposit.** There is no legal cap on residential deposits in Kenya for most
   lettings, and practice already ranges from one to two months plus separate water and electricity
   deposits ([real.co.ke](https://www.real.co.ke/rent-deposit-disputes-kenya/)) **[E]**. Moving the
   extraction into the deposit is nearly free: it is also the item most often never refunded
   ([Nation](https://nation.africa/kenya/life-and-style/dn2/money-hungry-landlords-fleece-tenants-of-their-deposit-refunds-886648)) **[E]**.
3. **Goodwill / "commitment fee."** Already the most common fraud pattern in this market; it becomes
   the legitimate replacement for the viewing fee.
4. **Service charge padding.** Easy where the charge is unitemised.
5. **Landlord raises rent (slowest but most durable).** Needs the landlord to learn the market
   clears higher. See Q2 — you are about to teach him.

**Yes, there is a version where the tenant pays the same and only the recipient changes.** It is the
*default* version. The tenant's reliable gain is the KSh 1,500 of fares, because that is the only
line with no incumbent claimant. The KSh 7,250 of fees is contested, and the contest is between a
landlord who sets the price and a tenant who is one of five applicants.

---

## 2. Does transparency raise rents? Probably yes, and it only needs to be a little

### What the evidence says

- **Publishing prices in a concentrated market raised them 15–20% in one year.** Denmark's
  competition authority published firm-specific transaction prices for ready-mixed concrete in 1993
  intending to help buyers. Average prices of the published grades rose 15–20% within a year;
  the authors conclude publication let firms soften price competition ([Albæk, Møllgaard &
  Overgaard, *J. Ind. Econ.* 1997](https://onlinelibrary.wiley.com/doi/10.1111/1467-6451.00057);
  [working version](https://sites.duke.edu/collardwexler/files/2015/01/danish_concrete_cartel.pdf)) **[E]**.
  This is the single most relevant empirical result in this whole report.
- **Shared price information among landlords is now an antitrust theory, not a hypothetical.** The
  DOJ and eight state AGs sued RealPage in August 2024 alleging its software let landlords coordinate
  rents without any explicit agreement; the settlement reportedly bars runtime use of competitors'
  non-public data ([DOJ](https://justice.gov/archives/opa/pr/justice-department-sues-realpage-algorithmic-pricing-scheme-harms-millions-american-renters);
  [Mintz](https://www.mintz.com/insights-center/viewpoints/2191/2025-12-01-last-years-rent-realpage-reaches-settlement-agreement)).
  A Berkeley project estimated an association with higher rents of about $0.23/sq ft/month
  ([Berkeley I-School](https://www.ischool.berkeley.edu/projects/2025/investigation-alleged-rental-price-fixing-algorithmic-collusion-realpage-and-other)) **[E]**.
- **Theory does not promise that cheaper search lowers prices.** The Diamond paradox result is that
  even a tiny search cost pushes a market to the monopoly price, and several later search models
  find prices *rise* when search costs fall ([Moraga-González et al.](https://host.kelley.iu.edu/mwildenb/heterogeneity.pdf)) **[E]**.
- **Transparency in rentals did not lower prices where tested.** A study of California's AB 537
  all-in pricing rule found guests became more price-sensitive yet average daily rates still rose
  4.8% ([ICLE](https://laweconcenter.org/resources/clearing-the-fog-price-transparency-market-churn-and-consumer-welfare-in-short-term-rentals/)) **[E, weak — working paper, think tank]**.

### What the evidence says against me — state it honestly

- **Cheap listings demonstrably improve matching.** Kroft and Pope used Craigslist's staggered entry
  and found rental vacancy rates fell about 11% (1.2 percentage points). They also explicitly warn
  the welfare effects are less clear ([Kroft & Pope, *JOLE*](http://www.korykroft.com/files/Kroft%20and%20Pope%20Manuscript.pdf)) **[E]**.
  No rent effect was established either way.
- **Concentrating listing information may *lower* rents.** A Penn dissertation on Manhattan rental
  brokers finds larger brokers associated with lower rents and shorter listing times, and that
  *expanding* brokerage entry could hurt tenants by fragmenting listings
  ([Penn IUR](https://penniur.upenn.edu/publications/housing-search-and-rental-market-intermediation)) **[E]**.
  Read directly, this is an argument *for* one big directory.
- **Pure rent-extracting intermediaries reduce welfare.** Farboodi, Jarosch & Menzio find any
  equilibrium with rent-extracting intermediation is inefficient
  ([paper](https://web-facstaff.sas.upenn.edu/~gmenzio/linkies/FJM.pdf)) **[E]**. Killing the agent
  is, in principle, welfare-improving.

### Which effect dominates

Pipeline has thousands of small landlords, so a Danish-concrete cartel across Nairobi is impossible.
But that is the wrong market definition. **[R]** The relevant market is *bedsitters within walking
distance of one matatu stage* — perhaps 15 buildings and six caretakers who already know each other.
Six players is exactly cartel-sized, and Danish concrete needed no explicit agreement, only
published prices.

**The arithmetic of dominance:**

- Benefit from cheaper search: KSh 8,750 one-off (Q1), i.e. **KSh 292/month**.
- Harm from a 4% rent rise on KSh 10,000: **KSh 400/month**, for 30 months = **KSh 12,000**.

**A 4% rent rise more than cancels the entire search benefit.** The Danish effect was 15–20%. You
need only one-fifth of that to make tenants worse off in cash. **[R]**

**Conclusion:** the project is net-positive on search cost with reasonable confidence, and the price
channel is unmanaged and larger. That is fixable by design, not by hope: give the seeker price
information, deny the landlord *comparables*. Concretely — no public, browsable, sortable
rent-by-estate feed; prices visible only on units a signed-in seeker is actually considering;
rate-limited; and any price index published only in arrears, coarse, and aggregated. Note the
secondary gain: nobody currently has reliable Kenyan rent data at all — published Nairobi yield
figures I found conflict between 6.1% and 7.4%, and vacancy estimates between 15% and 25%
([Cytonn via realtors.co.ke](https://realtors.co.ke/nairobi-rental-market-trends-2026/)) **[E]**.
That scarcity is your asset; publishing it live gives it away to the wrong side.

---

## 3. Is the commons stable as it gets valuable?

### The attacker's arithmetic

- **Assumption B1:** at scale, an estate's listings are seen by 1,000 seekers/month.
- **B2:** an attacker posting fake vacancies with his own number as "caretaker" converts 5% to a
  paid viewing at KSh 1,000. Gain = **KSh 50,000/month**.
- **B3:** cost of attack = a few SIM cards and an afternoon ≈ **KSh 500**.

**Attack return ≈ 100:1.** The defenders are two unpaid volunteers per building whose return is
reputation, and whose cost includes conflict with the caretaker — who may be the attacker, or the
attacker's partner.

### The equilibrium is captured, not poisoned

**[R]** Poisoning is loud and self-defeating: fake listings get reported and the attacker loses the
channel. **Capture is quiet and profitable.** A caretaker who pays a block rep KSh 1,000/month for
first look, or simply *becomes* the block rep, gets a laundered, high-trust distribution channel.
Every listing stays true; the rep just routes the early view to someone who pays. The stable state
is **the current agent system with better software and your brand on it.** India's NoBroker is the
cautionary case: built explicitly to remove brokers, and users now report that paid owner contacts
connect them to brokers acting as "relationship managers"
([review](https://www.nestriqo.com/blog/nobroker-owner-listings-review);
[comparison](https://manikarthik.com/blog/nobroker-vs-magicbricks)) **[E, weak — blogs and app
reviews, not independent data]**.

### The design bug that makes this worse

Ghosh and McAfee's model predicts that **if exposure is independent of quality, you get a flood of
low-quality content** ([paper](http://www.arpitaghosh.com/papers/nberfr320-ghosh.pdf)) **[E]**. Your
reward (early access for contributing) is conditioned on **contributing**, not on **being right**.
That pays for volume. And the reputation literature names your exact missing ingredient: there is
*no ground truth against which contributions are compared*
([CACM](https://cacm.acm.org/research/reputation-systems-for-open-collaboration/)) **[E]**.

### The mechanism that holds the good equilibrium

You can manufacture ground truth. **The post-move-in audit is the whole answer.** Ask the person who
moved in three questions — was it empty, was the price right, *did anyone ask you for money* — and
trace the answer back to whoever posted and whoever confirmed. That single loop:

- turns confirmations into a scored, falsifiable claim rather than a vote;
- makes the reward payable only on a *verified* let (a KSh 20–50 bounty per real move-in costs
  almost nothing and inverts the attacker's economics: fakes earn zero and burn standing);
- detects capture, because a captured listing still produces a tenant who was asked for money.

Add two cheap structural rules: a building has a **phone number of record** confirmed by independent
residents, and any listing whose contact differs is auto-flagged; and confirmation requires two
unrelated accounts that **predate the listing by 30+ days**, which makes sockpuppets expensive in
time rather than money.

---

## 4. "Time as payment" does not survive contact with timing

**[R]** A resident's reward is a 6–12 hour head start on listings. Its value to them =
P(searching right now) × face value.

- **Assumption C1:** tenancy = 30 months (A6). A given resident is searching in roughly **1 month in
  30 → 3.3%** of months.
- **C2:** a contributor who just moved in has P(searching within 7 days) ≈ **0**.

**You are paying people in a currency worth about 3% of its face value at the moment you hand it
over, and they are handed it at the single worst moment in the 30-month cycle.** Worse, it cannot be
stored: a 6-hour head start on a listing that decays in 7 days has no shelf life. This is the
clearest mismatch between *when you earn* and *when you need* in the whole design.

What fixes it, ranked:

1. **Make it giftable, not personal.** Three named, monthly-expiring early-access passes you can
   give to a cousin or workmate. This matches the real motive — everyone gets asked *"unajua
   nyumba?"* — and converts a near-worthless private good into a valuable social one. Keep them
   non-fungible, expiring, named-recipient and non-stackable so a pass worth KSh 200–400 of search
   saving is too small to build a business on.
2. **Bank it into the one moment it is worth something: the next move.** Credit redeemable in 30
   months for things that have value *then* — a discounted mover, a rent-payment history
   certificate, and above all better terms on a moving loan (Q7). Carrying cost is low precisely
   because only ~3% redeem per month.
3. **Standing now.** Visible status is the only reward that pays immediately, and it is strictly
   better than the head start. The head start is largely redundant with it.

**Does the head start recreate the agent?** Not by resale — 6–12 hours is too thin to sell. The real
arbitrage is worse and quieter: the design makes a resident the **gatekeeper of their own building**,
which is the caretaker's job description. That is not a leak in the mechanism; that is how the agent
class reproduces itself. Capping passes and making rewards contingent on verified move-ins (Q3) is
what contains it.

---

## 5. The verifier's private incentive is negative, and this is the worst problem in the design

Check each claimed benefit:

- **"Service charge is split fewer ways."** **[R]** In the KSh 4,000–30,000 band service charge is
  typically bundled into rent or flat per unit, not divided among occupants. If so, filling a unit
  saves the resident **nothing**. Test this with 20 phone calls before relying on it.
- **"Better security."** Real, tiny, diffuse — a textbook public good, so under-supplied.
- **"A neighbour you helped choose."** **The mechanism does not deliver this.** The resident supplies
  applicants; the *landlord* selects. They get no selection right at all.
- **"Shared amenities get worse."** In the lowest band with shared taps and shared toilets, an empty
  unit is a **benefit** to neighbours: more water pressure, shorter queues. **[R]** So the incentive
  flips negative exactly where the housing need is greatest.

Now the cost side, which the design does not price:

- The caretaker loses the viewing fee and knows who took it from him.
- The caretaker controls water, the gate, whether complaints reach the landlord, and **the deposit
  refund** — KSh 10,000–20,000 of the resident's money, routinely withheld in practice
  ([Nation](https://nation.africa/kenya/life-and-style/dn2/money-hungry-landlords-fleece-tenants-of-their-deposit-refunds-886648)) **[E]**.

**So the resident is asked to put KSh 10,000+ of hostage deposit at risk, to deliver roughly KSh
9,000 of value to the landlord (Q6), in return for a reward worth 3% of a six-hour head start.** The
expected value is negative for any resident who thinks about it. This sits **upstream of all the
data**, which makes it more serious than questions 2, 3 and 4 combined.

The free-rider problem is the lesser issue. **Retaliation** is the real one: free-riding means nobody
reports; retaliation means reporting is actively punished. Rational non-reporting cases: the resident
fears the caretaker; the resident wants the unit for a relative (private information is worth more
kept); the resident is themselves about to leave and does not want the landlord to know; the
resident benefits from the unit staying empty.

**The fix is not a better reward. It is unattributability.** Reports must be structurally
untraceable to a named resident — no "GG House reported by Mercy," no public rep attached to a
specific posting, confirmations aggregated and never individually visible, and any volunteer role
deliberately rotated and detached from posting. A reward big enough to pay a resident for carrying
caretaker risk would have to exceed their deposit, which you cannot afford and should not want.

---

## 6. Who should actually pay

**Landlord's gain, quantified.** Assumptions: R = KSh 10,000; void cut from 6 weeks to 2 weeks;
4.33 weeks/month; 20-unit building; 30-month tenancies → 8 turnovers/year.

- Rent recovered per let: 10,000 × (4 / 4.33) = **KSh 9,238**.
- Per building per year: 8 × 9,238 = **KSh 73,900**.
- As a share of gross annual rent (20 × 10,000 × 12 = KSh 2.4m): **3.1%**.

Cross-check: UK guidance suggests budgeting 3–5% of gross annual rent for voids
([Real Yield](https://www.realyield.co.uk/insights/void-periods-cost-and-how-to-reduce-them)) **[E]** —
my 3.1% lands inside it, which is reassuring.

**Notice what KSh 9,238 is: approximately one month's rent.** That is why the commission is one
month's rent and why it is so stable. **The agent's fee is priced at the value of the void it
prevents.** Which means removing the agent does not liberate a free month — it liberates the gap
between the agent's fee and the agent's actual effort. **[R]**

**Ranking, by willingness to pay × whether the money corrupts the data:**

| Rank | Payer | WTP | Corrupts? | Verdict |
|---|---|---|---|---|
| 1 | **ISPs / connectivity** | KSh 1,500–3,000 per connected home **[R]** | No — cannot influence which listing a seeker sees | **Best fit** |
| 2 | **Aggregate rent data** (researchers, lenders, developers, counties as buyers) | KSh 100k–1m/yr **[R]** | No — it is about the past | **Build toward this** |
| 3 | **Movers, boda, small trades** | KSh 100–200/referral | Low | Good early cash, not scale |
| 4 | **SACCOs / deposit lenders** | High per customer | Only if they never see the directory and referrals are tenant-initiated | Conditional, and strategically the most important (Q7) |
| 5 | **Landlords** | KSh 9,238 per let — **by far the highest** | **Yes, fatally** — a paying landlord buys placement, and placement kills the accuracy claim. Also raises EARB licensing exposure | Take only as a flat, published, annual, listed-accurately-and-nothing-else fee with no boost or exclusivity. Still risky |
| 6 | **Insurers** | Low in this band | — | Skip |
| 7 | **County governments as enforcers** | Real | **Refuse** — they want landlords identified for rates; landlords would flee and tenants would be exposed | Refuse |

ISP arithmetic **[R, built on [E] inputs]**: Safaricom crossed 1,024,950 fixed subscriptions by June
2026 ([TechAfrica](https://techafricanews.com/2026/09/23/safaricom-crosses-1-million-fixed-internet-subscriptions-kenya/));
Bronze is KSh 2,999/month ([HapaKenya](https://hapakenya.com/2025/06/17/safaricom-home-fibre-prices-for-2025/));
reported FTTH ARPU ≈ KSh 2,3xx and falling ([TechCabal](https://techcabal.com/2026/09/22/safaricom-hits-1-million-home-internet-users-now-comes-the-hard-part/)).
At 50% gross margin over a 24-month life, lifetime gross profit ≈ KSh 27,600; industry acquisition
spend typically runs 10–25% of that → **KSh 2,700–6,900 per connection**. I found **no published
Kenyan CAC**, so treat the range as inferred. Caveat: fibre take-up at KSh 4,000–10,000 rent is low,
so the addressable slice is the top of your range.

---

## 7. The deposit problem — you are solving the smaller one

Household: rent KSh 12,000. Assumptions: income KSh 26,000/month (rent = 46% of income, realistic at
the bottom); residual KSh 14,000; realistic saving **KSh 1,500/month**.

**Cash wall to move:**

| Item | Amount |
|---|---|
| Deposit (1–2 months) + 1 month advance | KSh 36,000 |
| Agent commission | KSh 12,000 |
| Fares + viewing fees | KSh 3,750 |
| **Total** | **KSh 51,750** |

Time to save KSh 51,750 at KSh 1,500/month = **35 months.** Kenyan guides put a comparable all-in
figure at KSh 165,000–220,000 on a KSh 55,000 unit — roughly 3–4 months' rent, the same ratio
([ksh.co.ke calculator](https://ksh.co.ke/calculators/rent-affordability-calculator/)) **[E]**.

**What the directory removes:** KSh 3,750 of fares and fees **reliably** (7% of the wall), plus up to
KSh 12,000 of commission **if disintermediation holds** (another 23%) — but Q1 says most of that
commission relocates to goodwill or an inflated deposit. **Realistic removal: 7–15%. The deposit and
advance are 70% of the wall and are untouched.**

**The binding constraint is liquidity, not information.** A household that *knows* about a better
KSh 10,000 house and cannot raise KSh 30,000 is not helped by knowing. And the recurring loss from
being stuck dwarfs the one-off search cost: a household overpaying KSh 2,000/month for a worse unit
because it cannot afford to move loses **KSh 24,000/year, every year** — more than the entire search
cost, annually. Your own first-principles doc already says this: *"this is the real reason people
stay in bad houses."* Believe it.

**But search is the prerequisite.** Nobody will lend KSh 30,000 for a deposit without knowing the
unit is real, the rent is what the borrower says, and the landlord exists. **That is exactly what
your directory is.** The right framing is not "a free list." It is: *the only organisation in Kenya
that can underwrite a KSh 30,000 moving loan at the bottom of the market.* No Kenyan fintech
currently does tenant deposit lending — the field is rent collection software and rent-based credit
scoring ([RentLynk](https://rentlynk.co.ke/); [RentScore / Nesti via startup maps](https://startupmaphub.com/startups/fintech/kenya)) **[E]** —
so the slot is open.

This also fixes Q4: the banked reward for contributing becomes *better terms on your next moving
loan*, redeemed 30 months later, at the exact moment you need it. One mechanism, two problems.

---

## The three things this analysis says to change

**1. Make reporting unattributable, and pay for truth instead of volume.**
The verifier's expected payoff is negative because their deposit is hostage to the caretaker (Q5).
No reward you can afford fixes that; only structural anonymity does. No named reporter on a listing,
confirmations aggregated and never individually visible, volunteer roles rotated and detached from
posting. Then condition every reward on the **post-move-in audit** — was it empty, was the price
right, did anyone ask you for money — so the reward attaches to a verified let, not to a post. This
is the only ground truth available to you, and the reputation literature says systems without it
fail (Q3).

**2. Replace the 6–12 hour head start with a banked, giftable credit — and make what it buys a
deposit loan.**
The head start is worth about 3% of face value at the moment you issue it (Q4). Give contributors
three expiring, named-recipient early-access passes they can *give away*, plus credit that matures
at their next move into better terms on a moving loan. That accepts Q7's conclusion — the deposit is
the real constraint — without the platform touching money, because the directory is the underwriting
data, not the lender.

**3. Publish vacancy freely. Never publish a browsable rent list.**
A 4% rent rise cancels every benefit this project delivers, the Danish concrete case produced 15–20%
from exactly this act, and thousands of small landlords are no protection when the real market is
six caretakers around one stage (Q2). Show a signed-in seeker the price of units they are actually
considering; do not ship a public, sortable, estate-level price feed; rate-limit; publish any index
only in arrears and coarse. **The seeker sees many prices. The landlord sees one.** This is the single
design decision that determines whether the project helps tenants or hurts them.

---

### Where I am least confident

- Whether service charge is genuinely split per occupant in this band (Q5) — 20 phone calls settles it.
- The true share of tenants paying a full month's commission (A5) — this moves every number in Q1 and Q7.
- Whether six caretakers around one stage actually coordinate on price, or merely gossip (Q2). This
  is the highest-value thing to find out, and it is answerable by asking.
- No Kenyan evidence exists on void length at this rent level, or on CAC for connectivity. Both are
  inferred.
