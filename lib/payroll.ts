import { 
  Employee, 
  EmployeeSalary, 
  ProjectMultiplier, 
  EmployeeTimeEntry, 
  ProjectProfitabilityReport,
  EmployeeProfitabilityReport,
  PayrollSystem,
  SalaryImport,
  BambooHRConfig
} from './types';
import { ClockifyTimeEntry, ClockifyUser } from './clockify';
import { configureBambooHR as _configureBambooHRService, getBambooHRService, importBambooHREmployees, importBambooHRSalaries } from './bamboohr';
import { 
  saveEmployee, 
  saveEmployeeSalary, 
  saveProjectMultiplier, 
  saveEmployeeTimeEntry,
  getAllEmployees as dbGetAllEmployees,
  getAllEmployeeSalaries as dbGetAllEmployeeSalaries,
  getAllProjectMultipliers as dbGetAllProjectMultipliers,
  getAllEmployeeTimeEntries as dbGetAllEmployeeTimeEntries,
  saveBambooHRConfig
} from './database';

export class PayrollService {
  private employees: Map<string, Employee> = new Map();
  private salaries: Map<string, EmployeeSalary[]> = new Map();
  private multipliers: Map<string, ProjectMultiplier[]> = new Map();
  private payrollSystem?: PayrollSystem;
  private bamboohrConfig?: BambooHRConfig;

  constructor() {
    console.log('Payroll service initialized');
  }

  // Employee Management
  async addEmployee(employee: Employee): Promise<void> {
    // Save to database
    await saveEmployee(employee);
    // Also keep in memory for backward compatibility
    this.employees.set(employee.id, employee);
    console.log(`Employee added: ${employee.name} (${employee.id})`);
  }

  async getEmployee(employeeId: string): Promise<Employee | null> {
    // Try memory first, then database
    let employee = this.employees.get(employeeId);
    if (!employee) {
      // Load from database
      const dbEmployees = await dbGetAllEmployees();
      const dbEmployee = dbEmployees.find((emp: any) => emp.id === employeeId);
      if (dbEmployee) {
        const normalized = this.normalizeEmployee(dbEmployee as any);
        this.employees.set(employeeId, normalized);
        employee = normalized;
      }
    }
    return employee || null;
  }

  async getAllEmployees(): Promise<Employee[]> {
    // Load from database and sync memory
    const dbEmployees = await dbGetAllEmployees();
    const normalizedEmployees = dbEmployees.map((emp: any) => this.normalizeEmployee(emp as any));
    // Update memory cache
    for (const emp of normalizedEmployees) {
      this.employees.set(emp.id, emp);
    }
    return normalizedEmployees;
  }

  async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<void> {
    const employee = this.employees.get(employeeId);
    if (employee) {
      const updatedEmployee = { ...employee, ...updates };
      // Save to database
      await saveEmployee(updatedEmployee);
      // Update memory
      this.employees.set(employeeId, updatedEmployee);
      console.log(`Employee updated: ${employee.name}`);
    }
  }

  // Salary Management
  async addSalary(salary: EmployeeSalary): Promise<void> {
    // Save to database
    await saveEmployeeSalary(salary);
    
    // Also keep in memory for backward compatibility
    const employeeSalaries = this.salaries.get(salary.employeeId) || [];
    
    // If this is a new current salary, end the previous one
    if (!salary.endDate) {
      const currentSalary = employeeSalaries.find(s => !s.endDate);
      if (currentSalary) {
        currentSalary.endDate = salary.effectiveDate;
        // Update the previous salary in database
        await saveEmployeeSalary(currentSalary);
      }
    }
    
    employeeSalaries.push(salary);
    employeeSalaries.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    
    this.salaries.set(salary.employeeId, employeeSalaries);
    console.log(`Salary added for ${salary.employeeId} effective ${salary.effectiveDate}`);
  }

