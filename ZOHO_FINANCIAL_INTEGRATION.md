# Zoho Financial Data Integration Guide

This guide explains how to set up and troubleshoot the integration between your billing platform and Zoho Books to ensure accurate financial data in your dashboard.

## Overview

The financial dashboard now pulls **real financial data** from Zoho Books instead of using mock data. This includes:

- ✅ **YTD Profit** - Real profit & loss data
- ✅ **Cash Flow** - Actual cash flow statements  
- ✅ **Revenue & Expenses** - Real financial metrics
- ✅ **Balance Sheet** - Current financial position
- ✅ **Multipliers** - Calculated from real data
- ✅ **Overhead Rates** - Based on actual expenses

## Prerequisites

Before proceeding, ensure you have:

1. **Zoho Books Account** with API access
2. **Valid API Credentials** (Client ID, Client Secret, Refresh Token)
3. **Organization ID** from your Zoho Books account
4. **Proper API Scopes** configured

## Required API Scopes

Your Zoho application must have these scopes enabled:

```
ZohoBooks.projects.READ
ZohoBooks.invoices.READ
ZohoBooks.contacts.READ
ZohoBooks.settings.READ
ZohoBooks.reports.READ          ← NEW: Required for financial data
ZohoBooks.chartofaccounts.READ  ← NEW: Required for account data
ZohoBooks.journalentries.READ   ← NEW: Required for transaction data
```

## Environment Variables

Ensure these are set in your `.env.local` file:

```env
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ORGANIZATION_ID=your_organization_id
```

## Testing the Integration

### Step 1: Test Financial Data API

1. Navigate to your dashboard
2. Click the **"Financial Data"** tab
3. Click **"Test Zoho Financial Integration"**
4. Check the browser console for detailed results

### Step 2: Verify Data Sources

The dashboard will show indicators for each data type:

- ✅ **Real Zoho Data** - Successfully pulling from Zoho
- ❌ **Mock Data** - Using fallback values
- 🔄 **Testing Required** - Need to verify integration

### Step 3: Check Console Output

Look for these API calls in the browser console:

```
Fetching Profit & Loss statement...
Fetching Cash Flow statement...
Fetching Balance Sheet...
Fetching Chart of Accounts...
Fetching Journal Entries...
Fetching comprehensive financial metrics...
```

## Troubleshooting Common Issues

### Issue 1: "Failed to fetch financial data from Zoho"

**Symptoms:**
- Dashboard shows mock data
- Error message in console
- YTD Profit shows $0

**Solutions:**
1. **Check API Credentials**
   ```bash
   # Verify your .env.local file has correct values
   ZOHO_CLIENT_ID=your_actual_client_id
   ZOHO_CLIENT_SECRET=your_actual_client_secret
   ZOHO_REFRESH_TOKEN=your_actual_refresh_token
   ZOHO_ORGANIZATION_ID=your_actual_org_id
   ```

