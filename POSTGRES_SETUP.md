# PostgreSQL Setup Guide

## Overview
This guide covers setting up PostgreSQL database integration for the billing platform, including Supabase integration, Prisma configuration, and localStorage migration.

## Database Setup

### Option 1: Supabase (Recommended)

#### 1. Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

#### 2. Environment Variables
Add these to your `.env.local` and Vercel environment variables:

```bash
# Supabase Configuration
DATABASE_URL="postgresql://[user]:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=30&prepared_statements=false"
DIRECT_URL="postgresql://[user]:[password]@db.[project-ref].supabase.co:5432/postgres"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="[your-anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[your-service-role-key]"
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[your-anon-key]"
NEXT_PUBLIC_USE_DB="true"
```

**Important**: For max connections errors on Supabase free tier, set DATABASE_URL params: `?pgbouncer=true&connection_limit=1&pool_timeout=30&prepared_statements=false`. Use transaction mode (port 6543) for runtime to leverage pooling. Direct connections (port 5432) are limited to ~2 concurrent on free tier, so reserve for migrations.

#### 3. Database Schema
Run the provided SQL script in Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE IF EXISTS "Projection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SignedFee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AsrFee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ClosedProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProjectAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProjectManager" ENABLE ROW LEVEL SECURITY;

-- Create policies (permissive for now)
CREATE POLICY "Enable all access" ON "Projection" FOR ALL USING (true);
CREATE POLICY "Enable all access" ON "Status" FOR ALL USING (true);
CREATE POLICY "Enable all access" ON "Comment" FOR ALL USING (true);
CREATE POLICY "Enable all access" ON "SignedFee" FOR ALL USING (true);
CREATE POLICY "Enable all access" ON "AsrFee" FOR ALL USING (true);
CREATE POLICY "Enable all access" ON "ClosedProject" FOR ALL USING (true);
CREATE POLICY "Enable all access" ON "ProjectAssignment" FOR ALL USING (true);
CREATE POLICY "Enable all access" ON "ProjectManager" FOR ALL USING (true);
```

### Option 2: Vercel Postgres
1. Go to Vercel Dashboard → Your Project → Storage
2. Create a new Postgres database
3. Copy the connection strings to environment variables

## Prisma Configuration

### 1. Schema Configuration
Ensure `prisma/schema.prisma` has the correct configuration:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")  // Pooled URL for runtime queries
  directUrl = env("DIRECT_URL")    // Direct URL for migrations and Prisma Studio
}

generator client {
  provider = "prisma-client-js"
}
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Push Schema to Database
```bash
npx prisma db push
```

## localStorage Migration

### Automatic Migration
The application now includes automatic localStorage migration:

1. **Detection**: App detects existing localStorage data on first load
2. **Migration**: Data is automatically migrated to database via API calls
3. **Cleanup**: localStorage is cleared after successful migration
4. **Database-Only**: All future operations use database exclusively

### Migration Process
- **Projections**: Monthly revenue projections
- **Statuses**: Project status tracking
- **Comments**: Project notes and comments
- **Signed Fees**: User-entered fee amounts
- **ASR Fees**: Additional service revenue
- **Closed Projects**: Completed project tracking
- **Project Assignments**: Manager assignments
- **Project Managers**: Manager definitions

### Manual Migration (if needed)
If automatic migration fails, you can manually trigger it:

```javascript
// In browser console
await fetch('/api/migrate', { method: 'POST' });
```

## Environment Variables

### Required Variables
```bash
# Database URLs
DATABASE_URL="postgresql://[user]:[password]@[host]:6543/[db]?pgbouncer=true&connection_limit=3&pool_timeout=30"
DIRECT_URL="postgresql://[user]:[password]@[host]:5432/[db]"

# Supabase (if using Supabase)
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="[your-anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[your-service-role-key]"
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[your-anon-key]"

