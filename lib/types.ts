import { ZohoProject, ZohoInvoice } from './zoho';
import { ClockifyTimeReport, ClockifyProject } from './clockify';

export interface ProjectManager {
  id: string;
  name: string;
  color: string;
}

export interface ProjectAssignment {
  projectId: string;
  managerId: string;
}

export interface BillingData {
  projectId: string;
  projectName: string;
  customerName: string;
  signedFee?: number;
  monthlyData: MonthlyBillingData[];
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
  status?: string; // 'active' | 'closed' | 'completed' | 'on-hold'
  isClosed?: boolean; // Keep for backward compatibility
  projectManagerId?: string;
  // Clockify integration fields
  clockifyData?: ClockifyTimeReport;
  totalHours?: number;
  billableHours?: number;
  nonBillableHours?: number;
  hourlyRate?: number;
  efficiency?: number; // billable hours / total hours
}

export interface MonthlyBillingData {
  month: string; // Format: "YYYY-MM"
  billed: number;
  unbilled: number;
  projected: number;
  actual: number;
}

export interface ProjectionCell {
  value: number;
  isEditable: boolean;
  isProjected: boolean;
}

export interface ProjectionsTable {
  [projectId: string]: {
    months: { [month: string]: ProjectionCell };
    asrFee?: number; // Added for Total ASR Fee (user input)
  };
}

export interface ChartData {
  name: string;
  billed: number;
  unbilled: number;
  projected: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
  activeProjects: number;
  // Clockify KPIs
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  averageHourlyRate: number;
  totalTimeValue: number;
  efficiency: number; // billable hours / total hours
  averageHoursPerProject: number;
  topPerformingProjects: string[];
}

export interface Project {
  id: string;
  name: string;
  customerName: string;
  project_id: string;
  project_name: string;
  project_code: string;
  customer_id: string;
  customer_name: string;
  description: string;
  can_be_invoiced: boolean;
  status: string;
  billing_type: string;
  created_time: string;
  last_modified_time: string;
  has_attachment: boolean;
  total_hours: string;
  billable_hours: string;
  other_service_app_source: string;
  users_working: number;
  cf_market: string;
  cf_market_unformatted: string;
  custom_fields: any[];
  start_date: string;
  end_date: string;
}

export interface Invoice {
  id: string;
  projectId: string;
  amount: number;
  date: string;
  invoice_id: string;
  project_id: string;
  invoice_number: string;
  status: string;
  customer_id: string;
  total: number;
  billed_amount: number;
  unbilled_amount: number;
  // Add more if needed
}

export interface ProjectWithBilling extends ZohoProject {
  billingData: BillingData;
}

// New interfaces for Clockify integration
export interface ClockifyIntegration {
  isEnabled: boolean;
  workspaceId?: string;
  apiKey?: string;
  lastSync?: string;
  projectMappings?: ProjectMapping[];
}

export interface ProjectMapping {
  zohoProjectId: string;
  clockifyProjectId: string;
  zohoProjectName: string;
  clockifyProjectName: string;
}

export interface TimeTrackingKPI {
  projectId: string;
  projectName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  hourlyRate: number;
  totalValue: number;
  efficiency: number;
  period: {
    start: string;
    end: string;
  };
}

export interface EnhancedBillingData extends BillingData {
  timeTracking?: TimeTrackingKPI;
  profitability?: {
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  };
} 

// New interfaces for payroll integration
export interface Employee {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  department?: string;
  position?: string;
  hireDate: string;
  terminationDate?: string;
}

export interface EmployeeSalary {
  employeeId: string;
  effectiveDate: string; // YYYY-MM-DD format
  endDate?: string | null; // YYYY-MM-DD format; can be null in DB when current
  annualSalary: number;
  hourlyRate: number; // Calculated from annual salary
  currency: string;
  notes?: string;
}

export interface ProjectMultiplier {
  projectId: string;
  projectName: string;
  multiplier: number; // e.g., 2.5x, 3.0x
  effectiveDate: string;
  endDate?: string;
  notes?: string;
}

export interface EmployeeTimeEntry {
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  date: string;
  hours: number;
  billableHours: number;
  nonBillableHours: number;
  hourlyRate: number; // Employee's rate at that time
  projectMultiplier: number; // Project multiplier at that time
  totalCost: number; // hours * hourlyRate
  billableValue: number; // billableHours * hourlyRate * multiplier
  efficiency: number; // billableHours / hours
  description?: string;
  tags?: string[];
}

export interface ProjectProfitabilityReport {
  projectId: string;
  projectName: string;
  period: {
    start: string;
    end: string;
  };
  totalHours: number;
  totalBillableHours: number;
  totalCost: number; // Sum of employee costs
  totalRevenue: number; // From projections/billing
  grossProfit: number; // Revenue - Cost
  profitMargin: number; // (Gross Profit / Revenue) * 100
  averageMultiplier: number;
  employeeBreakdown: {
    employeeId: string;
    employeeName: string;
    hours: number;
    cost: number;
    billableValue: number;
    efficiency: number;
  }[];
  monthlyBreakdown: {
    month: string;
    hours: number;
    cost: number;
    revenue: number;
    profit: number;
  }[];
}

export interface EmployeeProfitabilityReport {
  employeeId: string;
  employeeName: string;
  period: {
    start: string;
    end: string;
  };
  totalHours: number;
  totalBillableHours: number;
  totalCost: number;
  totalBillableValue: number;
  efficiency: number;
  averageHourlyRate: number;
  projectBreakdown: {
    projectId: string;
    projectName: string;
    hours: number;
    cost: number;
    billableValue: number;
    efficiency: number;
  }[];
}

// Payroll system integration
export interface PayrollSystem {
  name: string;
  type: 'gusto' | 'quickbooks' | 'adp' | 'bamboohr' | 'custom';
  apiEndpoint?: string;
  apiKey?: string;
  webhookUrl?: string;
}

// BambooHR specific interfaces
export interface BambooHRConfig {
  subdomain: string;
  apiKey: string;
  webhookSecret?: string;
}

export interface BambooHREmployee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  status: 'active' | 'inactive' | 'terminated';
  hireDate: string;
  terminationDate?: string;
  department?: string;
  jobTitle?: string;
  location?: string;
  supervisor?: string;
  employeeNumber?: string;
  customFields?: Record<string, any>;
}

export interface BamboohrCompensation {
  employeeId: string;
  effectiveDate: string;
  endDate?: string;
  annualSalary: number;
  hourlyRate: number;
  currency: string;
  paySchedule: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  payType: 'salary' | 'hourly';
  benefits?: {
    healthInsurance?: number;
    retirement?: number;
    other?: number;
  };
  notes?: string;
}

export interface BambooHRTimeOff {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  hours: number;
  status: 'approved' | 'pending' | 'denied';
}

export interface BambooHRReport {
  id: string;
  name: string;
  fields: string[];
  filters?: Record<string, any>;
}

export interface SalaryImport {
  source: 'manual' | 'api' | 'csv' | 'bamboohr';
  importDate: string;
  recordsImported: number;
  errors?: string[];
} 