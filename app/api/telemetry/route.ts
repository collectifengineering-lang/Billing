import { NextRequest, NextResponse } from 'next/server';
import { PerformanceTelemetry } from '@/lib/telemetry';
import { optimizedZohoService } from '@/lib/zohoOptimized';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const endpoint = searchParams.get('endpoint');

    // Get system-wide metrics
    const systemMetrics = await PerformanceTelemetry.getSystemMetrics(hours);

    // Get endpoint-specific analytics if endpoint parameter is provided
    let endpointAnalytics = null;
    if (endpoint) {
      endpointAnalytics = await PerformanceTelemetry.getAnalytics(endpoint, hours);
    }

    // Get cache statistics
    const cacheStats = await optimizedZohoService.getCacheStats();

    return NextResponse.json({
      success: true,
      timeRange: `Last ${hours} hours`,
      systemMetrics,
      endpointAnalytics,
      cacheStats,
    });
  } catch (error) {
    console.error('Error fetching telemetry:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch telemetry data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'cleanup-telemetry') {
      const daysToKeep = parseInt(searchParams.get('days') || '30', 10);
      const deleted = await PerformanceTelemetry.cleanup(daysToKeep);
      
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${deleted} old telemetry records`,
        deleted,
      });
    }

    if (action === 'clear-cache') {
      await optimizedZohoService.clearAllCaches();
      
      return NextResponse.json({
        success: true,
        message: 'All caches cleared successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use ?action=cleanup-telemetry or ?action=clear-cache',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in telemetry DELETE:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

