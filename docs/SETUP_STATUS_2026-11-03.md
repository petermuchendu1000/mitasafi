# MITASAFI — INFRASTRUCTURE SETUP STATUS

**Date:** 2026-11-03
**Purpose:** Snapshot of every external service tested and provisioned before implementation begins.

> **Secrets policy:** No secret values appear in this file. Credentials were tested in an
> ephemeral sandbox, stored 0600, never committed, and are being **rotated after the session**.
> This document records **what is configured and which env vars are needed**, not their values.

---

## 0. STACK DECISIONS (locked)

| Concern | Choice | Replaces / notes |
|---|---|---|
| Front-end hosting | **Cloudflare Pages** | NOT Vercel (Vercel Hobby bars commercial use + hourly cron) |
| Engine / backend | **Fly.io** | app `mitasafi-engine` |
| DNS | **Cloudflare** | zone `mitasafi.com` |
| Database + Auth + Storage + Realtime | **Supabase** | project `prxwxlxbroavvflsgjar` |
| Auth social login | **Google OAuth via Supabase** | live & verified |
| Email (transactional) | **Resend** | replaces the stale SendGrid refs |
| Maps render | **Mapbox GL** | already in code |
| Address autocomplete / geocoding | **Mapbox Search Box** (planned) | replaces Google Places (10× free tier, cheaper) |
| Payments | **PayHero** (M-Pesa aggregator) | reused across projects — **separation required** |
| Rate-limit / KV | **Upstash Redis** | `@upstash/redis` |
| AI image generation | **Cloudflare Workers AI** (FLUX 2 [dev] / Leonardo Phoenix) | replaces Kling & Recraft — free, highest quality tested |
| Registrar API | **Namecheap — dropped** | redundant; DNS is on Cloudflare |

---

## 1. SERVICE-BY-SERVICE STATUS

### ✅ Supabase — `prxwxlxbroavvflsgjar` ("mitasafi")
- **Data plane:** full read/write verified (insert→read→delete round-trip) via the **secret / service_role** key.
- **Control plane (DDL/SQL):** verified as `postgres` superuser via Management API token (the org-scoped `sbp_` token — the account org is the one that owns this project; an earlier token was the wrong org).
- **Postgres:** 17.6.
- **Auth → Google OAuth:** **ENABLED & live** — `GET /auth/v1/authorize?provider=google` → 302 to Google with the correct client_id and Supabase callback.
- **Auth URLs set for production:**
  - `site_url` = `https://mitasafi.com`
  - redirect allow-list = `https://mitasafi.com/auth/callback`, `https://www.mitasafi.com/auth/callback`, `https://mitasafi.pages.dev/auth/callback`, `http://localhost:3000/auth/callback`
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (secret). Management token used only for admin/migrations.
- ⚠️ **TWO OPEN ISSUES — see §3.**

### ✅ Fly.io — engine
- App **`mitasafi-engine`** created (org `personal` / PETER MUCHENDU). Dedicated IPv6 allocated.
- TLS cert for **`api.mitasafi.com`** requested; validation **pending** the nameserver switch.
- **Env var:** `FLY_API_TOKEN` (org deploy token — note: broad, covers all 10 personal apps).
- No deployment yet (empty app shell, staged).

### ✅ Cloudflare — DNS + front-end + Workers AI
- Account: `2085de7e…` ("Mitasafi89@gmail.com's Account").
- **Zone `mitasafi.com`** added — status **PENDING** (awaiting nameserver change).
  - **Nameservers to set at registrar:** `houston.ns.cloudflare.com`, `serena.ns.cloudflare.com`
- **Pages project `mitasafi`** → `mitasafi.pages.dev`; custom domains `mitasafi.com` + `www.mitasafi.com` attached (`initializing`; records auto-create on zone activation).
- **DNS records staged (all DNS-only / grey-cloud):**
  - Resend: `resend._domainkey` (TXT, DKIM), `rsend` + `send` (CNAME, SPF)
  - Fly: `api` → `mitasafi-engine.fly.dev`, `_acme-challenge.api` → `…flydns.net`
- **Workers AI:** image generation verified free (10k neurons/day). Best models: `@cf/black-forest-labs/flux-2-dev` (multipart input; cleanest) and `@cf/leonardo/phoenix-1.0` (richest).
- **Env vars:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (also used by Workers AI image gen).

### ✅ PayHero — payments (M-Pesa)
- Auth verified (Basic). Account `12038`, channel `12226` (CustomerPayBillOnline). Wallet + transactions readable.
- **Env vars:** `PAYHERO_API_USERNAME`, `PAYHERO_API_PASSWORD`, `PAYHERO_ACCOUNT_ID`, `PAYHERO_CHANNEL_ID`, `PAYHERO_BASIC_AUTH`.
- ⚠️ **Shared across the owner's other projects** — Mitasafi txns must be namespaced (unique `external_reference` + dedicated callback) or moved to a separate channel/account. **Code currently uses M-Pesa Daraja directly** (`src/app/api/payments/mpesa/*`) — PayHero integration is a **pending code change**.

### ✅ Resend — email
- Key valid (full-access). Sending domain **`mitasafi.com` verified** (DKIM + SPF), region `eu-west-1`.
- DNS records **ported into Cloudflare** (survive the nameserver switch).
- **Env var:** `RESEND_API_KEY`. Code already reads it (`src/lib/email/`, `src/lib/notifications/channels.ts`).

### ✅ Mapbox — maps
- Public token valid; styles, tiles, forward + reverse geocoding all 200.
- **Env var:** `NEXT_PUBLIC_MAPBOX_TOKEN`.
- **Before launch:** add a URL restriction (allow `mitasafi.com`, `*.mitasafi.com`, `localhost`) in the Mapbox dashboard.

