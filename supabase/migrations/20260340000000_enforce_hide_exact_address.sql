-- =============================================================================
-- hide_exact_address: enforce it in the database, because nothing enforced it
-- =============================================================================
-- WHAT THE FLAG CLAIMS
--   public.listings.hide_exact_address (20260101000005_listings_table.sql:36,
--   BOOLEAN DEFAULT false) is the landlord's "do not publish exactly where this
--   property is". The UI makes that promise in words: ListingMap.tsx:209-214
--   renders an "Approximate" badge, and :281-286 renders "Exact address shared
--   after inquiry".
--
-- WHAT IT ACTUALLY DID -- nothing, at any layer.
--
--   1. No database enforcement. Measured: no view in public references the
--      column, no policy references it, and the only function that does is the
--      trigger prevent_location_address_mutation. Meanwhile anon AND
--      authenticated both hold column-level SELECT on address, latitude and
--      longitude. RLS is row-level and cannot restrict columns, so the policy
--      that gates WHICH rows are visible says nothing about these columns.
--
--   2. PostgREST is reachable by anyone. src/lib/supabase/client.ts:17-18 uses
--      NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, and Next
--      inlines NEXT_PUBLIC_* into the browser bundle. So the endpoint and the
--      key are public by construction and
--        GET /rest/v1/listings?select=address,latitude,longitude
--      answers for a signed-out stranger with no application code involved.
--      No amount of masking in a server component can affect that.
--
--   3. The client never withheld it either. ListingDetailClient.tsx:12 is a
--      "use client" component and :372-379 passes latitude, longitude, address
--      and building_name as props, so all four are serialised into the RSC
--      payload for every viewer whatever the flag says. ListingMap.tsx:222
--      merely declines to RENDER the address string.
--
--   4. The "approximate" map is centred on the exact point.
--      ListingMap.tsx:86 centres at [longitude, latitude]; :103-152 draws a
--      circle whose geometry is those same exact coordinates (:112) and whose
--      "circle-radius": 80 is EIGHTY PIXELS, not metres. The privacy mode is a
--      zoom level (13 instead of 15) plus a screen-space ring around the true
--      location.
--
--   5. ListingMap.tsx:243-252 renders a "Directions" link UNCONDITIONALLY --
--      outside the hideExactAddress branch -- and getDirectionsUrl (:44-47)
--      embeds the exact coordinates in a Google Maps destination. A viewer did
--      not need dev tools: the link beside the words "Exact address shared
--      after inquiry" already shared it.
--
--   The consequence is a landlord who ticks the box, is told the address is
--   withheld, and has it published in full to anyone who asks the API.
--
-- THE FIX
--   Same shape as profiles_public (20260335000000): a column-limited view that
--   runs with OWNER rights, plus the removal of the privilege that made the
--   raw columns readable. RLS cannot do column security, so a view has to.
--
--   public.listings_public projects all 100 columns of public.listings so that
--   `select("*")` against it is a drop-in for the table, and masks four:
--     address        -> NULL
--     building_name  -> NULL   (a building name in Nairobi IS the address;
--                               leaving it would be a one-field bypass, and
--                               ListingMap.tsx:244 feeds it to Google Maps as
--                               a geocodable destination)
--     latitude       -> snapped to a 0.005 degree grid
--     longitude      -> snapped to a 0.005 degree grid
--
--   ...but only for people who are not the landlord. The owner reads their own
--   rows unmasked through the same view, which is what lets the landlord
--   dashboard and the edit form keep working.
--
-- WHY A GRID AND NOT NULL COORDINATES, AND WHY NOT RANDOM JITTER
--   NULL would be stronger but it kills the map: ListingMap.tsx:229 falls
--   through to ":254-261 Map not available", so every privacy-respecting
--   listing would lose its map and the "Approximate" circle UI would become
--   dead code.
--   Random jitter per request is WORSE than useless: a caller who fetches the
--   same listing repeatedly averages the samples and recovers the true point.
--   Grid snapping is deterministic, so repeated reads return one fixed cell
--   centre and reveal only the cell.
--
--   The arithmetic, with the UI constant it has to agree with:
--     0.005 deg of latitude          = 0.005 * 111320            ~= 556 m
--     longitude at Nairobi (-1.29)   = 556 * cos(1.29 deg)       ~= 556 m
--     half-cell                      = 278 m
--     half-diagonal (worst case)     = 278 * sqrt(2)             ~= 393 m
--     the circle ListingMap draws    = 80 px at zoom 13
--                                    = 80 * 156543 / 2^13 * cos(1.29) ~= 1528 m
--   INVARIANT: half-diagonal (393 m) < drawn radius (1528 m). The true
--   location is therefore always inside the circle the UI shows, so the map
--   does not lie in the other direction either. If anyone changes the grid
--   constant here or the "circle-radius"/zoom in ListingMap.tsx, that
--   inequality must be rechecked by hand -- it is not machine-enforced.
--   latitude is numeric(10,8) and longitude numeric(11,8), so round(x/0.005)
--   * 0.005 is exact numeric arithmetic with no float drift.
--
-- WHY THE COLUMN PRIVILEGE HAS TO GO, AND HOW
--   The view is useless while the table still answers for the same columns.
--   A column-level REVOKE is INERT while the table-level privilege is held, so
--   table SELECT is dropped and every column EXCEPT the four is granted back
--   by name. The grant list is computed from the catalogue rather than typed
--   out, so it cannot drift from the table or miss a column.
--
--   CONSEQUENCE TO KNOW ABOUT: a column added to listings in a LATER migration
--   gets no grant from this one and will not be readable by clients, and the
--   view will not project it either. That is fail-closed rather than
--   fail-open, which is the right direction, but it is a trap. The guards at
--   the end of this file and V-assertions in
--   supabase/tests/location_privacy_test.sql both fail loudly if the view and
--   the table ever disagree on their column set, which is how a future column
--   addition gets caught in CI instead of in production.
--
-- BLAST RADIUS
--   Reads of listings that name address/latitude/longitude/building_name: NONE
--   do, verified by sweeping every .select() against .from("listings").
--   Reads that use select("*") and therefore break on the revoke -- all five,
--   each moved to the view in the same commit:
--     src/lib/listings/get-listing.ts:160              public detail page
--     src/app/dashboard/landlord/listings/[id]/page.tsx:87   owner
--     src/app/dashboard/landlord/listings/actions.ts:301     owner (duplicate)
--     src/app/dashboard/landlord/listings/new/listing-service.ts:323  owner
--     src/app/dashboard/landlord/listings/new/listing-service.ts:342  owner
--   Everything else selects explicit column lists that exclude all four, so it
--   keeps reading the table unchanged: lib/listings/search.ts:114 and :303-353,
--   lib/listings/get-similar.ts, app/listings/[slug]/page.tsx:66 and :126,
--   api/listing-waitlist, api/saved-listings (including its listings embed,
--   which keeps working because the TABLE is still readable),
--   api/listings/inquire, api/listings/email-to-self, api/listings/batch,
--   hooks/useRealtimeInquiries. api/cron/search-alerts and api/inquiries use
--   the admin client and bypass grants entirely.
--   No distance or radius search exists anywhere in the codebase -- grepped for
--   latitude/longitude/distance/radius/ST_/earth across lib/listings -- so
--   nothing computes on these coordinates server-side. The only consumer is
--   the detail-page map.
--   service_role is unaffected and keeps full table access.
--
-- ROLLBACK
--   GRANT SELECT ON public.listings TO anon, authenticated;
--   DROP VIEW IF EXISTS public.listings_public;
--   ...and revert the five call sites to .from("listings"). Reverting
--   re-publishes every exact address; it loses no data.
-- =============================================================================

