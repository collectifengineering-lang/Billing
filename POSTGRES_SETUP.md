# PostgreSQL Setup Guide

## Database Configuration

### Environment Variables

Set these in your `.env` file and Vercel dashboard:

```env
DATABASE_URL="postgresql://[user]:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=30&connect_timeout=30&prepared_statements=false"
DIRECT_URL="postgresql://[user]:[password]@db.[project-ref].supabase.co:5432/postgres"
```

**Important:** Use transaction mode (port 6543) for runtime queries with pooling parameters. Use direct connection (port 5432) for migrations.

### Connection Parameters Explained

- `pgbouncer=true`: Enables connection pooling
- `connection_limit=1`: Limits to one connection per function invocation (prevents pile-up)
- `pool_timeout=30`: Longer wait time to reduce timeouts
- `connect_timeout=30`: Connection timeout for better handling of transient issues
- `prepared_statements=false`: Disables prepared statements to fix common Prisma pooling errors

**Note:** Supabase uses a single database, so `shadowDatabaseUrl` is not needed and would cause validation errors.

## Troubleshooting

### Connection Timeouts

If you encounter connection timeouts:

1. **Check your DATABASE_URL**: Ensure it uses port 6543 and includes the pooling parameters
2. **Verify DIRECT_URL**: Should use port 5432 for migrations
3. **Test locally**: Run `npx prisma db push` with DIRECT_URL in your .env

### Max Connections Errors (Supabase Free Tier)

If you get "max connections" errors:

1. **Update DATABASE_URL**: Use the exact format above with `connection_limit=1`
2. **Use singleton pattern**: Ensure all API routes import the same Prisma client instance
3. **Disable prepared statements**: Add `prepared_statements=false` to prevent pooling issues

### Vercel Build Errors

If you encounter "invalid domain character in database URL" during Vercel deployment:

1. **All API routes now have `export const dynamic = 'force-dynamic'`** to prevent static generation
2. **Prisma client is configured** to skip database connections during build time
3. **Environment variables** should be properly set in Vercel dashboard

**Note:** The build error occurs because Next.js tries to statically generate API routes during build, which attempts database connections. The `dynamic = 'force-dynamic'` export prevents this.

### Prisma Schema Validation Errors

If you get "shadowDatabaseUrl is the same as directUrl" error:

1. **Remove shadowDatabaseUrl**: Supabase uses a single database, so shadow database is not needed
2. **Use only url and directUrl**: Keep the configuration simple for Supabase
3. **Run `prisma generate`**: After fixing the schema

### Troubleshooting Connection Strings

If you get "invalid domain character in database URL" error:

1. **URL-encode special characters in password**:
   - `@` → `%40`
   - `$` → `%24`
   - `/` → `%2F`
   - `:` → `%3A`
   - `%` → `%25`
   - `#` → `%23`
   - `&` → `%26`
   - `+` → `%2B`
   - `=` → `%3D`
   - `?` → `%3F`
   - `space` → `%20`

2. **Example**: If password is `p@ss:word`, change to:
   ```
   postgresql://postgres.[user]:p%40ss%3Aword@db.[ref].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=30&connect_timeout=30&prepared_statements=false
   ```

3. **Check for typos/spaces** in Vercel environment variables
4. **Test connection locally** with `prisma db push` using `.env`
5. **Copy raw values** from Supabase dashboard > Database Settings > Connection Strings (URI format)

### Migration Issues

If migrations fail:

1. **Run locally first**: `npx prisma db push` with DIRECT_URL
2. **Check environment**: Ensure DIRECT_URL is set correctly
3. **Test connection**: Use the `/api/test-db` endpoint after deployment

### Migration Troubleshooting

If migration fails but data shows in Supabase:

1. **Check for URL parsing errors**: Encode password special characters (like `@=%40`)
2. **Set localStorage flag manually**: In browser console, run `localStorage.setItem('db_migrated', 'true')` to skip popups if already done
3. **Clear migration flags**: Run `localStorage.removeItem('db_migrated')` and `localStorage.removeItem('dataMigrated')` to retry migration
4. **Check connection timeouts**: Add `connect_timeout=30` to both DATABASE_URL and DIRECT_URL

## API Route Configuration

All API routes now include:
```typescript
export const dynamic = 'force-dynamic';
```

This prevents static generation and ensures routes only run at runtime, avoiding build-time database connection attempts.

## Testing

After deployment, test your database connection:
- Visit `/api/test-db` to verify the connection works
- Check Vercel function logs for any connection errors
- Monitor Supabase dashboard for connection usage 