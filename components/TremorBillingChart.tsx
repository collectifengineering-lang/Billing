'use client';

import { BarChart } from '@tremor/react';

interface BillingDataPoint {
  projectName: string;
  month: string;
  billed: number;
  projected: number;
}

interface TremorBillingChartProps {
  data: BillingDataPoint[];
  title?: string;
  description?: string;
}

export default function TremorBillingChart({ 
  data, 
  title = "Billing Overview", 
  description = "Monthly billing vs projected amounts" 
}: TremorBillingChartProps) {
  // Transform data to match Tremor's expected format
  const chartData = data.map(item => ({
    name: item.month,
    'Billed': item.billed,
    'Projected': item.projected,
  }));

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      
      <BarChart
        className="h-80"
        data={chartData}
        index="name"
        categories={['Billed', 'Projected']}
        colors={['blue', 'emerald']}
        yAxisWidth={60}
        showLegend={true}
        showGridLines={true}
        showXAxis={true}
        showYAxis={true}
        valueFormatter={(value) => `$${value.toLocaleString()}`}
      />
    </div>
  );
}
