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
    
    // Update the project status in the projects array
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project.projectId === projectId 
          ? { ...project, status: 'active' }
          : project
      )
    );
    
    toast.success('Project reopened successfully');
  };

  const handleCloseProject = (projectId: string) => {
    const newClosedProjects = new Set(closedProjects);
    newClosedProjects.add(projectId);
    setClosedProjects(newClosedProjects);
    safeLocalStorageSet('closedProjects', Array.from(newClosedProjects));
    
    // Update the project status in the projects array
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project.projectId === projectId 
          ? { ...project, status: 'closed' }
          : project
      )
    );
    
    toast.success('Project closed successfully');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchProjectsData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh Data
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search projects or customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('projectName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Project</span>
                      {sortBy === 'projectName' && (
                        <span className="text-gray-400">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('customerName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Customer</span>
                      {sortBy === 'customerName' && (
                        <span className="text-gray-400">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {sortBy === 'status' && (
                        <span className="text-gray-400">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalBilled')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Billed</span>
                      {sortBy === 'totalBilled' && (
                        <span className="text-gray-400">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalUnbilled')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Unbilled</span>
                      {sortBy === 'totalUnbilled' && (
                        <span className="text-gray-400">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalProjected')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Projected</span>
                      {sortBy === 'totalProjected' && (
                        <span className="text-gray-400">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project.projectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {project.projectName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="ml-1">{project.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(project.totalBilled)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(project.totalUnbilled)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(project.totalProjected)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {project.status === 'closed' ? (
                        <button
                          onClick={() => handleReopenProject(project.projectId)}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-3 py-1 rounded-md text-sm font-medium"
                        >
                          Reopen
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCloseProject(project.projectId)}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-1 rounded-md text-sm font-medium"
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
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'No projects have been added yet'
                }
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Projects</p>
                <p className="text-2xl font-semibold text-gray-900">{projects.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Billed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(projects.reduce((sum, p) => sum + p.totalBilled, 0))}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Unbilled</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(projects.reduce((sum, p) => sum + p.totalUnbilled, 0))}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderOpen className="w-8 h-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Closed Projects</p>
                <p className="text-2xl font-semibold text-gray-900">
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