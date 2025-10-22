import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧪 TEST RAW DB API: Testing raw database connection...');
    
    // Test if we can import pg
    let pg;
    try {
      pg = await import('pg');
      console.log('✅ TEST RAW DB API: pg imported successfully');
    } catch (error) {
      console.error('❌ TEST RAW DB API: Failed to import pg:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to import pg',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Test database connection with raw pg
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL
    });
    
    try {
      await client.connect();
      console.log('✅ TEST RAW DB API: Raw database connected successfully');
      
      // Test a simple query
      const result = await client.query('SELECT COUNT(*) as count FROM "Projection"');
      console.log('✅ TEST RAW DB API: Raw query result:', result.rows);
      
      await client.end();
      
      return NextResponse.json({
        success: true,
        message: 'Raw database connection test passed',
        queryResult: result.rows
      });
      
    } catch (error) {
      console.error('❌ TEST RAW DB API: Raw database connection failed:', error);
      await client.end();
      return NextResponse.json({
        success: false,
        error: 'Raw database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ TEST RAW DB API: Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
