import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting utility
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Month formatting utility
export function formatMonth(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Hours formatting utility
export function formatHours(hours: number) {
  return `${hours.toLocaleString()}h`;
}

// Efficiency formatting utility
export function formatEfficiency(efficiency: number) {
  return `${(efficiency * 100).toFixed(1)}%`;
}

// Date utility functions
export function isCurrentMonth(month: string): boolean {
  const now = new Date();
  const currentMonth = formatMonth(now);
  return month === currentMonth;
}

export function isPastMonth(month: string): boolean {
  const now = new Date();
  const currentMonth = formatMonth(now);
  const monthDate = new Date(month + '-01');
  const currentDate = new Date(currentMonth + '-01');
  return monthDate < currentDate;
}

export function isFutureMonth(month: string): boolean {
  const now = new Date();
  const currentMonth = formatMonth(now);
  const monthDate = new Date(month + '-01');
  const currentDate = new Date(currentMonth + '-01');
  return monthDate > currentDate;
}

// Get chart month range
export function getChartMonthRange(monthsBack: number = 12) {
  const months = [];
  const now = new Date();
  
  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(formatMonth(date));
  }
  
  return months;
}

// Get projections month range
export function getProjectionsMonthRange() {
  return getChartMonthRange(24); // 2 years
}

// Initialize projections table
export function initializeProjectionsTable(data: any[]) {
  const months = getProjectionsMonthRange();
  return data.map(project => ({
    ...project,
    monthlyData: months.map(month => ({
      month,
      billed: 0,
      projected: 0
    }))
  }));
}

// Process billing data
export function processBillingData(projectsData: any[], invoicesData?: any[], projections?: any[], closedProjects?: Set<string>) {
  return projectsData.map(item => ({
    projectId: item.projectId || item.id,
    projectName: item.projectName || item.name,
    customerName: item.customerName || item.customer || 'Unknown Customer',
    signedFee: item.signedFee || 0,
    monthlyData: item.monthlyData || [],
    totalBilled: item.totalBilled || 0,
    totalUnbilled: item.totalUnbilled || 0,
    totalProjected: item.totalProjected || 0,
    status: item.status || 'active',
    isClosed: closedProjects?.has(item.projectId || item.id) || false,
    projectManagerId: item.projectManagerId,
    clockifyData: item.clockifyData,
    totalHours: item.totalHours || 0,
    billableHours: item.billableHours || 0,
    nonBillableHours: item.nonBillableHours || 0,
    hourlyRate: item.hourlyRate || 0,
    efficiency: item.efficiency || 0
  }));
}

// Enhance billing data with Clockify
export function enhanceBillingDataWithClockify(billingData: any[], clockifyData: any[]) {
  return billingData.map(project => {
    const clockifyProject = clockifyData.find(cp => cp.projectId === project.projectId);
    return {
      ...project,
      clockifyData: clockifyProject || null
    };
  });
}

// Safe localStorage utilities
export function safeLocalStorageGet(key: string, defaultValue: any = null) {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

export function safeLocalStorageSet(key: string, value: any) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

// Calculate dashboard stats
export function calculateDashboardStats(billingData: any[], closedProjects?: Set<string>): any {
  const totalProjects = billingData.length;
  const totalBilled = billingData.reduce((sum, project) => sum + (project.totalBilled || 0), 0);
  const totalUnbilled = billingData.reduce((sum, project) => sum + (project.totalUnbilled || 0), 0);
  const activeProjects = billingData.filter(project => !project.isClosed).length;
  const totalHours = billingData.reduce((sum, project) => sum + (project.totalHours || 0), 0);
  const billableHours = billingData.reduce((sum, project) => sum + (project.billableHours || 0), 0);
  const efficiency = totalHours > 0 ? billableHours / totalHours : 0;
  const averageHourlyRate = billableHours > 0 ? totalBilled / billableHours : 0;
  const totalTimeValue = totalHours * averageHourlyRate;
  const averageHoursPerProject = totalProjects > 0 ? totalHours / totalProjects : 0;

  return {
    totalProjects,
    totalBilled,
    totalUnbilled,
    activeProjects,
    totalHours,
    billableHours,
    efficiency,
    averageHourlyRate,
    totalTimeValue,
    averageHoursPerProject,
    topPerformingProjects: [],
    ytdRevenue: totalBilled,
    ytdExpenses: 0,
    ytdProfit: totalBilled,
    ytdOperatingIncome: totalBilled,
    ytdGrossProfit: totalBilled,
    ytdNetProfit: totalBilled,
    ytdCashFlow: totalBilled
  };
}