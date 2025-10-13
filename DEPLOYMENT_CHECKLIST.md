# Zoho API Optimization - Deployment Checklist

## Pre-Deployment Checklist

### ✅ 1. Code Review
- [x] Prisma schema updated with new tables
- [x] Telemetry utility created
- [x] Optimized Zoho service implemented
- [x] API routes updated to use optimized service
- [x] Package.json includes p-limit dependency
- [x] All TypeScript files lint-free
- [x] Documentation created

### ✅ 2. Database Preparation
- [ ] Verify Supabase connection is active
- [ ] Run: `npx prisma validate` (should show "valid 🚀")
- [ ] Backup current database (optional but recommended)
- [ ] Ensure DATABASE_URL and DIRECT_URL are set correctly

### ✅ 3. Dependencies
- [ ] Run: `npm install` to ensure p-limit is installed
- [ ] Verify Prisma is up to date: `npx prisma --version`
- [ ] Check for any outdated critical packages: `npm outdated`

## Deployment Steps

### Step 1: Local Testing

#### 1a. Install Dependencies
```bash
npm install
```

#### 1b. Generate Prisma Client
```bash
npx prisma generate
```

#### 1c. Apply Database Migration
```bash
# Option 1: Create migration (recommended)
npx prisma migrate dev --name add_zoho_optimization_tables

# Option 2: Push schema directly (if migration fails)
npx prisma db push --skip-generate
```

#### 1d. Verify Tables Created
```bash
# Open Prisma Studio to verify tables
npx prisma studio

# Look for these tables:
# - zoho_token_cache
# - financial_data_cache  
# - performance_telemetry
```

#### 1e. Start Development Server
```bash
npm run dev
```

#### 1f. Test API Endpoints
```bash
# Test dashboard (should work with new optimized service)
curl http://localhost:3000/api/dashboard

# Test projects (should use caching)
curl http://localhost:3000/api/projects

# Test telemetry endpoint
curl http://localhost:3000/api/telemetry

# Expected telemetry response structure:
{
  "success": true,
  "timeRange": "Last 24 hours",
  "systemMetrics": { ... },
  "cacheStats": { ... }
}
```

#### 1g. Monitor First Dashboard Load
- [ ] Open browser to http://localhost:3000
- [ ] Check browser console for any errors
- [ ] Verify dashboard loads successfully
- [ ] Check server logs for:
  - "Using cached Zoho token from Supabase" or "Refreshing Zoho token"
  - "Using cached data for..." messages
  - No rate limit errors

#### 1h. Verify Caching Works
```bash
# First load (should be cache miss)
curl http://localhost:3000/api/projects
# Note the response time

# Second load (should be cache hit)
curl http://localhost:3000/api/projects
# Should be faster

# Check cache stats
curl http://localhost:3000/api/telemetry
# Should show cached items
```

### Step 2: Production Deployment

#### 2a. Commit Changes
```bash
git add .
git commit -m "feat: implement Zoho API optimizations with caching and telemetry"
```

#### 2b. Push to Repository
```bash
# Push to main branch (triggers Vercel deployment)
git push origin main

# Or deploy directly with Vercel CLI
vercel --prod
```

#### 2c. Verify Environment Variables in Vercel
Ensure these are set in Vercel dashboard:
- [ ] `DATABASE_URL` - Supabase pooled connection
- [ ] `DIRECT_URL` - Supabase direct connection
- [ ] `ZOHO_CLIENT_ID`
- [ ] `ZOHO_CLIENT_SECRET`
- [ ] `ZOHO_REFRESH_TOKEN`
- [ ] `ZOHO_ORGANIZATION_ID`
- [ ] All other existing environment variables

#### 2d. Run Migration in Production
```bash
# Option 1: Through Vercel CLI
vercel exec -- npx prisma migrate deploy

# Option 2: Through migration API endpoint (if you have one)
curl -X POST https://your-app.vercel.app/api/migrate

# Option 3: Manual migration using Prisma Studio
# Connect to production database and verify tables
```

#### 2e. Verify Production Deployment
```bash
# Test production endpoints
curl https://your-app.vercel.app/api/telemetry

# Expected: { "success": true, ... }
```

### Step 3: Post-Deployment Verification

#### 3a. Monitor First Production Load
- [ ] Open production URL in browser
- [ ] Check dashboard loads successfully
- [ ] Verify no console errors
- [ ] Check Vercel logs for any errors

#### 3b. Check Telemetry Data
```bash
# View telemetry in production
curl https://your-app.vercel.app/api/telemetry

# Should show:
# - totalApiCalls > 0
# - No high wait times (< 5000ms average)
# - Success rate near 100%
```

#### 3c. Verify Caching in Production
- [ ] Load dashboard multiple times
- [ ] Check telemetry for cache hit indicators
- [ ] Verify response times improve on subsequent loads

#### 3d. Monitor for 24 Hours
- [ ] Check Vercel logs daily
- [ ] Review telemetry metrics
- [ ] Look for rate limit issues
- [ ] Verify token refreshes happen ~hourly

### Step 4: Performance Validation

#### 4a. Measure Performance Improvements
```bash
# Get performance metrics
curl https://your-app.vercel.app/api/telemetry?hours=24

# Check for:
# - Low average wait times (< 2000ms)
# - High success rate (> 95%)
# - Few rate limit hits (< 5%)
# - Good cache hit rate
```

