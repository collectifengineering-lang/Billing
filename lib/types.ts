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
}

export interface ProjectWithBilling extends ZohoProject {
  billingData: BillingData;
} 