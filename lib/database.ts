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

export async function testDatabaseConnection() {
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('Database connection successful');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database query test successful:', result);
    
    return true;
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    
    // Provide specific error guidance
    if (error.message?.includes('ENOTFOUND')) {
      console.error('Network error: Check your DATABASE_URL and network connectivity');
    } else if (error.message?.includes('authentication failed')) {
      console.error('Authentication error: Check your database credentials');
    } else if (error.message?.includes('does not exist')) {
      console.error('Database does not exist: Check your database name in the connection URL');
    } else if (error.message?.includes('connection timeout')) {
      console.error('Connection timeout: Check your network and database server status');
    }
    
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// BambooHR Database Operations
export async function saveBambooHRConfig(config: {
  subdomain: string;
  apiKey: string;
  webhookSecret?: string;
}) {
  try {
    const result = await prisma.bambooHRConfig.upsert({
      where: { subdomain: config.subdomain },
      update: {
        apiKey: config.apiKey,
        webhookSecret: config.webhookSecret,
        isActive: true,
        lastSync: new Date(),
        updatedAt: new Date()
      },
      create: {
        subdomain: config.subdomain,
        apiKey: config.apiKey,
        webhookSecret: config.webhookSecret,
        isActive: true,
        lastSync: new Date()
      }
    });
    
    console.log(`BambooHR config saved for subdomain: ${config.subdomain}`);
    return result;
  } catch (error) {
    console.error('Error saving BambooHR config:', error);
    throw error;
  }
}

export async function getBambooHRConfig(subdomain: string) {
  try {
    return await prisma.bambooHRConfig.findUnique({
      where: { subdomain }
    });
  } catch (error) {
    console.error('Error getting BambooHR config:', error);
    throw error;
  }
}

export async function saveEmployee(employee: {
  id: string;
  name: string;
  email: string;
  status: string;
  department?: string;
  position?: string;
  hireDate: string;
  terminationDate?: string;
}) {
  try {
    const result = await prisma.employee.upsert({
      where: { id: employee.id },
      update: {
        name: employee.name,
        email: employee.email,
        status: employee.status,
        department: employee.department,
        position: employee.position,
        hireDate: employee.hireDate,
        terminationDate: employee.terminationDate,
        updatedAt: new Date()
      },
      create: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        status: employee.status,
        department: employee.department,
        position: employee.position,
        hireDate: employee.hireDate,
        terminationDate: employee.terminationDate
      }
    });
    
    console.log(`Employee saved: ${employee.name} (${employee.id})`);
    return result;
  } catch (error) {
    console.error('Error saving employee:', error);
    throw error;
  }
}

export async function saveEmployeeSalary(salary: {
  employeeId: string;
  effectiveDate: string;
  endDate?: string | null;
  annualSalary: number;
  hourlyRate: number;
  currency?: string;
  notes?: string;
  source?: string;
}) {
  try {
    const result = await prisma.employeeSalary.upsert({
      where: {
        employeeId_effectiveDate: {
          employeeId: salary.employeeId,
          effectiveDate: salary.effectiveDate
        }
      },
      update: {
        endDate: salary.endDate,
        annualSalary: salary.annualSalary,
        hourlyRate: salary.hourlyRate,
        currency: salary.currency,
        notes: salary.notes,
        source: salary.source,
        updatedAt: new Date()
      },
      create: {
        employeeId: salary.employeeId,
        effectiveDate: salary.effectiveDate,
        endDate: salary.endDate,
        annualSalary: salary.annualSalary,
        hourlyRate: salary.hourlyRate,
        currency: salary.currency || 'USD',
        notes: salary.notes,
        source: salary.source || 'bamboohr'
      }
    });
    
    console.log(`Employee salary saved for ${salary.employeeId} effective ${salary.effectiveDate}`);
    return result;
  } catch (error) {
    console.error('Error saving employee salary:', error);
    throw error;
  }
}

