import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { ensureDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch project status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Ensure database schema exists
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      return NextResponse.json({ status: 'active' });
    }
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true }
    });
    
    return NextResponse.json({ 
      projectId, 
      status: project?.status || 'active' 
    });
  } catch (error: unknown) {
    console.error('Error fetching project status:', error);
    
    // If it's a table doesn't exist error, return default status
    if (error instanceof Error && (error.message?.includes('does not exist') || 'code' in error && (error as any).code === 'P2021')) {
      return NextResponse.json({ status: 'active' });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch project status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Update project status
export async function POST(request: Request) {
  const requestData = await request.json();
  const { projectId, status } = requestData;
  
  if (!projectId || !status) {
    return NextResponse.json({ error: 'Project ID and status are required' }, { status: 400 });
  }
  
  if (!['active', 'closed', 'completed', 'on-hold'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Must be: active, closed, completed, or on-hold' }, { status: 400 });
  }
  
  try {
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
    }
    
    const project = await prisma.project.upsert({
      where: { id: projectId },
      update: { 
        status,
        updatedAt: new Date()
      },
      create: { 
        id: projectId,
        name: `Project ${projectId}`, // Default name, will be updated when project data is synced
        status
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      projectId: project.id,
      status: project.status
    });
  } catch (error: unknown) {
    console.error('Error updating project status:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error instanceof Error && (error.message?.includes('does not exist') || 'code' in error && (error as any).code === 'P2021')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.project.create({
          data: {
            id: '__test__',
            name: 'Test Project',
            status: 'active'
          }
        });
        
        // Delete test data
        await prisma.project.deleteMany({
          where: {
            id: '__test__'
          }
        });
        
        // Now try the original operation again
        const project = await prisma.project.upsert({
          where: { id: projectId },
          update: { 
            status,
            updatedAt: new Date()
          },
          create: { 
            id: projectId,
            name: `Project ${projectId}`,
            status
          },
        });
        
        return NextResponse.json({ 
          success: true, 
          projectId: project.id,
          status: project.status
        });
      } catch (createError: unknown) {
        console.error('Failed to create table:', createError);
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to update project status' }, { status: 500 });
  }
}

