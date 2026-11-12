# MITASAFI — SUBSYSTEM UNIFICATION PLAN

**Status:** proposal awaiting authorization. No production mutation has occurred.
**Repo SHA this plan was written against:** `b293c3c2a2d19f37e42cb41fbd9bbf146214bb19`
(branch `claude/optimistic-brahmagupta-hk6a7t`, clean tree).
**Evidence ledger:** `MITASAFI-SETUP-001.md`, 41 entries, EV-000..EV-040. Every claim below
cites one. Claims without an EV-id are not in this document.
**Sandbox baseline at this SHA:** `tsc --noEmit` exit 0; `jest --ci --runInBand` → 21/21
suites, **606 passed / 0 failed / 0 skipped / 0 cancelled / 0 not-run** (EV-024). The SQL
suites and the migration-idempotency checker were **not** run — they need a local Postgres,
which this sandbox cannot reach (EV-006).

---

## 1. THE ACTUAL DIAGNOSIS

"Disjointed" is not vagueness here; it has a precise, measurable shape. Two findings explain
nearly every symptom.

### 1.1 There are four independent configuration surfaces and no single source of truth

| Surface                              | What it declares                                                 | Authority today                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `.env.example` (80 lines)            | SendGrid, Google Maps, Sentry, PostHog, M-Pesa, Africa's Talking | **stale** — documents 4 providers the code does not use and omits every variable it does (EV-026) |
| `Dockerfile` ARG block (lines 24-30) | 7 `NEXT_PUBLIC_*` build args                                     | compile-time truth for the client bundle                                                          |
| Fly secrets                          | **exactly 4** values                                             | runtime truth for the server (EV-027)                                                             |
| Supabase project config              | auth providers, redirect allowlist, SMS provider                 | runtime truth for identity (EV-010)                                                               |

Nothing reconciles them, and nothing fails when they disagree. The measured disagreement:

- **17 server-only variables the code reads are unset in production** (EV-028):
  `CRON_SECRET`, `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `SMS_ENABLED`,
  `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`,
  `MPESA_CALLBACK_URL`, `MPESA_ENVIRONMENT`, `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`,
  `GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`.
- **2 of the 4 production secrets are read by no code at all**: `GOOGLE_CLIENT_SECRET` and
  `SUPABASE_PROJECT_ID` (EV-028). `GOOGLE_CLIENT_SECRET` appears only in `.env.example:20`,
  a `Dockerfile:10` comment, and a doc — never in `process.env` (EV-025).

A boot-time contract would have made all 19 of these loud on day one. There is no such
contract, so the system degrades silently instead of refusing to start.

### 1.2 Six capabilities have two competing implementations

| Capability        | Implementation A                                                      | Implementation B                                                                  | Which is live                                                                                    |
| ----------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Hosting           | `fly.toml` → app `mitasafi-web`                                       | `vercel.json` (3 crons)                                                           | **Fly** (EV-029). Vercel serves nothing.                                                         |
| Payments          | Safaricom Daraja direct — 4 API routes, `mpesa.ts`, `mpesa-config.ts` | PayHero credentials supplied; **zero code**                                       | **Daraja**, and it is `configured:false` (EV-031, EV-037)                                        |
| Maps              | `mapbox-gl` dep + `NEXT_PUBLIC_MAPBOX_TOKEN`                          | `GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | neither is set in prod (EV-028)                                                                  |
| Email             | `resend` dep, `RESEND_API_KEY` ×6 refs, domain verified               | `SENDGRID_API_KEY` in `.env.example`                                              | **Resend** (EV-018, EV-026)                                                                      |
| Supabase API keys | legacy JWT `anon`/`service_role` — what all code reads                | new `sb_publishable`/`sb_secret`                                                  | **both live**; prod holds the _new_ secret key under the _legacy_ variable name (EV-009, EV-031) |
| Rate limiting     | in-process `Map` (`rate-limit.ts`)                                    | `@upstash/redis` installed, Upstash DB provisioned                                | **in-process**, unused dep (EV-023, EV-036)                                                      |

