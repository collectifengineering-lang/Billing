const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateEmployeeSchema() {
  try {
    console.log('🔄 Starting database schema update...');
    
    // Update the Employee table to make hireDate optional
    console.log('📝 Updating Employee table schema...');
    
    // First, check current schema
    const currentEmployees = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'hire_date'
    `;
    
    console.log('📊 Current hire_date column info:', currentEmployees);
    
    // Update the column to allow NULL values
    await prisma.$executeRaw`
      ALTER TABLE employees 
      ALTER COLUMN hire_date DROP NOT NULL
    `;
    
    console.log('✅ Successfully updated hire_date column to allow NULL values');
    
    // Verify the change
    const updatedEmployees = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'hire_date'
    `;
    
    console.log('📊 Updated hire_date column info:', updatedEmployees);
    
    // Check for any existing employees with NULL hire_date
    const employeesWithNullHireDate = await prisma.employee.count({
      where: {
        hireDate: null
      }
    });
    
    console.log(`📋 Found ${employeesWithNullHireDate} employees with NULL hire_date`);
    
    console.log('✅ Database schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating database schema:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateEmployeeSchema()
    .then(() => {
      console.log('🎉 Schema update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Schema update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateEmployeeSchema };
