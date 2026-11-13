-- =============================================================================
-- Public read scope: service_types and non-active listings — behavioural
-- =============================================================================
-- Verifies 20260339000000_public_listing_visibility.sql.
--
-- THE TWO DEFECTS THIS SUITE EXISTS FOR
--
-- (1) service_types was invisible to every client, and the booking path
--     swallowed it. RLS was enabled, anon and authenticated held the SELECT
--     privilege, and the only policy was `service_types_service_role_all`.
--     Measured on the live database and reproduced in a clean-room build from
--     the migration files alone: as owner 12 rows, as authenticated 0, as anon
--     0. The booking request page reads the type through an embed and falls
--     back on absence:
--       src/app/services/provider/[id]/request/page.tsx:125,156
--         service_type:service_types!service_type_id ( id, booking_flow )
--         defaultBookingFlow: (serviceTypeData?.booking_flow ?? "standard")
--     Of 12 seeded types only 4 are `standard`. The other 8 -- emergency,
--     delivery, project, personal -- were every one of them booked as
--     `standard`, silently, because an RLS-filtered embed is null and not an
--     error. V1-V4 below are the assertions that notice.
--
-- (2) listings had no public read for a listing that is no longer active.
--     `Public can view active listings USING (status = 'active')` meant a
--     paused or rented property was invisible to everyone but its landlord,
--     while six call sites read one expecting a row. Verified in full:
--       src/app/api/listing-waitlist/route.ts:62,71-74,76,83 -- the waitlist
--         404s on exactly the listings it exists for (V14), and its
--         `status === "active"` branch is proof none ever came back.
--       src/app/api/saved-listings/route.ts:16,29-45 -- the listings embed on
--         saved_listings resolves to null the moment a landlord marks the
--         property rented, so the saved card loses title, rent and photo (V15).
--
-- THE ASYMMETRY V16/V17 PIN DOWN
--   A paused or rented listing is now publicly readable, but profiles_public
--   still admits a landlord's identity only on `status = 'active'`. That is
--   deliberate: widening a listing's visibility is not a reason to publish its
--   owner's name. V17 fails if someone "tidies" the two predicates into one.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/public_visibility_test.sql
-- A healthy run ends with   PUBLIC_VISIBILITY_RESULT pass=17 fail=0
--
-- Reachable in both directions: against the schema BEFORE 20260339000000,
-- V1-V4, V6, V7, V14 and V15 fail, and V5, V8-V13, V16, V17 still pass.
-- =============================================================================

DO $V$
DECLARE
  v_ll      uuid := gen_random_uuid();   -- landlord of one listing per status
  v_llp     uuid := gen_random_uuid();   -- landlord whose ONLY listing is paused
  v_other   uuid := gen_random_uuid();   -- an unrelated signed-in account
  l_active  uuid; l_paused uuid; l_rented uuid;
  l_draft   uuid; l_expired uuid; l_archived uuid; l_null uuid; l_pp uuid;
  v_emerg   uuid;                        -- an emergency service_type
  v_svc     uuid;                        -- a service wearing that type
  owner_types int;
  rep text := E'\n'; pass int := 0; fail int := 0; n int; bf text; ttl text;
