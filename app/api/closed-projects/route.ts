import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { ensureDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all closed projects
export async function GET() {
  try {
    // Ensure database schema exists
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      // Tables don't exist yet, return empty data
      console.log('Tables do not exist yet, returning empty closed projects');
      return NextResponse.json({});
    }
    
    const closedProjects = await prisma.closedProject.findMany();
    // Transform to array format for easier handling
    const formatted = closedProjects.map(cp => cp.projectId);
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching closed projects:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty closed projects');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ error: 'Failed to fetch closed projects' }, { status: 500 });
  }
}

// POST: Update or create closed project
export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
      console.log('Attempting to create table by inserting data...');
    }
    
    await prisma.closedProject.upsert({
      where: { projectId },
      update: {}, // No updates needed for closed projects
      create: { projectId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating closed project:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.closedProject.create({
          data: {
            projectId: '__test__'
          }
        });
        
        // Delete test data
        await prisma.closedProject.deleteMany({
          where: {
            projectId: '__test__'
          }
        });
        
        // Now try the original operation again
        await prisma.closedProject.upsert({
          where: { projectId },
          update: {},
          create: { projectId },
        });
        
        return NextResponse.json({ success: true });
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to update closed project' }, { status: 500 });
  }
}

// DELETE: Remove closed project
export async function DELETE(request: Request) {
  try {
    const { projectId } = await request.json();
    
    await prisma.closedProject.delete({
      where: { projectId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing closed project:', error);
    return NextResponse.json({ error: 'Failed to remove closed project' }, { status: 500 });
  }
} 