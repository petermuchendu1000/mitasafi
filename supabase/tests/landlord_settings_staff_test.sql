-- =============================================================================
-- Behavioural proof for 20260356000000_landlord_settings_and_staff.sql
-- =============================================================================
-- The migration's guards prove the tables and policies EXIST. For settings
-- that would be enough. For caretakers it is nowhere near enough, because what
-- is being asserted is a boundary around other people's homes:
--
--   a caretaker at one block must not see the landlord's other blocks;
--   a suspended caretaker must see nothing at all;
--   no caretaker, however configured, may reach tenants, leases or payments;
--   and a caretaker must not be able to widen their own permissions.
--
-- Every one of those is a question only a real SELECT under a real role can
-- answer. A policy that reads correctly and matches nothing, or matches
-- everything, looks identical in the catalogue.
-- =============================================================================

DO $LS$
DECLARE
  pass int := 0;
  fail int := 0;
  rep  text := E'\n';
  v_ll    uuid := gen_random_uuid();   -- the landlord
  v_ll2   uuid := gen_random_uuid();   -- an unrelated landlord
  v_care  uuid := gen_random_uuid();   -- the caretaker's own account
  v_b1    uuid := gen_random_uuid();   -- block the caretaker looks after
  v_b2    uuid := gen_random_uuid();   -- block they do NOT
  v_b3    uuid := gen_random_uuid();   -- the OTHER landlord's block
  v_u1    uuid := gen_random_uuid();
  v_u2    uuid := gen_random_uuid();
  v_ten   uuid := gen_random_uuid();
  v_staff uuid;
  v_lst   uuid := gen_random_uuid();
  v_n     int;
  v_txt   text;
