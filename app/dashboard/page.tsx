'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus, DollarSign, Users, Calendar, Target, PieChart } from 'lucide-react';
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

function DashboardPageContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
                  Back to Dashboard
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
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
                  <div className="text-2xl font-bold">{formatCurrency(metrics.ytdProfit)}</div>
                  <p className="text-xs text-muted-foreground">
                    vs {formatCurrency(metrics.lastYearYtdProfit)} last year
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(metrics.currentYearGrossMargin)}</div>
                  <p className="text-xs text-muted-foreground">
                    vs {formatPercentage(metrics.lastYearGrossMargin)} last year
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(metrics.utilizationRate)}</div>
                  <Progress value={metrics.utilizationRate * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalActiveProjects}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalEmployees} employees
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
                    <Badge variant="default">{metrics.currentYearMultiplier.toFixed(1)}x</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Year</span>
                    <Badge variant="secondary">{metrics.lastYearMultiplier.toFixed(1)}x</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Two Years Ago</span>
                    <Badge variant="outline">{metrics.twoYearsAgoMultiplier.toFixed(1)}x</Badge>
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
                    <Badge variant="default">{formatPercentage(metrics.currentYearOverhead)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Year</span>
                    <Badge variant="secondary">{formatPercentage(metrics.lastYearOverhead)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Two Years Ago</span>
                    <Badge variant="outline">{formatPercentage(metrics.twoYearsAgoOverhead)}</Badge>
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
                    <span className="font-semibold">{formatCurrency(metrics.ytdOperatingIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Year YTD Operating Income</span>
                    <span className="font-semibold">{formatCurrency(metrics.lastYearYtdOperatingIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Revenue per Employee</span>
                    <span className="font-semibold">{formatCurrency(metrics.currentYearRevenuePerEmployee)}</span>
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
                    <Badge variant="default">{formatPercentage(metrics.clientRetentionRate)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Project Size</span>
                    <span className="font-semibold">{formatCurrency(metrics.averageProjectSize)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Billing Rate</span>
                    <span className="font-semibold">{formatCurrency(metrics.averageBillingRate)}/hr</span>
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
                      <span className="font-semibold">{formatCurrency(metrics.currentCashflow)}</span>
                      {getTrendIcon(metrics.cashflowTrend)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Previous Month</span>
                    <span className="font-semibold">{formatCurrency(metrics.previousMonthCashflow)}</span>
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
                    <span className="font-semibold text-red-600">{formatCurrency(metrics.overdueInvoiceValue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Outstanding</span>
                    <span className="font-semibold">{formatCurrency(metrics.totalOutstandingInvoices)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Avg Days to Payment</span>
                    <span className="font-semibold">{metrics.averageDaysToPayment} days</span>
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
                    {metrics.trailing12Months.slice(-6).map((month, index) => (
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
                    {metrics.forecast.map((month, index) => (
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
