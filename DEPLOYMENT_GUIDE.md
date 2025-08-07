# Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **PostgreSQL Database**: Set up a PostgreSQL database (recommended: Vercel Postgres or Neon)
3. **Environment Variables**: Configure all required environment variables

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Database
PRISMA_DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication (if using Azure AD)
AZURE_CLIENT_ID="your-azure-client-id"
AZURE_TENANT_ID="your-azure-tenant-id"
AZURE_REDIRECT_URI="http://localhost:3000"

# Zoho Integration (if using)
ZOHO_CLIENT_ID="your-zoho-client-id"
ZOHO_CLIENT_SECRET="your-zoho-client-secret"
ZOHO_REFRESH_TOKEN="your-zoho-refresh-token"
ZOHO_ORGANIZATION_ID="your-zoho-organization-id"
```

## Database Setup

### Option 1: Using Vercel Postgres (Recommended)

1. **Create Vercel Postgres Database**:
   ```bash
   npx vercel storage create postgres
   ```

2. **Link to your project**:
   ```bash
   npx vercel env pull .env.local
   ```

3. **Run database migrations**:
   ```bash
   npx prisma db push
   ```

### Option 2: Using External PostgreSQL

1. **Set up your PostgreSQL database** (e.g., Neon, Supabase, etc.)
2. **Update your environment variables** with the database URL
3. **Run database migrations**:
   ```bash
   npx prisma db push
   ```

## Production Deployment

### Step 1: Deploy to Vercel

1. **Push your code to GitHub**
2. **Connect your repository to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables in Vercel dashboard

### Step 2: Set Up Database Schema

After deployment, you need to create the database tables. You have two options:

#### Option A: Using the Migration API (Recommended)

1. **Call the migration endpoint**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/migrate
   ```

2. **Or visit the endpoint in your browser**:
   ```
   https://your-app.vercel.app/api/migrate
   ```

#### Option B: Using Prisma CLI

1. **Connect to your production database**:
   ```bash
   npx prisma db push --schema=./prisma/schema.prisma
   ```

### Step 3: Verify Database Setup

1. **Check if tables exist** by calling:
   ```bash
   curl https://your-app.vercel.app/api/statuses
   ```

2. **If you get empty data `{}`, the tables are working correctly**

## Public Access Features

### Statuses and Comments (Public)

The application includes **public access** to project statuses and comments:

1. **Public API Endpoints** (no authentication required):
   - `GET /api/statuses` - Fetch all project statuses
   - `POST /api/statuses` - Update project status
   - `GET /api/comments` - Fetch all project comments
   - `POST /api/comments` - Update project comment

2. **Public Web Interface**:
   - Visit: `https://your-app.vercel.app/public`
   - Allows anyone to view and edit statuses and comments
   - No login required
   - Real-time updates

3. **Usage**:
   - Click on any status or comment cell to edit
   - Press Enter to save, Escape to cancel
   - Changes are immediately visible to all users

### Protected Features (Authentication Required)

The main dashboard and other features require authentication:
- Project data and billing information
- Revenue projections
- Fee management
- Zoho integration features

## Troubleshooting

### Database Connection Issues

1. **Check your `PRISMA_DATABASE_URL`**:
   - Ensure it's correctly formatted
   - Verify the database is accessible from Vercel

2. **Test database connection**:
   ```bash
   npx prisma db pull
   ```

### Table Creation Issues

1. **If tables don't exist**, run the migration:
   ```bash
   curl -X POST https://your-app.vercel.app/api/migrate
   ```

2. **Check migration logs** in Vercel dashboard

### Common Error Messages

- **"The table does not exist"**: Run the migration endpoint
- **"Connection refused"**: Check your database URL and network access
- **"Authentication failed"**: Verify your database credentials

### Public Access Issues

1. **Test public endpoints**:
   ```bash
   curl https://your-app.vercel.app/api/statuses
   curl https://your-app.vercel.app/api/comments
   ```

2. **Visit public page**: `https://your-app.vercel.app/public`

## Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up local database**:
   ```bash
   npx prisma db push
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Test public access locally**:
   - Visit: `http://localhost:3000/public`
   - Test API endpoints: `http://localhost:3000/api/statuses`

## Database Schema

The application uses the following tables:

- `Projection`: Monthly revenue projections
- `Status`: Project status by month (public)
- `Comment`: Comments for projects by month (public)
- `SignedFee`: Signed fee amounts per project
- `AsrFee`: ASR fee amounts per project
- `ClosedProject`: Closed project tracking
- `ProjectAssignment`: Project manager assignments
- `ProjectManager`: Project manager information

## Security Notes

1. **Never commit `.env.local`** to version control
2. **Use environment variables** in Vercel dashboard for production
3. **Enable database SSL** for production connections
4. **Regularly rotate database credentials**
5. **Public data**: Statuses and comments are intentionally public - ensure this aligns with your security requirements

## Performance Optimization

1. **Enable Prisma Accelerate** for better performance
2. **Use connection pooling** for high-traffic applications
3. **Monitor database performance** in Vercel dashboard 