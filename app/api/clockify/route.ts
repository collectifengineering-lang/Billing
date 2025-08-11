import { NextRequest, NextResponse } from 'next/server';
import { clockifyService, fetchAllClockifyTimeSummaries } from '../../../lib/clockify';
import { enhanceBillingDataWithClockify } from '../../../lib/utils';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

// Helper function to provide configuration recommendations
function getConfigRecommendations(configStatus: any, envVars: any) {
  const recommendations = [];
  
  if (!envVars.hasApiKey) {
    recommendations.push('Set CLOCKIFY_API_KEY environment variable');
  }
  
  if (!envVars.hasWorkspaceId) {
    recommendations.push('Set CLOCKIFY_WORKSPACE_ID environment variable');
  }
  
  if (envVars.apiKeyLength < 20) {
    recommendations.push('CLOCKIFY_API_KEY appears to be too short - verify it\'s correct');
  }
  
  if (envVars.workspaceIdLength < 20) {
    recommendations.push('CLOCKIFY_WORKSPACE_ID appears to be too short - verify it\'s correct');
  }
  
  if (envVars.hasApiKey && envVars.hasWorkspaceId && !configStatus.configured) {
    recommendations.push('Check if API key and workspace ID are valid and accessible');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Configuration appears correct - check Clockify API status');
  }
  
  return recommendations;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const action = searchParams.get('action');

    // Check if Clockify is configured
    if (!clockifyService.isConfigured()) {
      return NextResponse.json({
        error: 'Clockify not configured',
        configStatus: clockifyService.getConfigStatus(),
      }, { status: 400 });
    }

    switch (action) {
      case 'status':
        return NextResponse.json({
          configured: clockifyService.isConfigured(),
          configStatus: clockifyService.getConfigStatus(),
        });

      case 'projects':
        const projects = await clockifyService.getProjects();
        return NextResponse.json({ projects });

      case 'time-summaries':
        if (!startDate || !endDate) {
          return NextResponse.json({
            error: 'startDate and endDate are required for time summaries',
          }, { status: 400 });
        }
        
        const timeSummaries = await fetchAllClockifyTimeSummaries(startDate, endDate);
        return NextResponse.json({ timeSummaries });

      case 'user':
        const user = await clockifyService.getUser();
        return NextResponse.json({ user });

      case 'workspaces':
        const workspaces = await clockifyService.getWorkspaces();
        return NextResponse.json({ workspaces });

      case 'test-connection':
        try {
          const user = await clockifyService.getUser();
          const workspaces = await clockifyService.getWorkspaces();
          return NextResponse.json({ 
            success: true, 
            user, 
            workspaces,
            message: 'Connection successful'
          });
        } catch (error: any) {
          return NextResponse.json({ 
            success: false, 
            error: error.message 
          }, { status: 400 });
        }

      case 'validate-config':
        const configStatus = clockifyService.getConfigStatus();
        const envVars = {
          hasApiKey: !!process.env.CLOCKIFY_API_KEY,
          hasWorkspaceId: !!process.env.CLOCKIFY_WORKSPACE_ID,
          apiKeyLength: process.env.CLOCKIFY_API_KEY?.length || 0,
          workspaceIdLength: process.env.CLOCKIFY_WORKSPACE_ID?.length || 0,
          apiKeyPreview: process.env.CLOCKIFY_API_KEY ? 
            `${process.env.CLOCKIFY_API_KEY.substring(0, 8)}...` : 'Not set',
          workspaceIdPreview: process.env.CLOCKIFY_WORKSPACE_ID ? 
            `${process.env.CLOCKIFY_WORKSPACE_ID.substring(0, 8)}...` : 'Not set'
        };
        
        return NextResponse.json({
          configStatus,
          environmentVariables: envVars,
          recommendations: getConfigRecommendations(configStatus, envVars)
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: status, projects, time-summaries, user, workspaces, test-connection',
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Clockify API error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch Clockify data',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'enhance-billing-data':
        const { billingData, clockifyReports } = data;
        const enhancedData = enhanceBillingDataWithClockify(billingData, clockifyReports);
        return NextResponse.json({ enhancedData });

      case 'set-workspace':
        const { workspaceId } = data;
        if (workspaceId) {
          clockifyService.setWorkspaceId(workspaceId);
          return NextResponse.json({ success: true, message: 'Workspace set successfully' });
        } else {
          return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
        }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: enhance-billing-data, set-workspace',
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Clockify POST error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to process Clockify data',
    }, { status: 500 });
  }
}
