import { NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '../../../lib/database';

// GET: Fetch all comments
export async function GET() {
  try {
    // Ensure database schema exists
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      // Tables don't exist yet, return empty data
      console.log('Tables do not exist yet, returning empty comments');
      return NextResponse.json({});
    }
    
    const comments = await prisma.comment.findMany();
    // Transform to record format: { projectId: { month: comment } }
    const formatted = comments.reduce((acc, c) => {
      if (!acc[c.projectId]) acc[c.projectId] = {};
      acc[c.projectId][c.month] = c.comment;
      return acc;
    }, {} as Record<string, Record<string, string>>);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST: Update or create comment
export async function POST(request: Request) {
  try {
    const { projectId, month, comment } = await request.json();
    
    // Check if tables exist first
    const schemaExists = await ensureDatabaseSchema();
    
    if (!schemaExists) {
      console.log('Tables do not exist yet, but Prisma Accelerate will create them on first insert');
      console.log('Attempting to create table by inserting data...');
    }
    
    await prisma.comment.upsert({
      where: { projectId_month: { projectId, month } },
      update: { comment },
      create: { projectId, month, comment },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
} 