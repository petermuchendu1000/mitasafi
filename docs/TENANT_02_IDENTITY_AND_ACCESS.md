# Tenant identity and access: the keystone

**Status:** design, awaiting decision on §4.
**Evidence:** `TENANT-DESIGN-001`, EV-005..EV-014.
**Risk tier of the resulting work:** **T0**. It changes who may read money and PII.

Nothing else in the tenant product can be built until this is settled. A tenant who cannot
sign in to their own tenancy has no dashboard to design.

---

## 1. The problem in one line

`tenants.user_id` is the key to every tenant read policy, and nothing in the product ever
sets it (EV-007, EV-008, EV-009).

## 2. The trap

Setting it naively ships a data leak the same day.

`authenticated` holds SELECT on **all 23 columns** of `tenants`, including `notes` and
`blacklist_reason` (EV-014). **RLS restricts rows, never columns.** The self-read policy
`USING (auth.uid() = user_id)` returns the whole row. So the instant the link is made, a
tenant can read their landlord's private notes about them, and the stated reason they were
blacklisted.

This is dormant only because the column is never populated. **It is activated by the fix.**
The identity work and the column work are one change, not two. [VERIFIED, prod, EV-014]

### 2.1 Column ownership

| Tenant may read                                       | Landlord-private, tenant must never read |
| ----------------------------------------------------- | ---------------------------------------- |
| `full_name`, `phone`, `phone_secondary`, `email`      | `notes`                                  |
| `id_type`, `id_number`, `id_document_url` (their own) | `blacklist_reason`                       |
| `occupation`, `employer`, `employer_phone`            | `created_by`                             |
| `emergency_contact`, `default_occupants`              | `metadata` (unknown contents)            |
| `verification_level`, `verified_at`, `status`         |                                          |

`metadata` is `jsonb` of unspecified contents and is therefore treated as private until
somebody enumerates it. `[UNKNOWN: what keys appear in tenants.metadata across live rows]`

### 2.2 How to close it

A column grant cannot do it: a tenant and a landlord are both the `authenticated` role, so
no grant can separate them. **A view is the only mechanism that can.** The tenant surface
reads `tenant_self`, a security-barrier view exposing the left column only, and never
`tenants` directly. The table keeps its existing landlord policies untouched.

This mirrors the pattern already used for payout methods and is the same lesson recorded
earlier in this project: _a column-level GRANT is inert while a table-level grant is held._

---

## 3. Linking: the four candidates

A tenant row is created by a landlord typing a name and a phone number
(`src/lib/landlord/tenancy-form.ts:352-364`). The question is how that row meets an account.

The product already proves possession of a phone number by SMS OTP at signup and login
(EV-012). That is the strongest asset available and the design should lean on it.

| Option                       | How                                                                                  | Verdict                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Phone match on signup** | tenant signs up with OTP on the number the landlord entered; a trigger links the row | Strong, because OTP proves possession. Fails where the landlord typed the number wrong, or the tenant uses a different number. Links silently, with no record of consent. |
| **B. Landlord invites**      | landlord sends a one-time link; tenant signs up through it                           | Explicit, auditable, survives a mistyped number. Costs an SMS or email per tenant and a token table. No invite infrastructure exists today.                               |
| **C. Tenant claims**         | tenant signs up, searches for their unit, landlord approves                          | Puts the burden on the tenant and adds an approval queue to the landlord's work.                                                                                          |
| **D. Claim code**            | landlord reads a 6-character code to the tenant; tenant enters it                    | No delivery infrastructure needed. Works over a phone call or in person, which is how Kenyan landlords and tenants already talk. Expires.                                 |

### 3.1 Recommendation

**A as the default, D as the fallback, both gated on a verified phone.**

- On signup, after OTP succeeds, match `tenants.phone` to the verified number. One match,
  unlinked, tenant status active → link it, and record the link.
- No match, or more than one → offer a claim code. The landlord sees it on the tenant's
  page and reads it out.
- Never link on an unverified identifier. Never link on email alone.
- Never link more than one tenant row per match without the tenant choosing.

**Why not B first:** invites need an SMS budget and a token table, and a tenant who already
signed up before the landlord got round to inviting them is stuck. A can be added without
new infrastructure and covers the common case; D covers the rest.

### 3.2 What must be true before A is safe

Each of these is `[UNKNOWN]` today and blocks implementation:

1. **Is every account's `profiles.phone` OTP-verified?** If an email+password path writes a
   phone without verification, A is an account-takeover vector. _Check: enumerate the signup
   paths in `src/app/(auth)/signup/page.tsx` in full, and whether any writes `phone` without
   `verifyOtp`._
2. **Can a user change their phone afterwards, and is it re-verified?** An unverified change
   re-opens the same hole. _Check: `/dashboard/profile` update path and any RPC it calls._
3. **Is `tenants.phone` unique?** Two landlords may both have a tenant on one number, a
   person renting two homes. The link must be one-to-many, not one-to-one. _Check: constraints
   on `tenants`, and whether `user_id` should be unique (it must not be)._
4. **Normalisation.** `+254712345678`, `0712345678` and `254712345678` must compare equal, or
   matching silently fails. _Check: how `profiles.phone` and `tenants.phone` are stored, on
   live rows._

**Phone normalisation is the most likely silent failure in this whole design.** A match rule
that does not normalise will link nobody and look like it works.

---

## 4. Decision required

Before any code:

1. **Linking rule.** A+D as above, or another?
2. **Is silent linking acceptable?** A links a tenant to a landlord's record without either
   party pressing a button. The alternative is to link and then tell both ("You now have
   access to A101, Riverside Court" / "Brian Kamau can now see their rent"). Recommendation:
   link silently, notify both. Silence on an access change is worse than an extra email.
3. **Unlinking.** If a landlord mistyped a number and linked the wrong person, who can undo
   it and what happens to what that person already saw? There is no answer in the product
   today.

## 5. Blast radius of the resulting change

| Area                                   | Effect                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Who can read `payments`                | widened from landlord+staff to the linked tenant (policy already exists; it starts matching)                 |
| Who can read `landlord_payout_methods` | same: the tenant sees the landlord's paybill/till/bank for their building                                    |
| Who can read `tenants`                 | the row's own subject, hence §2                                                                              |
| Landlord-visible behaviour             | none, if `tenants` policies are left alone                                                                   |
| Reversibility                          | **partial.** Setting `user_id` is reversible by a single UPDATE. What the linked person already read is not. |

A rollback does not un-see data. That is why §4.3 is a decision and not an implementation
detail.

## 6. Not checked

- Whether any human behind the three live tenant rows holds an account at all.
- Whether `profiles.phone` is unique, or indexed.
- The contents of `tenants.metadata`.
- Whether SMS delivery to Kenyan numbers is funded and working in production.
