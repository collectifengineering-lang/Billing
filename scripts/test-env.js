async function testEnvironment() {
  console.log('Testing Environment and Database Connection...\n');

  // Check environment variables
  console.log('1. Environment Variables:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
  console.log(`   DIRECT_URL: ${process.env.DIRECT_URL ? 'SET' : 'NOT SET'}`);
  console.log(`   PRISMA_DATABASE_URL: ${process.env.PRISMA_DATABASE_URL ? 'SET' : 'NOT SET'}`);

  // Check if we can load Prisma
  console.log('\n2. Prisma Client:');
  try {
    const { PrismaClient } = require('@prisma/client');
    console.log('   ✓ Prisma Client loaded successfully');
    
    const prisma = new PrismaClient();
    console.log('   ✓ Prisma Client instance created');
    
    // Try to connect
    console.log('\n3. Database Connection:');
    try {
      await prisma.$connect();
      console.log('   ✓ Database connection successful');
      
      // Try a simple query
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('   ✓ Database query successful:', result);
      
      await prisma.$disconnect();
      console.log('   ✓ Database disconnected');
    } catch (error) {
      console.log(`   ✗ Database connection failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`   ✗ Failed to load Prisma Client: ${error.message}`);
  }

  console.log('\nTest completed!');
}

// Run the test
testEnvironment().catch(console.error);
