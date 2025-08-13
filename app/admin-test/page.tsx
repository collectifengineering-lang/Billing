'use client';

import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle, XCircle } from 'lucide-react';

export default function AdminTestPage() {
  const { user, loading } = useAuth();
  const [envTest, setEnvTest] = useState<any>(null);
  const [envLoading, setEnvLoading] = useState(false);

  useEffect(() => {
    // Test the environment variable API endpoint
    const testEnv = async () => {
      setEnvLoading(true);
      try {
        const response = await fetch('/api/auth/admin-test');
        const data = await response.json();
        setEnvTest(data);
      } catch (error) {
        setEnvTest({ error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        setEnvLoading(false);
      }
    };

    testEnv();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Admin Access Test</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* User Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Authentication Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Authenticated:</span>
                <span className={`flex items-center ${user ? 'text-green-600' : 'text-red-600'}`}>
                  {user ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  {user ? 'Yes' : 'No'}
                </span>
              </div>
              
              {user && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">User ID:</span>
                    <span className="text-sm text-gray-900">{user.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Name:</span>
                    <span className="text-sm text-gray-900">{user.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <span className="text-sm text-gray-900">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Is Admin:</span>
                    <span className={`flex items-center ${user.isAdmin ? 'text-green-600' : 'text-red-600'}`}>
                      {user.isAdmin ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                      {user.isAdmin ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Is Basic User:</span>
                    <span className={`flex items-center ${user.isBasic ? 'text-green-600' : 'text-red-600'}`}>
                      {user.isBasic ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                      {user.isBasic ? 'Yes' : 'No'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Environment Variable Test */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment Variable Test</h2>
            {envLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Testing environment variables...</p>
              </div>
            ) : envTest ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">API Success:</span>
                  <span className={`flex items-center ${envTest.success ? 'text-green-600' : 'text-red-600'}`}>
                    {envTest.success ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                    {envTest.success ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Environment Variable Exists:</span>
                  <span className={`flex items-center ${envTest.envVarExists ? 'text-green-600' : 'text-red-600'}`}>
                    {envTest.envVarExists ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                    {envTest.envVarExists ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Raw Value:</span>
                  <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {envTest.adminEmails || 'undefined'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Parsed Array:</span>
                  <span className="text-sm text-gray-900">
                    [{envTest.adminEmailsArray.join(', ')}]
                  </span>
                </div>
                {envTest.error && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Error:</span>
                    <span className="text-sm text-red-600">{envTest.error}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No environment test data available</p>
            )}
          </div>

          {/* Troubleshooting */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Troubleshooting</h2>
            <div className="space-y-3 text-sm text-blue-800">
              <p>If you're getting "Access Denied" errors:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Check that your email is in the <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_ADMIN_EMAILS</code> environment variable</li>
                <li>Ensure your email ends with <code className="bg-blue-100 px-1 rounded">@collectif.nyc</code></li>
                <li>Verify you're properly authenticated with Azure AD</li>
                <li>Check the browser console for debug information</li>
              </ol>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Admin Pages</h2>
            <div className="space-y-3">
              <Link 
                href="/settings" 
                className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
              >
                Test Settings Page
              </Link>
              <Link 
                href="/dashboard" 
                className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
              >
                Test Dashboard Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
