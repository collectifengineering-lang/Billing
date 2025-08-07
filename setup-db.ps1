# Set environment variables
$env:DATABASE_URL="postgres://postgres.rjhkagqsiamwpiiszbgs:eUAUpixlcPkwgMhs@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
$env:PRISMA_DATABASE_URL="postgres://postgres.rjhkagqsiamwpiiszbgs:eUAUpixlcPkwgMhs@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# Push the database schema
Write-Host "Pushing database schema to Supabase..."
npx prisma db push

# Generate Prisma client
Write-Host "Generating Prisma client..."
npx prisma generate

Write-Host "Database setup complete!"
