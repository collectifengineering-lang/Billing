import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '../../../lib/zoho';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    console.log('API: Fetching invoices from Zoho');
    
    let invoices: any[] = [];
    let zohoAuthFailed = false;
    let zohoApiCallCount = 0;
    
    try {
      zohoApiCallCount++;
      invoices = await zohoService.getInvoices();
      console.log('API: Fetched', invoices.length, 'invoices');
    } catch (error) {
      console.error('API: Error fetching invoices:', error);
      
      // Check if it's an authentication/rate limit error
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('rate limit') || errorMessage.includes('authentication') || errorMessage.includes('token')) {
          zohoAuthFailed = true;
          console.warn('⚠️ Zoho authentication failed due to rate limits or token issues. Showing partial data.');
        }
      }
      
      invoices = [];
    }
    
    // Log Zoho API call count for monitoring
    console.log(`📊 Zoho API calls made in this request: ${zohoApiCallCount}`);
    
    return NextResponse.json({
      success: true,
      data: invoices,
      count: invoices.length,
      warnings: zohoAuthFailed ? ['Zoho authentication failed due to rate limits. Showing partial data.'] : [],
      zohoApiCallCount
    });
  } catch (error) {
    console.error('API: Error fetching invoices:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch invoices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 