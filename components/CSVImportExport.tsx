'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  exportProjectionsToCSV, 
  importProjectionsFromCSV, 
  generateCSVFilename, 
  downloadCSV, 
  readCSVFile,
  CSVImportResult 
} from '../lib/csvUtils';

// Generate a template CSV for users to download
function generateTemplateCSV(): string {
  const headers = [
    'Project ID',
    'Project Name',
    'Customer Name', 
    'Signed Fee',
    'ASR Fee',
    '2024-01',
    '2024-02',
    '2024-03',
    '2024-04',
    '2024-05',
    '2024-06'
  ];
  
  const sampleRow = [
    '910829000008470049',
    'Sample Project',
    'Sample Customer',
    '50000',
    '10000',
    '5000',
    '7500',
    '6000',
    '8000',
    '9000',
    '7000'
  ];
  
  return [headers.join(','), sampleRow.join(',')].join('\n');
}
import { BillingData } from '../lib/types';

interface CSVImportExportProps {
  billingData: BillingData[];
  monthlyProjections: Record<string, Record<string, number>>;
  asrFees: Record<string, number>;
  signedFees: Record<string, number>;
  monthRange: string[];
  onImportData: (data: Record<string, Record<string, number>>) => void;
}

export default function CSVImportExport({
  billingData,
  monthlyProjections,
  asrFees,
  signedFees,
  monthRange,
  onImportData
}: CSVImportExportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const csvContent = exportProjectionsToCSV(
        billingData,
        monthlyProjections,
        asrFees,
        signedFees,
        monthRange
      );
      
      const filename = generateCSVFilename();
      downloadCSV(csvContent, filename);
      
      toast.success('Projections exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export projections');
    }
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setImportResult(null);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const csvContent = await readCSVFile(file);
      const result = importProjectionsFromCSV(csvContent, billingData);
      setImportResult(result);

      if (result.success && result.data) {
        toast.success(result.message || 'Import completed successfully!');
      } else {
        toast.error('Import failed. Please check the errors below.');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to read CSV file');
      setImportResult({
        success: false,
        errors: ['Failed to read CSV file']
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = () => {
    if (importResult?.success && importResult.data) {
      onImportData(importResult.data);
      setShowImportModal(false);
      setImportResult(null);
      toast.success('Data imported successfully!');
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = generateTemplateCSV();
    downloadCSV(templateContent, 'projections-template.csv');
    toast.success('Template downloaded successfully!');
  };

  const handleCancelImport = () => {
    setShowImportModal(false);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Export/Import Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
        
        <button
          onClick={handleImportClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import from CSV
        </button>
        
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Import Projections from CSV
              </h3>
              <button
                onClick={handleCancelImport}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Select a CSV file to import projections data. The file should include:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                <li>Project ID, Project Name, Customer Name</li>
                <li>Signed Fee and ASR Fee columns</li>
                <li>Monthly projection columns (format: YYYY-MM)</li>
              </ul>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Use the &quot;Download Template&quot; button to get a sample CSV file with the correct format.
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={isImporting}
              />
            </div>

            {/* Import Results */}
            {importResult && (
              <div className="mb-4">
                {importResult.success ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-green-800 font-medium">Import Successful</p>
                      <p className="text-green-700 text-sm">{importResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-medium">Import Failed</p>
                      {importResult.errors && (
                        <ul className="text-red-700 text-sm mt-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index} className="list-disc list-inside">
                              {error}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Partial Data Warning */}
                {!importResult.success && importResult.data && Object.keys(importResult.data).length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      Some data was successfully parsed. You can still import the valid data by clicking &quot;Import Valid Data&quot;.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelImport}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              {importResult?.data && Object.keys(importResult.data).length > 0 && (
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import {importResult.success ? 'All' : 'Valid'} Data
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 