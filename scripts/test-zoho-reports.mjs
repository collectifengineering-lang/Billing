import { zohoService } from '../lib/zoho.js';

async function testZohoReports() {
  console.log('🧪 Testing Zoho Books Reports Endpoints...\n');
  
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = new Date().toISOString().split('T')[0];
  
  console.log(`Testing date range: ${startDate} to ${endDate}\n`);
  
  try {
    // Test Profit & Loss
    console.log('1. Testing Profit & Loss Report...');
    const plData = await zohoService.getProfitAndLoss(startDate, endDate);
    console.log('   Status: ✅ Success');
    console.log('   Data structure:', Object.keys(plData || {}));
    if (plData?.revenue?.total) {
      console.log('   Revenue found:', plData.revenue.total);
    }
    if (plData?.expenses?.total) {
      console.log('   Expenses found:', plData.expenses.total);
    }
  } catch (error) {
    console.log('   Status: ❌ Failed');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   HTTP Status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('');
  
  try {
    // Test Cash Flow
    console.log('2. Testing Cash Flow Report...');
    const cfData = await zohoService.getCashFlow(startDate, endDate);
    console.log('   Status: ✅ Success');
    console.log('   Data structure:', Object.keys(cfData || {}));
    if (cfData?.net_cash_flow) {
      console.log('   Net Cash Flow found:', cfData.net_cash_flow);
    }
  } catch (error) {
    console.log('   Status: ❌ Failed');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   HTTP Status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('');
  
  try {
    // Test Balance Sheet
    console.log('3. Testing Balance Sheet Report...');
    const bsData = await zohoService.getBalanceSheet(endDate);
    console.log('   Status: ✅ Success');
    console.log('   Data structure:', Object.keys(bsData || {}));
    if (bsData?.current_assets) {
      console.log('   Current Assets found');
    }
    if (bsData?.current_liabilities) {
      console.log('   Current Liabilities found');
    }
  } catch (error) {
    console.log('   Status: ❌ Failed');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   HTTP Status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n🎯 Common Issues & Solutions:');
  console.log('• 404 errors: Check if reports endpoints are available in your Zoho Books plan');
  console.log('• 401 errors: Check OAuth scopes (need ZohoBooks.reports.READ)');
  console.log('• 403 errors: Check if Reports module is enabled in your Zoho Books account');
  console.log('• Empty data: Check if you have financial data in the specified date range');
  console.log('• Organization ID: Verify ZOHO_ORGANIZATION_ID environment variable');
}

testZohoReports().catch(console.error);
