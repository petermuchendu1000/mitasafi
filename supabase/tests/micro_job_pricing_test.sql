DO $M$
DECLARE
  v_cust uuid := gen_random_uuid(); v_pu uuid := gen_random_uuid();
  v_prov uuid; v_svc uuid; v_stype uuid; b uuid; p uuid; r jsonb;
  rep text := E'\n'; pass int := 0; fail int := 0; v_bal numeric; v_min numeric;
  price numeric; fee numeric; prov numeric;
BEGIN
  SELECT id INTO v_svc FROM services LIMIT 1;
  SELECT id INTO v_stype FROM service_types LIMIT 1;
  INSERT INTO auth.users (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid');
  INSERT INTO profiles (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid');
  INSERT INTO service_providers (user_id,business_name,phone,is_active,wallet_balance,total_earnings)
    VALUES (v_pu,'Boda Rider','+254700000001',true,0,0) RETURNING id INTO v_prov;

  v_min := public.active_min_job_amount();
  IF v_min = 0 THEN pass:=pass+1; rep:=rep||'PASS N0 no minimum job value in force'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL N0 a minimum of '||v_min||' still blocks micro-jobs'||E'\n'; END IF;

  -- N1..N3: micro-priced jobs must be bookable AND pay the provider properly
  FOR price IN SELECT unnest(ARRAY[20, 50, 150]) LOOP
    BEGIN
      INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
          status,agreed_price,estimated_duration_minutes,pricing_snapshot,currency)
        VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',price,30,
          jsonb_build_object('total',price),'KES') RETURNING id INTO b;
      UPDATE bookings SET status='confirmed' WHERE id=b;
      UPDATE bookings SET status='in_progress' WHERE id=b;
      UPDATE bookings SET actual_start=now()-interval '1 hour' WHERE id=b;
      UPDATE bookings SET status='completed' WHERE id=b;
      UPDATE bookings SET status='customer_confirmed' WHERE id=b;
      UPDATE bookings SET status='payment_pending' WHERE id=b;

      fee  := round(price * 0.10, 2);
      prov := price - fee;
      INSERT INTO booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,provider_amount,
          status,payment_method,idempotency_key)
        VALUES (b,v_cust,v_prov,price,fee,prov,'pending','mpesa','micro-'||price) RETURNING id INTO p;
      r := settle_booking_payment(p,'RCPT-'||price,0,'Success',price);

      IF r->>'outcome'='settled' AND prov > 0 THEN
        pass:=pass+1;
        rep:=rep||'PASS N a KES '||price||' job books and settles: platform '||fee||', provider '||prov||E'\n';
      ELSE
        fail:=fail+1; rep:=rep||'FAIL N KES '||price||': '||r::text||E'\n';
      END IF;
    EXCEPTION WHEN others THEN
      fail:=fail+1; rep:=rep||'FAIL N KES '||price||' rejected: '||substr(SQLERRM,1,70)||E'\n';
    END;
  END LOOP;

  -- N4: the provider actually accumulated the money
  SELECT wallet_balance INTO v_bal FROM service_providers WHERE id=v_prov;
  IF v_bal = 18.00 + 45.00 + 135.00 THEN
    pass:=pass+1; rep:=rep||'PASS N4 wallet holds 198.00 from three micro-jobs (18+45+135)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL N4 wallet is '||v_bal||', expected 198.00'||E'\n';
  END IF;

  -- N5: the invariant that decides adoption — no price pays the provider zero
  IF NOT EXISTS (
    SELECT 1 FROM generate_series(1, 100000) c
     WHERE c - public.commission_fee_cents(c, 1000, 0, 500000, 0) <= 0
  ) THEN
    pass:=pass+1; rep:=rep||'PASS N5 no price from 0.01 to 1,000 leaves the provider with zero'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL N5 some price still pays the provider nothing'||E'\n';
  END IF;

  -- N6: and the money identity still holds on micro amounts
  IF (SELECT count(*) FROM booking_payments WHERE amount <> platform_fee + provider_amount) = 0 THEN
    pass:=pass+1; rep:=rep||'PASS N6 money identity holds on all micro-job rows'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL N6 identity violated'||E'\n';
  END IF;

  -- N7: config history preserved, so the old floor is still reproducible
  IF (SELECT min_fee_cents FROM commission_config WHERE version=1) = 5000
     AND (SELECT count(*) FROM commission_config WHERE effective @> now()) = 1 THEN
    pass:=pass+1; rep:=rep||'PASS N7 v1 (KES 50 floor) preserved; exactly one config active'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL N7 config history broken'||E'\n';
  END IF;

  RAISE EXCEPTION E'MICRO_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$M$;
