import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('Attempting to create tables...');
    
    try {
      // Try to create a test record to trigger table creation
      const testRecord = await prisma.status.create({
        data: {
          projectId: '__test__',
          month: '__test__',
          status: 'test'
        }
      });
      
      console.log('Test record created successfully:', testRecord);
      
      // Clean up the test record
      await prisma.status.delete({
        where: {
          projectId_month: {
            projectId: '__test__',
            month: '__test__'
          }
        }
      });
      
      console.log('Test record cleaned up successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Tables created successfully' 
      });
      
    } catch (tableError: any) {
      console.error('Error creating tables:', tableError);
      return NextResponse.json({ 
        error: 'Failed to create tables',
        details: tableError.message
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Database setup failed:', error);
    return NextResponse.json({ 
      error: 'Database setup failed',
      details: error.message
    }, { status: 500 });
  }
}
