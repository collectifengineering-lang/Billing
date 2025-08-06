import { BillingData } from '@/lib/types';
import { formatCurrency, formatMonth, getCurrentMonthRange, safeLocalStorageGet } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

interface BillingChartProps {
  billingData: BillingData[];
  closedProjects?: Set<string>;
}

export default function BillingChart({ billingData, closedProjects }: BillingChartProps) {
  // Handle undefined or null billingData
  const safeBillingData = billingData || [];
  const safeClosedProjects = closedProjects || new Set();
  
  // State to trigger re-renders when projections change
  const [projectionsVersion, setProjectionsVersion] = useState(0);
  
  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'monthlyProjections' || event.key === 'monthlyStatuses') {
        setProjectionsVersion(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Also listen for custom events from the same tab
  useEffect(() => {
    const handleProjectionsUpdate = () => {
      setProjectionsVersion(prev => prev + 1);
    };

    window.addEventListener('projectionsUpdated', handleProjectionsUpdate);
    window.addEventListener('statusUpdated', handleProjectionsUpdate);
    return () => {
      window.removeEventListener('projectionsUpdated', handleProjectionsUpdate);
      window.removeEventListener('statusUpdated', handleProjectionsUpdate);
    };
  }, []);
  
  // Get data from localStorage
  const monthlyProjections = safeLocalStorageGet('monthlyProjections') || {};
  const monthlyStatuses = safeLocalStorageGet('monthlyStatuses') || {};
  
  // Create monthly aggregated data for the chart
  const monthRange = getCurrentMonthRange(12, 12); // 12 months back, 12 months forward
  
  const chartData = monthRange.map(month => {
    let monthProjected = 0;
    let monthBilled = 0;
    
    // Get all project IDs (both active and closed)
    const allProjectIds = new Set([
      ...safeBillingData.map(project => project.projectId),
      ...Array.from(safeClosedProjects)
    ]);
    
    // Calculate projections and billed amounts for all projects
    allProjectIds.forEach(projectId => {
      const projectProjections = monthlyProjections[projectId];
      const projectStatuses = monthlyStatuses[projectId];
      
      if (projectProjections && projectProjections[month]) {
        const projectedAmount = projectProjections[month];
        
        // Check if this month is marked as "Billed" for this project
        if (projectStatuses && projectStatuses[month] === 'Billed') {
          monthBilled += projectedAmount;
        } else {
          // Add to projected if it's not billed (includes "Estimate", "Confirmed", "Other", etc.)
          monthProjected += projectedAmount;
        }
      }
    });
    
    const monthUnbilled = monthProjected; // Unbilled is now just the projected (non-billed) amount

    // Debug logging for current month
    if (month === new Date().toISOString().slice(0, 7)) {
      console.log('BillingChart: Current month data:', {
        month,
        monthProjected,
        monthBilled,
        monthUnbilled,
        allProjectIdsCount: allProjectIds.size,
        activeProjectsCount: safeBillingData.length,
        closedProjectsCount: safeClosedProjects.size
      });
    }

    return {
      month,
      name: formatMonth(month),
      billed: monthBilled,
      unbilled: monthUnbilled,
      projected: monthProjected,
      total: monthProjected,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80">
      <div className="overflow-x-auto">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                interval={0}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                fontSize={12}
                label={{ value: 'Amount (USD)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
                             <Area 
                 type="monotone" 
                 dataKey="projected" 
                 stackId="1" 
                 stroke="#f97316" 
                 fill="#f97316" 
                 fillOpacity={0.6}
                 name="Projected" 
               />
              
              <Area 
                type="monotone" 
                dataKey="billed" 
                stackId="1" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
                name="Billed" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 