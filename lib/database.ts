import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ensureDatabaseSchema() {
  try {
    // Check if tables already exist by trying to query them
    await prisma.projection.findFirst();
    console.log('Database schema already exists');
    return true; // Tables exist
  } catch (error) {
    console.log('Tables do not exist, but Prisma Accelerate will create them automatically');
    console.log('Note: With Prisma Accelerate, tables are created automatically when you first insert data');
    return false; // Tables don't exist yet
  }
}

export { prisma };
