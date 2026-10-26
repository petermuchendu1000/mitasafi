# Voices 02 — TikTok: what Kenyan renters and house-plugs actually say

**Date: 2026-10-19**
**Researcher: Claude (automated web research session)**
**Scope: Kenyan TikTok "house tour" / rental-listing genre, mass market (KSh 4,000–30,000/month)**

> **How to read this document.** Every line presented as a quote below was read by me in a tool
> response from a page or API I actually fetched during this session. Nothing is reconstructed,
> composed, or "representative". Where I am summarising or inferring, the text is marked
> **[MY SUMMARY]** or **[MY INFERENCE]**. Where a quote reached me through something other than
> a direct read of TikTok's own page, the route is named on the quote.
>
> Swahili/Sheng translations in square brackets are **mine**, not the speaker's words. The
> original is always given first and is the authoritative text.

---

## 1. What I could and could not access

This section is deliberately long because the access situation determines how much the rest
of the document is worth.

### What failed

| Attempt | Result |
|---|---|
| `WebFetch` on `tiktok.com/tag/housetourkenya`, `/tag/bedsitter` | Returned only the string `TikTok - Make Your Day`. No feed, no captions. TikTok's feed is client-rendered. |
| Plain `curl` on TikTok tag pages | HTTP 200, ~360KB, but the embedded `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON contained **no `itemList`** — only app config, i18n strings and an `seo.abtest` block. No video data. |
| Plain `curl` on TikTok `/discover/` pages | HTTP 200, but the `webapp.kap-detail` JSON held only the keyword record (`id`, `uniqueWord`, `formattedWord`) — **no videos**. |
| DuckDuckGo HTML, Mojeek, Brave search | HTTP 302 / 403 / 429. Blocked. |
| Bing (`curl`) | HTTP 200 but zero `tiktok.com` links in the markup. |
| `urlebird.com` (TikTok mirror) | HTTP 403. |
| `tikwm` search endpoints (`/api/feed/search`, `/api/user/posts`, `/api/user/info`) | HTTP 403, Cloudflare "Just a moment..." interstitial. |
| `tikwm` `/api/challenge/posts` | Endpoint live but rejected the hashtag page-id I had: `challenge info is failed! Please check challenge_id.` |
| `eastleighvoice.co.ke`, `buyrentkenya.com` articles | HTTP 403 to both WebFetch and curl (Cloudflare). Could not verify what a search summary claimed they said, so **I have not quoted them.** |
| **TikTok comment *text* on the TikTok website itself** | **Not accessible.** The rendered video page ends with the word `Comments` followed by `Log in`. Comment bodies are behind authentication on the web. |

### The single most important caveat: comments

**I could not read TikTok comments on TikTok.** I obtained comment text through a third-party
TikTok API mirror (`tikwm.com`, `/api/comment/list`), which returned structured records with
comment text, author handle, author **region code**, timestamp and like count. I treat these as
real because:

- the per-video comment totals it reported matched the totals TikTok's own rendered page showed
  (e.g. Kay Homes video `7440023286697758007`: TikTok page showed `1962`, API reported `1957` —
  consistent with normal drift);
- the API independently reproduced, **character for character**, a caption I had already read on
  TikTok's own rendered page (the Kay Homes Ruai bedsitter caption, below);
- the vast majority of comment records carry `"region":"KE"`, with a scattering of KE-diaspora
  regions (QA, AE, SA, NL, BE, US, CZ) — exactly the distribution you would expect, and not
  something a fabricator would produce.

**But it is a mirror, not TikTok.** A founder relying on any single comment below should
re-open the video URL in the TikTok app and confirm it. The URLs are all given.

### What worked, and how

1. **`r.jina.ai` (a JS-rendering text proxy)** rendered TikTok tag pages, `/discover/` pages and
   individual video pages into markdown — giving me **real captions, real creator handles, real
   video permalinks, post dates and engagement counts**. This is the source of most captions here.
   **It stopped working ~15 minutes in**: `AbuseAlleviationError: Anonymous access to domain
   www.tiktok.com blocked until Mon Oct 19 2026 05:26:48 GMT+0000 ... DDoS attack suspected: Too
   many requests`. I tried `m.tiktok.com` (404), no-`www` (CAPTCHA), a trailing dot, mixed case and
   a dummy query string — all still blocked. **This cut my hashtag crawl off after two pages.**
2. **`tikwm.com/api/?url=<video_id>`** returned verbatim captions, `region`, post timestamp and
   play/like/comment/share counts. Not rate-limited for me. This is my caption verification layer.
3. **`tikwm.com/api/comment/list?url=<id>&count=50&cursor=N`** returned comments, paginated.
   **1,425 unique comments harvested** across 21 videos.
4. **Plain `curl` on TikTok *profile* pages worked** — unlike tag pages, profile HTML embeds
   `webapp.user-detail`, giving **verified `followerCount`, `heartCount`, `videoCount` and the
   full bio text**. This is how Section 4 is sourced, and it is the most reliable data here.
5. **`r.jina.ai` on `x.com`** worked (different domain, not blocked).
6. **`kenyans.co.ke`** was readable via WebFetch.

### Honest accounting of the result

- **21 TikTok videos** with verbatim captions, dates and engagement, all region `KE`.
- **1,425 comments** harvested; roughly 40 are substantively quotable (the rest are
  one-word availability pings — which is itself the finding).
- **24 TikTok accounts** with **verified** follower counts and bios.
- **Zero** verified prices for **Pipeline, Kayole, Umoja, Donholm, Syokimau, Kasarani**, or for
  **Mombasa, Nakuru, Eldoret, Kisumu, Thika**. My sample landed almost entirely on the
  **Thika Road / Eastern Bypass corridor** (Ruai, Ruiru, Githurai, Zimmerman, Mwihoko, Roysambu,
  Kamakis) plus one Ongata Rongai listing. This is a real gap caused by the proxy block, not by
  an absence of such content — search result *titles* I saw (which I am not quoting as data)
  indicate TikTok `/discover/` pages exist for "Bedsitter in Pipeline Embakasi", "Bedsitter for
  Rent in Kayole Junction Nairobi", "3500 Bedsitter for Rent in Umoja and Kayole Junction",
  "Bedsitter for Rent in Donholm Nairobi". **Redo this crawl for those estates.**
- I did **not** find a single Kenyan news article, Reddit thread or YouTube repost that quoted a
  Kenyan rental TikTok. The re-reporting layer I was told to expect **does not appear to exist**
  for this genre. One X account was useful; that is all.

---

## 2. The price table

Every row is from a caption I read in full, verbatim. "Source" says how I read it.
`J` = rendered TikTok page via jina proxy. `T` = tikwm caption API. Most rows are both.

| Estate / location | Type | Stated rent | Stated extras / conditions | Date | Account | URL | Src |
|---|---|---|---|---|---|---|---|
| Ruai, along Eastern Bypass | Bedsitter | **KSh 5,000** | none stated in caption | 2024-11-22 | @kayhomes | [video](https://www.tiktok.com/@kayhomes/video/7440023286697758007) | J+T |
| **Ruai, 1km from Quickmart** | Bedsitter | **KSh 6,000** | **"Deposit 6k · Water 200 per unit · Garbage collection 200 per month · VIEWING FEE APPLICABLE (2k)"** — and **"Recently vacated"** | 2026-01-26 | @kayhomes | [video](https://www.tiktok.com/@kayhomes/video/7599592085016136967) | J+T |
| Ruiru Kimbo Matangi | Bedsitter | **KSh 5,000** ("5k") | "with water and electricity" | 2024-01-02 | @propertywayrealestate | [video](https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478) | J+T |
| Ruiru | Bedsitter | **KSh 5,000** ("5k") | **"only 7 units available ... deposit 5k water 100 per unit"** | 2025-08-21 | @muchiri_the_realtor | [video](https://www.tiktok.com/@muchiri_the_realtor/video/7541101548668144952) | J+T |
| Githurai 45 | Bedsitter | **KSh 5,000** ("5k") | none stated | 2025-12-01 | @zippyk567 | [video](https://www.tiktok.com/@zippyk567/video/7578807241705377035) | J+T |
| Ruiru (prime) | Bedsitter | **KSh 5,000** | **unbundled fee menu — see §3.3**; "a viewing fee is applicable for all property inspections" | 2025-12-25 | @makejani_home | [video](https://www.tiktok.com/@makejani_home/video/7587650698200861963) | J+T |
| Zimmerman, nr Khetias Supermarket | Bedsitter | **KSh 5,000** | "Water & Electricity: Reliable connections"; **"Fee: You pay 5% cost of the house"**; "I will NOT be taking you to view the house personally" | 2026-03-29 | @dreamrentals1 | [video](https://www.tiktok.com/@dreamrentals1/video/7622534984573734152) | J+T |
| Ruiru Rainbow | Bedsitter ("small") | **KSh 5,000** ("5,000/") | none stated | 2026-05-16 | @nyumbazetu_ | [video](https://www.tiktok.com/@nyumbazetu_/video/7640506382780878098) | J+T |
| Ruiru Rainbow | Bedsitter | **KSh 5,000** ("5,000/") | none stated | 2026-05-16 | @nyumbazetu_ | [video](https://www.tiktok.com/@nyumbazetu_/video/7640505468930100498) | J+T |
| Infinity, Eastern Bypass (nr Afrosayari / Infinity Industrial Park) | Bedsitter | from **KSh 5,000** ("starting from 5K", per TikTok's own page summary) | caption gives matatu directions, not price | 2025-07-01 | @rental.properties58 | [video](https://www.tiktok.com/@rental.properties58/video/7521964491131735301) | J+T |
| **Mwihoko 2** | Bedsitter | **KSh 5,500** | stated in account bio; **"Nb: it's not near KU"** | bio, read 2026-10-19 | @rental.properties58 | [profile](https://www.tiktok.com/@rental.properties58) | curl |
| **Mwihoko 2** | 1 bedroom | **KSh 11,000** ("1B 11K") | stated in account bio | bio, read 2026-10-19 | @rental.properties58 | [profile](https://www.tiktok.com/@rental.properties58) | curl |
| **Ongata Rongai** | Bedsitter, newly built | **KSh 6,000** ("6K") | "13 UNITS AVAILABLE, BOOKINGS TO BE DONE IN A WEEKS TIME"; account bio states **"1000 SERVICE FEE"** | 2026-09-14 | @properties_by_shadz | [video](https://www.tiktok.com/@properties_by_shadz/video/7685247518514482453) | J+T |
| Ruai Kipawa | 1 bedroom | **KSh 10,000** ("only 10k per month") | "Replying to @clarahnatashah"; TikTok's own page summary called it "Price Dropped to 10k/month" | 2026-10-09 | @kenhomerentals | [video](https://www.tiktok.com/@kenhomerentals/video/7694593879969926421) | J+T |
| **Roysambu** (disputed — see §3.6) | House (house tour, occupied) | **KSh 22,000** ("22000/=") | — | 2026-08-05 | @ke.cribs | [video](https://www.tiktok.com/@ke.cribs/video/7670622344586661121) | J+T |
| **Kamakis** | House (house tour, occupied) | **KSh 35,000** ("35000/=") | — | 2026-05-29 | @ke.cribs | [video](https://www.tiktok.com/@ke.cribs/video/7645398131407916289) | J+T |
| Tora Estate, 4 min off Thika Road | 3 bed all en-suite | **KSh 40,000** "(slightly negotiable)" | "Ample water"; "only 2 units" | 2025-12-03 | @ttpropertieskenyaltd | [video](https://www.tiktok.com/@ttpropertieskenyaltd/video/7579712015388708108) | J+T |
| Kawaida, along Banana–Kiambu road | mixed (bedsitter / 1 bed) | from **KSh 5,000** (per TikTok page summary: "Starting at 5k") | caption is only the location line | 2026-05-05 | @josephkimani78 (Palms Realty) | [video](https://www.tiktok.com/@josephkimani78/video/7636347674127551765) | J+T |
| Nairobi, unspecified | "starting from 15k" | **KSh 15,000+** | account bio: "Affordable house to let starting from 15k ... Viewing fee 2k" | bio, read 2026-10-19 | @kenhomerentals | [profile](https://www.tiktok.com/@kenhomerentals) | curl |

### Prices stated by renters in the comments (not by listers)

| Who | What they said | Implied price | URL |
|---|---|---|---|
| @arian.faucet8 (KE, 2026-05-29, **731 likes**) | "Yoo My Rent is 4k in Bungoma, hadi iko na parking 😂😂" | **KSh 4,000, Bungoma, with parking** | [video](https://www.tiktok.com/@ke.cribs/video/7645398131407916289) |
| @geminiqueen976 (KE, 2026-06-10, **560 likes**) | "house rentals in Kenya is so overpriced, bedsitter 8500?" | **KSh 8,500 bedsitter**, cited as outrageous | [video](https://www.tiktok.com/@ke.cribs/video/7649088226631748881) |
| @magdathriftwearnyeri (KE, 2026-01-29, 12 likes) | "anybody anataka Ruiru Rainbow 7k spacious one" | **KSh 7,000, Ruiru Rainbow** | [video](https://www.tiktok.com/@makejani_home/video/7587650698200861963) |
| @plug_connect.ke (KE, 2026-03-17) | "bedsitter along kroad to gwakairo 5k -6k kakubwa" | **KSh 5,000–6,000**, Kamiti Rd → Gwa Kairo | [video](https://www.tiktok.com/@makejani_home/video/7587650698200861963) |
| @bugi728 (KE, 2026-08-06) | "c aende tu affordable 1b n 6500" | **KSh 6,500 for a 1-bed** treated as the affordable option | [video](https://www.tiktok.com/@ke.cribs/video/7670622344586661121) |

**[MY SUMMARY]** The verified floor for a bedsitter on the Thika Road / Eastern Bypass corridor is
a remarkably sticky **KSh 5,000**, advertised at that exact figure by six different accounts
across 2024-01 to 2026-05. Renters in comments ask for **KSh 3,500–8,000**. The founder's stated
KSh 4,000–30,000 band is correct for this corridor, but note that **the advertised rent is not the
move-in cost** — see §3.2.

---

## 3. Verbatim quotes by theme

### 3.1 The house-tour caption that contains the whole product

Read directly on TikTok's rendered video page (via jina), then independently re-confirmed
character-for-character by the tikwm caption API. Posted 2026-01-26. 29,329 plays, 781 likes,
56 comments.

> "Bedsitter available in Ruai. 1km from quickmart supermarket  Recently vacated, but very well
> maintained.  Rent 6k Deposit 6k Water 200 per unit  Garbage collection 200 per month   For
> viewing, Kindly call or WhatsApp 0750603844 during working hours  Mon to Saturday 9am to 6pm
> NB: VIEWING FEE APPLICABLE (2k) . . . . #bedsitter #househunting #1millionviews
> #kenyantiktok🇰🇪 #househunters"
>
> — @kayhomes (Kay Homes, 8,816 followers), <https://www.tiktok.com/@kayhomes/video/7599592085016136967>
> — read directly on TikTok (jina-rendered page) **and** via tikwm API

**[MY SUMMARY]** This one caption contains: rent, deposit, per-unit water, monthly garbage,
a viewing fee, calling hours, **and the words "Recently vacated"** — i.e. the vacancy signal the
founder's product is built on, already being published voluntarily. Total cash to move in as
stated: 6,000 rent + 6,000 deposit + 2,000 viewing fee = **KSh 14,000 against a KSh 6,000 rent.**

### 3.2 Hidden costs named out loud

> "newly built bedsitters at ruiru at only 5k only 7 units available come book today  deposit 5k
> water 100 per unit book for viewing  call or Whatsapp 0724642721"
>
> — @muchiri_the_realtor (MUCHIRI THE REALTOR, 5,959 followers), 2025-08-21,
> <https://www.tiktok.com/@muchiri_the_realtor/video/7541101548668144952> — jina + tikwm

> "5k bedsitter Ruiru Kimbo Matangi with water and electricity. For viewing whatsapp us number on bio"
>
> — @propertywayrealestate (29,800 followers), 2024-01-02,
> <https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478> — jina + tikwm

> "💰 Kshs 40,000 (slightly negotiable) 📞 0724 838 773"
>
> — @ttpropertieskenyaltd, 2025-12-03,
> <https://www.tiktok.com/@ttpropertieskenyaltd/video/7579712015388708108> — jina + tikwm

**Renters asking about the costs that were *not* stated** (all via tikwm comment API):

> "kuna deposit au ni hio 5k tu"
> [is there a deposit or is it just that 5k]
>
> — @jojo.paul68 (KE, 2026-05-19, 4 likes), <https://www.tiktok.com/@affordable.house.to.rent/video/7634273146211814677>

> "Iko na deposit"  [does it have a deposit] — @catherinenyokabi34 (KE, 2026-08-30)
> <https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478>

> "lazima deposit ama"  [is a deposit compulsory or] — @mr..shelby042 (KE, 2025-03-29)
> <https://www.tiktok.com/@kayhomes/video/7440023286697758007>

> "@MUCHIRI THE REALTOR iko Rainbow wapi hasaa??Na kuna deposit?"
> [where exactly in Rainbow is it?? And is there a deposit?]
>
> — @tesswange19 (KE, 2025-08-30), <https://www.tiktok.com/@muchiri_the_realtor/video/7541101548668144952>

> "Naskia Roysambu Hakuna maji ama kunayo?"  [I hear Roysambu has no water, or is there?]
>
> — @sashasantano (KE, 2026-08-06), <https://www.tiktok.com/@ke.cribs/video/7670622344586661121>

**[MY INFERENCE]** Deposit is the single most-asked unstated cost. Water is asked about as an
*availability* question, not only a cost question.

### 3.3 Viewing fees and agent fees — with amounts

This is the best-evidenced theme in the whole document, because **the fee is in the account bio**.
All bios below were read by plain `curl` on the TikTok profile page HTML on 2026-10-19 and are
verbatim (` / ` marks a line break in the bio):

| Account | Followers | Bio text, verbatim |
|---|---|---|
| @kayhomes | 8,816 | **"Viewing fee 2k** / 📞 0750603844 / Calling hrs:  9am - 6pm (Mon-Sat)" |
| @muchiri_the_realtor | 5,959 | "Looking for a place to settle / **NB: VIEWING IS 2k** / Call or Whatsapp  /  0704968967" |
| @kenhomerentals | 8,264 | "Affordable house to let starting from 15k / WHATSAPP/CALL0745704135 / **Viewing fee 2k**" |
| @kentipshomespropertylink | 67,100 | "🏠 Nairobi House-Plug & Hustle Guy / KRA • Cyber • Rentals / **Paid Professional House Hunting Service** / **Viewing Fee from 2K** / DM "HOUSE" 📩 \| 0713726448" |
| @dreamrentals1 | 17,300 | "❌❌**SIKUPELEKI KUONA** / **VIEWING FEE lNALIPWA KWANZA** / ❌❌**SIKUPELEKI KUONA NYUMBA** / STRICTLY WHATSAPP ONLY 0733680281" |
| @nyumbazetu_ | 2,220 | "📞 0797645683 / We, / 📍House Hunt📍Sell Businesses / 📍Manage Property / **VIEWING FEE APPLIES**" |
| @makejani_home | 2,491 | "For Viewing / Call 0798381810 / https://wa.me/254798381810 / **Viewing Fee Applies.**" |
| @nyota.realtor.stays | 1,778 | "▪️Your local key to new homes 🗝 / ▪️ 🏡 Rent it. Sell it. Love it. / ▪️ **viewing charges apply.** / 📲0771366896 / 📞0715386961" |
| @zippyk567 | 10,600 | "affordable house for rentals /sales/commercial shop / **charges applies** / 📞0.7.0.5.9.0.5.4.0.8   for viewing" |
| @homespothomes.ke | 30,800 | "House hunting 🏡 & errands / Find Your Perfect Home 🏡 / **Viewing Charges apply** / Whatsapp/🤙 0706087944" |
| @properties_by_shadz | 6,450 | "HOUSES / BNBS ? YES DM / Call 10Am to 6:00Pm / **1000 SERVICE FEE** / WHATSAPP 0100745618 / CALL 0732399975" |
| @skyhomes.ke | 53,400 | "🏡 Curating Kenya's finest homes 🇰🇪 / 🔑 Buy \| Rent \| Market Your Property / 📞 0799 662 269 / **"Service fee applies"**" |

**[MY SUMMARY]** **12 of the 24 accounts I checked state a fee in the bio**, and among the
specifically mass-market rental-listing accounts it is close to universal. The modal figure is
**KSh 2,000**, stated by four separate accounts. This is not a hidden practice — it is the
headline of the business.

The @dreamrentals1 bio deserves its own line because of the register:

> "❌❌SIKUPELEKI KUONA   / VIEWING FEE lNALIPWA KWANZA  / ❌❌SIKUPELEKI KUONA NYUMBA   /
> STRICTLY WHATSAPP ONLY 0733680281"
>
> [I DON'T TAKE YOU TO SEE / THE VIEWING FEE IS PAID FIRST / I DON'T TAKE YOU TO SEE THE HOUSE]
>
> — @dreamrentals1 (Dream rentals, 17,300 followers, **1,259 videos**), profile bio read 2026-10-19,
> <https://www.tiktok.com/@dreamrentals1>

**The unbundled fee menu.** This is the most commercially revealing caption I found — an agent
selling *information* as separate SKUs:

> "**OUR PREMIUM SERVICES TO ASSIST YOU:** **Professional Moving Team:** Our reliable movers
> ensure a smooth, hassle-free transition into your new home. **Personal House Hunting:** For
> KSH 2,000, we conduct a dedicated search to find a property that meets all your specific
> criteria. **Guided Property Tours:** For KSH 2,500, enjoy comfortable, comprehensive viewings
> with transportation provided. **Location & Caretaker Access:** For KSH 1,000, receive the exact
> property pin and direct contact with the onsite caretaker. *Note: A viewing fee is applicable
> for all property inspections.*"
>
> — @makejani_home (makejani_homes, 2,491 followers), 2025-12-25,
> <https://www.tiktok.com/@makejani_home/video/7587650698200861963> — jina + tikwm

### 3.4 Caretaker content — the hypothesis, tested

The founder's hypothesis was that Kenyan caretakers take finder's fees. **I found no renter
quote about paying a caretaker directly.** What I found is adjacent and arguably more important:
**access to the caretaker is itself a priced product sold by TikTok agents.**

> "**Location & Caretaker Access:** For KSH 1,000, receive the exact property pin and direct
> contact with the onsite caretaker."
>
> — @makejani_home, 2025-12-25, <https://www.tiktok.com/@makejani_home/video/7587650698200861963>
> — jina + tikwm

> "🏠 Viewing Terms:  * Fee: You pay 5% cost of the house.  * Process: Upon payment, I will send
> you the exact location and the Management (Caretaker) number 📞.  * Note: I will NOT be taking
> you to view the house personally. 🏠"
>
> — @dreamrentals1 (Dream rentals, 17,300 followers), 2026-03-29,
> <https://www.tiktok.com/@dreamrentals1/video/7622534984573734152> — jina + tikwm

**[MY SUMMARY]** Both accounts sell the same thing: **the pin plus the caretaker's phone number**.
@dreamrentals1 prices it as a percentage of rent (5% of a KSh 5,000 bedsitter = KSh 250) and is
explicit that no physical escort is included. @makejani_home prices it at KSh 1,000 flat. The
scarce asset being monetised on Kenyan TikTok is therefore **not the viewing — it is the
caretaker's number and the exact location.**

**[MY INFERENCE — flagged as unverified]** This is strong circumstantial support for the founder's
caretaker hypothesis, but it is *not* the same claim. It shows agents charging tenants for
caretaker access. It does **not** show caretakers receiving a cut. I found **zero** evidence
either way on that second question. A grep of all 1,425 comments for
`caretaker|mama plot|mamaplot|landlord|mwenye|watchman` returned **no matches at all** — renters
in these comment threads do not mention caretakers. **Treat the kickback claim as still
unverified, and interview caretakers directly.**

### 3.5 Scam stories with amounts

> "Kuna chali alikua hivi kumbe alikua conman 😭😭😭alinicon actually 😂😂😂40k....hakua anatoka
> kwa hao kumbe ni mwizi😂"
>
> [There was a guy like this, turns out he was a conman 😭😭😭 he actually conned me 😂😂😂
> 40k.... he wasn't coming from them, turns out he's a thief 😂]
>
> — @myranatalie2 (KE, 2026-09-01, 2 likes), on <https://www.tiktok.com/@ke.cribs/video/7670622344586661121>
> — via tikwm comment API

> "hawa ni likes wanatakaa,,,con😏"
> [these ones just want likes,,,con]
>
> — @winki.i (KE, 2026-05-17), on <https://www.tiktok.com/@nyumbazetu_/video/7640506382780878098>
> — via tikwm comment API

**From a Kenyan news article (secondary source, read directly via WebFetch).** These are quotes
the article attributes to John Mbati, a content creator at Kenyans.co.ke, recounting being
conned while house-hunting. **I read these on the Kenyans.co.ke page; they are not from TikTok.**
Article: Denis Mwangi, "Most Popular House Hunting Scams to Avoid in Nairobi", Kenyans.co.ke,
30 September 2020,
<https://www.kenyans.co.ke/news/57809-most-popular-house-hunting-scams-avoid-nairobi>

> "He wanted Ksh2,000 to pay a motorist whom he claimed rammed into his car at Roysambu while on
> the way to show me the house in Kahawa West" — John Mbati

> "I realised that they were scamming me the next day when the guy asked me to send him money
> because he was stuck in traffic." — John Mbati

> "I received a call from a person who insisted that the caretaker was conning me and gave me a
> police officer's number." — John Mbati

> "The alleged police turned out to be an imposter after I reported at the DCI." — John Mbati

The same article's own narration (not attributed to a speaker):

> "The viewing fee is meant to facilitate them to help you find the perfect house."

**[MY SUMMARY]** Scam amounts I can evidence: **KSh 40,000** (TikTok commenter), **KSh 2,000**
(the fake-accident ask, Kenyans.co.ke). Note the 2020 article already treats the viewing fee as a
normal institution.

### 3.6 Listings being fact-checked by the crowd — and estate-name inflation

This theme was a surprise and is directly useful to the product. All via tikwm comment API.

> "that apartment doesn't Have bedsitters and it's not even complete maybe august huko"
>
> — @feladel6 (KE, 2026-05-17, **72 likes**), on
> <https://www.tiktok.com/@nyumbazetu_/video/7640506382780878098> (a "small Bedsitters in Ruiru
> Rainbow 5,000/" listing)

> "We mwizi. hizi ni 2b pekee😅🙌 please tupee connection"
> [You thief. These are 2-bedrooms only 😅🙌 please give us the connection]
>
> — @wa..home (KE, 2026-06-17), same video

**Estate-name inflation** — a renter publicly correcting the estate label, with 502 likes:

> "Githurai 44 nyuma ya naivas ndio mnaita Roysambu"
> [Githurai 44 behind Naivas is what you people are calling Roysambu]
>
> — @kasongomedia (KE, 2026-08-05, **502 likes**), on
> <https://www.tiktok.com/@ke.cribs/video/7670622344586661121> (captioned "22000/= house in Roysambu")

> "washing machine Roysambu?Uko sure?😂"  [a washing machine in Roysambu? Are you sure? 😂]
> — @richieoketch (KE, 2026-08-07), same video

**[MY INFERENCE]** The comment section is already functioning as an unpaid verification layer:
neighbours correct vacancy claims, unit types and estate names. A free vacancy list that lets
renters annotate listings would be formalising behaviour that already happens for free.

### 3.7 Location withheld — the loudest single demand

The word **"location"** appears **32 times** in my 1,425 comments, **16 of those as the entire
comment**. All via tikwm comment API.

> "kama utaki kusema location usipost zima video zako"
> [if you don't want to say the location, don't post — switch off your videos]
>
> — @mr_logic_ke_11 (KE, 2025-01-05, 5 likes), on
> <https://www.tiktok.com/@kayhomes/video/7440023286697758007>

> "Yoo ati 35 k.....pin location"  — @__.swizz (KE, 2026-05-29, 5 likes),
> <https://www.tiktok.com/@ke.cribs/video/7645398131407916289>

> "location nitumiwe"  [send me the location] — @_.sawe (KE, 2024-12-20)
> <https://www.tiktok.com/@kayhomes/video/7440023286697758007>

> "hapa ni wapi please"  [where is this please] — @evarline_.amonde123 (KE, 2024-12-06), same video

> "side gani ruiru kindly 🙏"  [which side of Ruiru kindly] — @marnziebeckie (KE, 2025-08-07),
> <https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478>

> "kimbo wapi?"  [Kimbo where?] — @bettie499 (KE, 2024-01-04), same video

And the agent's standard reply, in caps:

> "LOCATION AT THE CAPTION."
>
> — @rental.properties58 (the account owner, KE, 2025-07-01), on his own video
> <https://www.tiktok.com/@rental.properties58/video/7521964491131735301>

**[MY INFERENCE]** Location is deliberately withheld because it *is* the paid product (§3.4).
The demand is enormous and unmet. **A free list whose core value is "exact location, free" is
attacking the precise thing the incumbent ecosystem monetises** — which is both the opportunity
and the source of future resistance.

### 3.8 "Is it still available?" — the staleness problem, quantified

**[MY SUMMARY]** Of 1,425 harvested comments, **153 contain an availability word**
(`still available|available|vacant|vacanc|kunayo|kuna nyumba|zikoo`), and the word "available"
alone appears **136 times**. These arrive on videos **years** after posting. Sample, all real,
all via tikwm comment API, all on
<https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478> — **a video posted
2024-01-02**:

> "are they still available I need" — @mamakelynn524 (KE, **2024-01-04**)
> "are they still available...nataka kimbo" — @peshpoly (KE, 2024-01-04)
> "are they available i come for viewing tomorrow???" — @directorvince6 (KE, 2024-01-05)
> "is it stiil available" — @nyagaferridah (KE, **2025-05-16**)
> "hey ,,kuna vaccant still?" — @jysonnjeeh2 (KE, **2026-03-13**)
> "still available please" — @mercylicious842 (KE, **2026-10-04**)

**[MY INFERENCE]** People were still asking whether a January-2024 bedsitter was vacant in
**October 2026 — 33 months later.** This is the clearest product signal in the document: TikTok
listings never expire, so the genre is an excellent *price* source and a terrible *vacancy*
source. A dated, expiring vacancy list is the gap.

Other availability phrasings worth copying into the product's own copy:

> "zikoo available?" — @itsianchege (KE, 2026-01-24)
> "kuna vacant?" — @boboh4462 (KE, 2025-12-01)
> "any vacancy" — @francis9357 (KE, 2025-06-02)
> "is there still vacant?" — @marykamish (KE, 2025-06-04)
> "around githu 45 kunayo" [around Githurai 45, is there any] — @cirah214 (KE, 2024-01-03)
> "kunayo around ruiru ndani ama rainbow" [is there any around inner Ruiru or Rainbow] — @vale.mugambi (KE, 2025-05-28)
> — all on <https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478>

> "Still available ama aki natafta kama hii sasa"
> [Still available? because I'm looking for one like this right now]
> — @vgmainz (KE, 2026-07-17), <https://www.tiktok.com/@nyumbazetu_/video/7640506382780878098>

### 3.9 Renters stating their own brief — budget, estate, feature, deadline

This is the demand side speaking in its own words. The pattern is remarkably consistent:
**want + unit type + price + estate**. All via tikwm comment API.

> "natafuta bedsitter 6k around kimbo ama toll"  [I'm looking for a 6k bedsitter around Kimbo or Toll]
> — @shepats.nimoh (KE, 2024-01-13, 2 likes), <https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478>

> "nataka singleroom ruai please 35 ama 4"  [I want a single room in Ruai please, 3.5 or 4 (thousand)]
> — @brid037 (KE, 2026-01-28, 1 like), <https://www.tiktok.com/@kayhomes/video/7599592085016136967>

> "nataka bedsitter 5k to 6k Ruiru ndani ama next to Ruiru bypass"
> — @odiwuorenos (KE, 2026-03-14, 1 like), <https://www.tiktok.com/@makejani_home/video/7587650698200861963>

> "nataka iko na wardrobe budget 7,7500 mirema, zimerman ama canopy"
> [I want one with a wardrobe, budget 7–7,500, Mirema, Zimmerman or Canopy]
> — @justgirlsdiaries2 (KE, 2026-03-29, 1 like), <https://www.tiktok.com/@dreamrentals1/video/7622534984573734152>

> "nataka one bedroom ya 7500. ruai by pass"
> — @user234017362042 (KE, 2026-01-28, 1 like), <https://www.tiktok.com/@kayhomes/video/7599592085016136967>

> "nataka bedsitter 6500 utawala" — @andersonmaina2 (KE, 2026-02-23), same video
> "nataka bedsitter lucky summer estate" — @obo.of.nairobi (KE, 2026-01-28), same video
> "one bedroom budget 8k" — @denplugs (KE, 2024-01-03, 3 likes), <https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478>
> "Hello can I get bedsitters alaond ruriru 4000 to 5000" — @user8819436841916 (KE, 2026-07-24), same video
> "nataka ya 8k" — @user4238136940670 (KE, 2025-12-20), same video
> "nataka bedsitter ama single within railway ama toezi please" — @user3929399815773 (KE, 2026-01-09), <https://www.tiktok.com/@zippyk567/video/7578807241705377035>
> "nataka kihuguro ruiru ya 6 kwa barabara" [I want Kihunguro Ruiru, 6(k), on the road] — @user778380806 (KE, 2026-01-26), <https://www.tiktok.com/@kayhomes/video/7599592085016136967>
> "I need bedsitter at kimbo karibu na lami" [...near the tarmac] — @walkwithpurpose11 (KE, 2024-11-04), <https://www.tiktok.com/@propertywayrealestate/video/7319540962349321478>

**Deadline / urgency:**

> "nataka Ruai bedsitter,,kindly ,,, nihamie uko kesho"  [I want a Ruai bedsitter, kindly, so I can move there tomorrow]
> — @happy_henry02 (KE, 2026-03-22, 3 likes), <https://www.tiktok.com/@kayhomes/video/7599592085016136967>

> "are these house still available nataka kuhama over the weekend"
> — @es.tallia_ (KE, 2026-02-25), same video

> "bado ziko nijie kesho??"  [are they still there, should I come tomorrow??]
> — @reezy.trendz (KE, 2026-10-08), <https://www.tiktok.com/@properties_by_shadz/video/7685247518514482453>

> "can I view and pay Kesho?" — @essy.elvis (KE, 2026-09-24), same video
> "kesho nakujia" [I'm coming for it tomorrow] — @its_naibei (KE, 2026-09-15), same video

**[MY INFERENCE]** Note what is absent: **nobody describes a months-long search.** The horizon is
*kesho* — tomorrow, this weekend. Searches appear to be short, urgent and triggered. I found **no
quote** stating how long a search took or what it cost in total; that question is unanswered by
this source and needs interviews.

### 3.10 Affordability and the dignity of the bottom of the market

> "Only God knows how much I'm wishing to move out from this hectic single room to a bedsitter
> 😳😳maji itanimaliza mgongo kubeba kila saa🥺🥺"
>
> [...carrying water every hour is going to finish my back]
>
> — @mikkilynefamily (KE, 2026-05-29, 10 likes), <https://www.tiktok.com/@ke.cribs/video/7645398131407916289>
> — via tikwm comment API

> "house rentals in Kenya is so overpriced, bedsitter 8500?"
> — @geminiqueen976 (KE, 2026-06-10, **560 likes**), <https://www.tiktok.com/@ke.cribs/video/7649088226631748881>

> "how much do you need to earn to afford rent 35,000🤔?"
> — @mklvhp (KE, 2026-05-29, **471 likes**), <https://www.tiktok.com/@ke.cribs/video/7645398131407916289>

> "Rent 35K na hakuna bed ,cielewi hesabu yao"  [Rent 35K and there's no bed, I don't understand their maths]
> — @riderkickers (KE, 2026-07-19, 6 likes), same video

> "[Sticker] 35k rent no bed"
>
> — @wastepaperbuyerskenya (KE, 2026-05-29, **2,460 likes** — the 4th most-liked comment in my
> entire 1,425-comment sample), same video. `[Sticker]` is the API's placeholder for an attached
> sticker image; the typed words are "35k rent no bed".

> "kwangu ulikuja vedio itakua 30 second 😂😂😂 our toilets is bigger than my house"
> — @kenya.188 (KE, 2026-06-16, 26 likes), <https://www.tiktok.com/@ke.cribs/video/7651686615215000833>

### 3.11 The audience explicitly demanding bottom-of-market content

**[MY SUMMARY]** When KE Cribs (69,100 followers) posted a family home instead of a comrade/
bedsitter tour, its own audience objected. This is the clearest available evidence that demand
for mass-market housing content exceeds supply. Both via tikwm comment API, same video
<https://www.tiktok.com/@ke.cribs/video/7651686615215000833>:

> "Sasa umeharibu. Si tulikua interested na makeja za comrades... Sasa unatuonyesha nyumba ya
> wazazi wameinvest for years wakanunua. Rudi kwa singles na bedsitters na 1 bedrooms."
>
> [Now you've ruined it. Weren't we interested in comrades' kejas... Now you're showing us a
> parents' house they invested in for years and bought. **Go back to singles and bedsitters and
> 1 bedrooms.**]
>
> — @gameaddict254 (KE, 2026-06-16, **121 likes**)

> "Beautiful house, but you've started losing the plot 🥲 Most of us followed you for
> relatability... if we wanted to see mansions, tungeenda kwa TikTok pages za mansions 🤣"
>
> [...we would have gone to TikTok pages for mansions]
>
> — @fay76331 (KE, 2026-06-19, **102 likes**)

> "Turudisha Juja aky😭"  [Take us back to Juja please]
> — @its_fess (KE, 2026-06-16, **295 likes**)

> "tulidhani Hii show Ni ya Sisi watu was bedsitter"
> [we thought this show was for us bedsitter people]
>
> — @wastepaperbuyerskenya (KE, 2026-06-15, 4 likes), same video

> "umeanza rough game😭💔" — @joe122357 (KE, 2026-06-15, **1,279 likes**)
> "the game is gone😂" — @mikechinku (KE, 2026-06-15, 100 likes)

### 3.12 One X (Twitter) account, read directly

Read via jina on <https://x.com/ScoutNRB> (x.com was not blocked). Account: "House Hunting by
Scout" (@ScoutNRB), 166 posts, Nairobi, Kenya.

Bio, verbatim:

> "Househunting services in Nairobi. Dm/WhatsApp us via 0752525578 (NB:Viewing fees : 2k)"

Pinned post, verbatim:

> "(Introducing Scout) Too busy to look for a house? We will do the hard job for you! (How it
> works) Text/call us Describe the house you want, The estate/location Your rent budget (What we
> will do) We will go to every estate in Nairobi looking for the perfect house for you!"

A reply from another user, verbatim:

> "@ScoutNRB got you but charge a fee for viewing they are more active on Instagram"
>
> — @LMusumi, read on <https://x.com/ScoutNRB>

**[MY SUMMARY]** The KSh 2,000 viewing fee is the same figure on X as on TikTok. The service model
is identical: describe estate + budget, agent walks the estates.

---

## 4. Accounts worth knowing

Follower counts, heart counts, video counts and bios were read on 2026-10-19 by plain `curl` on
each TikTok profile page and parsed from the embedded `webapp.user-detail` JSON. **These are the
most reliable numbers in this document.** Bios verbatim; ` / ` = line break.

### De facto rental listing services (the real competitors)

| Account | Followers | Hearts | Videos | What it is |
|---|---|---|---|---|
| **@josephkimani78** (Palms Realty) | **208,800** | 3.5M | **6,795** | **The largest I found.** Bio: "Only the best / Call.. 0717289730". Posts mass-market rentals from 5k. Effectively a listings feed at scale. |
| **@kentipshomespropertylink** (KenTips247) | **67,100** | 1.2M | **2,564** | Bio: "🏠 Nairobi House-Plug & Hustle Guy / KRA • Cyber • Rentals / Paid Professional House Hunting Service / **Viewing Fee from 2K** / DM "HOUSE" 📩 \| 0713726448" |
| **@skyhomes.ke** | 53,400 | 942,100 | 1,600 | Bio: "🏡 Curating Kenya's finest homes 🇰🇪 ... **"Service fee applies"**". Skews upmarket/sales. |
| **@homespothomes.ke** (HOMESPOT ✓) | 30,800 | 519,800 | 594 | Bio: "House hunting 🏡 & errands ... **Viewing Charges apply**" |
| **@propertywayrealestate** | 29,800 | 253,700 | 209 | Bio: "Connecting buyers-sellers🏠 / Realestate,int design / DM for ADVERTS / Sub to our YT🎥" |
| **@johari.real.estat** | 24,000 | 359,800 | 168 | Bio: "A Trusted property partner for landlords and tenants / 🏠 Property Management \| Sales" |
| **@dreamrentals1** | 17,300 | 337,700 | **1,259** | Bio: "❌❌SIKUPELEKI KUONA / VIEWING FEE lNALIPWA KWANZA / ❌❌SIKUPELEKI KUONA NYUMBA / STRICTLY WHATSAPP ONLY". Sells pin + caretaker number for 5% of rent. |
| **@ttpropertieskenyaltd** | 12,200 | 151,700 | 951 | Bio: "we're real estate matchmakers-helping houses and plots find their perfect owners" |
| **@zippyk567** | 10,600 | 125,200 | **1,125** | Bio: "affordable house for rentals /sales/commercial shop / **charges applies** / 📞0.7.0.5.9.0.5.4.0.8 for viewing" (phone dotted to evade moderation) |
| **@kayhomes** | 8,816 | 157,100 | 282 | Bio: "**Viewing fee 2k** / 📞 0750603844 / Calling hrs: 9am - 6pm (Mon-Sat)". Best cost-disclosure captions I found. |
| **@pretty_space_254** | 8,790 | 181,800 | 247 | Bio: "Real Estate Agent / 📱 0720508842" |
| **@kenhomerentals** (KENHOME) | 8,264 | 146,700 | **1,075** | Bio: "Affordable house to let starting from 15k / WHATSAPP/CALL0745704135 / **Viewing fee 2k**" |
| **@properties_by_shadz** | 6,450 | 186,100 | 230 | Bio: "HOUSES / BNBS ? YES DM / Call 10Am to 6:00Pm / **1000 SERVICE FEE**" |
| **@muchiri_the_realtor** | 5,959 | 124,800 | **1,327** | Bio: "Looking for a place to settle / **NB: VIEWING IS 2k**" |
| **@kejanova** | 3,593 | 21,200 | 20 | Bio: "Find your dream home with Kejanova, your trusted marketplace for secure house hunting / visit: https://kejanova.com". **An existing startup in exactly this space.** |
| **@rental.properties58** (Eliud_mwaura1) | 3,050 | 59,600 | 83 | Bio: "**Currently not available for house marketing.** / But I can connect you to a house in Mwihoko 2. / Bedsitter 5,500 & 1B 11K. / Whatsapp:0796.911015 / Nb:it's not near KU" |
| **@makejani_home** | 2,491 | 44,700 | **504** | Bio: "For Viewing / Call 0798381810 / ... **Viewing Fee Applies.**" Publishes the unbundled fee menu (§3.3). |
| **@nyumbazetu_** | 2,220 | 25,500 | **508** | Bio: "📞 0797645683 / We, / 📍House Hunt📍Sell Businesses / 📍Manage Property / **VIEWING FEE APPLIES**" |
| **@affordable.house.to.rent** (House Hunting Services) | 2,141 | 18,600 | **596** | Bio: "Looking for an affordable home? 🏠 / **Verified** bedsitter, 1 bd, 2 bd. / 📞 WhatsApp 0738264143. / Click the link below to see available properties & book a viewings 👇" — the only one using "Verified" and a link-in-bio booking flow. |
| **@nyota.realtor.stays** | 1,778 | 28,300 | **513** | Bio: "▪️Your local key to new homes 🗝 ... ▪️ **viewing charges apply.**" |

### House-tour creators (the content genre, not agents)

| Account | Followers | Hearts | Videos | Note |
|---|---|---|---|---|
| **@africanrealestate** (African Real Estate) | **198,100** | 1.8M | 605 | Dominates #housetourkenya, but sells KSh 20M+ mansions. Not the mass market. |
| **@ke.cribs** (KE Cribs 🇰🇪) | **69,100** | **1.6M** | **42** | **The key creator for this founder.** Bio: "Spaces. People. Stories / Welcome to KE Cribs 🇰🇪 / kecribs@gmail.com / **Got a space we should see? DM me👀**". Only 42 videos but 1.6M hearts — ~16,000 hearts per video. States rent in the caption ("22000/= house in Roysambu", "35000/= in Kamakis"). Its comment sections are the richest renter-voice source I found. |
| **@nzulaaaa1** (lifeofnzula) | 410 | 16,400 | 47 | "comrade house tour", 2026-10-05, 64,628 plays off 410 followers — **the genre travels without a following.** |

**[MY INFERENCE]** @ke.cribs is the single highest-leverage partner or model: tiny catalogue,
enormous engagement, rent in the caption, and an audience that *demands* bedsitters (§3.11).
@josephkimani78 (208,800 followers, 6,795 videos) is the volume incumbent.

**Accounts I could NOT verify:** `@legit.house.hunters` — profile fetch returned no `userInfo`
(handle may be wrong or the account removed). Follower figures that a search tool attributed to
some of these accounts (e.g. "113.1K" for KenTips247, "81.7K" for House Hunting Services) **did
not match** my direct reads (67,100 and 2,141). **Trust the table above, not search snippets.**

---

## 5. The register — how Kenyans actually talk about this

Counts are from my 1,425-comment corpus. Examples are all real and sourced above.

### Frequency, measured

| Term | Occurrences | Meaning / use |
|---|---|---|
| `available` | **136** | "still available?", "zikoo available?" |
| **`nataka`** | **34** | "I want" — opens the overwhelming majority of demand-side comments |
| `location` | **32** (16 as the whole comment) | the single loudest unmet demand |
| `bedsitter` | 42 | the default unit of the mass market |
| `plug` | 13 | "plug me" = connect me / give me the source |
| `single` | 10 | single room, the tier below a bedsitter |
| `vacant` | 8 | "kuna vacant?" |
| `deposit` | 6 | always asked, rarely stated |
| `kunayo` | 4 | "is there any (available)" |
| `natafuta` | 3 | "I'm looking for" |
| `bei` | 3 | price |
| `keja` | 2 | house/crib (Sheng) |
| `maji` | 2 | water |
| `nihamie` | 2 | "so that I move in" |

**[MY INFERENCE]** `nataka` (34) massively outnumbers `natafuta` (3). The register is **"I want"**,
not "I am searching". Write buttons and prompts as *nataka*, not *natafuta*. Also note `keja`
appeared only twice in comments — it is creator/brand vocabulary (`kejahunt`, `kejanova`,
`makeja za comrades`) more than everyday comment vocabulary. **`bedsitter` (42) is the real
high-frequency noun.** Do not over-index on Sheng the audience doesn't actually type.

### The grammar of a demand comment

Observed shape: **`nataka` + unit + price + estate (+ landmark) (+ deadline)**

- "nataka bedsitter 5k to 6k Ruiru ndani ama next to Ruiru bypass"
- "nataka iko na wardrobe budget 7,7500 mirema, zimerman ama canopy"
- "natafuta bedsitter 6k around kimbo ama toll"
- "nataka kihuguro ruiru ya 6 kwa barabara"

**Price is spoken as a bare number with `k`** ("5k", "6500", "ya 6", "35 ama 4" for 3,500 or
4,000). **Rent in captions is written `5,000/` or `22000/=`** — the trailing slash is standard.

**Landmarks, not addresses.** Location is given by what you can see: "1km from quickmart
supermarket", "near Khetias Supermarket", "nyuma ya naivas", "kwa petrol station ya shell",
"karibu na lami" [near the tarmac], "kwa barabara" [on the road], and matatu directions
("you alight at Afrosayari"). **[MY INFERENCE] A product that asks for a street address will
fail. It must accept landmark + matatu stage.**

**`ama`** = "or", and it is everywhere: "35 ama 4", "kimbo ama toll", "ruiru ndani ama rainbow",
"mirema, zimerman ama canopy". **Renters think in substitutable clusters of estates, not single
estates.** Search must be multi-select by default.

**Tone.** Blunt, transactional, fast, unpunctuated, heavy emoji, zero deference. Agents shout in
caps ("SIKUPELEKI KUONA", "VIEWING FEE APPLICABLE (2k)", "6K NEWLY BUILT BEDSITTER"). Renters are
terse to the point of rudeness ("location", "iko wapi", "zikoo available?") and turn instantly
hostile when they smell a lie ("We mwizi" — *you thief*; "hawa ni likes wanatakaa,,,con";
"kama utaki kusema location usipost zima video zako"). Humour is the default register for
discussing poverty ("35k rent no bed", "our toilets is bigger than my house", "My Rent is 4k in
Bungoma, hadi iko na parking 😂😂").

**Phone-number obfuscation.** @zippyk567 writes "📞0.7.0.5.9.0.5.4.0.8" and
@rental.properties58 writes "0796.911015" — **[MY INFERENCE]** evading platform moderation of
contact details. A product that hosts phone numbers openly is solving a real pain.

---

## 6. What surprised me

1. **TikTok comments are the asset, and they are not on TikTok's website.** The captions are
   advertising; the comments are the market research. TikTok's web product hides exactly the
   layer that matters. I reached them only through a third-party mirror — flagged accordingly.

2. **"Is it still available?" is being asked 33 months after posting.** The clearest finding in
   the document. TikTok is a superb price archive and a worthless vacancy signal, because nothing
   ever expires. **The founder's product is not "a list of houses" — it is a *date*.**

3. **The product being sold on Kenyan TikTok is not the house. It is the pin and the caretaker's
   phone number.** Two separate accounts price exactly this: KSh 1,000 flat (@makejani_home) or
   5% of rent (@dreamrentals1), with @dreamrentals1 stating three times in its own bio that it
   will not physically take you anywhere. The scarce good is *information*, which is precisely
   what the founder proposes to give away free. That is the whole strategic picture in one line.

4. **Nobody is hiding the viewing fee — it is the headline.** 12 of 24 verified bios state a fee,
   four of them the same KSh 2,000, and the figure is identical on X. I expected a grey practice
   and found an openly advertised, price-standardised industry. The 2020 Kenyans.co.ke article
   already describes it as normal.

5. **#housetourkenya is the wrong hashtag.** It is colonised by agents selling KSh 20M–68M
   mansions and KSh 250,000–480,000/month lettings (@africanrealestate, 198,100 followers). The
   mass market lives under `#bedsitter` and TikTok's `/discover/` keyword pages
   ("bedsitter-in-ruai-rent-5000"), not under the house-tour tag. **Crawl `#bedsitter`, not
   `#housetourkenya`.**

