// Script to add sample projection data to the database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleProjections() {
  try {
    console.log('Adding sample projection data...');
    
    // Sample project IDs (these should match your actual projects)
    const projectIds = [
      'project-1',
      'project-2', 
      'project-3',
      'project-4',
      'project-5'
    ];
    
    // Sample months for 2024
    const months = [
      '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
      '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
    ];
    
    // Create sample projections
    for (const projectId of projectIds) {
      for (const month of months) {
        // Generate random projection values between 5000 and 25000
        const value = Math.floor(Math.random() * 20000) + 5000;
        
        await prisma.projection.upsert({
          where: { 
            projectId_month: { projectId, month } 
          },
          update: { value },
          create: { projectId, month, value }
        });
        
        console.log(`Created projection for ${projectId}/${month}: $${value}`);
      }
    }
    
    console.log('✅ Sample projection data added successfully!');
    
    // Verify the data was added
    const count = await prisma.projection.count();
    console.log(`Total projections in database: ${count}`);
    
  } catch (error) {
    console.error('Error adding sample projections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleProjections();
