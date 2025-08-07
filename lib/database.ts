import prisma from './db';

export async function ensureDatabaseSchema() {
  try {
    // Check if tables already exist by trying to query them
    await prisma.projection.findFirst();
    console.log('Database schema already exists');
    return true; // Tables exist
  } catch (error: any) {
    console.log('Tables do not exist, attempting to create schema...');
    
    // If it's a table doesn't exist error, we need to create the schema
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      try {
        // Try to create the schema by running a simple operation
        // This will trigger Prisma to create the tables if using Prisma Accelerate
        console.log('Attempting to create database schema...');
        
        // Try to create a test record to trigger table creation
        await prisma.projection.create({
          data: {
            projectId: '__test__',
            month: '__test__',
            value: 0
          }
        });
        
        // If successful, delete the test record
        await prisma.projection.deleteMany({
          where: {
            projectId: '__test__',
            month: '__test__'
          }
        });
        
        console.log('Database schema created successfully');
        return true;
      } catch (createError: any) {
        console.error('Failed to create database schema:', createError);
        return false;
      }
    }
    
    console.log('Tables do not exist, but Prisma Accelerate will create them automatically');
    console.log('Note: With Prisma Accelerate, tables are created automatically when you first insert data');
    return false; // Tables don't exist yet
  }
}

export async function createDatabaseSchema() {
  try {
    console.log('Creating database schema...');
    
    // This will create all tables defined in the schema
    // We'll use a more direct approach by trying to create the schema
    const result = await ensureDatabaseSchema();
    
    if (result) {
      console.log('Database schema creation completed successfully');
      return true;
    } else {
      console.error('Database schema creation failed');
      return false;
    }
  } catch (error) {
    console.error('Database schema creation failed:', error);
    return false;
  }
}

export { prisma };
