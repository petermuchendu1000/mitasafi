-- =============================================================================
-- CI bootstrap: the Supabase-managed surface the migrations assume exists
-- =============================================================================
-- The migrations in supabase/migrations are written against a Supabase
-- project, where the auth and storage schemas, the three client roles and the
-- extensions schema are provisioned by the platform. A bare postgres image has
-- none of that, so this file creates the minimum surface the migrations
-- actually reference.
--
-- Scope derived by grepping the migrations rather than guessing:
--   auth.uid()            200 references
--   auth.users             19 references (only the id column is used)
--   storage.objects        39 references
--   storage.foldername     18 references
--   storage.buckets        14 references
--   roles anon / authenticated / service_role, granted across 32 files
--   extensions: pgcrypto (in schema `extensions`), btree_gist
--
-- This is a TEST DOUBLE, not a reproduction of Supabase. It is deliberately
-- minimal and deliberately NOT used anywhere but CI. Two consequences worth
-- stating:
--   - auth.uid() returns the request-local GUC, so a CI test that wants to act
--     as a user sets `request.jwt.claim.sub` exactly as Supabase does.
--   - RLS behaviour under these roles is real: the roles are real roles and
--     the policies are the real policies.
-- =============================================================================

-- ── schemas ──────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

-- ── extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- gen_random_uuid() lives in pg_catalog from PG13 on, so no shim is needed.

-- ── client roles ─────────────────────────────────────────────────────────────
-- NOLOGIN matches Supabase: these are assumed via SET ROLE by PostgREST, never
-- connected to directly. service_role carries BYPASSRLS, as it does in Supabase.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public  TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth    TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- The statement_timeouts the live project sets per role. Included because a
-- suite asserting timeout behaviour would otherwise pass for the wrong reason.
ALTER ROLE anon          SET statement_timeout = '3s';
ALTER ROLE authenticated SET statement_timeout = '8s';

-- ── auth ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.users (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Supabase's auth.uid() reads the sub claim out of the request GUC. Same here,
-- so policies behave identically and a test can act as a specific user with
--   SELECT set_config('request.jwt.claim.sub', '<uuid>', true);
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

GRANT SELECT ON auth.users TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

-- ── storage ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS storage.buckets (
  id                 text PRIMARY KEY,
  name               text NOT NULL,
  public             boolean NOT NULL DEFAULT false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id  text REFERENCES storage.buckets(id),
  name       text,
  owner      uuid,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Supabase's helper: splits an object path into its folder segments. Policies
-- use storage.foldername(name)[1] to scope a user to their own prefix.
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
BEGIN
  parts := string_to_array(name, '/');
  RETURN parts[1:array_length(parts, 1) - 1];
END
$$;

GRANT ALL ON storage.buckets, storage.objects TO service_role;
GRANT SELECT ON storage.buckets TO anon, authenticated;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated, service_role;

-- ── migration ledger ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  name    text,
  statements text[]
);

-- ── default privileges, as Supabase sets them ────────────────────────────────
-- Migrations REVOKE from these roles expecting the grants to be there; without
-- this the revoke assertions would pass trivially because nothing was granted.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

DO $$
BEGIN
  RAISE NOTICE 'CI bootstrap complete: auth, storage, roles, extensions and the migration ledger are in place.';
END
$$;
