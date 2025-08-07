/** @type {import('next').NextConfig} */
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