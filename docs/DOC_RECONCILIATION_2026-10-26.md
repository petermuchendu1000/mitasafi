# Documentation Reconciliation — 26 October 2026

**Purpose:** consolidate the two parallel research tracks that were developed on separate branches,
and list every place where the documents disagree, supersede each other, or state incompatible
facts. This document decides nothing strategic. It makes the disagreements visible so they can be
decided once.

**Corpus:** 20 documents, 9,481 lines, from two branches that both forked from `d5c010c` and never
saw each other.

| Track | Branch (now merged) | Date | Docs | Lines |
|---|---|---|---|---|
| **A — Strategy & voices** | `claude/vigilant-tesla-tmvkpc` | 19 Oct 2026 | 16 | 7,134 |
| **B — Social research, incentives & architecture** | `claude/happy-volta-29fna2` | 22 Oct 2026 | 4 | 2,347 |

**Verified:** the two tracks share no history and cite each other zero times. Every "graveyard"
reference inside Track B points at Track B's own §6/§8, not at Track A's `agent-02-graveyard.md`.
Track B was written three days after Track A and does not appear to have had it in context.

---

## 1. How to read this corpus — the supersession chain

Several documents have already been overruled by later ones in the same track. This was recorded
inconsistently, so the corpus reads as contradictory when it is partly just sequential. Read in this
order; later overrides earlier **within Track A**.

```
00-first-principles ──► 01-community-model ──► agent-01..05 ──► 02-what-the-agents-found
      ──► 03-price-decision ──► voices-01..05 ──► 04-what-is-actually-being-sold
      ──► 05-final-synthesis            [Track A ends here]

HOUSE_HUNTING_SOCIAL_RESEARCH_KENYA ──► CARETAKER_AGENT_INCENTIVE_DESIGN
      ──► CARETAKER_FIELD_SURVEY ──► VACANCY_VERIFICATION_ARCHITECTURE   [Track B, independent]
```

### Already settled by supersession — do not re-litigate

