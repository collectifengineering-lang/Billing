# Zoho Token Exchange PowerShell Script

# Your Zoho OAuth credentials
$CLIENT_ID = "1000.8RL8WMTDXS0WIP2EJF2XUS6NDSLQEP"
$CLIENT_SECRET = "8a7ee3c04f0a0d860dd215c4449deab9bf15d1d00b"
$REDIRECT_URI = "https://billing-collectif-engineering.vercel.app/oauth/callback"

# The authorization code you received
$AUTHORIZATION_CODE = "1000.723221d367f3d53e7fb8238ba6601da3.2fae110ec995d8024ec81a4a569b37cd"

Write-Host "🔄 Exchanging authorization code for tokens..." -ForegroundColor Yellow
Write-Host "Client ID: $CLIENT_ID" -ForegroundColor Cyan
Write-Host "Redirect URI: $REDIRECT_URI" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Gray

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
    $response = Invoke-RestMethod -Uri "https://accounts.zoho.com/oauth/v2/token" -Method POST -Body $body -ContentType "application/json"

    if ($response.access_token) {
        Write-Host "✅ Successfully exchanged authorization code for tokens!" -ForegroundColor Green
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
        
        Write-Host ""
        Write-Host "⚠️  Important Notes:" -ForegroundColor Yellow
        Write-Host "- Access tokens expire in 1 hour" -ForegroundColor White
        Write-Host "- Use the refresh token to get new access tokens" -ForegroundColor White
        Write-Host "- Keep your refresh token secure" -ForegroundColor White
        Write-Host "- The refresh token doesn't expire unless revoked" -ForegroundColor White
        
        # Save to a file for easy copying
        $envContent = @"
# Zoho OAuth Tokens - Generated on $(Get-Date)
ZOHO_ACCESS_TOKEN=$($response.access_token)
ZOHO_REFRESH_TOKEN=$($response.refresh_token)
ZOHO_API_DOMAIN=$($response.api_domain)
"@
        
        $envContent | Out-File -FilePath "zoho-tokens.env" -Encoding UTF8
        Write-Host ""
        Write-Host "💾 Tokens also saved to 'zoho-tokens.env' file for easy copying" -ForegroundColor Green
        
    } else {
        Write-Host "❌ Failed to get tokens from response:" -ForegroundColor Red
        Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Token exchange failed:" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
