-- Verify performance optimizations are deployed
-- Run this in Supabase SQL Editor

-- 1. Check if indexes exist
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 2. Check if materialized view exists
SELECT 
  matviewname, 
  ispopulated,
  definition
FROM pg_matviews
WHERE matviewname = 'services_with_categories';

-- 3. Check row count in materialized view
SELECT COUNT(*) as service_count
FROM services_with_categories;

-- 4. Sample data from materialized view
SELECT *
FROM services_with_categories
LIMIT 10;

-- 5. Check index usage stats
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 20;
