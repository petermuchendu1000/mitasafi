-- =============================================================================
-- One verification truth: profiles.is_verified becomes generated
-- =============================================================================
-- Three verification flags existed with no declared relationship between them:
--
--   profiles.verification_level   text, 'none' | 'phone' | 'id' | 'full'
--   profiles.is_verified          boolean, written by hand alongside the above
--   user_roles.is_verified        boolean, role APPROVAL -- a different concept
--
-- (service_providers.is_verified is a fourth, and also a different concept: the
-- business's verification, not the human's. Neither of those is touched here.)
--
-- profiles.verification_level was referenced by ZERO policies and ZERO
-- functions, so nothing server-side consulted the ladder, while is_verified was
-- the flag actually read -- including by profiles_public, which publishes it to
-- anonymous visitors. Two columns, one concept, written in pairs by hand at
-- four call sites. Nothing stopped them disagreeing.
--
-- WHERE THE DERIVATION COMES FROM -- MEASURED, NOT CHOSEN
--
-- The obvious reading is is_verified = (verification_level <> 'none'). That is
-- WRONG, and the application says so. Every site that wrote the pair wrote it
-- the same way:
--
--   src/app/dashboard/verify-provider/actions.ts  level 'id'   -> is_verified false
--   src/lib/services/admin-verification.ts        level 'id'   -> is_verified false
--   src/app/dashboard/verify-provider/page.tsx    level 'full' -> is_verified true
--   src/lib/services/admin-verification.ts        level 'full' -> is_verified true
--
-- and the comment above the first of them states the rule outright: "full is
-- only set when admin approves". Level 'id' means documents submitted and
-- awaiting review. A <> 'none' derivation would have turned the public
-- verified badge on for every user who merely uploaded a document, and for
-- every user who verified only a phone number.
--
--   is_verified := (verification_level = 'full')
--
-- COALESCE, because verification_level is NULLABLE. `NULL = 'full'` is NULL,
-- not false, and is_verified is read as a boolean by the listing and dashboard
-- code. Without the COALESCE a NULL level would make the badge null rather
-- than absent.
--
-- WHY THE VIEW IS DROPPED AND RECREATED
--
-- profiles_public selects is_verified, so ALTER TABLE ... DROP COLUMN is
-- refused while it exists. The view is recreated with the SAME four columns.
-- src/__tests__/profile-read-scope.test.ts parses the LAST migration that
-- defines the view and asserts the projection is exactly
-- {id, full_name, avatar_url, is_verified}; that is this migration now, and
-- the form below is what its parser expects -- the literal
-- `CREATE OR REPLACE VIEW public.profiles_public` and a `FROM public.profiles`.
-- security_invoker=false is preserved: the view's WHERE clause is its access
-- control, and RLS on profiles does not apply inside it.
--
-- THE COMPANION CODE CHANGE, WHICH MUST SHIP WITH THIS
--
-- A generated column cannot be written (SQLSTATE 428C9), so the four writers
-- above now set verification_level only. They were changed in the same commit.
-- Applying this migration against the old code would make all four fail.
--
-- SIDE EFFECT, DISCLOSED: dropping and re-adding the column moves is_verified
-- from attnum 7 to the end of profiles. Nothing selects `*` and relies on
-- position -- every reader names columns -- and no index, CHECK or policy
-- references it (profiles has indexes on email, phone, primary_role and the
-- pkey only, and 0 of 182 policies mention is_verified). Column-level grants on
-- it are also discarded by the drop, which is harmless and in fact desirable:
-- clients held neither INSERT nor UPDATE on it, and a generated column cannot
-- be written by anyone at all. Table-level SELECT covers the new column.
--
-- ROWS AFFECTED: profiles = 0. The generated values are computed for every
-- existing row on ADD COLUMN, so on a populated table this would rewrite it.
-- =============================================================================

-- The view depends on the column, so it goes first.
DROP VIEW IF EXISTS public.profiles_public;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_verified;

ALTER TABLE public.profiles
  ADD COLUMN is_verified boolean
  GENERATED ALWAYS AS (COALESCE(verification_level = 'full'::text, false)) STORED;

COMMENT ON COLUMN public.profiles.is_verified IS
  'Generated. (verification_level = ''full''). Identity verification of the '
  'HUMAN, granted only by admin approval. Not writable -- set verification_level '
  'instead. Distinct from user_roles.is_verified (role approval) and '
  'service_providers.is_verified (business verification).';

COMMENT ON COLUMN public.profiles.verification_level IS
  'The single source of truth for identity verification: none | phone | id | '
  'full. ''id'' means documents submitted and awaiting review, NOT verified. '
  'profiles.is_verified is generated from this column.';

-- Recreated with the same projection. See the header for why this exact form.
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.is_verified
FROM public.profiles p
WHERE p.id = auth.uid()
   OR EXISTS (SELECT 1 FROM service_providers sp
               WHERE sp.user_id = p.id AND sp.is_active = true)
   OR EXISTS (SELECT 1 FROM reviews r
               WHERE r.reviewer_id = p.id AND r.is_hidden = false)
   OR EXISTS (SELECT 1 FROM bookings b
               JOIN service_providers sp2 ON sp2.id = b.provider_id
               WHERE b.customer_id = p.id AND sp2.user_id = auth.uid())
   OR EXISTS (SELECT 1 FROM listings l
               WHERE l.landlord_id = p.id AND l.status = 'active'::text);

