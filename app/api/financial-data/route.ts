import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '@/lib/zoho';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching financial data from ${startDate} to ${endDate}`);
    
    // Test all financial data endpoints
    const results: {
      timestamp: string;
      dateRange: { startDate: string; endDate: string };
      profitAndLoss: any;
      cashFlow: any;
      balanceSheet: any;
      chartOfAccounts: any;
      journalEntries: any;
      comprehensiveMetrics: any;
      errors: string[];
      zohoStatus?: any;
    } = {
      timestamp: new Date().toISOString(),
      dateRange: { startDate, endDate },
      profitAndLoss: null,
      cashFlow: null,
      balanceSheet: null,
      chartOfAccounts: null,
      journalEntries: null,
      comprehensiveMetrics: null,
      errors: []
    };

    try {
      console.log('Fetching Profit & Loss statement...');
      results.profitAndLoss = await zohoService.getProfitAndLoss(startDate, endDate);
    } catch (error) {
      const errorMsg = `Failed to fetch Profit & Loss: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    try {
      console.log('Fetching Cash Flow statement...');
      results.cashFlow = await zohoService.getCashFlow(startDate, endDate);
    } catch (error) {
      const errorMsg = `Failed to fetch Cash Flow: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    try {
      console.log('Fetching Balance Sheet...');
      results.balanceSheet = await zohoService.getBalanceSheet(endDate);
    } catch (error) {
      const errorMsg = `Failed to fetch Balance Sheet: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    try {
      console.log('Fetching Chart of Accounts...');
      results.chartOfAccounts = await zohoService.getChartOfAccounts();
    } catch (error) {
      const errorMsg = `Failed to fetch Chart of Accounts: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    try {
      console.log('Fetching Journal Entries...');
      results.journalEntries = await zohoService.getJournalEntries(startDate, endDate);
    } catch (error) {
      const errorMsg = `Failed to fetch Journal Entries: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    try {
      console.log('Fetching comprehensive financial metrics...');
      results.comprehensiveMetrics = await zohoService.getFinancialMetrics(startDate, endDate);
    } catch (error) {
      const errorMsg = `Failed to fetch comprehensive metrics: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    // Check Zoho service status
    const zohoStatus = zohoService.getStatus();
    results.zohoStatus = zohoStatus;

    console.log('Financial data fetch completed. Errors:', results.errors.length);
    
    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        totalEndpoints: 6,
        successfulEndpoints: 6 - results.errors.length,
        failedEndpoints: results.errors.length,
        hasErrors: results.errors.length > 0
      }
    });

  } catch (error) {
    console.error('Financial data API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch financial data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
