# The Graveyard: What Happened to Everyone Who Tried This Before

**A postmortem study of community-contributed rental directories and the markets they tried to fix**

Date: 2026-10-19

---

## Method and confidence note

This is an evidence report, not an argument. Everything below has a URL. Where I searched and found nothing, I say so — those gaps are in their own section at the end and should be treated as findings, not as absence of risk.

Three warnings about the evidence base. **Kenyan startup deaths are almost entirely undocumented** — there is no Kenyan equivalent of TechCabal's post-mortem coverage of Nigerian startups, and KejaHunt, the closest Kenyan analogue to the proposed idea, died without a single news article; I had to establish it from database status fields. **Several platforms' claims are marketing only**, flagged inline as **[company claim]**. And the single most important question — what fraction of tenants will voluntarily report a vacancy — **I could not answer directly for housing anywhere**; the best proxies are from adjacent domains and are in "Numbers worth stealing."

---

## What actually happened

| Attempt | Market | Crowdsourced? | Outcome | Documented cause |
|---|---|---|---|---|
| **KejaHunt** (KE, 2013–~2021) | Explicitly "low and middle income earners" | No | **Dead.** PitchBook: out of business, March 2021; Tracxn: "deadpooled" | No published reason. Started as free listings, pivoted to a fee per bespoke human search, then died — the pivot is the signal |
| **Jumia House Kenya** (–2019) | Broad | No | **Dead, March 2019.** Redirected to Jumia Deals | No official statement |
| **Jumia House Nigeria** | Broad | No | **Sold Nov 2017** to ToLet.com.ng | Reported as having "failed to scale" |
| **OLX Kenya** (–2018) | Broad, free, no commission | Open posting — closest existing precedent | **Dead Feb 2018**, assets to Jiji 2019 | 40% drop in "prime transactions"; data cost, internet penetration, post-election economy |
| **Hauzisha** (KE) | Moved up-market | No | **Alive, but quit rentals entirely** | Own words: "We chose to do one thing well… That focus is hard to deliver across a large, fast-moving rental market" |
| **BuyRentKenya** (2012–) | Mid/upper | No | **Alive.** Acquired by Ringier / One Africa Media | Survives by selling to agents. Private listing: KSh600 (2014) → KSh1,500/30 days |
| **Property24 Kenya** | Mid/upper | No | **Alive** (one source says the Westlands office closed) | Agent subscriptions |
| **SpaceYako** (KE) | Mid | No | **Alive.** Listings auto-expire at 60 days | States plainly it does **not** verify property ownership |
| **HaoFinder** (2016–), **Kejani**, **RentYetu** | Mid / landlord SaaS | No | Alive, tiny. HaoFinder: 3 employees (Gust). RentYetu is management software, not a marketplace | **[company claim]** HaoFinder "1000+ active daily users" |
| **Tenantt, Renters Hub, CribsKenya, CribSeek, StayNai, KejaChapChap, Mahali, Reemio, Mkaazi, Zakhem, Nyumbani** | Mass/mid, all advertise "no agent fees" or "verified" | No | **Status unknown.** Live sites, zero independent coverage, no listing counts; Mkaazi and Zakhem returned nothing at all | Could not find out |
| **"Keja Hunters" WhatsApp group** (KE) | Mass market | **Yes — the real precedent.** Outgoing tenants post the unit they are vacating | Running Feb 2025 | **54 other members.** That is the whole thing |
| **NoBroker** (IN, 2014–) | Mass, zero-brokerage | Partly: "direct owner outreach and referral programs" | **Alive, unicorn.** $361m raised, 7.5m properties, 500k+ transactions/yr | **Abandoned the premise.** The Ken (2024): "Nobroker is no longer no broker" — owners now pay for tenant data in Bengaluru and Chennai |
| **Nestaway** (IN) | Mass, managed rentals | No | **Collapsed.** $220m (2019) → $11m (2023), a 95% cut | Spent ₹3 per ₹1 of revenue; FY22 revenue fell 47% to ₹57.87 crore; all co-founders but one left |
| **Housing.com** (IN) | Mid | **No — field teams** | Alive (acquired) | Sent teams to photograph properties and survey amenities; 2014 raise to map 40m houses, 300 cities |
| **Mamikos** (ID, 2015–) | **Mass — boarding houses (`kost`)** | **No — "Mamichecker" staff visit** | **Alive, large.** 140,000+ kost properties | Closest live mass-market analogue; paid inspectors + owner subscriptions |
| **QuintoAndar** (BR) | Mid | **No — paid referrals to building doormen** | Alive, $4bn valuation (2021) | Takes first month's rent + ~8% monthly owner fee; now monetises a partner-agent network |
| **Spleet** (NG) | Mass, monthly rent | No | **Pivoted to lending, then layoffs (Feb 2024); CEO removed (Mar 2024)** over alleged $1.5m misappropriation | Founder: the marketplace "could not scale" — "while the startup kept attracting more tenants, it couldn't match up on the landlords' end" |
| **LeaseSwap NYC** (US, 2023–) | Mid | **Yes — purest analogue found.** Tenants post the unit they are vacating; reciprocity unlocks the map | **Alive but transformed** into an aggregator scraping StreetEasy/LeaseBreak/NYBits/Reddit, plus a ~$25/mo paid tier | See below |
| **Map Kibera** (KE, 2009–) | Informal-settlement mapping | **Yes** | Alive as an organisation | **Ended up paying.** Phase 1 a one-time "appreciation"; Phase 2 sought a self-supporting model and "eventually ended up paying the group" |
| **Ushahidi–Haiti** (2010) | Crowdsourced crisis reports | **Yes** | Delivered; verification broke | Of 3,500+ published messages, **only 202 were tagged verified** |
| **Motor City Mapping** (Detroit, 2013) | 380,000 parcels of vacancy data | **No — paid resident surveyors** | **Succeeded.** Whole city in ~2 months | 150–200 paid surveyors and drivers, ~2 min/parcel |
| **GasBuddy** (US) | Perishable prices; points → raffles | **Yes** | Alive at scale: 2–3m data points/day **[third-party case, not company data]** | "The data is only as fresh as the last person who reported it, and most drivers never report"; low-traffic stations "go stale for weeks" |
| **WFP mVAM Kakuma** (KE, 2015) | Crowdsourced food prices, airtime-incentivised | **Yes** | Ran | **~6% SMS response rate.** 1,600–1,700 texts weekly to hit 100 completed responses |

