import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  try {
    console.log('Testing basic database connection...');
    
    // Create a new Prisma client instance
    const prisma = new PrismaClient();
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    console.log('Database connection successful:', result);
    
    await prisma.$disconnect();
    
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
