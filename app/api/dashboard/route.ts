import { NextRequest, NextResponse } from 'next/server';
import { payrollService } from '../../../lib/payroll';
import { clockifyService } from '../../../lib/clockify';
import { zohoService } from '../../../lib/zoho';

interface DashboardMetrics {
  // Multipliers
  currentYearMultiplier: number;
  lastYearMultiplier: number;
  twoYearsAgoMultiplier: number;
  
  // Overhead Rates
  currentYearOverhead: number;
  lastYearOverhead: number;
  twoYearsAgoOverhead: number;
  
  // Revenue per Employee
  currentYearRevenuePerEmployee: number;
  lastYearRevenuePerEmployee: number;
  twoYearsAgoRevenuePerEmployee: number;
  
  // Cashflow
  currentCashflow: number;
  previousMonthCashflow: number;
  cashflowTrend: 'up' | 'down' | 'stable';
  
  // Invoices
  overdueInvoiceValue: number;
  totalOutstandingInvoices: number;
  averageDaysToPayment: number;
  
  // Profit Metrics
  ytdProfit: number;
  lastYearYtdProfit: number;
  currentYearGrossMargin: number;
  lastYearGrossMargin: number;
  ytdOperatingIncome: number;
  lastYearYtdOperatingIncome: number;
  
  // Trailing 12 Months Data
  trailing12Months: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  }[];
  
  // Forecast Data
  forecast: {
    month: string;
    projectedRevenue: number;
    projectedExpenses: number;
    projectedProfit: number;
  }[];
  
  // Additional Metrics
  utilizationRate: number;
  averageProjectSize: number;
  clientRetentionRate: number;
  averageBillingRate: number;
  totalActiveProjects: number;
  totalEmployees: number;
}

