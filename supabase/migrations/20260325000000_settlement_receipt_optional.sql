-- =============================================================================
-- Make the settlement receipt optional, and never erase one
-- =============================================================================
-- Follow-up to 20260324000000.
--
-- Two problems surfaced when wiring the TypeScript caller:
--
-- 1. settle_booking_payment required p_receipt_number, but the authoritative
--    source does not always supply one. Safaricom's stkpushquery returns only
--    ResultCode and ResultDesc -- no receipt and no amount -- so a settlement
--    driven by the status query (which is how a payment gets resolved when the
--    callback never arrives, or is not trusted) has no receipt to pass.
--
-- 2. The UPDATE assigned p_receipt_number unconditionally. Once the parameter
--    is nullable, a poll-driven settlement arriving after a callback had
--    already recorded the receipt would overwrite it with NULL, destroying the
--    only reference tying our row to Safaricom's transaction.
--
-- Fixed by defaulting the parameter to NULL and coalescing against the stored
-- value, so a settlement can only ever ADD a receipt, never remove one. The
-- unique receipt index is partial (WHERE mpesa_receipt_number IS NOT NULL), so
-- un-receipted rows do not collide with each other.
--
-- NOTE: CREATE OR REPLACE FUNCTION preserves the OID, owner and ACL, so the
-- REVOKEs from 20260324000000 survive. It does NOT preserve proconfig, so the
-- SET search_path clause must be restated here or the function would silently
-- lose its pinning.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.settle_booking_payment(
  p_payment_id      uuid,
  p_receipt_number  text DEFAULT NULL,
  p_result_code     integer DEFAULT NULL,
  p_result_desc     text DEFAULT NULL,
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
  v_receipt    text;
BEGIN
  IF p_verified_by NOT IN ('authoritative_query', 'manual_reconciliation') THEN
    RAISE EXCEPTION 'settle_booking_payment: p_verified_by must name an authoritative source, got %', p_verified_by;
  END IF;

  SELECT * INTO v_payment FROM booking_payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found', 'credited', false);
  END IF;

  IF v_payment.status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object(
      'outcome', 'not_settleable',
      'current_status', v_payment.status,
      'credited', false
    );
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
                                    'amount_mismatch', v_mismatch
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

  INSERT INTO provider_wallet_ledger
    (provider_id, entry_type, amount, balance_after, payment_id, note)
  VALUES
    (v_payment.provider_id, 'credit_payment', v_payment.provider_amount,
     v_new_balance, p_payment_id,
     format('settled via %s, receipt %s', p_verified_by, coalesce(v_receipt, 'none')));

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
    'credited_amount', v_payment.provider_amount,
    'balance_after', v_new_balance,
    'amount_mismatch', v_mismatch,
    'booking_moved', v_booking_moved,
    'booking_error', v_booking_err
  );
END
$$;

REVOKE ALL ON FUNCTION public.settle_booking_payment(uuid, text, integer, text, numeric, text) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname='public' AND p.proname='settle_booking_payment'
                    AND p.prosecdef
                    AND array_to_string(p.proconfig, ',') LIKE '%search_path%') THEN
    RAISE EXCEPTION 'FAILED: settle_booking_payment lost SECURITY DEFINER or its pinned search_path';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname='public' AND p.proname='settle_booking_payment'
                AND has_function_privilege('authenticated', p.oid, 'EXECUTE')) THEN
    RAISE EXCEPTION 'FAILED: authenticated can execute settle_booking_payment';
  END IF;
  -- p_receipt_number must now be omittable: 5 of the 6 parameters have defaults.
  IF (SELECT pronargdefaults FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname='public' AND p.proname='settle_booking_payment') < 5 THEN
    RAISE EXCEPTION 'FAILED: settle_booking_payment does not accept an omitted receipt';
  END IF;
  RAISE NOTICE 'settle_booking_payment: receipt optional, coalesced, privileges intact.';
END
$$;

-- ROLLBACK: re-apply the function body from 20260324000000 (parameter list with
-- p_receipt_number required), keeping the SET search_path clause and the REVOKE.
