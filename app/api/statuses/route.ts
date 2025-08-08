import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all statuses
export async function GET() {
  try {
    console.log('Fetching statuses from database...');
    const statuses = await prisma.status.findMany();
    console.log('Fetched', statuses.length, 'statuses from database');
    
    // Transform to record format: { projectId: { month: status } }
    const formatted = statuses.reduce((acc, status) => {
      if (!acc[status.projectId]) acc[status.projectId] = {};
      acc[status.projectId][status.month] = status.status;
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
  // Parse request data once and store it
  const requestData = await request.json();
  const { projectId, month, status } = requestData;
  
  try {
    console.log('Updating status for project:', projectId, 'month:', month);
    
    await prisma.status.upsert({
      where: { projectId_month: { projectId, month } },
      update: { status },
      create: { projectId, month, status },
    });
    
    console.log('Status updated successfully');
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
            status: 'test'
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

// DELETE: Remove status
export async function DELETE(request: Request) {
  const requestData = await request.json();
  const { projectId, month } = requestData as { projectId: string; month: string };
  
  try {
    await prisma.status.delete({
      where: { projectId_month: { projectId, month } },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // If the record doesn't exist, treat as success (idempotent clear)
    if (error.code === 'P2025') {
      return NextResponse.json({ success: true });
    }
    console.error('Error deleting status:', error);
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
  }
}