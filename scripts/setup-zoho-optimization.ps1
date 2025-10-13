# PowerShell script to set up Zoho API optimizations

# Ensure we're in the project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "Setting up Zoho API Optimizations..." -ForegroundColor Cyan
Write-Host "Project directory: $projectRoot" -ForegroundColor Gray
Write-Host ""

# Step 1: Install dependencies
Write-Host "Step 1: Checking dependencies..." -ForegroundColor Yellow
try {
    npm list @prisma/client | Out-Null
    Write-Host "[OK] Prisma client is installed" -ForegroundColor Green
} catch {
    Write-Host "[INSTALL] Installing Prisma client..." -ForegroundColor Yellow
    npm install @prisma/client
}

try {
    npm list p-limit | Out-Null
    Write-Host "[OK] p-limit is installed" -ForegroundColor Green
} catch {
    Write-Host "[INSTALL] Installing p-limit..." -ForegroundColor Yellow
    npm install p-limit
}

Write-Host ""

# Step 2: Generate Prisma client
Write-Host "Step 2: Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Prisma client generated successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Apply database migration
Write-Host "Step 3: Applying database migration..." -ForegroundColor Yellow
Write-Host "This will create new tables: zoho_token_cache, financial_data_cache, performance_telemetry" -ForegroundColor Gray
Write-Host ""

$confirmation = Read-Host "Do you want to apply the migration? (y/n)"
if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
    npx prisma migrate dev --name add_zoho_optimization_tables
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Migration applied successfully" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Migration may have failed. Try manually: npx prisma db push" -ForegroundColor Yellow
    }
} else {
    Write-Host "[SKIP] Skipping migration. You can apply it later with: npx prisma migrate dev" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Summary
Write-Host "Zoho API Optimization Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "New Features Available:" -ForegroundColor Cyan
Write-Host "  - Token caching in Supabase" -ForegroundColor White
Write-Host "  - Financial data caching" -ForegroundColor White
Write-Host "  - Projects and invoices caching" -ForegroundColor White
Write-Host "  - Performance telemetry tracking" -ForegroundColor White
Write-Host "  - Improved rate limiting with exponential backoff" -ForegroundColor White
Write-Host "  - Parallel API request batching" -ForegroundColor White
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Cyan
Write-Host "  - View telemetry:     GET /api/telemetry" -ForegroundColor White
Write-Host "  - Clear cache:        DELETE /api/telemetry?action=clear-cache" -ForegroundColor White
Write-Host "  - Cleanup telemetry:  DELETE /api/telemetry?action=cleanup-telemetry" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - Full guide: ZOHO_API_OPTIMIZATION.md" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test locally: npm run dev" -ForegroundColor White
Write-Host "  2. Check telemetry: http://localhost:3000/api/telemetry" -ForegroundColor White
Write-Host "  3. Deploy to production: vercel --prod" -ForegroundColor White
Write-Host ""
