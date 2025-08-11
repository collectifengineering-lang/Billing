#!/usr/bin/env node

/**
 * Database Fix Script for Supabase Performance Issues
 * This script helps resolve the RLS performance warnings and database connection issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Database Fix Script for Supabase Performance Issues');
console.log('=====================================================\n');

// Step 1: Check current Prisma configuration
console.log('1. Checking current Prisma configuration...');
try {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  if (schemaContent.includes('provider = "postgresql"')) {
    console.log('✅ Prisma schema is configured for PostgreSQL');
  } else {
    console.log('❌ Prisma schema is NOT configured for PostgreSQL');
    console.log('   This needs to be fixed to connect to Supabase');
  }
  
  if (schemaContent.includes('PRISMA_DATABASE_URL')) {
    console.log('✅ Using PRISMA_DATABASE_URL for database connection');
  } else {
    console.log('❌ Not using PRISMA_DATABASE_URL');
  }
} catch (error) {
  console.error('❌ Error reading Prisma schema:', error.message);
}

// Step 2: Check environment variables
console.log('\n2. Checking environment variables...');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file exists');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('PRISMA_DATABASE_URL')) {
    console.log('✅ PRISMA_DATABASE_URL is set in .env.local');
  } else {
    console.log('❌ PRISMA_DATABASE_URL is NOT set in .env.local');
  }
  
  if (envContent.includes('DIRECT_URL')) {
    console.log('✅ DIRECT_URL is set in .env.local');
  } else {
    console.log('❌ DIRECT_URL is NOT set in .env.local');
  }
} else {
  console.log('❌ .env.local file does not exist');
  console.log('   Please create it with your Supabase database credentials');
}

// Step 3: Generate Prisma client
console.log('\n3. Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
}

// Step 4: Test database connection
console.log('\n4. Testing database connection...');
try {
  execSync('npx prisma db pull', { stdio: 'inherit' });
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  console.log('\n💡 This usually means:');
  console.log('   - Your DATABASE_URL is incorrect');
  console.log('   - Your database credentials are wrong');
  console.log('   - Your database is not accessible');
  console.log('   - Network/firewall issues');
}

// Step 5: Instructions for fixing RLS policies
console.log('\n5. RLS Policy Fix Instructions:');
console.log('================================');
console.log('To fix the Supabase performance warnings, you need to:');
console.log('');
console.log('Option A: Run the SQL script in Supabase Dashboard');
console.log('   1. Go to your Supabase project dashboard');
console.log('   2. Navigate to SQL Editor');
console.log('   3. Copy and paste the contents of fix-rls-policies.sql');
console.log('   4. Execute the script');
console.log('');
console.log('Option B: Use the Supabase CLI');
console.log('   1. Install Supabase CLI: npm install -g supabase');
console.log('   2. Run: supabase db reset');
console.log('   3. Then run: supabase db push');
console.log('');

// Step 6: Environment setup instructions
console.log('6. Environment Setup Instructions:');
console.log('==================================');
console.log('1. Create a .env.local file in your project root');
console.log('2. Add your Supabase database credentials:');
console.log('');
console.log('   PRISMA_DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=30&connect_timeout=30&prepared_statements=false"');
console.log('   DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"');
console.log('');
console.log('3. Replace [project-ref] and [password] with your actual values');
console.log('4. Restart your development server');
console.log('');

// Step 7: Next steps
console.log('7. Next Steps:');
console.log('==============');
console.log('After fixing the environment variables:');
console.log('1. Run: npm run prisma:generate');
console.log('2. Run: npm run prisma:push');
console.log('3. Restart your development server');
console.log('4. Test the application');
console.log('');

console.log('📚 For more information, see:');
console.log('   - POSTGRES_SETUP.md');
console.log('   - DEPLOYMENT_GUIDE.md');
console.log('   - fix-rls-policies.sql');
console.log('');

console.log('🎯 Summary of Issues to Fix:');
console.log('=============================');
console.log('1. ✅ RLS Policies: Use fix-rls-policies.sql in Supabase');
console.log('2. ✅ Database Schema: Updated to use PostgreSQL');
console.log('3. ⚠️  Environment Variables: Set up .env.local with Supabase credentials');
console.log('4. ⚠️  Prisma Client: Regenerate after fixing environment variables');
console.log('');

console.log('🚀 You\'re all set! Fix the environment variables and run the commands above.');
