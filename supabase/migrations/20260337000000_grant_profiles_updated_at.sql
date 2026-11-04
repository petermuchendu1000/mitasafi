-- =============================================================================
-- Restore UPDATE on profiles.updated_at — a regression I introduced
-- =============================================================================
-- 20260329000000_lock_client_write_surface.sql dropped the table-level UPDATE on
-- public.profiles and re-granted columns BY NAME. The intent was to stop a user
-- setting their own trust flags. It granted six columns:
--
--   avatar_url, email, full_name, metadata, phone, primary_role
--
-- and withheld five: id, created_at, updated_at, is_verified, verification_level.
--
-- Four of those five are deliberate. `updated_at` was not: it is a bookkeeping
-- column, not a trust signal, and the application writes it on EVERY profile
-- update. The sibling migration proves the oversight rather than a decision --
-- on service_providers the same lockdown granted 42 of 50 columns and DID
-- include updated_at.
--
-- MEASURED CONSEQUENCE (live, as `authenticated`, WHERE false so no row moves):
--   UPDATE profiles SET full_name, phone, avatar_url  -> allowed
--   UPDATE profiles SET full_name, updated_at         -> 42501
--   UPDATE profiles SET metadata, updated_at          -> 42501
--
-- So two user-facing paths have been failing on every call:
--   src/app/dashboard/profile/actions.ts:137  — updates.updated_at is set
--     unconditionally before the UPDATE, so editing your own name or phone
--     always returns `permission denied for table profiles`, which is handed
--     straight to the UI.
--   src/app/dashboard/settings/actions.ts:209 — the account-deletion request
--     writes metadata + updated_at, so the deletion flag is never stored and
--     the user is told "Failed to submit request".
--
-- Why the regression shipped: the assertion I wrote to cover it,
-- client_write_surface_test.sql:188, was
--     UPDATE profiles SET full_name='x', phone='y', avatar_url='z' WHERE false;
-- i.e. exactly the columns the migration granted. It was derived from the grant
-- instead of from the payload the application sends, so it could not fail for
-- this defect. The assertion is corrected in the same commit as this migration.
--
-- Scope: this grants ONE bookkeeping column. The four trust/identity columns
-- stay revoked, and the guard below fails the migration if that ever stops
-- being true, so this cannot quietly become a wider grant.
-- =============================================================================

GRANT UPDATE (updated_at) ON public.profiles TO authenticated;

DO $$
DECLARE
  leaked text;
BEGIN
  -- The columns that must REMAIN unwritable by a client. If a future change
  -- hands any of these to `authenticated`, this migration stops the deploy.
  SELECT string_agg(c, ', ' ORDER BY c) INTO leaked
  FROM unnest(ARRAY['id','created_at','is_verified','verification_level']) AS c
  WHERE has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE');

  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'profiles trust columns became client-writable: %', leaked;
  END IF;

  -- And the column this migration exists to restore must actually be restored.
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'profiles.updated_at is still not writable by authenticated';
  END IF;

  -- Table-level UPDATE must stay dropped; otherwise the column grants are
  -- decorative (a column REVOKE is inert while the table privilege is held).
  IF has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.column_privileges
       WHERE table_schema='public' AND table_name='profiles'
         AND grantee='authenticated' AND privilege_type='UPDATE'
     ) THEN
    RAISE EXCEPTION 'table-level UPDATE on profiles is back; column grants are moot';
  END IF;
END
$$;
