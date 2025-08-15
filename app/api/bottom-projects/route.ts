import { NextRequest, NextResponse } from 'next/server';
import { clockifyService } from '@/lib/clockify';
import { zohoService } from '@/lib/zoho';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.info('🔄 Fetching bottom projects data...');
    
    // Get date range from query parameters or use defaults
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || '2025-01-01T00:00:00.000Z';
    const endDate = searchParams.get('end') || new Date().toISOString();
    
    console.info(`📅 Date range: ${startDate} to ${endDate}`);
    
    // Fetch data from both services
    const [clockifyTimeEntries, clockifyProjects, zohoProjects] = await Promise.allSettled([
      clockifyService.getAllTimeEntries(startDate, endDate),
      clockifyService.getProjects(),
      zohoService.getProjects()
    ]);
    
    // Process Clockify time entries
    let timeEntries: any[] = [];
    if (clockifyTimeEntries.status === 'fulfilled') {
      timeEntries = clockifyTimeEntries.value;
      console.info(`✅ Clockify time entries received: ${timeEntries.length} entries`);
      
      // Log sample entry for debugging
      if (timeEntries.length > 0) {
        const sampleEntry = timeEntries[0];
        console.info('📝 Sample Clockify entry:', {
          id: sampleEntry.id,
          projectId: sampleEntry.projectId,
          duration: sampleEntry.timeInterval?.duration,
          description: sampleEntry.description?.substring(0, 50) + '...'
        });
      }
    } else {
      console.error('❌ Clockify time entries failed:', clockifyTimeEntries.reason);
      timeEntries = []; // Use empty array as fallback
    }

    // Process Clockify projects
    let projects: any[] = [];
    if (clockifyProjects.status === 'fulfilled') {
      projects = clockifyProjects.value;
      console.info(`✅ Clockify projects received: ${projects.length} projects`);
      
      // Log sample project for debugging
      if (projects.length > 0) {
        const sampleProject = projects[0];
        console.info('📋 Sample Clockify project:', {
          id: sampleProject.id,
          name: sampleProject.name,
          clientName: sampleProject.clientName
        });
      }
    } else {
      console.error('❌ Clockify projects failed:', clockifyProjects.reason);
      projects = []; // Use empty array as fallback
    }
    
    // Process Zoho projects
    let zohoProjectsData: any[] = [];
    if (zohoProjects.status === 'fulfilled') {
      zohoProjectsData = zohoProjects.value;
      console.info(`✅ Zoho projects received: ${zohoProjectsData.length} projects`);
    } else {
      console.error('❌ Zoho projects failed:', zohoProjects.reason);
      zohoProjectsData = []; // Use empty array as fallback
    }
    
    // Create a map of Clockify project IDs to project details
    const projectMap = new Map();
    projects.forEach(project => {
      projectMap.set(project.id, {
        id: project.id,
        name: project.name || 'Unknown Project',
        clientName: project.clientName || 'Unknown Client',
        billable: project.billable || false,
        archived: project.archived || false
      });
    });

    // Calculate project statistics with proper project names
    const projectStats = new Map();
    
    timeEntries.forEach(entry => {
      try {
        const projectId = entry.projectId;
        if (!projectId) {
          console.warn('⚠️ Time entry missing projectId:', entry.id);
          return;
        }
        
        // Get project details from the map
        const projectDetails = projectMap.get(projectId);
        if (!projectDetails) {
          console.warn(`⚠️ No project details found for projectId: ${projectId}`);
          return;
        }
        
        // Parse duration safely
        let hours = 0;
        const duration = entry.timeInterval?.duration;
        
        if (duration) {
          if (typeof duration === 'string') {
            // Handle ISO 8601 duration format (e.g., "PT1H30M")
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            if (match) {
              const hoursPart = parseInt(match[1] || '0');
              const minutesPart = parseInt(match[2] || '0');
              hours = hoursPart + (minutesPart / 60);
            }
          } else if (typeof duration === 'number') {
            // Handle duration in seconds
            hours = duration / 3600;
          }
        }
        
        if (!projectStats.has(projectId)) {
          projectStats.set(projectId, {
            projectId,
            projectName: projectDetails.name,
            clientName: projectDetails.clientName,
            totalHours: 0,
            billableHours: 0,
            entryCount: 0,
            billable: projectDetails.billable,
            archived: projectDetails.archived
          });
        }
        
        const stats = projectStats.get(projectId);
        stats.totalHours += hours;
        if (entry.billable) {
          stats.billableHours += hours;
        }
        stats.entryCount += 1;
        
      } catch (entryError) {
        console.error('❌ Error processing time entry for stats:', entryError);
        console.error('   Problematic entry:', entry);
      }
    });
    
    // Convert to array and sort by total hours (ascending for bottom projects)
    const bottomProjects = Array.from(projectStats.values())
      .filter(project => !project.archived) // Filter out archived projects
      .sort((a, b) => a.totalHours - b.totalHours) // Sort by ascending hours
      .slice(0, 10) // Bottom 10 projects
      .map(project => ({
        ...project,
        name: project.projectName, // Ensure 'name' field exists for compatibility
        hours: project.totalHours, // Ensure 'hours' field exists for compatibility
        efficiency: project.totalHours > 0 ? (project.billableHours / project.totalHours) * 100 : 0
      }));
    
    console.info(`📊 Calculated stats for ${bottomProjects.length} bottom projects`);
    
    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        bottomProjects,
        timeEntriesCount: timeEntries.length,
        projectsCount: projects.length,
        dateRange: { start: startDate, end: endDate }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error in bottom-projects API:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Return error response with helpful information
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bottom projects data',
      message: error.message || 'An unexpected error occurred',
      details: {
        clockifyStatus: 'Failed to process time entries',
        zohoStatus: 'Failed to fetch projects',
        suggestions: [
          'Check Clockify API configuration and plan level',
          'Verify Zoho authentication and rate limits',
          'Check Vercel logs for detailed error information'
        ]
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