Plus two Fly apps where the repo describes one: `mitasafi-engine` has **0 machines**, has
never released, serves `api.mitasafi.com` via live DNS, and is referenced **nowhere** in this
repository (EV-015).

---

## 2. WHAT TO WORK ON FIRST — ORDERED, WITH JUSTIFICATION

The order is not by severity alone. P0-2 precedes the payment work because every later fix
needs a configuration contract to be verifiable against; without it each fix is another
undetectable drift.

### P0-1 — Close the unauthenticated cron endpoint _(security; no decisions needed; ~30 min)_

**The finding.** An unauthenticated `GET https://mitasafi.com/api/cron/search-alerts?frequency=instant`
returned `200 {"success":true,"message":"No new listings","processed":0}` (EV-030).

**Why it is open.** `src/app/api/cron/search-alerts/route.ts:41-44` fails _open_:

```ts
if (!cronSecret) {
  console.warn("[Cron] CRON_SECRET not configured, allowing request");
  return true;
}
```

`CRON_SECRET` is absent from Fly secrets (EV-027), so that branch is the live one. Three
independent channels agree: the runtime HTTP response, the static code, and the deployment
secret inventory.

**Reachable blast radius.** Past the guard, `route.ts:184-197` calls
`sendSearchAlertNotification` per matching alert, and `route.ts:204-210` writes to
`search_alerts` through the service-role client, which bypasses RLS. So an anonymous caller
can drive outbound email to addresses they do not control and mutate rows, bounded by how
many verified alerts match listings published in the window.

**Scope honesty.** My call returned `processed:0`, meaning execution returned at
`route.ts:107-111` _before_ the email loop. I established **reachability, not exploitation**,
and mutated nothing (EV-030).

**Fix — both halves, in this order:**

1. Code: invert the default. Absent secret must **deny**, not allow. Delete the
   `if (!cronSecret) return true` branch; keep the `NODE_ENV === "development"` bypass only
   if you want it, and gate it on `NODE_ENV === "development"` _and_ an explicit opt-in, the
   same two-key pattern `mpesa-config.ts:269-271` already uses for insecure callbacks.
2. Config: set `CRON_SECRET` on Fly before deploying the stricter code, or the job stops
   running the moment the fix ships.

**Verification that can fail (G8.2).** Before the fix: assert the unauthenticated call
returns 200 — it does, and that is the red test. After: unauthenticated → 401; wrong bearer →
401; correct bearer → 200. Add a jest case asserting `verifyCronSecret` returns `false` when
`CRON_SECRET` is unset; run it against the _current_ code first and watch it fail.

**Rollback.** Code revert is a redeploy. Note it does **not** un-send any email already sent,
and does not reverse `search_alerts` row updates (G12.5).

**Authorization required:** yes — setting a Fly secret and deploying to production.

---

### P0-2 — One configuration contract, enforced at boot _(unblocks everything after it)_

**Why first among the structural work.** Section 1.1 shows 19 measured config defects that no
check would catch. Fix the detector before the symptoms, or you will fix the symptoms twice.

**Deliverables.**

1. `src/lib/env.ts` — a single zod schema (zod ^3.24.1 is already a dependency) that is the
   _only_ place `process.env` is read. Three groups: client (`NEXT_PUBLIC_*`), server-required,
   server-optional-with-explicit-default. Parse once at module load; throw listing **every**
   missing variable at once, not the first.
2. Replace all 27 direct `process.env.*` reads (EV-025) with imports from it. Highest-count
   call sites first: `SUPABASE_SERVICE_ROLE_KEY` (21), `NEXT_PUBLIC_SUPABASE_URL` (20),
   `NEXT_PUBLIC_APP_URL` (7), `RESEND_API_KEY` (6).
3. Regenerate `.env.example` **from the schema**, so it cannot drift again. Delete the
   SendGrid, Sentry and PostHog entries — no dependency or code reference exists for any of
   them (EV-026).
