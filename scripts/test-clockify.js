const axios = require('axios');

// Test Clockify API credentials
async function testClockifyAPI() {
  const apiKey = 'ZjM1N2ExMWItYmY1Ny00OTdlLTkwNWEtMGRkYTI5OTgzOGQ4';
  const workspaceId = '614b50a11a9df259f8713e9a';
  const baseUrl = 'https://api.clockify.me/api/v1';

  console.log('🔍 Testing Clockify API Configuration...\n');

  try {
    // Test 1: Get user info
    console.log('1. Testing user endpoint...');
    const userResponse = await axios.get(`${baseUrl}/user`, {
      headers: { 'X-Api-Key': apiKey }
    });
    console.log('✅ User endpoint successful');
    console.log(`   User: ${userResponse.data.name} (${userResponse.data.email})`);
    console.log(`   Active Workspace: ${userResponse.data.activeWorkspace}`);
    console.log(`   Default Workspace: ${userResponse.data.defaultWorkspace}\n`);

    // Test 2: Get workspaces
    console.log('2. Testing workspaces endpoint...');
    const workspacesResponse = await axios.get(`${baseUrl}/workspaces`, {
      headers: { 'X-Api-Key': apiKey }
    });
    console.log('✅ Workspaces endpoint successful');
    console.log(`   Found ${workspacesResponse.data.length} workspaces:`);
    workspacesResponse.data.forEach(ws => {
      console.log(`   - ${ws.name} (ID: ${ws.id})`);
    });
    console.log();

    // Test 3: Verify specific workspace exists
    console.log('3. Testing specific workspace...');
    const workspaceResponse = await axios.get(`${baseUrl}/workspaces/${workspaceId}`, {
      headers: { 'X-Api-Key': apiKey }
    });
    console.log('✅ Workspace endpoint successful');
    console.log(`   Workspace: ${workspaceResponse.data.name}`);
    console.log(`   ID: ${workspaceResponse.data.id}`);
    console.log(`   Premium: ${workspaceResponse.data.premium}\n`);

    // Test 4: Get projects in workspace
    console.log('4. Testing projects endpoint...');
    const projectsResponse = await axios.get(`${baseUrl}/workspaces/${workspaceId}/projects`, {
      headers: { 'X-Api-Key': apiKey }
    });
    console.log('✅ Projects endpoint successful');
    console.log(`   Found ${projectsResponse.data.length} projects\n`);

    // Test 5: Get time entries (recent)
    console.log('5. Testing time entries endpoint...');
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = oneWeekAgo.toISOString();
    const endDate = now.toISOString();
    
    const timeEntriesResponse = await axios.get(`${baseUrl}/workspaces/${workspaceId}/time-entries`, {
      headers: { 'X-Api-Key': apiKey },
      params: {
        start: startDate,
        end: endDate
      }
    });
    console.log('✅ Time entries endpoint successful');
    console.log(`   Found ${timeEntriesResponse.data.length} time entries in the last week\n`);

    console.log('🎉 All Clockify API tests passed! Your configuration is working correctly.');

  } catch (error) {
    console.error('❌ Clockify API test failed:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.statusText}`);
      console.error(`   URL: ${error.config.url}`);
      
      if (error.response.status === 401) {
        console.error('   🔑 Authentication failed - check your API key');
      } else if (error.response.status === 403) {
        console.error('   🚫 Access forbidden - check your workspace permissions');
      } else if (error.response.status === 404) {
        console.error('   🔍 Endpoint not found - check your workspace ID');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Verify your API key is correct');
    console.log('   2. Ensure the workspace ID exists and you have access');
    console.log('   3. Check if your Clockify account is active');
    console.log('   4. Verify the API endpoints are correct');
  }
}

// Run the test
testClockifyAPI();
