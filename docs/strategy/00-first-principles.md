# Mitasafi — Thinking It Through

*A fresh look at the house hunting problem in Kenya. Written without looking at any code or past decisions.*

Date: 2026-10-19

---

## Part 0 — The main idea, in short

**Houses are already listed online. Lots of them.** Property24 Kenya has about 326,000
listings. Jiji has about 47,000. BuyRentKenya, Facebook groups, WhatsApp groups — there is no
shortage of ads.

So what is missing?

**A list of empty houses that is true today, in the price range most Kenyans actually pay** —
about KSh 4,000 to KSh 30,000 a month. Pipeline, Githurai, Kayole, Umoja, Donholm, Zimmerman,
Kahawa, Rongai, Kitengela. And the same kind of places in Mombasa, Nakuru, Eldoret, Kisumu, Thika.

For those houses, the information lives in only four places:

1. A paper sign taped to a gate
2. The caretaker's head
3. An agent's WhatsApp group
4. A neighbour's gossip

Now here is the part that explains everything else:

> **The missing information is not a mistake. It is what the agent is selling.**

The agent makes money because you don't know where the empty houses are. That is the whole
business. The KSh 500 to KSh 3,000 "viewing fee". The one month rent commission. All of it comes
from you not knowing.

So if you build something that shows everyone where the empty houses are, you are not filling a
gap. **You are taking away the income of the only people who have the information.**

That is why this problem is still here. Everyone who tried either:

- Ignored the agents, and then had no houses to show, or
- Worked with the agents, and ended up with the same old mess: old listings, fake listings, and a
  fee before you can see a door.

**If your plan does not answer that one sentence, it is not a plan yet.**

---

## Part 1 — What the problem really is

Let's be exact. Someone looking for a KSh 12,000 one bedroom in Embakasi hits **six separate
problems**. Most apps only fix the first one.

| # | Problem | What it costs you |
|---|---------|-------------------|
| 1 | **You can't find out what is empty** near you, at your price | 3 to 6 weekends of walking |
| 2 | **The information is old.** The house was taken 4 days ago. The sign is still up. The ad is still online | Wasted trips, wasted matatu fare |
| 3 | **Someone is blocking the door.** The person with the list wants KSh 500–3,000 before you see anything | KSh 1,500–5,000 just to search |
| 4 | **Fake people.** The "agent" is not the agent. Your deposit is gone | KSh 5,000–60,000. Sometimes everything |
| 5 | **The real price is hidden.** 12k becomes 12k + water + garbage + service charge + goodwill | Your budget breaks after you sign |
| 6 | **You need too much cash at once.** Rent + deposit + agent fee = about 3 months rent, in cash | This is the real reason people stay in bad houses |

Look at what this means. **Finding houses is the smallest problem.** A perfect search app fixes
row 1 and leaves rows 2 to 6 exactly as they are. That is why every search app built for this
market has not changed how people behave. People still walk.

Three things make this data different from anything else you might build:

**1. Every estate is its own small market.**
This is not one market. It is thousands of tiny ones. Having many houses in Kilimani helps a person
in Githurai 45 exactly zero. You need enough houses **in each estate**, not in each city. So the
normal plan of "launch in one city" is the wrong shape for this problem.

**2. The information goes bad in days.**
A bedsitter in Pipeline is taken in 2 to 10 days. A list of empty houses becomes rubbish in two
weeks if nobody checks it again. Every listing site in Kenya is full of houses that were taken long
ago. That is exactly why people don't trust them.

**3. Only the bad houses get posted.**
A landlord whose houses are almost always full does not advertise. Who advertises? People with
houses nobody wants — too expensive, bad location, new block, problem building. So the houses on
the portals are the ones everybody already refused. The user looks, sees rubbish, and says "those
sites are useless." Then goes back to walking.

**So: the thing you are selling is not a big list. It is a list that is true today, and honest
about what it doesn't know.** Nobody else sells that. And it costs nothing but discipline.

---

## Part 2 — Why has nobody fixed this? Seven real reasons

Not "nobody thought of it." Each of these is a real wall.

**1. You have to start again in every estate.**
You cannot start "Nairobi." You start Pipeline. Then Githurai 44. Then Githurai 45. Then Kayole
Soweto. Each one has its own caretakers, its own WhatsApp groups, its own prices. That is about 100
times more work on the ground than a normal startup. Funded teams try to buy their way out with
ads, get a thin spread over the whole city, and die saying "we have 4,000 listings but nobody finds
a house."

**2. Old information destroys trust faster here than anywhere else.**
A wrong restaurant listing is annoying. A wrong house listing costs someone a 90 minute matatu trip
and KSh 200 of fare. They will never trust you again. **You get about one wasted trip of credit per
user.** The portals used theirs years ago.

**3. The money does not work at the bottom of the market.**
A KSh 8,000 house cannot pay for a KSh 2,000 cost of getting a customer. The money changes hands in
cash or personal M-Pesa, off your platform, where you can't see it. The only way to sit in the
middle is to hold deposits yourself — which is regulated, needs capital, and is distrusted by
exactly the people you want to help. So there is no obvious way to earn. No way to earn means no
investor. No investor means nobody builds it. Everyone drifts up to Kilimani where a KSh 150,000
house pays a real commission.

**The 90% of the market is not served because it is hard to fund, not because it is impossible.**