4. `scripts/check-env.mjs` — reads the schema, compares against a target environment's
   variable **names**, exits non-zero on a missing required one. Add it to CI, which today has
   no configuration validation at all (EV-039).
5. `scripts/deploy-fly.sh` — one command that passes every `NEXT_PUBLIC_*` build arg from a
   single source. Today those 7 args (`Dockerfile:24-30`) are supplied by hand, which is why
   `NEXT_PUBLIC_SUPABASE_URL` is baked (EV-033) while others are unverified.

**Decision embedded here — Supabase key generation.** Production stores the **new
`sb_secret_…`** key in the variable named `SUPABASE_SERVICE_ROLE_KEY` (EV-031), while the code
and every doc assume a legacy JWT. Both generations are live and enabled (EV-009). Recommended:
keep the new keys, rename the variables to `SUPABASE_SECRET_KEY` / `SUPABASE_PUBLISHABLE_KEY`
so the name states the truth, and do it inside this refactor since it already touches all 24
of those call sites. **Caveat:** `src/lib/supabase/middleware.ts:11` documents
`jwtVerify(token, process.env.SUPABASE_JWT_SECRET || NEXT_PUBLIC_SUPABASE_ANON_KEY)`.
`SUPABASE_JWT_SECRET` is unset in production (EV-028) and an anon key is **not** a signing
secret. Read that file completely and trace the fallback before touching key names — I have
**not** done so, so its real behaviour is `[UNKNOWN]`.

**Verification that can fail.** Delete one required variable; `npm run build` and
`check-env` must both fail with that variable named. Prove it red before claiming it works.

---

### P0-3 — Resolve the payment rail _(T0; blocked on your decision)_

**The finding.** The app's own authenticated health check says, verbatim (EV-031):

```json
{
  "configured": false,
  "environment": null,
  "baseUrl": null,
  "shortcode": null,
  "callbackUrl": null,
  "tokenAcquirable": false,
  "tokenError": null,
  "credentials": {
    "consumerKey": "missing",
    "consumerSecret": "missing",
    "passkey": "missing",
    "shortcode": "missing",
    "callbackUrl": "missing",
    "environment": "production"
  }
}
```

Every M-Pesa credential is missing in production while `environment` resolves to
`"production"`. The payment path cannot complete a charge.

Meanwhile the credentials you supplied are **PayHero**, and PayHero has no implementation —
it appears in exactly three places, all comments (EV-037):
`payments-internal.ts:136`, `20260324000000_payment_settlement_integrity.sql:66`,
`20260328000000_flat_rate_no_fee_floor.sql:29`. There is no PayHero base URL, client, or
credential read anywhere in 908 tracked files.

**This is a fork and I will not pick it for you.**

- **Option A — Daraja direct (code exists, credentials do not).** Needs a Safaricom Daraja
  app and Go-Live approval, then 6 secrets. The existing implementation is substantial and
  defensively built: derived timeouts, a Safaricom-range IP allowlist for callbacks, and
  settlement that re-queries Safaricom rather than trusting the callback
  (`payments-internal.ts:132-149`).
- **Option B — PayHero (credentials exist, code does not).** An aggregator; faster to get
  live in Kenya, no Go-Live gate. Costs a new provider integration **on the money path** —
  STK push, status query, callback verification, idempotency, and reconciliation — plus
  per-transaction merchant fees the commission model does not currently account for.
  `20260328000000_flat_rate_no_fee_floor.sql:29-37` already records this: PayHero charges
  KES 6 per transaction for totals of 50-499, so at a flat 10% a KES 50 job earns KES 5
  against a KES 6 cost, and `commission.ts` "has no term for the processing cost either way".

**Until this is decided, do not touch payment code.** Whichever way it goes, the settlement
invariants in `20260324000000_payment_settlement_integrity.sql` (provenance +
`claimed_amount` tripwire + `amount_mismatch`) must be preserved, and the no-amount-comparison
reasoning at `payments-internal.ts:135-143` re-verified against the chosen provider's actual
status-response fields — the existing note asserts neither provider returns an amount.

