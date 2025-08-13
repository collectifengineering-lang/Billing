# Admin Access Troubleshooting Guide

## Problem
You're getting "Access Denied" notices when trying to access the settings and detailed finances pages, even though you have the correct environment variable set.

## Environment Variable
Your current setting:
```
NEXT_PUBLIC_ADMIN_EMAILS=jonathan@collectif.nyc
```

## Root Causes & Solutions

### 1. **Environment Variable Format Issue**
The most common issue is that the environment variable might not be properly formatted or accessible.

**Check your `.env.local` file:**
```bash
# Make sure there are NO spaces around the equals sign
NEXT_PUBLIC_ADMIN_EMAILS=jonathan@collectif.nyc

# NOT like this:
NEXT_PUBLIC_ADMIN_EMAILS = jonathan@collectif.nyc
NEXT_PUBLIC_ADMIN_EMAILS= jonathan@collectif.nyc
NEXT_PUBLIC_ADMIN_EMAILS =jonathan@collectif.nyc
```

### 2. **Restart Required**
After changing environment variables, you need to restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. **Environment Variable Location**
Make sure your `.env.local` file is in the **root directory** of your project (same level as `package.json`), not in any subdirectory.

### 4. **Multiple Admin Emails**
If you want to add multiple admin emails, separate them with commas (no spaces):

```bash
# Single admin
NEXT_PUBLIC_ADMIN_EMAILS=jonathan@collectif.nyc

# Multiple admins
NEXT_PUBLIC_ADMIN_EMAILS=jonathan@collectif.nyc,admin2@collectif.nyc,admin3@collectif.nyc
```

### 5. **Domain-Based Access**
The system automatically grants admin access to any user with an email ending in `@collectif.nyc`. This should work regardless of the environment variable.

## Debugging Steps

### Step 1: Use the Admin Test Page
Navigate to `/admin-test` in your application to see detailed debugging information.

### Step 2: Check Browser Console
Open your browser's developer tools (F12) and look at the Console tab for debug messages from the AdminOnly component.

### Step 3: Verify Authentication
Make sure you're properly signed in with Azure AD and your email is being recognized.

### Step 4: Test Environment Variable API
The `/api/auth/admin-test` endpoint will show you exactly what the server sees for your environment variable.

## Common Issues & Fixes

### Issue: "Environment variable not found"
**Fix:** Restart your development server after adding/modifying `.env.local`

### Issue: "User not admin"
**Fix:** Check that your email exactly matches what's in the environment variable

### Issue: "Authentication failed"
**Fix:** Sign out and sign back in with Azure AD

### Issue: "Redirect loop"
**Fix:** Clear browser cache and cookies for your domain

## Environment Variable Examples

### Working Examples:
```bash
# Single email
NEXT_PUBLIC_ADMIN_EMAILS=jonathan@collectif.nyc

# Multiple emails
NEXT_PUBLIC_ADMIN_EMAILS=jonathan@collectif.nyc,jane@collectif.nyc

# With spaces in email (but not around equals)
NEXT_PUBLIC_ADMIN_EMAILS=jonathan.smith@collectif.nyc
```

### Non-Working Examples:
```bash
# Spaces around equals sign
NEXT_PUBLIC_ADMIN_EMAILS = jonathan@collectif.nyc

# Quotes around value
NEXT_PUBLIC_ADMIN_EMAILS="jonathan@collectif.nyc"

# Extra spaces
NEXT_PUBLIC_ADMIN_EMAILS= jonathan@collectif.nyc
```

## Verification Steps

1. **Check `.env.local` file exists** in project root
2. **Verify no spaces around equals sign**
3. **Restart development server**
4. **Sign out and sign back in**
5. **Navigate to `/admin-test` page**
6. **Check browser console for debug info**
7. **Test accessing `/settings` or `/dashboard`**

## Fallback Access

If the environment variable approach fails, the system will automatically grant admin access to any user with an email ending in `@collectif.nyc`. This means you should have admin access regardless of the environment variable setting.

## Still Having Issues?

If you're still experiencing problems after following these steps:

1. **Check the `/admin-test` page** for detailed debugging information
2. **Look at browser console** for error messages
3. **Verify your email format** matches exactly
4. **Try clearing browser cache** and cookies
5. **Restart the development server** completely

## Support

If none of these solutions work, please provide:
- Screenshot of your `.env.local` file
- Output from the `/admin-test` page
- Browser console error messages
- Your exact email address (for verification)
