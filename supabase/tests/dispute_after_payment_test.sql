DO $D$
DECLARE
  v_cust uuid := gen_random_uuid(); v_pu uuid := gen_random_uuid();
  v_prov uuid; v_svc uuid; v_stype uuid; b1 uuid; b2 uuid; p1 uuid; r jsonb;
  rep text := E'\n'; pass int := 0; fail int := 0; st text;
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
  UPDATE bookings SET actual_start=now()-interval '2 hours' WHERE id=b1;
  UPDATE bookings SET status='completed' WHERE id=b1;
  UPDATE bookings SET status='customer_confirmed' WHERE id=b1;
  UPDATE bookings SET status='payment_pending' WHERE id=b1;
  INSERT INTO booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,provider_amount,
      status,payment_method,idempotency_key)
    VALUES (b1,v_cust,v_prov,1000.00,100.00,900.00,'pending','mpesa','d1') RETURNING id INTO p1;
  r := settle_booking_payment(p1,'RCPT-D',0,'Success',1000.00);

  SELECT status INTO st FROM bookings WHERE id=b1;
  IF st='resolved' THEN pass:=pass+1; rep:=rep||'PASS payment settled, booking resolved'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL booking status='||st||E'\n'; END IF;

  -- D1: a PAID booking must be disputable
  BEGIN
    UPDATE bookings SET status='disputed' WHERE id=b1;
    SELECT status INTO st FROM bookings WHERE id=b1;
    IF st='disputed' THEN
      pass:=pass+1; rep:=rep||'PASS D1 resolved -> disputed: paid customer has recourse'||E'\n';
    ELSE
      fail:=fail+1; rep:=rep||'FAIL D1 no error but status is '||st||E'\n';
    END IF;
  EXCEPTION WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL D1 rejected: '||substr(SQLERRM,1,70)||E'\n';
  END;

  -- D2: the dispute can be closed again, FROM disputed (not from resolved)
  BEGIN
    UPDATE bookings SET status='resolved' WHERE id=b1;
    SELECT status INTO st FROM bookings WHERE id=b1;
    IF st='resolved' THEN
      pass:=pass+1; rep:=rep||'PASS D2 disputed -> resolved: not a dead end'||E'\n';
    ELSE
      fail:=fail+1; rep:=rep||'FAIL D2 status='||st||E'\n';
    END IF;
  EXCEPTION WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL D2 rejected: '||substr(SQLERRM,1,70)||E'\n';
  END;

  -- D3: EVERY OTHER terminal state must still be immovable
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',500.00,60,
      jsonb_build_object('total',500.00),'KES') RETURNING id INTO b2;
  UPDATE bookings SET status='cancelled_customer' WHERE id=b2;
  BEGIN
    UPDATE bookings SET status='disputed' WHERE id=b2;
    fail:=fail+1; rep:=rep||'FAIL D3 cancelled_customer -> disputed was ACCEPTED (carve-out too wide)'||E'\n';
  EXCEPTION WHEN others THEN
    pass:=pass+1; rep:=rep||'PASS D3 cancelled_customer still terminal'||E'\n';
  END;

  -- D4: resolved must not become anything ELSE
  BEGIN
    UPDATE bookings SET status='in_progress' WHERE id=b1;
    fail:=fail+1; rep:=rep||'FAIL D4 resolved -> in_progress was ACCEPTED'||E'\n';
  EXCEPTION WHEN others THEN
    pass:=pass+1; rep:=rep||'PASS D4 resolved -> in_progress still blocked'||E'\n';
  END;

  -- D5: refund on the dispute is still capped at what was collected
  UPDATE bookings SET status='disputed' WHERE id=b1;
  BEGIN
    INSERT INTO booking_disputes (booking_id,reported_by,reported_by_role,dispute_type,description,refund_amount)
      VALUES (b1,v_cust,'customer','quality','poor work',1000.01);
    fail:=fail+1; rep:=rep||'FAIL D5 over-refund accepted'||E'\n';
  EXCEPTION WHEN others THEN
    IF SQLERRM ILIKE '%exceed%' THEN
      pass:=pass+1; rep:=rep||'PASS D5 over-refund capped at the collected amount'||E'\n';
    ELSE
      fail:=fail+1; rep:=rep||'FAIL D5 wrong reason: '||substr(SQLERRM,1,60)||E'\n';
    END IF;
  END;
  BEGIN
    INSERT INTO booking_disputes (booking_id,reported_by,reported_by_role,dispute_type,description,refund_amount)
      VALUES (b1,v_cust,'customer','quality','poor work',400.00);
    pass:=pass+1; rep:=rep||'PASS D5b a 400 refund within the 1000 collected is accepted'||E'\n';
  EXCEPTION WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL D5b valid refund rejected: '||substr(SQLERRM,1,60)||E'\n';
  END;

  RAISE EXCEPTION E'DISPUTE_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$D$;
