# Vercel Deployment Guide

## Issues Fixed

The deployment was failing due to:
1. **Prisma Client Generation**: Prisma client wasn't being generated during build
2. **Database Configuration**: SQLite doesn't work on Vercel - needs PostgreSQL

## Changes Made

### 1. Updated package.json
- Added `prisma generate` to build script
- Added `postinstall` script for Prisma client generation

### 2. Updated Prisma Schema
- Changed from SQLite to PostgreSQL
- Updated database URL configuration

### 3. Added Vercel Configuration
- Created `vercel.json` for proper build settings

## Next Steps

### 1. Create Vercel Postgres Database
1. Go to your Vercel dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **Postgres**
4. Choose **Free** tier
5. Select your project and region
6. Click **Create**

### 2. Environment Variables
Vercel will automatically add these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 3. Add Your Existing Environment Variables
In your Vercel project settings, add these environment variables:
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_ORGANIZATION_ID`
- `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
- `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
- `NEXT_PUBLIC_APP_URL` (set to your Vercel app URL)

### 4. Deploy
1. Commit and push your changes
2. Vercel will automatically redeploy
3. The build should now succeed

### 5. Database Migration
After deployment:
1. Your app will automatically create database tables
2. Data migration from localStorage will happen automatically
3. Check the browser console for migration status

## Troubleshooting

### If build still fails:
1. Check that all environment variables are set in Vercel
2. Verify the PostgreSQL database is created and running
3. Check the build logs for specific errors

### If database connection fails:
1. Verify environment variables are correct
2. Check that the database is accessible
3. Ensure the connection strings are properly formatted

### If migration doesn't work:
1. Check browser console for errors
2. Verify localStorage has data to migrate
3. Check the `/api/migrate` endpoint

## Local Development
For local development, you can still use SQLite by creating a `.env.local` file with:
```
DATABASE_URL="file:./dev.db"
```

This will override the PostgreSQL configuration for local development. 