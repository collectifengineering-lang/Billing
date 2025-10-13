import { clockifyService } from './clockify';
import { saveEmployeeTimeEntry, getAllEmployees, getAllEmployeeSalaries, getAllProjectMultipliers } from './database';
import { EmployeeTimeEntry, Employee, EmployeeSalary } from './types';

// Type interfaces for Clockify data to avoid implicit any
interface ClockifyTag {
  name: string;
  id?: string;
}

interface ClockifyTimeEntry {
  id: string;
  userId: string;
  projectId: string;
  billable: boolean;
  description?: string;
  tags?: ClockifyTag[];
  timeInterval: {
    start: string;
    end?: string;
    duration: string;
  };
}

interface ClockifyUser {
  id: string;
  name: string;
  email?: string;
}

interface ClockifyProject {
  id: string;
  name: string;
}

export interface ClockifyImportResult {
  success: boolean;
  recordsImported: number;
  recordsSkipped: number;
  errors: string[];
  summary: {
    totalEntries: number;
    billableHours: number;
    nonBillableHours: number;
    totalCost: number;
    totalBillableValue: number;
  };
}

// Type conversion utility to handle Prisma null values (with snake_case from DB)
function convertPrismaEmployee(emp: { 
  id: string; 
  name: string; 
  email: string | null; 
  status: string; 
  department: string | null; 
  position: string | null; 
  hire_date: string | null; 
  termination_date: string | null;
  created_at: Date;
  updated_at: Date;
}): Employee {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email ?? undefined, // Convert null to undefined
    status: (emp.status === 'active' || emp.status === 'inactive') ? emp.status : 'active',
    department: emp.department ?? undefined, // Convert null to undefined
    position: emp.position ?? undefined, // Convert null to undefined
    hireDate: emp.hire_date ?? undefined, // Convert null to undefined, map snake_case to camelCase
    terminationDate: emp.termination_date ?? undefined // Convert null to undefined, map snake_case to camelCase
  };
}

// Type conversion utility to handle Prisma null values for EmployeeSalary (with snake_case from DB)
function convertPrismaEmployeeSalary(salary: { 
  employee_id: string; 
  effective_date: string; 
  end_date: string | null; 
  annual_salary: { toNumber(): number }; 
  hourly_rate: { toNumber(): number }; 
  currency: string; 
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}): EmployeeSalary {
  return {
    employeeId: salary.employee_id, // Map snake_case to camelCase
    effectiveDate: salary.effective_date, // Map snake_case to camelCase
    endDate: salary.end_date ?? undefined, // Convert null to undefined
    annualSalary: salary.annual_salary.toNumber(), // Convert Decimal to number
    hourlyRate: salary.hourly_rate.toNumber(), // Convert Decimal to number
    currency: salary.currency,
    notes: salary.notes ?? undefined // Convert null to undefined
  };
}

export class ClockifyImportService {
  private employeeMap: Map<string, Employee> = new Map();
  private salaryMap: Map<string, EmployeeSalary> = new Map();
  private multiplierMap: Map<string, { multiplier: number, effectiveDate: string }> = new Map();

  constructor() {
    console.log('🔄 Initializing Clockify Import Service...');
  }

