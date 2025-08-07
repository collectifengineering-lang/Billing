'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: tokenStatus, error } = useSWR('/api/auth/status', async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch token status');
    }
    return response.json();
  });

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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
          
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
        </div>
      </div>
    </div>
  );
} 