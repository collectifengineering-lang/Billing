'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, Target, Settings, Users, Clock, Database, Key } from 'lucide-react';

function SettingsPageContent() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingManager, setSavingManager] = useState(false);
  const [newManagerId, setNewManagerId] = useState('');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerColor, setNewManagerColor] = useState('#6366f1');
  const [clockifyStatus, setClockifyStatus] = useState<{
    configured: boolean;
    error?: string;
    workspaces?: any[];
  }>({ configured: false });
  
  const { data: tokenStatus, error } = useSWR('/api/auth/status', async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch token status');
    }
    return response.json();
  });

  // Project Managers
  const { data: projectManagers, mutate: mutateProjectManagers } = useSWR('/api/project-managers', async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch project managers');
    }
    const data = await response.json();
    // Persist to localStorage as array for legacy fallback
    try {
      const asArray = Object.entries(data || {}).map(([id, value]: [string, any]) => ({ id, ...(value || {}) }));
      localStorage.setItem('projectManagers', JSON.stringify(asArray));
    } catch (_) {}
    return data as Record<string, { name: string; color: string }>;
  });

  // Test Clockify connection on mount
  useEffect(() => {
    testClockifyConnection();
  }, []);

  const testClockifyConnection = async () => {
    try {
      console.log('Settings: Testing Clockify connection...');
      const response = await fetch('/api/clockify?action=test-connection');
      const data = await response.json();
      
      if (data.success) {
        console.log('Settings: Clockify connection successful');
        setClockifyStatus({
          configured: true,
          workspaces: data.workspaces
        });
      } else {
        console.log('Settings: Clockify connection failed:', data.error);
        setClockifyStatus({
          configured: false,
          error: data.error
        });
      }
    } catch (error) {
      console.error('Settings: Error testing Clockify connection:', error);
      setClockifyStatus({
        configured: false,
        error: 'Failed to connect to Clockify'
      });
    }
  };

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/auth/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      toast.success('Token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Failed to refresh token');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveManager = async () => {
    if (!newManagerName.trim()) {
      toast.error('Manager name is required');
      return;
    }

    setSavingManager(true);
    try {
      const response = await fetch('/api/project-managers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newManagerId || undefined,
          name: newManagerName.trim(),
          color: newManagerColor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save project manager');
      }

      toast.success(newManagerId ? 'Manager updated successfully' : 'Manager added successfully');
      
      // Reset form
      setNewManagerId('');
      setNewManagerName('');
      setNewManagerColor('#6366f1');
      
      // Refresh data
      mutateProjectManagers();
    } catch (error) {
      console.error('Error saving manager:', error);
      toast.error('Failed to save manager');
    } finally {
      setSavingManager(false);
    }
  };

  const handleDeleteManager = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project manager?')) {
      return;
    }

    try {
      const response = await fetch('/api/project-managers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete project manager');
      }

      toast.success('Manager deleted successfully');
      mutateProjectManagers();
    } catch (error) {
      console.error('Error deleting manager:', error);
      toast.error('Failed to delete manager');
    }
  };

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
              Settings
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Configure project managers, integrations, and system preferences
            </p>
          </div>
        </div>

        {/* Settings Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Authentication Status */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mr-4">
                <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Authentication Status</h2>
                <p className="text-gray-600 dark:text-gray-300">Zoho Books API connection status</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-red-700 dark:text-red-300">Error loading token status</p>
                </div>
              ) : tokenStatus ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <p className="text-green-700 dark:text-green-300">
                    Token expires: {new Date(tokenStatus.expiresAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <p className="text-yellow-700 dark:text-yellow-300">Loading token status...</p>
                </div>
              )}
              
              <button
                onClick={handleRefreshToken}
                disabled={isRefreshing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
              </button>
            </div>
          </div>

          {/* Project Managers */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center mr-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Managers</h2>
                <p className="text-gray-600 dark:text-gray-300">Manage project manager assignments and colors</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Add/Edit Form */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {newManagerId ? 'Edit Manager' : 'Add New Manager'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Manager Name"
                    value={newManagerName}
                    onChange={(e) => setNewManagerName(e.target.value)}
                    className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <input
                    type="color"
                    value={newManagerColor}
                    onChange={(e) => setNewManagerColor(e.target.value)}
                    className="w-full h-12 border border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer"
                  />
                  <button
                    onClick={handleSaveManager}
                    disabled={savingManager || !newManagerName.trim()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    {savingManager ? 'Saving...' : (newManagerId ? 'Update' : 'Add')}
                  </button>
                </div>
                {newManagerId && (
                  <button
                    onClick={() => {
                      setNewManagerId('');
                      setNewManagerName('');
                      setNewManagerColor('#6366f1');
                    }}
                    className="mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* Manager List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Managers</h3>
                {projectManagers && Object.keys(projectManagers).length > 0 ? (
                  <ul className="space-y-3">
                    {Object.entries(projectManagers).map(([id, { name, color }]) => (
                      <li key={id} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-600 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-gray-900 dark:text-white font-medium">{name}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">({id})</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setNewManagerId(id);
                              setNewManagerName(name);
                              setNewManagerColor(color);
                            }}
                            className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteManager(id)}
                            className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                    <p>No project managers configured yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clockify Integration */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center mr-4">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clockify Integration</h2>
                <p className="text-gray-600 dark:text-gray-300">Time tracking and analytics integration</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Status Indicator */}
              {clockifyStatus.configured ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                        Clockify Integration Active
                      </p>
                      <p className="text-green-600 dark:text-green-300">
                        Time tracking data will be included in dashboard metrics
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                        Clockify Integration Not Configured
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-300">
                        {clockifyStatus.error || 'Please configure Clockify API credentials'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Test Button */}
              <div>
                <button
                  onClick={testClockifyConnection}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  Test Connection
                </button>
              </div>

              {/* Workspace Information */}
              {clockifyStatus.workspaces && clockifyStatus.workspaces.length > 0 && (
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Workspaces</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clockifyStatus.workspaces.map((workspace: any) => (
                      <div key={workspace.id} className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-gray-200 dark:border-slate-600">
                        <p className="font-medium text-gray-900 dark:text-white">{workspace.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">ID: {workspace.id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
} 