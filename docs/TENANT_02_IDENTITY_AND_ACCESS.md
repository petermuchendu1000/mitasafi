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

The first version of this section leaned on SMS OTP. Increment 0 established that no
account on production has a verified phone, that phone auth is switched off and unfunded,
and that `profiles.phone` is freely user-editable (section 3.1). The options are kept below
for the record; the verdict column has been updated.

| Option                                               | How                                                                                  | Verdict                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Phone match on signup** ~~chosen~~ **REJECTED** | tenant signs up with OTP on the number the landlord entered; a trigger links the row | **Unsafe here.** OTP is disabled and `profiles.phone` is user-settable, so this matches on an unverified string. Fails where the landlord typed the number wrong, or the tenant uses a different number. Links silently, with no record of consent. |
| **B. Landlord invites**                              | landlord sends a one-time link; tenant signs up through it                           | Explicit, auditable, survives a mistyped number. Costs an SMS or email per tenant and a token table. No invite infrastructure exists today.                                                                                                         |
| **C. Tenant claims**                                 | tenant signs up, searches for their unit, landlord approves                          | Puts the burden on the tenant and adds an approval queue to the landlord's work.                                                                                                                                                                    |
| **D. Claim code**                                    | landlord reads a 6-character code to the tenant; tenant enters it                    | No delivery infrastructure needed. Works over a phone call or in person, which is how Kenyan landlords and tenants already talk. Expires.                                                                                                           |

### 3.1 Recommendation, revised after Increment 0

**Claim code (D) only. Phone matching (A) is dead.**

The first version of this document recommended A, phone match on verified OTP, on the
stated grounds that "the product already proves possession of a phone number by SMS OTP".
Increment 0 falsified that on three independent channels:

| Channel       | Finding                                                                                                                                       | EV          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Stored data   | 5 of 5 accounts have `phone_confirmed_at` NULL. Not one verified phone exists.                                                                | INC0 EV-002 |
| Configuration | `external_phone_enabled: False`, every SMS provider credential `None`. Phone auth is switched off and unfunded.                               | INC0 EV-004 |
| Static code   | `updateCustomerProfile` lets any signed-in user set `profiles.phone` to any format-valid number, with no verification and no re-verification. | INC0 EV-006 |

The third settles it permanently. Even with SMS enabled and paid for, `profiles.phone` is a
**user-controlled field**. Matching on it would mean: type a tenant's number into your own
profile, sign up, and inherit their rent ledger, ID number, employer, emergency contact and
their landlord's payout details. That is an account-takeover vector, not a convenience.

**The design is therefore:**

1. The landlord opens the tenant's page and taps **Invite**. A short code is generated.
2. The landlord gives it to the tenant the way they already talk: a phone call, WhatsApp, or
   in person. **No SMS infrastructure is required**, which matters because none exists.
3. The tenant signs up with email, which works today, and enters the code.
4. On success `tenants.user_id` is set, the code is consumed, and **both** parties are told.

**Properties:** explicit, auditable, consented on both sides, survives a mistyped phone
number, needs no new infrastructure, and cannot be triggered by someone who merely knows the
tenant's phone number.

**Code rules:** single use; expires; unambiguous alphabet with no O/0/I/1; stored hashed,
never plaintext; attempts rate-limited per account and per tenant row; landlord may revoke
and reissue.

**Phone matching may be revisited** only if SMS is funded AND `profiles.phone` becomes
immutable without OTP. Both, not one.

### 3.2 The four facts that gated this: all answered by Increment 0

Restored here because they are the reason the recommendation changed.

| #   | Question                                                 | Answer                                                                                                                                                    | EV                  |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Is every `profiles.phone` OTP-verified?                  | **No. None is.** 5 of 5 accounts have `phone_confirmed_at` NULL; phone auth is disabled and has no SMS credentials.                                       | INC0 EV-002, EV-004 |
| 2   | Can a user change their phone, and is it re-verified?    | **Yes, freely, and never re-verified.** `updateCustomerProfile` format-checks and writes.                                                                 | INC0 EV-006         |
| 3   | Is `tenants.phone` unique? Must `user_id` be non-unique? | Neither is unique, both are indexed. One person may rent from two landlords; one account may hold several tenancies. **No constraint needs to change.**   | INC0 EV-007         |
| 4   | How are phones stored on live rows?                      | All canonical `+254XXXXXXXXX`, by construction on both sides. **Normalisation is a non-issue**, and the claim-code design does not compare phones anyway. | INC0 EV-008, EV-009 |

Answers 1 and 2 kill option A. Answer 3 means the claim-code design needs no schema change
to `tenants` beyond writing `user_id`.

**Logged for later, not a blocker:** the `profiles` phone validator rejects `0712345678`
while the tenant form accepts and converts it, so a user typing their number the common
Kenyan way gets an error on `/dashboard/profile` (INC0 EV-009).

## 4. Decisions: settled

1. **Linking rule.** ~~A+D~~ **D only, claim code.** Approved as A+D; Increment 0 then
   falsified A's premise on three channels, so the approval cannot stand as given and the
   rule is D alone (section 3.1). This is a change to what was approved and is flagged as
   such, not slipped through.
2. **Silent linking?** **No, and the question dissolves.** A claim code is not silent: the
   tenant types it. Both parties are still notified, as approved.
3. **Unlinking.** **Still open. I made no recommendation before and make one now:** the
   landlord can unlink from the tenant's page; the tenant is told; the unlink is recorded
   with who did it and when. `tenants_user_id_fkey` is `ON DELETE SET NULL`, so the shape
   already supports it (INC0 EV-007). A rollback does not un-see data, so the record of who
   had access and for how long is the point, not the undo.

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

Updated after Increment 0.

- Whether any human behind the three live tenant rows holds an account at all. **Still
  unknown**, and it is the question that decides whether any of this serves anyone.
- Whether `profiles.phone` is unique or indexed. **Still unchecked**, and now irrelevant:
  the claim-code design never looks it up.
- The contents of `tenants.metadata`. **Still unchecked.** It stays out of `tenant_self`
  until someone enumerates it.
- Whether SMS to Kenyan numbers is funded. **ANSWERED: no.** Every SMS provider credential
  on the project is `None` (INC0 EV-004). This is why the design needs no SMS.
