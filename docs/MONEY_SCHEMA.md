# MONEY SCHEMA

The tables, constraints, triggers and functions that decide what a customer is charged and
what a provider is paid.

**Why this document exists.** `commission_config`, `commission_bands`,
`commission_payment_audit` and `provider_wallet_ledger` were mentioned in **0 of 97**
documents in this repository, while 22 documents discussed "commission" as a concept. The
schema that moves money was the least documented part of the system — live, enforcing, and
invisible to anyone reading the docs. That is the combination most likely to be broken by
someone who does not know the invariants.

**Grounding.** Every constraint, trigger and signature below was read from the live project
via `pg_constraint`, `pg_trigger` and `pg_proc`. Migration files were not used as the
source. Verified at the time of writing against project `qnlhhojnagwvqzsqvmuz`,
PostgreSQL 17.11.

---

## 1. The money path, end to end

```
   customer agrees a price
            │
            ▼
   commission_breakdown(total)          ← pure, STABLE, reads config + bands
            │  returns rate_bps, platform_fee_cents, provider_amount_cents
            ▼
   booking_payments row                 ← carries a FORENSIC SNAPSHOT of the config used
            │  idempotency_key UNIQUE
            ▼
   M-Pesa STK push ──► callback ──► settle_booking_payment(...)   [SECURITY DEFINER]
            │                          re-queries the provider; never trusts the callback
            ▼
   credit_provider_wallet()             [SECURITY DEFINER]
            │
            ▼
   provider_wallet_ledger               ← APPEND-ONLY, enforced by trigger
            │
            ▼
   request_provider_payout()            [SECURITY DEFINER]  ──►  provider_payouts
```

## 2. The commission model, as currently configured

`commission_config` is **effective-dated and versioned**. The active row is **version 3**,
effective from `2026-11-05 10:22:07+00` with no upper bound:

| field                  | value | meaning                                         |
| ---------------------- | ----- | ----------------------------------------------- |
| `rate_bps`             | 1000  | 10.00% — the fallback rate when no band matches |
| `min_fee_cents`        | 0     | **no fee floor**                                |
| `max_fee_cents`        | NULL  | **no cap**                                      |
| `min_job_amount_cents` | 0     | no minimum job value                            |
| `currency`             | KES   |                                                 |

Five bands hang off version 3, and the band — not the config rate — is what prices a job:

| job value (cents)     | job value (KES)    | rate    |
| --------------------- | ------------------ | ------- |
| 0 – 99,999            | up to 999.99       | **15%** |
| 100,000 – 499,999     | 1,000 – 4,999.99   | **12%** |
| 500,000 – 1,999,999   | 5,000 – 19,999.99  | **10%** |
| 2,000,000 – 9,999,999 | 20,000 – 99,999.99 | **7%**  |
| 10,000,000 +          | 100,000 +          | **5%**  |

Declining by job value, flat within a band. Verified against the live function:

| job         | fee       | rate |
| ----------- | --------- | ---- |
| KES 300     | 45.00     | 15%  |
| KES 1,000   | 120.00    | 12%  |
| KES 5,000   | 500.00    | 10%  |
| KES 50,000  | 3,500.00  | 7%   |
| KES 200,000 | 10,000.00 | 5%   |

**Changing pricing is an INSERT into `commission_config` plus its bands — never a code
edit.** `src/lib/payments/commission.ts` carries a compiled-in fallback that must mirror
the active row, and a test parses the migration and fails if the two drift.

## 3. The invariants, and where each one is enforced

This is the section to read before changing anything. Every item is a database-level
guarantee, not an application check — so concurrency cannot bypass it.

### 3.1 The split can never drift

```sql
booking_payments_amount_split_check   CHECK (amount = platform_fee + provider_amount)
booking_payments_platform_fee_lte_amount_check  CHECK (platform_fee <= amount)
booking_payments_platform_fee_check   CHECK (platform_fee >= 0)
booking_payments_provider_amount_check CHECK (provider_amount >= 0)
booking_payments_amount_check         CHECK (amount > 0)
booking_payments_currency_kes_check   CHECK (currency = 'KES')
```

The fee and the provider's share must sum to exactly the amount charged. The application
computes the provider amount by **subtraction, never a second rounding**, so the parts
cannot disagree with the total.

### 3.2 A fee is reproducible years later

```sql
booking_payments_commission_snapshot_complete
  CHECK ( (all five snapshot columns NULL)
       OR (commission_config_id NOT NULL
           AND commission_rate_bps BETWEEN 0 AND 10000
           AND commission_min_fee_cents >= 0
           AND commission_min_job_amount_cents >= 0
           AND (commission_max_fee_cents IS NULL
                OR commission_max_fee_cents >= commission_min_fee_cents)) )
```

