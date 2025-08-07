import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

// GET: Fetch all comments
export async function GET() {
  try {
    console.log('Fetching comments from database...');
    const comments = await prisma.comment.findMany();
    console.log('Fetched', comments.length, 'comments from database');
    
    // Transform to record format: { projectId: { month: comment } }
    const formatted = comments.reduce((acc, comment) => {
      if (!acc[comment.projectId]) acc[comment.projectId] = {};
      acc[comment.projectId][comment.month] = comment.comment;
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
  // Parse request data once and store it
  const requestData = await request.json();
  const { projectId, month, comment } = requestData;
  
  try {
    console.log('Updating comment for project:', projectId, 'month:', month);
    
    await prisma.comment.upsert({
      where: { projectId_month: { projectId, month } },
      update: { comment },
      create: { projectId, month, comment },
    });
    
    console.log('Comment updated successfully');
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
            comment: 'test'
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