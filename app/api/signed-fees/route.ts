import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all signed fees
export async function GET() {
  try {
    console.log('Fetching signed fees from database...');
    const signedFees = await prisma.signedFee.findMany();
    console.log('Fetched', signedFees.length, 'signed fees from database');
    
    // Transform to record format: { projectId: value }
    const formatted = signedFees.reduce((acc, sf) => {
      acc[sf.projectId] = sf.value;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching signed fees:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('no such table')) {
      console.log('Tables do not exist, returning empty signed fees');
      return NextResponse.json({});
    }
    
    // For any other error, return empty data instead of 500
    console.log('Unknown error, returning empty signed fees');
    return NextResponse.json({});
  }
}

// POST: Update or create signed fee
export async function POST(request: Request) {
  // Parse request data once and store it
  const requestData = await request.json();
  const { projectId, value } = requestData;
  
  try {
    console.log('Updating signed fee for project:', projectId);
    
    await prisma.signedFee.upsert({
      where: { projectId },
      update: { value },
      create: { projectId, value },
    });
    
    console.log('Signed fee updated successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating signed fee:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.signedFee.create({
          data: {
            projectId: '__test__',
            value: 0
          }
        });
        
        // Delete test data
        await prisma.signedFee.deleteMany({
          where: {
            projectId: '__test__'
          }
        });
        
        // Now try the original operation again
        await prisma.signedFee.upsert({
          where: { projectId },
          update: { value },
          create: { projectId, value },
        });
        
        return NextResponse.json({ success: true });
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to update signed fee' }, { status: 500 });
  }
} 