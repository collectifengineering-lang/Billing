import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  try {
    console.log('Testing basic database connection...');
    
    // Try a simple query using the singleton
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
      code: error.code
    }, { status: 500 });
  }
}
