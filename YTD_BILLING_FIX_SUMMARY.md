# YTD Billing and Revenue Calculation Fix Summary

## Issues Identified and Fixed

### 1. Invoice Field Name Inconsistency ✓
**Problem**: The code was trying to access `inv.total` but the Zoho API returns invoices with an `amount` field.

**Location**: `app/api/homepage-dashboard/route.ts` (lines 360, 365, 386-388, 540-543)

**Fix**: Created helper functions `getInvoiceAmount()` and `getInvoiceBalance()` that handle both `amount` and `total` fields for backward compatibility:
```typescript
const getInvoiceAmount = (inv: any) => parseFloat(inv.amount || inv.total || 0);
const getInvoiceBalance = (inv: any) => parseFloat(inv.balance || inv.amount || inv.total || 0);
```

### 2. YTD Calculation Verification ✓
**Verified**: The YTD calculation correctly filters invoices from January 1 of the current year to today.

**Location**: `app/api/homepage-dashboard/route.ts` (lines 348-356)

**Details**:
- Uses `currentYearStart` (Jan 1 of current year) and `now` (today)
- Added validation to handle invalid dates
- Added comprehensive logging to verify date filtering

### 3. Revenue Calculation Logic ✓
**Verified**: The revenue calculation includes:
- **Cash basis**: Only paid invoices
- **Accrual basis**: All invoices (paid + outstanding, excluding void/draft)
- **All statuses handled**: paid, sent, viewed, draft, overdue

**Location**: `app/api/homepage-dashboard/route.ts` (lines 391-423)

**Calculation**:
```typescript
// Cash basis: only paid invoices
const zohoTotalBilledCash = paidInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);

// Accrual basis: all invoices (paid + outstanding, excluding void/draft)
const zohoTotalBilledAccrual = ytdInvoices
  .filter(inv => inv.status !== 'void' && inv.status !== 'draft')
  .reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
```

### 4. Enhanced Logging for Debugging ✓
Added comprehensive logging to help debug invoice data:
- Sample invoice dates from Zoho
- YTD invoice filtering details
- Invoice status breakdown
- Sample invoice totals

**Location**: Multiple locations in `app/api/homepage-dashboard/route.ts` and `lib/zoho.ts`

## Files Modified

1. **app/api/homepage-dashboard/route.ts**
   - Fixed invoice field references (amount/total)
   - Enhanced YTD filtering with date validation
   - Added comprehensive logging
   - Fixed revenue calculation logic

2. **lib/zoho.ts**
   - Fixed date field handling
   - Added logging for invoice dates
   - Improved invoice processing

3. **lib/zohoOptimized.ts**
   - Fixed date field handling (mirror of zoho.ts)
   - Added logging for invoice dates
   - Improved invoice processing

## Testing the Changes

### 1. Verify Zoho Books API Call
```bash
# Check the server logs for Zoho API calls
npm run dev
# Look for: "📄 Fetching invoices from Zoho..."
# Should show invoice count and status breakdown
```

### 2. Verify YTD Filtering (Jan 1 to Today)
**Check logs for**:
```
📅 YTD Invoice filtering:
{
  totalInvoices: <number>,
  ytdInvoicesCount: <number>,
  dateRange: {
    start: "2025-01-01",  // Current year Jan 1
    end: "2025-01-XX"     // Today's date
  }
}
```

### 3. Verify Revenue Calculation
**Check logs for**:
```
💰 YTD Billing calculations:
{
  ytdInvoicesCount: <number>,
  paidInvoicesCount: <number>,
  outstandingInvoicesCount: <number>,
  cashBasis: <amount>,
  accrualBasis: <amount>,
  unbilled: <amount>
}
```

### 4. Verify Frontend Display
1. Navigate to the homepage (http://localhost:3000)
2. Check the "Billing" tab
3. Verify the "Zoho Books Total Revenue" tile shows the correct amount
4. Verify the "Total Billed YTD" tile shows the correct amount
5. Check the reconciliation section for data consistency

### 5. Verify All Paid Invoices Are Included
**Check logs for**:
```
💰 Invoice status breakdown:
{
  totalYTD: <number>,
  paid: <number>,      // Should include ALL paid invoices for current year
  outstanding: <number>,
  otherStatuses: <number>
}
```

## Expected Results

### Before Fix:
- Revenue tiles showing incorrect amounts
- YTD billing not reflecting all paid invoices
- Potential undefined/null errors when accessing invoice amounts

### After Fix:
- Revenue tiles showing correct amounts from Zoho API
- YTD billing correctly filtered for Jan 1 to today
- All paid invoices included in revenue calculation
- Clear logging to verify data accuracy

## Testing Steps

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Access the homepage**:
   Open http://localhost:3000

3. **Check the console logs** for:
   - Invoice fetching: "📄 Fetching invoices from Zoho..."
   - YTD filtering: "📅 YTD Invoice filtering:"
   - Revenue calculation: "💰 YTD Billing calculations:"
   - Financial summary: "💰 Final Financial Metrics Summary:"

4. **Verify the frontend tiles**:
   - Check "Zoho Books Total Revenue" tile (should match accrual basis revenue)
   - Check "Total Billed YTD" tile (should match YTD invoices)
   - Check reconciliation section shows difference between sources

5. **Compare with Zoho Books**:
   - Log into Zoho Books
   - Check the YTD revenue/reports
   - Verify the amounts match what's shown in the dashboard

## Troubleshooting

### If revenue is still 0:
1. Check if Zoho API is returning invoices: Look for "📊 Zoho invoices processed:"
2. Check date filtering: Look for "📅 YTD Invoice filtering:" in logs
3. Check invoice amounts: Look for "📄 Sample invoice data:" in logs
4. Verify Zoho credentials in `.env.local`:
   - `ZOHO_CLIENT_ID`
   - `ZOHO_CLIENT_SECRET`
   - `ZOHO_REFRESH_TOKEN`
   - `ZOHO_ORGANIZATION_ID`

### If dates are not parsed correctly:
1. Check the date format returned by Zoho: Look for "📅 Sample invoice dates from Zoho:"
2. Verify the date field in Zoho invoice structure
3. Check for timezone issues

### If amounts are incorrect:
1. Check the invoice field mapping: The code now handles both `amount` and `total` fields
2. Verify the calculation logic in logs: "💰 YTD Billing calculations:"
3. Check for invoice status filtering: "💰 Invoice status breakdown:"

## Next Steps

1. Monitor the logs for a few page loads to ensure consistency
2. Verify the calculations match Zoho Books reports
3. Check if there are any edge cases with invoice statuses
4. Consider adding unit tests for the billing calculations

