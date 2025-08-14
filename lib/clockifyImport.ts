import { clockifyService } from './clockify';
import { saveEmployeeTimeEntry, getAllEmployees, getAllEmployeeSalaries, getAllProjectMultipliers } from './database';
import { EmployeeTimeEntry, Employee, EmployeeSalary } from './types';

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

export class ClockifyImportService {
  private employeeMap: Map<string, Employee> = new Map();
  private salaryMap: Map<string, EmployeeSalary> = new Map();
  private multiplierMap: Map<string, number> = new Map();

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

      // Build employee map with proper type casting
      this.employeeMap.clear();
      for (const emp of employees) {
        // Ensure the status field is properly typed as 'active' | 'inactive'
        const employee: Employee = {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          status: (emp.status === 'active' || emp.status === 'inactive') ? emp.status : 'active',
          department: emp.department,
          position: emp.position,
          hireDate: emp.hireDate,
          terminationDate: emp.terminationDate
        };
        this.employeeMap.set(emp.id, employee);
      }
      console.log(`👥 Loaded ${employees.length} employees`);

      // Build salary map (use most recent salary per employee)
      this.salaryMap.clear();
      for (const salary of salaries) {
        const existing = this.salaryMap.get(salary.employeeId);
        if (!existing || new Date(salary.effectiveDate) > new Date(existing.effectiveDate)) {
          this.salaryMap.set(salary.employeeId, salary);
        }
      }
      console.log(`💰 Loaded ${this.salaryMap.size} employee salaries`);

      // Build project multiplier map
      this.multiplierMap.clear();
      for (const mult of multipliers) {
        const existing = this.multiplierMap.get(mult.projectId);
        if (!existing || new Date(mult.effectiveDate) > new Date(existing.effectiveDate)) {
          this.multiplierMap.set(mult.projectId, mult.multiplier);
        }
      }
      console.log(`📈 Loaded ${this.multiplierMap.size} project multipliers`);

      console.log('✅ Data mappings initialized successfully');
    } catch (error) {
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
      for (const entry of timeEntries) {
        try {
          // Find user and project details
          const user = users.find(u => u.id === entry.userId);
          const project = projects.find(p => p.id === entry.projectId);
          
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
          const projectMultiplier = this.multiplierMap.get(entry.projectId) || 1.0;

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
          const timeEntry: EmployeeTimeEntry = {
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
            tags: entry.tags?.map(tag => tag.name || tag) || []
          };

          // Save to database
          await saveEmployeeTimeEntry(timeEntry);
          
          console.log(`✅ Imported: ${employee.name} - ${project.name} - ${hours.toFixed(2)}h (${entry.billable ? 'Billable' : 'Non-billable'}) - $${totalCostForEntry.toFixed(2)}`);
          
          recordsImported++;
          
        } catch (entryError) {
          const errorMsg = `Error processing entry ${entry.id}: ${entryError}`;
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

    } catch (error) {
      console.error('❌ Clockify time entries import failed:', error);
      return {
        success: false,
        recordsImported: 0,
        recordsSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
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
