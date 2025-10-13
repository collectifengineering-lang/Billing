import axios from 'axios';
import pLimit from 'p-limit';
import { PrismaClient } from '@prisma/client';
import { PerformanceTelemetry, withTelemetry } from './telemetry';

// Singleton pattern for Prisma Client (prevents multiple instances in development)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Type guard for errors with response property
const hasResponse = (err: unknown): err is { response: { status?: number; statusText?: string; data?: any; headers?: any } } => {
  return typeof err === 'object' && err !== null && 'response' in err;
};

export interface ZohoProject {
  project_id: string;
  project_name: string;
  description?: string;
  status: string;
  start_date: string;
  end_date?: string;
  budget_amount?: number;
  rate_per_hour?: number;
  customer_id: string;
  customer_name: string;
  signed_fee?: number;
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

interface FinancialMetrics {
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  operatingIncome: number;
  cashFlow: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
}

class OptimizedZohoService {
  private readonly ACCOUNTS_BASE = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
  private readonly API_BASE = process.env.ZOHO_API_BASE || 'https://www.zohoapis.com';
  private organizationValidated: boolean = false;
  
  // Rate limiting properties with improved configuration
  private requestCount: number = 0;
  private windowStartTime: number = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 80; // Conservative limit (Zoho allows 100)
  private readonly MIN_REQUEST_INTERVAL = 750; // 750ms between requests (allows ~80 req/min)
  private readonly MAX_RETRIES = 5;
  private readonly BASE_RETRY_DELAY = 2000; // 2 seconds base delay
  
  // Concurrency limiter
  private readonly rateLimiter = pLimit(10); // Limit to 10 concurrent calls (more conservative)

  // Cache TTLs
  private readonly TOKEN_CACHE_BUFFER = 5 * 60 * 1000; // 5 minutes buffer before expiry
  private readonly FINANCIAL_DATA_CACHE_TTL = 60 * 60 * 1000; // 1 hour cache for financial data
  private readonly PROJECTS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache for projects
  private readonly INVOICES_CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache for invoices

  constructor() {
    console.log(`✨ Optimized Zoho Service initialized | API: ${this.API_BASE} | Accounts: ${this.ACCOUNTS_BASE}`);
  }

