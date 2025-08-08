# Payroll Integration & Project Profitability Analysis

## Overview

This system integrates employee salary data with Clockify time tracking to provide comprehensive project profitability analysis. It handles historical salary rates and project multipliers, ensuring accurate cost calculations even when rates change over time.

## Key Features

### ✅ **Historical Rate Tracking**
- **Employee Salaries**: Track salary changes over time with effective dates
- **Project Multipliers**: Manage different billing rates per project with historical tracking
- **Time-Aware Calculations**: Automatically use the correct rates for any given date

### ✅ **Complete Profitability Analysis**
- **Project Profitability**: Revenue vs. cost analysis per project
- **Employee Profitability**: Individual employee performance metrics
- **Multiplier Analysis**: Project-specific billing rate effectiveness
- **Historical Trends**: Track profitability over time periods

### ✅ **Payroll System Integration**
- **SurePayroll**: Full integration with employee and compensation data
- **Multiple Payroll Systems**: Support for Gusto, QuickBooks, ADP, and custom systems
- **API Integration**: Automated salary data import
- **Manual Entry**: Fallback for manual salary data entry
- **Data Export/Import**: Backup and restore payroll data

## Data Structure

### Employee Management
```typescript
interface Employee {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  department?: string;
  position?: string;
  hireDate: string;
  terminationDate?: string;
}
```

### Salary Tracking
```typescript
interface EmployeeSalary {
  employeeId: string;
  effectiveDate: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format, null if current
  annualSalary: number;
  hourlyRate: number; // Calculated from annual salary
  currency: string;
  notes?: string;
}
```

### Project Multipliers
```typescript
interface ProjectMultiplier {
  projectId: string;
  projectName: string;
  multiplier: number; // e.g., 2.5x, 3.0x
  effectiveDate: string;
  endDate?: string;
  notes?: string;
}
```

### SurePayroll Integration
```typescript
interface SurePayrollConfig {
  clientId: string;
  apiKey: string;
  webhookSecret?: string;
}

interface SurePayrollEmployee {
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

interface SurePayrollCompensation {
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

## API Endpoints

### Employee Management
- `GET /api/payroll/employees` - Get all employees
- `POST /api/payroll/employees` - Add new employee

### Salary Management
- `GET /api/payroll/salaries?employeeId=123&date=2024-01-15` - Get salary for specific date
- `GET /api/payroll/salaries?employeeId=123` - Get salary history
- `POST /api/payroll/salaries` - Add new salary record

### Project Multipliers
- `GET /api/payroll/multipliers?projectId=456&date=2024-01-15` - Get multiplier for specific date
- `GET /api/payroll/multipliers?projectId=456` - Get multiplier history
- `POST /api/payroll/multipliers` - Add new multiplier

### Profitability Analysis
- `POST /api/payroll/profitability` - Generate various reports

### SurePayroll Integration
- `POST /api/payroll/surepayroll` - SurePayroll operations

## Usage Examples

### 1. SurePayroll Integration Setup

```typescript
// Configure SurePayroll
await configureSurePayroll({
  clientId: 'your_client_id',
  apiKey: 'your_api_key',
  webhookSecret: 'your_webhook_secret'
});

// Import data from SurePayroll
const importResult = await importSurePayrollData();
console.log(`Imported ${importResult.recordsImported} records from SurePayroll`);
```

### 2. Adding Employee with Salary History

```typescript
// Add employee
await addEmployee({
  id: 'emp_123',
  name: 'John Doe',
  email: 'john@company.com',
  status: 'active',
  hireDate: '2023-01-15'
});

// Add salary history
await addSalary({
  employeeId: 'emp_123',
  effectiveDate: '2023-01-15',
  annualSalary: 80000,
  hourlyRate: 38.46, // 80000 / 2080
  currency: 'USD'
});

// Add salary increase
await addSalary({
  employeeId: 'emp_123',
  effectiveDate: '2024-01-01',
  annualSalary: 90000,
  hourlyRate: 43.27, // 90000 / 2080
  currency: 'USD'
});
```

### 3. Setting Project Multipliers

```typescript
// Set project multiplier
await addProjectMultiplier({
  projectId: 'proj_456',
  projectName: 'Client Website',
  multiplier: 2.5,
  effectiveDate: '2024-01-01',
  notes: 'Standard billing rate'
});

// Update multiplier
await addProjectMultiplier({
  projectId: 'proj_456',
  projectName: 'Client Website',
  multiplier: 3.0,
  effectiveDate: '2024-06-01',
  notes: 'Increased due to complexity'
});
```

### 4. Processing Time Entries

```typescript
// Process Clockify time entries with payroll data
const employeeTimeEntries = await processTimeEntries(
  clockifyEntries,
  clockifyUsers,
  projects
);

// Each entry includes:
// - Employee's hourly rate at that time
// - Project multiplier at that time
// - Calculated costs and billable values
// - Efficiency metrics
```

### 5. Generating Profitability Reports

```typescript
// Project profitability report
const projectReport = await generateProjectProfitabilityReport(
  'proj_456',
  '2024-01-01',
  '2024-12-31',
  employeeTimeEntries,
  50000 // Revenue
);

