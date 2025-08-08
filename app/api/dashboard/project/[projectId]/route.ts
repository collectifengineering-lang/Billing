import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '../../../../../lib/zoho';
import { clockifyService } from '../../../../../lib/clockify';
import { payrollService } from '../../../../../lib/payroll';

interface ProjectMetrics {
  // Basic Project Info
  projectId: string;
  projectName: string;
  customerName: string;
  status: string;
  startDate: string;
  endDate?: string;
  
  // Financial Metrics
  totalBudget: number;
  totalBilled: number;
  totalUnbilled: number;
  totalCollected: number;
  outstandingAmount: number;
  profitMargin: number;
  grossProfit: number;
  
  // Multiplier Analysis
  currentMultiplier: number;
  historicalMultipliers: {
    date: string;
    multiplier: number;
    notes?: string;
  }[];
  
  // Hours Analysis
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  efficiency: number; // billable hours / total hours
  
  // Employee Analysis
  employeeBreakdown: {
    employeeId: string;
    employeeName: string;
    totalHours: number;
    billableHours: number;
    hourlyRate: number;
    totalCost: number;
    billableValue: number;
    efficiency: number;
  }[];
  
  // Time Tracking
  timeEntries: {
    date: string;
    employeeName: string;
    hours: number;
    billableHours: number;
    description?: string;
    hourlyRate: number;
    totalValue: number;
  }[];
  
  // Cash vs Accrual
  cashBasis: {
    totalCollected: number;
    outstandingReceivables: number;
    totalRevenue: number;
  };
  
  accrualBasis: {
    totalEarned: number;
    totalExpenses: number;
    netIncome: number;
    workInProgress: number;
  };
  
  // Project Health Indicators
  budgetUtilization: number; // percentage of budget used
  schedulePerformance: number; // percentage of time elapsed vs progress
  profitabilityTrend: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  
  // Architectural/Engineering Specific Metrics
  changeOrders: {
    count: number;
    totalValue: number;
    approvedValue: number;
    pendingValue: number;
  };
  
  phases: {
    phaseName: string;
    budget: number;
    actualCost: number;
    hours: number;
    completion: number; // percentage
  }[];
  
