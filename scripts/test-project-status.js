const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testProjectStatus() {
  try {
    console.log('Testing project status functionality...');
    
    // Test 1: Create a test project
    console.log('\n1. Creating test project...');
    const testProject = await prisma.project.upsert({
      where: { id: 'test-project-1' },
      update: {},
      create: {
        id: 'test-project-1',
        name: 'Test Project 1',
        customerName: 'Test Customer',
        status: 'active'
      }
    });
    console.log('✓ Test project created:', testProject);
    
    // Test 2: Update project status to closed
    console.log('\n2. Updating project status to closed...');
    const closedProject = await prisma.project.update({
      where: { id: 'test-project-1' },
      data: { status: 'closed' }
    });
    console.log('✓ Project status updated to closed:', closedProject);
    
    // Test 3: Query all project statuses
    console.log('\n3. Querying all project statuses...');
    const allProjects = await prisma.project.findMany({
      select: { id: true, status: true }
    });
    console.log('✓ All project statuses:', allProjects);
    
    // Test 4: Query only closed projects
    console.log('\n4. Querying closed projects...');
    const closedProjects = await prisma.project.findMany({
      where: { status: 'closed' },
      select: { id: true, status: true }
    });
    console.log('✓ Closed projects:', closedProjects);
    
    // Test 5: Query only active projects
    console.log('\n5. Querying active projects...');
    const activeProjects = await prisma.project.findMany({
      where: { status: 'active' },
      select: { id: true, status: true }
    });
    console.log('✓ Active projects:', activeProjects);
    
    // Test 6: Update project status back to active
    console.log('\n6. Updating project status back to active...');
    const reopenedProject = await prisma.project.update({
      where: { id: 'test-project-1' },
      data: { status: 'active' }
    });
    console.log('✓ Project status updated to active:', reopenedProject);
    
    // Test 7: Clean up test data
    console.log('\n7. Cleaning up test data...');
    await prisma.project.delete({
      where: { id: 'test-project-1' }
    });
    console.log('✓ Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Project status functionality is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testProjectStatus()
  .then(() => {
    console.log('\nTest script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest script failed:', error);
    process.exit(1);
  });