// Employee profitability report
const employeeReport = await generateEmployeeProfitabilityReport(
  'emp_123',
  '2024-01-01',
  '2024-12-31',
  employeeTimeEntries
);
```

## Historical Rate Calculation

### How It Works

1. **Time Entry Processing**: When processing Clockify time entries, the system:
   - Looks up the employee's salary effective on the entry date
   - Looks up the project's multiplier effective on the entry date
   - Calculates costs using historical rates

2. **Rate Resolution**: For any given date, the system finds:
   - **Employee Rate**: The salary record where `effectiveDate <= entryDate <= endDate`
   - **Project Multiplier**: The multiplier record where `effectiveDate <= entryDate <= endDate`

3. **Cost Calculation**:
   ```typescript
   const totalCost = hours * employeeHourlyRate;
   const billableValue = billableHours * employeeHourlyRate * projectMultiplier;
   ```

### Example Timeline

```
Employee: John Doe
- 2023-01-15 to 2023-12-31: $80,000/year ($38.46/hour)
- 2024-01-01 to present: $90,000/year ($43.27/hour)

Project: Client Website
- 2024-01-01 to 2024-05-31: 2.5x multiplier
- 2024-06-01 to present: 3.0x multiplier

Time Entry: 2024-03-15, 8 hours, billable
- Employee Rate: $43.27/hour (2024 rate)
- Project Multiplier: 2.5x (March 2024 rate)
- Total Cost: 8 * $43.27 = $346.16
- Billable Value: 8 * $43.27 * 2.5 = $865.40
```

## SurePayroll Integration

### Setup Requirements

1. **SurePayroll Account**: Active SurePayroll subscription
2. **API Access**: API key with appropriate permissions
3. **Client ID**: Your SurePayroll client identifier
4. **Webhook Secret**: For real-time updates (optional)

### Configuration

```typescript
// Configure SurePayroll integration
await configureSurePayroll({
  clientId: 'your_client_id',
  apiKey: 'your_api_key_here',
  webhookSecret: 'your_webhook_secret'
});

// Import all employee and salary data
const importResult = await importSurePayrollData();
```

### API Operations

#### Test Connection
```typescript
POST /api/payroll/surepayroll
{
  "action": "test-connection",
  "data": {
    "clientId": "your_client_id",
    "apiKey": "your_api_key"
  }
}
```

#### Import Data
```typescript
POST /api/payroll/surepayroll
{
  "action": "import-data"
}
```

#### Get Employees
```typescript
POST /api/payroll/surepayroll
{
  "action": "get-employees",
  "data": {
    "clientId": "your_client_id",
    "apiKey": "your_api_key"
  }
}
```

#### Get Compensation
```typescript
POST /api/payroll/surepayroll
{
  "action": "get-compensation",
  "data": {
    "config": {
      "clientId": "your_client_id",
      "apiKey": "your_api_key"
    },
    "employeeId": "123"
  }
}
```

### Data Mapping

The system automatically maps SurePayroll data to internal structures:

| SurePayroll Field | Internal Field | Notes |
|-------------------|----------------|-------|
| `id` | `employeeId` | Employee identifier |
| `displayName` | `name` | Full employee name |
| `email` | `email` | Employee email |
| `status` | `status` | Active/Inactive mapping |
| `department` | `department` | Department name |
| `jobTitle` | `position` | Job title/position |
| `hireDate` | `hireDate` | Employment start date |
| `compensationAnnualSalary` | `annualSalary` | Annual salary amount |
| `compensationHourlyRate` | `hourlyRate` | Calculated hourly rate |
| `compensationEffectiveDate` | `effectiveDate` | Salary effective date |

### Supported SurePayroll Features

#### Employee Management
- ✅ Employee directory
- ✅ Employee details
- ✅ Department filtering
- ✅ Status filtering
- ✅ Custom field support

#### Compensation
- ✅ Current compensation
- ✅ Compensation history
- ✅ Salary vs. hourly rates
- ✅ Pay schedule support
- ✅ Currency handling

#### Time Off
- ✅ Time off requests
- ✅ Time off policies
- ✅ Employee time off history

#### Reports
- ✅ Custom report creation
- ✅ Report execution
- ✅ Data export

#### Webhooks
- ✅ Real-time updates
- ✅ Employee changes
- ✅ Compensation updates

### Payroll System Integration

#### Supported Systems

1. **SurePayroll** ⭐ **RECOMMENDED**
   - API endpoint: `https://api.surepayroll.com/v1`
   - Comprehensive employee data
   - Real-time webhook support
   - Historical compensation tracking
   - Time off integration

2. **Gusto**
   - API endpoint: `https://api.gusto.com/v1`
   - Webhook support for real-time updates
   - Automatic salary import

3. **QuickBooks**
   - API endpoint: `https://quickbooks.api.intuit.com`
   - Employee and salary data sync
   - Historical data import

4. **ADP**
   - API endpoint: `https://api.adp.com`
   - Comprehensive employee data
   - Salary history tracking

