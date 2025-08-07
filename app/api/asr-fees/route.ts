import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all ASR fees
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
      console.log('Tables do not exist yet, returning empty ASR fees');
      return NextResponse.json({});
    }
    
    const asrFees = await prisma.asrFee.findMany();
    // Transform to record format: { projectId: value }
    const formatted = asrFees.reduce((acc, af) => {
      acc[af.projectId] = af.value;
      return acc;
    }, {} as Record<string, number>);
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching ASR fees:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty ASR fees');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ error: 'Failed to fetch ASR fees' }, { status: 500 });
  }
}

// POST: Update or create ASR fee
export async function POST(request: Request) {
  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  // Store request data at the beginning so it's accessible throughout the function
  const requestData = await request.json();
  const { projectId, value } = requestData;
  
  try {
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
      console.log('Attempting to create table by inserting data...');
    }
    
    await prisma.asrFee.upsert({
      where: { projectId },
      update: { value },
      create: { projectId, value },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating ASR fee:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.asrFee.create({
          data: {
            projectId: '__test__',
            value: 0
          }
        });
        
        // Delete test data
        await prisma.asrFee.deleteMany({
          where: {
            projectId: '__test__'
          }
        });
        
        // Now try the original operation again
        await prisma.asrFee.upsert({
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
    
    return NextResponse.json({ error: 'Failed to update ASR fee' }, { status: 500 });
  }
} 