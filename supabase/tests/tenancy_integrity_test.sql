-- =============================================================================
-- Behavioural proof for 20260354000000_tenancy_integrity.sql
-- =============================================================================
-- The migration's own guards prove the index and the function EXIST and are
-- shaped correctly. They cannot prove either one BEHAVES.
--
-- That distinction was not academic here. The first version of create_tenancy
-- passed every structural guard and still could not insert a tenant:
-- jsonb_populate_record into a %ROWTYPE writes an explicit NULL for every
-- column the caller omitted, so the column DEFAULTs never fired and
-- tenants.id came out null. T7 found it; nothing structural could have.
--
-- Fixtures are created inside the DO block and the closing RAISE EXCEPTION
-- rolls them back, which is how every other suite here works.
-- =============================================================================

DO $TEN$
DECLARE
  pass int := 0;
  fail int := 0;
  rep  text := E'\n';
  v_l1 uuid := gen_random_uuid();
  v_l2 uuid := gen_random_uuid();
  v_b1 uuid := gen_random_uuid();
  v_b2 uuid := gen_random_uuid();
  v_u1 uuid := gen_random_uuid();
  v_u2 uuid := gen_random_uuid();
  v_u3 uuid := gen_random_uuid();
  v_res jsonb;
  v_n   int;
  v_txt text;
  ok    boolean;
