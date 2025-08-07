import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// GET: Fetch all projections
export async function GET() {
  try {
    // Ensure database schema exists
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      // Tables don't exist yet, return empty data
      console.log('Tables do not exist yet, returning empty projections');
      return NextResponse.json({});
    }
    
    const projections = await prisma.projection.findMany();
    // Transform to record format: { projectId: { month: value } }
    const formatted = projections.reduce((acc, p) => {
      if (!acc[p.projectId]) acc[p.projectId] = {};
      acc[p.projectId][p.month] = p.value;
      return acc;
    }, {} as Record<string, Record<string, number>>);
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching projections:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty projections');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ error: 'Failed to fetch projections' }, { status: 500 });
  }
}

// POST: Update or create projection
export async function POST(request: Request) {
  try {
    const { projectId, month, value } = await request.json();
    
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
      console.log('Attempting to create table by inserting data...');
    }
    
    // This will create the table if it doesn't exist (Prisma Accelerate behavior)
    await prisma.projection.upsert({
      where: { projectId_month: { projectId, month } },
      update: { value },
      create: { projectId, month, value },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating projection:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.projection.create({
          data: {
            projectId: '__test__',
            month: '__test__',
            value: 0
          }
        });
        
        // Delete test data
        await prisma.projection.deleteMany({
          where: {
            projectId: '__test__',
            month: '__test__'
          }
        });
        
        // Now try the original operation again
        await prisma.projection.upsert({
          where: { projectId_month: { projectId, month } },
          update: { value },
          create: { projectId, month, value },
        });
        
        return NextResponse.json({ success: true });
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to update projection' }, { status: 500 });
  }
} 