### ✅ Google OAuth
- Web client created, **enabled in Supabase**. Client ID is public (`43758869417-…apps.googleusercontent.com`); secret stored in Supabase only.
- Google client config: JS origins = localhost/mitasafi.com/www/pages.dev; redirect URI = Supabase callback.
- ⚠️ **Consent screen must be published** (currently Testing mode = only added test users can log in) before public launch.

### ✅ Upstash Redis — rate limit
- DB **`mitasafi`** created (global, primary `eu-west-1`), endpoint `modest-bonefish-97497.upstash.io`. Live SET/GET/EXPIRE/DEL verified.
- **Env vars:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. (Management via `mitasafi89@gmail.com` + API key — provisioning only.)

### ✅ Cloudflare Workers AI — AI images (Kling/Recraft replacement)
- Free, highest-quality free tool tested. Models: **FLUX 2 [dev]** (icons/minimal, multipart body), **Leonardo Phoenix** (detailed scenes), Lucid Origin (badges).
- No video models (image only). "Video" achievable via generated frames + ffmpeg slideshow.
- Uses the same `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
- **Pending:** rewrite `scripts/generate-services-images.mjs` (currently Kling) to call Workers AI.

### ❌ Namecheap — dropped
- API returns `1011102` (API access not enabled / account not eligible). **Redundant** — DNS is on Cloudflare. Namecheap remains only the registrar for `mitasafi.com` (where the nameservers get changed).

### ❌ Recraft — rejected
- Key valid but API needs prepaid credits (balance 0; `not_enough_credits`). Superseded by free Cloudflare Workers AI.

---

## 2. DOMAIN

- **`mitasafi.com`** is the registered domain (`.co.ke`, `.io`, `.africa` are unregistered/available).
- Repo currently references `mitasafi.co.ke` in `next.config.ts` + ~22 places — **update to `mitasafi.com`** (or register `.co.ke`).
- **One manual step unblocks almost everything:** change `mitasafi.com` nameservers at the registrar to `houston.ns.cloudflare.com` / `serena.ns.cloudflare.com`. That activates the zone → Pages site, Fly cert, and email all go live.

---

## 3. OPEN ISSUES / BLOCKERS (must resolve during build)

1. **🔴 Supabase schema mismatch (biggest).** The live DB in `prxwxlxbroavvflsgjar` is **not the Mitasafi rentals schema** — it holds a *donations / stories / verification* app (18 tables: `users`, `stories`, `donations`, `verifications`…). The codebase expects `listings`, `profiles`, `bookings`, `service_providers`, etc. (all 404). **Decision needed:** migrate the Mitasafi schema into this project, or point at a different Supabase project. Nothing in the app will work against the current schema.
2. **🔴 RLS infinite recursion.** Every anon/publishable read returns `42P17: infinite recursion detected in policy for relation "users"`. The `admin_all_*` policies self-reference `users`. Needs a `SECURITY DEFINER` helper fix. **Not fixed** (Gate 8 — production RLS change held for go-ahead).
3. **🟠 Payments: Daraja → PayHero.** Code uses M-Pesa Daraja; decision is PayHero. Port the payment init/callback, with Mitasafi-namespaced references.
4. **🟠 Google Places → Mapbox Search Box.** `src/app/api/places/autocomplete/route.ts` still calls Google. Swap to Mapbox (test Nairobi estate/building coverage first).
5. **🟠 Kling → Workers AI.** `scripts/generate-services-images.mjs`.
6. **🟡 Repo domain refs** `mitasafi.co.ke` → `mitasafi.com`.
7. **🟡 ESLint broken.** No `eslint.config.*`; `next lint` removed in Next 16 → `npm run lint` fails. Add flat config.
8. **🟡 No CI.** `.github/` absent — 436 tests run nowhere. Add GitHub Actions.
9. **🟡 Pre-launch:** publish Google consent screen; add Mapbox token URL restriction.

(Already fixed this session, committed on this branch: the silent-signup auth bug `F3`, and the profiles-PII exposure.)

---

## 4. DEPLOY ENV-VAR CHECKLIST (names only — populate at deploy time)

**Front-end (Cloudflare Pages) + Engine (Fly):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_MAPBOX_TOKEN
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
NEXT_PUBLIC_APP_URL              # https://mitasafi.com
CRON_SECRET
# Payments (PayHero):
PAYHERO_API_USERNAME
PAYHERO_API_PASSWORD
PAYHERO_ACCOUNT_ID
PAYHERO_CHANNEL_ID
PAYHERO_BASIC_AUTH
# AI images (Workers AI) — server/script side:
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
# Google client id (public) if One-Tap added:
NEXT_PUBLIC_GOOGLE_CLIENT_ID
```
Google OAuth **secret** lives in Supabase, not in app env. Supabase Management token and Fly/Cloudflare tokens are **ops** credentials, not app runtime.

---

## 5. NEXT STEPS (the "real deal")

1. **Resolve the Supabase schema question** (migrate Mitasafi schema in, or switch project) — unblocks everything else.
2. Fix the **RLS recursion** (with go-ahead).
3. Point `mitasafi.com` nameservers at Cloudflare (user action) → activates zone/Pages/Fly/email.
4. Port **Daraja→PayHero**, **Google Places→Mapbox**, **Kling→Workers AI**.
5. Update repo domain refs; add ESLint flat config + GitHub Actions CI.
6. First deploys: front-end → Pages, engine → Fly.
