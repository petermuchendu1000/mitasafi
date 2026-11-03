-- =============================================================================
-- Operator recovery for payments that were charged but could not settle
-- =============================================================================
-- APPROVED DESIGN. Closes two defects I introduced, and one window I left open.
--
-- DEFECT B -- a genuinely paid customer could become unrecoverable.
--   settle_booking_payment required status IN ('pending','processing'). Nothing
--   anywhere could settle a 'failed' payment: not the callback, not the poller,
--   and not p_verified_by = 'manual_reconciliation', because the status guard
--   ran regardless of the route. Reproduced end to end against this database:
--     forged failure -> failed_recorded
--     genuine success -> not_settleable, wallet 0.00
--     manual_reconciliation -> not_settleable, wallet 0.00
--   Customer debited KES 10,000, provider credited 0, no ledger entry, no path
--   to recover. Falsified three ways before accepting it: only two functions
--   write that status and both guarded identically; the sole trigger is
--   updated_at; pg_cron is absent and no cron reconciles.
--
-- THE FIX, and why it is shaped this way:
--   The naive fix is to widen the guard to admit 'failed'. That would reopen
--   the resurrection attack closed in 36ff5e6 -- forge a failure, forge a
--   success, mint wallet balance on repeat. So the guard is SPLIT by route:
--     authoritative_query   -> unchanged, still strictly pending/processing
--     manual_reconciliation -> may also settle 'failed', but ONLY with a
--                              p_operator_id that exists in profiles
--   Idempotency is hoisted ABOVE both: 'completed' and 'refunded' are never
--   re-settled by any route, and wallet_ledger_one_credit_per_payment remains
--   the second line of defence. 'cancelled' is deliberately NOT recoverable.
--   Every recovered shilling is attributable: the operator id is written into
--   the ledger note and the payment metadata.
--
-- DEFECT C -- orphaned payments were retired silently.
--   initiatePayment calls the STK push and writes mpesa_checkout_request_id
--   afterwards. Death in between leaves a payment the customer may have PAID
--   that no callback can ever match, because the callback looks the payment up
--   solely by that column. The window cannot be closed on this rail: Daraja
--   returns the correlation ids in the push response and echoes no identifier
--   we control. So the fix makes orphans DETECTABLE rather than silent --
--   expire_stale_booking_payments now flags a payment expiring with no
--   checkout id as needs_reconciliation, which is precisely what the operator
--   route above exists to resolve.
--
-- Rollback: restore both function bodies from 20260325000000 and
-- 20260324000000 respectively, keeping their SET search_path clauses and the
-- REVOKE below. Rolling back re-opens the unrecoverable-payment defect.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.settle_booking_payment(
  p_payment_id     uuid,
  p_receipt_number text DEFAULT NULL::text,
  p_result_code    integer DEFAULT NULL::integer,
  p_result_desc    text DEFAULT NULL::text,
  p_claimed_amount numeric DEFAULT NULL::numeric,
  p_verified_by    text DEFAULT 'authoritative_query'::text,
  p_operator_id    uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_payment    booking_payments;
  v_new_balance numeric(12,2);
  v_mismatch   boolean := false;
  v_booking_moved boolean := true;
  v_booking_err text := NULL;
  v_receipt    text;
  v_note       text;
BEGIN
  IF p_verified_by NOT IN ('authoritative_query', 'manual_reconciliation') THEN
    RAISE EXCEPTION 'settle_booking_payment: p_verified_by must name an authoritative source, got %', p_verified_by;
  END IF;

  SELECT * INTO v_payment FROM booking_payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found', 'credited', false);
  END IF;

  -- Idempotency comes FIRST and applies to every route. A payment that has
  -- already settled or been refunded is never settled again, by anyone, for any
  -- reason. The unique index wallet_ledger_one_credit_per_payment is the second
  -- line of defence behind this.
  IF v_payment.status IN ('completed', 'refunded') THEN
    RETURN jsonb_build_object(
      'outcome', 'not_settleable',
      'current_status', v_payment.status,
      'credited', false
    );
  END IF;

  IF p_verified_by = 'authoritative_query' THEN
    -- UNCHANGED AND DELIBERATELY STRICT. Only an OPEN payment may be settled by
    -- an automated caller. This is the guard that blocks the resurrection
    -- attack: forge a failure, then forge a success, and mint wallet balance on
    -- repeat. Widening it here would reopen that hole, which is exactly why
    -- recovery is a separate, operator-gated route below rather than a
    -- relaxation of this one.
    IF v_payment.status NOT IN ('pending', 'processing') THEN
      RETURN jsonb_build_object(
        'outcome', 'not_settleable',
        'current_status', v_payment.status,
        'credited', false
      );
    END IF;

  ELSIF p_verified_by = 'manual_reconciliation' THEN
    -- OPERATOR RECOVERY. A customer can be genuinely debited and still end up
    -- with a 'failed' payment: the callback's verification can time out, or a
    -- forged failure can close a live payment, and expire_stale_booking_payments
    -- then retires it at 15 minutes. Before this route existed NOTHING could
    -- settle such a payment -- not the callback, not the poller, not even
    -- p_verified_by = 'manual_reconciliation', because the status guard blocked
    -- it regardless. The customer's money was simply gone.
    --
    -- This route is gated on a named human, not on a flag, because it is the
    -- one path that can credit a wallet without an automated authority saying
    -- so. The operator id is recorded in the ledger note and the payment
    -- metadata so every recovered shilling is attributable.
    IF p_operator_id IS NULL THEN
      RAISE EXCEPTION 'settle_booking_payment: manual reconciliation requires p_operator_id'
        USING HINT = 'Recovering a payment by hand must be attributable to a person.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_operator_id) THEN
      RAISE EXCEPTION 'settle_booking_payment: operator % does not exist', p_operator_id;
    END IF;

    -- 'cancelled' is deliberately NOT recoverable: it means a deliberate
    -- cancellation, not a payment that may silently have succeeded.
    IF v_payment.status NOT IN ('pending', 'processing', 'failed') THEN
      RETURN jsonb_build_object(
        'outcome', 'not_settleable',
        'current_status', v_payment.status,
        'credited', false
      );
    END IF;
  END IF;

  -- Only ever add a receipt; never clear one that is already recorded.
  v_receipt := coalesce(p_receipt_number, v_payment.mpesa_receipt_number);

  IF p_claimed_amount IS NOT NULL AND p_claimed_amount <> v_payment.amount THEN
    v_mismatch := true;
  END IF;

  UPDATE booking_payments
     SET status                 = 'completed',
         mpesa_receipt_number   = v_receipt,
         mpesa_result_code      = coalesce(p_result_code, mpesa_result_code),
         mpesa_result_desc      = coalesce(p_result_desc, mpesa_result_desc),
         confirmed_at           = now(),
         settlement_verified_by = p_verified_by,
         claimed_amount         = coalesce(p_claimed_amount, claimed_amount),
         amount_mismatch        = v_mismatch,
         metadata               = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                                    'settled_at', now(),
                                    'settlement_verified_by', p_verified_by,
                                    'claimed_amount', p_claimed_amount,
                                    'amount_mismatch', v_mismatch,
                                    'operator_id', p_operator_id,
                                    'recovered_from_status', CASE WHEN v_payment.status = 'failed'
                                                                  THEN v_payment.status::text END
                                  )
   WHERE id = p_payment_id;

  UPDATE service_providers
     SET wallet_balance  = wallet_balance + v_payment.provider_amount,
         total_earnings  = total_earnings + v_payment.provider_amount
   WHERE id = v_payment.provider_id
  RETURNING wallet_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'settle_booking_payment: provider % not found', v_payment.provider_id;
  END IF;

  v_note := format('settled via %s, receipt %s', p_verified_by, coalesce(v_receipt, 'none'));
  IF p_operator_id IS NOT NULL THEN
    v_note := v_note || format(', recovered from %s by operator %s', v_payment.status, p_operator_id);
  END IF;

  INSERT INTO provider_wallet_ledger
    (provider_id, entry_type, amount, balance_after, payment_id, note)
  VALUES
    (v_payment.provider_id, 'credit_payment', v_payment.provider_amount,
     v_new_balance, p_payment_id, v_note);

  BEGIN
    PERFORM set_config('app.current_user_id', v_payment.payer_id::text, true);
    PERFORM set_config('app.current_user_role', 'customer', true);

    UPDATE bookings
       SET status         = 'resolved',
           payment_status = 'paid',
           payment_ref    = coalesce(v_receipt, payment_ref)
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
    'verified_by', p_verified_by,
    'operator_id', p_operator_id,
    'credited_amount', v_payment.provider_amount,
    'balance_after', v_new_balance,
    'amount_mismatch', v_mismatch,
    'booking_moved', v_booking_moved,
    'booking_error', v_booking_err
  );
