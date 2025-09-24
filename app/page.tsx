'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  BarChart3, 
  Zap,
  Activity,
  Award,
  Building2,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import ProjectModal from '@/components/ProjectModal';
import HighPerformanceTable from '@/components/HighPerformanceTable';
import BillingChart from '@/components/BillingChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalProjects: number;
  totalBilled: number;
  totalUnbilled: number;
  activeProjects: number;
  totalHours: number;
  billableHours: number;
  efficiency: number;
  averageHourlyRate: number;
  totalTimeValue: number;
  averageHoursPerProject: number;
  topPerformingProjects: string[];
  ytdRevenue: number;
  ytdExpenses: number;
  ytdProfit: number;
  ytdOperatingIncome: number;
  ytdGrossProfit: number;
  ytdNetProfit: number;
  ytdCashFlow: number;
}

interface ProjectData {
  id?: string;
  projectId?: string;
  name?: string;
  projectName?: string;
  customer?: string;
  customerName?: string;
  status?: 'active' | 'completed' | 'on-hold';
  startDate?: string;
  endDate?: string;
  budget?: number;
  billed?: number;
  hours?: number;
  efficiency?: number;
  revenue?: number;
  profitMargin?: number;
  multiplier?: number;
  estimatedCost?: number;
  // Clockify-specific fields
  totalHours?: number;
  billableHours?: number;
  entryCount?: number;
}

