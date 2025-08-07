import axios from 'axios';

export interface ZohoProject {
  project_id: string;
  project_name: string; // Changed from name to project_name
  description?: string;
  status: string;
  start_date: string;
  end_date?: string;
  budget_amount?: number;
  rate_per_hour?: number;
  customer_id: string;
  customer_name: string;
  signed_fee?: number; // Added for Signed Fee from Zoho
}

export interface ZohoInvoice {
  invoice_id: string;
  project_id: string;
  invoice_number: string;
  date: string;
  amount: number;
  status: string;
  billed_amount: number;
  unbilled_amount: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
  refresh_token?: string;
}

class ZohoService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private refreshPromise: Promise<string> | null = null;
  private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes buffer
  private autoRefreshTimer: NodeJS.Timeout | null = null;
  private readonly AUTO_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes
  private lastRefreshTime: number = 0; // Track when auto-refresh was last triggered

  constructor() {
    // Start automatic token refresh
    this._startAutoRefresh();
  }

  private _startAutoRefresh(): void {
    // Clear any existing timer
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }

    // Set up automatic refresh every 45 minutes
    this.autoRefreshTimer = setInterval(async () => {
      try {
        console.log('Auto-refreshing Zoho token (45-minute interval)...');
        this.lastRefreshTime = Date.now(); // Track when refresh was triggered
        await this.forceRefreshToken();
        console.log('Auto-refresh completed successfully');
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, this.AUTO_REFRESH_INTERVAL);

    // Set initial refresh time
    this.lastRefreshTime = Date.now();
    console.log('Automatic Zoho token refresh started (every 45 minutes)');
  }

  private _stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
      console.log('Automatic Zoho token refresh stopped');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Check if token is still valid (with buffer)
    if (this.accessToken && Date.now() < (this.tokenExpiry - this.TOKEN_REFRESH_BUFFER)) {
      return this.accessToken;
    }

    // If there's already a refresh in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start a new refresh
    this.refreshPromise = this.refreshAccessToken();
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    try {
      console.log('Refreshing Zoho access token...');
      
      // Create form data for the request
      const formData = new URLSearchParams();
      formData.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN || '');
      formData.append('client_id', process.env.ZOHO_CLIENT_ID || '');
      formData.append('client_secret', process.env.ZOHO_CLIENT_SECRET || '');
      formData.append('grant_type', 'refresh_token');
      
      const response = await axios.post<TokenResponse>('https://accounts.zoho.com/oauth/v2/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      console.log(`Token refreshed successfully. Expires in ${Math.round(response.data.expires_in / 60)} minutes`);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error);
      throw new Error('Failed to authenticate with Zoho');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(`https://www.zohoapis.com/books/v3/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          organization_id: process.env.ZOHO_ORGANIZATION_ID,
        },
      });

      return response.data;
    } catch (error: any) {
      // If we get a 401, try refreshing the token once
      if (error.response?.status === 401) {
        console.log('Token expired, refreshing...');
        this.accessToken = null;
        this.tokenExpiry = 0;
        
        const newToken = await this.getAccessToken();
        
        // Retry the request with the new token
        const retryResponse = await axios.get(`https://www.zohoapis.com/books/v3/${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            organization_id: process.env.ZOHO_ORGANIZATION_ID,
          },
        });
        
        return retryResponse.data;
      }
      
      console.error(`Error making Zoho request to ${endpoint}:`, error);
      throw new Error(`Failed to fetch data from Zoho: ${endpoint}`);
    }
  }

  async getProjects(): Promise<ZohoProject[]> {
    try {
      let allProjects: ZohoProject[] = [];
      let page = 1;
      const perPage = 200;
      
      while (true) {
        const data = await this.makeRequest(`projects?page=${page}&per_page=${perPage}`);
        
        const projects = data.projects?.map((project: any) => {
          // Log the first project to see available fields
          if (page === 1 && allProjects.length === 0) {
            console.log('Sample Zoho project data:', JSON.stringify(project, null, 2));
          }
          
          return {
            project_id: project.project_id,
            project_name: project.project_name || project.name || '',
            description: project.description || '',
            status: project.status || 'active',
            start_date: project.start_date || '',
            end_date: project.end_date || '',
            budget_amount: project.budget_amount || 0,
            rate_per_hour: project.rate_per_hour || 0,
            customer_id: project.customer_id || '',
            customer_name: project.customer_name || '',
            signed_fee: undefined, // Remove Zoho signed fee, only use user-entered data
          };
        }) || [];
        
        allProjects = allProjects.concat(projects);
        
        // Check if we've reached the end
        if (projects.length < perPage) {
          break;
        }
        
        page++;
      }
      
      console.log(`Fetched ${allProjects.length} projects from Zoho`);
      return allProjects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  async getProjectsWithRevenueBudget(): Promise<ZohoProject[]> {
    try {
      console.log('Fetching projects with revenue budget data...');
      const projects = await this.getProjects();
      
      // Log projects that have revenue_budget data
      const projectsWithRevenueBudget = projects.filter(project => {
        const hasRevenueBudget = project.signed_fee && project.signed_fee > 0;
        if (hasRevenueBudget) {
          console.log(`Project ${project.project_name} has revenue budget: $${project.signed_fee}`);
        }
        return hasRevenueBudget;
      });
      
      console.log(`Found ${projectsWithRevenueBudget.length} projects with revenue budget data`);
      return projects;
    } catch (error) {
      console.error('Error fetching projects with revenue budget:', error);
      return [];
    }
  }

  async debugProjectFields(): Promise<void> {
    try {
      console.log('Debugging Zoho project fields...');
      const data = await this.makeRequest('projects?page=1&per_page=5');
      
      if (data.projects && data.projects.length > 0) {
        console.log('Available fields in Zoho project response:');
        const sampleProject = data.projects[0];
        Object.keys(sampleProject).forEach(key => {
          console.log(`  ${key}: ${sampleProject[key]} (${typeof sampleProject[key]})`);
        });
        
        // Check specifically for revenue_budget
        if (sampleProject.revenue_budget !== undefined) {
          console.log(`✅ Found revenue_budget field: ${sampleProject.revenue_budget}`);
        } else {
          console.log('❌ revenue_budget field not found in Zoho response');
          console.log('Available budget-related fields:');
          Object.keys(sampleProject).forEach(key => {
            if (key.toLowerCase().includes('budget') || key.toLowerCase().includes('revenue')) {
              console.log(`  ${key}: ${sampleProject[key]}`);
            }
          });
        }
      } else {
        console.log('No projects found in Zoho response');
      }
    } catch (error) {
      console.error('Error debugging project fields:', error);
    }
  }

  async getProjectsWithEstimates(): Promise<ZohoProject[]> {
    try {
      const projects = await this.getProjects();
      
      // For the first few projects, try to get estimates to see if that contains the signed fee
      const projectsWithEstimates = await Promise.all(
        projects.slice(0, 5).map(async (project) => {
          try {
            const estimates = await this.getProjectEstimates(project.project_id);
            const totalEstimateAmount = estimates.reduce((sum, estimate) => sum + (estimate.total || 0), 0);
            
            console.log(`Project ${project.project_name} estimates:`, estimates.length, 'total amount:', totalEstimateAmount);
            
            return {
              ...project,
              signed_fee: project.signed_fee || totalEstimateAmount || 0,
            };
          } catch (error) {
            console.error(`Error fetching estimates for project ${project.project_id}:`, error);
            return project;
          }
        })
      );
      
      // Return all projects, with the first 5 having updated signed fees from estimates
      return [
        ...projectsWithEstimates,
        ...projects.slice(5)
      ];
    } catch (error) {
      console.error('Error fetching projects with estimates:', error);
      return [];
    }
  }

  async getProjectsWithInvoiceTotals(): Promise<ZohoProject[]> {
    try {
      const [projects, invoices] = await Promise.all([
        this.getProjects(),
        this.getInvoices(),
      ]);
      
      // Calculate signed fee as total of all invoices for each project
      const projectsWithInvoiceTotals = projects.map(project => {
        const projectInvoices = invoices.filter(invoice => invoice.project_id === project.project_id);
        const totalInvoiceAmount = projectInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        
        console.log(`Project ${project.project_name} invoices:`, projectInvoices.length, 'total amount:', totalInvoiceAmount);
        
        return {
          ...project,
          signed_fee: project.signed_fee || totalInvoiceAmount || 0,
        };
      });
      
      return projectsWithInvoiceTotals;
    } catch (error) {
      console.error('Error fetching projects with invoice totals:', error);
      return [];
    }
  }

  async getInvoices(): Promise<ZohoInvoice[]> {
    try {
      const data = await this.makeRequest('invoices');
      return data.invoices?.map((invoice: any) => ({
        invoice_id: invoice.invoice_id,
        project_id: invoice.project_id,
        invoice_number: invoice.invoice_number,
        date: invoice.date,
        amount: invoice.total,
        status: invoice.status,
        billed_amount: invoice.billed_amount || 0,
        unbilled_amount: invoice.unbilled_amount || 0,
      })) || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async getProjectInvoices(projectId: string): Promise<ZohoInvoice[]> {
    try {
      const data = await this.makeRequest(`projects/${projectId}/invoices`);
      return data.invoices?.map((invoice: any) => ({
        invoice_id: invoice.invoice_id,
        project_id: invoice.project_id,
        invoice_number: invoice.invoice_number,
        date: invoice.date,
        amount: invoice.total,
        status: invoice.status,
        billed_amount: invoice.billed_amount || 0,
        unbilled_amount: invoice.unbilled_amount || 0,
      })) || [];
    } catch (error) {
      console.error('Error fetching project invoices:', error);
      return [];
    }
  }

  async getProjectDetails(projectId: string): Promise<any> {
    try {
      const data = await this.makeRequest(`projects/${projectId}`);
      console.log(`Project ${projectId} details:`, JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Error fetching project details:', error);
      return null;
    }
  }

  async getProjectEstimates(projectId: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`projects/${projectId}/estimates`);
      console.log(`Project ${projectId} estimates:`, JSON.stringify(data, null, 2));
      return data.estimates || [];
    } catch (error) {
      console.error('Error fetching project estimates:', error);
      return [];
    }
  }

  async getProjectContracts(projectId: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`projects/${projectId}/contracts`);
      console.log(`Project ${projectId} contracts:`, JSON.stringify(data, null, 2));
      return data.contracts || [];
    } catch (error) {
      console.error('Error fetching project contracts:', error);
      return [];
    }
  }

  // Method to manually refresh token (for testing)
  async forceRefreshToken(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.lastRefreshTime = Date.now(); // Track manual refresh time
    await this.getAccessToken();
  }

  // Get token status for debugging
  getTokenStatus(): { hasToken: boolean; expiresIn: number; isExpired: boolean } {
    const now = Date.now();
    return {
      hasToken: !!this.accessToken,
      expiresIn: this.tokenExpiry - now,
      isExpired: now >= this.tokenExpiry,
    };
  }

  // Method to get auto-refresh status
  getAutoRefreshStatus(): { isActive: boolean; nextRefreshIn: number } {
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;
    const nextRefreshIn = Math.max(0, this.AUTO_REFRESH_INTERVAL - timeSinceLastRefresh);
    
    return {
      isActive: !!this.autoRefreshTimer,
      nextRefreshIn,
    };
  }

  // Public method to start auto-refresh
  enableAutoRefresh(): void {
    this._startAutoRefresh();
  }

  // Public method to stop auto-refresh
  disableAutoRefresh(): void {
    this._stopAutoRefresh();
  }

  // Public method to get comprehensive status
  getStatus(): { 
    hasToken: boolean; 
    expiresIn: number; 
    isExpired: boolean;
    autoRefresh: { isActive: boolean; nextRefreshIn: number };
  } {
    return {
      ...this.getTokenStatus(),
      autoRefresh: this.getAutoRefreshStatus(),
    };
  }
}

export const zohoService = new ZohoService(); 

// Export the functions that are being imported in page.tsx
export const fetchProjects = async () => {
  try {
    console.log('Client: Fetching projects from API');
    const response = await fetch('/api/projects');
    const result = await response.json();
    
    if (result.success) {
      console.log('Client: Successfully fetched', result.count, 'projects');
      return result.data;
    } else {
      console.error('Client: API returned error:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Client: Error fetching projects:', error);
    throw error;
  }
};

export const fetchInvoices = async () => {
  try {
    console.log('Client: Fetching invoices from API');
    const response = await fetch('/api/invoices');
    const result = await response.json();
    
    if (result.success) {
      console.log('Client: Successfully fetched', result.count, 'invoices');
      return result.data;
    } else {
      console.error('Client: API returned error:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Client: Error fetching invoices:', error);
    throw error;
  }
}; 