  async getEmployeeSalary(employeeId: string, date: string): Promise<EmployeeSalary | null> {
    // Try memory first, then database
    let employeeSalaries = this.salaries.get(employeeId);
    if (!employeeSalaries || employeeSalaries.length === 0) {
      // Load from database
      const dbSalaries = await dbGetAllEmployeeSalaries();
      const employeeDbSalaries = dbSalaries
        .filter((s: any) => s.employeeId === employeeId)
        .map((s: any) => this.normalizeSalary(s));
      if (employeeDbSalaries.length > 0) {
        this.salaries.set(employeeId, employeeDbSalaries);
        employeeSalaries = employeeDbSalaries;
      }
    }
    
    if (!employeeSalaries) return null;
    
    const targetDate = new Date(date);
    
    return employeeSalaries.find(salary => {
      const effectiveDate = new Date(salary.effectiveDate);
      const endDate = salary.endDate ? new Date(salary.endDate) : new Date('9999-12-31');
      return targetDate >= effectiveDate && targetDate <= endDate;
    }) || null;
  }

  async getEmployeeSalaryHistory(employeeId: string): Promise<EmployeeSalary[]> {
    // Try memory first, then database
    let employeeSalaries = this.salaries.get(employeeId);
    if (!employeeSalaries || employeeSalaries.length === 0) {
      // Load from database
      const dbSalaries = await dbGetAllEmployeeSalaries();
      const employeeDbSalaries = dbSalaries
        .filter((s: any) => s.employeeId === employeeId)
        .map((s: any) => this.normalizeSalary(s));
      if (employeeDbSalaries.length > 0) {
        this.salaries.set(employeeId, employeeDbSalaries);
        employeeSalaries = employeeDbSalaries;
      }
    }
    return employeeSalaries || [];
  }

  // Project Multiplier Management
  async addProjectMultiplier(multiplier: ProjectMultiplier): Promise<void> {
    // Save to database
    await saveProjectMultiplier(multiplier);
    
    // Also keep in memory for backward compatibility
    const projectMultipliers = this.multipliers.get(multiplier.projectId) || [];
    
    // If this is a new current multiplier, end the previous one
    if (!multiplier.endDate) {
      const currentMultiplier = projectMultipliers.find(m => !m.endDate);
      if (currentMultiplier) {
        currentMultiplier.endDate = multiplier.effectiveDate;
        // Update the previous multiplier in database
        await saveProjectMultiplier(currentMultiplier);
      }
    }
    
    projectMultipliers.push(multiplier);
    projectMultipliers.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    
    this.multipliers.set(multiplier.projectId, projectMultipliers);
    console.log(`Multiplier added for project ${multiplier.projectName} effective ${multiplier.effectiveDate}`);
  }

  async getProjectMultiplier(projectId: string, date: string): Promise<ProjectMultiplier | null> {
    // Try memory first, then database
    let projectMultipliers = this.multipliers.get(projectId);
    if (!projectMultipliers || projectMultipliers.length === 0) {
      // Load from database
      const dbMultipliers = await dbGetAllProjectMultipliers();
      const projectDbMultipliers = dbMultipliers
        .filter((m: any) => m.projectId === projectId)
        .map((m: any) => this.normalizeProjectMultiplier(m));
      if (projectDbMultipliers.length > 0) {
        this.multipliers.set(projectId, projectDbMultipliers);
        projectMultipliers = projectDbMultipliers;
      }
    }
    
    if (!projectMultipliers) return null;
    
    const targetDate = new Date(date);
    
    return projectMultipliers.find(multiplier => {
      const effectiveDate = new Date(multiplier.effectiveDate);
      const endDate = multiplier.endDate ? new Date(multiplier.endDate) : new Date('9999-12-31');
      return targetDate >= effectiveDate && targetDate <= endDate;
    }) || null;
  }

  async getProjectMultiplierHistory(projectId: string): Promise<ProjectMultiplier[]> {
    // Try memory first, then database
    let projectMultipliers = this.multipliers.get(projectId);
    if (!projectMultipliers || projectMultipliers.length === 0) {
      // Load from database
      const dbMultipliers = await dbGetAllProjectMultipliers();
      const projectDbMultipliers = dbMultipliers
        .filter((m: any) => m.projectId === projectId)
        .map((m: any) => this.normalizeProjectMultiplier(m));
      if (projectDbMultipliers.length > 0) {
        this.multipliers.set(projectId, projectDbMultipliers);
        projectMultipliers = projectDbMultipliers;
      }
    }
    return projectMultipliers || [];
  }