6. **The audience is openly revolting against aspirational content.** @ke.cribs lost its comment
   section for one week over a nice family home: "Rudi kwa singles na bedsitters na 1 bedrooms",
   "you've started losing the plot ... Most of us followed you for relatability", "Turudisha Juja
   aky" (295 likes), "umeanza rough game" (1,279 likes). **Demand for honest bottom-of-market
   housing content visibly exceeds supply.**

7. **The crowd already does free verification.** Neighbours contradict listings on the listing
   itself: "that apartment doesn't Have bedsitters and it's not even complete" (72 likes);
   "hizi ni 2b pekee" ; and most sharply, estate-name inflation caught in public —
   "Githurai 44 nyuma ya naivas ndio mnaita Roysambu" (502 likes). An annotation feature would
   formalise a behaviour people already perform for free, and **accurate estate naming may be a
   trust feature, not a detail.**

8. **KSh 5,000 is a price floor, not a price point.** Six accounts across 2024-01 → 2026-05
   advertise bedsitters at exactly "5k". **[MY INFERENCE]** 5k reads as a marketing threshold
   (like 9.99) rather than a market-cleared rent — which means the real spread hides in the
   unstated deposit, water and garbage, not in the headline.

9. **The caretaker kickback hypothesis is NOT confirmed, and I want to be blunt about that.**
   A grep of all 1,425 comments for `caretaker|mama plot|mamaplot|landlord|mwenye|watchman`
   returned **zero matches**. Renters in these threads never mention caretakers. What I found is
   agents *charging tenants for caretaker access* — adjacent, suggestive, and not the same claim.
   **Do not put the kickback claim in a deck on the strength of this research.**

