# Supabase Database Setup Guide

## Step 1: Integrate Supabase via Vercel Marketplace

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Find your project and click on it
3. Navigate to **Settings** → **Integrations**
4. Click **Browse Marketplace**
5. Search for **Supabase** and click **Add Integration**
6. Follow the setup wizard to connect your Supabase project
7. This will automatically add base environment variables like `SUPABASE_URL`

## Step 2: Add Required Environment Variables

After the Supabase integration, you need to manually add these additional environment variables:

### Required Variables:

1. **`DATABASE_URL`** (Pooled connection for runtime queries - optimized for Vercel):
   ```
   postgresql://postgres.rjhkagqsiamwpiiszbgs:eUAUpixlcPkwgMhs@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=3&pool_timeout=30
   ```

2. **`DIRECT_URL`** (Direct connection for migrations):
   ```
   postgresql://postgres.rjhkagqsiamwpiiszbgs:eUAUpixlcPkwgMhs@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

3. **`NEXT_PUBLIC_SUPABASE_URL`**:
   ```
   https://rjhkagqsiamwpiiszbgs.supabase.co
   ```

4. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaGthZ3FzaWFtd3BpaXN6YmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzMwNDYsImV4cCI6MjA3MDE0OTA0Nn0.J75QFPOpFGr5PdZ4bEVw3x5KrC2eV9p7xgvkLVjHCe4
   ```

5. **`SUPABASE_SERVICE_ROLE_KEY`**:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaGthZ3FzaWFtd3BpaXN6YmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU3MzA0NiwiZXhwIjoyMDcwMTQ5MDQ2fQ.F0X2jfuUS-_92Ucaak8axkA8MIVs1NPhL1i6fGfXGCY
   ```

### How to Add Environment Variables:

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Find your project and click on it
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable one by one with the values above
5. Make sure to set the environment to **Production** (and optionally **Preview**)

## Step 3: Deploy to Activate Environment Variables

1. Commit your changes to your repository
2. Push to your main branch
3. Vercel will automatically redeploy with the new environment variables

## Step 4: Run Database Migration

After deployment, call the `/api/migrate` endpoint to create the database schema:

```bash
curl -X POST https://your-app.vercel.app/api/migrate
```

**Note:** Migrations use `DIRECT_URL` (direct connection on port 5432) to avoid pooler validation issues; runtime uses `DATABASE_URL` (pooled on port 6543).

## Step 5: Verify Setup

1. Check that your app is running without errors
2. Verify that data is being saved to the database instead of localStorage
3. Test that multiple users can see the same data

## Troubleshooting

### If PrismaClientInitializationError occurs on URL protocol:
1. **Ensure DATABASE_URL and DIRECT_URL start with "postgresql://"** (change from Supabase's default "postgres://" if needed)
2. **Verify no quotes or typos** in Vercel env vars
3. **Test by logging URL prefixes** in `/api/migrate`
4. **Check that both URLs use the correct protocol** - Prisma is picky about the full 'postgresql://' protocol

### For Vercel runtime issues like 500 errors:
1. **Ensure PrismaClient is a singleton** to avoid connection exhaustion
2. **Check Vercel Runtime Logs** for detailed errors post-deploy
3. **If max connections reached**, adjust `connection_limit=3` in `DATABASE_URL`
4. **Verify the optimized DATABASE_URL** includes `&connection_limit=3&pool_timeout=30`

### If you see P6001 errors:
1. **Confirm no Accelerate environment variables remain** in your Vercel project
2. **Check that `vercel.json` does NOT have** `PRISMA_GENERATE_DATAPROXY: "true"`
3. **Redeploy your application** after removing any Accelerate configurations
4. **Verify both `DATABASE_URL` and `DIRECT_URL` are set** in Vercel environment variables

### If you see connection timeouts or pool errors:
1. **Verify `DATABASE_URL` uses port 6543** (pooled connection)
2. **Check that `&pgbouncer=true&connection_limit=3&pool_timeout=30`** parameters are included
3. **Ensure `DIRECT_URL` uses port 5432** (direct connection)
4. **Run migrations via `/api/migrate`** after deployment

### If migration doesn't work:
1. Check the browser console for migration errors
2. Verify that localStorage has data to migrate
3. Check the `/api/migrate` endpoint in the Network tab
4. Look at Vercel function logs for detailed error messages
5. **Confirm `DIRECT_URL` is properly configured** for migrations

### If data isn't syncing between users:
1. Verify that the API endpoints are working
2. Check that SWR is fetching data correctly
3. Ensure the database is accessible from your deployment

### Environment Variable Checklist:
- ✅ `DATABASE_URL` (pooled, port 6543, with `&pgbouncer=true&connection_limit=3&pool_timeout=30`)
- ✅ `DIRECT_URL` (direct, port 5432, no pooling parameters)
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ No `PRISMA_GENERATE_DATAPROXY` in `vercel.json`
- ✅ Both URLs use `postgresql://` protocol (not `postgres://`)

## Database Schema

The following tables are created:

- `Projection` - Monthly projection values
- `Status` - Monthly status values  
- `Comment` - Monthly comment values
- `SignedFee` - Project signed fees
- `AsrFee` - Project ASR fees
- `ClosedProject` - Closed project IDs
- `ProjectAssignment` - Project manager assignments
- `ProjectManager` - Project manager definitions

## API Endpoints

- `GET/POST /api/projections` - Monthly projections
- `GET/POST /api/statuses` - Monthly statuses
- `GET/POST /api/comments` - Monthly comments
- `GET/POST /api/signed-fees` - Signed fees
- `GET/POST /api/asr-fees` - ASR fees
- `GET/POST/DELETE /api/closed-projects` - Closed projects
- `GET/POST/DELETE /api/project-assignments` - Project assignments
- `GET/POST /api/project-managers` - Project managers
- `POST /api/migrate` - Trigger database schema creation 