  // Time Entry Processing with Historical Rates
  async processTimeEntries(
    clockifyEntries: ClockifyTimeEntry[],
    clockifyUsers: ClockifyUser[],
    projects: any[]
  ): Promise<EmployeeTimeEntry[]> {
    const employeeTimeEntries: EmployeeTimeEntry[] = [];
    const userMap = new Map(clockifyUsers.map(user => [user.id, user]));

    for (const entry of clockifyEntries) {
      const user = userMap.get(entry.userId);
      if (!user) continue;

      const entryDate = new Date(entry.timeInterval.start).toISOString().split('T')[0];
      const employee = await this.getEmployee(entry.userId);
      if (!employee) continue;

      const salary = await this.getEmployeeSalary(entry.userId, entryDate);
      if (!salary) continue;

      const project = projects.find(p => p.id === entry.projectId);
      if (!project) continue;

      const multiplier = await this.getProjectMultiplier(entry.projectId, entryDate);
      const projectMultiplier = multiplier?.multiplier || 1.0;

      const durationMs = this.parseDuration(entry.timeInterval.duration);
      const hours = durationMs / (1000 * 60 * 60);
      const billableHours = entry.billable ? hours : 0;
      const nonBillableHours = entry.billable ? 0 : hours;

      const totalCost = hours * salary.hourlyRate;
      const billableValue = billableHours * salary.hourlyRate * projectMultiplier;
      const efficiency = hours > 0 ? billableHours / hours : 0;

      const timeEntry = {
        employeeId: entry.userId,
        employeeName: user.name,
        projectId: entry.projectId,
        projectName: project.name,
        date: entryDate,
        hours,
        billableHours,
        nonBillableHours,
        hourlyRate: salary.hourlyRate,
        projectMultiplier,
        totalCost,
        billableValue,
        efficiency,
        description: entry.description,
        tags: entry.tags.map(tag => tag.name)
      };

      // Save to database
      await saveEmployeeTimeEntry(timeEntry);

      employeeTimeEntries.push(timeEntry);
    }

    return employeeTimeEntries;
  }

  // Profitability Analysis
  async generateProjectProfitabilityReport(
    projectId: string,
    startDate: string,
    endDate: string,
    employeeTimeEntries: EmployeeTimeEntry[],
    revenue: number
  ): Promise<ProjectProfitabilityReport> {
    const projectEntries = employeeTimeEntries.filter(entry => 
      entry.projectId === projectId &&
      entry.date >= startDate &&
      entry.date <= endDate
    );

    const totalHours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalBillableHours = projectEntries.reduce((sum, entry) => sum + entry.billableHours, 0);
    const totalCost = projectEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
    const totalBillableValue = projectEntries.reduce((sum, entry) => sum + entry.billableValue, 0);

    const grossProfit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const averageMultiplier = totalBillableHours > 0 ? totalBillableValue / (totalBillableHours * projectEntries[0]?.hourlyRate || 1) : 0;

    // Employee breakdown
    const employeeBreakdown = new Map<string, any>();
    for (const entry of projectEntries) {
      const existing = employeeBreakdown.get(entry.employeeId);
      if (existing) {
        existing.hours += entry.hours;
        existing.cost += entry.totalCost;
        existing.billableValue += entry.billableValue;
        existing.efficiency = existing.hours > 0 ? existing.billableValue / (existing.hours * entry.hourlyRate) : 0;
      } else {
        employeeBreakdown.set(entry.employeeId, {
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          hours: entry.hours,
          cost: entry.totalCost,
          billableValue: entry.billableValue,
          efficiency: entry.efficiency
        });
      }
    }

    // Monthly breakdown
    const monthlyBreakdown = new Map<string, any>();
    for (const entry of projectEntries) {
      const month = entry.date.substring(0, 7); // YYYY-MM
      const existing = monthlyBreakdown.get(month);
      if (existing) {
        existing.hours += entry.hours;
        existing.cost += entry.totalCost;
      } else {
        monthlyBreakdown.set(month, {
          month,
          hours: entry.hours,
          cost: entry.totalCost,
          revenue: 0, // This would need to be calculated from billing data
          profit: 0
        });
      }
    }

    return {
      projectId,
      projectName: projectEntries[0]?.projectName || 'Unknown Project',
      period: { start: startDate, end: endDate },
      totalHours,
      totalBillableHours,
      totalCost,
      totalRevenue: revenue,
      grossProfit,
      profitMargin,
      averageMultiplier,
      employeeBreakdown: Array.from(employeeBreakdown.values()),
      monthlyBreakdown: Array.from(monthlyBreakdown.values())
    };
  }

