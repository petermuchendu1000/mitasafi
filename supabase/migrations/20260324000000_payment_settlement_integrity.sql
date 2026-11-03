-- =============================================================================
-- C-1 / C-2 / C-3 / C-3c / C-3e / C-9: payment settlement integrity
-- =============================================================================
-- This migration moves every money state transition into a single database
-- transaction behind SECURITY DEFINER functions, because exactly-once and
-- all-or-nothing cannot be guaranteed from application code making a sequence
-- of independent PostgREST calls.
--
-- DEFECTS THIS CLOSES (each verified against this database before writing):
--
-- 1. Duplicate/forged callbacks double-credited the wallet. The app read the
--    payment status, then wrote, then credited, with no compare-and-set. There
--    was no unique index on booking_id and none on mpesa_receipt_number, so the
--    same receipt could be replayed indefinitely.
-- 2. The idempotency guard tested only status IN ('completed','refunded') -- 2 of
--    the 6 payment_transaction_status values -- so a 'failed' payment could be
--    resurrected to 'completed' and credited.
-- 3. The booking update's error was discarded (throwOnError appears 0 times in
--    the repo), so when the state machine correctly rejected the transition the
--    wallet was credited anyway.
-- 4. idempotency_key was built as 'pay_<booking>_<Date.now()>', unique by
--    construction, which made the UNIQUE index on it inert. The real guard was a
--    lock-free check-then-act that only looked for status='pending'.
-- 5. Wallet debit (payout) and the payout row insert were two transactions.
--    Process death between them destroyed money with no record anywhere.
-- 6. The completion write replaced booking_payments.metadata wholesale,
--    destroying the commission record written at initiation.
--
-- Precondition asserted below: all money tables are empty, so every index and
-- NOT NULL here is free. This is the cheapest possible moment.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Preconditions
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF (SELECT count(*) FROM booking_payments) > 0 THEN
    RAISE EXCEPTION 'PRECONDITION: booking_payments is not empty; the unique indexes below need a backfill/dedupe plan first';
  END IF;
  IF (SELECT count(*) FROM provider_payouts) > 0 THEN
    RAISE EXCEPTION 'PRECONDITION: provider_payouts is not empty';
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 1. Structural uniqueness: one open payment per booking, one use per receipt
-- -----------------------------------------------------------------------------
-- Replaces the lock-free check-then-act. A concurrent second attempt now gets
-- 23505 instead of creating a second chargeable row.
CREATE UNIQUE INDEX IF NOT EXISTS booking_payments_one_open_per_booking
  ON public.booking_payments (booking_id)
  WHERE status IN ('pending', 'processing');

-- A receipt number may settle exactly one payment, ever. Makes callback replay
-- impossible at the storage layer. The existing non-unique index is redundant.
DROP INDEX IF EXISTS public.idx_booking_payments_mpesa_receipt;
CREATE UNIQUE INDEX IF NOT EXISTS booking_payments_mpesa_receipt_unique
  ON public.booking_payments (mpesa_receipt_number)
  WHERE mpesa_receipt_number IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Settlement provenance and the amount tripwire
-- -----------------------------------------------------------------------------
-- Neither Safaricom's stkpushquery NOR PayHero's transaction-status returns an
-- amount (both verified). So the authoritative amount is OUR stored one, and the
-- amount the callback claims is recorded as a tripwire only -- never booked.
ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS settlement_verified_by text
    CHECK (settlement_verified_by IS NULL OR settlement_verified_by IN
           ('authoritative_query', 'manual_reconciliation')),
  ADD COLUMN IF NOT EXISTS claimed_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS amount_mismatch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_reconciliation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliation_note text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN public.booking_payments.claimed_amount IS
  'Amount asserted by an inbound callback. Recorded for detection only and NEVER booked; the authoritative amount is this row''s amount column.';
COMMENT ON COLUMN public.booking_payments.settlement_verified_by IS
  'How this settlement was authorised. A callback body is never sufficient on its own.';

