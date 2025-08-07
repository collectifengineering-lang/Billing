import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET() {
  // Only attempt database connection in production runtime
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
    return NextResponse.json({ 
      success: false, 
      message: 'Database connection skipped during build'
    });
  }

  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      success: false, 
      message: 'Prisma client not available'
    }, { status: 500 });
  }

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
