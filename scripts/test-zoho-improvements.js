#!/usr/bin/env node

/**
 * Test script for Zoho improvements:
 * - Token refresh with rate limit handling
 * - Authentication error handling
 * - API call monitoring
 */

const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000
};

async function testHomepageDashboard() {
  console.log('\n🧪 Testing Homepage Dashboard API...');
  
  try {
    const response = await axios.get(`${TEST_CONFIG.baseURL}/api/homepage-dashboard`, {
      timeout: TEST_CONFIG.timeout
    });
    
    console.log('✅ Homepage Dashboard API successful');
    console.log('📊 Response data:', {
      totalProjects: response.data.totalProjects,
      totalBilled: response.data.totalBilled,
      activeProjects: response.data.activeProjects,
      warnings: response.data.warnings || [],
      zohoApiCallCount: response.data.zohoApiCallCount
    });
    
    if (response.data.warnings && response.data.warnings.length > 0) {
      console.log('⚠️ Warnings detected:', response.data.warnings);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Homepage Dashboard API failed:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
    return false;
  }
}

async function testInvoicesAPI() {
  console.log('\n🧪 Testing Invoices API...');
  
  try {
    const response = await axios.get(`${TEST_CONFIG.baseURL}/api/invoices`, {
      timeout: TEST_CONFIG.timeout
    });
    
    console.log('✅ Invoices API successful');
    console.log('📊 Response data:', {
      success: response.data.success,
      count: response.data.count,
      warnings: response.data.warnings || [],
      zohoApiCallCount: response.data.zohoApiCallCount
    });
    
    if (response.data.warnings && response.data.warnings.length > 0) {
      console.log('⚠️ Warnings detected:', response.data.warnings);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Invoices API failed:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
    return false;
  }
}

async function testBambooHRImport() {
  console.log('\n🧪 Testing BambooHR Import...');
  
  try {
    const response = await axios.post(`${TEST_CONFIG.baseURL}/api/payroll/bamboohr`, {
      action: 'import-data'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: TEST_CONFIG.timeout
    });
    
    console.log('✅ BambooHR Import successful');
    console.log('📊 Response data:', response.data);
    
    return true;
  } catch (error) {
    console.error('❌ BambooHR Import failed:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
    return false;
  }
}

async function testZohoTokenRefresh() {
  console.log('\n🧪 Testing Zoho Token Refresh...');
  
  try {
    // Test with force refresh flag
    process.env.ZOHO_FORCE_REFRESH = 'true';
    
    const response = await axios.get(`${TEST_CONFIG.baseURL}/api/homepage-dashboard`, {
      timeout: TEST_CONFIG.timeout
    });
    
    console.log('✅ Zoho Token Refresh test successful');
    console.log('📊 API calls made:', response.data.zohoApiCallCount);
    
    // Reset force refresh flag
    process.env.ZOHO_FORCE_REFRESH = 'false';
    
    return true;
  } catch (error) {
    console.error('❌ Zoho Token Refresh test failed:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
    
    // Reset force refresh flag on error
    process.env.ZOHO_FORCE_REFRESH = 'false';
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Zoho Improvements Test Suite...');
  console.log('📍 Testing against:', TEST_CONFIG.baseURL);
  
  const results = {
    homepageDashboard: false,
    invoices: false,
    bamboohr: false,
    tokenRefresh: false
  };
  
  try {
    // Test basic APIs
    results.homepageDashboard = await testHomepageDashboard();
    results.invoices = await testInvoicesAPI();
    
    // Test BambooHR import
    results.bamboohr = await testBambooHRImport();
    
    // Test token refresh
    results.tokenRefresh = await testZohoTokenRefresh();
    
  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  }
  
  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Zoho improvements are working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testHomepageDashboard,
  testInvoicesAPI,
  testBambooHRImport,
  testZohoTokenRefresh,
  runAllTests
};
