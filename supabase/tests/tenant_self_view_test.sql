-- =============================================================================
-- Behavioural proof for 20260363000000_tenant_self_view.sql
-- =============================================================================
-- Two things have to be true at once, and the second is the one that nearly
-- went wrong:
--
--   1. a tenant can no longer read public.tenants, so they cannot read their
--      landlord's notes or the reason they were blacklisted;
--   2. everything else a tenant could read, they can still read.
--
-- (2) matters because all six tenant policies used to resolve the tenant by
-- joining public.tenants, and RLS applies to a table referenced inside another
-- table's policy. Removing the tenant's access to that table without first
-- moving the resolution into current_tenant_ids() would have left the tenant
-- able to read nothing at all, while every catalogue check still looked right.
--
-- EVERY COUNT IS SCOPED TO THIS SUITE'S OWN FIXTURES, for the reason recorded
-- in tenant_rent_visibility_test.sql: unrelated permissive policies exist and a
-- suite that only holds on an empty cluster is not a suite.
-- =============================================================================

DO $TS$
DECLARE
  pass int := 0; fail int := 0; rep text := E'\n';
  v_ll   uuid := gen_random_uuid();   -- the landlord
  v_u1   uuid := gen_random_uuid();   -- the tenant's account
  v_u2   uuid := gen_random_uuid();   -- an unrelated tenant's account
  v_b    uuid := gen_random_uuid();
  v_un   uuid := gen_random_uuid();
  v_t1   uuid := gen_random_uuid();
  v_t2   uuid := gen_random_uuid();
  v_l1   uuid := gen_random_uuid();
  v_n    int;
  v_txt  text;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'ts-ll@test.invalid'),(v_u1,'ts-t1@test.invalid'),(v_u2,'ts-t2@test.invalid');
  INSERT INTO public.profiles (id,email,full_name) VALUES
    (v_ll,'ts-ll@test.invalid','Landlord'),
    (v_u1,'ts-t1@test.invalid','Tenant One'),
    (v_u2,'ts-t2@test.invalid','Tenant Two');
  INSERT INTO public.buildings (id,landlord_id,name,address,area,building_type)
    VALUES (v_b,v_ll,'Self Block','9 Rd','Kilimani','apartment');
  INSERT INTO public.units (id,landlord_id,building_id,unit_number,unit_type,monthly_rent)
    VALUES (v_un,v_ll,v_b,'S1','1br',50000);

  -- The two private columns are the whole point, so the fixture carries them.
  INSERT INTO public.tenants (id,created_by,full_name,phone,user_id,notes,blacklist_reason)
    VALUES
    (v_t1,v_ll,'Tenant One','+254711000011',v_u1,
      'PRIVATE-NOTE-ONE: landlord thinks this tenant is slow to pay',
      'PRIVATE-BLACKLIST-ONE'),
    (v_t2,v_ll,'Tenant Two','+254711000012',v_u2,
      'PRIVATE-NOTE-TWO','PRIVATE-BLACKLIST-TWO');

  INSERT INTO public.leases (id,unit_id,tenant_id,landlord_id,start_date,monthly_rent)
    VALUES (v_l1,v_un,v_t1,v_ll,current_date,50000);
  INSERT INTO public.payments (lease_id,amount,status,payment_type,payment_date,payment_method)
    VALUES (v_l1,50000,'confirmed','rent',current_date,'mpesa');
  INSERT INTO public.landlord_payout_methods
    (landlord_id,label,method,paybill_number,account_reference_mode,is_default,all_properties)
    VALUES (v_ll,'Main','mpesa_paybill','522533','unit_number',true,true);
  INSERT INTO public.maintenance_requests
    (landlord_id,tenant_id,unit_id,category,title,description,status,urgency)
    VALUES (v_ll,v_t1,v_un,'plumbing','Tap drips','The kitchen tap drips.','open','normal');

  -- ===== S1: the tenant still reads their own row ========================
  -- Unchanged on purpose: six other policies resolve the tenant through an
  -- EXISTS over this table, and RLS applies inside a policy expression, so
  -- taking this away would take every other tenant read with it.
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.tenants WHERE id = v_t1;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S1  tenant still reads their own tenants row'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S1  tenant lost their own row, saw '||v_n||E'\n'; END IF;

  -- ===== S2: but selecting notes is REFUSED, not merely empty =============
  -- A privilege error, not a filtered row. Asserted by catching the error:
  -- if the column were readable this block would succeed and set v_n=1.
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    SELECT count(*) INTO v_n FROM public.tenants WHERE notes IS NOT NULL;
    v_txt := 'no error';
  EXCEPTION WHEN insufficient_privilege THEN
    v_n := -1; v_txt := SQLSTATE;
  WHEN OTHERS THEN
    v_n := -2; v_txt := SQLSTATE;
  END;
  RESET ROLE;
  IF v_n=-1 THEN pass:=pass+1; rep:=rep||'PASS S2  selecting tenants.notes is refused (42501)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S2  tenants.notes was reachable, v_n='||v_n||' ('||coalesce(v_txt,'?')||')'||E'\n'; END IF;

  -- ===== S2b: and so is blacklist_reason ==================================
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    SELECT count(*) INTO v_n FROM public.tenants WHERE blacklist_reason IS NOT NULL;
    v_n := 1;
  EXCEPTION WHEN insufficient_privilege THEN v_n := -1;
  WHEN OTHERS THEN v_n := -2;
  END;
  RESET ROLE;
  IF v_n=-1 THEN pass:=pass+1; rep:=rep||'PASS S2b selecting tenants.blacklist_reason is refused'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S2b blacklist_reason was reachable, v_n='||v_n||E'\n'; END IF;

  -- ===== S3: the view returns exactly their own row =======================
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.tenant_self;
  SELECT max(full_name) INTO v_txt FROM public.tenant_self;
  RESET ROLE;
  IF v_n=1 AND v_txt='Tenant One' THEN
    pass:=pass+1; rep:=rep||'PASS S3  tenant_self returns exactly their own row'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S3  tenant_self returned '||v_n||' row(s), name='||coalesce(v_txt,'<null>')||E'\n'; END IF;

  -- ===== S4: and never anybody else's =====================================
  PERFORM set_config('request.jwt.claim.sub', v_u2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.tenant_self WHERE id = v_t1;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S4  the other tenant is not visible through the view'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S4  the view leaked another tenant''s row'||E'\n'; END IF;

  -- ===== S5: the private columns are not on the view at all ===============
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='tenant_self'
     AND column_name IN ('notes','blacklist_reason','created_by','metadata',
                         'status','verification_level','verified_at','user_id');
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S5  tenant_self exposes none of the landlord-private columns'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S5  tenant_self exposes '||v_n||' column(s) it must not'||E'\n'; END IF;

  -- ===== S6..S11: EVERYTHING ELSE STILL WORKS =============================
  -- The regression the naive design would have caused. Each is scoped to this
  -- suite's own fixtures.
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.leases WHERE id = v_l1;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S6  tenant still reads their lease'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S6  tenant lost their lease, saw '||v_n||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.units WHERE id = v_un;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S7  tenant still reads their unit'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S7  tenant lost their unit, saw '||v_n||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.buildings WHERE id = v_b;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S8  tenant still reads their building'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S8  tenant lost their building, saw '||v_n||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.payments WHERE lease_id = v_l1;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S9  tenant still reads their payments'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S9  tenant lost their payments, saw '||v_n||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.maintenance_requests WHERE tenant_id = v_t1;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S10 tenant still reads their repair requests'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S10 tenant lost their repairs, saw '||v_n||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.landlord_payout_methods WHERE landlord_id = v_ll;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S11 tenant still reads how to pay'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S11 tenant lost the payout method, saw '||v_n||E'\n'; END IF;

  -- ===== S12: the tenant can still report a repair ========================
  -- The INSERT policy's WITH CHECK was rewritten too.
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.maintenance_requests
      (landlord_id,tenant_id,unit_id,category,title,description,status,urgency)
      VALUES (v_ll,v_t1,v_un,'electrical','Socket dead','No power.','open','normal');
    v_n := 1;
  EXCEPTION WHEN OTHERS THEN
    v_n := 0; v_txt := SQLSTATE;
  END;
  RESET ROLE;
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S12 tenant can still report a repair'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S12 the repair insert was refused, SQLSTATE '||coalesce(v_txt,'?')||E'\n'; END IF;

  -- ===== S13: and still cannot file one against somebody else =============
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.maintenance_requests
      (landlord_id,tenant_id,unit_id,category,title,description,status,urgency)
      VALUES (v_ll,v_t2,v_un,'electrical','Not mine','Filed against another tenant.','open','normal');
    v_n := 1;
  EXCEPTION WHEN OTHERS THEN
    v_n := 0;
  END;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S13 a repair cannot be filed against another tenant'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S13 a tenant filed a repair against another tenant'||E'\n'; END IF;

  -- ===== S14: the landlord still reads the notes they wrote, via the view =
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.tenant_private_notes
   WHERE tenant_id IN (v_t1,v_t2) AND notes LIKE 'PRIVATE-NOTE-%';
  RESET ROLE;
  IF v_n=2 THEN pass:=pass+1; rep:=rep||'PASS S14 the landlord reads both tenants'' notes through the view'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S14 the landlord sees '||v_n||' of 2 note rows'||E'\n'; END IF;

  -- ===== S14b: and a tenant reaches nothing through that view =============
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.tenant_private_notes;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S14b a tenant reads nothing through tenant_private_notes'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S14b a tenant read '||v_n||' row(s) of private notes'||E'\n'; END IF;

  -- ===== S15: anon reaches neither the table nor the view =================
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO v_n FROM public.tenant_self;
  EXCEPTION WHEN OTHERS THEN
    v_n := 0;
  END;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S15 anon reads nothing through tenant_self'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S15 anon read '||v_n||' row(s) through tenant_self'||E'\n'; END IF;

  -- ===== S16: the view is a barrier =======================================
  -- Its WHERE clause is the security boundary, so an outer predicate must not
  -- be evaluated beneath it.
  SELECT count(*) INTO v_n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='tenant_self'
     AND c.reloptions @> ARRAY['security_barrier=true'];
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S16 tenant_self is a security_barrier view'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S16 tenant_self is not a security_barrier view'||E'\n'; END IF;

  -- ===== S17: the private columns are not granted to any client role ======
  -- The assertion the whole migration rests on, stated as a privilege rather
  -- than as a query result.
  -- privilege_type is filtered on purpose. The first version of this
  -- assertion omitted it and counted 18: three columns times two roles times
  -- the INSERT, UPDATE and SELECT grants. Only SELECT is what this migration
  -- removes; the writes are governed by RLS and are checked behaviourally in
  -- S17b rather than by privilege.
  SELECT count(*) INTO v_n FROM information_schema.column_privileges
   WHERE table_schema='public' AND table_name='tenants'
     AND grantee IN ('authenticated','anon')
     AND privilege_type='SELECT'
     AND column_name IN ('notes','blacklist_reason','metadata');
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S17 no client role holds SELECT on notes, blacklist_reason or metadata'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S17 '||v_n||' client SELECT grant(s) remain on the private columns'||E'\n'; END IF;

  -- ===== S17b: and a tenant cannot WRITE them either ======================
  -- authenticated does hold column-level INSERT and UPDATE on these, because
  -- the landlord needs them and both are the same role. RLS is what separates
  -- the two, so the separation is asserted by behaviour, not by privilege.
  PERFORM set_config('request.jwt.claim.sub', v_u1::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.tenants SET blacklist_reason='SELF-SERVED' WHERE id=v_t1;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_n := 0;
  END;
  RESET ROLE;
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S17b a tenant cannot rewrite their own blacklist_reason'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S17b a tenant updated '||v_n||' row(s) of blacklist_reason'||E'\n'; END IF;

  -- ===== S18: the columns the product does need are still granted =========
  -- Without this, revoking everything would pass S17 and break the product.
  SELECT count(*) INTO v_n FROM information_schema.column_privileges
   WHERE table_schema='public' AND table_name='tenants'
     AND grantee='authenticated' AND privilege_type='SELECT'
     AND column_name IN ('id','user_id','full_name','phone','email','status');
  IF v_n=6 THEN pass:=pass+1; rep:=rep||'PASS S18 the columns the product reads are still granted'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S18 only '||v_n||' of 6 needed columns are granted'||E'\n'; END IF;

  -- ===== S19: the tenant self-read policy is still there ==================
  -- Named, not pattern-matched: an earlier version of this assertion used
  -- qual LIKE '%user_id%' and also matched tenants_staff_read, whose
  -- expression mentions property_staff.user_id.
  SELECT count(*) INTO v_n FROM pg_policies
   WHERE schemaname='public' AND tablename='tenants'
     AND policyname='Users can view own tenant record';
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S19 the tenant self-read policy is intact, so the other six reads still resolve'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S19 the tenant self-read policy is missing'||E'\n'; END IF;

  -- ===== S20: no new client-executable definer function ===================
  -- The invariant identity_role_authority_test.sql enforces, asserted here too
  -- because an earlier draft of this migration broke it.
  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
   WHERE ns.nspname='public' AND p.prosecdef
     AND pg_get_function_result(p.oid) <> 'trigger'
     AND p.proname <> 'increment_listing_views'
     AND (has_function_privilege('anon', p.oid,'EXECUTE')
          OR has_function_privilege('authenticated', p.oid,'EXECUTE'));
  IF v_n=0 THEN pass:=pass+1; rep:=rep||'PASS S20 this migration added no client-executable definer function'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S20 '||v_n||' client-executable definer function(s) in public'||E'\n'; END IF;

  -- ===== S21: both views are barriers =====================================
  -- tenant_private_notes runs as its owner, so its WHERE clause is the only
  -- thing standing between a tenant and every landlord's notes. Without
  -- security_barrier an outer predicate may be evaluated beneath it.
  -- A mutant that removed the option survived until this assertion existed.
  SELECT count(*) INTO v_n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('tenant_self','tenant_private_notes')
     AND c.reloptions @> ARRAY['security_barrier=true'];
  IF v_n=2 THEN pass:=pass+1; rep:=rep||'PASS S21 both views are security_barrier'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S21 only '||v_n||' of 2 views is a security_barrier'||E'\n'; END IF;

  -- ===== S22: tenant_self narrows and does not widen =======================
  -- It is security_invoker, so the base table's RLS and column grants still
  -- apply through it. That is what makes its own WHERE clause belt-and-braces
  -- rather than the boundary. Both are asserted: if the invoker flag is ever
  -- flipped, the WHERE becomes load-bearing and must still be there.
  SELECT count(*) INTO v_n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='tenant_self'
     AND c.reloptions @> ARRAY['security_invoker=true'];
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S22 tenant_self is security_invoker, so RLS still applies through it'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S22 tenant_self is not security_invoker'||E'\n'; END IF;

  SELECT count(*) INTO v_n FROM pg_views
   WHERE schemaname='public' AND viewname='tenant_self'
     AND definition LIKE '%user_id = auth.uid()%';
  IF v_n=1 THEN pass:=pass+1; rep:=rep||'PASS S22b tenant_self still filters on user_id'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL S22b tenant_self no longer filters on user_id'||E'\n'; END IF;

  RAISE EXCEPTION E'TENANT_SELF_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$TS$;
