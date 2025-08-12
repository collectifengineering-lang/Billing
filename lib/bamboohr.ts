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
    this.baseUrl = `https://api.bamboohr.com/api/gateway.php/${config.subdomain}`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Basic ${btoa(`${this.config.apiKey}:x`)}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`BambooHR API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('BambooHR API request failed:', error);
      throw error;
    }
  }

  // Employee Management
  async getAllEmployees(): Promise<BambooHREmployee[]> {
    const response = await this.makeRequest('/employees/all');
    return response.employees || [];
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
    const salaries: EmployeeSalary[] = [];

    for (const employee of employees) {
      const compensations = await this.getEmployeeCompensation(employee.id);

      for (const comp of compensations) {
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
  const service = getBambooHRService();
  return await service.importAllData();
};
