import { ZohoProject, ZohoInvoice } from './zoho';
import { BillingData, ProjectionsTable } from './types';
import { processBillingData, initializeProjectionsTable } from './utils';

// Mock data for testing
export const mockProjects: ZohoProject[] = [
  {
    project_id: '1',
    project_name: 'Website Redesign',
    description: 'Complete website redesign for ABC Corp',
    status: 'active',
    start_date: '2024-01-15',
    end_date: '2024-06-30',
    budget_amount: 50000,
    rate_per_hour: 150,
    customer_id: '1',
    customer_name: 'ABC Corporation',
    signed_fee: undefined, // Remove Zoho signed fee, only use user-entered data
  },
  {
    project_id: '2',
    project_name: 'Mobile App Development',
    description: 'iOS and Android app for XYZ Inc',
    status: 'active',
    start_date: '2024-02-01',
    end_date: '2024-08-31',
    budget_amount: 75000,
    rate_per_hour: 175,
    customer_id: '2',
    customer_name: 'XYZ Industries',
    signed_fee: undefined, // Remove Zoho signed fee, only use user-entered data
  },
  {
    project_id: '3',
    project_name: 'E-commerce Platform',
    description: 'Online store for DEF Retail',
    status: 'active',
    start_date: '2024-03-01',
    end_date: '2024-09-30',
    budget_amount: 100000,
    rate_per_hour: 200,
    customer_id: '3',
    customer_name: 'DEF Retail',
    signed_fee: undefined, // Remove Zoho signed fee, only use user-entered data
  },
  {
    project_id: '4',
    project_name: 'CRM Integration',
    description: 'Salesforce integration for GHI Services',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-05-31',
    budget_amount: 30000,
    rate_per_hour: 125,
    customer_id: '4',
    customer_name: 'GHI Services',
    signed_fee: undefined, // Remove Zoho signed fee, only use user-entered data
  },
];

export const mockInvoices: ZohoInvoice[] = [
  // Website Redesign invoices
  { invoice_id: '1', project_id: '1', invoice_number: 'INV-001', date: '2024-01-31', amount: 15000, status: 'paid', billed_amount: 15000, unbilled_amount: 0 },
  { invoice_id: '2', project_id: '1', invoice_number: 'INV-002', date: '2024-02-29', amount: 12000, status: 'paid', billed_amount: 12000, unbilled_amount: 0 },
  { invoice_id: '3', project_id: '1', invoice_number: 'INV-003', date: '2024-03-31', amount: 18000, status: 'sent', billed_amount: 15000, unbilled_amount: 3000 },
  
  // Mobile App invoices
  { invoice_id: '4', project_id: '2', invoice_number: 'INV-004', date: '2024-02-29', amount: 20000, status: 'paid', billed_amount: 20000, unbilled_amount: 0 },
  { invoice_id: '5', project_id: '2', invoice_number: 'INV-005', date: '2024-03-31', amount: 25000, status: 'sent', billed_amount: 20000, unbilled_amount: 5000 },
  
  // E-commerce invoices
  { invoice_id: '6', project_id: '3', invoice_number: 'INV-006', date: '2024-03-31', amount: 30000, status: 'sent', billed_amount: 25000, unbilled_amount: 5000 },
  
  // CRM Integration invoices
  { invoice_id: '7', project_id: '4', invoice_number: 'INV-007', date: '2024-01-31', amount: 10000, status: 'paid', billed_amount: 10000, unbilled_amount: 0 },
  { invoice_id: '8', project_id: '4', invoice_number: 'INV-008', date: '2024-02-29', amount: 8000, status: 'paid', billed_amount: 8000, unbilled_amount: 0 },
  { invoice_id: '9', project_id: '4', invoice_number: 'INV-009', date: '2024-03-31', amount: 12000, status: 'sent', billed_amount: 10000, unbilled_amount: 2000 },
];

export function getMockData() {
  const projections = initializeProjectionsTable(mockProjects);
  const billingData = processBillingData(mockProjects, mockInvoices, projections);
  
  return {
    projects: mockProjects,
    invoices: mockInvoices,
    billingData,
    projections,
  };
} 