-- -----------------------------------------------------------------------------
-- 3. Wallet ledger: makes a double credit impossible regardless of app bugs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_wallet_ledger (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE RESTRICT,
  entry_type     text NOT NULL CHECK (entry_type IN
                   ('credit_payment', 'debit_payout', 'reversal_payout', 'adjustment')),
  -- Signed: positive credits the provider, negative debits.
  amount         numeric(12,2) NOT NULL CHECK (amount <> 0),
  balance_after  numeric(12,2) NOT NULL,
  payment_id     uuid REFERENCES public.booking_payments(id) ON DELETE RESTRICT,
  payout_id      uuid REFERENCES public.provider_payouts(id) ON DELETE RESTRICT,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- A credit must cite the payment it came from; a payout entry must cite the payout.
  CONSTRAINT wallet_ledger_source_required CHECK (
    (entry_type = 'credit_payment'  AND payment_id IS NOT NULL AND payout_id IS NULL)
 OR (entry_type IN ('debit_payout', 'reversal_payout') AND payout_id IS NOT NULL AND payment_id IS NULL)
 OR (entry_type = 'adjustment' AND note IS NOT NULL)
  ),
  CONSTRAINT wallet_ledger_sign_matches_type CHECK (
    (entry_type IN ('credit_payment', 'reversal_payout') AND amount > 0)
 OR (entry_type = 'debit_payout' AND amount < 0)
 OR (entry_type = 'adjustment')
  )
);

-- THE exactly-once guarantee for payment credits.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_one_credit_per_payment
  ON public.provider_wallet_ledger (payment_id)
  WHERE entry_type = 'credit_payment';

-- One debit and at most one reversal per payout.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_one_debit_per_payout
  ON public.provider_wallet_ledger (payout_id)
  WHERE entry_type = 'debit_payout';
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_one_reversal_per_payout
  ON public.provider_wallet_ledger (payout_id)
  WHERE entry_type = 'reversal_payout';

CREATE INDEX IF NOT EXISTS wallet_ledger_provider_created
  ON public.provider_wallet_ledger (provider_id, created_at DESC);

ALTER TABLE public.provider_wallet_ledger ENABLE ROW LEVEL SECURITY;

-- The ledger is append-only. No UPDATE or DELETE, by anyone, ever.
CREATE OR REPLACE FUNCTION public.fn_wallet_ledger_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'provider_wallet_ledger is append-only (attempted %)', TG_OP;
END
$$;

DROP TRIGGER IF EXISTS trg_wallet_ledger_append_only ON public.provider_wallet_ledger;
CREATE TRIGGER trg_wallet_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.provider_wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION public.fn_wallet_ledger_append_only();

-- Providers may read their own ledger. Nobody writes it except the functions below.
DROP POLICY IF EXISTS wallet_ledger_own_read ON public.provider_wallet_ledger;
CREATE POLICY wallet_ledger_own_read ON public.provider_wallet_ledger
  FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

