import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '../../../lib/zoho';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching invoices from Zoho');
    const invoices = await zohoService.getInvoices();
    console.log('API: Fetched', invoices.length, 'invoices');
    
    return NextResponse.json({
      success: true,
      data: invoices,
      count: invoices.length
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