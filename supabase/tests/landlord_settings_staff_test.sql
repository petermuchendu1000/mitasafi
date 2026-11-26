-- =============================================================================
-- Behavioural proof for landlord_settings + property_staff access levels
--   20260356000000_landlord_settings_and_staff.sql
--   20260357000000_staff_access_levels.sql
-- =============================================================================
-- What is asserted here is a boundary around other people's homes and money.
-- A policy that reads correctly and matches nothing, or matches everything,
-- looks identical in the catalogue; only a real SELECT under a real role can
-- tell the difference.
--
-- Two defects were found by these tests rather than by reading the code:
--   * a policy that joins `units` is itself subject to the units policy, so
--     Innago's own "Maintenance Staff — Property: None" saw nothing at all
--     until the unit row became a precondition rather than a module;
--   * table-level INSERT/UPDATE on property_staff let a landlord write an
--     arbitrary user_id, attaching access to an account that never gave them
--     a phone number.
-- =============================================================================

DO $LS$
DECLARE
  pass int := 0;
  fail int := 0;
  rep  text := E'\n';
  v_ll    uuid := gen_random_uuid();
  v_ll2   uuid := gen_random_uuid();
  v_care  uuid := gen_random_uuid();
  v_b1    uuid := gen_random_uuid();
  v_b2    uuid := gen_random_uuid();
  v_b3    uuid := gen_random_uuid();
  v_u1    uuid := gen_random_uuid();
  v_u2    uuid := gen_random_uuid();
  v_ten   uuid := gen_random_uuid();
  v_lease uuid := gen_random_uuid();
  v_lst   uuid := gen_random_uuid();
  v_staff uuid;
  v_n     int;
  v_txt   text;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'ls-ll@test.invalid'),(v_ll2,'ls-ll2@test.invalid'),(v_care,'ls-care@test.invalid');
  INSERT INTO public.profiles (id,email,full_name,phone) VALUES
    (v_ll,'ls-ll@test.invalid','Landlord','+254700000001'),
    (v_ll2,'ls-ll2@test.invalid','Other Landlord','+254700000002'),
    (v_care,'ls-care@test.invalid','Mwangi Caretaker','+254711222333');
  INSERT INTO public.buildings (id,landlord_id,name,address,area,building_type) VALUES
    (v_b1,v_ll,'Block A','1 Rd','Kilimani','apartment'),
    (v_b2,v_ll,'Block B','2 Rd','Karen','apartment'),
    (v_b3,v_ll2,'Block C','3 Rd','Lavington','apartment');
  INSERT INTO public.units (id,landlord_id,building_id,unit_number,unit_type,monthly_rent) VALUES
    (v_u1,v_ll,v_b1,'A1','1br',30000),
    (v_u2,v_ll,v_b2,'B1','1br',40000);
  INSERT INTO public.tenants (id,created_by,full_name,phone)
    VALUES (v_ten,v_ll,'A Tenant','+254733000000');
  INSERT INTO public.leases (id,unit_id,tenant_id,landlord_id,start_date,monthly_rent)
    VALUES (v_lease,v_u1,v_ten,v_ll,current_date,30000);
  INSERT INTO public.payments (lease_id,amount,status,payment_type,payment_date,payment_method)
    VALUES (v_lease,30000,'confirmed','rent',current_date,'mpesa');
  INSERT INTO public.maintenance_requests (unit_id,landlord_id,category,title,description) VALUES
    (v_u1,v_ll,'plumbing','Tap leaking','Kitchen'),
    (v_u1,v_ll,'electrical','No power','Whole unit'),
    (v_u2,v_ll,'plumbing','Blocked drain','Bathroom');
  INSERT INTO public.listings (id,landlord_id,building_id,unit_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_lst,v_ll,v_b1,v_u1,'A1 to let','d','apartment','1 Rd','Kilimani',30000,'active');

  -- ===== S1-S4: landlord_settings ========================================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.landlord_settings (landlord_id) VALUES (v_ll);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.landlord_settings WHERE landlord_id=v_ll;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S1  a landlord can create their settings row'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S1  no settings row'||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_settings;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S2  settings invisible to another landlord'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S2  another landlord sees '||v_n||E'\n'; END IF;

  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.landlord_settings SET landlord_id=v_ll2 WHERE landlord_id=v_ll;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S3  landlord_id was rewritable'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S3  landlord_id write refused (42501)'||E'\n';
  END;

  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.landlord_settings
       SET late_fee_enabled=true, late_fee_type='fixed', late_fee_amount=NULL
     WHERE landlord_id=v_ll;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S4  a fixed fee with no amount was accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S4  an inapplicable late fee is refused'||E'\n';
  END;

  -- ===== S5: a landlord may not assign a building they do not own ========
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.property_staff (first_name,last_name,email,phone,building_ids)
    VALUES ('Th','Ief','thief@test.invalid','+254799999999',ARRAY[v_b3]);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S5  assigned someone else''s building'||E'\n';
  EXCEPTION WHEN invalid_authorization_specification THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S5  cannot assign a building you do not own'||E'\n';
  END;

  -- ===== S6: THE HOLE CLOSED — user_id is not client-writable ============
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.property_staff (first_name,last_name,email,phone,user_id)
    VALUES ('Hi','Jack','hijack@test.invalid','+254788000000', v_ll2);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S6  a landlord attached access to an arbitrary account'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S6  user_id is not client-writable (42501)'||E'\n';
  END;

  -- ===== S7: a caretaker with an existing account is linked by phone =====
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.property_staff
    (first_name, last_name, email, phone, staff_role, building_ids, access_maintenance)
  VALUES ('Mwangi','Caretaker','mwangi@test.invalid','+254711222333','caretaker',ARRAY[v_b1],'all')
  RETURNING id INTO v_staff;
  RESET ROLE;
  SELECT status INTO v_txt FROM public.property_staff WHERE id=v_staff;
  IF v_txt='active' AND (SELECT user_id FROM public.property_staff WHERE id=v_staff)=v_care THEN
    pass:=pass+1; rep:=rep||'PASS S7  an existing account is linked by phone and made active'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S7  status='||v_txt||E'\n'; END IF;

  -- ===== S8: INNAGO'S "MAINTENANCE STAFF" — Property:None, Maintenance:All
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests;
  RESET ROLE;
  IF v_n=2 THEN
    pass:=pass+1; rep:=rep||'PASS S8  maintenance staff see their block''s jobs with Property:None'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S8  sees '||v_n||' job(s), expected 2'||E'\n'; END IF;

  -- ===== S9: and NOT the unassigned block's job ==========================
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests m
    JOIN public.units u ON u.id=m.unit_id WHERE u.building_id=v_b2;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S9  nothing from the unassigned block'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S9  sees Block B maintenance'||E'\n'; END IF;

  -- ===== S10: maintenance category scoping ===============================
  UPDATE public.property_staff SET maintenance_category_mode='specific', maintenance_categories=ARRAY['plumbing'] WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S10 specific categories narrow what they see'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S10 category scope saw '||v_n||', expected 1'||E'\n'; END IF;
  UPDATE public.property_staff SET maintenance_category_mode='all', maintenance_categories='{}' WHERE id=v_staff;

  -- ===== S11: view means view — no write =================================
  UPDATE public.property_staff SET access_maintenance='view' WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.maintenance_requests SET title='rewritten' WHERE unit_id=v_u1;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S11 "view" cannot write (0 rows matched)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S11 "view" updated '||v_n||' row(s)'||E'\n'; END IF;

  -- ===== S12: "all" can ==================================================
  UPDATE public.property_staff SET access_maintenance='all' WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.maintenance_requests SET status='in_progress' WHERE unit_id=v_u1;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n=2 THEN pass:=pass+1; rep:=rep||'PASS S12 "all" can update their block''s jobs'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S12 "all" updated '||v_n||', expected 2'||E'\n'; END IF;

  -- ===== S13: maintenance access alone reaches NO money or people ========
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM public.tenants)
       + (SELECT count(*) FROM public.leases)
       + (SELECT count(*) FROM public.payments)
       + (SELECT count(*) FROM public.rental_applications) INTO v_n;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S13 maintenance access alone reaches no tenant, lease or payment'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S13 reached '||v_n||' private row(s)'||E'\n'; END IF;

  -- ===== S14: granting lease access grants leases, scoped ================
  UPDATE public.property_staff SET access_lease='view' WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.leases;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S14 lease access shows their block''s lease'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S14 sees '||v_n||' lease(s), expected 1'||E'\n'; END IF;

  -- ===== S15: tenant access on a per-block assignment shows NOBODY =======
  -- A tenant cannot be scoped to a block without reading leases, and reading
  -- leases from a tenants policy closes a cycle. So tenant access requires
  -- all_properties, and a block-scoped grant deliberately yields nothing
  -- rather than quietly showing everyone.
  UPDATE public.property_staff
     SET access_tenant='view', all_properties=false, building_ids=ARRAY[v_b1]
   WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.tenants;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS S15 block-scoped tenant access shows nobody (portfolio-wide or nothing)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S15 a block-scoped grant exposed '||v_n||' tenant(s)'||E'\n'; END IF;

  -- ===== S16: with all_properties, the tenant appears ====================
  UPDATE public.property_staff SET all_properties=true WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.tenants;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S16 portfolio-wide tenant access shows the tenant'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S16 sees '||v_n||' tenant(s), expected 1'||E'\n'; END IF;

  -- ===== S16b: and never another landlord's tenant =======================
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.tenants t WHERE t.created_by <> v_ll;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S16b portfolio-wide stops at this landlord''s tenants'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S16b reached another landlord''s tenant'||E'\n'; END IF;
  UPDATE public.property_staff SET all_properties=false, building_ids=ARRAY[v_b1], access_lease='view' WHERE id=v_staff;

  -- ===== S17/S18: invoices follow access_invoice =========================
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.payments;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S17 payments stay hidden without invoice access'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S17 payments visible without invoice access'||E'\n'; END IF;

  UPDATE public.property_staff SET access_invoice='view' WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.payments;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S18 invoice access shows the payment'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S18 sees '||v_n||' payment(s), expected 1'||E'\n'; END IF;

  -- ===== S19/S20: all_properties =========================================
  UPDATE public.property_staff
     SET all_properties=true, building_ids='{}', access_property='view'
   WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.buildings;
  RESET ROLE;
  IF v_n=2 THEN pass:=pass+1; rep:=rep||'PASS S19 all_properties covers both blocks, naming none'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S19 all_properties saw '||v_n||', expected 2'||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.buildings WHERE id=v_b3;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S20 all_properties means this landlord''s, not everyone''s'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S20 reached another landlord''s block'||E'\n'; END IF;
  UPDATE public.property_staff SET all_properties=false, building_ids=ARRAY[v_b1] WHERE id=v_staff;

  -- ===== S21: suspension cuts everything at once =========================
  UPDATE public.property_staff SET status='suspended' WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM public.buildings)
       + (SELECT count(*) FROM public.maintenance_requests)
       + (SELECT count(*) FROM public.leases)
       + (SELECT count(*) FROM public.payments) INTO v_n;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S21 a suspended staff member sees nothing anywhere'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S21 suspended still sees '||v_n||' row(s)'||E'\n'; END IF;
  UPDATE public.property_staff SET status='active' WHERE id=v_staff;

  -- ===== S22: a staff member cannot widen their own access ===============
  UPDATE public.property_staff SET access_invoice='none' WHERE id=v_staff;
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.property_staff SET access_invoice='all', all_properties=true WHERE id=v_staff;
    RESET ROLE;
    IF (SELECT access_invoice FROM public.property_staff WHERE id=v_staff)='all' THEN
      fail:=fail+1; rep:=rep||'FAIL S22 a staff member granted themselves invoice access'||E'\n';
    ELSE
      pass:=pass+1; rep:=rep||'PASS S22 the self-widening update matched no row'||E'\n';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S22 self-widening refused outright'||E'\n';
  END;

  -- ===== S23: the landlord is unaffected throughout ======================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM public.buildings)
       + (SELECT count(*) FROM public.tenants)
       + (SELECT count(*) FROM public.leases) INTO v_n;
  RESET ROLE;
  IF v_n=4 THEN pass:=pass+1; rep:=rep||'PASS S23 the landlord still sees 2 blocks, 1 tenant, 1 lease'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S23 OVERREACH: landlord now sees '||v_n||' of 4'||E'\n'; END IF;

  -- ===== S24: anon reaches nothing =======================================
  BEGIN
    SET LOCAL ROLE anon;
    SELECT count(*) INTO v_n FROM public.property_staff;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S24 anon read the staff table'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S24 anon refused on property_staff (42501)'||E'\n';
  END;

  -- ===== S25-S27: the screening toggle is load-bearing ===================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_lst,'Applicant','+254700111222');
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S25 applications work while screening is on'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; fail:=fail+1; rep:=rep||'FAIL S25 '||SQLERRM||E'\n';
  END;

  UPDATE public.landlord_settings SET application_screening=false WHERE landlord_id=v_ll;
  DELETE FROM public.rental_applications WHERE listing_id=v_lst;
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_lst,'Applicant','+254700111222');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S26 the screening switch did nothing'||E'\n';
  EXCEPTION WHEN raise_exception THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S26 screening off refuses the application'||E'\n';
  END;

  UPDATE public.landlord_settings SET application_screening=true WHERE landlord_id=v_ll;
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_lst,'Applicant','+254700111222');
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S27 switching it back on restores applications'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; fail:=fail+1; rep:=rep||'FAIL S27 '||SQLERRM||E'\n';
  END;


  -- ===== S28: full_name is derived from the two parts ====================
  SELECT full_name INTO v_txt FROM public.property_staff WHERE id=v_staff;
  IF v_txt='Mwangi Caretaker' THEN
    pass:=pass+1; rep:=rep||'PASS S28 full_name is derived from first + last'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S28 full_name is '||coalesce(v_txt,'NULL')||E'\n'; END IF;

  -- ===== S29: and follows a rename =======================================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.property_staff SET first_name='Joseph' WHERE id=v_staff;
  RESET ROLE;
  SELECT full_name INTO v_txt FROM public.property_staff WHERE id=v_staff;
  IF v_txt='Joseph Caretaker' THEN
    pass:=pass+1; rep:=rep||'PASS S29 renaming a part updates the display name'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S29 full_name drifted to '||coalesce(v_txt,'NULL')||E'\n'; END IF;

  -- ===== S30: staff must have an email ===================================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.property_staff (first_name,last_name,phone)
    VALUES ('No','Email','+254766000000');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S30 a staff member was saved with no email'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S30 email is required of staff'||E'\n';
  END;

  -- ===== S31: THE AMBIGUITY THE MODE EXISTS TO END =======================
  -- "specific categories, none ticked" must mean NOTHING, not everything.
  -- With an empty array alone the old policy read it as "all".
  UPDATE public.property_staff
     SET maintenance_category_mode='specific', maintenance_categories='{}'
   WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS S31 "specific, none chosen" shows nothing, not everything'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S31 empty specific list exposed '||v_n||' job(s)'||E'\n'; END IF;
  UPDATE public.property_staff SET maintenance_category_mode='all' WHERE id=v_staff;

  -- ===== S32-S35: late fee rules =========================================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.late_fee_rules (fee_type, percentage, grace_period_days)
  VALUES ('percentage', 10, 5);
  INSERT INTO public.late_fee_rules (fee_type, amount, all_properties, building_ids)
  VALUES ('fixed', 1000, false, ARRAY[v_b2]);
  SELECT count(*) INTO v_n FROM public.late_fee_rules;
  RESET ROLE;
  IF v_n=2 THEN pass:=pass+1; rep:=rep||'PASS S32 a landlord can hold more than one late fee rule'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S32 sees '||v_n||' rule(s), expected 2'||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.late_fee_rules;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S33 another landlord sees none of them'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S33 another landlord sees '||v_n||E'\n'; END IF;

  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.late_fee_rules (fee_type, percentage, all_properties, building_ids)
    VALUES ('percentage', 5, false, ARRAY[v_b3]);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S34 a rule was assigned to someone else''s block'||E'\n';
  EXCEPTION WHEN invalid_authorization_specification THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S34 a rule cannot name a block you do not own'||E'\n';
  END;

  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.late_fee_rules (fee_type, percentage) VALUES ('fixed', NULL);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S35 a fixed rule with no amount was accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS S35 an inapplicable rule is refused'||E'\n';
  END;

  RAISE EXCEPTION E'LANDLORD_SETTINGS_STAFF_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$LS$;
