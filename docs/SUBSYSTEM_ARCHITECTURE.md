# SUBSYSTEM ARCHITECTURE

How the parts of Mitasafi relate, how each can run independently while depending on the
others, and what makes each one efficient.

**Grounding.** Every structural claim here was measured against the live project, not read
from a migration file. Live schema at the time of writing: **78 tables, 7 views, 1
materialized view, 277 functions (34 `SECURITY DEFINER`), 101 user triggers, RLS enabled on
78 of 78 tables, 182 policies.** Where something is unverified it says so. Companion
documents: `SPEC_VS_SCHEMA_CENSUS.md` (what is specified vs what exists) and
`SUBSYSTEM_UNIFICATION_PLAN.md` (the configuration layer).

---

## 1. What the system is

From the PRD: a **tenant-centric living ecosystem** for Nairobi County's 17 sub-counties,
joining property owners, tenants and service providers, with the tenant as the central user.
The problem it names is fragmentation — _"no continuity after lease signing"_ — and the
solution is one lifecycle: find a home → talk to the landlord → pay a deposit → book
move-in services → pay rent → keep using services → accumulate a Tenant Score.

The Service Constitution sharpens that into an engineering constraint:

> _"Mitasafi is not a listing platform. It is a trust institution. Growth is optional.
> Trust is irreversible. Ambiguity is fatal."_

That single line is why this architecture puts the database, not the application, at the
centre. Trust claims have to survive a careless deploy.

---

## 2. The twelve subsystems

### Product verticals

| #   | subsystem                                | live tables                   | what it owns                                                                           |
| --- | ---------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| 1   | **Services marketplace**                 | 44 (27 provider + 17 booking) | provider identity, capability, availability; the 5 booking flows; job lifecycle        |
| 2   | **Rental listings**                      | 6                             | vacancy advertisements, inquiries, waitlists, saved searches                           |
| 3   | **Property management**                  | 5                             | `buildings`, `units`, `tenants`, `leases`, `maintenance_requests`                      |
| 4   | **House hunting / vacancy verification** | **0**                         | _designed, unbuilt_ — 10 tables; the public truth of whether a unit is actually vacant |
| 5   | **Commercial listings**                  | 0 of its own                  | commercial columns on the shared `listings` table                                      |

### Cross-cutting services

| #   | subsystem              | live tables | what it owns                                                       |
| --- | ---------------------- | ----------- | ------------------------------------------------------------------ |
| 6   | **Identity**           | 3           | `profiles`, `user_roles`, `user_preferences` — the integration hub |
| 7   | **Money**              | 6           | commission bands/config, booking payments, payouts, wallet ledger  |
| 8   | **Trust**              | 5           | reviews, disputes, phone verification, blocks                      |
| 9   | **Notifications**      | 1           | in-app notifications; email and SMS live in `src/lib`              |
| 10  | **Admin & governance** | 5           | audit log, feature flags, announcements, metrics, authority model  |

### Infrastructure

| #   | subsystem     | live tables                      |
| --- | ------------- | -------------------------------- |
| 11  | **Geo**       | 2 — `locations`, `neighborhoods` |
| 12  | **Analytics** | 1 — `analytics_events`           |

---

## 3. How they actually relate

Every cross-subsystem foreign key in the live database:

```
                     ┌──────── IDENTITY (profiles) ────────┐
                     │        17 inbound FKs — the hub      │
        LISTINGS(8)──┘ PROPMGMT(6) SERVICES(1) BOOKING(1) MONEY(1)

  LISTINGS ──2──► PROPMGMT        BOOKING ──6──► SERVICES
                                  BOOKING ──4──► GEO
  MONEY ──3──► SERVICES  ──1──► BOOKING  ──1──► PROPMGMT  ──1──► IDENTITY
  TRUST ──2──► BOOKING   ──2──► SERVICES

  NOTIFICATIONS ── no edges      ADMIN ── no edges      ANALYTICS ── no edges
```

Three structural facts follow, and they are the whole integration problem:

**3.1 The rental half and the services half are not connected.** There is no foreign key in
either direction between `listings`/`units`/`leases`/`tenants` and `booking*`. Nor is there
an application-level join: 16 source files query the rental side, 42 query the services side,
and **the intersection is zero files**. They share exactly one thing, `profiles`.

The PRD's central promise is continuity after lease signing. That promise has no structural
existence. A tenant's lease and their service bookings cannot be joined except by user id.

**3.2 There are two location models.** `listings` carries free text `address`, free text
`area` and a raw `latitude`. `bookings` carries `service_location_id` referencing the
`locations` table. The rental side references `locations`/`neighborhoods` **zero times**. The
two halves cannot be searched on one geography.

**3.3 Notifications, admin and analytics are islands.** `notifications` has no foreign key to
whatever it is about, so nothing constrains a notification to a real booking or listing.
`audit_log` has no foreign keys and holds zero rows — there is no audit trail under a
constitution that calls itself governance law.

---

## 4. The contract that makes them independent

This is the important part, and it is **already built** — for roughly one and a half
subsystems. Nothing below needs inventing; it needs extending.