**4. You cannot check who someone is using papers.**
Anyone can say they represent any building. There is no public list you can search to find out who
the landlord of a block is. Ardhisasa handles land records, not rent, and it is not open. The Estate
Agents Registration Board has a list, but only of licensed agents — a tiny slice of who is actually
renting out houses in Kayole. So checking people **cannot be done with documents.** It has to be
done by people, on the ground. Every team that tried "upload your title deed" got stuck at about 1%
of houses.

**5. The people with houses have no reason to post them.**
The landlord doesn't need you. The caretaker already gets small tips from the agent. The agent makes
money from keeping it quiet. So at the bottom of this market, nobody will come and post their own
house. **The houses have to come from somewhere else.** (Part 4 says where.)

**6. Everyone built a search box. This is a message problem.**
People in this market do not browse. They cannot afford to — data costs money, and the house will
be gone in days anyway. What they need is simple: *"the moment a one bedroom under 12k opens in
Donholm, text me."* That is an alert system, not a catalogue. Build a catalogue for an alert problem
and you get something that works but nobody uses.

**7. Wrong channel.**
Kenya now has about 52.3 million smartphones against 27.4 million basic phones (Communications
Authority, June 2026). So most people have a smartphone — but data is counted carefully, and
WhatsApp is where people live. The portals ship heavy apps full of photos and 20MB Play Store
downloads. Every megabyte is a gate. And each gate blocks exactly the person who needs the thing
most.

**Put together:** the data is held by people who earn from hiding it, the users cannot pay, the
information goes stale in days, every estate is separate, and you cannot check anyone with
paperwork. That is why it is unsolved. It is not a technology problem.

---

## Part 3 — 112 questions, each with an answer

Each one is marked:
- **[A]** = can be answered now, by thinking
- **[F]** = go and find out — this needs field work
- **[B]** = a guess to test, with the cheapest test named

### A. The problem itself (1–12)

1. **Who exactly is the user?** **[A]** Not "Kenyans." Three different people. The *person under
   pressure* (has 30 days notice, must find something, will act now). The *window shopper*
   (looking for months, no rush). The *newcomer to the city* (most at risk of being cheated, no
   local network). **Build for the person under pressure.** They are the only one who will change
   their behaviour, and the only one who will help you on their way out.
2. **How long does a search really take?** **[F]** My guess: 2 to 6 weekends, 8 to 20 houses seen.
   Go measure it. If it's 3 days, there's no problem worth solving.
3. **How much does a search cost in shillings?** **[F]** My guess: KSh 1,500 to 6,000 (fares +
   viewing fees + agent fee). Ask 30 people who moved in the last 3 months. **This number is your
   whole pitch.** If you can say "the average person in Embakasi pays KSh 4,200 to find a house,
   Mitasafi costs nothing," you have a product.
4. **What share of empty houses ever appear online?** **[F]** My guess: under 10% in normal
   estates. Test it: walk one estate, count signs, search each one online. **Do this. It will be
   the most convincing thing you ever show anyone.**
5. **Is it hard to find any house, or hard to find the right house?** **[A]** At the bottom of the
   market it is hard to find *any* empty house that matches three things: price, estate, number of
   rooms. Fancy filters (parking, balcony, pets) are for rich people. Don't build them.
6. **Is it a housing shortage or an information problem?** **[A]** Both, but you can only fix the
   second. And that's worth a lot: empty houses and desperate people exist at the same time, less
   than 2km apart. That is pure information failure. That is your opening.
7. **What one number proves you worked?** **[A]** How many people moved into a house. Not users.
   Not listings. (See questions 100 and 101.)
8. **When is the pain worst in the year?** **[F]** Guess: December–January (school year, people
   moving after holidays) and the end/start of every month. This decides when you launch.
9. **Does more listings ever help?** **[A]** No. Past about 20 fresh houses per estate per week,
   more just adds noise. Stop chasing volume early.
10. **What will a seeker pay?** **[A]** Nothing, really. Any charge you add recreates the agent fee
    you are trying to kill, and destroys the good name that makes people join. **Free, forever, and
    say it loudly.**
11. **Would they give something else instead of money?** **[B]** Yes — their *effort*. They will
    report back and add houses. Test: out of 50 people you alert, how many tap one button after a
    viewing to tell you what they found?
12. **What does the seeker fear most?** **[F]** Guess, in order: losing deposit money, wasted
    trips, being overcharged for being new, and — for women viewing alone — personal safety. If
    safety is in the top three, it must be a real feature, not a note at the bottom.

### B. Where the houses come from (13–28)

13. **Who actually knows what is empty?** **[A]** In order of value: **the tenant who is moving
    out** (knows 30 to 60 days early — the earliest and most valuable signal there is, and nobody
    is collecting it). Then the **caretaker / mlinzi**. Then the informal agent. Then neighbours,
    **boda boda riders**, shopkeepers, mama mboga.
14. **Who knows and has nothing to lose by telling you?** **[A]** Tenants moving out, neighbours,
    boda riders, shopkeepers. **These are your suppliers.** Not landlords. Not agents.
15. **What is the best source nobody is using?** **[A]** **The person who just found a house.**
    They saw 5 to 15 houses and said no to most of them. Those houses are empty *today*, with real
    prices and the caretaker's real number. So ask them on their way out: *"Congratulations, you
    found a place. Which houses did you see and not take? Someone behind you needs them."*
    It turns the happiest moment into supply. It costs nothing. And it is the best quality data in
    the whole system. **Build the product around this one loop.**