# Feature Flags
NEXT_PUBLIC_USE_DB="true"
```

### Vercel Configuration
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all required environment variables
3. Redeploy the application

## Troubleshooting

### Common Issues

#### 1. PrismaClientInitializationError
**Error**: `Error validating datasource db: the URL must start with the protocol prisma:// or prisma+postgres://`

**Solution**:
- Ensure `DATABASE_URL` uses `postgresql://` protocol (not `postgres://`)
- Remove any Prisma Accelerate configuration from `vercel.json`
- Verify environment variables are correctly set in Vercel

#### 2. Connection Timeouts
**Error**: Database connection timeouts or pool errors

**Solution**:
- Verify `DATABASE_URL` includes `pgbouncer=true&connection_limit=1&pool_timeout=30&prepared_statements=false`
- Check Supabase connection limits
- Ensure `DIRECT_URL` is set for migrations
- For Supabase free tier max connections: Use `connection_limit=1` per function to avoid pile-up

#### 3. RLS Errors
**Error**: Row Level Security warnings in Supabase

**Solution**:
- Run the RLS setup SQL script in Supabase SQL Editor
- Ensure all tables have RLS enabled with appropriate policies

#### 4. Max Connections Errors (Supabase Free Tier)
**Error**: `FATAL: remaining connection slots are reserved for non-replication superuser connections`

**Solution**:
- Update DATABASE_URL to use `connection_limit=1` (one connection per Vercel function)
- Add `prepared_statements=false` to prevent Prisma pooling errors
- Use transaction mode (port 6543) for runtime operations
- Reserve direct connections (port 5432) for migrations only
- If migrations fail, run `prisma db push` locally with DIRECT_URL in .env, then test app

#### 5. Migration Issues
**Error**: localStorage migration fails

**Solution**:
- Check browser console for specific error messages
- Verify all API endpoints are working
- Try manual migration via browser console
- Clear localStorage and start fresh if needed

### Testing Database Connection

#### 1. Test Migration Endpoint
```bash
curl -X POST https://your-app.vercel.app/api/migrate
```

#### 2. Test API Endpoints
```bash
# Test projections
curl https://your-app.vercel.app/api/projections

# Test statuses
curl https://your-app.vercel.app/api/statuses

# Test comments
curl https://your-app.vercel.app/api/comments
```

#### 3. Check Database Tables
In Supabase SQL Editor:
```sql
SELECT * FROM "Projection" LIMIT 5;
SELECT * FROM "Status" LIMIT 5;
SELECT * FROM "Comment" LIMIT 5;
```

## Performance Optimization

### Connection Pooling
- **Runtime**: Use pooled connections (`DATABASE_URL` on port 6543)
- **Migrations**: Use direct connections (`DIRECT_URL` on port 5432)
- **Limits**: Set `connection_limit=3` for Vercel serverless functions

### SWR Configuration
The application uses SWR with optimized settings:
```javascript
const swrConfig = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 0, // Disable auto-refresh, rely on focus/reconnect
};
```

### Caching Strategy
- **Client-side**: SWR provides intelligent caching
- **Server-side**: Prisma connection pooling
- **Real-time**: Focus and reconnect triggers data refresh

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS enabled
- Permissive policies for development
- Customize policies for production

### Environment Variables
- Never commit sensitive data to version control
- Use Vercel environment variables for production
- Rotate database credentials regularly

### API Security
- All endpoints require proper authentication
- Input validation on all API calls
- Error messages don't expose sensitive information

## Monitoring and Maintenance

### Database Monitoring
- Monitor connection pool usage
- Track query performance
- Set up alerts for connection failures

### Application Monitoring
- Monitor API response times
- Track migration success rates
- Monitor SWR cache hit rates

### Regular Maintenance
- Update Prisma client regularly
- Monitor Supabase usage limits
- Review and update RLS policies

## Support

For database-related issues:
1. Check the troubleshooting section above
2. Verify environment variables are correctly set
3. Test database connectivity directly
4. Review Supabase/Vercel logs for detailed error information
5. Contact system administrator for database access issues 