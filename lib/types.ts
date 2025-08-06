import { ZohoProject, ZohoInvoice } from './zoho';

export interface ProjectManager {
  id: string;
  name: string;
  color: string;
}

export interface ProjectAssignment {
  projectId: string;
  managerId: string;
}

export interface BillingData {
  projectId: string;
  projectName: string;
  customerName: string;
  signedFee?: number;
  monthlyData: MonthlyBillingData[];
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
  isClosed?: boolean;
  projectManagerId?: string;
}

export interface MonthlyBillingData {
  month: string; // Format: "YYYY-MM"
  billed: number;
  unbilled: number;
  projected: number;
  actual: number;
}

export interface ProjectionCell {
  value: number;
  isEditable: boolean;
  isProjected: boolean;
}

export interface ProjectionsTable {
  [projectId: string]: {
    months: { [month: string]: ProjectionCell };
    asrFee?: number; // Added for Total ASR Fee (user input)
  };
}

export interface ChartData {
  name: string;
  billed: number;
  unbilled: number;
  projected: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalBilled: number;
  totalUnbilled: number;
  totalProjected: number;
  activeProjects: number;
}

export interface Project {
  id: string;
  name: string;
  customerName: string;
  project_id: string;
  project_name: string;
  project_code: string;
  customer_id: string;
  customer_name: string;
  description: string;
  can_be_invoiced: boolean;
  status: string;
  billing_type: string;
  created_time: string;
  last_modified_time: string;
  has_attachment: boolean;
  total_hours: string;
  billable_hours: string;
  other_service_app_source: string;
  users_working: number;
  cf_market: string;
  cf_market_unformatted: string;
  custom_fields: any[];
  start_date: string;
  end_date: string;
}

export interface Invoice {
  id: string;
  projectId: string;
  amount: number;
  date: string;
  invoice_id: string;
  project_id: string;
  invoice_number: string;
  status: string;
  customer_id: string;
  total: number;
  billed_amount: number;
  unbilled_amount: number;
  // Add more if needed
}

export interface ProjectWithBilling extends ZohoProject {
  billingData: BillingData;
} 