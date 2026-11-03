DO $R$
DECLARE
  v_cust uuid := gen_random_uuid(); v_pu uuid := gen_random_uuid(); v_op uuid := gen_random_uuid();
  v_prov uuid; v_svc uuid; v_stype uuid; b uuid; p uuid; r jsonb;
  rep text := E'\n'; pass int := 0; fail int := 0; v_bal numeric; n int;

BEGIN
  SELECT id INTO v_svc FROM services LIMIT 1;
  SELECT id INTO v_stype FROM service_types LIMIT 1;
  INSERT INTO auth.users (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid'),(v_op,'op@t.invalid');
  INSERT INTO profiles (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid'),(v_op,'op@t.invalid');
  INSERT INTO service_providers (user_id,business_name,phone,is_active,wallet_balance,total_earnings)
    VALUES (v_pu,'T','+254700000001',true,0,0) RETURNING id INTO v_prov;

  -- helper: a booking walked to payment_pending with an open payment
  CREATE TEMP TABLE IF NOT EXISTS _mk(bid uuid, pid uuid) ON COMMIT DROP;

  -- ============ T1: THE REPORTED SYMPTOM — recovery now works ============
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',10000.00,60,
      jsonb_build_object('total',10000.00),'KES') RETURNING id INTO b;
  UPDATE bookings SET status='confirmed' WHERE id=b;
  UPDATE bookings SET status='in_progress' WHERE id=b;
  UPDATE bookings SET actual_start=now()-interval '2 hours' WHERE id=b;
  UPDATE bookings SET status='completed' WHERE id=b;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b;
  UPDATE bookings SET status='payment_pending' WHERE id=b;
  INSERT INTO booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,provider_amount,
      status,payment_method,idempotency_key,mpesa_checkout_request_id)
    VALUES (b,v_cust,v_prov,10000.00,1000.00,9000.00,'pending','mpesa','t1','ws_CO_1') RETURNING id INTO p;

  r := fail_booking_payment(p, 1032, 'forged cancellation');          -- attacker
  r := settle_booking_payment(p,'RCPT1',0,'genuine success',10000.00); -- real callback
  IF r->>'outcome' = 'not_settleable' THEN
    pass:=pass+1; rep:=rep||'PASS T1a automated route still refuses a failed payment (attack stays closed)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T1a automated route settled a failed payment: '||r::text||E'\n'; END IF;

  r := settle_booking_payment(p,'RCPT1',0,'operator recovery',10000.00,'manual_reconciliation',v_op);
  SELECT wallet_balance INTO v_bal FROM service_providers WHERE id=v_prov;
  IF r->>'outcome'='settled' AND v_bal=9000.00 THEN
    pass:=pass+1; rep:=rep||'PASS T1b operator recovered it: provider credited 9000 (was unrecoverable)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T1b recovery: '||r::text||' bal='||v_bal||E'\n'; END IF;

  IF (SELECT note FROM provider_wallet_ledger WHERE payment_id=p) LIKE '%operator '||v_op||'%' THEN
    pass:=pass+1; rep:=rep||'PASS T1c the ledger names the operator who authorised it'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T1c ledger note lacks the operator'||E'\n'; END IF;

  -- ============ T2: exactly-once still holds on the recovery route ============
  r := settle_booking_payment(p,'RCPT1',0,'double recovery',10000.00,'manual_reconciliation',v_op);
  SELECT wallet_balance INTO v_bal FROM service_providers WHERE id=v_prov;
  IF r->>'outcome'='not_settleable' AND v_bal=9000.00 THEN
    pass:=pass+1; rep:=rep||'PASS T2 a second recovery is refused; balance still 9000'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T2 DOUBLE CREDIT via recovery: '||r::text||' bal='||v_bal||E'\n'; END IF;

  -- ============ T3: the operator gate ============
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',500.00,60,
      jsonb_build_object('total',500.00),'KES') RETURNING id INTO b;
  UPDATE bookings SET status='confirmed' WHERE id=b;
  UPDATE bookings SET status='in_progress' WHERE id=b;
  UPDATE bookings SET actual_start=now()-interval '2 hours' WHERE id=b;
  UPDATE bookings SET status='completed' WHERE id=b;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b;
  UPDATE bookings SET status='payment_pending' WHERE id=b;
  INSERT INTO booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,provider_amount,
      status,payment_method,idempotency_key,mpesa_checkout_request_id)
    VALUES (b,v_cust,v_prov,500.00,50.00,450.00,'pending','mpesa','t3','ws_CO_3') RETURNING id INTO p;
  r := fail_booking_payment(p, 1032, 'failed');

  BEGIN
    r := settle_booking_payment(p,'X',0,'no operator',500.00,'manual_reconciliation',NULL);
    fail:=fail+1; rep:=rep||'FAIL T3a recovery allowed with NO operator id'||E'\n';
  EXCEPTION WHEN others THEN
    IF SQLERRM ILIKE '%operator%' THEN
      pass:=pass+1; rep:=rep||'PASS T3a recovery without an operator id refused'||E'\n';
    ELSE fail:=fail+1; rep:=rep||'FAIL T3a wrong reason: '||substr(SQLERRM,1,50)||E'\n'; END IF;
  END;

  BEGIN
    r := settle_booking_payment(p,'X',0,'ghost operator',500.00,'manual_reconciliation',gen_random_uuid());
    fail:=fail+1; rep:=rep||'FAIL T3b recovery allowed with a nonexistent operator'||E'\n';
  EXCEPTION WHEN others THEN
    IF SQLERRM ILIKE '%does not exist%' THEN
      pass:=pass+1; rep:=rep||'PASS T3b nonexistent operator refused'||E'\n';
    ELSE fail:=fail+1; rep:=rep||'FAIL T3b wrong reason: '||substr(SQLERRM,1,50)||E'\n'; END IF;
  END;

  SELECT wallet_balance INTO v_bal FROM service_providers WHERE id=v_prov;
  IF v_bal=9000.00 THEN
    pass:=pass+1; rep:=rep||'PASS T3c no credit leaked from the refused attempts'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T3c balance moved to '||v_bal||E'\n'; END IF;

  -- ============ T4: idempotency above BOTH routes ============
  r := settle_booking_payment(p,'RCPT3',0,'legit',500.00,'manual_reconciliation',v_op);  -- settles it
  r := settle_booking_payment(p,'RCPT3',0,'again',500.00,'manual_reconciliation',v_op);
  IF r->>'outcome'='not_settleable' THEN
    pass:=pass+1; rep:=rep||'PASS T4a a completed payment is not re-settled by the operator route'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T4a '||r::text||E'\n'; END IF;
  r := settle_booking_payment(p,'RCPT3',0,'again',500.00);
  IF r->>'outcome'='not_settleable' THEN
    pass:=pass+1; rep:=rep||'PASS T4b nor by the automated route'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T4b '||r::text||E'\n'; END IF;

  -- ============ T5: money-safety invariant ============
  SELECT wallet_balance INTO v_bal FROM service_providers WHERE id=v_prov;
  IF (SELECT coalesce(sum(amount),0) FROM provider_wallet_ledger WHERE provider_id=v_prov) = v_bal THEN
    pass:=pass+1; rep:=rep||'PASS T5 ledger sum == wallet balance ('||v_bal||') after recovery'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T5 books do not reconcile'||E'\n'; END IF;

  -- ============ T6: orphan flagging (defect C) ============
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',700.00,60,
      jsonb_build_object('total',700.00),'KES') RETURNING id INTO b;
  UPDATE bookings SET status='confirmed' WHERE id=b;
  UPDATE bookings SET status='in_progress' WHERE id=b;
  UPDATE bookings SET actual_start=now()-interval '2 hours' WHERE id=b;
  UPDATE bookings SET status='completed' WHERE id=b;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b;
  UPDATE bookings SET status='payment_pending' WHERE id=b;
  -- NULL checkout id = the STK push response never reached our write
  INSERT INTO booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,provider_amount,
      status,payment_method,idempotency_key,created_at)
    VALUES (b,v_cust,v_prov,700.00,70.00,630.00,'pending','mpesa','t6', now()-interval '1 hour')
    RETURNING id INTO p;
  SELECT expire_stale_booking_payments(interval '15 minutes', b) INTO n;
  IF (SELECT needs_reconciliation FROM booking_payments WHERE id=p) THEN
    pass:=pass+1; rep:=rep||'PASS T6 an orphan (no checkout id) is flagged for an operator, not retired silently'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T6 orphan not flagged'||E'\n'; END IF;

  -- and a NORMAL expiry must NOT be flagged (the check discriminates)
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',800.00,60,
      jsonb_build_object('total',800.00),'KES') RETURNING id INTO b;
  UPDATE bookings SET status='confirmed' WHERE id=b;
  UPDATE bookings SET status='in_progress' WHERE id=b;
  UPDATE bookings SET actual_start=now()-interval '2 hours' WHERE id=b;
  UPDATE bookings SET status='completed' WHERE id=b;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b;
  UPDATE bookings SET status='payment_pending' WHERE id=b;
  INSERT INTO booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,provider_amount,
      status,payment_method,idempotency_key,mpesa_checkout_request_id,created_at)
    VALUES (b,v_cust,v_prov,800.00,80.00,720.00,'pending','mpesa','t6b','ws_CO_6', now()-interval '1 hour')
    RETURNING id INTO p;
  SELECT expire_stale_booking_payments(interval '15 minutes', b) INTO n;
  IF NOT (SELECT needs_reconciliation FROM booking_payments WHERE id=p) THEN
    pass:=pass+1; rep:=rep||'PASS T6b a normal expiry is NOT flagged (the flag discriminates)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T6b normal expiry wrongly flagged'||E'\n'; END IF;

  RAISE EXCEPTION E'RECOVERY_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$R$;