`booking_payments` stores `commission_config_id`, `commission_rate_bps`,
`commission_min_fee_cents`, `commission_max_fee_cents` and
`commission_min_job_amount_cents` **on the payment row**. All five or none — a partial
snapshot is rejected. The recorded `commission_rate_bps` is the **band rate that priced the
job**, not the config's fallback rate; recording the fallback instead would make every
historical fee irreproducible.

A NULL `commission_config_id` means the compiled-in fallback priced the booking. **That
should be alerted on**, not ignored.

### 3.3 Two configs can never both be active

```sql
commission_config_no_overlap
  EXCLUDE USING gist (scope WITH =, currency WITH =, effective WITH &&)
commission_config_effective_half_open
  CHECK (lower_inc(effective) AND NOT upper_inc(effective))
commission_config_effective_bounded
  CHECK (lower(effective) IS NOT NULL AND NOT isempty(effective))
commission_config_version_unique  UNIQUE (scope, currency, version)
```

A GiST exclusion constraint makes overlapping effective periods **structurally
impossible** for a given scope and currency. Half-open ranges (`[start, end)`) mean no
double-counting at a boundary instant. There is no way to have two active price lists.

### 3.4 Bands can never overlap or leave a gap priced at zero

```sql
commission_bands_no_overlap
  EXCLUDE USING gist (config_id WITH =,
                      int8range(min_job_cents, COALESCE(max_job_cents + 1, 9223372036854775807)) WITH &&)
commission_bands_rate_bps_check  CHECK (rate_bps BETWEEN 0 AND 10000)
commission_bands_check           CHECK (max_job_cents IS NULL OR max_job_cents >= min_job_cents)
```

Overlap is impossible by exclusion constraint — a live contiguity check returns zero
overlaps because it cannot be otherwise. A _gap_ is still arithmetically possible, and
`commission_breakdown` handles it with a `COALESCE` to the config's own flat rate, so a gap
charges 10% rather than returning NULL and pricing a job at nothing.

### 3.5 A payment cannot be taken twice

```sql
booking_payments_idempotency_key_key  UNIQUE (idempotency_key)
```

Duplicate-charge prevention is a unique index, not an application check.

### 3.6 Settlement must name its evidence

```sql
booking_payments_settlement_verified_by_check
  CHECK (settlement_verified_by IS NULL
         OR settlement_verified_by IN ('authoritative_query','manual_reconciliation'))
```

Plus the tripwire columns `claimed_amount`, `amount_mismatch`, `needs_reconciliation`,
`reconciliation_note`.

**The rule the code enforces:** settlement never trusts the callback. `settle_booking_payment`
is called only after the provider has been re-queried directly. Neither Safaricom's
`stkpushquery` nor PayHero's transaction-status returns an amount, so the amount a callback
claims is written to `claimed_amount` as a **tripwire** and flagged in `amount_mismatch` —
the figure actually booked is always our own stored amount. Before this existed, a callback
saying `"Amount": 1` would settle a KES 150,000 booking.

### 3.7 The wallet ledger is append-only and self-consistent

```sql
trg_wallet_ledger_append_only  ->  fn_wallet_ledger_append_only()   -- trigger

provider_wallet_ledger_entry_type_check
  CHECK (entry_type IN ('credit_payment','debit_payout','reversal_payout','adjustment'))
wallet_ledger_sign_matches_type
  CHECK ( (entry_type IN ('credit_payment','reversal_payout') AND amount > 0)
       OR (entry_type = 'debit_payout' AND amount < 0)
       OR (entry_type = 'adjustment') )
wallet_ledger_source_required
  CHECK ( (entry_type = 'credit_payment'   AND payment_id NOT NULL AND payout_id IS NULL)
       OR (entry_type IN ('debit_payout','reversal_payout') AND payout_id NOT NULL AND payment_id IS NULL)
       OR (entry_type = 'adjustment' AND note NOT NULL) )
provider_wallet_ledger_amount_check  CHECK (amount <> 0)
```

Three guarantees worth stating plainly: a credit must point at a payment, a debit must
point at a payout, and an adjustment must carry a human explanation. The sign of the amount
must match the entry type, so a "credit" cannot reduce a balance. And the ledger cannot be
rewritten — the trigger refuses UPDATE and DELETE.

`balance_after` is a denormalised running balance. It is only trustworthy _because_ the
ledger is append-only; if that trigger were ever dropped, this column becomes a lie.

## 4. The function contract

