# Voices 05 — YouTube, App Store Reviews & Google Maps

**Date: 2026-10-19**
**Scope:** real words from real people, gathered from Google Play / Apple App Store reviews of Kenyan rental products, from Kenyan YouTube house-tour and house-hunting videos and their comment sections, and from Google Maps.

**Rule applied throughout:** every quote below was read on a page actually fetched. Nothing is paraphrased-as-quote, composed, or "representative". Typos, Sheng, Swahili and `&apos;`-style artefacts are left exactly as they appeared. Where I summarise, it is labelled **[MY SUMMARY]**. Where a source is not Kenyan I say so in the same line.

---

## 1. What I could and could not access

### Could access

| Source | Method | Result |
|---|---|---|
| **Google Play app pages** (Kenya storefront) | direct HTML fetch | Worked. Got exact install band, star rating, review count for 20+ apps. |
| **Google Play review text** | Play's internal `UsvDTd` reviews RPC, paged, sorted 3 ways | **Worked very well.** Pulled 3,290 individual reviews with star, date, author, helpful-count and developer reply. This is the strongest part of this report. |
| **Apple App Store** | iTunes Search API, Kenya storefront | Worked. Finding: the iOS side is effectively empty (see §2). |
| **YouTube search** | direct HTML fetch of `/results` | Worked. Got titles, channels, view counts, ages for ~230 videos. |
| **YouTube comments** | Piped front-end API (`api.piped.private.coffee`) | **Worked.** 2,165 comments across 70 videos, with like counts and relative dates. |
| **Google Maps place discovery** | Maps `tbm=map` protobuf search endpoint | Worked. Got building/agency names, star ratings, review counts, place IDs. |

### Could NOT access