**Interim safety, independent of the choice:** if any UI currently offers payment, it should
be disabled while `configured:false`, so users cannot start a flow that cannot finish. I have
**not** traced which UI entry points are reachable — `PaymentForm.tsx` and
`dashboard/bookings/[id]/payment/page.tsx` exist but I did not read them. `[UNKNOWN]`

---

### P1-1 — Collapse the hosting story to one platform

Production is Fly (EV-029). `vercel.json` is the **only** scheduler for the search-alerts job
(EV-035), and `fly.toml` has no cron stanza — so the instant/daily/weekly alerts have no
scheduler on the platform that actually serves traffic. The feature is dead on a timer that
does not exist.

Pick one and delete the other:

- **Stay on Fly:** delete `vercel.json`; schedule the three frequencies with a Fly scheduled
  machine, or an external scheduler hitting the URL with the `CRON_SECRET` bearer from P0-1.
- **Move to Vercel:** delete `fly.toml` and `Dockerfile`, repoint DNS.

Two further Fly facts for this decision: `min_machines_running = 0` with
`auto_stop_machines = "stop"` means a cold start on the first request after idle — fine for a
site with no traffic, and the comment in `fly.toml` says so deliberately — and `currentRelease`
is version **7** while the running image is tagged **v8-a00c09c** (EV-014). I have not
explained that mismatch; it is `[UNKNOWN]` and worth resolving before you trust "what is
deployed" to mean anything.

### P1-2 — Make Google sign-in work, or remove the button

`login/page.tsx:194-195` and `signup/page.tsx:339-340` both call
`signInWithOAuth({provider:"google"})`, but at Supabase `external_google_enabled=false` with
client id and secret **EMPTY** (EV-010, EV-034). The credentials sit on Fly, where no code
reads them (EV-028). The exchange happens at Supabase, so that is where they belong.

Also: `uri_allow_list` is `"http://localhost:3000/**,http://localhost:3000"` while
`site_url` is `https://mitasafi.com` (EV-010). Production redirect URLs are not allowlisted,
which affects OAuth **and** email confirmation and password-reset links. Fix both together:
enable the provider with the verified credentials (EV-020), add the production callback to
`uri_allow_list`, and add the Supabase callback URL to the Google console.

### P1-3 — WITHDRAWN: `/listings` 404 is correct behaviour, not a defect

An earlier revision of this document listed the production `/listings` 404 as a defect. It is
not one. There is no `page.tsx` at `src/app/listings` — only `[slug]/page.tsx` — so `/listings`
was never a route. A production build's own emitted route table confirms it: the manifest
contains `ƒ /listings/[slug]` and no `/listings` entry. Nothing to fix. The item is kept here
rather than deleted so the correction is on the record.

### P1-4 — Move rate limiting to the Upstash database that already exists

`rate-limit.ts` is an in-process `Map`, and its own header says it is "Not shared across
serverless instances" and "Resets on server restart / cold start" (EV-036). With **2 machines**
provisioned (EV-014) a limit of 30 is effectively 60, and `min_machines_running=0` makes the
resetting cold start routine rather than rare. `@upstash/redis` is already installed and
unused, and an Upstash database named `mitasafi` is already provisioned, active, with REST
tokens available (EV-023). This is the cheapest real hardening on the list: the dependency and
the infrastructure are both already paid for.

Keep the existing interface so call sites do not change; swap the store. Verification must
include a two-process test — one process must observe the other's increments, which the
current implementation cannot do, so the test fails red against today's code.

### P2 — Consolidation and cleanup _(no decisions, low risk, do opportunistically)_

- **Maps:** decide Mapbox or Google and delete the loser's variables. Note
  `/api/places/autocomplete` exists and `GOOGLE_PLACES_API_KEY` is unset in production
  (EV-028, EV-032) — that route's live behaviour is `[UNKNOWN]`; I did not call it.
