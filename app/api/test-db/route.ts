import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

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
    console.log('DATABASE_URL (redacted):', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//[redacted]@') || 'Not set');
    console.log('Testing basic database connection...');
    
    // Try a simple query using the singleton
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    console.log('Database connection successful:', result);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      result
    });
    
  } catch (error: unknown) {
    console.error('Database connection failed:', error);
    console.error('DATABASE_URL (redacted):', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//[redacted]@') || 'Not set');
    
    return NextResponse.json({ 
      error: 'Database connection failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined
    }, { status: 500 });
  }
}
