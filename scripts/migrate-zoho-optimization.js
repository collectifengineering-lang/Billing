#!/usr/bin/env node

/**
 * Migration script for Zoho API optimization features
 * This script sets up the new database tables for token caching, data caching, and telemetry
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Zoho optimization migration...\n');

// Step 1: Check if Prisma is installed
console.log('📦 Step 1: Checking Prisma installation...');
try {
  execSync('npx prisma --version', { stdio: 'inherit' });
  console.log('✅ Prisma is installed\n');
} catch (error) {
  console.error('❌ Prisma is not installed. Please run: npm install prisma @prisma/client');
  process.exit(1);
}

// Step 2: Generate Prisma client
console.log('📦 Step 2: Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

// Step 3: Create migration
console.log('📦 Step 3: Creating database migration...');
try {
  execSync('npx prisma migrate dev --name add_zoho_optimization_tables', { stdio: 'inherit' });
  console.log('✅ Migration created and applied\n');
} catch (error) {
  console.error('❌ Failed to create migration:', error.message);
  console.log('\n⚠️ If you see errors about existing migrations, you can:');
  console.log('  1. Run: npx prisma db push --skip-generate');
  console.log('  2. Or manually apply the migration with: npx prisma migrate deploy');
  process.exit(1);
}

// Step 4: Verify tables
console.log('📦 Step 4: Verifying new tables...');
try {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  (async () => {
    try {
      // Test token cache table
      await prisma.zohoTokenCache.findMany({ take: 1 });
      console.log('✅ zoho_token_cache table verified');
      
      // Test financial data cache table
      await prisma.financialDataCache.findMany({ take: 1 });
      console.log('✅ financial_data_cache table verified');
      
      // Test telemetry table
      await prisma.performanceTelemetry.findMany({ take: 1 });
      console.log('✅ performance_telemetry table verified');
      
      await prisma.$disconnect();
      
      console.log('\n✨ Migration completed successfully!\n');
      console.log('📊 New features available:');
      console.log('  - Token caching in Supabase (persistent across function invocations)');
      console.log('  - Financial data caching (1 hour TTL)');
      console.log('  - Performance telemetry tracking');
      console.log('  - Rate limit monitoring');
      console.log('\n🔗 View telemetry at: /api/telemetry');
      console.log('🔗 Clear cache at: /api/telemetry?action=clear-cache (DELETE request)');
      console.log('🔗 Cleanup old telemetry: /api/telemetry?action=cleanup-telemetry&days=30 (DELETE request)\n');
    } catch (error) {
      console.error('❌ Failed to verify tables:', error.message);
      await prisma.$disconnect();
      process.exit(1);
    }
  })();
} catch (error) {
  console.error('❌ Failed to verify tables:', error.message);
  process.exit(1);
}