---

## The pattern in the deaths

**1. Every death was a supply death, not a demand death.** Not one failure above was caused by too few tenants. Spleet's founder said it outright: tenants kept coming, "it couldn't match up on the landlords' end." Hauzisha quit rentals because the market was "large, fast-moving" — the supply side would not hold still. Jumia House Nigeria "failed to scale." KejaHunt's pivot from free listings to paid bespoke searching is the behaviour of a company that could not keep a listings database alive and fell back on humans doing the walking.

**2. Everyone who attacked the broker fee re-introduced a fee.** NoBroker is the strongest case in the world for the anti-brokerage pitch — unicorn, $361m raised, 7.5m properties — and by 2024 The Ken's reporting was headlined "Nobroker is no longer no broker," with owners paying subscriptions for tenant data. QuintoAndar, often described as eliminating brokers, takes the first month's rent plus ~8% of monthly rent and now explicitly monetises a *network of partner agents*. Mamikos sells owner subscriptions. **I found zero examples, in any market, of a rental listings platform that reached meaningful scale and still took no money from anyone.**

**3. Free, open-posting classifieds is a solved experiment, and it failed in Kenya specifically.** OLX Kenya was exactly "free, open posting, no commission, mass market." It died in February 2018. Jiji inherited it and now carries documented fake-listing patterns. Open posting does not fail from lack of posts; it fails from lack of trust.

