import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// GET: Fetch all statuses
export async function GET() {
  try {
    // Ensure database schema exists
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      // Tables don't exist yet, return empty data
      console.log('Tables do not exist yet, returning empty statuses');
      return NextResponse.json({});
    }
    
    const statuses = await prisma.status.findMany();
    // Transform to record format: { projectId: { month: status } }
    const formatted = statuses.reduce((acc, s) => {
      if (!acc[s.projectId]) acc[s.projectId] = {};
      acc[s.projectId][s.month] = s.status;
      return acc;
    }, {} as Record<string, Record<string, string>>);
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching statuses:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty statuses');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
  }
}

// POST: Update or create status
export async function POST(request: Request) {
  // Store request data at the beginning so it's accessible throughout the function
  const requestData = await request.json();
  const { projectId, month, status } = requestData;
  
  try {
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
      console.log('Attempting to create table by inserting data...');
    }
    
    await prisma.status.upsert({
      where: { projectId_month: { projectId, month } },
      update: { status },
      create: { projectId, month, status },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating status:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.status.create({
          data: {
            projectId: '__test__',
            month: '__test__',
            status: '__test__'
          }
        });
        
        // Delete test data
        await prisma.status.deleteMany({
          where: {
            projectId: '__test__',
            month: '__test__'
          }
        });
        
        // Now try the original operation again
        await prisma.status.upsert({
          where: { projectId_month: { projectId, month } },
          update: { status },
          create: { projectId, month, status },
        });
        
        return NextResponse.json({ success: true });
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
} 