# Zoho Billing Platform

A dynamic web-based billing platform that integrates fully with Zoho Books. This platform provides real-time project billing tracking, editable projections, and comprehensive analytics.

## Features

### 🔄 Zoho Books Integration
- **Automatic Project Sync**: New projects created in Zoho Books automatically populate in the billing platform
- **Real-time Data**: Live synchronization with Zoho Books API
- **Invoice Tracking**: Track billed vs unbilled amounts for each project

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

### 📋 Dashboard Overview
- **Key Metrics**: Total projects, billed amounts, unbilled amounts, active projects
- **Project Summary**: Quick overview of each project's billing status
- **Real-time Updates**: Refresh data with a single click

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Zoho Books account with API access

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
   e. Generate your refresh token using the OAuth flow
   f. Get your Client ID, Client Secret, and Organization ID

4. **Set up environment variables**
   
   Copy `env.example` to `.env.local` and fill in your Zoho credentials:
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your actual values:
   ```
   ZOHO_CLIENT_ID=your_client_id_here
   ZOHO_CLIENT_SECRET=your_client_secret_here
   ZOHO_REFRESH_TOKEN=your_refresh_token_here
   ZOHO_ORGANIZATION_ID=your_organization_id_here
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Dashboard Overview
The main dashboard displays:
- **Statistics Cards**: Key metrics at a glance
- **Billing Chart**: Visual comparison of projects
- **Project Summary**: Quick project overview
- **Projections Table**: Detailed monthly breakdown

### Editing Projections
1. **Navigate to the Projections Table**
2. **Click on any yellow cell** (future months)
3. **Enter your projected amount**
4. **Press Enter or click outside** to save
5. **Press Escape** to cancel

### Refreshing Data
- Click the **"Refresh Data"** button in the header
- Data will sync with Zoho Books
- New projects will automatically appear

## API Endpoints

### `/api/projects`
- **GET**: Fetches all projects and billing data from Zoho Books
- Returns: projects, invoices, billingData, projections

### `/api/projections`
- **POST**: Updates projections table
- Body: `{ projections: ProjectionsTable }`
- Returns: success status and updated projections

## Data Structure

### BillingData
```typescript
interface BillingData {
  projectId: string;
  projectName: string;
  customerName: string;
  monthlyData: MonthlyBillingData[];
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
}
```

### ProjectionsTable
```typescript
interface ProjectionsTable {
  [projectId: string]: {
    [month: string]: {
      value: number;
      isEditable: boolean;
      isProjected: boolean;
    };
  };
}
```

## Customization

### Adding New Chart Types
1. Create a new component in `components/`
2. Import Recharts components
3. Add to the dashboard in `app/page.tsx`

### Extending Zoho Integration
1. Add new methods to `lib/zoho.ts`
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

### Data Not Loading
- Check browser console for errors
- Verify API endpoints are working
- Ensure environment variables are set correctly

### Projections Not Saving
- Check network tab for API errors
- Verify the projections API endpoint
- Ensure you're clicking on editable cells (yellow)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Zoho Books API documentation
3. Open an issue on GitHub

---

**Note**: This platform requires an active Zoho Books subscription and proper API access. Make sure your Zoho Books account has the necessary permissions for the features you want to use. 