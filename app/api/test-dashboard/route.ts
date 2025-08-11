import { NextResponse } from 'next/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧪 Testing dashboard API...');
    
    // Test basic response
    const testData = {
      message: 'Dashboard API is working',
      timestamp: new Date().toISOString(),
      test: true
    };
    
    console.log('✅ Dashboard API test successful');
    return NextResponse.json(testData);
    
  } catch (error: any) {
    console.error('❌ Dashboard API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
