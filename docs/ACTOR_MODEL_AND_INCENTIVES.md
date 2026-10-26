# The Actor Model — Who Contributes What, and What They Get Instead of Money

**Date:** 26 October 2026
**Constraint:** near-zero cash. Maximum accuracy and freshness.
**Depends on:** the consolidated corpus (see `DOC_RECONCILIATION_2026-10-26.md` for the reading order
and the open conflicts)
**Status:** DESIGN. Testable at zero cost. The falsification conditions are in §10.

---

## 0. The argument in short

The zero-cash constraint is usually a weakness to be managed. Here it is mostly an advantage, and the
reason is behavioural rather than financial.

> **For every actor who is helping a peer, a small cash payment is worse than no payment at all.**
> For the one actor who currently *earns* from the information, cash is not the only currency we
> hold — we can pay him in qualified demand, which costs us nothing and is what he actually wants.

That gives three rules the whole design follows:

1. **Never price a neighbourly act.** KSh 20 for a status check is the worst available price point: too
   small to be income, large enough to convert *"I helped someone get a house"* into *"I did a job for
   twenty bob."* Once it is a transaction, the person computes the hourly rate and is insulted. This is
   motivation crowding-out — Titmuss on blood donors, Deci on extrinsic reward, and Gneezy &
   Rustichini's result that small payments produce *worse* performance than none. **Track B's
   `status_confirm` at KSh 20–50 sits exactly in the dead zone.**
