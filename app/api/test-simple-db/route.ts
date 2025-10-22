import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧪 TEST SIMPLE DB API: Testing simple database connection...');
    
    // Test if we can import Prisma
    let PrismaClient;
    try {
      const prismaModule = await import('@prisma/client');
      PrismaClient = prismaModule.PrismaClient;
      console.log('✅ TEST SIMPLE DB API: PrismaClient imported successfully');
    } catch (error) {
      console.error('❌ TEST SIMPLE DB API: Failed to import PrismaClient:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to import PrismaClient',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Test creating Prisma client
    let prisma;
    try {
      prisma = new PrismaClient({
        log: ['error'],
      });
      console.log('✅ TEST SIMPLE DB API: PrismaClient created successfully');
    } catch (error) {
      console.error('❌ TEST SIMPLE DB API: Failed to create PrismaClient:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create PrismaClient',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Test database connection
    try {
      await prisma.$connect();
      console.log('✅ TEST SIMPLE DB API: Database connected successfully');
      
      // Test a simple query
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ TEST SIMPLE DB API: Simple query result:', result);
      
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: true,
        message: 'Simple database connection test passed',
        queryResult: result
      });
      
    } catch (error) {
      console.error('❌ TEST SIMPLE DB API: Database connection failed:', error);
      await prisma.$disconnect();
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ TEST SIMPLE DB API: Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