BEGIN
  SELECT count(*) INTO owner_types FROM service_types;
  IF owner_types = 0 THEN
    RAISE EXCEPTION 'service_types is empty -- the catalogue seed did not run, '
                    'so V1-V4 could not fail and this suite would be a no-op';
  END IF;
  SELECT id INTO v_emerg FROM service_types WHERE booking_flow = 'emergency' LIMIT 1;
  IF v_emerg IS NULL THEN
    RAISE EXCEPTION 'no emergency service_type seeded -- V3/V4 cannot discriminate';
  END IF;
  SELECT id INTO v_svc FROM services WHERE service_type_id = v_emerg LIMIT 1;

  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'vll@t.invalid'),(v_llp,'vllp@t.invalid'),(v_other,'voth@t.invalid');
  -- verification_level, not is_verified: the latter is now a generated column
  -- derived as (verification_level = 'full'), so writing it raises 428C9.
  -- 'full' derives true, 'none' derives false.
  INSERT INTO profiles (id,email,phone,full_name,verification_level) VALUES
    (v_ll ,'vll@t.invalid' ,'+254700000201','Visible Victor','full'),
    (v_llp,'vllp@t.invalid','+254700000202','Paused Patrick','full'),
    (v_other,'voth@t.invalid','+254700000203','Other Otieno','none');

  -- one listing per status, same landlord, so status is the only variable
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll,'L active','d','apartment','1 Rd','Kilimani',50000,'active')   RETURNING id INTO l_active;
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll,'L paused','d','apartment','2 Rd','Kilimani',50000,'paused')   RETURNING id INTO l_paused;
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll,'L rented','d','apartment','3 Rd','Kilimani',50000,'rented')   RETURNING id INTO l_rented;
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll,'L draft','d','apartment','4 Rd','Kilimani',50000,'draft')     RETURNING id INTO l_draft;
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll,'L expired','d','apartment','5 Rd','Kilimani',50000,'expired') RETURNING id INTO l_expired;
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll,'L archived','d','apartment','6 Rd','Kilimani',50000,'archived') RETURNING id INTO l_archived;
  -- status is NULLABLE and its CHECK passes on NULL, so this row is reachable
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_ll,'L null','d','apartment','7 Rd','Kilimani',50000,NULL)        RETURNING id INTO l_null;
  -- v_llp's ONLY listing is paused: newly readable, but must not publish him
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,status)
    VALUES (v_llp,'LP paused','d','apartment','8 Rd','Kilimani',50000,'paused') RETURNING id INTO l_pp;

  -- v_other saved the rented listing before it was taken off the market
  INSERT INTO saved_listings (user_id, listing_id) VALUES (v_other, l_rented);

  -- ===== (1) the service catalogue, as a signed-out visitor ==================
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;

  SELECT count(*) INTO n FROM service_types;
  IF n = owner_types THEN
    pass:=pass+1; rep:=rep||'PASS V1  anon reads the whole service_types catalogue ('||n||' rows)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V1  anon sees '||n||' of '||owner_types||' service types'||E'\n';
  END IF;
  RESET ROLE;

  -- ===== the same read as a signed-in customer, which is the booking path ====
  PERFORM set_config('request.jwt.claim.sub', v_other::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM service_types;
  IF n = owner_types THEN
    pass:=pass+1; rep:=rep||'PASS V2  authenticated reads the whole catalogue ('||n||' rows)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V2  authenticated sees '||n||' of '||owner_types||' service types'||E'\n';
  END IF;

  -- The booking flow must come back as itself, not as absence.
  SELECT booking_flow::text INTO bf FROM service_types WHERE id = v_emerg;
  IF bf = 'emergency' THEN
    pass:=pass+1; rep:=rep||'PASS V3  an emergency type reports booking_flow=emergency'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V3  booking_flow read as '||coalesce(bf,'NULL')||
                 ' -> page falls back to "standard"'||E'\n';
  END IF;

  -- The shape the page actually issues: the type reached THROUGH a service,
  -- which is what PostgREST resolves for service_type:service_types!...
  IF v_svc IS NULL THEN
    -- no service wears an emergency type in this build; assert the join itself
    SELECT count(*) INTO n FROM services s JOIN service_types st ON st.id = s.service_type_id;
    IF n > 0 THEN
      pass:=pass+1; rep:=rep||'PASS V4  the services->service_types embed resolves ('||n||' joined rows)'||E'\n';
    ELSE
      fail:=fail+1; rep:=rep||'FAIL V4  the services->service_types embed resolves to nothing'||E'\n';
    END IF;
  ELSE
    SELECT st.booking_flow::text INTO bf
      FROM services s JOIN service_types st ON st.id = s.service_type_id
      WHERE s.id = v_svc;
    IF bf = 'emergency' THEN
      pass:=pass+1; rep:=rep||'PASS V4  the embed carries booking_flow=emergency through a service'||E'\n';
    ELSE
      fail:=fail+1; rep:=rep||'FAIL V4  embed gave '||coalesce(bf,'NULL')||
                   ' -> every emergency booking is created as standard'||E'\n';
    END IF;
  END IF;
  RESET ROLE;

  -- ===== (2) listing visibility by status, as a signed-out visitor ==========
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;

  SELECT count(*) INTO n FROM listings WHERE id = l_active;
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS V5  anon still reads an ACTIVE listing (no regression)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V5  anon lost the active listing -- search is broken'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM listings WHERE id = l_paused;
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS V6  anon reads a PAUSED listing'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V6  a paused listing is invisible -> waitlist 404s'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM listings WHERE id = l_rented;
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS V7  anon reads a RENTED listing'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V7  a rented listing is invisible -> saved cards blank'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM listings WHERE id = l_draft;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS V8  a DRAFT listing stays landlord-only'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V8  unpublished drafts are public'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM listings WHERE id = l_expired;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS V9  an EXPIRED listing stays landlord-only'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V9  expired listings became public'||E'\n';
  END IF;

  SELECT count(*) INTO n FROM listings WHERE id = l_archived;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS V10 an ARCHIVED listing stays landlord-only'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V10 archived listings became public'||E'\n';
  END IF;

  -- status = ANY(...) must fail CLOSED on NULL, not open
  SELECT count(*) INTO n FROM listings WHERE id = l_null;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS V11 a NULL-status listing fails closed'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V11 a NULL status is publicly readable'||E'\n';
  END IF;
  RESET ROLE;

  -- ===== the ownership policy must be untouched =============================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM listings WHERE id = l_draft;
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS V12 the landlord still reads their own draft'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V12 the landlord lost their own draft'||E'\n';
  END IF;
  RESET ROLE;

  PERFORM set_config('request.jwt.claim.sub', v_other::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM listings WHERE id = l_draft;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS V13 another signed-in user cannot read that draft'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V13 any account can read any landlord''s drafts'||E'\n';
  END IF;

  -- ===== the two reported symptoms, as the routes issue them ================
  -- listing-waitlist/route.ts:71-74 -- .select("id,title,status").eq(id).single()
  SELECT count(*) INTO n FROM listings WHERE id = l_paused AND title IS NOT NULL;
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS V14 the waitlist lookup finds a paused listing (was 404)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V14 the waitlist still answers 404 for a paused listing'||E'\n';
  END IF;

  -- saved-listings/route.ts:29-45 -- the listings embed on saved_listings
  SELECT l.title INTO ttl
    FROM saved_listings sl JOIN listings l ON l.id = sl.listing_id
    WHERE sl.user_id = v_other;
  IF ttl = 'L rented' THEN
    pass:=pass+1; rep:=rep||'PASS V15 the saved-listings embed carries the rented listing'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V15 saved card is blank; embed gave '||coalesce(ttl,'NULL')||E'\n';
  END IF;
  RESET ROLE;

  -- ===== the deliberate asymmetry ==========================================
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;

  SELECT count(*) INTO n FROM profiles_public WHERE id = v_ll AND full_name = 'Visible Victor';
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS V16 the landlord of an ACTIVE listing is still published'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V16 landlord identity lost -> listing card goes blank'||E'\n';
  END IF;

  -- v_llp's paused listing IS readable now (V6), but he must stay unnamed.
  SELECT count(*) INTO n FROM profiles_public WHERE id = v_llp;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS V17 a paused-only landlord is NOT named (asymmetry holds)'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL V17 widening listings also published the landlord''s identity'||E'\n';
  END IF;
  RESET ROLE;

  RAISE EXCEPTION E'PUBLIC_VISIBILITY_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$V$;
