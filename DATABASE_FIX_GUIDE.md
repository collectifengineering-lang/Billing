# Database Fix Guide for Supabase Performance Issues

This guide will help you resolve the Supabase RLS performance warnings and database connection issues you're experiencing.

## 🚨 Issues Identified

### 1. RLS Performance Warnings
Your Supabase database has RLS policies that are causing performance issues by re-evaluating `auth.role()` for each row. This results in the warnings:
- `auth_rls_initplan` warnings for multiple tables
- Suboptimal query performance at scale
- Unnecessary function re-evaluation

### 2. Database Connection Issues
- Application failing to save project managers
- High performance table not working
- Database queries failing
- Schema mismatch between SQLite and PostgreSQL

## 🔧 Solutions

### Fix 1: Update RLS Policies (Immediate Fix)

The RLS policies need to be updated to use the optimized format. Run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Projection";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Status";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Comment";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "SignedFee";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "AsrFee";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ClosedProject";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ProjectAssignment";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ProjectManager";

-- Recreate policies with optimized format
CREATE POLICY "Enable all operations for authenticated users" ON "Projection"
    FOR ALL USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON "Status"
    FOR ALL USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON "Comment"
    FOR ALL USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON "SignedFee"
    FOR ALL USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON "AsrFee"
    FOR ALL USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON "ClosedProject"
    FOR ALL USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON "ProjectAssignment"
    FOR ALL USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON "ProjectManager"
    FOR ALL USING ((select auth.role()) = 'authenticated');
```

**Why this fixes the performance issue:**
- `auth.role()` gets evaluated for every row, causing performance degradation
- `(select auth.role())` gets evaluated once per query, improving performance significantly
- This is the recommended approach from Supabase documentation

### Fix 2: Environment Configuration

Create a `.env.local` file in your project root with these variables:

```bash
# Supabase Database URL (for Prisma)
PRISMA_DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=30&connect_timeout=30&prepared_statements=false"

# Direct Database URL (for migrations)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Other required variables...
NEXT_PUBLIC_AZURE_AD_CLIENT_ID="your-client-id"
NEXT_PUBLIC_AZURE_AD_TENANT_ID="your-tenant-id"
NEXT_PUBLIC_ADMIN_EMAILS="admin@example.com"
```

**Replace:**
- `[project-ref]` with your actual Supabase project reference
- `[password]` with your actual database password

### Fix 3: Update Prisma Schema

The Prisma schema has been updated to use PostgreSQL instead of SQLite. The main schema file now uses:
- `provider = "postgresql"`
- `url = env("PRISMA_DATABASE_URL")`

### Fix 4: Regenerate Prisma Client

After updating the environment variables:

```bash
# Generate new Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Or use the setup command
npm run prisma:setup
```

## 🚀 Quick Fix Commands

Run these commands in order:

```bash
# 1. Run the database fix script
npm run fix:database

# 2. Test database connection
npm run db:test

# 3. Generate Prisma client
npm run prisma:generate

# 4. Push schema to database
npm run prisma:push

# 5. Restart development server
npm run dev
```

## 📋 Step-by-Step Process

### Step 1: Fix RLS Policies
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL from `fix-rls-policies.sql`
4. Execute the script
5. Verify policies are updated

### Step 2: Update Environment Variables
1. Create `.env.local` file in project root
2. Add your Supabase database credentials
3. Use the exact format shown above
4. Include all required parameters

### Step 3: Update Prisma
1. Regenerate Prisma client: `npm run prisma:generate`
2. Push schema to database: `npm run prisma:push`
3. Verify connection works: `npm run db:test`

### Step 4: Test Application
1. Restart your development server
2. Test saving project managers
3. Test high performance table
4. Verify all database operations work

## 🔍 Troubleshooting

### Database Connection Fails
- Check your `PRISMA_DATABASE_URL` format
- Verify credentials are correct
- Ensure database is accessible from your network
- Check Supabase project status

### RLS Policies Still Show Warnings
- Ensure you ran the SQL script in Supabase
- Check that policies were actually updated
- Wait a few minutes for changes to propagate
- Verify policy names match exactly

### Prisma Errors
- Clear Prisma cache: `npx prisma generate --force`
- Check schema syntax
- Verify environment variables are loaded
- Restart development server

## 📚 Additional Resources

- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [Prisma PostgreSQL Setup](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)

## ✅ Verification Checklist

- [ ] RLS policies updated with `(select auth.role())` format
- [ ] `.env.local` file created with correct credentials
- [ ] Prisma schema updated to use PostgreSQL
- [ ] Prisma client regenerated
- [ ] Database connection tested successfully
- [ ] Application restarted
- [ ] Project managers can be saved
- [ ] High performance table works
- [ ] No more Supabase performance warnings

## 🆘 Need Help?

If you're still experiencing issues:

1. Check the console logs for specific error messages
2. Verify your Supabase project settings
3. Test database connection directly in Supabase dashboard
4. Check network connectivity and firewall settings
5. Review the `fix-database-issues.js` script output

The fixes above should resolve both the RLS performance warnings and the database connection issues you're experiencing.
