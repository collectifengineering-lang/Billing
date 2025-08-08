import { BillingData, DashboardStats as DashboardStatsType } from '@/lib/types';
import { calculateDashboardStats, formatCurrency } from '@/lib/utils';
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react';

interface DashboardStatsProps {
  billingData: BillingData[];
  closedProjects?: Set<string>;
  stats?: DashboardStatsType;
}

export default function DashboardStats({ billingData, closedProjects, stats }: DashboardStatsProps) {
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