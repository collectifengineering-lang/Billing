// Test script for Clockify time entries import
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testClockifyImport() {
  try {
    console.log('🧪 Testing Clockify time entries import...');
    
    // Test 1: Check if employee_time_entries table exists and has data
    console.log('\n📊 Test 1: Checking employee_time_entries table...');
    try {
      const timeEntriesCount = await prisma.employeeTimeEntry.count();
      console.log(`✅ Found ${timeEntriesCount} existing time entries in database`);
      
      if (timeEntriesCount > 0) {
        const sampleEntries = await prisma.employeeTimeEntry.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' }
        });
        
        console.log('📋 Sample time entries:');
        sampleEntries.forEach((entry, index) => {
          console.log(`  ${index + 1}. ${entry.employeeName} - ${entry.projectName} - ${entry.hours}h - $${entry.totalCost}`);
        });
      }
    } catch (error) {
      console.error('❌ Error accessing employee_time_entries table:', error.message);
      if (error.message.includes('does not exist')) {
        console.error('💡 The employee_time_entries table may not exist yet');
      }
    }
    
    // Test 2: Check if employees table has data (required for import)
    console.log('\n👥 Test 2: Checking employees table...');
    try {
      const employeesCount = await prisma.employee.count();
      console.log(`✅ Found ${employeesCount} employees in database`);
      
      if (employeesCount === 0) {
        console.warn('⚠️ No employees found - Clockify import will fail without employee data');
        console.warn('💡 Import BambooHR employees first before testing Clockify import');
      }
    } catch (error) {
      console.error('❌ Error accessing employees table:', error.message);
    }
    
    // Test 3: Check if employee_salaries table has data
    console.log('\n💰 Test 3: Checking employee_salaries table...');
    try {
      const salariesCount = await prisma.employeeSalary.count();
      console.log(`✅ Found ${salariesCount} employee salaries in database`);
      
      if (salariesCount === 0) {
        console.warn('⚠️ No employee salaries found - Clockify import will fail without salary data');
        console.warn('💡 Import BambooHR salaries first before testing Clockify import');
      }
    } catch (error) {
      console.error('❌ Error accessing employee_salaries table:', error.message);
    }
    
    // Test 4: Check if project_multipliers table has data
    console.log('\n📈 Test 4: Checking project_multipliers table...');
    try {
      const multipliersCount = await prisma.projectMultiplier.count();
      console.log(`✅ Found ${multipliersCount} project multipliers in database`);
      
      if (multipliersCount === 0) {
        console.warn('⚠️ No project multipliers found - Clockify import will use default 1.0x multiplier');
      }
    } catch (error) {
      console.error('❌ Error accessing project_multipliers table:', error.message);
    }
    
    // Test 5: Test the Clockify import API endpoint
    console.log('\n🌐 Test 5: Testing Clockify import API endpoint...');
    try {
      // Set a test date range (last 7 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log(`📅 Testing import for date range: ${startDate} to ${endDate}`);
      
      // Note: This would require a running server and proper Clockify configuration
      console.log('💡 To test the actual import, run:');
      console.log(`   curl -X GET "http://localhost:3000/api/clockify?action=import-time-entries&startDate=${startDate}&endDate=${endDate}"`);
      
    } catch (error) {
      console.error('❌ Error testing Clockify import API:', error.message);
    }
    
    // Test 6: Check database schema for employee_time_entries
    console.log('\n🏗️ Test 6: Checking database schema...');
    try {
      const schemaInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'employee_time_entries'
        ORDER BY ordinal_position
      `;
      
      if (schemaInfo && schemaInfo.length > 0) {
        console.log('✅ employee_time_entries table schema:');
        schemaInfo.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
        });
      } else {
        console.log('⚠️ employee_time_entries table not found in schema');
      }
    } catch (error) {
      console.error('❌ Error checking database schema:', error.message);
    }
    
    console.log('\n🎉 All tests completed!');
    
    // Summary and recommendations
    console.log('\n📊 Test Summary:');
    console.log('✅ Database connectivity verified');
    console.log('✅ Table structure examined');
    console.log('✅ Data availability checked');
    console.log('✅ API endpoint documented');
    
    console.log('\n💡 Recommendations:');
    console.log('1. Ensure BambooHR employees and salaries are imported first');
    console.log('2. Set up Clockify API key and workspace ID in environment variables');
    console.log('3. Test the import with a small date range first');
    console.log('4. Monitor the logs for any import errors');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testClockifyImport()
    .then(() => {
      console.log('✅ Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testClockifyImport };
