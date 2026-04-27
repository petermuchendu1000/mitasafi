# ⚡ Performance Monitoring Quick Start

## 🎯 What We Built

A comprehensive performance monitoring system that tracks:
- ✅ Proxy middleware execution (every request)
- ✅ Database queries
- ✅ Session refresh times
- ✅ Page compilation times
- ✅ Component render times
- ✅ Client-side page loads
- ✅ Data fetching operations

## 🚀 Quick Start

### 1. Start the Dev Server
```bash
npm run dev
```

### 2. Open Your Browser
Navigate to any page, for example:
- http://localhost:3000/
- http://localhost:3000/login
- http://localhost:3000/dashboard

### 3. Watch the Terminal
You'll see detailed performance logs:

```
================================================================================
⚡ PERFORMANCE: Proxy Middleware
================================================================================
📊 Total Duration: 234.56ms
📝 Context: { pathname: '/login', method: 'GET' }

📈 Breakdown:
  🟢 1. route-check                 2.3ms   (1.0%)
  🟠 2. session-refresh-protected   180.4ms (77.0%)
  🟡 3. db-fetch-user-roles         45.2ms  (19.3%)
  🟢 4. route-classification        6.7ms   (2.9%)
================================================================================
```

### 4. Check Browser Console
Open DevTools Console (F12) to see:
- Page load performance
- Component render times
- Data fetching durations

```
🚀 PAGE LOAD PERFORMANCE
📊 TOTAL: 1.2s
🟢 [Component] LoginPage { mountTime: 23.4ms }
```

## 📊 Understanding the Output

### Performance Indicators
- 🟢 **Fast** (< 50ms) - Good performance
- 🟡 **Okay** (50-200ms) - Acceptable
- 🟠 **Slow** (200-500ms) - Needs attention
- 🔴 **Critical** (> 500ms) - Requires optimization

### Key Metrics

#### Proxy Middleware (runs on every request)
- `route-check`: Time to determine if route is public/protected
- `session-refresh`: Time to refresh Supabase session
- `db-fetch-user-roles`: Time to query user_roles table
- `auth-route-logic`: Time for authentication redirects

#### Page Rendering
- `compile`: First-time compilation (dev only)
- `render`: Server-side rendering time
- Client metrics: DOM processing, hydration

## 🔧 Common Issues & Solutions

### Issue: Proxy takes 2-4 seconds
**Symptoms:** Every request shows high `session-refresh` or `db-fetch-user-roles` time

**Solutions:**
1. Check Supabase connection
2. Implement role caching
3. Reduce DB queries

### Issue: First load is very slow (30s)
**Symptoms:** High `compile` time on first visit

**Solutions:**
1. This is normal in dev mode (first-time compilation)
2. Test in production mode: `npm run build && npm run start`
3. Keep dev server running to maintain cache

### Issue: Render time is high (5-15s)
**Symptoms:** High `render` time in terminal logs

**Solutions:**
1. Lazy load below-the-fold components
2. Optimize images
3. Reduce component count
4. Implement code splitting

## 📈 Optimization Workflow

### Step 1: Identify the Slowest Operation
Look at the performance breakdown and find the operation with the highest percentage.

Example:
```
🔴 1. db-fetch-user-roles         1.2s  (52.2%)  ← OPTIMIZE THIS FIRST
🟠 2. session-refresh-protected   0.8s  (34.8%)
🟢 3. route-classification        0.2s  (8.7%)
```

### Step 2: Optimize That Operation
- Database query slow? → Add indexes, cache results
- Session refresh slow? → Check network, implement caching
- Render slow? → Lazy load, code split, optimize images

### Step 3: Measure Again
Make the change and reload the page. Compare the new metrics.

### Step 4: Repeat
Continue optimizing the next slowest operation.

## 🎓 Examples

### Example 1: Add Performance Tracking to a New Page

```tsx
// src/app/my-page/page.tsx
import { PerformanceLogger } from '@/lib/performance'

export default async function MyPage() {
  const perf = new PerformanceLogger('MyPage')
  
  perf.start('data-fetch')
  const data = await fetchSomeData()
  perf.end('data-fetch')
  
  perf.start('processing')
  const processed = processData(data)
  perf.end('processing')
  
  perf.logSummary(100) // Only log if >100ms
  
  return <div>{/* content */}</div>
}
```

### Example 2: Track Client Component Performance

```tsx
// src/components/MyComponent.tsx
'use client'

import { useComponentPerformance, useMeasureAsync } from '@/lib/performance'

export function MyComponent() {
  useComponentPerformance('MyComponent')
  const measureAsync = useMeasureAsync()
  
  const handleClick = async () => {
    await measureAsync('api-call', async () => {
      await fetch('/api/something')
    })
  }
  
  return <button onClick={handleClick}>Click me</button>
}
```

### Example 3: Track Data Fetching

```tsx
'use client'

import { useDataFetchPerformance } from '@/lib/performance'

export function MyComponent() {
  const { startAsync, endAsync } = useDataFetchPerformance('loadData')
  
  const loadData = async () => {
    const mark = startAsync()
    const data = await fetch('/api/data')
    endAsync(mark)
    return data
  }
  
  return <button onClick={loadData}>Load</button>
}
```

## 🛠️ Advanced Configuration

### Adjust Logging Thresholds

By default, logs only show if operations exceed certain thresholds:
- Proxy: 100ms
- Session: 50ms
- Page render: 500ms

To see all operations (even fast ones):
```typescript
perf.logSummary(0) // Log everything
```

To only see critical issues:
```typescript
perf.logSummary(1000) // Only log if >1 second
```

### Structured Logging (for production monitoring)

```typescript
perf.logStructured() // Outputs JSON
```

This is useful for sending to monitoring services like Datadog, New Relic, etc.

## 📖 Full Documentation

For detailed analysis and optimization strategies, see:
- [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) - Complete guide
- `src/lib/performance/logger.ts` - Server-side utilities
- `src/lib/performance/client.tsx` - Client-side utilities

## 🚦 Next Steps

1. ✅ Run the dev server and observe the logs
2. ⏳ Identify your slowest operations
3. ⏳ Read the full [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md)
4. ⏳ Start optimizing one component at a time
5. ⏳ Measure improvements and iterate

## 💡 Pro Tips

1. **Keep dev server running** - Avoid compilation on every restart
2. **Test in production mode** - Use `npm run build && npm run start` for realistic timings
3. **Focus on one issue at a time** - Don't try to optimize everything at once
4. **Measure before and after** - Always verify your optimizations work
5. **Check browser DevTools** - Network and Performance tabs are your friends

---

**Questions?** Check [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) or ask for help!
