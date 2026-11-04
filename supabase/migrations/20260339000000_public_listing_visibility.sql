-- =============================================================================
-- Public read scope: the service-type catalogue, and non-active listings
-- =============================================================================
-- This migration closes two read-side defects that share one shape: a table
-- carries RLS, the client roles hold the SELECT privilege, and the policy that
-- would let them read anything was never written. PostgREST does not error in
-- that state -- a filtered `.select()` returns [] and a filtered embed returns
-- null -- so both defects are silent.
--
-- (1) public.service_types
--
--     20260312000000_rls_complete_coverage.sql enabled RLS on the service
--     catalogue and gave each table a pair of policies: `<t>_public_read` for
--     anon+authenticated, and `<t>_service_role_all`. `services` got both
--     (:115-120 of that file gives the `service_categories` pair). service_types
--     got only the service_role half -- the public half was omitted.
--
--     Consequence, measured: as the table owner the catalogue returns 12 rows;
--     as `authenticated` and as `anon` it returns 0. The booking request page
--     reads it through an embed:
--
--       src/app/services/provider/[id]/request/page.tsx:125
--         service_type:service_types!service_type_id ( id, booking_flow )
--       src/app/services/provider/[id]/request/page.tsx:156
--         defaultBookingFlow: (serviceTypeData?.booking_flow ?? "standard")
--
--     The embed is always null, so `?? "standard"` fires on every booking. Of
--     the 12 seeded service types only 4 are `standard`; the other 8 are
--     emergency (2), delivery (2), project (2) and personal (2). Two thirds of
--     service types are therefore booked in the wrong shape, emergency -- which
--     carries its own SLA window -- among them. Nothing errors and nothing logs.
--
--     service_types is reference data: 12 rows, no user-owned column, no PII.
--     The fix is the missing sibling policy, written to match 20260312000000.
--
-- (2) public.listings -- `Public can view active listings`
--
--     20260101000005_listings_table.sql gave listings two SELECT policies:
--     `Landlords can view own listings` USING (auth.uid() = landlord_id), and
--     `Public can view active listings` USING (status = 'active'). Policies on
--     one command are OR'd, so a non-owner sees active rows and nothing else.
--
--     Six call sites read listings expecting a non-active row to come back. Two
--     verified in full:
--
--       src/app/api/listing-waitlist/route.ts:62,71-74,76,83
--         RLS client; .select("id, title, status").eq("id",..).single().
--         A non-active listing is invisible, so `.single()` finds nothing and
--         the route answers 404 "Listing not found". An active listing is found
--         and rejected at :83 as "already available". The waitlist exists only
--         for listings that are NOT available, so both branches fail and the
--         feature cannot succeed for anyone but the landlord of the listing.
--         The :83 guard is evidence nobody ever saw a non-active row return.
--
--       src/app/api/saved-listings/route.ts:16,29-45
--         RLS client; embeds listings ( title, rent_amount, cover_photo, ... )
--         on saved_listings. When a landlord marks a property rented or paused
--         the embed resolves to null: the saved row survives and the card loses
--         its title, price and photo.
--
--     `status` is one of draft, active, paused, rented, expired, archived
--     (CHECK on public.listings, verified against the live catalogue) and
--     defaults to 'draft'. A listing that was published and is now paused or
--     rented was already public; draft, expired and archived were not, and stay
--     landlord-only. So the public predicate widens to exactly those three.
--
--     The column is NULLABLE, and `status = ANY (...)` fails CLOSED on NULL --
--     a null-status row stays invisible to non-owners, which is the safe way
--     round. (The CHECK constraint also passes on NULL, so this is reachable.)
--
-- DELIBERATE ASYMMETRY -- do not "fix" this by making the two match.
--
--   public.profiles_public (20260335000000, extended by 20260338000000) admits
--   a landlord's name, avatar and verified badge on the strength of their
--   having a listing. That branch stays `status = 'active'` and is NOT widened
--   here. None of the reads this migration repairs needs a landlord identity:
--   the waitlist reads id/title/status, saved listings reads title/rent/photo.
--   Widening the listing predicate is a visibility change; widening the profile
--   view would be a PII disclosure, and nothing above asks for one. The guard
--   at the end of this file asserts the view did not drift.
--
-- BLAST RADIUS
--   Strictly additive on listings: no row becomes less visible than it is now.
--   Newly visible to anon/authenticated: rows with status paused or rented.
--   Those rows carry address, latitude and longitude, on which anon already
--   holds SELECT -- `hide_exact_address` (src/lib/listings/types.ts:65) is a
--   client-side flag with no server enforcement, so exact addresses of ACTIVE
--   listings are already readable through PostgREST today. This migration
--   extends that pre-existing exposure to two further statuses; it does not
--   create a new class of it. Enforcing hide_exact_address server-side is a
--   separate change and is not attempted here.
--   On service_types: 12 rows of reference data become readable, as its two
--   sibling catalogue tables already are.
--
-- ROLLBACK
--   DROP POLICY service_types_public_read ON public.service_types;
--   DROP POLICY listings_public_read ON public.listings;
--   CREATE POLICY "Public can view active listings" ON public.listings
--     FOR SELECT USING (status = 'active');
--   Reverting restores the two silent defects; it loses no data.
-- =============================================================================

