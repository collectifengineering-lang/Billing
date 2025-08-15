import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '@/lib/zoho';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting Zoho Books Financial Data Diagnostic...\n');
    
    const results: any = {
      environmentVariables: {},
      tokenStatus: {},
      basicApiTests: {},
      financialReports: {},
      recommendations: []
    };

    // 1. Check environment variables
    console.log('📋 Environment Variables Check:');
    results.environmentVariables = {
      ZOHO_ORGANIZATION_ID: process.env.ZOHO_ORGANIZATION_ID ? '✅ Set' : '❌ Missing',
      ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID ? '✅ Set' : '❌ Missing',
      ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
      ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN ? '✅ Set' : '❌ Missing',
      ZOHO_ACCOUNTS_BASE: process.env.ZOHO_ACCOUNTS_BASE || 'Using default',
      ZOHO_API_BASE: process.env.ZOHO_API_BASE || 'Using default'
    };

    // 2. Check token status
    console.log('🔑 Token Status Check:');
    try {
      results.tokenStatus = {
        status: zohoService.getTokenStatus(),
        autoRefresh: zohoService.getAutoRefreshStatus(),
        overall: zohoService.getStatus()
      };
    } catch (error) {
      results.tokenStatus = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // 3. Test basic API connectivity
    console.log('🌐 Testing Basic API Connectivity:');
    try {
      const projects = await zohoService.getProjects();
      results.basicApiTests.projects = {
        status: '✅ Working',
        count: projects.length,
        message: `${projects.length} projects found`
      };
    } catch (error) {
      results.basicApiTests.projects = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    try {
      const invoices = await zohoService.getInvoices();
      results.basicApiTests.invoices = {
        status: '✅ Working',
        count: invoices.length,
        message: `${invoices.length} invoices found`
      };
    } catch (error) {
      results.basicApiTests.invoices = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 4. Test financial reports individually
    console.log('💰 Testing Financial Reports:');
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = new Date().toISOString().split('T')[0];
    
    // Also test with a broader date range that might have data
    const broaderStartDate = '2024-01-01';
    const broaderEndDate = new Date().toISOString().split('T')[0];
    
    // Test with different fiscal year periods
    const fiscalYear2024 = '2024-04-01'; // Common fiscal year start
    const fiscalYear2025 = '2025-03-31'; // Common fiscal year end
    const fiscalYear2023 = '2023-04-01'; // Previous fiscal year
    const fiscalYear2024End = '2024-03-31'; // Previous fiscal year end

    try {
      console.log(`Testing Profit & Loss (${startDate} to ${endDate}):`);
      const plData = await zohoService.getProfitAndLoss(startDate, endDate);
      if (plData) {
        results.financialReports.profitAndLoss = {
          status: '✅ Working',
          dataKeys: Object.keys(plData || {}),
          revenue: plData?.revenue?.total || 'N/A',
          expenses: plData?.expenses?.total || 'N/A'
        };
      } else {
        results.financialReports.profitAndLoss = {
          status: '⚠️ No data returned',
          message: 'Profit & Loss returned empty data'
        };
      }
    } catch (error) {
      results.financialReports.profitAndLoss = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      };
    }

    try {
      console.log(`Testing Cash Flow (${startDate} to ${endDate}):`);
      const cfData = await zohoService.getCashFlow(startDate, endDate);
      if (cfData) {
        results.financialReports.cashFlow = {
          status: '✅ Working',
          dataKeys: Object.keys(cfData || {}),
          netCashFlow: cfData?.net_cash_flow || 'N/A'
        };
      } else {
        results.financialReports.cashFlow = {
          status: '⚠️ No data returned',
          message: 'Cash Flow returned empty data'
        };
      }
    } catch (error) {
      results.financialReports.cashFlow = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      };
    }

    try {
      console.log(`Testing Balance Sheet (${endDate}):`);
      const bsData = await zohoService.getBalanceSheet(endDate);
      if (bsData) {
        results.financialReports.balanceSheet = {
          status: '✅ Working',
          dataKeys: Object.keys(bsData || {}),
          currentAssets: bsData?.current_assets ? 'Available' : 'N/A',
          currentLiabilities: bsData?.current_liabilities ? 'Available' : 'N/A'
        };
      } else {
        results.financialReports.balanceSheet = {
          status: '⚠️ No data returned',
          message: 'Balance Sheet returned empty data'
        };
      }
    } catch (error) {
      results.financialReports.balanceSheet = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      };
    }

    // 5. Test the comprehensive financial metrics
    console.log('📊 Testing Comprehensive Financial Metrics:');
    try {
      const financialMetrics = await zohoService.getFinancialMetrics(startDate, endDate);
      results.financialReports.comprehensiveMetrics = {
        status: '✅ Working',
        revenue: financialMetrics.revenue,
        expenses: financialMetrics.expenses,
        operatingIncome: financialMetrics.operatingIncome,
        cashFlow: financialMetrics.cashFlow
      };
    } catch (error) {
      results.financialReports.comprehensiveMetrics = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      };
    }
    
    // 6. Test with broader date range (2024 onwards)
    console.log('📊 Testing Financial Metrics with Broader Date Range (2024 onwards):');
    try {
      const broaderFinancialMetrics = await zohoService.getFinancialMetrics(broaderStartDate, broaderEndDate);
      results.financialReports.broaderDateRange = {
        status: '✅ Working',
        revenue: broaderFinancialMetrics.revenue,
        expenses: broaderFinancialMetrics.expenses,
        operatingIncome: broaderFinancialMetrics.operatingIncome,
        cashFlow: broaderFinancialMetrics.cashFlow,
        dateRange: `${broaderStartDate} to ${broaderEndDate}`
      };
    } catch (error) {
      results.financialReports.broaderDateRange = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      };
    }
    
    // 7. Test with fiscal year periods (April-March)
    console.log('📊 Testing Financial Metrics with Fiscal Year Periods:');
    
    // Test fiscal year 2024 (April 2024 - March 2025)
    try {
      const fy2024Metrics = await zohoService.getFinancialMetrics(fiscalYear2024, fiscalYear2025);
      results.financialReports.fiscalYear2024 = {
        status: '✅ Working',
        revenue: fy2024Metrics.revenue,
        expenses: fy2024Metrics.expenses,
        operatingIncome: fy2024Metrics.operatingIncome,
        cashFlow: fy2024Metrics.cashFlow,
        dateRange: `${fiscalYear2024} to ${fiscalYear2025}`
      };
    } catch (error) {
      results.financialReports.fiscalYear2024 = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test fiscal year 2023 (April 2023 - March 2024)
    try {
      const fy2023Metrics = await zohoService.getFinancialMetrics(fiscalYear2023, fiscalYear2024End);
      results.financialReports.fiscalYear2023 = {
        status: '✅ Working',
        revenue: fy2023Metrics.revenue,
        expenses: fy2023Metrics.expenses,
        operatingIncome: fy2023Metrics.operatingIncome,
        cashFlow: fy2023Metrics.cashFlow,
        dateRange: `${fiscalYear2023} to ${fiscalYear2024End}`
      };
    } catch (error) {
      results.financialReports.fiscalYear2023 = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test calendar year 2024 (Jan 2024 - Dec 2024)
    try {
      const cal2024Metrics = await zohoService.getFinancialMetrics('2024-01-01', '2024-12-31');
      results.financialReports.calendarYear2024 = {
        status: '✅ Working',
        revenue: cal2024Metrics.revenue,
        expenses: cal2024Metrics.expenses,
        operatingIncome: cal2024Metrics.operatingIncome,
        cashFlow: cal2024Metrics.cashFlow,
        dateRange: '2024-01-01 to 2024-12-31'
      };
    } catch (error) {
      results.financialReports.calendarYear2024 = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 8. Test with much broader date ranges to see if ANY financial data exists
    console.log('📊 Testing with Much Broader Date Ranges:');
    
    // Test last 5 years
    try {
      const fiveYearMetrics = await zohoService.getFinancialMetrics('2020-01-01', '2025-12-31');
      results.financialReports.fiveYearRange = {
        status: '✅ Working',
        revenue: fiveYearMetrics.revenue,
        expenses: fiveYearMetrics.expenses,
        operatingIncome: fiveYearMetrics.operatingIncome,
        cashFlow: fiveYearMetrics.cashFlow,
        dateRange: '2020-01-01 to 2025-12-31'
      };
    } catch (error) {
      results.financialReports.fiveYearRange = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test with a specific date that might have data (based on your mention of 1,385,304.71)
    try {
      const specificDateMetrics = await zohoService.getFinancialMetrics('2024-06-01', '2024-12-31');
      results.financialReports.specificDateRange = {
        status: '✅ Working',
        revenue: specificDateMetrics.revenue,
        expenses: specificDateMetrics.expenses,
        operatingIncome: specificDateMetrics.operatingIncome,
        cashFlow: specificDateMetrics.cashFlow,
        dateRange: '2024-06-01 to 2024-12-31'
      };
    } catch (error) {
      results.financialReports.specificDateRange = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 9. Test organization access and check for transaction data
    console.log('🏢 Testing Organization Access and Transaction Data:');
    try {
      const token = await zohoService.getAccessToken();
      if (token) {
        // Test organizations endpoint directly
        const axios = await import('axios');
        const orgResponse = await axios.default.get(`${process.env.ZOHO_API_BASE || 'https://www.zohoapis.com'}/books/v3/organizations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        
        const orgs = orgResponse.data?.organizations || [];
        
        // Check for any transactions in the last few years
        let transactionData = null;
        try {
          const transactionResponse = await axios.default.get(`${process.env.ZOHO_API_BASE || 'https://www.zohoapis.com'}/books/v3/transactions?organization_id=${process.env.ZOHO_ORGANIZATION_ID}&date_start=2020-01-01&date_end=2025-12-31&per_page=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });
          transactionData = {
            hasTransactions: transactionResponse.data?.transactions?.length > 0,
            transactionCount: transactionResponse.data?.page_context?.total || 0,
            sampleTransaction: transactionResponse.data?.transactions?.[0] || null
          };
        } catch (txError) {
          transactionData = {
            error: txError instanceof Error ? txError.message : 'Unknown error'
          };
        }
        
        // Test if the other organization has financial data
        let otherOrgData = null;
        try {
          const otherOrgResponse = await axios.default.get(`${process.env.ZOHO_API_BASE || 'https://www.zohoapis.com'}/books/v3/reports/profitandloss?organization_id=880131765&from_date=2024-01-01&to_date=2024-12-31`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });
          otherOrgData = {
            hasData: otherOrgResponse.data?.profit_and_loss ? true : false,
            dataKeys: Object.keys(otherOrgResponse.data || {}),
            sampleData: otherOrgResponse.data?.profit_and_loss || null
          };
        } catch (otherOrgError) {
          otherOrgData = {
            error: otherOrgError instanceof Error ? otherOrgError.message : 'Unknown error'
          };
        }
        
                  results.organizationTest = {
            status: '✅ Working',
            organizationsFound: orgs.length,
            organizations: orgs.map((org: any) => ({
              id: org.organization_id,
              name: org.name,
              fiscalYearStart: org.fiscal_year_start_month
            })),
            configuredOrgId: process.env.ZOHO_ORGANIZATION_ID || 'Not set in env',
            transactionData,
            otherOrganizationData: otherOrgData
          };
      } else {
        results.organizationTest = {
          status: '❌ Failed',
          error: 'Could not obtain access token'
        };
      }
    } catch (error) {
      results.organizationTest = {
        status: '❌ Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 8. Generate recommendations
    results.recommendations = [
      'Check if your Zoho Books account has the Reports module enabled',
      'Verify that your OAuth app has the ZohoBooks.reports.READ scope',
      'Ensure your organization ID is correct and has financial data',
      'Check if there are any date range restrictions in your Zoho account',
      'Verify that your Zoho Books subscription includes financial reporting features'
    ];

    // Check for specific issues and add targeted recommendations
    if (results.financialReports.profitAndLoss?.status === '❌ Failed') {
      const status = results.financialReports.profitAndLoss.details?.status;
      if (status === 404) {
        results.recommendations.push('🔍 404 Error: Reports endpoints not found. Check if your Zoho Books plan includes financial reporting.');
      } else if (status === 401) {
        results.recommendations.push('🔐 401 Error: Authentication failed. Check OAuth scopes and token validity.');
      } else if (status === 403) {
        results.recommendations.push('🚫 403 Error: Access forbidden. Check if Reports module is enabled in your Zoho Books account.');
      } else if (status === 429) {
        results.recommendations.push('⏰ 429 Error: Rate limited. Zoho API rate limits exceeded.');
      }
    }

    console.log('✅ Diagnostic completed successfully');
    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return NextResponse.json(
      { 
        error: 'Diagnostic failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
