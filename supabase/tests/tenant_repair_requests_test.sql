-- =============================================================================
-- Behavioural proof for 20260362000000_tenant_repair_requests.sql
-- =============================================================================
-- A tenant can now write to a table they previously could only read. Three
-- failures matter:
--
--   FILING AGAINST A STRANGER. unit_id, landlord_id and tenant_id arrive from
--   a client. If any can be chosen, a tenant can put a repair on a landlord
--   who has never heard of them.
--
--   ARRIVING PRE-HANDLED. A report that sets status, an assignee or a cost
--   is not a report; it is a tenant writing in the landlord's own records.
--
--   anon TOUCHING IT AT ALL. It held INSERT, UPDATE, DELETE and TRUNCATE by
--   the project's default. TRUNCATE is not subject to RLS.
-- =============================================================================

DO $MR$
DECLARE
  pass int := 0; fail int := 0; rep text := E'\n';
  v_ll    uuid := gen_random_uuid();
  v_ll2   uuid := gen_random_uuid();
  v_u     uuid := gen_random_uuid();   -- the tenant's login
  v_b1    uuid := gen_random_uuid();
  v_b2    uuid := gen_random_uuid();
  v_un1   uuid := gen_random_uuid();
  v_un2   uuid := gen_random_uuid();   -- the other landlord's unit
  v_t1    uuid := gen_random_uuid();
  v_t2    uuid := gen_random_uuid();
  v_l1    uuid := gen_random_uuid();
  v_l2    uuid := gen_random_uuid();
  v_id    uuid;
  v_n     int;
  v_txt   text;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'mr-ll@test.invalid'),(v_ll2,'mr-ll2@test.invalid'),(v_u,'mr-t@test.invalid');
  INSERT INTO public.profiles (id,email,full_name) VALUES
    (v_ll,'mr-ll@test.invalid','Landlord'),
    (v_ll2,'mr-ll2@test.invalid','Other Landlord'),
    (v_u,'mr-t@test.invalid','Tenant One');
  INSERT INTO public.buildings (id,landlord_id,name,address,area,building_type) VALUES
    (v_b1,v_ll,'Block A','1 Rd','Kilimani','apartment'),
    (v_b2,v_ll2,'Block C','3 Rd','Lavington','apartment');
  INSERT INTO public.units (id,landlord_id,building_id,unit_number,unit_type,monthly_rent) VALUES
    (v_un1,v_ll,v_b1,'A1','1br',30000),
    (v_un2,v_ll2,v_b2,'C1','1br',45000);
  INSERT INTO public.tenants (id,created_by,full_name,phone,user_id) VALUES
    (v_t1,v_ll,'Tenant One','+254711000001',v_u),
    (v_t2,v_ll2,'Tenant Two','+254711000002',NULL);
  INSERT INTO public.leases (id,unit_id,tenant_id,landlord_id,start_date,monthly_rent,status) VALUES
    (v_l1,v_un1,v_t1,v_ll,current_date,30000,'active'),
    (v_l2,v_un2,v_t2,v_ll2,current_date,45000,'active');

  -- ===== R1: a tenant can report a repair =================================
  -- Wrapped so that a missing policy or a broken derivation REPORTS rather
  -- than aborting the suite before it can print a verdict. Three mutants
  -- (no derivation, the landlord shortcut taken for everyone, the policy
  -- dropped) all fail here, and all three used to read as "the suite broke".
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.maintenance_requests (category, title, description, urgency)
    VALUES ('plumbing','Kitchen tap drips','It drips all night.','normal')
    RETURNING id INTO v_id;
    RESET ROLE;
    IF v_id IS NOT NULL THEN
      pass:=pass+1; rep:=rep||'PASS R1  a tenant can report a repair'||E'\n';
    ELSE fail:=fail+1; rep:=rep||'FAIL R1  no row'||E'\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; fail:=fail+1;
    rep:=rep||'FAIL R1  a tenant cannot report a repair: '||SQLSTATE||' '||SQLERRM||E'\n';
    v_id := NULL;
  END;

  -- ===== R2: the three ids are DERIVED from their lease ===================
  SELECT (tenant_id = v_t1 AND unit_id = v_un1 AND landlord_id = v_ll)::text
    INTO v_txt FROM public.maintenance_requests WHERE id = v_id;
  IF v_txt = 'true' THEN
    pass:=pass+1; rep:=rep||'PASS R2  tenant, unit and landlord come from the lease'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R2  the ids were not derived'||E'\n'; END IF;

  -- ===== R3: THE FORGED REQUEST ===========================================
  -- The one that matters. A tenant naming another landlord's unit must not
  -- land a repair on that landlord.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.maintenance_requests (category, title, description, unit_id)
    VALUES ('plumbing','Not my unit','Filed against a stranger.', v_un2)
    RETURNING id INTO v_id;
    RESET ROLE;
    SELECT (unit_id = v_un1 AND landlord_id = v_ll)::text INTO v_txt
      FROM public.maintenance_requests WHERE id = v_id;
    IF v_txt = 'true' THEN
      pass:=pass+1; rep:=rep||'PASS R3  a unit_id from the client is overruled by the lease'||E'\n';
    ELSE fail:=fail+1; rep:=rep||'FAIL R3  the request was filed against another landlord'||E'\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; fail:=fail+1;
    rep:=rep||'FAIL R3  the insert failed: '||SQLSTATE||' '||SQLERRM||E'\n';
  END;

  -- ===== R4: and so is a forged landlord_id ===============================
  -- landlord_id set means "a landlord is logging this", and the landlord
  -- policy then requires it to be their own uid. A tenant naming someone
  -- else must be refused outright rather than quietly re-pointed.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.maintenance_requests (category, title, description, landlord_id, unit_id, tenant_id)
    VALUES ('plumbing','Forged','Filed as a landlord.', v_ll2, v_un2, v_t2);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL R4  a tenant filed a request as another landlord'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS R4  posing as a landlord is refused by RLS'||E'\n';
  WHEN OTHERS THEN
    RESET ROLE; fail:=fail+1;
    rep:=rep||'FAIL R4  refused, but not by RLS: '||SQLSTATE||E'\n';
  END;

  -- ===== R5: a report arrives unhandled ===================================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.maintenance_requests
      (category, title, description, status, assigned_to, estimated_cost, actual_cost, cost_paid_by, completed_at)
    VALUES ('electrical','Socket sparks','Sparks when plugged in.',
            'completed','My cousin',50000,50000,'landlord', now())
    RETURNING id INTO v_id;
    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE; v_id := NULL;
  END;
  IF v_id IS NULL THEN
    fail:=fail+1; rep:=rep||'FAIL R5  the report could not be filed at all'||E'\n';
  ELSE
  SELECT (status = 'open' AND assigned_to IS NULL AND estimated_cost IS NULL
          AND actual_cost IS NULL AND cost_paid_by IS NULL
          AND completed_at IS NULL)::text
    INTO v_txt FROM public.maintenance_requests WHERE id = v_id;
  IF v_txt = 'true' THEN
    pass:=pass+1; rep:=rep||'PASS R5  a tenant cannot pre-handle, cost or close their own report'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R5  a tenant wrote the landlord''s own fields'||E'\n'; END IF;
  END IF;

  -- ===== R6: an unknown category is refused ===============================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.maintenance_requests (category, title, description)
    VALUES ('teleportation','Bad','No such category.');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL R6  an unknown category was accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS R6  the category list is enforced'||E'\n';
  -- Narrow handlers are holes. Without this, any mutant that makes the
  -- insert fail for a DIFFERENT reason aborts the suite before it can
  -- report, and the run reads as "the suite broke" rather than "R6 failed".
  WHEN OTHERS THEN
    RESET ROLE; fail:=fail+1;
    rep:=rep||'FAIL R6  refused, but not by the category check: '||SQLSTATE||E'\n';
  END;

  -- ===== R7: somebody with no lease cannot report at all ==================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.maintenance_requests (category, title, description)
    VALUES ('plumbing','No lease','I rent nothing.');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL R7  somebody with no lease filed a repair'||E'\n';
  EXCEPTION WHEN invalid_authorization_specification THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS R7  no lease, no report (28000)'||E'\n';
  WHEN OTHERS THEN
    RESET ROLE; fail:=fail+1;
    rep:=rep||'FAIL R7  refused, but not by the lease check: '||SQLSTATE||E'\n';
  END;

  -- ===== R8: the tenant can read their own back ===========================
  PERFORM set_config('request.jwt.claim.sub', v_u::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests WHERE tenant_id = v_t1;
  RESET ROLE;
  IF v_n = 3 THEN
    pass:=pass+1; rep:=rep||'PASS R8  the tenant sees the three they reported'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R8  the tenant sees '||v_n||' of 3'||E'\n'; END IF;

  -- ===== R9: the landlord sees them too ===================================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests WHERE landlord_id = v_ll;
  RESET ROLE;
  IF v_n = 3 THEN
    pass:=pass+1; rep:=rep||'PASS R9  the landlord receives them'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R9  the landlord sees '||v_n||' of 3'||E'\n'; END IF;

  -- ===== R10: the other landlord sees none ================================
  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests WHERE landlord_id = v_ll;
  RESET ROLE;
  IF v_n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS R10 another landlord sees none of them'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL R10 another landlord read '||v_n||E'\n'; END IF;

  -- ===== R11: anon holds nothing on this table ============================
  IF has_table_privilege('anon','public.maintenance_requests','INSERT')
     OR has_table_privilege('anon','public.maintenance_requests','UPDATE')
     OR has_table_privilege('anon','public.maintenance_requests','DELETE')
     OR has_table_privilege('anon','public.maintenance_requests','SELECT') THEN
    fail:=fail+1; rep:=rep||'FAIL R11 anon still holds privileges here'||E'\n';
  ELSE
    pass:=pass+1; rep:=rep||'PASS R11 anon holds nothing on maintenance_requests'||E'\n';
  END IF;

  -- ===== R12: and cannot TRUNCATE, which RLS would not stop ===============
  IF has_table_privilege('anon','public.maintenance_requests','TRUNCATE')
     OR has_table_privilege('authenticated','public.maintenance_requests','TRUNCATE') THEN
    fail:=fail+1; rep:=rep||'FAIL R12 a client can truncate the repair log'||E'\n';
  ELSE
    pass:=pass+1; rep:=rep||'PASS R12 nobody client-side can truncate the repair log'||E'\n';
  END IF;

  RAISE EXCEPTION E'TENANT_REPAIR_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$MR$;
