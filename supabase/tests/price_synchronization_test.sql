DO $P$
DECLARE
  v_cust uuid := gen_random_uuid(); v_pu uuid := gen_random_uuid();
  v_prov uuid; v_svc uuid; v_stype uuid; b uuid;
  rep text := E'\n'; pass int := 0; fail int := 0;
BEGIN
  SELECT id INTO v_svc FROM services LIMIT 1;
  SELECT id INTO v_stype FROM service_types LIMIT 1;
  INSERT INTO auth.users (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid');
  INSERT INTO profiles (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid');
  INSERT INTO service_providers (user_id,business_name,phone,is_active)
    VALUES (v_pu,'T','+254700000001',true) RETURNING id INTO v_prov;

  -- P1: agreed_price DIFFERENT from snapshot.total must be REJECTED.
  -- Before this fix the guard read a 'total' nobody wrote, compared against
  -- NULL, and passed for any price at all.
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',1000.00,60,
      jsonb_build_object('total',1000.00,'currency','KES'),'KES') RETURNING id INTO b;
  UPDATE bookings SET status='confirmed' WHERE id=b;
  UPDATE bookings SET status='in_progress' WHERE id=b;
  UPDATE bookings SET actual_start=now()-interval '2 hours' WHERE id=b;
  UPDATE bookings SET status='completed' WHERE id=b;
  BEGIN
    UPDATE bookings SET status='customer_confirmed', agreed_price=9999.00 WHERE id=b;
    fail:=fail+1; rep:=rep||'FAIL P1 agreed_price 9999 vs total 1000 was ACCEPTED'||E'\n';
  EXCEPTION WHEN others THEN
    IF SQLERRM ILIKE '%does not match%' THEN
      pass:=pass+1; rep:=rep||'PASS P1 price divergence rejected: '||substr(SQLERRM,1,56)||E'\n';
    ELSE
      fail:=fail+1; rep:=rep||'FAIL P1 wrong reason: '||substr(SQLERRM,1,70)||E'\n';
    END IF;
  END;

  -- P2: matching price must be ACCEPTED
  BEGIN
    UPDATE bookings SET status='customer_confirmed' WHERE id=b;
    pass:=pass+1; rep:=rep||'PASS P2 matching agreed_price accepted'||E'\n';
  EXCEPTION WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL P2 matching price rejected: '||substr(SQLERRM,1,70)||E'\n';
  END;

  -- P3: a snapshot with NO total must be REJECTED at confirmation (fail closed)
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',700.00,60,
      jsonb_build_object('quoted_price',700.00,'currency','KES'),'KES') RETURNING id INTO b;
  UPDATE bookings SET status='confirmed' WHERE id=b;
  UPDATE bookings SET status='in_progress' WHERE id=b;
  UPDATE bookings SET actual_start=now()-interval '2 hours' WHERE id=b;
  UPDATE bookings SET status='completed' WHERE id=b;
  BEGIN
    UPDATE bookings SET status='customer_confirmed' WHERE id=b;
    fail:=fail+1; rep:=rep||'FAIL P3 a snapshot with no total was ACCEPTED (still failing open)'||E'\n';
  EXCEPTION WHEN others THEN
    IF SQLERRM ILIKE '%total is missing%' THEN
      pass:=pass+1; rep:=rep||'PASS P3 missing total rejected (guard fails closed)'||E'\n';
    ELSE
      fail:=fail+1; rep:=rep||'FAIL P3 wrong reason: '||substr(SQLERRM,1,70)||E'\n';
    END IF;
  END;

  -- P4: a booking cannot reach the quote flow without a snapshot at all.
  -- This is why snapshot_quote_on_send is unreachable: the CHECK demands a
  -- snapshot at quote_pending, one state before the trigger could create one.
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,quoted_price,estimated_duration_minutes,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',1234.50,60,'KES') RETURNING id INTO b;
  BEGIN
    UPDATE bookings SET status='quote_pending' WHERE id=b;
    fail:=fail+1; rep:=rep||'FAIL P4 quote_pending accepted with no pricing_snapshot'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS P4 quote_pending requires a snapshot (so the DB fallback is unreachable)'||E'\n';
  END;

  -- P4b: with an app-supplied snapshot carrying a total, the quote flow works.
  UPDATE bookings SET pricing_snapshot=jsonb_build_object('total',1234.50,'quoted_price',1234.50,'currency','KES') WHERE id=b;
  UPDATE bookings SET status='quote_pending' WHERE id=b;
  UPDATE bookings SET status='quote_sent' WHERE id=b;
  IF (SELECT (pricing_snapshot->>'total')::numeric FROM bookings WHERE id=b) = 1234.50 THEN
    pass:=pass+1; rep:=rep||'PASS P4b app-supplied snapshot with total survives to quote_sent'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P4b total lost'||E'\n';
  END IF;

  -- P5: custom_pricing junk must be rejected at the write path
  BEGIN
    INSERT INTO provider_services (provider_id, service_id, is_active, capacity_scope, custom_pricing)
      VALUES (v_prov, v_svc, true, 'per_service', jsonb_build_object('amount','abc'));
    fail:=fail+1; rep:=rep||'FAIL P5 custom_pricing amount "abc" accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS P5 non-numeric custom_pricing rejected'||E'\n';
  WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL P5 wrong error: '||substr(SQLERRM,1,60)||E'\n';
  END;
  BEGIN
    INSERT INTO provider_services (provider_id, service_id, is_active, capacity_scope, custom_pricing)
      VALUES (v_prov, v_svc, true, 'per_service', jsonb_build_object('amount','100.555'));
    fail:=fail+1; rep:=rep||'FAIL P5b three-decimal price accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS P5b 3-decimal custom_pricing rejected'||E'\n';
  WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL P5b wrong error: '||substr(SQLERRM,1,60)||E'\n';
  END;
  BEGIN
    INSERT INTO provider_services (provider_id, service_id, is_active, capacity_scope, custom_pricing)
      VALUES (v_prov, v_svc, true, 'per_service', jsonb_build_object('amount','500.00'));
    pass:=pass+1; rep:=rep||'PASS P5c a valid price is still accepted'||E'\n';
  EXCEPTION WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL P5c valid price rejected: '||substr(SQLERRM,1,60)||E'\n';
  END;

  RAISE EXCEPTION E'PRICE_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$P$;
