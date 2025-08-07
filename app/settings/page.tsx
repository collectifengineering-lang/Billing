'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import useSWR, { mutate } from 'swr';

interface ProjectManager {
  id: string;
  name: string;
  color: string;
}

function SettingsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerColor, setNewManagerColor] = useState('#3b82f6');
  const isInitialLoad = useRef(true);
  const hasLoaded = useRef(false);

  // SWR data fetching
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: projectManagersData, mutate: mutateProjectManagers } = useSWR('/api/project-managers', fetcher);

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

  const projectManagers = projectManagersData || [];

  const addProjectManager = async () => {
    if (!newManagerName.trim()) {
      toast.error('Please enter a project manager name');
      return;
    }

    const newManager: ProjectManager = {
      id: Date.now().toString(),
      name: newManagerName.trim(),
      color: newManagerColor,
    };

    try {
      await fetch('/api/project-managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newManager),
      });
      
      mutateProjectManagers();
      setNewManagerName('');
      setNewManagerColor('#3b82f6');
      toast.success('Project manager added successfully');
    } catch (error) {
      console.error('Error adding project manager:', error);
      toast.error('Failed to add project manager');
    }
  };

  const removeProjectManager = async (id: string) => {
    try {
      await fetch('/api/project-managers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      mutateProjectManagers();
      toast.success('Project manager removed');
    } catch (error) {
      console.error('Error removing project manager:', error);
      toast.error('Failed to remove project manager');
    }
  };

  const updateProjectManager = async (id: string, field: 'name' | 'color', value: string) => {
    try {
      await fetch('/api/project-managers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value }),
      });
      
      mutateProjectManagers();
    } catch (error) {
      console.error('Error updating project manager:', error);
      toast.error('Failed to update project manager');
    }
  };

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
                {projectManagers.map((manager: ProjectManager) => (
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