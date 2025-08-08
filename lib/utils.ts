import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ZohoProject, ZohoInvoice } from './zoho';
import { BillingData, MonthlyBillingData, ProjectionsTable, ProjectionCell, ChartData, DashboardStats, TimeTrackingKPI } from './types';
import { ClockifyTimeReport } from './clockify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateMonthRange(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];
  let currentDate = startOfMonth(startDate);
  const end = endOfMonth(endDate);

  while (currentDate <= end) {
    months.push(format(currentDate, 'yyyy-MM'));
    currentDate = addMonths(currentDate, 1);
  }

  return months;
}

export function getCurrentMonthRange(monthsBack: number = 12, monthsForward: number = 24): string[] {
  const today = new Date();
  const startDate = subMonths(today, monthsBack);
  const endDate = addMonths(today, monthsForward);
  
  return generateMonthRange(startDate, endDate);
}

export function getProjectionsMonthRange(): string[] {
  const startDate = new Date(2022, 0, 1); // January 1, 2022
  const today = new Date();
  const endDate = addMonths(today, 24); // 24 months beyond current month
  
  return generateMonthRange(startDate, endDate);
}

export function getChartMonthRange(): string[] {
  const today = new Date();
  const startDate = subMonths(today, 12); // 1 year in the past
  const endDate = addMonths(today, 12); // 1 year in the future
  
  return generateMonthRange(startDate, endDate);
}

export function processBillingData(
  projects: ZohoProject[],
  invoices: ZohoInvoice[],
  projections: ProjectionsTable
): BillingData[] {
  // Handle undefined or null inputs
  const safeProjects = projects || [];
  const safeInvoices = invoices || [];
  const safeProjections = projections || {};
  
  const monthRange = getProjectionsMonthRange();
  
  return safeProjects.map(project => {
    const projectInvoices = safeInvoices.filter(invoice => invoice.project_id === project.project_id);
    const monthlyData: MonthlyBillingData[] = monthRange.map(month => {
      const monthInvoices = projectInvoices.filter(invoice => {
        const invoiceMonth = format(new Date(invoice.date), 'yyyy-MM');
        return invoiceMonth === month;
      });

      const billed = monthInvoices.reduce((sum, invoice) => sum + invoice.billed_amount, 0);
      const unbilled = monthInvoices.reduce((sum, invoice) => sum + invoice.unbilled_amount, 0);
      const projected = safeProjections[project.project_id]?.months?.[month]?.value || 0;
      const actual = billed + unbilled;

      return {
        month,
        billed,
        unbilled,
        projected,
        actual,
      };
    });

    const totalBilled = monthlyData.reduce((sum, data) => sum + data.billed, 0);
    const totalUnbilled = monthlyData.reduce((sum, data) => sum + data.unbilled, 0);
    const totalProjected = monthlyData.reduce((sum, data) => sum + data.projected, 0);

    return {
      projectId: project.project_id,
      projectName: project.project_name, // Changed from project.name
      customerName: project.customer_name,
      signedFee: undefined, // Remove Zoho signed fee, only use user-entered data
      monthlyData,
      totalBilled,
      totalUnbilled,
      totalProjected,
    };
  });
}

