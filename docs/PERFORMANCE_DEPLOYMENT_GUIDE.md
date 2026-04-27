# Performance Optimization - Quick Deployment Guide

## Prerequisites
- ✅ Migrations created in `supabase/migrations/`
- ✅ Code changes completed and compiled
- ✅ No TypeScript errors

## Deployment Steps

### 1. Deploy Database Migrations

**Option A: Using Supabase CLI (Local → Remote)**
```bash
# Link to your project (if not already linked)
npx supabase link --project-ref syoolvgoaqnckgmngvse

# Push migrations to remote database
npx supabase db push
```

**Option B: Using Supabase Dashboard (Manual)**
1. Go to https://supabase.com/dashboard/project/syoolvgoaqnckgmngvse/sql/new
2. Copy content of `supabase/migrations/20260109150000_performance_indexes.sql`
3. Run the migration
4. Copy content of `supabase/migrations/20260109150001_materialized_views.sql`
5. Run the migration

**Verify Deployment:**
```sql
-- Check if indexes exist
SELECT count(*) FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
-- Expected: 7

-- Check if materialized view exists
SELECT count(*) FROM services_with_categories;
-- Expected: Should return number of services (>0)
```

### 2. Test Application

**Start Dev Server:**
```bash
npm run dev
```

**Test Pages:**
1. Navigate to http://localhost:3000/dashboard/provider
   - Should load in <700ms (previously ~2.4s)
   
2. Navigate to /dashboard/provider/services
   - Should load in <250ms (previously ~1.3s)
   
3. Navigate to /dashboard/provider/services/new
   - Should load in <800ms (previously ~3.1s)

**Check Browser DevTools:**
- Network tab → Check "render" timing
- Console → Look for any errors

### 3. Monitor Performance

**In Browser Console:**
```javascript
// Time a page navigation
console.time('page-load');
// Navigate to page
console.timeEnd('page-load');
```

**Check Database Performance:**
```sql
-- Check index usage (run after testing)
SELECT indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Verify materialized view is being used
SELECT * FROM services_with_categories LIMIT 1;
```

### 4. Verify No Regressions

**Functionality Checklist:**
- [ ] Provider signup works
- [ ] Provider dashboard loads
- [ ] Services list displays correctly
- [ ] Add service wizard works
- [ ] Service details display correctly
- [ ] Active/inactive toggle works
- [ ] Search functionality works

## Expected Results

### Performance Improvements
| Page | Before | After | Improvement |
|------|--------|-------|-------------|
| Dashboard | 2.4s | ~700ms | 3.4x faster |
| Services | 1.3s | ~250ms | 5.2x faster |
| Add Service | 3.1s | ~800ms | 3.9x faster |

### Database Metrics
- **Queries per page load:** 4-6 → 2 (60% reduction)
- **Layout overhead:** 290ms → 60ms (4.8x faster)
- **Service joins:** 150ms → 10ms (15x faster)

## Troubleshooting

### Issue: Migrations fail to deploy
**Solution:** Check if indexes already exist
```sql
-- Drop existing indexes if needed
DROP INDEX CONCURRENTLY IF EXISTS idx_service_providers_user_id_lookup;
-- Then re-run migration
```

### Issue: Materialized view errors
**Solution:** Verify source tables exist
```sql
-- Check if source tables have data
SELECT count(*) FROM services;
SELECT count(*) FROM service_subcategories;
SELECT count(*) FROM service_categories;
```

### Issue: Page still slow
**Solution:** Check if cache layer is being used
- Look for "[Cache]" log messages in console
- Verify imports in layout.tsx
- Check if React cache() is working

### Issue: Type errors
**Solution:** Rebuild TypeScript
```bash
npm run build
```

## Rollback (If Needed)

### Revert Code Changes
```bash
git checkout HEAD~1 src/app/dashboard/provider/layout.tsx
git checkout HEAD~1 src/app/dashboard/provider/services/actions.ts
git checkout HEAD~1 src/lib/cache/queries.ts
```

### Drop Database Optimizations
```sql
-- Drop indexes
DROP INDEX CONCURRENTLY idx_service_providers_user_id_lookup;
DROP INDEX CONCURRENTLY idx_provider_services_active_lookup;
DROP INDEX CONCURRENTLY idx_services_subcategory_lookup;
DROP INDEX CONCURRENTLY idx_subcategories_category_lookup;
DROP INDEX CONCURRENTLY idx_user_roles_active_lookup;
DROP INDEX CONCURRENTLY idx_provider_services_created_desc;
DROP INDEX CONCURRENTLY idx_provider_services_service_active;

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS services_with_categories;
```

## Success Criteria

✅ **Deployment successful if:**
1. All migrations run without errors
2. Page loads are 3-5x faster
3. No functional regressions
4. No console errors
5. Database indexes show usage (idx_scan > 0)

## Next Steps After Deployment

1. **Monitor for 24-48 hours**
   - Track actual performance metrics
   - Watch for any unexpected errors
   - Gather user feedback

2. **Fine-tune if needed**
   - Adjust index strategies
   - Optimize cache patterns
   - Add performance logging

3. **Document results**
   - Record actual vs predicted performance
   - Update success metrics
   - Share learnings with team

---

**Questions or Issues?**
Check `PERFORMANCE_IMPLEMENTATION_COMPLETE.md` for detailed technical information.
