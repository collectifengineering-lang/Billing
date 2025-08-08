import { NextRequest, NextResponse } from 'next/server';
import { payrollService } from '../../../../lib/payroll';
import { ProjectMultiplier } from '../../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const date = searchParams.get('date');

    if (projectId && date) {
      const multiplier = await payrollService.getProjectMultiplier(projectId, date);
      return NextResponse.json(multiplier);
    } else if (projectId) {
      const multiplierHistory = await payrollService.getProjectMultiplierHistory(projectId);
      return NextResponse.json(multiplierHistory);
    } else {
      return NextResponse.json({ error: 'projectId parameter is required' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error fetching multiplier:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const multiplier: ProjectMultiplier = await request.json();
    await payrollService.addProjectMultiplier(multiplier);
    return NextResponse.json({ success: true, message: 'Multiplier added successfully' });
  } catch (error: any) {
    console.error('Error adding multiplier:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