BEGIN
  -- ---------- fixtures ----------
  INSERT INTO auth.users (id, email) VALUES
    (v_l1, 'ten1@test.invalid'), (v_l2, 'ten2@test.invalid');
  INSERT INTO public.profiles (id, email, full_name) VALUES
    (v_l1, 'ten1@test.invalid', 'Landlord One'),
    (v_l2, 'ten2@test.invalid', 'Landlord Two');
  INSERT INTO public.buildings (id, landlord_id, name, address, area, building_type) VALUES
    (v_b1, v_l1, 'Test Block',  '1 Test Rd', 'Kilimani', 'apartment'),
    (v_b2, v_l1, 'Other Block', '2 Test Rd', 'Karen',    'apartment');
  INSERT INTO public.units (id, landlord_id, building_id, unit_number, unit_type, monthly_rent)
    VALUES (v_u1, v_l1, v_b1, 'A101', '1br', 50000);

  -- ===== U1: an exact duplicate unit number is refused =====================
  ok := false;
  BEGIN
    INSERT INTO public.units (landlord_id, building_id, unit_number, unit_type, monthly_rent)
    VALUES (v_l1, v_b1, 'A101', 'studio', 1);
  EXCEPTION WHEN unique_violation THEN ok := true;
  END;
  IF ok THEN pass:=pass+1; rep:=rep||'PASS U1  exact duplicate unit number refused'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL U1  a duplicate unit number was accepted'||E'\n'; END IF;

  -- ===== U2: a CASE variant is refused ====================================
  -- A plain UNIQUE on the raw column would accept this. The application
  -- compares case-insensitively, so the index must too.
  ok := false;
  BEGIN
    INSERT INTO public.units (landlord_id, building_id, unit_number, unit_type, monthly_rent)
    VALUES (v_l1, v_b1, 'a101', 'studio', 1);
  EXCEPTION WHEN unique_violation THEN ok := true;
  END;
  IF ok THEN pass:=pass+1; rep:=rep||'PASS U2  case variant "a101" refused'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL U2  "a101" accepted alongside "A101"'||E'\n'; END IF;

  -- ===== U3: a SPACING variant is refused =================================
  ok := false;
  BEGIN
    INSERT INTO public.units (landlord_id, building_id, unit_number, unit_type, monthly_rent)
    VALUES (v_l1, v_b1, 'A 101', 'studio', 1);
  EXCEPTION WHEN unique_violation THEN ok := true;
  END;
  IF ok THEN pass:=pass+1; rep:=rep||'PASS U3  spacing variant "A 101" refused'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL U3  "A 101" accepted alongside "A101"'||E'\n'; END IF;

  -- ===== U4: the same number in ANOTHER building is allowed ===============
  -- The check that stops this from being a constraint that is merely strict.
  ok := true;
  BEGIN
    INSERT INTO public.units (landlord_id, building_id, unit_number, unit_type, monthly_rent)
    VALUES (v_l1, v_b2, 'A101', 'studio', 1);
  EXCEPTION WHEN unique_violation THEN ok := false;
  END;
  IF ok THEN pass:=pass+1; rep:=rep||'PASS U4  same number in another building allowed'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL U4  the index spans buildings, which is too strict'||E'\n'; END IF;

  -- ===== T1: create_tenancy refuses an anonymous caller ===================
  ok := false;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  BEGIN
    PERFORM public.create_tenancy(v_u1, '{}'::jsonb, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM LIKE '%not signed in%');
  END;
  IF ok THEN pass:=pass+1; rep:=rep||'PASS T1  anonymous caller refused'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T1  an anonymous caller was not refused'||E'\n'; END IF;

  -- ===== T2: another landlord's unit is refused ===========================
  ok := false;
  PERFORM set_config('request.jwt.claim.sub', v_l2::text, true);
  BEGIN
    PERFORM public.create_tenancy(v_u1,
      '{"full_name":"Mallory","phone":"+254700000001"}'::jsonb,
      jsonb_build_object('start_date','2026-01-01','monthly_rent',50000));
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM LIKE '%not found%');
  END;
  IF ok THEN pass:=pass+1; rep:=rep||'PASS T2  another landlord''s unit refused'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T2  a foreign landlord created a tenancy'||E'\n'; END IF;

  -- ===== T3: the happy path writes all three ==============================
  PERFORM set_config('request.jwt.claim.sub', v_l1::text, true);
  v_res := public.create_tenancy(v_u1,
    '{"full_name":"Grace Wanjiru","phone":"+254700000002"}'::jsonb,
    jsonb_build_object('start_date','2026-01-01','monthly_rent',50000,'status','active'));

  SELECT count(*) INTO v_n FROM public.tenants WHERE id = (v_res->>'tenant_id')::uuid;
  SELECT status  INTO v_txt FROM public.units  WHERE id = v_u1;
  IF v_n = 1
     AND (SELECT count(*) FROM public.leases WHERE id = (v_res->>'lease_id')::uuid) = 1
     AND v_txt = 'occupied' THEN
    pass:=pass+1; rep:=rep||'PASS T3  tenant, lease and occupied status all written'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T3  incomplete tenancy (tenant='||v_n||' unit status='||coalesce(v_txt,'null')||')'||E'\n';
  END IF;

  -- ===== T4: ownership comes from the session, not the payload ============
  IF (SELECT created_by FROM public.tenants WHERE id = (v_res->>'tenant_id')::uuid) = v_l1
     AND (SELECT landlord_id FROM public.leases WHERE id = (v_res->>'lease_id')::uuid) = v_l1 THEN
    pass:=pass+1; rep:=rep||'PASS T4  ownership taken from the session'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T4  ownership not taken from the session'||E'\n';
  END IF;

  -- ===== T5: column DEFAULTS still fire for columns not supplied ==========
  -- The bug the first implementation had: every unsupplied column was written
  -- as an explicit NULL, so DEFAULTs never applied.
  IF (SELECT id FROM public.tenants WHERE id = (v_res->>'tenant_id')::uuid) IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS T5  defaults fired for columns the caller omitted'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T5  an omitted column was written as NULL instead of its default'||E'\n';
  END IF;

  -- ===== T6: a second live lease on one unit is refused ===================
  ok := false;
  BEGIN
    PERFORM public.create_tenancy(v_u1,
      '{"full_name":"Second Tenant","phone":"+254700000003"}'::jsonb,
      jsonb_build_object('start_date','2026-02-01','monthly_rent',50000,'status','active'));
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM LIKE '%already has a live lease%');
  END;
  IF ok THEN pass:=pass+1; rep:=rep||'PASS T6  second live lease on one unit refused'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL T6  a unit got two live leases'||E'\n'; END IF;

  -- ===== T7: THE POINT -- a failed lease leaves NO orphan tenant ==========
  INSERT INTO public.units (id, landlord_id, building_id, unit_number, unit_type, monthly_rent)
  VALUES (v_u2, v_l1, v_b1, 'B200', 'studio', 1);

  SELECT count(*) INTO v_n FROM public.tenants;
  ok := false;
  BEGIN
    -- leases.monthly_rent is NOT NULL; omitting it fails the lease insert
    -- AFTER the tenant insert has already succeeded.
    PERFORM public.create_tenancy(v_u2,
      '{"full_name":"Orphan Candidate","phone":"+254700000004"}'::jsonb,
      jsonb_build_object('start_date','2026-03-01'));
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;

  IF NOT ok THEN
    fail:=fail+1; rep:=rep||'FAIL T7  setup broke: the invalid lease was accepted'||E'\n';
  ELSIF (SELECT count(*) FROM public.tenants) = v_n
        AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE full_name = 'Orphan Candidate') THEN
    pass:=pass+1; rep:=rep||'PASS T7  a failed lease left no orphan tenant'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T7  an orphan tenant survived a failed lease'||E'\n';
  END IF;

  -- ===== T8: and the unit was not left marked occupied ====================
  SELECT status INTO v_txt FROM public.units WHERE id = v_u2;
  IF v_txt IS DISTINCT FROM 'occupied' THEN
    pass:=pass+1; rep:=rep||'PASS T8  unit not left occupied by the failed attempt'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T8  the unit is occupied after a failed tenancy'||E'\n';
  END IF;

  -- ===== T9: the function is NOT a client-executable definer ==============
  -- identity_role_authority I7 enforces this system-wide; the first version of
  -- this migration broke it and two suites caught it.
  IF NOT EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname='public' AND p.proname='create_tenancy' AND p.prosecdef)
     AND has_function_privilege('authenticated','public.create_tenancy(uuid,jsonb,jsonb)','EXECUTE') THEN
    pass:=pass+1; rep:=rep||'PASS T9  invoker-rights and callable by authenticated'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T9  create_tenancy is a definer, or is not callable'||E'\n';
  END IF;

  -- ===== T10: it works for a REAL authenticated client ====================
  -- Every assertion above sets request.jwt.claim.sub so auth.uid() resolves,
  -- but none of them changes the current ROLE, so they all run with postgres
  -- privileges. auth.uid() and the current role are different things, and a
  -- suite that sets only the first cannot see a privilege failure at all.
  --
  -- That blind spot nearly shipped a broken production. 20260364000000 revokes
  -- table-level SELECT on tenants and grants 20 of 23 columns back by name;
  -- create_tenancy is invoker-rights by design (T9), and its tenant insert
  -- ended in RETURNING *, which needs SELECT on every column returned. As
  -- postgres that is invisible. As authenticated it is
  --     ERROR: permission denied for table tenants
  -- and no landlord can add a tenant. 20260365000000 returns the id instead.
  INSERT INTO public.units (id, landlord_id, building_id, unit_number, unit_type, monthly_rent)
  VALUES (v_u3, v_l1, v_b1, 'C300', 'studio', 40000);

  PERFORM set_config('request.jwt.claim.sub', v_l1::text, true);
  ok := false;
  v_txt := NULL;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    v_res := public.create_tenancy(v_u3,
      '{"full_name":"Role Probe","phone":"+254700000005"}'::jsonb,
      jsonb_build_object('start_date','2026-04-01','monthly_rent',40000,'status','active'));
    ok := (v_res ? 'tenant_id') AND (v_res ? 'lease_id');
  EXCEPTION WHEN OTHERS THEN ok := false; v_txt := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';

  IF ok THEN
    pass:=pass+1; rep:=rep||'PASS T10 create_tenancy works as the real authenticated role'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T10 create_tenancy fails for a real client: '||coalesce(v_txt,'no result')||E'\n';
  END IF;

  -- ===== T11: and the shape that caused it cannot come back ===============
  -- Structural, so it fails even on a database where Part B is not applied and
  -- T10 would therefore pass by luck.
  IF EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname='public' AND p.proname='create_tenancy'
         AND pg_get_functiondef(p.oid) LIKE '%INSERT INTO public.tenants%RETURNING id%'
     ) THEN
    pass:=pass+1; rep:=rep||'PASS T11 the tenants insert returns id, not *'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL T11 the tenants insert uses RETURNING *, which Part B forbids'||E'\n';
  END IF;

  RAISE EXCEPTION E'TENANCY_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$TEN$;
