'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Search, Download, ArrowLeft, RotateCcw, FolderOpen, TrendingUp, DollarSign, Clock, BarChart3 } from 'lucide-react';
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

  // Define fetchProjectsData before useEffect that uses it
  const fetchProjectsData = useCallback(async () => {
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
        const billingData = processBillingData(projectsData, invoicesData, projections, closedProjects);
        
        const projectSummaries: ProjectSummary[] = billingData.map((project: BillingData) => ({
          projectId: project.projectId,
          projectName: project.projectName,
          customerName: project.customerName,
          status: project.status || 'active', // Use the status from BillingData
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
  }, [closedProjects]);

  useEffect(() => {
    fetchProjectsData();
    loadProjectStatuses();
    
    // Listen for project status changes from other components
    const handleProjectStatusChange = (event: CustomEvent) => {
      const { projectId, status, closedProjects: newClosedProjects } = event.detail;
      console.log('ProjectsPage: Received project status change:', { projectId, status, newClosedProjects });
      
      if (newClosedProjects) {
        setClosedProjects(newClosedProjects);
        
        // Update the project status in the projects array
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.projectId === projectId 
              ? { ...project, status: status === 'closed' ? 'closed' : 'active' }
              : project
          )
        );
      }
    };

    window.addEventListener('projectStatusChanged', handleProjectStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('projectStatusChanged', handleProjectStatusChange as EventListener);
    };
  }, [fetchProjectsData]);

  const loadProjectStatuses = async () => {
    try {
      const response = await fetch('/api/project-statuses');
      if (response.ok) {
        const projectStatuses = await response.json();
        if (typeof projectStatuses === 'object' && projectStatuses !== null) {
          const closedProjectIds = Object.entries(projectStatuses)
            .filter(([_, status]) => status === 'closed')
            .map(([projectId, _]) => projectId);
          
          setClosedProjects(new Set(closedProjectIds));
          console.log('ProjectsPage: Loaded project statuses from database:', projectStatuses);
        }
      } else {
        console.warn('Failed to fetch project statuses from database, using empty set');
        setClosedProjects(new Set());
      }
    } catch (error) {
      console.error('Error loading project statuses from database:', error);
      setClosedProjects(new Set());
    }
  };

  const handleReopenProject = async (projectId: string) => {
    try {
      const response = await fetch('/api/project-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, status: 'active' }),
      });
      
      if (response.ok) {
        const newClosedProjects = new Set(closedProjects);
        newClosedProjects.delete(projectId);
        setClosedProjects(newClosedProjects);
        
        // Update the project status in the projects array
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.projectId === projectId 
              ? { ...project, status: 'active' }
              : project
          )
        );
        
        // Emit custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('projectStatusChanged', {
          detail: { projectId, status: 'reopened', closedProjects: newClosedProjects }
        }));
        
        toast.success('Project reopened successfully');
      } else {
        throw new Error('Failed to reopen project');
      }
    } catch (error) {
      console.error('Error reopening project:', error);
      toast.error('Failed to reopen project');
    }
  };

  const handleCloseProject = async (projectId: string) => {
    try {
      const response = await fetch('/api/project-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, status: 'closed' }),
      });
      
      if (response.ok) {
        const newClosedProjects = new Set(closedProjects);
        newClosedProjects.add(projectId);
        setClosedProjects(newClosedProjects);
        
        // Update the project status in the projects array
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.projectId === projectId 
              ? { ...project, status: 'closed' }
              : project
          )
        );
        
        // Emit custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('projectStatusChanged', {
          detail: { projectId, status: 'closed', closedProjects: newClosedProjects }
        }));
        
        toast.success('Project closed successfully');
      } else {
        throw new Error('Failed to close project');
      }
    } catch (error) {
      console.error('Error closing project:', error);
      toast.error('Failed to close project');
    }
  };

  // Show all projects (both active and closed) but filter based on status filter
  const filteredProjects = projects
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'closed':
        return <FolderOpen className="w-4 h-4" />;
      case 'active':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading Projects</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Fetching project data from Zoho and calculating projections...
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>What&apos;s happening:</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Connecting to Zoho Books API</li>
                <li>• Loading project information</li>
                <li>• Calculating billing projections</li>
                <li>• Processing invoice data</li>
              </ul>
            </div>
          </div>
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
              Projects Dashboard
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Comprehensive project overview with billing analysis and status management
            </p>
          </div>

          {/* Action Buttons - Top Right */}
          <div className="absolute top-0 right-0 flex space-x-3">
            <button
              onClick={fetchProjectsData}
              className="inline-flex items-center px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search projects or customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-700 dark:to-slate-800">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                    onClick={() => handleSort('projectName')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Project</span>
                      {sortBy === 'projectName' && (
                        <span className="text-blue-500">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                    onClick={() => handleSort('customerName')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Customer</span>
                      {sortBy === 'customerName' && (
                        <span className="text-blue-500">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                      {sortBy === 'status' && (
                        <span className="text-blue-500">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                    onClick={() => handleSort('totalBilled')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Billed</span>
                      {sortBy === 'totalBilled' && (
                        <span className="text-blue-500">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                    onClick={() => handleSort('totalUnbilled')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Unbilled</span>
                      {sortBy === 'totalUnbilled' && (
                        <span className="text-blue-500">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                    onClick={() => handleSort('totalProjected')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Projected</span>
                      {sortBy === 'totalProjected' && (
                        <span className="text-blue-500">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredProjects.map((project) => (
                  <tr key={project.projectId} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words leading-relaxed">
                          {project.projectName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900 dark:text-gray-100 break-words leading-relaxed">
                          {project.customerName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${getStatusBadgeColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="ml-2">{project.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {formatCurrency(project.totalBilled)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {formatCurrency(project.totalUnbilled)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {formatCurrency(project.totalProjected)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {project.status === 'closed' ? (
                        <button
                          onClick={() => handleReopenProject(project.projectId)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        >
                          Reopen
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCloseProject(project.projectId)}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/20 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredProjects.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No projects found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'No projects have been added yet'
                }
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projects.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Billed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(projects.reduce((sum, p) => sum + p.totalBilled, 0))}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Unbilled</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(projects.reduce((sum, p) => sum + p.totalUnbilled, 0))}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-slate-500 rounded-xl flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Closed Projects</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {projects.filter(p => p.status === 'closed').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 