require('dotenv').config({ path: '.env.local' });
const { clockifyService } = require('../lib/clockify');

async function testClockifyIntegration() {
  console.log('🧪 Testing Clockify Integration...\n');
  
  // Check configuration status
  console.log('📋 Configuration Status:');
  const configStatus = clockifyService.getConfigurationStatus();
  console.log(JSON.stringify(configStatus, null, 2));
  console.log('');
  
  if (!configStatus.configured) {
    console.log('❌ Clockify is not properly configured');
    console.log('Environment variables:');
    console.log(`CLOCKIFY_API_KEY: ${process.env.CLOCKIFY_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`CLOCKIFY_WORKSPACE_ID: ${process.env.CLOCKIFY_WORKSPACE_ID ? '✅ Set' : '❌ Missing'}`);
    return;
  }
  
  try {
    // Test user fetch
    console.log('👤 Testing user fetch...');
    const user = await clockifyService.getUser();
    console.log('✅ User data:', {
      id: user.id,
      name: user.name,
      email: user.email,
      activeWorkspace: user.activeWorkspace
    });
    console.log('');
    
    // Test projects fetch
    console.log('📁 Testing projects fetch...');
    const projects = await clockifyService.getProjects();
    console.log(`✅ Found ${projects.length} projects`);
    if (projects.length > 0) {
      console.log('Sample project:', {
        id: projects[0].id,
        name: projects[0].name,
        billable: projects[0].billable,
        archived: projects[0].archived
      });
    }
    console.log('');
    
    // Test time entries fetch (last 7 days)
    console.log('⏰ Testing time entries fetch...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const timeEntries = await clockifyService.getAllTimeEntries(
      startDate.toISOString(),
      endDate.toISOString()
    );
    console.log(`✅ Found ${timeEntries.length} time entries in the last 7 days`);
    if (timeEntries.length > 0) {
      console.log('Sample time entry:', {
        id: timeEntries[0].id,
        description: timeEntries[0].description,
        projectId: timeEntries[0].projectId,
        billable: timeEntries[0].billable,
        duration: timeEntries[0].timeInterval?.duration
      });
    }
    console.log('');
    
    // Test workspace fetch
    console.log('🏢 Testing workspaces fetch...');
    const workspaces = await clockifyService.getWorkspaces();
    console.log(`✅ Found ${workspaces.length} workspaces`);
    if (workspaces.length > 0) {
      console.log('Sample workspace:', {
        id: workspaces[0].id,
        name: workspaces[0].name,
        premium: workspaces[0].premium
      });
    }
    console.log('');
    
    console.log('🎉 All Clockify integration tests passed!');
    
  } catch (error) {
    console.error('❌ Clockify integration test failed:', error.message);
    console.error('Error details:', error);
  }
}

testClockifyIntegration().catch(console.error);
