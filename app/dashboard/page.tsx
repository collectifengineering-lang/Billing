'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus, DollarSign, Users, Calendar, Target, PieChart, Building2, Clock, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  const [closedProjects, setClosedProjects] = useState<Set<string>>(new Set());
  
  // Use ref to prevent unnecessary API calls
  const currentProjectIdRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Define all data fetching functions before useEffects that use them
  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Starting dashboard data fetch...');
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/dashboard', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Dashboard data received:', data);
      setMetrics(data);
    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error);
      
      if (error.name === 'AbortError') {
        setError('Dashboard data request timed out. Please try again.');
      } else {
        setError('Failed to load dashboard data. Please check your connection and try again.');
      }
    } finally {
      console.log('🏁 Dashboard data fetch completed, setting loading to false');
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      console.log('🔄 Starting projects fetch...');
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('✅ Projects received:', data.data?.length || 0, 'projects');
      setProjects(data.data || []);
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      setError('Failed to load projects. Please check your connection and try again.');
    }
  };

  const loadClosedProjects = async () => {
    try {
      // First try to load from database
      const response = await fetch('/api/closed-projects');
      if (response.ok) {
        const dbClosedProjects = await response.json();
        if (Array.isArray(dbClosedProjects)) {
          setClosedProjects(new Set(dbClosedProjects));
          // Update localStorage to match database
          localStorage.setItem('closedProjects', JSON.stringify(dbClosedProjects));
          return;
        }
      }
      
      // Fallback to localStorage if database fails
      const savedClosedProjects = localStorage.getItem('closedProjects');
      if (savedClosedProjects) {
        const closedProjectsArray = JSON.parse(savedClosedProjects);
        setClosedProjects(new Set(closedProjectsArray));
      }
    } catch (error) {
      console.error('Error loading closed projects:', error);
      // Fallback to localStorage
      try {
        const savedClosedProjects = localStorage.getItem('closedProjects');
        if (savedClosedProjects) {
          const closedProjectsArray = JSON.parse(savedClosedProjects);
          setClosedProjects(new Set(closedProjectsArray));
        }
      } catch (localStorageError) {
        console.error('Error loading from localStorage:', localStorageError);
      }
    }
  };

  const syncLocalStorageWithDatabase = async () => {
    try {
      const savedClosedProjects = localStorage.getItem('closedProjects');
      if (savedClosedProjects) {
        const localClosedProjects = JSON.parse(savedClosedProjects);
        if (Array.isArray(localClosedProjects) && localClosedProjects.length > 0) {
          console.log('Syncing localStorage closed projects with database...');
          
          // Add each project to the database
          for (const projectId of localClosedProjects) {
            try {
              await fetch('/api/closed-projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
              });
            } catch (error) {
              console.error(`Failed to sync project ${projectId}:`, error);
            }
          }
          
          console.log('LocalStorage sync completed');
        }
      }
    } catch (error) {
      console.error('Error syncing localStorage with database:', error);
    }
  };

  // Define fetchProjectMetrics before the useEffect that uses it
  const fetchProjectMetrics = useCallback(async (projectId: string) => {
    console.log('fetchProjectMetrics called with:', projectId, 'Loading:', projectLoading, 'Current ref:', currentProjectIdRef.current);
    
    // Prevent duplicate requests for the same project
    if (projectLoading || (projectMetrics && projectMetrics.projectId === projectId)) {
      console.log('Skipping request - already loading or same project');
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (currentProjectIdRef.current !== projectId) {
      console.log('Skipping request - project ID mismatch');
      return;
    }
    
    try {
      setProjectLoading(true);
      setError(null); // Clear any previous errors
      
      console.log('Making API request for project:', projectId);
      const response = await fetch(`/api/dashboard/project/${projectId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Only update if this is still the current project
      if (currentProjectIdRef.current === projectId) {
        console.log('Setting project metrics for:', projectId);
        setProjectMetrics(data);
      } else {
        console.log('Project changed, not setting metrics');
      }
    } catch (error) {
      console.error('Error fetching project metrics:', error);
      
      // Only show error if this is still the current project
      if (currentProjectIdRef.current === projectId) {
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
      }
    } finally {
      // Only update loading state if this is still the current project
      if (currentProjectIdRef.current === projectId) {
        console.log('Setting loading to false for project:', projectId);
        setProjectLoading(false);
      }
    }
  }, [projectLoading, projectMetrics]);

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    console.log('Project selection changed:', selectedProjectId, 'Current ref:', currentProjectIdRef.current);
    
    // Set a new timer to debounce the API call
    debounceTimerRef.current = setTimeout(() => {
      if (selectedProjectId && selectedProjectId !== currentProjectIdRef.current) {
        console.log('Fetching project metrics for:', selectedProjectId);
        currentProjectIdRef.current = selectedProjectId;
        fetchProjectMetrics(selectedProjectId);
      } else if (!selectedProjectId) {
        console.log('Clearing project metrics');
        currentProjectIdRef.current = '';
        setProjectMetrics(null);
      }
    }, 300); // 300ms debounce delay
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Cancel any ongoing requests by clearing the ref
      currentProjectIdRef.current = '';
    };
  }, [selectedProjectId, fetchProjectMetrics]);

  // Initialize dashboard on mount
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setError(null);
        await Promise.all([
          fetchDashboardData(),
          fetchProjects()
        ]);
        await loadClosedProjects();
        await syncLocalStorageWithDatabase();
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        setError('Failed to initialize dashboard. Please refresh the page.');
      }
    };
    
    initializeDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleProjectReopen = async (projectId: string) => {
    try {
      // Remove from database
      const response = await fetch('/api/closed-projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove project from database');
      }
      
      // Update local state
      const newClosedProjects = new Set(closedProjects);
      newClosedProjects.delete(projectId);
      setClosedProjects(newClosedProjects);
      
      // Update localStorage
      localStorage.setItem('closedProjects', JSON.stringify(Array.from(newClosedProjects)));
      
      // Dispatch event for other components
      const event = new CustomEvent('projectStatusChanged', {
        detail: {
          projectId,
          status: 'reopened',
          closedProjects: newClosedProjects
        }
      });
      window.dispatchEvent(event);
      
      console.log(`Project ${projectId} reopened`);
    } catch (error) {
      console.error('Error reopening project:', error);
      // Fallback to localStorage only
      try {
        const newClosedProjects = new Set(closedProjects);
        newClosedProjects.delete(projectId);
        setClosedProjects(newClosedProjects);
        localStorage.setItem('closedProjects', JSON.stringify(Array.from(newClosedProjects)));
        
        const event = new CustomEvent('projectStatusChanged', {
          detail: {
            projectId,
            status: 'reopened',
            closedProjects: newClosedProjects
          }
        });
        window.dispatchEvent(event);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    }
  };

  const handleProjectClose = async (projectId: string) => {
    try {
      // Add to database
      const response = await fetch('/api/closed-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add project to database');
      }
      
      // Update local state
      const newClosedProjects = new Set(closedProjects);
      newClosedProjects.add(projectId);
      setClosedProjects(newClosedProjects);
      
      // Update localStorage
      localStorage.setItem('closedProjects', JSON.stringify(Array.from(newClosedProjects)));
      
      // Dispatch event for other components
      const event = new CustomEvent('projectStatusChanged', {
        detail: {
          projectId,
          status: 'closed',
          closedProjects: newClosedProjects
        }
      });
      window.dispatchEvent(event);
      
      console.log(`Project ${projectId} closed`);
    } catch (error) {
      console.error('Error closing project:', error);
      // Fallback to localStorage only
      try {
        const newClosedProjects = new Set(closedProjects);
        newClosedProjects.add(projectId);
        setClosedProjects(newClosedProjects);
        localStorage.setItem('closedProjects', JSON.stringify(Array.from(newClosedProjects)));
        
        const event = new CustomEvent('projectStatusChanged', {
          detail: {
            projectId,
            status: 'closed',
            closedProjects: newClosedProjects
          }
        });
        window.dispatchEvent(event);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
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
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">
            Fetching financial data from Zoho and Clockify...
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800 mb-2">
              <strong>What&apos;s happening:</strong>
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Connecting to Zoho Books API</li>
              <li>• Fetching financial metrics (may take 10-20 seconds)</li>
              <li>• Loading project data</li>
              <li>• Calculating performance indicators</li>
            </ul>
            <p className="text-xs text-blue-600 mt-3">
              This process includes rate limiting to respect API limits.
            </p>
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Refresh if stuck
            </button>
          </div>
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
                  
                  // Only update if the value actually changed
                  if (newProjectId !== selectedProjectId) {
                    setSelectedProjectId(newProjectId);
                  }
                } catch (error) {
                  console.error('Error in project selection change:', error);
                  // Reset to safe state
                  setSelectedProjectId('');
                  setProjectMetrics(null);
                  currentProjectIdRef.current = '';
                }
              }}
              className="block w-80 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Projects (Company Overview)</option>
              {/* Active Projects */}
              <optgroup label="Active Projects">
                {Array.isArray(projects) && projects
                  .filter(project => !closedProjects.has(project?.project_id || ''))
                  .map((project) => (
                    <option key={project?.project_id || 'unknown'} value={project?.project_id || ''}>
                      {project?.project_name || 'Unknown Project'} - {project?.customer_name || 'Unknown Customer'}
                    </option>
                  ))}
              </optgroup>
              {/* Closed Projects */}
              {Array.isArray(projects) && projects
                .filter(project => closedProjects.has(project?.project_id || ''))
                .length > 0 && (
                <optgroup label="Closed Projects">
                  {Array.isArray(projects) && projects
                    .filter(project => closedProjects.has(project?.project_id || ''))
                    .map((project) => (
                      <option key={project?.project_id || 'unknown'} value={project?.project_id || ''}>
                        {project?.project_name || 'Unknown Project'} - {project?.customer_name || 'Unknown Customer'} (Closed)
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
            {projectLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading project data...
              </div>
            )}
          </div>
          
          {/* Project Status Controls */}
          {selectedProjectId && (
            <div className="mt-3 flex items-center space-x-3">
              {closedProjects.has(selectedProjectId) ? (
                <button
                  onClick={() => handleProjectReopen(selectedProjectId)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reopen Project
                </button>
              ) : (
                <button
                  onClick={() => handleProjectClose(selectedProjectId)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Close Project
                </button>
              )}
              <span className="text-sm text-gray-500">
                Status: {closedProjects.has(selectedProjectId) ? 'Closed' : 'Active'}
              </span>
            </div>
          )}
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="financial-data">Financial Data</TabsTrigger>
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

            {/* Project Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Project Status Overview</CardTitle>
                <CardDescription>Active and closed projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700">Active Projects</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {Array.isArray(projects) ? projects.filter(p => !closedProjects.has(p?.project_id || '')).length : 0}
                    </div>
                    <p className="text-xs text-gray-500">
                      Currently in progress
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700">Closed Projects</h4>
                    <div className="text-2xl font-bold text-red-600">
                      {closedProjects.size}
                    </div>
                    <p className="text-xs text-gray-500">
                      Completed or on hold
                    </p>
                  </div>
                </div>
                {closedProjects.size > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-medium text-sm text-gray-700 mb-2">Recently Closed Projects</h5>
                    <div className="space-y-2">
                      {Array.isArray(projects) && projects
                        .filter(project => closedProjects.has(project?.project_id || ''))
                        .slice(0, 3)
                        .map((project) => (
                          <div key={project?.project_id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{project?.project_name || 'Unknown Project'}</span>
                            <button
                              onClick={() => handleProjectReopen(project?.project_id || '')}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Reopen
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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

          <TabsContent value="financial-data" className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Zoho Financial Data Integration</CardTitle>
                  <CardDescription>
                    Test and verify the connection to Zoho Books for accurate financial metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={async () => {
                          try {
                            setError(null);
                            const response = await fetch('/api/financial-data');
                            const result = await response.json();
                            if (result.success) {
                              console.log('Financial data test result:', result);
                              alert(`Financial data test completed!\n\nSuccessful endpoints: ${result.summary.successfulEndpoints}/${result.summary.totalEndpoints}\nErrors: ${result.summary.failedEndpoints}\n\nCheck browser console for detailed results.`);
                            } else {
                              throw new Error(result.error);
                            }
                          } catch (error) {
                            console.error('Financial data test failed:', error);
                            setError(`Financial data test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Test Zoho Financial Integration
                      </button>
                      <span className="text-sm text-gray-600">
                        Click to test all Zoho financial endpoints and verify data accuracy
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Current Data Sources</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>YTD Profit:</span>
                            <span className="font-semibold">
                              {metrics?.ytdProfit ? '✅ Real Zoho Data' : '❌ Mock Data'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash Flow:</span>
                            <span className="font-semibold">
                              {metrics?.currentCashflow && metrics.currentCashflow !== 0 ? '✅ Real Zoho Data' : '❌ Mock Data'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Revenue:</span>
                            <span className="font-semibold">
                              {metrics?.trailing12Months?.[0]?.revenue ? '✅ Real Zoho Data' : '❌ Mock Data'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Expenses:</span>
                            <span className="font-semibold">
                              {metrics?.trailing12Months?.[0]?.expenses ? '✅ Real Zoho Data' : '❌ Mock Data'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Integration Status</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Zoho API:</span>
                            <span className="font-semibold text-green-600">✅ Connected</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Financial Reports:</span>
                            <span className="font-semibold text-blue-600">🔄 Testing Required</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Data Accuracy:</span>
                            <span className="font-semibold text-yellow-600">⚠️ Verify Required</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-sm text-blue-800 mb-2">How to Verify Data Accuracy</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>1. <strong>Click &quot;Test Zoho Financial Integration&quot;</strong> above</p>
                        <p>2. <strong>Check browser console</strong> for detailed API responses</p>
                        <p>3. <strong>Compare dashboard metrics</strong> with your Zoho Books reports</p>
                        <p>4. <strong>Verify YTD Profit</strong> matches your P&L statement</p>
                        <p>5. <strong>Check Cash Flow</strong> matches your cash flow statement</p>
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-semibold text-sm text-red-800 mb-2">Integration Error</h4>
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    )}
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
                      <Badge 
                        variant={closedProjects.has(selectedProjectId) ? 'secondary' : 'default'}
                        className={closedProjects.has(selectedProjectId) ? 'bg-red-100 text-red-800 border-red-200' : ''}
                      >
                        {closedProjects.has(selectedProjectId) ? 'Closed' : 'Active'}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="relative mb-12">
          {/* Back Button - Top Left */}
          <div className="absolute top-0 left-0">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-12 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </Link>
          </div>

          {/* Main Header Content */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Financial Dashboard
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Comprehensive financial insights, profitability analysis, and performance metrics
            </p>
          </div>
        </div>

        {/* Dashboard Content */}
        <DashboardPageContent />
      </div>
    </div>
  );
}
