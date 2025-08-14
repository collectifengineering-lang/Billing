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
    const basic = btoa(`${this.config.apiKey}:x`);
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

  // Employee Management - Updated to fetch detailed information after directory call
  async getAllEmployees(): Promise<BambooHREmployee[]> {
    try {
      console.log('🔄 Starting BambooHR employee fetch...');
      
      // First, get the employee directory
      const endpoint = '/employees/directory';
      const response = await this.makeRequest(endpoint);
      
      console.log(`📊 Raw directory response data:`, JSON.stringify(response, null, 2));
      
      let employees: BambooHREmployee[] = [];
      
      if (response.employees && Array.isArray(response.employees)) {
        employees = response.employees;
        console.log(`✅ Found ${employees.length} employees in directory response`);
        
        // Log sample employee data for debugging
        if (employees.length > 0) {
          console.log(`📋 Sample directory employee data:`, {
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
        console.log(`📄 No employee data found in directory response format:`, Object.keys(response));
        console.log(`🔍 Full directory response structure:`, JSON.stringify(response, null, 2));
        return [];
      }
      
      if (employees.length === 0) {
        console.log('⚠️ No employees found in BambooHR directory - verify data exists and API permissions');
        return [];
      }

      // Now fetch detailed information for each employee to get missing fields
      console.log(`🔄 Fetching detailed information for ${employees.length} employees...`);
      
      const detailedEmployees = await Promise.all(
        employees.map(async (emp) => {
          try {
            const detailedEmp = await this.getEmployeeDetails(emp.id);
            console.log(`✅ Fetched details for employee ${emp.id}: ${detailedEmp.firstName} ${detailedEmp.lastName}`);
            return detailedEmp;
          } catch (error) {
            console.error(`❌ Error fetching details for employee ${emp.id}:`, error);
            // Return the basic employee data if detailed fetch fails
            return emp;
          }
        })
      );

      console.log(`✅ Successfully fetched detailed information for ${detailedEmployees.length} employees`);
      
      // Log sample detailed employee data
      if (detailedEmployees.length > 0) {
        const sample = detailedEmployees[0];
        console.log(`📋 Sample detailed employee data:`, {
          id: sample.id,
          firstName: sample.firstName,
          lastName: sample.lastName,
          email: sample.email,
          hireDate: sample.hireDate,
          status: sample.status,
          department: sample.department,
          jobTitle: sample.jobTitle
        });
      }
      
      return detailedEmployees;
    } catch (error) {
      console.error('❌ Error fetching employees from BambooHR:', error);
      throw error;
    }
  }

  // New method to fetch detailed employee information
  async getEmployeeDetails(employeeId: string): Promise<BambooHREmployee> {
    try {
      console.log(`🔍 Fetching detailed information for employee ${employeeId}...`);
      
      // Request specific fields that are missing from directory endpoint
      const fields = 'hireDate,terminationDate,status,department,jobTitle,workEmail,firstName,lastName,displayName,preferredName,email';
      const endpoint = `/employees/${employeeId}?fields=${fields}`;
      
      const response = await this.makeRequest(endpoint);
      
      if (response.employees && response.employees.length > 0) {
        const emp = response.employees[0];
        
        // Map workEmail to email if email is not available
        if (!emp.email && emp.workEmail) {
          emp.email = emp.workEmail;
        }
        
        console.log(`✅ Detailed employee data for ${employeeId}:`, {
          hireDate: emp.hireDate,
          status: emp.status,
          department: emp.department,
          email: emp.email
        });
        
        return emp;
      } else {
        throw new Error(`No employee data found for ID ${employeeId}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching employee details for ${employeeId}:`, error);
      throw error;
    }
  }

  async getEmployee(employeeId: string): Promise<BambooHREmployee> {
    return await this.getEmployeeDetails(employeeId);
  }

  async getEmployeeDirectory(): Promise<BambooHREmployee[]> {
    return await this.getAllEmployees();
  }

  // Compensation Management - Fixed parsing and field mappings
  async getEmployeeCompensation(employeeId: string): Promise<BamboohrCompensation[]> {
    try {
      console.log(`💰 Fetching compensation for employee ${employeeId}...`);
      
      // Use the compensation tables endpoint for better salary data
      const endpoint = `/employees/${employeeId}/tables/compensation`;
      const response = await this.makeRequest(endpoint);
      
      console.log(`📊 Raw compensation response for employee ${employeeId}:`, JSON.stringify(response, null, 2));
      
      // Handle both array and object with compensation property
      let compensationData: any[] = [];
      
      if (Array.isArray(response)) {
        // Direct array response
        compensationData = response;
        console.log(`📊 Direct array response with ${compensationData.length} compensation records`);
      } else if (response.compensation && Array.isArray(response.compensation)) {
        // Object with compensation property
        compensationData = response.compensation;
        console.log(`📊 Object response with ${compensationData.length} compensation records`);
      } else {
        console.log(`⚠️ No compensation data found for employee ${employeeId} - response structure:`, Object.keys(response));
        console.log(`🔍 Full response:`, JSON.stringify(response, null, 2));
        return [];
      }
      
      if (compensationData.length === 0) {
        console.log(`⚠️ No compensation records found for employee ${employeeId}`);
        return [];
      }

      const compensations: BamboohrCompensation[] = [];
      
      for (const comp of compensationData) {
        try {
          console.log(`🔍 Processing compensation record:`, JSON.stringify(comp, null, 2));
          
          // Fixed field mappings based on actual API response structure
          const payRate = comp.rate?.value || comp.payRate || comp.amount;
          const payType = comp.type?.toLowerCase() || comp.payType;
          const payPeriod = comp.paySchedule || comp.paidPer || comp.payPeriod || 'monthly';
          
          if (!payRate || !payType) {
            console.log(`⚠️ Missing payRate or payType for compensation record:`, comp);
            continue;
          }
          
          let annualSalary = 0;
          let hourlyRate = 0;
          
          // Map fields based on payType
          if (payType === 'salary' || payType === 'annual') {
            annualSalary = parseFloat(payRate) || 0;
            // Calculate hourly rate based on pay period
            hourlyRate = this.calculateHourlyRate(annualSalary, payPeriod);
          } else if (payType === 'hourly') {
            hourlyRate = parseFloat(payRate) || 0;
            // Calculate annual salary based on pay period
            annualSalary = this.calculateAnnualSalary(hourlyRate, payPeriod);
          }
          
          const compensation: BamboohrCompensation = {
            employeeId: employeeId,
            effectiveDate: comp.effectiveDate || comp.startDate || new Date().toISOString().split('T')[0],
            endDate: comp.endDate || comp.stopDate,
            annualSalary: annualSalary,
            hourlyRate: hourlyRate,
            currency: comp.currency || comp.payCurrency || 'USD',
            payType: payType,
            paySchedule: payPeriod
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
        } catch (error) {
          console.error(`❌ Error processing compensation record for employee ${employeeId}:`, error);
        }
      }
      
      if (compensations.length === 0) {
        console.log(`⚠️ No valid compensation records found for employee ${employeeId}`);
      }
      
      return compensations;
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
    
    switch (paySchedule.toLowerCase()) {
      case 'weekly':
        hoursPerYear = 52 * 40; // 40 hours per week
        break;
      case 'bi-weekly':
      case 'biweekly':
        hoursPerYear = 26 * 80; // 80 hours per 2 weeks
        break;
      case 'semi-monthly':
      case 'semimonthly':
        hoursPerYear = 24 * 86.67; // 86.67 hours per pay period
        break;
      case 'monthly':
      case 'month':
        hoursPerYear = 12 * 173.33; // 173.33 hours per month
        break;
      case 'yearly':
      case 'year':
        hoursPerYear = 2080; // Standard 40-hour work week
        break;
      default:
        hoursPerYear = 2080; // Standard 40-hour work week
    }
    
    return annualSalary / hoursPerYear;
  }

  calculateAnnualSalary(hourlyRate: number, paySchedule: string): number {
    let hoursPerYear: number;
    
    switch (paySchedule.toLowerCase()) {
      case 'weekly':
        hoursPerYear = 52 * 40; // 40 hours per week
        break;
      case 'bi-weekly':
      case 'biweekly':
        hoursPerYear = 26 * 80; // 80 hours per 2 weeks
        break;
      case 'semi-monthly':
      case 'semimonthly':
        hoursPerYear = 24 * 86.67; // 86.67 hours per pay period
        break;
      case 'monthly':
      case 'month':
        hoursPerYear = 12 * 173.33; // 173.33 hours per month
        break;
      case 'yearly':
      case 'year':
        hoursPerYear = 2080; // Standard 40-hour work week
        break;
      default:
        hoursPerYear = 2080; // Standard 40-hour work week
    }
    
    return hourlyRate * hoursPerYear;
  }

  // Data Import Methods - Enhanced with detailed employee fetching and proper field mapping
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
          // Map workEmail to email if email is not available
          const email = emp.email || emp.workEmail || undefined;
          
          const employee: Employee = {
            id: emp.id,
            name: emp.preferredName || emp.displayName || `${emp.firstName} ${emp.lastName}`,
            email: email,
            status: emp.status === 'active' ? 'active' : 'inactive',
            department: emp.department || undefined,
            position: emp.jobTitle || undefined,
            hireDate: emp.hireDate || undefined, // Now optional in schema
            terminationDate: emp.terminationDate || undefined
          };
          
          employees.push(employee);
          successCount++;
          
          // Log successful employee mapping with fetched fields
          console.log(`✅ Employee mapped: ${employee.name} (${emp.id})`, {
            email: employee.email,
            department: employee.department,
            position: employee.position,
            hireDate: employee.hireDate,
            status: employee.status
          });
        } catch (error) {
          errorCount++;
          console.error(`❌ Error mapping employee ${emp.id}:`, error);
        }
      }

      console.log(`📊 Employee import results: ${successCount} successful, ${errorCount} errors`);
      
      // Log summary of fetched fields
      const employeesWithHireDate = employees.filter(e => e.hireDate).length;
      const employeesWithEmail = employees.filter(e => e.email).length;
      const employeesWithDepartment = employees.filter(e => e.department).length;
      
      console.log(`📋 Field completion summary:`, {
        totalEmployees: employees.length,
        withHireDate: employeesWithHireDate,
        withEmail: employeesWithEmail,
        withDepartment: employeesWithDepartment
      });
      
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
      (emp.email && emp.email.toLowerCase().includes(query.toLowerCase())) ||
      (emp.workEmail && emp.workEmail.toLowerCase().includes(query.toLowerCase()))
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
        email: employees[0].email || employees[0].workEmail || 'No email',
        department: employees[0].department || 'No department',
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
