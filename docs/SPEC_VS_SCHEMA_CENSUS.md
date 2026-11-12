# SPEC-VS-SCHEMA CENSUS

A systematic diff of every table the documentation designs against every relation that
exists in the live database. Produced because an earlier subsystem census, derived from
table names alone, was structurally blind to any subsystem that is specified but unbuilt —
and missed one.

**Corpus:** 97 markdown files, 3,815,949 bytes, under `docs/`.
**Authority:** the live project (`pg_class` in schema `public`) — 86 relations:
**78 tables, 7 views, 1 materialized view**. Migration files were not used as authority.

## Method, and what it cannot tell you

Two extraction tiers, deliberately separated by confidence:

- **Tier A — explicit `CREATE TABLE` in a document.** 46 distinct identifiers. High
  confidence: a doc that writes DDL is designing a table.
- **Tier B — `public.<name>`, or a backticked snake_case identifier on a line that also
  mentions table/schema/column/INSERT/SELECT/RLS/FK.** 206 identifiers. Low confidence,
  and in practice mostly **column names** (`created_at`, `user_id`, `status`).

**Limits, stated rather than hidden.** Tier B has a high false-positive rate and was
triaged by how many documents mention each identifier, not by reading each one in context.
A table designed in prose with no DDL and no backticks would be missed entirely. The
subsystem attributions below are inferred from which document designs a table, not from
any statement in the documents themselves.

## Headline numbers

|                                                | count                       |
| ---------------------------------------------- | --------------------------- |
| specified **and** live                         | 71                          |
| specified, **not** live — designed but absent  | 139 (Tier A: **14**)        |
| live, **not** specified — exists, undocumented | 15 (8 real tables, 7 views) |

## Tier A: the 14 tables designed in DDL that do not exist

| table                    | designed in                                |
| ------------------------ | ------------------------------------------ |
| `vacancy_subjects`       | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `unit_observations`      | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `vacancy_states`         | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `building_participation` | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `building_observers`     | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `viewing_outcomes`       | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `observation_outcomes`   | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `observation_rewards`    | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `observer_stats`         | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `observer_pair_stats`    | VACANCY_VERIFICATION_ARCHITECTURE.md       |
| `contact_submissions`    | CUSTOMER_MODULE_ANALYSIS_AND_MILESTONES.md |
| `dispute_evidence`       | CUSTOMER_MODULE_ANALYSIS_AND_MILESTONES.md |
| `search_logs`            | CUSTOMER_MODULE_ANALYSIS_AND_MILESTONES.md |
| `audit_logs`             | MITASAFI_TECHNICAL_ARCHITECTURE.md         |

**10 of 14 are one subsystem.** House hunting / vacancy verification is the only
large unbuilt vertical. The remaining four are three small customer-module tables and one
naming mismatch (below).

## The naming mismatch

`MITASAFI_TECHNICAL_ARCHITECTURE.md` designs **`audit_logs`** (plural). The live database
has **`audit_log`** (singular), which appears in no document's DDL and holds **zero rows**.
So the documented audit design and the built audit table are different objects, and
neither is in use. Under a Service Constitution that calls itself governance law, there is
no working audit trail.

## The inverse problem: built, working, undocumented

Eight real tables exist that no document mentions:

`analytics_events`, `booking_followups`, `booking_pest_control_details`,
**`commission_bands`**, **`commission_config`**, **`provider_wallet_ledger`**,
`shopping_list_items`, `shopping_receipts`

The money path is the striking case. `commission_config`, `commission_bands`,
`commission_payment_audit` and `provider_wallet_ledger` are mentioned in **0 of 97
documents** each — while 22 documents discuss "commission" as a concept. The schema that
actually decides what a provider is paid is the least documented part of the system.

This is the exact mirror of house hunting: ~150KB of specification and 0 tables, against
0 documentation and a live, enforcing, trigger-backed fee engine.

## Vocabulary drift

Nine documents refer to **`service_jobs`**, **`service_job_messages`** and
**`service_job_quotes`**. None of those exist. The live equivalents are `bookings`,
`booking_messages` and `booking_quotes`. Five documents use `service_jobs` as though it
were current. Similar legacy names appear for `providers` (live: `service_providers`),
`provider_reviews` (live: `reviews`) and `portfolio_images` (live: `provider_portfolio`).

Anyone reading the docs to find a table will look for the wrong name.

## Two PRD promises with no schema at all

| promise                                         | where                          | table designed?                    | exists? |
| ----------------------------------------------- | ------------------------------ | ---------------------------------- | ------- |
| **Tenant Score**                                | PRD §1.3, §4.5                 | **no — not in any document's DDL** | no      |
| **Escrow** ("pay deposits securely via escrow") | PRD §1.3, §4.3 "Escrow System" | **no**                             | no      |

Neither has a table design anywhere in the corpus, not even an unbuilt one. They are named
product features that have never reached schema design. That is a different and earlier
stage of incompleteness than house hunting, which is fully designed and merely unbuilt.

## Commercial listings: resolved

`MITASAFI_COMMERCIAL_LISTINGS.md` is the largest single document (87KB) and designs
**zero new tables** — `commercial_listings` appears in no DDL and does not exist. It rides
on the shared `listings` table via added columns. It is not a hidden vertical.

## Corrected subsystem census

| #   | subsystem                                 | live tables  | specified                         |
| --- | ----------------------------------------- | ------------ | --------------------------------- |
| 1   | Services marketplace (provider + booking) | 44           | 73KB + constitution               |
| 2   | Rental listings (residential)             | 6            | 53KB                              |
| 3   | Property management                       | 5            | 40KB                              |
| 4   | House hunting / vacancy verification      | **0**        | ~150KB, 10 tables designed        |
| 5   | Commercial listings                       | 0 of its own | 87KB, no tables designed          |
| —   | Identity                                  | 3            | partial                           |
| —   | Money                                     | 6            | **~none**                         |
| —   | Trust                                     | 5            | partial                           |
| —   | Notifications                             | 1            | partial                           |
| —   | Admin & governance                        | 5            | audit designed under another name |
| —   | Geo                                       | 2            | partial                           |
| —   | Analytics                                 | 1            | undocumented                      |

Five product verticals, five cross-cutting services, two infrastructure. The two verticals
with the most specification have the least schema; the subsystem that moves money has the
most schema and the least specification.
