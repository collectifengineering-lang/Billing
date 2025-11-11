import { useState, useEffect, useCallback } from 'react';
import { Settings, Key, Building2, TestTube, CheckCircle, AlertCircle } from 'lucide-react';

interface ClockifyConfigProps {
  onConfigChange?: (config: { apiKey: string; workspaceId: string }) => void;
}

export default function ClockifyConfig({ onConfigChange }: ClockifyConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  useEffect(() => {
    // Load saved configuration
    const savedConfig = localStorage.getItem('clockifyConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setApiKey(config.apiKey || '');
      setWorkspaceId(config.workspaceId || '');
    }
  }, []);

  const saveConfig = () => {
    const config = { apiKey, workspaceId };
    localStorage.setItem('clockifyConfig', JSON.stringify(config));
    onConfigChange?.(config);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Test API key by fetching user info
      const response = await fetch('/api/clockify?action=user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Clockify-API-Key': apiKey,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Connection successful!',
          data: data.user,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to connect to Clockify API',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const loadWorkspaces = useCallback(async () => {
    if (!apiKey) return;

    setIsLoadingWorkspaces(true);
    try {
      const response = await fetch('/api/clockify?action=workspaces', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Clockify-API-Key': apiKey,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setWorkspaces(data.workspaces || []);
      } else {
        console.error('Failed to load workspaces:', data.error);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey) {
      loadWorkspaces();
    }
  }, [apiKey, loadWorkspaces]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <Settings className="h-6 w-6 text-gray-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">Clockify Integration</h3>
      </div>

      <div className="space-y-6">
        {/* API Key Configuration */}
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <div className="flex space-x-2">
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your Clockify API key"
            />
            <button
              onClick={testConnection}
              disabled={!apiKey || isTesting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isTesting ? (
                <TestTube className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Test
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Get your API key from{' '}
            <a
              href="https://clockify.me/user/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Clockify settings
            </a>
          </p>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-4 rounded-md ${
            testResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              <span className={`text-sm font-medium ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.message}
              </span>
            </div>
            {testResult.data && (
              <div className="mt-2 text-sm text-green-700">
                <p>User: {testResult.data.name}</p>
                <p>Email: {testResult.data.email}</p>
              </div>
            )}
          </div>
        )}

        {/* Workspace Selection */}
        <div>
          <label htmlFor="workspaceId" className="block text-sm font-medium text-gray-700 mb-2">
            Workspace
          </label>
          <div className="flex space-x-2">
            <select
              id="workspaceId"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoadingWorkspaces}
            >
              <option value="">Select a workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadWorkspaces}
              disabled={!apiKey || isLoadingWorkspaces}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoadingWorkspaces ? (
                <div className="h-4 w-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Building2 className="h-4 w-4 mr-2" />
              )}
              Refresh
            </button>
          </div>
          {isLoadingWorkspaces && (
            <p className="text-xs text-gray-500 mt-1">Loading workspaces...</p>
          )}
        </div>

        {/* Save Configuration */}
        <div className="flex justify-end">
          <button
            onClick={saveConfig}
            disabled={!apiKey || !workspaceId}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Key className="h-4 w-4 mr-2" />
            Save Configuration
          </button>
        </div>

        {/* Configuration Status */}
        <div className="bg-gray-50 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration Status</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                apiKey ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>API Key: {apiKey ? 'Configured' : 'Not configured'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                workspaceId ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>Workspace: {workspaceId ? 'Selected' : 'Not selected'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                apiKey && workspaceId ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>Integration: {apiKey && workspaceId ? 'Ready' : 'Not ready'}</span>
            </div>
          </div>
        </div>

        {/* Help Information */}
        <div className="bg-blue-50 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How to set up Clockify integration</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Go to your Clockify account settings</li>
            <li>2. Generate an API key</li>
            <li>3. Enter the API key above and test the connection</li>
            <li>4. Select your workspace from the dropdown</li>
            <li>5. Save the configuration</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
