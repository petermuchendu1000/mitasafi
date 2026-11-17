# Account erasure

**Status:** implemented in `supabase/migrations/20260353000000_account_erasure.sql`,
verified by `supabase/tests/account_erasure_test.sql` (28 assertions).
**Tier:** T0 — destroys user data, touches `auth.users`, reachable only with the
service-role key.

---

## 1. The problem this solves

`src/app/dashboard/settings/actions.ts:174` lets any signed-in user request
deletion. It writes `metadata.deletion_requested_at` on their profile. The UI
then tells them, at `CustomerSettingsClient.tsx:99`:

> **Deletion requested** — our team will process your request within 48 hours.

Nothing processed it. Before this migration there was no function, no script, no
admin route and no manual runbook that acted on `deletion_requested_at`. The
platform was accepting erasure requests, promising a deadline, and had no
mechanism to honour any of them.

That — not the deletion itself — is the exposure. Under the Data Protection Act
2019 a data subject's request has to be acted on; collecting requests you cannot
fulfil, while displaying a 48-hour SLA, is worse than not offering the button.

## 2. Erasure is anonymisation, not deletion

This was not a preference. Four measured constraints, in the order they bite.

**A hard `DELETE` is impossible.** Four inbound foreign keys on `profiles` are
`ON DELETE RESTRICT`:

| constraint                          | meaning                                   |
| ----------------------------------- | ----------------------------------------- |
| `booking_payments_payer_id_fkey`    | anyone who has ever paid                  |
| `reviews_reviewer_id_fkey`          | anyone who has ever reviewed              |
| `booking_disputes_reported_by_fkey` | anyone who has ever raised a dispute      |
| `booking_media_uploaded_by_fkey`    | anyone who has ever uploaded job evidence |

`DELETE FROM profiles` fails with `23503`. This is asserted directly — `E0` in
the suite builds an entangled account and requires the delete to be refused.

**If it were possible it would destroy other people's records.**
`bookings.customer_id` is `CASCADE`, so deleting a customer would delete the
provider's record of jobs they did and were paid for. `listings.landlord_id` is
`CASCADE`, so deleting a landlord would delete listings other users saved and
enquired about. One person's erasure right does not extend to deleting a second
person's business records.

**Financial records must be retained.** `MITASAFI_SERVICE_CONSTITUTION.md` sets
a two-year floor. `CANONICAL_WORK_COMMITMENT_MODEL_V1.md` records _"FOREVER
(indefinite retention)"_, reason given as _"Compliance (financial record
retention)"_.

**`profiles` is the identity anchor.** `20260347` repointed the `auth.users`
references onto it; 38 foreign keys target it. Removing the row is not a local
operation.

So **the `profiles` row survives, emptied of personal data.** Keeping it is what
makes everyone else's records coherent: a review still has a reviewer, a booking
still has a customer, and both now resolve to a tombstone instead of a name.
Anonymisation-in-place gets referential integrity for free; a
delete-and-null-out design would leave dangling references across 38 tables.

## 3. What happens to what

### Deleted outright

`phone_verifications`, `saved_listings`, `saved_providers`, `search_alerts`,
`search_queries`, `user_preferences`, `notifications`, `listing_waitlist`,
`review_helpful_votes`, `analytics_events`, plus any `locations` row nothing
references.

Verified rather than assumed: **none of those ten tables has a single inbound
foreign key**, so no counterparty loses anything.

### Scrubbed, row kept

| table                            | what goes                                                                                                                                           | why the row stays                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `profiles`                       | email → `erased-<id>@erased.invalid`, name → `Erased account`, phone, avatar, `verification_level` → `none`, **metadata replaced not merged**       | 38 FKs point at it                                          |
| `auth.users`                     | email, phone, password, user metadata; `banned_until` set to 2400                                                                                   | otherwise they can still sign in and are still identifiable |
| `service_providers`              | business name, email, phone, whatsapp, bio, headline, tagline, all photos, social links, tax id, registration number, location; `is_active = false` | provider id is referenced by bookings and reviews           |
| `inquiries`, `listing_inquiries` | name → tombstone, phone → `+000000000000`, email → NULL                                                                                             | the landlord keeps the fact of the enquiry                  |
| `locations` (booked)             | `access_notes` only                                                                                                                                 | see §4                                                      |

`user_roles` rows are all set `is_active = false` rather than deleted, so the
history of what was held survives and every role predicate (which all filter on
`is_active`) denies. `profiles.primary_role` then resets itself to `NULL`
through the trigger added in `20260352` — erasure never touches that column.

A landlord's `listings` move to `status = 'archived'`, a value
`listings_status_check` already permits, so an erased landlord's property
address stops being published.

### Retained, personal data included

`booking_payments`, `payments`, `provider_payouts` — untouched, **including
`mpesa_phone`, `mpesa_name`, `mpesa_receipt_number` and `bank_account`**. These
are financial records and the identifying fields are part of the record, not
decoration: an M-Pesa receipt without the payer's number cannot be reconciled
against a statement.

`bookings`, `reviews`, `booking_disputes`, `booking_media` — retained as the
counterparty's records and as dispute evidence.

