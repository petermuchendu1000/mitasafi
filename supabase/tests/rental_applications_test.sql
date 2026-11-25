-- =============================================================================
-- Behavioural proof for 20260355000000_rental_applications.sql
-- =============================================================================
-- The migration's own guards prove the privileges are SHAPED right. They
-- cannot prove the table BEHAVES right, and the whole design of this feature
-- rests on behaviour that no privilege check can see:
--
--   * a landlord holds UPDATE on `status`, so privilege checks say they may
--     write it. Whether they can use that to withdraw on an applicant's
--     behalf, or to quietly edit the income they are judging, is a question
--     only a real UPDATE can answer.
--   * an applicant also holds UPDATE on `status`. Whether they can set it to
--     'approved' is the same kind of question.
--
-- One assertion in the migration already failed for real on first run — anon
-- held SELECT, because this project grants it on new public tables by default.
-- These tests exist because the next hole will be behavioural, not structural.
--
-- Fixtures are created inside the DO block and the closing RAISE EXCEPTION
-- rolls them back, which is how every other suite here works.
-- =============================================================================

DO $RA$
DECLARE
  pass int := 0;
  fail int := 0;
  rep  text := E'\n';
  v_ll     uuid := gen_random_uuid();   -- landlord who owns the listing
  v_ll2    uuid := gen_random_uuid();   -- an unrelated landlord
  v_app    uuid := gen_random_uuid();   -- applicant
  v_app2   uuid := gen_random_uuid();   -- another applicant
  v_live   uuid := gen_random_uuid();   -- an active listing
  v_draft  uuid := gen_random_uuid();   -- a draft listing (invisible)
  v_rented uuid := gen_random_uuid();   -- a let listing (visible, but closed)
  v_id     uuid;
  v_txt    text;
  v_num    numeric;
  v_ts     timestamptz;
  v_n      int;
