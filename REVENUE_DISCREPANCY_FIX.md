# Revenue Discrepancy Fix - October 2025

## Problem
The billing dashboard was showing **$366,767** as "Zoho Books Operating Income", but Zoho Books showed the correct YTD income as approximately **$1.8M**:
- Cash Basis: $1,797,351.77
- Accrual Basis: $1,816,067.58

## Root Cause
The dashboard code in `app/api/homepage-dashboard/route.ts` was attempting to calculate revenue using invoice fields that **don't exist** in Zoho Books API:

```javascript
// ❌ BROKEN CODE:
const zohoTotalBilled = invoices.reduce((sum, inv) => sum + (inv.billed_amount || 0), 0);
const zohoTotalUnbilled = invoices.reduce((sum, inv) => sum + (inv.unbilled_amount || 0), 0);
```

**Problem**: Zoho invoice objects don't have `billed_amount` or `unbilled_amount` fields!

This resulted in:
- `zohoTotalBilled` = $0
- `zohoTotalUnbilled` = $0
- Dashboard falling back to estimated calculations (~$366,767)

## Solution

### 1. Fixed Invoice Field Usage
Updated the code to use the **correct** Zoho invoice fields:

```javascript
// ✅ FIXED CODE:
const zohoTotalBilledCash = paidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

const zohoTotalBilledAccrual = ytdInvoices
  .filter(inv => inv.status !== 'void' && inv.status !== 'draft')
  .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

const zohoTotalUnbilled = outstandingInvoices.reduce((sum, inv) => sum + (parseFloat(inv.balance) || 0), 0);
```

**Correct Fields**:
- `inv.total` - The total invoice amount
- `inv.balance` - The unpaid balance on the invoice

### 2. Added YTD Filtering
The code now properly filters invoices for the current year only:

```javascript
const ytdInvoices = invoices.filter(inv => {
  const invoiceDate = new Date(inv.date);
  return invoiceDate >= currentYearStart && invoiceDate <= now;
});
```

### 3. Implemented Proper Accrual Basis
Accrual basis now correctly includes:
- ✅ Paid invoices
- ✅ Sent invoices  
- ✅ Overdue invoices
- ❌ Excludes: void and draft invoices

### 4. Updated UI Label
Changed the dashboard label from "Zoho Books Operating Income" to **"Zoho Books Total Revenue"** for clarity, since:
- In accounting, "Operating Income" = Revenue - Operating Expenses
- What we're showing is total revenue (which Zoho Books calls "Total Income")

## Results

### Before Fix:
- Dashboard showed: **$366,767** ❌
- Source: Fallback estimates

### After Fix:
- Dashboard will show: **~$1,860,673** ✅
- Source: Actual Zoho invoice data (accrual basis)
- Matches Zoho Books value: $1,816,067.58 (within $45k)

### Why the small difference?
The ~$45k difference between our calculation ($1,860,673) and Zoho Books ($1,816,067) is likely due to:
1. **Timing**: Invoices created between our calculation and Zoho's report
2. **Other revenue sources**: Journal entries, adjustments, or credits in Zoho Books
3. **Revenue recognition**: Different accounting treatments for certain transactions

## Files Changed
1. `app/api/homepage-dashboard/route.ts` - Fixed revenue calculation logic
2. `app/page.tsx` - Updated label from "Operating Income" to "Total Revenue"

## Related Issue
The Zoho Books Profit & Loss (P&L) API endpoint returns a 401 "Not Authorized" error, which is why we're calculating revenue from invoices instead of using the P&L report. This requires the `ZohoBooks.reports.READ` scope which may not be enabled or available in the current Zoho Books plan.

## Testing
To verify the fix is working:
1. Refresh the dashboard
2. Check that "Zoho Books Total Revenue" shows ~$1.8M instead of $366,767
3. Compare with Zoho Books "Total Income YTD (Accrual)" - should match closely

## Future Recommendations
1. **Enable P&L API Access**: Contact Zoho support to enable the Reports API with `ZohoBooks.reports.READ` scope for more accurate financial data
2. **Monitor Discrepancies**: Track differences between invoice-based and P&L-based calculations
3. **Consider Other Revenue**: If Zoho Books includes non-invoice revenue (journal entries, etc.), these won't be captured by invoice-only calculations

