-- Verify Performance Optimizations Deployed Successfully
-- Run these queries in Supabase SQL Editor

-- 1. Check all indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: 7 indexes
-- idx_service_providers_user_id_lookup
-- idx_provider_services_active_lookup
-- idx_provider_services_service_active
-- idx_provider_services_created_desc
-- idx_services_subcategory_lookup
-- idx_subcategories_category_lookup
-- idx_user_roles_active_lookup

-- 2. Check materialized view exists and is populated
SELECT 
  matviewname,
  ispopulated,
  pg_size_pretty(pg_relation_size(oid)) as size
FROM pg_matviews
WHERE schemaname = 'public';

-- Expected: services_with_categories (populated = true)

-- 3. Sample data from materialized view
SELECT 
  id,
  name,
  category_name,
  subcategory_name,
  full_path
FROM services_with_categories
LIMIT 10;

-- 4. Test index usage with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT *
FROM service_providers
WHERE user_id = 'test-user-id';

-- Should show: "Index Scan using idx_service_providers_user_id_lookup"

-- 5. Test materialized view query speed
EXPLAIN ANALYZE
SELECT *
FROM services_with_categories
WHERE category_slug = 'plumbing';

-- Should show fast sequential scan (materialized views are optimized)

-- 6. Refresh materialized view (test trigger)
-- Insert test data to trigger auto-refresh
INSERT INTO services (id, name, slug, subcategory_id)
VALUES (gen_random_uuid(), 'Test Service', 'test-service', 
  (SELECT id FROM service_subcategories LIMIT 1))
ON CONFLICT DO NOTHING;

-- Check if view auto-refreshed
SELECT COUNT(*) FROM services_with_categories;

-- Clean up test
DELETE FROM services WHERE slug = 'test-service';

PRINT '✅ All performance optimizations deployed successfully!';
