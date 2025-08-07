import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// GET: Fetch all statuses
export async function GET() {
  try {
    console.log('Fetching statuses from database...');
    
    const statuses = await prisma.status.findMany();
    console.log(`Found ${statuses.length} statuses`);
    
    // Transform to record format: { projectId: { month: status } }
    const formatted = statuses.reduce((acc, s) => {
      if (!acc[s.projectId]) acc[s.projectId] = {};
      acc[s.projectId][s.month] = s.status;
      return acc;
    }, {} as Record<string, Record<string, string>>);
    
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching statuses:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty statuses');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch statuses',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}

// POST: Update or create status
export async function POST(request: Request) {
  // Parse request data once and store it
  const requestData = await request.json();
  const { projectId, month, status } = requestData;
  
  try {
    console.log(`Updating status: ${projectId}, ${month}, ${status}`);
    
    await prisma.status.upsert({
      where: { projectId_month: { projectId, month } },
      update: { status },
      create: { projectId, month, status },
    });
    
    console.log('Status updated successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating status:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
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
        
        // Now try the original operation again using the stored data
        await prisma.status.upsert({
          where: { projectId_month: { projectId, month } },
          update: { status },
          create: { projectId, month, status },
        });
        
        console.log('Status updated successfully after schema creation');
        return NextResponse.json({ success: true });
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        console.error('Create error code:', createError.code);
        console.error('Create error message:', createError.message);
        
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.',
          details: createError.message,
          code: createError.code
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to update status',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
} 