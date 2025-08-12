# BambooHR Integration Guide

This guide covers the integration of BambooHR with your billing dashboard to provide real-time employee salary data for accurate profitability calculations and multiplier management.

## Overview

The BambooHR integration allows you to:
- Import employee data and compensation history
- Maintain historical salary records for accurate multiplier calculations
- Calculate real-time project profitability using actual employee costs
- Track salary changes over time without affecting historical multipliers

## Setup Requirements

### 1. BambooHR Account
- Active BambooHR subscription
- API access enabled
- Admin or HR Manager permissions

### 2. API Credentials
- **Subdomain**: Your company's BambooHR subdomain (e.g., "company.bamboohr.com")
- **API Key**: Generated from BambooHR Admin → API → API Keys
- **Webhook Secret**: Optional, for real-time updates

### 3. Environment Variables
Add these to your `.env.local` file:

```bash
# BambooHR Configuration
BAMBOOHR_SUBDOMAIN=collectifengineering
BAMBOOHR_API_KEY=cd8d51ebb52f59d5801e53b183be26894c0f7161
BAMBOOHR_WEBHOOK_SECRET="optional-webhook-secret"
```

## API Endpoints

### Base URL
```
https://api.bamboohr.com/api/gateway.php/{subdomain}
```

### Available Operations

#### 1. Configure Integration
```http
POST /api/payroll/bamboohr
{
  "action": "configure",
  "data": {
    "subdomain": "your-company",
    "apiKey": "your-api-key",
    "webhookSecret": "optional-secret"
  }
}
```

#### 2. Test Connection
```http
POST /api/payroll/bamboohr
{
  "action": "test-connection",
  "data": {
    "subdomain": "your-company",
    "apiKey": "your-api-key"
  }
}
```

#### 3. Import Employee Data
```http
POST /api/payroll/bamboohr
{
  "action": "import-data"
}
```

#### 4. Get Employees
```http
POST /api/payroll/bamboohr
{
  "action": "get-employees",
  "data": {
    "subdomain": "your-company",
    "apiKey": "your-api-key"
  }
}
```

#### 5. Get Employee Compensation
```http
POST /api/payroll/bamboohr
{
  "action": "get-compensation",
  "data": {
    "config": {
      "subdomain": "your-company",
      "apiKey": "your-api-key"
    },
    "employeeId": "123"
  }
}
```

## Data Structure

### Employee Data
```typescript
interface BambooHREmployee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  status: 'active' | 'inactive' | 'terminated';
  hireDate: string;
  terminationDate?: string;
  department?: string;
  jobTitle?: string;
  location?: string;
  supervisor?: string;
  employeeNumber?: string;
  customFields?: Record<string, any>;
}
```

### Compensation Data
```typescript
interface BamboohrCompensation {
  employeeId: string;
  effectiveDate: string;
  endDate?: string;
  annualSalary: number;
  hourlyRate: number;
  currency: string;
  paySchedule: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  payType: 'salary' | 'hourly';
  benefits?: {
    healthInsurance?: number;
    retirement?: number;
    other?: number;
  };
  notes?: string;
}
```

## Integration Features

### 1. Historical Salary Tracking
- Maintains complete salary history for each employee
- Tracks effective dates and end dates
- Calculates hourly rates based on pay schedule
- Preserves historical data for accurate multiplier calculations

### 2. Multiplier Management
- Uses actual employee costs instead of estimates
- Calculates real-time project profitability
- Maintains historical multipliers when salaries change
- Provides accurate billing rate recommendations

### 3. Employee Management
- Automatic employee data synchronization
- Department and position tracking
- Status management (active/inactive/terminated)
- Custom field support

### 4. Real-time Updates
- Webhook support for immediate data updates
- Automatic salary change detection
- Real-time profitability calculations
- Live dashboard updates

## Usage Examples

### Basic Setup
```typescript
import { configureBambooHR, importBambooHRData } from '@/lib/bamboohr';

// Configure the integration
await configureBambooHR({
  subdomain: 'your-company',
  apiKey: 'your-api-key'
});

// Import all employee and salary data
const importResult = await importBambooHRData();
console.log(`Imported ${importResult.recordsImported} records`);
```

### Employee Lookup
```typescript
import { getBambooHRService } from '@/lib/bamboohr';

const service = getBambooHRService();
const employees = await service.getAllEmployees();
const activeEmployees = await service.getActiveEmployees();
```

### Compensation History
```typescript
const compensation = await service.getEmployeeCompensation('employee-123');
const history = await service.getCompensationHistory('employee-123', '2023-01-01', '2024-01-01');
```

## Testing

### 1. Test Script
Run the test script to verify basic functionality:
```bash
node scripts/test-bamboohr.js
```

### 2. API Testing
Test the connection using the test-connection action:
```bash
curl -X POST http://localhost:3000/api/payroll/bamboohr \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test-connection",
    "data": {
      "subdomain": "your-company",
      "apiKey": "your-api-key"
    }
  }'
```

### 3. Data Import Test
Test data import functionality:
```bash
curl -X POST http://localhost:3000/api/payroll/bamboohr \
  -H "Content-Type: application/json" \
  -d '{"action": "import-data"}'
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
- Verify API key is correct
- Check subdomain spelling
- Ensure API access is enabled in BambooHR

#### 2. Permission Errors
- Verify API key has appropriate permissions
- Check employee data access rights
- Ensure compensation data access is enabled

#### 3. Data Import Issues
- Check API rate limits
- Verify data format compatibility
- Review error logs for specific issues

#### 4. Connection Issues
- Verify network connectivity
- Check BambooHR service status
- Validate API endpoint construction

### Debug Steps

1. **Test Connection**: Use test-connection action
2. **Check Logs**: Review application logs for errors
3. **Verify Credentials**: Double-check subdomain and API key
4. **Test API Access**: Try accessing BambooHR API directly
5. **Check Permissions**: Verify API key permissions in BambooHR

## Security Considerations

### Data Protection
- API keys are stored securely
- Employee data is encrypted
- Access is role-based
- Audit trails are maintained

### Compliance
- GDPR compliance for employee data
- SOX compliance for financial data
- Local labor law compliance
- Data retention policies

## Support

For issues or questions:

1. **Check Logs**: Review application logs
2. **Test Connection**: Use the test-connection action
3. **Verify Setup**: Ensure all requirements are met
4. **Contact Support**: Reach out to the development team

## Migration from Other Systems

If migrating from another payroll system:

1. **Export Data**: Export existing employee and salary data
2. **Configure BambooHR**: Set up the new integration
3. **Import Data**: Import data using the import-data action
4. **Verify Accuracy**: Test calculations and reports
5. **Update References**: Update any hardcoded system references

---

*This integration provides comprehensive employee data management with historical accuracy for precise profitability calculations.*
