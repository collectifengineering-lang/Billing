# API Integration Fixes Guide

## Overview

This document outlines the fixes implemented for the Clockify and Zoho Books API integration issues that were causing errors in your Vercel preview deployments.

## Issues Identified and Fixed

### 1. Clockify API Error: 400 Bad Request ("Time entry cannot have duration more than 999 hours")

**Problem**: The `getAllTimeEntries` method was incorrectly using a POST request to the `/time-entries` endpoint with date filters in the body. This endpoint is meant for creating new time entries, not fetching existing ones.

**Root Cause**: 
- POST request to `/workspaces/{workspaceId}/time-entries` with `{ start: startDate, end: endDate }` in body
- Clockify interpreted this as creating a single time entry spanning 7-8 months
- Exceeded their 999-hour limit per entry

**Fix Implemented**:
- **Primary Method**: Use the Reports API (`/workspaces/{workspaceId}/reports/detailed`) with POST method and proper date range parameters
- **Fallback Method**: Use GET request to `/workspaces/{workspaceId}/user/{userId}/time-entries` with query parameters
- Added proper error handling and fallback logic

**Code Changes**:
- Modified `lib/clockify.ts` - `getAllTimeEntries` method
- Added `getTimeEntriesViaReports` method for bulk data
- Added `getTimeEntriesViaUserEndpoint` as fallback
- Improved error handling and logging

### 2. Zoho Books API Error: 401 Unauthorized ("You are not authorized to perform this operation")

**Problem**: Access token was `undefined` when making requests to financial reports endpoints, resulting in `Authorization: 'Bearer undefined'` headers.

**Root Cause**: 
- `getAccessToken()` method was failing to return a valid token
- Token refresh logic had issues with environment variable validation
- Insufficient error handling and logging

**Fix Implemented**:
- Improved `getAccessToken()` method with better error handling
- Added environment variable validation before making requests
- Enhanced `makeRequest()` method with token validation
- Better error logging and debugging information

**Code Changes**:
- Modified `lib/zoho.ts` - `getAccessToken` method
- Enhanced `makeRequest` method with token validation
- Added detailed error logging for debugging

## Implementation Details

### Clockify Fix

The new implementation uses a two-tier approach:

1. **Reports API (Preferred)**:
   ```typescript
   POST /workspaces/{workspaceId}/reports/detailed
   Body: {
     dateRangeStart: startDate,
     dateRangeEnd: endDate,
     detailedFilter: {
       pageSize: 1000,
       sortColumn: "DATE"
     }
   }
   ```

2. **User Time Entries API (Fallback)**:
   ```typescript
   GET /workspaces/{workspaceId}/user/{userId}/time-entries?start={startDate}&end={endDate}
   ```

### Zoho Fix

Enhanced authentication flow:

1. **Token Validation**: Check if token exists and is valid before making requests
2. **Environment Variable Validation**: Ensure all required Zoho credentials are present
3. **Improved Error Handling**: Better logging and specific error messages
4. **Token Refresh Logic**: More robust token refresh with proper error handling

## Environment Variables Required

Ensure these environment variables are properly set in your Vercel deployment:

### Clockify
```env
CLOCKIFY_API_KEY=your_clockify_api_key
CLOCKIFY_WORKSPACE_ID=your_workspace_id
```

### Zoho Books
```env
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ORGANIZATION_ID=your_organization_id
```

## Testing the Fixes

### 1. Test Clockify Integration

```bash
# Test the Reports API endpoint
curl -X POST "https://api.clockify.me/api/v1/workspaces/{workspaceId}/reports/detailed" \
  -H "X-Api-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "dateRangeStart": "2025-01-01T00:00:00Z",
    "dateRangeEnd": "2025-01-31T23:59:59Z",
    "detailedFilter": {
      "pageSize": 100,
      "sortColumn": "DATE"
    }
  }'

# Test the User Time Entries endpoint (fallback)
curl -X GET "https://api.clockify.me/api/v1/workspaces/{workspaceId}/user/{userId}/time-entries?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z" \
  -H "X-Api-Key: your_api_key"
```

### 2. Test Zoho Authentication

```bash
# Test token refresh
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "refresh_token=your_refresh_token" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret" \
  -d "grant_type=refresh_token"

# Test API call with token
curl -X GET "https://www.zohoapis.com/books/v3/reports/profitandloss?from_date=2025-01-01&to_date=2025-01-31" \
  -H "Authorization: Bearer your_access_token" \
  -H "Content-Type: application/json" \
  -d '{"organization_id": "your_org_id"}'
```

## Monitoring and Debugging

### Vercel Logs to Watch

After deploying the fixes, monitor these log patterns:

**Successful Clockify Integration**:
```
✅ Clockify Reports API Success: /workspaces/{workspaceId}/reports/detailed
✅ Clockify data calculated: { totalHours: ..., billableHours: ... }
```

**Successful Zoho Integration**:
```
Token refreshed successfully. Expires in X minutes
Token value: abc123def4...
Making Zoho API request to: reports/profitandloss
Zoho API request successful: reports/profitandloss
```

**Error Patterns to Watch**:
- `Clockify API error: 404 Not Found` - Check workspace ID
- `Clockify API authentication failed` - Check API key
- `Missing required Zoho environment variables` - Check env vars
- `Failed to obtain valid token after refresh` - Check refresh token

### Debugging Steps

1. **Check Environment Variables**:
   - Verify all required variables are set in Vercel
   - Ensure variables are available for preview deployments
   - Check for typos in variable names

2. **Verify API Credentials**:
   - Test Clockify API key with a simple endpoint
   - Verify Zoho OAuth credentials are valid
   - Check workspace/organization IDs

3. **Monitor Rate Limits**:
   - Clockify: 1000 requests per day
   - Zoho: 100 requests per minute

## Best Practices

### 1. API Error Handling
- Always implement fallback mechanisms
- Use appropriate HTTP methods for each endpoint
- Handle rate limiting gracefully
- Log detailed error information for debugging

### 2. Authentication
- Validate tokens before making requests
- Implement proper token refresh logic
- Use environment variables for sensitive data
- Add comprehensive error logging

### 3. Data Fetching
- Use appropriate APIs for different data types
- Implement pagination for large datasets
- Cache data when possible to reduce API calls
- Handle API failures gracefully with fallbacks

## Deployment Checklist

Before deploying to production:

- [ ] Test Clockify Reports API locally
- [ ] Verify Zoho token refresh works
- [ ] Check all environment variables are set
- [ ] Test fallback mechanisms
- [ ] Monitor Vercel logs for errors
- [ ] Verify data is being fetched correctly

## Support and Troubleshooting

If issues persist after implementing these fixes:

1. **Check Vercel Logs**: Look for specific error messages
2. **Verify Environment Variables**: Ensure all required variables are set
3. **Test API Endpoints**: Use curl commands to test directly
4. **Check API Documentation**: Verify endpoint usage and parameters
5. **Monitor Rate Limits**: Ensure you're not hitting API limits

## Additional Resources

- [Clockify API Documentation](https://clockify.me/developers-api)
- [Zoho Books API Documentation](https://www.zoho.com/books/api/)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