This is a **lawful-basis retention and it is a decision on the record**, not an
omission for someone to discover later. `erase_account` returns the retained row
counts for exactly that reason: whoever answers the next data-subject request
needs to be able to say what remains. The suite asserts the retention
_positively_ — `E17` fails if `mpesa_phone` is ever scrubbed, so that change has
to be made deliberately rather than by drift.

## 4. The hardest case: a booked address

A `locations` row that a booking points at can be **neither deleted nor
scrubbed**, and both halves were discovered by running the function against a
fully-populated fixture, not by reading the schema:

1. `bookings.service_location_id` (and the same column on
   `booking_personal_details` and both on `booking_delivery_details`) is
   `RESTRICT` → deleting raises `23503` and aborts the whole erasure. The first
   version of this function did exactly that and would have failed on any
   account that had ever made a booking.
2. `prevent_location_address_mutation()` freezes `address_line1`,
   `address_line2`, `area`, `city`, `county`, `country`, `latitude`,
   `longitude`, `location_type` on a booked location → scrubbing raises `23514`.

That trigger exists on purpose: the address of a completed job is immutable
evidence. Rather than disable it, the design respects it and takes what it
explicitly permits. Its own comment names `access_notes` as mutable, with the
reason _"Gate codes change, caretaker contact changes"_ — which is precisely the
live security-sensitive content. So:

- a booked address is **retained**, reported as `booked_addresses_frozen`
- its `access_notes` — gate codes, caretaker contacts — are **cleared**

If the product later decides a departed user's address must go too, the change
is to `prevent_location_address_mutation()`, not to this function.

## 5. Deliberately not decided here

**`tenants`** — `full_name`, `phone`, `id_number` (a national ID) of a **third
party**, entered by a landlord. Erasing the landlord gives nobody the right to
erase the tenant's data, and it equally should not sit under a landlord who no
longer exists. That is a decision about someone who did not make the request, so
`erase_account` leaves these rows alone and reports the count as
`tenants_records_left_untouched`. Guessing would be worse than flagging.

**Free-text message bodies** — `inquiries.message` and
`listing_inquiries.message` are the counterparty's record of a conversation. The
contact fields around them are scrubbed; if a message body itself contains a
phone number, this does not remove it. Scrubbing free text is a different
problem and is not solved here.

**`reviews.review_text`** — kept in full. The review is about the provider and
their rating is computed from it; authorship becomes anonymous automatically
because the profile it points at is now a tombstone.

## 6. Access and audit

`erase_account(p_user_id uuid, p_reason text)` is `SECURITY DEFINER` with
`search_path` pinned, `EXECUTE` revoked from `PUBLIC, anon, authenticated` **by
name** and granted to `service_role` only.

Naming the client roles is required, not hygiene: `ALTER DEFAULT PRIVILEGES` on
schema `public` grants `EXECUTE` on every new function directly to `anon` and
`authenticated`, so `REVOKE … FROM PUBLIC` does not reach it. A self-service
`erase_account` would let anyone erase anyone. `E22` asserts a client cannot
call it; the migration guard re-asserts the whole definer surface.

It is **idempotent** — a second call returns `already_erased: true` and does not
overwrite `erased_at`, because that timestamp is the evidence of when the
obligation was discharged. It **requires a reason**, which is stored.

Every call writes an `audit_log` row with `entity_id` = the erased profile, so
the trail is searchable by subject. The audit row deliberately records **no
personal data** — not the old email, not the old name. An audit trail that
preserved what was erased would defeat the erasure. `E20` asserts this by
searching the row for the fixture's real name and email.

## 7. What is still missing

1. **Nothing calls it.** The request flow writes `deletion_requested_at`; this
   function can discharge it; no operator path connects the two. The next step
   is a `scripts/ops/erase-account.mjs` in the shape of
   `scripts/ops/grant-admin.mjs` — list pending requests, show what will go and
   what will be kept, `--dry-run`, then execute.
2. **The 48-hour promise is still unmet** until (1) exists and someone runs it.
3. **No data export.** The DPA gives a right of access alongside erasure;
   `SERVICE_PROVIDER_MODULE_MILESTONES.md:601` lists "data export" next to
   account deletion. Not in scope here.
4. **`docs/SERVICE_PROVIDER_MODULE_MILESTONES.md:601` is now wrong.** It
   describes the deletion flow as "cascade all data". That is not what this
   does, and §2 is why it cannot be. The milestone text should be corrected to
   say anonymise-and-retain.

## 8. Running it

```sql
-- as service_role, e.g. the Supabase SQL editor
SELECT public.erase_account(
  '<profiles.id>',
  'data subject request received 2026-11-17, ref DSR-014');
```

Find pending requests:

```sql
SELECT id, metadata->>'deletion_requested_at' AS requested
  FROM profiles
 WHERE metadata ? 'deletion_requested_at'
   AND NOT metadata ? 'erased_at'
 ORDER BY 2;
```

Audit what was done:

```sql
SELECT created_at, entity_id, details->>'reason' AS reason,
       details->'retained' AS retained, details->'flagged' AS flagged
  FROM audit_log
 WHERE action = 'account_erased'
 ORDER BY created_at DESC;
```
