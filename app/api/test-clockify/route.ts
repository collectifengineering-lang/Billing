import { NextRequest, NextResponse } from 'next/server';
import clockifyService from '@/lib/clockify';

// Helper function to parse duration strings (e.g., "PT2H30M")
function parseDuration(duration: string): number {
  if (!duration) return 0;
  
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours + (minutes / 60) + (seconds / 3600);
}

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Clockify service...');
    
    // Check environment variables
    console.log('🔑 Environment variables:');
    console.log('CLOCKIFY_API_KEY:', process.env.CLOCKIFY_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('CLOCKIFY_WORKSPACE_ID:', process.env.CLOCKIFY_WORKSPACE_ID ? '✅ Set' : '❌ Missing');
    
    // Check service configuration
    const configStatus = clockifyService.getConfigurationStatus();
    console.log('📋 Service config status:', configStatus);
    
    if (!configStatus.configured) {
      return NextResponse.json({
        success: false,
        error: 'Clockify service not configured',
        configStatus,
        environment: {
          hasApiKey: !!process.env.CLOCKIFY_API_KEY,
          hasWorkspaceId: !!process.env.CLOCKIFY_WORKSPACE_ID
        }
      });
    }
    
    // Test basic service methods
    console.log('⏰ Testing Clockify service methods...');
    
    try {
      const user = await clockifyService.getUser();
      console.log('✅ User fetch successful:', { id: user.id, name: user.name });
      
      const projects = await clockifyService.getProjects();
      console.log('✅ Projects fetch successful:', { count: projects.length });
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      
      const timeEntries = await clockifyService.getAllTimeEntries(
        startDate.toISOString(),
        endDate.toISOString()
      );
      console.log('✅ Time entries fetch successful:', { count: timeEntries.length });
      
      // Analyze duration data
      const durationAnalysis = timeEntries.reduce((acc, entry) => {
        const duration = entry.timeInterval?.duration || 'PT0H0M';
        const hours = parseDuration(duration);
        acc.totalHours += hours;
        acc.billableHours += entry.billable ? hours : 0;
        acc.entriesWithZeroDuration += hours === 0 ? 1 : 0;
        acc.entriesWithValidDuration += hours > 0 ? 1 : 0;
        return acc;
      }, { totalHours: 0, billableHours: 0, entriesWithZeroDuration: 0, entriesWithValidDuration: 0 });
      
      // Sample entries with different duration patterns
      const sampleEntries = timeEntries.slice(0, 5).map(entry => ({
        id: entry.id,
        description: entry.description,
        billable: entry.billable,
        duration: entry.timeInterval?.duration,
        startTime: entry.timeInterval?.start,
        endTime: entry.timeInterval?.end,
        hours: parseDuration(entry.timeInterval?.duration || 'PT0H0M'),
        rawEntry: entry // Include raw entry data for debugging
      }));
      
      return NextResponse.json({
        success: true,
        message: 'Clockify service test successful',
        configStatus,
        data: {
          user: { id: user.id, name: user.name },
          projectsCount: projects.length,
          timeEntriesCount: timeEntries.length,
          durationAnalysis,
          sampleEntries
        }
      });
      
    } catch (serviceError) {
      console.error('❌ Clockify service method error:', serviceError);
      return NextResponse.json({
        success: false,
        error: 'Clockify service method failed',
        message: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        configStatus
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
