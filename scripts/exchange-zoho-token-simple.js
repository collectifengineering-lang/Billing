const https = require('https');

// ⚠️  UPDATE THESE VALUES WITH YOUR ACTUAL CREDENTIALS
const CLIENT_ID = '1000.8RL8WMTDXS0WIP2EJF2XUS6NDSLQEP';
const CLIENT_SECRET = '8a7ee3c04f0a0d860dd215c4449deab9bf15d1d00b';
const REDIRECT_URI = 'https://billing-collectif-engineering.vercel.app/oauth/callback';

// The authorization code you received
const AUTHORIZATION_CODE = '1000.5ce448e1560f10c319bc6cfb505374a3.77a82600c7c23f7b2f09922202e37d5b';

function exchangeCodeForTokens() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      code: AUTHORIZATION_CODE,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    const options = {
      hostname: 'accounts.zoho.com',
      port: 443,
      path: '/oauth/v2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.access_token) {
            console.log('✅ Successfully exchanged authorization code for tokens!');
            console.log('\n📋 Your tokens:');
            console.log('='.repeat(50));
            console.log(`Access Token: ${response.access_token}`);
            console.log(`Refresh Token: ${response.refresh_token}`);
            console.log(`Token Type: ${response.token_type}`);
            console.log(`Expires In: ${response.expires_in} seconds`);
            console.log(`API Domain: ${response.api_domain}`);
            console.log('='.repeat(50));
            
            console.log('\n🔧 Add these to your .env.local file:');
            console.log('='.repeat(50));
            console.log(`ZOHO_ACCESS_TOKEN=${response.access_token}`);
            console.log(`ZOHO_REFRESH_TOKEN=${response.refresh_token}`);
            console.log(`ZOHO_API_DOMAIN=${response.api_domain}`);
            console.log('='.repeat(50));
            
            console.log('\n⚠️  Important Notes:');
            console.log('- Access tokens expire in 1 hour');
            console.log('- Use the refresh token to get new access tokens');
            console.log('- Keep your refresh token secure');
            console.log('- The refresh token doesn\'t expire unless revoked');
            
          } else {
            console.error('❌ Failed to get tokens from response:');
            console.error(response);
          }
          
          resolve(response);
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          console.error('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Check if credentials are set
if (CLIENT_ID === 'YOUR_ZOHO_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_ZOHO_CLIENT_SECRET_HERE') {
  console.error('❌ Please update the CLIENT_ID and CLIENT_SECRET in this script first!');
  console.log('\n📝 Steps to use this script:');
  console.log('1. Open this file in your editor');
  console.log('2. Replace YOUR_ZOHO_CLIENT_ID_HERE with your actual Zoho Client ID');
  console.log('3. Replace YOUR_ZOHO_CLIENT_SECRET_HERE with your actual Zoho Client Secret');
  console.log('4. Update the REDIRECT_URI to match your actual redirect URI');
  console.log('5. Save the file and run: node scripts/exchange-zoho-token-simple.js');
  process.exit(1);
}

// Run the token exchange
console.log('🔄 Exchanging authorization code for tokens...');
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log('='.repeat(50));

exchangeCodeForTokens()
  .then(() => {
    console.log('\n✅ Token exchange completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Token exchange failed:', error);
    process.exit(1);
  });
