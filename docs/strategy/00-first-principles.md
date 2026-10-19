# Mitasafi — First Principles

*A fresh-view interrogation of the Kenyan house-hunting problem. Written with no reference to any existing code or prior decisions.*

Date: 2026-10-19

---

## Part 0 — The reframe, in one paragraph

**Listings are not missing. Kenya has hundreds of thousands of them.** BuyRentKenya, Property24
Kenya (~326k listings), Jiji (~47k), a dozen smaller portals, plus Facebook and WhatsApp groups.
What is missing is a **reliable, complete, current map of vacancy at the price points where most
Kenyans actually rent** — roughly KSh 4,000–30,000/month, in Pipeline, Githurai, Kayole, Umoja,
Donholm, Zimmerman, Kahawa, Rongai, Kitengela, and the equivalents in Mombasa, Nakuru, Eldoret,
Kisumu and Thika. For that market the vacancy data exists only in four places: **an A4 paper sign
taped to a gate, the caretaker's head, an agent's WhatsApp group, and a neighbour's gossip.**

And here is the thing that explains everything else:

> **The information gap is not a bug in the market. It *is* the product being sold.**

The informal agent's entire income — the KSh 500–3,000 viewing fee, the one-month-rent commission —
is rent extracted from information asymmetry. A system that makes vacancy transparent is not
filling a gap; it is **expropriating the livelihood of the only people who currently hold the
data.** Every serious attempt has therefore either (a) ignored agents and starved for supply, or
(b) partnered with agents and faithfully reproduced the gated, stale, fake-listing-ridden
experience the user was trying to escape.

Any plan that does not have an answer to that sentence is not a plan.

---

## Part 1 — What the problem actually is (stated precisely)

Strip the sympathy out and name the mechanics. A Kenyan looking for a KSh 12,000 one-bedroom in
Embakasi faces **six separate failures**, and most "solutions" fix only the first:

| # | Failure | What it actually costs the seeker |
|---|---------|-----------------------------------|
| 1 | **Discovery** — no index of what is vacant in *my* estate at *my* price | 3–6 weekends of walking |
| 2 | **Freshness** — the unit let 4 days ago, the sign is still up, the ad is still live | Wasted trips, wasted matatu fare |
| 3 | **Gatekeeping** — the person with the list wants KSh 500–3,000 before you see a door | KSh 1,500–5,000 in pure search tax |
| 4 | **Fraud** — the "agent" is not the agent; the deposit is gone | KSh 5,000–60,000, sometimes everything |
| 5 | **Opacity of true cost** — 12k becomes 12k + water + garbage + service charge + goodwill | Budget blown after signing |
| 6 | **Liquidity of cash** — rent + deposit + agent fee = ~3 months' rent, up front, in cash | The actual reason people stay in bad houses |

Note what this table implies. **Discovery is the least of it.** A perfect search engine fixes row 1
and leaves rows 2–6 intact. That is precisely why every search engine built for this market has
failed to change behaviour — and why people still walk.

Three properties of this data make it unlike anything else you might build:

- **It is geographically fractal.** This is not one market; it is several thousand micro-markets.
  Liquidity in Kilimani is worth exactly zero to a seeker in Githurai 45. You need density
  *per estate*, not per city. The usual "launch in one city" playbook is structurally wrong here.
- **It is violently perishable.** A bedsitter in Pipeline lets in 2–10 days. A directory of
  vacancies decays into garbage in a fortnight without active refresh. Every static listings site
  in Kenya is a graveyard of already-let units — which is exactly why users distrust them.
- **It is adversely selected.** A landlord with 2% vacancy does not advertise. Only *distressed*
  supply advertises: overpriced, badly located, newly built, or problem buildings. So the stuff on
  the portals is the stuff nobody wanted — which confirms the seeker's suspicion that "those sites
  are useless," and sends them back to walking.

**Therefore: the product is not inventory. The product is freshness and honesty.** Those are the
two things no incumbent sells, and the two things that cost nothing but discipline.

---

## Part 2 — Why has nobody solved this? Seven structural reasons

Not "they didn't think of it." Each of these is a real wall.

**1. The cold-start problem is fractal, so it costs ~100× the normal amount of operational work.**
You cannot bootstrap Nairobi. You must bootstrap Pipeline, then Githurai 44, then Githurai 45,
then Kayole Soweto — each a separate liquidity problem with separate caretakers, separate WhatsApp
groups, separate price bands. Venture-backed teams reach for paid acquisition, get city-wide thin
coverage, and die of "we have 4,000 listings and nobody finds a house."

**2. Perishability destroys trust faster than any other category of marketplace.** A wrong
restaurant listing is a mild annoyance. A wrong vacancy listing costs a seeker a 90-minute matatu
round trip and KSh 200 of fare, and they will *never* trust you again. You have roughly one wasted
trip of credit per user. Incumbents burned theirs years ago.

**3. The unit economics at the bottom of the market are hostile.** A KSh 8,000/month unit cannot
support a KSh 2,000 customer-acquisition cost. The transaction settles in cash or personal M-Pesa,
off-platform, unverifiable — so there is no payment rail to sit inside unless you become a deposit
escrow, which is regulated, capital-intensive and *distrusted precisely by the people you are
serving*. No take rate → no venture thesis → nobody builds for the mass market. Everyone drifts
upmarket to Kilimani where a KSh 150,000 unit pays a real commission. **The 90% of the market is
unserved because it is unfundable, not because it is unsolvable.**

