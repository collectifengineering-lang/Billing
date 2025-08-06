import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

// GET: Fetch all project managers
export async function GET() {
  try {
    const projectManagers = await prisma.projectManager.findMany();
    // Transform to record format: { id: { name, color } }
    const formatted = projectManagers.reduce((acc, pm) => {
      acc[pm.id] = { name: pm.name, color: pm.color };
      return acc;
    }, {} as Record<string, { name: string; color: string }>);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching project managers:', error);
    return NextResponse.json({ error: 'Failed to fetch project managers' }, { status: 500 });
  }
}

// POST: Update or create project manager
export async function POST(request: Request) {
  try {
    const { id, name, color } = await request.json();
    await prisma.projectManager.upsert({
      where: { id },
      update: { name, color },
      create: { id, name, color },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project manager:', error);
    return NextResponse.json({ error: 'Failed to update project manager' }, { status: 500 });
  }
} 