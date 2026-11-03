DO $SUITE$
DECLARE
  v_cust uuid := gen_random_uuid();
  v_pu   uuid := gen_random_uuid();
  v_prov uuid; v_svc uuid; v_stype uuid;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid;
  p1 uuid; p2 uuid; p3 uuid;
  r jsonb; bal numeric; n int; st text;
  rep text := E'\n';
  pass int := 0; fail int := 0;


BEGIN
  -- ---------- helpers via inline SQL ----------
  SELECT id INTO v_svc FROM services LIMIT 1;
  SELECT id INTO v_stype FROM service_types LIMIT 1;

  INSERT INTO auth.users (id, email) VALUES (v_cust, 'c@test.invalid'), (v_pu, 'p@test.invalid');
  INSERT INTO profiles (id, email) VALUES (v_cust, 'c@test.invalid'), (v_pu, 'p@test.invalid');
  INSERT INTO service_providers (user_id, business_name, phone, is_active, wallet_balance, total_earnings)
    VALUES (v_pu, 'Test Co', '+254700000001', true, 0, 0) RETURNING id INTO v_prov;

  -- booking factory: insert as submitted, walk to payment_pending
  CREATE TEMP TABLE IF NOT EXISTS _mk(id uuid) ON COMMIT DROP;

  -- b1
  INSERT INTO bookings (customer_id, provider_id, service_id, service_type_id, booking_flow_type,
         status, agreed_price, estimated_duration_minutes, pricing_snapshot, currency)
    VALUES (v_cust, v_prov, v_svc, v_stype, 'standard', 'submitted', 1000.00, 60,
            jsonb_build_object('total',1000.00,'currency','KES'), 'KES') RETURNING id INTO b1;
  UPDATE bookings SET status='confirmed'          WHERE id=b1;
  UPDATE bookings SET status='in_progress'        WHERE id=b1;
  UPDATE bookings SET actual_start = now() - interval '2 hours' WHERE id=b1;
  UPDATE bookings SET status='completed'          WHERE id=b1;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b1;
  UPDATE bookings SET status='payment_pending'    WHERE id=b1;

  INSERT INTO booking_payments (booking_id, payer_id, provider_id, amount, platform_fee, provider_amount,
         status, payment_method, idempotency_key)
    VALUES (b1, v_cust, v_prov, 1000.00, 100.00, 900.00, 'pending', 'mpesa', 'k1') RETURNING id INTO p1;

  -- ===================== T1: a clean settlement credits exactly once ==========
  r := settle_booking_payment(p1, 'RCPT001', 0, 'Success', 1000.00);
  SELECT wallet_balance INTO bal FROM service_providers WHERE id=v_prov;
  SELECT count(*) INTO n FROM provider_wallet_ledger WHERE payment_id=p1 AND entry_type='credit_payment';
  SELECT status INTO st FROM bookings WHERE id=b1;
  IF r->>'outcome'='settled' AND (r->>'credited')::bool AND bal=900.00 AND n=1 AND st='resolved' THEN
    pass:=pass+1; rep:=rep||'PASS T1 clean settle: credited 900, ledger rows 1, booking resolved'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T1 clean settle: r='||r::text||' bal='||bal||' ledger='||n||' booking='||st||E'\n';
  END IF;

  -- ===================== T2: THE double-credit test ===========================
  r := settle_booking_payment(p1, 'RCPT001', 0, 'Success', 1000.00);
  SELECT wallet_balance INTO bal FROM service_providers WHERE id=v_prov;
  SELECT count(*) INTO n FROM provider_wallet_ledger WHERE payment_id=p1 AND entry_type='credit_payment';
  IF r->>'outcome'='not_settleable' AND NOT (r->>'credited')::bool AND bal=900.00 AND n=1 THEN
    pass:=pass+1; rep:=rep||'PASS T2 replay refused: balance still 900, ledger still 1'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T2 DOUBLE CREDIT: r='||r::text||' bal='||bal||' ledger='||n||E'\n';
  END IF;

  -- ===================== T3: a failed payment cannot be resurrected ===========
  INSERT INTO bookings (customer_id, provider_id, service_id, service_type_id, booking_flow_type,
         status, agreed_price, estimated_duration_minutes, pricing_snapshot, currency)
    VALUES (v_cust, v_prov, v_svc, v_stype, 'standard', 'submitted', 500.00, 60,
            jsonb_build_object('total',500.00,'currency','KES'), 'KES') RETURNING id INTO b2;
  UPDATE bookings SET status='confirmed' WHERE id=b2;
  UPDATE bookings SET status='in_progress' WHERE id=b2;
  UPDATE bookings SET actual_start = now() - interval '2 hours' WHERE id=b2;
  UPDATE bookings SET actual_start = now() - interval '2 hours' WHERE id=b2;
  UPDATE bookings SET status='completed' WHERE id=b2;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b2;
  UPDATE bookings SET status='payment_pending' WHERE id=b2;
  INSERT INTO booking_payments (booking_id, payer_id, provider_id, amount, platform_fee, provider_amount,
         status, payment_method, idempotency_key)
    VALUES (b2, v_cust, v_prov, 500.00, 50.00, 450.00, 'pending', 'mpesa', 'k2') RETURNING id INTO p2;
  r := fail_booking_payment(p2, 1032, 'Request cancelled by user');
  r := settle_booking_payment(p2, 'RCPT002', 0, 'Success', 500.00);
  SELECT wallet_balance INTO bal FROM service_providers WHERE id=v_prov;
  IF r->>'outcome'='not_settleable' AND bal=900.00 THEN
    pass:=pass+1; rep:=rep||'PASS T3 failed payment NOT resurrected (this was the forged-callback mint)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T3 RESURRECTED: r='||r::text||' bal='||bal||E'\n';
  END IF;

  -- ===================== T4: amount tripwire, our amount is booked ===========
  INSERT INTO bookings (customer_id, provider_id, service_id, service_type_id, booking_flow_type,
         status, agreed_price, estimated_duration_minutes, pricing_snapshot, currency)
    VALUES (v_cust, v_prov, v_svc, v_stype, 'standard', 'submitted', 2000.00, 60,
            jsonb_build_object('total',2000.00,'currency','KES'), 'KES') RETURNING id INTO b3;
  UPDATE bookings SET status='confirmed' WHERE id=b3;
  UPDATE bookings SET status='in_progress' WHERE id=b3;
  UPDATE bookings SET actual_start = now() - interval '2 hours' WHERE id=b3;
  UPDATE bookings SET actual_start = now() - interval '2 hours' WHERE id=b3;
  UPDATE bookings SET status='completed' WHERE id=b3;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b3;
  UPDATE bookings SET status='payment_pending' WHERE id=b3;
  INSERT INTO booking_payments (booking_id, payer_id, provider_id, amount, platform_fee, provider_amount,
         status, payment_method, idempotency_key)
    VALUES (b3, v_cust, v_prov, 2000.00, 200.00, 1800.00, 'pending', 'mpesa', 'k3') RETURNING id INTO p3;
  -- attacker claims they paid 1 shilling
  r := settle_booking_payment(p3, 'RCPT003', 0, 'Success', 1.00);
  SELECT wallet_balance INTO bal FROM service_providers WHERE id=v_prov;
  IF (r->>'amount_mismatch')::bool AND bal = 900.00 + 1800.00 THEN
    pass:=pass+1; rep:=rep||'PASS T4 tripwire: mismatch flagged, booked OUR 1800 not the claimed 1'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T4 tripwire: r='||r::text||' bal='||bal||E'\n';
  END IF;

  -- ===================== T5: one open payment per booking ====================
  INSERT INTO bookings (customer_id, provider_id, service_id, service_type_id, booking_flow_type,
         status, agreed_price, estimated_duration_minutes, pricing_snapshot, currency)
    VALUES (v_cust, v_prov, v_svc, v_stype, 'standard', 'submitted', 300.00, 60,
            jsonb_build_object('total',300.00,'currency','KES'), 'KES') RETURNING id INTO b4;
  UPDATE bookings SET status='confirmed' WHERE id=b4;
  UPDATE bookings SET status='in_progress' WHERE id=b4;
  UPDATE bookings SET actual_start = now() - interval '2 hours' WHERE id=b4;
  UPDATE bookings SET actual_start = now() - interval '2 hours' WHERE id=b4;
  UPDATE bookings SET status='completed' WHERE id=b4;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b4;
  UPDATE bookings SET status='payment_pending' WHERE id=b4;
  INSERT INTO booking_payments (booking_id, payer_id, provider_id, amount, platform_fee, provider_amount,
         status, payment_method, idempotency_key)
    VALUES (b4, v_cust, v_prov, 300.00, 50.00, 250.00, 'pending', 'mpesa', 'k4');
  BEGIN
    INSERT INTO booking_payments (booking_id, payer_id, provider_id, amount, platform_fee, provider_amount,
           status, payment_method, idempotency_key)
      VALUES (b4, v_cust, v_prov, 300.00, 50.00, 250.00, 'pending', 'mpesa', 'k4b');
    fail:=fail+1; rep:=rep||'FAIL T5: a SECOND open payment was accepted for one booking'||E'\n';
  EXCEPTION WHEN unique_violation THEN
    pass:=pass+1; rep:=rep||'PASS T5 second open payment rejected with 23505 (double charge blocked)'||E'\n';
  END;

  -- ===================== T6: receipt replay ==================================
  BEGIN
    UPDATE booking_payments SET mpesa_receipt_number='RCPT001' WHERE idempotency_key='k4';
    fail:=fail+1; rep:=rep||'FAIL T6: a receipt was reused across two payments'||E'\n';
  EXCEPTION WHEN unique_violation THEN
    pass:=pass+1; rep:=rep||'PASS T6 receipt reuse rejected with 23505 (replay blocked)'||E'\n';
  END;

  -- ===================== T7: ledger is append-only ===========================
  BEGIN
    UPDATE provider_wallet_ledger SET amount = 999999 WHERE payment_id=p1;
    fail:=fail+1; rep:=rep||'FAIL T7: ledger row was mutated'||E'\n';
  EXCEPTION WHEN others THEN
    pass:=pass+1; rep:=rep||'PASS T7 ledger UPDATE refused: '||substr(SQLERRM,1,48)||E'\n';
  END;
  BEGIN
    DELETE FROM provider_wallet_ledger WHERE payment_id=p1;
    fail:=fail+1; rep:=rep||'FAIL T7b: ledger row was deleted'||E'\n';
  EXCEPTION WHEN others THEN
    pass:=pass+1; rep:=rep||'PASS T7b ledger DELETE refused'||E'\n';
  END;

  -- ===================== T8: payout is atomic ================================
  SELECT wallet_balance INTO bal FROM service_providers WHERE id=v_prov;  -- 2700
  r := request_provider_payout(v_prov, 1000.00, 'mpesa', '+254700000001', 'PO-TEST-1');
  SELECT wallet_balance INTO bal FROM service_providers WHERE id=v_prov;
  SELECT count(*) INTO n FROM provider_payouts WHERE provider_id=v_prov;
  IF r->>'outcome'='requested' AND bal=1700.00 AND n=1
     AND (SELECT count(*) FROM provider_wallet_ledger WHERE entry_type='debit_payout')=1 THEN
    pass:=pass+1; rep:=rep||'PASS T8 payout atomic: balance 2700->1700, payout row + ledger debit both present'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T8 payout: r='||r::text||' bal='||bal||' payouts='||n||E'\n';
  END IF;
  -- total_earnings must NOT have moved (payout is not un-earning)
  IF (SELECT total_earnings FROM service_providers WHERE id=v_prov) = 2700.00 THEN
    pass:=pass+1; rep:=rep||'PASS T8b total_earnings unchanged by payout (no drift)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T8b total_earnings drifted to '||(SELECT total_earnings FROM service_providers WHERE id=v_prov)||E'\n';
  END IF;

  -- ===================== T9: second payout blocked, overdraw blocked =========
  r := request_provider_payout(v_prov, 100.00, 'mpesa', '+254700000001', 'PO-TEST-2');
  IF r->>'outcome'='payout_already_open' THEN
    pass:=pass+1; rep:=rep||'PASS T9 concurrent second payout refused'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T9: '||r::text||E'\n';
  END IF;
  UPDATE provider_payouts SET status='completed' WHERE provider_id=v_prov;
  r := request_provider_payout(v_prov, 99999.00, 'mpesa', '+254700000001', 'PO-TEST-3');
  SELECT wallet_balance INTO bal FROM service_providers WHERE id=v_prov;
  IF r->>'outcome'='insufficient_balance' AND bal=1700.00 THEN
    pass:=pass+1; rep:=rep||'PASS T9b overdraw refused, balance untouched'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T9b: r='||r::text||' bal='||bal||E'\n';
  END IF;

  -- ===================== T10: stale expiry unblocks a booking ================
  UPDATE booking_payments SET created_at = now() - interval '1 hour' WHERE idempotency_key='k4';
  SELECT expire_stale_booking_payments(interval '15 minutes', b4) INTO n;
  IF n=1 AND (SELECT status FROM booking_payments WHERE idempotency_key='k4')::text='failed' THEN
    INSERT INTO booking_payments (booking_id, payer_id, provider_id, amount, platform_fee, provider_amount,
           status, payment_method, idempotency_key)
      VALUES (b4, v_cust, v_prov, 300.00, 50.00, 250.00, 'pending', 'mpesa', 'k4c');
    pass:=pass+1; rep:=rep||'PASS T10 stale pending expired, booking payable again (no permanent lockout)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T10 expiry: expired='||n||E'\n';
  END IF;

  -- ===================== invariant sweep ====================================
  IF (SELECT count(*) FROM booking_payments WHERE amount <> platform_fee + provider_amount)=0 THEN
    pass:=pass+1; rep:=rep||'PASS money identity holds across all test rows'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL money identity violated'||E'\n';
  END IF;
  IF (SELECT coalesce(sum(amount),0) FROM provider_wallet_ledger WHERE provider_id=v_prov)
     = (SELECT wallet_balance FROM service_providers WHERE id=v_prov) THEN
    pass:=pass+1; rep:=rep||'PASS ledger sum == wallet balance (books reconcile)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL ledger sum '||(SELECT coalesce(sum(amount),0) FROM provider_wallet_ledger WHERE provider_id=v_prov)
      ||' <> balance '||(SELECT wallet_balance FROM service_providers WHERE id=v_prov)||E'\n';
  END IF;

  RAISE EXCEPTION E'SUITE_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$SUITE$;
