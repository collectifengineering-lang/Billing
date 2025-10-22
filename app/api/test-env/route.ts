import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧪 TEST ENV API: Testing environment variables...');
    
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      NODE_ENV: process.env.NODE_ENV,
      PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL ? 'Set' : 'Not set',
      DIRECT_URL: process.env.DIRECT_URL ? 'Set' : 'Not set',
    };
    
    console.log('🧪 TEST ENV API: Environment variables:', envVars);
    
    return NextResponse.json({
      success: true,
      envVars,
      message: 'Environment test completed'
    });
    
  } catch (error) {
    console.error('❌ TEST ENV API: Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
