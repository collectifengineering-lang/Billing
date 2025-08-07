import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all projections
export async function GET() {
  try {
    console.log('Fetching projections from database...');
    const projections = await prisma.projection.findMany();
    console.log('Fetched', projections.length, 'projections from database');
    
    // Transform to record format: { projectId: { month: value } }
    const formatted = projections.reduce((acc, projection) => {
      if (!acc[projection.projectId]) acc[projection.projectId] = {};
      acc[projection.projectId][projection.month] = projection.value;
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
  // Parse request data once and store it
  const requestData = await request.json();
  const { projectId, month, value } = requestData;
  
  try {
    console.log('Updating projection for project:', projectId, 'month:', month);
    
    await prisma.projection.upsert({
      where: { projectId_month: { projectId, month } },
      update: { value },
      create: { projectId, month, value },
    });
    
    console.log('Projection updated successfully');
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