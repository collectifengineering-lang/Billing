#!/usr/bin/env node

/**
 * Test script to verify API fixes for Clockify and Zoho integrations
 * Run this script to test the endpoints locally before deploying
 */

const axios = require('axios');

// Configuration - update these with your actual values
const config = {
  baseUrl: 'http://localhost:3000',
  clockify: {
    apiKey: process.env.CLOCKIFY_API_KEY,
    workspaceId: process.env.CLOCKIFY_WORKSPACE_ID
  },
  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    organizationId: process.env.ZOHO_ORGANIZATION_ID
  }
};

// Test functions
async function testClockifyAPI() {
  console.log('\n🔍 Testing Clockify API...');
  
  if (!config.clockify.apiKey || !config.clockify.workspaceId) {
    console.log('⚠️  Clockify credentials not configured, skipping test');
    return;
  }

  try {
    // Test 1: Reports API (preferred method)
    console.log('  Testing Reports API...');
    const reportsResponse = await axios.post(
      `https://api.clockify.me/api/v1/workspaces/${config.clockify.workspaceId}/reports/detailed`,
      {
        dateRangeStart: '2025-01-01T00:00:00Z',
        dateRangeEnd: '2025-01-31T23:59:59Z',
        detailedFilter: {
          pageSize: 100,
          sortColumn: "DATE"
        }
      },
      {
        headers: {
          'X-Api-Key': config.clockify.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('  ✅ Reports API successful:', {
      status: reportsResponse.status,
      timeEntriesCount: reportsResponse.data?.timeentries?.length || 0
    });

  } catch (error) {
    console.log('  ❌ Reports API failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    // Test 2: User time entries (fallback method)
    try {
      console.log('  Testing User Time Entries API (fallback)...');
      
      // First get user info
      const userResponse = await axios.get(
        `https://api.clockify.me/api/v1/workspaces/${config.clockify.workspaceId}/user`,
        {
          headers: {
            'X-Api-Key': config.clockify.apiKey
          }
        }
      );

      const userId = userResponse.data.id;
      console.log('  ✅ User info retrieved:', userId);

      // Then get time entries
      const timeEntriesResponse = await axios.get(
        `https://api.clockify.me/api/v1/workspaces/${config.clockify.workspaceId}/user/${userId}/time-entries?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z`,
        {
          headers: {
            'X-Api-Key': config.clockify.apiKey
          }
        }
      );

      console.log('  ✅ User Time Entries API successful:', {
        status: timeEntriesResponse.status,
        timeEntriesCount: timeEntriesResponse.data?.length || 0
      });

    } catch (fallbackError) {
      console.log('  ❌ Fallback method also failed:', {
        status: fallbackError.response?.status,
        message: fallbackError.response?.data?.message || fallbackError.message
      });
    }
  }
}

async function testZohoAPI() {
  console.log('\n🔍 Testing Zoho API...');
  
  if (!config.zoho.clientId || !config.zoho.clientSecret || !config.zoho.refreshToken) {
    console.log('⚠️  Zoho credentials not configured, skipping test');
    return;
  }

  try {
    // Test 1: Token refresh
    console.log('  Testing token refresh...');
    const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        refresh_token: config.zoho.refreshToken,
        client_id: config.zoho.clientId,
        client_secret: config.zoho.clientSecret,
        grant_type: 'refresh_token',
      }
    });

    if (tokenResponse.data.access_token) {
      console.log('  ✅ Token refresh successful:', {
        expiresIn: Math.round(tokenResponse.data.expires_in / 60),
        tokenPreview: tokenResponse.data.access_token.substring(0, 10) + '...'
      });

      const accessToken = tokenResponse.data.access_token;

      // Test 2: API call with token
      console.log('  Testing API call with token...');
      const apiResponse = await axios.get(
        `https://www.zohoapis.com/books/v3/reports/profitandloss?from_date=2025-01-01&to_date=2025-01-31`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            organization_id: config.zoho.organizationId,
          },
        }
      );

      console.log('  ✅ API call successful:', {
        status: apiResponse.status,
        hasData: !!apiResponse.data
      });

    } else {
      console.log('  ❌ No access token received');
    }

  } catch (error) {
    console.log('  ❌ Zoho API test failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
  }
}

async function testLocalEndpoints() {
  console.log('\n🔍 Testing local API endpoints...');
  
  try {
    // Test homepage dashboard
    console.log('  Testing /api/homepage-dashboard...');
    const dashboardResponse = await axios.get(`${config.baseUrl}/api/homepage-dashboard`);
    console.log('  ✅ Homepage dashboard successful:', {
      status: dashboardResponse.status,
      hasData: !!dashboardResponse.data
    });

  } catch (error) {
    console.log('  ❌ Homepage dashboard failed:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
  }

  try {
    // Test top projects
    console.log('  Testing /api/top-projects...');
    const topProjectsResponse = await axios.get(`${config.baseUrl}/api/top-projects`);
    console.log('  ✅ Top projects successful:', {
      status: topProjectsResponse.status,
      hasData: !!topProjectsResponse.data?.data
    });

  } catch (error) {
    console.log('  ❌ Top projects failed:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting API Integration Tests...');
  console.log('=====================================');
  
  // Check if local server is running
  try {
    await axios.get(`${config.baseUrl}/api/health`).catch(() => {
      console.log('⚠️  Local server not running, skipping local endpoint tests');
      console.log('   Start your development server with: npm run dev');
    });
  } catch (error) {
    console.log('⚠️  Local server not running, skipping local endpoint tests');
    console.log('   Start your development server with: npm run dev');
  }

  // Run tests
  await testClockifyAPI();
  await testZohoAPI();
  
  // Only test local endpoints if server is running
  try {
    await axios.get(`${config.baseUrl}/api/health`);
    await testLocalEndpoints();
  } catch (error) {
    console.log('\n⚠️  Skipping local endpoint tests (server not running)');
  }

  console.log('\n✅ API Integration Tests completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Review the test results above');
  console.log('2. Fix any failing tests');
  console.log('3. Deploy to Vercel');
  console.log('4. Monitor Vercel logs for errors');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testClockifyAPI, testZohoAPI, testLocalEndpoints };