DROP VIEW IF EXISTS public.listings_public;

CREATE VIEW public.listings_public
WITH (security_invoker = false) AS
WITH v AS (
  SELECT
    l.*,
    -- ONE definition of "may see the real location", so the four masked
    -- columns cannot drift apart. hide_exact_address is NULLABLE and its
    -- default is false, and the client treats a falsy value as "not hidden"
    -- (ListingMap.tsx:222 `!hideExactAddress && address`), so NULL must mean
    -- REVEAL here or the view would be stricter than the product.
    (l.landlord_id = auth.uid() OR NOT coalesce(l.hide_exact_address, false)) AS reveal
  FROM public.listings l
  WHERE l.landlord_id = auth.uid()
     OR l.status = ANY (ARRAY['active'::text, 'paused'::text, 'rented'::text])
)
SELECT
  v.id,
  v.landlord_id,
  v.building_id,
  v.unit_id,
  v.title,
  v.description,
  v.property_type,
  CASE WHEN v.reveal THEN v.building_name ELSE NULL::text END AS building_name,
  CASE WHEN v.reveal THEN v.address ELSE NULL::text END AS address,
  v.area,
  v.city,
  v.landmarks,
  CASE WHEN v.reveal THEN v.latitude
       ELSE round(v.latitude / 0.005) * 0.005 END AS latitude,
  CASE WHEN v.reveal THEN v.longitude
       ELSE round(v.longitude / 0.005) * 0.005 END AS longitude,
  v.hide_exact_address,
  v.bedrooms,
  v.bathrooms,
  v.size_sqft,
  v.size_unit,
  v.floor_level,
  v.total_floors,
  v.year_built,
  v.condition,
  v.furnishing,
  v.amenities,
  v.parking,
  v.parking_spaces,
  v.pet_policy,
  v.smoking_policy,
  v.security_features,
  v.utilities,
  v.photos,
  v.cover_photo,
  v.video_url,
  v.rent_amount,
  v.currency,
  v.rent_negotiable,
  v.deposit_months,
  v.deposit_amount,
  v.service_charge,
  v.lease_term,
  v.min_lease_months,
  v.available_from,
  v.available_now,
  v.payment_methods,
  v.rent_includes,
  v.status,
  v.views_count,
  v.inquiries_count,
  v.applications_count,
  v.featured_until,
  v.is_verified,
  v.verified_at,
  v.verified_by,
  v.published_at,
  v.expires_at,
  v.created_at,
  v.updated_at,
  v.listing_category,
  v.commercial_type,
  v.commercial_subtype,
  v.size_sqm,
  v.building_grade,
  v.ceiling_height_m,
  v.fitout_level,
  v.workstation_capacity,
  v.meeting_rooms,
  v.private_offices,
  v.has_reception,
  v.has_server_room,
  v.frontage_width_m,
  v.has_display_windows,
  v.seating_capacity,
  v.kitchen_area_sqm,
  v.has_grease_trap,
  v.has_exhaust_system,
  v.clear_height_m,
  v.loading_docks,
  v.drive_in_doors,
  v.floor_load_capacity,
  v.has_dock_levelers,
  v.vehicle_access,
  v.parking_spaces_count,
  v.ev_charging_stations,
  v.work_bays,
  v.plot_size_sqm,
  v.plot_size_acres,
  v.zoning_type,
  v.permitted_uses,
  v.room_count,
  v.star_rating,
  v.event_capacity_seated,
  v.event_capacity_standing,
  v.consultation_rooms,
  v.treatment_rooms,
  v.has_pharmacy_license,
  v.classroom_count,
  v.total_student_capacity,
  v.ministry_approved,
  v.commercial_attributes
