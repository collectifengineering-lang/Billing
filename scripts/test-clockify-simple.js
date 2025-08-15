require('dotenv').config({ path: '.env.local' });

console.log('🔍 Environment variables:');
console.log('CLOCKIFY_API_KEY:', process.env.CLOCKIFY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('CLOCKIFY_WORKSPACE_ID:', process.env.CLOCKIFY_WORKSPACE_ID ? '✅ Set' : '❌ Missing');
console.log('');

// Test the Clockify service directly
async function testClockifyService() {
  try {
    // Import the service
    const { clockifyService } = require('../lib/clockify.ts');
    
    console.log('📋 Configuration Status:');
    const configStatus = clockifyService.getConfigurationStatus();
    console.log(JSON.stringify(configStatus, null, 2));
    console.log('');
    
    if (!configStatus.configured) {
      console.log('❌ Clockify is not properly configured');
      return;
    }
    
    console.log('✅ Clockify is configured, testing API calls...');
    
    // Test user fetch
    console.log('👤 Testing user fetch...');
    const user = await clockifyService.getUser();
    console.log('User data:', {
      id: user.id,
      name: user.name,
      email: user.email
    });
    console.log('');
    
    // Test projects fetch
    console.log('📁 Testing projects fetch...');
    const projects = await clockifyService.getProjects();
    console.log(`Found ${projects.length} projects`);
    if (projects.length > 0) {
      console.log('First project:', {
        id: projects[0].id,
        name: projects[0].name,
        billable: projects[0].billable
      });
    }
    console.log('');
    
    // Test time entries fetch
    console.log('⏰ Testing time entries fetch...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();
    
    const timeEntries = await clockifyService.getAllTimeEntries(
      startDate.toISOString(),
      endDate.toISOString()
    );
    console.log(`Found ${timeEntries.length} time entries in the last 7 days`);
    if (timeEntries.length > 0) {
      console.log('First time entry:', {
        id: timeEntries[0].id,
        description: timeEntries[0].description,
        billable: timeEntries[0].billable,
        duration: timeEntries[0].timeInterval?.duration
      });
    }
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

testClockifyService().catch(console.error);
