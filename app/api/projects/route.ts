import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '../../../lib/zoho';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching projects from Zoho');
    const projects = await zohoService.getProjects();
    console.log('API: Fetched', projects.length, 'projects');
    
    return NextResponse.json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error('API: Error fetching projects:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 