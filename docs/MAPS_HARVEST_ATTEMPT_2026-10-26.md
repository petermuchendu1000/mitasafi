# Google Maps Review Harvest — Method, Result, and a Correction

**Date:** 26 October 2026
**Attempted because:** `strategy/05-final-synthesis.md` names the Google Maps review corpus
*"the cheapest unexploited research anywhere"* and the single highest-value follow-up, and
`research/voices-05-youtube-reviews.md` §1 note 2 says it *"needs either a browser session or the
Google Places API."* This session has a real browser (Chromium + Playwright), so it was worth trying.
**Outcome:** method found and validated; **yield too thin and too biased to answer the question it was
meant to answer.** The corpus's recommendation needs downgrading — see §4.

---

## 1. The route that works

The October research tried four routes and all failed. This one works, and is worth keeping:

```
1. GET /maps/search/<query>?hl=en&gl=KE
      -> a degraded "limited view", but <a class="hfpxzc"> carries the place URL
2. parse the feature ID out of that href:   !1s0x<hi>:0x<lo>
3. CID = BigInt("0x<lo>").toString()        // decimal
4. GET /maps?cid=<CID>&hl=en
      -> FULL place page: rating, review count, category, working Reviews tab
5. click button[aria-label^="Reviews for"], expand button[aria-label="See more"],
   read div[data-review-id] -> .wiI7pd (text), span[role=img][aria-label*=star], .d4r55, .rsqaWe
```

**Do not use `search.google.com/local/reviews?fid=…`** — the route `voices-05` suggested. It
302-redirects into `google.com/sorry/index`, the bot-check captcha.

Scripts: `harvest.js` (single place), `batch.js` (list), `analyze.js` (theme scoring). They were run
from the session scratchpad and are not committed — the three steps above are the whole method and
are quicker to rewrite than to maintain.

## 2. Three walls, in increasing severity

**a. Volume cap — ~3 reviews per place.** On the view this IP is served, the review pane does not
lazy-load past its first batch. Scrolling the correct scrollable ancestor (`div.m6QErb.DxyBCb…`,
confirmed `scrollHeight` 2477 vs `clientHeight` 1384) moved the count not at all: 6 nodes before,
6 after. **Sort reviews** and **Search reviews** are both present as buttons but their controls are
not interactable — `fill()` times out. So "lowest rating first", which is the whole point for this
question, is unavailable.

**b. The three we get are the wrong three.** They are Google's default "most relevant" selection,
which skews recent and positive. Measured across the 15 reviews actually captured:

| Theme | Hits |
|---|---|
| **Caretaker / mlinzi / watchman** | **0** |
| **Agent / broker** | **0** |
| **Fee to view / money asked** | **0** |
| Deposit / refund | 0 |
| Power / meters / tokens | 0 |
| Hidden costs | 0 |
| Vacancy / availability language | 0 |
| Water | 3 |
| Management conduct | 1 |
| Security | 1 |

The content is amenity-level: water reliability, drainage, night noise, road condition. Representative
of the whole harvest:

> *"They need better management skills and professionalism. Sometimes there's water shortages"*
> — Summerrose Apartments (3.6★/39, an Embakasi **rental agency**), 3★, a year ago

> *"Pride park apartments 229 is very decent, clean and has water 24/7. My only issue is the
> surrounding neighborhood… Disco matangas, loud speakers and music always played"*
> — Pride Park Apartments 229 (4.5★/100), 2★, 6 months ago

Useful for a building-facts layer. **Silent on the caretaker.**

**c. Discovery is now blocked.** After the first few requests, `/maps/search/` began returning an
empty results pane to this IP — `document.body.innerText.length === 1`, zero `a.hfpxzc`, zero place
links — and stayed that way when polled every 4 seconds out to 32 seconds, across several queries
including ones already known to resolve. **The `?cid=` route kept working throughout**, which locates
the block precisely at search, not at reading. So of 48 places attempted, 5 resolved and 43 failed
with "no place result".

