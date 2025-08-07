import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// GET: Fetch all ASR fees
export async function GET() {
  try {
    // Ensure database schema exists
    await ensureDatabaseSchema();
    
    const asrFees = await prisma.asrFee.findMany();
    // Transform to record format: { projectId: value }
    const formatted = asrFees.reduce((acc, af) => {
      acc[af.projectId] = af.value;
      return acc;
    }, {} as Record<string, number>);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching ASR fees:', error);
    return NextResponse.json({ error: 'Failed to fetch ASR fees' }, { status: 500 });
  }
}

// POST: Update or create ASR fee
export async function POST(request: Request) {
  try {
    const { projectId, value } = await request.json();
    await prisma.asrFee.upsert({
      where: { projectId },
      update: { value },
      create: { projectId, value },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating ASR fee:', error);
    return NextResponse.json({ error: 'Failed to update ASR fee' }, { status: 500 });
  }
} 