**4. Identity fraud here is structurally unfalsifiable.** Anyone can claim to represent any
building, and there is no public, queryable register of "who is the landlord of this block."
Ardhisasa handles land records, not rental authority, and is not an open API. The Estate Agents
Registration Board register covers *licensed* agents — a tiny fraction of who is actually letting
houses in Kayole. So verification **cannot be done by document check.** It has to be done socially
and physically. Every team that tried "upload your title deed" hit a wall at 1% of supply.

**5. The supply side has negative incentive to post.** The landlord doesn't need you. The caretaker
is paid (informally, in tips) by the agent for the tip-off. The agent's margin *is* the opacity.
There is no natural self-serve supply at the bottom of this market — which means supply must come
from somewhere other than the owner. (Part 4 is about where.)

**6. Everyone built a search engine; this is a dispatch problem.** Seekers in this segment do not
browse. They cannot afford to browse — data costs money and vacancy at their price point appears
and disappears within days. The correct primitive is **a standing subscription matched against a
fast-moving feed**: *"the moment a 1-bedroom under 12k opens in Donholm, tell me."* That is an
alerting system, not a catalogue. Building a catalogue for a dispatch problem produces something
that technically works and nobody uses.

**7. The channel mismatch.** Mass-market seekers are on low-end Android with metered data (CA data:
52.3m smartphones vs 27.4m feature phones as of June 2026, so smartphones are now the majority —
but data is rationed and WhatsApp is the habitat). Incumbents ship photo-heavy JavaScript apps and
20MB Play Store installs. Each of those is a tollgate, and each one filters out exactly the user
who most needs the product.

**The synthesis:** this problem sits in the one spot where the data is held by people who profit
from hiding it, the users cannot pay, the asset is perishable, the geography is fractal, and
identity cannot be verified by paperwork. That is why it is unsolved. It is not a technology gap.

---

## Part 3 — 112 questions, each with an answer, a field test, or a bet

Marked: **[A]** answerable now from reasoning; **[F]** needs field work — go and ask; **[B]** a bet
to be tested, with the cheapest test named.

### A. The problem itself (1–12)

