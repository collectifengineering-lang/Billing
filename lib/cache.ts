import { ZohoProject, ZohoInvoice } from './zoho';
import { BillingData, ProjectionsTable } from './types';

interface CacheData {
  projects: ZohoProject[];
  invoices: ZohoInvoice[];
  lastSync: number;
  version: string;
}

interface ChangeDetection {
  newProjects: ZohoProject[];
  updatedProjects: ZohoProject[];
  newInvoices: ZohoInvoice[];
  updatedInvoices: ZohoInvoice[];
  deletedProjects: string[];
  deletedInvoices: string[];
}

class DataCache {
  private static instance: DataCache;
  private cache: CacheData | null = null;
  private readonly CACHE_KEY = 'zoho_billing_cache';
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache();
    }
    return DataCache.instance;
  }

  private getCache(): CacheData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      
      const data: CacheData = JSON.parse(cached);
      
      // Check if cache is still valid
      if (data.version !== this.CACHE_VERSION) {
        this.clearCache();
        return null;
      }
      
      // Check if cache has expired
      if (Date.now() - data.lastSync > this.CACHE_DURATION) {
        this.clearCache();
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      this.clearCache();
      return null;
    }
  }

  private setCache(data: Omit<CacheData, 'lastSync' | 'version'>): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData: CacheData = {
        ...data,
        lastSync: Date.now(),
        version: this.CACHE_VERSION,
      };
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      this.cache = cacheData;
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  }

  private clearCache(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(this.CACHE_KEY);
      this.cache = null;
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  private detectChanges(
    oldProjects: ZohoProject[],
    newProjects: ZohoProject[],
    oldInvoices: ZohoInvoice[],
    newInvoices: ZohoInvoice[]
  ): ChangeDetection {
    const changes: ChangeDetection = {
      newProjects: [],
      updatedProjects: [],
      newInvoices: [],
      updatedInvoices: [],
      deletedProjects: [],
      deletedInvoices: [],
    };

    // Detect project changes
    const oldProjectMap = new Map(oldProjects.map(p => [p.project_id, p]));
    const newProjectMap = new Map(newProjects.map(p => [p.project_id, p]));

    // Find new and updated projects
    for (const newProject of newProjects) {
      const oldProject = oldProjectMap.get(newProject.project_id);
      if (!oldProject) {
        changes.newProjects.push(newProject);
      } else if (JSON.stringify(oldProject) !== JSON.stringify(newProject)) {
        changes.updatedProjects.push(newProject);
      }
    }

    // Find deleted projects
    for (const oldProject of oldProjects) {
      if (!newProjectMap.has(oldProject.project_id)) {
        changes.deletedProjects.push(oldProject.project_id);
      }
    }

    // Detect invoice changes
    const oldInvoiceMap = new Map(oldInvoices.map(i => [i.invoice_id, i]));
    const newInvoiceMap = new Map(newInvoices.map(i => [i.invoice_id, i]));

    // Find new and updated invoices
    for (const newInvoice of newInvoices) {
      const oldInvoice = oldInvoiceMap.get(newInvoice.invoice_id);
      if (!oldInvoice) {
        changes.newInvoices.push(newInvoice);
      } else if (JSON.stringify(oldInvoice) !== JSON.stringify(newInvoice)) {
        changes.updatedInvoices.push(newInvoice);
      }
    }

    // Find deleted invoices
    for (const oldInvoice of oldInvoices) {
      if (!newInvoiceMap.has(oldInvoice.invoice_id)) {
        changes.deletedInvoices.push(oldInvoice.invoice_id);
      }
    }

    return changes;
  }

  async getCachedData(): Promise<{ data: CacheData; isFromCache: boolean } | null> {
    const cached = this.getCache();
    if (cached) {
      console.log('Using cached data from', new Date(cached.lastSync).toLocaleString());
      return { data: cached, isFromCache: true };
    }
    return null;
  }

  async updateCache(
    projects: ZohoProject[],
    invoices: ZohoInvoice[],
    forceRefresh: boolean = false
  ): Promise<{ data: CacheData; changes?: ChangeDetection }> {
    const cached = this.getCache();
    
    if (!forceRefresh && cached) {
      // Detect changes
      const changes = this.detectChanges(
        cached.projects,
        projects,
        cached.invoices,
        invoices
      );

      // Only update if there are changes
      if (
        changes.newProjects.length === 0 &&
        changes.updatedProjects.length === 0 &&
        changes.newInvoices.length === 0 &&
        changes.updatedInvoices.length === 0 &&
        changes.deletedProjects.length === 0 &&
        changes.deletedInvoices.length === 0
      ) {
        console.log('No changes detected, using existing cache');
        return { data: cached };
      }

      console.log('Changes detected:', {
        newProjects: changes.newProjects.length,
        updatedProjects: changes.updatedProjects.length,
        newInvoices: changes.newInvoices.length,
        updatedInvoices: changes.updatedInvoices.length,
        deletedProjects: changes.deletedProjects.length,
        deletedInvoices: changes.deletedInvoices.length,
      });

      // Merge changes with existing cache
      const updatedProjects = [...cached.projects];
      const updatedInvoices = [...cached.invoices];

      // Apply project changes
      changes.newProjects.forEach(project => {
        updatedProjects.push(project);
      });
      changes.updatedProjects.forEach(project => {
        const index = updatedProjects.findIndex(p => p.project_id === project.project_id);
        if (index !== -1) {
          updatedProjects[index] = project;
        }
      });
      changes.deletedProjects.forEach(projectId => {
        const index = updatedProjects.findIndex(p => p.project_id === projectId);
        if (index !== -1) {
          updatedProjects.splice(index, 1);
        }
      });

      // Apply invoice changes
      changes.newInvoices.forEach(invoice => {
        updatedInvoices.push(invoice);
      });
      changes.updatedInvoices.forEach(invoice => {
        const index = updatedInvoices.findIndex(i => i.invoice_id === invoice.invoice_id);
        if (index !== -1) {
          updatedInvoices[index] = invoice;
        }
      });
      changes.deletedInvoices.forEach(invoiceId => {
        const index = updatedInvoices.findIndex(i => i.invoice_id === invoiceId);
        if (index !== -1) {
          updatedInvoices.splice(index, 1);
        }
      });

      const updatedCache = { projects: updatedProjects, invoices: updatedInvoices };
      this.setCache(updatedCache);
      
      return { 
        data: { ...updatedCache, lastSync: Date.now(), version: this.CACHE_VERSION },
        changes 
      };
    } else {
      // Full refresh
      console.log('Performing full data refresh');
      const newCache = { projects, invoices };
      this.setCache(newCache);
      
      return { 
        data: { ...newCache, lastSync: Date.now(), version: this.CACHE_VERSION }
      };
    }
  }

  async invalidateCache(): Promise<void> {
    this.clearCache();
    console.log('Cache invalidated');
  }

  getCacheInfo(): { lastSync?: Date; hasCache: boolean } {
    const cached = this.getCache();
    return {
      lastSync: cached ? new Date(cached.lastSync) : undefined,
      hasCache: !!cached,
    };
  }
}

export const dataCache = DataCache.getInstance(); 