  async generateEmployeeProfitabilityReport(
    employeeId: string,
    startDate: string,
    endDate: string,
    employeeTimeEntries: EmployeeTimeEntry[]
  ): Promise<EmployeeProfitabilityReport> {
    const employeeEntries = employeeTimeEntries.filter(entry => 
      entry.employeeId === employeeId &&
      entry.date >= startDate &&
      entry.date <= endDate
    );

    const totalHours = employeeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalBillableHours = employeeEntries.reduce((sum, entry) => sum + entry.billableHours, 0);
    const totalCost = employeeEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
    const totalBillableValue = employeeEntries.reduce((sum, entry) => sum + entry.billableValue, 0);
    const efficiency = totalHours > 0 ? totalBillableHours / totalHours : 0;
    const averageHourlyRate = totalHours > 0 ? totalCost / totalHours : 0;

    // Project breakdown
    const projectBreakdown = new Map<string, any>();
    for (const entry of employeeEntries) {
      const existing = projectBreakdown.get(entry.projectId);
      if (existing) {
        existing.hours += entry.hours;
        existing.cost += entry.totalCost;
        existing.billableValue += entry.billableValue;
        existing.efficiency = existing.hours > 0 ? existing.billableValue / (existing.hours * entry.hourlyRate) : 0;
      } else {
        projectBreakdown.set(entry.projectId, {
          projectId: entry.projectId,
          projectName: entry.projectName,
          hours: entry.hours,
          cost: entry.totalCost,
          billableValue: entry.billableValue,
          efficiency: entry.efficiency
        });
      }
    }

    return {
      employeeId,
      employeeName: employeeEntries[0]?.employeeName || 'Unknown Employee',
      period: { start: startDate, end: endDate },
      totalHours,
      totalBillableHours,
      totalCost,
      totalBillableValue,
      efficiency,
      averageHourlyRate,
      projectBreakdown: Array.from(projectBreakdown.values())
    };
  }

  // Payroll System Integration
  async configurePayrollSystem(system: PayrollSystem): Promise<void> {
    this.payrollSystem = system;
    console.log(`Payroll system configured: ${system.name}`);
  }

  // BambooHR Integration
  async configureBambooHR(config: BambooHRConfig): Promise<void> {
    this.bamboohrConfig = config;
    _configureBambooHRService(config);
    
    // Save configuration to database
    await saveBambooHRConfig({
      subdomain: config.subdomain,
      apiKey: config.apiKey,
      webhookSecret: config.webhookSecret
    });
    
    console.log(`BambooHR configured for subdomain: ${config.subdomain}`);
  }

  async importSalariesFromBambooHR(): Promise<SalaryImport> {
    if (!this.bamboohrConfig) {
      throw new Error('BambooHR not configured');
    }

    try {
      // Import employees from BambooHR
      const bamboohrEmployees = await importBambooHREmployees();
      for (const employee of bamboohrEmployees) {
        await this.addEmployee(employee);
      }

      // Import salaries from BambooHR
      const bamboohrSalaries = await importBambooHRSalaries();
      for (const salary of bamboohrSalaries) {
        await this.addSalary(salary);
      }

      return {
        source: 'bamboohr',
        importDate: new Date().toISOString(),
        recordsImported: bamboohrEmployees.length + bamboohrSalaries.length,
        errors: []
      };
    } catch (error: any) {
      return {
        source: 'bamboohr',
        importDate: new Date().toISOString(),
        recordsImported: 0,
        errors: [error.message]
      };
    }
  }

  async importSalariesFromPayrollSystem(): Promise<SalaryImport> {
    if (!this.payrollSystem) {
      throw new Error('No payroll system configured');
    }

    if (this.payrollSystem.type === 'bamboohr' && this.bamboohrConfig) {
      return await this.importSalariesFromBambooHR();
    }

    // This would integrate with other payroll system APIs
    // For now, return a mock import
    return {
      source: 'api' as const,
      importDate: new Date().toISOString(),
      recordsImported: 0,
      errors: [`${this.payrollSystem.type} integration not yet implemented`]
    };
  }