  /**
   * Get access token from Supabase cache or refresh if needed
   */
  private async getAccessToken(): Promise<string> {
    const telemetry = new PerformanceTelemetry('zoho.getAccessToken');

    try {
      const now = new Date();
      
      // Try to get cached token from Supabase
      const cachedToken = await prisma.zoho_token_cache.findFirst({
        where: {
          expiresAt: { gt: new Date(now.getTime() + this.TOKEN_CACHE_BUFFER) },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (cachedToken && !process.env.ZOHO_FORCE_REFRESH) {
        const minutesLeft = Math.round((cachedToken.expiresAt.getTime() - now.getTime()) / 60000);
        console.log(`🔐 Using cached Zoho token from Supabase (expires in ${minutesLeft} minutes)`);
        await telemetry.recordSuccess({ source: 'cache', minutesLeft });
        return cachedToken.accessToken;
      }

      // Token expired or missing, refresh it
      console.log('🔄 Refreshing Zoho token...');
      const newToken = await this.refreshAccessToken(telemetry);
      await telemetry.recordSuccess({ source: 'refresh' });
      return newToken;
    } catch (error) {
      await telemetry.recordFailure(error as Error);
      throw error;
    }
  }

  /**
   * Refresh access token with exponential backoff and store in Supabase
   */
  private async refreshAccessToken(telemetry: PerformanceTelemetry): Promise<string> {
    if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
      const missingVars = [];
      if (!process.env.ZOHO_CLIENT_ID) missingVars.push('ZOHO_CLIENT_ID');
      if (!process.env.ZOHO_CLIENT_SECRET) missingVars.push('ZOHO_CLIENT_SECRET');
      if (!process.env.ZOHO_REFRESH_TOKEN) missingVars.push('ZOHO_REFRESH_TOKEN');
      throw new Error(`Missing required Zoho environment variables: ${missingVars.join(', ')}`);
    }

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const formData = new URLSearchParams();
        formData.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN);
        formData.append('client_id', process.env.ZOHO_CLIENT_ID);
        formData.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
        formData.append('grant_type', 'refresh_token');

        const response = await axios.post<TokenResponse>(
          `${this.ACCOUNTS_BASE}/oauth/v2/token`,
          formData,
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
          }
        );

        if (!response.data.access_token) {
          throw new Error('No access token received from Zoho');
        }

        // Calculate expiry time (Zoho tokens last ~1 hour = 3600 seconds)
        const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

        // Store token in Supabase for persistence across function invocations
        await prisma.zoho_token_cache.create({
          data: {
            accessToken: response.data.access_token,
            expiresAt,
            refreshToken: response.data.refresh_token,
            apiDomain: response.data.api_domain,
          },
        });

        // Clean up old tokens (keep only last 5)
        const oldTokens = await prisma.zoho_token_cache.findMany({
          orderBy: { createdAt: 'desc' },
          skip: 5,
        });
        if (oldTokens.length > 0) {
          await prisma.zoho_token_cache.deleteMany({
            where: { id: { in: oldTokens.map((t) => t.id) } },
          });
        }

        const minutesValid = Math.round(response.data.expires_in / 60);
        console.log(`✅ Token refreshed and cached in Supabase (valid for ${minutesValid} minutes)`);

        return response.data.access_token;
      } catch (err: any) {
        const isRateLimited = this.isRateLimitError(err);
        
        if (isRateLimited && attempt < this.MAX_RETRIES) {
          const retryAfter = this.getRetryAfter(err);
          const backoffDelay = retryAfter || this.calculateExponentialBackoff(attempt);
          
          console.warn(`⏳ Zoho token refresh rate-limited (attempt ${attempt}/${this.MAX_RETRIES}). Waiting ${backoffDelay}ms...`);
          telemetry.recordRateLimitHit(backoffDelay);
          
          await this.delay(backoffDelay);
          continue;
        }

        if (attempt === this.MAX_RETRIES) {
          throw new Error(`Zoho token refresh failed after ${this.MAX_RETRIES} attempts`);
        }

        throw err;
      }
    }