REVOKE ALL ON public.provider_wallet_ledger FROM anon, authenticated;
GRANT SELECT ON public.provider_wallet_ledger TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. settle_booking_payment: the ONLY way a payment becomes 'completed'
-- -----------------------------------------------------------------------------
-- One transaction: compare-and-set the payment, credit the wallet through the
-- ledger, move the booking. Returns what it did so the caller cannot
-- misinterpret silence as success.
--
-- Callers MUST have already confirmed success with the provider's own
-- server-side status endpoint. A callback body is not evidence.
CREATE OR REPLACE FUNCTION public.settle_booking_payment(
  p_payment_id      uuid,
  p_receipt_number  text,
  p_result_code     integer,
  p_result_desc     text,
  p_claimed_amount  numeric DEFAULT NULL,
  p_verified_by     text DEFAULT 'authoritative_query'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment    booking_payments;
  v_new_balance numeric(12,2);
  v_mismatch   boolean := false;
  v_booking_moved boolean := true;
  v_booking_err text := NULL;
BEGIN
  IF p_verified_by NOT IN ('authoritative_query', 'manual_reconciliation') THEN
    RAISE EXCEPTION 'settle_booking_payment: p_verified_by must name an authoritative source, got %', p_verified_by;
  END IF;

  -- Serialise concurrent settlements of the same payment.
  SELECT * INTO v_payment FROM booking_payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found', 'credited', false);
  END IF;

  -- Compare-and-set: only an open payment may settle. This is the guard that
  -- replaces the old 2-of-6-statuses test, and it is held under the row lock.
  IF v_payment.status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object(
      'outcome', 'not_settleable',
      'current_status', v_payment.status,
      'credited', false
    );
  END IF;

  -- The claimed amount is a tripwire, never a source of truth.
  IF p_claimed_amount IS NOT NULL AND p_claimed_amount <> v_payment.amount THEN
    v_mismatch := true;
  END IF;

  UPDATE booking_payments
     SET status                = 'completed',
         mpesa_receipt_number  = p_receipt_number,
         mpesa_result_code     = p_result_code,
         mpesa_result_desc     = p_result_desc,
         confirmed_at          = now(),
         settlement_verified_by = p_verified_by,
         claimed_amount        = p_claimed_amount,
         amount_mismatch       = v_mismatch,
         -- MERGE metadata; the old code replaced it and destroyed the
         -- commission record written at initiation.
         metadata              = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                                   'settled_at', now(),
                                   'settlement_verified_by', p_verified_by,
                                   'claimed_amount', p_claimed_amount,
                                   'amount_mismatch', v_mismatch
                                 )
   WHERE id = p_payment_id;

  -- Credit through the ledger. The unique index makes a second credit for this
  -- payment impossible even if this function is somehow called twice.
  UPDATE service_providers
     SET wallet_balance  = wallet_balance + v_payment.provider_amount,
         total_earnings  = total_earnings + v_payment.provider_amount
   WHERE id = v_payment.provider_id
  RETURNING wallet_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'settle_booking_payment: provider % not found', v_payment.provider_id;
  END IF;

  INSERT INTO provider_wallet_ledger
    (provider_id, entry_type, amount, balance_after, payment_id, note)
  VALUES
    (v_payment.provider_id, 'credit_payment', v_payment.provider_amount,
     v_new_balance, p_payment_id,
     format('settled via %s, receipt %s', p_verified_by, coalesce(p_receipt_number, 'n/a')));

  -- Move the booking. If the state machine refuses, do NOT lose the money:
  -- keep the payment and the credit, and flag the booking for an operator.
  BEGIN
    PERFORM set_config('app.current_user_id', v_payment.payer_id::text, true);
    PERFORM set_config('app.current_user_role', 'customer', true);

    UPDATE bookings
       SET status         = 'resolved',
           payment_status = 'paid',
           payment_ref    = p_receipt_number
     WHERE id = v_payment.booking_id;
  EXCEPTION WHEN OTHERS THEN
    v_booking_moved := false;
    v_booking_err := SQLERRM;
    UPDATE booking_payments
       SET needs_reconciliation = true,
           reconciliation_note  = format('payment settled and wallet credited, but booking did not transition: %s', v_booking_err)
     WHERE id = p_payment_id;
  END;

  RETURN jsonb_build_object(
    'outcome', 'settled',
    'credited', true,
    'credited_amount', v_payment.provider_amount,
    'balance_after', v_new_balance,
    'amount_mismatch', v_mismatch,
    'booking_moved', v_booking_moved,
    'booking_error', v_booking_err
  );
END
$$;