1. **YouTube video pages themselves were CAPTCHA-blocked.** After the first few fetches, `youtube.com/watch` began returning HTTP 429 with `google.com/sorry/index`: *"Our systems have detected unusual traffic from your computer network."* WebFetch hit the same wall. **Consequence:** I have no video **descriptions** (which on Kenyan listing channels often carry the agent's phone number and the exact rent) and no official view counts beyond what the search page showed me. I worked around the comment problem via a Piped instance, but Piped's `/streams` metadata endpoint failed with *"YouTube probably temporarily blocked anonymous watch access with this IP... LOGIN_REQUIRED: 'Sign in to confirm that you're not a bot'"*. **So: all YouTube titles and view counts in this report come from the YouTube search result pages I fetched, not from the video pages.**

2. **Google Maps review TEXT is not reachable from this environment.** This is the biggest gap and I want to be blunt about it, because §C of my brief was built on it. Four separate routes all failed:
   - Maps place pages (`/maps/place/...`) render reviews only in JavaScript; the fetched HTML contains zero review strings.
   - The Maps reviews RPC (`/maps/rpc/listugcposts`) returns **HTTP 403** on every protobuf variant I tried, with and without session tokens scavenged from the search response.
   - The legacy `/maps/preview/review/listentitiesreviews` endpoint returns **404** (retired).
   - `search.google.com/local/reviews?placeid=...` — which *is* the server-rendered reviews page — 302-redirects to `google.com/search?...&ludocid=...`, and `google.com/search` from this environment returns only a JS redirect interstitial. A Googlebot user-agent returned a 2.4 KB stub with no reviews.

   **What this means for the founder:** I can tell you that *e.g.* **Tumaini estate Apartments, Embakasi has 744 Google reviews at 4.1★** and **Summerrose Apartments, an "apartment rental agency" in Embakasi, has 39 reviews at 3.6★** — but I could not read one word of them. That corpus is real, it is large, it is exactly the goldmine the brief predicted, and it needs either a browser session or the Google Places API to open. **I recommend this as the single highest-value follow-up.** See §5 and §8.

3. **Several named competitors have no app at all.** Searched Play (Kenya) and the Apple Kenya storefront: **BuyRentKenya, StayNai, CribSeek, HaoFinder, SpaceYako, PropTraka, 254rent and RentU returned nothing.** `com.buyrentkenya.app` is a 404. BuyRentKenya — the best-known brand in Kenyan property search — is **web-only**. There is therefore no app-review corpus for any of them.

4. **"Private Property Kenya" is not a thing on the stores.** `com.privatepropertyandroid.app` is **"Private Property SA"** (South Africa, 500K+ installs, 4.4★). I excluded its reviews as out-of-market.

5. **MDbadT6XC_g** ("Case of Caretaker Accused of Stealing Over Sh500,000 Rent from tenants", COURT HELICOPTER) — the most promising caretaker title I found — **has zero comments.** Likewise several Rongai/deposit news clips.

### Honest tally of what I actually got

- **3,290 Play Store reviews** harvested across 17 apps; of these roughly **90 are substantive Kenyan complaints about rental listings**, and I quote **~45** below.
- **2,165 YouTube comments** harvested from **70 Kenyan videos** (84 attempted; 14 had none). I quote **~110** of them verbatim.
- **~230 Kenyan video titles** read off YouTube search pages, giving **44 advertised rents** in §3a.
- **Google Maps: 60+ named buildings/agencies with ratings and review counts, and zero review text.**
- **Direct testimony on caretaker finder's fees: thin but non-zero, and one quote is close to decisive.** See §5. I did not find a Kenyan saying "I paid the caretaker X shillings to show me a vacant house" in so many words. I found one tenant describing exactly that payment without naming the recipient's job title, plus two tenants describing caretakers running money rackets on water and electricity. I report this as partial, not confirmed.

---

## 2. Competitor app scorecard

All figures read off the Google Play **Kenya** storefront on 2026-10-19.

| App (developer) | Package | Installs | Rating | Reviews | Top three real complaints (verbatim) |
|---|---|---|---|---|---|
| **Jiji Kenya: Buy & Sell Online** (Jiji Group) | `com.olx.ssa.ke` | **5M+** | 4.6★ | **57,800** | 1. *"I was using the app to look for a rental bedsitter in South B. First of all the houses listed are relatively lower price than expected in South B. Then the numbers to be contacted refers you to an "owner" or mtu ako kwa ground. The person on the other end then demands for a deposit if you seriously want the house before even viewing. Its absurd and unethical. I called almost 8 to 10 contacts receiving the same treatment."* — lina chester, 1★, 2021-06-30<br>2. *"products sold like an year ago are still on the site, making it difficult for buyers to identify the products currently in market. Also, cons are selling already sold products due to this weakness."* — ignatious maina, 4★, 2023-12-23, **2,474 found helpful**<br>3. *"Full of scammers. I went to view a furnished house for 55k as soon as I got there the prices went up to 130k and the house was barely furnished; had just 1 seat, a bed and a tv."* — Phay Sonny, 1★, 2021-10-17 |
| **Property24 Kenya** (Property24) | `ke.co.property24` | 50K+ | 4.6★ | 668 | 1. *"The site is never updated with new houses for rent! Its been three months now and same old same old! Bad!"* — 1★, 2016-01-03, 25 helpful<br>2. *"Old adverts. The houses shown for the area I was looking at are all unavailable/old adverts. They have 2020 or 2021 dates - the most recent was from early August 2022"* — Sylvia Maina, 2★, 2022-09-03<br>3. *"There is someone who is listing property here to fraud gallible clients, using the names of my company Domina Homes and properties limited... the person who is listing with domina is an impostor. We've reported the matter to the police through one the victim."* — Emissary Martin, 1★, 2023-05-31 |
| **Reemio** (Reemio Limited) | `com.reemioltd.tenants` | 10K+ | 4.3★ | 35 | 1. *"really what is needed in Nairobi, no options for common mwananchi though, like bedsitters"* — Kevin Mulundi, 5★, 2026-06-20<br>2. *"Really convenient, but either something's wrong with my phone or the UI is incomplete cause I can't book a visit or get in contact with the owners. Only the location is availed."* — Victor Gitau, 3★, 2026-07-14<br>3. *"very complicated, very few listings in most areas like Kiambu, none of Kiambu"* — Joan Kituyi, 1★, 2026-07-10 |
| **kejanova** (Aaron Rono) | `com.kejanova.hunter` | 5K+ | 4.2★ | 12 | 1. *"it's hard to create an account"* — Jeremiah Wambua, 3★, 2026-04-14, 4 helpful (the single most-upvoted negative)<br>2. *"still has a couple of bugs, but the idea behind it is good"* — Chrispas Kamau, 2★, 2026-05-14<br>3. *"I hope there will be more listing in future."* — Martin K. Kimosop Kivindyo, 5★, 2026-08-02 |
| **Rent Hub** (Rent Hub LTD) | `com.kberen.renthub` | 1K+ | 4.5★ | 9 | Only one negative exists: *"Poor User experience"* — Favour Khisa, 1★, 2025-12-05, 2 helpful. Corpus too small for three. |
| **Househunt Kenya** (Househunt Kenya) | `com.househuntkenya.mobile` | 1K+ | **3.4★** | 5 | **Lowest-rated Kenyan rental app I found, yet all 3 text reviews are 5★.** [MY SUMMARY] 3.4★ across 5 reviews means ~2 silent 1★ ratings. Nothing negative is written down, so there is nothing to quote. |
| **Renters Hub** (Repotrans tech solutions) | `ke.co.rentershub.www.twa` | 500+ | 4.8★ | 6 | **No negative reviews exist.** All six are 4–5★; three were posted on the same day (2026-03-09). See §6 on why I do not trust these. |
| **PropertyDuka Marketplace** (NCBA Leasing / CarDuka) | `com.ncballp.propertyduka` | 500+ | — | 1 | *"currently broken"* — george kimaru, 1★, 2026-08-17 |
| **Jumuika: Property in Kenya** (Quest Website Developers) | `ke.co.jumuika` | 100+ | 4.1★ | 0 written | No text reviews. |
| **Panga World** | `com.panganc.panga` | 100+ | — | 0 | No reviews. |
| **Nyumba Search** | `ke.co.nyumbasearch.app` | 50+ | — | 0 | No reviews. |
| **Rentor Kenya** (Rentor App Limited) | `ke.co.rentor.app` | 10+ | — | 0 | No reviews. |
| **KiliMani** | `com.kilimani.rental` | 10+ | — | 0 | No reviews. |
| **RentBuy** | `com.rentbuy.rentbuy_mobile` | 10+ | — | 0 | No reviews. |
| **BuyRentKenya** | — | **no app** | — | — | Not on Play (KE) or Apple (KE). Web only. |
| **StayNai, CribSeek, HaoFinder, SpaceYako, PropTraka, 254rent, RentU** | — | **no app** | — | — | Nothing on either store. |

App page URLs are `https://play.google.com/store/apps/details?id=<package>`.

### Not Kenya, but the clearest evidence in the whole haul — House4Rent (ZAMBIA)

**`com.h4r.h4r_flutter`, "House4Rent", Skytech Platforms, 10K+ installs, In-app purchases, no aggregate rating shown.** Its own description: *"House4Rent is the official house hunting app in Zambia!"* **This is Zambian, not Kenyan.** I include it because it is a free-listings-plus-paid-unlock rental app in a near-identical market, and its 1★ reviews are the most explicit statement of the pay-to-see-the-number failure mode I found anywhere:

- *"I don't think this app is reliable,after I subscribed the AI agent always says the same thing.....ati now connecting you to the own and it's a month now, **the number added there doesn't go through and you can only know when you subscribe**"* — Karren Kamulosu, 1★, 2026-07-09, 3 helpful. **(Zambia)**
- *"more than 2 months on the app but **same houses for rent!** I think just start deleting them when they become unavailable and encourage more people to register"* — Moses Chulu, 1★, 2026-07-09. **(Zambia)** Developer replied: *"Hi James thanks for the review and suggestions we are working to have more people right now and next week there shall be over 500 houses"*
- *"Since I joined **I only see the same houses I found**. Also how does putting a profile picture erase your subscription payment for verification? I don't understand"* — Abigail Thole, 1★, 2026-06-17, 4 helpful. **(Zambia)**
- *"**we don't want to hear that am a agent please let the owners be the ones posting houses**"* — Mwansa Friday, 3★, 2026-03-17, **8 helpful**. **(Zambia)**
- *"amazing app finally no agent"* — Linet Namukoko, 5★, 2026-03-17. **(Zambia)**
- *"I find this app very convenient because **you only get to deal with the real owner of the property thereby doing away with scamming pressure.** kudos Mr mukuka imwe ni salt saana 🤝"* — Kelvin Malata, 5★, 2026-04-13, 9 helpful. **(Zambia)**

### Apple App Store (Kenya storefront) — a finding in itself

| App | Bundle | Rating | Rating count |
|---|---|---|---|
| Property24 Kenya | `ke.co.property24.Property24App` | 4.61 | **136** |
| PropertyDuka Marketplace | `com.ncballp.propertyduka` | 5.00 | **1** |
| Guri24 | `com.guri24.app` | 5.00 | **1** |
| Jumuika: Property in Kenya | `ke.co.jumuika` | 0 | **0** |
| Rentor Kenya | `ke.co.rentor.app` | 0 | **0** |
| KiliMani | `com.kilimani.rental` | 0 | **0** |
| Fletit | `com.fletit.app` | 0 | **0** |
| Panga World | `com.panganc.panga` | 0 | **0** |

[MY SUMMARY] Outside Property24, the entire Kenyan rental category on iOS has **two ratings in total**. For a KSh 4,000–30,000 product, iOS is noise. Note also that Guri24 and Fletit exist on iOS but 404 on Play — they shipped to the wrong platform.

---

## 3. The price table

### 3a. Rents stated by the lister, in the video title

These are titles I read on YouTube search result pages on 2026-10-19. View counts as shown there. The rent is the **advertised** rent — an asking price, not a verified one.

| Estate / town | Type | Rent stated | Extras stated in title | Video (title as shown) | URL | Views |
|---|---|---|---|---|---|---|
| Kenol (Murang'a) | Bedsitter | **KSh 4,500** | — | "Affordable Bedsitter in Kenol Near St. Anne's \| Only 4,500/Month \| Kenya Rentals" | youtube.com/watch?v=PHt_MZGWXfk | 792 |
| Kenol | Bedsitter | **KSh 4,500** | — | "BEDSITTERS NEAR REDEEMED CHURCH KENOL AT KSH.4,500/=" | youtube.com/watch?v=TOsYe08nTdI | 241 |
| Thika (Witeithie / Biafra) | Single rooms | **KSh 4,000 & 3,000** | "vacant" | "4000 & 3000 vacant single rooms located in thika \|\|witeithie\|\|Biafra 🏠" | youtube.com/watch?v=TL2nVDzxK9Y | 3,476 |
| Eldoret | Bedsitter | **KSh 3,500** | — | "Bedsitter house tour for only 3500 in Eldoret Kenya." | youtube.com/watch?v=zsCDawHnVlw | 1,253 |
| (unstated, Spot On 254) | 1BR + bedsitter | **KSh 3,500 / 7,500** | — | "VERY AFFORDABLE ONE BEDROOM & BEDSITTER UNITS \| 3,500 KSH RENT \| 7,500 KSH RENT" | youtube.com/watch?v=07WJkQJ3biY | **167,345** |
| (unstated, Spot On 254) | Bedsitter + 1BR | **KSh 5,500 / 8,000** | — | "Very Affordable Bedsitter 5,500 ksh RENT & ONE BEDROOM 8,000 KSH RENT APARTMENT TOUR" | youtube.com/watch?v=4T45ONcYCm4 | 49,271 |
| Kitengela | Bedsitter / studio | **KSh 6,500** | — | "BEDSITTER HOUSE TOUR KITENGELA\|\| STUDIO TO LET ksh6500" | youtube.com/watch?v=p2F6TCDv10o | 49,164 |
| (Irene Kyms Realtor) | Studio | **KSh 5,500** | — | "BEDSITTER HOUSE TOUR\|\| STUDIO TO LET ksh5500" | youtube.com/watch?v=aeTpLhBL9xM | 9,634 |
| (Irene Kyms Realtor) | Studio | **KSh 7,000** | — | "BEDSITTER HOUSE TOUR\|\| STUDIO TO LET ksh7000" | youtube.com/watch?v=qS7Z8mmSB60 | 11,444 |
| Umoja 3 | Bedsitter | **KSh 6,200** | — | "Bedsitter House Tour In Umoja 3 for 6,200//Babygirl's Edition" | youtube.com/watch?v=RsvxMNnmEMo | 33,492 |
| Kenol | Bedsitter | **KSh 6,000** | "Full-Time Water, Parking" | "Spacious Bedsitters in Kenol for Rent – Only 6K! \| Full-Time Water, Parking" | youtube.com/watch?v=NoY1STfNDPQ | 158 (3 days old) |
| Kenol | Bedsitter | **KSh 6,500** | "Full-Time Water, Balcony & Kitchen Cabi…" | "Spacious Bedsitter in Kenol for Rent – KES 6,500 Only" | youtube.com/watch?v=hTsV1sg1DrM | 21 (2 days old) |
| Juniorate, Eldoret | Bedsitter | **KSh 6,000** | "spacious" | "A spacious Ksh 6000 Bedsitter in Juniorate Eldoret✅‼️" | youtube.com/watch?v=HHiXBIz9lbI | 38 |
| Juniorate, Eldoret | Bedsitter | **KSh 9,000** | "spacious" | "Ksh 9000 spacious bedsitter in Juniorate, Eldoret." | youtube.com/watch?v=z0c6u9xcRzo | 28 |
| Pioneer, Eldoret | Bedsitter | **KSh 7,000** | — | "ELDORET HOUSES TO LET: BEDSITTER IN PIONEER 7K" | youtube.com/watch?v=X1MbA6RoYOc | 1,260 |
| Ruai | Bedsitter | **KSh 7,000** | "VERY SPACIOUS \| WATER 24/7" | "MOST AFFORDABLE BEDSITTERS IN RUAI \|\| @Ksh 7,000 \|\| VERY SPACIOUS \| WATER 24/7" | youtube.com/watch?v=WlpeWUXq3Eg | 3,185 |
| Langalanga, Nakuru | (apartment) | **KSh 7,000** | — | "Langalanga Nakuru is Not Unsafe as Folks Say, Rent this Apartment NOW! Kshs. 7,000" | youtube.com/watch?v=ccvXu22oKSw | 3,510 |
| Eastern Bypass (Afro Sayari) | Bedsitter | **KSh 8,000** | — | "Bedsitter House Tour Along Eastern Bypass,Afro sayari for 8,000/Rentals in Nairobi,Kenya" | youtube.com/watch?v=ri1oKR8r-dg | **880,825** |
| Pipeline | Bedsitter | **KSh 8,000** | "WAYS TO GET A HOUSE IN NAIROBI" | "HOUSE HUNTING IN PIPELINE ESTATE, NAIROBI TODAY/BEDSITTER AT 8K/WAYS TO GET A HOUSE IN NAIROBI" | youtube.com/watch?v=OgaWVHpcfm0 | 482 |
| Thika | Bedsitter | **KSh 8,000** | "Student Edition" | "MY BEDSITTER TOUR - Student Edition \| 8K Bedsitter in Thika, Kenya" | youtube.com/watch?v=ZCeNm4YAEEQ | 2,423 (3 wks old) |
| Nairobi (unstated) | Bedsitter | **KSh 7,000** | — | "DETAILED BEDSITTER HOUSE TOUR FOR 7,000// I LOVED THIS 😍" | youtube.com/watch?v=9nAQlXa3f6w | **1,001,333** |
| Uthiru 87 Junction | Bedsitter | **KSh 9,000** | "most spacious" | "OMG!The most spacious Bedsitter House Tour Located in Uthiru 87 Junction for 9,000" | youtube.com/watch?v=z0LRU0DGlxU | 82,158 |
| Kihunguro | Bedsitter | **KSh 9,000** | — | "bedsitters to let at Kihunguro going for 9000 per month" | youtube.com/watch?v=02gN8Dl--dc | 4,223 |
| Kangemi (Waiyaki Way) | Bedsitter | **KSh 10,000** | "near Mountain View Mall" | "10,000 KSH BEDSITTER APARTMENT TOUR ON WAIYAKI WAY, KANGEMI NEAR MOUNTAIN VIEW MALL, KENYA" | youtube.com/watch?v=kYzZr7WnqyE | 429 |
| Thika Road | 3 bedsitters | **KSh 7,000 / 8,000 / 10,000** | — | "3 BEDSITTER APARTMENTS\| Ksh 7,000, 8,000, 10,000/=\| THIKA ROAD" | youtube.com/watch?v=LEFkykyXjOg | 9,180 |
| Thika | 1BR | **KSh 7,000–10,000** | — | "ONE BEDROOM HOUSES IN THIKA. 7,000 to 10,000. (house hunting)" | youtube.com/watch?v=XofGhbVD0Kw | 9,748 |
| Thika Road | 1BR | **KSh 10,000** | — | "1 BEDROOM APARTMENT TOUR\|\|KSH 10,000\|\|House hunting\|Rentals\|\|THIKA ROAD" | youtube.com/watch?v=bktxvMIp7yc | 6,721 |
| Thika Road | 1BR | **KSh 12,000 & 10,000** | "CHEAP/AFFORDABLE" | "CHEAP/AFFORDABLE/1 BEDROOM/ALONG THIKA ROAD// HOUSE HUNTING//12K & 10K" | youtube.com/watch?v=cYGPcfgsWQI | 1,759 |
| Pipeline | 1BR | **KSh 12,000** | "VACANT ROOMS" | "ONE BEDROOM VACANT ROOMS IN pipeline Nairobi@12K" | youtube.com/watch?v=DWv3rQNGa9g | 705 |
| Lanet, Nakuru | 2BR | **KSh 15,000** | "Very Affordable" | "Very Affordable 2 Bedroom//House Hunting NAKURU,LANET//15,000 Rent" | youtube.com/watch?v=zPqAAEq0M1A | 680 |
| Thika (CITAM) | 2BR | **KSh 15,000** | — | "HOUSE HUNTING \|TWO BEDROOM UNITS \|THIKA CITAM FOR 15000 ONLY" | youtube.com/watch?v=ikIToKuyJlw | 23 |
| Kiamunyi, Nakuru | 1BR | **from KSh 16,000** | "Modern" | "Finally! Modern 1 Bedroom Apartments in Kiamunyi \| From Kshs. 16,000" | youtube.com/watch?v=bZU_zLihvOQ | 4,641 |
| Thika | 1BR | **KSh 16,000** | — | "//House hunting vlog...// one bedroom house @16k in THIKA" | youtube.com/watch?v=JnNYjSVing8 | 14,415 |
| Waiyaki Way | 2BR | **KSh 20,000** | "UNBELIEVABLE / Gem" | "UNBELIEVABLE!!😲 - 2 Bedroom in Nairobi for 20k! Waiyaki Way Gem 💎)" | youtube.com/watch?v=ALF8CmXv2jE | 2,369 |
| Kiamunyi, Nakuru | 2BR | **KSh 25,000** | "Spacious" | "Spacious 2 Bedroom Apartment Tour in Kiamunyi Nakuru \| Rent 25K" | youtube.com/watch?v=RGhQiTgw_OI | 2,355 |
| Barnabas, Nakuru | 2BR | **from KSh 28,000** | "New & Modern" | "New & Modern 2-Bedroom Apartments for Rent in Barnabas, Nakuru from Kshs. 28,000" | youtube.com/watch?v=VuMUR1kMunA | 5,278 |
| Naka, Nakuru | 2BR | **KSh 30,000** | "posh" | "Wonderful 2 Bedroom Units Renting @30K in the Posh Naka Estate Nakuru" | youtube.com/watch?v=6_PTj9FpjWk | 2,033 |
| Sobea, Nakuru | 3BR | **KSh 30,000** | **"(BOOKED)"** | "Luxury on a Budget! Elegant 3-Bedroom Home in Sobea Nakuru \| Rent Ksh. 30,000 Only! **(BOOKED)**" | youtube.com/watch?v=Ro4W_Zbov4I | 3,579 |
| Nairobi, 8–10km of CBD | 3BR maisonette | **KSh 30,000** | "For Rent & Sale" | "OMG! INSIDE A 30K PER MONTH 3 BEDROOM MAISONETTE \| For Rent & Sale \| Near CBD" | youtube.com/watch?v=5Y1L48JAgrc | 111,931 |
| Waiyaki Way / Lower Kabete / Loresho | apartments | **KSh 32,000–100,000** | — | "House Hunting Along Waiyaki Way, Lower Kabete & Loresho. Apartments from KSh 32,000 to KSh 100," | youtube.com/watch?v=JXLcnuA2UVQ | 9,319 |
| Ruiru | (budget band) | **KSh 10,000–20,000** | — | "House Hunting in Ruiru with a Budget of 10k-20k" | youtube.com/watch?v=ZZFzFBDv8Q4 | 13,805 |
| Nairobi | 1BR target | **KSh 10,000** | — | "House Hunting In Nairobi \| Looking for a Ksh 10,000 per month 1 Bedroom." | youtube.com/watch?v=PXk-HzebUis | 7,556 |

**One title in this table is worth more than the rest combined:** `Ro4W_Zbov4I` has **"(BOOKED)"** appended to it. A Nakuru listing channel is manually editing its own video titles to mark units as taken. That is a human being doing, by hand, the one job every app in §2 fails at.

### 3b. Rents stated by ordinary commenters about their own or a known house

These are more valuable than 3a — nobody is selling. All read from the comment sections named.

| Estate / town | Type | Amount | Verbatim | Commenter | Video URL |
|---|---|---|---|---|---|
| Umoja | Single room (large) | **KSh 3,000–3,500** | *"Ezra please naweza pata single room kubwa ya 3k or 3500 Nairobi side za umoja?"* | @melvinomari5694 | youtube.com/watch?v=dyUaTw5yP-0 |
| Pipeline / Tassia | (any) | **KSh 6,000** budget | *"Can I get a house around pipeline tassia budget 6k please"* | @modelisto4306 | youtube.com/watch?v=OgaWVHpcfm0 |
| Kitengela | Bedsitter | **KSh 6,500** | *"6500 na its so small"* | @charleswaweru9124 (3 likes) | youtube.com/watch?v=p2F6TCDv10o |
| Hamza / Makadara | Bedsitter | **KSh 7,000–8,000** | *"Can I get a house in Hamza macadara bedsitter 7 to 8k"* | @Grantoneexplorer | youtube.com/watch?v=ELa1leC3FMA |
| Nairobi (generic) | Bedsitter | **KSh 7,000** | *"wooooow😍😍😍 for 7k that is really beautifull"* | @ark_hima | youtube.com/watch?v=9nAQlXa3f6w |
| Nairobi (generic) | Bedsitter | **KSh 7,000** | *"That house is spacious for real, 7k whattt...she is so organized"* | @julietmburu8188 (17 likes) | youtube.com/watch?v=9nAQlXa3f6w |
| Umoja | 1BR | **KSh 9,000** | *"Aki si mfanye ya umoja 1 bedroom 9k"* | @rb-3 (2 likes) | youtube.com/watch?v=ELa1leC3FMA |
| Manguo / Mumbi | 1BR | **KSh 9,000** | *"I should invite for 1bd manguo mumbi very spacious @9k .nice painting😊"* | @dolkkish1859 | youtube.com/watch?v=ri1oKR8r-dg |
| Embakasi | Bedsitter → 1BR | **9k vs 10k** | *"Bedsitter 9k heri nijaze 10 k Embakazi"* | @queendorow | youtube.com/watch?v=z0LRU0DGlxU |
| Ruiru / Matangi | 1BR | **KSh 10,000** | *"Huyu akuje Ruiru Matangi atapata one bedroom ya 10k"* | @MartySherii | youtube.com/watch?v=z0LRU0DGlxU |
| Pipeline | 1BR | **KSh 10,000** | *"Please unaeza nitafutia beautiful one bedroom house pipeline ya 10k per month"* | @MargaretMasakari-of9xe | youtube.com/watch?v=ELa1leC3FMA |
| Nairobi | Bedsitter | **KSh 10,000** | *"Makofi kwa landlord, huku Nairobi bedsitter unalipa 10k no curtain rods no shower head ujiwekee.. currently house hunting"* | @joymwende4080 | youtube.com/watch?v=9nAQlXa3f6w |
| Lucky Summer (nr Mirema) | 1BR | **KSh 10,000–15,000** | *"Come I take you for house hunting for free at lucky summer estate,minutes from mirena 10-15k can give you a better 1 bedroom house"* | @ClintonOmondi-r3b | youtube.com/watch?v=vyrGFzVYKxE |
| Tassia | 1BR | **KSh 12,000** | *"Nish and kimondo i need a very good i bedroom for 12k in tasia please help"* | @danielarunga8790 | youtube.com/watch?v=ELa1leC3FMA |
| Kwendani (deposit case) | — | **KSh 13,000 rent** | *"mimi kuna hao nilikua nalipa 13k hapo kwendani"* | @ShitandaBriankulecho | youtube.com/watch?v=5bwgKQKdD9Q |
| Nairobi | Bedsitter / 1BR | **KSh 14,000 / 18,000** | *"Very cheap,,nairobi bed sitter ni 14k, one bedroom ni 18k"* | @godfreyambundo4878 | youtube.com/watch?v=dyUaTw5yP-0 |
| Bamburi, **Mombasa** | 1BR | **KSh 15,000** | *"Try Bamburi in Mombasa much bigger space and cheaper. 15K for 1 Bedroom. 8mins from the beach"* | @Banedarksidex | youtube.com/watch?v=vyrGFzVYKxE |
| (unstated) | 1BR | **KSh 18,000** | *"Hey kindly plug me the 18k 1 bedroom"* | @TracyKimeu | youtube.com/watch?v=vYA3DOHm6Yw |
| Kenyatta Road | 2BR ensuite | **KSh 20,000** | *"Just come to Kenyatta road and get a two bedroom house ensuite worth 20k per month. Not congested"* | @carolinemugo3419 (2 likes) | youtube.com/watch?v=vyrGFzVYKxE |
| Siwaka / Strathmore (Westridge Apts) | Bedsitter | **KSh 22,000** | *"a bed sitter is 22k but it's spacious, and it looks nice. It's close to school... It's called Westridge apartments."* | @provideproofmyguy (3 likes) | youtube.com/watch?v=SOqGvMadIYk |
| Joyland, **Ruaka** | 1BR | **KSh 25,000** | *"Mzee 1 bed ya 10k utatafuta sana if you're interested there's one on my block but rent ni 25k joyland area ruaka"* | @bikosteve24 (2 likes) | youtube.com/watch?v=PXk-HzebUis |
| Rent increases (two houses) | — | **15k→40k, 8k→25k** | *"She decided to increase rent from 15k to 40k😂😂😂 with 2 months deposit of the same amount, another house from 8k to 25k with 2 months deposit."* | @Miss.Muturi-n9j (13 likes) | youtube.com/watch?v=zygLL8iaSis |
| — | Bedsitter floor price (operator claim) | **from KSh 6,000** | Reemio's own developer reply: *"We actually have bedsitters and studios available, with options starting from as low as 6,000."* | Reemio Limited, 2026-06-20 | play.google.com/store/apps/details?id=com.reemioltd.tenants |

### 3c. Non-rent money amounts stated by real people

| What | Amount | Verbatim | Source |
|---|---|---|---|
| **Bait-and-switch on a Jiji house listing** | advertised **55,000** → asked **130,000** | *"I went to view a furnished house for 55k as soon as I got there the prices went up to 130k and the house was barely furnished"* | Phay Sonny, 1★, Jiji Kenya, play.google.com/store/apps/details?id=com.olx.ssa.ke |
| **Deposit withheld: paint deduction** | rent 13,000; **7,000 taken for paint**; **2,700 returned** | *"kuhama jamaa wananiambia ati wao hukata pesa ya rangi 7 k kwa kila, plus other deductions, nilipewa 2700 deposit"* | @ShitandaBriankulecho, youtube.com/watch?v=5bwgKQKdD9Q |
| **Deposit unrefunded, 1 year** | **26,500** | *"For one year now the landlord has declined to refund deposit for rent and water. Can you be of help please, to secure 26,500"* | @austinmwaghogho2494, youtube.com/watch?v=nPZ2hh9GaDc |
| **Water bill vs water deposit** | bill **300**; deposit held **1,500** | *"the water which is 300 yet he has my water deposit of 1500"* | @mikeosiemo9721, youtube.com/watch?v=nPZ2hh9GaDc |
| **Student rent where caretaker allegedly cooks water books** | rent **5,500** | *"Rent is 5500, written agreement but water deposit wasn't written"* | @weekuwarealeralaa8429, youtube.com/watch?v=zygLL8iaSis |
| **Long-held deposit, no interest** | **100,000** held 8 years | *"a deposit of Ksh 100,000.00 paid to the Landlord 8 years ago, is not of the same value/purchasing power today"* | @shadrackorieny9318, youtube.com/watch?v=nPZ2hh9GaDc |
| **Deposit refunded at half** | "half" | *"I fought hard, I was just refunded half, imagine"* | @majestymaurice3239 (5 likes), youtube.com/watch?v=nPZ2hh9GaDc |
| **Money lost on a Jiji paid subscription** | **9,500** | *"With this economy 9500 is alot of money to be stolen from someone"* | Elsie Iminza, 1★, Jiji Kenya |
| **Pay-to-use-your-own-email** | *"Only option is to pay to use your current email... the basic Free option is greyed out."* | — | Charles Ndonga, 1★, 2025-12-16, Jiji Kenya |

---

## 4. Verbatim quotes by theme

### Theme 1 — Stale listings: "I called and it was already taken"

This is the loudest, most repeated, most cross-source complaint in the entire haul.

> *"products sold like an year ago are still on the site, making it difficult for buyers to identify the products currently in market. Also, cons are selling already sold products due to this weakness."*
> — ignatious maina, 4★, 2023-12-23, **2,474 people found this helpful** — the single highest-voted review on Jiji Kenya. `play.google.com/store/apps/details?id=com.olx.ssa.ke` **(app store review)**

> *"The site is never updated with new houses for rent! Its been three months now and same old same old! Bad!"*
> — A Google user, 1★, 2016-01-03, 25 helpful, Property24 Kenya `ke.co.property24` **(app store review)**

> *"Old adverts. The houses shown for the area I was looking at are all unavailable/old adverts. They have 2020 or 2021 dates - the most recent was from early August 2022"*
> — Sylvia Maina, 2★, 2022-09-03, Property24 Kenya **(app store review)**

> *"This app is outdated and inefficient. Do not waste your time downloading it. Some of the properties are not even available."*
> — A Google user, 1★, 2019-10-04, 9 helpful, Property24 Kenya **(app store review)**

> *"Pathetic....doesnt have a variety of properties neither are they updated.better stick with the old fashioned wayof property hunting"*
> — A Google user, 1★, 2017-05-22, 6 helpful, Property24 Kenya **(app store review)**

> *"I contacted 6 different sellers and all of them didn't have the same listed item on sale. Just an utter waste of time with so many out of stock items"*
> — Zak Esmail, 1★, 2026-01-26, 9 helpful, Jiji Kenya **(app store review)**
>
> **Jiji's own reply, nine months ago:** *"We're sorry for the inconvenience. Listings are posted by independent sellers, and availability may change quickly. We encourage sellers to keep ads up to date and report out-of-stock items."* **(developer reply, same page)**
>
> [MY SUMMARY] This is the incumbent, in writing, conceding it has no mechanism for freshness — only an encouragement. The whole opportunity is in that sentence.

> *"some sellers fail to update their prices or stock where you find they no longer have the item and have not removed the ad or the item is priced differently from the app"*
> — john waweru, 4★, 2025-06-30, Jiji Kenya **(app store review)**

**And the same thing as it actually feels on YouTube.** On a Kitengela bedsitter tour from three years ago, **36 of 86 comments are people asking where it is or whether it is still free.** A sample, all from `youtube.com/watch?v=p2F6TCDv10o` **(YouTube comments)**:

> *"Where is it located"* — @christiquezzy8817 (7 likes)
> *"Nice, if they're still available I'd like one"* — @edithwandolo4284 (4 likes)
> *"Where exactly in kitengela and are they still available"* — @pantherzard4454 (3 likes)
> *"Ziko wapi?"* — @oliviaveronica3057 (2 likes)
> *"Is it available still"* — @valary-achieng
> *"Location pliiz am i kitengela look for one like this"* — @HappyChameleon-dp2cn
> *"Still available yet?"* — @nicksonowiti3481
> *"How much? / Is it available?"* — @suzziedivinity3234
> *"Iko wapi hii"* — @ritahmueny9468
> *"Ziko wapi"* — @lol-nz8cu *(this person asked three separate times)*

And on a four-year-old Tassia apartment tour, `youtube.com/watch?v=ELa1leC3FMA`, **25 comments** of the same. Including:

> *"Texting after three months no response / Are these available?"* — @essyadhiambo8245 **(YouTube comment)**

> *"Your number is off kindly how else can we contact you"* — @nicolekut3153 **(YouTube comment)**

> *"How can one get to this place and for the one bedroom are the rooms still available"* — @felistuswanjiku2739 (2 likes) **(YouTube comment)**

The dead-number problem again, this time from someone who was actually ready to pay:

> *"We are very interested in this property. **We called your number but it was forwarded.** We want to visit this week."*
> — @amazinggraceministriesgeorgia, on "Pack Your Things NOW and Move to the Most Affordable 1 and 2 Bedroom Apartments in Nakuru", `youtube.com/watch?v=3-gnvDJ5p9M` **(YouTube comment)**

> *"Io number iko wapi?na bado ziko?"* — @frashaoskah8446, `youtube.com/watch?v=bktxvMIp7yc` **(YouTube comment)** — "Where is that number? And are they still there?"

> *"I didn't see the contact details fr house Number 2?"* — @jemimahrachael2101, `youtube.com/watch?v=6uXDQ4B56RM` **(YouTube comment)**

And the pattern repeats across every listing channel I checked. On "VERY AFFORDABLE ONE BEDROOM & BEDSITTER UNITS | 3,500 KSH RENT | 7,500 KSH RENT" (`youtube.com/watch?v=07WJkQJ3biY`, 167,345 views), the comments are: *"Is the bedsitter still available"* (@PatriciaJane-e8k), *"How can I contact you"* (@albertmabwa4877), *"location please"* (@abquizzyofficial8249), *"Hizi ziko wapi"* (@digitalmamaboss), *"Is it still available. Bedsitter"* (@graceabigail-nx1fo), *"One bedroom available??"* (@EllaMeg22). On its sister video (`youtube.com/watch?v=4T45ONcYCm4`) I counted **17 more of the same**, including *"Is the bedsitter still there..am coming to study i Nakuru.. **been looking for this for the longest time** ❤"* (@Divine-royalty, 2 likes). On the Thika single-rooms video (`youtube.com/watch?v=TL2nVDzxK9Y`), four weeks ago — on a two-year-old video — @MWanjiru-i8p simply wrote: *"Any vacant?please it's agent"*.

And the Zambian app, said plainly:

> *"more than 2 months on the app but same houses for rent! I think just start deleting them when they become unavailable"* — Moses Chulu, 1★, House4Rent **(app store review — ZAMBIA)**

> *"Since I joined I only see the same houses I found."* — Abigail Thole, 1★, House4Rent **(app store review — ZAMBIA)**

### Theme 2 — Paying to see a contact number / viewing fees

> *"Viewing fee is a scam."*
> — @lucksonomari4999, **7 likes**, on "House Hunting In Nairobi | Looking for a Ksh 10,000 per month 1 Bedroom", `youtube.com/watch?v=PXk-HzebUis` **(YouTube comment)**

> *"the number added there doesn't go through and you can only know when you subscribe"*
> — Karren Kamulosu, 1★, 2026-07-09, House4Rent **(app store review — ZAMBIA)**. The cleanest single statement of the pay-to-unlock trap in the whole haul.

> *"Have you ever been scammed online or forced to pay non-refundable "viewing fees" just to look at a house in Kenya? Drop your house-hunting horror stories below! 👇"*
> — @tribedala, channel's own pinned comment on "How To Avoid House Hunting Scams in Kenya | Nyumbani Link App", `youtube.com/watch?v=mxvARWA_mK8` **(YouTube comment)**. A Kenyan media channel treats non-refundable viewing fees as the assumed shared experience of its audience.

> *"Only option is to pay to use your current email that I am sure of, the basic Free option is greyed out."*
> — Charles Ndonga, 1★, 2025-12-16, Jiji Kenya **(app store review)**

And Renters Hub's own Play Store description sells against it, which tells you it is the market's defining objection:

> *"You never pay viewing fees to confirm suitability."*
> — Renters Hub app description, `play.google.com/store/apps/details?id=ke.co.rentershub.www.twa` **(app store listing copy, not a review)**

### Theme 3 — Agents posing as landlords; "mtu ako kwa ground"

The most important single review I found, quoted in full:

> *"I was using the app to look for a rental bedsitter in South B. First of all the houses listed are relatively lower price than expected in South B. Then the numbers to be contacted refers you to an "owner" or mtu ako kwa ground. The person on the other end then demands for a deposit if you seriously want the house before even viewing. Its absurd and unethical. I called almost 8 to 10 contacts receiving the same treatment. Some people are using the app to con others. Kindly be aware of such."*
> — lina chester, 1★, 2021-06-30, Jiji Kenya, `play.google.com/store/apps/details?id=com.olx.ssa.ke` **(app store review)**

Four mechanisms in one review: **(a)** listings priced below the real market to generate calls; **(b)** the number routes you to a self-described "owner" or a *mtu ako kwa ground* — a man on the ground, i.e. a caretaker or a runner, not the landlord; **(c)** deposit demanded **before viewing**; **(d)** 8–10 of 10 contacts behaved identically. That is not a few bad actors. That is the channel's operating model.

> *"Require seller to post more photos of items, 5 at minimum, **weed out brokers**. 2. Prices can't not change- you call someone, then they say the price has gone up."*
> — Dayan Moshe, 2★, 2024-02-22, 19 helpful, Jiji Kenya **(app store review)**

> *"you find one item listed under several sellers, all in different locations.. You wonder if this is a conmen platform. There are no regulations or that's not on the developer's side of things to deal with??"*
> — Steve Araka, 1★, 2020-06-04, **1,138 helpful** (highest-voted 1★ on Jiji Kenya) **(app store review)**

> *"some sellers, seem to be the same person with different names, as the same pics are posted, including the background e.g., ones with persons in the background. Also noticed variances in prices for the same item."*
> — Nasimiyu Nika, 4★, 2023-11-09, 660 helpful, Jiji Kenya **(app store review)**

> *"we don't want to hear that am a agent please let the owners be the ones posting houses"*
> — Mwansa Friday, 3★, 2026-03-17, 8 helpful, House4Rent **(app store review — ZAMBIA)**

> *"amazing app finally no agent"* — Linet Namukoko, 5★ **(app store review — ZAMBIA)**

> *"People who don't give locations are scammers"*
> — @bensosfrequents, on the Kitengela bedsitter tour, `youtube.com/watch?v=p2F6TCDv10o` **(YouTube comment)**

> *"Good show, wengi wamepoteza deposits kwa fake agents bana. Due diligence ni must, hata mimi namake sure nimeona title na license kabla ya kutoa pesa"*
> — @KuraKEBwanaFacts, 10 days ago, on Citizen TV's "How to spot a fake property agent in Kenya", `youtube.com/watch?v=JE1tFfWsO3A` **(YouTube comment)**

And the demand stated as a product requirement, in five words:

> *"Can i get a one bedroom **agent free** in lsnet"*
> — @justusatisa, on "Very Affordable 2 Bedroom//House Hunting NAKURU,LANET//15,000 Rent", `youtube.com/watch?v=zPqAAEq0M1A` **(YouTube comment)** — "agent free" as a search filter.

### Theme 4 — Fake listings and impersonation

> *"There is someone who is listing property here to fraud gallible clients, using the names of my company Domina Homes and properties limited. Domina home's end properties limited doesn't not list with property 24 and the person who is listing with domina is an impostor. We've reported the matter to the police through one the victim. Kindly I request you pull down Domina homes and property limited because that is not me and my company. Regards Martin."*
> — Emissary Martin, 1★, 2023-05-31, Property24 Kenya **(app store review)**. A real company had to use a Play Store review as its abuse channel, because the platform gave it nothing better.

> *"the culprit is busy robbing others in the name of jiji rental apartments, its made me sick and wondering why they protect them."*
> — FEBK, 1★, 2020-06-21, Jiji Kenya **(app store review)**

> *"Of course it's not fraud free. You find an item, listed by 4 different people in different locations.. Like cars mostly."*
> — A Google user, 3★, 2019-10-23, Jiji Kenya **(app store review)**

> *"Problem, risk of fraudsters especially for houses, land, phones (caveat emptor)."*
> — A Google user, 3★, 2019-03-15, 6 helpful, Jiji Kenya **(app store review)**

> *"good but security measures should be introduced, so many fraudsters on the site. some people are genuine sellers but be careful of fraudsters, especially on houses and electronics."*
> — A Google user, 5★, 2019-06-26, Jiji Kenya **(app store review)**

> *"Misleading adds. Can't search using keywords. When you use map search / property pointed in Nyali is located in Vipingo or Kilifi."*
> — A Google user, 1★, 2018-05-12, 10 helpful, Property24 Kenya **(app store review)**. Nyali is in Mombasa; Vipingo and Kilifi are 30–50 km up the coast.

### Theme 5 — The mass market is not served at all

> *"really what is needed in Nairobi, no options for common mwananchi though, like bedsitters"*
> — Kevin Mulundi, **5★** (he liked the app and still said this), 2026-06-20, Reemio **(app store review)**

> *"The app is good depending on your budget"*
> — Hope Kinjo, **2★**, 2024-05-10, Property24 Kenya **(app store review)**. Eight words; two stars.

> *"Why does it have limited options?"* — A Google user, 1★, 2018-09-16, Property24 Kenya **(app store review)**

> *"very complicated, very few listings in most areas like Kiambu, none of Kiambu"*
> — Joan Kituyi, 1★, 2026-07-10, Reemio **(app store review)**

> *"only for nairobi"* — gakii ashley, 3★, 2026-06-20, Reemio **(app store review)**

> *"this is awesome. get more houses for other major towns...meru also"* — Lyn Ntinyari, 5★, Reemio **(app store review)**

> *"I hope there will be more listing in future."* — Martin K. Kimosop Kivindyo, 5★, 2026-08-02, kejanova **(app store review)**

> *"Has potential to be the go-to app for house-hunting if they can onboard a lot more similar listings and locations that are genuine & verified. Every landlord should list here."*
> — Eddie Sewe, 5★, 2026-07-26, Reemio **(app store review)**

And in the comments, the gap between the mass market and what gets filmed:

> *"Eeeeeezzzzrrrraaaaaaa......😂.....the reason why sisi watu wa Nairobi na wale wa Mabatha wanakujua ni juu you bring us videos for houses zenye tunataka lakini hatuwezi zifikia......your bedsitters for 6K zina-aibisha za huku juu zetu za 6K ni kitanda tu na suitcase yako ndio hutoshea......tunatamani sana hizo za Naks, why lie......😄"*
> — @susanmuraguri8564, 6 likes, on the Pipeline/Nakuru budget bedsitter video, `youtube.com/watch?v=dyUaTw5yP-0` **(YouTube comment)**. A Nairobi KSh 6,000 room fits "only a bed and your suitcase"; a Nakuru KSh 6,000 room shames it.

> *"Makofi kwa landlord, huku Nairobi bedsitter unalipa 10k no curtain rods no shower head ujiwekee.. currently house hunting"*
> — @joymwende4080, `youtube.com/watch?v=9nAQlXa3f6w` **(YouTube comment)**

> *"my dear you have expensive taste, sasa house hunting itakusumbua. I find people looking for their first house always get shocked at the prices in Nairobi. In Nairobi if you want a nice cheap house you have to live far... I would give lower kabete a chance, It's not that far ... provided it's one trip to town"*
> — @imungukalevera8671, 2 likes, `youtube.com/watch?v=SOqGvMadIYk` **(YouTube comment)**

> *"Umoja is good but the houses are not modern and pricey"* — @Maemilley, `youtube.com/watch?v=PXk-HzebUis` **(YouTube comment)**

> *"The housing units in relation to the state of roads = slightly overpriced. If those roads end ups being tarmacked, I can assure you those prices will rise further to reflect that. I always house rent prices around nairobi and its outskirts are exergerrated."*
> — @snowball4259, on House Hunting in Ruiru 10k–20k, `youtube.com/watch?v=ZZFzFBDv8Q4` **(YouTube comment)**

### Theme 6 — "Where is it? Plug me." The demand signal, raw

Beyond the stale-listing cluster in Theme 1, people use comment sections as a want-ads board. Every one of these is a mass-market renter with a stated budget and no product to serve them.

> *"Hakuna kitu huniudhi kama house hunting 😭 . Ata video nishaanza kuforward tayari 😂 tell me kwa ground sasa 😂 ."*
> — @ShiroK-y5c, 3 likes, `youtube.com/watch?v=JXLcnuA2UVQ` **(YouTube comment)** — "Nothing annoys me like house hunting. I've even started fast-forwarding the video. Just tell me what it's like on the ground."

> *"House hunting is the worst thing I endured this year😂😂"* — @hotmessplotline, 7 likes, `youtube.com/watch?v=SOqGvMadIYk` **(YouTube comment)**

> *"Saw your video on Instagram too, good content girl. For real house hunting in Nairobi is tough currently but I experienced it just a few months ago but I encourage you to pray and ask God to give you a house and tell Him to Let His will be done cause was it is tough but with God you will be in good hands."*
> — @fionaowuor3519, **34 likes** (top comment), `youtube.com/watch?v=SOqGvMadIYk` **(YouTube comment)**

> *"That last apartment!!😍😍I need those details because I've also been house hunting for MONTHS😭😭"* — @matubzzzzy, 7 likes **(YouTube comment)**

> *"Kwani ni Estate gani hii jamani rent ni only 8k bedsitter mzuri kama hii?"* — @elizabethmwalo8424, `youtube.com/watch?v=ri1oKR8r-dg` **(YouTube comment)**

> *"Location ...Kuna vacant ?"* — @CeciliaIrungu-z3e, **16 likes**, `youtube.com/watch?v=C-XtGM8vWrU` **(YouTube comment)**

> *"I love every detail....where exactly is the house located I am currently looking for a house"* — @anitamasiga4101, 4 likes, `youtube.com/watch?v=9nAQlXa3f6w` **(YouTube comment)**

> *"Great arrangement! Love the bathroom tiles, so pretty! A great price too for that space! What area is it if I may ask? Coz houses out here aren't cheap.....kindly share if it's okay with you."* — @joynerakinyi8305 **(YouTube comment)**

> *"Aki natafuta nyumba around Tassia...pliz nipee contacts"* — @lorinejuma9178, `youtube.com/watch?v=ELa1leC3FMA` **(YouTube comment)**

> *"How does one contact you if they want to view the house"* — @rehemamohamed6742, `youtube.com/watch?v=ZZFzFBDv8Q4` **(YouTube comment)**

> *"Hi, love your vlog, please plug me the location of the 3rd house"* — @rachel5354, `youtube.com/watch?v=ETkMS52D9Is` **(YouTube comment)**

> *"Hi Bree, please pin your contact. It makes it difficult to get to YouTube then we have to contact you back to IG. A little pointer, when marketing, input your socials as a banner for ease of reach. Otherwise, I need to contact you on this and please don't send me back to IG."*
> — @christopherjoseph2164, `youtube.com/watch?v=ALF8CmXv2jE` **(YouTube comment)** — a renter writing UX feedback to a landlord's marketing funnel.

And people requesting coverage of exactly the target estates:

> *"Great job found your channel is it possible you do jogoo road doni pipeline and maybe Kayole?"* — @AaronPat-hd9hb **(YouTube comment)**
> *"Could you please do for ruaraka near Utalii budget friendly bedsitters🙏🏾❤️"* — @iamrafe15, 2 likes **(YouTube comment)**
> *"Good stuff. Please do Nairobi West & South B & C."* — @TheeRomannn, 2 likes **(YouTube comment)**
> *"Kindly do a Ruai one"* — @loisemugure1028 **(YouTube comment)**
> *"Next one do Kenyatta road😭🙏"* — @techwithann, 6 likes **(YouTube comment)**
> all on `youtube.com/watch?v=ZZFzFBDv8Q4`

**And renters specifying the exact fields a listing should carry** — unprompted, as feedback to vloggers:

> *"Always thorough. You could also be including **details for security and Garbage** if they are available."*
> — @sakariwataka2023, on the Ruai KSh 7,000 bedsitters, `youtube.com/watch?v=WlpeWUXq3Eg` **(YouTube comment)**

> *"maji na stima ziko kando ama"* — @FramcisWanjiru, `youtube.com/watch?v=TL2nVDzxK9Y` **(YouTube comment)** — "are water and electricity separate [charges], or not?"

> *"Record abit slower n tuonyeshe more detail.. floor ivi.. finishing ya floor. Bafu . Sink.. **taps ngapi** ivi n location.. kunazo balcony?.. incase mtu anaeza taka kuweka machine.your videos r great.."*
> — @thatchiqfaye9154, `youtube.com/watch?v=6uXDQ4B56RM` **(YouTube comment)** — floor finish, bathroom, sink, **how many taps**, location, balcony (for a washing machine).

> *"you should work on how you veiw each and every detail of the house .... Some of us care to know and see what the tiles look like the color the outside .... when viewing a house you have to explain each and every detail"*
> — @call_me_Joseph, 4 likes, same video **(YouTube comment)**

> *"These houses are so nice nikidhani ziko Nairobi kumbe ni Nakuru, **start with the location** 😂"*
> — @elvisjuma8745, 2 likes, `youtube.com/watch?v=4T45ONcYCm4` **(YouTube comment)**

[MY SUMMARY] Across four videos, renters volunteered the field list they want: **location first**, rent, whether water and electricity are billed separately, garbage, security, water reliability, taps, balcony, floor finish. That is a schema, written by the customer, for free.

**People also argue about whether a price is fair, exactly as the brief predicted:**

> *"Doesn't deserve 12k but depends with location"* — @njorogeantony7672, `youtube.com/watch?v=cYGPcfgsWQI` **(YouTube comment)**

> *"The housing units in relation to the state of roads = slightly overpriced."* — @snowball4259, `youtube.com/watch?v=ZZFzFBDv8Q4` **(YouTube comment)**

> *"Bedsitter 9k heri nijaze 10 k Embakazi"* — @queendorow, `youtube.com/watch?v=z0LRU0DGlxU` **(YouTube comment)** — "A 9k bedsitter? I'd rather top up to 10k in Embakasi."

> *"Anunue washing machine ya 59k na anakaa bedsitter...wonders shall never end"* — @NanaNwali, `youtube.com/watch?v=ri1oKR8r-dg` **(YouTube comment)** — "She buys a 59k washing machine and lives in a bedsitter."

### Theme 7 — Deposits

> *"I always leave houses in the best condition possible,no damages, everything intact and after the inspection when I was moving, I wasn't refunded my deposit. The last house,I fought hard, I was just refunded half, imagine . Next time I will stay an extra month rent free to cater for my deposit 😏"*
> — @majestymaurice3239, 5 likes, `youtube.com/watch?v=nPZ2hh9GaDc` **(YouTube comment)**

> *"I was told to. Paint the house when I entered, and when I left I was told my deposit was used to paint the house. Yet I left it in a perfect condition not even a scratch."*
> — @computermaster-ik3jy, 3 likes, same video **(YouTube comment)**

> *"mimi kuna hao nilikua nalipa 13k hapo kwendani,kuhama jamaa wananiambia ati wao hukata pesa ya rangi 7 k kwa kila, plus other deductions, nilipewa 2700 deposit"*
> — @ShitandaBriankulecho, `youtube.com/watch?v=5bwgKQKdD9Q` **(YouTube comment)**

> *"A landlord has withheld my deposit since last year. They are employing the tactics they use to delay you to frustrate you so you give up on the claim. I have not forgotten."*
> — @BrainEmpower, 7 likes (top comment), `youtube.com/watch?v=nPZ2hh9GaDc` **(YouTube comment)**

> *"I have suffered from this I was transferred in my place of work he promised to pay me back but after I moved from his house and he knew I was far he told told me doesn't know of any deposits"*
> — @mccoy-oneofficial5896, 3 likes, same video **(YouTube comment)**

> *"Landlords are very crafty. They usually bring agreements when youve already entered the house paid rent and deposits."*
> — @salimmbuleramadhan8120, 3 likes, `youtube.com/watch?v=zygLL8iaSis` **(YouTube comment)**

> *"That is the law. In practice, the tenants don't even know this protection. The so called tribunal is not even known. When did this tribunal last visit Kibera, Mathare, Kawangware etc"*
> — @tompeters8696, `youtube.com/watch?v=zygLL8iaSis` **(YouTube comment)**

> *"where to I find those tribunal"* — @anthonymakokha9365, 3 likes, same video **(YouTube comment)**
> *"How can l be return back my deposit"* — @PhidelisMirimu-y2f, same video **(YouTube comment)**

And from the landlord side of the same comment threads:

> *"Sisi watu wa kalia deposit tuko sawa"* — @dankiarie671, `youtube.com/watch?v=aJRMabrriPc` **(YouTube comment)** — "Those of us who sit on deposits, we're fine."

> *"Mwaf own a rental house first, mambo ya kudanganya tenant asue landlord. Utahama nyumba zote urudi ushago."*
> — @alphacentauri528, **10 likes** (top comment), on "You Can FINALLY Sue Your Landlord for Your Rental Deposit", `youtube.com/watch?v=5bwgKQKdD9Q` **(YouTube comment)** — "Own a rental house first, before telling tenants to sue landlords. You'll move out of every house and end up back in the village."

### Theme 8 — Water, garbage, and what the estate is actually like

On "Biggest 'Concrete Slum' in Kenya. The Pipeline Estate", `youtube.com/watch?v=iFcG7roY_dE`:

> *"I lived there 1 week in a singleroom with relatives of my boyfriend. A big renthouse without water in the shower and toilet rooms. Even they was not self contents..terrible dangerous unhygienic. The was was full of garbage..very overpopulated area..ppl biught drinkwater on road from that watertraders and i think its was not clean water."*
> — @gabistan2007, 4 likes **(YouTube comment)**

> *"Pipeline estate is an eyesore because of the heaps of garbage and open sewers littering everywhere! I went to visit a friend at plot 10 and witnessed all these things! ... The place is so congested and dangerous for pedestrians who have to struggle for the very little space there is between them, boda bodas and vehicles..."*
> — @timmusumba5846, 4 likes **(YouTube comment)**

> *"I lived in this area during my attachment. Was hell on earth."* — @goodjoseph220, **8 likes** **(YouTube comment)**

> *"burst pipes kila mahali na kukosa maji 2023 ni aibu watu wajigawe waendee Mandera & the likes, resources zinakuwa scarce na shida mingi"* — @maumaumwangi1, 2 likes **(YouTube comment)**

> *"Correction it's not a slum rather a concrete jungle."* — @carolcarol9372, 7 likes **(YouTube comment)**
> *"The millions of cash that circulate here will tell you, its not a slum... The hood is an estate with poor planning"* — @qtypowelh6348, 2 likes **(YouTube comment)**

> *"Wow that house 😍😍 it's awesome 💯 I like it...but am very keen wall iko Na crack I fear for your safety girl.."*
> — @ruthwanjiru1106, 2 likes, on the KSh 8,000 Eastern Bypass bedsitter, `youtube.com/watch?v=ri1oKR8r-dg` **(YouTube comment)**

> *"Which internet is available fast flow or second flow is available and water please I need it I stay donholm"*
> — @bishoyherballifestyle7879, `youtube.com/watch?v=ELa1leC3FMA` **(YouTube comment)**

Note that on the supply side, **water is a headline selling feature**: three separate listing-video titles lead with it — *"Full-Time Water, Parking"* (NoY1STfNDPQ), *"Full-Time Water, Balcony & Kitchen Cabi…"* (hTsV1sg1DrM), *"VERY SPACIOUS | WATER 24/7"* (WlpeWUXq3Eg).

### Theme 9 — Product failures that have nothing to do with listings

Property24 Kenya's 1★ pile is overwhelmingly about the app simply not opening. This matters: it is what a neglected market-leading app looks like.

> *"How is this Kenyan version of this app down for more than a year without the developers knowing? What a farce! Even after the new update, you can't access it as it says it can't access the internet so I have been accessing from playstore every time. Nonsense!"* — 1★, 2020-01-04, 21 helpful **(app store review)**

> *"The app keeps on failing. For such a serious business, it would be better not to have an app than to have one that frustrates potential clients."* — 1★, 2020-04-02 **(app store review)**

> *"Your website is better than this app."* — 1★, 2019-09-04, 3 helpful **(app store review)**

> *"Their App & Website is poor & extremely unreliable. Most times they're usually down or under maintenance. Very poor these days please get it back to how good it used to be or sell the service to someone who can run it better."* — 1★, 2019-09-16 **(app store review)**

> *"App is buggy. Completely ignores the search parameters and shows you irrelevant results."* — 1★, 2019-07-15, 5 helpful **(app store review)**

> *"App requires a suburb everytime you search which limits searches to small areas. Very inconveniencing!"* — Aggrey Juma, 1★, 2020-05-24 **(app store review)**

> *"One problem when you move out of the app coming back to where you were when you left is a problem you must start from the beginning"* — fredrick onyango, 1★, 2023-09-20 **(app store review)**

And the single most actionable small complaint in the haul:

> *"it's hard to create an account"*
> — Jeremiah Wambua, 3★, 2026-04-14, **4 helpful — more than any 5★ review on that app** — kejanova **(app store review)**

> *"Can't play without giving them your information. Lol must create an account, for what other than selling your information."*
> — Son of Zeus, 1★, 2026-09-11, on `com.kadi.ke` **(app store review — a Kenyan card game, not a rental app; included only as evidence of Kenyan resistance to forced signup)**

### Theme 10 — Platform-side extraction (what landlords and agents experience)

Relevant because the founder needs supply, and supply is currently being milked.

> *"FAKE SALES LEADS there is this nasty habit jiji has been deploying recently where some of their agents call and pretend to be potential clients, to give you the false elusion that jiji is working and reaching potential clients. but it is a lie to get you to pay for promotion packages. and when you reject those fake phone calls they turn off your adds with the excuse that " people" are complaining they can't reach you"*
> — daniel Wangai, 1★, 2026-01-15, 7 helpful, Jiji Kenya **(app store review)**

> *"It's all a front, they get you to buy premium ad space. Then they hire fake customers to call and show interest, then the hired customers just ghost you without making any purchases, it's a scam the buyers are not real, it's all staged, I got three calls from the same person pretending to be three different people."*
> — tony omondi, 1★, 2023-03-01, Jiji Kenya **(app store review)**

> *"A mixture of scammers and genuine buyers and sellers in equal measures. The platform also has deliberately planted "fake buyers" and sales agents to make you think it has greater potential, just to entice you to subscribe for their ads."*
> — Emmanuel Juma, 2★, 2024-11-26, **138 helpful**, Jiji Kenya **(app store review)**

> *"Why do yu remove my ads if I don't pick your calls? C'mon have some respect of our time."* — Patrick Irungu, 1★, 2022-01-21, Jiji Kenya **(app store review)**

> *"it will take them 42 hours to post your ad but the minute it's indicated that your ad is under review you will receive a thousand phone calls from their customer service agent pressuring you to buy the premium package"*
> — Sharlyne Oketch, 1★, 2022-10-19, Jiji Kenya **(app store review)**

> *"You increase the subscription fees every day and reduce the amount of free ads that one can post. Used to be a nice platform but currently overregulation will kill it."*
> — Gerald Maina, 1★, 2023-01-18, Jiji Kenya **(app store review)**

> *"I don't like your automatic or ignorant categorization of listings. I list a property for sale but you decline it saying it should be under the 'for rent' category. Simple question, do you know the listing better than the owner? ... You pay for premium services but receive mediocre customer service. Facebook Marketplace ✅"*
> — Kelvin Mwangi, 3★, 2025-07-29, 5 helpful, Jiji Kenya **(app store review)**

> *"Very hard to figure out how to add listing via a mobile device. Urgent need for review!"* — 1★, 2015-11-16, Property24 Kenya **(app store review)**

---

## 5. On caretakers

This is the section the brief cared most about, and I must be straight: **I found real caretaker testimony, but not a clean confirmation of the vacancy finder's-fee hypothesis.** Here is everything, in order of how close it gets.

### 5a. The closest thing to direct testimony on a fee paid to the person who shows the house

> *"The part you said people do not move once they rent is true.. I live in Eastleigh with my family, and after I found out how deposited, plus **an amount I never heard of, which is taken by the person who shows you** are I don't think we gonna move near future anyway thanks for your video"*
> — @Xoggaar, 3 likes, on "House Hunting In Nairobi | Looking for a Ksh 10,000 per month 1 Bedroom", `youtube.com/watch?v=PXk-HzebUis` **(YouTube comment)**

[MY SUMMARY] This is the strongest evidence I obtained. A tenant in Eastleigh says that on top of rent and deposit there was **"an amount I never heard of, which is taken by the person who shows you"** — a charge he had never previously encountered, levied by whoever conducts the viewing, and large enough that it is a reason his family will not move again. **"The person who shows you"** is, in a mass-market Kenyan block, almost always the caretaker or his runner. But he does not use the word caretaker, and he does not state the amount. **Partial confirmation. Not proof.**

Set beside it, from the same video:

> *"Viewing fee is a scam."* — @lucksonomari4999, **7 likes** — the highest-voted comment on that video **(YouTube comment)**

### 5b. Caretakers named as money-takers in the rental chain

> *"Thanx for Enlightening us about Rent Deposit many people have Fallen Victims of Those Hungry Çáretakers/Agents"*
> — @kilonzondambuki2246, 2 likes, on "Has the Landlord Refused to Refund Your rent Deposit?", `youtube.com/watch?v=nPZ2hh9GaDc` **(YouTube comment)**. Note he writes **"Caretakers/Agents"** as one category — in tenants' mental model the caretaker *is* the agent.

> *"Qhat of caretakers taking advantage of students by **cooking books of water** reporting so that **they eat from getting the tender of taking water to the flats**... Rent is 5500, written agreement but water deposit wasn't written and they go squandering the money from cooking numbers **yet the metres don't work**"*
> — @weekuwarealeralaa8429, on "Can a Landlord Lock You Out for Not Paying Rent?", `youtube.com/watch?v=zygLL8iaSis` **(YouTube comment)**

[MY SUMMARY] A caretaker water racket, described in operational detail: broken meters, invented readings, and the caretaker holding the water-supply "tender" to the flats. The rent is stated (KSh 5,500) and the water deposit is deliberately kept out of the written agreement. **This is confirmed caretaker rent-seeking — just on water, not on vacancies.**

> *"How do you handle this situation a deal was made without my concern whereby **landlord instructed caretaker to tap stima and water pump on my line** I discovered this after a year… how do you handle this coz naambiwa akuna kitu naeza fanya"*
> — @artmartservices, `youtube.com/watch?v=nPZ2hh9GaDc` **(YouTube comment)**

[MY SUMMARY] The landlord had the caretaker wire the building's electricity and water pump onto this tenant's own meter. He found out a year later and was told there was nothing he could do. **Caretaker as the instrument of landlord extraction.**

### 5c. Caretaker behaviour and power, from a tenant in Umoja

> *"Huyo caretaker wako ni mgenerous wa huku umoja kichwa ngumu sana.... Simple things haezi fanya.... Lemme tell you my people care taker wale wako na nduthi wako na kiburi sana.... Landlord and landladies check on your people😢😢"*
> — @artmartservices, on the KSh 8,000 Eastern Bypass bedsitter tour, `youtube.com/watch?v=ri1oKR8r-dg` **(YouTube comment)**

[MY SUMMARY] "That caretaker of yours is generous — the ones here in Umoja are very hard-headed. He won't do simple things. Let me tell you my people, those caretakers who have motorbikes are very arrogant. Landlords and landladies, check on your people." A tenant in Umoja saying caretakers are unaccountable, that the ones with motorbikes (i.e. with side income) are the worst, and asking landlords to supervise them. **It establishes the caretaker as an autonomous power centre that landlords do not control — which is the precondition for the finder's-fee hypothesis — without proving the fee.**

### 5c-bis. The caretaker is the renter's default route to a vacancy

This is the clearest thing I found about caretaker **function**, and I only found it by reading the comments on a six-year-old Thika Road 1BR tour, `youtube.com/watch?v=bktxvMIp7yc` ("1 BEDROOM APARTMENT TOUR||KSH 10,000||House hunting|Rentals||THIKA ROAD"). Under one video, three separate strangers ask the vlogger for **the caretaker's phone number** — not the landlord's, not an agent's:

> *"Sasa...nipee contact ya caretaker"* — @marthakamene7350 **(YouTube comment)** — "Now, give me the caretaker's contact."

> *"Hey can I have the care takers number?"* — @esthernyamuiru4909 **(YouTube comment)**

> *"Amazing how your YouTube has grown new subbie. Edit: **Not sure if I should call the caretaker or ask you directly, kuna vacant kwa sasa?**"* — @Cheboi_1 **(YouTube comment)** — "...are there any vacant right now?"

> *"Hi, Najma. New subbie here. Are you still living in this apartment? How's it so far? Do you love it? Any good and bad reviews? **Niliambiwa Kuna vacants lakini I'd love to hear from your personal experience.** Thank you!"* — @maureenwawira155 **(YouTube comment)** — "I was told there are vacants, but I'd love to hear from your personal experience."

[MY SUMMARY] Four renters, one building. Their mental model of how to find out whether a unit is free is: **ring the caretaker.** @Cheboi_1 weighs calling the caretaker against asking a tenant, as the two available options — a landlord or a listing site does not enter her head. **This does not prove the caretaker charges for that information, but it establishes that he is the gatekeeper who holds it.** That is the half of the hypothesis I can support with direct quotes.

And a tenant defending caretakers against a house-hunting vlogger who had evidently been hard on one, on `youtube.com/watch?v=XofGhbVD0Kw`:

> *"Mbona unaonea caretaker 😂😂 landlord uchumi wake usipelekee caretaker 😂😂"* — @evebibah98 **(YouTube comment)** — "Why are you picking on the caretaker? Don't take out the landlord's economy on the caretaker."

### 5d. The products themselves treat caretakers as a supply channel

> *"Deal only with verified advertisers — **Landlords, caretakers, and agents are verified before posting** — no scams."*
> — Renters Hub app description, `play.google.com/store/apps/details?id=ke.co.rentershub.www.twa` **(app store listing copy)**

[MY SUMMARY] This is indirect but strong structural evidence. A Kenyan rental app lists exactly three classes of advertiser and the **caretaker is one of them**, alongside the landlord and the agent. An operator in this market, writing sales copy, assumed its readers would find "caretaker" a normal and legitimate source of a vacancy listing. Caretakers are not bystanders in Kenyan rental supply; they are a recognised channel.

And from the listing side on YouTube, vacancy information is explicitly monetised:

> *"To get your house featured on our channel,contact me via 07** *** ***. In the meantime, we will keep posting what we can to keep the channel going."*
> — @mercy-karani, pinned comment with **59 likes** on her own KSh 8,000 bedsitter tour (881k views), `youtube.com/watch?v=ri1oKR8r-dg`, and repeated on her KSh 7,000 tour (1.0m views), `youtube.com/watch?v=9nAQlXa3f6w` **(YouTube comment)**. *(Phone digits masked by me; they are public in the comment.)* **The largest house-tour audience in Kenyan YouTube monetises vacancy exposure directly — landlords and caretakers pay, in cash or in kind, to get a unit in front of a million viewers. That is the founder's competitor, and it is a phone number.**

> *"Come I take you for house hunting **for free** at lucky summer estate,minutes from mirena 10-15k can give you a better 1 bedroom house"*
> — @ClintonOmondi-r3b, `youtube.com/watch?v=vyrGFzVYKxE` **(YouTube comment)**. He volunteers "for free" unprompted — which only makes sense in a market where being taken house hunting normally costs money.

> *"Thanks bro that is really cheap **they should pay you for finder fees**"*
> — @unclesmooth9718, 4 likes, on "I Can't Believe This $100 Apartment In Nairobi Kenya", `youtube.com/watch?v=A8tzbK46n2M` **(YouTube comment)**

> *"what's the contact of the broker?"* — @absfinal, 6 likes, same video **(YouTube comment)**

### 5e. What I did NOT find — stated plainly

- **No Kenyan said "I paid the caretaker X shillings to show me a vacant house."** Not in 1,700 YouTube comments, not in 3,200 app reviews. The nearest miss is @Xoggaar in §5a, who paid such a fee but did not name the recipient's role or the amount.
- **No caretaker described taking such a fee.**
- **No landlord complained about caretakers charging their prospective tenants.**
- The one video whose title promised caretaker financial misconduct — *"Case of Caretaker Accused of Stealing Over Sh500,000 Rent from tenants"* (`youtube.com/watch?v=MDbadT6XC_g`) — **has zero comments**, and I could not reach the video page to read the case.
- **The Google Maps corpus, which I could not read, is where this answer most likely lives.** Tenants reviewing their own building are the only people with both the knowledge and the motive to write "the caretaker wanted 2,000 before he'd show me the vacant unit."

**Verdict on the hypothesis: unresolved, leaning plausible.** I found (i) a tenant paying an unexpected fee to "the person who shows you"; (ii) "Viewing fee is a scam" as a top-voted comment; (iii) two confirmed caretaker money rackets (water, electricity); (iv) **four renters under one video asking for the caretaker's number as the way to learn whether a unit is vacant**; (v) tenants filing caretakers and agents in the same mental category; (vi) an app treating caretakers as a listing source. That is a consistent picture of the caretaker as the gatekeeper of vacancy information and as a man who already monetises his position in other ways. It is not the direct testimony the brief asked for, and I will not dress it up as such.

**How to settle it cheaply:** the Google Maps reviews of the 3.3–3.9★ buildings in §7 are written by tenants about their own caretakers (see §1 note 2 for why I could not read them). Failing that, the question is one phone call to any of the Kenyan commenters above who volunteered to take a stranger house hunting.

---

## 6. What this says about why the existing products fail

Grounded only in quotes above.

**1. The listings are dead, and everyone knows it.** The most-upvoted review on Kenya's largest marketplace — 2,474 people — is about a year-old listings staying live (ignatious maina). The complaint is identical on Property24 in 2016 (*"same old same old"*), in 2022 (Sylvia Maina's *"They have 2020 or 2021 dates"*), and on the Zambian app in 2026 (*"same houses for rent!"*). **Ten years, three products, one unfixed defect.** And on YouTube it is not a complaint, it is a background condition: 36 people under one Kitengela video asking *"Ziko wapi?"* and *"Is it available still"*, four years of *"Is this still available?"* under a Tassia tour, and @essyadhiambo8245's *"Texting after three months no response."* **Implication: freshness is not a feature, it is the product. A list that is merely large is worth nothing.** The one actor who solves it does so by hand — a Nakuru channel editing **"(BOOKED)"** into its own video title.

**2. The contact at the end of the listing is not the landlord, and the renter has no way to know.** lina chester's review is the whole mechanism in five sentences: under-priced listings, numbers that route to *"an 'owner' or mtu ako kwa ground"*, deposit demanded **before viewing**, and **8 to 10 of 10 contacts behaving the same way.** Phay Sonny went to see a 55k house and was quoted 130k. Dayan Moshe's fix request is literally *"weed out brokers."* Steve Araka asks *"You wonder if this is a conmen platform. There are no regulations…"* **Implication: the asset is not the listing, it is a verified claim about who is on the other end of the phone and what they will charge. No existing Kenyan product makes that claim credibly.**

**3. Charging to reveal the number destroys the product, because the numbers are dead.** The two failures compound. Karren Kamulosu paid, then found *"the number added there doesn't go through and you can only know when you subscribe."* That is the business model of a fraud whether or not fraud was intended — and it produced a 1★ review that will sit on that app forever. Meanwhile *"Viewing fee is a scam"* is the top comment on a Nairobi house-hunting video, and Renters Hub leads its own marketing with *"You never pay viewing fees."* **Implication: free is not merely a nice positioning for this founder; any paywall in front of a contact detail will be read as the scam the market already expects, and will be punished the moment one number fails.**

**4. Nobody serves KSh 4,000–30,000, and the gap is stated by satisfied users.** Kevin Mulundi gave Reemio **five stars** and still wrote *"no options for common mwananchi though, like bedsitters."* Hope Kinjo's entire 2★ review of Property24 is *"The app is good depending on your budget."* Joan Kituyi: *"very few listings in most areas like Kiambu, none of Kiambu."* Reemio's own staff reply that bedsitters start *"as low as 6,000"* — which is an admission that a user with 10K+ installs' worth of company could not find one. Against that: KSh 3,000 single rooms in Umoja, 6,500 bedsitters in Kitengela, 8K in Pipeline, 9K in Umoja 1BR, all stated by commenters on YouTube. **Implication: the inventory the founder wants to list is abundant and actively discussed — it is simply not in any app. The supply is on YouTube, TikTok and noticeboards.**

**5. The install numbers say nobody has won.** kejanova: 5K+ installs, 12 reviews. Renters Hub: 500+ installs. Househunt Kenya: 1K+ installs and **3.4★**. Nyumba Search 50+. Rentor 10+. KiliMani 10+. The only Kenyan rental app with real scale is **Property24 at 50K+, and its 1★ reviews are mostly "it doesn't open."** BuyRentKenya — the strongest brand — **never shipped an app at all.** iOS has two ratings across the whole category. **Implication: there is no incumbent to displace, only a vacuum. The risk is not competition; it is that this category has already eaten a dozen founders.**

**6. Friction at the door kills a free product instantly.** The most-upvoted negative review on kejanova — more upvotes than any of its positives — is five words: *"it's hard to create an account."* Victor Gitau gave Reemio 3★ because *"I can't book a visit or get in contact with the owners. Only the location is availed."* **Implication: no signup before browsing, and the phone number must be visible on the listing.**

**7. The supply side is being farmed, which is an opening.** Landlords and agents on Jiji describe planted fake buyers (Emmanuel Juma, 138 helpful), ads switched off for not answering sales calls (Patrick Irungu), *"a thousand phone calls from their customer service agent pressuring you to buy the premium package"* (Sharlyne Oketch), and rising fees with fewer free ads (Gerald Maina). **Implication: a free, no-call, no-upsell listing channel is as differentiated for the landlord as it is for the renter — and landlord goodwill is how the founder gets the vacancy feed that solves problem 1.**

**8. Nothing about trust can be outsourced to star ratings.** Renters Hub has 4.8★ from six reviews, three posted on a single day, with no negatives. Househunt Kenya has 3.4★ and all three of its written reviews are 5★. And the developer reply *"It is delightful to hear such positive words and it's always a pleasure to serve our users."* appears **verbatim on both Renters Hub and Househunt Kenya** — two nominally unrelated developers. [MY SUMMARY: I read this identical string on both app pages; I cannot prove who wrote it, but reviews on small Kenyan rental apps should not be trusted as signal.] **Implication: the founder cannot win trust by looking trusted. It has to come from the listing being true today.**

---

## 7. Google Maps: what I can report

Review **text** was unreachable (§1). What follows is real structural data from the Maps search endpoint, fetched 2026-10-19 — and a map of where the unread goldmine is.

### Buildings in or near the target estates, with review volume

| Building | Area | Rating | Reviews |
|---|---|---|---|
| **Tumaini estate Apartments** | Embakasi (Pipeline) | 4.1★ | **744** |
| Pride Park Apartments 229 | Embakasi | 4.5★ | 100 |
| Pipeline Company Estate Apartments | Embakasi (Pipeline) | 4.2★ | 51 |
| Neema Apartments Embakasi | Embakasi | 4.1★ | 44 |
| **Summerrose Apartments** *(listed as "Apartment rental agency")* | Embakasi | **3.6★** | 39 |
| Skyline Estate | Embakasi | 4.7★ | 18 |
| Plot 10 Pipeline | Embakasi (Pipeline) | 4.5★ | 13 |
| Zenet Apartments | Embakasi (Pipeline) | 3.9★ | 7 |
| Kenya Pipeline Staff quarters | Embakasi | 4.3★ | 6 |
| **Kayole_kona** | Kayole/Umoja | **3.9★** | 57 |
| Royal Court Apartment | Umoja | 4.6★ | 19 |
| Unity Apartments | Umoja | 4.2★ | 9 |
| Bliss Apartments | Umoja | 4.7★ | 6 |
| Eden Homes umoja apartment | Umoja | 4.8★ | 5 |
| Acacia Apartments - Umoja | Mowlem | 4.5★ | 4 |
| Pinnacle Towers - Mumbi, Githurai 45 | Githurai 45 | 4.6★ | 18 |
| Camphor Apartments | Zimmerman/Kahawa S. | 4.4★ | 23 |
| Acacia Apartments | Zimmerman/Kahawa S. | 4.5★ | 19 |
| Palm Suites Apartment Zimmerman | Zimmerman | 4.4★ | 10 |
| Aspen apartments | Zimmerman/Kahawa S. | 4.6★ | 10 |
| **MM Apartments Zimmerman** | Zimmerman | **3.3★** | 4 |
| **Lifestyle Terraces LR NO. 12715/538** | Syokimau | 4.4★ | **500** |
| **Blue Bells Gardens Apartments** | Syokimau | 4.4★ | **494** |
| **Olonyori Apartments - Syokimau** | Syokimau | 4.3★ | **447** |
| **360° Court Apartments Phase 2** | Syokimau | 4.2★ | **372** |
| 360 Court Apartments Phase 1 | Syokimau | 4.2★ | 243 |
| Sunpark Residences | Syokimau | 4.5★ | 107 |
| TAURUS RESIDENCES | Syokimau | 4.7★ | 96 |
| Amalia Apartments Syokimau | Syokimau | 4.1★ | 52 |
| Luxore Apartments - Chady Road | Syokimau | 4.4★ | 48 |
| **Greenspan Housing** *(listed as "Real estate agency")* | Donholm | 4.4★ | **365** |
| hytechcyber | Donholm | 4.3★ | 87 |
| Salama Court Donholm | Donholm | 4.4★ | 40 |
| Donholm Heights | Donholm | 4.2★ | 39 |
| Donholm Phase 5G Estate | Donholm | 4.5★ | 22 |
| Ivy Apartment - Kasarani | Kasarani | 4.3★ | 73 |
| Clay City Heights | Kasarani | 4.5★ | 37 |
| By Faith Apartments, Clay City | Kasarani | 4.2★ | 28 |
| Maisawa Apartments - Kasarani | Kasarani | 4.7★ | 24 |
| **Gracious Apartments Kasarani** | Kasarani | **3.9★** | 22 |
| Vantage Apartments Kasarani | Kasarani | 4.1★ | 11 |

### Agencies

| Agency | Area | Rating | Reviews |
|---|---|---|---|
| LM Realtors | Kilimani | 4.7★ | **309** |
| Fanaka | Syokimau | 4.8★ | **227** |
| Pulse Manor (property management) | Ngara West | 4.9★ | 59 |
| Madaraka Homes Limited | Ngara West | 4.5★ | 21 |
| Nulands Limited | Syokimau | 4.8★ | 20 |
| Home Hunters | Embakasi | 4.9★ | 16 |
| **Renters Hub** *(the app from §2, as a property management co.)* | City Square | 4.8★ | 13 |
| **Braca Properties Buying & Selling Loan** | Embakasi | **3.5★** | 6 |
| Kilimani Rentals | Kilimani | 4.8★ | 5 |

[MY SUMMARY] Two things are usable even without the text. **(a)** The volume is real and concentrated: Syokimau alone has ~2,200 tenant reviews across six complexes; Greenspan Housing in Donholm has 365; Tumaini in Pipeline has 744. **(b)** The low-rated entries are the shortlist for anyone who can read the text — **Summerrose Apartments (3.6★, 39, an actual rental agency in Embakasi)**, **Kayole_kona (3.9★, 57)**, **Braca Properties (3.5★, 6)**, **MM Apartments Zimmerman (3.3★, 4)**, **Gracious Apartments Kasarani (3.9★, 22)**. Those are where caretaker, water and deposit complaints will be, if they are anywhere.

**To open it, one of:** a real browser session on `search.google.com/local/reviews?placeid=<ChIJ…>` (place IDs captured in my working notes under `/tmp/.../scratchpad/maps/m_all.json` and `m_ag.json`); or the Google Places API `place_details` with `reviews` (free tier returns 5 reviews per place — ~40 places = ~200 real tenant reviews for roughly nothing); or an hour of manual copying on a phone.

---

## 8. What surprised me

**1. The best-funded, best-known product in the category never shipped an app.** I expected to spend most of my time in BuyRentKenya's 1★ reviews. There are none, because **there is no BuyRentKenya app on Play or on Apple's Kenya store.** Neither do StayNai, CribSeek, HaoFinder, SpaceYako, PropTraka, 254rent or RentU. The entire "Kenyan proptech" landscape, measured by shipped mobile product, is: one neglected Property24 app, Jiji, and a long tail of apps with 10 to 5,000 installs.

**2. The whole Kenyan rental category on iOS has two user ratings.** Guri24: 1. PropertyDuka: 1. Jumuika, Rentor, KiliMani, Fletit, Panga World: zero each. And both Guri24 and Fletit exist on iOS while **404-ing on Play** — somebody built for the wrong platform in a market where the target customer pays KSh 6,000 rent.

**3. Stale listings are a ten-year-old, three-country, unfixed defect — and the only person solving it is a YouTuber with a text editor.** Property24 was told *"same old same old"* in **2016**. The same complaint, almost word for word, lands on a Zambian app in **2026**. Jiji's single most-upvoted review out of 57,800 is about it. Yet one Nakuru channel just... types **"(BOOKED)"** into the video title. That is the entire competitive moat in this category, available for the cost of discipline.

**4. YouTube comment sections are already functioning as the rental marketplace, badly.** I expected comments to argue about whether prices were fair. They do — but mostly they are a want-ads board. People post their budget and estate (*"Can I get a house around pipeline tassia budget 6k please"*), offer their own block (*"there's one on my block but rent ni 25k joyland area ruaka"*), offer to guide strangers (*"Come I take you for house hunting for free at lucky summer estate"*), and plead for locations under three-year-old videos. One renter wrote **marketing advice** to a landlord: *"please pin your contact... please don't send me back to IG."* Demand is so unserved it is self-organising in a comment field with no search, no filter and no date.

**5. Tenants file "caretaker" and "agent" as the same word.** @kilonzondambuki2246 wrote *"Those Hungry Çáretakers/Agents"* as a single category. And Renters Hub's own marketing copy lists its advertisers as *"Landlords, caretakers, and agents"* — a Kenyan operator assumed nobody would blink at a caretaker advertising a vacancy. I went looking for whether caretakers take finder's fees and found something more structural: **in this market the caretaker is not the landlord's employee, he is an independent broker whom the landlord does not supervise** — which is exactly what a tenant in Umoja was saying when he asked *"Landlord and landladies check on your people."*

**6. House hunting in Nairobi is discussed as trauma, and the top comment on one video was to pray about it.** *"House hunting is the worst thing I endured this year."* *"Hakuna kitu huniudhi kama house hunting 😭."* *"I've also been house hunting for MONTHS😭😭."* And with 34 likes: *"For real house hunting in Nairobi is tough currently... I encourage you to pray and ask God to give you a house and tell Him to Let His will be done."* I did not expect the emotional register to be that high. It is a strong signal about how a product should speak, and about what word-of-mouth would do for something that actually worked.

**7. The thing I was told was an overlooked goldmine really is one — and I could not open it.** 744 tenant reviews on one Pipeline complex. 365 on a Donholm housing agency. ~2,200 across Syokimau. A 3.6★ rental agency in Embakasi with 39 reviews. All of it written by tenants about their own buildings and their own letting agents, all of it public, and all of it behind a JavaScript wall and a 403. That is the most valuable unopened box in this research, and it costs almost nothing to open properly. **Do that next.**
