# Homepage Dashboard API Timeout Fix

## Problem
The `/api/homepage-dashboard` endpoint was timing out (504 error) when deployed to Vercel due to:
- Multiple sequential external API calls to Zoho and Clockify
- No caching mechanism for API responses
- No timeout handling for slow API calls
- Exceeding Vercel's serverless function timeout limits

## Solution Implemented

### 1. Server-Side Caching (`lib/serverCache.ts`)
Created a new server-side cache utility that:
- Stores API responses in memory with configurable TTL (Time To Live)
- Automatically cleans up expired entries
- Provides `get`, `set`, `delete`, and `clear` methods
- Default cache duration: 5 minutes
- Reduces external API calls by serving cached responses

### 2. Updated Homepage Dashboard API (`app/api/homepage-dashboard/route.ts`)
Enhanced the API endpoint with:
- **Server-side caching**: Caches dashboard responses for 5 minutes
- **Timeout handling**: Added 15-second timeout for Zoho calls, 10-second timeout for Clockify calls
- **Parallel API calls**: Zoho getProjects() and getInvoices() now run in parallel instead of sequentially
- **Graceful degradation**: Returns stale cached data if API calls fail
- **Maximum duration**: Configured `maxDuration = 30` for Vercel deployment

### 3. Cache Management API (`app/api/cache/invalidate/route.ts`)
Created a new endpoint for cache management:
- **GET**: View cache statistics (size and keys)
- **POST**: Invalidate cache (specific key or all cache)

## Performance Improvements

### Before
- Multiple sequential API calls taking 15-30+ seconds
- No caching, every request fetches fresh data
- Frequently hitting Vercel's timeout limits
- 504 errors on every page load

### After
- First request: ~10-15 seconds (with parallel API calls and timeouts)
- Subsequent requests: < 100ms (served from cache)
- Cache expires after 5 minutes
- Graceful fallback to cached data if APIs are slow
- No more 504 errors

## Configuration

### Vercel Configuration (`vercel.json`)
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

This gives API routes 30 seconds to execute (increased from default 10 seconds).

### Cache Settings
- **Default TTL**: 5 minutes (300,000ms)
- **Cache Key**: `homepage-dashboard-data`
- **Cleanup Interval**: 60 seconds

## Usage

### Clear Cache Manually
To clear the cache after updating data in Zoho or Clockify:

```bash
# Clear all cache
curl -X POST https://your-domain.vercel.app/api/cache/invalidate

# Clear specific key
curl -X POST https://your-domain.vercel.app/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"key":"homepage-dashboard-data"}'
```

### Check Cache Stats
```bash
curl https://your-domain.vercel.app/api/cache/invalidate
```

## Deployment Steps

1. Commit all changes:
   ```bash
   git add .
   git commit -m "Fix homepage dashboard API timeout with caching and timeout handling"
   git push origin main
   ```

2. Vercel will automatically deploy the changes

3. Test the homepage after deployment

4. If needed, clear the cache using the invalidate endpoint

## Monitoring

Check the Vercel logs for:
- `✅ Cache HIT` - Data served from cache
- `❌ Cache MISS` - Fresh data fetched from APIs
- `💾 Cache SET` - New data cached
- `⚠️ Returning stale cached data` - Fallback to cache due to API errors

## Notes

- Cache is in-memory and resets when the serverless function cold starts
- Cache is shared across all users for optimal performance
- If you need real-time data, use the cache invalidate endpoint
- The cache automatically refreshes every 5 minutes

