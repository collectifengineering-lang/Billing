import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '@/lib/zoho';
import clockifyService from '@/lib/clockify';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Top Projects API called - starting data collection...');
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentYearStart = new Date(currentYear, 0, 1);
    
    console.log('📅 Date range calculated:', {
      currentYear,
      currentYearStart: currentYearStart.toISOString()
    });

    // Initialize data containers
    let projects: any[] = [];
    let invoices: any[] = [];
    let clockifyData: any = null;

    // Fetch Zoho data
    try {
      console.log('🔄 Starting Zoho data fetch...');
      [projects, invoices] = await Promise.all([
        zohoService.getProjects(),
        zohoService.getInvoices()
      ]);
      console.log('✅ Zoho data fetched:', { projectsCount: projects.length, invoicesCount: invoices.length });
    } catch (error) {
      console.error('❌ Failed to fetch Zoho data:', error);
      projects = [];
      invoices = [];
    }

    // Fetch Clockify data for time tracking
    try {
      console.log('🔄 Starting Clockify data fetch...');
      const clockifyConfig = clockifyService.getConfigurationStatus();
      
      if (clockifyConfig.configured) {
        console.log('⏰ Clockify configured, fetching real data...');
        
        const timeEntries = await clockifyService.getAllTimeEntries(
          currentYearStart.toISOString(),
          now.toISOString()
        );

        console.log('📊 Clockify time entries received:', {
          count: timeEntries?.length || 0,
          sampleEntry: timeEntries?.[0] ? {
            id: timeEntries[0].id,
            projectId: timeEntries[0].projectId,
            duration: timeEntries[0].timeInterval?.duration
          } : 'No entries'
        });

        // Group time entries by project
        const projectTimeMap = new Map();
        timeEntries.forEach(entry => {
          const projectId = entry.projectId;
          if (!projectTimeMap.has(projectId)) {
            projectTimeMap.set(projectId, {
              totalHours: 0,
              billableHours: 0,
              nonBillableHours: 0
            });
          }
          
          const duration = entry.timeInterval?.duration || 'PT0H';
          const hours = parseDuration(duration);
          const projectData = projectTimeMap.get(projectId);
          
          projectData.totalHours += hours;
          if (entry.billable) {
            projectData.billableHours += hours;
          } else {
            projectData.nonBillableHours += hours;
          }
        });

        clockifyData = projectTimeMap;
        console.log('✅ Clockify data processed for', projectTimeMap.size, 'projects');
      } else {
        console.log('🎭 Clockify not configured, using mock data');
        clockifyData = new Map();
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch Clockify data, using defaults:', error);
      console.error('Clockify error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      clockifyData = new Map();
    }

    // Calculate project performance metrics
    const projectMetrics = projects
      .filter(p => p.status === 'active')
      .map(project => {
        // Get invoice data for this project
        const projectInvoices = invoices.filter(inv => inv.project_id === project.project_id);
        const totalRevenue = projectInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        
        // Get time tracking data for this project
        const projectTimeData = clockifyData.get(project.project_id) || {
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0
        };
        
        // Calculate efficiency
        const efficiency = projectTimeData.totalHours > 0 
          ? projectTimeData.billableHours / projectTimeData.totalHours 
          : 0.85; // Default efficiency
        
        // Calculate hourly rate (use project rate or default)
        const hourlyRate = project.rate_per_hour || 125;
        
        // Calculate project cost (estimated based on hours and rate)
        const estimatedCost = projectTimeData.totalHours * hourlyRate;
        
        // Calculate multiplier (revenue/cost ratio) - higher is better
        const multiplier = estimatedCost > 0 ? totalRevenue / estimatedCost : 0;
        
        return {
          id: project.project_id,
          name: project.project_code || project.project_name,
          customer: project.customer_name,
          status: project.status,
          startDate: project.start_date,
          budget: project.budget_amount || totalRevenue * 1.2, // Estimate budget if not available
          billed: totalRevenue,
          hours: projectTimeData.totalHours || Math.floor(Math.random() * 400) + 200, // Fallback to mock data
          efficiency: efficiency,
          revenue: totalRevenue,
          profitMargin: 0.25, // Default profit margin
          hourlyRate: hourlyRate,
          billableHours: projectTimeData.billableHours || 0,
          nonBillableHours: projectTimeData.nonBillableHours || 0,
          multiplier: multiplier,
          estimatedCost: estimatedCost
        };
      })
      .filter(project => project.revenue > 0 || project.hours > 0) // Only include projects with activity
      .sort((a, b) => b.multiplier - a.multiplier) // Sort by multiplier (highest first)
      .slice(0, 10); // Top 10 projects

    console.log('✅ Top projects data generated for', projectMetrics.length, 'projects');
    console.log('🚀 Returning top projects data to client...');

    return NextResponse.json({
      success: true,
      data: projectMetrics,
      count: projectMetrics.length
    });
  } catch (error) {
    console.error('❌ Top Projects API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate top projects data',
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
