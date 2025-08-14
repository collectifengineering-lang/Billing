import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '@/lib/zoho';
import clockifyService from '@/lib/clockify';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    
    // Check Clockify service configuration
    const clockifyConfig = clockifyService.getConfigurationStatus();
    console.log('Clockify service configuration for project metrics:', clockifyConfig);
    
    // Get project details from Zoho
    let projects: any[] = [];
    let project: any = null;
    
    try {
      projects = await zohoService.getProjects();
      project = projects.find(p => p.project_id === projectId);
    } catch (error) {
      console.error('Failed to fetch projects from Zoho:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project data from Zoho' },
        { status: 500 }
      );
    }
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get employee data from Clockify (if configured) or use mock data
    let employeeBreakdown: any[] = [];
    let timeEntries: any[] = [];
    let totalHours = 0;
    let billableHours = 0;
    
    try {
      if (clockifyConfig.configured) {
        // Try to get real data from Clockify
        try {
          // Get workspace ID first
          const workspaces = await clockifyService.getWorkspaces();
          if (workspaces.length === 0) {
            throw new Error('No workspaces available');
          }
          
          const users = await clockifyService.getUsers(workspaces[0].id);
          const projectTimeEntries = await clockifyService.getTimeEntries(
            projectId,
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Last year
            new Date().toISOString()
          );
          
          // Process real Clockify data
          employeeBreakdown = users.map(user => {
            const userEntries = projectTimeEntries.filter(entry => entry.userId === user.id);
            const userHours = userEntries.reduce((sum, entry) => {
              const duration = entry.timeInterval?.duration || 'PT0H';
              return sum + parseDuration(duration);
            }, 0);
            
            const userBillableHours = userEntries.filter(entry => entry.billable).reduce((sum, entry) => {
              const duration = entry.timeInterval?.duration || 'PT0H';
              return sum + parseDuration(duration);
            }, 0);
            
            // Get hourly rate from user's time entries or use default
            const userHourlyRate = userEntries.length > 0 
              ? (typeof userEntries[0]?.hourlyRate === 'object' ? userEntries[0].hourlyRate.amount : (userEntries[0]?.hourlyRate || 150))
              : 150;
            
            return {
              employeeId: user.id,
              employeeName: user.name,
              totalHours: userHours,
              billableHours: userBillableHours,
              hourlyRate: userHourlyRate,
              totalCost: userHours * userHourlyRate,
              billableValue: userBillableHours * userHourlyRate,
              efficiency: userHours > 0 ? userBillableHours / userHours : 0
            };
          });
          
          timeEntries = projectTimeEntries.map(entry => ({
            date: entry.timeInterval?.start || new Date().toISOString(),
            employeeName: entry.userName || 'Unknown User',
            hours: parseDuration(entry.timeInterval?.duration || 'PT0H'),
            billableHours: entry.billable ? parseDuration(entry.timeInterval?.duration || 'PT0H') : 0,
            description: entry.description || 'No description',
            hourlyRate: typeof entry.hourlyRate === 'object' ? entry.hourlyRate.amount : (entry.hourlyRate || 150),
            totalValue: parseDuration(entry.timeInterval?.duration || 'PT0H') * (typeof entry.hourlyRate === 'object' ? entry.hourlyRate.amount : (entry.hourlyRate || 150))
          }));
          
          totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
          billableHours = timeEntries.reduce((sum, entry) => sum + entry.billableHours, 0);
          
        } catch (clockifyError) {
          console.warn('Failed to fetch Clockify data for project, using mock data:', clockifyError);
          // Fall back to mock data
          employeeBreakdown = generateMockEmployeeData();
          timeEntries = generateMockTimeEntries();
          totalHours = 120;
          billableHours = 96;
        }
      } else {
        console.log('Clockify not configured - using mock data for project metrics');
        employeeBreakdown = generateMockEmployeeData();
        timeEntries = generateMockTimeEntries();
        totalHours = 120;
        billableHours = 96;
      }
    } catch (error) {
      console.warn('Error processing employee/time data, using defaults:', error);
      employeeBreakdown = generateMockEmployeeData();
      timeEntries = generateMockTimeEntries();
      totalHours = 120;
      billableHours = 96;
    }

    // Calculate project metrics
    const efficiency = totalHours > 0 ? billableHours / totalHours : 0;
    const nonBillableHours = totalHours - billableHours;
    
    // Mock financial data (in real implementation, this would come from your accounting system)
    const totalBudget = project.budget_amount || 50000;
    const totalBilled = totalBudget * 0.6;
    const totalUnbilled = totalBudget * 0.4;
    const totalCollected = totalBilled * 0.8;
    const outstandingAmount = totalBilled - totalCollected;
    const profitMargin = 0.25;
    const grossProfit = totalBudget * profitMargin;
    
    // Mock multiplier data
    const currentMultiplier = 2.8;
    const historicalMultipliers = [
      { date: '2024-01-01', multiplier: 2.6, notes: 'Q1 2024' },
      { date: '2024-04-01', multiplier: 2.7, notes: 'Q2 2024' },
      { date: '2024-07-01', multiplier: 2.8, notes: 'Q3 2024' }
    ];
    
    // Mock cash vs accrual data
    const cashBasis = {
      totalCollected,
      outstandingReceivables: outstandingAmount,
      totalRevenue: totalCollected
    };
    
    const accrualBasis = {
      totalEarned: totalBilled,
      totalExpenses: totalBilled * 0.75,
      netIncome: totalBilled * 0.25,
      workInProgress: totalUnbilled
    };
    
    // Mock project health indicators
    const budgetUtilization = (totalBilled / totalBudget) * 100;
    const schedulePerformance = 85;
    const profitabilityTrend = 'improving' as const;
    const riskLevel = budgetUtilization > 80 ? 'medium' : 'low' as const;
    
    // Mock change orders
    const changeOrders = {
      count: 2,
      totalValue: 5000,
      approvedValue: 3000,
      pendingValue: 2000
    };
    
    // Mock project phases
    const phases = [
      { phaseName: 'Design', budget: 15000, actualCost: 12000, hours: 40, completion: 100 },
      { phaseName: 'Engineering', budget: 20000, actualCost: 18000, hours: 60, completion: 90 },
      { phaseName: 'Construction Admin', budget: 15000, actualCost: 8000, hours: 20, completion: 50 }
    ];
    
    // Mock forecasting data
    const projectedCompletion = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const projectedFinalCost = totalBudget * 1.1;
    const projectedProfit = projectedFinalCost * profitMargin;
    const projectedMargin = profitMargin;
    
    const projectMetrics = {
      projectId,
      projectName: project.project_name || 'Unknown Project',
      customerName: project.customer_name || 'Unknown Customer',
      status: project.status || 'unknown',
      startDate: project.created_time ? new Date(project.created_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: project.last_modified_time ? new Date(project.last_modified_time).toISOString().split('T')[0] : undefined,
      totalBudget,
      totalBilled,
      totalUnbilled,
      totalCollected,
      outstandingAmount,
      profitMargin,
      grossProfit,
      currentMultiplier,
      historicalMultipliers,
      totalHours,
      billableHours,
      nonBillableHours,
      efficiency,
      employeeBreakdown,
      timeEntries,
      cashBasis,
      accrualBasis,
      budgetUtilization,
      schedulePerformance,
      profitabilityTrend,
      riskLevel,
      changeOrders,
      phases,
      projectedCompletion,
      projectedFinalCost,
      projectedProfit,
      projectedMargin
    };

    return NextResponse.json(projectMetrics);
  } catch (error) {
    console.error('Project metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate project metrics' },
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

// Generate mock employee data
function generateMockEmployeeData() {
  return [
    {
      employeeId: 'emp-1',
      employeeName: 'John Smith',
      totalHours: 40,
      billableHours: 32,
      hourlyRate: 150,
      totalCost: 6000,
      billableValue: 4800,
      efficiency: 0.8
    },
    {
      employeeId: 'emp-2',
      employeeName: 'Jane Doe',
      totalHours: 35,
      billableHours: 28,
      hourlyRate: 175,
      totalCost: 6125,
      billableValue: 4900,
      efficiency: 0.8
    },
    {
      employeeId: 'emp-3',
      employeeName: 'Mike Johnson',
      totalHours: 45,
      billableHours: 36,
      hourlyRate: 125,
      totalCost: 5625,
      billableValue: 4500,
      efficiency: 0.8
    }
  ];
}

// Generate mock time entries
function generateMockTimeEntries() {
  const entries = [];
  const employees = ['John Smith', 'Jane Doe', 'Mike Johnson'];
  const descriptions = ['Design review', 'Engineering calculations', 'Site visit', 'Client meeting', 'Documentation'];
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const hours = 2 + Math.random() * 6;
    const billableHours = Math.random() > 0.2 ? hours : 0;
    
    entries.push({
      date: date.toISOString(),
      employeeName: employees[Math.floor(Math.random() * employees.length)],
      hours,
      billableHours,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      hourlyRate: 150 + Math.random() * 50,
      totalValue: hours * (150 + Math.random() * 50)
    });
  }
  
  return entries;
}
