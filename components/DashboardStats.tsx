import { BillingData } from '@/lib/types';
import { calculateDashboardStats, formatCurrency } from '@/lib/utils';
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react';

interface DashboardStatsProps {
  billingData: BillingData[];
  closedProjects?: Set<string>;
}

export default function DashboardStats({ billingData, closedProjects }: DashboardStatsProps) {
  const stats = calculateDashboardStats(billingData, closedProjects);

  const statCards = [
    {
      name: 'Total Projects',
      value: stats.totalProjects,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Billed',
      value: formatCurrency(stats.totalBilled),
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      name: 'Total Unbilled',
      value: formatCurrency(stats.totalUnbilled),
      icon: TrendingUp,
      color: 'bg-yellow-500',
    },
    {
      name: 'Active Projects',
      value: stats.activeProjects,
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