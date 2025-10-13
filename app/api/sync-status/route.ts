import { NextRequest, NextResponse } from 'next/server';
import { projectMappingService } from '@/lib/projectMapping';
import { clockifyService } from '@/lib/clockify';
import { zohoService } from '@/lib/zoho';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * API endpoint to get the current synchronization status
 * Returns health check information for Clockify, Zoho, and project mappings
 */
export async function GET(request: NextRequest) {
  try {
    console.info('🔍 Checking synchronization status...');
    
    // Check if services are configured
    const clockifyConfigured = clockifyService.isConfigured();
    const zohoConfigured = zohoService.getStatus();
    
    // Get current mappings (this will sync if cache is stale)
    const syncReport = await projectMappingService.syncProjects();
    
    // Calculate health scores
    const totalProjects = syncReport.totalProjects;
    const syncedProjects = syncReport.syncedProjects;
    const orphanedProjects = syncReport.orphanedProjects;
    const archivedProjects = syncReport.archivedProjects;
    
    // Health score: 100% if all active projects are synced
    const activeProjects = totalProjects - archivedProjects;
    const syncHealthScore = activeProjects > 0 
      ? Math.round((syncedProjects / activeProjects) * 100) 
      : 100;
    
    // Determine overall health status
    let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let healthMessage = 'All systems operational';
    
    if (!clockifyConfigured || !zohoConfigured.hasToken) {
      healthStatus = 'error';
      healthMessage = 'API configuration issues detected';
    } else if (syncHealthScore < 80) {
      healthStatus = 'warning';
      healthMessage = 'Low sync rate - review orphaned projects';
    } else if (orphanedProjects > 10) {
      healthStatus = 'warning';
      healthMessage = 'High number of orphaned projects';
    }
    
    const status = {
      status: healthStatus,
      message: healthMessage,
      timestamp: new Date().toISOString(),
      services: {
        clockify: {
          configured: clockifyConfigured,
          status: clockifyConfigured ? 'operational' : 'not configured'
        },
        zoho: {
          configured: zohoConfigured.hasToken,
          tokenExpires: zohoConfigured.expiresIn > 0 
            ? `in ${Math.round(zohoConfigured.expiresIn / 60000)} minutes`
            : 'expired',
          status: zohoConfigured.hasToken && !zohoConfigured.isExpired 
            ? 'operational' 
            : 'token expired or missing'
        }
      },
      synchronization: {
        totalProjects,
        syncedProjects,
        clockifyOnlyProjects: syncReport.clockifyOnlyProjects,
        zohoOnlyProjects: syncReport.zohoOnlyProjects,
        orphanedProjects,
        archivedProjects,
        healthScore: syncHealthScore,
        lastSyncedAt: syncReport.timestamp
      },
      recommendations: generateRecommendations(syncReport, clockifyConfigured, zohoConfigured)
    };
    
    console.info('✅ Sync status check complete:', {
      health: healthStatus,
      score: syncHealthScore,
      synced: syncedProjects,
      total: totalProjects
    });
    
    return NextResponse.json({
      success: true,
      data: status
    });
    
  } catch (error: any) {
    console.error('❌ Error checking sync status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check synchronization status',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}

/**
 * Generate actionable recommendations based on sync status
 */
function generateRecommendations(
  syncReport: any,
  clockifyConfigured: boolean,
  zohoConfigured: any
): string[] {
  const recommendations: string[] = [];
  
  if (!clockifyConfigured) {
    recommendations.push('🔧 Configure Clockify API credentials in environment variables');
  }
  
  if (!zohoConfigured.hasToken || zohoConfigured.isExpired) {
    recommendations.push('🔧 Refresh Zoho API token - check authentication configuration');
  }
  
  if (syncReport.orphanedProjects > 5) {
    recommendations.push(
      `📋 Review ${syncReport.orphanedProjects} orphaned projects - run audit: npm run audit:projects`
    );
  }
  
  if (syncReport.archivedProjects > 20) {
    recommendations.push(
      `🗄️ Consider cleaning up ${syncReport.archivedProjects} archived projects to reduce noise`
    );
  }
  
  const activeProjects = syncReport.totalProjects - syncReport.archivedProjects;
  const syncRate = activeProjects > 0 ? (syncReport.syncedProjects / activeProjects) * 100 : 100;
  
  if (syncRate < 80) {
    recommendations.push(
      '⚠️ Low sync rate detected - create missing projects in Clockify or Zoho'
    );
  }
  
  if (syncReport.clockifyOnlyProjects > 3) {
    recommendations.push(
      `📊 ${syncReport.clockifyOnlyProjects} projects exist only in Clockify - consider syncing to Zoho`
    );
  }
  
  if (syncReport.zohoOnlyProjects > 3) {
    recommendations.push(
      `📊 ${syncReport.zohoOnlyProjects} projects exist only in Zoho - consider syncing to Clockify`
    );
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ No issues detected - system is healthy');
  }
  
  return recommendations;
}

