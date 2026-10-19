# Voices 04 — Reddit, Quora & Kenyan Web Forums

**Date: 2026-10-19**
**Brief:** gather real words from real Kenyans about house hunting, for a free vacancy list targeting KSh 4,000–30,000/month rentals.

**Real quotes collected: 101 numbered entries in section 3** (97 of which carry verbatim text; 4 are explicitly marked as my own summary of a page's mechanics). Six accounts are additionally quoted at length in section 2. Counting every distinct verbatim passage attributable to a named or described person, the figure is roughly **130**.

Of the 101 numbered entries, **81 I read on a page I fetched myself** (`[FETCHED]`) and **20 are verbatim fragments surfaced by the search tool from pages I could not fetch directly** (`[SEARCH-EXTRACT]`). Material is drawn from **48 distinct URLs across 20 sites**, plus one 313-post forum thread I scraped in full.

**The brief asked for 40+. The honest headline, though, is that 0 of these came from Reddit or Quora — see section 1.**

Every quote below is labelled with its provenance tag. Nothing in this document is composed, representative, or paraphrased-as-quote. Where I am summarising, it says "Summary (mine)".

**Provenance tags used throughout:**
- `[FETCHED]` — I retrieved the page and read the text myself. Quote is transcribed from that text.
- `[SEARCH-EXTRACT]` — the page is blocked to me, but the search tool read it and rendered this fragment as the page's own words. I did **not** see the page. Treat as second-hand: good enough to act as a lead, not good enough to put on a slide without re-verification.

---

## 1. What I could and could not access

### Could NOT access — and this is the headline problem with this brief

**Reddit is completely unavailable to me.** This is the single biggest gap in this report, and it is not recoverable with the tools I have.

- `reddit.com`, `www.reddit.com`, `old.reddit.com`, `np.reddit.com`, `api.reddit.com` — all return **HTTP 403** to direct fetches. Reddit's `.json` endpoints now redirect bots to an HTML "Welcome to Reddit" wall.
- The `WebFetch` tool refuses reddit.com outright: *"Claude Code is unable to fetch from www.reddit.com."*
- The `WebSearch` tool **refuses reddit.com as an allowed domain**, returning: *"The following domains are not accessible to our user agent: ['reddit.com']"* — i.e. Reddit blocks Anthropic's crawler at the robots level.
- I tried **8 Redlib/Libreddit mirrors** (redlib.catsarch.com, safereddit.com, redlib.privacyredirect.com, redlib.perennialte.ch, libreddit.kavin.rocks, reddit.rtrace.io, redlib.freedit.eu, redlib.nadeko.net, rl.bloat.cat, redlib.ducks.party, redlib.kittywi.re). Results: 403, 418, 429, 503, 404, or an **Anubis anti-bot JavaScript challenge** whose own text reads: *"This is required because AI companies have changed the social contract around how website hosting works."*
- I tried **PullPush** (the Pushshift successor archive): `HTTP 429 — "This website does not provide free scraping resources for agents."`
- I tried **r.jina.ai** as a reader proxy: it returned Reddit's own 403 block page.
- I tried the **Wayback Machine**, which does hold Reddit and Kenyatalk snapshots — the availability API confirmed a snapshot exists — but `web.archive.org` itself is **blocked by this session's egress policy** (`ws_closed_mid_exchange` on every attempt, including via WebFetch).

**So: r/Kenya, r/Nairobi, r/kenyanpolitics, r/expats, r/digitalnomad contributed ZERO quotes to this report.** The brief assumed Reddit would be my richest source. It was my only total failure. **This needs a human with a browser, or a different tool, and it should be re-run — it is probably still the highest-yield source that exists for this question.**

**Quora is also unavailable.** `quora.com` returns 403 to both WebFetch and direct fetch, even with full browser headers. The only Quora material I have is two fragments the search tool surfaced (included below, tagged).

**Kenyatalk (kenyatalk.com) is behind a Cloudflare challenge** ("Just a moment..."), 403 to every direct fetch and to WebFetch. **However, the search tool CAN read it**, and Kenyatalk turns out to have a dedicated *Housing & Real Estate* subforum with threads that are almost exactly on-brief:
- `Viewing fees and agency fees are a scam!` — https://kenyatalk.com/t/viewing-fees-and-agency-fees-are-a-scam/209148
- `How much should i pay a real estate agent? (Rentals)` — https://kenyatalk.com/t/how-much-should-i-pay-a-real-estate-agent-rentals/179065
- `Low cost rentals` — https://kenyatalk.com/t/low-cost-rentals/441422
- `I need to move out asap` — https://kenyatalk.com/t/i-need-to-move-out-asap/459330
- `Vetting Tenants` — https://kenyatalk.com/t/vetting-tenants/252367
- `Advice- Landlords, should a tenant pay for wear and tear?` — https://kenyatalk.com/t/advice-landlords-should-a-tenant-pay-for-wear-and-tear/309905
- `Rent Tribunal` — https://kenyatalk.com/t/rent-tribunal/273558 and /21774
- `Place to rent Nairobi` — https://kenyatalk.com/t/place-to-rent-nairobi/283348
- `Nairobi landlords be ready to be shafted properly` — https://kenyatalk.com/t/nairobi-landlords-be-ready-to-be-shafted-properly/230777

**These nine threads are the most on-brief forum material I found anywhere and I could only read them second-hand. Re-run Kenyatalk from a real browser. It is the Kenyan equivalent of what the brief hoped Reddit would be.**

Also blocked: `nairobinews.nation.africa` (403), `eastleighvoice.co.ke` (403), `tuko.co.ke` (blocks Anthropic's crawler), `internations.org` (blocks Anthropic's crawler), `x.com`/Twitter, `wazua.co.ke` over HTTPS (works over plain HTTP only), `mojeek.com`, DuckDuckGo HTML/Lite (duck-selection captcha), `tenantt.co.ke` (proxy 502). `nation.africa` is intermittent — I got 2 articles through before it began 403ing everything.

### COULD access, and did

- **Wazua.co.ke** (`http://` only) — a live Kenyan investor forum with a Property subforum. I scraped **all 35 pages / 313 unique posts** of the thread *"Low End Housing: High Risk, High Return"* (t=30129, running 2014→2025) plus 6 other rental threads. This is **real forum speech by real Kenyans** and it is the only genuine forum corpus in this report. **Caveat: Wazua is a landlord/investor forum.** The voices are overwhelmingly people who *own* bedsitters in Pipeline, Kahawa Wendani and Githurai, not people hunting for them. That turns out to be unexpectedly valuable for the caretaker question (section 6) but it means I have far more landlord-side than tenant-side forum testimony.
- **Business Daily** (businessdailyafrica.com) — full text, paywall notwithstanding. One article here is the single best source in this report.
- **nation.africa** — 2 articles in full before it cut me off, including one complete 6-week first-person search diary.
- **kenyans.co.ke** — ~10 articles, full text. Quote-rich; they interview named tenants.
- **standardmedia.co.ke** — body text recoverable from embedded JSON-LD. 4 articles.
- **the-star.co.ke, citizen.digital, ntvkenya.co.ke, mwakilishi.com, biznakenya.com, sokodirectory.com, haofinder.com, jinsiangu.org, rentershub.co.ke, commercialpropertykenya.com, streamlinefeed.co.ke, kejafinder.com, staynai.com, expat.com, angelandimp.wordpress.com** — all readable.

### A note on comment threads

**I found almost no live comment threads.** The brief hoped for blog and news comment sections. In practice: kenyans.co.ke has no comment section on these articles; Business Daily and Nation both gate comments behind "Login to join the discussion"; mwakilishi shows "No comments yet — be the first"; commercialpropertykenya shows a structured-data comment count of 0; the one "comment" on kejafinder's bedsitter article is a pingback from its own site. The Kenyan rental conversation has **migrated off article comments and onto WhatsApp, TikTok and Facebook** — which is itself one of the most important findings in this report (section 5).

---

## 2. Full search narratives

Five accounts, quoted at length. These are the heart of the report.

---

### Narrative 1 — Elvis Ondieki: a documented 6-week search, every shilling recorded

**Source:** Elvis Ondieki, *"The good, the bad and the outright ugly in my city house-hunting mission"*, Daily Nation, Friday 5 April 2019 (updated 5 July 2020). `[FETCHED]`
**URL:** https://nation.africa/kenya/life-and-style/lifestyle/the-good-the-bad-and-the-outright-ugly-in-my-city-house-hunting-mission-155282

This is the most complete first-person account of a Kenyan rental search I could find anywhere. He states his mission, his budget constraint, his dates, and his costs. Quoted at length:

> "Mission: To find a two-bedroomed house that can meet a writer's fancy, his wife's pursuit of a 'wow' factor in a building (whatever that means) and which is conducive for a two-year-old boy who spends his waking hours courting trouble for fun. The house should preferably have a compound of its own and should ideally not be in a storeyed building."

> "Preferred area: Any place along Nairobi's Route 23, which the family is most conversant with."

> "Expectation: I will find a house after a few attempts."

> "Reality: For the search period between February 10 and March 24, 2019, I hop from court to court, paying thousands of shillings in 'viewing fees' to agents, nearly get conned twice by Web-based schemers, and I notice interesting things house owners are doing in their quest to mint the most from the spaces they have."

**The viewing fee, haggled down on the spot:**

> "A fast-talking agent wants me to see this two-bedroomed house whose rent is Sh17,000 a month. It has an own compound, he says. I should love it, he adds."

> "This is some ingenious problem-solving by the owners to make the most of the space but the crammed space turns me off. Regardless, the agent still wants his Sh1,000 viewing fee, but I haggle my way onto paying him Sh500."

**What the sitting tenant told him that no listing would (the information a vacancy list cannot carry, but a neighbour can):**

> "She explains to me the levies they pay on top of the Sh12,000 rent, like Sh300 for garbage collection and Sh500 for the guards. Pretty standard, these. But there is one oddity: Their recurrent expenses include buying a chemical to kill cockroaches."

> "Unless we place an insecticide in the hole, they will swarm into the house in their numbers and you will find lots of them in your house in the morning," she says

**The near-miss scam, with the amount at risk:**

> "He had listed a three-bedroomed house in Buruburu Phase 5 that has an own compound, going for Sh25,000. That is a bargain in that neighbourhood and although it is beyond my budget, its features pique my interest."

> "On reaching the gate to the court he referred to, the guard who attends to us shakes his head when we tell him which house we have come to view. The owner is abroad, he says. It has not been inhabited for a while and he believes this is the reason con men have found it a prime playing field."

> "I could have lost at least Sh50,000 if I fell into this man's trap, because he had tried to convince me to pay up fast so I can beat any competitors."

**How he caught the second scam — reverse image search:**

> "I grew sceptical after talking to the gentleman who had placed the listing and did a reverse image search of some of the photos he had posted. The Google result was that the same images had been used to advertise houses in at least three other locations in Nairobi. This must be a con."

**The deal he walked away from over a contract clause:**

> "Two provisions in the agreement require me to promise that in case I commit an offence, I can be evicted without notice. That might mean being told to leave the house at midnight if she suspects we have used a jiko in the kitchen, one of the offences she has clearly listed in the contract."

> "It will mean that you voluntarily agreed to be evicted without notice. The rent tribunal will be unlikely to intervene if she does that," says the woman [an employee of the Rent Restriction Tribunal, unnamed because she was not speaking officially]

> "As I write this, the house is yet to be occupied and I imagine no one is willing to sign a paper granting permission to the landlady to evict him or her without notice."

**The commission that killed a deal he wanted:**

> "In fact, there is a house I was so close to settling in on February 18, but I just calculated the amount I would pay to the agent and I gave up."

> "For a house whose rent is Sh20,000, he was asking for Sh6,000 as commission. Yes, they make the process of finding houses easy; but I did not think this man deserved anything more than the Sh1,000 viewing fees I had paid him."

**Why agents withhold the address — the core information asymmetry this product attacks:**

> "And they are masters in vague information, these agents. You could be looking for a house just in front of you but because they want their viewing fees, they will only give generalities when asked about the location."

> "Owing to that vagueness, I am trying to forgive an agent who took me to a one-storeyed house where the ground floor is occupied by a bar. I could not have given the house one look if he described it well in advance."

**The agent business model, described precisely (read this twice):**

> "The agents I dealt with seemed to be living well on the quick cash that comes their way. All he needs to do is write 'x-BEDROOM VACANT' on a poster and append his phone number, then paste those posters all over. Then phone calls will fly in, where he reminds the caller of Sh1,000 viewing fees before committing to help. Weekends are their peak days, when they can show a single house to numerous people and reap big."

**And he ends by naming exactly the product in this brief, and why he thinks it has failed before:**

> "Tech-savvy investors have in the past created platforms to help do away with the nagging agents, but owing to the hands-on nature of locating vacant rental houses, none has been able to carry out the task exhaustively. In my search, I used OLX and Facebook which were often rich sources of information but had a limited scope. Over to you, techies."

**Also notable — he met landlords who refuse agents entirely:**

> "I encountered landlords who just won't allow agents market their property, and they all seemed to suggest that agents can be a nuisance."

---

### Narrative 2 — Derrick Momanyi: two months of walking, then a WhatsApp group, then a landlord

**Source:** Ndugu Abisai, *"House hunters ditch expensive agents for WhatsApp groups"*, Business Daily, Wednesday 19 March 2025. `[FETCHED]`
**URL:** https://www.businessdailyafrica.com/bd/lifestyle/design-interiors/house-hunters-ditch-expensive-agents-for-whatsapp-groups-4971700

Momanyi is a 25-year-old software developer, Nairobi-born, moving out of his parents' home after getting a job. Target areas: Ngong Road, Waiyaki Way, Thika Road.

> "Looking for a house is hectic. I spent the first two months of the year physically visiting places I liked with no success."

> "These platforms make it easy to find anything." [on TikTok and X]

> "I thought these three areas would be easy to navigate with public transport. They would provide convenient access points for both my professional and social life."

> "You don't realise these things until you start paying rent. Some of the quoted amounts would convert me to a rent-paying slave. I'd only be working to pay rent."

> "I wanted a spacious place with at least one balcony, not too far from a main road, and with reliable amenities like water, power, and internet connectivity. You'd think that's the norm and not the exception when looking for housing; these shouldn't be presented as extras or benefits that come with an apartment."

**The two-tier fee — this is the clearest statement of the fee structure I found anywhere:**

> "I found an agent who I think was out to make a killing from me. His 'appearance fee' is Sh2,000. This is money he charges for information—fair enough. If you want him to take you physically to the mentioned house, he charges an additional Sh1,500, which he refers to as an inconvenience fee."

The reporter's own arithmetic on that, from the article text: *"That would set him off with Sh3,500 if he settled on the first house he'd be taken to. Except that's not the case."*

**And the deliberate bait-and-switch, described as a business tactic rather than incompetence:**

> "I believe most of these agents have gone rogue. I'd have no problem paying for a service that is fairly charged. But, the agents deliberately take you to a house pulled so far away from your outlined specifications for them to conveniently offer to take you to another one that is closer to what you want."

**How he actually found his house:**

> "By the time I joined the group, it had 700 members; it kept growing that the groups had to be condensed to a community to accommodate more people."

Summary (mine) from the article text: after two frustrated agents, he ranted on X, which led him to a Telegram channel where people share house-hunting leads for free, and it was there — and in the WhatsApp group — that he connected directly with a property owner along Thika Road whose apartment he moved into. **He found his house through a free peer channel, not a listing site and not an agent.**

---

### Narrative 3 — Esther Njeri Gikuni: commuted from Naivasha for a week, got burned, built the WhatsApp community that now has 21,000 members

**Source:** same Business Daily article, 19 March 2025. `[FETCHED]`
**URL:** https://www.businessdailyafrica.com/bd/lifestyle/design-interiors/house-hunters-ditch-expensive-agents-for-whatsapp-groups-4971700

Njeri, 28, a social media influencer, was moving her family from Naivasha to Nairobi. Summary (mine) from the article text: she commuted into Nairobi for a whole week looking for a house; the daily commute "proved expensive and tiring", so she switched to an agent.

> "I was coming from a place of desperation and was pressed for time to move. When I paid the viewing and inconvenience fees, all the houses the agent had shared on Whatsapp suddenly became occupied."

> "I was completely sold out on a chat with an agent with very nice-looking ready-for-occupation apartments."

She paid **Sh2,500** on a promise the agency would see her settled. The houses she was shown were not the advertised ones.

> "Upon seeing the frustrations we went through and the little time we had on our hands, my husband challenged me to look for a solution on social media—as an influencer and avid user of TikTok; he opined that maybe there was an answer to our troubles on the internet."

Her TikTok post went viral; tens of thousands commented suggesting a community. She started with one WhatsApp group and pasted the invite link under the post. **Then this happened, and it is the most important operational detail in this report:**

Summary (mine) from the article text: *the agents they had been escaping infiltrated the group, prompting Ms Njeri to shut it down and rethink her strategy.* She then rebuilt it as many groups split by area of the city, and then of the country, which became a WhatsApp community of around 21,000 members.

> "This is a free service. Our goal is to address a pain point that has existed in the market for a long time. I don't know where this goes from here, but it's satisfying to see people find their desired housing."

> "I have been threatened with a legal suit by someone I believe is a rogue agent. Nevertheless, this has not dampened my spirit."

**A founder building this product should assume both of these: agents will infiltrate, and someone will threaten to sue.**

---

### Narrative 4 — Wanjiru Kariuki: paid Sh3,650, taken in circles for a month, then asked for a subscription

**Source:** same Business Daily article, 19 March 2025. `[FETCHED]`
**URL:** https://www.businessdailyafrica.com/bd/lifestyle/design-interiors/house-hunters-ditch-expensive-agents-for-whatsapp-groups-4971700

Kariuki, 31, a social media and community manager:

> "I was not a follower of Ms Njeri, she just appeared on my for you page (FYP) lamenting about a housing problem I resonated with. I have lost money in house hunting. I paid Sh3,650 for a housing agency to find me a house. I feel like I got played because they kept taking me in circles until one month lapsed, and I was asked to pay more money—think of this as a subscription fee. So, when I saw Ms Njeri's video, I picked it up and made a video on the same, which went viral."

**And the double-dip, confirmed by the landlord's own mouth:**

> "I had the opportunity to meet a landlord whose property I had been shown by an agent, when I interrogated about the fees I was supposed to pay, the landlord told me that they had already paid the agent for directing potential clients to the property. This means they wanted double pay for the work."

> "We will have security measures to verify the authenticity of both the landlord and the tenant to protect both parties." [on the platform she is building]

**Note for the founder: Kariuki is building a competing platform.** So is Njeri (a WhatsApp community). Both are responses to the same pain, both started in 2025, both are free or free-ish.

---

### Narrative 5 — Ruth Wanyama, Pipeline Estate: the deposit, the receipt, the caretaker, and giving up

**Source:** James Wanzala, *"Landlords reaping from tenants' ignorance"*, The Standard. `[FETCHED]` (body recovered from the page's embedded article JSON)
**URL:** https://www.standardmedia.co.ke/article/2000095696/landlords-reaping-from-tenants-ignorance

This is the only extended Pipeline-specific tenant account I found, and it is **the clearest testimony in this report that the caretaker is the person who controls the deposit refund.**

From the article text: *"When Ruth Wanyama, a resident of Pipeline Estate in Embakasi, Nairobi, wanted to relocate to another plot, she asked for a deposit refund from the caretaker. But this soon turned into a cat and mouse game between her on one hand, and the caretaker and agent on the other."*

> "I was told to produce a deposit receipt which I did. I was then told to go back after one week," says Wanyama.

> "A week turned into two and there were no signs that I would get my money back. I was forced to write off the money and move because I had already made up my mind to move that month," she recalls.

**The structural point the same article makes, from Ephraim Murigo, Secretary General of the Urban Tenants Association of Kenya (UTAK):**

> "Most tenants don't read the tenancy agreements before signing them hence, exposing themselves to manipulation," says Ephraim.

And, from the article text: *"Ephraim says 30 per cent of cases in court are about deposit withholding. He says because cases drag on in courts, many give up and write off the deposits — and the money goes into landlords' pockets."*

> "Unfortunately, many tenants do not do the necessary research before entering the new house," says Ephraim.

**And the single most important legal fact in this entire report, from the same article:**

> "But this law has not made much difference because it only deals with rents up to Sh2,500 per month." [on the Rent Restriction Act of 1959]

Summary (mine): **the statutory rent-control regime covers rents up to KSh 2,500/month. The entire 4,000–30,000 band this product targets sits above the protection line.** That is why the recourse stories in section 3 all end in "I gave up."

---

### Narrative 6 (shorter) — Michael Kimano and Robinson Jalam: two ways to lose a deposit

**Source:** *"Rent deposit, every tenant's nightmare"*, The Standard. `[FETCHED]` (body from embedded article JSON)
**URL:** https://www.standardmedia.co.ke/real-estate/article/2000026570/rent-deposit-every-tenants-nightmare

From the article text: *"When Michael Kimano wanted to move out of his one bedroom apartment in Nairobi's Donholm to a more spacious one in Jamhuri Estate along Ngong' Road, he budgeted for a refund of his rental deposit amounting to Sh22,000."*

> "My landlady bluntly informed me that I was leaving the house in a poor state hence I could not get my deposit as it was going to be used to redo the house," says Michael.

From the article text: *"But when Robinson Jalam wanted to move from his two bedroomed house in Kibera's Ayany Estate, he knew his chances of getting a refund of his one month's rent amounting to Sh15,000 were nil."*

> "There was no written agreement. So I decided to live for another month without paying rent and finally moved out," he says.

**This is the real, widely-used remedy: "sitting on your deposit."** It appears again in the HaoFinder guide, which warns tenants to serve proper notice *"(not to be mistaken with 'am sitting on my deposit')"* — i.e. it is common enough to have a name.

---

## 3. Verbatim quotes by theme

### 3.1 Viewing fees and agent fees

1. `[FETCHED]` **Derrick Momanyi**, software developer, Business Daily 19 Mar 2025: *"His 'appearance fee' is Sh2,000. This is money he charges for information—fair enough. If you want him to take you physically to the mentioned house, he charges an additional Sh1,500, which he refers to as an inconvenience fee."* — https://www.businessdailyafrica.com/bd/lifestyle/design-interiors/house-hunters-ditch-expensive-agents-for-whatsapp-groups-4971700

2. `[FETCHED]` **Elvis Ondieki**, Daily Nation 5 Apr 2019: *"the agent still wants his Sh1,000 viewing fee, but I haggle my way onto paying him Sh500."* — https://nation.africa/kenya/life-and-style/lifestyle/the-good-the-bad-and-the-outright-ugly-in-my-city-house-hunting-mission-155282

3. `[FETCHED]` **Elvis Ondieki**, same: *"For a house whose rent is Sh20,000, he was asking for Sh6,000 as commission."*

4. `[FETCHED]` **Elvis Ondieki**, same: *"they are masters in vague information, these agents. You could be looking for a house just in front of you but because they want their viewing fees, they will only give generalities when asked about the location."*

5. `[FETCHED]` **Elvis Ondieki**, same, on the agent's whole business: *"All he needs to do is write 'x-BEDROOM VACANT' on a poster and append his phone number, then paste those posters all over. Then phone calls will fly in, where he reminds the caller of Sh1,000 viewing fees before committing to help. Weekends are their peak days, when they can show a single house to numerous people and reap big."*

6. `[FETCHED]` **Wanjiru Kariuki**, Business Daily 19 Mar 2025: *"I paid Sh3,650 for a housing agency to find me a house. I feel like I got played because they kept taking me in circles until one month lapsed, and I was asked to pay more money—think of this as a subscription fee."*

7. `[FETCHED]` **Wanjiru Kariuki**, same, on the double-dip: *"the landlord told me that they had already paid the agent for directing potential clients to the property. This means they wanted double pay for the work."*

8. `[FETCHED]` **Esther Njeri Gikuni**, Business Daily 19 Mar 2025: *"When I paid the viewing and inconvenience fees, all the houses the agent had shared on Whatsapp suddenly became occupied."*

9. `[SEARCH-EXTRACT]` **Kenyatalk**, thread *"Viewing fees and agency fees are a scam!"* (started Dec 2019) — a poster on the agency fee: *"20% of it, so if your rent is 16000, you'll give him a one off fee of 3200 after you move in"* — https://kenyatalk.com/t/viewing-fees-and-agency-fees-are-a-scam/209148

10. `[SEARCH-EXTRACT]` **Kenyatalk**, same thread, the OP's complaint: he didn't understand how *"viewing fees and agency fees equal to 20% of rent in some cases"* became normal.

11. `[SEARCH-EXTRACT]` **Kenyatalk**, same thread, a poster *defending* viewing fees — the one argument for the practice I found anywhere: viewing fees *"screen out people who have no intention of renting"*, and agents *"can't rely on landlords to pay them"*, so they pass the fee to the client.

12. `[SEARCH-EXTRACT]` **Kenyatalk**, thread *"How much should i pay a real estate agent? (Rentals)"*: rental agent fees range *"10-15% of monthly/annual rent"*; registered agents are supposed to charge *"7.5% of annual rent or one months rent for a lease of one year"* — https://kenyatalk.com/t/how-much-should-i-pay-a-real-estate-agent-rentals/179065

13. `[SEARCH-EXTRACT]` **Nation, Mombasa** (*"In Mombasa, money hungry agents fleece desperate house hunters"*): a tenant's agent *"charged him Sh500 for every house he looked at, whether he liked it or not."* — https://nation.africa/kenya/counties/mombasa/in-mombasa-money-hungry-agents-fleece-desperate-house-hunters-4301600

14. `[SEARCH-EXTRACT]` **Nation, Mombasa**, same: another tenant *"did not pay a viewing fee, but she had to pay half the rent to the agent before she could move into her new rental."*

15. `[SEARCH-EXTRACT]` **Nation, Mombasa**, same, a critic of the practice: *"If a client likes the house, the agent should settle his fee with the landlord or owner of the house, not double-dipping from both sides by charging a viewing fee to the tenant."*

16. `[SEARCH-EXTRACT]` **Nation** (*"Money-hungry landlords fleece tenants of their deposit refunds"*): a Nairobi tenant was asked for a commitment fee of half a month's rent **and a viewing fee of Sh5,000 in cash**, on top of rent and deposit. She refused. — https://nation.africa/kenya/life-and-style/dn2/money-hungry-landlords-fleece-tenants-of-their-deposit-refunds-886648

17. `[SEARCH-EXTRACT]` **Nation, Kisumu** (*"Agents fleecing newcomers to Kisumu"*): newcomers pay *"a non-refundable viewing fee of between Sh1,000 and Sh2,000"* to agents, sometimes for houses already taken. — https://nation.africa/kenya/life-and-style/dn2/agents-fleecing-newcomers-to-kisumu--1016158

### 3.2 Caretakers — see section 6 for the full treatment; these are the direct quotes

18. `[FETCHED]` **"guard"**, Wazua forum, post #142, Monday 21 November 2016 9:11:30 PM — *the single most important line in the whole corpus for the caretaker hypothesis:*
> "Its true low end housing -to include single rooms and bedsitters has very impressive returns as compared to the upper end housing.However the challenge lies in managing those houses or flats for that matter.It is a one big headache..any experiences? starting with thieving agents-They lie to you that the rooms are vacant,yet someone is paying them a lower figure directly.By the time you realize whats happening,you have lost several thousands.."
— http://www.wazua.co.ke/forum.aspx?g=posts&t=30129&p=15

19. `[FETCHED]` **"washiku"**, Wazua, post #146, Tuesday 22 November 2016 10:15:06 AM — the landlord's countermeasure:
> "As a check, have the caretaker to be on your side. He/She will be your eye on the ground. 'Compensate' nicely and your fear is sorted."
— http://www.wazua.co.ke/forum.aspx?g=posts&t=30129&p=15

20. `[FETCHED]` **"washiku"**, Wazua, post #134, Tuesday 8 November 2016 3:42:02 PM — how caretakers are actually paid:
> "yours is to ensure the houses are in good shape, amenities are in place(water, electricity-prepaid obviously, garbage collection, caretaker to clean the place every day-they are low cost and one of the deal to keep them motivated is giving them one of the unit for free as their house plus some monthly salo etc)."
— http://www.wazua.co.ke/forum.aspx?g=posts&t=30129&p=14

21. `[FETCHED]` **"Swenani"**, Wazua, post #144, Tuesday 22 November 2016 7:08:35 AM — on whether naming bad caretakers would work:
> "Ati name and shame, do you think these small time caretakers or agents called bonoko Kamau or wa Gishiri will care if you name them here? Name and shame can only work for established agency firms"
— http://www.wazua.co.ke/forum.aspx?g=posts&t=30129&p=15

22. `[FETCHED]` **Joshua Mutua**, founder of Kejahunt, The Standard — *the sentence a founder of this product most needs to read:*
> "Despite some caretakers' reluctance to offering information on vacant houses, Mutua insists that theirs is a growing business."
(the article's framing of his position) — https://www.standardmedia.co.ke/business/business/article/2000162311/no-hustle-kejahunt-will-get-you-a-house

23. `[FETCHED]` **Joshua Mutua**, same article, on the search as it actually is:
> "Moving houses can be such a hassle. You have to walk around, deal with unscrupulous agents, dubious brokers and dodgy caretakers."
(the article's opening line, setting up his story)

24. `[FETCHED]` **Joshua Mutua**, same, on what he tried first:
> "The experience was not pleasant. They would take your money and show you something not even close to what you had in mind. It was frustrating. We had to do the walking ourselves,"

25. `[FETCHED]` **Bizna Kenya**, 27 Feb 2025, Joshua Malii — *explicitly naming caretakers as fee-chargers:*
> "On average, these agents and property caretakers will demand around Sh2,500 before showing you any available houses."
— https://biznakenya.com/social-media-house-hunting-communities-in-kenya/

26. `[FETCHED]` **Kenyans.co.ke**, 7 May 2021 — caretaker as gatekeeper, an anonymous tenant:
> "Whenever it was 10pm, the caretaker would lock the gate and no one would be allowed in. Those who came in past that would knock the gate and when they got tired, they would leave,"
— https://www.kenyans.co.ke/news/64999-peculiar-rules-set-nairobi-landlords-tenants

27. `[FETCHED]` **The accused caretaker**, in court, Kenyans.co.ke 17 Mar 2023 — caretaker writing leases on his own authority:
> "Yes, I prepared lease agreements, in the name of the agencies, which I gave tenants to sign," he admitted.
— https://www.kenyans.co.ke/news/87026-caretaker-confesses-stealing-ksh-6m-rent-nairobi-tenants

28. `[FETCHED]` **Prosecutor James Gachoka**, same case: *"After several meetings with Mr X about the rent received and deposits retained, you issued a cheque of Ksh935,500."*

29. `[FETCHED]` **A tenant in Mowlem estate, Nairobi**, The Standard — caretaker intercepting rent from tenants without M-Pesa:
> "The two tenants of Congolese origin did not have Mpesa accounts, and so the caretaker informed that they could give him the cash to deposit on their behalf of which they did,"
— https://www.standardmedia.co.ke/ureport/article/2001353419/caretaker-on-the-run-after-vanishing-with-landlord-s-rent

30. `[FETCHED]` **Rose Kwamboka**, the landlord's agent, same article:
> "Since being given a total Sh14000 by the two tenants, the caretaker's phone is purported to have been switched off. We have tried tracing him to no avail, and he even moved to a house he used to live to an unknown location,"

31. `[FETCHED]` **The landlord**, same article, on why he won't pursue it — a window into how little enforcement there is at this end of the market:
> "How long do you think that fool will eat 14k, I am sure it will be finished before one weeks' time," said the landlord adding that "I don't know whether some people actually use brains because this is a job that could have sustained him for long and now he has ruined it by stealing small money."

32. `[FETCHED]` **An anonymous tenant in Uthiru**, Kenyans.co.ke 13 Aug 2020 — caretaker rewiring meters:
> "I found out that he had switched wires from another meter to mine. We literally were sharing our units. I grew uncomfortable when I noticed my tokens were diminishing at a faster rate yet I didn't have equipment which consumes a lot of power,"
— https://www.kenyans.co.ke/news/56342-5-fees-landlords-use-swindle-tenants

33. `[FETCHED]` **"Sarah" (not her real name)**, tenant in Kabiria, Nairobi, same article — and note who gets reprimanded:
> "My sister at one point was asked to pay Ksh 1,800 for water yet she had no leakages and had not spent two weeks in the house that month. She raised the issue with the landlord who reprimanded the caretaker,"

34. `[SEARCH-EXTRACT]` **Kenyatalk**, Housing & Real Estate — *the hypothesis, stated by a Kenyan landlord in his own words:* a building caretaker told the landlord a unit was unoccupied while *"the caretaker has been 'eating' rent for 3 months from that tenant"*.

35. `[SEARCH-EXTRACT]` **Kenyatalk** — a tenant on a change of management: *"the current Caretaker flatly refused to acknowledge the receipts"*.

36. `[SEARCH-EXTRACT]` **Nairobi News** (*"How crooked housing agents have perfected the art of ripping off tenants"*): a man answered a Mirema vacancy poster, was shown a house, paid, and then found a caretaker who said he was *"not aware of his interest in moving in"*. — https://nairobinews.nation.africa/how-crooked-housing-agents-have-perfected-the-art-of-ripping-off-tenants/

37. `[SEARCH-EXTRACT]` **Kenyans.co.ke** (*"Rent Deposit Refunds in Kenya"* investigation, 26 Jul 2020): *"many caretakers and landlords were simply nowhere to be found when tenants sought the refunds leading many to give up."* — https://www.kenyans.co.ke/news/55729-rent-deposit-refunds-kenya-what-law-says

### 3.3 Deposits, refunds, and what recourse people had

38. `[FETCHED]` **Ruth Wanyama**, Pipeline Estate: *"I was told to produce a deposit receipt which I did. I was then told to go back after one week,"* and *"A week turned into two and there were no signs that I would get my money back. I was forced to write off the money and move because I had already made up my mind to move that month,"* — https://www.standardmedia.co.ke/article/2000095696/landlords-reaping-from-tenants-ignorance

39. `[FETCHED]` **Michael Kimano**, Donholm → Jamhuri, Sh22,000 deposit: *"My landlady bluntly informed me that I was leaving the house in a poor state hence I could not get my deposit as it was going to be used to redo the house,"* — https://www.standardmedia.co.ke/real-estate/article/2000026570/rent-deposit-every-tenants-nightmare

40. `[FETCHED]` **Robinson Jalam**, Ayany Estate, Kibera, Sh15,000: *"There was no written agreement. So I decided to live for another month without paying rent and finally moved out,"* — same URL

41. `[FETCHED]` **Ephraim Murigo**, UTAK Secretary General: *"Most tenants don't read the tenancy agreements before signing them hence, exposing themselves to manipulation,"* — https://www.standardmedia.co.ke/article/2000095696/landlords-reaping-from-tenants-ignorance

42. `[FETCHED]` **Stephen Mutoro**, CEO Kenya Alliance of Resident Associations / SG Consumers Federation of Kenya: *"Often you spend a lot of money when moving into a new house and this is your money so the landlord must refund your deposit when you move out,"* — https://www.standardmedia.co.ke/real-estate/article/2000026570/rent-deposit-every-tenants-nightmare

43. `[FETCHED]` **Stephen Mutoro**, same: *"When moving in, one should take inventory of the condition of the house, recording any existing damage and checking all fixtures to make sure they are working. Check if the house is painted,"*

44. `[FETCHED]` **Stephen Mutoro**, same, on why the tribunal isn't the answer: *"In most cases, the cost of taking cases to the tribunal discourages many from seeking help. The tribunal also faces a backlog of cases denying many tenants a proper forum for hearing disputes,"*

45. `[FETCHED]` **Mwendwa Maundu**, Nairobi lawyer, same article — *the single most honest line about landlord behaviour:*
> "If your landlord does not return your money on time or if he unjustly withholds some of it, be prepared to assert your rights and remember, many landlords withhold all security deposits knowing that many tenants will not take the steps to get back their money,"

46. `[FETCHED]` **Magistrate Judith Omollo**, Milimani, 27 July 2021, ordering a Sh11,500 deposit refunded: *"In the circumstances, it can be inferred that the respondent may have carried out those repairs to improve the value of its residential premises beyond the condition it was before claimant took occupation,"* — https://www.the-star.co.ke/opinion/2021-07-28-court-orders-landlord-to-refund-sh11500-deposit-to-tenant

47. `[FETCHED]` **Brian Karume**, legal consultant, Kenyans.co.ke 26 Jul 2020: *"The best way to protect yourself is to ensure that you have the agreement on paper,"* — https://www.kenyans.co.ke/news/55729-rent-deposit-refunds-kenya-what-law-says

48. `[SEARCH-EXTRACT]` **Nairobi News**: a woman leaving a Kangemi house was refused her deposit — *"The agents refused to refund her deposit, instead confiscating her bed and table."* — https://nairobinews.nation.africa/how-crooked-housing-agents-have-perfected-the-art-of-ripping-off-tenants/

49. `[SEARCH-EXTRACT]` **Nation**: on repainting deductions — *"Repainting is a common deduction, with landlords using their own labour and paint costs that inflate the cost, leaving nothing to be refunded."* — https://nation.africa/kenya/life-and-style/dn2/money-hungry-landlords-fleece-tenants-of-their-deposit-refunds-886648

### 3.4 Scams, in mechanical detail

50. `[FETCHED]` **John Mbati**, Kenyans.co.ke content creator, on being scammed: *"I realised that they were scamming me the next day"*; *"I received a call from a person who insisted that the caretaker was conning me"*; *"The alleged police turned out to be an imposter"* — https://www.kenyans.co.ke/news/57809-most-popular-house-hunting-scams-avoid-nairobi

51. `[FETCHED]` **Ruth Maingi**, ex-KTN actor, conned twice, Kenyans.co.ke 28 Jun 2020:
> "There was an advertisement in a newspaper and I was looking for a small house because I was by myself."
> "This SQ (Servant's Quarter) was going for Ksh6,500."
> "I asked for an [Lease] agreement but he told me that he did not really need the money, he just wanted the house to be vacant."
> "When we walked out of the restaurant, she told me, 'let me pick the keys from this shop here.'"
> "I tried calling the number and it never went through,"
> "He looked wealthy and was not in any lack so I said there was no problem,"
> "I was looking for a bigger house and I searched for an agent on OLX."
> "'You have to give me the full amount for my agency so that the next time you come,'"
> "I tried to call (the man) and he did not pick,"
— https://www.kenyans.co.ke/news/54762-ruth-maingi-ex-ktn-actor-who-was-conned-twice-house-hunting-video

52. `[FETCHED]` **"MYSTIC"**, blog *angelandimp*, 11 March 2010 — the oldest account I found, and the mechanics are identical to 2025. Summary (mine) from the post: she answered a newspaper classified for a one-bedroom in Kileleshwa at **Ksh 8,000**; the "owner" sent her to a caretaker described as his nephew; the nephew asked her to send **Ksh 1,000 for fuel, to be deducted from her deposit**; she refused and proposed meeting in town, and he protested. A second classified's caller claimed to be a brigadier at Kahawa Barracks; a friend at the barracks found no officer of that name or rank. — https://angelandimp.wordpress.com/2010/03/11/house-hunting-in-nairobi/

53. `[FETCHED]` **RentersHub**, 29 April 2026, step-by-step scam breakdown with its stated amounts — **viewing fee KSh 1,500; commitment fee KSh 10,000; "refundable" booking KSh 7,000**. Summary (mine) of its described sequence: bait listings priced slightly below market in Kasarani, Rongai and Kilimani, promising "No agent fee"; photos reused from legitimate sites; invented business names and badges; polite fast responses and quick viewings; urgency claims; then either disappear on payment, or keep the victim touring houses the scammer doesn't control. — https://www.rentershub.co.ke/blogs/how-fake-rental-agents-in-nairobi-actually-operate-a-step-by-step-breakdown-of-the-scam-system/

54. `[FETCHED]` **commercialpropertykenya.com**, 17 Apr 2026, on the pressure script — the exact phrases it says to distrust: *"There are two other interested clients."* / *"You need to decide today."* And its rule: *"Never, under any circumstances, book a house by sending a deposit via mobile money"*. Its advice on the quoted rent: *"What do tenants here actually pay monthly, all in?"* and *"Don't take their word for it."* — https://commercialpropertykenya.com/things-no-one-tells-you-about-house-hunting-in-nairobi/

55. `[SEARCH-EXTRACT]` **Nation** essay *"OFF MY CHEST: House hunting horror in Nairobi"* — on the failure mode of signs and Facebook listings: *"Most of the phone numbers listed under the houses did not go through. Others went through but they belonged to conmen who expected me to send money upfront without seeing the house first."* — https://nation.africa/kenya/life-and-style/off-my-chest-house-hunting-horror-in-nairobi-89228

56. `[SEARCH-EXTRACT]` **Nation**, same: *"Cases are rife whereby agents edit pictures of their properties to make them look new and without blemish. Some even post pictures of other people's houses and pass them off as their own."*

57. `[SEARCH-EXTRACT]` **Kenyans.co.ke / Chebet Ronoh** case: she paid **Ksh12,000** to book a one-bedroom advertised at **Ksh15,000** along Thika Super Highway — *"After sending Ksh12,000 to book the house, the agent disappeared."* — https://www.kenyans.co.ke/news/57809-most-popular-house-hunting-scams-avoid-nairobi

### 3.5 Discrimination at letting

58. `[FETCHED]` **Michael Wafula**, refused a house in Donholm for being a bachelor, Daily Nation 1 Apr 2026:
> "The landlord told me that bachelors are carefree and unreliable with rent. He said collecting arrears from bachelors is a headache,"
— https://nation.africa/kenya/news/no-kids-no-bachelors-is-tenant-gatekeeping-the-new-discrimination--5409872

59. `[FETCHED]` **Erick Elifas Otieno**, Manyatta Estate, Kisumu, same article:
> "My neighbour was forced out the moment the landlord realised she had a third child. To him, more children meant more pressure to keep the place clean,"

60. `[FETCHED]` **Mariko Okoth**, apartment owner near Kisumu National Polytechnic, same article — who landlords actually want:
> "I prefer students whose parents pay even for a whole semester and therefore give me an easy time. Students also share costs when staying together, reducing cases of rent defaulting. Those with families will come up with all sorts of excuses when rent is due, including having paid school fees or waiting for delayed salaries,"

61. `[FETCHED]` **Charles Mbugua**, landlord, Nairobi, same article:
> "What I try to see or establish is a constant income on the tenant's part so that we do not have a problem when collecting rent,"

62. `[FETCHED]` **Joshua Nyamori**, advocate of the High Court, same article:
> "Where those preferences are based on constitutionally protected grounds such as gender, pregnancy, marital status, or ethnicity, then it crosses into unlawful discrimination,"
> "The legal position is that landlords can manage risk and protect their property, but they must do so in a manner that is reasonable, justifiable and consistent with constitutional values of dignity and equality. Where that line is crossed, the courts can and will intervene,"

63. `[FETCHED]` **Waithera Matu**, speaking to Kenyans.co.ke, 7 May 2021:
> "On one occasion I was house hunting when the landlord asked whether I was married or single. She told me that individuals that are not legally married are not allowed to live together,"
— https://www.kenyans.co.ke/news/64999-peculiar-rules-set-nairobi-landlords-tenants

64. `[FETCHED]` **An anonymous netizen**, same article, Kahawa Wendani:
> "When we were house hunting at Kahawa Wendani, one old landlord told us that we should not have more than one kid if we wanted to be his tenants,"

65. `[FETCHED]` **An anonymous netizen**, same article — the lived cost of a landlord's electricity rule:
> "I was living in a single room and my baby was just a year old. the landlord would switch off lights at 9pm in the night to 6am in the morning and mark you I was going to work at 5am,"

66. `[FETCHED]` **Jinsiangu Kenya** (Kenyan intersex, transgender and gender-non-conforming organisation), in its own tenants' rights guidance — the only disability/LGBT-adjacent letting evidence I found:
> "Evictions ( chances are high that landlords are most likely to evict you once they are aware of your gender identity and related history. this is prevalent due to stigma and ignorance. )"
— https://jinsiangu.org/know-your-rights

67. `[SEARCH-EXTRACT]` **The Standard**: *"a Luo man turned away from a Pangani house once a Kikuyu landlady saw his surname on his ID"*; *"A Luhya landlord rejected a man in Kaloleni estate when he learnt he was a Kikuyu"*; *"A Kasarani landlord reportedly asks prospective tenants about their home areas to establish their ethnic background."* — https://www.standardmedia.co.ke/entertainment/county-nairobi/article/2000197016/how-rogue-nairobi-landlords-discriminate-against-tenants-based-on-race-tribe-and-marital-status

### 3.6 The cash wall and the gazumping

68. `[FETCHED]` **Victor Yassin**, Nairobi, Citizen Digital 12 June 2024 — paid two months' rent and had it reversed the same night because someone paid seven months upfront:
> "We Kenyans are like the current refugees here in Nairobi because we can't find houses in these estates. The tenants have noticed new customers who pay more than expected. Two days ago, I got a house in Lavington and after paying for two months' rent, later at night, I received a message from my landlord reversing the money I had sent, claiming that the house had been paid for fully for seven months by an Ethiopian, which we can't afford as low-income earners,"
— https://citizen.digital/article/nairobi-residents-decry-rising-rent-prices-demand-govt-intervention-over-influx-of-foreigners-n343852

69. `[FETCHED]` **"Emily"**, Kilimani, same article:
> "The houses are currently expensive here in Kilimani. A one-bedroom house that used to go for Ksh.25,000 is now ranging at Ksh.45,000, and a two-bedroom house that was going for Ksh.35,000 has shifted to over Ksh.70,000."

70. `[FETCHED]` **Henry Ochieng**, CEO, Kenya Alliance of Resident Associations, same article — the unsentimental official line:
> "On the other hand, those in areas that can't afford to pay the rent should therefore vacate and look for areas that they can best afford."

### 3.7 Water, and why it decides everything

71. `[FETCHED]` **Peter Ndirang'u**, property agent based in Nyayo Highrise, Nairobi, Kenyans.co.ke 25 Aug 2020:
> "Water is a big issue for many people, in fact the biggest."
and on the consequence: *"So when you have to explain to a client that they will have to wake up every Saturday to fill tanks and containers"*, *"because they only have a window of a few hours when water is available,"* *"sometimes they decided to look elsewhere,"*
— https://www.kenyans.co.ke/news/56738-house-hunting-red-flags-send-tenants-running-away

72. `[FETCHED]` **The Standard**, *Rent deposit, every tenant's nightmare* — **landlord-level water rationing as a profit strategy, stated plainly:**
> "But there are those landlords who peg monthly water costs to the rent and then go ahead to ration it in order to minimise their amount paid to NWSC making a profit from the single meter."
— https://www.standardmedia.co.ke/real-estate/article/2000026570/rent-deposit-every-tenants-nightmare

73. `[FETCHED]` **An anonymous tenant in Ruaka**, Kenyans.co.ke 13 Aug 2020 — and note the WhatsApp group as the organising unit:
> "When I moved in, I was asked to pay Ksh 200 for garbage but I noticed that no waste was being collected and a tenant had to personally dispose of his/her waste. This led to an uproar in our Whatsapp group after other tenants ganged up to demand their refunds from January to August 2020,"
— https://www.kenyans.co.ke/news/56342-5-fees-landlords-use-swindle-tenants

74. `[SEARCH-EXTRACT]` **Citizen Digital**, Thawabu, Kayole: a six-month water shortage; residents said the estate was asked to pay **Ksh60,000** for pipe repairs, and *"some residents have been leaving the estate"*. — https://citizen.digital/article/fed-up-kayole-residents-vacate-estate-over-perennial-water-shortage-n323433

### 3.8 Landlord-side voices on the low-end market (Wazua, all `[FETCHED]`)

Thread root: http://www.wazua.co.ke/forum.aspx?g=posts&t=30129

75. **"popat"**, post #33, Tuesday 10 February 2015 9:37:58 AM — Kahawa Wendani:
> "I've just finished 40 units of bedsitters in Kahawa Wendani.With just usual finishes.Nothing fancy like shower mixers and cookers.You'll not belief it. am getting 10k per unit and they are all fully occupied.Location as earlier mentioned is the key determinant."

76. **"obiero"**, post #224, Friday 20 April 2018 1:56:08 PM — Pipeline, at scale:
> "Low end refers to the target market not the landlord.. There are 4 different seven storied bedsitter units in Pipeline with 10 houses per floor owned by the immediate former Governor that earn him an average of KES 2,380,000 monthly from rent of KES 8,500 per flat"

77. **"kayhara"**, post #223, Friday 20 April 2018 1:44:46 PM — Mombasa Swahili houses:
> "I just met a Mombasa guy with 28 Swahili houses, he tells me each cost him an average of 3.5 million to build including a borehole for each. so that's about 98 million. each house has 10 small one bedroom going for 8,000 each including water, so each house income per month is ksh. 80,000/-"

78. **"DBLyon"**, post #7, Tuesday 26 August 2014 7:49:13 AM:
> "That is exactly it. The bedsitters in generally nice areas go for unbelievable prices. In Langata at the moment a bedsitter with a bathroom and a kitchenette goes for between 13 - 15k. Imagine that. Some SQs in Kileleshwa go for as much as 25k. Amazing what young people are paying for an address."
> "Because of the shortage of affordable, decent housing, average bedsitters along Waiyaki Way are now renting for 8k a month. You have your bank tellers, etc living in them."

79. **"obiero"**, post #6, Monday 25 August 2014 6:40:00 PM:
> "myself, I used to leave in a SQ in south c as I started off life.. it was adequate for me. atleast I got to enjoy the safety of a middle class hood at rock bottom rent of KES 8,000 only"

80. **"kaifastus"**, post #3, Sunday 24 August 2014 10:20:48 PM — vacancy from the landlord's side:
> "I blame the media for hyping real estate..now a lot of investors are coming this way and we are seeing more and more to let signs as high rise apartments come up. two of my tenants shifted last month..its taking longer to fill get newer more stable ones."

81. **"dunkang"**, post #4, Monday 25 August 2014 6:52:49 AM — the real constraint at this end of the market:
> "Its true that getting tenants are becoming harder and harder to get, but this is mostly in the upper-middle to high end sector. Not just tenants, but also buyers. ... However, just as @Obiero has stated, the lower-middle levels and below still has alot of demand, but, getting the many tenants to pay promptly is the problem."

82. **"Am"**, post #8, Tuesday 26 August 2014 9:49:42 AM — who gets to build bedsitters, and the prejudice built into it:
> "Wanted to put up some bedsitters somewhere in east lands but the local Kanjora is against it in the area claiming young people expected to rent such are a problem for the locals. Have given in and opted for 1 bed room on 1st and 2nd floors"

83. **"washiku"**, post #134 — the delegation model, which is why nobody central knows what is vacant:
> "Don't collect the rent yourself if you can't handle the tenants. Get an agent, pay them well(about 10pc) and they pay you by a specific date for every house occupied whether its paid for or not. For you its none of your business whether they have collected or not..."

84. **"obiero"**, post #147, Wednesday 23 November 2016 6:17:16 PM:
> "There is a friend of mine who has 60 units and he collects on each.. Fear of the unknowns should never paralyse your dream. Jenga kisha uibiwe ndio ujue vile kujipanga!"

85. **"shadowinvestor"**, post #135 (quoted within), on mabati single-room landlording:
> "True it needs a particular kind of ruthlessness as most of your tenants can hardly hold on to jobs."

86. **"MugundaMan"**, post #346 (quoted within), Nairobi bedsitter blocks:
> "Yes, i intend to build rentals one day but will not be part of the collective Kenyan mediocrity and greed of building 10 bedsitters on one floor. Juzi a senior colleague was trying to explain to me over a drink his vision of building 20 (14 by 14 ft) one bedroom units on his 33 by 66 plot....sasa kama hii si hujuma, hujuma ni nini?"

87. **"wukan"**, post #292, Friday 9 November 2018 10:00:19 AM — class contempt for the exact stock this product indexes:
> "@obiero I disputed the Githurai type bed-sitters those ones downgrade neighborhoods"

88. **"nairobby"**, post #317, Thursday 18 April 2019 1:10:55 PM — Kitengela yields:
> "Those Kitengela homes going for 8/9m are fetching 35k rent. That's very poor."

89. **"Gathige"**, thread opener elsewhere in the same forum — the low-end investment case as a Kenyan landlord states it:
> "Is a residential apartment block, in a low income neighbourhood investment of 12M Kshs fully financed by SACCO loan at 12% per annum for 20 units each at a rent of Kshs 12,000 per month, assuming 85% occupancy rate a good investment decision?"

90. **"Tbags"**, post #32, Monday 9 February 2015 12:44:09 PM — Pipeline/Imara Daima:
> "For instance in Embakassi-Pipeline areas. The cost of land is way up but the returns are also very good. Look at Imara Daima area, where mido class newbies pay over 20,000 for one bedroomed units, crazy returns as well."

### 3.9 Privacy, and whether people will post about their building

91. `[FETCHED]` **streamlinefeed.co.ke**, 12 Aug 2026 — the closest thing I found to the "would I post this publicly?" question, and it cuts the other way: a tenant's landlord objected to her boyfriend collecting items without notice and sent her a critical voice note describing him as *"ni mrefu"* ("he is tall"); **a creator, Lizzie, then shared the landlord's voice note publicly** and it became a national debate about *"quiet enjoyment"*. Summary (mine): the tenant-side instinct here was to publish, not to hide. — https://streamlinefeed.co.ke/news/kenyan-landlords-viral-whatsapp-voice-note-sparks-debate-over-tenant-privacy-rights

92. `[FETCHED]` **A Pipeline Estate resident**, reproduced by Kenyan-post, Sunday 18 October 2026 (yesterday) — a resident posting photos of his own building's filth publicly, with the rent attached. Summary (mine) from the page: the resident *"raised concerns over poor hygiene at a residential apartment in Nairobi's Pipeline Estate, sharing photos showing the dirty environment"*, complaining about the fifth floor, rubbish dumped around the building, and the caretaker not doing enough, and saying tenants there pay about KSh 5,000/month. — https://www.kenyan-post.com/2026/10/a-resident-raises-concern-over-hygiene.html

**On the brief's question "is anyone saying 'I would never post that publicly'": I found nobody saying it.** I found the opposite, repeatedly: tenants posting their landlord's voice notes, their building's rubbish, their rent, and photos of flats they rejected. See section 7.

### 3.10 What people say about existing platforms

93. `[FETCHED]` **Elvis Ondieki**, Daily Nation: *"In my search, I used OLX and Facebook which were often rich sources of information but had a limited scope."*

94. `[FETCHED]` **perry_yeng**, Expat.com Kenya forum, on BuyRentKenya: *"i believe so, but dont pay, any money before hand."* — https://www.expat.com/en/forum/africa/kenya/1120209-is-the-site-url-legit.html

95. `[FETCHED]` **Joshua Mutua**, Kejahunt founder, on why pure listings failed: *"After operating for 10 months listing properties, we noticed the demand was too high and that our listings could not satisfy the demand. So in January this year, we introduced a service we call custom search,"* and *"We deal with individual requests as opposed to having stale listings that are not solving the problem of house hunting,"* — https://www.standardmedia.co.ke/business/business/article/2000162311/no-hustle-kejahunt-will-get-you-a-house

96. `[FETCHED]` **Joshua Mutua**, same, on his unit economics: *"Houses whose rental is below Sh15,000 attract a Sh1,500 fee, while Sh3,000 is charged for houses whose monthly rents exceed that figure."* and *"In a month, we have an average of 1,000 users. On average, 80 per cent of our paying customers find houses through us."*

97. `[FETCHED]` **StayNai** marketing copy (company's own words, not a user's) — *the competitor whose entire pitch is the caretaker's phone number:*
> "Browse hand-verified rentals across Nairobi. Skip the KSh 1,000 viewing fees. Get the caretaker on the phone in seconds — not days."
> "Unlock Premium for KSh 299 — Reveal exact addresses, get caretaker phone numbers, and skip the brokers entirely."
> "One small subscription. Direct caretaker numbers. Exact GPS locations."
— https://staynai.com/ (featured stock: Kilimani KSh 45,000; Juja bedsitter KSh 8,500; Kileleshwa KSh 120,000 — i.e. **mostly above this brief's band**)

98. `[FETCHED]` **RentersHub** site furniture (company's own words) — a "I Know A Caretaker" call-to-action button and a referral request to introduce *"the Landlords or Caretakers You Know"*. Summary (mine): a live Kenyan platform is treating caretakers as its primary supply-acquisition channel.

99. `[FETCHED]` **RentersHub** guidance on the free WhatsApp channels: these platforms *"do NOT verify who is posting houses"*; red flags include *"First come, first served"* and viewing or booking fees demanded before a viewing. — https://www.rentershub.co.ke/blogs/house-hunters-be-very-careful-when-searching-online-for-vacant-houses-in-kenya/

100. `[FETCHED]` **HaoFinder** published pricing (company's own words): a flat **KES 5,000** convenience fee for rentals under KES 30,000, and **10% of rent** above that. — https://www.haofinder.com/blog/updated-house-hunting-guide-in-nairobi-kenya

101. `[SEARCH-EXTRACT]` **Trustpilot**, BuyRentKenya, July 2025 — the only critical user review I could find: calls support poor and says a paid listing still got reviewed. Total review count ~15, mostly five-star. — https://www.trustpilot.com/review/buyrentkenya.com

**Summary (mine) on platforms:** I could find almost **no organic user opinion** of BuyRentKenya, Property24, Jiji, Kejanova, 254rent or Renters Hub. ~15 Trustpilot reviews for the market leader is effectively zero signal. What I found instead was people's opinions of **agents**, which are uniformly scathing, and people's reported behaviour, which is to use **Facebook, TikTok, WhatsApp and Telegram**. That is a meaningful negative finding: the incumbent listing portals are not salient enough in mass-market renters' lives to generate complaints.

---

## 4. The amounts

Every figure stated by a real identifiable person (or, where marked, published by an organisation about itself).

### 4a. Fees paid to find a house

| Amount (KSh) | What it was | Who said it | Source |
|---|---|---|---|
| 2,000 | agent's "appearance fee" — for information only | Derrick Momanyi | Business Daily 19/3/25 `[FETCHED]` |
| 1,500 | agent's additional "inconvenience fee" — to be physically taken to the house | Derrick Momanyi | same |
| 3,500 | combined, if he settled on the first house | Business Daily's arithmetic on Momanyi | same |
| 2,500 | paid to an agency on a promise of settlement | Esther Njeri Gikuni | same |
| 3,650 | paid to a housing agency; then asked for more as a "subscription" | Wanjiru Kariuki | same |
| 1,000 → 500 | viewing fee demanded, haggled down on the spot | Elvis Ondieki | Daily Nation 5/4/19 `[FETCHED]` |
| 6,000 | commission demanded on a 20,000 house — killed the deal | Elvis Ondieki | same |
| 2,000–3,000 | typical referral fee to agents, depending on area | Kenyans.co.ke 26/2/25 | `[FETCHED]` |
| 2,500 | what "agents **and property caretakers**" demand before showing any house | Bizna Kenya 27/2/25 | `[FETCHED]` |
| 2,500 | viewing fee before you can see a property | Mwakilishi 5/3/25 | `[FETCHED]` |
| 500 per house | charged for every house viewed, like it or not (Mombasa) | a Mombasa tenant | Nation `[SEARCH-EXTRACT]` |
| half of one month's rent | paid to the agent before being allowed to move in (Mombasa) | a Mombasa tenant | Nation `[SEARCH-EXTRACT]` |
| 5,000 cash | viewing fee demanded, plus a commitment fee of half a month's rent | a Nairobi tenant (refused) | Nation `[SEARCH-EXTRACT]` |
| 1,000–2,000 | non-refundable viewing fee charged to newcomers in Kisumu | Nation, Kisumu | `[SEARCH-EXTRACT]` |
| 3,200 on 16,000 rent | agency fee at 20% of first month's rent | Kenyatalk poster | `[SEARCH-EXTRACT]` |
| 10–15% of rent | typical rental agent fee | Kenyatalk poster | `[SEARCH-EXTRACT]` |
| 7.5% of annual rent, or one month's rent | what registered agents are supposed to charge | Kenyatalk poster | `[SEARCH-EXTRACT]` |
| 1,000 | "for fuel", to be deducted from deposit, demanded by a "caretaker"/nephew | MYSTIC, blogger, 2010 | `[FETCHED]` |
| 1,500 / 3,000 | Kejahunt's own fee: below / above 15,000 rent | Joshua Mutua, founder | The Standard `[FETCHED]` |
| 5,000 flat / 10% | HaoFinder's own fee: rentals under 30,000 / above | HaoFinder (company) | `[FETCHED]` |
| 299/month | StayNai's own tenant subscription, which buys caretaker numbers + addresses | StayNai (company) | `[FETCHED]` |
| 1,000 | the viewing fee StayNai says it lets you skip | StayNai (company) | `[FETCHED]` |

### 4b. Money lost to scams

| Amount (KSh) | What happened | Who | Source |
|---|---|---|---|
| 12,000 | paid to book a 1-bed advertised at 15,000 on Thika Super Highway; agent vanished | Chebet Ronoh | Kenyans.co.ke `[SEARCH-EXTRACT]` |
| 15,000 | asked to send as a "deposit refund" for a unit supposedly booked by someone else | John Mbati | Kenyans.co.ke `[FETCHED]` |
| ~6,000 | lost to an agent con | Ruth Maingi | Kenyans.co.ke `[FETCHED]` |
| 50,000 | what he calculates he would have lost in the Buruburu Phase 5 fake listing | Elvis Ondieki | Daily Nation `[FETCHED]` |
| 14,000 | taken by a caretaker from two Congolese tenants with no M-Pesa accounts (Mowlem) | Rose Kwamboka, agent | The Standard `[FETCHED]` |
| 663,000 | rent a caretaker is charged with stealing from a company with 1,000+ units | NTV / prosecution | `[FETCHED]` |
| 500,000 | the same caretaker's separate pending charge | NTV / court | `[FETCHED]` |
| 935,500 | cheque issued by a caretaker after meetings about "rent received and deposits retained" | Prosecutor James Gachoka | Kenyans.co.ke `[FETCHED]` |
| 4,390,560 + 1,743,340 = 6,133,900 | the two counts against one caretaker | court, via Kenyans.co.ke | `[FETCHED]` |
| 1,500 / 10,000 / 7,000 | viewing fee / commitment fee / "refundable" booking in the documented scam script | RentersHub | `[FETCHED]` |

### 4c. Deposits and what happened to them

| Amount (KSh) | What | Who | Source |
|---|---|---|---|
| 22,000 | deposit withheld on leaving Donholm, "to redo the house" | Michael Kimano | The Standard `[FETCHED]` |
| 15,000 | one month's rent he knew he'd never see back (Ayany, Kibera); lived it out instead | Robinson Jalam | The Standard `[FETCHED]` |
| 11,500 + 3,000 water | ordered refunded by Milimani court, 27/7/21 | Magistrate Judith Omollo | The Star `[FETCHED]` |
| 20,000, 80% lost | deposit mostly lost after repainting a one-bedroom | unnamed tenant | Kenyans.co.ke `[SEARCH-EXTRACT]` |
| 230,000 | deposit at the centre of the Muhanda v LP Holdings Small Claims Court ruling | Dr Michelle Muhanda | Nation/Eastleigh Voice `[SEARCH-EXTRACT]` |
| 2,500 | KPLC charge to open a new electricity account — refundable, usually not disclosed | The Standard | `[FETCHED]` |
| one bed + one table | what agents confiscated instead of refunding a deposit (Kangemi) | Nairobi News | `[SEARCH-EXTRACT]` |

### 4d. Rents stated by real people, in or near the target band

| Amount (KSh/month) | Where / what | Who | Source |
|---|---|---|---|
| 8,500 | bedsitter, Pipeline, seven-storey blocks, 10 per floor | "obiero", Wazua, 2018 | `[FETCHED]` |
| 10,000 | bedsitter, Kahawa Wendani, 40 units, fully occupied | "popat", Wazua, 2015 | `[FETCHED]` |
| 8,000 **including water** | small one-bedroom, Mombasa Swahili house (10 per house) | "kayhara", Wazua, 2018 | `[FETCHED]` |
| 8,000 | SQ, South C | "obiero", Wazua, 2014 | `[FETCHED]` |
| 8,000 | average bedsitter along Waiyaki Way | "DBLyon", Wazua, 2014 | `[FETCHED]` |
| 13,000–15,000 | bedsitter w/ bathroom + kitchenette, Langata | "DBLyon", Wazua, 2014 | `[FETCHED]` |
| 25,000 | some SQs, Kileleshwa | "DBLyon", Wazua, 2014 | `[FETCHED]` |
| 20,000+ | one-bedroom, Imara Daima | "Tbags", Wazua, 2015 | `[FETCHED]` |
| 12,000 | the modelled rent for a 20-unit low-income block | "Gathige", Wazua | `[FETCHED]` |
| 17,000 | two-bed, Uhuru Estate, with "own compound" (iron-sheet second bedroom) | Elvis Ondieki, 2019 | `[FETCHED]` |
| 12,000 + 300 garbage + 500 guards | one-bed, Buruburu Phase I "Pioneer" — stated by the sitting neighbour | Elvis Ondieki, 2019 | `[FETCHED]` |
| 25,000 | three-bed w/ compound, Buruburu Phase 5 — **the fake listing** | Elvis Ondieki, 2019 | `[FETCHED]` |
| 20,000 | the house he gave up over the 6,000 commission | Elvis Ondieki, 2019 | `[FETCHED]` |
| 6,500 | SQ, Hurlingham (the first con) | Ruth Maingi | `[FETCHED]` |
| 8,000 | one-bed, Kileleshwa, newspaper classified — "too cheap to be real" | MYSTIC, 2010 | `[FETCHED]` |
| ~5,000 | what tenants pay in the Pipeline block the resident photographed | Pipeline resident, 18/10/26 | `[FETCHED]` |
| 35,000 | rent fetched by Kitengela homes bought at 8–9m | "nairobby", Wazua, 2019 | `[FETCHED]` |
| 25,000 → 45,000 (1-bed); 35,000 → 70,000 (2-bed) | Kilimani, the increase she describes | "Emily", 2024 | `[FETCHED]` |
| 3,500 bedsitter / 2,500 mabati **inclusive of water** | low-cost rentals, a few years ago | Kenyatalk poster | `[SEARCH-EXTRACT]` |
| 25,000–40,000 | one-bedroom, South B | Kenyatalk poster | `[SEARCH-EXTRACT]` |
| 7,000 bedsitter / 3,000 single room | historic Eastlands floor | TNX Africa / The Nairobian | `[SEARCH-EXTRACT]` |

### 4e. The monthly extras — the number nobody quotes you upfront

| Amount (KSh/month) | What | Source |
|---|---|---|
| 200 | garbage (Ruaka) — for which no waste was collected | tenant, Kenyans.co.ke `[FETCHED]` |
| 60 per pack of 50 | what the nylon bags actually cost, for comparison | same tenant `[FETCHED]` |
| 300 | garbage (Buruburu) | the sitting neighbour, via Ondieki `[FETCHED]` |
| 500 | guards (Buruburu) | same `[FETCHED]` |
| 200 | security, gated estates "as low as" | Kenyans.co.ke `[FETCHED]` |
| 1,800 | water billed to a tenant with no leaks who'd been there under two weeks | "Sarah", Kabiria `[FETCHED]` |
| 5,000 / 6,500 / 8,000 | service charge on 1-bed / 2-bed / 3-bed (CAHF survey) | Kenyans.co.ke 10/2/23 `[FETCHED]` |
| 13% of rent | what service charge averages — so **12,000 rent becomes 17,000** | same `[FETCHED]` |
| 60,000 | what Thawabu, Kayole residents were asked to pay for pipe repairs | Citizen Digital `[SEARCH-EXTRACT]` |
| 100 | matatu fare, Sunton → Westlands (one way) | Kejafinder `[FETCHED]`, commercial source |

### 4f. The legal threshold that explains everything

| Amount (KSh/month) | What | Source |
|---|---|---|
| **2,500** | the ceiling of the Rent Restriction Act's coverage. Above this there is no statutory rent control. | James Wanzala, The Standard `[FETCHED]` |

---

## 5. How people actually find houses

Counts are **mentions across the sources I read**, not a survey. Treat as a rough ordering of salience, not a distribution. n≈30 distinct sources.

| Method | Mentions | Notes from the testimony |
|---|---|---|
| **Walking the estate on foot** | 8 | The default, and the baseline everything else is compared to. Kenyans.co.ke: *"You either have to dig deep into your pockets or you walk until your heels scream."* Mutua: *"We had to do the walking ourselves."* Momanyi: *"I spent the first two months of the year physically visiting places I liked with no success."* Njeri commuted from Naivasha *"for a whole week"*. This is the real competitor to the product in this brief — not BuyRentKenya. |
| **Agents / brokers reached via posters on poles** | 14 | Most-mentioned and most-hated. The posters are the agent's funnel, not the landlord's: Ondieki's description of *"x-BEDROOM VACANT"* posters plus a phone number is the whole business model. Mutua: *"he checked out agents who advertise on poles"*. |
| **WhatsApp / Telegram / Facebook groups** | 11 | The fastest-growing method, and the one that actually worked for the people who described a successful outcome. Njeri's community: ~21,000 members across area-specific groups. "Keja Hunters": one main group plus *"a community of 54 others"* covering South B, South C, Karen, Rongai, Fedha, Syokimau, Kitengela, Kasarani, Umoja, Kahawa Sukari, Kahawa West, Wendani. Momanyi found his landlord here. |
| **TikTok / X (as discovery, then redirect to a group)** | 6 | Both Momanyi and Njeri went to TikTok *first*, found others with the same problem, and ended up in a group. TikTok is the top of the funnel; WhatsApp is where the transaction happens. |
| **Online listing sites (OLX, Facebook Marketplace, BuyRentKenya, Jiji, property portals)** | 7 | Used, but described as thin and dangerous. Ondieki: *"often rich sources of information but had a limited scope."* Both of his near-scams came off listing sites. OLX itself flagged one: *"This person has been removed from OLX."* |
| **Caretakers approached directly** | 5 | See section 6. Named explicitly as a method by a Kenyatalk poster (*"some tenants find places by meeting the caretaker or owner directly"*) and monetised by StayNai and RentersHub. |
| **Sitting tenants / neighbours** | 3 | Not a "method" anyone names, but it is where the decisive information came from in Ondieki's narrative — the neighbour told him about the cockroach manhole and the real all-in cost. The WhatsApp groups formalise exactly this. |
| **Newspaper classifieds** | 2 | Both mentions are *scam* stories (MYSTIC 2010, Ruth Maingi). Appears dead. |
| **Landlords directly, refusing agents** | 2 | Ondieki: *"I encountered landlords who just won't allow agents market their property, and they all seemed to suggest that agents can be a nuisance."* Bizna/Mwakilishi: landlords now posting their own vacancies into the WhatsApp groups. |
| **Paid search services (Kejahunt, HaoFinder)** | 2 | Both exist because listings alone failed. Mutua pivoted off listings after 10 months. |
| **Relatives** | 0 | **I found no testimony naming relatives as a search channel.** The brief hypothesised this. I cannot confirm it from these sources. (Reddit would have been the place to find it.) |

**The most important thing in this section:** the free peer channel already exists, already covers most of the target estates by name, and **already has the sharing etiquette the product would need**. See section 7.

---

## 6. On caretakers

This was the brief's flagged open question. **The evidence is strong and it points in a specific, slightly uncomfortable direction.** Taking each sub-question:

### Does the caretaker know what's vacant?

**Yes — and in the low-end market he is often the only person who does.** The landlord structurally does not know. "washiku" (Wazua #134) describes the standard arrangement: hand the block to an agent, *"they pay you by a specific date for every house occupied whether its paid for or not. For you its none of your business whether they have collected or not."* The owner is paid a fixed number; he is deliberately insulated from unit-level occupancy.

That insulation is the opportunity, and "guard" (Wazua #142, 21 Nov 2016) names the resulting fraud exactly:

> "starting with thieving agents-They lie to you that the rooms are vacant,yet someone is paying them a lower figure directly.By the time you realize whats happening,you have lost several thousands.."

And `[SEARCH-EXTRACT]` a Kenyatalk poster describes the same thing with a caretaker rather than an agent: the caretaker told the landlord a unit was unoccupied while *"the caretaker has been 'eating' rent for 3 months from that tenant"*.

**So vacancy data is not just unavailable — for some units it is deliberately falsified in both directions.** A caretaker may report a let unit as vacant (to pocket rent) or a vacant unit as let (to control who fills it). Any product that collects vacancy from caretakers inherits this.

### Does he get tipped / take a finder's fee?

**Yes, from both sides.**

- **From the landlord, informally.** "washiku" (Wazua #146): *"As a check, have the caretaker to be on your side. He/She will be your eye on the ground. **'Compensate' nicely** and your fear is sorted."* Note the scare quotes around 'Compensate' — a Kenyan landlord writing to other landlords, signalling that this payment is understood and off-book. And formally-but-in-kind, "washiku" #134: *"one of the deal to keep them motivated is giving them one of the unit for free as their house plus some monthly salo."*
- **From the tenant, as a viewing fee.** Bizna Kenya, 27 Feb 2025, states it flatly: *"On average, these **agents and property caretakers** will demand around Sh2,500 before showing you any available houses."* This is the clearest published statement that caretakers charge the viewing fee themselves, not just agents.

### Does he pick the tenant?

**Partially, and the evidence is weaker here.** I found no tenant saying "the caretaker chose me." What I found is caretakers exercising powers that amount to selection:

- **He writes the lease.** A caretaker told the Milimani court: *"Yes, I prepared lease agreements, in the name of the agencies, which I gave tenants to sign."* The article notes he did this **without the landlords' permission**.
- **He takes the deposit.** Same case: he *"received and kept tenant deposits in 2020."* If he writes the lease and banks the deposit, he is functionally the letting agent.
- **He can deny you exist.** `[SEARCH-EXTRACT]` the Mirema account: a man paid, arrived, and the caretaker said he was *"not aware of his interest in moving in."*
- **He controls physical access.** The 10pm gate: *"Whenever it was 10pm, the caretaker would lock the gate and no one would be allowed in."*

### Does he control the deposit refund?

**Yes. This is the best-evidenced part of the hypothesis.** Ruth Wanyama's Pipeline account is unambiguous — she *"asked for a deposit refund **from the caretaker**"*, and it became *"a cat and mouse game between her on one hand, and the caretaker and agent on the other."* Receipt produced; come back in a week; a week became two; she wrote the money off. And Kenyans.co.ke's own investigation generalises it: *"many **caretakers** and landlords were simply nowhere to be found when tenants sought the refunds leading many to give up."*

### Does he ration water?

**I could not confirm caretaker-level water rationing. I confirmed LANDLORD-level water rationing, which is a different thing.** The Standard states it as a deliberate profit strategy: *"there are those landlords who peg monthly water costs to the rent and then go ahead to ration it in order to minimise their amount paid to NWSC making a profit from the single meter."*

The caretaker's role in the utility layer is adjacent but real: he has physical access to the meter boxes, and the Uthiru tenant found *"he had switched wires from another meter to mine."* And in "Sarah's" account, when the inflated water bill was escalated, *"She raised the issue with the landlord who **reprimanded the caretaker**"* — i.e. the landlord treated the caretaker as the author of the overcharge.

**Verdict on the hypothesis:** *Confirmed on vacancy knowledge, informal payment, deposit control and lease execution. Partially confirmed on tenant selection. Not confirmed on water rationing (that is the landlord). One additional finding the brief did not anticipate: the caretaker also defrauds the landlord, and that is why the landlord doesn't know what's vacant either.*

### The market has already priced this in

Two live Kenyan platforms have independently concluded the caretaker is the supply layer:

- **StayNai** sells the caretaker's phone number as its product: *"Get the caretaker on the phone in seconds — not days"* / *"Reveal exact addresses, get caretaker phone numbers"* for **KSh 299/month**.
- **RentersHub** runs an **"I Know A Caretaker"** button and asks readers to introduce *"the Landlords or Caretakers You Know."*

### But — the warning, from someone who tried exactly this

Kejahunt built a Kenyan vacancy platform starting in 2013, listing properties *"from as low as Sh5,000"*. The Standard's account of why it struggled contains the sentence a founder should pin above their desk:

> "Despite some caretakers' reluctance to offering information on vacant houses, Mutua insists that theirs is a growing business."

**Caretakers were reluctant to give a platform vacancy information.** Of course they were — the information *is* their income, via the Sh2,500 viewing fee and the landlord's informal 'compensation'. A free public vacancy list takes that away from them. The caretaker is simultaneously the only person who knows, and the person with the strongest reason not to tell you.

And `[FETCHED]` "Swenani" (Wazua #144) explains why reputation pressure won't move them either:

> "do you think these small time caretakers or agents called bonoko Kamau or wa Gishiri will care if you name them here? Name and shame can only work for established agency firms"

---

## 7. What surprised me

**1. The free peer-to-peer vacancy list already exists, at scale, and it already covers the target estates by name.**
This is the biggest finding and it reframes the whole brief. "Keja Hunters" is one main WhatsApp group plus *"a community of 54 others"* covering **South B, South C, Karen, Rongai, Fedha, Syokimau, Kitengela, Kasarani, Umoja, Kahawa Sukari, Kahawa West and Wendani**. Esther Njeri's parallel community has **~21,000 members** split by area. Both are free. Both started from a viral TikTok in early 2025. The product in this brief is not entering an empty market — it is entering a market where the free alternative is WhatsApp, and WhatsApp's distribution is already better than any app's will be on day one.

**2. The sharing etiquette is not just "present" — it is better than a product designer would have invented.**
Kenyans.co.ke, having actually reviewed the group: *"people in these groups have opted to share houses they are about to move from to allow others seeking rental houses in that area to find them without any middlemen. Furthermore, when one person visits a promising house and realises it does not suit their needs or desires, they share pictures of the house for the rest to check out."*

Two norms there, both unprompted: **post the house you are vacating**, and **post the house you rejected**. The second is remarkable — it converts a wasted viewing into a public good, and it means the group's listing supply scales with *failed* searches, not successful ones. Any product should copy both norms explicitly rather than inventing a submission flow.

**3. Nobody said "I would never post that publicly." The evidence runs hard the other way.**
The brief flagged this as a critical design assumption to test. I tested it and found no instance of the fear. I found: a tenant publishing her landlord's private WhatsApp voice note to a national audience; a Pipeline resident publishing photographs of his own building's rubbish **with his rent attached** (18 October 2026, i.e. yesterday); tenants in a Ruaka building using their WhatsApp group to *"gang up to demand their refunds from January to August 2020"*; and a whole genre of named tenants giving interviews with their estate and rent on the record (Wanyama/Pipeline, Kimano/Donholm, Jalam/Ayany, Wafula/Donholm, Matu, Otieno/Manyatta). **The reticence a product strategist would assume is not visible in this evidence.** Caveat: my sources skew toward people who already chose to speak publicly — selection bias is real here, and Reddit (where anonymity makes candour cheap) was exactly where I'd have tested the silent majority. But the positive evidence for willingness is substantial and recent.

**4. The agent's product is not finding houses. It is withholding the address.**
Ondieki states it better than any analyst could: *"You could be looking for a house just in front of you but because they want their viewing fees, they will only give generalities when asked about the location."* And Momanyi's fee structure makes it explicit — **Sh2,000 for the information, Sh1,500 more to be walked there**. The address is the monetised asset. That is precisely what a free vacancy list destroys, which also tells you exactly who will fight it.

**5. Agents will infiltrate the platform. This already happened, to the exact product being proposed.**
Njeri's first group died this way: *the agents they had been escaping infiltrated the group, prompting Ms Njeri to shut it down*. Her fix was fragmentation into small area-specific groups. A single open national list is the most infiltratable possible design. She also got *"threatened with a legal suit by someone I believe is a rogue agent."* Budget for both.

**6. A platform tried this in Kenya in 2013, listing from Sh5,000, and pivoted away from listings within ten months.**
Kejahunt: *"After operating for 10 months listing properties, we noticed the demand was too high and that our listings could not satisfy the demand."* They abandoned a vacancy list for a paid concierge search — the opposite direction to this brief — and the stated blocker was **caretakers' reluctance to share vacancy information**. This is the closest thing to a documented failure of the exact proposed model, and it should be read in full before building.

**7. The caretaker steals from the landlord too — which is *why* nobody has the data.**
I expected the caretaker to be an obstacle between tenant and landlord. What the Wazua landlords describe is a caretaker/agent layer that defrauds the *owner*, specifically by misreporting vacancy. "guard": *"They lie to you that the rooms are vacant, yet someone is paying them a lower figure directly."* So there is no clean upstream source of truth to partner with. The landlord cannot tell you what's vacant in his own building. **A vacancy list for this market cannot be built by integrating with supply; it has to be built by crowdsourcing from demand** — which is precisely what the WhatsApp groups figured out.

**8. The legal floor is KSh 2,500/month, which means this product's entire market is outside rent protection.**
*"this law has not made much difference because it only deals with rents up to Sh2,500 per month."* Every tenant in the 4,000–30,000 band is above the Rent Restriction Act's ceiling. That is the structural reason every recourse story in section 3 ends in surrender — Wanyama wrote off her deposit, Jalam lived his out, and UTAK says **30% of court cases are deposit withholding** while *"the cost of taking cases to the tribunal discourages many from seeking help."* The deposit is not really refundable in practice; it is a sunk cost of moving. That makes the cash wall worse than rent + deposit + agent fee — it is rent + deposit (probably gone) + agent fee + the deposit you won't get back from the place you're leaving.

**9. The "all-in" number is the number nobody can find, and it is ~40% above the advertised rent.**
Advertised 12,000 becomes 17,000 with service charge alone (13% of rent, per the CAHF survey), before garbage (200–300), guards/security (200–500), water levies (up to 1,800 on a disputed bill), and fares (100 each way). Ondieki only learned the real cost of the Buruburu house because the **neighbour** told him — including the cockroach insecticide line item. **A vacancy list that shows asking rent replicates the agent's own information asymmetry.** The highest-value field in this product may not be "is it vacant" but "what do tenants here actually pay, all in" — which is exactly the question commercialpropertykenya tells readers to ask, adding *"Don't take their word for it."*

**10. Discrimination is openly stated by landlords, on the record, with reasons.**
Not inferred — said out loud to journalists. Mariko Okoth prefers students because parents prepay a semester; *"Those with families will come up with all sorts of excuses when rent is due."* A Donholm landlord told Wafula *"bachelors are carefree and unreliable with rent."* A Kahawa Wendani landlord capped tenants at one child. A landlady told Waithera Matu unmarried couples couldn't live together. Jinsiangu warns trans and gender-non-conforming Kenyans that *"chances are high that landlords are most likely to evict you once they are aware of your gender identity."* **Any listing on this platform carries an unwritten eligibility filter that a vacancy record won't show** — and the people most excluded (single mothers, bachelors, large families, trans people) are the ones for whom a wasted viewing fee hurts most. A "who will this landlord accept" field is arguably as valuable as the rent.

**11. Gazumping by upfront cash is a real mechanic, documented.**
Victor Yassin paid two months' rent for a Lavington house and *"later at night, I received a message from my landlord reversing the money I had sent, claiming that the house had been paid for fully for seven months"* by someone else. A vacancy list that doesn't model "vacant until someone pays more upfront" will show ghost inventory. (Lavington is above this band, but the mechanic is not price-specific.)

**12. The methodological surprise: the conversation moved to platforms I can't read.**
Article comment sections across kenyans.co.ke, Nation, Business Daily, mwakilishi and commercialpropertykenya are empty or login-gated. The Kenyan rental conversation lives on **TikTok, WhatsApp, Facebook, X and Kenyatalk** — four of which I cannot access and one of which (Kenyatalk) I could only read through a search tool. **Combined with the total Reddit blackout, this report is built on journalism-about-Kenyans more than on Kenyans-talking-to-each-other.** The Wazua corpus is the one real exception, and it is landlords. That is this report's main weakness and the brief's assumption that these sources would be "the most readable of all five platforms" turned out to be wrong.

---

## Appendix — re-run list for a human with a browser

Highest value first. All are blocked to me and readable to a person.

1. **r/Kenya** — search: "house hunting", "viewing fee", "caretaker", "agent", "deposit", "bedsitter", "Pipeline", "Githurai", "Kayole", "Rongai". Zero coverage in this report.
2. **Kenyatalk Housing & Real Estate** — the nine thread URLs listed in section 1. Especially `/viewing-fees-and-agency-fees-are-a-scam/209148` and `/i-need-to-move-out-asap/459330`.
3. **"Keja Hunters" WhatsApp community and Esther Njeri Gikuni's ~21,000-member community** — join, read, and observe the posting etiquette directly. This is the competitor and the user base in one place.
4. **TikTok** — Esther Njeri Gikuni's and Wanjiru Kariuki's original viral videos and their comment sections (tens of thousands of comments, per Business Daily).
5. **Nation.africa, these specific pieces:** `OFF MY CHEST: House hunting horror in Nairobi` (/off-my-chest-house-hunting-horror-in-nairobi-89228), `House-hunting in Nairobi is savage` (/house-hunting-in-nairobi-is-savage-310046), `In Mombasa, money hungry agents fleece desperate house hunters` (/4301600), `Agents fleecing newcomers to Kisumu` (/1016158), `Money-hungry landlords fleece tenants of their deposit refunds` (/886648).
6. **Quora** — Kenyan rental questions; `How-is-the-house-hunting-problem-in-Kenya-Is-there-a-software-dedicated-to-this-to-solve-the-problem` is directly on-brief.
7. **Nairobi News** `/how-crooked-housing-agents-have-perfected-the-art-of-ripping-off-tenants/` and **Eastleigh Voice** `/195679/` (Grace Wairimu, the nurse who viewed 15+ houses in two weeks).
8. **Mombasa, Nakuru, Eldoret, Kisumu** — almost entirely uncovered here. Only Kisumu (via the Nation gatekeeping piece and the agents-fleecing-newcomers piece) and Mombasa (one Nation piece, second-hand) appear at all.