**4. Verification is the cost centre that kills, and the survivors retreated from it.** Ushahidi–Haiti verified 202 of 3,500 reports — 5.8%, under crisis-level mobilisation. SpaceYako, a live Kenyan platform, states that it does **not** verify who owns the property. Craigslist checks a phone number only at posting creation and does not confirm "that the poster owns or manages the property, or that the unit even exists." Hauzisha's answer was to shrink the catalogue until a small in-house team could verify all of it — and to leave rentals.

**5. Volunteer labour converted to paid labour wherever the data mattered.** Map Kibera started unpaid, met explicit resistance to the "voluntary" framing, and ended up paying the mappers. Detroit skipped the experiment and hired 150–200 residents. Housing.com sent field teams. Mamikos sends Mamichecker staff. Waze's founder describes needing "a small group of highly engaged people to build the map" first against "a totally blank canvas."

---

## The pattern in the survivors

**The survivors did not survive on crowdsourcing.** They survived on one of three things.

**(a) Selling to the supply side rather than disintermediating it.** BuyRentKenya and Property24 Kenya are the oldest surviving Kenyan rental portals, and both make money from agents. BuyRentKenya did not fight brokers; it sold them software (OriginCRM) and leads, and raised its private listing price from KSh600 to KSh1,500. That is the Kenyan survival pattern, and it is the opposite of the proposed model.

**(b) Paying the gatekeeper, not the crowd.** The most transferable finding in this report is from QuintoAndar's CTO in a LAVCA interview: *"an innovative referral program for apartment building doormen initially helped kick-start growth of inventory."* They did not ask tenants to report vacancies. They paid the one person in each building who knows within hours when a unit empties, and who is already there every day. In Kenya that person is the caretaker.

**(c) Buying the data outright with field staff.** Mamikos — mass market, boarding houses, 140,000+ properties, the closest structural analogue to Kenyan bedsitter and single-room stock — got there with an inspection team. Detroit got 380,000 vacancy records in two months with paid surveyors at ~2 minutes per parcel.

**Where crowdsourcing did survive, it survived on passive telemetry, not active reporting.** Waze in 2012: 36 million users, 90 million reports — and **65,000 users made all 500 million map edits**, 0.18% of users doing the structural work. The other 99.8% contributed by driving, i.e. by doing something they were going to do anyway. GasBuddy works because reporting a price takes seconds *while you are already at the pump* — and even then "most drivers never report." **A vacancy report has no passive equivalent. There is no sensor on a tenant that fires when their neighbour moves out.**

---

## The closest analogue: LeaseSwap NYC

The only case I found anywhere of someone building precisely the proposed thing — tenant-reported vacancies, free, no commission, seeded through social media — and it has a three-year arc.

**The seed worked, spectacularly, and once.** In April 2023 Giulio Colleluori, after queuing at a Manhattan open house, made a shared spreadsheet pairing tenants who were leaving with tenants who were looking. He posted it to r/nyc and got **about 100 entries in one day**. This is the best evidence available that the proposed Facebook/WhatsApp cold start will work. It will.

**The reciprocity mechanic is the right mechanic.** He moved it to an app where you unlock the map of other tenants' listings by either listing the unit you are vacating or recruiting two others. That solves the free-rider problem, and it is the same mechanic "Keja Hunters" arrived at independently in Nairobi.

**The ceiling was low.** At the time of the Gothamist report: **more than 300 listings and about 1,300 users** — in the largest and most desperate rental market in the United States, with free national press. Not 30,000. Three hundred.

**Moderation was one man, by hand.** Colleluori "manually reviews listings, removes apparent fake apartments, and deactivates users who appear to be brokers." No algorithm, no community moderation, no local volunteer admins. Note what he spends his time removing: **brokers trying to get in.** That is the predicted attack, confirmed.

