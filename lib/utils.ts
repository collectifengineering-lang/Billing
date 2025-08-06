import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ZohoProject, ZohoInvoice } from './zoho';
import { BillingData, MonthlyBillingData, ProjectionsTable, ProjectionCell, ChartData, DashboardStats } from './types';

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

export function processBillingData(
  projects: ZohoProject[],
  invoices: ZohoInvoice[],
  projections: ProjectionsTable
): BillingData[] {
  // Handle undefined or null inputs
  const safeProjects = projects || [];
  const safeInvoices = invoices || [];
  const safeProjections = projections || {};
  
  const monthRange = getCurrentMonthRange();
  
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
      signedFee: project.signed_fee,
      monthlyData,
      totalBilled,
      totalUnbilled,
      totalProjected,
    };
  });
}

export function calculateDashboardStats(billingData: BillingData[], closedProjects?: Set<string>): DashboardStats {
  // Handle undefined or null billingData
  if (!billingData || !Array.isArray(billingData)) {
    return {
      totalProjects: 0,
      totalBilled: 0,
      totalUnbilled: 0,
      totalProjected: 0,
      activeProjects: 0,
    };
  }

  const totalProjects = billingData.length;
  const closedProjectsCount = closedProjects ? closedProjects.size : 0;
  const activeProjects = totalProjects - closedProjectsCount;

  // Get data from localStorage for projections and statuses
  const monthlyProjections = safeLocalStorageGet('monthlyProjections') || {};
  const monthlyStatuses = safeLocalStorageGet('monthlyStatuses') || {};
  
  // Calculate Total Billed YTD (sum of all projections marked as "Billed" for current year)
  const currentYear = new Date().getFullYear().toString();
  let totalBilledYTD = 0;
  
  Object.keys(monthlyProjections).forEach(projectId => {
    const projectProjections = monthlyProjections[projectId];
    const projectStatuses = monthlyStatuses[projectId];
    
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
  
  Object.keys(monthlyProjections).forEach(projectId => {
    const projectProjections = monthlyProjections[projectId];
    const projectStatuses = monthlyStatuses[projectId];
    
    if (projectProjections && projectStatuses) {
      Object.keys(projectProjections).forEach(month => {
        // Check if month is current or future and status is NOT "Billed"
        if (month >= currentMonth && projectStatuses[month] !== 'Billed') {
          backlog += projectProjections[month] || 0;
        }
      });
    }
  });

  return {
    totalProjects,
    totalBilled: totalBilledYTD, // Use YTD billed amount
    totalUnbilled: backlog, // Use backlog amount
    totalProjected: billingData.reduce((sum, data) => sum + data.totalProjected, 0),
    activeProjects,
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
  const monthRange = getCurrentMonthRange();
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