-- -----------------------------------------------------------------------------
-- 5. fail_booking_payment: the mirror, also compare-and-set
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fail_booking_payment(
  p_payment_id  uuid,
  p_result_code integer,
  p_result_desc text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment booking_payments;
BEGIN
  SELECT * INTO v_payment FROM booking_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  -- A completed payment is NEVER downgraded by a late or forged failure.
  IF v_payment.status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object('outcome', 'not_settleable', 'current_status', v_payment.status);
  END IF;

  UPDATE booking_payments
     SET status            = 'failed',
         mpesa_result_code = p_result_code,
         mpesa_result_desc = p_result_desc,
         failure_reason    = p_result_desc,
         failed_at         = now(),
         metadata          = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('failed_at', now(), 'failure_reason', p_result_desc)
   WHERE id = p_payment_id;

  BEGIN
    PERFORM set_config('app.current_user_id', v_payment.payer_id::text, true);
    PERFORM set_config('app.current_user_role', 'customer', true);
    UPDATE bookings
       SET status = 'payment_failed', payment_status = 'pending'
     WHERE id = v_payment.booking_id;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- a stale booking status must not block recording the failure
  END;

  RETURN jsonb_build_object('outcome', 'failed_recorded');
END
$$;

-- -----------------------------------------------------------------------------
-- 6. request_provider_payout: debit + insert in ONE transaction (fixes C-3c)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_provider_payout(
  p_provider_id   uuid,
  p_amount        numeric,
  p_payout_method text,
  p_mpesa_phone   text,
  p_reference     text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance numeric(12,2);
  v_payout_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'payout amount must be > 0 (got %)', p_amount;
  END IF;

  SELECT wallet_balance INTO v_balance
    FROM service_providers WHERE id = p_provider_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'provider % not found', p_provider_id;
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('outcome', 'insufficient_balance', 'available', v_balance);
  END IF;

  IF EXISTS (SELECT 1 FROM provider_payouts
              WHERE provider_id = p_provider_id
                AND status IN ('pending'::payout_status, 'processing'::payout_status)) THEN
    RETURN jsonb_build_object('outcome', 'payout_already_open');
  END IF;

  -- payout_method is the payment_method_type enum and status is payout_status;
  -- both need an explicit cast from the text parameters.
  INSERT INTO provider_payouts
    (provider_id, amount, currency, payout_method, mpesa_phone, status, reference)
  VALUES
    (p_provider_id, p_amount, 'KES', p_payout_method::payment_method_type,
     p_mpesa_phone, 'pending'::payout_status, p_reference)
  RETURNING id INTO v_payout_id;

  UPDATE service_providers
     SET wallet_balance = wallet_balance - p_amount
   WHERE id = p_provider_id
  RETURNING wallet_balance INTO v_balance;

  -- NOTE: total_earnings is deliberately NOT decremented. A payout moves money
  -- out of the wallet; it does not un-earn it. The old rollback path called
  -- credit_provider_wallet, which bumped total_earnings and inflated lifetime
  -- earnings permanently on every failed request.
  INSERT INTO provider_wallet_ledger
    (provider_id, entry_type, amount, balance_after, payout_id, note)
  VALUES
    (p_provider_id, 'debit_payout', -p_amount, v_balance, v_payout_id,
     format('payout request %s', p_reference));

  RETURN jsonb_build_object('outcome', 'requested', 'payout_id', v_payout_id, 'balance_after', v_balance);
END
$$;

-- -----------------------------------------------------------------------------
-- 7. expire_stale_booking_payments: prevents permanent lockout
-- -----------------------------------------------------------------------------
-- The partial unique index in (1) means one abandoned 'pending' row would make a
-- booking unpayable forever. STK prompts expire in about a minute, so anything
-- still open well past that is dead. Called lazily on the next payment attempt
-- and safe to run from a cron.
CREATE OR REPLACE FUNCTION public.expire_stale_booking_payments(
  p_older_than interval DEFAULT interval '15 minutes',
  p_booking_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    UPDATE booking_payments
       SET status         = 'failed',
           failure_reason = 'expired: no settlement received within the STK window',
           failed_at      = now(),
           metadata       = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('expired_at', now())
     WHERE status IN ('pending', 'processing')
       AND created_at < now() - p_older_than
       AND (p_booking_id IS NULL OR booking_id = p_booking_id)
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END
$$;

-- -----------------------------------------------------------------------------
-- 8. Privileges: these are service-role only. No client may call them.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.settle_booking_payment(uuid, text, integer, text, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_booking_payment(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_provider_payout(uuid, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_booking_payments(interval, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_wallet_ledger_append_only() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 9. Assertions. Each one is capable of failing.
-- =============================================================================
DO $$
DECLARE v_fn text;
BEGIN
  -- indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
                  AND indexname='booking_payments_one_open_per_booking') THEN
    RAISE EXCEPTION 'FAILED: one-open-payment-per-booking index missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
                  AND indexname='booking_payments_mpesa_receipt_unique') THEN
    RAISE EXCEPTION 'FAILED: unique receipt index missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
              AND indexname='idx_booking_payments_mpesa_receipt') THEN
    RAISE EXCEPTION 'FAILED: the old non-unique receipt index is still present';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
                  AND indexname='wallet_ledger_one_credit_per_payment') THEN
    RAISE EXCEPTION 'FAILED: exactly-once credit index missing';
  END IF;

  -- functions exist AND are SECURITY DEFINER with a pinned search_path
  FOREACH v_fn IN ARRAY ARRAY['settle_booking_payment','fail_booking_payment',
                              'request_provider_payout','expire_stale_booking_payments'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                    WHERE n.nspname='public' AND p.proname=v_fn AND p.prosecdef) THEN
      RAISE EXCEPTION 'FAILED: % missing or not SECURITY DEFINER', v_fn;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                    WHERE n.nspname='public' AND p.proname=v_fn
                      AND array_to_string(p.proconfig, ',') LIKE '%search_path%') THEN
      RAISE EXCEPTION 'FAILED: % has no pinned search_path', v_fn;
    END IF;
    -- no client may execute them
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = v_fn
                  AND has_function_privilege('authenticated', p.oid, 'EXECUTE')) THEN
      RAISE EXCEPTION 'FAILED: authenticated can execute %', v_fn;
    END IF;
  END LOOP;

  -- the ledger must be append-only
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                  WHERE tgrelid='public.provider_wallet_ledger'::regclass
                    AND tgname='trg_wallet_ledger_append_only') THEN
    RAISE EXCEPTION 'FAILED: ledger append-only trigger missing';
  END IF;

  RAISE NOTICE 'Settlement integrity objects verified.';
END
$$;

-- =============================================================================
-- ROLLBACK:
--   DROP FUNCTION public.settle_booking_payment(uuid,text,integer,text,numeric,text);
--   DROP FUNCTION public.fail_booking_payment(uuid,integer,text);
--   DROP FUNCTION public.request_provider_payout(uuid,numeric,text,text,text);
--   DROP FUNCTION public.expire_stale_booking_payments(interval,uuid);
--   DROP TABLE public.provider_wallet_ledger;       -- drops its indexes/trigger
--   DROP FUNCTION public.fn_wallet_ledger_append_only();
--   DROP INDEX public.booking_payments_one_open_per_booking;
--   DROP INDEX public.booking_payments_mpesa_receipt_unique;
--   CREATE INDEX idx_booking_payments_mpesa_receipt ON public.booking_payments
--     USING btree (mpesa_receipt_number) WHERE mpesa_receipt_number IS NOT NULL;
--   ALTER TABLE public.booking_payments
--     DROP COLUMN settlement_verified_by, DROP COLUMN claimed_amount,
--     DROP COLUMN amount_mismatch, DROP COLUMN needs_reconciliation,
--     DROP COLUMN reconciliation_note, DROP COLUMN expires_at;
-- =============================================================================