export async function GET(request: NextRequest) {
  // Helper function to parse ISO 8601 duration
  function parseDuration(duration: string): number {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const match = duration.match(regex);
    
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  try {
    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Calculate multipliers (this would come from your payroll system)
    const currentYearMultiplier = 3.2;
    const lastYearMultiplier = 3.0;
    const twoYearsAgoMultiplier = 2.8;
    
    // Calculate overhead rates (this would come from your financial data)
    const currentYearOverhead = 0.28;
    const lastYearOverhead = 0.30;
    const twoYearsAgoOverhead = 0.32;
    
    // Get employee count and revenue data
    const employees = await payrollService.getAllEmployees();
    const totalEmployees = employees.length;
    
    // Calculate revenue per employee (this would come from your financial system)
    const currentYearRevenuePerEmployee = 285000;
    const lastYearRevenuePerEmployee = 265000;
    const twoYearsAgoRevenuePerEmployee = 245000;
    
    // Get project data from Zoho
    let totalActiveProjects = 0;
    let averageProjectSize = 125000;
    let ytdProfit = 425000;
    let lastYearYtdProfit = 385000;
    
    try {
      const projects = await zohoService.getProjects();
      totalActiveProjects = projects.filter(p => p.status === 'active').length;
      
      // Calculate average project size (using budget amount as proxy)
      const projectValues = projects.map(p => p.budget_amount || 0);
      if (projectValues.length > 0) {
        averageProjectSize = projectValues.reduce((sum, val) => sum + val, 0) / projectValues.length;
      }
    } catch (error) {
      console.log('Using default project data');
    }
    
    // Get Clockify data for utilization rate
    let utilizationRate = 0.85;
    let averageBillingRate = 185;
    
    try {
      const clockifyUser = await clockifyService.getUser();
      const clockifyProjects = await clockifyService.getProjects();
      
      // Calculate utilization rate based on billable hours vs total hours
      try {
        const timeEntries = await clockifyService.getAllTimeEntries(
          new Date(currentYear, 0, 1).toISOString(),
          now.toISOString()
        );
        
        const totalHours = timeEntries.reduce((sum, entry) => sum + (parseDuration(entry.timeInterval.duration) || 0), 0) / 3600000; // Convert from milliseconds
        const billableHours = timeEntries.filter(entry => entry.billable).reduce((sum, entry) => sum + (parseDuration(entry.timeInterval.duration) || 0), 0) / 3600000;
        
        if (totalHours > 0) {
          utilizationRate = billableHours / totalHours;
        }
        
        // Calculate average billing rate (using default rate for now)
        if (timeEntries.length > 0) {
          // For now, use a default billing rate since we don't have amount data
          averageBillingRate = 185; // Default rate, would be calculated from hourly rates in real implementation
        }
      } catch (timeEntryError) {
        console.warn('Failed to fetch Clockify time entries, using default values:', timeEntryError);
        // Keep default values
      }
    } catch (error) {
      console.log('Using default Clockify data');
    }
    
    // Calculate cashflow (this would come from your accounting system)
    const currentCashflow = 125000;
    const previousMonthCashflow = 110000;
    const cashflowTrend: 'up' | 'down' | 'stable' = currentCashflow > previousMonthCashflow ? 'up' : currentCashflow < previousMonthCashflow ? 'down' : 'stable';
    
    // Invoice data (this would come from Zoho Books)
    const overdueInvoiceValue = 45000;
    const totalOutstandingInvoices = 125000;
    const averageDaysToPayment = 42;
    
    // Profit margins
    const currentYearGrossMargin = 0.35;
    const lastYearGrossMargin = 0.32;
    const ytdOperatingIncome = 285000;
    const lastYearYtdOperatingIncome = 245000;
    
    // Client retention rate (this would come from your CRM data)
    const clientRetentionRate = 0.92;
    
    // Generate trailing 12 months data
    const trailing12Months = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date(currentYear, currentMonth - i, 1);
      const monthName = month.toLocaleDateString('en-US', { month: 'short' });
      const baseRevenue = 180000 + (i * 15000);
      const baseExpenses = 120000 + (i * 5000);
      const profit = baseRevenue - baseExpenses;
      const profitMargin = profit / baseRevenue;
      
      trailing12Months.push({
        month: monthName,
        revenue: baseRevenue,
        expenses: baseExpenses,
        profit,
        profitMargin
      });
    }
    
    // Generate forecast data
    const forecast = [];
    for (let i = 1; i <= 6; i++) {
      const month = new Date(currentYear, currentMonth + i, 1);
      const monthName = month.toLocaleDateString('en-US', { month: 'short' });
      const projectedRevenue = 360000 + (i * 15000);
      const projectedExpenses = 180000 + (i * 5000);
      const projectedProfit = projectedRevenue - projectedExpenses;
      
      forecast.push({
        month: monthName,
        projectedRevenue,
        projectedExpenses,
        projectedProfit
      });
    }
    
    const dashboardData: DashboardMetrics = {
      // Multipliers
      currentYearMultiplier,
      lastYearMultiplier,
      twoYearsAgoMultiplier,
      
      // Overhead Rates
      currentYearOverhead,
      lastYearOverhead,
      twoYearsAgoOverhead,
      
      // Revenue per Employee
      currentYearRevenuePerEmployee,
      lastYearRevenuePerEmployee,
      twoYearsAgoRevenuePerEmployee,
      
      // Cashflow
      currentCashflow,
      previousMonthCashflow,
      cashflowTrend,
      
      // Invoices
      overdueInvoiceValue,
      totalOutstandingInvoices,
      averageDaysToPayment,
      
      // Profit Metrics
      ytdProfit,
      lastYearYtdProfit,
      currentYearGrossMargin,
      lastYearGrossMargin,
      ytdOperatingIncome,
      lastYearYtdOperatingIncome,
      
      // Trailing 12 Months
      trailing12Months,
      
      // Forecast
      forecast,
      
      // Additional Metrics
      utilizationRate,
      averageProjectSize,
      clientRetentionRate,
      averageBillingRate,
      totalActiveProjects,
      totalEmployees,
    };
    
    return NextResponse.json(dashboardData);
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