export async function saveProjectMultiplier(multiplier: {
  projectId: string;
  projectName: string;
  multiplier: number;
  effectiveDate: string;
  endDate?: string;
  notes?: string;
}) {
  try {
    const result = await prisma.projectMultiplier.upsert({
      where: {
        projectId_effectiveDate: {
          projectId: multiplier.projectId,
          effectiveDate: multiplier.effectiveDate
        }
      },
      update: {
        projectName: multiplier.projectName,
        multiplier: multiplier.multiplier,
        endDate: multiplier.endDate,
        notes: multiplier.notes,
        updatedAt: new Date()
      },
      create: {
        projectId: multiplier.projectId,
        projectName: multiplier.projectName,
        multiplier: multiplier.multiplier,
        effectiveDate: multiplier.effectiveDate,
        endDate: multiplier.endDate,
        notes: multiplier.notes
      }
    });
    
    console.log(`Project multiplier saved for ${multiplier.projectName} effective ${multiplier.effectiveDate}`);
    return result;
  } catch (error) {
    console.error('Error saving project multiplier:', error);
    throw error;
  }
}

export async function saveEmployeeTimeEntry(timeEntry: {
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  date: string;
  hours: number;
  billableHours: number;
  nonBillableHours: number;
  hourlyRate: number;
  projectMultiplier: number;
  totalCost: number;
  billableValue: number;
  efficiency: number;
  description?: string;
  tags: string[];
}) {
  try {
    const result = await prisma.employeeTimeEntry.upsert({
      where: {
        employeeId_projectId_date: {
          employeeId: timeEntry.employeeId,
          projectId: timeEntry.projectId,
          date: timeEntry.date
        }
      },
      update: {
        employeeName: timeEntry.employeeName,
        projectName: timeEntry.projectName,
        hours: timeEntry.hours,
        billableHours: timeEntry.billableHours,
        nonBillableHours: timeEntry.nonBillableHours,
        hourlyRate: timeEntry.hourlyRate,
        projectMultiplier: timeEntry.projectMultiplier,
        totalCost: timeEntry.totalCost,
        billableValue: timeEntry.billableValue,
        efficiency: timeEntry.efficiency,
        description: timeEntry.description,
        tags: timeEntry.tags,
        updatedAt: new Date()
      },
      create: {
        employeeId: timeEntry.employeeId,
        employeeName: timeEntry.employeeName,
        projectId: timeEntry.projectId,
        projectName: timeEntry.projectName,
        date: timeEntry.date,
        hours: timeEntry.hours,
        billableHours: timeEntry.billableHours,
        nonBillableHours: timeEntry.nonBillableHours,
        hourlyRate: timeEntry.hourlyRate,
        projectMultiplier: timeEntry.projectMultiplier,
        totalCost: timeEntry.totalCost,
        billableValue: timeEntry.billableValue,
        efficiency: timeEntry.efficiency,
        description: timeEntry.description,
        tags: timeEntry.tags
      }
    });
    
    console.log(`Time entry saved for ${timeEntry.employeeName} on ${timeEntry.date}`);
    return result;
  } catch (error) {
    console.error('Error saving time entry:', error);
    throw error;
  }
}

export async function getAllEmployees() {
  try {
    return await prisma.employee.findMany({
      include: {
        salaries: true
      }
    });
  } catch (error) {
    console.error('Error getting all employees:', error);
    throw error;
  }
}

export async function getAllEmployeeSalaries() {
  try {
    return await prisma.employeeSalary.findMany({
      include: {
        employee: true
      }
    });
  } catch (error) {
    console.error('Error getting all employee salaries:', error);
    throw error;
  }
}

export async function getAllProjectMultipliers() {
  try {
    return await prisma.projectMultiplier.findMany();
  } catch (error) {
    console.error('Error getting all project multipliers:', error);
    throw error;
  }
}

export async function getAllEmployeeTimeEntries() {
  try {
    return await prisma.employeeTimeEntry.findMany({
      include: {
        employee: true
      }
    });
  } catch (error) {
    console.error('Error getting all time entries:', error);
    throw error;
  }
}

export { prisma };
