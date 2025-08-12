import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '@/lib/zoho';

export async function GET(request: NextRequest) {
  try {
    console.info('🔄 Fetching projects from Zoho...');
    
    const projects = await zohoService.getProjects();
    
    if (projects.length === 0) {
      console.warn('⚠️ No projects returned from Zoho - this may indicate an API issue or rate limiting');
      
      // Return a more informative response instead of empty data
      return NextResponse.json({
        success: false,
        count: 0,
        data: [],
        message: 'No projects found. This may be due to Zoho API rate limiting or authentication issues.',
        timestamp: new Date().toISOString(),
        suggestions: [
          'Check Zoho API rate limits (100 requests/minute)',
          'Verify authentication credentials',
          'Try again in a few minutes'
        ]
      });
    }
    
    console.info(`✅ Successfully fetched ${projects.length} projects from Zoho`);
    
    return NextResponse.json({
      success: true,
      count: projects.length,
      data: projects,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching projects from Zoho:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Check if it's a rate limiting error
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
      return NextResponse.json({
        success: false,
        count: 0,
        data: [],
        error: 'Zoho API rate limit exceeded',
        message: 'Too many requests to Zoho API. Please try again in a few minutes.',
        timestamp: new Date().toISOString(),
        retryAfter: '2-5 minutes',
        suggestions: [
          'Wait a few minutes before retrying',
          'Check your Zoho API usage',
          'Consider implementing request caching'
        ]
      }, { status: 429 });
    }
    
    // Check if it's an authentication error
    if (error.message?.includes('authentication') || error.message?.includes('token')) {
      return NextResponse.json({
        success: false,
        count: 0,
        data: [],
        error: 'Zoho authentication failed',
        message: 'Failed to authenticate with Zoho API. Please check your credentials.',
        timestamp: new Date().toISOString(),
        suggestions: [
          'Verify Zoho OAuth credentials',
          'Check environment variables',
          'Refresh authentication tokens'
        ]
      }, { status: 401 });
    }
    
    // Generic error response
    return NextResponse.json({
      success: false,
      count: 0,
      data: [],
      error: 'Failed to fetch projects',
      message: error.message || 'An unexpected error occurred while fetching projects',
      timestamp: new Date().toISOString(),
      suggestions: [
        'Check Vercel logs for detailed error information',
        'Verify Zoho API configuration',
        'Contact support if the issue persists'
      ]
    }, { status: 500 });
  }
} 