const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBambooHRIntegration() {
  try {
    console.log('Testing BambooHR Integration and Database...\n');

    // Test 1: Check environment variables
    console.log('1. Checking environment variables...');
    const requiredEnvVars = ['DATABASE_URL', 'DIRECT_URL'];
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`   ✓ ${envVar} is set`);
      } else {
        console.log(`   ✗ ${envVar} is missing`);
      }
    }

    // Test 2: Test database connection
    console.log('\n2. Testing database connection...');
    try {
      await prisma.$connect();
      console.log('   ✓ Database connection successful');
    } catch (error) {
      console.log(`   ✗ Database connection failed: ${error.message}`);
      return;
    }

    // Test 3: Check if tables exist
    console.log('\n3. Checking table existence...');
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('employees', 'employee_salaries', 'project_multipliers', 'employee_time_entries', 'bamboohr_config')
        ORDER BY table_name
      `;
      
      console.log('   Found tables:');
      for (const table of tables) {
        console.log(`     - ${table.table_name}`);
      }
    } catch (error) {
      console.log(`   ✗ Error checking tables: ${error.message}`);
    }

    // Test 4: Test Prisma models
    console.log('\n4. Testing Prisma models...');
    
    try {
      const employeeCount = await prisma.employee.count();
      console.log(`   ✓ Employee model: ${employeeCount} records`);
    } catch (error) {
      console.log(`   ✗ Employee model error: ${error.message}`);
    }

    try {
      const salaryCount = await prisma.employeeSalary.count();
      console.log(`   ✓ EmployeeSalary model: ${salaryCount} records`);
    } catch (error) {
      console.log(`   ✗ EmployeeSalary model error: ${error.message}`);
    }

    try {
      const multiplierCount = await prisma.projectMultiplier.count();
      console.log(`   ✓ ProjectMultiplier model: ${multiplierCount} records`);
    } catch (error) {
      console.log(`   ✗ ProjectMultiplier model error: ${error.message}`);
    }

    try {
      const timeEntryCount = await prisma.employeeTimeEntry.count();
      console.log(`   ✓ EmployeeTimeEntry model: ${timeEntryCount} records`);
    } catch (error) {
      console.log(`   ✗ EmployeeTimeEntry model error: ${error.message}`);
    }

    try {
      const configCount = await prisma.bambooHRConfig.count();
      console.log(`   ✓ BambooHRConfig model: ${configCount} records`);
    } catch (error) {
      console.log(`   ✗ BambooHRConfig model error: ${error.message}`);
    }

    // Test 5: Try to create test data
    console.log('\n5. Testing data creation...');
    
    try {
      // Create test employee
      const testEmployee = await prisma.employee.create({
        data: {
          id: '__test_employee__',
          name: 'Test Employee',
          email: 'test@example.com',
          status: 'active',
          department: 'Test',
          position: 'Tester',
          hireDate: '2024-01-01'
        }
      });
      console.log(`   ✓ Created test employee: ${testEmployee.name}`);

      // Create test salary
      const testSalary = await prisma.employeeSalary.create({
        data: {
          employeeId: testEmployee.id,
          effectiveDate: '2024-01-01',
          annualSalary: 50000,
          hourlyRate: 24.04
        }
      });
      console.log(`   ✓ Created test salary: $${testSalary.annualSalary}/year`);

      // Create test project multiplier
      const testMultiplier = await prisma.projectMultiplier.create({
        data: {
          projectId: '__test_project__',
          projectName: 'Test Project',
          multiplier: 1.5,
          effectiveDate: '2024-01-01'
        }
      });
      console.log(`   ✓ Created test multiplier: ${testMultiplier.multiplier}x`);

      // Create test time entry
      const testTimeEntry = await prisma.employeeTimeEntry.create({
        data: {
          employeeId: testEmployee.id,
          employeeName: testEmployee.name,
          projectId: '__test_project__',
          projectName: 'Test Project',
          date: '2024-01-01',
          hours: 8,
          billableHours: 8,
          nonBillableHours: 0,
          hourlyRate: 24.04,
          projectMultiplier: 1.5,
          totalCost: 192.32,
          billableValue: 288.48,
          efficiency: 1.0,
          tags: ['test', 'billing']
        }
      });
      console.log(`   ✓ Created test time entry: ${testTimeEntry.hours} hours`);

      // Clean up test data
      await prisma.employeeTimeEntry.delete({ where: { id: testTimeEntry.id } });
      await prisma.projectMultiplier.delete({ where: { id: testMultiplier.id } });
      await prisma.employeeSalary.delete({ where: { id: testSalary.id } });
      await prisma.employee.delete({ where: { id: testEmployee.id } });
      console.log('   ✓ Cleaned up test data');

    } catch (error) {
      console.log(`   ✗ Data creation error: ${error.message}`);
    }

    console.log('\nIntegration test completed!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBambooHRIntegration();