2. **Verify API Scopes**
   - Go to [Zoho Developer Console](https://api-console.zoho.com/)
   - Check your application has `ZohoBooks.reports.READ` scope
   - Regenerate refresh token if scopes were changed

3. **Test API Connection**
   ```bash
   # Test basic connection
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        "https://www.zohoapis.com/books/v3/reports/profitandloss?organization_id=YOUR_ORG_ID"
   ```

### Issue 2: "Token expired" or "401 Unauthorized"

**Symptoms:**
- Intermittent connection failures
- Token refresh errors

**Solutions:**
1. **Check Token Expiry**
   - Zoho tokens expire every 1 hour
   - The system auto-refreshes every 45 minutes
   - Manual refresh available in settings

2. **Verify Refresh Token**
   - Refresh tokens can expire if unused
   - Generate new refresh token from Zoho Developer Console

### Issue 3: "No data returned" from financial endpoints

**Symptoms:**
- API calls succeed but return empty data
- Dashboard shows $0 for financial metrics

**Solutions:**
1. **Check Date Ranges**
   - Ensure your Zoho Books has data for the requested period
   - Verify fiscal year settings match your expectations

2. **Verify Report Access**
   - Ensure your Zoho account has access to financial reports
   - Check user permissions in Zoho Books

3. **Test Individual Endpoints**
   ```bash
   # Test Profit & Loss
   GET /api/financial-data?startDate=2024-01-01&endDate=2024-12-31
   
   # Test Cash Flow
   GET /api/financial-data?startDate=2024-01-01&endDate=2024-12-31
   ```

## Expected Data Structure

### Profit & Loss Response
```json
{
  "revenue": {
    "total": 1000000,
    "details": [...]
  },
  "expenses": {
    "total": 650000,
    "details": [...]
  },
  "operating_expenses": {
    "total": 150000,
    "details": [...]
  }
}
```

### Cash Flow Response
```json
{
  "net_cash_flow": 200000,
  "operating_activities": {...},
  "investing_activities": {...},
  "financing_activities": {...}
}
```

### Balance Sheet Response
```json
{
  "current_assets": {
    "cash_and_bank": 500000,
    "accounts_receivable": 300000
  },
  "current_liabilities": {
    "accounts_payable": 200000
  }
}
```

## Data Validation

### Compare Dashboard vs Zoho Books

1. **YTD Profit**
   - Dashboard: Check the "YTD Profit" card
   - Zoho Books: Go to Reports → Profit & Loss → Current Year

2. **Cash Flow**
   - Dashboard: Check the "Cashflow" tab
   - Zoho Books: Go to Reports → Cash Flow → Current Year

3. **Revenue & Expenses**
   - Dashboard: Check "Trailing 12 Months" data
   - Zoho Books: Compare with monthly P&L reports

### Expected Calculations

- **Multiplier** = Revenue ÷ Expenses
- **Overhead Rate** = Expenses ÷ Revenue
- **Gross Margin** = (Revenue - Expenses) ÷ Revenue
- **YTD Profit** = Net Profit from P&L statement

## Performance Optimization

### Caching Strategy
- Financial data is fetched on each dashboard load
- Consider implementing caching for large datasets
- Monitor API response times

### Rate Limiting
- Zoho has rate limits on API calls
- The system batches requests where possible
- Implement exponential backoff for failures

## Monitoring & Alerts

### Key Metrics to Monitor
1. **API Success Rate** - Should be >95%
2. **Response Time** - Should be <5 seconds
3. **Data Freshness** - Should update within 1 hour
4. **Error Rate** - Should be <1%

### Log Analysis
Check your application logs for:
```
Dashboard API error: Failed to fetch financial data from Zoho
Error fetching Profit & Loss: 401 Unauthorized
Token expired, refreshing...
```

## Support & Resources

### Zoho Documentation
- [Zoho Books API Reference](https://www.zoho.com/books/api/)
- [Reports API Documentation](https://www.zoho.com/books/api/#reports)
- [Authentication Guide](https://www.zoho.com/books/api/#oauth)

### Common API Endpoints
```
GET /reports/profitandloss     - Profit & Loss statement
GET /reports/cashflow          - Cash Flow statement  
GET /reports/balancesheet      - Balance Sheet
GET /chartofaccounts           - Chart of Accounts
GET /journalentries            - Journal Entries
```

### Getting Help
1. **Check this guide** for common solutions
2. **Test the integration** using the dashboard tools
3. **Review console logs** for detailed error messages
4. **Verify Zoho credentials** and API scopes
5. **Contact support** with specific error details

## Success Checklist

- [ ] API credentials configured correctly
- [ ] Required scopes enabled in Zoho
- [ ] Financial data API test passes
- [ ] Dashboard shows real YTD profit data
- [ ] Cash flow metrics display correctly
- [ ] Multipliers calculated from real data
- [ ] No mock data indicators visible
- [ ] Console shows successful API calls

Once all items are checked, your financial dashboard will display accurate, real-time financial data from Zoho Books!
