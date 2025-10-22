// Simple test script to verify projections API
const testProjectionsAPI = async () => {
  try {
    console.log('Testing projections API...');
    
    // Test the projections API endpoint
    const response = await fetch('http://localhost:3000/api/projections');
    
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Projections API Response:', data);
    console.log('Number of projects with projections:', Object.keys(data).length);
    
    // Check if we have any projection data
    const totalProjections = Object.values(data).reduce((sum, project) => {
      return sum + Object.keys(project).length;
    }, 0);
    
    console.log('Total projection entries:', totalProjections);
    
    if (totalProjections === 0) {
      console.log('⚠️  No projection data found in database');
      console.log('This could be why projection fees are not showing in the table');
    } else {
      console.log('✅ Projection data found - the issue might be in the component data flow');
    }
    
  } catch (error) {
    console.error('Error testing projections API:', error);
  }
};

// Run the test
testProjectionsAPI();