### Write surface — `SECURITY DEFINER`, the only legal way to move money

| function                                                                                                                               | returns                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `settle_booking_payment(p_payment_id, p_receipt_number, p_result_code, p_result_desc, p_claimed_amount, p_verified_by, p_operator_id)` | `jsonb`                                                  |
| `fail_booking_payment(p_payment_id, p_result_code, p_result_desc)`                                                                     | `jsonb`                                                  |
| `expire_stale_booking_payments(p_older_than interval, p_booking_id)`                                                                   | `integer`                                                |
| `credit_provider_wallet(p_provider_id, p_amount)`                                                                                      | `void`                                                   |
| `debit_provider_wallet(p_provider_id, p_amount)`                                                                                       | `void`                                                   |
| `request_provider_payout(p_provider_id, p_amount, p_payout_method, p_mpesa_phone, p_reference)`                                        | `jsonb`                                                  |
| `get_unit_payment_history(p_unit_id, p_months)`                                                                                        | `TABLE(month_year, rent_due, rent_paid, payment_status)` |

### Read surface — pure functions, safe to call anywhere

| function                                                                                                    | returns                                           |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `commission_breakdown(p_total, p_scope, p_currency, p_at)`                                                  | the full breakdown, including the snapshot fields |
| `commission_bands_active(p_scope, p_currency, p_at)`                                                        | `TABLE(min_job_cents, max_job_cents, rate_bps)`   |
| `commission_config_active(p_scope, p_currency, p_at)`                                                       | `SETOF commission_config`                         |
| `commission_fee_cents(p_total_cents, p_rate_bps, p_min_fee_cents, p_max_fee_cents, p_min_job_amount_cents)` | `bigint`                                          |
| `commission_to_cents(p_amount numeric)`                                                                     | `bigint`                                          |

`commission_breakdown` is `STABLE`, `LANGUAGE sql`, with `SET search_path TO 'public','pg_temp'`.
`src/lib/payments/commission.ts` mirrors `commission_fee_cents` **deliberately and exactly** —
the order of the clamps is part of the contract, and a differential test checks the two
implementations against each other. Keep them in lockstep.

## 5. The client write boundary

Verified against `pg_class.relacl`: `authenticated` has **no** INSERT, UPDATE or DELETE
grant on `booking_payments`, `commission_config`, `commission_bands`,
`provider_wallet_ledger`, `provider_payouts` or `reviews`. The grant is revoked outright,
not merely blocked by policy. RLS is additionally enabled on all of them, with zero
permissive write policies.

A client cannot touch money except through the `SECURITY DEFINER` functions above.

## 6. `public.payments` is an orphan — do not build on it

`payments` is the **landlord rent ledger** from `20260101000003_property_management.sql`
(`lease_id`, `amount`, `payment_type`, `period_month`/`period_year`, `mpesa_receipt`,
`receipt_number`, `received_by`). It is unrelated to the services-marketplace money path.

Its state:

- **0 rows, 0 inserts ever.**
- **No application code reads or writes it.** `.from("payments")` appears nowhere in `src`.
- **No migration writes it.**
- `get_unit_payment_history` exists and would read it, but is called from nowhere — it
  appears only in generated types.
- Unlike every other money table, `authenticated` **does** hold INSERT/UPDATE grants.

Its three RLS policies were read in full and are **correctly scoped**:

```sql
-- INSERT: WITH CHECK, and UPDATE/SELECT: USING
EXISTS (SELECT 1 FROM leases
        WHERE leases.id = payments.lease_id AND leases.landlord_id = auth.uid())
```

A landlord reaches only payments on leases they own. `roles={public}` is Postgres's default
"all roles" and is **not** a hole here: an `anon` caller has `auth.uid()` = NULL, so the
`EXISTS` can never match. The UPDATE policy omits `WITH CHECK`, which in Postgres means the
`USING` expression is used for the check as well — so a landlord cannot move a payment onto
someone else's lease either.

**Conclusion: not a vulnerability, but a trap.** It is a client-writable money-shaped table
with no code path, which is exactly the kind of thing a future feature gets built on by
accident. Either wire it up deliberately (rent collection is a real product requirement) or
drop it. Do not leave it half-present.

## 7. Rules for changing anything here

1. **Pricing changes are data, not code.** INSERT a new `commission_config` version plus its
   bands. The exclusion constraint will reject an overlapping effective period, which is the
   safety net — do not work around it by editing the existing row.
2. **Never edit `commission.ts` arithmetic without changing `commission_fee_cents` in the
   same change.** A differential test exists precisely to catch that.