export function calculateDashboardStats(
  billingData: BillingData[], 
  closedProjects?: Set<string>,
  monthlyProjections?: Record<string, Record<string, number>>,
  monthlyStatuses?: Record<string, Record<string, string>>
): DashboardStats {
  // Handle undefined or null billingData
  if (!billingData || !Array.isArray(billingData)) {
    return {
      totalProjects: 0,
      totalBilled: 0,
      totalUnbilled: 0,
      totalProjected: 0,
      activeProjects: 0,
      // Clockify KPIs
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      averageHourlyRate: 0,
      totalTimeValue: 0,
      efficiency: 0,
      averageHoursPerProject: 0,
      topPerformingProjects: [],
    };
  }

  const totalProjects = billingData.length;
  const closedProjectsCount = closedProjects ? closedProjects.size : 0;
  const activeProjects = totalProjects - closedProjectsCount;

  // Use database projections and statuses if provided, otherwise fall back to localStorage
  const projections = monthlyProjections || safeLocalStorageGet('monthlyProjections') || {};
  const statuses = monthlyStatuses || safeLocalStorageGet('monthlyStatuses') || {};
  
  // Calculate Total Billed YTD (sum of all projections marked as "Billed" for current year)
  const currentYear = new Date().getFullYear().toString();
  let totalBilledYTD = 0;
  
  Object.keys(projections).forEach(projectId => {
    const projectProjections = projections[projectId];
    const projectStatuses = statuses[projectId];
    
    if (projectProjections && projectStatuses) {
      Object.keys(projectProjections).forEach(month => {
        // Check if month is in current year and status is "Billed"
        if (month.startsWith(currentYear) && projectStatuses[month] === 'Billed') {
          totalBilledYTD += projectProjections[month] || 0;
        }
      });
    }
  });
  
  // Calculate Backlog (sum of all projections NOT marked as "Billed" for current and future months)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  let backlog = 0;
  
  Object.keys(projections).forEach(projectId => {
    const projectProjections = projections[projectId];
    const projectStatuses = statuses[projectId];
    
    if (projectProjections && projectStatuses) {
      Object.keys(projectProjections).forEach(month => {
        // Check if month is current or future and status is NOT "Billed"
        if (month >= currentMonth && projectStatuses[month] !== 'Billed') {
          backlog += projectProjections[month] || 0;
        }
      });
    }
  });

  // Calculate Total Projected (sum of all projections for current and future months)
  let totalProjected = 0;
  
  Object.keys(projections).forEach(projectId => {
    const projectProjections = projections[projectId];
    
    if (projectProjections) {
      Object.keys(projectProjections).forEach(month => {
        // Include all projections for current and future months
        if (month >= currentMonth) {
          totalProjected += projectProjections[month] || 0;
        }
      });
    }
  });

  // Calculate Clockify KPIs
  let totalHours = 0;
  let billableHours = 0;
  let nonBillableHours = 0;
  let totalTimeValue = 0;
  let totalHourlyRate = 0;
  let projectsWithTimeData = 0;
  const projectEfficiencies: { projectId: string; efficiency: number; hours: number }[] = [];

  billingData.forEach(project => {
    if (project.clockifyData) {
      const timeData = project.clockifyData;
      totalHours += timeData.totalHours;
      billableHours += timeData.billableHours;
      nonBillableHours += timeData.nonBillableHours;
      totalTimeValue += timeData.billableAmount;
      
      if (timeData.totalHours > 0) {
        const efficiency = timeData.billableHours / timeData.totalHours;
        projectEfficiencies.push({
          projectId: project.projectId,
          efficiency,
          hours: timeData.totalHours,
        });
        projectsWithTimeData++;
      }
    }
  });

  const averageHourlyRate = projectsWithTimeData > 0 ? totalTimeValue / billableHours : 0;
  const efficiency = totalHours > 0 ? billableHours / totalHours : 0;
  const averageHoursPerProject = projectsWithTimeData > 0 ? totalHours / projectsWithTimeData : 0;

  // Get top performing projects (by efficiency and hours)
  const topPerformingProjects = projectEfficiencies
    .sort((a, b) => (b.efficiency * b.hours) - (a.efficiency * a.hours))
    .slice(0, 5)
    .map(p => p.projectId);

  return {
    totalProjects,
    totalBilled: totalBilledYTD, // Use YTD billed amount from projections
    totalUnbilled: backlog, // Use backlog amount from projections
    totalProjected, // Use total projected amount from projections
    activeProjects,
    // Clockify KPIs
    totalHours,
    billableHours,
    nonBillableHours,
    averageHourlyRate,
    totalTimeValue,
    efficiency,
    averageHoursPerProject,
    topPerformingProjects,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatMonth(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, 'MMM yyyy');
}

export function isCurrentMonth(monthString: string): boolean {
  const currentMonth = format(new Date(), 'yyyy-MM');
  return monthString === currentMonth;
}

export function isFutureMonth(monthString: string): boolean {
  const currentMonth = format(new Date(), 'yyyy-MM');
  return monthString > currentMonth;
}

export function isPastMonth(monthString: string): boolean {
  const currentMonth = format(new Date(), 'yyyy-MM');
  return monthString < currentMonth;
}

// localStorage utility functions
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageGet(key: string): any {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return null;
  }
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage key '${key}':`, error);
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: any): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key '${key}':`, error);
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key '${key}':`, error);
    return false;
  }
}

export function createChartData(billingData: BillingData[]): ChartData[] {
  return billingData.map(data => ({
    name: data.projectName,
    billed: data.totalBilled,
    unbilled: data.totalUnbilled,
    projected: data.totalProjected,
  }));
}

export function initializeProjectionsTable(projects: ZohoProject[]): ProjectionsTable {
  // Handle undefined or null projects
  const safeProjects = projects || [];
  const monthRange = getProjectionsMonthRange();
  const table: ProjectionsTable = {};

  safeProjects.forEach(project => {
    table[project.project_id] = {
      months: {},
      asrFee: 0,
    };
    monthRange.forEach(month => {
      const isEditable = isFutureMonth(month);
      table[project.project_id].months[month] = {
        value: 0,
        isEditable,
        isProjected: isEditable,
      };
    });
  });

  return table;
} 

// New functions for Clockify integration
export function calculateTimeTrackingKPIs(clockifyData: ClockifyTimeReport): TimeTrackingKPI {
  const efficiency = clockifyData.totalHours > 0 ? clockifyData.billableHours / clockifyData.totalHours : 0;
  const averageHourlyRate = clockifyData.billableHours > 0 ? clockifyData.billableAmount / clockifyData.billableHours : 0;

  return {
    projectId: clockifyData.projectId,
    projectName: clockifyData.projectName,
    totalHours: clockifyData.totalHours,
    billableHours: clockifyData.billableHours,
    nonBillableHours: clockifyData.nonBillableHours,
    hourlyRate: averageHourlyRate,
    totalValue: clockifyData.billableAmount,
    efficiency,
    period: clockifyData.period,
  };
}

export function enhanceBillingDataWithClockify(
  billingData: BillingData[],
  clockifyReports: ClockifyTimeReport[]
): BillingData[] {
  return billingData.map(project => {
    const clockifyReport = clockifyReports.find(report => 
      report.projectId === project.projectId || 
      report.projectName.toLowerCase().includes(project.projectName.toLowerCase())
    );

    if (clockifyReport) {
      const timeTrackingKPI = calculateTimeTrackingKPIs(clockifyReport);
      
      return {
        ...project,
        clockifyData: clockifyReport,
        totalHours: clockifyReport.totalHours,
        billableHours: clockifyReport.billableHours,
        nonBillableHours: clockifyReport.nonBillableHours,
        hourlyRate: timeTrackingKPI.hourlyRate,
        efficiency: timeTrackingKPI.efficiency,
      };
    }

    return project;
  });
}

export function calculateProfitabilityMetrics(
  billingData: BillingData,
  timeTrackingKPI?: TimeTrackingKPI
) {
  const revenue = billingData.totalBilled + billingData.totalUnbilled;
  const cost = timeTrackingKPI ? timeTrackingKPI.totalValue : 0;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cost,
    profit,
    margin,
  };
}

export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export function formatEfficiency(efficiency: number): string {
  return `${(efficiency * 100).toFixed(1)}%`;
} 