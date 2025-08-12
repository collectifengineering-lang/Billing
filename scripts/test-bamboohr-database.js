const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBambooHRDatabase() {
  try {
    console.log('Testing BambooHR database integration...\n');

    // Test 1: Check if tables exist and are accessible
    console.log('1. Testing table accessibility...');
    
    try {
      const employees = await prisma.employee.findMany();
      console.log(`   ✓ Employees table accessible: ${employees.length} records`);
    } catch (error) {
      console.log(`   ✗ Employees table error: ${error.message}`);
    }

    try {
      const salaries = await prisma.employeeSalary.findMany();
      console.log(`   ✓ Employee salaries table accessible: ${salaries.length} records`);
    } catch (error) {
      console.log(`   ✗ Employee salaries table error: ${error.message}`);
    }

    try {
      const multipliers = await prisma.projectMultiplier.findMany();
      console.log(`   ✓ Project multipliers table accessible: ${multipliers.length} records`);
    } catch (error) {
      console.log(`   ✗ Project multipliers table error: ${error.message}`);
    }

    try {
      const timeEntries = await prisma.employeeTimeEntry.findMany();
      console.log(`   ✓ Employee time entries table accessible: ${timeEntries.length} records`);
    } catch (error) {
      console.log(`   ✗ Employee time entries table error: ${error.message}`);
    }

    try {
      const configs = await prisma.bambooHRConfig.findMany();
      console.log(`   ✓ BambooHR config table accessible: ${configs.length} records`);
    } catch (error) {
      console.log(`   ✗ BambooHR config table error: ${error.message}`);
    }

    // Test 2: Try to insert test data
    console.log('\n2. Testing data insertion...');
    
    try {
      const testEmployee = await prisma.employee.upsert({
        where: { id: '__test_employee__' },
        update: {},
        create: {
          id: '__test_employee__',
          name: 'Test Employee',
          email: 'test@example.com',
          status: 'active',
          department: 'Test',
          position: 'Tester',
          hireDate: '2024-01-01'
        }
      });
      console.log(`   ✓ Test employee created: ${testEmployee.name}`);
      
      // Clean up test data
      await prisma.employee.delete({
        where: { id: '__test_employee__' }
      });
      console.log('   ✓ Test employee cleaned up');
    } catch (error) {
      console.log(`   ✗ Test employee creation error: ${error.message}`);
    }

    // Test 3: Check database connection
    console.log('\n3. Testing database connection...');
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log('   ✓ Database connection successful');
    } catch (error) {
      console.log(`   ✗ Database connection error: ${error.message}`);
    }

    console.log('\nDatabase test completed!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBambooHRDatabase();
