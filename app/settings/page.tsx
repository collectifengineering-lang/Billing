'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { safeLocalStorageGet, safeLocalStorageSet, isLocalStorageAvailable } from '../../lib/utils';

interface ProjectManager {
  id: string;
  name: string;
  color: string;
}

function SettingsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerColor, setNewManagerColor] = useState('#3b82f6');
  const isInitialLoad = useRef(true);
  const hasLoaded = useRef(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user has admin access for settings
    if (!user.isAdmin) {
      router.push('/unauthorized');
      return;
    }
  }, [user, loading, router]);

  // Load project managers from localStorage on mount
  useEffect(() => {
    if (hasLoaded.current) return;
    
    console.log('Settings: Component mounted, loading project managers');

    const loadProjectManagers = () => {
      try {
        const savedManagers = safeLocalStorageGet('projectManagers');
        console.log('Settings: Loading project managers from localStorage:', savedManagers);
        if (savedManagers && Array.isArray(savedManagers)) {
          console.log('Settings: Parsed project managers:', savedManagers);
          setProjectManagers(savedManagers);
        } else if (savedManagers === null) {
          console.log('Settings: No saved project managers found in localStorage');
          setProjectManagers([]);
        } else {
          console.log('Settings: Invalid project managers data format, resetting to empty array');
          setProjectManagers([]);
        }
      } catch (error) {
        console.error('Settings: Error loading project managers from localStorage:', error);
        setProjectManagers([]);
      }
    };

    loadProjectManagers();
    hasLoaded.current = true;
    isInitialLoad.current = false;

    // Also listen for focus events to reload data when returning to the page
    const handleFocus = () => {
      console.log('Settings: Window focused, reloading project managers');
      loadProjectManagers();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Settings: Page became visible, reloading project managers');
        loadProjectManagers();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle storage events for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      console.log('Settings: Storage change event:', event.key, event.newValue);
      if (event.key === 'projectManagers' && event.newValue) {
        console.log('Settings: Processing project managers storage change:', event.newValue);
        try {
          const parsedManagers = JSON.parse(event.newValue);
          if (Array.isArray(parsedManagers)) {
            setProjectManagers(parsedManagers);
            console.log('Settings: Updated project managers from storage event:', parsedManagers);
          }
        } catch (error) {
          console.error('Settings: Error parsing project managers from storage event:', error);
        }
      }
    };

    const handleProjectManagersUpdate = () => {
      console.log('Settings: Handling project managers update event');
      try {
        const savedManagers = safeLocalStorageGet('projectManagers');
        if (savedManagers && Array.isArray(savedManagers)) {
          setProjectManagers(savedManagers);
          console.log('Settings: Updated project managers from custom event:', savedManagers);
        }
      } catch (error) {
        console.error('Settings: Error handling project managers update event:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectManagersUpdated', handleProjectManagersUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectManagersUpdated', handleProjectManagersUpdate);
    };
  }, []);

  // Save function that can be called explicitly
  const saveProjectManagers = (managers: ProjectManager[]) => {
    try {
      console.log('Settings: Saving project managers to localStorage:', managers);
      const success = safeLocalStorageSet('projectManagers', managers);
      if (success) {
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('projectManagersUpdated'));
        console.log('Settings: Project managers saved successfully');
      } else {
        console.error('Settings: Failed to save project managers to localStorage');
        toast.error('Failed to save project managers');
      }
    } catch (error) {
      console.error('Settings: Error saving project managers to localStorage:', error);
      toast.error('Failed to save project managers');
    }
  };

  const addProjectManager = () => {
    if (!newManagerName.trim()) {
      toast.error('Please enter a project manager name');
      return;
    }

    const newManager: ProjectManager = {
      id: Date.now().toString(),
      name: newManagerName.trim(),
      color: newManagerColor,
    };

    console.log('Settings: Adding project manager:', newManager);
    const updatedManagers = [...projectManagers, newManager];
    console.log('Settings: Updated project managers array:', updatedManagers);
    setProjectManagers(updatedManagers);
    saveProjectManagers(updatedManagers);
    setNewManagerName('');
    setNewManagerColor('#3b82f6');
    toast.success('Project manager added successfully');
  };

  const removeProjectManager = (id: string) => {
    const updatedManagers = projectManagers.filter(manager => manager.id !== id);
    setProjectManagers(updatedManagers);
    saveProjectManagers(updatedManagers);
    toast.success('Project manager removed');
  };

  const updateProjectManager = (id: string, field: 'name' | 'color', value: string) => {
    const updatedManagers = projectManagers.map(manager => 
      manager.id === id ? { ...manager, [field]: value } : manager
    );
    setProjectManagers(updatedManagers);
    saveProjectManagers(updatedManagers);
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              prefetch={false}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>

        {/* Project Managers Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Project Managers</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add project managers and assign colors. These will be available when assigning managers to projects.
            </p>
          </div>

          {/* Add New Project Manager */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Project Manager</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label htmlFor="managerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="managerName"
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  placeholder="Enter project manager name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="w-32">
                <label htmlFor="managerColor" className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  id="managerColor"
                  value={newManagerColor}
                  onChange={(e) => setNewManagerColor(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                />
              </div>
              <div className="pt-6">
                <button
                  onClick={addProjectManager}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manager
                </button>
              </div>
            </div>
          </div>

          {/* Project Managers List */}
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Project Managers</h3>
            
            {projectManagers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No project managers added yet.</p>
            ) : (
              <div className="space-y-3">
                {projectManagers.map((manager) => (
                  <div key={manager.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: manager.color }}
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={manager.name}
                          onChange={(e) => updateProjectManager(manager.id, 'name', e.target.value)}
                          className="text-lg font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={manager.color}
                        onChange={(e) => updateProjectManager(manager.id, 'color', e.target.value)}
                        className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <button
                        onClick={() => removeProjectManager(manager.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove project manager"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return <SettingsPageContent />;
} 