3. **Never add a money write path that bypasses the `SECURITY DEFINER` functions.** The
   grants are revoked; if you find yourself needing to re-grant, the design has been
   misunderstood.
4. **Never UPDATE or DELETE `provider_wallet_ledger`.** Post a `reversal_payout` or an
   `adjustment` with a note.
5. **A NULL `commission_config_id` on a settled payment is an incident**, not a curiosity —
   it means the fallback priced a real booking.

## 8. What this document does not establish

- ~~The bodies of the six functions were not read~~ — **done, see §9.** Their internal
  logic is now reviewed. Three findings are recorded there; none is client-reachable.
- No money has ever moved through this system: `commission_payment_audit` returns 0 rows,
  `booking_payments` and `provider_wallet_ledger` hold 0 rows, and M-Pesa is `configured:
false` in production with every credential missing. So none of the above has been
  exercised against a real transaction.
- `booking_payments` had **149 historical inserts**, since deleted. What they were is
  unrecoverable and no financial claim is made about them.
- Whether the declining band schedule is commercially right is a business question. One
  known tension is on the record: PayHero charges the merchant KES 6 per transaction for
  totals of 50–499, so a KES 50 job earns KES 7.50 against a KES 6 cost. `commission.ts`
  has no term for the processing cost.

---

## 9. Review of the `SECURITY DEFINER` function bodies

All six bodies were read from the live database via `pg_get_functiondef`. **No function was
executed** — they mutate money state.

### 9.1 The perimeter holds

`EXECUTE` on all seven money functions is granted to **`postgres` and `service_role` only**.
The PUBLIC default was revoked; `anon` and `authenticated` cannot call any of them. So the
application, holding the service-role key server-side, is the gatekeeper — and the functions
correctly assume an already-authorised caller.

`search_path TO 'public', 'pg_temp'` is set on six of seven (the exception is §9.5).

### 9.2 `settle_booking_payment` — the strongest function in the codebase

Verified behaviours:

- `SELECT ... FOR UPDATE` on the payment row, so concurrent settlement serialises.
- **Idempotency is checked FIRST and applies to every route.** `status IN ('completed','refunded')`
  returns `not_settleable`. A payment is never settled twice, by anyone, for any reason.
- The `authoritative_query` route accepts only `pending`/`processing`. Its own comment names
  the attack this blocks: _"forge a failure, then forge a success, and mint wallet balance on
  repeat."_ Recovery is a separate route rather than a relaxation of this guard.
- The `manual_reconciliation` route requires `p_operator_id`, **verifies the operator exists
  in `profiles`**, excludes `cancelled` deliberately (a cancellation is not a payment that may
  silently have succeeded), and writes the operator id into both the ledger note and the
  payment metadata. Every recovered shilling is attributable to a named human.
- A receipt is only ever added, never cleared: `coalesce(p_receipt_number, existing)`.
- `amount_mismatch` is set when the claimed amount differs from the stored amount.
- If the booking fails to transition, the settlement is **kept** and the payment is marked
  `needs_reconciliation` with the error text — money is not lost to a downstream trigger
  failure.

**The second line of defence it claims does exist.** Verified in `pg_indexes`:

```sql
wallet_ledger_one_credit_per_payment
  UNIQUE INDEX ON provider_wallet_ledger (payment_id) WHERE entry_type = 'credit_payment'
wallet_ledger_one_debit_per_payout
  UNIQUE INDEX ON provider_wallet_ledger (payout_id)  WHERE entry_type = 'debit_payout'
wallet_ledger_one_reversal_per_payout
  UNIQUE INDEX ON provider_wallet_ledger (payout_id)  WHERE entry_type = 'reversal_payout'
```

One credit per payment, enforced by a partial unique index — not by application logic.

### 9.3 `fn_wallet_ledger_append_only` — and the TRUNCATE question

```sql
CREATE TRIGGER trg_wallet_ledger_append_only
  BEFORE DELETE OR UPDATE ON provider_wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION fn_wallet_ledger_append_only()
```

The function body is one unconditional `RAISE EXCEPTION`. Both UPDATE and DELETE are covered.

A row-level trigger does **not** fire on `TRUNCATE`, so that was checked separately:
`anon` and `authenticated` hold **no TRUNCATE grant on any money table**. The append-only
guarantee cannot be bypassed statement-level. (See §9.7 for the non-money tables, where this
is not true.)

### 9.4 `request_provider_payout` and `fail_booking_payment`

`request_provider_payout`: amount validated, `FOR UPDATE` lock, balance checked, **one open
payout enforced** (`status IN ('pending','processing')` → `payout_already_open`), ledger row
written as `debit_payout` with a negative amount. `total_earnings` is deliberately **not**
decremented, and the comment explains why — a payout moves money out, it does not un-earn it.

