'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminOnly from '@/components/AdminOnly';

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

  const handleAddOrUpdateManager = async () => {
    if (!newManagerId.trim() || !newManagerName.trim()) {
      toast.error('Please provide both ID and Name');
      return;
    }
    setSavingManager(true);
    try {
      const response = await fetch('/api/project-managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newManagerId.trim(), name: newManagerName.trim(), color: newManagerColor }),
      });
      if (!response.ok) {
        throw new Error('Failed to save project manager');
      }
      toast.success('Project manager saved');
      setNewManagerId('');
      setNewManagerName('');
      // keep color for convenience
      await mutateProjectManagers();
    } catch (error) {
      console.error('Error saving project manager:', error);
      toast.error('Failed to save project manager');
    } finally {
      setSavingManager(false);
    }
  };



  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
          <p className="text-gray-600">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                <h1 className="text-3xl font-bold text-gray-900 mt-2">Settings</h1>
              </div>
              <div className="flex space-x-3"></div>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Authentication */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Token Status</h3>
                  <p className="text-sm text-gray-600">
                    {tokenStatus?.status?.hasToken ? 'Token is valid' : 'No valid token'}
                  </p>
                </div>
                <button
                  onClick={handleRefreshToken}
                  disabled={isRefreshing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
                </button>
              </div>
            </div>

            {/* Project Managers */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Managers</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                  <input
                    type="text"
                    value={newManagerId}
                    onChange={(e) => setNewManagerId(e.target.value)}
                    placeholder="e.g. JD"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newManagerName}
                    onChange={(e) => setNewManagerName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={newManagerColor}
                      onChange={(e) => setNewManagerColor(e.target.value)}
                      className="h-10 w-16 p-0 border rounded"
                    />
                    <div className="text-sm text-gray-600">{newManagerColor}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleAddOrUpdateManager}
                  disabled={savingManager}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {savingManager ? 'Saving...' : 'Add / Update Manager'}
                </button>
              </div>

              {/* Existing managers list */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Existing Managers</h3>
                {projectManagers && Object.keys(projectManagers).length > 0 ? (
                  <ul className="divide-y divide-gray-200 border rounded-md">
                    {Object.entries(projectManagers).map(([id, { name, color }]) => (
                      <li key={id} className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center space-x-3">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-gray-900">{name}</span>
                          <span className="text-gray-500 text-sm">({id})</span>
                        </div>
                        <button
                          onClick={() => {
                            setNewManagerId(id);
                            setNewManagerName(name);
                            setNewManagerColor(color);
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No managers yet</div>
                )}
              </div>
            </div>

            {/* Clockify Integration */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Clockify Integration</h2>
              <div className="space-y-4">
                {/* Clockify Status Indicator */}
                {clockifyStatus.configured ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                          Clockify Integration Active
                        </p>
                        <p className="text-xs text-green-600">
                          Time tracking data will be included in dashboard metrics
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-800">
                          Clockify Integration Not Configured
                        </p>
                        <p className="text-xs text-yellow-600">
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Test Connection
                  </button>
                </div>

                {/* Workspace Information */}
                {clockifyStatus.workspaces && clockifyStatus.workspaces.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Available Workspaces</h3>
                    <ul className="space-y-2">
                      {clockifyStatus.workspaces.map((workspace: any) => (
                        <li key={workspace.id} className="text-sm text-gray-600">
                          {workspace.name} ({workspace.id})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AdminOnly>
      <SettingsPageContent />
    </AdminOnly>
  );
} 