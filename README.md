# Zoho Billing Platform

A dynamic web-based billing platform that integrates fully with Zoho Books and Clockify. This platform provides real-time project billing tracking, time tracking analytics, editable projections, and comprehensive KPIs.

## Features

### 🔄 Zoho Books Integration
- **Automatic Project Sync**: New projects created in Zoho Books automatically populate in the billing platform
- **Real-time Data**: Live synchronization with Zoho Books API
- **Invoice Tracking**: Track billed vs unbilled amounts for each project
- **Financial Dashboard**: Real YTD profit, cash flow, and financial metrics from Zoho Books
- **Profit & Loss Data**: Actual revenue, expenses, and profit margins
- **Balance Sheet Integration**: Real-time financial position and cash balances

### ⏰ Clockify Time Tracking Integration
- **Time Tracking Analytics**: Detailed KPIs from Clockify time tracking data
- **Efficiency Metrics**: Billable vs non-billable time ratios
- **Performance Analytics**: Average hourly rates and project profitability
- **Enhanced KPIs**: Time-based metrics alongside billing data
- **Real-time Sync**: Automatic synchronization with Clockify API

### 📊 Dynamic Projections Table
- **Editable Future Projections**: Click on future month cells to edit projected billing amounts
- **Historical Data Display**: View actual billing data for past months
- **Current Month Highlighting**: Special highlighting for the current month
- **Color-coded Cells**: 
  - Gray: Historical data (read-only)
  - Blue: Current month
  - Yellow: Future projections (editable)

### 📈 Interactive Charts
- **Bar Chart Visualization**: Compare billed, unbilled, and projected amounts across projects
- **Responsive Design**: Charts adapt to different screen sizes
- **Tooltip Information**: Hover for detailed breakdowns

### 📋 Enhanced Dashboard Overview
- **Billing Metrics**: Total projects, billed amounts, unbilled amounts, active projects
- **Time Tracking KPIs**: Total hours, billable hours, efficiency rates, average hourly rates
- **Performance Metrics**: Time value, average hours per project, top performing projects
- **Financial Metrics**: Real YTD profit, cash flow, multipliers, and overhead rates from Zoho Books
- **Project Summary**: Quick overview of each project's billing and time status
- **Real-time Updates**: Refresh data with a single click