BEGIN
  -- ---------- fixtures (as superuser) ----------
  INSERT INTO auth.users (id, email) VALUES
    (v_ll,  'ra-ll@test.invalid'),  (v_ll2, 'ra-ll2@test.invalid'),
    (v_app, 'ra-app@test.invalid'), (v_app2,'ra-app2@test.invalid');
  INSERT INTO public.profiles (id, email, full_name) VALUES
    (v_ll,  'ra-ll@test.invalid',  'Landlord'),
    (v_ll2, 'ra-ll2@test.invalid', 'Other Landlord'),
    (v_app, 'ra-app@test.invalid', 'Applicant'),
    (v_app2,'ra-app2@test.invalid','Second Applicant');
  INSERT INTO public.listings
    (id, landlord_id, title, description, property_type, address, area, rent_amount, status)
  VALUES
    (v_live,  v_ll, 'Live Flat',  'd', 'apartment', '1 Rd', 'Kilimani', 50000, 'active'),
    (v_draft, v_ll, 'Draft Flat', 'd', 'apartment', '2 Rd', 'Karen',    60000, 'draft'),
    (v_rented,v_ll, 'Let Flat',   'd', 'apartment', '3 Rd', 'Lavington',70000, 'rented');

  -- ===== A1: the landlord is taken from the listing, not from the client ====
  -- The client has no INSERT privilege on landlord_id, so the only way it can
  -- be populated is the trigger. If the trigger ever stopped reading the
  -- listing, this inserts NULL and the NOT NULL constraint fires.
  PERFORM set_config('request.jwt.claim.sub', v_app::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.rental_applications
    (listing_id, full_name, phone, monthly_income, household_size, message)
  VALUES (v_live, 'Applicant', '+254700000001', 90000, 2, 'I would like this flat')
  RETURNING id INTO v_id;
  RESET ROLE;

  SELECT landlord_id INTO v_id FROM public.rental_applications WHERE listing_id = v_live;
  IF v_id = v_ll THEN
    pass:=pass+1; rep:=rep||'PASS A1  landlord_id derived from the listing'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A1  landlord_id is '||coalesce(v_id::text,'NULL')||E'\n';
  END IF;

  -- ===== A2: it opens as 'new', with no decision and no notes ==============
  SELECT status INTO v_txt FROM public.rental_applications WHERE listing_id = v_live;
  SELECT decided_at INTO v_ts FROM public.rental_applications WHERE listing_id = v_live;
  IF v_txt = 'new' AND v_ts IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS A2  opens as new with no decision'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A2  opened as '||v_txt||E'\n';
  END IF;

  -- ===== A3: an anonymous caller cannot apply ==============================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', '', true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_live, 'Nobody', '+254700000999');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A3  an application was accepted with no identity'||E'\n';
  EXCEPTION WHEN not_null_violation OR check_violation OR insufficient_privilege THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A3  anonymous application refused'||E'\n';
  END;

  -- ===== A4: a draft listing is not even visible ===========================
  -- The trigger runs with the applicant's own rights, and listings_public_read
  -- exposes only active/paused/rented. So a draft comes back as "listing not
  -- found" (P0002) rather than "not accepting applications" — which is the
  -- better answer, because it does not confirm the listing exists.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_app::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_draft, 'Applicant', '+254700000001');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A4  applied to a draft listing'||E'\n';
  EXCEPTION WHEN no_data_found THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A4  a draft listing is invisible, not merely closed'||E'\n';
  END;

  -- ===== A4b: THE STATUS CHECK IS LOAD-BEARING =============================
  -- listings_public_read exposes 'paused' and 'rented' to every authenticated
  -- user, so RLS does NOT hide them. Without the status branch in the trigger
  -- you could apply to a flat that is already let.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_app::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_rented, 'Applicant', '+254700000001');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A4b applied to a listing that is already rented'||E'\n';
  EXCEPTION WHEN raise_exception THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A4b a visible but rented listing refuses applications'||E'\n';
  END;

  -- ===== A5: a second open application for the same listing is refused =====
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_app::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_live, 'Applicant', '+254700000001');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A5  the same person applied twice to one listing'||E'\n';
  EXCEPTION WHEN unique_violation THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A5  one open application per listing per person'||E'\n';
  END;

  -- ===== A6: THE ONE THAT MATTERS — a landlord cannot edit the income ======
  -- They hold UPDATE on status and landlord_notes. If the BEFORE UPDATE
  -- trigger stopped restoring the applicant's columns from OLD, a landlord
  -- could rewrite what they are judging and nothing else would notice.
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.rental_applications
     SET status = 'reviewing', landlord_notes = 'looks fine'
   WHERE listing_id = v_live;
  RESET ROLE;

  SELECT monthly_income INTO v_num FROM public.rental_applications WHERE listing_id = v_live;
  SELECT status INTO v_txt FROM public.rental_applications WHERE listing_id = v_live;
  IF v_num = 90000 AND v_txt = 'reviewing' THEN
    pass:=pass+1; rep:=rep||'PASS A6  landlord recorded a decision; income untouched'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A6  income is now '||coalesce(v_num::text,'NULL')||E'\n';
  END IF;

  -- ===== A6b: THE TRIGGER, TESTED WHERE IT ACTUALLY BITES ==================
  -- A6 above does NOT prove the trigger works. Removing `NEW := OLD` from the
  -- landlord branch left A6 green, because a landlord client holds no column
  -- privilege on monthly_income (A7) and so never attempts to write it. The
  -- trigger is the layer that survives a privilege MISTAKE — a future GRANT, or
  -- a server path holding the service key while carrying the user's JWT. So it
  -- has to be tested from a caller that does hold the privilege.
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE service_role;
  UPDATE public.rental_applications
     SET monthly_income = 1, full_name = 'Rewritten', status = 'reviewing'
   WHERE listing_id = v_live;
  RESET ROLE;
  SELECT monthly_income INTO v_num FROM public.rental_applications WHERE listing_id = v_live;
  SELECT full_name INTO v_txt FROM public.rental_applications WHERE listing_id = v_live;
  IF v_num = 90000 AND v_txt = 'Applicant' THEN
    pass:=pass+1; rep:=rep||'PASS A6b the trigger refuses the rewrite even with full privileges'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A6b income='||coalesce(v_num::text,'NULL')||
                            ' name='||coalesce(v_txt,'NULL')||E'\n';
  END IF;

  -- ===== A7: the landlord has no column privilege on the stated facts ======
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.rental_applications SET monthly_income = 1 WHERE false;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A7  monthly_income is client-writable'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A7  monthly_income write refused (42501)'||E'\n';
  END;

  -- ===== A8: an applicant cannot approve themselves ========================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_app::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.rental_applications SET status = 'approved' WHERE listing_id = v_live;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A8  an applicant approved their own application'||E'\n';
  EXCEPTION WHEN invalid_authorization_specification THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A8  an applicant cannot set their own outcome'||E'\n';
  END;

  -- ===== A9: a landlord cannot withdraw on the applicant's behalf ==========
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.rental_applications SET status = 'withdrawn' WHERE listing_id = v_live;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A9  a landlord withdrew someone else''s application'||E'\n';
  EXCEPTION WHEN invalid_authorization_specification THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A9  only the applicant may withdraw'||E'\n';
  END;

  -- ===== A10: approving stamps decided_at ==================================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.rental_applications SET status = 'approved' WHERE listing_id = v_live;
  RESET ROLE;
  SELECT decided_at INTO v_ts FROM public.rental_applications WHERE listing_id = v_live;
  IF v_ts IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS A10 a decision is time-stamped'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A10 decided_at was not set on approval'||E'\n';
  END IF;

  -- ===== A11: the applicant may withdraw, and only that changes ============
  PERFORM set_config('request.jwt.claim.sub', v_app::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.rental_applications
     SET status = 'withdrawn', landlord_notes = 'I rewrote the landlord note'
   WHERE listing_id = v_live;
  RESET ROLE;
  SELECT landlord_notes INTO v_txt FROM public.rental_applications WHERE listing_id = v_live;
  IF v_txt = 'looks fine' THEN
    pass:=pass+1; rep:=rep||'PASS A11 withdrawing did not rewrite the landlord''s note'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A11 the note is now: '||coalesce(v_txt,'NULL')||E'\n';
  END IF;
  SELECT status INTO v_txt FROM public.rental_applications WHERE listing_id = v_live;
  IF v_txt = 'withdrawn' THEN
    pass:=pass+1; rep:=rep||'PASS A11b the withdrawal took effect'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A11b status is '||v_txt||E'\n';
  END IF;

  -- ===== A12: a withdrawn application frees the slot to apply again ========
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_app::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_live, 'Applicant', '+254700000001');
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A12 a withdrawn application does not block reapplying'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A12 could not reapply after withdrawing: '||SQLERRM||E'\n';
  END;

  -- ===== A13: another landlord sees nothing (RLS rows) =====================
  PERFORM set_config('request.jwt.claim.sub', v_ll2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.rental_applications;
  RESET ROLE;
  IF v_n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS A13 an unrelated landlord sees no applications'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A13 an unrelated landlord sees '||v_n||' application(s)'||E'\n';
  END IF;

  -- ===== A14: another applicant sees nothing ===============================
  PERFORM set_config('request.jwt.claim.sub', v_app2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.rental_applications;
  RESET ROLE;
  IF v_n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS A14 one applicant cannot read another''s application'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A14 a stranger sees '||v_n||' application(s)'||E'\n';
  END IF;

  -- ===== A15: the owning landlord DOES see it (or the feature is dead) =====
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.rental_applications;
  RESET ROLE;
  IF v_n = 2 THEN
    pass:=pass+1; rep:=rep||'PASS A15 the owning landlord sees both applications'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL A15 the owning landlord sees '||v_n||', expected 2'||E'\n';
  END IF;

  -- ===== A16: nobody deletes an application ================================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    DELETE FROM public.rental_applications WHERE false;
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A16 a client role can delete applications'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A16 delete refused for client roles'||E'\n';
  END;

  -- ===== A17: a landlord cannot apply to their own listing =================
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.rental_applications (listing_id, full_name, phone)
    VALUES (v_live, 'Landlord', '+254700000002');
    RESET ROLE;
    fail:=fail+1; rep:=rep||'FAIL A17 a landlord applied to their own listing'||E'\n';
  EXCEPTION WHEN check_violation OR raise_exception
                 OR invalid_authorization_specification THEN
    RESET ROLE;
    pass:=pass+1; rep:=rep||'PASS A17 a landlord cannot apply to their own listing'||E'\n';
  END;

  RAISE EXCEPTION E'RENTAL_APPLICATIONS_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$RA$;
