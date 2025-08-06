# CSV Import/Export Guide

## Overview

The projections table now supports importing and exporting data via CSV files. This allows you to:

- **Export** your current projections data to work with in Excel or other spreadsheet applications
- **Import** projections data from CSV files (e.g., after editing in Excel)
- **Download a template** to understand the correct CSV format

## How to Use

### Exporting Data

1. Click the **"Export to CSV"** button in the projections table
2. A CSV file will be downloaded with your current projections data
3. The filename will include the current date and time (e.g., `projections-export-2024-01-15-14-30-45.csv`)

### Importing Data

1. Click the **"Import from CSV"** button
2. Select your CSV file in the modal that appears
3. The system will validate the file format and show any errors
4. If successful, click **"Import All Data"** to apply the changes
5. If there are partial errors, you can still import the valid data by clicking **"Import Valid Data"**

### Getting a Template

1. Click the **"Download Template"** button
2. A sample CSV file will be downloaded showing the correct format
3. Use this as a starting point for creating your own CSV files

## CSV Format Requirements

### Required Headers
Your CSV file must include these columns in order:
- `Project ID` - The unique identifier for each project
- `Project Name` - The name of the project
- `Customer Name` - The customer name
- `Signed Fee` - The signed fee amount (numeric)
- `ASR Fee` - The ASR fee amount (numeric)

### Monthly Projection Columns
After the required headers, add columns for each month you want to import:
- Column names should be in `YYYY-MM` format (e.g., `2024-01`, `2024-02`)
- Values should be numeric amounts for each month's projection

### Example CSV Structure
```csv
Project ID,Project Name,Customer Name,Signed Fee,ASR Fee,2024-01,2024-02,2024-03
910829000008470049,Sample Project,Sample Customer,50000,10000,5000,7500,6000
```

## Validation Rules

The import system validates:

1. **File Format**: Must be a valid CSV file
2. **Required Headers**: All required columns must be present
3. **Project IDs**: Must match existing projects in the system
4. **Month Format**: Month columns must be in `YYYY-MM` format
5. **Numeric Values**: Fee and projection values must be numeric

## Error Handling

If there are errors during import:

- **Validation Errors**: The system will show specific error messages
- **Partial Data**: You can still import valid data even if some rows have errors
- **Project Mismatches**: Projects not found in the system will be skipped
- **Format Issues**: Invalid month formats or non-numeric values will be flagged

## Tips

1. **Use the Template**: Always start with the downloaded template to ensure correct format
2. **Check Project IDs**: Make sure project IDs in your CSV match those in the system
3. **Backup First**: Export your current data before importing to have a backup
4. **Test with Small Files**: Start with a few projects to test the import process
5. **Excel Compatibility**: The exported CSV files work well with Excel and Google Sheets

## Troubleshooting

### Common Issues

**"Project ID not found"**
- Verify the project ID exists in your current data
- Export current data to see the correct project IDs

**"Invalid month format"**
- Ensure month columns use `YYYY-MM` format (e.g., `2024-01`)
- Don't use abbreviated month names or other formats

**"Column count mismatch"**
- Check that your CSV has the same number of columns as the header
- Ensure no extra commas or missing values

**"Import failed"**
- Check the error messages for specific issues
- Try importing a smaller subset of data first

### Getting Help

If you encounter issues:
1. Check the error messages in the import modal
2. Verify your CSV format matches the template
3. Try importing with just a few projects first
4. Export your current data to compare formats 