**It monetised almost immediately** — ~$25/month for alerts from StreetEasy, Craigslist and other sites. The free crowdsourced map was not the product; it was the funnel.

**And then it became a scraper.** As of October 2026 leaseswap.nyc describes itself as an aggregator pulling listings from StreetEasy, LeaseBreak, NYBits and Reddit, *plus* peer-to-peer takeovers; one of its own guides cites 45 verified listings. The tenant-reported commons did not grow into the product — it became a feature beside scraped inventory and a paid tier.

**The sibling case points the same way.** Eric Li's NYC housing group on LinkedIn reached ~6,000 members — twenty times LeaseSwap's registered base — by doing nothing but banning broker fees and relying on LinkedIn's real-identity profiles, which he said cut the "fraud, bots, and spam" that were "common on Facebook, Craigslist, and Reddit." **The group outgrew the app.** The value was identity and a rule, not software.

**The Kenyan twin took the other road and died.** KejaHunt, founded August 2013 out of Nailab and explicitly aimed at "low and middle income earners finding affordable housing" — the stated target market here — began as a listings site and pivoted to charging a fee per bespoke search. PitchBook records it out of business as of March 2021. Nobody wrote about it.

---

## Numbers worth stealing

**Contribution rates.** **0.18%** of Waze users made map edits (65,000 of 36m, who made all 500m edits, 2012). The **1% rule** baseline: ~1% create, 9% comment, 90% lurk. **~6%** SMS response rate for incentivised crowdsourced food prices in Kakuma, Kenya — 1,600–1,700 texts weekly to get ~100 completed responses, paid in 10 free texts; **this is the most transferable number here** (Kenyan, low-income, perishable data, airtime-incentivised). **~100** spreadsheet entries from LeaseSwap's first Reddit post, in one day. **54 other members** in "Keja Hunters", the flagship Kenyan informal precedent (early 2025). **~6,000** members in the LinkedIn NYC housing group — achieved with a rule and real identities, no product.

**Retention.** Wikipedia newcomer retention one year after the 10-edit milestone fell from **~40%** (2004 cohort) to **~10%** (2009 cohort). Map Kibera: unpaid start, resistance to the "voluntary" framing, a one-time "appreciation" in phase 1, "eventually ended up paying the group" in phase 2.

**Verification.** **202 of 3,500+** (5.8%) Ushahidi–Haiti reports tagged verified. **60–80%** of SMS-collected mVAM price responses needed no cleaning (better than IVR). **84% → 0%**: the range of completeness achieved by remote participatory mapping across seven slums in Africa and Asia, varying with building density and roof morphology. **~30%** OpenStreetMap building completeness in sub-Saharan Africa.

**Decay and cost per record.** **60 days** — SpaceYako's automatic listing expiry, a live Kenyan operator's own answer to decay. **30 days** — BuyRentKenya's paid private listing. Motor City Mapping: **~2 minutes per parcel**, 150–200 paid surveyors, 380,000 parcels in ~2 months, with mini-grants working out to roughly **$1 per parcel surveyed**. GasBuddy, qualitative but precise: low-traffic stations "go stale for weeks."

**Fraud.** FTC: **~65,000 rental-scam reports and ~$65m in losses since 2020**, median loss **$1,000** (data through June 2025). In the 12 months to June 2025, **~50%** of rental-scam reports originated with a fake ad **on Facebook**, Craigslist ~16% — that is the proposed distribution channel. People aged **18–29 were 3× more likely** than other adults to report losing money to a rental scam; that is the mass-market tenant. **~1 in 5** online renters met a fraudulent listing in the prior year (2022 Apartment List survey, secondary source).