1. **Who exactly is the user?** **[A]** Not "Kenyans." Three distinct ones: the *mover under
   pressure* (30 days' notice, must find something, high intent, short-lived); the *upgrader*
   (browsing for months, low urgency); the *newcomer to the city* (highest vulnerability, highest
   scam exposure, no local network). Build for the mover under pressure. They are the only one who
   will change behaviour, and they are the only one who will contribute on exit.
2. **How long does a search actually take today?** **[F]** Hypothesis: 2–6 weekends, 8–20 units
   viewed. Measure it. If it is 3 days, there is no problem worth solving.
3. **How much does a search cost in shillings today?** **[F]** Hypothesis: KSh 1,500–6,000 (fares +
   viewing fees + agent fee). Ask 30 people who moved in the last 90 days. **This number is your
   entire value proposition.** If you can say "the average Embakasi mover pays KSh 4,200 to find a
   house; Mitasafi costs nothing," you have a product.
4. **What fraction of vacancies ever appear online at all?** **[F]** Hypothesis: under 10% in
   mid/low-income estates. Test by walking one estate, counting signs, and searching each one
   online. **Run this audit — it is the single most convincing slide you will ever produce.**
5. **Is the bottleneck finding houses, or finding *the right* house?** **[A]** At the bottom of the
   market it is finding *any* vacant unit matching ~3 constraints (price, estate, bedrooms). Rich
   filter taxonomies (parking, balcony, pets) are upmarket features. Resist them.
6. **Is it a shortage problem or an information problem?** **[A]** Both, and you can only fix the
   second — but the second is worth a lot: vacancy exists simultaneously with desperate seekers
   less than 2km apart. That co-existence is pure information failure, and it is your wedge.
7. **What is the single number that proves you worked?** **[A]** Verified move-ins. Not users,
   not listings. See Part 10.
8. **Where does the pain peak seasonally?** **[F]** Hypothesis: December–January (school year,
   post-holiday relocations) and end/start of each month. Seasonality determines launch timing.
9. **Is the seeker's problem ever solved by *more* listings?** **[A]** No — past ~20 fresh options
   per estate per week, more inventory adds noise. Stop optimising for volume early.
10. **How much is a seeker willing to pay?** **[A]** Functionally nothing. Any charge recreates the
    agent fee you are abolishing, and destroys the moral position that makes the network grow.
    Price must be zero, permanently, loudly.
11. **Would a seeker trade data for the service?** **[B]** Yes — *labour*, not money. They will
    report back and contribute units. Test: how many of 50 alerted users report back after a
    viewing with one tap?
12. **What does the seeker fear most?** **[F]** Hypothesis, in order: losing deposit money; wasted
    trips; being overcharged for being new; and (for women searching alone) personal safety at
    viewings. If safety ranks top-3, it must be a first-class feature, not a footnote.

### B. Supply — who actually knows, and why would they tell you (13–28)

13. **Who holds the ground truth today?** **[A]** In priority order: **the outgoing tenant**
    (knows 30–60 days early — the earliest and most valuable signal in the whole system, and nobody
    is harvesting it); the **caretaker/mlinzi**; the **informal agent**; neighbours;
    **boda boda riders**; shopkeepers and mama mboga.
14. **Who holds it and has *no conflict of interest*?** **[A]** Outgoing tenants, neighbours, boda
    riders, shopkeepers. **This is the supply base.** Not landlords, not agents.
15. **The best unexploited source?** **[A]** **The successful seeker.** Everyone who finds a house
    viewed 5–15 units and rejected the rest. Those rejects are *verified-vacant-today*, with real
    price and the caretaker's real number. Make the exit interview the contribution:
    *"Congratulations, you found a place. Which houses did you see and not take? Someone behind you
    needs them."* It converts the moment of maximum gratitude into supply, at zero cost, with the
    highest-quality data in the system. **Design the whole product around this loop.**
16. **Why would a boda rider report?** **[A]** They traverse every lane of their estate daily, see
    every sign, know every gate, have M-Pesa, have idle time at the stage, and are already
    organised into stages/SACCOs with a chairman you can talk to. They are the best-organised,
    most-underused distribution network in Kenya. Pay in status and eventually in small
    outcome-based airtime. Entry cost: one conversation with one stage chairman. **[F]** Go and
    have that conversation in week one.
17. **Why would a caretaker cooperate when the agent tips them?** **[A]** Because what the
    caretaker actually wants is **fewer time-wasters and a faster let**, and the agent's tip is
    small and irregular. Offer: qualified inbound tenants, 30-second listing by WhatsApp, and a
    *portable public reputation* — a rated profile that follows them across jobs. Reputation is the
    only asset a caretaker currently cannot accumulate. That is a real gift.
18. **Why would a landlord bother?** **[A]** Mostly they won't, and that's fine — don't build for
    them at stage 0. The ones who will: owners of new or hard-to-let blocks, absentee owners
    (diaspora) who distrust their agent, and owners of 5+ units with real vacancy costs. Their pain
    is *void periods* and *agent opacity*, not listings.
19. **Do you fight agents or recruit them?** **[A]** Neither — **re-price them.** Offer the honest
    ones *volume instead of margin*: a verified profile, free qualified leads, public ratings. The
    good agents convert; the fee-extractors get rated out of existence by the crowd. Declaring war
    on "agents" as a class is both inaccurate (many are legitimate and useful) and tactically
    stupid (they hold the data).
20. **Will agents sabotage you?** **[A]** Yes — expect spam listings, fake "already taken" flags on
    rivals' real units, and bulk-flagging. Design moderation to resist weaponisation from day one
    (Part 5).
21. **Can you scrape the incumbents to bootstrap?** **[A]** Technically trivial; strategically a
    trap. You would import their staleness and their adverse selection, poison your freshness
    metric, and inherit their fake listings — destroying the only thing that differentiates you.
    **Don't.** (Also: ToS and database-right exposure.)
22. **What is the atomic unit of data?** **[A]** Not the listing — the **building**. Buildings are
    stable (one block = 20 units, one gate, one caretaker, one verification). Listings are
    ephemeral. Model buildings as first-class, and you verify once and reuse forever, and you
    accumulate an asset: a structured building graph for estates that have no street addresses.
    **This is the most important architectural decision in the document.**
23. **What does a report minimally contain?** **[A]** Photo of the gate/sign (camera-captured),
    GPS, estate, unit type, asking price, and **the contact number as written on the sign**. Six
    fields. Anything more kills the contribution rate.
24. **Should the reporter's own number be the contact?** **[A]** **Emphatically no** — and this is
    the keystone anti-fraud move. See Q52.
25. **How do you handle units with no sign?** **[A]** Outgoing-tenant and caretaker reports. Mark
    provenance distinctly; these are higher-value (earlier) and lower-evidence (no photo of a sign)
    — so they need a named reporter with standing.
26. **What about advance notice — "vacating in 3 weeks"?** **[A]** The most valuable product in the
    system and nobody sells it. A seeker with 30 days' notice matched to a unit with 30 days'
    notice is a clean trade. Call it a *pipeline* listing, kept separate from confirmed vacancy.
27. **Can tenants be hurt by reporting their own upcoming exit?** **[A]** Yes — a landlord could
    retaliate, or re-let over their head before they've left. So pipeline reports must be
    anonymous-by-default and must never surface the current tenant. Handle with care.
28. **How many reports per estate per week is "enough"?** **[B]** Hypothesis: ~15–25 fresh units
    per week makes an estate feel alive to a mover. Test in one estate manually before writing code.

### C. "Owned by the people" — what that actually means (29–38)

29. **Which of the three meanings do you intend?** **[A]** Three very different things get called
    this: **(a) community-contributed data** (Waze/OSM/Wikipedia — users supply and correct it,
    operation is central); **(b) community-governed** (estate-level stewards with earned
    authority); **(c) community-*owned* equity** (co-op, revenue share, tokens).
    **Recommendation: build (a) + (b) now; treat (c) as a later structural question.**
30. **Why not co-ownership now?** **[A]** A co-operative or SACCO structure in Kenya is real legal
    and administrative weight, it needs revenue to distribute (you have none), and the "token"
    framing imports scam associations in precisely the market where you are trying to be the
    anti-scam brand. It would consume the attention that should go into one estate's data.
31. **Isn't using the *language* of ownership without the equity dishonest?** **[A]** It is if you
    imply shares. It isn't if you are precise: *"this directory belongs to the people who build
    it"* — contributors own the reputation, the governance and the benefit, and the data is
    openly licensed. Say that, don't say "you're a shareholder." **Write down this distinction
    publicly before you ever use the word "owned."**
32. **Could the data be a commons by licence?** **[A]** Yes, and should be: commit to publishing the
    aggregate vacancy/price dataset under an open licence (ODbL-style). It is a credible,
    cost-free ownership guarantee and it makes the project un-enclosable, including by you. That
    promise is itself a trust asset.
33. **Who governs disputes?** **[A]** **Estate stewards** — volunteer moderators who live in the
    estate they moderate. Local knowledge detects a lie instantly ("there is no such block on that
    road"), scales for free, and makes "owned by the people" materially true rather than
    rhetorical.
34. **How do you pick stewards without creating little tyrants?** **[A]** Earned by verified
    contribution record, term-limited, two per estate (never one), every decision logged and
    visible, and appeal to the next ring up. Power that is logged is power that is bounded.
35. **What stops a steward colluding with agents?** **[A]** Pairing, public audit logs,
    and the fact that stewardship is worth something (status + early access) so losing it costs.
36. **Will people really contribute for free?** **[A]** Yes, under three conditions, all
    well-attested: it takes under 30 seconds, the beneficiary is visibly a person like them, and
    the contribution is **acknowledged publicly and locally**. Fail any one and it collapses.
37. **What is the right ask, verbally?** **[A]** Not "list a property." **"Umeona nyumba iko
    vacant? Tuma picha."** (Seen an empty house? Send a photo.) One photo. That is the whole ask.
38. **What's the civic frame?** **[A]** It is the digital version of something Kenyans already do
    constantly — harambee, chama, estate WhatsApp groups, telling a friend about a vacant house.
    You are not inventing a behaviour; you are **giving an existing behaviour a bigger radius.**
    That framing is true, and true framings are durable.

### D. Motivation and recognition without money (39–50)

39. **What is the strongest zero-cost incentive available?** **[A]** **Time-shifted freshness.**
    Contributors get new matching listings *instantly*; non-contributors get them 6–12 hours later.
    You are paying people in the exact commodity the market values most, you have an unlimited
    supply of it, and it costs you nothing. **This is the best single mechanism in this document.**
40. **Isn't a contribution gate hostile to new users?** **[A]** A *hard* gate is fatal — a scared
    newcomer must get value on day one or you have no network. A *soft* delay is not: everyone gets
    everything, contributors get it first. Nobody is excluded, and the asymmetry is exactly
    valuable enough to change behaviour.
41. **Do points work?** **[A]** Weakly on their own. **Impact counts work:** *"7 families found a
    home because of you."* Count outcomes, not actions.
42. **Do leaderboards work?** **[A]** Only at estate level. "Top contributor in Kenya" is
    meaningless; "Mlinzi wa Pipeline" or "Mtaa Captain, Githurai 44" is a real social good because
    identity in Kenya is hyperlocal. Keep every board small enough that the person at the top is
    someone you might meet.
43. **What is the single best recognition event?** **[A]** The **thank-you loop**: when a seeker
    confirms move-in, the person who reported that unit is told — *"Someone got a home from the
    house you posted in Kayole."* This is the dopamine that keeps commons alive. Build it before
    you build filters.
44. **Should you pay cash?** **[A]** Not at stage 0, and never per-post. If ever: **KSh 20–50 per
    verified, converted lead, paid only on confirmed move-in.** Pay for outcomes or you are
    funding a spam farm within a week.
45. **Alternatives to cash?** **[A]** Airtime/data bundles (the most liked micro-reward in Kenya,
    cheap, feels like cash); telco-sponsored bundles (partnership, later); recognition merch
    (reflective vest/branded cap for boda reporters — high visible status, ~KSh 300, doubles as
    marketing); and a weekly draw (cheap but imports gambling optics — probably skip).
46. **What does a caretaker want that isn't money?** **[F]** Hypothesis: fewer time-wasters, a
    faster let, and respect/standing. Go and ask ten of them. **This interview is worth more than
    any amount of planning.**
47. **What does a boda rider want?** **[F]** Hypothesis: a fare. Note the natural adjacency —
    whoever shows you the house also moves your bed. Riders may value the *moving job* more than
    any reporting fee, which makes the incentive self-funding.
48. **How do you keep contribution honest when incentives exist?** **[A]** Reward only on
    independently corroborated, seeker-confirmed outcomes; cap rewards per reporter per week; make
    status (which is what actually motivates) forfeitable on a false report.
49. **How do you avoid gamification-as-insult?** **[A]** No cartoon badges for serious work. Titles
    should be ones a person would say out loud in their own estate.
50. **What makes someone come back on day 30?** **[A]** The thank-you loop (Q43), and standing in a
    place they actually live. Nothing else survives month two.

### E. Fraud — the crux (51–68)

51. **What are the actual fraud types?** **[A]** Eight distinct ones; each needs its own defence,
    so never speak of "scams" in the singular:
    1. **Fee-before-viewing** (KSh 500–3,000 "viewing fee" / "commitment fee") — highest volume.
    2. **Deposit theft** — not the owner at all; takes deposit + rent and vanishes. Highest harm.
    3. **Ghost listing** — unit doesn't exist; photos lifted from another portal or Pinterest.
    4. **Deliberately stale bait** — "12k in Donholm" kept live forever as a hook, then
       bait-and-switch to an 18k unit. **The most corrosive, because it looks legitimate.**
    5. **Double-letting / goodwill extraction** — deposit taken from several people for one unit.
    6. **Platform impersonation** — "I'm from Mitasafi, send KSh 200." Pre-empt this or it kills you.
    7. **Price misrepresentation** — 12k advertised, 12k + water + garbage + service charge actual.
    8. **Competitive sabotage** — rivals flagging genuine listings as fake/taken.
52. **The single structural defence?** **[A]** **Separate the reporter from the contact.** The core
    record is *"this unit appears vacant; here is the gate; here is the number **as written on the
    sign**"* — never "call me." Consequences: a scammer has no channel to insert himself; the
    evidence (number painted on a wall, visible in the geotagged photo) is self-authenticating; and
    any report whose contact number does not appear in its own photo is automatically flagged
    higher-risk. **This one design decision removes the economic basis of fraud types 1, 2 and 3.**
53. **How do you kill ghost listings cheaply?** **[A]** **Camera-only capture.** Photos must be
    taken in-app/in-session, with GPS and server timestamp; no gallery uploads for new accounts.
    Scraped photos simply cannot pass. Marginal cost: zero. Allow gallery uploads only for
    contributors with standing.
54. **How do you kill the fee scam?** **[A]** Make it a norm, not a rule, and shout it everywhere —
    on every listing, in every alert, in the brand itself: **"Mitasafi is free. Nobody should ever
    ask you for money before you are standing inside the house. If they do, report them."**
    Repetition of one sentence across millions of impressions is the cheapest security product in
    existence.
55. **Should you ever hold money?** **[A]** **No.** Not escrow, not deposits, not fees. The moment
    you touch money you (i) become a fraud target, (ii) acquire licensing exposure, (iii) acquire
    liability for other people's losses, and (iv) lose the clean claim above. A platform that never
    handles money cannot be the instrument of a payment scam. Make "we never touch your money" a
    permanent constitutional commitment.
56. **Who verifies, then?** **[A]** Three different questions with three different answers, and
    conflating them is how platforms over-promise:
    - *Is it vacant?* → **the crowd**, by corroboration and decay.
    - *Is this person who they say?* → **the crowd + stewards**, socially and physically.
    - *Does this person legally own it?* → **nobody can, and you must say so plainly.**
57. **How does crowd verification actually work?** **[A]** A **confirmation cascade**: trust rises
    with independent confirmations from distinct accounts/devices, weighted by reporter standing,
    weighted heavily by someone who physically went. *"3 people confirmed vacant today"* is worth
    more to a seeker than any document check — because it answers the question they actually have.
58. **How do you handle staleness honestly?** **[A]** **Decay by default.** Every listing expires
    in ~7 days unless re-confirmed. Status is ternary and always visible: **Confirmed today /
    Unconfirmed (n days) / Reported taken.** This converts staleness from a hidden defect into an
    honest signal. *Displaying your own uncertainty is the trust product.* Incumbents cannot copy
    this because their inventory numbers would collapse — which is exactly why it is a moat.
59. **Won't decay make the app look empty?** **[A]** Yes, sometimes. **Accept it.** An honest empty
    list beats a dishonest full one; the full one is why nobody trusts the portals. Hold this line
    even when it hurts, because it is the entire differentiation.
60. **How do you verify identity without documents?** **[A]** Verify **buildings, once**, not
    listings. A steward (or a trusted caretaker/landlord relationship) verifies a block one time —
    20+ units covered forever. Evidence that is actually obtainable: a rent receipt, a utility
    bill, a steward's physical visit, or three independent tenant confirmations that X is the
    caretaker. Cheap because amortised over the building's whole life.
61. **What stops SIM-farming fake accounts?** **[A]** Kenyan SIMs are ID-registered, so a number has
    real acquisition cost; rate-limit new numbers hard; require a standing ladder (first 3 reports
    are quarantined pending corroboration); device fingerprinting as a weak signal.
62. **What is the post-viewing feedback loop?** **[A]** Your main verification engine. After a
    seeker views, one tap: *Was it vacant? Was the price right? Did anyone ask you for money?*
    That third question is a **fraud radar across the whole market**, generated for free by people
    who were going to view anyway.
63. **Should there be a scam-number blacklist?** **[A]** Yes, and it is possibly the strongest
    standalone wedge in the whole project: *"check this number before you call."* Near-zero cost,
    instant utility, viral by nature, useful even to people who never use the listings.
64. **What's the legal risk of a blacklist?** **[A]** Real: defamation, and exposure under the
    Computer Misuse and Cybercrimes Act 2018's false-publication provisions. Mitigate with: an
    evidence threshold (multiple independent complaints, never one), neutral factual framing
    ("3 users reported being asked for a fee before viewing" — not "fraudster"), a working appeal
    path, and prompt removal on rebuttal. **Get an advocate to review this one feature
    specifically before launch.** Do not freelance it.
65. **How do you resist weaponised flagging?** **[A]** Flags cost standing; a flag from a reporter
    with no record counts for little; "taken" claims from a competing agent's number pattern get
    quarantined; the original reporter gets a chance to re-confirm before removal.
66. **What if a listing is real but the price is a lie?** **[A]** Collect *actual* price at move-in
    confirmation and show the gap. Over time you own something nobody else has: **real transacted
    rents by estate, not asking rents.** (A quietly valuable asset — see Part 11.)
67. **How do you pre-empt impersonation of Mitasafi itself?** **[A]** One permanent, loud rule
    ("we never ask for money, ever, for anything"), a single verifiable official channel, staff and
    stewards listed publicly and checkable in-product, and a fast public incident log.
68. **What is your liability if someone is defrauded anyway?** **[F]** Get advice. Position: an
    information commons that neither transacts nor acts as agent for any principal, with prominent
    warnings and no money handling — a materially better position than a commission-taking
    intermediary. But get it in writing, early, cheaply.

### F. Privacy, anonymity, safety, law (69–82)

69. **Why does the seeker need anonymity?** **[A]** Several real reasons: a woman searching alone;
    someone whose current landlord must not learn they are leaving; someone escaping an abusive
    partner; and plain price protection — reveal your budget or your accent and the quoted price
    moves.
70. **How anonymous can a seeker be?** **[A]** Fully, for browsing and alerts: no account to
    search; a phone number only for alerts, and **never shown to anyone, ever**. The seeker's
    number should be technically incapable of reaching a lister.
71. **Should you build tenant profiles?** **[A]** **No.** Collecting ID, income, employer and
    payslips inverts the power asymmetry against the person you are serving, and creates a honeypot
    with real consequences. Resist it even when landlords ask. *Especially* when landlords ask.
72. **Minimum viable dataset?** **[A]** Building, unit type, asking price, status, timestamps,
    reporter standing, photo. That is a boring dataset, and boring datasets do not ruin lives when
    breached. **Design for the breach you will eventually have.**
73. **Is budget information sensitive?** **[A]** Yes — a seeker's budget must never be visible to a
    lister. It is price-negotiation ammunition.
74. **What safety features matter at viewings?** **[A]** "Share my viewing" (location + time + unit
    sent to a chosen contact), daylight-hours guidance, don't-go-alone prompts for solo viewers,
    and a logged "I am viewing unit X now" so an incident has a trail. Cheap to build, and it is
    the feature people will tell their friends about.
75. **Does the Data Protection Act 2019 apply?** **[A]** Yes — collecting phone numbers at scale
    makes you a data controller. Registration with the ODPC turns on turnover/headcount thresholds
    (reported around KSh 5m turnover / 10 employees, with sources disagreeing on whether the test
    is conjunctive) and sectoral carve-outs. **Read the Registration Regulations directly; don't
    rely on summaries, including this one.** Either way: lawful basis, a plain-language notice in
    both English and Kiswahili, data-subject rights, and a named contact — all free to do, and
    doing them well is itself a trust signal.
76. **Does the Estate Agents Act (Cap 533) make you an estate agent?** **[A]** Practising estate
    agency for a fee requires EARB registration and a current practising certificate. A free
    information commons that takes no commission, negotiates nothing and acts for no principal sits
    well outside that — **and this is a second, independent reason never to take a commission.**
    Confirm with an advocate; design for it now.
77. **Any other legal exposure?** **[A]** Defamation and cybercrime (the blacklist, Q64); consumer
    protection in your claims (don't say "verified" when you mean "recently confirmed" — this is a
    discipline issue as much as a legal one); copyright in scraped photos (another reason for
    camera-only).
78. **Should you incorporate first?** **[A]** No. Prove the loop manually in one estate first. An
    entity that exists before a single person has found a house through you is a distraction.
79. **Open data vs. privacy — conflict?** **[A]** None, if the open dataset is aggregate and
    building-level: vacancy rates and price distributions by estate, no personal data. That is both
    publishable and useful.
80. **Who owns a contributor's photo?** **[A]** They do; you take a licence. Say it in one sentence,
    in plain language, at the moment of upload.
81. **What about children/vulnerable users?** **[A]** Don't collect ages; don't build features that
    require them.
82. **What is the nightmare privacy scenario?** **[A]** A database that links "person X is looking
    to move out of building Y with a budget of Z" and leaks. **Never build that record.** The
    architecture should make it impossible rather than merely forbidden.

### G. Channel, product, technology (83–96)

83. **Should the first version be an app?** **[A]** **No.** The first version should be you, a
    phone, a pair of shoes and a spreadsheet. (Part 9.)
84. **WhatsApp or app?** **[A]** WhatsApp for *inbound* (everyone is there; photo + location share
    is native and free; zero dev work). A broadcast channel for *outbound*. A thin PWA only once
    the manual loop demonstrably pulls.
85. **WhatsApp or Telegram for broadcast?** **[A]** WhatsApp has the people; Telegram has unlimited
    broadcast, lighter data and public links. Use both — WhatsApp inbound + a WhatsApp Channel and
    a Telegram channel per estate outbound. Choose by measured open rate, not preference.
86. **Why not a native Android app?** **[A]** A Play Store install is a tollgate, 20MB of a metered
    bundle is a real cost, and low-end devices punish you. A sub-300KB PWA is installable, works
    offline, and costs nothing to distribute.
87. **SMS/USSD for feature phones?** **[A]** 27.4m feature phones is a real market, but a shortcode
    carries real setup and per-message cost. **Defer**, and serve those users through someone who
    has a smartphone — the boda rider, the shopkeeper, the steward. Human relay beats premature
    infrastructure.
88. **Can infrastructure genuinely cost zero?** **[A]** Yes, for a long time: static/edge hosting
    free tier, a managed Postgres free tier, aggressive server-side image compression (40KB
    thumbnails, WebP), no video. Honest limit: SMS, shortcodes, domains, and legal advice cost
    money. Budget for those four and nothing else.
89. **Search or alerts?** **[A]** **Alerts.** A standing subscription — *estate + max price + unit
    type* — and a notification when a match appears. Search is secondary. (Reason 6, Part 2.)
90. **How do you present uncertainty in the UI?** **[A]** Freshness as the dominant visual element,
    above price and above photos. "Confirmed 2 hours ago by 3 people" is your headline, not the
    photo. No competitor's UI can lead with this.
91. **What's the hardest UX problem?** **[A]** A 30-second contribution flow on a bad connection
    with one hand, standing at a gate, in the rain. Optimise this one screen obsessively; it is
    where the whole supply side lives or dies.
92. **Language?** **[A]** Kiswahili-first in the voice, English available. Sheng in the copy where
    it is natural and never where it is performative. "Umeona nyumba vacant?" is the product.
93. **Map or list?** **[A]** List and alerts first — maps are data-heavy and most of these estates
    have no usable addressing anyway. Build the building graph (Q22) and maps become possible later
    as a by-product.
94. **Offline?** **[A]** Required for the contribution flow — capture at the gate, queue, upload
    when there is signal. A report lost to a dead connection is a contributor lost.
95. **How do you prevent the DB becoming a graveyard?** **[A]** Decay by default (Q58), enforced in
    the data model, not the UI. Make it structurally impossible to show a 3-week-unconfirmed listing
    as current.
96. **AI anywhere?** **[A]** Narrowly and later: duplicate detection (same gate reported twice),
    photo/sign OCR to pull the number and price automatically, and triage of likely-fraud patterns.
    Not a chatbot. Nobody needs a chatbot to find a bedsitter.

### H. Strategy, money, risk (97–112)

97. **Where do you start, exactly?** **[A]** **One estate.** Not Nairobi, not a county — one
    estate, chosen by: high density, high churn, low/mid rent, walkable, high sign-density, strong
    boda presence, and **somewhere you or a co-founder has genuine social roots.** The last
    criterion outranks all the others.
98. **Why one estate?** **[A]** Because liquidity is fractal (Reason 1), and because one estate is
    small enough to serve *completely* by hand. Complete coverage of one estate is a product;
    partial coverage of Nairobi is a demo.
99. **How do you know when to expand?** **[A]** When the estate is self-sustaining: inbound reports
    exceed what you collect yourself, and arrival accuracy holds above ~80% for a month without
    your intervention. Expand by cloning the playbook with a local steward, never by turning on a
    region in a database.
100. **What is the north-star metric?** **[A]** **Verified move-ins** — families housed. Everything
     else is instrumentation.
101. **The key operating metric?** **[A]** **Arrival accuracy**: of seekers who travelled to a
     listing, what % found it genuinely vacant and at the stated price. Above ~80% and the product
     grows by word of mouth alone. Below ~50% and no amount of marketing saves you.
102. **How do you measure coverage?** **[A]** The **ground-truth walk**: monthly, walk a fixed
     audit route, record every sign, compare against your database. Coverage = captured ÷ actual.
     Nobody in this industry measures this. It is cheap, rigorous, and it would be your most
     credible claim.
103. **What's the cheapest way to get the first 100 seekers?** **[A]** Post a free, fresh, honest
     vacancy list in the estate's existing Facebook and WhatsApp groups at a fixed time daily. You
     do not need to build an audience; the audience is already assembled and already asking.
104. **What makes this spread?** **[A]** One sentence passed between friends: *"there's a list, it's
     free, and it's actually today's."* Nothing else. Optimise for the truth of that sentence.
105. **Will incumbents copy you?** **[A]** They can copy features; they cannot copy decay-by-default
     (it would collapse their inventory numbers), they cannot copy "we never take a commission"
     (that is their revenue), and they cannot copy a contributor network that exists because it is
     not extractive. **Your moat is your business-model constraints, not your code.**
106. **How does this make money, eventually, without betraying the model?** **[A]** Never from
     seekers, never a commission. Candidates, roughly in order of fit: **moving logistics referral**
     (everyone who moves needs a boda or a pickup — and your reporters are the riders: naturally
     self-funding); **internet/utility connection referrals** (ISPs pay real money per connected
     address, and you know who just moved in); landlord void-filling tools; deposit-financing
     partnerships with SACCOs (addresses failure #6, the real reason people stay in bad houses);
     and **anonymised transacted-rent data** — Kenya has no credible rental price index, and banks,
     developers, researchers and county governments would value one.
107. **What's the most valuable long-term asset here?** **[A]** Not the listings. The **verified
     building graph** — a structured, photographed, geolocated inventory of residential blocks in
     estates that have no street addressing — plus the transacted-rent series. Both are by-products
     of doing the main job honestly.
108. **How does this die?** **[A]** Five ways, in order of probability: (1) **founder burnout from
     manual ops** — mitigate by refusing to leave one estate until it self-sustains; (2) **becoming
     a graveyard** — mitigate by never relaxing decay; (3) **a publicised fraud incident** —
     mitigate by never touching money and keeping a visible incident log; (4) **coordinated agent
     poisoning** — mitigate with standing-weighted moderation and stewards; (5) **no revenue path
     and attention fades** — mitigate by designing for near-zero burn, so the thing can survive on
     small rather than needing to be big.
109. **Is this a business or a commons?** **[A]** Be honest: it looks far more like a **public good
     with modest adjacent revenue** than a venture-scale startup. That is not a lesser thing — and
     accepting it is liberating, because it frees you from the upmarket drift that killed every
     predecessor. Design it to survive on near-zero burn and it can outlast anyone funded.
110. **What's the one thing you must not compromise?** **[A]** **Zero cost to the seeker, and
     honesty about freshness.** Those two are the product. Everything else is negotiable.
111. **What would make you abandon this?** **[A]** If the ground-truth walk shows >60% of vacancies
     already discoverable online, or if movers report search costs under KSh 500 and under a week.
     Then the problem is smaller than it feels, and you should know that in week two rather than
     year two. **Define the kill criteria before you start.**
112. **What is the very first action?** **[A]** Walk one estate tomorrow and photograph every TO LET
     sign you can find. Everything in this document is downstream of that walk.

---

## Part 4 — The solution that falls out of the answers

Not a marketplace. A **vacancy reporting network** with four parts:

**1. A reporting primitive so small it is almost free to perform.**
One photo of a gate or sign, GPS-stamped, camera-captured, with the number *as painted on the wall*.
Not "list your property" — **"umeona nyumba vacant? tuma picha."**

**2. A supply base of people with no conflict of interest.**
Outgoing tenants (earliest signal), **successful seekers reporting the units they rejected** (highest
quality, free, and currently harvested by nobody), boda riders (best-organised traversal network in
Kenya), caretakers (re-priced from tip-takers to reputation-holders), shopkeepers, neighbours.

**3. A trust model built on corroboration and decay, not documents.**
Freshness is the headline. Status is always one of *Confirmed today / Unconfirmed (n days) /
Reported taken*. Trust accrues from independent confirmations and physical visits, weighted by
standing. Nobody claims to verify ownership, because nobody can. **Platform never touches money** —
which removes the mechanism of the two most harmful fraud types outright.

**4. A dispatch layer, not a catalogue.**
Standing subscriptions (estate + price + unit type) and instant alerts. Contributors are alerted
first; everyone else a few hours later. That delay is the currency you pay contributors in, and you
have an infinite supply of it.

Governance: **estate stewards**, paired, term-limited, logged. Data: **openly licensed in
aggregate**, so the commons cannot be enclosed — including by you.

That is the system. It is unusually cheap, because every expensive part of the conventional design
(verification bureaucracy, payments, inventory acquisition, a native app) has been deliberately
removed.

---

## Part 5 — Where to begin: the next 30 days

No code in the first two weeks. None.

**Days 1–3 — Choose the estate.** One. Criteria in Q97; social roots outrank everything.

**Days 4–10 — Be the product, by hand.**
- Walk the whole estate. Photograph every TO LET sign. Build the list in a spreadsheet.
- **Run the ground-truth audit** (Q102, Q4): for each sign, search every portal. The resulting
  percentage is the most important number in this project.
- Interview 10 caretakers, 5 boda riders at one stage, 10 people who moved in the last 90 days.
  Ask Q3 (what did your search cost?), Q2 (how long?), Q46 (caretaker: what do you want?).
- Post the list — free, dated, honest — in the estate's existing Facebook/WhatsApp groups, same
  time every day.

**Days 11–20 — Close the loop manually.**
- Inbound reports via one WhatsApp number → Google Form → Sheet. Zero infrastructure.
- Enforce 7-day decay by hand. Mark *Confirmed today / Unconfirmed / Taken*.
- Ask every viewer the three post-viewing questions. Measure **arrival accuracy**.
- Ask every successful mover for the units they rejected (Q15). **Count how many say yes — this
  single conversion rate determines whether the whole model works.**
- Run the thank-you loop by hand: personally tell contributors when someone was housed.

**Days 21–30 — Decide on evidence.**
- Arrival accuracy, coverage %, reports-per-week, exit-interview conversion, inbound-vs-self-collected
  ratio.
- Check the kill criteria (Q111) honestly.
- Only now scope the thinnest possible software: a sub-300KB PWA for capture + alerts, a WhatsApp
  inbound bot, decay in the data model, standing-weighted confirmation. One estate. Still one.
- In parallel, two cheap legal conversations: the blacklist feature (Q64) and the
  not-an-estate-agent position (Q76).

---

## Part 6 — Decisions needed now

These are yours, not mine, and each one forks the design:

1. **Which estate?** (Everything downstream depends on it.)
2. **"Owned by the people": contributed + governed, or actual co-op equity?** My recommendation:
   contributed + governed now, stated honestly, equity question deferred.
3. **Commit permanently to never handling money and never taking commission?** My recommendation:
   yes — it is simultaneously your fraud defence, your regulatory position and your moat.
4. **Accept decay-by-default even when it makes the list look empty?** My recommendation: yes,
   non-negotiable; it is the differentiation.
5. **Is the goal a venture-scale business or a durable commons with adjacent revenue?** Answer this
   before you build, because it determines whether you are allowed to stay in the low-income market
   — and staying there is the whole point.

---

## Appendix — Sources consulted for market grounding

- [House Hunting Challenges in Nairobi: Red Flags and Realities — BuyRentKenya](https://www.buyrentkenya.com/discover/house-hunting-red-flags)
- [How Fake Rental Agents in Nairobi Actually Operate — Renters Hub](https://www.rentershub.co.ke/blogs/how-fake-rental-agents-in-nairobi-actually-operate-a-step-by-step-breakdown-of-the-scam-system/)
- [Housing scams surge in Nairobi's prime estates — Citizen Digital](https://citizen.digital/article/housing-scams-surge-in-nairobis-prime-estates-as-foreign-demand-rises-n371915)
- [Rental Scams in Kenya: Fake Listings, Deposit Fraud, Ghost Agents — Spaceyako](https://www.spaceyako.com/insights/rental-scams-kenya-how-to-avoid)
- [12+ House Hunting Scams In Nairobi — Tenantt](https://tenantt.co.ke/common-house-hunting-scams-in-nairobi/)
- [4 Rentals Scams to Avoid in Kenya — Fedha Rentals](https://fedharentals.co.ke/4-rentals-scams-to-avoid-in-kenya/)
- [Kenya's Best Real Estate Websites: an in-depth comparison](https://commercialpropertykenya.com/kenyas-best-real-estate-websites-an-in-depth-comparison/)
- [Reemio launches marketplace to end Kenya's house-hunting headache — Soko Directory](https://sokodirectory.com/2026/09/reemio-launches-virtual-marketplace-to-end-kenyas-house-hunting-headache/)
- [Estate Agents Act 1984 (Cap 533) — Kenya Law](https://new.kenyalaw.org/akn/ke/act/1984/17)
- [Steps in registering with the Estate Agents Registration Board](https://estateagentsboard.or.ke/steps-in-registering-with-estate-agents-registration-board/)
- [52 million smartphones now power Kenya's mobile broadband market (CA data, June 2026)](https://techtrendske.co.ke/2026/09/19/52-million-smartphones-kenya-mobile-data/)
- [Smartphone usage surges in Kenya as connected devices reach 52.3 million — Citizen Digital](https://citizen.digital/article/smartphone-usage-surges-in-kenya-as-connected-devices-reach-523-million-n391282)
- [Kenya data protection: getting ready for registration — Bowmans](https://bowmanslaw.com/insights/kenya-data-protection-getting-ready-for-registration/)
- [Data Protection in Kenya — DLA Piper](https://www.dlapiperdataprotection.com/?c=KE&t=law)

*Figures from commercial blogs (viewing fees, listing counts, portal "safety scores") are anecdotal,
not audited. The ground-truth walk in Part 5 replaces all of them with your own measurements.*