  // Forecasting
  projectedCompletion: string;
  projectedFinalCost: number;
  projectedProfit: number;
  projectedMargin: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    
    // Get project details from Zoho
    const projects = await zohoService.getProjects();
    const project = projects.find(p => p.project_id === projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Get employees for cost calculations
    const employees = await payrollService.getAllEmployees();
    
    // Get Clockify time entries for this project
    let timeEntries: any[] = [];
    let employeeBreakdown: any[] = [];
    let totalHours = 0;
    let billableHours = 0;
    
    try {
      // Get Clockify project mapping
      const clockifyProjects = await clockifyService.getProjects();
      const clockifyProject = clockifyProjects.find(cp => 
        cp.name.toLowerCase().includes(project.project_name.toLowerCase()) ||
        cp.name.toLowerCase().includes(project.customer_name.toLowerCase())
      );
      
             if (clockifyProject) {
         const entries = await clockifyService.getProjectTimeEntries(
           clockifyProject.id,
           new Date(2024, 0, 1).toISOString(),
           new Date().toISOString()
         );
        
                 timeEntries = entries.map(entry => {
           // For now, use a simple mapping - in production, you'd get user details
           const employee = employees.find(emp =>
             emp.name.toLowerCase().includes('john') // Default mapping
           );
           
           const hours = entry.timeInterval.duration ?
             parseDuration(entry.timeInterval.duration) / 3600000 : 0;
           const entryBillableHours = entry.billable ? hours : 0;
           const hourlyRate = 150; // Default rate - in production, get from EmployeeSalary
           const totalValue = entryBillableHours * hourlyRate;
           
           totalHours += hours;
           billableHours += entryBillableHours;
           
           return {
             date: entry.timeInterval.start,
             employeeName: 'John Doe', // Default name for now
             hours,
             billableHours: entryBillableHours,
             description: entry.description,
             hourlyRate,
             totalValue
           };
         });
        
        // Calculate employee breakdown
        const employeeMap = new Map();
        timeEntries.forEach(entry => {
          const existing = employeeMap.get(entry.employeeName) || {
            employeeId: '',
            employeeName: entry.employeeName,
            totalHours: 0,
            billableHours: 0,
            hourlyRate: entry.hourlyRate,
            totalCost: 0,
            billableValue: 0,
            efficiency: 0
          };
          
          existing.totalHours += entry.hours;
          existing.billableHours += entry.billableHours;
          existing.totalCost += entry.hours * entry.hourlyRate;
          existing.billableValue += entry.totalValue;
          
          employeeMap.set(entry.employeeName, existing);
        });
        
        employeeBreakdown = Array.from(employeeMap.values()).map(emp => ({
          ...emp,
          efficiency: emp.totalHours > 0 ? emp.billableHours / emp.totalHours : 0
        }));
      }
    } catch (error) {
      console.log('Clockify data not available, using mock data');
      
      // Mock data for demonstration
      totalHours = 120;
      billableHours = 100;
      employeeBreakdown = [
        {
          employeeId: 'emp_1',
          employeeName: 'John Doe',
          totalHours: 40,
          billableHours: 35,
          hourlyRate: 150,
          totalCost: 6000,
          billableValue: 5250,
          efficiency: 0.875
        },
        {
          employeeId: 'emp_2',
          employeeName: 'Jane Smith',
          totalHours: 80,
          billableHours: 65,
          hourlyRate: 175,
          totalCost: 14000,
          billableValue: 11375,
          efficiency: 0.813
        }
      ];
    }
    
    // Calculate financial metrics
    const totalBudget = project.budget_amount || 100000;
    const totalBilled = totalBudget * 0.75; // Mock data
    const totalUnbilled = totalBudget - totalBilled;
    const totalCollected = totalBilled * 0.9; // Mock data
    const outstandingAmount = totalBilled - totalCollected;
    
    const totalCost = employeeBreakdown.reduce((sum, emp) => sum + emp.totalCost, 0);
    const grossProfit = totalBilled - totalCost;
    const profitMargin = totalBilled > 0 ? grossProfit / totalBilled : 0;
    
    // Calculate multipliers
    const currentMultiplier = totalBilled > 0 ? totalBilled / totalCost : 2.5;
    const historicalMultipliers = [
      { date: '2024-01-01', multiplier: 2.3, notes: 'Initial project setup' },
      { date: '2024-03-01', multiplier: 2.5, notes: 'Design phase' },
      { date: '2024-06-01', multiplier: currentMultiplier, notes: 'Current' }
    ];
    
    // Calculate efficiency
    const efficiency = totalHours > 0 ? billableHours / totalHours : 0;
    
    // Cash vs Accrual calculations
    const cashBasis = {
      totalCollected,
      outstandingReceivables: outstandingAmount,
      totalRevenue: totalCollected
    };
    
    const accrualBasis = {
      totalEarned: totalBilled,
      totalExpenses: totalCost,
      netIncome: grossProfit,
      workInProgress: totalUnbilled
    };
    
    // Project health indicators
    const budgetUtilization = totalBudget > 0 ? (totalCost / totalBudget) * 100 : 0;
    const schedulePerformance = 75; // Mock data - would be calculated based on timeline
    const profitabilityTrend: 'improving' | 'declining' | 'stable' = 
      currentMultiplier > 2.5 ? 'improving' : currentMultiplier < 2.0 ? 'declining' : 'stable';
    const riskLevel: 'low' | 'medium' | 'high' = 
      budgetUtilization > 90 ? 'high' : budgetUtilization > 70 ? 'medium' : 'low';
    
    // Change orders
    const changeOrders = {
      count: 3,
      totalValue: 15000,
      approvedValue: 12000,
      pendingValue: 3000
    };
    
    // Project phases
    const phases = [
      {
        phaseName: 'Schematic Design',
        budget: 25000,
        actualCost: 22000,
        hours: 40,
        completion: 100
      },
      {
        phaseName: 'Design Development',
        budget: 35000,
        actualCost: 32000,
        hours: 60,
        completion: 90
      },
      {
        phaseName: 'Construction Documents',
        budget: 40000,
        actualCost: 28000,
        hours: 20,
        completion: 70
      }
    ];
    
    // Forecasting
    const projectedCompletion = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const projectedFinalCost = totalCost * 1.15; // 15% contingency
    const projectedProfit = totalBudget - projectedFinalCost;
    const projectedMargin = totalBudget > 0 ? projectedProfit / totalBudget : 0;
    
    const projectMetrics: ProjectMetrics = {
      // Basic Project Info
      projectId: project.project_id,
      projectName: project.project_name,
      customerName: project.customer_name,
      status: project.status,
      startDate: project.start_date,
      endDate: project.end_date,
      
      // Financial Metrics
      totalBudget,
      totalBilled,
      totalUnbilled,
      totalCollected,
      outstandingAmount,
      profitMargin,
      grossProfit,
      
      // Multiplier Analysis
      currentMultiplier,
      historicalMultipliers,
      
      // Hours Analysis
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      efficiency,
      
      // Employee Analysis
      employeeBreakdown,
      
      // Time Tracking
      timeEntries,
      
      // Cash vs Accrual
      cashBasis,
      accrualBasis,
      
      // Project Health Indicators
      budgetUtilization,
      schedulePerformance,
      profitabilityTrend,
      riskLevel,
      
      // Change Orders
      changeOrders,
      
      // Phases
      phases,
      
      // Forecasting
      projectedCompletion,
      projectedFinalCost,
      projectedProfit,
      projectedMargin
    };
    
    return NextResponse.json(projectMetrics);
  } catch (error: any) {
    console.error('Error fetching project metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project metrics' },
      { status: 500 }
    );
  }
}

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