**Kenyan market context.** **77.1%** of Kenyan rentals are flats and apartments; **88.8%** of rental properties were successfully leased in 2023, implying roughly an 11% vacant share (Kenya Housing Survey 2023/24, via secondary report). **~70%** of Nairobi's 4.4m residents are tenants in single-room units, about half informal and half tenement. **57%** of Kibera tenants had lived in their unit under two years — but that is a **1983** figure, and I found no modern Kenyan turnover number. Agent fees: viewing fees of **KSh500** (2 days), **KSh2,500** upfront or **KSh3,000** flat; referral fees of **KSh2,000–3,000** per placement. **~500** certified estate agents against an estimated **40,000–50,000** unregistered operators — **flagged: the only source is a commercial listings platform with no methodology.** Treat as folklore until checked against the EARB register.

---

## What this predicts for Kenya

Stated so they can be proved wrong.

1. **The cold start will succeed and will mislead you.** Expect 100–500 listings in the first two to four weeks from Facebook and WhatsApp distribution; LeaseSwap got ~100 in a day from one Reddit post. That burst is a one-time harvest of people moving *right now* plus a backlog of known-vacant units — not a flow rate. **Falsifiable: if week-8 inflow is below 25% of week-2 inflow, it was a harvest.**

2. **Active contribution will land between 0.2% and 6% of reached users, not 10%+.** Waze editors 0.18%; the 1% rule; Kakuma SMS ~6% *with* airtime incentives. A vacancy report has no passive-telemetry equivalent, so expect the low end. **Falsifiable: unique reporters ÷ unique visitors, monthly.**

3. **Brokers will enter as contributors within the first month and become the majority of supply.** LeaseSwap's founder spends his moderation time deactivating them. With tens of thousands of unregistered operators competing for KSh2,000–3,000 referral fees, posting to a free high-traffic directory is pure upside. **Falsifiable: sample 50 listings at month 3 and phone the contact; predict >50% are agents or brokers, not tenants or landlords.** If so, you have rebuilt BuyRentKenya with no revenue.

4. **Listings will go stale faster than they are confirmed.** SpaceYako, in this exact market, expires listings at 60 days; GasBuddy's low-traffic stations go stale for weeks. Confirmation is a second ask of a contributor who has already moved on. **Falsifiable: predict median time-to-first-confirmation exceeds median time-to-letting for sub-KSh15,000 units.** If true, the confirm mechanic is decorative.

5. **Facebook and WhatsApp distribution imports the fraud rate of Facebook rentals.** Half of all FTC-reported rental scams in the year to June 2025 came from fake Facebook ads, median loss $1,000, with 18–29-year-olds 3× over-represented. Expect the directory to be used as a laundering surface for viewing-fee scams within weeks. **Falsifiable: scam complaints per 100 listings by month 3.**

6. **Community verification will not reach the volume required.** Ushahidi, with crisis-level mobilisation, verified 5.8%. **Falsifiable: predict under 20% of listings ever receive a second independent confirmation.**

7. **Volunteer local moderators will be captured.** The evidence here is weaker and I am explicit about it: Nextdoor's lead programme is documented as criticised (no required training, leads cannot be voted out, publicly criticising moderation decisions is banned) but I found **no documented case of a volunteer moderation programme formally terminated for capture.** The Kenyan risk is structural rather than evidenced — a per-estate moderator in a market where the gatekeeping role is worth KSh2,000–3,000 per placement is being handed a monetisable asset. **Falsifiable: predict that within 6 months at least one estate moderator is found charging for placement or priority.**

8. **The project will face the same fork as everyone else: pay the gatekeeper, charge somebody, or shrink.** All three exits are documented — QuintoAndar paid doormen; NoBroker, Mamikos and QuintoAndar all charge; Hauzisha shrank to a verifiable catalogue and quit rentals. **The caretaker is the Kenyan doorman.** If this project does one thing differently from the twenty-odd attempts above, the evidence says it should pay caretakers a small per-confirmed-vacancy fee rather than ask tenants to volunteer — and then it is no longer free, which is the honest finding.

---

## What I could not find out

Stated explicitly, because filling these with reasoning would be the worst thing this report could do.