END
$function$;


CREATE OR REPLACE FUNCTION public.expire_stale_booking_payments(p_older_than interval DEFAULT '00:15:00'::interval, p_booking_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    UPDATE booking_payments
       SET status         = 'failed',
           failure_reason = CASE
             WHEN mpesa_checkout_request_id IS NULL
               THEN 'expired: no provider reference was ever recorded (possible orphan)'
             ELSE 'expired: no settlement received within the STK window'
           END,
           failed_at      = now(),
           -- An expiring payment with NO provider reference is an ORPHAN: the
           -- STK push was sent to Safaricom and the response never reached our
           -- write, so the customer's handset may have been prompted and the
           -- customer may have PAID, while no callback can ever be matched to
           -- this row (the callback is looked up solely by
           -- mpesa_checkout_request_id). Flag it for an operator rather than
           -- retiring it silently; settle_booking_payment's manual
           -- reconciliation route is how it gets resolved.
           needs_reconciliation = (mpesa_checkout_request_id IS NULL),
           reconciliation_note = CASE
             WHEN mpesa_checkout_request_id IS NULL
               THEN 'Orphan: expired with no checkout id. The customer may have been charged. Confirm against the provider portal before recovering.'
             ELSE reconciliation_note
           END,
           metadata       = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                              'expired_at', now(),
                              'orphan', (mpesa_checkout_request_id IS NULL)
                            )
     WHERE status IN ('pending', 'processing')
       AND created_at < now() - p_older_than
       AND (p_booking_id IS NULL OR booking_id = p_booking_id)
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END
$function$;

