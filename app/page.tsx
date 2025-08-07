'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { useMigration } from '../lib/migrationContext';
import { Project, Invoice, BillingData } from '../lib/types';
import { processBillingData, initializeProjectionsTable } from '../lib/utils';
import { fetchProjects, fetchInvoices, zohoService } from '../lib/zoho';
import DashboardHeader from '../components/DashboardHeader';
import DashboardStats from '../components/DashboardStats';
import BillingChart from '../components/BillingChart';
import HighPerformanceTable from '../components/HighPerformanceTable';

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

  // Force useDB to true - always use database now
  const useDB = true;

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

  // Handle migration on mount
  useEffect(() => {
    if (hasLocalData && !isMigrated && !isMigrating) {
      console.log('Dashboard: Found localStorage data, starting migration');
      migrateData();
    }
  }, [hasLocalData, isMigrated, isMigrating, migrateData]);

  useEffect(() => {
    console.log('Dashboard: useEffect triggered - user:', !!user, 'isBasic:', user?.isBasic, 'loading:', loading);
    if (user && user.isBasic) {
      console.log('Dashboard: User authenticated and authorized, fetching data');
      fetchData();
    } else {
      console.log('Dashboard: User not authenticated or not authorized:', { user: !!user, isBasic: user?.isBasic, loading });
    }
  }, [user]);

  // Update auto-refresh status every second
  useEffect(() => {
    const updateAutoRefreshStatus = () => {
      const status = zohoService.getAutoRefreshStatus();
      setAutoRefreshStatus(status);
    };

    // Update immediately
    updateAutoRefreshStatus();

    // Update every second
    const interval = setInterval(updateAutoRefreshStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // Process billing data when projects or invoices change
  useEffect(() => {
    if (projects.length > 0 || invoices.length > 0) {
      console.log('Dashboard: Processing data - projects:', projects.length, 'invoices:', invoices.length);
      console.log('Dashboard: User state:', { user: !!user, isBasic: user?.isBasic, loading });
      const newProjections = initializeProjectionsTable(projects);
      setProjections(newProjections);
      const processedData = processBillingData(projects, invoices, newProjections);
      console.log('Dashboard: Processed billing data:', processedData.length);
      console.log('Dashboard: First processed item:', processedData[0]);
      console.log('Dashboard: Projections initialized:', Object.keys(newProjections).length);
      setBillingData(processedData);
    } else {
      console.log('Dashboard: No projects or invoices to process');
      console.log('Dashboard: Projects length:', projects.length);
      console.log('Dashboard: Invoices length:', invoices.length);
    }
  }, [projects, invoices, user, loading]);

  const fetchData = async () => {
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
  };

  const refreshData = () => {
    fetchData();
  };

  const forceRefreshData = () => {
    fetchData();
  };

  const updateProjections = (projectionsData: any) => {
    setProjections(projectionsData);
  };

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
      <DashboardHeader onRefresh={refreshData} onForceRefresh={forceRefreshData} cacheInfo={cacheInfo} autoRefreshStatus={autoRefreshStatus} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardStats billingData={billingData} closedProjects={closedProjects} />
        
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
    </div>
  );
} 