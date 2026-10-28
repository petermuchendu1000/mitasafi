-- =============================================================================
-- Restrict cross-user access to profile PII (email, phone)
-- =============================================================================
-- PROBLEM
--   20260310000000_rls_security_hardening.sql:543-545 created:
--       CREATE POLICY profiles_public_read ON public.profiles
--         FOR SELECT TO authenticated USING (true);
--   Combined with Supabase's platform-default SELECT grant on public tables,
--   that lets ANY authenticated user read EVERY row of public.profiles —
--   including `email` and `phone`.
--
--   That migration's own comment argued privacy-sensitive fields "should be
--   protected at the application layer". That does not hold here: PostgREST
--   exposes the table directly, so any client with the anon key and a valid
--   JWT can request those columns without going through application code.
--
-- WHY A VIEW RATHER THAN A NARROWER POLICY
--   RLS is row-level, not column-level, and two legitimate consumers need to
--   read *other* users' profiles — but only non-sensitive columns:
--     - src/lib/listings/get-listing.ts:134  any viewer -> landlord
--                                            (id, full_name, avatar_url, is_verified)
--     - src/lib/services/bookings.ts:335     provider  -> their booking customers
--                                            (full_name)
--   A row policy alone cannot serve those without also exposing email/phone.
--   Column grants cannot either, because a user must still read their OWN
--   email and phone (src/lib/cache/queries.ts:109).
--
--   So: profiles reverts to self-only at row level, and cross-user reads move
--   to a view that does not contain the sensitive columns at all.
--
-- NOT AFFECTED
--   - Self-reads: policy "Users can view own profile" (auth.uid() = id) remains.
--   - src/lib/services/admin-verification.ts:189,300 uses createAdminClient(),
--     which bypasses RLS entirely.
--
-- SIDE EFFECT (an improvement)
--   profiles_public_read was granted TO authenticated only, so logged-out
--   visitors currently receive NULL landlord info on listing pages. The view is
--   granted to anon as well, which fixes that.
--
-- ROLLBACK
--   DROP VIEW IF EXISTS public.public_profiles;
--   CREATE POLICY profiles_public_read ON public.profiles
--     FOR SELECT TO authenticated USING (true);
-- =============================================================================

-- 1. Remove the blanket cross-user read.
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

-- 2. Safe projection for cross-user reads. security_invoker = false (the
--    PostgreSQL 15+ default, stated explicitly) so the view reads profiles as
--    its owner; the column list — not RLS — is what bounds the exposure.
--    `id` is projected so PostgREST can infer the relationship from the base
--    table's foreign keys (listings_landlord_id_fkey, bookings_customer_id_fkey).
CREATE OR REPLACE VIEW public.public_profiles
  WITH (security_invoker = false) AS
  SELECT
    id,
    full_name,
    avatar_url,
    is_verified
  FROM public.profiles;

COMMENT ON VIEW public.public_profiles IS
  'Non-sensitive projection of public.profiles for cross-user reads. Deliberately excludes email, phone, metadata, primary_role and verification_level. Do not add columns without a privacy review — this view is readable by anon.';

-- 3. Expose it to both roles. anon is intentional: listing pages render
--    landlord name/avatar for logged-out visitors.
GRANT SELECT ON public.public_profiles TO authenticated, anon;
