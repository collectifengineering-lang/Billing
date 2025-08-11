import { BillingData, DashboardStats as DashboardStatsType } from '@/lib/types';
import { calculateDashboardStats, formatCurrency } from '@/lib/utils';
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react';

interface DashboardStatsProps {
  billingData: BillingData[];
  closedProjects?: Set<string>;
  stats?: DashboardStatsType;
  loading?: boolean;
}

// Skeleton loading component
const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center">
      <div className="p-3 rounded-lg bg-gray-300 w-12 h-12"></div>
      <div className="ml-4 flex-1">
        <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-300 rounded w-20"></div>
      </div>
    </div>
  </div>
);

export default function DashboardStats({ billingData, closedProjects, stats, loading = false }: DashboardStatsProps) {
  // Use provided stats or calculate them
  const calculatedStats = stats || calculateDashboardStats(billingData, closedProjects);

  const statCards = [
    {
      name: 'Total Projects',
      value: calculatedStats.totalProjects,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Billed YTD',
      value: formatCurrency(calculatedStats.totalBilled),
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      name: 'Backlog',
      value: formatCurrency(calculatedStats.totalUnbilled),
      icon: TrendingUp,
      color: 'bg-yellow-500',
    },
    {
      name: 'Active Projects',
      value: calculatedStats.activeProjects,
      icon: Users,
      color: 'bg-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 