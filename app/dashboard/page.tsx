'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus, DollarSign, Users, Calendar, Target, PieChart, Building2, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AdminOnly from '@/components/AdminOnly';

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
  efficiency: number;
  
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
  budgetUtilization: number;
  schedulePerformance: number;
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
    completion: number;
  }[];
  
  // Forecasting
  projectedCompletion: string;
  projectedFinalCost: number;
  projectedProfit: number;
  projectedMargin: number;
}

interface Project {
  project_id: string;
  project_name: string;
  customer_name: string;
  status: string;
  budget_amount?: number;
}

function DashboardPageContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setError(null);
        await Promise.all([
          fetchDashboardData(),
          fetchProjects()
        ]);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        setError('Failed to initialize dashboard. Please refresh the page.');
      }
    };
    
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectMetrics(selectedProjectId);
    } else {
      setProjectMetrics(null);
    }
  }, [selectedProjectId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setProjects(data.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please check your connection and try again.');
    }
  };

  const fetchProjectMetrics = async (projectId: string) => {
    try {
      setProjectLoading(true);
      const response = await fetch(`/api/dashboard/project/${projectId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setProjectMetrics(data);
    } catch (error) {
      console.error('Error fetching project metrics:', error);
      setError('Failed to load project metrics. Please try selecting a different project.');
      // Set a default project metrics object to prevent crashes
      setProjectMetrics({
        projectId,
        projectName: 'Unknown Project',
        customerName: 'Unknown Customer',
        status: 'unknown',
        startDate: new Date().toISOString().split('T')[0],
        totalBudget: 0,
        totalBilled: 0,
        totalUnbilled: 0,
        totalCollected: 0,
        outstandingAmount: 0,
        profitMargin: 0,
        grossProfit: 0,
        currentMultiplier: 0,
        historicalMultipliers: [],
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        efficiency: 0,
        employeeBreakdown: [],
        timeEntries: [],
        cashBasis: {
          totalCollected: 0,
          outstandingReceivables: 0,
          totalRevenue: 0
        },
        accrualBasis: {
          totalEarned: 0,
          totalExpenses: 0,
          netIncome: 0,
          workInProgress: 0
        },
        budgetUtilization: 0,
        schedulePerformance: 0,
        profitabilityTrend: 'stable' as const,
        riskLevel: 'low' as const,
        changeOrders: {
          count: 0,
          totalValue: 0,
          approvedValue: 0,
          pendingValue: 0
        },
        phases: [],
        projectedCompletion: new Date().toISOString().split('T')[0],
        projectedFinalCost: 0,
        projectedProfit: 0,
        projectedMargin: 0
      });
    } finally {
      setProjectLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Dashboard Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Financial Dashboard</h1>
          <p className="text-gray-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Home
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Financial Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive financial metrics and performance indicators
              </p>
            </div>
            <div className="flex space-x-3">
              <Badge variant="outline" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                Financial Analytics
              </Badge>
            </div>
          </div>
        </div>

        {/* Project Selection */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label htmlFor="project-select" className="text-sm font-medium text-gray-700">
              Select Project:
            </label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => {
                try {
                  const newProjectId = e.target.value;
                  console.log('Project selection changed to:', newProjectId);
                  setSelectedProjectId(newProjectId);
                } catch (error) {
                  console.error('Error in project selection change:', error);
                  // Reset to safe state
                  setSelectedProjectId('');
                  setProjectMetrics(null);
                }
              }}
              className="block w-80 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Projects (Company Overview)</option>
              {Array.isArray(projects) && projects.map((project) => (
                <option key={project?.project_id || 'unknown'} value={project?.project_id || ''}>
                  {project?.project_name || 'Unknown Project'} - {project?.customer_name || 'Unknown Customer'}
                </option>
              ))}
            </select>
            {projectLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading project data...
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Dashboard Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setError(null);
                      window.location.reload();
                    }}
                    className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            {selectedProjectId && <TabsTrigger value="project">Project Details</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">YTD Profit</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics?.ytdProfit || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    vs {formatCurrency(metrics?.lastYearYtdProfit || 0)} last year
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(metrics?.currentYearGrossMargin || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    vs {formatPercentage(metrics?.lastYearGrossMargin || 0)} last year
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(metrics?.utilizationRate || 0)}</div>
                  <Progress value={(metrics?.utilizationRate || 0) * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalActiveProjects || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.totalEmployees || 0} employees
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Multipliers and Overhead */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Multipliers</CardTitle>
                  <CardDescription>Project multipliers by year</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Current Year</span>
                    <Badge variant="default">{metrics?.currentYearMultiplier.toFixed(1) || 'N/A'}x</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Year</span>
                    <Badge variant="secondary">{metrics?.lastYearMultiplier.toFixed(1) || 'N/A'}x</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Two Years Ago</span>
                    <Badge variant="outline">{metrics?.twoYearsAgoMultiplier.toFixed(1) || 'N/A'}x</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overhead Rates</CardTitle>
                  <CardDescription>Overhead rates by year</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Current Year</span>
                    <Badge variant="default">{formatPercentage(metrics?.currentYearOverhead || 0)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Year</span>
                    <Badge variant="secondary">{formatPercentage(metrics?.lastYearOverhead || 0)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Two Years Ago</span>
                    <Badge variant="outline">{formatPercentage(metrics?.twoYearsAgoOverhead || 0)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profitability" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profit Metrics</CardTitle>
                  <CardDescription>Year-to-date profitability analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>YTD Operating Income</span>
                    <span className="font-semibold">{formatCurrency(metrics?.ytdOperatingIncome || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Year YTD Operating Income</span>
                    <span className="font-semibold">{formatCurrency(metrics?.lastYearYtdOperatingIncome || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Revenue per Employee</span>
                    <span className="font-semibold">{formatCurrency(metrics?.currentYearRevenuePerEmployee || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Retention</CardTitle>
                  <CardDescription>Client retention and project metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Client Retention Rate</span>
                    <Badge variant="default">{formatPercentage(metrics?.clientRetentionRate || 0)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Project Size</span>
                    <span className="font-semibold">{formatCurrency(metrics?.averageProjectSize || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Billing Rate</span>
                    <span className="font-semibold">{formatCurrency(metrics?.averageBillingRate || 0)}/hr</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cashflow Overview</CardTitle>
                  <CardDescription>Current cashflow status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Current Cashflow</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{formatCurrency(metrics?.currentCashflow || 0)}</span>
                      {getTrendIcon(metrics?.cashflowTrend || 'stable')}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Previous Month</span>
                    <span className="font-semibold">{formatCurrency(metrics?.previousMonthCashflow || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invoice Status</CardTitle>
                  <CardDescription>Outstanding invoices and payment metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Overdue Invoices</span>
                    <span className="font-semibold text-red-600">{formatCurrency(metrics?.overdueInvoiceValue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Outstanding</span>
                    <span className="font-semibold">{formatCurrency(metrics?.totalOutstandingInvoices || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Avg Days to Payment</span>
                    <span className="font-semibold">{metrics?.averageDaysToPayment || 0} days</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trailing 12 Months</CardTitle>
                  <CardDescription>Revenue and profit trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics?.trailing12Months?.slice(-6).map((month, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{month.month}</span>
                        <div className="flex items-center space-x-4">
                          <span>{formatCurrency(month.revenue)}</span>
                          <Badge variant={month.profitMargin > 0.2 ? "default" : "secondary"}>
                            {formatPercentage(month.profitMargin)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>6-Month Forecast</CardTitle>
                  <CardDescription>Projected revenue and expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics?.forecast?.map((month, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{month.month}</span>
                        <div className="flex items-center space-x-4">
                          <span>{formatCurrency(month.projectedRevenue)}</span>
                          <Badge variant="outline">
                            {formatCurrency(month.projectedProfit)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {selectedProjectId && projectMetrics && (
            <TabsContent value="project" className="space-y-6">
              {/* Project Header */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{projectMetrics?.projectName || 'Unknown Project'}</h2>
                    <p className="text-gray-600">{projectMetrics?.customerName || 'Unknown Customer'}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge variant={projectMetrics?.status === 'active' ? 'default' : 'secondary'}>
                        {projectMetrics?.status || 'unknown'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {projectMetrics?.startDate ? new Date(projectMetrics.startDate).toLocaleDateString() : 'Unknown Date'}
                        {projectMetrics?.endDate && ` - ${new Date(projectMetrics.endDate).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(projectMetrics?.totalBudget || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Total Budget</div>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Multiplier</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(projectMetrics?.currentMultiplier || 0).toFixed(1)}x</div>
                    <p className="text-xs text-muted-foreground">
                      {projectMetrics?.profitabilityTrend === 'improving' && '↗ Improving'}
                      {projectMetrics?.profitabilityTrend === 'declining' && '↘ Declining'}
                      {projectMetrics?.profitabilityTrend === 'stable' && '→ Stable'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage(projectMetrics?.efficiency || 0)}</div>
                    <p className="text-xs text-muted-foreground">
                      {projectMetrics?.billableHours || 0}h billable / {projectMetrics?.totalHours || 0}h total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage((projectMetrics?.budgetUtilization || 0) / 100)}</div>
                    <Progress value={projectMetrics?.budgetUtilization || 0} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                    {projectMetrics?.riskLevel === 'low' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {projectMetrics?.riskLevel === 'medium' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    {projectMetrics?.riskLevel === 'high' && <XCircle className="h-4 w-4 text-red-600" />}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize">{projectMetrics?.riskLevel || 'unknown'}</div>
                    <p className="text-xs text-muted-foreground">
                      {projectMetrics?.schedulePerformance || 0}% schedule performance
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                    <CardDescription>Cash vs Accrual basis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Cash Basis</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Collected</span>
                            <span className="font-semibold">{formatCurrency(projectMetrics?.cashBasis?.totalCollected || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Outstanding</span>
                            <span className="font-semibold">{formatCurrency(projectMetrics?.cashBasis?.outstandingReceivables || 0)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Accrual Basis</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Earned</span>
                            <span className="font-semibold">{formatCurrency(projectMetrics?.accrualBasis?.totalEarned || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Work in Progress</span>
                            <span className="font-semibold">{formatCurrency(projectMetrics?.accrualBasis?.workInProgress || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Gross Profit</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(projectMetrics?.grossProfit || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Profit Margin</span>
                        <span className="text-sm font-semibold">{formatPercentage(projectMetrics?.profitMargin || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Employee Analysis</CardTitle>
                    <CardDescription>Hours and efficiency by employee</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {projectMetrics?.employeeBreakdown?.map((employee, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{employee?.employeeName || 'Unknown Employee'}</div>
                            <div className="text-xs text-gray-500">
                              {employee?.billableHours || 0}h billable / {employee?.totalHours || 0}h total
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(employee?.billableValue || 0)}</div>
                            <div className="text-xs text-gray-500">
                              {formatPercentage(employee?.efficiency || 0)} efficient
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!projectMetrics?.employeeBreakdown || projectMetrics.employeeBreakdown.length === 0) && (
                        <div className="text-center text-gray-500 py-4">
                          No employee data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Project Phases */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Phases</CardTitle>
                  <CardDescription>Architectural/Engineering phase breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projectMetrics?.phases?.map((phase, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{phase?.phaseName || 'Unknown Phase'}</h4>
                          <Badge variant={(phase?.completion || 0) === 100 ? 'default' : 'secondary'}>
                            {phase?.completion || 0}% Complete
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Budget:</span>
                            <div className="font-semibold">{formatCurrency(phase?.budget || 0)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Actual Cost:</span>
                            <div className="font-semibold">{formatCurrency(phase?.actualCost || 0)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Hours:</span>
                            <div className="font-semibold">{phase?.hours || 0}h</div>
                          </div>
                        </div>
                        <Progress value={phase?.completion || 0} className="mt-2" />
                      </div>
                    ))}
                    {(!projectMetrics?.phases || projectMetrics.phases.length === 0) && (
                      <div className="text-center text-gray-500 py-4">
                        No phase data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Change Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>Change Orders</CardTitle>
                  <CardDescription>Additional scope and value</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{projectMetrics?.changeOrders?.count || 0}</div>
                      <div className="text-sm text-gray-600">Total Changes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(projectMetrics?.changeOrders?.totalValue || 0)}</div>
                      <div className="text-sm text-gray-600">Total Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(projectMetrics?.changeOrders?.approvedValue || 0)}</div>
                      <div className="text-sm text-gray-600">Approved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{formatCurrency(projectMetrics?.changeOrders?.pendingValue || 0)}</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Forecasting */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Forecasting</CardTitle>
                  <CardDescription>Projected completion and final metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Projected Completion</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Target Date:</span>
                          <span className="font-semibold">{projectMetrics?.projectedCompletion ? new Date(projectMetrics.projectedCompletion).toLocaleDateString() : 'Unknown Date'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Projected Final Cost:</span>
                          <span className="font-semibold">{formatCurrency(projectMetrics?.projectedFinalCost || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Projected Profit:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(projectMetrics?.projectedProfit || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Projected Margin:</span>
                          <span className="font-semibold">{formatPercentage(projectMetrics?.projectedMargin || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Historical Multipliers</h4>
                      <div className="space-y-2">
                        {projectMetrics?.historicalMultipliers?.map((multiplier, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold">{(multiplier?.multiplier || 0).toFixed(1)}x</div>
                              <div className="text-xs text-gray-500">{multiplier?.notes || 'No notes'}</div>
                            </div>
                            <div className="text-xs text-gray-500">{multiplier?.date ? new Date(multiplier.date).toLocaleDateString() : 'Unknown Date'}</div>
                          </div>
                        ))}
                        {(!projectMetrics?.historicalMultipliers || projectMetrics.historicalMultipliers.length === 0) && (
                          <div className="text-center text-gray-500 py-2">
                            No historical multiplier data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AdminOnly>
      <DashboardPageContent />
    </AdminOnly>
  );
}