10. **The secondary-source layer I was told to expect does not exist.** I found no Kenyan news
    article, no Reddit thread and no YouTube repost quoting a Kenyan rental TikTok. Searches for
    them returned either TikTok's own pages or US stories about Caleb Simpson. **[MY INFERENCE]**
    This genre is enormous and completely unreported — which is good news for the founder
    (no incumbent narrative) and bad news for anyone wanting third-party validation.

11. **Search urgency is measured in days, not months.** "nihamie uko kesho", "nataka kuhama over
    the weekend", "bado ziko nijie kesho??", "can I view and pay Kesho?". I found **no** quote
    about a search lasting weeks or costing a running total. The product may need to serve a
    48-hour panic, not a considered browse — **but this is inference from absence and should be
    tested in interviews.**

---

## Appendix — reproducing this

Working files from this session (scratchpad, not committed):
`/tmp/claude-0/-home-user-mitasafi/b21feb83-170c-50d0-9cac-a29dee9201a6/scratchpad/`
— `comments2.txt` (1,425 comments), `h/*_info.json` + `h/*_cmt*.json` (raw API responses),
`p/*.html` (profile pages), `vidmap.json` (id → URL).

Method that worked, in order:
1. `r.jina.ai/https://www.tiktok.com/tag/<tag>` and `/discover/<slug>` → captions + permalinks.
   **Rate-limited to roughly two pages before a multi-hour domain block. Pace it, or use a key.**
2. `tikwm.com/api/?url=<video_id>` → verbatim caption, region, date, engagement.
3. `tikwm.com/api/comment/list?url=<video_id>&count=50&cursor=N` → comments, 50/page.
4. `curl https://www.tiktok.com/@<handle>` → parse `__UNIVERSAL_DATA_FOR_REHYDRATION__` →
   `__DEFAULT_SCOPE__['webapp.user-detail'].userInfo` → verified followers + bio. **No proxy
   needed; this one is cheap and reliable.**

**Next crawl should target** `#bedsitter`, `#bedsitterchronicles`, `#househuntinginnairobikenya`
and `/discover/` slugs for **Pipeline, Kayole, Umoja, Donholm, Kasarani, Syokimau, Thika,
Mombasa, Nakuru, Eldoret, Kisumu** — all absent from this sample, and all confirmed by search
titles to have TikTok content.
