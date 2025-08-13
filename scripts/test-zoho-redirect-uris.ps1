# Test Multiple Zoho Redirect URI Variations

# Your Zoho OAuth credentials
$CLIENT_ID = "1000.8RL8WMTDXS0WIP2EJF2XUS6NDSLQEP"
$CLIENT_SECRET = "8a7ee3c04f0a0d860dd215c4449deab9bf15d1d00b"

# The authorization code you received
$AUTHORIZATION_CODE = "1000.5ce448e1560f10c319bc6cfb505374a3.77a82600c7c23f7b2f09922202e37d5b"

# Test different redirect URI variations
$REDIRECT_URIS = @(
    "https://billing-collectif-engineering.vercel.app/oauth/callback",
    "https://billing-collectif-engineering.vercel.app/api/auth/zoho/callback",
    "https://billing-collectif-engineering.vercel.app/auth/callback",
    "https://billing-collectif-engineering.vercel.app/callback",
    "https://billing-collectif-engineering.vercel.app/api/zoho/callback",
    "https://billing-collectif-engineering.vercel.app/zoho/callback"
)

Write-Host "🔄 Testing multiple redirect URI variations..." -ForegroundColor Yellow
Write-Host "Client ID: $CLIENT_ID" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray

foreach ($REDIRECT_URI in $REDIRECT_URIS) {
    Write-Host ""
    Write-Host "Testing: $REDIRECT_URI" -ForegroundColor Cyan
    Write-Host ("-" * 60) -ForegroundColor Gray
    
    try {
        # Prepare the request body
        $body = @{
            code = $AUTHORIZATION_CODE
            client_id = $CLIENT_ID
            client_secret = $CLIENT_SECRET
            redirect_uri = $REDIRECT_URI
            grant_type = "authorization_code"
        } | ConvertTo-Json

        # Make the HTTP request
        $response = Invoke-RestMethod -Uri "https://accounts.zoho.com/oauth/v2/token" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30

        if ($response.access_token) {
            Write-Host "✅ SUCCESS! This redirect URI works!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Your tokens:" -ForegroundColor Yellow
            Write-Host ("=" * 50) -ForegroundColor Gray
            Write-Host "Access Token: $($response.access_token)" -ForegroundColor White
            Write-Host "Refresh Token: $($response.refresh_token)" -ForegroundColor White
            Write-Host "Token Type: $($response.token_type)" -ForegroundColor White
            Write-Host "Expires In: $($response.expires_in) seconds" -ForegroundColor White
            Write-Host "API Domain: $($response.api_domain)" -ForegroundColor White
            Write-Host ("=" * 50) -ForegroundColor Gray
            
            Write-Host ""
            Write-Host "🔧 Add these to your .env.local file:" -ForegroundColor Yellow
            Write-Host ("=" * 50) -ForegroundColor Gray
            Write-Host "ZOHO_ACCESS_TOKEN=$($response.access_token)" -ForegroundColor Green
            Write-Host "ZOHO_REFRESH_TOKEN=$($response.refresh_token)" -ForegroundColor Green
            Write-Host "ZOHO_API_DOMAIN=$($response.api_domain)" -ForegroundColor Green
            Write-Host ("=" * 50) -ForegroundColor Gray
            
            # Save to a file for easy copying
            $envContent = @"
# Zoho OAuth Tokens - Generated on $(Get-Date)
# Working Redirect URI: $REDIRECT_URI
ZOHO_ACCESS_TOKEN=$($response.access_token)
ZOHO_REFRESH_TOKEN=$($response.refresh_token)
ZOHO_API_DOMAIN=$($response.api_domain)
"@
            
            $envContent | Out-File -FilePath "zoho-tokens.env" -Encoding UTF8
            Write-Host ""
            Write-Host "💾 Tokens saved to 'zoho-tokens.env' file" -ForegroundColor Green
            Write-Host "🎯 Use this redirect URI: $REDIRECT_URI" -ForegroundColor Green
            
            # Exit after first success
            break
            
        } else {
            Write-Host "❌ No access token in response" -ForegroundColor Red
            Write-Host "Response: $($response | ConvertTo-Json -Depth 10)" -ForegroundColor Red
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ Failed with status: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 400) {
            Write-Host "Error: Bad Request - likely invalid parameters" -ForegroundColor Red
        } elseif ($statusCode -eq 401) {
            Write-Host "Error: Unauthorized - check client credentials" -ForegroundColor Red
        } elseif ($statusCode -eq 500) {
            Write-Host "Error: Internal Server Error - likely redirect URI mismatch" -ForegroundColor Red
        } else {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Try to get response body for more details
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                if ($responseBody.Length -gt 100) {
                    Write-Host "Response preview: $($responseBody.Substring(0, 100))..." -ForegroundColor Red
                } else {
                    Write-Host "Response: $responseBody" -ForegroundColor Red
                }
            } catch {
                Write-Host "Could not read response body" -ForegroundColor Red
            }
        }
    }
    
    Write-Host ""
}

Write-Host ""
Write-Host "🏁 Testing completed!" -ForegroundColor Yellow
Write-Host "If none worked, the authorization code may have expired." -ForegroundColor Red
Write-Host "You'll need to get a fresh authorization code from Zoho." -ForegroundColor Red
