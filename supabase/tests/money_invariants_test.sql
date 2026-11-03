DO $INV$
DECLARE
  v_cust uuid := gen_random_uuid(); v_pu uuid := gen_random_uuid();
  v_prov uuid; v_svc uuid; v_stype uuid; b1 uuid; p1 uuid;
  rep text := E'\n'; pass int := 0; fail int := 0; r jsonb; t text;
BEGIN
  SELECT id INTO v_svc FROM services LIMIT 1;
  SELECT id INTO v_stype FROM service_types LIMIT 1;
  INSERT INTO auth.users (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid');
  INSERT INTO profiles (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid');
  INSERT INTO service_providers (user_id,business_name,phone,is_active,wallet_balance,total_earnings)
    VALUES (v_pu,'T','+254700000001',true,0,0) RETURNING id INTO v_prov;
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',1000.00,60,
      jsonb_build_object('total',1000.00),'KES') RETURNING id INTO b1;
  UPDATE bookings SET status='confirmed' WHERE id=b1;
  UPDATE bookings SET status='in_progress' WHERE id=b1;
  UPDATE bookings SET actual_start = now() - interval '2 hours' WHERE id=b1;
  UPDATE bookings SET status='completed' WHERE id=b1;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b1;
  UPDATE bookings SET status='payment_pending' WHERE id=b1;

  -- I1: a broken money split must be REJECTED
  BEGIN
    INSERT INTO booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,provider_amount,
        status,payment_method,idempotency_key)
      VALUES (b1,v_cust,v_prov,1000.00,100.00,899.99,'pending','mpesa','bad');
    fail:=fail+1; rep:=rep||'FAIL I1: amount <> fee + provider was ACCEPTED'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS I1 broken split rejected (23514)'||E'\n';
  END;

  -- I2: a correct split must be ACCEPTED
  BEGIN
    INSERT INTO booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,provider_amount,
        status,payment_method,idempotency_key)
      VALUES (b1,v_cust,v_prov,1000.00,100.00,900.00,'pending','mpesa','good') RETURNING id INTO p1;
    pass:=pass+1; rep:=rep||'PASS I2 correct split accepted'||E'\n';
  EXCEPTION WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL I2 correct split rejected: '||substr(SQLERRM,1,70)||E'\n';
  END;

  -- I3: non-KES currency must be REJECTED
  BEGIN
    UPDATE booking_payments SET currency='USD' WHERE id=p1;
    fail:=fail+1; rep:=rep||'FAIL I3: USD accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS I3 non-KES currency rejected'||E'\n';
  END;

  -- I4: a negative wallet must be REJECTED
  BEGIN
    UPDATE service_providers SET wallet_balance=-0.01 WHERE id=v_prov;
    fail:=fail+1; rep:=rep||'FAIL I4: negative wallet_balance accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS I4 negative wallet rejected'||E'\n';
  END;

  -- I5: credit_provider_wallet must reject a non-positive amount
  BEGIN
    PERFORM credit_provider_wallet(v_prov, -500.00);
    fail:=fail+1; rep:=rep||'FAIL I5: credit accepted -500'||E'\n';
  EXCEPTION WHEN others THEN
    pass:=pass+1; rep:=rep||'PASS I5 credit(-500) rejected: '||substr(SQLERRM,1,42)||E'\n';
  END;

  -- I6: debit_provider_wallet must reject a negative amount.
  -- Without this, debit CREDITS: balance - (-500) = balance + 500, i.e. minting.
  BEGIN
    PERFORM debit_provider_wallet(v_prov, -500.00);
    fail:=fail+1; rep:=rep||'FAIL I6: debit accepted -500 (MINTING PATH OPEN)'||E'\n';
  EXCEPTION WHEN others THEN
    pass:=pass+1; rep:=rep||'PASS I6 debit(-500) rejected: '||substr(SQLERRM,1,42)||E'\n';
  END;

  -- settle so there is a completed payment to refund against
  r := settle_booking_payment(p1,'RCPT-INV',0,'Success',1000.00);

  -- I7: a refund exceeding what was collected must be REJECTED
  BEGIN
    INSERT INTO booking_disputes (booking_id, reported_by, reported_by_role, dispute_type, description, refund_amount)
      VALUES (b1, v_cust, 'customer', 'pricing', 'test', 1000.01);
    fail:=fail+1; rep:=rep||'FAIL I7: refund > collected ACCEPTED'||E'\n';
  EXCEPTION WHEN others THEN
    IF SQLERRM ILIKE '%exceed%' OR SQLERRM ILIKE '%refund%' THEN
      pass:=pass+1; rep:=rep||'PASS I7 over-refund rejected by the cap: '||substr(SQLERRM,1,52)||E'\n';
    ELSE
      fail:=fail+1; rep:=rep||'FAIL I7 rejected for the WRONG reason: '||substr(SQLERRM,1,60)||E'\n';
    END IF;
  END;

  -- I8: a refund within what was collected must be ACCEPTED
  BEGIN
    INSERT INTO booking_disputes (booking_id, reported_by, reported_by_role, dispute_type, description, refund_amount)
      VALUES (b1, v_cust, 'customer', 'pricing', 'test ok', 1000.00);
    pass:=pass+1; rep:=rep||'PASS I8 refund == collected accepted'||E'\n';
  EXCEPTION WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL I8 valid refund rejected: '||substr(SQLERRM,1,70)||E'\n';
  END;

  -- I9: a negative refund must be REJECTED
  BEGIN
    INSERT INTO booking_disputes (booking_id, reported_by, reported_by_role, dispute_type, description, refund_amount)
      VALUES (b1, v_cust, 'customer', 'pricing', 'neg', -1.00);
    fail:=fail+1; rep:=rep||'FAIL I9: negative refund accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS I9 negative refund rejected'||E'\n';
  END;

  -- I10: min_price type and its index survived the ALTER
  SELECT format_type(atttypid,atttypmod) INTO t FROM pg_attribute
    WHERE attrelid='public.service_providers'::regclass AND attname='min_price';
  IF t='numeric(10,2)' AND EXISTS (SELECT 1 FROM pg_indexes
       WHERE schemaname='public' AND indexname='idx_service_providers_min_price') THEN
    pass:=pass+1; rep:=rep||'PASS I10 min_price is '||t||' and its index survived'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I10 min_price type='||t||' index_present='||
      (SELECT count(*) FROM pg_indexes WHERE indexname='idx_service_providers_min_price')||E'\n';
  END IF;

  -- I11: the C-0 / trust revokes still hold after this migration's ALTER TABLE
  IF NOT has_column_privilege('authenticated','public.service_providers','wallet_balance','UPDATE')
     AND NOT has_column_privilege('authenticated','public.service_providers','is_verified','UPDATE')
     AND has_column_privilege('authenticated','public.service_providers','bio','UPDATE') THEN
    pass:=pass+1; rep:=rep||'PASS I11 wallet+trust revokes intact, profile writes intact'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I11 privilege regression on service_providers'||E'\n';
  END IF;

  -- I12: both wallet RPCs still SECURITY DEFINER with a pinned search_path
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname IN ('credit_provider_wallet','debit_provider_wallet')
         AND p.prosecdef AND array_to_string(p.proconfig,',') LIKE '%search_path%') = 2 THEN
    pass:=pass+1; rep:=rep||'PASS I12 both wallet RPCs SECURITY DEFINER + search_path pinned'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL I12 a wallet RPC lost secdef or search_path (CREATE OR REPLACE wipes proconfig)'||E'\n';
  END IF;

  RAISE EXCEPTION E'INV_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$INV$;
