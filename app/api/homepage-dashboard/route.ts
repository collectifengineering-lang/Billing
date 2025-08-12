import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '@/lib/zoho';
import clockifyService from '@/lib/clockify';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Homepage Dashboard API called - starting data collection...');
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentYearStart = new Date(currentYear, 0, 1);
    const lastYearStart = new Date(currentYear - 1, 0, 1);
    
    console.log('📅 Date ranges calculated:', {
      currentYear,
      currentYearStart: currentYearStart.toISOString(),
      lastYearStart: lastYearStart.toISOString()
    });

    // Initialize data containers
    let projects: any[] = [];
    let invoices: any[] = [];
    let clockifyData: any = null;
    let financialMetrics: any = null;

    // Fetch Zoho data
    try {
      console.log('🔄 Starting Zoho data fetch...');
      [projects, invoices] = await Promise.all([
        zohoService.getProjects(),
        zohoService.getInvoices()
      ]);
      console.log('✅ Zoho data fetched:', { projectsCount: projects.length, invoicesCount: invoices.length });

      // Get financial metrics for current year
      try {
        console.log('💰 Fetching financial metrics...');
        financialMetrics = await zohoService.getFinancialMetrics(
          currentYearStart.toISOString().split('T')[0],
          now.toISOString().split('T')[0]
        );
        console.log('✅ Financial metrics loaded:', financialMetrics);
      } catch (error) {
        console.warn('⚠️ Failed to fetch financial metrics, using defaults:', error);
        financialMetrics = { revenue: 0, expenses: 0, netProfit: 0, grossProfit: 0, operatingIncome: 0, cashFlow: 0 };
      }
    } catch (error) {
      console.error('❌ Failed to fetch Zoho data:', error);
      projects = [];
      invoices = [];
      financialMetrics = { revenue: 0, expenses: 0, netProfit: 0, grossProfit: 0, operatingIncome: 0, cashFlow: 0 };
    }

    // Fetch Clockify data
    try {
      console.log('🔄 Starting Clockify data fetch...');
      const clockifyConfig = clockifyService.getConfigurationStatus();
      
      if (clockifyConfig.configured) {
        console.log('⏰ Clockify configured, fetching real data...');
        
        const [clockifyUser, clockifyProjects, timeEntries] = await Promise.all([
          clockifyService.getUser(),
          clockifyService.getProjects(),
          clockifyService.getAllTimeEntries(
            currentYearStart.toISOString(),
            now.toISOString()
          )
        ]);

        console.log('📊 Clockify raw data received:', {
          user: clockifyUser?.name || 'Unknown',
          projectsCount: clockifyProjects?.length || 0,
          timeEntriesCount: timeEntries?.length || 0
        });

        // Calculate time tracking metrics
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

        const efficiency = totalHours > 0 ? billableHours / totalHours : 0.85;
        
        // Calculate average hourly rate
        const billableEntries = timeEntries.filter(entry => entry.billable);
        let averageHourlyRate = 125; // Default
        if (billableEntries.length > 0) {
          const totalRate = billableEntries.reduce((sum, entry) => {
            const rate = entry.hourlyRate?.amount || 150;
            return sum + rate;
          }, 0);
          averageHourlyRate = totalRate / billableEntries.length;
        }

        clockifyData = {
          totalHours,
          billableHours,
          nonBillableHours: totalHours - billableHours,
          efficiency,
          averageHourlyRate,
          totalTimeValue: billableHours * averageHourlyRate,
          averageHoursPerProject: projects.length > 0 ? totalHours / projects.length : 0
        };

        console.log('✅ Clockify data calculated:', clockifyData);
      } else {
        console.log('🎭 Clockify not configured, using mock data');
        clockifyData = {
          totalHours: 28400,
          billableHours: 25200,
          nonBillableHours: 3200,
          efficiency: 0.89,
          averageHourlyRate: 125,
          totalTimeValue: 3150000,
          averageHoursPerProject: 70
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch Clockify data, using defaults:', error);
      console.error('Clockify error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      clockifyData = {
        totalHours: 28400,
        billableHours: 25200,
        nonBillableHours: 3200,
        efficiency: 0.89,
        averageHourlyRate: 125,
        totalTimeValue: 3150000,
        averageHoursPerProject: 70
      };
    }

    // Calculate project metrics
    const activeProjects = projects.filter(p => p.status === 'active') || [];
    const totalProjects = projects.length || 0;
    
    // Calculate billing metrics
    const paidInvoices = invoices.filter(inv => inv.status === 'paid') || [];
    const outstandingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'viewed') || [];
    
    const totalBilled = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalUnbilled = outstandingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Use financial metrics from Zoho if available
    const ytdRevenue = financialMetrics?.revenue || totalBilled;
    const ytdExpenses = financialMetrics?.expenses || 0;

    // Get top performing projects - ensure we always return an array
    let topPerformingProjects: string[] = [];
    try {
      if (Array.isArray(projects) && projects.length > 0) {
        topPerformingProjects = projects
          .filter(p => p.status === 'active')
          .sort((a, b) => {
            const aRevenue = invoices
              .filter(inv => inv.project_id === a.project_id)
              .reduce((sum, inv) => sum + (inv.total || 0), 0);
            const bRevenue = invoices
              .filter(inv => inv.project_id === b.project_id)
              .reduce((sum, inv) => sum + (inv.total || 0), 0);
            return bRevenue - aRevenue;
          })
          .slice(0, 5)
          .map(p => p.project_code || p.project_name || 'Unknown Project')
          .filter(Boolean); // Remove any undefined/null values
      }
    } catch (error) {
      console.warn('⚠️ Error calculating top performing projects, using defaults:', error);
      topPerformingProjects = ['Project A', 'Project B', 'Project C']; // Fallback
    }

    // Ensure we have valid arrays for all data
    const safeDashboardData = {
      totalProjects: totalProjects || 0,
      totalBilled: totalBilled || 0,
      totalUnbilled: totalUnbilled || 0,
      activeProjects: activeProjects.length || 0,
      totalHours: clockifyData?.totalHours || 0,
      billableHours: clockifyData?.billableHours || 0,
      efficiency: clockifyData?.efficiency || 0.85,
      averageHourlyRate: clockifyData?.averageHourlyRate || 125,
      totalTimeValue: clockifyData?.totalTimeValue || 0,
      averageHoursPerProject: clockifyData?.averageHoursPerProject || 0,
      topPerformingProjects: Array.isArray(topPerformingProjects) ? topPerformingProjects : [],
      ytdRevenue: ytdRevenue || 0,
      ytdExpenses: ytdExpenses || 0,
      ytdProfit: (ytdRevenue || 0) - (ytdExpenses || 0)
    };

    console.log('✅ Homepage dashboard data generated:', safeDashboardData);
    console.log('🚀 Returning dashboard data to client...');

    return NextResponse.json(safeDashboardData);
  } catch (error) {
    console.error('❌ Homepage Dashboard API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate homepage dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
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
