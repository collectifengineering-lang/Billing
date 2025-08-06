'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Key, RefreshCw } from 'lucide-react';

interface TokenStatus {
  hasToken: boolean;
  expiresIn: number;
  isExpired: boolean;
  expiresAt: string;
}

export default function TokenStatus() {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Error fetching token status:', error);
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        toast.success('Token refreshed successfully');
      } else {
        toast.error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Failed to refresh token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh status every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return null;
  }

  const getStatusColor = () => {
    if (status.isExpired) return 'text-red-600';
    if (status.expiresIn < 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusText = () => {
    if (status.isExpired) return 'Expired';
    if (status.expiresIn < 10) return 'Expiring Soon';
    return 'Valid';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Key className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Zoho Token</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <div className="text-xs text-gray-500">
              {status.expiresIn > 0 ? `${status.expiresIn} min left` : 'Expired'}
            </div>
          </div>
          
          <button
            onClick={refreshToken}
            disabled={loading}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            title="Refresh token"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
} 