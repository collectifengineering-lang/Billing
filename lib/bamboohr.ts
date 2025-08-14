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
    this.baseUrl = `https://api.bamboohr.com/api/gateway.php/${this.config.subdomain}/v1`;
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
    
    console.log(`🔄 BambooHR API call to: ${endpoint}`);
    console.log(`📡 URL: ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`BambooHR API error: ${response.status} ${response.statusText} ${body ? `- ${body}` : ''}`);
      }

      // Always expect JSON response
      const jsonResponse = await response.json();
      console.log(`✅ JSON response parsed successfully from ${endpoint}`);
      console.log(`📊 Response structure:`, Object.keys(jsonResponse));
      
      return jsonResponse;
    } catch (error) {
      console.error('BambooHR API request failed:', error);
      throw error;
    }
  }

  // Employee Management - Updated to use JSON and fetch compensation
  async getAllEmployees(): Promise<BambooHREmployee[]> {
    try {
      console.log('🔄 Starting BambooHR employee fetch...');
      
      const endpoint = '/employees/directory';
      const response = await this.makeRequest(endpoint);
      
      console.log(`📊 Raw response data:`, JSON.stringify(response, null, 2));
      
      let employees: BambooHREmployee[] = [];
      
      if (response.employees && Array.isArray(response.employees)) {
        employees = response.employees;
        console.log(`✅ Found ${employees.length} employees in JSON response`);
        
        // Log sample employee data for debugging
        if (employees.length > 0) {
          console.log(`📋 Sample employee data:`, {
            id: employees[0].id,
            firstName: employees[0].firstName,
            lastName: employees[0].lastName,
            preferredName: employees[0].preferredName,
            email: employees[0].email,
            jobTitle: employees[0].jobTitle,
            department: employees[0].department
          });
        }
      } else {
        console.log(`📄 No employee data found in response format:`, Object.keys(response));
        console.log(`🔍 Full response structure:`, JSON.stringify(response, null, 2));
      }
      
      if (employees.length === 0) {
        console.log('⚠️ No employees found in BambooHR - verify data exists and API permissions');
      } else {
        console.log(`✅ Successfully parsed ${employees.length} employees from BambooHR`);
      }
      
      return employees;
    } catch (error) {
      console.error('❌ Error fetching employees from BambooHR:', error);
      throw error;
    }
  }

  async getEmployee(employeeId: string): Promise<BambooHREmployee> {
    const response = await this.makeRequest(`/employees/${employeeId}`);
    return response.employee;
  }

  async getEmployeeDirectory(): Promise<BambooHREmployee[]> {
    return await this.getAllEmployees();
  }

  // Compensation Management - Updated to use compensation tables endpoint
  async getEmployeeCompensation(employeeId: string): Promise<BamboohrCompensation[]> {
    try {
      console.log(`💰 Fetching compensation for employee ${employeeId}...`);
      
      // Use the compensation tables endpoint for better salary data
      const endpoint = `/employees/${employeeId}/tables/compensation`;
      const response = await this.makeRequest(endpoint);
      
      console.log(`📊 Raw compensation response for employee ${employeeId}:`, JSON.stringify(response, null, 2));
      
      if (response.compensation && Array.isArray(response.compensation)) {
        const compensations: BamboohrCompensation[] = [];
        
        for (const comp of response.compensation) {
          try {
            console.log(`🔍 Processing compensation record:`, JSON.stringify(comp, null, 2));
            
            let annualSalary = 0;
            let hourlyRate = 0;
            
            // Map fields based on payType
            if (comp.payRate && comp.payType) {
              if (comp.payType === 'salary' || comp.payType === 'annual') {
                annualSalary = parseFloat(comp.payRate) || 0;
                // Calculate hourly rate based on pay period
                hourlyRate = this.calculateHourlyRate(annualSalary, comp.payPeriod || 'monthly');
              } else if (comp.payType === 'hourly') {
                hourlyRate = parseFloat(comp.payRate) || 0;
                // Calculate annual salary based on pay period
                annualSalary = this.calculateAnnualSalary(hourlyRate, comp.payPeriod || 'monthly');
              }
              
              const compensation: BamboohrCompensation = {
                employeeId: employeeId,
                effectiveDate: comp.effectiveDate || new Date().toISOString().split('T')[0],
                endDate: comp.endDate,
                annualSalary: annualSalary,
                hourlyRate: hourlyRate,
                currency: comp.payCurrency || 'USD',
                payType: comp.payType,
                paySchedule: comp.payPeriod || 'monthly'
              };
              
              compensations.push(compensation);
              console.log(`✅ Mapped compensation for employee ${employeeId}:`, {
                payType: compensation.payType,
                annualSalary: compensation.annualSalary,
                hourlyRate: compensation.hourlyRate,
                currency: compensation.currency,
                paySchedule: compensation.paySchedule,
                effectiveDate: compensation.effectiveDate
              });
            } else {
              console.log(`⚠️ Missing payRate or payType for compensation record:`, comp);
            }
          } catch (error) {
            console.error(`❌ Error processing compensation record for employee ${employeeId}:`, error);
          }
        }
        
        if (compensations.length === 0) {
          console.log(`⚠️ No valid compensation records found for employee ${employeeId}`);
        }
        
        return compensations;
      } else {
        console.log(`⚠️ No compensation data found for employee ${employeeId} - response structure:`, Object.keys(response));
        console.log(`🔍 Full response:`, JSON.stringify(response, null, 2));
        return [];
      }
    } catch (error) {
      console.error(`❌ Error fetching compensation for employee ${employeeId}:`, error);
      return [];
    }
  }

  async getCompensationHistory(employeeId: string, startDate?: string, endDate?: string): Promise<BamboohrCompensation[]> {
    // For now, return current compensation as historical data
    // In the future, this could be enhanced to fetch from compensation tables
    return await this.getEmployeeCompensation(employeeId);
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

  calculateAnnualSalary(hourlyRate: number, paySchedule: string): number {
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
    
    return hourlyRate * hoursPerYear;
  }

  // Data Import Methods - Enhanced with JSON parsing and compensation fetching
  async importEmployees(): Promise<Employee[]> {
    try {
      console.log('🔄 Starting employee import from BambooHR...');
      const bamboohrEmployees = await this.getAllEmployees();
      
      if (bamboohrEmployees.length === 0) {
        console.log('⚠️ No employees found in BambooHR - verify data exists and API permissions');
        return [];
      }
      
      console.log(`👥 BambooHR import: preparing to upsert ${bamboohrEmployees.length} employees`);

      const employees: Employee[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const emp of bamboohrEmployees) {
        try {
          const employee: Employee = {
            id: emp.id,
            name: emp.preferredName || emp.displayName || `${emp.firstName} ${emp.lastName}`,
            email: emp.email || null,
            status: emp.status === 'active' ? 'active' : 'inactive',
            department: emp.department,
            position: emp.jobTitle,
            hireDate: emp.hireDate,
            terminationDate: emp.terminationDate
          };
          
          employees.push(employee);
          successCount++;
          
          // Log successful employee mapping
          console.log(`✅ Employee mapped: ${employee.name} (${emp.id}) - ${emp.department}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Error mapping employee ${emp.id}:`, error);
        }
      }

      console.log(`📊 Employee import results: ${successCount} successful, ${errorCount} errors`);
      return employees;
    } catch (error) {
      console.error('❌ Employee import failed:', error);
      throw error;
    }
  }

  async importSalaries(): Promise<EmployeeSalary[]> {
    try {
      console.log('🔄 Starting salary import from BambooHR...');
      const employees = await this.getAllEmployees();
      
      if (employees.length === 0) {
        console.log('⚠️ No employees found in BambooHR - verify data exists and API permissions');
        return [];
      }
      
      console.log(`💰 BambooHR import: fetching compensation for ${employees.length} employees`);
      
      const salaries: EmployeeSalary[] = [];
      let successCount = 0;
      let errorCount = 0;
      let totalCompensationRecords = 0;

      for (const employee of employees) {
        try {
          const compensations = await this.getEmployeeCompensation(employee.id);
          totalCompensationRecords += compensations.length;

          for (const comp of compensations) {
            try {
              // Log the upsert intent; actual DB upsert occurs in saveEmployeeSalary
              console.log(`💰 Salary record: employeeId=${comp.employeeId} effectiveDate=${comp.effectiveDate} annualSalary=${comp.annualSalary} hourlyRate=${comp.hourlyRate}`);
              
              const salary: EmployeeSalary = {
                employeeId: comp.employeeId,
                effectiveDate: comp.effectiveDate,
                endDate: comp.endDate,
                annualSalary: comp.annualSalary,
                hourlyRate: comp.hourlyRate,
                currency: comp.currency,
                notes: `Imported from BambooHR - ${comp.payType} (${comp.paySchedule})`
              };
              
              salaries.push(salary);
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`❌ Error processing compensation for employee ${comp.employeeId}:`, error);
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error fetching compensation for employee ${employee.id}:`, error);
        }
      }

      console.log(`📊 Salary import results: ${successCount} successful, ${errorCount} errors, ${totalCompensationRecords} total compensation records`);
      return salaries;
    } catch (error) {
      console.error('❌ Salary import failed:', error);
      throw error;
    }
  }

  async importAllData(): Promise<SalaryImport> {
    try {
      console.log('🔄 Starting comprehensive BambooHR data import...');
      
      const [employees, salaries] = await Promise.all([
        this.importEmployees(),
        this.importSalaries()
      ]);

      const result: SalaryImport = {
        source: 'bamboohr',
        importDate: new Date().toISOString(),
        recordsImported: employees.length + salaries.length,
        errors: []
      };

      console.log(`✅ Comprehensive import completed: ${employees.length} employees, ${salaries.length} salaries`);
      return result;
    } catch (error: any) {
      console.error('❌ Comprehensive import failed:', error);
      
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
      (emp.preferredName || emp.displayName || `${emp.firstName} ${emp.lastName}`).toLowerCase().includes(query.toLowerCase()) ||
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
    
    if (employees.length === 0) {
      console.log('⚠️ No employees found in BambooHR - verify data exists and API permissions');
      return {
        source: 'bamboohr',
        importDate: new Date().toISOString(),
        recordsImported: 0,
        errors: ['No employees found in BambooHR - verify data exists and API permissions']
      };
    }
    
    // Log employee details for debugging
    console.log('📋 Sample employee data:', {
      firstEmployee: {
        id: employees[0].id,
        name: employees[0].preferredName || employees[0].displayName || `${employees[0].firstName} ${employees[0].lastName}`,
        email: employees[0].email,
        department: employees[0].department,
        status: employees[0].status
      }
    });
    
    const result = await service.importAllData();
    
    // Log import results with detailed breakdown
    console.log('✅ BambooHR import completed:', {
      source: result.source,
      importDate: result.importDate,
      recordsImported: result.recordsImported,
      errorCount: result.errors?.length || 0,
      employeeCount: employees.length,
      successRate: employees.length > 0 ? (result.recordsImported / employees.length * 100).toFixed(2) + '%' : 'N/A'
    });
    
    if (result.errors && result.errors.length > 0) {
      console.warn('⚠️ BambooHR import had errors:', result.errors);
      console.warn('📊 Error breakdown:', {
        totalErrors: result.errors.length,
        errorTypes: result.errors.map(err => err.includes('rate limit') ? 'rate_limit' : 'other')
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ BambooHR import failed:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('🔍 Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Check for specific error types
      if (error.message.includes('rate limit')) {
        console.warn('⚠️ Rate limit detected - consider implementing backoff strategy');
      } else if (error.message.includes('authentication')) {
        console.warn('⚠️ Authentication error - check API key and subdomain');
      } else if (error.message.includes('timeout')) {
        console.warn('⚠️ Request timeout - consider increasing timeout values');
      }
    }
    
    throw error;
  }
};
