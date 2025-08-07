import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ensureDatabaseSchema() {
  try {
    // Check if tables already exist by trying to query them
    await prisma.projection.findFirst();
    return true; // Tables exist
  } catch (error) {
    console.log('Tables do not exist, creating them...');
    
    try {
      // Create tables if they don't exist
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Projection" (
          "id" SERIAL PRIMARY KEY,
          "projectId" TEXT NOT NULL,
          "month" TEXT NOT NULL,
          "value" DOUBLE PRECISION NOT NULL,
          UNIQUE("projectId", "month")
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Status" (
          "id" SERIAL PRIMARY KEY,
          "projectId" TEXT NOT NULL,
          "month" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          UNIQUE("projectId", "month")
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Comment" (
          "id" SERIAL PRIMARY KEY,
          "projectId" TEXT NOT NULL,
          "month" TEXT NOT NULL,
          "comment" TEXT NOT NULL,
          UNIQUE("projectId", "month")
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SignedFee" (
          "id" SERIAL PRIMARY KEY,
          "projectId" TEXT NOT NULL UNIQUE,
          "value" DOUBLE PRECISION NOT NULL
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "AsrFee" (
          "id" SERIAL PRIMARY KEY,
          "projectId" TEXT NOT NULL UNIQUE,
          "value" DOUBLE PRECISION NOT NULL
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "ClosedProject" (
          "id" SERIAL PRIMARY KEY,
          "projectId" TEXT NOT NULL UNIQUE
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "ProjectAssignment" (
          "id" SERIAL PRIMARY KEY,
          "projectId" TEXT NOT NULL UNIQUE,
          "managerId" TEXT NOT NULL
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "ProjectManager" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "color" TEXT NOT NULL
        );
      `;

      console.log('Database schema created successfully');
      return true;
    } catch (setupError) {
      console.error('Failed to create database schema:', setupError);
      return false;
    }
  }
}

export { prisma };
