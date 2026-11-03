-- =============================================================================
-- Scope profile reads: drop USING(true), add a column-limited public projection
-- =============================================================================
-- THE DEFECT
--   profiles carried:
--     CREATE POLICY profiles_public_read ON profiles
--       FOR SELECT TO authenticated USING (true);
--
--   RLS is ROW-level. It cannot restrict columns. SELECT was granted on all 11
--   columns of profiles, so that one policy let any signed-in account run
--     select email, phone, metadata from profiles
--   and walk away with the contact details of every user on the platform.
--   Registration is free, so the cost of that read was one throwaway signup.
--
--   It was also SUBSUMING the ownership policy: policies on the same command
--   are OR'd, so `USING (true)` swallowed `auth.uid() = id` outright. As
--   `authenticated`, EXPLAIN on a profiles scan emitted no Filter line at all.
--
--   Measured on the live project before this ran (one account, two rows):
--     other user's email    READABLE
--     other user's phone    READABLE
--     other user's metadata READABLE
--
-- WHY A VIEW AND NOT A NARROWER POLICY
--   Three reads in the app legitimately need ANOTHER user's name:
--     src/lib/services/reviews.ts   getProviderReviewsWithVotes  (public page)
--     src/lib/services/providers.ts getProviderReviews           (public page)
--     src/lib/services/bookings.ts  getProviderBookings          (provider UI)
--   All three want id / full_name / avatar_url. None wants email, phone,
--   metadata, is_verified or verification_level. A policy cannot express
--   "this row, but only these three columns" -- so the blanket policy goes and
--   those reads move to `profiles_public`, which projects three columns and
--   cannot project a fourth.
--
--   The view runs with its owner's rights (security_invoker is left at its
--   default, false), which is how it sees through RLS on the base table. Its
--   OWN WHERE clause is therefore the whole access control, so it is written to
--   admit only rows that are already public or already related to the caller:
--
--     own row                     -- so a caller can resolve their own name
--     active provider             -- business_name is public already
--     author of a visible review  -- reviews_select_public exposes these rows
--                                    to anon and authenticated alike
--     customer of the caller's    -- the provider has to render a name on the
--     own booking                    bookings list they are already entitled to
--
--   A plain customer with no booking with you, and no visible review, is not
--   admitted, so this does NOT become a platform-wide name directory. All four
--   predicates are index-backed (idx_service_providers_user_id,
--   idx_reviews_reviewer_id, idx_bookings_customer_id).
--
--   security_barrier is deliberately NOT set: it blocks predicate pushdown, so
--   `where id = any($1)` would stop reaching the base-table index. The three
--   projected columns are the ones the product publishes anyway, so there is
--   no leaky-predicate secret left to protect.
--
-- SIDE EFFECT: this FIXES a path that was already broken. profiles_public_read
--   was TO authenticated, so a signed-out visitor to a provider page got no
--   review bylines at all (measured: anon saw 0 profiles rows). profiles_public
--   is granted to anon, so those names now render.
--
-- Verified by supabase/tests/profile_read_scope_test.sql (17 assertions).
-- =============================================================================

-- ── 1. the blanket read goes away ────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

-- The ownership policy ("Users can view own profile", USING auth.uid() = id)
-- is left in place and is now the only SELECT path into the base table.

-- ── 2. the column-limited, relationship-scoped projection ────────────────────
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url
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
  );

COMMENT ON VIEW public.profiles_public IS
  'Column-limited public projection of profiles (id, full_name, avatar_url). '
  'Runs with owner rights, so its WHERE clause IS the access control: own row, '
  'active providers, authors of visible reviews, and customers of the caller''s '
  'own bookings. Replaces profiles_public_read USING(true), which exposed every '
  'column of every profile to any signed-in account. Read-only by grant: a '
  'single-table view is auto-updatable, and a write through it would run as the '
  'owner and bypass RLS on profiles.';

-- ── 3. read-only, to the client roles only ───────────────────────────────────
-- Supabase's ALTER DEFAULT PRIVILEGES grants ALL on new objects in public to
-- anon/authenticated/service_role. On an auto-updatable view that would be
-- INSERT/UPDATE/DELETE executing with owner rights -- an RLS bypass straight
-- into profiles. So revoke everything first, then grant SELECT and nothing else.
REVOKE ALL ON public.profiles_public FROM PUBLIC;
REVOKE ALL ON public.profiles_public FROM anon, authenticated, service_role;
GRANT SELECT ON public.profiles_public TO anon, authenticated, service_role;