-- A single-table view is auto-updatable and runs with owner rights, so a write
-- through it would bypass RLS on profiles entirely. Read-only by grant.
ALTER VIEW public.profiles_public SET (security_invoker = false);
REVOKE ALL ON public.profiles_public FROM anon, authenticated, service_role;
GRANT SELECT ON public.profiles_public TO anon, authenticated, service_role;


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  gen  char;
  expr text;
  n    int;
BEGIN
  -- ---- the column is generated, and by the measured expression -----------
  SELECT a.attgenerated, pg_get_expr(d.adbin, d.adrelid)
    INTO gen, expr
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
   WHERE a.attrelid = 'public.profiles'::regclass AND a.attname = 'is_verified';

  IF gen IS DISTINCT FROM 's' THEN
    RAISE EXCEPTION 'profiles.is_verified is not a STORED generated column (attgenerated=%)',
      coalesce(gen, '<null>');
  END IF;

  -- The threshold is the whole point. If a future change relaxes this to
  -- <> 'none', the public verified badge silently starts appearing for users
  -- whose documents are merely submitted.
  IF expr IS NULL OR position('''full''' in expr) = 0 THEN
    RAISE EXCEPTION 'profiles.is_verified is not derived from the ''full'' level: %',
      coalesce(expr, '<null>');
  END IF;

  -- ---- and it is therefore unwritable by anyone, including service_role ---
  IF has_column_privilege('authenticated','public.profiles','is_verified','UPDATE')
     OR has_column_privilege('anon','public.profiles','is_verified','UPDATE')
     OR has_column_privilege('authenticated','public.profiles','is_verified','INSERT')
     OR has_column_privilege('anon','public.profiles','is_verified','INSERT')
  THEN
    RAISE EXCEPTION 'a client holds a write privilege on the generated column is_verified';
  END IF;

  -- ---- readers must still be able to read it -----------------------------
  IF NOT has_column_privilege('authenticated','public.profiles','is_verified','SELECT')
     OR NOT has_column_privilege('anon','public.profiles','is_verified','SELECT')
  THEN
    RAISE EXCEPTION 'is_verified is no longer readable; the drop discarded a SELECT grant';
  END IF;

  -- ---- the trust columns withheld from clients are still withheld --------
  -- Re-adding a column resets its grants, so this re-checks the siblings too.
  IF has_column_privilege('authenticated','public.profiles','verification_level','UPDATE')
     OR has_column_privilege('authenticated','public.profiles','verification_level','INSERT')
  THEN
    RAISE EXCEPTION 'verification_level became client-writable';
  END IF;

  -- ---- the view is back, with the right projection and security mode -----
  SELECT count(*) INTO n
    FROM pg_attribute
   WHERE attrelid = 'public.profiles_public'::regclass
     AND attnum > 0 AND NOT attisdropped
     AND attname IN ('id','full_name','avatar_url','is_verified');
  IF n <> 4 THEN
    RAISE EXCEPTION 'profiles_public does not project the expected 4 columns (found %)', n;
  END IF;

  IF (SELECT count(*) FROM pg_attribute
       WHERE attrelid='public.profiles_public'::regclass AND attnum>0 AND NOT attisdropped) <> 4 THEN
    RAISE EXCEPTION 'profiles_public projects extra columns';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
     WHERE c.oid = 'public.profiles_public'::regclass
       AND c.reloptions @> ARRAY['security_invoker=false']
  ) THEN
    RAISE EXCEPTION 'profiles_public lost security_invoker=false; RLS on profiles would now apply inside it';
  END IF;

  IF NOT has_table_privilege('anon','public.profiles_public','SELECT')
     OR NOT has_table_privilege('authenticated','public.profiles_public','SELECT') THEN
    RAISE EXCEPTION 'profiles_public is not readable by the client roles';
  END IF;

  IF has_table_privilege('anon','public.profiles_public','INSERT')
     OR has_table_privilege('authenticated','public.profiles_public','INSERT')
     OR has_table_privilege('anon','public.profiles_public','UPDATE')
     OR has_table_privilege('authenticated','public.profiles_public','UPDATE') THEN
    RAISE EXCEPTION 'profiles_public is writable; a write through it would bypass RLS on profiles';
  END IF;

  -- ---- the derivation actually computes what the code used to write ------
  -- A guard that only inspects the catalog cannot fail for a wrong threshold.
  -- These four evaluate the real expression.
  IF COALESCE('full'::text = 'full', false) IS NOT TRUE THEN
    RAISE EXCEPTION 'derivation self-check failed for level full';
  END IF;
  IF COALESCE('id'::text = 'full', false) IS NOT FALSE THEN
    RAISE EXCEPTION 'derivation self-check failed for level id';
  END IF;
  IF COALESCE('phone'::text = 'full', false) IS NOT FALSE THEN
    RAISE EXCEPTION 'derivation self-check failed for level phone';
  END IF;
  IF COALESCE(NULL::text = 'full', false) IS NOT FALSE THEN
    RAISE EXCEPTION 'derivation self-check failed for a NULL level';
  END IF;

  RAISE NOTICE 'verification_single_source: all guards passed';
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
--
-- DROP VIEW IF EXISTS public.profiles_public;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_verified;
-- ALTER TABLE public.profiles ADD COLUMN is_verified boolean DEFAULT false;
-- -- then recreate the view exactly as above, and restore the four code sites
-- -- to write is_verified alongside verification_level.
--
-- NOT a clean reversal: the generated values are discarded and the column comes
-- back empty (default false) for every row, so any profile whose
-- verification_level is 'full' would read as unverified until something wrote
-- the flag again. Reversible here only because profiles holds 0 rows.
-- =============================================================================
