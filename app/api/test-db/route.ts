import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧪 TEST DB API: Starting database test...');
    console.log('🧪 TEST DB API: DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('🧪 TEST DB API: NODE_ENV:', process.env.NODE_ENV);
    
    // Create a new Prisma client instance
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ TEST DB API: Database connected');
    
    // Test projections table
    const projectionCount = await prisma.projection.count();
    console.log('✅ TEST DB API: Projection count:', projectionCount);
    
    // Get sample projections
    const sampleProjections = await prisma.projection.findMany({
      take: 3,
      orderBy: { id: 'asc' }
    });
    
    console.log('✅ TEST DB API: Sample projections:', sampleProjections);
    
    // Test the same transformation as the main API
    const allProjections = await prisma.projection.findMany();
    const formatted = allProjections.reduce((acc, projection) => {
      if (!acc[projection.projectId]) acc[projection.projectId] = {};
      acc[projection.projectId][projection.month] = projection.value;
      return acc;
    }, {} as Record<string, Record<string, number>>);
    
    console.log('✅ TEST DB API: Formatted keys count:', Object.keys(formatted).length);
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: true,
      projectionCount,
      sampleProjections,
      formattedKeysCount: Object.keys(formatted).length,
      sampleFormatted: Object.keys(formatted).slice(0, 5)
    });
    
  } catch (error) {
    console.error('❌ TEST DB API: Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}