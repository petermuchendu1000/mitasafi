-- =============================================================================
-- Migration: 20260320000000_money_invariants.sql
-- Purpose:   Add the database-level money invariants that are currently
--            enforced only by application code (or not at all).
-- =============================================================================
--
-- WHY NOW: every money table is empty at the time of writing -- booking_payments,
-- provider_payouts, bookings, booking_disputes, payments, service_providers,
-- service_pricing, service_pricing_components and provider_service_areas all
-- have 0 rows. Every ALTER TABLE below is therefore instant and cannot fail on
-- legacy data. After the first real booking, each of these becomes a backfill
-- plus a table rewrite under an ACCESS EXCLUSIVE lock on a live-money table.
--
-- SCOPE: constraints, one trigger, one column type change, and two
-- CREATE OR REPLACE on the wallet RPCs. No RLS change, no policy change, no
-- privilege widening. The grants that migration 20260313000000 revoked are
-- re-applied verbatim at the end of section 6.
--
-- -----------------------------------------------------------------------------
-- THE DEFECTS THIS CLOSES
-- -----------------------------------------------------------------------------
--
-- D1. booking_payments: the money split is unenforced.
--     The table had exactly three CHECKs -- amount > 0, platform_fee >= 0,
--     provider_amount >= 0 -- and NO constraint mentioned both platform_fee and
--     provider_amount. The identity amount = platform_fee + provider_amount is
--     produced only by calculateCommission() in src/lib/payments/commission.ts
--     and written by src/lib/services/payments.ts. Any other writer (a backfill,
--     a webhook handler, a psql session, a future admin tool) could store a row
--     where the platform keeps money the customer never paid, or where the
--     provider is owed money that was never collected. Nothing in the database
--     would notice, and reconciliation against M-Pesa would be the first place
--     it surfaced -- after payout.
--
-- D2. booking_payments: platform_fee could exceed amount.
--     commission.ts clamps the fee to the total ("Ensure fee doesn't exceed
--     total"), but that clamp is application logic. A fee larger than the charge
--     is a negative payout.
--
-- D3. booking_payments: no currency check.
--     The column defaults to 'KES' and payments.ts writes
--     `booking.currency || "KES"`, but any string was storable. This platform
--     charges in Kenyan shillings only; M-Pesa STK Push is KES-only. A row
--     reading 'USD' with a KES magnitude is a 130x error in the provider's
--     favour, or the platform's.
--
-- D4. service_providers.wallet_balance / total_earnings had ZERO constraints.
--     The wallet could go negative. 20260318000000 removed the client's ability
--     to write these columns, so the remaining exposure is server-side code and
--     the debit RPC -- but debit_provider_wallet's overdraft check is a plpgsql
--     IF, not a constraint, so a direct UPDATE or a future code path bypasses
--     it. total_earnings is a lifetime accumulator and must never decrease
--     below zero either.
--
-- D5. booking_disputes had ZERO check constraints.
--     refund_amount is numeric(10,2) and nullable, and accepted negatives (a
--     "refund" that charges the customer) and amounts far exceeding what was
--     ever collected on the booking. The bookings pricing-immutability trigger
--     (protect_pricing_after_confirmation) explicitly directs operators here --
--     'Use booking_disputes.refund_amount for price adjustments' -- so this is
--     the one money field an admin is told to edit by hand, and it was the least
--     constrained field in the schema. A CHECK can enforce >= 0 but cannot reach
--     another table, so the upper bound is a trigger.
--
-- D6. provider_service_areas.travel_fee, service_pricing.base_amount and
--     service_pricing_components.amount had no CHECKs at all. These feed quoted
--     and agreed prices; a negative travel fee or base amount silently reduces
--     a quote below the provider's floor.
--
-- D7. service_providers.min_price was bare `numeric` (unconstrained precision)
--     while its money siblings wallet_balance and total_earnings are
--     numeric(12,2). Unconstrained numeric stores 1/3-style values with
--     arbitrary scale, so min_price could hold fractions of a cent that no money
--     column can represent and that round differently in every consumer. It also
--     had no positivity check.
--
-- D8. credit_provider_wallet accepted NULL and non-positive amounts.
--     With p_amount < 0 it DEBITS the wallet and REDUCES total_earnings, and
--     with p_amount = NULL it silently sets both columns to NULL. The symmetric
--     defect in debit_provider_wallet is worse: p_amount = -500 passes the
--     `current_balance < p_amount` test and then CREDITS the wallet, which is
--     money minting. 20260313000000 closed the remote-caller half of this by
--     revoking EXECUTE from anon/authenticated/PUBLIC; this migration closes the
--     parameter half for every caller including service_role.
--
-- -----------------------------------------------------------------------------
-- DELIBERATELY NOT CHANGED
-- -----------------------------------------------------------------------------
-- * The redundancy in D2 is intentional. Given the D1 identity and the existing
--   provider_amount >= 0, platform_fee <= amount is already implied. It is added
--   anyway so that dropping either one of the three does not reopen the hole.
-- * provider_amount <= amount is implied the same way and is NOT added, because
--   a third redundant constraint buys nothing the first two do not.
-- * The `payments` table (legacy rent/deposit ledger, unrelated to the
--   marketplace booking flow) is untouched.
--
-- ROLLBACK: see the end of this file.
-- =============================================================================


-- =============================================================================
-- 1. booking_payments -- the money split (D1, D2, D3)
-- =============================================================================
-- amount, platform_fee and provider_amount are all NOT NULL numeric(12,2), so
-- the identity is written as a plain equality with no NULL guard. A NULL guard
-- would be worse than useless here: a CHECK whose expression evaluates to NULL
-- PASSES, so `col IS NULL OR ...` on a NOT NULL column only adds a branch that
-- can never be taken.

ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_amount_split_check
  CHECK (amount = platform_fee + provider_amount);

ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_platform_fee_lte_amount_check
  CHECK (platform_fee <= amount);

-- Exact match, case-sensitive and deliberately so: 'kes' is rejected. Every
-- currency column in this schema defaults to 'KES' and no code path writes any
-- other value, so a lowercase or alternate code reaching this column is a bug
-- to surface, not a variant to accept.
ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_currency_kes_check
  CHECK (currency = 'KES');

COMMENT ON CONSTRAINT booking_payments_amount_split_check ON public.booking_payments IS
  'The money split must balance: what the customer is charged equals the platform fee plus the provider net. Mirrors calculateCommission() in src/lib/payments/commission.ts.';


-- =============================================================================
-- 2. service_providers -- the wallet cannot go negative (D4)
-- =============================================================================
-- Both columns are NOT NULL numeric(12,2) DEFAULT 0, so again no NULL guard.
-- This is the backstop beneath debit_provider_wallet's overdraft check: the
-- function can be replaced, the constraint has to be dropped.

ALTER TABLE public.service_providers
  ADD CONSTRAINT service_providers_wallet_balance_nonneg_check
  CHECK (wallet_balance >= 0);

ALTER TABLE public.service_providers
  ADD CONSTRAINT service_providers_total_earnings_nonneg_check
  CHECK (total_earnings >= 0);


-- =============================================================================
-- 3. booking_disputes -- refund bounds (D5)
-- =============================================================================
-- refund_amount is nullable (NULL = no refund decided yet, which is the default
-- and the state of every dispute until an admin resolves it), so the CHECK is
-- NULL-tolerant by construction.

ALTER TABLE public.booking_disputes
  ADD CONSTRAINT booking_disputes_refund_amount_nonneg_check
  CHECK (refund_amount IS NULL OR refund_amount >= 0);

-- The upper bound crosses tables, so it cannot be a CHECK. Design notes:
--
-- * SECURITY DEFINER, owner postgres. A SECURITY INVOKER function would read
--   booking_payments through the caller's RLS. booking_payments has only two
--   SELECT policies (payer, and the owning provider) and no INSERT/UPDATE
--   policy at all, so an invoker-rights read returns a SMALLER sum for any role
--   that cannot see every payment on the booking -- which makes the check
--   fail-closed and reject legitimate refunds. A money invariant must compare
--   against the true total, so it runs as the owner.
--
-- * No information is disclosed by including the paid total in the error. The
--   only roles that can reach this trigger on a given booking are the booking's
--   own customer or provider (RLS policy disputes_insert_reporter) and
--   service_role; both can already SELECT those booking_payments rows.
--
-- * SET search_path = public, pg_temp. Mandatory for any SECURITY DEFINER
--   function: without it the function resolves booking_payments and sum()
--   against the caller's search_path, and a planted object would run as
--   postgres. pg_temp is pinned LAST so a temp-schema object cannot shadow a
--   public one. (Note this is hardening, not a live exploit -- as recorded in
--   20260313000000, anon and authenticated do not hold CREATE on public.)
--
-- * BEFORE INSERT OR UPDATE OF refund_amount, booking_id. BEFORE, because the
--   row must be rejected before it is written. The column list keeps the
--   subquery off the hot path: resolving a dispute writes status, resolution,
--   resolved_by and resolved_at far more often than refund_amount, and those
--   UPDATEs do not fire this trigger at all. booking_id is in the list on
--   purpose: with `UPDATE OF refund_amount` alone, re-parenting an already
--   approved dispute to a cheaper booking -- UPDATE booking_disputes SET
--   booking_id = <other> -- would never be re-checked, and that is the whole
--   bypass. It is NOT a statement-level trigger because the bound is per row.
--
-- * Only status = 'completed' payments count. 'pending' and 'processing' money
--   has not arrived, 'failed' and 'cancelled' never will, and 'refunded' has
--   already been given back -- counting it would let one collected payment fund
--   two refunds. Consequence to know about: once a payment is flipped to
--   'refunded', refund_amount on that booking can no longer be revised upward.
--   No code sets 'refunded' today (refunds are not implemented), so this binds
--   nothing currently; when refunds ship, set refund_amount before flipping the
--   payment status.

CREATE OR REPLACE FUNCTION public.enforce_dispute_refund_within_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  -- Unconstrained numeric on purpose: sum() over numeric(12,2) can exceed
  -- numeric(12,2) across many payments on one booking, and a declared
  -- numeric(12,2) here would turn that into a spurious numeric_value_out_of_range
  -- on an otherwise valid refund.
  v_paid numeric;
BEGIN
  -- No refund decided, or a non-positive value that
  -- booking_disputes_refund_amount_nonneg_check will reject on its own: skip
  -- the cross-table read entirely.
  IF NEW.refund_amount IS NULL OR NEW.refund_amount <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(sum(bp.amount), 0)
    INTO v_paid
    FROM public.booking_payments bp
   WHERE bp.booking_id = NEW.booking_id
     AND bp.status = 'completed';

  IF NEW.refund_amount > v_paid THEN
    RAISE EXCEPTION
      'Dispute refund_amount % exceeds the % actually collected on booking %',
      NEW.refund_amount, v_paid, NEW.booking_id
      USING ERRCODE = '23514',
            HINT = 'refund_amount may not exceed SUM(booking_payments.amount) over completed payments for this booking.';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.enforce_dispute_refund_within_paid() IS
  'Caps booking_disputes.refund_amount at the total completed booking_payments.amount for the same booking. SECURITY DEFINER so the cap is measured against the true total rather than the caller RLS-visible subset.';

DROP TRIGGER IF EXISTS booking_disputes_refund_within_paid ON public.booking_disputes;
CREATE TRIGGER booking_disputes_refund_within_paid
  BEFORE INSERT OR UPDATE OF refund_amount, booking_id ON public.booking_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_dispute_refund_within_paid();

-- No REVOKE is needed on enforce_dispute_refund_within_paid despite its default
-- PUBLIC EXECUTE: PostgreSQL refuses a direct call on any function returning
-- `trigger` with SQLSTATE 0A000, 'trigger functions can only be called as
-- triggers'. Verified against this database on an existing trigger function.


-- =============================================================================
-- 4. Quote inputs -- non-negative fees and prices (D6)
-- =============================================================================
-- travel_fee and base_amount are nullable: travel_fee is NULL for areas with no
-- surcharge, and base_amount is NULL for pricing_type 'quote_only' (enum
-- pricing_type = fixed, starting_from, per_unit, quote_only, hourly, daily), so
-- both CHECKs tolerate NULL, matching the house style already used by
-- service_providers.emergency_surcharge_amount_check and
-- bookings.booking_agreed_price_positive.

ALTER TABLE public.provider_service_areas
  ADD CONSTRAINT provider_service_areas_travel_fee_nonneg_check
  CHECK (travel_fee IS NULL OR travel_fee >= 0);

ALTER TABLE public.service_pricing
  ADD CONSTRAINT service_pricing_base_amount_nonneg_check
  CHECK (base_amount IS NULL OR base_amount >= 0);

-- service_pricing_components.amount: constrained to >= 0 (NOT NULL, so no
-- guard). Intent was established from the schema rather than assumed:
--   * enum pricing_component_type is exactly (base, unit, time, distance,
--     pass_through). There is no discount, credit, adjustment or rebate label,
--     so there is no component kind whose amount would be negative.
--   * the table's own COMMENT reads 'For services with composite pricing
--     (base + unit + distance, etc)' -- an additive breakdown.
--   * the string 'discount' appears in zero .sql files and zero files under
--     src/. The only discount design in the repo is a future, unbuilt
--     adjustment_type enum('surge','discount','seasonal','emergency') sketched
--     in docs/chat.md -- a separate mechanism, not a negative row here.
-- >= 0 rather than > 0 so a genuinely free component (an included call-out fee
-- shown in the breakdown at 0) stays representable. If a discount component
-- type is ever added to the enum, drop this one constraint in the same
-- migration that adds the label.

ALTER TABLE public.service_pricing_components
  ADD CONSTRAINT service_pricing_components_amount_nonneg_check
  CHECK (amount >= 0);


-- =============================================================================
-- 5. service_providers.min_price -- fix the type, then constrain it (D7)
-- =============================================================================
-- Safe to rewrite: service_providers has 0 rows, nothing can be truncated or
-- overflow numeric(10,2), and no view or materialised view reads min_price.
--
-- There IS one dependent object: the partial index
-- idx_service_providers_min_price (btree (min_price) WHERE min_price IS NOT
-- NULL). ALTER COLUMN TYPE rebuilds it automatically and keeps its name; the
-- assertion block below re-checks that it survived, because a silently dropped
-- index degrades provider search rather than failing anything.
--
-- min_price also carries a column-level ACL from 20260318000000
-- (authenticated=w, i.e. GRANT UPDATE, so providers can edit their own floor
-- price). Column ACLs live in pg_attribute.attacl and the attnum does not
-- change, so the grant survives the type change -- but the assertion block
-- verifies that too, because losing it breaks provider profile editing silently.

ALTER TABLE public.service_providers
  ALTER COLUMN min_price TYPE numeric(10,2);

-- Nullable (a provider may advertise no floor), and > 0 rather than >= 0: a
-- min_price of 0 is not a floor, it is the absence of one, and that is what NULL
-- already means. Scaled to match bookings.agreed_price, which is numeric(10,2).
ALTER TABLE public.service_providers
  ADD CONSTRAINT service_providers_min_price_positive_check
  CHECK (min_price IS NULL OR min_price > 0);

COMMENT ON COLUMN public.service_providers.min_price IS
  'Advertised floor price in KES, numeric(10,2) to match bookings.agreed_price. NULL means no floor advertised; 0 is not a valid floor.';


-- =============================================================================
-- 6. Wallet RPC parameter guards (D8)
-- =============================================================================
-- Both functions are replaced in place with CREATE OR REPLACE, which keeps the
-- OID, the owner and the ACL. The SET search_path clause is repeated inside each
-- definition on purpose: CREATE OR REPLACE replaces proconfig wholesale, so
-- omitting it would silently WIPE the search_path pinning that
-- 20260313000000 applied.
--
-- Preserved from the existing definitions, unchanged:
--   * credit: the single combined UPDATE of wallet_balance and total_earnings,
--     and the NOT FOUND -> 'Provider % not found' error.
--   * debit: the SELECT ... FOR UPDATE row lock, which serialises concurrent
--     debits on one provider and is the only thing preventing two simultaneous
--     payouts from each seeing the same sufficient balance; the NOT FOUND
--     check; and the insufficient-balance check with its original message.
--
-- Added: a first-statement rejection of NULL and non-positive p_amount. It is
-- the first statement so that no row is read or written on a bad call, which
-- also lets the assertion block probe it without touching data.

CREATE OR REPLACE FUNCTION public.credit_provider_wallet(p_provider_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'credit_provider_wallet: p_amount must be greater than zero (got %)',
      coalesce(p_amount::text, 'NULL')
      USING ERRCODE = '22023';
  END IF;

  UPDATE service_providers
  SET
    wallet_balance = wallet_balance + p_amount,
    total_earnings = total_earnings + p_amount
  WHERE id = p_provider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider % not found', p_provider_id;
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.debit_provider_wallet(p_provider_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  current_balance DECIMAL(12,2);
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'debit_provider_wallet: p_amount must be greater than zero (got %)',
      coalesce(p_amount::text, 'NULL')
      USING ERRCODE = '22023';
  END IF;

  SELECT wallet_balance INTO current_balance
  FROM service_providers
  WHERE id = p_provider_id
  FOR UPDATE; -- Row lock to prevent race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider % not found', p_provider_id;
  END IF;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Requested: %', current_balance, p_amount;
  END IF;

  UPDATE service_providers
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = p_provider_id;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- RE-APPLY 20260313000000 FIX 1 VERBATIM.
-- ---------------------------------------------------------------------------
-- That migration revoked EXECUTE on these two functions from PUBLIC, anon and
-- authenticated to close anonymous money minting through PostgREST (the
-- publishable key ships in the browser bundle). CREATE OR REPLACE preserves a
-- function's ACL, so in principle the revokes above still stand -- but the
-- failure mode if that is ever not true is a silent reopening of a CRITICAL
-- hole, so the revokes are re-applied unconditionally rather than assumed, and
-- asserted below. The GRANT to service_role is re-applied for the mirror-image
-- reason: if the ACL ever were reset, service_role would lose EXECUTE and the
-- entire server-side payment path (src/lib/services/payments.ts:391,:943,:975,
-- all admin.rpc()) would break. Both statements are idempotent and together
-- restore exactly the current ACL: postgres=X, service_role=X.

REVOKE EXECUTE ON FUNCTION public.credit_provider_wallet(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.debit_provider_wallet(uuid, numeric)  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.credit_provider_wallet(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_provider_wallet(uuid, numeric)  TO service_role;

ALTER FUNCTION public.credit_provider_wallet(uuid, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.debit_provider_wallet(uuid, numeric)  SET search_path = public, pg_temp;


-- =============================================================================
-- SELF-CHECK -- fail the migration loudly if anything above did not take.
-- =============================================================================
-- Every assertion here is capable of failing: each one was run against this
-- database BEFORE the migration was applied and returned the failing value.
--
-- On function bodies the assertions deliberately avoid pg_get_functiondef and
-- raw prosrc, because both return in-body COMMENTS -- a phrase mentioned in a
-- comment would satisfy a naive text match even if the code were gone. (This
-- project has already been bitten by exactly that: see the REPAIRED note inside
-- protect_pricing_after_confirmation.) Where a text match is unavoidable it is
-- made against prosrc with line comments stripped, and everything else is
-- asserted from structural catalog columns (prosecdef, proconfig, tgtype,
-- tgattr, atttypmod) or by actually calling the function.

DO $assert$
DECLARE
  n           int;
  v_type      text;
  v_code      text;
  v_fn        text;
  v_raised    boolean;
BEGIN
  -- A. All ten CHECK constraints must exist, by name, on the right table, and
  --    be VALIDATED (a NOT VALID constraint enforces new rows but would mean
  --    something unexpected happened).
  SELECT count(*) INTO n
  FROM pg_constraint con
  JOIN pg_class c      ON c.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public'
    AND con.contype = 'c'
    AND con.convalidated
    AND (c.relname, con.conname) IN (
      ('booking_payments',           'booking_payments_amount_split_check'),
      ('booking_payments',           'booking_payments_platform_fee_lte_amount_check'),
      ('booking_payments',           'booking_payments_currency_kes_check'),
      ('service_providers',          'service_providers_wallet_balance_nonneg_check'),
      ('service_providers',          'service_providers_total_earnings_nonneg_check'),
      ('service_providers',          'service_providers_min_price_positive_check'),
      ('booking_disputes',           'booking_disputes_refund_amount_nonneg_check'),
      ('provider_service_areas',     'provider_service_areas_travel_fee_nonneg_check'),
      ('service_pricing',            'service_pricing_base_amount_nonneg_check'),
      ('service_pricing_components', 'service_pricing_components_amount_nonneg_check')
    );
  IF n <> 10 THEN
    RAISE EXCEPTION 'money invariants: expected 10 validated CHECK constraints, found %', n;
  END IF;

  -- B. The money-split identity must genuinely depend on all three money
  --    columns, not merely carry the name. Asserted from pg_constraint.conkey --
  --    the catalog's own list of the columns the expression references -- rather
  --    than by string-matching pg_get_constraintdef, so it cannot false-fail on
  --    a deparser paren and cannot be satisfied by a comment. This is exactly
  --    the gap that was found: before this migration NO constraint on
  --    booking_payments had both platform_fee and provider_amount in its conkey.
  SELECT count(*) INTO n
  FROM pg_constraint con
  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
  WHERE con.conrelid = 'public.booking_payments'::regclass
    AND con.conname  = 'booking_payments_amount_split_check'
    AND a.attname IN ('amount', 'platform_fee', 'provider_amount');
  IF n <> 3 THEN
    RAISE EXCEPTION 'money invariants: booking_payments_amount_split_check references % of the three money columns, expected 3 (definition: %)',
      n,
      coalesce((SELECT pg_get_constraintdef(oid) FROM pg_constraint
                 WHERE conrelid = 'public.booking_payments'::regclass
                   AND conname = 'booking_payments_amount_split_check'), 'MISSING');
  END IF;

  --    ...and it must be an EQUALITY against a SUM, not an inequality. Matched
  --    against the definition with all parentheses and whitespace removed, so
  --    deparser formatting is irrelevant; 'amount>=...' and 'amount>...' do not
  --    match 'amount=' and are correctly rejected.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.booking_payments'::regclass
      AND conname  = 'booking_payments_amount_split_check'
      AND regexp_replace(pg_get_constraintdef(oid), '[()[:space:]]', '', 'g') ~ 'amount=.*\+'
  ) THEN
    RAISE EXCEPTION 'money invariants: booking_payments_amount_split_check is not an equality of amount against a sum (definition: %)',
      (SELECT pg_get_constraintdef(oid) FROM pg_constraint
        WHERE conrelid = 'public.booking_payments'::regclass
          AND conname = 'booking_payments_amount_split_check');
  END IF;

  -- C. The dispute trigger must exist with the right timing, events and column
  --    list. tgtype is checked as bits rather than by parsing
  --    pg_get_triggerdef: 1 = FOR EACH ROW, 2 = BEFORE, 4 = INSERT, 16 = UPDATE
  --    -> 23. The UPDATE OF columns are checked through tgattr by NAME, so the
  --    assertion does not depend on the order they were written in.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.booking_disputes'::regclass
      AND t.tgname  = 'booking_disputes_refund_within_paid'
      AND NOT t.tgisinternal
      AND t.tgtype  = 23
      AND t.tgfoid  = 'public.enforce_dispute_refund_within_paid()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'money invariants: booking_disputes_refund_within_paid is missing or is not a BEFORE INSERT OR UPDATE ... FOR EACH ROW trigger on enforce_dispute_refund_within_paid()';
  END IF;

  SELECT count(*) INTO n
  FROM pg_trigger t
  JOIN pg_attribute a ON a.attrelid = t.tgrelid AND a.attnum = ANY (t.tgattr::int2[])
  WHERE t.tgrelid = 'public.booking_disputes'::regclass
    AND t.tgname  = 'booking_disputes_refund_within_paid'
    AND a.attname IN ('refund_amount', 'booking_id');
  IF n <> 2 THEN
    RAISE EXCEPTION 'money invariants: refund trigger must watch UPDATE OF both refund_amount and booking_id, watches % of them', n;
  END IF;

  -- D. The trigger function must be SECURITY DEFINER with search_path pinned,
  --    or the cross-table cap is either RLS-blinded or hijackable.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.proname  = 'enforce_dispute_refund_within_paid'
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=public, pg_temp']
  ) THEN
    RAISE EXCEPTION 'money invariants: enforce_dispute_refund_within_paid is not SECURITY DEFINER with search_path = public, pg_temp';
  END IF;

  -- E. min_price must now be numeric(10,2) -- and its index and its column-level
  --    UPDATE grant must have survived the rewrite.
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_type
  FROM pg_attribute a
  WHERE a.attrelid = 'public.service_providers'::regclass AND a.attname = 'min_price';
  IF v_type IS DISTINCT FROM 'numeric(10,2)' THEN
    RAISE EXCEPTION 'money invariants: service_providers.min_price is %, expected numeric(10,2)', coalesce(v_type, 'MISSING');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_service_providers_min_price'
  ) THEN
    RAISE EXCEPTION 'money invariants: idx_service_providers_min_price did not survive the min_price type change';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.service_providers', 'min_price', 'UPDATE') THEN
    RAISE EXCEPTION 'money invariants: authenticated lost UPDATE on min_price (breaks provider profile editing; grant from 20260318000000)';
  END IF;

  -- F. 20260318000000 must still hold: the money columns stay client-unwritable.
  --    ALTER TABLE above touched this table, so this is re-checked rather than
  --    assumed.
  IF has_column_privilege('authenticated', 'public.service_providers', 'wallet_balance', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.service_providers', 'total_earnings', 'UPDATE')
     OR has_column_privilege('anon', 'public.service_providers', 'wallet_balance', 'UPDATE')
     OR has_column_privilege('anon', 'public.service_providers', 'total_earnings', 'UPDATE') THEN
    RAISE EXCEPTION 'money invariants: a client role regained UPDATE on wallet_balance/total_earnings (regression of 20260318000000)';
  END IF;

  -- G. 20260313000000 FIX 1 must still hold on BOTH wallet RPCs.
  --    has_function_privilege covers a PUBLIC grant as well, because anon and
  --    authenticated inherit from PUBLIC: if PUBLIC held EXECUTE, both of these
  --    would read true.
  SELECT count(*) INTO n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public'
    AND p.proname IN ('credit_provider_wallet', 'debit_provider_wallet')
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  IF n > 0 THEN
    RAISE EXCEPTION 'money invariants: % wallet RPC(s) are executable by anon/authenticated/PUBLIC -- the 20260313000000 privilege escalation is REOPEN', n;
  END IF;

  -- ...and service_role must still be able to call them, or the payment path is
  -- dead.
  SELECT count(*) INTO n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public'
    AND p.proname IN ('credit_provider_wallet', 'debit_provider_wallet')
    AND has_function_privilege('service_role', p.oid, 'EXECUTE')
    AND p.prosecdef
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF n <> 2 THEN
    RAISE EXCEPTION 'money invariants: expected 2 wallet RPCs that are SECURITY DEFINER, search_path-pinned and executable by service_role, found %', n;
  END IF;

  -- H. debit_provider_wallet must still take the row lock. Matched against
  --    prosrc with `-- ...` line comments stripped, so the phrase 'Row lock' in
  --    the trailing comment cannot satisfy it on its own.
  SELECT regexp_replace(p.prosrc, '--[^' || chr(10) || ']*', '', 'g') INTO v_code
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public' AND p.proname = 'debit_provider_wallet';
  IF v_code IS NULL OR v_code !~* 'for\s+update' THEN
    RAISE EXCEPTION 'money invariants: debit_provider_wallet lost its SELECT ... FOR UPDATE row lock';
  END IF;

  -- I. BEHAVIOURAL proof of the amount guards. This is the assertion that
  --    cannot be fooled by a comment, because it runs the function. The guard is
  --    the first statement in each body, so a rejected call reads and writes
  --    nothing; and the provider id below does not exist, so even the
  --    not-found path would be a no-op. Any write would in any case be rolled
  --    back with the subtransaction that the EXCEPTION handler opens.
  FOR v_fn IN SELECT unnest(ARRAY['credit_provider_wallet', 'debit_provider_wallet']) LOOP
    -- negative amount
    v_raised := false;
    BEGIN
      IF v_fn = 'credit_provider_wallet' THEN
        PERFORM public.credit_provider_wallet('00000000-0000-0000-0000-000000000000'::uuid, (-1)::numeric);
      ELSE
        PERFORM public.debit_provider_wallet('00000000-0000-0000-0000-000000000000'::uuid, (-1)::numeric);
      END IF;
    EXCEPTION WHEN others THEN
      v_raised := true;
      IF SQLERRM NOT LIKE '%must be greater than zero%' THEN
        RAISE EXCEPTION '% rejected a negative amount for the wrong reason: %', v_fn, SQLERRM;
      END IF;
    END;
    IF NOT v_raised THEN
      RAISE EXCEPTION '% ACCEPTED p_amount = -1 -- the wallet can still be inverted', v_fn;
    END IF;

    -- NULL amount
    v_raised := false;
    BEGIN
      IF v_fn = 'credit_provider_wallet' THEN
        PERFORM public.credit_provider_wallet('00000000-0000-0000-0000-000000000000'::uuid, NULL::numeric);
      ELSE
        PERFORM public.debit_provider_wallet('00000000-0000-0000-0000-000000000000'::uuid, NULL::numeric);
      END IF;
    EXCEPTION WHEN others THEN
      v_raised := true;
      IF SQLERRM NOT LIKE '%must be greater than zero%' THEN
        RAISE EXCEPTION '% rejected a NULL amount for the wrong reason: %', v_fn, SQLERRM;
      END IF;
    END;
    IF NOT v_raised THEN
      RAISE EXCEPTION '% ACCEPTED p_amount = NULL -- the wallet columns can still be nulled', v_fn;
    END IF;

    -- zero amount
    v_raised := false;
    BEGIN
      IF v_fn = 'credit_provider_wallet' THEN
        PERFORM public.credit_provider_wallet('00000000-0000-0000-0000-000000000000'::uuid, 0::numeric);
      ELSE
        PERFORM public.debit_provider_wallet('00000000-0000-0000-0000-000000000000'::uuid, 0::numeric);
      END IF;
    EXCEPTION WHEN others THEN
      v_raised := true;
      IF SQLERRM NOT LIKE '%must be greater than zero%' THEN
        RAISE EXCEPTION '% rejected a zero amount for the wrong reason: %', v_fn, SQLERRM;
      END IF;
    END;
    IF NOT v_raised THEN
      RAISE EXCEPTION '% ACCEPTED p_amount = 0', v_fn;
    END IF;
  END LOOP;

  RAISE NOTICE 'Money invariants verified: 10 CHECK constraints, 1 cross-table refund trigger, min_price numeric(10,2), wallet amount guards live, 20260313000000 and 20260318000000 intact.';
END
$assert$;


-- =============================================================================
-- ROLLBACK (manual -- each statement restores the unconstrained state)
-- =============================================================================
-- Section 1 -- booking_payments:
--   ALTER TABLE public.booking_payments DROP CONSTRAINT booking_payments_amount_split_check;
--   ALTER TABLE public.booking_payments DROP CONSTRAINT booking_payments_platform_fee_lte_amount_check;
--   ALTER TABLE public.booking_payments DROP CONSTRAINT booking_payments_currency_kes_check;
--
-- Section 2 -- wallet non-negativity:
--   ALTER TABLE public.service_providers DROP CONSTRAINT service_providers_wallet_balance_nonneg_check;
--   ALTER TABLE public.service_providers DROP CONSTRAINT service_providers_total_earnings_nonneg_check;
--
-- Section 3 -- disputes (drop the trigger BEFORE the function):
--   DROP TRIGGER IF EXISTS booking_disputes_refund_within_paid ON public.booking_disputes;
--   DROP FUNCTION IF EXISTS public.enforce_dispute_refund_within_paid();
--   ALTER TABLE public.booking_disputes DROP CONSTRAINT booking_disputes_refund_amount_nonneg_check;
--
-- Section 4 -- quote inputs:
--   ALTER TABLE public.provider_service_areas DROP CONSTRAINT provider_service_areas_travel_fee_nonneg_check;
--   ALTER TABLE public.service_pricing DROP CONSTRAINT service_pricing_base_amount_nonneg_check;
--   ALTER TABLE public.service_pricing_components DROP CONSTRAINT service_pricing_components_amount_nonneg_check;
--   -- (to allow negative discount components WITHOUT reverting anything else,
--   --  drop only the service_pricing_components_amount_nonneg_check line above)
--
-- Section 5 -- min_price (widening back is lossless; the index rebuilds again):
--   ALTER TABLE public.service_providers DROP CONSTRAINT service_providers_min_price_positive_check;
--   ALTER TABLE public.service_providers ALTER COLUMN min_price TYPE numeric;
--
-- Section 6 -- wallet RPCs. DO NOT roll these back with DROP FUNCTION: dropping
-- and recreating restores the default PUBLIC EXECUTE and reopens the
-- 20260313000000 privilege escalation. Revert by CREATE OR REPLACE with the
-- previous bodies (the two definitions quoted in the D8 note above), keeping
-- `SECURITY DEFINER` and `SET search_path = public, pg_temp` on both, then
-- re-running:
--   REVOKE EXECUTE ON FUNCTION public.credit_provider_wallet(uuid, numeric) FROM PUBLIC, anon, authenticated;
--   REVOKE EXECUTE ON FUNCTION public.debit_provider_wallet(uuid, numeric)  FROM PUBLIC, anon, authenticated;
-- =============================================================================
