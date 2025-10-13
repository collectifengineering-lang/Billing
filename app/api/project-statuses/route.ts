import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { ensureDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all project statuses
export async function GET() {
  try {
    // Ensure database schema exists
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      return NextResponse.json({});
    }
    
    const projects = await prisma.projects.findMany({
      select: { id: true, status: true }
    });
    
    // Transform to object format for easier handling
    const statusMap = projects.reduce((acc, project) => {
      acc[project.id] = project.status;
      return acc;
    }, {} as Record<string, string>);
    
    return NextResponse.json(statusMap);
  } catch (error: unknown) {
    console.error('Error fetching all project statuses:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error instanceof Error && (error.message?.includes('does not exist') || 'code' in error && (error as any).code === 'P2021')) {
      return NextResponse.json({});
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch project statuses',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
