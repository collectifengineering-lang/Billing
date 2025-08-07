import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// GET: Fetch all projections
export async function GET() {
  try {
    // Ensure database schema exists
    await ensureDatabaseSchema();
    
    const projections = await prisma.projection.findMany();
    // Transform to record format: { projectId: { month: value } }
    const formatted = projections.reduce((acc, p) => {
      if (!acc[p.projectId]) acc[p.projectId] = {};
      acc[p.projectId][p.month] = p.value;
      return acc;
    }, {} as Record<string, Record<string, number>>);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching projections:', error);
    return NextResponse.json({ error: 'Failed to fetch projections' }, { status: 500 });
  }
}

// POST: Update or create projection
export async function POST(request: Request) {
  try {
    const { projectId, month, value } = await request.json();
    await prisma.projection.upsert({
      where: { projectId_month: { projectId, month } },
      update: { value },
      create: { projectId, month, value },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating projection:', error);
    return NextResponse.json({ error: 'Failed to update projection' }, { status: 500 });
  }
} 