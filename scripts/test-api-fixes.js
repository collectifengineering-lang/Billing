#!/usr/bin/env node

/**
 * Test script for API integration fixes
 * Tests Clockify and Zoho APIs, plus local endpoints
 */

const axios = require('axios');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const config = {
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

async function testClockifyAPI() {
  console.log('\n🔍 Testing Clockify API Integration...');
  console.log('=====================================');
  
  if (!config.clockify.apiKey || !config.clockify.workspaceId) {
    console.log('❌ Missing Clockify configuration');
    return;
  }

  try {
    // Test 1: Reports API (preferred method)
    console.log('  Testing Reports API...');
    const reportsResponse = await axios.post(
      `https://reports.api.clockify.me/v1/workspaces/${config.clockify.workspaceId}/reports/detailed`,
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

    // Test data format
    if (reportsResponse.data?.timeentries?.length > 0) {
      const sampleEntry = reportsResponse.data.timeentries[0];
      console.log('  📝 Sample entry format:', {
        id: sampleEntry.id,
        duration: sampleEntry.duration,
        durationType: typeof sampleEntry.duration,
        projectId: sampleEntry.projectId,
        userId: sampleEntry.userId
      });
    }

  } catch (error) {
    console.log('  ❌ Reports API failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    // Test 2: User time entries (fallback method)
    try {
      console.log('  Testing User Time Entries API (fallback)...');
      console.log('  Note: Reports API may require Pro plan. Testing fallback method...');
      
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

      console.log('  ✅ User Time Entries API successful (fallback):', {
        status: timeEntriesResponse.status,
        timeEntriesCount: timeEntriesResponse.data?.length || 0
      });

      // Test data format
      if (timeEntriesResponse.data?.length > 0) {
        const sampleEntry = timeEntriesResponse.data[0];
        console.log('  📝 Sample fallback entry format:', {
          id: sampleEntry.id,
          duration: sampleEntry.duration,
          durationType: typeof sampleEntry.duration,
          projectId: sampleEntry.projectId,
          userId: sampleEntry.userId
        });
      }

    } catch (fallbackError) {
      console.log('  ❌ Fallback method also failed:', {
        status: fallbackError.response?.status,
        message: fallbackError.response?.data?.message || fallbackError.message
      });
    }
  }
}

async function testZohoAPI() {
  console.log('\n🔍 Testing Zoho API Integration...');
  console.log('==================================');
  
  if (!config.zoho.clientId || !config.zoho.clientSecret || !config.zoho.refreshToken) {
    console.log('❌ Missing Zoho configuration');
    return;
  }

  try {
    // Test token refresh
    console.log('  Testing OAuth token refresh...');
    const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        refresh_token: config.zoho.refreshToken,
        client_id: config.zoho.clientId,
        client_secret: config.zoho.clientSecret,
        grant_type: 'refresh_token',
      }
    });

    if (tokenResponse.data.access_token) {
      console.log('  ✅ Token refresh successful');
      
      // Test API call with token
      console.log('  Testing API call with new token...');
      const apiResponse = await axios.get(
        `https://www.zohoapis.com/books/v3/projects?page=1&per_page=5`,
        {
          headers: {
            'Authorization': `Bearer ${tokenResponse.data.access_token}`,
            'Content-Type': 'application/json',
          },
          params: {
            organization_id: config.zoho.organizationId,
          },
        }
      );

      console.log('  ✅ API call successful:', {
        status: apiResponse.status,
        projectsCount: apiResponse.data?.projects?.length || 0
      });
    } else {
      console.log('  ❌ No access token received');
    }

  } catch (error) {
    console.log('  ❌ Zoho API test failed:', {
      status: error.response?.status,
      message: error.response?.data?.error_description || error.message
    });
    
    if (error.response?.data?.error_description?.includes('too many requests')) {
      console.log('  ⚠️ Rate limit hit - this is expected behavior');
    }
  }
}

async function testLocalEndpoints() {
  console.log('\n🔍 Testing Local API Endpoints...');
  console.log('==================================');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test projects endpoint
    console.log('  Testing /api/projects...');
    const projectsResponse = await axios.get(`${baseUrl}/api/projects`);
    console.log('  ✅ Projects endpoint:', {
      status: projectsResponse.status,
      success: projectsResponse.data.success,
      count: projectsResponse.data.count
    });
  } catch (error) {
    console.log('  ❌ Projects endpoint failed:', error.message);
  }

  try {
    // Test top-projects endpoint
    console.log('  Testing /api/top-projects...');
    const topProjectsResponse = await axios.get(`${baseUrl}/api/top-projects`);
    console.log('  ✅ Top-projects endpoint:', {
      status: topProjectsResponse.status,
      success: topProjectsResponse.data.success,
      timeEntriesCount: topProjectsResponse.data.data?.timeEntriesCount,
      projectsCount: topProjectsResponse.data.data?.projectsCount
    });
  } catch (error) {
    console.log('  ❌ Top-projects endpoint failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Integration Tests...');
  console.log('=====================================');
  
  await testClockifyAPI();
  await testZohoAPI();
  await testLocalEndpoints();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Check the results above for any failures');
  console.log('2. If Clockify Reports API fails, verify Pro plan subscription');
  console.log('3. If Zoho fails, check rate limits and credentials');
  console.log('4. Deploy fixes to Vercel and monitor logs');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testClockifyAPI, testZohoAPI, testLocalEndpoints };
