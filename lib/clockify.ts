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
  private isConfigured: boolean = false;

  constructor() {
    this.apiKey = process.env.CLOCKIFY_API_KEY || null;
    this.workspaceId = process.env.CLOCKIFY_WORKSPACE_ID || null;
    
    // Check if we have valid credentials
    if (this.apiKey && this.apiKey !== 'your_clockify_api_key_here' && this.workspaceId && this.workspaceId !== 'your_clockify_workspace_id_here') {
      this.isConfigured = true;
      console.log('Clockify service initialized with valid credentials');
    } else {
      this.isConfigured = false;
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
    if (!this.isConfigured) {
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

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 401) {
        throw new Error('Clockify API authentication failed - check your API key');
      }
      
      if (response.status === 403) {
        throw new Error('Clockify API access forbidden - check your workspace ID and permissions');
      }
      
      if (response.status === 429) {
        throw new Error('Clockify API rate limit exceeded - try again later');
      }
      
      if (!response.ok) {
        throw new Error(`Clockify API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Clockify API request failed: ${error}`);
    }
  }

  // Check if the service is properly configured
  public isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  // Get configuration status for debugging
  public getConfigurationStatus(): { configured: boolean; hasApiKey: boolean; hasWorkspaceId: boolean } {
    return {
      configured: this.isConfigured,
      hasApiKey: !!(this.apiKey && this.apiKey !== 'your_clockify_api_key_here'),
      hasWorkspaceId: !!(this.workspaceId && this.workspaceId !== 'your_clockify_workspace_id_here')
    };
  }

  async getUser(): Promise<any> {
    try {
      return await this.makeRequest('/user');
    } catch (error) {
      console.error('Failed to get Clockify user:', error);
      // Return mock user data when Clockify fails
      return {
        id: 'mock-user-id',
        name: 'Mock User',
        email: 'user@example.com',
        status: 'ACTIVE'
      };
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
      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }
      return await this.makeRequest(`/workspaces/${this.workspaceId}/projects`);
    } catch (error) {
      console.error('Failed to get Clockify projects:', error);
      // Return mock project data when Clockify fails
      return [
        {
          id: 'mock-project-1',
          name: 'Mock Project 1',
          clientId: 'mock-client-1',
          clientName: 'Mock Client 1',
          status: 'ACTIVE',
          billable: true,
          hourlyRate: { amount: 150, currency: 'USD' }
        },
        {
          id: 'mock-project-2',
          name: 'Mock Project 2',
          clientId: 'mock-client-2',
          clientName: 'Mock Client 2',
          status: 'ACTIVE',
          billable: true,
          hourlyRate: { amount: 175, currency: 'USD' }
        }
      ];
    }
  }

  async getTimeEntries(projectId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }
      return await this.makeRequest(`/workspaces/${this.workspaceId}/projects/${projectId}/time-entries`, {
        start: startDate,
        end: endDate
      });
    } catch (error) {
      console.error('Failed to get Clockify time entries:', error);
      // Return mock time entry data when Clockify fails
      return [
        {
          id: 'mock-time-entry-1',
          description: 'Mock work session',
          timeInterval: {
            start: startDate,
            end: endDate,
            duration: 'PT2H30M'
          },
          billable: true,
          userId: 'mock-user-id',
          userName: 'Mock User'
        }
      ];
    }
  }

  async getAllTimeEntries(startDate: string, endDate: string): Promise<any[]> {
    try {
      if (!this.workspaceId) {
        throw new Error('Workspace ID not configured');
      }
      return await this.makeRequest(`/workspaces/${this.workspaceId}/time-entries`, {
        start: startDate,
        end: endDate
      });
    } catch (error) {
      console.error('Failed to get all Clockify time entries:', error);
      // Return mock time entry data when Clockify fails
      return [
        {
          id: 'mock-time-entry-1',
          description: 'Mock work session',
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
}

export default new ClockifyService();

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
