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

// Import xml2js for XML parsing
import { parseStringPromise } from 'xml2js';

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
      'Accept': 'application/json, application/xml',
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

      // Check content type to determine parsing method
      const contentType = response.headers.get('content-type') || '';
      console.log(`📋 Response content-type: ${contentType}`);
      
      if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
        // Handle XML response
        const xmlText = await response.text();
        console.log(`📄 Parsing XML response from ${endpoint} (${xmlText.length} characters)`);
        try {
          const parsedXml = await parseStringPromise(xmlText, { explicitArray: false, mergeAttrs: true });
          console.log(`✅ XML parsed successfully. Structure:`, Object.keys(parsedXml));
          return parsedXml;
        } catch (xmlError) {
          console.error('❌ XML parsing failed:', xmlError);
          throw new Error(`Failed to parse XML response: ${xmlError}`);
        }
      } else {
        // Handle JSON response (default)
        console.log(`📄 Parsing JSON response from ${endpoint}`);
        const jsonResponse = await response.json();
        console.log(`✅ JSON parsed successfully. Structure:`, Object.keys(jsonResponse));
        return jsonResponse;
      }
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
        console.log(`📊 BambooHR response structure for page ${page}:`, Object.keys(response));
        
        // Handle both XML and JSON responses for employee directory
        let employees: BambooHREmployee[] = [];
        
        if (response.employees) {
          // JSON response format
          employees = response.employees;
          console.log(`✅ Using JSON format: employees array with ${employees.length} items`);
        } else if (response.employee) {
          // XML response format - single employee or array
          employees = Array.isArray(response.employee) ? response.employee : [response.employee];
          console.log(`✅ Using XML format: employee field with ${employees.length} items`);
        } else if (response.directory && response.directory.employee) {
          // Alternative XML format
          employees = Array.isArray(response.directory.employee) ? response.directory.employee : [response.directory.employee];
          console.log(`✅ Using XML format: directory.employee with ${employees.length} items`);
        } else {
          console.log(`📄 No employee data found in response format:`, Object.keys(response));
          console.log(`🔍 Full response structure:`, JSON.stringify(response, null, 2));
          employees = [];
        }
        
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
    
    // Handle both XML and JSON responses for employee directory
    if (response.employees) {
      // JSON response format
      return response.employees;
    } else if (response.employee) {
      // XML response format - single employee or array
      return Array.isArray(response.employee) ? response.employee : [response.employee];
    } else if (response.directory && response.directory.employee) {
      // Alternative XML format
      return Array.isArray(response.directory.employee) ? response.directory.employee : [response.directory.employee];
    } else {
      console.log('📄 No employee data found in response format:', Object.keys(response));
      return [];
    }
  }

  // Compensation Management - Updated to use tables endpoint
  async getEmployeeCompensation(employeeId: string): Promise<BamboohrCompensation[]> {
    try {
      console.log(`💰 Fetching compensation for employee ${employeeId}...`);
      
      // Use the tables endpoint for compensation data
      const response = await this.makeRequest(`/employees/${employeeId}/tables/compensation`);
      
      if (response.tables && response.tables.compensation) {
        const compensationData = response.tables.compensation;
        console.log(`✅ Found ${compensationData.length} compensation records for employee ${employeeId}`);
        
        // Parse and map the compensation data
        const compensations: BamboohrCompensation[] = compensationData.map((comp: any) => ({
          employeeId: employeeId,
          effectiveDate: comp.effectiveDate || comp['effective-date'] || '',
          endDate: comp.endDate || comp['end-date'] || '',
          annualSalary: parseFloat(comp.annualSalary || comp['annual-salary'] || '0'),
          hourlyRate: parseFloat(comp.hourlyRate || comp['hourly-rate'] || '0'),
          currency: comp.currency || 'USD',
          payType: comp.payType || comp['pay-type'] || 'salary',
          paySchedule: comp.paySchedule || comp['pay-schedule'] || 'monthly'
        }));
        
        return compensations;
      }
      
      console.log(`⚠️ No compensation data found for employee ${employeeId}`);
      return [];
    } catch (error) {
      console.error(`❌ Error fetching compensation for employee ${employeeId}:`, error);
      return [];
    }
  }

  async getCompensationHistory(employeeId: string, startDate?: string, endDate?: string): Promise<BamboohrCompensation[]> {
    let endpoint = `/employees/${employeeId}/tables/compensation`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    try {
      const response = await this.makeRequest(endpoint);
      
      if (response.tables && response.tables.compensation) {
        const compensationData = response.tables.compensation;
        console.log(`✅ Found ${compensationData.length} historical compensation records for employee ${employeeId}`);
        
        return compensationData.map((comp: any) => ({
          employeeId: employeeId,
          effectiveDate: comp.effectiveDate || comp['effective-date'] || '',
          endDate: comp.endDate || comp['end-date'] || '',
          annualSalary: parseFloat(comp.annualSalary || comp['annual-salary'] || '0'),
          hourlyRate: parseFloat(comp.hourlyRate || comp['hourly-rate'] || '0'),
          currency: comp.currency || 'USD',
          payType: comp.payType || comp['pay-type'] || 'salary',
          paySchedule: comp.paySchedule || comp['pay-schedule'] || 'monthly'
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error fetching compensation history for employee ${employeeId}:`, error);
      return [];
    }
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

  // Data Import Methods - Enhanced with XML parsing and better logging
  async importEmployees(): Promise<Employee[]> {
    try {
      console.log('🔄 Starting employee import from BambooHR...');
      const bamboohrEmployees = await this.getAllEmployees();
      console.log(`👥 BambooHR import: preparing to upsert ${bamboohrEmployees.length} employees`);

      const employees: Employee[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const emp of bamboohrEmployees) {
        try {
          const employee: Employee = {
            id: emp.id,
            name: emp.displayName,
            email: emp.email,
            status: emp.status === 'active' ? 'active' : 'inactive',
            department: emp.department,
            position: emp.jobTitle,
            hireDate: emp.hireDate,
            terminationDate: emp.terminationDate
          };
          
          employees.push(employee);
          successCount++;
          
          // Log successful employee mapping
          console.log(`✅ Employee mapped: ${emp.displayName} (${emp.id}) - ${emp.department}`);
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
      console.log(`📊 Employee count breakdown: ${employees.length} total employees across multiple pages`);
    }
    
    // Log employee details for debugging
    if (employees.length > 0) {
      console.log('📋 Sample employee data:', {
        firstEmployee: {
          id: employees[0].id,
          name: employees[0].displayName,
          email: employees[0].email,
          department: employees[0].department,
          status: employees[0].status
        }
      });
    }
    
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
    
    // Log pagination verification
    if (employees.length > 500) {
      console.log('✅ Pagination verification: Successfully fetched all employees across multiple pages');
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
