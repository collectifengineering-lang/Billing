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
