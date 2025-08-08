import {
  SurePayrollConfig,
  SurePayrollEmployee,
  SurePayrollCompensation,
  SurePayrollTimeOff,
  SurePayrollReport,
  Employee,
  EmployeeSalary,
  SalaryImport
} from './types';

export class SurePayrollService {
  private config: SurePayrollConfig;
  private baseUrl: string;

  constructor(config: SurePayrollConfig) {
    this.config = config;
    this.baseUrl = `https://api.surepayroll.com/v1`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-Client-ID': this.config.clientId,
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
        throw new Error(`SurePayroll API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('SurePayroll API request failed:', error);
      throw error;
    }
  }

  // Employee Management
  async getAllEmployees(): Promise<SurePayrollEmployee[]> {
    const response = await this.makeRequest('/employees');
    return response.employees || [];
  }

  async getEmployee(employeeId: string): Promise<SurePayrollEmployee> {
    const response = await this.makeRequest(`/employees/${employeeId}`);
    return response.employee;
  }

  async getEmployeeDirectory(): Promise<SurePayrollEmployee[]> {
    const response = await this.makeRequest('/employees/directory');
    return response.employees || [];
  }

  // Compensation Management
  async getEmployeeCompensation(employeeId: string): Promise<SurePayrollCompensation[]> {
    const response = await this.makeRequest(`/employees/${employeeId}/compensation`);
    return response.compensation || [];
  }

  async getCompensationHistory(employeeId: string, startDate?: string, endDate?: string): Promise<SurePayrollCompensation[]> {
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
  async getEmployeeTimeOff(employeeId: string): Promise<SurePayrollTimeOff[]> {
    const response = await this.makeRequest(`/employees/${employeeId}/timeoff`);
    return response.timeOff || [];
  }

  async getAllTimeOff(startDate?: string, endDate?: string): Promise<SurePayrollTimeOff[]> {
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

  async createCustomReport(reportData: SurePayrollReport): Promise<SurePayrollReport> {
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
    const surepayrollEmployees = await this.getAllEmployees();

    return surepayrollEmployees.map(emp => ({
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
          notes: `Imported from SurePayroll - ${comp.payType} (${comp.paySchedule})`
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
        source: 'surepayroll',
        importDate: new Date().toISOString(),
        recordsImported: employees.length + salaries.length,
        errors: []
      };
    } catch (error: any) {
      return {
        source: 'surepayroll',
        importDate: new Date().toISOString(),
        recordsImported: 0,
        errors: [error.message]
      };
    }
  }

  // Helper Methods
  async searchEmployees(query: string): Promise<SurePayrollEmployee[]> {
    const employees = await this.getAllEmployees();
    return employees.filter(emp => 
      emp.displayName.toLowerCase().includes(query.toLowerCase()) ||
      emp.email.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getEmployeesByDepartment(department: string): Promise<SurePayrollEmployee[]> {
    const employees = await this.getAllEmployees();
    return employees.filter(emp => emp.department === department);
  }

  async getActiveEmployees(): Promise<SurePayrollEmployee[]> {
    const employees = await this.getAllEmployees();
    return employees.filter(emp => emp.status === 'active');
  }
}

export let surepayrollService: SurePayrollService | null = null;

export const configureSurePayroll = (config: SurePayrollConfig) => {
  surepayrollService = new SurePayrollService(config);
  console.log(`SurePayroll service configured for client ID: ${config.clientId}`);
};

export const getSurePayrollService = (): SurePayrollService => {
  if (!surepayrollService) {
    throw new Error('SurePayroll service not configured. Call configureSurePayroll first.');
  }
  return surepayrollService;
};

export const importSurePayrollEmployees = async (): Promise<Employee[]> => {
  const service = getSurePayrollService();
  return await service.importEmployees();
};

export const importSurePayrollSalaries = async (): Promise<EmployeeSalary[]> => {
  const service = getSurePayrollService();
  return await service.importSalaries();
};

export const importSurePayrollData = async (): Promise<SalaryImport> => {
  const service = getSurePayrollService();
  return await service.importAllData();
};