5. **Custom Systems**
   - Flexible API integration
   - CSV import support
   - Webhook configuration

### Integration Setup

```typescript
// Configure payroll system
await payrollService.configurePayrollSystem({
  name: 'SurePayroll',
  type: 'surepayroll',
  apiEndpoint: 'https://api.surepayroll.com/v1',
  apiKey: 'your_api_key',
  webhookUrl: 'https://your-app.com/webhooks/surepayroll'
});

// Configure SurePayroll specifically
await configureSurePayroll({
  clientId: 'your_client_id',
  apiKey: 'your_api_key',
  webhookSecret: 'your_webhook_secret'
});

// Import salaries
const importResult = await payrollService.importSalariesFromPayrollSystem();
```

## Profitability Metrics

### Project-Level Metrics

- **Total Hours**: Sum of all time spent on project
- **Total Cost**: Sum of employee costs (hours × hourly rates)
- **Total Revenue**: From billing/projections
- **Gross Profit**: Revenue - Cost
- **Profit Margin**: (Gross Profit / Revenue) × 100
- **Average Multiplier**: Weighted average of project multipliers
- **Employee Breakdown**: Per-employee contribution analysis
- **Monthly Breakdown**: Time-series profitability tracking

### Employee-Level Metrics

- **Total Hours**: Hours worked across all projects
- **Billable Hours**: Hours that can be billed to clients
- **Efficiency**: Billable hours / Total hours
- **Average Hourly Rate**: Weighted average of salary rates
- **Total Cost**: Employee cost to company
- **Total Billable Value**: Value generated for clients
- **Project Breakdown**: Per-project contribution analysis

## Dashboard Integration

### Enhanced Dashboard Stats

The payroll integration enhances the existing dashboard with:

1. **Cost Analysis**: Employee costs vs. revenue
2. **Profitability KPIs**: Gross profit, margins, efficiency
3. **Employee Performance**: Top performers, utilization rates
4. **Project Multipliers**: Effectiveness of billing rates
5. **Historical Trends**: Profitability over time

### New Dashboard Components

- **Project Profitability Cards**: Revenue, cost, profit, margin
- **Employee Performance Table**: Hours, efficiency, billable value
- **Multiplier Effectiveness**: Project-specific billing rate analysis
- **Cost vs. Revenue Charts**: Visual profitability trends
- **Employee Utilization**: Time allocation across projects

## Data Import/Export

### Export Payroll Data

```typescript
const payrollData = await payrollService.exportData();
// Includes: employees, salaries, multipliers, payroll system config, surepayroll config
```

### Import Payroll Data

```typescript
await payrollService.importData(payrollData);
// Restores: employees, salaries, multipliers, payroll system config, surepayroll config
```

## Security & Privacy

### Data Protection

- **Employee Data**: Encrypted storage of salary information
- **Access Control**: Role-based permissions for payroll data
- **Audit Trail**: Track all salary and multiplier changes
- **Data Retention**: Configurable retention policies

### Compliance

- **GDPR**: Employee data privacy compliance
- **SOX**: Financial data integrity
- **HIPAA**: Healthcare data protection (if applicable)
- **Local Regulations**: Compliance with regional labor laws

## Troubleshooting

### Common Issues

1. **Missing Salary Data**
   - Check employee ID mapping between Clockify and payroll
   - Verify salary effective dates
   - Ensure salary records exist for time entry dates

2. **Incorrect Multipliers**
   - Verify project ID mapping
   - Check multiplier effective dates
   - Ensure multiplier records exist for time entry dates

3. **SurePayroll Import Errors**
   - Validate API credentials and client ID
   - Check API permissions for employee and compensation data
   - Verify webhook configuration
   - Ensure proper field mapping

4. **Import Errors**
   - Validate payroll system API credentials
   - Check webhook configuration
   - Verify data format compatibility

### Debug Tools

- **Salary Lookup**: Test employee salary retrieval for specific dates
- **Multiplier Lookup**: Test project multiplier retrieval for specific dates
- **Time Entry Validation**: Verify time entry processing with payroll data
- **Report Generation**: Test profitability report generation
- **SurePayroll Connection Test**: Verify API connectivity and permissions

## Future Enhancements

### Planned Features

1. **Advanced Analytics**
   - Predictive profitability modeling
   - Employee performance forecasting
   - Project risk assessment

2. **Enhanced Integrations**
   - Additional payroll system support
   - Accounting system integration
   - HR system synchronization

3. **Reporting Enhancements**
   - Custom report builder
   - Automated report scheduling
   - Export to various formats (PDF, Excel, etc.)

4. **Real-time Updates**
   - Live profitability tracking
   - Instant cost calculations
   - Real-time dashboard updates

## Support

For questions or issues with the payroll integration:

1. **Documentation**: Check this guide and API documentation
2. **Logs**: Review application logs for error details
3. **Testing**: Use the debug tools to validate data
4. **Support**: Contact the development team for assistance

---

*This payroll integration provides comprehensive project profitability analysis while maintaining historical accuracy and supporting multiple payroll systems, with full SurePayroll integration.*
