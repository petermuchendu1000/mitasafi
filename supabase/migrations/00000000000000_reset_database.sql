-- ===========================================
-- MITASAFI DATABASE RESET SCRIPT
-- ===========================================
-- ⚠️ WARNING: This script will DELETE ALL DATA!
-- Run this in Supabase Dashboard → SQL Editor
-- ===========================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- ===========================================
-- DROP ALL TABLES IN PUBLIC SCHEMA
-- ===========================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- ===========================================
-- DROP ALL VIEWS IN PUBLIC SCHEMA
-- ===========================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', r.viewname;
    END LOOP;
END $$;

-- ===========================================
-- DROP ALL CUSTOM TYPES/ENUMS
-- ===========================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT t.typname
        FROM pg_type t
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        AND t.typtype = 'e'  -- enum types
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        RAISE NOTICE 'Dropped type: %', r.typname;
    END LOOP;
END $$;

-- ===========================================
-- DROP ALL FUNCTIONS IN PUBLIC SCHEMA
-- ===========================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- regular functions
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
        RAISE NOTICE 'Dropped function: %', r.proname;
    END LOOP;
END $$;

-- ===========================================
-- DROP ALL TRIGGERS (on auth.users if any)
-- ===========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ===========================================
-- CLEAN UP STORAGE BUCKETS (Optional)
-- ===========================================
-- Note: This doesn't delete files, just the bucket definitions
-- You may want to do this manually in the dashboard

-- DELETE FROM storage.buckets WHERE name IN ('avatars', 'properties', 'documents');

-- ===========================================
-- RE-ENABLE TRIGGERS
-- ===========================================

SET session_replication_role = 'origin';

-- ===========================================
-- VERIFY CLEANUP
-- ===========================================

-- Check remaining tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check remaining types
SELECT typname FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public' AND t.typtype = 'e';

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE RESET COMPLETE!';
    RAISE NOTICE 'All tables, views, types, and functions dropped.';
    RAISE NOTICE 'Ready for fresh Mitasafi schema.';
    RAISE NOTICE '========================================';
END $$;
