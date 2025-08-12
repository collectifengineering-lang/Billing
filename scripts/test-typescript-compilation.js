#!/usr/bin/env node

/**
 * Test script to verify TypeScript compilation works correctly
 * This helps catch type errors before deployment
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Testing TypeScript compilation...');
console.log('=====================================');

try {
  // Check if TypeScript is installed
  console.log('1. Checking TypeScript installation...');
  execSync('npx tsc --version', { stdio: 'inherit' });
  
  // Try to compile the project
  console.log('\n2. Attempting TypeScript compilation...');
  execSync('npx tsc --noEmit', { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  
  console.log('\n✅ TypeScript compilation successful! No type errors found.');
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy to Vercel');
  console.log('2. Monitor build logs for any remaining issues');
  console.log('3. Test the API endpoints after deployment');
  
} catch (error) {
  console.error('\n❌ TypeScript compilation failed!');
  console.error('\nError details:');
  console.error(error.message);
  
  console.log('\n🔧 To fix type errors:');
  console.log('1. Review the error messages above');
  console.log('2. Fix any null/undefined access issues');
  console.log('3. Use optional chaining (?.) and nullish coalescing (??)');
  console.log('4. Add proper type guards where needed');
  console.log('5. Run this script again to verify fixes');
  
  process.exit(1);
}
