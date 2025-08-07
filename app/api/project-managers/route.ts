import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all project managers
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
      console.log('Tables do not exist yet, returning empty project managers');
      return NextResponse.json({});
    }
    
    const projectManagers = await prisma.projectManager.findMany();
    // Transform to record format: { id: { name, color } }
    const formatted = projectManagers.reduce((acc, pm) => {
      acc[pm.id] = { name: pm.name, color: pm.color };
      return acc;
    }, {} as Record<string, { name: string; color: string }>);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching project managers:', error);
    return NextResponse.json({ error: 'Failed to fetch project managers' }, { status: 500 });
  }
}

// POST: Update or create project manager
export async function POST(request: Request) {
  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  try {
    const { id, name, color } = await request.json();
    
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
      console.log('Attempting to create table by inserting data...');
    }
    
    await prisma.projectManager.upsert({
      where: { id },
      update: { name, color },
      create: { id, name, color },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project manager:', error);
    return NextResponse.json({ error: 'Failed to update project manager' }, { status: 500 });
  }
} 