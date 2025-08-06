import { RefreshCw, Database, List, Settings, Clock } from 'lucide-react';
import Link from 'next/link';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onForceRefresh: () => void;
  refreshing?: boolean;
  cacheInfo: any;
  autoRefreshStatus?: {
    isActive: boolean;
    nextRefreshIn: number;
  };
}

export default function DashboardHeader({ onRefresh, onForceRefresh, cacheInfo, autoRefreshStatus }: DashboardHeaderProps) {
  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-gray-900">Zoho Billing Platform</h1>
            <div className="flex items-center space-x-4">
              <Link 
                href="/projects" 
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <List className="h-5 w-5 mr-2" />
                Project Summary
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={onRefresh}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={onForceRefresh}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Database className="h-4 w-4 mr-2" />
                Force Refresh
              </button>
            </div>
            
            {autoRefreshStatus && (
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span className={autoRefreshStatus.isActive ? 'text-green-600' : 'text-gray-400'}>
                  {autoRefreshStatus.isActive ? 'Auto-refresh' : 'Auto-refresh off'}
                </span>
                {autoRefreshStatus.isActive && (
                  <span className="text-gray-400">
                    ({formatTimeRemaining(autoRefreshStatus.nextRefreshIn)})
                  </span>
                )}
              </div>
            )}
            
            {cacheInfo && (
              <div className="text-xs text-gray-500">
                {cacheInfo.fromCache ? 'From cache' : 'Fresh data'}
                {cacheInfo.changes && (
                  <span className="ml-2 text-green-600">
                    +{Object.values(cacheInfo.changes).flat().length} changes
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 