const { zohoService } = require('../lib/zoho.ts');

async function testZohoFinancialMetrics() {
  console.log('🔍 Testing Zoho Financial Metrics API...');
  
  try {
    // Test with current year date range
    const now = new Date();
    const currentYear = now.getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = now.toISOString().split('T')[0];
    
    console.log(`📅 Testing date range: ${startDate} to ${endDate}`);
    
    // Test individual API calls
    console.log('\n1. Testing Profit & Loss API...');
    const plData = await zohoService.getProfitAndLoss(startDate, endDate);
    console.log('P&L Response:', JSON.stringify(plData, null, 2));
    
    console.log('\n2. Testing Cash Flow API...');
    const cfData = await zohoService.getCashFlow(startDate, endDate);
    console.log('Cash Flow Response:', JSON.stringify(cfData, null, 2));
    
    console.log('\n3. Testing Balance Sheet API...');
    const bsData = await zohoService.getBalanceSheet(endDate);
    console.log('Balance Sheet Response:', JSON.stringify(bsData, null, 2));
    
    console.log('\n4. Testing Combined Financial Metrics...');
    const financialMetrics = await zohoService.getFinancialMetrics(startDate, endDate);
    console.log('Financial Metrics Response:', JSON.stringify(financialMetrics, null, 2));
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the test
testZohoFinancialMetrics();
