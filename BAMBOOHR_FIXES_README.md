# BambooHR Integration Fixes

This document outlines the fixes implemented to resolve BambooHR data import issues into Supabase via Prisma.

## Issues Fixed

### 1. Missing hireDate Field
**Problem**: The `/employees/directory` endpoint doesn't return `hireDate`, but the Prisma schema required it as a non-nullable field.

**Solution**: 
- Updated Prisma schema to make `hireDate` optional (`hireDate?: String`)
- Modified `getAllEmployees()` to fetch detailed employee information after directory call
- Added `getEmployeeDetails()` method to fetch missing fields using `/employees/{id}?fields=...`

### 2. Compensation Parsing Failures
**Problem**: 
- `getEmployeeCompensation()` expected `response.compensation` as an array, but API returned a direct array
- Field mappings were incorrect for pay rate, type, and schedule

**Solution**:
- Updated compensation parsing to handle both array and object responses
- Fixed field mappings:
  - `comp.rate.value` → `payRate`
  - `comp.type.toLowerCase()` → `payType`
  - `comp.paySchedule` or `comp.paidPer` → `payPeriod`
- Added fallback field mappings for different API response structures

### 3. Field Mapping Issues
**Problem**: 
- `workEmail` wasn't being mapped to `email` field
- Missing fields like `hireDate`, `status`, `department` weren't being fetched

**Solution**:
- Added `workEmail` to `BambooHREmployee` interface
- Enhanced field mapping in `importEmployees()`
- Added comprehensive logging for fetched fields

## Code Changes

### Prisma Schema Updates
```prisma
model Employee {
  // ... other fields
  hireDate        String?           @map("hire_date")  // Now optional
  // ... other fields
}
```

### BambooHR Service Updates

#### New Method: `getEmployeeDetails()`
```typescript
async getEmployeeDetails(employeeId: string): Promise<BambooHREmployee> {
  const fields = 'hireDate,terminationDate,status,department,jobTitle,workEmail,firstName,lastName,displayName,preferredName,email';
  const endpoint = `/employees/${employeeId}?fields=${fields}`;
  // ... implementation
}
```

#### Enhanced `getAllEmployees()`
```typescript
async getAllEmployees(): Promise<BambooHREmployee[]> {
  // 1. Fetch directory
  const employees = await this.makeRequest('/employees/directory');
  
  // 2. Fetch detailed info for each employee
  const detailedEmployees = await Promise.all(
    employees.map(emp => this.getEmployeeDetails(emp.id))
  );
  
  return detailedEmployees;
}
```

#### Fixed Compensation Parsing
```typescript
async getEmployeeCompensation(employeeId: string): Promise<BamboohrCompensation[]> {
  // Handle both array and object responses
  let compensationData: any[] = [];
  
  if (Array.isArray(response)) {
    compensationData = response;
  } else if (response.compensation && Array.isArray(response.compensation)) {
    compensationData = response.compensation;
  }
  
  // Fixed field mappings
  const payRate = comp.rate?.value || comp.payRate || comp.amount;
  const payType = comp.type?.toLowerCase() || comp.payType;
  const payPeriod = comp.paySchedule || comp.paidPer || comp.payPeriod || 'monthly';
}
```

### Type Updates
```typescript
export interface BambooHREmployee {
  // ... other fields
  email?: string;           // Now optional
  workEmail?: string;       // Added for API compatibility
  hireDate?: string;        // Now optional
  // ... other fields
}

export interface Employee {
  // ... other fields
  hireDate?: string;        // Now optional
  // ... other fields
}
```

## Database Migration

### Option 1: Prisma CLI (Recommended)
```bash
# Generate Prisma client with new schema
npx prisma generate

# Push schema changes to database
npx prisma db push --accept-data-loss
```

### Option 2: Manual SQL
```sql
-- Make hire_date column nullable
ALTER TABLE employees ALTER COLUMN hire_date DROP NOT NULL;
```

### Option 3: PowerShell Script
```powershell
# Run the provided PowerShell script
.\scripts\update-employee-schema.ps1
```

## Usage

### Basic Employee Import
```typescript
import { importBambooHREmployees } from './lib/bamboohr';

const employees = await importBambooHREmployees();
console.log(`Imported ${employees.length} employees`);
```

### Salary Import
```typescript
import { importBambooHRSalaries } from './lib/bamboohr';

const salaries = await importBambooHRSalaries();
console.log(`Imported ${salaries.length} salary records`);
```

### Comprehensive Import
```typescript
import { importBambooHRData } from './lib/bamboohr';

const result = await importBambooHRData();
console.log(`Import completed: ${result.recordsImported} records`);
```

## Logging and Debugging

The updated service includes comprehensive logging:

- **API Calls**: All BambooHR API requests are logged
- **Field Mapping**: Employee field mappings are logged with details
- **Compensation Parsing**: Compensation record processing is logged
- **Field Completion**: Summary of fetched fields for all employees
- **Error Handling**: Detailed error logging with context

### Sample Log Output
```
🔄 Starting BambooHR employee fetch...
📊 Raw directory response data: {...}
✅ Found 25 employees in directory response
🔄 Fetching detailed information for 25 employees...
✅ Fetched details for employee 123: John Doe
📋 Field completion summary: {
  totalEmployees: 25,
  withHireDate: 23,
  withEmail: 25,
  withDepartment: 24
}
```

## Testing

### Test Employee Import
```typescript
// Test the updated service
const service = new BambooHRService(config);
const employees = await service.getAllEmployees();
console.log('Employees with hireDate:', employees.filter(e => e.hireDate).length);
```

### Test Compensation Import
```typescript
const compensations = await service.getEmployeeCompensation('employeeId');
console.log('Compensation records:', compensations.length);
```

## Troubleshooting

### Common Issues

1. **"hireDate is missing" Error**
   - Ensure database schema has been updated
   - Check that `getEmployeeDetails()` is being called
   - Verify API permissions for individual employee endpoints

2. **Compensation Import Fails Silently**
   - Check API response structure in logs
   - Verify field mappings match your BambooHR setup
   - Ensure compensation tables endpoint is accessible

3. **Missing Employee Fields**
   - Check API permissions for detailed employee endpoints
   - Verify field names in BambooHR configuration
   - Review logs for field completion summary

### Debug Steps

1. Enable detailed logging in the service
2. Check API response structures in console logs
3. Verify database schema matches Prisma schema
4. Test individual API endpoints manually
5. Review field completion summaries

## Performance Considerations

- **API Rate Limits**: The enhanced service makes additional API calls for detailed employee information
- **Batch Processing**: Consider implementing batch processing for large employee datasets
- **Caching**: Implement caching for employee details to reduce API calls
- **Error Handling**: Individual employee failures won't stop the entire import process

## Future Enhancements

- **Batch API Calls**: Implement batch employee detail fetching
- **Incremental Updates**: Only fetch changed employee data
- **Webhook Support**: Real-time employee data updates
- **Field Mapping Configuration**: Configurable field mappings for different BambooHR setups
