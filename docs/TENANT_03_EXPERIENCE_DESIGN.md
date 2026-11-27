# Tenant experience: design

**Status:** design, for review.
**Evidence:** `TENANT-DESIGN-001`. Depends on `TENANT_02_IDENTITY_AND_ACCESS.md` being
settled first; none of this is reachable until it is.

---

## 1. What a tenant is actually for

A renter opens this product to answer one of three questions. Nothing else earns a screen.

1. **Am I straight with my landlord?** What do I owe, by when, and can I prove what I paid.
2. **Something is broken.** Tell someone, and see that it was heard.
3. **What did I agree to?** Rent, dates, deposit, notice, the document itself.

Everything below is one of those three or is cut.

### 1.1 Rules this design is held to

| Rule                      | Meaning here                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| **Mobile first**          | Designed at 360px, then allowed to grow. No screen is designed at desktop and squeezed.             |
| **Minimal words**         | A label and a number beat a sentence. No screen explains itself twice. Help lives on the help page. |
| **No em dashes**          | House rule for all copy, applied across this branch already.                                        |
| **Natural language**      | "You owe KES 85,000" not "Outstanding balance: KES 85,000".                                         |
| **One job per screen**    | If a screen has two jobs it is two screens.                                                         |
| **Never invent a number** | Every figure traces to a row the tenant is allowed to read. A blank is honest; a guess is not.      |
| **44px targets**          | Established and enforced across this branch.                                                        |

---

## 2. Information architecture

### 2.1 The landing page must change

Today a tenant lands on the services dashboard and is told "Here's what's happening with
your services" (EV-003). A renter's home page is about plumbers.

**`/dashboard` must branch on tenancy, as it already branches on landlord and provider.**

```
/dashboard
  landlord            -> /dashboard/landlord        (exists)
  service_provider    -> /dashboard/provider        (exists)
  has a live lease    -> tenant home                (NEW)
  otherwise           -> services dashboard         (exists, unchanged)
```

A person can be both a renter and someone who books a plumber. The services dashboard does
not disappear; it moves to a nav item. A tenant who also hires providers keeps both.

### 2.2 Navigation

Five items. The current sidebar has eight, built for the services customer (EV-004).

```
Home        rent position, anything that needs them
Pay         how to pay, and what for
Repairs     report, and track
Lease       terms, dates, document
Services    the existing services dashboard, demoted to a nav item
```

`Notifications`, `Profile` and `Settings` stay where they are, in the account menu.

### 2.3 What is NOT in this design, and why

| Not building                         | Reason                                                                                                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant-to-landlord messaging         | No such thing exists. Messaging today is `src/lib/services/messages.ts`, between a customer and a service provider. Building tenant chat is a product, not a screen. The phone number is on the Lease screen and that is how this works in Kenya today. |
| Paying inside the app                | MitaSafi never holds the money; rent goes tenant → landlord's paybill directly. The Pay screen gives instructions, not a payment form. Anything else would misrepresent what the company does.                                                          |
| A tenant marking their own rent paid | Only a landlord can confirm a payment. A tenant-settable "I paid" would put an unverified figure next to verified ones.                                                                                                                                 |
| Rating the landlord                  | Out of scope and a different trust model.                                                                                                                                                                                                               |

---

## 3. Screens

Each screen lists: the job, the data source, the states, and the copy. Copy is exact.

Field notation: `leases.monthly_rent` means the column; `summary.balance` means a value
computed by `src/lib/tenant/summary.ts`, already built and tested.

---

### 3.1 Home

**Job:** answer "am I OK?" in under two seconds, without scrolling.

**Above the fold, in order:**

```
Hi {first name}

┌─────────────────────────────┐
│ {status line}               │   ← the single most important fact
│ KES 85,000                  │
│ Due 5 Dec                   │
│ [ How to pay ]              │
└─────────────────────────────┘

A101, Riverside Court            ← where they live, one line

Needs you                        ← only if non-empty
  • Rent is 12 days late
  • Lease ends in 43 days
```

**The status line** is one of exactly five, driven by `summary.status` and
`summary.daysLate`:

| Condition                                    | Line                         | Tone    |
| -------------------------------------------- | ---------------------------- | ------- |
| `status === "paid"`                          | `Rent is paid`               | calm    |
| `status === "pending"`                       | `Rent due in {n} days`       | neutral |
| `status === "pending"`, `daysUntilDue === 0` | `Rent is due today`          | neutral |
| `status === "partial"`                       | `KES {balance} still to pay` | amber   |
| `daysLate > 0`                               | `{n} days late`              | red     |

The amount beneath is `summary.balance` when anything is owed, `summary.paid` when nothing
is. The date is `summary.dueDate`, written `5 Dec`, never `2026-12-05`.

**"Needs you"** is derived, so it cannot fire at a tenant who has no problem. Same discipline
as the landlord home. It shows at most three items and nothing when empty.

**Data:** `tenancySummary()` (exists, tested), `units.unit_number`, `buildings.name`.
**States:** linked-and-leased · linked-no-live-lease · not-linked (see §4).

---

### 3.2 Pay

**Job:** get the money to the right place with the right reference, first time.

```
Pay rent

Send to
  Paybill  522533
  Account  A101
  Amount   KES 85,000

[ Copy account number ]

Pay by 5 Dec. After that it counts as late.

Not paying the full amount? Pay what you can.
Your landlord records every payment against this account.
```