2. **Pay the gatekeeper in the currency he is short of, not the one we are short of.** The caretaker's
   fee income exists because he shows roughly five houses to achieve one let. Send him seekers who
   already know the price and are ready to view, and you cut his labour per let. That is real value,
   delivered at zero marginal cost. The corpus already found this twice (`00` q17, q46: *"what he
   really wants is fewer time wasters and a faster let"*).
3. **Recognition is public exactly to the degree the actor's role is already public.** This is the rule
   that dissolves the anonymity conflict in §3 of the reconciliation doc. A caretaker, a boda rider and
   a shopkeeper are already outward-facing people who want to be known — public profile, ranking, card.
   A sitting tenant is exposed to the person who controls her water and her deposit — her recognition
   must reach her and nobody else.

**One consequence worth seeing early.** At zero budget you cannot buy supply; you can only harvest it
from demand you already have. So the sequence is forced: **demand first, then the gatekeeper.** That
happens to reconcile the corpus's central disagreement — `05-final-synthesis` is right about where to
start (crowdsource from demand), and Track B is right about where it ends up (the caretaker is the
best sensor). They were arguing about order, not about truth.

---

## 1. What "real-time" actually requires

Precision is not one problem. It is five events with very different clocks, and most of the corpus's
confusion comes from treating them as one.

| # | Event | Clock | Who physically knows first | Value |
|---|---|---|---|---|
| **E1** | **"This unit will be free on the 1st"** — notice given | **30–60 days of lead time.** The earliest signal that exists | The outgoing tenant, then the caretaker | **Highest. Nobody in Kenya collects it.** It is the only signal that lets a seeker and a unit be matched before either is under pressure |
| **E2** | **"It is free right now"** | Perishable. Half-life 3–14 days by building turnover | Caretaker, residents, anyone passing a sign | The core listing. Worthless at eight days old |
| **E3** | **"It is gone"** | Must be **instant and frictionless** | The caretaker, the landlord, the incoming tenant | **The scarcest signal in the market.** Nobody has ever been paid or thanked for it |
| **E4** | **"What it really costs, all in"** | Knowable once, at move-in | The person who just signed | Rent + water + garbage + service charge + deposit + goodwill. The sharpest finding in the whole corpus |
| **E5** | **"Someone asked me for money"** | At the viewing | The seeker who just travelled | The enforcement tripwire. One tap. It is what makes a badge worth keeping |

**Design consequence:** our freshness does not come from asking many people often. It comes from
catching **E1 from the person leaving** and **E3 from the person arriving** — two moments that
announce themselves, cost nothing to capture, and are produced by the system's own output. Everything
else is upkeep.

---

## 2. The master actor table

Twenty actors, grouped by what they structurally are. **"The exact ask"** is deliberately written as
the literal thing we request — if it cannot be done in under 30 seconds on a bad connection, it is
mis-specified.

### Layer A — Demand, which is free and self-renewing

| Actor | What only they know | The exact ask | Latency | Weight | Our cost |
|---|---|---|---|---|---|
| **Seeker under pressure** (30 days' notice) | Their own budget, estate set, deadline | Standing request: estate(s) + max price + type. **Several estates at once** — people think *"Kasarani ama Roysambu ama Githurai"* | — | — | 0 |
| **The rejector** — viewed it, said no | **The unit is real, empty today, and what it was quoted at.** Plus why they refused | *"Which house did you see and not take? Someone behind you needs it."* One screen: building, type, quoted all-in, still empty? | **Same day** | **High** — no ongoing relationship to protect, no deposit hostage | 0 |
| **The mover** — just signed | **E4 (true all-in cost)** and **E3 (this unit is now taken)** and **E5** | Three taps at move-in: *was it empty as described / what did you actually pay, all in / did anyone ask you for money?* | At move-in | **0.95 for their own unit** — the only person with no incentive to lie about it | 0 |
| **The newcomer to the city** | Nothing yet — most at risk of fraud | Nothing. **They are who we protect.** Scam-number lookup before they call | — | — | 0 |
| **The window shopper** | Price expectations across estates | Nothing. Do not design for them — they never change behaviour | — | — | 0 |

> **The engine.** The rejector and the mover are both produced *by the system working*. Every search
> that fails yields inventory; every search that succeeds yields ground truth. This is the one loop in
> the corpus that got **stronger** under adversarial review (`02` "what survives" #6), and it is free.
> It is also already a live Kenyan norm — *"if a house doesn't suit you, you post it for the next
> person"* — so we are not inventing a habit, we are giving an existing one reach.

### Layer B — Residents, who are referees and never the source

| Actor | What only they know | The exact ask | Latency | Weight | Our cost |
|---|---|---|---|---|---|
| **Outgoing tenant** | **E1 — the freshest fact in the market.** They gave notice this morning | *"Are you moving out? When is your last day?"* Date only. **Anonymous by default, never shows who is leaving** | **30–60 days early** | **0.95 for their own unit** | 0 |
| **Sitting resident / neighbour** | Whether 3B is still empty; whether someone moved in on Saturday; what the water and gate are really like | **One fact only: *"Iko bado?"* — is it still there. Yes / No / I don't know.** Never the price. Never their name | Minutes | 0.60, rising with record | 0 |
| **The building's WhatsApp group** | Everything, continuously | Nothing directly. It is the **distribution channel into the building**, not an actor. One pasteable line | — | — | 0 |

> **Hard limits, carried from the corpus.** The resident is asked for **existence and availability
> only**. Not the price — `agent-04` shows the price field detonates in two directions and both land on
> the person whose name is on the post. Not under a public title — Sheng has five words for informer
> and none for block rep. Not with their identity attached to a building in anything a seeker or a
> landlord can see. `agent-03` Q5 is blunt: *"The fix is not a better reward. It is
> unattributability."* No reward we can afford competes with a KSh 10,000–20,000 deposit held hostage
> by the man who controls the water.

### Layer C — The gatekeepers

| Actor | What only they know | The exact ask | Latency | Weight | Our cost |
|---|---|---|---|---|---|
| **Caretaker** (on-site) | **Six things nobody else holds together:** that a unit is free, that it exists, that it is *still* free, physical access, whether the landlord is real, and whether the water actually runs | *"Zilizo vacant leo?"* — one tap per unit, plus **E3 the moment it goes.** Via whatever he has: app, WhatsApp, USSD | **Minutes. The fastest sensor in the system** | **0.90 for his own building** once landlord-confirmed | **0 cash** — see §4 |
| **Landlord** (89.3% are individuals) | Authority, the void-month loss, who actually signed | Opt the building in. Confirm who his caretaker is. **E3 when he lets it** | Hours–days | **1.00 for his own unit** | 0 |
| **Informal broker / "mukora"** | **Breadth and mobility** across estates that a site-bound caretaker lacks | New vacancy scoops outside any building he is tied to | Hours | 0.25 — unverified, no building tie | 0 cash — paid in the ladder, §4 |
| **Registered agent (EARB)** | Legitimacy, portfolios, legal standing | Listings he wants filled; acts as legal cover | Hours | 0.95 in buildings he manages | 0 |

### Layer D — The ambient sensor layer (the corpus's most underused asset)

Track B reduced all of these to *"Connector… KSh 200–500 per scoop."* That is both a cost we cannot
carry and the wrong currency. Each of them wants something we generate for free.

| Actor | What only they know | The exact ask | Latency | Weight | Our cost |
|---|---|---|---|---|---|
| **Boda boda rider** | **Rides every lane of his estate every day and sees every sign and every gate.** Already organised into stages under a chairman — *one conversation reaches fifty riders* | Photo of a sign at a gate, with location. From the stage, in idle time | **Same day, estate-wide coverage** | 0.25 | **0 — he is paid in moving jobs, §4** |
| **Shopkeeper / duka / mama mboga** | **Who just moved in** (a new account opened) and which plot has a notice up. Credit relationships give them daily visibility | *"Anyone new on your street this week?"* | Days | 0.25 | 0 |
| **Water vendor / tanker driver** | **Occupancy, inferred from consumption.** An empty unit buys no water. Already described as operating in Pipeline and Kayole | Which plots have units standing empty | Days | 0.20 | 0 |
| **Salonist / barber / kiosk** | Neighbourhood churn gossip | Same as the shopkeeper | Days | 0.20 | 0 |

> **Why this layer matters for freshness.** The caretaker gives us depth in one building. The boda
> rider gives us **breadth across an estate in a single day**, which is exactly the coverage shape the
> product needs — `00` reason 1: having many houses in Kilimani helps a person in Githurai 45 exactly
> zero.

### Layer E — Governance, and the people who are not users

| Actor | Role | Specific contribution | Our cost |
|---|---|---|---|
| **Estate steward / area rep** | Settles disputes inside one estate, removes junk, recruits | Local knowledge spots a lie instantly — *"there is no such block on that road."* **Two per area, never one. Fixed terms. Every decision logged** | 0 |
| **Council** (operator + stewards) | Writes the rules, handles fraud cases | Nothing else. Deliberately narrow | 0 |
| **Operator (you)** | The thing nobody can delegate | Write the rules; post in groups for the first weeks; answer comments; keep the software alive. Then shrink the job on purpose | Time |
| **Group admins** | Control distribution | Content that makes their group look good, with credit. **They are a single point of failure** — `agent-01` ranks buying admins as the kill shot, so a second channel must exist before it is needed | 0 |
| **TikTok / YouTube creators** | Reach into the exact audience | Their comment sections are *already* the marketplace — 153 of 1,425 comments contained an availability word. We answer the question their comments ask | 0 |
| **Counsel** | Keeps us out of two kinds of trouble | Two conversations: the scam-number list, and the "we are not an estate agent" position | **Real cash. Unavoidable** |
| **EARB** | Regulator → ally | Registration pathway for brokers facing a proposed KSh 1m penalty. Converts the regulator from a risk into a moat | 0 |
| **ODPC** | Regulator | Controller registration + a one-click number-removal page kills the strongest legal attack against us | Small |

---

## 3. The signal-to-actor matrix

Who can deliver each event, ranked by speed × trust. Read down a column to see our redundancy; read
across a row to see what one actor is worth. **No single person may ever be the sole source for a
building** — that is not reliability, it is anti-corruption. A monopoly on information is the thing
being dismantled; do not re-grant a small one.

| | **E1** will be free | **E2** is free now | **E3** it's gone | **E4** true cost | **E5** asked for money |
|---|---|---|---|---|---|
| **Outgoing tenant** | ★★★ **0.95** | ★★ | — | ★ | — |
| **Caretaker** | ★★★ | ★★★ **0.90** | ★★★ | ★★ | — |
| **Landlord** | ★★ | ★★ | ★★★ **1.00** | ★★ | — |
| **Mover (just signed)** | — | — | ★★★ **0.95** | ★★★ **0.95** | ★★★ |
| **Rejector** | — | ★★★ | ★ | ★★★ | ★★★ |
| **Sitting resident** | ★★ | ★★★ | ★★ | ✖ **never asked** | — |
| **Boda rider** | — | ★★ breadth | ★ | — | — |
| **Shopkeeper / water vendor** | — | ★ | ★★ (move-in seen) | — | — |

**The two cheapest high-value plays fall straight out of this grid:**

- **E1 has exactly two sources and we are collecting from neither.** The outgoing tenant announces
  themselves by moving. Catch them and we hold inventory 30 days before anyone else can.
- **E3 is over-supplied with free, high-weight sources** (landlord 1.00, mover 0.95, caretaker 0.90)
  — the signal Track B proposed to *pay most for*, KSh 100–150, is the one we can get for nothing,
  because the mover reporting "I moved in here on the 1st" is doing it for themselves.

---

## 4. What each actor gets instead of money

The test applied to every row: **is this something they actually want, that costs us nothing because
it is a by-product of the system running?** Anything failing that test is charity or theatre.

| Actor | What they actually want | What we give — free | Psychological lever | Why it holds |
|---|---|---|---|---|
| **Rejector** | To not have wasted the trip for nothing | *"The next person will not make your trip."* The ask arrives at the moment of mild frustration, when turning a loss into usefulness is worth more than money | **Reciprocity + effort justification** | They were helped by this list minutes ago. Asking at the moment of received benefit is the highest-yield moment there is |
| **Mover** | To be congratulated; to not have been cheated | A **private** thank-you, then: *"Which ones did you see and not take?"* Plus a **deposit-return receipt** — their move-in photos and condition log, held for them | **Peak-end timing + reciprocity + endowment** | The happiest moment in the cycle is the one we ask at. The receipt is a real asset — it is the rental record Kenya has never had, and it accrues to *them* |
| **Outgoing tenant** | Their deposit back, no hassle, no landlord trouble | The deposit-return receipt, and **absolute invisibility** | **Loss aversion, pointed at their deposit** | They are not helping us; they are protecting KSh 10–20k of their own money and the date falls out as a by-product |
| **Sitting resident** | Not to be identified. A neighbour who is not trouble | A **private** message: *"Someone got a home from your answer."* Public credit as *"confirmed by 3 residents"*, never named. Plus the factual fields about their own building | **Identity + invisible recognition** | Their EV is negative if they are visible and mildly positive if they are not. Invisibility *is* the reward |
| **Caretaker** | Fewer time-wasters. A faster let. Respect. Job security | **Qualified demand** — seekers who know the price and are ready to view. **A portable public accuracy profile** that follows him to his next job. **Standing with his landlord** (shorter voids, visible competence). **A laminated card and a branded shirt** | **Costly signalling + dignity + competence (SDT) + status portability** | *"A good name is the one thing a caretaker can never build today."* The card also lets a tenant tell a real caretaker from a man selling counterfeit keys — a safety feature that doubles as a status good |
| **Boda rider** | A fare | **The moving job.** The person who shows you the house also moves your bed — we know exactly who just moved in and when | **Reciprocity with real economic value, at zero cost to us** | The best zero-cash exchange in the system. His reward is *generated by* the housing event he helped cause. A reflective vest at ~KSh 300 advertises for us while conferring visible standing |
| **Shopkeeper / water vendor** | Footfall; new customers | A **"new arrivals on your street"** signal — we know who just moved in and they need everything | **Reciprocity, commercially real** | Costs us nothing; worth actual money to them |
| **Landlord** | Occupancy; records; not being defrauded | **Shorter voids.** **Tribunal-proof rent and notice trails** — landlords are losing winnable cases for want of rent statements. **A verified caretaker** instead of one quietly running a side business | **Loss aversion on the void month** | The records pitch sells with no reference to marketing a vacancy. It is the only landlord value here that does not corrupt our data |
| **Informal broker** | Cash per interaction; a future | **The ladder**: Connector → Verified Resident → Scout → EARB-registered agent, with registration subsidised for the best. He faces a proposed KSh 1m penalty and a board that has declared his work unlawful | **Loss aversion + identity + a career where there was a dead end** | *Be the ladder.* Converts the regulator into an ally and builds a moat out of sunk goodwill rather than code |
| **Registered agent** | Deal flow; fewer time-wasters | Qualified leads; visible contrast with unregistered operators | **Status + scarcity** | 0 |
| **Estate steward** | Standing in a place they actually live | A title a grown adult would say out loud, scoped to their own estate; real discretion inside it | **Local social comparison** | An unpaid role sticks only when it carries discretion someone wants. Estate-level has it; building-level does not |

### The recognition instruments, costed

| Instrument | Cost | Rule |
|---|---|---|
| **The thank-you** — *"Someone got a home from the house you posted in Kayole"* | **0** | The corpus calls this the single thing that keeps such systems alive. Build it before filters |
| **Outcome counting** — *"7 families found a home because of you"* | **0** | Count **outcomes, never clicks.** Points alone are weak |
| **Local leaderboards** — ward or estate level | **0** | Small enough that the person at the top is someone you might meet. *"Top contributor in Kenya"* means nothing; **"mwenyeji wa Pipeline"** means a lot. **Ranked by accuracy, never by volume** |
| **Portable accuracy profile** | **0** | *"97% accurate, 143 confirmations, 4 estates."* For **declared** actors only |
| **Laminated card + branded shirt / vest** | **~KSh 300–500 each** | The one physical spend worth making. Costly signalling, plus tenant safety |
| **Public tenant thank-you notes** | **0** | The honest caretaker is currently invisible |
| **A title with meaning** | **0** | *"Mwenyeji wa GG House"*, or **no title at all.** Never *balozi*, *block rep*, *ambassador*, *champion*, *monitor*, *volunteer* |
| **Airtime / data draws** | Small | Use sparingly. A weekly draw reads as gambling |

### What recognition must never be

- **Never a cartoon badge for serious work.** Titles must survive being said aloud in Githurai.
- **Never a public name beside a building** for anyone in Layer B. That is the one rule whose breach
  is not recoverable.
- **Never ranked by volume.** If exposure is independent of quality you get a flood of low-quality
  content (Ghosh & McAfee), and the reputation literature names the missing ingredient exactly:
  *there is no ground truth against which contributions are compared.* §5 manufactures it.
- **Never framed as reporting.** In Kayole **86% knew about nyumba kumi and it still failed** on trust
  and participation; scholarship records it as surveillance. Where community structures are credited,
  the frame is always **mutual protection against an outside threat.** So: *we protect each other from
  fake agents and viewing fees.* Never: *tell us what is in your building.* Same data, opposite story.
- **Never the words** *ripoti*, *thibitisha*, *balozi*, *mlinzi* for caretaker, or *bure* alone.
  Institutional tone plus "free" is the documented Kenyan scam fingerprint.

---

## 5. Binding every reward to truth — the one mechanism that makes this safe

Status is cheaper than cash and **more** corruptible, because it pays for volume unless you stop it.
One loop fixes it, and it is free:

```
  Someone posts or confirms            →  a seeker travels
            ↑                                     ↓
  standing moves, up or down     ←      three taps on arrival:
  (Wilson lower bound, not raw %)        empty? price right? asked for money?
```

- **The arrival report is our manufactured ground truth.** Nothing else available to us is.
- **Standing is earned slowly and lost fast.** New contributors start neutral — trusted enough to be
  useful, not enough to move a state alone. Roughly twenty scored observations to earn belief.
- **Loss aversion does the policing.** Status you can lose polices itself; no moderator required.
  Lie → contradicted → score drops → standing drops → your reports stop counting.
- **Rank by accuracy, never by count.** Use the Wilson lower bound, so 3-for-3 does not outrank
  140-for-145.
- **Nothing is credited on assertion.** A contribution scores only when an independent party agrees or
  ground truth arrives.
- **Two unrelated accounts, each predating the listing by 30+ days**, to move a state. Sockpuppets
  then cost time rather than money.
- **A building has a phone number of record**, confirmed by independent residents; any listing with a
  different contact is auto-flagged. *(This is the red-team defence absent from Track B — see §4 of
  the reconciliation doc.)*
- **Instrument suppression, not just forgery.** Withholding confirmations is cheaper than faking them
  and leaves no fingerprints: log lapsed confirmations per estate and alert when an estate's
  confirmation rate halves week-on-week. Decay is our engine, which makes this our softest spot.

**And the default that does the most work for free:** a claim dies unless re-confirmed, and expiry
resolves to **"we are not sure"** — never to "available". Inaction produces doubt instead of lies.
Most listing rot is apathy, not malice, so this makes apathy work for us and makes lying into
recurring labour.

---

## 6. The ask ladder — ordered by how little it costs the person

Foot-in-the-door, smallest first. Each step is answerable by someone who cannot yet do the next.

| Step | The ask | Effort | Who can do it |
|---|---|---|---|
| 1 | **Search.** No account, no number, nothing | 0 | Anyone |
| 2 | **"Were you asked for money?"** after a viewing | One tap | Anyone who travelled |
| 3 | **"Iko bado?"** — is it still free | One tap | Anyone in the building |
| 4 | **"Which house did you see and not take?"** | One screen | Every rejector |
| 5 | **"You moved in — what did you actually pay, all in?"** | One screen | Every mover |
| 6 | **"Are you moving out? When?"** | A date | Every leaver |
| 7 | **Post a vacancy** | A photo + location | Caretakers, riders, residents |
| 8 | **Keep a building current** | Ongoing | Caretakers, stewards |

The classic mistake is opening at step 7. Almost nobody knows of an empty house right now, so the ask
is unanswerable, the page looks dead, and nobody returns. **Steps 2–5 are answerable by people who are
already in motion** and they are where the freshness comes from.

---

## 7. The irreducible cash floor

Everything above is zero or near-zero. Honest accounting of what is not:

| Item | Cost | Can it wait? |
|---|---|---|
| Domain | Small, annual | No |
| **Counsel — two conversations** (scam-number list; the "not an estate agent" position) | Real | **No. Do not guess here** |
| Cards + shirts, ~10 caretakers | **KSh 3,000–5,000 one-off** | Can wait until caretakers are recruited |
| ODPC controller registration | Small | Early |
| SMS / USSD shortcode | Real, recurring | **Yes — unless the survey shows feature phones dominate**, in which case it moves to the floor and the client becomes USSD or a WhatsApp bot, not an app |
| Hosting, database, storage | **0** on free tiers with hard photo compression | — |

**Total to run the pilot: a domain, two legal conversations, and under KSh 5,000 of cards.**

---

## 8. Where this departs from Track B, deliberately

So the trade is visible rather than buried:

| Track B | Here | Why |
|---|---|---|
| KSh 500–1,500/month caretaker retainer | **No retainer.** Qualified demand + portable reputation + card | No budget — and the retainer converts a relationship into a wage, which is harder to sustain than to start |
| KSh 20–50 per status confirm | **Nothing.** Thank-you + standing | The dead zone: too small to be income, large enough to destroy the motive |
| KSh 100–150 per "taken" confirm | **Nothing.** It is free from the landlord (1.00), the mover (0.95) and the caretaker | We were proposing to pay most for the signal we can get for nothing |
| KSh 1,000–2,000 let bonus, landlord-funded, via our payment rails | **We never touch money** | Preserves the Cap 533 position and the fraud shield. Two documents call this a permanent promise |
| Connectors paid KSh 200–500 per scoop | **Boda riders paid in moving jobs** | Costs nothing and is worth more to him than KSh 300 |
| Landlord subscription funds everything | **Landlord gets records and shorter voids; the data layer is not funded by him** | `agent-03`: a paying landlord buys placement, and placement kills the accuracy claim |
| Public named accuracy score for all observers | **Public for declared actors, invisible for exposed ones** | Resolves C3. Track B's own architecture already says tier-only to tenants |

**What is kept from Track B, unchanged, because it is right:** the append-only ledger; weights frozen
at insert; decay with a turnover-scaled half-life; asymmetric publication thresholds; hysteresis;
expiry to *unknown*; the landlord opt-in gate; the collusion graph; and the arrival-accuracy
north-star.

---

## 9. What to do first, at zero cost

1. **Instrument the two free moments before building anything else.** The arrival report (steps 2–5)
   and the move-out date (step 6). A WhatsApp number and a spreadsheet are enough. These are the
   freshness engine and the ground truth; without them every reward above is unbound.
2. **One estate. One stage. One conversation.** The boda chairman reaches fifty riders who each see
   every sign in the estate daily. This is the cheapest coverage instrument in the whole corpus and
   neither track developed it.
3. **Then the five caretaker conversations** — and ask the access question, not the fee question:
   *"Who decides who gets to walk in and see a vacant unit?"* Followed by the one that decides the
   whole offer in §4: **"Would you want ready tenants who already know the price, sent to you, with no
   agent in between?"** If yes, the zero-cash caretaker offer stands and Track B's payment schedule is
   largely unnecessary. If no, we need cash and the model changes.

---

## 10. What would falsify this

Stated in advance, so the answer is not argued afterwards.

| If | Then |
|---|---|
| **Rejectors do not report.** Fewer than ~1 in 5 answer *"which did you see and not take?"* | The free supply engine does not exist and supply must be bought. This is the **single most important number** and it is answerable in two weeks with no code |
| **Movers do not report** | We have no ground truth, every status is unfalsifiable, and every reward above pays for volume. Fatal — fix before anything else |
| **The caretaker says no to qualified demand** | The zero-cash offer fails for the one actor who matters most, and Track B's cash schedule comes back — with the funding question in C1 unresolved |
| **The survey shows mostly feature phones** | The client is USSD or a WhatsApp bot, geotagged photo evidence is not realistic, and the trust model's proximity weights must be re-derived |
| **Caretakers report real fear of retaliation** | Anonymity is a launch blocker, not a feature, and the public-profile half of §4 is deleted |
| **Arrival accuracy sits below ~70%** | No recognition scheme saves it. Above ~90% and it grows by word of mouth alone |
| **More than half the contacts on 50 listings are agents at month 3** | We have rebuilt a listings portal with no revenue, and the actor model has failed regardless of how good the table looks |
