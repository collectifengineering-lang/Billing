# Supabase Database Setup Guide

## Overview
This guide provides the complete SQL script to set up your billing application database in Supabase, including all tables, indexes, and Row Level Security (RLS) policies.

## Prerequisites
- Access to your Supabase project
- SQL Editor access in Supabase Dashboard

## Setup Instructions

### 1. Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Paste and Execute the Complete SQL Script
Copy the entire SQL script below and paste it into the SQL Editor, then click **Run**:

```sql
-- Create tables for the billing application

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

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  department VARCHAR(255),
  position VARCHAR(255),
  hire_date VARCHAR(10) NOT NULL,
  termination_date VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee salaries table
CREATE TABLE IF NOT EXISTS employee_salaries (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  effective_date VARCHAR(10) NOT NULL,
  end_date VARCHAR(10),
  annual_salary DECIMAL(12,2) NOT NULL,
  hourly_rate DECIMAL(8,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  source VARCHAR(50) DEFAULT 'bamboohr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(employee_id, effective_date)
);

-- Project multipliers table
CREATE TABLE IF NOT EXISTS project_multipliers (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  multiplier DECIMAL(4,2) NOT NULL,
  effective_date VARCHAR(10) NOT NULL,
  end_date VARCHAR(10),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, effective_date)
);

-- Employee time entries table
CREATE TABLE IF NOT EXISTS employee_time_entries (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  date VARCHAR(10) NOT NULL,
  hours DECIMAL(8,2) NOT NULL,
  billable_hours DECIMAL(8,2) NOT NULL,
  non_billable_hours DECIMAL(8,2) NOT NULL,
  hourly_rate DECIMAL(8,2) NOT NULL,
  project_multiplier DECIMAL(4,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  billable_value DECIMAL(12,2) NOT NULL,
  efficiency DECIMAL(4,4) NOT NULL,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(employee_id, project_id, date)
);

-- BambooHR config table
CREATE TABLE IF NOT EXISTS bamboohr_config (
  id SERIAL PRIMARY KEY,
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  webhook_secret VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee salary indexes
CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee_id ON employee_salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_effective_date ON employee_salaries(effective_date);

-- Project multiplier indexes
CREATE INDEX IF NOT EXISTS idx_project_multipliers_project_id ON project_multipliers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_multipliers_effective_date ON project_multipliers(effective_date);

-- Time entry indexes
CREATE INDEX IF NOT EXISTS idx_employee_time_entries_employee_id ON employee_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_time_entries_project_id ON employee_time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_employee_time_entries_date ON employee_time_entries(date);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bamboohr_config ENABLE ROW LEVEL SECURITY;

-- Employees table policies
CREATE POLICY "employees_select_policy" ON employees
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "employees_insert_policy" ON employees
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "employees_update_policy" ON employees
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "employees_delete_policy" ON employees
FOR DELETE USING (auth.role() = 'authenticated');

-- Employee salaries table policies
CREATE POLICY "employee_salaries_select_policy" ON employee_salaries
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "employee_salaries_insert_policy" ON employee_salaries
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "employee_salaries_update_policy" ON employee_salaries
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "employee_salaries_delete_policy" ON employee_salaries
FOR DELETE USING (auth.role() = 'authenticated');

-- Project multipliers table policies
CREATE POLICY "project_multipliers_select_policy" ON project_multipliers
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "project_multipliers_insert_policy" ON project_multipliers
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "project_multipliers_update_policy" ON project_multipliers
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "project_multipliers_delete_policy" ON project_multipliers
FOR DELETE USING (auth.role() = 'authenticated');

-- Employee time entries table policies
CREATE POLICY "employee_time_entries_select_policy" ON employee_time_entries
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "employee_time_entries_insert_policy" ON employee_time_entries
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "employee_time_entries_update_policy" ON employee_time_entries
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "employee_time_entries_delete_policy" ON employee_time_entries
FOR DELETE USING (auth.role() = 'authenticated');

-- BambooHR config table policies
CREATE POLICY "bamboohr_config_select_policy" ON bamboohr_config
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "bamboohr_config_insert_policy" ON bamboohr_config
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bamboohr_config_update_policy" ON bamboohr_config
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "bamboohr_config_delete_policy" ON bamboohr_config
FOR DELETE USING (auth.role() = 'authenticated');
```

### 3. Verify Setup
After running the script, you can verify the setup by running these verification queries:

#### Check Tables Created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

#### Check RLS Status
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('employees', 'employee_salaries', 'project_multipliers', 'employee_time_entries', 'bamboohr_config')
ORDER BY tablename;
```

#### Check Policies Created
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('employees', 'employee_salaries', 'project_multipliers', 'employee_time_entries', 'bamboohr_config')
ORDER BY tablename, policyname;
```

## What This Script Creates

### Core Billing Tables
- **Projection** - Project revenue projections by month
- **Status** - Project status tracking by month
- **Comment** - Project comments by month
- **SignedFee** - Signed project fees
- **AsrFee** - ASR project fees
- **ClosedProject** - Closed project tracking
- **ProjectAssignment** - Project manager assignments
- **ProjectManager** - Project manager information

### Payroll & HR Tables
- **employees** - Employee master data
- **employee_salaries** - Historical salary records
- **project_multipliers** - Project billing multipliers
- **employee_time_entries** - Time tracking with cost calculations
- **bamboohr_config** - BambooHR integration configuration

### Performance Features
- **Indexes** on frequently queried fields
- **Foreign Keys** for data integrity
- **Unique Constraints** to prevent duplicates

### Security Features
- **Row Level Security (RLS)** enabled on all tables
- **Authentication Policies** requiring authenticated users
- **CRUD Policies** for all operations (SELECT, INSERT, UPDATE, DELETE)

## Next Steps

After successfully running this script:

1. **Test the BambooHR Integration** using your API endpoints
2. **Update the Dashboard API** to use real salary data
3. **Import Employee Data** from BambooHR
4. **Set up Project Multipliers** for your projects
5. **Test Time Entry Processing** with real salary data

## Troubleshooting

### If You Get Policy Already Exists Errors
This means RLS is already set up. You can skip the policy creation section or remove existing policies first:

```sql
-- Remove existing policies (only if needed)
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
-- Repeat for other policies as needed
```

### If Tables Already Exist
The `IF NOT EXISTS` clauses will prevent errors, but you can drop and recreate if needed:

```sql
-- Drop and recreate (use with caution)
DROP TABLE IF EXISTS employees CASCADE;
-- Then run the CREATE TABLE statements again
```

## Support

If you encounter any issues:
1. Check the Supabase logs for detailed error messages
2. Verify your database user has the necessary permissions
3. Ensure you're running the script in the correct schema (usually 'public')

---

**Note**: This script is designed to be idempotent - you can run it multiple times safely. The `IF NOT EXISTS` clauses and `DROP POLICY IF EXISTS` statements prevent errors on subsequent runs.
