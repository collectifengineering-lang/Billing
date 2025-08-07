import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { ensureDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all project managers
export async function GET() {
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
  } catch (error: any) {
    console.error('Error fetching project managers:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty project managers');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ error: 'Failed to fetch project managers' }, { status: 500 });
  }
}

// POST: Update or create project manager
export async function POST(request: Request) {
  const requestData = await request.json();
  const { id, name, color } = requestData;
  
  try {
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
  } catch (error: unknown) {
    console.error('Error updating project manager:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error instanceof Error && (error.message?.includes('does not exist') || 'code' in error && (error as any).code === 'P2021')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.projectManager.create({
          data: {
            id: '__test__',
            name: 'test',
            color: '#000000'
          }
        });
        
        // Delete test data
        await prisma.projectManager.deleteMany({
          where: {
            id: '__test__'
          }
        });
        
        // Now try the original operation again
        await prisma.projectManager.upsert({
          where: { id },
          update: { name, color },
          create: { id, name, color },
        });
        
        return NextResponse.json({ success: true });
      } catch (createError: unknown) {
        console.error('Failed to create table:', createError);
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to update project manager' }, { status: 500 });
  }
} 