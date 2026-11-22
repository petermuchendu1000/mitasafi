-- =============================================================================
-- Profile read scope — behavioural verification
-- =============================================================================
-- Verifies 20260335000000_scope_profile_reads.sql.
--
-- THE DEFECT THIS SUITE EXISTS FOR
--   profiles carried `profiles_public_read  FOR SELECT TO authenticated
--   USING (true)`. RLS is row-level only: it cannot restrict columns. So any
--   signed-in account could read EVERY column of EVERY profile -- email, phone
--   and the metadata blob -- for every other user on the platform. One account,
--   created in seconds, and `select email, phone from profiles` returns the
--   entire user table. The permissive policy also SUBSUMED the ownership
--   policy: as `authenticated`, EXPLAIN emitted no Filter line at all.
--
-- WHY A VIEW RATHER THAN A NARROWER POLICY
--   The product genuinely needs cross-user NAMES: review authors on public
--   provider pages, and customer names on a provider's bookings list. A policy
--   cannot grant "name but not email" because policies gate rows, not columns.
--   So the blanket policy is dropped and the three legitimate reads go through
--   `profiles_public`, which projects three columns and nothing else.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/profile_read_scope_test.sql
-- A healthy run ends with   PROFILE_READ_RESULT pass=21 fail=0
--
-- Every assertion below is reachable in both directions: run it against the
-- schema BEFORE the migration and P1-P3, P6-P11 and P13-P17 fail.
-- =============================================================================

DO $P$
DECLARE
  v_cust    uuid := gen_random_uuid();   -- a plain customer, nothing public
  v_pu      uuid := gen_random_uuid();   -- owns provider sp1, has v_cust's booking
  v_pu2     uuid := gen_random_uuid();   -- owns provider sp2, unrelated to v_cust
  v_rev     uuid := gen_random_uuid();   -- author of a VISIBLE review
  v_hid     uuid := gen_random_uuid();   -- author of a HIDDEN review only
  v_ll1     uuid := gen_random_uuid();   -- landlord with a PUBLIC listing
  v_ll2     uuid := gen_random_uuid();   -- landlord with only a draft listing
  v_sp1 uuid; v_sp2 uuid; v_svc uuid; v_stype uuid; b1 uuid; b2 uuid;
  rep text := E'\n'; pass int := 0; fail int := 0; n int; cols text;
  t0 timestamptz := date_trunc('hour', now() + interval '5 days');
