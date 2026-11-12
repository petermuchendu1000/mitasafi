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

- The **bodies** of `settle_booking_payment`, `fail_booking_payment`,
  `request_provider_payout`, `credit_provider_wallet`, `debit_provider_wallet` and
  `fn_wallet_ledger_append_only` were **not read**. Their signatures and the constraints
  around them are documented; their internal logic is not reviewed here.
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
