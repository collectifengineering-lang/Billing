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
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
  }
}

// POST: Update or create status
export async function POST(request: Request) {
  try {
    const { projectId, month, status } = await request.json();
    
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
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
} 