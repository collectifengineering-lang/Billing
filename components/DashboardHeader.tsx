import { RefreshCw, Database, List, Settings, Clock, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import { memo } from 'react';

interface DashboardHeaderProps {
  cacheInfo?: any;
  autoRefreshStatus?: {
    isActive: boolean;
    nextRefreshIn: number;
  };
}

const DashboardHeader = memo(function DashboardHeader({ cacheInfo, autoRefreshStatus }: DashboardHeaderProps) {
  const { user } = useAuth();
  
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
            <div className="flex items-center space-x-4">
              <div className="relative w-12 h-12">
                <Image
                  src="/collectif-logo.png"
                  alt="Collectif Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Collectif MEP's Billings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/projects" 
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <List className="h-5 w-5 mr-2" />
                Project Summary
              </Link>
              {user?.isAdmin && (
                <Link 
                  href="/dashboard" 
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Financial Dashboard
                </Link>
              )}
              {user?.isAdmin && (
                <Link 
                  href="/settings" 
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            
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
});

export default DashboardHeader; 