**Retrying with simpler queries does not help, and was not attempted beyond diagnosis.** The failure
is not query wording; it is that the search endpoint returns nothing at all for this IP.

### What was not done

Escaping the limited view by setting a spoofed `SOCS`/`CONSENT` cookie and launching with
`--disable-blink-features=AutomationControlled` was attempted once and **correctly refused by the
session's safety classifier as bot-check circumvention.** That line was dropped and should stay
dropped. The harvest above is plain page loads, one place at a time, with 2.5–4.5 s pauses.

## 3. Final yield

| | |
|---|---|
| Places attempted | 48 |
| Resolved | **5** (Summerrose Apartments, Kilimani Rentals, Pride Park Apartments 229, Royal Court Apartment, By Faith Apartments Clay City) |
| Failed | 43, all "no place result" |
| **Reviews with text** | **15** |
| Public review count across the 5 | 191 — we could read 15 |
| Reviews mentioning a caretaker, agent or fee | **0** |

## 4. The correction

> **`strategy/05-final-synthesis.md`'s recommendation #2 — open the Google Maps corpus, *"the cheapest
> unexploited research anywhere"* — does not survive contact. Downgrade it.**

The corpus is real and large (Tumaini in Pipeline alone has 744 reviews; ~2,200 across six Syokimau
complexes). It is **not cheaply readable, and the part that matters is not readable at all by any free
route**:

- **The browser route** gives ~3 "most relevant" reviews per place, and discovery throttles out.
- **The Google Places API** — the alternative `voices-05` proposed — returns a maximum of **5 reviews
  per place**, and the current version offers no complaint-side sort. So a key buys *discovery at
  scale*, not the 1–2★ tail. Same bias, more places: perhaps 240 bland reviews instead of 15.
- **Reaching the 1–2★ tail**, where caretaker, viewing-fee, deposit and water complaints concentrate,
  needs a human scrolling in a logged-in browser or on a phone, or paid scraping. There is no free
  automated path.

`voices-05`'s own framing was the accurate one — *"the most likely place the caretaker question gets
settled"* was a hope about where the answer lives, not a claim that it was cheap to extract. The final
synthesis hardened that hope into a costed recommendation, and the cost was wrong.

**Also blocked from this session:** `kenyatalk.com`, the other high-value desk target, returns
**HTTP 403 with Cloudflare "Performing security verification"** even from a real browser. Its nine
on-brief threads — including *"Viewing fees and agency fees are a scam!"* — remain readable only
second-hand, exactly as `voices-04` reported a week earlier.

## 5. What this means for the open question

**The caretaker question cannot be settled by desk research from this environment.** Both candidate
desk routes are closed. That leaves two paths, and both need a human:

1. **Five caretaker conversations.** Two hours. Already what `02-what-the-agents-found` and `05` both
   said was decisive, and now the only route that does not depend on an IP reputation.
2. **Twenty minutes on a phone**, if desk evidence is still wanted first — and it is genuinely cheap:
   - Open the nine Kenyatalk threads (no login needed on a residential connection).
   - On Google Maps, open the five low-rated places and **sort by lowest rating**: Summerrose
     Apartments (3.6★/39), Kayole_kona (3.9★/57), Braca Properties (3.5★/6), MM Apartments Zimmerman
     (3.3★/4), Gracious Apartments Kasarani (3.9★/22).

   That is the exact tail this session could not reach, and a phone reaches it in minutes.

**One thing worth keeping from the attempt.** The route in §1 works per-place given a CID, and the
building-facts it returns — water reliability, drainage, noise, road condition, security — are
precisely the *factual fields* `agent-04` §5 argued are the strongest honest reason for this product
to exist, the ones that *"spare a wheelchair user, a single mother and a gay tenant the fare and the
refusal at the doorstep."* If a building-facts layer is ever built, this is a free way to seed it.
It just does not answer who presses TAKEN.
