import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

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
      return NextResponse.json([]);
    }
    
    const closedProjects = await prisma.closedProject.findMany();
    // Transform to array format for Set conversion
    const formatted = closedProjects.map(cp => cp.projectId);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching closed projects:', error);
    return NextResponse.json({ error: 'Failed to fetch closed projects' }, { status: 500 });
  }
}

// POST: Add closed project
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
      update: {}, // No update needed for closed projects
      create: { projectId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding closed project:', error);
    return NextResponse.json({ error: 'Failed to add closed project' }, { status: 500 });
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
  } catch (error) {
    console.error('Error removing closed project:', error);
    return NextResponse.json({ error: 'Failed to remove closed project' }, { status: 500 });
  }
} 