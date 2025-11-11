import { useEffect, useState, memo } from 'react';

interface PerformanceMonitorProps {
  componentName: string;
  dataSize?: number;
}

const PerformanceMonitor = memo(function PerformanceMonitor({ componentName, dataSize }: PerformanceMonitorProps) {
  const [renderCount, setRenderCount] = useState(0);
  const [lastRenderTime, setLastRenderTime] = useState<number>(0);

  useEffect(() => {
    const now = performance.now();
    setRenderCount(prev => prev + 1);
    setLastRenderTime(now);
  }, []); // Empty dependency array - this effect runs on mount only

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50">
      <div>{componentName}</div>
      <div>Renders: {renderCount}</div>
      <div>Last: {lastRenderTime.toFixed(2)}ms</div>
      {dataSize !== undefined && <div>Data: {dataSize} items</div>}
    </div>
  );
});

export default PerformanceMonitor;
