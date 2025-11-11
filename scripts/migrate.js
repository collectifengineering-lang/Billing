/**
 * Database Migration Script
 * Environment-aware migration script that uses the appropriate URL based on environment
 */

const https = require('https');
const http = require('http');

// Get migration URL from environment or use defaults
const getMigrationUrl = () => {
  // Check for explicit URL in environment
  if (process.env.MIGRATION_URL) {
    return process.env.MIGRATION_URL;
  }

  // Check for Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/migrate`;
  }

  // Check for custom domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/migrate`;
  }

  // Default to localhost for development
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    return 'http://localhost:3000/api/migrate';
  }

  // For production, require explicit URL
  throw new Error(
    'Migration URL not specified. Please set MIGRATION_URL, VERCEL_URL, or NEXT_PUBLIC_APP_URL environment variable.'
  );
};

const migrate = async () => {
  try {
    const url = getMigrationUrl();
    console.log(`🔄 Running database migration via: ${url}`);

    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Migration completed successfully');
            console.log('Response:', data);
            resolve(JSON.parse(data));
          } else {
            console.error(`❌ Migration failed with status ${res.statusCode}`);
            console.error('Response:', data);
            reject(new Error(`Migration failed: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Migration request failed:', error.message);
        reject(error);
      });

      req.end();
    });
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
};

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