FROM v;

-- ------------------------------------------------------------------- the view
-- SELECT only. A view over a single table is auto-updatable, and this one runs
-- with OWNER rights, so a granted INSERT/UPDATE/DELETE would be a write that
-- bypasses RLS entirely. The CTE probably makes it non-updatable anyway; the
-- grant is the part that is guaranteed.
REVOKE ALL ON public.listings_public FROM PUBLIC;
REVOKE ALL ON public.listings_public FROM anon, authenticated, service_role;
GRANT SELECT ON public.listings_public TO anon, authenticated, service_role;

-- --------------------------------------------------- the table's read surface
-- A column REVOKE is inert while the table privilege is held, so the table
-- grant is dropped and the columns are granted back by name. The list is built
-- from the catalogue so it cannot miss a column or drift from the table.
DO $$
DECLARE
  cols text;
  n    integer;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'listings'
    AND column_name NOT IN ('address', 'building_name', 'latitude', 'longitude');

  SELECT count(*) INTO n
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'listings';

  IF cols IS NULL OR n < 90 THEN
    RAISE EXCEPTION 'refusing to regrant: listings reported % columns', n;
  END IF;

  REVOKE SELECT ON public.listings FROM anon, authenticated;
  EXECUTE format('GRANT SELECT (%s) ON public.listings TO anon, authenticated', cols);
