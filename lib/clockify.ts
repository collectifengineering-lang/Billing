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
  private apiKey: string = 'OTg4NTg3YjMtMmQzYS00ZWE1LThiOTctZmY4NDAwYzRiZjZj';
  private workspaceId: string | null = null;
  private baseUrl = 'https://api.clockify.me/api/v1';

  constructor() {
    // Initialize with the provided API key
    console.log('Clockify service initialized with API key');
  }

  private getHeaders() {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(endpoint: string, params?: any): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: this.getHeaders(),
        params,
      });
      return response.data;
    } catch (error: any) {
      console.error('Clockify API error:', error.response?.data || error.message);
      throw new Error(`Clockify API error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get user information
  async getUser(): Promise<ClockifyUser> {
    return this.makeRequest('/user');
  }

  // Get workspaces
  async getWorkspaces(): Promise<ClockifyWorkspace[]> {
    return this.makeRequest('/workspaces');
  }

  // Get projects for a workspace
  async getProjects(workspaceId?: string): Promise<ClockifyProject[]> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      // If no workspace ID is provided, get the first workspace
      const workspaces = await this.getWorkspaces();
      if (workspaces.length > 0) {
        this.workspaceId = workspaces[0].id;
        console.log(`Using workspace: ${workspaces[0].name} (${workspaces[0].id})`);
      } else {
        throw new Error('No workspaces found');
      }
    }
    return this.makeRequest(`/workspaces/${this.workspaceId}/projects`);
  }

  // Get time entries for a project
  async getProjectTimeEntries(
    projectId: string,
    startDate?: string,
    endDate?: string,
    workspaceId?: string
  ): Promise<ClockifyTimeEntry[]> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      throw new Error('Workspace ID not configured');
    }

    const params: any = {};
    if (startDate) params['start'] = startDate;
    if (endDate) params['end'] = endDate;

    return this.makeRequest(`/workspaces/${wsId}/projects/${projectId}/time-entries`, params);
  }

  // Get time entries for a user
  async getUserTimeEntries(
    userId: string,
    startDate?: string,
    endDate?: string,
    workspaceId?: string
  ): Promise<ClockifyTimeEntry[]> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      throw new Error('Workspace ID not configured');
    }

    const params: any = {};
    if (startDate) params['start'] = startDate;
    if (endDate) params['end'] = endDate;

    return this.makeRequest(`/workspaces/${wsId}/user/${userId}/time-entries`, params);
  }

  // Get all time entries for a workspace
  async getAllTimeEntries(
    startDate?: string,
    endDate?: string,
    workspaceId?: string
  ): Promise<ClockifyTimeEntry[]> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      throw new Error('Workspace ID not configured');
    }

    const params: any = {};
    if (startDate) params['start'] = startDate;
    if (endDate) params['end'] = endDate;

    return this.makeRequest(`/workspaces/${wsId}/time-entries`, params);
  }

  // Get detailed time report for a project
  async getProjectTimeReport(
    projectId: string,
    startDate: string,
    endDate: string,
    workspaceId?: string
  ): Promise<ClockifyTimeReport> {
    const entries = await this.getProjectTimeEntries(projectId, startDate, endDate, workspaceId);
    const project = await this.getProjectById(projectId, workspaceId);

    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    let totalAmount = 0;
    let billableAmount = 0;
    let nonBillableAmount = 0;

    entries.forEach(entry => {
      const durationMs = this.parseDuration(entry.timeInterval.duration);
      const hours = durationMs / (1000 * 60 * 60);
      totalHours += hours;

      if (entry.billable) {
        billableHours += hours;
        billableAmount += entry.costRate?.amount || 0;
      } else {
        nonBillableHours += hours;
        nonBillableAmount += entry.costRate?.amount || 0;
      }
      totalAmount += entry.costRate?.amount || 0;
    });

    return {
      projectId,
      projectName: project?.name || 'Unknown Project',
      totalHours,
      billableHours,
      nonBillableHours,
      totalAmount,
      billableAmount,
      nonBillableAmount,
      entries,
      period: { start: startDate, end: endDate },
    };
  }

  // Get project by ID
  async getProjectById(projectId: string, workspaceId?: string): Promise<ClockifyProject | null> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      throw new Error('Workspace ID not configured');
    }

    try {
      return await this.makeRequest(`/workspaces/${wsId}/projects/${projectId}`);
    } catch (error) {
      console.error(`Project ${projectId} not found`);
      return null;
    }
  }

  // Get time summary for a project
  async getProjectTimeSummary(
    projectId: string,
    startDate: string,
    endDate: string,
    workspaceId?: string
  ) {
    const report = await this.getProjectTimeReport(projectId, startDate, endDate, workspaceId);
    return {
      projectId: report.projectId,
      projectName: report.projectName,
      totalHours: report.totalHours,
      billableHours: report.billableHours,
      nonBillableHours: report.nonBillableHours,
      totalAmount: report.totalAmount,
      billableAmount: report.billableAmount,
      nonBillableAmount: report.nonBillableAmount,
      period: report.period,
    };
  }

  // Get all projects with time summaries for a date range
  async getAllProjectsTimeSummary(
    startDate: string,
    endDate: string,
    workspaceId?: string
  ) {
    const projects = await this.getProjects(workspaceId);
    const summaries = [];

    for (const project of projects) {
      try {
        const summary = await this.getProjectTimeSummary(
          project.id,
          startDate,
          endDate,
          workspaceId
        );
        summaries.push(summary);
      } catch (error) {
        console.error(`Error getting summary for project ${project.id}:`, error);
      }
    }

    return summaries;
  }

  // Parse duration string (e.g., "PT2H30M") to milliseconds
  private parseDuration(duration: string): number {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const match = duration.match(regex);
    
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Get configuration status
  getConfigStatus(): { apiKey: boolean; workspaceId: boolean; configured: boolean } {
    return {
      apiKey: !!this.apiKey,
      workspaceId: !!this.workspaceId,
      configured: this.isConfigured(),
    };
  }

  // Set workspace ID
  setWorkspaceId(workspaceId: string) {
    this.workspaceId = workspaceId;
  }
}

// Create singleton instance
export const clockifyService = new ClockifyService();

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
    return await clockifyService.getProjectTimeEntries(projectId, startDate, endDate);
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
