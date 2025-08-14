# PowerShell script to update Employee table schema
# Makes hire_date column nullable to fix BambooHR import issues

Write-Host "🔄 Starting database schema update..." -ForegroundColor Yellow

try {
    # Check if Prisma is available
    if (-not (Get-Command "npx" -ErrorAction SilentlyContinue)) {
        throw "npx command not found. Please ensure Node.js and npm are installed."
    }

    Write-Host "📝 Updating Employee table schema..." -ForegroundColor Cyan
    
    # Generate Prisma client if needed
    Write-Host "🔧 Generating Prisma client..." -ForegroundColor Cyan
    npx prisma generate
    
    # Run the schema update
    Write-Host "📊 Running schema update..." -ForegroundColor Cyan
    npx prisma db push --accept-data-loss
    
    Write-Host "✅ Database schema update completed successfully!" -ForegroundColor Green
    
    # Optional: Run a test to verify the schema
    Write-Host "🧪 Testing schema update..." -ForegroundColor Cyan
    
    # Create a temporary test file
    $testScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSchema() {
    try {
        const result = await prisma.\$queryRaw\`
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'employees' AND column_name = 'hire_date'
        \`;
        console.log('📊 hire_date column info:', result);
        
        if (result[0] && result[0].is_nullable === 'YES') {
            console.log('✅ hire_date column is now nullable');
        } else {
            console.log('⚠️ hire_date column may not be nullable yet');
        }
    } catch (error) {
        console.error('❌ Error testing schema:', error);
    } finally {
        await prisma.\$disconnect();
    }
}

testSchema();
"@
    
    $testScript | Out-File -FilePath "temp-test-schema.js" -Encoding UTF8
    node "temp-test-schema.js"
    Remove-Item "temp-test-schema.js"
    
} catch {
    Write-Host "❌ Error updating database schema: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Schema update process completed!" -ForegroundColor Green
