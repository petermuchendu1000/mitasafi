-- =============================================================================
-- hide_exact_address — behavioural verification
-- =============================================================================
-- Verifies 20260340000000_enforce_hide_exact_address.sql.
--
-- THE DEFECT THIS SUITE EXISTS FOR
--   `hide_exact_address` promised, in the product's own words, that a
--   landlord's exact location was withheld -- ListingMap.tsx:209-214 renders an
--   "Approximate" badge and :281-286 renders "Exact address shared after
--   inquiry". It was enforced at no layer whatsoever:
--     * no view, no policy and no non-trigger function in `public` referenced
--       the column, while anon AND authenticated both held column-level SELECT
--       on address, latitude and longitude. RLS is row-level and cannot
--       restrict columns.
--     * src/lib/supabase/client.ts:17-18 uses NEXT_PUBLIC_SUPABASE_URL and
--       NEXT_PUBLIC_SUPABASE_ANON_KEY, which Next inlines into the browser
--       bundle, so `GET /rest/v1/listings?select=address,latitude,longitude`
--       answered for a signed-out stranger with no app code in the path.
--     * ListingDetailClient.tsx:372-379 passes all four fields as props to a
--       "use client" component, so they were serialised into the RSC payload
--       for every viewer regardless of the flag.
--     * ListingMap.tsx:86,112 centre the "approximate" circle on the EXACT
--       coordinates, and its "circle-radius": 80 is pixels, not metres.
--     * ListingMap.tsx:243-252 render a Directions link unconditionally,
--       outside the privacy branch, with the exact coordinates in the URL.
--
-- L10-L13 are the assertions that would have caught it: they go straight at
-- the table as anon and as a signed-in non-owner, which is what an attacker
-- does, rather than through any application code.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/location_privacy_test.sql
-- A healthy run ends with   LOCATION_PRIVACY_RESULT pass=21 fail=0
--
-- Reachable in both directions: against the schema BEFORE 20260340000000 the
-- view does not exist, so L1-L9 and L16-L21 error out, and L10-L13 fail
-- because the table hands the columns over.
-- =============================================================================

