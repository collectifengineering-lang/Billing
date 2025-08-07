import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all signed fees
export async function GET() {
  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  try {
    console.log('Fetching signed fees from database...');
    
    const signedFees = await prisma.signedFee.findMany();
    console.log(`Found ${signedFees.length} signed fees`);
    
    // Transform to record format: { projectId: value }
    const formatted = signedFees.reduce((acc, sf) => {
      acc[sf.projectId] = sf.value;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching signed fees:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty signed fees');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch signed fees',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}

// POST: Update or create signed fee
export async function POST(request: Request) {
  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  // Parse request data once and store it
  const requestData = await request.json();
  const { projectId, value } = requestData;
  
  try {
    console.log(`Updating signed fee: ${projectId}, ${value}`);
    
    await prisma.signedFee.upsert({
      where: { projectId },
      update: { value },
      create: { projectId, value },
    });
    
    console.log('Signed fee updated successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating signed fee:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
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
        
        // Now try the original operation again using the stored data
        await prisma.signedFee.upsert({
          where: { projectId },
          update: { value },
          create: { projectId, value },
        });
        
        console.log('Signed fee updated successfully after schema creation');
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
      error: 'Failed to update signed fee',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
} 