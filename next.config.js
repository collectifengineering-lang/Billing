/** @type {import('next').NextConfig} */

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_AZURE_AD_CLIENT_ID',
  'NEXT_PUBLIC_AZURE_AD_TENANT_ID',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.warn(`   - ${varName}`);
  });
  console.warn('\nSome features may not work correctly. Please set these variables in your .env.local file or deployment environment.');
}

const nextConfig = {
  env: {
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
    ZOHO_ORGANIZATION_ID: process.env.ZOHO_ORGANIZATION_ID,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig 