'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, Download, ArrowLeft, RotateCcw, FolderOpen, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { BillingData } from '@/lib/types';
import { fetchProjects, fetchInvoices } from '@/lib/zoho';
import { processBillingData, initializeProjectionsTable, safeLocalStorageGet, safeLocalStorageSet } from '@/lib/utils';
import Link from 'next/link';

interface ProjectSummary {
  projectId: string;
  projectName: string;
  customerName: string;
  status: string;
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
  startDate?: string;
  endDate?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [closedProjects, setClosedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<keyof ProjectSummary>('projectName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchProjectsData();
    loadClosedProjects();
    
    // Listen for project status changes from other components
    const handleProjectStatusChange = (event: CustomEvent) => {
      const { projectId, status, closedProjects: newClosedProjects } = event.detail;
      console.log('ProjectsPage: Received project status change:', { projectId, status, newClosedProjects });
      
      if (newClosedProjects) {
        setClosedProjects(newClosedProjects);
        // Save to localStorage to persist the change
        localStorage.setItem('closedProjects', JSON.stringify(Array.from(newClosedProjects)));
      }
    };

    window.addEventListener('projectStatusChanged', handleProjectStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('projectStatusChanged', handleProjectStatusChange as EventListener);
    };
  }, []);

  const fetchProjectsData = async () => {
    try {
      setLoading(true);
      console.log('ProjectsPage: Starting fetchProjectsData');
      
      const [projectsData, invoicesData] = await Promise.all([
        fetchProjects(),
        fetchInvoices()
      ]);
      
      console.log('ProjectsPage: API responses - projects:', projectsData?.length, 'invoices:', invoicesData?.length);
      
      if (projectsData && invoicesData) {
        const projections = initializeProjectionsTable(projectsData);
        const billingData = processBillingData(projectsData, invoicesData, projections);
        
        const projectSummaries: ProjectSummary[] = billingData.map((project: BillingData) => ({
          projectId: project.projectId,
          projectName: project.projectName,
          customerName: project.customerName,
          status: 'active', // You can add status to BillingData if needed
          totalBilled: project.totalBilled,
          totalUnbilled: project.totalUnbilled,
          totalProjected: project.totalProjected,
        }));
        
        setProjects(projectSummaries);
        console.log('ProjectsPage: Processed', projectSummaries.length, 'project summaries');
      } else {
        toast.error('Failed to fetch projects data');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const loadClosedProjects = () => {
    const savedClosedProjects = safeLocalStorageGet('closedProjects');
    if (savedClosedProjects && Array.isArray(savedClosedProjects)) {
      setClosedProjects(new Set(savedClosedProjects));
    }
  };

  const handleReopenProject = (projectId: string) => {
    const newClosedProjects = new Set(closedProjects);
    newClosedProjects.delete(projectId);
    setClosedProjects(newClosedProjects);
    safeLocalStorageSet('closedProjects', Array.from(newClosedProjects));
    toast.success('Project reopened successfully');
  };

  const handleCloseProject = (projectId: string) => {
    const newClosedProjects = new Set(closedProjects);
    newClosedProjects.add(projectId);
    setClosedProjects(newClosedProjects);
    safeLocalStorageSet('closedProjects', Array.from(newClosedProjects));
    toast.success('Project closed successfully');
  };

  const activeProjects = projects.filter(project => !closedProjects.has(project.projectId));
  const closedProjectsList = projects.filter(project => closedProjects.has(project.projectId));

  const filteredProjects = activeProjects
    .filter(project => {
      const matchesSearch = 
        project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  const handleSort = (column: keyof ProjectSummary) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ['Project Name', 'Customer', 'Status', 'Total Billed', 'Total Unbilled', 'Total Projected'];
    const csvContent = [
      headers.join(','),
      ...filteredProjects.map(project => [
        `"${project.projectName}"`,
        `"${project.customerName}"`,
        project.status,
        project.totalBilled,
        project.totalUnbilled,
        project.totalProjected,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects-summary.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

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
              Projects Overview
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Comprehensive project tracking, billing status, and performance metrics
            </p>
          </div>
        </div>

        {/* Projects Content */}
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mr-4">
                  <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center mr-4">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Billed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${projects.reduce((sum, p) => sum + p.totalBilled, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl flex items-center justify-center mr-4">
                  <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projected</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${projects.reduce((sum, p) => sum + p.totalProjected, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center mr-4">
                  <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {projects.filter(p => !closedProjects.has(p.projectId)).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchProjectsData}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Billed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Unbilled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Projected
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredProjects.map((project) => (
                    <tr key={project.projectId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{project.projectName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300">{project.customerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          closedProjects.has(project.projectId)
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        }`}>
                          {closedProjects.has(project.projectId) ? 'Closed' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">${project.totalBilled.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">${project.totalUnbilled.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">${project.totalProjected.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleCloseProject(project.projectId)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-200 ${
                            closedProjects.has(project.projectId)
                              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                              : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                        >
                          {closedProjects.has(project.projectId) ? 'Reopen' : 'Close'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && !loading && (
            <div className="text-center py-12">
              <FolderOpen className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects found</h3>
              <p className="text-gray-600 dark:text-gray-300">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 