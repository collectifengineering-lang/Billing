import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// GET: Fetch all comments
export async function GET() {
  try {
    console.log('Fetching comments from database...');
    
    const comments = await prisma.comment.findMany();
    console.log(`Found ${comments.length} comments`);
    
    // Transform to record format: { projectId: { month: comment } }
    const formatted = comments.reduce((acc, c) => {
      if (!acc[c.projectId]) acc[c.projectId] = {};
      acc[c.projectId][c.month] = c.comment;
      return acc;
    }, {} as Record<string, Record<string, string>>);
    
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // If it's a table doesn't exist error, return empty data
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('Tables do not exist, returning empty comments');
      return NextResponse.json({});
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch comments',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}

// POST: Update or create comment
export async function POST(request: Request) {
  // Parse request data once and store it
  const requestData = await request.json();
  const { projectId, month, comment } = requestData;
  
  try {
    console.log(`Updating comment: ${projectId}, ${month}, ${comment}`);
    
    await prisma.comment.upsert({
      where: { projectId_month: { projectId, month } },
      update: { comment },
      create: { projectId, month, comment },
    });
    
    console.log('Comment updated successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating comment:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
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
        
        // Now try the original operation again using the stored data
        await prisma.comment.upsert({
          where: { projectId_month: { projectId, month } },
          update: { comment },
          create: { projectId, month, comment },
        });
        
        console.log('Comment updated successfully after schema creation');
        return NextResponse.json({ success: true });
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        console.error('Create error code:', createError.code);
        console.error('Create error message:', createError.message);
        
        return NextResponse.json({ 
          error: 'Database schema not ready. Please run database setup first.',
          details: createError.message,
          code: createError.code
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to update comment',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
} 