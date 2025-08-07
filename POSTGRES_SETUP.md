# Supabase Database Setup Guide

## Step 1: Create Supabase Database

1. Go to your Supabase dashboard at https://supabase.com
2. Create a new project or use an existing one
3. Navigate to the **SQL Editor** in your project dashboard
4. Run the database schema creation script (see `create-tables-with-rls.sql`)

## Step 2: Environment Variables

You need to manually add these environment variables to your Vercel project:

### Required Variables:

1. **`DATABASE_URL`** (Direct connection):
   ```
   postgres://postgres.rjhkagqsiamwpiiszbgs:eUAUpixlcPkwgMhs@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

2. **`NEXT_PUBLIC_SUPABASE_URL`**:
   ```
   https://rjhkagqsiamwpiiszbgs.supabase.co
   ```

3. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaGthZ3FzaWFtd3BpaXN6YmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzMwNDYsImV4cCI6MjA3MDE0OTA0Nn0.J75QFPOpFGr5PdZ4bEVw3x5KrC2eV9p7xgvkLVjHCe4
   ```

4. **`SUPABASE_SERVICE_ROLE_KEY`**:
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

## Step 5: Verify Setup

1. Check that your app is running without errors
2. Verify that data is being saved to the database instead of localStorage
3. Test that multiple users can see the same data

## Troubleshooting

### If you see database connection errors:
1. Make sure the environment variables are set in your Vercel project
2. Check that the DATABASE_URL uses port 5432 (direct connection)
3. Verify the connection strings are correct
4. Ensure `vercel.json` does NOT have `PRISMA_GENERATE_DATAPROXY: "true"`

### If migration doesn't work:
1. Check the browser console for migration errors
2. Verify that localStorage has data to migrate
3. Check the `/api/migrate` endpoint in the Network tab
4. Look at Vercel function logs for detailed error messages

### If data isn't syncing between users:
1. Verify that the API endpoints are working
2. Check that SWR is fetching data correctly
3. Ensure the database is accessible from your deployment

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