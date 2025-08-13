# PowerShell script to fix RLS policy performance warnings
# This script will help you apply the SQL fixes to resolve Supabase warnings

Write-Host "=== RLS Policy Performance Fix Script ===" -ForegroundColor Green
Write-Host "This script will help you fix the Supabase auth_rls_initplan warnings" -ForegroundColor Yellow
Write-Host ""

# Check if the SQL file exists
$sqlFile = "fix-all-rls-policies.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: $sqlFile not found!" -ForegroundColor Red
    Write-Host "Please ensure the SQL file is in the same directory as this script." -ForegroundColor Red
    exit 1
}

Write-Host "Found SQL file: $sqlFile" -ForegroundColor Green
Write-Host ""

Write-Host "To fix the RLS policy warnings, you need to:" -ForegroundColor Cyan
Write-Host "1. Open your Supabase dashboard" -ForegroundColor White
Write-Host "2. Go to the SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of $sqlFile" -ForegroundColor White
Write-Host "4. Execute the script" -ForegroundColor White
Write-Host ""

Write-Host "The script will:" -ForegroundColor Cyan
Write-Host "- Drop all existing problematic RLS policies" -ForegroundColor White
Write-Host "- Recreate them with optimized (select auth.role()) syntax" -ForegroundColor White
Write-Host "- Verify the policies were created correctly" -ForegroundColor White
Write-Host ""

Write-Host "Would you like to view the SQL file contents? (y/n)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "=== SQL File Contents ===" -ForegroundColor Green
    Get-Content $sqlFile | ForEach-Object { Write-Host $_ -ForegroundColor White }
    Write-Host "=== End of SQL File ===" -ForegroundColor Green
}

Write-Host ""
Write-Host "After running the SQL script in Supabase:" -ForegroundColor Cyan
Write-Host "- The auth_rls_initplan warnings should be resolved" -ForegroundColor White
Write-Host "- Query performance should improve at scale" -ForegroundColor White
Write-Host "- Your RLS policies will still provide the same security" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
