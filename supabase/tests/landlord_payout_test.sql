-- =============================================================================
-- Behavioural proof for 20260358000000_landlord_payout_methods.sql
-- =============================================================================
-- These rows decide where a tenant's rent is sent. Two kinds of failure
-- matter and neither is visible in the catalogue:
--
--   showing the WRONG destination — a stale till number left on a row that
--   was switched to a bank, or two rows both marked default;
--   showing it to the WRONG PERSON — an account number is the most sensitive
--   thing a landlord stores here.
--
-- Everything below runs as a real role.
-- =============================================================================

DO $PM$
DECLARE
  pass int := 0;
  fail int := 0;
  rep  text := E'\n';
  v_ll    uuid := gen_random_uuid();
  v_ll2   uuid := gen_random_uuid();
  v_staff uuid := gen_random_uuid();
  v_b1    uuid := gen_random_uuid();
  v_b2    uuid := gen_random_uuid();
  v_m1    uuid;
  v_m2    uuid;
  v_n     int;
  v_txt   text;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'pm-ll@test.invalid'),(v_ll2,'pm-ll2@test.invalid'),(v_staff,'pm-st@test.invalid');
  INSERT INTO public.profiles (id,email,full_name,phone) VALUES
    (v_ll,'pm-ll@test.invalid','Landlord',NULL),
    (v_ll2,'pm-ll2@test.invalid','Other Landlord',NULL),
    (v_staff,'pm-st@test.invalid','Caretaker','+254715550000');
  INSERT INTO public.buildings (id,landlord_id,name,address,area,building_type) VALUES
    (v_b1,v_ll,'Block A','1 Rd','Kilimani','apartment'),
    (v_b2,v_ll2,'Block C','3 Rd','Lavington','apartment');

  -- ===== P1: a paybill destination is accepted ============================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.landlord_payout_methods
    (label, method, paybill_number, account_reference_mode)
  VALUES ('Main paybill','mpesa_paybill','522533','unit_number')
  RETURNING id INTO v_m1;
  RESET ROLE;
  IF v_m1 IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS P1  a paybill destination is accepted'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P1  no row'||E'\n'; END IF;

  -- ===== P2: the first destination becomes the default ====================
  SELECT is_default::text INTO v_txt FROM public.landlord_payout_methods WHERE id=v_m1;
  IF v_txt='true' THEN
    pass:=pass+1; rep:=rep||'PASS P2  the first destination is the default'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P2  a landlord with one destination has no default'||E'\n'; END IF;

  -- ===== P3: a paybill with no number is refused ==========================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.landlord_payout_methods (label, method) VALUES ('Broken','mpesa_paybill');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL P3  a paybill with no number was accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS P3  a destination missing its number is refused'||E'\n';
  END;

  -- ===== P4: a bank destination needs name, account name and number =======
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.landlord_payout_methods (label, method, bank_name)
    VALUES ('Half a bank','bank','Equity');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL P4  an incomplete bank destination was accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS P4  an incomplete bank destination is refused'||E'\n';
  END;

  -- ===== P5: a second default demotes the first ===========================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.landlord_payout_methods
    (label, method, bank_name, bank_account_name, bank_account_number, is_default)
  VALUES ('Equity','bank','Equity Bank','Asha Mwangi','0123456789', true)
  RETURNING id INTO v_m2;
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods
   WHERE landlord_id=v_ll AND is_default;
  IF v_n=1 AND (SELECT is_default FROM public.landlord_payout_methods WHERE id=v_m2) THEN
    pass:=pass+1; rep:=rep||'PASS P5  a new default demotes the old one, leaving exactly one'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P5  '||v_n||' defaults'||E'\n'; END IF;

  -- ===== P6: THE STALE-FIELD TRAP — switching method clears the old number
  -- A till number left behind on a row switched to bank is a wrong answer
  -- waiting to be shown to a tenant.
  -- Deliberately does NOT null the bank fields: the first version of this
  -- test cleared them itself and so proved nothing about the trigger, which
  -- a mutant removing the clearing survived. The landlord switches method and
  -- leaves the old values exactly where they were.
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.landlord_payout_methods
     SET method='mpesa_till', till_number='888999'
   WHERE id=v_m2;
  RESET ROLE;
  SELECT coalesce(bank_account_number,'(cleared)') INTO v_txt
    FROM public.landlord_payout_methods WHERE id=v_m2;
  IF v_txt='(cleared)' THEN
    pass:=pass+1; rep:=rep||'PASS P6  switching method clears the other method''s fields'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P6  a stale bank account number survived: '||v_txt||E'\n'; END IF;

  -- ===== P7: an M-Pesa number is normalised to +254 =======================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.landlord_payout_methods (label, method, mpesa_phone)
  VALUES ('My number','mpesa_send_money','0722123456');
  RESET ROLE;
  SELECT mpesa_phone INTO v_txt FROM public.landlord_payout_methods
   WHERE label='My number';
  IF v_txt='+254722123456' THEN
    pass:=pass+1; rep:=rep||'PASS P7  a local 07… number is stored as +254…'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P7  stored as '||coalesce(v_txt,'NULL')||E'\n'; END IF;

  -- ===== P8: you cannot route a block you do not own ======================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.landlord_payout_methods
      (label, method, paybill_number, all_properties, building_ids)
    VALUES ('Theft','mpesa_paybill','111222', false, ARRAY[v_b2]);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL P8  routed someone else''s block'||E'\n';
  EXCEPTION WHEN invalid_authorization_specification THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS P8  cannot route a block you do not own'||E'\n';
  END;

  -- ===== P9: another landlord sees nothing ================================
  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS P9  another landlord sees no destinations'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P9  another landlord sees '||v_n||E'\n'; END IF;

  -- ===== P10: anon reaches nothing ========================================
  BEGIN
    SET LOCAL ROLE anon;
    SELECT count(*) INTO v_n FROM public.landlord_payout_methods;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL P10 anon read the destinations'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS P10 anon refused (42501)'||E'\n';
  END;

  -- ===== P11: staff with access_bank='none' see NOTHING ===================
  INSERT INTO public.property_staff
    (landlord_id, first_name, last_name, email, phone, building_ids, access_maintenance)
  VALUES (v_ll,'Care','Taker','care@test.invalid','+254715550000',ARRAY[v_b1],'all');
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS P11 staff without access_bank see no destinations'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P11 a caretaker read '||v_n||' account(s)'||E'\n'; END IF;

  -- ===== P12: granting access_bank shows them ============================
  UPDATE public.property_staff SET access_bank='view' WHERE landlord_id=v_ll;
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods;
  RESET ROLE;
  IF v_n=3 THEN
    pass:=pass+1; rep:=rep||'PASS P12 access_bank is load-bearing, not decorative'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P12 with access_bank they see '||v_n||', expected 3'||E'\n'; END IF;

  -- ===== P13: even then they cannot CHANGE where rent goes ================
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.landlord_payout_methods SET paybill_number='999999' WHERE id=v_m1;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS P13 staff cannot redirect the rent (0 rows matched)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P13 a caretaker rewrote the paybill'||E'\n'; END IF;

  -- ===== P14: a suspended staff member loses it immediately ==============
  UPDATE public.property_staff SET status='suspended' WHERE landlord_id=v_ll;
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS P14 suspension removes sight of the destinations'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P14 a suspended caretaker still sees '||v_n||E'\n'; END IF;

  -- ===== P15: the landlord still has all three ============================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods;
  RESET ROLE;
  IF v_n=3 THEN
    pass:=pass+1; rep:=rep||'PASS P15 the landlord sees all three of their own'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL P15 the landlord sees '||v_n||' of 3'||E'\n'; END IF;

  RAISE EXCEPTION E'LANDLORD_PAYOUT_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$PM$;
