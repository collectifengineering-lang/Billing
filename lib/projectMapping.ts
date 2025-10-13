import { clockifyService } from './clockify';
import { zohoService } from './zoho';

/**
 * Project Mapping Service
 * Handles synchronization between Clockify and Zoho projects
 * Provides fallback mechanisms for missing data
 */

export interface ProjectMapping {
  clockifyId?: string;
  clockifyName?: string;
  zohoId?: string;
  zohoName?: string;
  name: string; // Canonical name
  status: 'synced' | 'clockify-only' | 'zoho-only' | 'orphaned';
  archived: boolean;
  lastSyncedAt?: Date;
}

export interface ProjectDetails {
  id: string;
  name: string;
  clientName?: string;
  billable?: boolean;
  archived?: boolean;
  source: 'clockify' | 'zoho' | 'merged';
  // Zoho-specific fields
  projectId?: string;
  customerId?: string;
  customerName?: string;
  signedFee?: number;
  // Clockify-specific fields
  hourlyRate?: number;
  color?: string;
}

export interface SyncReport {
  totalProjects: number;
  syncedProjects: number;
  clockifyOnlyProjects: number;
  zohoOnlyProjects: number;
  orphanedProjects: number;
  archivedProjects: number;
  mappings: ProjectMapping[];
  timestamp: Date;
}

class ProjectMappingService {
  private mappingCache: Map<string, ProjectMapping> = new Map();
  private clockifyProjectsCache: Map<string, any> = new Map();
  private zohoProjectsCache: Map<string, any> = new Map();
  private lastSyncTime: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Synchronize projects from both Clockify and Zoho
   * Creates a unified mapping of all projects
   */
  async syncProjects(): Promise<SyncReport> {
    console.info('🔄 Starting project synchronization...');
    
    try {
      // Fetch projects from both services in parallel
      const [clockifyProjects, zohoProjects] = await Promise.allSettled([
        clockifyService.getProjects(),
        zohoService.getProjects()
      ]);

      const clockifyData = clockifyProjects.status === 'fulfilled' ? clockifyProjects.value : [];
      const zohoData = zohoProjects.status === 'fulfilled' ? zohoProjects.value : [];

      console.info(`📊 Fetched ${clockifyData.length} Clockify projects and ${zohoData.length} Zoho projects`);

      // Update caches
      this.clockifyProjectsCache.clear();
      this.zohoProjectsCache.clear();

      clockifyData.forEach(project => {
        this.clockifyProjectsCache.set(project.id, project);
      });

      zohoData.forEach(project => {
        this.zohoProjectsCache.set(project.project_id, project);
      });

      // Create mappings by matching project names
      const mappings = this.createProjectMappings(clockifyData, zohoData);
      
      // Update cache
      this.mappingCache.clear();
      mappings.forEach(mapping => {
        const key = mapping.clockifyId || mapping.zohoId || mapping.name;
        this.mappingCache.set(key, mapping);
      });

      this.lastSyncTime = new Date();

      // Generate sync report
      const report: SyncReport = {
        totalProjects: mappings.length,
        syncedProjects: mappings.filter(m => m.status === 'synced').length,
        clockifyOnlyProjects: mappings.filter(m => m.status === 'clockify-only').length,
        zohoOnlyProjects: mappings.filter(m => m.status === 'zoho-only').length,
        orphanedProjects: mappings.filter(m => m.status === 'orphaned').length,
        archivedProjects: mappings.filter(m => m.archived).length,
        mappings,
        timestamp: new Date()
      };

      console.info('✅ Project synchronization complete:', {
        total: report.totalProjects,
        synced: report.syncedProjects,
        clockifyOnly: report.clockifyOnlyProjects,
        zohoOnly: report.zohoOnlyProjects,
        orphaned: report.orphanedProjects,
        archived: report.archivedProjects
      });

      return report;
    } catch (error) {
      console.error('❌ Error synchronizing projects:', error);
      throw error;
    }
  }

