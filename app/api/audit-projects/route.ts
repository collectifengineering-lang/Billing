import { NextRequest, NextResponse } from 'next/server';
import { projectMappingService } from '@/lib/projectMapping';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

/**
 * API endpoint to audit project mappings between Clockify and Zoho
 * Returns a comprehensive report of orphaned projects, naming inconsistencies, etc.
 */
export async function GET(request: NextRequest) {
  try {
    console.info('🔍 Starting project mapping audit...');
    
    // Sync projects and get report
    const syncReport = await projectMappingService.syncProjects();
    
    // Extract orphaned and problematic projects
    const orphanedProjects = syncReport.mappings.filter(m => m.status === 'orphaned');
    const clockifyOnlyProjects = syncReport.mappings.filter(m => m.status === 'clockify-only');
    const zohoOnlyProjects = syncReport.mappings.filter(m => m.status === 'zoho-only');
    const archivedProjects = syncReport.mappings.filter(m => m.archived);
    
    // Identify naming inconsistencies (synced projects with different names)
    const namingInconsistencies = syncReport.mappings
      .filter(m => m.status === 'synced' && m.clockifyName !== m.zohoName)
      .map(m => ({
        clockifyId: m.clockifyId,
        clockifyName: m.clockifyName,
        zohoId: m.zohoId,
        zohoName: m.zohoName,
        suggestion: 'Consider renaming one to match the other for consistency'
      }));
    
    const report = {
      summary: {
        totalProjects: syncReport.totalProjects,
        syncedProjects: syncReport.syncedProjects,
        clockifyOnlyProjects: syncReport.clockifyOnlyProjects,
        zohoOnlyProjects: syncReport.zohoOnlyProjects,
        orphanedProjects: syncReport.orphanedProjects,
        archivedProjects: syncReport.archivedProjects,
        namingInconsistencies: namingInconsistencies.length
      },
      orphanedProjects: orphanedProjects.map(p => ({
        id: p.clockifyId || p.zohoId,
        name: p.name,
        source: p.clockifyId ? 'clockify' : 'zoho',
        archived: p.archived,
        suggestion: p.archived 
          ? 'Archived project - can be safely ignored or cleaned up'
          : 'Create corresponding project in the other system or mark as archived'
      })),
      clockifyOnlyProjects: clockifyOnlyProjects.map(p => ({
        clockifyId: p.clockifyId,
        name: p.clockifyName,
        archived: p.archived,
        suggestion: 'Create corresponding project in Zoho or mark as archived'
      })),
      zohoOnlyProjects: zohoOnlyProjects.map(p => ({
        zohoId: p.zohoId,
        name: p.zohoName,
        archived: p.archived,
        suggestion: 'Create corresponding project in Clockify or mark as inactive'
      })),
      archivedProjects: archivedProjects.map(p => ({
        id: p.clockifyId || p.zohoId,
        name: p.name,
        source: p.clockifyId ? (p.zohoId ? 'both' : 'clockify') : 'zoho',
        suggestion: 'Consider filtering out from reports to reduce noise'
      })),
      namingInconsistencies,
      timestamp: syncReport.timestamp
    };
    
    console.info('✅ Project audit complete:', {
      total: report.summary.totalProjects,
      synced: report.summary.syncedProjects,
      orphaned: report.summary.orphanedProjects,
      inconsistencies: report.summary.namingInconsistencies
    });
    
    return NextResponse.json({
      success: true,
      data: report
    });
    
  } catch (error: any) {
    console.error('❌ Error in project audit:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to audit project mappings',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}

