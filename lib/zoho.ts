import axios from 'axios';
import pLimit from 'p-limit';

// Type guard for errors with response property
const hasResponse = (err: unknown): err is { response: { status?: number; statusText?: string; data?: any; headers?: any } } => {
  return typeof err === 'object' && err !== null && 'response' in err;
};

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
  private readonly TOKEN_REFRESH_BUFFER = 10 * 60 * 1000; // 10 minutes buffer (increased for better caching)
  private autoRefreshTimer: NodeJS.Timeout | null = null;
  private readonly AUTO_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes
  private lastRefreshTime: number = 0; // Track when auto-refresh was last triggered
  private readonly ACCOUNTS_BASE = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
  private readonly API_BASE = process.env.ZOHO_API_BASE || 'https://www.zohoapis.com';
  private organizationValidated: boolean = false;
  
  // Rate limiting properties
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly MAX_REQUESTS_PER_MINUTE = 80; // Conservative limit (Zoho allows 100, we use 80)
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests (reduced for better performance)
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 5; // Increased from 3 to 5
  private readonly BASE_DELAY = 5000; // Increased from 2000 to 5000ms base delay for exponential backoff
  private cachedAccessToken: string | null = null; // Fallback cached token
  
  // p-limit rate limiter for concurrent API calls
  private readonly rateLimiter = pLimit(50); // Limit to 50 concurrent calls

  constructor() {
    // Start automatic token refresh
    this._startAutoRefresh();
    console.log(`Zoho API base: ${this.API_BASE} | Accounts base: ${this.ACCOUNTS_BASE}`);
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
    try {
      const now = Date.now();
      const timeUntilExpiry = this.tokenExpiry - now;
      
      // Check if we have a valid token with sufficient buffer time
      if (this.accessToken && timeUntilExpiry > this.TOKEN_REFRESH_BUFFER && process.env.ZOHO_FORCE_REFRESH !== 'true') {
        const minutesLeft = Math.round(timeUntilExpiry / 60000);
        console.log(`🔐 Using cached token (expires in ${minutesLeft} minutes)`);
        return this.accessToken;
      }
      
      // Log token status for debugging
      if (this.accessToken && timeUntilExpiry > 0) {
        const minutesLeft = Math.round(timeUntilExpiry / 60000);
        console.log(`⚠️ Token expires soon (${minutesLeft} minutes), refreshing proactively`);
      } else if (this.accessToken) {
        console.log('🔄 Token expired, refreshing...');
      } else {
        console.log('🆕 No token available, obtaining new one...');
      }

      console.log('Token expired or missing, refreshing...');
      
      // Clear any existing token
      this.accessToken = null;
      this.tokenExpiry = 0;

      if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
        const missingVars = [];
        if (!process.env.ZOHO_CLIENT_ID) missingVars.push('ZOHO_CLIENT_ID');
        if (!process.env.ZOHO_CLIENT_SECRET) missingVars.push('ZOHO_CLIENT_SECRET');
        if (!process.env.ZOHO_REFRESH_TOKEN) missingVars.push('ZOHO_REFRESH_TOKEN');
        
        throw new Error(`Missing required Zoho environment variables: ${missingVars.join(', ')}`);
      }
      // Ensure only one refresh happens at a time across concurrent requests
      if (!this.refreshPromise) {
        this.refreshPromise = this._performTokenRefreshWithBackoff();
      }

      const token = await this.refreshPromise;
      // Clear the in-flight promise after completion
      this.refreshPromise = null;
      return token;
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error);
      
      // Log specific error details for debugging
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: hasResponse(error) ? error.response?.status : undefined,
          statusText: hasResponse(error) ? error.response?.statusText : undefined,
          data: hasResponse(error) ? error.response?.data : undefined,
          message: error.message,
          headers: hasResponse(error) ? error.response?.headers : undefined // Log headers for rate limit info
        });
        
        // Log rate limit headers if available
        if (hasResponse(error) && error.response?.headers) {
          const rateLimitHeaders = {
            'X-Rate-Limit': error.response.headers['x-rate-limit'],
            'X-Rate-Limit-Remaining': error.response.headers['x-rate-limit-remaining'],
            'X-Rate-Limit-Reset': error.response.headers['x-rate-limit-reset'],
            'Retry-After': error.response.headers['retry-after']
          };
          console.error('Rate limit headers:', rateLimitHeaders);
        }
      }
      
      // Try to fall back to cached token if available
      if (this.cachedAccessToken) {
        console.warn('Falling back to cached access token due to refresh failure');
        return this.cachedAccessToken;
      }
      
      throw new Error(`Failed to authenticate with Zoho: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Perform the token refresh with form-encoded body and improved exponential backoff
  private async _performTokenRefreshWithBackoff(): Promise<string> {
    const maxAttempts = 5; // Increased from 3 to 5
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const formData = new URLSearchParams();
        formData.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN || '');
        formData.append('client_id', process.env.ZOHO_CLIENT_ID || '');
        formData.append('client_secret', process.env.ZOHO_CLIENT_SECRET || '');
        formData.append('grant_type', 'refresh_token');

        const response = await axios.post<TokenResponse>(`${this.ACCOUNTS_BASE}/oauth/v2/token`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        });

        if (!response.data.access_token) {
          throw new Error('No access token received from Zoho');
        }

        // Cache the successful token and expiry information
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        this.lastRefreshTime = Date.now();
        
        // Cache the successful token as fallback
        this.cachedAccessToken = response.data.access_token;

        console.log(`Token refreshed successfully. Expires in ${Math.round(response.data.expires_in / 60)} minutes`);
        console.log('Zoho token refresh response:', response.data);
        
        // Log token caching details
        console.log(`🔐 Token cached: access_token=${this.accessToken.substring(0, 10)}..., expires_in=${response.data.expires_in}s, expiry=${new Date(this.tokenExpiry).toISOString()}`);
        
        // Validate scopes on refreshed token
        try {
          const scopeInfo = await this.checkTokenScopes(this.accessToken);
          console.log('Zoho granted scopes:', scopeInfo?.scope || 'unknown');
          if (typeof scopeInfo?.scope === 'string' && !scopeInfo.scope.includes('ZohoBooks.reports.READ')) {
            console.warn('⚠️ Missing ZohoBooks.reports.READ scope. Regenerate token.');
          }
        } catch (scopeErr) {
          console.error('Zoho token scope verification failed:', (scopeErr as Error)?.message);
        }
        return this.accessToken;
      } catch (err: any) {
        // If rate-limited by Zoho during token refresh, implement exponential backoff
        const isAxios = axios.isAxiosError(err);
        const status = isAxios && hasResponse(err) ? err.response?.status : undefined;
        const description = isAxios && hasResponse(err) ? (err.response?.data as any)?.error_description : undefined;
        
        if (status === 400 && typeof description === 'string' && description.toLowerCase().includes('too many requests')) {
          // Exponential backoff: delay = base * 2^attempt
          const delayMs = this.BASE_DELAY * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 1000);
          console.warn(`Zoho token refresh rate-limited (attempt ${attempt}/${maxAttempts}). Waiting ${delayMs}ms before retry.`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        
        // For other errors, do not retry endlessly
        if (attempt === maxAttempts) {
          console.error(`Zoho token refresh failed after ${maxAttempts} attempts:`, err);
          throw new Error('Zoho token refresh rate-limited. Check daily API limits or token validity.');
        }
        throw err;
      }
    }
    throw new Error('Zoho token refresh failed after maximum retries');
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
      
      const response = await axios.post<TokenResponse>(`${this.ACCOUNTS_BASE}/oauth/v2/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Cache the successful token and expiry information
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      // Cache the successful token as fallback
      this.cachedAccessToken = response.data.access_token;

      console.log(`Token refreshed successfully. Expires in ${Math.round(response.data.expires_in / 60)} minutes`);
      console.log(`🔐 Token cached: access_token=${this.accessToken.substring(0, 10)}..., expires_in=${response.data.expires_in}s, expiry=${new Date(this.tokenExpiry).toISOString()}`);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error);
      throw new Error('Failed to authenticate with Zoho');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    // Use p-limit rate limiter to prevent 429 errors
    return this.rateLimiter(async () => {
      try {
        // Apply rate limiting
        await this.applyRateLimit();
        
        const token = await this.getAccessToken();
      
      // Log API call count for monitoring
      this.requestCount++;
      console.log(`📊 Zoho API call #${this.requestCount} to: ${endpoint}`);
      
      // Validate token before making request
      if (!token || token === 'undefined') {
        throw new Error('Invalid or missing access token');
      }

      // Validate organization before hitting reports endpoints
      if (!this.organizationValidated && endpoint.startsWith('reports/')) {
        await this.validateOrganization(token);
      }
      
      console.info(`Making Zoho API request to: ${endpoint}`);
      console.info(`Token (first 10 chars): ${token?.substring(0, 10) ?? 'N/A'}...`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await axios.get(`${this.API_BASE}/books/v3/${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: {
            organization_id: process.env.ZOHO_ORGANIZATION_ID,
          },
          timeout: 15000, // 15 second timeout
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        // Reset retry count on success
        this.retryCount = 0;
        this.requestCount++;
        this.lastRequestTime = Date.now();

        console.info(`Zoho API request successful: ${endpoint}`);
        return response.data;
      } catch (axiosError: any) {
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
          throw new Error(`Zoho API request timed out for ${endpoint}`);
        }
        
        throw axiosError;
      }
    } catch (error: any) {
      // Handle rate limiting (400 with specific error message)
      if (hasResponse(error) && error.response?.status === 400 && 
          error.response?.data?.error_description?.includes('too many requests')) {
        
        console.warn('Zoho rate limit hit, implementing exponential backoff...');
        await this.handleRateLimit();
        
        // Retry the request after backoff
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          console.info(`Retrying request after rate limit backoff (attempt ${this.retryCount})`);
          return this.makeRequest(endpoint);
        } else {
          throw new Error('Zoho API rate limit exceeded after maximum retries. Please try again later.');
        }
      }

      // Handle 429 Too Many Requests (explicit rate limit)
      if (hasResponse(error) && error.response?.status === 429) {
        console.warn('Zoho 429 rate limit hit, implementing exponential backoff...');
        await this.handleRateLimit();
        
        // Retry the request after backoff
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          console.info(`Retrying request after 429 backoff (attempt ${this.retryCount})`);
          return this.makeRequest(endpoint);
        } else {
          throw new Error('Zoho API rate limit exceeded after maximum retries. Please try again later.');
        }
      }

      // If we get a 401, try refreshing the token once
      if (hasResponse(error) && error.response?.status === 401) {
        if (hasResponse(error) && error.response?.data?.code === 57) {
          console.error('Zoho API authorization error (code 57). Likely missing required scopes such as ZohoBooks.reports.READ.');
        }
        console.info('Token expired, refreshing...');
        
        // Clear the current token and force a refresh
        this.accessToken = null;
        this.tokenExpiry = 0;
        
        try {
          const newToken = await this.forceRefreshToken();
          
          // Validate the new token
          if (!newToken || newToken === 'undefined') {
            throw new Error('Failed to obtain valid token after refresh');
          }
          
          console.info(`Retrying request with new token: ${endpoint}`);
          
          // Retry the request with the new token
          const retryResponse = await axios.get(`${this.API_BASE}/books/v3/${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
            },
            params: {
              organization_id: process.env.ZOHO_ORGANIZATION_ID,
            },
            timeout: 15000,
          });
          
          console.info('Request retry successful after token refresh');
          return retryResponse.data;
        } catch (refreshError: any) {
          console.error('Failed to refresh token or retry request:', refreshError);
          
          // Log detailed refresh error information
          if (axios.isAxiosError(refreshError)) {
            console.error('Token refresh Axios error details:', {
              status: hasResponse(refreshError) ? refreshError.response?.status : undefined,
              statusText: hasResponse(refreshError) ? refreshError.response?.statusText : undefined,
              data: hasResponse(refreshError) ? refreshError.response?.data : undefined,
              message: refreshError.message,
              endpoint: endpoint
            });
          }
          
          // Check if it's a rate limiting issue during token refresh
          if (hasResponse(refreshError) && refreshError.response?.status === 400 && 
              refreshError.response?.data?.error_description?.includes('too many requests')) {
            throw new Error(`Zoho token refresh rate limited: ${endpoint}. Please wait before retrying.`);
          }
          
          // Check if it's an authentication issue during token refresh
          if (hasResponse(refreshError) && refreshError.response?.status === 400 && 
              refreshError.response?.data?.error_description?.includes('invalid')) {
            throw new Error(`Zoho token refresh failed - invalid credentials: ${endpoint}. Check your OAuth configuration.`);
          }
          
          throw new Error(`Zoho API authentication failed after token refresh: ${endpoint}. Error: ${refreshError.message}`);
        }
      }

      // Log the error details for debugging
      console.error(`Zoho API request failed for ${endpoint}:`, {
        status: hasResponse(error) ? error.response?.status : undefined,
        statusText: hasResponse(error) ? error.response?.statusText : undefined,
        data: hasResponse(error) ? error.response?.data : undefined,
        message: error.message
      });
      if (hasResponse(error) && error.response?.data?.code === 57) {
        console.error('Zoho API authorization error (code 57). Verify organization_id and OAuth scopes (ZohoBooks.reports.READ).');
      }

      throw error;
      }
    });
  }

  // Check granted scopes for current access token
  private async checkTokenScopes(token: string): Promise<{ scope?: string } | null> {
    try {
      const url = `${this.ACCOUNTS_BASE}/oauth/v2/tokeninfo?token=${encodeURIComponent(token)}`;
      const res = await axios.get(url, { timeout: 10000 });
      return res.data as { scope?: string };
    } catch (err: any) {
      // Surface concise context but do not fail the main flow
      const msg = axios.isAxiosError(err) ? (hasResponse(err) ? err.response?.data : undefined) || err.message : String(err);
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }

  // Validate the configured organization ID by calling organizations endpoint
  private async validateOrganization(token: string): Promise<void> {
    try {
      const orgId = process.env.ZOHO_ORGANIZATION_ID;
      if (!orgId) {
        console.warn('ZOHO_ORGANIZATION_ID not set. Reports calls may fail.');
        return;
      }
      const url = `${this.API_BASE}/books/v3/organizations`;
      const res = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      const orgs = (res.data?.organizations || []) as Array<{ organization_id?: string | number }>;
      const found = orgs.some(o => String(o.organization_id) === String(orgId));
      if (!found) {
        console.error(`Provided organization_id=${orgId} not found in Zoho account. Fetched organizations: ${JSON.stringify(orgs)}`);
      } else {
        this.organizationValidated = true;
        console.log(`Validated Zoho organization_id=${orgId}`);
      }
    } catch (err: any) {
      const status = axios.isAxiosError(err) ? (hasResponse(err) ? err.response?.status : undefined) : undefined;
      const data = axios.isAxiosError(err) ? (hasResponse(err) ? err.response?.data : undefined) : undefined;
      console.error('Failed to validate Zoho organization:', { status, data, message: err.message });
      // Do not throw; allow request to proceed but logs will help diagnose
    }
  }

  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Check if we need to wait between requests
    if (this.lastRequestTime > 0) {
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.info(`Rate limiting: waiting ${waitTime}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Check if we've exceeded the per-minute limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const timeSinceFirstRequest = now - this.lastRequestTime;
      if (timeSinceFirstRequest < 60000) { // Less than 1 minute
        const waitTime = 60000 - timeSinceFirstRequest;
        console.warn(`Rate limiting: exceeded ${this.MAX_REQUESTS_PER_MINUTE} requests per minute, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
      } else {
        // Reset counter if more than 1 minute has passed
        this.requestCount = 0;
      }
    }
  }

  private async handleRateLimit(): Promise<void> {
    const delay = this.BASE_DELAY * Math.pow(2, this.retryCount);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const totalDelay = delay + jitter;
    
    console.warn(`Rate limit backoff: waiting ${totalDelay}ms before retry (attempt ${this.retryCount + 1})`);
    await new Promise(resolve => setTimeout(resolve, totalDelay));
    
    // Reset request counters to allow fresh start
    this.requestCount = 0;
    this.lastRequestTime = 0;
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
      console.log('📄 Fetching invoices from Zoho...');
      
      // Fetch ALL invoices with pagination
      let allInvoices: any[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const data = await this.makeRequest(`invoices?page=${page}&per_page=200`);
        const invoices = data.invoices || [];
        allInvoices = allInvoices.concat(invoices);
        
        hasMore = data.page_context?.has_more_page || false;
        page++;
        
        console.log(`📄 Fetched page ${page - 1}: ${invoices.length} invoices (total so far: ${allInvoices.length})`);
        
        if (!hasMore || invoices.length === 0) {
          break;
        }
      }
      
      console.log(`✅ Total invoices fetched: ${allInvoices.length}`);
      
      const processedInvoices = allInvoices.map((invoice: any) => {
        const total = invoice.total || 0;
        const status = invoice.status || 'unknown';
        const date = invoice.date || '';
        
        // Calculate billed/unbilled amounts based on status
        let billed_amount = 0;
        let unbilled_amount = 0;
        
        if (status === 'paid') {
          billed_amount = total;
          unbilled_amount = 0;
        } else if (status === 'sent' || status === 'viewed' || status === 'draft') {
          billed_amount = 0;
          unbilled_amount = total;
        } else {
          // For other statuses, assume it's unbilled
          billed_amount = 0;
          unbilled_amount = total;
        }
        
        return {
          invoice_id: invoice.invoice_id,
          project_id: invoice.project_id,
          invoice_number: invoice.invoice_number,
          date: date,
          amount: total,
          status: status,
          billed_amount: billed_amount,
          unbilled_amount: unbilled_amount,
        };
      }) || [];
      
      // Log date information to verify parsing
      if (processedInvoices.length > 0) {
        console.log('📅 Sample invoice dates from Zoho:', processedInvoices.slice(0, 5).map(inv => ({
          invoice: inv.invoice_number,
          date: inv.date,
          status: inv.status,
          amount: inv.amount
        })));
      }
      
      // Log invoice counts and details
      console.log(`📊 Zoho invoices processed: ${processedInvoices.length} total invoices`);
      
      if (processedInvoices.length > 0) {
        const statusCounts = processedInvoices.reduce((acc: Record<string, number>, inv: ZohoInvoice) => {
          acc[inv.status] = (acc[inv.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('📋 Invoice status breakdown:', statusCounts);
        
        // Calculate total billed and unbilled amounts
        const totalBilled = processedInvoices.reduce((sum: number, inv: ZohoInvoice) => sum + inv.billed_amount, 0);
        const totalUnbilled = processedInvoices.reduce((sum: number, inv: ZohoInvoice) => sum + inv.unbilled_amount, 0);
        
        console.log('💰 Invoice amount breakdown:', {
          totalBilled: totalBilled,
          totalUnbilled: totalUnbilled,
          totalAmount: totalBilled + totalUnbilled
        });
        
        // Log sample invoice data for debugging
        const sampleInvoice = processedInvoices[0];
        console.log('📄 Sample invoice data:', {
          id: sampleInvoice.invoice_id,
          number: sampleInvoice.invoice_number,
          project: sampleInvoice.project_id,
          amount: sampleInvoice.amount,
          status: sampleInvoice.status,
          billed_amount: sampleInvoice.billed_amount,
          unbilled_amount: sampleInvoice.unbilled_amount
        });
      }
      
      return processedInvoices;
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

  // New method to get Profit & Loss statement
  async getProfitAndLoss(startDate: string, endDate: string): Promise<any> {
    try {
      console.info(`📊 Fetching Zoho Profit & Loss for ${startDate} to ${endDate}`);
      const data = await this.makeRequest(`reports/profitandloss?from_date=${startDate}&to_date=${endDate}`);
      const sizeBytes = JSON.stringify(data || {}).length;
      const keys = Object.keys(data || {}).length;
      console.info(`✅ Profit & Loss data fetched successfully (keys: ${keys}, bytes: ${sizeBytes})`);
      if (!data || keys === 0) {
        console.warn('No data for reports/profitandloss. Verify organization ID, date range (2025-01-01 to 2025-08-13), or data in Zoho dashboard.');
      }
      return data;
    } catch (error) {
      console.error('❌ Error fetching Profit & Loss:', error);
      console.warn('🎭 Profit & Loss data unavailable, will use defaults');
      return null;
    }
  }

  // New method to get Cash Flow statement
  async getCashFlow(startDate: string, endDate: string): Promise<any> {
    try {
      console.info(`💰 Fetching Zoho Cash Flow for ${startDate} to ${endDate}`);
      const data = await this.makeRequest(`reports/cashflow?from_date=${startDate}&to_date=${endDate}`);
      const sizeBytes = JSON.stringify(data || {}).length;
      const keys = Object.keys(data || {}).length;
      console.info(`✅ Cash Flow data fetched successfully (keys: ${keys}, bytes: ${sizeBytes})`);
      if (!data || keys === 0) {
        console.warn('No data for reports/cashflow. Verify organization ID, date range (2025-01-01 to 2025-08-13), or data in Zoho dashboard.');
      }
      return data;
    } catch (error) {
      console.error('❌ Error fetching Cash Flow:', error);
      console.warn('🎭 Cash Flow data unavailable, will use defaults');
      return null;
    }
  }

  // New method to get Balance Sheet
  async getBalanceSheet(date: string): Promise<any> {
    try {
      console.info(`📈 Fetching Zoho Balance Sheet for ${date}`);
      const data = await this.makeRequest(`reports/balancesheet?date=${date}`);
      const sizeBytes = JSON.stringify(data || {}).length;
      const keys = Object.keys(data || {}).length;
      console.info(`✅ Balance Sheet data fetched successfully (keys: ${keys}, bytes: ${sizeBytes})`);
      if (!data || keys === 0) {
        console.warn('No data for reports/balancesheet. Verify organization ID, date range (2025-01-01 to 2025-08-13), or data in Zoho dashboard.');
      }
      return data;
    } catch (error) {
      console.error('❌ Error fetching Balance Sheet:', error);
      console.warn('🎭 Balance Sheet data unavailable, will use defaults');
      return null;
    }
  }

  // New method to get Chart of Accounts
  async getChartOfAccounts(): Promise<any[]> {
    try {
      const data = await this.makeRequest('chartofaccounts');
      console.log('Chart of Accounts data:', JSON.stringify(data, null, 2));
      return data.chartofaccounts || [];
    } catch (error) {
      console.error('Error fetching Chart of Accounts:', error);
      return [];
    }
  }

  // New method to get Journal Entries for a date range
  async getJournalEntries(startDate: string, endDate: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`journalentries?from_date=${startDate}&to_date=${endDate}`);
      console.log('Journal Entries data:', JSON.stringify(data, null, 2));
      return data.journalentries || [];
    } catch (error) {
      console.error('Error fetching Journal Entries:', error);
      return [];
    }
  }

  // New method to get comprehensive financial metrics
  async getFinancialMetrics(startDate: string, endDate: string): Promise<{
    revenue: number;
    expenses: number;
    grossProfit: number;
    netProfit: number;
    operatingIncome: number;
    cashFlow: number;
    accountsReceivable: number;
    accountsPayable: number;
    cashBalance: number;
  }> {
    try {
      console.info(`💰 Fetching Zoho financial metrics for ${startDate} to ${endDate}`);
      
      const [plData, cfData, bsData] = await Promise.allSettled([
        this.getProfitAndLoss(startDate, endDate),
        this.getCashFlow(startDate, endDate),
        this.getBalanceSheet(endDate)
      ]);

      // Log raw response status and body length for each report
      console.info('📊 Financial reports raw response details:', {
        profitLoss: {
          status: plData.status,
          bodyLength: plData.status === 'fulfilled' ? JSON.stringify(plData.value || {}).length : 'N/A',
          hasData: plData.status === 'fulfilled' && plData.value && Object.keys(plData.value || {}).length > 0
        },
        cashFlow: {
          status: cfData.status,
          bodyLength: cfData.status === 'fulfilled' ? JSON.stringify(cfData.value || {}).length : 'N/A',
          hasData: cfData.status === 'fulfilled' && cfData.value && Object.keys(cfData.value || {}).length > 0
        },
        balanceSheet: {
          status: bsData.status,
          bodyLength: bsData.status === 'fulfilled' ? JSON.stringify(bsData.value || {}).length : 'N/A',
          hasData: bsData.status === 'fulfilled' && bsData.value && Object.keys(bsData.value || {}).length > 0
        }
      });

      // Check for 404 errors and log specific warnings
      if (plData.status === 'rejected') {
        const error = plData.reason as any;
        if (hasResponse(error) && error.response?.status === 404) {
          console.warn('⚠️ Profit & Loss returned 404 - Invalid endpoint - check Zoho API docs');
        } else {
          console.warn('⚠️ Profit & Loss data failed:', plData.reason);
        }
      }
      if (cfData.status === 'rejected') {
        const error = cfData.reason as any;
        if (hasResponse(error) && error.response?.status === 404) {
          console.warn('⚠️ Cash Flow returned 404 - Invalid endpoint - check Zoho API docs');
        } else {
          console.warn('⚠️ Cash Flow data failed:', cfData.reason);
        }
      }
      if (bsData.status === 'rejected') {
        const error = bsData.reason as any;
        if (hasResponse(error) && error.response?.status === 404) {
          console.warn('⚠️ Balance Sheet returned 404 - Invalid endpoint - check Zoho API docs');
        } else {
          console.warn('⚠️ Balance Sheet data failed:', bsData.reason);
        }
      }

      // Extract financial metrics from the responses with fallbacks
      // Zoho P&L structure may vary, so we'll try multiple possible paths
      let revenue = 0;
      let expenses = 0;
      let operatingExpenses = 0;
      
      if (plData.status === 'fulfilled' && plData.value) {
        const plDataValue = plData.value;
        
        // Try different possible structures for revenue
        revenue = plDataValue.revenue?.total || 
                 plDataValue.revenue || 
                 plDataValue.income?.total || 
                 plDataValue.income || 
                 plDataValue.sales?.total || 
                 plDataValue.sales || 0;
        
        // Try different possible structures for expenses
        expenses = plDataValue.expenses?.total || 
                  plDataValue.expenses || 
                  plDataValue.cost_of_goods_sold?.total || 
                  plDataValue.cost_of_goods_sold || 0;
        
        // Try different possible structures for operating expenses
        operatingExpenses = plDataValue.operating_expenses?.total || 
                           plDataValue.operating_expenses || 
                           plDataValue.admin_expenses?.total || 
                           plDataValue.admin_expenses || 0;
        
        console.log('📊 P&L data structure analysis:', {
          hasRevenue: !!plDataValue.revenue,
          hasExpenses: !!plDataValue.expenses,
          hasOperatingExpenses: !!plDataValue.operating_expenses,
          revenueValue: revenue,
          expensesValue: expenses,
          operatingExpensesValue: operatingExpenses,
          allKeys: Object.keys(plDataValue)
        });
      }
      
      const grossProfit = revenue - expenses;
      const netProfit = grossProfit - operatingExpenses;
      const operatingIncome = grossProfit - operatingExpenses;
      
      // Extract cash flow data
      const cashFlow = cfData.status === 'fulfilled' ? (cfData.value?.net_cash_flow || 0) : 0;
      const accountsReceivable = bsData.status === 'fulfilled' ? (bsData.value?.current_assets?.accounts_receivable || 0) : 0;
      const accountsPayable = bsData.status === 'fulfilled' ? (bsData.value?.current_liabilities?.accounts_payable || 0) : 0;
      const cashBalance = bsData.status === 'fulfilled' ? (bsData.value?.current_assets?.cash_and_bank || 0) : 0;

      // Log which data sources succeeded/failed
      console.info('📊 Financial metrics data sources:', {
        profitLoss: plData.status === 'fulfilled' ? '✅' : '❌',
        cashFlow: cfData.status === 'fulfilled' ? '✅' : '❌',
        balanceSheet: bsData.status === 'fulfilled' ? '✅' : '❌'
      });

      return {
        revenue,
        expenses,
        grossProfit,
        netProfit,
        operatingIncome,
        cashFlow,
        accountsReceivable,
        accountsPayable,
        cashBalance
      };
    } catch (error) {
      console.error('❌ Error fetching financial metrics:', error);
      console.warn('🎭 Returning default financial metrics due to API failure');
      
      // Return default values if API calls fail
      return {
        revenue: 0,
        expenses: 0,
        grossProfit: 0,
        netProfit: 0,
        operatingIncome: 0,
        cashFlow: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
        cashBalance: 0
      };
    }
  }

  // Method to manually refresh token (for testing)
  async forceRefreshToken(): Promise<string> {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.lastRefreshTime = Date.now(); // Track manual refresh time
    return await this.getAccessToken();
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