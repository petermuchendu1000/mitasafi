-- =============================================================================
-- profiles_public: admit landlords, and publish is_verified
-- =============================================================================
-- REGRESSION THIS FIXES, and it was mine.
--
-- 20260335000000 dropped `profiles_public_read ON profiles USING (true)` and
-- moved the cross-user profile reads to the `profiles_public` view. It
-- enumerated THREE such reads (reviews.ts, providers.ts, bookings.ts) and
-- migrated exactly those three. A fourth was missed:
--
--   src/lib/listings/get-listing.ts  embeds
--     profiles:landlord_id ( id, full_name, avatar_url, is_verified )
--   on the RLS-bound client.
--
-- The viewer of a listing is never its landlord, so with the blanket policy
-- gone that embed resolves to NULL for every viewer. PostgREST filters an
-- embed by RLS and returns null rather than erroring, so nothing logged and
-- nothing threw -- the landlord's name, avatar and verified badge simply
-- vanished from every listing page.
--
-- WHY A ONE-LINE SWAP TO THE VIEW WAS NOT ENOUGH, verified against live:
--   1. The view projects only (id, full_name, avatar_url). `is_verified` had
--      no source at all.
--   2. Its four branches admit: own row, active service_providers, authors of
--      visible reviews, and customers of the caller's own bookings. A landlord
--      who is not also a provider matches NONE of them.
--
-- TWO CHANGES, both deliberate:
--
-- (a) `is_verified` joins the projection. Owner's decision: landlord
--     verification is public. It is already a published trust signal on the
--     provider side (service_providers.is_verified / verification_badge), so
--     this makes the same fact available for the rows this view admits.
--     `verification_level` stays OUT -- it is the finer-grained internal
--     state, and the client write surface deliberately withholds it.
--
-- (b) A fifth branch admits the landlord of a PUBLICLY VISIBLE listing. The
--     predicate is `status = 'active'`, which is exactly the predicate of the
--     `Public can view active listings` policy on `listings` -- so this view
--     exposes a landlord's name only where their listing is already public,
--     and not one row further. `status` is nullable, and `= 'active'` fails
--     CLOSED on NULL. Index-backed by idx_listings_landlord.
--
-- Still deliberately NOT admitted: a profile with no public presence at all.
-- This is not a user directory.
--
-- CREATE OR REPLACE VIEW may append columns but may not reorder or rename
-- them, so is_verified goes last. Replacing a view preserves its ACL, and the
-- guard at the bottom re-asserts SELECT-only anyway, because this view runs
-- with owner rights and a write through it would bypass RLS on profiles.
-- =============================================================================

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.is_verified
FROM public.profiles p
WHERE
  -- the caller themselves
  p.id = auth.uid()

  -- an active provider: their business identity is public already
  OR EXISTS (
    SELECT 1 FROM public.service_providers sp
    WHERE sp.user_id = p.id
      AND sp.is_active = true
  )

  -- the author of a review that is itself publicly readable
  OR EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.reviewer_id = p.id
      AND r.is_hidden = false
  )

  -- a customer on a booking belonging to the caller's own provider account
  OR EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.service_providers sp2 ON sp2.id = b.provider_id
    WHERE b.customer_id = p.id
      AND sp2.user_id = auth.uid()
  )

  -- the landlord of a listing the public can already see
  OR EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.landlord_id = p.id
      AND l.status = 'active'
  );

COMMENT ON VIEW public.profiles_public IS
  'Column-limited public projection of profiles (id, full_name, avatar_url, '
  'is_verified). Runs with owner rights, so its WHERE clause IS the access '
  'control: own row, active providers, authors of visible reviews, customers of '
  'the caller''s own bookings, and landlords of active listings. Replaces '
  'profiles_public_read USING(true), which exposed every column of every profile '
  'to any signed-in account. Read-only by grant: a single-table view is '
  'auto-updatable and a write through it would run as the owner and bypass RLS.';

-- Re-assert the grant shape. CREATE OR REPLACE keeps the existing ACL, but
-- Supabase's ALTER DEFAULT PRIVILEGES hands ALL on public objects to
-- anon/authenticated, so this stays explicit rather than inherited.
REVOKE ALL ON public.profiles_public FROM PUBLIC;
REVOKE ALL ON public.profiles_public FROM anon, authenticated, service_role;
GRANT SELECT ON public.profiles_public TO anon, authenticated, service_role;

DO $$
DECLARE
  cols text;
  writable text;
BEGIN
  SELECT string_agg(column_name, ',' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles_public';

  IF cols <> 'id,full_name,avatar_url,is_verified' THEN
    RAISE EXCEPTION 'profiles_public projection is [%], expected id,full_name,avatar_url,is_verified', cols;
  END IF;

  -- The columns the original defect exposed must never reappear here.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles_public'
       AND column_name IN ('email','phone','metadata','verification_level')
  ) THEN
    RAISE EXCEPTION 'profiles_public regrew a sensitive column';
  END IF;

  -- Read-only, or the owner-rights view becomes a write channel into profiles.
  SELECT string_agg(DISTINCT privilege_type, ',') INTO writable
    FROM information_schema.role_table_grants
   WHERE table_schema='public' AND table_name='profiles_public'
     AND grantee IN ('anon','authenticated')
     AND privilege_type <> 'SELECT';

  IF writable IS NOT NULL THEN
    RAISE EXCEPTION 'profiles_public is writable by a client role: %', writable;
  END IF;
END
$$;
