'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface MigrationContextType {
  isMigrating: boolean;
  isMigrated: boolean;
  hasLocalData: boolean;
  migrateData: () => Promise<void>;
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
        // Check if already migrated
        const migrated = localStorage.getItem('dataMigrated');
        if (migrated === 'true') {
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
        await Promise.all(migrationPromises);
        console.log('Migration completed successfully');
        toast.success('Data migrated to database successfully');
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

      setIsMigrated(true);
      setHasLocalData(false);

    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Failed to migrate data to database');
    } finally {
      setIsMigrating(false);
    }
  };

  const value: MigrationContextType = {
    isMigrating,
    isMigrated,
    hasLocalData,
    migrateData,
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
