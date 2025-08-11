# Clockify Integration Setup Guide

## Current Issue
Your application is getting "Clockify API access forbidden" errors because the Clockify service is not properly configured. The environment variables are set to placeholder values.

## Prerequisites
1. A Clockify account (free or paid)
2. Access to your Clockify workspace
3. API key generation permissions

## Step-by-Step Setup

### 1. Get Your Clockify API Key
content.bundle.js:2 Received response from background script: {block: false}
layout-8ef518676488fe59.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Auth Debug: {userEmail: 'jonathan@collectif.nyc', userPrincipalName: 'jonathan@collectif.nyc', adminEmails: Array(2), isAdmin: true, adminEmailsIncludes: true, …}
837-18b4ea62edb65fc0.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Automatic Zoho token refresh started (every 45 minutes)
page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Clockify service initialized
page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Clockify API key not configured, using fallback mode
u @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
25789 @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
d @ webpack-2f18abd901e86082.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
Promise.then
10193 @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
d @ webpack-2f18abd901e86082.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
(anonymous) @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
d.O @ webpack-2f18abd901e86082.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
(anonymous) @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
c @ webpack-2f18abd901e86082.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
(anonymous) @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
page-1512934b3ca0df45.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Project selection changed to: 910829000026096053
content.bundle.js:2 Received response from background script: {block: false}
layout-8ef518676488fe59.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Auth Debug: {userEmail: 'jonathan@collectif.nyc', userPrincipalName: 'jonathan@collectif.nyc', adminEmails: Array(2), isAdmin: true, adminEmailsIncludes: true, …}
837-18b4ea62edb65fc0.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Automatic Zoho token refresh started (every 45 minutes)
page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Clockify service initialized
page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Clockify API key not configured, using fallback mode
u @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
25789 @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
d @ webpack-2f18abd901e86082.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
Promise.then
10193 @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
d @ webpack-2f18abd901e86082.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
(anonymous) @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
d.O @ webpack-2f18abd901e86082.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
(anonymous) @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
c @ webpack-2f18abd901e86082.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
(anonymous) @ page-d19ebcbb6cd5f368.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1
page-1512934b3ca0df45.js?dpl=dpl_EHvShzPMT4QjWXdLTX8KcomKQVPw:1 Project selection changed to: 910829000026096053

1. **Log into Clockify**: Go to [https://clockify.me](https://clockify.me) and sign in
2. **Navigate to Profile**: Click on your profile picture in the top right
3. **Go to API**: In the left sidebar, click on "API"
4. **Generate API Key**: Click "Generate" to create a new API key
5. **Copy the Key**: Copy the generated API key (it will look like: `OTg4NTg3YjMtMmQzYS00ZWE1LThiOTctZmY4NDAwYzRiZjZj`)

### 2. Get Your Workspace ID

1. **Go to Workspace Settings**: In Clockify, click on your workspace name in the top left
2. **Copy Workspace ID**: The workspace ID is in the URL or in the workspace settings
   - URL format: `https://clockify.me/workspace/[WORKSPACE_ID]/...`
   - Or look for "Workspace ID" in the settings

### 3. Update Environment Variables

1. **Edit your `env.local` file** (or create it if it doesn't exist)
2. **Replace the placeholder values** with your actual credentials:

```bash
# Clockify API Configuration
CLOCKIFY_API_KEY=your_actual_api_key_here
CLOCKIFY_WORKSPACE_ID=your_actual_workspace_id_here
```

**Example:**
```bash
# Clockify API Configuration
CLOCKIFY_API_KEY=OTg4NTg3YjMtMmQzYS00ZWE1LThiOTctZmY4NDAwYzRiZjZj
CLOCKIFY_WORKSPACE_ID=64f8a1b2c3d4e5f6a7b8c9d0
```

### 4. Restart Your Application

After updating the environment variables:
1. **Stop your development server** (Ctrl+C)
2. **Restart it** with `npm run dev`

### 5. Verify Configuration

The application will now:
- Log "Clockify service initialized with valid credentials" if configured correctly
- Use real Clockify data instead of mock data
- Show actual time tracking, employee, and project data

## Troubleshooting

### Common Issues

1. **"API access forbidden"**
   - Check that your API key is correct
   - Ensure you have access to the workspace
   - Verify the workspace ID is correct

2. **"Authentication failed"**
   - Regenerate your API key
   - Check that the key hasn't expired
   - Ensure you're copying the entire key

3. **"Workspace not found"**
   - Verify the workspace ID from the URL
   - Check that you have access to the workspace
   - Ensure the workspace is active

### Testing Your Setup

1. **Check the console logs** when starting your app
2. **Look for Clockify configuration messages**
3. **Try accessing the dashboard** - it should now show real data instead of errors

## Fallback Behavior

If Clockify is not configured or fails:
- The application will use mock data
- No errors will be displayed to users
- The dashboard will function normally with sample data
- You'll see warnings in the console about using mock data

## Security Notes

- **Never commit API keys to version control**
- **Use environment variables** for all sensitive data
- **Rotate API keys regularly** for security
- **Limit API key permissions** to only what's needed

## Next Steps

Once Clockify is configured:
1. **Map your Zoho projects** to Clockify projects (if needed)
2. **Set up time tracking** for your team
3. **Configure billing rates** in Clockify
4. **Customize the dashboard** to show your specific metrics

## Support

If you continue to have issues:
1. Check the Clockify API documentation
2. Verify your Clockify account permissions
3. Test the API key directly with Clockify's API
4. Check the application console for detailed error messages
