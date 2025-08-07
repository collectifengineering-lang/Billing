const { PrismaClient } = require('@prisma/client');

// Set environment variables
process.env.DATABASE_URL = "postgres://postgres.rjhkagqsiamwpiiszbgs:eUAUpixlcPkwgMhs@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x";

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('Connecting to Supabase database...');
    
    // Test the connection
    await prisma.$connect();
    console.log('Connected successfully!');
    
    // Try to create the schema by inserting test data
    console.log('Creating database schema...');
    
    // Create test data for each table to trigger table creation
    await prisma.projection.create({
      data: {
        projectId: '__migration_test__',
        month: '__migration_test__',
        value: 0
      }
    });
    
    await prisma.status.create({
      data: {
        projectId: '__migration_test__',
        month: '__migration_test__',
        status: '__migration_test__'
      }
    });
    
    await prisma.comment.create({
      data: {
        projectId: '__migration_test__',
        month: '__migration_test__',
        comment: '__migration_test__'
      }
    });
    
    await prisma.signedFee.create({
      data: {
        projectId: '__migration_test__',
        value: 0
      }
    });
    
    await prisma.asrFee.create({
      data: {
        projectId: '__migration_test__',
        value: 0
      }
    });
    
    await prisma.closedProject.create({
      data: {
        projectId: '__migration_test__'
      }
    });
    
    await prisma.projectAssignment.create({
      data: {
        projectId: '__migration_test__',
        managerId: '__migration_test__'
      }
    });
    
    await prisma.projectManager.create({
      data: {
        id: '__migration_test__',
        name: '__migration_test__',
        color: '#000000'
      }
    });
    
    // Clean up test data
    await prisma.projection.deleteMany({
      where: { projectId: '__migration_test__' }
    });
    await prisma.status.deleteMany({
      where: { projectId: '__migration_test__' }
    });
    await prisma.comment.deleteMany({
      where: { projectId: '__migration_test__' }
    });
    await prisma.signedFee.deleteMany({
      where: { projectId: '__migration_test__' }
    });
    await prisma.asrFee.deleteMany({
      where: { projectId: '__migration_test__' }
    });
    await prisma.closedProject.deleteMany({
      where: { projectId: '__migration_test__' }
    });
    await prisma.projectAssignment.deleteMany({
      where: { projectId: '__migration_test__' }
    });
    await prisma.projectManager.deleteMany({
      where: { id: '__migration_test__' }
    });
    
    console.log('Database schema created successfully!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