- **Kling:** the supplied key works, in the `KLING_API_KEY` single-key shape the code already
  supports (EV-021). But its task history is **empty**, and the in-repo comment at
  `generate-missing-people-images.mjs:60-62` states the access/secret **pair** resolves to a
  different account whose history held 194 tasks. So this key is a different account from the
  one that generated the existing images. Confirm it has credit before relying on it. Scripts
  only — not app runtime, so this is genuinely low priority.
- **Dead config:** remove the Fly secrets `GOOGLE_CLIENT_SECRET` and `SUPABASE_PROJECT_ID`
  once P1-2 moves the former to Supabase (EV-028).
- **Stray tracked artifacts:** the file named `1` is a captured dev-server log containing
  `ENOTFOUND syoolvgoaqnckgmngvse.supabase.co` — the dead project `next.config.ts:4-11` was
  changed to protect against. `dump_out.sql` and `listings_dump.sql` are 0 bytes (EV-038).
  Delete all three.
- **`mitasafi-engine`:** 0 machines, never released, `api.mitasafi.com` CNAMEd to it and
  resetting connections, zero references in this repo (EV-015). Either deploy it or remove the
  DNS record; live DNS pointing at nothing is a trap for whoever reads the zone next.
- **Cloudflare:** every record for `mitasafi.com` is `proxied=false` (EV-017), so the zone is
  DNS-only — no CDN or WAF in front of the app despite Cloudflare being in the stack. That is
  a deliberate-looking choice worth confirming, not a defect.
- **CI gaps (EV-039):** no `npm run lint` step although `package.json` defines one; no
  `next build`; no config validation; no secret scanning. Add lint and the P0-2 `check-env`.
  The migration job is genuinely good — clean-room apply with an `applied == expected`
  assertion — keep it as the model for the rest.

---

## 3. CREDENTIAL VERIFICATION RESULTS

Every probe that could pass was run with a control that **failed**, so a pass means something
(G8.2). No secret value was printed, logged, or committed at any point.

| Provider                                   | Status                                      | Evidence                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase — management token `sbp_`         | **VERIFIED**                                | 2 projects listed (EV-003)                                                                                                                   |
| Supabase — `sb_secret`                     | **VERIFIED**                                | PostgREST 200 (EV-002); is what prod holds (EV-031)                                                                                          |
| Supabase — `sb_publishable`                | **VERIFIED**                                | `/auth/v1/settings` 200 (EV-009)                                                                                                             |
| Supabase — legacy anon + service_role JWTs | **VERIFIED** (retrieved via management API) | both 200, roles decoded (EV-009)                                                                                                             |
| Supabase — direct Postgres URL             | **NOT VERIFIABLE HERE**                     | hostname has no address record; pooler TCP refused on 6543 and 5432 (EV-005, EV-006)                                                         |
| Fly.io org token                           | **VERIFIED**                                | 13 apps, app + machine reads (EV-012, EV-014)                                                                                                |
| Resend                                     | **VERIFIED**                                | `mitasafi.com` verified sending domain (EV-018)                                                                                              |
| Mapbox                                     | **VERIFIED**                                | `TokenValid`; live geocode of Nairobi (EV-019)                                                                                               |
| Google OAuth client id + secret            | **VERIFIED**                                | `invalid_grant` with real secret vs `invalid_client` with wrong one (EV-020)                                                                 |
| Upstash                                    | **VERIFIED**                                | DB `mitasafi` active; both controls 401 (EV-023)                                                                                             |
| Kling                                      | **VERIFIED**                                | `code:0 SUCCEED`; garbage key 401 (EV-021)                                                                                                   |
| **Cloudflare `cfat_` token**               | **UNKNOWN — unverifiable**                  | this session's proxy injects its own CF credential and overrides the header: identical 200 with no header and with a garbage header (EV-016) |
| **Namecheap**                              | **FAILED**                                  | `Error 1011102` "API Key is invalid or API access has not been enabled", egress IP `160.79.106.144` (EV-022)                                 |

