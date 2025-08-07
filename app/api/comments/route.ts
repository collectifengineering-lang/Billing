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
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty comments');
      return NextResponse.json({});
    }
    
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
  } catch (error: any) {
    console.error('Error updating comment:', error);
    
    // If it's a table doesn't exist error, try to create the schema
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Table does not exist, attempting to create schema...');
      
      try {
        // Try to create the table by inserting test data
        await prisma.comment.create({
          data: {
            projectId: '__test__',
            month: '__test__',
            comment: '__test__'
          }
        });
        
        // Delete test data
        await prisma.comment.deleteMany({
          where: {
            projectId: '__test__',
            month: '__test__'
          }
        });
        
        // Now try the original operation again
        await prisma.comment.upsert({
          where: { projectId_month: { projectId, month } },
          update: { comment },
          create: { projectId, month, comment },
        });
        
        return NextResponse.json({ success: true });
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
} 