### 🔐 Role-Based Access Control
- **Admin Users**: Full access to all features including Settings and Financial Dashboard
- **Basic Users**: Access to project summary and basic billing features
- **Azure AD Integration**: Secure authentication with Microsoft Azure Active Directory
- **Automatic Role Detection**: Admin status determined by email address or domain

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns
- **APIs**: Zoho Books API, Clockify API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Zoho Books account with API access
- Clockify account (optional, for time tracking features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zoho-billing-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Zoho Books API**
   
   You'll need to set up a Zoho Books API application:
   
   a. Go to [Zoho Developer Console](https://api-console.zoho.com/)
   b. Create a new **Server-Based Application**
   c. Configure the application:
      - **Client Name**: `Billing Platform API`
      - **Homepage URL**: `http://localhost:3001` (or your production URL)
      - **Authorized Redirect URIs**: `http://localhost:3001/api/auth/callback`
   d. Add the following scopes:
      - `ZohoBooks.projects.READ`
      - `ZohoBooks.invoices.READ`
      - `ZohoBooks.contacts.READ`
      - `ZohoBooks.settings.READ`
      - `ZohoBooks.reports.READ` (for financial data)
      - `ZohoBooks.chartofaccounts.READ` (for account data)
      - `ZohoBooks.journalentries.READ` (for transaction data)
   e. Generate your refresh token using the OAuth flow
   f. Get your Client ID, Client Secret, and Organization ID

4. **Configure Clockify Integration (Optional)**
   
   For time tracking features:
   
   a. Log in to your Clockify account at [clockify.me](https://clockify.me)
   b. Go to **Profile Settings** → **API**
   c. Generate an API key
   d. Note your workspace ID from the URL or settings

5. **Set up environment variables**

   Create a `.env.local` file in the root directory with the following variables:

   ```env
   # Zoho Books API Configuration
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_REFRESH_TOKEN=your_refresh_token
   ZOHO_ORGANIZATION_ID=your_organization_id

   # Clockify API Configuration (Optional)
   CLOCKIFY_API_KEY=your_clockify_api_key
   CLOCKIFY_WORKSPACE_ID=your_workspace_id

   # Azure AD Configuration
   NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your_azure_client_id
   NEXT_PUBLIC_AZURE_AD_TENANT_ID=your_azure_tenant_id

   # Admin Access Configuration
   NEXT_PUBLIC_ADMIN_EMAILS=admin1@yourcompany.com,admin2@yourcompany.com
   ```
   
   Copy `env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your actual values:
   ```
   ZOHO_CLIENT_ID=your_client_id_here
   ZOHO_CLIENT_SECRET=your_client_secret_here
   ZOHO_REFRESH_TOKEN=your_refresh_token_here
   ZOHO_ORGANIZATION_ID=your_organization_id_here
   
   # Optional: Clockify configuration
   CLOCKIFY_API_KEY=your_clockify_api_key_here
   CLOCKIFY_WORKSPACE_ID=your_workspace_id_here
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

8. **Configure Clockify Integration**
   
   After starting the application:
   
   a. Go to **Settings** in the application
   b. Find the **Clockify Integration** section
   c. Enter your API key and test the connection
   d. Select your workspace and save the configuration

## Usage

### Dashboard Overview
The main dashboard displays:
- **Billing Statistics**: Key billing metrics at a glance
- **Time Tracking KPIs**: Clockify-based time analytics (when configured)
- **Performance Metrics**: Combined billing and time insights
- **Billing Chart**: Visual comparison of projects
- **Project Summary**: Quick project overview
- **Projections Table**: Detailed monthly breakdown

### Time Tracking Features
When Clockify is configured, you'll see:
- **Total Hours**: Combined tracked time across all projects
- **Billable Hours**: Time that can be billed to clients
- **Efficiency Rate**: Ratio of billable to total hours
- **Average Hourly Rate**: Mean billable rate across projects
- **Top Performing Projects**: Ranked by efficiency and hours

### Editing Projections
1. **Navigate to the Projections Table**
2. **Click on any yellow cell** (future months)
3. **Enter your projected amount**
4. **Press Enter or click outside** to save
5. **Press Escape** to cancel

### Refreshing Data
- Click the **"Refresh Data"** button in the header
- Data will sync with Zoho Books and Clockify
- New projects will automatically appear

## API Endpoints

### Zoho Integration
- `/api/projects` - Fetches all projects and billing data from Zoho Books
- `/api/projections` - Updates projections table
- `/api/financial-data` - Tests and fetches financial data from Zoho Books
- `/api/dashboard` - Comprehensive dashboard with real financial metrics

### Clockify Integration
- `/api/clockify` - Handles Clockify data fetching and processing
  - `GET ?action=status` - Check configuration status
  - `GET ?action=projects` - Get all Clockify projects
  - `GET ?action=time-summaries` - Get time summaries
  - `POST` - Process and enhance billing data with time tracking

## Data Structure

### Enhanced BillingData
```typescript
interface BillingData {
  projectId: string;
  projectName: string;
  customerName: string;
  monthlyData: MonthlyBillingData[];
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
  // Clockify integration fields
  clockifyData?: ClockifyTimeReport;
  totalHours?: number;
  billableHours?: number;
  nonBillableHours?: number;
  hourlyRate?: number;
  efficiency?: number;
}
```

### Enhanced DashboardStats
```typescript
interface DashboardStats {
  // Traditional billing metrics
  totalProjects: number;
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
  activeProjects: number;
  
  // Clockify KPIs
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  averageHourlyRate: number;
  totalTimeValue: number;
  efficiency: number;
  averageHoursPerProject: number;
  topPerformingProjects: string[];
}
```

## Customization

### Adding New Chart Types
1. Create a new component in `components/`
2. Import Recharts components
3. Add to the dashboard in `app/page.tsx`

### Extending Integrations
1. Add new methods to `lib/zoho.ts` or `lib/clockify.ts`
2. Create corresponding API routes
3. Update types in `lib/types.ts`

### Styling
- Modify `tailwind.config.js` for theme changes
- Update `app/globals.css` for custom styles
- Use Tailwind utility classes for component styling

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
1. Build the project: `npm run build`
2. Start production server: `npm start`
3. Set environment variables on your hosting platform

## Troubleshooting

### Zoho API Issues
- Verify your API credentials
- Check that your refresh token is valid
- Ensure you have the correct scopes enabled
- Verify your organization ID

### Clockify Integration Issues
- Verify your API key is correct
- Check that your workspace ID is valid
- Ensure projects exist in Clockify with time entries
- Test connection in Settings page

### Data Not Loading
- Check browser console for errors
- Verify API endpoints are working
- Ensure environment variables are set correctly

### Projections Not Saving
- Check browser console for errors
- Verify database connection
- Ensure user has proper permissions

## Documentation

- [Clockify Integration Guide](./CLOCKIFY_INTEGRATION.md) - Comprehensive guide for Clockify features
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [PostgreSQL Setup](./POSTGRES_SETUP.md) - Database setup guide

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For more information about the APIs used:
- [Zoho Books API Documentation](https://www.zoho.com/books/api/)
- [Clockify API Documentation](https://clockify.me/developers-api) 