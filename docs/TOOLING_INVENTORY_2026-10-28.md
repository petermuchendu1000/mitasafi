# MITASAFI TOOLING INVENTORY

**Date:** 2026-10-28
**Method:** Every slot below was derived from code or config in this repository, not from
the documentation (which is stale in several places — see §0.2). Every price was read
from the vendor's own page on 2026-10-28, by HTTP fetch or by rendering the page in
headless Chromium where the vendor blocks fetchers. Third-party blog figures were
rejected wherever they conflicted with a vendor page.

**Evidence labels:** `[V]` verified — receipt given. `[I]` inferred — chain stated.
`[U]` unknown — what would establish it is stated.

**No monthly bill is quoted anywhere in this document.** 85 documents in `docs/` contain
no MAU, listing-count, or message-volume target (searched: `[0-9]+ (users|listings|
bookings|SMS|MAU)`), so any monthly total would be an invented number. What is given
instead is the **free-tier ceiling** and the **unit price past it**, so the numbers can be
compared against real volume once it exists.

---

## 0. WHAT THE OBSERVATION FOUND

### 0.1 Services the code actually calls

Derived from `grep -rhoE "process\.env\.[A-Z0-9_]+" src/ scripts/` (25 distinct vars) and
`grep -rhoE "https?://[a-zA-Z0-9._-]+" src/ scripts/`:

| Service | Evidence |
|---|---|
| Supabase (DB, Auth, Storage, Realtime) | `@supabase/ssr`, `@supabase/supabase-js` in `package.json`; 49 refs to `syoolvgoaqnckgmngvse.supabase.co` |
| Vercel (hosting + cron) | `vercel.json` with 3 cron entries |
| M-Pesa Daraja | 6 `MPESA_*` env vars; `api.safaricom.co.ke`, `sandbox.safaricom.co.ke`; 4 routes under `src/app/api/payments/mpesa/` |
| Africa's Talking (SMS) | `africastalking@^0.7.9`; `src/lib/sms/index.ts` |
| Resend (email) | `resend@^6.6.0`; `RESEND_API_KEY`; `src/lib/email/` |
| Mapbox GL (map render) | `mapbox-gl@^3.17.0`; `src/components/listings/ListingMap.tsx` |
| Google Places (autocomplete) | `src/app/api/places/autocomplete/route.ts`; `GOOGLE_PLACES_API_KEY` |
| Google OAuth | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; 2 × `auth.signInWithOAuth` |
| Upstash Redis | `@upstash/redis@^1.36.1`; `src/lib/security/rate-limit.ts` |
| Kling AI (image gen) | `scripts/generate-services-images.mjs`; `api-singapore.klingai.com` |
| Unsplash | 120 refs to `images.unsplash.com`; allow-listed in `next.config.ts` |

### 0.2 Contradictions between docs/env and code — resolve these first

