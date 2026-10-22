# Caretaker & Agent Incentive Design
**Date:** October 22, 2026
**Depends on:** `HOUSE_HUNTING_SOCIAL_RESEARCH_KENYA.md`
**Status:** DESIGN HYPOTHESIS — blocked on caretaker economics field data (see §10)
**Core question:** How do you flip 40,000+ informal middlemen from gatekeepers into sensors?

---

## Executive Summary

The research report establishes that **the traded commodity in Kenyan house-hunting is the
address, not the house** — a documented KSh 2,000 "appearance fee" plus KSh 1,500
"inconvenience fee" simply to learn a location and be walked to it.

Destroying that information scarcity destroys 40,000+ people's income. They will fight
back; the ~21,000-member WhatsApp community precedent shows exactly how (agent
infiltration, then a lawsuit threat against the founder).

**Therefore: do not fight the middlemen. Re-employ them.**

The design rests on one economic inversion:

> The viewing fee is **high per interaction because interactions are rare.** A caretaker
> shows five houses to secure one let, so he must squeeze hard. A platform can give him
> **fifty** interactions instead of five. **Pay small, pay often, pay reliably.**
> Volume × low margin beats scarcity × high margin.

And one role insight:

> **The on-site caretaker is a per-building sensor with keys.** He is the only actor who can
> spot a vacancy, verify it exists, confirm it is still free, open the door, vouch for the
> landlord, and report whether the water actually runs. Nobody else in Kenya is all six.

---

## 1. The Cast — They Are Not One Group

Treating everyone as "agents" is the standard analytical error. The actors have
incompatible incentives and need separate designs.

| Actor | What they hold | What they want | Classification |
|---|---|---|---|
| **Caretaker** (on-site) | Perfect live truth about **one building**; physical access | Extra income, job security, respect | **Primary asset** |
| **Informal broker** ("mukora") | Shallow info across **many** estates; mobility | Cash per interaction, volume | Asset *if converted*; adversary if not |
| **Registered agent (EARB)** | Legitimacy, portfolios, legal standing | Deal flow, fewer time-wasters | Partner + legal cover |
| **Connector** (boda rider, shopkeeper, salonist) | Accidental local knowledge, no agenda | Small money, status, favours | Cheapest available sensor |
| **Landlord** (89.3% are individuals) | Authority, the void-month loss | Occupancy, records, no fraud | Payer |
| **Outgoing tenant** | The **freshest fact in the market** | Deposit back, no hassle | Trigger for the whole engine |

---

## 2. What We Must Out-Earn

A design that pays less than the viewing-fee economy loses. Appeals to community spirit do
not survive contact with a caretaker's budget.

### The informal broker (documented)
- **KSh 1,000–2,000 per viewing** (up to KSh 3,000 per The Standard)
- Stacked variant: **KSh 2,000 appearance + KSh 1,500 inconvenience = KSh 3,500 per client**
- Plus landlord-side placement fee: **50–100% of one month's rent**
- Ten hunting clients/month ≈ **KSh 20,000–35,000**, predominantly from fees rather than
  from completed lets

### The caretaker
**His salary is unknown — this is the critical gap (§10).** Structurally: a modest wage plus
free housing, with **viewing fees as the bonus layer.** Five showings/month at
KSh 1,000–2,000 ≈ **KSh 5,000–10,000**, plausibly doubling his income.

**He participates in the fee economy as arithmetic, not greed.** Design accordingly.

---

## 3. The Caretaker Offer

### 3.1 Payment schedule

| Action | Proposed pay | Purpose |
|---|---|---|
| Monthly retainer — keep his building's statuses accurate | **KSh 500–1,500 / building** | Baseline reliability |
| "Still vacant?" one-tap confirm | **KSh 20–50** | Cheap freshness |
| **"Taken" confirm (with date)** | **KSh 100–150** | *Deliberately higher — see §6* |
| New vacancy scoop (live photos, price, exact location) | **KSh 200–500** | Inventory nobody else holds |
| Verified viewing conducted (tenant confirms he appeared and showed the correct unit) | **KSh 300–500** | **Replaces the viewing fee** |
| Successful let | **KSh 1,000–2,000** (landlord-funded) | Closes the loop |

**ABSOLUTE RULE: every shilling originates from the platform or the landlord. Never the
tenant.** A tenant-side viewing or holding fee rebuilds the exact pattern being dismantled,
and walks into the fraud pattern that press, lawyers and police flag (research report §2.3,
§9.3).

### 3.2 Where the money comes from — the void-month arbitrage

The landlord's pain is the empty month.

- 20-unit plot @ KSh 10,000, ~30% annual turnover = **6 moves/year**
- Void shortened from ~1 month to ~1 week → **~KSh 45,000/year saved per plot**

Charge the landlord **KSh 50–100 per unit per month** → KSh 1,000–2,000/month on that plot,
or **KSh 12,000–24,000/year against ~KSh 45,000 saved.** Caretaker micro-payments are
funded out of that subscription.