`fail_booking_payment`: `FOR UPDATE` lock, and the guard that matters — **a completed payment
is never downgraded by a late or forged failure** (`status NOT IN ('pending','processing')` →
`not_settleable`).

### 9.5 FINDING 1 — unused, ledger-bypassing wallet mutators _(integrity, medium)_

`credit_provider_wallet(p_provider_id, p_amount)` and
`debit_provider_wallet(p_provider_id, p_amount)` both mutate
`service_providers.wallet_balance` and write **no `provider_wallet_ledger` row at all**.
`credit_provider_wallet` additionally increments `total_earnings`.

They are **dead code**: called by no database function and no application code. The only
references in `src/` are a comment and the generated types.

The harm is already on the record in this repo, in `request_provider_payout`'s own comment:

> _"The old rollback path called `credit_provider_wallet`, which bumped `total_earnings` and
> inflated lifetime earnings permanently on every failed request."_

Every other money path writes the ledger. These two do not, so any future caller silently
breaks reconciliation between `provider_wallet_ledger` and `service_providers.wallet_balance`
— and `balance_after` on the next real ledger row would jump without explanation.

**Recommendation: `DROP` both.** They are a loaded gun pointed at the one invariant the
ledger exists to provide. If a bare wallet adjustment is ever needed, the ledger already has
an `adjustment` entry type that requires a note.

### 9.6 FINDING 2 — a failure that cannot be observed _(observability, low)_

`fail_booking_payment` wraps its booking transition in `EXCEPTION WHEN OTHERS THEN NULL` — a
silent swallow. The intent is documented and defensible (_"a stale booking status must not
block recording the failure"_), but it is **asymmetric with `settle_booking_payment`**, which
in the same situation records `needs_reconciliation` and the error text.

So a payment that fails, and whose booking then does not move to `payment_failed`, leaves no
trace of the discrepancy anywhere.

**Recommendation:** mirror settle — set `needs_reconciliation = true` with the `SQLERRM` in
`reconciliation_note`, rather than discarding it.

### 9.7 FINDING 3 — `get_unit_payment_history`, and TRUNCATE on non-money tables _(defence in depth, low)_

`get_unit_payment_history` is the one function with **no `SET search_path`** — the classic
`SECURITY DEFINER` escalation vector. Two mitigations apply: it schema-qualifies its tables
(`public.leases`, `public.payments`), so a hostile search_path cannot redirect those lookups,
and `EXECUTE` requires `service_role` already. The residual exposure is unqualified function
calls (`date_trunc`, `to_char`, `generate_series`), which an attacker holding service_role
could shadow — by which point they need no help.

It also performs **no ownership check**. It is `SECURITY DEFINER`, so it bypasses RLS, and it
returns the rent history of whatever `p_unit_id` it is handed. It is currently called from
nowhere, so there is no route to audit — but it becomes an IDOR the moment someone wires it
up without an ownership check.

**Recommendation:** add `SET search_path TO 'public','pg_temp'`, and either add an ownership
predicate or drop it together with `public.payments` (§6).

Separately, and outside the money path: **`TRUNCATE` is granted to `anon` and `authenticated`
on roughly 69 relations**, including `audit_log`, `blocked_users`, `api_keys`,
`analytics_events` and the `booking_*` detail tables. **RLS does not apply to `TRUNCATE`**, so
those policies do not protect them. It is a Supabase default-grant artefact.

Not reachable today: PostgREST exposes no TRUNCATE verb, and no client-executable function
performs dynamic SQL or TRUNCATE — the only two functions whose source matched a dynamic-SQL
search were `prevent_booking_deletion_with_commitments` and its service equivalent, which use
`format()` on a **constant string** with the parameter passed via `USING`, and are not
`SECURITY DEFINER`. No injection surface.

Still worth closing, as a one-line hardening with no downside:

```sql
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
```

`blocked_users` is the one to note: truncating it would unblock everyone.

### 9.8 What §9 does not establish

- No function was executed, so every behaviour above is read from its definition, not
  observed at runtime. The guards are present in the source; they have not been exercised
  against a live transaction, and nothing ever has — `booking_payments` holds 0 rows.
- The booking state-machine triggers that `settle_booking_payment` and `fail_booking_payment`
  fire into were **not** read. Both functions set `app.current_user_id` and
  `app.current_user_role` before updating `bookings`, which means a trigger consumes those
  GUCs; that mechanism is not reviewed here.
- `expire_stale_booking_payments` was listed in the write surface but its body was **not**
  read — it was outside the six.
