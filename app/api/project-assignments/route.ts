import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all project assignments
export async function GET() {
  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  try {
    // Ensure database schema exists
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      // Tables don't exist yet, return empty data
      console.log('Tables do not exist yet, returning empty project assignments');
      return NextResponse.json({});
    }
    
    const projectAssignments = await prisma.projectAssignment.findMany();
    // Transform to record format: { projectId: managerId }
    const formatted = projectAssignments.reduce((acc, pa) => {
      acc[pa.projectId] = pa.managerId;
      return acc;
    }, {} as Record<string, string>);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching project assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch project assignments' }, { status: 500 });
  }
}

// POST: Update or create project assignment
export async function POST(request: Request) {
  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  try {
    const { projectId, managerId } = await request.json();
    
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
      console.log('Attempting to create table by inserting data...');
    }
    
    await prisma.projectAssignment.upsert({
      where: { projectId },
      update: { managerId },
      create: { projectId, managerId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project assignment:', error);
    return NextResponse.json({ error: 'Failed to update project assignment' }, { status: 500 });
  }
}

// DELETE: Remove project assignment
export async function DELETE(request: Request) {
  try {
    const { projectId } = await request.json();
    await prisma.projectAssignment.delete({
      where: { projectId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing project assignment:', error);
    return NextResponse.json({ error: 'Failed to remove project assignment' }, { status: 500 });
  }
} 