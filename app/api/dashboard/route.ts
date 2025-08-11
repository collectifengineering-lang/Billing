import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '@/lib/zoho';
import clockifyService from '@/lib/clockify';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Check Clockify service configuration
    const clockifyConfig = clockifyService.getConfigurationStatus();
    console.log('Clockify service configuration:', clockifyConfig);
    
    if (!clockifyConfig.configured) {
      console.warn('Clockify service not configured - using mock data for time tracking metrics');
    }

    // Get Zoho data for financial metrics
    let projects: any[] = [];
    let invoices: any[] = [];
    
    try {
      projects = await zohoService.getProjects();
      invoices = await zohoService.getInvoices();
    } catch (error) {
      console.error('Failed to fetch Zoho data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch financial data from Zoho' },
        { status: 500 }
      );
    }

    // Get Clockify data for utilization rate
    let utilizationRate = 0.85;
    let averageBillingRate = 185;
    
    try {
      if (clockifyConfig.configured) {
        const clockifyUser = await clockifyService.getUser();
        const clockifyProjects = await clockifyService.getProjects();
        
        // Calculate utilization rate based on billable hours vs total hours
        try {
          const timeEntries = await clockifyService.getAllTimeEntries(
            new Date(currentYear, 0, 1).toISOString(),
            now.toISOString()
          );
          
          const totalHours = timeEntries.reduce((sum, entry) => {
            const duration = entry.timeInterval?.duration || 'PT0H';
            const hours = parseDuration(duration);
            return sum + hours;
          }, 0);
          
          const billableHours = timeEntries.filter(entry => entry.billable).reduce((sum, entry) => {
            const duration = entry.timeInterval?.duration || 'PT0H';
            const hours = parseDuration(duration);
            return sum + hours;
          }, 0);
          
          utilizationRate = totalHours > 0 ? billableHours / totalHours : 0.85;
          
          // Calculate average billing rate
          const billableEntries = timeEntries.filter(entry => entry.billable);
          if (billableEntries.length > 0) {
            const totalRate = billableEntries.reduce((sum, entry) => {
              const rate = entry.hourlyRate?.amount || 150;
              return sum + rate;
            }, 0);
            averageBillingRate = totalRate / billableEntries.length;
          }
        } catch (timeError) {
          console.warn('Failed to calculate utilization rate from Clockify, using defaults:', timeError);
        }
      } else {
        console.log('Using mock utilization data due to Clockify not being configured');
      }
    } catch (error) {
      console.warn('Failed to fetch Clockify data, using defaults:', error);
    }

    // Calculate financial metrics from Zoho data
    const activeProjects = projects.filter(p => p.status === 'active');
    const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const outstandingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'viewed');
    
    const totalCollected = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    // Calculate YTD metrics
    const currentYearInvoices = invoices.filter(inv => {
      const invoiceDate = new Date(inv.date);
      return invoiceDate.getFullYear() === currentYear;
    });
    
    const ytdRevenue = currentYearInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const ytdProfit = ytdRevenue * 0.25; // Assuming 25% profit margin
    
    // Generate mock data for missing metrics
    const mockData = {
      currentYearMultiplier: 2.8,
      lastYearMultiplier: 2.6,
      twoYearsAgoMultiplier: 2.4,
      currentYearOverhead: 0.35,
      lastYearOverhead: 0.37,
      twoYearsAgoOverhead: 0.39,
      currentYearRevenuePerEmployee: 250000,
      lastYearRevenuePerEmployee: 235000,
      twoYearsAgoRevenuePerEmployee: 220000,
      currentCashflow: totalCollected - totalOutstanding,
      previousMonthCashflow: totalCollected * 0.8 - totalOutstanding * 0.8,
      cashflowTrend: 'up' as const,
      overdueInvoiceValue: totalOutstanding * 0.3,
      totalOutstandingInvoices: totalOutstanding,
      averageDaysToPayment: 45,
      ytdProfit,
      lastYearYtdProfit: ytdProfit * 0.9,
      currentYearGrossMargin: 0.35,
      lastYearGrossMargin: 0.33,
      ytdOperatingIncome: ytdProfit * 0.8,
      lastYearYtdOperatingIncome: ytdProfit * 0.8 * 0.9,
      trailing12Months: Array.from({ length: 12 }, (_, i) => {
        const month = new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' });
        const revenue = ytdRevenue / 12 * (0.8 + Math.random() * 0.4);
        const expenses = revenue * 0.65;
        const profit = revenue - expenses;
        return {
          month,
          revenue: Math.round(revenue),
          expenses: Math.round(expenses),
          profit: Math.round(profit),
          profitMargin: profit / revenue
        };
      }),
      forecast: Array.from({ length: 6 }, (_, i) => {
        const month = new Date(currentYear, 11 + i, 1).toLocaleDateString('en-US', { month: 'short' });
        const projectedRevenue = ytdRevenue / 12 * (1.1 + Math.random() * 0.2);
        const projectedExpenses = projectedRevenue * 0.65;
        const projectedProfit = projectedRevenue - projectedExpenses;
        return {
          month,
          projectedRevenue: Math.round(projectedRevenue),
          projectedExpenses: Math.round(projectedExpenses),
          projectedProfit: Math.round(projectedProfit)
        };
      }),
      utilizationRate,
      averageProjectSize: totalBudget / Math.max(activeProjects.length, 1),
      clientRetentionRate: 0.85,
      averageBillingRate,
      totalActiveProjects: activeProjects.length,
      totalEmployees: 12
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard data' },
      { status: 500 }
    );
  }
}

// Helper function to parse duration strings (e.g., "PT2H30M")
function parseDuration(duration: string): number {
  if (!duration) return 0;
  
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours + (minutes / 60) + (seconds / 3600);
}
