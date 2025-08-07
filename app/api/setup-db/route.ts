import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export async function POST() {
  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  try {
    console.log('Testing database connection...');
    
    // Try to create a simple test record
    const testRecord = await prisma.status.create({
      data: {
        projectId: 'test-setup',
        month: '2024-01',
        status: 'test'
      }
    });
    
    console.log('Test record created:', testRecord);
    
    // Clean up the test record
    await prisma.status.delete({
      where: {
        projectId_month: {
          projectId: 'test-setup',
          month: '2024-01'
        }
      }
    });
    
    console.log('Database setup successful');
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful and tables are working' 
    });
    
  } catch (error: any) {
    console.error('Database setup failed:', error);
    
    return NextResponse.json({ 
      error: 'Database setup failed', 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}
