'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, Filter, Download, ArrowLeft, RotateCcw } from 'lucide-react';
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
  const [showClosedProjects, setShowClosedProjects] = useState(false);

  useEffect(() => {
    fetchProjectsData();
    loadClosedProjects();
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
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Project Summary</h1>
              <p className="mt-2 text-gray-600">
                {filteredProjects.length} of {activeProjects.length} active projects
                {closedProjectsList.length > 0 && (
                  <span className="ml-2 text-gray-500">
                    ({closedProjectsList.length} closed)
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-3">
              {closedProjectsList.length > 0 && (
                <button
                  onClick={() => setShowClosedProjects(!showClosedProjects)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  {showClosedProjects ? 'Hide' : 'Show'} Closed Projects ({closedProjectsList.length})
                </button>
              )}
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Projects
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by project or customer name..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value as keyof ProjectSummary)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="projectName">Project Name</option>
                <option value="customerName">Customer</option>
                <option value="totalBilled">Total Billed</option>
                <option value="totalUnbilled">Total Unbilled</option>
                <option value="totalProjected">Total Projected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Projects Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Active Projects</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('projectName')}
                  >
                    Project Name
                    {sortBy === 'projectName' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('customerName')}
                  >
                    Customer
                    {sortBy === 'customerName' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalBilled')}
                  >
                    Total Billed
                    {sortBy === 'totalBilled' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalUnbilled')}
                  >
                    Total Unbilled
                    {sortBy === 'totalUnbilled' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalProjected')}
                  >
                    Total Projected
                    {sortBy === 'totalProjected' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project.projectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(project.totalBilled)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(project.totalUnbilled)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(project.totalProjected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Closed Projects Section */}
        {showClosedProjects && closedProjectsList.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Closed Projects</h2>
              <p className="text-sm text-gray-600 mt-1">
                These projects have been closed and are hidden from the main projections table.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Billed
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Unbilled
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Projected
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {closedProjectsList.map((project) => (
                    <tr key={project.projectId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.projectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(project.totalBilled)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(project.totalUnbilled)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(project.totalProjected)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => handleReopenProject(project.projectId)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reopen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredProjects.length === 0 && activeProjects.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No active projects found matching your criteria.</p>
          </div>
        )}

        {activeProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No active projects found.</p>
          </div>
        )}
      </div>
    </div>
  );
} 