A subsystem is independent when it never touches another subsystem's tables. It reaches
them only through two named contracts, and the database enforces that it cannot cheat.

### 4.1 The read contract — views

| view                                 | read contract for                         |
| ------------------------------------ | ----------------------------------------- |
| `listings_public`                    | listings, as the public may see them      |
| `profiles_public`                    | identity, reduced to publishable identity |
| `provider_capacity_status`           | services, derived availability            |
| `verification_queue`                 | trust, work waiting on an operator        |
| `booking_full_details`               | booking, assembled across its 17 tables   |
| `commission_payment_audit`           | money, reconciliation                     |
| `bookings_with_legacy_busy`          | booking, compatibility shim               |
| `services_with_categories` (matview) | services taxonomy, precomputed            |

A consumer selects from the view. The owning subsystem may restructure its tables freely as
long as the view's shape holds. This is the cheapest possible decoupling and it costs no
network hop.

### 4.2 The write contract — `SECURITY DEFINER` functions

34 of the 277 public functions are `SECURITY DEFINER`. They are the named write surface.
Representative examples:

- `create_booking_with_capacity_check` — the only legal way to create a booking
- `settle_booking_payment`, `fail_booking_payment`, `expire_stale_booking_payments`
- `request_provider_payout`
- `check_provider_can_accept` / `_v2`
- `verify_phone_otp`
- `auto_confirm_completed_bookings`
- `commission_breakdown`, `commission_bands_active`, `commission_fee_cents` (read-side, but
  the same idea: the fee is computed in one place)

A caller invokes the function. It cannot assemble the write itself, so it cannot skip the
invariant.

### 4.3 The boundary — RLS, and revoked grants where it matters

RLS is enabled on **78 of 78 tables** with **182 policies**. Two tiers of strictness,
verified:

- **Tier 1 — policy-only.** `audit_log`, `api_keys`, `blocked_users`, `clusters`,
  `feature_flags` grant table-level write to `authenticated`, but their only permissive write
  policy names `service_role`. RLS is default-deny, so clients are blocked by policy.
- **Tier 2 — grant revoked as well.** `booking_payments`, `commission_config`,
  `commission_bands`, `provider_wallet_ledger`, `provider_payouts`, `reviews`, `bookings`
  have **no** write grant for `authenticated` at all. Belt and braces on money and trust.

**One exception, flagged not resolved.** `payments` — the legacy money table, 0 rows and 0
inserts ever — still has two permissive policies with `roles={public}`: _"Landlords can
insert payments for own leases"_ and the update equivalent. It is the only money table still
client-writable. Whether that is exploitable depends on the policies' `WITH CHECK` clauses,
**which have not been read.** Treat as a cleanup candidate pending that read.

### 4.4 The authority declaration

`system_authority_model` — 7 rows, locked `2026-11-03` — states in the database which layer
decides what:

| component            | authority  | enforcement                                                            |
| -------------------- | ---------- | ---------------------------------------------------------------------- |
| booking_creation     | database   | `create_booking_with_capacity_check` required; direct INSERT forbidden |
| capacity_enforcement | database   | triggers + SERIALIZABLE isolation                                      |
| state_transitions    | database   | state machine table + trigger                                          |
| availability         | database   | interval check function                                                |
| commitment_points    | database   | commitment level triggers                                              |
| service_capabilities | database   | immutable after first booking                                          |
| **pricing**          | **hybrid** | app calculates, database freezes after confirmation                    |

Six of seven say _the database decides and the application obeys_. This is the merge
contract, already written down. The gap is that only the services vertical honours it.

### 4.5 The derivation pattern, for facts nobody owns

`VACANCY_VERIFICATION_ARCHITECTURE.md` contains the most reusable idea in the repo:

> _"Never store a status. Store who said what, when, and from where — then derive the
> status, and let it expire."_

Three layers: **assertion** (a mutable column the owner keeps for their own books),
**observation** (an append-only ledger, never UPDATE, never DELETE), **derived state**
(written only by a `SECURITY DEFINER` function; no human may write it). The public product
reads layer 3 only.

This generalises well beyond vacancy. Provider reliability, listing freshness and tenant
score are all the same shape: a fact no single party has both the knowledge and the
incentive to maintain.

---

## 5. Making each subsystem efficient

Measured observations and the specific change each implies.

### 5.1 Shared state is currently per-machine

`src/lib/security/rate-limit.ts` is an in-process `Map`. Its own header says _"Not shared
across serverless instances"_ and _"Resets on server restart / cold start"_. Production runs
**2 machines** with `min_machines_running = 0` and `auto_stop_machines = "stop"`, so cold
starts are routine and a limit of 30 is effectively 60. An Upstash Redis database named
`mitasafi` is **already provisioned** (free tier, global, 10,000 cmd/s) and `@upstash/redis`
is **already a dependency with exactly one reference in the codebase — a comment**. Keep the
interface, swap the store. The test must span two processes, which the current
implementation cannot pass.

### 5.2 Read paths should go through views, not ad-hoc joins