-- Service-role only, as before. CREATE OR REPLACE preserves the ACL, but this
-- is restated because the signature CHANGED (a new parameter), which creates a
-- NEW function entry rather than replacing the old one in place.
REVOKE ALL ON FUNCTION public.settle_booking_payment(uuid, text, integer, text, numeric, text, uuid) FROM PUBLIC, anon, authenticated;

-- The 6-argument signature still exists and would otherwise remain callable.
DROP FUNCTION IF EXISTS public.settle_booking_payment(uuid, text, integer, text, numeric, text);

DO $assert$
BEGIN
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'settle_booking_payment') <> 1 THEN
    RAISE EXCEPTION 'FAILED: expected exactly one settle_booking_payment signature, found %',
      (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname='public' AND p.proname='settle_booking_payment');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname='public' AND p.proname='settle_booking_payment'
                    AND p.prosecdef
                    AND array_to_string(p.proconfig, ',') LIKE '%search_path%') THEN
    RAISE EXCEPTION 'FAILED: settle_booking_payment lost SECURITY DEFINER or its pinned search_path';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname='public' AND p.proname IN ('settle_booking_payment','expire_stale_booking_payments')
                AND (has_function_privilege('anon', p.oid, 'EXECUTE')
                     OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))) THEN
    RAISE EXCEPTION 'FAILED: a client role can execute a settlement function';
  END IF;

  IF position('p_operator_id' in (SELECT prosrc FROM pg_proc WHERE proname='settle_booking_payment')) = 0 THEN
    RAISE EXCEPTION 'FAILED: the operator gate is not in the function body';
  END IF;

  IF position('needs_reconciliation' in (SELECT prosrc FROM pg_proc WHERE proname='expire_stale_booking_payments')) = 0 THEN
    RAISE EXCEPTION 'FAILED: orphan flagging is not in expire_stale_booking_payments';
  END IF;

  RAISE NOTICE 'Operator recovery route live; automated route still strict; orphans flagged.';
END
$assert$;
