# Tenant experience: what is true today

**Status:** audit, complete. **Date:** 2026-11-27.
**Evidence ledger:** `TENANT-DESIGN-001` (EV-001..EV-011).
**Repo SHA at time of audit:** `fc90467`, clean tree (EV-001).

Every claim below is labelled. `[VERIFIED]` means observed in this audit, against the
environment named. Nothing here is recalled from memory or inferred from a migration file.

---

## 1. The headline

> **A tenant cannot reach their own dashboard. Not rarely. Never, and by construction.**

The chain, each link verified:

| #   | Fact                                                                                                                                                         | Evidence                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | `/dashboard/rent` resolves the tenant with `tenants.user_id = auth.uid()` before anything else, and renders `state="not-a-tenant"` when that returns nothing | `src/app/dashboard/rent/page.tsx:65-76`    |
| 2   | All six tenant read policies and the one write policy pivot on the same predicate                                                                            | EV-010                                     |
| 3   | On production, `tenants` holds 3 rows and **0** have `user_id` set                                                                                           | EV-007                                     |
| 4   | Exactly one function in the database writes to `public.tenants`: `create_tenancy`                                                                            | EV-008                                     |
| 5   | Its payload comes from `buildTenancy()`, whose tenant object has ten keys and **no `user_id`**                                                               | `src/lib/landlord/tenancy-form.ts:352-364` |
| 6   | No non-internal trigger exists on `auth.users`, so nothing backfills the link at signup                                                                      | EV-009                                     |

**FALSIFICATION TEST:** if any function or trigger backfilled `tenants.user_id`, the link
would be made at signup and this conclusion would be wrong.
**METHOD:** every function in `public` and `auth` whose body contains an INSERT or UPDATE
against `tenants`; every non-internal trigger on `auth.users`.
**RESULT:** one function, no triggers (EV-008, EV-009).
**CONCLUSION STATUS: SURVIVED.**

The data model for a tenant is complete, consistent and correct. It is gated behind one
column that nothing sets. **This is an identity gap, not a data gap**, and it is the first
thing any tenant work has to solve. [VERIFIED, prod + repo]

---

## 2. What exists

### 2.1 Routes

86 page routes in the product (EV-002). Exactly **one** is about renting a home:

```
/dashboard/rent        "My home"
```

Everything else a signed-in non-landlord, non-provider sees is the **services** product,
hiring a plumber rather than renting a home:

```
/dashboard                      services dashboard  (the tenant's landing page)
/dashboard/bookings  + 6 children
/dashboard/bookings/messages
/dashboard/saved-providers
/dashboard/reviews
```

Shared with everyone: `/dashboard/notifications`, `/dashboard/profile`,
`/dashboard/settings`, `/saved`, `/searches`. [VERIFIED, repo]

### 2.2 Where a tenant lands

`/dashboard` routes landlords and providers away, then renders the services dashboard for
everyone else. A tenant with no other role is the fall-through case: there is no `tenant`
branch. The page greets them with **"Here's what's happening with your services"** and
shows bookings, upcoming jobs, service spend and a service activity feed. Nothing on it
concerns their home, rent, lease, landlord or deposit. [VERIFIED, `src/app/dashboard/page.tsx:1-171`, read in full, EV-003]

`/dashboard/rent` is reachable as the second of eight sidebar items, labelled "My Home". It
is **0 of 4** quick actions. [VERIFIED, EV-004]

### 2.3 What `/dashboard/rent` covers

Three states: `not-a-tenant`, `no-lease`, `ok`. When `ok`, five tabs:

```
Pay | Statement | Payments | Lease | Repairs
```

[VERIFIED, EV-011. Note: `RentClient.tsx` is 972 lines and only lines 1-60 and 350-520
were read. G2.1 is **not** satisfied for that file and no edit to it is proposed until it is.]

### 2.4 The read surface a tenant has

Six tables, by RLS policy, every one pivoting on `tenants.user_id = auth.uid()` (EV-010):

| Table                     | Policy                                    | Reach                                   |
| ------------------------- | ----------------------------------------- | --------------------------------------- |
| `tenants`                 | Users can view own tenant record          | own row                                 |
| `leases`                  | Tenants can view own leases               | own leases                              |
| `units`                   | `units_tenant_read`                       | units under those leases                |
| `buildings`               | `buildings_tenant_read`                   | buildings of those units                |
| `payments`                | `payments_tenant_read`                    | payments on those leases                |
| `maintenance_requests`    | Tenants can view own maintenance requests | own requests                            |
| `landlord_payout_methods` | `lpm_tenant_read`                         | the landlord's method for that building |

Writes: exactly one, `maintenance_tenant_insert` on `maintenance_requests`. A tenant can
report a repair and change nothing else. [VERIFIED, prod, EV-005/EV-010]

---

## 3. What does not exist

Each of these is an absence established by a bounded search, not an assumption. Search
space: 853 tracked `.ts`/`.tsx`/`.sql` files (EV-008). **Not searched:** `node_modules`,
build output, the Supabase project's own SQL editor history.

| Missing                                       | Consequence                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Any way to link a tenant to a user account    | the entire tenant surface is dark (§1)                                                                                                                                                                                                                                                                                   |
| A tenant landing page                         | a renter's home page is about plumbers                                                                                                                                                                                                                                                                                   |
| Any notification actually delivered           | `notification_log` is empty: **not one notice of any kind has ever been sent on production** (EV-015). Tenant notices are coded (`invoice_due_soon`, `invoice_due_day`, `invoice_late`, `lease_expiring`) and addressed to `tenants.email`, so they do **not** depend on the identity link. The schedule is not enabled. |
| A payment receipt to the tenant               | a tenant has no proof MitaSafi recorded their rent                                                                                                                                                                                                                                                                       |
| A way to see or download the lease document   | `lease_document_url` is passed to the client but there is no tenant-side document list                                                                                                                                                                                                                                   |
| Any tenant-initiated anything except a repair | one INSERT policy in the whole product                                                                                                                                                                                                                                                                                   |

---

## 4. What this audit did not check

Stated as prominently as what it did (L7):

- **`RentClient.tsx` was not read in full.** 972 lines; ~230 read. Its tab contents are
  `[UNKNOWN]`.
- **No browser measurement of any tenant screen was taken in this audit.** The mobile pass
  earlier in this branch measured `/dashboard/rent` at 360px and it was clean, but that was
  the `not-a-tenant` or `no-lease` state, because no account can reach `ok` (§1).
  **No one has ever seen the populated tenant dashboard.**
- **`maintenance_tenant_insert`'s WITH CHECK was not re-read** in this audit.
- **Whether any tenant has ever signed up at all** was not established. 3 tenant rows exist;
  whether the humans behind them hold MitaSafi accounts is `[UNKNOWN]`.
- **Email deliverability to tenants** was not tested.
- Searches covered tracked source and the live database only.