  // Initialize data mappings from database
  async initializeDataMappings(): Promise<void> {
    try {
      console.log('📊 Initializing data mappings from database...');
      
      // Load employees, salaries, and project multipliers
      const [employees, salaries, multipliers] = await Promise.all([
        getAllEmployees(),
        getAllEmployeeSalaries(),
        getAllProjectMultipliers()
      ]);

      // Build employee map with proper type casting (using snake_case from Prisma)
      this.employeeMap.clear();
      for (const emp of employees as Array<{
        id: string; 
        name: string; 
        email: string | null; 
        status: string; 
        department: string | null; 
        position: string | null; 
        hire_date: string | null; 
        termination_date: string | null;
        created_at: Date;
        updated_at: Date;
      }>) {
        // Log raw employee data for debugging
        console.log(`📋 Raw employee data for ${emp.id}:`, {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          status: emp.status,
          department: emp.department,
          position: emp.position,
          hireDate: emp.hire_date,
          terminationDate: emp.termination_date
        });

        // Convert Prisma employee data to our interface
        const employee = convertPrismaEmployee(emp);
        this.employeeMap.set(emp.id, employee);
        
        console.log(`✅ Converted employee: ${employee.name} (${employee.id})`, {
          email: employee.email,
          department: employee.department,
          position: employee.position,
          hireDate: employee.hireDate,
          status: employee.status
        });
      }
      console.log(`👥 Loaded ${employees.length} employees`);

      // Build salary map (use most recent salary per employee) - using snake_case from Prisma
      this.salaryMap.clear();
      for (const salary of salaries as Array<{
        employee_id: string; 
        effective_date: string; 
        end_date: string | null; 
        annual_salary: { toNumber(): number }; 
        hourly_rate: { toNumber(): number }; 
        currency: string; 
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>) {
        // Log raw salary data for debugging
        console.log(`📋 Raw salary data for ${salary.employee_id}:`, {
          employeeId: salary.employee_id,
          effectiveDate: salary.effective_date,
          endDate: salary.end_date,
          annualSalary: salary.annual_salary.toNumber(), // Convert Decimal to number for logging
          hourlyRate: salary.hourly_rate.toNumber(), // Convert Decimal to number for logging
          currency: salary.currency,
          notes: salary.notes
        });

        // Convert Prisma salary data to our interface
        const convertedSalary = convertPrismaEmployeeSalary(salary);
        const existing = this.salaryMap.get(convertedSalary.employeeId);
        if (!existing || new Date(convertedSalary.effectiveDate) > new Date(existing.effectiveDate)) {
          this.salaryMap.set(convertedSalary.employeeId, convertedSalary);
          
          console.log(`✅ Converted salary for employee ${convertedSalary.employeeId}:`, {
            effectiveDate: convertedSalary.effectiveDate,
            endDate: convertedSalary.endDate,
            annualSalary: convertedSalary.annualSalary, // Already converted to number
            hourlyRate: convertedSalary.hourlyRate // Already converted to number
          });
        }
      }
      console.log(`💰 Loaded ${this.salaryMap.size} employee salaries`);

      // Build project multiplier map - using snake_case from Prisma
      this.multiplierMap.clear();
      for (const mult of multipliers as Array<{
        project_id: string; 
        project_name: string; 
        multiplier: { toNumber(): number }; 
        effective_date: string; 
        end_date: string | null; 
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>) {
        // Log raw multiplier data for debugging
        console.log(`📋 Raw multiplier data for project ${mult.project_id}:`, {
          projectId: mult.project_id,
          projectName: mult.project_name,
          multiplier: mult.multiplier.toNumber(), // Convert Decimal to number for logging
          effectiveDate: mult.effective_date,
          endDate: mult.end_date,
          notes: mult.notes
        });

        const existing = this.multiplierMap.get(mult.project_id);
        if (!existing || new Date(mult.effective_date) > new Date(existing.effectiveDate)) {
          this.multiplierMap.set(mult.project_id, { 
            multiplier: mult.multiplier.toNumber(), // Convert Decimal to number
            effectiveDate: mult.effective_date 
          });
          
          console.log(`✅ Loaded multiplier for project ${mult.project_id}: ${mult.multiplier.toNumber()}x`);
        }
      }
      console.log(`📈 Loaded ${this.multiplierMap.size} project multipliers`);

      console.log('✅ Data mappings initialized successfully');
    } catch (error: unknown) {
      console.error('❌ Failed to initialize data mappings:', error);
      throw error;
    }
  }

  // Main import method
  async importTimeEntries(startDate: string, endDate: string): Promise<ClockifyImportResult> {
    try {
      console.log('🔄 Starting Clockify time entries import...');
      console.log(`📅 Date range: ${startDate} to ${endDate}`);

      // Initialize data mappings
      await this.initializeDataMappings();

      // Get time entries from Clockify
      const timeEntries = await clockifyService.getTimeEntries('', startDate, endDate);
      console.log(`📊 Retrieved ${timeEntries.length} time entries from Clockify`);

      if (timeEntries.length === 0) {
        console.log('⚠️ No time entries found for the specified date range');
        return {
          success: true,
          recordsImported: 0,
          recordsSkipped: 0,
          errors: [],
          summary: {
            totalEntries: 0,
            billableHours: 0,
            nonBillableHours: 0,
            totalCost: 0,
            totalBillableValue: 0
          }
        };
      }

      // Get projects and users for mapping
      const [projects, users] = await Promise.all([
        clockifyService.getProjects(),
        clockifyService.getWorkspaces().then(workspaces => 
          workspaces.length > 0 ? clockifyService.getUsers(workspaces[0].id) : []
        )
      ]);

      console.log(`📋 Retrieved ${projects.length} projects and ${users.length} users from Clockify`);

      let recordsImported = 0;
      let recordsSkipped = 0;
      const errors: string[] = [];
      let totalBillableHours = 0;
      let totalNonBillableHours = 0;
      let totalCost = 0;
      let totalBillableValue = 0;

      // Process each time entry
      for (const entry of timeEntries as ClockifyTimeEntry[]) {
        try {
          // Find user and project details
          const user = users.find((u: ClockifyUser) => u.id === entry.userId);
          const project = projects.find((p: ClockifyProject) => p.id === entry.projectId);
          
          if (!user || !project) {
            const errorMsg = `Missing user (${entry.userId}) or project (${entry.projectId}) for entry ${entry.id}`;
            console.warn(`⚠️ ${errorMsg}`);
            errors.push(errorMsg);
            recordsSkipped++;
            continue;
          }

          // Check if we have employee data for this user
          const employee = this.employeeMap.get(entry.userId);
          if (!employee) {
            console.warn(`⚠️ No employee record found for Clockify user ${entry.userId} (${user.name})`);
            recordsSkipped++;
            continue;
          }

          // Get employee salary
          const salary = this.salaryMap.get(entry.userId);
          if (!salary) {
            console.warn(`⚠️ No salary record found for employee ${entry.userId} (${employee.name})`);
            recordsSkipped++;
            continue;
          }

          // Get project multiplier
          const multiplierData = this.multiplierMap.get(entry.projectId);
          const projectMultiplier = multiplierData ? multiplierData.multiplier : 1.0;

          // Parse duration to hours
          const hours = this.parseDuration(entry.timeInterval.duration);
          const billableHours = entry.billable ? hours : 0;
          const nonBillableHours = entry.billable ? 0 : hours;

          // Calculate costs and values
          const totalCostForEntry = hours * salary.hourlyRate;
          const billableValue = billableHours * salary.hourlyRate * projectMultiplier;

          // Update totals
          totalBillableHours += billableHours;
          totalNonBillableHours += nonBillableHours;
          totalCost += totalCostForEntry;
          totalBillableValue += billableValue;

          // Create time entry for database
          const timeEntry = {
            employeeId: entry.userId,
            employeeName: employee.name,
            projectId: entry.projectId,
            projectName: project.name,
            date: new Date(entry.timeInterval.start).toISOString().split('T')[0],
            hours,
            billableHours,
            nonBillableHours,
            hourlyRate: salary.hourlyRate,
            projectMultiplier,
            totalCost: totalCostForEntry,
            billableValue,
            efficiency: hours > 0 ? billableHours / hours : 0,
            description: entry.description || 'Imported from Clockify',
            tags: (entry.tags?.map((tag: ClockifyTag) => tag.name || tag.id || '') || []).filter(Boolean) as string[]
          };

          // Save to database
          await saveEmployeeTimeEntry(timeEntry);
          
          console.log(`✅ Imported: ${employee.name} - ${project.name} - ${hours.toFixed(2)}h (${entry.billable ? 'Billable' : 'Non-billable'}) - $${totalCostForEntry.toFixed(2)}`);
          
          recordsImported++;
          
        } catch (entryError: unknown) {
          const errorMsg = `Error processing entry ${entry.id}: ${entryError instanceof Error ? entryError.message : String(entryError)}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          recordsSkipped++;
        }
      }

      const summary = {
        totalEntries: timeEntries.length,
        billableHours: totalBillableHours,
        nonBillableHours: totalNonBillableHours,
        totalCost: totalCost,
        totalBillableValue: totalBillableValue
      };

      console.log(`📊 Import completed: ${recordsImported} imported, ${recordsSkipped} skipped, ${errors.length} errors`);
      console.log(`💰 Summary: ${totalBillableHours.toFixed(2)} billable hours, ${totalNonBillableHours.toFixed(2)} non-billable hours`);
      console.log(`💵 Total cost: $${totalCost.toFixed(2)}, Total billable value: $${totalBillableValue.toFixed(2)}`);
      
      if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} errors encountered during import`);
      }

      return {
        success: recordsImported > 0,
        recordsImported,
        recordsSkipped,
        errors,
        summary
      };

    } catch (error: unknown) {
      console.error('❌ Clockify time entries import failed:', error);
      return {
        success: false,
        recordsImported: 0,
        recordsSkipped: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        summary: {
          totalEntries: 0,
          billableHours: 0,
          nonBillableHours: 0,
          totalCost: 0,
          totalBillableValue: 0
        }
      };
    }
  }

  // Helper method to parse ISO 8601 duration to hours
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours + (minutes / 60) + (seconds / 3600);
  }

  // Get import statistics
  async getImportStatistics(): Promise<{
    totalEmployees: number;
    totalSalaries: number;
    totalProjectMultipliers: number;
    lastImportDate?: string;
  }> {
    return {
      totalEmployees: this.employeeMap.size,
      totalSalaries: this.salaryMap.size,
      totalProjectMultipliers: this.multiplierMap.size,
      lastImportDate: new Date().toISOString()
    };
  }
}

// Create and export the service instance
export const clockifyImportService = new ClockifyImportService();

// Export convenience functions
export const importClockifyTimeEntries = async (startDate: string, endDate: string): Promise<ClockifyImportResult> => {
  return await clockifyImportService.importTimeEntries(startDate, endDate);
};

export const getClockifyImportStats = async () => {
  return await clockifyImportService.getImportStatistics();
};
