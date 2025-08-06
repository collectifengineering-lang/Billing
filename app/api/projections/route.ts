import { NextRequest, NextResponse } from 'next/server';
import { ProjectionsTable } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { projections }: { projections: ProjectionsTable } = await request.json();

    // In a real application, you would save this to a database
    // For now, we'll just return the updated projections
    console.log('Updated projections:', projections);

    return NextResponse.json({ success: true, projections });
  } catch (error) {
    console.error('Error updating projections:', error);
    return NextResponse.json(
      { error: 'Failed to update projections' },
      { status: 500 }
    );
  }
} 