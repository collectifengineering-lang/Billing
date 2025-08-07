#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up database schema...');

try {
  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env.local not found. Please create it with your database URL.');
    console.log('Example:');
    console.log('PRISMA_DATABASE_URL="postgresql://username:password@host:port/database"');
    process.exit(1);
  }

  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Push database schema
  console.log('🗄️  Pushing database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('✅ Database setup completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Deploy your app to Vercel');
  console.log('2. Set up environment variables in Vercel dashboard');
  console.log('3. Run the migration endpoint: https://your-app.vercel.app/api/migrate');
  console.log('4. Test the API: https://your-app.vercel.app/api/statuses');

} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  console.log('');
  console.log('Troubleshooting:');
  console.log('1. Check your PRISMA_DATABASE_URL in .env.local');
  console.log('2. Ensure your database is accessible');
  console.log('3. Try running: npx prisma db push --force-reset');
  process.exit(1);
}