BEGIN
  -- ---------- fixtures ----------
  INSERT INTO auth.users (id, email) VALUES
    (v_ll,'ls-ll@test.invalid'), (v_ll2,'ls-ll2@test.invalid'), (v_care,'ls-care@test.invalid');
  INSERT INTO public.profiles (id, email, full_name, phone) VALUES
    (v_ll,  'ls-ll@test.invalid',  'Landlord',       '+254700000001'),
    (v_ll2, 'ls-ll2@test.invalid', 'Other Landlord', '+254700000002'),
    (v_care,'ls-care@test.invalid','Mwangi Caretaker','+254711222333');
  INSERT INTO public.buildings (id, landlord_id, name, address, area, building_type) VALUES
    (v_b1, v_ll,  'Block A', '1 Rd', 'Kilimani',  'apartment'),
    (v_b2, v_ll,  'Block B', '2 Rd', 'Karen',     'apartment'),
    (v_b3, v_ll2, 'Block C', '3 Rd', 'Lavington', 'apartment');
  INSERT INTO public.units (id, landlord_id, building_id, unit_number, unit_type, monthly_rent) VALUES
    (v_u1, v_ll, v_b1, 'A1', '1br', 30000),
    (v_u2, v_ll, v_b2, 'B1', '1br', 40000);
  INSERT INTO public.tenants (id, created_by, full_name, phone)
    VALUES (v_ten, v_ll, 'A Tenant', '+254733000000');
  INSERT INTO public.leases (unit_id, tenant_id, landlord_id, start_date, monthly_rent)
    VALUES (v_u1, v_ten, v_ll, current_date, 30000);
  INSERT INTO public.maintenance_requests (unit_id, landlord_id, category, title, description)
    VALUES (v_u1, v_ll, 'plumbing', 'Tap leaking', 'In the kitchen'),
           (v_u2, v_ll, 'electrical','No power',   'Whole unit');

  -- ===== S1: a landlord creates their own settings row =====================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.landlord_settings (landlord_id) VALUES (v_ll);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM public.landlord_settings WHERE landlord_id=v_ll;
  IF v_n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS S1  a landlord can create their settings row'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S1  no settings row'||E'\n';
  END IF;

  -- ===== S2: another landlord cannot read it ==============================
  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_settings;
  RESET ROLE;
  IF v_n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS S2  settings are invisible to another landlord'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S2  another landlord sees '||v_n||' settings row(s)'||E'\n';
  END IF;

  -- ===== S3: settings cannot be moved to someone else =====================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.landlord_settings SET landlord_id = v_ll2 WHERE landlord_id = v_ll;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S3  landlord_id was rewritable'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S3  landlord_id write refused (42501)'||E'\n';
  END;

  -- ===== S4: a late fee that cannot be applied is refused =================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.landlord_settings
       SET late_fee_enabled=true, late_fee_type='fixed', late_fee_amount=NULL
     WHERE landlord_id=v_ll;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S4  a fixed fee with no amount was accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S4  an inapplicable late fee is refused'||E'\n';
  END;

  -- ===== S5: assigning a building you do not own is refused ===============
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.property_staff (landlord_id, full_name, phone, building_ids)
    VALUES (v_ll, 'Thief', '+254799999999', ARRAY[v_b3]);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S5  a landlord assigned someone else''s building'||E'\n';
  EXCEPTION WHEN invalid_authorization_specification THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S5  cannot assign a building you do not own'||E'\n';
  END;

  -- ===== S6: a caretaker with an existing account is linked and active ====
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.property_staff
    (landlord_id, full_name, phone, staff_role, building_ids, can_manage_maintenance)
  VALUES (v_ll, 'Mwangi Caretaker', '+254711222333', 'caretaker', ARRAY[v_b1], true)
  RETURNING id INTO v_staff;
  RESET ROLE;
  SELECT user_id::text, status INTO v_txt, v_txt FROM public.property_staff WHERE id=v_staff;
  SELECT status INTO v_txt FROM public.property_staff WHERE id=v_staff;
  IF v_txt = 'active'
     AND (SELECT user_id FROM public.property_staff WHERE id=v_staff) = v_care THEN
    pass:=pass+1; rep:=rep||'PASS S6  an existing account is linked and made active'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S6  status='||v_txt||' link not made'||E'\n';
  END IF;

  -- ===== S7: THE BOUNDARY — the caretaker sees only their block ===========
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.buildings;
  RESET ROLE;
  IF v_n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS S7  caretaker sees exactly their assigned block'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S7  caretaker sees '||v_n||' building(s), expected 1'||E'\n';
  END IF;

  -- ===== S8: and it is the right one ======================================
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT name INTO v_txt FROM public.buildings LIMIT 1;
  RESET ROLE;
  IF v_txt = 'Block A' THEN
    pass:=pass+1; rep:=rep||'PASS S8  it is Block A, not the unassigned one'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S8  caretaker sees '||coalesce(v_txt,'nothing')||E'\n';
  END IF;

  -- ===== S9: units follow the same scope ==================================
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.units WHERE building_id = v_b2;
  RESET ROLE;
  IF v_n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS S9  no units from the unassigned block'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S9  caretaker sees units in Block B'||E'\n';
  END IF;

  -- ===== S10: maintenance for their block only ============================
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests;
  RESET ROLE;
  IF v_n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS S10 caretaker sees only their block''s maintenance'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S10 caretaker sees '||v_n||' job(s), expected 1'||E'\n';
  END IF;

  -- ===== S11: NO route to tenants, leases or payments =====================
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM public.tenants)
       + (SELECT count(*) FROM public.leases)
       + (SELECT count(*) FROM public.payments) INTO v_n;
  RESET ROLE;
  IF v_n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS S11 caretaker reaches no tenant, lease or payment'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S11 caretaker reached '||v_n||' private row(s)'||E'\n';
  END IF;

  -- ===== S12: a caretaker cannot widen their own permissions ==============
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.property_staff
       SET can_view_tenants = true, building_ids = ARRAY[v_b1, v_b2]
     WHERE id = v_staff;
    RESET ROLE;
    IF (SELECT can_view_tenants FROM public.property_staff WHERE id=v_staff) THEN
      fail:=fail+1; rep:=rep||'FAIL S12 a caretaker granted themselves tenant access'||E'\n';
    ELSE
      pass:=pass+1; rep:=rep||'PASS S12 the self-update matched no row'||E'\n';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S12 self-update refused outright'||E'\n';
  END;

  -- ===== S13: suspending a caretaker cuts access immediately ==============
  UPDATE public.property_staff SET status='suspended' WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT (SELECT count(*) FROM public.buildings)
       + (SELECT count(*) FROM public.maintenance_requests) INTO v_n;
  RESET ROLE;
  IF v_n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS S13 a suspended caretaker sees nothing'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S13 a suspended caretaker still sees '||v_n||' row(s)'||E'\n';
  END IF;
  UPDATE public.property_staff SET status='active' WHERE id=v_staff;

  -- ===== S14: can_manage_maintenance=false removes the maintenance sight ==
  UPDATE public.property_staff SET can_manage_maintenance=false WHERE id=v_staff;
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests;
  RESET ROLE;
  IF v_n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS S14 the maintenance permission is load-bearing'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S14 maintenance visible with the permission off'||E'\n';
  END IF;
  UPDATE public.property_staff SET can_manage_maintenance=true WHERE id=v_staff;

  -- ===== S15: the landlord still sees everything of their own =============
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.buildings;
  RESET ROLE;
  IF v_n = 2 THEN
    pass:=pass+1; rep:=rep||'PASS S15 the landlord still sees both their blocks'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S15 OVERREACH: landlord now sees '||v_n||' of 2'||E'\n';
  END IF;

  -- ===== S16: the unrelated landlord is unaffected ========================
  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.buildings;
  RESET ROLE;
  IF v_n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS S16 the other landlord sees only their own block'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S16 the other landlord sees '||v_n||' building(s)'||E'\n';
  END IF;

  -- ===== S17: staff cannot read the landlord's other staff ================
  INSERT INTO public.property_staff (landlord_id, full_name, phone, building_ids)
  VALUES (v_ll, 'Second Caretaker', '+254788888888', ARRAY[v_b2]);
  PERFORM set_config('request.jwt.claim.sub', v_care::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.property_staff;
  RESET ROLE;
  IF v_n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS S17 a caretaker sees only their own staff record'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL S17 a caretaker sees '||v_n||' staff records'||E'\n';
  END IF;

  -- ===== S18: anon reaches neither table ==================================
  BEGIN
    SET LOCAL ROLE anon;
    SELECT count(*) INTO v_n FROM public.property_staff;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S18 anon read the staff table'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S18 anon refused on property_staff (42501)'||E'\n';
  END;


  -- ===== S19-S21: the screening toggle is load-bearing, not decorative ====
  -- A stored switch nothing reads is a control that does nothing. This one is
  -- enforced in the insert trigger, where PostgREST cannot go round it.
  INSERT INTO public.listings
    (id, landlord_id, title, description, property_type, address, area, rent_amount, status)
  VALUES (v_lst, v_ll, 'Flat', 'd', 'apartment', '9 Rd', 'Kilimani', 40000, 'active');

  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_lst, 'Applicant', '+254700111222');
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S19 applications work while screening is on'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S19 '||SQLERRM||E'\n';
  END;

  UPDATE public.landlord_settings SET application_screening=false WHERE landlord_id=v_ll;
  DELETE FROM public.rental_applications WHERE listing_id=v_lst;
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_lst, 'Applicant', '+254700111222');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S20 the screening switch did nothing'||E'\n';
  EXCEPTION WHEN raise_exception THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S20 screening off refuses the application'||E'\n';
  END;

  UPDATE public.landlord_settings SET application_screening=true WHERE landlord_id=v_ll;
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_lst, 'Applicant', '+254700111222');
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS S21 switching it back on restores applications'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL S21 '||SQLERRM||E'\n';
  END;

  RAISE EXCEPTION E'LANDLORD_SETTINGS_STAFF_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$LS$;
