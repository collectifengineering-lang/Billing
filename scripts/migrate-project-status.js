const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateProjectStatus() {
  try {
    console.log('Starting project status migration...');
    
    // Create the Project table if it doesn't exist
    console.log('Creating Project table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Project" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "customerName" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `;
    
    // Migrate existing closed projects to the new Project table
    console.log('Migrating existing closed projects...');
    const closedProjects = await prisma.closedProject.findMany();
    
    for (const closedProject of closedProjects) {
      try {
        await prisma.project.upsert({
          where: { id: closedProject.projectId },
          update: { status: 'closed' },
          create: {
            id: closedProject.projectId,
            name: `Project ${closedProject.projectId}`,
            status: 'closed'
          }
        });
        console.log(`Migrated project ${closedProject.projectId} to closed status`);
      } catch (error) {
        console.error(`Error migrating project ${closedProject.projectId}:`, error);
      }
    }
    
    console.log('Migration completed successfully!');
    console.log(`Migrated ${closedProjects.length} closed projects`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateProjectStatus()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
