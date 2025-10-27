# Troubleshooting 401 Unauthorized Errors

## Issue
Getting `401 (Unauthorized)` errors when trying to fetch data from Zoho API:
- `GET http://localhost:3000/api/projects 401 (Unauthorized)`
- `GET http://localhost:3000/api/setup-database 500 (Internal Server Error)`

## Root Cause
The 401 errors are caused by Zoho API authentication failures. This can happen due to:
1. Missing or invalid Zoho credentials in environment variables
2. Database not initialized for token caching
3. Zoho API rate limiting

## Solutions

### Solution 1: Verify Zoho Credentials

Check that your `.env.local` file has the required Zoho credentials:

```bash
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ORGANIZATION_ID=your_organization_id
ZOHO_ACCOUNTS_BASE=https://accounts.zoho.com
ZOHO_API_BASE=https://www.zohoapis.com
```

**To get these credentials:**
1. Go to [Zoho Developer Console](https://accounts.zoho.com/developerconsole)
2. Create a new server-based application
3. Add the scope `ZohoBooks.fullaccess.all`
4. Copy the Client ID and Client Secret
5. Generate a refresh token using the OAuth playground

### Solution 2: Initialize Database (If Using Optimized Service)

If you're using the optimized Zoho service with token caching:

```bash
# Push the Prisma schema to the database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Solution 3: Check Zoho API Status

Verify that the Zoho API is accessible and not rate-limited:

```bash
# Test Zoho connectivity
curl -X GET "https://www.zohoapis.com/books/v3/organizations" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Solution 4: Use Non-Optimized Service (Temporary)

If the database setup is causing issues, the code now gracefully falls back without caching. However, you can also use the regular Zoho service:

**In `app/api/projects/route.ts`**, change:
```typescript
import { optimizedZohoService } from '@/lib/zohoOptimized';
```

To:
```typescript
import { zohoService } from '@/lib/zoho';
```

And update all references from `optimizedZohoService` to `zohoService`.

## Recent Fixes Applied

The following improvements have been made to handle database errors gracefully:

1. **Error Handling in Token Caching** (`lib/zohoOptimized.ts`):
   - Added try-catch around database queries
   - Falls back to refreshing tokens if cache is unavailable
   - Logs warnings instead of throwing errors

2. **Error Handling in Data Caching** (`lib/zohoOptimized.ts`):
   - Added try-catch around cache operations
   - Continues without caching if database is unavailable
   - Still fetches fresh data from Zoho API

3. **Invoice Field Handling** (`app/api/homepage-dashboard/route.ts`):
   - Fixed invoice amount field references
   - Enhanced YTD date filtering
   - Added comprehensive logging

## Testing

### Step 1: Check Environment Variables
```bash
# Verify environment variables are set
node -e "console.log(process.env.ZOHO_CLIENT_ID ? 'OK' : 'MISSING')"
```

### Step 2: Test Zoho API Directly
Create a test file `test-zoho.js`:
```javascript
const axios = require('axios');

async function testZoho() {
  try {
    // Replace with your actual credentials
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    });
    
    console.log('✅ Zoho API is working!');
    console.log('Token expires in:', response.data.expires_in, 'seconds');
  } catch (error) {
    console.error('❌ Zoho API test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testZoho();
```

Run it:
```bash
node test-zoho.js
```

### Step 3: Check Server Logs
Look for these messages in your server console:
- `🔄 Refreshing Zoho token...` - Token refresh in progress
- `✅ Token refreshed successfully` - Authentication successful
- `⚠️ Could not access token cache` - Database issue (non-fatal)
- `📊 Zoho API calls made` - API calls being made

### Step 4: Verify Frontend
1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. Check browser console for API errors
4. Check server console for detailed logs

## Common Issues and Solutions

### Issue: "Missing required Zoho environment variables"
**Solution**: Set all required environment variables in `.env.local`

### Issue: "Zoho API authentication failed"
**Solution**: 
1. Check if your refresh token has expired
2. Regenerate the refresh token from Zoho Developer Console
3. Update the `.env.local` file

### Issue: "Rate limit exceeded"
**Solution**: 
1. Wait a few minutes before retrying
2. Implement request throttling
3. Use the caching feature to reduce API calls

### Issue: "Database connection error"
**Solution**: 
1. Verify DATABASE_URL in `.env.local`
2. Run `npx prisma db push` to sync schema
3. Check Supabase connection settings

## Next Steps

After fixing the authentication issues:

1. **Monitor API Usage**: Check how many API calls are being made
2. **Implement Caching**: Use the database cache to reduce API calls
3. **Add Logging**: Monitor Zoho API responses for errors
4. **Test Thoroughly**: Verify all API endpoints are working

## Contact

If you continue to experience issues after following these steps, please provide:
1. The complete error message from server logs
2. Your environment variable setup (without sensitive data)
3. The Zoho API response you're receiving
4. Any relevant network errors from the browser console

