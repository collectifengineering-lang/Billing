# Clockify Integration Guide

This document provides a comprehensive guide to the Clockify integration feature that enhances your billing dashboard with detailed time tracking KPIs and analytics.

## Overview

The Clockify integration allows you to connect your Clockify workspace to the billing platform, enabling detailed time tracking analytics and enhanced KPIs. This integration provides insights into:

- **Time Tracking Metrics**: Total hours, billable hours, efficiency rates
- **Performance Analytics**: Average hourly rates, project profitability
- **Enhanced KPIs**: Time-based metrics alongside billing data
- **Project Efficiency**: Billable vs non-billable time ratios

## Features

### 🔄 Real-time Data Sync
- Automatic synchronization with Clockify API
- Time tracking data for the last 12 months
- Project-based time summaries

### 📊 Enhanced Dashboard KPIs
- **Total Hours**: Combined tracked time across all projects
- **Billable Hours**: Time that can be billed to clients
- **Efficiency Rate**: Ratio of billable to total hours
- **Average Hourly Rate**: Mean billable rate across projects
- **Total Time Value**: Monetary value of tracked time
- **Average Hours per Project**: Time distribution metrics

### 🎯 Performance Metrics
- **Top Performing Projects**: Ranked by efficiency and hours
- **Profitability Analysis**: Revenue vs time cost comparison
- **Time-based Revenue**: Value generated from tracked time

## Setup Instructions

### 1. Get Your Clockify API Key

1. Log in to your Clockify account at [clockify.me](https://clockify.me)
2. Go to **Profile Settings** → **API**
3. Click **Generate API Key**
4. Copy the generated API key (you'll only see it once)

### 2. Configure the Integration

1. Navigate to **Settings** in your billing platform
2. Find the **Clockify Integration** section
3. Enter your API key in the **API Key** field
4. Click **Test** to verify the connection
5. Select your workspace from the dropdown
6. Click **Save Configuration**

### 3. Verify Configuration

The configuration status will show:
- ✅ **API Key**: Configured
- ✅ **Workspace**: Selected
- ✅ **Integration**: Ready

## API Endpoints

### GET `/api/clockify`
Query parameters:
- `action`: The operation to perform
  - `status`: Check configuration status
  - `projects`: Get all projects
  - `time-summaries`: Get time summaries (requires `startDate` and `endDate`)
  - `user`: Get user information
  - `workspaces`: Get available workspaces

### POST `/api/clockify`
Body parameters:
- `action`: The operation to perform
  - `enhance-billing-data`: Merge Clockify data with billing data
- `data`: Operation-specific data

## Data Structure

### ClockifyTimeReport
```typescript
interface ClockifyTimeReport {
  projectId: string;
  projectName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalAmount: number;
  billableAmount: number;
  nonBillableAmount: number;
  entries: ClockifyTimeEntry[];
  period: {
    start: string;
    end: string;
  };
}
```

### Enhanced Dashboard Stats
```typescript
interface DashboardStats {
  // Existing billing metrics
  totalProjects: number;
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
  activeProjects: number;
  
  // New Clockify KPIs
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

## KPI Calculations

### Efficiency Rate
```
Efficiency = (Billable Hours / Total Hours) × 100
```

### Average Hourly Rate
```
Average Hourly Rate = Total Billable Amount / Billable Hours
```

### Time Value
```
Time Value = Billable Hours × Average Hourly Rate
```

### Project Performance Score
```
Performance Score = Efficiency × Total Hours
```

## Dashboard Components

### Enhanced Dashboard Stats
The enhanced dashboard displays three main sections:

1. **Billing Overview**: Traditional billing metrics
2. **Time Tracking KPIs**: Clockify-specific metrics
3. **Performance Metrics**: Combined analytics
4. **Top Performing Projects**: Best performing projects by efficiency

### Summary Cards
Three gradient summary cards show:
- **Total Revenue**: Combined billing and time value
- **Time Value**: Total value of tracked time
- **Efficiency**: Overall efficiency percentage

## Configuration Management

### Local Storage
The integration stores configuration in browser localStorage:
```javascript
{
  "apiKey": "your-api-key",
  "workspaceId": "your-workspace-id"
}
```

### Environment Variables (Optional)
For server-side configuration, you can set:
```bash
CLOCKIFY_API_KEY=your-api-key
CLOCKIFY_WORKSPACE_ID=your-workspace-id
```

## Error Handling

### Common Issues

1. **Invalid API Key**
   - Error: "Clockify API error: Invalid API key"
   - Solution: Regenerate API key in Clockify settings

2. **Workspace Not Found**
   - Error: "Workspace ID not configured"
   - Solution: Select correct workspace in settings

3. **No Time Data**
   - Issue: Projects show no time tracking data
   - Solution: Ensure projects exist in Clockify with time entries

### Debugging

Check browser console for detailed error messages:
```javascript
// Test API connection
fetch('/api/clockify?action=status')

// Test workspace access
fetch('/api/clockify?action=workspaces')
```

## Security Considerations

### API Key Security
- API keys are stored in browser localStorage
- Keys are not transmitted to external servers
- Keys are only used for Clockify API calls

### Data Privacy
- Time tracking data is processed locally
- No sensitive data is logged or stored permanently
- API calls are made directly to Clockify servers

## Performance Optimization

### Caching Strategy
- Clockify data is cached for 15 minutes
- Automatic refresh on dashboard load
- Lazy loading of time summaries

### Data Limits
- Default time range: Last 12 months
- Maximum projects: No limit (handled by Clockify API)
- Rate limiting: Respects Clockify API limits

## Troubleshooting

### Connection Issues
1. Verify API key is correct
2. Check internet connection
3. Ensure Clockify service is available
4. Verify workspace ID is correct

### Data Sync Issues
1. Check if projects exist in Clockify
2. Verify time entries are logged
3. Ensure date range includes data
4. Check browser console for errors

### Performance Issues
1. Reduce date range for large datasets
2. Clear browser cache
3. Check network connectivity
4. Monitor API rate limits

## Future Enhancements

### Planned Features
- [ ] Real-time time tracking updates
- [ ] Project mapping between Zoho and Clockify
- [ ] Advanced time analytics
- [ ] Export time reports
- [ ] Team performance metrics

### API Improvements
- [ ] Batch API calls for better performance
- [ ] Incremental data sync
- [ ] Webhook support for real-time updates
- [ ] Advanced filtering options

## Support

For issues with the Clockify integration:

1. Check the troubleshooting section above
2. Verify your Clockify account settings
3. Test API connection in settings
4. Review browser console for errors
5. Contact support with specific error messages

## Changelog

### v1.0.0 (Current)
- Initial Clockify integration
- Basic time tracking KPIs
- Enhanced dashboard stats
- Settings configuration
- API endpoint implementation

---

For more information about Clockify API, visit the [official documentation](https://clockify.me/developers-api).
