# RLS Policy Performance Fix

## Problem
Your Supabase database is generating multiple `auth_rls_initplan` warnings. These warnings indicate that Row Level Security (RLS) policies are re-evaluating `auth.<function>()` calls for each row, which significantly impacts query performance at scale.

## Root Cause
The issue occurs when RLS policies use direct function calls like:
```sql
-- ❌ Problematic - re-evaluates for each row
CREATE POLICY "policy_name" ON table_name
FOR SELECT USING (auth.role() = 'authenticated');
```

Instead of the optimized version:
```sql
-- ✅ Optimized - evaluates once per query
CREATE POLICY "policy_name" ON table_name
FOR SELECT USING ((select auth.role()) = 'authenticated');
```

## Affected Tables
Based on the warnings, these tables have performance issues:
- `Projection`
- `Status` 
- `Comment`
- `SignedFee`
- `AsrFee`
- `ClosedProject`
- `ProjectAssignment`
- `ProjectManager`
- `employees`
- `employee_salaries`
- `project_multipliers`
- `employee_time_entries`
- `bamboohr_config`

## Solution
We've created SQL scripts to fix all the RLS policies:

### 1. `fix-all-rls-policies.sql` (Recommended)
This comprehensive script fixes ALL tables at once by:
- Dropping existing problematic policies
- Recreating them with optimized `(select auth.role())` syntax
- Verifying the changes were applied correctly

### 2. `fix-rls-policies.sql`
This script focuses on the employee-related tables that were specifically mentioned in the warnings.

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)
1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `fix-all-rls-policies.sql`
4. Paste and execute the script
5. Verify the policies were updated correctly

### Option 2: PowerShell Helper
1. Run `fix-rls-policies.ps1` in PowerShell
2. Follow the on-screen instructions
3. Copy the SQL content to Supabase

### Option 3: Direct Database Connection
If you have direct database access, you can run the SQL scripts directly against your PostgreSQL database.

## What the Fix Does
- **Before**: `auth.role()` was evaluated for every single row in queries
- **After**: `(select auth.role())` is evaluated once per query execution

## Benefits
- ✅ Eliminates all `auth_rls_initplan` warnings
- ✅ Improves query performance, especially for large datasets
- ✅ Maintains the same security level
- ✅ No changes to your application code required

## Verification
After running the fix, you can verify it worked by:
1. Checking the Supabase dashboard for warnings
2. Running the verification queries in the SQL script
3. Monitoring query performance improvements

## Important Notes
- The fix maintains the exact same security behavior
- No data is lost or modified
- Your application will continue to work exactly as before
- The performance improvement will be most noticeable with larger datasets

## Technical Details
The `(select auth.role())` syntax tells PostgreSQL to evaluate the function once during query planning rather than re-evaluating it for each row during execution. This is a PostgreSQL optimization technique specifically recommended by Supabase for RLS policies.

## Support
If you encounter any issues after applying the fix:
1. Check the SQL execution logs in Supabase
2. Verify all policies were created correctly
3. Ensure RLS is still enabled on all tables
4. Test basic CRUD operations to confirm security still works
