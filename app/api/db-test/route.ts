import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/database';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Check if we can connect to the database
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    console.log('Database connection successful:', result);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      result
    });
    
  } catch (error: any) {
    console.error('Database connection failed:', error);
    
    return NextResponse.json({ 
      error: 'Database connection failed', 
      details: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 });
  }
}
