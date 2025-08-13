-- Comprehensive Fix for All RLS Policy Performance Warnings
-- This script optimizes ALL RLS policies to prevent re-evaluation of auth functions for each row
-- This resolves ALL Supabase "auth_rls_initplan" warnings

-- Drop all existing policies that cause performance issues
-- Core tables
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Projection";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Status";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Comment";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "SignedFee";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "AsrFee";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ClosedProject";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ProjectAssignment";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ProjectManager";

-- Employee-related tables
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;

DROP POLICY IF EXISTS "employee_salaries_select_policy" ON employee_salaries;
DROP POLICY IF EXISTS "employee_salaries_insert_policy" ON employee_salaries;
DROP POLICY IF EXISTS "employee_salaries_update_policy" ON employee_salaries;
DROP POLICY IF EXISTS "employee_salaries_delete_policy" ON employee_salaries;

DROP POLICY IF EXISTS "project_multipliers_select_policy" ON project_multipliers;
DROP POLICY IF EXISTS "project_multipliers_insert_policy" ON project_multipliers;
DROP POLICY IF EXISTS "project_multipliers_update_policy" ON project_multipliers;
DROP POLICY IF EXISTS "project_multipliers_delete_policy" ON project_multipliers;

DROP POLICY IF EXISTS "employee_time_entries_select_policy" ON employee_time_entries;
DROP POLICY IF EXISTS "employee_time_entries_insert_policy" ON employee_time_entries;
DROP POLICY IF EXISTS "employee_time_entries_update_policy" ON employee_time_entries;
DROP POLICY IF EXISTS "employee_time_entries_delete_policy" ON employee_time_entries;

DROP POLICY IF EXISTS "bamboohr_config_select_policy" ON bamboohr_config;
DROP POLICY IF EXISTS "bamboohr_config_insert_policy" ON bamboohr_config;
DROP POLICY IF EXISTS "bamboohr_config_update_policy" ON bamboohr_config;
DROP POLICY IF EXISTS "bamboohr_config_delete_policy" ON bamboohr_config;

-- Recreate ALL policies with optimized format using (select auth.role()) to prevent re-evaluation

-- Core table policies (using FOR ALL for simplicity)
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

-- Employees table policies
CREATE POLICY "employees_select_policy" ON employees
FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "employees_insert_policy" ON employees
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "employees_update_policy" ON employees
FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "employees_delete_policy" ON employees
FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Employee salaries table policies
CREATE POLICY "employee_salaries_select_policy" ON employee_salaries
FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "employee_salaries_insert_policy" ON employee_salaries
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "employee_salaries_update_policy" ON employee_salaries
FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "employee_salaries_delete_policy" ON employee_salaries
FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Project multipliers table policies
CREATE POLICY "project_multipliers_select_policy" ON project_multipliers
FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "project_multipliers_insert_policy" ON project_multipliers
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "project_multipliers_update_policy" ON project_multipliers
FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "project_multipliers_delete_policy" ON project_multipliers
FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Employee time entries table policies
CREATE POLICY "employee_time_entries_select_policy" ON employee_time_entries
FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "employee_time_entries_insert_policy" ON employee_time_entries
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "employee_time_entries_update_policy" ON employee_time_entries
FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "employee_time_entries_delete_policy" ON employee_time_entries
FOR DELETE USING ((select auth.role()) = 'authenticated');

-- BambooHR config table policies
CREATE POLICY "bamboohr_config_select_policy" ON bamboohr_config
FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "bamboohr_config_insert_policy" ON bamboohr_config
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "bamboohr_config_update_policy" ON bamboohr_config
FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "bamboohr_config_delete_policy" ON bamboohr_config
FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Verify all policies were created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN (
  'Projection', 'Status', 'Comment', 'SignedFee', 'AsrFee', 'ClosedProject', 'ProjectAssignment', 'ProjectManager',
  'employees', 'employee_salaries', 'project_multipliers', 'employee_time_entries', 'bamboohr_config'
)
ORDER BY tablename, policyname;

-- Check for any remaining policies that might still use auth.role() directly
SELECT 
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies 
WHERE qual LIKE '%auth.role()%' 
  AND qual NOT LIKE '%(select auth.role())%'
ORDER BY tablename, policyname;