  // Utility Methods
  private parseDuration(duration: string): number {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const match = duration.match(regex);
    
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  calculateHourlyRate(annualSalary: number, workHoursPerYear: number = 2080): number {
    return annualSalary / workHoursPerYear;
  }

  // Normalization helpers to convert Prisma results to domain types
  private normalizeEmployee(dbEmployee: any): Employee {
    const statusValue = (dbEmployee.status || 'active').toLowerCase();
    const normalizedStatus: 'active' | 'inactive' =
      statusValue === 'active' ? 'active' : 'inactive';
    return {
      id: dbEmployee.id,
      name: dbEmployee.name,
      email: dbEmployee.email,
      status: normalizedStatus,
      department: dbEmployee.department ?? undefined,
      position: dbEmployee.position ?? undefined,
      hireDate: dbEmployee.hireDate,
      terminationDate: dbEmployee.terminationDate ?? undefined
    };
  }

  private normalizeSalary(dbSalary: any): EmployeeSalary {
    const toNumber = (v: any) => (v && typeof v === 'object' && 'toNumber' in v ? v.toNumber() : Number(v));
    return {
      employeeId: dbSalary.employeeId,
      effectiveDate: dbSalary.effectiveDate,
      endDate: dbSalary.endDate ?? undefined,
      annualSalary: toNumber(dbSalary.annualSalary),
      hourlyRate: toNumber(dbSalary.hourlyRate),
      currency: dbSalary.currency || 'USD',
      notes: dbSalary.notes ?? undefined
    };
  }

  private normalizeProjectMultiplier(dbMultiplier: any): ProjectMultiplier {
    const toNumber = (v: any) => (v && typeof v === 'object' && 'toNumber' in v ? v.toNumber() : Number(v));
    return {
      projectId: dbMultiplier.projectId,
      projectName: dbMultiplier.projectName,
      multiplier: toNumber(dbMultiplier.multiplier),
      effectiveDate: dbMultiplier.effectiveDate,
      endDate: dbMultiplier.endDate ?? undefined,
      notes: dbMultiplier.notes ?? undefined
    };
  }

  // Data Export/Import
    async exportData(): Promise<any> {
    return {
      employees: Array.from(this.employees.values()),
      salaries: Array.from(this.salaries.entries()),
      multipliers: Array.from(this.multipliers.entries()),
      payrollSystem: this.payrollSystem,
      bamboohrConfig: this.bamboohrConfig
    };
  }

  async importData(data: any): Promise<void> {
    this.employees = new Map(data.employees.map((emp: Employee) => [emp.id, emp]));
    this.salaries = new Map(data.salaries);
    this.multipliers = new Map(data.multipliers);
    this.payrollSystem = data.payrollSystem;
    this.bamboohrConfig = data.bamboohrConfig;

    if (this.bamboohrConfig) {
      _configureBambooHRService(this.bamboohrConfig);
    }

    console.log('Payroll data imported successfully');
  }
}

// Create singleton instance
export const payrollService = new PayrollService();

// Export convenience functions
export const addEmployee = async (employee: Employee) => {
  await payrollService.addEmployee(employee);
};

export const addSalary = async (salary: EmployeeSalary) => {
  await payrollService.addSalary(salary);
};

export const addProjectMultiplier = async (multiplier: ProjectMultiplier) => {
  await payrollService.addProjectMultiplier(multiplier);
};

export const processTimeEntries = async (
  clockifyEntries: ClockifyTimeEntry[],
  clockifyUsers: ClockifyUser[],
  projects: any[]
) => {
  return await payrollService.processTimeEntries(clockifyEntries, clockifyUsers, projects);
};

export const generateProjectProfitabilityReport = async (
  projectId: string,
  startDate: string,
  endDate: string,
  employeeTimeEntries: EmployeeTimeEntry[],
  revenue: number
) => {
  return await payrollService.generateProjectProfitabilityReport(
    projectId, startDate, endDate, employeeTimeEntries, revenue
  );
};

export const generateEmployeeProfitabilityReport = async (
  employeeId: string,
  startDate: string,
  endDate: string,
  employeeTimeEntries: EmployeeTimeEntry[]
) => {
  return await payrollService.generateEmployeeProfitabilityReport(
    employeeId, startDate, endDate, employeeTimeEntries
  );
};

// BambooHR specific functions
export const configureBambooHR = async (config: BambooHRConfig) => {
  await payrollService.configureBambooHR(config);
};

export const importBambooHRData = async () => {
  return await payrollService.importSalariesFromBambooHR();
};
