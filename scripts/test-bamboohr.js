// Simple test script for BambooHR integration validation
// This script validates the basic structure without requiring TypeScript modules

console.log('🧪 BambooHR Integration Validation...\n');

// Check if required files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'lib/bamboohr.ts',
  'lib/types.ts',
  'app/api/payroll/bamboohr/route.ts'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

console.log('');

// Check if SurePayroll files have been removed
const removedFiles = [
  'lib/surepayroll.ts',
  'app/api/payroll/surepayroll/route.ts'
];

console.log('🗑️ Checking removed SurePayroll files...');
let allRemoved = true;

removedFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`✅ ${file} has been removed`);
  } else {
    console.log(`❌ ${file} still exists`);
    allRemoved = false;
  }
});

console.log('');

// Check environment variables
console.log('🔧 Environment Variables:');
console.log(`BAMBOOHR_SUBDOMAIN: ${process.env.BAMBOOHR_SUBDOMAIN || 'Not set'}`);
console.log(`BAMBOOHR_API_KEY: ${process.env.BAMBOOHR_API_KEY ? 'Set' : 'Not set'}`);

console.log('');

if (allFilesExist && allRemoved) {
  console.log('🎉 BambooHR integration setup is complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Set BAMBOOHR_SUBDOMAIN in your .env.local file');
  console.log('2. Set BAMBOOHR_API_KEY in your .env.local file');
  console.log('3. Test the connection using: POST /api/payroll/bamboohr');
  console.log('4. Use the test-connection action to verify API access');
} else {
  console.log('⚠️ Some issues were found. Please review the output above.');
  process.exit(1);
}
