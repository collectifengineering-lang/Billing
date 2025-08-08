import { DashboardStats } from '@/lib/types';
import { formatCurrency, formatHours, formatEfficiency } from '@/lib/utils';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  BarChart3, 
  Zap,
  Activity,
  Award
} from 'lucide-react';

interface EnhancedDashboardStatsProps {
  stats: DashboardStats;
}

export default function EnhancedDashboardStats({ stats }: EnhancedDashboardStatsProps) {
  const billingStatCards = [
    {
      name: 'Total Projects',
      value: stats.totalProjects,
      icon: FileText,
      color: 'bg-blue-500',
      description: 'Active and closed projects',
    },
    {
      name: 'Total Billed YTD',
      value: formatCurrency(stats.totalBilled),
      icon: DollarSign,
      color: 'bg-green-500',
      description: 'Year-to-date billed amount',
    },
    {
      name: 'Backlog',
      value: formatCurrency(stats.totalUnbilled),
      icon: TrendingUp,
      color: 'bg-yellow-500',
      description: 'Unbilled work in progress',
    },
    {
      name: 'Active Projects',
      value: stats.activeProjects,
      icon: Users,
      color: 'bg-purple-500',
      description: 'Currently active projects',
    },
  ];

  const timeTrackingStatCards = [
    {
      name: 'Total Hours',
      value: formatHours(stats.totalHours),
      icon: Clock,
      color: 'bg-indigo-500',
      description: 'Total tracked hours',
    },
    {
      name: 'Billable Hours',
      value: formatHours(stats.billableHours),
      icon: Target,
      color: 'bg-emerald-500',
      description: 'Billable time tracked',
    },
    {
      name: 'Efficiency',
      value: formatEfficiency(stats.efficiency),
      icon: BarChart3,
      color: 'bg-orange-500',
      description: 'Billable hours ratio',
    },
    {
      name: 'Avg Hourly Rate',
      value: formatCurrency(stats.averageHourlyRate),
      icon: Zap,
      color: 'bg-pink-500',
      description: 'Average billable rate',
    },
  ];

  const performanceStatCards = [
    {
      name: 'Total Time Value',
      value: formatCurrency(stats.totalTimeValue),
      icon: Activity,
      color: 'bg-cyan-500',
      description: 'Total value of tracked time',
    },
    {
      name: 'Avg Hours/Project',
      value: formatHours(stats.averageHoursPerProject),
      icon: Award,
      color: 'bg-violet-500',
      description: 'Average hours per project',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Billing Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {billingStatCards.map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Tracking Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking KPIs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {timeTrackingStatCards.map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {performanceStatCards.map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Projects */}
      {stats.topPerformingProjects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Projects</h3>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.topPerformingProjects.map((projectId, index) => (
                <div key={projectId} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Project {projectId}
                    </p>
                    <p className="text-xs text-gray-500">
                      High efficiency & hours
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Total Revenue</p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.totalBilled + stats.totalUnbilled)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Time Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.totalTimeValue)}
              </p>
            </div>
            <Clock className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Efficiency</p>
              <p className="text-2xl font-bold">
                {formatEfficiency(stats.efficiency)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
}