#### 4b. Compare Before/After
Track these metrics:
- [ ] Dashboard load time (should be 2-3s with cache)
- [ ] Rate limit errors (should be < 1%)
- [ ] API call count per dashboard load (should be ~3 with cache)
- [ ] Token refresh frequency (should be ~hourly)

## Rollback Plan

### If Issues Occur

#### Option 1: Revert API Routes
```bash
# Revert to use old zohoService instead of optimizedZohoService
# In app/api/dashboard/route.ts:
# Change: import { optimizedZohoService } from '@/lib/zohoOptimized';
# Back to: import { zohoService } from '@/lib/zoho';

# Redeploy
git add .
git commit -m "revert: rollback to original Zoho service"
git push origin main
```

#### Option 2: Keep New Tables, Use Old Service
- New tables won't cause issues if unused
- Simply revert API route imports
- Tables can be cleaned up later

#### Option 3: Full Rollback
```bash
# Revert entire commit
git revert HEAD
git push origin main

# Remove new tables from database (optional)
# npx prisma migrate dev --name remove_optimization_tables
```

## Troubleshooting Guide

### Issue: Migration Fails

**Solution 1**: Push schema directly
```bash
npx prisma db push --skip-generate
```

**Solution 2**: Check database connection
```bash
npx prisma studio
# If this works, connection is fine
```

**Solution 3**: Verify environment variables
```bash
echo $DATABASE_URL
echo $DIRECT_URL
```

### Issue: Cache Not Working

**Check 1**: Verify tables exist
```bash
npx prisma studio
# Look for: financial_data_cache, zoho_token_cache
```

**Check 2**: Check logs for cache errors
```bash
# In Vercel: Runtime Logs
# Search for: "Cache error" or "Failed to"
```

**Check 3**: Clear cache and retry
```bash
curl -X DELETE https://your-app.vercel.app/api/telemetry?action=clear-cache
```

### Issue: High Rate Limit Wait Times

**Solution 1**: Increase cache TTLs
```typescript
// In lib/zohoOptimized.ts
private readonly FINANCIAL_DATA_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
```

**Solution 2**: Reduce concurrent requests
```typescript
// In lib/zohoOptimized.ts
private readonly rateLimiter = pLimit(5); // Reduce to 5
```

**Solution 3**: Check if Zoho is having issues
- Visit Zoho Books API status page
- Check if organization has special rate limits

### Issue: Token Not Persisting

**Check 1**: Verify token cache table
```bash
npx prisma studio
# Check zoho_token_cache table has records
```

**Check 2**: Check expiry times
```sql
SELECT id, expires_at, created_at 
FROM zoho_token_cache 
ORDER BY created_at DESC 
LIMIT 5;
```

**Check 3**: Force refresh and verify
```bash
# Set in Vercel env vars temporarily:
ZOHO_FORCE_REFRESH=true

# Then reset to:
ZOHO_FORCE_REFRESH=false
```

## Success Criteria

### ✅ Deployment is Successful If:

1. **Database**
   - [ ] All 3 new tables exist in Supabase
   - [ ] No migration errors in logs
   - [ ] Prisma Studio shows tables

2. **Performance**
   - [ ] Dashboard loads in 2-3 seconds (cache hit)
   - [ ] Dashboard loads in 8-10 seconds (cache miss)
   - [ ] Telemetry shows < 5% rate limit hits
   - [ ] Average wait time < 2000ms

3. **Caching**
   - [ ] Cache stats show active items
   - [ ] Second dashboard load is faster than first
   - [ ] Token cached in database
   - [ ] Financial data cached for 1 hour

4. **Monitoring**
   - [ ] Telemetry endpoint responds successfully
   - [ ] Metrics show reasonable values
   - [ ] No critical errors in logs
   - [ ] Success rate > 95%

5. **User Experience**
   - [ ] Dashboard loads without errors
   - [ ] Data displays correctly
   - [ ] No visible performance degradation
   - [ ] Subsequent loads are faster

## Post-Deployment Tasks

### Week 1: Monitor Closely
- [ ] Check telemetry daily
- [ ] Review Vercel logs for errors
- [ ] Monitor rate limit hit rate
- [ ] Verify cache hit rate is improving

### Week 2: Optimize
- [ ] Review cache TTLs based on usage
- [ ] Adjust rate limiting if needed
- [ ] Clean up old telemetry data
- [ ] Fine-tune concurrency limits

### Week 3: Cleanup
- [ ] Remove old telemetry records (keep 30 days)
- [ ] Archive unused data
- [ ] Document any custom adjustments made

### Ongoing Maintenance
- [ ] Weekly: Check telemetry for anomalies
- [ ] Monthly: Review cache effectiveness
- [ ] Quarterly: Optimize cache TTLs
- [ ] As needed: Clear cache after Zoho data updates

## Support Contacts

**Database Issues**: Check Supabase dashboard  
**Vercel Deployment**: Check Vercel dashboard  
**Zoho API**: Check Zoho developer console  

**Key Log Locations**:
- Vercel Runtime Logs: https://vercel.com/your-org/your-app/logs
- Supabase Logs: https://app.supabase.com/project/your-project/logs
- Local Logs: Terminal output during `npm run dev`

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Verification Date**: _____________  
**Issues Encountered**: _____________  
**Status**: ⬜ Pending | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back