  /**
   * Create project mappings by matching names between Clockify and Zoho
   */
  private createProjectMappings(clockifyProjects: any[], zohoProjects: any[]): ProjectMapping[] {
    const mappings: ProjectMapping[] = [];
    const usedZohoIds = new Set<string>();

    // First pass: match by name similarity
    clockifyProjects.forEach(clockifyProject => {
      const clockifyName = this.normalizeName(clockifyProject.name);
      
      // Try to find matching Zoho project
      const matchingZoho = zohoProjects.find(zohoProject => {
        if (usedZohoIds.has(zohoProject.project_id)) return false;
        const zohoName = this.normalizeName(zohoProject.project_name);
        return this.areNamesMatching(clockifyName, zohoName);
      });

      if (matchingZoho) {
        usedZohoIds.add(matchingZoho.project_id);
        mappings.push({
          clockifyId: clockifyProject.id,
          clockifyName: clockifyProject.name,
          zohoId: matchingZoho.project_id,
          zohoName: matchingZoho.project_name,
          name: clockifyProject.name, // Use Clockify name as canonical
          status: 'synced',
          archived: clockifyProject.archived || false,
          lastSyncedAt: new Date()
        });
      } else {
        // Clockify-only project
        mappings.push({
          clockifyId: clockifyProject.id,
          clockifyName: clockifyProject.name,
          name: clockifyProject.name,
          status: clockifyProject.archived ? 'orphaned' : 'clockify-only',
          archived: clockifyProject.archived || false,
          lastSyncedAt: new Date()
        });
      }
    });

    // Second pass: add Zoho-only projects
    zohoProjects.forEach(zohoProject => {
      if (!usedZohoIds.has(zohoProject.project_id)) {
        const isArchived = zohoProject.status?.toLowerCase() === 'inactive' || 
                          zohoProject.status?.toLowerCase() === 'closed';
        
        mappings.push({
          zohoId: zohoProject.project_id,
          zohoName: zohoProject.project_name,
          name: zohoProject.project_name,
          status: isArchived ? 'orphaned' : 'zoho-only',
          archived: isArchived,
          lastSyncedAt: new Date()
        });
      }
    });

    return mappings;
  }

