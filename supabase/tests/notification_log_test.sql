-- =============================================================================
-- Behavioural proof for 20260361000000_notification_log.sql
-- =============================================================================
-- This table is the only thing standing between a landlord's tenants and a
-- daily email telling them their rent is late. "Rent is late" is a STATE: a
-- notifier that asks who is late and emails them finds the same people
-- tomorrow, and the day after. The unique index is the feature.
--
-- Three failures matter and none is visible in the catalogue:
--   SENDING TWICE  — the index missing, or not covering the case.
--   NEVER SENDING AGAIN — the index covering failures too, so one Resend
--   outage silences that notice permanently.
--   A CLIENT WRITING THE LOG — forge a 'sent' row and the real notice is
--   blocked for ever; delete one and it goes out twice.
-- =============================================================================

DO $NL$
DECLARE
  pass int := 0; fail int := 0; rep text := E'\n';
  v_ll   uuid := gen_random_uuid();
  v_ll2  uuid := gen_random_uuid();
  v_t1   uuid := gen_random_uuid();
  v_n    int;
  v_id   uuid;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'nl-ll@test.invalid'),(v_ll2,'nl-ll2@test.invalid');
  INSERT INTO public.profiles (id,email,full_name) VALUES
    (v_ll,'nl-ll@test.invalid','Landlord'),
    (v_ll2,'nl-ll2@test.invalid','Other Landlord');
  INSERT INTO public.tenants (id,created_by,full_name,phone) VALUES
    (v_t1,v_ll,'Tenant One','+254711000001');

  -- ===== N1: a notice can be recorded =====================================
  INSERT INTO public.notification_log
    (landlord_id, recipient_kind, tenant_id, kind, dedupe_key, subject_type, period)
  VALUES (v_ll,'tenant',v_t1,'invoice_late','invoice_late:'||v_t1||':l1:2026-11','lease','2026-11')
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS N1  a sent notice is recorded'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL N1  no row'||E'\n'; END IF;

  -- ===== N2: THE SAME NOTICE CANNOT BE SENT TWICE =========================
  BEGIN
    INSERT INTO public.notification_log
      (landlord_id, recipient_kind, tenant_id, kind, dedupe_key, subject_type, period)
    VALUES (v_ll,'tenant',v_t1,'invoice_late','invoice_late:'||v_t1||':l1:2026-11','lease','2026-11');
    fail:=fail+1; rep:=rep||'FAIL N2  the same notice was recorded twice'||E'\n';
  EXCEPTION WHEN unique_violation THEN
    pass:=pass+1; rep:=rep||'PASS N2  the same notice cannot be sent twice'||E'\n';
  END;

  -- ===== N3: next month's notice is a different notice ====================
  INSERT INTO public.notification_log
    (landlord_id, recipient_kind, tenant_id, kind, dedupe_key, subject_type, period)
  VALUES (v_ll,'tenant',v_t1,'invoice_late','invoice_late:'||v_t1||':l1:2026-12','lease','2026-12');
  SELECT count(*) INTO v_n FROM public.notification_log
   WHERE landlord_id=v_ll AND kind='invoice_late';
  IF v_n=2 THEN
    pass:=pass+1; rep:=rep||'PASS N3  a different month is a different notice'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL N3  '||v_n||' rows, expected 2'||E'\n'; END IF;

  -- ===== N4: A FAILED SEND MUST BE RETRYABLE ==============================
  -- If the index covered failures too, one Resend outage would silence this
  -- notice for ever and nobody would ever know.
  INSERT INTO public.notification_log
    (landlord_id, recipient_kind, tenant_id, kind, dedupe_key, status, error)
  VALUES (v_ll,'tenant',v_t1,'invoice_due_soon','invoice_due_soon:'||v_t1||':l1:2026-11','failed','smtp down');
  BEGIN
    INSERT INTO public.notification_log
      (landlord_id, recipient_kind, tenant_id, kind, dedupe_key, status)
    VALUES (v_ll,'tenant',v_t1,'invoice_due_soon','invoice_due_soon:'||v_t1||':l1:2026-11','sent');
    pass:=pass+1; rep:=rep||'PASS N4  a failed send can be retried'||E'\n';
  EXCEPTION WHEN unique_violation THEN
    fail:=fail+1; rep:=rep||'FAIL N4  a failed send blocks the retry for ever'||E'\n';
  END;

  -- ===== N5: ...but only once it succeeds =================================
  BEGIN
    INSERT INTO public.notification_log
      (landlord_id, recipient_kind, tenant_id, kind, dedupe_key, status)
    VALUES (v_ll,'tenant',v_t1,'invoice_due_soon','invoice_due_soon:'||v_t1||':l1:2026-11','sent');
    fail:=fail+1; rep:=rep||'FAIL N5  the retry sent it a second time'||E'\n';
  EXCEPTION WHEN unique_violation THEN
    pass:=pass+1; rep:=rep||'PASS N5  once it succeeds it is final'||E'\n';
  END;

  -- ===== N6: the key is per landlord ======================================
  -- Wrapped, because a GLOBAL unique index makes this raise rather than
  -- return 0 rows. Without the handler that mutant aborts the whole suite
  -- before it can report, which reads as "the suite broke" rather than
  -- "one landlord's notice silenced another landlord's".
  BEGIN
    INSERT INTO public.notification_log
      (landlord_id, recipient_kind, kind, dedupe_key, subject_type)
    VALUES (v_ll2,'landlord','overdue_summary','invoice_late:'||v_t1||':l1:2026-11','portfolio');
    SELECT count(*) INTO v_n FROM public.notification_log WHERE landlord_id=v_ll2;
    IF v_n=1 THEN
      pass:=pass+1; rep:=rep||'PASS N6  one landlord''s log cannot block another''s'||E'\n';
    ELSE fail:=fail+1; rep:=rep||'FAIL N6  '||v_n||E'\n'; END IF;
  EXCEPTION WHEN unique_violation THEN
    fail:=fail+1;
    rep:=rep||'FAIL N6  another landlord''s identical key blocked this notice'||E'\n';
  END;

  -- ===== N7: a tenant notice must name the tenant =========================
  BEGIN
    INSERT INTO public.notification_log
      (landlord_id, recipient_kind, kind, dedupe_key)
    VALUES (v_ll,'tenant','invoice_late','orphan:1');
    fail:=fail+1; rep:=rep||'FAIL N7  a tenant notice with no tenant was accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS N7  a tenant notice must say which tenant'||E'\n';
  END;

  -- ===== N8: an unknown status is refused =================================
  BEGIN
    INSERT INTO public.notification_log
      (landlord_id, recipient_kind, kind, dedupe_key, status)
    VALUES (v_ll,'landlord','overdue_summary','bad:status','maybe');
    fail:=fail+1; rep:=rep||'FAIL N8  an unknown status was accepted'||E'\n';
  EXCEPTION WHEN check_violation THEN
    pass:=pass+1; rep:=rep||'PASS N8  status is constrained'||E'\n';
  END;

  -- ===== N9: THE CLIENT CANNOT WRITE THE LOG ==============================
  -- A forged 'sent' row silences a real notice for ever; a deleted row sends
  -- it again. Neither may be reachable from a browser.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.notification_log
      (landlord_id, recipient_kind, kind, dedupe_key)
    VALUES (v_ll,'landlord','overdue_summary','forged:1');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL N9  a client forged a sent notice'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS N9  a client cannot write the log (42501)'||E'\n';
  END;

  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    DELETE FROM public.notification_log WHERE landlord_id=v_ll;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL N10 a client deleted the log'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS N10 a client cannot erase the log (42501)'||E'\n';
  END;

  -- ===== N11: the landlord can READ their own ============================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.notification_log WHERE landlord_id=v_ll;
  RESET ROLE;
  IF v_n>0 THEN
    pass:=pass+1; rep:=rep||'PASS N11 the landlord can see what was sent for them'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL N11 the landlord sees none of their own'||E'\n'; END IF;

  -- ===== N12: and nobody else's =========================================
  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.notification_log WHERE landlord_id=v_ll;
  RESET ROLE;
  IF v_n=0 THEN
    pass:=pass+1; rep:=rep||'PASS N12 another landlord sees none of it'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL N12 another landlord read '||v_n||' notices'||E'\n'; END IF;

  -- ===== N13: anon reaches nothing =======================================
  BEGIN
    SET LOCAL ROLE anon;
    SELECT count(*) INTO v_n FROM public.notification_log;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL N13 anon read the notification log'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS N13 anon is refused (42501)'||E'\n';
  END;

  -- ===== N14: erasing a tenant erases their notification history =========
  -- The table holds no address, so the cascade is the whole of its erasure
  -- story. If this ever stopped cascading, the table would start retaining
  -- a record of messages to a person who asked to be forgotten.
  BEGIN
    DELETE FROM public.tenants WHERE id = v_t1;
    SELECT count(*) INTO v_n FROM public.notification_log WHERE tenant_id = v_t1;
    IF v_n=0 THEN
      pass:=pass+1; rep:=rep||'PASS N14 deleting a tenant removes their notice history'||E'\n';
    ELSE fail:=fail+1; rep:=rep||'FAIL N14 '||v_n||' notices survived the tenant'||E'\n'; END IF;
  EXCEPTION WHEN check_violation THEN
    -- Reached when the foreign key is SET NULL rather than CASCADE: the row
    -- is orphaned, nl_tenant_present refuses it, and the delete fails. The
    -- data model makes the bad state unreachable, which is the right
    -- outcome -- but it is reported here rather than aborting the suite.
    fail:=fail+1;
    rep:=rep||'FAIL N14 the notice does not follow the tenant; deleting them is blocked'||E'\n';
  END;

  -- ===== N15: the WRITE GRANT itself, not just the policy ================
  -- N9 and N10 pass with a table-level INSERT grant in place, because RLS
  -- has no INSERT policy and refuses it anyway with the same 42501. Two
  -- guards is the right design, but a test that cannot tell them apart
  -- reports "safe" while one of them is gone. This pins the grant.
  IF has_table_privilege('authenticated','public.notification_log','INSERT')
     OR has_table_privilege('authenticated','public.notification_log','UPDATE')
     OR has_table_privilege('authenticated','public.notification_log','DELETE') THEN
    fail:=fail+1;
    rep:=rep||'FAIL N15 authenticated holds a write grant on the log'||E'\n';
  ELSE
    pass:=pass+1;
    rep:=rep||'PASS N15 authenticated holds no write grant at all'||E'\n';
  END IF;

  RAISE EXCEPTION E'NOTIFICATION_LOG_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$NL$;