The subscription also delivers what the landlord cannot currently buy:

- **Rent records and notice trails that survive a tribunal.** Research report §3.1:
  landlords are losing winnable cases for want of rent statements and proof of statutory
  notice ([2025] tribunal rulings). This sells the subscription by itself, independent of
  any vacancy marketing.
- M-Pesa reconciliation — the one feature both sides already praise.
- A **verified** caretaker in place of one quietly running a side business on the property.

### 3.3 The scaling property

**Income scales with territory, not with desperation.** To earn more, the caretaker covers
more buildings — which is precisely the outcome we want, because coverage *is* the product.

> Worked example: a caretaker covering 3–4 plots earns KSh 2,000–4,000 in retainers, plus
> per-action payments, plus let bonuses → roughly **KSh 5,000–8,000/month** for work he is
> already half-doing. Reliable, recurring, legal, and nobody resents him for it.

Recurring beats lumpy: for a thin-income household, predictability is worth more than the
headline figure.

---

## 4. The Broker Ladder

Do not declare war on 40,000 people. The broker's genuine comparative advantage is
**breadth and mobility** across estates, which a site-bound caretaker lacks. Sell him the
role that uses it.

| Level | Role | Requirements | Earnings |
|---|---|---|---|
| **0** | **Connector** | Anyone | Small cash per verified scoop. No badge, no commitment. |
| **1** | **Verified Resident** | ID-verified, resident in the estate | Can confirm status in own building; higher trust weight |
| **2** | **Verified Caretaker** | **Landlord-confirmed** for building X | Retainer + tools + badge |
| **3** | **Scout / Estate Operator** | Many buildings; accuracy above threshold; N verified lets | Portfolio retainer, priority payouts. **This is the converted broker's job.** |
| **4** | **Registered Agent** | **EARB-registered** | May legally perform agency functions the others cannot |

### The Level 4 move: subsidise EARB registration for top scouts

40,000+ unregistered agents face an EARB that has declared unregistered practice unlawful,
and a pending bill proposing to raise the maximum penalty to **KSh 1,000,000** and bar
unregistered agents from being paid at all. They are standing in front of a wall.

**Be the ladder.** Becoming the formalisation pathway for Kenya's informal agent economy
converts the regulator from a risk into an ally, gives the ambitious broker a career instead
of a dead end, and creates a moat built on relationships and sunk goodwill rather than code.

Brokers who still refuse are the ones running actual fraud. Exclude them, and let the
tenant-side reporting in §8 do the enforcement.

---

## 5. Who Presses "TAKEN"? — Five Layers

This single question killed every platform in the research report's graveyard (§8). One
mechanism is insufficient. Five cheap ones compound.

**1. Decay by default.** A listing dies in ~7 days unless actively re-confirmed.
**Inaction now produces truth instead of lies**, and lying becomes recurring work. Most
listing rot is apathy, not malice — this makes apathy work for us.

**2. Pay more for "taken" than for "still vacant."** KSh 30 vs KSh 150. Counterintuitive
until stated plainly: *"taken" is the scarcer and more valuable signal, and nobody has ever
been paid for it anywhere.*

**3. Make the payday the honest moment.** The let bonus (KSh 1,000–2,000 — the largest
single payment in the system) is released **only when the unit is marked taken.** The
maximum reward is collected by telling the truth. This rule does more work than all policing
combined.

**4. The incoming tenant closes it.** The new tenant earns points for "I moved in here on
the 1st", which auto-closes the listing — a path entirely independent of the caretaker.

**5. Public accuracy score.** *"Mwangi — 97% accurate, 143 confirmations, 4 estates."*
Visible to every landlord who might hire him. Accuracy becomes his CV.

### Design principle emerging from layers 3–5
**No single person may ever be the sole source of truth about a building.** Redundancy here
is not merely reliability — it is **anti-corruption.** A monopoly on information is the thing
being dismantled; do not accidentally re-grant a small one.

### The engine, assembled
Outgoing tenant gives notice → app pings the caretaker → caretaker verifies and is paid →
**listing goes live ~30 days before the unit is empty.**

Everyone is paid, truth is produced a month early, and the landlord's void shrinks — which
funds the entire system.

---

## 6. Non-Monetary Incentives

Caretakers are routinely treated as nobodies by tenants and landlords alike. **Dignity is
the most underpriced incentive in this market.**

- **Laminated ID card and branded shirt.** Near-zero cost. Confers visible standing in his
  mtaa, *and* gives tenants an instant way to distinguish a real caretaker from a man with a
  master key and counterfeit keys to sell (research report §2.3).
- **Public profile:** accuracy score, verified lets, estates covered, tenant reviews.
- **Tenant thank-you notes, publicly visible.** The honest caretaker is currently invisible.
- **Ward-level leaderboards** — the repo already carries
  `Kenya_counties_subcounties_constituencies_wards.json` for the geography.