| # | Superseded position | Now | Where |
|---|---|---|---|
| S1 | "Walk the estate yourself, photograph every sign" | Residents check their own building | `00` Part 5 → `01` (noted in `00`'s own header) |
| S2 | 6–12 hour contributor head start — *"the single best idea in this document"* | **Dead.** Worth ~3.3% of face value when issued, cannot be stored, is time-shaped and therefore resellable — and only agents have the phones and hours to farm it | `00` q39 → `02` #5, `agent-03` Q4, `agent-01` §3 |
| S3 | Public "block rep" title per building | **Dead.** No discretion anyone wants, reads as nyumba kumi, differentially dangerous for women. *Publish the building, never the person beside it* | `01` Part 7 → `02` #2, `agent-04` §3 |
| S4 | Three residency questions (floors, gate colour, borehole, caretaker's initial) | **Dead** — all street-level knowledge, and the caretaker is usually in the building's WhatsApp group, often as admin. Replace with facts only someone inside knows (this month's water arrangement, the number painted on the meter) and never display the answers | `01` Part 5 → `02` #6, `agent-01` defence #2 |
| S5 | "Never build a record linking a person to a building" | **Openly reversed**, with containment: handle + first name only, never a unit number, resident never shown to a seeker, claiming kept separate from searching by design | `00` q82 → `01` Part 10 |
| S6 | "The idea is crowded — eight live Kenyan products are already doing this" | **Reversed on evidence.** They have websites, not users: BuyRentKenya has no app at all, the entire Kenyan rental category on iOS has two user ratings in total. *A graveyard of landing pages* | `agent-05` §1 → `05` |

**Note on S6:** Track B's competitive landscape (§6) does not contain the app-store evidence that
produced this reversal. Track A's `voices-05` is the only place it exists.

---

## 2. The central disagreement: is the caretaker the source, or the adversary?

This is the one that matters. Everything in Track B is built on one answer; Track A's final document
gives the other.

**Position 1 — the caretaker is the source.** Held by four of Track A's five agents independently,
then by two Track A synthesis documents, then by all of Track B.

- `agent-02` (graveyard), conclusion 8: *"the evidence says it should pay caretakers a small
  per-confirmed-vacancy fee rather than ask tenants to volunteer — and then it is no longer free,
  which is the honest finding."* QuintoAndar's CTO credits a **doorman** referral programme with
  kick-starting inventory; Mamikos hires inspectors; nobody in the study survived on crowdsourcing
  (Waze's contributor rate was 0.18%, on passive data).
- `agent-03` (economics): the resident's expected value is **negative** — they risk KSh 10,000–20,000
  of hostage deposit to deliver ~KSh 9,000 of value to the landlord. So the resident rationally says
  nothing, and someone else must be the source.
- `agent-05` (contrarian): one caretaker per twenty units versus twenty tenants per twenty units — a
  20× cheaper target.
- `02-what-the-agents-found`: *"Four methods, one answer: the caretaker… He is the source. Residents
  are the referees, not the source. And if he is not a declared party with something to gain, he is
  the assassin."*
- `03-price-decision`: *"the caretaker becomes the preferred price source… one more reason to recruit
  him openly rather than route around him."*
- `04-what-is-actually-being-sold`: the product **is** the caretaker's phone number.
- **Track B in full:** `HOUSE_HUNTING_SOCIAL_RESEARCH_KENYA` §3.6 calls caretakers *"the
  highest-value data source in the country"*; `CARETAKER_AGENT_INCENTIVE_DESIGN` is a complete
  payment schedule and five-level ladder built on him; `VACANCY_VERIFICATION_ARCHITECTURE` gives the
  landlord-confirmed caretaker standing **0.90**, second only to the landlord himself.

**Position 2 — the supply side cannot be a source at all.** Held by one document: `05-final-synthesis`,
the last commit on Track A, under the heading *"What is dead: getting the data from the supply side"*.

- The caretaker defrauds the landlord too: a Wazua landlord — *"They lie to you that the rooms are
  vacant, yet someone is paying them a lower figure directly"*; a Kenyatalk poster describes a
  caretaker *"eating rent for 3 months"* while reporting the unit empty. Therefore **"the landlord
  cannot tell you what is vacant in his own building."**
- A Kenyan corpse with the cause of death written on it: **KejaHunt, 2013**, same KSh 5,000 market,
  pivoted away within ten months. The Standard's own words: *"Despite some caretakers' reluctance to
  offering information on vacant houses…"*
- It explicitly **retracts** `04`: *"I told you the product was the caretaker's phone number. The pin
  and the date survive. The number does not."*
- Its alternative: crowdsource from **demand**, copying two norms already live in WhatsApp groups —
  post the house you are vacating, and post the house you viewed and rejected. *Listing supply
  scales with failed searches.*

### Three things you need to know before deciding this

1. **`05` overturned four of its own five agents.** It is a minority position within its own track,
   not a summary of it. That does not make it wrong — it cites evidence the agents did not have —
   but it should not be read as "what the research concluded".
2. **The evidence that overturned them came from a landlord forum.** Track A's Reddit access failed
   completely (403 everywhere, 11 mirrors, PullPush, Wayback — all blocked). `voices-04` substituted
   **Wazua**, and states the caveat plainly: *"Wazua is a landlord/investor forum. The voices are
   overwhelmingly people who own bedsitters… not people hunting for them."* So the proposition "the
   caretaker is a thief" rests on landlords talking about caretakers. That is relevant evidence about
   caretaker honesty toward **landlords**; it is weaker evidence about whether a caretaker would feed
   a list that sends him ready tenants.
3. **Both tracks agree the deciding fact is unknown, and prescribe opposite ways to get it.**
   - `02-what-the-agents-found` + `04`: ask five caretakers *"If somewhere sent you tenants who
     already knew the price and were ready to view, would you tell it when a unit goes empty?"* Two
     hours. *"Do not start building either until that conversation has happened."*
   - `05`: that fee question is **contaminated**; ask about **access** instead — *"Who decides who
     gets to walk in and see a vacant unit?"* — and open the Google Maps review corpus first
     (~2,200 real tenant reviews across Nairobi buildings; Places API returns 5 per place free).
   - Track B's `CARETAKER_FIELD_SURVEY` asks about fees **directly** (Section E, and G9: the amount
     per month that would make him stop taking viewing money), across 15 interviews.

> **Needs your decision.** Which question gets asked, and does Track B's 15-interview survey run as
> written, or get rewritten around access per `05`?

---

## 3. Conflict register

Each entry states what each side says, why it matters, and what settles it.

### C1 — Who funds the system? `[OPEN]`

- **`agent-03` §6** ranks seven candidate payers. **Landlords rank 5th of 7**, with the verdict:
  *"Yes, fatally. A paying landlord buys placement, and placement kills the accuracy claim; also
  raises EARB exposure. Only as a flat, published, listed-accurately-and-nothing-else fee. Still
  risky."* Its top picks are **ISPs** (KSh 1,500–3,000 per connected home, cannot affect which
  listing a seeker sees) and **aggregate rent data** sold to researchers and lenders.
- **`CARETAKER_AGENT_INCENTIVE_DESIGN` §3.2** makes the landlord subscription (**KSh 50–100 per unit
  per month**) the single funding source for the entire caretaker payment schedule.

**Why it matters:** this is the business model, and every reward number in Track B is denominated in
it. Track B's version is a flat per-unit fee rather than paid placement, which is the narrow form
`agent-03` grudgingly allows — but its objections (placement pressure, EARB exposure) are not
addressed anywhere in Track B.

### C2 — Does the platform ever touch money? `[OPEN — reverses a stated permanent promise]`

- **`00` q55:** *"No escrow, no deposits, no fees… A platform that never touches money cannot be used
  for a payment scam. Make 'we never touch your money' a permanent rule."* Repeated in `01` Part 9
  (*"the strongest defence is still the simplest"*), `02` ("what survives" #4), and Track B's own
  research report §9.2 (*do not hold client money*).
- **Track B** has `observation_rewards` escrow, weekly batched M-Pesa payouts at a KSh 500 threshold,
  and §3.1: *"the landlord pays his own caretaker the let bonus through the platform's payment
  rails."*

Track B flags this itself as risk #3 and says **counsel must confirm before build**. It is still a
reversal of a promise three earlier documents describe as permanent and as the main fraud shield.

### C3 — Public observer reputation, or structural anonymity? `[OPEN — and Track B contradicts itself]`

- **Against naming:** `agent-03` Q5 — *"The fix is not a better reward. It is unattributability…
  A reward large enough to compensate a resident for caretaker risk would have to exceed their
  deposit."* `agent-04` — *"Publish the building, not the resident's name beside it,"* and it is
  differentially dangerous for women. `agent-01` §6 — *"Pseudonymity is fake at n=40"*: the caretaker
  narrows "someone in this building is reporting" to two or three people within a day. `01` Part 10 —
  resident never shown to a seeker.
- **For naming:** `CARETAKER_AGENT_INCENTIVE_DESIGN` §5 layer 5 — *"Public accuracy score. 'Mwangi —
  97% accurate, 143 confirmations, 4 estates.' Visible to every landlord who might hire him.
  Accuracy becomes his CV."* Plus §6 public profile, ward-level leaderboards, and
  `observer_stats.taken_signals_given` commented *"surfaced publicly: honesty is a badge."*
- **Track B's own architecture disagrees with its sibling:** `VACANCY_VERIFICATION_ARCHITECTURE` §12
  shows tenants the confirmer's **tier only, never the identity**, and
  `building_participation.landlord_sees_observer_identity` defaults to **FALSE**, commented *"If a
  caretaker takes viewing fees without the landlord knowing, exposing who reported what can cost him
  his job."*

**Why it matters:** `05`'s own risk #5 and the survey's decision rule both say that if interviews show
real fear of retaliation, anonymity is *"not a nice-to-have, it is a launch blocker."* The two Track B
documents currently specify opposite things.

### C4 — Price publication: resolved in principle, unimplemented in the schema `[PARTIALLY RESOLVED]`

This one is already settled and the settlement is good — it just has not reached the DDL.

- `agent-03` and `agent-04` both said do not publish prices. `agent-03` cites **Danish ready-mixed
  concrete, 1993**: a competition authority published firm-level transaction prices to help buyers
  and prices rose **15–20% in a year**. Its arithmetic: the entire tenant benefit is ~KSh 292/month,
  and **a 4% rent rise cancels all of it.**
- **`03-price-decision` (marked "Decided by the founder. Not open.")** resolves it correctly by
  splitting the field: *"Publish asking prices freely. Never publish what a sitting tenant pays, per
  unit."* The asking price is naturally unattributable — the caretaker quotes it to every caller.
  Plus: bands before exact figures, never show how many people confirmed a price, always publish the
  all-in cost.
- **`02`** adds the access shape: *"The seeker sees many prices; the landlord sees one… Query by need,
  never browse by table. Never ship a live, sortable, per-building rent table."*

**The gap:** `VACANCY_VERIFICATION_ARCHITECTURE` stores `claimed_rent` on observations and subjects,
but `vacancy_states` — the only table the public may read — **has no price column at all**, and
nothing in the RLS implements "query by need, never browse by table." The decision exists; the schema
does not carry it.

**Related, unresolved:** `agent-05`'s recommended product is **the Kenyan Rent Report** — a published
all-in price index by estate and unit type. That is close to the artefact `agent-03` says must never
ship. `02` proposes the compromise (coarse quarterly distributions, published in arrears) and calls
it out as *"the direct conflict between two of the agents."* Nobody has signed off on the compromise.

### C5 — Tenant screening: the largest white space, or the thing to refuse? `[OPEN]`

- **`00` q71:** *"Should you build tenant profiles? **No.** Collecting ID, income, employer and
  payslips turns the power against the person you are serving… Refuse this even when landlords ask.
  **Especially** when landlords ask."*
- **Track B research report §3.2:** *"There is no tenant screening infrastructure in Kenya — at all…
  **This is the largest white space identified.**"* And `CARETAKER_AGENT_INCENTIVE_DESIGN` §3.2 sells
  landlords *"rent records and notice trails that survive a tribunal"* as the subscription's
  standalone justification.
- Both tracks **do** agree on the hard limit: no tenant blacklist / defaulters register
  (`VACANCY_VERIFICATION_ARCHITECTURE` §13, research report §9.4).

**Why it matters:** "tribunal-proof rent records for the landlord" and "a tenant payment history
nobody can use against the tenant" are a few product decisions apart. The line needs drawing before
the landlord subscription is specified, because it is what the landlord is being sold.

### C6 — Which phone number gets published? `[THREE POSITIONS, ALL RETRACTED OR UNIMPLEMENTED]`

| Doc | Position |
|---|---|
| `00` q23/q52, `01` Part 9 | The number **as written on the sign**, visible in the photo. *"This one decision removes the money-making basis of fraud types 1, 2 and 3."* |
| `04` | **Wrong** — *"The number on the sign is usually the agent's."* Publish the **caretaker's**. Publishing the sign's number makes you a free lead funnel into the agent's viewing fee — the attack `agent-01` ranked #1 |
| `05` | Retracts `04`. *"The pin and the date survive. The number does not."* |
| Track B | Publishes neither — the caretaker is an authenticated observer, not a displayed contact. But then **no contact route to the house is specified anywhere** |

**Needs your decision.** `agent-01` §2 is unanswered either way: the platform *"displays a number no
human has vouched for, with nobody accountable anywhere in the chain."*

### C7 — What is the product? `[FOUR DEFINITIONS LIVE]`

1. A fresh vacancy list with decay — `00`, `01`, and all of Track B.
2. **The pin and the number, free, with a date on it** — `04`.
3. **An index over the conversation already happening in WhatsApp groups and comment sections**,
   where *"the date is the product"* — `05`.
4. **The Kenyan Rent Report** — own the all-in price truth at the bottom of the market; listings fall
   out as a by-product — `agent-05`.

All four agree **the date/freshness is the differentiator**. They disagree on what the object is.

### C8 — Field work: ruled out, or required? `[OPEN]`

- `01` Part 0 opens: *"Written after the founder said: I don't want to do it myself."* Part 11 lists
  what stays yours and states: *"What you never do: walk estates, photograph signs, phone landlords,
  check houses, chase listings."*
- `agent-05` §2 calls this a **disqualification**, not a constraint: coverage is estate-shaped, the
  available channel is city-shaped, *"they do not fit."*
- `02`'s fork offers **A** (a standing relationship with 5–10 caretakers in **one** estate — days,
  not months) or **B** (build the voice, no field work).
- **Track B is fork A**, scaled up: 15 caretaker interviews plus a 90-day pilot over one ward,
  ~25 buildings, ~10 caretakers.

So Track B picked the fork — the fork that `05`, three days later, declared closed.

---

## 4. Red-team defences missing from the Track B design

`agent-01` ranked ten attacks and proposed three defences. Verified against both Track B documents:

| Defence | Status in Track B |
|---|---|
| **1. Verify the number, not the paper.** SMS/voice challenge to the listing's number; a building "phone number of record" confirmed by independent residents; auto-flag any listing with a different contact | **Absent.** Zero mentions |
| **2. Make the caretaker a declared party, not a surprised enemy** | **Implemented well** — `building_participation` (landlord opt-in gate), `building_observers.confirmed_by_landlord`, and participation `'none'` still permits observation but never publication |
| **3. Delete the contributor delay; instrument suppression** | Delay: **gone** (never appears in Track B). Suppression: **absent** |
| Cheapest insurance: ODPC controller registration + one-click number-removal page | **Absent.** Track B has a 90-day purge of lat/long, device fingerprint and IP hash, which is good, but no ODPC registration and no removal route |

**The suppression gap is the serious one.** `agent-01` §1: *"The 7-day decay means they need not flag
anything. Withhold confirmations for ten days and the estate goes dark by itself — to seekers the
product looks dead, to the founder it looks like churn. Suppression is cheaper than forgery and
leaves no fingerprints."* Decay is the engine of the entire Track B architecture, which makes the
architecture maximally vulnerable to this, and it has no detection for it — no per-estate
confirmation-rate monitoring, no alert when an estate's confirmation rate halves week-on-week.

**Two further unpriced attacks with no Track B defence:**

- **The KRA move** (`agent-01` §5, ranked *"nastiest, unpriced"*): one sentence in landlord WhatsApp
  groups — *"this app is how KRA finds you"* — and landlords order caretakers to pull signs. Track B
  builds exactly the building-level register of rental stock that KRA's block-mapping targets, and
  residential rental compliance sits at 18% with draft 2026 regulations proposing mandatory eRITS
  registration. It attacks supply, and *"it is close enough to true to be unanswerable."*
- **The in-app geotagged photo** gets proximity factor **1.00** — the maximum — in Track B's trust
  model. `agent-01` §2 and `02` #3 both declare that signal dead: print an A4 sheet reading "HOUSE TO
  LET — 07xx", tape it to the gate, photograph it in-app, take it down. Camera capture, geotag and
  timestamp all pass honestly. **Cost: KSh 50 and ten minutes**, against KSh 8,000–60,000 per victim.

---

## 5. Factual inconsistencies between documents

These are checkable and should be fixed in whichever document is wrong.

| # | Claim | Track B says | Track A says | Note |
|---|---|---|---|---|
| F1 | **Hauzisha** | §8: *"Hauzisha paying scouts to report vacant units. Crowdsourced verification works here already"* — cited as live Kenyan precedent | `agent-02`: *"Alive, but quit rentals entirely."* Own words: *"We chose to do one thing well… That focus is hard to deliver across a large, fast-moving rental market"* | **RESOLVED 26 Oct 2026 — Track A was right, Track B was wrong and has been corrected.** See §5.1 below |
| F2 | **Caretaker income** | *"His salary is unknown — this is the critical gap."* Structurally: modest wage + free housing + ~KSh 5,000–10,000 of viewing fees. Offer: ~KSh 5,000–8,000/month for 3–4 plots | `agent-05`: Glassdoor Nairobi caretaker average **≈ KSh 28,000/month**, plus informal commissions — *"early access to a list does not compete with that"* | Glassdoor is weak evidence for informal Nairobi caretakers and probably skews to formal property management. But a figure exists in the corpus, it is 3–5× Track B's offer, and Track B does not engage it |
| F3 | **The "precedent" group size** | §5: WhatsApp community *"reportedly reached ~21,000 members… figure not independently verified"* | `agent-05`: largest named Kenyan rental Facebook group **23,943**. `voices-01`: the only citable counts are **284,571** and **81,290** from Kenyans.co.ke, **May 2019 — seven and a half years old**. `agent-02`: "Keja Hunters" WhatsApp group — **54 members** | Four numbers, different objects (a WhatsApp community, a Facebook group, a 2019 listicle, one group), used interchangeably as "the precedent." `voices-01` is blunt: *"The founder's distribution plan — post in large Kenyan Facebook groups — could not be verified in any respect"* |
| F4 | **BuyRentKenya sale** | §10 gap 8: acquisition date unknown, needs desk research | `agent-01`: **November 2025** (TechTrends). `agent-05`: **December 2025** (Tracxn) | Two dates in Track A, unknown in Track B. Trivial to settle |
| F5 | **Void arbitrage** | 20-unit plot, 30% turnover = 6 moves/yr, void 1 month → 1 week = **~KSh 45,000/yr saved** | `agent-03` Q6: 8 turnovers/yr, void 6 → 2 weeks = **KSh 73,900/yr** (3.1% of gross, inside UK guidance of 3–5%) | Different turnover and void assumptions. Both state there is **no Kenyan evidence on void length at this rent level**. The survey (C7) decides it, and Track B's own rule says a void under 10 days *"weakens the pitch badly"* |
| F6 | **Tenancy length** | 30% annual turnover implied | `agent-03` A6: 30-month tenancies (= 40%/yr), while citing a 2025 report that many Kenyan renters stay **3–8 years** (= 12–33%/yr) | Inconsistent inside Track A, and it moves every number in the economics report |

### 5.1 F1 settled — the verification record

Checked against primary sources on 26 October 2026. **Track A's `agent-02` was correct. Track B's
claim was wrong on both counts**, and both places it appeared
(`HOUSE_HUNTING_SOCIAL_RESEARCH_KENYA.md` §6 and §8) have been corrected in place.

| Claim | Verdict | Evidence |
|---|---|---|
| Hauzisha is a live nationwide rent/sale marketplace | **False** | `hauzisha.co.ke/houses-for-rent` states *"Hauzisha no longer lists rentals"*; 326 units, all **for sale**. About page: *"sells verified houses and apartments… One thing, done properly: selling homes… We curate, we do not list everything."* |
| Hauzisha pays scouts to report vacant units | **No evidence found** | Nothing on its own pages, and a targeted search surfaced none. The surviving `rentals.hauzisha.co.ke` is landlord software — *"Built for Kenyan landlords and water providers… All houses in one dashboard — occupied, vacant, who's paid"* — a management dashboard, not a scout network |
| Hauzisha runs a Teachable course paying people to find vacant units | **Unsubstantiated** | Searched; nothing found. Not disproved, but it should not be relied on |
| A crowdsourced-scout model already exists in Kenya | **True, but it is not Hauzisha and it is tenant-funded** | **HouseHunt Kenya**: *"A trained property scout is then allocated and dispatched to physically search and vet properties on your behalf"*, priced at *"the Ksh 2,500 Standard Plan or Ksh 4,599 Priority Premium Bundle"* — **the tenant pays** |

**One nuance on Track A's wording.** *"Quit rentals entirely"* is very slightly overstated: Hauzisha
exited the rental **marketplace** but kept a landlord-facing rentals dashboard. The substance of
`agent-02`'s finding — that it retreated from the mass rental listings market — holds, so that
document is left as written. Dated research artefacts are not edited here; corrections go into the
document carrying the error, and the verified record lives in this section.

#### Why this one mattered

It was not a footnote. §8 used it to conclude *"Crowdsourced verification works here already. The
unsolved gap is a structured incentive to mark a unit TAKEN."* With the claim removed:

- **There is no verified Kenyan precedent for platform-funded crowdsourced vacancy verification.**
  The only working local precedent is unpaid peer altruism in WhatsApp groups.
- **The one Kenyan paid-scout operation charges the tenant** — KSh 2,500–4,599 — which is the exact
  pattern the research report's §2.1 and §9.3 and the incentive design's **ABSOLUTE RULE** all
  forbid. So the nearest local analogue to the paid-observer model is something the design has
  already ruled out on principle.
- **Hauzisha moves from the "precedent" column to the graveyard column**, joining KejaHunt as a
  second Kenyan platform that reached this market and withdrew from it. Both tracks now point the
  same way on that.
- The paid-observer layer in `CARETAKER_AGENT_INCENTIVE_DESIGN` and `VACANCY_VERIFICATION_ARCHITECTURE`
  should therefore be treated as **unprecedented in this market**, not as an extension of something
  already proven to work locally. It does not make the design wrong; it removes its local support and
  raises what the 15-interview survey has to establish.

---

## 6. Where both tracks agree — settled, stop re-opening

Reached independently by two tracks that never read each other. Treat as the stable core.

- **Decay is the engine.** A vacancy claim dies unless re-confirmed; ~7 days baseline for `vacant`
  (Track B refines it to `clamp(30 / monthly_moveouts, 3, 14)`), and occupancy is durable (60 days).
- **Silence must never produce "available."** Expiry resolves to `unknown`, never `vacant`. Track B
  states it as a hard rule: *"there is no code path anywhere in this system that lets silence produce
  'available'."*
- **The tenant is never charged anything, ever.** No viewing fee, no holding fee, no subscription.
  Every shilling originates from the platform or the landlord.
- **Freshness is the product, shown verbatim.** *"Confirmed 3 hours ago by the caretaker."* Nobody in
  Kenya does this.
- **"Taken" must be frictionless and worth more than "vacant."** Track B prices it: KSh 100–150 vs
  20–50, and releases the largest payment in the system (the let bonus) only when the unit is marked
  taken.
- **The two errors do not cost the same.** A false "vacant" burns fare and half a day; a false
  "taken" costs one listing the next observation re-opens. Hence asymmetric publication thresholds.
- **The building, not the listing, is the unit.** All five Track A agents kept it; Track B implements
  it as `vacancy_subjects`.
- **No tenant blacklist or defaulters register.** Defamation plus Data Protection Act exposure, and
  it is the feature landlords will ask for most.
- **The outgoing and incoming tenant are near-authoritative about their own unit** — the only people
  with no incentive to lie about it. Track B gives both standing **0.95**.
- **Expect legal intimidation early.** A founder has already been threatened with a lawsuit. Counsel
  on retainer before launch; never name who flagged whom.
- **One north-star metric:** of units shown as vacant, what share are actually vacant when somebody
  arrives. **Above ~90% is unprecedented in Kenya; below ~70% is another line in the graveyard.**
- **Never say "verified" when you mean "recently confirmed."**

---

## 7. Open items both tracks flag identically

Neither track can proceed past these, and they agree on the list:

1. **Caretaker economics** — ranked #1 unknown by both. Track B's entire payment schedule is
   guesswork without it.
2. **Landlord void cost and current advertising spend** — the subscription pitch rests on it; Track B
   §3.3 records *"no sourced figures found."*
3. **Smartphone vs feature phone among caretakers specifically** — decides app vs USSD vs WhatsApp
   bot, and whether geotagged photo evidence is realistic at all.
4. **Counsel on the let-bonus structure against the Estate Agents Act** (Cap 533).
5. **Tax treatment of thousands of small payments to individuals.**
6. **Facebook is a black box.** One logged-in account and two hours fixes it.
7. **The Google Maps review corpus is unopened** — ~2,200 real tenant reviews across Nairobi
   buildings (Tumaini Estate, Pipeline: 744 reviews alone), place IDs already saved. `05` calls it
   *"the cheapest unexploited research anywhere."*
8. **Kenyatalk's nine on-brief threads were read second-hand only** (Cloudflare). `voices-04`:
   *"Re-run Kenyatalk from a real browser. It is the Kenyan equivalent of what the brief hoped Reddit
   would be."*

---

## 8. Two things no document addresses

### 8.1 The implemented product is not the product these documents describe

**None of the 20 documents mentions the services marketplace** — verified, zero matches for "service
provider", "services marketplace", "plumber" or "provider dashboard" across all of `docs/strategy/`,
`docs/research/` and the four Track B documents.

Yet that marketplace is what is actually built. The March 2026 audit
(`SERVICES_ECOSYSTEM_ANALYSIS_AND_MILESTONES.md`) counts **~125 files and ~36,800 lines** of
provider-and-customer services code — bookings, quotes, M-Pesa, reviews, a 25-state booking lifecycle
— with migrations running to 11 March 2026. The repo also carries a rental-listings side
(`listings`, `properties`, `buildings`, `units`) and 72 other documents describing it.

`package.json` describes the project as *"Kenya's trusted rental platform connecting tenants with
verified homes and honest landlords"* — which matches the October documents, not the largest body of
code in the repository.

> **Needs your decision, and it is prior to everything else here.** Is the vacancy-verification work
> a new direction that replaces the services marketplace, a second product alongside it, or a layer
> on the rental-listings half? Nothing in the October corpus says, and the answer changes whether the
> Track B schema is a new spine or an extension.

### 8.2 The architecture's own blocking item, answered

Track B's `VACANCY_VERIFICATION_ARCHITECTURE` open item #4: *"this design uses `TEXT … CHECK` rather
than Postgres enums… The repo uses both patterns; confirm before landing."*

Checked. Both patterns are in use:

- **Postgres enums:** `20260108120000_core_enums_and_types.sql` defines eight — `booking_flow_type`,
  `verification_level`, `verification_status`, `pricing_type`, `pricing_component_type`,
  `booking_status`, `damage_risk_level`, `property_type`.
- **`TEXT … CHECK`:** `units.status` at `supabase/migrations/20260101000003_property_management.sql:196`,
  and the pattern dominates the later migrations.

`docs/ENUM_FINALITY_REVIEW.md` (9 Jan) is the relevant precedent and it documents the cost of the
enum choice — it had to run a pre-seeding freeze audit, and `verification_level` is still marked
"⚠️ NEEDS REVIEW / completeness questionable" because values could not be added cheaply later.

**My read:** `TEXT … CHECK` is the right call for `claim`, `published_status` and `resolution_status`,
exactly as the architecture already instinctively chose — these vocabularies are explicitly expected
to grow, and the repo's own enum-freeze experience is the argument against `ALTER TYPE`. Use enums
only where a vocabulary is architectural and frozen, as `booking_flow_type` is.

### 8.3 One schema gap found while checking

`VACANCY_VERIFICATION_ARCHITECTURE` §7.3 enables RLS on `vacancy_subjects` but defines **no SELECT
policy for it**. With RLS on and no policy, no role can read the table. Meanwhile `vacancy_states` —
the only table the public is granted SELECT on — holds status, confidence and freshness but **no
identifying fields**: no area, no unit label, no unit type, no rent. As written, a tenant can read
that *something* is vacant with 0.81 confidence, and cannot discover what or where it is. The subject
needs a public-readable projection, gated on the same `building_participation` check.

---

## 9. What this document deliberately does not do

It decides nothing in §2 or §3. Those are strategy calls with real evidence on both sides, and the
corpus has already been through one cycle of a synthesis document quietly overruling its own agents
(see §2, note 1). The next reversal should be explicit and yours.

**The cheapest path through §2, on which both tracks agree:** the caretaker conversation. Two hours,
five people. `02-what-the-agents-found` ends with *"Do not start building either until that
conversation has happened,"* and `05` agrees it is decisive while disputing the question. Settling
which question to ask is a smaller decision than the one it unblocks.