// Type alias to ensure compatibility with ProjectModal
type ProjectDetails = {
  id: string;
  name: string;
  customer: string;
  status: 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate?: string;
  budget: number;
  billed: number;
  hours: number;
  efficiency: number;
  revenue: number;
  profitMargin: number;
  multiplier?: number;
  estimatedCost?: number;
  projectId?: string;
  totalHours?: number;
  billableHours?: number;
  entryCount?: number;
};

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topProjects, setTopProjects] = useState<ProjectData[]>([]);
  const [bottomProjects, setBottomProjects] = useState<ProjectData[]>([]);
  const [selectedTab, setSelectedTab] = useState('projections-table');
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingData, setBillingData] = useState<any[]>([]);
  const [projections, setProjections] = useState<any>({});
  const [closedProjects, setClosedProjects] = useState<Set<string>>(new Set());

  // Monitor topProjects state to ensure it's always an array
  useEffect(() => {
    if (topProjects && !Array.isArray(topProjects)) {
      console.warn('topProjects is not an array, resetting to empty array:', topProjects);
      setTopProjects([]);
    }
  }, [topProjects]);

  // Monitor bottomProjects state to ensure it's always an array
  useEffect(() => {
    if (bottomProjects && !Array.isArray(bottomProjects)) {
      console.warn('bottomProjects is not an array, resetting to empty array:', bottomProjects);
      setBottomProjects([]);
    }
  }, [bottomProjects]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First, ensure database is set up
        try {
          console.log('Setting up database schema...');
          const setupResponse = await fetch('/api/setup-database', { method: 'POST' });
          if (setupResponse.ok) {
            console.log('Database setup completed');
          } else {
            console.log('Database setup failed, continuing with existing schema');
          }
        } catch (setupError) {
          console.log('Database setup error, continuing with existing schema:', setupError);
        }
        
        const [dashboardResponse, topProjectsResponse, bottomProjectsResponse, projectsResponse] = await Promise.all([
          fetch('/api/homepage-dashboard'),
          fetch('/api/top-projects'),
          fetch('/api/bottom-projects'),
          fetch('/api/projects')
        ]);

        if (!dashboardResponse.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        if (!topProjectsResponse.ok) {
          throw new Error('Failed to fetch top projects data');
        }

        if (!bottomProjectsResponse.ok) {
          throw new Error('Failed to fetch bottom projects data');
        }

        if (!projectsResponse.ok) {
          throw new Error('Failed to fetch projects data');
        }

        const dashboardData = await dashboardResponse.json();
        const topProjectsData = await topProjectsResponse.json();
        const bottomProjectsData = await bottomProjectsResponse.json();
        const projectsData = await projectsResponse.json();
        // Load closed projects from database
        let closedProjectsData = [];
        try {
          const closedProjectsResponse = await fetch('/api/closed-projects');
          if (closedProjectsResponse.ok) {
            closedProjectsData = await closedProjectsResponse.json();
          } else {
            console.warn('Failed to fetch closed projects from database, using empty array');
            closedProjectsData = [];
          }
        } catch (error) {
          console.warn('Error fetching closed projects from database:', error);
          closedProjectsData = [];
        }

        // Validate and set dashboard stats
        if (dashboardData && typeof dashboardData === 'object') {
          setStats(dashboardData);
        } else {
          console.warn('Invalid dashboard data received:', dashboardData);
          setStats(null);
        }

        // Validate and set top projects with proper error handling
        console.log('Raw topProjectsData:', topProjectsData);
        if (topProjectsData && topProjectsData.success && topProjectsData.data && Array.isArray(topProjectsData.data.topProjects)) {
          console.log('Setting topProjects:', topProjectsData.data.topProjects);
          setTopProjects(topProjectsData.data.topProjects);
        } else {
          console.warn('Invalid topProjects data received, setting empty array:', topProjectsData);
          setTopProjects([]);
        }

        // Validate and set bottom projects with proper error handling
        console.log('Raw bottomProjectsData:', bottomProjectsData);
        if (bottomProjectsData && bottomProjectsData.success && bottomProjectsData.data && Array.isArray(bottomProjectsData.data.bottomProjects)) {
          console.log('Setting bottomProjects:', bottomProjectsData.data.bottomProjects);
          setBottomProjects(bottomProjectsData.data.bottomProjects);
        } else {
          console.warn('Invalid bottomProjects data received, setting empty array:', bottomProjectsData);
          setBottomProjects([]);
        }

        // Set closed projects from database
        if (Array.isArray(closedProjectsData)) {
          setClosedProjects(new Set(closedProjectsData));
          console.log('Loaded closed projects from database:', closedProjectsData);
        } else {
          console.warn('Invalid closed projects data received, using empty set');
          setClosedProjects(new Set());
        }
        
        // Transform Zoho projects to billing data format
        if (projectsData.success && projectsData.data) {
          const transformedBillingData = projectsData.data.map((project: any) => ({
            projectId: project.project_id,
            projectName: project.project_name,
            customerName: project.customer_name,
            signedFee: project.signed_fee || 0,
            monthlyData: [], // Empty array for now, will be populated by projections
            totalBilled: 0,
            totalUnbilled: 0,
            totalProjected: 0,
            isClosed: false,
            projectManagerId: undefined,
            clockifyData: undefined,
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            hourlyRate: 0,
            efficiency: 0
          }));
          setBillingData(transformedBillingData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    
    // Listen for project status changes from other components
    const handleProjectStatusChange = (event: CustomEvent) => {
      const { projectId, status, closedProjects: newClosedProjects } = event.detail;
      console.log('HomePage: Received project status change:', { projectId, status, newClosedProjects });
      
      if (newClosedProjects) {
        setClosedProjects(newClosedProjects);
      }
    };

    window.addEventListener('projectStatusChanged', handleProjectStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('projectStatusChanged', handleProjectStatusChange as EventListener);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toLocaleString()}h`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const handleProjectClick = (projectId: string) => {
    if (!Array.isArray(topProjects) || !projectId) return;
    const project = topProjects.find(p => p.id === projectId || p.projectId === projectId);
    if (project) {
      // Transform the project data to match what the modal expects with safe fallbacks
      const transformedProject: ProjectDetails = {
        id: project.id || project.projectId || projectId,
        name: project.name || project.projectName || 'Unknown Project',
        customer: project.customer || project.customerName || 'Unknown Customer',
        status: (project.status as 'active' | 'completed' | 'on-hold') || 'active',
        startDate: project.startDate || new Date().toISOString(),
        endDate: project.endDate || undefined,
        budget: Number(project.budget) || 0,
        billed: Number(project.billed) || 0,
        hours: Number(project.hours || project.totalHours) || 0,
        efficiency: Number(project.efficiency) || 0,
        revenue: Number(project.revenue) || 0,
        profitMargin: Number(project.profitMargin) || 0,
        multiplier: Number(project.multiplier) || 0,
        estimatedCost: Number(project.estimatedCost) || 0,
        projectId: project.projectId || project.id,
        totalHours: Number(project.totalHours) || 0,
        billableHours: Number(project.billableHours) || 0,
        entryCount: Number(project.entryCount) || 0
      };
      setSelectedProject(transformedProject);
      setIsModalOpen(true);
    }
  };

  const handleUpdateProjections = (newProjections: any) => {
    setProjections(newProjections);
  };



  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error || 'Failed to load dashboard data'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data for time tracking
  const timeTrackingData = [
    { name: 'Billable', value: Math.round(stats.efficiency * 100), color: '#10b981' },
    { name: 'Non-Billable', value: Math.round((1 - stats.efficiency) * 100), color: '#6b7280' }
  ];

  // Prepare chart data for top projects
  const topProjectsChartData = (Array.isArray(topProjects) ? topProjects : []).slice(0, 5).map(project => ({
    name: project.name || 'Unknown Project',
    hours: project.hours || 0,
    revenue: project.revenue || 0,
    efficiency: Math.round((project.efficiency || 0) * 100),
    multiplier: project.multiplier || 0
  }));

  // Prepare chart data for bottom projects
  const bottomProjectsChartData = (Array.isArray(bottomProjects) ? bottomProjects : []).slice(0, 5).map(project => ({
    name: project.name || 'Unknown Project',
    hours: project.hours || 0,
    revenue: project.revenue || 0,
    efficiency: Math.round((project.efficiency || 0) * 100),
    multiplier: project.multiplier || 0
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mb-12"
        >
          {/* Settings Gear - Top Right */}
          <div className="absolute top-0 right-0">
            <Link
              href="/settings"
              className="inline-flex items-center justify-center w-12 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Target className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </Link>
          </div>

          {/* Main Header Content */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Billing Dashboard
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
              Comprehensive financial insights and project performance metrics for engineering excellence
            </p>
            
            {/* Header Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Detailed Finances
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <Building2 className="h-5 w-5 mr-2" />
                Project Information
              </Link>

            </div>
          </div>
        </motion.div>

        {/* Main Tabs */}
        <Tabs 
          value={selectedTab} 
          onValueChange={setSelectedTab}
          className="w-full space-y-8"
        >
          <TabsList className="grid w-full grid-cols-6 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-xl p-1 shadow-lg">
            <TabsTrigger 
              value="projections-table" 
              className="text-white data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg"
            >
              <Target className="h-5 w-5 mr-2" />
              Projections Table
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="text-white data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Billing Overview
            </TabsTrigger>
            <TabsTrigger 
              value="time-tracking" 
              className="text-white data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg"
            >
              <Clock className="h-5 w-5 mr-2" />
              Time Tracking KPIs
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Performance Metrics
            </TabsTrigger>
            <TabsTrigger 
              value="top-projects" 
              className="text-white data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg"
            >
              <Award className="h-5 w-5 mr-2" />
              Top Projects
            </TabsTrigger>
            <TabsTrigger 
              value="bottom-projects" 
              className="text-white data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              Bottom Projects
            </TabsTrigger>
          </TabsList>

          {/* Billing Overview Tab */}
          <TabsContent value="billing" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="billing"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      name: 'Total Projects',
                      value: stats.totalProjects,
                      icon: FileText,
                      color: 'from-blue-500 to-blue-600',
                      description: 'Active and closed projects',
                      trend: '+12% from last month'
                    },
                    {
                      name: 'Total Billed YTD',
                      value: formatCurrency(stats.totalBilled),
                      icon: DollarSign,
                      color: 'from-green-500 to-green-600',
                      description: 'Year-to-date billed amount',
                      trend: '+8.5% from last year'
                    },
                    {
                      name: 'Backlog',
                      value: formatCurrency(stats.totalUnbilled),
                      icon: TrendingUp,
                      color: 'from-yellow-500 to-yellow-600',
                      description: 'Unbilled work in progress',
                      trend: '+15% from last month'
                    },
                    {
                      name: 'Active Projects',
                      value: stats.activeProjects,
                      icon: Users,
                      color: 'from-purple-500 to-purple-600',
                      description: 'Currently active projects',
                      trend: '+5% from last month'
                    }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.name}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                              <stat.icon className="h-6 w-6 text-white" />
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {stat.trend}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                            {stat.name}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {stat.value}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {stat.description}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-xl">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium opacity-90 mb-1">Zoho Books Operating Income</p>
                            <p className="text-3xl font-bold">
                              {formatCurrency(stats.ytdOperatingIncome)}
                            </p>
                            <p className="text-sm opacity-80 mt-2">YTD Operating Income (Accrual Basis)</p>
                          </div>
                          <DollarSign className="h-12 w-12 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.45 }}
                  >
                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-xl">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium opacity-90 mb-1">Project Billing Total</p>
                            <p className="text-3xl font-bold">
                              {formatCurrency(stats.totalBilled + stats.totalUnbilled)}
                            </p>
                            <p className="text-sm opacity-80 mt-2">Combined billed and unbilled</p>
                          </div>
                          <DollarSign className="h-12 w-12 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.5 }}
                  >
                    <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-xl">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium opacity-90 mb-1">Project Count</p>
                            <p className="text-3xl font-bold">
                              {stats.totalProjects}
                            </p>
                            <p className="text-sm opacity-80 mt-2">Total projects managed</p>
                          </div>
                          <Building2 className="h-12 w-12 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.55 }}
                  >
                    <Card className="bg-gradient-to-r from-violet-500 to-violet-600 text-white border-0 shadow-xl">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium opacity-80 mb-1">Active Rate</p>
                            <p className="text-3xl font-bold">
                              {formatPercentage(stats.activeProjects / stats.totalProjects)}
                            </p>
                            <p className="text-sm opacity-80 mt-2">Projects currently active</p>
                          </div>
                          <Activity className="h-12 w-12 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Reconciliation Section */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.6 }}
                >
                  <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-xl">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Revenue Reconciliation</h3>
                          <AlertTriangle className="h-6 w-6 opacity-80" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="opacity-90 font-medium">Zoho Books Operating Income:</p>
                            <p className="text-2xl font-bold">{formatCurrency(stats.ytdOperatingIncome)}</p>
                            <p className="opacity-80 text-xs">Accrual basis financial data</p>
                          </div>
                          <div>
                            <p className="opacity-90 font-medium">Project Billing Total:</p>
                            <p className="text-2xl font-bold">{formatCurrency(stats.totalBilled + stats.totalUnbilled)}</p>
                            <p className="opacity-80 text-xs">Project-based billing data</p>
                          </div>
                        </div>
                        <div className="border-t border-white/20 pt-3">
                          <p className="opacity-90 font-medium">Difference:</p>
                          <p className="text-xl font-bold">
                            {formatCurrency(stats.ytdOperatingIncome - (stats.totalBilled + stats.totalUnbilled))}
                          </p>
                          <p className="opacity-80 text-xs">
                            This difference represents additional revenue sources, timing differences, or data synchronization gaps
                          </p>
                          <p className="opacity-80 text-xs mt-1">
                            <strong>Note:</strong> Zoho Books data is the authoritative source for financial reporting
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Comprehensive Financial Metrics */}
                {stats.ytdOperatingIncome > 0 ? (
                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.7 }}
                  >
                    <Card className="bg-gradient-to-r from-slate-700 to-slate-800 text-white border-0 shadow-xl">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Zoho Books Financial Metrics (YTD)</h3>
                            <BarChart3 className="h-6 w-6 opacity-80" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="opacity-90 font-medium">Revenue:</p>
                              <p className="text-xl font-bold">{formatCurrency(stats.ytdRevenue)}</p>
                            </div>
                            <div>
                              <p className="opacity-90 font-medium">Expenses:</p>
                              <p className="text-xl font-bold">{formatCurrency(stats.ytdExpenses)}</p>
                            </div>
                            <div>
                              <p className="opacity-90 font-medium">Gross Profit:</p>
                              <p className="text-xl font-bold">{formatCurrency(stats.ytdGrossProfit)}</p>
                            </div>
                            <div>
                              <p className="opacity-90 font-medium">Operating Income:</p>
                              <p className="text-xl font-bold">{formatCurrency(stats.ytdOperatingIncome)}</p>
                            </div>
                            <div>
                              <p className="opacity-90 font-medium">Net Profit:</p>
                              <p className="text-xl font-bold">{formatCurrency(stats.ytdNetProfit)}</p>
                            </div>
                            <div>
                              <p className="opacity-90 font-medium">Cash Flow:</p>
                              <p className="text-xl font-bold">{formatCurrency(stats.ytdCashFlow)}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.7 }}
                  >
                    <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-xl">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">⚠️ Zoho Books Data Not Available</h3>
                            <AlertTriangle className="h-6 w-6 opacity-80" />
                          </div>
                          <div className="text-sm">
                            <p className="opacity-90">
                              Unable to fetch financial data from Zoho Books. This could be due to:
                            </p>
                            <ul className="list-disc list-inside mt-2 opacity-80 text-xs">
                              <li>API authentication issues</li>
                              <li>Rate limiting</li>
                              <li>Network connectivity problems</li>
                              <li>Missing or expired API tokens</li>
                            </ul>
                            <p className="mt-2 opacity-80 text-xs">
                              Showing project billing data only. Please check your Zoho Books integration.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Data Source Information */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.8 }}
                >
                  <Card className="bg-gray-100 border-0 shadow-xl">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-800">Data Source Information</h3>
                          <Info className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                          <div>
                            <p className="font-medium">Primary Financial Data:</p>
                            <p className="text-sm">Zoho Books API (Accrual Basis)</p>
                            <p className="text-xs text-gray-500">Real-time financial metrics</p>
                          </div>
                          <div>
                            <p className="font-medium">Project Billing Data:</p>
                            <p className="text-sm">Zoho Projects + Clockify</p>
                            <p className="text-xs text-gray-500">Project-based time tracking</p>
                          </div>
                          <div>
                            <p className="font-medium">Update Frequency:</p>
                            <p className="text-sm">Real-time via API calls</p>
                            <p className="text-xs text-gray-500">Refreshed on each page load</p>
                          </div>
                          <div>
                            <p className="font-medium">Data Reconciliation:</p>
                            <p className="text-sm">Automatic calculation</p>
                            <p className="text-xs text-gray-500">Shows differences and gaps</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Time Tracking KPIs Tab */}
          <TabsContent value="time-tracking" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="time-tracking"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Time Tracking Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      name: 'Total Hours',
                      value: formatHours(stats.totalHours),
                      icon: Clock,
                      color: 'from-indigo-500 to-indigo-600',
                      description: 'Total tracked hours',
                      progress: 100
                    },
                    {
                      name: 'Billable Hours',
                      value: formatHours(stats.billableHours),
                      icon: Target,
                      color: 'from-emerald-500 to-emerald-600',
                      description: 'Billable time tracked',
                      progress: (stats.billableHours / stats.totalHours) * 100
                    },
                    {
                      name: 'Efficiency',
                      value: formatPercentage(stats.efficiency),
                      icon: BarChart3,
                      color: 'from-orange-500 to-orange-600',
                      description: 'Billable hours ratio',
                      progress: stats.efficiency * 100
                    },
                    {
                      name: 'Avg Hourly Rate',
                      value: formatCurrency(stats.averageHourlyRate),
                      icon: Zap,
                      color: 'from-pink-500 to-pink-600',
                      description: 'Average billable rate',
                      progress: 85
                    }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.name}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                              <stat.icon className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                            {stat.name}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                            {stat.value}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            {stat.description}
                          </p>
                          {stat.name === 'Efficiency' ? (
                            <div className="relative w-16 h-16 mx-auto">
                              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-gray-200 dark:text-gray-600"
                                  strokeWidth="3"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className="text-emerald-500"
                                  strokeWidth="3"
                                  strokeDasharray={`${stat.progress}, 100`}
                                  strokeLinecap="round"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {formatPercentage(stats.efficiency)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <Progress value={stat.progress} className="h-2" />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Efficiency Chart */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Billable vs Non-Billable Hours
                      </CardTitle>
                      <CardDescription>
                        Visual breakdown of time allocation efficiency
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={timeTrackingData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {timeTrackingData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center space-x-8 mt-4">
                        {timeTrackingData.map((item) => (
                          <div key={item.name} className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {item.name}: {item.value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Performance Metrics Tab */}
          <TabsContent value="performance" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="performance"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Performance Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[
                    {
                      name: 'Total Time Value',
                      value: formatCurrency(stats.totalTimeValue),
                      icon: Activity,
                      color: 'from-cyan-500 to-cyan-600',
                      description: 'Total value of tracked time',
                      metric: 'High Performance'
                    },
                    {
                      name: 'Avg Hours/Project',
                      value: formatHours(stats.averageHoursPerProject),
                      icon: Award,
                      color: 'from-violet-500 to-violet-600',
                      description: 'Average hours per project',
                      metric: 'Optimal'
                    }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.name}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                              <stat.icon className="h-6 w-6 text-white" />
                            </div>
                            <Badge variant="default" className="text-xs">
                              {stat.metric}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                            {stat.name}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {stat.value}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {stat.description}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Performance Summary */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white border-0 shadow-xl">
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-blue-400 mb-2">
                            {formatPercentage(stats.efficiency)}
                          </div>
                          <div className="text-sm text-gray-300">Overall Efficiency</div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-green-400 mb-2">
                            {stats.activeProjects}
                          </div>
                          <div className="text-sm text-gray-300">Active Projects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-purple-400 mb-2">
                            {formatCurrency(stats.averageHourlyRate)}
                          </div>
                          <div className="text-sm text-gray-300">Avg Hourly Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Projections Table Tab */}
          <TabsContent value="projections-table" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="projections-table"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Area Chart showing projected and billed amounts */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Financial Projections Overview
                      </CardTitle>
                      <CardDescription>
                        Projected and billed amounts from 1 year back to 1 year in the future
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BillingChart billingData={billingData} closedProjects={closedProjects} />
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Projections Table */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
                    <CardContent>
                      <HighPerformanceTable 
                        billingData={billingData}
                        projections={projections}
                        onUpdateProjections={handleUpdateProjections}
                        closedProjects={closedProjects}
                        onClosedProjectsChange={setClosedProjects}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Top Projects Tab */}
          <TabsContent value="top-projects" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="top-projects"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Top Projects Chart */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Top Performing Projects by Multiplier
                      </CardTitle>
                      <CardDescription>
                        Multiplier comparison of top 5 projects (higher = better profitability)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {topProjectsChartData.length > 0 ? (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProjectsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip 
                                formatter={(value, name) => [
                                  name === 'multiplier' ? Number(value).toFixed(2) + 'x' : 
                                  name === 'revenue' ? formatCurrency(Number(value)) : value,
                                  name === 'multiplier' ? 'Multiplier' : 
                                  name === 'revenue' ? 'Revenue' : 'Hours'
                                ]}
                              />
                              <Bar dataKey="multiplier" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-80 flex items-center justify-center">
                          <div className="text-center">
                            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No project data available</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">Projects will appear here once data is loaded</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Top Projects List */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
                                            <CardHeader>
                          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            Top Performing Projects by Multiplier
                          </CardTitle>
                          <CardDescription>
                            Projects ranked by profitability multiplier (higher = better). Click on any project to view detailed metrics.
                          </CardDescription>
                        </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topProjects.map((project, index) => (
                          <motion.div
                            key={project.id || project.projectId || `project-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200 cursor-pointer group"
                            onClick={() => handleProjectClick(project.id || project.projectId || `project-${index}`)}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">{index + 1}</span>
                                </div>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                  {project.name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {(project.hours || project.totalHours || 0)}h • {formatPercentage(project.efficiency || 0)} efficient
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {(project.multiplier || 0).toFixed(2)}x
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Multiplier</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(project.revenue || 0)}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                              </div>
                              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Bottom Projects Tab */}
          <TabsContent value="bottom-projects" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="bottom-projects"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Bottom Projects Chart */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Bottom Performing Projects by Multiplier
                      </CardTitle>
                      <CardDescription>
                        Multiplier comparison of bottom 5 projects (lower = worse profitability)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {bottomProjectsChartData.length > 0 ? (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bottomProjectsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip 
                                formatter={(value, name) => [
                                  name === 'multiplier' ? Number(value).toFixed(2) + 'x' : 
                                  name === 'revenue' ? formatCurrency(Number(value)) : value,
                                  name === 'multiplier' ? 'Multiplier' : 
                                  name === 'revenue' ? 'Revenue' : 'Hours'
                                ]}
                              />
                              <Bar dataKey="multiplier" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-80 flex items-center justify-center">
                          <div className="text-center">
                            <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No project data available</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">Projects will appear here once data is loaded</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Bottom Projects List */}
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Bottom Performing Projects by Multiplier
                      </CardTitle>
                      <CardDescription>
                        Projects ranked by lowest profitability multiplier (lower = worse). Click on any project to view detailed metrics.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Array.isArray(bottomProjects) && bottomProjects.length > 0 ? (
                          bottomProjects.map((project, index) => (
                            <motion.div
                              key={project.id || project.projectId || `project-${index}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + index * 0.1 }}
                              className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200 cursor-pointer group border border-red-200 dark:border-red-800"
                              onClick={() => handleProjectClick(project.id || project.projectId || `project-${index}`)}
                            >
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">{index + 1}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200">
                                    {project.name || 'Unknown Project'}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {(project.hours || 0)}h • {formatPercentage(project.efficiency || 0)} efficient
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <p className="font-semibold text-red-600 dark:text-red-400">
                                    {(project.multiplier || 0).toFixed(2)}x
                                  </p>
                                  <p className="text-sm text-red-500 dark:text-red-400">Multiplier</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(project.revenue || 0)}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                                </div>
                                <ArrowRight className="h-5 w-5 text-red-400 group-hover:text-red-600 transition-colors duration-200" />
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No project data available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>


      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject || undefined}
      />
    </div>
  );
} 