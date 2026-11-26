-- =============================================================================
-- Behavioural proof for 20260360000000_mpesa_inbox.sql
-- =============================================================================
-- This table holds money. Three failures matter here and none of them is
-- visible in the catalogue:
--
--   CREDITING THE SAME MONEY TWICE — a paybill confirmation can be delivered
--   more than once, and a landlord pasting their messages will paste an
--   overlapping window. The unique index is the only thing standing between
--   that and a tenant's account showing double what they paid.
--
--   ATTACHING MONEY TO SOMEONE ELSE'S LEASE — `matched_lease_id` arrives from
--   a client. A forged id must be refused by the database, not by the caller.
--
--   SHOWING IT TO THE WRONG PERSON — who paid what, from which number, is
--   among the most sensitive things here.
--
-- EVERY COUNT IS SCOPED TO THIS SUITE'S OWN FIXTURES, so the suite holds on a
-- populated production database and not only on an empty cluster.
-- =============================================================================

DO $MI$
DECLARE
  pass int := 0; fail int := 0; rep text := E'\n';
  v_ll    uuid := gen_random_uuid();
  v_ll2   uuid := gen_random_uuid();
  v_staff uuid := gen_random_uuid();
  v_b1    uuid := gen_random_uuid();
  v_b2    uuid := gen_random_uuid();   -- the other landlord's block
  v_un1   uuid := gen_random_uuid();
  v_un2   uuid := gen_random_uuid();
  v_t1    uuid := gen_random_uuid();
  v_t2    uuid := gen_random_uuid();
  v_l1    uuid := gen_random_uuid();   -- our landlord's lease
  v_l2    uuid := gen_random_uuid();   -- the other landlord's lease
  v_i1    uuid;                        -- the first inbox row
  v_i2    uuid;
  v_n     int;
  v_txt   text;
  v_ts    timestamptz;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'mi-ll@test.invalid'),(v_ll2,'mi-ll2@test.invalid'),
    (v_staff,'mi-st@test.invalid');
  -- The caretaker's PHONE is what links an invited staff row to an account
  -- (the staff trigger matches on it, not on email). Without it on the
  -- profile, every staff assertion below would pass for the wrong reason:
  -- an unlinked row sees nothing no matter what access it is granted.
  INSERT INTO public.profiles (id,email,full_name,phone) VALUES
    (v_ll,'mi-ll@test.invalid','Landlord',NULL),
    (v_ll2,'mi-ll2@test.invalid','Other Landlord',NULL),
    (v_staff,'mi-st@test.invalid','Caretaker','+254715550000');
  INSERT INTO public.buildings (id,landlord_id,name,address,area,building_type) VALUES
    (v_b1,v_ll,'Block A','1 Rd','Kilimani','apartment'),
    (v_b2,v_ll2,'Block C','3 Rd','Lavington','apartment');
  INSERT INTO public.units (id,landlord_id,building_id,unit_number,unit_type,monthly_rent) VALUES
    (v_un1,v_ll,v_b1,'A1','1br',30000),
    (v_un2,v_ll2,v_b2,'C1','1br',45000);
  INSERT INTO public.tenants (id,created_by,full_name,phone) VALUES
    (v_t1,v_ll,'Tenant One','+254711000001'),
    (v_t2,v_ll2,'Tenant Two','+254711000002');
  INSERT INTO public.leases (id,unit_id,tenant_id,landlord_id,start_date,monthly_rent) VALUES
    (v_l1,v_un1,v_t1,v_ll,current_date,30000),
    (v_l2,v_un2,v_t2,v_ll2,current_date,45000);

  -- ===== I1: a landlord can record money that arrived =====================
  -- Note what is NOT passed: landlord_id. A client holds no privilege on that
  -- column, so the trigger derives it from auth.uid(). If that ever stopped
  -- working this insert would fail the NOT NULL, not quietly mis-file.
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.mpesa_inbox (trans_id, trans_amount, bill_ref, msisdn, payer_name)
  VALUES ('  sfg12abcde ', 30000, ' A1 ', '254711000001', 'TENANT ONE')
  RETURNING id INTO v_i1;
  RESET ROLE;
  SELECT landlord_id::text INTO v_txt FROM public.mpesa_inbox WHERE id=v_i1;
  IF v_txt = v_ll::text THEN
    pass:=pass+1; rep:=rep||'PASS I1  an inbox row is filed to the landlord who recorded it'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I1  filed to '||coalesce(v_txt,'NULL')||E'\n'; END IF;

  -- ===== I2: the code is normalised on the way in =========================
  SELECT trans_id INTO v_txt FROM public.mpesa_inbox WHERE id=v_i1;
  IF v_txt = 'SFG12ABCDE' THEN
    pass:=pass+1; rep:=rep||'PASS I2  the M-Pesa code is stored upper-cased and trimmed'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I2  stored as "'||coalesce(v_txt,'NULL')||'"'||E'\n'; END IF;

  -- ===== I3: so is the account reference ==================================
  SELECT bill_ref INTO v_txt FROM public.mpesa_inbox WHERE id=v_i1;
  IF v_txt = 'A1' THEN
    pass:=pass+1; rep:=rep||'PASS I3  the account reference is trimmed'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I3  stored as "'||coalesce(v_txt,'NULL')||'"'||E'\n'; END IF;

  -- ===== I4: THE DOUBLE-CREDIT TRAP =======================================
  -- The same confirmation, pasted again with different case and spacing. If
  -- the unique key were on the raw text this would be accepted and the tenant
  -- would be credited 60,000 for a 30,000 payment.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.mpesa_inbox (trans_id, trans_amount)
    VALUES ('SFG12ABCDE', 30000);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I4  the same M-Pesa code was recorded twice'||E'\n';
  EXCEPTION WHEN unique_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS I4  the same M-Pesa code cannot be recorded twice'||E'\n';
  END;

  -- ===== I5: but the key is PER LANDLORD ==================================
  -- Two landlords can legitimately receive codes that collide; a global
  -- unique key would silently drop the second landlord's money.
  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.mpesa_inbox (trans_id, trans_amount)
  VALUES ('SFG12ABCDE', 45000) RETURNING id INTO v_i2;
  RESET ROLE;
  IF v_i2 IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS I5  the same code is accepted for a different landlord'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I5  a second landlord''s money was rejected'||E'\n'; END IF;

  -- ===== I6: money with no amount is not money ============================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.mpesa_inbox (trans_id, trans_amount) VALUES ('ZERO000001', 0);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I6  a zero-amount payment was recorded'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS I6  a zero or negative amount is refused'||E'\n';
  END;

  -- ===== I7: "matched" without a lease is a lie ===========================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.mpesa_inbox (trans_id, trans_amount, status)
    VALUES ('NOLEASE001', 1000, 'matched');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I7  a row claims to be matched with no lease'||E'\n';
  EXCEPTION WHEN check_violation THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS I7  a matched row must name the lease it matched'||E'\n';
  END;

  -- ===== I8: THE FORGED-MATCH TRAP ========================================
  -- `matched_lease_id` comes from a client. This is the one that matters: a
  -- landlord posting their own money onto a stranger's lease would corrupt
  -- another landlord's books, and RLS alone does not stop it — the row being
  -- written is theirs, it is the id INSIDE it that is not.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.mpesa_inbox (trans_id, trans_amount, status, matched_lease_id)
    VALUES ('THEFT00001', 1000, 'matched', v_l2);
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I8  money was attached to another landlord''s lease'||E'\n';
  EXCEPTION WHEN invalid_authorization_specification THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS I8  a lease you do not own is refused (28000)'||E'\n';
  END;

  -- ===== I9: matching your own lease works, and is timestamped ============
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.mpesa_inbox
     SET status='matched', matched_lease_id=v_l1, match_reason='Account "A1" matches unit A1.'
   WHERE id=v_i1;
  RESET ROLE;
  SELECT matched_at INTO v_ts FROM public.mpesa_inbox WHERE id=v_i1;
  IF v_ts IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS I9  matching records when it happened'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I9  a matched row has no matched_at'||E'\n'; END IF;

  -- ===== I10: a client cannot re-file a row to another landlord ===========
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.mpesa_inbox SET landlord_id=v_ll2 WHERE id=v_i1;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I10 a client moved money to another landlord'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS I10 landlord_id is not writable by a client (42501)'||E'\n';
  -- Naming the guard matters. Granting UPDATE on landlord_id does not let the
  -- money move — the trigger and the policy's WITH CHECK both stop it — but
  -- then the refusal arrives as 28000 or 42501-from-RLS, from a guard that is
  -- about something else. Without this branch that mutant aborted the suite
  -- instead of reporting, which reads as "the suite broke", not "I10 failed".
  WHEN OTHERS THEN
    RESET ROLE; fail:=fail+1;
    rep:=rep||'FAIL I10 refused, but by the wrong guard: '||SQLSTATE||' '||SQLERRM||E'\n';
  END;

  -- ===== I11: another landlord sees none of it ============================
  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.mpesa_inbox WHERE id = v_i1;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS I11 another landlord cannot see who paid you'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I11 another landlord read your inbox'||E'\n'; END IF;

  -- ===== I12: anon reaches nothing at all =================================
  BEGIN
    SET LOCAL ROLE anon;
    SELECT count(*) INTO v_n FROM public.mpesa_inbox;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL I12 anon read the money inbox'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS I12 anon is refused outright (42501)'||E'\n';
  END;

  -- ===== I13: staff without access_invoice see nothing ====================
  INSERT INTO public.property_staff
    (landlord_id, first_name, last_name, email, phone, building_ids, access_maintenance)
  VALUES (v_ll,'Care','Taker','mi-st@test.invalid','+254715550000',ARRAY[v_b1],'all');
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.mpesa_inbox WHERE id = v_i1;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS I13 a caretaker without access_invoice sees no payments'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I13 a caretaker read the inbox uninvited'||E'\n'; END IF;

  -- ===== I14: granting access_invoice shows them ==========================
  -- Without this the gate above could be passing for the wrong reason (no
  -- staff policy at all, a broken join) and look identical.
  UPDATE public.property_staff SET access_invoice='view' WHERE landlord_id=v_ll;
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.mpesa_inbox WHERE id = v_i1;
  RESET ROLE;
  IF v_n=1 THEN
    pass:=pass+1; rep:=rep||'PASS I14 access_invoice is load-bearing, not decorative'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I14 with access_invoice they see '||v_n||', expected 1'||E'\n'; END IF;

  -- ===== I15: and still cannot reconcile ==================================
  -- Deciding whose rent a payment is counts as changing someone's account.
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.mpesa_inbox SET status='ignored', match_reason='not rent' WHERE id=v_i1;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS I15 a caretaker cannot reconcile (0 rows matched)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I15 a caretaker reconciled a payment'||E'\n'; END IF;

  -- ===== I16: a suspended caretaker loses sight immediately ===============
  UPDATE public.property_staff SET status='suspended' WHERE landlord_id=v_ll;
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.mpesa_inbox WHERE id = v_i1;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS I16 suspension removes sight of the inbox'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I16 a suspended caretaker still sees '||v_n||E'\n'; END IF;

  -- ===== I17: the landlord still sees their own row =======================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.mpesa_inbox WHERE id IN (v_i1, v_i2);
  RESET ROLE;
  IF v_n=1 THEN
    pass:=pass+1; rep:=rep||'PASS I17 the landlord sees their own row and only their own'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL I17 the landlord sees '||v_n||' of the 2 fixture rows, expected 1'||E'\n'; END IF;

  RAISE EXCEPTION E'MPESA_INBOX_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$MI$;