`booking_full_details` assembles a booking across 17 tables once, in the database. Every
route that hand-rolls that join pays for it again and drifts from it. `src/lib/cache/queries.ts`
wraps reads in React `cache()`, which is request-scoped memoisation — useful, but it does not
reduce the number of distinct queries. Pushing the shape into a view does.

### 5.3 The taxonomy is already precomputed — use it

`services_with_categories` is the only materialized view. It holds 102 rows of reference data
that changes rarely. Reference data (`services`, `service_categories`, `service_subcategories`,
`neighborhoods` — 102/25/115/59 rows) is the ideal candidate for long-lived caching; it is
also the data every page needs.

### 5.4 Region and edge

Machines run in `jnb` (Johannesburg) for a Nairobi product — the nearest Fly region, and a
reasonable choice. But Cloudflare is **DNS-only**: every DNS record for `mitasafi.com` has
`proxied=false`, so there is no CDN or WAF in front of the app. Static assets and images are
served from the origin on every request. Enabling the proxy for static paths is the single
cheapest latency win available, and it adds a WAF the app currently does not have.

### 5.5 The cost of enforcement is real but correct

277 functions, 101 triggers and 182 policies are evaluated on the hot path. That is the price
of putting authority in the database, and it is the right trade for money and trust tables.
It is the wrong trade for reference data, which needs no RLS evaluation at all. Audit the
policies on read-only reference tables; a permissive `true` policy still costs a check.

### 5.6 Housekeeping with measured impact

- `npm ci` in the production image reports **41 vulnerabilities (10 low, 10 moderate, 18 high,
  3 critical)**. Not triaged.
- `caniuse-lite` is 11 months stale, so the build targets browsers by old data.
- Four `DYNAMIC_SERVER_USAGE` errors during static generation (provider dashboard pages using
  `cookies`); Next falls back to dynamic rendering, so those pages are never prerendered.
- `npm run lint` **cannot run at all**: ESLint 9 requires a flat `eslint.config.js` and the
  repo has none, while `package.json` defines `"lint": "eslint ."`.

---

## 6. Independent yet interdependent — the target state

Each subsystem owns its tables, publishes a view, exposes RPCs, and is forbidden from
touching anyone else's tables. Interdependence happens at four joints only:

1. **Identity** — every subsystem resolves a person through `profiles` / `profiles_public`.
   Already true: 17 inbound FKs.
2. **Money** — the only subsystem that legitimately spans both halves, and it already does
   (edges into services, booking, property management and identity). It is the proof the
   pattern works.
3. **Geo** — should be one model that both halves reference. Currently two, and the rental
   half references neither table.
4. **Events** — the join that does not exist yet. Notifications, audit and analytics are the
   three islands, and they are islands because no subsystem publishes events. An append-only
   event table referenced by all three is the same layer-2 pattern as `unit_observations`.

### Order of work, by how much of the thesis each restores

|     | change                                       | why                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Document the money schema**                | `commission_config`, `commission_bands`, `commission_payment_audit`, `provider_wallet_ledger` appear in **0 of 97 documents**. It is live, enforcing, and invisible to anyone reading the docs — the most dangerous combination in the system, because it will be changed by someone who does not know the invariants. |
| 2   | **Join the rental lifecycle to services**    | The product's reason to exist, absent in both schema and code.                                                                                                                                                                                                                                                         |
| 3   | **One location model**                       | Blocks unified search; cheap now, expensive after data exists.                                                                                                                                                                                                                                                         |
| 4   | **Config contract at boot**                  | 17 server-only variables the code reads are unset in production; four competing config surfaces. See `SUBSYSTEM_UNIFICATION_PLAN.md` P0-2.                                                                                                                                                                             |
| 5   | **Shared rate-limit store**                  | Infrastructure already paid for and unused.                                                                                                                                                                                                                                                                            |
| 6   | **Attach the three islands**                 | Gives the governance model something to audit.                                                                                                                                                                                                                                                                         |
| 7   | **Extend the authority model past services** | `system_authority_model` already declares it; make it true for listings and property management.                                                                                                                                                                                                                       |

### What should not be done

Do not split these into separate services or repositories. The integration layer is the
database, the contracts are views and RPCs, and the enforcement is RLS — all of which stop
working the moment a subsystem reaches another over HTTP with its own copy of the rules. The
one existing out-of-repo service, `mitasafi-engine`, has 0 machines, has never released, and
has live DNS at `api.mitasafi.com` pointing at nothing. Either deploy it with a stated
purpose or remove the record.

---

## 7. What this document does not establish

- The `payments` policies' `WITH CHECK` clauses were **not read**; the exposure in §4.3 is
  unquantified.
- None of the 182 policies or 277 functions were individually reviewed. The counts are
  measured; the correctness is not assessed.
- The subsystem boundaries are **inferred** from foreign keys and names. No document states
  them.
- Efficiency claims in §5 are structural, not benchmarked. No load test, query plan or
  latency measurement was taken.
- Tenant Score and escrow are named in the PRD and have no schema design anywhere — they are
  listed as absent, and their intended shape is unknown.
