import axios from 'axios';

export interface ClockifyTimeEntry {
  id: string;
  description: string;
  userId: string;
  billable: boolean;
  taskId?: string;
  projectId: string;
  timeInterval: {
    start: string;
    end?: string;
    duration: string;
  };
  hourlyRate?: {
    amount: number;
    currency: string;
  };
  costRate?: {
    amount: number;
    currency: string;
  };
  isLocked: boolean;
  customFieldValues: any[];
  type: string;
  tags: any[];
}

export interface ClockifyProject {
  id: string;
  name: string;
  workspaceId: string;
  clientId?: string;
  clientName?: string;
  isPublic: boolean;
  isTemplate: boolean;
  color: string;
  note?: string;
  billable: boolean;
  public: boolean;
  archived: boolean;
  estimate: {
    estimate: string;
    type: string;
  };
  status: string;
  duration: string;
  budgetEstimate: number;
  budgetType: string;
  hourlyRate: {
    amount: number;
    currency: string;
  };
  costRate: {
    amount: number;
    currency: string;
  };
  timeEstimate: string;
  budget: number;
  spent: string;
  progress: number;
  rate: number;
  rateLastUpdated: string;
  fixedFee: number;
  memberships: any[];
  taskCount: {
    total: number;
    estimate: number;
  };
  customFields: any[];
  startDate: string;
  endDate?: string;
}

export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  profilePicture: string;
  status: string;
  activeWorkspace: string;
  defaultWorkspace: string;
  settings: any;
  memberships: any[];
  profilePictureUrl: string;
}

export interface ClockifyWorkspace {
  id: string;
  name: string;
  profile: number;
  premium: boolean;
  admin: boolean;
  defaultHourlyRate: number;
  defaultCurrency: string;
  onlyAdminsMayCreateProjects: boolean;
  onlyAdminsSeeBillableRates: boolean;
  onlyAdminsSeeTeamDashboard: boolean;
  projectsBillableByDefault: boolean;
  rounding: number;
  roundingMinutes: number;
  logo: string;
  icalUrl: string;
  icalEnabled: boolean;
  csvUpload: {
    enabled: boolean;
    dateFormat: string;
    timeFormat: string;
  };
  subscription: {
    startDate: string;
    endDate: string;
    trial: boolean;
    status: string;
  };
}

export interface ClockifyTimeReport {
  projectId: string;
  projectName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalAmount: number;
  billableAmount: number;
  nonBillableAmount: number;
  entries: ClockifyTimeEntry[];
  period: {
    start: string;
    end: string;
  };
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

class ClockifyService {
  private apiKey: string | null = null;
  private workspaceId: string | null = null;
  private baseUrl = 'https://api.clockify.me/api/v1';
  private reportsBaseUrl = 'https://reports.api.clockify.me/v1'; // Correct Reports API base URL
  private _isConfigured: boolean = false;

  constructor() {
    this.apiKey = process.env.CLOCKIFY_API_KEY || null;
    this.workspaceId = process.env.CLOCKIFY_WORKSPACE_ID || null;
    
    // Check if we have valid credentials
    if (this.apiKey && this.apiKey !== 'your_clockify_api_key_here' && this.workspaceId && this.workspaceId !== 'your_clockify_workspace_id_here') {
      this._isConfigured = true;
      console.info('Clockify service initialized with valid credentials');
    } else {
      this._isConfigured = false;
      console.warn('Clockify service initialized without valid credentials - will use mock data');
      console.warn('Please set CLOCKIFY_API_KEY and CLOCKIFY_WORKSPACE_ID in your environment variables');
    }
  }

