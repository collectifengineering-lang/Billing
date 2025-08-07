const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test if we can connect
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test if tables exist by trying to query them
    try {
      await prisma.projection.findFirst();
      console.log('✅ Tables exist');
    } catch (error) {
      console.log('❌ Tables do not exist, creating them...');
      
      // Create tables
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
      
      console.log('✅ Tables created successfully');
    }
    
    // Test inserting and querying data
    const testProjection = await prisma.projection.upsert({
      where: { projectId_month: { projectId: 'test', month: '2024-01' } },
      update: { value: 1000 },
      create: { projectId: 'test', month: '2024-01', value: 1000 },
    });
    console.log('✅ Test data inserted:', testProjection);
    
    const projections = await prisma.projection.findMany();
    console.log('✅ Data retrieved:', projections.length, 'records');
    
    // Clean up test data
    await prisma.projection.deleteMany({
      where: { projectId: 'test' }
    });
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
