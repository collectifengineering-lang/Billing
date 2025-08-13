# Zoho Token Exchange Guide

## Overview
You've received an authorization code from Zoho and need to exchange it for access and refresh tokens. This is the final step in the OAuth 2.0 flow.

## Your Authorization Code
```
1000.5ce448e1560f10c319bc6cfb505374a3.77a82600c7c23f7b2f09922202e37d5b
```

## What You'll Get
- **Access Token**: Valid for 1 hour, used for API calls
- **Refresh Token**: Long-lived, used to get new access tokens
- **API Domain**: Your Zoho API endpoint

## Method 1: Using the Script (Recommended)

### Step 1: Update the Script
Open `scripts/exchange-zoho-token-simple.js` and update these values:

```javascript
const CLIENT_ID = 'YOUR_ACTUAL_ZOHO_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_ACTUAL_ZOHO_CLIENT_SECRET';
const REDIRECT_URI = 'YOUR_ACTUAL_REDIRECT_URI';
```

### Step 2: Run the Script
```bash
node scripts/exchange-zoho-token-simple.js
```

### Step 3: Copy the Tokens
The script will output your tokens. Copy them to your `.env.local` file:

```bash
ZOHO_ACCESS_TOKEN=your_access_token_here
ZOHO_REFRESH_TOKEN=your_refresh_token_here
ZOHO_API_DOMAIN=your_api_domain_here
```

## Method 2: Manual cURL Request

If you prefer to do it manually:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "1000.5ce448e1560f10c319bc6cfb505374a3.77a82600c7c23f7b2f09922202e37d5b",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uri": "YOUR_REDIRECT_URI",
    "grant_type": "authorization_code"
  }'
```

## Method 3: Using Postman

1. **Create a new POST request**
2. **URL**: `https://accounts.zoho.com/oauth/v2/token`
3. **Headers**: `Content-Type: application/json`
4. **Body** (raw JSON):
```json
{
  "code": "1000.5ce448e1560f10c319bc6cfb505374a3.77a82600c7c23f7b2f09922202e37d5b",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "YOUR_REDIRECT_URI",
  "grant_type": "authorization_code"
}
```

## Required Information

### 1. Client ID & Client Secret
These are from your Zoho OAuth application setup.

### 2. Redirect URI
This must match exactly what you configured in Zoho. Common examples:
- `http://localhost:3000/api/auth/zoho/callback` (development)
- `https://yourdomain.com/api/auth/zoho/callback` (production)

### 3. Authorization Code
The code you received: `1000.5ce448e1560f10c319bc6cfb505374a3.77a82600c7c23f7b2f09922202e37d5b`

## Expected Response

On success, you'll receive:

```json
{
  "access_token": "1000.abc123...",
  "refresh_token": "1000.xyz789...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "api_domain": "https://www.zohoapis.com",
  "token_type": "Bearer"
}
```

## Error Responses

### Common Errors:

1. **Invalid Grant**
   - Authorization code expired (they expire quickly)
   - Code already used
   - Redirect URI mismatch

2. **Invalid Client**
   - Wrong client ID or secret
   - Client not configured properly

3. **Invalid Redirect URI**
   - URI doesn't match what's configured in Zoho

## After Getting Tokens

### 1. Add to Environment File
```bash
# .env.local
ZOHO_ACCESS_TOKEN=your_access_token
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_API_DOMAIN=your_api_domain
```

### 2. Test the Connection
The application will automatically use these tokens for API calls.

### 3. Handle Token Refresh
Access tokens expire in 1 hour. The refresh token is used to get new ones automatically.

## Security Notes

- ⚠️ **Never commit tokens to version control**
- 🔒 **Keep your refresh token secure**
- 🔄 **Access tokens are automatically refreshed**
- 🗑️ **Revoke tokens if compromised**

## Troubleshooting

### Authorization Code Expired
If you get an "invalid_grant" error, the code has expired. You'll need to:
1. Go through the OAuth flow again
2. Get a new authorization code
3. Exchange it immediately

### Redirect URI Mismatch
Make sure the redirect URI in your request exactly matches what's configured in Zoho.

### Client Credentials Wrong
Double-check your client ID and secret from the Zoho developer console.

## Next Steps

Once you have the tokens:

1. ✅ **Test the connection** by accessing Zoho data in your app
2. 🔄 **Monitor token refresh** in the logs
3. 📊 **Start using Zoho APIs** for projects and invoices
4. 🚀 **Enjoy your integrated billing platform!**

## Support

If you encounter issues:
1. Check the error response for details
2. Verify all credentials are correct
3. Ensure the authorization code hasn't expired
4. Confirm redirect URI matches exactly

---

**Remember**: Authorization codes expire quickly, so exchange them immediately after receiving them!