  private getHeaders() {
    if (!this.apiKey) {
      throw new Error('Clockify API key not configured');
    }
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(endpoint: string, params?: any): Promise<any> {
    if (!this._isConfigured) {
      throw new Error('Clockify service not properly configured');
    }

    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      if (params) {
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, params[key]);
          }
        });
      }

      console.log(`🔍 Clockify API Request: ${url.toString()}`);
      console.log(`   Headers: ${JSON.stringify(this.getHeaders())}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log(`📡 Clockify API Response: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        throw new Error('Clockify API authentication failed - check your API key');
      }
      
      if (response.status === 403) {
        throw new Error('Clockify API access forbidden - check your workspace ID and permissions');
      }
      
      if (response.status === 404) {
        const errorDetails = `Endpoint not found: ${endpoint}`;
        console.error(`❌ 404 Error Details: ${errorDetails}`);
        console.error(`   Full URL: ${url.toString()}`);
        console.error(`   Workspace ID: ${this.workspaceId}`);
        console.error(`   API Key configured: ${!!this.apiKey}`);
        throw new Error(`Clockify API error: 404 Not Found - ${errorDetails}`);
      }
      
      if (response.status === 429) {
        throw new Error('Clockify API rate limit exceeded - try again later');
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Clockify API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Clockify API Success: ${endpoint}`);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Clockify API Error in ${endpoint}:`, error.message);
        throw error;
      }
      throw new Error(`Clockify API request failed: ${error}`);
    }
  }

  // Check if the service is properly configured
  public isConfigured(): boolean {
    return this._isConfigured;
  }

  // Get configuration status for debugging
  public getConfigurationStatus(): { configured: boolean; hasApiKey: boolean; hasWorkspaceId: boolean } {
    return {
      configured: this._isConfigured,
      hasApiKey: !!(this.apiKey && this.apiKey !== 'your_clockify_api_key_here'),
      hasWorkspaceId: !!(this.workspaceId && this.workspaceId !== 'your_clockify_workspace_id_here')
    };
  }

  // Alias for getConfigurationStatus to match API usage
  public getConfigStatus(): { configured: boolean; hasApiKey: boolean; hasWorkspaceId: boolean } {
    return this.getConfigurationStatus();
  }

  // Method to set workspace ID dynamically
  public setWorkspaceId(workspaceId: string): void {
    this.workspaceId = workspaceId;
    if (this.apiKey && this.apiKey !== 'your_clockify_api_key_here') {
      this._isConfigured = true;
    }
  }

  async getUser(): Promise<any> {
    try {
      if (!this._isConfigured) {
        console.log('Clockify not configured, returning mock user');
        return this.getMockUser();
      }

      const url = new URL(`${this.baseUrl}/user`);
      console.log(`🔍 Clockify API Request: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Clockify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Clockify API Success: /user`);
      return data;
    } catch (error) {
      console.error('Failed to get Clockify user:', error);
      console.log('Returning mock user due to Clockify API failure');
      return this.getMockUser();
    }
  }

  async getWorkspaces(): Promise<any[]> {
    try {
      return await this.makeRequest('/workspaces');
    } catch (error) {
      console.error('Failed to get Clockify workspaces:', error);
      // Return mock workspace data when Clockify fails
      return [
        {
          id: 'mock-workspace-id',
          name: 'Mock Workspace',
          hourlyRate: { amount: 100, currency: 'USD' }
        }
      ];
    }
  }

  async getProjects(): Promise<any[]> {
    try {
      if (!this._isConfigured) {
        console.log('Clockify not configured, returning mock projects');
        return this.getMockProjects();
      }

      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }

      const url = new URL(`${this.baseUrl}/workspaces/${this.workspaceId}/projects`);
      console.log(`🔍 Clockify API Request: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Clockify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Clockify API Success: /workspaces/${this.workspaceId}/projects`);
      return data;
    } catch (error) {
      console.error('Failed to get Clockify projects:', error);
      console.log('Returning mock projects due to Clockify API failure');
      return this.getMockProjects();
    }
  }

  async getTimeEntries(projectId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      if (!this._isConfigured) {
        console.log('Clockify not configured, returning mock data');
        return this.getMockTimeEntries(projectId, startDate, endDate);
      }

      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }

      const url = new URL(`${this.baseUrl}/workspaces/${this.workspaceId}/projects/${projectId}/time-entries`);
      url.searchParams.append('start', startDate);
      url.searchParams.append('end', endDate);

      console.log(`🔍 Clockify API Request: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Clockify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Clockify API Success: /workspaces/${this.workspaceId}/projects/${projectId}/time-entries`);
      return data;
    } catch (error) {
      console.error('Failed to get Clockify time entries:', error);
      console.log('Returning mock time entry data due to Clockify API failure');
      return this.getMockTimeEntries(projectId, startDate, endDate);
    }
  }

  async getAllTimeEntries(startDate: string, endDate: string): Promise<any[]> {
    try {
      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }
      
      // First try the Reports API for bulk time entry data
      try {
        console.info('🔄 Attempting to fetch time entries via Clockify Reports API (requires Pro plan)...');
        return await this.getTimeEntriesViaReports(startDate, endDate);
      } catch (reportsError) {
        console.warn('⚠️ Clockify Reports API failed, falling back to user time entries endpoint:', {
          error: reportsError instanceof Error ? reportsError.message : 'Unknown error',
          reason: 'Reports API may require Pro plan or may be temporarily unavailable',
          fallback: 'Using user time entries endpoint instead'
        });
        return await this.getTimeEntriesViaUserEndpoint(startDate, endDate);
      }
    } catch (error) {
      console.error('❌ Failed to get all Clockify time entries:', error);
      
      // Return mock time entry data when Clockify fails
      console.warn('🎭 Returning mock time entry data due to Clockify API failure. Check your plan level and API configuration.');
      return [
        {
          id: 'mock-time-entry-1',
          description: 'Mock work session (Clockify API unavailable)',
          timeInterval: {
            start: startDate,
            end: endDate,
            duration: 'PT8H0M'
          },
          billable: true,
          userId: 'mock-user-id',
          userName: 'Mock User',
          projectId: 'mock-project-1',
          projectName: 'Mock Project 1'
        }
      ];
    }
  }

  // Method to get time entries via Reports API (preferred method)
  private async getTimeEntriesViaReports(startDate: string, endDate: string): Promise<any[]> {
    const url = new URL(`${this.reportsBaseUrl}/workspaces/${this.workspaceId}/reports/detailed`);
    
    console.info(`🔍 Clockify Reports API Request: ${url.toString()}`);
    console.info(`   Method: POST (Reports API)`);
    console.info(`   Headers: ${JSON.stringify(this.getHeaders())}`);
    console.info(`   Body: ${JSON.stringify({ 
      dateRangeStart: startDate, 
      dateRangeEnd: endDate,
      detailedFilter: {
        pageSize: 1000,
        sortColumn: "DATE"
      }
    })}`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        detailedFilter: {
          pageSize: 1000,
          sortColumn: "DATE"
        }
      }),
    });

    console.info(`📡 Clockify Reports API Response: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      throw new Error('Clockify API authentication failed - check your API key');
    }
    
    if (response.status === 403) {
      throw new Error('Clockify API access forbidden - check your workspace ID and permissions. Note: Detailed reports require Pro plan or higher.');
    }
    
    if (response.status === 404) {
      const errorDetails = `Reports endpoint not found: /workspaces/${this.workspaceId}/reports/detailed`;
      console.error(`❌ 404 Error Details: ${errorDetails}`);
      console.error(`   Full URL: ${url.toString()}`);
      console.error(`   Workspace ID: ${this.workspaceId}`);
      console.error(`   API Key configured: ${!!this.apiKey}`);
      console.error(`   Note: This endpoint requires Clockify Pro plan or higher for detailed reports`);
      throw new Error(`Clockify API error: 404 Not Found - ${errorDetails}. This endpoint requires Pro plan or higher.`);
    }
    
    if (response.status === 405) {
      throw new Error('Clockify API method not allowed - this endpoint requires POST method');
    }
    
    if (response.status === 429) {
      throw new Error('Clockify API rate limit exceeded - try again later');
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Clockify Reports API error response body: ${errorText}`);
      throw new Error(`Clockify API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.info(`✅ Clockify Reports API Success: /workspaces/${this.workspaceId}/reports/detailed`);
    
    // Transform the reports data to match our expected time entry format
    if (data.timeentries && Array.isArray(data.timeentries)) {
      console.info(`📊 Processing ${data.timeentries.length} time entries from Reports API`);
      
      return data.timeentries.map((entry: any, index: number) => {
        try {
          // Handle duration conversion - Reports API returns duration in seconds as number
          let duration = 'PT0H0M';
          if (entry.duration !== undefined && entry.duration !== null) {
            if (typeof entry.duration === 'number') {
              // Convert seconds to ISO 8601 duration format
              const hours = Math.floor(entry.duration / 3600);
              const minutes = Math.floor((entry.duration % 3600) / 60);
              duration = `PT${hours}H${minutes}M`;
            } else if (typeof entry.duration === 'string') {
              // If it's already a string, use it directly
              duration = entry.duration;
            }
          }

          // Handle undefined IDs - generate a fallback ID if needed
          const entryId = entry.id || `reports-entry-${index}-${Date.now()}`;
          
          // Log sample entry for debugging (first few entries)
          if (index < 3) {
            console.info(`📝 Sample entry ${index}:`, {
              id: entryId,
              duration: entry.duration,
              convertedDuration: duration,
              projectId: entry.projectId,
              userId: entry.userId
            });
          }

          return {
            id: entryId,
            description: entry.description || 'No description',
            timeInterval: {
              start: entry.timeInterval?.start || entry.start,
              end: entry.timeInterval?.end || entry.end,
              duration: duration
            },
            billable: entry.billable || false,
            userId: entry.userId || 'unknown-user',
            userName: entry.userName || 'Unknown User',
            projectId: entry.projectId || 'unknown-project',
            projectName: entry.projectName || 'Unknown Project',
            hourlyRate: entry.hourlyRate || 0
          };
        } catch (entryError) {
          console.error(`❌ Error processing time entry ${index}:`, entryError);
          console.error(`   Raw entry data:`, entry);
          
          // Return a safe fallback entry
          return {
            id: `error-entry-${index}-${Date.now()}`,
            description: 'Error processing entry',
            timeInterval: {
              start: startDate,
              end: endDate,
              duration: 'PT0H0M'
            },
            billable: false,
            userId: 'error-user',
            userName: 'Error User',
            projectId: 'error-project',
            projectName: 'Error Project',
            hourlyRate: 0
          };
        }
      }).filter((entry: any) => entry !== null); // Remove any null entries
    }
    
    console.warn('⚠️ No time entries found in Reports API response');
    return [];
  }

  // Fallback method to get time entries via user endpoint (GET method)
  private async getTimeEntriesViaUserEndpoint(startDate: string, endDate: string): Promise<any[]> {
    try {
      // Get the current user first
      const user = await this.getUser();
      if (!user?.id) {
        throw new Error('Could not get current user for time entries');
      }

      // Use GET method with query parameters - this is the correct way to fetch time entries
      const url = new URL(`${this.baseUrl}/workspaces/${this.workspaceId}/user/${user.id}/time-entries`);
      url.searchParams.set('start', startDate);
      url.searchParams.set('end', endDate);
      
      console.info(`🔍 Clockify User Time Entries API Request (Fallback): ${url.toString()}`);
      console.info(`   Method: GET (User Time Entries - Fallback from Reports API)`);
      console.info(`   Headers: ${JSON.stringify(this.getHeaders())}`);
      console.info(`   Note: Using fallback method because Reports API failed or requires Pro plan`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.info(`📡 Clockify User Time Entries API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`Clockify User Time Entries API error response body: ${errorText}`);
        throw new Error(`Clockify User Time Entries API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.info(`✅ Clockify User Time Entries API Success (Fallback): /workspaces/${this.workspaceId}/user/${user.id}/time-entries`);
      console.info(`   Retrieved ${data?.length || 0} time entries via fallback method`);
      
      // Transform the data to match our expected format
      if (Array.isArray(data)) {
        return data.map((entry: any, index: number) => {
          try {
            // Handle duration conversion - User API might also return duration as number
            let duration = 'PT0H0M';
            if (entry.duration !== undefined && entry.duration !== null) {
              if (typeof entry.duration === 'number') {
                // Convert seconds to ISO 8601 duration format
                const hours = Math.floor(entry.duration / 3600);
                const minutes = Math.floor((entry.duration % 3600) / 60);
                duration = `PT${hours}H${minutes}M`;
              } else if (typeof entry.duration === 'string') {
                // If it's already a string, use it directly
                duration = entry.duration;
              }
            }

            // Handle undefined IDs - generate a fallback ID if needed
            const entryId = entry.id || `user-entry-${index}-${Date.now()}`;
            
            // Log sample entry for debugging (first few entries)
            if (index < 3) {
              console.info(`📝 Fallback entry ${index}:`, {
                id: entryId,
                duration: entry.duration,
                convertedDuration: duration,
                projectId: entry.projectId,
                userId: entry.userId
              });
            }

            return {
              id: entryId,
              description: entry.description || 'No description',
              timeInterval: {
                start: entry.timeInterval?.start || entry.start,
                end: entry.timeInterval?.end || entry.end,
              duration: duration
              },
              billable: entry.billable || false,
              userId: entry.userId || 'unknown-user',
              userName: entry.userName || 'Unknown User',
              projectId: entry.projectId || 'unknown-project',
              projectName: entry.projectName || 'Unknown Project',
              hourlyRate: entry.hourlyRate || 0
            };
          } catch (entryError) {
            console.error(`❌ Error processing fallback time entry ${index}:`, entryError);
            console.error(`   Raw entry data:`, entry);
            
            // Return a safe fallback entry
            return {
              id: `error-fallback-${index}-${Date.now()}`,
              description: 'Error processing fallback entry',
              timeInterval: {
                start: startDate,
                end: endDate,
                duration: 'PT0H0M'
              },
              billable: false,
              userId: 'error-user',
              userName: 'Error User',
              projectId: 'error-project',
              projectName: 'Error Project',
              hourlyRate: 0
            };
          }
        }).filter((entry: any) => entry !== null); // Remove any null entries
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get time entries via user endpoint (fallback):', error);
      throw error;
    }
  }

  async getUsers(): Promise<any[]> {
    try {
      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }
      return await this.makeRequest(`/workspaces/${this.workspaceId}/users`);
    } catch (error) {
      console.error('Failed to get Clockify users:', error);
      // Return mock user data when Clockify fails
      return [
        {
          id: 'mock-user-1',
          name: 'Mock User 1',
          email: 'user1@example.com',
          status: 'ACTIVE',
          hourlyRate: { amount: 100, currency: 'USD' }
        },
        {
          id: 'mock-user-2',
          name: 'Mock User 2',
          email: 'user2@example.com',
          status: 'ACTIVE',
          hourlyRate: { amount: 120, currency: 'USD' }
        }
      ];
    }
  }

  async getProjectTimeReport(projectId: string, startDate: string, endDate: string): Promise<ClockifyTimeReport | null> {
    try {
      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }
      
      const timeEntries = await this.getTimeEntries(projectId, startDate, endDate);
      const project = await this.getProjects().then(projects => 
        projects.find(p => p.id === projectId)
      );
      
      if (!project) {
        throw new Error('Project not found');
      }

      const totalHours = timeEntries.reduce((sum, entry) => {
        const duration = entry.timeInterval.duration;
        const hours = this.parseDuration(duration);
        return sum + hours;
      }, 0);

      const billableHours = timeEntries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => {
          const duration = entry.timeInterval.duration;
          const hours = this.parseDuration(duration);
          return sum + hours;
        }, 0);

      const nonBillableHours = totalHours - billableHours;

      return {
        projectId,
        projectName: project.name,
        totalHours,
        billableHours,
        nonBillableHours,
        totalAmount: totalHours * (project.hourlyRate?.amount || 0),
        billableAmount: billableHours * (project.hourlyRate?.amount || 0),
        nonBillableAmount: nonBillableHours * (project.hourlyRate?.amount || 0),
        entries: timeEntries,
        period: { start: startDate, end: endDate }
      };
    } catch (error) {
      console.error('Failed to get project time report:', error);
      return null;
    }
  }

  async getAllProjectsTimeSummary(startDate: string, endDate: string): Promise<ClockifyTimeReport[]> {
    try {
      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }
      
      const projects = await this.getProjects();
      const reports: ClockifyTimeReport[] = [];
      
      for (const project of projects) {
        const report = await this.getProjectTimeReport(project.id, startDate, endDate);
        if (report) {
          reports.push(report);
        }
      }
      
      return reports;
    } catch (error) {
      console.error('Failed to get all projects time summary:', error);
      return [];
    }
  }

  // Helper method to parse ISO 8601 duration to hours
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours + (minutes / 60) + (seconds / 3600);
  }

  // Enhanced method to generate mock time entries
  private getMockTimeEntries(projectId: string, startDate: string, endDate: string): any[] {
    return [
      {
        id: `mock-${projectId}-1`,
        description: 'Mock project work',
        timeInterval: {
          start: startDate,
          end: endDate,
          duration: 'PT8H0M'
        },
        billable: true,
        userId: 'mock-user-id',
        userName: 'Mock User',
        projectId: projectId,
        projectName: 'Mock Project'
      }
    ];
  }

  // Enhanced method to generate mock projects
  private getMockProjects(): any[] {
    return [
      {
        id: 'mock-project-1',
        name: 'Mock Project 1',
        workspaceId: 'mock-workspace',
        clientId: 'mock-client-1',
        clientName: 'Mock Client 1',
        isPublic: true,
        isTemplate: false,
        color: '#000000',
        billable: true,
        public: true,
        archived: false,
        status: 'ACTIVE',
        budget: 50000,
        hourlyRate: { amount: 150, currency: 'USD' }
      }
    ];
  }

  // Enhanced method to generate mock user
  private getMockUser(): any {
    return {
      id: 'mock-user-id',
      email: 'mock@example.com',
      name: 'Mock User',
      profilePicture: '',
      status: 'ACTIVE',
      activeWorkspace: 'mock-workspace',
      defaultWorkspace: 'mock-workspace'
    };
  }
}

// Create the service instance
const clockifyService = new ClockifyService();

// Export the service instance as both default and named export
export default clockifyService;
export { clockifyService };

// Export convenience functions
export const fetchClockifyProjects = async () => {
  try {
    return await clockifyService.getProjects();
  } catch (error) {
    console.error('Error fetching Clockify projects:', error);
    return [];
  }
};

export const fetchClockifyTimeEntries = async (
  projectId: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    return await clockifyService.getTimeEntries(projectId, startDate || '', endDate || '');
  } catch (error) {
    console.error('Error fetching Clockify time entries:', error);
    return [];
  }
};

export const fetchClockifyTimeReport = async (
  projectId: string,
  startDate: string,
  endDate: string
) => {
  try {
    return await clockifyService.getProjectTimeReport(projectId, startDate, endDate);
  } catch (error) {
    console.error('Error fetching Clockify time report:', error);
    return null;
  }
};

export const fetchAllClockifyTimeSummaries = async (
  startDate: string,
  endDate: string
) => {
  try {
    return await clockifyService.getAllProjectsTimeSummary(startDate, endDate);
  } catch (error) {
    console.error('Error fetching Clockify time summaries:', error);
    return [];
  }
};