| Claim | Reality | Verdict |
|---|---|---|
| `.env.example` names `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | No `@sendgrid/*` dependency; `RESEND_API_KEY` is what the code reads | **`[V]` Stale. Delete both lines from `.env.example`.** |
| `.env.example` names `NEXT_PUBLIC_SENTRY_DSN` | No `@sentry/nextjs` dependency; no `Sentry` symbol in `src/` | **`[V]` Aspirational — the tool is not installed.** |
| `.env.example` names `NEXT_PUBLIC_POSTHOG_KEY` | No `posthog-js` dependency | **`[V]` Aspirational.** |
| `MITASAFI_TECHNICAL_ARCHITECTURE.md:46` lists "Vercel • Supabase Cloud • Cloudflare • Sentry • PostHog" as the stack | Cloudflare, Sentry, PostHog are absent from `package.json` and `src/` | **`[V]` 3 of 5 are not built.** |
| Docs never mention Mapbox (0 hits with word boundaries) | `mapbox-gl` is a production dependency and renders the listing map | **`[V]` Undocumented live dependency.** |

A note on method: my first vendor-mention count across `docs/` reported "Expo — 43 docs",
which was `grep -i` matching **export** and **exposure**. Re-run with `-w`, Expo is 0 and
there is no mobile-framework decision anywhere in the documentation.

---

## TIER 0 — BLOCKING. The system cannot legally or technically run as configured.

### 1. Application hosting, serverless functions, cron — **Vercel Pro, $20/mo**

**What it is for:** Serves the Next.js 16 app, runs all 31 API routes as functions, and
fires the three scheduled jobs in `vercel.json` that drive saved-search alerts.

**Two independent blockers on the free plan, both verified:**

1. **Hobby forbids commercial use.** Vercel's fair-use page states: *"Hobby teams are
   restricted to non-commercial personal use only. All commercial usage of the platform
   requires either a Pro or Enterprise plan,"* and defines commercial as including *"Any
   method of requesting or processing payment from visitors of the site."* `src/app/api/
   payments/mpesa/initiate/route.ts` does exactly that. `[V]`
   — https://vercel.com/docs/limits/fair-use-guidelines
2. **`vercel.json` will not deploy on Hobby.** Its first cron is `"0 * * * *"` (hourly).
   Vercel: *"Hobby accounts are limited to cron jobs that run once per day. Cron
   expressions that would run more frequently will fail during deployment."* `[V]`
   — https://vercel.com/docs/cron-jobs/usage-and-pricing

**Price:** $20/mo platform fee, 1 deploying seat, $20/mo usage credit included; extra
seats $20/mo each; viewer seats free. `[V]` https://vercel.com/docs/plans/pro-plan

**Alternatives, with the reason each wins or loses:**

| Option | Cost | Decision |
|---|---|---|
| **Vercel Pro** | $20/mo | **Recommended.** Only option where `next.config.ts` image optimisation, Next 16 ISR/middleware and `vercel.json` crons work with zero porting. The $20 credit covers early usage. |
| Cloudflare Workers | Free: 100k req/day, then $5/mo + $0.30/million `[V]` https://www.cloudflare.com/developer-platform/products/workers/ | **Cheapest, real porting cost.** Next-on-Pages/OpenNext required; Node APIs in 31 routes need audit. Choose only if $20/mo is genuinely blocking. |
| Netlify / Render / Fly.io | Render: free tier spins down `[V]` https://render.com/pricing | **Reject for this app.** A cold-start web service is wrong for a payment callback endpoint Safaricom retries. |
| Self-host (VPS + Docker) | ~$5–6/mo | **Reject now.** Transfers TLS, WAF, deploy, rollback and uptime to a team that currently has no CI at all (§3). |

### 2. Postgres + Auth + Storage + Realtime — **Supabase Pro, $25/mo**

**What it is for:** 60 base tables, 256 application functions, RLS, phone/OAuth auth,
two storage buckets (`booking-media`, `provider-documents` — from `grep -rhoE
'storage\.from\(...'`), and Realtime subscriptions used by 10+ files including
`BookingChat.tsx` and `useNotifications.ts`.

**Why Free is disqualified — two facts from Supabase's own pricing page `[V]`
(https://supabase.com/pricing):**
- *"Projects pause after 1 week of inactivity"* — a paused project means a dead payment
  callback URL.
- *"Automatic backups are not included"* on Free. This application moves money. A money
  system with no backup is not a system.

Free otherwise gives: 500 MB DB, 1 GB storage, 5 GB egress, 50,000 MAU, 200 concurrent
Realtime connections, 2M Realtime messages, **1-day log retention**. `[V]`

**Pro ($25/mo) gives:** 100k MAU, 8 GB disk, 250 GB egress, 100 GB file storage, 500
Realtime connections, 5M Realtime messages, **daily backups kept 7 days**, 7-day logs,
$10 compute credit. Overages: $0.00325/MAU, $0.125/GB disk, $0.09/GB egress,
$0.0213/GB storage, $2.50/M Realtime messages. `[V]`

**Alternatives:**

| Option | Cost | Decision |
|---|---|---|
| **Supabase Pro** | $25/mo | **Recommended.** Auth, RLS, Realtime and Storage are all load-bearing here. Replacing it is not a vendor swap, it is four separate migrations. |
| Neon + separate auth/storage/realtime | Free: 100 projects, 1 GB storage/project, 2 CU, no card, no time limit `[V]` https://neon.com/pricing | **Reject.** Neon is Postgres only. You would still buy auth, storage and a realtime transport, and rewrite every `supabase.auth.*` and `.channel()` call. |
| Self-hosted Supabase | VPS cost only | **Reject now.** Same reason as 1. |
| Railway / Render Postgres | varies | **Reject.** No RLS-aware auth layer; same rewrite. |

**Note:** the two storage buckets hold **identity documents** (`provider-documents`, read
by `src/app/admin/verifications/[id]/DocumentViewer.tsx`). Retention and access policy for
those is a legal question under the Kenya Data Protection Act 2019, `[U]` — I have not
read the Act and will not summarise it from memory.

### 3. Continuous integration — **GitHub Actions, free**

**What it is for:** Running the 436 tests, `tsc --noEmit`, and the build on every push.

**Current state `[V]`:** `find .github -type f` returns nothing. **There is no CI of any
kind.** 436 tests exist and nothing runs them. This is the cheapest high-value gap in the
entire inventory: the tool is free and already paid for by the GitHub account.

**Price:** Private repos on GitHub Free get **2,000 Actions minutes/mo + 500 MB artifact
storage**; Team gets 3,000 min + 2 GB; public repos run standard runners free; Linux
2-core overage $0.006/min. `[V]`
— https://docs.github.com/en/billing/concepts/product-billing/github-actions

**Alternatives:** GitLab CI (free tier, requires mirroring), CircleCI, Woodpecker
(self-host). **All rejected** — the repository is already on GitHub, so Actions costs zero
marginal setup and zero marginal money.

### 4. Linter — **ESLint flat config, free (file is missing)**

**Current state `[V]`:** `npm run lint` fails with *"Invalid project directory provided,
no such directory: /home/user/mitasafi/lint"* — `next lint` was removed in Next 16. There
is no `eslint.config.*` and no `eslintConfig` key in `package.json`. ESLint 9.39.2 refuses
to run. `git log --oneline -1 -- package.json` shows `"lint": "next lint"` has been there
since the initial commit `d5c010c`, so **the linter has never run in this repository.**

**Fix:** `eslint.config.mjs` using the already-installed `eslint-config-next@15.1.3` and
`eslint-config-prettier@^9.1.0`, invoked as `eslint .`. Cost: zero. Note
`eslint-config-next` is pinned at 15.1.3 while `next` is `^16.1.1` — a version skew to
check `[U]`.

### 5. Auth OTP SMS delivery — **Supabase Send SMS Hook → Africa's Talking**

**This is the single largest unit-cost error available in the system.**

**What it is for:** Delivering the login/signup one-time code.
`src/app/(auth)/login/page.tsx:212` and `src/app/(auth)/signup/page.tsx:314` call
`supabase.auth.signInWithOtp`. That OTP is sent by **Supabase's** configured provider, not
by `src/lib/sms/index.ts`.

**The verified facts:**
- Supabase Auth natively supports **MessageBird, Twilio, Vonage, TextLocal** only.
  Africa's Talking is **not** among them. `[V]`
  — https://supabase.com/docs/guides/auth/phone-login
- Twilio's own rate card for Kenya: **USD 0.3134 per SMS segment**. `[V]`
  — https://www.twilio.com/en-us/sms/pricing/ke
  (Two third-party blogs claimed $0.05 and $0.1304; the vendor page overrides both.)
- Africa's Talking published Kenya **Bulk SMS** rate: **KES 0.80** to Safaricom at the
  entry spend band, 16% VAT exclusive. `[V]` — rendered from
  https://africastalking.com/pricing, *Bulk SMS* tab, Kenya selected.
- Supabase's **Send SMS Hook** exists precisely to replace the built-in sender, and
  Supabase's own documentation names **Africa's Talking** as an example alternative. `[V]`
  — https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
- **There is no such hook in this repository** `[V]`: no `supabase/functions/` directory
  (`find supabase -maxdepth 2 -type d` → only `supabase/migrations`), and no `send_sms`
  match anywhere in `supabase/` or `src/`.

**The gap:** at any FX rate between 100 and 160 KES/USD, Twilio is **roughly two orders of
magnitude** dearer per OTP than Africa's Talking. The exact multiple needs an FX rate I
have not verified `[U]`. Which provider is configured in the Supabase dashboard today is
**`[U]` — I have no credentials and cannot read it.** It is either (a) a 50×-costlier
provider, or (b) nothing, in which case phone login is dead. **Both are serious; they need
opposite fixes.** Establishing which: read Authentication → Providers → Phone in the
Supabase dashboard, or `GET /v1/projects/{ref}/config/auth`.

**Decision:** implement the Send SMS Hook pointing at the Africa's Talking client that
`src/lib/sms/index.ts` already wraps. One sender, one rate card, one place to debug.

---

## TIER 1 — MONEY AND SAFETY

### 6. Mobile money collection — **Safaricom Daraja direct (already built). Keep it.**

**What it is for:** Taking payment. `src/app/api/payments/mpesa/{initiate,callback,query,
health}/route.ts`.

**The cost comparison, both from vendor-owned sources:**

| Route | Business pays | Customer pays | Source |
|---|---|---|---|
| **Daraja direct (Lipa na M-PESA Buy Goods till)** | **max 0.5%, never more than KSh 200/txn** | **Nothing.** Payments ≤ KSh 200 are free; *"There are no customer charges for payments made using Lipa na M-PESA Buy Goods except for payments made at fuel stations."* | `[V]` Safaricom's own tariff PDF, extracted with `pdftotext`: https://www.safaricom.co.ke/images/Downloads/the-mpesa-business-till-tariff.pdf |
| IntaSend | **3%** on M-Pesa collections (cards 3.5% local / 4.5% international; M-Pesa disbursement flat KSh 100) | — | `[V]` rendered from https://intasend.com/pricing |

**Decision: direct Daraja wins on price by ~6× and on customer experience outright** (the
customer pays nothing). The existing architecture is correct. Aggregators (IntaSend,
Pesapal, Flutterwave, Paystack, Kopo Kopo) buy you card acceptance and a nicer API, at 3%+.
Revisit only if card payments become a requirement.

**Not verified `[U]`:** Daraja's own API access fee, if any — `developer.safaricom.co.ke/
faqs` returns *"No FAQs Found"* and states no pricing. Go-Live requirements likewise
unstated there. Establish from the Daraja portal while logged in.

### 7. Error monitoring — **Sentry free, then $29/mo**

**What it is for:** Catching the exceptions that are currently written to `console.error`
and thrown away. The F3 bug fixed earlier today was a swallowed `console.error` — in
production nobody would ever have seen it.

**Current state `[V]`:** `NEXT_PUBLIC_SENTRY_DSN` is in `.env.example`; `@sentry/nextjs`
is **not** in `package.json`. The env var is decoration.

**Price:** Developer/Free — **5k errors**, 5M spans, 50 replays, 1 user, 30-day retention,
1 cron monitor, 1 uptime monitor. Team — **$29/mo** ($26 annual), 50k errors, unlimited
users, 90-day retention. `[V]` https://sentry.io/pricing/

| Option | Cost | Decision |
|---|---|---|
| **Sentry free → Team** | $0 → $29/mo | **Recommended.** Best Next.js 16 instrumentation; free tier's 1 cron + 1 uptime monitor also covers slot 8 at zero cost. |
| PostHog Error Tracking | **100k exceptions/mo free** `[V]` | **Strong contender** — 20× Sentry's free error volume, and you want PostHog anyway (slot 24). Weaker stack traces / release tracking. |
| GlitchTip (self-host) | Free, AGPL | Sentry-protocol compatible. Costs a server and your attention. |
| Better Stack / Bugsnag / Rollbar | varies | No advantage here. |

**Recommendation:** install Sentry for errors **and** PostHog for product analytics; their
free tiers do not overlap in a way that wastes money.

### 8. Uptime and heartbeat monitoring — **free**

**What it is for:** Knowing the payment callback and the three crons are alive. A cron that
silently stops firing means saved-search alerts stop, with zero signal.

**Current state `[V]`:** nothing. No monitoring tool in `package.json`, no `.github/`.

| Option | Free tier | Decision |
|---|---|---|
| **Better Stack Uptime** | **10 monitors + heartbeats, 1 status page**, free for personal projects `[V]` https://betterstack.com/uptime/pricing | **Recommended** — heartbeat monitors are the right primitive for `vercel.json` crons (the job pings on success; silence pages you). |
| UptimeRobot | **50 monitors, 5-min interval, 1 status page, 3-month logs** `[V]` https://uptimerobot.com/pricing/ | **Best monitor count.** No heartbeat semantics as clean; 5-min interval. |
| Sentry Crons | 1 monitor on free | Free if you take slot 7. Only 1. |
| Checkly / Hyperping | — | Not needed at this stage. |

Check Better Stack's "free for personal projects" wording against commercial use before
relying on it `[U]` — the same trap as Vercel Hobby.

### 9. Database backup and point-in-time recovery — **included in Supabase Pro**

Pro = daily backups retained 7 days. Team ($599/mo) = 14 days. `[V]`
https://supabase.com/pricing. PITR is a paid add-on whose price I did **not** capture `[U]`.

For a money system, 7-day daily backups is the floor, not the target. Add, at zero vendor
cost, a scheduled `pg_dump` to object storage you control — Supabase's own backup is on
Supabase. Cost: one GitHub Actions job (slot 3) + 5 GB free Neon object storage or
Cloudflare R2.

### 10. Secrets management — **GitHub + Vercel environment variables, free**

**What it is for:** Holding the M-Pesa passkey, service-role key, AT API key. Today they
live only in `.env.local` on a developer machine and in the Vercel dashboard.

| Option | Cost | Decision |
|---|---|---|
| **Vercel env vars + GitHub Actions secrets** | Free | **Recommended.** Already available; zero new vendor; covers both runtime and CI. |
| Infisical | Free: 5 identities, unlimited projects — but described as *"For individuals and personal projects"* `[V]` https://infisical.com/pricing | Adds rotation, audit log, native Vercel/GitHub sync. Check the commercial wording `[U]`. Self-hostable. |
| Doppler / 1Password Secrets | — | Only once there is a team needing shared rotation. |

**Open security item, already identified earlier in this session `[V]`:** a hardcoded anon
key sits in two git-tracked scripts, pointing at a **second** project ref
(`mdfbdmkgjoxazqiqgnne.supabase.co`, 2 refs). That is a secrets-hygiene defect no tool
fixes for you.

---

## TIER 2 — CORE PRODUCT FUNCTION

### 11. Transactional email — **Resend free, then reconsider at volume**

**What it is for:** Booking confirmations, quotes, disputes, reviews
(`src/lib/email/booking-emails.ts`), and `email-to-self` listing shares.

**Price:** Free — **3,000 emails/mo, 100/day, 3 domains, 30-day retention**. Pro —
**$20/mo for 50,000/mo**, no daily cap, then $0.90/1,000. `[V]` https://resend.com/pricing

**The 100/day cap is the real constraint**, not the monthly figure: one busy day of
bookings plus OTP-by-email breaches it while the monthly quota looks healthy.

| Option | Unit cost | Decision |
|---|---|---|
| **Resend** | Free 3k/mo (100/day) → $20/mo for 50k | **Keep.** Already integrated; best DX; React email templates. |
| **Amazon SES** | **$0.10 per 1,000** à la carte, $0 monthly on Essentials `[V]` https://aws.amazon.com/ses/pricing/ | **4× cheaper than Resend Pro per email.** The migration target once monthly volume passes ~20k. Costs you deliverability tooling and a harder setup. |
| Brevo / Mailgun / Postmark / Zoho | `[U]` — Brevo's page is JS-gated and returned 550 chars; I will not quote a figure I did not read | Re-check directly if Resend's daily cap bites. |

### 12. Notification SMS — **Africa's Talking (already integrated)**

**What it is for:** Booking and payment SMS via `src/lib/sms/index.ts`, gated by
`SMS_ENABLED`.

**Official Kenya Bulk SMS rate card, 16% VAT exclusive. Bands are by cumulative KES spend,
not message count** `[V]` (rendered from https://africastalking.com/pricing → Bulk SMS →
Kenya):

| Telco | Basic (0–19,999) | Plus (20k–99,999) | Premium (100k–399,999) | Max (400k+) |
|---|---|---|---|---|
| Safaricom | KES 0.80 | KES 0.70 | KES 0.60 | KES 0.40 |
| Airtel Kenya (local) | KES 0.80 | KES 0.80 | — | — |
| **Airtel Kenya (international routing)** | **USD 0.22** | USD 0.22 | USD 0.22 | USD 0.22 |
| Other Kenyan telcos | KES 0.80 | KES 0.80 | KES 0.70 | KES 0.60 |

Short codes, same source: **Dedicated** — KES 10,000 deposit, free setup, **KES 15,000/mo
maintenance per telco**; toll-free adds KES 5,000. **Shared (keyword)** — KES 5,000 setup
+ VAT, KES 2,000/mo + VAT.

**Two things to act on:**
- The **USD 0.22 international-routing row** is a ~30× trap versus the KES 0.80 local row.
  Confirm which route an alphanumeric sender ID uses for Airtel numbers `[U]`.
- **A dedicated short code at KES 15,000/mo per telco is not justifiable at this stage.**
  Use the alphanumeric sender ID (`AT_SENDER_ID=MITASAFI`). Its one-off cost and CA
  approval requirement are **not on the pricing page** `[U]` — get them from the AT
  dashboard.

**Alternatives:** Twilio **USD 0.3134/SMS** `[V]` — reject on price. Celcom Africa, Onfon,
Tiara, Advanta quote KES 0.25–0.60 on third-party comparison pages; **I will not repeat
those figures as facts** — none is a vendor page, and the sources contradicted each other
by 3×. Worth a direct quote request if SMS becomes a top-three cost line.

### 13. Interactive map rendering — **Mapbox GL (already integrated)**

**What it is for:** `src/components/listings/ListingMap.tsx`.

**Price:** **50,000 free web map loads/mo**, then $5.00/1,000 (50k–100k), $4.00 (100k–200k),
$3.00 (200k–1M). `[V]` https://www.mapbox.com/pricing

| Option | Free tier | Decision |
|---|---|---|
| **Mapbox GL JS** | 50k loads/mo | **Keep.** 5× Google's free map allowance; already wired. |
| Google Maps JS (Dynamic Maps) | **10,000 events/mo free**, then $7.00/1,000 `[V]` https://developers.google.com/maps/billing-and-pricing/pricing | **Reject for map rendering** — 5× smaller free tier, 40% dearer per 1,000. |
| MapLibre GL + OpenFreeMap / Protomaps | Free, self-hosted tiles | **The zero-cost ceiling-free option.** MapLibre is the open fork of Mapbox GL — a near drop-in. Worth a spike before Mapbox loads exceed 50k/mo. |
| MapTiler | Free: 5k map loads, 100k tiles, 1k geocoding — but *"Suitable for testing, PoC, prototyping, personal, or non-commercial use"* `[V]` https://www.maptiler.com/cloud/pricing/ | **Disqualified on licence**, not price. |

**Note:** the earlier observation that Google's $200 monthly credit is gone is confirmed —
Google now publishes per-SKU free monthly caps instead. `[V]`

### 14. Address autocomplete and geocoding — **move off Google Places**

**What it is for:** `src/app/api/places/autocomplete/route.ts`, and address entry in
`src/app/dashboard/landlord/properties/new/steps/Step1Basics.tsx`.

**This is the clearest cost win after slot 5.**

| Option | Free tier | Price after | Commercial on free? |
|---|---|---|---|
| **Geoapify** | **3,000 credits/day** (≈90,000/mo), no credit card `[V]` | $0 until exceeded | **Yes, explicitly:** *"You can use the Free plan for commercial websites, apps, and business projects, including in production"* with attribution `[V]` https://www.geoapify.com/pricing/ |
| **Mapbox Geocoding** | **100,000 requests/mo** `[V]` | $0.75/1,000 | Yes |
| Google Places Autocomplete (current) | **10,000 requests/mo** `[V]` | $2.83/1,000 | Yes |
| Google Geocoding | 10,000/mo `[V]` | $5.00/1,000 | Yes |
| Nominatim (OSM public) | Free | — | **Reject** — the public instance's usage policy forbids heavy/commercial autocomplete use. |

**Decision: Mapbox Geocoding is the recommendation** — 10× Google's free tier, 3.8× cheaper
per 1,000, and **you already hold a Mapbox token** (`NEXT_PUBLIC_MAPBOX_TOKEN`), so this is
one vendor fewer, not one more. Geoapify is the pick if you want the largest free ceiling
and don't mind a second vendor. Either way, Google Places at 10k/mo free and $2.83/1,000 is
the wrong default for a search-led product.

### 15. Rate limiting / ephemeral KV — **Upstash Redis free**

**What it is for:** `src/lib/security/rate-limit.ts`. Serverless functions have no shared
memory, so abuse limits need external state.

**Price:** Free — **500k commands/mo**, 250 MB data, 10 GB bandwidth, 1 database. Pay-as-
you-go — **$0.20/100k commands**, $0.25/GB storage over 1 GB. `[V]`
https://upstash.com/pricing/redis

| Option | Decision |
|---|---|
| **Upstash Redis** | **Keep.** HTTP-based, so it works from edge/serverless without connection pooling. Already integrated. |
| Vercel KV | Same Upstash engine, billed through Vercel. Convenient, no cheaper. |
| Postgres table + `pg_cron` cleanup | **Zero marginal cost** — you already pay for Postgres. Costs a write per request on your main DB. Fallback if Upstash's 500k/mo binds. |

### 16. Image optimisation and delivery

**What it is for:** Listing photos. `next.config.ts` sets AVIF/WebP, 8 device sizes, and
allow-lists `syoolvgoaqnckgmngvse.supabase.co`, `lh3.googleusercontent.com`,
`images.unsplash.com`. `sharp@^0.33.5` is the local transformer.

**Verified constraint:** **Supabase image transformation requires Pro or above** —
*"Image Resizing is currently enabled for Pro Plan and above"*, billed **$5 per 1,000
origin images** with a quota of **100 origin images** on Pro. `[V]`
https://supabase.com/docs/guides/storage/serving/image-transformations

So optimisation happens in Vercel's pipeline: Hobby includes 5k transformations, 300k cache
reads, 100k cache writes/mo; Pro overage $0.05/1k transformations, $0.40/1M reads,
$4.00/1M writes. `[V]` https://vercel.com/docs/limits/fair-use-guidelines

| Option | Decision |
|---|---|
| **next/image on Vercel (current)** | **Keep.** Zero new vendor. Watch cache *writes* at $4.00/1M — the dearest of the three meters. |
| Cloudflare Images / R2 + Workers | The cheapest at high volume, and R2 egress is free. Revisit when image spend is visible. |
| Supabase transformations | **Reject** — $5/1,000 origin images against a 100-image quota is the worst rate here. |
| Cloudinary / imgix | Over-specified for this need. |

### 17. Full-text search — **native Postgres. No tool needed. `[V]`**

`tsvector` search is already implemented across 5 migrations including
`20260309000000_fix_search_vector_include_headline.sql` and `20260307000000_sc7_search_
quality.sql`, plus materialized views in `20260109150001_materialized_views.sql`.

**Do not buy Algolia, Typesense or Meilisearch.** The capability exists, is free, and lives
next to the data. Revisit only on a measured relevance or latency complaint — and
`[U]` no such measurement exists today.

### 18. Push notifications — **Firebase Cloud Messaging, no-cost**

**What it is for:** The thing that makes a vacancy alert arrive in seconds instead of
whenever the user next opens the site. Saved-search alerts currently depend on hourly cron
+ SMS/email.

**Current state `[V]`:** nothing. No service worker, no `PushManager`, no `firebase` —
`grep -rln "serviceWorker\|PushManager\|firebase\|FCM" src/ public/` returns nothing.

**Price:** Firebase's own pricing table lists **Cloud Messaging (FCM) — "No-cost"**, with
no paid tier beside it. `[V]` https://firebase.google.com/pricing

| Option | Cost | Decision |
|---|---|---|
| **FCM + Web Push API** | Free, unlimited | **Recommended.** Cheapest possible replacement for alert SMS — every push delivered is a KES 0.93 SMS not sent. |
| OneSignal | Free tier for web push | Nicer dashboard; another vendor; no cost advantage over free. |
| Novu / Knock | Orchestration layers | Premature — `src/lib/notifications/channels.ts` already dispatches. |

---

## TIER 3 — ENGINEERING QUALITY AND VISIBILITY

### 19. End-to-end browser testing — **Playwright, free**

**Current state `[V]`:** no Playwright/Cypress dependency. 436 tests are unit/integration
only; **no test exercises a real browser against a real database.** The signup flow fixed
earlier today is exactly the kind of multi-redirect, cookie-carrying path unit tests
approximate rather than prove.

Playwright is MIT, free, and already installed in CI images. Cypress's free tier limits
Dashboard recordings; Playwright has no such gate. **Pick Playwright.**

### 20. Unit/integration test runner — **Jest, installed `[V]`**
`jest@^29.7.0` + `jest-environment-jsdom` + `ts-jest` + `next/jest`. 436 tests, 12 suites,
all passing. No change needed. (Vitest is faster; migrating is not worth it today.)

### 21. Pre-commit hooks — **Husky, installed but not wired `[V]`**
`husky@^9.1.7` and `lint-staged@^15.2.11` are dependencies and `package.json` has a
`lint-staged` config, but `.husky/` contains only the `_/` runtime — **no hook files.** The
`prepare` script has never run. Zero-cost fix, blocked behind slot 4 (lint-staged calls
`eslint --fix`, which currently cannot run).

### 22. Database type generation — **Supabase CLI, installed `[V]`**
`supabase@^2.76.15` (dev) and `db:gen-types` in `package.json`. Keep. Should be a CI check:
regenerate and fail if `src/types/database.ts` is stale.

### 23. Local database for development — **Supabase CLI + Docker, free (not configured)**
**Current state `[V]`:** `supabase/` contains only `migrations/` and two seed files. **There
is no `config.toml`**, so `supabase start` cannot run. Every developer therefore tests
against shared cloud data — which is how a money system gets corrupted by a test. Free to
fix: `supabase init`.

### 24. Product analytics — **PostHog free**

**What it is for:** Answering "do people who use the map convert better than people who
use search", which no amount of Postgres querying will tell you.

**Price — free every month, forever, no credit card** (*"Only add a card if you need more
than the free tier limits"*): **1M events**, **5K session replays**, **1M feature-flag
requests**, **100K error-tracking exceptions**, 1M data-warehouse rows, 1,500 survey
responses. Free plan = 1 project, 1-year retention, replays kept 1 month. Overage:
$0.000198/identified event, $0.00005/anonymous. `[V]` rendered from https://posthog.com/pricing

| Option | Free tier | Decision |
|---|---|---|
| **PostHog** | 1M events + replay + flags + error tracking | **Recommended.** One tool covers slots 24, 25, 26 — and 100K free exceptions is 20× Sentry's free error tier. |
| Plausible Community Edition | Free, **AGPLv3**, self-hosted `[V]` https://plausible.io/self-hosted-web-analytics | Privacy-first and genuinely free, but pageviews only — no funnels, flags or replay. AGPL obligations apply. |
| Umami Cloud | **Not free** — 14-day trial, then paid; 100K events/mo on the entry plan `[V]` https://umami.is/pricing | Self-hosted Umami is free; cloud is not. |
| Vercel Web Analytics | $10/mo add-on `[V]` | Reject — costs money for less. |

### 25. Session replay — **PostHog, 5K recordings/mo free `[V]`** (included above)
### 26. Feature flags — **PostHog, 1M requests/mo free `[V]`** (included above)
Rejects: LaunchDarkly (enterprise pricing), Vercel Flags Explorer ($250/mo `[V]`),
Flagsmith/Unleash (another service to run for capability you already have).

### 27. CDN, WAF and DDoS — **Cloudflare Free**

**What it is for:** Absorbing abuse before it reaches billable Vercel functions, and
putting a WAF in front of the payment endpoints.

**Price: $0/mo** including CDN, **unmetered DDoS protection**, Universal SSL, **WAF with
the free managed ruleset**, 70 Rules + 10K Bulk Redirects, simple-bot mitigation. Pro
$20/mo annual ($25 monthly) adds 225 Rules and better bot mitigation. Business $200/mo
annual adds PCI DSS 4.0 and sophisticated-bot mitigation. `[V]`
https://www.cloudflare.com/plans/network-cdn/

**Decision: adopt the free plan.** It is named in `MITASAFI_TECHNICAL_ARCHITECTURE.md:479`
and `:547` and is **not deployed** `[V]`. Free DDoS absorption in front of a
`$0.60/1M-invocation` function layer pays for itself immediately. Verify that fronting
Vercel with Cloudflare does not break Vercel's own domain/TLS handling before cutting over
`[U]`.

### 28. Log aggregation and retention

**Why:** Supabase Free retains logs **1 day**, Pro **7 days** `[V]`. A payment dispute
raised two weeks later cannot be investigated with 7-day logs.

| Option | Free tier | Decision |
|---|---|---|
| **Better Stack Logs** | free tier available, bundled with slot 8 | **Recommended** — one vendor for uptime, heartbeats, status page and logs. |
| Axiom | "Always Free allowance" on every plan; entry paid tier lists 500 GB/mo ingest, 25 GB storage, 30-day retention `[V]` https://axiom.co/pricing — **the precise free-column numbers I could not read cleanly, so treat them as `[U]`** | Strong product; confirm the free column directly. |
| Supabase Log Drains | **+$60 per drain per project** `[V]` | Reject — dearest option here. |
| Grafana Loki self-host | Free | Another system to operate. |

### 29. Status page — **Better Stack free (1 page) `[V]`** / Instatus free tier.
Only once there are users to inform. Bundled with slot 8 at no extra cost.

### 30. Dependency and vulnerability scanning — **Dependabot, free**
GitHub-native, free on all plans, zero setup beyond a config file. **Blocked behind slot 3**
— no `.github/` means no Dependabot config. `npm audit` in CI covers the same ground free.
Snyk/Socket add paid depth not needed yet.

### 31. Load testing — **k6, free (OSS)**
**Why it matters here specifically:** `ARCHITECTURAL_LOCK_IN_DECISIONS.md` DECISION 2 puts
business rules in the database (256 functions, triggers). Concurrency behaviour of booking
and payment triggers is exactly what a load test exposes and a unit test cannot. k6 (AGPL,
free) or Artillery (MPL, free). No paid tier needed for local runs.

### 32. Issue tracking — **GitHub Issues/Projects, free**
Named in docs once (Linear). GitHub Projects is free and already where the code is.
**No new vendor until the team outgrows it.**

### 33. ID verification (KYC) — **keep manual review. Do not buy yet.**

**Current state `[V]`:** manual admin review —
`src/app/admin/verifications/[id]/DocumentViewer.tsx`, `IdentityVerificationForm.tsx`,
documents in the `provider-documents` bucket.

**On the documented cost claim:** `VERIFICATION_COMPETITIVE_ANALYSIS.md:215` states *"Smile
Identity is $0.50–$2.00 per check."* **I could not verify this.**
https://usesmileid.com/pricing renders no pricing at all — only "Talk to Sales"/"Book a
call". **That figure is `[U]` and should not be used for budgeting** until someone has a
written quote. Alternatives (IdentityPass, Dojah, Youverify, Prembly) are likewise
quote-only; none publishes a rate card.

**Decision: manual review is correct at this stage** — it costs operator time, not vendor
money, and the volume that would justify automation does not exist (`[U]` no provider count
anywhere in the docs).

### 34. AI asset generation — **Kling AI (dev-time only)**
`scripts/generate-services-images.mjs` + `api-singapore.klingai.com` + `KLING_ACCESS_KEY`
`[V]`. This is a **build-time script, not a runtime dependency** — it generated service
category imagery. Pricing `[U]`, not fetched, because it is not on the production path.
**Action:** confirm these keys are not set in the production environment; a dev-only
credential in a production env is attack surface for no benefit.

### 35. Stock/placeholder imagery — **Unsplash: decide, then remove**
**120 references to `images.unsplash.com`** in `src/`, and the host is allow-listed in
`next.config.ts` `[V]`. Two separate problems: a **licence** question `[U]` (I have not
read the Unsplash licence and will not summarise it from memory), and a **trust** problem
that matters more — a rental marketplace whose research documents are all about listing
fraud (`HOUSE_HUNTING_SOCIAL_RESEARCH_KENYA.md:325` *"Landlords distrust online listings
too"*) cannot ship stock photography as property imagery. **This is a product decision, not
a tool purchase.**

---

## TOOLS TO DELETE

| Item | Why | Evidence |
|---|---|---|
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` in `.env.example` | Superseded by Resend; no SendGrid SDK | `[V]` §0.2 |
| Hardcoded anon key in 2 git-tracked scripts | Secret in version control, pointing at a second project ref `mdfbdmkgjoxazqiqgnne` | `[V]` found earlier this session |
| `"lint": "next lint"` in `package.json` | `next lint` removed in Next 16; the script is dead | `[V]` §4 |
| Google Places autocomplete | Replaceable by the Mapbox token you already hold, at 10× the free tier | `[V]` §14 |

---

## THE SHORT VERSION

**Spend, with every figure verified:** **Vercel Pro $20/mo** (legally required — Hobby bars
commercial use, and the existing `vercel.json` will not even deploy on it) + **Supabase Pro
$25/mo** (Free pauses after 7 days idle and has no backups) = **$45/mo.** Everything else
in this document has a free tier that genuinely fits, or is free software.

**Free, and worth more than the $45:** GitHub Actions (436 tests currently run nowhere),
Cloudflare Free (WAF + unmetered DDoS in front of a per-invocation function layer), PostHog
(1M events, 5K replays, 1M flags, 100K exceptions), Sentry Free, Better Stack (10 monitors
+ heartbeats + status page + logs), FCM push (no-cost, unlimited), Playwright, k6,
Dependabot, an `eslint.config.mjs` that does not yet exist.

**The two unit-cost errors to fix before they compound:**
1. **Auth OTP SMS.** Supabase Auth cannot natively use Africa's Talking; Twilio is
   USD 0.3134/SMS against AT's KES 0.80. Implement the Send SMS Hook. Roughly two orders of
   magnitude, on every single login.
2. **Address autocomplete.** Google Places gives 10,000/mo free at $2.83/1,000; Mapbox
   Geocoding gives 100,000/mo free at $0.75/1,000 **on a token you already have.**

**The architecture decision that is already right:** direct M-Pesa Daraja. Safaricom's own
tariff caps the business at 0.5% / KSh 200 and charges the customer nothing; IntaSend wants
3%. Do not move to an aggregator for convenience.

---

## UNCHECKED — stated as explicitly as what was checked

1. **No production verification of anything.** No Supabase credentials in this container;
   `*.supabase.co` is NXDOMAIN. Which SMS provider Supabase Auth actually uses, whether
   `profiles_public_read` still exists, and whether the project is already on Pro are all
   `[U]`.
2. **Africa's Talking alphanumeric sender ID cost and CA approval requirement** — not on
   the public pricing page. Dashboard only.
3. **Whether an alphanumeric sender ID routes Airtel traffic as local (KES 0.80) or
   international (USD 0.22)** — a ~30× difference the page does not resolve.
4. **Smile Identity pricing** — no public rate card. The `$0.50–$2.00` figure in
   `VERIFICATION_COMPETITIVE_ANALYSIS.md:215` is unverified and should not be budgeted.
5. **Brevo, LocationIQ** — Brevo's page is JS-gated (550 chars retrieved); LocationIQ timed
   out at 60s. No figures quoted for either.
6. **Axiom's free-tier column** — the rendered text was ambiguous between plan columns.
7. **Supabase PITR add-on price** — not captured.
8. **Daraja's own API fees and Go-Live requirements** — `developer.safaricom.co.ke/faqs`
   returns "No FAQs Found" and publishes no pricing.
9. **Licence wording I did not read:** Unsplash licence; Better Stack's "free for personal
   projects" against commercial use; Infisical Free's "individuals and personal projects".
   All three are the same trap as Vercel Hobby and need reading before adoption.
10. **FX rate KES/USD** — not verified, so cross-currency comparisons are given as orders
    of magnitude, not multiples.
11. **Whether fronting Vercel with Cloudflare breaks Vercel's domain/TLS management** — not
    tested.
12. **`eslint-config-next@15.1.3` against `next@^16.1.1`** — version skew not investigated.
13. **Kenya Data Protection Act 2019 obligations** for the identity documents in
    `provider-documents` — I have not read the Act and did not summarise it from memory.