BEGIN
  SELECT id INTO v_svc   FROM services      LIMIT 1;
  SELECT id INTO v_stype FROM service_types  LIMIT 1;

  INSERT INTO auth.users (id,email) VALUES
    (v_cust,'cust@t.invalid'),(v_pu,'pu@t.invalid'),(v_pu2,'pu2@t.invalid'),
    (v_rev,'rev@t.invalid'),(v_hid,'hid@t.invalid');
  INSERT INTO profiles (id,email,phone,full_name,metadata) VALUES
    (v_cust,'cust@t.invalid','+254700000101','Cust Omondi','{"secret":"x"}'::jsonb),
    (v_pu  ,'pu@t.invalid'  ,'+254700000102','Prov One'   ,'{}'::jsonb),
    (v_pu2 ,'pu2@t.invalid' ,'+254700000103','Prov Two'   ,'{}'::jsonb),
    (v_rev ,'rev@t.invalid' ,'+254700000104','Revi Wanjiku','{}'::jsonb),
    (v_hid ,'hid@t.invalid' ,'+254700000105','Hidden Hassan','{}'::jsonb);

  INSERT INTO service_providers (user_id,business_name,phone,is_active,account_status)
    VALUES (v_pu ,'SP One','+254700000102',true,'active') RETURNING id INTO v_sp1;
  INSERT INTO service_providers (user_id,business_name,phone,is_active,account_status)
    VALUES (v_pu2,'SP Two','+254700000103',true,'active') RETURNING id INTO v_sp2;

  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,
      booking_flow_type,status,estimated_duration_minutes,scheduled_start,currency)
    VALUES (v_cust,v_sp1,v_svc,v_stype,'standard','submitted',60,t0,'KES')
    RETURNING id INTO b1;

  -- review_one_per_booking is UNIQUE, so the hidden review needs its own booking.
  INSERT INTO bookings (customer_id,provider_id,service_id,service_type_id,
      booking_flow_type,status,estimated_duration_minutes,scheduled_start,currency)
    VALUES (v_hid,v_sp1,v_svc,v_stype,'standard','submitted',60,t0 + interval '1 day','KES')
    RETURNING id INTO b2;

  INSERT INTO reviews (booking_id,reviewer_id,provider_id,service_id,rating,is_hidden)
    VALUES (b1,v_rev,v_sp1,v_svc,'5'::review_rating,false);
  -- v_hid authors ONLY a hidden review, so hiding it must hide the byline.
  INSERT INTO reviews (booking_id,reviewer_id,provider_id,service_id,rating,is_hidden)
    VALUES (b2,v_hid,v_sp1,v_svc,'1'::review_rating,true);

  -- Landlord fixtures for the fifth branch added by 20260338000000.
  -- v_ll1 has a PUBLIC listing (status='active'); v_ll2 has only a draft.
  INSERT INTO auth.users (id,email) VALUES (v_ll1,'ll1@t.invalid'),(v_ll2,'ll2@t.invalid');
  -- verification_level, not is_verified: 20260344000000 made
  -- profiles.is_verified a STORED generated column, (verification_level =
  -- 'full'), so writing it raises 428C9. 'full' is the level that derives
  -- is_verified = true, which is what P20 below asserts on.
  INSERT INTO profiles (id,email,phone,full_name,verification_level) VALUES
    (v_ll1,'ll1@t.invalid','+254700000106','Landlord Lucy','full'),
    (v_ll2,'ll2@t.invalid','+254700000107','Draft Dennis','full');
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll1,'Active flat','desc','apartment','1 Rd','Kilimani',50000,'active');
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll2,'Draft flat','desc','apartment','2 Rd','Kilimani',50000,'draft');

  -- ===== THE LIVE DEFECT: one account reads every user's contact details =====
  PERFORM set_config('request.jwt.claim.sub', v_cust::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM profiles WHERE id = v_pu AND email IS NOT NULL;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P1  another user''s email is not readable'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P1  ANY signed-in account can read every email'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM profiles WHERE id = v_pu AND phone IS NOT NULL;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P2  another user''s phone is not readable'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P2  ANY signed-in account can read every phone'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM profiles WHERE id = v_pu AND metadata IS NOT NULL;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P3  another user''s metadata blob is not readable'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P3  the metadata blob is readable account-wide'||E'\n';
  END IF;

  -- ===== own row must still work: this is what a narrowing fix can break =====
  SELECT count(*) INTO n FROM profiles
    WHERE id = v_cust AND email IS NOT NULL AND phone IS NOT NULL;
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS P4  a user still reads their OWN row in full'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P4  own-row read broke -- settings/dashboard are dead'||E'\n';
  END IF;

  -- ===== the public projection, as a signed-in viewer =====
  SELECT count(*) INTO n FROM profiles_public WHERE id = v_pu AND full_name = 'Prov One';
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS P6  a provider''s name is readable via profiles_public'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P6  provider names unreadable -- provider pages break'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM profiles_public WHERE id = v_rev AND full_name = 'Revi Wanjiku';
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS P8  a visible review author''s name is readable'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P8  review author names unreadable -- reviews lose bylines'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM profiles_public WHERE id = v_hid;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P17 a HIDDEN review does not make its author public'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P17 hiding a review still exposes its author'||E'\n';
  END IF;

  -- v_cust is a plain customer. v_cust is the viewer here, so their own row is
  -- admissible; the interesting case is the OTHER direction, asserted in P11.
  RESET ROLE;

  -- ===== the provider who holds the booking may read that customer's name ====
  PERFORM set_config('request.jwt.claim.sub', v_pu::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM profiles_public WHERE id = v_cust AND full_name = 'Cust Omondi';
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS P10 the booking''s provider reads their customer''s name'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P10 provider cannot see the customer name on their own booking'||E'\n';
  END IF;
  -- ...and may NOT get that customer's contact details along with the name.
  -- Dynamic, so a view that grew an email column fails this instead of
  -- refusing to parse the suite.
  BEGIN
    EXECUTE 'SELECT count(*) FROM profiles_public WHERE email IS NOT NULL' INTO n;
    fail:=fail+1; rep:=rep||'FAIL P19 profiles_public exposes an email column'||E'\n';
  EXCEPTION WHEN undefined_column THEN
    pass:=pass+1; rep:=rep||'PASS P19 profiles_public has no email column to read'||E'\n';
  END;
  RESET ROLE;

  -- ===== an unrelated provider may NOT: no blanket name enumeration =========
  PERFORM set_config('request.jwt.claim.sub', v_pu2::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM profiles_public WHERE id = v_cust;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P11 an unrelated account cannot read a customer''s name'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P11 profiles_public enumerates every user -- no better than before'||E'\n';
  END IF;

  -- ===== the view must be read-only. A single-table view is AUTO-UPDATABLE, =
  -- ===== and it runs as its owner, so a write through it would bypass RLS. ==
  BEGIN
    UPDATE profiles_public SET full_name = 'pwned' WHERE id = v_pu;
    fail:=fail+1; rep:=rep||'FAIL P13 UPDATE through profiles_public succeeded -- RLS bypass'||E'\n';
  EXCEPTION
    WHEN insufficient_privilege THEN
      pass:=pass+1; rep:=rep||'PASS P13 UPDATE through profiles_public refused'||E'\n';
    WHEN others THEN
      IF SQLSTATE IN ('55000','0A000') THEN
        pass:=pass+1; rep:=rep||'PASS P13 UPDATE through profiles_public refused ('||SQLSTATE||')'||E'\n';
      ELSE
        fail:=fail+1; rep:=rep||'FAIL P13 UPDATE refused for an unexpected reason '||SQLSTATE||E'\n';
      END IF;
  END;

  BEGIN
    INSERT INTO profiles_public (id, full_name) VALUES (gen_random_uuid(), 'x');
    fail:=fail+1; rep:=rep||'FAIL P14 INSERT through profiles_public succeeded'||E'\n';
  EXCEPTION
    WHEN insufficient_privilege THEN
      pass:=pass+1; rep:=rep||'PASS P14 INSERT through profiles_public refused'||E'\n';
    WHEN others THEN
      IF SQLSTATE IN ('55000','0A000','23503') THEN
        pass:=pass+1; rep:=rep||'PASS P14 INSERT through profiles_public refused ('||SQLSTATE||')'||E'\n';
      ELSE
        fail:=fail+1; rep:=rep||'FAIL P14 INSERT refused for an unexpected reason '||SQLSTATE||E'\n';
      END IF;
  END;

  BEGIN
    DELETE FROM profiles_public WHERE id = v_pu;
    fail:=fail+1; rep:=rep||'FAIL P15 DELETE through profiles_public succeeded'||E'\n';
  EXCEPTION
    WHEN insufficient_privilege THEN
      pass:=pass+1; rep:=rep||'PASS P15 DELETE through profiles_public refused'||E'\n';
    WHEN others THEN
      IF SQLSTATE IN ('55000','0A000') THEN
        pass:=pass+1; rep:=rep||'PASS P15 DELETE through profiles_public refused ('||SQLSTATE||')'||E'\n';
      ELSE
        fail:=fail+1; rep:=rep||'FAIL P15 DELETE refused for an unexpected reason '||SQLSTATE||E'\n';
      END IF;
  END;
  RESET ROLE;

  -- ===== anon: the public provider page is served to signed-out visitors =====
  -- Under the OLD policy this was already broken: profiles_public_read was
  -- TO authenticated, so a signed-out visitor saw no review bylines at all.
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;

  SELECT count(*) INTO n FROM profiles;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P5  anon reads no profiles row directly'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P5  anon can read '||n||' profiles rows'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM profiles_public WHERE id = v_rev AND full_name = 'Revi Wanjiku';
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS P7  anon reads a review author''s name (public page works)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P7  anon cannot read review authors -- public page has no bylines'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM profiles_public WHERE id = v_cust;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P12 anon cannot read a plain customer''s name'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P12 anon can enumerate customer names'||E'\n';
  END IF;

  -- ===== the landlord branch (20260338000000) =====
  -- A listing page is public, so a signed-out visitor must get the landlord's
  -- identity, including the verified badge the owner has decided is public.
  SELECT count(*) INTO n FROM profiles_public
    WHERE id = v_ll1 AND full_name = 'Landlord Lucy' AND is_verified = true;
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS P20 anon reads the landlord of an ACTIVE listing, with is_verified'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P20 landlord identity missing -> the listing card goes blank'||E'\n';
  END IF;

  -- ...and only where the listing is ACTIVE. A draft must not publish its
  -- landlord. Note this is narrower than listings_public_read, which since
  -- 20260339000000 also admits paused and rented: the listing is readable,
  -- the owner's name is not. V17 of public_visibility_test.sql pins that down.
  SELECT count(*) INTO n FROM profiles_public WHERE id = v_ll2;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P21 a draft-only landlord is NOT exposed'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P21 an unpublished listing still exposes its landlord'||E'\n';
  END IF;
  RESET ROLE;

  -- ===== catalog assertions =================================================
  SELECT string_agg(column_name, ',' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles_public';
  IF cols = 'id,full_name,avatar_url,is_verified' THEN
    pass:=pass+1; rep:=rep||'PASS P9  profiles_public projects exactly id,full_name,avatar_url,is_verified'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P9  profiles_public columns are ['||coalesce(cols,'<missing>')||']'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_public_read';
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS P16 the blanket profiles_public_read policy is gone'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P16 profiles_public_read USING(true) is still installed'||E'\n';
  END IF;

  -- The ownership policy must survive. If a later migration drops it while the
  -- blanket policy is gone, every user loses their own profile -- and P4 above
  -- would be the only thing that notices.
  SELECT count(*) INTO n FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND cmd='SELECT'
      AND qual LIKE '%auth.uid()%';
  IF n >= 1 THEN
    pass:=pass+1; rep:=rep||'PASS P18 an ownership-scoped SELECT policy is still present'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL P18 no ownership SELECT policy left on profiles'||E'\n';
  END IF;

  RAISE EXCEPTION E'PROFILE_READ_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$P$;
