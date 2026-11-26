-- =============================================================================
-- Behavioural proof for 20260359000000_tenant_rent_visibility.sql
-- =============================================================================
-- A tenant is now shown their landlord's account number. The question these
-- answer is whether the RIGHT tenant sees it: the boundary runs through
-- tenants.user_id, and a policy that reads correctly but matches the wrong
-- rows looks identical in the catalogue.
-- =============================================================================

DO $TR$
DECLARE
  pass int := 0; fail int := 0; rep text := E'\n';
  v_ll   uuid := gen_random_uuid();
  v_ll2  uuid := gen_random_uuid();
  v_u    uuid := gen_random_uuid();   -- the tenant's own account
  v_u2   uuid := gen_random_uuid();   -- an unrelated tenant's account
  v_b1   uuid := gen_random_uuid();
  v_b2   uuid := gen_random_uuid();
  v_b3   uuid := gen_random_uuid();   -- other landlord's block
  v_un1  uuid := gen_random_uuid();
  v_un2  uuid := gen_random_uuid();
  v_t1   uuid := gen_random_uuid();
  v_t2   uuid := gen_random_uuid();
  v_l1   uuid := gen_random_uuid();
  v_n    int;
  v_txt  text;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'tr-ll@test.invalid'),(v_ll2,'tr-ll2@test.invalid'),
    (v_u,'tr-t1@test.invalid'),(v_u2,'tr-t2@test.invalid');
  INSERT INTO public.profiles (id,email,full_name) VALUES
    (v_ll,'tr-ll@test.invalid','Landlord'),(v_ll2,'tr-ll2@test.invalid','Other Landlord'),
    (v_u,'tr-t1@test.invalid','Tenant One'),(v_u2,'tr-t2@test.invalid','Tenant Two');
  INSERT INTO public.buildings (id,landlord_id,name,address,area,building_type) VALUES
    (v_b1,v_ll,'Block A','1 Rd','Kilimani','apartment'),
    (v_b2,v_ll,'Block B','2 Rd','Karen','apartment'),
    (v_b3,v_ll2,'Block C','3 Rd','Lavington','apartment');
  INSERT INTO public.units (id,landlord_id,building_id,unit_number,unit_type,monthly_rent) VALUES
    (v_un1,v_ll,v_b1,'A1','1br',30000),
    (v_un2,v_ll,v_b2,'B1','1br',40000);
  INSERT INTO public.tenants (id,created_by,full_name,phone,user_id) VALUES
    (v_t1,v_ll,'Tenant One','+254711000001',v_u),
    (v_t2,v_ll,'Tenant Two','+254711000002',v_u2);
  INSERT INTO public.leases (id,unit_id,tenant_id,landlord_id,start_date,monthly_rent)
    VALUES (v_l1,v_un1,v_t1,v_ll,current_date,30000);
  INSERT INTO public.payments (lease_id,amount,status,payment_type,payment_date,payment_method)
    VALUES (v_l1,30000,'confirmed','rent',current_date,'mpesa');
  INSERT INTO public.landlord_payout_methods
    (landlord_id,label,method,paybill_number,account_reference_mode,is_default,all_properties)
  VALUES (v_ll,'Main','mpesa_paybill','522533','unit_number',true,true);
  INSERT INTO public.landlord_payout_methods
    (landlord_id,label,method,paybill_number,account_reference_mode,is_default,all_properties)
  VALUES (v_ll2,'Theirs','mpesa_paybill','999999','unit_number',true,true);

  -- ===== T1: the tenant sees the unit they rent ==========================
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.units;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS T1  the tenant sees exactly the unit they rent'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T1  sees '||v_n||' unit(s), expected 1'||E'\n'; END IF;

  -- ===== T2: and it is the right one, not the landlord's other unit ======
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT unit_number INTO v_txt FROM public.units LIMIT 1;
  RESET ROLE;
  IF v_txt='A1' THEN pass:=pass+1; rep:=rep||'PASS T2  it is A1, not the unlet B1'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T2  sees '||coalesce(v_txt,'nothing')||E'\n'; END IF;

  -- ===== T3: the building it is in =======================================
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.buildings;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS T3  one building, the one they live in'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T3  sees '||v_n||' building(s)'||E'\n'; END IF;

  -- ===== T4: their own payments ==========================================
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.payments;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS T4  the tenant can see what they have paid'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T4  sees '||v_n||' payment(s)'||E'\n'; END IF;

  -- ===== T5: BUT CANNOT RECORD ONE =======================================
  -- A tenant marking their own rent received is the worst write in this schema.
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.payments SET status='confirmed' WHERE lease_id=v_l1;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS T5  a tenant cannot write a payment'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T5  a tenant updated '||v_n||' payment(s)'||E'\n'; END IF;

  -- ===== T6: the destination to pay into =================================
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS T6  the tenant sees one destination'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T6  sees '||v_n||' destination(s), expected 1'||E'\n'; END IF;

  -- ===== T7: and it is THEIR landlord's, never another's ==================
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT paybill_number INTO v_txt FROM public.landlord_payout_methods LIMIT 1;
  RESET ROLE;
  IF v_txt='522533' THEN
    pass:=pass+1; rep:=rep||'PASS T7  it is their own landlord''s paybill'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T7  sees paybill '||coalesce(v_txt,'none')||E'\n'; END IF;

  -- ===== T8: a tenant cannot change where the rent goes ==================
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.landlord_payout_methods SET paybill_number='000000' WHERE landlord_id=v_ll;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS T8  a tenant cannot redirect the rent'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T8  a tenant rewrote the paybill'||E'\n'; END IF;

  -- ===== T9: a TENANT WITH NO LEASE sees nothing at all ==================
  -- Tenant Two has a tenant record but no lease. The record alone must grant
  -- nothing, or every past tenant keeps sight of the landlord's accounts.
  PERFORM set_config('request.jwt.claim.sub', v_u2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM public.units)
       + (SELECT count(*) FROM public.buildings)
       + (SELECT count(*) FROM public.payments)
       + (SELECT count(*) FROM public.landlord_payout_methods) INTO v_n;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS T9  a tenant record without a lease grants nothing'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T9  a leaseless tenant reached '||v_n||' row(s)'||E'\n'; END IF;

  -- ===== T10: a block-scoped destination for another block is invisible ==
  INSERT INTO public.landlord_payout_methods
    (landlord_id,label,method,paybill_number,account_reference_mode,all_properties,building_ids)
  VALUES (v_ll,'Karen only','mpesa_paybill','777777','unit_number',false,ARRAY[v_b2]);
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods WHERE paybill_number='777777';
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS T10 a destination for a block they do not live in is hidden'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T10 saw another block''s destination'||E'\n'; END IF;

  -- ===== T11: ...and one scoped to THEIR block is visible =================
  INSERT INTO public.landlord_payout_methods
    (landlord_id,label,method,paybill_number,account_reference_mode,all_properties,building_ids)
  VALUES (v_ll,'Kilimani only','mpesa_paybill','666666','unit_number',false,ARRAY[v_b1]);
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods WHERE paybill_number='666666';
  RESET ROLE;
  IF v_n=1 THEN
    pass:=pass+1; rep:=rep||'PASS T11 a destination for their own block is visible'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T11 their own block''s destination is hidden'||E'\n'; END IF;

  -- ===== T12: anon reaches none of it ====================================
  BEGIN
    SET LOCAL ROLE anon;
    SELECT count(*) INTO v_n FROM public.landlord_payout_methods;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL T12 anon read the destinations'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS T12 anon refused (42501)'||E'\n';
  END;

  -- ===== T13: the landlord is unaffected =================================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM public.units) + (SELECT count(*) FROM public.buildings) INTO v_n;
  RESET ROLE;
  IF v_n=4 THEN pass:=pass+1; rep:=rep||'PASS T13 the landlord still sees 2 units and 2 blocks'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T13 the landlord sees '||v_n||' of 4'||E'\n'; END IF;


  -- ===== T14: leases.building_id is DERIVED, not merely private =========
  -- A column-level revoke is inert while the table grant is held, so this is
  -- protected by being recomputed rather than by being unwritable. Prove it:
  -- write a wrong value and watch it come back right.
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.leases SET building_id = v_b2 WHERE id = v_l1;
  RESET ROLE;
  SELECT building_id INTO v_txt FROM public.leases WHERE id = v_l1;
  IF v_txt = v_b1::text THEN
    pass:=pass+1; rep:=rep||'PASS T14 a client write to building_id is overwritten from the unit'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T14 building_id is now '||coalesce(v_txt,'NULL')||E'\n';
  END IF;

  -- ===== T15: and the tenant's view is unchanged by the attempt =========
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.units;
  RESET ROLE;
  IF v_n=1 THEN
    pass:=pass+1; rep:=rep||'PASS T15 the tenant still sees exactly their unit'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T15 sees '||v_n||' unit(s)'||E'\n'; END IF;

  RAISE EXCEPTION E'TENANT_RENT_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$TR$;
