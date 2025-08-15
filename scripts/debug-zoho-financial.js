const { zohoService } = require('../lib/zoho');

async function debugZohoFinancial() {
  console.log('🔍 Starting Zoho Books Financial Data Diagnostic...\n');
  
  try {
    // 1. Check environment variables
    console.log('📋 Environment Variables Check:');
    console.log(`ZOHO_ORGANIZATION_ID: ${process.env.ZOHO_ORGANIZATION_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`ZOHO_CLIENT_ID: ${process.env.ZOHO_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`ZOHO_CLIENT_SECRET: ${process.env.ZOHO_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`ZOHO_REFRESH_TOKEN: ${process.env.ZOHO_REFRESH_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`ZOHO_ACCOUNTS_BASE: ${process.env.ZOHO_ACCOUNTS_BASE || 'Using default'}`);
    console.log(`ZOHO_API_BASE: ${process.env.ZOHO_API_BASE || 'Using default'}\n`);

    // 2. Check token status
    console.log('🔑 Token Status Check:');
    const tokenStatus = zohoService.getTokenStatus();
    console.log('Token Status:', tokenStatus);
    console.log('Auto-refresh Status:', zohoService.getAutoRefreshStatus());
    console.log('Overall Status:', zohoService.getStatus());
    console.log('');

    // 3. Test basic API connectivity
    console.log('🌐 Testing Basic API Connectivity:');
    try {
      const projects = await zohoService.getProjects();
      console.log(`✅ Projects API: Working (${projects.length} projects found)`);
    } catch (error) {
      console.log(`❌ Projects API: Failed - ${error.message}`);
    }

    try {
      const invoices = await zohoService.getInvoices();
      console.log(`✅ Invoices API: Working (${invoices.length} invoices found)`);
    } catch (error) {
      console.log(`❌ Invoices API: Failed - ${error.message}`);
    }
    console.log('');

    // 4. Test financial reports individually
    console.log('💰 Testing Financial Reports:');
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = new Date().toISOString().split('T')[0];

    try {
      console.log(`Testing Profit & Loss (${startDate} to ${endDate}):`);
      const plData = await zohoService.getProfitAndLoss(startDate, endDate);
      if (plData) {
        console.log(`✅ Profit & Loss: Working`);
        console.log(`   Data keys: ${Object.keys(plData || {}).join(', ')}`);
        console.log(`   Revenue: ${plData?.revenue?.total || 'N/A'}`);
        console.log(`   Expenses: ${plData?.expenses?.total || 'N/A'}`);
      } else {
        console.log(`⚠️ Profit & Loss: No data returned`);
      }
    } catch (error) {
      console.log(`❌ Profit & Loss: Failed - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log('');

    try {
      console.log(`Testing Cash Flow (${startDate} to ${endDate}):`);
      const cfData = await zohoService.getCashFlow(startDate, endDate);
      if (cfData) {
        console.log(`✅ Cash Flow: Working`);
        console.log(`   Data keys: ${Object.keys(cfData || {}).join(', ')}`);
        console.log(`   Net Cash Flow: ${cfData?.net_cash_flow || 'N/A'}`);
      } else {
        console.log(`⚠️ Cash Flow: No data returned`);
      }
    } catch (error) {
      console.log(`❌ Cash Flow: Failed - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log('');

    try {
      console.log(`Testing Balance Sheet (${endDate}):`);
      const bsData = await zohoService.getBalanceSheet(endDate);
      if (bsData) {
        console.log(`✅ Balance Sheet: Working`);
        console.log(`   Data keys: ${Object.keys(bsData || {}).join(', ')}`);
        console.log(`   Current Assets: ${bsData?.current_assets ? 'Available' : 'N/A'}`);
        console.log(`   Current Liabilities: ${bsData?.current_liabilities ? 'Available' : 'N/A'}`);
      } else {
        console.log(`⚠️ Balance Sheet: No data returned`);
      }
    } catch (error) {
      console.log(`❌ Balance Sheet: Failed - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log('');

    // 5. Test the comprehensive financial metrics
    console.log('📊 Testing Comprehensive Financial Metrics:');
    try {
      const financialMetrics = await zohoService.getFinancialMetrics(startDate, endDate);
      console.log(`✅ Financial Metrics: Working`);
      console.log(`   Revenue: ${financialMetrics.revenue}`);
      console.log(`   Expenses: ${financialMetrics.expenses}`);
      console.log(`   Operating Income: ${financialMetrics.operatingIncome}`);
      console.log(`   Cash Flow: ${financialMetrics.cashFlow}`);
    } catch (error) {
      console.log(`❌ Financial Metrics: Failed - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    console.log('');

    // 6. Check organization validation
    console.log('🏢 Organization Validation:');
    try {
      const token = await zohoService.getAccessToken();
      if (token) {
        console.log(`✅ Access Token: Obtained (${token.substring(0, 20)}...)`);
        
        // Test organizations endpoint directly
        const axios = require('axios');
        const orgResponse = await axios.get(`${process.env.ZOHO_API_BASE || 'https://www.zohoapis.com'}/books/v3/organizations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        
        const orgs = orgResponse.data?.organizations || [];
        console.log(`✅ Organizations API: Working (${orgs.length} organizations found)`);
        
        const configuredOrgId = process.env.ZOHO_ORGANIZATION_ID;
        if (configuredOrgId) {
          const found = orgs.some(org => String(org.organization_id) === String(configuredOrgId));
          if (found) {
            console.log(`✅ Organization ID ${configuredOrgId}: Valid`);
          } else {
            console.log(`❌ Organization ID ${configuredOrgId}: Not found in account`);
            console.log(`   Available organizations: ${orgs.map(o => o.organization_id).join(', ')}`);
          }
        }
      } else {
        console.log(`❌ Access Token: Failed to obtain`);
      }
    } catch (error) {
      console.log(`❌ Organization Validation: Failed - ${error.message}`);
    }
    console.log('');

    // 7. Recommendations
    console.log('💡 Recommendations:');
    console.log('1. Check if your Zoho Books account has the Reports module enabled');
    console.log('2. Verify that your OAuth app has the ZohoBooks.reports.READ scope');
    console.log('3. Ensure your organization ID is correct and has financial data');
    console.log('4. Check if there are any date range restrictions in your Zoho account');
    console.log('5. Verify that your Zoho Books subscription includes financial reporting features');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Run the diagnostic
debugZohoFinancial().catch(console.error);
