import { NextRequest, NextResponse } from 'next/server';
import { clockifyImportService } from '../../../../lib/clockifyImport';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, startDate, endDate } = body;

    console.log('🔄 Clockify API endpoint called:', { action, startDate, endDate });

    if (action === 'import-data') {
      // Default to last 30 days if no dates provided
      const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const defaultEndDate = endDate || new Date().toISOString().split('T')[0];

      console.log(`📅 Importing Clockify data from ${defaultStartDate} to ${defaultEndDate}`);

      const result = await clockifyImportService.importTimeEntries(defaultStartDate, defaultEndDate);

      console.log('✅ Clockify import completed:', result);

      return NextResponse.json({
        success: true,
        message: 'Clockify import completed successfully',
        result
      });
    }

    if (action === 'get-stats') {
      const stats = await clockifyImportService.getImportStatistics();
      return NextResponse.json({
        success: true,
        stats
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "import-data" or "get-stats"'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Clockify API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = await clockifyImportService.getImportStatistics();
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Clockify GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
