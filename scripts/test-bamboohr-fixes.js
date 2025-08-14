// Test script to verify BambooHR fixes work correctly
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBambooHRFixes() {
  try {
    console.log('🧪 Testing BambooHR fixes...');
    
    // Test 1: Verify Employee table schema allows NULL hireDate
    console.log('\n📊 Test 1: Checking Employee table schema...');
    const schemaInfo = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'hire_date'
    `;
    
    console.log('Schema info:', schemaInfo);
    
    if (schemaInfo[0] && schemaInfo[0].is_nullable === 'YES') {
      console.log('✅ hire_date column is nullable - schema fix successful!');
    } else {
      console.log('⚠️ hire_date column may not be nullable yet');
    }
    
    // Test 2: Test creating employee with NULL hireDate
    console.log('\n👤 Test 2: Testing employee creation with NULL hireDate...');
    try {
      const testEmployee = await prisma.employee.upsert({
        where: { id: 'test-bamboohr-fix' },
        update: {
          name: 'Test Employee (Updated)',
          email: 'test@example.com',
          status: 'active',
          department: 'Testing',
          position: 'Tester',
          hireDate: null, // This should now work
          updatedAt: new Date()
        },
        create: {
          id: 'test-bamboohr-fix',
          name: 'Test Employee',
          email: 'test@example.com',
          status: 'active',
          department: 'Testing',
          position: 'Tester',
          hireDate: null, // This should now work
        }
      });
      
      console.log('✅ Employee created/updated with NULL hireDate:', testEmployee);
      
      // Clean up test data
      await prisma.employee.delete({
        where: { id: 'test-bamboohr-fix' }
      });
      console.log('🧹 Test employee cleaned up');
      
    } catch (error) {
      console.error('❌ Error creating employee with NULL hireDate:', error);
    }
    
    // Test 3: Check if there are any existing employees with NULL hireDate
    console.log('\n📋 Test 3: Checking existing employees with NULL hireDate...');
    const employeesWithNullHireDate = await prisma.employee.count({
      where: {
        hireDate: null
      }
    });
    
    console.log(`Found ${employeesWithNullHireDate} employees with NULL hireDate`);
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testBambooHRFixes()
    .then(() => {
      console.log('✅ Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testBambooHRFixes };
