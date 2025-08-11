'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { useMigration } from '../lib/migrationContext';
import { Project, Invoice, BillingData } from '../lib/types';
import { processBillingData, initializeProjectionsTable, enhanceBillingDataWithClockify, calculateDashboardStats } from '../lib/utils';
import { fetchProjects, fetchInvoices, zohoService } from '../lib/zoho';
import DashboardHeader from '../components/DashboardHeader';
import DashboardStats from '../components/DashboardStats';
import EnhancedDashboardStats from '../components/EnhancedDashboardStats';
import BillingChart from '../components/BillingChart';
import HighPerformanceTable from '../components/HighPerformanceTable';
import PerformanceMonitor from '../components/PerformanceMonitor';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { isMigrating, isMigrated, hasLocalData, migrateData } = useMigration();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingData, setBillingData] = useState<BillingData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [projections, setProjections] = useState<any>({});
  const [autoRefreshStatus, setAutoRefreshStatus] = useState<any>(null);
  const [closedProjects, setClosedProjects] = useState<Set<string>>(new Set());
  const [clockifyData, setClockifyData] = useState<any[]>([]);
  const [useEnhancedStats, setUseEnhancedStats] = useState(false);

  // Database data for dashboard stats
  const [monthlyProjections, setMonthlyProjections] = useState<Record<string, Record<string, number>>>({});
  const [monthlyStatuses, setMonthlyStatuses] = useState<Record<string, Record<string, string>>>({});
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Force useDB to true - always use database now
  const useDB = true;

  // Memoize expensive calculations
  const memoizedProjections = useMemo(() => {
    if (projects.length > 0) {
      return initializeProjectionsTable(projects);
    }
    return {};
  }, [projects]);

  const memoizedBillingData = useMemo(() => {
    if (projects.length > 0 || invoices.length > 0) {
      return processBillingData(projects, invoices, memoizedProjections);
    }
    return [];
  }, [projects, invoices, memoizedProjections]);

  const memoizedDashboardStats = useMemo(() => {
    if (memoizedBillingData.length > 0) {
      return calculateDashboardStats(memoizedBillingData, closedProjects, monthlyProjections, monthlyStatuses);
    }
    return null;
  }, [memoizedBillingData, closedProjects, monthlyProjections, monthlyStatuses]);

  // Memoize enhanced billing data
  const memoizedEnhancedBillingData = useMemo(() => {
    if (memoizedBillingData.length > 0 && clockifyData.length > 0) {
      return enhanceBillingDataWithClockify(memoizedBillingData, clockifyData);
    }
    return memoizedBillingData;
  }, [memoizedBillingData, clockifyData]);

  // Authentication and routing logic
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (!loading && user && !user.isBasic) {
      router.push('/unauthorized');
      return;
    }
  }, [user, loading, router]);

  // Handle migration on mount - only once
  useEffect(() => {
    if (hasLocalData && !isMigrated && !isMigrating) {
      console.log('Dashboard: Found localStorage data, starting migration');
      migrateData();
    }
  }, [hasLocalData, isMigrated, isMigrating, migrateData]);

  // Fetch data only when user is authenticated - optimized
  useEffect(() => {
    if (user && user.isBasic && !dataLoading) {
      console.log('Dashboard: User authenticated and authorized, fetching data');
      fetchData();
    }
  }, [user, dataLoading]);

  // Update auto-refresh status - optimized to reduce re-renders
  useEffect(() => {
    const updateAutoRefreshStatus = () => {
      const status = zohoService.getAutoRefreshStatus();
      setAutoRefreshStatus(status);
    };

    // Update immediately
    updateAutoRefreshStatus();

    // Update every 5 seconds instead of every second to reduce re-renders
    const interval = setInterval(updateAutoRefreshStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch database projections and statuses - optimized
  useEffect(() => {
    const fetchDatabaseData = async () => {
      try {
        const [projectionsResponse, statusesResponse] = await Promise.all([
          fetch('/api/projections'),
          fetch('/api/statuses')
        ]);
        
        if (projectionsResponse.ok) {
          const projectionsData = await projectionsResponse.json();
          setMonthlyProjections(projectionsData);
        }
        
        if (statusesResponse.ok) {
          const statusesData = await statusesResponse.json();
          setMonthlyStatuses(statusesData);
        }
      } catch (error) {
        console.error('Error fetching database data:', error);
      }
    };

    if (user && user.isBasic && !dataLoading) {
      fetchDatabaseData();
    }
  }, [user, dataLoading]);

  // Fetch Clockify data on mount - optimized
  useEffect(() => {
    if (user && user.isBasic && clockifyData.length === 0) {
      fetchClockifyData();
    }
  }, [user, clockifyData.length]);

  // Update projections when memoized data changes
  useEffect(() => {
    setProjections(memoizedProjections);
  }, [memoizedProjections]);

  // Update billing data when memoized data changes
  useEffect(() => {
    setBillingData(memoizedEnhancedBillingData);
  }, [memoizedEnhancedBillingData]);

  // Update dashboard stats when memoized stats change
  useEffect(() => {
    setDashboardStats(memoizedDashboardStats);
  }, [memoizedDashboardStats]);

  // Set enhanced stats flag when Clockify data is available
  useEffect(() => {
    if (clockifyData.length > 0) {
      setUseEnhancedStats(true);
    }
  }, [clockifyData.length]);

  // Memoized fetch functions to prevent recreation
  const fetchClockifyData = useCallback(async () => {
    try {
      console.log('Dashboard: Fetching Clockify data...');
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
      const endDate = new Date();
      
      const response = await fetch(`/api/clockify?action=time-summaries&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
      const data = await response.json();
      
      if (data.timeSummaries) {
        setClockifyData(data.timeSummaries);
        console.log('Dashboard: Clockify data fetched:', data.timeSummaries.length);
      } else {
        console.error('Dashboard: Invalid Clockify response structure:', data);
        setClockifyData([]);
      }
    } catch (error) {
      console.error('Dashboard: Error fetching Clockify data:', error);
      setClockifyData([]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    console.log('Dashboard: Starting fetchData');
    console.log('Dashboard: User state during fetch:', { user: !!user, isBasic: user?.isBasic, loading });
    setDataLoading(true);
    try {
      const [projectsData, invoicesData] = await Promise.all([
        fetchProjects(),
        fetchInvoices()
      ]);
      console.log('Dashboard: API responses - projects:', projectsData?.length, 'invoices:', invoicesData?.length);
      setProjects(projectsData || []);
      setInvoices(invoicesData || []);
      setCacheInfo({ fromCache: false, changes: null });
    } catch (error) {
      console.error('Error fetching data:', error);
      setProjects([]);
      setInvoices([]);
    } finally {
      setDataLoading(false);
    }
  }, [user, loading]);

  const updateProjections = useCallback((projectionsData: any) => {
    setProjections(projectionsData);
  }, []);

  // Show migration loader
  if (isMigrating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Migrating data to database...</p>
          <p className="mt-2 text-sm text-gray-500">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.isBasic) {
    return null;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader cacheInfo={cacheInfo} autoRefreshStatus={autoRefreshStatus} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {useEnhancedStats && dashboardStats ? (
          <EnhancedDashboardStats stats={dashboardStats} />
        ) : (
          <DashboardStats 
            billingData={billingData} 
            closedProjects={closedProjects} 
            stats={dashboardStats}
            loading={dataLoading || billingData.length === 0}
          />
        )}
        
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Overview</h3>
            <BillingChart billingData={billingData} closedProjects={closedProjects} />
          </div>
        </div>
        
        <div className="mt-8">
          <HighPerformanceTable 
            billingData={billingData}
            projections={projections}
            onUpdateProjections={updateProjections}
            closedProjects={closedProjects}
            onClosedProjectsChange={setClosedProjects}
            useDB={useDB}
          />
        </div>
      </div>
      
      {/* Performance monitoring in development */}
      <PerformanceMonitor 
        componentName="Dashboard" 
        dataSize={billingData.length} 
      />
    </div>
  );
} 