16. **Why would a boda rider help?** **[A]** He rides every lane of his estate every day. He sees
    every sign. He knows every gate. He has M-Pesa. He has free time at the stage. And riders are
    already organised into stages with a chairman you can go and talk to. They are the
    best organised network in Kenya that nobody is using. Pay them in respect first, small airtime
    later. Cost to start: one conversation with one chairman. **[F]** Have that conversation in
    week one.
17. **Why would a caretaker help, when the agent tips him?** **[A]** Because what he really wants
    is **fewer time wasters and a faster let**, and the agent's tip is small and irregular. Offer
    him: ready tenants sent to him, a 30 second way to post by WhatsApp, and **a public rating that
    follows him to his next job.** A good name is the one thing a caretaker can never build today.
    That is a real gift.
18. **Why would a landlord bother?** **[A]** Mostly he won't, and that's fine — don't build for him
    at the start. The ones who will: owners of new or hard to let blocks, owners living abroad who
    don't trust their agent, and owners of 5+ houses who feel the cost of empty months. Their pain
    is **empty months and not trusting their agent** — not listings.
19. **Do you fight agents or recruit them?** **[A]** Neither. **Change what they sell.** Offer the
    honest ones *many tenants instead of a big fee*: a verified profile, free leads, public
    ratings. The good ones join. The fee collectors get rated out by the crowd. Declaring war on
    "agents" as a group is both unfair (many are useful) and stupid (they have the data).
20. **Will agents attack you?** **[A]** Yes. Expect fake listings, fake "already taken" marks on
    rivals' real houses, and mass flagging. Build moderation that can't be used as a weapon from
    day one (Part 5).
21. **Can you copy listings from the other sites to get started?** **[A]** Easy to do. Terrible
    idea. You would import their old data, their fake listings and their rubbish houses — and
    destroy the one thing that makes you different. **Don't.** (Also, their terms forbid it.)
22. **What is the basic thing you store?** **[A]** Not the listing — **the building**. Buildings
    stay put: one block = 20 houses, one gate, one caretaker, one check. Listings come and go. If
    you store buildings, you check once and reuse forever, and you slowly build something valuable:
    a real map of blocks in estates that have no street addresses. **This is the most important
    technical decision in this whole document.**
23. **What is the smallest report that is still useful?** **[A]** Photo of the gate or sign (taken
    now, in the app), GPS, estate, type of house, asking price, and **the number as written on the
    sign**. Six things. Ask for more and people stop reporting.
24. **Should the reporter's own number be the contact?** **[A]** **No.** This is the most important
    anti-fraud decision. See question 52.
25. **What about houses with no sign?** **[A]** Those come from tenants and caretakers. Mark them
    differently — they are more valuable (earlier) but have less proof (no photo of a sign), so
    they need a named reporter with a track record.
26. **What about "moving out in 3 weeks"?** **[A]** The most valuable thing in the system, and
    nobody sells it. A person with 30 days notice matched to a house with 30 days notice is a clean
    trade. Keep these separate from "empty now."
27. **Can a tenant get hurt by reporting their own move?** **[A]** Yes. A landlord might punish
    them, or re-let the house before they leave. So these reports must be anonymous by default, and
    must never show who the current tenant is. Handle with care.
28. **How many houses per estate per week is enough?** **[B]** Guess: 15 to 25 fresh houses a week
    makes an estate feel alive. Test it by hand in one estate before writing any code.

### C. "Owned by the people" — what that actually means (29–38)

29. **Which meaning do you intend?** **[A]** Three very different things get called this:
    **(a) people supply the data** (like Waze or Wikipedia — users add and fix things, you run it);
    **(b) people govern it** (estate level moderators with earned authority);
    **(c) people own shares** (a co-op, revenue sharing, tokens).
    **My advice: do (a) and (b) now. Leave (c) for later.**
30. **Why not shares now?** **[A]** A co-op or SACCO is real legal and admin work. It needs money
    to share out, and you have none. And "token" talk sounds like a scam in exactly the market
    where you are trying to be the anti-scam name. It would eat the attention that should go into
    one estate's data.
31. **Isn't it dishonest to say "owned" without giving shares?** **[A]** It is if you suggest
    shares. It isn't if you are clear: *"this list belongs to the people who build it"* —
    contributors own the reputation, the rules and the benefit, and the data is open. Say that.
    Don't say "you are a shareholder." **Write this difference down publicly before you ever use
    the word "owned."**
32. **Could the data be a public good by licence?** **[A]** Yes, and it should be. Promise to
    publish the combined numbers (empty houses, prices by estate) under an open licence. It costs
    nothing, it's a real promise, and it means nobody can fence it off later — including you. That
    promise is itself worth trust.
