DO $C$
DECLARE
  v_cust uuid := gen_random_uuid(); v_pu uuid := gen_random_uuid(); v_pu2 uuid := gen_random_uuid();
  v_prov uuid; v_prov2 uuid; v_svc uuid; v_stype uuid; b1 uuid; b2 uuid; b3 uuid;
  rep text := E'\n'; pass int := 0; fail int := 0; st text; v_to timestamptz; v_from timestamptz;
  t0 timestamptz := date_trunc('hour', now() + interval '3 days');
BEGIN
  SELECT id INTO v_svc FROM services LIMIT 1;
  SELECT id INTO v_stype FROM service_types LIMIT 1;
  INSERT INTO auth.users (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid'),(v_pu2,'p2@t.invalid');
  INSERT INTO profiles (id,email) VALUES (v_cust,'c@t.invalid'),(v_pu,'p@t.invalid'),(v_pu2,'p2@t.invalid');
  INSERT INTO service_providers (user_id,business_name,phone,is_active,max_concurrent_bookings,emergency_capacity_reserved)
    VALUES (v_pu,'Cap1','+254700000001',true,1,0) RETURNING id INTO v_prov;
  INSERT INTO service_providers (user_id,business_name,phone,is_active,max_concurrent_bookings)
    VALUES (v_pu2,'Cap5','+254700000002',true,5) RETURNING id INTO v_prov2;

  -- ===== C1: the regression I caused must be GONE =====
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,estimated_duration_minutes,scheduled_start,currency)
    VALUES (v_cust,v_prov2,v_svc,v_stype,'standard','submitted',60,t0,'KES') RETURNING id INTO b1;
  SELECT status::text INTO st FROM bookings WHERE id=b1;
  IF st='submitted' THEN
    pass:=pass+1; rep:=rep||'PASS C1 an ordinary booking with ample capacity is NOT flagged'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL C1 ordinary booking came out as '||st||' (booking is broken)'||E'\n';
  END IF;

  -- ===== C2: the busy interval is actually populated before capacity runs =====
  SELECT estimated_busy_from, estimated_busy_to INTO v_from, v_to FROM bookings WHERE id=b1;
  IF v_from IS NOT NULL AND v_to IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS C2 busy interval populated ('||(v_to-v_from)||') so capacity can see it'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL C2 busy interval still NULL -> capacity still dead'||E'\n';
  END IF;

  -- ===== C3: CAPACITY IS ENFORCED. Provider max=1, fill it, then overbook. =====
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,estimated_duration_minutes,scheduled_start,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',60,t0,'KES') RETURNING id INTO b2;
  UPDATE bookings SET status='confirmed', pricing_snapshot=jsonb_build_object('total',1000),
         agreed_price=1000 WHERE id=b2;
  UPDATE bookings SET status='scheduled' WHERE id=b2;

  -- second booking, same provider, SAME window -> over capacity
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,estimated_duration_minutes,scheduled_start,currency)
    VALUES (v_cust,v_prov,v_svc,v_stype,'standard','submitted',60,t0,'KES') RETURNING id INTO b3;
  SELECT status::text INTO st FROM bookings WHERE id=b3;
  IF st='needs_reassignment' THEN
    pass:=pass+1; rep:=rep||'PASS C3 OVERBOOKING FLAGGED: second booking on a max=1 provider -> needs_reassignment'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL C3 double-booking still unblocked, status='||st||E'\n';
  END IF;

  -- ===== C4 (D-4): flagging an UNPRICED booking must not fail the write =====
  IF (SELECT pricing_snapshot FROM bookings WHERE id=b3) IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS C4 the flag was written on an unpriced booking (CHECK no longer rejects it)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL C4 unexpected snapshot present'||E'\n';
  END IF;

  -- ===== C5 (D-2): a flagged booking is not a dead end =====
  BEGIN
    UPDATE bookings SET status='submitted' WHERE id=b3;
    pass:=pass+1; rep:=rep||'PASS C5 needs_reassignment -> submitted (back to the pool)'||E'\n';
  EXCEPTION WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL C5 flagged booking is stuck: '||substr(SQLERRM,1,60)||E'\n';
  END;

  -- ===== C6 (D-3): an explicit NULL status must be rejected =====
  BEGIN
    INSERT INTO bookings (customer_id,service_id,service_type_id,booking_flow_type,status)
      VALUES (v_cust,v_svc,v_stype,'standard',NULL);
    fail:=fail+1; rep:=rep||'FAIL C6 a NULL status was accepted (still bypasses three gates)'||E'\n';
  EXCEPTION WHEN not_null_violation THEN
    pass:=pass+1; rep:=rep||'PASS C6 explicit NULL status rejected'||E'\n';
  WHEN others THEN
    fail:=fail+1; rep:=rep||'FAIL C6 wrong error: '||substr(SQLERRM,1,50)||E'\n';
  END;

  -- ===== C7: the emergency SLA window survives (dropped duplicate triggers) =====
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,booking_flow_type,
      status,estimated_duration_minutes,scheduled_start,currency)
    VALUES (v_cust,v_prov2,v_svc,v_stype,'emergency','submitted',15,t0 + interval '1 day','KES')
    RETURNING id INTO b1;
  SELECT estimated_busy_from, estimated_busy_to INTO v_from, v_to FROM bookings WHERE id=b1;
  IF (v_to - v_from) = interval '2 hours' THEN
    pass:=pass+1; rep:=rep||'PASS C7 emergency keeps its 2h SLA window, not the 15min job duration'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL C7 emergency window is '||(v_to-v_from)||' (duration overwrote the SLA)'||E'\n';
  END IF;

  -- ===== C8: trigger ordering invariant =====
  IF (SELECT pos FROM (SELECT tgname, row_number() OVER (ORDER BY tgname) pos FROM pg_trigger
        WHERE tgrelid='public.bookings'::regclass AND NOT tgisinternal AND (tgtype&2)=2) t
       WHERE tgname='zz_enforce_provider_capacity')
     > (SELECT pos FROM (SELECT tgname, row_number() OVER (ORDER BY tgname) pos FROM pg_trigger
        WHERE tgrelid='public.bookings'::regclass AND NOT tgisinternal AND (tgtype&2)=2) t
       WHERE tgname='populate_busy_interval_trigger') THEN
    pass:=pass+1; rep:=rep||'PASS C8 capacity fires AFTER the interval it depends on'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL C8 ordering regressed'||E'\n';
  END IF;

  RAISE EXCEPTION E'CAPACITY_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$C$;