- **Why KejaHunt actually died.** No article, no founder post-mortem, no announcement — only database status fields.
- **Why Jumia House Kenya closed.** No official statement; the only published explanation is speculation about Jumia's NYSE listing.
- **The size, age, admin structure or fee practices of large Kenyan Facebook or Telegram house-hunting groups.** I searched repeatedly. Press coverage confirms the groups exist and calls the trend "at its early stages," but **names only one ("Keja Hunters", 54 other members)** and gives no other member counts, founding dates, admin identities, or anything on whether admins charge for posts. **This is the biggest gap and it is directly checkable by hand — join ten groups and count.**
- **Whether Kenyan caretakers already take finder's fees for vacancies.** I found abundant documented caretaker fraud (rent theft, forged leases, a KSh6.1m case) but **nothing on caretaker finder's fees.** The QuintoAndar doorman parallel is therefore a hypothesis here, not a Kenyan finding.
- **Any contributor-retention figure for crowdsourced housing data, anywhere.** None exists that I could find; every retention number above is borrowed from Wikipedia, mapping or crisis reporting.
- **Status and scale of Mkaazi, Zakhem, Nyumbani, Mahali, Reemio, Tenantt and Renters Hub.** Mkaazi and Zakhem returned nothing at all; the rest have live sites, zero independent coverage and no verifiable listing count.
- **Mamikos's field-verification mechanics** — team size, cost, cadence. "Mamichecker" is attested only via aggregator profiles (ZoomInfo, Dealroom), not company documentation.
- **Cost per listing for any field-staff rental operation.** The only cost-per-record figure I found anywhere is Detroit's ~$1 per parcel, and that is blight surveying, not letting.
- **A modern Kenyan tenant-turnover rate.** Only Kibera 1983. The KNBS 2023/24 Housing Survey is the right primary source and I did not verify its tables.
- **Any documented case of a volunteer moderation programme in a listings context being formally ended for capture or corruption.** Nextdoor's leads are heavily criticised; I found no evidence the programme was terminated, and Nextdoor's own documentation claims leads cannot act on accounts.
- **Whether LeaseSwap NYC's peer-to-peer model still functions.** Its website and its App Store listing describe different products as of October 2026, and both are company-controlled sources.

---

## Sources

