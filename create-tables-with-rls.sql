-- Create tables for the billing application with Row Level Security (RLS)

-- Projection table
CREATE TABLE IF NOT EXISTS "Projection" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    UNIQUE("projectId", "month")
);

-- Status table
CREATE TABLE IF NOT EXISTS "Status" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    UNIQUE("projectId", "month")
);

-- Comment table
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    UNIQUE("projectId", "month")
);

-- SignedFee table
CREATE TABLE IF NOT EXISTS "SignedFee" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL UNIQUE,
    "value" DOUBLE PRECISION NOT NULL
);

-- AsrFee table
CREATE TABLE IF NOT EXISTS "AsrFee" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL UNIQUE,
    "value" DOUBLE PRECISION NOT NULL
);

-- ClosedProject table
CREATE TABLE IF NOT EXISTS "ClosedProject" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL UNIQUE
);

-- ProjectAssignment table
CREATE TABLE IF NOT EXISTS "ProjectAssignment" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL UNIQUE,
    "managerId" TEXT NOT NULL
);

-- ProjectManager table
CREATE TABLE IF NOT EXISTS "ProjectManager" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE "Projection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignedFee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AsrFee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClosedProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectManager" ENABLE ROW LEVEL SECURITY;

-- Create optimized policies that prevent re-evaluation of auth functions for each row
-- This resolves the Supabase performance warnings by using (select auth.role()) instead of auth.role()

-- Projection policies
CREATE POLICY "Enable all operations for authenticated users" ON "Projection"
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- Status policies
CREATE POLICY "Enable all operations for authenticated users" ON "Status"
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- Comment policies
CREATE POLICY "Enable all operations for authenticated users" ON "Comment"
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- SignedFee policies
CREATE POLICY "Enable all operations for authenticated users" ON "SignedFee"
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- AsrFee policies
CREATE POLICY "Enable all operations for authenticated users" ON "AsrFee"
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- ClosedProject policies
CREATE POLICY "Enable all operations for authenticated users" ON "ClosedProject"
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- ProjectAssignment policies
CREATE POLICY "Enable all operations for authenticated users" ON "ProjectAssignment"
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- ProjectManager policies
CREATE POLICY "Enable all operations for authenticated users" ON "ProjectManager"
    FOR ALL USING ((select auth.role()) = 'authenticated');