END
$$;

-- ----------------------------------------------------------------------- guards
DO $$
DECLARE
  masked   text[] := ARRAY['address', 'building_name', 'latitude', 'longitude'];
  bad      text;
  viewdef  text;
  n        integer;
BEGIN
  -- (a) security_invoker MUST be off. With it on, the view would be subject to
  -- the caller's own column privileges -- which this migration just revoked --
  -- so it would return nothing at all, and the masking would be decorative.
  SELECT count(*) INTO n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND c.relname = 'listings_public'
    AND (c.reloptions IS NULL
         OR NOT (c.reloptions @> ARRAY['security_invoker=true']));
  IF n <> 1 THEN
    RAISE EXCEPTION 'listings_public must run with owner rights (security_invoker off)';
  END IF;

  -- (b) The view must project EXACTLY the table's columns, in the same order.
  -- This is what makes select("*") on the view a drop-in for the table, what
  -- keeps duplicateListing's `...listingData` spread (actions.ts:317-326) from
  -- inserting a short row, and what makes a future column addition fail here
  -- instead of silently vanishing from the landlord's edit form.
  SELECT string_agg(diff, '; ') INTO bad FROM (
    SELECT coalesce(t.column_name, '-') || ' (table#' || coalesce(t.ordinal_position::text, '-')
           || ') vs ' || coalesce(v.column_name, '-') || ' (view#'
           || coalesce(v.ordinal_position::text, '-') || ')' AS diff
    FROM (SELECT column_name, ordinal_position FROM information_schema.columns
           WHERE table_schema='public' AND table_name='listings') t
    FULL JOIN (SELECT column_name, ordinal_position FROM information_schema.columns
           WHERE table_schema='public' AND table_name='listings_public') v
      ON v.ordinal_position = t.ordinal_position
    WHERE t.column_name IS DISTINCT FROM v.column_name
  ) d;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'listings_public does not mirror listings column-for-column: %', bad;
  END IF;

  -- (c) Table-level SELECT must be GONE for both client roles, or every column
  -- REVOKE is inert and the four columns are readable anyway.
  --
  -- The first version of this guard also required "and no column grants
  -- exist", which made it unfirable: this migration always leaves column
  -- grants behind, so the conjunction could never be true after it ran.
  -- Mutation testing caught it -- re-granting table SELECT was killed by
  -- guard (d) instead, which is luck, not a check. has_table_privilege is
  -- strictly table-level (measured: it returns false for anon here while
  -- has_any_column_privilege returns true), so the plain form is correct.
  FOREACH bad IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(bad, 'public.listings', 'SELECT') THEN
      RAISE EXCEPTION
        'table-level SELECT on listings is still held by %; the column REVOKE is inert', bad;
    END IF;
  END LOOP;

  -- (d) The four masked columns must NOT be readable on the table by a client.
  SELECT string_agg(g.grantee || '.' || g.column_name, ', ') INTO bad
  FROM information_schema.column_privileges g
  WHERE g.table_schema='public' AND g.table_name='listings'
    AND g.privilege_type='SELECT'
    AND g.grantee IN ('anon','authenticated')
    AND g.column_name = ANY (masked);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'the exact location is still readable straight off the table: %', bad;
  END IF;

  -- (e) ...and every OTHER column must still be readable, or the app breaks in
  -- a hundred places. A check that only looked at (d) would pass on a table
  -- nobody can read at all.
  SELECT string_agg(c.column_name || ' for ' || role_name, ', ') INTO bad
  FROM information_schema.columns c
  CROSS JOIN (VALUES ('anon'), ('authenticated')) AS roles(role_name)
  WHERE c.table_schema='public' AND c.table_name='listings'
    AND NOT (c.column_name = ANY (masked))
    AND NOT has_column_privilege(roles.role_name, 'public.listings', c.column_name, 'SELECT');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'these listings columns lost their SELECT grant: %', bad;
  END IF;

  -- (f) The view must stay read-only for client roles.
  SELECT string_agg(grantee || ':' || privilege_type, ', ') INTO bad
  FROM information_schema.table_privileges
  WHERE table_schema='public' AND table_name='listings_public'
    AND grantee IN ('anon','authenticated','PUBLIC')
    AND privilege_type <> 'SELECT';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'listings_public is writable, which would bypass RLS: %', bad;
  END IF;

  -- (g) The view's row scope must agree with listings_public_read
  -- (20260339000000). If the policy widens and the view does not, a listing
  -- becomes readable on the table but invisible in the masked projection, and
  -- the detail page 404s on a listing search still lists.
  viewdef := pg_get_viewdef('public.listings_public'::regclass, true);
  FOREACH bad IN ARRAY ARRAY['active', 'paused', 'rented'] LOOP
    IF position('''' || bad || '''' IN viewdef) = 0 THEN
      RAISE EXCEPTION 'listings_public does not admit status %, but listings_public_read does', bad;
    END IF;
  END LOOP;
  FOREACH bad IN ARRAY ARRAY['draft', 'expired', 'archived'] LOOP
    IF position('''' || bad || '''' IN viewdef) > 0 THEN
      RAISE EXCEPTION 'listings_public admits non-public status %', bad;
    END IF;
  END LOOP;

  -- (h) The masking logic itself must still be there. Guard (b) cannot see
  -- this: replacing the reveal predicate with a constant leaves the column set
  -- identical, so the view would still mirror the table exactly.
  --
  -- This is counted, not merely searched for. The first version asked whether
  -- 'hide_exact_address' appeared in the definition at all, which can never be
  -- false -- the column is one of the 100 the view projects, so it appears
  -- whatever the reveal expression says. A mutant that replaced the predicate
  -- with `true AS reveal` survived that check. Counting distinguishes them:
  --   hide_exact_address  3 refs = CTE l.* expansion, outer projection, reveal
  --   0.005               4 refs = round(x / 0.005) * 0.005, twice
  --   auth.uid()          2 refs = the owner exemption in reveal, and the row
  --                                filter in the CTE's WHERE
  -- Counts are compared with >=, so adding references is fine and only losing
  -- one fails. Measured against the real definition on PostgreSQL 16.
  SELECT (length(viewdef) - length(replace(viewdef, 'hide_exact_address', '')))
         / length('hide_exact_address') INTO n;
  IF n < 3 THEN
    RAISE EXCEPTION
      'listings_public projects hide_exact_address but no longer DECIDES on it (% refs, expected >= 3)', n;
  END IF;

  SELECT (length(viewdef) - length(replace(viewdef, '0.005', ''))) / length('0.005') INTO n;
  IF n < 4 THEN
    RAISE EXCEPTION
      'listings_public no longer snaps both coordinates to the privacy grid (% refs, expected >= 4)', n;
  END IF;

  SELECT (length(viewdef) - length(replace(viewdef, 'auth.uid()', ''))) / length('auth.uid()') INTO n;
  IF n < 2 THEN
    RAISE EXCEPTION
      'listings_public lost an auth.uid() branch -- either the owner exemption or the row filter (% refs, expected >= 2)', n;
  END IF;
END
$$;
