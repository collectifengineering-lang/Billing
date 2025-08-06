import { BillingData } from './types';

export interface CSVProjectionData {
  projectId: string;
  projectName: string;
  customerName: string;
  signedFee: number;
  asrFee: number;
  [key: string]: string | number; // For dynamic month columns
}

export interface CSVImportResult {
  success: boolean;
  data?: Record<string, Record<string, number>>;
  errors?: string[];
  message?: string;
}

/**
 * Export projections table to CSV format
 */
export function exportProjectionsToCSV(
  billingData: BillingData[],
  monthlyProjections: Record<string, Record<string, number>>,
  asrFees: Record<string, number>,
  signedFees: Record<string, number>,
  monthRange: string[]
): string {

  // Create CSV header
  const headers = [
    'Project ID',
    'Project Name', 
    'Customer Name',
    'Signed Fee',
    'ASR Fee',
    ...monthRange.map(month => formatMonthForCSV(month))
  ];

  // Create CSV rows
  const rows = billingData.map(project => {
    const row: CSVProjectionData = {
      projectId: project.projectId,
      projectName: project.projectName,
      customerName: project.customerName,
      signedFee: signedFees[project.projectId] || project.signedFee || 0,
      asrFee: asrFees[project.projectId] || 0,
    };

    // Add monthly projections
    monthRange.forEach(month => {
      const value = monthlyProjections[project.projectId]?.[month] || 0;
      row[month] = value;
    });

    return row;
  });

  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
             headers.map(header => {
         let value;
         if (header === 'Project ID') {
           // Ensure Project ID is always treated as a string to prevent scientific notation
           const projectId = row.projectId;
           console.log('CSV Export - Project ID type:', typeof projectId, 'value:', projectId);
           
           // Fix: Avoid using toLocaleString on 'never' type, ensure projectId is string or number
           // Ensure projectId is string or number before converting to string
           if (typeof projectId === 'number' || typeof projectId === 'string') {
             value = String(projectId);
           } else {
             value = '';
           }
           console.log('CSV Export - Final Project ID value:', value);
         } else if (header === 'Project Name') {
           value = row.projectName;
         } else if (header === 'Customer Name') {
           value = row.customerName;
         } else if (header === 'Signed Fee') {
           value = row.signedFee;
         } else if (header === 'ASR Fee') {
           value = row.asrFee;
         } else {
           // For month columns, find the corresponding month in the original format
           const monthKey = monthRange.find(month => formatMonthForCSV(month) === header);
           value = monthKey ? row[monthKey] : 0;
         }
         // Escape commas and quotes in the value
         const escapedValue = String(value).replace(/"/g, '""');
         return `"${escapedValue}"`;
       }).join(',')
    )
  ].join('\n');

  return csvContent;
}

/**
 * Import projections from CSV format
 */
export function importProjectionsFromCSV(
  csvContent: string,
  billingData: BillingData[]
): CSVImportResult {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return {
        success: false,
        errors: ['CSV file must have at least a header row and one data row']
      };
    }

    const headers = parseCSVRow(lines[0]);
    const dataRows = lines.slice(1);

    // Validate headers
    const requiredHeaders = ['Project ID', 'Project Name', 'Customer Name', 'Signed Fee', 'ASR Fee'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      return {
        success: false,
        errors: [`Missing required headers: ${missingHeaders.join(', ')}`]
      };
    }

    // Extract month columns (everything after the required headers)
    const monthColumns = headers.slice(5);
    
    // Validate month format
    const invalidMonths = monthColumns.filter(month => !/^\d{4}-\d{2}$/.test(month));
    if (invalidMonths.length > 0) {
      return {
        success: false,
        errors: [`Invalid month format found: ${invalidMonths.join(', ')}. Expected format: YYYY-MM`]
      };
    }

    const importedData: Record<string, Record<string, number>> = {};
    const errors: string[] = [];

    dataRows.forEach((row, index) => {
      const values = parseCSVRow(row);
      
      if (values.length !== headers.length) {
        errors.push(`Row ${index + 2}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
        return;
      }

             const projectId = values[0].trim(); // Ensure it's treated as a string
       const projectName = values[1];
       const customerName = values[2];
       const signedFee = parseFloat(values[3]) || 0;
       const asrFee = parseFloat(values[4]) || 0;

      // Validate project exists in billing data
      const projectExists = billingData.some(p => p.projectId === projectId);
      if (!projectExists) {
        errors.push(`Row ${index + 2}: Project ID "${projectId}" not found in current data`);
        return;
      }

      // Parse monthly projections
      const monthlyData: Record<string, number> = {};
      monthColumns.forEach((month, monthIndex) => {
        const value = parseFloat(values[5 + monthIndex]) || 0;
        monthlyData[month] = value;
      });

      importedData[projectId] = monthlyData;
    });

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        data: importedData // Return partial data even with errors
      };
    }

    return {
      success: true,
      data: importedData,
      message: `Successfully imported ${Object.keys(importedData).length} projects with ${monthColumns.length} months of data`
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Parse a CSV row, handling quoted values and commas
 */
function parseCSVRow(row: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last value
  values.push(current.trim());
  
  return values;
}

/**
 * Format month for CSV display (e.g., "2024-01" -> "Jan 2024")
 */
function formatMonthForCSV(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Generate a filename for the CSV export
 */
export function generateCSVFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
  return `projections-export-${dateStr}-${timeStr}.csv`;
}

/**
 * Download CSV content as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Read CSV file from input element
 */
export function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
} 