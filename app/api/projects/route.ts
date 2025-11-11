import { NextRequest } from 'next/server';
import { zohoService } from '@/lib/zoho';
import { createSuccessResponse, createErrorResponse, handleApiError, ErrorType } from '@/lib/api-errors';

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const projects = await zohoService.getProjects();
    
    if (projects.length === 0) {
      return createErrorResponse(
        new Error('No projects found'),
        {
          statusCode: 404,
          customMessage: 'No projects found. This may be due to Zoho API rate limiting or authentication issues.',
          customSuggestions: [
            'Check Zoho API rate limits (100 requests/minute)',
            'Verify authentication credentials',
            'Try again in a few minutes'
          ]
        }
      );
    }
    
    return createSuccessResponse(projects, { count: projects.length });
    
  } catch (error: unknown) {
    return handleApiError(error);
  }
} 