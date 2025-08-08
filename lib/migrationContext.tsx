'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface MigrationContextType {
  isMigrating: boolean;
  isMigrated: boolean;
  hasLocalData: boolean;
  migrateData: () => Promise<void>;
  retryMigration: () => Promise<void>;
}

const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

export function MigrationProvider({ children }: { children: ReactNode }) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [isMigrated, setIsMigrated] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);

  // Check for localStorage data and migration status on mount
  useEffect(() => {
    const checkMigrationStatus = () => {
      try {
        // Check if already migrated (check both flags)
        const migrated = localStorage.getItem('dataMigrated') === 'true' || 
                        localStorage.getItem('db_migrated') === 'true';
        if (migrated) {
          setIsMigrated(true);
          setHasLocalData(false);
          return;
        }

        // Check for localStorage data
        const hasData = localStorage.getItem('monthlyProjections') ||
                       localStorage.getItem('signedFees') ||
                       localStorage.getItem('asrFees') ||
                       localStorage.getItem('monthlyStatuses') ||
                       localStorage.getItem('monthlyComments') ||
                       localStorage.getItem('closedProjects') ||
                       localStorage.getItem('projectAssignments') ||
                       localStorage.getItem('projectManagers');

        setHasLocalData(!!hasData);
      } catch (error) {
        console.error('Error checking migration status:', error);
      }
    };

    checkMigrationStatus();
  }, []);

  const migrateData = async () => {
    if (isMigrating || isMigrated) return;

    setIsMigrating(true);
    
    try {
      console.log('Starting client-side migration...');
      
      // Get all localStorage data
      const monthlyProjections = JSON.parse(localStorage.getItem('monthlyProjections') || '{}');
      const monthlyStatuses = JSON.parse(localStorage.getItem('monthlyStatuses') || '{}');
      const monthlyComments = JSON.parse(localStorage.getItem('monthlyComments') || '{}');
      const signedFees = JSON.parse(localStorage.getItem('signedFees') || '{}');
      const asrFees = JSON.parse(localStorage.getItem('asrFees') || '{}');
      const closedProjects = JSON.parse(localStorage.getItem('closedProjects') || '[]');
      const projectAssignments = JSON.parse(localStorage.getItem('projectAssignments') || '{}');
      const projectManagers = JSON.parse(localStorage.getItem('projectManagers') || '[]');

      // Migrate data to API endpoints
      const migrationPromises = [];

      // Migrate projections
      if (Object.keys(monthlyProjections).length > 0) {
        for (const [projectId, months] of Object.entries(monthlyProjections)) {
          for (const [month, value] of Object.entries(months as Record<string, number>)) {
            migrationPromises.push(
              fetch('/api/projections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, month, value }),
              })
            );
          }
        }
      }

      // Migrate statuses
      if (Object.keys(monthlyStatuses).length > 0) {
        for (const [projectId, months] of Object.entries(monthlyStatuses)) {
          for (const [month, status] of Object.entries(months as Record<string, string>)) {
            migrationPromises.push(
              fetch('/api/statuses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, month, status }),
              })
            );
          }
        }
      }

      // Migrate comments
      if (Object.keys(monthlyComments).length > 0) {
        for (const [projectId, months] of Object.entries(monthlyComments)) {
          for (const [month, comment] of Object.entries(months as Record<string, string>)) {
            migrationPromises.push(
              fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, month, comment }),
              })
            );
          }
        }
      }

      // Migrate signed fees
      if (Object.keys(signedFees).length > 0) {
        for (const [projectId, value] of Object.entries(signedFees)) {
          migrationPromises.push(
            fetch('/api/signed-fees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, value }),
            })
          );
        }
      }

      // Migrate ASR fees
      if (Object.keys(asrFees).length > 0) {
        for (const [projectId, value] of Object.entries(asrFees)) {
          migrationPromises.push(
            fetch('/api/asr-fees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, value }),
            })
          );
        }
      }

      // Migrate closed projects
      if (closedProjects.length > 0) {
        for (const projectId of closedProjects) {
          migrationPromises.push(
            fetch('/api/closed-projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId }),
            })
          );
        }
      }

      // Migrate project assignments
      if (Object.keys(projectAssignments).length > 0) {
        for (const [projectId, managerId] of Object.entries(projectAssignments)) {
          migrationPromises.push(
            fetch('/api/project-assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, managerId }),
            })
          );
        }
      }

      // Migrate project managers
      if (projectManagers.length > 0) {
        for (const manager of projectManagers) {
          migrationPromises.push(
            fetch('/api/project-managers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(manager),
            })
          );
        }
      }

      // Execute all migrations
      if (migrationPromises.length > 0) {
        const results = await Promise.allSettled(migrationPromises);
        
        // Check for failed migrations
        const failedMigrations = results.filter(result => result.status === 'rejected');
        if (failedMigrations.length > 0) {
          console.error('Some migrations failed:', failedMigrations);
          
          // Check if it's a connection issue
          const hasConnectionError = failedMigrations.some(result => 
            result.status === 'rejected' && 
            (result.reason?.message?.includes('Failed to fetch') || 
             result.reason?.message?.includes('connection') ||
             result.reason?.message?.includes('timeout'))
          );
          
          if (hasConnectionError) {
            toast.error('Migration failed: Check database connections. Retrying in 5 seconds...', {
              duration: 5000
            });
          } else {
            toast.error('Migration failed: Some data could not be migrated. Retrying in 5 seconds...', {
              duration: 5000
            });
          }
          
          throw new Error('Migration failed');
        }
        
        console.log('Migration completed successfully');
        toast.success('Migration complete');
      }

      // Clear localStorage and set migrated flag
      localStorage.removeItem('monthlyProjections');
      localStorage.removeItem('monthlyStatuses');
      localStorage.removeItem('monthlyComments');
      localStorage.removeItem('signedFees');
      localStorage.removeItem('asrFees');
      localStorage.removeItem('closedProjects');
      localStorage.removeItem('projectAssignments');
      localStorage.removeItem('projectManagers');
      localStorage.setItem('dataMigrated', 'true');
      localStorage.setItem('db_migrated', 'true');

      setIsMigrated(true);
      setHasLocalData(false);

    } catch (error) {
      console.error('Migration failed:', error);
      
      // Set migration flag even on partial success to prevent loops
      localStorage.setItem('db_migrated', 'true');
      setIsMigrated(true);
      
      // Auto-retry after 5 seconds for connection issues
      setTimeout(() => {
        if (!isMigrated) {
          retryMigration();
        }
      }, 5000);
    } finally {
      setIsMigrating(false);
    }
  };

  const retryMigration = async () => {
    // Reset migration state and try again
    setIsMigrated(false);
    localStorage.removeItem('db_migrated');
    localStorage.removeItem('dataMigrated');
    await migrateData();
  };

  const value: MigrationContextType = {
    isMigrating,
    isMigrated,
    hasLocalData,
    migrateData,
    retryMigration,
  };

  return (
    <MigrationContext.Provider value={value}>
      {children}
    </MigrationContext.Provider>
  );
}

export function useMigration() {
  const context = useContext(MigrationContext);
  if (context === undefined) {
    throw new Error('useMigration must be used within a MigrationProvider');
  }
  return context;
}