Two notes on the failures. **Cloudflare** is an artefact of this sandbox, not evidence about
your token — verify it from a normal machine. **Namecheap**'s message conflates two causes
(API access disabled vs. IP not whitelisted) and I could not discriminate them; it may also be
moot, since `mitasafi.com` runs on Cloudflare nameservers (EV-017), leaving Namecheap as
registrar only.

---

## 4. AUTHORIZATION GATES

No production mutation has happened. Each item below is a separate gate; none is implied by
approving another, and approving one does not extend to the next (G13).

| #   | Operation                                        | Target             | Reversible?                                                  |
| --- | ------------------------------------------------ | ------------------ | ------------------------------------------------------------ |
| A-1 | set `CRON_SECRET`                                | Fly `mitasafi-web` | yes (unset)                                                  |
| A-2 | deploy fail-closed cron guard                    | Fly `mitasafi-web` | yes (redeploy) — but does **not** un-send email already sent |
| A-3 | enable Google provider + extend `uri_allow_list` | Supabase project   | yes                                                          |
| A-4 | set payment secrets                              | Fly `mitasafi-web` | yes, but enables money movement — needs P0-3 decided first   |
| A-5 | remove dead Fly secrets                          | Fly `mitasafi-web` | yes                                                          |
| A-6 | delete or repoint `api.mitasafi.com`             | Cloudflare DNS     | yes                                                          |

---

## 5. WHAT THIS PLAN DOES NOT ESTABLISH

Stated as prominently as the findings, because the gaps change what you should trust (L7).

1. **No live schema inspection beyond counts.** 78 tables, 277 functions, 182 RLS policies,
   34 `SECURITY DEFINER` functions, 101 triggers (EV-007). Not one was read. No claim here
   rests on their correctness, and none should.
2. **Migration ledger matched only by count**, 105 applied vs 105 appliable (EV-008). The
   per-version **set** comparison was not run, so "the ledger matches" is weaker than it
   sounds. Commit `6c3c9db`'s subject still carries the literal marker `[NOT YET APPLIED]`.
3. **SQL suites and idempotency checker not executed** (EV-024) — no local Postgres reachable.
4. **Financial state never queried.** No payment, booking, or ledger row was read. This
   document contains **no** financial impact figure, and cannot without full record-lifecycle
   tracing (G17.3).
5. **`/listings` 404 not diagnosed** (EV-032). **`/api/places/autocomplete` never called.**
   **`middleware.ts` JWT fallback not traced.** **Payment UI reachability not traced.** All
   `[UNKNOWN]`.
6. **Client bundle scan was partial** — 16 homepage chunks, 904KB (EV-033). It cannot support
   any claim that a `NEXT_PUBLIC_*` value is absent, and EV-032 falsifies that reading for the
   anon key.
7. **RESOLVED, and it mattered.** The deployed image `v8-a00c09c` maps to commit
   `a00c09c4f91bcde79d55e9043c70ef937019c22e`, the head of branch
   `claude/laughing-albattani-1funro`. It is **not** an ancestor of this branch: the two
   diverged at `main`. The deployed branch carries three commits that were missing here — an
   MX-records/unregistered-domain fix, a transactional-mail Reply-To fix, and an email
   refactor. A deploy from this branch's earlier tip would have applied 1,501 deletions and
   reverted all of it. The fix was to rebase onto the deployed commit so the release is purely
   additive. **The underlying process defect is that `main` was three commits behind
   production** — live work had never been merged back. That is this document's thesis showing
   up in the git history rather than in the configuration, and it is the most dangerous
   instance of it found so far, because the divergence is invisible unless you diff against
   what is actually deployed rather than against `main`.
8. **GitHub Actions status for this SHA not queried** (EV-039).
9. **Fly token write capability never tested** — deliberately, since testing it means mutating.
10. **Only one repository was in scope.** `petermuchendu1000/mitasafi` was already cloned;
    this session cannot enumerate others, so if "repositories" meant more than this one, say
    which and they can be attached.
