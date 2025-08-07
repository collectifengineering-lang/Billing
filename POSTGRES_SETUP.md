# Vercel Postgres Database Setup Guide

## Step 1: Create Vercel Postgres Database

1. Go to your Vercel dashboard at https://vercel.com
2. Navigate to the **Storage** tab
3. Click **Create Database** and select **Postgres**
4. Choose the **Free** tier (Hobby plan)
5. Select your project and region
6. Click **Create**

## Step 2: Environment Variables

After creating the database, Vercel will automatically add these environment variables to your project:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` 
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Step 3: Deploy to Activate Environment Variables

1. Commit your changes to your repository
2. Push to your main branch
3. Vercel will automatically redeploy with the new environment variables

## Step 4: Run Database Migration

After deployment, the database tables will be created automatically when the app first runs. The migration from localStorage to database will also happen automatically.

## Step 5: Verify Setup

1. Check that your app is running without errors
2. Verify that data is being saved to the database instead of localStorage
3. Test that multiple users can see the same data

## Troubleshooting

### If you see database connection errors:
1. Make sure the environment variables are set in your Vercel project
2. Check that the database is created and running
3. Verify the connection strings are correct

### If migration doesn't work:
1. Check the browser console for migration errors
2. Verify that localStorage has data to migrate
3. Check the `/api/migrate` endpoint in the Network tab

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
- `POST /api/migrate` - Trigger localStorage migration 