-- (1) --------------------------------------------------------------- service_types
-- Shape copied from 20260312000000_rls_complete_coverage.sql:114-117.
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_types_public_read ON public.service_types;
CREATE POLICY service_types_public_read ON public.service_types
  FOR SELECT TO anon, authenticated USING (true);

-- (2) ------------------------------------------------------------------- listings
-- The old name asserted a predicate this policy no longer has, and the three
-- places that quoted it by name are comments, not dependencies:
--   src/lib/listings/get-listing.ts:142
--   supabase/migrations/20260338000000_profiles_public_landlord_identity.sql:39
--   supabase/tests/profile_read_scope_test.sql:262
-- all three are corrected in the same commit as this file.
DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
DROP POLICY IF EXISTS listings_public_read ON public.listings;
CREATE POLICY listings_public_read ON public.listings
  FOR SELECT TO anon, authenticated
  USING (status = ANY (ARRAY['active'::text, 'paused'::text, 'rented'::text]));

-- ----------------------------------------------------------------------- guards
DO $$
DECLARE
  q           text;
  n           integer;
  viewdef     text;
  bad         text;
BEGIN
  -- service_types must be readable by BOTH client roles, by policy and by grant.
  SELECT count(*) INTO n
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'service_types'
    AND policyname = 'service_types_public_read'
    AND cmd = 'SELECT'
    AND roles @> ARRAY['anon','authenticated']::name[];
  IF n <> 1 THEN
    RAISE EXCEPTION 'service_types_public_read is missing or does not cover anon+authenticated';
  END IF;

  FOREACH bad IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF NOT has_table_privilege(bad, 'public.service_types', 'SELECT') THEN
      RAISE EXCEPTION 'service_types: % lost the SELECT privilege; the policy is decorative without it', bad;
    END IF;
  END LOOP;

  -- The listings public predicate must admit exactly active, paused, rented.
  SELECT qual INTO q
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'listings'
    AND policyname = 'listings_public_read';
  IF q IS NULL THEN
    RAISE EXCEPTION 'listings_public_read does not exist';
  END IF;
  FOREACH bad IN ARRAY ARRAY['active','paused','rented'] LOOP
    IF position('''' || bad || '''' IN q) = 0 THEN
      RAISE EXCEPTION 'listings_public_read no longer admits status %: %', bad, q;
    END IF;
  END LOOP;
  -- ...and must never admit a status that was not public before.
  FOREACH bad IN ARRAY ARRAY['draft','expired','archived'] LOOP
    IF position('''' || bad || '''' IN q) > 0 THEN
      RAISE EXCEPTION 'listings_public_read admits non-public status %: %', bad, q;
    END IF;
  END LOOP;

  -- No OTHER policy may grant a client role a wider read of listings. A single
  -- USING (true) would subsume this one, because policies on a command are OR'd.
  SELECT string_agg(policyname || ' -> ' || coalesce(qual, '(none)'), '; ') INTO bad
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'listings'
    AND cmd IN ('SELECT', 'ALL')
    AND policyname <> 'listings_public_read'
    AND (roles @> ARRAY['anon']::name[]
         OR roles @> ARRAY['authenticated']::name[]
         OR roles @> ARRAY['public']::name[])
    AND (qual IS NULL OR btrim(qual) = 'true');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'a blanket read policy on listings subsumes listings_public_read: %', bad;
  END IF;

  -- The deliberate asymmetry: profiles_public must NOT follow listings here.
  -- Asserted as a negative so it holds for both the three-column form created
  -- by 20260335000000 and the four-column form from 20260338000000.
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'profiles_public'
  ) THEN
    viewdef := pg_get_viewdef('public.profiles_public'::regclass, true);
    FOREACH bad IN ARRAY ARRAY['paused','rented'] LOOP
      IF position('''' || bad || '''' IN viewdef) > 0 THEN
        RAISE EXCEPTION
          'profiles_public was widened to status % -- landlord identity must stay active-only', bad;
      END IF;
    END LOOP;
  END IF;
END
$$;
