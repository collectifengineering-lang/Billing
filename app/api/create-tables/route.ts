import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function POST() {
  try {
    console.log('Attempting to create tables...');
    
    try {
      // Try to create a test record in the Status table
      const testRecord = await prisma.status.create({
        data: {
          projectId: 'test-table-creation',
          month: '2024-01',
          status: 'test'
        }
      });
      
      console.log('Test record created successfully:', testRecord);
      
      // Clean up the test record
      await prisma.status.delete({
        where: {
          projectId_month: {
            projectId: 'test-table-creation',
            month: '2024-01'
          }
        }
      });
      
      console.log('Test record cleaned up successfully');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Tables created successfully',
        testRecord
      });
      
    } catch (tableError: any) {
      console.error('Table creation failed:', tableError);
      
      return NextResponse.json({ 
        error: 'Table creation failed', 
        details: tableError.message,
        code: tableError.code
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Database connection failed:', error);
    
    return NextResponse.json({ 
      error: 'Database connection failed', 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}
