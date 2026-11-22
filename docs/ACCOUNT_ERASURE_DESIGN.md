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

1. ~~Nothing calls it.~~ **Done** — `scripts/ops/erase-account.mjs`. See §8.
2. ~~Nobody is watching the queue.~~ **Done** — see §9.
3. **Two GitHub secrets must be added, or the watchdog does not run.**
   `SITE_URL` and `CRON_SECRET`, under Settings → Secrets and variables →
   Actions. `CRON_SECRET` must match the value set on the Fly app. The workflow
   fails loudly with a named error if either is missing, so a misconfigured
   watchdog shows as a red run rather than as silence — but **until they are
   set, nothing is watching.**
4. **No data export.** The DPA gives a right of access alongside erasure;
   `SERVICE_PROVIDER_MODULE_MILESTONES.md:601` lists "data export" next to
   account deletion. Not in scope here.
5. **The other three crons still do not run.** See §9 — this was found while
   building the watchdog and is a separate, live defect.

## 8. Running it — the operator path

`scripts/ops/erase-account.mjs`. It needs `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in the environment or `.env.local`; the key is never
printed. Credential handling lives in `scripts/ops/_lib.mjs`, shared with
`grant-admin.mjs`.

```bash
node scripts/ops/erase-account.mjs --list
```

```bash
node scripts/ops/erase-account.mjs --email someone@example.com --reason "DSR-014"
```

```bash
node scripts/ops/erase-account.mjs --email someone@example.com --reason "DSR-014" --execute
```

```bash
node scripts/ops/erase-account.mjs --audit
```

**Previewing is the default.** There is no `--dry-run` to forget: a run without
`--execute` resolves the account, counts the real rows, prints what will be
destroyed, scrubbed and retained, and writes nothing. `--execute` is the only
thing that erases.

`--list` shows pending requests with their age and marks anything past the
48-hour promise. The script **refuses with exit 3** if the account carries no
`metadata.deletion_requested_at`, because erasing a stranger whose email was
mistyped is not recoverable; `--no-request-required` overrides that for a lawful
erasure from another basis and records the override in the stored reason.

After a real run the script prints `erase_account`'s **own** returned counts
beside its projection, so a divergence between the two shows up immediately.
`src/__tests__/ops-erase-account.test.ts` additionally pins the script's table
lists against the migration's text, and `--execute`, the exit-3 refusal and the
no-key-printing rules against the source.

Exit codes: `0` ok · `1` runtime failure · `2` bad arguments · `3` refused,
no erasure request on file.

### Straight SQL, if the script is not to hand

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

---

## 9. Watching the queue

`.github/workflows/erasure-queue-alert.yml` calls
`GET /api/cron/erasure-queue` hourly at `:17`, and on demand via
`workflow_dispatch`.

### The trap this had to avoid

`vercel.json` declares three cron entries for `/api/cron/search-alerts`.
**They do not run.** This app deploys to Fly (`fly.toml`, `app = "mitasafi-web"`),
Fly does not read `vercel.json`, there is no GitHub Actions schedule for them,
and `pg_cron` is available on the Supabase project but not installed.

So the existing search-alert emails have never been sent on a schedule. That is
a separate live defect, recorded here because it was found while building this
and because it is the reason the watchdog is **not** a fourth entry in
`vercel.json` — that would have produced a watchdog that never barks, which is
the exact failure mode it exists to prevent.

Fly scales to zero here (`min_machines_running = 0`). The scheduled request
wakes a machine; the cold start costs a few seconds, which is why the curl
allows 60s and retries a refused connection.

### What it does

Buckets every pending request by age against two thresholds — warn at
**24h**, breach at the promised **48h** — and emails the operators only when
something needs attention. Thresholds and bucketing live in
`src/lib/erasure/queue.ts` as pure functions over an explicit `now`, so the
boundaries are unit-tested at 47/48/49 hours: an off-by-one here reports a
broken promise an hour after it broke.

A request whose `deletion_requested_at` cannot be parsed is **surfaced, not
dropped**. `metadata` is client-writable, so the value is whatever was stored;
a request with a broken timestamp is still a request, and silently binning it
is how one gets missed indefinitely.

### The alert carries no personal data

IDs and ages only — never a name or an email address. It would copy a data
subject's identity into a mailbox, which is the one place nobody will remember
to erase it from; and these are specifically people who asked to be forgotten,
so mailing their name around to prompt the forgetting is the wrong shape. It is
the same decision the audit row makes.

The handler enforces this structurally rather than by filtering: it selects
only `id, metadata` from `profiles`, so there is no name in scope to leak.
`src/__tests__/erasure-queue.test.ts` pins that select string.

### Silence is not a status

Mail is sent only when something is overdue, so a quiet inbox must not be the
only evidence the watchdog is alive. The route always returns a JSON summary,
returns **500** if the alert could not be delivered, and the workflow fails the
job on any non-200 and writes the queue state into the run summary. A dead
watchdog is a red workflow run, not silence.

A breached request does **not** fail the job — only a failed _check_ does.
Failing on a backlog would make the workflow permanently red, and a permanently
red workflow is one nobody looks at.

### Checking on demand

Actions → "Erasure queue watchdog" → Run workflow. Or locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/erasure-queue
```
