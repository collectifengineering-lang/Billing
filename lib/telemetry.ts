import prisma from './db';

export interface TelemetryData {
  endpoint: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
  rateLimitHit?: boolean;
  retryCount?: number;
  totalWaitTime?: number;
  metadata?: Record<string, any>;
}

/**
 * Performance telemetry utility for tracking API performance and rate limits
 */
export class PerformanceTelemetry {
  private startTime: number = 0;
  private endpoint: string = '';
  private rateLimitHit: boolean = false;
  private retryCount: number = 0;
  private totalWaitTime: number = 0;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.startTime = Date.now();
  }

  /**
   * Record a rate limit hit
   */
  recordRateLimitHit(waitTime: number): void {
    this.rateLimitHit = true;
    this.totalWaitTime += waitTime;
    this.retryCount++;
  }

  /**
   * Record telemetry data to database
   */
  async recordSuccess(metadata?: Record<string, any>): Promise<void> {
    const duration = Date.now() - this.startTime;
    
    try {
      await prisma.performance_telemetry.create({
        data: {
          endpoint: this.endpoint,
          duration,
          success: true,
          rate_limit_hit: this.rateLimitHit,
          retry_count: this.retryCount,
          total_wait_time: this.totalWaitTime,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      // Log to console for immediate visibility
      const logData = {
        endpoint: this.endpoint,
        duration: `${duration}ms`,
        rate_limit_hit: this.rateLimitHit,
        retry_count: this.retryCount,
        totalWaitTime: this.totalWaitTime > 0 ? `${this.totalWaitTime}ms` : '0ms',
      };

      if (this.totalWaitTime > 5000) {
        console.warn('⚠️ High rate limit wait time:', logData);
      } else if (duration > 3000) {
        console.warn('⚠️ Slow API call:', logData);
      } else {
        console.info('✅ API call completed:', logData);
      }
    } catch (error) {
      console.error('Failed to record telemetry:', error);
    }
  }

  /**
   * Record telemetry data for failed requests
   */
  async recordFailure(error: Error, metadata?: Record<string, any>): Promise<void> {
    const duration = Date.now() - this.startTime;
    
    try {
      await prisma.performance_telemetry.create({
        data: {
          endpoint: this.endpoint,
          duration,
          success: false,
          error_message: error.message,
          rate_limit_hit: this.rateLimitHit,
          retry_count: this.retryCount,
          total_wait_time: this.totalWaitTime,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      console.error('❌ API call failed:', {
        endpoint: this.endpoint,
        duration: `${duration}ms`,
        error: error.message,
        rate_limit_hit: this.rateLimitHit,
        retry_count: this.retryCount,
        totalWaitTime: this.totalWaitTime > 0 ? `${this.totalWaitTime}ms` : '0ms',
      });
    } catch (dbError) {
      console.error('Failed to record telemetry:', dbError);
    }
  }

  /**
   * Get performance analytics for an endpoint
   */
  static async getAnalytics(endpoint: string, hours: number = 24): Promise<{
    totalCalls: number;
    successRate: number;
    averageDuration: number;
    rateLimitHitRate: number;
    averageWaitTime: number;
    slowCallCount: number;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const records = await prisma.performance_telemetry.findMany({
      where: {
        endpoint,
        timestamp: { gte: since },
      },
    });

    const totalCalls = records.length;
    const successfulCalls = records.filter((r) => r.success).length;
    const rateLimitHits = records.filter((r) => r.rate_limit_hit).length;
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const totalWaitTime = records.reduce((sum, r) => sum + r.total_wait_time, 0);
    const slowCalls = records.filter((r) => r.duration > 3000).length;

    return {
      totalCalls,
      successRate: totalCalls > 0 ? successfulCalls / totalCalls : 0,
      averageDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
      rateLimitHitRate: totalCalls > 0 ? rateLimitHits / totalCalls : 0,
      averageWaitTime: totalCalls > 0 ? totalWaitTime / totalCalls : 0,
      slowCallCount: slowCalls,
    };
  }

  /**
   * Get overall system performance metrics
   */
  static async getSystemMetrics(hours: number = 24): Promise<{
    totalApiCalls: number;
    overallSuccessRate: number;
    totalRateLimitHits: number;
    totalWaitTime: number;
    endpointsWithHighWaitTime: Array<{ endpoint: string; avgWaitTime: number }>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const records = await prisma.performance_telemetry.findMany({
      where: {
        timestamp: { gte: since },
      },
    });

    const totalApiCalls = records.length;
    const successfulCalls = records.filter((r) => r.success).length;
    const totalRateLimitHits = records.filter((r) => r.rate_limit_hit).length;
    const totalWaitTime = records.reduce((sum, r) => sum + r.total_wait_time, 0);

    // Group by endpoint to find high wait time endpoints
    const endpointWaitTimes = records.reduce((acc, record) => {
      if (!acc[record.endpoint]) {
        acc[record.endpoint] = { total: 0, count: 0 };
      }
      acc[record.endpoint].total += record.total_wait_time;
      acc[record.endpoint].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const endpointsWithHighWaitTime = Object.entries(endpointWaitTimes)
      .map(([endpoint, data]) => ({
        endpoint,
        avgWaitTime: data.total / data.count,
      }))
      .filter((e) => e.avgWaitTime > 5000)
      .sort((a, b) => b.avgWaitTime - a.avgWaitTime);

    return {
      totalApiCalls,
      overallSuccessRate: totalApiCalls > 0 ? successfulCalls / totalApiCalls : 0,
      totalRateLimitHits,
      totalWaitTime,
      endpointsWithHighWaitTime,
    };
  }

  /**
   * Clean up old telemetry data (keep last 30 days)
   */
  static async cleanup(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await prisma.performance_telemetry.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    console.log(`🧹 Cleaned up ${result.count} old telemetry records`);
    return result.count;
  }
}

/**
 * Helper function to wrap async functions with telemetry tracking
 */
export async function withTelemetry<T>(
  endpoint: string,
  fn: (telemetry: PerformanceTelemetry) => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const telemetry = new PerformanceTelemetry(endpoint);

  try {
    const result = await fn(telemetry);
    await telemetry.recordSuccess(metadata);
    return result;
  } catch (error) {
    await telemetry.recordFailure(error as Error, metadata);
    throw error;
  }
}