**Everything here comes from `landlord_payout_methods` via `destinationFor()`**, which the
existing page already does. The account reference is computed, not typed: the tenant must
not have to guess it.

**The hard case, and it is the common one:** when the landlord has configured no payout
method, there is nothing honest to show. Then:

```
Pay rent

Your landlord has not set up payment details on MitaSafi yet.
Pay them the way you normally do, and they will record it here.

Rent     KES 85,000
Due      5 Dec
```

No invented paybill. No placeholder. This is the state on production right now, because the
live landlord has no payout destination.

**Copy button** is the one real interaction. Copying `A101` is the step people get wrong.

---

### 3.3 Payments

**Job:** prove what was paid.

A list, newest first. One row per payment:

```
KES 85,000        Nov 2026
Paid 3 Nov · M-Pesa · SFG12ABCDE
```

Only `status = 'confirmed'` payments appear as paid. A pending one is shown greyed with
`Waiting for your landlord to confirm`, because a tenant who sent money and sees nothing
assumes the product lost it.

**Receipt.** There is no receipt artifact in the product today. The row _is_ the receipt:
amount, period, date, method, M-Pesa code. A "Download receipt" button would need a document
to download and none exists. `[UNKNOWN: whether a PDF receipt is wanted]`. Listed in the
build plan, not assumed here.

**Statement** stays as a tab on this screen rather than a sixth nav item. It is
`buildStatement()`, already built and tested, and it answers "what do I owe over time"
rather than "what did I pay".

---

### 3.4 Repairs

**Job:** report something broken, and see it was heard.

This is the **only** thing a tenant can write (EV-005). It already works: the form, the
trigger that derives the unit and landlord from the live lease, and the landlord email.

```
Repairs

[ Report something ]

Open
  Kitchen socket has no power
  Reported 21 Nov · Normal

Done
  Burst pipe under bathroom sink
  Fixed 18 Nov
```

**What is missing and should be added:** the tenant is never told anything happened. The
landlord gets an email (`notifyRepairReported`, exists). The tenant gets nothing when the
status changes to in-progress or completed. One notice per transition, to `tenants.email`,
reusing the machinery that already exists.

---

### 3.5 Lease

**Job:** what did I agree to.

```
Lease

Rent        KES 85,000 a month
Due         day 5, {n} days grace
Deposit     KES 85,000 held
Started     1 Jan 2026
Ends        31 Jan 2027
Notice      2 months

Your landlord
  Asha Mwangi
  +254 7xx xxx xxx

[ Open lease document ]
```

The document button appears only when `leases.lease_document_url` is set, and must be
checked for tenant read access on the storage bucket before it is offered.
`[UNKNOWN: whether the lease-documents bucket grants the tenant read]`. If it does not,
the button is a dead control and must not ship.

**The landlord's name and number** are not in the tenant's current read surface (EV-005).
`profiles` is not tenant-readable for the landlord's row. Showing them needs either a new
narrow policy or a view. Until then the block is omitted rather than faked.

---

## 4. States

Every screen must handle these. They are not edge cases; two of the three are the common
case today.

| State                     | When                                                              | What the tenant sees                                                                                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Not linked**            | `tenants.user_id` does not match. **Every person today** (EV-007) | A single screen: "We cannot find a tenancy for this account." plus the claim-code entry from `TENANT_02 §3`. Not an error. Not a dead end.                                                                                                                               |
| **Linked, no live lease** | Former tenant, or lease not started                               | "You have no current tenancy." Their payment history stays readable, because they may need it.                                                                                                                                                                           |
| **Linked and leased**     | The design above                                                  |                                                                                                                                                                                                                                                                          |
| **Multiple leases**       | Renting two homes from one landlord, or moved between units       | **Not designed yet.** `[UNKNOWN]`. The current page silently picks the first non-terminated lease (`src/app/dashboard/rent/page.tsx:87`), which is a guess. A tenant with two homes sees one and is not told. This needs a switcher and is called out in the build plan. |

---

## 5. What this design needs that does not exist

Ordered by what blocks what.

| #   | Need                                | Why                                                    | Tier                 |
| --- | ----------------------------------- | ------------------------------------------------------ | -------------------- |
| 1   | `tenants.user_id` ever set          | nothing is reachable without it                        | T0                   |
| 2   | `tenant_self` view                  | or the fix in (1) leaks `notes` and `blacklist_reason` | T0                   |
| 3   | `/dashboard` branches on tenancy    | a renter's home page is about plumbers                 | T1                   |
| 4   | Tenant nav                          | the services sidebar is the wrong shape                | T2                   |
| 5   | Landlord contact readable by tenant | the Lease screen is incomplete without it              | T0 (new read policy) |
| 6   | Repair status notices to tenant     | the loop never closes                                  | T1                   |
| 7   | Payment receipt notice to tenant    | no proof MitaSafi recorded it                          | T1                   |
| 8   | Multi-lease handling                | today it silently shows one of several                 | T1                   |
| 9   | Lease document read access          | or the button is dead                                  | T1                   |

---

## 6. Open questions

1. A PDF receipt, or is the payment row enough?
2. Does a tenant with two tenancies need a switcher now, or is it rare enough to defer with
   an honest message?
3. Should the services dashboard remain in a renter's nav at all, or only appear for people
   who have actually booked something?
4. Is SMS wanted for rent reminders, given that email to `tenants.email` already works and
   SMS costs money per message?
