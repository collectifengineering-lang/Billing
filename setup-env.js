#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment for closed projects...\n');

// Check if .env.local exists
const envLocalPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (fs.existsSync(envLocalPath)) {
  console.log('✅ .env.local already exists');
  
  // Check if it has the required database variables
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  if (envContent.includes('DATABASE_URL') || envContent.includes('PRISMA_DATABASE_URL')) {
    console.log('✅ Database configuration found in .env.local');
  } else {
    console.log('⚠️  Database configuration missing from .env.local');
    console.log('Please add your Supabase database URL to .env.local');
    console.log('Example:');
    console.log('DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=30&connect_timeout=30&prepared_statements=false"');
  }
} else {
  console.log('❌ .env.local not found');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Copying env.example to .env.local...');
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('✅ Created .env.local from env.example');
    console.log('⚠️  Please update .env.local with your actual Supabase database credentials');
  } else {
    console.log('❌ env.example not found');
  }
}

console.log('\n📝 Next steps:');
console.log('1. Update .env.local with your Supabase database URL');
console.log('2. Run: npx prisma generate');
console.log('3. Run: npx prisma db push');
console.log('4. Restart your development server');

console.log('\n🔗 Supabase Database URL format:');
console.log('DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=30&connect_timeout=30&prepared_statements=false"');