  /**
   * Normalize project name for comparison
   */
  private normalizeName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize spaces
  }

  /**
   * Check if two names are matching
   * Uses fuzzy matching to account for minor variations
   */
  private areNamesMatching(name1: string, name2: string): boolean {
    if (name1 === name2) return true;

    // Check if one name contains the other
    if (name1.includes(name2) || name2.includes(name1)) return true;

    // Calculate similarity score using Levenshtein distance
    const similarity = this.calculateSimilarity(name1, name2);
    return similarity > 0.8; // 80% similarity threshold
  }

  /**
   * Calculate similarity score between two strings (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get project details with fallback to alternate API
   */
  async getProjectDetails(projectId: string, preferredSource?: 'clockify' | 'zoho'): Promise<ProjectDetails | null> {
    try {
      // Check if cache needs refresh
      if (this.isCacheStale()) {
        console.debug('📝 Cache is stale, refreshing project data...');
        await this.syncProjects();
      }

      // Try to get from preferred source first
      if (preferredSource === 'clockify' || !preferredSource) {
        const clockifyProject = this.clockifyProjectsCache.get(projectId);
        if (clockifyProject) {
          console.debug(`✅ Found project in Clockify cache: ${clockifyProject.name}`);
          return this.convertClockifyToProjectDetails(clockifyProject);
        }
      }

      if (preferredSource === 'zoho' || !preferredSource) {
        const zohoProject = this.zohoProjectsCache.get(projectId);
        if (zohoProject) {
          console.debug(`✅ Found project in Zoho cache: ${zohoProject.project_name}`);
          return this.convertZohoToProjectDetails(zohoProject);
        }
      }

      // Try to find in mappings
      const mapping = this.mappingCache.get(projectId);
      if (mapping) {
        console.debug(`📋 Found project in mapping cache: ${mapping.name}`);
        
        // Try to get from alternate source
        if (mapping.clockifyId && mapping.clockifyId !== projectId) {
          const clockifyProject = this.clockifyProjectsCache.get(mapping.clockifyId);
          if (clockifyProject) {
            console.debug(`✅ Found alternate project in Clockify: ${clockifyProject.name}`);
            return this.convertClockifyToProjectDetails(clockifyProject);
          }
        }

        if (mapping.zohoId && mapping.zohoId !== projectId) {
          const zohoProject = this.zohoProjectsCache.get(mapping.zohoId);
          if (zohoProject) {
            console.debug(`✅ Found alternate project in Zoho: ${zohoProject.project_name}`);
            return this.convertZohoToProjectDetails(zohoProject);
          }
        }
      }

      // Last resort: fetch from API on-demand
      console.debug(`🔍 Project ${projectId} not in cache, fetching on-demand...`);
      return await this.fetchProjectOnDemand(projectId, preferredSource);

    } catch (error) {
      console.debug(`⚠️ Could not get project details for ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Fetch project details on-demand from the API
   */
  private async fetchProjectOnDemand(projectId: string, preferredSource?: 'clockify' | 'zoho'): Promise<ProjectDetails | null> {
    try {
      // Try Clockify first (or preferred source)
      if (preferredSource === 'clockify' || !preferredSource) {
        try {
          const projects = await clockifyService.getProjects();
          const project = projects.find(p => p.id === projectId);
          if (project) {
            console.debug(`✅ Fetched project from Clockify on-demand: ${project.name}`);
            this.clockifyProjectsCache.set(project.id, project);
            return this.convertClockifyToProjectDetails(project);
          }
        } catch (error) {
          console.debug('⚠️ Clockify on-demand fetch failed:', error);
        }
      }

      // Try Zoho as fallback (or preferred source)
      if (preferredSource === 'zoho' || !preferredSource) {
        try {
          const projects = await zohoService.getProjects();
          const project = projects.find(p => p.project_id === projectId);
          if (project) {
            console.debug(`✅ Fetched project from Zoho on-demand: ${project.project_name}`);
            this.zohoProjectsCache.set(project.project_id, project);
            return this.convertZohoToProjectDetails(project);
          }
        } catch (error) {
          console.debug('⚠️ Zoho on-demand fetch failed:', error);
        }
      }

      console.debug(`⚠️ Could not fetch project ${projectId} from any source`);
      return null;
    } catch (error) {
      console.error('❌ Error fetching project on-demand:', error);
      return null;
    }
  }

  /**
   * Convert Clockify project to ProjectDetails
   */
  private convertClockifyToProjectDetails(project: any): ProjectDetails {
    return {
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      billable: project.billable,
      archived: project.archived,
      source: 'clockify',
      hourlyRate: typeof project.hourlyRate === 'object' ? project.hourlyRate.amount : project.hourlyRate,
      color: project.color
    };
  }

  /**
   * Convert Zoho project to ProjectDetails
   */
  private convertZohoToProjectDetails(project: any): ProjectDetails {
    return {
      id: project.project_id,
      name: project.project_name,
      clientName: project.customer_name,
      billable: true, // Assume Zoho projects are billable by default
      archived: project.status?.toLowerCase() === 'inactive' || project.status?.toLowerCase() === 'closed',
      source: 'zoho',
      projectId: project.project_id,
      customerId: project.customer_id,
      customerName: project.customer_name,
      signedFee: project.signed_fee
    };
  }

  /**
   * Check if cache is stale
   */
  private isCacheStale(): boolean {
    if (!this.lastSyncTime) return true;
    return Date.now() - this.lastSyncTime.getTime() > this.CACHE_TTL;
  }

  /**
   * Get all mappings
   */
  getMappings(): ProjectMapping[] {
    return Array.from(this.mappingCache.values());
  }

  /**
   * Get orphaned projects (projects that exist in one system but not the other, or are archived)
   */
  getOrphanedProjects(): ProjectMapping[] {
    return Array.from(this.mappingCache.values()).filter(m => m.status === 'orphaned');
  }

  /**
   * Get projects that only exist in Clockify
   */
  getClockifyOnlyProjects(): ProjectMapping[] {
    return Array.from(this.mappingCache.values()).filter(m => m.status === 'clockify-only');
  }

  /**
   * Get projects that only exist in Zoho
   */
  getZohoOnlyProjects(): ProjectMapping[] {
    return Array.from(this.mappingCache.values()).filter(m => m.status === 'zoho-only');
  }

  /**
   * Clear cache and force re-sync on next request
   */
  clearCache(): void {
    this.mappingCache.clear();
    this.clockifyProjectsCache.clear();
    this.zohoProjectsCache.clear();
    this.lastSyncTime = null;
    console.info('🧹 Project mapping cache cleared');
  }
}

// Export singleton instance
export const projectMappingService = new ProjectMappingService();

// Export convenience functions
export async function syncProjects() {
  return await projectMappingService.syncProjects();
}

export async function getProjectDetails(projectId: string, preferredSource?: 'clockify' | 'zoho') {
  return await projectMappingService.getProjectDetails(projectId, preferredSource);
}

export function getOrphanedProjects() {
  return projectMappingService.getOrphanedProjects();
}