Kenya and East Africa: [Hauzisha rentals page](https://www.hauzisha.co.ke/houses-for-rent) · [Hauzisha about](https://hauzisha.co.ke/about/) · [KejaHunt in The Standard](https://www.standardmedia.co.ke/business/business/article/2000162311/no-hustle-kejahunt-will-get-you-a-house) · [KejaHunt Nailab follow-on](https://disruptafrica.com/2015/11/27/kenyan-real-estate-portal-kejahunt-raises-follow-on-funding-from-nailab/) · [KejaHunt PitchBook](https://pitchbook.com/profiles/company/148639-87) · [KejaHunt Tracxn](https://tracxn.com/d/companies/kejahunt/__LOdjabAGCNJPCZzEgnurcOEiLCJCsejCmFWVUK1V_m0) · [NaiLab](https://en.wikipedia.org/wiki/NaiLab) · [Jumia House Kenya exit](https://www.pulse.co.ke/story/jumia-house-kenya-claimed-to-have-closed-down-website-2024081718082812448) · [OLX shuts Kenya/Nigeria](https://pctechmag.com/2018/02/olx-shuts-nigerian-kenyan-operations/) · [OLX exit to Jiji](https://techweez.com/2019/06/11/olx-walie-holdings-jiji/) · [Jiji buys OLX Kenya](https://businesstoday.co.ke/nigerian-classifieds-firm-enters-kenya-though-olx-buyout/) · [BuyRentKenya list privately](https://www.buyrentkenya.com/list-privately) · [BuyRentKenya 2014 pricing](https://techmoran.com/2014/10/25/buyrentkenya-com-wants-make-property-agents-rich-quickly/) · [SpaceYako on scams and its own limits](https://www.spaceyako.com/insights/rental-scams-kenya-how-to-avoid) · [RentYetu](https://www.rentyetu.co.ke/) · [HaoFinder Gust profile](https://gust.com/companies/haofinder-group) · [Keja Hunters WhatsApp group](https://www.kenyans.co.ke/news/109379-kenyans-ditch-agents-and-find-rentals-through-whatsapp-communities) · [Bizna Kenya on social-media house hunting](https://biznakenya.com/social-media-house-hunting-communities-in-kenya/) · [Viewing-fee practices](https://www.pointproperties.org/2021/05/most-popular-house-hunting-scams-to-avoid-in-nairobi) · [Fake agent mechanics](https://www.rentershub.co.ke/blogs/how-fake-rental-agents-in-nairobi-actually-operate-a-step-by-step-breakdown-of-the-scam-system/) · [EARB unregistered-agent warning](https://www.kenyans.co.ke/news/110444-govt-warns-kenyans-about-unregistered-real-estate-agents-threatens-legal-action) · [EARB agent count estimate (commercial source)](https://www.afriqahome.com/guides/verify-real-estate-agent-kenya) · [Kenya Housing Survey 2023/24 coverage](https://mwakilishi.com/article/real-estate-news/2025-01-23/771-of-kenyan-rentals-are-flats-and-apartments) · [KNBS 2023/24 basic report](https://www.knbs.or.ke/wp-content/uploads/2025/01/2023-24-Kenya-Housing-Survey-Basic-Report.pdf) · [Mathare rental dynamics](https://journals.sagepub.com/doi/full/10.1177/0956247820942166) · [Nature of rental housing in Kenya (1997)](https://journals.sagepub.com/doi/pdf/10.1177/095624789700900205) · [Caretaker lease fraud case](https://www.kenyans.co.ke/news/87026-caretaker-confesses-stealing-ksh-6m-rent-from-nairobi-tenants)

Emerging markets: [NoBroker](https://en.wikipedia.org/wiki/NoBroker) · [NoBroker business model](https://startuptalky.com/nobroker-business-model/) · [NoBroker cold start (secondary)](https://www.markhub24.com/post/nobroker-disrupting-india-s-real-estate-brokerage-model) · [Nestaway 95% valuation cut](https://www.onlinemarketplaces.com/articles/nestaway-acquired-by-aurum-for-11m-a-95-valuation-cut/) · [Forbes India on Nestaway](https://www.forbesindia.com/article/take-one-big-story-of-the-day/empty-nest-why-the-funding-birds-abandoned-nestaway/85451/1) · [Nestaway unit economics](https://shorts.growthx.club/p/why-nestaway-failed-but-wework-had) · [Housing.com field teams](https://www.forbesindia.com/article/30-under-30/housing.com-born-out-of-its-founders-house-hunt/37151/1) · [Mamikos Crunchbase](https://www.crunchbase.com/organization/mamikos) · [Mamikos Dealroom](https://app.dealroom.co/companies/mamikos) · [Mamikos case study](https://medium.com/@kiranafk/case-study-mamikos-19c21d550f25) · [QuintoAndar CTO on doorman referrals](https://www.lavca.org/feature/inside-quintoandars-ascendancy-in-brazilian-real-estate-tech-interview-with-cto-andre-penha/) · [QuintoAndar model analysis](https://www.reademergent.com/p/quintoandar-brazils-proptech-champion) · [QuintoAndar academic study](http://www.scielo.br/j/cm/a/XtszPLPZvdHcRNsGhb5mDRr/?lang=en) · [Spleet pivot](https://techcabal.com/2022/03/16/how-spleet-became-a-fintech-solution/) · [Spleet layoffs](https://techcabal.com/2024/02/29/spleet-layoffs-employees/) · [Spleet CEO removal](https://techcabal.com/2024/08/29/spleet-replaced-adetola-adesanmi-over-misappropriation-claim/)

Crowdsourced commons and perishable data: [Waze 65k editors](https://techcrunch.com/2013/02/06/nav-app-waze-says-36m-users-shared-900m-reports-while-65k-users-made-500m-map-edits/) · [Bardin on seeding Waze](https://www.nfx.com/post/the-insider-story-of-waze) · [1% rule](https://en.wikipedia.org/wiki/1%25_rule) · [Wikipedia newcomer retention (MoodBar)](https://arxiv.org/pdf/1409.1496) · [Map Kibera infomediaries study](https://www.emergentworks.net/Workspaces:The_changing_environment_of_infomediaries/Map_Kibera) · [Map Kibera OSM wiki](https://wiki.openstreetmap.org/wiki/Map_Kibera) · [Ushahidi Haiti report (202 of 3,500)](https://preparecenter.org/sites/default/files/crowdsourcing_crisis_information_in_disaster-affected_haiti.pdf) · [Verification by aggregation](https://www.iied.org/sites/default/files/pdfs/migrate/G02842.pdf) · [Ushahidi on poisoned data](https://www.ushahidi.com/about/blog/crowdsourcing-with-humanitarians-in-training) · [Questioning the Crowd](https://www.thenewhumanitarian.org/analysis/2013/08/20/questioning-crowd-data-verification-challenges-humanitarians) · [OSM slum mapping completeness](https://doi.org/10.3390/ijgi10040265) · [OSM building completeness SSA](https://www.researchgate.net/publication/372162485_A_spatio-temporal_analysis_investigating_completeness_and_inequalities_of_global_urban_building_data_in_OpenStreetMap) · [Motor City Mapping](https://datasmart.hks.harvard.edu/solutions/motor-city-mapping) · [Motor City Mapping mini-grants ~$1/parcel](https://datadrivendetroit.org/blog/2014/12/23/motor-city-mapping-mini-grants-come-to-a-successful-close/) · [GasBuddy HBS case](https://aiinstitute.hbs.edu/platform-digit/submission/gasbuddy-a-platform-for-crowdsourced-gas-price-data/) · [mVAM Kakuma 6% response rate](http://mvam.org/2015/11/16/crowdsourcing-food-prices-in-kakuma-kenya/) · [mVAM Ebola SMS vs IVR](https://odihpn.org/en/publication/not-a-rolls-royce-but-it-gets-you-there-remote-mobile-food-security-monitoring-during-the-ebola-crisis/)

Moderation failure and fraud: [FTC rental scam analysis](https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-analysis-shows-consumers-have-lost-millions-rental-scams) · [FTC breakdown: Facebook ~50%, Craigslist ~16%](https://moneywise.com/real-estate/florida-realtor-discovers-her-property-listed-on-facebook-as-fake-rental-heres-what-landlords-and-renters-should-know) · [Craigslist verification limits](https://moonlock.com/craigslist-scams) · [Craigslist does not confirm units exist](https://flagmylisting.com/platforms/craigslist) · [Nextdoor bias controversy (NPR)](https://www.npr.org/2020/07/01/886147665/it-s-our-fault-nextdoor-ceo-takes-blame-for-censorship-of-black-lives-matter-pos) · [Nextdoor lead criticism](https://sedona.biz/nextdoor-going-behind-the-curtain/) · [Petition on untrained leads](https://actionnetwork.org/petitions/require-implicit-bias-anti-racism-training-for-every-nextdoor-lead-2/)

Closest analogue: [Gothamist on LeaseSwap and NYC rental crowdsourcing](https://gothamist.com/news/reddit-linkedin-nycs-brutal-rental-market-inspires-social-media-crowdsourcing) · [leaseswap.nyc as of Oct 2026](https://leaseswap.nyc/) · [LeaseSwap App Store listing](https://apps.apple.com/us/app/leaseswap-nyc-hidden-rentals/id6502671218)
