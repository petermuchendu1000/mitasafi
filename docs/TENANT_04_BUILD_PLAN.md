# Tenant experience: build plan

**Status:** proposed. Nothing in here is started.
**Evidence:** `TENANT-DESIGN-001`.
**Reading order:** `TENANT_01_CURRENT_STATE` → `TENANT_02_IDENTITY_AND_ACCESS` → `TENANT_03_EXPERIENCE_DESIGN` → this.

Each increment states its risk tier, what must be true before it starts, what proves it
worked, and whether it needs authorization. Increments are ordered by dependency: each one
is shippable and leaves the product no worse.

---

## Increment 0: unblock the unknowns

**Tier T1** (production reads only). **No authorization needed.**

Four facts gate the whole plan and none is established (`TENANT_02 §3.2`):

1. Is every `profiles.phone` OTP-verified, or can an email+password path write one unverified?
2. Can a user change their phone, and is the new one re-verified?
3. Is `tenants.phone` unique, and must `tenants.user_id` be non-unique? (a person may rent two homes)
4. How are phone numbers actually stored on live rows: `+254…`, `0…`, `254…`?

**Done when:** each has a `[VERIFIED]` answer with an EV-id.
**Why first:** (4) alone can make the whole linking design match nobody while appearing to work.

---

## Increment 1: the tenant may read their own row, and only their own columns

**Tier T0.** Changes who may read PII. **Needs authorization: yes, a migration.**

Two things, one change, because splitting them ships a leak (`TENANT_02 §2`):

- A security-barrier view `tenant_self` exposing the tenant-owned columns only, never
  `notes`, `blacklist_reason`, `created_by` or `metadata`.
- The tenant surface reads the view. `tenants` policies are untouched, so nothing a
  landlord sees changes.

**Verification, three channels:**

- static: the view definition lists the allowed columns and no others;
- SQL suite: as a linked tenant, `select notes from tenant_self` **errors**, and
  `select notes from tenants` returns nothing for another tenant's row;
- mutation: add `notes` to the view, prove the suite goes red, restore, prove restoration.

**Done when** all three pass and the mutant is killed.

---

## Increment 2: a tenant can become a user

**Tier T0.** **Needs authorization: yes**, a migration and a change to the signup path.

Implements `TENANT_02 §3.1`: phone match on verified OTP, claim code as fallback.

Must handle, each with a test:

- normalised comparison across `+254` / `0` / `254` forms;
- no match → claim code, not an error;
- more than one match → the tenant chooses, never an automatic pick;
- a tenant row already linked to another user → refuse, and say why;
- one user, several tenancies → allowed.

**Verification:** SQL suite for the link rule, including the refusal cases; a browser run of
a real signup that reaches a populated dashboard. **That browser run is the first time any
human will have seen the tenant dashboard with data in it** (`TENANT_01 §4`).

**Authorization request will be raised separately**, naming the migration and the exact
production effect, before anything is applied.

---

## Increment 3: a renter lands on their home

**Tier T1.** No production mutation. **No authorization needed.**

- `/dashboard` branches on a live lease (`TENANT_03 §2.1`).
- Tenant nav replaces the services sidebar for renters (`TENANT_03 §2.2`).
- Home screen (`TENANT_03 §3.1`).

**Verification:** component tests on the five status lines, including the boundaries
(`daysUntilDue === 0`, `daysLate === 1`); a browser run at 360 and 320px; mutants on each
status branch.

**Risk:** a person who is both a renter and a services customer must not lose the services
dashboard. A test covers that case specifically.

---

## Increment 4: Pay, Payments, Lease, Repairs

**Tier T1.**

Mostly re-shaping what `RentClient.tsx` already renders into the screens of `TENANT_03 §3`.

**Precondition: `RentClient.tsx` must be read in full first.** It is 972 lines and only ~230
have been read (EV-011). G2.1 is not satisfied and no edit may begin until it is.

Specific care:

- the no-payout-method state is the **live** state today and must be designed first, not last;
- a pending payment must be visible, not hidden;
- the lease document button must not ship until tenant read access to the bucket is verified;
- the landlord contact block is omitted until Increment 6 makes it readable.

---

## Increment 5: close the loops

**Tier T1.**

- repair status change → notice to `tenants.email`;
- payment confirmed → receipt notice to the tenant;
- both reuse `plan.ts` / `emit.ts` / `notification_log`, which exist and are tested.

**Note:** tenant notices do **not** depend on the identity link. They address
`tenants.email` (EV-015), so this increment delivers value even to tenants who never sign
up. It is the cheapest real improvement in this plan.

**Blocked on:** the notification schedule being enabled at all. `notification_log` is empty;
nothing has ever been sent (EV-015). `SITE_URL` and `CRON_SECRET` are outstanding.

---

## Increment 6: the tenant can see who their landlord is

**Tier T0** (new read policy on `profiles`, which holds email and phone for every user).

Narrowest possible: a tenant may read the name and phone of the landlord **on their own live
lease**, and nothing else. A view, not a table policy, for the same reason as Increment 1.

---

## Increment 7: more than one tenancy

**Tier T1.**

Today the page picks the first non-terminated lease and says nothing
(`src/app/dashboard/rent/page.tsx:87`). A tenant with two homes sees one of them and is not
told. Either a switcher, or an honest line naming the other tenancy. Not silence.

---

## Sequencing

```
0 unknowns
└─ 1 tenant_self view            T0, migration
   └─ 2 identity link            T0, migration + signup
      ├─ 3 landing + nav + home  T1
      │  └─ 4 the four screens   T1   (needs RentClient read in full)
      │     └─ 7 multi-tenancy   T1
      └─ 6 landlord contact      T0, migration
5 notifications                  T1, independent of 1-4, blocked only on the schedule
```

Increment 5 can start today and is the only one that can.

---

## What would make this plan wrong

Stated so it can be checked rather than discovered late:

- If `profiles.phone` turns out not to be reliably verified, Increment 2's phone match is an
  account-takeover vector and the design falls back to claim codes only (`TENANT_02 §3.2`).
- If the three live tenants have no accounts and no intention of making any, the whole plan
  serves nobody and the effort belongs in notifications (Increment 5) instead.
- If `tenants.metadata` holds landlord-private data, Increment 1's column list is wrong.

## Not checked

- Whether SMS to Kenyan numbers is funded in production.
- Whether the lease-documents storage bucket grants tenants read.
- Whether any human behind the three live tenant rows holds a MitaSafi account.
- `RentClient.tsx` in full.
