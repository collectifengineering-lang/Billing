import prisma from './db';

/**
 * Database connection retry configuration
 */
const DB_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2, // Exponential backoff
  timeout: 10000, // 10 seconds
};

/**
 * Wait for a specified duration
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = 'code' in error ? (error as { code: string }).code : undefined;
  
  // Retryable errors
  const retryablePatterns = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'connection',
    'timeout',
    'P1001', // Prisma connection error
    'P1008', // Prisma timeout
  ];
  
  return retryablePatterns.some(pattern => 
    errorMessage.includes(pattern) || errorCode === pattern
  );
}

/**
 * Execute database operation with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries = DB_RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: unknown;
  let delay = DB_RETRY_CONFIG.retryDelay;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      
      // Don't retry if error is not retryable or if we've exhausted retries
      if (!isRetryableError(error) || attempt === retries) {
        throw error;
      }
      
      // Log retry attempt
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `⚠️ Database operation "${operationName}" failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`,
          error instanceof Error ? error.message : String(error)
        );
      }
      
      // Wait before retrying with exponential backoff
      await wait(delay);
      delay *= DB_RETRY_CONFIG.backoffMultiplier;
    }
  }
  
  throw lastError;
}

/**
 * Test database connection with timeout
 */
async function testConnection(): Promise<boolean> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1 as test`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), DB_RETRY_CONFIG.timeout)
      )
    ]);
    return true;
  } catch (error) {
    return false;
  }
}

export async function ensureDatabaseSchema() {
  try {
    // Test database connection with retry
    const isConnected = await withRetry(
      testConnection,
      'database connection test',
      2
    );
    
    if (!isConnected) {
      console.error('❌ Database connection failed after retries');
      return false;
    }
    
    console.log('Database connection successful');
    
    // Check if tables already exist by trying to query them
    await withRetry(
      () => prisma.projection.findFirst(),
      'schema check'
    );
    
    console.log('Database schema already exists');
    return true; // Tables exist
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error && typeof error === 'object' && 'code' in error 
      ? String((error as { code: unknown }).code) 
      : undefined;
    
    console.error('Database connection or schema check failed:', errorMessage);
    
    // Check for specific database connection errors
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
      console.error('❌ Database connection failed - check your DATABASE_URL');
      console.error('   Current DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
      return false;
    }
    
    // If it's a table doesn't exist error, we need to create the schema
    if (errorCode === 'P2021' || errorMessage.includes('does not exist')) {
      try {
        console.log('Tables do not exist, attempting to create schema...');
        
        // Try to create a test record to trigger table creation
        await withRetry(
          () => prisma.projection.create({
            data: {
              projectId: '__test__',
              month: '__test__',
              value: 0
            }
          }),
          'schema creation'
        );
        
        // If successful, delete the test record
        await prisma.projection.deleteMany({
          where: {
            projectId: '__test__',
            month: '__test__'
          }
        }).catch(() => {
          // Ignore errors when deleting test record
        });
        
        console.log('Database schema created successfully');
        return true;
      } catch (createError: unknown) {
        console.error('Failed to create database schema:', createError instanceof Error ? createError.message : String(createError));
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
    // Test basic connection with retry
    const isConnected = await withRetry(
      testConnection,
      'database connection test'
    );
    
    if (!isConnected) {
      console.error('Database connection test failed after retries');
      return false;
    }
    
    console.log('Database connection successful');
    
    // Test a simple query
    const result = await withRetry(
      () => prisma.$queryRaw`SELECT 1 as test`,
      'database query test'
    );
    
    console.log('Database query test successful:', result);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Database connection test failed:', errorMessage);
    
    // Provide specific error guidance
    if (errorMessage.includes('ENOTFOUND')) {
      console.error('Network error: Check your DATABASE_URL and network connectivity');
    } else if (errorMessage.includes('authentication failed')) {
      console.error('Authentication error: Check your database credentials');
    } else if (errorMessage.includes('does not exist')) {
      console.error('Database does not exist: Check your database name in the connection URL');
    } else if (errorMessage.includes('connection timeout') || errorMessage.includes('timeout')) {
      console.error('Connection timeout: Check your network and database server status');
    }
    
    return false;
  }
}

// BambooHR Database Operations
export async function saveBambooHRConfig(config: {
  subdomain: string;
  apiKey: string;
  webhookSecret?: string;
}) {
  try {
    const result = await prisma.bamboohr_config.upsert({
      where: { subdomain: config.subdomain },
      update: {
        api_key: config.apiKey,
        webhook_secret: config.webhookSecret,
        is_active: true,
        last_sync: new Date(),
        updated_at: new Date()
      },
      create: {
        subdomain: config.subdomain,
        api_key: config.apiKey,
        webhook_secret: config.webhookSecret,
        is_active: true,
        last_sync: new Date(),
        created_at: new Date(),
        updated_at: new Date()
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
    return await prisma.bamboohr_config.findUnique({
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
  email?: string | null;
  status: string;
  department?: string;
  position?: string;
  hireDate?: string | null;
  terminationDate?: string;
}) {
  try {
    console.log(`🔄 Attempting to upsert employee:`, JSON.stringify(employee, null, 2));
    
    const result = await prisma.employees.upsert({
      where: { id: employee.id },
      update: {
        name: employee.name,
        email: employee.email,
        status: employee.status,
        department: employee.department,
        position: employee.position,
        hire_date: employee.hireDate || null,
        termination_date: employee.terminationDate,
        updated_at: new Date()
      },
      create: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        status: employee.status,
        department: employee.department,
        position: employee.position,
        hire_date: employee.hireDate || null,
        termination_date: employee.terminationDate,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    console.log(`✅ Employee saved: ${employee.name} (${employee.id})`);
    return result;
  } catch (error: any) {
    console.error('❌ Error saving employee:', error);
    
    // Handle P2025 (record not found) error
    if (error.code === 'P2025') {
      console.log(`🔄 Record not found, attempting to create employee: ${employee.name} (${employee.id})`);
      try {
        const result = await prisma.employees.create({
          data: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            status: employee.status,
            department: employee.department,
            position: employee.position,
            hire_date: employee.hireDate || null,
            termination_date: employee.terminationDate,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        console.log(`✅ Employee created: ${employee.name} (${employee.id})`);
        return result;
      } catch (createError) {
        console.error('❌ Error creating employee:', createError);
        throw createError;
      }
    }
    
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
    console.log(`🔄 Attempting to upsert employee salary:`, JSON.stringify(salary, null, 2));
    
    const result = await prisma.employee_salaries.upsert({
      where: {
        employee_id_effective_date: {
          employee_id: salary.employeeId,
          effective_date: salary.effectiveDate
        }
      },
      update: {
        end_date: salary.endDate,
        annual_salary: salary.annualSalary,
        hourly_rate: salary.hourlyRate,
        currency: salary.currency,
        notes: salary.notes,
        source: salary.source,
        updated_at: new Date()
      },
      create: {
        employee_id: salary.employeeId,
        effective_date: salary.effectiveDate,
        end_date: salary.endDate,
        annual_salary: salary.annualSalary,
        hourly_rate: salary.hourlyRate,
        currency: salary.currency || 'USD',
        notes: salary.notes,
        source: salary.source || 'bamboohr',
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    console.log(`✅ Employee salary saved for ${salary.employeeId} effective ${salary.effectiveDate}`);
    return result;
  } catch (error: any) {
    console.error('❌ Error saving employee salary:', error);
    
    // Handle P2025 (record not found) error
    if (error.code === 'P2025') {
      console.log(`🔄 Record not found, attempting to create employee salary for ${salary.employeeId} effective ${salary.effectiveDate}`);
      try {
        const result = await prisma.employee_salaries.create({
          data: {
            employee_id: salary.employeeId,
            effective_date: salary.effectiveDate,
            end_date: salary.endDate,
            annual_salary: salary.annualSalary,
            hourly_rate: salary.hourlyRate,
            currency: salary.currency || 'USD',
            notes: salary.notes,
            source: salary.source || 'bamboohr',
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        console.log(`✅ Employee salary created for ${salary.employeeId} effective ${salary.effectiveDate}`);
        return result;
      } catch (createError) {
        console.error('❌ Error creating employee salary:', createError);
        throw createError;
      }
    }
    
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
    const result = await prisma.project_multipliers.upsert({
      where: {
        project_id_effective_date: {
          project_id: multiplier.projectId,
          effective_date: multiplier.effectiveDate
        }
      },
      update: {
        project_name: multiplier.projectName,
        multiplier: multiplier.multiplier,
        end_date: multiplier.endDate,
        notes: multiplier.notes,
        updated_at: new Date()
      },
      create: {
        project_id: multiplier.projectId,
        project_name: multiplier.projectName,
        multiplier: multiplier.multiplier,
        effective_date: multiplier.effectiveDate,
        end_date: multiplier.endDate,
        notes: multiplier.notes,
        created_at: new Date(),
        updated_at: new Date()
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
    const result = await prisma.employee_time_entries.upsert({
      where: {
        employee_id_project_id_date: {
          employee_id: timeEntry.employeeId,
          project_id: timeEntry.projectId,
          date: timeEntry.date
        }
      },
      update: {
        employee_name: timeEntry.employeeName,
        project_name: timeEntry.projectName,
        hours: timeEntry.hours,
        billable_hours: timeEntry.billableHours,
        non_billable_hours: timeEntry.nonBillableHours,
        hourly_rate: timeEntry.hourlyRate,
        project_multiplier: timeEntry.projectMultiplier,
        total_cost: timeEntry.totalCost,
        billable_value: timeEntry.billableValue,
        efficiency: timeEntry.efficiency,
        description: timeEntry.description,
        tags: timeEntry.tags,
        updated_at: new Date()
      },
      create: {
        employee_id: timeEntry.employeeId,
        employee_name: timeEntry.employeeName,
        project_id: timeEntry.projectId,
        project_name: timeEntry.projectName,
        date: timeEntry.date,
        hours: timeEntry.hours,
        billable_hours: timeEntry.billableHours,
        non_billable_hours: timeEntry.nonBillableHours,
        hourly_rate: timeEntry.hourlyRate,
        project_multiplier: timeEntry.projectMultiplier,
        total_cost: timeEntry.totalCost,
        billable_value: timeEntry.billableValue,
        efficiency: timeEntry.efficiency,
        description: timeEntry.description,
        tags: timeEntry.tags,
        created_at: new Date(),
        updated_at: new Date()
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
    return await prisma.employees.findMany();
  } catch (error) {
    console.error('Error getting all employees:', error);
    throw error;
  }
}

export async function getAllEmployeeSalaries() {
  try {
    return await prisma.employee_salaries.findMany();
  } catch (error) {
    console.error('Error getting all employee salaries:', error);
    throw error;
  }
}

export async function getAllProjectMultipliers() {
  try {
    return await prisma.project_multipliers.findMany();
  } catch (error) {
    console.error('Error getting all project multipliers:', error);
    throw error;
  }
}

export async function getAllEmployeeTimeEntries() {
  try {
    return await prisma.employee_time_entries.findMany();
  } catch (error) {
    console.error('Error getting all time entries:', error);
    throw error;
  }
}

// Re-export prisma for backward compatibility
export { default as prisma } from './db';
