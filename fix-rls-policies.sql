-- Fix RLS Policies for Supabase Performance Optimization
-- This script updates existing RLS policies to prevent re-evaluation of auth functions for each row
-- Run this in your Supabase SQL editor to resolve the performance warnings

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Projection";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Status";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "Comment";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "SignedFee";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "AsrFee";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ClosedProject";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ProjectAssignment";
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON "ProjectManager";

-- Recreate policies with optimized format to prevent performance issues
-- Using (select auth.role()) instead of auth.role() prevents re-evaluation for each row

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

-- Verify the policies were created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('Projection', 'Status', 'Comment', 'SignedFee', 'AsrFee', 'ClosedProject', 'ProjectAssignment', 'ProjectManager')
ORDER BY tablename, policyname;