    throw new Error('Zoho token refresh failed after maximum retries');
  }

  /**
   * Make API request with rate limiting, retry logic, and telemetry
   */
  private async makeRequest(endpoint: string, telemetry?: PerformanceTelemetry): Promise<any> {
    return this.rateLimiter(async () => {
      const ownTelemetry = telemetry || new PerformanceTelemetry(`zoho.${endpoint.split('?')[0]}`);
      
      try {
        await this.applyRateLimit();
        
        const token = await this.getAccessToken();
        
        if (!token || token === 'undefined') {
          throw new Error('Invalid or missing access token');
        }

        // Validate organization for reports endpoints
        if (!this.organizationValidated && endpoint.startsWith('reports/')) {
          await this.validateOrganization(token);
        }

        console.info(`📡 Zoho API: ${endpoint}`);

        const response = await axios.get(`${this.API_BASE}/books/v3/${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: {
            organization_id: process.env.ZOHO_ORGANIZATION_ID,
          },
          timeout: 15000,
        });

        this.requestCount++;
        
        if (!telemetry) {
          await ownTelemetry.recordSuccess({ endpoint });
        }

        return response.data;
      } catch (error: any) {
        if (!telemetry) {
          await ownTelemetry.recordFailure(error, { endpoint });
        }

        // Handle rate limiting
        if (this.isRateLimitError(error)) {
          return await this.handleRateLimitAndRetry(endpoint, error, ownTelemetry, 1);
        }

        // Handle token expiry
        if (hasResponse(error) && error.response?.status === 401) {
          return await this.handleTokenExpiryAndRetry(endpoint, ownTelemetry);
        }

        console.error(`❌ Zoho API error for ${endpoint}:`, {
          status: hasResponse(error) ? error.response?.status : undefined,
          message: error.message,
        });

        throw error;
      }
    });
  }

  /**
   * Handle rate limiting with exponential backoff and retry
   */
  private async handleRateLimitAndRetry(
    endpoint: string,
    error: any,
    telemetry: PerformanceTelemetry,
    attempt: number
  ): Promise<any> {
    if (attempt >= this.MAX_RETRIES) {
      throw new Error(`Zoho API rate limit exceeded after ${this.MAX_RETRIES} retries`);
    }

    const retryAfter = this.getRetryAfter(error);
    const backoffDelay = retryAfter || this.calculateExponentialBackoff(attempt);
    
    console.warn(`⏳ Rate limit hit for ${endpoint} (attempt ${attempt}/${this.MAX_RETRIES}). Waiting ${backoffDelay}ms...`);
    telemetry.recordRateLimitHit(backoffDelay);
    
    await this.delay(backoffDelay);
    
    // Reset rate limiter state
    this.requestCount = 0;
    this.windowStartTime = Date.now();
    
    // Retry the request
    try {
      await this.applyRateLimit();
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.API_BASE}/books/v3/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          organization_id: process.env.ZOHO_ORGANIZATION_ID,
        },
        timeout: 15000,
      });

      console.info(`✅ Retry successful for ${endpoint} after rate limit`);
      return response.data;
    } catch (retryError: any) {
      if (this.isRateLimitError(retryError)) {
        return await this.handleRateLimitAndRetry(endpoint, retryError, telemetry, attempt + 1);
      }
      throw retryError;
    }
  }

  /**
   * Handle token expiry and retry with fresh token
   */
  private async handleTokenExpiryAndRetry(endpoint: string, telemetry: PerformanceTelemetry): Promise<any> {
    console.info('🔄 Token expired, refreshing and retrying...');
    
    // Force token refresh
    const newToken = await this.refreshAccessToken(telemetry);
    
    const response = await axios.get(`${this.API_BASE}/books/v3/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        organization_id: process.env.ZOHO_ORGANIZATION_ID,
      },
      timeout: 15000,
    });

    console.info('✅ Retry successful after token refresh');
    return response.data;
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(err: any): boolean {
    if (!hasResponse(err)) return false;
    
    const status = err.response?.status;
    const errorDesc = err.response?.data?.error_description?.toLowerCase() || '';
    
    return status === 429 || (status === 400 && errorDesc.includes('too many requests'));
  }

  /**
   * Get Retry-After header value in milliseconds
   */
  private getRetryAfter(err: any): number | null {
    if (!hasResponse(err)) return null;
    
    const retryAfter = err.response?.headers?.[' retry-after'] || err.response?.headers?.['retry-after'];
    
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    
    return null;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateExponentialBackoff(attempt: number): number {
    const exponentialDelay = this.BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 60000); // Cap at 60 seconds
  }

  /**
   * Apply rate limiting to prevent hitting Zoho's limits
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const windowElapsed = now - this.windowStartTime;
    
    // Reset window if 1 minute has passed
    if (windowElapsed >= 60000) {
      this.requestCount = 0;
      this.windowStartTime = now;
      return;
    }
    
    // Check if we've hit the rate limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - windowElapsed;
      console.warn(`⏳ Rate limit reached (${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE} requests). Waiting ${waitTime}ms...`);
      await this.delay(waitTime);
      this.requestCount = 0;
      this.windowStartTime = Date.now();
      return;
    }
    
    // Add minimum interval between requests
    await this.delay(this.MIN_REQUEST_INTERVAL);
  }

  /**
   * Validate organization ID
   */
  private async validateOrganization(token: string): Promise<void> {
    const orgId = process.env.ZOHO_ORGANIZATION_ID;
    if (!orgId) {
      console.warn('⚠️ ZOHO_ORGANIZATION_ID not set');
      return;
    }

    try {
      const response = await axios.get(`${this.API_BASE}/books/v3/organizations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const orgs = (response.data?.organizations || []) as Array<{ organization_id?: string | number }>;
      const found = orgs.some((o) => String(o.organization_id) === String(orgId));

      if (!found) {
        console.error(`❌ Organization ID ${orgId} not found in Zoho account`);
      } else {
        this.organizationValidated = true;
        console.log(`✅ Validated organization ID: ${orgId}`);
      }
    } catch (error) {
      console.error('❌ Failed to validate organization:', error);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get cached data or fetch fresh data
   */
  private async getCachedData<T>(
    cacheKey: string,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    try {
      // Check cache
      const cached = await prisma.financial_data_cache.findUnique({
        where: { cacheKey },
      });

      if (cached && cached.expiresAt > new Date()) {
        const minutesLeft = Math.round((cached.expiresAt.getTime() - Date.now()) / 60000);
        console.log(`💾 Using cached data for ${cacheKey} (expires in ${minutesLeft} minutes)`);
        return JSON.parse(cached.data) as T;
      }

      // Fetch fresh data
      console.log(`🔄 Cache miss for ${cacheKey}, fetching fresh data...`);
      const data = await fetchFn();

      // Store in cache
      const expiresAt = new Date(Date.now() + ttl);
      await prisma.financial_data_cache.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          data: JSON.stringify(data),
          expiresAt,
        },
        update: {
          data: JSON.stringify(data),
          expiresAt,
        },
      });

      console.log(`✅ Data cached for ${cacheKey} (TTL: ${ttl / 1000}s)`);
      return data;
    } catch (error) {
      console.error(`❌ Cache error for ${cacheKey}, falling back to fresh data:`, error);
      return await fetchFn();
    }
  }

  /**
   * Batch fetch multiple endpoints in parallel
   */
  private async batchFetch<T>(endpoints: string[], telemetry?: PerformanceTelemetry): Promise<T[]> {
    console.log(`📦 Batch fetching ${endpoints.length} endpoints in parallel...`);
    
    const results = await Promise.all(
      endpoints.map((endpoint) => this.makeRequest(endpoint, telemetry))
    );
    
    console.log(`✅ Batch fetch completed: ${endpoints.length} endpoints`);
    return results;
  }

  /**
   * Get projects with caching
   */
  async getProjects(): Promise<ZohoProject[]> {
    return withTelemetry('zoho.getProjects', async (telemetry) => {
      return this.getCachedData(
        'projects_all',
        this.PROJECTS_CACHE_TTL,
        async () => {
          let allProjects: ZohoProject[] = [];
          let page = 1;
          const perPage = 200;

          while (true) {
            const data = await this.makeRequest(`projects?page=${page}&per_page=${perPage}`, telemetry);
            
            const projects = data.projects?.map((project: any) => ({
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
              signed_fee: undefined,
            })) || [];

            allProjects = allProjects.concat(projects);

            if (projects.length < perPage) break;
            page++;
          }

          console.log(`✅ Fetched ${allProjects.length} projects from Zoho`);
          return allProjects;
        }
      );
    });
  }

  /**
   * Get invoices with caching
   */
  async getInvoices(): Promise<ZohoInvoice[]> {
    return withTelemetry('zoho.getInvoices', async (telemetry) => {
      return this.getCachedData(
        'invoices_all',
        this.INVOICES_CACHE_TTL,
        async () => {
          let allInvoices: any[] = [];
          let page = 1;

          while (true) {
            const data = await this.makeRequest(`invoices?page=${page}&per_page=200`, telemetry);
            const invoices = data.invoices || [];
            allInvoices = allInvoices.concat(invoices);

            const hasMore = data.page_context?.has_more_page || false;
            if (!hasMore || invoices.length === 0) break;
            page++;
          }

          const processedInvoices = allInvoices.map((invoice: any) => {
            const total = invoice.total || 0;
            const status = invoice.status || 'unknown';
            
            let billed_amount = 0;
            let unbilled_amount = 0;
            
            if (status === 'paid') {
              billed_amount = total;
            } else if (['sent', 'viewed', 'draft'].includes(status)) {
              unbilled_amount = total;
            } else {
              unbilled_amount = total;
            }

            return {
              invoice_id: invoice.invoice_id,
              project_id: invoice.project_id,
              invoice_number: invoice.invoice_number,
              date: invoice.date,
              amount: total,
              status,
              billed_amount,
              unbilled_amount,
            };
          });

          console.log(`✅ Fetched ${processedInvoices.length} invoices from Zoho`);
          return processedInvoices;
        }
      );
    });
  }

  /**
   * Get financial metrics with caching and parallel fetching
   */
  async getFinancialMetrics(startDate: string, endDate: string): Promise<FinancialMetrics> {
    return withTelemetry('zoho.getFinancialMetrics', async (telemetry) => {
      const cacheKey = `financial_metrics_${startDate}_${endDate}`;
      
      return this.getCachedData(
        cacheKey,
        this.FINANCIAL_DATA_CACHE_TTL,
        async () => {
          console.info(`💰 Fetching Zoho financial metrics for ${startDate} to ${endDate}`);

          // Fetch all three reports in parallel
          const [plData, cfData, bsData] = await Promise.allSettled([
            this.makeRequest(`reports/profitandloss?from_date=${startDate}&to_date=${endDate}`, telemetry),
            this.makeRequest(`reports/cashflow?from_date=${startDate}&to_date=${endDate}`, telemetry),
            this.makeRequest(`reports/balancesheet?date=${endDate}`, telemetry),
          ]);

          // Extract metrics from responses
          let revenue = 0;
          let expenses = 0;
          let operatingExpenses = 0;

          if (plData.status === 'fulfilled' && plData.value) {
            const plDataValue = plData.value;
            revenue = plDataValue.revenue?.total || plDataValue.revenue || plDataValue.income?.total || plDataValue.income || 0;
            expenses = plDataValue.expenses?.total || plDataValue.expenses || plDataValue.cost_of_goods_sold?.total || 0;
            operatingExpenses = plDataValue.operating_expenses?.total || plDataValue.operating_expenses || 0;
          }

          const grossProfit = revenue - expenses;
          const netProfit = grossProfit - operatingExpenses;
          const operatingIncome = grossProfit - operatingExpenses;
          
          const cashFlow = cfData.status === 'fulfilled' ? (cfData.value?.net_cash_flow || 0) : 0;
          const accountsReceivable = bsData.status === 'fulfilled' ? (bsData.value?.current_assets?.accounts_receivable || 0) : 0;
          const accountsPayable = bsData.status === 'fulfilled' ? (bsData.value?.current_liabilities?.accounts_payable || 0) : 0;
          const cashBalance = bsData.status === 'fulfilled' ? (bsData.value?.current_assets?.cash_and_bank || 0) : 0;

          const metrics = {
            revenue,
            expenses,
            grossProfit,
            netProfit,
            operatingIncome,
            cashFlow,
            accountsReceivable,
            accountsPayable,
            cashBalance,
          };

          console.info('✅ Financial metrics fetched:', metrics);
          return metrics;
        }
      );
    });
  }

  /**
   * Get comprehensive financial data - optimized with parallel fetching
   */
  async getComprehensiveFinancialData(dateRanges: Array<{ startDate: string; endDate: string }>): Promise<FinancialMetrics[]> {
    console.log(`🚀 Fetching comprehensive financial data for ${dateRanges.length} date ranges...`);
    
    // Fetch all date ranges in parallel
    const results = await Promise.all(
      dateRanges.map((range) => this.getFinancialMetrics(range.startDate, range.endDate))
    );
    
    console.log(`✅ Comprehensive financial data fetched for ${dateRanges.length} date ranges`);
    return results;
  }

  /**
   * Force refresh token (for testing)
   */
  async forceRefreshToken(): Promise<string> {
    const telemetry = new PerformanceTelemetry('zoho.forceRefreshToken');
    try {
      const token = await this.refreshAccessToken(telemetry);
      await telemetry.recordSuccess();
      return token;
    } catch (error) {
      await telemetry.recordFailure(error as Error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    await prisma.financial_data_cache.deleteMany({});
    console.log('🧹 All caches cleared');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalCachedItems: number;
    activeItems: number;
    expiredItems: number;
    totalSize: number;
  }> {
    const allItems = await prisma.financial_data_cache.findMany();
    const now = new Date();
    
    const activeItems = allItems.filter((item) => item.expiresAt > now);
    const expiredItems = allItems.filter((item) => item.expiresAt <= now);
    const totalSize = allItems.reduce((sum, item) => sum + item.data.length, 0);

    return {
      totalCachedItems: allItems.length,
      activeItems: activeItems.length,
      expiredItems: expiredItems.length,
      totalSize,
    };
  }
}

export const optimizedZohoService = new OptimizedZohoService();

// Export for compatibility
export const fetchProjects = async () => {
  try {
    const response = await fetch('/api/projects');
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Client: Error fetching projects:', error);
    throw error;
  }
};

export const fetchInvoices = async () => {
  try {
    const response = await fetch('/api/invoices');
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Client: Error fetching invoices:', error);
    throw error;
  }
};

