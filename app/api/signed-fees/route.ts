import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// GET: Fetch all signed fees
export async function GET() {
  try {
    // Ensure database schema exists
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      // Tables don't exist yet, return empty data
      console.log('Tables do not exist yet, returning empty signed fees');
      return NextResponse.json({});
    }
    
    const signedFees = await prisma.signedFee.findMany();
    // Transform to record format: { projectId: value }
    const formatted = signedFees.reduce((acc, sf) => {
      acc[sf.projectId] = sf.value;
      return acc;
    }, {} as Record<string, number>);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching signed fees:', error);
    return NextResponse.json({ error: 'Failed to fetch signed fees' }, { status: 500 });
  }
}

// POST: Update or create signed fee
export async function POST(request: Request) {
  try {
    const { projectId, value } = await request.json();
    
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
      console.log('Attempting to create table by inserting data...');
    }
    
    await prisma.signedFee.upsert({
      where: { projectId },
      update: { value },
      create: { projectId, value },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating signed fee:', error);
    return NextResponse.json({ error: 'Failed to update signed fee' }, { status: 500 });
  }
} 