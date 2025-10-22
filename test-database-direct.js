// Test database connection directly
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Count projections
    const count = await prisma.projection.count();
    console.log(`Total projections in database: ${count}`);
    
    // Get first few projections
    const projections = await prisma.projection.findMany({
      take: 5,
      orderBy: { id: 'asc' }
    });
    
    console.log('First 5 projections:');
    projections.forEach(p => {
      console.log(`  ${p.projectId}/${p.month}: $${p.value}`);
    });
    
    // Test the same query as the API
    const allProjections = await prisma.projection.findMany();
    console.log(`API query returned ${allProjections.length} projections`);
    
    // Transform to the same format as the API
    const formatted = allProjections.reduce((acc, projection) => {
      if (!acc[projection.projectId]) acc[projection.projectId] = {};
      acc[projection.projectId][projection.month] = projection.value;
      return acc;
    }, {});
    
    console.log('Formatted data keys:', Object.keys(formatted));
    console.log('Sample formatted data:', JSON.stringify(formatted, null, 2).substring(0, 500) + '...');
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
