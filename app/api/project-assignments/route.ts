import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { ensureDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all project assignments
export async function GET() {
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
  } catch (error: any) {
    console.error('Error fetching project assignments:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty project assignments');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ error: 'Failed to fetch project assignments' }, { status: 500 });
  }
}

// POST: Update or create project assignment
export async function POST(request: Request) {
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
  } catch (error: any) {
    console.error('Error updating project assignment:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.projectAssignment.create({
          data: {
            projectId: '__test__',
            managerId: '__test__'
          }
        });
        
        // Delete test data
        await prisma.projectAssignment.deleteMany({
          where: {
            projectId: '__test__'
          }
        });
        
        // Now try the original operation again
        await prisma.projectAssignment.upsert({
          where: { projectId },
          update: { managerId },
          create: { projectId, managerId },
        });
        
        return NextResponse.json({ success: true });
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.' 
        }, { status: 500 });
      }
    }
    
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
  } catch (error: any) {
    console.error('Error removing project assignment:', error);
    return NextResponse.json({ error: 'Failed to remove project assignment' }, { status: 500 });
  }
} 