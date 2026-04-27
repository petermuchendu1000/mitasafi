-- Verify PostgreSQL version and INCLUDE support
-- Run this to diagnose the INCLUDE clause error

-- 1. Check PostgreSQL version
SELECT version();

-- 2. Check if INCLUDE is supported (PostgreSQL 11+)
-- If this query works, INCLUDE is supported
DO $$
BEGIN
  -- Try creating a test index with INCLUDE
  CREATE INDEX CONCURRENTLY IF NOT EXISTS test_include_support
  ON profiles(id)
  INCLUDE (email);
  
  -- If we get here, INCLUDE is supported
  RAISE NOTICE 'INCLUDE clause IS supported on this PostgreSQL version';
  
  -- Clean up test index
  DROP INDEX IF EXISTS test_include_support;
EXCEPTION
  WHEN syntax_error THEN
    RAISE EXCEPTION 'INCLUDE clause NOT supported - PostgreSQL version is < 11';
END $$;

-- 3. Check current indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 4. Check if partial indexes are supported
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%WHERE%'
LIMIT 5;