- **A title with meaning.** "Verified Property Operator" costs nothing and reframes him from
  a man who opens doors for a tip into the person who keeps the landlord's records
  tribunal-proof.

**The strategic reframe: turn the gatekeeper into the operations person.** A hustle becomes
a job.

---

## 7. Anti-Gaming

Any points-for-cash system in this market will be probed within a week. Assume adversarial
use from day one.

| Attack | Defence |
|---|---|
| **Fake vacancies** to farm scoop payments | Escrow the payment until an independent second party confirms **and** the unit eventually resolves (taken or withdrawn) |
| **Collusion rings** (caretaker + fake tenant confirming each other) | Graph detection: repeat confirming pairs, shared devices, shared M-Pesa numbers, geographically impossible sequences. Plus random audits. |
| **Status-check spam** (tapping without checking) | Pay on **retrospective accuracy**: claim vacant, next visitor finds it taken → accuracy score drops, and earning rate is gated on that score |
| **Stolen or recycled photos** | In-app camera only, no gallery upload. Geotagged + timestamped. Reverse-image check against existing listings. |
| **Charging a viewing fee off-platform** | **One-tap post-viewing tenant report: "Were you asked for money?"** Plus mystery shoppers. Penalty is badge loss — which only bites if on-platform income exceeds the fee. That is the whole purpose of §3. |
| **Multi-accounting** | One payout identity: phone + national ID + M-Pesa registered name must match |

---

## 8. Risks

1. **Conflict with his employer.** A caretaker posting an unauthorised vacancy may be
   dismissed. **Mitigation: the building must be landlord-opted-in and the caretaker role
   landlord-confirmed before anything can be posted.** This simultaneously resolves photo
   and personal-data consent under the Data Protection Act 2019.

2. **Transaction costs eat micro-payments.** KSh 20 does not survive an M-Pesa fee.
   **Mitigation: accumulate points, pay out weekly at a ~KSh 500 threshold.** Open question:
   tax treatment of this income for the recipient — resolve before creating thousands of
   small side incomes.

3. **Paying for introductions can constitute unlicensed agency practice.** The viewing and
   let payments are the exposure. Intended clean structure: **the platform pays for
   verification work and data; the landlord pays his own caretaker the let bonus through the
   platform's payment rails.** The platform is software moving money, not an agent earning
   commission. **COUNSEL MUST CONFIRM THIS SPECIFIC POINT BEFORE BUILD** — see research
   report §9.1–9.2.

4. **Creating a new gatekeeper.** Addressed by the redundancy requirement in §5, but
   requires permanent monitoring. If one person is ever the only one able to confirm a
   building, the toll booth has been rebuilt with better UI.

5. **Physical retaliation.** A founder has already been threatened with legal action; some
   landlords have hired gangs over arrears. A caretaker who refuses the fee economy or
   reports a fraudster may face real-world consequences. **Never expose who flagged whom.
   Never name individuals publicly. Anonymous reporting throughout.**

6. **Expect early legal intimidation.** Counsel on retainer before launch; the platform's
   role documented in writing from day one.

---

## 9. Validation Plan

The entire design rests on an unknown: **what a caretaker actually earns.**

### Phase 1 — 15 caretaker interviews
Across three estate types: high-density (Pipeline, Zimmerman), satellite (Ruiru, Juja),
mid-high (Kilimani-adjacent). Full instrument: `CARETAKER_FIELD_SURVEY.md`.

The decisive questions:
- Salary, and who pays it
- Whether viewing fees are taken, how much, how often, **and whether the landlord knows**
- Units controlled; whether neighbouring caretakers are known
- Smartphone and data reality
- **Willingness to accept KSh X per confirmation** (test 20 / 50 / 100 / 150 — find the
  real floor)
- **The amount per month that would make him stop taking viewing money entirely** — the
  single most important number in the research

### Phase 2 — one ward, 90 days
20–30 buildings, ~10 caretakers.

### The only metric that matters

> **UNIT-STATUS ACCURACY:** of the units shown as vacant, what percentage are actually
> vacant when somebody arrives?

Listings, users, downloads and GMV are vanity at this stage.

- **Above ~90%** → something that has never existed in Kenya
- **Below ~70%** → another entry in the research report's graveyard

---

## 10. Open Questions Blocking Build

| # | Question | Blocks |
|---|---|---|
| 1 | Caretaker salary and viewing-fee income | **All of §3** — the entire payment schedule is guesswork without it |
| 2 | The conversion price (what makes him stop charging) | Unit economics and CAC |
| 3 | Smartphone/data penetration among caretakers specifically | Whether the client is an app, USSD, or WhatsApp bot |
| 4 | Landlord vacancy cost and current advertising spend | The subscription pitch in §3.2 |
| 5 | Counsel opinion on let-bonus structure vs Estate Agents Act | Legal viability of §3.1 |
| 6 | Tax treatment of micro-payments to individuals | Payout architecture |
