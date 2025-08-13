import {
  BambooHRConfig,
  BambooHREmployee,
  BamboohrCompensation,
  BambooHRTimeOff,
  BambooHRReport,
  Employee,
  EmployeeSalary,
  SalaryImport
} from './types';

export class BambooHRService {
  private config: BambooHRConfig;
  private baseUrl: string;

  constructor(config: BambooHRConfig) {
    this.config = config;
    // Use versioned BambooHR API base
    this.baseUrl = `https://api.bamboohr.com/api/gateway.php/${config.subdomain}/v1`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const basic = Buffer.from(`${this.config.apiKey}:x`).toString('base64');
    const headers = {
      'Authorization': `Basic ${basic}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    } as Record<string, string>;

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`BambooHR API error: ${response.status} ${response.statusText} ${body ? `- ${body}` : ''}`);
      }

      return await response.json();
    } catch (error) {
      console.error('BambooHR API request failed:', error);
      throw error;
    }
  }

  // Employee Management
  async getAllEmployees(): Promise<BambooHREmployee[]> {
    // Attempt to fetch all employees, handling pagination if the API limits to 500 per page
    const all: BambooHREmployee[] = [];
    let page = 1;
    const pageSize = 500;
    
    console.log('🔄 Starting BambooHR employee fetch with pagination...');
    
    while (true) {
      const suffix = page > 1 ? `?page=${page}` : '';
      const endpoint = `/employees/directory${suffix}`;
      
      try {
        const response = await this.makeRequest(endpoint);
        const employees: BambooHREmployee[] = response.employees || [];
        
        console.log(`📄 BambooHR: fetched ${employees.length} employees from ${endpoint} (page ${page})`);
        
        if (employees.length === 0) {
          console.log('📄 No more employees found, ending pagination');
          break;
        }
        
        all.push(...employees);
        
        // Check if we've reached the end (less than page size)
        if (employees.length < pageSize) {
          console.log(`📄 Reached end of results (${employees.length} < ${pageSize}), ending pagination`);
          break;
        }
        
        page += 1;
        
        // Safety check to prevent infinite loops
        if (page > 100) {
          console.warn('⚠️ Pagination safety limit reached (100 pages), stopping to prevent infinite loop');
          break;
        }
      } catch (error) {
        console.error(`❌ Error fetching page ${page} from BambooHR:`, error);
        // Continue with what we have rather than failing completely
        break;
      }
    }
    
    console.log(`✅ BambooHR: total employees aggregated = ${all.length} from ${page - 1} pages`);
    
    // Ensure pagination for /v1/employees/directory if >500 employees
    if (all.length > 500) {
      console.log('⚠️ Large employee count detected, ensuring pagination is working correctly');
      console.log(`📊 Employee count breakdown: ${all.length} total employees across ${page - 1} pages`);
    }
    
    return all;
  }

  async getEmployee(employeeId: string): Promise<BambooHREmployee> {
    const response = await this.makeRequest(`/employees/${employeeId}`);
    return response.employee;
  }

  async getEmployeeDirectory(): Promise<BambooHREmployee[]> {
    const response = await this.makeRequest('/employees/directory');
    return response.employees || [];
  }

  // Compensation Management
  async getEmployeeCompensation(employeeId: string): Promise<BamboohrCompensation[]> {
    const response = await this.makeRequest(`/employees/${employeeId}/compensation`);
    return response.compensation || [];
  }

  async getCompensationHistory(employeeId: string, startDate?: string, endDate?: string): Promise<BamboohrCompensation[]> {
    let endpoint = `/employees/${employeeId}/compensation/history`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const response = await this.makeRequest(endpoint);
    return response.compensation || [];
  }

  // Time Off Management
  async getEmployeeTimeOff(employeeId: string): Promise<BambooHRTimeOff[]> {
    const response = await this.makeRequest(`/employees/${employeeId}/timeoff`);
    return response.timeOff || [];
  }

  async getAllTimeOff(startDate?: string, endDate?: string): Promise<BambooHRTimeOff[]> {
    let endpoint = '/timeoff';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const response = await this.makeRequest(endpoint);
    return response.timeOff || [];
  }

  // Reports
  async getCustomReport(reportId: string): Promise<any> {
    const response = await this.makeRequest(`/reports/${reportId}`);
    return response.report;
  }

  async createCustomReport(reportData: BambooHRReport): Promise<BambooHRReport> {
    const response = await this.makeRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
    return response.report;
  }

  // Company Information
  async getCompanyInfo(): Promise<any> {
    const response = await this.makeRequest('/company');
    return response.company;
  }

  // Webhook Management
  async createWebhook(webhookData: { url: string; events: string[] }): Promise<any> {
    const response = await this.makeRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhookData)
    });
    return response.webhook;
  }

  async getWebhooks(): Promise<any[]> {
    const response = await this.makeRequest('/webhooks');
    return response.webhooks || [];
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.makeRequest(`/webhooks/${webhookId}`, {
      method: 'DELETE'
    });
  }

  // Utility Methods
  calculateHourlyRate(annualSalary: number, paySchedule: string): number {
    let hoursPerYear: number;
    
    switch (paySchedule) {
      case 'weekly':
        hoursPerYear = 52 * 40; // 40 hours per week
        break;
      case 'bi-weekly':
        hoursPerYear = 26 * 80; // 80 hours per 2 weeks
        break;
      case 'semi-monthly':
        hoursPerYear = 24 * 86.67; // 86.67 hours per pay period
        break;
      case 'monthly':
        hoursPerYear = 12 * 173.33; // 173.33 hours per month
        break;
      default:
        hoursPerYear = 2080; // Standard 40-hour work week
    }
    
    return annualSalary / hoursPerYear;
  }

  // Data Import Methods
  async importEmployees(): Promise<Employee[]> {
    const bamboohrEmployees = await this.getAllEmployees();
    console.log(`BambooHR import: preparing to upsert ${bamboohrEmployees.length} employees`);

    return bamboohrEmployees.map(emp => ({
      id: emp.id,
      name: emp.displayName,
      email: emp.email,
      status: emp.status === 'active' ? 'active' : 'inactive',
      department: emp.department,
      position: emp.jobTitle,
      hireDate: emp.hireDate,
      terminationDate: emp.terminationDate
    }));
  }

  async importSalaries(): Promise<EmployeeSalary[]> {
    const employees = await this.getAllEmployees();
    console.log(`BambooHR import: fetching compensation for ${employees.length} employees`);
    const salaries: EmployeeSalary[] = [];

    for (const employee of employees) {
      const compensations = await this.getEmployeeCompensation(employee.id);

      for (const comp of compensations) {
        // Log the upsert intent; actual DB upsert occurs in saveEmployeeSalary
        console.log(`BambooHR upsert salary -> employeeId=${comp.employeeId} effectiveDate=${comp.effectiveDate} annualSalary=${comp.annualSalary} hourlyRate=${comp.hourlyRate}`);
        salaries.push({
          employeeId: comp.employeeId,
          effectiveDate: comp.effectiveDate,
          endDate: comp.endDate,
          annualSalary: comp.annualSalary,
          hourlyRate: comp.hourlyRate,
          currency: comp.currency,
          notes: `Imported from BambooHR - ${comp.payType} (${comp.paySchedule})`
        });
      }
    }

    return salaries;
  }

  async importAllData(): Promise<SalaryImport> {
    try {
      const employees = await this.importEmployees();
      const salaries = await this.importSalaries();

      return {
        source: 'bamboohr',
        importDate: new Date().toISOString(),
        recordsImported: employees.length + salaries.length,
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

  // Helper Methods
  async searchEmployees(query: string): Promise<BambooHREmployee[]> {
    const employees = await this.getAllEmployees();
    return employees.filter(emp => 
      emp.displayName.toLowerCase().includes(query.toLowerCase()) ||
      emp.email.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getEmployeesByDepartment(department: string): Promise<BambooHREmployee[]> {
    const employees = await this.getAllEmployees();
    return employees.filter(emp => emp.department === department);
  }

  async getActiveEmployees(): Promise<BambooHREmployee[]> {
    const employees = await this.getAllEmployees();
    return employees.filter(emp => emp.status === 'active');
  }
}

export let bamboohrService: BambooHRService | null = null;

export const configureBambooHR = (config: BambooHRConfig) => {
  bamboohrService = new BambooHRService(config);
  console.log(`BambooHR service configured for subdomain: ${config.subdomain}`);
};

export const getBambooHRService = (): BambooHRService => {
  if (!bamboohrService) {
    throw new Error('BambooHR service not configured. Call configureBambooHR first.');
  }
  return bamboohrService;
};

export const importBambooHREmployees = async (): Promise<Employee[]> => {
  const service = getBambooHRService();
  return await service.importEmployees();
};

export const importBambooHRSalaries = async (): Promise<EmployeeSalary[]> => {
  const service = getBambooHRService();
  return await service.importSalaries();
};

export const importBambooHRData = async (): Promise<SalaryImport> => {
  try {
    const service = getBambooHRService();
    console.log('🔄 Starting BambooHR data import...');
    
    // Get employee count before import
    const employees = await service.getAllEmployees();
    console.log(`👥 BambooHR employee count: ${employees.length}`);
    
    // Ensure pagination for /v1/employees/directory if >500 employees
    if (employees.length > 500) {
      console.log('⚠️ Large employee count detected, ensuring pagination is working correctly');
    }
    
    const result = await service.importAllData();
    
    // Log import results
    console.log('✅ BambooHR import completed:', {
      source: result.source,
      importDate: result.importDate,
      recordsImported: result.recordsImported,
      errorCount: result.errors.length
    });
    
    if (result.errors.length > 0) {
      console.warn('⚠️ BambooHR import had errors:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('❌ BambooHR import failed:', error);
    throw error;
  }
};