DO $L$
DECLARE
  v_ll      uuid := gen_random_uuid();   -- landlord, owns everything below
  v_other   uuid := gen_random_uuid();   -- a signed-in stranger
  l_hid     uuid;                        -- hide_exact_address = true
  l_vis     uuid;                        -- hide_exact_address = false
  l_nul     uuid;                        -- hide_exact_address IS NULL
  l_draft   uuid;                        -- owner-only row
  -- Nairobi coordinates, 8 d.p. to match numeric(10,8)/numeric(11,8)
  real_lat  numeric := -1.29210000;
  real_lon  numeric := 36.82190000;
  GRID      numeric := 0.005;            -- must equal the constant in the view
  UI_RADIUS numeric := 1528;             -- metres the UI's 80px circle covers
  rep text := E'\n'; pass int := 0; fail int := 0;
  a text; bn text; la numeric; lo numeric; n int; d_m numeric;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_ll,'llgeo@t.invalid'),(v_other,'othgeo@t.invalid');
  INSERT INTO profiles (id,email,full_name) VALUES
    (v_ll,'llgeo@t.invalid','Geo Landlord'),(v_other,'othgeo@t.invalid','Nosy Neighbour');

  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,
                        status,building_name,latitude,longitude,hide_exact_address)
    VALUES (v_ll,'Hidden','d','apartment','House 4, Mandera Rd','Kilimani',50000,
            'active','Pine Tree Apartments',real_lat,real_lon,true) RETURNING id INTO l_hid;
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,
                        status,building_name,latitude,longitude,hide_exact_address)
    VALUES (v_ll,'Shown','d','apartment','1 Ngong Rd','Kilimani',50000,
            'active','Open Court',real_lat,real_lon,false) RETURNING id INTO l_vis;
  -- the column is nullable and defaults to false; the client's check is
  -- `!hideExactAddress`, so NULL must behave as NOT hidden
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,
                        status,building_name,latitude,longitude,hide_exact_address)
    VALUES (v_ll,'Nullflag','d','apartment','2 Ngong Rd','Kilimani',50000,
            'active','Null Court',real_lat,real_lon,NULL) RETURNING id INTO l_nul;
  INSERT INTO listings (landlord_id,title,description,property_type,address,area,rent_amount,
                        status,building_name,latitude,longitude,hide_exact_address)
    VALUES (v_ll,'Draft','d','apartment','3 Ngong Rd','Kilimani',50000,
            'draft','Draft Court',real_lat,real_lon,true) RETURNING id INTO l_draft;

  -- ===== a signed-out visitor, through the view =============================
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;

  SELECT address, building_name, latitude, longitude INTO a, bn, la, lo
    FROM listings_public WHERE id = l_hid;

  IF a IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS L1  hidden listing: address is withheld'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L1  hidden listing published its address: '||a||E'\n';
  END IF;

  IF bn IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS L2  hidden listing: building_name is withheld'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L2  building_name bypasses the flag: '||bn||E'\n';
  END IF;

  IF la = round(real_lat / GRID) * GRID AND la <> real_lat THEN
    pass:=pass+1; rep:=rep||'PASS L3  latitude snapped to the grid ('||la||' not '||real_lat||')'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L3  latitude is '||coalesce(la::text,'NULL')||
                 ', expected '||(round(real_lat / GRID) * GRID)||E'\n';
  END IF;

  IF lo = round(real_lon / GRID) * GRID AND lo <> real_lon THEN
    pass:=pass+1; rep:=rep||'PASS L4  longitude snapped to the grid ('||lo||' not '||real_lon||')'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L4  longitude is '||coalesce(lo::text,'NULL')||
                 ', expected '||(round(real_lon / GRID) * GRID)||E'\n';
  END IF;

  -- The UI draws an 80px circle at zoom 13, ~1528 m, centred on what it is
  -- given. The snapped point must be close enough that the real location is
  -- still inside that circle, or the map misleads in the other direction.
  d_m := sqrt(
           power((la - real_lat) * 111320, 2) +
           power((lo - real_lon) * 111320 * cos(radians(real_lat::double precision))::numeric, 2)
         );
  IF d_m < UI_RADIUS THEN
    pass:=pass+1; rep:=rep||'PASS L5  snapped point is '||round(d_m)||
                 ' m from the truth, inside the '||UI_RADIUS||' m circle the UI draws'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L5  snapped point is '||round(d_m)||
                 ' m away; the UI circle ('||UI_RADIUS||' m) would not contain the real address'||E'\n';
  END IF;

  -- ...and it must actually be far enough to matter. A grid that rounded to
  -- 0.000001 would pass L3/L4 and protect nobody.
  IF d_m > 50 THEN
    pass:=pass+1; rep:=rep||'PASS L6  the offset is '||round(d_m)||' m, not cosmetic'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L6  the offset is only '||round(d_m)||' m -- the grid is too fine to protect anything'||E'\n';
  END IF;

  -- ===== no over-masking: a landlord who did NOT tick the box =============
  SELECT address, building_name, latitude, longitude INTO a, bn, la, lo
    FROM listings_public WHERE id = l_vis;
  IF a = '1 Ngong Rd' AND bn = 'Open Court' THEN
    pass:=pass+1; rep:=rep||'PASS L7  a listing that opted IN still shows its address'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L7  masked a listing that did not ask to be: '||
                 coalesce(a,'NULL')||' / '||coalesce(bn,'NULL')||E'\n';
  END IF;
  IF la = real_lat AND lo = real_lon THEN
    pass:=pass+1; rep:=rep||'PASS L8  ...and its coordinates are exact'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L8  coordinates were snapped for an opted-in listing'||E'\n';
  END IF;

  -- NULL must mean "not hidden", matching ListingMap.tsx:222 `!hideExactAddress`
  SELECT address, latitude INTO a, la FROM listings_public WHERE id = l_nul;
  IF a = '2 Ngong Rd' AND la = real_lat THEN
    pass:=pass+1; rep:=rep||'PASS L9  hide_exact_address IS NULL behaves as NOT hidden'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L9  a NULL flag was treated as hidden, so the view is stricter than the product'||E'\n';
  END IF;

  -- ===== THE EXPOSURE: straight at the table, which is what an attacker does =
  BEGIN
    EXECUTE 'SELECT address FROM public.listings LIMIT 1';
    fail:=fail+1; rep:=rep||'FAIL L10 anon read address directly off the listings table'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    pass:=pass+1; rep:=rep||'PASS L10 anon is refused address on the table'||E'\n';
  END;

  BEGIN
    EXECUTE 'SELECT latitude, longitude FROM public.listings LIMIT 1';
    fail:=fail+1; rep:=rep||'FAIL L11 anon read the exact coordinates off the table'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    pass:=pass+1; rep:=rep||'PASS L11 anon is refused the coordinates on the table'||E'\n';
  END;

  BEGIN
    EXECUTE 'SELECT building_name FROM public.listings LIMIT 1';
    fail:=fail+1; rep:=rep||'FAIL L12 anon read building_name off the table'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    pass:=pass+1; rep:=rep||'PASS L12 anon is refused building_name on the table'||E'\n';
  END;

  -- ===== nothing else may have broken ======================================
  -- search.ts:114 and the aggregates at :303-353 read the TABLE with explicit
  -- column lists. If the regrant missed a column they would all 42501.
  BEGIN
    EXECUTE 'SELECT count(*) FROM (SELECT id,title,property_type,area,city,bedrooms,bathrooms,'
         || 'rent_amount,currency,cover_photo,status,is_verified,created_at,photos,size_sqft,'
         || 'furnishing,hide_exact_address,landmarks FROM public.listings) s' INTO n;
    pass:=pass+1; rep:=rep||'PASS L13 anon still reads the search projection off the table ('||n||' rows)'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    fail:=fail+1; rep:=rep||'FAIL L13 the regrant broke the search projection'||E'\n';
  END;

  -- hide_exact_address itself must stay readable: the UI needs it to render
  -- the "Approximate" badge at ListingMap.tsx:209.
  BEGIN
    EXECUTE 'SELECT count(*) FROM public.listings WHERE coalesce(hide_exact_address,false)=false' INTO n;
    pass:=pass+1; rep:=rep||'PASS L14 anon can still read the flag itself'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    fail:=fail+1; rep:=rep||'FAIL L14 the flag became unreadable, so the UI cannot say "Approximate"'||E'\n';
  END;

  -- row scope must match listings_public_read
  SELECT count(*) INTO n FROM listings_public WHERE id = l_draft;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS L15 a draft is not in the public view'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L15 the view exposes a draft listing'||E'\n';
  END IF;
  RESET ROLE;

  -- ===== a signed-in stranger: registration is free, so this is the real bar =
  PERFORM set_config('request.jwt.claim.sub', v_other::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    EXECUTE 'SELECT address, latitude, longitude FROM public.listings LIMIT 1';
    fail:=fail+1; rep:=rep||'FAIL L16 one free signup still reads every exact address'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    pass:=pass+1; rep:=rep||'PASS L16 a signed-in stranger is refused the table columns too'||E'\n';
  END;

  SELECT address, latitude INTO a, la FROM listings_public WHERE id = l_hid;
  IF a IS NULL AND la = round(real_lat / GRID) * GRID THEN
    pass:=pass+1; rep:=rep||'PASS L17 ...and gets the masked row through the view'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L17 a signed-in stranger got '||coalesce(a,'NULL')||' / '||coalesce(la::text,'NULL')||E'\n';
  END IF;
  RESET ROLE;

  -- ===== the landlord's own rows come back whole ===========================
  PERFORM set_config('request.jwt.claim.sub', v_ll::text, true);
  SET LOCAL ROLE authenticated;

  SELECT address, building_name, latitude, longitude INTO a, bn, la, lo
    FROM listings_public WHERE id = l_hid;
  IF a = 'House 4, Mandera Rd' AND bn = 'Pine Tree Apartments'
     AND la = real_lat AND lo = real_lon THEN
    pass:=pass+1; rep:=rep||'PASS L18 the landlord reads their own hidden listing unmasked'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L18 the edit form cannot see its own address: '||
                 coalesce(a,'NULL')||' / '||coalesce(la::text,'NULL')||E'\n';
  END IF;

  SELECT count(*) INTO n FROM listings_public WHERE id = l_draft;
  IF n = 1 THEN
    pass:=pass+1; rep:=rep||'PASS L19 the landlord still reads their own draft through the view'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L19 the landlord dashboard lost its drafts'||E'\n';
  END IF;
  RESET ROLE;

  -- ===== catalogue invariants ==============================================
  -- select("*") on the view is a drop-in for the table, and duplicateListing
  -- (actions.ts:317-326) spreads this row straight into an insert, so a
  -- missing column would silently truncate a duplicated listing.
  SELECT count(*) INTO n FROM (
    SELECT t.ordinal_position
    FROM (SELECT column_name, ordinal_position FROM information_schema.columns
           WHERE table_schema='public' AND table_name='listings') t
    FULL JOIN (SELECT column_name, ordinal_position FROM information_schema.columns
           WHERE table_schema='public' AND table_name='listings_public') v
      ON v.ordinal_position = t.ordinal_position
    WHERE t.column_name IS DISTINCT FROM v.column_name
  ) d;
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS L20 listings_public mirrors listings column-for-column'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L20 the view and the table disagree on '||n||' column position(s)'||E'\n';
  END IF;

  -- The view runs with owner rights, so a writable grant would be a write
  -- that bypasses RLS altogether.
  SELECT count(*) INTO n FROM information_schema.table_privileges
   WHERE table_schema='public' AND table_name='listings_public'
     AND grantee IN ('anon','authenticated','PUBLIC') AND privilege_type <> 'SELECT';
  IF n = 0 THEN
    pass:=pass+1; rep:=rep||'PASS L21 listings_public is read-only for client roles'||E'\n';
  ELSE
    fail:=fail+1; rep:=rep||'FAIL L21 listings_public carries '||n||' writable grant(s) and bypasses RLS'||E'\n';
  END IF;

  RAISE EXCEPTION E'LOCATION_PRIVACY_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$L$;
