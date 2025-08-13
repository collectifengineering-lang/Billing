# Zoho Improvements Deployment Guide

This guide covers the deployment and testing of the enhanced Zoho token refresh logic, rate limit handling, and authentication improvements.

## 🚀 What's Been Updated

### Zoho Token Refresh (`lib/zoho.ts`)
- ✅ Increased maximum retries from 3 to 5
- ✅ Extended backoff delays: base delay 5000ms with exponential increase (delay = base * 2^attempt)
- ✅ Added token expiration check before refresh
- ✅ Enhanced rate limit error logging with headers (X-Rate-Limit, Retry-After)
- ✅ Fallback to cached access token if refresh fails
- ✅ Manual refresh override via `ZOHO_FORCE_REFRESH=false` environment variable

### Dashboard & Invoices APIs
- ✅ Authentication error handling with partial data fallback
- ✅ Warning messages for rate limit issues
- ✅ API call count monitoring per request
- ✅ Graceful degradation when Zoho is unavailable

### BambooHR Integration (`lib/bamboohr.ts`)
- ✅ Enhanced logging for employee count and import results
- ✅ Pagination verification for large employee datasets
- ✅ Detailed error breakdown and categorization
- ✅ Success rate calculations

## 🔧 Environment Variables

Add this new variable to your `.env.local` and Vercel environment:

```bash
ZOHO_FORCE_REFRESH=false
```

**Note:** Set to `true` only during testing to force token refresh. Keep as `false` in production.

## 🧪 Local Testing

### 1. Build and Start
```bash
npm run build
npm run dev
```

### 2. Test APIs
```bash
# Test homepage dashboard
curl -X GET http://localhost:3000/api/homepage-dashboard

# Test invoices
curl -X GET http://localhost:3000/api/invoices

# Test BambooHR import
curl -X POST "http://localhost:3000/api/payroll/bamboohr" \
  -H "Content-Type: application/json" \
  -d '{"action":"import-data"}'
```

### 3. Run Test Suite
```bash
node scripts/test-zoho-improvements.js
```

## 🌐 Production Deployment

### 1. Manual Token Refresh (One-time)
Get a fresh access token and update Vercel environment:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=refresh_token" \
  -d "client_id=<your_client_id>" \
  -d "client_secret=<your_client_secret>" \
  -d "refresh_token=<your_refresh_token>"
```

**Response will include:**
- `access_token`: New access token
- `expires_in`: Token validity in seconds
- `api_domain`: API endpoint domain

### 2. Deploy to Vercel
```bash
git add .
git commit -m "feat: Enhanced Zoho token refresh with rate limit handling"
git push origin main
```

### 3. Verify Deployment
```bash
# Test homepage dashboard on Vercel
curl -X GET "https://billing-collectif-engineering.vercel.app/api/homepage-dashboard"

# Test BambooHR import on Vercel
curl -X POST "https://billing-collectif-engineering.vercel.app/api/payroll/bamboohr" \
  -H "Content-Type: application/json" \
  -d '{"action":"import-data"}'
```

## 📊 Monitoring & Logs

### Check Vercel Logs
1. Go to Vercel Dashboard
2. Select your project
3. Click "Functions" tab
4. Monitor API function logs for:
   - Token refresh attempts
   - Rate limit warnings
   - API call counts
   - Authentication errors

### Key Log Messages to Watch
```
✅ Token refreshed successfully. Expires in X minutes
⚠️ Zoho token refresh rate-limited (attempt X/5)
⚠️ Zoho authentication failed due to rate limits. Showing partial data.
📊 Zoho API calls made in this request: X
```

## ⏰ Cron Job Setup

### Vercel Cron Configuration
Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/payroll/bamboohr",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule:** Daily at 2:00 AM UTC
**Payload:** `{"action":"import-data"}`

### Manual Cron Test
```bash
curl -X POST "https://billing-collectif-engineering.vercel.app/api/payroll/bamboohr" \
  -H "Content-Type: application/json" \
  -d '{"action":"import-data"}' \
  -H "Authorization: Bearer <vercel-cron-secret>"
```

## 🔍 Troubleshooting

### Rate Limit Issues
1. **Check daily API limits** in Zoho dashboard
2. **Verify token validity** - tokens expire after 1 hour
3. **Monitor usage patterns** - avoid burst requests
4. **Consider upgrading plan** if consistently hitting limits

### Authentication Errors
1. **Verify environment variables** are set correctly
2. **Check OAuth scopes** include `ZohoBooks.reports.READ`
3. **Regenerate refresh token** if persistent issues
4. **Verify organization ID** matches Zoho account

### Common Error Messages
```
❌ Zoho token refresh rate-limited. Check daily API limits or token validity.
⚠️ Zoho authentication failed due to rate limits. Showing partial data.
⚠️ Missing ZohoBooks.reports.READ scope. Regenerate token.
```

## 📈 Performance Improvements

### What to Expect
- **Faster recovery** from rate limits (exponential backoff)
- **Better error handling** with fallback tokens
- **Reduced API calls** with token expiration checks
- **Improved monitoring** with call count tracking

### Metrics to Track
- Token refresh success rate
- API call frequency per request
- Rate limit hit frequency
- Authentication error rate
- Response time improvements

## 🎯 Success Criteria

- [ ] Token refresh succeeds with 5 retries
- [ ] Rate limit errors are handled gracefully
- [ ] Partial data is returned when Zoho is unavailable
- [ ] API call counts are logged correctly
- [ ] BambooHR import includes detailed logging
- [ ] Cron job runs daily without errors
- [ ] No authentication loops in production

## 🆘 Support

If issues persist:
1. Check Vercel function logs
2. Verify environment variables
3. Test with `ZOHO_FORCE_REFRESH=true`
4. Review Zoho API documentation
5. Check daily API usage limits

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Status:** Ready for deployment