33. **Who settles arguments?** **[A]** **Estate stewards** — volunteer moderators who live in the
    estate they moderate. Local knowledge spots a lie instantly ("there is no such block on that
    road"), it scales for free, and it makes "owned by the people" actually true instead of just a
    slogan.
34. **How do you stop stewards becoming small tyrants?** **[A]** Earn it by track record. Fixed
    terms. Two per estate, never one. Every decision written down and visible. Appeal to the next
    level up. Power that is written down is power that has limits.
35. **What stops a steward teaming up with an agent?** **[A]** The pairing, the public log, and the
    fact that being a steward is worth something — so losing it costs.
36. **Will people really help for free?** **[A]** Yes, if three things are true: it takes under 30
    seconds, the person who benefits is clearly someone like them, and **they are thanked in
    public, in their own area.** Miss any one of those and it dies.
37. **What are the exact words to use?** **[A]** Not "list your property." **"Umeona nyumba iko
    vacant? Tuma picha."** (Seen an empty house? Send a photo.) One photo. That's the whole ask.
38. **What's the bigger frame?** **[A]** This is the digital version of something Kenyans already
    do all day — harambee, chama, estate WhatsApp groups, telling a friend about an empty house.
    **You are not inventing a habit. You are giving an existing habit a wider reach.** That is
    true, and true things last.

### D. Getting people to join, without paying them (39–50)

39. **What is the strongest free reward?** **[A]** **Time.** People who contribute get new matching
    houses **immediately**. Everyone else gets them 6 to 12 hours later. You are paying people in
    the one thing this market values most, you have an unlimited supply of it, and it costs you
    nothing. **This is the single best idea in this document.**
40. **Doesn't that punish new users?** **[A]** A *hard* lock would kill you — a scared newcomer must
    get value on day one or you have no network. A *delay* does not. Everyone gets everything.
    Contributors just get it first. Nobody is shut out, and the head start is valuable enough to
    change behaviour.
41. **Do points work?** **[A]** Weakly on their own. **Counting real results works:** *"7 families
    found a home because of you."* Count outcomes, not clicks.
42. **Do leaderboards work?** **[A]** Only small ones. "Top contributor in Kenya" means nothing.
    "Mlinzi wa Pipeline" or "Mtaa Captain, Githurai 44" means a lot, because in Kenya your
    reputation is local. Keep every board small enough that the person at the top is someone you
    might actually meet.
43. **What is the single best moment of recognition?** **[A]** **The thank you.** When someone
    confirms they moved in, tell the person who reported that house: *"Someone got a home from the
    house you posted in Kayole."* This is what keeps these systems alive. Build it before you build
    filters.
44. **Should you pay cash?** **[A]** Not at the start, and never per post. If ever: **KSh 20 to 50
    for a house that was real and that someone actually moved into.** Pay for results or you will
    be funding a spam farm within a week.
45. **What else besides cash?** **[A]** Airtime or data bundles (cheap, feels like money, very well
    liked in Kenya). Telco sponsored bundles (a partnership, later). A branded reflective vest or
    cap for boda reporters (about KSh 300, high visible status, and it advertises for you). A weekly
    draw is cheap but looks like gambling — probably skip it.
46. **What does a caretaker want that isn't money?** **[F]** Guess: fewer time wasters, a faster
    let, and respect. **Go and ask ten of them. That one afternoon is worth more than any amount of
    planning.**
47. **What does a boda rider want?** **[F]** Guess: a fare. Notice the neat fit — the person who
    shows you the house also moves your bed. The riders may care more about the moving job than any
    reporting fee. That makes the reward pay for itself.
48. **How do you keep reports honest once there are rewards?** **[A]** Only reward houses that
    other people confirmed and that someone actually moved into. Cap rewards per person per week.
    And make the status (which is what really motivates people) something they lose if they lie.
49. **How do you avoid gamification that feels insulting?** **[A]** No cartoon badges for serious
    work. Titles should be ones a grown person would say out loud in their own estate.
50. **What makes someone come back on day 30?** **[A]** The thank you (43), and standing in a place
    they actually live. Nothing else survives month two.

### E. Fraud — the hardest part (51–68)

51. **What kinds of fraud are there, exactly?** **[A]** Eight different ones. Each needs its own
    defence, so never talk about "scams" as one thing:
    1. **Fee before viewing** — KSh 500 to 3,000 "viewing fee" or "commitment fee". Most common.
    2. **Deposit theft** — not the owner at all. Takes your deposit and rent and disappears. Worst
       harm.
    3. **House doesn't exist** — photos copied from another site or from Pinterest.
    4. **Deliberately old listing as bait** — "12k in Donholm" kept online forever to make you
       call, then he shows you an 18k house. **The most damaging one, because it looks normal.**
    5. **Renting one house to several people** — takes deposits from four people for one house.
    6. **Pretending to be Mitasafi** — "I'm from Mitasafi, send KSh 200." Stop this early or it
       kills you.
    7. **Lying about the price** — 12k advertised, then 12k + water + garbage + service charge.
    8. **Rivals sabotaging you** — marking real houses as fake or taken.
52. **What is the one big structural defence?** **[A]** **Keep the reporter separate from the
    contact.** What you store is: *"this house looks empty, here is the gate, here is the number
    **as written on the sign**"* — never "call me." What this does:
    - A fraudster has no way to insert himself into the chain.
    - The proof is in the photo — the number is painted on the wall.
    - Any report whose contact number does not appear in its own photo is automatically suspicious.

    **This one decision removes the money-making basis of fraud types 1, 2 and 3.**
53. **How do you kill fake houses cheaply?** **[A]** **Camera only.** Photos must be taken right
    there in the app, with GPS and the server's clock. No uploading from the gallery for new
    accounts. Copied photos simply cannot get in. Extra cost: zero. Allow gallery uploads only for
    people with a track record.
54. **How do you kill the fee scam?** **[A]** Make it a rule everyone knows, and repeat it
    everywhere — on every listing, in every alert, in the name itself: **"Mitasafi is free. Nobody
    should ever ask you for money before you are standing inside the house. If they do, report
    them."** Saying one sentence a million times is the cheapest security you can buy.
55. **Should you ever hold money?** **[A]** **No.** No escrow, no deposits, no fees. The moment you
    touch money you (1) become a target, (2) need licences, (3) become responsible for other
    people's losses, and (4) lose the clean claim above. **A platform that never touches money
    cannot be used for a payment scam.** Make "we never touch your money" a permanent rule.
56. **So who checks things?** **[A]** Three different questions, three different answers. Mixing
    them up is how platforms over-promise:
    - *Is the house empty?* → **the crowd**, by other people confirming, and by listings expiring.
    - *Is this person who he says he is?* → **the crowd plus stewards**, on the ground.
    - *Does he legally own it?* → **nobody can check this, and you must say so plainly.**
57. **How does crowd checking actually work?** **[A]** Trust goes up when **different people
    confirm the same thing** — more if they have a good record, much more if they physically went
    there. *"3 people confirmed this was empty today"* is worth more to a seeker than any document,
    because it answers the question they actually have.
58. **How do you handle old listings honestly?** **[A]** **Every listing dies after 7 days unless
    someone confirms it again.** And the status is always visible, one of three things:
    **Confirmed today / Not confirmed for n days / Reported taken.** This turns old data from a
    hidden fault into an honest signal. *Showing what you don't know is the trust product.* The
    portals cannot copy this, because their listing numbers would collapse. That is why it protects
    you.
59. **Won't that make the app look empty?** **[A]** Sometimes, yes. **Accept it.** An honest short
    list beats a dishonest long one — the long one is the reason nobody trusts the portals. Hold
    this line even when it hurts. It is the whole difference.
60. **How do you check people without documents?** **[A]** Check **buildings, once** — not
    listings. A steward checks a block one time and 20+ houses are covered forever. Proof you can
    actually get: a rent receipt, a utility bill, a steward's visit, or three separate tenants
    saying "yes, that's the caretaker." Cheap, because one check covers the building's whole life.
61. **What stops someone making 50 fake accounts?** **[A]** Kenyan SIMs are registered to an ID, so
    a number costs something real to get. Limit new numbers hard. Hold a new person's first three
    reports until someone else confirms them. Use the device as a weak extra signal.
62. **What is the report-back loop?** **[A]** Your main checking engine. After someone views a
    house, one tap: *Was it empty? Was the price right? Did anyone ask you for money?* That third
    question is **a fraud radar across the whole market**, built for free by people who were going
    to view the house anyway.
63. **Should there be a list of scam phone numbers?** **[A]** Yes — and it might be the strongest
    standalone thing in this whole project: *"check this number before you call."* Almost free,
    useful immediately, spreads on its own, and helps even people who never use your listings.
64. **What's the legal risk of that list?** **[A]** Real. Defamation, and the false publication
    parts of the Computer Misuse and Cybercrimes Act 2018. Protect yourself with: proof needed
    (several separate complaints, never one), neutral wording ("3 users reported being asked for a
    fee before viewing" — not "fraudster"), a way to appeal, and quick removal if someone proves
    you wrong. **Have a lawyer look at this one feature before you launch it.** Don't guess here.
65. **How do you stop people weaponising the "report" button?** **[A]** Flagging costs you
    standing. A flag from someone with no record counts for little. "Taken" claims that look like
    they come from a rival agent get held back. And the original reporter gets a chance to confirm
    again before you remove anything.
66. **What if the house is real but the price is a lie?** **[A]** Collect the *real* price when
    someone confirms they moved in, and show the gap. Over time you own something nobody else has:
    **the actual rents people pay, by estate** — not asking prices. (Quietly valuable. See Part 6.)
67. **How do you stop people pretending to be you?** **[A]** One permanent loud rule ("we never ask
    for money, ever, for anything"), one official channel, staff and stewards listed publicly and
    checkable inside the product, and a fast public log when something happens.
68. **What if someone gets cheated anyway — are you liable?** **[F]** Get advice. Your position: you
    are an information service. You don't take money and you don't act for any landlord. That is a
    much better place to stand than a platform taking commission. But get it in writing, early,
    and cheaply.

### F. Privacy, safety and the law (69–82)

69. **Why does a seeker need to stay anonymous?** **[A]** Several real reasons. A woman searching
    alone. Someone whose current landlord must not know they are leaving. Someone escaping an
    abusive partner. And plain price protection — show your budget or your accent, and the price
    moves.
70. **How anonymous can they be?** **[A]** Completely, for searching and alerts. No account needed
    to look. A phone number only for alerts, and **never shown to anyone, ever.** The seeker's
    number should be technically unable to reach a lister.
71. **Should you build tenant profiles?** **[A]** **No.** Collecting ID, income, employer and
    payslips turns the power against the person you are serving, and creates a pile of data that
    hurts real people if it leaks. Refuse this even when landlords ask. **Especially** when
    landlords ask.
72. **What is the smallest data set you can run on?** **[A]** Building, type of house, asking price,
    status, dates, reporter's record, photo. That is a boring data set — and boring data sets don't
    ruin lives when they leak. **Design for the leak you will eventually have.**
73. **Is someone's budget sensitive?** **[A]** Yes. A seeker's budget must never be visible to a
    lister. It is ammunition in a price negotiation.
74. **What safety features matter at viewings?** **[A]** "Share my viewing" — send the location,
    time and house to a friend you choose. Daylight hours advice. A nudge not to go alone. And a
    record of "I am viewing house X now" so there's a trail if something happens. Cheap to build,
    and it is the feature people will tell their friends about.
75. **Does the Data Protection Act 2019 apply?** **[A]** Yes. Collecting phone numbers at scale
    makes you a data controller. Whether you must register with the ODPC depends on turnover and
    staff numbers (reported around KSh 5m turnover / 10 staff, and the law firms disagree on
    whether you need both or either), plus rules for certain sectors. **Read the regulations
    yourself. Don't rely on summaries, including this one.** Either way: have a lawful reason to
    collect, write a plain language notice in English and Kiswahili, honour people's rights, and
    name a contact person. All free, and doing it well is itself a trust signal.
76. **Does the Estate Agents Act make you an estate agent?** **[A]** Practising as an estate agent
    for a fee needs EARB registration and a current licence. A free information service that takes
    no commission, negotiates nothing and acts for nobody sits well outside that — **and this is a
    second, separate reason never to take a commission.** Confirm with a lawyer, but design for it
    now.
77. **Any other legal risk?** **[A]** Defamation and cybercrime (the scam number list, q64).
    Consumer protection in what you claim — **don't say "verified" when you mean "recently
    confirmed."** That's a discipline problem as much as a legal one. And copyright in copied
    photos, which is one more reason for camera only.
78. **Should you register a company first?** **[A]** No. Prove the loop by hand in one estate first.
    A company that exists before one person has found a house through you is a distraction.
79. **Does open data clash with privacy?** **[A]** No, if what you publish is combined and at
    building level: how many houses are empty and what prices look like by estate, with no personal
    data. That is both publishable and useful.
80. **Who owns a contributor's photo?** **[A]** They do. You get permission to use it. Say that in
    one plain sentence, at the moment they upload.
81. **What about children or vulnerable users?** **[A]** Don't collect ages. Don't build anything
    that needs them.
82. **What is the nightmare privacy scenario?** **[A]** A database that says "person X wants to
    leave building Y and has a budget of Z" — and it leaks. **Never build that record.** The design
    should make it impossible, not just forbidden.

### G. Channel, product, technology (83–96)

83. **Should version one be an app?** **[A]** **No.** Version one is you, a phone, a pair of shoes
    and a spreadsheet. (Part 5.)
84. **WhatsApp or an app?** **[A]** WhatsApp for reports coming *in* — everyone is there, sending a
    photo and a location is built in and free, and it needs no code. A broadcast channel for
    sending *out*. A small web app only once the manual version clearly works.
85. **WhatsApp or Telegram for broadcasting?** **[A]** WhatsApp has the people. Telegram has
    unlimited broadcast, lighter data use and public links. Use both — WhatsApp for reports in, and
    a WhatsApp Channel plus a Telegram channel per estate for sending out. Then pick by what people
    actually open, not by what you prefer.
86. **Why not a proper Android app?** **[A]** A Play Store install is a gate. 20MB of someone's
    bundle is real money. And cheap phones punish heavy apps. A web app under 300KB installs to the
    home screen, works offline, and costs nothing to give out.
87. **What about SMS or USSD for basic phones?** **[A]** 27.4 million basic phones is real. But a
    shortcode costs real money to set up and run. **Leave it for later** and serve those people
    through someone who has a smartphone — the boda rider, the shopkeeper, the steward. A person
    passing on the message beats infrastructure you can't afford.
88. **Can it really cost zero to run?** **[A]** Yes, for a long time. Free hosting tiers, a free
    database tier, hard photo compression (40KB thumbnails), no video. The honest exceptions: SMS,
    shortcodes, a domain, and legal advice. Budget for those four and nothing else.
89. **Search or alerts?** **[A]** **Alerts.** A standing request — estate, max price, type of house
    — and a message when something matches. Search is secondary. (Reason 6, Part 2.)
90. **How do you show what you're unsure about?** **[A]** Make freshness the biggest thing on the
    screen — above the price, above the photo. "Confirmed 2 hours ago by 3 people" is your
    headline. No competitor's screen can lead with that.
91. **What's the hardest design problem?** **[A]** A 30 second report, on a bad connection, with one
    hand, standing at a gate, in the rain. Work on that one screen obsessively. The entire supply
    side lives or dies there.
92. **What language?** **[A]** Kiswahili first in the voice, English available. Sheng where it is
    natural, never where it is forced. *"Umeona nyumba vacant?"* is the product.
93. **Map or list?** **[A]** List and alerts first. Maps eat data, and most of these estates have no
    usable addresses anyway. Build the building list (q22) and maps become possible later for free.
94. **Does it need to work offline?** **[A]** Yes, for reporting. Take the photo at the gate, hold
    it, send when there is signal. A report lost to a dead connection is a contributor lost.
95. **How do you stop the database becoming a graveyard?** **[A]** Expiry built into the data
    itself, not the screen (q58). Make it structurally impossible to show a three week old
    unconfirmed house as current.
96. **Any AI?** **[A]** A little, later. Spotting the same gate reported twice. Reading the number
    and price off a photo of a sign. Flagging patterns that look like fraud. **Not a chatbot.**
    Nobody needs a chatbot to find a bedsitter.

### H. Strategy, money, risk (97–112)

97. **Where exactly do you start?** **[A]** **One estate.** Not Nairobi, not a county — one estate.
    Pick it on: many houses close together, people moving often, low or middle rent, walkable, many
    signs, a busy boda stage, and **somewhere you or a partner actually knows people.** That last
    one matters more than all the others.
98. **Why one estate?** **[A]** Because every estate is its own market (reason 1), and because one
    estate is small enough to serve **completely, by hand**. Covering one estate fully is a product.
    Covering Nairobi thinly is a demo.
99. **When do you expand?** **[A]** When the estate runs itself: more reports come in than you
    collect yourself, and your accuracy stays above about 80% for a month without you touching it.
    Expand by copying the method with a local steward — never by switching on a region in a
    database.
100. **What is the one number that matters?** **[A]** **How many people moved into a house.**
     Families housed. Everything else is just measurement.
101. **What's the main day-to-day number?** **[A]** **Arrival accuracy** — of the people who
     travelled to see a house, what share found it actually empty and at the stated price. Above
     80% and the thing grows by word of mouth alone. Below 50% and no marketing will save it.
102. **How do you measure coverage?** **[A]** **The walk.** Once a month, walk a fixed route, write
     down every sign, and compare it to your database. Coverage = what you had ÷ what was there.
     **Nobody in this industry measures this.** It's cheap, it's honest, and it would be the most
     believable thing you could ever claim.
103. **Cheapest way to get your first 100 seekers?** **[A]** Post a free, fresh, honest list in the
     estate's existing Facebook and WhatsApp groups, at the same time every day. You don't need to
     build an audience. The audience is already sitting there, already asking.
104. **What makes it spread?** **[A]** One sentence passed between friends: *"there's a list, it's
     free, and it's actually today's."* Nothing else. Make sure that sentence stays true.
105. **Will the big portals just copy you?** **[A]** They can copy features. They cannot copy
     expiring listings (their numbers would collapse). They cannot copy "we never take a commission"
     (that's their income). And they cannot copy a network of people who help because you are not
     taking from them. **What protects you is the rules you've tied yourself to, not your code.**
106. **How does this ever make money without betraying the idea?** **[A]** Never from seekers.
     Never a commission. Best candidates, roughly in order of fit:
     - **Moving** — everyone who moves needs a boda or a pickup, and your reporters *are* the
       riders. This pays for itself.
     - **Internet and utility connections** — ISPs pay real money per connected home, and you know
       exactly who just moved in.
     - **Tools for landlords** to fill empty months.
     - **Deposit loans with SACCOs** — this attacks problem #6, the real reason people stay in bad
       houses.
     - **Rent price data** — Kenya has no trustworthy rent index. Banks, developers, researchers
       and county governments would value one.
107. **What's the most valuable thing you end up owning?** **[A]** Not the listings. **The building
     list** — a checked, photographed, located record of residential blocks in estates that have no
     street addresses. Plus the real rent prices over time. Both come free, as a side effect of
     doing the main job honestly.
108. **How does this die?** **[A]** Five ways, most likely first:
     1. **You burn out doing it by hand** → don't leave the first estate until it runs itself.
     2. **It becomes a graveyard** → never relax the 7 day expiry.
     3. **A fraud story in the news** → never touch money, keep a public incident log.
     4. **Agents poison the data together** → weight by track record, use stewards.
     5. **No money and attention fades** → design it to cost almost nothing, so it can survive
        small instead of needing to be big.
109. **Is this a business or a public service?** **[A]** Be honest: it looks much more like **a
     public service with some side income** than a big startup. That is not a lesser thing. And
     accepting it sets you free, because it stops you drifting upmarket — which is what killed
     everyone before you.
110. **What must you never compromise?** **[A]** **Free for the seeker, and honest about how fresh
     the data is.** Those two *are* the product. Everything else can change.
111. **What would make you stop?** **[A]** If the walk shows more than 60% of empty houses are
     already findable online. Or if people who moved say their search cost under KSh 500 and took
     under a week. Then the problem is smaller than it feels — and you want to find that out in
     week two, not year two. **Decide your stopping rule before you start.**
112. **What is the very first thing to do?** **[A]** Walk one estate tomorrow and photograph every
     TO LET sign you can find. Everything else in this document comes after that walk.

---

## Part 4 — The answer that comes out of all this

Not a marketplace. **A network of people reporting empty houses.** Four parts:

**1. A way to report that takes almost no effort.**
One photo of a gate or sign. Taken in the app. With GPS. With the number *as painted on the wall*.
Not "list your property." **"Umeona nyumba vacant? Tuma picha."**

**2. Houses that come from people with nothing to lose.**
Tenants moving out (earliest news). **People who just found a house, telling you about the ones they
turned down** (best quality, free, and nobody is collecting it today). Boda riders (best organised
network in Kenya). Caretakers (changed from tip-takers into people with a public good name).
Shopkeepers. Neighbours.

**3. Trust built on people confirming and listings expiring — not on documents.**
Freshness is the headline. Status is always *Confirmed today / Not confirmed for n days / Reported
taken*. Trust grows when different people confirm, and most when someone actually went there. You
never claim to check who owns a house, because nobody can. **And you never touch money** — which
removes the engine of the two worst kinds of fraud.

**4. Messages, not a catalogue.**
Standing requests (estate + price + type), and an alert when something matches. Contributors get
alerted first. Everyone else a few hours later. That delay is how you pay contributors, and you have
an endless supply of it.

Who runs it: **estate stewards**, two per estate, fixed terms, every decision written down.
The data: **open, in combined form**, so nobody can fence it off — including you.

That's the system. It is unusually cheap, because every expensive part of the normal design —
checking documents, handling payments, buying inventory, building a big app — has been deliberately
removed.

---

## Part 5 — The first 30 days

No code for the first two weeks. None.

**Days 1–3 — Pick the estate.** One. Use the list in question 97. Knowing people there beats
everything else.

**Days 4–10 — Be the product yourself, by hand.**
- Walk the whole estate. Photograph every TO LET sign. Put them in a spreadsheet.
- **Do the walk audit** (q102, q4): search every sign you found on every portal. That percentage is
  the most important number in this project.
- Talk to 10 caretakers, 5 boda riders at one stage, and 10 people who moved in the last 3 months.
  Ask them q3 (what did your search cost?), q2 (how long did it take?) and q46 (caretaker: what do
  you actually want?).
- Post your list — free, dated, honest — in the estate's Facebook and WhatsApp groups. Same time
  every day.

**Days 11–20 — Close the loop by hand.**
- Reports come in on one WhatsApp number → a Google Form → a Sheet. No infrastructure at all.
- Enforce the 7 day expiry yourself. Mark each house *Confirmed today / Not confirmed / Taken*.
- Ask every viewer the three questions. Work out your **arrival accuracy**.
- Ask every person who found a house for the ones they turned down (q15). **Count how many say yes.
  That one number tells you whether this whole model works.**
- Do the thank you by hand — personally tell people when someone got housed because of them.

**Days 21–30 — Decide using what you learned.**
- Look at: arrival accuracy, coverage %, reports per week, how many movers shared their rejects,
  and how many reports came in versus how many you collected yourself.
- Check your stopping rule (q111) honestly.
- **Only now** plan the smallest possible software: a web app under 300KB for reporting and alerts,
  a WhatsApp bot for reports in, expiry built into the data, and confirmations weighted by track
  record. One estate. Still one.
- At the same time, two cheap lawyer conversations: the scam number list (q64) and the "we are not
  an estate agent" position (q76).

---

## Part 6 — Decisions only you can make

Each of these changes the design, so answer them before building:

1. **Which estate?** Everything else depends on it.
2. **What does "owned by the people" mean here** — people supply and govern it, or people hold real
   shares? *My advice: supply and govern, said honestly. Leave shares for later.*
3. **Will you promise, permanently, never to touch money and never to take a commission?**
   *My advice: yes. It protects you from fraud, keeps you out of agent licensing, and is the thing
   competitors can't copy.*
4. **Will you let listings expire even when it makes your list look empty?** *My advice: yes, no
   exceptions. It is the whole difference.*
5. **Is the goal a big business, or a lasting public service with some side income?** Answer this
   before you build. It decides whether you're allowed to stay in the low-rent market — and staying
   there is the entire point.

---

## Where the market facts came from

- [House hunting red flags in Nairobi — BuyRentKenya](https://www.buyrentkenya.com/discover/house-hunting-red-flags)
- [How fake rental agents in Nairobi operate — Renters Hub](https://www.rentershub.co.ke/blogs/how-fake-rental-agents-in-nairobi-actually-operate-a-step-by-step-breakdown-of-the-scam-system/)
- [Housing scams surge in Nairobi's prime estates — Citizen Digital](https://citizen.digital/article/housing-scams-surge-in-nairobis-prime-estates-as-foreign-demand-rises-n371915)
- [Rental scams in Kenya: fake listings, deposit fraud, ghost agents — Spaceyako](https://www.spaceyako.com/insights/rental-scams-kenya-how-to-avoid)
- [12+ house hunting scams in Nairobi — Tenantt](https://tenantt.co.ke/common-house-hunting-scams-in-nairobi/)
- [4 rental scams to avoid in Kenya — Fedha Rentals](https://fedharentals.co.ke/4-rentals-scams-to-avoid-in-kenya/)
- [Kenya's property websites compared](https://commercialpropertykenya.com/kenyas-best-real-estate-websites-an-in-depth-comparison/)
- [Reemio launches a marketplace to end Kenya's house hunting headache — Soko Directory](https://sokodirectory.com/2026/09/reemio-launches-virtual-marketplace-to-end-kenyas-house-hunting-headache/)
- [Estate Agents Act 1984 (Cap 533) — Kenya Law](https://new.kenyalaw.org/akn/ke/act/1984/17)
- [How to register with the Estate Agents Registration Board](https://estateagentsboard.or.ke/steps-in-registering-with-estate-agents-registration-board/)
- [52 million smartphones in Kenya (Communications Authority, June 2026)](https://techtrendske.co.ke/2026/09/19/52-million-smartphones-kenya-mobile-data/)
- [Connected devices reach 52.3 million — Citizen Digital](https://citizen.digital/article/smartphone-usage-surges-in-kenya-as-connected-devices-reach-523-million-n391282)
- [Getting ready for data protection registration in Kenya — Bowmans](https://bowmanslaw.com/insights/kenya-data-protection-getting-ready-for-registration/)
- [Data protection in Kenya — DLA Piper](https://www.dlapiperdataprotection.com/?c=KE&t=law)

**A warning about these numbers.** The viewing fees, listing counts and "safety scores" above come
from company blogs, not from audits. Nobody has checked them properly. Your own walk (Part 5)
replaces all of them with real numbers you measured yourself.
